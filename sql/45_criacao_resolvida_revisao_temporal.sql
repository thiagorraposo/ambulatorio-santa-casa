-- Objetivo: criar visita/dependentes aprovados uma vez e resolver alvos virtuais.
-- Impacto: executor permanece privado; nao cria paciente nem copia dependentes.
-- Reversao: bloquear novas aplicacoes; preservar IDs, planos e eventos existentes.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

-- Nulo de campo novo nao apaga fato: preservar o estado da fonte no plano.
DO $$ DECLARE restricao text;
BEGIN
  SELECT conname INTO STRICT restricao FROM pg_constraint
    WHERE conrelid='importacao_revisao_campo'::regclass AND contype='c'
      AND pg_get_constraintdef(oid) LIKE '%criar%definir%proposto%valor%';
  EXECUTE format('ALTER TABLE importacao_revisao_campo DROP CONSTRAINT %I',restricao);
  SELECT c.conname INTO STRICT restricao FROM pg_constraint c JOIN pg_attribute a
    ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
    WHERE c.conrelid='importacao_revisao_aplicacao'::regclass AND c.contype='f'
      AND a.attname='atendimento_criado_id';
  EXECUTE format('ALTER TABLE importacao_revisao_aplicacao ALTER CONSTRAINT %I DEFERRABLE INITIALLY DEFERRED',restricao);
END $$;
ALTER TABLE importacao_revisao_campo ADD CONSTRAINT chk_operacao_valor_criacao
  CHECK ((operacao<>'definir' OR proposto->>'estado'='valor') AND
    (operacao<>'criar' OR proposto->>'estado' IN ('valor','coluna_ausente','celula_vazia')));

CREATE FUNCTION revisao_alvo_predecessor(decisao bigint,chave text,tabela text)
RETURNS TABLE(registro_efetivo bigint,aplicacao_anterior bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
  WITH RECURSIVE cadeia AS (
    SELECT d.decisao_id,d.decisao_anterior_id,d.paciente_id,ARRAY[d.decisao_id] caminho,0 profundidade
      FROM ambulatorio.importacao_revisao_decisao d WHERE d.decisao_id=decisao
    UNION ALL
    SELECT d.decisao_id,d.decisao_anterior_id,d.paciente_id,c.caminho||d.decisao_id,c.profundidade+1
      FROM ambulatorio.importacao_revisao_decisao d JOIN cadeia c ON d.decisao_id=c.decisao_anterior_id
      WHERE NOT d.decisao_id=ANY(c.caminho)
  ) SELECT a.registro_id,ap.aplicacao_id FROM cadeia c
    JOIN ambulatorio.importacao_revisao_aplicacao ap USING(decisao_id)
    JOIN ambulatorio.importacao_revisao_alvo a USING(aplicacao_id)
    WHERE c.profundidade>0 AND ap.resultado='aplicada' AND a.alvo_chave=chave AND a.tabela_destino=tabela
      AND c.paciente_id=(SELECT d.paciente_id FROM ambulatorio.importacao_revisao_decisao d WHERE d.decisao_id=decisao)
    ORDER BY c.profundidade LIMIT 1
$$;

CREATE FUNCTION revisao_conferir_criacao(decisao bigint) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE d ambulatorio.importacao_revisao_decisao; alvo record; campo record; anterior record;
  visitas integer; nova_visita boolean; valor jsonb;
BEGIN
  SELECT * INTO STRICT d FROM ambulatorio.importacao_revisao_decisao WHERE decisao_id=decisao;
  IF d.resultado<>'autorizar' THEN RETURN; END IF;
  SELECT count(DISTINCT cp.alvo_chave) FILTER(WHERE c.tabela_destino='atendimento'),
    COALESCE(bool_or(cp.categoria='nova_visita'),false) INTO visitas,nova_visita
    FROM ambulatorio.importacao_revisao_campo cp JOIN ambulatorio.auditoria_campo c USING(campo_id)
    WHERE cp.decisao_id=decisao AND cp.operacao='criar';
  IF visitas>1 OR (nova_visita AND (visitas<>1 OR d.atendimento_base_id IS NOT NULL)) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_visita_nova_inconsistente'; END IF;
  IF visitas=1 AND NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_campo cp
    JOIN ambulatorio.auditoria_campo c USING(campo_id) WHERE cp.decisao_id=decisao AND cp.operacao='criar'
      AND cp.categoria='nova_visita' AND c.tabela_destino='atendimento' AND c.coluna_destino='data_atendimento'
      AND cp.proposto->>'estado'='valor' AND cp.proposto->>'precisao'='data_completa') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_visita_exige_data_completa'; END IF;
  FOR alvo IN SELECT DISTINCT cp.alvo_chave,c.tabela_destino,c.coluna_pk
    FROM ambulatorio.importacao_revisao_campo cp JOIN ambulatorio.auditoria_campo c USING(campo_id)
    WHERE cp.decisao_id=decisao AND cp.operacao='criar' LOOP
    -- Lista fechada dos destinos ja homologados; paciente sempre e conciliado.
    IF alvo.tabela_destino NOT IN ('atendimento','paciente_endereco','paciente_contato',
      'paciente_projeto_estudo','paciente_exame_complementar','tratamento_benzonidazol',
      'pendencia_atendimento','dados_clinicos_atendimento','diagnostico_chagas','encaminhamento',
      'acompanhamento_cuidado','evento_clinico','dispositivo_implantado','notificacao','obito','tratamento_chagas') THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_criacao_destino_nao_homologado'; END IF;
    IF EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_campo cp WHERE cp.decisao_id=decisao
      AND cp.alvo_chave=alvo.alvo_chave AND cp.categoria NOT IN ('nova_visita','atualizacao_consolidada')) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_criacao_categoria_incompativel'; END IF;
    IF EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=to_regclass('ambulatorio.'||alvo.tabela_destino)
      AND a.attname='atendimento_id' AND NOT a.attisdropped AND (a.attnotnull OR nova_visita))
      AND alvo.tabela_destino<>'atendimento' AND visitas=0 AND d.atendimento_base_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_dependente_sem_atendimento'; END IF;
    -- INSERT captura todos os campos habilitados, inclusive SQL NULL.
    IF EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo c WHERE c.tabela_destino=alvo.tabela_destino
      AND c.captura_desde IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_campo cp
        WHERE cp.decisao_id=decisao AND cp.alvo_chave=alvo.alvo_chave AND cp.campo_id=c.campo_id AND cp.operacao='criar')) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_criacao_captura_incompleta'; END IF;
    IF EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=to_regclass('ambulatorio.'||alvo.tabela_destino)
      AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull AND NOT a.atthasdef
      AND a.attname NOT IN (alvo.coluna_pk,'paciente_id','atendimento_id')
      AND NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_campo cp JOIN ambulatorio.auditoria_campo c USING(campo_id)
        WHERE cp.decisao_id=decisao AND cp.alvo_chave=alvo.alvo_chave AND c.coluna_destino=a.attname
          AND cp.proposto->>'estado'='valor')) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_criacao_campos_obrigatorios'; END IF;
    SELECT * INTO anterior FROM ambulatorio.revisao_alvo_predecessor(decisao,alvo.alvo_chave,alvo.tabela_destino);
    IF anterior.registro_efetivo IS NOT NULL THEN
      PERFORM ambulatorio.revisao_conferir_sucesso(anterior.aplicacao_anterior);
      IF ambulatorio.revisao_alvo_paciente(alvo.tabela_destino,anterior.registro_efetivo) IS DISTINCT FROM d.paciente_id THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_paciente_incompativel'; END IF;
    END IF;
    FOR campo IN SELECT cp.*,c.coluna_destino FROM ambulatorio.importacao_revisao_campo cp
      JOIN ambulatorio.auditoria_campo c USING(campo_id) WHERE cp.decisao_id=decisao AND cp.alvo_chave=alvo.alvo_chave LOOP
      IF campo.proposto->>'estado'<>'valor' AND EXISTS(SELECT 1 FROM pg_attribute a
        WHERE a.attrelid=to_regclass('ambulatorio.'||alvo.tabela_destino) AND a.attname=campo.coluna_destino AND a.attnotnull) THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_criacao_coluna_nao_anulavel'; END IF;
      IF anterior.registro_efetivo IS NOT NULL THEN
        EXECUTE format('SELECT COALESCE(to_jsonb(%I),''null''::jsonb) FROM ambulatorio.%I WHERE %I=$1',
          campo.coluna_destino,alvo.tabela_destino,alvo.coluna_pk) INTO valor USING anterior.registro_efetivo;
        IF valor IS DISTINCT FROM campo.proposto->'valor' OR NOT EXISTS(
          SELECT 1 FROM ambulatorio.importacao_revisao_campo cp
          JOIN ambulatorio.importacao_revisao_aplicacao ap USING(decisao_id)
          WHERE ap.aplicacao_id=anterior.aplicacao_anterior AND cp.alvo_chave=alvo.alvo_chave
            AND cp.campo_id=campo.campo_id AND cp.proposto->'valor'=campo.proposto->'valor') THEN
          RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_alvo_resolvido_divergente'; END IF;
      END IF;
    END LOOP;
  END LOOP;
END $$;

CREATE FUNCTION revisao_resolver_alvos(decisao bigint)
RETURNS TABLE(alvo_chave text,tabela_destino text,coluna_pk text,registro_id bigint,novo boolean,altera boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE alvo record; anterior record;
BEGIN
  PERFORM ambulatorio.revisao_conferir_criacao(decisao);
  FOR alvo IN SELECT cp.alvo_chave,c.tabela_destino,c.coluna_pk,cp.registro_id,
    bool_or(cp.operacao='criar') criar,
    bool_or(cp.operacao IN ('definir','anular') AND cp.proposto->'valor' IS DISTINCT FROM cp.atual_avaliado->'valor') altera
    FROM ambulatorio.importacao_revisao_campo cp JOIN ambulatorio.auditoria_campo c USING(campo_id)
    WHERE cp.decisao_id=decisao GROUP BY cp.alvo_chave,c.tabela_destino,c.coluna_pk,cp.registro_id ORDER BY cp.alvo_chave LOOP
    alvo_chave:=alvo.alvo_chave; tabela_destino:=alvo.tabela_destino; coluna_pk:=alvo.coluna_pk;
    registro_id:=alvo.registro_id; novo:=false; altera:=alvo.altera;
    IF alvo.criar THEN
      SELECT * INTO anterior FROM ambulatorio.revisao_alvo_predecessor(decisao,alvo.alvo_chave,alvo.tabela_destino);
      IF anterior.registro_efetivo IS NULL THEN
        registro_id:=nextval(pg_get_serial_sequence('ambulatorio.'||alvo.tabela_destino,alvo.coluna_pk)); novo:=true;
      ELSE
        registro_id:=anterior.registro_efetivo;
        EXECUTE format('SELECT %I FROM ambulatorio.%I WHERE %I=$1 FOR UPDATE',alvo.coluna_pk,alvo.tabela_destino,alvo.coluna_pk)
          USING registro_id;
        -- Releitura depois do lock: nunca sobrescrever um alvo virtual ja criado.
        PERFORM ambulatorio.revisao_conferir_criacao(decisao);
      END IF;
    END IF;
    RETURN NEXT;
  END LOOP;
END $$;

DO $$ DECLARE tabela text; pk text; seq text;
BEGIN
  FOREACH tabela IN ARRAY ARRAY['atendimento','paciente_endereco','paciente_contato',
    'paciente_projeto_estudo','paciente_exame_complementar','tratamento_benzonidazol',
    'pendencia_atendimento','dados_clinicos_atendimento','diagnostico_chagas','encaminhamento',
    'acompanhamento_cuidado','evento_clinico','dispositivo_implantado','notificacao','obito','tratamento_chagas'] LOOP
    SELECT a.attname INTO STRICT pk FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=i.indkey[0]
      WHERE i.indrelid=to_regclass('ambulatorio.'||tabela) AND i.indisprimary;
    seq:=pg_get_serial_sequence('ambulatorio.'||tabela,pk);
    EXECUTE format('GRANT INSERT ON ambulatorio.%I TO ambulatorio_revisao_owner',tabela);
    EXECUTE format('GRANT USAGE ON SEQUENCE %s TO ambulatorio_revisao_owner',seq);
  END LOOP;
END $$;

-- Alteracoes preservam o executor ja homologado de alvos existentes.
DO $$ DECLARE definicao text; trecho text;
BEGIN
  definicao:=pg_get_functiondef('ambulatorio.revisao_conferir_plano_preparado(bigint,bigint,bigint,bigint,text,jsonb)'::regprocedure);
  trecho:='    IF celula IS NULL OR c.campo_id IS NULL THEN';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Conferencia de fonte inesperada'; END IF;
  -- Regra arquivada pode referenciar coluna ausente em ambos os manifestos.
  -- Somente criacao admite esse nulo; nao transforma ausencia em anular.
  EXECUTE replace(definicao,trecho,$patch$
    IF celula IS NULL AND item->>'operacao'='criar' THEN
      celula:=jsonb_build_object('chave',item->>'chaveSemantica','bloco',item->>'blocoFuncional',
        'ocorrencia',(item->>'ocorrencia')::bigint,'estado_base',
          CASE WHEN linha_base IS NULL THEN 'linha_ausente' ELSE 'coluna_ausente' END,'valor_base',NULL,
        'estado_proposto','coluna_ausente','valor_proposto',NULL);
    END IF;
$patch$||trecho);
  definicao:=pg_get_functiondef('ambulatorio.revisao_publicar_decisao_interna(bigint,bigint,bigint,bigint,bigint,bigint,text,text,jsonb,bigint)'::regprocedure);
  trecho:='  SET CONSTRAINTS ambulatorio.validar_revisao IMMEDIATE;';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Publicacao de criacao inesperada'; END IF;
  EXECUTE replace(definicao,trecho,'  PERFORM ambulatorio.revisao_conferir_criacao(id);'||chr(10)||trecho);
  definicao:=pg_get_functiondef('ambulatorio.revisao_avaliar_decisao(bigint,bigint,bigint)'::regprocedure);
  trecho:='  FOR v IN SELECT * FROM ambulatorio.importacao_revisao_campo';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Avaliacao de criacao inesperada'; END IF;
  EXECUTE replace(definicao,trecho,'  PERFORM ambulatorio.revisao_conferir_criacao(decisao);'||chr(10)||trecho);

  definicao:=pg_get_functiondef('ambulatorio.revisao_aplicar_decisao_interna(bigint,bigint)'::regprocedure);
  trecho:='  alvo record; v record; proveniencia bigint;';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Variaveis do executor inesperadas'; END IF;
  definicao:=replace(definicao,trecho,'  alvos jsonb; visita bigint; '||trecho);
  trecho:=$old$  IF EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_campo WHERE decisao_id=decisao AND operacao='criar') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_criacao_ainda_nao_homologada'; END IF;$old$;
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Barreira de criacao inesperada'; END IF;
  definicao:=replace(definicao,trecho,$patch$
  SELECT jsonb_agg(to_jsonb(x)) INTO alvos FROM ambulatorio.revisao_resolver_alvos(decisao) x;
  SELECT (x->>'registro_id')::bigint INTO visita FROM jsonb_array_elements(alvos) x
    WHERE x->>'tabela_destino'='atendimento' AND EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_campo cp
      WHERE cp.decisao_id=decisao AND cp.alvo_chave=x->>'alvo_chave' AND cp.operacao='criar');$patch$);
  trecho:=$old$INSERT INTO ambulatorio.importacao_revisao_aplicacao(decisao_id,numero_tentativa,resultado,codigo_resultado,plano_sha256)
    VALUES(decisao,tentativa,'aplicada','revisao_plano_aplicado',d.plano_sha256)$old$;
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Sucesso de criacao inesperado'; END IF;
  definicao:=replace(definicao,trecho,$patch$INSERT INTO ambulatorio.importacao_revisao_aplicacao
    (decisao_id,numero_tentativa,resultado,codigo_resultado,plano_sha256,atendimento_criado_id)
    VALUES(decisao,tentativa,'aplicada','revisao_plano_aplicado',d.plano_sha256,visita)$patch$);
  trecho:=$old$  FOR alvo IN SELECT cp.alvo_chave,c.tabela_destino,c.coluna_pk,cp.registro_id,
      bool_or(cp.operacao IN ('definir','anular') AND cp.proposto->'valor' IS DISTINCT FROM cp.atual_avaliado->'valor') AS altera
    FROM ambulatorio.importacao_revisao_campo cp JOIN ambulatorio.auditoria_campo c USING(campo_id)
    WHERE cp.decisao_id=decisao GROUP BY cp.alvo_chave,c.tabela_destino,c.coluna_pk,cp.registro_id ORDER BY cp.alvo_chave LOOP
    acao_alvo:=CASE WHEN alvo.altera THEN 'atualizado' ELSE 'associado' END;$old$;
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Resolucao de alvos inesperada'; END IF;
  definicao:=replace(definicao,trecho,$patch$  FOR alvo IN SELECT * FROM jsonb_to_recordset(alvos) AS x
    (alvo_chave text,tabela_destino text,coluna_pk text,registro_id bigint,novo boolean,altera boolean) ORDER BY alvo_chave LOOP
    acao_alvo:=CASE WHEN alvo.novo THEN 'criado' WHEN alvo.altera THEN 'atualizado' ELSE 'associado' END;$patch$);
  -- Inserir somente depois de validar o ledger.
  trecho:='  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE=''42501'',MESSAGE=''revisao_identidade_nao_autenticada''; END IF;';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Ledger de criacao inesperado'; END IF;
  definicao:=replace(definicao,trecho,trecho||$patch$
  FOR alvo IN SELECT * FROM jsonb_to_recordset(alvos) AS x
    (alvo_chave text,tabela_destino text,coluna_pk text,registro_id bigint,novo boolean,altera boolean)
    WHERE novo ORDER BY CASE WHEN tabela_destino='atendimento' THEN 0 ELSE 1 END,alvo_chave LOOP
    SELECT jsonb_object_agg(c.coluna_destino,cp.proposto->'valor') INTO valores
      FROM ambulatorio.importacao_revisao_campo cp JOIN ambulatorio.auditoria_campo c USING(campo_id)
      WHERE cp.decisao_id=decisao AND cp.alvo_chave=alvo.alvo_chave AND cp.operacao='criar';
    valores:=valores||jsonb_build_object(alvo.coluna_pk,alvo.registro_id);
    IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ambulatorio.'||alvo.tabela_destino)
      AND attname='paciente_id' AND NOT attisdropped) THEN
      valores:=valores||jsonb_build_object('paciente_id',d.paciente_id); END IF;
    IF alvo.tabela_destino<>'atendimento' AND EXISTS(SELECT 1 FROM pg_attribute
      WHERE attrelid=to_regclass('ambulatorio.'||alvo.tabela_destino) AND attname='atendimento_id' AND NOT attisdropped) THEN
      valores:=valores||jsonb_build_object('atendimento_id',COALESCE(visita,d.atendimento_base_id)); END IF;
    SELECT string_agg(quote_ident(a.attname),',' ORDER BY a.attnum),
      string_agg('x.'||quote_ident(a.attname),',' ORDER BY a.attnum) INTO colunas,selecao
      FROM pg_attribute a WHERE a.attrelid=to_regclass('ambulatorio.'||alvo.tabela_destino)
        AND a.attnum>0 AND NOT a.attisdropped AND valores ? a.attname;
    EXECUTE format('INSERT INTO ambulatorio.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::ambulatorio.%I,$1) x',
      alvo.tabela_destino,colunas,selecao,alvo.tabela_destino) USING valores;
  END LOOP;
  FOR v IN SELECT cp.*,c.coluna_destino,c.tipo_sql,c.coluna_pk,c.tabela_destino,a.registro_id AS registro_efetivo
    FROM ambulatorio.importacao_revisao_campo cp JOIN ambulatorio.auditoria_campo c USING(campo_id)
    JOIN ambulatorio.importacao_revisao_alvo a ON a.aplicacao_id=ap AND a.alvo_chave=cp.alvo_chave
    WHERE cp.decisao_id=decisao AND cp.operacao='criar' LOOP
    EXECUTE format('SELECT COALESCE(to_jsonb(%I),''null''::jsonb) FROM ambulatorio.%I WHERE %I=$1',
      v.coluna_destino,v.tabela_destino,v.coluna_pk) INTO efetivo USING v.registro_efetivo;
    IF efetivo IS DISTINCT FROM v.proposto->'valor' THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_efeito_divergente'; END IF;
  END LOOP;
$patch$);
  EXECUTE definicao;

  definicao:=pg_get_functiondef('ambulatorio.revisao_conferir_sucesso(bigint)'::regprocedure);
  trecho:='v.registro_id IS DISTINCT FROM v.registro_efetivo';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Prova de alvo inesperada'; END IF;
  definicao:=replace(definicao,trecho,'(v.operacao<>''criar'' AND v.registro_id IS DISTINCT FROM v.registro_efetivo)');
  trecho:='    esperado:=ambulatorio.auditoria_envelope(v.proposto->''valor'',v.proposto->>''tipo_sql'');';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Prova de criacao inesperada'; END IF;
  definicao:=replace(definicao,trecho,trecho||$patch$
    IF v.operacao='criar' THEN
      IF EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_alvo a WHERE a.revisao_alvo_id=v.revisao_alvo_id AND a.acao='criado') THEN
        IF NOT EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo_evento e WHERE e.origem='revisao'
          AND e.revisao_alvo_id=v.revisao_alvo_id AND e.revisao_campo_id=v.revisao_campo_id AND e.campo_id=v.campo_id
          AND e.registro_id=v.registro_efetivo AND e.versao_campo=1 AND e.antes->>'estado'='alvo_ausente' AND e.depois=esperado) THEN
          RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_sucesso_sem_evento'; END IF;
      ELSIF NOT EXISTS(SELECT 1 FROM ambulatorio.revisao_alvo_predecessor(d.decisao_id,v.alvo_chave,v.tabela_destino) p
        JOIN ambulatorio.importacao_revisao_aplicacao ap ON ap.aplicacao_id=p.aplicacao_anterior
        JOIN ambulatorio.importacao_revisao_campo cp ON cp.decisao_id=ap.decisao_id AND cp.alvo_chave=v.alvo_chave
          AND cp.campo_id=v.campo_id AND cp.proposto->'valor'=v.proposto->'valor'
        WHERE p.registro_efetivo=v.registro_efetivo) THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_sucesso_inconsistente';
      ELSE
        PERFORM ambulatorio.revisao_conferir_sucesso(p.aplicacao_anterior)
          FROM ambulatorio.revisao_alvo_predecessor(d.decisao_id,v.alvo_chave,v.tabela_destino) p;
      END IF;
    END IF;
$patch$);
  EXECUTE definicao;
  definicao:=pg_get_functiondef('ambulatorio.revisao_cobertura_cadeia(bigint,bigint,bigint,jsonb,bigint[])'::regprocedure);
  trecho:='AND inicio.revisao_alvo_id=anterior.revisao_alvo_id AND inicio.revisao_campo_id=anterior.revisao_campo_id';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Prova de genese inesperada'; END IF;
  -- conferir_sucesso acima prova a genese original inclusive quando alvo e reutilizado.
  EXECUTE replace(definicao,trecho,'AND inicio.revisao_alvo_id IS NOT NULL AND inicio.revisao_campo_id IS NOT NULL');
END $$;

GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_alvo_predecessor(bigint,text,text) OWNER TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_conferir_criacao(bigint) OWNER TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_resolver_alvos(bigint) OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_alvo_predecessor(bigint,text,text),revisao_conferir_criacao(bigint),revisao_resolver_alvos(bigint)
  FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
    ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
COMMIT;

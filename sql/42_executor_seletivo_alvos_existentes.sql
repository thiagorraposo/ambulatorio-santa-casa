-- Objetivo: aplicar plano aprovado em alvos existentes, com evidencia atomica.
-- Impacto: executor PRIVADO sem EXECUTE para operadores, sem ativacao HTTP/CLI.
-- Criacao de visitas/dependentes e fechamento continuam incrementos obrigatorios.
-- Reversao: restringir novas aplicacoes; preservar sucesso, fonte e historico.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

GRANT SELECT,INSERT ON importacao_revisao_aplicacao,importacao_revisao_alvo TO ambulatorio_revisao_owner;
GRANT UPDATE(numero_tentativa) ON importacao_revisao_aplicacao TO ambulatorio_revisao_owner;
GRANT INSERT ON importacao_registro TO ambulatorio_revisao_owner;
GRANT UPDATE(revisao_corrente_id,versao_controle) ON importacao_fonte TO ambulatorio_revisao_owner;
GRANT UPDATE(estado,encerrada_em) ON importacao_revisao TO ambulatorio_revisao_owner;
GRANT UPDATE(status_lote,iniciado_em,finalizado_em) ON importacao_lote TO ambulatorio_revisao_owner;
GRANT UPDATE(status_linha,mensagem_processamento) ON importacao_linha TO ambulatorio_revisao_owner;
GRANT UPDATE(origem,aplicacao_id) ON auditoria_contexto_transacao TO ambulatorio_revisao_owner;
-- UPDATE de identidade e apenas para FOR SHARE; nenhuma funcao altera usuarios.
GRANT UPDATE(ativo) ON usuario_aplicacao TO ambulatorio_revisao_owner;
GRANT USAGE ON SEQUENCE importacao_revisao_aplicacao_aplicacao_id_seq,
  importacao_revisao_alvo_revisao_alvo_id_seq,importacao_registro_importacao_registro_id_seq TO ambulatorio_revisao_owner;

DO $$ DECLARE tabela text; colunas text;
BEGIN
  FOREACH tabela IN ARRAY ARRAY['paciente','atendimento','paciente_endereco','paciente_contato',
    'paciente_projeto_estudo','paciente_exame_complementar','tratamento_benzonidazol',
    'pendencia_atendimento','dados_clinicos_atendimento','diagnostico_chagas','encaminhamento',
    'acompanhamento_cuidado','evento_clinico','dispositivo_implantado','notificacao','obito','tratamento_chagas'] LOOP
    SELECT string_agg(quote_ident(a.attname),',' ORDER BY a.attnum) INTO colunas FROM pg_attribute a
      WHERE a.attrelid=to_regclass('ambulatorio.'||tabela) AND a.attnum>0 AND NOT a.attisdropped
        AND a.attname NOT IN ('paciente_id','atendimento_id','criado_em','atualizado_em','versao_registro')
        AND NOT EXISTS(SELECT 1 FROM pg_index i WHERE i.indrelid=a.attrelid AND i.indisprimary AND a.attnum=ANY(i.indkey));
    EXECUTE format('GRANT UPDATE(%s) ON ambulatorio.%I TO ambulatorio_revisao_owner',colunas,tabela);
  END LOOP;
END $$;

-- Somente o owner sem membros executa transicoes. Evidencias continuam imutaveis.
CREATE OR REPLACE FUNCTION revisao_proteger_escrita() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE d importacao_revisao_decisao; a importacao_revisao_aplicacao;
BEGIN
  IF TG_OP IN ('DELETE','TRUNCATE') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_evidencia_imutavel';
  END IF;
  IF TG_OP='UPDATE' THEN
    IF TG_TABLE_NAME='importacao_revisao_autorizacao'
      AND to_jsonb(OLD)->>'revogada_em' IS NULL AND to_jsonb(NEW)->>'revogada_em' IS NOT NULL
      AND (to_jsonb(NEW)-ARRAY['revogada_em','revogada_por_usuario_id'])=(to_jsonb(OLD)-ARRAY['revogada_em','revogada_por_usuario_id']) THEN
      NEW.revogada_em:=clock_timestamp(); RETURN NEW;
    END IF;
    IF TG_TABLE_NAME='importacao_revisao' AND to_jsonb(OLD)->>'estado'='preparada' AND to_jsonb(NEW)->>'estado'='cancelada'
      AND (to_jsonb(NEW)-ARRAY['estado','encerrada_em'])=(to_jsonb(OLD)-ARRAY['estado','encerrada_em'])
      AND NOT EXISTS(SELECT 1 FROM importacao_revisao_aplicacao ap JOIN importacao_revisao_decisao de USING(decisao_id)
        WHERE de.revisao_id=(to_jsonb(OLD)->>'revisao_id')::bigint AND ap.resultado='aplicada') THEN
      NEW.encerrada_em:=clock_timestamp(); RETURN NEW;
    END IF;
    IF current_user='ambulatorio_revisao_owner' THEN
      IF TG_TABLE_NAME='importacao_fonte'
        AND (to_jsonb(NEW)-ARRAY['revisao_corrente_id','versao_controle'])=(to_jsonb(OLD)-ARRAY['revisao_corrente_id','versao_controle'])
        AND (to_jsonb(NEW)->>'versao_controle')::bigint=(to_jsonb(OLD)->>'versao_controle')::bigint+1
        AND EXISTS(SELECT 1 FROM importacao_revisao r WHERE r.revisao_id=(to_jsonb(NEW)->>'revisao_corrente_id')::bigint
          AND r.fonte_id=(to_jsonb(OLD)->>'fonte_id')::bigint AND r.estado='em_aplicacao'
          AND r.revisao_base_id IS NOT DISTINCT FROM (to_jsonb(OLD)->>'revisao_corrente_id')::bigint
          AND r.versao_fonte_esperada=(to_jsonb(OLD)->>'versao_controle')::bigint) THEN RETURN NEW; END IF;
      IF TG_TABLE_NAME='importacao_revisao'
        AND (to_jsonb(NEW)-ARRAY['estado','encerrada_em'])=(to_jsonb(OLD)-ARRAY['estado','encerrada_em'])
        AND to_jsonb(OLD)->>'estado'='preparada' AND to_jsonb(NEW)->>'estado'='em_aplicacao'
        AND to_jsonb(NEW)->>'encerrada_em' IS NULL
        AND EXISTS(SELECT 1 FROM importacao_revisao_aplicacao ap JOIN importacao_revisao_decisao de USING(decisao_id)
          WHERE de.revisao_id=(to_jsonb(OLD)->>'revisao_id')::bigint AND ap.resultado='aplicada') THEN RETURN NEW; END IF;
    END IF;
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_evidencia_imutavel';
  END IF;
  CASE TG_TABLE_NAME
  WHEN 'importacao_fonte' THEN
    NEW.criado_em:=clock_timestamp();
    IF NEW.revisao_corrente_id IS NOT NULL OR NEW.versao_controle<>0 THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_executor_nao_habilitado'; END IF;
  WHEN 'importacao_revisao' THEN
    NEW.criada_em:=clock_timestamp();
    IF NEW.estado<>'preparada' OR NEW.encerrada_em IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_executor_nao_habilitado'; END IF;
  WHEN 'importacao_revisao_autorizacao' THEN
    NEW.concedida_em:=clock_timestamp();
    IF NEW.revogada_em IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_autorizacao_invalida'; END IF;
  WHEN 'importacao_revisao_decisao' THEN
    NEW.decidida_em:=clock_timestamp(); NEW.publicacao_xid:=pg_current_xact_id();
  WHEN 'importacao_revisao_campo' THEN
    SELECT * INTO STRICT d FROM importacao_revisao_decisao WHERE decisao_id=NEW.decisao_id FOR UPDATE;
    IF d.publicacao_xid<>pg_current_xact_id() THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_plano_ja_publicado'; END IF;
  WHEN 'importacao_revisao_aplicacao' THEN
    NEW.executada_em:=clock_timestamp(); NEW.executor_db:=session_user; NEW.publicacao_xid:=pg_current_xact_id();
    IF NEW.resultado='aplicada' AND current_user<>'ambulatorio_revisao_owner' THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_executor_nao_habilitado'; END IF;
  WHEN 'importacao_revisao_alvo' THEN
    SELECT * INTO STRICT a FROM importacao_revisao_aplicacao WHERE aplicacao_id=NEW.aplicacao_id FOR UPDATE;
    IF a.publicacao_xid<>pg_current_xact_id() OR a.resultado<>'aplicada' THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_aplicacao_sem_sucesso'; END IF;
  WHEN 'auditoria_campo_evento' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_captura_nao_habilitada';
  ELSE NULL;
  END CASE;
  RETURN NEW;
END $$;

-- Capture atribui apenas os campos/alvos da aplicacao aprovada. O restante do
-- gatilho (inclusive precedencia do importador e cadeia) permanece inalterado.
DO $$ DECLARE definicao text; trecho text;
BEGIN
  definicao:=pg_get_functiondef('ambulatorio.auditoria_capturar()'::regprocedure);
  trecho:='  contexto ambulatorio.auditoria_contexto_transacao;';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Captura inesperada'; END IF;
  definicao:=replace(definicao,trecho,trecho||chr(10)||'  alvo_revisao bigint; campo_revisao bigint;');
  trecho:='    INSERT INTO ambulatorio.auditoria_campo_evento(campo_id,registro_id,versao_campo,evento_anterior_id,origem,antes,depois,importacao_linha_id,ator_usuario_id)';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Insercao de captura inesperada'; END IF;
  definicao:=replace(definicao,trecho,$patch$
    alvo_revisao:=NULL; campo_revisao:=NULL;
    IF contexto.origem='revisao' THEN
      SELECT a.revisao_alvo_id,cp.revisao_campo_id INTO alvo_revisao,campo_revisao
        FROM ambulatorio.importacao_revisao_alvo a
        JOIN ambulatorio.importacao_revisao_aplicacao ap USING(aplicacao_id)
        JOIN ambulatorio.importacao_revisao_campo cp ON cp.decisao_id=ap.decisao_id AND cp.alvo_chave=a.alvo_chave
        WHERE a.aplicacao_id=contexto.aplicacao_id AND a.tabela_destino=TG_TABLE_NAME
          AND a.registro_id=registro AND cp.campo_id=c.campo_id AND cp.operacao IN ('definir','anular','criar');
      IF campo_revisao IS NULL THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='auditoria_revisao_campo_nao_aprovado';
      END IF;
    END IF;
    INSERT INTO ambulatorio.auditoria_campo_evento(campo_id,registro_id,versao_campo,evento_anterior_id,origem,antes,depois,importacao_linha_id,ator_usuario_id,revisao_alvo_id,revisao_campo_id)$patch$);
  trecho:='contexto.importacao_linha_id,contexto.ator_usuario_id);';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Valores de captura inesperados'; END IF;
  EXECUTE replace(definicao,trecho,'contexto.importacao_linha_id,contexto.ator_usuario_id,alvo_revisao,campo_revisao);');

  definicao:=pg_get_functiondef('ambulatorio.revisao_validar_integridade()'::regprocedure);
  trecho:='IF root_id <> next_id OR r.revisao_base_id IS DISTINCT FROM f.revisao_corrente_id'||chr(10)
    ||'           OR r.versao_fonte_esperada <> f.versao_controle THEN';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Validacao da fonte inesperada'; END IF;
  definicao:=replace(definicao,trecho,
    'IF root_id <> next_id OR (r.estado IN (''preparada'',''cancelada'') AND (r.revisao_base_id IS DISTINCT FROM f.revisao_corrente_id'
    ||' OR r.versao_fonte_esperada <> f.versao_controle))'
    ||' OR (r.estado=''em_aplicacao'' AND (f.revisao_corrente_id IS DISTINCT FROM r.revisao_id'
    ||' OR f.versao_controle<>r.versao_fonte_esperada+1)) THEN');
  -- Aprovar linhas ainda pendentes durante uma revisao parcialmente aplicada.
  trecho:='IF r.estado <> ''preparada'' THEN';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Validacao de abertura inesperada'; END IF;
  definicao:=replace(definicao,trecho,'IF r.estado NOT IN (''preparada'',''em_aplicacao'') THEN');
  trecho:='''paciente_id'',''atendimento_id'',''criado_em'',''atualizado_em''';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Catalogo protegido inesperado'; END IF;
  definicao:=replace(definicao,trecho,trecho||',''versao_registro''');
  EXECUTE definicao;
  definicao:=pg_get_functiondef('ambulatorio.revisao_publicar_decisao_interna(bigint,bigint,bigint,bigint,bigint,bigint,text,text,jsonb,bigint)'::regprocedure);
  trecho:='IF r.estado<>''preparada'' OR r.versao_fonte_esperada<>f.versao_controle'||chr(10)
    ||'    OR r.revisao_base_id IS DISTINCT FROM f.revisao_corrente_id THEN';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Publicacao aberta inesperada'; END IF;
  EXECUTE replace(definicao,trecho,
    'IF r.estado NOT IN (''preparada'',''em_aplicacao'')'
    ||' OR (r.estado=''preparada'' AND (r.versao_fonte_esperada<>f.versao_controle OR r.revisao_base_id IS DISTINCT FROM f.revisao_corrente_id))'
    ||' OR (r.estado=''em_aplicacao'' AND (f.revisao_corrente_id IS DISTINCT FROM r.revisao_id OR f.versao_controle<>r.versao_fonte_esperada+1)) THEN');
END $$;

CREATE FUNCTION revisao_conferir_sucesso(aplicacao bigint) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ap ambulatorio.importacao_revisao_aplicacao; d ambulatorio.importacao_revisao_decisao;
  v record; esperado jsonb;
BEGIN
  SELECT * INTO STRICT ap FROM ambulatorio.importacao_revisao_aplicacao WHERE aplicacao_id=aplicacao;
  SELECT * INTO STRICT d FROM ambulatorio.importacao_revisao_decisao WHERE decisao_id=ap.decisao_id;
  IF ap.resultado<>'aplicada' OR ap.plano_sha256<>d.plano_sha256
    OR (SELECT count(*) FROM ambulatorio.importacao_revisao_alvo WHERE aplicacao_id=aplicacao)<>
      (SELECT count(DISTINCT alvo_chave) FROM ambulatorio.importacao_revisao_campo WHERE decisao_id=d.decisao_id) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_sucesso_inconsistente'; END IF;
  FOR v IN SELECT cp.*,c.tabela_destino,a.revisao_alvo_id,a.registro_id AS registro_efetivo
    FROM ambulatorio.importacao_revisao_campo cp JOIN ambulatorio.auditoria_campo c USING(campo_id)
    LEFT JOIN ambulatorio.importacao_revisao_alvo a ON a.aplicacao_id=aplicacao AND a.alvo_chave=cp.alvo_chave
    WHERE cp.decisao_id=d.decisao_id LOOP
    IF v.revisao_alvo_id IS NULL OR v.registro_id IS DISTINCT FROM v.registro_efetivo
      OR NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_alvo a
        JOIN ambulatorio.importacao_registro p USING(importacao_registro_id)
        WHERE a.revisao_alvo_id=v.revisao_alvo_id AND a.tabela_destino=v.tabela_destino
          AND p.importacao_linha_id=d.linha_revisada_id AND p.tabela_destino=a.tabela_destino
          AND p.registro_id=a.registro_id AND p.acao=a.acao) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_sucesso_inconsistente'; END IF;
    esperado:=ambulatorio.auditoria_envelope(v.proposto->'valor',v.proposto->>'tipo_sql');
    IF v.operacao IN ('definir','anular') AND esperado IS DISTINCT FROM v.atual_avaliado
      AND NOT EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo_evento e
        WHERE e.origem='revisao' AND e.revisao_alvo_id=v.revisao_alvo_id AND e.revisao_campo_id=v.revisao_campo_id
          AND e.campo_id=v.campo_id AND e.registro_id=v.registro_efetivo AND e.antes=v.atual_avaliado AND e.depois=esperado) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_sucesso_sem_evento'; END IF;
  END LOOP;
END $$;

CREATE FUNCTION revisao_aplicar_decisao_interna(decisao bigint,autorizacao bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint; fonte bigint; r ambulatorio.importacao_revisao; f ambulatorio.importacao_fonte;
  d ambulatorio.importacao_revisao_decisao; avaliacao jsonb; ap bigint; tentativa bigint;
  alvo record; v record; proveniencia bigint; acao_alvo text; colunas text; selecao text; valores jsonb; efetivo jsonb;
BEGIN
  IF NOT pg_has_role(session_user,'ambulatorio_revisao_servico','MEMBER') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_servico_nao_autorizado'; END IF;
  ator:=ambulatorio.revisao_ator_autenticado();
  SELECT rv.fonte_id INTO fonte FROM ambulatorio.importacao_revisao_decisao de
    JOIN ambulatorio.importacao_revisao rv USING(revisao_id) WHERE de.decisao_id=decisao;
  IF fonte IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_decisao_ausente'; END IF;
  SELECT * INTO STRICT f FROM ambulatorio.importacao_fonte WHERE fonte_id=fonte FOR UPDATE;
  SELECT rv.* INTO STRICT r FROM ambulatorio.importacao_revisao rv JOIN ambulatorio.importacao_revisao_decisao de USING(revisao_id)
    WHERE de.decisao_id=decisao FOR UPDATE OF rv;
  -- Mesma ordem de revogacao e aprovacao; identidades tambem ficam protegidas.
  PERFORM au.autorizacao_id FROM ambulatorio.importacao_revisao_autorizacao au
    WHERE au.autorizacao_id IN (autorizacao,(SELECT autorizacao_id FROM ambulatorio.importacao_revisao_decisao WHERE decisao_id=decisao))
    ORDER BY au.autorizacao_id FOR UPDATE;
  PERFORM u.usuario_id FROM ambulatorio.usuario_aplicacao u
    WHERE u.usuario_id IN (ator,(SELECT decidida_por_usuario_id FROM ambulatorio.importacao_revisao_decisao WHERE decisao_id=decisao))
    ORDER BY u.usuario_id FOR SHARE;
  SELECT * INTO STRICT d FROM ambulatorio.importacao_revisao_decisao WHERE decisao_id=decisao FOR UPDATE;
  PERFORM p.paciente_id FROM ambulatorio.paciente p WHERE p.paciente_id=d.paciente_id FOR UPDATE;
  PERFORM a.atendimento_id FROM ambulatorio.atendimento a WHERE a.atendimento_id=d.atendimento_base_id FOR UPDATE;
  FOR alvo IN SELECT DISTINCT c.tabela_destino,c.coluna_pk,cp.registro_id
    FROM ambulatorio.importacao_revisao_campo cp JOIN ambulatorio.auditoria_campo c USING(campo_id)
    WHERE cp.decisao_id=decisao AND cp.registro_id IS NOT NULL ORDER BY c.tabela_destino,cp.registro_id,c.coluna_pk LOOP
    EXECUTE format('SELECT %I FROM ambulatorio.%I WHERE %I=$1 FOR UPDATE',alvo.coluna_pk,alvo.tabela_destino,alvo.coluna_pk)
      USING alvo.registro_id;
  END LOOP;
  avaliacao:=ambulatorio.revisao_avaliar_decisao(decisao,autorizacao,ator);
  IF avaliacao->>'resultado'='ja_aplicada' THEN
    PERFORM ambulatorio.revisao_conferir_sucesso((avaliacao->>'aplicacaoId')::bigint); RETURN avaliacao;
  END IF;
  SELECT COALESCE(max(numero_tentativa),0)+1 INTO tentativa FROM ambulatorio.importacao_revisao_aplicacao WHERE decisao_id=decisao;
  IF avaliacao->>'resultado'<>'apta' THEN
    IF avaliacao->>'resultado' IN ('obsoleta','conflito') THEN
      INSERT INTO ambulatorio.importacao_revisao_aplicacao(decisao_id,numero_tentativa,resultado,codigo_resultado,plano_sha256)
        VALUES(decisao,tentativa,avaliacao->>'resultado',avaliacao->>'codigo',d.plano_sha256);
    END IF;
    RETURN avaliacao;
  END IF;
  IF EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_campo WHERE decisao_id=decisao AND operacao='criar') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_criacao_ainda_nao_homologada'; END IF;
  -- A linha fica bloqueada antes de anexar proveniencia. Nao permite dois jobs.
  PERFORM importacao_linha_id FROM ambulatorio.importacao_linha WHERE importacao_linha_id=d.linha_revisada_id FOR UPDATE;
  INSERT INTO ambulatorio.importacao_revisao_aplicacao(decisao_id,numero_tentativa,resultado,codigo_resultado,plano_sha256)
    VALUES(decisao,tentativa,'aplicada','revisao_plano_aplicado',d.plano_sha256) RETURNING aplicacao_id INTO ap;
  FOR alvo IN SELECT cp.alvo_chave,c.tabela_destino,c.coluna_pk,cp.registro_id,
      bool_or(cp.operacao IN ('definir','anular') AND cp.proposto->'valor' IS DISTINCT FROM cp.atual_avaliado->'valor') AS altera
    FROM ambulatorio.importacao_revisao_campo cp JOIN ambulatorio.auditoria_campo c USING(campo_id)
    WHERE cp.decisao_id=decisao GROUP BY cp.alvo_chave,c.tabela_destino,c.coluna_pk,cp.registro_id ORDER BY cp.alvo_chave LOOP
    acao_alvo:=CASE WHEN alvo.altera THEN 'atualizado' ELSE 'associado' END;
    INSERT INTO ambulatorio.importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
      VALUES(d.linha_revisada_id,alvo.tabela_destino,alvo.registro_id,acao_alvo) RETURNING importacao_registro_id INTO proveniencia;
    INSERT INTO ambulatorio.importacao_revisao_alvo(aplicacao_id,alvo_chave,tabela_destino,registro_id,importacao_registro_id,acao)
      VALUES(ap,alvo.alvo_chave,alvo.tabela_destino,alvo.registro_id,proveniencia,acao_alvo);
  END LOOP;
  -- As ancoras explicitas tambem pertencem a nova linha, sem inventar visita.
  INSERT INTO ambulatorio.importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
    VALUES(d.linha_revisada_id,'paciente',d.paciente_id,'associado') ON CONFLICT DO NOTHING;
  IF d.atendimento_base_id IS NOT NULL THEN
    INSERT INTO ambulatorio.importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao)
      VALUES(d.linha_revisada_id,'atendimento',d.atendimento_base_id,'associado') ON CONFLICT DO NOTHING;
  END IF;
  UPDATE ambulatorio.auditoria_contexto_transacao SET origem='revisao',aplicacao_id=ap
    WHERE transacao_id=pg_current_xact_id() AND origem='aplicacao' AND principal_db=session_user AND ator_usuario_id=ator;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_identidade_nao_autenticada'; END IF;
  FOR alvo IN SELECT DISTINCT c.tabela_destino,c.coluna_pk,cp.registro_id
    FROM ambulatorio.importacao_revisao_campo cp JOIN ambulatorio.auditoria_campo c USING(campo_id)
    WHERE cp.decisao_id=decisao AND cp.operacao IN ('definir','anular') ORDER BY c.tabela_destino,cp.registro_id,c.coluna_pk LOOP
    SELECT string_agg(quote_ident(c.coluna_destino),',' ORDER BY c.campo_id),
      string_agg('x.'||quote_ident(c.coluna_destino),',' ORDER BY c.campo_id),jsonb_object_agg(c.coluna_destino,cp.proposto->'valor')
      INTO colunas,selecao,valores FROM ambulatorio.importacao_revisao_campo cp JOIN ambulatorio.auditoria_campo c USING(campo_id)
      WHERE cp.decisao_id=decisao AND c.tabela_destino=alvo.tabela_destino AND cp.registro_id=alvo.registro_id
        AND cp.operacao IN ('definir','anular');
    -- Identificadores sao do catalogo protegido; valores sao parametros tipados.
    EXECUTE format('UPDATE ambulatorio.%I SET (%s)=(SELECT %s FROM jsonb_populate_record(NULL::ambulatorio.%I,$1) x) WHERE %I=$2',
      alvo.tabela_destino,colunas,selecao,alvo.tabela_destino,alvo.coluna_pk) USING valores,alvo.registro_id;
    FOR v IN SELECT cp.*,c.coluna_destino,c.tipo_sql FROM ambulatorio.importacao_revisao_campo cp
      JOIN ambulatorio.auditoria_campo c USING(campo_id) WHERE cp.decisao_id=decisao
        AND c.tabela_destino=alvo.tabela_destino AND cp.registro_id=alvo.registro_id AND cp.operacao IN ('definir','anular') LOOP
      EXECUTE format('SELECT to_jsonb(%I) FROM ambulatorio.%I WHERE %I=$1',v.coluna_destino,alvo.tabela_destino,alvo.coluna_pk)
        INTO efetivo USING alvo.registro_id;
      IF efetivo IS DISTINCT FROM v.proposto->'valor' THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_efeito_divergente'; END IF;
    END LOOP;
  END LOOP;
  PERFORM ambulatorio.revisao_conferir_sucesso(ap);
  UPDATE ambulatorio.importacao_linha SET status_linha='importada',mensagem_processamento='revisao_plano_aplicado'
    WHERE importacao_linha_id=d.linha_revisada_id;
  IF r.estado='preparada' THEN
    UPDATE ambulatorio.importacao_revisao SET estado='em_aplicacao' WHERE revisao_id=r.revisao_id;
    UPDATE ambulatorio.importacao_fonte SET revisao_corrente_id=r.revisao_id,versao_controle=versao_controle+1 WHERE fonte_id=r.fonte_id;
    UPDATE ambulatorio.importacao_lote SET status_lote='processando',iniciado_em=COALESCE(iniciado_em,clock_timestamp())
      WHERE importacao_lote_id=r.lote_revisado_id;
  END IF;
  SET CONSTRAINTS ALL IMMEDIATE;
  RETURN avaliacao||jsonb_build_object('resultado','aplicada','codigo','revisao_plano_aplicado','aplicacaoId',ap::text);
EXCEPTION WHEN check_violation OR foreign_key_violation OR not_null_violation OR unique_violation
  OR invalid_text_representation OR numeric_value_out_of_range OR string_data_right_truncation THEN
  -- Nao encaminhar valores/DETAIL de constraints ao operador. A transacao falha.
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_aplicacao_integridade';
END $$;

GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_conferir_sucesso(bigint) OWNER TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_aplicar_decisao_interna(bigint,bigint) OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_conferir_sucesso(bigint),revisao_aplicar_decisao_interna(bigint,bigint)
  FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
    ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
DO $$ DECLARE definicao text; trecho text;
BEGIN
  definicao:=pg_get_functiondef('ambulatorio.revisao_avaliar_decisao(bigint,bigint,bigint)'::regprocedure);
  trecho:='    RETURN resposta||jsonb_build_object(''resultado'',''ja_aplicada''';
  IF strpos(definicao,trecho)=0 THEN RAISE EXCEPTION 'Resultado historico inesperado'; END IF;
  EXECUTE replace(definicao,trecho,'    PERFORM ambulatorio.revisao_conferir_sucesso(ap.aplicacao_id);'||chr(10)||trecho);
END $$;
-- Nao publicar executor: aceite completo/ativacao sao dependencias posteriores.
COMMIT;

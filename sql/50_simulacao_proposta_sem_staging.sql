-- Objetivo: avaliar arquivo e plano propostos antes de criar lote/linha/decisao.
-- Resultado e diagnostico de snapshot; publicacao e aplicacao revalidam sob locks.
-- Sem DML, nextval, locks de escrita, valores clinicos na resposta ou ativacao HTTP.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE FUNCTION revisao_comparar_brutos_virtuais(bruto_base jsonb,bruto_novo jsonb)
RETURNS TABLE(chave text,bloco text,ocorrencia bigint,estado_base text,valor_base jsonb,
  estado_proposto text,valor_proposto jsonb,alterado boolean)
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
  WITH b AS (
    SELECT c->>'chave' k,c->>'bloco' bl,COALESCE((c->>'ocorrencia')::bigint,1) oc,c->'valor' v
      FROM jsonb_array_elements(COALESCE(bruto_base,'[]'::jsonb)) c
  ), n AS (
    SELECT c->>'chave' k,c->>'bloco' bl,COALESCE((c->>'ocorrencia')::bigint,1) oc,c->'valor' v
      FROM jsonb_array_elements(bruto_novo) c
  ), estados AS (
    SELECT COALESCE(b.k,n.k) k,COALESCE(b.bl,n.bl) bl,COALESCE(b.oc,n.oc) oc,
      CASE WHEN bruto_base IS NULL THEN 'linha_ausente' WHEN b.k IS NULL THEN 'coluna_ausente'
        WHEN b.v='null'::jsonb OR b.v='""'::jsonb THEN 'celula_vazia' ELSE 'valor' END eb,b.v vb,
      CASE WHEN n.k IS NULL THEN 'coluna_ausente'
        WHEN n.v='null'::jsonb OR n.v='""'::jsonb THEN 'celula_vazia' ELSE 'valor' END en,n.v vn
      FROM b FULL JOIN n USING(k,bl,oc)
  ) SELECT e.k,e.bl,e.oc,e.eb,COALESCE(e.vb,'null'::jsonb),e.en,COALESCE(e.vn,'null'::jsonb),
    e.eb IS DISTINCT FROM e.en OR e.vb IS DISTINCT FROM e.vn FROM estados e
$$;

CREATE FUNCTION revisao_simular_proposta(fonte bigint,lote_base bigint,autorizacao bigint,
  ator_autenticado bigint,manifesto_revisado_texto text,transformacoes_texto text,proposta jsonb)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE f ambulatorio.importacao_fonte; b ambulatorio.importacao_lote;
  esperado ambulatorio.importacao_lote; lote_esperado bigint; proximo bigint;
  raiz_base bigint; raiz_esperada bigint; visitados bigint[];
  manifesto jsonb; transformacoes jsonb; aba jsonb; colunas jsonb; linha jsonb; bruto jsonb;
  base_bruto jsonb; base_id bigint; paciente bigint; atendimento bigint; numero bigint;
  plano jsonb; item jsonb; regra jsonb; celula jsonb; comparacao jsonb; respostas jsonb:='[]';
  eventos jsonb; snapshot_esperado text;
  alvo record; regra_count integer; visitas integer;
  c ambulatorio.auditoria_campo; estado text; codigo text; valor jsonb; evento bigint;
  esperado_base jsonb; esperado_proposto jsonb; total integer:=0; aptas integer:=0;
  bloqueadas integer:=0; conflitos integer:=0; obsoletas integer:=0; alterados integer; novos integer;
  hash_manifesto text; hash_transformacoes text; hash_plano text; seen jsonb:='[]';
BEGIN
  IF NOT pg_has_role(session_user,'ambulatorio_revisao_servico','MEMBER')
    OR NOT pg_has_role(session_user,'ambulatorio_servico_autenticado','MEMBER') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_simulacao_nao_autorizada';
  END IF;
  IF ator_autenticado IS NULL OR NOT EXISTS(SELECT 1 FROM ambulatorio.usuario_aplicacao
      WHERE usuario_id=ator_autenticado AND ativo)
    OR NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_autorizacao a
      WHERE a.autorizacao_id=autorizacao AND a.fonte_id=fonte AND a.usuario_id=ator_autenticado
        AND a.revogada_em IS NULL AND (a.valida_ate IS NULL OR a.valida_ate>statement_timestamp())) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_autorizacao_invalida';
  END IF;
  SELECT * INTO f FROM ambulatorio.importacao_fonte WHERE fonte_id=fonte;
  SELECT * INTO b FROM ambulatorio.importacao_lote WHERE importacao_lote_id=lote_base;
  lote_esperado:=f.lote_inicial_id;
  IF f.revisao_corrente_id IS NOT NULL THEN
    SELECT r.lote_revisado_id INTO lote_esperado FROM ambulatorio.importacao_revisao r
      WHERE r.revisao_id=f.revisao_corrente_id AND r.fonte_id=fonte
        AND r.estado IN ('concluida','concluida_com_pendencias');
  END IF;
  SELECT * INTO esperado FROM ambulatorio.importacao_lote WHERE importacao_lote_id=lote_esperado;
  IF f.fonte_id IS NULL OR b.importacao_lote_id IS NULL
    OR b.status_lote NOT IN ('concluido','concluido_com_pendencias')
    OR esperado.importacao_lote_id IS NULL
    OR b.hash_arquivo_sha256 IS DISTINCT FROM esperado.hash_arquivo_sha256
    OR b.layout_versao IS DISTINCT FROM esperado.layout_versao
    OR b.manifesto_sha256 IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_base_incompativel';
  END IF;
  raiz_base:=lote_base; visitados:=ARRAY[]::bigint[];
  LOOP
    IF raiz_base=ANY(visitados) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_ciclo_lotes'; END IF;
    visitados:=array_append(visitados,raiz_base);
    SELECT lote_reprocessado_de_id INTO proximo FROM ambulatorio.importacao_lote
      WHERE importacao_lote_id=raiz_base;
    EXIT WHEN proximo IS NULL; raiz_base:=proximo;
  END LOOP;
  raiz_esperada:=lote_esperado; visitados:=ARRAY[]::bigint[];
  LOOP
    IF raiz_esperada=ANY(visitados) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_ciclo_lotes'; END IF;
    visitados:=array_append(visitados,raiz_esperada);
    SELECT lote_reprocessado_de_id INTO proximo FROM ambulatorio.importacao_lote
      WHERE importacao_lote_id=raiz_esperada;
    EXIT WHEN proximo IS NULL; raiz_esperada:=proximo;
  END LOOP;
  IF raiz_base<>raiz_esperada THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_base_incompativel'; END IF;
  IF manifesto_revisado_texto IS NULL OR transformacoes_texto IS NULL
    OR octet_length(manifesto_revisado_texto) NOT BETWEEN 1 AND 10485760
    OR octet_length(transformacoes_texto) NOT BETWEEN 1 AND 10485760 THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_artefatos_invalidos';
  END IF;
  manifesto:=manifesto_revisado_texto::jsonb;
  transformacoes:=transformacoes_texto::jsonb;
  hash_manifesto:=encode(sha256(convert_to(manifesto_revisado_texto,'UTF8')),'hex');
  hash_transformacoes:=encode(sha256(convert_to(transformacoes_texto,'UTF8')),'hex');
  IF jsonb_typeof(manifesto->'sheets') IS DISTINCT FROM 'array'
    OR COALESCE(btrim(manifesto->>'versao'),'')=''
    OR COALESCE(btrim(manifesto->>'layout_versao'),'')=''
    OR transformacoes->>'formato' IS DISTINCT FROM 'revisao-transformacoes/v1'
    OR jsonb_typeof(transformacoes->'regras') IS DISTINCT FROM 'array'
    OR jsonb_typeof(proposta->'linhas') IS DISTINCT FROM 'array'
    OR (proposta-ARRAY['linhas'])<>'{}'::jsonb THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_proposta_invalida';
  END IF;
  IF jsonb_array_length(manifesto->'sheets')=0
    OR jsonb_array_length(proposta->'linhas')>10000 THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_proposta_invalida';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(manifesto->'sheets') s
      GROUP BY s->>'aba_nome_original' HAVING count(*)>1)
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(manifesto->'sheets') s
      GROUP BY s->>'aba_ordem' HAVING count(*)>1) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_manifesto_ambiguo';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(manifesto->'sheets') sheet
      WHERE jsonb_typeof(sheet) IS DISTINCT FROM 'object'
        OR COALESCE(btrim(sheet->>'aba_nome_original'),'')=''
        OR COALESCE((sheet->>'aba_ordem')::integer,0)<1
        OR jsonb_typeof(sheet->'columns') IS DISTINCT FROM 'array') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_manifesto_invalido';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(manifesto->'sheets') sheet
      WHERE jsonb_array_length(sheet->'columns')=0) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_manifesto_invalido';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(manifesto->'sheets') sheet,
      LATERAL jsonb_array_elements(sheet->'columns') col
      WHERE jsonb_typeof(col) IS DISTINCT FROM 'object'
        OR NOT col ?& ARRAY['posicao_fisica','cabecalho_original','chave_semantica',
          'ocorrencia','bloco_funcional']
        OR COALESCE(col->>'posicao_fisica','')!~'^[A-Z]+$'
        OR COALESCE(btrim(col->>'chave_semantica'),'')=''
        OR COALESCE(btrim(col->>'bloco_funcional'),'')=''
        OR COALESCE((col->>'ocorrencia')::bigint,0)<1) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_manifesto_invalido';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(manifesto->'sheets') sheet,
      LATERAL jsonb_array_elements(sheet->'columns') col
      GROUP BY sheet->>'aba_nome_original',col->>'posicao_fisica' HAVING count(*)>1)
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(manifesto->'sheets') sheet,
      LATERAL jsonb_array_elements(sheet->'columns') col
      GROUP BY sheet->>'aba_nome_original',col->>'chave_semantica',col->>'bloco_funcional',
        COALESCE((col->>'ocorrencia')::bigint,1) HAVING count(*)>1) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_manifesto_ambiguo';
  END IF;
  FOR linha IN SELECT value FROM jsonb_array_elements(proposta->'linhas') LOOP
    total:=total+1;
    eventos:='[]'::jsonb;
    IF jsonb_typeof(linha) IS DISTINCT FROM 'object'
      OR (linha-ARRAY['linhaBaseId','pacienteId','atendimentoBaseId','abaNomeOriginal','abaOrdem',
        'numeroLinha','dadosBrutos','resultado','campos','snapshotSha256'])<>'{}'::jsonb
      OR NOT linha ?& ARRAY['linhaBaseId','pacienteId','atendimentoBaseId','abaNomeOriginal',
        'abaOrdem','numeroLinha','dadosBrutos','resultado','campos']
      OR linha->>'resultado' IS NULL OR linha->>'resultado' NOT IN ('autorizar','bloquear')
      OR jsonb_typeof(linha->'dadosBrutos') IS DISTINCT FROM 'array'
      OR jsonb_typeof(linha->'campos') IS DISTINCT FROM 'array'
      OR jsonb_array_length(linha->'campos')>256
      OR (linha ? 'snapshotSha256' AND COALESCE(linha->>'snapshotSha256','')!~'^[0-9a-f]{64}$') THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_linha_proposta_invalida';
    END IF;
    numero:=(linha->>'numeroLinha')::bigint;
    IF numero<1 OR seen @> jsonb_build_array(jsonb_build_array(linha->>'abaNomeOriginal',numero)) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_linha_proposta_ambigua';
    END IF;
    seen:=seen||jsonb_build_array(jsonb_build_array(linha->>'abaNomeOriginal',numero));
    SELECT value INTO aba FROM jsonb_array_elements(manifesto->'sheets')
      WHERE value->>'aba_nome_original'=linha->>'abaNomeOriginal'
        AND (value->>'aba_ordem')::integer=(linha->>'abaOrdem')::integer;
    colunas:=aba->'columns'; bruto:=linha->'dadosBrutos'; plano:=linha->'campos';
    SELECT COALESCE(jsonb_agg(p ORDER BY (p->>'campoId')::bigint,p->>'alvoChave'),'[]'::jsonb)
      INTO plano FROM jsonb_array_elements(plano) p;
    IF aba IS NULL OR jsonb_typeof(colunas) IS DISTINCT FROM 'array'
      OR jsonb_array_length(colunas)<>jsonb_array_length(bruto)
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(colunas) x
        GROUP BY x->>'posicao_fisica' HAVING count(*)>1)
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(bruto) WITH ORDINALITY x(c,n)
        JOIN jsonb_array_elements(colunas) WITH ORDINALITY y(c,n) USING(n)
        WHERE jsonb_typeof(x.c) IS DISTINCT FROM 'object'
          OR NOT x.c ?& ARRAY['posicao','cabecalho','chave','ocorrencia','bloco','valor']
          OR (x.c-ARRAY['posicao','cabecalho','chave','ocorrencia','bloco','valor'])<>'{}'::jsonb
          OR x.c->'posicao' IS DISTINCT FROM y.c->'posicao_fisica'
          OR x.c->'cabecalho' IS DISTINCT FROM y.c->'cabecalho_original'
          OR x.c->'chave' IS DISTINCT FROM y.c->'chave_semantica'
          OR x.c->'ocorrencia' IS DISTINCT FROM y.c->'ocorrencia'
          OR x.c->'bloco' IS DISTINCT FROM y.c->'bloco_funcional'
          OR jsonb_typeof(x.c->'valor') NOT IN ('string','number','boolean','null')) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_bruto_proposto_incompativel';
    END IF;
    base_id:=(linha->>'linhaBaseId')::bigint;
    paciente:=(linha->>'pacienteId')::bigint;
    atendimento:=(linha->>'atendimentoBaseId')::bigint;
    IF base_id IS NOT NULL THEN
      SELECT dados_brutos INTO base_bruto FROM ambulatorio.importacao_linha
        WHERE importacao_linha_id=base_id AND importacao_lote_id=lote_base;
      IF base_bruto IS NULL THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_linha_base_incompativel';
      END IF;
    ELSE base_bruto:=NULL; END IF;
    IF linha->>'resultado'='autorizar' AND (paciente IS NULL OR base_id IS NULL OR NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_registro
        WHERE importacao_linha_id=base_id AND tabela_destino='paciente' AND registro_id=paciente)
      OR (atendimento IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_registro r
        JOIN ambulatorio.atendimento a ON a.atendimento_id=r.registro_id AND a.paciente_id=paciente
        WHERE r.importacao_linha_id=base_id AND r.tabela_destino='atendimento'
          AND r.registro_id=atendimento))) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_ancora_sem_proveniencia';
    END IF;
    SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.chave,x.bloco,x.ocorrencia),'[]'::jsonb)
      INTO comparacao
      FROM ambulatorio.revisao_comparar_brutos_virtuais(base_bruto,bruto) x;
    estado:=CASE WHEN linha->>'resultado'='bloquear' THEN 'bloqueada' ELSE 'apta' END;
    codigo:=CASE WHEN estado='bloqueada' THEN 'revisao_linha_bloqueada' ELSE 'revisao_proposta_atual' END;
    IF estado='apta' AND EXISTS(SELECT 1 FROM jsonb_array_elements(comparacao) x
      WHERE (x->>'alterado')::boolean AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(plano) p
        WHERE p->>'chaveSemantica'=x->>'chave' AND p->>'blocoFuncional'=x->>'bloco'
          AND (p->>'ocorrencia')::bigint=(x->>'ocorrencia')::bigint)) THEN
      estado:='conflito'; codigo:='revisao_campos_alterados_omitidos';
    END IF;
    IF estado='apta' AND EXISTS(SELECT 1 FROM jsonb_array_elements(comparacao) x
      JOIN jsonb_array_elements(transformacoes->'regras') t ON t->>'chave'=x->>'chave'
        AND t->>'bloco'=x->>'bloco' AND (t->>'ocorrencia')::bigint=(x->>'ocorrencia')::bigint
      WHERE (x->>'alterado')::boolean AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(plano) p
        JOIN ambulatorio.auditoria_campo a ON a.campo_id=(p->>'campoId')::bigint
        WHERE p->>'chaveSemantica'=x->>'chave' AND p->>'blocoFuncional'=x->>'bloco'
          AND (p->>'ocorrencia')::bigint=(x->>'ocorrencia')::bigint
          AND a.tabela_destino=t->>'tabela' AND a.coluna_destino=t->>'coluna')) THEN
      estado:='conflito'; codigo:='revisao_destinos_derivados_omitidos';
    END IF;
    IF estado='apta' AND EXISTS(SELECT 1 FROM jsonb_array_elements(plano) p
      GROUP BY p->>'alvoChave',p->>'campoId' HAVING count(*)>1) THEN
      estado:='conflito'; codigo:='revisao_campo_duplicado';
    END IF;
    IF estado='apta' THEN
      FOR item IN SELECT value FROM jsonb_array_elements(plano) LOOP
        IF jsonb_typeof(item) IS DISTINCT FROM 'object'
          OR (item-ARRAY['campoId','alvoChave','registroId','chaveSemantica','blocoFuncional',
            'ocorrencia','categoria','operacao','base','proposto'])<>'{}'::jsonb
          OR NOT item ?& ARRAY['campoId','alvoChave','registroId','chaveSemantica','blocoFuncional',
            'ocorrencia','categoria','operacao','base','proposto'] THEN
          estado:='conflito'; codigo:='revisao_campo_invalido'; EXIT;
        END IF;
        SELECT * INTO c FROM ambulatorio.auditoria_campo WHERE campo_id=(item->>'campoId')::bigint;
        SELECT x INTO celula FROM jsonb_array_elements(comparacao) x
          WHERE x->>'chave'=item->>'chaveSemantica' AND x->>'bloco'=item->>'blocoFuncional'
            AND (x->>'ocorrencia')::bigint=(item->>'ocorrencia')::bigint;
        IF c.campo_id IS NULL OR celula IS NULL
          OR COALESCE(btrim(item->>'alvoChave'),'')=''
          OR COALESCE((item->>'ocorrencia')::bigint,0)<1
          OR item->>'categoria' NOT IN ('sem_mudanca','correcao_ocorrencia','nova_visita',
            'atualizacao_consolidada','revisao_necessaria')
          OR item->>'operacao' NOT IN ('conservar','associar','definir','anular','criar')
          OR (item->>'categoria'='revisao_necessaria' AND item->>'operacao'<>'conservar')
          OR (item->>'categoria'='sem_mudanca' AND item->>'operacao' NOT IN ('conservar','associar'))
          OR NOT ambulatorio.revisao_envelope_valido(item->'base',true)
          OR NOT ambulatorio.revisao_envelope_valido(item->'proposto',true) THEN
          estado:='conflito'; codigo:='revisao_campo_fora_catalogo'; EXIT;
        END IF;
        SELECT count(*),jsonb_agg(rule)->0 INTO regra_count,regra
          FROM jsonb_array_elements(transformacoes->'regras') rule
          WHERE rule->>'chave'=celula->>'chave' AND rule->>'bloco'=celula->>'bloco'
            AND (rule->>'ocorrencia')::bigint=(celula->>'ocorrencia')::bigint
            AND rule->>'tabela'=c.tabela_destino AND rule->>'coluna'=c.coluna_destino;
        IF regra_count<>1 THEN estado:='conflito'; codigo:='revisao_transformacao_ambigua'; EXIT; END IF;
        esperado_base:=ambulatorio.revisao_transformar_v1(celula->>'estado_base',celula->'valor_base',
          c.tipo_sql,regra->>'transformacao');
        esperado_proposto:=ambulatorio.revisao_transformar_v1(celula->>'estado_proposto',
          celula->'valor_proposto',c.tipo_sql,regra->>'transformacao');
        IF item->>'operacao'='anular' AND esperado_proposto->>'estado' IN ('celula_vazia','coluna_ausente') THEN
          esperado_proposto:=esperado_proposto||'{"estado":"nulo_explicito"}'::jsonb;
        END IF;
        IF item->'base' IS DISTINCT FROM esperado_base OR item->'proposto' IS DISTINCT FROM esperado_proposto THEN
          estado:='conflito'; codigo:='revisao_transformacao_divergente'; EXIT;
        END IF;
        IF item->>'operacao'='conservar' AND esperado_proposto->>'estado'='valor'
          AND esperado_base IS DISTINCT FROM esperado_proposto THEN
          estado:='conflito'; codigo:='revisao_alteracao_nao_resolvida'; EXIT;
        END IF;
        IF item->>'operacao' IN ('definir','anular','criar') AND c.captura_desde IS NULL THEN
          estado:='conflito'; codigo:='revisao_captura_nao_habilitada'; EXIT;
        END IF;
        IF (item->>'operacao'='definir' AND esperado_proposto->>'estado'<>'valor')
          OR (item->>'operacao'='anular' AND esperado_proposto->>'estado'<>'nulo_explicito')
          OR (item->>'operacao'='associar' AND esperado_proposto->>'estado'<>'valor')
          OR (item->>'operacao'='criar' AND esperado_proposto->>'estado' NOT IN
            ('valor','coluna_ausente','celula_vazia')) THEN
          estado:='conflito'; codigo:='revisao_operacao_incompativel'; EXIT;
        END IF;
        IF (item->>'registroId') IS NULL THEN
          IF item->>'operacao'<>'criar' OR c.tabela_destino='paciente' THEN
            estado:='conflito'; codigo:='revisao_criacao_destino_nao_homologado'; EXIT;
          END IF;
          eventos:=eventos||jsonb_build_array(jsonb_build_object('campoId',c.campo_id,
            'alvoChave',item->>'alvoChave','virtual',true));
        ELSE
          IF item->>'operacao'='criar'
            OR ambulatorio.revisao_alvo_paciente(c.tabela_destino,(item->>'registroId')::bigint)
              IS DISTINCT FROM paciente THEN
            estado:='conflito'; codigo:='revisao_paciente_incompativel'; EXIT;
          END IF;
          EXECUTE format('SELECT to_jsonb(%I) FROM ambulatorio.%I WHERE %I=$1',
            c.coluna_destino,c.tabela_destino,c.coluna_pk) INTO valor USING (item->>'registroId')::bigint;
          IF item->>'operacao'='associar' AND (item->'proposto'->'valor' IS DISTINCT FROM valor
            OR NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_registro WHERE importacao_linha_id=base_id
              AND tabela_destino=c.tabela_destino AND registro_id=(item->>'registroId')::bigint)) THEN
            estado:='conflito'; codigo:='revisao_associacao_divergente'; EXIT;
          END IF;
          IF item->>'operacao' IN ('definir','anular')
            AND ambulatorio.revisao_cobertura_base(base_id,c.campo_id,
              (item->>'registroId')::bigint,item->'base')<>'desde_base' THEN
            estado:='conflito'; codigo:='revisao_cobertura_insuficiente'; EXIT;
          END IF;
          SELECT evento_id INTO evento FROM ambulatorio.auditoria_campo_evento
            WHERE campo_id=c.campo_id AND registro_id=(item->>'registroId')::bigint
            ORDER BY versao_campo DESC LIMIT 1;
          eventos:=eventos||jsonb_build_array(jsonb_build_object('campoId',c.campo_id,
            'registroId',(item->>'registroId')::bigint,'eventoId',evento,
            'atual',ambulatorio.auditoria_envelope(valor,c.tipo_sql)));
        END IF;
      END LOOP;
    END IF;
    IF estado='apta' THEN
      SELECT count(DISTINCT p->>'alvoChave') INTO visitas FROM jsonb_array_elements(plano) p
        JOIN ambulatorio.auditoria_campo ac ON ac.campo_id=(p->>'campoId')::bigint
        WHERE p->>'operacao'='criar' AND ac.tabela_destino='atendimento';
      IF visitas>1 OR (visitas>0 AND atendimento IS NOT NULL) THEN
        estado:='conflito'; codigo:='revisao_visita_nova_inconsistente';
      END IF;
    END IF;
    IF estado='apta' THEN
      FOR alvo IN SELECT p->>'alvoChave' AS chave,ac.tabela_destino AS tabela,
          min(ac.coluna_pk) AS pk
        FROM jsonb_array_elements(plano) p JOIN ambulatorio.auditoria_campo ac
          ON ac.campo_id=(p->>'campoId')::bigint
        WHERE p->>'operacao'='criar' GROUP BY p->>'alvoChave',ac.tabela_destino LOOP
        IF alvo.tabela NOT IN ('atendimento','paciente_endereco','paciente_contato',
          'paciente_projeto_estudo','paciente_exame_complementar','tratamento_benzonidazol',
          'pendencia_atendimento','dados_clinicos_atendimento','diagnostico_chagas',
          'encaminhamento','acompanhamento_cuidado','evento_clinico','dispositivo_implantado',
          'notificacao','obito','tratamento_chagas')
          OR EXISTS(SELECT 1 FROM jsonb_array_elements(plano) p
            JOIN ambulatorio.auditoria_campo ac ON ac.campo_id=(p->>'campoId')::bigint
            WHERE p->>'alvoChave'=alvo.chave AND (ac.tabela_destino<>alvo.tabela
              OR p->>'operacao'<>'criar' OR p->>'categoria' NOT IN
                ('nova_visita','atualizacao_consolidada'))) THEN
          estado:='conflito'; codigo:='revisao_criacao_destino_nao_homologado'; EXIT;
        END IF;
        IF EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo ac
          WHERE ac.tabela_destino=alvo.tabela AND ac.captura_desde IS NOT NULL
            AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(plano) p
              WHERE p->>'alvoChave'=alvo.chave AND (p->>'campoId')::bigint=ac.campo_id)) THEN
          estado:='conflito'; codigo:='revisao_criacao_captura_incompleta'; EXIT;
        END IF;
        IF EXISTS(SELECT 1 FROM pg_attribute a
          WHERE a.attrelid=to_regclass('ambulatorio.'||alvo.tabela) AND a.attnum>0
            AND NOT a.attisdropped AND a.attnotnull AND NOT a.atthasdef
            AND a.attname NOT IN (alvo.pk,'paciente_id','atendimento_id')
            AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(plano) p
              JOIN ambulatorio.auditoria_campo ac ON ac.campo_id=(p->>'campoId')::bigint
              WHERE p->>'alvoChave'=alvo.chave AND ac.coluna_destino=a.attname
                AND p->'proposto'->>'estado'='valor')) THEN
          estado:='conflito'; codigo:='revisao_criacao_campos_obrigatorios'; EXIT;
        END IF;
        IF alvo.tabela='atendimento' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(plano) p
          JOIN ambulatorio.auditoria_campo ac ON ac.campo_id=(p->>'campoId')::bigint
          WHERE p->>'alvoChave'=alvo.chave AND ac.coluna_destino='data_atendimento'
            AND p->'proposto'->>'estado'='valor' AND p->'proposto'->>'precisao'='data_completa') THEN
          estado:='conflito'; codigo:='revisao_visita_exige_data_completa'; EXIT;
        END IF;
        IF alvo.tabela<>'atendimento' AND atendimento IS NULL AND visitas=0
          AND EXISTS(SELECT 1 FROM pg_attribute a
            WHERE a.attrelid=to_regclass('ambulatorio.'||alvo.tabela)
              AND a.attname='atendimento_id' AND a.attnotnull) THEN
          estado:='conflito'; codigo:='revisao_dependente_sem_atendimento'; EXIT;
        END IF;
        IF alvo.tabela IN ('paciente_exame_complementar','pendencia_atendimento')
          AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(plano) p
            JOIN ambulatorio.auditoria_campo ac ON ac.campo_id=(p->>'campoId')::bigint
            JOIN jsonb_array_elements(comparacao) x ON x->>'chave'=p->>'chaveSemantica'
              AND x->>'bloco'=p->>'blocoFuncional'
              AND (x->>'ocorrencia')::bigint=(p->>'ocorrencia')::bigint
            WHERE p->>'alvoChave'=alvo.chave AND ac.tabela_destino=alvo.tabela
              AND (x->>'alterado')::boolean) THEN
          estado:='conflito'; codigo:='revisao_ocorrencia_sem_identidade'; EXIT;
        END IF;
      END LOOP;
    END IF;
    SELECT count(*) FILTER(WHERE (x->>'alterado')::boolean) INTO alterados FROM jsonb_array_elements(comparacao) x;
    SELECT count(DISTINCT x->>'alvoChave') FILTER(WHERE x->>'operacao'='criar') INTO novos
      FROM jsonb_array_elements(plano) x;
    hash_plano:=encode(sha256(convert_to(jsonb_build_object('fonte',fonte,'versaoFonte',f.versao_controle,
      'base',lote_base,'manifesto',hash_manifesto,'transformacoes',hash_transformacoes,
      'linha',(linha-'snapshotSha256')||jsonb_build_object('campos',plano),
      'comparacao',comparacao,'eventos',eventos)::text,'UTF8')),'hex');
    snapshot_esperado:=linha->>'snapshotSha256';
    IF snapshot_esperado IS NOT NULL AND hash_plano<>snapshot_esperado THEN
      estado:='obsoleta'; codigo:='revisao_snapshot_obsoleto';
    END IF;
    IF estado='apta' THEN aptas:=aptas+1;
    ELSIF estado='bloqueada' THEN bloqueadas:=bloqueadas+1;
    ELSIF estado='obsoleta' THEN obsoletas:=obsoletas+1;
    ELSE conflitos:=conflitos+1; END IF;
    respostas:=respostas||jsonb_build_array(jsonb_build_object('numeroLinha',numero,
      'resultado',estado,'codigo',codigo,'camposAlterados',alterados,'alvosNovos',novos,
      'snapshotSha256',hash_plano));
    evento:=NULL;
  END LOOP;
  RETURN jsonb_build_object('resultado',CASE WHEN conflitos>0 THEN 'conflito'
    WHEN obsoletas>0 THEN 'obsoleta'
    WHEN aptas=0 THEN 'sem_aplicacao' ELSE 'apta' END,'codigo','revisao_simulacao_sem_persistencia',
    'fonteId',fonte::text,'loteBaseId',lote_base::text,'versaoFonte',f.versao_controle::text,
    'manifestoSha256',hash_manifesto,'transformacoesSha256',hash_transformacoes,
    'quantidadeLinhas',total,'aptas',aptas,'bloqueadas',bloqueadas,'conflitos',conflitos,
    'obsoletas',obsoletas,
    'linhas',respostas);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR invalid_datetime_format THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_proposta_invalida';
END $$;

GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_comparar_brutos_virtuais(jsonb,jsonb) OWNER TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_simular_proposta(bigint,bigint,bigint,bigint,text,text,jsonb)
  OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_comparar_brutos_virtuais(jsonb,jsonb),
  revisao_simular_proposta(bigint,bigint,bigint,bigint,text,text,jsonb)
  FROM PUBLIC,ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado,
    ambulatorio_revisao_gestor,ambulatorio_revisao_servico;
GRANT EXECUTE ON FUNCTION revisao_comparar_brutos_virtuais(jsonb,jsonb) TO ambulatorio_revisao_owner;
GRANT EXECUTE ON FUNCTION revisao_simular_proposta(bigint,bigint,bigint,bigint,text,text,jsonb)
  TO ambulatorio_revisao_servico;
COMMIT;

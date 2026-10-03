-- Objetivo: publicar decisao e plano atomicos com identidade e hash do servidor.
-- Impacto: somente metadados; conserva as barreiras de captura/executor existentes.
-- Nao concede membros, nao habilita revisao HTTP e nao altera fatos clinicos.
-- Reversao: revogar EXECUTE em nova migration, preservando decisoes publicadas.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

GRANT SELECT ON importacao_revisao,importacao_revisao_decisao,importacao_revisao_campo,
  auditoria_campo,auditoria_campo_evento TO ambulatorio_revisao_owner;
GRANT INSERT ON importacao_revisao_decisao,importacao_revisao_campo TO ambulatorio_revisao_owner;
GRANT UPDATE(estado) ON importacao_revisao TO ambulatorio_revisao_owner;
GRANT UPDATE(versao_decisao) ON importacao_revisao_decisao TO ambulatorio_revisao_owner;
GRANT USAGE ON SEQUENCE importacao_revisao_decisao_decisao_id_seq,
  importacao_revisao_campo_revisao_campo_id_seq TO ambulatorio_revisao_owner;
GRANT EXECUTE ON FUNCTION auditoria_envelope(jsonb,text,text),revisao_alvo_paciente(text,bigint)
  TO ambulatorio_revisao_owner;
DO $$ DECLARE tabela text; pk text;
BEGIN
  FOREACH tabela IN ARRAY ARRAY['paciente','atendimento','paciente_endereco','paciente_contato',
    'paciente_projeto_estudo','paciente_exame_complementar','tratamento_benzonidazol',
    'pendencia_atendimento','dados_clinicos_atendimento','diagnostico_chagas','encaminhamento',
    'acompanhamento_cuidado','evento_clinico','dispositivo_implantado','notificacao','obito','tratamento_chagas'] LOOP
    SELECT a.attname INTO STRICT pk FROM pg_index i JOIN pg_attribute a
      ON a.attrelid=i.indrelid AND a.attnum=i.indkey[0]
      WHERE i.indrelid=to_regclass('ambulatorio.'||tabela) AND i.indisprimary AND i.indnkeyatts=1;
    EXECUTE format('GRANT SELECT ON ambulatorio.%I TO ambulatorio_revisao_owner',tabela);
    -- UPDATE da PK serve apenas para FOR SHARE; funcoes nao fazem DML clinico.
    EXECUTE format('GRANT UPDATE(%I) ON ambulatorio.%I TO ambulatorio_revisao_owner',pk,tabela);
  END LOOP;
END $$;

CREATE FUNCTION revisao_publicar_decisao(
  revisao bigint,linha_revisada bigint,linha_base bigint,paciente bigint,atendimento_base bigint,
  autorizacao bigint,resultado_decisao text,justificativa_decisao text,campos jsonb,decisao_anterior bigint DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint; fonte bigint; r ambulatorio.importacao_revisao; f ambulatorio.importacao_fonte;
  au ambulatorio.importacao_revisao_autorizacao; anterior ambulatorio.importacao_revisao_decisao;
  base_lote ambulatorio.importacao_lote; revisado_lote ambulatorio.importacao_lote;
  c ambulatorio.auditoria_campo; item jsonb; plano jsonb:='[]'; atual jsonb; valor jsonb;
  registro bigint; evento bigint; cobertura text; id bigint; versao bigint; hash_plano text;
BEGIN
  IF NOT pg_has_role(session_user,'ambulatorio_revisao_servico','MEMBER') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_servico_nao_autorizado';
  END IF;
  ator:=ambulatorio.revisao_ator_autenticado();
  SELECT fonte_id INTO fonte FROM ambulatorio.importacao_revisao WHERE revisao_id=revisao;
  IF fonte IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_ausente'; END IF;
  SELECT * INTO STRICT f FROM ambulatorio.importacao_fonte WHERE fonte_id=fonte FOR UPDATE;
  SELECT * INTO STRICT r FROM ambulatorio.importacao_revisao WHERE revisao_id=revisao FOR UPDATE;
  SELECT * INTO au FROM ambulatorio.importacao_revisao_autorizacao WHERE autorizacao_id=autorizacao FOR UPDATE;
  IF au.autorizacao_id IS NULL OR au.fonte_id<>fonte OR au.usuario_id<>ator
    OR au.revogada_em IS NOT NULL OR (au.valida_ate IS NOT NULL AND au.valida_ate<=clock_timestamp()) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_autorizacao_invalida';
  END IF;
  IF r.estado<>'preparada' OR r.versao_fonte_esperada<>f.versao_controle
    OR r.revisao_base_id IS DISTINCT FROM f.revisao_corrente_id THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_base_obsoleta';
  END IF;
  SELECT * INTO STRICT base_lote FROM ambulatorio.importacao_lote WHERE importacao_lote_id=r.lote_base_id;
  SELECT * INTO STRICT revisado_lote FROM ambulatorio.importacao_lote WHERE importacao_lote_id=r.lote_revisado_id;
  IF base_lote.manifesto_sha256 IS DISTINCT FROM r.manifesto_base_sha256
    OR revisado_lote.manifesto_sha256 IS DISTINCT FROM r.manifesto_revisado_sha256
    OR revisado_lote.importador_versao IS DISTINCT FROM r.importador_versao
    OR revisado_lote.revisao_git IS DISTINCT FROM r.revisao_git THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_metadados_tecnicos_incompativeis';
  END IF;
  IF resultado_decisao NOT IN ('autorizar','bloquear') OR justificativa_decisao IS NULL
    OR btrim(justificativa_decisao)='' OR jsonb_typeof(campos) IS DISTINCT FROM 'array'
    OR jsonb_array_length(campos)>256 THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_plano_invalido';
  END IF;
  SELECT d.* INTO anterior FROM ambulatorio.importacao_revisao_decisao d
    WHERE d.revisao_id=revisao AND d.linha_revisada_id=linha_revisada
      AND NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_decisao n WHERE n.decisao_anterior_id=d.decisao_id)
    FOR UPDATE;
  IF anterior.decisao_id IS DISTINCT FROM decisao_anterior THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_versao_decisao_obsoleta';
  END IF;
  versao:=COALESCE(anterior.versao_decisao,0)+1;
  IF paciente IS NOT NULL THEN
    PERFORM paciente_id FROM ambulatorio.paciente WHERE paciente_id=paciente FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_paciente_ausente'; END IF;
  END IF;
  IF linha_base IS NOT NULL AND paciente IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM ambulatorio.importacao_registro WHERE importacao_linha_id=linha_base
      AND tabela_destino='paciente' AND registro_id=paciente) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_ancora_sem_proveniencia';
  END IF;
  IF atendimento_base IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM ambulatorio.importacao_registro WHERE importacao_linha_id=linha_base
      AND tabela_destino='atendimento' AND registro_id=atendimento_base) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_ancora_sem_proveniencia';
  END IF;
  -- IDs de campo e allowlist fisica controlam os identificadores SQL.
  FOR item IN SELECT value FROM jsonb_array_elements(campos)
    ORDER BY (value->>'campoId')::bigint,value->>'alvoChave' LOOP
    IF jsonb_typeof(item)<>'object' OR (item-ARRAY['campoId','alvoChave','registroId','chaveSemantica',
      'blocoFuncional','ocorrencia','categoria','operacao','base','proposto'])<>'{}'::jsonb THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_campo_invalido';
    END IF;
    SELECT * INTO c FROM ambulatorio.auditoria_campo WHERE campo_id=(item->>'campoId')::bigint;
    IF c.campo_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_campo_fora_catalogo'; END IF;
    registro:=(item->>'registroId')::bigint; evento:=NULL; cobertura:='desconhecida';
    IF registro IS NOT NULL THEN
      IF ambulatorio.revisao_alvo_paciente(c.tabela_destino,registro) IS DISTINCT FROM paciente THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_paciente_incompativel';
      END IF;
      EXECUTE format('SELECT to_jsonb(%I) FROM ambulatorio.%I WHERE %I=$1 FOR SHARE',
        c.coluna_destino,c.tabela_destino,c.coluna_pk) INTO valor USING registro;
      atual:=ambulatorio.auditoria_envelope(valor,c.tipo_sql);
      SELECT evento_id INTO evento FROM ambulatorio.auditoria_campo_evento
        WHERE campo_id=c.campo_id AND registro_id=registro ORDER BY versao_campo DESC LIMIT 1;
      IF evento IS NOT NULL THEN cobertura:='posterior_base'; END IF;
    ELSE
      atual:=ambulatorio.auditoria_envelope(NULL,c.tipo_sql,'alvo_ausente'); cobertura:='alvo_novo';
    END IF;
    IF item->>'operacao' IN ('definir','anular') THEN
      -- Aceite de cobertura desde a base ainda nao homologado: preservar barreira.
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_captura_nao_habilitada';
    END IF;
    IF item->>'operacao'='associar' AND (
      item->'proposto'->>'estado'<>'valor' OR (item->'proposto'->'valor') IS DISTINCT FROM atual->'valor'
      OR item->'proposto'->>'tipo_sql' IS DISTINCT FROM c.tipo_sql) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_associacao_divergente';
    END IF;
    IF item->>'operacao'='associar' AND NOT EXISTS(
      SELECT 1 FROM ambulatorio.importacao_registro WHERE importacao_linha_id=linha_base
        AND tabela_destino=c.tabela_destino AND registro_id=registro) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_alvo_sem_proveniencia';
    END IF;
    plano:=plano||jsonb_build_array(item||jsonb_build_object('atualAvaliado',atual,
      'ultimoEventoAvaliadoId',evento,'coberturaHistorica',cobertura));
  END LOOP;
  hash_plano:=encode(sha256(convert_to(jsonb_build_object('serializacao','plano-temporal/v1',
    'revisaoId',revisao,'linhaRevisadaId',linha_revisada,'linhaBaseId',linha_base,'pacienteId',paciente,
    'atendimentoBaseId',atendimento_base,'autorizacaoId',autorizacao,'atorId',ator,'resultado',resultado_decisao,
    'justificativa',justificativa_decisao,'versaoDecisao',versao,'decisaoAnteriorId',decisao_anterior,
    'contrato',r.contrato_versao,'manifestoBase',r.manifesto_base_sha256,'manifestoRevisado',r.manifesto_revisado_sha256,
    'transformacoes',r.transformacoes_versao,'importador',r.importador_versao,'revisaoGit',r.revisao_git,
    'versaoFonte',r.versao_fonte_esperada,'campos',plano)::text,'UTF8')),'hex');
  SET CONSTRAINTS ambulatorio.validar_revisao DEFERRED;
  INSERT INTO ambulatorio.importacao_revisao_decisao(revisao_id,linha_revisada_id,linha_base_id,paciente_id,
    atendimento_base_id,versao_decisao,decisao_anterior_id,resultado,autorizacao_id,decidida_por_usuario_id,
    justificativa,plano_sha256) VALUES(revisao,linha_revisada,linha_base,paciente,atendimento_base,versao,
    decisao_anterior,resultado_decisao,autorizacao,ator,justificativa_decisao,hash_plano) RETURNING decisao_id INTO id;
  FOR item IN SELECT value FROM jsonb_array_elements(plano) LOOP
    INSERT INTO ambulatorio.importacao_revisao_campo(decisao_id,campo_id,alvo_chave,registro_id,chave_semantica,
      bloco_funcional,ocorrencia,categoria,operacao,base,atual_avaliado,proposto,ultimo_evento_avaliado_id,cobertura_historica)
      VALUES(id,(item->>'campoId')::bigint,item->>'alvoChave',(item->>'registroId')::bigint,item->>'chaveSemantica',
        item->>'blocoFuncional',(item->>'ocorrencia')::bigint,item->>'categoria',item->>'operacao',item->'base',
        item->'atualAvaliado',item->'proposto',(item->>'ultimoEventoAvaliadoId')::bigint,item->>'coberturaHistorica');
  END LOOP;
  SET CONSTRAINTS ambulatorio.validar_revisao IMMEDIATE;
  RETURN id;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_campo_invalido';
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_publicar_decisao(bigint,bigint,bigint,bigint,bigint,bigint,text,text,jsonb,bigint)
  OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_publicar_decisao(bigint,bigint,bigint,bigint,bigint,bigint,text,text,jsonb,bigint)
  FROM PUBLIC,ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado,ambulatorio_revisao_gestor;
GRANT EXECUTE ON FUNCTION revisao_publicar_decisao(bigint,bigint,bigint,bigint,bigint,bigint,text,text,jsonb,bigint)
  TO ambulatorio_revisao_servico;
COMMIT;

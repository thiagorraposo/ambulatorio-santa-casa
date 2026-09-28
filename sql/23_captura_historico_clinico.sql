-- Objetivo: captura transacional de campos explicitamente habilitados da ADR-022.
-- Impacto: instala gatilhos nos destinos homologados; catalogo nao e habilitado
-- automaticamente e executor de revisao permanece fechado. Nenhum backfill.
-- Reversao: nova migration bloqueando novas revisoes; preservar eventos e gatilhos
-- dos campos ja habilitados. Desativar captura invalida cobertura desde a base.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='ambulatorio_auditoria_owner') THEN
    CREATE ROLE ambulatorio_auditoria_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END $$;
GRANT USAGE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
GRANT SELECT ON auditoria_campo, auditoria_campo_evento, importacao_registro,
  importacao_revisao_campo, importacao_revisao_alvo, importacao_revisao_aplicacao,
  importacao_revisao_decisao TO ambulatorio_auditoria_owner;
GRANT INSERT ON auditoria_campo_evento TO ambulatorio_auditoria_owner;
GRANT USAGE ON SEQUENCE auditoria_campo_evento_evento_id_seq TO ambulatorio_auditoria_owner;
GRANT EXECUTE ON FUNCTION revisao_envelope_valido(jsonb,boolean), revisao_alvo_paciente(text,bigint)
  TO ambulatorio_auditoria_owner;

ALTER TABLE auditoria_campo DROP CONSTRAINT chk_captura_ainda_desabilitada;

CREATE FUNCTION auditoria_envelope(valor jsonb,tipo text,estado text DEFAULT NULL) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
  SELECT jsonb_build_object('estado',COALESCE(estado,CASE WHEN valor IS NULL OR valor='null'::jsonb THEN 'nulo' ELSE 'valor' END),
    'tipo_sql',tipo,'valor',COALESCE(valor,'null'::jsonb),'serializacao_versao','v1',
    'precisao',CASE WHEN tipo='date' THEN 'data_completa' WHEN tipo LIKE 'timestamp%' THEN 'instante' ELSE 'nao_temporal' END)
$$;

CREATE FUNCTION auditoria_validar_evento() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ev ambulatorio.auditoria_campo_evento; anterior ambulatorio.auditoria_campo_evento;
  c ambulatorio.auditoria_campo; valor jsonb;
BEGIN
  SELECT * INTO STRICT ev FROM ambulatorio.auditoria_campo_evento WHERE evento_id=NEW.evento_id;
  SELECT * INTO STRICT c FROM ambulatorio.auditoria_campo WHERE campo_id=ev.campo_id;
  PERFORM ambulatorio.revisao_alvo_paciente(c.tabela_destino,ev.registro_id);
  IF ev.antes->>'tipo_sql'<>c.tipo_sql OR ev.depois->>'tipo_sql'<>c.tipo_sql THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='auditoria_tipo_incompativel';
  END IF;
  IF ev.evento_anterior_id IS NOT NULL THEN
    SELECT * INTO STRICT anterior FROM ambulatorio.auditoria_campo_evento WHERE evento_id=ev.evento_anterior_id;
    IF anterior.campo_id<>ev.campo_id OR anterior.registro_id<>ev.registro_id
      OR anterior.versao_campo+1<>ev.versao_campo OR anterior.depois<>ev.antes THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='auditoria_cadeia_invalida';
    END IF;
  ELSIF ev.versao_campo<>1 OR ev.antes->>'estado' NOT IN ('alvo_ausente','desconhecido') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='auditoria_inicio_invalido';
  END IF;
  IF ev.origem='marco_atual' THEN
    IF ev.versao_campo<>1 OR ev.antes->>'estado'<>'desconhecido' THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='auditoria_marco_invalido';
    END IF;
  ELSIF c.captura_desde IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='auditoria_captura_inativa';
  END IF;
  IF ev.origem='importacao' AND NOT EXISTS (
    SELECT 1 FROM ambulatorio.importacao_registro WHERE importacao_linha_id=ev.importacao_linha_id
      AND tabela_destino=c.tabela_destino AND registro_id=ev.registro_id) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='auditoria_importacao_sem_proveniencia';
  END IF;
  IF ev.origem='revisao' AND NOT EXISTS (
    SELECT 1 FROM ambulatorio.importacao_revisao_alvo a
      JOIN ambulatorio.importacao_revisao_aplicacao ap USING(aplicacao_id)
      JOIN ambulatorio.importacao_revisao_campo cp ON cp.revisao_campo_id=ev.revisao_campo_id
    WHERE a.revisao_alvo_id=ev.revisao_alvo_id AND a.tabela_destino=c.tabela_destino
      AND a.registro_id=ev.registro_id AND cp.campo_id=c.campo_id AND cp.decisao_id=ap.decisao_id
      AND ap.resultado='aplicada') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='auditoria_revisao_sem_aplicacao';
  END IF;
  -- A ultima evidência precisa corresponder ao valor efetivo no commit.
  IF NOT EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo_evento WHERE evento_anterior_id=ev.evento_id) THEN
    EXECUTE format('SELECT to_jsonb(%I) FROM ambulatorio.%I WHERE %I=$1',c.coluna_destino,c.tabela_destino,c.coluna_pk)
      INTO valor USING ev.registro_id;
    IF ev.depois<>ambulatorio.auditoria_envelope(valor,c.tipo_sql) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='auditoria_valor_final_divergente';
    END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE FUNCTION auditoria_capturar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE c ambulatorio.auditoria_campo; ultimo ambulatorio.auditoria_campo_evento;
  registro bigint; antes jsonb; depois jsonb; versao bigint; predecessor bigint;
BEGIN
  IF TG_OP='TRUNCATE' THEN
    IF EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo c JOIN ambulatorio.auditoria_campo_evento e USING(campo_id)
      WHERE c.tabela_destino=TG_TABLE_NAME) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='auditoria_alvo_protegido';
    END IF;
    RETURN NULL;
  END IF;
  FOR c IN SELECT * FROM ambulatorio.auditoria_campo WHERE tabela_destino=TG_TABLE_NAME AND captura_desde IS NOT NULL ORDER BY campo_id LOOP
    registro:=COALESCE((to_jsonb(NEW)->>c.coluna_pk)::bigint,(to_jsonb(OLD)->>c.coluna_pk)::bigint);
    IF TG_OP='DELETE' THEN
      IF EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo_evento WHERE campo_id=c.campo_id AND registro_id=registro)
         OR EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao_campo WHERE campo_id=c.campo_id AND registro_id=registro) THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='auditoria_alvo_protegido';
      END IF;
      CONTINUE;
    END IF;
    IF TG_OP='UPDATE' AND (to_jsonb(OLD)->c.coluna_pk) IS DISTINCT FROM (to_jsonb(NEW)->c.coluna_pk) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='auditoria_identidade_imutavel';
    END IF;
    antes:=ambulatorio.auditoria_envelope(to_jsonb(OLD)->c.coluna_destino,c.tipo_sql,
      CASE WHEN TG_OP='INSERT' THEN 'alvo_ausente' ELSE NULL END);
    depois:=ambulatorio.auditoria_envelope(to_jsonb(NEW)->c.coluna_destino,c.tipo_sql);
    IF TG_OP='UPDATE' AND antes=depois THEN CONTINUE; END IF;
    -- UPDATE ja detem lock da linha; INSERT detem sua identidade ate o commit.
    SELECT * INTO ultimo FROM ambulatorio.auditoria_campo_evento
      WHERE campo_id=c.campo_id AND registro_id=registro ORDER BY versao_campo DESC LIMIT 1;
    predecessor:=ultimo.evento_id; versao:=COALESCE(ultimo.versao_campo,0)+1;
    IF predecessor IS NULL AND TG_OP='UPDATE' THEN
      INSERT INTO ambulatorio.auditoria_campo_evento(campo_id,registro_id,versao_campo,origem,antes,depois)
        VALUES(c.campo_id,registro,1,'marco_atual',ambulatorio.auditoria_envelope(NULL,c.tipo_sql,'desconhecido'),antes)
        RETURNING evento_id INTO predecessor;
      versao:=2;
    ELSIF predecessor IS NOT NULL AND ultimo.depois<>antes THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='auditoria_descontinuidade';
    END IF;
    INSERT INTO ambulatorio.auditoria_campo_evento(campo_id,registro_id,versao_campo,evento_anterior_id,origem,antes,depois)
      VALUES(c.campo_id,registro,versao,predecessor,'operacao_tecnica',antes,depois);
  END LOOP;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

-- Gatilhos nao podem confiar em GUC livre para atribuir identidade ou origem.
-- Neste incremento a autoria humana e desconhecida; o principal DB e preservado.
CREATE FUNCTION auditoria_proteger_evento() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_evidencia_imutavel'; END IF;
  IF NEW.origem<>'marco_atual' AND (current_user<>'ambulatorio_auditoria_owner' OR pg_trigger_depth()<2) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='auditoria_origem_nao_confiavel';
  END IF;
  NEW.ocorrido_em:=clock_timestamp(); NEW.principal_db:=session_user;
  RETURN NEW;
END $$;

DROP TRIGGER proteger_revisao ON auditoria_campo_evento;
CREATE TRIGGER proteger_revisao BEFORE INSERT OR UPDATE OR DELETE ON auditoria_campo_evento
  FOR EACH ROW EXECUTE FUNCTION auditoria_proteger_evento();
DROP TRIGGER validar_revisao ON auditoria_campo_evento;
CREATE CONSTRAINT TRIGGER validar_revisao AFTER INSERT OR UPDATE ON auditoria_campo_evento
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION auditoria_validar_evento();

DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['paciente','atendimento','paciente_endereco','paciente_contato',
    'paciente_projeto_estudo','paciente_exame_complementar','tratamento_benzonidazol',
    'pendencia_atendimento','dados_clinicos_atendimento','diagnostico_chagas','encaminhamento',
    'acompanhamento_cuidado','evento_clinico','dispositivo_implantado','notificacao','obito','tratamento_chagas'] LOOP
    EXECUTE format('GRANT SELECT ON ambulatorio.%I TO ambulatorio_auditoria_owner',t);
    EXECUTE format('CREATE TRIGGER auditoria_captura AFTER INSERT OR UPDATE ON ambulatorio.%I FOR EACH ROW EXECUTE FUNCTION ambulatorio.auditoria_capturar()',t);
    EXECUTE format('CREATE TRIGGER auditoria_protecao BEFORE DELETE ON ambulatorio.%I FOR EACH ROW EXECUTE FUNCTION ambulatorio.auditoria_capturar()',t);
    EXECUTE format('CREATE TRIGGER auditoria_protecao_truncate BEFORE TRUNCATE ON ambulatorio.%I FOR EACH STATEMENT EXECUTE FUNCTION ambulatorio.auditoria_capturar()',t);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION auditoria_envelope(jsonb,text,text) TO ambulatorio_auditoria_owner;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION auditoria_capturar() OWNER TO ambulatorio_auditoria_owner;
ALTER FUNCTION auditoria_validar_evento() OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION auditoria_envelope(jsonb,text,text),auditoria_capturar(),auditoria_validar_evento(),auditoria_proteger_evento()
  FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao;
COMMIT;

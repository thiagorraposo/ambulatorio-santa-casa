-- Objetivo: criar entradas específicas para aplicação, diagnóstico e encerramento.
-- Impacto: mantém executor interno e todas as entradas SEM EXECUTE operacional.
-- A homologação HTTP concede estas entradas somente em seu banco descartável.
-- Ativação futura exige migration própria após o aceite F01–F16/T01–T18.
-- Reversão: preservar rotinas/evidências e negar novas concessões de execução.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE FUNCTION revisao_aplicar_aprovada(decisao bigint,autorizacao bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF NOT pg_has_role(session_user,'ambulatorio_revisao_servico','MEMBER')
    OR NOT pg_has_role(session_user,'ambulatorio_servico_autenticado','MEMBER') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_servico_nao_autorizado'; END IF;
  PERFORM ambulatorio.revisao_ator_autenticado();
  RETURN ambulatorio.revisao_aplicar_decisao_interna(decisao,autorizacao);
END $$;
CREATE FUNCTION revisao_finalizar_aprovada(revisao bigint,autorizacao bigint,acao text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF NOT pg_has_role(session_user,'ambulatorio_revisao_servico','MEMBER')
    OR NOT pg_has_role(session_user,'ambulatorio_servico_autenticado','MEMBER') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_servico_nao_autorizado'; END IF;
  PERFORM ambulatorio.revisao_ator_autenticado();
  RETURN ambulatorio.revisao_terminar_interna(revisao,autorizacao,acao);
END $$;
CREATE FUNCTION revisao_diagnosticar_falha(decisao bigint,autorizacao bigint,estado_sql text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF NOT pg_has_role(session_user,'ambulatorio_revisao_servico','MEMBER')
    OR NOT pg_has_role(session_user,'ambulatorio_servico_autenticado','MEMBER') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_servico_nao_autorizado'; END IF;
  PERFORM ambulatorio.revisao_ator_autenticado();
  RETURN ambulatorio.revisao_registrar_falha_interna(decisao,autorizacao,estado_sql);
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_aplicar_aprovada(bigint,bigint) OWNER TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_finalizar_aprovada(bigint,bigint,text) OWNER TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_diagnosticar_falha(bigint,bigint,text) OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_aplicar_aprovada(bigint,bigint),
  revisao_finalizar_aprovada(bigint,bigint,text),revisao_diagnosticar_falha(bigint,bigint,text)
  FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
    ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
COMMIT;

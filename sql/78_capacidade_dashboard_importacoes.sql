-- Objetivo: exigir capacidade nominal para o indicador de importações (P-05/17 e P-09/26).
-- Impacto: nenhuma concessão automática por perfil; não altera endpoints legados.
-- Reversão: migration posterior pode desativar a projeção; preservar histórico nominal.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE TABLE dashboard_importacao_leitor (
  dashboard_importacao_leitor_id bigserial PRIMARY KEY,
  usuario_id bigint NOT NULL REFERENCES usuario_aplicacao(usuario_id) ON DELETE RESTRICT,
  provisionado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  provisionado_por_principal text NOT NULL DEFAULT session_user CHECK (btrim(provisionado_por_principal)<>''),
  revogado_em timestamptz,
  revogado_por_principal text,
  CHECK ((revogado_em IS NULL)=(revogado_por_principal IS NULL)),
  CHECK (revogado_por_principal IS NULL OR btrim(revogado_por_principal)<>'')
);
CREATE UNIQUE INDEX uq_dashboard_importacao_leitor_ativo
  ON dashboard_importacao_leitor(usuario_id) WHERE revogado_em IS NULL;
COMMENT ON TABLE dashboard_importacao_leitor IS
  'Consulta de indicadores de importação provisionada externamente; não concede acesso a lotes nem escrita/gestão/revisão.';

CREATE FUNCTION dashboard_proteger_importacao_leitor() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.revogado_em IS NULL AND NEW.revogado_em IS NOT NULL
    AND (to_jsonb(NEW)-ARRAY['revogado_em','revogado_por_principal'])
      =(to_jsonb(OLD)-ARRAY['revogado_em','revogado_por_principal']) THEN
    NEW.revogado_em:=clock_timestamp();
    RETURN NEW;
  END IF;
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='dashboard_capacidade_historico_imutavel';
END $$;
CREATE TRIGGER dashboard_importacao_leitor_imutavel
  BEFORE UPDATE OR DELETE ON dashboard_importacao_leitor
  FOR EACH ROW EXECUTE FUNCTION dashboard_proteger_importacao_leitor();
CREATE TRIGGER dashboard_importacao_leitor_sem_truncate
  BEFORE TRUNCATE ON dashboard_importacao_leitor
  FOR EACH STATEMENT EXECUTE FUNCTION dashboard_proteger_importacao_leitor();

REVOKE ALL ON dashboard_importacao_leitor,dashboard_importacao_leitor_dashboard_importacao_leitor_id_seq
  FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
    ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT SELECT ON dashboard_importacao_leitor TO ambulatorio_auditoria_owner;

CREATE FUNCTION dashboard_pode_consultar_importacoes() RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF NOT pg_has_role(session_user,'ambulatorio_aplicacao','MEMBER') THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM ambulatorio.auditoria_contexto_transacao c
    JOIN ambulatorio.usuario_aplicacao u ON u.usuario_id=c.ator_usuario_id AND u.ativo
    JOIN ambulatorio.dashboard_importacao_leitor g ON g.usuario_id=u.usuario_id AND g.revogado_em IS NULL
    WHERE c.transacao_id=pg_current_xact_id_if_assigned()
      AND c.principal_db=session_user AND c.origem='aplicacao'
  );
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION dashboard_pode_consultar_importacoes() OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION dashboard_pode_consultar_importacoes() FROM PUBLIC,
  ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
  ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT EXECUTE ON FUNCTION dashboard_pode_consultar_importacoes() TO ambulatorio_aplicacao;
COMMENT ON FUNCTION dashboard_pode_consultar_importacoes() IS
  'Capacidade nominal ativa do ator no contexto autenticado da transação; perfil não implica concessão.';
COMMIT;

-- Objetivo: registrar exportações CSV autorizadas do dashboard sem conteúdo clínico.
-- Impacto: ledger append-only; sem concessão de escopo ou capacidade clínica/importação.
-- Reversão: desativar a rota em versão posterior, preservando o ledger de auditoria.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE TABLE dashboard_exportacao_evento (
  exportacao_id bigserial PRIMARY KEY,
  transacao_id xid8 NOT NULL REFERENCES auditoria_contexto_transacao(transacao_id) ON DELETE RESTRICT,
  ator_usuario_id bigint NOT NULL REFERENCES usuario_aplicacao(usuario_id) ON DELETE RESTRICT,
  principal_db text NOT NULL,
  exportado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  filtros jsonb NOT NULL CHECK (jsonb_typeof(filtros)='object'),
  ordenacao text NOT NULL CHECK (ordenacao IN ('data_desc','data_asc','nome_asc')),
  quantidade integer NOT NULL CHECK (quantidade BETWEEN 0 AND 5000)
);
COMMENT ON TABLE dashboard_exportacao_evento IS
  'CSV de atendimentos do dashboard: ator/contexto confiáveis, filtros minimizados, ordem e volume. Sem conteúdo dos registros ou termos nominais de busca.';
CREATE FUNCTION dashboard_proteger_exportacao_evento() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='dashboard_exportacao_historico_imutavel';
END $$;
CREATE TRIGGER dashboard_exportacao_evento_imutavel
  BEFORE UPDATE OR DELETE ON dashboard_exportacao_evento
  FOR EACH ROW EXECUTE FUNCTION dashboard_proteger_exportacao_evento();
CREATE TRIGGER dashboard_exportacao_evento_sem_truncate
  BEFORE TRUNCATE ON dashboard_exportacao_evento
  FOR EACH STATEMENT EXECUTE FUNCTION dashboard_proteger_exportacao_evento();
REVOKE ALL ON dashboard_exportacao_evento,dashboard_exportacao_evento_exportacao_id_seq
  FROM PUBLIC,ambulatorio_aplicacao,ambulatorio_servico_autenticado,ambulatorio_importador,
    ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT SELECT,INSERT ON dashboard_exportacao_evento TO ambulatorio_auditoria_owner;
GRANT USAGE ON SEQUENCE dashboard_exportacao_evento_exportacao_id_seq TO ambulatorio_auditoria_owner;

CREATE FUNCTION dashboard_registrar_exportacao(filtros jsonb,ordenacao text,quantidade integer) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE contexto ambulatorio.auditoria_contexto_transacao; evento bigint;
BEGIN
  IF NOT pg_has_role(session_user,'ambulatorio_aplicacao','MEMBER') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='dashboard_exportacao_contexto_invalido';
  END IF;
  SELECT c.* INTO contexto FROM ambulatorio.auditoria_contexto_transacao c
    JOIN ambulatorio.usuario_aplicacao u ON u.usuario_id=c.ator_usuario_id AND u.ativo
    WHERE c.transacao_id=pg_current_xact_id_if_assigned()
      AND c.principal_db=session_user AND c.origem='aplicacao';
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='dashboard_exportacao_contexto_invalido';
  END IF;
  IF filtros IS NULL OR jsonb_typeof(filtros)<>'object'
    OR (filtros - ARRAY['inicio','fim','pacienteId','nomeFiltrado','sexo','projetoId','statusPendencia'])<>'{}'::jsonb THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='dashboard_exportacao_filtros_invalidos';
  END IF;
  INSERT INTO ambulatorio.dashboard_exportacao_evento(transacao_id,ator_usuario_id,principal_db,filtros,ordenacao,quantidade)
    VALUES(contexto.transacao_id,contexto.ator_usuario_id,session_user,filtros,ordenacao,quantidade)
    RETURNING exportacao_id INTO evento;
  RETURN evento;
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION dashboard_registrar_exportacao(jsonb,text,integer) OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION dashboard_registrar_exportacao(jsonb,text,integer) FROM PUBLIC,
  ambulatorio_aplicacao,ambulatorio_servico_autenticado,ambulatorio_importador,
  ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT EXECUTE ON FUNCTION dashboard_registrar_exportacao(jsonb,text,integer) TO ambulatorio_aplicacao;
COMMIT;

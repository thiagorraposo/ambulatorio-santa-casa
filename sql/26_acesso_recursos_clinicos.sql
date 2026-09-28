-- Objetivo: mecanismo de vinculo explicito usuario/paciente e versao de cadastro.
-- Impacto: nenhuma concessao automatica; politica funcional depende de configuracao
-- e decisao registrada. Login confiavel so e provisionado por operador/teste.
-- Reversao: desabilitar endpoints por configuracao e nova migration restritiva.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
CREATE TABLE acesso_paciente (
  paciente_id bigint NOT NULL REFERENCES paciente ON DELETE RESTRICT,
  usuario_id bigint NOT NULL REFERENCES usuario_aplicacao ON DELETE RESTRICT,
  pode_editar boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  concedido_por_usuario_id bigint NOT NULL REFERENCES usuario_aplicacao ON DELETE RESTRICT,
  atualizado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(paciente_id,usuario_id)
);
CREATE INDEX idx_acesso_usuario ON acesso_paciente(usuario_id,paciente_id) WHERE ativo;
CREATE TABLE acesso_paciente_evento (
  acesso_paciente_evento_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  paciente_id bigint NOT NULL REFERENCES paciente ON DELETE RESTRICT,
  usuario_id bigint NOT NULL REFERENCES usuario_aplicacao ON DELETE RESTRICT,
  ator_usuario_id bigint NOT NULL REFERENCES usuario_aplicacao ON DELETE RESTRICT,
  ativo boolean NOT NULL,
  pode_editar boolean NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON acesso_paciente,acesso_paciente_evento FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao;
REVOKE ALL ON SEQUENCE acesso_paciente_evento_acesso_paciente_evento_id_seq FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao;
GRANT SELECT ON acesso_paciente TO ambulatorio_aplicacao;
-- UPDATE permite SELECT FOR SHARE para serializar revogacao e escrita; gatilho
-- abaixo recusa mutacao pela role operacional. Concessoes usam funcao restrita.
GRANT UPDATE ON acesso_paciente TO ambulatorio_aplicacao;
GRANT SELECT,INSERT,UPDATE ON acesso_paciente TO ambulatorio_auditoria_owner;
GRANT SELECT,INSERT ON acesso_paciente_evento TO ambulatorio_auditoria_owner;
GRANT USAGE ON SEQUENCE acesso_paciente_evento_acesso_paciente_evento_id_seq TO ambulatorio_auditoria_owner;
GRANT UPDATE(usuario_id) ON usuario_aplicacao TO ambulatorio_auditoria_owner;

CREATE FUNCTION acesso_paciente_proteger() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF current_user IN ('ambulatorio_aplicacao','ambulatorio_importador','ambulatorio_servico_autenticado') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='acesso_mutacao_direta_proibida';
  END IF;
  IF TG_OP='DELETE' OR TG_OP='TRUNCATE' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='acesso_historico_protegido'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER acesso_protegido BEFORE INSERT OR UPDATE OR DELETE ON acesso_paciente
  FOR EACH ROW EXECUTE FUNCTION acesso_paciente_proteger();
CREATE TRIGGER acesso_evento_protegido BEFORE UPDATE OR DELETE ON acesso_paciente_evento
  FOR EACH ROW EXECUTE FUNCTION acesso_paciente_proteger();

CREATE FUNCTION definir_acesso_paciente(paciente bigint,usuario bigint,editar boolean,habilitado boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint;
BEGIN
  SELECT ator_usuario_id INTO ator FROM ambulatorio.auditoria_contexto_transacao
    WHERE transacao_id=pg_current_xact_id_if_assigned() AND origem='aplicacao' AND principal_db=session_user;
  PERFORM usuario_id FROM ambulatorio.usuario_aplicacao WHERE usuario_id=ator AND ativo AND perfil='administracao' FOR SHARE;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM ambulatorio.usuario_aplicacao WHERE usuario_id=usuario AND ativo) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='acesso_administracao_necessaria';
  END IF;
  IF editar IS NULL OR habilitado IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='acesso_parametro_obrigatorio'; END IF;
  INSERT INTO ambulatorio.acesso_paciente(paciente_id,usuario_id,pode_editar,ativo,concedido_por_usuario_id)
    VALUES(paciente,usuario,editar,habilitado,ator)
    ON CONFLICT(paciente_id,usuario_id) DO UPDATE SET pode_editar=EXCLUDED.pode_editar,ativo=EXCLUDED.ativo,
      concedido_por_usuario_id=ator,atualizado_em=clock_timestamp();
  INSERT INTO ambulatorio.acesso_paciente_evento(paciente_id,usuario_id,ator_usuario_id,pode_editar,ativo)
    VALUES(paciente,usuario,ator,editar,habilitado);
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION definir_acesso_paciente(bigint,bigint,boolean,boolean) OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION definir_acesso_paciente(bigint,bigint,boolean,boolean),acesso_paciente_proteger()
  FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao;
GRANT EXECUTE ON FUNCTION definir_acesso_paciente(bigint,bigint,boolean,boolean) TO ambulatorio_servico_autenticado;

ALTER TABLE paciente ADD COLUMN versao_registro bigint NOT NULL DEFAULT 1 CHECK(versao_registro>0);
ALTER TABLE atendimento ADD COLUMN versao_registro bigint NOT NULL DEFAULT 1 CHECK(versao_registro>0);
CREATE FUNCTION incrementar_versao_clinica() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  NEW.versao_registro:=OLD.versao_registro+1;
  NEW.atualizado_em:=CURRENT_TIMESTAMP;
  RETURN NEW;
END $$;
CREATE TRIGGER versao_clinica BEFORE UPDATE ON paciente FOR EACH ROW EXECUTE FUNCTION incrementar_versao_clinica();
CREATE TRIGGER versao_clinica BEFORE UPDATE ON atendimento FOR EACH ROW EXECUTE FUNCTION incrementar_versao_clinica();
REVOKE ALL ON FUNCTION incrementar_versao_clinica() FROM PUBLIC;
COMMIT;

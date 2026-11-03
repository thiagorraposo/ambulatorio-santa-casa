-- Objetivo: vinculo especifico/atomico ao cadastro por Edicao (decisoes M3 1–2).
-- Impacto: sem backfill ou acesso global; importacao e cadastro administrativo
-- nao concedem vinculo. Inativacao revoga vinculos; reativacao nao os restaura.
-- Reversao: desabilitar cadastro por capacidade e usar migration restritiva;
-- preservar pacientes, eventos e vinculos ja registrados.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

-- Operacao de infraestrutura pode inativar identidade sem ator de aplicacao.
-- Nesse caso guardar o principal real, sem atribuir a acao ao usuario alvo.
ALTER TABLE acesso_paciente_evento ALTER COLUMN ator_usuario_id DROP NOT NULL;
ALTER TABLE acesso_paciente_evento ADD COLUMN principal_db text;
ALTER TABLE acesso_paciente_evento ADD CONSTRAINT acesso_evento_autoria
  CHECK (ator_usuario_id IS NOT NULL OR principal_db IS NOT NULL);

CREATE FUNCTION vincular_cadastro_edicao() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint; perfil_ator text;
BEGIN
  SELECT ator_usuario_id INTO ator FROM ambulatorio.auditoria_contexto_transacao
    WHERE transacao_id=pg_current_xact_id_if_assigned() AND origem='aplicacao' AND principal_db=session_user;
  IF ator IS NULL THEN RETURN NEW; END IF;
  SELECT perfil INTO perfil_ator FROM ambulatorio.usuario_aplicacao
    WHERE usuario_id=ator AND ativo FOR SHARE;
  IF NOT FOUND OR perfil_ator NOT IN ('edicao','administracao') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='cadastro_identidade_inativa';
  END IF;
  IF perfil_ator<>'edicao' THEN RETURN NEW; END IF;
  INSERT INTO ambulatorio.acesso_paciente(paciente_id,usuario_id,pode_editar,ativo,concedido_por_usuario_id)
    VALUES(NEW.paciente_id,ator,true,true,ator);
  INSERT INTO ambulatorio.acesso_paciente_evento(paciente_id,usuario_id,ator_usuario_id,pode_editar,ativo,principal_db)
    VALUES(NEW.paciente_id,ator,ator,true,true,session_user);
  RETURN NEW;
END $$;

-- Serializar concessoes administrativas com a inativacao da identidade alvo.
CREATE OR REPLACE FUNCTION definir_acesso_paciente(paciente bigint,usuario bigint,editar boolean,habilitado boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint;
BEGIN
  SELECT ator_usuario_id INTO ator FROM ambulatorio.auditoria_contexto_transacao
    WHERE transacao_id=pg_current_xact_id_if_assigned() AND origem='aplicacao' AND principal_db=session_user;
  PERFORM usuario_id FROM ambulatorio.usuario_aplicacao WHERE usuario_id=ator AND ativo AND perfil='administracao' FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='acesso_administracao_necessaria';
  END IF;
  PERFORM usuario_id FROM ambulatorio.usuario_aplicacao WHERE usuario_id=usuario AND ativo FOR SHARE;
  IF NOT FOUND THEN
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

CREATE FUNCTION revogar_vinculos_inativacao() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint;
BEGIN
  SELECT ator_usuario_id INTO ator FROM ambulatorio.auditoria_contexto_transacao
    WHERE transacao_id=pg_current_xact_id_if_assigned() AND origem='aplicacao' AND principal_db=session_user;
  WITH revogados AS (
    UPDATE ambulatorio.acesso_paciente SET ativo=false,atualizado_em=clock_timestamp()
      WHERE usuario_id=NEW.usuario_id AND ativo
      RETURNING paciente_id,usuario_id,pode_editar
  )
  INSERT INTO ambulatorio.acesso_paciente_evento(paciente_id,usuario_id,ator_usuario_id,pode_editar,ativo,principal_db)
    SELECT paciente_id,usuario_id,ator,pode_editar,false,session_user FROM revogados;
  RETURN NEW;
END $$;

GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION vincular_cadastro_edicao() OWNER TO ambulatorio_auditoria_owner;
ALTER FUNCTION revogar_vinculos_inativacao() OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION vincular_cadastro_edicao(),revogar_vinculos_inativacao()
  FROM PUBLIC,ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado;
CREATE TRIGGER vinculo_cadastro AFTER INSERT ON paciente
  FOR EACH ROW EXECUTE FUNCTION vincular_cadastro_edicao();
CREATE TRIGGER revogar_vinculos AFTER UPDATE OF ativo ON usuario_aplicacao
  FOR EACH ROW WHEN (OLD.ativo AND NOT NEW.ativo) EXECUTE FUNCTION revogar_vinculos_inativacao();
COMMIT;

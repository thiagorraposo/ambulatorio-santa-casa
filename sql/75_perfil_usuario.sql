-- Objetivo: perfil administrativo versionado, recibo auditavel e revogacao JWT.
-- Impacto: sem alteracao de perfil/backfill; tokens legados valem so na geracao 0.
-- Reversao: bloquear comandos por migration restritiva, preservar recibos e geracoes.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
ALTER TABLE usuario_aplicacao
  ADD COLUMN versao_conta bigint NOT NULL DEFAULT 1 CHECK(versao_conta>0),
  ADD COLUMN geracao_sessao bigint NOT NULL DEFAULT 0 CHECK(geracao_sessao>=0);
CREATE TABLE usuario_perfil_operacao (
  operacao_id uuid PRIMARY KEY,
  usuario_id bigint NOT NULL,
  ator_usuario_id bigint NOT NULL REFERENCES usuario_aplicacao ON DELETE RESTRICT,
  criado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  versao_solicitada bigint NOT NULL CHECK(versao_solicitada>0),
  perfil_solicitado text NOT NULL CHECK(perfil_solicitado IN ('consulta','edicao','administracao')),
  justificativa text NOT NULL CHECK(length(btrim(justificativa)) BETWEEN 10 AND 1000),
  recibo jsonb NOT NULL
);
REVOKE ALL ON usuario_perfil_operacao FROM PUBLIC,ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado;
GRANT SELECT,INSERT ON usuario_perfil_operacao TO ambulatorio_auditoria_owner;
GRANT SELECT ON usuario_perfil_operacao TO ambulatorio_aplicacao;
GRANT SELECT(versao_conta,geracao_sessao),UPDATE(perfil) ON usuario_aplicacao TO ambulatorio_auditoria_owner;

CREATE FUNCTION usuario_serializar_alteracao() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION USING ERRCODE='25000',MESSAGE='usuario_requer_read_committed';
  END IF;
  PERFORM pg_advisory_xact_lock(803,75);
  RETURN NULL;
END $$;
CREATE TRIGGER usuario_serializar BEFORE UPDATE ON usuario_aplicacao
  FOR EACH STATEMENT EXECUTE FUNCTION usuario_serializar_alteracao();
CREATE FUNCTION usuario_proteger_administracao() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF OLD.ativo AND OLD.perfil='administracao' AND (NOT NEW.ativo OR NEW.perfil<>'administracao')
    AND NOT EXISTS(SELECT 1 FROM ambulatorio.usuario_aplicacao
      WHERE usuario_id<>OLD.usuario_id AND ativo AND perfil='administracao') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ultimo_administrador';
  END IF;
  NEW.versao_conta:=OLD.versao_conta+1;
  NEW.geracao_sessao:=OLD.geracao_sessao + CASE WHEN
    NEW.perfil IS DISTINCT FROM OLD.perfil OR NEW.ativo IS DISTINCT FROM OLD.ativo
    OR NEW.senha_hash IS DISTINCT FROM OLD.senha_hash THEN 1 ELSE 0 END;
  RETURN NEW;
END $$;
CREATE TRIGGER usuario_proteger BEFORE UPDATE ON usuario_aplicacao
  FOR EACH ROW EXECUTE FUNCTION usuario_proteger_administracao();

CREATE FUNCTION alterar_perfil_usuario(alvo bigint,versao bigint,novo_perfil text,motivo text,operacao uuid,geracao_ator bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint; atual record; anterior ambulatorio.usuario_perfil_operacao;
  resultado text; recibo jsonb; nova_versao bigint;
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION USING ERRCODE='25000',MESSAGE='usuario_requer_read_committed';
  END IF;
  PERFORM pg_advisory_xact_lock(803,75);
  SELECT ator_usuario_id INTO ator FROM ambulatorio.auditoria_contexto_transacao
    WHERE transacao_id=pg_current_xact_id_if_assigned() AND origem='aplicacao' AND principal_db=session_user;
  PERFORM usuario_id FROM ambulatorio.usuario_aplicacao
    WHERE usuario_id=ator AND ativo AND perfil='administracao' AND geracao_sessao=geracao_ator FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='administracao_necessaria'; END IF;
  IF versao IS NULL OR versao<1 OR novo_perfil IS NULL OR novo_perfil NOT IN ('consulta','edicao','administracao')
    OR motivo IS NULL OR length(btrim(motivo)) NOT BETWEEN 10 AND 1000 OR operacao IS NULL OR alvo IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='perfil_parametro_invalido';
  END IF;
  SELECT * INTO anterior FROM ambulatorio.usuario_perfil_operacao WHERE operacao_id=operacao;
  IF FOUND THEN
    IF anterior.ator_usuario_id<>ator OR anterior.usuario_id<>alvo OR anterior.versao_solicitada<>versao
      OR anterior.perfil_solicitado<>novo_perfil OR anterior.justificativa<>btrim(motivo) THEN
      RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='operacao_divergente';
    END IF;
    RETURN anterior.recibo;
  END IF;
  SELECT usuario_id,perfil,ativo,versao_conta INTO atual FROM ambulatorio.usuario_aplicacao WHERE usuario_id=alvo FOR NO KEY UPDATE;
  resultado:=CASE WHEN NOT FOUND THEN 'alvo_inexistente'
    WHEN alvo=ator THEN 'autoacao_proibida'
    WHEN atual.versao_conta<>versao THEN 'versao_obsoleta'
    WHEN atual.perfil=novo_perfil THEN 'perfil_inalterado'
    WHEN atual.ativo AND atual.perfil='administracao' AND novo_perfil<>'administracao'
      AND NOT EXISTS(SELECT 1 FROM ambulatorio.usuario_aplicacao WHERE usuario_id<>alvo AND ativo AND perfil='administracao')
      THEN 'ultimo_administrador' ELSE 'aplicada' END;
  nova_versao:=atual.versao_conta;
  IF resultado='aplicada' THEN
    UPDATE ambulatorio.usuario_aplicacao SET perfil=novo_perfil WHERE usuario_id=alvo RETURNING versao_conta INTO nova_versao;
  END IF;
  recibo:=jsonb_build_object('operacaoId',operacao,'usuarioId',alvo::text,'atorUsuarioId',ator::text,
    'operacao','perfil','instante',clock_timestamp(),'resultado',resultado,'anterior',atual.perfil,
    'novo',novo_perfil,'versaoAnterior',atual.versao_conta::text,'versaoNova',nova_versao::text,'justificativa',btrim(motivo));
  INSERT INTO ambulatorio.usuario_perfil_operacao(operacao_id,usuario_id,ator_usuario_id,versao_solicitada,perfil_solicitado,justificativa,recibo)
    VALUES(operacao,alvo,ator,versao,novo_perfil,btrim(motivo),recibo);
  RETURN recibo;
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION usuario_proteger_administracao() OWNER TO ambulatorio_auditoria_owner;
ALTER FUNCTION alterar_perfil_usuario(bigint,bigint,text,text,uuid,bigint) OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION usuario_serializar_alteracao(),usuario_proteger_administracao(),alterar_perfil_usuario(bigint,bigint,text,text,uuid,bigint)
  FROM PUBLIC,ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado;
GRANT EXECUTE ON FUNCTION alterar_perfil_usuario(bigint,bigint,text,text,uuid,bigint) TO ambulatorio_aplicacao;
COMMIT;

-- Objetivo: ativacao/inativacao administrativa integrada e recibos compartilhados.
-- Impacto: preserva perfil/recibos antigos; usa revogacao de vinculos da74.
-- Reversao: bloquear novos comandos por migration restritiva, preservar historico.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio,public;
ALTER TABLE usuario_perfil_operacao RENAME TO usuario_conta_operacao;
ALTER TABLE usuario_conta_operacao
  ALTER COLUMN perfil_solicitado DROP NOT NULL,
  ADD COLUMN tipo text NOT NULL DEFAULT 'perfil' CHECK(tipo IN ('perfil','estado')),
  ADD COLUMN estado_solicitado boolean,
  ADD CONSTRAINT usuario_operacao_destino CHECK(
    (tipo='perfil' AND perfil_solicitado IS NOT NULL AND estado_solicitado IS NULL)
    OR (tipo='estado' AND perfil_solicitado IS NULL AND estado_solicitado IS NOT NULL));
-- Compatibilidade de leitores do incremento75; sem alterar recibos existentes.
CREATE VIEW usuario_perfil_operacao AS SELECT operacao_id,usuario_id,ator_usuario_id,criado_em,
  versao_solicitada,perfil_solicitado,justificativa,recibo FROM usuario_conta_operacao WHERE tipo='perfil';
REVOKE ALL ON usuario_perfil_operacao FROM PUBLIC,ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado;
GRANT SELECT ON usuario_perfil_operacao TO ambulatorio_aplicacao,ambulatorio_auditoria_owner;
GRANT UPDATE(ativo) ON usuario_aplicacao TO ambulatorio_auditoria_owner;

CREATE FUNCTION alterar_conta_usuario(alvo bigint,versao bigint,tipo text,novo_perfil text,novo_estado boolean,motivo text,operacao uuid,geracao_ator bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint; atual record; anterior ambulatorio.usuario_conta_operacao;
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
  IF versao IS NULL OR versao<1 OR tipo IS NULL OR tipo NOT IN ('perfil','estado')
    OR (tipo='perfil' AND (novo_perfil IS NULL OR novo_perfil NOT IN ('consulta','edicao','administracao') OR novo_estado IS NOT NULL))
    OR (tipo='estado' AND (novo_estado IS NULL OR novo_perfil IS NOT NULL))
    OR motivo IS NULL OR length(btrim(motivo)) NOT BETWEEN 10 AND 1000 OR operacao IS NULL OR alvo IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='perfil_parametro_invalido';
  END IF;
  SELECT * INTO anterior FROM ambulatorio.usuario_conta_operacao WHERE operacao_id=operacao;
  IF FOUND THEN
    IF anterior.ator_usuario_id<>ator OR anterior.usuario_id<>alvo OR anterior.versao_solicitada<>versao
      OR anterior.tipo<>tipo OR anterior.perfil_solicitado IS DISTINCT FROM novo_perfil
      OR anterior.estado_solicitado IS DISTINCT FROM novo_estado OR anterior.justificativa<>btrim(motivo) THEN
      RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='operacao_divergente';
    END IF;
    RETURN anterior.recibo;
  END IF;
  SELECT usuario_id,perfil,ativo,versao_conta INTO atual FROM ambulatorio.usuario_aplicacao WHERE usuario_id=alvo FOR NO KEY UPDATE;
  resultado:=CASE WHEN NOT FOUND THEN 'alvo_inexistente'
    WHEN alvo=ator THEN 'autoacao_proibida'
    WHEN atual.versao_conta<>versao THEN 'versao_obsoleta'
    WHEN tipo='perfil' AND atual.perfil=novo_perfil THEN 'perfil_inalterado'
    WHEN tipo='estado' AND atual.ativo=novo_estado THEN 'estado_inalterado'
    WHEN atual.ativo AND atual.perfil='administracao'
      AND ((tipo='perfil' AND novo_perfil<>'administracao') OR (tipo='estado' AND NOT novo_estado))
      AND NOT EXISTS(SELECT 1 FROM ambulatorio.usuario_aplicacao WHERE usuario_id<>alvo AND ativo AND perfil='administracao')
      THEN 'ultimo_administrador' ELSE 'aplicada' END;
  nova_versao:=atual.versao_conta;
  IF resultado='aplicada' THEN
    IF tipo='perfil' THEN
      UPDATE ambulatorio.usuario_aplicacao SET perfil=novo_perfil WHERE usuario_id=alvo RETURNING versao_conta INTO nova_versao;
    ELSE
      UPDATE ambulatorio.usuario_aplicacao SET ativo=novo_estado WHERE usuario_id=alvo RETURNING versao_conta INTO nova_versao;
    END IF;
  END IF;
  recibo:=jsonb_build_object('operacaoId',operacao,'usuarioId',alvo::text,'atorUsuarioId',ator::text,
    'operacao',tipo,'instante',clock_timestamp(),'resultado',resultado,
    'anterior',CASE WHEN tipo='perfil' THEN to_jsonb(atual.perfil) ELSE to_jsonb(atual.ativo) END,
    'novo',CASE WHEN tipo='perfil' THEN to_jsonb(novo_perfil) ELSE to_jsonb(novo_estado) END,'versaoAnterior',atual.versao_conta::text,'versaoNova',nova_versao::text,'justificativa',btrim(motivo));
  INSERT INTO ambulatorio.usuario_conta_operacao(operacao_id,usuario_id,ator_usuario_id,versao_solicitada,perfil_solicitado,estado_solicitado,tipo,justificativa,recibo)
    VALUES(operacao,alvo,ator,versao,novo_perfil,novo_estado,tipo,btrim(motivo),recibo);
  RETURN recibo;
END $$;
CREATE OR REPLACE FUNCTION alterar_perfil_usuario(alvo bigint,versao bigint,novo_perfil text,motivo text,operacao uuid,geracao_ator bigint)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
  SELECT ambulatorio.alterar_conta_usuario(alvo,versao,'perfil',novo_perfil,NULL,motivo,operacao,geracao_ator)
$$;
CREATE FUNCTION alterar_estado_usuario(alvo bigint,versao bigint,novo_estado boolean,motivo text,operacao uuid,geracao_ator bigint)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
  SELECT ambulatorio.alterar_conta_usuario(alvo,versao,'estado',NULL,novo_estado,motivo,operacao,geracao_ator)
$$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION alterar_conta_usuario(bigint,bigint,text,text,boolean,text,uuid,bigint) OWNER TO ambulatorio_auditoria_owner;
ALTER FUNCTION alterar_estado_usuario(bigint,bigint,boolean,text,uuid,bigint) OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION alterar_conta_usuario(bigint,bigint,text,text,boolean,text,uuid,bigint),
  alterar_perfil_usuario(bigint,bigint,text,text,uuid,bigint),alterar_estado_usuario(bigint,bigint,boolean,text,uuid,bigint)
  FROM PUBLIC,ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado;
GRANT EXECUTE ON FUNCTION alterar_perfil_usuario(bigint,bigint,text,text,uuid,bigint),
  alterar_estado_usuario(bigint,bigint,boolean,text,uuid,bigint) TO ambulatorio_aplicacao;
COMMIT;

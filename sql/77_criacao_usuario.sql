-- Objetivo: provisionamento de uso unico e troca obrigatoria, sem segredos na auditoria.
-- Reversao: revogar EXECUTE por migration futura; preservar contas e recibos.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='ambulatorio_credencial_owner') THEN
 CREATE ROLE ambulatorio_credencial_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='ambulatorio_credencial_owner'
 AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit))
 OR EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid OR r.oid=m.member
 WHERE r.rolname='ambulatorio_credencial_owner') THEN
 RAISE EXCEPTION 'Owner de credenciais requer role isolada sem login';
 END IF;
END $$;
GRANT USAGE ON SCHEMA ambulatorio TO ambulatorio_credencial_owner;
GRANT SELECT ON auditoria_contexto_transacao,usuario_conta_operacao TO ambulatorio_credencial_owner;
ALTER TABLE usuario_aplicacao ADD COLUMN troca_obrigatoria boolean NOT NULL DEFAULT false,
 ADD COLUMN credencial_expira_em timestamptz, ADD COLUMN credencial_consumida_em timestamptz;
CREATE TABLE usuario_credencial_operacao (
 operacao_id uuid PRIMARY KEY, usuario_id bigint REFERENCES usuario_aplicacao,
 ator_usuario_id bigint NOT NULL REFERENCES usuario_aplicacao,
 criado_em timestamptz NOT NULL DEFAULT clock_timestamp(), payload jsonb NOT NULL, recibo jsonb NOT NULL
);
REVOKE ALL ON usuario_credencial_operacao FROM PUBLIC,ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado;
GRANT SELECT ON usuario_credencial_operacao TO ambulatorio_aplicacao;
GRANT SELECT,INSERT ON usuario_credencial_operacao TO ambulatorio_credencial_owner;
GRANT INSERT,SELECT,UPDATE(senha_hash,troca_obrigatoria,credencial_expira_em,credencial_consumida_em) ON usuario_aplicacao TO ambulatorio_credencial_owner;
GRANT USAGE ON SEQUENCE usuario_aplicacao_usuario_id_seq TO ambulatorio_credencial_owner;

CREATE FUNCTION proteger_codigo_operacao_credencial() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(803,75);
 IF EXISTS(SELECT 1 FROM ambulatorio.usuario_credencial_operacao WHERE operacao_id=NEW.operacao_id) THEN
 RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='operacao_divergente'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER usuario_conta_codigo_credencial BEFORE INSERT ON usuario_conta_operacao
 FOR EACH ROW EXECUTE FUNCTION proteger_codigo_operacao_credencial();
REVOKE ALL ON FUNCTION proteger_codigo_operacao_credencial() FROM PUBLIC;

CREATE FUNCTION criar_usuario(operacao uuid, dados jsonb, hash_seguro text, expira timestamptz, geracao bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint; alvo bigint; anterior ambulatorio.usuario_credencial_operacao; recibo jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(803,75);
 SELECT ator_usuario_id INTO ator FROM ambulatorio.auditoria_contexto_transacao
 WHERE transacao_id=pg_current_xact_id_if_assigned() AND origem='aplicacao' AND principal_db=session_user;
 PERFORM usuario_id FROM ambulatorio.usuario_aplicacao WHERE usuario_id=ator AND ativo AND perfil='administracao'
 AND geracao_sessao=geracao AND NOT troca_obrigatoria FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='administracao_necessaria'; END IF;
 IF dados IS NULL OR dados->>'nome' IS NULL OR dados->>'login' IS NULL OR dados->>'perfil' IS NULL OR hash_seguro IS NULL OR expira IS NULL OR current_setting('transaction_isolation')<>'read committed' OR operacao IS NULL
 OR length(dados->>'nome') NOT BETWEEN 3 AND 160 OR length(dados->>'login') NOT BETWEEN 3 AND 254
 OR dados->>'login' IS DISTINCT FROM lower(btrim(dados->>'login'))
 OR dados->>'perfil' NOT IN ('consulta','edicao','administracao') OR hash_seguro !~ '^\$2[aby]\$12\$'
 OR expira<=clock_timestamp() OR expira>clock_timestamp()+interval '7 days' THEN
 RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='parametro_invalido'; END IF;
 SELECT * INTO anterior FROM ambulatorio.usuario_credencial_operacao WHERE operacao_id=operacao;
 IF FOUND THEN
  IF anterior.ator_usuario_id<>ator OR anterior.payload<>dados THEN RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='operacao_divergente'; END IF;
  RETURN anterior.recibo;
 END IF;
 IF EXISTS(SELECT 1 FROM ambulatorio.usuario_conta_operacao WHERE operacao_id=operacao) THEN
 RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='operacao_divergente'; END IF;
 IF EXISTS(SELECT 1 FROM ambulatorio.usuario_aplicacao WHERE login=dados->>'login') THEN
  recibo:=jsonb_build_object('operacaoId',operacao,'atorUsuarioId',ator::text,'operacao','criacao','resultado','login_duplicado','instante',clock_timestamp());
 ELSE
  INSERT INTO ambulatorio.usuario_aplicacao(nome,login,perfil,senha_hash,troca_obrigatoria,credencial_expira_em)
  VALUES(dados->>'nome',dados->>'login',dados->>'perfil',hash_seguro,true,expira) RETURNING usuario_id INTO alvo;
  recibo:=jsonb_build_object('operacaoId',operacao,'usuarioId',alvo::text,'atorUsuarioId',ator::text,'operacao','criacao','resultado','aplicada',
   'instante',clock_timestamp(),'nome',dados->>'nome','login',dados->>'login','perfil',dados->>'perfil');
 END IF;
 INSERT INTO ambulatorio.usuario_credencial_operacao VALUES(operacao,alvo,ator,clock_timestamp(),dados,recibo);
 RETURN recibo;
END $$;

CREATE FUNCTION recuperar_credencial_usuario(alvo bigint, versao bigint, motivo text, operacao uuid, hash_seguro text, expira timestamptz, geracao bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint; atual record; anterior ambulatorio.usuario_credencial_operacao; dados jsonb; recibo jsonb; resultado text;
BEGIN
 PERFORM pg_advisory_xact_lock(803,75);
 SELECT ator_usuario_id INTO ator FROM ambulatorio.auditoria_contexto_transacao
 WHERE transacao_id=pg_current_xact_id_if_assigned() AND origem='aplicacao' AND principal_db=session_user;
 PERFORM usuario_id FROM ambulatorio.usuario_aplicacao WHERE usuario_id=ator AND ativo AND perfil='administracao'
 AND geracao_sessao=geracao AND NOT troca_obrigatoria FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='administracao_necessaria'; END IF;
 IF current_setting('transaction_isolation')<>'read committed' OR alvo IS NULL OR versao IS NULL OR versao<1 OR operacao IS NULL
 OR motivo IS NULL OR length(btrim(motivo)) NOT BETWEEN 10 AND 1000 OR hash_seguro IS NULL OR hash_seguro !~ '^\$2[aby]\$12\$'
 OR expira IS NULL OR expira<=clock_timestamp() OR expira>clock_timestamp()+interval '7 days' THEN
 RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='parametro_invalido'; END IF;
 dados:=jsonb_build_object('tipo','recuperacao','usuarioId',alvo::text,'versao',versao::text,'justificativa',btrim(motivo));
 SELECT * INTO anterior FROM ambulatorio.usuario_credencial_operacao WHERE operacao_id=operacao;
 IF FOUND THEN
  IF anterior.ator_usuario_id<>ator OR anterior.payload<>dados THEN RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='operacao_divergente'; END IF;
  RETURN anterior.recibo;
 END IF;
 IF EXISTS(SELECT 1 FROM ambulatorio.usuario_conta_operacao WHERE operacao_id=operacao) THEN
 RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='operacao_divergente'; END IF;
 SELECT usuario_id,ativo,perfil,versao_conta INTO atual FROM ambulatorio.usuario_aplicacao WHERE usuario_id=alvo FOR NO KEY UPDATE;
 resultado:=CASE WHEN NOT FOUND OR NOT atual.ativo OR atual.perfil='administracao' OR alvo=ator THEN 'recuperacao_proibida'
 WHEN atual.versao_conta<>versao THEN 'versao_obsoleta' ELSE 'aplicada' END;
 IF resultado='aplicada' THEN
 UPDATE ambulatorio.usuario_aplicacao SET senha_hash=hash_seguro,troca_obrigatoria=true,credencial_expira_em=expira,credencial_consumida_em=NULL WHERE usuario_id=alvo;
 END IF;
 recibo:=jsonb_build_object('operacaoId',operacao,'usuarioId',alvo::text,'atorUsuarioId',ator::text,'operacao','recuperacao','resultado',resultado,
 'instante',clock_timestamp(),'versaoAnterior',versao::text,'justificativa',btrim(motivo));
 INSERT INTO ambulatorio.usuario_credencial_operacao VALUES(operacao,atual.usuario_id,ator,clock_timestamp(),dados,recibo);
 RETURN recibo;
END $$;

-- A verificacao bcrypt acontece no backend; CAS protege corrida com login/troca/redefinicao.
CREATE FUNCTION consumir_credencial_inicial(alvo bigint, hash_atual text, geracao bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(803,75);
 UPDATE ambulatorio.usuario_aplicacao SET credencial_consumida_em=clock_timestamp()
 WHERE usuario_id=alvo AND ativo AND troca_obrigatoria AND senha_hash=hash_atual AND geracao_sessao=geracao
 AND credencial_consumida_em IS NULL AND credencial_expira_em>clock_timestamp();
 RETURN FOUND;
END $$;
CREATE FUNCTION trocar_senha_usuario(hash_atual text, hash_novo text, geracao bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint;
BEGIN
 PERFORM pg_advisory_xact_lock(803,75);
 SELECT ator_usuario_id INTO ator FROM ambulatorio.auditoria_contexto_transacao
 WHERE transacao_id=pg_current_xact_id_if_assigned() AND origem='aplicacao' AND principal_db=session_user;
 IF hash_novo !~ '^\$2[aby]\$12\$' THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='hash_invalido'; END IF;
 UPDATE ambulatorio.usuario_aplicacao SET senha_hash=hash_novo,troca_obrigatoria=false,credencial_expira_em=NULL,credencial_consumida_em=NULL
 WHERE usuario_id=ator AND ativo AND senha_hash=hash_atual AND geracao_sessao=geracao
 AND (NOT troca_obrigatoria OR (credencial_consumida_em IS NOT NULL AND credencial_expira_em>clock_timestamp()));
 IF NOT FOUND THEN RETURN false; END IF;
 INSERT INTO ambulatorio.usuario_credencial_operacao VALUES(gen_random_uuid(),ator,ator,clock_timestamp(),'{}',
 jsonb_build_object('usuarioId',ator::text,'atorUsuarioId',ator::text,'operacao','troca_senha','resultado','aplicada','instante',clock_timestamp()));
 RETURN true;
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_credencial_owner;
ALTER FUNCTION recuperar_credencial_usuario(bigint,bigint,text,uuid,text,timestamptz,bigint) OWNER TO ambulatorio_credencial_owner;
ALTER FUNCTION criar_usuario(uuid,jsonb,text,timestamptz,bigint) OWNER TO ambulatorio_credencial_owner;
ALTER FUNCTION consumir_credencial_inicial(bigint,text,bigint) OWNER TO ambulatorio_credencial_owner;
ALTER FUNCTION trocar_senha_usuario(text,text,bigint) OWNER TO ambulatorio_credencial_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_credencial_owner;
REVOKE ALL ON FUNCTION recuperar_credencial_usuario(bigint,bigint,text,uuid,text,timestamptz,bigint),criar_usuario(uuid,jsonb,text,timestamptz,bigint),consumir_credencial_inicial(bigint,text,bigint),trocar_senha_usuario(text,text,bigint) FROM PUBLIC,ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado;
GRANT EXECUTE ON FUNCTION recuperar_credencial_usuario(bigint,bigint,text,uuid,text,timestamptz,bigint),criar_usuario(uuid,jsonb,text,timestamptz,bigint),consumir_credencial_inicial(bigint,text,bigint),trocar_senha_usuario(text,text,bigint) TO ambulatorio_aplicacao;
COMMIT;

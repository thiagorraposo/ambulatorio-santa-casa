-- Objetivo: gestao restrita de fontes e autorizacoes da ADR-022.
-- Impacto: funcoes sem DML clinico; nenhum login, membro ou autorizacao criado.
-- Identidade vem do ledger autenticado do XID, nunca de parametro livre.
-- Reversao: revogar EXECUTE em migration posterior; preservar fonte e concessoes.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ambulatorio_revisao_owner') THEN
    CREATE ROLE ambulatorio_revisao_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ambulatorio_revisao_gestor') THEN
    CREATE ROLE ambulatorio_revisao_gestor NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ambulatorio_revisao_servico') THEN
    CREATE ROLE ambulatorio_revisao_servico NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END $$;
GRANT USAGE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner,ambulatorio_revisao_gestor,ambulatorio_revisao_servico;
GRANT SELECT ON auditoria_contexto_transacao,importacao_fonte,importacao_revisao_autorizacao,
  importacao_lote,importacao_linha,importacao_registro,atendimento TO ambulatorio_revisao_owner;
GRANT SELECT(usuario_id,ativo) ON usuario_aplicacao TO ambulatorio_revisao_owner;
GRANT INSERT ON importacao_fonte,importacao_revisao_autorizacao TO ambulatorio_revisao_owner;
-- Privilégios de coluna tambem permitem os locks de leitura usados abaixo.
GRANT UPDATE(versao_controle) ON importacao_fonte TO ambulatorio_revisao_owner;
GRANT UPDATE(revogada_em,revogada_por_usuario_id) ON importacao_revisao_autorizacao TO ambulatorio_revisao_owner;
GRANT UPDATE(status_lote) ON importacao_lote TO ambulatorio_revisao_owner;
GRANT UPDATE(status_linha) ON importacao_linha TO ambulatorio_revisao_owner;
GRANT UPDATE(acao) ON importacao_registro TO ambulatorio_revisao_owner;
GRANT USAGE ON SEQUENCE importacao_fonte_fonte_id_seq,importacao_revisao_autorizacao_autorizacao_id_seq
  TO ambulatorio_revisao_owner;

CREATE FUNCTION revisao_ator_autenticado() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint;
BEGIN
  SELECT c.ator_usuario_id INTO ator FROM ambulatorio.auditoria_contexto_transacao c
    JOIN ambulatorio.usuario_aplicacao u ON u.usuario_id=c.ator_usuario_id AND u.ativo
    WHERE c.transacao_id=pg_current_xact_id_if_assigned() AND c.principal_db=session_user
      AND c.origem='aplicacao';
  IF ator IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_identidade_nao_autenticada';
  END IF;
  RETURN ator;
END $$;

CREATE FUNCTION revisao_registrar_fonte(codigo_fonte text,lote_inicial bigint) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint; fonte bigint; estado text;
BEGIN
  IF NOT pg_has_role(session_user,'ambulatorio_revisao_gestor','MEMBER') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_gestao_nao_autorizada';
  END IF;
  ator:=ambulatorio.revisao_ator_autenticado();
  SELECT status_lote INTO estado FROM ambulatorio.importacao_lote WHERE importacao_lote_id=lote_inicial FOR UPDATE;
  IF estado IS NULL OR estado NOT IN ('concluido','concluido_com_pendencias') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_base_nao_terminal';
  END IF;
  -- Congela todas as linhas e vinculos antes de comprovar a ancora da fonte.
  -- Locks dos pais bloqueiam tambem insercao de novos filhos por suas FKs.
  PERFORM i.importacao_linha_id FROM ambulatorio.importacao_linha i
    WHERE i.importacao_lote_id=lote_inicial ORDER BY i.importacao_linha_id FOR UPDATE;
  PERFORM r.importacao_registro_id FROM ambulatorio.importacao_registro r
    JOIN ambulatorio.importacao_linha i USING(importacao_linha_id)
    WHERE i.importacao_lote_id=lote_inicial ORDER BY r.importacao_registro_id FOR UPDATE OF r;
  IF NOT EXISTS (SELECT 1 FROM ambulatorio.importacao_linha WHERE importacao_lote_id=lote_inicial
      AND status_linha IN ('importada','importada_com_pendencia'))
    OR EXISTS (SELECT 1 FROM ambulatorio.importacao_linha WHERE importacao_lote_id=lote_inicial
      AND status_linha NOT IN ('importada','importada_com_pendencia','rejeitada','ignorada'))
    OR EXISTS (
      SELECT 1 FROM ambulatorio.importacao_linha i WHERE i.importacao_lote_id=lote_inicial
      AND i.status_linha IN ('importada','importada_com_pendencia') AND (
        (SELECT count(*) FROM ambulatorio.importacao_registro r WHERE r.importacao_linha_id=i.importacao_linha_id
          AND r.tabela_destino='paciente')<>1
        OR (SELECT count(*) FROM ambulatorio.importacao_registro r WHERE r.importacao_linha_id=i.importacao_linha_id
          AND r.tabela_destino='atendimento')<>1
        OR NOT EXISTS (SELECT 1 FROM ambulatorio.importacao_registro p
          JOIN ambulatorio.importacao_registro a ON a.importacao_linha_id=p.importacao_linha_id AND a.tabela_destino='atendimento'
          JOIN ambulatorio.atendimento at ON at.atendimento_id=a.registro_id AND at.paciente_id=p.registro_id
          WHERE p.importacao_linha_id=i.importacao_linha_id AND p.tabela_destino='paciente'))
    ) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_proveniencia_base_invalida';
  END IF;
  INSERT INTO ambulatorio.importacao_fonte(codigo,lote_inicial_id,registrada_por_usuario_id)
    VALUES(codigo_fonte,lote_inicial,ator) RETURNING fonte_id INTO fonte;
  RETURN fonte;
END $$;

CREATE FUNCTION revisao_conceder_autorizacao(fonte bigint,usuario bigint,validade timestamptz DEFAULT NULL) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint; autorizacao bigint;
BEGIN
  IF NOT pg_has_role(session_user,'ambulatorio_revisao_gestor','MEMBER') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_gestao_nao_autorizada';
  END IF;
  ator:=ambulatorio.revisao_ator_autenticado();
  PERFORM fonte_id FROM ambulatorio.importacao_fonte WHERE fonte_id=fonte FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_fonte_ausente'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ambulatorio.usuario_aplicacao WHERE usuario_id=usuario AND ativo) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_usuario_inativo';
  END IF;
  INSERT INTO ambulatorio.importacao_revisao_autorizacao(fonte_id,usuario_id,concedida_por_usuario_id,valida_ate)
    VALUES(fonte,usuario,ator,validade) RETURNING autorizacao_id INTO autorizacao;
  RETURN autorizacao;
END $$;

CREATE FUNCTION revisao_revogar_autorizacao(autorizacao bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE ator bigint; fonte bigint;
BEGIN
  IF NOT pg_has_role(session_user,'ambulatorio_revisao_gestor','MEMBER') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_gestao_nao_autorizada';
  END IF;
  ator:=ambulatorio.revisao_ator_autenticado();
  SELECT fonte_id INTO fonte FROM ambulatorio.importacao_revisao_autorizacao WHERE autorizacao_id=autorizacao;
  IF fonte IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_autorizacao_ausente'; END IF;
  -- Mesmo primeiro lock do protocolo futuro de aprovacao/aplicacao.
  PERFORM fonte_id FROM ambulatorio.importacao_fonte WHERE fonte_id=fonte FOR UPDATE;
  PERFORM autorizacao_id FROM ambulatorio.importacao_revisao_autorizacao WHERE autorizacao_id=autorizacao FOR UPDATE;
  UPDATE ambulatorio.importacao_revisao_autorizacao SET revogada_em=clock_timestamp(),revogada_por_usuario_id=ator
    WHERE autorizacao_id=autorizacao AND revogada_em IS NULL;
END $$;

GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_ator_autenticado() OWNER TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_registrar_fonte(text,bigint) OWNER TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_conceder_autorizacao(bigint,bigint,timestamptz) OWNER TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_revogar_autorizacao(bigint) OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_ator_autenticado(),revisao_registrar_fonte(text,bigint),
  revisao_conceder_autorizacao(bigint,bigint,timestamptz),revisao_revogar_autorizacao(bigint)
  FROM PUBLIC,ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado,ambulatorio_revisao_servico;
GRANT EXECUTE ON FUNCTION revisao_registrar_fonte(text,bigint),
  revisao_conceder_autorizacao(bigint,bigint,timestamptz),revisao_revogar_autorizacao(bigint)
  TO ambulatorio_revisao_gestor;
-- Nada associa os papeis acima aos logins existentes. Executor permanece fechado.
COMMIT;

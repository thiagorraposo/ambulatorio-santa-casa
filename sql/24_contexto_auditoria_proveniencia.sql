-- Objetivo: atribuir a origem de escrita por contexto restrito da transacao.
-- Impacto: ledger tecnico adicional, sem login/concessao a usuarios funcionais;
-- protege proveniencia auditada e recusa promocao de conteudo superado.
-- Reversao: nova migration restritiva; preservar contexto e eventos existentes.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='ambulatorio_servico_autenticado') THEN
    CREATE ROLE ambulatorio_servico_autenticado NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END $$;
GRANT USAGE ON SCHEMA ambulatorio TO ambulatorio_servico_autenticado;

CREATE TABLE auditoria_contexto_transacao (
  transacao_id xid8 PRIMARY KEY,
  principal_db text NOT NULL,
  origem text NOT NULL CHECK(origem IN ('importacao','aplicacao','revisao')),
  importacao_linha_id bigint REFERENCES importacao_linha ON DELETE RESTRICT,
  ator_usuario_id bigint REFERENCES usuario_aplicacao ON DELETE RESTRICT,
  aplicacao_id bigint REFERENCES importacao_revisao_aplicacao ON DELETE RESTRICT,
  criada_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK((origem='importacao')=(importacao_linha_id IS NOT NULL)),
  CHECK((origem='revisao')=(aplicacao_id IS NOT NULL)),
  CHECK(origem='importacao' OR ator_usuario_id IS NOT NULL)
);
COMMENT ON TABLE auditoria_contexto_transacao IS
'Contexto confiavel ligado ao XID real, sem identidade em GUC; nao prova historia anterior a sua criacao.';
REVOKE ALL ON auditoria_contexto_transacao FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado;
GRANT SELECT,INSERT ON auditoria_contexto_transacao TO ambulatorio_auditoria_owner;
GRANT UPDATE(importacao_linha_id) ON auditoria_contexto_transacao TO ambulatorio_auditoria_owner;
GRANT SELECT(usuario_id,ativo,perfil) ON usuario_aplicacao TO ambulatorio_auditoria_owner;
GRANT SELECT ON importacao_linha,importacao_lote,importacao_fonte,importacao_revisao TO ambulatorio_auditoria_owner;
GRANT UPDATE ON importacao_fonte TO ambulatorio_auditoria_owner;

CREATE FUNCTION auditoria_validar_precedencia(linha bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE lote ambulatorio.importacao_lote; fonte ambulatorio.importacao_fonte; atual text;
BEGIN
  SELECT l.* INTO STRICT lote FROM ambulatorio.importacao_lote l
    JOIN ambulatorio.importacao_linha i USING(importacao_lote_id) WHERE i.importacao_linha_id=linha;
  FOR fonte IN SELECT f.* FROM ambulatorio.importacao_fonte f
    WHERE EXISTS(SELECT 1 FROM ambulatorio.importacao_lote b WHERE b.importacao_lote_id=f.lote_inicial_id
      AND b.hash_arquivo_sha256=lote.hash_arquivo_sha256 AND b.layout_versao=lote.layout_versao)
      OR EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao r WHERE r.fonte_id=f.fonte_id
        AND ((r.hash_base=lote.hash_arquivo_sha256 AND r.layout_base=lote.layout_versao)
          OR (r.hash_revisado=lote.hash_arquivo_sha256 AND r.layout_revisado=lote.layout_versao)))
    ORDER BY f.fonte_id FOR UPDATE LOOP
    IF fonte.revisao_corrente_id IS NOT NULL THEN
      SELECT hash_revisado INTO STRICT atual FROM ambulatorio.importacao_revisao WHERE revisao_id=fonte.revisao_corrente_id;
      IF atual<>lote.hash_arquivo_sha256 THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='importacao_conteudo_superado';
      END IF;
    END IF;
  END LOOP;
END $$;

CREATE FUNCTION auditoria_iniciar_importacao(linha bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE existente ambulatorio.auditoria_contexto_transacao;
BEGIN
  IF NOT pg_has_role(session_user,'ambulatorio_importador','MEMBER')
    OR NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_linha WHERE importacao_linha_id=linha AND status_linha='processando') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='auditoria_contexto_importacao_invalido';
  END IF;
  PERFORM ambulatorio.auditoria_validar_precedencia(linha);
  SELECT * INTO existente FROM ambulatorio.auditoria_contexto_transacao WHERE transacao_id=pg_current_xact_id();
  IF FOUND THEN
    IF existente.origem<>'importacao' OR existente.principal_db<>session_user THEN
      RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='auditoria_contexto_ja_definido';
    END IF;
    IF existente.importacao_linha_id<>linha THEN
      IF NOT EXISTS(SELECT 1 FROM ambulatorio.importacao_linha WHERE importacao_linha_id=existente.importacao_linha_id
        AND status_linha IN ('importada','importada_com_pendencia','rejeitada','ignorada')) THEN
        RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='auditoria_linha_anterior_em_processamento';
      END IF;
      UPDATE ambulatorio.auditoria_contexto_transacao SET importacao_linha_id=linha WHERE transacao_id=pg_current_xact_id();
    END IF;
    RETURN;
  END IF;
  INSERT INTO ambulatorio.auditoria_contexto_transacao(transacao_id,principal_db,origem,importacao_linha_id)
    VALUES(pg_current_xact_id(),session_user,'importacao',linha);
END $$;

CREATE FUNCTION auditoria_iniciar_aplicacao(ator bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE existente ambulatorio.auditoria_contexto_transacao;
BEGIN
  IF NOT pg_has_role(session_user,'ambulatorio_servico_autenticado','MEMBER')
    OR NOT EXISTS(SELECT 1 FROM ambulatorio.usuario_aplicacao WHERE usuario_id=ator AND ativo) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='auditoria_contexto_aplicacao_invalido';
  END IF;
  SELECT * INTO existente FROM ambulatorio.auditoria_contexto_transacao WHERE transacao_id=pg_current_xact_id();
  IF FOUND THEN
    IF existente.origem<>'aplicacao' OR existente.ator_usuario_id<>ator OR existente.principal_db<>session_user THEN
      RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='auditoria_contexto_ja_definido';
    END IF;
    RETURN;
  END IF;
  INSERT INTO ambulatorio.auditoria_contexto_transacao(transacao_id,principal_db,origem,ator_usuario_id)
    VALUES(pg_current_xact_id(),session_user,'aplicacao',ator);
END $$;

CREATE FUNCTION auditoria_proteger_proveniencia() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE lote bigint; protegido boolean;
BEGIN
  IF TG_TABLE_NAME='importacao_lote' THEN
    lote:=OLD.importacao_lote_id;
  ELSIF TG_TABLE_NAME='importacao_linha' THEN
    lote:=OLD.importacao_lote_id;
  ELSE
    SELECT importacao_lote_id INTO lote FROM ambulatorio.importacao_linha WHERE importacao_linha_id=OLD.importacao_linha_id;
  END IF;
  protegido:=EXISTS(SELECT 1 FROM ambulatorio.importacao_fonte WHERE lote_inicial_id=lote)
    OR EXISTS(SELECT 1 FROM ambulatorio.importacao_revisao WHERE lote_base_id=lote OR lote_revisado_id=lote)
    OR (TG_TABLE_NAME='importacao_registro' AND EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo_evento
        WHERE importacao_linha_id=(to_jsonb(OLD)->>'importacao_linha_id')::bigint));
  IF protegido THEN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='auditoria_proveniencia_protegida'; END IF;
    IF TG_TABLE_NAME='importacao_lote' AND
      (to_jsonb(NEW)-ARRAY['status_lote','iniciado_em','finalizado_em','mensagem_erro','observacoes','atualizado_em'])
        IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status_lote','iniciado_em','finalizado_em','mensagem_erro','observacoes','atualizado_em'])
      OR TG_TABLE_NAME='importacao_linha' AND
      (to_jsonb(NEW)-ARRAY['status_linha','mensagem_processamento','atualizado_em'])
        IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status_linha','mensagem_processamento','atualizado_em'])
      OR TG_TABLE_NAME='importacao_registro' AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='auditoria_proveniencia_protegida';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER auditoria_proveniencia BEFORE UPDATE OR DELETE ON importacao_lote FOR EACH ROW EXECUTE FUNCTION auditoria_proteger_proveniencia();
CREATE TRIGGER auditoria_proveniencia BEFORE UPDATE OR DELETE ON importacao_linha FOR EACH ROW EXECUTE FUNCTION auditoria_proteger_proveniencia();
CREATE TRIGGER auditoria_proveniencia BEFORE UPDATE OR DELETE ON importacao_registro FOR EACH ROW EXECUTE FUNCTION auditoria_proteger_proveniencia();

GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION auditoria_validar_precedencia(bigint) OWNER TO ambulatorio_auditoria_owner;
ALTER FUNCTION auditoria_iniciar_importacao(bigint) OWNER TO ambulatorio_auditoria_owner;
ALTER FUNCTION auditoria_iniciar_aplicacao(bigint) OWNER TO ambulatorio_auditoria_owner;
ALTER FUNCTION auditoria_proteger_proveniencia() OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION auditoria_validar_precedencia(bigint),auditoria_iniciar_importacao(bigint),
  auditoria_iniciar_aplicacao(bigint),auditoria_proteger_proveniencia() FROM PUBLIC,ambulatorio_aplicacao,ambulatorio_importador;
GRANT EXECUTE ON FUNCTION auditoria_iniciar_importacao(bigint) TO ambulatorio_importador;
GRANT EXECUTE ON FUNCTION auditoria_iniciar_aplicacao(bigint) TO ambulatorio_servico_autenticado;

CREATE OR REPLACE FUNCTION auditoria_capturar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE c ambulatorio.auditoria_campo; ultimo ambulatorio.auditoria_campo_evento;
  registro bigint; antes jsonb; depois jsonb; versao bigint; predecessor bigint;
  contexto ambulatorio.auditoria_contexto_transacao;
BEGIN
  IF TG_OP='TRUNCATE' THEN
    IF EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo c JOIN ambulatorio.auditoria_campo_evento e USING(campo_id)
      WHERE c.tabela_destino=TG_TABLE_NAME) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='auditoria_alvo_protegido';
    END IF;
    RETURN NULL;
  END IF;
  SELECT * INTO contexto FROM ambulatorio.auditoria_contexto_transacao WHERE transacao_id=pg_current_xact_id_if_assigned();
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
    IF current_setting('role',true)='ambulatorio_importador' AND contexto.origem IS DISTINCT FROM 'importacao' THEN
      RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='auditoria_importador_sem_contexto';
    END IF;
    IF contexto.origem='importacao' THEN PERFORM ambulatorio.auditoria_validar_precedencia(contexto.importacao_linha_id); END IF;
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
    INSERT INTO ambulatorio.auditoria_campo_evento(campo_id,registro_id,versao_campo,evento_anterior_id,origem,antes,depois,importacao_linha_id,ator_usuario_id)
      VALUES(c.campo_id,registro,versao,predecessor,COALESCE(contexto.origem,'operacao_tecnica'),antes,depois,contexto.importacao_linha_id,contexto.ator_usuario_id);
  END LOOP;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

COMMIT;

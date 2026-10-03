-- Objetivo: anexar diagnostico tecnico atribuivel em transacao apos rollback.
-- Impacto: rotina privada aceita somente SQLSTATE de uma lista fechada; nao
-- recebe mensagens, snapshots ou valores clinicos e nao pode afirmar sucesso.
-- Reversao: restringir novas tentativas; preservar diagnosticos e sucessos.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

CREATE FUNCTION revisao_registrar_falha_interna(decisao bigint,autorizacao bigint,estado_sql text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE d ambulatorio.importacao_revisao_decisao; r ambulatorio.importacao_revisao;
  fonte bigint; ator bigint; tentativa bigint; aplicacao bigint; codigo text;
BEGIN
  IF NOT pg_has_role(session_user,'ambulatorio_revisao_servico','MEMBER') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='revisao_servico_nao_autorizado'; END IF;
  ator:=ambulatorio.revisao_ator_autenticado();
  codigo:=CASE WHEN estado_sql IN ('23514','23503','23502','23505','22P02','22003','22001') THEN 'revisao_aplicacao_integridade'
    WHEN estado_sql IN ('40001','40P01','55P03','57014','08006','08003') THEN 'revisao_falha_transitoria' END;
  IF codigo IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_diagnostico_nao_homologado'; END IF;
  SELECT rv.fonte_id INTO fonte FROM ambulatorio.importacao_revisao_decisao de
    JOIN ambulatorio.importacao_revisao rv USING(revisao_id) WHERE de.decisao_id=decisao;
  IF fonte IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_decisao_ausente'; END IF;
  PERFORM fonte_id FROM ambulatorio.importacao_fonte WHERE fonte_id=fonte FOR UPDATE;
  SELECT rv.* INTO STRICT r FROM ambulatorio.importacao_revisao rv JOIN ambulatorio.importacao_revisao_decisao de USING(revisao_id)
    WHERE de.decisao_id=decisao FOR UPDATE OF rv;
  PERFORM autorizacao_id FROM ambulatorio.importacao_revisao_autorizacao WHERE autorizacao_id=autorizacao FOR UPDATE;
  PERFORM usuario_id FROM ambulatorio.usuario_aplicacao WHERE usuario_id=ator FOR SHARE;
  PERFORM ambulatorio.revisao_exigir_autorizacao(fonte,autorizacao);
  SELECT * INTO STRICT d FROM ambulatorio.importacao_revisao_decisao WHERE decisao_id=decisao FOR UPDATE;
  SELECT aplicacao_id INTO aplicacao FROM ambulatorio.importacao_revisao_aplicacao WHERE decisao_id=decisao AND resultado='aplicada';
  IF aplicacao IS NOT NULL THEN
    PERFORM ambulatorio.revisao_conferir_sucesso(aplicacao);
    RETURN jsonb_build_object('resultado','ja_aplicada','codigo','revisao_efeito_confirmado','aplicacaoId',aplicacao::text);
  END IF;
  IF d.resultado<>'autorizar' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_linha_bloqueada'; END IF;
  SELECT COALESCE(max(numero_tentativa),0)+1 INTO tentativa FROM ambulatorio.importacao_revisao_aplicacao WHERE decisao_id=decisao;
  INSERT INTO ambulatorio.importacao_revisao_aplicacao
    (decisao_id,numero_tentativa,resultado,codigo_resultado,plano_sha256)
    VALUES(decisao,tentativa,'falha_operacional',codigo,d.plano_sha256) RETURNING aplicacao_id INTO aplicacao;
  SET CONSTRAINTS ALL IMMEDIATE;
  -- publicacao_xid vincula a tentativa ao ledger confiavel deste ator/principal.
  RETURN jsonb_build_object('resultado','falha_registrada','codigo',codigo,'tentativaId',aplicacao::text);
END $$;
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_revisao_owner;
ALTER FUNCTION revisao_registrar_falha_interna(bigint,bigint,text) OWNER TO ambulatorio_revisao_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_revisao_owner;
REVOKE ALL ON FUNCTION revisao_registrar_falha_interna(bigint,bigint,text)
  FROM PUBLIC,ambulatorio_importador,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
    ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
COMMIT;

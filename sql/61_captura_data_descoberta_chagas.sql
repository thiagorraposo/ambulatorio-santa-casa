-- Objetivo: habilitar captura prospectiva da data de descoberta D2 para promoção segura.
-- Impacto: registra alterações futuras; não faz backfill nem transforma NULL legado em fato.
-- Reversão: suspender novas revisões em migration posterior, preservando eventos e proveniência.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,
  serializacao_versao,captura_desde)
VALUES('diagnostico_chagas','data_descoberta_autorelato','diagnostico_chagas_id','date','v1',clock_timestamp())
ON CONFLICT (tabela_destino,coluna_destino) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM auditoria_campo
      WHERE tabela_destino='diagnostico_chagas' AND coluna_destino='data_descoberta_autorelato'
        AND coluna_pk='diagnostico_chagas_id' AND tipo_sql='date'
        AND serializacao_versao='v1' AND captura_desde IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='captura_descoberta_catalogo_incompativel';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='ambulatorio.diagnostico_chagas'::regclass
      AND tgname='auditoria_captura' AND NOT tgisinternal AND tgenabled<>'D')
    OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='ambulatorio.diagnostico_chagas'::regclass
      AND tgname='auditoria_protecao' AND NOT tgisinternal AND tgenabled<>'D')
    OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='ambulatorio.diagnostico_chagas'::regclass
      AND tgname='auditoria_protecao_truncate' AND NOT tgisinternal AND tgenabled<>'D') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='captura_descoberta_triggers_ausentes';
  END IF;
END $$;

COMMENT ON COLUMN diagnostico_chagas.data_descoberta_autorelato IS
  'Data de descoberta autorrelatada, distinta da sorologia; captura temporal somente prospectiva, sem backfill de NULL legado.';

CREATE FUNCTION auditoria_d2_null_captura_comprovada(linha_atual bigint,linha_base bigint,
  diagnostico bigint) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
DECLARE contexto ambulatorio.auditoria_contexto_transacao;
BEGIN
  IF NOT pg_has_role(session_user,'ambulatorio_importador','MEMBER') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='promocao_d2_nao_autorizada';
  END IF;
  SELECT * INTO contexto FROM ambulatorio.auditoria_contexto_transacao
    WHERE transacao_id=pg_current_xact_id_if_assigned()
      AND principal_db=session_user AND origem='importacao'
      AND importacao_linha_id=linha_atual;
  IF NOT FOUND THEN RETURN false; END IF;

  IF NOT EXISTS(
    WITH RECURSIVE cadeia AS (
      SELECT l.importacao_lote_id,l.lote_reprocessado_de_id,
        ARRAY[l.importacao_lote_id]::bigint[] caminho
      FROM ambulatorio.importacao_linha atual
      JOIN ambulatorio.importacao_lote l USING(importacao_lote_id)
      WHERE atual.importacao_linha_id=linha_atual
      UNION ALL
      SELECT anterior.importacao_lote_id,anterior.lote_reprocessado_de_id,
        c.caminho||anterior.importacao_lote_id
      FROM ambulatorio.importacao_lote anterior
      JOIN cadeia c ON anterior.importacao_lote_id=c.lote_reprocessado_de_id
      WHERE NOT anterior.importacao_lote_id=ANY(c.caminho)
    )
    SELECT 1 FROM cadeia c
    JOIN ambulatorio.importacao_linha atual ON atual.importacao_linha_id=linha_atual
    JOIN ambulatorio.importacao_lote lote_atual ON lote_atual.importacao_lote_id=atual.importacao_lote_id
    JOIN ambulatorio.importacao_linha base ON base.importacao_linha_id=linha_base
    JOIN ambulatorio.importacao_lote lote_base ON lote_base.importacao_lote_id=base.importacao_lote_id
      AND c.importacao_lote_id=lote_base.importacao_lote_id
    JOIN ambulatorio.importacao_registro proveniencia ON proveniencia.importacao_linha_id=linha_base
      AND proveniencia.tabela_destino='diagnostico_chagas' AND proveniencia.registro_id=diagnostico
    WHERE lote_atual.hash_arquivo_sha256=lote_base.hash_arquivo_sha256
      AND lote_atual.layout_versao=lote_base.layout_versao
      AND lote_base.status_lote IN ('concluido','concluido_com_pendencias')
      AND base.status_linha IN ('importada','importada_com_pendencia')
      AND atual.aba_nome_original=base.aba_nome_original
      AND atual.aba_ordem=base.aba_ordem AND atual.numero_linha=base.numero_linha
      AND atual.dados_brutos=base.dados_brutos
      AND lote_atual.importacao_lote_id<>lote_base.importacao_lote_id
  ) THEN RETURN false; END IF;

  RETURN EXISTS(
    SELECT 1 FROM ambulatorio.auditoria_campo c
    JOIN ambulatorio.auditoria_campo_evento e ON e.campo_id=c.campo_id
    WHERE c.tabela_destino='diagnostico_chagas'
      AND c.coluna_destino='data_descoberta_autorelato'
      AND c.coluna_pk='diagnostico_chagas_id' AND c.tipo_sql='date'
      AND c.serializacao_versao='v1' AND c.captura_desde IS NOT NULL
      AND e.registro_id=diagnostico AND e.versao_campo=1
      AND e.origem='importacao' AND e.importacao_linha_id=linha_base
      AND e.antes->>'estado'='alvo_ausente' AND e.depois->>'estado'='nulo'
      AND NOT EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo_evento posterior
        WHERE posterior.campo_id=e.campo_id AND posterior.registro_id=e.registro_id
          AND posterior.versao_campo>e.versao_campo)
  );
END $$;
COMMENT ON FUNCTION auditoria_d2_null_captura_comprovada(bigint,bigint,bigint) IS
  'Retorna somente se a linha-base de um reprocessamento idêntico prova NULL importado ainda vigente; não expõe eventos nem valores.';
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION auditoria_d2_null_captura_comprovada(bigint,bigint,bigint)
  OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION auditoria_d2_null_captura_comprovada(bigint,bigint,bigint)
  FROM PUBLIC,ambulatorio_aplicacao,ambulatorio_servico_autenticado,
    ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT EXECUTE ON FUNCTION auditoria_d2_null_captura_comprovada(bigint,bigint,bigint)
  TO ambulatorio_importador;
COMMIT;

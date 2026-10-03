-- Objetivo: habilitar captura temporal de data e observação do atendimento.
-- Impacto: somente estes campos e evento_clinico.ano_evento ficam ativos;
-- não há backfill. Criação temporal exige os campos no plano completo da visita.
-- Reversão: nova migration pode suspender novas revisões, preservando catálogo,
-- eventos e proveniência já existentes.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,
  serializacao_versao,captura_desde)
VALUES
  ('atendimento','data_atendimento','atendimento_id','date','v1',clock_timestamp()),
  ('atendimento','observacoes','atendimento_id','text','v1',clock_timestamp())
ON CONFLICT (tabela_destino,coluna_destino) DO NOTHING;

DO $$
BEGIN
  IF (SELECT count(*) FROM auditoria_campo WHERE captura_desde IS NOT NULL)<>3
    OR NOT EXISTS(SELECT 1 FROM auditoria_campo WHERE tabela_destino='evento_clinico'
      AND coluna_destino='ano_evento' AND coluna_pk='evento_clinico_id'
      AND tipo_sql='integer' AND serializacao_versao='v1' AND captura_desde IS NOT NULL)
    OR NOT EXISTS(SELECT 1 FROM auditoria_campo WHERE tabela_destino='atendimento'
      AND coluna_destino='data_atendimento' AND coluna_pk='atendimento_id'
      AND tipo_sql='date' AND serializacao_versao='v1' AND captura_desde IS NOT NULL)
    OR NOT EXISTS(SELECT 1 FROM auditoria_campo WHERE tabela_destino='atendimento'
      AND coluna_destino='observacoes' AND coluna_pk='atendimento_id'
      AND tipo_sql='text' AND serializacao_versao='v1' AND captura_desde IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='captura_atendimento_catalogo_incompativel';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='ambulatorio.atendimento'::regclass
      AND tgname='auditoria_captura' AND NOT tgisinternal AND tgenabled<>'D')
    OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='ambulatorio.atendimento'::regclass
      AND tgname='auditoria_protecao' AND NOT tgisinternal AND tgenabled<>'D')
    OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='ambulatorio.atendimento'::regclass
      AND tgname='auditoria_protecao_truncate' AND NOT tgisinternal AND tgenabled<>'D') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='captura_atendimento_triggers_ausentes';
  END IF;
END $$;

COMMENT ON COLUMN atendimento.data_atendimento IS
  'Data completa do atendimento informado. A captura temporal habilitada registra apenas alterações posteriores à migration; ano isolado não é convertido em data.';
COMMENT ON COLUMN atendimento.observacoes IS
  'Observação informada para o atendimento; NULL permanece distinto de texto vazio e não autoriza inferência.';
COMMIT;

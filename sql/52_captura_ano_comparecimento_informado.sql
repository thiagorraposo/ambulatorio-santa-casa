-- Objetivo: capturar desde a inclusao os novos anos D8 estruturados.
-- Impacto: somente evento_clinico.ano_evento entra no catalogo ativo; registros
-- anteriores continuam sem prova de cobertura e nao ganham historia retroativa.
-- Reversao: nova migration pode suspender novas revisoes deste destino, preservando
-- o catalogo e todos os eventos ja atribuidos.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,
  serializacao_versao,captura_desde)
VALUES('evento_clinico','ano_evento','evento_clinico_id','integer','v1',clock_timestamp())
ON CONFLICT (tabela_destino,coluna_destino) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auditoria_campo
    WHERE tabela_destino='evento_clinico' AND coluna_destino='ano_evento'
      AND coluna_pk='evento_clinico_id' AND tipo_sql='integer'
      AND serializacao_versao='v1' AND captura_desde IS NOT NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='captura_d8_catalogo_incompativel';
  END IF;
END $$;

COMMENT ON COLUMN evento_clinico.ano_evento IS
  'Ano isolado informado para o tipo ultimo_comparecimento_ano_informado; nao comprova data completa nem visita. Captura temporal apenas para novos fatos apos habilitacao.';
COMMIT;

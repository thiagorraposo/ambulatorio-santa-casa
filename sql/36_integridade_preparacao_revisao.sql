-- Objetivo: usar o estado de staging existente e serializar congelamento/inclusao.
-- Impacto: corrige a preparacao 35; nenhuma ativacao ou DML clinico.
-- Reversao: revogar preparacao em nova migration, preservando evidencias.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
DO $$ DECLARE definicao text;
BEGIN
  definicao:=pg_get_functiondef('ambulatorio.revisao_preparar(bigint,bigint,bigint,text,bigint)'::regprocedure);
  IF strpos(definicao,'status_linha<>''recebida''')=0 THEN
    RAISE EXCEPTION 'Definicao de preparacao inesperada';
  END IF;
  EXECUTE replace(definicao,'status_linha<>''recebida''','status_linha<>''pendente''');
END $$;
CREATE OR REPLACE FUNCTION revisao_proteger_inclusao_bruto() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  -- Antes da verificacao, compartilha o lock da FK. Registro de fonte e
  -- preparacao usam FOR UPDATE no mesmo pai; nao basta verificar antes de esperar.
  PERFORM l.importacao_lote_id FROM ambulatorio.importacao_lote l
    WHERE l.importacao_lote_id=NEW.importacao_lote_id FOR KEY SHARE;
  IF EXISTS (SELECT 1 FROM ambulatorio.importacao_fonte WHERE lote_inicial_id=NEW.importacao_lote_id)
    OR EXISTS (SELECT 1 FROM ambulatorio.importacao_revisao
      WHERE lote_base_id=NEW.importacao_lote_id OR lote_revisado_id=NEW.importacao_lote_id) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_conjunto_linhas_congelado';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION revisao_proteger_inclusao_bruto() FROM PUBLIC,ambulatorio_importador,
  ambulatorio_aplicacao,ambulatorio_servico_autenticado,ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
COMMIT;

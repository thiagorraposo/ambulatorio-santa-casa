-- Objetivo: capturar prospectivamente os campos de AVC longitudinal publicados.
-- Impacto: ativa tipo/ocorrência/descrição/observações de evento_clinico, também
-- para outros tipos existentes; preserva ano_evento desde SQL52 e D8/revisão anual.
-- Não altera fatos legados, não faz backfill, não cria vínculo com atendimento.
-- Reversão: nova migration pode suspender novas escritas/captura destes campos,
-- preservando fatos, catálogo e evidências históricas já produzidas.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM auditoria_campo
      WHERE tabela_destino='evento_clinico' AND coluna_destino='ano_evento'
        AND coluna_pk='evento_clinico_id' AND tipo_sql='integer'
        AND serializacao_versao='v1' AND captura_desde IS NOT NULL)
    OR (SELECT count(*) FROM pg_trigger WHERE tgrelid='ambulatorio.evento_clinico'::regclass
      AND NOT tgisinternal AND tgenabled<>'D'
      AND tgname IN ('auditoria_captura','auditoria_protecao','auditoria_protecao_truncate'))<>3 THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='captura_evento_clinico_precondicao_incompativel';
  END IF;
END $$;

-- Catálogo de auditoria também é consumido pelo executor temporal. A captura
-- dos quatro campos novos não homologa sua revisão. ano_evento fica fora deste
-- guard: seu protocolo anual existente continua disponível sem alteração.
CREATE FUNCTION revisao_bloquear_campos_evento_clinico() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo
      WHERE campo_id=NEW.campo_id AND tabela_destino='evento_clinico'
        AND coluna_destino IN ('tipo_evento','ocorreu','descricao','observacoes')) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_campos_evento_clinico_nao_habilitada';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bloquear_revisao_campos_evento_clinico BEFORE INSERT OR UPDATE ON importacao_revisao_campo
  FOR EACH ROW EXECUTE FUNCTION revisao_bloquear_campos_evento_clinico();
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION revisao_bloquear_campos_evento_clinico() OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION revisao_bloquear_campos_evento_clinico() FROM PUBLIC,
  ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado,
  ambulatorio_revisao_servico,ambulatorio_revisao_gestor;

INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,
  serializacao_versao,captura_desde)
VALUES
  ('evento_clinico','tipo_evento','evento_clinico_id','character varying(100)','v1',transaction_timestamp()),
  ('evento_clinico','ocorreu','evento_clinico_id','boolean','v1',transaction_timestamp()),
  ('evento_clinico','descricao','evento_clinico_id','text','v1',transaction_timestamp()),
  ('evento_clinico','observacoes','evento_clinico_id','text','v1',transaction_timestamp())
ON CONFLICT (tabela_destino,coluna_destino) DO NOTHING;

DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM (VALUES
      ('tipo_evento','character varying(100)'),('ocorreu','boolean'),
      ('descricao','text'),('observacoes','text')) esperado(coluna,tipo)
      WHERE NOT EXISTS(SELECT 1 FROM auditoria_campo c
        WHERE c.tabela_destino='evento_clinico' AND c.coluna_destino=esperado.coluna
          AND c.coluna_pk='evento_clinico_id' AND c.tipo_sql=esperado.tipo
          AND c.serializacao_versao='v1' AND c.captura_desde IS NOT NULL)) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='captura_evento_clinico_catalogo_incompativel';
  END IF;
END $$;

-- Preserva captura compartilhada, resolução, gatilhos e ACLs existentes.
-- D8 já depende de UPDATE de ano_evento pela aplicação; esta unidade não altera
-- essas permissões. A nova API AVC apenas cria/lê e não publica correção.
COMMENT ON FUNCTION revisao_bloquear_campos_evento_clinico() IS
  'Captura dos quatro campos novos não homologa revisão temporal; ano_evento anual permanece sob seu contrato anterior.';
COMMIT;

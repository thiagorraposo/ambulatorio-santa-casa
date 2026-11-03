-- Objetivo: capturar prospectivamente os campos do estado consolidado de óbito.
-- Impacto: captura indicador/data/causa/observações em obito;
-- preserva fatos legados e privilégios, sem alterar SQL10 ou representar implantes.
-- Não altera fatos legados, não faz backfill, não cria vínculo com atendimento.
-- Reversão: nova migration pode suspender novas escritas/captura destes campos,
-- preservando fatos, catálogo e evidências históricas já produzidas.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

DO $$ BEGIN
  IF (SELECT count(*) FROM pg_trigger WHERE tgrelid='ambulatorio.obito'::regclass
    AND NOT tgisinternal AND tgenabled<>'D'
    AND tgname IN ('auditoria_captura','auditoria_protecao','auditoria_protecao_truncate'))<>3 THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='captura_obito_precondicao_incompativel';
  END IF;
END $$;

-- Catálogo de auditoria também é consumido pelo executor temporal. A captura
-- dos quatro campos novos não homologa revisão temporal de estado consolidado.
CREATE FUNCTION revisao_bloquear_campos_obito() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo
      WHERE campo_id=NEW.campo_id AND tabela_destino='obito'
        AND coluna_destino IN ('houve_obito','data_obito','causa_obito','observacoes')) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_campos_obito_nao_habilitada';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bloquear_revisao_campos_obito BEFORE INSERT OR UPDATE ON importacao_revisao_campo
  FOR EACH ROW EXECUTE FUNCTION revisao_bloquear_campos_obito();
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION revisao_bloquear_campos_obito() OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION revisao_bloquear_campos_obito() FROM PUBLIC,
  ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado,
  ambulatorio_revisao_servico,ambulatorio_revisao_gestor;

INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,
  serializacao_versao,captura_desde)
VALUES
  ('obito','houve_obito','obito_id','boolean','v1',transaction_timestamp()),
  ('obito','data_obito','obito_id','date','v1',transaction_timestamp()),
  ('obito','causa_obito','obito_id','text','v1',transaction_timestamp()),
  ('obito','observacoes','obito_id','text','v1',transaction_timestamp())
ON CONFLICT (tabela_destino,coluna_destino) DO NOTHING;

DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM (VALUES
      ('houve_obito','boolean'),('data_obito','date'),('causa_obito','text'),('observacoes','text')) esperado(coluna,tipo)
      WHERE NOT EXISTS(SELECT 1 FROM auditoria_campo c
        WHERE c.tabela_destino='obito' AND c.coluna_destino=esperado.coluna
          AND c.coluna_pk='obito_id' AND c.tipo_sql=esperado.tipo
          AND c.serializacao_versao='v1' AND c.captura_desde IS NOT NULL)) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='captura_obito_catalogo_incompativel';
  END IF;
END $$;

-- Preserva captura compartilhada, resolução, gatilhos e ACLs existentes.
-- A aplicação conserva permissões existentes; a API nova só cria/lê, sem upsert ou correção.
COMMENT ON FUNCTION revisao_bloquear_campos_obito() IS
  'Captura de óbito não homologa revisão temporal nem upsert de estados consolidados.';
COMMIT;

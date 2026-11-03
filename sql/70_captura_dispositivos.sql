-- Objetivo: capturar prospectivamente os campos dos estados consolidados de marcapasso/CDI.
-- Impacto: captura tipo/presença/observações em dispositivo_implantado;
-- preserva fatos legados e privilégios, sem alterar SQL10 ou representar implantes.
-- Não altera fatos legados, não faz backfill, não cria vínculo com atendimento.
-- Reversão: nova migration pode suspender novas escritas/captura destes campos,
-- preservando fatos, catálogo e evidências históricas já produzidas.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

DO $$ BEGIN
  IF (SELECT count(*) FROM pg_trigger WHERE tgrelid='ambulatorio.dispositivo_implantado'::regclass
    AND NOT tgisinternal AND tgenabled<>'D'
    AND tgname IN ('auditoria_captura','auditoria_protecao','auditoria_protecao_truncate'))<>3 THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='captura_dispositivo_precondicao_incompativel';
  END IF;
END $$;

-- Catálogo de auditoria também é consumido pelo executor temporal. A captura
-- dos três campos novos não homologa revisão temporal de estado consolidado.
CREATE FUNCTION revisao_bloquear_campos_dispositivo_implantado() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo
      WHERE campo_id=NEW.campo_id AND tabela_destino='dispositivo_implantado'
        AND coluna_destino IN ('tipo_dispositivo','possui_dispositivo','observacoes')) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_campos_dispositivo_implantado_nao_habilitada';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bloquear_revisao_campos_dispositivo_implantado BEFORE INSERT OR UPDATE ON importacao_revisao_campo
  FOR EACH ROW EXECUTE FUNCTION revisao_bloquear_campos_dispositivo_implantado();
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION revisao_bloquear_campos_dispositivo_implantado() OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION revisao_bloquear_campos_dispositivo_implantado() FROM PUBLIC,
  ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado,
  ambulatorio_revisao_servico,ambulatorio_revisao_gestor;

INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,
  serializacao_versao,captura_desde)
VALUES
  ('dispositivo_implantado','tipo_dispositivo','dispositivo_implantado_id','character varying(100)','v1',transaction_timestamp()),
  ('dispositivo_implantado','possui_dispositivo','dispositivo_implantado_id','boolean','v1',transaction_timestamp()),
  ('dispositivo_implantado','observacoes','dispositivo_implantado_id','text','v1',transaction_timestamp())
ON CONFLICT (tabela_destino,coluna_destino) DO NOTHING;

DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM (VALUES
      ('tipo_dispositivo','character varying(100)'),('possui_dispositivo','boolean'),('observacoes','text')) esperado(coluna,tipo)
      WHERE NOT EXISTS(SELECT 1 FROM auditoria_campo c
        WHERE c.tabela_destino='dispositivo_implantado' AND c.coluna_destino=esperado.coluna
          AND c.coluna_pk='dispositivo_implantado_id' AND c.tipo_sql=esperado.tipo
          AND c.serializacao_versao='v1' AND c.captura_desde IS NOT NULL)) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='captura_dispositivo_implantado_catalogo_incompativel';
  END IF;
END $$;

-- Preserva captura compartilhada, resolução, gatilhos e ACLs existentes.
-- A aplicação conserva permissões existentes; a API nova só cria/lê, sem upsert ou correção.
COMMENT ON FUNCTION revisao_bloquear_campos_dispositivo_implantado() IS
  'Captura de dispositivo não homologa revisão temporal nem upsert de estados consolidados.';
COMMIT;

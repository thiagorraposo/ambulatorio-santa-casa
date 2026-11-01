-- Objetivo: capturar prospectivamente complicações repetíveis por atendimento.
-- Impacto: reutiliza SQL06, seus quatro campos/domínios e a FK para atendimento;
-- não altera legado, não faz backfill nem habilita edição/revisão temporal.
-- Reversão: somente nova migration para suspender futuras escritas/captura,
-- preservando os registros e eventos históricos já produzidos.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

-- Preserva a resolução vigente da SQL66 e acrescenta somente o novo alvo.
-- A captura compartilhada, incluindo correção TRUNCATE e patches 39/42, não muda.
CREATE OR REPLACE FUNCTION revisao_alvo_paciente(tabela text, registro bigint) RETURNS bigint
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, ambulatorio, pg_temp AS $$
DECLARE p bigint; pk text;
BEGIN
    IF tabela NOT IN ('paciente','atendimento','paciente_endereco','paciente_contato',
        'paciente_projeto_estudo','paciente_exame_complementar','tratamento_benzonidazol',
        'pendencia_atendimento','dados_clinicos_atendimento','diagnostico_chagas',
        'encaminhamento','acompanhamento_cuidado','evento_clinico','dispositivo_implantado',
        'notificacao','obito','tratamento_chagas','sorologia_chagas','condicao_chagas','complicacao_chagas') THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_destino_nao_homologado';
    END IF;
    SELECT a.attname INTO STRICT pk FROM pg_index i
      JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=i.indkey[0]
      WHERE i.indrelid=to_regclass('ambulatorio.'||tabela) AND i.indisprimary AND i.indnkeyatts=1;
    IF tabela = 'paciente' THEN
        SELECT paciente_id INTO p FROM ambulatorio.paciente WHERE paciente_id=registro;
    ELSIF tabela = 'sorologia_chagas' THEN
        SELECT a.paciente_id INTO p FROM ambulatorio.sorologia_chagas s
          JOIN ambulatorio.diagnostico_chagas d USING(diagnostico_chagas_id)
          JOIN ambulatorio.atendimento a USING(atendimento_id)
          WHERE s.sorologia_chagas_id=registro;
    ELSIF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('ambulatorio.'||tabela)
                 AND attname='paciente_id' AND NOT attisdropped) THEN
        EXECUTE format('SELECT paciente_id FROM ambulatorio.%I WHERE %I=$1',tabela,pk) INTO p USING registro;
    ELSE
        EXECUTE format('SELECT a.paciente_id FROM ambulatorio.%I t JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE t.%I=$1',
                       tabela,pk) INTO p USING registro;
    END IF;
    IF p IS NULL THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_alvo_ausente';
    END IF;
    RETURN p;
END $$;


-- Auditoria compartilha catálogo com revisão; captura não aprova novo alvo
-- para revisão temporal. O guard anterior de sorologias permanece intacto.
CREATE FUNCTION revisao_bloquear_complicacao_chagas() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo
      WHERE campo_id=NEW.campo_id AND tabela_destino='complicacao_chagas') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_complicacao_chagas_nao_habilitada';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bloquear_revisao_complicacao_chagas BEFORE INSERT OR UPDATE ON importacao_revisao_campo
  FOR EACH ROW EXECUTE FUNCTION revisao_bloquear_complicacao_chagas();
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION revisao_bloquear_complicacao_chagas() OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION revisao_bloquear_complicacao_chagas() FROM PUBLIC,
  ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado,
  ambulatorio_revisao_servico,ambulatorio_revisao_gestor;

INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,
  serializacao_versao,captura_desde)
VALUES
  ('complicacao_chagas','tipo_complicacao','complicacao_chagas_id','character varying(80)','v1',transaction_timestamp()),
  ('complicacao_chagas','possui_complicacao','complicacao_chagas_id','boolean','v1',transaction_timestamp()),
  ('complicacao_chagas','descricao','complicacao_chagas_id','text','v1',transaction_timestamp()),
  ('complicacao_chagas','gravidade','complicacao_chagas_id','character varying(30)','v1',transaction_timestamp())
ON CONFLICT (tabela_destino,coluna_destino) DO NOTHING;

DO $$
BEGIN
  IF (SELECT count(*) FROM auditoria_campo WHERE tabela_destino='complicacao_chagas')<>4
    OR EXISTS(SELECT 1 FROM (VALUES
      ('tipo_complicacao','character varying(80)'),('possui_complicacao','boolean'),
      ('descricao','text'),('gravidade','character varying(30)')) esperado(coluna,tipo)
      WHERE NOT EXISTS(SELECT 1 FROM auditoria_campo c
        WHERE c.tabela_destino='complicacao_chagas' AND c.coluna_destino=esperado.coluna
          AND c.coluna_pk='complicacao_chagas_id' AND c.tipo_sql=esperado.tipo
          AND c.serializacao_versao='v1' AND c.captura_desde IS NOT NULL)) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='captura_complicacao_chagas_catalogo_incompativel';
  END IF;
END $$;

GRANT SELECT ON complicacao_chagas TO ambulatorio_auditoria_owner;
CREATE TRIGGER auditoria_captura AFTER INSERT OR UPDATE ON complicacao_chagas
  FOR EACH ROW EXECUTE FUNCTION auditoria_capturar();
CREATE TRIGGER auditoria_protecao BEFORE DELETE ON complicacao_chagas
  FOR EACH ROW EXECUTE FUNCTION auditoria_capturar();
CREATE TRIGGER auditoria_protecao_truncate BEFORE TRUNCATE ON complicacao_chagas
  FOR EACH STATEMENT EXECUTE FUNCTION auditoria_capturar();

-- Ocorrências repetíveis, sem edição pela aplicação; importador conserva seus grants.
REVOKE UPDATE,DELETE,TRUNCATE ON complicacao_chagas FROM ambulatorio_aplicacao;
GRANT SELECT,INSERT ON complicacao_chagas TO ambulatorio_aplicacao;
REVOKE SELECT ON SEQUENCE complicacao_chagas_complicacao_chagas_id_seq FROM ambulatorio_aplicacao;
GRANT USAGE ON SEQUENCE complicacao_chagas_complicacao_chagas_id_seq TO ambulatorio_aplicacao;

COMMENT ON FUNCTION revisao_bloquear_complicacao_chagas() IS
  'Captura auditável da complicação não habilita planos de revisão temporal; semântica de correção permanece separada.';
COMMIT;

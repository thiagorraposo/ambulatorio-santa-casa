-- Objetivo: captura prospectiva de ocorrências de reação ao tratamento BZN canônico.
-- Impacto: estende somente resolução paciente pela FK e instala captura em SQL15.
-- Preserva legado, ACLs, capturador e tratamento; sem backfill ou revisão temporal.
-- Reversão: nova migration suspendendo novas escritas, preservando fatos/eventos.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
CREATE OR REPLACE FUNCTION revisao_alvo_paciente(tabela text, registro bigint) RETURNS bigint
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, ambulatorio, pg_temp AS $$
DECLARE p bigint; pk text;
BEGIN
    IF tabela NOT IN ('paciente','atendimento','paciente_endereco','paciente_contato',
        'paciente_projeto_estudo','paciente_exame_complementar','tratamento_benzonidazol',
        'pendencia_atendimento','dados_clinicos_atendimento','diagnostico_chagas',
        'encaminhamento','acompanhamento_cuidado','evento_clinico','dispositivo_implantado',
        'notificacao','obito','tratamento_chagas','sorologia_chagas','condicao_chagas','complicacao_chagas',
        'avaliacao_comorbidades','avaliacao_comorbidade_item','reacao_adversa_benzonidazol') THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_destino_nao_homologado';
    END IF;
    SELECT a.attname INTO STRICT pk FROM pg_index i
      JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=i.indkey[0]
      WHERE i.indrelid=to_regclass('ambulatorio.'||tabela) AND i.indisprimary AND i.indnkeyatts=1;
    IF tabela = 'paciente' THEN
        SELECT paciente_id INTO p FROM ambulatorio.paciente WHERE paciente_id=registro;
    ELSIF tabela = 'reacao_adversa_benzonidazol' THEN
        SELECT t.paciente_id INTO p FROM ambulatorio.reacao_adversa_benzonidazol r
          JOIN ambulatorio.tratamento_benzonidazol t USING(tratamento_benzonidazol_id)
          WHERE r.reacao_adversa_benzonidazol_id=registro;
    ELSIF tabela = 'sorologia_chagas' THEN
        SELECT a.paciente_id INTO p FROM ambulatorio.sorologia_chagas s
          JOIN ambulatorio.diagnostico_chagas d USING(diagnostico_chagas_id)
          JOIN ambulatorio.atendimento a USING(atendimento_id)
          WHERE s.sorologia_chagas_id=registro;
    ELSIF tabela = 'avaliacao_comorbidade_item' THEN
        SELECT a.paciente_id INTO p FROM ambulatorio.avaliacao_comorbidade_item i
          JOIN ambulatorio.avaliacao_comorbidades v USING(avaliacao_comorbidades_id)
          JOIN ambulatorio.atendimento a USING(atendimento_id) WHERE i.item_id=registro;
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

CREATE FUNCTION revisao_bloquear_reacoes_bzn() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo
      WHERE campo_id=NEW.campo_id AND tabela_destino='reacao_adversa_benzonidazol') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_reacoes_bzn_nao_habilitada';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bloquear_revisao_reacoes_bzn BEFORE INSERT OR UPDATE ON importacao_revisao_campo
  FOR EACH ROW EXECUTE FUNCTION revisao_bloquear_reacoes_bzn();
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION revisao_bloquear_reacoes_bzn() OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION revisao_bloquear_reacoes_bzn() FROM PUBLIC,
  ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado,
  ambulatorio_revisao_servico,ambulatorio_revisao_gestor;

INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao,captura_desde)
VALUES
 ('reacao_adversa_benzonidazol','descricao','reacao_adversa_benzonidazol_id','text','v1',transaction_timestamp()),
 ('reacao_adversa_benzonidazol','gravidade','reacao_adversa_benzonidazol_id','text','v1',transaction_timestamp()),
 ('reacao_adversa_benzonidazol','data_reacao','reacao_adversa_benzonidazol_id','date','v1',transaction_timestamp()),
 ('reacao_adversa_benzonidazol','consequencia','reacao_adversa_benzonidazol_id','text','v1',transaction_timestamp()),
 ('reacao_adversa_benzonidazol','observacoes','reacao_adversa_benzonidazol_id','text','v1',transaction_timestamp());
GRANT SELECT ON reacao_adversa_benzonidazol TO ambulatorio_auditoria_owner;
CREATE TRIGGER auditoria_captura AFTER INSERT OR UPDATE ON reacao_adversa_benzonidazol
  FOR EACH ROW EXECUTE FUNCTION auditoria_capturar();
CREATE TRIGGER auditoria_protecao BEFORE DELETE ON reacao_adversa_benzonidazol
  FOR EACH ROW EXECUTE FUNCTION auditoria_capturar();
CREATE TRIGGER auditoria_protecao_truncate BEFORE TRUNCATE ON reacao_adversa_benzonidazol
  FOR EACH STATEMENT EXECUTE FUNCTION auditoria_capturar();
COMMIT;

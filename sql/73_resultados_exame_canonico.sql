-- Objetivo: parâmetros humanos repetíveis no exame canônico do paciente (H6).
-- Impacto: nova tabela filha; preserva SQL07 legado, pai, ACLs antigas e importador.
-- Sem interpretação, unidade, cronologia, backfill ou revisão temporal inferidos.
-- Reversão: nova migration suspendendo escritas, preservando fatos e evidências.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
CREATE TABLE paciente_exame_resultado (
  resultado_id BIGSERIAL PRIMARY KEY,
  paciente_exame_complementar_id BIGINT NOT NULL REFERENCES paciente_exame_complementar ON DELETE RESTRICT,
  nome_parametro TEXT NOT NULL CHECK(length(nome_parametro)<=120 AND nome_parametro ~ '[^[:space:]]'),
  valor_informado TEXT CHECK(length(valor_informado)<=10000),
  unidade_informada TEXT CHECK(length(unidade_informada)<=10000),
  referencia_informada TEXT CHECK(length(referencia_informada)<=10000),
  interpretacao_informada TEXT CHECK(length(interpretacao_informada)<=10000),
  observacoes TEXT CHECK(length(observacoes)<=10000),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_resultado_exame_canonico ON paciente_exame_resultado(paciente_exame_complementar_id,resultado_id DESC);
COMMENT ON TABLE paciente_exame_resultado IS
  'Parâmetros informados por humano no exame canônico; sem interpretação automática ou conversão do legado SQL07.';
CREATE OR REPLACE FUNCTION revisao_alvo_paciente(tabela text, registro bigint) RETURNS bigint
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, ambulatorio, pg_temp AS $$
DECLARE p bigint; pk text;
BEGIN
    IF tabela NOT IN ('paciente','atendimento','paciente_endereco','paciente_contato',
        'paciente_projeto_estudo','paciente_exame_complementar','tratamento_benzonidazol',
        'pendencia_atendimento','dados_clinicos_atendimento','diagnostico_chagas',
        'encaminhamento','acompanhamento_cuidado','evento_clinico','dispositivo_implantado',
        'notificacao','obito','tratamento_chagas','sorologia_chagas','condicao_chagas','complicacao_chagas',
        'avaliacao_comorbidades','avaliacao_comorbidade_item','reacao_adversa_benzonidazol','paciente_exame_resultado') THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='revisao_destino_nao_homologado';
    END IF;
    SELECT a.attname INTO STRICT pk FROM pg_index i
      JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=i.indkey[0]
      WHERE i.indrelid=to_regclass('ambulatorio.'||tabela) AND i.indisprimary AND i.indnkeyatts=1;
    IF tabela = 'paciente' THEN
        SELECT paciente_id INTO p FROM ambulatorio.paciente WHERE paciente_id=registro;
    ELSIF tabela = 'paciente_exame_resultado' THEN
        SELECT e.paciente_id INTO p FROM ambulatorio.paciente_exame_resultado r
          JOIN ambulatorio.paciente_exame_complementar e USING(paciente_exame_complementar_id)
          WHERE r.resultado_id=registro;
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
CREATE FUNCTION revisao_bloquear_resultados_canonicos() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo
      WHERE campo_id=NEW.campo_id AND tabela_destino='paciente_exame_resultado') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_resultados_canonicos_nao_habilitada';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bloquear_revisao_resultados_canonicos BEFORE INSERT OR UPDATE ON importacao_revisao_campo
  FOR EACH ROW EXECUTE FUNCTION revisao_bloquear_resultados_canonicos();
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION revisao_bloquear_resultados_canonicos() OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION revisao_bloquear_resultados_canonicos() FROM PUBLIC,
  ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado,
  ambulatorio_revisao_servico,ambulatorio_revisao_gestor;

INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao,captura_desde)
VALUES
 ('paciente_exame_resultado','nome_parametro','resultado_id','text','v1',transaction_timestamp()),
 ('paciente_exame_resultado','valor_informado','resultado_id','text','v1',transaction_timestamp()),
 ('paciente_exame_resultado','unidade_informada','resultado_id','text','v1',transaction_timestamp()),
 ('paciente_exame_resultado','referencia_informada','resultado_id','text','v1',transaction_timestamp()),
 ('paciente_exame_resultado','interpretacao_informada','resultado_id','text','v1',transaction_timestamp()),
 ('paciente_exame_resultado','observacoes','resultado_id','text','v1',transaction_timestamp());
CREATE TRIGGER auditoria_captura AFTER INSERT OR UPDATE ON paciente_exame_resultado
  FOR EACH ROW EXECUTE FUNCTION auditoria_capturar();
CREATE TRIGGER auditoria_protecao BEFORE DELETE ON paciente_exame_resultado
  FOR EACH ROW EXECUTE FUNCTION auditoria_capturar();
CREATE TRIGGER auditoria_protecao_truncate BEFORE TRUNCATE ON paciente_exame_resultado
  FOR EACH STATEMENT EXECUTE FUNCTION auditoria_capturar();
REVOKE ALL ON paciente_exame_resultado FROM PUBLIC,ambulatorio_aplicacao,ambulatorio_importador,
  ambulatorio_servico_autenticado,ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT SELECT ON paciente_exame_resultado TO ambulatorio_auditoria_owner;
GRANT SELECT,INSERT ON paciente_exame_resultado TO ambulatorio_aplicacao;
REVOKE ALL ON SEQUENCE paciente_exame_resultado_resultado_id_seq FROM PUBLIC,ambulatorio_aplicacao,
  ambulatorio_importador,ambulatorio_servico_autenticado,ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT USAGE ON SEQUENCE paciente_exame_resultado_resultado_id_seq TO ambulatorio_aplicacao;
COMMIT;

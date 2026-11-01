-- Objetivo: avaliações independentes de comorbidades e histórico familiar por consulta.
-- Impacto: novas tabelas; legado paciente_comorbidade/importador permanece intacto.
-- Sem backfill, propagação de diagnóstico ou autorização de revisão temporal.
-- Reversão: nova migration suspendendo novas escritas, sem apagar snapshots/eventos.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;
CREATE TABLE avaliacao_comorbidades (
  avaliacao_comorbidades_id BIGSERIAL PRIMARY KEY,
  atendimento_id BIGINT NOT NULL UNIQUE REFERENCES atendimento(atendimento_id) ON DELETE RESTRICT,
  historico_familiar_avaliado BOOLEAN NOT NULL,
  possui_doenca_familiar BOOLEAN,
  descricao_historico_familiar TEXT CHECK(length(descricao_historico_familiar)<=10000),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT historico_nao_avaliado_sem_conteudo CHECK(historico_familiar_avaliado OR
    (possui_doenca_familiar IS NULL AND descricao_historico_familiar IS NULL))
);
CREATE TABLE avaliacao_comorbidade_item (
  item_id BIGSERIAL PRIMARY KEY,
  avaliacao_comorbidades_id BIGINT NOT NULL REFERENCES avaliacao_comorbidades ON DELETE RESTRICT,
  comorbidade_id BIGINT NOT NULL REFERENCES comorbidade ON DELETE RESTRICT,
  nome_comorbidade VARCHAR(120) NOT NULL,
  possui_comorbidade BOOLEAN,
  observacoes TEXT CHECK(length(observacoes)<=10000),
  CONSTRAINT uq_avaliacao_comorbidade_item UNIQUE(avaliacao_comorbidades_id,comorbidade_id)
);
CREATE INDEX idx_avaliacao_item_catalogo ON avaliacao_comorbidade_item(comorbidade_id);
COMMENT ON TABLE avaliacao_comorbidades IS
  'Snapshot próprio do atendimento; ausência de bloco familiar difere de desconhecido explícito. Sem inferência do legado.';
COMMENT ON TABLE avaliacao_comorbidade_item IS
  'Item avaliado explicitamente; null desconhecido, false negativa, ausência não avaliada. Nome copiado na gravação.';
CREATE OR REPLACE FUNCTION revisao_alvo_paciente(tabela text, registro bigint) RETURNS bigint
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, ambulatorio, pg_temp AS $$
DECLARE p bigint; pk text;
BEGIN
    IF tabela NOT IN ('paciente','atendimento','paciente_endereco','paciente_contato',
        'paciente_projeto_estudo','paciente_exame_complementar','tratamento_benzonidazol',
        'pendencia_atendimento','dados_clinicos_atendimento','diagnostico_chagas',
        'encaminhamento','acompanhamento_cuidado','evento_clinico','dispositivo_implantado',
        'notificacao','obito','tratamento_chagas','sorologia_chagas','condicao_chagas','complicacao_chagas',
        'avaliacao_comorbidades','avaliacao_comorbidade_item') THEN
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



CREATE FUNCTION revisao_bloquear_avaliacao_comorbidades() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo WHERE campo_id=NEW.campo_id
      AND tabela_destino IN ('avaliacao_comorbidades','avaliacao_comorbidade_item')) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_avaliacao_comorbidades_nao_habilitada';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bloquear_revisao_avaliacao_comorbidades BEFORE INSERT OR UPDATE ON importacao_revisao_campo
  FOR EACH ROW EXECUTE FUNCTION revisao_bloquear_avaliacao_comorbidades();
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION revisao_bloquear_avaliacao_comorbidades() OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION revisao_bloquear_avaliacao_comorbidades() FROM PUBLIC,
  ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado,
  ambulatorio_revisao_servico,ambulatorio_revisao_gestor;

INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao,captura_desde)
VALUES
 ('avaliacao_comorbidades','historico_familiar_avaliado','avaliacao_comorbidades_id','boolean','v1',transaction_timestamp()),
 ('avaliacao_comorbidades','possui_doenca_familiar','avaliacao_comorbidades_id','boolean','v1',transaction_timestamp()),
 ('avaliacao_comorbidades','descricao_historico_familiar','avaliacao_comorbidades_id','text','v1',transaction_timestamp()),
 ('avaliacao_comorbidade_item','comorbidade_id','item_id','bigint','v1',transaction_timestamp()),
 ('avaliacao_comorbidade_item','nome_comorbidade','item_id','character varying(120)','v1',transaction_timestamp()),
 ('avaliacao_comorbidade_item','possui_comorbidade','item_id','boolean','v1',transaction_timestamp()),
 ('avaliacao_comorbidade_item','observacoes','item_id','text','v1',transaction_timestamp());

GRANT SELECT ON avaliacao_comorbidades,avaliacao_comorbidade_item TO ambulatorio_auditoria_owner;
CREATE TRIGGER auditoria_captura AFTER INSERT OR UPDATE ON avaliacao_comorbidades
  FOR EACH ROW EXECUTE FUNCTION auditoria_capturar();
CREATE TRIGGER auditoria_protecao BEFORE DELETE ON avaliacao_comorbidades
  FOR EACH ROW EXECUTE FUNCTION auditoria_capturar();
CREATE TRIGGER auditoria_protecao_truncate BEFORE TRUNCATE ON avaliacao_comorbidades
  FOR EACH STATEMENT EXECUTE FUNCTION auditoria_capturar();
CREATE TRIGGER auditoria_captura AFTER INSERT OR UPDATE ON avaliacao_comorbidade_item
  FOR EACH ROW EXECUTE FUNCTION auditoria_capturar();
CREATE TRIGGER auditoria_protecao BEFORE DELETE ON avaliacao_comorbidade_item
  FOR EACH ROW EXECUTE FUNCTION auditoria_capturar();
CREATE TRIGGER auditoria_protecao_truncate BEFORE TRUNCATE ON avaliacao_comorbidade_item
  FOR EACH STATEMENT EXECUTE FUNCTION auditoria_capturar();
-- Revogar defaults amplos: apenas aplicação insere; importador não usa este modelo.
REVOKE ALL ON avaliacao_comorbidades,avaliacao_comorbidade_item FROM PUBLIC,
  ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado,
  ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT SELECT ON avaliacao_comorbidades,avaliacao_comorbidade_item TO ambulatorio_auditoria_owner;
GRANT SELECT,INSERT ON avaliacao_comorbidades,avaliacao_comorbidade_item TO ambulatorio_aplicacao;
REVOKE ALL ON SEQUENCE avaliacao_comorbidades_avaliacao_comorbidades_id_seq,
  avaliacao_comorbidade_item_item_id_seq FROM PUBLIC,ambulatorio_aplicacao,ambulatorio_importador,
  ambulatorio_servico_autenticado,ambulatorio_revisao_servico,ambulatorio_revisao_gestor;
GRANT USAGE ON SEQUENCE avaliacao_comorbidades_avaliacao_comorbidades_id_seq,
  avaliacao_comorbidade_item_item_id_seq TO ambulatorio_aplicacao;
COMMIT;

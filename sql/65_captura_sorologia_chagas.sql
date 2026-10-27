-- Objetivo: capturar prospectivamente episódios individuais de sorologia Chagas.
-- Impacto: reutiliza a tabela existente e a auditoria atribuível; não preenche
-- legado, interpreta resultado, altera descoberta ou habilita revisão temporal.
-- Reversão: nova migration pode suspender novas escritas/revisões, preservando
-- episódios, proveniência e eventos já capturados. Não apagar a história.
\set ON_ERROR_STOP on
BEGIN;
SET search_path TO ambulatorio, public;

-- Sorologia pertence ao diagnóstico de uma consulta, e não diretamente ao
-- paciente. Os demais caminhos homologados permanecem iguais aos da SQL22.
CREATE OR REPLACE FUNCTION revisao_alvo_paciente(tabela text, registro bigint) RETURNS bigint
LANGUAGE plpgsql STABLE SET search_path = pg_catalog, ambulatorio, pg_temp AS $$
DECLARE p bigint; pk text;
BEGIN
    IF tabela NOT IN ('paciente','atendimento','paciente_endereco','paciente_contato',
        'paciente_projeto_estudo','paciente_exame_complementar','tratamento_benzonidazol',
        'pendencia_atendimento','dados_clinicos_atendimento','diagnostico_chagas',
        'encaminhamento','acompanhamento_cuidado','evento_clinico','dispositivo_implantado',
        'notificacao','obito','tratamento_chagas','sorologia_chagas') THEN
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

-- Captura e publicação de revisão compartilham o catálogo físico. Registrar
-- estes campos para auditoria não concede autorização de revisão temporal.
CREATE FUNCTION revisao_bloquear_sorologia() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,ambulatorio,pg_temp AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo
      WHERE campo_id=NEW.campo_id AND tabela_destino='sorologia_chagas') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='revisao_sorologia_nao_habilitada';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bloquear_revisao_sorologia BEFORE INSERT OR UPDATE ON importacao_revisao_campo
  FOR EACH ROW EXECUTE FUNCTION revisao_bloquear_sorologia();
GRANT CREATE ON SCHEMA ambulatorio TO ambulatorio_auditoria_owner;
ALTER FUNCTION revisao_bloquear_sorologia() OWNER TO ambulatorio_auditoria_owner;
REVOKE CREATE ON SCHEMA ambulatorio FROM ambulatorio_auditoria_owner;
REVOKE ALL ON FUNCTION revisao_bloquear_sorologia() FROM PUBLIC,
  ambulatorio_aplicacao,ambulatorio_importador,ambulatorio_servico_autenticado,
  ambulatorio_revisao_servico,ambulatorio_revisao_gestor;

INSERT INTO auditoria_campo(tabela_destino,coluna_destino,coluna_pk,tipo_sql,
  serializacao_versao,captura_desde)
VALUES
  ('sorologia_chagas','metodo_sorologico','sorologia_chagas_id','character varying(120)','v1',transaction_timestamp()),
  ('sorologia_chagas','data_solicitacao','sorologia_chagas_id','date','v1',transaction_timestamp()),
  ('sorologia_chagas','data_coleta','sorologia_chagas_id','date','v1',transaction_timestamp()),
  ('sorologia_chagas','data_resultado','sorologia_chagas_id','date','v1',transaction_timestamp()),
  ('sorologia_chagas','resultado','sorologia_chagas_id','character varying(30)','v1',transaction_timestamp()),
  ('sorologia_chagas','laboratorio','sorologia_chagas_id','character varying(120)','v1',transaction_timestamp()),
  ('sorologia_chagas','observacoes','sorologia_chagas_id','text','v1',transaction_timestamp())
ON CONFLICT (tabela_destino,coluna_destino) DO NOTHING;

DO $$
BEGIN
  IF (SELECT count(*) FROM auditoria_campo WHERE tabela_destino='sorologia_chagas')<>7
    OR EXISTS(SELECT 1 FROM (VALUES
      ('metodo_sorologico','character varying(120)'),('data_solicitacao','date'),
      ('data_coleta','date'),('data_resultado','date'),('resultado','character varying(30)'),
      ('laboratorio','character varying(120)'),('observacoes','text')) esperado(coluna,tipo)
      WHERE NOT EXISTS(SELECT 1 FROM auditoria_campo c
        WHERE c.tabela_destino='sorologia_chagas' AND c.coluna_destino=esperado.coluna
          AND c.coluna_pk='sorologia_chagas_id' AND c.tipo_sql=esperado.tipo
          AND c.serializacao_versao='v1' AND c.captura_desde IS NOT NULL)) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='captura_sorologia_catalogo_incompativel';
  END IF;
END $$;

GRANT SELECT ON sorologia_chagas TO ambulatorio_auditoria_owner;
CREATE TRIGGER auditoria_captura AFTER INSERT OR UPDATE ON sorologia_chagas
  FOR EACH ROW EXECUTE FUNCTION auditoria_capturar();
CREATE TRIGGER auditoria_protecao BEFORE DELETE ON sorologia_chagas
  FOR EACH ROW EXECUTE FUNCTION auditoria_capturar();
CREATE TRIGGER auditoria_protecao_truncate BEFORE TRUNCATE ON sorologia_chagas
  FOR EACH STATEMENT EXECUTE FUNCTION auditoria_capturar();

-- A API nova cria/consulta, mas não corrige nem apaga episódios. O importador
-- conserva suas concessões próprias, com contexto e proveniência obrigatórios.
REVOKE UPDATE,DELETE,TRUNCATE ON sorologia_chagas FROM ambulatorio_aplicacao;
GRANT SELECT,INSERT ON sorologia_chagas TO ambulatorio_aplicacao;
REVOKE SELECT ON SEQUENCE sorologia_chagas_sorologia_chagas_id_seq FROM ambulatorio_aplicacao;
GRANT USAGE ON SEQUENCE sorologia_chagas_sorologia_chagas_id_seq TO ambulatorio_aplicacao;

COMMENT ON FUNCTION revisao_bloquear_sorologia() IS
  'A captura auditável de sorologia não habilita planos de revisão temporal; contrato de correção permanece separado.';
COMMIT;

-- Hardening pre-dados reais: rastreabilidade de lotes e roles sem login.
-- Impacto: aditivo; nao altera nem remove dados existentes.
-- Reversao: nova migration explicita, pois remover colunas/roles seria destrutivo.

SET search_path TO ambulatorio, public;

ALTER TABLE importacao_lote
    ADD COLUMN manifesto_sha256 VARCHAR(64),
    ADD COLUMN importador_versao VARCHAR(40),
    ADD COLUMN revisao_git VARCHAR(40),
    ADD CONSTRAINT chk_importacao_lote_manifesto_sha256
        CHECK (manifesto_sha256 IS NULL OR manifesto_sha256 ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT chk_importacao_lote_importador_versao
        CHECK (importador_versao IS NULL OR btrim(importador_versao) <> ''),
    ADD CONSTRAINT chk_importacao_lote_revisao_git
        CHECK (revisao_git IS NULL OR revisao_git = 'unknown' OR revisao_git ~ '^[0-9a-f]{7,40}$');

COMMENT ON COLUMN importacao_lote.manifesto_sha256 IS
'SHA-256 da representacao canonica do manifesto usado na execucao.';
COMMENT ON COLUMN importacao_lote.importador_versao IS
'Versao semantica declarada pelo importador.';
COMMENT ON COLUMN importacao_lote.revisao_git IS
'Revisao Git do codigo executado, ou unknown quando indisponivel.';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ambulatorio_importador') THEN
        CREATE ROLE ambulatorio_importador NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ambulatorio_aplicacao') THEN
        CREATE ROLE ambulatorio_aplicacao NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    END IF;
END
$$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA ambulatorio FROM PUBLIC;
GRANT USAGE ON SCHEMA ambulatorio TO ambulatorio_importador, ambulatorio_aplicacao;

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA ambulatorio TO ambulatorio_importador;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ambulatorio TO ambulatorio_importador;

GRANT SELECT, INSERT, UPDATE ON
    paciente, paciente_endereco, paciente_contato, atendimento,
    projeto_estudo, atendimento_projeto_estudo, diagnostico_chagas,
    sorologia_chagas, sorologia_solicitacao, historico_familiar_chagas,
    condicao_chagas, complicacao_chagas, comorbidade, paciente_comorbidade,
    tipo_exame_complementar, atendimento_exame_complementar,
    exame_complementar_resultado, tipo_encaminhamento, encaminhamento,
    acompanhamento_cuidado, pendencia_atendimento, medicamento,
    atendimento_medicamento, tratamento_chagas, procedimento_clinico,
    dados_clinicos_atendimento, evento_clinico, dispositivo_implantado,
    obito, notificacao, paciente_projeto_estudo,
    paciente_exame_complementar, tratamento_benzonidazol,
    reacao_adversa_benzonidazol
TO ambulatorio_aplicacao;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ambulatorio TO ambulatorio_aplicacao;

ALTER DEFAULT PRIVILEGES IN SCHEMA ambulatorio
    GRANT SELECT, INSERT, UPDATE ON TABLES TO ambulatorio_importador;
ALTER DEFAULT PRIVILEGES IN SCHEMA ambulatorio
    GRANT USAGE, SELECT ON SEQUENCES TO ambulatorio_importador;

DO $$
BEGIN
    EXECUTE format('GRANT ambulatorio_importador, ambulatorio_aplicacao TO %I', current_user);
END
$$;


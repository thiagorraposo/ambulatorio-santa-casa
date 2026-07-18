-- ============================================================
-- Projeto: Ambulatorio Santa Casa
-- Arquivo: 10_modulo_avaliacao_clinica.sql
-- Finalidade:
--   Criar o modulo incremental de avaliacao clinica por
--   atendimento, eventos, dispositivos implantados e obito.
--
-- Impacto:
--   Adiciona quatro tabelas dependentes de atendimento ou
--   paciente, sem importar dados e sem alterar migrations antigas.
--
-- Como executar:
--   psql -X -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -v ON_ERROR_STOP=1 -f sql/10_modulo_avaliacao_clinica.sql
--
-- Estrategia de reversao (executar somente com autorizacao):
--   DROP TABLE ambulatorio.obito;
--   DROP TABLE ambulatorio.dispositivo_implantado;
--   DROP TABLE ambulatorio.evento_clinico;
--   DROP TABLE ambulatorio.dados_clinicos_atendimento;
-- ============================================================

SET search_path TO ambulatorio, public;

CREATE TABLE dados_clinicos_atendimento (
    dados_clinicos_atendimento_id BIGSERIAL PRIMARY KEY,
    atendimento_id BIGINT NOT NULL,
    altura_cm NUMERIC(5,2),
    peso_kg NUMERIC(5,2),
    circunferencia_abdominal_cm NUMERIC(5,2),
    frequencia_cardiaca_bpm INTEGER,
    saturacao_percentual NUMERIC(5,2),
    pa_sistolica_mmhg INTEGER,
    pa_diastolica_mmhg INTEGER,
    nyha VARCHAR(20),
    valor_original_altura TEXT,
    valor_original_peso TEXT,
    valor_original_circunferencia_abdominal TEXT,
    valor_original_frequencia_cardiaca TEXT,
    valor_original_saturacao TEXT,
    valor_original_pa_sistolica TEXT,
    valor_original_pa_diastolica TEXT,
    valor_original_nyha TEXT,
    observacoes TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_dados_clinicos_atendimento_atendimento
        FOREIGN KEY (atendimento_id)
        REFERENCES atendimento (atendimento_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_dados_clinicos_atendimento_atendimento
        UNIQUE (atendimento_id)
);

COMMENT ON TABLE dados_clinicos_atendimento IS
'Avaliacao objetiva consolidada produzida em um atendimento.';
COMMENT ON COLUMN dados_clinicos_atendimento.atendimento_id IS
'Atendimento que produziu a avaliacao; permite no maximo uma avaliacao por atendimento.';
COMMENT ON COLUMN dados_clinicos_atendimento.nyha IS
'Classificacao funcional em texto ainda sem dominio fechado.';

CREATE TABLE evento_clinico (
    evento_clinico_id BIGSERIAL PRIMARY KEY,
    paciente_id BIGINT NOT NULL,
    tipo_evento VARCHAR(100) NOT NULL,
    ocorreu BOOLEAN,
    ano_evento INTEGER,
    descricao TEXT,
    valor_original_ocorrencia TEXT,
    valor_original_data TEXT,
    valor_original_descricao TEXT,
    observacoes TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_evento_clinico_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES paciente (paciente_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_evento_clinico_paciente_tipo
    ON evento_clinico (paciente_id, tipo_evento);

COMMENT ON TABLE evento_clinico IS
'Eventos clinicos longitudinais positivos, negativos ou desconhecidos do paciente.';
COMMENT ON COLUMN evento_clinico.ocorreu IS
'Ocorrencia normalizada; NULL representa informacao desconhecida ou ambigua.';
COMMENT ON COLUMN evento_clinico.ano_evento IS
'Ano informado para o evento, sem criacao de data artificial.';

CREATE TABLE dispositivo_implantado (
    dispositivo_implantado_id BIGSERIAL PRIMARY KEY,
    paciente_id BIGINT NOT NULL,
    tipo_dispositivo VARCHAR(100) NOT NULL,
    possui_dispositivo BOOLEAN,
    valor_original_tipo TEXT,
    valor_original_presenca TEXT,
    observacoes TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_dispositivo_implantado_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES paciente (paciente_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_dispositivo_implantado_paciente_tipo
        UNIQUE (paciente_id, tipo_dispositivo)
);

COMMENT ON TABLE dispositivo_implantado IS
'Estado consolidado informado de cada tipo de dispositivo implantavel do paciente.';
COMMENT ON COLUMN dispositivo_implantado.possui_dispositivo IS
'Presenca normalizada; NULL representa informacao desconhecida ou ambigua.';

CREATE TABLE obito (
    obito_id BIGSERIAL PRIMARY KEY,
    paciente_id BIGINT NOT NULL,
    houve_obito BOOLEAN,
    data_obito DATE,
    causa_obito TEXT,
    valor_original_obito TEXT,
    valor_original_data TEXT,
    valor_original_causa TEXT,
    observacoes TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_obito_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES paciente (paciente_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_obito_paciente
        UNIQUE (paciente_id)
);

CREATE INDEX idx_obito_data_obito
    ON obito (data_obito);

COMMENT ON TABLE obito IS
'Desfecho consolidado de obito do paciente.';
COMMENT ON COLUMN obito.houve_obito IS
'Indicador normalizado; NULL representa informacao desconhecida ou ambigua.';
COMMENT ON COLUMN obito.causa_obito IS
'Causa em texto livre, sem codificacao clinica nesta fase.';

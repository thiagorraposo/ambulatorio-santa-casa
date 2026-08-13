-- ============================================================
-- Projeto: Ambulatorio Santa Casa
-- Arquivo: 15_tratamento_benzonidazol.sql
-- Finalidade:
--   Criar o tratamento canonico com benzonidazol por paciente e
--   suas reacoes adversas repetiveis.
--
-- Impacto:
--   Adiciona duas tabelas, suas constraints e indices. Nao altera,
--   preenche, deduz ou migra registros de tratamento_chagas.
--
-- Como executar:
--   psql -X -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -v ON_ERROR_STOP=1 -f sql/15_tratamento_benzonidazol.sql
--
-- Estrategia de reversao (executar somente com autorizacao):
--   DROP TABLE ambulatorio.reacao_adversa_benzonidazol;
--   DROP TABLE ambulatorio.tratamento_benzonidazol;
-- ============================================================

BEGIN;
SET search_path TO ambulatorio, public;

CREATE TABLE tratamento_benzonidazol (
    tratamento_benzonidazol_id BIGSERIAL PRIMARY KEY,
    paciente_id BIGINT NOT NULL,
    atendimento_id BIGINT,
    tem_indicacao BOOLEAN,
    iniciado BOOLEAN,
    tratamento_pelo_ambulatorio BOOLEAN,
    duracao_cumprida_dias INTEGER,
    ano_uso_aproximado INTEGER,
    data_prescricao DATE,
    motivo_nao_indicacao TEXT,
    motivo_nao_inicio TEXT,
    teve_reacao_adversa BOOLEAN,
    valor_original_indicacao TEXT,
    valor_original_inicio TEXT,
    valor_original_tratamento_ambulatorio TEXT,
    valor_original_duracao TEXT,
    valor_original_ano_uso TEXT,
    valor_original_data_prescricao TEXT,
    valor_original_motivo_nao_indicacao TEXT,
    valor_original_motivo_nao_inicio TEXT,
    valor_original_reacao_adversa TEXT,
    observacoes TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tratamento_bzn_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES paciente (paciente_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_tratamento_bzn_atendimento_paciente
        FOREIGN KEY (atendimento_id, paciente_id)
        REFERENCES atendimento (atendimento_id, paciente_id)
        ON DELETE SET NULL (atendimento_id),

    CONSTRAINT uq_tratamento_bzn_paciente
        UNIQUE (paciente_id),

    CONSTRAINT chk_tratamento_bzn_duracao
        CHECK (duracao_cumprida_dias IS NULL OR duracao_cumprida_dias > 0),

    CONSTRAINT chk_tratamento_bzn_ano
        CHECK (ano_uso_aproximado IS NULL OR ano_uso_aproximado > 0)
);

CREATE INDEX idx_tratamento_bzn_atendimento_id
    ON tratamento_benzonidazol (atendimento_id)
    WHERE atendimento_id IS NOT NULL;

CREATE TABLE reacao_adversa_benzonidazol (
    reacao_adversa_benzonidazol_id BIGSERIAL PRIMARY KEY,
    tratamento_benzonidazol_id BIGINT NOT NULL,
    descricao TEXT,
    gravidade TEXT,
    data_reacao DATE,
    consequencia TEXT,
    valor_original_descricao TEXT,
    valor_original_gravidade TEXT,
    valor_original_data_reacao TEXT,
    valor_original_consequencia TEXT,
    observacoes TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reacao_bzn_tratamento
        FOREIGN KEY (tratamento_benzonidazol_id)
        REFERENCES tratamento_benzonidazol (tratamento_benzonidazol_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_reacao_bzn_tratamento_id
    ON reacao_adversa_benzonidazol (tratamento_benzonidazol_id);

COMMENT ON TABLE tratamento_benzonidazol IS
'Estado canonico do tratamento com benzonidazol, no maximo um por paciente.';
COMMENT ON COLUMN tratamento_benzonidazol.paciente_id IS
'Paciente ao qual pertence o tratamento canonico com benzonidazol.';
COMMENT ON COLUMN tratamento_benzonidazol.atendimento_id IS
'Atendimento opcional; quando informado, deve pertencer ao mesmo paciente.';
COMMENT ON COLUMN tratamento_benzonidazol.tem_indicacao IS
'Indicador triestado de indicacao de benzonidazol.';
COMMENT ON COLUMN tratamento_benzonidazol.iniciado IS
'Indicador triestado de inicio ou uso do benzonidazol.';
COMMENT ON COLUMN tratamento_benzonidazol.tratamento_pelo_ambulatorio IS
'Indicador triestado de prescricao e acompanhamento pelo ambulatorio.';
COMMENT ON COLUMN tratamento_benzonidazol.duracao_cumprida_dias IS
'Duracao efetivamente cumprida, normalizada em dias positivos.';
COMMENT ON COLUMN tratamento_benzonidazol.ano_uso_aproximado IS
'Ano aproximado de uso, sem conversao para data artificial.';
COMMENT ON COLUMN tratamento_benzonidazol.data_prescricao IS
'Data informada no campo Prescricao do BZN, distinta de indicacao e inicio.';
COMMENT ON COLUMN tratamento_benzonidazol.motivo_nao_indicacao IS
'Motivo exclusivo de nao indicacao do BZN.';
COMMENT ON COLUMN tratamento_benzonidazol.motivo_nao_inicio IS
'Motivo exclusivo de nao inicio do BZN, quando houver fonte inequivoca.';
COMMENT ON COLUMN tratamento_benzonidazol.teve_reacao_adversa IS
'Indicador triestado de reacao adversa ao benzonidazol.';
COMMENT ON COLUMN tratamento_benzonidazol.atualizado_em IS
'Timestamp atualizado explicitamente pela aplicacao ou importador.';

COMMENT ON TABLE reacao_adversa_benzonidazol IS
'Ocorrencias repetiveis de reacao adversa vinculadas ao tratamento com benzonidazol.';
COMMENT ON COLUMN reacao_adversa_benzonidazol.gravidade IS
'Gravidade em texto livre, sem dominio clinico inferido.';
COMMENT ON COLUMN reacao_adversa_benzonidazol.consequencia IS
'Consequencia em texto livre, sem dominio clinico inferido.';
COMMENT ON COLUMN reacao_adversa_benzonidazol.atualizado_em IS
'Timestamp atualizado explicitamente pela aplicacao ou importador.';

COMMIT;

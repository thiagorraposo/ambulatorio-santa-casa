-- ============================================================
-- Projeto: Ambulatorio Santa Casa
-- Arquivo: 13_associacao_paciente_projeto.sql
-- Finalidade:
--   Criar a associacao consolidada entre paciente e projeto.
--
-- Impacto:
--   Adiciona uma tabela, suas constraints e um indice, sem
--   backfill ou alteracao de atendimento_projeto_estudo.
--
-- Como executar:
--   psql -X -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -v ON_ERROR_STOP=1 -f sql/13_associacao_paciente_projeto.sql
--
-- Estrategia de reversao (executar somente com autorizacao):
--   DROP TABLE ambulatorio.paciente_projeto_estudo;
-- ============================================================

SET search_path TO ambulatorio, public;

CREATE TABLE paciente_projeto_estudo (
    paciente_projeto_estudo_id BIGSERIAL PRIMARY KEY,
    paciente_id BIGINT NOT NULL,
    projeto_estudo_id BIGINT NOT NULL,
    participa BOOLEAN,
    possui_pendencia BOOLEAN,
    descricao_pendencia TEXT,
    houve_falha BOOLEAN,
    descricao_falha TEXT,
    valor_original_participacao TEXT,
    valor_original_pendencia TEXT,
    valor_original_falha TEXT,
    observacoes TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_paciente_projeto_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES paciente (paciente_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_paciente_projeto_projeto
        FOREIGN KEY (projeto_estudo_id)
        REFERENCES projeto_estudo (projeto_estudo_id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_paciente_projeto
        UNIQUE (paciente_id, projeto_estudo_id)
);

CREATE INDEX idx_paciente_projeto_projeto_id
    ON paciente_projeto_estudo (projeto_estudo_id);

COMMENT ON TABLE paciente_projeto_estudo IS
'Estado consolidado da relacao entre paciente e projeto oficial, independente de atendimento.';
COMMENT ON COLUMN paciente_projeto_estudo.participa IS
'Estado triestado de participacao: verdadeiro, falso ou nao informado.';
COMMENT ON COLUMN paciente_projeto_estudo.possui_pendencia IS
'Estado triestado de pendencia: verdadeiro, falso ou nao informado.';
COMMENT ON COLUMN paciente_projeto_estudo.houve_falha IS
'Estado triestado de falha no projeto principal: verdadeiro, falso ou nao informado.';
COMMENT ON COLUMN paciente_projeto_estudo.atualizado_em IS
'Timestamp de processamento atualizado explicitamente pela aplicacao ou importador.';

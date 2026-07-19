-- ============================================================
-- Projeto: Ambulatorio Santa Casa
-- Arquivo: 11_modulo_notificacao.sql
-- Finalidade:
--   Criar o modulo incremental de notificacao consolidada por
--   paciente, preservando os tres valores originais informados.
--
-- Impacto:
--   Adiciona uma tabela dependente de paciente, sem importar
--   dados e sem alterar migrations antigas.
--
-- Como executar:
--   psql -X -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -v ON_ERROR_STOP=1 -f sql/11_modulo_notificacao.sql
--
-- Estrategia de reversao (executar somente com autorizacao):
--   DROP INDEX ambulatorio.idx_notificacao_numero_notificacao;
--   DROP TABLE ambulatorio.notificacao;
-- ============================================================

SET search_path TO ambulatorio, public;

CREATE TABLE notificacao (
    notificacao_id BIGSERIAL PRIMARY KEY,
    paciente_id BIGINT NOT NULL,
    paciente_notificado BOOLEAN,
    numero_notificacao VARCHAR(100),
    justificativa_nao_notificacao TEXT,
    valor_original_notificado TEXT,
    valor_original_numero TEXT,
    valor_original_justificativa TEXT,
    observacoes TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notificacao_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES paciente (paciente_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_notificacao_paciente
        UNIQUE (paciente_id)
);

CREATE INDEX idx_notificacao_numero_notificacao
    ON notificacao (numero_notificacao);

COMMENT ON TABLE notificacao IS
'Estado consolidado informado de notificacao do paciente, sem historico de transmissoes.';
COMMENT ON COLUMN notificacao.paciente_id IS
'Paciente ao qual pertence o estado consolidado; permite no maximo uma notificacao por paciente.';
COMMENT ON COLUMN notificacao.paciente_notificado IS
'Indicador normalizado; NULL representa informacao desconhecida ou ambigua.';
COMMENT ON COLUMN notificacao.numero_notificacao IS
'Identificador textual informado, sem formato fechado nem unicidade global.';
COMMENT ON COLUMN notificacao.justificativa_nao_notificacao IS
'Justificativa livre informada, sem vocabulario fechado.';

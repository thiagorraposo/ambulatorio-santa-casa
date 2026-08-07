-- ============================================================
-- Projeto: Ambulatorio Santa Casa
-- Arquivo: 14_exames_por_paciente.sql
-- Finalidade:
--   Criar a estrutura canonica de exames por paciente, com
--   atendimento opcional e consistente com o paciente informado.
--
-- Impacto:
--   Adiciona uma chave unica de suporte em atendimento, cinco
--   tipos genericos aprovados e uma nova tabela. Nao altera,
--   preenche ou migra as tabelas legadas de exames.
--
-- Como executar:
--   psql -X -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -v ON_ERROR_STOP=1 -f sql/14_exames_por_paciente.sql
--
-- Estrategia de reversao (executar somente com autorizacao):
--   DROP TABLE ambulatorio.paciente_exame_complementar;
--   ALTER TABLE ambulatorio.atendimento DROP CONSTRAINT uq_atendimento_id_paciente;
--   A remocao dos tipos de catalogo exige auditoria previa de referencias.
-- ============================================================

BEGIN;
SET search_path TO ambulatorio, public;

ALTER TABLE atendimento
    ADD CONSTRAINT uq_atendimento_id_paciente
    UNIQUE (atendimento_id, paciente_id);

INSERT INTO tipo_exame_complementar (
    codigo_exame,
    nome_exame,
    categoria,
    descricao
)
VALUES
    ('laboratoriais', 'Exames laboratoriais', 'laboratorial', 'Tipo generico para exames laboratoriais.'),
    ('imagem', 'Exame de imagem', 'imagem', 'Tipo generico para exames de imagem.'),
    ('endoscopia', 'Endoscopia', NULL, 'Tipo generico para endoscopia.'),
    ('colonoscopia', 'Colonoscopia', NULL, 'Tipo generico para colonoscopia.'),
    ('mapa', 'MAPA', NULL, 'Tipo generico para MAPA.')
ON CONFLICT (codigo_exame) DO NOTHING;

CREATE TABLE paciente_exame_complementar (
    paciente_exame_complementar_id BIGSERIAL PRIMARY KEY,
    paciente_id BIGINT NOT NULL,
    atendimento_id BIGINT,
    tipo_exame_complementar_id BIGINT NOT NULL,
    bloco_origem VARCHAR(20) NOT NULL,
    tipo_exame_original TEXT,
    resultado_texto TEXT,
    observacoes TEXT,
    valor_original_resultado TEXT,
    valor_original_observacao TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_paciente_exame_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES paciente (paciente_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_paciente_exame_atendimento_paciente
        FOREIGN KEY (atendimento_id, paciente_id)
        REFERENCES atendimento (atendimento_id, paciente_id)
        ON DELETE SET NULL (atendimento_id),

    CONSTRAINT fk_paciente_exame_tipo
        FOREIGN KEY (tipo_exame_complementar_id)
        REFERENCES tipo_exame_complementar (tipo_exame_complementar_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_paciente_exame_bloco
        CHECK (bloco_origem IN ('trazido', 'solicitado'))
);

CREATE INDEX idx_paciente_exame_paciente_id
    ON paciente_exame_complementar (paciente_id);

CREATE INDEX idx_paciente_exame_tipo_id
    ON paciente_exame_complementar (tipo_exame_complementar_id);

CREATE INDEX idx_paciente_exame_atendimento_id
    ON paciente_exame_complementar (atendimento_id)
    WHERE atendimento_id IS NOT NULL;

COMMENT ON TABLE paciente_exame_complementar IS
'Ocorrencias canonicas de exames complementares pertencentes ao paciente, com atendimento opcional.';
COMMENT ON COLUMN paciente_exame_complementar.paciente_id IS
'Paciente ao qual a ocorrencia de exame pertence.';
COMMENT ON COLUMN paciente_exame_complementar.atendimento_id IS
'Atendimento clinico opcional; quando informado, deve pertencer ao mesmo paciente.';
COMMENT ON COLUMN paciente_exame_complementar.bloco_origem IS
'Bloco semantico da origem: trazido ou solicitado.';
COMMENT ON COLUMN paciente_exame_complementar.tipo_exame_original IS
'Rotulo ou tipo livre preservado, inclusive quando o catalogo usa o tipo outro.';
COMMENT ON COLUMN paciente_exame_complementar.resultado_texto IS
'Resultado livre sem interpretacao clinica automatica.';
COMMENT ON COLUMN paciente_exame_complementar.atualizado_em IS
'Timestamp de processamento atualizado explicitamente pela aplicacao ou importador.';

COMMIT;

-- ============================================================
-- Projeto: Ambulatorio Santa Casa
-- Arquivo: 06_tabelas_condicoes_comorbidades.sql
-- Finalidade:
--   Criar tabelas relacionadas a condicoes clinicas,
--   complicacoes da doenca de Chagas e comorbidades.
--
-- Como executar:
--   psql -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -f sql/06_tabelas_condicoes_comorbidades.sql
-- ============================================================

SET search_path TO ambulatorio, public;

CREATE TABLE IF NOT EXISTS condicao_chagas (
    condicao_chagas_id BIGSERIAL PRIMARY KEY,
    atendimento_id BIGINT NOT NULL,

    forma_clinica VARCHAR(50),
    fase_doenca VARCHAR(50),
    classificacao_clinica VARCHAR(80),

    possui_sintomas BOOLEAN,
    descricao_sintomas TEXT,

    observacoes TEXT,

    valor_original_forma_clinica TEXT,
    valor_original_fase_doenca TEXT,
    valor_original_classificacao TEXT,
    valor_original_sintomas TEXT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_condicao_chagas_atendimento
        FOREIGN KEY (atendimento_id)
        REFERENCES atendimento (atendimento_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_condicao_chagas_atendimento
        UNIQUE (atendimento_id),

    CONSTRAINT chk_condicao_chagas_forma_clinica
        CHECK (
            forma_clinica IS NULL
            OR forma_clinica IN (
                'indeterminada',
                'cardiaca',
                'digestiva',
                'cardiodigestiva',
                'aguda',
                'cronica',
                'nao_informado'
            )
        ),

    CONSTRAINT chk_condicao_chagas_fase_doenca
        CHECK (
            fase_doenca IS NULL
            OR fase_doenca IN (
                'aguda',
                'cronica',
                'nao_informado'
            )
        )
);

COMMENT ON TABLE condicao_chagas IS
'Condição clínica relacionada à doença de Chagas registrada no atendimento.';

COMMENT ON COLUMN condicao_chagas.atendimento_id IS
'Atendimento ao qual a condição clínica está associada.';

COMMENT ON COLUMN condicao_chagas.forma_clinica IS
'Forma clínica da doença de Chagas: indeterminada, cardiaca, digestiva, cardiodigestiva, aguda, cronica ou nao_informado.';

COMMENT ON COLUMN condicao_chagas.fase_doenca IS
'Fase da doença: aguda, cronica ou nao_informado.';

COMMENT ON COLUMN condicao_chagas.classificacao_clinica IS
'Classificação clínica complementar, quando informada.';

COMMENT ON COLUMN condicao_chagas.possui_sintomas IS
'Indica se há sintomas registrados.';

COMMENT ON COLUMN condicao_chagas.descricao_sintomas IS
'Descrição textual dos sintomas registrados.';


CREATE TABLE IF NOT EXISTS complicacao_chagas (
    complicacao_chagas_id BIGSERIAL PRIMARY KEY,
    atendimento_id BIGINT NOT NULL,

    tipo_complicacao VARCHAR(80),
    possui_complicacao BOOLEAN,
    descricao TEXT,
    gravidade VARCHAR(30),

    valor_original_tipo TEXT,
    valor_original_presenca TEXT,
    valor_original_gravidade TEXT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_complicacao_chagas_atendimento
        FOREIGN KEY (atendimento_id)
        REFERENCES atendimento (atendimento_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_complicacao_chagas_gravidade
        CHECK (
            gravidade IS NULL
            OR gravidade IN (
                'leve',
                'moderada',
                'grave',
                'nao_informado'
            )
        )
);

COMMENT ON TABLE complicacao_chagas IS
'Complicações associadas à doença de Chagas registradas no atendimento.';

COMMENT ON COLUMN complicacao_chagas.atendimento_id IS
'Atendimento ao qual a complicação está associada.';

COMMENT ON COLUMN complicacao_chagas.tipo_complicacao IS
'Tipo de complicação registrada, como cardíaca, digestiva ou outra classificação clínica.';

COMMENT ON COLUMN complicacao_chagas.possui_complicacao IS
'Indica se a complicação está presente.';

COMMENT ON COLUMN complicacao_chagas.descricao IS
'Descrição textual da complicação.';

COMMENT ON COLUMN complicacao_chagas.gravidade IS
'Gravidade padronizada: leve, moderada, grave ou nao_informado.';


CREATE TABLE IF NOT EXISTS comorbidade (
    comorbidade_id BIGSERIAL PRIMARY KEY,

    nome_comorbidade VARCHAR(120) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_comorbidade_nome
        UNIQUE (nome_comorbidade)
);

COMMENT ON TABLE comorbidade IS
'Tabela de catálogo das comorbidades possíveis.';

COMMENT ON COLUMN comorbidade.nome_comorbidade IS
'Nome padronizado da comorbidade.';

COMMENT ON COLUMN comorbidade.descricao IS
'Descrição opcional da comorbidade.';

COMMENT ON COLUMN comorbidade.ativo IS
'Indica se a comorbidade está ativa para uso no sistema.';


CREATE TABLE IF NOT EXISTS paciente_comorbidade (
    paciente_comorbidade_id BIGSERIAL PRIMARY KEY,

    paciente_id BIGINT NOT NULL,
    comorbidade_id BIGINT NOT NULL,

    atendimento_id BIGINT,

    possui_comorbidade BOOLEAN NOT NULL DEFAULT TRUE,
    data_registro DATE,

    observacoes TEXT,
    valor_original_comorbidade TEXT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_paciente_comorbidade_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES paciente (paciente_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_paciente_comorbidade_comorbidade
        FOREIGN KEY (comorbidade_id)
        REFERENCES comorbidade (comorbidade_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_paciente_comorbidade_atendimento
        FOREIGN KEY (atendimento_id)
        REFERENCES atendimento (atendimento_id)
        ON DELETE SET NULL,

    CONSTRAINT uq_paciente_comorbidade
        UNIQUE (paciente_id, comorbidade_id)
);

COMMENT ON TABLE paciente_comorbidade IS
'Tabela associativa entre pacientes e comorbidades.';

COMMENT ON COLUMN paciente_comorbidade.paciente_id IS
'Paciente ao qual a comorbidade está associada.';

COMMENT ON COLUMN paciente_comorbidade.comorbidade_id IS
'Comorbidade associada ao paciente.';

COMMENT ON COLUMN paciente_comorbidade.atendimento_id IS
'Atendimento em que a comorbidade foi registrada, quando aplicável.';

COMMENT ON COLUMN paciente_comorbidade.possui_comorbidade IS
'Indica se a comorbidade está presente.';

COMMENT ON COLUMN paciente_comorbidade.data_registro IS
'Data em que a comorbidade foi registrada.';

COMMENT ON COLUMN paciente_comorbidade.valor_original_comorbidade IS
'Valor bruto da planilha relacionado à comorbidade.';


CREATE INDEX IF NOT EXISTS idx_condicao_chagas_atendimento_id
ON condicao_chagas (atendimento_id);

CREATE INDEX IF NOT EXISTS idx_complicacao_chagas_atendimento_id
ON complicacao_chagas (atendimento_id);

CREATE INDEX IF NOT EXISTS idx_complicacao_chagas_tipo
ON complicacao_chagas (tipo_complicacao);

CREATE INDEX IF NOT EXISTS idx_paciente_comorbidade_paciente_id
ON paciente_comorbidade (paciente_id);

CREATE INDEX IF NOT EXISTS idx_paciente_comorbidade_comorbidade_id
ON paciente_comorbidade (comorbidade_id);

CREATE INDEX IF NOT EXISTS idx_paciente_comorbidade_atendimento_id
ON paciente_comorbidade (atendimento_id);
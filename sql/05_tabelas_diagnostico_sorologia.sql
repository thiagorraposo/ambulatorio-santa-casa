-- ============================================================
-- Projeto: Ambulatorio Santa Casa
-- Arquivo: 05_tabelas_diagnostico_sorologia.sql
-- Finalidade:
--   Criar tabelas relacionadas ao diagnóstico de Chagas,
--   sorologias, solicitações de sorologia e histórico familiar.
--
-- Como executar:
--   psql -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -f sql/05_tabelas_diagnostico_sorologia.sql
-- ============================================================

SET search_path TO ambulatorio, public;

CREATE TABLE IF NOT EXISTS diagnostico_chagas (
    diagnostico_chagas_id BIGSERIAL PRIMARY KEY,
    atendimento_id BIGINT NOT NULL,

    possui_diagnostico_chagas BOOLEAN,
    status_diagnostico VARCHAR(30),
    resultado_final VARCHAR(30),
    data_resultado_final DATE,

    criterio_confirmacao VARCHAR(80),
    observacoes TEXT,

    valor_original_diagnostico TEXT,
    valor_original_resultado_final TEXT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_diagnostico_chagas_atendimento
        FOREIGN KEY (atendimento_id)
        REFERENCES atendimento (atendimento_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_diagnostico_chagas_atendimento
        UNIQUE (atendimento_id),

    CONSTRAINT chk_diagnostico_chagas_status
        CHECK (
            status_diagnostico IS NULL
            OR status_diagnostico IN (
                'confirmado',
                'descartado',
                'inconclusivo',
                'suspeito',
                'nao_informado'
            )
        ),

    CONSTRAINT chk_diagnostico_chagas_resultado_final
        CHECK (
            resultado_final IS NULL
            OR resultado_final IN (
                'positivo',
                'negativo',
                'inconclusivo',
                'indeterminado',
                'nao_informado'
            )
        )
);

COMMENT ON TABLE diagnostico_chagas IS
'Registro do diagnóstico de doença de Chagas associado a um atendimento.';

COMMENT ON COLUMN diagnostico_chagas.atendimento_id IS
'Atendimento ao qual o diagnóstico está associado.';

COMMENT ON COLUMN diagnostico_chagas.possui_diagnostico_chagas IS
'Indica se o paciente possui diagnóstico de doença de Chagas conforme o atendimento.';

COMMENT ON COLUMN diagnostico_chagas.status_diagnostico IS
'Status padronizado do diagnóstico: confirmado, descartado, inconclusivo, suspeito ou nao_informado.';

COMMENT ON COLUMN diagnostico_chagas.resultado_final IS
'Resultado final padronizado do diagnóstico.';

COMMENT ON COLUMN diagnostico_chagas.criterio_confirmacao IS
'Critério usado para confirmação diagnóstica, quando informado.';

COMMENT ON COLUMN diagnostico_chagas.valor_original_diagnostico IS
'Valor bruto da planilha relacionado ao diagnóstico.';

COMMENT ON COLUMN diagnostico_chagas.valor_original_resultado_final IS
'Valor bruto da planilha relacionado ao resultado final.';


CREATE TABLE IF NOT EXISTS sorologia_chagas (
    sorologia_chagas_id BIGSERIAL PRIMARY KEY,
    diagnostico_chagas_id BIGINT NOT NULL,

    numero_metodo_planilha SMALLINT,
    metodo_sorologico VARCHAR(120),

    data_solicitacao DATE,
    data_coleta DATE,
    data_resultado DATE,

    resultado VARCHAR(30),
    laboratorio VARCHAR(120),

    valor_original_metodo TEXT,
    valor_original_data TEXT,
    valor_original_resultado TEXT,

    observacoes TEXT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sorologia_chagas_diagnostico
        FOREIGN KEY (diagnostico_chagas_id)
        REFERENCES diagnostico_chagas (diagnostico_chagas_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_sorologia_chagas_metodo_por_diagnostico
        UNIQUE (diagnostico_chagas_id, numero_metodo_planilha),

    CONSTRAINT chk_sorologia_chagas_numero_metodo
        CHECK (
            numero_metodo_planilha IS NULL
            OR numero_metodo_planilha BETWEEN 1 AND 3
        ),

    CONSTRAINT chk_sorologia_chagas_resultado
        CHECK (
            resultado IS NULL
            OR resultado IN (
                'reagente',
                'nao_reagente',
                'inconclusivo',
                'indeterminado',
                'nao_informado'
            )
        )
);

COMMENT ON TABLE sorologia_chagas IS
'Sorologias relacionadas ao diagnóstico de doença de Chagas.';

COMMENT ON COLUMN sorologia_chagas.diagnostico_chagas_id IS
'Diagnóstico de Chagas ao qual a sorologia pertence.';

COMMENT ON COLUMN sorologia_chagas.numero_metodo_planilha IS
'Número do método na planilha original, por exemplo método 1, 2 ou 3.';

COMMENT ON COLUMN sorologia_chagas.metodo_sorologico IS
'Método sorológico utilizado, quando informado.';

COMMENT ON COLUMN sorologia_chagas.data_solicitacao IS
'Data em que a sorologia foi solicitada.';

COMMENT ON COLUMN sorologia_chagas.data_coleta IS
'Data de coleta da amostra, quando disponível.';

COMMENT ON COLUMN sorologia_chagas.data_resultado IS
'Data do resultado da sorologia.';

COMMENT ON COLUMN sorologia_chagas.resultado IS
'Resultado padronizado da sorologia.';

COMMENT ON COLUMN sorologia_chagas.valor_original_metodo IS
'Valor bruto da coluna de método sorológico na planilha.';

COMMENT ON COLUMN sorologia_chagas.valor_original_data IS
'Valor bruto da coluna de data da sorologia na planilha.';

COMMENT ON COLUMN sorologia_chagas.valor_original_resultado IS
'Valor bruto da coluna de resultado da sorologia na planilha.';


CREATE TABLE IF NOT EXISTS sorologia_solicitacao (
    sorologia_solicitacao_id BIGSERIAL PRIMARY KEY,
    atendimento_id BIGINT NOT NULL,

    solicitada BOOLEAN NOT NULL DEFAULT TRUE,
    data_solicitacao DATE,
    tipo_solicitacao VARCHAR(120),
    status_solicitacao VARCHAR(30),

    valor_original_solicitacao TEXT,
    observacoes TEXT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sorologia_solicitacao_atendimento
        FOREIGN KEY (atendimento_id)
        REFERENCES atendimento (atendimento_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_sorologia_solicitacao_status
        CHECK (
            status_solicitacao IS NULL
            OR status_solicitacao IN (
                'solicitada',
                'realizada',
                'pendente',
                'cancelada',
                'nao_informado'
            )
        )
);

COMMENT ON TABLE sorologia_solicitacao IS
'Solicitações de sorologia vinculadas ao atendimento.';

COMMENT ON COLUMN sorologia_solicitacao.atendimento_id IS
'Atendimento em que a sorologia foi solicitada.';

COMMENT ON COLUMN sorologia_solicitacao.solicitada IS
'Indica se houve solicitação de sorologia.';

COMMENT ON COLUMN sorologia_solicitacao.tipo_solicitacao IS
'Tipo ou descrição da sorologia solicitada.';

COMMENT ON COLUMN sorologia_solicitacao.status_solicitacao IS
'Status da solicitação: solicitada, realizada, pendente, cancelada ou nao_informado.';

COMMENT ON COLUMN sorologia_solicitacao.valor_original_solicitacao IS
'Valor bruto da planilha relacionado à solicitação de sorologia.';


CREATE TABLE IF NOT EXISTS historico_familiar_chagas (
    historico_familiar_chagas_id BIGSERIAL PRIMARY KEY,
    paciente_id BIGINT NOT NULL,

    possui_historico_familiar BOOLEAN,
    parentesco VARCHAR(120),
    descricao TEXT,

    valor_original_historico TEXT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_historico_familiar_chagas_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES paciente (paciente_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_historico_familiar_chagas_paciente
        UNIQUE (paciente_id)
);

COMMENT ON TABLE historico_familiar_chagas IS
'Histórico familiar de doença de Chagas associado ao paciente.';

COMMENT ON COLUMN historico_familiar_chagas.paciente_id IS
'Paciente ao qual o histórico familiar pertence.';

COMMENT ON COLUMN historico_familiar_chagas.possui_historico_familiar IS
'Indica se há histórico familiar de doença de Chagas.';

COMMENT ON COLUMN historico_familiar_chagas.parentesco IS
'Parentesco informado no histórico familiar, quando disponível.';

COMMENT ON COLUMN historico_familiar_chagas.descricao IS
'Descrição textual do histórico familiar.';

COMMENT ON COLUMN historico_familiar_chagas.valor_original_historico IS
'Valor bruto da planilha relacionado ao histórico familiar.';


CREATE INDEX IF NOT EXISTS idx_diagnostico_chagas_atendimento_id
ON diagnostico_chagas (atendimento_id);

CREATE INDEX IF NOT EXISTS idx_sorologia_chagas_diagnostico_id
ON sorologia_chagas (diagnostico_chagas_id);

CREATE INDEX IF NOT EXISTS idx_sorologia_chagas_resultado
ON sorologia_chagas (resultado);

CREATE INDEX IF NOT EXISTS idx_sorologia_solicitacao_atendimento_id
ON sorologia_solicitacao (atendimento_id);

CREATE INDEX IF NOT EXISTS idx_historico_familiar_chagas_paciente_id
ON historico_familiar_chagas (paciente_id);
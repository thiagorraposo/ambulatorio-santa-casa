-- ============================================================
-- Projeto: Ambulatorio Santa Casa
-- Arquivo: 03_tabelas_atendimento.sql
-- Finalidade:
--   Criar a tabela de atendimentos vinculados aos pacientes.
--
-- Como executar:
--   psql -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -f sql/03_tabelas_atendimento.sql
-- ============================================================

SET search_path TO ambulatorio, public;

CREATE TABLE IF NOT EXISTS atendimento (
    atendimento_id BIGSERIAL PRIMARY KEY,
    paciente_id BIGINT NOT NULL,

    data_atendimento DATE,
    localizacao_prontuario VARCHAR(120),

    ambulatorio_unicamente BOOLEAN,
    ambulatorio_anexo_projeto BOOLEAN,

    origem_registro VARCHAR(50),

    observacoes TEXT,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_atendimento_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES paciente (paciente_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_atendimento_contexto_ambulatorio
        CHECK (
            NOT (
                COALESCE(ambulatorio_unicamente, FALSE) = TRUE
                AND COALESCE(ambulatorio_anexo_projeto, FALSE) = TRUE
            )
        ),

    CONSTRAINT chk_atendimento_origem_registro
        CHECK (
            origem_registro IS NULL
            OR origem_registro IN (
                'planilha_portador_dc',
                'planilha_nao_portador_dc',
                'cadastro_sistema',
                'nao_informado'
            )
        )
);

COMMENT ON TABLE atendimento IS
'Tabela de atendimentos realizados ou registrados para cada paciente.';

COMMENT ON COLUMN atendimento.atendimento_id IS
'Identificador interno do atendimento no banco de dados.';

COMMENT ON COLUMN atendimento.paciente_id IS
'Referência ao paciente atendido.';

COMMENT ON COLUMN atendimento.data_atendimento IS
'Data do atendimento conforme registro da planilha ou cadastro no sistema.';

COMMENT ON COLUMN atendimento.localizacao_prontuario IS
'Localização física ou lógica do prontuário do paciente.';

COMMENT ON COLUMN atendimento.ambulatorio_unicamente IS
'Indica se o atendimento está vinculado apenas ao ambulatório.';

COMMENT ON COLUMN atendimento.ambulatorio_anexo_projeto IS
'Indica se o atendimento está vinculado ao ambulatório anexo a projeto.';

COMMENT ON COLUMN atendimento.origem_registro IS
'Origem do registro: planilha_portador_dc, planilha_nao_portador_dc, cadastro_sistema ou nao_informado.';

COMMENT ON COLUMN atendimento.observacoes IS
'Campo textual para observações gerais sobre o atendimento.';


CREATE INDEX IF NOT EXISTS idx_atendimento_paciente_id
ON atendimento (paciente_id);

CREATE INDEX IF NOT EXISTS idx_atendimento_data_atendimento
ON atendimento (data_atendimento);
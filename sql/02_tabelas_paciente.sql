-- ============================================================
-- Projeto: Ambulatorio Santa Casa
-- Arquivo: 02_tabelas_paciente.sql
-- Finalidade:
--   Criar as tabelas iniciais relacionadas ao paciente.
--
-- Como executar:
--   psql -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -f sql/02_tabelas_paciente.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS paciente (
    paciente_id BIGSERIAL PRIMARY KEY,

    codigo_planilha VARCHAR(50),
    nome VARCHAR(255) NOT NULL,
    data_nascimento DATE,
    sexo VARCHAR(30),
    raca VARCHAR(50),

    pertence_comunidade_tradicional BOOLEAN,
    tipo_comunidade_tradicional VARCHAR(30),

    grupo_origem_planilha VARCHAR(50),

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_paciente_tipo_comunidade
        CHECK (
            tipo_comunidade_tradicional IS NULL
            OR tipo_comunidade_tradicional IN ('indigena', 'quilombola')
        ),

    CONSTRAINT chk_paciente_sexo
        CHECK (
            sexo IS NULL
            OR sexo IN ('feminino', 'masculino', 'outro', 'nao_informado')
        )
);

COMMENT ON TABLE paciente IS
'Tabela principal de pacientes do sistema.';

COMMENT ON COLUMN paciente.paciente_id IS
'Identificador interno do paciente no banco de dados.';

COMMENT ON COLUMN paciente.codigo_planilha IS
'Código ou ID original vindo da planilha, preservado para rastreabilidade.';

COMMENT ON COLUMN paciente.nome IS
'Nome do paciente conforme informado na planilha ou no cadastro.';

COMMENT ON COLUMN paciente.data_nascimento IS
'Data de nascimento do paciente. Usada para cálculo de idade.';

COMMENT ON COLUMN paciente.sexo IS
'Sexo padronizado do paciente. Valores previstos: feminino, masculino, outro, nao_informado.';

COMMENT ON COLUMN paciente.raca IS
'Raça/cor conforme registro original ou padronização posterior.';

COMMENT ON COLUMN paciente.pertence_comunidade_tradicional IS
'Indica se o paciente pertence a comunidade indígena ou quilombola.';

COMMENT ON COLUMN paciente.tipo_comunidade_tradicional IS
'Tipo de comunidade tradicional: indigena ou quilombola.';

COMMENT ON COLUMN paciente.grupo_origem_planilha IS
'Indica se o paciente veio da aba de portador ou não portador de DC na planilha original.';


CREATE TABLE IF NOT EXISTS paciente_endereco (
    endereco_id BIGSERIAL PRIMARY KEY,
    paciente_id BIGINT NOT NULL,

    endereco TEXT,
    cidade VARCHAR(120),

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_paciente_endereco_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES paciente (paciente_id)
        ON DELETE CASCADE
);

COMMENT ON TABLE paciente_endereco IS
'Endereços vinculados ao paciente. Separado da tabela paciente para permitir evolução futura.';

COMMENT ON COLUMN paciente_endereco.endereco_id IS
'Identificador interno do endereço.';

COMMENT ON COLUMN paciente_endereco.paciente_id IS
'Referência ao paciente dono do endereço.';

COMMENT ON COLUMN paciente_endereco.endereco IS
'Endereço textual conforme origem dos dados.';

COMMENT ON COLUMN paciente_endereco.cidade IS
'Cidade do paciente.';


CREATE TABLE IF NOT EXISTS paciente_contato (
    contato_id BIGSERIAL PRIMARY KEY,
    paciente_id BIGINT NOT NULL,

    telefone VARCHAR(30),

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_paciente_contato_paciente
        FOREIGN KEY (paciente_id)
        REFERENCES paciente (paciente_id)
        ON DELETE CASCADE
);

COMMENT ON TABLE paciente_contato IS
'Contatos telefônicos vinculados ao paciente.';

COMMENT ON COLUMN paciente_contato.contato_id IS
'Identificador interno do contato.';

COMMENT ON COLUMN paciente_contato.paciente_id IS
'Referência ao paciente dono do contato.';

COMMENT ON COLUMN paciente_contato.telefone IS
'Telefone de contato do paciente.';
-- Identidade funcional da aplicacao, independente de roles PostgreSQL e dados legados.
-- Impacto: aditivo; cria somente a tabela minima de usuarios autenticaveis.
-- Reversao: nova migration explicita; remover a tabela destruiria identidades.

SET search_path TO ambulatorio, public;

CREATE TABLE usuario_aplicacao (
    usuario_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(160) NOT NULL,
    login VARCHAR(254) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_usuario_aplicacao_nome CHECK (btrim(nome) <> ''),
    CONSTRAINT chk_usuario_aplicacao_login CHECK (btrim(login) <> '' AND login = lower(login)),
    CONSTRAINT chk_usuario_aplicacao_senha_hash CHECK (senha_hash ~ '^\\$2[aby]\\$'),
    CONSTRAINT chk_usuario_aplicacao_perfil CHECK (perfil IN ('consulta', 'edicao', 'administracao'))
);

CREATE UNIQUE INDEX uq_usuario_aplicacao_login_normalizado
    ON usuario_aplicacao (lower(login));

COMMENT ON TABLE usuario_aplicacao IS
'Identidades funcionais autenticaveis da aplicacao; nao representa role PostgreSQL nem responsavel legado de planilha.';
COMMENT ON COLUMN usuario_aplicacao.senha_hash IS
'Hash bcrypt da senha; senha em texto puro nunca deve ser persistida.';

GRANT SELECT ON usuario_aplicacao TO ambulatorio_aplicacao;


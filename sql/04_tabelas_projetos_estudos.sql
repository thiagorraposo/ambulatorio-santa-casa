-- ============================================================
-- Projeto: Ambulatorio Santa Casa
-- Arquivo: 04_tabelas_projetos_estudos.sql
-- Finalidade:
--   Criar as tabelas relacionadas a projetos, estudos e vínculos
--   dos atendimentos com esses projetos.
--
-- Como executar:
--   psql -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -f sql/04_tabelas_projetos_estudos.sql
-- ============================================================

SET search_path TO ambulatorio, public;

CREATE TABLE IF NOT EXISTS projeto_estudo (
    projeto_estudo_id BIGSERIAL PRIMARY KEY,

    codigo_projeto VARCHAR(80) NOT NULL,
    nome_projeto VARCHAR(150) NOT NULL,
    descricao TEXT,

    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_projeto_estudo_codigo
        UNIQUE (codigo_projeto)
);

COMMENT ON TABLE projeto_estudo IS
'Tabela de catálogo dos projetos, estudos ou pesquisas associados aos atendimentos.';

COMMENT ON COLUMN projeto_estudo.projeto_estudo_id IS
'Identificador interno do projeto ou estudo.';

COMMENT ON COLUMN projeto_estudo.codigo_projeto IS
'Código padronizado do projeto, usado internamente no sistema.';

COMMENT ON COLUMN projeto_estudo.nome_projeto IS
'Nome legível do projeto ou estudo conforme origem dos dados.';

COMMENT ON COLUMN projeto_estudo.descricao IS
'Descrição opcional do projeto ou estudo.';

COMMENT ON COLUMN projeto_estudo.ativo IS
'Indica se o projeto ainda está ativo no sistema.';


CREATE TABLE IF NOT EXISTS atendimento_projeto_estudo (
    atendimento_projeto_estudo_id BIGSERIAL PRIMARY KEY,

    atendimento_id BIGINT NOT NULL,
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

    CONSTRAINT fk_atendimento_projeto_atendimento
        FOREIGN KEY (atendimento_id)
        REFERENCES atendimento (atendimento_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_atendimento_projeto_projeto
        FOREIGN KEY (projeto_estudo_id)
        REFERENCES projeto_estudo (projeto_estudo_id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_atendimento_projeto
        UNIQUE (atendimento_id, projeto_estudo_id)
);

COMMENT ON TABLE atendimento_projeto_estudo IS
'Tabela associativa entre atendimentos e projetos/estudos.';

COMMENT ON COLUMN atendimento_projeto_estudo.atendimento_projeto_estudo_id IS
'Identificador interno do vínculo entre atendimento e projeto.';

COMMENT ON COLUMN atendimento_projeto_estudo.atendimento_id IS
'Referência ao atendimento vinculado ao projeto.';

COMMENT ON COLUMN atendimento_projeto_estudo.projeto_estudo_id IS
'Referência ao projeto ou estudo.';

COMMENT ON COLUMN atendimento_projeto_estudo.participa IS
'Indica se o paciente/atendimento participa do projeto.';

COMMENT ON COLUMN atendimento_projeto_estudo.possui_pendencia IS
'Indica se existe pendência relacionada ao projeto.';

COMMENT ON COLUMN atendimento_projeto_estudo.descricao_pendencia IS
'Descrição textual da pendência, quando houver.';

COMMENT ON COLUMN atendimento_projeto_estudo.houve_falha IS
'Indica se houve falha relacionada ao projeto.';

COMMENT ON COLUMN atendimento_projeto_estudo.descricao_falha IS
'Descrição textual da falha, quando houver.';

COMMENT ON COLUMN atendimento_projeto_estudo.valor_original_participacao IS
'Valor bruto original da coluna de participação na planilha.';

COMMENT ON COLUMN atendimento_projeto_estudo.valor_original_pendencia IS
'Valor bruto original da coluna de pendência na planilha.';

COMMENT ON COLUMN atendimento_projeto_estudo.valor_original_falha IS
'Valor bruto original da coluna de falha na planilha.';


CREATE INDEX IF NOT EXISTS idx_atendimento_projeto_atendimento_id
ON atendimento_projeto_estudo (atendimento_id);

CREATE INDEX IF NOT EXISTS idx_atendimento_projeto_projeto_estudo_id
ON atendimento_projeto_estudo (projeto_estudo_id);


INSERT INTO projeto_estudo (codigo_projeto, nome_projeto, descricao)
VALUES
    ('sami_trop_aim3', 'SaMi-Trop AIM3', 'Projeto SaMi-Trop AIM3.'),
    ('sami_trop_1_1', 'SaMi-Trop 1.1', 'Projeto SaMi-Trop 1.1.'),
    ('parachute', 'Parachute', 'Projeto Parachute.'),
    ('benbrasil', 'BenBrasil', 'Projeto BenBrasil.'),
    ('epoca', 'EPOCA', 'Projeto EPOCA.'),
    ('santa_casa_dica', 'Santa Casa DICA', 'Projeto Santa Casa DICA.'),
    ('renomica', 'RENOMICA', 'Projeto RENOMICA.'),
    ('archimedes', 'ARCHIMEDES', 'Projeto ARCHIMEDES.'),
    ('charm', 'CHARM', 'Projeto CHARM.'),
    ('lxe_novartis', 'LXE Novartis', 'Projeto LXE Novartis.')
ON CONFLICT (codigo_projeto) DO NOTHING;
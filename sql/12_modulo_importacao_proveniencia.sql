-- ============================================================
-- Projeto: Ambulatorio Santa Casa
-- Arquivo: 12_modulo_importacao_proveniencia.sql
-- Finalidade:
--   Criar o modulo incremental de lotes, linhas brutas e
--   associacoes genericas de proveniencia da importacao.
--
-- Impacto:
--   Adiciona tres tabelas sem importar dados, criar importador,
--   roles, triggers ou alterar migrations antigas.
--
-- Como executar:
--   psql -X -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -v ON_ERROR_STOP=1 -f sql/12_modulo_importacao_proveniencia.sql
--
-- Estrategia de reversao (executar somente com autorizacao):
--   DROP TABLE ambulatorio.importacao_registro;
--   DROP TABLE ambulatorio.importacao_linha;
--   DROP TABLE ambulatorio.importacao_lote;
-- ============================================================

SET search_path TO ambulatorio, public;

CREATE TABLE importacao_lote (
    importacao_lote_id BIGSERIAL PRIMARY KEY,
    codigo_lote VARCHAR(100) NOT NULL,
    hash_arquivo_sha256 VARCHAR(64) NOT NULL,
    layout_versao VARCHAR(80) NOT NULL,
    lote_reprocessado_de_id BIGINT,
    status_lote VARCHAR(40) NOT NULL DEFAULT 'recebido',
    iniciado_em TIMESTAMP,
    finalizado_em TIMESTAMP,
    mensagem_erro TEXT,
    observacoes TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_importacao_lote_codigo
        UNIQUE (codigo_lote),

    CONSTRAINT uq_importacao_lote_identidade
        UNIQUE (importacao_lote_id, hash_arquivo_sha256, layout_versao),

    CONSTRAINT fk_importacao_lote_reprocessamento
        FOREIGN KEY (
            lote_reprocessado_de_id,
            hash_arquivo_sha256,
            layout_versao
        )
        REFERENCES importacao_lote (
            importacao_lote_id,
            hash_arquivo_sha256,
            layout_versao
        )
        ON DELETE RESTRICT,

    CONSTRAINT chk_importacao_lote_reprocessamento
        CHECK (
            lote_reprocessado_de_id IS NULL
            OR lote_reprocessado_de_id <> importacao_lote_id
        ),

    CONSTRAINT chk_importacao_lote_hash_sha256
        CHECK (hash_arquivo_sha256 ~ '^[0-9a-f]{64}$'),

    CONSTRAINT chk_importacao_lote_status
        CHECK (
            status_lote IN (
                'recebido',
                'validando',
                'pronto',
                'processando',
                'concluido',
                'concluido_com_pendencias',
                'falhou',
                'cancelado'
            )
        ),

    CONSTRAINT chk_importacao_lote_periodo
        CHECK (
            finalizado_em IS NULL
            OR iniciado_em IS NULL
            OR finalizado_em >= iniciado_em
        )
);

CREATE UNIQUE INDEX uq_importacao_lote_inicial
    ON importacao_lote (hash_arquivo_sha256, layout_versao)
    WHERE lote_reprocessado_de_id IS NULL;

CREATE INDEX idx_importacao_lote_hash_layout
    ON importacao_lote (hash_arquivo_sha256, layout_versao);

CREATE TABLE importacao_linha (
    importacao_linha_id BIGSERIAL PRIMARY KEY,
    importacao_lote_id BIGINT NOT NULL,
    aba_nome_original TEXT NOT NULL,
    aba_ordem INTEGER NOT NULL,
    numero_linha INTEGER NOT NULL,
    dados_brutos JSONB NOT NULL,
    responsavel_digitacao_original TEXT,
    status_linha VARCHAR(40) NOT NULL DEFAULT 'pendente',
    mensagem_processamento TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_importacao_linha_lote
        FOREIGN KEY (importacao_lote_id)
        REFERENCES importacao_lote (importacao_lote_id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_importacao_linha_posicao
        UNIQUE (importacao_lote_id, aba_ordem, numero_linha),

    CONSTRAINT chk_importacao_linha_aba_nome
        CHECK (btrim(aba_nome_original) <> ''),

    CONSTRAINT chk_importacao_linha_aba_ordem
        CHECK (aba_ordem > 0),

    CONSTRAINT chk_importacao_linha_numero
        CHECK (numero_linha > 0),

    CONSTRAINT chk_importacao_linha_dados_brutos
        CHECK (jsonb_typeof(dados_brutos) = 'array'),

    CONSTRAINT chk_importacao_linha_status
        CHECK (
            status_linha IN (
                'pendente',
                'processando',
                'importada',
                'importada_com_pendencia',
                'rejeitada',
                'ignorada'
            )
        )
);

CREATE INDEX idx_importacao_linha_lote_status
    ON importacao_linha (importacao_lote_id, status_linha);

CREATE TABLE importacao_registro (
    importacao_registro_id BIGSERIAL PRIMARY KEY,
    importacao_linha_id BIGINT NOT NULL,
    schema_destino VARCHAR(63) NOT NULL DEFAULT 'ambulatorio',
    tabela_destino VARCHAR(63) NOT NULL,
    registro_id BIGINT NOT NULL,
    acao VARCHAR(20) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_importacao_registro_linha
        FOREIGN KEY (importacao_linha_id)
        REFERENCES importacao_linha (importacao_linha_id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_importacao_registro_vinculo
        UNIQUE (
            importacao_linha_id,
            schema_destino,
            tabela_destino,
            registro_id
        ),

    CONSTRAINT chk_importacao_registro_schema
        CHECK (schema_destino = 'ambulatorio'),

    CONSTRAINT chk_importacao_registro_tabela
        CHECK (btrim(tabela_destino) <> ''),

    CONSTRAINT chk_importacao_registro_id
        CHECK (registro_id > 0),

    CONSTRAINT chk_importacao_registro_acao
        CHECK (acao IN ('criado', 'atualizado', 'associado'))
);

CREATE INDEX idx_importacao_registro_destino
    ON importacao_registro (schema_destino, tabela_destino, registro_id);

COMMENT ON TABLE importacao_lote IS
'Execucao identificada de importacao, incluindo reprocessamentos auditaveis.';
COMMENT ON COLUMN importacao_lote.hash_arquivo_sha256 IS
'SHA-256 hexadecimal minusculo do conteudo de origem, sem caminho local.';
COMMENT ON COLUMN importacao_lote.lote_reprocessado_de_id IS
'Execucao anterior do mesmo conteudo e layout quando houver reprocessamento.';

COMMENT ON TABLE importacao_linha IS
'Linha de origem preservada antes de normalizacao clinica.';
COMMENT ON COLUMN importacao_linha.dados_brutos IS
'Array JSONB ordenado de celulas; preserva posicao e cabecalhos repetidos.';
COMMENT ON COLUMN importacao_linha.responsavel_digitacao_original IS
'Texto legado preservado sem equivalencia com usuario autenticado.';

COMMENT ON TABLE importacao_registro IS
'Associacao generica N:N entre linha de origem e registro estruturado.';
COMMENT ON COLUMN importacao_registro.registro_id IS
'Identificador do alvo heterogeneo, validado operacionalmente sem FK polimorfica.';

-- ============================================================
-- Projeto: Ambulatorio Santa Casa
-- Arquivo: 16_encaminhamento_ampliado.sql
-- Finalidade:
--   Ampliar encaminhamento com documento apresentado e projeto
--   oficial opcional.
--
-- Impacto:
--   Adiciona quatro colunas, uma FK e um indice parcial. Preserva
--   PK, atendimento obrigatorio, registros existentes e estruturas
--   de projeto e contrarreferencia, sem backfill ou escrita dupla.
--
-- Como executar:
--   psql -X -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -v ON_ERROR_STOP=1 -f sql/16_encaminhamento_ampliado.sql
--
-- Estrategia de reversao (executar somente com autorizacao):
--   DROP INDEX ambulatorio.idx_encaminhamento_projeto_estudo_id;
--   ALTER TABLE ambulatorio.encaminhamento DROP CONSTRAINT fk_encaminhamento_projeto;
--   ALTER TABLE ambulatorio.encaminhamento DROP COLUMN valor_original_projeto;
--   ALTER TABLE ambulatorio.encaminhamento DROP COLUMN valor_original_documento_apresentado;
--   ALTER TABLE ambulatorio.encaminhamento DROP COLUMN projeto_estudo_id;
--   ALTER TABLE ambulatorio.encaminhamento DROP COLUMN documento_apresentado;
-- ============================================================

BEGIN;
SET search_path TO ambulatorio, public;

ALTER TABLE encaminhamento
    ADD COLUMN documento_apresentado BOOLEAN,
    ADD COLUMN projeto_estudo_id BIGINT,
    ADD COLUMN valor_original_documento_apresentado TEXT,
    ADD COLUMN valor_original_projeto TEXT,
    ADD CONSTRAINT fk_encaminhamento_projeto
        FOREIGN KEY (projeto_estudo_id)
        REFERENCES projeto_estudo (projeto_estudo_id)
        ON DELETE RESTRICT;

CREATE INDEX idx_encaminhamento_projeto_estudo_id
    ON encaminhamento (projeto_estudo_id)
    WHERE projeto_estudo_id IS NOT NULL;

COMMENT ON COLUMN encaminhamento.documento_apresentado IS
'Indicador triestado de que o paciente apresentou o documento de encaminhamento.';
COMMENT ON COLUMN encaminhamento.projeto_estudo_id IS
'Projeto oficial opcional relacionado ao encaminhamento.';
COMMENT ON COLUMN encaminhamento.valor_original_documento_apresentado IS
'Conteudo original usado para interpretar a apresentacao do documento.';
COMMENT ON COLUMN encaminhamento.valor_original_projeto IS
'Grafia original do projeto relacionado ao encaminhamento.';

COMMIT;

-- ============================================================
-- Projeto: Ambulatorio Santa Casa
-- Arquivo: 01_criar_schema.sql
-- Finalidade:
--   Criar o schema principal do sistema.
--
-- Como executar:
--   psql -U ambulatorio_user -d ambulatorio_santa_casa -h localhost -f sql/01_criar_schema.sql
-- ============================================================

CREATE SCHEMA IF NOT EXISTS ambulatorio
AUTHORIZATION ambulatorio_user;

ALTER DATABASE ambulatorio_santa_casa
SET search_path TO ambulatorio, public;

COMMENT ON SCHEMA ambulatorio IS
'Schema principal do sistema do ambulatorio Santa Casa.';
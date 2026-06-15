-- ============================================================
-- Projeto: Ambulatorio Santa Casa
-- Arquivo: 00_criar_banco.sql
-- Finalidade:
--   Criar o usuario e o banco de dados do projeto.
--
-- Como executar:
--   sudo -u postgres psql -f sql/00_criar_banco.sql
--
-- Observacao importante:
--   Este script NAO define senha para o usuario do banco.
--   Senhas nao devem ser versionadas no Git.
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'ambulatorio_user'
    ) THEN
        CREATE ROLE ambulatorio_user WITH LOGIN CREATEDB;
    END IF;
END
$$;

SELECT
    'CREATE DATABASE ambulatorio_santa_casa
     OWNER ambulatorio_user
     ENCODING ''UTF8'''
WHERE NOT EXISTS (
    SELECT 1
    FROM pg_database
    WHERE datname = 'ambulatorio_santa_casa'
)\gexec
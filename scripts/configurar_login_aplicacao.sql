\set ON_ERROR_STOP on
\getenv app_login APP_DB_USER
\getenv app_password APP_DB_PASSWORD

SELECT (:'app_login' ~ '^[a-z_][a-z0-9_]{0,62}$' AND :'app_password' <> '') AS config_valida \gset
\if :config_valida
\else
  \echo Configuração do login técnico inválida
  \quit 1
\endif

SELECT format('CREATE ROLE %I LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L',
              :'app_login', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_login')
\gexec
SELECT format('ALTER ROLE %I PASSWORD %L', :'app_login', :'app_password') \gexec
SELECT format('GRANT ambulatorio_aplicacao TO %I', :'app_login') \gexec

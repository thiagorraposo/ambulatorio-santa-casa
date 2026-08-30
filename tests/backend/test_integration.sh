#!/usr/bin/env bash
set -euo pipefail

code="BACKEND-SINTETICO-$PPID"
login_consulta="consulta.$PPID@example.invalid"
login_edicao="edicao.$PPID@example.invalid"
login_inativo="inativo.$PPID@example.invalid"

cleanup() {
  psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 -c "DELETE FROM ambulatorio.paciente WHERE codigo_planilha='$code'" >/dev/null
  psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 -c "DELETE FROM ambulatorio.usuario_aplicacao WHERE login IN ('$login_consulta','$login_edicao','$login_inativo')" >/dev/null
}
trap cleanup EXIT

psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
  -c "INSERT INTO ambulatorio.paciente (codigo_planilha,nome,data_nascimento) VALUES ('$code','Paciente Backend Sintético',DATE '2000-01-01')"
psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
  -c "INSERT INTO ambulatorio.usuario_aplicacao (nome,login,senha_hash,perfil,ativo) VALUES
  ('Consulta Sintetica','$login_consulta','\$2b\$12\$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','consulta',TRUE),
  ('Edicao Sintetica','$login_edicao','\$2b\$12\$ihrzl1PutKrmTkYREM1fBu9SRK94CJ7mZLYlmSdW3h3hgtymRQiRW','edicao',TRUE),
  ('Inativa Sintetica','$login_inativo','\$2b\$12\$542XBFYCJqypMXpScJDyE.lXNtiFpsepbC4yeQMfhtac9BVLr0q6W','consulta',FALSE)"

cd backend
NODE_ENV=test API_PORT="$API_PORT" APP_DB_HOST="$APP_DB_HOST" APP_DB_PORT="$APP_DB_PORT" \
APP_DB_NAME="$APP_DB_NAME" APP_DB_USER="$APP_DB_USER" APP_DB_PASSWORD="$APP_DB_PASSWORD" \
APP_DB_ROLE=ambulatorio_aplicacao AUTH_JWT_SECRET="$AUTH_JWT_SECRET" \
AUTH_JWT_EXPIRES_IN_SECONDS="$AUTH_JWT_EXPIRES_IN_SECONDS" \
TEST_LOGIN_CONSULTA="$login_consulta" TEST_LOGIN_EDICAO="$login_edicao" \
TEST_LOGIN_INATIVO="$login_inativo" npm run test:integration

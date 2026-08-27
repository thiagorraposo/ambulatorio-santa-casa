#!/usr/bin/env bash
set -euo pipefail

code="BACKEND-SINTETICO-$PPID"

cleanup() {
  psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 -c "DELETE FROM ambulatorio.paciente WHERE codigo_planilha='$code'" >/dev/null
}
trap cleanup EXIT

psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
  -c "INSERT INTO ambulatorio.paciente (codigo_planilha,nome,data_nascimento) VALUES ('$code','Paciente Backend Sintético',DATE '2000-01-01')"

cd backend
NODE_ENV=test API_PORT="$API_PORT" APP_DB_HOST="$APP_DB_HOST" APP_DB_PORT="$APP_DB_PORT" \
APP_DB_NAME="$APP_DB_NAME" APP_DB_USER="$APP_DB_USER" APP_DB_PASSWORD="$APP_DB_PASSWORD" \
APP_DB_ROLE=ambulatorio_aplicacao npm run test:integration

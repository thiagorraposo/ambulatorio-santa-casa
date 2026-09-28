#!/usr/bin/env bash
set -euo pipefail

# Servidor descartável exclusivo da tarefa; nunca usar o banco persistente.
: "${SYNTHETIC_PG_HOST:=127.0.0.1}"
: "${SYNTHETIC_PG_PORT:=55457}"
: "${SYNTHETIC_PG_USER:=ambulatorio_user}"
: "${PGPASSWORD:?Informe a senha do servidor sintético descartável}"
export PGHOST="$SYNTHETIC_PG_HOST" PGPORT="$SYNTHETIC_PG_PORT" PGUSER="$SYNTHETIC_PG_USER"
task_db="etapa5_clinical_${BASHPID}_$(date +%s)"
task_login="etapa5_http_${BASHPID}"
export APP_DB_USER="$task_login" APP_DB_PASSWORD=senha_exclusivamente_sintetica_http
createdb "$task_db"
task_role_created=false
cleanup() {
  dropdb "$task_db"
  if "$task_role_created"; then
    psql -X -q -d postgres -v ON_ERROR_STOP=1 -c "DROP ROLE $task_login"
  fi
}
trap cleanup EXIT
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -c "CREATE SCHEMA ambulatorio AUTHORIZATION ambulatorio_user; ALTER DATABASE $task_db SET search_path TO ambulatorio,public"
for migration in sql/[0-9][0-9]_*.sql; do
  # 00/01 configuram o banco nominal. O equivalente isolado foi criado acima.
  if [[ "$migration" == sql/00_* || "$migration" == sql/01_* ]]; then continue; fi
  psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f "$migration"
done
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f scripts/configurar_login_aplicacao.sql
task_role_created=true
export TEST_OWNER_HOST="$PGHOST" TEST_OWNER_PORT="$PGPORT" TEST_OWNER_USER="$PGUSER"
export TEST_OWNER_PASSWORD="$PGPASSWORD" TEST_CLINICAL_DB="$task_db"
export NODE_ENV=test API_PORT=3000 APP_DB_HOST="$PGHOST" APP_DB_PORT="$PGPORT" APP_DB_NAME="$task_db"
export APP_DB_ROLE=ambulatorio_aplicacao CLINICAL_ACCESS_POLICY=vinculo_explicito
export AUTH_JWT_SECRET=segredo_exclusivamente_sintetico_da_integracao_clinica_etapa5
export AUTH_JWT_EXPIRES_IN_SECONDS=900
cd backend
npx jest --runInBand --runTestsByPath test/clinical/clinical.http.spec.ts

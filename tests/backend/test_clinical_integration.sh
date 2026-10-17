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
task_import_login="etapa5_import_${BASHPID}"
task_review_login="etapa5_review_${BASHPID}"
task_manager_login="etapa5_review_manager_${BASHPID}"
task_fixture="$(mktemp /tmp/etapa5-http-XXXXXX.xlsx)"
export APP_DB_USER="$task_login" APP_DB_PASSWORD=senha_exclusivamente_sintetica_http
createdb "$task_db"
task_role_created=false
task_import_role_created=false
task_review_role_created=false
task_manager_role_created=false
cleanup() {
  dropdb "$task_db"
  if "$task_role_created"; then
    psql -X -q -d postgres -v ON_ERROR_STOP=1 -c "DROP ROLE $task_login"
  fi
  if "$task_import_role_created"; then
    psql -X -q -d postgres -v ON_ERROR_STOP=1 -c "DROP ROLE $task_import_login"
  fi
  if "$task_review_role_created"; then
    psql -X -q -d postgres -v ON_ERROR_STOP=1 -c "DROP ROLE $task_review_login"
  fi
  if "$task_manager_role_created"; then
    psql -X -q -d postgres -v ON_ERROR_STOP=1 -c "DROP ROLE $task_manager_login"
  fi
  rm -f "$task_fixture"
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
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -c "CREATE ROLE $task_import_login LOGIN PASSWORD 'senha_exclusivamente_sintetica_import_http'; GRANT ambulatorio_importador TO $task_import_login"
task_import_role_created=true
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -c "CREATE ROLE $task_review_login LOGIN PASSWORD 'senha_exclusivamente_sintetica_revisao_http'; GRANT ambulatorio_revisao_servico,ambulatorio_servico_autenticado TO $task_review_login"
task_review_role_created=true
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -c "CREATE ROLE $task_manager_login LOGIN PASSWORD 'senha_exclusivamente_sintetica_gestor_revisao'; GRANT ambulatorio_revisao_gestor,ambulatorio_servico_autenticado TO $task_manager_login"
task_manager_role_created=true
python3 tests/importador/gerar_planilha_sintetica.py >/dev/null
python3 tests/backend/gerar_planilha_http_sintetica.py "$task_fixture"
export TEST_IMPORT_FIXTURE="$task_fixture"
export CLINICAL_IMPORT_ENABLED=true IMPORT_DB_HOST="$PGHOST" IMPORT_DB_PORT="$PGPORT" IMPORT_DB_NAME="$task_db"
export IMPORT_DB_USER="$task_import_login" IMPORT_DB_PASSWORD=senha_exclusivamente_sintetica_import_http
export TEST_REVIEW_DB_USER="$task_review_login" TEST_REVIEW_DB_PASSWORD=senha_exclusivamente_sintetica_revisao_http
export REVISION_HTTP_ENABLED=true REVISION_SYNTHETIC_MODE=true
export REVISION_STAGING_HTTP_ENABLED=true REVISION_GIT=abcdef0
# A migration 63 concede somente os wrappers operacionais à role dedicada.
export REVISION_EXECUTION_HTTP_ENABLED=true
export REVISION_DB_HOST="$PGHOST" REVISION_DB_PORT="$PGPORT" REVISION_DB_NAME="$task_db"
export REVISION_DB_USER="$task_review_login" REVISION_DB_PASSWORD=senha_exclusivamente_sintetica_revisao_http
export REVISION_MANAGER_HTTP_ENABLED=true REVISION_MANAGER_DB_HOST="$PGHOST" REVISION_MANAGER_DB_PORT="$PGPORT"
export REVISION_MANAGER_DB_NAME="$task_db" REVISION_MANAGER_DB_USER="$task_manager_login"
export REVISION_MANAGER_DB_PASSWORD=senha_exclusivamente_sintetica_gestor_revisao
export TEST_OWNER_HOST="$PGHOST" TEST_OWNER_PORT="$PGPORT" TEST_OWNER_USER="$PGUSER"
export TEST_OWNER_PASSWORD="$PGPASSWORD" TEST_CLINICAL_DB="$task_db"
export NODE_ENV=test API_PORT=3000 APP_DB_HOST="$PGHOST" APP_DB_PORT="$PGPORT" APP_DB_NAME="$task_db"
export APP_DB_ROLE=ambulatorio_aplicacao CLINICAL_ACCESS_POLICY=vinculo_explicito
export AUTH_JWT_SECRET=segredo_exclusivamente_sintetico_da_integracao_clinica_etapa5
export AUTH_JWT_EXPIRES_IN_SECONDS=900
cd backend
if (( $# )); then
  npx jest --runInBand --runTestsByPath "$@"
else
  npx jest --runInBand --runTestsByPath test/clinical/clinical.http.spec.ts test/clinical/recursos.http.spec.ts test/clinical/response-dto.http.spec.ts test/clinical/familiares.http.spec.ts test/clinical/catalogos.http.spec.ts test/clinical/stage7.http.spec.ts test/clinical/operacoes.http.spec.ts test/clinical/importacoes.http.spec.ts test/clinical/revisoes.sql.http.spec.ts test/clinical/revisoes.staging.http.spec.ts test/clinical/versioning.http.spec.ts
fi

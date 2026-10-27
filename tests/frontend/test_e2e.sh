#!/usr/bin/env bash
set -euo pipefail

# O servidor deve ser explicitamente sintético. Este runner só cria e remove
# seu banco e login exclusivos; nunca lê .env ou modifica um banco existente.
: "${SYNTHETIC_PG_HOST:?Informe o host do servidor PostgreSQL sintético}"
: "${SYNTHETIC_PG_PORT:?Informe a porta do servidor PostgreSQL sintético}"
: "${SYNTHETIC_PG_USER:?Informe o administrador do servidor PostgreSQL sintético}"
: "${PGPASSWORD:?Informe a senha do servidor PostgreSQL sintético}"
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
task_dir="$(mktemp -d /tmp/etapa6-frontend-XXXXXX)"
chmod 700 "$task_dir"
task_suffix="${BASHPID}_$(date +%s)_$(node -e "process.stdout.write(require('node:crypto').randomBytes(3).toString('hex'))")"
task_db="etapa6_frontend_${task_suffix}"
task_login="etapa6_http_${task_suffix}"
task_import_login="etapa6_import_${task_suffix}"
task_db_created=false
task_role_created=false
task_import_role_created=false
task_backend_pid=''
task_frontend_pid=''
task_api_port="${FRONTEND_E2E_API_PORT:-6061}"
task_web_port="${FRONTEND_E2E_WEB_PORT:-4176}"
export PGHOST="$SYNTHETIC_PG_HOST" PGPORT="$SYNTHETIC_PG_PORT" PGUSER="$SYNTHETIC_PG_USER"

cleanup() {
  local task_exit=$?
  trap - EXIT INT TERM
  for task_pid in "$task_frontend_pid" "$task_backend_pid"; do
    if [[ -n "$task_pid" ]]; then
      kill "$task_pid" 2>/dev/null || true
      wait "$task_pid" 2>/dev/null || true
    fi
  done
  if "$task_db_created"; then
    dropdb --if-exists --force "$task_db" >"$task_dir/cleanup.log" 2>&1 || {
      printf 'Falha ao remover o banco descartável %s; veja %s/cleanup.log\n' "$task_db" "$task_dir" >&2
      task_exit=1
    }
  fi
  if "$task_role_created"; then
    psql -X -q -d postgres -v ON_ERROR_STOP=1 -c "DROP ROLE IF EXISTS $task_login" >>"$task_dir/cleanup.log" 2>&1 || {
      printf 'Falha ao remover o login descartável %s; veja %s/cleanup.log\n' "$task_login" "$task_dir" >&2
      task_exit=1
    }
  fi
  if "$task_import_role_created"; then
    psql -X -q -d postgres -v ON_ERROR_STOP=1 -c "DROP ROLE IF EXISTS $task_import_login" >>"$task_dir/cleanup.log" 2>&1 || {
      printf 'Falha ao remover o login do worker descartável %s\n' "$task_import_login" >&2
      task_exit=1
    }
  fi
  # Preserva somente evidências sintéticas de execução; arquivo de fixture
  # contém identidades de teste e é removido após o uso.
  rm -f "$task_dir/fixture.json" "$task_dir/importacao.xlsx"
  if (( task_exit != 0 )); then
    # O ambiente deste filho conhece também os segredos aleatórios criados
    # pelo runner, que não existem no ambiente do filtro externo do Make.
    python3 - "$task_root" "$task_dir" >&2 <<'PY' || printf 'Não foi possível resumir os logs do frontend\n' >&2
from collections import deque
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(sys.argv[1]) / "scripts"))
from check_compact import redactor

redact = redactor(os.environ)
directory = Path(sys.argv[2])
for name in ("migrations.log", "backend.log", "frontend.log", "cleanup.log"):
    path = directory / name
    if not path.is_file():
        continue
    print(f"Diagnóstico frontend: {name} (até 30 linhas / 6000 caracteres):")
    try:
        with path.open(encoding="utf-8", errors="replace") as log:
            tail = deque((redact(line) for line in log), maxlen=30)
        print("".join(tail)[-6000:], end="")
    except OSError:
        print("Não foi possível ler este log")
PY
  fi
  printf 'Evidências sintéticas: %s\n' "$task_dir"
  exit "$task_exit"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

for task_port in "$task_api_port" "$task_web_port"; do
  if [[ ! "$task_port" =~ ^[0-9]+$ ]] || (( task_port < 1024 || task_port > 65535 )); then
    printf 'Porta de teste inválida\n' >&2
    exit 1
  fi
done
if [[ "$task_api_port" == "$task_web_port" ]]; then
  printf 'As portas da API e do frontend precisam ser diferentes\n' >&2
  exit 1
fi
# Verifica a disponibilidade antes de criar recursos; não reaproveita serviço.
TASK_API_PORT="$task_api_port" TASK_WEB_PORT="$task_web_port" node --input-type=module <<'JS'
import net from 'node:net';
for (const port of [process.env.TASK_API_PORT, process.env.TASK_WEB_PORT]) {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(Number(port), '127.0.0.1', resolve);
  });
  await new Promise(resolve => server.close(resolve));
}
JS
if [[ ! -f "$task_root/backend/dist/main.js" || ! -f "$task_root/frontend/node_modules/vite/bin/vite.js" ]]; then
  printf 'Execute backend-build e instale as dependências do frontend antes deste alvo\n' >&2
  exit 1
fi

createdb "$task_db"
task_db_created=true
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -c "CREATE SCHEMA ambulatorio AUTHORIZATION $PGUSER; ALTER DATABASE $task_db SET search_path TO ambulatorio,public" >"$task_dir/migrations.log" 2>&1
printf 'Aplicando migrations 02–64 no banco descartável %s\n' "$task_db"
for task_migration in "$task_root"/sql/[0-9][0-9]_*.sql; do
  task_name="$(basename "$task_migration")"
  [[ "$task_name" == 00_* || "$task_name" == 01_* ]] && continue
  if [[ "${task_name:0:2}" > 64 ]]; then
    printf 'Migration fora da base esperada da Etapa 6: %s\n' "$task_name" >&2
    exit 1
  fi
  psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f "$task_migration" >>"$task_dir/migrations.log" 2>&1
done
if [[ "$(psql -X -q -t -A -d postgres -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM pg_roles WHERE rolname='$task_login'")" != 0 ]]; then
  printf 'O login exclusivo de teste já existe; interrompendo\n' >&2
  exit 1
fi
export APP_DB_USER="$task_login"
export APP_DB_PASSWORD="$(node -e "process.stdout.write(require('node:crypto').randomBytes(24).toString('hex'))")"
task_role_created=true
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f "$task_root/scripts/configurar_login_aplicacao.sql" >>"$task_dir/migrations.log" 2>&1
# Worker real com credencial própria, somente no mesmo banco aleatório deste runner.
export IMPORT_DB_USER="$task_import_login"
export IMPORT_DB_PASSWORD="$(node -e "process.stdout.write(require('node:crypto').randomBytes(24).toString('hex'))")"
if [[ "$(psql -X -q -t -A -d postgres -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM pg_roles WHERE rolname='$task_import_login'")" != 0 ]]; then
  printf 'O login exclusivo do worker já existe; interrompendo\n' >&2
  exit 1
fi
task_import_role_created=true
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 >>"$task_dir/migrations.log" 2>&1 <<'SQL'
\getenv worker_login IMPORT_DB_USER
\getenv worker_password IMPORT_DB_PASSWORD
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'worker_login', :'worker_password') \gexec
SELECT format('GRANT ambulatorio_importador TO %I', :'worker_login') \gexec
SQL
python3 "$task_root/tests/backend/gerar_planilha_http_sintetica.py" "$task_dir/importacao.xlsx"
export API_HOST=127.0.0.1
export NODE_ENV=test API_PORT="$task_api_port" APP_DB_HOST="$PGHOST" APP_DB_PORT="$PGPORT" APP_DB_NAME="$task_db"
export APP_DB_ROLE=ambulatorio_aplicacao CLINICAL_ACCESS_POLICY=vinculo_explicito
export AUTH_JWT_SECRET="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")"
# A inspeção humana precisa de tempo para preencher os formulários. O prazo
# curto permanece fixo nos testes automáticos de expiração.
export AUTH_JWT_EXPIRES_IN_SECONDS=60
if [[ "${1:-}" == --serve ]]; then
  export AUTH_JWT_EXPIRES_IN_SECONDS=900
fi
export CLINICAL_IMPORT_ENABLED=true IMPORT_DB_HOST="$PGHOST" IMPORT_DB_PORT="$PGPORT" IMPORT_DB_NAME="$task_db"
export REVISION_HTTP_ENABLED=false REVISION_SYNTHETIC_MODE=false
export REVISION_STAGING_HTTP_ENABLED=false REVISION_EXECUTION_HTTP_ENABLED=false REVISION_MANAGER_HTTP_ENABLED=false
export FRONTEND_API_TARGET="http://127.0.0.1:$task_api_port"
export FRONTEND_E2E_BASE_URL="http://127.0.0.1:$task_web_port"
export FRONTEND_E2E_DIR="$task_dir" FRONTEND_E2E_DB="$task_db" FRONTEND_E2E_FIXTURE="$task_dir/fixture.json"
export FRONTEND_E2E_IMPORT_FILE="$task_dir/importacao.xlsx"
# Os testes residem em tests/frontend, e utilizam as dependências fixadas pelo
# lockfile do frontend, sem um segundo manifesto ou dependências globais.
export NODE_PATH="$task_root/frontend/node_modules${NODE_PATH:+:$NODE_PATH}"

(cd "$task_root/backend" && exec node dist/main.js) >"$task_dir/backend.log" 2>&1 &
task_backend_pid=$!
TASK_READY_URL="$FRONTEND_API_TARGET/v1/health" TASK_PID="$task_backend_pid" node --input-type=module <<'JS'
const deadline = Date.now() + 30_000;
while (Date.now() < deadline) {
  try {
    process.kill(Number(process.env.TASK_PID), 0);
    const response = await fetch(process.env.TASK_READY_URL, { signal: AbortSignal.timeout(1_000) });
    if (response.ok) process.exit(0);
  } catch { /* a próxima tentativa verifica processo e endpoint novamente */ }
  await new Promise(resolve => setTimeout(resolve, 200));
}
throw new Error('API descartável não ficou pronta; consulte backend.log');
JS
node "$task_root/tests/frontend/seed.mjs"
(cd "$task_root/frontend" && exec node node_modules/vite/bin/vite.js --host 127.0.0.1 --port "$task_web_port" --strictPort) >"$task_dir/frontend.log" 2>&1 &
task_frontend_pid=$!
TASK_READY_URL="$FRONTEND_E2E_BASE_URL/login" TASK_PID="$task_frontend_pid" node --input-type=module <<'JS'
const deadline = Date.now() + 30_000;
while (Date.now() < deadline) {
  try {
    process.kill(Number(process.env.TASK_PID), 0);
    const response = await fetch(process.env.TASK_READY_URL, { signal: AbortSignal.timeout(1_000) });
    if (response.ok) process.exit(0);
  } catch { /* somente o servidor criado por este runner é observado */ }
  await new Promise(resolve => setTimeout(resolve, 200));
}
throw new Error('Frontend descartável não ficou pronto; consulte frontend.log');
JS

if [[ "${1:-}" == --serve ]]; then
  printf 'Frontend sintético: %s\nAPI sintética: %s\nFixture: %s\nRunner PID: %s\n' "$FRONTEND_E2E_BASE_URL" "$FRONTEND_API_TARGET" "$FRONTEND_E2E_FIXTURE" "$BASHPID"
  printf 'Sessão de demonstração: %s segundos\n' "$AUTH_JWT_EXPIRES_IN_SECONDS"
  printf 'Usuários: frontend-consulta@example.invalid, frontend-edicao@example.invalid, frontend-administracao@example.invalid\nSenha exclusivamente sintética: Etapa6-sintetica!\n'
  wait "$task_frontend_pid"
else
  cd "$task_root/frontend"
  node node_modules/@playwright/test/cli.js test --config playwright.config.ts "$@"
fi

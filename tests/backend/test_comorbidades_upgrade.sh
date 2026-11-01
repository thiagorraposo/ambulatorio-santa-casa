#!/usr/bin/env bash
set -euo pipefail

# Somente em servidor sintético descartável confirmado pelo chamador/CI.
: "${SYNTHETIC_PG_HOST:?Informe o host sintético descartável}"
: "${SYNTHETIC_PG_PORT:?Informe a porta sintética descartável}"
: "${SYNTHETIC_PG_USER:?Informe o administrador sintético descartável}"
: "${PGPASSWORD:?Informe a senha sintética}"
export PGHOST="$SYNTHETIC_PG_HOST" PGPORT="$SYNTHETIC_PG_PORT" PGUSER="$SYNTHETIC_PG_USER"
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
task_dir="$(mktemp -d /tmp/comorbidades-upgrade-XXXXXX)"
task_db="comorbidades_upgrade_${BASHPID}_$(date +%s)"
task_created=false
cleanup() {
  local task_status=$?
  trap - EXIT
  if "$task_created"; then dropdb "$task_db" || task_status=1; fi
  if (( task_status != 0 )) && [[ -f "$task_dir/migrations.log" ]]; then
    printf 'Diagnóstico do upgrade sintético (até 30 linhas / 6000 caracteres):\n' >&2
    tail -n 30 "$task_dir/migrations.log" | tail -c 6000 >&2
  fi
  printf 'Evidência de upgrade sintético: %s\n' "$task_dir"
  exit "$task_status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
task_identity="$(psql -X -q -d postgres -v ON_ERROR_STOP=1 -Atc 'SELECT current_database(),session_user')"
test "$task_identity" = "postgres|$PGUSER"
printf 'Destino sintético confirmado: %s:%s, %s; banco novo %s\n' "$PGHOST" "$PGPORT" "$task_identity" "$task_db"
createdb "$task_db"
task_created=true
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -c "CREATE SCHEMA ambulatorio AUTHORIZATION ambulatorio_user; ALTER DATABASE $task_db SET search_path TO ambulatorio,public"
for task_migration in "$task_root"/sql/[0-9][0-9]_*.sql; do
  task_version="${task_migration##*/}"; task_version="${task_version%%_*}"
  if (( 10#$task_version < 2 || 10#$task_version > 67 )); then continue; fi
  psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f "$task_migration" >>"$task_dir/migrations.log" 2>&1
done
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE public.legado_preservado AS
WITH p AS (INSERT INTO ambulatorio.paciente(nome) VALUES('Teste legado comorbidade') RETURNING paciente_id),
c AS (INSERT INTO ambulatorio.comorbidade(nome_comorbidade) VALUES('Teste legado catálogo') RETURNING comorbidade_id),
v AS (INSERT INTO ambulatorio.paciente_comorbidade(paciente_id,comorbidade_id,possui_comorbidade,observacoes)
  SELECT paciente_id,comorbidade_id,false,'Legado sintético' FROM p,c RETURNING *)
SELECT to_jsonb(v) AS antes FROM v;
CREATE TABLE public.captura_preservada AS SELECT pg_get_functiondef(p.oid) AS definicao,
  p.proowner,p.proacl,p.prosecdef,p.proconfig FROM pg_proc p WHERE p.oid='ambulatorio.auditoria_capturar()'::regprocedure;
SQL
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f "$task_root/sql/68_avaliacao_comorbidades_atendimento.sql" >>"$task_dir/migrations.log" 2>&1
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.legado_preservado l JOIN ambulatorio.paciente_comorbidade p
      ON p.paciente_comorbidade_id=(l.antes->>'paciente_comorbidade_id')::bigint WHERE to_jsonb(p)=l.antes)
    OR EXISTS(SELECT 1 FROM ambulatorio.avaliacao_comorbidades)
    OR EXISTS(SELECT 1 FROM ambulatorio.avaliacao_comorbidade_item) THEN
    RAISE EXCEPTION 'Upgrade alterou legado ou fabricou avaliações';
  END IF;
  IF EXISTS(SELECT 1 FROM public.captura_preservada a CROSS JOIN pg_proc p
      WHERE p.oid='ambulatorio.auditoria_capturar()'::regprocedure AND
        (a.definicao IS DISTINCT FROM pg_get_functiondef(p.oid) OR a.proowner IS DISTINCT FROM p.proowner
          OR a.proacl IS DISTINCT FROM p.proacl OR a.prosecdef IS DISTINCT FROM p.prosecdef
          OR a.proconfig IS DISTINCT FROM p.proconfig)) THEN
    RAISE EXCEPTION 'Captura compartilhada foi alterada';
  END IF;
END $$;
SQL
printf 'OK: upgrade 67→68 preserva legado/captura e não fabrica snapshots\n'

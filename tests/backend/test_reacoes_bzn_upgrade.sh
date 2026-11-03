#!/usr/bin/env bash
set -euo pipefail

# Somente em servidor sintético descartável confirmado pelo chamador/CI.
: "${SYNTHETIC_PG_HOST:?Informe o host sintético descartável}"
: "${SYNTHETIC_PG_PORT:?Informe a porta sintética descartável}"
: "${SYNTHETIC_PG_USER:?Informe o administrador sintético descartável}"
: "${PGPASSWORD:?Informe a senha sintética}"
export PGHOST="$SYNTHETIC_PG_HOST" PGPORT="$SYNTHETIC_PG_PORT" PGUSER="$SYNTHETIC_PG_USER"
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
task_dir="$(mktemp -d /tmp/reacoes-bzn-upgrade-XXXXXX)"
task_db="reacoes_bzn_upgrade_${BASHPID}_$(date +%s)"
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
  if (( 10#$task_version < 2 || 10#$task_version > 71 )); then continue; fi
  psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f "$task_migration" >>"$task_dir/migrations.log" 2>&1
done
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE public.legado_reacao AS
WITH p AS (INSERT INTO ambulatorio.paciente(nome) VALUES('Reação legada sintética') RETURNING paciente_id),
t AS (INSERT INTO ambulatorio.tratamento_benzonidazol(paciente_id) SELECT paciente_id FROM p RETURNING tratamento_benzonidazol_id),
r AS (INSERT INTO ambulatorio.reacao_adversa_benzonidazol(tratamento_benzonidazol_id,descricao)
 SELECT tratamento_benzonidazol_id,'Texto legado sintético' FROM t RETURNING *) SELECT to_jsonb(r) AS antes FROM r;
CREATE TABLE public.acls_antes AS SELECT role,priv,has_table_privilege(role,'ambulatorio.reacao_adversa_benzonidazol',priv) AS acesso
 FROM unnest(ARRAY['ambulatorio_aplicacao','ambulatorio_importador']) role
 CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) priv;
CREATE TABLE public.funcao_antes AS SELECT pg_get_functiondef(oid) AS definicao,proowner,proacl,proconfig FROM pg_proc
 WHERE oid='ambulatorio.auditoria_capturar()'::regprocedure;
SQL
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f "$task_root/sql/72_captura_reacoes_benzonidazol.sql" >>"$task_dir/migrations.log" 2>&1
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE id bigint; original jsonb; campo bigint;
BEGIN
 SELECT antes INTO STRICT original FROM public.legado_reacao;
 id:=(original->>'reacao_adversa_benzonidazol_id')::bigint;
 IF (SELECT to_jsonb(r) FROM ambulatorio.reacao_adversa_benzonidazol r WHERE reacao_adversa_benzonidazol_id=id) IS DISTINCT FROM original
 OR EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
   WHERE c.tabela_destino='reacao_adversa_benzonidazol' AND e.registro_id=id) THEN RAISE EXCEPTION 'Legado alterado/backfill';END IF;
 IF EXISTS(SELECT 1 FROM public.acls_antes WHERE acesso IS DISTINCT FROM has_table_privilege(role,'ambulatorio.reacao_adversa_benzonidazol',priv))
 OR EXISTS(SELECT 1 FROM public.funcao_antes a JOIN pg_proc p ON p.oid='ambulatorio.auditoria_capturar()'::regprocedure
   WHERE a.definicao IS DISTINCT FROM pg_get_functiondef(p.oid) OR a.proowner IS DISTINCT FROM p.proowner
     OR a.proacl IS DISTINCT FROM p.proacl OR a.proconfig IS DISTINCT FROM p.proconfig) THEN RAISE EXCEPTION 'ACL/capturador alterados';END IF;
 UPDATE ambulatorio.reacao_adversa_benzonidazol SET observacoes='Mudança posterior sintética' WHERE reacao_adversa_benzonidazol_id=id;
 SET CONSTRAINTS ALL IMMEDIATE;
 SELECT campo_id INTO STRICT campo FROM ambulatorio.auditoria_campo WHERE tabela_destino='reacao_adversa_benzonidazol' AND coluna_destino='observacoes';
 IF (SELECT count(*) FROM ambulatorio.auditoria_campo_evento WHERE campo_id=campo AND registro_id=id)<>2
 OR NOT EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo_evento WHERE campo_id=campo AND registro_id=id
   AND origem='marco_atual' AND depois->>'estado'='nulo') THEN RAISE EXCEPTION 'Captura tardia sem marco';END IF;
END $$;
SQL
printf 'OK: upgrade71→72 sem backfill, captura tardia e permissões preexistentes preservadas\n'

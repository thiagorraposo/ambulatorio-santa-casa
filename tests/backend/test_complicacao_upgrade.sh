#!/usr/bin/env bash
set -euo pipefail

# Somente em servidor sintético descartável confirmado pelo chamador/CI.
: "${SYNTHETIC_PG_HOST:?Informe o host sintético descartável}"
: "${SYNTHETIC_PG_PORT:?Informe a porta sintética descartável}"
: "${SYNTHETIC_PG_USER:?Informe o administrador sintético descartável}"
: "${PGPASSWORD:?Informe a senha sintética}"
export PGHOST="$SYNTHETIC_PG_HOST" PGPORT="$SYNTHETIC_PG_PORT" PGUSER="$SYNTHETIC_PG_USER"
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
task_dir="$(mktemp -d /tmp/complicacao-upgrade-XXXXXX)"
task_db="complicacao_upgrade_${BASHPID}_$(date +%s)"
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
  if (( 10#$task_version < 2 || 10#$task_version > 66 )); then continue; fi
  psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f "$task_migration" >>"$task_dir/migrations.log" 2>&1
done
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE public.prova_upgrade_complicacao AS
WITH p AS (INSERT INTO ambulatorio.paciente(nome) VALUES('Teste de upgrade complicação') RETURNING paciente_id),
a AS (INSERT INTO ambulatorio.atendimento(paciente_id,data_atendimento) SELECT paciente_id,'2026-02-01' FROM p RETURNING atendimento_id),
s AS (INSERT INTO ambulatorio.complicacao_chagas(atendimento_id,possui_complicacao,tipo_complicacao,descricao)
  SELECT atendimento_id,false,'geral','Descrição legada de teste' FROM a RETURNING *)
SELECT s.complicacao_chagas_id AS id,to_jsonb(s) AS antes FROM s;
CREATE TABLE public.prova_captura_preservada AS SELECT pg_get_functiondef(p.oid) AS definicao,
  p.proowner,p.proacl,p.prosecdef,p.proconfig FROM pg_proc p
  WHERE p.oid='ambulatorio.auditoria_capturar()'::regprocedure;
SQL
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f "$task_root/sql/67_captura_complicacao_chagas.sql" >>"$task_dir/migrations.log" 2>&1
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE alvo bigint; original jsonb; eventos bigint;
BEGIN
  SELECT id,antes INTO STRICT alvo,original FROM public.prova_upgrade_complicacao;
  IF EXISTS(SELECT 1 FROM public.prova_captura_preservada a
      CROSS JOIN pg_proc p WHERE p.oid='ambulatorio.auditoria_capturar()'::regprocedure
        AND (a.definicao IS DISTINCT FROM pg_get_functiondef(p.oid)
          OR a.proowner IS DISTINCT FROM p.proowner OR a.proacl IS DISTINCT FROM p.proacl
          OR a.prosecdef IS DISTINCT FROM p.prosecdef OR a.proconfig IS DISTINCT FROM p.proconfig)) THEN
    RAISE EXCEPTION 'Upgrade alterou definição ou segurança da captura compartilhada vigente';
  END IF;
  IF (SELECT to_jsonb(s) FROM ambulatorio.complicacao_chagas s WHERE complicacao_chagas_id=alvo) IS DISTINCT FROM original THEN
    RAISE EXCEPTION 'Upgrade alterou a complicacao legada';
  END IF;
  SELECT count(*) INTO eventos FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
    WHERE c.tabela_destino='complicacao_chagas' AND e.registro_id=alvo;
  IF eventos<>0 THEN RAISE EXCEPTION 'Upgrade fabricou histórico da complicacao legada'; END IF;
  UPDATE ambulatorio.complicacao_chagas SET descricao='Descrição técnica posterior à captura' WHERE complicacao_chagas_id=alvo;
  SET CONSTRAINTS ALL IMMEDIATE;
  SELECT count(*) INTO eventos FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
    WHERE c.tabela_destino='complicacao_chagas' AND e.registro_id=alvo AND c.coluna_destino='descricao';
  IF eventos<>2 OR NOT EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='complicacao_chagas' AND e.registro_id=alvo AND c.coluna_destino='descricao'
        AND e.versao_campo=1 AND e.origem='marco_atual' AND e.antes->>'estado'='desconhecido'
        AND e.depois->>'valor'=original->>'descricao') THEN
    RAISE EXCEPTION 'Captura tardia não preservou o limite da história conhecida';
  END IF;
END $$;
SQL
printf 'OK: upgrade 66→67 preserva legado, não faz backfill e captura somente alterações posteriores\n'

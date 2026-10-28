#!/usr/bin/env bash
set -euo pipefail

# Somente em servidor sintético descartável confirmado pelo chamador/CI.
: "${SYNTHETIC_PG_HOST:?Informe o host sintético descartável}"
: "${SYNTHETIC_PG_PORT:?Informe a porta sintética descartável}"
: "${SYNTHETIC_PG_USER:?Informe o administrador sintético descartável}"
: "${PGPASSWORD:?Informe a senha sintética}"
export PGHOST="$SYNTHETIC_PG_HOST" PGPORT="$SYNTHETIC_PG_PORT" PGUSER="$SYNTHETIC_PG_USER"
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
task_dir="$(mktemp -d /tmp/condicao-upgrade-XXXXXX)"
task_db="condicao_upgrade_${BASHPID}_$(date +%s)"
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
  if (( 10#$task_version < 2 || 10#$task_version > 65 )); then continue; fi
  psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f "$task_migration" >>"$task_dir/migrations.log" 2>&1
done
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE public.prova_upgrade_condicao AS
WITH p AS (INSERT INTO ambulatorio.paciente(nome) VALUES('Teste de upgrade condição') RETURNING paciente_id),
a AS (INSERT INTO ambulatorio.atendimento(paciente_id,data_atendimento) SELECT paciente_id,'2026-02-01' FROM p RETURNING atendimento_id),
s AS (INSERT INTO ambulatorio.condicao_chagas(atendimento_id,possui_sintomas,descricao_sintomas,observacoes)
  SELECT atendimento_id,false,'Descrição legada independente','Observação legada de teste' FROM a RETURNING *)
SELECT s.condicao_chagas_id AS id,to_jsonb(s) AS antes FROM s;
SQL
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f "$task_root/sql/66_captura_condicao_chagas.sql" >>"$task_dir/migrations.log" 2>&1
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE alvo bigint; original jsonb; eventos bigint;
BEGIN
  SELECT id,antes INTO STRICT alvo,original FROM public.prova_upgrade_condicao;
  IF (SELECT to_jsonb(s) FROM ambulatorio.condicao_chagas s WHERE condicao_chagas_id=alvo) IS DISTINCT FROM original THEN
    RAISE EXCEPTION 'Upgrade alterou a condicao legada';
  END IF;
  SELECT count(*) INTO eventos FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
    WHERE c.tabela_destino='condicao_chagas' AND e.registro_id=alvo;
  IF eventos<>0 THEN RAISE EXCEPTION 'Upgrade fabricou histórico da condicao legada'; END IF;
  UPDATE ambulatorio.condicao_chagas SET observacoes='Observação técnica posterior à captura' WHERE condicao_chagas_id=alvo;
  SET CONSTRAINTS ALL IMMEDIATE;
  SELECT count(*) INTO eventos FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
    WHERE c.tabela_destino='condicao_chagas' AND e.registro_id=alvo AND c.coluna_destino='observacoes';
  IF eventos<>2 OR NOT EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='condicao_chagas' AND e.registro_id=alvo AND c.coluna_destino='observacoes'
        AND e.versao_campo=1 AND e.origem='marco_atual' AND e.antes->>'estado'='desconhecido'
        AND e.depois->>'valor'=original->>'observacoes') THEN
    RAISE EXCEPTION 'Captura tardia não preservou o limite da história conhecida';
  END IF;
END $$;
SQL
printf 'OK: upgrade 65→66 preserva legado, não faz backfill e captura somente alterações posteriores\n'

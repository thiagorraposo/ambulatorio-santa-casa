#!/usr/bin/env bash
set -euo pipefail

# Somente em servidor sintético descartável confirmado pelo chamador/CI.
: "${SYNTHETIC_PG_HOST:?Informe o host sintético descartável}"
: "${SYNTHETIC_PG_PORT:?Informe a porta sintética descartável}"
: "${SYNTHETIC_PG_USER:?Informe o administrador sintético descartável}"
: "${PGPASSWORD:?Informe a senha sintética}"
export PGHOST="$SYNTHETIC_PG_HOST" PGPORT="$SYNTHETIC_PG_PORT" PGUSER="$SYNTHETIC_PG_USER"
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
task_dir="$(mktemp -d /tmp/resultados-upgrade-XXXXXX)"
task_db="resultados_upgrade_${BASHPID}_$(date +%s)"
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
  if (( 10#$task_version < 2 || 10#$task_version > 72 )); then continue; fi
  psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f "$task_migration" >>"$task_dir/migrations.log" 2>&1
done
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE public.exame_antes AS
WITH p AS (INSERT INTO ambulatorio.paciente(nome) VALUES('Exame legado sintético') RETURNING paciente_id),
e AS (INSERT INTO ambulatorio.paciente_exame_complementar(paciente_id,tipo_exame_complementar_id,bloco_origem,resultado_texto)
 SELECT paciente_id,(SELECT tipo_exame_complementar_id FROM ambulatorio.tipo_exame_complementar WHERE codigo_exame='holter'),
 'trazido','Resultado textual pré-existente' FROM p RETURNING *) SELECT to_jsonb(e) AS antes FROM e;
CREATE TABLE public.resultado_legado_antes AS
WITH a AS (INSERT INTO ambulatorio.atendimento(paciente_id,data_atendimento,origem_registro)
 SELECT (antes->>'paciente_id')::bigint,'2026-02-01','cadastro_sistema' FROM public.exame_antes RETURNING atendimento_id),
e AS (INSERT INTO ambulatorio.atendimento_exame_complementar(atendimento_id,tipo_exame_complementar_id)
 SELECT atendimento_id,(SELECT tipo_exame_complementar_id FROM ambulatorio.tipo_exame_complementar WHERE codigo_exame='holter')
 FROM a RETURNING atendimento_exame_complementar_id),
r AS (INSERT INTO ambulatorio.exame_complementar_resultado(atendimento_exame_complementar_id,nome_campo,valor_texto)
 SELECT atendimento_exame_complementar_id,'Parâmetro legado','Texto legado sem conversão' FROM e RETURNING *)
 SELECT to_jsonb(r) AS antes FROM r;
CREATE TABLE public.funcao_antes AS SELECT pg_get_functiondef(oid) AS definicao,proowner,proacl,proconfig FROM pg_proc
 WHERE oid='ambulatorio.auditoria_capturar()'::regprocedure;
CREATE TABLE public.acls_antes AS SELECT oid,relacl FROM pg_class WHERE oid IN
 ('ambulatorio.paciente_exame_complementar'::regclass,'ambulatorio.atendimento_exame_complementar'::regclass,
 'ambulatorio.exame_complementar_resultado'::regclass);
SQL
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f "$task_root/sql/73_resultados_exame_canonico.sql" >>"$task_dir/migrations.log" 2>&1
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE original jsonb; id bigint; novo bigint;
BEGIN
 SELECT antes INTO STRICT original FROM public.exame_antes;id:=(original->>'paciente_exame_complementar_id')::bigint;
 IF (SELECT to_jsonb(e) FROM ambulatorio.paciente_exame_complementar e WHERE paciente_exame_complementar_id=id) IS DISTINCT FROM original
 OR EXISTS(SELECT 1 FROM ambulatorio.paciente_exame_resultado)
 OR EXISTS(SELECT 1 FROM public.resultado_legado_antes l WHERE l.antes IS DISTINCT FROM
 (SELECT to_jsonb(r) FROM ambulatorio.exame_complementar_resultado r
 WHERE r.exame_complementar_resultado_id=(l.antes->>'exame_complementar_resultado_id')::bigint))
 THEN RAISE EXCEPTION 'Pai/legado alterado ou backfill fabricado';END IF;
 IF EXISTS(SELECT 1 FROM public.acls_antes a JOIN pg_class c USING(oid) WHERE a.relacl IS DISTINCT FROM c.relacl)
 OR EXISTS(SELECT 1 FROM public.funcao_antes a JOIN pg_proc p ON p.oid='ambulatorio.auditoria_capturar()'::regprocedure
 WHERE a.definicao IS DISTINCT FROM pg_get_functiondef(p.oid) OR a.proowner IS DISTINCT FROM p.proowner
 OR a.proacl IS DISTINCT FROM p.proacl OR a.proconfig IS DISTINCT FROM p.proconfig) THEN RAISE EXCEPTION 'ACL/capturador alterados';END IF;
 INSERT INTO ambulatorio.paciente_exame_resultado(paciente_exame_complementar_id,nome_parametro,valor_informado)
 VALUES(id,'Parâmetro sintético','001,200 ± literal') RETURNING resultado_id INTO novo;
 SET CONSTRAINTS ALL IMMEDIATE;
 IF ambulatorio.revisao_alvo_paciente('paciente_exame_resultado',novo)<>(original->>'paciente_id')::bigint
 OR (SELECT count(*) FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
 WHERE c.tabela_destino='paciente_exame_resultado' AND e.registro_id=novo)<>6 THEN RAISE EXCEPTION 'Resolução/captura incompleta';END IF;
 IF has_table_privilege('ambulatorio_importador','ambulatorio.paciente_exame_resultado','INSERT')
 OR has_table_privilege('ambulatorio_aplicacao','ambulatorio.paciente_exame_resultado','UPDATE') THEN RAISE EXCEPTION 'Escrita ampliada indevida';END IF;
END $$;
SQL
printf 'OK: upgrade72→73 preserva pai/legado/ACLs, sem backfill; seis campos capturados\n'

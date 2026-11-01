#!/usr/bin/env bash
set -euo pipefail

# Somente em servidor sintético descartável confirmado pelo chamador/CI.
: "${SYNTHETIC_PG_HOST:?Informe o host sintético descartável}"
: "${SYNTHETIC_PG_PORT:?Informe a porta sintética descartável}"
: "${SYNTHETIC_PG_USER:?Informe o administrador sintético descartável}"
: "${PGPASSWORD:?Informe a senha sintética}"
export PGHOST="$SYNTHETIC_PG_HOST" PGPORT="$SYNTHETIC_PG_PORT" PGUSER="$SYNTHETIC_PG_USER"
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
task_dir="$(mktemp -d /tmp/avc-upgrade-XXXXXX)"
task_db="avc_upgrade_${BASHPID}_$(date +%s)"
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
  if (( 10#$task_version < 2 || 10#$task_version > 68 )); then continue; fi
  psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f "$task_migration" >>"$task_dir/migrations.log" 2>&1
done
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE public.acls_avc_preservadas AS
  SELECT c.oid,c.relacl FROM pg_class c WHERE c.oid IN
    ('ambulatorio.evento_clinico'::regclass,'ambulatorio.evento_clinico_evento_clinico_id_seq'::regclass);
CREATE TABLE public.legado_avc_preservado AS
WITH p AS (INSERT INTO ambulatorio.paciente(nome) VALUES('Teste legado AVC') RETURNING paciente_id),
e AS (INSERT INTO ambulatorio.evento_clinico(paciente_id,tipo_evento,ocorreu,ano_evento,descricao)
  SELECT paciente_id,'avc',false,2020,'Descrição legada sintética' FROM p RETURNING *)
SELECT to_jsonb(e) AS antes FROM e;
CREATE TABLE public.catalogo_anual_preservado AS SELECT to_jsonb(c) AS antes FROM ambulatorio.auditoria_campo c
  WHERE tabela_destino='evento_clinico' AND coluna_destino='ano_evento';
CREATE TABLE public.eventos_anuais_preservados AS SELECT to_jsonb(e) AS antes FROM ambulatorio.auditoria_campo_evento e
  JOIN ambulatorio.auditoria_campo c USING(campo_id) WHERE c.tabela_destino='evento_clinico' AND c.coluna_destino='ano_evento';
CREATE TABLE public.funcoes_preservadas AS SELECT p.oid,pg_get_functiondef(p.oid) AS definicao,
  p.proowner,p.proacl,p.prosecdef,p.proconfig FROM pg_proc p WHERE p.oid IN
    ('ambulatorio.auditoria_capturar()'::regprocedure,'ambulatorio.revisao_alvo_paciente(text,bigint)'::regprocedure);
CREATE TABLE public.gatilhos_preservados AS SELECT oid,pg_get_triggerdef(oid) AS definicao,tgenabled
  FROM pg_trigger WHERE tgrelid='ambulatorio.evento_clinico'::regclass;
SQL
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f "$task_root/sql/69_captura_campos_evento_clinico.sql" >>"$task_dir/migrations.log" 2>&1
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE registro bigint; campo bigint; original jsonb;
BEGIN
  IF EXISTS(SELECT 1 FROM public.acls_avc_preservadas a JOIN pg_class c USING(oid)
      WHERE a.relacl IS DISTINCT FROM c.relacl) THEN
    RAISE EXCEPTION 'Upgrade alterou ACLs existentes de evento_clinico/seq';
  END IF;
  SELECT antes INTO STRICT original FROM public.legado_avc_preservado;
  registro:=(original->>'evento_clinico_id')::bigint;
  IF (SELECT to_jsonb(e) FROM ambulatorio.evento_clinico e WHERE evento_clinico_id=registro) IS DISTINCT FROM original THEN
    RAISE EXCEPTION 'Upgrade alterou AVC legado';
  END IF;
  IF EXISTS(SELECT 1 FROM public.funcoes_preservadas a JOIN pg_proc p USING(oid)
      WHERE a.definicao IS DISTINCT FROM pg_get_functiondef(p.oid) OR a.proowner IS DISTINCT FROM p.proowner
        OR a.proacl IS DISTINCT FROM p.proacl OR a.prosecdef IS DISTINCT FROM p.prosecdef
        OR a.proconfig IS DISTINCT FROM p.proconfig)
    OR EXISTS(SELECT 1 FROM public.gatilhos_preservados a FULL JOIN pg_trigger t
        ON a.oid=t.oid AND t.tgrelid='ambulatorio.evento_clinico'::regclass
      WHERE (a.oid IS NOT NULL OR t.tgrelid='ambulatorio.evento_clinico'::regclass)
        AND (a.oid IS NULL OR t.oid IS NULL OR a.definicao IS DISTINCT FROM pg_get_triggerdef(t.oid)
          OR a.tgenabled IS DISTINCT FROM t.tgenabled)) THEN
    RAISE EXCEPTION 'Upgrade alterou captura/resolução ou gatilhos existentes';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.catalogo_anual_preservado a JOIN ambulatorio.auditoria_campo c
      ON c.tabela_destino='evento_clinico' AND c.coluna_destino='ano_evento' WHERE to_jsonb(c)=a.antes)
    OR EXISTS((SELECT antes FROM public.eventos_anuais_preservados)
      EXCEPT (SELECT to_jsonb(e) FROM ambulatorio.auditoria_campo_evento e
        JOIN ambulatorio.auditoria_campo c USING(campo_id) WHERE c.tabela_destino='evento_clinico' AND c.coluna_destino='ano_evento'))
    OR EXISTS((SELECT to_jsonb(e) FROM ambulatorio.auditoria_campo_evento e
        JOIN ambulatorio.auditoria_campo c USING(campo_id) WHERE c.tabela_destino='evento_clinico' AND c.coluna_destino='ano_evento')
      EXCEPT (SELECT antes FROM public.eventos_anuais_preservados)) THEN
    RAISE EXCEPTION 'Upgrade alterou catálogo/captura_desde ou eventos anuais existentes';
  END IF;
  IF EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo_evento e JOIN ambulatorio.auditoria_campo c USING(campo_id)
      WHERE c.tabela_destino='evento_clinico' AND c.coluna_destino IN ('tipo_evento','ocorreu','descricao','observacoes')) THEN
    RAISE EXCEPTION 'Upgrade fabricou histórico dos campos novos';
  END IF;
  UPDATE ambulatorio.evento_clinico SET descricao='Descrição posterior sintética' WHERE evento_clinico_id=registro;
  SET CONSTRAINTS ALL IMMEDIATE;
  SELECT campo_id INTO STRICT campo FROM ambulatorio.auditoria_campo
    WHERE tabela_destino='evento_clinico' AND coluna_destino='descricao';
  IF (SELECT count(*) FROM ambulatorio.auditoria_campo_evento WHERE campo_id=campo AND registro_id=registro)<>2
    OR NOT EXISTS(SELECT 1 FROM ambulatorio.auditoria_campo_evento WHERE campo_id=campo AND registro_id=registro
      AND versao_campo=1 AND origem='marco_atual' AND antes->>'estado'='desconhecido'
      AND depois->>'valor'=original->>'descricao') THEN
    RAISE EXCEPTION 'Captura tardia não preservou o limite da história conhecida';
  END IF;
END $$;
SQL
printf 'OK: upgrade 68→69 preserva legado, ano_evento, captura/resolução/gatilhos e não faz backfill\n'

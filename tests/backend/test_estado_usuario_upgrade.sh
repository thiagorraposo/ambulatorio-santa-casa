#!/usr/bin/env bash
set -euo pipefail
: "${SYNTHETIC_PG_HOST:?Servidor sintético obrigatório}"
: "${SYNTHETIC_PG_PORT:?Porta sintética obrigatória}"
: "${SYNTHETIC_PG_USER:?Administrador sintético obrigatório}"
: "${PGPASSWORD:?Senha do servidor sintético obrigatória}"
export PGHOST="$SYNTHETIC_PG_HOST" PGPORT="$SYNTHETIC_PG_PORT" PGUSER="$SYNTHETIC_PG_USER"
task_db="test_estado_upgrade_${BASHPID}_$(date +%s)"
task_created=false
cleanup() { if "$task_created"; then dropdb "$task_db"; fi; }
trap cleanup EXIT
createdb "$task_db"
task_created=true
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -c "CREATE SCHEMA ambulatorio AUTHORIZATION $PGUSER; ALTER DATABASE $task_db SET search_path TO ambulatorio,public"
for task_migration in sql/[0-9][0-9]_*.sql; do
  [[ "$task_migration" == sql/00_* || "$task_migration" == sql/01_* ]] && continue
  [[ "${task_migration:4:2}" > 75 ]] && break
  psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f "$task_migration"
done
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
SET search_path TO ambulatorio,public;
DO $$ DECLARE ator bigint; alvo bigint;
BEGIN
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Admin upgrade sintético','upgrade-admin@example.invalid','$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao') RETURNING usuario_id INTO ator;
  INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES
    ('Alvo upgrade sintético','upgrade-alvo@example.invalid','$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','consulta') RETURNING usuario_id INTO alvo;
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(ator);
  SET LOCAL ROLE ambulatorio_aplicacao;
  PERFORM alterar_perfil_usuario(alvo,1,'edicao','Perfil anterior ao upgrade','39ea2309-8510-4c3a-9984-0e65b3b3e4ad',0);
END $$;
COMMIT;
SQL
task_expected="$(psql -X -At -d "$task_db" -v ON_ERROR_STOP=1 -c 'SELECT recibo FROM ambulatorio.usuario_perfil_operacao')"
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 -f sql/76_estado_usuario.sql
task_actual="$(psql -X -At -d "$task_db" -v ON_ERROR_STOP=1 -c 'SELECT recibo FROM ambulatorio.usuario_conta_operacao')"
[[ "$task_expected" == "$task_actual" ]] || { echo 'Recibo histórico mudou no upgrade'; exit 1; }
psql -X -q -d "$task_db" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
SET search_path TO ambulatorio,public;
DO $$ DECLARE ator bigint; alvo bigint; original jsonb; replay jsonb; estado jsonb;
BEGIN
  SELECT usuario_id INTO ator FROM usuario_aplicacao WHERE login='upgrade-admin@example.invalid';
  SELECT usuario_id INTO alvo FROM usuario_aplicacao WHERE login='upgrade-alvo@example.invalid';
  SELECT recibo INTO original FROM usuario_perfil_operacao WHERE usuario_id=alvo;
  SET LOCAL ROLE ambulatorio_servico_autenticado;
  PERFORM auditoria_iniciar_aplicacao(ator);
  SET LOCAL ROLE ambulatorio_aplicacao;
  replay:=alterar_perfil_usuario(alvo,1,'edicao','Perfil anterior ao upgrade','39ea2309-8510-4c3a-9984-0e65b3b3e4ad',0);
  IF replay<>original THEN RAISE EXCEPTION 'Wrapper de perfil perdeu compatibilidade'; END IF;
  estado:=alterar_estado_usuario(alvo,2,false,'Estado após o upgrade','afcb033e-8d2e-47f4-b78a-3c358cdfc210',0);
  IF estado->>'resultado'<>'aplicada' OR estado->'novo'<>'false'::jsonb THEN RAISE EXCEPTION 'Estado indisponível após upgrade'; END IF;
  RAISE NOTICE 'OK: upgrade75→76 preservou recibo, view, replay de perfil e novo estado';
END $$;
ROLLBACK;
SQL

#!/usr/bin/env bash
set -euo pipefail

test_db="${DB_NAME}_importador_test"
fixture="tests/fixtures/planilha_importacao_v1_sintetica.xlsx"

cleanup() {
  dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists "$test_db" >/dev/null
}
trap cleanup EXIT

cleanup
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$test_db"
for migration in sql/[0-1][0-9]_*.sql; do
  psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -v ON_ERROR_STOP=1 -f "$migration"
done

psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -v ON_ERROR_STOP=1 <<'SQL'
SET search_path TO ambulatorio, public;
INSERT INTO paciente (codigo_planilha,nome,data_nascimento,grupo_origem_planilha) VALUES
('P-ANA','Ana Sintética','1980-02-10','portador_dc'),
('DUP-A','Identidade Duplicada','1984-04-04','portador_dc'),
('DUP-B','IDENTIDADE DUPLICADA','1984-04-04','portador_dc');
INSERT INTO projeto_estudo (codigo_projeto,nome_projeto) VALUES
('sami_trop_aim3','SAMI-TROP AIM3'),('parachute','PARACHUTE')
ON CONFLICT (codigo_projeto) DO NOTHING;
DELETE FROM projeto_estudo WHERE codigo_projeto='sami_trop_1_1';
INSERT INTO tipo_exame_complementar (codigo_exame,nome_exame,categoria) VALUES
('eletrocardiograma','Eletrocardiograma','cardiologico'),
('laboratoriais','Laboratoriais','laboratorial'),
('ecocardiograma','Ecocardiograma','cardiologico')
ON CONFLICT (codigo_exame) DO NOTHING;
SQL

python3 tests/importador/gerar_planilha_sintetica.py >/dev/null
python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-e2e \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$DB_USER" --db-name "$test_db"

before="$(psql -X -At -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -c "SET search_path TO ambulatorio,public; SELECT count(*) FROM atendimento;")"
psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" \
  -c "SET search_path TO ambulatorio,public; UPDATE importacao_lote SET status_lote='falhou',finalizado_em=NULL WHERE codigo_lote='sint-v1-e2e';"
python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-e2e-reexec \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$DB_USER" --db-name "$test_db"
after="$(psql -X -At -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -c "SET search_path TO ambulatorio,public; SELECT count(*) FROM atendimento;")"
test "$before" = "$after"
python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-e2e-noop \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$DB_USER" --db-name "$test_db"

psql -X -At -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" \
  -c "SET search_path TO ambulatorio,public; SELECT aba_ordem,numero_linha,status_linha,COALESCE(mensagem_processamento,'') FROM importacao_linha ORDER BY aba_ordem,numero_linha;"

psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -v ON_ERROR_STOP=1 <<'SQL'
SET search_path TO ambulatorio, public;
DO $$
DECLARE
  v_lote bigint;
BEGIN
  SELECT importacao_lote_id INTO v_lote FROM importacao_lote WHERE codigo_lote='sint-v1-e2e';
  IF (SELECT count(*) FROM importacao_lote) <> 1 THEN RAISE EXCEPTION 'reexecução criou lote'; END IF;
  IF (SELECT status_lote FROM importacao_lote WHERE importacao_lote_id=v_lote) <> 'concluido_com_pendencias' THEN RAISE EXCEPTION 'status lote'; END IF;
  IF (SELECT count(*) FROM importacao_linha WHERE importacao_lote_id=v_lote) <> 9 THEN RAISE EXCEPTION 'linhas brutas'; END IF;
  IF (SELECT count(*) FROM importacao_linha WHERE importacao_lote_id=v_lote AND status_linha IN ('importada','importada_com_pendencia')) <> 5 THEN RAISE EXCEPTION 'linhas importadas'; END IF;
  IF (SELECT count(*) FROM importacao_linha WHERE importacao_lote_id=v_lote AND status_linha='rejeitada') <> 4 THEN RAISE EXCEPTION 'linhas rejeitadas'; END IF;
  IF (SELECT count(*) FROM atendimento) <> 5 THEN RAISE EXCEPTION 'um atendimento por linha válida'; END IF;
  IF (SELECT count(*) FROM tratamento_benzonidazol WHERE duracao_cumprida_dias=56) <> 1 THEN RAISE EXCEPTION 'BZN'; END IF;
  IF EXISTS (SELECT 1 FROM paciente WHERE nome='Catálogo Ausente') THEN RAISE EXCEPTION 'rollback da linha'; END IF;
  IF (SELECT count(*) FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id) WHERE l.importacao_lote_id=v_lote AND tabela_destino='atendimento') <> 5 THEN RAISE EXCEPTION 'proveniência'; END IF;
  IF (SELECT count(*) FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id) WHERE l.importacao_lote_id=v_lote) <> 31 THEN RAISE EXCEPTION 'total de vínculos de proveniência'; END IF;
  IF NOT EXISTS (SELECT 1 FROM importacao_linha WHERE importacao_lote_id=v_lote AND dados_brutos @> '[{"chave":"localizado","valor":"sim"}]') THEN RAISE EXCEPTION 'Localizado bruto'; END IF;
  IF NOT EXISTS (SELECT 1 FROM importacao_linha WHERE importacao_lote_id=v_lote AND status_linha='rejeitada' AND mensagem_processamento LIKE 'conflito entre abas:%') THEN RAISE EXCEPTION 'precedência entre abas'; END IF;
  IF NOT EXISTS (SELECT 1 FROM importacao_linha WHERE importacao_lote_id=v_lote AND status_linha='importada_com_pendencia' AND dados_brutos @> '[{"chave":"pendencias_observacao","valor":"texto parcial preservado"}]') THEN RAISE EXCEPTION 'parcial bruto'; END IF;
END $$;
SQL

echo "OK: fluxo sintético do importador, proveniência, rollback e idempotência"

#!/usr/bin/env bash
set -euo pipefail

test_db="${DB_NAME}_importador_test"
fixture="tests/fixtures/planilha_importacao_v1_sintetica.xlsx"
import_user="ambulatorio_importador_e2e"
import_password="senha_exclusivamente_sintetica_e2e"

cleanup() {
  dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists "$test_db" >/dev/null
  psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c "DROP ROLE IF EXISTS $import_user" >/dev/null
}
trap cleanup EXIT

cleanup
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$test_db"
psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -v ON_ERROR_STOP=1 \
  -c "ALTER DATABASE $test_db SET search_path TO ambulatorio, public"
for migration in sql/[0-9][0-9]_*.sql; do
  psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -v ON_ERROR_STOP=1 -f "$migration"
done

psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -v ON_ERROR_STOP=1 \
  -c "CREATE ROLE $import_user LOGIN PASSWORD '$import_password'; GRANT ambulatorio_importador TO $import_user;"

psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -v ON_ERROR_STOP=1 <<'SQL'
SET search_path TO ambulatorio, public;
INSERT INTO paciente (codigo_planilha,nome,data_nascimento,grupo_origem_planilha) VALUES
('P-ANA','Ana Sintética','1980-02-10','portador_dc'),
('DUP-A','Identidade Duplicada','1984-04-04','portador_dc'),
('DUP-B','IDENTIDADE DUPLICADA','1984-04-04','portador_dc');
INSERT INTO projeto_estudo (codigo_projeto,nome_projeto) VALUES
('sami_trop_aim3','SAMI-TROP AIM3'),('sami_trop_1_1','SAMI-TROP 1.1'),('parachute','PARACHUTE'),
('benbrasil','BENBRASIL'),('epoca','EPOCA'),('santa_casa_dica','DICA'),('renomica','RENOMICA'),
('archimedes','ARCHIMEDES'),('charm','CHARM'),('lxe_novartis','LXE NOVARTIS')
ON CONFLICT (codigo_projeto) DO NOTHING;
INSERT INTO tipo_exame_complementar (codigo_exame,nome_exame,categoria) VALUES
('eletrocardiograma','Eletrocardiograma','cardiologico'),
('laboratoriais','Laboratoriais','laboratorial'),
('ecocardiograma','Ecocardiograma','cardiologico'),('imagem','Imagem','imagem'),('holter','Holter','cardiologico'),
('endoscopia','Endoscopia','outro'),('colonoscopia','Colonoscopia','outro'),('teste_ergometrico','Teste ergométrico','cardiologico'),('mapa','MAPA','cardiologico'),('outro','Outro','outro')
ON CONFLICT (codigo_exame) DO NOTHING;
INSERT INTO medicamento (codigo_medicamento,nome_medicamento) VALUES
('antihipertensivo_nao_especificado','Anti-hipertensivo sintético'),('diuretico_nao_especificado','Diurético sintético'),
('antiarritmico_nao_especificado','Antiarrítmico sintético'),('betabloqueador_nao_especificado','Betabloqueador sintético')
ON CONFLICT (codigo_medicamento) DO NOTHING;
INSERT INTO comorbidade (nome_comorbidade)
SELECT x FROM unnest(ARRAY['comorbidades_nao_relacionadas_a_dc','hipertensao_arterial','diabetes','doenca_renal','doencas_psicologicas','doencas_do_sistema_cardiovascular','doencas_do_sistema_respiratorio','doencas_do_sistema_digestorio','doencas_do_sistema_nervoso','doencas_do_sistema_endocrino','doencas_do_sistema_imunologico','doencas_do_sistema_tegumentar','outras_doencas']) x
ON CONFLICT (nome_comorbidade) DO NOTHING;
SQL

role_check="$(PGPASSWORD="$import_password" psql -X -qAt -h "$DB_HOST" -p "$DB_PORT" \
  -U "$import_user" -d "$test_db" -v ON_ERROR_STOP=1 \
  -c "SELECT has_table_privilege('ambulatorio_importador','ambulatorio.paciente','SELECT');")"
test "$role_check" = "t"

python3 tests/importador/gerar_planilha_sintetica.py >/dev/null
snapshot_before="$(psql -X -At -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -c "SET search_path TO ambulatorio,public; SELECT (SELECT count(*) FROM paciente)||'|'||(SELECT count(*) FROM atendimento)||'|'||(SELECT count(*) FROM importacao_lote)||'|'||(SELECT count(*) FROM importacao_linha);")"
PGPASSWORD="$import_password" python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-dry-run \
  --dry-run --quality-report /tmp/ambulatorio-quality-1.json \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$import_user" --db-role ambulatorio_importador --db-name "$test_db" \
  2>/tmp/ambulatorio-importador.log
snapshot_after="$(psql -X -At -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -c "SET search_path TO ambulatorio,public; SELECT (SELECT count(*) FROM paciente)||'|'||(SELECT count(*) FROM atendimento)||'|'||(SELECT count(*) FROM importacao_lote)||'|'||(SELECT count(*) FROM importacao_linha);")"
test "$snapshot_before" = "$snapshot_after"
PGPASSWORD="$import_password" python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-dry-run \
  --dry-run --quality-report /tmp/ambulatorio-quality-2.json \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$import_user" --db-role ambulatorio_importador --db-name "$test_db" \
  2>>/tmp/ambulatorio-importador.log
cmp /tmp/ambulatorio-quality-1.json /tmp/ambulatorio-quality-2.json
python3 - <<'PY'
import json
r=json.load(open('/tmp/ambulatorio-quality-1.json'))
assert r['schema']=='ambulatorio.import-quality-report/v1'
assert r['mode']=='dry-run'
assert r['metrics']=={'between_sheet_conflicts': 1, 'identity_conflicts': 1,
 'importable_rows': 6, 'invalid_values': 1, 'other_causes': 1,
 'pending_rows': 2, 'rejected_rows': 4, 'total_rows': 10,
 'unknown_catalogs': 0, 'valid_rows': 6}
PY
if rg -i 'Ana Sintética|Identidade Duplicada|telefone|texto parcial preservado' /tmp/ambulatorio-importador.log; then
  echo "Erro: log estruturado contém dado sensível ou valor clínico" >&2
  exit 1
fi

PGPASSWORD="$import_password" python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-e2e \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$import_user" --db-role ambulatorio_importador --db-name "$test_db"

before="$(psql -X -At -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -c "SET search_path TO ambulatorio,public; SELECT count(*) FROM atendimento;")"
psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" \
  -c "SET search_path TO ambulatorio,public; UPDATE importacao_lote SET status_lote='falhou',finalizado_em=NULL WHERE codigo_lote='sint-v1-e2e';"
PGPASSWORD="$import_password" python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-e2e-reexec \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$import_user" --db-role ambulatorio_importador --db-name "$test_db"
after="$(psql -X -At -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -c "SET search_path TO ambulatorio,public; SELECT count(*) FROM atendimento;")"
test "$before" = "$after"
PGPASSWORD="$import_password" python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-e2e-noop \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$import_user" --db-role ambulatorio_importador --db-name "$test_db"

PGPASSWORD="$import_password" python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-e2e-reprocessado --reprocessar \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$import_user" --db-role ambulatorio_importador --db-name "$test_db"
after_reprocess="$(psql -X -At -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -c "SET search_path TO ambulatorio,public; SELECT count(*) FROM atendimento;")"
test "$before" = "$after_reprocess"
PGPASSWORD="$import_password" python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-e2e-reprocessado-2 --reprocessar \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$import_user" --db-role ambulatorio_importador --db-name "$test_db"
after_second_reprocess="$(psql -X -At -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -c "SET search_path TO ambulatorio,public; SELECT count(*) FROM atendimento;")"
test "$before" = "$after_second_reprocess"

psql -X -At -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" \
  -c "SET search_path TO ambulatorio,public; SELECT aba_ordem,numero_linha,status_linha,COALESCE(mensagem_processamento,'') FROM importacao_linha ORDER BY aba_ordem,numero_linha;"

psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -v ON_ERROR_STOP=1 <<'SQL'
SET search_path TO ambulatorio, public;
DO $$
DECLARE
  v_lote bigint;
  v_reprocessado bigint;
  v_reprocessado_2 bigint;
BEGIN
  SELECT importacao_lote_id INTO v_lote FROM importacao_lote WHERE codigo_lote='sint-v1-e2e';
  SELECT importacao_lote_id INTO v_reprocessado FROM importacao_lote WHERE codigo_lote='sint-v1-e2e-reprocessado';
  SELECT importacao_lote_id INTO v_reprocessado_2 FROM importacao_lote WHERE codigo_lote='sint-v1-e2e-reprocessado-2';
  IF (SELECT count(*) FROM importacao_lote) <> 3 THEN RAISE EXCEPTION 'quantidade de lotes'; END IF;
  IF (SELECT lote_reprocessado_de_id FROM importacao_lote WHERE importacao_lote_id=v_reprocessado) <> v_lote THEN RAISE EXCEPTION 'cadeia imediata'; END IF;
  IF (SELECT lote_reprocessado_de_id FROM importacao_lote WHERE importacao_lote_id=v_reprocessado_2) <> v_reprocessado THEN RAISE EXCEPTION 'segundo elo imediato'; END IF;
  IF (SELECT status_lote FROM importacao_lote WHERE importacao_lote_id=v_lote) <> 'concluido_com_pendencias' THEN RAISE EXCEPTION 'status lote'; END IF;
  IF (SELECT count(*) FROM importacao_linha WHERE importacao_lote_id=v_lote) <> 10 THEN RAISE EXCEPTION 'linhas brutas'; END IF;
  IF (SELECT count(*) FROM importacao_linha WHERE importacao_lote_id=v_lote AND status_linha IN ('importada','importada_com_pendencia')) <> 6 THEN RAISE EXCEPTION 'linhas importadas'; END IF;
  IF (SELECT count(*) FROM importacao_linha WHERE importacao_lote_id=v_lote AND status_linha='rejeitada') <> 4 THEN RAISE EXCEPTION 'linhas rejeitadas'; END IF;
  IF (SELECT count(*) FROM atendimento) <> 6 THEN RAISE EXCEPTION 'um atendimento por linha válida'; END IF;
  IF (SELECT count(*) FROM tratamento_benzonidazol WHERE duracao_cumprida_dias=56) <> 1 THEN RAISE EXCEPTION 'BZN'; END IF;
  IF EXISTS (SELECT 1 FROM paciente WHERE nome='Falha Atômica') THEN RAISE EXCEPTION 'rollback da linha'; END IF;
  IF (SELECT count(*) FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id) WHERE l.importacao_lote_id=v_lote AND tabela_destino='atendimento') <> 6 THEN RAISE EXCEPTION 'proveniência'; END IF;
  IF (SELECT count(*) FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id) WHERE l.importacao_lote_id=v_lote) < 100 THEN RAISE EXCEPTION 'cobertura de proveniência insuficiente'; END IF;
  IF (SELECT count(*) FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id) WHERE l.importacao_lote_id=v_reprocessado) <> (SELECT count(*) FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id) WHERE l.importacao_lote_id=v_lote AND l.status_linha IN ('importada','importada_com_pendencia')) THEN RAISE EXCEPTION 'proveniência reprocessada'; END IF;
  IF (SELECT count(DISTINCT tabela_destino) FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id) WHERE l.importacao_lote_id=v_lote) <> 22 THEN RAISE EXCEPTION 'handlers/tabelas estruturadas'; END IF;
  IF NOT EXISTS (SELECT 1 FROM importacao_linha WHERE importacao_lote_id=v_lote AND dados_brutos @> '[{"chave":"localizado","valor":"sim"}]') THEN RAISE EXCEPTION 'Localizado bruto'; END IF;
  IF NOT EXISTS (SELECT 1 FROM importacao_linha WHERE importacao_lote_id=v_lote AND status_linha='rejeitada' AND mensagem_processamento LIKE 'conflito entre abas:%') THEN RAISE EXCEPTION 'precedência entre abas'; END IF;
  IF NOT EXISTS (SELECT 1 FROM importacao_linha WHERE importacao_lote_id=v_lote AND status_linha='importada_com_pendencia' AND dados_brutos @> '[{"chave":"pendencias_observacao","valor":"texto parcial preservado"}]') THEN RAISE EXCEPTION 'parcial bruto'; END IF;
  IF (SELECT count(DISTINCT item->>'chave') FROM importacao_linha l CROSS JOIN LATERAL jsonb_array_elements(l.dados_brutos) item WHERE l.importacao_lote_id=v_lote AND l.aba_ordem=2 AND l.numero_linha=2 AND item->>'valor' IS NOT NULL AND item->>'chave' IN ('idade','autorelato_diagnostico_de_chagas_do_participante_data','familiares_diretos_mae_pai_irmaos_realizaram_o_exame_de_chagas','paciente_trouxe_outros_exames_complementares','solicitado_exames_complementares','retorno_30_dias_de_tratamento','retorno_final_de_tratamento','retorno_anual_realizado','desfecho_do_retorno','paciente_com_contrarreferencia_realizada','pendencias_observacao')) <> 11 THEN RAISE EXCEPTION 'onze parciais no bruto'; END IF;
  IF (SELECT count(*) FROM historico_familiar_chagas) <> 0 THEN RAISE EXCEPTION 'histórico familiar inventado a partir de exame de parentes'; END IF;
  IF (SELECT count(*) FROM dados_clinicos_atendimento WHERE altura_cm=170 AND nyha='II') <> 1 THEN RAISE EXCEPTION 'dados clínicos'; END IF;
  IF (SELECT count(*) FROM sorologia_chagas) <> 3 THEN RAISE EXCEPTION 'sorologias'; END IF;
  IF (SELECT count(*) FROM atendimento_medicamento) <> 13 THEN RAISE EXCEPTION 'medicamentos'; END IF;
  IF (SELECT count(*) FROM paciente_comorbidade) <> 13 THEN RAISE EXCEPTION 'comorbidades'; END IF;
  IF (SELECT count(*) FROM dispositivo_implantado) <> 2 THEN RAISE EXCEPTION 'dispositivos'; END IF;
  IF (SELECT count(*) FROM notificacao) <> 1 OR (SELECT count(*) FROM obito) <> 1 THEN RAISE EXCEPTION 'notificação/óbito'; END IF;
END $$;
SQL

echo "OK: 124 destinos, handlers, proveniência, rollback, idempotência e reprocessamento encadeado"

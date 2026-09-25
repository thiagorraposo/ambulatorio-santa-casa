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
('P-NOVO','Carlos Sintético','1990-03-03','portador_dc'),
('DUP-A','Identidade Duplicada','1984-04-04','portador_dc'),
('DUP-B','IDENTIDADE DUPLICADA','1984-04-04','portador_dc');
INSERT INTO tratamento_benzonidazol (paciente_id,tem_indicacao,teve_reacao_adversa,
                                    valor_original_indicacao,valor_original_reacao_adversa)
SELECT paciente_id,TRUE,FALSE,'sim','não' FROM paciente WHERE codigo_planilha='P-NOVO';
INSERT INTO projeto_estudo (codigo_projeto,nome_projeto) VALUES
('sami_trop_aim3','SAMI-TROP AIM3'),('parachute','PARACHUTE'),
('benbrasil','BENBRASIL'),('epoca','EPOCA'),('santa_casa_dica','DICA'),('renomica','RENOMICA'),
('archimedes','ARCHIMEDES'),('charm','CHARM'),('lxe_novartis','LXE NOVARTIS')
ON CONFLICT (codigo_projeto) DO NOTHING;
DELETE FROM projeto_estudo WHERE codigo_projeto='sami_trop_1_1';
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

# Compara todas as tabelas e sequências, incluindo bruto, proveniência e timestamps.
# Sequências não são revertidas por ROLLBACK: detectam escrita até no dry-run recusado.
snapshot_state() {
  psql -X -qAt -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -v ON_ERROR_STOP=1 <<'SQL'
SELECT format(
  'SELECT %L || md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t))::text, ''[]'')) FROM %I.%I t;',
  tablename || ':', schemaname, tablename)
FROM pg_tables WHERE schemaname='ambulatorio' ORDER BY tablename
\gexec
SELECT format('SELECT %L || last_value::text || '':'' || is_called::text FROM %I.%I;',
              sequencename || ':', schemaname, sequencename)
FROM pg_sequences WHERE schemaname='ambulatorio' ORDER BY sequencename
\gexec
SQL
}

assert_refused() {
  local expected_error="$1" source="$2" mode before_state
  shift 2
  before_state="$(snapshot_state)"
  for mode in apply dry-run; do
    local mode_args=()
    if [ "$mode" = dry-run ]; then mode_args=(--dry-run); fi
    printf '%s\n' 'relatorio_sintetico_preservado' >/tmp/ambulatorio-finalidade-report.json
    if PGPASSWORD="$import_password" python3 scripts/importar_planilha.py "$source" "$@" \
      "${mode_args[@]}" --codigo-lote sint-finalidade-recusada \
      --quality-report /tmp/ambulatorio-finalidade-report.json \
      --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$import_user" \
      --db-role ambulatorio_importador --db-name "$test_db" \
      >/tmp/ambulatorio-finalidade-out.log 2>/tmp/ambulatorio-finalidade-err.log; then
      echo "Erro: finalidade inválida aceita ($expected_error, $mode)" >&2
      exit 1
    fi
    rg -q "$expected_error" /tmp/ambulatorio-finalidade-err.log
    test ! -s /tmp/ambulatorio-finalidade-out.log
    test "$(cat /tmp/ambulatorio-finalidade-report.json)" = relatorio_sintetico_preservado
    test "$before_state" = "$(snapshot_state)"
  done
}

# Sem lote prévio, nenhum hash desconhecido pode inferir carga inicial.
assert_refused finalidade_ausente "$fixture"
assert_refused finalidade_ausente "$fixture" --reprocessar
assert_refused finalidade_ausente_ou_invalida "$fixture" --finalidade desconhecida
assert_refused revisao_nao_suportada "$fixture" --finalidade revisao
assert_refused finalidade_ambigua "$fixture" --finalidade revisao --finalidade carga_inicial
assert_refused finalidade_ambigua "$fixture" --finalidade carga_inicial --finalidade revisao
assert_refused finalidade_incompativel "$fixture" --finalidade carga_inicial --reprocessar
assert_refused mesmo_conteudo_sem_lote "$fixture" --finalidade mesmo_conteudo
assert_refused mesmo_conteudo_sem_lote "$fixture" --finalidade mesmo_conteudo --reprocessar

snapshot_before="$(psql -X -At -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -c "SET search_path TO ambulatorio,public; SELECT (SELECT count(*) FROM paciente)||'|'||(SELECT count(*) FROM atendimento)||'|'||(SELECT count(*) FROM importacao_lote)||'|'||(SELECT count(*) FROM importacao_linha)||'|'||(SELECT jsonb_agg(to_jsonb(t) ORDER BY tratamento_benzonidazol_id)::text FROM tratamento_benzonidazol t);")"
PGPASSWORD="$import_password" python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-dry-run --finalidade carga_inicial \
  --dry-run --quality-report /tmp/ambulatorio-quality-1.json \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$import_user" --db-role ambulatorio_importador --db-name "$test_db" \
  2>/tmp/ambulatorio-importador.log
snapshot_after="$(psql -X -At -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -c "SET search_path TO ambulatorio,public; SELECT (SELECT count(*) FROM paciente)||'|'||(SELECT count(*) FROM atendimento)||'|'||(SELECT count(*) FROM importacao_lote)||'|'||(SELECT count(*) FROM importacao_linha)||'|'||(SELECT jsonb_agg(to_jsonb(t) ORDER BY tratamento_benzonidazol_id)::text FROM tratamento_benzonidazol t);")"
test "$snapshot_before" = "$snapshot_after"
PGPASSWORD="$import_password" python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-dry-run --finalidade carga_inicial \
  --dry-run --quality-report /tmp/ambulatorio-quality-2.json \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$import_user" --db-role ambulatorio_importador --db-name "$test_db" \
  2>>/tmp/ambulatorio-importador.log
cmp /tmp/ambulatorio-quality-1.json /tmp/ambulatorio-quality-2.json
python3 - <<'PY'
import json
r=json.load(open('/tmp/ambulatorio-quality-1.json'))
assert r['schema']=='ambulatorio.import-quality-report/v1'
assert r['mode']=='dry-run'
assert r['purpose']=='carga_inicial'
assert r['metrics']=={'between_sheet_conflicts': 1, 'identity_conflicts': 1,
 'importable_rows': 8, 'invalid_values': 1, 'other_causes': 2,
 'pending_rows': 3, 'rejected_rows': 5, 'total_rows': 13,
 'unknown_catalogs': 1, 'valid_rows': 8}
assert r['importer_version']=='1.4.0'
PY
if rg -i 'Ana Sintética|Identidade Duplicada|telefone|texto parcial preservado|pendência sintética conflitante' /tmp/ambulatorio-importador.log; then
  echo "Erro: log estruturado contém dado sensível ou valor clínico" >&2
  exit 1
fi

PGPASSWORD="$import_password" python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-e2e --finalidade carga_inicial \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$import_user" --db-role ambulatorio_importador --db-name "$test_db"

# Mesmo hash conhecido continua exigindo finalidade; revisão não contorna o no-op.
assert_refused finalidade_ausente "$fixture"
assert_refused revisao_nao_suportada "$fixture" --finalidade revisao
assert_refused revisao_nao_suportada "$fixture" --finalidade revisao --reprocessar

# Regravação sintética dos mesmos fatos altera o hash, sem mudar o layout.
python3 - <<'PY'
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile
source = Path('tests/fixtures/planilha_importacao_v1_sintetica.xlsx')
revised = Path('/tmp/ambulatorio-revisao-sintetica.xlsx')
revised.write_bytes(source.read_bytes())
with ZipFile(revised, 'a') as workbook:
    workbook.comment = b'regravacao exclusivamente sintetica'
assert hashlib.sha256(source.read_bytes()).digest() != hashlib.sha256(revised.read_bytes()).digest()
manifest = json.loads(Path('manifestos/planilha_ambulatorio_v1.json').read_text())
manifest['layout_versao'] += '-teste-finalidade'
Path('/tmp/ambulatorio-layout-sintetico.json').write_text(json.dumps(manifest))
PY
assert_refused finalidade_ausente /tmp/ambulatorio-revisao-sintetica.xlsx
assert_refused revisao_nao_suportada /tmp/ambulatorio-revisao-sintetica.xlsx --finalidade revisao
assert_refused mesmo_conteudo_sem_lote /tmp/ambulatorio-revisao-sintetica.xlsx --finalidade mesmo_conteudo
assert_refused mesmo_conteudo_sem_lote /tmp/ambulatorio-revisao-sintetica.xlsx --finalidade mesmo_conteudo --reprocessar
assert_refused mesmo_conteudo_sem_lote "$fixture" --finalidade mesmo_conteudo \
  --manifesto /tmp/ambulatorio-layout-sintetico.json
assert_refused mesmo_conteudo_sem_lote "$fixture" --finalidade mesmo_conteudo --reprocessar \
  --manifesto /tmp/ambulatorio-layout-sintetico.json

# Carga inicial declarada de bytes já concluídos permanece idempotente.
noop_before="$(snapshot_state)"
PGPASSWORD="$import_password" python3 scripts/importar_planilha.py "$fixture" \
  --codigo-lote sint-v1-carga-noop --finalidade carga_inicial \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$import_user" --db-role ambulatorio_importador --db-name "$test_db"
test "$noop_before" = "$(snapshot_state)"

before="$(psql -X -At -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -c "SET search_path TO ambulatorio,public; SELECT count(*) FROM atendimento;")"
psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" \
  -c "SET search_path TO ambulatorio,public; UPDATE importacao_lote SET status_lote='falhou',finalizado_em=NULL WHERE codigo_lote='sint-v1-e2e';"
PGPASSWORD="$import_password" python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-e2e-reexec --finalidade mesmo_conteudo \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$import_user" --db-role ambulatorio_importador --db-name "$test_db"
after="$(psql -X -At -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -c "SET search_path TO ambulatorio,public; SELECT count(*) FROM atendimento;")"
test "$before" = "$after"
PGPASSWORD="$import_password" python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-e2e-noop --finalidade mesmo_conteudo \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$import_user" --db-role ambulatorio_importador --db-name "$test_db"

# Corrige o catálogo depois do lote inicial. O reprocessamento deve resolver
# somente esse vínculo, reutilizando paciente e atendimento já confirmados.
psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -v ON_ERROR_STOP=1 \
  -c "SET search_path TO ambulatorio,public; INSERT INTO projeto_estudo (codigo_projeto,nome_projeto) VALUES ('sami_trop_1_1','SAMI-TROP 1.1');"

# Simula o lote predecessor criado antes da promoção de D11: o bruto e os demais
# alvos permanecem, mas o destino de pendencias_observacao ainda não existia.
# Uma das linhas recebe uma pendência manual não vinculada à proveniência para
# provar que o conflito bloqueia a promoção sem apagar ou duplicar o dado humano.
psql -X -q -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -v ON_ERROR_STOP=1 <<'SQL'
SET search_path TO ambulatorio, public;
DELETE FROM importacao_registro r
USING importacao_linha l, importacao_lote b
WHERE r.importacao_linha_id=l.importacao_linha_id
  AND l.importacao_lote_id=b.importacao_lote_id
  AND b.codigo_lote='sint-v1-e2e'
  AND ((l.aba_ordem=2 AND l.numero_linha=2) OR (l.aba_ordem=1 AND l.numero_linha=3))
  AND r.tabela_destino='pendencia_atendimento';
DELETE FROM pendencia_atendimento p
USING importacao_registro r, importacao_linha l, importacao_lote b
WHERE r.importacao_linha_id=l.importacao_linha_id
  AND l.importacao_lote_id=b.importacao_lote_id
  AND b.codigo_lote='sint-v1-e2e'
  AND ((l.aba_ordem=2 AND l.numero_linha=2) OR (l.aba_ordem=1 AND l.numero_linha=3))
  AND r.tabela_destino='atendimento' AND p.atendimento_id=r.registro_id;
INSERT INTO pendencia_atendimento (atendimento_id,descricao,valor_original_pendencia)
SELECT r.registro_id,'edição manual sintética','edição manual sintética'
FROM importacao_registro r
JOIN importacao_linha l USING (importacao_linha_id)
JOIN importacao_lote b USING (importacao_lote_id)
WHERE b.codigo_lote='sint-v1-e2e' AND l.aba_ordem=1 AND l.numero_linha=3
  AND r.tabela_destino='atendimento';
UPDATE importacao_lote SET manifesto_sha256=repeat('0',64)
WHERE codigo_lote='sint-v1-e2e';
UPDATE importacao_linha l SET
  status_linha='importada_com_pendencia',
  mensagem_processamento='campos preservados apenas em dados_brutos: pendencias_observacao'
FROM importacao_lote b
WHERE l.importacao_lote_id=b.importacao_lote_id
  AND b.codigo_lote='sint-v1-e2e'
  AND ((l.aba_ordem=2 AND l.numero_linha=2) OR (l.aba_ordem=1 AND l.numero_linha=3));
SQL

promotion_snapshot_before="$(psql -X -At -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -c "SET search_path TO ambulatorio,public; SELECT (SELECT count(*) FROM importacao_lote)||'|'||(SELECT count(*) FROM importacao_linha)||'|'||(SELECT count(*) FROM pendencia_atendimento)||'|'||(SELECT count(*) FROM paciente_projeto_estudo)||'|'||(SELECT count(*) FROM importacao_registro);")"
PGPASSWORD="$import_password" python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-promocao-dry-run --finalidade mesmo_conteudo \
  --reprocessar --dry-run --quality-report /tmp/ambulatorio-quality-promocao.json \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$import_user" --db-role ambulatorio_importador --db-name "$test_db" \
  2>>/tmp/ambulatorio-importador.log
promotion_snapshot_after="$(psql -X -At -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -c "SET search_path TO ambulatorio,public; SELECT (SELECT count(*) FROM importacao_lote)||'|'||(SELECT count(*) FROM importacao_linha)||'|'||(SELECT count(*) FROM pendencia_atendimento)||'|'||(SELECT count(*) FROM paciente_projeto_estudo)||'|'||(SELECT count(*) FROM importacao_registro);")"
test "$promotion_snapshot_before" = "$promotion_snapshot_after"
python3 - <<'PY'
import json
r=json.load(open('/tmp/ambulatorio-quality-promocao.json'))
assert r['metrics']['unknown_catalogs']==0
assert r['metrics']['pending_rows']==3
assert r['importer_version']=='1.4.0'
assert r['purpose']=='mesmo_conteudo'
PY
if rg -i 'Ana Sintética|Identidade Duplicada|telefone|texto parcial preservado|pendência sintética conflitante' /tmp/ambulatorio-importador.log; then
  echo "Erro: log estruturado da promoção contém dado sensível ou valor clínico" >&2
  exit 1
fi

PGPASSWORD="$import_password" python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-e2e-reprocessado --reprocessar --finalidade mesmo_conteudo \
  --db-host "$DB_HOST" --db-port "$DB_PORT" --db-user "$import_user" --db-role ambulatorio_importador --db-name "$test_db"
after_reprocess="$(psql -X -At -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$test_db" -c "SET search_path TO ambulatorio,public; SELECT count(*) FROM atendimento;")"
test "$before" = "$after_reprocess"
PGPASSWORD="$import_password" python3 scripts/importar_planilha.py "$fixture" --codigo-lote sint-v1-e2e-reprocessado-2 --reprocessar --finalidade mesmo_conteudo \
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
  v_bzn record;
  v_acoes text[];
BEGIN
  SELECT importacao_lote_id INTO v_lote FROM importacao_lote WHERE codigo_lote='sint-v1-e2e';
  SELECT importacao_lote_id INTO v_reprocessado FROM importacao_lote WHERE codigo_lote='sint-v1-e2e-reprocessado';
  SELECT importacao_lote_id INTO v_reprocessado_2 FROM importacao_lote WHERE codigo_lote='sint-v1-e2e-reprocessado-2';
  IF (SELECT count(*) FROM importacao_lote) <> 3 THEN RAISE EXCEPTION 'quantidade de lotes'; END IF;
  IF (SELECT lote_reprocessado_de_id FROM importacao_lote WHERE importacao_lote_id=v_reprocessado) <> v_lote THEN RAISE EXCEPTION 'cadeia imediata'; END IF;
  IF (SELECT lote_reprocessado_de_id FROM importacao_lote WHERE importacao_lote_id=v_reprocessado_2) <> v_reprocessado THEN RAISE EXCEPTION 'segundo elo imediato'; END IF;
  IF (SELECT status_lote FROM importacao_lote WHERE importacao_lote_id=v_lote) <> 'concluido_com_pendencias' THEN RAISE EXCEPTION 'status lote'; END IF;
  IF (SELECT count(*) FROM importacao_linha WHERE importacao_lote_id=v_lote) <> 13 THEN RAISE EXCEPTION 'linhas brutas'; END IF;
  IF (SELECT count(*) FROM importacao_linha WHERE importacao_lote_id=v_lote AND status_linha IN ('importada','importada_com_pendencia')) <> 8 THEN RAISE EXCEPTION 'linhas importadas'; END IF;
  IF (SELECT count(*) FROM importacao_linha WHERE importacao_lote_id=v_lote AND status_linha='rejeitada') <> 5 THEN RAISE EXCEPTION 'linhas rejeitadas'; END IF;
  IF (SELECT count(*) FROM importacao_linha WHERE importacao_lote_id=v_lote AND status_linha='importada_com_pendencia') <> 4 THEN RAISE EXCEPTION 'linhas pendentes após simulação do contrato anterior'; END IF;
  IF (SELECT count(*) FROM atendimento) <> 8 THEN RAISE EXCEPTION 'um atendimento por linha válida'; END IF;
  IF (SELECT count(*) FROM tratamento_benzonidazol WHERE duracao_cumprida_dias=56) <> 1 THEN RAISE EXCEPTION 'BZN'; END IF;
  IF EXISTS (SELECT 1 FROM paciente WHERE nome='Falha Atômica') THEN RAISE EXCEPTION 'rollback da linha'; END IF;
  IF (SELECT count(*) FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id) WHERE l.importacao_lote_id=v_lote AND tabela_destino='atendimento') <> 8 THEN RAISE EXCEPTION 'proveniência'; END IF;
  IF (SELECT count(*) FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id) WHERE l.importacao_lote_id=v_lote) < 100 THEN RAISE EXCEPTION 'cobertura de proveniência insuficiente'; END IF;
  IF (SELECT count(*) FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id) WHERE l.importacao_lote_id=v_reprocessado) <> 2 + (SELECT count(*) FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id) WHERE l.importacao_lote_id=v_lote AND l.status_linha IN ('importada','importada_com_pendencia')) THEN RAISE EXCEPTION 'proveniência promovida ou pendência resolvida'; END IF;
  IF (SELECT count(*) FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id) WHERE l.importacao_lote_id=v_reprocessado_2) <> (SELECT count(*) FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id) WHERE l.importacao_lote_id=v_reprocessado) THEN RAISE EXCEPTION 'proveniência do segundo elo'; END IF;
  IF (SELECT count(DISTINCT tabela_destino) FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id) WHERE l.importacao_lote_id=v_lote) <> 22 THEN RAISE EXCEPTION 'handlers/tabelas estruturadas'; END IF;
  IF NOT EXISTS (SELECT 1 FROM importacao_linha WHERE importacao_lote_id=v_lote AND dados_brutos @> '[{"chave":"localizado","valor":"sim"}]') THEN RAISE EXCEPTION 'Localizado bruto'; END IF;
  IF NOT EXISTS (SELECT 1 FROM importacao_linha WHERE importacao_lote_id=v_lote AND status_linha='rejeitada' AND mensagem_processamento LIKE 'conflito entre abas:%') THEN RAISE EXCEPTION 'precedência entre abas'; END IF;
  IF NOT EXISTS (SELECT 1 FROM importacao_linha WHERE importacao_lote_id=v_lote AND status_linha='importada_com_pendencia' AND dados_brutos @> '[{"chave":"pendencias_observacao","valor":"texto parcial preservado"}]') THEN RAISE EXCEPTION 'parcial bruto'; END IF;
  IF (SELECT count(DISTINCT item->>'chave') FROM importacao_linha l CROSS JOIN LATERAL jsonb_array_elements(l.dados_brutos) item WHERE l.importacao_lote_id=v_lote AND l.aba_ordem=2 AND l.numero_linha=2 AND item->>'valor' IS NOT NULL AND item->>'chave' IN ('idade','autorelato_diagnostico_de_chagas_do_participante_data','familiares_diretos_mae_pai_irmaos_realizaram_o_exame_de_chagas','paciente_trouxe_outros_exames_complementares','solicitado_exames_complementares','retorno_30_dias_de_tratamento','retorno_final_de_tratamento','retorno_anual_realizado','desfecho_do_retorno','paciente_com_contrarreferencia_realizada')) <> 10 THEN RAISE EXCEPTION 'dez parciais no bruto'; END IF;
  IF (SELECT count(*) FROM historico_familiar_chagas) <> 0 THEN RAISE EXCEPTION 'histórico familiar inventado a partir de exame de parentes'; END IF;
  IF (SELECT count(*) FROM dados_clinicos_atendimento WHERE altura_cm=170 AND nyha='II') <> 1 THEN RAISE EXCEPTION 'dados clínicos'; END IF;
  IF (SELECT count(*) FROM sorologia_chagas) <> 3 THEN RAISE EXCEPTION 'sorologias'; END IF;
  IF (SELECT count(*) FROM atendimento_medicamento) <> 13 THEN RAISE EXCEPTION 'medicamentos'; END IF;
  IF (SELECT count(*) FROM paciente_comorbidade) <> 13 THEN RAISE EXCEPTION 'comorbidades'; END IF;
  IF (SELECT count(*) FROM dispositivo_implantado) <> 2 THEN RAISE EXCEPTION 'dispositivos'; END IF;
  IF (SELECT count(*) FROM notificacao) <> 1 OR (SELECT count(*) FROM obito) <> 1 THEN RAISE EXCEPTION 'notificação/óbito'; END IF;

  IF (SELECT count(*) FROM tratamento_benzonidazol) <> 2 THEN RAISE EXCEPTION 'BZN deve permanecer único por paciente'; END IF;
  IF EXISTS (SELECT 1 FROM importacao_lote WHERE importador_versao IS DISTINCT FROM '1.4.0') THEN RAISE EXCEPTION 'versão do importador não rastreada'; END IF;
  IF (SELECT count(*) FROM pendencia_atendimento) <> 2 THEN RAISE EXCEPTION 'promoção D11 duplicou ou apagou pendência manual'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pendencia_atendimento p
    JOIN importacao_registro a ON a.tabela_destino='atendimento' AND a.registro_id=p.atendimento_id
    JOIN importacao_linha l USING(importacao_linha_id)
    WHERE l.importacao_lote_id=v_lote AND l.aba_ordem=2 AND l.numero_linha=2
      AND p.descricao='texto parcial preservado'
      AND p.valor_original_pendencia='texto parcial preservado'
      AND p.tipo_pendencia IS NULL AND p.status_pendencia IS NULL
  ) THEN RAISE EXCEPTION 'promoção D11 perdeu âncora ou inferiu campos'; END IF;
  IF (SELECT array_agg(r.acao ORDER BY l.importacao_lote_id)
      FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id)
      WHERE l.importacao_lote_id IN (v_reprocessado,v_reprocessado_2)
        AND r.tabela_destino='pendencia_atendimento')
     IS DISTINCT FROM ARRAY['criado','associado']::varchar[]
  THEN RAISE EXCEPTION 'proveniência da promoção D11'; END IF;
  IF (SELECT count(*) FROM importacao_linha
      WHERE importacao_lote_id IN (v_reprocessado,v_reprocessado_2)
        AND aba_ordem=2 AND numero_linha=2
        AND status_linha='importada_com_pendencia'
        AND mensagem_processamento LIKE '%promovidas=pendencias_observacao%') <> 2
  THEN RAISE EXCEPTION 'estado ou mensagem segura da promoção D11'; END IF;
  IF (SELECT count(*) FROM pendencia_atendimento p
      JOIN importacao_registro a ON a.tabela_destino='atendimento' AND a.registro_id=p.atendimento_id
      JOIN importacao_linha l USING(importacao_linha_id)
      WHERE l.importacao_lote_id=v_lote AND l.aba_ordem=1 AND l.numero_linha=3
        AND p.descricao='edição manual sintética'
        AND p.valor_original_pendencia='edição manual sintética') <> 1
  THEN RAISE EXCEPTION 'conflito da promoção alterou a pendência manual'; END IF;
  IF EXISTS (
    SELECT 1 FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id)
    WHERE l.importacao_lote_id IN (v_reprocessado,v_reprocessado_2)
      AND l.aba_ordem=1 AND l.numero_linha=3 AND r.tabela_destino='pendencia_atendimento'
  ) THEN RAISE EXCEPTION 'conflito da promoção deixou proveniência parcial'; END IF;
  IF (SELECT count(*) FROM importacao_linha
      WHERE importacao_lote_id IN (v_reprocessado,v_reprocessado_2)
        AND aba_ordem=1 AND numero_linha=3
        AND status_linha='importada_com_pendencia'
        AND mensagem_processamento LIKE '%conflitos=pendencias_observacao%') <> 2
  THEN RAISE EXCEPTION 'conflito da promoção não foi preservado com mensagem segura'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM importacao_linha
    WHERE importacao_lote_id=v_lote AND aba_ordem=1 AND numero_linha=6
      AND status_linha='importada_com_pendencia'
      AND mensagem_processamento='nao_criticas=catalogo_projeto_ausente:sami_trop_1_1'
  ) THEN RAISE EXCEPTION 'catálogo ausente não gerou pendência não crítica segura'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM importacao_linha
    WHERE importacao_lote_id=v_reprocessado AND aba_ordem=1 AND numero_linha=6
      AND status_linha='importada'
      AND mensagem_processamento LIKE '%resolvidas=catalogo_projeto_ausente:sami_trop_1_1%'
  ) THEN RAISE EXCEPTION 'reprocessamento não resolveu catálogo corrigido'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM importacao_linha
    WHERE importacao_lote_id=v_reprocessado_2 AND aba_ordem=1 AND numero_linha=6
      AND status_linha='importada'
      AND mensagem_processamento NOT LIKE '%nao_criticas=%'
  ) THEN RAISE EXCEPTION 'segundo elo não reutilizou resolução não crítica'; END IF;
  IF (SELECT count(*) FROM paciente_projeto_estudo pp
      JOIN paciente p USING (paciente_id)
      JOIN projeto_estudo pe USING (projeto_estudo_id)
      WHERE p.codigo_planilha='P-CAT' AND pe.codigo_projeto='sami_trop_1_1'
        AND pp.participa IS TRUE AND pp.valor_original_participacao='sim') <> 1
  THEN RAISE EXCEPTION 'vínculo de projeto pendente ausente ou duplicado'; END IF;
  SELECT array_agg(r.acao ORDER BY l.importacao_lote_id) INTO v_acoes
    FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id)
    JOIN paciente_projeto_estudo pp ON r.tabela_destino='paciente_projeto_estudo'
      AND r.registro_id=pp.paciente_projeto_estudo_id
    JOIN paciente p USING (paciente_id)
    JOIN projeto_estudo pe USING (projeto_estudo_id)
    WHERE p.codigo_planilha='P-CAT' AND pe.codigo_projeto='sami_trop_1_1';
  IF v_acoes IS DISTINCT FROM ARRAY['criado','associado']::text[]
  THEN RAISE EXCEPTION 'proveniência da resolução não crítica'; END IF;
  SELECT t.* INTO STRICT v_bzn FROM tratamento_benzonidazol t JOIN paciente p USING(paciente_id) WHERE p.codigo_planilha='P-ANA';
  IF v_bzn.atendimento_id IS DISTINCT FROM (
    SELECT r.registro_id FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id)
    WHERE l.importacao_lote_id=v_lote AND l.aba_ordem=1 AND l.numero_linha=2 AND r.tabela_destino='atendimento'
  ) THEN RAISE EXCEPTION 'BZN perdeu o vínculo original de atendimento'; END IF;
  IF v_bzn.duracao_cumprida_dias IS DISTINCT FROM 56 OR v_bzn.valor_original_duracao IS DISTINCT FROM '8 semanas'
     OR v_bzn.valor_original_inicio IS DISTINCT FROM 'sim' OR v_bzn.valor_original_reacao_adversa IS DISTINCT FROM 'não'
     OR v_bzn.criado_em IS DISTINCT FROM v_bzn.atualizado_em THEN RAISE EXCEPTION 'BZN equivalente alterou valor original ou timestamp'; END IF;
  SELECT array_agg(r.acao ORDER BY l.numero_linha) INTO v_acoes
    FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id)
    WHERE l.importacao_lote_id=v_lote AND r.tabela_destino='tratamento_benzonidazol' AND r.registro_id=v_bzn.tratamento_benzonidazol_id;
  IF v_acoes IS DISTINCT FROM ARRAY['criado','associado']::text[] THEN RAISE EXCEPTION 'proveniência BZN criado/associado'; END IF;

  SELECT t.* INTO STRICT v_bzn FROM tratamento_benzonidazol t JOIN paciente p USING(paciente_id) WHERE p.codigo_planilha='P-NOVO';
  IF v_bzn.atendimento_id IS NOT NULL THEN RAISE EXCEPTION 'BZN pré-existente ganhou vínculo inferido'; END IF;
  IF v_bzn.iniciado IS DISTINCT FROM TRUE OR v_bzn.duracao_cumprida_dias IS DISTINCT FROM 7
     OR v_bzn.ano_uso_aproximado IS DISTINCT FROM 2025 OR v_bzn.valor_original_duracao IS DISTINCT FROM '7 dias'
     OR v_bzn.valor_original_ano_uso IS DISTINCT FROM '2025'
     OR v_bzn.teve_reacao_adversa IS DISTINCT FROM FALSE THEN RAISE EXCEPTION 'BZN não preencheu NULL ou perdeu valor consolidado'; END IF;
  IF v_bzn.tratamento_pelo_ambulatorio IS NOT NULL OR v_bzn.valor_original_tratamento_ambulatorio IS NOT NULL
     OR EXISTS (SELECT 1 FROM paciente_endereco WHERE paciente_id=v_bzn.paciente_id)
     OR EXISTS (SELECT 1 FROM atendimento WHERE paciente_id=v_bzn.paciente_id AND data_atendimento='2026-08-11')
     THEN RAISE EXCEPTION 'BZN conflitante persistiu escrita parcial'; END IF;
  SELECT array_agg(r.acao ORDER BY l.numero_linha) INTO v_acoes
    FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id)
    WHERE l.importacao_lote_id=v_lote AND r.tabela_destino='tratamento_benzonidazol' AND r.registro_id=v_bzn.tratamento_benzonidazol_id;
  IF v_acoes IS DISTINCT FROM ARRAY['associado','atualizado','associado']::text[] THEN RAISE EXCEPTION 'proveniência BZN preenchido e reutilizado'; END IF;
  IF (SELECT count(*) FROM importacao_linha WHERE aba_ordem=1 AND numero_linha=11 AND status_linha='rejeitada'
      AND mensagem_processamento='tratamento_benzonidazol.ano_uso_aproximado: divergência consolidada') <> 3
     THEN RAISE EXCEPTION 'conflito BZN não rejeitado em cada execução'; END IF;
  IF EXISTS (SELECT 1 FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id)
             WHERE l.aba_ordem=1 AND l.numero_linha=11) THEN RAISE EXCEPTION 'linha BZN rejeitada deixou proveniência'; END IF;
  IF (SELECT count(*) FROM importacao_registro r JOIN importacao_linha l USING(importacao_linha_id)
      WHERE l.importacao_lote_id IN (v_reprocessado,v_reprocessado_2) AND r.tabela_destino='tratamento_benzonidazol'
        AND r.acao='associado') <> 10 THEN RAISE EXCEPTION 'reprocessamento não reutilizou os BZN'; END IF;
  RAISE NOTICE 'OK: BZN compatível, preenchimento de NULL, vínculo preservado, conflito atômico e reprocessamento';
END $$;
SQL

echo "OK: finalidade explícita, recusas sem efeitos, 125 destinos, criticidade, promoção, proveniência, rollback e reprocessamento encadeado"

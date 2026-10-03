#!/usr/bin/env python3
"""D2: promoção sintética só preenche NULL com captura comprovada da linha-base."""

import hashlib
import json
import os
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from importar_planilha import IMPORTER_VERSION, raw_payload  # noqa: E402
from importador.psql import Database, literal  # noqa: E402
from gerar_planilha_sintetica import row, sheet_xml  # noqa: E402

MANIFEST = json.loads((ROOT / "manifestos/planilha_ambulatorio_v1.json").read_text())
ORIGINAL = ROOT / "tests/fixtures/planilha_importacao_v1_sintetica.xlsx"
SOURCE = "autorelato_diagnostico_de_chagas_do_participante_data"


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(value):
    return hashlib.sha256(value.encode()).hexdigest()


def rows_legacy():
    columns = MANIFEST["sheets"][1]["columns"]
    return [
        row(columns, id="D2-LEGACY-NULL", nome="D2 legado nulo sintético",
            data_de_nascimento="01/01/1980", data_do_atendimento="01/02/2026",
            diagnostico_da_dc_por_sorologia="sim", **{SOURCE: "03/03/2003"}),
        row(columns, id="D2-LEGACY-EQUAL", nome="D2 legado igual sintético",
            data_de_nascimento="02/02/1980", data_do_atendimento="02/02/2026",
            diagnostico_da_dc_por_sorologia="sim", **{SOURCE: "04/04/2004"}),
        row(columns, id="D2-LEGACY-DIVERGENT", nome="D2 legado divergente sintético",
            data_de_nascimento="03/03/1980", data_do_atendimento="03/02/2026",
            diagnostico_da_dc_por_sorologia="sim", **{SOURCE: "05/05/2005"}),
    ]


def rows_captured():
    columns = MANIFEST["sheets"][1]["columns"]
    return [
        row(columns, id="D2-CAPTURED-NULL", nome="D2 captura nulo sintético",
            data_de_nascimento="04/04/1980", data_do_atendimento="04/02/2026",
            diagnostico_da_dc_por_sorologia="sim", **{SOURCE: "07/07/2007"}),
        row(columns, id="D2-MANUAL-DIVERGENT", nome="D2 divergência manual sintética",
            data_de_nascimento="05/05/1980", data_do_atendimento="05/02/2026",
            diagnostico_da_dc_por_sorologia="sim", **{SOURCE: "08/08/2008"}),
        row(columns, id="D2-A-BA", nome="D2 ciclo manual sintético",
            data_de_nascimento="06/06/1980", data_do_atendimento="06/02/2026",
            diagnostico_da_dc_por_sorologia="sim", **{SOURCE: "09/09/2009"}),
    ]


def workbook(path, values):
    first, second = MANIFEST["sheets"]
    xml = {
        "xl/worksheets/sheet1.xml": sheet_xml([[c["cabecalho_original"] for c in first["columns"]]]).encode(),
        "xl/worksheets/sheet2.xml": sheet_xml(
            [[c["cabecalho_original"] for c in second["columns"]], *values]).encode(),
    }
    with ZipFile(ORIGINAL) as source, ZipFile(path, "w") as target:
        for entry in source.infolist():
            target.writestr(entry, xml.get(entry.filename, source.read(entry.filename)))


def db_args():
    port = os.environ["DB_PORT"]
    assert port.isdecimal() and 1 <= int(port) <= 65535, "D2 exige porta PostgreSQL válida configurada"
    database = os.environ["D2_DB_NAME"]
    assert database.endswith("_importador_test"), "D2 aceita apenas banco descartável do importador"
    return (os.environ["DB_HOST"], port, os.environ["DB_USER"],
            database, os.getenv("PGPASSWORD"))


def importer(path, code, *, reprocess=False):
    command = [sys.executable, str(ROOT / "scripts/importar_planilha.py"), str(path),
               "--codigo-lote", code, "--finalidade",
               "mesmo_conteudo" if reprocess else "carga_inicial",
               "--db-host", os.environ["DB_HOST"], "--db-port", os.environ["DB_PORT"],
               "--db-user", os.environ["D2_IMPORT_USER"], "--db-role", "ambulatorio_importador",
               "--db-name", os.environ["D2_DB_NAME"]]
    if reprocess:
        command.append("--reprocessar")
    result = subprocess.run(command, cwd=ROOT,
        env={**os.environ, "PGPASSWORD": os.environ["D2_IMPORT_PASSWORD"]},
        capture_output=True, text=True)
    assert result.returncode == 0, result.stderr


def seed_base(path, prefix, values, discovery_values):
    host, port, user, database, password = db_args()
    suffix = uuid.uuid4().hex[:12]
    code = f"{prefix}-{suffix}"
    layout = MANIFEST["layout_versao"]
    manifest_text = canonical(MANIFEST)
    manifest_hash = sha(manifest_text)
    file_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    columns = MANIFEST["sheets"][1]["columns"]
    sheet_name = MANIFEST["sheets"][1]["aba_nome_original"]
    with Database(host, port, user, database, password) as db:
        actor = int(db.scalar("INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES("
            f"'D2 promoção sintética','d2-{suffix}@example.invalid',"
            "'$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao') "
            "RETURNING usuario_id"))
        db.run("INSERT INTO revisao_artefato(sha256,tipo,versao,conteudo) VALUES("
            f"{literal(manifest_hash)},'manifesto','{MANIFEST['versao']}',{literal(manifest_text)}) "
            "ON CONFLICT (sha256) DO NOTHING")
        db.run("BEGIN")
        lot = int(db.scalar("INSERT INTO importacao_lote(codigo_lote,hash_arquivo_sha256,layout_versao,"
            "status_lote,manifesto_sha256,importador_versao,revisao_git) VALUES("
            f"{literal(code)},{literal(file_hash)},{literal(layout)},'processando',"
            f"{literal(manifest_hash)},{literal(IMPORTER_VERSION)},'abcdef0') RETURNING importacao_lote_id"))
        for index, values_row in enumerate(values, start=2):
            payload = json.dumps(raw_payload(columns, values_row), ensure_ascii=False)
            line = int(db.scalar("INSERT INTO importacao_linha(importacao_lote_id,aba_nome_original,aba_ordem,"
                "numero_linha,dados_brutos,status_linha) VALUES("
                f"{lot},{literal(sheet_name)},2,{index},{literal(payload)}::jsonb,'processando') "
                "RETURNING importacao_linha_id"))
            db.run("SET LOCAL ROLE ambulatorio_importador")
            db.run(f"SELECT auditoria_iniciar_importacao({line})")
            patient = int(db.scalar("INSERT INTO paciente(nome,data_nascimento,grupo_origem_planilha) VALUES("
                f"{literal(values_row[columns.index(next(c for c in columns if c['chave_semantica']=='nome'))])},"
                f"{literal(values_row[columns.index(next(c for c in columns if c['chave_semantica']=='data_de_nascimento'))])}::date,"
                "'nao_portador_dc') RETURNING paciente_id"))
            attendance = int(db.scalar("INSERT INTO atendimento(paciente_id,data_atendimento,origem_registro) VALUES("
                f"{patient},{literal(values_row[columns.index(next(c for c in columns if c['chave_semantica']=='data_do_atendimento'))])}::date,"
                "'planilha_nao_portador_dc') RETURNING atendimento_id"))
            discovery = discovery_values[index - 2]
            diagnosis = int(db.scalar("INSERT INTO diagnostico_chagas(atendimento_id,possui_diagnostico_chagas,"
                "data_descoberta_autorelato) VALUES("
                f"{attendance},true,{literal(discovery)}::date) RETURNING diagnostico_chagas_id"))
            db.run("INSERT INTO importacao_registro(importacao_linha_id,tabela_destino,registro_id,acao) VALUES("
                f"{line},'paciente',{patient},'criado'),({line},'atendimento',{attendance},'criado'),"
                f"({line},'diagnostico_chagas',{diagnosis},'criado')")
            db.run("UPDATE importacao_linha SET status_linha='importada_com_pendencia',"
                f"mensagem_processamento={literal('legado sintético: D2 pendente')} WHERE importacao_linha_id={line}")
            db.run("RESET ROLE")
        db.run("UPDATE importacao_lote SET status_lote='concluido_com_pendencias',finalizado_em=CURRENT_TIMESTAMP "
               f"WHERE importacao_lote_id={lot}")
        db.run("COMMIT")
    return code


def rows_for_lot(db, code):
    lot = db.scalar(f"SELECT importacao_lote_id FROM importacao_lote WHERE codigo_lote={literal(code)}")
    rows = db.run("SELECT i.numero_linha || '|' || i.importacao_linha_id || '|' || "
        "r.registro_id FROM importacao_linha i JOIN importacao_registro r USING(importacao_linha_id) "
        "WHERE i.importacao_lote_id=" + str(int(lot)) + " AND r.tabela_destino='diagnostico_chagas' "
        "ORDER BY i.numero_linha")
    return {int(item.split("|")[0]): (int(item.split("|")[1]), int(item.split("|")[2])) for item in rows}


def seed_legacy(path):
    host, port, user, database, password = db_args()
    with Database(host, port, user, database, password) as db:
        assert db.scalar("SELECT count(*) FROM auditoria_campo WHERE "
            "tabela_destino='diagnostico_chagas' AND coluna_destino='data_descoberta_autorelato' "
            "AND captura_desde IS NOT NULL") == "0", "seed-legacy precisa ocorrer antes da migration61"
    values = rows_legacy()
    return seed_base(path, "d2-legacy", values, [None, "2004-04-04", "2006-06-06"])


def verify_legacy(path):
    host, port, user, database, password = db_args()
    file_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    with Database(host, port, user, database, password) as db:
        assert db.scalar("SELECT count(*) FROM auditoria_campo WHERE "
            "tabela_destino='diagnostico_chagas' AND coluna_destino='data_descoberta_autorelato' "
            "AND captura_desde IS NOT NULL") == "1", "verify exige migration61 aplicada"
        base = db.scalar("SELECT codigo_lote FROM importacao_lote "
            f"WHERE hash_arquivo_sha256={literal(file_hash)} AND layout_versao={literal(MANIFEST['layout_versao'])} "
            "AND codigo_lote LIKE 'd2-legacy-%' ORDER BY importacao_lote_id DESC LIMIT 1")
        assert base, "fixture D2 anterior à migration61 ausente"
        suffix = base.removeprefix("d2-legacy-")
        baseline = rows_for_lot(db, base)
        diagnoses = {line: diagnosis for line, (_, diagnosis) in baseline.items()}
        before = {line: db.scalar(f"SELECT COALESCE(data_descoberta_autorelato::text,'__NULL__') "
                                  f"FROM diagnostico_chagas WHERE diagnostico_chagas_id={diagnosis}")
                  for line, diagnosis in diagnoses.items()}
        assert before == {2: "__NULL__", 3: "2004-04-04", 4: "2006-06-06"}
        for diagnosis in diagnoses.values():
            assert db.scalar("SELECT count(*) FROM auditoria_campo_evento e JOIN auditoria_campo c USING(campo_id) "
                f"WHERE c.tabela_destino='diagnostico_chagas' AND c.coluna_destino='data_descoberta_autorelato' "
                f"AND e.registro_id={diagnosis}") == "0"

    result_code = f"d2-legacy-result-{suffix}"
    importer(path, result_code, reprocess=True)
    with Database(host, port, user, database, password) as db:
        result = rows_for_lot(db, result_code)
        assert {line: db.scalar(f"SELECT COALESCE(data_descoberta_autorelato::text,'__NULL__') "
                                f"FROM diagnostico_chagas WHERE diagnostico_chagas_id={diagnosis}")
                for line, (_, diagnosis) in result.items()} == before
        assert db.scalar("SELECT status_linha FROM importacao_linha WHERE importacao_linha_id="
                         f"{result[2][0]}") == "importada_com_pendencia"
        assert "conflitos=autorelato_diagnostico_de_chagas_do_participante_data" in db.scalar(
            "SELECT mensagem_processamento FROM importacao_linha WHERE importacao_linha_id="
            f"{result[2][0]}")
        assert db.scalar("SELECT count(*) FROM importacao_registro WHERE importacao_linha_id="
                         f"{result[3][0]} AND tabela_destino='diagnostico_chagas' AND registro_id={diagnoses[3]}") == "1"
        assert db.scalar("SELECT acao FROM importacao_registro WHERE importacao_linha_id="
                         f"{result[3][0]} AND tabela_destino='diagnostico_chagas' AND registro_id={diagnoses[3]}") == "associado"
        assert "conflitos=autorelato_diagnostico_de_chagas_do_participante_data" in db.scalar(
            "SELECT mensagem_processamento FROM importacao_linha WHERE importacao_linha_id="
            f"{result[4][0]}")


def seed_capture_base(path):
    values = rows_captured()
    code = seed_base(path, "d2-captured", values, [None, None, None])
    host, port, user, database, password = db_args()
    with Database(host, port, user, database, password) as db:
        # Divergência e A→B→A usam a identidade real do escritor de aplicação.
        actor = int(db.scalar("SELECT usuario_id FROM usuario_aplicacao "
            f"WHERE login LIKE 'd2-%@example.invalid' ORDER BY usuario_id DESC LIMIT 1"))
        fixtures = rows_for_lot(db, code)
        diagnoses = {line: diagnosis for line, (_, diagnosis) in fixtures.items()}
        db.run("BEGIN")
        db.run("SET LOCAL ROLE ambulatorio_servico_autenticado")
        db.run(f"SELECT auditoria_iniciar_aplicacao({actor})")
        db.run("SET LOCAL ROLE ambulatorio_aplicacao")
        db.run("UPDATE diagnostico_chagas SET data_descoberta_autorelato='2010-10-10' "
               f"WHERE diagnostico_chagas_id={diagnoses[3]}")
        db.run("UPDATE diagnostico_chagas SET data_descoberta_autorelato='2011-11-11' "
               f"WHERE diagnostico_chagas_id={diagnoses[4]}")
        db.run("UPDATE diagnostico_chagas SET data_descoberta_autorelato=NULL "
               f"WHERE diagnostico_chagas_id={diagnoses[4]}")
        db.run("COMMIT")
    return code


def verify_capture(path):
    host, port, user, database, password = db_args()
    field = None
    with Database(host, port, user, database, password) as db:
        field = db.scalar("SELECT campo_id FROM auditoria_campo "
            "WHERE tabela_destino='diagnostico_chagas' AND coluna_destino='data_descoberta_autorelato' "
            "AND captura_desde IS NOT NULL AND tipo_sql='date' AND serializacao_versao='v1'")
        assert field, "SQL61 precisa estar aplicada antes do fluxo positivo D2"
        file_hash = hashlib.sha256(path.read_bytes()).hexdigest()
        base = db.scalar("SELECT codigo_lote FROM importacao_lote "
            f"WHERE hash_arquivo_sha256={literal(file_hash)} AND layout_versao={literal(MANIFEST['layout_versao'])} "
            "AND codigo_lote LIKE 'd2-captured-%' ORDER BY importacao_lote_id DESC LIMIT 1")
        assert base, "fixture D2 com captura da linha-base ausente"
        suffix = base.removeprefix("d2-captured-")
        baseline = rows_for_lot(db, base)
        diagnoses = {line: diagnosis for line, (_, diagnosis) in baseline.items()}
        for line, diagnosis in diagnoses.items():
            assert db.scalar("SELECT count(*) FROM auditoria_campo_evento "
                f"WHERE campo_id={int(field)} AND registro_id={diagnosis} AND versao_campo=1 "
                f"AND origem='importacao' AND importacao_linha_id={baseline[line][0]} "
                "AND antes->>'estado'='alvo_ausente' AND depois->>'estado'='nulo'") == "1"

    result_code = f"d2-captured-result-{suffix}"
    importer(path, result_code, reprocess=True)
    with Database(host, port, user, database, password) as db:
        result = rows_for_lot(db, result_code)
        assert db.scalar("SELECT data_descoberta_autorelato::text FROM diagnostico_chagas "
                         f"WHERE diagnostico_chagas_id={diagnoses[2]}") == "2007-07-07"
        assert db.scalar("SELECT count(*) FROM auditoria_campo_evento "
            f"WHERE campo_id={int(field)} AND registro_id={diagnoses[2]}") == "2"
        assert db.scalar("SELECT count(*) FROM auditoria_campo_evento "
            f"WHERE campo_id={int(field)} AND registro_id={diagnoses[2]} AND versao_campo=2 "
            f"AND origem='importacao' AND importacao_linha_id={result[2][0]} "
            "AND depois->>'valor'='2007-07-07'") == "1"
        assert db.scalar("SELECT acao FROM importacao_registro WHERE importacao_linha_id="
                         f"{result[2][0]} AND tabela_destino='diagnostico_chagas' AND registro_id={diagnoses[2]}") == "associado"
        for line in (3, 4):
            assert db.scalar("SELECT status_linha FROM importacao_linha WHERE importacao_linha_id="
                             f"{result[line][0]}") == "importada_com_pendencia"
            assert "conflitos=autorelato_diagnostico_de_chagas_do_participante_data" in db.scalar(
                "SELECT mensagem_processamento FROM importacao_linha WHERE importacao_linha_id="
                f"{result[line][0]}")
        assert db.scalar("SELECT data_descoberta_autorelato::text FROM diagnostico_chagas "
                         f"WHERE diagnostico_chagas_id={diagnoses[3]}") == "2010-10-10"
        assert db.scalar("SELECT data_descoberta_autorelato IS NULL FROM diagnostico_chagas "
                         f"WHERE diagnostico_chagas_id={diagnoses[4]}") == "t"
        assert db.scalar("SELECT count(*) FROM auditoria_campo_evento "
                         f"WHERE campo_id={int(field)} AND registro_id={diagnoses[4]}") == "3"

        # Uma origem já aplicada não repõe o valor depois de edição manual posterior.
        actor = int(db.scalar("SELECT usuario_id FROM usuario_aplicacao "
            f"WHERE login LIKE 'd2-%@example.invalid' ORDER BY usuario_id DESC LIMIT 1"))
        db.run("BEGIN")
        db.run("SET LOCAL ROLE ambulatorio_servico_autenticado")
        db.run(f"SELECT auditoria_iniciar_aplicacao({actor})")
        db.run("SET LOCAL ROLE ambulatorio_aplicacao")
        db.run("UPDATE diagnostico_chagas SET data_descoberta_autorelato='2008-08-08' "
               f"WHERE diagnostico_chagas_id={diagnoses[2]}")
        db.run("COMMIT")
    second_result = f"d2-captured-result2-{suffix}"
    importer(path, second_result, reprocess=True)
    with Database(host, port, user, database, password) as db:
        assert db.scalar("SELECT data_descoberta_autorelato::text FROM diagnostico_chagas "
                         f"WHERE diagnostico_chagas_id={diagnoses[2]}") == "2008-08-08"
        assert db.scalar("SELECT count(*) FROM diagnostico_chagas WHERE atendimento_id="
                         f"(SELECT atendimento_id FROM diagnostico_chagas WHERE diagnostico_chagas_id={diagnoses[2]})") == "1"
        assert db.scalar("SELECT count(*) FROM auditoria_campo_evento "
                         f"WHERE campo_id={int(field)} AND registro_id={diagnoses[2]}") == "3"


def main():
    assert len(sys.argv) == 2 and sys.argv[1] in {"seed-legacy", "verify"}, \
        "uso: test_descoberta_chagas.py seed-legacy|verify"
    mode = sys.argv[1]
    with tempfile.TemporaryDirectory(prefix="ambulatorio-d2-") as directory:
        legacy_path = Path(directory) / "d2-legacy.xlsx"
        workbook(legacy_path, rows_legacy())
        if mode == "seed-legacy":
            seed_legacy(legacy_path)
            print("OK: base sintética D2 anterior à captura sem backfill")
            return
        verify_legacy(legacy_path)
        captured_path = Path(directory) / "d2-captured.xlsx"
        workbook(captured_path, rows_captured())
        seed_capture_base(captured_path)
        verify_capture(captured_path)
    print("OK: D2 promove somente NULL capturado, associa igualdade sem UPDATE e preserva legado/divergências/A-B-A")


if __name__ == "__main__":
    main()

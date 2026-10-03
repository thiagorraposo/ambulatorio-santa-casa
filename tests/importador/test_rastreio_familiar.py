#!/usr/bin/env python3
"""D3: negativa explícita, legado sem detalhes e promoção no PostgreSQL real."""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from importador.psql import Database, literal  # noqa: E402
from gerar_planilha_sintetica import row, sheet_xml  # noqa: E402

MANIFEST = json.loads((ROOT / "manifestos/planilha_ambulatorio_v1.json").read_text())
ORIGINAL = ROOT / "tests/fixtures/planilha_importacao_v1_sintetica.xlsx"
SOURCE = "familiares_diretos_mae_pai_irmaos_realizaram_o_exame_de_chagas"


def workbook(path):
    first, second = MANIFEST["sheets"]
    rows = [[c["cabecalho_original"] for c in second["columns"]]]
    for code, name, birth, attendance, answer in (
            ("D3-NEG-SINT", "Negativa D3 Sintética", "01/01/1990", "03/01/2026", "não"),
            ("D3-POS-SINT", "Positiva D3 Sintética", "02/01/1990", "04/01/2026", "sim"),
            ("D3-TEX-SINT", "Texto D3 Sintético", "03/01/1990", "05/01/2026", "mãe positivo")):
        rows.append(row(second["columns"], id=code, nome=name,
                        data_de_nascimento=birth, data_do_atendimento=attendance,
                        **{SOURCE: answer}))
    replacement = {
        "xl/worksheets/sheet1.xml": sheet_xml([[c["cabecalho_original"] for c in first["columns"]]]).encode(),
        "xl/worksheets/sheet2.xml": sheet_xml(rows).encode(),
    }
    with ZipFile(ORIGINAL) as source, ZipFile(path, "w") as target:
        for entry in source.infolist():
            target.writestr(entry, replacement.get(entry.filename, source.read(entry.filename)))


def importer(path, code, *, reprocess=False):
    command = [sys.executable, str(ROOT / "scripts/importar_planilha.py"), str(path),
               "--codigo-lote", code, "--finalidade",
               "mesmo_conteudo" if reprocess else "carga_inicial",
               "--db-host", os.environ["DB_HOST"], "--db-port", os.environ["DB_PORT"],
               "--db-user", os.environ["D3_IMPORT_USER"], "--db-role", "ambulatorio_importador",
               "--db-name", os.environ["D3_DB_NAME"]]
    if reprocess:
        command.append("--reprocessar")
    return subprocess.run(command, cwd=ROOT,
                          env={**os.environ, "PGPASSWORD": os.environ["D3_IMPORT_PASSWORD"]},
                          capture_output=True, text=True)


def assert_ok(result):
    assert result.returncode == 0, result.stderr


def main():
    assert os.environ["DB_PORT"] == "55457", "D3 exige a porta do banco descartável"
    assert os.environ["D3_DB_NAME"].endswith("_importador_test")
    db_args = (os.environ["DB_HOST"], os.environ["DB_PORT"],
               os.environ["DB_USER"], os.environ["D3_DB_NAME"], os.getenv("PGPASSWORD"))
    with tempfile.TemporaryDirectory(prefix="ambulatorio-d3-") as directory:
        path = Path(directory) / "rastreio.xlsx"
        workbook(path)
        assert_ok(importer(path, "d3-base"))
        with Database(*db_args) as db:
            lot = int(db.scalar("SELECT importacao_lote_id FROM importacao_lote WHERE codigo_lote='d3-base'"))
            lines = {number: int(db.scalar("SELECT importacao_linha_id FROM importacao_linha "
                                     f"WHERE importacao_lote_id={lot} AND aba_ordem=2 AND numero_linha={number}"))
                     for number in (2, 3, 4)}
            negative = lines[2]
            attendance = int(db.scalar("SELECT registro_id FROM importacao_registro "
                                       f"WHERE importacao_linha_id={negative} AND tabela_destino='atendimento'"))
            patient = int(db.scalar("SELECT registro_id FROM importacao_registro "
                                    f"WHERE importacao_linha_id={negative} AND tabela_destino='paciente'"))
            screening = int(db.scalar("SELECT registro_id FROM importacao_registro "
                                      f"WHERE importacao_linha_id={negative} AND tabela_destino='rastreio_familiar'"))
            assert db.scalar(f"SELECT paciente_id || '|' || atendimento_id || '|' || "
                             "familiares_examinados::text || '|' || valor_original_examinados "
                             f"FROM rastreio_familiar WHERE rastreio_familiar_id={screening}") == f"{patient}|{attendance}|false|não"
            assert db.scalar(f"SELECT count(*) FROM rastreio_familiar_resultado WHERE rastreio_familiar_id={screening}") == "0"
            assert db.scalar(f"SELECT status_linha FROM importacao_linha WHERE importacao_linha_id={negative}") == "importada"
            for number, original in ((2, "não"), (3, "sim"), (4, "mãe positivo")):
                line = lines[number]
                assert db.scalar("SELECT item->>'valor' FROM importacao_linha l "
                                 "CROSS JOIN LATERAL jsonb_array_elements(l.dados_brutos) item "
                                 f"WHERE l.importacao_linha_id={line} AND item->>'chave'={literal(SOURCE)}") == original
                if number > 2:
                    assert db.scalar(f"SELECT count(*) FROM importacao_registro WHERE importacao_linha_id={line} "
                                     "AND tabela_destino='rastreio_familiar'") == "0"
                    assert db.scalar(f"SELECT status_linha FROM importacao_linha WHERE importacao_linha_id={line}") == "importada_com_pendencia"

        assert_ok(importer(path, "d3-reprocessado", reprocess=True))
        with Database(*db_args) as db:
            assert db.scalar(f"SELECT count(*) FROM rastreio_familiar WHERE atendimento_id={attendance}") == "1"
            assert db.scalar("SELECT count(*) FROM importacao_registro r JOIN importacao_linha l "
                             "USING(importacao_linha_id) JOIN importacao_lote b USING(importacao_lote_id) "
                             f"WHERE b.codigo_lote='d3-reprocessado' AND r.tabela_destino='rastreio_familiar' AND r.registro_id={screening}") == "1"
            # Simula fonte anterior ao handler D3: a célula e as âncoras ficam,
            # mas não há alvo estruturado nem proveniência em nenhum elo.
            db.run("DELETE FROM importacao_registro "
                   f"WHERE tabela_destino='rastreio_familiar' AND registro_id={screening}")
            db.run(f"DELETE FROM rastreio_familiar WHERE rastreio_familiar_id={screening}")
            db.run("UPDATE importacao_linha SET status_linha='importada_com_pendencia',"
                   f"mensagem_processamento={literal('campos preservados apenas em dados_brutos: ' + SOURCE)} "
                   "WHERE importacao_lote_id=(SELECT importacao_lote_id FROM importacao_lote "
                   "WHERE codigo_lote='d3-reprocessado') AND aba_ordem=2 AND numero_linha=2")

        assert_ok(importer(path, "d3-promovido", reprocess=True))
        with Database(*db_args) as db:
            assert db.scalar(f"SELECT count(*) FROM rastreio_familiar WHERE atendimento_id={attendance} "
                             "AND familiares_examinados=false AND valor_original_examinados='não'") == "1"
            assert db.scalar("SELECT count(*) FROM importacao_registro r JOIN importacao_linha l "
                             "USING(importacao_linha_id) JOIN importacao_lote b USING(importacao_lote_id) "
                             "WHERE b.codigo_lote='d3-promovido' AND r.tabela_destino='rastreio_familiar'") == "1"
            assert db.scalar(f"SELECT count(*) FROM atendimento WHERE paciente_id={patient}") == "1"
        print("OK: D3 Python/PostgreSQL promove negativa, preserva afirmativa ambígua e não duplica no reprocessamento")


if __name__ == "__main__":
    main()

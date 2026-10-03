#!/usr/bin/env python3
"""D2: bloqueio concorrente impede promoção baseada em NULL obsoleto."""

import json
import os
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TESTS = ROOT / "tests/importador"
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(TESTS))
import test_descoberta_chagas as d2  # noqa: E402
from importador.psql import Database, literal  # noqa: E402
from gerar_planilha_sintetica import row  # noqa: E402

MANIFEST = d2.MANIFEST
DISCOVERY_KEY = "autorelato_diagnostico_de_chagas_do_participante_data"


def start_reprocess(path, code):
    command = [sys.executable, str(ROOT / "scripts/importar_planilha.py"), str(path),
               "--codigo-lote", code, "--finalidade", "mesmo_conteudo", "--reprocessar",
               "--db-host", os.environ["DB_HOST"], "--db-port", os.environ["DB_PORT"],
               "--db-user", os.environ["D2_IMPORT_USER"], "--db-role", "ambulatorio_importador",
               "--db-name", os.environ["D2_DB_NAME"]]
    return subprocess.Popen(command, cwd=ROOT,
        env={**os.environ, "PGPASSWORD": os.environ["D2_IMPORT_PASSWORD"]},
        stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def wait_for_row_lock(monitor, database, import_user, owner_pid, process, timeout=20):
    deadline = time.monotonic() + timeout
    query = "SELECT json_build_object('pid',pid,'blocking',pg_blocking_pids(pid),'query',query)::text " \
        "FROM pg_stat_activity WHERE datname=" + literal(database) + " AND usename=" + literal(import_user) + \
        " AND state='active' AND wait_event_type='Lock'"
    last = []
    while time.monotonic() < deadline:
        last = [json.loads(item) for item in monitor.run(query)]
        for activity in last:
            if (owner_pid in activity["blocking"]
                    and "diagnostico_chagas" in activity["query"].lower()
                    and "for update" in activity["query"].lower()):
                return activity
        if process.poll() is not None:
            stdout, stderr = process.communicate()
            raise AssertionError(f"Importador terminou antes do lock; stdout={stdout}; stderr={stderr}")
        time.sleep(0.05)
    raise AssertionError(f"Importador não aguardou o row lock esperado; atividades={last}")


def main():
    host, port, owner_user, database, owner_password = d2.db_args()
    suffix = uuid.uuid4().hex[:12]
    patient_code = f"F089-D2-CONC-{suffix}"
    patient_name = f"Paciente F089 D2 Concorrência {suffix}"
    columns = MANIFEST["sheets"][1]["columns"]
    values = [row(columns, id=patient_code, nome=patient_name,
                   data_de_nascimento="12/12/1980", data_do_atendimento="12/02/2026",
                   diagnostico_da_dc_por_sorologia="sim", **{DISCOVERY_KEY: "12/12/2012"})]

    with tempfile.TemporaryDirectory(prefix="ambulatorio-f089-d2-conc-") as directory:
        workbook = Path(directory) / "base_d2_concorrencia.xlsx"
        d2.workbook(workbook, values)
        base_code = d2.seed_base(workbook, f"f089-d2-conc-base-{suffix}", values, [None])
        result_code = f"f089-d2-conc-reprocessado-{suffix}"
        db_args = (host, port, owner_user, database, owner_password)

        with Database(*db_args) as db:
            field = int(db.scalar("SELECT campo_id FROM auditoria_campo WHERE "
                "tabela_destino='diagnostico_chagas' AND coluna_destino='data_descoberta_autorelato' "
                "AND coluna_pk='diagnostico_chagas_id' AND tipo_sql='date' "
                "AND serializacao_versao='v1' AND captura_desde IS NOT NULL"))
            base = d2.rows_for_lot(db, base_code)
            base_line, diagnosis = base[2]
            assert db.scalar(f"SELECT data_descoberta_autorelato IS NULL FROM diagnostico_chagas WHERE diagnostico_chagas_id={diagnosis}") == "t"
            assert db.scalar(f"SELECT count(*) FROM auditoria_campo_evento WHERE campo_id={field} "
                f"AND registro_id={diagnosis} AND versao_campo=1 AND origem='importacao' "
                f"AND importacao_linha_id={base_line} AND antes->>'estado'='alvo_ausente' "
                "AND depois->>'estado'='nulo'") == "1"
            actor = int(db.scalar("INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) VALUES("
                f"{literal('Ator F089 D2 concorrência sintético')},{literal('f089-d2-conc-' + suffix + '@example.invalid')},"
                "'$2b$12$AHXFrksRrsnCtxc0yzPeSO3XHF94Quhjtu/5RZVYwRyvU6alPJXSK','administracao') "
                "RETURNING usuario_id"))

        owner = Database(*db_args)
        process = None
        try:
            owner.run("BEGIN")
            owner_pid = int(owner.scalar("SELECT pg_backend_pid()"))
            owner.run(f"SELECT diagnostico_chagas_id FROM diagnostico_chagas WHERE diagnostico_chagas_id={diagnosis} FOR UPDATE")
            process = start_reprocess(workbook, result_code)
            with Database(*db_args) as monitor:
                activity = wait_for_row_lock(monitor, database, os.environ["D2_IMPORT_USER"], owner_pid, process)
            assert activity["pid"] != owner_pid

            # Mesma transação autenticada produz NULL→data→NULL enquanto o
            # importador aguarda o lock da linha-alvo.
            owner.run("SET LOCAL ROLE ambulatorio_servico_autenticado")
            owner.run(f"SELECT auditoria_iniciar_aplicacao({actor})")
            owner.run("SET LOCAL ROLE ambulatorio_aplicacao")
            owner.run(f"UPDATE diagnostico_chagas SET data_descoberta_autorelato='2020-12-12' WHERE diagnostico_chagas_id={diagnosis}")
            owner.run(f"UPDATE diagnostico_chagas SET data_descoberta_autorelato=NULL WHERE diagnostico_chagas_id={diagnosis}")
            owner.run("COMMIT")

            stdout, stderr = process.communicate(timeout=30)
            assert process.returncode == 0, f"stdout={stdout}; stderr={stderr}"
        finally:
            if process is not None and process.poll() is None:
                process.terminate()
                try:
                    process.communicate(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.communicate()
            if owner.process.poll() is None:
                try:
                    owner.run("ROLLBACK")
                except RuntimeError:
                    pass
                owner.close()

        with Database(*db_args) as db:
            result = d2.rows_for_lot(db, result_code)
            assert 2 in result, "linha de reprocessamento ausente"
            line = result[2][0]
            assert db.scalar(f"SELECT status_linha FROM importacao_linha WHERE importacao_linha_id={line}") == "importada_com_pendencia"
            message = db.scalar(f"SELECT mensagem_processamento FROM importacao_linha WHERE importacao_linha_id={line}") or ""
            assert "conflitos=" + DISCOVERY_KEY in message, message
            assert db.scalar(f"SELECT data_descoberta_autorelato IS NULL FROM diagnostico_chagas WHERE diagnostico_chagas_id={diagnosis}") == "t"
            assert db.scalar(f"SELECT count(*) FROM auditoria_campo_evento WHERE campo_id={field} AND registro_id={diagnosis}") == "3"
            assert db.scalar(f"SELECT count(*) FROM auditoria_campo_evento WHERE campo_id={field} AND registro_id={diagnosis} "
                f"AND origem='aplicacao' AND ator_usuario_id={actor} AND importacao_linha_id IS NULL") == "2"
            assert db.scalar(f"SELECT count(*) FROM auditoria_campo_evento WHERE campo_id={field} AND registro_id={diagnosis} "
                f"AND origem='importacao' AND importacao_linha_id={line}") == "0"
            assert db.scalar(f"SELECT count(*) FROM importacao_registro WHERE importacao_linha_id={line} "
                f"AND tabela_destino='diagnostico_chagas' AND registro_id={diagnosis} AND acao='associado'") == "1"
            assert db.scalar(f"SELECT count(*) FROM diagnostico_chagas WHERE atendimento_id="
                f"(SELECT atendimento_id FROM diagnostico_chagas WHERE diagnostico_chagas_id={diagnosis})") == "1"
    print("OK: concorrência D2 bloqueou a leitura, detectou A→B→A e não promoveu NULL nem gravou auditoria parcial")


if __name__ == "__main__":
    main()

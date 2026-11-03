#!/usr/bin/env python3
"""Rejeição antes da identidade não pode encerrar o rollback externo da simulação."""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import uuid
import zipfile

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
sys.path.insert(0, str(ROOT))
from importar_planilha import Importer  # noqa: E402
from importador.psql import Database  # noqa: E402
from tests.importador.gerar_planilha_sintetica import (  # noqa: E402
    MANIFEST, OUTPUT, row, sheet_xml, write_stable,
)


def snapshot(db):
    """Somente fingerprints; nenhum dado clínico aparece na saída do teste."""
    tables = db.run("SELECT tablename FROM pg_tables WHERE schemaname='ambulatorio' ORDER BY tablename")
    return {table: db.scalar('SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t))::text,\'[]\')) '
                            f'FROM ambulatorio."{table}" t') for table in tables}


def workbook(path, code):
    replacements = {}
    for index, spec in enumerate(MANIFEST['sheets'], 1):
        columns = spec['columns']
        rows = [[column['cabecalho_original'] for column in columns]]
        if spec['aba_ordem'] == 1:
            rows += [
                row(columns, nome=f'Primeiro inválido sintético {code}',
                    data_de_nascimento='data inválida', data_do_atendimento='01/01/2026'),
                row(columns, nome=f'Segundo válido sintético {code}',
                    data_de_nascimento='01/01/1980', data_do_atendimento='02/01/2026'),
            ]
        replacements[f'xl/worksheets/sheet{index}.xml'] = sheet_xml(rows)
    with zipfile.ZipFile(OUTPUT) as source, zipfile.ZipFile(path, 'w') as target:
        for name in source.namelist():
            write_stable(target, name, replacements.get(name, source.read(name)))


def main():
    name = os.environ['EARLY_DB_NAME']
    assert name == os.environ['DB_NAME'] + '_importador_test', 'Exige banco exclusivo do runner de importador'
    host, port = os.environ['DB_HOST'], os.environ['DB_PORT']
    worker, password = os.environ['EARLY_IMPORT_USER'], os.environ['EARLY_IMPORT_PASSWORD']
    assert host and port.isdecimal() and 1 <= int(port) <= 65535, 'Endpoint explícito obrigatório'
    with Database(host, port, os.environ['DB_USER'], name, os.getenv('PGPASSWORD')) as owner:
        assert owner.scalar('SELECT current_database()') == name, 'Banco de teste inesperado'
        with tempfile.TemporaryDirectory(prefix='m3-rejeicao-precoce-') as task:
            for resume in (False, True):
                code = 'rejeicao-precoce-' + uuid.uuid4().hex
                source, report = Path(task) / 'fonte.xlsx', Path(task) / 'report.json'
                workbook(source, code)
                if resume:
                    # Estado suportado: lote/linhas persistidos antes de uma interrupção.
                    with Database(host, port, worker, name, password, role='ambulatorio_importador') as staged_db:
                        staged = Importer(staged_db, source, MANIFEST, code, purpose='carga_inicial')
                        staged.validate_layout()
                        assert staged.prepare_lot()
                        staged.stage()
                before = snapshot(owner)
                executed = subprocess.run([
                    sys.executable, str(ROOT / 'scripts/importar_planilha.py'), str(source),
                    '--codigo-lote', code, '--finalidade', 'carga_inicial', '--dry-run',
                    '--quality-report', str(report), '--db-host', host, '--db-port', port,
                    '--db-user', worker, '--db-role', 'ambulatorio_importador', '--db-name', name,
                ], cwd=ROOT, env={**os.environ, 'PGPASSWORD': password}, capture_output=True, text=True)
                assert executed.returncode == 0, f'Worker recusou rejeição esperada (retomada={resume})'
                assert snapshot(owner) == before, f'Dry-run modificou tabelas (retomada={resume})'
                quality = json.loads(report.read_text())
                assert quality['metrics']['total_rows'] == 2
                assert quality['metrics']['importable_rows'] == 1
                assert quality['metrics']['pending_rows'] == 0
                assert quality['metrics']['rejected_rows'] == 1
                assert quality['issue_counts'] == {'data_invalida': 1}
    print('OK: rejeição precoce mantém rollback externo, processa linha seguinte e preserva todas as tabelas, em lote novo e retomada')


if __name__ == '__main__':
    main()

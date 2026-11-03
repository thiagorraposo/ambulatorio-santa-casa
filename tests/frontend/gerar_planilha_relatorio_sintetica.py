#!/usr/bin/env python3
"""Fixture exclusivamente sintética com categorias discriminantes para H14/UI."""
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tests.importador.gerar_planilha_sintetica import MANIFEST, OUTPUT, row, sheet_xml, write_stable

invalid_birth = '--nascimento-invalido' in sys.argv[2:]
replacements = {}
for index, spec in enumerate(MANIFEST['sheets'], 1):
    columns = spec['columns']
    rows = [[column['cabecalho_original'] for column in columns]]
    if spec['aba_ordem'] == 1:
        for suffix in ('A', 'B', 'C'):
            rows.append(row(columns, nome=f'Relatório Normal {suffix} Sintético',
                            data_de_nascimento='01/01/1980', data_do_atendimento='01/01/2026'))
        rows.append(row(columns, nome='Relatório Rejeitado Sintético',
                        data_de_nascimento='data inválida' if invalid_birth else '01/01/1982',
                        data_do_atendimento='01/01/2026' if invalid_birth else 'data inválida'))
    if spec['aba_ordem'] == 2:
        for suffix in ('A', 'B'):
            rows.append(row(columns, nome=f'Relatório Pendência {suffix} Sintético',
                            data_de_nascimento='01/01/1981', data_do_atendimento='01/01/2026',
                            desfecho_do_retorno='Texto sintético preservado para decisão'))
    replacements[f'xl/worksheets/sheet{index}.xml'] = sheet_xml(rows)
with zipfile.ZipFile(OUTPUT) as source, zipfile.ZipFile(sys.argv[1], 'w') as target:
    for name in source.namelist():
        write_stable(target, name, replacements.get(name, source.read(name)))

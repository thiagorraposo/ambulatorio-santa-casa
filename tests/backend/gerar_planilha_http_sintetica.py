#!/usr/bin/env python3
"""Fixture mínima sintética HTTP, criada somente no caminho temporário informado."""
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tests.importador.gerar_planilha_sintetica import MANIFEST, OUTPUT, row, sheet_xml, write_stable


def main():
    destination = Path(sys.argv[1])
    replacements = {}
    for index, spec in enumerate(MANIFEST["sheets"], 1):
        columns = spec["columns"]
        rows = [[column["cabecalho_original"] for column in columns]]
        if spec["aba_ordem"] == 1:
            for suffix in ("A", "B"):
                rows.append(row(columns, nome=f"Paciente importado HTTP {suffix} sintético",
                                data_de_nascimento="01/01/1980", sexo="feminino",
                                data_do_atendimento="01/01/2026"))
        replacements[f"xl/worksheets/sheet{index}.xml"] = sheet_xml(rows)
    with zipfile.ZipFile(OUTPUT) as source, zipfile.ZipFile(destination, "w") as target:
        for name in source.namelist():
            write_stable(target, name, replacements.get(name, source.read(name)))


if __name__ == "__main__":
    main()

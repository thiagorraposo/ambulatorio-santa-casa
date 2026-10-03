#!/usr/bin/env python3
"""Arquivo de revisão sintético e bruto-base coerente para a integração HTTP."""
import json
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tests.importador.gerar_planilha_sintetica import MANIFEST, OUTPUT, row, sheet_xml, write_stable


def main():
    replacements = {}
    base = None
    for index, spec in enumerate(MANIFEST["sheets"], 1):
        columns = spec["columns"]
        rows = [[column["cabecalho_original"] for column in columns]]
        if spec["aba_ordem"] == 2:
            values = dict(nome="Paciente anual revisão HTTP sintético", id="REV-HTTP-ANO",
                          data_do_atendimento="01/01/2026", data_de_nascimento="01/01/1980")
            old = row(columns, **values, retorno_anual_realizado="2023")
            rows.append(row(columns, **values, retorno_anual_realizado="2022"))
            rows.append(row(columns, nome="Linha sem identidade sintética", retorno_anual_realizado="2021"))
            base = {"aba": spec["aba_nome_original"], "ordem": spec["aba_ordem"], "bruto": [
                {"posicao": c["posicao_fisica"], "cabecalho": c["cabecalho_original"],
                 "chave": c["chave_semantica"], "ocorrencia": c["ocorrencia"],
                 "bloco": c["bloco_funcional"], "valor": old[n]}
                for n, c in enumerate(columns)]}
        replacements[f"xl/worksheets/sheet{index}.xml"] = sheet_xml(rows)
    with zipfile.ZipFile(OUTPUT) as source, zipfile.ZipFile(sys.argv[1], "w") as target:
        for name in source.namelist():
            write_stable(target, name, replacements.get(name, source.read(name)))
    print(json.dumps(base, ensure_ascii=False))


if __name__ == "__main__":
    main()

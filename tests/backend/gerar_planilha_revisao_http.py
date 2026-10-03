#!/usr/bin/env python3
"""Arquivo de revisão sintético e bruto-base coerente para a integração HTTP."""
import json
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tests.importador.gerar_planilha_sintetica import MANIFEST, OUTPUT, row, sheet_xml, write_stable


def main():
    mode = sys.argv[2] if len(sys.argv) > 2 else "misto"
    if mode not in {"misto", "anual-apenas", "visita-nova"}:
        raise SystemExit("modo deve ser misto, anual-apenas ou visita-nova")
    replacements = {}
    base = None
    revisada = None
    for index, spec in enumerate(MANIFEST["sheets"], 1):
        columns = spec["columns"]
        rows = [[column["cabecalho_original"] for column in columns]]
        if mode == "visita-nova" and spec["aba_ordem"] == 2:
            values = dict(nome="Paciente T06 visita nova HTTP sintético", id="REV-HTTP-VISITA-NOVA",
                          data_do_atendimento="01/02/2026", data_de_nascimento="02/01/1980")
            old = row(columns, **values)
            proposed = row(columns, **{**values, "data_do_atendimento": "02/02/2026"})
            rows.append(proposed)
            base = {"aba": spec["aba_nome_original"], "ordem": spec["aba_ordem"], "bruto": [
                {"posicao": c["posicao_fisica"], "cabecalho": c["cabecalho_original"],
                 "chave": c["chave_semantica"], "ocorrencia": c["ocorrencia"],
                 "bloco": c["bloco_funcional"], "valor": old[n]}
                for n, c in enumerate(columns)]}
            revisada = {"aba": spec["aba_nome_original"], "ordem": spec["aba_ordem"], "bruto": [
                {"posicao": c["posicao_fisica"], "cabecalho": c["cabecalho_original"],
                 "chave": c["chave_semantica"], "ocorrencia": c["ocorrencia"],
                 "bloco": c["bloco_funcional"], "valor": proposed[n]}
                for n, c in enumerate(columns)]}
        elif mode != "visita-nova" and spec["aba_ordem"] == 1:
            values = dict(nome="Paciente anual revisão HTTP sintético", id="REV-HTTP-ANO",
                          data_do_atendimento="01/01/2026", data_de_nascimento="01/01/1980",
                          observacao="Observacao base sintetica")
            old = row(columns, **values, retorno_anual_realizado="2023")
            proposed = ({**values, "data_do_atendimento": "02/01/2026",
                         "observacao": "Observacao revisada sintetica"}
                        if mode == "misto" else values)
            rows.append(row(columns, **proposed,
                            retorno_anual_realizado="2022" if mode == "misto" else "2025"))
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
    print(json.dumps({"aba": revisada["aba"], "ordem": revisada["ordem"],
                      "bruto": revisada["bruto"], "brutoBase": base["bruto"]}
                     if mode == "visita-nova" else base, ensure_ascii=False))


if __name__ == "__main__":
    main()

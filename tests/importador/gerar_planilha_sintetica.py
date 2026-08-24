#!/usr/bin/env python3
"""Gera exclusivamente a fixture XLSX sintética do importador v1."""

import json
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

ROOT=Path(__file__).resolve().parents[2]
MANIFEST=json.loads((ROOT/"manifestos/planilha_ambulatorio_v1.json").read_text())
OUTPUT=ROOT/"tests/fixtures/planilha_importacao_v1_sintetica.xlsx"


def col(number):
    result=""
    while number:
        number,rest=divmod(number-1,26); result=chr(65+rest)+result
    return result


def row(columns, **values):
    return [values.get(c["chave_semantica"]) for c in columns]


def sheet_xml(rows):
    output=['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>']
    for rn, values in enumerate(rows,1):
        output.append(f'<row r="{rn}">')
        for cn,value in enumerate(values,1):
            if value is not None:
                output.append(f'<c r="{col(cn)}{rn}" t="inlineStr"><is><t>{escape(str(value))}</t></is></c>')
        output.append('</row>')
    output.append('</sheetData></worksheet>')
    return ''.join(output)


def main():
    sheets=[]
    for spec in MANIFEST["sheets"]:
        c=spec["columns"]
        rows=[[x["cabecalho_original"] for x in c]]
        if spec["aba_ordem"]==1:
            rows += [
              row(c,data_do_atendimento="01/08/2026",id="P-ANA",nome="Ana Sintética",data_de_nascimento="10/02/1980",
                  sexo="F",ambulatorio_unicamente="sim",sami_trop_aim3="S",parachute="não",idade="46",
                  ecg="sim",resultado_ecg="ritmo sinusal",data_do_ecg="01/08/2026",ecg_solicitado="não",
                  laboratoriais="hemograma trazido",eco="eco solicitado",valor_da_glicemia="92,5",
                  valor_de_colesterol_hdl="55",valor_de_colesterol_ldl="101",triglicerideos="130",
                  data_do_exame_colesterol="30/07/2026",uso_do_benzonidazol_para_tratamento_da_dc="sim",
                  tratamento_pelo_ambulatorio="sim",por_quanto_tempo_foi_usado="8 semanas",
                  em_qual_ano_tomou_a_medicacao_benzonidazol="2025",tem_indicacao_de_bzn="sim",
                  prescricao_do_bzn_data="01/06/2025",teve_reacao_adversa="não",trouxe_encaminhamento="sim",
                  origem_encaminhamento="hospital",encaminhado_a_qual_projeto="sami_trop_aim3",localizado="sim",
                  responsavel_pela_digitacao="Operador sintético"),
              row(c,data_do_atendimento="02/08/2026",id="P-ANA",nome="  ÁNA   SINTÉTICA ",data_de_nascimento="10/02/1980",
                  ambulatorio_anexo_ao_projeto="sim",ecg_solicitado="sim",eco="resultado eco segundo atendimento"),
              row(c,data_do_atendimento="03/08/2026",id="P-NOVO",nome="Carlos Sintético",data_de_nascimento="03/03/1990",
                  ambulatorio_unicamente="sim"),
              row(c,data_do_atendimento="04/08/2026",id="P-DUP",nome="Identidade Duplicada",data_de_nascimento="04/04/1984"),
              row(c,data_do_atendimento="05/08/2026",id="P-CAT",nome="Catálogo Ausente",data_de_nascimento="05/05/1985",
                  sami_trop_1_1="sim"),
              row(c,data_do_atendimento="06/08/2026",id="P-ABAS",nome="Conflito Entre Abas",data_de_nascimento="06/06/1986"),
              row(c,data_do_atendimento="data impossível",id="P-INV",nome="Valor Inválido",data_de_nascimento="07/07/1987",
                  uso_do_benzonidazol_para_tratamento_da_dc="talvez"),
            ]
        else:
            rows += [
              row(c,data_do_atendimento="08/08/2026",id="NP-1",nome="Bruno Não Portador",data_de_nascimento="08/08/1988",
                  ambulatorio_unicamente="sim",ecg="não",laboratoriais="solicitar painel",trouxe_encaminhamento="não",
                  pendencias_observacao="texto parcial preservado"),
              row(c,data_do_atendimento="09/08/2026",id="P-ABAS",nome="Conflito Entre Abas",data_de_nascimento="06/06/1986"),
            ]
        sheets.append((spec["aba_nome_original"],sheet_xml(rows)))
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    content_types=['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>']
    content_types += [f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(1,len(sheets)+1)]
    content_types.append('</Types>')
    workbook='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+''.join(f'<sheet name="{escape(name)}" sheetId="{i}" r:id="rId{i}"/>' for i,(name,_) in enumerate(sheets,1))+'</sheets></workbook>'
    rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+''.join(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1,len(sheets)+1))+'</Relationships>'
    rootrels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
    with zipfile.ZipFile(OUTPUT,"w",zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('[Content_Types].xml',''.join(content_types)); archive.writestr('_rels/.rels',rootrels)
        archive.writestr('xl/workbook.xml',workbook); archive.writestr('xl/_rels/workbook.xml.rels',rels)
        for i,(_,xml) in enumerate(sheets,1): archive.writestr(f'xl/worksheets/sheet{i}.xml',xml)
    print(OUTPUT)


if __name__ == '__main__': main()

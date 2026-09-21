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


def write_stable(archive, name, content):
    """Elimina timestamps do ZIP para a fixture ser byte a byte reproduzível."""
    info=zipfile.ZipInfo(name, date_time=(2026,1,1,0,0,0))
    info.compress_type=zipfile.ZIP_DEFLATED
    info.external_attr=0o100644 << 16
    archive.writestr(info,content)


def main():
    sheets=[]
    for spec in MANIFEST["sheets"]:
        c=spec["columns"]
        rows=[[x["cabecalho_original"] for x in c]]
        if spec["aba_ordem"]==1:
            rows += [
              row(c,data_do_atendimento="01/08/2026",id="P-ANA",nome="Ana Sintética",data_de_nascimento="10/02/1980",
                  sexo="feminino",raca="parda",pertence_a_comunidade_quilombola_ou_indigena="sim",qual_indigena_ou_quilombola="quilombola",
                  endereco="Rua Sintética, 1",cidade="Cidade Sintética",telefone_de_contato="(00) 0000-0000",
                  ambulatorio_unicamente="sim",sami_trop_aim3="S",sami_trop_aim3_pendencia="não",sami_trop_1_1="não",
                  parachute="não",parachute_falha="não",benbrasil="sim",benbrasil_falha="não",epoca="sim",epoca_falha="não",
                  santa_casa_dica="sim",santa_casa_renomica="sim",santa_casa_archimedes="sim",santa_casa_charm="sim",lxe_novartis="sim",lxe_novartis_falha="não",idade="46",
                  diagnostico_da_dc_por_sorologia="sim",resultado_final_da_sorologia="positivo",
                  caso_seja_sorologia_metodo_1="ELISA",data_da_sorologia_01="01/07/2026",caso_seja_sorologia_metodo_2="IFI",data_sorologia_2="02/07/2026",caso_seja_sorologia_metodo_3="HAI",data_sorologia_3="03/07/2026",
                  ou_solicitado_sorologia="sim",se_sim_data_solicitada="01/06/2026",forma_da_dc="cardiaca",classificacao_da_cardiopatia_chagasica="B1",
                  complicacoes_relacionadas_a_dc="sim",complicacoes_cardiacas_relacioadas_a_dc="arritmia sintética",complicacoes_do_trato_digestivo_relacioadas_a_dc="alteração sintética",outras_complicacoes_relacionadas_a_dc_qual="outra sintética",
                  comorbidades_nao_relacionadas_a_dc="sim",hipertensao_arterial="sim",diabetes="não",doenca_renal="não",doencas_psicologicas="não",doencas_do_sistema_cardiovascular="sim",doencas_do_sistema_respiratorio="não",doencas_do_sistema_digestorio="não",doencas_do_sistema_nervoso="não",doencas_do_sistema_endocrino="não",doencas_do_sistema_imunologico="não",doencas_do_sistema_tegumentar="não",outras_doencas="não",
                  anti_hipertensivo="sim",diureticos="sim",anti_arritmicos="não",alfa_betabloqueador="sim",anti_coagulantes="não",anti_depressivos="não",bloqueador_de_calcio="não",estatinas="sim",hipoglicemiante="não",ieca_bra="sim",inra="não",vasodilatador="não",outros_medicamentos="não",
                  ecg="sim",resultado_ecg="ritmo sinusal",data_do_ecg="01/08/2026",ecg_solicitado="não",
                  laboratoriais="hemograma trazido",eco="eco sintético",de_imagem="imagem sintética",holter="holter sintético",endoscopia="endoscopia sintética",colonoscopia="colonoscopia sintética",teste_ergometrico="teste sintético",mapa="mapa sintético",outros="outro exame sintético",feve="55%",valor_da_glicemia="92,5",
                  valor_de_colesterol_hdl="55",valor_de_colesterol_ldl="101",triglicerideos="130",
                  data_do_exame_colesterol="30/07/2026",uso_do_benzonidazol_para_tratamento_da_dc="sim",
                  tratamento_pelo_ambulatorio="sim",por_quanto_tempo_foi_usado="8 semanas",
                  em_qual_ano_tomou_a_medicacao_benzonidazol="2025",tem_indicacao_de_bzn="sim",
                  prescricao_do_bzn_data="01/06/2025",teve_reacao_adversa="não",trouxe_encaminhamento="sim",
                  origem_encaminhamento="hospital",encaminhado_a_qual_projeto="sami_trop_aim3",
                  altura="1,70",peso="70,5",circunferencia_abdominal="88",frequencia_cardiaca="72",saturacao="98%",pa_sistolica="120",pa_diastolica="80",nyha="II",
                  teve_avc="sim",ano_do_ultimo_avc="2020",portador_de_cdi="não",portador_de_marcapasso="sim",
                  paciente_notificado="não",numero_notificacao="NOT-SINT-1",caso_nao_justifique="justificativa sintética",obito="sim",data_do_obito="20/08/2026",causa_do_obito="causa sintética",
                  localizado="sim",
                  responsavel_pela_digitacao="Operador sintético"),
              row(c,data_do_atendimento="02/08/2026",id="P-ANA",nome="  ÁNA   SINTÉTICA ",data_de_nascimento="10/02/1980",
                  ambulatorio_anexo_ao_projeto="sim",ecg_solicitado="sim",eco="resultado eco segundo atendimento",
                  uso_do_benzonidazol_para_tratamento_da_dc="S",tratamento_pelo_ambulatorio="x",
                  por_quanto_tempo_foi_usado="56 dias",em_qual_ano_tomou_a_medicacao_benzonidazol="2025",
                  tem_indicacao_de_bzn="1",prescricao_do_bzn_data="01/06/2025",teve_reacao_adversa="N"),
              row(c,data_do_atendimento="03/08/2026",id="P-NOVO",nome="Carlos Sintético",data_de_nascimento="03/03/1990",
                  ambulatorio_unicamente="sim",tem_indicacao_de_bzn="sim",teve_reacao_adversa="não"),
              row(c,data_do_atendimento="04/08/2026",id="P-DUP",nome="Identidade Duplicada",data_de_nascimento="04/04/1984"),
              row(c,data_do_atendimento="05/08/2026",id="P-CAT",nome="Catálogo Ausente",data_de_nascimento="05/05/1985",
                  sami_trop_1_1="sim"),
              row(c,data_do_atendimento="06/08/2026",id="P-ABAS",nome="Conflito Entre Abas",data_de_nascimento="06/06/1986"),
              row(c,data_do_atendimento="data impossível",id="P-INV",nome="Valor Inválido",data_de_nascimento="07/07/1987",
                  uso_do_benzonidazol_para_tratamento_da_dc="talvez"),
              row(c,data_do_atendimento="07/08/2026",id="P-ATOM",nome="Falha Atômica",data_de_nascimento="07/07/1987",
                  endereco="Endereço que deve sofrer rollback",paciente_notificado="sim",caso_nao_justifique="contradição sintética"),
              row(c,data_do_atendimento="10/08/2026",id="P-NOVO",nome="Carlos Sintético",data_de_nascimento="03/03/1990",
                  uso_do_benzonidazol_para_tratamento_da_dc="sim",por_quanto_tempo_foi_usado="7 dias",
                  em_qual_ano_tomou_a_medicacao_benzonidazol="2025"),
              row(c,data_do_atendimento="11/08/2026",id="P-NOVO",nome="Carlos Sintético",data_de_nascimento="03/03/1990",
                  endereco="Endereço sintético da linha BZN rejeitada",uso_do_benzonidazol_para_tratamento_da_dc="sim",
                  tratamento_pelo_ambulatorio="sim",por_quanto_tempo_foi_usado="1 semana",
                  em_qual_ano_tomou_a_medicacao_benzonidazol="2024"),
              row(c,data_do_atendimento="12/08/2026",id="P-NOVO",nome="Carlos Sintético",data_de_nascimento="03/03/1990",
                  uso_do_benzonidazol_para_tratamento_da_dc="S",por_quanto_tempo_foi_usado="1 semana"),
            ]
        else:
            rows += [
              row(c,data_do_atendimento="08/08/2026",id="NP-1",nome="Bruno Não Portador",data_de_nascimento="08/08/1988",
                  ambulatorio_unicamente="sim",ecg="não",laboratoriais="solicitar painel",trouxe_encaminhamento="não",
                  idade="38",autorelato_diagnostico_de_chagas_do_participante_data="01/01/2020",
                  familiares_diretos_mae_pai_irmaos_realizaram_o_exame_de_chagas="sim",
                  paciente_trouxe_outros_exames_complementares="sim",solicitado_exames_complementares="sim",
                  retorno_30_dias_de_tratamento="sim",retorno_final_de_tratamento="sim",retorno_anual_realizado="não",
                  desfecho_do_retorno="texto sintético",paciente_com_contrarreferencia_realizada="não",
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
        write_stable(archive,'[Content_Types].xml',''.join(content_types)); write_stable(archive,'_rels/.rels',rootrels)
        write_stable(archive,'xl/workbook.xml',workbook); write_stable(archive,'xl/_rels/workbook.xml.rels',rels)
        for i,(_,xml) in enumerate(sheets,1): write_stable(archive,f'xl/worksheets/sheet{i}.xml',xml)
    print(OUTPUT)


if __name__ == '__main__': main()

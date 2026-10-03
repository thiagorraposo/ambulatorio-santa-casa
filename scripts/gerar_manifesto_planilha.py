#!/usr/bin/env python3
"""Gera manifesto somente a partir da linha 1 das duas abas clínicas."""
import json, re, unicodedata
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "planejamento/Nova Planilha ambulatório.xlsx"
OUTPUT = ROOT / "manifestos/planilha_ambulatorio_v1.json"
NS = {"m":"http://schemas.openxmlformats.org/spreadsheetml/2006/main","r":"http://schemas.openxmlformats.org/officeDocument/2006/relationships"}

def slug(value):
    value = unicodedata.normalize("NFKD", value.strip()).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "_", value).strip("_")

ALIASES = {
    "benbrasil":"benbrasil", "falha_epoca":"epoca_falha", "epoca_falha":"epoca_falha",
    "responao_se_aplicavel_pela_digitacao":"responsavel_pela_digitacao",
    "responsavel_pela_digitacao":"responsavel_pela_digitacao",
}

ALIASES_VERSIONADOS = {
    "booleanos": {
        "true": ["sim", "S", "x", "1", "verdadeiro"],
        "false": ["não", "N", "0", "falso"],
    },
    "projetos": {
        "sami_trop_aim3": "sami_trop_aim3",
        "sami_trop_aim3_pendencia": "sami_trop_aim3",
        "sami_trop_1_1": "sami_trop_1_1",
        "parachute": "parachute",
        "parachute_falha": "parachute",
        "benbrasil": "benbrasil",
        "benbrasil_falha": "benbrasil",
        "epoca": "epoca",
        "epoca_falha": "epoca",
        "santa_casa_dica": "santa_casa_dica",
        "santa_casa_renomica": "renomica",
        "santa_casa_archimedes": "archimedes",
        "santa_casa_charm": "charm",
        "lxe_novartis": "lxe_novartis",
        "lxe_novartis_falha": "lxe_novartis",
    },
    "exames": {
        "ecg": "eletrocardiograma",
        "ecg_solicitado": "eletrocardiograma",
        "resultado_ecg": "eletrocardiograma",
        "data_do_ecg": "eletrocardiograma",
        "feve": "ecocardiograma",
        "valor_da_glicemia": "laboratoriais",
        "valor_de_colesterol_hdl": "laboratoriais",
        "valor_de_colesterol_ldl": "laboratoriais",
        "triglicerideos": "laboratoriais",
        "data_do_exame_colesterol": "laboratoriais",
        "eco": "ecocardiograma",
        "laboratoriais": "laboratoriais",
        "de_imagem": "imagem",
        "holter": "holter",
        "endoscopia": "endoscopia",
        "colonoscopia": "colonoscopia",
        "teste_ergometrico": "teste_ergometrico",
        "mapa": "mapa",
        "outros": "outro",
    },
    "medicamentos": {
        "anti_hipertensivo": "antihipertensivo_nao_especificado",
        "diureticos": "diuretico_nao_especificado",
        "anti_arritmicos": "antiarritmico_nao_especificado",
        "alfa_betabloqueador": "betabloqueador_nao_especificado",
    },
    "comorbidades": {},
    "dominios": {
        "nyha": ["I", "II", "III", "IV"],
        "sexo": [],
        "raca": [],
        "tipo_comunidade_tradicional": [],
        "forma_clinica": [],
        "classificacao_clinica": [],
        "resultado_sorologia": [],
        "origem_encaminhamento": [],
    },
}

def semantic_key(header): return ALIASES.get(slug(header), slug(header))

def target(key, header, block):
    raw = ("importacao_linha", "dados_brutos", "parcial", "preservar no JSONB bruto até regra específica")
    direct = {
      "data_do_atendimento":("atendimento","data_atendimento","com_transformacao","converter dd/mm/aaaa para DATE"),
      "id":("paciente","codigo_planilha","direta","preservar identificador original"), "nome":("paciente","nome","direta","preservar texto original"),
      "localizacao_do_prontuario":("atendimento","localizacao_prontuario","direta","aparar espaços externos"),
      "data_de_nascimento":("paciente","data_nascimento","com_transformacao","converter dd/mm/aaaa para DATE"),
      "sexo":("paciente","sexo","com_transformacao","normalizar domínio e preservar bruto"), "raca":("paciente","raca","com_transformacao","normalizar domínio e preservar bruto"),
      "endereco":("paciente_endereco","endereco","direta","preservar texto"), "cidade":("paciente_endereco","cidade","direta","preservar texto"),
      "telefone_de_contato":("paciente_contato","telefone","direta","preservar texto"),
      "ambulatorio_unicamente":("atendimento","ambulatorio_unicamente","com_transformacao","normalizar booleano triestado; não pode ser verdadeiro junto de ambulatorio_anexo_ao_projeto"),
      "ambulatorio_anexo_ao_projeto":("atendimento","ambulatorio_anexo_projeto","com_transformacao","normalizar booleano triestado; não pode ser verdadeiro junto de ambulatorio_unicamente"),
      "pertence_a_comunidade_quilombola_ou_indigena":("paciente","pertence_comunidade_tradicional","com_transformacao","normalizar booleano triestado"),
      "qual_indigena_ou_quilombola":("paciente","tipo_comunidade_tradicional","com_transformacao","normalizar domínio"),
      "trouxe_encaminhamento":("encaminhamento","documento_apresentado","com_transformacao","normalizar booleano triestado"),
      "origem_encaminhamento":("encaminhamento","origem_encaminhamento","com_transformacao","lookup do domínio e preservar original"),
      "diagnostico_da_dc_por_sorologia":("diagnostico_chagas","possui_diagnostico_chagas","com_transformacao","normalizar estado diagnóstico"),
      "resultado_final_da_sorologia":("diagnostico_chagas","resultado_final","com_transformacao","normalizar resultado"),
      "autorelato_diagnostico_de_chagas_do_participante_data":("diagnostico_chagas","data_descoberta_autorelato","com_transformacao","converter dd/mm/aaaa para DATE; data de descoberta informada pelo paciente, distinta da sorologia"),
      "ou_solicitado_sorologia":("sorologia_solicitacao","solicitada","com_transformacao","normalizar booleano triestado"),
      "se_sim_data_solicitada":("sorologia_solicitacao","data_solicitacao","com_transformacao","converter dd/mm/aaaa para DATE"),
      "forma_da_dc":("condicao_chagas","forma_clinica","com_transformacao","normalizar domínio"),
      "classificacao_da_cardiopatia_chagasica":("condicao_chagas","classificacao_clinica","com_transformacao","normalizar classificação"),
      "complicacoes_relacionadas_a_dc":("complicacao_chagas","possui_complicacao","com_transformacao","normalizar booleano triestado"),
      "complicacoes_cardiacas_relacioadas_a_dc":("complicacao_chagas","descricao","com_transformacao","criar ocorrência tipo cardíaca"),
      "complicacoes_do_trato_digestivo_relacioadas_a_dc":("complicacao_chagas","descricao","com_transformacao","criar ocorrência tipo digestiva"),
      "outras_complicacoes_relacionadas_a_dc_qual":("complicacao_chagas","descricao","com_transformacao","criar ocorrência tipo outra"),
      "teve_avc":("evento_clinico","ocorreu","com_transformacao","tipo_evento=avc e booleano triestado"),
      "ano_do_ultimo_avc":("evento_clinico","ano_evento","com_transformacao","converter para ano sem inventar data"),
      "portador_de_marcapasso":("dispositivo_implantado","possui_dispositivo","com_transformacao","tipo_dispositivo=marcapasso"),
      "portador_de_cdi":("dispositivo_implantado","possui_dispositivo","com_transformacao","tipo_dispositivo=cdi"),
      "ecg":("atendimento_exame_complementar","trouxe_exame","com_transformacao","tipo=eletrocardiograma; normalizar booleano triestado e consolidar com resultado e data do ECG da mesma linha"),
      "resultado_ecg":("atendimento_exame_complementar","resumo_resultado","com_transformacao","tipo=eletrocardiograma; preservar texto e consolidar com indicadores e data do ECG da mesma linha"),
      "data_do_ecg":("atendimento_exame_complementar","data_realizacao","com_transformacao","tipo=eletrocardiograma; converter dd/mm/aaaa e consolidar com indicadores e resultado do ECG da mesma linha"),
      "ecg_solicitado":("atendimento_exame_complementar","solicitado_exame","com_transformacao","tipo=eletrocardiograma; normalizar booleano triestado e consolidar com resultado e data do ECG da mesma linha"),
      "valor_da_glicemia":("exame_complementar_resultado","valor_numerico","com_transformacao","tipo=laboratoriais; nome_campo=glicemia; converter número e preservar original"),
      "valor_de_colesterol_hdl":("exame_complementar_resultado","valor_numerico","com_transformacao","tipo=laboratoriais; nome_campo=colesterol_hdl; converter número e preservar original"),
      "valor_de_colesterol_ldl":("exame_complementar_resultado","valor_numerico","com_transformacao","tipo=laboratoriais; nome_campo=colesterol_ldl; converter número e preservar original"),
      "triglicerideos":("exame_complementar_resultado","valor_numerico","com_transformacao","tipo=laboratoriais; nome_campo=triglicerideos; converter número e preservar original"),
      "data_do_exame_colesterol":("atendimento_exame_complementar","data_realizacao","com_transformacao","tipo=laboratoriais; converter dd/mm/aaaa e consolidar com resultados de colesterol da mesma linha"),
      "feve":("exame_complementar_resultado","valor_numerico","com_transformacao","nome_campo=FEVE; extrair percentual e preservar original"),
      "uso_do_benzonidazol_para_tratamento_da_dc":("tratamento_benzonidazol","iniciado","com_transformacao","normalizar booleano triestado"),
      "tratamento_pelo_ambulatorio":("tratamento_benzonidazol","tratamento_pelo_ambulatorio","com_transformacao","normalizar booleano triestado"),
      "por_quanto_tempo_foi_usado":("tratamento_benzonidazol","duracao_cumprida_dias","com_transformacao","aceitar inteiro positivo como dias, ou inteiro positivo seguido de dia/dias/semana/semanas; semana=7 dias; rejeitar demais representações; preservar original"),
      "em_qual_ano_tomou_a_medicacao_benzonidazol":("tratamento_benzonidazol","ano_uso_aproximado","com_transformacao","converter para ano sem inventar data"),
      "tem_indicacao_de_bzn":("tratamento_benzonidazol","tem_indicacao","com_transformacao","normalizar booleano triestado"),
      "prescricao_do_bzn_data":("tratamento_benzonidazol","data_prescricao","com_transformacao","converter dd/mm/aaaa para DATE"),
      "se_nao_descreva_o_motivo":("tratamento_benzonidazol","motivo_nao_indicacao","com_transformacao","aplicar ao indicador de indicação"),
      "teve_reacao_adversa":("tratamento_benzonidazol","teve_reacao_adversa","com_transformacao","normalizar booleano triestado"),
      "encaminhado_a_qual_projeto":("encaminhamento","projeto_estudo_id","com_transformacao","lookup restrito ao catálogo oficial"),
      "paciente_com_contrarreferencia_realizada":("acompanhamento_cuidado","status_acompanhamento","parcial","status atual não distingue fielmente resposta negativa e multiplicidade permanece indefinida; preservar no bruto sem promoção"),
      "paciente_notificado":("notificacao","paciente_notificado","com_transformacao","normalizar booleano triestado"),
      "numero_notificacao":("notificacao","numero_notificacao","direta","preservar texto"),
      "caso_nao_justifique":("notificacao","justificativa_nao_notificacao","com_transformacao","aplicar quando notificado=false"),
      "altura":("dados_clinicos_atendimento","altura_cm","com_transformacao","converter metros para centímetros: altura_cm=altura_m*100"),
      "peso":("dados_clinicos_atendimento","peso_kg","com_transformacao","converter número em kg"),
      "circunferencia_abdominal":("dados_clinicos_atendimento","circunferencia_abdominal_cm","com_transformacao","converter número em cm"),
      "frequencia_cardiaca":("dados_clinicos_atendimento","frequencia_cardiaca_bpm","com_transformacao","converter inteiro em bpm"),
      "saturacao":("dados_clinicos_atendimento","saturacao_percentual","com_transformacao","converter percentual"),
      "pa_sistolica":("dados_clinicos_atendimento","pa_sistolica_mmhg","com_transformacao","converter inteiro em mmHg"),
      "pa_diastolica":("dados_clinicos_atendimento","pa_diastolica_mmhg","com_transformacao","converter inteiro em mmHg"),
      "nyha":("dados_clinicos_atendimento","nyha","com_transformacao","aceitar somente I, II, III ou IV"),
      "obito":("obito","houve_obito","com_transformacao","normalizar booleano triestado"), "data_do_obito":("obito","data_obito","com_transformacao","converter dd/mm/aaaa para DATE"),
      "causa_do_obito":("obito","causa_obito","direta","preservar texto"), "pendencias_observacao":("pendencia_atendimento","descricao","com_transformacao","criar pendência textual vinculada ao atendimento sem inferir tipo, status, responsável ou datas"),
      "observacao":("atendimento","observacoes","com_transformacao","preservar texto livre"),
      "responsavel_pela_digitacao":("importacao_linha","responsavel_digitacao_original","com_transformacao","preservar legado sem associar usuário"),
    }
    if key == "localizado": return (None,None,"excluido","fora do estruturado no MVP; semântica indefinida")
    if key == "idade": return ("importacao_linha","dados_brutos","parcial","sem campo para idade original nem data de referência comprovada; preservar no bruto e derivar de nascimento e atendimento quando possível")
    if key == "familiares_diretos_mae_pai_irmaos_realizaram_o_exame_de_chagas":
        return ("rastreio_familiar", "familiares_examinados", "parcial",
                "somente negativa booleana inequívoca vira avaliação sem resultados; afirmativa exige familiar e resultado, e texto ambíguo permanece no bruto")
    if key == "retorno_anual_realizado":
        return ("evento_clinico", "ano_evento", "parcial",
                "somente ano de quatro dígitos vira snapshot do último comparecimento informado; texto ambíguo permanece no bruto; não criar visita ou data")
    partial_reasons = {
        "paciente_trouxe_outros_exames_complementares": "indicador agregado sem tipo de ocorrência; paciente_exame_complementar exige um exame identificado; preservar no bruto",
        "solicitado_exames_complementares": "indicador agregado sem tipo de ocorrência; paciente_exame_complementar exige um exame identificado; preservar no bruto",
        "desfecho_do_retorno": "não está definido a qual retorno o desfecho pertence nem seu domínio; preservar no bruto",
    }
    if key in partial_reasons: return ("importacao_linha","dados_brutos","parcial",partial_reasons[key])
    if key in {"retorno_30_dias_de_tratamento", "retorno_final_de_tratamento"}:
        return ("acompanhamento_cuidado","data_realizada","parcial",
                "somente data real dd/mm/aaaa com tratamento BZN canônico vira comparecimento; sim/não ou texto permanecem no bruto")
    if block in {"trazido","solicitado"} and key in {"eco","laboratoriais","de_imagem","holter","endoscopia","colonoscopia","teste_ergometrico","mapa","outros"}:
        return ("paciente_exame_complementar","resultado_texto","com_transformacao",f"criar ocorrência do tipo {key} no bloco {block}")
    if key.startswith("caso_seja_sorologia_metodo_"): return ("sorologia_chagas","metodo_sorologico","com_transformacao","criar ocorrência pelo número do método")
    if key.startswith("data_da_sorologia") or key.startswith("data_sorologia_"): return ("sorologia_chagas","data_resultado","com_transformacao","converter data e associar ao número do método")
    if key in {"comorbidades_nao_relacionadas_a_dc"}: return ("paciente_comorbidade","possui_comorbidade","com_transformacao","indicador geral; não criar falso por vazio")
    if key in {"doencas_do_sistema_cardiovascular","hipertensao_arterial","doencas_do_sistema_imunologico","doencas_do_sistema_nervoso","doencas_psicologicas","doencas_do_sistema_respiratorio","doencas_do_sistema_digestorio","doencas_do_sistema_endocrino","doencas_do_sistema_tegumentar","diabetes","doenca_renal","outras_doencas"}:
        return ("paciente_comorbidade","possui_comorbidade","com_transformacao","lookup de comorbidade e vínculo por paciente")
    if key in {"anti_hipertensivo","diureticos","anti_coagulantes","anti_arritmicos","anti_depressivos","ieca_bra","inra","alfa_betabloqueador","vasodilatador","hipoglicemiante","estatinas","bloqueador_de_calcio","outros_medicamentos"}:
        return ("atendimento_medicamento","uso_atual","com_transformacao","lookup do catálogo e vínculo ao atendimento")
    if key.startswith("sami_trop") or key in {"parachute","parachute_falha","benbrasil","benbrasil_falha","epoca","epoca_falha","santa_casa_dica","santa_casa_renomica","santa_casa_archimedes","santa_casa_charm","lxe_novartis","lxe_novartis_falha"}:
        field = "possui_pendencia" if "pendencia" in key else "houve_falha" if "falha" in key else "participa"
        return ("paciente_projeto_estudo",field,"com_transformacao","lookup por projeto oficial; normalizar booleano triestado")
    return direct.get(key, raw)

def semantic_type(key, transformation):
    if key in {"retorno_30_dias_de_tratamento", "retorno_final_de_tratamento",
               "familiares_diretos_mae_pai_irmaos_realizaram_o_exame_de_chagas",
               "retorno_anual_realizado"}: return "texto"
    if "boolean" in transformation or key.startswith(("teve_","portador_","paciente_","uso_","tem_")): return "booleano_triestado"
    if "data" in transformation: return "data"
    if "ano" in transformation: return "ano"
    if "converter" in transformation or "percentual" in transformation: return "numero"
    return "texto"

def read_headers():
    with ZipFile(SOURCE) as z:
        wb=ET.fromstring(z.read("xl/workbook.xml")); rel=ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        rels={x.attrib["Id"]:x.attrib["Target"] for x in rel}; shared=[]
        if "xl/sharedStrings.xml" in z.namelist():
            root=ET.fromstring(z.read("xl/sharedStrings.xml")); shared=["".join(t.text or "" for t in x.iter("{%s}t"%NS["m"])) for x in root]
        result=[]
        for sheet_order, sh in enumerate(list(wb.find("m:sheets",NS))[:2],1):
            target=rels[sh.attrib["{%s}id"%NS["r"]]]; target=target.lstrip("/") if target.startswith("/") else "xl/"+target
            row=ET.fromstring(z.read(target)).find(".//m:row[@r='1']",NS); cols=[]
            for cell in row.findall("m:c",NS):
                value=cell.find("m:v",NS); text="" if value is None else (shared[int(value.text)] if cell.attrib.get("t")=="s" else value.text)
                if text.strip(): cols.append((re.sub(r"\d+$","",cell.attrib["r"]), text))
            result.append((sheet_order,sh.attrib["name"],cols))
        return result

def main():
    sheets=[]; all_keys=set()
    for sheet_order,name,headers in read_headers():
        totals=Counter(h.strip() for _,h in headers); seen=Counter(); columns=[]
        for order,(position,header) in enumerate(headers,1):
            clean=header.strip(); seen[clean]+=1; key=semantic_key(clean)
            block=None
            if key=="eco" and order in (89,85): block="trazido"
            if (sheet_order==1 and 92<=order<=100) or (sheet_order==2 and 88<=order<=96): block="trazido"
            if (sheet_order==1 and 101<=order<=109) or (sheet_order==2 and 97<=order<=105): block="solicitado"
            table,field,coverage,transform=target(key,clean,block); all_keys.add(key)
            columns.append({"layout_versao":"planilha_ambulatorio_v1","aba_nome":name,"posicao_fisica":position,"ordem":order,"cabecalho_original":header,"chave_semantica":key,"ocorrencia":seen[clean] if totals[clean]>1 or key=="eco" else None,"bloco_funcional":block or "geral","tipo_semantico":semantic_type(key,transform),"destino_atual":f"ambulatorio.{table}.{field}" if table else None,"tabela_destino":table,"campo_destino":field,"situacao_cobertura":coverage,"transformacao":transform,"alias_conhecido":key if slug(clean)!=key else None,"observacoes_tecnicas":"célula vazia significa não informado"})
        sheets.append({"aba_chave":"portadores" if sheet_order==1 else "nao_portadores","aba_nome_original":name,"aba_ordem":sheet_order,"condicao_chagas":"portador" if sheet_order==1 else "nao_portador","quantidade_colunas":len(columns),"columns":columns})
    doc={"manifesto":"planilha_ambulatorio","layout_versao":"planilha_ambulatorio_v1","versao":"v1.4","fonte_local":"planejamento/Nova Planilha ambulatório.xlsx","escopo":{"abas_incluidas":[x["aba_nome_original"] for x in sheets],"abas_excluidas":["P Digitar","AIM3 incluidos sem ambulatorio","AIM3 sem ambulatorio"],"valor_vazio":"nao_informado","localizado":"excluido_do_estruturado"},"inventario":{"colunas_por_aba":{"portadores":142,"nao_portadores":136},"rotulos_semanticos_canonicos":136,"cabecalhos_compartilhados_deslocados":81,"complicacoes_exclusivas_portadores":4,"tipos_exame_repetidos":9},"aliases_versionados":ALIASES_VERSIONADOS,"sheets":sheets}
    if len(all_keys)!=133: raise SystemExit(f"esperadas 133 chaves após aliases dos 136 rótulos, encontradas {len(all_keys)}")
    OUTPUT.parent.mkdir(parents=True,exist_ok=True); OUTPUT.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"OK: manifesto gerado com {len(all_keys)} chaves; abas: 142 e 136 colunas")
if __name__=="__main__": main()

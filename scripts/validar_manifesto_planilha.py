#!/usr/bin/env python3
"""Valida o manifesto sem acessar valores clínicos da planilha."""
import argparse, json, re, sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/"manifestos/planilha_ambulatorio_v1.json"
SCHEMA=ROOT/"docs/evidencias/schema_atual_ambulatorio.sql"
REQUIRED={"layout_versao","aba_nome","posicao_fisica","ordem","cabecalho_original","chave_semantica","ocorrencia","bloco_funcional","tipo_semantico","destino_atual","tabela_destino","campo_destino","situacao_cobertura","transformacao","alias_conhecido","observacoes_tecnicas"}
BLOCKS={"geral","trazido","solicitado"}; TYPES={"texto","booleano_triestado","data","ano","numero"}
EXPECTED_ALIASES={
    "projetos": {"sami_trop_aim3":"sami_trop_aim3","sami_trop_aim3_pendencia":"sami_trop_aim3","sami_trop_1_1":"sami_trop_1_1","parachute":"parachute","parachute_falha":"parachute","benbrasil":"benbrasil","benbrasil_falha":"benbrasil","epoca":"epoca","epoca_falha":"epoca","santa_casa_dica":"santa_casa_dica","santa_casa_renomica":"renomica","santa_casa_archimedes":"archimedes","santa_casa_charm":"charm","lxe_novartis":"lxe_novartis","lxe_novartis_falha":"lxe_novartis"},
    "exames": {"ecg":"eletrocardiograma","ecg_solicitado":"eletrocardiograma","resultado_ecg":"eletrocardiograma","data_do_ecg":"eletrocardiograma","feve":"ecocardiograma","valor_da_glicemia":"laboratoriais","valor_de_colesterol_hdl":"laboratoriais","valor_de_colesterol_ldl":"laboratoriais","triglicerideos":"laboratoriais","data_do_exame_colesterol":"laboratoriais","eco":"ecocardiograma","laboratoriais":"laboratoriais","de_imagem":"imagem","holter":"holter","endoscopia":"endoscopia","colonoscopia":"colonoscopia","teste_ergometrico":"teste_ergometrico","mapa":"mapa","outros":"outro"},
    "medicamentos": {"anti_hipertensivo":"antihipertensivo_nao_especificado","diureticos":"diuretico_nao_especificado","anti_arritmicos":"antiarritmico_nao_especificado","alfa_betabloqueador":"betabloqueador_nao_especificado"},
}
EXPECTED_PARTIAL={"idade","autorelato_diagnostico_de_chagas_do_participante_data","familiares_diretos_mae_pai_irmaos_realizaram_o_exame_de_chagas","paciente_trouxe_outros_exames_complementares","solicitado_exames_complementares","retorno_30_dias_de_tratamento","retorno_final_de_tratamento","retorno_anual_realizado","desfecho_do_retorno","paciente_com_contrarreferencia_realizada","pendencias_observacao"}

def schema_columns(text):
    result={}
    for table,body in re.findall(r"CREATE TABLE ambulatorio\.(\w+) \((.*?)\n\);",text,re.S):
        result[table]={m.group(1) for line in body.splitlines() if (m:=re.match(r"\s{4}(\w+)\s+",line)) and not m.group(1).upper() in {"CONSTRAINT","PRIMARY","UNIQUE","CHECK","FOREIGN"}}
    return result

def fail(errors,msg): errors.append(msg)
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--fonte",action="store_true",help="compara somente abas e linha de cabeçalho com o XLSX local"); args=ap.parse_args()
    data=json.loads(MANIFEST.read_text(encoding="utf-8")); db=schema_columns(SCHEMA.read_text(encoding="utf-8")); errors=[]
    if data.get("layout_versao")!="planilha_ambulatorio_v1" or data.get("versao")!="v1": fail(errors,"versão obrigatória divergente")
    aliases=data.get("aliases_versionados",{})
    for group,expected in EXPECTED_ALIASES.items():
        if aliases.get(group)!=expected: fail(errors,f"aliases versionados divergentes: {group}")
    if aliases.get("comorbidades")!={}: fail(errors,"aliases de comorbidades não aprovados")
    if aliases.get("booleanos")!={"true":["sim","S","x","1","verdadeiro"],"false":["não","N","0","falso"]}: fail(errors,"aliases booleanos divergentes")
    if len(data.get("sheets",[]))!=2: fail(errors,"manifesto deve conter duas abas")
    all_keys=set(); physical={}; all_columns=[]
    for sheet in data.get("sheets",[]):
        cols=sheet.get("columns",[]); key=sheet.get("aba_chave"); physical[key]=cols; all_columns.extend(cols)
        if len(cols)!=sheet.get("quantidade_colunas"): fail(errors,f"{key}: quantidade declarada divergente")
        expected={"portadores":142,"nao_portadores":136}.get(key)
        if len(cols)!=expected: fail(errors,f"{key}: esperado {expected}, encontrado {len(cols)}")
        positions=[c.get("posicao_fisica") for c in cols]; orders=[c.get("ordem") for c in cols]
        if len(positions)!=len(set(positions)): fail(errors,f"{key}: posição física duplicada")
        if orders!=list(range(1,len(cols)+1)): fail(errors,f"{key}: ordem não contígua")
        headers=Counter(c.get("cabecalho_original","").strip() for c in cols)
        by_sem=defaultdict(list)
        for c in cols:
            missing=REQUIRED-set(c);
            if missing: fail(errors,f"{key}/{c.get('ordem')}: campos ausentes {sorted(missing)}")
            sem=c.get("chave_semantica"); all_keys.add(sem); by_sem[sem].append(c)
            if not sem or not re.fullmatch(r"[a-z0-9_]+",sem): fail(errors,f"{key}/{c.get('ordem')}: chave semântica inválida")
            repeated=headers[c.get("cabecalho_original","").strip()]>1 or sem=="eco"
            if repeated and not isinstance(c.get("ocorrencia"),int): fail(errors,f"{key}/{c.get('ordem')}: ocorrência ausente")
            if c.get("bloco_funcional") not in BLOCKS or c.get("tipo_semantico") not in TYPES: fail(errors,f"{key}/{c.get('ordem')}: tipo/bloco incompatível")
            table,field=c.get("tabela_destino"),c.get("campo_destino")
            if c.get("situacao_cobertura")=="excluido":
                if table or field or c.get("destino_atual"): fail(errors,f"{key}/{c.get('ordem')}: excluído com destino")
            elif table not in db or field not in db.get(table,set()): fail(errors,f"{key}/{c.get('ordem')}: destino inexistente {table}.{field}")
            if table and c.get("destino_atual")!=f"ambulatorio.{table}.{field}": fail(errors,f"{key}/{c.get('ordem')}: destino malformado")
        for sem,items in by_sem.items():
            if len(items)>1 and sem!="eco" and len({x["cabecalho_original"].strip() for x in items})==len(items): fail(errors,f"{key}: chave semântica duplicada indevida {sem}")
    if len(all_keys)!=133: fail(errors,f"esperadas 133 chaves após aliases dos 136 rótulos, encontradas {len(all_keys)}")
    by_sem=defaultdict(list)
    for c in all_columns: by_sem[c["chave_semantica"]].append(c)
    for sem,items in by_sem.items():
        if len({(x["destino_atual"],x["situacao_cobertura"]) for x in items})!=1: fail(errors,f"{sem}: destino ou cobertura contraditório entre abas/ocorrências")
    unique_headers={}
    for c in all_columns: unique_headers.setdefault(c["cabecalho_original"].strip(),c)
    coverage=Counter(c["situacao_cobertura"] for c in unique_headers.values())
    if coverage!={"direta":8,"com_transformacao":116,"parcial":11,"excluido":1}: fail(errors,f"cobertura final divergente: {dict(coverage)}")
    partial={c["chave_semantica"] for c in unique_headers.values() if c["situacao_cobertura"]=="parcial"}
    if partial!=EXPECTED_PARTIAL: fail(errors,f"parciais divergentes: {sorted(partial)}")
    destinations={c["chave_semantica"]:c["destino_atual"] for c in all_columns}
    if destinations.get("ambulatorio_unicamente")!="ambulatorio.atendimento.ambulatorio_unicamente": fail(errors,"destino inválido para ambulatorio_unicamente")
    if destinations.get("ambulatorio_anexo_ao_projeto")!="ambulatorio.atendimento.ambulatorio_anexo_projeto": fail(errors,"destino inválido para ambulatorio_anexo_ao_projeto")
    dumped=json.dumps(data,ensure_ascii=False)
    if re.search(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\b\d{8,}\b",dumped): fail(errors,"possível dado sensível encontrado")
    exam={"eco","laboratoriais","de_imagem","holter","endoscopia","colonoscopia","teste_ergometrico","mapa","outros"}
    for key,cols in physical.items():
        for sem in exam:
            found=[c for c in cols if c["chave_semantica"]==sem]
            if len(found)!=2 or {c["bloco_funcional"] for c in found}!={"trazido","solicitado"}: fail(errors,f"{key}: exame repetido inválido {sem}")
    if args.fonte:
        sys.path.insert(0,str(ROOT/"scripts")); from gerar_manifesto_planilha import read_headers
        observed=read_headers()
        for (_,name,headers),sheet in zip(observed,data["sheets"]):
            expected=[(c["posicao_fisica"],c["cabecalho_original"]) for c in sheet["columns"]]
            if name!=sheet["aba_nome_original"] or headers!=expected: fail(errors,f"{sheet['aba_chave']}: divergência do XLSX local")
    if errors:
        print("ERRO: manifesto inválido",file=sys.stderr); print("\n".join(f"- {e}" for e in errors),file=sys.stderr); return 1
    print("OK: manifesto planilha_ambulatorio_v1")
    print(f"OK: colunas por aba: {len(physical['portadores'])} e {len(physical['nao_portadores'])}")
    print(f"OK: {len(all_keys)} chaves semânticas distintas; destinos, repetições e segurança validados")
    return 0
if __name__=="__main__": raise SystemExit(main())

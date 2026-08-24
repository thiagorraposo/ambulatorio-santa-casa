#!/usr/bin/env python3
"""Importador sintético v1 orientado pelo manifesto físico versionado."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import unicodedata
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importador.psql import Database, literal  # noqa: E402
from importador.xlsx import read as read_xlsx  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "manifestos/planilha_ambulatorio_v1.json"


class RowConflict(Exception):
    pass


def normalized(value: str) -> str:
    value = unicodedata.normalize("NFKD", value.strip().lower())
    return " ".join("".join(c for c in value if not unicodedata.combining(c)).split())


def date_value(value: str | None, field: str, required=False):
    if value is None or not value.strip():
        if required:
            raise RowConflict(f"{field}: valor obrigatório ausente")
        return None
    try:
        return datetime.strptime(value.strip(), "%d/%m/%Y").date().isoformat()
    except ValueError:
        raise RowConflict(f"{field}: data inválida; esperado dd/mm/aaaa")


def bool_value(value: str | None, field: str):
    if value is None or not value.strip():
        return None
    token = normalized(value)
    if token in {"sim", "s", "x", "1", "verdadeiro"}:
        return True
    if token in {"nao", "n", "0", "falso"}:
        return False
    raise RowConflict(f"{field}: booleano inválido")


def number_value(value: str | None, field: str, integer=False):
    if value is None or not value.strip():
        return None
    token = value.strip().replace("%", "").replace(",", ".")
    try:
        number = Decimal(token)
        if integer and number != number.to_integral_value():
            raise InvalidOperation
        return int(number) if integer else number
    except InvalidOperation:
        raise RowConflict(f"{field}: número inválido")


def year_value(value, field):
    if value is None or not value.strip():
        return None
    if not re.fullmatch(r"[0-9]{4}", value.strip()):
        raise RowConflict(f"{field}: ano inválido")
    return int(value)


def bzn_duration(value):
    if value is None or not value.strip():
        return None
    match = re.fullmatch(r"\s*([1-9][0-9]*)\s*(dia|dias|semana|semanas)?\s*", normalized(value))
    if not match:
        raise RowConflict("por_quanto_tempo_foi_usado: duração ambígua")
    days = int(match.group(1))
    return days * 7 if match.group(2) in {"semana", "semanas"} else days


def raw_payload(columns, values):
    return [{"posicao": c["posicao_fisica"], "cabecalho": c["cabecalho_original"],
             "chave": c["chave_semantica"], "ocorrencia": c["ocorrencia"],
             "bloco": c["bloco_funcional"], "valor": values[i] if i < len(values) else None}
            for i, c in enumerate(columns)]


class Importer:
    def __init__(self, db, workbook_path, manifest, code):
        self.db, self.path, self.manifest, self.code = db, workbook_path, manifest, code
        self.book = read_xlsx(workbook_path)
        self.hash = hashlib.sha256(workbook_path.read_bytes()).hexdigest()
        self.lot_id = None
        self.pending = 0
        self.rejected = 0
        self.imported = 0
        self.portador_keys = set()

    def validate_layout(self):
        expected_names = [s["aba_nome_original"] for s in self.manifest["sheets"]]
        missing = [name for name in expected_names if name not in self.book]
        if missing:
            raise SystemExit("Layout incompatível: abas ausentes: " + ", ".join(missing))
        for sheet in self.manifest["sheets"]:
            rows = self.book[sheet["aba_nome_original"]]
            headers = [c["cabecalho_original"] for c in sheet["columns"]]
            actual = (rows[0] if rows else []) + [None] * len(headers)
            actual = actual[:len(headers)]
            if len(rows[0] if rows else []) != len(headers) or actual != headers:
                raise SystemExit(f"Layout incompatível na aba {sheet['aba_nome_original']}: cabeçalhos, ordem ou quantidade divergentes")

    def prepare_lot(self):
        version = self.manifest["layout_versao"]
        found = self.db.scalar(
            f"SELECT importacao_lote_id || '|' || status_lote FROM importacao_lote "
            f"WHERE hash_arquivo_sha256={literal(self.hash)} AND layout_versao={literal(version)} "
            "AND lote_reprocessado_de_id IS NULL")
        if found:
            lot, status = found.split("|", 1)
            self.lot_id = int(lot)
            if status in {"concluido", "concluido_com_pendencias"}:
                print(f"Lote {lot} já concluído; reexecução idempotente sem escrita.")
                return False
        else:
            self.lot_id = int(self.db.scalar(
                "INSERT INTO importacao_lote (codigo_lote,hash_arquivo_sha256,layout_versao,status_lote) "
                f"VALUES ({literal(self.code)},{literal(self.hash)},{literal(version)},'recebido') RETURNING importacao_lote_id"))
        self.db.run(f"UPDATE importacao_lote SET status_lote='validando', iniciado_em=COALESCE(iniciado_em,CURRENT_TIMESTAMP), "
                    f"mensagem_erro=NULL, atualizado_em=CURRENT_TIMESTAMP WHERE importacao_lote_id={self.lot_id}")
        return True

    def stage(self):
        for sheet in self.manifest["sheets"]:
            name, order = sheet["aba_nome_original"], sheet["aba_ordem"]
            for line_no, values in enumerate(self.book[name][1:], 2):
                values = values + [None] * (len(sheet["columns"]) - len(values))
                values = values[:len(sheet["columns"])]
                if not any(value is not None and str(value).strip() for value in values):
                    continue
                payload = json.dumps(raw_payload(sheet["columns"], values), ensure_ascii=False)
                responsible = next((values[i] for i,c in enumerate(sheet["columns"])
                                    if c["chave_semantica"] == "responsavel_pela_digitacao"), None)
                self.db.run("INSERT INTO importacao_linha "
                            "(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos,responsavel_digitacao_original) "
                            f"VALUES ({self.lot_id},{literal(name)},{order},{line_no},{literal(payload)}::jsonb,{literal(responsible)}) "
                            "ON CONFLICT (importacao_lote_id,aba_ordem,numero_linha) DO NOTHING")
        self.db.run(f"UPDATE importacao_lote SET status_lote='pronto', atualizado_em=CURRENT_TIMESTAMP WHERE importacao_lote_id={self.lot_id}")

    @staticmethod
    def row_map(columns, values):
        result = {}
        for i, column in enumerate(columns):
            key = column["chave_semantica"]
            compound = (key, column["ocorrencia"], column["bloco_funcional"])
            result[compound] = values[i] if i < len(values) else None
            result.setdefault(key, values[i] if i < len(values) else None)
        return result

    def provenance(self, line_id, table, record_id, action="criado"):
        self.db.run("INSERT INTO importacao_registro (importacao_linha_id,tabela_destino,registro_id,acao) "
                    f"VALUES ({line_id},{literal(table)},{record_id},{literal(action)}) ON CONFLICT DO NOTHING")

    def insert_returning(self, line_id, table, fields, action="criado"):
        names = ",".join(fields)
        values = ",".join(literal(v) for v in fields.values())
        pk = table + "_id"
        record_id = int(self.db.scalar(f"INSERT INTO {table} ({names}) VALUES ({values}) RETURNING {pk}"))
        self.provenance(line_id, table, record_id, action)
        return record_id

    def patient(self, line_id, row, group):
        name = (row.get("nome") or "").strip()
        if not name:
            raise RowConflict("nome: valor obrigatório ausente")
        birth = date_value(row.get("data_de_nascimento"), "data_de_nascimento", True)
        identity = (normalized(name), birth)
        candidates = self.db.run(f"SELECT paciente_id || E'\\t' || nome || E'\\t' || COALESCE(codigo_planilha,'') "
                                 f"FROM paciente WHERE data_nascimento={literal(birth)} ORDER BY paciente_id")
        candidates = [x.split("\t", 2) for x in candidates if normalized(x.split("\t",2)[1]) == identity[0]]
        if len(candidates) > 1:
            raise RowConflict("identidade: múltiplos pacientes candidatos")
        source_code = (row.get("id") or "").strip() or None
        if candidates:
            patient_id, _, existing_code = candidates[0]
            if source_code and existing_code and source_code != existing_code:
                raise RowConflict("identidade: ID auxiliar conflitante")
            self.provenance(line_id, "paciente", int(patient_id), "associado")
            return int(patient_id), identity
        fields = {"codigo_planilha": source_code, "nome": name, "data_nascimento": birth,
                  "grupo_origem_planilha": group}
        sex = row.get("sexo")
        if sex and sex.strip():
            aliases = {"f": "feminino", "feminino": "feminino", "m": "masculino", "masculino": "masculino",
                       "outro": "outro", "nao informado": "nao_informado"}
            fields["sexo"] = aliases.get(normalized(sex))
            if fields["sexo"] is None: raise RowConflict("sexo: domínio inválido")
        community = bool_value(row.get("pertence_a_comunidade_quilombola_ou_indigena"), "comunidade")
        fields["pertence_comunidade_tradicional"] = community
        kind = row.get("qual_indigena_ou_quilombola")
        if kind and kind.strip():
            kind_n = normalized(kind)
            if kind_n not in {"indigena", "quilombola"}: raise RowConflict("tipo de comunidade inválido")
            fields["tipo_comunidade_tradicional"] = kind_n
        if row.get("raca") and row["raca"].strip(): fields["raca"] = row["raca"].strip()
        return self.insert_returning(line_id, "paciente", fields), identity

    def projects(self, line_id, patient_id, row):
        aliases = self.manifest["aliases_versionados"]["projetos"]
        grouped = {}
        suffix = {"participa": "valor_original_participacao", "possui_pendencia": "valor_original_pendencia", "houve_falha": "valor_original_falha"}
        for source, project_code in aliases.items():
            value = row.get(source)
            if value is None or not value.strip(): continue
            field = "possui_pendencia" if source.endswith("_pendencia") else "houve_falha" if source.endswith("_falha") else "participa"
            grouped.setdefault(project_code, {})[field] = bool_value(value, source)
            grouped[project_code][suffix[field]] = value
        for code, fields in grouped.items():
            project = self.db.scalar(f"SELECT projeto_estudo_id FROM projeto_estudo WHERE codigo_projeto={literal(code)} AND ativo")
            if not project:
                raise RowConflict(f"catálogo de projeto inexistente: {code}")
            existing = self.db.scalar(f"SELECT paciente_projeto_estudo_id FROM paciente_projeto_estudo WHERE paciente_id={patient_id} AND projeto_estudo_id={project}")
            if existing:
                self.provenance(line_id, "paciente_projeto_estudo", int(existing), "associado")
            else:
                self.insert_returning(line_id, "paciente_projeto_estudo", {"paciente_id": patient_id, "projeto_estudo_id": int(project), **fields})

    def examination(self, line_id, patient_id, attendance_id, row):
        aliases = self.manifest["aliases_versionados"]["exames"]
        for compound, value in list(row.items()):
            if not isinstance(compound, tuple):
                continue
            key, occurrence, block = compound
            if occurrence not in {1, 2} or not value or not value.strip(): continue
            code = aliases[key]
            type_id = self.db.scalar(f"SELECT tipo_exame_complementar_id FROM tipo_exame_complementar WHERE codigo_exame={literal(code)} AND ativo")
            if not type_id: raise RowConflict(f"catálogo de exame inexistente: {code}")
            self.insert_returning(line_id, "paciente_exame_complementar", {"paciente_id":patient_id,"atendimento_id":attendance_id,
                "tipo_exame_complementar_id":int(type_id),"bloco_origem":block,"tipo_exame_original":key,
                "resultado_texto":value,"valor_original_resultado":value})
        groups = {
            "eletrocardiograma": {"trouxe_exame": ("ecg", bool_value), "solicitado_exame": ("ecg_solicitado", bool_value),
                                  "resumo_resultado": ("resultado_ecg", lambda v,f:v.strip()), "data_realizacao": ("data_do_ecg", date_value)},
            "laboratoriais": {"data_realizacao": ("data_do_exame_colesterol", date_value)},
        }
        created = {}
        for code, mapping in groups.items():
            fields = {}
            for dest, (source, converter) in mapping.items():
                value=row.get(source)
                if value and value.strip(): fields[dest]=converter(value,source)
            lab_sources = ["valor_da_glicemia","valor_de_colesterol_hdl","valor_de_colesterol_ldl","triglicerideos"] if code=="laboratoriais" else []
            if not fields and not any(row.get(x) and row[x].strip() for x in lab_sources): continue
            type_id=self.db.scalar(f"SELECT tipo_exame_complementar_id FROM tipo_exame_complementar WHERE codigo_exame={literal(code)} AND ativo")
            if not type_id: raise RowConflict(f"catálogo de exame inexistente: {code}")
            created[code]=self.insert_returning(line_id,"atendimento_exame_complementar",{"atendimento_id":attendance_id,"tipo_exame_complementar_id":int(type_id),"origem_exame":"registrado_planilha",**fields})
        lab=created.get("laboratoriais")
        for source,name in [("valor_da_glicemia","glicemia"),("valor_de_colesterol_hdl","colesterol_hdl"),("valor_de_colesterol_ldl","colesterol_ldl"),("triglicerideos","triglicerideos")]:
            value=row.get(source)
            if value and value.strip():
                self.insert_returning(line_id,"exame_complementar_resultado",{"atendimento_exame_complementar_id":lab,"nome_campo":name,"valor_numerico":number_value(value,source),"valor_original":value})

    def treatment(self, line_id, patient_id, attendance_id, row):
        sources = ["uso_do_benzonidazol_para_tratamento_da_dc","tratamento_pelo_ambulatorio","por_quanto_tempo_foi_usado",
                   "em_qual_ano_tomou_a_medicacao_benzonidazol","tem_indicacao_de_bzn","prescricao_do_bzn_data","se_nao_descreva_o_motivo","teve_reacao_adversa"]
        if not any(row.get(x) and row[x].strip() for x in sources): return
        mapping = {
          "iniciado": ("uso_do_benzonidazol_para_tratamento_da_dc", bool_value),
          "tratamento_pelo_ambulatorio": ("tratamento_pelo_ambulatorio", bool_value),
          "duracao_cumprida_dias": ("por_quanto_tempo_foi_usado", lambda v,f:bzn_duration(v)),
          "ano_uso_aproximado": ("em_qual_ano_tomou_a_medicacao_benzonidazol", year_value),
          "tem_indicacao": ("tem_indicacao_de_bzn", bool_value), "data_prescricao": ("prescricao_do_bzn_data", date_value),
          "motivo_nao_indicacao": ("se_nao_descreva_o_motivo", lambda v,f:v.strip()),
          "teve_reacao_adversa": ("teve_reacao_adversa", bool_value)}
        fields={"paciente_id":patient_id,"atendimento_id":attendance_id}
        for dest,(source,converter) in mapping.items():
            value=row.get(source)
            if value and value.strip():
                fields[dest]=converter(value,source)
                original="valor_original_"+{"iniciado":"inicio","tratamento_pelo_ambulatorio":"tratamento_ambulatorio","duracao_cumprida_dias":"duracao","ano_uso_aproximado":"ano_uso","tem_indicacao":"indicacao","data_prescricao":"data_prescricao","motivo_nao_indicacao":"motivo_nao_indicacao","teve_reacao_adversa":"reacao_adversa"}.get(dest,dest)
                fields[original]=value
        self.insert_returning(line_id,"tratamento_benzonidazol",fields)

    def referral(self, line_id, attendance_id, row):
        sources=["trouxe_encaminhamento","origem_encaminhamento","encaminhado_a_qual_projeto"]
        if not any(row.get(x) and row[x].strip() for x in sources): return
        fields={"atendimento_id":attendance_id}
        value=row.get("trouxe_encaminhamento")
        if value and value.strip(): fields.update(documento_apresentado=bool_value(value,"trouxe_encaminhamento"),valor_original_documento_apresentado=value)
        origin=row.get("origem_encaminhamento")
        if origin and origin.strip():
            accepted={"ambulatorio","projeto pesquisa","atencao basica","servico especializado","hospital","demanda espontanea","planilha","outro","nao informado"}
            token=normalized(origin)
            if token not in accepted: raise RowConflict("origem_encaminhamento: domínio inválido")
            fields.update(origem_encaminhamento=token.replace(" ","_"),valor_original_origem=origin)
        project_raw=row.get("encaminhado_a_qual_projeto")
        if project_raw and project_raw.strip():
            token=normalized(project_raw).replace(" ","_")
            code=self.manifest["aliases_versionados"]["projetos"].get(token,token)
            project=self.db.scalar(f"SELECT projeto_estudo_id FROM projeto_estudo WHERE codigo_projeto={literal(code)} AND ativo")
            if not project: raise RowConflict(f"catálogo de projeto inexistente: {project_raw}")
            fields.update(projeto_estudo_id=int(project),valor_original_projeto=project_raw)
        self.insert_returning(line_id,"encaminhamento",fields)

    def process_row(self, sheet, line_no, values):
        line_id=int(self.db.scalar(f"SELECT importacao_linha_id FROM importacao_linha WHERE importacao_lote_id={self.lot_id} AND aba_ordem={sheet['aba_ordem']} AND numero_linha={line_no}"))
        status=self.db.scalar(f"SELECT status_linha FROM importacao_linha WHERE importacao_linha_id={line_id}")
        if status in {"importada","importada_com_pendencia","rejeitada","ignorada"}: return
        row=self.row_map(sheet["columns"], values)
        self.db.run(f"UPDATE importacao_linha SET status_linha='processando', atualizado_em=CURRENT_TIMESTAMP WHERE importacao_linha_id={line_id}")
        try:
            attendance_date=date_value(row.get("data_do_atendimento"),"data_do_atendimento",True)
            name=(row.get("nome") or "").strip(); birth=date_value(row.get("data_de_nascimento"),"data_de_nascimento",True)
            identity=(normalized(name),birth)
            if sheet["aba_ordem"] == 2 and identity in self.portador_keys:
                raise RowConflict("conflito entre abas: prevalece Pacientes portadores de DC")
            amb_only=bool_value(row.get("ambulatorio_unicamente"),"ambulatorio_unicamente")
            amb_project=bool_value(row.get("ambulatorio_anexo_ao_projeto"),"ambulatorio_anexo_ao_projeto")
            if amb_only is True and amb_project is True: raise RowConflict("contexto do atendimento conflitante")
            self.db.run("BEGIN")
            patient_id, identity=self.patient(line_id,row,"portador_dc" if sheet["aba_ordem"]==1 else "nao_portador_dc")
            attendance_id=self.insert_returning(line_id,"atendimento",{"paciente_id":patient_id,"data_atendimento":attendance_date,
                "localizacao_prontuario":(row.get("localizacao_do_prontuario") or "").strip() or None,
                "ambulatorio_unicamente":amb_only,"ambulatorio_anexo_projeto":amb_project,
                "origem_registro":"planilha_portador_dc" if sheet["aba_ordem"]==1 else "planilha_nao_portador_dc",
                "observacoes":(row.get("observacao") or "").strip() or None})
            self.projects(line_id,patient_id,row)
            self.examination(line_id,patient_id,attendance_id,row)
            self.treatment(line_id,patient_id,attendance_id,row)
            self.referral(line_id,attendance_id,row)
            partial=[c["chave_semantica"] for c in sheet["columns"] if c["situacao_cobertura"]=="parcial" and row.get(c["chave_semantica"]) and row[c["chave_semantica"]].strip()]
            final="importada_com_pendencia" if partial else "importada"
            message=("campos preservados apenas em dados_brutos: "+", ".join(sorted(set(partial)))) if partial else "linha importada"
            self.db.run(f"UPDATE importacao_linha SET status_linha={literal(final)},mensagem_processamento={literal(message)},atualizado_em=CURRENT_TIMESTAMP WHERE importacao_linha_id={line_id}")
            self.db.run("COMMIT")
            if sheet["aba_ordem"]==1: self.portador_keys.add(identity)
            self.pending += bool(partial); self.imported += 1
        except RowConflict as exc:
            try: self.db.run("ROLLBACK")
            except RuntimeError: pass
            self.db.run(f"UPDATE importacao_linha SET status_linha='rejeitada',mensagem_processamento={literal(str(exc))},atualizado_em=CURRENT_TIMESTAMP WHERE importacao_linha_id={line_id}")
            self.rejected += 1
        except Exception as exc:
            try: self.db.run("ROLLBACK")
            except RuntimeError: pass
            self.db.run(f"UPDATE importacao_linha SET status_linha='rejeitada',mensagem_processamento={literal('falha atômica: '+str(exc))},atualizado_em=CURRENT_TIMESTAMP WHERE importacao_linha_id={line_id}")
            self.rejected += 1

    def run(self):
        self.validate_layout()
        if not self.prepare_lot(): return
        self.stage()
        self.db.run(f"UPDATE importacao_lote SET status_lote='processando', atualizado_em=CURRENT_TIMESTAMP WHERE importacao_lote_id={self.lot_id}")
        portador = self.manifest["sheets"][0]
        for values in self.book[portador["aba_nome_original"]][1:]:
            row = self.row_map(portador["columns"], values)
            try:
                name = (row.get("nome") or "").strip()
                birth = date_value(row.get("data_de_nascimento"), "data_de_nascimento", True)
                if name:
                    self.portador_keys.add((normalized(name), birth))
            except RowConflict:
                pass
        for sheet in self.manifest["sheets"]:
            for line_no, values in enumerate(self.book[sheet["aba_nome_original"]][1:],2):
                values=values+[None]*(len(sheet["columns"])-len(values)); values=values[:len(sheet["columns"])]
                if any(v is not None and str(v).strip() for v in values): self.process_row(sheet,line_no,values)
        counts=self.db.scalar(f"SELECT count(*) FILTER (WHERE status_linha='rejeitada') || '|' || count(*) FILTER (WHERE status_linha='importada_com_pendencia') FROM importacao_linha WHERE importacao_lote_id={self.lot_id}")
        rejected,pending=map(int,counts.split("|")); status="concluido_com_pendencias" if rejected or pending else "concluido"
        self.db.run(f"UPDATE importacao_lote SET status_lote={literal(status)},finalizado_em=CURRENT_TIMESTAMP,atualizado_em=CURRENT_TIMESTAMP WHERE importacao_lote_id={self.lot_id}")
        print(f"Lote {self.lot_id}: {status}; importadas={self.imported}, pendências={pending}, rejeitadas={rejected}")


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("arquivo",type=Path); parser.add_argument("--codigo-lote")
    parser.add_argument("--manifesto",type=Path,default=MANIFEST)
    parser.add_argument("--db-host",default=os.getenv("DB_HOST","localhost")); parser.add_argument("--db-port",default=os.getenv("DB_PORT","5432"))
    parser.add_argument("--db-user",default=os.getenv("DB_USER")); parser.add_argument("--db-name",default=os.getenv("DB_NAME"))
    args=parser.parse_args()
    if not args.db_user or not args.db_name: parser.error("DB_USER e DB_NAME são obrigatórios")
    manifest=json.loads(args.manifesto.read_text())
    code=args.codigo_lote or f"xlsx-{hashlib.sha256(args.arquivo.read_bytes()).hexdigest()[:16]}"
    with Database(args.db_host,args.db_port,args.db_user,args.db_name,os.getenv("PGPASSWORD")) as db:
        Importer(db,args.arquivo,manifest,code).run()


if __name__ == "__main__": main()

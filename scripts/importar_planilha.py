#!/usr/bin/env python3
"""Importador sintético v1 orientado pelo manifesto físico versionado."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
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
IMPORTER_VERSION = "1.4.0"


class RowConflict(Exception):
    pass


def validate_purpose(purpose, reprocess=False):
    """Valida a declaração antes de ler a fonte, conectar ou escrever no banco."""
    if purpose not in ("carga_inicial", "mesmo_conteudo", "revisao"):
        raise ValueError("finalidade_ausente_ou_invalida: declare carga_inicial, mesmo_conteudo ou revisao")
    if purpose == "revisao":
        raise ValueError("revisao_nao_suportada: reconciliação entre conteúdos ainda não implementada")
    if reprocess and purpose != "mesmo_conteudo":
        raise ValueError("finalidade_incompativel: --reprocessar exige --finalidade mesmo_conteudo")


def git_revision() -> str:
    revision = os.getenv("IMPORTER_GIT_REVISION")
    if revision and re.fullmatch(r"[0-9a-f]{7,40}", revision):
        return revision
    try:
        return subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, check=True,
            capture_output=True, text=True,
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def safe_log(event: str, **fields) -> None:
    """Emite somente eventos e métricas de allowlist, nunca valores de células."""
    allowed = {"event", "mode", "purpose", "lot_code", "lot_id", "layout_version",
               "manifest_version", "importer_version", "git_revision", "status",
               "total_rows", "valid_rows", "importable_rows", "pending_rows",
               "rejected_rows"}
    payload = {"event": event, **fields}
    print(json.dumps({k: v for k, v in payload.items() if k in allowed},
                     ensure_ascii=True, sort_keys=True), file=sys.stderr)


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
    token = value.strip()
    if not re.fullmatch(r"[+-]?(?:[0-9]+(?:[.,][0-9]+)?|[.,][0-9]+)", token):
        raise RowConflict(f"{field}: número inválido")
    token = token.replace(",", ".")
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


def domain_value(value, field, accepted):
    if value is None or not value.strip():
        return None
    token = normalized(value).replace(" ", "_")
    if token not in accepted:
        raise RowConflict(f"{field}: domínio inválido")
    return token


PK_FIELDS = {
    "paciente_endereco": "endereco_id",
    "paciente_contato": "contato_id",
}

PROMOTION_REGISTRY = {
    "pendencias_observacao": {
        "handler": "pending_note",
        "tables": {"pendencia_atendimento"},
        "anchor": "atendimento",
        "policy": "repeatable_by_provenance",
    },
}

NONCRITICAL_POLICY = {
    "catalogo_projeto_ausente": {
        "handler": "projects",
        "retry_handler": "retry_project_catalog",
        "table": "paciente_projeto_estudo",
        "anchor": "paciente",
    },
}

# Tabelas que materializam os 125 rótulos físicos com cobertura plena. A
# checagem é executada antes de qualquer escrita e impede regressão silenciosa.
HANDLED_TABLES = {
    "importacao_linha", "paciente", "paciente_endereco", "paciente_contato",
    "atendimento", "paciente_projeto_estudo", "diagnostico_chagas",
    "sorologia_chagas", "sorologia_solicitacao", "condicao_chagas",
    "complicacao_chagas", "paciente_comorbidade", "atendimento_medicamento",
    "paciente_exame_complementar", "atendimento_exame_complementar",
    "exame_complementar_resultado", "tratamento_benzonidazol",
    "encaminhamento", "dados_clinicos_atendimento", "evento_clinico",
    "dispositivo_implantado", "notificacao", "obito", "pendencia_atendimento",
}


class Importer:
    def __init__(self, db, workbook_path, manifest, code, reprocess=False, dry_run=False,
                 *, purpose=None):
        validate_purpose(purpose, reprocess)
        self.purpose = purpose
        self.db, self.path, self.manifest, self.code = db, workbook_path, manifest, code
        self.book = read_xlsx(workbook_path)
        self.hash = hashlib.sha256(workbook_path.read_bytes()).hexdigest()
        self.lot_id = None
        self.pending = 0
        self.rejected = 0
        self.imported = 0
        self.portador_keys = set()
        self.reprocess = reprocess
        self.dry_run = dry_run
        self.predecessor_id = None
        self.manifest_hash = hashlib.sha256(
            json.dumps(manifest, ensure_ascii=False, sort_keys=True,
                       separators=(",", ":")).encode()
        ).hexdigest()
        self.revision = git_revision()

    def validate_layout(self):
        canonical = {}
        by_key = {}
        for sheet in self.manifest["sheets"]:
            for column in sheet["columns"]:
                canonical.setdefault(column["cabecalho_original"].strip(), column)
                by_key.setdefault(column["chave_semantica"], []).append(column)
        full = [c for c in canonical.values() if c["situacao_cobertura"] in {"direta", "com_transformacao"}]
        unsupported = sorted({c["tabela_destino"] for c in full} - HANDLED_TABLES)
        if len(full) != 125 or unsupported:
            raise SystemExit(f"Cobertura incompatível: plenos={len(full)}, tabelas sem handler={unsupported}")
        for key, rule in PROMOTION_REGISTRY.items():
            columns = by_key.get(key, [])
            coverages = {c["situacao_cobertura"] for c in columns}
            tables = {c["tabela_destino"] for c in columns}
            if (not columns or not coverages <= {"direta", "com_transformacao"}
                    or tables != rule["tables"] or rule["anchor"] not in {"paciente", "atendimento"}
                    or rule["policy"] not in {"repeatable_by_provenance"}
                    or not callable(getattr(self, rule["handler"], None))):
                raise SystemExit(f"Registro de promoção incompatível: {key}")
        for code, rule in NONCRITICAL_POLICY.items():
            if (rule["table"] not in HANDLED_TABLES
                    or rule["anchor"] not in {"paciente", "atendimento"}
                    or not callable(getattr(self, rule["handler"], None))
                    or not callable(getattr(self, rule["retry_handler"], None))):
                raise SystemExit(f"Política não crítica incompatível: {code}")
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
            "ORDER BY importacao_lote_id DESC LIMIT 1")
        if self.purpose == "mesmo_conteudo" and not found:
            raise SystemExit("mesmo_conteudo_sem_lote: exige lote existente do mesmo hash e layout")
        if self.reprocess:
            if not found:
                raise SystemExit("Reprocessamento exige lote predecessor do mesmo conteúdo e layout")
            predecessor, _ = found.split("|", 1)
            self.predecessor_id = int(predecessor)
            self.lot_id = int(self.db.scalar(
                "INSERT INTO importacao_lote (codigo_lote,hash_arquivo_sha256,layout_versao,lote_reprocessado_de_id,status_lote,manifesto_sha256,importador_versao,revisao_git) "
                f"VALUES ({literal(self.code)},{literal(self.hash)},{literal(version)},{self.predecessor_id},'recebido',{literal(self.manifest_hash)},{literal(IMPORTER_VERSION)},{literal(self.revision)}) RETURNING importacao_lote_id"))
            found = "created"
        if found and found != "created":
            lot, status = found.split("|", 1)
            self.lot_id = int(lot)
            if status in {"concluido", "concluido_com_pendencias"}:
                safe_log("import_idempotent_noop", mode="dry-run" if self.dry_run else "apply",
                         purpose=self.purpose,
                         lot_code=self.code, lot_id=self.lot_id,
                         layout_version=version, importer_version=IMPORTER_VERSION,
                         git_revision=self.revision, status=status)
                return False
        elif not found:
            self.lot_id = int(self.db.scalar(
                "INSERT INTO importacao_lote (codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,manifesto_sha256,importador_versao,revisao_git) "
                f"VALUES ({literal(self.code)},{literal(self.hash)},{literal(version)},'recebido',{literal(self.manifest_hash)},{literal(IMPORTER_VERSION)},{literal(self.revision)}) RETURNING importacao_lote_id"))
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
        if table not in HANDLED_TABLES:
            raise RowConflict(f"proveniência: tabela não permitida: {table}")
        pk = PK_FIELDS.get(table, table + "_id")
        if not self.db.scalar(f"SELECT 1 FROM {table} WHERE {pk}={int(record_id)}"):
            raise RowConflict(f"proveniência: alvo inexistente: {table}")
        self.db.run("INSERT INTO importacao_registro (importacao_linha_id,tabela_destino,registro_id,acao) "
                    f"VALUES ({line_id},{literal(table)},{record_id},{literal(action)}) ON CONFLICT "
                    "(importacao_linha_id,schema_destino,tabela_destino,registro_id) DO UPDATE SET acao=EXCLUDED.acao")

    def insert_returning(self, line_id, table, fields, action="criado"):
        names = ",".join(fields)
        values = ",".join(literal(v) for v in fields.values())
        pk = PK_FIELDS.get(table, table + "_id")
        record_id = int(self.db.scalar(f"INSERT INTO {table} ({names}) VALUES ({values}) RETURNING {pk}"))
        self.provenance(line_id, table, record_id, action)
        return record_id

    def reconcile(self, line_id, table, record_id, incoming):
        """Preenche apenas NULL; igualdade associa; divergência nunca sobrescreve."""
        pk = PK_FIELDS.get(table, table + "_id")
        changed = False
        for field, value in incoming.items():
            if value is None:
                continue
            current = self.db.scalar(f"SELECT COALESCE({field}::text,'__NULL__') FROM {table} WHERE {pk}={record_id}")
            wanted = str(value).lower() if isinstance(value, bool) else str(value)
            if current == "__NULL__":
                self.db.run(f"UPDATE {table} SET {field}={literal(value)}, atualizado_em=CURRENT_TIMESTAMP WHERE {pk}={record_id}")
                changed = True
            elif field.startswith("valor_original_"):
                continue
            elif current != wanted and not (isinstance(value, bool) and current == ("t" if value else "f")):
                raise RowConflict(f"{table}.{field}: divergência consolidada")
        self.provenance(line_id, table, record_id, "atualizado" if changed else "associado")
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
            incoming = {"codigo_planilha": source_code, "grupo_origem_planilha": group}
            sex = row.get("sexo")
            if sex and sex.strip():
                incoming["sexo"] = domain_value(sex, "sexo", {"feminino", "masculino", "outro", "nao_informado"})
            community = row.get("pertence_a_comunidade_quilombola_ou_indigena")
            if community and community.strip(): incoming["pertence_comunidade_tradicional"] = bool_value(community, "comunidade")
            kind = row.get("qual_indigena_ou_quilombola")
            if kind and kind.strip(): incoming["tipo_comunidade_tradicional"] = domain_value(kind, "tipo_comunidade", {"indigena", "quilombola"})
            if row.get("raca") and row["raca"].strip(): incoming["raca"] = row["raca"].strip()
            current_group=self.db.scalar(f"SELECT COALESCE(grupo_origem_planilha,'') FROM paciente WHERE paciente_id={int(patient_id)}")
            promoted_group = False
            if group == "portador_dc" and current_group == "nao_portador_dc":
                self.db.run(f"UPDATE paciente SET grupo_origem_planilha='portador_dc',atualizado_em=CURRENT_TIMESTAMP WHERE paciente_id={int(patient_id)}")
                incoming.pop("grupo_origem_planilha")
                promoted_group = True
            self.reconcile(line_id, "paciente", int(patient_id), incoming)
            if promoted_group: self.provenance(line_id,"paciente",int(patient_id),"atualizado")
            return int(patient_id), identity
        fields = {"codigo_planilha": source_code, "nome": name, "data_nascimento": birth,
                  "grupo_origem_planilha": group}
        sex = row.get("sexo")
        if sex and sex.strip():
            fields["sexo"] = domain_value(sex, "sexo", {"feminino", "masculino", "outro", "nao_informado"})
        community = bool_value(row.get("pertence_a_comunidade_quilombola_ou_indigena"), "comunidade")
        fields["pertence_comunidade_tradicional"] = community
        kind = row.get("qual_indigena_ou_quilombola")
        if kind and kind.strip():
            kind_n = normalized(kind)
            if kind_n not in {"indigena", "quilombola"}: raise RowConflict("tipo de comunidade inválido")
            fields["tipo_comunidade_tradicional"] = kind_n
        if row.get("raca") and row["raca"].strip(): fields["raca"] = row["raca"].strip()
        return self.insert_returning(line_id, "paciente", fields), identity

    def address_contact(self, line_id, patient_id, row):
        address = (row.get("endereco") or "").strip() or None
        city = (row.get("cidade") or "").strip() or None
        phone = (row.get("telefone_de_contato") or "").strip() or None
        if address or city:
            self.insert_returning(line_id, "paciente_endereco", {"paciente_id": patient_id, "endereco": address, "cidade": city})
        if phone:
            self.insert_returning(line_id, "paciente_contato", {"paciente_id": patient_id, "telefone": phone})

    @staticmethod
    def noncritical_issue(code, subject):
        if code not in NONCRITICAL_POLICY:
            raise RowConflict(f"{code}: regra não classificada")
        return f"{code}:{subject}"

    def projects(self, line_id, patient_id, row, project_codes=None):
        aliases = self.manifest["aliases_versionados"]["projetos"]
        grouped = {}
        pending = []
        suffix = {"participa": "valor_original_participacao", "possui_pendencia": "valor_original_pendencia", "houve_falha": "valor_original_falha"}
        for source, project_code in aliases.items():
            if project_codes is not None and project_code not in project_codes:
                continue
            value = row.get(source)
            if value is None or not value.strip(): continue
            field = "possui_pendencia" if source.endswith("_pendencia") else "houve_falha" if source.endswith("_falha") else "participa"
            grouped.setdefault(project_code, {})[field] = bool_value(value, source)
            grouped[project_code][suffix[field]] = value
        for code, fields in grouped.items():
            project = self.db.scalar(f"SELECT projeto_estudo_id FROM projeto_estudo WHERE codigo_projeto={literal(code)} AND ativo")
            if not project:
                pending.append(self.noncritical_issue(
                    "catalogo_projeto_ausente", code))
                continue
            existing = self.db.scalar(f"SELECT paciente_projeto_estudo_id FROM paciente_projeto_estudo WHERE paciente_id={patient_id} AND projeto_estudo_id={project}")
            if existing:
                self.reconcile(line_id, "paciente_projeto_estudo", int(existing), fields)
            else:
                self.insert_returning(line_id, "paciente_projeto_estudo", {"paciente_id": patient_id, "projeto_estudo_id": int(project), **fields})
        return pending

    def retry_project_catalog(self, line_id, patient_id, row, project_code):
        aliases = self.manifest["aliases_versionados"]["projetos"]
        if (project_code not in set(aliases.values())
                or not any(code == project_code and row.get(source)
                           and row[source].strip()
                           for source, code in aliases.items())):
            return [self.noncritical_issue(
                "catalogo_projeto_ausente", project_code)]
        return self.projects(line_id, patient_id, row, {project_code})

    def diagnosis(self, line_id, attendance_id, row):
        sources = ["diagnostico_da_dc_por_sorologia", "resultado_final_da_sorologia",
                   "caso_seja_sorologia_metodo_1", "data_da_sorologia_01",
                   "caso_seja_sorologia_metodo_2", "data_sorologia_2",
                   "caso_seja_sorologia_metodo_3", "data_sorologia_3"]
        if any(row.get(x) and row[x].strip() for x in sources):
            fields = {"atendimento_id": attendance_id}
            raw = row.get("diagnostico_da_dc_por_sorologia")
            if raw and raw.strip():
                fields.update(possui_diagnostico_chagas=bool_value(raw, "diagnostico_da_dc_por_sorologia"), valor_original_diagnostico=raw)
            result = row.get("resultado_final_da_sorologia")
            if result and result.strip():
                fields.update(resultado_final=domain_value(result, "resultado_final_da_sorologia", {"positivo", "negativo", "inconclusivo", "indeterminado", "nao_informado"}), valor_original_resultado_final=result)
            diagnosis_id = self.insert_returning(line_id, "diagnostico_chagas", fields)
            for number, method_key, date_key in [(1,"caso_seja_sorologia_metodo_1","data_da_sorologia_01"),(2,"caso_seja_sorologia_metodo_2","data_sorologia_2"),(3,"caso_seja_sorologia_metodo_3","data_sorologia_3")]:
                method, date = row.get(method_key), row.get(date_key)
                if not ((method and method.strip()) or (date and date.strip())): continue
                values = {"diagnostico_chagas_id": diagnosis_id, "numero_metodo_planilha": number}
                if method and method.strip(): values.update(metodo_sorologico=method.strip(), valor_original_metodo=method)
                if date and date.strip(): values.update(data_resultado=date_value(date,date_key), valor_original_data=date)
                self.insert_returning(line_id, "sorologia_chagas", values)
        requested, requested_date = row.get("ou_solicitado_sorologia"), row.get("se_sim_data_solicitada")
        if (requested and requested.strip()) or (requested_date and requested_date.strip()):
            values = {"atendimento_id": attendance_id}
            if requested and requested.strip(): values.update(solicitada=bool_value(requested,"ou_solicitado_sorologia"),valor_original_solicitacao=requested)
            if requested_date and requested_date.strip(): values["data_solicitacao"] = date_value(requested_date,"se_sim_data_solicitada")
            self.insert_returning(line_id, "sorologia_solicitacao", values)

    def chagas_condition(self, line_id, attendance_id, row):
        form, classification = row.get("forma_da_dc"), row.get("classificacao_da_cardiopatia_chagasica")
        if (form and form.strip()) or (classification and classification.strip()):
            fields={"atendimento_id":attendance_id}
            if form and form.strip():
                fields.update(forma_clinica=domain_value(form,"forma_da_dc",{"indeterminada","cardiaca","digestiva","cardiodigestiva","aguda","cronica","nao_informado"}),valor_original_forma_clinica=form)
            if classification and classification.strip(): fields.update(classificacao_clinica=classification.strip(),valor_original_classificacao=classification)
            self.insert_returning(line_id,"condicao_chagas",fields)
        overall=row.get("complicacoes_relacionadas_a_dc")
        details=[("cardiaca","complicacoes_cardiacas_relacioadas_a_dc"),("digestiva","complicacoes_do_trato_digestivo_relacioadas_a_dc"),("outra","outras_complicacoes_relacionadas_a_dc_qual")]
        if overall and overall.strip():
            self.insert_returning(line_id,"complicacao_chagas",{"atendimento_id":attendance_id,"tipo_complicacao":"geral","possui_complicacao":bool_value(overall,"complicacoes_relacionadas_a_dc"),"valor_original_presenca":overall})
        for kind,key in details:
            value=row.get(key)
            if value and value.strip(): self.insert_returning(line_id,"complicacao_chagas",{"atendimento_id":attendance_id,"tipo_complicacao":kind,"descricao":value.strip(),"valor_original_tipo":key})

    def comorbidities(self, line_id, patient_id, attendance_id, row):
        keys=["comorbidades_nao_relacionadas_a_dc","hipertensao_arterial","diabetes","doenca_renal","doencas_psicologicas","doencas_do_sistema_cardiovascular","doencas_do_sistema_respiratorio","doencas_do_sistema_digestorio","doencas_do_sistema_nervoso","doencas_do_sistema_endocrino","doencas_do_sistema_imunologico","doencas_do_sistema_tegumentar","outras_doencas"]
        for key in keys:
            value=row.get(key)
            if not value or not value.strip(): continue
            matches=self.db.run(f"SELECT comorbidade_id FROM comorbidade WHERE ativo AND lower(btrim(nome_comorbidade))={literal(key)} ORDER BY comorbidade_id")
            if len(matches)!=1: raise RowConflict(f"comorbidade: catálogo não resolvido: {key}")
            present=bool_value(value,key)
            existing=self.db.scalar(f"SELECT paciente_comorbidade_id FROM paciente_comorbidade WHERE paciente_id={patient_id} AND comorbidade_id={int(matches[0])}")
            fields={"possui_comorbidade":present,"valor_original_comorbidade":value}
            if existing: self.reconcile(line_id,"paciente_comorbidade",int(existing),fields)
            else: self.insert_returning(line_id,"paciente_comorbidade",{"paciente_id":patient_id,"comorbidade_id":int(matches[0]),"atendimento_id":attendance_id,**fields})

    def medications(self, line_id, attendance_id, row):
        keys=["anti_hipertensivo","diureticos","anti_arritmicos","alfa_betabloqueador","anti_coagulantes","anti_depressivos","bloqueador_de_calcio","estatinas","hipoglicemiante","ieca_bra","inra","vasodilatador","outros_medicamentos"]
        aliases=self.manifest["aliases_versionados"]["medicamentos"]
        for key in keys:
            value=row.get(key)
            if not value or not value.strip(): continue
            fields={"atendimento_id":attendance_id,"tipo_registro":"registro_planilha","uso_atual":bool_value(value,key),"valor_original_medicamento":value}
            if key in aliases:
                found=self.db.scalar(f"SELECT medicamento_id FROM medicamento WHERE codigo_medicamento={literal(aliases[key])} AND ativo")
                if not found: raise RowConflict(f"medicamento: catálogo inexistente: {aliases[key]}")
                fields["medicamento_id"]=int(found)
            else: fields["nome_medicamento_livre"]=key
            self.insert_returning(line_id,"atendimento_medicamento",fields)

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
        feve=row.get("feve")
        if feve and feve.strip():
            type_id=self.db.scalar("SELECT tipo_exame_complementar_id FROM tipo_exame_complementar WHERE codigo_exame='ecocardiograma' AND ativo")
            if not type_id: raise RowConflict("catálogo de exame inexistente: ecocardiograma")
            exam_id=self.insert_returning(line_id,"atendimento_exame_complementar",{"atendimento_id":attendance_id,"tipo_exame_complementar_id":int(type_id),"origem_exame":"registrado_planilha"})
            token=feve.strip()
            if token.endswith("%"): token=token[:-1].strip()
            self.insert_returning(line_id,"exame_complementar_resultado",{"atendimento_exame_complementar_id":exam_id,"nome_campo":"FEVE","valor_numerico":number_value(token,"feve"),"unidade":"%","valor_original":feve})

    def clinical_data(self, line_id, attendance_id, row):
        mapping={"altura_cm":("altura",lambda v,f:number_value(v,f)*100),"peso_kg":("peso",number_value),"circunferencia_abdominal_cm":("circunferencia_abdominal",number_value),"frequencia_cardiaca_bpm":("frequencia_cardiaca",lambda v,f:number_value(v,f,True)),"pa_sistolica_mmhg":("pa_sistolica",lambda v,f:number_value(v,f,True)),"pa_diastolica_mmhg":("pa_diastolica",lambda v,f:number_value(v,f,True)),"nyha":("nyha",lambda v,f:domain_value(v,f,{"i","ii","iii","iv"}).upper())}
        sat=row.get("saturacao")
        fields={"atendimento_id":attendance_id}
        for dest,(source,converter) in mapping.items():
            value=row.get(source)
            if value and value.strip():
                fields[dest]=converter(value,source); fields["valor_original_"+source]=value
        if sat and sat.strip():
            token=sat.strip(); token=token[:-1].strip() if token.endswith("%") else token
            fields.update(saturacao_percentual=number_value(token,"saturacao"),valor_original_saturacao=sat)
        if len(fields)>1: self.insert_returning(line_id,"dados_clinicos_atendimento",fields)

    def events_devices(self, line_id, patient_id, row):
        avc, year=row.get("teve_avc"),row.get("ano_do_ultimo_avc")
        if (avc and avc.strip()) or (year and year.strip()):
            fields={"paciente_id":patient_id,"tipo_evento":"avc"}
            if avc and avc.strip(): fields.update(ocorreu=bool_value(avc,"teve_avc"),valor_original_ocorrencia=avc)
            if year and year.strip(): fields.update(ano_evento=year_value(year,"ano_do_ultimo_avc"),valor_original_data=year)
            self.insert_returning(line_id,"evento_clinico",fields)
        for key,kind in [("portador_de_cdi","cdi"),("portador_de_marcapasso","marcapasso")]:
            value=row.get(key)
            if not value or not value.strip(): continue
            incoming={"possui_dispositivo":bool_value(value,key),"valor_original_presenca":value}
            existing=self.db.scalar(f"SELECT dispositivo_implantado_id FROM dispositivo_implantado WHERE paciente_id={patient_id} AND tipo_dispositivo={literal(kind)}")
            if existing: self.reconcile(line_id,"dispositivo_implantado",int(existing),incoming)
            else: self.insert_returning(line_id,"dispositivo_implantado",{"paciente_id":patient_id,"tipo_dispositivo":kind,"valor_original_tipo":key,**incoming})

    def notification_death(self, line_id, patient_id, row):
        def consolidated(table, sources, fields):
            if not any(row.get(x) and row[x].strip() for x in sources): return
            existing=self.db.scalar(f"SELECT {table}_id FROM {table} WHERE paciente_id={patient_id}")
            if existing: self.reconcile(line_id,table,int(existing),fields)
            else: self.insert_returning(line_id,table,{"paciente_id":patient_id,**fields})
        nfields={}
        value=row.get("paciente_notificado")
        if value and value.strip(): nfields.update(paciente_notificado=bool_value(value,"paciente_notificado"),valor_original_notificado=value)
        number=row.get("numero_notificacao")
        if number and number.strip(): nfields.update(numero_notificacao=number.strip(),valor_original_numero=number)
        reason=row.get("caso_nao_justifique")
        if reason and reason.strip():
            if nfields.get("paciente_notificado") is not False: raise RowConflict("notificação: justificativa exige paciente_notificado=false")
            nfields.update(justificativa_nao_notificacao=reason.strip(),valor_original_justificativa=reason)
        consolidated("notificacao",["paciente_notificado","numero_notificacao","caso_nao_justifique"],nfields)
        ofields={}
        died=row.get("obito")
        if died and died.strip(): ofields.update(houve_obito=bool_value(died,"obito"),valor_original_obito=died)
        death_date=row.get("data_do_obito")
        if death_date and death_date.strip(): ofields.update(data_obito=date_value(death_date,"data_do_obito"),valor_original_data=death_date)
        cause=row.get("causa_do_obito")
        if cause and cause.strip(): ofields.update(causa_obito=cause.strip(),valor_original_causa=cause)
        consolidated("obito",["obito","data_do_obito","causa_do_obito"],ofields)

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
        fields={}
        for dest,(source,converter) in mapping.items():
            value=row.get(source)
            if value and value.strip():
                fields[dest]=converter(value,source)
                original="valor_original_"+{"iniciado":"inicio","tratamento_pelo_ambulatorio":"tratamento_ambulatorio","duracao_cumprida_dias":"duracao","ano_uso_aproximado":"ano_uso","tem_indicacao":"indicacao","data_prescricao":"data_prescricao","motivo_nao_indicacao":"motivo_nao_indicacao","teve_reacao_adversa":"reacao_adversa"}.get(dest,dest)
                fields[original]=value
        existing = self.db.scalar(
            "SELECT tratamento_benzonidazol_id FROM tratamento_benzonidazol "
            f"WHERE paciente_id={patient_id} FOR UPDATE")
        if existing:
            # O vínculo ao atendimento original (inclusive NULL) é preservado;
            # a nova linha aponta ao mesmo tratamento pela proveniência.
            self.reconcile(line_id, "tratamento_benzonidazol", int(existing), fields)
        else:
            self.insert_returning(line_id, "tratamento_benzonidazol",
                                  {"paciente_id": patient_id,
                                   "atendimento_id": attendance_id, **fields})

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

    def pending_note(self, line_id, attendance_id, row, promotion=False):
        original = row.get("pendencias_observacao")
        if not original or not original.strip():
            return
        fields = {"atendimento_id": attendance_id,
                  "descricao": original.strip(),
                  "valor_original_pendencia": original}
        if not promotion:
            self.insert_returning(line_id, "pendencia_atendimento", fields)
            return
        linked = self.db.run(
            "SELECT registro_id FROM importacao_registro "
            f"WHERE importacao_linha_id={line_id} "
            "AND tabela_destino='pendencia_atendimento' ORDER BY registro_id")
        if len(linked) > 1:
            raise RowConflict("promocao.pendencias_observacao: proveniência ambígua")
        if linked:
            record_id = int(linked[0])
            for field, value in fields.items():
                current = self.db.scalar(
                    f"SELECT COALESCE({field}::text,'__NULL__') "
                    "FROM pendencia_atendimento "
                    f"WHERE pendencia_atendimento_id={record_id}")
                if current == "__NULL__" or current != str(value):
                    raise RowConflict(
                        "promocao.pendencias_observacao: alvo existente divergente")
            self.provenance(line_id, "pendencia_atendimento", record_id, "associado")
            return
        existing = int(self.db.scalar(
            "SELECT count(*) FROM pendencia_atendimento "
            f"WHERE atendimento_id={attendance_id}"))
        if existing:
            raise RowConflict(
                "promocao.pendencias_observacao: destino repetível ambíguo")
        self.insert_returning(line_id, "pendencia_atendimento", fields)

    def predecessor_line(self, sheet, line_no):
        lot_id = self.predecessor_id
        visited = set()
        while lot_id:
            if lot_id in visited:
                raise RowConflict("reprocessamento: ciclo na cadeia de lotes")
            visited.add(lot_id)
            previous = self.db.scalar(
                "SELECT importacao_linha_id || E'\\t' || status_linha || E'\\t' || "
                "COALESCE(mensagem_processamento,'') "
                f"FROM importacao_linha WHERE importacao_lote_id={lot_id} "
                f"AND aba_ordem={sheet['aba_ordem']} AND numero_linha={line_no}")
            if previous:
                previous_line, status, message = previous.split("\t", 2)
                if status in {"importada", "importada_com_pendencia"}:
                    return lot_id, int(previous_line), status, message
            parent = self.db.scalar(
                "SELECT lote_reprocessado_de_id FROM importacao_lote "
                f"WHERE importacao_lote_id={lot_id}")
            lot_id = int(parent) if parent else None
        return None

    @staticmethod
    def pending_keys(sheet, row):
        return sorted({c["chave_semantica"] for c in sheet["columns"]
                       if c["situacao_cobertura"] == "parcial"
                       and row.get(c["chave_semantica"])
                       and row[c["chave_semantica"]].strip()})

    @staticmethod
    def noncritical_issues(message):
        for part in message.split(";"):
            key, separator, value = part.strip().partition("=")
            if separator and key == "nao_criticas":
                issues = set()
                invalid = False
                for item in value.split(","):
                    code, item_separator, subject = item.partition(":")
                    if (item_separator and code in NONCRITICAL_POLICY
                            and re.fullmatch(r"[a-z0-9_]+", subject)):
                        issues.add(item)
                    elif item:
                        invalid = True
                if invalid:
                    issues.add("integridade_politica_nao_critica")
                return sorted(issues)
        return []

    def finish_reused(self, line_id, status, predecessor_id, promoted=(),
                      pending=(), conflict=(), resolved=(), noncritical=()):
        parts = [f"reprocessamento: predecessor={predecessor_id}"]
        if promoted:
            parts.append("promovidas=" + ",".join(sorted(promoted)))
        if resolved:
            parts.append("resolvidas=" + ",".join(sorted(resolved)))
        if pending:
            parts.append("pendentes=" + ",".join(sorted(pending)))
        if noncritical:
            parts.append("nao_criticas=" + ",".join(sorted(noncritical)))
        if conflict:
            parts.append("conflitos=" + ",".join(sorted(conflict)))
        message = "; ".join(parts)
        self.db.run(
            f"UPDATE importacao_linha SET status_linha={literal(status)},"
            f"mensagem_processamento={literal(message)},atualizado_em=CURRENT_TIMESTAMP "
            f"WHERE importacao_linha_id={line_id}")

    def reuse_predecessor(self, line_id, sheet, line_no, row):
        if not self.predecessor_id:
            return False
        previous = self.predecessor_line(sheet, line_no)
        if not previous:
            return False
        predecessor_id, previous_line, status, previous_message = previous
        links = self.db.run(
            "SELECT tabela_destino || '|' || registro_id FROM importacao_registro "
            f"WHERE importacao_linha_id={previous_line} ORDER BY importacao_registro_id")
        valid_links = []
        anchors = {"paciente": set(), "atendimento": set()}
        integrity_error = not links
        for link in links:
            table, record_id_raw = link.split("|", 1)
            record_id = int(record_id_raw)
            if table not in HANDLED_TABLES:
                integrity_error = True
                continue
            pk = PK_FIELDS.get(table, table + "_id")
            if not self.db.scalar(f"SELECT 1 FROM {table} WHERE {pk}={record_id}"):
                integrity_error = True
                continue
            valid_links.append((table, record_id))
            if table in anchors:
                anchors[table].add(record_id)
        for table, record_id in valid_links:
            self.provenance(line_id, table, record_id, "associado")
        if any(len(values) != 1 for values in anchors.values()):
            integrity_error = True
        if integrity_error:
            self.finish_reused(line_id, "importada_com_pendencia", predecessor_id,
                               pending=("integridade_proveniencia",))
            return True
        if status == "importada":
            self.finish_reused(line_id, "importada", predecessor_id)
            return True

        promotable = sorted(key for key in PROMOTION_REGISTRY
                            if row.get(key) and row[key].strip())
        remaining = self.pending_keys(sheet, row)
        retry_issues = self.noncritical_issues(previous_message)
        if not promotable and not retry_issues:
            self.finish_reused(line_id, "importada_com_pendencia", predecessor_id,
                               pending=remaining)
            return True

        promoted = []
        resolved = []
        noncritical = []
        conflict = []
        self.db.run("SAVEPOINT resolucao_pendencias")
        try:
            for key in promotable:
                rule = PROMOTION_REGISTRY[key]
                anchor_id = next(iter(anchors[rule["anchor"]]))
                getattr(self, rule["handler"])(line_id, anchor_id, row, promotion=True)
                promoted.append(key)
            for issue in retry_issues:
                code, separator, subject = issue.partition(":")
                rule = NONCRITICAL_POLICY.get(code)
                if not separator or not subject or not rule:
                    noncritical.append(issue)
                    continue
                anchor_id = next(iter(anchors[rule["anchor"]]))
                retried = getattr(self, rule["retry_handler"])(
                    line_id, anchor_id, row, subject)
                if retried:
                    noncritical.extend(retried)
                else:
                    resolved.append(issue)
            self.db.run("RELEASE SAVEPOINT resolucao_pendencias")
        except RowConflict:
            self.db.run("ROLLBACK TO SAVEPOINT resolucao_pendencias")
            self.db.run("RELEASE SAVEPOINT resolucao_pendencias")
            conflict = sorted(set(promotable) | set(retry_issues))
            promoted = []
            resolved = []
            noncritical = retry_issues
        pending = sorted(set(remaining))
        final = "importada_com_pendencia" if pending or noncritical or conflict else "importada"
        self.finish_reused(line_id, final, predecessor_id, promoted, pending,
                           conflict, resolved, noncritical)
        return True

    def process_row(self, sheet, line_no, values):
        line_id=int(self.db.scalar(f"SELECT importacao_linha_id FROM importacao_linha WHERE importacao_lote_id={self.lot_id} AND aba_ordem={sheet['aba_ordem']} AND numero_linha={line_no}"))
        status=self.db.scalar(f"SELECT status_linha FROM importacao_linha WHERE importacao_linha_id={line_id}")
        if status in {"importada","importada_com_pendencia","rejeitada","ignorada"}: return
        row=self.row_map(sheet["columns"], values)
        self.db.run(f"UPDATE importacao_linha SET status_linha='processando', atualizado_em=CURRENT_TIMESTAMP WHERE importacao_linha_id={line_id}")
        try:
            name=(row.get("nome") or "").strip()
            birth=date_value(row.get("data_de_nascimento"),"data_de_nascimento",True)
            identity=(normalized(name),birth)
            self.db.transaction("BEGIN")
            if self.reuse_predecessor(line_id,sheet,line_no,row):
                self.db.transaction("COMMIT"); self.imported += 1
                if sheet["aba_ordem"]==1: self.portador_keys.add(identity)
                return
            attendance_date=date_value(row.get("data_do_atendimento"),"data_do_atendimento",True)
            if sheet["aba_ordem"] == 2 and identity in self.portador_keys:
                raise RowConflict("conflito entre abas: prevalece Pacientes portadores de DC")
            amb_only=bool_value(row.get("ambulatorio_unicamente"),"ambulatorio_unicamente")
            amb_project=bool_value(row.get("ambulatorio_anexo_ao_projeto"),"ambulatorio_anexo_ao_projeto")
            if amb_only is True and amb_project is True: raise RowConflict("contexto do atendimento conflitante")
            patient_id, identity=self.patient(line_id,row,"portador_dc" if sheet["aba_ordem"]==1 else "nao_portador_dc")
            attendance_id=self.insert_returning(line_id,"atendimento",{"paciente_id":patient_id,"data_atendimento":attendance_date,
                "localizacao_prontuario":(row.get("localizacao_do_prontuario") or "").strip() or None,
                "ambulatorio_unicamente":amb_only,"ambulatorio_anexo_projeto":amb_project,
                "origem_registro":"planilha_portador_dc" if sheet["aba_ordem"]==1 else "planilha_nao_portador_dc",
                "observacoes":(row.get("observacao") or "").strip() or None})
            noncritical=self.projects(line_id,patient_id,row)
            self.address_contact(line_id,patient_id,row)
            self.diagnosis(line_id,attendance_id,row)
            self.chagas_condition(line_id,attendance_id,row)
            self.comorbidities(line_id,patient_id,attendance_id,row)
            self.medications(line_id,attendance_id,row)
            self.examination(line_id,patient_id,attendance_id,row)
            self.clinical_data(line_id,attendance_id,row)
            self.events_devices(line_id,patient_id,row)
            self.notification_death(line_id,patient_id,row)
            self.treatment(line_id,patient_id,attendance_id,row)
            self.referral(line_id,attendance_id,row)
            self.pending_note(line_id,attendance_id,row)
            partial=self.pending_keys(sheet,row)
            final="importada_com_pendencia" if partial or noncritical else "importada"
            message_parts=[]
            if partial:
                message_parts.append("campos preservados apenas em dados_brutos: "+", ".join(sorted(set(partial))))
            if noncritical:
                message_parts.append("nao_criticas="+",".join(sorted(set(noncritical))))
            message="; ".join(message_parts) if message_parts else "linha importada"
            self.db.run(f"UPDATE importacao_linha SET status_linha={literal(final)},mensagem_processamento={literal(message)},atualizado_em=CURRENT_TIMESTAMP WHERE importacao_linha_id={line_id}")
            self.db.transaction("COMMIT")
            if sheet["aba_ordem"]==1: self.portador_keys.add(identity)
            self.pending += bool(partial or noncritical); self.imported += 1
        except RowConflict as exc:
            try: self.db.transaction("ROLLBACK")
            except RuntimeError: pass
            self.db.run(f"UPDATE importacao_linha SET status_linha='rejeitada',mensagem_processamento={literal(str(exc))},atualizado_em=CURRENT_TIMESTAMP WHERE importacao_linha_id={line_id}")
            self.rejected += 1
        except Exception as exc:
            try: self.db.transaction("ROLLBACK")
            except RuntimeError: pass
            self.db.run(f"UPDATE importacao_linha SET status_linha='pendente',mensagem_processamento='falha operacional; retomada necessária',atualizado_em=CURRENT_TIMESTAMP WHERE importacao_linha_id={line_id}")
            self.db.run(f"UPDATE importacao_lote SET status_lote='falhou',mensagem_erro='falha operacional durante processamento de linha',atualizado_em=CURRENT_TIMESTAMP WHERE importacao_lote_id={self.lot_id}")
            raise RuntimeError("falha operacional durante processamento de linha") from exc

    def quality_report(self):
        def catalog_issue(message):
            return ("catálogo" in message or any(
                part.strip().startswith("nao_criticas=")
                and "catalogo_" in part
                for part in message.split(";")))

        rows = self.db.run(
            "SELECT status_linha || '|' || COALESCE(mensagem_processamento,'') "
            f"FROM importacao_linha WHERE importacao_lote_id={self.lot_id} "
            "ORDER BY aba_ordem,numero_linha")
        statuses = [row.split("|", 1) for row in rows]
        messages = [message for _, message in statuses]
        rejected = sum(status == "rejeitada" for status, _ in statuses)
        pending = sum(status == "importada_com_pendencia" for status, _ in statuses)
        imported = sum(status in {"importada", "importada_com_pendencia"} for status, _ in statuses)
        invalid = sum(any(token in message for token in
                          ("inválid", "ambígua", "obrigatório ausente")) for message in messages)
        identity = sum(message.startswith("identidade:") for message in messages)
        between_sheets = sum(message.startswith("conflito entre abas:") for message in messages)
        catalogs = sum(catalog_issue(message) for message in messages)
        rejected_invalid = sum(status == "rejeitada" and any(
            token in message for token in ("inválid", "ambígua", "obrigatório ausente"))
            for status, message in statuses)
        rejected_catalogs = sum(status == "rejeitada" and catalog_issue(message)
            for status, message in statuses)
        other = max(0, rejected - rejected_invalid - identity
                    - between_sheets - rejected_catalogs)
        return {
            "schema": "ambulatorio.import-quality-report/v1",
            "mode": "dry-run" if self.dry_run else "apply",
            "purpose": self.purpose,
            "lot_code": self.code,
            "file_sha256": self.hash,
            "layout_version": self.manifest["layout_versao"],
            "manifest_version": str(self.manifest.get("versao", "unknown")),
            "manifest_sha256": self.manifest_hash,
            "importer_version": IMPORTER_VERSION,
            "git_revision": self.revision,
            "metrics": {
                "total_rows": len(statuses), "valid_rows": imported,
                "importable_rows": imported, "pending_rows": pending,
                "rejected_rows": rejected, "identity_conflicts": identity,
                "between_sheet_conflicts": between_sheets, "invalid_values": invalid,
                "unknown_catalogs": catalogs, "other_causes": other,
            },
        }

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
        report = self.quality_report()
        safe_log("import_finished", mode=report["mode"], lot_code=self.code,
                 purpose=self.purpose,
                 lot_id=self.lot_id, layout_version=report["layout_version"],
                 manifest_version=report["manifest_version"],
                 importer_version=IMPORTER_VERSION, git_revision=self.revision,
                 status=status, **{k: report["metrics"][k] for k in
                 ("total_rows", "valid_rows", "importable_rows", "pending_rows", "rejected_rows")})
        return report


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("arquivo",type=Path); parser.add_argument("--codigo-lote")
    parser.add_argument("--finalidade",action="append",metavar="FINALIDADE",
                        help="obrigatória uma vez: carga_inicial, mesmo_conteudo ou revisao (ainda bloqueada)")
    parser.add_argument("--reprocessar",action="store_true",help="cria novo lote ligado à execução imediatamente anterior do mesmo conteúdo/layout")
    parser.add_argument("--dry-run",action="store_true",help="executa o pipeline completo e desfaz todas as escritas")
    parser.add_argument("--quality-report",type=Path,help="grava relatório JSON determinístico")
    parser.add_argument("--manifesto",type=Path,default=MANIFEST)
    parser.add_argument("--db-host",default=os.getenv("DB_HOST","localhost")); parser.add_argument("--db-port",default=os.getenv("DB_PORT","5432"))
    parser.add_argument("--db-user",default=os.getenv("DB_USER")); parser.add_argument("--db-name",default=os.getenv("DB_NAME"))
    parser.add_argument("--db-role",default=os.getenv("DB_ROLE"),help="role sem login assumida após conectar")
    args=parser.parse_args(argv)
    if not args.finalidade:
        parser.error("finalidade_ausente: informe --finalidade")
    if len(args.finalidade) != 1:
        parser.error("finalidade_ambigua: informe --finalidade apenas uma vez")
    purpose=args.finalidade[0]
    try:
        validate_purpose(purpose,args.reprocessar)
    except ValueError as exc:
        parser.error(str(exc))
    if not args.db_user or not args.db_name: parser.error("DB_USER e DB_NAME são obrigatórios")
    manifest=json.loads(args.manifesto.read_text())
    code=args.codigo_lote or f"xlsx-{hashlib.sha256(args.arquivo.read_bytes()).hexdigest()[:16]}"
    safe_log("import_started", mode="dry-run" if args.dry_run else "apply",
             purpose=purpose,
             lot_code=code, layout_version=manifest["layout_versao"],
             manifest_version=str(manifest.get("versao", "unknown")),
             importer_version=IMPORTER_VERSION, git_revision=git_revision())
    with Database(args.db_host,args.db_port,args.db_user,args.db_name,
                  os.getenv("PGPASSWORD"), rollback_only=args.dry_run,
                  role=args.db_role) as db:
        report=Importer(db,args.arquivo,manifest,code,args.reprocessar,args.dry_run,
                        purpose=purpose).run()
        if report:
            rendered=json.dumps(report,ensure_ascii=True,indent=2,sort_keys=True)+"\n"
            if args.quality_report: args.quality_report.write_text(rendered)
            else: print(rendered,end="")


if __name__ == "__main__": main()

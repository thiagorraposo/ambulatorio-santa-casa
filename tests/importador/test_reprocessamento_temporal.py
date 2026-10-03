#!/usr/bin/env python3
"""F13: o importador real não restaura uma fonte superada por revisão aprovada."""

import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from importar_planilha import IMPORTER_VERSION, raw_payload  # noqa: E402
from importador.psql import Database, literal  # noqa: E402
from gerar_planilha_sintetica import row, sheet_xml  # noqa: E402

MANIFEST = json.loads((ROOT / "manifestos/planilha_ambulatorio_v1.json").read_text())
ORIGINAL = ROOT / "tests/fixtures/planilha_importacao_v1_sintetica.xlsx"


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(value):
    return hashlib.sha256(value.encode()).hexdigest()


def workbook(path, appointment):
    columns = MANIFEST["sheets"][0]["columns"]
    values = row(columns, data_do_atendimento=appointment, id="F13-SINT",
                 nome="Paciente Temporal Sintético", data_de_nascimento="01/01/1990")
    updated = sheet_xml([[c["cabecalho_original"] for c in columns], values]).encode()
    empty = sheet_xml([[c["cabecalho_original"] for c in MANIFEST["sheets"][1]["columns"]]]).encode()
    with ZipFile(ORIGINAL) as source, ZipFile(path, "w") as target:
        for entry in source.infolist():
            content = source.read(entry.filename)
            if entry.filename == "xl/worksheets/sheet1.xml":
                content = updated
            elif entry.filename == "xl/worksheets/sheet2.xml":
                content = empty
            target.writestr(entry, content)
    return values


def envelope(value):
    return {"estado": "valor", "valor": value, "tipo_sql": "date",
            "precisao": "data_completa", "serializacao_versao": "v1"}


def importer(path, code, *, reprocess=False):
    command = [sys.executable, str(ROOT / "scripts/importar_planilha.py"), str(path),
               "--codigo-lote", code, "--finalidade", "mesmo_conteudo" if reprocess else "carga_inicial",
               "--db-host", os.environ["DB_HOST"], "--db-port", os.environ["DB_PORT"],
               "--db-user", os.environ["F13_IMPORT_USER"], "--db-name", os.environ["F13_DB_NAME"]]
    if reprocess:
        command.append("--reprocessar")
    env = {**os.environ, "PGPASSWORD": os.environ["F13_IMPORT_PASSWORD"]}
    return subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True)


def main():
    with tempfile.TemporaryDirectory(prefix="ambulatorio-f13-") as directory:
        base_path = Path(directory) / "base.xlsx"
        revised_path = Path(directory) / "revisada.xlsx"
        workbook(base_path, "01/01/2026")
        revised_values = workbook(revised_path, "02/01/2026")
        assert hashlib.sha256(base_path.read_bytes()).digest() != hashlib.sha256(revised_path.read_bytes()).digest()
        db_args = (os.environ["DB_HOST"], os.environ["DB_PORT"],
                   os.environ["DB_USER"], os.environ["F13_DB_NAME"], os.getenv("PGPASSWORD"))
        with Database(*db_args) as db:
            field = int(db.scalar("SELECT campo_id FROM auditoria_campo "
                "WHERE tabela_destino='atendimento' AND coluna_destino='data_atendimento' "
                "AND captura_desde IS NOT NULL"))
            actor = int(db.scalar("INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) "
                "VALUES ('Revisor F13 Sintético','revisor-f13@sintetico.invalid',"
                "'$2b$10$hash_sintetico_sem_senha_real','administracao') RETURNING usuario_id"))
            db.run(f"INSERT INTO importacao_revisao_gestor(usuario_id) VALUES({actor})")

        first = importer(base_path, "f13-base")
        assert first.returncode == 0, first.stderr
        manifest_bytes = canonical(MANIFEST)
        transform = {"formato": "revisao-transformacoes/v1", "regras": [
            {"chave": "data_do_atendimento", "bloco": "geral", "ocorrencia": 1,
             "tabela": "atendimento", "coluna": "data_atendimento", "transformacao": "data_dd_mm_aaaa"}]}
        transform_bytes = canonical(transform)
        with Database(*db_args) as db:
            db.run("BEGIN")
            base = int(db.scalar("SELECT importacao_lote_id FROM importacao_lote WHERE codigo_lote='f13-base'"))
            base_line = int(db.scalar(f"SELECT importacao_linha_id FROM importacao_linha WHERE importacao_lote_id={base}"))
            attendance = int(db.scalar("SELECT registro_id FROM importacao_registro "
                f"WHERE importacao_linha_id={base_line} AND tabela_destino='atendimento'"))
            patient = int(db.scalar("SELECT registro_id FROM importacao_registro "
                f"WHERE importacao_linha_id={base_line} AND tabela_destino='paciente'"))
            db.run("INSERT INTO revisao_artefato(sha256,tipo,versao,conteudo) VALUES "
                   f"({literal(sha(manifest_bytes))},'manifesto',{literal(MANIFEST['versao'])},{literal(manifest_bytes)}),"
                   f"({literal(sha(transform_bytes))},'transformacoes','f13-v1',{literal(transform_bytes)})")
            revised = int(db.scalar("INSERT INTO importacao_lote "
                "(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,manifesto_sha256,importador_versao,revisao_git) "
                f"VALUES ('f13-revisado',{literal(hashlib.sha256(revised_path.read_bytes()).hexdigest())},"
                f"{literal(MANIFEST['layout_versao'])},'pronto',{literal(sha(manifest_bytes))},{literal(IMPORTER_VERSION)},'abcdef0') "
                "RETURNING importacao_lote_id"))
            sheet = MANIFEST["sheets"][0]
            revised_raw = raw_payload(sheet["columns"], revised_values)
            revised_line = int(db.scalar("INSERT INTO importacao_linha "
                "(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos) "
                f"VALUES ({revised},{literal(sheet['aba_nome_original'])},1,2,"
                f"{literal(json.dumps(revised_raw, ensure_ascii=False))}::jsonb) RETURNING importacao_linha_id"))
            db.run("SET LOCAL ROLE ambulatorio_servico_autenticado")
            db.run(f"SELECT auditoria_iniciar_aplicacao({actor})")
            db.run("SET LOCAL ROLE ambulatorio_revisao_gestor")
            source = int(db.scalar(f"SELECT revisao_registrar_fonte('f13-fonte-sintetica',{base})"))
            authorization = int(db.scalar(f"SELECT revisao_conceder_autorizacao({source},{actor})"))
            db.run("SET LOCAL ROLE ambulatorio_revisao_servico")
            revision = int(db.scalar(f"SELECT revisao_preparar({source},{base},{revised},"
                                     f"{literal(sha(transform_bytes))},{authorization})"))
            plan = [{"campoId": field, "registroId": attendance, "alvoChave": "atendimento",
                     "chaveSemantica": "data_do_atendimento", "blocoFuncional": "geral", "ocorrencia": 1,
                     "categoria": "correcao_ocorrencia", "operacao": "definir",
                     "base": envelope("2026-01-01"), "proposto": envelope("2026-01-02")}]
            decision = int(db.scalar("SELECT revisao_publicar_decisao "
                f"({revision},{revised_line},{base_line},{patient},{attendance},{authorization},"
                f"'autorizar','Correcao temporal sintetica F13',{literal(json.dumps(plan))}::jsonb)"))
            db.run("COMMIT")
            db.run("BEGIN")
            db.run("SET LOCAL ROLE ambulatorio_servico_autenticado")
            db.run(f"SELECT auditoria_iniciar_aplicacao({actor})")
            db.run("RESET ROLE")
            applied = db.scalar(f"SELECT revisao_aplicar_decisao_interna({decision},{authorization})->>'resultado'")
            assert applied == "aplicada", applied
            db.run("COMMIT")
            db.run("BEGIN")
            db.run("SET LOCAL ROLE ambulatorio_servico_autenticado")
            db.run(f"SELECT auditoria_iniciar_aplicacao({actor})")
            db.run("RESET ROLE")
            finished = db.scalar(f"SELECT revisao_terminar_interna({revision},{authorization},'encerrar')")
            assert finished in {"concluida", "concluida_com_pendencias"}, finished
            db.run("COMMIT")
            before = db.scalar(f"SELECT data_atendimento::text || '|' || "
                f"(SELECT count(*) FROM atendimento WHERE paciente_id={patient}) || '|' || "
                f"(SELECT count(*) FROM auditoria_campo_evento WHERE campo_id={field} AND registro_id={attendance}) "
                f"FROM atendimento WHERE atendimento_id={attendance}")
            assert before.startswith("2026-01-02|1|"), before

        repeated = importer(base_path, "f13-reprocessado", reprocess=True)
        assert repeated.returncode != 0, repeated.stdout
        assert "importacao_conteudo_superado" in repeated.stderr, repeated.stderr
        assert "Paciente Temporal Sintético" not in repeated.stderr
        with Database(*db_args) as db:
            after = db.scalar(f"SELECT data_atendimento::text || '|' || "
                f"(SELECT count(*) FROM atendimento WHERE paciente_id={patient}) || '|' || "
                f"(SELECT count(*) FROM auditoria_campo_evento WHERE campo_id={field} AND registro_id={attendance}) "
                f"FROM atendimento WHERE atendimento_id={attendance}")
            assert after == before, (before, after)
            assert db.scalar("SELECT status_lote FROM importacao_lote WHERE codigo_lote='f13-reprocessado'") == "falhou"
            assert db.scalar("SELECT count(*) FROM importacao_registro r JOIN importacao_linha l "
                             "USING(importacao_linha_id) JOIN importacao_lote b USING(importacao_lote_id) "
                             "WHERE b.codigo_lote='f13-reprocessado'") == "0"
        print("OK: F13 Python real recusou fonte antiga após correção aprovada; estado clínico preservado")


if __name__ == "__main__":
    main()

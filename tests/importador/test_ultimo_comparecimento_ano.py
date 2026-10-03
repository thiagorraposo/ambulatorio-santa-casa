#!/usr/bin/env python3
"""D8 no escritor Python e na revisão temporal, em banco E2E descartável."""

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
KIND = "ultimo_comparecimento_ano_informado"


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(value):
    return hashlib.sha256(value.encode()).hexdigest()


def workbook(path, year):
    first, second = MANIFEST["sheets"]
    valid = row(second["columns"], id="D8-ANO-SINT", nome="Ano D8 Sintético",
                data_de_nascimento="01/01/1990", data_do_atendimento="01/01/2026",
                retorno_anual_realizado=year)
    ambiguous = row(second["columns"], id="D8-AMB-SINT", nome="Ambíguo D8 Sintético",
                    data_de_nascimento="02/01/1990", data_do_atendimento="02/01/2026",
                    retorno_anual_realizado="2023 ou 2024")
    sheets = (
        sheet_xml([[c["cabecalho_original"] for c in first["columns"]]]).encode(),
        sheet_xml([[c["cabecalho_original"] for c in second["columns"]], valid, ambiguous]).encode(),
    )
    with ZipFile(ORIGINAL) as source, ZipFile(path, "w") as target:
        for entry in source.infolist():
            content = source.read(entry.filename)
            if entry.filename == "xl/worksheets/sheet1.xml":
                content = sheets[0]
            elif entry.filename == "xl/worksheets/sheet2.xml":
                content = sheets[1]
            target.writestr(entry, content)
    return valid


def importer(path, code, *, reprocess=False):
    command = [sys.executable, str(ROOT / "scripts/importar_planilha.py"), str(path),
               "--codigo-lote", code, "--finalidade",
               "mesmo_conteudo" if reprocess else "carga_inicial",
               "--db-host", os.environ["DB_HOST"], "--db-port", os.environ["DB_PORT"],
               "--db-user", os.environ["D8_IMPORT_USER"], "--db-role", "ambulatorio_importador",
               "--db-name", os.environ["D8_DB_NAME"]]
    if reprocess:
        command.append("--reprocessar")
    env = {**os.environ, "PGPASSWORD": os.environ["D8_IMPORT_PASSWORD"]}
    return subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True)


def envelope(year):
    return {"estado": "valor", "valor": year, "tipo_sql": "integer",
            "precisao": "ano", "serializacao_versao": "v1"}


def assert_import_ok(result):
    assert result.returncode == 0, result.stderr


def main():
    assert os.environ["DB_PORT"] == "55457", "D8 exige a porta do banco descartável"
    assert os.environ["D8_DB_NAME"].endswith("_importador_test")
    db_args = (os.environ["DB_HOST"], os.environ["DB_PORT"],
               os.environ["DB_USER"], os.environ["D8_DB_NAME"], os.getenv("PGPASSWORD"))
    with tempfile.TemporaryDirectory(prefix="ambulatorio-d8-") as directory:
        base_path = Path(directory) / "base.xlsx"
        revised_path = Path(directory) / "revisada.xlsx"
        workbook(base_path, "2023")
        revised_values = workbook(revised_path, "2022")
        assert hashlib.sha256(base_path.read_bytes()).digest() != hashlib.sha256(revised_path.read_bytes()).digest()

        # A captura clínica é seletiva: habilita o campo desta decisão antes
        # de gravar a fonte para existir um histórico atribuível ao importador.
        with Database(*db_args) as db:
            existing_field = db.scalar("SELECT campo_id FROM auditoria_campo "
                "WHERE tabela_destino='evento_clinico' AND coluna_destino='ano_evento' "
                "AND captura_desde IS NOT NULL")
            field = int(existing_field or db.scalar("INSERT INTO auditoria_campo "
                "(tabela_destino,coluna_destino,coluna_pk,tipo_sql,serializacao_versao,captura_desde) "
                "VALUES ('evento_clinico','ano_evento','evento_clinico_id','integer','v1',clock_timestamp()) "
                "RETURNING campo_id"))

        assert_import_ok(importer(base_path, "d8-base"))
        with Database(*db_args) as db:
            lot = int(db.scalar("SELECT importacao_lote_id FROM importacao_lote WHERE codigo_lote='d8-base'"))
            line = int(db.scalar(f"SELECT importacao_linha_id FROM importacao_linha WHERE importacao_lote_id={lot} AND aba_ordem=2 AND numero_linha=2"))
            ambiguous_line = int(db.scalar(f"SELECT importacao_linha_id FROM importacao_linha WHERE importacao_lote_id={lot} AND aba_ordem=2 AND numero_linha=3"))
            patient = int(db.scalar("SELECT registro_id FROM importacao_registro "
                                    f"WHERE importacao_linha_id={line} AND tabela_destino='paciente'"))
            attendance = int(db.scalar("SELECT registro_id FROM importacao_registro "
                                       f"WHERE importacao_linha_id={line} AND tabela_destino='atendimento'"))
            event = int(db.scalar("SELECT registro_id FROM importacao_registro "
                                  f"WHERE importacao_linha_id={line} AND tabela_destino='evento_clinico'"))
            assert db.scalar(f"SELECT ano_evento::text || '|' || valor_original_data || '|' || "
                             f"COALESCE(ocorreu::text,'null') FROM evento_clinico WHERE evento_clinico_id={event} "
                             f"AND paciente_id={patient} AND tipo_evento={literal(KIND)}") == "2023|2023|null"
            assert db.scalar(f"SELECT count(*) FROM atendimento WHERE paciente_id={patient}") == "1"
            assert db.scalar(f"SELECT data_atendimento::text FROM atendimento WHERE atendimento_id={attendance}") == "2026-01-01"
            assert db.scalar(f"SELECT count(*) FROM acompanhamento_cuidado WHERE atendimento_id={attendance}") == "0"
            assert db.scalar(f"SELECT count(*) FROM evento_clinico WHERE paciente_id={patient} AND tipo_evento={literal(KIND)}") == "1"
            assert db.scalar(f"SELECT status_linha FROM importacao_linha WHERE importacao_linha_id={line}") == "importada"
            assert db.scalar(f"SELECT count(*) FROM auditoria_campo_evento WHERE campo_id={field} "
                             f"AND registro_id={event} AND origem='importacao' AND importacao_linha_id={line}") == "1"
            assert db.scalar("SELECT count(*) FROM evento_clinico e JOIN importacao_registro r "
                             "ON r.tabela_destino='paciente' AND r.registro_id=e.paciente_id "
                             f"WHERE r.importacao_linha_id={ambiguous_line} AND e.tipo_evento={literal(KIND)}") == "0"
            assert db.scalar("SELECT count(*) FROM acompanhamento_cuidado a JOIN importacao_registro r "
                             "ON r.tabela_destino='atendimento' AND r.registro_id=a.atendimento_id "
                             f"WHERE r.importacao_linha_id={ambiguous_line}") == "0"
            for source_line, original in ((line, "2023"), (ambiguous_line, "2023 ou 2024")):
                assert db.scalar("SELECT item->>'valor' FROM importacao_linha l "
                                 "CROSS JOIN LATERAL jsonb_array_elements(l.dados_brutos) item "
                                 f"WHERE l.importacao_linha_id={source_line} "
                                 "AND item->>'chave'='retorno_anual_realizado'") == original
            assert db.scalar(f"SELECT status_linha FROM importacao_linha WHERE importacao_linha_id={ambiguous_line}") == "importada_com_pendencia"

        # Mesmo hash concluído é no-op; a reexecução explícita associa o alvo já comprovado.
        assert_import_ok(importer(base_path, "d8-noop"))
        assert_import_ok(importer(base_path, "d8-reprocessado", reprocess=True))
        with Database(*db_args) as db:
            assert db.scalar(f"SELECT count(*) FROM evento_clinico WHERE paciente_id={patient} AND tipo_evento={literal(KIND)}") == "1"
            assert db.scalar(f"SELECT count(*) FROM atendimento WHERE paciente_id={patient}") == "1"
            assert db.scalar("SELECT count(*) FROM importacao_registro r JOIN importacao_linha l "
                             "USING(importacao_linha_id) JOIN importacao_lote b USING(importacao_lote_id) "
                             f"WHERE b.codigo_lote='d8-reprocessado' AND r.tabela_destino='evento_clinico' AND r.registro_id={event}") == "1"

        manifest_bytes = canonical(MANIFEST)
        transform = {"formato": "revisao-transformacoes/v1", "regras": [
            {"chave": "retorno_anual_realizado", "bloco": "geral", "ocorrencia": 1,
             "tabela": "evento_clinico", "coluna": "ano_evento", "transformacao": "ano"}]}
        transform_bytes = canonical(transform)
        with Database(*db_args) as db:
            actor = int(db.scalar("INSERT INTO usuario_aplicacao(nome,login,senha_hash,perfil) "
                "VALUES ('Revisor D8 Sintético','revisor-d8@sintetico.invalid',"
                "'$2b$10$hash_sintetico_sem_senha_real','administracao') RETURNING usuario_id"))
            db.run(f"INSERT INTO importacao_revisao_gestor(usuario_id) VALUES({actor})")
            db.run("BEGIN")
            db.run("INSERT INTO revisao_artefato(sha256,tipo,versao,conteudo) VALUES "
                   f"({literal(sha(manifest_bytes))},'manifesto',{literal(MANIFEST['versao'])},{literal(manifest_bytes)}),"
                   f"({literal(sha(transform_bytes))},'transformacoes','d8-v1',{literal(transform_bytes)}) "
                   "ON CONFLICT (sha256) DO NOTHING")
            revised_lot = int(db.scalar("INSERT INTO importacao_lote "
                "(codigo_lote,hash_arquivo_sha256,layout_versao,status_lote,manifesto_sha256,importador_versao,revisao_git) "
                f"VALUES ('d8-revisado',{literal(hashlib.sha256(revised_path.read_bytes()).hexdigest())},"
                f"{literal(MANIFEST['layout_versao'])},'pronto',{literal(sha(manifest_bytes))},{literal(IMPORTER_VERSION)},'abcdef0') "
                "RETURNING importacao_lote_id"))
            sheet = MANIFEST["sheets"][1]
            revised_raw = raw_payload(sheet["columns"], revised_values)
            revised_line = int(db.scalar("INSERT INTO importacao_linha "
                "(importacao_lote_id,aba_nome_original,aba_ordem,numero_linha,dados_brutos) "
                f"VALUES ({revised_lot},{literal(sheet['aba_nome_original'])},2,2,"
                f"{literal(json.dumps(revised_raw, ensure_ascii=False))}::jsonb) RETURNING importacao_linha_id"))
            db.run("SET LOCAL ROLE ambulatorio_servico_autenticado")
            db.run(f"SELECT auditoria_iniciar_aplicacao({actor})")
            db.run("SET LOCAL ROLE ambulatorio_revisao_gestor")
            source = int(db.scalar(f"SELECT revisao_registrar_fonte('d8-fonte-sintetica',{lot})"))
            authorization = int(db.scalar(f"SELECT revisao_conceder_autorizacao({source},{actor})"))
            db.run("SET LOCAL ROLE ambulatorio_revisao_servico")
            revision = int(db.scalar(f"SELECT revisao_preparar({source},{lot},{revised_lot},"
                                     f"{literal(sha(transform_bytes))},{authorization})"))
            plan = [{"campoId": field, "registroId": event, "alvoChave": "evento_clinico",
                     "chaveSemantica": "retorno_anual_realizado", "blocoFuncional": "geral",
                     "ocorrencia": 1, "categoria": "correcao_ocorrencia", "operacao": "definir",
                     "base": envelope(2023), "proposto": envelope(2022)}]
            decision = int(db.scalar("SELECT revisao_publicar_decisao "
                f"({revision},{revised_line},{line},{patient},{attendance},{authorization},"
                f"'autorizar','Correcao anual sintetica D8',{literal(json.dumps(plan))}::jsonb)"))
            db.run("COMMIT")
            db.run("BEGIN")
            db.run("SET LOCAL ROLE ambulatorio_servico_autenticado")
            db.run(f"SELECT auditoria_iniciar_aplicacao({actor})")
            db.run("RESET ROLE")
            assert db.scalar(f"SELECT revisao_aplicar_decisao_interna({decision},{authorization})->>'resultado'") == "aplicada"
            db.run("COMMIT")
            db.run("BEGIN")
            db.run("SET LOCAL ROLE ambulatorio_servico_autenticado")
            db.run(f"SELECT auditoria_iniciar_aplicacao({actor})")
            db.run("RESET ROLE")
            assert db.scalar(f"SELECT revisao_terminar_interna({revision},{authorization},'encerrar')") in {
                "concluida", "concluida_com_pendencias"}
            db.run("COMMIT")
            assert db.scalar(f"SELECT ano_evento FROM evento_clinico WHERE evento_clinico_id={event}") == "2022"

        repeated = importer(base_path, "d8-superado", reprocess=True)
        assert repeated.returncode != 0, repeated.stdout
        assert "importacao_conteudo_superado" in repeated.stderr, repeated.stderr
        with Database(*db_args) as db:
            assert db.scalar(f"SELECT ano_evento FROM evento_clinico WHERE evento_clinico_id={event}") == "2022"
            assert db.scalar(f"SELECT count(*) FROM evento_clinico WHERE paciente_id={patient} AND tipo_evento={literal(KIND)}") == "1"
            assert db.scalar(f"SELECT count(*) FROM atendimento WHERE paciente_id={patient}") == "1"
            assert db.scalar("SELECT count(*) FROM importacao_registro r JOIN importacao_linha l "
                             "USING(importacao_linha_id) JOIN importacao_lote b USING(importacao_lote_id) "
                             "WHERE b.codigo_lote='d8-superado'") == "0"
        print("OK: D8 Python/PostgreSQL preserva bruto, estrutura ano sem visita, não duplica e bloqueia fonte superada")


if __name__ == "__main__":
    main()

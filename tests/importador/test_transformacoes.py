#!/usr/bin/env python3
import json
import io
import sys
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from importar_planilha import bzn_duration, bool_value, date_value, normalized, number_value, HANDLED_TABLES, Importer, NONCRITICAL_POLICY, PROMOTION_REGISTRY, RowConflict, main


class FinalidadeImportacaoTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(__file__).resolve().parents[2]
        self.fixture = self.root / "tests/fixtures/planilha_importacao_v1_sintetica.xlsx"
        self.manifest = json.loads((self.root / "manifestos/planilha_ambulatorio_v1.json").read_text())

    def test_cli_recusa_antes_de_ler_arquivo_ou_conectar_inclusive_dry_run(self):
        cases = [
            ([], "finalidade_ausente"),
            (["--finalidade", ""], "finalidade_ausente_ou_invalida"),
            (["--finalidade", "valor_livre_sintetico"], "finalidade_ausente_ou_invalida"),
            (["--finalidade", "revisao"], "revisao_nao_suportada"),
            (["--finalidade", "revisao", "--reprocessar"], "revisao_nao_suportada"),
            (["--finalidade", "carga_inicial", "--reprocessar"], "finalidade_incompativel"),
            (["--reprocessar"], "finalidade_ausente"),
            (["--finalidade", "revisao", "--finalidade", "carga_inicial"], "finalidade_ambigua"),
            (["--finalidade", "carga_inicial", "--finalidade", "revisao"], "finalidade_ambigua"),
            (["--finalidade", "carga_inicial", "--finalidade", "carga_inicial"], "finalidade_ambigua"),
        ]
        for flags, error in cases:
            for mode in ([], ["--dry-run"]):
                with self.subTest(flags=flags, mode=mode), patch("importar_planilha.Database") as db, \
                        patch("importar_planilha.read_xlsx") as read_book, \
                        patch.object(Path, "read_text") as read_text, \
                        patch.object(Path, "read_bytes") as read_bytes, \
                        patch.object(Path, "write_text") as write_text:
                    output = io.StringIO()
                    with redirect_stderr(output), self.assertRaises(SystemExit) as exc:
                        main(["fonte_sintetica_inexistente.xlsx", *flags, *mode,
                              "--quality-report", "relatorio_sintetico.json"])
                    self.assertEqual(exc.exception.code, 2)
                    self.assertIn(error, output.getvalue())
                    self.assertNotIn("valor_livre_sintetico", output.getvalue())
                    for operation in (db, read_book, read_text, read_bytes, write_text):
                        operation.assert_not_called()

    def test_chamada_direta_nao_contorna_barreira(self):
        for purpose, reprocess in ((None, False), ("revisao", False), ("invalida", False),
                                   ("carga_inicial", True)):
            with self.subTest(purpose=purpose), patch("importar_planilha.read_xlsx") as read_book:
                db = Mock()
                with self.assertRaises(ValueError):
                    Importer(db, self.fixture, self.manifest, "sintetico",
                             reprocess=reprocess, purpose=purpose)
                read_book.assert_not_called()
                self.assertEqual(db.mock_calls, [])

    def test_mesmo_conteudo_sem_hash_layout_existente_so_consulta(self):
        for reprocess in (False, True):
            for dry_run in (False, True):
                with self.subTest(reprocess=reprocess, dry_run=dry_run):
                    db = Mock()
                    db.scalar.return_value = None
                    importer = Importer(db, self.fixture, self.manifest, "sintetico",
                                        reprocess, dry_run, purpose="mesmo_conteudo")
                    with self.assertRaisesRegex(SystemExit, "mesmo_conteudo_sem_lote"):
                        importer.run()
                    db.scalar.assert_called_once()
                    query = db.scalar.call_args.args[0]
                    self.assertTrue(query.startswith("SELECT "))
                    self.assertIn(importer.hash, query)
                    self.assertIn(self.manifest["layout_versao"], query)
                    db.run.assert_not_called()
                    db.transaction.assert_not_called()

    def test_carga_declarada_cria_lote_quando_hash_desconhecido(self):
        db = Mock()
        db.scalar.side_effect = [None, "42"]
        importer = Importer(db, self.fixture, self.manifest, "sintetico", purpose="carga_inicial")
        self.assertTrue(importer.prepare_lot())
        self.assertEqual(importer.lot_id, 42)
        self.assertTrue(db.scalar.call_args.args[0].startswith("INSERT INTO importacao_lote"))

    def test_conteudo_concluido_e_idempotente_com_ambas_finalidades_permitidas(self):
        for purpose in ("carga_inicial", "mesmo_conteudo"):
            for status in ("concluido", "concluido_com_pendencias"):
                with self.subTest(purpose=purpose, status=status):
                    db = Mock()
                    db.scalar.return_value = f"42|{status}"
                    importer = Importer(db, self.fixture, self.manifest, "sintetico", purpose=purpose)
                    with redirect_stderr(io.StringIO()):
                        self.assertFalse(importer.prepare_lot())
                    db.scalar.assert_called_once()
                    db.run.assert_not_called()

    def test_retomada_reutiliza_lote_existente(self):
        db = Mock()
        db.scalar.return_value = "42|falhou"
        importer = Importer(db, self.fixture, self.manifest, "sintetico", purpose="mesmo_conteudo")
        self.assertTrue(importer.prepare_lot())
        self.assertEqual(importer.lot_id, 42)
        db.scalar.assert_called_once()
        self.assertTrue(db.run.call_args.args[0].startswith("UPDATE importacao_lote"))

    def test_reprocessamento_mantem_predecessor_do_mesmo_conteudo(self):
        db = Mock()
        db.scalar.side_effect = ["42|concluido_com_pendencias", "43"]
        importer = Importer(db, self.fixture, self.manifest, "sintetico",
                            reprocess=True, purpose="mesmo_conteudo")
        self.assertTrue(importer.prepare_lot())
        self.assertEqual(importer.predecessor_id, 42)
        self.assertEqual(importer.lot_id, 43)



class TransformacoesTest(unittest.TestCase):
    def test_identidade_remove_acentos_e_espacos(self):
        self.assertEqual(normalized("  ÁNA   SINTÉTICA "), "ana sintetica")

    def test_booleanos(self):
        self.assertTrue(bool_value("x", "campo"))
        self.assertFalse(bool_value("NÃO", "campo"))
        self.assertIsNone(bool_value("", "campo"))
        with self.assertRaises(RowConflict): bool_value("talvez", "campo")

    def test_datas_e_numeros_estritos(self):
        self.assertEqual(date_value("24/08/2026", "data"), "2026-08-24")
        self.assertEqual(number_value("92,5", "glicemia"), 92.5)
        with self.assertRaises(RowConflict): date_value("2026-08-24", "data")
        for invalid in ("1.234,5", "1e3", "10 kg"):
            with self.assertRaises(RowConflict): number_value(invalid, "numero")

    def test_duracao_bzn(self):
        self.assertEqual(bzn_duration("60"), 60)
        self.assertEqual(bzn_duration("8 semanas"), 56)
        with self.assertRaises(RowConflict): bzn_duration("dois meses")

    def test_os_125_rotulos_plenos_possuem_handler(self):
        root = Path(__file__).resolve().parents[2]
        manifest = json.loads((root / "manifestos/planilha_ambulatorio_v1.json").read_text())
        canonical = {}
        for sheet in manifest["sheets"]:
            for column in sheet["columns"]:
                canonical.setdefault(column["cabecalho_original"].strip(), column)
        full = [c for c in canonical.values() if c["situacao_cobertura"] in {"direta", "com_transformacao"}]
        self.assertEqual(len(full), 125)
        self.assertEqual({c["tabela_destino"] for c in full} - HANDLED_TABLES, set())
        self.assertEqual(len([c for c in canonical.values() if c["situacao_cobertura"] == "parcial"]), 10)
        self.assertEqual([c["chave_semantica"] for c in canonical.values() if c["situacao_cobertura"] == "excluido"], ["localizado"])
        self.assertEqual(set(PROMOTION_REGISTRY), {"pendencias_observacao"})
        self.assertEqual(set(NONCRITICAL_POLICY), {"catalogo_projeto_ausente"})


class CriticidadeErrosTest(unittest.TestCase):
    def setUp(self):
        self.importer = Importer.__new__(Importer)
        self.importer.db = Mock()
        self.importer.reconcile = Mock()
        self.importer.insert_returning = Mock()
        self.importer.manifest = {"aliases_versionados": {"projetos": {
            "sami_trop_1_1": "sami_trop_1_1",
        }}}

    def test_catalogo_de_projeto_ausente_vira_pendencia_nao_critica(self):
        self.importer.db.scalar.return_value = None
        issues = self.importer.projects(
            1, 2, {"sami_trop_1_1": "sim"})
        self.assertEqual(
            issues, ["catalogo_projeto_ausente:sami_trop_1_1"])
        self.importer.insert_returning.assert_not_called()

    def test_catalogo_de_outro_handler_continua_critico_por_padrao(self):
        self.importer.manifest = {"aliases_versionados": {"medicamentos": {
            "anti_hipertensivo": "antihipertensivo_nao_especificado",
        }}}
        self.importer.db.scalar.return_value = None
        with self.assertRaisesRegex(RowConflict, "medicamento: catálogo inexistente"):
            self.importer.medications(
                1, 2, {"anti_hipertensivo": "sim"})
        self.importer.insert_returning.assert_not_called()

    def test_nova_tentativa_cria_vinculo_quando_catalogo_foi_corrigido(self):
        self.importer.db.scalar.side_effect = ["7", None]
        issues = self.importer.retry_project_catalog(
            1, 2, {"sami_trop_1_1": "sim"}, "sami_trop_1_1")
        self.assertEqual(issues, [])
        self.importer.insert_returning.assert_called_once_with(
            1, "paciente_projeto_estudo", {
                "paciente_id": 2,
                "projeto_estudo_id": 7,
                "participa": True,
                "valor_original_participacao": "sim",
            })

    def test_nova_tentativa_desconhecida_nao_e_encerrada_silenciosamente(self):
        issues = self.importer.retry_project_catalog(
            1, 2, {"sami_trop_1_1": "sim"}, "projeto_inexistente")
        self.assertEqual(
            issues, ["catalogo_projeto_ausente:projeto_inexistente"])
        self.importer.db.scalar.assert_not_called()
        self.importer.insert_returning.assert_not_called()

    def test_mensagem_tecnica_recupera_somente_pendencias_nao_criticas(self):
        issues = self.importer.noncritical_issues(
            "campos preservados apenas em dados_brutos: idade; "
            "nao_criticas=catalogo_projeto_ausente:sami_trop_1_1")
        self.assertEqual(
            issues, ["catalogo_projeto_ausente:sami_trop_1_1"])

    def test_mensagem_adulterada_nao_reemite_conteudo_livre(self):
        issues = self.importer.noncritical_issues(
            "nao_criticas=catalogo_projeto_ausente:conteúdo livre sensível")
        self.assertEqual(issues, ["integridade_politica_nao_critica"])


class PromocaoPendenciasTest(unittest.TestCase):
    def setUp(self):
        self.importer = Importer.__new__(Importer)
        self.importer.db = Mock()
        self.importer.provenance = Mock()
        self.importer.insert_returning = Mock()

    def test_cria_pendencia_quando_destino_repetivel_ainda_nao_existe(self):
        self.importer.db.run.return_value = []
        self.importer.db.scalar.return_value = "0"
        self.importer.pending_note(
            1, 2, {"pendencias_observacao": "  pendência sintética  "},
            promotion=True)
        self.importer.insert_returning.assert_called_once_with(
            1, "pendencia_atendimento", {
                "atendimento_id": 2,
                "descricao": "pendência sintética",
                "valor_original_pendencia": "  pendência sintética  ",
            })

    def test_preserva_destino_repetivel_manual_ambiguo(self):
        self.importer.db.run.return_value = []
        self.importer.db.scalar.return_value = "1"
        with self.assertRaisesRegex(RowConflict, "destino repetível ambíguo"):
            self.importer.pending_note(
                1, 2, {"pendencias_observacao": "pendência sintética"},
                promotion=True)
        self.importer.insert_returning.assert_not_called()

    def test_alvo_promovido_equivalente_e_reutilizado(self):
        self.importer.db.run.return_value = ["42"]
        values = iter(["2", "pendência sintética", "pendência sintética"])
        self.importer.db.scalar.side_effect = lambda _sql: next(values)
        self.importer.pending_note(
            1, 2, {"pendencias_observacao": "pendência sintética"},
            promotion=True)
        self.importer.provenance.assert_called_once_with(
            1, "pendencia_atendimento", 42, "associado")
        self.importer.insert_returning.assert_not_called()


class ReconciliacaoBznTest(unittest.TestCase):
    def setUp(self):
        self.importer = Importer.__new__(Importer)
        self.importer.db = Mock()
        self.importer.provenance = Mock()
        self.importer.insert_returning = Mock()

    def existente(self, fields):
        def scalar(sql):
            if sql.startswith("SELECT tratamento_benzonidazol_id"):
                return "42"
            field = sql.split("COALESCE(", 1)[1].split("::text", 1)[0]
            return fields.get(field, "__NULL__")
        self.importer.db.scalar.side_effect = scalar

    def test_sem_dados_bzn_nao_cria_nem_associa(self):
        self.importer.treatment(1, 2, 3, {"tem_indicacao_de_bzn": "  "})
        self.importer.db.scalar.assert_not_called()
        self.importer.insert_returning.assert_not_called()
        self.importer.provenance.assert_not_called()

    def test_novo_tratamento_preserva_paciente_e_atendimento(self):
        self.importer.db.scalar.return_value = None
        self.importer.treatment(1, 2, 3, {"tem_indicacao_de_bzn": "não"})
        self.importer.insert_returning.assert_called_once_with(
            1, "tratamento_benzonidazol", {
                "paciente_id": 2, "atendimento_id": 3,
                "tem_indicacao": False, "valor_original_indicacao": "não"})

    def test_equivalencias_associam_sem_mudar_original_ou_atendimento(self):
        self.existente({"iniciado": "true", "valor_original_inicio": "sim",
                        "duracao_cumprida_dias": "56", "valor_original_duracao": "8 semanas",
                        "teve_reacao_adversa": "false", "valor_original_reacao_adversa": "não"})
        self.importer.treatment(1, 2, 99, {
            "uso_do_benzonidazol_para_tratamento_da_dc": "S",
            "por_quanto_tempo_foi_usado": "56 dias", "teve_reacao_adversa": "N"})
        self.importer.db.run.assert_not_called()
        self.importer.insert_returning.assert_not_called()
        self.importer.provenance.assert_called_once_with(
            1, "tratamento_benzonidazol", 42, "associado")

    def test_informacao_ausente_e_preenchida_com_original(self):
        self.existente({})
        self.importer.treatment(1, 2, 99, {"por_quanto_tempo_foi_usado": "1 semana"})
        updates = [call.args[0] for call in self.importer.db.run.call_args_list]
        self.assertTrue(any("SET duracao_cumprida_dias=7," in sql for sql in updates))
        self.assertTrue(any("SET valor_original_duracao='1 semana'," in sql for sql in updates))
        self.assertFalse(any("atendimento_id" in sql or "paciente_id" in sql for sql in updates))
        self.importer.provenance.assert_called_once_with(
            1, "tratamento_benzonidazol", 42, "atualizado")

    def test_divergencias_clinicas_geram_conflito_sem_expor_valores(self):
        cases = [
            ("tem_indicacao_de_bzn", "tem_indicacao", "true", "não"),
            ("uso_do_benzonidazol_para_tratamento_da_dc", "iniciado", "false", "sim"),
            ("tratamento_pelo_ambulatorio", "tratamento_pelo_ambulatorio", "true", "não"),
            ("por_quanto_tempo_foi_usado", "duracao_cumprida_dias", "56", "7 dias"),
            ("em_qual_ano_tomou_a_medicacao_benzonidazol", "ano_uso_aproximado", "2025", "2024"),
            ("prescricao_do_bzn_data", "data_prescricao", "2025-06-01", "02/06/2025"),
            ("se_nao_descreva_o_motivo", "motivo_nao_indicacao", "motivo sintético A", "motivo sintético B"),
            ("teve_reacao_adversa", "teve_reacao_adversa", "false", "sim"),
        ]
        for source, field, current, incoming in cases:
            with self.subTest(field=field):
                self.existente({field: current})
                with self.assertRaises(RowConflict) as error:
                    self.importer.treatment(1, 2, 3, {source: incoming})
                self.assertEqual(str(error.exception),
                                 f"tratamento_benzonidazol.{field}: divergência consolidada")
                self.importer.insert_returning.assert_not_called()
                self.importer.provenance.assert_not_called()


if __name__ == "__main__": unittest.main()

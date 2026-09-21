#!/usr/bin/env python3
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from importar_planilha import bzn_duration, bool_value, date_value, normalized, number_value, HANDLED_TABLES, Importer, RowConflict


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

    def test_os_124_rotulos_plenos_possuem_handler(self):
        root = Path(__file__).resolve().parents[2]
        manifest = json.loads((root / "manifestos/planilha_ambulatorio_v1.json").read_text())
        canonical = {}
        for sheet in manifest["sheets"]:
            for column in sheet["columns"]:
                canonical.setdefault(column["cabecalho_original"].strip(), column)
        full = [c for c in canonical.values() if c["situacao_cobertura"] in {"direta", "com_transformacao"}]
        self.assertEqual(len(full), 124)
        self.assertEqual({c["tabela_destino"] for c in full} - HANDLED_TABLES, set())
        self.assertEqual(len([c for c in canonical.values() if c["situacao_cobertura"] == "parcial"]), 11)
        self.assertEqual([c["chave_semantica"] for c in canonical.values() if c["situacao_cobertura"] == "excluido"], ["localizado"])


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

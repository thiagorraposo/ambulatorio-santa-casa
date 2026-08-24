#!/usr/bin/env python3
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from importar_planilha import bzn_duration, bool_value, date_value, normalized, number_value, RowConflict


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

    def test_duracao_bzn(self):
        self.assertEqual(bzn_duration("60"), 60)
        self.assertEqual(bzn_duration("8 semanas"), 56)
        with self.assertRaises(RowConflict): bzn_duration("dois meses")


if __name__ == "__main__": unittest.main()

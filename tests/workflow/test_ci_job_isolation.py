"""Upgrade PostgreSQL deve executar somente no job que prepara seu banco."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class CiJobIsolationTests(unittest.TestCase):
    def test_upgrades_require_database_job_after_synthetic_setup(self):
        workflow = (ROOT / ".github/workflows/validacoes.yml").read_text()
        jobs = dict(re.findall(r"^  ([a-z_]+):\n(.*?)(?=^  [a-z_]+:|\Z)",
                               workflow, re.MULTILINE | re.DOTALL))
        upgrades = re.findall(r"run: make (db-[a-z]+-upgrade-test) ", workflow)
        self.assertTrue(upgrades, "Workflow deve manter os testes de upgrade")
        database = jobs["database"]
        setup = database.index("uses: ./.github/actions/synthetic-postgres")
        for target in upgrades:
            with self.subTest(target=target):
                owners = [job for job, content in jobs.items() if f"run: make {target} " in content]
                self.assertEqual(owners, ["database"])
                self.assertGreater(database.index(f"run: make {target} "), setup)


if __name__ == "__main__":
    unittest.main()

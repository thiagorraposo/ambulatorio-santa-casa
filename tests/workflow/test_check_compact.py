"""Contratos do runner e integração com Make, sem PostgreSQL/Docker reais."""

import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
RUNNER = ROOT / "scripts/check_compact.py"


class CompactChecksTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="workflow-test-")
        self.addCleanup(self.directory.cleanup)
        self.folder = Path(self.directory.name)
        self.environment = os.environ.copy()
        # Cada teste simula uma chamada independente, inclusive dentro de make -j.
        for name in ("MAKEFLAGS", "MAKELEVEL", "MAKEOVERRIDES", "MFLAGS", "_COMPACT_RUNNING", "COMPACT"):
            self.environment.pop(name, None)
        self.environment["PATH"] = f"{self.folder}:{self.environment['PATH']}"
        self.environment["WORKFLOW_TEST_TRACE"] = str(self.folder / "trace")
        psql = self.folder / "psql"
        psql.write_text(
            f"#!{sys.executable}\n"
            "import os, pathlib, sys\n"
            "connection = '-Atc' in sys.argv\n"
            "with pathlib.Path(os.environ['WORKFLOW_TEST_TRACE']).open('a') as trace:\n"
            "    trace.write('connection\\n' if connection else 'sql\\n')\n"
            "if connection:\n"
            "    print('syntheticdb|syntheticuser|t')\n"
            "else:\n"
            "    print('SQL sintético executado')\n"
            "    if os.environ.get('WORKFLOW_TEST_ECHO_SECRET'):\n"
            "        for name in ('PGPASSWORD', 'APP_DB_PASSWORD', 'AUTH_JWT_SECRET'):\n"
            "            print(os.environ.get(name, 'ausente'))\n"
            "    if os.environ.get('WORKFLOW_TEST_FAIL'):\n"
            "        print('Falha SQL sintética controlada', file=sys.stderr)\n"
            "        sys.exit(37)\n",
            encoding="utf-8",
        )
        psql.chmod(0o700)
        (self.folder / "synthetic.sql").write_text("-- Não executado em banco real.\n")

    def execute(self, command):
        return subprocess.run(
            command, cwd=ROOT, env=self.environment, capture_output=True,
            text=True, timeout=30,
        )

    def runner(self, code, label="validação sintética"):
        return self.execute([
            sys.executable, str(RUNNER), "--label", label, "--",
            sys.executable, "-c", code,
        ])

    def log(self, result):
        paths = re.findall(r"^Log: (/tmp/ambulatorio-check-[^\n]+/output.log)$", result.stdout, re.MULTILINE)
        self.assertTrue(paths, result.stdout + result.stderr)
        path = Path(paths[-1])
        self.addCleanup(shutil.rmtree, path.parent)
        self.assertEqual(path.stat().st_mode & 0o777, 0o600)
        self.assertEqual(path.parent.stat().st_mode & 0o777, 0o700)
        return path.read_text()

    def make(self, *targets, compact=False, parallel=False):
        command = ["make", "--no-print-directory"]
        if parallel:
            command.append("-j2")
        command.extend([
            *targets, "DB_ENV=local", "DB_NAME=syntheticdb", "DB_USER=syntheticuser",
            f"SQL_TESTS={self.folder / 'synthetic.sql'}",
        ])
        if compact:
            command.append("COMPACT=1")
        return self.execute(command)

    def test_success_keeps_full_output_in_private_log(self):
        result = self.runner("import sys; print('stdout sintético'); print('stderr sintético', file=sys.stderr)")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("OK (código 0)", result.stdout)
        self.assertNotIn("stdout sintético", result.stdout)
        log = self.log(result)
        self.assertIn("stdout sintético", log)
        self.assertIn("stderr sintético", log)

    def test_failure_keeps_exit_code_and_shows_bounded_tail(self):
        result = self.runner(
            "import sys; [print(f'linha {n:03d} ' + 'x' * 300) for n in range(80)]; "
            "print('erro sintético final'); sys.exit(37)"
        )
        self.assertEqual(result.returncode, 37)
        self.assertIn("FALHA (código 37)", result.stdout)
        self.assertNotIn("linha 000", result.stdout)
        self.assertIn("erro sintético final", result.stdout)
        self.assertIn("linha 000", self.log(result))
        self.assertLessEqual(len(result.stdout.split("6000 caracteres):\n", 1)[1]), 6000)

    def test_redacts_environment_secrets_and_url_passwords_before_logging(self):
        self.environment["WORKFLOW_TEST_PASSWORD"] = "senha-sintetica-privada"
        self.environment["WORKFLOW_TEST_TOKEN"] = "token-sintetico-privado"
        result = self.runner(
            "import os, sys; print(os.environ['WORKFLOW_TEST_PASSWORD']); "
            "print(os.environ['WORKFLOW_TEST_TOKEN'], file=sys.stderr); "
            "print('postgresql://synthetic:senha-url-sintetica@localhost/test'); sys.exit(4)",
            label="teste token-sintetico-privado",
        )
        self.assertEqual(result.returncode, 4)
        output = result.stdout + result.stderr + self.log(result)
        for secret in ("senha-sintetica-privada", "token-sintetico-privado", "senha-url-sintetica"):
            self.assertNotIn(secret, output)
        self.assertIn("[REDACTED]", output)

    def test_missing_command_is_a_failure(self):
        result = self.execute([
            sys.executable, str(RUNNER), "--label", "comando ausente", "--",
            str(self.folder / "missing-command"),
        ])
        self.assertEqual(result.returncode, 127)
        self.assertIn("Erro ao executar", self.log(result))

    def test_signal_uses_shell_exit_convention(self):
        result = self.runner("import os, signal; os.kill(os.getpid(), signal.SIGTERM)")
        self.assertEqual(result.returncode, 143)
        self.log(result)

    def test_make_preserves_shared_dependencies_and_short_git_status(self):
        for compact in (False, True):
            with self.subTest(compact=compact):
                trace = self.folder / "trace"
                trace.write_text("")
                result = self.make("db-test", "project-check", "docs-check", compact=compact, parallel=True)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                self.assertEqual(trace.read_text(), "connection\nsql\n")
                output = self.log(result) if compact else result.stdout
                self.assertEqual(output.count("OK: AGENTS.md"), 1)
                self.assertNotIn("jobserver unavailable", output + result.stderr)
                head = self.execute(["git", "rev-parse", "--short", "HEAD"]).stdout.strip()
                if compact:
                    self.assertNotIn(head, result.stdout + output)
                    self.assertIn("git status --short:", result.stdout)
                    status = self.execute(["git", "status", "--short"]).stdout
                    self.assertIn(status or "(limpo)", result.stdout)
                else:
                    self.assertIn(head, result.stdout)

    def test_make_failure_matches_normal_mode(self):
        self.environment["WORKFLOW_TEST_FAIL"] = "1"
        normal = self.make("db-test")
        compact = self.make("db-test", compact=True)
        self.assertEqual(normal.returncode, 2)
        self.assertEqual(compact.returncode, normal.returncode)
        self.assertIn("Falha SQL sintética controlada", compact.stdout)
        self.assertIn("Falha SQL sintética controlada", self.log(compact))

    def test_make_passes_its_configured_secrets_to_the_log_filter(self):
        self.environment["WORKFLOW_TEST_ECHO_SECRET"] = "1"
        result = self.make(
            "db-test", "POSTGRES_PASSWORD=postgres-sintetico-privado",
            "APP_DB_PASSWORD=backend-sintetico-privado",
            "AUTH_JWT_SECRET=jwt-sintetico-privado", compact=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        output = result.stdout + result.stderr + self.log(result)
        for secret in ("postgres-sintetico-privado", "backend-sintetico-privado", "jwt-sintetico-privado"):
            self.assertNotIn(secret, output)
        self.assertGreaterEqual(output.count("[REDACTED]"), 3)

    def test_compact_rejects_operational_targets_before_execution(self):
        result = self.make("db-migrate", compact=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("somente alvos de validação", result.stderr)
        self.assertFalse((self.folder / "trace").exists())


if __name__ == "__main__":
    unittest.main()

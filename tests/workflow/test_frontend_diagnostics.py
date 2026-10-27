"""Diagnóstico do runner frontend sem PostgreSQL, Node ou servidores reais."""

import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
RUNNER = ROOT / "tests/frontend/test_e2e.sh"


class FrontendDiagnosticsTest(unittest.TestCase):
    def test_invalid_port_keeps_failure_and_prints_only_bounded_redacted_logs(self):
        with tempfile.TemporaryDirectory(prefix="frontend-diagnostics-test-") as directory:
            folder = Path(directory)
            binaries = folder / "bin"
            binaries.mkdir()
            evidence = folder / "evidence"
            evidence.mkdir()
            trace = folder / "database-calls"
            environment = {
                **os.environ,
                "PATH": f"{binaries}:{os.environ['PATH']}",
                "SYNTHETIC_PG_HOST": "synthetic.invalid",
                "SYNTHETIC_PG_PORT": "55457",
                "SYNTHETIC_PG_USER": "syntheticuser",
                "PGPASSWORD": "senha-postgres-sintetica-diagnostico",
                "APP_DB_PASSWORD": "senha-backend-sintetica-diagnostico",
                "IMPORT_DB_PASSWORD": "senha-worker-sintetica-diagnostico",
                "AUTH_JWT_SECRET": "jwt-sintetico-diagnostico",
                "FRONTEND_E2E_API_PORT": "invalid",
                "FRONTEND_DIAG_TEST_DIR": str(evidence),
                "FRONTEND_DIAG_TEST_TRACE": str(trace),
            }

            def executable(name, code):
                path = binaries / name
                path.write_text(f"#!{sys.executable}\n{code}", encoding="utf-8")
                path.chmod(0o700)

            executable("mktemp", "import os; print(os.environ['FRONTEND_DIAG_TEST_DIR'])\n")
            executable("node", "print('abcdef')\n")
            for command in ("psql", "createdb", "dropdb"):
                executable(command,
                    "import os, pathlib, sys\n"
                    "pathlib.Path(os.environ['FRONTEND_DIAG_TEST_TRACE']).write_text('chamada proibida')\n"
                    "sys.exit(99)\n")

            logs = ("migrations.log", "backend.log", "frontend.log", "cleanup.log")
            url_secret = "senha-url-sintetica-diagnostico"
            fixture_secret = "fixture-sintetica-fora-dos-logs"
            ignored_secret = "arquivo-sintetico-fora-da-allowlist"
            for name in logs:
                content = "fora-da-cauda\n" + "linha sintética " * 500 + "\n"
                content += "\n".join(f"linha {number} " + "x" * 300 for number in range(40)) + "\n"
                content += "\n".join(environment[key] for key in (
                    "PGPASSWORD", "APP_DB_PASSWORD", "IMPORT_DB_PASSWORD", "AUTH_JWT_SECRET")) + "\n"
                content += f"postgresql://synthetic:{url_secret}@synthetic.invalid/test\n"
                (evidence / name).write_text(content, encoding="utf-8")
            (evidence / "fixture.json").write_text(fixture_secret, encoding="utf-8")
            (evidence / "other.log").write_text(ignored_secret, encoding="utf-8")

            result = subprocess.run(["bash", str(RUNNER)], cwd=ROOT, env=environment,
                                    capture_output=True, text=True, timeout=15)
            output = result.stdout + result.stderr
            self.assertEqual(result.returncode, 1, output)
            self.assertIn("Porta de teste inválida", output)
            self.assertFalse(trace.exists(), "Nenhum comando de banco pode executar")
            self.assertFalse((evidence / "fixture.json").exists())
            for secret in [environment[key] for key in (
                    "PGPASSWORD", "APP_DB_PASSWORD", "IMPORT_DB_PASSWORD", "AUTH_JWT_SECRET")
                    ] + [url_secret, fixture_secret, ignored_secret, "fora-da-cauda"]:
                self.assertNotIn(secret, output)
            self.assertIn("[REDACTED]", output)
            for number, name in enumerate(logs):
                marker = f"Diagnóstico frontend: {name} (até 30 linhas / 6000 caracteres):\n"
                self.assertIn(marker, output)
                tail = output.split(marker, 1)[1]
                if number + 1 < len(logs):
                    tail = tail.split("Diagnóstico frontend:", 1)[0]
                self.assertLessEqual(len(tail), 6000)


if __name__ == "__main__":
    unittest.main()

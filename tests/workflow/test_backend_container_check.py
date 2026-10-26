"""Contrato do check de usuário do container, sem Docker ou PostgreSQL reais."""

import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]


class BackendContainerChecksTest(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix="backend-container-check-test-")
        self.addCleanup(directory.cleanup)
        self.folder = Path(directory.name)
        self.trace = self.folder / "trace"
        self.environment = os.environ.copy()
        for name in ("MAKEFLAGS", "MAKELEVEL", "MAKEOVERRIDES", "MFLAGS", "COMPACT", "_COMPACT_RUNNING"):
            self.environment.pop(name, None)
        self.environment.update(
            PATH=f"{self.folder}:{self.environment['PATH']}",
            CONTAINER_TEST_TRACE=str(self.trace),
            CONTAINER_TEST_UID="1000",
            CONTAINER_TEST_EXEC_STATUS="0",
        )
        self.compose = self.executable("compose", """import os, pathlib, sys
args = sys.argv[1:]
with pathlib.Path(os.environ['CONTAINER_TEST_TRACE']).open('a') as trace:
    trace.write('compose ' + ' '.join(args) + '\\n')
if args == ['ps', '-q', 'backend']:
    print('container-sintetico')
elif args == ['exec', '-T', 'backend', 'id', '-u']:
    uid = os.environ['CONTAINER_TEST_UID']
    if uid:
        print(uid)
    status = int(os.environ['CONTAINER_TEST_EXEC_STATUS'])
    if status:
        print('Falha sintética de docker exec', file=sys.stderr)
    sys.exit(status)
else:
    sys.exit(99)
""")
        self.executable("docker", """import os, pathlib, sys
with pathlib.Path(os.environ['CONTAINER_TEST_TRACE']).open('a') as trace:
    trace.write('docker ' + ' '.join(sys.argv[1:]) + '\\n')
if sys.argv[1:] == ['inspect', '--format', '{{.State.Health.Status}}', 'container-sintetico']:
    print('healthy')
else:
    sys.exit(99)
""")
        # Defesas da fixture: nem uma regressão nos alvos/pré-requisitos pode
        # deixar os testes chamarem clientes de banco reais.
        for command in ("psql", "createdb", "dropdb"):
            self.executable(command, """import os, pathlib, sys
with pathlib.Path(os.environ['CONTAINER_TEST_TRACE']).open('a') as trace:
    trace.write('SQL PROIBIDO\\n')
sys.exit(99)
""")

    def executable(self, name, code):
        path = self.folder / name
        path.write_text(f"#!{sys.executable}\n{code}", encoding="utf-8")
        path.chmod(0o700)
        return path

    def check(self, *, uid, status=0, compact=False):
        self.trace.write_text("")
        # -o existe apenas nesta fixture. MAKE o repete explicitamente no
        # subprocesso compacto, pois GNU Make não o exporta em MAKEFLAGS.
        result = subprocess.run([
            "make", "--no-print-directory", "-o", "backend-up", "backend-container-check",
            f"COMPOSE={self.compose}", "MAKE=make -o backend-up",
            f"COMPACT={int(compact)}",
        ], cwd=ROOT, env={**self.environment, "CONTAINER_TEST_UID": uid,
                         "CONTAINER_TEST_EXEC_STATUS": str(status)},
            capture_output=True, text=True, timeout=15)
        output = result.stdout + result.stderr
        if compact:
            logs = re.findall(r"^Log: (/tmp/ambulatorio-check-[^\n]+/output.log)$",
                              result.stdout, re.MULTILINE)
            self.assertTrue(logs, output)
            log = Path(logs[-1])
            self.addCleanup(shutil.rmtree, log.parent)
            output += log.read_text()
        self.assertNotIn("SQL PROIBIDO", self.trace.read_text())
        self.assertIn("compose exec -T backend id -u", self.trace.read_text())
        return result.returncode, output

    def test_non_root_numeric_uid_passes(self):
        for compact in (False, True):
            with self.subTest(compact=compact):
                status, output = self.check(uid="1000", compact=compact)
                self.assertEqual(status, 0, output)
                self.assertIn("OK: imagem backend construída, container healthy e usuário não-root", output)

    def test_exec_failure_preserves_its_error_even_with_non_root_output(self):
        for compact in (False, True):
            for uid in ("", "1000"):
                with self.subTest(compact=compact, uid=uid):
                    status, output = self.check(uid=uid, status=37, compact=compact)
                    self.assertEqual(status, 2, output)
                    self.assertIn("Error 37", output)
                    self.assertIn("não foi possível consultar o usuário", output)
                    self.assertNotIn("OK: imagem backend", output)

    def test_empty_non_numeric_and_root_uid_fail(self):
        for compact in (False, True):
            for uid in ("", "usuario", "0"):
                with self.subTest(compact=compact, uid=uid):
                    status, output = self.check(uid=uid, compact=compact)
                    self.assertEqual(status, 2, output)
                    self.assertNotIn("OK: imagem backend", output)
                    self.assertIn("backend executa como root" if uid == "0" else "UID inválido", output)


if __name__ == "__main__":
    unittest.main()

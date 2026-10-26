"""Regressões estruturais em repositórios Git temporários, sem aplicação ou SQL."""

import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


CHECKER = Path(__file__).resolve().parents[2] / "scripts/check_repository.py"


class RepositoryChecksTest(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory(prefix="repository-check-test-")
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.environment = {key: value for key, value in os.environ.items()
                            if key not in ("CI_BASE_SHA", "CI_HEAD_SHA")}
        self.environment["LC_ALL"] = "C"
        self.git("init", "--quiet")
        self.git("config", "user.name", "Teste Sintético")
        self.git("config", "user.email", "repository-check@example.invalid")
        (self.root / "script.py").write_text("value = 1\n")
        (self.root / "script.sh").write_text("#!/usr/bin/env bash\nprintf 'sintético\\n'\n")
        self.commit()
        self.base = self.git("rev-parse", "HEAD").stdout.strip()

    def git(self, *arguments):
        return subprocess.run(["git", *arguments], cwd=self.root, env=self.environment,
                              capture_output=True, text=True, check=True)

    def commit(self):
        self.git("add", "--all")
        self.git("commit", "--quiet", "-m", "chore: fixture sintética")

    def check(self, **environment):
        return subprocess.run([sys.executable, str(CHECKER)], cwd=self.root,
                              env={**self.environment, **environment},
                              capture_output=True, text=True, timeout=15)

    def test_clean_commit_range_and_syntax_pass_without_executing_scripts(self):
        (self.root / "script.py").write_text("raise RuntimeError('não deve executar')\n")
        (self.root / "script.sh").write_text("#!/usr/bin/env bash\nexit 37\n")
        self.commit()
        result = self.check(CI_BASE_SHA=self.base)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("1 Python e 1 Bash", result.stdout)
        self.assertIn("OK: whitespace em commits", result.stdout)

    def test_invalid_python_syntax_is_a_failure(self):
        (self.root / "script.py").write_text("if True print('erro')\n")
        result = self.check()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("script.py:1", result.stderr)

    def test_invalid_bash_syntax_is_a_failure(self):
        (self.root / "script.sh").write_text("#!/usr/bin/env bash\nif true; then\n")
        result = self.check()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("script.sh", result.stderr)

    def test_committed_whitespace_is_detected_with_a_clean_working_tree(self):
        (self.root / "README.md").write_text("Texto sintético com espaço final  \n")
        self.commit()
        self.assertEqual(self.git("diff", "--check").stdout, "")
        self.assertEqual(self.git("status", "--short").stdout, "")
        result = self.check(CI_BASE_SHA=self.base)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("whitespace em commits", result.stderr)
        self.assertIn("README.md", result.stderr)

    def test_staged_whitespace_is_detected(self):
        (self.root / "README.md").write_text("Texto sintético com espaço final  \n")
        self.git("add", "README.md")
        result = self.check()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("whitespace em index", result.stderr)

    def test_manual_or_zero_base_checks_the_previous_commit(self):
        (self.root / "README.md").write_text("Texto sintético com espaço final  \n")
        self.commit()
        for base in ("", "0" * 40):
            with self.subTest(base=base):
                result = self.check(CI_BASE_SHA=base)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("whitespace em commits", result.stderr)

    def test_invalid_base_reference_fails_without_becoming_a_git_option(self):
        result = self.check(CI_BASE_SHA="--help")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Referência Git inválida", result.stderr)


if __name__ == "__main__":
    unittest.main()

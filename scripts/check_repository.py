#!/usr/bin/env python3
"""Verifica sintaxe e diffs versionados sem executar código da aplicação ou SQL."""

import os
from pathlib import Path
import subprocess
import sys


def git(root, *arguments):
    return subprocess.run(
        ["git", *arguments], cwd=root, capture_output=True, text=True,
        encoding="utf-8", errors="replace",
    )


def resolve_commit(root, reference, required=True):
    result = git(root, "rev-parse", "--verify", "--end-of-options", reference + "^{commit}")
    if result.returncode:
        if required:
            raise ValueError(f"Referência Git inválida para validação: {reference}")
        return None
    return result.stdout.strip()


def check(root):
    head = resolve_commit(root, os.environ.get("CI_HEAD_SHA") or "HEAD")
    base_reference = os.environ.get("CI_BASE_SHA", "")
    if base_reference and set(base_reference) != {"0"}:
        base = resolve_commit(root, base_reference)
    else:
        base = resolve_commit(root, head + "^", required=False)

    files = git(root, "ls-files", "-z", "--", "*.py", "*.sh")
    if files.returncode:
        raise ValueError("Não foi possível listar os scripts versionados")
    failures = 0
    python_count = shell_count = 0
    for name in filter(None, files.stdout.split("\0")):
        path = root / name
        if name.endswith(".py"):
            python_count += 1
            try:
                compile(path.read_bytes(), name, "exec")
            except SyntaxError as error:
                print(f"FALHA: {name}:{error.lineno}: {error.msg}", file=sys.stderr)
                failures += 1
            except (OSError, ValueError) as error:
                print(f"FALHA: {name}: {error}", file=sys.stderr)
                failures += 1
        else:
            shell_count += 1
            result = subprocess.run(["bash", "-n", str(path)], capture_output=True, text=True)
            if result.returncode:
                print(result.stdout + result.stderr, end="", file=sys.stderr)
                failures += 1
    print(f"Sintaxe verificada: {python_count} Python e {shell_count} Bash")

    checks = [("working tree", ()), ("index", ("--cached",))]
    if base:
        checks.append((f"commits {base[:12]}..{head[:12]}", (base, head)))
    else:
        print("Sem commit anterior: range commitado não se aplica")
    for label, arguments in checks:
        result = git(root, "diff", "--check", *arguments, "--")
        if result.returncode:
            print(f"FALHA: whitespace em {label}", file=sys.stderr)
            print(result.stdout + result.stderr, end="", file=sys.stderr)
            failures += 1
        else:
            print(f"OK: whitespace em {label}")
    return 1 if failures else 0


def main():
    root = git(Path.cwd(), "rev-parse", "--show-toplevel")
    if root.returncode:
        print("FALHA: execute dentro de um repositório Git", file=sys.stderr)
        return 1
    try:
        return check(Path(root.stdout.strip()))
    except (OSError, ValueError) as error:
        print(f"FALHA: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

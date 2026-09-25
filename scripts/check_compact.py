#!/usr/bin/env python3
"""Executa uma validação com log privado e resumo, sem mascarar seu resultado."""

import argparse
from collections import deque
import os
from pathlib import Path
import re
import subprocess
import tempfile


def redactor(environment):
    sensitive_name = re.compile(
        r"PASSWORD|PASSWD|SECRET|TOKEN|CREDENTIAL|(?:^|_)KEY$|^(?:DATABASE|DB)_URL$",
        re.IGNORECASE,
    )
    secrets = {
        part
        for name, value in environment.items()
        if sensitive_name.search(name)
        for part in value.splitlines()
        if part
    }
    pattern = (
        re.compile("|".join(re.escape(s) for s in sorted(secrets, key=len, reverse=True)))
        if secrets else None
    )

    def redact(text):
        if pattern:
            text = pattern.sub("[REDACTED]", text)
        return re.sub(
            r"(\b[a-zA-Z][a-zA-Z0-9+.-]*://[^\s/:@]+:)[^\s/@]+@",
            r"\1[REDACTED]@",
            text,
        )

    return redact


def run(command, label, show_git_status=False):
    redact = redactor(os.environ)
    folder = Path(tempfile.mkdtemp(prefix="ambulatorio-check-", dir="/tmp"))
    log_path = folder / "output.log"
    tail = deque(maxlen=30)
    print(f"Executando: {redact(label)}\nLog: {log_path}", flush=True)
    descriptor = os.open(log_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as log:
        def record(line):
            clean = redact(line)
            log.write(clean)
            log.flush()
            tail.append(clean)

        try:
            # Mantém os descritores do jobserver do Make em chamadas com -j.
            with subprocess.Popen(
                command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, encoding="utf-8", errors="replace", close_fds=False,
            ) as process:
                for line in process.stdout:
                    record(line)
                status = process.wait()
                if status < 0:
                    status = 128 - status
        except OSError as error:
            record(f"Erro ao executar validação: {error}\n")
            status = 127 if isinstance(error, FileNotFoundError) else 126

        if show_git_status:
            git = subprocess.run(
                ["git", "status", "--short"], capture_output=True, text=True,
                encoding="utf-8", errors="replace",
            )
            print("git status --short:", flush=True)
            print(redact(git.stdout + git.stderr) or "(limpo)\n", end="", flush=True)
            if git.returncode:
                record(git.stderr)
                status = status or git.returncode

    result = "OK" if status == 0 else "FALHA"
    print(f"{result} (código {status}): {redact(label)}\nLog: {log_path}", flush=True)
    if status:
        print("Trecho final do log (até 30 linhas / 6000 caracteres):", flush=True)
        print("".join(tail)[-6000:], end="", flush=True)
    return status


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--label", required=True)
    parser.add_argument("--git-status", action="store_true")
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    if not command:
        parser.error("informe o comando após --")
    return run(command, args.label, args.git_status)


if __name__ == "__main__":
    raise SystemExit(main())

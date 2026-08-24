"""Adaptador pequeno para uma sessão transacional persistente do psql."""

from __future__ import annotations

import os
import subprocess
import uuid


def literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


class Database:
    def __init__(self, host: str, port: str, user: str, name: str, password: str | None):
        env = os.environ.copy()
        if password:
            env["PGPASSWORD"] = password
        self.process = subprocess.Popen(
            ["psql", "-X", "-q", "-A", "-t", "-F", "\t", "-h", host,
             "-p", str(port), "-U", user, "-d", name],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, bufsize=1, env=env,
        )
        self.run("SET search_path TO ambulatorio, public")

    def run(self, sql: str) -> list[str]:
        token = uuid.uuid4().hex
        self.process.stdin.write(f"\\echo __BEGIN_{token}__\n{sql.rstrip(';')};\n\\echo __END_{token}__\n")
        self.process.stdin.flush()
        inside = False
        output: list[str] = []
        for raw in self.process.stdout:
            line = raw.rstrip("\n")
            if line == f"__BEGIN_{token}__":
                inside = True
            elif line == f"__END_{token}__":
                break
            elif inside and line:
                output.append(line)
        errors = [line for line in output if "ERROR:" in line or "FATAL:" in line]
        if errors:
            raise RuntimeError(" | ".join(errors))
        return [line for line in output if not line.startswith(("NOTICE:", "WARNING:"))]

    def scalar(self, sql: str) -> str | None:
        rows = self.run(sql)
        return rows[-1] if rows else None

    def close(self):
        if self.process.poll() is None:
            self.process.stdin.write("\\q\n")
            self.process.stdin.flush()
            self.process.wait(timeout=5)

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()

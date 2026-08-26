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
    def __init__(self, host: str, port: str, user: str, name: str, password: str | None,
                 rollback_only: bool = False, role: str | None = None):
        env = os.environ.copy()
        if password:
            env["PGPASSWORD"] = password
        self.process = subprocess.Popen(
            ["psql", "-X", "-q", "-A", "-t", "-F", "\t", "-h", host,
             "-p", str(port), "-U", user, "-d", name],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, bufsize=1, env=env,
        )
        self.rollback_only = rollback_only
        self.savepoint_active = False
        if role:
            if not role.replace("_", "").isalnum():
                raise ValueError("role PostgreSQL inválida")
            self.run(f'SET ROLE "{role}"')
        self.run("SET search_path TO ambulatorio, public")
        if rollback_only:
            self.run("BEGIN")

    def transaction(self, command: str) -> None:
        """Mantém o caminho transacional por linha dentro do rollback do dry-run."""
        if not self.rollback_only:
            self.run(command)
            return
        if command == "BEGIN":
            self.run("SAVEPOINT importador_linha")
            self.savepoint_active = True
        elif command == "COMMIT":
            self.run("RELEASE SAVEPOINT importador_linha")
            self.savepoint_active = False
        elif command == "ROLLBACK" and self.savepoint_active:
            self.run("ROLLBACK TO SAVEPOINT importador_linha")
            self.run("RELEASE SAVEPOINT importador_linha")
            self.savepoint_active = False
        else:
            self.run(command)

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
            if self.rollback_only:
                self.run("ROLLBACK")
            self.process.stdin.write("\\q\n")
            self.process.stdin.flush()
            self.process.wait(timeout=5)

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()

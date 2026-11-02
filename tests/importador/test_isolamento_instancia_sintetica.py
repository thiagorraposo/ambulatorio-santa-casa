#!/usr/bin/env python3
"""PoC 8C2B.1: dois clusters próprios; nenhum endpoint/configuração externo é aceito.

Executar: python3 tests/importador/test_isolamento_instancia_sintetica.py
Requer PostgreSQL 16 em /usr/lib/postgresql/16/bin e usuário não root.
"""

import hashlib
import json
import os
from pathlib import Path
import signal
import secrets
import socket
import subprocess
import sys
import tempfile
import time
import zipfile

ROOT = Path(__file__).resolve().parents[2]
BIN = Path('/usr/lib/postgresql/16/bin')
sys.path.insert(0, str(ROOT / 'scripts'))
sys.path.insert(0, str(ROOT))
from importar_planilha import Importer  # noqa: E402
from importador.psql import Database  # noqa: E402
from tests.importador.gerar_planilha_sintetica import (  # noqa: E402
    MANIFEST, OUTPUT, row, sheet_xml, write_stable,
)

# Ambiente limpo: não lê .env, service/passfile ou PGOPTIONS do operador.
ENV = {key: value for key, value in os.environ.items()
       if not key.startswith(('PG', 'DB_', 'F13_'))}
ENV.update(PATH=str(BIN) + os.pathsep + os.environ.get('PATH', ''),
           PGPASSFILE='/nonexistent-poc-passfile', PGCONNECT_TIMEOUT='3')
WORKER = 'poc_worker_isolado'
PASSWORD = secrets.token_urlsafe(24)
NAME = 'poc_sintetica'


def command(args, *, env=None, timeout=90, check=True):
    result = subprocess.run([str(arg) for arg in args], cwd=ROOT,
                            env=env or ENV, capture_output=True, text=True,
                            timeout=timeout)
    if check and result.returncode:
        raise RuntimeError(f'{Path(str(args[0])).name} falhou: {result.stderr[-2400:]}')
    return result


class Cluster:
    def __init__(self, parent, label):
        self.path = parent / label
        self.path.mkdir()
        self.data = self.path / 'data'
        self.admin = 'poc_supervisor_' + label
        self.started = False
        with socket.socket() as candidate:
            candidate.bind(('127.0.0.1', 0))
            self.port = candidate.getsockname()[1]
        assert self.port not in {55483, 6061, 4176, 6065, 4180}
        command([BIN / 'initdb', '-D', self.data, '-U', self.admin,
                 '--auth-local=trust', '--auth-host=scram-sha-256', '--no-locale', '-E', 'UTF8'])
        # Supervisor usa socket local próprio; TCP exige SCRAM inclusive
        # para o administrador. Não há regra TCP trust.
        with (self.data / 'postgresql.conf').open('a') as stream:
            stream.write(f"\nlisten_addresses='127.0.0.1'\nport={self.port}\n"
                         f"unix_socket_directories='{self.path}'\n"
                         "shared_buffers='16MB'\nmax_connections=12\n")
        try:
            command([BIN / 'pg_ctl', '-D', self.data, '-l', self.path / 'server.log',
                     '-w', '-t', '20', 'start'])
        except BaseException:
            command([BIN / 'pg_ctl', '-D', self.data, '-m', 'immediate', '-w',
                     '-t', '20', 'stop'], check=False)
            raise
        self.started = True

    def args(self, database=NAME, user=None):
        return ['-h', '127.0.0.1' if user else str(self.path), '-p', str(self.port), '-U', user or self.admin, '-d', database]

    def sql(self, sql, database=NAME):
        return command([BIN / 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
                        *self.args(database), '-c', sql]).stdout.strip()

    def db(self, *, role=None):
        return Database(str(self.path), str(self.port), self.admin, NAME, None, role=role)

    def stop(self):
        if self.started:
            command([BIN / 'pg_ctl', '-D', self.data, '-m', 'immediate', '-w',
                     '-t', '20', 'stop'])
            self.started = False


def snapshot(cluster):
    with cluster.db() as db:
        tables = db.run("SELECT tablename FROM pg_tables WHERE schemaname='ambulatorio' ORDER BY 1")
        sequences = db.run("SELECT sequencename FROM pg_sequences WHERE schemaname='ambulatorio' ORDER BY 1")
        result = {}
        for table in tables:
            result['table:' + table] = db.scalar(
                "SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t))::text,'[]')) "
                f'FROM ambulatorio."{table}" t')
        for sequence in sequences:
            result['sequence:' + sequence] = db.scalar(
                f'SELECT last_value::text || \':\' || is_called::text FROM ambulatorio."{sequence}"')
        return result


def workbook(path):
    replacements = {}
    for index, spec in enumerate(MANIFEST['sheets'], 1):
        columns = spec['columns']
        rows = [[column['cabecalho_original'] for column in columns]]
        if index == 1:
            rows += [
                row(columns, id='POC-INVALIDO', nome='Nascimento Inválido Sintético',
                    data_de_nascimento='inválida', data_do_atendimento='01/02/2026'),
                row(columns, id='F13-SINT', nome='Paciente Temporal Sintético',
                    data_de_nascimento='01/01/1990', data_do_atendimento='03/01/2026'),
                row(columns, id='POC-CATALOGO', nome='Catálogo Ausente Sintético',
                    data_de_nascimento='01/01/1980', data_do_atendimento='01/02/2026',
                    sami_trop_1_1='sim'),
                row(columns, id='POC-NOVO', nome='Paciente Novo Sintético',
                    data_de_nascimento='01/01/1981', data_do_atendimento='02/02/2026'),
            ]
        replacements[f'xl/worksheets/sheet{index}.xml'] = sheet_xml(rows)
    with zipfile.ZipFile(OUTPUT) as source, zipfile.ZipFile(path, 'w') as target:
        for name in source.namelist():
            write_stable(target, name, replacements.get(name, source.read(name)))


def worker_args(cluster, source, report, *, dry=False, code='poc-retomada', purpose='carga_inicial', reprocess=False):
    args = [sys.executable, ROOT / 'scripts/importar_planilha.py', source,
            '--codigo-lote', code, '--finalidade', purpose,
            '--quality-report', report, '--db-host', '127.0.0.1',
            '--db-port', str(cluster.port), '--db-name', NAME,
            '--db-user', WORKER, '--db-role', 'ambulatorio_importador']
    if dry:
        args.append('--dry-run')
    if reprocess:
        args.append('--reprocessar')
    return [str(arg) for arg in args]


def main():
    assert os.geteuid() != 0, 'initdb exige usuário local não root'
    assert (BIN / 'initdb').is_file(), 'Requer binários locais PostgreSQL 16'
    assert OUTPUT.is_file(), 'Requer fixture sintética versionada'
    # Também limpa PG* do processo usado por Database, sem importar .env.
    os.environ.clear()
    os.environ.update(ENV)
    origin = isolated = None
    with tempfile.TemporaryDirectory(prefix='m3-poc-isolamento-') as directory:
        task = Path(directory)
        try:
            origin = Cluster(task, 'origem')
            isolated = Cluster(task, 'isolado')
            assert origin.port != isolated.port
            print('Clusters próprios iniciados; execução sequencial e dados sintéticos.', flush=True)
            command([BIN / 'createdb', *origin.args('postgres')[:-2], NAME])
            origin.sql('CREATE ROLE ambulatorio_user NOLOGIN; CREATE SCHEMA ambulatorio AUTHORIZATION ambulatorio_user; '
                       f'ALTER DATABASE {NAME} SET search_path TO ambulatorio,public')
            for migration in sorted((ROOT / 'sql').glob('[0-9][0-9]_*.sql')):
                if int(migration.name[:2]) < 2:
                    continue
                command([BIN / 'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1',
                         *origin.args(), '-f', migration])
            seed_password = secrets.token_urlsafe(24)
            origin.sql(f"CREATE ROLE poc_seed LOGIN PASSWORD '{seed_password}'; "
                       'GRANT ambulatorio_importador TO poc_seed')
            seed_env = {**ENV, 'PGPASSWORD': seed_password, 'DB_HOST': str(origin.path),
                        'DB_PORT': str(origin.port), 'DB_USER': origin.admin,
                        'F13_IMPORT_USER': 'poc_seed', 'F13_IMPORT_PASSWORD': seed_password,
                        'F13_DB_NAME': NAME}
            # Reutiliza a prova F13 para criar proveniência e uma correção aprovada,
            # sem reproduzir manualmente contextos/triggers protegidos.
            command([sys.executable, ROOT / 'tests/importador/test_reprocessamento_temporal.py'], env=seed_env)
            origin.sql("DELETE FROM ambulatorio.projeto_estudo WHERE codigo_projeto='sami_trop_1_1'")
            source = task / 'carga.xlsx'
            workbook(source)
            with origin.db(role='ambulatorio_importador') as db:
                staged = Importer(db, source, MANIFEST, 'poc-retomada', purpose='carga_inicial')
                staged.validate_layout()
                assert staged.prepare_lot()
                staged.stage()
            assert origin.sql("SELECT count(*) FROM ambulatorio.paciente WHERE codigo_planilha='F13-SINT'") == '1'
            assert int(origin.sql('SELECT count(*) FROM ambulatorio.importacao_registro')) > 0
            assert int(origin.sql('SELECT count(*) FROM ambulatorio.auditoria_campo_evento')) > 0
            assert origin.sql("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p','S') AND n.nspname<>'ambulatorio' AND n.nspname<>'information_schema' AND n.nspname NOT LIKE 'pg_%'") == '0'
            baseline = snapshot(origin)
            assert len(baseline) > 50
            dump = task / 'snapshot.dump'
            roles = command([BIN / 'pg_dumpall', *origin.args('postgres')[:-2], '--roles-only']).stdout
            rolefile = task / 'roles.sql'
            # PG16 exige o grantor bootstrap (oid=10), não só SUPERUSER
            # homônimo. Mantém a identidade original e restaura ALTER/GRANT
            # sem normalizar ACLs; supervisor do clone continua separado.
            isolated.sql('CREATE ROLE poc_restore SUPERUSER LOGIN', 'postgres')
            command([BIN / 'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1',
                     '-h', isolated.path, '-U', 'poc_restore', '-p', str(isolated.port),
                     '-d', 'postgres', '-c',
                     f'ALTER ROLE {isolated.admin} RENAME TO {origin.admin}; '
                     f'CREATE ROLE {isolated.admin} SUPERUSER LOGIN'])
            isolated.sql('DROP ROLE poc_restore', 'postgres')
            assert roles.count(f'CREATE ROLE {origin.admin};') == 1
            rolefile.write_text(roles.replace(f'CREATE ROLE {origin.admin};', ''))
            command([BIN / 'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1',
                     *isolated.args('postgres'), '-f', rolefile])
            command([BIN / 'pg_dump', *origin.args(), '-Fc', '-f', dump])
            isolated.sql(f"CREATE ROLE {WORKER} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD '{PASSWORD}'; "
                         f'GRANT ambulatorio_importador TO {WORKER}', 'postgres')

            def restore():
                isolated.sql(f'DROP DATABASE IF EXISTS {NAME} WITH (FORCE)', 'postgres')
                command([BIN / 'createdb', *isolated.args('postgres')[:-2], NAME])
                command([BIN / 'pg_restore', *isolated.args(), '--exit-on-error', dump])
                isolated.sql(f'ALTER DATABASE {NAME} SET search_path TO ambulatorio,public')
                assert snapshot(isolated) == baseline, 'Estado inicial não equivalente'

            restore()
            # CHECKs com arrays podem ser deparseados com casts equivalentes
            # após restore PG16. Compara catálogos de capacidades/estrutura e
            # funções/triggers literalmente; restore não omite constraints.
            def structure(cluster):
                queries = [
                    "SELECT c.relname,c.relkind,r.rolname,COALESCE(c.relacl,acldefault(CASE WHEN c.relkind='S' THEN 's'::\"char\" ELSE 'r'::\"char\" END,c.relowner))::text AS relacl,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner WHERE n.nspname='ambulatorio' ORDER BY 1",
                    "SELECT n.nspname,r.rolname,COALESCE(n.nspacl,acldefault('n',n.nspowner))::text AS nspacl FROM pg_namespace n JOIN pg_roles r ON r.oid=n.nspowner WHERE n.nspname='ambulatorio'",
                    "SELECT c.relname,a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,a.attidentity,a.attgenerated,a.attacl::text FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ambulatorio' AND a.attnum>0 AND NOT a.attisdropped ORDER BY 1,a.attnum",
                    "SELECT c.relname,a.attname,pg_get_expr(d.adbin,d.adrelid) FROM pg_attrdef d JOIN pg_class c ON c.oid=d.adrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=d.adnum WHERE n.nspname='ambulatorio' ORDER BY 1,2",
                    "SELECT r.rolname,n.nspname,d.defaclobjtype,d.defaclacl::text FROM pg_default_acl d JOIN pg_roles r ON r.oid=d.defaclrole LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace ORDER BY 1,2,3",
                    "SELECT p.proname,pg_get_function_identity_arguments(p.oid),r.rolname,COALESCE(p.proacl,acldefault('f',p.proowner))::text AS proacl,pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE n.nspname='ambulatorio' ORDER BY 1,2",
                    "SELECT c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ambulatorio' AND NOT t.tgisinternal ORDER BY 1,2",
                    "SELECT c.relname,k.conname,k.contype,k.condeferrable,k.condeferred,k.convalidated,CASE WHEN k.contype<>'c' THEN pg_get_constraintdef(k.oid) END FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ambulatorio' ORDER BY 1,2",
                    "SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls FROM pg_roles WHERE rolname NOT IN ('poc_worker_isolado','poc_supervisor_isolado') ORDER BY 1",
                    "SELECT r.rolname,u.rolname,g.rolname,m.admin_option,m.inherit_option,m.set_option FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member JOIN pg_roles g ON g.oid=m.grantor WHERE u.rolname<>'poc_worker_isolado' ORDER BY 1,2,3",
                ]
                return [cluster.sql("SELECT COALESCE(jsonb_agg(to_jsonb(q))::text,'[]') FROM (" + query + ') q') for query in queries]
            for index, (left, right) in enumerate(zip(structure(origin), structure(isolated))):
                if left != right:
                    left_rows, right_rows = json.loads(left), json.loads(right)
                    mismatch = next(((a, b) for a, b in zip(left_rows, right_rows) if a != b), (len(left_rows), len(right_rows)))
                    raise AssertionError(f'Estrutura/ACL/ownership/grantor divergente ({index}): {mismatch}')
            assert isolated.sql(f"SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls FROM pg_roles WHERE rolname='{WORKER}'") == 'f'
            assert isolated.sql(f"SELECT string_agg(r.rolname,',') FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid JOIN pg_roles u ON u.oid=m.member WHERE u.rolname='{WORKER}'") == 'ambulatorio_importador'
            assert isolated.sql(f"SELECT count(*) FROM pg_class c JOIN pg_roles r ON r.oid=c.relowner WHERE r.rolname='{WORKER}'") == '0'
            assert int(isolated.sql("SELECT count(*) FROM pg_constraint k JOIN pg_namespace n ON n.oid=k.connamespace WHERE n.nspname='ambulatorio' AND k.condeferrable AND k.condeferred")) > 0
            for denied_sql in (f'SET ROLE {origin.admin}', 'CREATE DATABASE poc_proibido'):
                refused = command([BIN / 'psql', '-X', '-v', 'ON_ERROR_STOP=1',
                                   *isolated.args(user=WORKER), '-c', denied_sql],
                                  env={**ENV, 'PGPASSWORD': PASSWORD}, check=False)
                assert refused.returncode != 0 and 'permission denied' in refused.stderr
            denied = command([BIN / 'psql', '-X', *origin.args(user=WORKER), '-c', 'SELECT 1'],
                             env={**ENV, 'PGPASSWORD': PASSWORD}, check=False)
            assert denied.returncode != 0 and 'password authentication failed' in denied.stderr
            assert origin.sql(f"SELECT count(*) FROM pg_roles WHERE rolname='{WORKER}'") == '0'
            assert snapshot(origin) == baseline
            env = {**ENV, 'PGPASSWORD': PASSWORD}

            def execute(label, **options):
                report = task / (label + '.json')
                result = command(worker_args(isolated, source, report, **options), env=env, check=False)
                assert snapshot(origin) == baseline, 'Origem mudou durante ' + label
                return result, json.loads(report.read_text()) if report.exists() else None

            simulation, dry_report = execute('simulacao', dry=True)
            assert simulation.returncode == 0
            print('Relatório sintético:', json.dumps(dry_report['metrics'], sort_keys=True), flush=True)
            assert dry_report['metrics']['total_rows'] == 4
            assert dry_report['metrics']['unknown_catalogs'] >= 1
            assert dry_report['issue_counts'].get('data_invalida') == 1
            assert snapshot(isolated) != baseline, 'Dry-run deve evidenciar avanço de sequências somente no clone'
            restore()
            application, apply_report = execute('aplicacao')
            assert application.returncode == 0
            assert {k: v for k, v in dry_report.items() if k != 'mode'} == {
                k: v for k, v in apply_report.items() if k != 'mode'}, 'Relatórios divergem; investigar constraints diferidas'
            # O estado corrente corrigido não pode voltar à ocorrência antiga.
            assert isolated.sql("SELECT data_atendimento::text FROM ambulatorio.atendimento a JOIN ambulatorio.paciente p USING(paciente_id) WHERE p.codigo_planilha='F13-SINT' ORDER BY data_atendimento LIMIT 1") == '2026-01-02'
            assert isolated.sql("SELECT count(*) FROM ambulatorio.paciente WHERE codigo_planilha='F13-SINT'") == '1'
            before_noop = snapshot(isolated)
            noop, noop_report = execute('noop', purpose='mesmo_conteudo')
            assert noop.returncode == 0 and noop_report['metrics'] == apply_report['metrics']
            assert snapshot(isolated) == before_noop
            reprocessed, reprocessed_report = execute('reprocessamento', purpose='mesmo_conteudo',
                                                     code='poc-reprocessado', reprocess=True)
            assert reprocessed.returncode == 0 and reprocessed_report is not None
            print('OK: estado discriminante, schema/ACLs, credencial, simulação/aplicação, no-op e reprocessamento.', flush=True)

            # Erro operacional de conexão e cancelamento com contenção no clone.
            restore()
            with socket.socket() as unused:
                unused.bind(('127.0.0.1', 0))
                unavailable = unused.getsockname()[1]
                args = worker_args(isolated, source, task / 'indisponivel.json')
                args[args.index('--db-port') + 1] = str(unavailable)
                failed = command(args, env=env, check=False)
                assert failed.returncode != 0
            assert not (task / 'indisponivel.json').exists()
            with isolated.db() as blocker:
                blocker.run('BEGIN; LOCK TABLE ambulatorio.importacao_lote IN ACCESS EXCLUSIVE MODE')
                process = subprocess.Popen(worker_args(isolated, source, task / 'cancelado.json'),
                                           cwd=ROOT, env=env, stdout=subprocess.DEVNULL,
                                           stderr=subprocess.DEVNULL, start_new_session=True)
                try:
                    deadline = time.monotonic() + 15
                    while time.monotonic() < deadline:
                        waiting = isolated.sql(f"SELECT count(*) FROM pg_stat_activity WHERE usename='{WORKER}' AND wait_event_type='Lock'")
                        if waiting != '0':
                            break
                        assert process.poll() is None, 'Worker encerrou antes da contenção'
                        time.sleep(0.1)
                    else:
                        raise AssertionError('Worker não atingiu contenção de lock')
                    assert snapshot(origin) == baseline
                finally:
                    if process.poll() is None:
                        os.killpg(process.pid, signal.SIGTERM)
                    process.wait(timeout=5)
                    blocker.run('ROLLBACK')
            assert not (task / 'cancelado.json').exists()
            assert snapshot(origin) == baseline
            digest = hashlib.sha256(json.dumps(baseline, sort_keys=True).encode()).hexdigest()
            print(f'OK: origem imutável ({sum(k.startswith("table:") for k in baseline)} tabelas, '
                  f'{sum(k.startswith("sequence:") for k in baseline)} sequências; sha256={digest}); '
                  'erro operacional e cancelamento com lock no clone. Sem integração H14.')
        finally:
            try:
                if isolated:
                    isolated.stop()
            finally:
                if origin:
                    origin.stop()


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Ambiente local descartável; nunca carrega .env nem reutiliza bancos existentes."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
KEY = hashlib.sha256(str(ROOT).encode()).hexdigest()[:12]
DIRECTORY = Path(tempfile.gettempdir()) / f'ambulatorio-dev-{os.getuid()}-{KEY}'
LABEL = 'br.ambulatorio.dev-sintetico'


def identity(pid):
    try:
        # Campo 22 de /proc/PID/stat; comm pode conter espaços e parênteses.
        fields = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
        return None if fields[0] == 'Z' else fields[19]
    except (OSError, IndexError):
        return None


def alive(state):
    return state['identity'] is not None and identity(state['pid']) == state['identity']


def docker(*args, check=True, **kwargs):
    return subprocess.run(['docker', *args], check=check, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, **kwargs)


def container_owned(state):
    result = docker('inspect', '--format', '{{json .Config.Labels}}', state['container'], check=False)
    return result.returncode == 0 and json.loads(result.stdout).get(LABEL) == state['token']


def stop_container(state):
    if container_owned(state):
        docker('stop', '--time', '10', state['container'])


def load_state():
    path = DIRECTORY / 'state.json'
    return json.loads(path.read_text()) if path.exists() else None


def available(port):
    with socket.socket() as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(('127.0.0.1', port))


def healthy(port, path):
    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{port}{path}', timeout=1) as response:
            return response.status == 200
    except (OSError, ValueError):
        return False


def status(state):
    running = bool(state and alive(state))
    ready = running and healthy(state['api'], '/v1/health') and healthy(state['web'], '/login')
    print('Estado: ' + ('pronto' if ready else 'inicializando ou indisponível' if running else 'parado'))
    if state:
        print(f"Frontend: http://127.0.0.1:{state['web']}\nAPI: http://127.0.0.1:{state['api']}")
        print(f'Logs sintéticos: {DIRECTORY / "runner.log"}')
    if ready:
        print('Usuários: frontend-consulta@example.invalid, frontend-edicao@example.invalid, frontend-administracao@example.invalid')
        print('Senha exclusivamente sintética: Etapa6-sintetica!')
    return ready


PROCESS_MARKER = 'AMBULATORIO_SYNTHETIC_PROCESS_TOKEN'


def marked_processes(state):
    """Abre pidfd antes de conferir ambiente; sinal nunca alcança PID reciclado."""
    token = state.get('process_token')
    if not token:
        return []
    marker = f'{PROCESS_MARKER}={token}'.encode()
    descriptors = []
    for path in Path('/proc').iterdir():
        if not path.name.isdigit() or int(path.name) in (os.getpid(), state.get('pid')):
            continue
        descriptor = None
        try:
            descriptor = os.pidfd_open(int(path.name))
            if path.stat().st_uid == os.getuid() and marker in (path / 'environ').read_bytes().split(b'\0'):
                descriptors.append(descriptor)
                descriptor = None
        except (OSError, ProcessLookupError):
            pass
        finally:
            if descriptor is not None:
                os.close(descriptor)
    return descriptors


def cleanup_marked_processes(state):
    descriptors = marked_processes(state)
    try:
        for descriptor in descriptors:
            try:
                signal.pidfd_send_signal(descriptor, signal.SIGTERM)
            except ProcessLookupError:
                pass
        if descriptors:
            import select
            remaining = set(descriptors)
            deadline = time.monotonic() + 5
            while remaining and time.monotonic() < deadline:
                exited, _, _ = select.select(list(remaining), [], [], .1)
                remaining.difference_update(exited)
            for descriptor in remaining:
                try:
                    signal.pidfd_send_signal(descriptor, signal.SIGKILL)
                except ProcessLookupError:
                    pass
    finally:
        for descriptor in descriptors:
            os.close(descriptor)


def stop(state):
    if not state:
        print('Estado: parado')
        return
    if alive(state):
        os.kill(state['pid'], signal.SIGTERM)
        deadline = time.monotonic() + 45
        while alive(state) and time.monotonic() < deadline:
            time.sleep(.2)
        if alive(state):
            raise RuntimeError('Runner ainda ativo; recursos preservados para inspeção.')
    cleanup_marked_processes(state)
    stop_container(state)
    print('Estado: parado; somente recursos exclusivos deste ambiente foram encerrados.')


def terminate_runner(child, expected_identity):
    """Sinaliza somente a sessão criada pelo supervisor, antes de reaproveitar PID."""
    if child.poll() is not None:
        return
    if identity(child.pid) != expected_identity or os.getpgid(child.pid) != child.pid:
        raise RuntimeError('Identidade do runner mudou; nenhum grupo foi sinalizado.')
    os.killpg(child.pid, signal.SIGTERM)
    try:
        child.wait(timeout=30)
    except subprocess.TimeoutExpired:
        if identity(child.pid) != expected_identity or os.getpgid(child.pid) != child.pid:
            raise RuntimeError('Identidade do runner mudou durante encerramento.')
        os.killpg(child.pid, signal.SIGKILL)
        child.wait(timeout=10)


def supervise():
    state = None
    for _ in range(100):
        state = load_state()
        if state and state.get('pid') == os.getpid():
            break
        time.sleep(.05)
    else:
        raise RuntimeError('Estado do supervisor não foi publicado.')
    child = subprocess.Popen(['bash', 'tests/frontend/test_e2e.sh', '--serve'], cwd=ROOT,
                             start_new_session=True)
    child_identity = identity(child.pid)
    stopping = False
    def terminate(_signum, _frame):
        nonlocal stopping
        stopping = True
    signal.signal(signal.SIGTERM, terminate)
    signal.signal(signal.SIGINT, terminate)
    try:
        failures = 0
        while child.poll() is None and not stopping:
            time.sleep(1)
            ready = 'Frontend sintético:' in (DIRECTORY / 'runner.log').read_text()
            if ready:
                failures = 0 if healthy(state['api'], '/v1/health') and healthy(state['web'], '/login') else failures + 1
                if failures >= 3:
                    print('Serviço sintético indisponível; encerrando o ambiente.', flush=True)
                    return 1
        return 0 if stopping else child.returncode
    finally:
        try:
            terminate_runner(child, child_identity)
        finally:
            try:
                cleanup_marked_processes(state)
            finally:
                stop_container(state)


def start(args):
    old = load_state()
    if old and alive(old):
        if not status(old):
            raise RuntimeError('Ambiente existente indisponível; consulte o log e execute stop antes de reiniciar.')
        return
    if old and container_owned(old):
        raise RuntimeError('Container anterior ainda existe; execute stop antes de iniciar novamente.')
    for tool in ('docker', 'node', 'psql', 'createdb', 'dropdb'):
        if not shutil.which(tool):
            raise RuntimeError(f'Dependência ausente: {tool}')
    for artifact in ('backend/dist/main.js', 'frontend/node_modules/vite/bin/vite.js'):
        if not (ROOT / artifact).is_file():
            raise RuntimeError('Execute make backend-install frontend-install backend-build antes de iniciar.')
    ports = [args.pg_port, args.api_port, args.web_port]
    if len(set(ports)) != 3:
        raise RuntimeError('As três portas precisam ser diferentes.')
    for port in ports:
        available(port)
    token = secrets.token_hex(16)
    name = f'ambulatorio-dev-{os.getuid()}-{KEY}'
    env = dict(os.environ)
    # Não herda configuração de conexões de usuários ou do Makefile/.env.
    for key in list(env):
        if key.startswith('PG') or key.startswith('APP_DB_') or key.startswith('SYNTHETIC_PG_'):
            env.pop(key)
    process_token = secrets.token_hex(32)
    env[PROCESS_MARKER] = process_token
    env.update(POSTGRES_PASSWORD=secrets.token_hex(32), POSTGRES_USER='sintetico', POSTGRES_DB='postgres')
    docker('run', '-d', '--rm', '--name', name, '--label', f'{LABEL}={token}',
           '--publish', f'127.0.0.1:{args.pg_port}:5432', '--tmpfs', '/var/lib/postgresql/data:rw',
           '--env', 'POSTGRES_PASSWORD', '--env', 'POSTGRES_USER', '--env', 'POSTGRES_DB',
           'postgres:16.15', env=env)
    state = dict(container=name, token=token, process_token=process_token, api=args.api_port, web=args.web_port, pg=args.pg_port)
    try:
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            if docker('exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'sintetico', '-d', 'postgres', check=False).returncode == 0:
                break
            time.sleep(.3)
        else:
            raise RuntimeError('PostgreSQL não ficou pronto.')
        env.update(SYNTHETIC_PG_HOST='127.0.0.1', SYNTHETIC_PG_PORT=str(args.pg_port),
                   SYNTHETIC_PG_USER='sintetico', PGPASSWORD=env.pop('POSTGRES_PASSWORD'),
                   FRONTEND_E2E_API_PORT=str(args.api_port), FRONTEND_E2E_WEB_PORT=str(args.web_port))
        with (DIRECTORY / 'runner.log').open('w') as log:
            process = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), '_run'],
                                       env=env, stdout=log, stderr=log, start_new_session=True)
        state.update(pid=process.pid, identity=identity(process.pid))
        (DIRECTORY / 'state.json').write_text(json.dumps(state))
        deadline = time.monotonic() + 120
        while time.monotonic() < deadline:
            if not alive(state):
                raise RuntimeError(f'Runner encerrou antes da prontidão; consulte {DIRECTORY / "runner.log"}.')
            # A mensagem é emitida somente depois de migrations, seed e readiness.
            if 'Frontend sintético:' in (DIRECTORY / 'runner.log').read_text() and healthy(args.api_port, '/v1/health') and healthy(args.web_port, '/login'):
                status(state)
                return
            time.sleep(.3)
        raise RuntimeError(f'Ambiente não ficou pronto; consulte {DIRECTORY / "runner.log"}.')
    except BaseException:
        if 'pid' in state:
            stop(state)
        else:
            stop_container(state)
        raise


def require_process_handles():
    if not hasattr(os, 'pidfd_open') or not hasattr(signal, 'pidfd_send_signal') or not Path('/proc/self/stat').exists():
        raise RuntimeError('Ambiente sintético exige Linux com /proc, suporte a pidfd e Python >= 3.9.')
    try:
        descriptor = os.pidfd_open(os.getpid())
        os.close(descriptor)
    except OSError as error:
        raise RuntimeError('Kernel Linux precisa permitir pidfd_open para encerrar recursos com segurança.') from error


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('start', 'status', 'stop', '_run'))
    for name, default in [('pg', 55458), ('api', 6062), ('web', 4177)]:
        parser.add_argument(f'--{name}-port', type=int, default=default)
    args = parser.parse_args()
    require_process_handles()
    os.umask(0o077)
    DIRECTORY.mkdir(mode=0o700, exist_ok=True)
    if DIRECTORY.is_symlink() or DIRECTORY.stat().st_uid != os.getuid() or DIRECTORY.stat().st_mode & 0o077:
        raise RuntimeError('Diretório de estado precisa ser privado e pertencer ao usuário atual.')
    if args.command == '_run':
        return supervise()
    for port in (args.pg_port, args.api_port, args.web_port):
        if not 1024 <= port <= 65535:
            parser.error('Portas devem estar entre 1024 e 65535.')
    with (DIRECTORY / 'lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if args.command == 'start':
            start(args)
        elif args.command == 'stop':
            stop(load_state())
        else:
            return 0 if status(load_state()) else 1
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (RuntimeError, OSError, subprocess.CalledProcessError) as error:
        # Comandos Docker usam senhas somente por ambiente, nunca na linha de comando.
        print(f'Falha: {error}', file=sys.stderr)
        sys.exit(1)

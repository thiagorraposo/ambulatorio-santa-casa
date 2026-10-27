"""Proteções de isolamento e ciclo de vida do ambiente sintético."""
import importlib.util
import contextlib
import io
import json
import os
from pathlib import Path
import socket
import secrets
import select
import signal
import sys
import subprocess
import unittest
from unittest.mock import Mock, patch

SPEC = importlib.util.spec_from_file_location('dev_sintetico', Path(__file__).resolve().parents[2] / 'scripts/dev_sintetico.py')
dev = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(dev)


class SyntheticDevelopmentTest(unittest.TestCase):
    def test_identity_tracks_real_process_and_rejects_stale_pid(self):
        self.assertIsNotNone(dev.identity(os.getpid()))
        self.assertTrue(dev.alive({'pid': os.getpid(), 'identity': dev.identity(os.getpid())}))
        self.assertFalse(dev.alive({'pid': os.getpid(), 'identity': 'stale'}))
        self.assertIsNone(dev.identity(999999999))

    def test_occupied_port_is_rejected_without_reusing_service(self):
        with socket.socket() as server:
            server.bind(('127.0.0.1', 0))
            with self.assertRaises(OSError):
                dev.available(server.getsockname()[1])

    def test_stop_ignores_container_with_foreign_label(self):
        state = {'container': 'synthetic', 'token': 'expected'}
        result = subprocess.CompletedProcess([], 0, json.dumps({dev.LABEL: 'foreign'}), '')
        with patch.object(dev, 'docker', return_value=result) as docker:
            dev.stop_container(state)
        self.assertEqual(docker.call_count, 1)
        self.assertEqual(docker.call_args.args[0], 'inspect')

    def test_stop_owned_container_only(self):
        state = {'container': 'synthetic', 'token': 'expected'}
        result = subprocess.CompletedProcess([], 0, json.dumps({dev.LABEL: 'expected'}), '')
        with patch.object(dev, 'docker', return_value=result) as docker:
            dev.stop_container(state)
        self.assertEqual(docker.call_args.args, ('stop', '--time', '10', 'synthetic'))

    def test_stop_does_not_signal_reused_pid(self):
        state = {'pid': os.getpid(), 'identity': 'stale', 'container': 'synthetic', 'token': 'expected'}
        with patch.object(dev.os, 'kill') as kill, patch.object(dev, 'stop_container') as stop, contextlib.redirect_stdout(io.StringIO()):
            dev.stop(state)
        kill.assert_not_called()
        stop.assert_called_once_with(state)

    def test_runner_shutdown_escalates_only_verified_group(self):
        child = Mock(pid=54321)
        child.poll.return_value = None
        child.wait.side_effect = [subprocess.TimeoutExpired('runner', 30), 0]
        with patch.object(dev, 'identity', return_value='same'), patch.object(dev.os, 'getpgid', return_value=54321), patch.object(dev.os, 'killpg') as kill:
            dev.terminate_runner(child, 'same')
        self.assertEqual([call.args for call in kill.call_args_list],
                         [(54321, dev.signal.SIGTERM), (54321, dev.signal.SIGKILL)])

    def test_runner_shutdown_rejects_recycled_identity(self):
        child = Mock(pid=54321)
        child.poll.return_value = None
        with patch.object(dev, 'identity', return_value='different'), patch.object(dev.os, 'killpg') as kill:
            with self.assertRaises(RuntimeError):
                dev.terminate_runner(child, 'expected')
        kill.assert_not_called()

    def test_cleanup_finds_orphan_after_runner_killed(self):
        token = secrets.token_hex(32)
        environment = dict(os.environ, **{dev.PROCESS_MARKER: token})
        runner = subprocess.Popen([sys.executable, '-c',
            'import subprocess,sys,time; subprocess.Popen([sys.executable,"-c","import os,time; print(os.getpid(),flush=True); time.sleep(60)"]); time.sleep(60)'],
            env=environment, stdout=subprocess.PIPE, text=True)
        descriptor = None
        try:
            # O próprio filho confirma que iniciou; o PID anunciado pelo pai
            # antes do exec não comprova prontidão nem uma identidade válida.
            self.assertTrue(select.select([runner.stdout], [], [], 5)[0], 'Filho não iniciou')
            orphan = int(runner.stdout.readline())
            descriptor = os.pidfd_open(orphan)
            expected_identity = dev.identity(orphan)
            self.assertIsNotNone(expected_identity)
            runner.kill()
            runner.wait(timeout=5)
            dev.cleanup_marked_processes({'pid': runner.pid, 'process_token': token})
            self.assertTrue(select.select([descriptor], [], [], 5)[0], 'Filho sobreviveu à limpeza')
            self.assertNotEqual(dev.identity(orphan), expected_identity)
        finally:
            if runner.poll() is None:
                runner.kill()
                runner.wait(timeout=5)
            runner.stdout.close()
            if descriptor is not None:
                try:
                    # O filho pode já ter saído; o handle nunca sinaliza PID reciclado.
                    signal.pidfd_send_signal(descriptor, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                finally:
                    os.close(descriptor)

    def test_preflight_rejects_unavailable_kernel_before_resources(self):
        with patch.object(dev.os, 'pidfd_open', side_effect=OSError('not supported')), patch.object(dev, 'docker') as docker:
            with self.assertRaisesRegex(RuntimeError, 'Kernel Linux'):
                dev.require_process_handles()
        docker.assert_not_called()

    def test_unready_status_is_non_successful(self):
        with patch.object(dev, 'alive', return_value=True), patch.object(dev, 'healthy', return_value=False), contextlib.redirect_stdout(io.StringIO()):
            self.assertFalse(dev.status({'api': 6062, 'web': 4177}))


if __name__ == '__main__':
    unittest.main()

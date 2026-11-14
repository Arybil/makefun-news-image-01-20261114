# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Arybil
"""Local Linux verification without Docker; does not call the sealed scorer."""
import hashlib
import json
import os
from pathlib import Path
import resource
import shutil
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]


def pin_cpu():
    os.sched_setaffinity(0, {min(os.sched_getaffinity(0))})


def verify():
    if not shutil.which('bwrap'):
        raise RuntimeError('bubblewrap is required for this development check')
    records = []
    with tempfile.TemporaryDirectory(prefix='news-image-sandbox-') as scratch:
        for index in range(2):
            output = Path(scratch) / str(index)
            output.mkdir(mode=0o777)
            output.chmod(0o777)
            command = [
                'bwrap', '--tmpfs', '/', '--ro-bind', '/usr', '/usr',
                '--ro-bind', '/lib', '/lib', '--ro-bind', '/lib64', '/lib64',
                '--ro-bind', '/bin', '/bin', '--ro-bind', '/etc', '/etc',
                '--ro-bind', str(ROOT), '/bot',
                '--bind', str(output), '/output', '--tmpfs', '/tmp',
                '--proc', '/proc', '--dev', '/dev',
                '--unshare-user', '--unshare-net', '--unshare-pid', '--unshare-ipc',
                '--uid', '65534', '--gid', '65534', '--cap-drop', 'ALL',
                '--die-with-parent', '--new-session', '--clearenv',
                '--setenv', 'PATH', '/usr/bin:/bin', '--setenv', 'TZ', 'UTC',
                '--setenv', 'LANG', 'C.UTF-8', '--chdir', '/bot',
                '/bin/bash', '--noprofile', '--norc', '-c',
                'ulimit -u 64; ulimit -t 60; exec node /bot/main.ts',
            ]
            started = time.monotonic()
            run = subprocess.run(command, capture_output=True, text=True,
                                 timeout=60, preexec_fn=pin_cpu)
            elapsed = time.monotonic() - started
            if run.returncode != 0:
                raise RuntimeError(f'run {index} failed: {run.stderr}')
            assert run.stdout == '' and run.stderr == ''
            assert sorted(p.name for p in output.iterdir()) == ['entry.png']
            artifact = (output / 'entry.png').read_bytes()
            assert artifact == (ROOT / 'entry.png').read_bytes()
            records.append({'run': index + 1, 'exit': run.returncode,
                            'wall_seconds': round(elapsed, 4),
                            'bytes': len(artifact),
                            'sha256': hashlib.sha256(artifact).hexdigest()})
    peak_kib = resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss
    assert records[0]['sha256'] == records[1]['sha256']
    assert peak_kib < 512 * 1024
    result = {
        'runtime': subprocess.check_output(['node', '--version'], text=True).strip(),
        'deterministic': True, 'network': 'isolated namespace', 'repository': 'read-only /bot',
        'identity': '65534:65534', 'cpus': 1, 'process_limit': 64, 'wall_limit_seconds': 60,
        'peak_rss_kib': peak_kib, 'runs': records,
        'limitations': 'No Docker/pinned image or 512 MiB cgroup; peak RSS checked against 512 MiB.',
    }
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    verify()

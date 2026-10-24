#!/usr/bin/env python3
"""Local action check. Set NODE_PATH to an isolated packager 2.2.0 node_modules directory (no webpack)."""
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile

SCRIPT = Path(__file__).with_name('package.cjs')


def json_file(path, value):
    path.write_text(json.dumps(value), encoding='utf-8')


def data_archive(ipk):
    data = ipk.read_bytes()
    assert data[:8] == b'!<arch>\n'
    offset = 8
    while offset < len(data):
        header = data[offset:offset + 60]
        size = int(header[48:58])
        if header[:16].decode().strip().rstrip('/') == 'data.tar.gz':
            return tarfile.open(fileobj=io.BytesIO(data[offset + 60:offset + 60 + size]), mode='r:gz')
        offset += 60 + size + size % 2
    raise AssertionError('no data archive')


with tempfile.TemporaryDirectory(prefix='webos-action-check-') as directory:
    root = Path(directory)
    app = root / 'app files'
    service = root / 'service files'
    output = root / 'packages'
    app.mkdir()
    service.mkdir()
    json_file(app / 'appinfo.json', {'id': 'com.example.check', 'version': '1.2.3', 'main': 'index.html', 'icon': 'icon.png', 'title': 'Test'})
    html = '<!doctype html><p>Исходный текст без минификации</p>\n'
    (app / 'index.html').write_text(html, encoding='utf-8')
    (app / 'icon.png').write_bytes(b'\x89PNG\r\n\x1a\n')
    (app / 'script.sh').write_text('#!/bin/sh\nexit 0\n')
    (app / 'script.sh').chmod(0o755)
    (app / 'library.so').write_bytes(b'\x7fELFtest library')
    (app / 'library.so').chmod(0o644)
    json_file(service / 'services.json', {'id': 'com.example.check.service', 'services': [{'name': 'com.example.check.service'}]})
    json_file(service / 'package.json', {'name': 'com.example.check.service', 'version': '1.2.3', 'main': 'service.js'})
    (service / 'service.js').write_text("var message = 'untouched';\n")
    env = dict(os.environ, WEBOS_APP_DIRECTORY=str(app), WEBOS_SERVICE_DIRECTORIES=str(service), WEBOS_OUTPUT_DIRECTORY=str(output), SOURCE_DATE_EPOCH='1761000000')
    subprocess.run(['node', str(SCRIPT)], env=env, check=True)
    ipk = output / 'com.example.check_1.2.3_all.ipk'
    checksum = ipk.with_name(ipk.name + '.sha256').read_text().split()[0]
    assert checksum == hashlib.sha256(ipk.read_bytes()).hexdigest()
    with data_archive(ipk) as archive:
        prefix = 'usr/palm/applications/com.example.check/'
        assert archive.extractfile(prefix + 'index.html').read().decode() == html
        assert archive.getmember(prefix + 'script.sh').mode == 0o755
        assert archive.getmember(prefix + 'library.so').mode == 0o644
        assert all(m.mtime == 1761000000 for m in archive.getmembers())
        assert archive.extractfile('usr/palm/services/com.example.check.service/service.js').read() == b"var message = 'untouched';\n"
        package = json.load(archive.extractfile('usr/palm/packages/com.example.check/packageinfo.json'))
        assert package['app'] == 'com.example.check' and package['services'] == ['com.example.check.service']
    first = ipk.read_bytes()
    subprocess.run(['node', str(SCRIPT)], env=env, check=True)
    assert ipk.read_bytes() == first, 'identical input must produce identical IPK bytes'
    (app / 'outside.txt').symlink_to(service / 'service.js')
    result = subprocess.run(['node', str(SCRIPT)], env=env, capture_output=True, text=True)
    assert result.returncode != 0 and 'Symbolic links are not packaged' in result.stderr
    (app / 'outside.txt').unlink()
    json_file(service / 'services.json', {'id': 'com.other.service'})
    result = subprocess.run(['node', str(SCRIPT)], env=env, capture_output=True, text=True)
    assert result.returncode != 0 and 'Service id must start with' in result.stderr
    subprocess.run(['node', str(SCRIPT)], env=dict(env, WEBOS_SERVICE_DIRECTORIES=''), check=True)
    with data_archive(ipk) as archive:
        package = json.load(archive.extractfile('usr/palm/packages/com.example.check/packageinfo.json'))
        assert package['services'] == []
    legacy = root / 'legacy.ipk'
    subprocess.run(['python3', str(Path(__file__).resolve().parents[3] / 'ipk/build-ipk.py'), str(app), str(legacy)], env=env, check=True)
    assert legacy.read_bytes() == ipk.read_bytes()
    assert legacy.with_name('legacy.ipk.sha256').read_text().split()[0] == hashlib.sha256(legacy.read_bytes()).hexdigest()
    print('ok   standalone 2.2.0: app/service, UTF-8 assets, explicit modes/mtime, reproducibility, legacy command and invalid-input rejection')

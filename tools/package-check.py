#!/usr/bin/env python3
"""Build with a temporary test key; inspect signatures and bundled pages. No TV is contacted."""
import io
import base64
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
from ipk_metadata import validate_manager_ipk

ROOT = Path(__file__).resolve().parent.parent


def run(*args, **kwargs):
    subprocess.run(args, cwd=ROOT, check=True, **kwargs)


with tempfile.TemporaryDirectory(prefix='cytv-package-') as temp:
    private = Path(temp) / 'private.pem'
    public = Path(temp) / 'public.pem'
    run('openssl', 'genrsa', '-out', str(private), '2048', stderr=subprocess.DEVNULL)
    run('openssl', 'rsa', '-in', str(private), '-pubout', '-out', str(public), stderr=subprocess.DEVNULL)
    try:
        # The old producer accidentally registered a boot payload as a Luna service; reject it before writing an IPK.
        old = {'metadata': {'id': 'com.cleanyourtv.manager', 'version': '1.0.0'}, 'files': [
            {'path': 'usr/palm/applications/com.cleanyourtv.manager/appinfo.json', 'data': base64.b64encode(b'{}').decode(), 'mode': 0o644},
            {'path': 'usr/palm/services/com.cleanyourtv.manager.service/helper.js', 'data': '', 'mode': 0o644},
        ]}
        rejected = subprocess.run(['node', 'ipk/pack.cjs'], cwd=ROOT, input=json.dumps(old), capture_output=True, text=True)
        assert rejected.returncode != 0 and 'requires services.json' in rejected.stderr and not rejected.stdout
        env = dict(os.environ, CYTV_SIGNING_KEY=str(private), CYTV_RELEASE_PUBLIC_KEY=str(public), CYTV_RELEASE_VERSION='9.8.7')
        run('python3', 'ipk/build.py', env=env)
        assets = list((ROOT / 'dist').glob('*.ipk')) + list((ROOT / 'dist').glob('frontend-*.tgz'))
        assert len(assets) == 2
        for asset in assets:
            run('openssl', 'dgst', '-sha256', '-verify', str(public), '-signature', str(asset) + '.sha256.sig', str(asset) + '.sha256')
            if asset.suffix == '.ipk':
                assert validate_manager_ipk(asset)['version'] == '9.8.7'
                data = asset.read_bytes()
                assert data[:8] == b'!<arch>\n'
                offset = 8
                while offset < len(data):
                    header = data[offset:offset + 60]
                    size = int(header[48:58])
                    member = data[offset + 60:offset + 60 + size]
                    if header[:16].decode().strip().rstrip('/') == 'control.tar.gz':
                        with tarfile.open(fileobj=io.BytesIO(member), mode='r:gz') as control:
                            assert all(m.mtime == 1761000000 for m in control.getmembers())
                            text = control.extractfile('control').read().decode()
                            assert 'Description: CleanYourTV for LG webOS\n' in text and 'Installed-Size: ' in text
                    if header[:16].decode().strip().rstrip('/') == 'data.tar.gz':
                        archive = tarfile.open(fileobj=io.BytesIO(member), mode='r:gz')
                        break
                    offset += 60 + size + size % 2
                else:
                    raise AssertionError('package has no data archive')
            else:
                archive = tarfile.open(asset, 'r:gz')
            with archive:
                members = {m.name.removeprefix('./'): m for m in archive.getmembers()}
                pages = [m for m in archive.getmembers() if m.name.endswith('/index.html')]
                assert len(pages) == (4 if asset.suffix == '.ipk' else 1)
                for page in pages:
                    html = archive.extractfile(page).read()
                    assert b'root.CYTV_I18N' in html and b'window.CYTV' in html
                    assert b'shared/api.js' not in html and b'shared/i18n.js' not in html
                    assert b'flexgap' not in html and b'data-fg' not in html
                    assert 'Телеканалы'.encode() in html
                if asset.suffix == '.ipk':
                    assert all(m.mtime == 1761000000 and m.uid == 0 and m.gid == 0 for m in archive.getmembers())
                    service = 'usr/palm/applications/com.cleanyourtv.manager/root/'
                    key = archive.extractfile(members[service + 'helper/release-public.pem']).read()
                    assert key == public.read_bytes()
                    assert not any('private.pem' in m.name for m in archive.getmembers())
                    for app, title in [('picker', 'Источники'), ('notify', 'Уведомление')]:
                        metadata = archive.extractfile(members['usr/palm/applications/com.cleanyourtv.' + app + '/resources/ru/appinfo.json']).read()
                        assert json.loads(metadata)['title'] == title
                    for executable in ['bootstrap.sh', 'scripts/10-cleanyourtv-home', 'scripts/15-cleanyourtv-debloat', 'voice/cytv-asr', 'inputhook/ezinject']:
                        assert members[service + executable].mode == 0o755
                    assert members[service + 'inputhook/libinputhookpp.so'].mode == 0o644
                    package = json.load(archive.extractfile(members['usr/palm/packages/com.cleanyourtv.manager/packageinfo.json']))
                    assert package['app'] == 'com.cleanyourtv.manager' and package['services'] == []
                    assert not any(name.startswith('usr/palm/services/') for name in members)
                    for page in pages:
                        html = archive.extractfile(page).read()
                        assert b'/applications/com.cleanyourtv.manager/root/helper/security.js token' in html
                        assert b'/services/com.cleanyourtv.manager.service' not in html
                    for module in ['manager.js', 'selfupdate.js', 'sharelog.js', 'voice.js']:
                        body = archive.extractfile(members[service + 'helper/' + module]).read()
                        assert b'/applications/com.cleanyourtv.manager/root' in body
                        assert b'/services/com.cleanyourtv.manager.service' not in body
                    picker_info = json.load(archive.extractfile(members['usr/palm/applications/com.cleanyourtv.picker/appinfo.json']))
                    assert picker_info['handlesRelaunch'] is True and picker_info['defaultWindowType'] == 'overlay'
                    assert package['version'] == '9.8.7'
                    assert b"const VERSION = '9.8.7'" in archive.extractfile(members[service + 'helper/helper.js']).read()
                    frontend = json.load(archive.extractfile(members[service + 'payload/app/version.json']))
                    assert frontend['version'] == frontend['minService'] == '9.8.7'
                    html = archive.extractfile(members[service + 'payload/app/index.html']).read()
                    assert b"VERSION='9.8.7'" in html and b"MIN_SERVICE='9.8.7'" in html
                    for app in ['manager', 'picker', 'notify']:
                        assert 'usr/palm/applications/com.cleanyourtv.' + app + '/appinfo.json' in members
                    assert not any('node_modules/' in m.name for m in archive.getmembers())
                else:
                    frontend = json.load(archive.extractfile(members['app/version.json']))
                    assert frontend['version'] == frontend['minService'] == '9.8.7'
                    launcher = archive.extractfile(members['app/index.html']).read()
                    assert b"v.addEventListener('error',onError,true)" in launcher
                    assert b".test(url))return [{src:url,type:''},{src:url,type:'application/x-mpegURL'}" in launcher
        checksums = {a.name: hashlib.sha256(a.read_bytes()).digest() for a in assets}
        run('python3', 'ipk/build.py', env=env)
        assert all(hashlib.sha256((ROOT / 'dist' / name).read_bytes()).digest() == value for name, value in checksums.items())
        print('ok   standalone 2.2.0: install metadata, app-owned root payload, paths, signatures, modes/mtime and reproducibility')
    finally:
        # Leave ordinary dev output, never a release signed by an ephemeral test identity.
        env = dict(os.environ)
        env.pop('CYTV_SIGNING_KEY', None)
        env.pop('CYTV_RELEASE_PUBLIC_KEY', None)
        env.pop('CYTV_RELEASE_VERSION', None)
        run('python3', 'ipk/build.py', env=env)

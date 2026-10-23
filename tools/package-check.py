#!/usr/bin/env python3
"""Build with a temporary test key; inspect signatures and bundled pages. No TV is contacted."""
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parent.parent


def run(*args, **kwargs):
    subprocess.run(args, cwd=ROOT, check=True, **kwargs)


with tempfile.TemporaryDirectory(prefix='cytv-package-') as temp:
    private = Path(temp) / 'private.pem'
    public = Path(temp) / 'public.pem'
    run('openssl', 'genrsa', '-out', str(private), '2048', stderr=subprocess.DEVNULL)
    run('openssl', 'rsa', '-in', str(private), '-pubout', '-out', str(public), stderr=subprocess.DEVNULL)
    try:
        env = dict(os.environ, CYTV_SIGNING_KEY=str(private), CYTV_RELEASE_PUBLIC_KEY=str(public))
        run('python3', 'ipk/build.py', env=env)
        assets = list((ROOT / 'dist').glob('*.ipk')) + list((ROOT / 'dist').glob('frontend-*.tgz'))
        assert len(assets) == 2
        for asset in assets:
            run('openssl', 'dgst', '-sha256', '-verify', str(public), '-signature', str(asset) + '.sha256.sig', str(asset) + '.sha256')
            if asset.suffix == '.ipk':
                data = asset.read_bytes()
                assert data[:8] == b'!<arch>\n'
                offset = 8
                while offset < len(data):
                    header = data[offset:offset + 60]
                    size = int(header[48:58])
                    member = data[offset + 60:offset + 60 + size]
                    if header[:16].decode().strip().rstrip('/') == 'data.tar.gz':
                        archive = tarfile.open(fileobj=io.BytesIO(member), mode='r:gz')
                        break
                    offset += 60 + size + size % 2
                else:
                    raise AssertionError('package has no data archive')
            else:
                archive = tarfile.open(asset, 'r:gz')
            with archive:
                pages = [m for m in archive.getmembers() if m.name.endswith('/index.html')]
                assert len(pages) == (4 if asset.suffix == '.ipk' else 1)
                for page in pages:
                    html = archive.extractfile(page).read()
                    assert b'root.CYTV_I18N' in html and b'window.CYTV' in html
                    assert b'shared/api.js' not in html and b'shared/i18n.js' not in html
                    assert 'Телеканалы'.encode() in html
                if asset.suffix == '.ipk':
                    key = archive.extractfile('./usr/palm/services/com.cleanyourtv.manager.service/helper/release-public.pem').read()
                    assert key == public.read_bytes()
                    assert not any('private.pem' in m.name for m in archive.getmembers())
                    for app, title in [('picker', 'Источники'), ('notify', 'Уведомление')]:
                        metadata = archive.extractfile('./usr/palm/applications/com.cleanyourtv.' + app + '/resources/ru/appinfo.json').read()
                        assert json.loads(metadata)['title'] == title
        print('ok   signed package/launcher, inlined offline assets, Russian catalogue/system titles and bundled public key')
    finally:
        # Leave ordinary dev output, never a release signed by an ephemeral test identity.
        env = dict(os.environ)
        env.pop('CYTV_SIGNING_KEY', None)
        env.pop('CYTV_RELEASE_PUBLIC_KEY', None)
        run('python3', 'ipk/build.py', env=env)

#!/usr/bin/env python3
"""Build the Homebrew Channel repository feed from a CleanYourTV release package.

The feed is the format the Homebrew Channel parses for custom repositories (apps.json with a package
manifest, the IPK, its SHA-256 and an icon), published on GitHub Pages under /repo/ so users can add
one URL to the TV and install/update from there. `--selftest` validates the generator offline.

Usage: make-repo-feed.py build --dist DIR --out DIR --base-url URL --public-key FILE --source URL
       make-repo-feed.py --selftest
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tarfile
import tempfile
from ipk_metadata import validate_manager_ipk

PACKAGE = 'com.cleanyourtv.manager'
NAME = 'CleanYourTV'
SHORT = 'Home screen, Live TV from your own playlist, picture notifications and voice for rooted LG webOS TVs.'
DESCRIPTION = ('<p>CleanYourTV replaces LG\u2019s Home with a fast launcher, adds Live TV from your own M3U playlist, '
               'picture notifications, an on-demand Inputs picker on the Input key and optional voice control.</p>'
               '<p>Requires root and the Homebrew Channel. Releases are signed; the TV verifies updates against a '
               'bundled key. Documentation: '
               '<a href="https://atlet99.github.io/cleanyourtv-WebOS/">atlet99.github.io/cleanyourtv-WebOS</a>.</p>')
VERSION = re.compile(r'com\.cleanyourtv\.manager_((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))_all\.ipk')


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def build(dist, out, base_url, source, icon, root='https://atlet99.github.io/cleanyourtv-WebOS', public_key=None):
    dist, out = Path(dist), Path(out)
    ipks = sorted(dist.glob(PACKAGE + '_*_all.ipk'))
    if len(ipks) != 1:
        raise SystemExit('expected exactly one %s_<version>_all.ipk in %s, found %d' % (PACKAGE, dist, len(ipks)))
    ipk = ipks[0]
    match = VERSION.fullmatch(ipk.name)
    if not match:
        raise SystemExit('unexpected package name: ' + ipk.name)
    version = match.group(1)
    data = ipk.read_bytes()
    digest = sha256(data)
    checksum_file = Path(str(ipk) + '.sha256')
    if not checksum_file.is_file():
        raise SystemExit('missing .sha256 file: ' + checksum_file.name)
    expected = digest + '  ' + ipk.name + '\n'
    if checksum_file.read_text() != expected:
        raise SystemExit('the .sha256 file does not match the package: ' + checksum_file.name)
    signature_file = Path(str(checksum_file) + '.sig')
    if public_key is None or not signature_file.is_file():
        raise SystemExit('a trusted public key and .sha256.sig are required for the feed')
    try:
        subprocess.run(['openssl', 'dgst', '-sha256', '-verify', str(public_key), '-signature', str(signature_file), str(checksum_file)], check=True, capture_output=True)
    except subprocess.CalledProcessError as error:
        raise SystemExit('release signature verification failed') from error
    try:
        metadata = validate_manager_ipk(ipk)
    except (ValueError, OSError, tarfile.TarError) as error:
        raise SystemExit('invalid install metadata: ' + str(error)) from error
    if metadata['version'] != version:
        raise SystemExit('package filename and metadata versions do not match')
    base = base_url.rstrip('/')
    icon_url = base + '/icon.png'
    ipk_url = base + '/' + ipk.name
    manifest = {
        'id': PACKAGE, 'version': version, 'type': 'web', 'title': NAME,
        'appDescription': SHORT, 'iconUri': icon_url, 'rootRequired': True,
        'ipkUrl': ipk_url, 'ipkHash': {'sha256': digest}, 'ipkSha256sum': digest,
        'sourceUrl': source, 'ipkSize': len(data),
    }
    feed = {
        'packages': [{
            'id': PACKAGE, 'title': NAME, 'iconUri': icon_url,
            'manifestUrl': base + '/' + PACKAGE + '.manifest.json',
            'manifest': manifest, 'pool': 'main', 'shortDescription': SHORT,
            'fullDescriptionUrl': 'full_description.html',
        }],
        'paging': {'page': 1, 'count': 1, 'maxPage': 1, 'itemsTotal': 1, 'prevUrl': None, 'nextUrl': None},
    }
    out.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ipk, out / ipk.name)
    (out / (ipk.name + '.sha256')).write_text(digest + '  ' + ipk.name + '\n')
    shutil.copyfile(signature_file, out / signature_file.name)
    (out / (PACKAGE + '.manifest.json')).write_text(json.dumps(manifest, indent=2) + '\n')
    (out / 'apps.json').write_text(json.dumps(feed, indent=2) + '\n')
    (out / 'SHA256SUMS').write_text(digest + '  ' + ipk.name + '\n')
    shutil.copyfile(icon, out / 'icon.png')
    (out / '.nojekyll').write_text('')
    (out / 'full_description.html').write_text(
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>' + NAME + ' ' + version + '</title></head><body style="font-family:sans-serif;max-width:42em;margin:2em auto;padding:0 1em">'
        '<h1>' + NAME + ' ' + version + '</h1>' + DESCRIPTION +
        '<p><a href="' + ipk.name + '">Download ' + ipk.name + '</a> \u00b7 '
        '<a href="' + root + '/install/">Installation guide</a> \u00b7 '
        '<a href="' + source + '/releases">Releases</a></p></body></html>\n')
    (out / 'index.html').write_text(
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>' + NAME + ' repository feed</title></head><body style="font-family:sans-serif;max-width:42em;margin:2em auto;padding:0 1em">'
        '<h1>' + NAME + ' ' + version + '</h1>'
        '<p>Homebrew Channel repository feed for rooted LG webOS TVs. In the Homebrew Channel open <b>Manage feeds</b>, '
        'tap <b>+</b> and add this URL:</p>'
        '<p><code>' + base + '/apps.json</code></p>'
        '<p>Then install or update <b>' + NAME + '</b> from the channel. The package hash below is checked on install; '
        'the publisher verifies the release signature before publishing this feed. Homebrew Channel checks the hash; '
        'the CleanYourTV manager also verifies signatures for its own updates.</p>'
        '<p>SHA-256: <code>' + digest + '</code></p>'
        '<p><a href="' + ipk.name + '">Download ' + ipk.name + '</a> \u00b7 '
        '<a href="' + root + '/install/">Installation guide</a> \u00b7 '
        '<a href="' + source + '">Source</a></p></body></html>\n')
    return {'version': version, 'sha256': digest, 'ipk': ipk.name, 'out': str(out)}


def selftest():
    with tempfile.TemporaryDirectory(prefix='cytv-feed-') as directory:
        root = Path(directory)
        version = '9.9.9'
        name = PACKAGE + '_' + version + '_all.ipk'
        dist, out = root / 'dist', root / 'site' / 'repo'
        dist.mkdir(parents=True)
        out.parent.mkdir()
        (out.parent / 'index.html').write_text('existing documentation home')
        # A small independent IPK fixture: production IPKs still use the standalone packager, never this test writer.
        def fixture(services=()):
            entries = {
                'usr/palm/applications/' + PACKAGE + '/appinfo.json': json.dumps({'id': PACKAGE, 'version': version, 'title': NAME, 'type': 'web', 'main': 'index.html', 'icon': 'icon.png'}),
                'usr/palm/applications/' + PACKAGE + '/index.html': '<!doctype html>',
                'usr/palm/applications/' + PACKAGE + '/icon.png': 'fixture icon',
                'usr/palm/packages/' + PACKAGE + '/packageinfo.json': json.dumps({'id': PACKAGE, 'app': PACKAGE, 'version': version, 'services': list(services)}),
            }
            for required in ['bootstrap.sh', 'helper/helper.js', 'helper/security.js']:
                entries['usr/palm/applications/' + PACKAGE + '/root/' + required] = 'fixture'
            buffer = io.BytesIO()
            with tarfile.open(fileobj=buffer, mode='w:gz') as archive:
                for path, text in entries.items():
                    body = text.encode()
                    member = tarfile.TarInfo(path); member.size = len(body)
                    archive.addfile(member, io.BytesIO(body))
            result = b'!<arch>\n'
            for path, body in [('debian-binary', b'2.0\n'), ('data.tar.gz', buffer.getvalue())]:
                result += ('%-16s%-12d%-6d%-6d%-8s%-10d`\n' % (path + '/', 0, 0, 0, '100644', len(body))).encode() + body + (b'\n' if len(body) % 2 else b'')
            return result
        payload = fixture()
        (dist / name).write_bytes(payload)
        (dist / (name + '.sha256')).write_text(sha256(payload) + '  ' + name + '\n')
        private, public = root / 'private.pem', root / 'public.pem'
        subprocess.run(['openssl', 'genrsa', '-out', str(private), '2048'], check=True, capture_output=True)
        subprocess.run(['openssl', 'rsa', '-in', str(private), '-pubout', '-out', str(public)], check=True, capture_output=True)
        def sign():
            subprocess.run(['openssl', 'dgst', '-sha256', '-sign', str(private), '-out', str(dist / (name + '.sha256.sig')), str(dist / (name + '.sha256'))], check=True)
        sign()
        icon = root / 'icon.png'
        icon.write_bytes(b'\x89PNG\r\n\x1a\nfixture-icon')
        info = build(dist, out, 'https://example.github.io/cleanyourtv-WebOS/repo', 'https://github.com/example/cleanyourtv', icon, 'https://example.github.io/cleanyourtv-WebOS', public_key=public)
        assert info == {'version': version, 'sha256': sha256(payload), 'ipk': name, 'out': str(out)}
        feed = json.loads((out / 'apps.json').read_text())
        package = feed['packages'][0]
        assert feed['paging']['itemsTotal'] == 1
        assert package['id'] == PACKAGE and package['manifest']['version'] == version
        assert package['manifest']['ipkHash']['sha256'] == sha256(payload)
        assert package['manifest']['ipkSize'] == len(payload) and package['manifest']['rootRequired'] is True
        assert package['manifestUrl'].endswith('/' + PACKAGE + '.manifest.json')
        assert json.loads((out / (PACKAGE + '.manifest.json')).read_text()) == package['manifest']
        assert (out / 'SHA256SUMS').read_text() == sha256(payload) + '  ' + name + '\n'
        assert (out / '.nojekyll').exists() and (out / 'icon.png').read_bytes() == icon.read_bytes()
        page = (out / 'index.html').read_text()
        assert 'https://example.github.io/cleanyourtv-WebOS/repo/apps.json' in page and version in page
        assert (out.parent / 'index.html').read_text() == 'existing documentation home'
        # a package whose checksum file lies must be refused
        (dist / (name + '.sha256')).write_text('0' * 64 + '  ' + name + '\n')
        out2 = root / 'site2' / 'repo'
        try:
            build(dist, out2, 'https://example.github.io/x', 'https://github.com/example/x', icon, public_key=public)
            raise AssertionError('a mismatching checksum file was accepted')
        except SystemExit as error:
            assert 'does not match' in str(error)
        # two packages at once are ambiguous and refused
        (dist / (name + '.sha256')).write_text(sha256(payload) + '  ' + name + '\n')
        # Reproduce the old package: a root payload was incorrectly declared as a Luna service.
        bad = fixture([PACKAGE + '.service'])
        (dist / name).write_bytes(bad)
        (dist / (name + '.sha256')).write_text(sha256(bad) + '  ' + name + '\n')
        sign()
        try:
            build(dist, out2, 'https://example.github.io/x', 'https://github.com/example/x', icon, public_key=public)
            raise AssertionError('the old invalid service declaration was accepted')
        except SystemExit as error:
            assert 'declares Luna services' in str(error)
        assert not out2.exists(), 'bad metadata must not replace an existing site/feed'
        (dist / name).write_bytes(payload)
        (dist / (name + '.sha256')).write_text(sha256(payload) + '  ' + name + '\n')
        (dist / (name + '.sha256.sig')).write_bytes(b'bad signature')
        try:
            build(dist, out2, 'https://example.github.io/x', 'https://github.com/example/x', icon, public_key=public)
            raise AssertionError('an invalid release signature was accepted')
        except SystemExit as error:
            assert 'signature verification failed' in str(error)
        (dist / (name + '.sha256')).unlink()
        try:
            build(dist, out2, 'https://example.github.io/x', 'https://github.com/example/x', icon, public_key=public)
            raise AssertionError('a missing checksum file was accepted')
        except SystemExit as error:
            assert 'missing .sha256' in str(error)
        shutil.copyfile(dist / name, dist / (PACKAGE + '_9.9.8_all.ipk'))
        try:
            build(dist, out2, 'https://example.github.io/x', 'https://github.com/example/x', icon, public_key=public)
            raise AssertionError('an ambiguous dist directory was accepted')
        except SystemExit as error:
            assert 'exactly one' in str(error)
    print('ok   repository feed: signatures, install metadata, manifest/hash/size and rejection of the old service layout')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--selftest', action='store_true')
    parser.add_argument('command', nargs='?', choices=['build'])
    parser.add_argument('--dist', type=Path)
    parser.add_argument('--out', type=Path)
    parser.add_argument('--base-url')
    parser.add_argument('--public-key', type=Path)
    parser.add_argument('--source', default='https://github.com/atlet99/cleanyourtv-WebOS')
    parser.add_argument('--icon', type=Path, default=Path(__file__).resolve().parent.parent / 'manager' / 'app' / 'icon.png')
    parser.add_argument('--root', default='https://atlet99.github.io/cleanyourtv-WebOS')
    args = parser.parse_args()
    if args.selftest:
        selftest()
        return
    if args.command != 'build' or not (args.dist and args.out and args.base_url and args.public_key):
        parser.error('use --selftest, or build --dist DIR --out DIR --base-url URL --public-key FILE')
    result = build(args.dist, args.out, args.base_url, args.source, args.icon, args.root, public_key=args.public_key)
    print('repository feed: %s %s (%s) in %s' % (NAME, result['version'], result['sha256'][:12], result['out']))


if __name__ == '__main__':
    main()

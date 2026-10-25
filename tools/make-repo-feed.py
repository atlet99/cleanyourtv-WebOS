#!/usr/bin/env python3
"""Build the Homebrew Channel repository feed from a CleanYourTV release package.

The feed is the format the Homebrew Channel parses for custom repositories (apps.json with a package
manifest, the IPK, its SHA-256 and an icon), published on GitHub Pages under /repo/ so users can add
one URL to the TV and install/update from there. `--selftest` validates the generator offline.

Usage: make-repo-feed.py build --dist DIR --out DIR --base-url URL --source URL
       make-repo-feed.py --selftest
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import tempfile

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


def build(dist, out, base_url, source, icon, root='https://atlet99.github.io/cleanyourtv-WebOS'):
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
    if checksum_file.exists():
        expected = digest + '  ' + ipk.name + '\n'
        if checksum_file.read_text() != expected:
            raise SystemExit('the .sha256 file does not match the package: ' + checksum_file.name)
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
        'releases are also signed and verified by the TV itself.</p>'
        '<p>SHA-256: <code>' + digest + '</code></p>'
        '<p><a href="' + ipk.name + '">Download ' + ipk.name + '</a> \u00b7 '
        '<a href="' + root + '/install/">Installation guide</a> \u00b7 '
        '<a href="' + source + '">Source</a></p></body></html>\n')
    return {'version': version, 'sha256': digest, 'ipk': ipk.name, 'out': str(out)}


def selftest():
    with tempfile.TemporaryDirectory(prefix='cytv-feed-') as directory:
        root = Path(directory)
        payload = b'<!doctype html><p>fixture package</p>' * 100
        version = '9.9.9'
        name = PACKAGE + '_' + version + '_all.ipk'
        dist, out = root / 'dist', root / 'site' / 'repo'
        dist.mkdir(parents=True)
        (dist / name).write_bytes(payload)
        (dist / (name + '.sha256')).write_text(sha256(payload) + '  ' + name + '\n')
        icon = root / 'icon.png'
        icon.write_bytes(b'\x89PNG\r\n\x1a\nfixture-icon')
        info = build(dist, out, 'https://example.github.io/cleanyourtv-WebOS/repo', 'https://github.com/example/cleanyourtv', icon, 'https://example.github.io/cleanyourtv-WebOS')
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
        # a package whose checksum file lies must be refused
        (dist / (name + '.sha256')).write_text('0' * 64 + '  ' + name + '\n')
        out2 = root / 'site2' / 'repo'
        try:
            build(dist, out2, 'https://example.github.io/x', 'https://github.com/example/x', icon)
            raise AssertionError('a mismatching checksum file was accepted')
        except SystemExit as error:
            assert 'does not match' in str(error)
        # two packages at once are ambiguous and refused
        (dist / (name + '.sha256')).write_text(sha256(payload) + '  ' + name + '\n')
        shutil.copyfile(dist / name, dist / (PACKAGE + '_9.9.8_all.ipk'))
        try:
            build(dist, out2, 'https://example.github.io/x', 'https://github.com/example/x', icon)
            raise AssertionError('an ambiguous dist directory was accepted')
        except SystemExit as error:
            assert 'exactly one' in str(error)
    print('ok   repository feed: manifest/hash/size, checksum verification, landing page and refusal of bad input')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--selftest', action='store_true')
    parser.add_argument('command', nargs='?', choices=['build'])
    parser.add_argument('--dist', type=Path)
    parser.add_argument('--out', type=Path)
    parser.add_argument('--base-url')
    parser.add_argument('--source', default='https://github.com/atlet99/cleanyourtv-WebOS')
    parser.add_argument('--icon', type=Path, default=Path(__file__).resolve().parent.parent / 'manager' / 'app' / 'icon.png')
    parser.add_argument('--root', default='https://atlet99.github.io/cleanyourtv-WebOS')
    args = parser.parse_args()
    if args.selftest:
        selftest()
        return
    if args.command != 'build' or not (args.dist and args.out and args.base_url):
        parser.error('use --selftest, or build --dist DIR --out DIR --base-url URL')
    result = build(args.dist, args.out, args.base_url, args.source, args.icon, args.root)
    print('repository feed: %s %s (%s) in %s' % (NAME, result['version'], result['sha256'][:12], result['out']))


if __name__ == '__main__':
    main()

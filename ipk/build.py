#!/usr/bin/env python3
"""Build the release files into dist/:
  com.cleanyourtv.manager_<version>_all.ipk (+ .sha256)   manager/picker/notify apps and the manager's root-daemon payload
  frontend-<version>.tgz (+ .sha256)                      the launcher alone, installed by the manager app
Uses @atlet99/webos-packager-plugin/core 2.2.0 via Node.js (NODE_PATH points at the isolated tooling installation).
Run from anywhere: python3 ipk/build.py"""
import base64, gzip, hashlib, io, json, os, re, shutil, subprocess, sys, tarfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
P = lambda *a: os.path.join(ROOT, *a)
PKG = 'com.cleanyourtv.manager'
PUBLIC_KEY = os.environ.get('CYTV_RELEASE_PUBLIC_KEY', P('release-public.pem'))
SIGNING_KEY = os.environ.get('CYTV_SIGNING_KEY', '')
if SIGNING_KEY and not os.path.isfile(PUBLIC_KEY):
    sys.exit('signing requires CYTV_RELEASE_PUBLIC_KEY (or release-public.pem)')

source_version = re.search(r"const VERSION = '([^']+)'", open(P('helper', 'helper.js')).read()).group(1)
source_fe = json.load(open(P('app', 'version.json')))['version']
if not re.search(r"VERSION='%s'" % re.escape(source_fe), open(P('app', 'index.html')).read()):
    sys.exit('app/version.json (%s) and VERSION in app/index.html do not match' % source_fe)
release_version = os.environ.get('CYTV_RELEASE_VERSION', '').strip()
if not release_version:
    tagged = subprocess.run(['git', 'tag', '--points-at', 'HEAD', '--list', 'v*'], cwd=ROOT, capture_output=True, text=True)
    versions = [tag[1:] for tag in tagged.stdout.splitlines() if re.fullmatch(r'v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)', tag)]
    if versions:
        release_version = max(versions, key=lambda v: tuple(map(int, v.split('.'))))
if release_version and not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)', release_version):
    sys.exit('CYTV_RELEASE_VERSION must be a stable x.y.z version')
version, fe = release_version or source_version, release_version or source_fe

def page(body):   # inlines the shared scripts and the vendored webOSTV.js; spacing is pure CSS (see docs: no runtime layout fixes)
    def repl(m):
        name = m[1].decode()
        src = P('third-party', 'webostvjs', 'webOSTV.js') if name == 'webostv' else P('shared', name + '.js')
        return b'<script>' + open(src, 'rb').read() + b'</script>'
    return re.sub(rb'<script src="(?:\.\./)+shared/(api|i18n|webostv)\.js"></script>', repl, body)

def frontend_asset(rel, body):
    if release_version and rel == 'version.json':
        info = json.loads(body); info.update(version=fe, minService=version); body = json.dumps(info).encode()
    if rel == 'index.html':
        if release_version:
            body = re.sub(rb"\bVERSION='[^']+'", ("VERSION='" + fe + "'").encode(), body, count=1)
            body = re.sub(rb"\bMIN_SERVICE='[^']+'", ("MIN_SERVICE='" + version + "'").encode(), body, count=1)
        body = page(body)
    return body

# CI builds carry their source commit in BUILD, in the package and launcher, so equal development versions remain distinguishable.
BUILD = os.environ.get('CYTV_BUILD', '').strip()
if BUILD and not re.fullmatch(r'[0-9a-f]{7,40}', BUILD):
    sys.exit('CYTV_BUILD must be a commit hash')

def add(files, arc, data, mode=0o644):
    files.append((arc, data, mode))

def add_dir(files, arc_root, src, mode_for=None, skip=()):
    for root, _, names in os.walk(src):
        for n in sorted(names):
            if n in skip or n.startswith('.'):
                continue
            p = os.path.join(root, n)
            rel = os.path.relpath(p, src)
            mode = 0o755 if (n.endswith('.sh') or n in ('ezinject', '10-cleanyourtv-home', '15-cleanyourtv-debloat')) else 0o644
            body = open(p, 'rb').read()
            if src == P('app'):
                body = frontend_asset(rel, body)
            elif src == P('helper') and rel == 'helper.js' and release_version:
                body = re.sub(rb"const VERSION = '[^']+'", ("const VERSION = '" + version + "'").encode(), body, count=1)
            elif n == 'index.html':
                body = page(body)
            add(files, arc_root + '/' + rel, body, mode)

def tgz(files):
    b = io.BytesIO()
    with gzip.GzipFile(fileobj=b, mode='wb', mtime=1761000000) as gz:
        with tarfile.open(fileobj=gz, mode='w', format=tarfile.GNU_FORMAT) as t:
            for arc, data, mode in sorted(files):
                ti = tarfile.TarInfo(arc); ti.size = len(data); ti.mode = mode; ti.uid = ti.gid = 0; ti.mtime = 1761000000
                t.addfile(ti, io.BytesIO(data))
    return b.getvalue()

def ipk(files):
    manifest = {
        'metadata': {'id': PKG, 'version': version, 'primaryApp': PKG, 'mtime': 1761000000,
                     'control': {'Installed-Size': sum(len(d) for _, d, _ in files) // 1024 + 1,
                                 'Maintainer': 'N/A <nobody@example.com>', 'Description': 'CleanYourTV for LG webOS'}},
        'files': [{'path': arc, 'data': base64.b64encode(data).decode('ascii'), 'mode': mode} for arc, data, mode in files]
    }
    return subprocess.run(['node', P('ipk', 'pack.cjs')], input=json.dumps(manifest).encode(), stdout=subprocess.PIPE, check=True).stdout

def write(name, data):
    path = os.path.join(DIST, name)
    open(path, 'wb').write(data)
    open(path + '.sha256', 'w').write('%s  %s\n' % (hashlib.sha256(data).hexdigest(), name))
    if SIGNING_KEY:
        subprocess.run(['openssl', 'dgst', '-sha256', '-sign', SIGNING_KEY, '-out', path + '.sha256.sig', path + '.sha256'], check=True)
        subprocess.run(['openssl', 'dgst', '-sha256', '-verify', PUBLIC_KEY, '-signature', path + '.sha256.sig', path + '.sha256'], check=True)
    print('%-52s %8d bytes' % (name, len(data)))

shutil.rmtree(DIST, ignore_errors=True); os.makedirs(DIST)

# ---- the launcher alone ----
fl = []
add_dir(fl, 'app', P('app'))
if BUILD: add(fl, 'app/BUILD', (BUILD + '\n').encode())
write('frontend-%s.tgz' % fe, tgz(fl))

# ---- the package ----
data = []
for app_id, src in (('com.cleanyourtv.manager', 'manager/app'), ('com.cleanyourtv.picker', 'picker/app'), ('com.cleanyourtv.notify', 'notify/app')):
    d = '/usr/palm/applications/' + app_id
    for root, _, names in os.walk(P(src)):
        for n in sorted(names):
            p = os.path.join(root, n); rel = os.path.relpath(p, P(src)); body = open(p, 'rb').read()
            if n == 'index.html': body = page(body)
            if n == 'appinfo.json' and app_id == PKG:   # the package version is the service version
                o = json.loads(body); o['version'] = version; body = json.dumps(o).encode()
            add(data, '.' + d + '/' + rel, body)
add(data, './usr/palm/applications/com.cleanyourtv.manager/qrcode.js', open(P('third-party', 'qrcode-generator', 'qrcode.js'), 'rb').read())   # QR code for sharing the log
# This is an init.d-launched HTTP daemon, not a Luna service. App resources must not populate packageinfo.services.
s = './usr/palm/applications/' + PKG + '/root'
add(data, s + '/bootstrap.sh', open(P('scripts', 'bootstrap.sh'), 'rb').read(), 0o755)
add_dir(data, s + '/helper', P('helper'))
add(data, s + '/helper/i18n.js', open(P('shared', 'i18n.js'), 'rb').read())
if os.path.isfile(PUBLIC_KEY): add(data, s + '/helper/release-public.pem', open(PUBLIC_KEY, 'rb').read())
add_dir(data, s + '/helper/themes', P('themes'), skip=('README.md',))   # the bundled themes (themes/ in the repository)
add_dir(data, s + '/scripts', P('scripts'), skip=('bootstrap.sh',))
add(data, s + '/scripts/uninstall.sh', open(P('uninstall.sh'), 'rb').read(), 0o755)
add(data, s + '/voice/cytv-asr', open(P('voice', 'cytv-asr'), 'rb').read(), 0o755)   # optional voice feature: downloads its engine on request
add(data, s + '/inputhook/ezinject', open(P('third-party', 'inputhook', 'ezinject'), 'rb').read(), 0o755)
add(data, s + '/inputhook/libinputhookpp.so', open(P('third-party', 'inputhook', 'libinputhookpp.so'), 'rb').read())
for n in sorted(os.listdir(P('third-party', 'inputhook'))):
    if n.startswith('LICENSE') or n == 'SHA256SUMS':
        add(data, s + '/licenses/' + n, open(P('third-party', 'inputhook', n), 'rb').read())
add(data, s + '/licenses/THIRD-PARTY.md', open(P('THIRD-PARTY.md'), 'rb').read())
add(data, s + '/licenses/LICENSE', open(P('LICENSE'), 'rb').read())
add(data, s + '/compat.json', open(P('compat.json'), 'rb').read())
add(data, s + '/config.example.json', open(P('config.example.json'), 'rb').read())
add_dir(data, s + '/payload/app', P('app'))
if BUILD:
    add(data, s + '/BUILD', (BUILD + '\n').encode())
    add(data, s + '/payload/app/BUILD', (BUILD + '\n').encode())
write('%s_%s_all.ipk' % (PKG, version), ipk(data))
print('service %s, launcher %s' % (version, fe))
if not SIGNING_KEY: print('UNSIGNED development build: automatic installation and updates will refuse it.')

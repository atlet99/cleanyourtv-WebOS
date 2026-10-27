// Golden contract of the service's HTTP API: the real helper.js answers a catalogue of requests and every reply is compared with
// tools/golden/api.json. Run with --record after an intended contract change, and review the diff like code. Started the same way
// tools/node8-check.js starts things: a fake luna-send on PATH, a mock release server, temporary directories. Nothing leaves this machine.
//   node tools/api-golden.js            compare with the recorded contract
//   node tools/api-golden.js --record   rewrite tools/golden/api.json
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), cp = require('child_process'), net = require('net');
const root = path.join(__dirname, '..'), helper = path.join(root, 'helper');
const goldenFile = path.join(root, 'tools', 'golden', 'api.json');
const record = process.argv.includes('--record');
let failed = 0;
const ok = (c, name) => { console.log((c ? 'ok   ' : 'FAIL ') + name); if (!c) failed++; };

(async () => {
  const port = await new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cytv-golden-'));
  const DIR = path.join(tmp, 'cytv'); fs.mkdirSync(DIR);
  fs.mkdirSync(path.join(DIR, 'live', 'deep'), { recursive: true });
  const SVC = path.join(tmp, 'svc'); fs.mkdirSync(SVC);
  const APPS = path.join(tmp, 'appdirs'); fs.mkdirSync(APPS);
  ['netflix', 'youtube', 'settings.app', 'com.cleanyourtv.manager'].forEach(id => { fs.mkdirSync(path.join(APPS, id)); fs.writeFileSync(path.join(APPS, id, 'icon.png'), id); });

  // the luna stand-in: helper.js prepends the system PATH entries, so a directory appended to PATH is only reached when the
  // real luna-send is absent (true on a computer, never on a TV)
  const bin = path.join(tmp, 'bin'); fs.mkdirSync(bin);
  const appsJson = JSON.stringify({ returnValue: true, apps: [
    { id: 'netflix', title: 'Netflix', icon: 'icon.png', folderPath: APPS + '/netflix', visible: true, type: 'app' },
    { id: 'youtube', title: 'YouTube', icon: 'icon.png', folderPath: APPS + '/youtube', visible: true, type: 'app' },
    { id: 'settings.app', title: 'Settings', largeIcon: 'icon.png', icon: '', folderPath: APPS + '/settings.app', visible: true, type: 'app' },
    { id: 'com.cleanyourtv.manager', title: 'CleanYourTV', icon: 'icon.png', folderPath: APPS + '/com.cleanyourtv.manager', visible: true, type: 'app' },
    { id: 'hidden.app', title: 'Hidden', icon: 'icon.png', folderPath: APPS + '/netflix', visible: false, type: 'app' }] });
  fs.writeFileSync(path.join(bin, 'luna-send'), [
    '#!/bin/sh', 'URI="$6"',
    'case "$URI" in',
    '  *listApps) printf \'%s\' \'' + appsJson.replace(/'/g, "'\\''") + '\' ;;',
    '  *launch) printf \'{"returnValue":true}\' ;;',
    '  *getForegroundAppInfo) printf \'{"returnValue":true,"appId":"netflix"}\' ;;',
    '  *"/running") printf \'{"returnValue":true,"running":[{"appId":"netflix"},{"appId":"com.webos.app.home"}]}\' ;;',
    '  *closeByAppId|*"/close") printf \'{"returnValue":true}\' ;;',
    '  *getAllInputStatus) printf \'{"returnValue":true,"devices":[{"id":"hdmi1","label":"HDMI 1","icon":""}]}\' ;;',
    '  *getAppInfo) printf \'{"returnValue":true,"appInfo":{"id":"com.cleanyourtv.manager","version":"9.8.7"}}\' ;;',
    '  *removeRecent) printf \'{"returnValue":false}\' ;;',
    '  *) printf \'{"returnValue":false,"errorText":"not stubbed"}\' ;;',
    'esac'].join('\n'));
  fs.chmodSync(path.join(bin, 'luna-send'), 0o755);

  // a mock of the releases API; its port is normalised away in the recorded replies
  const rel = { tag_name: 'v9.8.7', name: 'v9.8.7', prerelease: false, body: 'stable notes',
    assets: ['frontend-9.8.5.tgz', 'com.cleanyourtv.manager_9.8.7_all.ipk'].map(n => ({ name: n, browser_download_url: 'https://example.com/' + n })) };
  const api = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'application/json' }); r.end(JSON.stringify(q.url.indexOf('releases/tags/') > 0 ? Object.assign({}, rel, { tag_name: 'test-x', name: 'Test build: x', prerelease: true }) : rel)); });
  await new Promise(r => api.on('listening', r));

  fs.writeFileSync(path.join(DIR, 'source'), 'o/r main\n');
  const svc = cp.spawn(process.execPath, [path.join(helper, 'helper.js')], {
    env: Object.assign({}, process.env, {
      CYTV_PORT: String(port), CYTV_DIR: DIR, CYTV_LIVE_DIR: path.join(DIR, 'live', 'deep'), CYTV_SERVICE_DIR: SVC,
      CYTV_THEMES: path.join(root, 'themes'), CYTV_API: 'http://127.0.0.1:' + api.address().port,
      PATH: bin + path.delimiter + process.env.PATH,
    }), stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  svc.stderr.on('data', c => stderr += String(c));

  let token = '';
  for (let i = 0; i < 80 && !token; i++) { try { token = fs.readFileSync(path.join(DIR, 'api-token'), 'utf8').trim(); } catch (_) { await new Promise(r => setTimeout(r, 250)); } }
  const call = (method, p, body, extra) => new Promise((resolve, reject) => {
    const rq = http.request({ host: '127.0.0.1', port, method, path: p, headers: Object.assign(extra && extra.noToken ? {} : { 'x-cytv-token': token }, body !== undefined ? { 'content-type': 'application/json' } : {}, (extra && extra.headers) || {}) },
      r => { const chunks = []; r.on('data', c => chunks.push(c)); r.on('end', () => { const b = Buffer.concat(chunks); resolve({ status: r.statusCode, type: (r.headers['content-type'] || '').split(';')[0], text: b.toString('utf8') }); }); });
    rq.on('error', reject); rq.end(body !== undefined ? JSON.stringify(body) : undefined);
  });

  const VOLATILE = /^(at|checkedAt|releaseAt|fetchedAt|now|published|ms|uptime|releasedAt)$/;
  const norm = o => {
    if (Array.isArray(o)) return o.map(norm);
    if (o && typeof o === 'object') {
      const out = {};
      for (const k of Object.keys(o).sort()) out[k] = VOLATILE.test(k) ? 0 : norm(o[k]);
      return out;
    }
    if (typeof o === 'string') return o.split(tmp).join('<tmp>').replace(/127\.0\.0\.1:\d+/g, '127.0.0.1:0');
    return o;
  };
  const cat = [];
  const step = async (name, method, p, body, extra) => {
    let r;
    try { r = await call(method, p, body, extra); } catch (e) { r = { status: 0, type: '', text: 'error ' + e }; }
    const out = { status: r.status };
    if (/^image\//.test(r.type)) out.type = r.type;
    else { try { out.body = norm(JSON.parse(r.text || 'null')); } catch (_) { out.body = r.text.slice(0, 400); } }
    cat.push([name, out]);
  };
  const pause = ms => new Promise(r => setTimeout(r, ms));

  await pause(500);
  // the contract; keep the order: later steps see the state earlier steps saved
  await step('version', 'GET', '/api/version');
  await step('no token is refused', 'GET', '/api/version', undefined, { noToken: true });
  await step('foreign origin is refused', 'GET', '/api/version', undefined, { headers: { origin: 'http://evil.example' } });
  await step('preflight', 'OPTIONS', '/api/apps');
  await step('apps', 'GET', '/api/apps');
  await step('inputs', 'GET', '/api/inputs');
  await step('foreground', 'GET', '/api/foreground');
  await step('launch', 'POST', '/api/launch', { id: 'netflix' });
  await step('launch refuses a bad id', 'POST', '/api/launch', { id: '../etc' });
  await step('launch refuses a junk body', 'POST', '/api/launch', { nope: true });
  await step('running', 'GET', '/api/running');
  await step('running close', 'POST', '/api/running/close', { id: 'netflix' });
  await step('running refuses an unlisted app', 'POST', '/api/running/close', { id: 'unknown.app' });
  await step('config save', 'POST', '/api/config', { dock: ['netflix'], clock: '24', sort: 'alpha', topbar: [{ label: 'TV', action: 'live' }] });
  await step('config drops junk', 'POST', '/api/config', { clock: '13', dock: [7], extra: 'x' });
  await step('apps after config', 'GET', '/api/apps');
  await step('manager status', 'GET', '/api/manager/status');
  await step('manager check', 'POST', '/api/manager/check');
  await step('manager status after check', 'GET', '/api/manager/status');
  await step('manager refuses a bad channel', 'POST', '/api/manager/channel', { tag: 'test-../x' });
  await step('manager tests', 'GET', '/api/manager/tests');
  await step('manager options', 'POST', '/api/manager/options', { liveTv: false });
  await step('frontend-ok', 'POST', '/api/frontend-ok', { version: '1.4.13' });
  await step('theme list', 'GET', '/api/theme/list');
  await step('theme set refuses unknown', 'POST', '/api/theme/set', { id: 'nope' });
  await step('theme set', 'POST', '/api/theme/set', { id: 'compact' });
  await step('theme wallpaper', 'GET', '/api/theme/wallpaper/midnight.jpg');
  await step('theme wallpaper traversal', 'GET', '/api/theme/wallpaper/..%2f..%2fconfig.json');
  await step('live status', 'GET', '/api/live/status');
  await step('live state fav', 'POST', '/api/live/state', { op: 'fav', key: 'aaaaaaaaaa', on: true });
  await step('live state bad op', 'POST', '/api/live/state', { op: 'nope', key: 'aaaaaaaaaa' });
  await step('live channels before pairing', 'GET', '/api/live/channels');
  await step('picker release', 'POST', '/api/picker/release', {});
  await step('notify image unknown id', 'GET', '/api/notify/img?id=zz');
  await step('unknown route', 'GET', '/api/nope');
  await pause(1500);
  await step('live status after state', 'GET', '/api/live/status');

  svc.kill(); api.close();
  if (stderr.trim()) console.log('service stderr:\n' + stderr.trim().split('\n').slice(0, 6).join('\n'));

  const got = JSON.parse(JSON.stringify(cat));
  if (record) {
    fs.mkdirSync(path.dirname(goldenFile), { recursive: true });
    fs.writeFileSync(goldenFile, JSON.stringify(got, null, 1) + '\n');
    console.log('recorded ' + got.length + ' replies to ' + path.relative(root, goldenFile));
  } else {
    let want = null;
    try { want = JSON.parse(fs.readFileSync(goldenFile, 'utf8')); } catch (_) {}
    if (!want) ok(false, 'golden file is missing: run node tools/api-golden.js --record');
    else if (JSON.stringify(got) === JSON.stringify(want)) ok(true, 'api contract: ' + got.length + ' replies match the golden file');
    else {
      ok(false, 'api contract changed: review the diff and re-record if intended (node tools/api-golden.js --record)');
      for (let i = 0; i < Math.max(got.length, want.length); i++) {
        const ga = JSON.stringify(got[i]), gb = JSON.stringify(want[i]);
        if (ga !== gb) console.log('  differs at #' + i + ' ' + (want[i] ? want[i][0] : '(absent)') + '\n    golden: ' + (gb || '').slice(0, 300) + '\n    now:    ' + (ga || '').slice(0, 300));
      }
    }
  }
  fs.rmSync ? fs.rmSync(tmp, { recursive: true, force: true }) : cp.spawnSync('rm', ['-rf', tmp]);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('error:', e); process.exit(1); });

// Checks that the service runs on the older Node.js of webOS 5 and 6 (8.x). Run with tools/node8-check.sh, or with any Node:
//   node tools/node8-check.js
// It parses every service file, loads the modules and runs the parts that used APIs Node 8 lacks (pairing code, URL and
// form handling, outgoing http requests, mkdir -p) against a local server. Nothing leaves this machine.
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), cp = require('child_process'), vm = require('vm'), zlib = require('zlib');
const root = path.join(__dirname, '..'), helper = path.join(root, 'helper');
let failed = 0;
const ok = (c, name) => { console.log((c ? 'ok   ' : 'FAIL ') + name); if (!c) failed++; };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cytv-n8-'));
process.env.CYTV_LIVE_DIR = path.join(tmp, 'live', 'deep');   // exercises mkdir -p as well
process.env.CYTV_DIR = path.join(tmp, 'cytv'); fs.mkdirSync(process.env.CYTV_DIR);
process.env.CYTV_SERVICE_DIR = path.join(tmp, 'svc'); fs.mkdirSync(process.env.CYTV_SERVICE_DIR);

// 1. syntax of everything that runs on the TV under Node
const files = fs.readdirSync(helper).filter(f => /\.js$/.test(f)).map(f => path.join(helper, f)).concat(path.join(root, 'scripts', 'jtool.js'));
for (const f of files) { const r = cp.spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' }); ok(r.status === 0, 'syntax ' + path.relative(root, f) + (r.status ? '\n' + r.stderr : '')); }

// 2. modules load (helper.js starts the service, so it is only parsed above)
for (const m of ['netcompat', 'notify', 'notifyapi', 'sharelog', 'picker', 'inputhook', 'manager', 'live', 'voice', 'theme']) { try { require(path.join(helper, m)); ok(true, 'loads ' + m); } catch (e) { ok(false, 'loads ' + m + ': ' + e.message); } }

const nc = require(path.join(helper, 'netcompat'));
const call = (fn, url, method, body) => new Promise((resolve, reject) => {
  let b = ''; const rq = nc.request(http, url, { method, headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': Buffer.byteLength(body || '') }, timeout: 4000 }, r => { r.on('data', c => b += c); r.on('end', () => resolve({ status: r.statusCode, body: b })); });
  rq.on('error', reject); rq.end(body || '');
});
  const fake = (url, method) => { const res = { code: 0, out: '', writeHead(c) { this.code = c; }, end(s) { this.out = s || ''; } }; return { req: { url, method: method || 'GET', headers: {} }, res }; };
  // XMLTV fixture: start/stop before channel (the common attribute order), a guide id that equals the playlist
  // channel's display name, an exact id, and one that differs from tvg-id only by punctuation.
  const stamp = ms => new Date(Date.now() + ms).toISOString().replace(/\D/g, '').slice(0, 14) + ' +0000';
  const guideXml = ['<?xml version="1.0"?>', '<tv>',
    '<channel id="TVP 1"><display-name>TVP 1</display-name></channel>',
    '<programme start="' + stamp(0) + '" stop="' + stamp(3600000) + '" channel="TVP 1"><title>News</title><desc>Morning</desc></programme>',
    '<programme start="' + stamp(3600000) + '" stop="' + stamp(7200000) + '" channel="tvpoland.news"><title>Talk</title></programme>',
    '<programme start="' + stamp(7200000) + '" stop="' + stamp(10800000) + '" channel="tvpoland news"><title>Late</title></programme>',
    '</tv>'].join('\n');

(async () => {
  // 3. compatibility layer against a local server
  const srv = http.createServer((q, r) => { r.writeHead(200, { 'x-path': q.url, 'x-ua': q.headers['user-agent'] || '' });
    if (q.url === '/pl.m3u') return r.end('#EXTM3U\n#EXTINF:-1 group-title="G",Chan A\nhttp://127.0.0.1:1/live/u/p/1.m3u8\n');
    if (q.url === '/guide.xml') return r.end(guideXml);
    if (q.url === '/guide.xml.gz') return r.end(zlib.gzipSync(Buffer.from(guideXml)));
    if (q.url === '/guide-hdr.xml.gz') { r.writeHead(200, { 'content-encoding': 'gzip' }); return r.end(zlib.gzipSync(Buffer.from(guideXml))); }
    if (q.url === '/guide-broken.gz') { r.writeHead(200, { 'content-encoding': 'gzip' }); r.write(zlib.gzipSync(Buffer.from(guideXml)).slice(0, 40)); return setTimeout(() => q.destroy(), 30); }
    if (q.url === '/guide.min.xml') return r.end(guideXml.replace(/\n/g, ''));
    r.end(q.method); }).listen(0, '127.0.0.1');
  await new Promise(r => srv.on('listening', r));
  const port = srv.address().port;
  const g = await new Promise((resolve, reject) => nc.get(http, 'http://127.0.0.1:' + port + '/a/b?x=1#h', { headers: { 'User-Agent': 't' }, timeout: 3000 }, r => { let b = ''; r.on('data', c => b += c); r.on('end', () => resolve({ r, b })); }).on('error', reject));
  ok(g.r.headers['x-path'] === '/a/b?x=1' && g.r.headers['x-ua'] === 't' && g.b === 'GET', 'http get with an address and options');
  const d = path.join(tmp, 'a', 'b', 'c'); nc.mkdirp(d); nc.mkdirp(d); ok(fs.existsSync(d), 'mkdir -p');
  ok(new nc.URLSearchParams('a=1&b=x').get('b') === 'x' && new nc.URL('http://h/p?q=1').searchParams.get('q') === '1', 'URL and URLSearchParams');
  let lo = 1e9, hi = -1, all = true; for (let i = 0; i < 3000; i++) { const n = nc.randomInt(100000, 1000000); if (n < 100000 || n >= 1000000 || n !== Math.floor(n)) all = false; lo = Math.min(lo, n); hi = Math.max(hi, n); }
  ok(all && hi - lo > 800000, 'randomInt stays in range and spreads');
  const dice = [0, 0, 0, 0, 0, 0]; for (let i = 0; i < 6000; i++) dice[nc.randomInt(0, 6)]++; ok(dice.every(c => c > 800 && c < 1200), 'randomInt is evenly spread');

  // 4. Live TV pairing end to end: code, form post, playlist fetch
  const live = require(path.join(helper, 'live'));
  let f = fake('/api/live/pair', 'POST'); await live.handle(f.req, f.res, '/api/live/pair', async () => ({}));
  const pairInfo = JSON.parse(f.res.out); ok(/^\d{6}$/.test(String(pairInfo.code)) && /^http:\/\//.test(pairInfo.url), 'live pairing gives a 6 digit code and an address');
  const pairUrl = new nc.URL(pairInfo.url);
  const wrong = await call(null, 'http://127.0.0.1:' + pairUrl.port + '/set', 'POST', 'code=000000&playlist=' + encodeURIComponent('http://127.0.0.1:' + port + '/pl.m3u'));
  ok(wrong.status === 403, 'a wrong code is refused');
  const saved = await call(null, 'http://127.0.0.1:' + pairUrl.port + '/set', 'POST', 'code=' + pairInfo.code + '&epg=&playlist=' + encodeURIComponent('http://127.0.0.1:' + port + '/pl.m3u'));
  ok(saved.status === 200, 'the right code saves the playlist address');
  let n = 0; for (let i = 0; i < 40 && !n; i++) { await new Promise(r => setTimeout(r, 150)); f = fake('/api/live/channels'); await live.handle(f.req, f.res, '/api/live/channels', async () => ({})); n = (JSON.parse(f.res.out).channels || []).length; }
  ok(n === 1, 'the playlist is fetched and parsed');

  // 4b. playlist details: quality, country, language, flags, categories, merged streams
  const pl = live.parseM3U(['#EXTM3U',
    '#EXTINF:-1 tvg-id="CNN.us@SD" tvg-country="US" tvg-language="English" group-title="News;World",CNN (480p)', 'http://h/a1.m3u8',
    '#EXTINF:-1 tvg-id="CNN.us@HD" group-title="News;World",CNN HD', 'http://h/a2.m3u8',
    '#EXTINF:-1 tvg-id="Foo.nl" group-title="Kids",Foo [Geo-blocked]', 'http://h/b.m3u8',
    '#EXTGRP:Sport', '#EXTINF:-1,Bar 4K [Not 24/7]', '#EXTVLCOPT:http-user-agent=X', 'http://h/c.m3u8|User-Agent=Y',
    '#EXTINF:-1,#### SEPARATOR ####', 'http://h/x',
    '#EXTINF:-1 tvg-id="" group-title="",Same', 'http://h/d.m3u8', '#EXTINF:-1 tvg-id="" group-title="",Same', 'http://h/e.m3u8'].join('\n'));
  const [cnn, foo, bar, same1, same2] = pl.channels;
  ok(pl.v === 2 && pl.channels.length === 5 && pl.channels.map(c => c.num).join() === '1,2,3,4,5', 'playlist: five channels, separators skipped, numbers in order');
  ok(cnn.alt.length === 1 && cnn.alt[0].url === 'http://h/a2.m3u8' && cnn.alt[0].q === 'HD' && cnn.q === 'SD', 'playlist: the same channel id with @SD/@HD is one channel with another stream');
  ok(cnn.cc === 'US' && cnn.lang === 'English' && cnn.cats.join() === 'News,World' && pl.groups.join() === 'News,World,Kids,Sport', 'playlist: country, language and several categories');
  ok(foo.fl === 1 && foo.cc === 'NL' && bar.fl === 6 && bar.q === '4K' && bar.group === 'Sport', 'playlist: geo-blocked, part-time and header markers, quality, #EXTGRP');
  ok(new Set(pl.channels.map(c => c.key)).size === 5 && /^[0-9a-f]{10}$/.test(cnn.key), 'playlist: every channel has its own key');

  // 4c. what the viewer did is kept in the service
  const st = async (b) => { const x = fake('/api/live/state', 'POST'); await live.handle(x.req, x.res, '/api/live/state', async () => b); return x.res.code; };
  const getSt = async () => { const x = fake('/api/live/state'); await live.handle(x.req, x.res, '/api/live/state', async () => ({})); return JSON.parse(x.res.out); };
  const k1 = 'abcdef0123', k2 = 'abcdef0124';
  await st({ op: 'fav', key: k1, on: true }); await st({ op: 'fav', key: k2, on: true }); await st({ op: 'fav', key: k1, on: false });
  await st({ op: 'recent', key: k1 }); await st({ op: 'recent', key: k2 }); await st({ op: 'recent', key: k1 }); await st({ op: 'failed', key: k2, on: true });
  let sv = await getSt(); ok(sv.fav.join() === k2 && sv.recent.join() === k1 + ',' + k2 && !!sv.failed[k2], 'state: favourites, recents (newest first) and failed channels');
  ok(await st({ op: 'fav', key: '../x', on: true }) === 400 && await st({ op: 'nope', key: k1 }) === 400, 'state: bad keys and operations are refused');
  for (let i = 0; i < 40; i++) await st({ op: 'recent', key: ('0000000000' + i.toString(16)).slice(-10) }); sv = await getSt(); ok(sv.recent.length === 30, 'state: recents are capped');
  await new Promise(r => setTimeout(r, 1300)); ok(JSON.parse(fs.readFileSync(path.join(process.env.CYTV_LIVE_DIR, 'state.json'), 'utf8')).fav.join() === k2, 'state: written to the live folder');

  // 4d. why a stream does not play
  const big = Buffer.alloc(9000, 1);
  const ps = http.createServer((q, r) => {
    const t = (c, type, body) => { r.writeHead(c, type ? { 'content-type': type } : {}); r.end(body || ''); };
    if (q.url === '/ok.ts') return t(200, 'video/mp2t', big);
    if (q.url === '/hls.m3u8') return t(200, 'application/vnd.apple.mpegurl', '#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:10,\nseg.ts\n');
    if (q.url === '/drm.m3u8') return t(200, 'application/x-mpegurl', '#EXTM3U\n#EXT-X-KEY:METHOD=SAMPLE-AES,URI="skd://x",KEYFORMAT="com.apple.streamingkeydelivery"\n#EXTINF:10,\nseg.ts\n');
    if (q.url === '/page') return t(200, 'text/html', '<!doctype html><title>login</title>');
    if (q.url === '/go') { r.writeHead(302, { location: '/ok.ts' }); return r.end(); }
    if (q.url === '/forbidden') return t(403);
    if (q.url === '/missing') return t(404);
    if (q.url === '/boom') return t(502);
    t(200, 'video/mp2t', big);
  }).listen(0, '127.0.0.1'); await new Promise(r => ps.on('listening', r));
  const pp = 'http://127.0.0.1:' + ps.address().port, why = async u => (await live.probe(u)).reason;
  const got = [await why(pp + '/ok.ts'), await why(pp + '/hls.m3u8'), await why(pp + '/drm.m3u8'), await why(pp + '/page'), await why(pp + '/go'), await why(pp + '/forbidden'), await why(pp + '/missing'), await why(pp + '/boom'), await why('http://127.0.0.1:1/x')];
  ok(got.join() === 'ok,ok,drm,notvideo,ok,refused,gone,server,unreachable', 'probe: ok, ok, drm, not a video, redirect followed, refused, gone, server error, unreachable (' + got.join() + ')');
  f = fake('/api/live/probe?key=zzzzzzzzzz&i=0'); await live.handle(f.req, f.res, '/api/live/probe', async () => ({})); ok(f.res.code === 404, 'probe: only streams of the playlist are asked about');
  ps.close();
  f = fake('/api/live/reset', 'POST'); await live.handle(f.req, f.res, '/api/live/reset', async () => ({}));

  // 4b2. guide: attribute order, id/name matching, .xml.gz and the Xtream guide address
  const chans = [{ id: 'ch1', name: 'TVP 1' }, { id: 'tvpoland.news', name: 'TV Poland News' }];
  const e1 = await live.loadEpg('http://127.0.0.1:' + port + '/guide.xml', chans);
  ok(e1.count === 3 && e1.byId.ch1.length === 1 && e1.byId.ch1[0][2] === 'News' && e1.byId.ch1[0][3] === 'Morning'
    && e1.byId['tvpoland.news'].length === 2 && e1.byId['tvpoland.news'][0][2] === 'Talk' && e1.byId['tvpoland.news'][1][2] === 'Late',
    'guide: start/stop before channel, exact ids, display-name ids and punctuation-only differences all match');
  const e2 = await live.loadEpg('http://127.0.0.1:' + port + '/guide.xml.gz', chans);
  ok(e2.count === 3, 'guide: a .xml.gz source without a gzip content-encoding header loads');
  const e4 = await live.loadEpg('http://127.0.0.1:' + port + '/guide.min.xml', chans);
  ok(e4.count === 3 && e4.byId.ch1[0][2] === 'News' && e4.byId['tvpoland.news'][1][2] === 'Late',
    'guide: a minified single-line XMLTV loads with bounded memory and keeps its last programme');
  const e3 = await live.loadEpg('http://127.0.0.1:' + port + '/guide-hdr.xml.gz', chans);
  ok(e3.count === 3, 'guide: a .xml.gz sent with a proper content-encoding header is not decoded twice');
  const broken = live.loadEpg('http://127.0.0.1:' + port + '/guide-broken.gz', chans);
  const verdict = await Promise.race([broken.then(() => 'accepted', () => 'rejected'), new Promise(r => setTimeout(() => r('hung'), 3000))]);
  broken.catch(() => {});
  ok(verdict === 'rejected', 'guide: a connection dropped mid-gzip rejects instead of hanging the refresh');
  ok(live.xtreamEpg('http://h:8080/get.php?username=u%20x&password=p&type=m3u_plus') === 'http://h:8080/xmltv.php?username=u%20x&password=p',
    'guide: the Xtream guide address is derived from a get.php playlist address');
  ok(live.xtreamEpg('http://h/playlist.m3u') === '' && live.xtreamEpg('http://h/get.php?type=m3u_plus') === '' && live.xtreamEpg('::bad') === '',
    'guide: no Xtream derivation without get.php or credentials');

  // 4c. player variant order, extracted from the launcher page so the inline script cannot drift
  const vfSrc = /\n  function variantsFor\(url\)\{[\s\S]*?\n  \}/.exec(fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8'));
  ok(!!vfSrc, 'launcher page contains variantsFor');
  const vf = vm.runInNewContext('(function(){' + vfSrc[0] + ';return variantsFor})()');
  const liveTs = vf('http://h/live/u/p/12.ts');
  ok(liveTs.length === 3 && liveTs[0].src === 'http://h/live/u/p/12.ts' && !liveTs[0].type
    && liveTs[1].src === 'http://h/live/u/p/12.ts' && liveTs[1].type === 'application/x-mpegURL'
    && liveTs[2].src === 'http://h/live/u/p/12.m3u8' && liveTs[2].type === 'application/x-mpegURL',
    'variants: a /live/…/*.ts link starts with the plain variant; typed HLS and the provider .m3u8 follow');
  ok(vf('http://h/a.m3u8').length === 1 && !vf('http://h/a.m3u8')[0].type
    && vf('http://h/a.m3u8?x=1').length === 1, 'variants: a plain .m3u8 link keeps a single untyped variant');
  const other = vf('http://h/v.ts');
  ok(other.length === 2 && other[0].type === 'application/x-mpegURL' && other[0].src === 'http://h/v.ts' && !other[1].type,
    'variants: other URLs keep the typed-HLS-first order');

  // 4d. the real fallback flow: the launcher's LIVE module on a fake DOM, <video> errors driven by hand
  const pageSrc = fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8');
  ok(pageSrc.indexOf("v.addEventListener('error',onError,true)") >= 0, 'player listens for error in the capture phase, so a failing <source> moves on at once');
  const liveSrc = /var LIVE=\(function\(\)\{[\s\S]*?return o\}\)\(\);/.exec(pageSrc)[0];
  function playerHarness() {
    const log = [], calls = [], els = {};
    let video = null;
    const sandbox = {
      t: s => s, LANG: 'en', window: {}, localStorage: { getItem: () => null, setItem() {} },
      $: id => els[id] || (els[id] = { classList: { add() {}, remove() {}, toggle() {} }, style: {}, textContent: '', innerHTML: '', value: '', appendChild() {}, focus() {}, blur() {}, addEventListener() {}, src: '' }),
      setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
      document: {
        documentElement: {},
        getElementById: id => sandbox.$(id),
        createElement: tag => {
          if (tag !== 'video') return { src: '', type: '' };
          const v = { children: [], handlers: {} };
          Object.defineProperty(v, 'src', { set(x) { v._src = x; log.push('src ' + x); }, get() { return v._src || ''; } });
          Object.defineProperty(v, 'firstChild', { get() { return v.children[0] || null; } });
          v.appendChild = c => v.children.push(c);
          v.removeChild = () => v.children.pop();
          v.removeAttribute = () => { v._src = ''; };
          v.load = () => { const c = v.children[v.children.length - 1]; log.push(c ? 'typed ' + c.type + ' ' + c.src : 'src ' + v._src); };
          v.pause = () => {};
          v.addEventListener = (type, fn) => { v.handlers[type] = fn; };
          video = v; return v;
        }
      },
      api: (url, body) => {
        calls.push(url.split('?')[0] + (body !== undefined ? ' POST' : ''));
        return Promise.resolve(
          url.indexOf('/api/live/status') >= 0 ? { configured: true } :
          url.indexOf('/api/live/channels') >= 0 ? { groups: ['News'], channels: [[1, 'c1', 'Chan', 'News', '', 'http://h/live/u/p/1.ts', 'k1', '', '', '', 0, ['News'], [['http://h/alt/u/2.ts', '']]]] } :
          url.indexOf('/api/live/probe') >= 0 ? { reason: 'gone' } : {});
      }
    };
    return { log, calls, els, get video() { return video; }, run: () => vm.runInNewContext(liveSrc + ';LIVE', sandbox) };
  }
  const tick = () => new Promise(r => setTimeout(r, 20));
  { // a stream that starts: only the plain variant is requested, no typed fallback is touched
    const h = playerHarness(), L = h.run(); await tick(); L.enter(false); await tick();
    ok(h.log.join('|') === 'src http://h/live/u/p/1.ts', 'player: a /live/…/*.ts channel starts on the plain variant');
    h.video.handlers.playing();
    ok(h.log.length === 1, 'player: starting playback does not touch the fallback variants');
    L.exit();
  }
  { // every variant fails: plain → typed HLS → provider .m3u8 per stream, then give up. The second stream has no /live/
    // segment, so it deliberately exercises the other branch order (typed first).
    const h = playerHarness(), L = h.run(); await tick(); L.enter(false); await tick();
    const want = ['src http://h/live/u/p/1.ts', 'typed application/x-mpegURL http://h/live/u/p/1.ts', 'typed application/x-mpegURL http://h/live/u/p/1.m3u8',
      'typed application/x-mpegURL http://h/alt/u/2.ts', 'src http://h/alt/u/2.ts'];
    let guard = 0;
    while (h.log.length < want.length && guard++ < 20) { const n = h.log.length; h.video.handlers.error(); if (h.log.length === n) break; }
    h.video.handlers.error();   // one past the last variant: giveUp marks the channel failed and probes why
    await tick();
    ok(h.log.join('\n') === want.join('\n'), 'player: errors walk the variant list of each stream, then give up (' + h.log.length + '/5)');
    ok(h.calls.indexOf('/api/live/probe') >= 0 && h.els['lv-msg'].innerHTML.indexOf('was not found') >= 0,
      'player: after the last variant the channel is marked failed with the probe reason');
    L.exit();
  }

  // 5. version comparison used by the updater
  const { cmp } = require(path.join(helper, 'manager')); ok(cmp('1.5.10', '1.5.9') > 0 && cmp('1.5.3', '1.5.3') === 0 && cmp('1.4.9', '1.5.0') < 0, 'version compare');

  // 6. update channels: stable release or a test build, against a mock of the GitHub API
  const rel = (tag, ver, fe, body, pre) => ({ tag_name: tag, name: pre ? 'Test build: ' + tag.replace(/^test-/, '') : tag, prerelease: !!pre, body, published_at: '2026-10-23T10:00:00Z', assets: [].concat(...['com.cleanyourtv.manager_' + ver + '_all.ipk', 'frontend-' + fe + '.tgz'].map(n => [{ name: n, browser_download_url: 'http://x/' + n }, { name: n + '.sha256', browser_download_url: 'http://x/' + n + '.sha256' }])) });
  const api = http.createServer((q, r) => {
    const send = o => { r.writeHead(o ? 200 : 404, { 'content-type': 'application/json' }); r.end(JSON.stringify(o || {})); };
    if (q.url === '/repos/o/r/releases/latest') return send(rel('v1.5.3', '1.5.3', '1.4.5', 'stable'));
    if (q.url === '/repos/o/r/releases/tags/test-foo-bar') return send(rel('test-foo-bar', '1.5.4', '1.4.6', 'build: abc1234\nbranch: foo/bar', true));
    if (q.url === '/repos/o/r/releases?per_page=40') return send([rel('test-foo-bar', '1.5.4', '1.4.6', 'build: abc1234\nbranch: foo/bar', true), rel('v1.5.3', '1.5.3', '1.4.5', 'stable'), rel('test-main', '9.9.9', '9.9.9', 'x', false)]);
    send(null); }).listen(0, '127.0.0.1');
  await new Promise(r => api.on('listening', r));
  process.env.CYTV_API = 'http://127.0.0.1:' + api.address().port;
  fs.writeFileSync(path.join(process.env.CYTV_DIR, 'source'), 'o/r main\n');
  const mgr = require(path.join(helper, 'manager'));
  let m;   // the service reads its own version when it starts, so each scenario starts one
  const start = v => { m = mgr.create({ luna: async () => ({}), readConf: () => ({}), writeConf() {}, inputhook: { status: () => ({}), ensure() {} }, VERSION: v, pickerShown: () => 0 }); };
  const ask = async (act, method, body) => { const x = fake('/api/manager/' + act, method); await m.handle(x.req, x.res, '/api/manager/' + act, async () => body || {}); return { code: x.res.code, j: JSON.parse(x.res.out) }; };
  const bf = path.join(process.env.CYTV_DIR, 'BUILD');
  start('1.5.2'); let r = await ask('check', 'POST'); ok(r.j.service.updateTo === '1.5.3' && r.j.channel === '', 'stable: offers the newer release');
  start('1.5.3'); r = await ask('check', 'POST'); ok(r.j.service.updateTo === null, 'stable: nothing to offer at the same version');
  r = await ask('tests', 'GET'); ok(r.j.builds.length === 1 && r.j.builds[0].tag === 'test-foo-bar' && r.j.builds[0].build === 'abc1234' && r.j.builds[0].service === '1.5.4', 'the list holds pre-releases named test-* only');
  r = await ask('channel', 'POST', { tag: 'test-../x' }); ok(r.code === 400, 'a bad channel name is refused');
  r = await ask('channel', 'POST', { tag: 'test-foo-bar' }); ok(r.j.channel === 'test-foo-bar' && r.j.service.updateTo === '1.5.4' && r.j.release.test === true, 'a test channel offers the test build');
  start('1.5.4'); fs.writeFileSync(bf, 'abc1234\n'); r = await ask('check', 'POST'); ok(r.j.service.updateTo === null && r.j.service.build === 'abc1234', 'the same build is not offered again');
  fs.writeFileSync(bf, 'def5678\n'); r = await ask('check', 'POST'); ok(r.j.service.updateTo === '1.5.4', 'another commit of the same version is offered');
  r = await ask('channel', 'POST', { tag: '' }); ok(r.j.channel === '' && r.j.service.updateTo === '1.5.3', 'back on stable after a test build offers the stable release, even an older one');
  fs.unlinkSync(bf); start('1.5.3'); r = await ask('check', 'POST'); ok(r.j.service.updateTo === null, 'stable without a test build installed: no offer at the same version');
  const previousDir = path.join(process.env.CYTV_DIR, 'app.prev'); fs.mkdirSync(previousDir);
  fs.writeFileSync(path.join(previousDir, 'version.json'), JSON.stringify({ version: '1.4.12' }));
  r = await ask('status', 'GET'); ok(r.j.frontend.previous === null, 'rollback does not offer a legacy launcher without authenticated API support');
  fs.writeFileSync(path.join(previousDir, 'version.json'), JSON.stringify({ version: '1.4.13', apiVersion: 2 }));
  r = await ask('status', 'GET'); ok(r.j.frontend.previous === '1.4.13', 'rollback offers a previous launcher that supports the authenticated API');

  // 7. Live TV is optional: the option is stored and the key binds are refreshed
  let store = {}, ensured = 0;
  m = mgr.create({ luna: async () => ({}), readConf: () => JSON.parse(JSON.stringify(store)), writeConf: c => { store = JSON.parse(JSON.stringify(c)); }, inputhook: { status: () => ({}), ensure() { ensured++; } }, VERSION: '1.5.8', pickerShown: () => 0 });
  r = await ask('status', 'GET'); ok(r.j.options.liveTv === true && r.j.keys.guide === '', 'Live TV is on by default and no Guide key is learned');
  r = await ask('options', 'POST', { liveTv: false }); ok(r.j.options.liveTv === false && store.options.liveTv === false && ensured > 0, 'switching Live TV off is stored and refreshes the key binds');
  r = await ask('options', 'POST', { liveTv: 'no' }); ok(r.j.options.liveTv === false, 'only a boolean changes the option');
  r = await ask('options', 'POST', { liveTv: true }); ok(r.j.options.liveTv === true, 'switching Live TV on again');
  // 8. Home Assistant (Assist): a mock server for success, not understood, bad token, unreachable and slow answers
  const haLog = [], TOKEN = 'secret-ha-token-123';
  const haSrv = http.createServer((q, r) => {
    let b = ''; q.on('data', c => b += c); q.on('end', () => {
      const send = (c, o) => { r.writeHead(c, { 'content-type': 'application/json' }); r.end(JSON.stringify(o)); };
      if (q.headers.authorization !== 'Bearer ' + TOKEN) return send(401, { message: '401: Unauthorized' });
      if (q.url === '/api/config') return send(200, { location_name: 'Home', version: '2026.10.0' });
      if (q.url === '/api/states') return send(200, [{ entity_id: 'light.x', attributes: {} }, { entity_id: 'conversation.home_assistant', attributes: { friendly_name: 'Home Assistant' } }, { entity_id: 'conversation.llm', attributes: {} }]);
      if (q.url !== '/api/conversation/process') return send(404, {});
      const o = JSON.parse(b); haLog.push(o);
      const reply = (type, speech, code) => send(200, { conversation_id: 'conv-1', response: { response_type: type, data: code ? { code } : {}, speech: { plain: { speech } } } });
      if (o.text === 'turn on the light') return reply('action_done', 'Turned on the light');
      if (o.text === 'quiet') return reply('action_done', '');
      if (o.text === 'spoken done') return reply('query_answer', 'Done');
      if (o.text === 'slow') return setTimeout(() => reply('query_answer', 'Finally'), 600);
      reply('error', 'Sorry, I couldn\'t understand that', 'no_intent_match');
    });
  }).listen(0, '127.0.0.1');
  const orSrv = http.createServer((q, r) => { let b = ''; q.on('data', c => b += c); q.on('end', () => { r.writeHead(200, { 'content-type': 'application/json' }); r.end(JSON.stringify({ choices: [{ message: { content: 'The AI says hello' } }] })); }); }).listen(0, '127.0.0.1');
  await Promise.all([haSrv, orSrv].map(x => new Promise(r => x.on('listening', r))));
  process.env.CYTV_OPENROUTER = 'http://127.0.0.1:' + orSrv.address().port;
  const voice = require(path.join(helper, 'voice'));
  let vconf = {}; const cards = [];
  const v = voice.create({ readConf: () => JSON.parse(JSON.stringify(vconf)), writeConf: c => { vconf = JSON.parse(JSON.stringify(c)); }, notify: { show: async o => { cards.push(o); } } });
  const vask = async (act, body, method) => { const x = fake('/api/voice/' + act, method || 'POST'); await v.handle(x.req, x.res, '/api/voice/' + act, async () => body || {}); return { code: x.res.code, j: JSON.parse(x.res.out || '{}') }; };
  const haUrl = 'http://127.0.0.1:' + haSrv.address().port;
  r = await vask('set', { ha: { url: 'ftp://x' } }); ok(r.code === 400, 'a Home Assistant address that is not http(s) is refused');
  r = await vask('set', { ha: { route: 'sideways' } }); ok(r.code === 400, 'an unknown routing is refused');
  r = await vask('set', { ha: { url: haUrl + '/', token: 'wrong' } }); ok(r.code === 200 && r.j.ha.url === haUrl && r.j.ha.route === 'ha-first', 'the address is stored without a trailing slash; the default routing is Home Assistant first');
  ok(JSON.stringify(r.j).indexOf('wrong') < 0 && r.j.ha.hasToken === true, 'the status never contains the token');
  r = await vask('ha-test'); ok(r.code === 502 && /refused the access token/.test(r.j.error), 'a bad token is reported');
  await vask('set', { ha: { token: TOKEN } });
  r = await vask('ha-test'); ok(r.j.name === 'Home' && r.j.version === '2026.10.0', 'test connection reads the name and version');
  r = await vask('ha-agents'); ok(r.j.agents.length === 2 && r.j.agents[0].id === 'conversation.home_assistant' && r.j.agents[0].name === 'Home Assistant', 'agents are the conversation.* entities');
  r = await vask('ask', { text: 'turn on the light', card: false }); ok(r.j.answer === 'Turned on the light' && r.j.via === 'ha', 'Assist answers an understood command');
  r = await vask('ask', { text: 'quiet', card: false }); ok(r.j.answer === 'Done', 'an action without speech shows Done');
  ok(haLog[1].conversation_id === 'conv-1' && !haLog[0].conversation_id, 'the conversation id is passed on to the next request');
  await vask('ask', { text: 'quiet' }); ok(cards[cards.length - 1].textKey === 'Done', 'generated completion is marked for localisation');
  await vask('ask', { text: 'spoken done' }); ok(cards[cards.length - 1].text === 'Done' && !cards[cards.length - 1].textKey, 'external answers are not marked for translation even when they match a message key');
  r = await vask('ask', { text: 'slow', card: false }); ok(r.j.answer === 'Finally', 'a slow answer is waited for');
  r = await vask('ask', { text: 'what is love', card: false }); ok(r.j.answer === 'Sorry, I couldn\'t understand that' && r.j.via === 'ha', 'not understood and no AI: Assist\'s own message is shown');
  await vask('set', { llm: { key: 'sk-test', enabled: true } });
  r = await vask('ask', { text: 'what is love', card: false }); ok(r.j.answer === 'The AI says hello' && r.j.via === 'ai', 'not understood: the same text goes to the AI');
  r = await vask('ask', { text: 'turn on the light', card: false }); ok(r.j.via === 'ha', 'understood: the AI is not asked');
  await vask('set', { ha: { route: 'ha-only' } });
  r = await vask('ask', { text: 'what is love', card: false }); ok(r.j.via === 'ha' && /couldn't understand/.test(r.j.answer), 'Home Assistant only: never the AI');
  await vask('set', { ha: { route: 'ai-only' } }); const n0 = haLog.length;
  r = await vask('ask', { text: 'turn on the light', card: false }); ok(r.j.via === 'ai' && haLog.length === n0, 'AI only: Home Assistant is not asked');
  await vask('set', { ha: { route: 'ha-first', agent: 'conversation.llm' } });
  await vask('ask', { text: 'turn on the light', card: false }); ok(haLog[haLog.length - 1].agent_id === 'conversation.llm', 'the chosen agent is sent');
  await vask('set', { ha: { agent: '' } }); await vask('forget'); await vask('ask', { text: 'turn on the light', card: false }); ok(!haLog[haLog.length - 1].conversation_id && !('agent_id' in haLog[haLog.length - 1]), 'forgetting starts a new conversation; no agent means the default');
  r = await vask('set', { ha: { url: 'http://127.0.0.1:1' } }); r = await vask('ask', { text: 'turn on the light', card: false }); ok(r.j.answer === 'The AI says hello' && r.j.via === 'ai', 'Home Assistant unreachable: the AI answers');
  await vask('set', { llm: { clearKey: true } }); r = await vask('ask', { text: 'turn on the light', card: false }); ok(!r.j.answer && /Home Assistant:/.test(r.j.error), 'Home Assistant unreachable and no AI: the error is reported');
  await vask('set', { ha: { clear: true } }); r = await vask('status', null, 'GET'); ok(r.j.ha.configured === false && r.j.ha.hasToken === false, 'removing Home Assistant clears the address and token');
  haSrv.close(); orSrv.close();
  // 9. Themes: bundled files are valid, values are whitelisted and clamped, extends works, set / revert work, wallpapers only from the bundled folder
  const themeMod = require(path.join(helper, 'theme')), tdir = path.join(root, 'themes');
  const bundled = fs.readdirSync(tdir).filter(n => /\.json$/.test(n));
  ok(bundled.length >= 5 && bundled.indexOf('classic.json') >= 0, 'themes are bundled with the package');
  let allOk = true; for (const n of bundled) { const raw = JSON.parse(fs.readFileSync(path.join(tdir, n), 'utf8')), t = themeMod.normalize(raw, n.replace(/\.json$/, '')); if (!t || (raw.effects && raw.effects.wallpaper && t.v['effects.wallpaper'] !== raw.effects.wallpaper)) { allOk = false; console.log('  invalid theme file ' + n); } }
  ok(allOk, 'every bundled theme file is valid and its wallpaper is accepted');
  const unknownKeys = [], known = new Set(themeMod.SCHEMA.map(r => r[0])); const walk = (o, pre) => { for (const k of Object.keys(o)) { const key = pre ? pre + '.' + k : k; if (o[k] && typeof o[k] === 'object') walk(o[k], key); else if (!known.has(key) && ['name', 'author', 'description', 'extends'].indexOf(key) < 0) unknownKeys.push(key); } };
  for (const n of bundled) walk(JSON.parse(fs.readFileSync(path.join(tdir, n), 'utf8')), '');
  ok(unknownKeys.length === 0, 'bundled theme files use only keys of the schema' + (unknownKeys.length ? ': ' + unknownKeys.join(', ') : ''));
  ok(themeMod.SCHEMA.every(r => ['name', 'author', 'description', 'extends'].indexOf(r[0].split('.')[0]) < 0), 'no setting group shares a name with the theme\'s own fields (name, author, description, extends)');
  const bad = themeMod.normalize({ name: 'x'.repeat(500), colors: { night: 'red; background:url(//evil)', ink: '#12345', accent: 5 }, grid: { cols: 99, tileH: -5, radius: 1e9 }, type: { scale: '2', font: 'comic' }, clock: { layout: 'sideways', scale: 50 }, effects: { glow: 7, speed: NaN, wallpaper: '../../etc/passwd', wallpaperDim: 5 }, css: 'body{display:none}' }, 'evil');
  ok(bad.name.length === 40 && bad.v['colors.night'] === '#07080b' && bad.v['colors.ink'] === '#f5f6f8' && bad.v['colors.accent'] === '#f5f6f8', 'colours must be #rrggbb, anything else falls back');
  ok(bad.v['grid.cols'] === 14 && bad.v['grid.tileH'] === 80 && bad.v['grid.radius'] === 100 && bad.v['type.scale'] === 1 && bad.v['type.font'] === 'default' && bad.v['clock.layout'] === 'inline' && bad.v['clock.scale'] === 2.5, 'numbers are clamped, enums and types are checked');
  ok(bad.v['effects.glow'] === 1 && bad.v['effects.speed'] === 1 && bad.v['effects.wallpaper'] === '' && bad.v['effects.wallpaperDim'] === 0.9 && !('css' in bad.v), 'effects are clamped, a wallpaper path is refused and unknown keys are dropped');
  ok(themeMod.normalize({}, '../x') === null, 'a bad theme id is refused');
  const base = themeMod.normalize({ grid: { cols: 7 }, dock: { count: 6 } }, 'base'), kid = themeMod.normalize({ grid: { cols: 'many' }, bar: { style: 'round' } }, 'kid', base.v);
  ok(kid.v['grid.cols'] === 7 && kid.v['dock.count'] === 6 && kid.v['bar.style'] === 'round', 'a theme that extends another keeps its values where its own are missing or invalid');
  let tconf = {}; const th = themeMod.create({ readConf: () => JSON.parse(JSON.stringify(tconf)), writeConf: c => { tconf = JSON.parse(JSON.stringify(c)); } });
  const tcall = async (act, body, method) => { const x = fake('/api/theme/' + act, method || 'POST'); await th.handle(x.req, x.res, '/api/theme/' + act, async () => body || {}); return { code: x.res.code, j: x.res.out && x.res.out[0] === '{' ? JSON.parse(x.res.out) : x.res.out }; };
  r = await tcall('list', null, 'GET'); ok(r.j.current.id === 'classic' && r.j.themes.length === bundled.length && r.j.previous === null, 'the default theme is classic');
  const cl = th.resolved();
  ok(cl.vars['--cols'] === '10' && cl.vars['--tile-h'] === '151px' && cl.vars['--acc'] === '#f5f6f8' && cl.vars['--view-top'] === '300px' && cl.vars['--dock-t'] === '60px' && cl.vars['--grid-t'] === '350px' && cl.vars['--clock-l'] === '96px' && cl.vars['--bar-r'] === '96px' && cl.gt === 350 && cl.viewH === 780 && cl.overlay === false, 'classic resolves to the original positions');
  r = await tcall('set', { id: 'nope' }); ok(r.code === 400, 'an unknown theme is refused');
  r = await tcall('set', { id: 'compact' }); ok(r.j.current.id === 'compact' && r.j.previous.id === 'classic' && th.resolved().cols === 12, 'choosing a theme applies it and remembers the previous one');
  r = await tcall('set', { accent: 'blue' }); ok(r.code === 400, 'an accent must be a hex colour');
  r = await tcall('set', { accent: '#FF8A3D' }); ok(th.resolved().vars['--acc'] === '#ff8a3d' && th.resolved().vars['--acc-ink'] === '#0b0c10' && th.resolved().vars['--focus'] === '#ff8a3d', 'an accent overrides the theme\'s own, with readable text on it');
  r = await tcall('set', { id: 'midnight' }); ok(r.j.current.accent === '' && th.resolved().wallpaper && th.resolved().wallpaper.file === 'midnight.jpg', 'a new theme brings its own accent and wallpaper');
  r = await tcall('set', { id: 'bloom' }); const sn = th.resolved();
  ok(sn.overlay === true && sn.attrs.grid === 'overlay' && sn.attrs.bar === 'round' && sn.attrs.labels === 'hide' && sn.attrs.clock === 'stack' && sn.dockN === 6 && sn.vars['--dock-b'] === '68px' && sn.vars['--dock-t'] === 'auto' && sn.vars['--dock-tx'] === 'translateX(-50%)' && sn.vars['--view-top'] === '0px' && sn.vars['--name-d'] === 'none', 'a dock at the bottom resolves to an overlay grid with its positions');
  r = await tcall('revert'); ok(r.j.current.id === 'midnight', 'revert goes back to the previous theme');
  r = await tcall('wallpaper/midnight.jpg', null, 'GET'); ok(r.code === 200, 'a bundled wallpaper is served');
  r = await tcall('wallpaper/notused.jpg', null, 'GET'); ok(r.code === 404, 'a file no theme uses is not served');
  r = await tcall('wallpaper/..%2f..%2fpasswd', null, 'GET'); ok(r.code === 404, 'a path is not served as a wallpaper');
  // the documentation table is generated from the schema
  const gen = require(path.join(root, 'tools', 'theme-docs.js')), docs = fs.readFileSync(path.join(root, 'docs', 'themes.md'), 'utf8');
  ok(docs.indexOf(gen.table()) >= 0, 'docs/themes.md holds the table generated from the schema (run: node tools/theme-docs.js)');

  // 8. the Inputs picker runs on demand only: nothing starts or keeps it in the background (remote freeze, issue #5)
  {
    const calls = [];
    const luna = async (uri, p) => { calls.push([uri, p]); return { returnValue: true }; };
    const picker = require(path.join(helper, 'picker'));
    ok(picker.status().mode === 'ondemand' && !picker.status().releasedAt, 'picker status reports the on-demand mode with no release yet');
    const r = await picker.release(luna);
    ok(calls.length === 1 && calls[0][0] === 'luna://com.webos.applicationManager/closeByAppId' && calls[0][1].id === 'com.cleanyourtv.picker' && r.returnValue === true,
      'picker release closes only the picker app');
    ok(picker.status().releasedAt > 0, 'picker remembers when it was last released');
    calls.length = 0;
    await new Promise(done => setTimeout(done, 120));
    ok(calls.length === 0, 'nothing starts the picker in the background: the keepalive is gone');
    calls.length = 0;
    const before = picker.status().releasedAt;
    const bad = await picker.release(async (uri, p) => { calls.push([uri, p]); return { returnValue: false, errorText: 'not running' }; });
    ok(bad.returnValue === false && calls.length === 1 && picker.status().releasedAt === before,
      'a failed close is reported, does not throw and does not update the release time');
  }

  // 9. the picker's window handling: shipped metadata, the page's own activation and the bootstrap rewrite (issue #5)
  {
    const info = JSON.parse(fs.readFileSync(path.join(root, 'picker', 'app', 'appinfo.json'), 'utf8'));
    ok(info.handlesRelaunch === true && info.defaultWindowType === 'overlay' && info.visible === false,
      'picker appinfo: relaunch is handled by the page; ships as a hidden overlay window');
    ok(/else\{activate\(\);show\(\)\}/.test(fs.readFileSync(path.join(root, 'picker', 'app', 'index.html'), 'utf8')),
      'picker page: a relaunch of a hidden picker activates the window itself');
    const jt = path.join(root, 'scripts', 'jtool.js'), ai = path.join(tmp, 'wintype.json');
    fs.writeFileSync(ai, JSON.stringify({ id: 'x', defaultWindowType: 'overlay' }));
    ok(cp.spawnSync(process.execPath, [jt, 'wintype', ai, 'topui']).status === 0 && JSON.parse(fs.readFileSync(ai, 'utf8')).defaultWindowType === 'topui',
      'jtool wintype rewrites the window type when it differs');
    ok(cp.spawnSync(process.execPath, [jt, 'wintype', ai, 'topui']).status === 1, 'jtool wintype is quiet when the type already matches');
    ok(/fix_window_type \$APPS_ROOT\/com\.cleanyourtv\.picker/.test(fs.readFileSync(path.join(root, 'scripts', 'bootstrap.sh'), 'utf8')),
      'bootstrap rewrites the picker window type the same way as the notification app');
  }

  // 10. spacing is pure CSS: the flexgap runtime shim is gone (row jitter on webOS 5/6, issue #5)
  {
    ok(!fs.existsSync(path.join(root, 'shared', 'flexgap.js')) && !/FLEXGAP|flexgap/.test(fs.readFileSync(path.join(root, 'ipk', 'build.py'), 'utf8')),
      'the flexgap shim and its build injection are removed');
    for (const file of ['app/index.html', 'manager/app/index.html', 'picker/app/index.html', 'notify/app/index.html']) {
      const page = fs.readFileSync(path.join(root, file), 'utf8');
      ok(!/flexgap|data-fg/.test(page), file + ': no flexgap markers');
      const style = /<style>([\s\S]*?)<\/style>/.exec(page)[1], offenders = [];
      const re = /([^{}]+)\{([^{}]*)\}/g; let m;
      while ((m = re.exec(style))) if (/[;\{]\s*gap:/.test(m[2]) && !/display:grid/.test(m[2])) offenders.push(m[1].trim());
      ok(offenders.length === 0,
        file + ': flex containers carry no gap (the native #grid gap is exempt)');
    }
    ok(fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8').indexOf('#dock>*+*{margin-left:var(--dock-gap)}') >= 0,
      'theme-driven gaps are applied as sibling margins in CSS');
  }

  // 11. options and learned keys survive an update: boot the real service over a seeded state (issue #6)
  {
    fs.writeFileSync(path.join(process.env.CYTV_DIR, 'config.json'), JSON.stringify({
      options: { inputKey: false, debloat: true, liveTv: false },
      keys: { input: '55', home: '', voice: '', guide: '88', learned: true },
    }));
    fs.writeFileSync(path.join(process.env.CYTV_DIR, 'channel'), 'test-main');
    ok(!('options' in JSON.parse(fs.readFileSync(path.join(root, 'config.example.json'), 'utf8'))) && !('keys' in JSON.parse(fs.readFileSync(path.join(root, 'config.example.json'), 'utf8'))),
      'a fresh config.example.json carries no options/keys that could shadow the stored ones');
    ok(/cp \$S\/config\.example\.json \$D\/config\.json/.test(fs.readFileSync(path.join(root, 'scripts', 'bootstrap.sh'), 'utf8')),
      'bootstrap only copies the example config when none exists: an update keeps the stored one');
    const svcToken = require(path.join(helper, 'security')).token();
    const svcPort = 18765 + (process.pid % 1000);   // never touch a real service on 8765
    const call2 = (method, url, body) => new Promise((resolve, reject) => {
      const rq = http.request({ host: '127.0.0.1', port: svcPort, method, path: url, headers: { 'x-cytv-token': svcToken, 'content-type': 'application/json' } },
        r => { let b = ''; r.on('data', c => b += c); r.on('end', () => resolve({ status: r.statusCode, j: b[0] === '{' ? JSON.parse(b) : b })); });
      rq.on('error', reject); rq.end(body ? JSON.stringify(body) : undefined);
    });
    const errs = [], svc = cp.spawn(process.execPath, [path.join(helper, 'helper.js')], { env: Object.assign({}, process.env, { CYTV_PORT: String(svcPort) }), stdio: ['ignore', 'ignore', 'pipe'] });
    svc.stderr.on('data', c => errs.push(String(c)));
    for (let i = 0; i < 40; i++) { try { await call2('GET', '/api/version'); break; } catch (_) { await new Promise(r => setTimeout(r, 250)); } }
    const st = await call2('GET', '/api/manager/status');
    ok(st.j.options.inputKey === false && st.j.options.debloat === true && st.j.options.liveTv === false,
      'status reports the stored options after the update, defaults did not shadow them');
    ok(st.j.keys.input === '55' && st.j.keys.guide === '88' && st.j.keys.learned === true, 'status reports the stored learned keys');
    ok(st.j.channel === 'test-main', 'the update channel survives');
    ok(st.j.inputhook && st.j.inputhook.hook && st.j.inputhook.hook.attached === false && st.j.options.inputKey === false,
      'the capability (hook attached) is exposed separately from the stored option');
    const saved = await call2('POST', '/api/config', { dock: ['netflix'], clock: '24' });
    const after = JSON.parse(fs.readFileSync(path.join(process.env.CYTV_DIR, 'config.json'), 'utf8'));
    ok(saved.status === 200 && after.dock && after.dock[0] === 'netflix' && after.options.inputKey === false && after.keys.input === '55',
      'a launcher customise saves the dock and preserves options and keys');
    const opt = await call2('POST', '/api/manager/options', { liveTv: true });
    const after2 = JSON.parse(fs.readFileSync(path.join(process.env.CYTV_DIR, 'config.json'), 'utf8'));
    ok(opt.j.options.inputKey === false && opt.j.options.liveTv === true && after2.options.debloat === true && after2.keys.learned === true,
      'an option change writes only the changed option; debloat (and its scripts) stay untouched');
    svc.kill();
    ok(!/manager module failed|security/.test(errs.join('')), 'the service started cleanly over the seeded state');
    // the bootstrap flag semantics that keep an update from resetting the stored choice (issue #6)
    {
      const jt2 = path.join(root, 'scripts', 'jtool.js'), cfg2 = path.join(tmp, 'opts.json');
      const seed = () => fs.writeFileSync(cfg2, JSON.stringify({ options: { inputKey: false, debloat: true, liveTv: false }, keys: { input: '55' } }));
      seed();
      cp.spawnSync(process.execPath, [jt2, 'options', cfg2, '', '']);   // an update run passes no flags
      let c2 = JSON.parse(fs.readFileSync(cfg2, 'utf8'));
      ok(c2.options.inputKey === false && c2.options.debloat === true && c2.options.liveTv === false && c2.keys.input === '55',
        'bootstrap option defaults on an update leave the stored choice and sibling keys alone');
      cp.spawnSync(process.execPath, [jt2, 'options', cfg2, '', '1']);   // an explicit setup flag
      c2 = JSON.parse(fs.readFileSync(cfg2, 'utf8'));
      ok(c2.options.inputKey === true && c2.options.liveTv === false && c2.keys.input === '55',
        'an explicit setup flag overrides exactly its own option');
      fs.writeFileSync(cfg2, JSON.stringify({}));
      cp.spawnSync(process.execPath, [jt2, 'options', cfg2, '', '']);
      c2 = JSON.parse(fs.readFileSync(cfg2, 'utf8'));
      ok(c2.options.inputKey === true && c2.options.debloat === true && c2.keys === undefined,
        'a fresh config gets the documented defaults and nothing else');
    }
  }

  for (const check of ['security-check.js', 'i18n-check.js']) {
    const result = cp.spawnSync(process.execPath, [path.join(root, 'tools', check)], { encoding: 'utf8' });
    console.log(result.stdout || ''); if (result.stderr) console.error(result.stderr);
    ok(result.status === 0, check);
  }
  console.log(failed ? '\n' + failed + ' check(s) failed on Node ' + process.version : '\nall checks passed on Node ' + process.version);
  fs.rmSync ? fs.rmSync(tmp, { recursive: true, force: true }) : cp.spawnSync('rm', ['-rf', tmp]);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('error:', e); process.exit(1); });

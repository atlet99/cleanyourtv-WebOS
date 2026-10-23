// Safe regression check: no TV commands, no external network, temporary keys only.
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm'), assert = require('assert'), cp = require('child_process');
const root = path.join(__dirname, '..'), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cytv-security-'));
process.env.CYTV_DIR = temp;
const security = require('../helper/security');
(async () => {
  const secret = security.token();
  assert.strictEqual(security.token(), secret);
  assert.strictEqual(fs.statSync(path.join(temp, 'api-token')).mode & 0o777, 0o600);
  const run = security.runtime(); assert.strictEqual(fs.statSync(run).mode & 0o777, 0o700);
  const req = (url, token, method) => ({ url, method: method || 'GET', headers: token ? { 'x-cytv-token': token } : {} });
  assert(!security.authorized(req('/api/undo'), secret));
  assert(!security.authorized(req('/api/undo', 'é'.repeat(64)), secret));
  assert(!security.authorized(req('/api/undo?token=' + secret), secret));
  assert(!security.authorized(req('/icon/x?token=' + secret, null, 'POST'), secret));
  assert(security.authorized(req('/icon/x?token=' + secret), secret));
  assert(security.authorized(req('/api/version', secret), secret));
  let handler, calls = 0;
  const context = { process: { env: {} }, console: { log() {}, error() {} }, require(name) {
    if (name === 'http') return { createServer(fn) { handler = fn; return { listen() {} }; } };
    if (name === 'fs') return { readFileSync() { throw new Error('disabled'); } };
    if (name === 'path' || name === 'child_process') return {};
    if (name === './security') return security;
    if (name === './inputhook') return { setVoiceKey() {} };
    if (name === './manager') return { create() { return { useLgHome() { calls++; } }; } };
    throw new Error('module disabled: ' + name);
  } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'helper/helper.js'), 'utf8'), context, { timeout: 1000 });
  async function call(origin, token) {
    const response = { status: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, writeHead(c) { this.status = c; }, end() {} };
    const request = req('/api/undo', token, 'POST'); if (origin !== undefined) request.headers.origin = origin;
    await handler(request, response); return response.status;
  }
  assert.strictEqual(await call('null'), 401);
  assert.strictEqual(await call(undefined), 401);
  assert.strictEqual(await call('https://example.invalid', secret), 403);
  assert.strictEqual(calls, 0);
  assert.strictEqual(await call('file://com.cleanyourtv.manager-webos', secret), 200);
  assert.strictEqual(calls, 1);
  console.log('ok   opaque origins cannot call root API without a capability; local app token works');
  let sent, bridges = 0;
  const browser = { window: {}, setTimeout, clearTimeout,
    PalmServiceBridge: function () { this.call = function (uri, data) {
      bridges++; assert.strictEqual(uri, 'luna://org.webosbrew.hbchannel.service/exec');
      assert(JSON.parse(data).command.endsWith('/helper/security.js token'));
      this.onservicecallback(JSON.stringify({ returnValue: true, stdoutString: secret + '\n' }));
    }; },
    XMLHttpRequest: function () { const self = this; this.headers = {};
      this.open = function (method, url) { self.method = method; self.url = url; };
      this.setRequestHeader = function (key, value) { self.headers[key] = value; };
      this.send = function (body) { sent = self; self.body = body; self.status = 200; self.responseText = '{"returnValue":true}'; self.onload(); };
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'shared/api.js'), 'utf8'), browser);
  await browser.window.CYTV.api('http://127.0.0.1:8765/api/launch', { id: 'test.app' });
  assert.strictEqual(sent.method, 'POST'); assert.strictEqual(sent.headers['X-CYTV-Token'], secret);
  assert.strictEqual(JSON.parse(sent.body).id, 'test.app');
  await browser.window.CYTV.api('http://127.0.0.1:8765/api/apps');
  assert.strictEqual(sent.method, 'GET'); assert.strictEqual(bridges, 1);
  assert(browser.window.CYTV.image('/icon/app').endsWith('?token=' + secret));
  console.log('ok   TV client obtains the capability through the native bridge and authenticates GET/POST/image requests');
  // A pre-created symlink is never used as an API token or runtime directory.
  const tokenFile = path.join(temp, 'api-token'); fs.unlinkSync(tokenFile);
  fs.symlinkSync(path.join(temp, 'not-created'), tokenFile);
  assert.throws(() => security.token()); assert(!fs.existsSync(path.join(temp, 'not-created')));
  fs.unlinkSync(tokenFile); security.token();
  fs.rmdirSync(run); fs.symlinkSync(temp, run); assert.throws(() => security.runtime()); fs.unlinkSync(run);
  console.log('ok   private token/runtime paths reject symlinks');

  function openssl(args) { cp.execFileSync('openssl', args, { stdio: ['ignore', 'pipe', 'pipe'] }); }
  const privateKey = path.join(temp, 'private.pem'), publicKey = path.join(temp, 'public.pem');
  openssl(['genrsa', '-out', privateKey, '2048']); openssl(['rsa', '-in', privateKey, '-pubout', '-out', publicKey]);
  const checksum = Buffer.from('a'.repeat(64) + '  frontend-1.2.3.tgz\n'), checksumFile = path.join(temp, 'sum'), signatureFile = path.join(temp, 'sig');
  fs.writeFileSync(checksumFile, checksum);
  openssl(['dgst', '-sha256', '-sign', privateKey, '-out', signatureFile, checksumFile]);
  const verify = require('../helper/release').verify, signature = fs.readFileSync(signatureFile), key = fs.readFileSync(publicKey);
  assert.strictEqual(verify(checksum, signature, 'frontend-1.2.3.tgz', key), 'a'.repeat(64));
  assert.throws(() => verify(Buffer.from('b' + checksum.toString().slice(1)), signature, 'frontend-1.2.3.tgz', key));
  assert.throws(() => verify(checksum, signature, 'frontend-9.9.9.tgz', key));
  assert.throws(() => verify(checksum, Buffer.from('invalid'), 'frontend-1.2.3.tgz', key));
  console.log('ok   signatures accept the signed checksum and reject tampering, wrong names and unsigned data');
})().then(() => { cp.spawnSync('rm', ['-rf', temp]); }, error => { cp.spawnSync('rm', ['-rf', temp]); console.error(error); process.exitCode = 1; });

// Local apps obtain this capability through the Homebrew service, never through HTTP.
const fs = require('fs'), crypto = require('crypto'), path = require('path');
const DIR = process.env.CYTV_DIR || '/media/developer/cleanyourtv';
function token() {
  try { fs.mkdirSync(DIR, 0o755); } catch (e) { if (e.code !== 'EEXIST') throw e; }
  const dir = fs.lstatSync(DIR);
  if (!dir.isDirectory() || (dir.mode & 0o022) || (process.getuid && dir.uid !== process.getuid())) throw new Error('unsafe service directory');
  const file = path.join(DIR, 'api-token');
  try { fs.writeFileSync(file, crypto.randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 }); } catch (e) { if (e.code !== 'EEXIST') throw e; }
  const st = fs.lstatSync(file);
  if (!st.isFile() || st.nlink !== 1 || (st.mode & 0o077) || st.uid !== dir.uid) throw new Error('unsafe API token file');
  const value = fs.readFileSync(file, 'utf8');
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error('invalid API token');
  return value;
}
function authorized(req, secret) {
  // ponytail: query capabilities are only for image GETs, which cannot send a custom header.
  let supplied = req.headers['x-cytv-token'] || '';
  if (!supplied && req.method === 'GET' && /^\/(icon\/|api\/notify\/img(?:\?|$)|api\/theme\/wallpaper\/)/.test(req.url)) {
    const match = /[?&]token=([0-9a-f]{64})(?:&|$)/.exec(req.url); supplied = match ? match[1] : '';
  }
  return typeof supplied === 'string' && /^[0-9a-f]{64}$/.test(supplied) && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(secret));
}
function runtime() {
  token();
  const dir = path.join(DIR, 'run');
  try { fs.mkdirSync(dir, 0o700); } catch (e) { if (e.code !== 'EEXIST') throw e; }
  const st = fs.lstatSync(dir);
  if (!st.isDirectory() || (st.mode & 0o077) || (process.getuid && st.uid !== process.getuid())) throw new Error('unsafe runtime directory');
  return dir;
}
module.exports = { token, authorized, runtime };
if (require.main === module && process.argv[2] === 'token') console.log(token());
if (require.main === module && process.argv[2] === 'run') console.log(runtime());

// RSA/SHA-256 signature of the exact checksum file (hash AND asset name).
const fs = require('fs'), crypto = require('crypto'), path = require('path');
function verify(checksum, signature, name, key) {
  if (!key) {
    try { key = fs.readFileSync(path.join(__dirname, 'release-public.pem')); }
    catch (_) { throw new Error('no trusted release key; install the public key before updating'); }
  }
  const verifier = crypto.createVerify('RSA-SHA256'); verifier.update(checksum);
  if (!verifier.verify(key, signature)) throw new Error('release signature is not valid');
  const match = /^([0-9a-f]{64})  ([^\r\n]+)\n?$/.exec(checksum.toString('utf8'));
  if (!match || match[2] !== name) throw new Error('signed checksum does not match the asset name');
  return match[1];
}
module.exports = { verify };

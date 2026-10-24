// Build-time only: the standalone core packages prepared files without webpack or transpilation.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { IPKBuilder } = require('@atlet99/webos-packager-plugin/core');

function readJson(directory, name) {
  return JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
}
function identifier(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) throw new Error('Invalid webOS identifier: ' + value);
  return value;
}
function assets(directory, output) {
  const result = Object.create(null);
  function walk(current) {
    if (current === output) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const file = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Symbolic links are not packaged: ' + file);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) result[path.relative(directory, file).split(path.sep).join('/')] = { data: fs.readFileSync(file), mode: fs.statSync(file).mode & 0o777 };
    }
  }
  walk(directory); return result;
}
async function build() {
  if (!process.env.WEBOS_APP_DIRECTORY) throw new Error('WEBOS_APP_DIRECTORY is required');
  const app = fs.realpathSync(process.env.WEBOS_APP_DIRECTORY), output = path.resolve(process.env.WEBOS_OUTPUT_DIRECTORY || 'dist');
  if (app === output) throw new Error('The output directory must differ from the application directory');
  const info = readJson(app, 'appinfo.json'), id = identifier(info.id);
  for (const required of [info.main, info.icon]) {
    if (typeof required !== 'string' || path.isAbsolute(required) || required.split(/[\\/]/).includes('..') || !fs.statSync(path.join(app, required)).isFile()) throw new Error('Missing or invalid main/icon in appinfo.json');
  }
  const builder = new IPKBuilder({ id, version: info.version, mtime: process.env.SOURCE_DATE_EPOCH ? undefined : 1761000000 });
  builder.addEntries({ id, type: 'app' }, assets(app, output));
  for (let directory of String(process.env.WEBOS_SERVICE_DIRECTORIES || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean)) {
    directory = fs.realpathSync(directory);
    const service = readJson(directory, 'services.json'); readJson(directory, 'package.json');
    const serviceId = identifier(service.id);
    if (!serviceId.startsWith(id + '.')) throw new Error('Service id must start with ' + id + '.');
    builder.addEntries({ id: serviceId, type: 'service' }, assets(directory, output));
  }
  const filename = id + '_' + info.version + '_all.ipk', data = await builder.buffer();
  fs.mkdirSync(output, { recursive: true });
  const target = path.join(output, filename);
  fs.writeFileSync(target, data);
  fs.writeFileSync(target + '.sha256', crypto.createHash('sha256').update(data).digest('hex') + '  ' + filename + '\n');
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'ipk=' + target + '\n');
  console.log(target);
}
build().catch(error => { console.error(error.message); process.exitCode = 1; });

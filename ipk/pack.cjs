// Python prepares the existing file layout; the public standalone API builds every IPK archive.
const { IPKBuilder } = require('@atlet99/webos-packager-plugin/core');

async function pack() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const { metadata, files } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const builder = new IPKBuilder(metadata), namespaces = new Map();
  for (const file of files) {
    const match = /^(?:\.\/)?usr\/palm\/(applications|services)\/([^/]+)\/(.+)$/.exec(file.path);
    if (!match) throw new Error('Unexpected package path: ' + file.path);
    const key = match[1] + '/' + match[2];
    if (!namespaces.has(key)) namespaces.set(key, { id: match[2], type: match[1] === 'applications' ? 'app' : 'service', assets: Object.create(null) });
    const namespace = namespaces.get(key);
    if (Object.prototype.hasOwnProperty.call(namespace.assets, match[3])) throw new Error('Duplicate package path: ' + file.path);
    namespace.assets[match[3]] = { data: Buffer.from(file.data, 'base64'), mode: file.mode };
  }
  for (const { id, type, assets } of namespaces.values()) {
    if (type === 'service') {
      if (!assets['services.json']) throw new Error('Luna service ' + id + ' requires services.json; put boot-daemon payloads in app resources');
      const descriptor = JSON.parse(assets['services.json'].data.toString('utf8'));
      if (descriptor.id !== id || !id.startsWith((metadata.primaryApp || metadata.id) + '.')) throw new Error('Service metadata must match its directory and start with the primary app id');
    }
    builder.addEntries({ id, type }, assets);
  }
  process.stdout.write(await builder.buffer());
}
pack().catch(error => { console.error(error.message); process.exitCode = 1; });

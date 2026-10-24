const fs = require('node:fs');
const path = require('node:path');
const { ESLint } = require('eslint');
async function main() {
  const eslint = new ESLint(), results = await eslint.lintFiles(['helper/*.js', 'scripts/*.js', 'shared/*.js', 'tools/*.js', 'tools/*.cjs', 'ipk/*.cjs', '.github/actions/package-webos/*.cjs', 'eslint.config.cjs']);
  for (const file of ['app/index.html', 'manager/app/index.html', 'picker/app/index.html', 'notify/app/index.html']) {
    const text = fs.readFileSync(file, 'utf8'), scripts = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
    let match, index = 0;
    while ((match = scripts.exec(text))) {
      if (match[1].trim()) results.push(...await eslint.lintText(match[1], { filePath: path.join(path.dirname(file), 'script-' + index++ + '.inline.js') }));
    }
  }
  const formatter = await eslint.loadFormatter('stylish');
  const output = formatter.format(results); if (output) console.log(output);
  if (results.some(result => result.errorCount || result.fatalErrorCount)) process.exitCode = 1;
  else console.log('ok   ESLint: service/build code and ES5 inline TV scripts');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

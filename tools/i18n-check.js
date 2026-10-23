// UI catalogue coverage and safe rendering without a browser or TV.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), source = f => fs.readFileSync(path.join(root, f), 'utf8');
const i18n = require('../shared/i18n');
const context = { window: { webOSSystem: { locale: 'ru-RU' } }, navigator: { language: 'ru-RU' } };
context.webOSSystem = context.window.webOSSystem;
vm.createContext(context); vm.runInContext(source('shared/i18n.js'), context);
const app = source('app/index.html');
vm.runInContext(app.slice(app.indexOf('var LOC='), app.indexOf('/* a button\'s label:')), context);
const missing = [];
for (const dict of [context.TX, context.TXL]) for (const lang of Object.keys(dict)) for (const key of Object.keys(dict[lang])) {
  if (i18n.t(key, 'ru') === key) missing.push(key);
}
assert.deepStrictEqual(Array.from(new Set(missing)), [], 'untranslated launcher/player keys');
const manager = source('manager/app/index.html');
vm.runInContext(manager.slice(manager.indexOf('var INFO='), manager.indexOf('function infoFor')), context);
for (const key of Object.keys(context.INFO)) assert(context.CYTV_I18N.help[key], 'missing Russian help: ' + key);
for (const file of fs.readdirSync(path.join(root, 'themes')).filter(f => /\.json$/.test(f))) {
  const theme = JSON.parse(source('themes/' + file));
  assert(i18n.t(theme.description, 'ru') !== theme.description, 'missing theme description: ' + file);
}
assert.strictEqual(i18n.t('Downloading service 1.5.12', 'ru'), 'Загружаем службу версии 1.5.12');
assert.strictEqual(i18n.t('Version 1.5.12 is available; this one is 1.5.11.', 'ru'), 'Доступна версия 1.5.12. Сейчас установлена 1.5.11.');
assert.strictEqual(i18n.t('Unknown app name', 'ru'), 'Unknown app name');
assert.strictEqual(i18n.t('Settings', 'en'), 'Settings');
const markup = '<label>Model</label><input value="Save" placeholder="leave empty to use the playlist\'s"><textarea>Save</textarea><option>Save</option><script>var name="Save";</script>';
const translated = i18n.html(markup, 'ru-RU');
assert(translated.indexOf('<label>Модель</label>') >= 0);
assert(translated.indexOf('value="Save"') >= 0 && translated.indexOf('<textarea>Save</textarea>') >= 0 && translated.indexOf('<option>Save</option>') >= 0);
assert(translated.indexOf('<script>var name="Save";</script>') >= 0);
assert.strictEqual(i18n.html(markup, 'en-GB'), markup);
// Parse all inline page code, including the shared scripts injected by the packager.
for (const file of ['app/index.html', 'manager/app/index.html', 'picker/app/index.html', 'notify/app/index.html']) {
  const page = source(file); let match; const scripts = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
  while ((match = scripts.exec(page))) new vm.Script(match[1], { filename: file });
}
new vm.Script(source('shared/api.js')); new vm.Script(source('shared/i18n.js'));
console.log('ok   launcher/player vocabulary, all manager help, theme descriptions, dynamic versions and inline syntax');
console.log('ok   English fallback and user-controlled form values, model names and script bodies are preserved');

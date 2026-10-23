// No dependencies: catalogue structure, source coverage and UI regressions, also on Node 8.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
const root = path.join(__dirname, '..'), source = f => fs.readFileSync(path.join(root, f), 'utf8');
const i18n = require('../shared/i18n');
function literal(token) { return vm.runInNewContext(token, {}, { timeout: 100 }); }
function objectAt(text, marker) {
  const start = text.indexOf(marker); assert(start >= 0, 'missing dictionary: ' + marker);
  // These are data-only JS objects: strings and nested objects. Parse before JS can overwrite duplicate keys.
  const tokens = text.slice(text.indexOf('{', start)).match(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|[A-Za-z_$][\w$]*|[{}:,]/g);
  let at = 0;
  function object(scope) {
    assert.strictEqual(tokens[at++], '{'); const result = Object.create(null);
    while (tokens[at] !== '}') {
      const token = tokens[at++], key = /^['"]/.test(token) ? literal(token) : token;
      assert(!Object.prototype.hasOwnProperty.call(result, key), 'duplicate key: ' + scope + '.' + key);
      assert.strictEqual(tokens[at++], ':');
      result[key] = tokens[at] === '{' ? object(scope + '.' + key) : (/^['"]/.test(tokens[at]) ? literal(tokens[at++]) : tokens[at++]);
      if (tokens[at] !== ',') break; at++;
    }
    assert.strictEqual(tokens[at++], '}'); return result;
  }
  return object(marker);
}
function keys(value) { return Object.keys(value).sort(); }
function slots(value) { return (value.match(/\{\d+\}/g) || []).sort(); }
function sameKeys(expected, actual, label) {
  const want = keys(expected), got = keys(actual);
  const missing = want.filter(k => !Object.prototype.hasOwnProperty.call(actual, k));
  const extra = got.filter(k => !Object.prototype.hasOwnProperty.call(expected, k));
  assert.strictEqual(got.length, want.length, label + ': key count ' + got.length + ' != ' + want.length + '; missing ' + JSON.stringify(missing) + '; extra ' + JSON.stringify(extra));
  assert.deepStrictEqual(got, want, label + ': different keys; missing ' + JSON.stringify(missing) + '; extra ' + JSON.stringify(extra));
}
function messages(expected, actual, label) {
  sameKeys(expected, actual, label);
  for (const key of keys(expected)) {
    assert(typeof actual[key] === 'string' && actual[key].trim(), label + ': empty translation: ' + key);
    assert.deepStrictEqual(slots(actual[key]), slots(key), label + ': changed parameters: ' + key);
  }
}
const context = { window: { webOSSystem: { locale: 'ru-RU' } }, navigator: { language: 'ru-RU' } };
context.webOSSystem = context.window.webOSSystem;
vm.createContext(context); vm.runInContext(source('shared/i18n.js'), context);
const app = source('app/index.html'), manager = source('manager/app/index.html'), picker = source('picker/app/index.html');
vm.runInContext(app.slice(app.indexOf('var LOC='), app.indexOf('/* a button\'s label:')), context);
const launcher = context.TX, player = context.TXL;
const pickerContext = { CYTV_I18N: context.CYTV_I18N, window: context.window, webOSSystem: context.webOSSystem, navigator: context.navigator, document: {} };
vm.createContext(pickerContext); vm.runInContext(picker.slice(picker.indexOf('var TX='), picker.indexOf('function $(i)')), pickerContext);
vm.runInContext(manager.slice(manager.indexOf('var INFO='), manager.indexOf('function infoFor')), context);
const shared = i18n.catalogs.ru.messages, help = context.INFO;
const scopes = { shared, launcher: launcher.nl, player: player.nl, picker: pickerContext.EN, help };
const statistics = {};
for (const scope of keys(scopes)) statistics[scope] = { count: keys(scopes[scope]).length, sha256: crypto.createHash('sha256').update(JSON.stringify(keys(scopes[scope]))).digest('hex') };
if (process.argv[2] === '--stats') { console.log(JSON.stringify(statistics, null, 2)); process.exit(0); }
const baseline = JSON.parse(source('tools/i18n-keys.json'));
assert.deepStrictEqual(statistics, baseline, 'source key count/fingerprint changed: review the source changes, then update tools/i18n-keys.json using --stats');
for (const lang of keys(i18n.catalogs)) {
  assert(/^[a-z]{2,3}$/.test(lang), 'use a lower-case base-language code: ' + lang);
  const catalog = i18n.catalogs[lang];
  messages(shared, catalog.messages, lang + '/shared');
  sameKeys(help, catalog.help, lang + '/help');
  for (const key of keys(help)) assert(typeof catalog.help[key] === 'string' && catalog.help[key].trim(), lang + '/help: empty ' + key);
  for (const scope of ['launcher', 'player']) for (const key of keys(scopes[scope])) assert(Object.prototype.hasOwnProperty.call(catalog.messages, key), lang + ': missing ' + scope + ' key ' + key);
  for (const key of keys(pickerContext.EN)) assert(Object.prototype.hasOwnProperty.call(catalog.messages, pickerContext.EN[key]), lang + ': missing picker key ' + key);
  console.log('ok   ' + lang + ': ' + keys(catalog.messages).length + '/' + keys(shared).length + ' shared keys; ' + keys(catalog.help).length + '/' + keys(help).length + ' help keys');
}
sameKeys(launcher, player, 'legacy launcher/player languages'); sameKeys(launcher, pickerContext.TX, 'legacy launcher/picker languages');
for (const lang of keys(launcher)) {
  messages(launcher.nl, launcher[lang], lang + '/launcher'); messages(player.nl, player[lang], lang + '/player');
  sameKeys(pickerContext.EN, pickerContext.TX[lang], lang + '/picker');
  for (const key of keys(pickerContext.EN)) assert(typeof pickerContext.TX[lang][key] === 'string' && pickerContext.TX[lang][key].trim(), lang + '/picker: empty ' + key);
  console.log('ok   ' + lang + ': ' + keys(launcher[lang]).length + ' launcher + ' + keys(player[lang]).length + ' player + ' + keys(pickerContext.TX[lang]).length + ' picker keys (partial language: manager uses English)');
}
for (const [file, marker] of [['shared/i18n.js', 'var RU ='], ['shared/i18n.js', 'var HELP ='], ['app/index.html', 'var TX='], ['app/index.html', 'var TXL='], ['app/index.html', 'var add='], ['app/index.html', 'var home='], ['app/index.html', 'var player='], ['picker/app/index.html', 'var TX='], ['picker/app/index.html', 'var EN='], ['manager/app/index.html', 'var INFO=']]) objectAt(source(file), marker);
const registry = objectAt(source('shared/i18n.js'), 'var catalogs =');
for (const lang of keys(registry)) for (const scope of ['messages', 'help']) {
  const value = registry[lang][scope];
  if (typeof value === 'string') {
    const declaration = new RegExp('\\bvar\\s+' + value + '\\s*=').exec(source('shared/i18n.js'));
    assert(declaration, 'missing catalogue variable: ' + value); objectAt(source('shared/i18n.js'), declaration[0]);
  }
}
// Fail if a new static UI label is used without an English source key/translation.
function covered(key, label) { assert(Object.prototype.hasOwnProperty.call(shared, key), label + ': missing message key ' + JSON.stringify(key)); }
for (const file of ['app/index.html', 'manager/app/index.html', 'notify/app/index.html']) {
  const text = source(file); let match;
  const calls = /\b(?:t|format|banner|kShow)\(\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\s*([,)])/g;
  while ((match = calls.exec(text))) { const key = literal(match[1]); if (key) covered(key, file); }
  const ui = /\bui\([^,]+,\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\s*[,)]/g;
  while ((match = ui.exec(text))) { const key = literal(match[1]); if (key) covered(key, file); }
}
let match;
const labels = /\b(?:label|sub):\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\s*([,}])/g;
while ((match = labels.exec(manager))) { const key = literal(match[1]); if (key) covered(key, 'manager row'); }
for (const value of Object.values(objectAt(app, 'var WHY='))) covered(value, 'player diagnostic');
const missingServiceMessages = [];
for (const file of ['helper/voice.js', 'helper/manager.js', 'helper/selfupdate.js', 'helper/live.js', 'helper/notify.js', 'helper/security.js', 'helper/release.js']) {
  const text = source(file), patterns = [
    /\bnew Error\(\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\s*\)/g,
    /\berror:\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\s*[,}]/g,
    /\bsetJob\(\s*'(?:\\.|[^'\\])*'\s*,\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\s*\)/g
  ];
  for (const pattern of patterns) while ((match = pattern.exec(text))) {
    const key = literal(match[1]); if (key && !Object.prototype.hasOwnProperty.call(shared, key)) missingServiceMessages.push(file + ': ' + key);
  }
}
assert.deepStrictEqual(missingServiceMessages, [], 'service messages without translation keys');
for (const file of fs.readdirSync(path.join(root, 'themes')).filter(f => /\.json$/.test(f))) {
  const theme = JSON.parse(source('themes/' + file)); covered(theme.name, 'theme name'); covered(theme.description, 'theme description');
}
for (const app of ['picker', 'notify']) {
  const metadata = JSON.parse(source(app + '/app/appinfo.json')); covered(metadata.title, app + ' metadata');
  for (const lang of keys(i18n.catalogs)) {
    const localized = JSON.parse(source(app + '/app/resources/' + lang + '/appinfo.json'));
    assert.strictEqual(localized.title, i18n.t(metadata.title, lang), app + ': inconsistent localised system title');
  }
}
// Exercise the manager's actual menu builders: declarations alone cannot prove a label is translated.
const managerContext = { CYTV_I18N: context.CYTV_I18N, CYTV: {}, window: context.window, webOSSystem: context.webOSSystem,
  navigator: context.navigator, document: { documentElement: {}, addEventListener() {} } };
const managerScript = /<script>([\s\S]*?)<\/script>/.exec(manager)[1].replace(/ui\('shareclose','Close'\);banner\('Reading status…','work'\);load\(\);/, '');
vm.createContext(managerContext); vm.runInContext(managerScript, managerContext);
managerContext.st = { frontend: { version: '1.4.13', previous: '1.4.12', updateTo: '1.4.14' }, service: { version: '1.5.13', updateTo: '1.5.14' }, job: {},
  home: { enabled: true }, options: { liveTv: true, inputKey: true, debloat: true }, keys: { input: '241', home: '202', guide: '55', voice: '77' }, inputhook: {}, voice: { installed: true, enabled: true }, notifyApi: { enabled: true } };
managerContext.vo = { installed: true, enabled: true, job: {}, ha: { configured: true, url: 'http://localhost', route: 'ha-first' }, llm: { hasKey: true, enabled: true, model: 'model/test' } };
managerContext.th = { current: { id: 'classic', accent: '' }, themes: fs.readdirSync(path.join(root, 'themes')).filter(f => /\.json$/.test(f)).map(f => JSON.parse(source('themes/' + f))), accents: [{ name: 'Theme default', hex: '' }] };
managerContext.napi = { enabled: true }; managerContext.lv = { configured: true, channels: 12, epg: 30, state: 'loading guide' };
managerContext.tst = { builds: [{ branch: 'test-branch', tag: 'test-test-branch', build: 'abc1234' }] };
managerContext.mdl = [{ id: 'openrouter/auto', name: 'Auto (OpenRouter picks)' }, { id: 'model/test', name: 'External model name' }];
managerContext.agl = [{ id: 'conversation.test', name: 'External agent name' }];
for (const view of ['main', 'theme', 'accent', 'channel', 'models', 'agents', 'voice', 'notifyapi', 'livetv', 'inputkey', 'confirm-home', 'confirm-uninstall', 'confirm-live-reset']) {
  managerContext.view = view; managerContext.build();
  for (const row of managerContext.rows) if (!row.sep && !row.rawLabel) {
    const translated = context.CYTV_I18N.t(row.label, 'ru');
    assert(translated !== row.label || Object.prototype.hasOwnProperty.call(shared, row.label), view + ': untranslated label ' + row.label);
  }
}
managerContext.view = 'voice'; managerContext.vo.installed = false; managerContext.build();
for (const row of managerContext.rows) if (row.label) covered(row.label, 'voice installation row');
managerContext.offline = true; managerContext.view = 'main'; managerContext.build();
for (const row of managerContext.rows) if (row.label) covered(row.label, 'setup row');
// Render the real phone form; saved model IDs and instructions must survive localisation.
const phoneContext = { fs, __dirname: path.join(root, 'helper'), require: n => n === '../shared/i18n' || n === './i18n' ? i18n : require(n),
  llmCfg: () => ({ key: 'saved', model: 'custom/model', system: 'Save', enabled: true }), cfg: () => ({ url: 'https://server/path', token: 'saved' }),
  haCfg: () => ({ url: 'https://ha', token: 'saved', route: 'ha-first' }), esc: s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) };
const voice = source('helper/voice.js'); vm.createContext(phoneContext);
vm.runInContext(voice.slice(voice.indexOf('function pairPage('), voice.indexOf('function startPair()')), phoneContext);
const phone = i18n.html(phoneContext.pairPage('', false, [{ id: 'custom/model', name: 'Save' }], 'token', 'ru'), 'ru');
assert(phone.indexOf('Настройка голосового управления') >= 0 && phone.indexOf('уже сохранён') >= 0 && phone.indexOf('Сначала Home Assistant, затем ИИ') >= 0);
assert(phone.indexOf('value="custom/model"') >= 0 && phone.indexOf('>Save</textarea>') >= 0 && phone.indexOf('>Save</option>') >= 0);
const sharelog = source('helper/sharelog.js'), reportContext = { i18n, esc: phoneContext.esc };
vm.createContext(reportContext); vm.runInContext(sharelog.slice(sharelog.indexOf('const page ='), sharelog.indexOf('function main()')) + '\nthis.renderReport = page;', reportContext);
const report = i18n.html(reportContext.renderReport('Save\nOriginal diagnostic log', 'ru'), 'ru');
assert(report.indexOf('Диагностика CleanYourTV') >= 0 && report.indexOf('Выделить всё') >= 0 && report.indexOf('Скопировано') >= 0);
const reportNodes = { t: {}, s: {}, c: {}, m: {} };
vm.runInNewContext(/<script>([\s\S]*?)<\/script>/.exec(report)[1], { document: { getElementById: id => reportNodes[id] } });
assert.strictEqual(reportNodes.t.value, 'Save\nOriginal diagnostic log');
// The checker must catch equal-count key substitution, duplicates and parameter loss/repetition.
assert.throws(() => objectAt("var X={'a':'one','a':'two'}", 'var X='), /duplicate key/);
assert.throws(() => messages({ a: 'a' }, { b: 'b' }, 'test'));
assert.throws(() => messages({ 'x {0}': '' }, { 'x {0}': 'x' }, 'test'));
assert.throws(() => messages({ 'x {0}': '' }, { 'x {0}': '{0} {0}' }, 'test'));
assert.throws(() => messages({ a: 'a' }, { a: ' ' }, 'test'));
assert.strictEqual(i18n.t('Downloading service 1.5.12', 'ru'), 'Загружаем службу версии 1.5.12');
assert.strictEqual(i18n.t('Version 1.5.12 is available; this one is 1.5.11.', 'ru'), 'Доступна версия 1.5.12. Сейчас установлена 1.5.11.');
assert.strictEqual(i18n.t('selected · the latest published release', 'ru'), 'выбрано · Последняя стабильная версия');
assert.strictEqual(i18n.t('Launcher 1.5.12\nLatest release 1.5.13', 'ru'), 'Главный экран 1.5.12\nПоследняя версия: 1.5.13');
assert.strictEqual(i18n.format('Could not open {0}', ['Settings'], 'ru'), 'Не удалось открыть Settings');
assert.strictEqual(i18n.error('Install failed: checksum mismatch', 'ru'), 'Ошибка установки: Контрольная сумма не совпадает. Установка отменена');
assert.strictEqual(i18n.logLine('[cleanyourtv] service 1.5.13 is running', 'ru'), 'Служба версии 1.5.13 работает');
assert.strictEqual(i18n.logLine('[cleanyourtv] WARNING: missing tool: node', 'ru'), 'Предупреждение: Не найдена необходимая программа: node');
assert.strictEqual(i18n.t('Unknown app name', 'ru'), 'Unknown app name'); assert.strictEqual(i18n.t('Settings', 'en'), 'Settings');
assert.strictEqual(i18n.language(' RU-ru '), 'ru');
assert.strictEqual(i18n.t('Settings', 'constructor'), 'Settings');
assert.strictEqual(i18n.html('<label>Settings</label>', 'constructor'), '<label>Settings</label>');
assert.strictEqual(i18n.helpText('Launcher', 'English help', 'constructor'), 'English help');
// A new catalogue must work in shared rendering, the launcher and the picker without another language branch.
context.CYTV_I18N.catalogs.zz = { messages: { Settings: 'Test settings', 'Live TV': 'Test TV', 'Could not open {0}': 'Test {0}' }, help: { Launcher: 'Test help' } };
context.LANG = 'zz'; assert.strictEqual(context.t('Settings'), 'Test settings');
pickerContext.LANG = 'zz'; assert.strictEqual(pickerContext.t('Live'), 'Test TV');
assert.strictEqual(context.CYTV_I18N.format('Could not open {0}', ['App'], 'zz'), 'Test App');
assert.strictEqual(context.CYTV_I18N.html('<label>Settings</label>', 'zz'), '<label>Test settings</label>');
assert.strictEqual(context.CYTV_I18N.helpText('Launcher', 'English help', 'zz'), 'Test help');
const markup = '<label>Model</label><input value="Save" placeholder="leave empty to use the playlist\'s"><textarea>Save</textarea><option>Save</option><script>var name="Save";</script>';
const translated = i18n.html(markup, 'ru-RU');
assert(translated.indexOf('<label>Модель</label>') >= 0);
assert(translated.indexOf('value="Save"') >= 0 && translated.indexOf('<textarea>Save</textarea>') >= 0 && translated.indexOf('<option>Save</option>') >= 0);
assert(translated.indexOf('<script>var name="Save";</script>') >= 0); assert.strictEqual(i18n.html(markup, 'en-GB'), markup);
for (const file of ['app/index.html', 'manager/app/index.html', 'picker/app/index.html', 'notify/app/index.html']) {
  const scripts = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
  while ((match = scripts.exec(source(file)))) new vm.Script(match[1], { filename: file });
}
new vm.Script(source('shared/api.js')); new vm.Script(source('shared/i18n.js'));
console.log('ok   counts, exact keys, duplicates, parameters, source coverage, new-language routing and safe rendering');

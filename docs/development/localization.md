# Localisation

This page describes localisation in **atlet99's fork** of the original webOS project.
Runtime JavaScript stays plain ES5 in the TV pages; no translation framework, network service or npm dependency is needed.

## Coverage

| Language | Coverage |
|---|---|
| English | Source messages and manager help; fallback for an unsupported language |
| Russian | Shared interface, manager help, launcher, player, input picker, system voice cards and phone setup/report pages |
| Dutch, German, French, Spanish | Inherited launcher, player and input-picker dictionaries; the manager and phone pages fall back to English |

App names, channel names, programme descriptions, model IDs, URLs, user-written instructions and external answers remain unchanged.
Protocol fields and raw diagnostic logs also stay stable. The manager translates known log messages for display; unknown OS/provider
error details remain verbatim after a localised error label. Translating the interface does not change the English-only speech model.
This catalogue does not translate the GitHub Pages documentation itself.

## Shared catalogue

`shared/i18n.js` contains `catalogs`, currently with a complete Russian catalogue:

```js
var catalogs = {
  ru: { messages: RU, help: HELP }
};
```

English **source strings are the message keys**. `messages` maps these keys to translations; `help` maps manager row names to help text.
English help text is in `INFO` in `manager/app/index.html`. The existing partial-language dictionaries are `TX` and `TXL` in
`app/index.html`, with the picker's `TX` and English alias map `EN` in `picker/app/index.html`.

The TV locale selects its base language (`ru-RU` and `ru_RU` select `ru`). Phone pages use the browser's requested language.
Unknown languages use English. A complete catalogue takes precedence over the inherited partial dictionaries.

## Add a complete language

1. In `shared/i18n.js`, add two **data-only objects** containing translations: for example `var IT = { ... };` and `var IT_HELP = { ... };`.
   Copy the English keys, including punctuation and spaces, from the existing `messages` and `help` objects. Translate values only.
2. Add `it: { messages: IT, help: IT_HELP }` to `catalogs`. Do not add a new language condition to the launcher or picker:
   they, the manager and phone pages already use the shared registry.
3. Provide every shared key and every help key. Empty values, missing/extra keys and changed parameters fail validation.
   Also add `picker/app/resources/it/appinfo.json` and `notify/app/resources/it/appinfo.json` with their translated `title` fields;
   webOS uses these native resources for system app titles. Their values must match the shared catalogue.
4. Run the checks below and test the screens with that TV/browser locale, including long labels and remote navigation.

The packager already embeds `shared/i18n.js` in every TV page and bundles it with the service, so no new script-loading path is needed.
Language codes are base-language codes; separate regional catalogues are not currently supported.

## Messages with parameters

Use an explicit template when displaying variable data:

```js
CYTV_I18N.format('Could not open {0}', [appName]);
CYTV_I18N.format('Could not open {0}', [appName], 'ru');
```

Keep the same numbered parameters in the translation. Their order can change, but none may be removed, added or repeated.
Values are inserted after translating the template and are not translated themselves.
`t(message)` supports existing service messages with embedded values; `format()` is preferred for new UI messages.
Use `error()` only for error messages, not for external answers or other user content.
`html()` is for trusted generated page markup; it preserves scripts, styles, form values, textareas and option contents.

## Validation

```sh
node tools/i18n-check.js
sh tools/node8-check.sh
```

The first command also runs inside the Node 8 suite and in the **Localization** GitHub Actions workflow on relevant pushes and pull requests.
It checks:

- key counts and SHA-256 fingerprints of sorted English source key sets;
- exact key equality for every complete catalogue and each declared partial-language scope;
- missing, extra and empty entries, plus duplicate keys before JavaScript overwrites them;
- equality of numbered parameters, including their repetition count;
- source references, manager menus, themes, player diagnostics and a rendered phone setup form;
- English fallback, new-language routing and preservation of user-controlled values.

`tools/i18n-keys.json` is a reviewed key-set snapshot. Changing translation **values** or adding a language does not change it.
When deliberately adding/removing an English source key, update the relevant translations and review the new statistics:

```sh
node tools/i18n-check.js --stats
```

Update the snapshot only after reviewing that source change, then rerun the normal checker. `--stats` only prints data; it does not
rewrite the snapshot or validate a translation. A failing check should not be silenced by refreshing the snapshot without reviewing the diff.
Static reference checks and menu fixtures are regression guards, not a proof that every possible dynamic screen fits on a real TV.

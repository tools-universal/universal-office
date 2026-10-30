// ../../../shared/spell/src/sources.ts
var PUBLISHED_DICTIONARIES = ["pt-BR", "en-US"];
var dictionaryPackage = (lang) => `dictionary-${lang.trim().replace(/_/g, "-").toLowerCase()}`;
var KEY = /* @__PURE__ */ Symbol.for("universal-office.spell.sources");
function registry() {
  const g = globalThis;
  return g[KEY] ??= { engine: void 0, dictionaries: /* @__PURE__ */ new Map(), listeners: /* @__PURE__ */ new Set() };
}
function changed() {
  for (const l of [...registry().listeners]) l();
}
var idOf = (lang) => lang.trim().replace(/_/g, "-");
function registerSpellcheck(loader) {
  registry().engine = loader ?? void 0;
  changed();
}
function registerDictionary(lang, loader) {
  const id = idOf(lang);
  if (!id) return;
  const dicts = registry().dictionaries;
  for (const k of dicts.keys()) if (k.toLowerCase() === id.toLowerCase()) dicts.delete(k);
  if (loader) dicts.set(id, loader);
  changed();
}
function moduleUrl(baseUrl, pkg) {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const doc = globalThis.document;
  return new URL(`${pkg}/index.js`, new URL(base, doc?.baseURI)).href;
}
var importUrl = (url) => import(
  /* @vite-ignore */
  /* webpackIgnore: true */
  url
);
function configureSpellcheck(opts) {
  const { baseUrl } = opts;
  const r = registry();
  r.engine = () => importUrl(moduleUrl(baseUrl, "spellcheck"));
  for (const lang of opts.languages ?? PUBLISHED_DICTIONARIES) {
    const id = idOf(lang);
    if (!id) continue;
    for (const k of r.dictionaries.keys()) if (k.toLowerCase() === id.toLowerCase()) r.dictionaries.delete(k);
    r.dictionaries.set(id, () => importUrl(moduleUrl(baseUrl, dictionaryPackage(id))));
  }
  changed();
}
function spellcheckLoader() {
  return registry().engine;
}
function registeredDictionaries() {
  return Object.fromEntries(registry().dictionaries);
}
function spellcheckAvailable() {
  const r = registry();
  return !!r.engine && r.dictionaries.size > 0;
}
function onSpellSourcesChange(listener) {
  const ls = registry().listeners;
  ls.add(listener);
  return () => ls.delete(listener);
}

export {
  PUBLISHED_DICTIONARIES,
  dictionaryPackage,
  registerSpellcheck,
  registerDictionary,
  configureSpellcheck,
  spellcheckLoader,
  registeredDictionaries,
  spellcheckAvailable,
  onSpellSourcesChange
};

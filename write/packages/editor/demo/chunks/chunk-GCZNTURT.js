// ../../../shared/ui/src/i18n.ts
var DEFAULT_UI_LANG = "en";
function matchUiLang(tag) {
  if (!tag) return null;
  if (/^pt\b/i.test(tag)) return "pt";
  if (/^en\b/i.test(tag)) return "en";
  return null;
}
function browserUiLang() {
  const nav = typeof navigator !== "undefined" ? navigator : void 0;
  const prefs = nav?.languages?.length ? nav.languages : nav?.language ? [nav.language] : [];
  for (const tag of prefs) {
    const m = matchUiLang(tag);
    if (m) return m;
  }
  return DEFAULT_UI_LANG;
}
function uiLang(el) {
  const forced = el?.getAttribute("lang");
  if (forced) return matchUiLang(forced) ?? DEFAULT_UI_LANG;
  return browserUiLang();
}
function pickLabels(lang, labels) {
  const l = typeof lang === "string" ? lang : uiLang(lang);
  return labels[l] ?? labels[DEFAULT_UI_LANG];
}
function onBrowserLangChange(cb) {
  if (typeof window === "undefined") return () => {
  };
  window.addEventListener("languagechange", cb);
  return () => window.removeEventListener("languagechange", cb);
}

export {
  DEFAULT_UI_LANG,
  uiLang,
  pickLabels,
  onBrowserLangChange
};

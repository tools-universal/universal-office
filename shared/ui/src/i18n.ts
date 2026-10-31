/**
 * Idioma da INTERFACE dos web components (`<universal-write>`, `<universal-sheet>`,
 * `<universal-slides>`, os viewers, `<universal-write-diff>` e os diálogos) — um
 * resolvedor só, para todos decidirem igual.
 *
 * Regra combinada com o usuário:
 *   1. `lang` no PRÓPRIO elemento força o idioma (`lang="pt-BR"`, `lang="en"`,
 *      `lang="es"`); idioma sem tradução cai no inglês.
 *   2. Sem o atributo, o navegador decide: a 1ª língua de `navigator.languages`
 *      que temos traduzida (pt-* → português, es-* → espanhol).
 *   3. Nada disso → inglês.
 *
 * O `lang` de ANCESTRAIS (ex.: `<html lang="en">` de template) não conta: só o
 * atributo do componente força. Isto é só a interface — formatação de números,
 * datas e nomes de função do Sheet seguem o locale dos DADOS (`formula-locale`).
 */

/**
 * Idiomas com tradução da interface. As tabelas de textos são
 * `Record<UiLang, …>` (`pickLabels`), então um idioma novo aqui faz o
 * compilador apontar todo rótulo que ficou sem tradução.
 */
export type UiLang = 'en' | 'pt' | 'es';

/** Todos os idiomas da interface, na ordem das tabelas. */
export const UI_LANGS: readonly UiLang[] = ['en', 'pt', 'es'];

/** Idioma padrão quando nada indica outro. */
export const DEFAULT_UI_LANG: UiLang = 'en';

/**
 * Locale BCP 47 de cada idioma, para formatar números e datas DA INTERFACE
 * (medidas dos diálogos, horário das revisões…): es → es-ES, com a vírgula
 * decimal do Office em espanhol.
 */
export const UI_LOCALES: Readonly<Record<UiLang, string>> = { en: 'en-US', pt: 'pt-BR', es: 'es-ES' };

/** Locale BCP 47 da interface (ver `UI_LOCALES`). */
export function uiLocale(lang: UiLang): string {
  return UI_LOCALES[lang] ?? UI_LOCALES[DEFAULT_UI_LANG];
}

/** Separador decimal dos textos da interface: vírgula em pt e es, ponto em en. */
export function uiDecimal(lang: UiLang): string {
  return lang === 'en' ? '.' : ',';
}

/** Tag BCP 47 → idioma traduzido, ou `null` quando não temos tradução. */
export function matchUiLang(tag: string | null | undefined): UiLang | null {
  if (!tag) return null;
  if (/^pt\b/i.test(tag)) return 'pt';
  if (/^es\b/i.test(tag)) return 'es';
  if (/^en\b/i.test(tag)) return 'en';
  return null;
}

/** Idioma preferido do navegador (1º traduzido de `navigator.languages`), ou o padrão. */
export function browserUiLang(): UiLang {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const prefs = nav?.languages?.length ? nav.languages : nav?.language ? [nav.language] : [];
  for (const tag of prefs) {
    const m = matchUiLang(tag);
    if (m) return m;
  }
  return DEFAULT_UI_LANG;
}

/**
 * Idioma efetivo da interface de `el`: o atributo `lang` dele força (sem
 * tradução → inglês); sem atributo, o do navegador.
 */
export function uiLang(el?: Element | null): UiLang {
  const forced = el?.getAttribute('lang');
  if (forced) return matchUiLang(forced) ?? DEFAULT_UI_LANG;
  return browserUiLang();
}

/** Escolhe a tabela de textos do idioma (`lang` pode ser `UiLang` ou um elemento). */
export function pickLabels<T>(lang: UiLang | Element | null | undefined, labels: { readonly en: T } & { readonly [K in UiLang]?: T }): T {
  const l = typeof lang === 'string' ? lang : uiLang(lang);
  return labels[l] ?? labels.en;
}

/**
 * Avisa quando o idioma do navegador muda (evento `languagechange`); devolve a
 * função que desliga. Componentes sem `lang` próprio chamam no connected.
 */
export function onBrowserLangChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('languagechange', cb);
  return () => window.removeEventListener('languagechange', cb);
}

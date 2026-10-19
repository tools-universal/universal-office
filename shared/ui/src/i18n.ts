/**
 * Idioma da INTERFACE dos web components (`<universal-write>`, `<universal-sheet>`,
 * `<universal-slides>`, os viewers, `<universal-write-diff>` e os diálogos) — um
 * resolvedor só, para todos decidirem igual.
 *
 * Regra combinada com o usuário:
 *   1. `lang` no PRÓPRIO elemento força o idioma (`lang="pt-BR"`, `lang="en"`);
 *      idioma sem tradução cai no inglês.
 *   2. Sem o atributo, o navegador decide: a 1ª língua de `navigator.languages`
 *      que temos traduzida (pt-* → português).
 *   3. Nada disso → inglês.
 *
 * O `lang` de ANCESTRAIS (ex.: `<html lang="en">` de template) não conta: só o
 * atributo do componente força. Isto é só a interface — formatação de números,
 * datas e nomes de função do Sheet seguem o locale dos DADOS (`formula-locale`).
 */

/** Idiomas com tradução da interface. */
export type UiLang = 'en' | 'pt';

/** Idioma padrão quando nada indica outro. */
export const DEFAULT_UI_LANG: UiLang = 'en';

/** Tag BCP 47 → idioma traduzido, ou `null` quando não temos tradução. */
export function matchUiLang(tag: string | null | undefined): UiLang | null {
  if (!tag) return null;
  if (/^pt\b/i.test(tag)) return 'pt';
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
export function pickLabels<T>(lang: UiLang | Element | null | undefined, labels: Record<UiLang, T>): T {
  const l = typeof lang === 'string' ? lang : uiLang(lang);
  return labels[l] ?? labels[DEFAULT_UI_LANG];
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

/**
 * Hifenização automática: padrões de Liang por idioma, carregados SOB DEMANDA (um
 * módulo por idioma, gerado de hyph-utf8 — ver patterns/THIRD-PARTY-NOTICES.md).
 *
 * O layout é síncrono: quem diagrama carrega antes os idiomas do documento
 * (`await loadHyphenation(langs)`); depois `hyphenatorFor(lang)` devolve o
 * hifenizador já carregado (ou undefined — o texto fica sem hifenização).
 */
import { Hyphenator, type HyphenationPatterns } from './liang.js';

export { Hyphenator, type HyphenationPatterns } from './liang.js';

type Loader = () => Promise<{ default: HyphenationPatterns }>;

/** id dos padrões → módulo (import dinâmico: cada idioma vira um pedaço do pacote) */
const LOADERS: Record<string, Loader> = {
  pt: () => import('./patterns/pt.js'),
  'en-us': () => import('./patterns/en-us.js'),
  es: () => import('./patterns/es.js'),
  fr: () => import('./patterns/fr.js'),
  'de-1996': () => import('./patterns/de-1996.js'),
  it: () => import('./patterns/it.js'),
  nl: () => import('./patterns/nl.js'),
};

/**
 * Padrões para uma etiqueta de idioma (BCP 47, como em w:lang): 'pt-BR' → 'pt'. Todo
 * inglês usa os americanos: o Word hifeniza en-US, en-GB e en-AU com os MESMOS pontos
 * (um só hifenizador de inglês) e os padrões en-us acertam 82% das palavras dele, os
 * britânicos 62% (varredura de 4645 palavras).
 */
export function hyphenationPatternId(lang: string | undefined): string | undefined {
  if (!lang) return undefined;
  const [base = ''] = lang.toLowerCase().split(/[-_]/);
  switch (base) {
    case 'pt': return 'pt';
    case 'es': return 'es';
    case 'fr': return 'fr';
    case 'de': return 'de-1996';
    case 'it': return 'it';
    case 'nl': return 'nl';
    case 'en': return 'en-us';
    default: return undefined;
  }
}

const loaded = new Map<string, Hyphenator>();
const pending = new Map<string, Promise<void>>();

/** Registra padrões já em memória (testes, pacotes que embutem um idioma). */
export function registerHyphenation(data: HyphenationPatterns): Hyphenator {
  const h = new Hyphenator(data);
  loaded.set(data.id, h);
  return h;
}

/** Carrega os padrões dos idiomas dados (etiquetas BCP 47 ou ids); ignora os sem padrões. */
export async function loadHyphenation(langs: Iterable<string | undefined>): Promise<void> {
  const ids = new Set<string>();
  for (const l of langs) {
    const id = l && LOADERS[l] ? l : hyphenationPatternId(l);
    if (id && !loaded.has(id)) ids.add(id);
  }
  await Promise.all([...ids].map((id) => {
    let p = pending.get(id);
    if (!p) {
      p = LOADERS[id]!().then((m) => { if (!loaded.has(id)) registerHyphenation(m.default); });
      pending.set(id, p);
    }
    return p;
  }));
}

/** Todos os ids com padrões disponíveis. */
export const HYPHENATION_PATTERN_IDS = Object.keys(LOADERS);

/** Hifenizador do idioma, se os padrões dele já foram carregados. */
export function hyphenatorFor(lang: string | undefined): Hyphenator | undefined {
  const id = hyphenationPatternId(lang);
  return id ? loaded.get(id) : undefined;
}

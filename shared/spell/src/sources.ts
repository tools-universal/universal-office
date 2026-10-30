/**
 * De onde vêm o MOTOR (Hunspell WASM) e os DICIONÁRIOS. Nada disso vem dentro
 * dos produtos: publicados, são pacotes à parte e opcionais
 * (`@universal-office/spellcheck`, `@universal-office/dictionary-<id>`), e o
 * hospedeiro diz onde estão — por loader (bundler) ou por URL (pasta estática).
 * Sem motor registrado não há revisão: nenhum idioma resolve, nada é sublinhado.
 *
 * Os dois caminhos são preguiçosos: o loader só roda na 1ª revisão (o motor) e
 * no 1º texto do idioma (o dicionário).
 *
 *   // bundler
 *   registerSpellcheck(() => import('@universal-office/spellcheck'));
 *   registerDictionary('pt-BR', () => import('@universal-office/dictionary-pt-br'));
 *
 *   // pasta estática: <base>/spellcheck/index.js e <base>/dictionary-pt-br/index.js
 *   configureSpellcheck({ baseUrl: '/vendor/universal-office' });
 *
 * O registro é da PÁGINA (globalThis + Symbol.for), não do módulo: os produtos
 * (e, no monorepo, o `dist/` e o `src/` do pacote) enxergam o mesmo registro.
 * Este módulo não importa nada: o editor o importa sem levar o SpellChecker.
 */

/** O pacote do motor (`@universal-office/spellcheck`): o glue do emscripten e o binário. */
export interface SpellcheckModule {
  /** fonte do módulo ES do emscripten (export default = fábrica do módulo) */
  glue: string;
  /** binário WASM em base64 */
  wasmBase64: string;
}

export type SpellcheckLoader = () => Promise<SpellcheckModule>;

/**
 * Conteúdo de um dicionário Hunspell (o pacote `@universal-office/dictionary-<id>`).
 * Texto (string) só para dicionários UTF-8 ou ISO8859-1 (a linha SET do .aff
 * decide a conversão); outra codificação não é suportada — converter para UTF-8.
 * Bytes (Uint8Array) vão ao Hunspell como estão.
 */
export interface DictionaryData {
  aff: string | Uint8Array;
  dic: string | Uint8Array;
}

export type DictionaryLoader = () => Promise<DictionaryData>;

/** Dicionários que o projeto publica, um pacote cada (`@universal-office/dictionary-<id minúsculo>`). */
export const PUBLISHED_DICTIONARIES = ['pt-BR', 'en-US'] as const;

/** Nome da pasta/pacote do dicionário: 'pt-BR' → 'dictionary-pt-br'. */
export const dictionaryPackage = (lang: string): string => `dictionary-${lang.trim().replace(/_/g, '-').toLowerCase()}`;

export interface SpellcheckUrlOptions {
  /**
   * Pasta com uma subpasta por pacote, como o npm os instala no escopo
   * (`node_modules/@universal-office/`): o motor em `<baseUrl>/spellcheck/index.js`
   * e cada dicionário em `<baseUrl>/dictionary-<id minúsculo>/index.js`.
   * Relativa ao `document.baseURI`.
   */
  baseUrl: string;
  /**
   * Idiomas servidos nessa pasta (padrão: todos os publicados, PUBLISHED_DICTIONARIES).
   * Listar só os copiados evita pedir um dicionário que não está lá.
   */
  languages?: readonly string[];
}

interface Registry {
  engine: SpellcheckLoader | undefined;
  dictionaries: Map<string, DictionaryLoader>;
  listeners: Set<() => void>;
}

const KEY = Symbol.for('universal-office.spell.sources');

function registry(): Registry {
  const g = globalThis as unknown as Record<symbol, Registry | undefined>;
  return (g[KEY] ??= { engine: undefined, dictionaries: new Map(), listeners: new Set() });
}

function changed(): void {
  for (const l of [...registry().listeners]) l();
}

/** O id do dicionário como o registro guarda (a grafia de quem registrou, sem espaços; "_" = "-"). */
const idOf = (lang: string): string => lang.trim().replace(/_/g, '-');

/** Registra (ou troca) o motor. `null` tira: a revisão fica indisponível. */
export function registerSpellcheck(loader: SpellcheckLoader | null): void {
  registry().engine = loader ?? undefined;
  changed();
}

/**
 * Registra (ou troca) o dicionário de um idioma BCP 47 ("pt-BR"). `null` tira.
 * Vale para idiomas ainda não carregados; um dicionário já em uso fica até o `unload`.
 */
export function registerDictionary(lang: string, loader: DictionaryLoader | null): void {
  const id = idOf(lang);
  if (!id) return;
  const dicts = registry().dictionaries;
  // a grafia nova substitui a antiga ("pt-br" depois de "pt-BR")
  for (const k of dicts.keys()) if (k.toLowerCase() === id.toLowerCase()) dicts.delete(k);
  if (loader) dicts.set(id, loader);
  changed();
}

/** URL absoluta de um módulo dentro da pasta base. */
function moduleUrl(baseUrl: string, pkg: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const doc = (globalThis as { document?: { baseURI?: string } }).document;
  return new URL(`${pkg}/index.js`, new URL(base, doc?.baseURI)).href;
}

/** import() de URL montada em tempo de execução: nenhum bundler segue. */
const importUrl = <T>(url: string): Promise<T> => import(/* @vite-ignore */ /* webpackIgnore: true */ url) as Promise<T>;

/**
 * Hospedeiro que serve os pacotes numa pasta estática (sem resolver nomes de
 * pacote em tempo de execução): registra o motor e os dicionários por URL.
 */
export function configureSpellcheck(opts: SpellcheckUrlOptions): void {
  const { baseUrl } = opts;
  const r = registry();
  r.engine = () => importUrl<SpellcheckModule>(moduleUrl(baseUrl, 'spellcheck'));
  for (const lang of opts.languages ?? PUBLISHED_DICTIONARIES) {
    const id = idOf(lang);
    if (!id) continue;
    for (const k of r.dictionaries.keys()) if (k.toLowerCase() === id.toLowerCase()) r.dictionaries.delete(k);
    r.dictionaries.set(id, () => importUrl<DictionaryData>(moduleUrl(baseUrl, dictionaryPackage(id))));
  }
  changed();
}

/** O loader do motor registrado (undefined = sem revisão). */
export function spellcheckLoader(): SpellcheckLoader | undefined {
  return registry().engine;
}

/** Dicionários registrados (id → loader), na ordem de registro. */
export function registeredDictionaries(): Record<string, DictionaryLoader> {
  return Object.fromEntries(registry().dictionaries);
}

/** Há motor e ao menos um dicionário registrados (a revisão pode acontecer). */
export function spellcheckAvailable(): boolean {
  const r = registry();
  return !!r.engine && r.dictionaries.size > 0;
}

/** Avisa quando o registro muda (motor ou dicionário registrado/trocado). */
export function onSpellSourcesChange(listener: () => void): () => void {
  const ls = registry().listeners;
  ls.add(listener);
  return () => ls.delete(listener);
}

/** @internal — só os testes: esvazia o registro (os ouvintes ficam). */
export function clearSpellSources(): void {
  const r = registry();
  r.engine = undefined;
  r.dictionaries.clear();
  changed();
}

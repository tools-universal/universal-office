/**
 * SpellChecker — o lado do CLIENTE (thread da interface). Fala com o motor
 * (Hunspell WASM, ver engine.ts) por mensagens: num Worker quando dá (padrão),
 * no próprio thread quando não (CSP sem blob:, Node). Tudo é assíncrono; o que
 * já foi revisado fica num cache que a pintura síncrona consulta (`cached`).
 *
 * Os dicionários e o motor são importados SOB DEMANDA (chunks): nada pesa no
 * bundle até o primeiro `load`/`check`.
 */
import { spellEngineMain, type EngineRequest, type EngineResponse, type EngineScope } from './engine.js';
import { BUILTIN_DICTIONARIES, resolveLanguage, type ResolvedLanguage } from './lang.js';
import { tokenize, type TokenizeOptions, type WordToken } from './tokenize.js';
import { localStorageStore, memoryStore, type UserDictionaryStore } from './user-dictionary.js';

/** Conteúdo de um dicionário Hunspell (.aff e .dic como texto). */
export interface DictionaryData {
  aff: string;
  dic: string;
}

export type DictionaryLoader = () => Promise<DictionaryData>;

const BUILTIN_LOADERS: Record<string, DictionaryLoader> = {
  'pt-BR': () => import('./dicts/pt-BR.js'),
  'en-US': () => import('./dicts/en-US.js'),
};

export interface SpellCheckerOptions {
  /** roda o motor num Worker (padrão: true onde houver Worker) */
  worker?: boolean;
  /** onde o dicionário do usuário mora (padrão: localStorage; null = só memória) */
  store?: UserDictionaryStore | null;
  /**
   * Dicionários extras ou substitutos, por id BCP 47 ("es-ES": () => …). O shell
   * Electron pode servir os do disco; o id vira um idioma resolvível.
   */
  dictionaries?: Record<string, DictionaryLoader>;
}

/** Palavra com erro num texto. */
export interface Misspelling extends WordToken {}

/** Evento de mudança: o hospedeiro repinta os sublinhados. */
export type SpellChangeListener = (ev: { kind: 'add' | 'remove' | 'ignore' | 'load'; words: string[]; dict?: string }) => void;

const CACHE_MAX = 50_000;

interface Transport {
  kind: 'worker' | 'thread';
  post(req: EngineRequest): void;
  onResponse: (res: EngineResponse) => void;
  /** o Worker morreu ou não carregou (erro de script/CSP): falha os pedidos pendentes */
  onError: (err: Error) => void;
  dispose(): void;
}

function localTransport(): Transport {
  const t: Transport = { kind: 'thread', post: () => {}, onResponse: () => {}, onError: () => {}, dispose: () => {} };
  const scope: EngineScope = {
    onmessage: null,
    postMessage: (msg) => queueMicrotask(() => t.onResponse(msg)),
  };
  spellEngineMain(scope);
  t.post = (req) => queueMicrotask(() => scope.onmessage?.({ data: req }));
  return t;
}

function workerTransport(): Transport | undefined {
  if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL?.createObjectURL !== 'function') return undefined;
  let w: Worker;
  const src = `(${spellEngineMain.toString()})(self);`;
  const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  try {
    w = new Worker(url, { type: 'module', name: 'universal-office-spell' });
  } catch {
    URL.revokeObjectURL(url);
    return undefined;
  }
  const t: Transport = {
    kind: 'worker',
    post: (req) => w.postMessage(req),
    onResponse: () => {},
    onError: () => {},
    dispose: () => { w.terminate(); URL.revokeObjectURL(url); },
  };
  w.onmessage = (ev: MessageEvent<EngineResponse>) => t.onResponse(ev.data);
  w.onerror = (ev) => { ev.preventDefault(); t.onError(new Error(ev.message || 'falha no Worker de revisão')); };
  return t;
}

export class SpellChecker {
  private static instance: SpellChecker | undefined;

  /** Instância única da página (um motor e um dicionário do usuário para todos os apps). */
  static shared(): SpellChecker {
    return (SpellChecker.instance ??= new SpellChecker());
  }

  private readonly opts: SpellCheckerOptions;
  private readonly loaders: Record<string, DictionaryLoader>;
  private readonly store: UserDictionaryStore;
  private transport: Transport | undefined;
  private engineReady: Promise<void> | undefined;
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private readonly loading = new Map<string, Promise<void>>();
  private readonly loaded = new Set<string>();
  private readonly cache = new Map<string, Map<string, boolean>>();
  private readonly ignored = new Set<string>();
  private user: Set<string> | undefined;
  private userLoad: Promise<Set<string>> | undefined;
  private readonly listeners = new Set<SpellChangeListener>();

  constructor(opts: SpellCheckerOptions = {}) {
    this.opts = opts;
    this.loaders = { ...BUILTIN_LOADERS, ...opts.dictionaries };
    this.store = opts.store === null ? memoryStore() : opts.store ?? localStorageStore();
  }

  /** Onde o motor está rodando: 'worker', 'thread' (sem Worker/CSP) ou undefined (ainda não subiu). */
  get mode(): 'worker' | 'thread' | undefined {
    return this.transport?.kind;
  }

  // ── idiomas ────────────────────────────────────────────────────────────

  /** ids dos dicionários disponíveis (embarcados + do hospedeiro) */
  dictionaries(): string[] {
    const ids = Object.keys(this.loaders);
    // os embarcados primeiro: são a variante "principal" da língua em resolveLanguage
    return [...BUILTIN_DICTIONARIES.filter((id) => ids.includes(id)), ...ids.filter((id) => !(BUILTIN_DICTIONARIES as readonly string[]).includes(id))];
  }

  /** etiqueta BCP 47 → dicionário (ver lang.ts) */
  resolve(lang: string | undefined | null): ResolvedLanguage | undefined {
    return resolveLanguage(lang, this.dictionaries());
  }

  /** o dicionário do idioma já está carregado (check/suggest respondem sem baixar nada) */
  isLoaded(lang: string): boolean {
    const r = this.resolve(lang);
    return !!r && this.loaded.has(r.id);
  }

  /**
   * Carrega (uma vez) o dicionário do idioma. Devolve o id usado, ou undefined
   * se não há dicionário para a língua (o texto fica sem revisão).
   */
  async load(lang: string): Promise<string | undefined> {
    const r = this.resolve(lang);
    if (!r) return undefined;
    let p = this.loading.get(r.id);
    if (!p) {
      p = (async () => {
        const [data, user] = await Promise.all([this.loaders[r.id]!(), this.userWords(), this.engine()]);
        await this.call({ op: 'load', dict: r.id, aff: data.aff, dic: data.dic, words: [...user] });
        this.loaded.add(r.id);
        this.emit({ kind: 'load', words: [], dict: r.id });
      })();
      this.loading.set(r.id, p);
      p.catch(() => this.loading.delete(r.id));
    }
    await p;
    return r.id;
  }

  // ── revisão ────────────────────────────────────────────────────────────

  /** A palavra está correta? (true também quando não há dicionário para o idioma.) */
  async check(word: string, lang: string): Promise<boolean> {
    return (await this.checkWords([word], lang))[0]!;
  }

  /** Revisa várias palavras de uma vez (uma mensagem só). */
  async checkWords(words: string[], lang: string): Promise<boolean[]> {
    const id = await this.load(lang);
    if (!id) return words.map(() => true);
    const cache = this.cacheFor(id);
    const todo = [...new Set(words.filter((w) => !this.ignored.has(w) && !cache.has(w)))];
    if (todo.length) {
      const res = (await this.call({ op: 'check', dict: id, words: todo })) as boolean[];
      if (cache.size + todo.length > CACHE_MAX) cache.clear();
      todo.forEach((w, i) => cache.set(w, res[i]!));
    }
    return words.map((w) => this.ignored.has(w) || cache.get(w) !== false);
  }

  /**
   * Resultado já conhecido, SEM esperar (para a pintura síncrona): true/false se
   * a palavra já foi revisada neste idioma, undefined se ainda não.
   */
  cached(word: string, lang: string): boolean | undefined {
    if (this.ignored.has(word)) return true;
    const r = this.resolve(lang);
    if (!r) return true;
    return this.cache.get(r.id)?.get(word);
  }

  /** Tokeniza e revisa um texto (um parágrafo): devolve só as palavras erradas. */
  async checkText(text: string, lang: string, opts?: TokenizeOptions): Promise<Misspelling[]> {
    const tokens = tokenize(text, opts);
    if (!tokens.length) return [];
    const ok = await this.checkWords(tokens.map((t) => t.word), lang);
    return tokens.filter((_, i) => !ok[i]);
  }

  /** Sugestões do Hunspell para a palavra, na ordem dele (até `limit`). */
  async suggest(word: string, lang: string, limit = 8): Promise<string[]> {
    const id = await this.load(lang);
    if (!id) return [];
    return (await this.call({ op: 'suggest', dict: id, word, limit })) as string[];
  }

  // ── dicionário do usuário e "ignorar" ──────────────────────────────────

  /** Palavras do dicionário do usuário. */
  async userWords(): Promise<Set<string>> {
    if (this.user) return this.user;
    return (this.userLoad ??= Promise.resolve(this.store.load()).then((w) => (this.user = new Set(w))));
  }

  /** "Adicionar ao dicionário": vale em todos os idiomas e fica guardado. */
  async add(word: string): Promise<void> {
    const user = await this.userWords();
    if (user.has(word)) return;
    user.add(word);
    await this.store.save([...user].sort());
    if (this.engineReady) await this.call({ op: 'add', words: [word] });
    this.forget(word);
    this.emit({ kind: 'add', words: [word] });
  }

  /** Tira a palavra do dicionário do usuário. */
  async remove(word: string): Promise<void> {
    const user = await this.userWords();
    if (!user.delete(word)) return;
    await this.store.save([...user].sort());
    if (this.engineReady) await this.call({ op: 'remove', words: [word] });
    this.forget(word);
    this.emit({ kind: 'remove', words: [word] });
  }

  /** "Ignorar tudo": só nesta sessão (não grava), em todos os idiomas. */
  ignore(word: string): void {
    if (this.ignored.has(word)) return;
    this.ignored.add(word);
    this.emit({ kind: 'ignore', words: [word] });
  }

  isIgnored(word: string): boolean {
    return this.ignored.has(word);
  }

  /** Avisa quando o resultado de palavras muda (add/remove/ignore/dicionário carregado). */
  onChange(listener: SpellChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Encerra o Worker (o próximo uso cria outro). */
  dispose(): void {
    this.transport?.dispose();
    this.transport = undefined;
    this.engineReady = undefined;
    for (const p of this.pending.values()) p.reject(new Error('SpellChecker descartado'));
    this.pending.clear();
    this.loading.clear();
    this.loaded.clear();
    this.cache.clear();
    if (SpellChecker.instance === this) SpellChecker.instance = undefined;
  }

  // ── interno ────────────────────────────────────────────────────────────

  private cacheFor(id: string): Map<string, boolean> {
    let c = this.cache.get(id);
    if (!c) this.cache.set(id, (c = new Map()));
    return c;
  }

  /** A palavra (e variações de caixa) sai do cache: o Hunspell decide de novo. */
  private forget(word: string): void {
    const lower = word.toLowerCase();
    for (const c of this.cache.values()) for (const k of c.keys()) if (k.toLowerCase() === lower) c.delete(k);
  }

  private emit(ev: Parameters<SpellChangeListener>[0]): void {
    for (const l of this.listeners) l(ev);
  }

  private engine(): Promise<void> {
    return (this.engineReady ??= (async () => {
      const wasm = await import('./hunspell/wasm.js');
      const useWorker = this.opts.worker !== false;
      this.transport = (useWorker && workerTransport()) || localTransport();
      this.attach(this.transport);
      try {
        await this.send({ op: 'init', glue: wasm.glue, wasmBase64: wasm.wasmBase64 });
      } catch (err) {
        if (!useWorker) throw err;
        // Worker não sobe (CSP, módulo blob: bloqueado): mesmo motor no thread
        this.transport.dispose();
        this.transport = localTransport();
        this.attach(this.transport);
        await this.send({ op: 'init', glue: wasm.glue, wasmBase64: wasm.wasmBase64 });
      }
    })());
  }

  private attach(t: Transport): void {
    t.onResponse = (res) => this.receive(res);
    t.onError = (err) => {
      for (const p of this.pending.values()) p.reject(err);
      this.pending.clear();
      // o motor morreu: o próximo pedido sobe outro (e recarrega os dicionários)
      if (this.transport === t) {
        t.dispose();
        this.transport = undefined;
        this.engineReady = undefined;
        this.loading.clear();
        this.loaded.clear();
      }
    };
  }

  private async call(req: DistributiveOmit<EngineRequest, 'id'>): Promise<unknown> {
    await this.engine();
    return this.send(req);
  }

  private send(req: DistributiveOmit<EngineRequest, 'id'>): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.transport!.post({ ...req, id } as EngineRequest);
    });
  }

  private receive(res: EngineResponse): void {
    const p = this.pending.get(res.id);
    if (!p) return;
    this.pending.delete(res.id);
    if (res.error !== undefined) p.reject(new Error(res.error));
    else p.resolve(res.result);
  }
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * SpellChecker — o lado do CLIENTE (thread da interface). Fala com o motor
 * (Hunspell WASM, ver engine.ts) por mensagens: num Worker quando dá (padrão),
 * no próprio thread quando não (CSP sem blob:, Node). Tudo é assíncrono; o que
 * já foi revisado fica num cache que a pintura síncrona consulta (`cached`).
 *
 * O motor e os dicionários NÃO vêm no pacote: vêm do registro de fontes
 * (sources.ts — o hospedeiro registra loaders ou uma pasta por URL) e são
 * carregados SOB DEMANDA: nada pesa até o primeiro `load`/`check`. Sem motor
 * registrado, ou com o motor/dicionário que não carrega, a revisão fica
 * indisponível (o idioma não resolve; tudo passa) — sem erro para quem chama.
 */
import { spellEngineMain, type EngineRequest, type EngineResponse, type EngineScope } from './engine.js';
import { resolveLanguage, type ResolvedLanguage } from './lang.js';
import {
  PUBLISHED_DICTIONARIES, onSpellSourcesChange, registeredDictionaries, spellcheckLoader,
  type DictionaryData, type DictionaryLoader, type SpellcheckModule,
} from './sources.js';
import { tokenize, type TokenizeOptions, type WordToken } from './tokenize.js';
import { localStorageStore, memoryStore, type UserDictionaryStore } from './user-dictionary.js';

export type { DictionaryData, DictionaryLoader };

export interface SpellCheckerOptions {
  /** roda o motor num Worker (padrão: true onde houver Worker) */
  worker?: boolean;
  /** onde o dicionário do usuário mora (padrão: localStorage; null = só memória) */
  store?: UserDictionaryStore | null;
  /**
   * Dicionários extras ou substitutos, por id BCP 47 ("es-ES": () => …), além dos
   * do registro (registerDictionary). O shell Electron pode servir os do disco;
   * o id vira um idioma resolvível. O motor continua vindo do registro.
   */
  dictionaries?: Record<string, DictionaryLoader>;
}

/** Palavra com erro num texto. */
export interface Misspelling extends WordToken {}

/** Evento de mudança: o hospedeiro repinta os sublinhados. */
export type SpellChangeListener = (ev: { kind: 'add' | 'remove' | 'ignore' | 'load'; words: string[]; dict?: string }) => void;

const CACHE_MAX = 50_000;
/** Worker que não responde ao init nesse prazo (script bloqueado sem evento de erro) → thread. */
const WORKER_INIT_TIMEOUT_MS = 15_000;

/** @internal — canal com o motor (Worker ou thread); exportado só para os testes. */
export interface Transport {
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

/** @internal — opções só dos testes (Worker falso). */
export interface SpellCheckerInternalOptions extends SpellCheckerOptions {
  workerFactory?: () => Transport | undefined;
}

export class SpellChecker {
  private static instance: SpellChecker | undefined;

  /**
   * Instância única da página (um motor e um dicionário do usuário para todos os
   * apps). Cada chamada conta uma referência: o `dispose()` de quem pegou só
   * encerra o motor quando o último usuário soltar. As `opts` valem só para quem
   * cria a instância (ex.: o `store` do dicionário do usuário dado pelo app
   * hospedeiro); as chamadas seguintes recebem a mesma instância.
   */
  static shared(opts?: SpellCheckerOptions): SpellChecker {
    const sc = (SpellChecker.instance ??= new SpellChecker(opts));
    sc.refs++;
    return sc;
  }

  private refs = 0;
  /** muda a cada add/remove: resultado de check pedido antes não entra no cache */
  private generation = 0;
  private readonly opts: SpellCheckerInternalOptions;
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
  /** dicionários cujo loader falhou (pacote ausente, 404): o idioma fica sem revisão */
  private readonly unavailable = new Set<string>();
  /** o loader do motor falhou: sem revisão até o registro mudar */
  private engineUnavailable = false;
  private offSources: (() => void) | undefined;

  constructor(opts: SpellCheckerOptions = {}) {
    this.opts = opts;
    this.store = opts.store === null ? memoryStore() : opts.store ?? localStorageStore();
  }

  /** Onde o motor está rodando: 'worker', 'thread' (sem Worker/CSP) ou undefined (ainda não subiu). */
  get mode(): 'worker' | 'thread' | undefined {
    return this.transport?.kind;
  }

  // ── idiomas ────────────────────────────────────────────────────────────

  /**
   * ids dos dicionários disponíveis (registro + opção `dictionaries`). Vazio sem
   * motor registrado, ou se o motor não carregou; sem o que falhou ao carregar.
   */
  dictionaries(): string[] {
    this.watchSources();
    if (!spellcheckLoader() || this.engineUnavailable) return [];
    const ids = Object.keys(this.loaders()).filter((id) => !this.unavailable.has(id));
    // os publicados primeiro: são a variante "principal" da língua em resolveLanguage
    const published = PUBLISHED_DICTIONARIES as readonly string[];
    return [...published.filter((id) => ids.includes(id)), ...ids.filter((id) => !published.includes(id))];
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
   * se não há dicionário para a língua (o texto fica sem revisão) — inclusive
   * quando o motor ou o dicionário registrado não carrega (pacote ausente).
   */
  async load(lang: string): Promise<string | undefined> {
    const r = this.resolve(lang);
    if (!r) return undefined;
    let p = this.loading.get(r.id);
    if (!p) {
      p = (async () => {
        const [data, user] = await Promise.all([this.dictionaryData(r.id), this.userWords(), this.engine()]);
        await this.call({ op: 'load', dict: r.id, aff: data.aff, dic: data.dic, words: [...user] });
        this.loaded.add(r.id);
        this.emit({ kind: 'load', words: [], dict: r.id });
      })();
      this.loading.set(r.id, p);
      p.catch(() => this.loading.delete(r.id));
    }
    try {
      await p;
    } catch (err) {
      // motor ou dicionário ausente: o idioma só deixa de ser revisado
      if (this.engineUnavailable || this.unavailable.has(r.id)) return undefined;
      throw err;
    }
    return r.id;
  }

  /** Descarrega o dicionário do idioma (libera a memória no motor; o próximo uso recarrega). */
  async unload(lang: string): Promise<void> {
    const r = this.resolve(lang);
    if (!r) return;
    const p = this.loading.get(r.id);
    if (!p) return;
    this.loading.delete(r.id);
    this.loaded.delete(r.id);
    this.cache.delete(r.id);
    await p.catch(() => {});
    // recarregado enquanto esperava: fica
    if (this.transport && !this.loading.has(r.id)) await this.send({ op: 'unload', dict: r.id });
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
    const fresh = new Map<string, boolean>();
    if (todo.length) {
      const gen = this.generation;
      const res = (await this.call({ op: 'check', dict: id, words: todo })) as boolean[];
      // add/remove no meio do caminho: a resposta pode ser velha — pergunta de novo
      if (gen !== this.generation) return this.checkWords(words, lang);
      todo.forEach((w, i) => fresh.set(w, res[i]!));
      const live = this.cacheFor(id); // unload no meio do caminho troca o mapa
      if (live.size + todo.length > CACHE_MAX) live.clear();
      for (const [w, ok] of fresh) live.set(w, ok);
    }
    return words.map((w) => this.ignored.has(w) || (fresh.get(w) ?? cache.get(w)) !== false);
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
    this.generation++; // já: check em voo agora pode estar velho
    const user = await this.userWords();
    if (user.has(word)) return;
    user.add(word);
    await this.store.save([...user].sort());
    if (this.engineReady) await this.call({ op: 'add', words: [word] });
    this.generation++; // e de novo: check que saiu antes do motor aplicar
    this.forget(word);
    this.emit({ kind: 'add', words: [word] });
  }

  /** Tira a palavra do dicionário do usuário. */
  async remove(word: string): Promise<void> {
    this.generation++;
    const user = await this.userWords();
    if (!user.delete(word)) return;
    await this.store.save([...user].sort());
    if (this.engineReady) await this.call({ op: 'remove', words: [word] });
    this.generation++; // e de novo: check que saiu antes do motor aplicar
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

  /**
   * Encerra o Worker (o próximo uso cria outro). Na instância `shared()`, só
   * solta a referência de quem chamou; o motor cai com a última.
   */
  dispose(): void {
    if (SpellChecker.instance === this && --this.refs > 0) return;
    this.transport?.dispose();
    this.transport = undefined;
    this.engineReady = undefined;
    for (const p of this.pending.values()) p.reject(new Error('SpellChecker descartado'));
    this.pending.clear();
    this.loading.clear();
    this.loaded.clear();
    this.cache.clear();
    this.unavailable.clear();
    this.engineUnavailable = false;
    this.offSources?.();
    this.offSources = undefined;
    if (SpellChecker.instance === this) SpellChecker.instance = undefined;
  }

  // ── interno ────────────────────────────────────────────────────────────

  private loaders(): Record<string, DictionaryLoader> {
    return { ...registeredDictionaries(), ...this.opts.dictionaries };
  }

  /**
   * Registro mudou (motor ou dicionário registrado depois): o que falhou ganha
   * outra chance e o hospedeiro revisa de novo (evento `load`).
   */
  private watchSources(): void {
    this.offSources ??= onSpellSourcesChange(() => {
      this.unavailable.clear();
      this.engineUnavailable = false;
      this.emit({ kind: 'load', words: [] });
    });
  }

  /** Dados do dicionário pelo loader; falha do loader = idioma indisponível. */
  private async dictionaryData(id: string): Promise<DictionaryData> {
    const loader = this.loaders()[id];
    try {
      if (!loader) throw new Error(`sem dicionário para ${id}`);
      return await loader();
    } catch (err) {
      this.unavailable.add(id);
      throw err;
    }
  }

  /** O motor pelo loader do registro; sem loader ou com falha = revisão indisponível. */
  private async engineModule(): Promise<SpellcheckModule> {
    const loader = spellcheckLoader();
    try {
      if (!loader) throw new Error('motor de revisão não registrado');
      return await loader();
    } catch (err) {
      this.engineUnavailable = true;
      throw err;
    }
  }

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
    if (this.engineReady) return this.engineReady;
    const p = this.startEngine();
    this.engineReady = p;
    p.catch(() => { if (this.engineReady === p) this.engineReady = undefined; });
    return p;
  }

  private async startEngine(): Promise<void> {
    const wasm = await this.engineModule();
    const init = { op: 'init', glue: wasm.glue, wasmBase64: wasm.wasmBase64 } as const;
    if (this.opts.worker !== false) {
      const wt = (this.opts.workerFactory ?? workerTransport)();
      if (wt) {
        try {
          await this.initOn(wt, init, WORKER_INIT_TIMEOUT_MS);
          return;
        } catch {
          // Worker não sobe (CSP, módulo blob: bloqueado): mesmo motor no thread
          wt.dispose();
        }
      }
    }
    await this.initOn(localTransport(), init);
  }

  /** Liga o transporte e espera o init; falha (ou estoura o prazo) → rejeita. */
  private async initOn(t: Transport, init: DistributiveOmit<EngineRequest, 'id'>, timeoutMs?: number): Promise<void> {
    this.transport = t;
    this.attach(t);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const sent = this.send(init);
      if (timeoutMs === undefined) await sent;
      else await Promise.race([sent, new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('Worker de revisão não respondeu')), timeoutMs); })]);
      this.live.add(t);
    } catch (err) {
      if (this.transport === t) this.transport = undefined;
      throw err;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  /** transportes que já passaram do init (erro neles = motor morreu) */
  private readonly live = new WeakSet<Transport>();

  private attach(t: Transport): void {
    t.onResponse = (res) => this.receive(res);
    t.onError = (err) => {
      for (const p of this.pending.values()) p.reject(err);
      this.pending.clear();
      // o motor morreu depois do init: o próximo pedido sobe outro (e recarrega
      // os dicionários). Durante o init quem decide é startEngine (cai no thread).
      if (this.transport === t && this.live.has(t)) {
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

import {
  PUBLISHED_DICTIONARIES,
  configureSpellcheck,
  dictionaryPackage,
  onSpellSourcesChange,
  registerDictionary,
  registerSpellcheck,
  registeredDictionaries,
  spellcheckAvailable,
  spellcheckLoader
} from "./chunk-3C5HC2QA.js";
import "./chunk-WSFCRVEQ.js";

// ../../../shared/spell/src/engine.ts
function spellEngineMain(scope) {
  let mod = null;
  const handles = /* @__PURE__ */ new Map();
  const enc = new TextEncoder();
  const userWords = /* @__PURE__ */ new Set();
  const toBytes = (s, latin1) => {
    if (!latin1) return enc.encode(s);
    const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      b[i] = c < 256 ? c : 63;
    }
    return b;
  };
  const fromBytes = (b, latin1) => latin1 ? String.fromCharCode(...b) : new TextDecoder().decode(b);
  const cstr = (s, latin1) => {
    const b = toBytes(s, latin1);
    const p = mod._malloc(b.length + 1);
    mod.HEAPU8.set(b, p);
    mod.HEAPU8[p + b.length] = 0;
    return p;
  };
  const readCstr = (p, latin1) => {
    const heap = mod.HEAPU8;
    let e = p;
    while (heap[e]) e++;
    return fromBytes(heap.slice(p, e), latin1);
  };
  async function init(glue, wasmBase64) {
    if (mod) return;
    const bin = Uint8Array.from(atob(wasmBase64), (c) => c.charCodeAt(0));
    let factory;
    try {
      const url = URL.createObjectURL(new Blob([glue], { type: "text/javascript" }));
      try {
        factory = (await import(
          /* @vite-ignore */
          url
        )).default;
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      factory = (await import(
        /* @vite-ignore */
        "data:text/javascript;charset=utf-8," + encodeURIComponent(glue)
      )).default;
    }
    mod = await factory({ wasmBinary: bin, locateFile: (p) => p, print: () => {
    }, printErr: () => {
    } });
  }
  const encodingOf = (aff) => {
    const head = typeof aff === "string" ? aff.slice(0, 65536) : new TextDecoder("latin1").decode(aff.subarray(0, 65536));
    const m = /^\s*SET\s+(\S+)/m.exec(head);
    const name = (m ? m[1] : "ISO8859-1").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (name === "UTF8") return "utf8";
    if (name === "ISO88591") return "latin1";
    throw new Error(`codifica\xE7\xE3o de dicion\xE1rio n\xE3o suportada: ${m ? m[1] : "?"} (use UTF-8 ou ISO8859-1)`);
  };
  const fileBytes = (s, latin1) => typeof s === "string" ? toBytes(s, latin1) : s;
  function load(dict, aff, dic, words) {
    const latin1 = encodingOf(aff) === "latin1";
    unload(dict);
    const name = dict.replace(/[^\w-]/g, "_");
    mod.FS.writeFile(`/${name}.aff`, fileBytes(aff, latin1));
    mod.FS.writeFile(`/${name}.dic`, fileBytes(dic, latin1));
    const pa = cstr(`/${name}.aff`, false);
    const pd = cstr(`/${name}.dic`, false);
    const h = mod._Hunspell_create(pa, pd);
    mod._free(pa);
    mod._free(pd);
    mod.FS.unlink(`/${name}.aff`);
    mod.FS.unlink(`/${name}.dic`);
    if (!h) throw new Error(`Hunspell_create falhou para ${dict}`);
    const entry = { h, latin1, added: /* @__PURE__ */ new Set() };
    handles.set(dict, entry);
    for (const w of words) userWords.add(w);
    for (const w of userWords) addTo(entry, w);
    return true;
  }
  function unload(dict) {
    const e = handles.get(dict);
    if (!e) return;
    mod._Hunspell_destroy(e.h);
    handles.delete(dict);
  }
  const spell = (e, w) => {
    const p = cstr(w, e.latin1);
    const ok = mod._Hunspell_spell(e.h, p) !== 0;
    mod._free(p);
    return ok;
  };
  function addTo(e, w) {
    if (e.added.has(w) || spell(e, w)) return;
    const p = cstr(w, e.latin1);
    mod._Hunspell_add(e.h, p);
    mod._free(p);
    e.added.add(w);
  }
  function removeFrom(e, w) {
    if (!e.added.delete(w)) return;
    const p = cstr(w, e.latin1);
    mod._Hunspell_remove(e.h, p);
    mod._free(p);
  }
  function get(dict) {
    const e = handles.get(dict);
    if (!e) throw new Error(`dicion\xE1rio n\xE3o carregado: ${dict}`);
    return e;
  }
  function check(dict, words) {
    const e = get(dict);
    return words.map((w) => spell(e, w));
  }
  function suggest(dict, word, limit) {
    const e = get(dict);
    const pw = cstr(word, e.latin1);
    const pp = mod._malloc(4);
    const n = mod._Hunspell_suggest(e.h, pp, pw);
    const out = [];
    if (n > 0) {
      const list = mod.HEAPU32[pp >>> 2];
      for (let i = 0; i < n; i++) out.push(readCstr(mod.HEAPU32[(list >>> 2) + i], e.latin1));
      mod._Hunspell_free_list(e.h, pp, n);
    }
    mod._free(pp);
    mod._free(pw);
    return out.slice(0, limit);
  }
  scope.onmessage = async (ev) => {
    const req = ev.data;
    try {
      let result;
      switch (req.op) {
        case "init":
          await init(req.glue, req.wasmBase64);
          break;
        case "load":
          result = load(req.dict, req.aff, req.dic, req.words);
          break;
        case "check":
          result = check(req.dict, req.words);
          break;
        case "suggest":
          result = suggest(req.dict, req.word, req.limit);
          break;
        case "add":
          for (const w of req.words) {
            userWords.add(w);
            for (const e of handles.values()) addTo(e, w);
          }
          break;
        case "remove":
          for (const w of req.words) {
            userWords.delete(w);
            for (const e of handles.values()) removeFrom(e, w);
          }
          break;
        case "unload":
          unload(req.dict);
          break;
      }
      scope.postMessage({ id: req.id, result });
    } catch (err) {
      scope.postMessage({ id: req.id, error: err instanceof Error ? err.message : String(err) });
    }
  };
}

// ../../../shared/spell/src/lang.ts
var norm = (s) => s.trim().replace(/_/g, "-").toLowerCase();
function resolveLanguage(lang, available = PUBLISHED_DICTIONARIES) {
  if (!lang) return void 0;
  const tag = norm(lang);
  if (!tag || tag === "zxx" || tag === "x-none" || tag === "und") return void 0;
  const exact = available.find((id) => norm(id) === tag);
  if (exact) return { id: exact, exact: true };
  const base = tag.split("-")[0];
  const same = available.find((id) => norm(id).split("-")[0] === base);
  return same ? { id: same, exact: false } : void 0;
}

// ../../../shared/spell/src/tokenize.ts
var LETTER = String.raw`\p{L}\p{M}\p{N}\u00AD\u200B-\u200D\u2060`;
var JOIN = String.raw`'’\-\u2010\u2011`;
var WORD_RE = new RegExp(`[${LETTER}]+(?:[${JOIN}][${LETTER}]+)*`, "gu");
var INVISIBLE_RE = /[\u00AD\u200B-\u200D\u2060]/g;
var TLD = "com|org|net|gov|edu|mil|int|info|biz|io|dev|app|ai|co|me|tv|br|pt|us|uk|de|fr|es|it|eu";
var INTERNET_RE = new RegExp(
  [
    String.raw`\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"]+`,
    // http://…, ftp://…, file://…
    String.raw`\b(?:mailto|tel|urn):[^\s<>"]+`,
    String.raw`\bwww\.[^\s<>"]+`,
    String.raw`[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+`,
    // e-mail
    String.raw`\b[a-z]:\\[^\s<>"]*`,
    // C:\pasta\arquivo
    String.raw`\\\\[^\s<>"]+`,
    // \\servidor\pasta
    String.raw`(?:^|(?<=\s))(?:~|\.{1,2})?\/[^\s<>"]*\/[^\s<>"]*`,
    // /usr/bin, ./a/b
    String.raw`\b[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.(?:${TLD})\b(?:\/[^\s<>"]*)?`
    // exemplo.com.br/x
  ].join("|"),
  "giu"
);
function internetRanges(text) {
  const out = [];
  for (const m of text.matchAll(INTERNET_RE)) {
    let end = m.index + m[0].length;
    while (end > m.index && /[.,;:!?)\]}'"”’]/.test(text[end - 1])) end--;
    if (end > m.index) out.push([m.index, end]);
  }
  return out;
}
function tokenize(text, opts = {}) {
  const { ignoreUppercase = true, ignoreWithNumbers = true, ignoreInternet = true } = opts;
  const skip = ignoreInternet ? internetRanges(text) : [];
  const out = [];
  let si = 0;
  for (const m of text.matchAll(WORD_RE)) {
    const start = m.index;
    const end = start + m[0].length;
    while (si < skip.length && skip[si][1] <= start) si++;
    if (si < skip.length && skip[si][0] < end) continue;
    const word = m[0].replace(INVISIBLE_RE, "").replace(/’/g, "'").replace(/[\u2010\u2011]/g, "-");
    if (!word || !/\p{L}/u.test(word)) continue;
    if (ignoreWithNumbers && /\p{N}/u.test(word)) continue;
    if (ignoreUppercase && word.length > 1 && word === word.toUpperCase() && word !== word.toLowerCase()) continue;
    out.push({ word, start, end });
  }
  return out;
}

// ../../../shared/spell/src/user-dictionary.ts
function localStorageStore(key = "universal-office.spell.user-words") {
  const mem = memoryStore();
  const ls = () => {
    try {
      return globalThis.localStorage ?? void 0;
    } catch {
      return void 0;
    }
  };
  return {
    load() {
      const s = ls();
      if (!s) return mem.load();
      try {
        const v = JSON.parse(s.getItem(key) ?? "[]");
        return Array.isArray(v) ? v.filter((w) => typeof w === "string") : [];
      } catch {
        return [];
      }
    },
    save(words) {
      const s = ls();
      if (!s) return mem.save(words);
      try {
        s.setItem(key, JSON.stringify(words));
      } catch {
      }
    }
  };
}
function memoryStore(initial = []) {
  let words = [...initial];
  return { load: () => [...words], save: (w) => {
    words = [...w];
  } };
}

// ../../../shared/spell/src/checker.ts
var CACHE_MAX = 5e4;
var WORKER_INIT_TIMEOUT_MS = 15e3;
function localTransport() {
  const t = { kind: "thread", post: () => {
  }, onResponse: () => {
  }, onError: () => {
  }, dispose: () => {
  } };
  const scope = {
    onmessage: null,
    postMessage: (msg) => queueMicrotask(() => t.onResponse(msg))
  };
  spellEngineMain(scope);
  t.post = (req) => queueMicrotask(() => scope.onmessage?.({ data: req }));
  return t;
}
function workerTransport() {
  if (typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL?.createObjectURL !== "function") return void 0;
  let w;
  const src = `(${spellEngineMain.toString()})(self);`;
  const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
  try {
    w = new Worker(url, { type: "module", name: "universal-office-spell" });
  } catch {
    URL.revokeObjectURL(url);
    return void 0;
  }
  const t = {
    kind: "worker",
    post: (req) => w.postMessage(req),
    onResponse: () => {
    },
    onError: () => {
    },
    dispose: () => {
      w.terminate();
      URL.revokeObjectURL(url);
    }
  };
  w.onmessage = (ev) => t.onResponse(ev.data);
  w.onerror = (ev) => {
    ev.preventDefault();
    t.onError(new Error(ev.message || "falha no Worker de revis\xE3o"));
  };
  return t;
}
var SpellChecker = class _SpellChecker {
  static instance;
  /**
   * Instância única da página (um motor e um dicionário do usuário para todos os
   * apps). Cada chamada conta uma referência: o `dispose()` de quem pegou só
   * encerra o motor quando o último usuário soltar. As `opts` valem só para quem
   * cria a instância (ex.: o `store` do dicionário do usuário dado pelo app
   * hospedeiro); as chamadas seguintes recebem a mesma instância.
   */
  static shared(opts) {
    const sc = _SpellChecker.instance ??= new _SpellChecker(opts);
    sc.refs++;
    return sc;
  }
  refs = 0;
  /** muda a cada add/remove: resultado de check pedido antes não entra no cache */
  generation = 0;
  opts;
  store;
  transport;
  engineReady;
  nextId = 1;
  pending = /* @__PURE__ */ new Map();
  loading = /* @__PURE__ */ new Map();
  loaded = /* @__PURE__ */ new Set();
  cache = /* @__PURE__ */ new Map();
  ignored = /* @__PURE__ */ new Set();
  user;
  userLoad;
  listeners = /* @__PURE__ */ new Set();
  /** dicionários cujo loader falhou (pacote ausente, 404): o idioma fica sem revisão */
  unavailable = /* @__PURE__ */ new Set();
  /** o loader do motor falhou: sem revisão até o registro mudar */
  engineUnavailable = false;
  offSources;
  constructor(opts = {}) {
    this.opts = opts;
    this.store = opts.store === null ? memoryStore() : opts.store ?? localStorageStore();
  }
  /** Onde o motor está rodando: 'worker', 'thread' (sem Worker/CSP) ou undefined (ainda não subiu). */
  get mode() {
    return this.transport?.kind;
  }
  // ── idiomas ────────────────────────────────────────────────────────────
  /**
   * ids dos dicionários disponíveis (registro + opção `dictionaries`). Vazio sem
   * motor registrado, ou se o motor não carregou; sem o que falhou ao carregar.
   */
  dictionaries() {
    this.watchSources();
    if (!spellcheckLoader() || this.engineUnavailable) return [];
    const ids = Object.keys(this.loaders()).filter((id) => !this.unavailable.has(id));
    const published = PUBLISHED_DICTIONARIES;
    return [...published.filter((id) => ids.includes(id)), ...ids.filter((id) => !published.includes(id))];
  }
  /** etiqueta BCP 47 → dicionário (ver lang.ts) */
  resolve(lang) {
    return resolveLanguage(lang, this.dictionaries());
  }
  /** o dicionário do idioma já está carregado (check/suggest respondem sem baixar nada) */
  isLoaded(lang) {
    const r = this.resolve(lang);
    return !!r && this.loaded.has(r.id);
  }
  /**
   * Carrega (uma vez) o dicionário do idioma. Devolve o id usado, ou undefined
   * se não há dicionário para a língua (o texto fica sem revisão) — inclusive
   * quando o motor ou o dicionário registrado não carrega (pacote ausente).
   */
  async load(lang) {
    const r = this.resolve(lang);
    if (!r) return void 0;
    let p = this.loading.get(r.id);
    if (!p) {
      p = (async () => {
        const [data, user] = await Promise.all([this.dictionaryData(r.id), this.userWords(), this.engine()]);
        await this.call({ op: "load", dict: r.id, aff: data.aff, dic: data.dic, words: [...user] });
        this.loaded.add(r.id);
        this.emit({ kind: "load", words: [], dict: r.id });
      })();
      this.loading.set(r.id, p);
      p.catch(() => this.loading.delete(r.id));
    }
    try {
      await p;
    } catch (err) {
      if (this.engineUnavailable || this.unavailable.has(r.id)) return void 0;
      throw err;
    }
    return r.id;
  }
  /** Descarrega o dicionário do idioma (libera a memória no motor; o próximo uso recarrega). */
  async unload(lang) {
    const r = this.resolve(lang);
    if (!r) return;
    const p = this.loading.get(r.id);
    if (!p) return;
    this.loading.delete(r.id);
    this.loaded.delete(r.id);
    this.cache.delete(r.id);
    await p.catch(() => {
    });
    if (this.transport && !this.loading.has(r.id)) await this.send({ op: "unload", dict: r.id });
  }
  // ── revisão ────────────────────────────────────────────────────────────
  /** A palavra está correta? (true também quando não há dicionário para o idioma.) */
  async check(word, lang) {
    return (await this.checkWords([word], lang))[0];
  }
  /** Revisa várias palavras de uma vez (uma mensagem só). */
  async checkWords(words, lang) {
    const id = await this.load(lang);
    if (!id) return words.map(() => true);
    const cache = this.cacheFor(id);
    const todo = [...new Set(words.filter((w) => !this.ignored.has(w) && !cache.has(w)))];
    const fresh = /* @__PURE__ */ new Map();
    if (todo.length) {
      const gen = this.generation;
      const res = await this.call({ op: "check", dict: id, words: todo });
      if (gen !== this.generation) return this.checkWords(words, lang);
      todo.forEach((w, i) => fresh.set(w, res[i]));
      const live = this.cacheFor(id);
      if (live.size + todo.length > CACHE_MAX) live.clear();
      for (const [w, ok] of fresh) live.set(w, ok);
    }
    return words.map((w) => this.ignored.has(w) || (fresh.get(w) ?? cache.get(w)) !== false);
  }
  /**
   * Resultado já conhecido, SEM esperar (para a pintura síncrona): true/false se
   * a palavra já foi revisada neste idioma, undefined se ainda não.
   */
  cached(word, lang) {
    if (this.ignored.has(word)) return true;
    const r = this.resolve(lang);
    if (!r) return true;
    return this.cache.get(r.id)?.get(word);
  }
  /** Tokeniza e revisa um texto (um parágrafo): devolve só as palavras erradas. */
  async checkText(text, lang, opts) {
    const tokens = tokenize(text, opts);
    if (!tokens.length) return [];
    const ok = await this.checkWords(tokens.map((t) => t.word), lang);
    return tokens.filter((_, i) => !ok[i]);
  }
  /** Sugestões do Hunspell para a palavra, na ordem dele (até `limit`). */
  async suggest(word, lang, limit = 8) {
    const id = await this.load(lang);
    if (!id) return [];
    return await this.call({ op: "suggest", dict: id, word, limit });
  }
  // ── dicionário do usuário e "ignorar" ──────────────────────────────────
  /** Palavras do dicionário do usuário. */
  async userWords() {
    if (this.user) return this.user;
    return this.userLoad ??= Promise.resolve(this.store.load()).then((w) => this.user = new Set(w));
  }
  /** "Adicionar ao dicionário": vale em todos os idiomas e fica guardado. */
  async add(word) {
    this.generation++;
    const user = await this.userWords();
    if (user.has(word)) return;
    user.add(word);
    await this.store.save([...user].sort());
    if (this.engineReady) await this.call({ op: "add", words: [word] });
    this.generation++;
    this.forget(word);
    this.emit({ kind: "add", words: [word] });
  }
  /** Tira a palavra do dicionário do usuário. */
  async remove(word) {
    this.generation++;
    const user = await this.userWords();
    if (!user.delete(word)) return;
    await this.store.save([...user].sort());
    if (this.engineReady) await this.call({ op: "remove", words: [word] });
    this.generation++;
    this.forget(word);
    this.emit({ kind: "remove", words: [word] });
  }
  /** "Ignorar tudo": só nesta sessão (não grava), em todos os idiomas. */
  ignore(word) {
    if (this.ignored.has(word)) return;
    this.ignored.add(word);
    this.emit({ kind: "ignore", words: [word] });
  }
  isIgnored(word) {
    return this.ignored.has(word);
  }
  /** Avisa quando o resultado de palavras muda (add/remove/ignore/dicionário carregado). */
  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  /**
   * Encerra o Worker (o próximo uso cria outro). Na instância `shared()`, só
   * solta a referência de quem chamou; o motor cai com a última.
   */
  dispose() {
    if (_SpellChecker.instance === this && --this.refs > 0) return;
    this.transport?.dispose();
    this.transport = void 0;
    this.engineReady = void 0;
    for (const p of this.pending.values()) p.reject(new Error("SpellChecker descartado"));
    this.pending.clear();
    this.loading.clear();
    this.loaded.clear();
    this.cache.clear();
    this.unavailable.clear();
    this.engineUnavailable = false;
    this.offSources?.();
    this.offSources = void 0;
    if (_SpellChecker.instance === this) _SpellChecker.instance = void 0;
  }
  // ── interno ────────────────────────────────────────────────────────────
  loaders() {
    return { ...registeredDictionaries(), ...this.opts.dictionaries };
  }
  /**
   * Registro mudou (motor ou dicionário registrado depois): o que falhou ganha
   * outra chance e o hospedeiro revisa de novo (evento `load`).
   */
  watchSources() {
    this.offSources ??= onSpellSourcesChange(() => {
      this.unavailable.clear();
      this.engineUnavailable = false;
      this.emit({ kind: "load", words: [] });
    });
  }
  /** Dados do dicionário pelo loader; falha do loader = idioma indisponível. */
  async dictionaryData(id) {
    const loader = this.loaders()[id];
    try {
      if (!loader) throw new Error(`sem dicion\xE1rio para ${id}`);
      return await loader();
    } catch (err) {
      this.unavailable.add(id);
      throw err;
    }
  }
  /** O motor pelo loader do registro; sem loader ou com falha = revisão indisponível. */
  async engineModule() {
    const loader = spellcheckLoader();
    try {
      if (!loader) throw new Error("motor de revis\xE3o n\xE3o registrado");
      return await loader();
    } catch (err) {
      this.engineUnavailable = true;
      throw err;
    }
  }
  cacheFor(id) {
    let c = this.cache.get(id);
    if (!c) this.cache.set(id, c = /* @__PURE__ */ new Map());
    return c;
  }
  /** A palavra (e variações de caixa) sai do cache: o Hunspell decide de novo. */
  forget(word) {
    const lower = word.toLowerCase();
    for (const c of this.cache.values()) for (const k of c.keys()) if (k.toLowerCase() === lower) c.delete(k);
  }
  emit(ev) {
    for (const l of this.listeners) l(ev);
  }
  engine() {
    if (this.engineReady) return this.engineReady;
    const p = this.startEngine();
    this.engineReady = p;
    p.catch(() => {
      if (this.engineReady === p) this.engineReady = void 0;
    });
    return p;
  }
  async startEngine() {
    const wasm = await this.engineModule();
    const init = { op: "init", glue: wasm.glue, wasmBase64: wasm.wasmBase64 };
    if (this.opts.worker !== false) {
      const wt = (this.opts.workerFactory ?? workerTransport)();
      if (wt) {
        try {
          await this.initOn(wt, init, WORKER_INIT_TIMEOUT_MS);
          return;
        } catch {
          wt.dispose();
        }
      }
    }
    await this.initOn(localTransport(), init);
  }
  /** Liga o transporte e espera o init; falha (ou estoura o prazo) → rejeita. */
  async initOn(t, init, timeoutMs) {
    this.transport = t;
    this.attach(t);
    let timer;
    try {
      const sent = this.send(init);
      if (timeoutMs === void 0) await sent;
      else await Promise.race([sent, new Promise((_, rej) => {
        timer = setTimeout(() => rej(new Error("Worker de revis\xE3o n\xE3o respondeu")), timeoutMs);
      })]);
      this.live.add(t);
    } catch (err) {
      if (this.transport === t) this.transport = void 0;
      throw err;
    } finally {
      if (timer !== void 0) clearTimeout(timer);
    }
  }
  /** transportes que já passaram do init (erro neles = motor morreu) */
  live = /* @__PURE__ */ new WeakSet();
  attach(t) {
    t.onResponse = (res) => this.receive(res);
    t.onError = (err) => {
      for (const p of this.pending.values()) p.reject(err);
      this.pending.clear();
      if (this.transport === t && this.live.has(t)) {
        t.dispose();
        this.transport = void 0;
        this.engineReady = void 0;
        this.loading.clear();
        this.loaded.clear();
      }
    };
  }
  async call(req) {
    await this.engine();
    return this.send(req);
  }
  send(req) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.transport.post({ ...req, id });
    });
  }
  receive(res) {
    const p = this.pending.get(res.id);
    if (!p) return;
    this.pending.delete(res.id);
    if (res.error !== void 0) p.reject(new Error(res.error));
    else p.resolve(res.result);
  }
};
export {
  PUBLISHED_DICTIONARIES,
  SpellChecker,
  configureSpellcheck,
  dictionaryPackage,
  internetRanges,
  localStorageStore,
  memoryStore,
  onSpellSourcesChange,
  registerDictionary,
  registerSpellcheck,
  resolveLanguage,
  spellcheckAvailable,
  tokenize
};

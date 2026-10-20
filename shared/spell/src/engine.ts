/**
 * Lado do MOTOR: o Hunspell (WASM) atrás de um protocolo de mensagens. A mesma
 * função roda dentro do Worker (fonte = `spellEngineMain.toString()`, num Blob)
 * ou no próprio thread quando o Worker não está disponível (CSP sem blob:, Node
 * nos testes) — um caminho de código só.
 *
 * Por isso `spellEngineMain` é AUTOCONTIDA: não pode referenciar nada de fora do
 * próprio corpo (nem imports, nem constantes do módulo), senão o Worker quebra.
 */

/** Pedido do cliente para o motor. `id` casa a resposta. */
export type EngineRequest =
  | { id: number; op: 'init'; glue: string; wasmBase64: string }
  | { id: number; op: 'load'; dict: string; aff: string | Uint8Array; dic: string | Uint8Array; words: string[] }
  | { id: number; op: 'check'; dict: string; words: string[] }
  | { id: number; op: 'suggest'; dict: string; word: string; limit: number }
  | { id: number; op: 'add' | 'remove'; words: string[] }
  | { id: number; op: 'unload'; dict: string };

export type EngineResponse = { id: number; result?: unknown; error?: string };

/** O que o motor precisa do ambiente: `self` do Worker ou um par local. */
export interface EngineScope {
  onmessage: ((ev: { data: EngineRequest }) => void) | null;
  postMessage(msg: EngineResponse): void;
}

export function spellEngineMain(scope: EngineScope): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mod: any = null;
  /** h = instância Hunspell; added = palavras do usuário que entraram nela */
  type Entry = { h: number; latin1: boolean; added: Set<string> };
  const handles = new Map<string, Entry>();
  const enc = new TextEncoder();
  const userWords = new Set<string>();

  // Strings: o Hunspell recebe na codificação do dicionário (UTF-8 nos nossos;
  // ISO8859-1 para dicionários do host — ver encodingOf).
  const toBytes = (s: string, latin1: boolean): Uint8Array => {
    if (!latin1) return enc.encode(s);
    const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); b[i] = c < 256 ? c : 63; }
    return b;
  };
  const fromBytes = (b: Uint8Array, latin1: boolean): string =>
    latin1 ? String.fromCharCode(...b) : new TextDecoder().decode(b);
  const cstr = (s: string, latin1: boolean): number => {
    const b = toBytes(s, latin1);
    const p = mod._malloc(b.length + 1);
    mod.HEAPU8.set(b, p);
    mod.HEAPU8[p + b.length] = 0;
    return p;
  };
  const readCstr = (p: number, latin1: boolean): string => {
    const heap: Uint8Array = mod.HEAPU8;
    let e = p;
    while (heap[e]) e++;
    return fromBytes(heap.slice(p, e), latin1);
  };

  async function init(glue: string, wasmBase64: string): Promise<void> {
    if (mod) return;
    const bin = Uint8Array.from(atob(wasmBase64), (c) => c.charCodeAt(0));
    let factory;
    try {
      const url = URL.createObjectURL(new Blob([glue], { type: 'text/javascript' }));
      try { factory = (await import(/* @vite-ignore */ url)).default; } finally { URL.revokeObjectURL(url); }
    } catch {
      // Node (testes) não importa blob: — data: funciona nos dois
      factory = (await import(/* @vite-ignore */ 'data:text/javascript;charset=utf-8,' + encodeURIComponent(glue))).default;
    }
    // locateFile: o glue não monta new URL('hunspell.wasm', import.meta.url) (inválida em blob:/data:)
    mod = await factory({ wasmBinary: bin, locateFile: (p: string) => p, print: () => {}, printErr: () => {} });
  }

  // Codificação do dicionário pela linha SET do .aff (sem SET o Hunspell assume
  // ISO8859-1). Só UTF-8 e ISO8859-1 têm conversão de texto; outra codificação
  // precisa vir em BYTES (Uint8Array) e, mesmo assim, as palavras saem em UTF-8 —
  // por isso é recusada: converter o dicionário para UTF-8 antes.
  const encodingOf = (aff: string | Uint8Array): 'utf8' | 'latin1' => {
    const head = typeof aff === 'string' ? aff.slice(0, 65536) : new TextDecoder('latin1').decode(aff.subarray(0, 65536));
    const m = /^\s*SET\s+(\S+)/m.exec(head);
    const name = (m ? m[1]! : 'ISO8859-1').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (name === 'UTF8') return 'utf8';
    if (name === 'ISO88591') return 'latin1';
    throw new Error(`codificação de dicionário não suportada: ${m ? m[1] : '?'} (use UTF-8 ou ISO8859-1)`);
  };
  const fileBytes = (s: string | Uint8Array, latin1: boolean): Uint8Array => (typeof s === 'string' ? toBytes(s, latin1) : s);

  function load(dict: string, aff: string | Uint8Array, dic: string | Uint8Array, words: string[]): boolean {
    const latin1 = encodingOf(aff) === 'latin1';
    unload(dict);
    const name = dict.replace(/[^\w-]/g, '_');
    mod.FS.writeFile(`/${name}.aff`, fileBytes(aff, latin1));
    mod.FS.writeFile(`/${name}.dic`, fileBytes(dic, latin1));
    const pa = cstr(`/${name}.aff`, false);
    const pd = cstr(`/${name}.dic`, false);
    const h: number = mod._Hunspell_create(pa, pd);
    mod._free(pa); mod._free(pd);
    mod.FS.unlink(`/${name}.aff`); mod.FS.unlink(`/${name}.dic`);
    if (!h) throw new Error(`Hunspell_create falhou para ${dict}`);
    const entry: Entry = { h, latin1, added: new Set() };
    handles.set(dict, entry);
    for (const w of words) userWords.add(w);
    for (const w of userWords) addTo(entry, w);
    return true;
  }

  function unload(dict: string): void {
    const e = handles.get(dict);
    if (!e) return;
    mod._Hunspell_destroy(e.h);
    handles.delete(dict);
  }

  const spell = (e: Entry, w: string): boolean => {
    const p = cstr(w, e.latin1);
    const ok = mod._Hunspell_spell(e.h, p) !== 0;
    mod._free(p);
    return ok;
  };

  // O Hunspell_remove põe FORBIDDENWORD na entrada — inclusive na do dicionário
  // base. Por isso só entra no Hunspell (e só sai dele) a palavra que o base NÃO
  // aceitava: `added` lembra quais foram.
  function addTo(e: Entry, w: string): void {
    if (e.added.has(w) || spell(e, w)) return;
    const p = cstr(w, e.latin1);
    mod._Hunspell_add(e.h, p);
    mod._free(p);
    e.added.add(w);
  }

  function removeFrom(e: Entry, w: string): void {
    if (!e.added.delete(w)) return;
    const p = cstr(w, e.latin1);
    mod._Hunspell_remove(e.h, p);
    mod._free(p);
  }

  function get(dict: string): Entry {
    const e = handles.get(dict);
    if (!e) throw new Error(`dicionário não carregado: ${dict}`);
    return e;
  }

  function check(dict: string, words: string[]): boolean[] {
    const e = get(dict);
    return words.map((w) => spell(e, w));
  }

  function suggest(dict: string, word: string, limit: number): string[] {
    const e = get(dict);
    const pw = cstr(word, e.latin1);
    const pp = mod._malloc(4);
    const n: number = mod._Hunspell_suggest(e.h, pp, pw);
    const out: string[] = [];
    if (n > 0) {
      const list = mod.HEAPU32[pp >>> 2];
      for (let i = 0; i < n; i++) out.push(readCstr(mod.HEAPU32[(list >>> 2) + i], e.latin1));
      mod._Hunspell_free_list(e.h, pp, n);
    }
    mod._free(pp); mod._free(pw);
    return out.slice(0, limit);
  }

  scope.onmessage = async (ev) => {
    const req = ev.data;
    try {
      let result: unknown;
      switch (req.op) {
        case 'init': await init(req.glue, req.wasmBase64); break;
        case 'load': result = load(req.dict, req.aff, req.dic, req.words); break;
        case 'check': result = check(req.dict, req.words); break;
        case 'suggest': result = suggest(req.dict, req.word, req.limit); break;
        case 'add':
          for (const w of req.words) { userWords.add(w); for (const e of handles.values()) addTo(e, w); }
          break;
        case 'remove':
          for (const w of req.words) { userWords.delete(w); for (const e of handles.values()) removeFrom(e, w); }
          break;
        case 'unload': unload(req.dict); break;
      }
      scope.postMessage({ id: req.id, result });
    } catch (err) {
      scope.postMessage({ id: req.id, error: err instanceof Error ? err.message : String(err) });
    }
  };
}

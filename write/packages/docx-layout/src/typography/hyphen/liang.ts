/**
 * Hifenização pelo algoritmo de Frank Liang (padrões do TeX — "Word Hy-phen-a-tion
 * by Com-put-er", 1983): para cada trecho da palavra (entre pontos ".") que casa
 * com um padrão, o maior número entre duas letras vale; ímpar = pode quebrar.
 *
 * Os dados (`HyphenationPatterns`) são gerados de hyph-utf8 por
 * write/tools/hyphen/gen-patterns.mjs — sintaxe TeX original ("1b2l"), portável
 * para o port .NET (que lê o mesmo JSON).
 */

export interface HyphenationPatterns {
  /** id do arquivo hyph-utf8: 'pt', 'en-us', 'de-1996'… */
  id: string;
  /** mínimos tipográficos do hyph-utf8 (letras antes/depois do hífen) */
  left: number;
  right: number;
  /** padrões de Liang na sintaxe TeX, separados por espaço */
  patterns: string;
  /** exceções (palavras com os pontos marcados por "-"), separadas por espaço */
  exceptions: string;
}

interface Node {
  /** filhos por código de caractere */
  k?: Map<number, Node>;
  /** valores entre as letras do padrão (comprimento = letras + 1) */
  v?: Uint8Array;
}

const DOT = 0x2e;

/** Letra em minúscula, mantendo UM código (as raras que viram duas ficam como estão). */
function lowerCp(ch: string): number {
  const l = ch.toLowerCase();
  const cp = l.codePointAt(0)!;
  return l.length === ch.length || String.fromCodePoint(cp) === l ? cp : ch.codePointAt(0)!;
}

export class Hyphenator {
  private readonly root: Node = {};
  private readonly exceptions = new Map<string, number[]>();
  private readonly cache = new Map<string, number[]>();

  constructor(readonly data: HyphenationPatterns) {
    for (const p of data.patterns.split(/\s+/)) if (p) this.add(p.normalize('NFC'));
    for (const e of data.exceptions.split(/\s+/)) {
      if (!e) continue;
      const pts: number[] = [];
      let n = 0;
      for (const ch of e.normalize('NFC')) {
        if (ch === '-') pts.push(n);
        else n++;
      }
      this.exceptions.set(e.replace(/-/g, '').normalize('NFC').toLowerCase(), pts);
    }
  }

  private add(pat: string): void {
    const letters: number[] = [];
    const vals: number[] = [0];
    for (const ch of pat) {
      if (ch >= '0' && ch <= '9') vals[vals.length - 1] = ch.charCodeAt(0) - 48;
      else { letters.push(ch.codePointAt(0)!); vals.push(0); }
    }
    let n = this.root;
    for (const c of letters) {
      n.k ??= new Map();
      let nx = n.k.get(c);
      if (!nx) { nx = {}; n.k.set(c, nx); }
      n = nx;
    }
    n.v = Uint8Array.from(vals);
  }

  /** Pontos de quebra pelos padrões, SEM mínimos: k ∈ [1, n−1] = hífen depois de k letras
   *  (código a código — a palavra deve vir em NFC, como os padrões). */
  points(word: string): number[] {
    const hit = this.cache.get(word);
    if (hit) return hit;
    const chars = Array.from(word);
    const n = chars.length;
    const low = chars.map(lowerCp);
    const exc = this.exceptions.get(String.fromCodePoint(...low));
    let out: number[];
    if (exc) out = exc.filter((k) => k > 0 && k < n);
    else {
      const w = [DOT, ...low, DOT];
      const vals = new Uint8Array(w.length + 1);
      for (let i = 0; i < w.length; i++) {
        let node: Node | undefined = this.root;
        for (let j = i; j < w.length && node; j++) {
          node = node.k?.get(w[j]!);
          if (node?.v) {
            const v = node.v;
            for (let q = 0; q < v.length; q++) if (v[q]! > vals[i + q]!) vals[i + q] = v[q]!;
          }
        }
      }
      // posição k (depois de k letras da palavra) = vals[k + 1] (o "." inicial desloca 1)
      out = [];
      for (let k = 1; k < n; k++) if (vals[k + 1]! & 1) out.push(k);
    }
    if (this.cache.size > 50000) this.cache.clear();
    this.cache.set(word, out);
    return out;
  }

  /** Pontos com os mínimos de letras antes/depois do hífen (padrão: os do hyph-utf8). */
  hyphenate(word: string, left = this.data.left, right = this.data.right): number[] {
    const n = Array.from(word).length;
    return this.points(word).filter((k) => k >= left && n - k >= right);
  }
}

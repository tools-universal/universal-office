/**
 * Ordem de textos do Excel (operadores < > =, critérios, SORT/MATCH…): a ordenação
 * "por palavra" do Windows sem diferenciar maiúsculas. Medido no Excel 365 pt-BR
 * (=SORT de todos os ASCII imprimíveis e Latin-1, comparações diretas):
 * - hífen e apóstrofo não contam na 1ª passada ("co-op" vem logo depois de "coop");
 *   no desempate, quem tem o sinal mais à esquerda é maior, e ' < -;
 * - pontuação e símbolos antes dos dígitos, dígitos antes das letras, na ordem medida
 *   (espaço ! " # $ % & ( ) * , . / : ; ? @ [ \ ] ^ _ ` { | } ~ ¡ ¿ £ € + < = > ± × ÷ § °);
 * - letras sem acento na 1ª passada (á = a), acento desempata (a < ª < á < à < â < ä < ã);
 * - ß = ss e æ = ae (iguais); maiúsculas = minúsculas.
 * Dono: agente FN-STAT (critérios); disponível para comparação e ordenação em geral.
 */

/** Pontuação/símbolos na ordem medida (peso = índice + 1). */
const SYMBOLS = '  !"#$%&()*,./:;?@[\\]^_`{|}~¡¿£€+<=>±×÷§°';
const SYM_W = new Map<string, number>();
for (let i = 0; i < SYMBOLS.length; i++) SYM_W.set(SYMBOLS[i]!, i + 1);
/** Base dos pesos: símbolos (1..) < outros símbolos (200..) < dígitos (1000..) < letras (2000..). */
const OTHER_SYM = 200, DIGIT = 1000, LETTER = 2000;

/** Sinais ignorados na 1ª passada (hífen, apóstrofo, hífen suave). */
const IGNORED: Record<string, number> = { "'": 1, '-': 2, '­': 3 };

/** Peso do diacrítico (marca combinante) no desempate. */
const MARK_W: Record<string, number> = {
  '́': 2, '̀': 3, '̆': 4, '̂': 5, '̌': 6, '̊': 7, '̈': 8,
  '̋': 9, '̃': 10, '̇': 11, '̧': 12, '̨': 13, '̄': 14,
};
/** Letras com peso próprio de "acento" sem decomposição (ª º ø). */
const SPECIAL: Record<string, [string, number]> = {
  'ª': ['a', 1], 'º': ['o', 1], 'ø': ['o', 20], 'Ø': ['o', 20],
};
/** Expansões (iguais na comparação). */
const EXPAND: Record<string, string> = { 'ß': 'ss', 'æ': 'ae', 'Æ': 'ae', 'œ': 'oe', 'Œ': 'oe' };

interface Key { p: number[]; s: number[]; t: [number, number][] }

const cache = new Map<string, Key>();

function keyOf(text: string): Key {
  let k = cache.get(text);
  if (k) return k;
  const p: number[] = [], s: number[] = [], t: [number, number][] = [];
  let pos = 0;
  for (const ch0 of text) {
    pos++;
    const ig = IGNORED[ch0];
    if (ig) { t.push([-pos, ig]); continue; }
    const exp = EXPAND[ch0];
    const chars = exp ?? ch0;
    for (const ch1 of chars) {
      const sp = SPECIAL[ch1];
      if (sp) { p.push(LETTER + sp[0].charCodeAt(0)); s.push(sp[1]); continue; }
      const nfd = ch1.normalize('NFD');
      let first = true;
      for (const c of nfd) {
        const mw = MARK_W[c];
        if (!first && (mw || /\p{M}/u.test(c))) { s[s.length - 1] = s[s.length - 1]! * 32 + (mw ?? 30); continue; }
        first = false;
        const sw = SYM_W.get(c);
        if (sw) { p.push(sw); s.push(0); continue; }
        const cp = c.codePointAt(0)!;
        if (c >= '0' && c <= '9') { p.push(DIGIT + cp); s.push(0); continue; }
        const lo = c.toLowerCase();
        if (lo !== c.toUpperCase() || /\p{L}/u.test(c)) { p.push(LETTER + lo.codePointAt(0)!); s.push(0); continue; }
        p.push(OTHER_SYM + cp); s.push(0);
      }
    }
  }
  k = { p, s, t };
  if (cache.size > 50000) cache.clear();
  cache.set(text, k);
  return k;
}

function cmpArr(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i]! < b[i]! ? -1 : 1;
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}

/** Compara dois textos como o Excel (−1, 0, 1). */
export function compareText(a: string, b: string): number {
  if (a === b) return 0;
  const ka = keyOf(a), kb = keyOf(b);
  const c1 = cmpArr(ka.p, kb.p);
  if (c1) return c1;
  const c2 = cmpArr(ka.s, kb.s);
  if (c2) return c2;
  const n = Math.min(ka.t.length, kb.t.length);
  for (let i = 0; i < n; i++) {
    const x = ka.t[i]!, y = kb.t[i]!;
    if (x[0] !== y[0]) return x[0] < y[0] ? -1 : 1;
    if (x[1] !== y[1]) return x[1] < y[1] ? -1 : 1;
  }
  return ka.t.length === kb.t.length ? 0 : ka.t.length < kb.t.length ? -1 : 1;
}

/** Textos iguais para o Excel ("A" = "a", "ß" = "ss"; "a" ≠ "á"). */
export function textEquals(a: string, b: string): boolean {
  return compareText(a, b) === 0;
}

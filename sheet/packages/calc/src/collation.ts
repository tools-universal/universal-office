/**
 * Ordem de textos do Excel (operadores < > =, SORT, UNIQUE, MATCH/VLOOKUP
 * aproximados): a ordenação "de palavras" do Windows (CompareString com
 * NORM_IGNORECASE), não a ordem dos códigos. Medida no Excel 365 pt-BR
 * (SORT de 172 textos, lab calc/tdl):
 * - maiúsculas = minúsculas ("A" = "a" dá VERDADEIRO);
 * - hífen e apóstrofo são ignorados na comparação principal e só desempatam
 *   ("ab" < "ab-" < "a'b" < "a-b" < "a--b" < "-ab" < "ac"); o texto SEM eles vem
 *   antes, depois o que os tem mais à direita;
 * - acentos são diferença secundária: "a" < "ª" < "á" < "à" < "â" < "ä" < "ã" < "å"
 *   < "a b" < "aa"; "a" = "á" é FALSO;
 * - ligaduras/expansões são iguais: "ß" = "ss", "æ" = "ae", "ﬁ" = "fi" (VERDADEIRO);
 * - símbolos antes dos dígitos e estes antes das letras, na ordem
 *   ' - (ignorados) espaço ! " # $ % & ( ) * , . / : ; ? @ [ \ ] ^ _ ` { | } ~ £ €
 *   + < = > × ÷ § ° µ 0 … 9 a … z, depois grego/cirílico/kana, emoji e ideogramas;
 * - dígitos comparam caractere a caractere ("10" < "9", "01" < "1").
 * A igualdade EXATA de MATCH/VLOOKUP/XLOOKUP não é esta (lá "ß" ≠ "ss"): ver
 * `sameTextCI` em coerce.ts.
 */

interface Key {
  /** Pesos primários (letra-base, dígito, símbolo). */
  readonly p: number[];
  /** Pesos secundários (acentos), um por elemento primário. */
  readonly s: number[];
  /**
   * Pesos terciários (largura/tipo de kana), um por elemento: "a" < "Ａ" (largura
   * total) e ｱ (meia largura) < ア < あ — diferentes, mesmo sem caixa (medido pelo
   * CORE: matriz 97×97 de =A2:A98<B1:CT1 no Excel pt-BR).
   */
  readonly t: number[];
  /** Ignoráveis (hífen/apóstrofo): [posição no texto, peso]. */
  readonly sp: [number, number][];
}

const SPACE = 10;
const PUNCT = '!"#$%&()*,./:;?@[\\]^_`{|}~';
const CURRENCY = '¢£¤¥€';
// ± vem depois de > (medido pelo CORE: "<"/"="/">" < "±")
const MATH = '+<=>±×÷¬';
const MISC = '§©®°µ¶';
const DIGIT0 = 1000;
const LETTER_A = 2000;
const OTHER = 100000;
const CJK = 400000;

/** Pesos secundários dos diacríticos combinantes (ordem medida: agudo < grave < circunflexo < trema < til < anel). */
const MARK: Record<number, number> = {
  0x301: 2, 0x300: 3, 0x302: 4, 0x308: 5, 0x303: 6, 0x30a: 7, 0x327: 8, 0x30c: 9,
  0x304: 10, 0x306: 11, 0x328: 12, 0x307: 13, 0x30b: 14,
};
const STROKE = 15;

/** Caracteres com tratamento próprio: [elementos primários (texto), secundário]. */
const SPECIAL: Record<string, [string, number]> = {
  'ª': ['a', 1], 'º': ['o', 1], 'ø': ['o', STROKE], 'Ø': ['o', STROKE], 'đ': ['d', STROKE], 'Đ': ['d', STROKE],
  'ł': ['l', STROKE], 'Ł': ['l', STROKE], 'ħ': ['h', STROKE], 'Ħ': ['h', STROKE], 'ı': ['i', 1], 'ŉ': ['n', 40],
  'ß': ['ss', 0], 'ẞ': ['ss', 0], 'æ': ['ae', 0], 'Æ': ['ae', 0], 'œ': ['oe', 0], 'Œ': ['oe', 0],
  '¹': ['1', 1], '²': ['2', 1], '³': ['3', 1],
};

const charCache = new Map<number, { p: number[]; s: number[]; t: number[] } | null>();

function isCjk(cp: number): boolean {
  return (cp >= 0x3400 && cp <= 0x9fff) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0x20000 && cp <= 0x3ffff);
}

/** Peso primário de um caractere-base (sem diacrítico). */
function basePrimary(ch: string): number {
  const cp = ch.codePointAt(0)!;
  if (cp < 32 || cp === 0x7f) return 1;
  if (ch === ' ' || cp === 0xa0 || (cp >= 0x2000 && cp <= 0x200a) || cp === 0x3000) return SPACE;
  if (cp >= 48 && cp <= 57) return DIGIT0 + cp - 48;
  const lo = ch.toLowerCase();
  const lc = lo.codePointAt(0)!;
  if (lo.length === 1 && lc >= 97 && lc <= 122) return LETTER_A + lc - 97;
  let i = PUNCT.indexOf(ch);
  if (i >= 0) return 11 + i;
  if ((i = CURRENCY.indexOf(ch)) >= 0) return 60 + i;
  if ((i = MATH.indexOf(ch)) >= 0) return 70 + i;
  if ((i = MISC.indexOf(ch)) >= 0) return 80 + i;
  if (ch === '¼' || ch === '½' || ch === '¾') return DIGIT0 + 0.5;
  if (cp >= 0xa1 && cp <= 0xbf) return 40 + (cp - 0xa1) / 100; // pontuação Latin-1 restante
  if (cp >= 0x2010 && cp <= 0x2bff) return 90 + (cp - 0x2010) / 10000; // pontuação/símbolos gerais
  if (isCjk(cp)) return CJK + cp;
  // katakana = hiragana no peso principal (SORT mantém a ordem de entrada: "ア", "あ")
  if (lc >= 0x30a1 && lc <= 0x30f6) return OTHER + lc - 0x60;
  return OTHER + lc;
}

/** Elementos de colação de um caractere (null = ignorável: hífen/apóstrofo). */
function charElements(ch: string): { p: number[]; s: number[]; t: number[] } | null {
  const cp = ch.codePointAt(0)!;
  const hit = charCache.get(cp);
  if (hit !== undefined) return hit;
  let r: { p: number[]; s: number[]; t: number[] } | null;
  if (ch === '-' || ch === "'" || cp === 0xad || cp === 0x2010 || cp === 0x2011) r = null;
  else if (cp < 128 || CURRENCY.includes(ch) || MATH.includes(ch) || MISC.includes(ch) || '¼½¾'.includes(ch)) r = { p: [basePrimary(ch)], s: [0], t: [0] };
  else if (SPECIAL[ch]) {
    const [base, sec] = SPECIAL[ch]!;
    r = { p: [...base].map(basePrimary), s: [...base].map((_, i) => (i === 0 ? sec : 0)), t: [...base].map(() => 0) };
  } else {
    const d = ch.normalize('NFKD');
    const p: number[] = [], s: number[] = [], t: number[] = [];
    // largura total/meia (FF00–FFEF) difere da forma comum no 3º nível; ligaduras não (ﬁ = fi)
    const compat = cp >= 0xff00 && cp <= 0xffef;
    for (const c of d) {
      const ccp = c.codePointAt(0)!;
      if (ccp >= 0x300 && ccp <= 0x36f) {
        if (p.length) s[s.length - 1] = s[s.length - 1]! * 32 + (MARK[ccp] ?? 20 + (ccp - 0x300));
        continue;
      }
      p.push(basePrimary(c));
      s.push(0);
      const k = c.codePointAt(0)!;
      t.push(k >= 0x30a1 && k <= 0x30fa ? (compat ? 1 : 2) : k >= 0x3041 && k <= 0x3096 ? 3 : compat ? 4 : 0);
    }
    if (!p.length) { p.push(basePrimary(ch)); s.push(0); t.push(0); }
    r = { p, s, t };
  }
  charCache.set(cp, r);
  return r;
}

const keyCache = new Map<string, Key>();

function keyOf(text: string): Key {
  const hit = keyCache.get(text);
  if (hit) return hit;
  const p: number[] = [], s: number[] = [], t: number[] = [], sp: [number, number][] = [];
  let pos = 0;
  for (const ch of text) {
    // hífen suave some de vez ("a­b" = "ab"; medido pelo CORE)
    if (ch === '­') continue;
    const e = charElements(ch);
    if (e === null) sp.push([pos, ch === "'" ? 1 : 2]);
    else for (let i = 0; i < e.p.length; i++) { p.push(e.p[i]!); s.push(e.s[i]!); t.push(e.t[i]!); }
    pos++;
  }
  const k: Key = { p, s, t, sp };
  if (keyCache.size > 20000) keyCache.clear();
  keyCache.set(text, k);
  return k;
}

function cmpSeq(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i]! < b[i]! ? -1 : 1;
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}

/** Compara dois textos como o Excel (-1, 0, 1). */
export function compareText(a: string, b: string): number {
  if (a === b) return 0;
  const ka = keyOf(a), kb = keyOf(b);
  const c1 = cmpSeq(ka.p, kb.p);
  if (c1) return c1;
  const c2 = cmpSeq(ka.s, kb.s);
  if (c2) return c2;
  const c3 = cmpSeq(ka.t, kb.t);
  if (c3) return c3;
  // ignoráveis: sem nenhum vem antes; depois, o que os tem mais à direita
  const x = ka.sp, y = kb.sp;
  if (!x.length || !y.length) return x.length === y.length ? 0 : x.length ? 1 : -1;
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i++) {
    if (x[i]![0] !== y[i]![0]) return x[i]![0] > y[i]![0] ? -1 : 1;
    if (x[i]![1] !== y[i]![1]) return x[i]![1] < y[i]![1] ? -1 : 1;
  }
  return x.length === y.length ? 0 : x.length < y.length ? -1 : 1;
}

/** Igualdade do operador "=" e de UNIQUE (colação: "ß" = "ss", "a" ≠ "á"). */
export function textCollateEqual(a: string, b: string): boolean {
  return compareText(a, b) === 0;
}

/** Chave textual da colação: chaves iguais ⇔ compareText(a, b) = 0 (UNIQUE/GROUPBY em hash). */
export function collationKey(text: string): string {
  const k = keyOf(text);
  return `${k.p.join(',')}|${k.s.join(',')}|${k.t.join(',')}|${k.sp.map((x) => x.join(':')).join(',')}`;
}

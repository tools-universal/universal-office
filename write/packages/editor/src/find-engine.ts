/**
 * LOCALIZAR E SUBSTITUIR como o do Word — o que casa e o que a substituição grava, medido
 * no Word (write/tools/home-lab exp-find.ps1, results/find):
 *  - sem "Diferenciar maiúsculas": a busca ignora a caixa (com acentos: "ação" acha "AÇÃO",
 *    mas não "acao"); o texto novo ADAPTA a caixa ao encontrado — todo em maiúsculas → o novo
 *    em maiúsculas; 1ª letra maiúscula → a 1ª do novo maiúscula; senão como digitado (só sobe);
 *  - palavras inteiras: letras e dígitos são da palavra; "_" e o apóstrofo depois não ("cat's",
 *    "cat_x" acham "cat"); com espaço no texto procurado a opção não vale (o Word a desliga);
 *  - prefixo/sufixo: início/fim de palavra ("cat's" não termina em "cat");
 *  - ignorar pontuação/espaços: entre as letras do texto procurado pode haver pontuação
 *    (",.-;") / espaços e tabulações; o que o texto procurado tem é literal (espaço = 1 ou mais);
 *  - curingas (sempre diferenciam a caixa): ? (qualquer, até ¶), * (o menor trecho, atravessa
 *    parágrafos), @ (1 ou mais, o MENOR), {n}, {n;} e {n;m} (o maior — no pt-BR o separador é
 *    ";"; aqui "," também vale), < e > (início/fim de palavra), [a-z], [!…], (…) e \1 no texto
 *    novo, \ escapa; ^13 = ¶;
 *  - caracteres especiais: ^p ^t ^l ^m ^n ^b ^s ^- ^~ ^+ ^= ^f ^e ^g ^d ^w (espaços, tabs e
 *    NBSP seguidos) ^? (qualquer, menos o hífen opcional) ^# ^$ ^^ ^nnn; no texto novo também
 *    ^& (o encontrado) e ^c (a área de transferência);
 *  - formatação: o trecho inteiro tem de tê-la; sem texto, cada trecho contínuo que a tem (o
 *    estilo de parágrafo pega o parágrafo inteiro com a marca). O texto novo leva a formatação do
 *    1º caractere encontrado + a da substituição (negrito + itálico = os dois);
 *  - "soa como" (inglês): as chaves Metaphone iguais (Smith = Smyth = Smithe ≠ Smit; night =
 *    knight = nite); "todas as formas" (inglês): go/went/gone/going/goes, mouse/mice,
 *    good/better/best… — só no texto em inglês (em pt-BR o Word acha só a palavra).
 */
import type { Paragraph, Run, RunProps } from '@universal-office/docx-core';

/** Formatação procurada (ou aplicada na substituição). */
export interface FindFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  doubleStrike?: boolean;
  allCaps?: boolean;
  smallCaps?: boolean;
  hidden?: boolean;
  vertAlign?: 'superscript' | 'subscript' | null;
  /** família (fonte latina) */
  font?: string;
  sizePt?: number;
  /** RRGGBB */
  color?: string;
  /** com realce (qualquer cor) / sem realce */
  highlight?: boolean;
  /** estilo de caractere (id) */
  charStyle?: string;
  /** estilo de parágrafo (id) */
  paraStyle?: string;
}

export interface FindQuery {
  text: string;
  matchCase?: boolean;
  wholeWord?: boolean;
  wildcards?: boolean;
  soundsLike?: boolean;
  allForms?: boolean;
  prefix?: boolean;
  suffix?: boolean;
  ignorePunct?: boolean;
  ignoreSpace?: boolean;
  format?: FindFormat;
}

export class FindError extends Error {
  constructor(readonly code: 'pattern' | 'special', message: string) { super(message); }
}

/** Texto de uma sequência de parágrafos para a busca: cada caractere do modelo vira UM
 *  caractere (objetos, notas e excluídos trocados por marcas), e cada parágrafo termina com a
 *  marca ¶ (\r; \u001D na quebra de seção). */
export interface StoryText {
  text: string;
  /** início de cada parágrafo no texto */
  starts: number[];
  paras: readonly Paragraph[];
  /** run de cada caractere (null na marca de parágrafo) */
  runs: (Run | null)[];
}

const PARA = '\r';
const SECT = '\u001D';
const FOOTNOTE = '\u0002';
const ENDNOTE = '\u0004';
const GRAPHIC = '\u0001';
const DELETED = '\u0000';

export function storyText(paras: readonly Paragraph[]): StoryText {
  let text = '';
  const starts: number[] = [];
  const runs: (Run | null)[] = [];
  for (const p of paras) {
    starts.push(text.length);
    for (const r of p.runs) {
      const n = r.text.length;
      if (!n) continue;
      let t = r.text;
      if (r.props.del) t = DELETED.repeat(n);
      else if (r.noteRef) t = (r.noteRef.kind === 'endnote' ? ENDNOTE : FOOTNOTE).repeat(n);
      else if (r.image || r.shape || r.group || r.textbox) t = GRAPHIC.repeat(n);
      else if (r.custom) t = '\uFFFC'.repeat(n);
      text += t;
      for (let k = 0; k < n; k++) runs.push(r);
    }
    text += p.props.sectionBreak ? SECT : PARA;
    runs.push(null);
  }
  return { text, starts, paras, runs };
}

/** Posição (parágrafo, deslocamento) de um índice do texto da busca. */
export function posOf(st: StoryText, g: number): { para: number; offset: number } {
  let lo = 0, hi = st.starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (st.starts[mid]! <= g) lo = mid; else hi = mid - 1;
  }
  return { para: lo, offset: g - st.starts[lo]! };
}

const esc = (c: string): string => c.replace(/[\\^$.*+?()[\]{}|/-]/g, (m) => `\\${m}`);

/** Caractere de ^nnn (decimal; com 0 à esquerda, a página ANSI do Windows) ou ^unnnn. */
const CP1252: Record<number, number> = { 128: 0x20ac, 130: 0x201a, 131: 0x192, 132: 0x201e, 133: 0x2026, 134: 0x2020, 135: 0x2021, 136: 0x2c6, 137: 0x2030, 138: 0x160, 139: 0x2039, 140: 0x152, 142: 0x17d, 145: 0x2018, 146: 0x2019, 147: 0x201c, 148: 0x201d, 149: 0x2022, 150: 0x2013, 151: 0x2014, 152: 0x2dc, 153: 0x2122, 154: 0x161, 155: 0x203a, 156: 0x153, 158: 0x17e, 159: 0x178 };

/** Os especiais do Word (^x) → classe/trecho de expressão regular; null se não é especial. */
function special(code: string, wild: boolean): { re: string; consumed: number } | null {
  const c = code[0];
  if (c === undefined) return null;
  const num = /^(u?)(\d{1,5})/.exec(code);
  if (num) {
    let n = parseInt(num[2]!, 10);
    if (!num[1] && num[2]!.startsWith('0') && CP1252[n]) n = CP1252[n]!;
    if (n === 13) return { re: `[${PARA}${SECT}]`, consumed: num[0].length };
    if (n === 12) return { re: '\\f', consumed: num[0].length };
    if (n === 11) return { re: '[\\n\\u2028]', consumed: num[0].length };
    if (n === 14) return { re: '\\u000B', consumed: num[0].length };
    if (n === 30) return { re: '\\u2011', consumed: num[0].length };
    if (n === 31) return { re: '\\u00AD', consumed: num[0].length };
    return { re: esc(String.fromCodePoint(n)), consumed: num[0].length };
  }
  const table: Record<string, string> = {
    p: PARA, t: '\\t', l: '[\\n\\u2028]', m: '\\f', n: '\\u000B', b: SECT, s: '\\u00A0', '-': '\\u00AD', '~': '\\u2011',
    '+': '\\u2014', '=': '\\u2013', f: FOOTNOTE, e: ENDNOTE, g: GRAPHIC, '^': '\\^',
  };
  if (table[c] !== undefined) return { re: table[c]!, consumed: 1 };
  if (!wild) {
    if (c === 'w') return { re: '[ \\t\\u00A0]+', consumed: 1 };
    if (c === '?') return { re: `[^${PARA}${SECT}\\u00AD${DELETED}]`, consumed: 1 };
    if (c === '#') return { re: '[0-9]', consumed: 1 };
    if (c === '$') return { re: '\\p{L}', consumed: 1 };
  }
  return null;
}

const WORD = '[\\p{L}\\p{N}]';

/** Tokens do texto procurado (modo normal): cada um um trecho de regex; `lit` = o caractere. */
function plainTokens(text: string): { re: string; lit?: string }[] {
  const out: { re: string; lit?: string }[] = [];
  for (let i = 0; i < text.length;) {
    const ch = text[i]!;
    if (ch === '^') {
      const sp = special(text.slice(i + 1), false);
      if (!sp) throw new FindError('special', `^${text[i + 1] ?? ''}`);
      out.push({ re: sp.re });
      i += 1 + sp.consumed;
      continue;
    }
    const cp = text.codePointAt(i)!;
    const s = String.fromCodePoint(cp);
    out.push({ re: esc(s), lit: s });
    i += s.length;
  }
  return out;
}

/** Curingas do Word → regex (sempre diferenciando a caixa). */
export function wildcardRegex(pat: string): string {
  const atoms: string[] = [];
  let depth = 0;
  const fail = (): never => { throw new FindError('pattern', pat); };
  for (let i = 0; i < pat.length;) {
    const ch = pat[i]!;
    if (ch === '\\') {
      const nx = pat[i + 1];
      if (nx === undefined) fail();
      atoms.push(esc(nx!));
      i += 2;
    } else if (ch === '?') { atoms.push('[^]'); i++; }
    else if (ch === '*') { atoms.push('[^]*?'); i++; }
    else if (ch === '@') {
      const last = atoms.pop();
      if (last === undefined || /^\(\?[<!=]/.test(last)) fail();
      atoms.push(`(?:${last!})+?`);
      i++;
    } else if (ch === '{') {
      const m = /^\{(\d+)(?:([,;])(\d*))?\}/.exec(pat.slice(i));
      const last = atoms.pop();
      if (!m || last === undefined) fail();
      const lo = m![1]!, hi = m![2] ? m![3] ?? '' : lo;
      if (hi !== '' && parseInt(hi, 10) < parseInt(lo, 10)) fail();
      atoms.push(`(?:${last!}){${lo}${m![2] ? `,${hi}` : ''}}`);
      i += m![0].length;
    } else if (ch === '<') { atoms.push(`(?<!${WORD})(?=${WORD})`); i++; }
    else if (ch === '>') { atoms.push(`(?<=${WORD})(?!${WORD})`); i++; }
    else if (ch === '[') {
      const end = pat.indexOf(']', i + 2);
      if (end < 0) fail();
      let body = pat.slice(i + 1, end);
      let neg = false;
      if (body.startsWith('!')) { neg = true; body = body.slice(1); }
      if (!body) fail();
      let cls = '';
      for (let k = 0; k < body.length; k++) {
        let c = body[k]!;
        if (c === '\\' && k + 1 < body.length) c = body[++k]!;
        if (body[k + 1] === '-' && k + 2 < body.length) {
          const to = body[k + 2]!;
          if (to < c) fail();
          cls += `${esc(c)}-${esc(to)}`;
          k += 2;
        } else cls += esc(c);
      }
      atoms.push(`[${neg ? '^' : ''}${cls}]`);
      i = end + 1;
    } else if (ch === '(') { depth++; atoms.push('('); i++; }
    else if (ch === ')') {
      if (!depth) fail();
      depth--;
      // o grupo inteiro vira um átomo (para @ e {n})
      let k = atoms.length - 1, open = 0;
      for (; k >= 0; k--) { if (atoms[k] === ')') open++; if (atoms[k] === '(') { if (!open) break; open--; } }
      const grp = `(${atoms.slice(k + 1).join('')})`;
      atoms.splice(k, atoms.length - k, grp);
      i++;
    } else if (ch === '^') {
      const sp = special(pat.slice(i + 1), true);
      if (!sp) fail();
      atoms.push(sp!.re);
      i += 1 + sp!.consumed;
    } else {
      const s = String.fromCodePoint(pat.codePointAt(i)!);
      atoms.push(esc(s));
      i += s.length;
    }
  }
  if (depth) fail();
  return atoms.join('');
}

/** A expressão do texto procurado com as opções (null: só formatação, ou "soa como"/formas). */
export function compileQuery(q: FindQuery): RegExp | null {
  if (!q.text || (!q.wildcards && q.text === '^d')) return null;
  if (q.wildcards) return new RegExp(wildcardRegex(q.text), 'gu');
  if ((q.soundsLike || q.allForms) && /^[\p{L}']+$/u.test(q.text)) return null;
  const toks = plainTokens(q.text);
  const fill = q.ignorePunct && q.ignoreSpace ? '[\\p{P} \\t]*' : q.ignorePunct ? '\\p{P}*' : q.ignoreSpace ? '[ \\t]*' : '';
  let body = '';
  toks.forEach((t, k) => {
    const isPunct = t.lit !== undefined && /\p{P}/u.test(t.lit);
    const isSpace = t.lit === ' ';
    if (k > 0 && fill && !isPunct && !isSpace && !(toks[k - 1]!.lit === ' ')) body += fill;
    body += isSpace && q.ignoreSpace ? ' +' : t.re;
  });
  const hasSpace = /\s/.test(q.text);
  if (q.wholeWord && !hasSpace) body = `(?<!${WORD})(?:${body})(?!${WORD})`;
  else {
    if (q.prefix) body = `(?<!${WORD})(?:${body})`;
    if (q.suffix) body = `(?:${body})(?![\\p{L}\\p{N}'’])`;
  }
  return new RegExp(body, q.matchCase ? 'gu' : 'giu');
}

// ───────────────────────── formatação ─────────────────────────

/** O run tem a formatação procurada? (o estilo de parágrafo é do parágrafo) */
export function runMatches(r: Run, f: FindFormat): boolean {
  const p: RunProps = r.props;
  if (f.bold !== undefined && !!p.bold !== f.bold) return false;
  if (f.italic !== undefined && !!p.italic !== f.italic) return false;
  if (f.underline !== undefined && !!p.underline !== f.underline) return false;
  if (f.strike !== undefined && !!p.strike !== f.strike) return false;
  if (f.doubleStrike !== undefined && !!p.doubleStrike !== f.doubleStrike) return false;
  if (f.allCaps !== undefined && !!p.allCaps !== f.allCaps) return false;
  if (f.smallCaps !== undefined && !!p.smallCaps !== f.smallCaps) return false;
  if (f.hidden !== undefined && !!p.hidden !== f.hidden) return false;
  if (f.vertAlign !== undefined && (p.vertAlign ?? null) !== f.vertAlign) return false;
  if (f.font !== undefined && (p.fontAscii ?? '').toLowerCase() !== f.font.toLowerCase()) return false;
  if (f.sizePt !== undefined && (p.szHalfPt ?? 22) !== Math.round(f.sizePt * 2)) return false;
  if (f.color !== undefined && (p.color ?? '000000').toUpperCase() !== f.color.toUpperCase()) return false;
  if (f.highlight !== undefined && !!(p.highlight && p.highlight !== 'none') !== f.highlight) return false;
  if (f.charStyle !== undefined && (p.charStyle ?? '') !== f.charStyle) return false;
  return true;
}

const hasRunFormat = (f: FindFormat | undefined): boolean =>
  !!f && Object.entries(f).some(([k, v]) => k !== 'paraStyle' && v !== undefined);

// ───────────────────────── "soa como" e formas ─────────────────────────

/** Chave Metaphone (Lawrence Philips, 1990) de uma palavra em inglês. */
export function metaphone(word: string): string {
  let w = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (!w) return '';
  if (/^(KN|GN|PN|AE|WR)/.test(w)) w = w.slice(1);
  if (w[0] === 'X') w = `S${w.slice(1)}`;
  if (w.startsWith('WH')) w = `W${w.slice(2)}`;
  const V = (c: string | undefined): boolean => !!c && 'AEIOU'.includes(c);
  let out = '';
  for (let i = 0; i < w.length; i++) {
    const c = w[i]!, prev = w[i - 1], next = w[i + 1], next2 = w[i + 2];
    if (c === prev && c !== 'C') continue;
    switch (c) {
      case 'A': case 'E': case 'I': case 'O': case 'U': if (i === 0) out += c; break;
      case 'B': if (!(prev === 'M' && i === w.length - 1)) out += 'B'; break;
      case 'C':
        if (next === 'I' && next2 === 'A') out += 'X';
        else if (next === 'H') { out += prev === 'S' ? 'K' : 'X'; i++; }
        else if (next === 'I' || next === 'E' || next === 'Y') { if (prev !== 'S') out += 'S'; }
        else out += 'K';
        break;
      case 'D': if (next === 'G' && (next2 === 'E' || next2 === 'Y' || next2 === 'I')) { out += 'J'; i++; } else out += 'T'; break;
      case 'G':
        if (next === 'H' && !(i + 2 >= w.length || V(next2))) break; // GH mudo (night)
        if (next === 'N' && (i + 2 === w.length || (w[i + 2] === 'E' && w[i + 3] === 'D' && i + 4 === w.length))) break;
        if (prev === 'G') break;
        out += next === 'I' || next === 'E' || next === 'Y' ? 'J' : 'K';
        if (next === 'H') i++;
        break;
      case 'H': if (V(next) && !'CSPTG'.includes(prev ?? '')) out += 'H'; break;
      case 'K': if (prev !== 'C') out += 'K'; break;
      case 'P': if (next === 'H') { out += 'F'; i++; } else out += 'P'; break;
      case 'Q': out += 'K'; break;
      case 'S':
        if (next === 'H') { out += 'X'; i++; }
        else if (next === 'I' && (next2 === 'O' || next2 === 'A')) out += 'X';
        else out += 'S';
        break;
      case 'T':
        if (next === 'I' && (next2 === 'O' || next2 === 'A')) out += 'X';
        else if (next === 'H') { out += '0'; i++; }
        else if (!(next === 'C' && next2 === 'H')) out += 'T';
        break;
      case 'V': out += 'F'; break;
      case 'W': case 'Y': if (V(next)) out += c; break;
      case 'X': out += 'KS'; break;
      case 'Z': out += 'S'; break;
      default: out += c; // F J L M N R
    }
  }
  return out;
}

/** Formas irregulares do inglês: cada linha é uma família. */
const IRREGULAR = [
  'be am is are was were been being', 'have has had having', 'do does did done doing', 'go goes went gone going',
  'sit sits sat sitting', 'run runs ran running', 'eat eats ate eaten eating', 'see sees saw seen seeing',
  'come comes came coming', 'take takes took taken taking', 'make makes made making', 'get gets got gotten getting',
  'give gives gave given giving', 'know knows knew known knowing', 'think thinks thought thinking',
  'write writes wrote written writing', 'speak speaks spoke spoken speaking', 'buy buys bought buying',
  'bring brings brought bringing', 'begin begins began begun beginning', 'swim swims swam swum swimming',
  'drink drinks drank drunk drinking', 'sing sings sang sung singing', 'fly flies flew flown flying',
  'drive drives drove driven driving', 'ride rides rode ridden riding', 'find finds found finding',
  'tell tells told telling', 'say says said saying', 'pay pays paid paying', 'leave leaves left leaving',
  'feel feels felt feeling', 'keep keeps kept keeping', 'meet meets met meeting', 'stand stands stood standing',
  'understand understands understood understanding', 'teach teaches taught teaching', 'catch catches caught catching',
  'fall falls fell fallen falling', 'forget forgets forgot forgotten forgetting', 'choose chooses chose chosen choosing',
  'break breaks broke broken breaking', 'wear wears wore worn wearing', 'grow grows grew grown growing',
  'draw draws drew drawn drawing', 'show shows showed shown showing', 'lie lies lay lain lying', 'die dies died dying',
  'mouse mice', 'man men', 'woman women', 'child children', 'foot feet', 'tooth teeth', 'goose geese', 'person people',
  'good better best', 'bad worse worst', 'far farther further farthest furthest', 'little less least', 'many more most',
].map((l) => l.split(' '));

const VOWEL = /[aeiou]/;

/** Formas regulares de uma raiz (plural/3ª pessoa, passado, gerúndio, comparativos). */
function regularForms(root: string): string[] {
  const out = [root];
  const last = root.slice(-1), prev = root.slice(-2, -1);
  // -s / -es / -ies
  if (/(s|x|z|ch|sh)$/.test(root)) out.push(`${root}es`);
  else if (last === 'y' && !VOWEL.test(prev)) out.push(`${root.slice(0, -1)}ies`);
  else out.push(`${root}s`);
  // CVC curto dobra a consoante (run → running, stop → stopped)
  const cvc = root.length <= 4 && /[^aeiou][aeiou][bcdfgklmnprstvz]$/.test(root);
  const stem = cvc ? root + last : root;
  if (last === 'e') out.push(`${root}d`, `${root.slice(0, -1)}ing`, `${root}r`, `${root}st`);
  else if (last === 'y' && !VOWEL.test(prev)) out.push(`${root.slice(0, -1)}ied`, `${root}ing`, `${root.slice(0, -1)}ier`, `${root.slice(0, -1)}iest`);
  else out.push(`${stem}ed`, `${stem}ing`, `${stem}er`, `${stem}est`);
  return out;
}

/** Raízes possíveis de uma forma (desfaz as regras acima). */
function rootsOf(w: string): string[] {
  const out = new Set([w]);
  const add = (s: string): void => { if (s.length >= 2) out.add(s); };
  if (w.endsWith('ies')) add(`${w.slice(0, -3)}y`);
  if (w.endsWith('es')) add(w.slice(0, -2));
  if (w.endsWith('s')) add(w.slice(0, -1));
  for (const suf of ['ed', 'ing', 'er', 'est']) {
    if (!w.endsWith(suf)) continue;
    const b = w.slice(0, -suf.length);
    add(b); add(`${b}e`);
    if (b.endsWith('i')) add(`${b.slice(0, -1)}y`);
    if (b.length >= 3 && b.at(-1) === b.at(-2)) add(b.slice(0, -1));
  }
  return [...out];
}

/** Todas as formas (inglês) da palavra procurada. */
export function wordForms(word: string): Set<string> {
  const w = word.toLowerCase();
  const out = new Set<string>([w]);
  for (const fam of IRREGULAR) if (fam.includes(w)) for (const f of fam) out.add(f);
  if (out.size > 1) return out;
  for (const r of rootsOf(w)) for (const f of regularForms(r)) out.add(f);
  return out;
}

// ───────────────────────── busca ─────────────────────────

export interface FindHit {
  /** índices no texto da busca [start, end) */
  start: number;
  end: number;
  /** grupos dos curingas (\1…\9) */
  groups?: string[];
}

export interface FindEnv {
  /** idioma efetivo do run (para "todas as formas", só no inglês) */
  lang?: (run: Run, para: Paragraph) => string;
  /** estilo de parágrafo efetivo */
  paraStyle?: (para: Paragraph) => string | undefined;
}

/** Todas as ocorrências da busca num texto de história, em ordem. */
export function findAll(st: StoryText, q: FindQuery, env: FindEnv = {}): FindHit[] {
  const f = q.format;
  const fmtRuns = hasRunFormat(f);
  const paraOk = (g: number): boolean => {
    if (!f?.paraStyle) return true;
    const p = st.paras[posOf(st, g).para]!;
    return (env.paraStyle?.(p) ?? p.props.styleId) === f.paraStyle;
  };
  const charOk = (g: number): boolean => {
    if (!paraOk(g)) return false;
    if (!fmtRuns) return true;
    const r = st.runs[g];
    // a marca de parágrafo: vale a do parágrafo (o Word a inclui no trecho com formatação)
    if (!r) return true;
    return runMatches(r, f!);
  };
  const out: FindHit[] = [];
  // só formatação: os trechos contínuos (o estilo de parágrafo pega o parágrafo com a marca)
  if (!q.text) {
    if (!f || (!fmtRuns && !f.paraStyle)) return out;
    let s = -1;
    for (let g = 0; g <= st.text.length; g++) {
      const ok = g < st.text.length && st.text[g] !== DELETED && (fmtRuns ? !!st.runs[g] && charOk(g) : paraOk(g));
      if (ok && s < 0) s = g;
      if (!ok && s >= 0) { out.push({ start: s, end: g }); s = -1; }
    }
    return out;
  }
  // ^d: cada campo (o run do campo, com o resultado exibido)
  if (!q.wildcards && q.text === '^d') {
    let g0 = -1;
    for (let g = 0; g <= st.text.length; g++) {
      const r = g < st.text.length ? st.runs[g] : null;
      const isField = !!r && !!(r.field || r.fieldResult || r.fieldBegin || r.formField);
      if (isField && (g0 < 0 || st.runs[g - 1] !== r)) {
        if (g0 >= 0) out.push({ start: g0, end: g });
        g0 = g;
      } else if (!isField && g0 >= 0) { out.push({ start: g0, end: g }); g0 = -1; }
    }
    return out.filter((h) => { for (let g = h.start; g < h.end; g++) if (!charOk(g)) return false; return true; });
  }
  const re = compileQuery(q);
  if (!re) {
    // "soa como" / todas as formas: palavra a palavra
    const key = q.soundsLike ? metaphone(q.text) : '';
    const forms = q.allForms ? wordForms(q.text) : null;
    const wre = /[\p{L}'’]+/gu;
    for (let m = wre.exec(st.text); m; m = wre.exec(st.text)) {
      const w = m[0].replace(/['’]+$/, '');
      if (!w) continue;
      let ok: boolean;
      if (forms) {
        const r = st.runs[m.index];
        const p = st.paras[posOf(st, m.index).para]!;
        const en = !r || !env.lang ? true : /^en\b/i.test(env.lang(r, p));
        ok = en ? forms.has(w.toLowerCase()) : w.toLowerCase() === q.text.toLowerCase();
      } else ok = metaphone(w) === key;
      if (!ok) continue;
      let good = true;
      for (let g = m.index; g < m.index + w.length; g++) if (!charOk(g)) { good = false; break; }
      if (good) out.push({ start: m.index, end: m.index + w.length });
    }
    return out;
  }
  for (let m = re.exec(st.text); m; m = re.exec(st.text)) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    const s = m.index, e = s + m[0].length;
    let good = true;
    for (let g = s; g < e; g++) if (st.text[g] === DELETED || !charOk(g)) { good = false; break; }
    if (!good) continue;
    out.push({ start: s, end: e, ...(m.length > 1 ? { groups: m.slice(1).map((x) => x ?? '') } : {}) });
  }
  return out;
}

// ───────────────────────── substituição ─────────────────────────

/** Caixa do texto novo adaptada ao encontrado (sem "Diferenciar maiúsculas"). */
export function adaptCase(found: string, repl: string): string {
  const letters = found.replace(/[^\p{L}]/gu, '');
  if (!letters) return repl;
  if (letters === letters.toLocaleUpperCase('pt-BR') && letters !== letters.toLocaleLowerCase('pt-BR')) return repl.toLocaleUpperCase('pt-BR');
  const first = letters[0]!;
  if (first === first.toLocaleUpperCase('pt-BR') && first !== first.toLocaleLowerCase('pt-BR')) {
    const i = repl.search(/\p{L}/u);
    return i < 0 ? repl : repl.slice(0, i) + repl[i]!.toLocaleUpperCase('pt-BR') + repl.slice(i + 1);
  }
  return repl;
}

/** Texto novo com os especiais expandidos: \r = parágrafo novo; \f, \n, \t… como no modelo. */
export function expandReplacement(repl: string, found: string, groups: string[] | undefined, wildcards: boolean, clipboard = ''): string {
  let out = '';
  for (let i = 0; i < repl.length;) {
    const ch = repl[i]!;
    if (ch === '\\' && wildcards) {
      const d = repl[i + 1];
      if (d && /[1-9]/.test(d)) { out += groups?.[Number(d) - 1] ?? ''; i += 2; continue; }
      if (d !== undefined) { out += d; i += 2; continue; }
    }
    if (ch === '^') {
      const c = repl[i + 1];
      const map: Record<string, string> = { p: '\r', t: '\t', l: '\n', m: '\f', n: '\u000B', s: '\u00A0', '-': '\u00AD', '~': '\u2011', '+': '\u2014', '=': '\u2013', '^': '^' };
      if (c === '&') { out += found; i += 2; continue; }
      if (c === 'c') { out += clipboard; i += 2; continue; }
      if (c !== undefined && map[c] !== undefined) { out += map[c]; i += 2; continue; }
      const num = /^(u?)(\d{1,5})/.exec(repl.slice(i + 1));
      if (num) {
        let n = parseInt(num[2]!, 10);
        if (!num[1] && num[2]!.startsWith('0') && CP1252[n]) n = CP1252[n]!;
        out += n === 13 ? '\r' : n === 11 ? '\n' : n === 12 ? '\f' : n === 9 ? '\t' : String.fromCodePoint(n);
        i += 1 + num[0].length;
        continue;
      }
    }
    out += ch;
    i++;
  }
  return out;
}

/** O texto encontrado (marcas de volta a caracteres legíveis: ¶ = \r). */
export const foundText = (st: StoryText, h: FindHit): string => st.text.slice(h.start, h.end).replace(/\u001D/g, '\r');

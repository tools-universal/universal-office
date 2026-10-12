import type { MathNode, RPr } from '@universal-office/docx-core';
import { faceMetrics, type FontFace } from './fonts.js';
import type { RunStyle } from './para.js';

/**
 * Equações de exibição (OMML, m:oMathPara) como o Word as diagrama — medido no
 * oráculo omath (Cambria Math, 11/12/16 pt):
 *  - fração de exibição: constantes da tabela MATH da fonte (deslocamento do
 *    numerador e do denominador, eixo, espessura do traço, folgas mínimas) em
 *    unidades de 1/600 pol. arredondadas PARA CIMA (12 pt: 9,082 → 9,12 pt;
 *    8,027 → 8,04; traço 0,779 → 0,84); numerador e denominador centrados na
 *    largura do maior, traço sem sobra, centrado no eixo;
 *  - na linha, a fração mede acima o deslocamento do numerador + a tinta do
 *    numerador + mathLeading; abaixo, o deslocamento EXATO do denominador + a
 *    tinta dele; a entrelinha múltipla vale sobre o texto da linha, não a fração;
 *  - espaço grosso (5/18 em) em volta das relações (=, <…), médio (4/18 em) em
 *    volta dos operadores binários (+, −…) — o operador no início vira unário,
 *    sem espaço; correção de itálico (tabela MATH) da letra itálica antes de um
 *    caractere reto; sem kerning nem ligaduras;
 *  - letras sem m:sty (ou "i") no alfabeto itálico matemático (U+1D434…), "b" e
 *    "bi" no negrito; dígitos e o estilo "p" retos;
 *  - texto com as métricas typo da fonte de matemática (Cambria Math: 1946/455 —
 *    não as win, enormes);
 *  - o PDF grava o numerador, o denominador e depois o resto da linha.
 */

/** Índices das constantes na MathConstants (depois dos 4 campos de 16 bits). */
const K = { leading: 0, axis: 1, numUp: 28, numUpD: 29, denDown: 30, denDownD: 31, numGap: 32, numGapD: 33, rule: 34, denGap: 35, denGapD: 36 } as const;
/** Fonte sem tabela MATH: as proporções da Cambria Math (unidades de 2048). */
const CM: Record<number, number> = { 0: 300, 1: 585, 28: 1200, 29: 1550, 30: 1030, 31: 1370, 32: 133, 33: 260, 34: 133, 35: 133, 36: 260 };

interface FontInfo {
  upm: number;
  /** constantes da MATH (unidades da fonte); null = fonte sem MATH */
  k: number[] | null;
  scriptPct: number;
  /** correção de itálico por glifo (unidades) */
  ital: Map<number, number>;
  /** tinta vertical do glifo [yMin, yMax] (unidades); null = sem contorno */
  box(gid: number): [number, number] | null;
}

const infoCache = new WeakMap<object, FontInfo>();

function fontInfo(face: FontFace): FontInfo {
  let info = infoCache.get(face.font);
  if (!info) {
    info = { upm: face.font.metrics.unitsPerEm || 2048, k: null, scriptPct: 73, ital: new Map(), box: () => null };
    try {
      if (face.bytes) info = parseFont(face.bytes) ?? info;
    } catch {
      // fonte malformada: fica sem MATH nem contornos
    }
    infoCache.set(face.font, info);
  }
  return info;
}

function parseFont(b: Uint8Array): FontInfo | null {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const tables = new Map<string, number>();
  const n = v.getUint16(4);
  for (let i = 0; i < n; i++) {
    const p = 12 + 16 * i;
    tables.set(String.fromCharCode(b[p]!, b[p + 1]!, b[p + 2]!, b[p + 3]!), v.getUint32(p + 8));
  }
  const head = tables.get('head');
  if (head === undefined) return null;
  const upm = v.getUint16(head + 18) || 2048;
  let k: number[] | null = null;
  let scriptPct = 73;
  const ital = new Map<number, number>();
  const m = tables.get('MATH');
  if (m !== undefined) {
    const c = m + v.getUint16(m + 4);
    scriptPct = v.getInt16(c) || 73;
    k = [];
    for (let i = 0; i <= 36; i++) k.push(v.getInt16(c + 8 + 4 * i));
    const gi = m + v.getUint16(m + 6);
    const io = v.getUint16(gi);
    if (io) {
      const ic = gi + io;
      const cov = ic + v.getUint16(ic);
      const cnt = v.getUint16(ic + 2);
      forCoverage(v, cov, (g, idx) => { if (idx < cnt) ital.set(g, v.getInt16(ic + 4 + 4 * idx)); });
    }
  }
  const glyf = tables.get('glyf'), loca = tables.get('loca');
  const longLoca = v.getInt16(head + 50) === 1;
  const box = (gid: number): [number, number] | null => {
    if (glyf === undefined || loca === undefined) return null;
    const at = (i: number) => (longLoca ? v.getUint32(loca + 4 * i) : v.getUint16(loca + 2 * i) * 2);
    const s = at(gid), e = at(gid + 1);
    if (e <= s || glyf + s + 10 > b.byteLength) return null;
    return [v.getInt16(glyf + s + 4), v.getInt16(glyf + s + 8)];
  };
  return { upm, k, scriptPct, ital, box };
}

/** Percorre uma Coverage (formatos 1 e 2): glifo → índice. */
function forCoverage(v: DataView, at: number, fn: (gid: number, idx: number) => void): void {
  const fmt = v.getUint16(at), cnt = v.getUint16(at + 2);
  for (let i = 0; i < cnt; i++) {
    if (fmt === 1) fn(v.getUint16(at + 4 + 2 * i), i);
    else {
      const s = v.getUint16(at + 4 + 6 * i), e = v.getUint16(at + 6 + 6 * i), si = v.getUint16(at + 8 + 6 * i);
      for (let g = s; g <= e; g++) fn(g, si + g - s);
    }
  }
}

/** Constante (fração do em) — a da fonte, ou a proporção da Cambria Math. */
function kEm(info: FontInfo, i: number): number {
  return info.k ? info.k[i]! / info.upm : CM[i]! / 2048;
}

/** Arredonda para cima em unidades de 1/600 pol. (2,4 twips). */
const q600 = (tw: number): number => Math.ceil(tw / 2.4 - 1e-6) * 2.4;

/** Métricas verticais do texto da equação (frações do em): typo da fonte de matemática. */
export function mathTextMetrics(face: FontFace): { ascent: number; descent: number } {
  const info = fontInfo(face);
  const fm = face.font.metrics;
  if (info.k && fm.sTypoAscender > 0) {
    const u = fm.unitsPerEm || 2048;
    return { ascent: (fm.sTypoAscender + Math.max(0, fm.sTypoLineGap)) / u, descent: -fm.sTypoDescender / u };
  }
  const m = faceMetrics(face.font);
  return { ascent: m.ascent, descent: m.descent };
}

type Cls = 'ord' | 'bin' | 'rel' | 'open' | 'close';
const REL = new Set(Array.from('=<>≤≥≠≈≡∼≃≅∝←→↔⇐⇒⇔∈∉∋⊂⊃⊆⊇≪≫≔').map((c) => c.codePointAt(0)!));
const BIN = new Set(Array.from('+-−±∓×÷·∗∘∙∩∪∧∨⊕⊗⊖*').map((c) => c.codePointAt(0)!));
const OPEN = new Set(Array.from('([{⟨⌈⌊').map((c) => c.codePointAt(0)!));
const CLOSE = new Set(Array.from(')]}⟩⌉⌋').map((c) => c.codePointAt(0)!));
const clsOf = (cp: number): Cls => (REL.has(cp) ? 'rel' : BIN.has(cp) ? 'bin' : OPEN.has(cp) ? 'open' : CLOSE.has(cp) ? 'close' : 'ord');

/** Letra no alfabeto matemático do estilo m:sty (undefined/"i" itálico, "b", "bi", "p"). */
function mathAlpha(cp: number, sty: string | undefined): number {
  const up = cp >= 0x41 && cp <= 0x5a, lo = cp >= 0x61 && cp <= 0x7a;
  const s = sty ?? 'i';
  if (s === 'i') {
    if (cp === 0x68) return 0x210e; // ℎ (o itálico "h" fica no bloco de letras)
    if (up) return 0x1d434 + cp - 0x41;
    if (lo) return 0x1d44e + cp - 0x61;
    if (cp >= 0x3b1 && cp <= 0x3c9) return 0x1d6fc + cp - 0x3b1;
  } else if (s === 'b') {
    if (up) return 0x1d400 + cp - 0x41;
    if (lo) return 0x1d41a + cp - 0x61;
    if (cp >= 0x30 && cp <= 0x39) return 0x1d7ce + cp - 0x30;
  } else if (s === 'bi') {
    if (up) return 0x1d468 + cp - 0x41;
    if (lo) return 0x1d482 + cp - 0x61;
  }
  return cp;
}

export interface MathItem { cp: number; x: number; y: number; face: FontFace; sizePt: number; style: RunStyle }
/** Caixa diagramada (twips): itens com x a partir da borda esquerda e y relativo à
 *  baseline (+ desce); traços; tinta acima/abaixo; e a altura que a linha recebe. */
export interface MathBox {
  w: number;
  items: MathItem[];
  rules: { x: number; y: number; w: number; h: number; color: string }[];
  top: number;
  bottom: number;
  lineTop: number;
  lineBottom: number;
}

export interface MathAtom {
  /** char: um glifo; frac: caixa da fração */
  kind: 'char' | 'frac';
  cp: number;
  face: FontFace;
  sizePt: number;
  style: RunStyle;
  /** avanço (twips) já com o espaço até o átomo seguinte */
  adv: number;
  box?: MathBox;
  /** índice do caractere no texto achatado do run */
  offset: number;
}

export interface MathEnv {
  /** cascata do w:rPr de um m:r → rPr final e estilo resolvido */
  styleOf(rpr: RPr | undefined): { rpr: RPr; style: RunStyle };
  /** face da fonte de matemática */
  face(bold: boolean, italic: boolean): FontFace;
  /** avanço (twips) do caractere na face */
  adv(face: FontFace, cp: number, sizePt: number): number;
  /** kerning (twips) do par na face */
  kern(face: FontFace, cp: number, next: number, sizePt: number): number;
}

/** Nível de estilo: D exibição, T texto, S índice (corpo reduzido). */
type Lvl = 'D' | 'T' | 'S';

interface RawAtom extends MathAtom { cls: Cls; ital: number; italic: boolean; top: number; bottom: number }

/**
 * Átomos de uma linha da equação, com os espaços entre eles somados ao avanço do
 * anterior. off = contador do índice no texto achatado (avança com os m:t).
 */
export function mathAtoms(env: MathEnv, nodes: MathNode[], lvl: Lvl = 'D', scale = 1, off = { n: 0 }): MathAtom[] {
  const atoms: RawAtom[] = [];
  for (const nd of nodes) {
    if (nd.t === 'br') continue;
    if (nd.t === 'f') {
      const o0 = off.n;
      const fb = fracBox(env, nd, lvl, scale, off);
      const st = env.styleOf(undefined);
      atoms.push({ kind: 'frac', cp: 0xfffc, face: env.face(false, false), sizePt: st.style.sizePt * scale, style: st.style, adv: fb.w, box: fb, offset: o0, cls: 'ord', ital: 0, italic: false, top: fb.top, bottom: fb.bottom });
      continue;
    }
    const { style } = env.styleOf(nd.rpr);
    const size = style.sizePt * scale;
    const bold = nd.sty === 'b' || nd.sty === 'bi';
    for (const ch of Array.from(nd.text)) {
      const cp0 = ch.codePointAt(0)!;
      let cp = mathAlpha(cp0, nd.sty);
      let face = env.face(bold && cp === cp0, false);
      // fonte sem o alfabeto matemático: a letra comum, em itálico
      if (cp !== cp0 && face.font.glyphId(cp) === 0) { face = env.face(bold, nd.sty !== 'b'); cp = cp0; }
      const info = fontInfo(face);
      const gid = face.font.glyphId(cp);
      const bx = info.box(gid);
      const em = (size * 20) / info.upm;
      const italic = cp !== cp0 && nd.sty !== 'b';
      atoms.push({
        kind: 'char', cp, face, sizePt: size, style, adv: env.adv(face, cp, size), offset: off.n,
        cls: clsOf(cp0), ital: italic ? (info.ital.get(gid) ?? 0) * em : 0, italic,
        top: bx ? Math.max(0, bx[1]) * em : 0, bottom: bx ? Math.max(0, -bx[0]) * em : 0,
      });
      off.n += ch.length;
    }
  }
  // operador binário no início, depois de outro operador, relação ou abertura, ou
  // no fim: unário (sem espaço)
  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i]!;
    if (a.cls !== 'bin') continue;
    const pv = atoms[i - 1]?.cls, nx = atoms[i + 1]?.cls;
    if (!pv || pv === 'bin' || pv === 'rel' || pv === 'open' || !nx || nx === 'rel' || nx === 'close') a.cls = 'ord';
  }
  const emTw = (a: RawAtom) => a.sizePt * 20;
  for (let i = 0; i + 1 < atoms.length; i++) {
    const a = atoms[i]!, b = atoms[i + 1]!;
    // kerning (w:kern) entre caracteres vizinhos da mesma face e corpo
    const kern = a.style.rpr.kern;
    if (kern && a.kind === 'char' && b.kind === 'char' && a.face === b.face && a.sizePt === b.sizePt && a.sizePt * 2 >= kern) a.adv += env.kern(a.face, a.cp, b.cp, a.sizePt);
    // correção de itálico antes de caractere reto
    if (a.italic && !b.italic) a.adv += a.ital;
    if (lvl === 'S') continue; // nos índices o Word não espaça os operadores
    let sp = 0;
    if ((a.cls === 'rel') !== (b.cls === 'rel') && a.cls !== 'open' && b.cls !== 'close') sp = 5 / 18;
    else if ((a.cls === 'bin' || b.cls === 'bin') && a.cls !== 'open') sp = 4 / 18;
    if (sp) a.adv += sp * emTw(a.cls === 'ord' || a.cls === 'close' ? b : a);
  }
  return atoms;
}

/** Linha de átomos → caixa (x acumulado a partir de 0, baseline em y = 0). */
function rowBox(atoms: MathAtom[]): MathBox {
  const box: MathBox = { w: 0, items: [], rules: [], top: 0, bottom: 0, lineTop: 0, lineBottom: 0 };
  let x = 0;
  for (const a of atoms as RawAtom[]) {
    if (a.kind === 'frac' && a.box) {
      for (const it of a.box.items) box.items.push({ ...it, x: it.x + x });
      for (const r of a.box.rules) box.rules.push({ ...r, x: r.x + x });
    } else if (a.cp !== 0x20) {
      box.items.push({ cp: a.cp, x, y: 0, face: a.face, sizePt: a.sizePt, style: a.style });
    }
    box.top = Math.max(box.top, a.top);
    box.bottom = Math.max(box.bottom, a.bottom);
    x += a.adv;
  }
  box.w = x;
  return box;
}

/** Fração (m:f): numerador e denominador centrados, traço no eixo. */
function fracBox(env: MathEnv, f: Extract<MathNode, { t: 'f' }>, lvl: Lvl, scale: number, off: { n: number }): MathBox {
  const face = env.face(false, false);
  const info = fontInfo(face);
  const st = env.styleOf(undefined).style;
  const display = lvl === 'D';
  // numerador/denominador: na exibição, estilo de texto (mesmo corpo); senão, de índice
  const inner: Lvl = display ? 'T' : 'S';
  const iscale = display ? scale : scale * (info.scriptPct / 100);
  const num = rowBox(mathAtoms(env, f.num, inner, iscale, off));
  const den = rowBox(mathAtoms(env, f.den, inner, iscale, off));
  // corpo da fração: o do primeiro caractere de dentro (desfeita a redução), ou o da zona
  const first = num.items[0] ?? den.items[0];
  const size = first ? first.sizePt * (scale / iscale) : st.sizePt * scale;
  const em = size * 20;
  const c = (i: number) => kEm(info, i) * em;
  const axis = c(K.axis), rule = c(K.rule);
  const noBar = f.type === 'noBar';
  const ruleQ = noBar ? 0 : q600(rule);
  let numShift = c(display ? K.numUpD : K.numUp);
  let denShift = c(display ? K.denDownD : K.denDown);
  // folgas mínimas entre a tinta e o traço
  numShift = Math.max(numShift, axis + rule / 2 + c(display ? K.numGapD : K.numGap) + num.bottom);
  denShift = Math.max(denShift, den.top + c(display ? K.denGapD : K.denGap) - (axis - rule / 2));
  const numQ = q600(numShift), denQ = q600(denShift);
  const w = Math.max(num.w, den.w);
  const nx = (w - num.w) / 2, dx = (w - den.w) / 2;
  const box: MathBox = {
    w,
    items: [
      ...num.items.map((it) => ({ ...it, x: it.x + nx, y: it.y - numQ })),
      ...den.items.map((it) => ({ ...it, x: it.x + dx, y: it.y + denQ })),
    ],
    rules: [
      ...num.rules.map((r) => ({ ...r, x: r.x + nx, y: r.y - numQ })),
      ...den.rules.map((r) => ({ ...r, x: r.x + dx, y: r.y + denQ })),
    ],
    top: numQ + num.top,
    bottom: denQ + den.bottom,
    lineTop: numQ + num.top + c(K.leading),
    lineBottom: denShift + den.bottom,
  };
  if (!noBar) box.rules.push({ x: 0, y: -(axis + ruleQ / 2), w, h: ruleQ, color: st.color });
  return box;
}

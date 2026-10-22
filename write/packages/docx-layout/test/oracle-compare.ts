// Comparação motor × Word (oráculo): extrai as linhas da árvore de layout do
// mesmo jeito que tools/corpus-lab/pdftext.py extrai do PDF do Word (texto sem
// brancos, baseline e x) e casa linha a linha.
import type { LayoutResult } from '../src/index.js';

export interface OracleLine { y: number; x0: number; x1: number; size: number; text: string }
export interface OraclePage { w: number; h: number; lines: OracleLine[] }
export interface OracleDoc { pages: OraclePage[] }

const PUA_BULLETS = new Set([0xf0b7, 0xf0a7, 0xf0d8, 0xf0fc, 0xf076, 0xf0a8, 0xf06e, 0xf0e0, 0xf0a1]);
const BULLETS = new Set([0x2022, 0x25aa, 0x25cf, 0x25e6, 0x2023, 0x2043, 0x25a0, 0x25a1, 0x2219, 0x00b7, 0x27a2, 0x2713, 0x2714, 0x25c6, 0x25c7, 0x2756, 0x00a7, 0x2192, 0x27a4]);

export function normChar(cp: number): string {
  if (PUA_BULLETS.has(cp) || BULLETS.has(cp) || (cp >= 0xf020 && cp <= 0xf0ff)) return '•';
  if (cp === 0xa0 || cp === 0x2007 || cp === 0x202f) return ' ';
  if (cp === 0xad) return '';
  if ([0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2212].includes(cp)) return '-';
  if ([0x2018, 0x2019, 0x201a, 0x2032].includes(cp)) return "'";
  if ([0x201c, 0x201d, 0x201e, 0x2033].includes(cp)) return '"';
  if (cp === 0x2026) return '...';
  if (cp === 0xfb01) return 'fi';
  if (cp === 0xfb02) return 'fl';
  return String.fromCodePoint(cp);
}

/** Linha de texto GIRADO (caixa vertical) como a extração do PDF (pdftext.page_vlines):
 *  x = linha de base na página, y0/y1 = origem do 1º e do último caractere, ângulo. */
export interface OracleVLine { x: number; y0: number; y1: number; angle: number; size: number; text: string }

type M6 = [number, number, number, number, number, number];
const mul = (m: M6, n: M6): M6 => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];

/** Linhas giradas da árvore de layout (pt): glifos dentro de xform com giro de 90/270°. */
export function engineVLines(res: LayoutResult): OracleVLine[][] {
  return res.pages.map((p) => {
    const out: OracleVLine[] = [];
    const stack: M6[] = [];
    let m: M6 = [1, 0, 0, 1, 0, 0];
    let cur: OracleVLine | null = null;
    for (const it of p.items) {
      if (it.t === 'xform') {
        if (it.op === 'push') { stack.push(m); m = mul(m, it.m ?? [1, 0, 0, 1, 0, 0]); } else m = stack.pop() ?? [1, 0, 0, 1, 0, 0];
        continue;
      }
      if (it.t !== 'glyphs' || it.asPath) continue;
      const ang = Math.round((Math.atan2(m[1], m[0]) * 180) / Math.PI + 360) % 360;
      if (ang === 0) continue;
      for (const g of it.glyphs) {
        const ch = normChar(g.cp);
        if (!ch || /\s/.test(ch) || g.cp > 0xffff) continue;
        const px = (m[0] * g.x + m[2] * it.y + m[4]) / 20, py = (m[1] * g.x + m[3] * it.y + m[5]) / 20;
        const size = Math.round(it.sizePt / 0.12) * 0.12;
        if (cur && cur.angle === ang && Math.abs(px - cur.x) <= Math.max(1, 0.3 * size)) {
          cur.text += ch;
          cur.y0 = Math.min(cur.y0, py); cur.y1 = Math.max(cur.y1, py);
        } else {
          cur = { x: px, y0: py, y1: py, angle: ang, size, text: ch };
          out.push(cur);
        }
      }
    }
    return out;
  });
}

/** Casa as linhas giradas por texto (na ordem) e mede Δx (linha de base) e Δy0 (início). */
export function compareVLines(word: OracleVLine[][], ours: OracleVLine[][]): { n: number; matched: number; maxDx: number; maxDy: number; firstDiff?: string } {
  let n = 0, matched = 0, maxDx = 0, maxDy = 0;
  let firstDiff: string | undefined;
  word.forEach((wl, pi) => {
    const ol = [...(ours[pi] ?? [])];
    for (const w of wl) {
      n++;
      const k = ol.findIndex((o) => o.text === w.text && o.angle === w.angle && Math.abs(o.x - w.x) < 6 && Math.abs(o.y0 - w.y0) < 6);
      const o = k >= 0 ? ol.splice(k, 1)[0]! : undefined;
      if (!o) { firstDiff ??= `p${pi + 1} x=${w.x.toFixed(1)} ${w.angle}° "${w.text.slice(0, 30)}"`; continue; }
      matched++;
      // y0 = o início da linha (a origem mais alta para 90°, a mais baixa para 270°)
      const ws = w.angle === 270 ? w.y1 : w.y0, os = o.angle === 270 ? o.y1 : o.y0;
      maxDx = Math.max(maxDx, Math.abs(o.x - w.x));
      maxDy = Math.max(maxDy, Math.abs(os - ws));
    }
  });
  return { n, matched, maxDx, maxDy, ...(firstDiff ? { firstDiff } : {}) };
}

type GlyphsRun = Extract<LayoutResult['pages'][number]['items'][number], { t: 'glyphs' }>;
/** Avanço (pt) do caractere no item de glifos (0 sem a métrica). */
function glyphAdvancePt(it: GlyphsRun, cp: number): number {
  try {
    const f = it.face.font;
    return (f.advanceWidth(f.glyphId(cp)) * it.sizePt * (it.scaleX ?? 1)) / f.metrics.unitsPerEm;
  } catch { return 0; }
}

/** Linhas da árvore de layout (pt), agrupando glifos por baseline na ordem dos itens.
 *  `skipRotated`: glifos em xform girado ficam de fora (vão em engineVLines). */
export function engineLines(res: LayoutResult, skipRotated = false): OracleDoc {
  return {
    pages: res.pages.map((p) => {
      const lines: OracleLine[] = [];
      const lastCp: number[] = [];
      let cur: OracleLine | null = null;
      const rotStack: boolean[] = [];
      let rotated = false;
      for (const it of p.items) {
        if (skipRotated && it.t === 'xform') {
          if (it.op === 'push') { rotStack.push(rotated); rotated = rotated || (!!it.m && Math.abs(it.m[1]) > 0.5); } else rotated = rotStack.pop() ?? false;
          continue;
        }
        if (rotated) continue;
        // curvas (WordArt, texto semitransparente, emoji colorido, caixa girada):
        // não é texto no PDF — nem no do Word
        if (it.t !== 'glyphs' || it.asPath) continue;
        const y = it.y / 20;
        for (const g of it.glyphs) {
          const ch = normChar(g.cp);
          // fora do BMP (itálico matemático, emoji…): o pdfium devolve pares substitutos,
          // que a extração descarta (pdftext.py)
          if (!ch || /\s/.test(ch) || g.cp > 0xffff) continue;
          const x = g.x / 20;
          // corpo como no PDF (múltiplo de 0,12 pt: 10 → 9,96), que decide a tolerância da extração
          const size = Math.round(it.sizePt / 0.12) * 0.12;
          const tol = Math.max(1, 0.3 * size);
          // borda direita como a do pdfium (caixa do caractere): o avanço do glifo — o
          // número de linha seguido de texto recuado para a esquerda dele (recuo
          // negativo) abre outra linha na extração (oráculo lnnum2/ln-indent)
          const right = x + Math.max(1, glyphAdvancePt(it, g.cp));
          if (cur && Math.abs(y - cur.y) <= tol && x >= cur.x1 - tol * 2) {
            cur.text += ch;
            cur.x1 = Math.max(cur.x1, right);
            cur.size = Math.max(cur.size, size);
          } else {
            cur = { y, x0: x, x1: right, size, text: ch };
            lines.push(cur);
          }
          lastCp[lines.length - 1] = g.cp;
        }
      }
      // como o pdfium ao extrair: hífen no fim da linha depois de LETRA some se a
      // linha seguinte começa com letra ou dígito decimal ("guarda-|chuva" →
      // "guarda", "com-|840" → "com"); depois de dígito fica ("12.345-|678"), e
      // antes de pontuação/símbolo/"²" também ("abc-|_def", oráculo dashsym); só o
      // hífen-menos (U+002D) — travessões ficam
      for (let k = 0; k + 1 < lines.length; k++) {
        const t = lines[k]!.text;
        if (t.length > 1 && t.endsWith('-') && lastCp[k] === 0x2d && /\p{L}/u.test(t[t.length - 2]!)
          && /^[\p{L}\p{Nd}]/u.test(lines[k + 1]!.text)) {
          lines[k]!.text = t.slice(0, -1);
        }
      }
      return { w: p.widthTw / 20, h: p.heightTw / 20, lines };
    }),
  };
}

export interface CompareResult {
  pagesW: number;
  pagesO: number;
  linesW: number;
  matched: number;
  samePage: number;
  maxDy: number;
  maxDx: number;
  meanDy: number;
  firstDiff?: string;
  /** linhas NOSSAS sem par no Word (texto que o Word não grava) */
  extraO: number;
  firstExtra?: string;
}

/** Casa as linhas por texto (LCS) e mede Δbaseline/Δx nos pares da mesma página. */
export function compareLines(word: OracleDoc, ours: OracleDoc, exactLeaders = false): CompareResult {
  // preenchimento de tab (pontos/hífens/sublinhados): a contagem exata varia — compara
  // colapsado (exceto nos grupos que medem a grade dos pontos: tdhalfpx)
  const collapse = (t: string) => (exactLeaders ? t : t.replace(/([._\-·])\1{2,}/g, '$1$1$1'));
  const norm = (d: OracleDoc) => d.pages.flatMap((p, pi) => p.lines.map((l) => ({ pi, l: { ...l, text: collapse(l.text) } })));
  const wl = norm(word);
  const ol = norm(ours);
  const n = wl.length, m = ol.length;
  // LCS (O(n·m) — casos do oráculo são pequenos)
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = wl[i]!.l.text === ol[j]!.l.text ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (wl[i]!.l.text === ol[j]!.l.text) { pairs.push([i, j]); i++; j++; }
    else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++;
    else j++;
  }
  let samePage = 0, maxDy = 0, maxDx = 0, sumDy = 0;
  for (const [a, b] of pairs) {
    if (wl[a]!.pi !== ol[b]!.pi) continue;
    samePage++;
    const dy = Math.abs(wl[a]!.l.y - ol[b]!.l.y);
    const dx = Math.abs(wl[a]!.l.x0 - ol[b]!.l.x0);
    maxDy = Math.max(maxDy, dy);
    maxDx = Math.max(maxDx, dx);
    sumDy += dy;
  }
  const matchedW = new Set(pairs.map((p) => p[0]));
  const matchedO = new Set(pairs.map((p) => p[1]));
  const extra = ol.filter((_, k) => !matchedO.has(k));
  let firstDiff: string | undefined;
  for (let k = 0; k < n; k++) {
    if (!matchedW.has(k)) { firstDiff = `p${wl[k]!.pi + 1} y=${wl[k]!.l.y.toFixed(1)} "${wl[k]!.l.text.slice(0, 40)}"`; break; }
  }
  return {
    pagesW: word.pages.length, pagesO: ours.pages.length, linesW: n,
    matched: pairs.length, samePage, maxDy, maxDx, meanDy: samePage ? sumDy / samePage : 0,
    ...(firstDiff ? { firstDiff } : {}),
    extraO: extra.length,
    ...(extra.length ? { firstExtra: `p${extra[0]!.pi + 1} y=${extra[0]!.l.y.toFixed(1)} "${extra[0]!.l.text.slice(0, 40)}"` } : {}),
  };
}

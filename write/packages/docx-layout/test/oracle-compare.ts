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

/** Linhas da árvore de layout (pt), agrupando glifos por baseline na ordem dos itens. */
export function engineLines(res: LayoutResult): OracleDoc {
  return {
    pages: res.pages.map((p) => {
      const lines: OracleLine[] = [];
      let cur: OracleLine | null = null;
      for (const it of p.items) {
        if (it.t !== 'glyphs') continue;
        const y = it.y / 20;
        for (const g of it.glyphs) {
          const ch = normChar(g.cp);
          if (!ch || /\s/.test(ch)) continue;
          const x = g.x / 20;
          const tol = Math.max(1, 0.3 * it.sizePt);
          if (cur && Math.abs(y - cur.y) <= tol && x >= cur.x1 - tol * 2) {
            cur.text += ch;
            cur.x1 = Math.max(cur.x1, x + 1);
            cur.size = Math.max(cur.size, it.sizePt);
          } else {
            cur = { y, x0: x, x1: x + 1, size: it.sizePt, text: ch };
            lines.push(cur);
          }
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
}

/** Casa as linhas por texto (LCS) e mede Δbaseline/Δx nos pares da mesma página. */
export function compareLines(word: OracleDoc, ours: OracleDoc): CompareResult {
  // preenchimento de tab (pontos/hífens/sublinhados): a contagem exata varia — compara colapsado
  const collapse = (t: string) => t.replace(/([._\-·])\1{2,}/g, '$1$1$1');
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
  let firstDiff: string | undefined;
  for (let k = 0; k < n; k++) {
    if (!matchedW.has(k)) { firstDiff = `p${wl[k]!.pi + 1} y=${wl[k]!.l.y.toFixed(1)} "${wl[k]!.l.text.slice(0, 40)}"`; break; }
  }
  return {
    pagesW: word.pages.length, pagesO: ours.pages.length, linesW: n,
    matched: pairs.length, samePage, maxDy, maxDx, meanDy: samePage ? sumDy / samePage : 0,
    ...(firstDiff ? { firstDiff } : {}),
  };
}

/**
 * Formato numérico que a ENTRADA de uma célula aplica, como o Excel 365 pt-BR
 * (medido com FormulaLocal/Formula2Local e SaveAs no lab calc/ui, entry*.json):
 *
 * - digitado numa célula Geral: "1.234" → #,##0 (3); "1.234,5" → #,##0.00 (4);
 *   "1E3" → 0.00E+00 (11); "10%" → 0% (9), "1,5%" → 0.00% (10); "R$ 10" → moeda
 *   (6, gravada com formatCode), "R$10,50" → 8; "1 1/2" → # ?/? (12); datas:
 *   "01/02/2024"/"2024-01-02" → 14, "1-jan-2024" → 15, "1/2" e "1-jan" → 16,
 *   "jan/24" e "janeiro 2024" → 17; horas: "10:30" → 20, "10:30:15" → 21,
 *   "10:30 PM" → 18, "25:00" → 46, "1:30,5" → 47; data e hora → 22;
 * - fórmula: HOJE()/DATA() → 14, AGORA() → 22, TEMPO() → 18; referência (=A1,
 *   =-A1, =A1+1, =(A1), SOMA/MÉDIA/MÍNIMO/MÁXIMO/ARRED(A1…)) herda o formato da
 *   1ª referência com formato; data ± data → Geral; * / ^ & SE PROCV ÍNDICE ABS
 *   CONT.NÚM DATAM… → nada;
 * - célula que JÁ tem formato: Geral aceita qualquer um; porcentagem, científico,
 *   fração, data e hora são trocados por outra categoria "especial" (porcentagem,
 *   moeda, científico, fração, data, hora) — nunca pelo de milhar; número (0,00),
 *   milhar e moeda nunca mudam; Texto (@) guarda tudo como texto, até "=…".
 */
import type { Node } from '@universal-office/sheet-calc';

export type FmtCategory = 'general' | 'number' | 'currency' | 'percent' | 'scientific' | 'fraction' | 'date' | 'time' | 'text';

/** Formato a aplicar: numFmtId (+ formatCode quando o Excel o grava junto, ex. moeda 6/8). */
export interface NumFmtHint {
  readonly id: number;
  readonly cat: FmtCategory;
  readonly code?: string;
}

const H = (id: number, cat: FmtCategory, code?: string): NumFmtHint => (code ? { id, cat, code } : { id, cat });
export const FMT = {
  thousands: H(3, 'number'), thousands2: H(4, 'number'), sci: H(11, 'scientific'),
  pct: H(9, 'percent'), pct2: H(10, 'percent'), frac: H(12, 'fraction'),
  date: H(14, 'date'), dMmmYy: H(15, 'date'), dMmm: H(16, 'date'), mmmYy: H(17, 'date'), dateTime: H(22, 'date'),
  hmAmPm: H(18, 'time'), hm: H(20, 'time'), hms: H(21, 'time'), elapsed: H(46, 'time'), msTenth: H(47, 'time'),
} as const;

/** Moeda digitada ("R$ 10"): o formatCode que o Excel grava com os ids 6 (inteiro) e 8 (2 casas). */
export function currencyHint(symbol: string, decimals: boolean): NumFmtHint {
  const q = `"${symbol.replace(/"/g, '')}"`;
  // pt-BR medido (SaveAs): "R$"\ #,##0;[Red]\-"R$"\ #,##0. en-US: os builtins 6/8 do ECMA
  const code = symbol === '$'
    ? `${q}#,##0${decimals ? '.00' : ''}_);[Red]\\(${q}#,##0${decimals ? '.00' : ''}\\)`
    : `${q}\\ #,##0${decimals ? '.00' : ''};[Red]\\-${q}\\ #,##0${decimals ? '.00' : ''}`;
  return H(decimals ? 8 : 6, 'currency', code);
}

const CURRENCY_TEXT = /[$€£¥]|R\$/;

/** Categoria de um código de formato (1ª seção), como a caixa "Formatar células" agrupa. */
export function formatCategory(code: string | undefined): FmtCategory {
  if (!code) return 'general';
  const sec = firstSection(code);
  let date = false, time = false, month = false, sci = false, pct = false, frac = false, cur = false, text = false, digits = false;
  for (let i = 0; i < sec.length; i++) {
    const ch = sec[i]!;
    if (ch === '"') {
      const j = sec.indexOf('"', i + 1);
      const lit = sec.slice(i + 1, j < 0 ? sec.length : j);
      if (CURRENCY_TEXT.test(lit)) cur = true;
      i = j < 0 ? sec.length : j;
      continue;
    }
    if (ch === '\\' || ch === '_' || ch === '*') { if (ch === '\\' && CURRENCY_TEXT.test(sec[i + 1] ?? '')) cur = true; i++; continue; }
    if (ch === '[') {
      const j = sec.indexOf(']', i);
      const inner = sec.slice(i + 1, j < 0 ? sec.length : j);
      if (/^(h+|m+|s+)$/i.test(inner)) time = true;
      else if (inner.startsWith('$') && /^\$[^-]+/.test(inner)) cur = true;
      i = j < 0 ? sec.length : j;
      continue;
    }
    const c = ch.toLowerCase();
    if (c === 'y' || c === 'd') date = true;
    else if (c === 'h' || c === 's') time = true;
    else if (c === 'm') month = true;
    else if (c === 'e' && (sec[i + 1] === '+' || sec[i + 1] === '-')) sci = true;
    else if (c === '%') pct = true;
    else if (c === '/') frac = true;
    else if (c === '@') text = true;
    else if (c === '$' || c === '€' || c === '£' || c === '¥') cur = true;
    else if (c === '0' || c === '#' || c === '?') digits = true;
    else if (c === 'g' && /^general/i.test(sec.slice(i))) return 'general';
  }
  if (date || (month && !time)) return 'date';
  if (time || month) return 'time';
  if (text && !digits) return 'text';
  if (sci) return 'scientific';
  if (pct) return 'percent';
  if (frac && digits) return 'fraction';
  if (cur) return 'currency';
  return digits ? 'number' : 'general';
}

function firstSection(code: string): string {
  let q = false, b = false;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === '\\' && !q) { i++; continue; }
    if (ch === '"') q = !q;
    else if (!q && ch === '[') b = true;
    else if (!q && ch === ']') b = false;
    else if (!q && !b && ch === ';') return code.slice(0, i);
  }
  return code;
}

const SPECIAL = new Set<FmtCategory>(['percent', 'scientific', 'fraction', 'date', 'time']);

/** O formato implícito da entrada substitui o atual da célula? (regra medida no cabeçalho). */
export function shouldApplyFormat(current: FmtCategory, hint: NumFmtHint): boolean {
  if (current === 'general') return true;
  if (!SPECIAL.has(current)) return false;
  if (hint.cat === 'number' || hint.cat === 'general' || hint.cat === 'text') return false;
  return hint.cat !== current;
}

/** Formato de uma referência (aba pelo nome do texto da fórmula ou a própria; linha/coluna 0-based). */
export type FormatLookup = (sheet: string | undefined, row: number, col: number) => { id: number; code: string } | undefined;

const INHERIT_FNS = new Set(['SUM', 'AVERAGE', 'MIN', 'MAX', 'ROUND']);

/**
 * Formato que a fórmula dá à célula Geral (ver o cabeçalho): undefined = nenhum.
 * `row`/`col` = célula da fórmula (0-based), para resolver as referências relativas.
 */
export function inferFormulaFormat(node: Node, row: number, col: number, formatAt: FormatLookup): NumFmtHint | undefined {
  const ref = (n: Extract<Node, { t: 'cell' | 'area' }>): NumFmtHint | undefined => {
    const rp = n.t === 'cell' ? n.row : n.r1;
    const cp = n.t === 'cell' ? n.col : n.c1;
    const r = rp ? (rp.abs ? rp.n : row + rp.n) : 0;
    const c = cp ? (cp.abs ? cp.n : col + cp.n) : 0;
    const f = formatAt(n.sheet?.sheet, r, c);
    if (!f) return undefined;
    const cat = formatCategory(f.code);
    return cat === 'general' ? undefined : { id: f.id, cat, code: f.code };
  };
  const go = (n: Node): NumFmtHint | undefined => {
    switch (n.t) {
      case 'cell': case 'area': return ref(n);
      case 'paren': return go(n.e);
      case 'unary': return n.op === '%' ? undefined : go(n.e);
      case 'bin': {
        if (n.op === ':') return go(n.a);
        if (n.op !== '+' && n.op !== '-') return undefined;
        const a = go(n.a), b = go(n.b);
        // data ± data = Geral (diferença de dias; soma de datas)
        if (a?.cat === 'date' && b?.cat === 'date') return undefined;
        return a ?? b;
      }
      case 'fn':
        switch (n.name) {
          case 'TODAY': case 'DATE': return FMT.date;
          case 'NOW': return FMT.dateTime;
          case 'TIME': return FMT.hmAmPm;
          case 'SINGLE': return n.args[0] ? go(n.args[0]) : undefined;
        }
        if (!INHERIT_FNS.has(n.name)) return undefined;
        if (n.name === 'ROUND') return n.args[0] ? go(n.args[0]) : undefined;
        for (const a of n.args) { const h = go(a); if (h) return h; }
        return undefined;
      default: return undefined;
    }
  };
  return go(node);
}

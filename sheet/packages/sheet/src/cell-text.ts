// Texto EXIBIDO de uma célula para a largura da coluna, como o Excel o calcula
// (o mesmo que Range.Text devolve) e as posições em que ele é desenhado.
// Regras medidas no Excel 365 pt-BR com pastas sintéticas (lab do Sheet):
//  - a coluna perde uma margem k = 2·max(2, ⌊ppem/6⌋) + 1 px (5 px na Calibri 11)
//    antes de decidir se o conteúdo cabe, quantos `*x` repetem e quantas casas
//    o Geral mostra;
//  - número/data/booleano/erro que não cabe vira "#" × ⌊(coluna − k)/larg(#)⌋
//    (Geral: no mínimo 1; demais: nada quando nem um # cabe); texto com `*x`
//    também; texto comum transborda;
//  - `_x` conta como UM espaço no Range.Text (e na decisão de caber); no
//    desenho reserva a largura de x;
//  - Geral: "vagas" = ⌊(coluna − k − larg(-))/larg(0)⌋ — o texto completo (até 11
//    caracteres) se couber nas vagas, senão menos casas/científico (formatGeneral
//    com esse orçamento); ainda assim mais largo que a coluna → ####; sem vaga,
//    positivo ≥ 0,0001 que arredonda a um dígito ainda aparece ("7", "0", "1").
// As larguras são as do Excel (px inteiros por glifo — ver FontMetrics).
import { formatValueParts, formatGeneral, decimalDigits, PT_BR, type FmtPart, type FormatLocale } from '@universal/sheet-core';

/** Limite de caracteres de uma célula no Excel. */
export const MAX_CELL_CHARS = 32767;

/** Erros como o Excel pt-BR os exibe (os 7 clássicos medidos; os novos, nomes do Excel pt-BR). */
const ERRORS_PT_BR: Record<string, string> = {
  '#NULL!': '#NULO!', '#DIV/0!': '#DIV/0!', '#VALUE!': '#VALOR!', '#REF!': '#REF!', '#NAME?': '#NOME?',
  '#NUM!': '#NÚM!', '#N/A': '#N/D', '#GETTING_DATA': '#OBTENDO_DADOS', '#SPILL!': '#DESPEJAR!',
  '#CALC!': '#CALC!', '#FIELD!': '#CAMPO!', '#BLOCKED!': '#BLOQUEADO!', '#UNKNOWN!': '#DESCONHECIDO!',
  '#CONNECT!': '#CONECTAR!', '#BUSY!': '#OCUPADO!', '#PYTHON!': '#PYTHON!',
};

/** Valor de erro gravado (sempre em inglês no arquivo) → texto exibido em pt-BR. */
export function localizeError(v: string): string {
  return ERRORS_PT_BR[v.trim().toUpperCase()] ?? v;
}

/** Mantissa pt-BR: inteiro (milhar com "." em grupos de 3) e/ou ",decimais"; expoente; "%". */
const NUM_PT_BR = /^[+-]?\s*(?:R\$|€)?\s*[+-]?\s*(\d+|\d{1,3}(?:\.\d{3})+)?(,\d*)?(?:[eE][+-]?\d+)?\s*%?\s*(?:R\$|€)?$/;

/**
 * Texto que o Excel pt-BR marca como "número armazenado como texto" (triângulo
 * verde no canto). Medido (lab e30, Range.Errors(3)): "007", "-5", "+5", "1,5",
 * "1.234", "1.234,5", " 12", "12%", "R$ 12", "€12", "12€", "(12)", "1E5",
 * ",5", "5,", "- 5" sim; "1.5", "12.0", "1 234", "$12", "12,345,678", datas
 * ("1/2", "01/02/2020"), horas, "TRUE", dígitos de largura total não. Vale para
 * compartilhada e inline, com formato Geral ou "@".
 */
export function looksLikeNumberPtBR(s: string): boolean {
  let t = s.replace(/^ +| +$/g, '');
  if (t.length > 2 && t.startsWith('(') && t.endsWith(')')) t = t.slice(1, -1).trim();
  const m = NUM_PT_BR.exec(t);
  return !!m && (/\d/.test(m[1] ?? '') || /\d/.test(m[2] ?? ''));
}

/**
 * Célula t="d" (data ISO 8601: "2023-01-15", "2023-01-15T10:30:00", "10:30") →
 * serial do Excel (1900: dias desde 30/12/1899, com o dia fictício 29/02/1900;
 * 1904: dias desde 01/01/1904). undefined se não for data.
 */
export function isoToSerial(v: string | undefined, date1904 = false): number | undefined {
  if (!v) return undefined;
  const m = /^(?:(\d{4})-(\d{2})-(\d{2}))?(?:T?(\d{2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?)?/.exec(v.trim());
  if (!m || (!m[1] && !m[4])) return undefined;
  let days = 0;
  if (m[1]) {
    const t = Date.UTC(+m[1], +m[2]! - 1, +m[3]!);
    days = date1904 ? (t - Date.UTC(1904, 0, 1)) / 86400000 : (t - Date.UTC(1899, 11, 30)) / 86400000;
    if (!date1904 && days < 61) days -= 1; // antes de 01/03/1900 o Excel conta o 29/02 fictício
  }
  const secs = m[4] ? +m[4] * 3600 + +m[5]! * 60 + (m[6] ? parseFloat(m[6]) : 0) : 0;
  return days + secs / 86400;
}

/** Booleano exibido em pt-BR. */
export function localizeBool(v: string | undefined): string {
  return v === '1' || v === 'true' ? 'VERDADEIRO' : 'FALSO';
}

/** Métrica de UMA fonte como o Excel mede: px inteiros por caractere no ppem. */
export interface FontMetrics {
  /** Largura de avanço (px inteiros) do caractere (code point). */
  adv(ch: string): number;
  /** ppem (px) da fonte. */
  ppem: number;
  /** Largura de uma string, quando a soma por glifo não vale (escritas com shaping). */
  width?(s: string, limit?: number): number;
}

/**
 * Margem (px) que o Excel desconta da coluna para caber/preencher: 2·m + 1 com
 * m = máx(2, ⌈ppem/8⌉) — medido (e5/e7) em Calibri 6..24 pt, Arial, Times,
 * Verdana, Courier, Tahoma, Segoe UI (5 px até 16 ppem, 7 até 24, 9 até 32).
 */
export function cellMarginPx(ppem: number): number {
  return 2 * Math.max(2, Math.ceil(ppem / 8)) + 1;
}

/**
 * Largura (px) em que a ALTURA AUTOMÁTICA da linha quebra o texto — mais
 * estreita que a da pintura (coluna − margem), por isso a linha auto-ajustada às
 * vezes sobra uma linha em branco no Excel. Medido (e15–e26, mesmas larguras
 * GDI do desenho): o menor entre
 *  - coluna − margem − 2 (domina em colunas estreitas: "ab ab …" em Calibri 11
 *    é pintado 2 por linha a partir de 38 px, mas a altura só conta 2 a partir
 *    de 40; Calibri 11/12b/14/20, Arial 10/16, Times 10 negrito);
 *  - (coluna − margem + 1) · MDW/(MDW + ¼), MDW = dígito máximo da fonte Normal
 *    (domina nas largas: "0"×80 = 560 px só cabe em 1 linha a partir de 584 px
 *    com MDW 7, 578 com 10, 582 com 8, 588 com 6; "0"×140 a partir de 1019).
 */
export function autofitWrapWidthPx(colPx: number, ppem: number, mdw: number): number {
  const k = cellMarginPx(ppem);
  return Math.min(colPx - k - 2, ((colPx - k + 1) * mdw) / (mdw + 0.25));
}

/** Largura (px) do texto como soma das larguras inteiras; para ao passar de `limit`. */
export function textWidth(m: FontMetrics, s: string, limit = Infinity): number {
  if (m.width) return m.width(s, limit);
  let w = 0;
  for (const ch of s) {
    w += m.adv(ch);
    if (w > limit) return w;
  }
  return w;
}

export type CellKind = 'number' | 'text' | 'bool' | 'error';

export interface CellTextInput {
  kind: CellKind;
  /** Valor numérico (kind 'number'). */
  num?: number;
  /** Texto (kind 'text'), ou o booleano/erro já localizados. */
  str?: string;
  /** formatCode da célula. */
  code?: string;
  date1904?: boolean;
  /** `<sheetView showZeros="0">` → false. */
  showZeros?: boolean;
  locale?: FormatLocale;
  /** Recuo total (px) — tira largura útil para caber/preencher, não da contagem de "#". */
  indentPx?: number;
  /** px a menos em tudo ("direita" explícita: 1, medido). */
  edgePx?: number;
}

/** Pedaço a desenhar: texto a partir de x (px, relativo ao início do conteúdo). */
export interface TextPiece { s: string; x: number }

export interface CellText {
  /** O texto exibido para a largura (= Range.Text). */
  text: string;
  /** Cor pedida pelo formato (`[Red]`…). */
  color?: string;
  /** Pedaços a desenhar e a largura total desenhada. */
  pieces: TextPiece[];
  width: number;
  /** Não coube: "####". */
  hashes: boolean;
  /** Tem preenchimento `*x`: ocupa a coluna toda (o alinhamento não se aplica). */
  filled: boolean;
  /** Texto que pode transbordar para as vizinhas vazias. */
  overflows: boolean;
}

const EMPTY: CellText = { text: '', pieces: [], width: 0, hashes: false, filled: false, overflows: false };

/**
 * Texto exibido + layout horizontal do conteúdo de uma célula de `colPx` px
 * (largura da coluna ou da mescla), com as larguras da fonte `m`.
 */
export function layoutCellText(input: CellTextInput, m: FontMetrics, colPx: number): CellText {
  const loc = input.locale ?? PT_BR;
  // largura útil: a contagem de "#" usa a coluna toda; caber/preencher descontam o recuo
  const full = colPx - cellMarginPx(m.ppem) - (input.edgePx ?? 0);
  const avail = full - (input.indentPx ?? 0);
  switch (input.kind) {
    case 'bool':
    case 'error': {
      const s = input.str ?? '';
      if (s === '') return EMPTY;
      const w = textWidth(m, s, avail);
      if (w > avail) return hashes(m, full, false);
      return { text: s, pieces: [{ s, x: 0 }], width: w, hashes: false, filled: false, overflows: false };
    }
    case 'text': {
      let s = input.str ?? '';
      if (s.length > MAX_CELL_CHARS) s = s.slice(0, MAX_CELL_CHARS);
      if (!input.code || /^general$/i.test(input.code)) return plain(s, m);
      // seção de texto do formato ("_ @_ ", "@*.", ";;;"…)
      const r = formatValueParts(s, input.code, { locale: loc });
      // texto com *x: cabe pela coluna toda (o recuo só reduz o preenchimento; medido, e13)
      if (r.parts.some((p) => p.t === 'fill')) return fit(r.parts, r.color, m, avail, full, loc, false, full);
      if (r.parts.length === 1 && r.parts[0]!.t === 'text' && r.parts[0]!.s === s) return plain(s, m, r.color);
      return plain(r.parts.map((p) => (p.t === 'text' ? p.s : p.t === 'skip' ? ' ' : '')).join(''), m, r.color, r.parts);
    }
    case 'number': {
      const v = input.num ?? 0;
      const r = formatValueParts(v, input.code, { locale: loc, date1904: input.date1904, showZeros: input.showZeros });
      if (r.overflow) return { ...hashes(m, full, false), color: r.color };
      if (r.parts.length === 0) return r.color ? { ...EMPTY, color: r.color } : EMPTY;
      let parts = r.parts;
      let general = false;
      if (parts.length === 1 && parts[0]!.t === 'general') {
        general = true;
        const s = generalFit((parts[0] as { v: number }).v, m, avail, loc);
        if (s === null) return { ...hashes(m, full, true), color: r.color };
        if (s.fallback) {
          // sem vaga nenhuma: o Excel ainda mostra o dígito arredondado (sem conferir a largura)
          const w = textWidth(m, s.text);
          return { text: s.text, color: r.color, pieces: [{ s: s.text, x: 0 }], width: w, hashes: false, filled: false, overflows: false };
        }
        parts = [{ t: 'text', s: s.text }];
      } else {
        parts = parts.map((p) => (p.t === 'general' ? { t: 'text', s: formatGeneral(p.v, loc) } : p));
      }
      return fit(parts, r.color, m, avail, full, loc, general);
    }
  }
}

/** Texto comum (transborda): um pedaço, `_x` desenhado com a largura de x. */
function plain(s: string, m: FontMetrics, color?: string, parts?: FmtPart[]): CellText {
  if (s === '') return color ? { ...EMPTY, color } : EMPTY;
  if (!parts) return { text: s, color, pieces: [{ s, x: 0 }], width: -1, hashes: false, filled: false, overflows: true };
  const pieces: TextPiece[] = [];
  let x = 0;
  for (const p of parts) {
    if (p.t === 'text') { pieces.push({ s: p.s, x }); x += textWidth(m, p.s); }
    else if (p.t === 'skip') x += m.adv(p.ch);
  }
  return { text: s, color, pieces, width: x, hashes: false, filled: false, overflows: true };
}

/** "####" que cabem na coluna (Geral: ao menos 1). */
function hashes(m: FontMetrics, avail: number, general: boolean): CellText {
  const hw = m.adv('#') || 1;
  let n = Math.floor(avail / hw);
  if (n <= 0) n = general ? 1 : 0;
  const s = '#'.repeat(n);
  return { text: s, pieces: n ? [{ s, x: 0 }] : [], width: n * hw, hashes: true, filled: false, overflows: false };
}

/** Número/texto com partes: confere se cabe (`_x` = espaço) e expande o `*x`. */
function fit(parts: FmtPart[], color: string | undefined, m: FontMetrics, avail: number, full: number, loc: FormatLocale, general: boolean, fitAvail = avail): CellText {
  void loc;
  let rangeW = 0, paintW = 0;
  let fillCh: string | undefined;
  for (const p of parts) {
    if (p.t === 'text') { const w = textWidth(m, p.s); rangeW += w; paintW += w; }
    else if (p.t === 'skip') { rangeW += m.adv(' '); paintW += m.adv(p.ch); }
    else if (p.t === 'fill') fillCh = p.ch;
  }
  if (rangeW > fitAvail) return { ...hashes(m, full, general), color };
  const fw = fillCh !== undefined ? Math.max(1, m.adv(fillCh)) : 1;
  // o texto formatado do Excel tem no máximo 255 caracteres (medido: `@*.` numa
  // coluna de 1.500 px pára em 255)
  let fixedLen = 0;
  for (const p of parts) fixedLen += p.t === 'text' ? p.s.length : p.t === 'skip' ? 1 : 0;
  const cap = Math.max(0, 255 - fixedLen);
  const nText = fillCh !== undefined ? Math.min(cap, Math.max(0, Math.floor((avail - rangeW) / fw))) : 0;
  const nPaint = fillCh !== undefined ? Math.min(cap, Math.max(0, Math.floor((avail - paintW) / fw))) : 0;
  let text = '';
  const pieces: TextPiece[] = [];
  let x = 0;
  for (const p of parts) {
    if (p.t === 'text') { text += p.s; pieces.push({ s: p.s, x }); x += textWidth(m, p.s); }
    else if (p.t === 'skip') { text += ' '; x += m.adv(p.ch); }
    else if (p.t === 'fill') {
      text += p.ch.repeat(nText);
      if (nPaint > 0) { const s = p.ch.repeat(nPaint); pieces.push({ s, x }); x += nPaint * fw; }
    }
  }
  return { text, color, pieces, width: x, hashes: false, filled: fillCh !== undefined, overflows: false };
}

/** Geral numa coluna de `avail` px; null = não cabe (####). */
function generalFit(v: number, m: FontMetrics, avail: number, loc: FormatLocale): { text: string; fallback?: boolean } | null {
  const signW = v < 0 ? m.adv('-') : 0;
  const slots = Math.floor((avail - signW) / Math.max(1, m.adv('0')));
  const full = formatGeneral(v, loc);
  const body = v < 0 ? full.slice(1) : full;
  let s: string;
  if (body.length <= slots) s = full;
  else if (slots < 1) {
    // sem vaga: positivo ≥ 0,0001 que arredonda a um dígito ("7", "1", "0")
    if (v > 0 && v >= 1e-4) {
      const [i] = decimalDigits(v, 0);
      if ((i || '0').length === 1) return { text: i || '0', fallback: true };
    }
    return null;
  } else {
    s = formatGeneral(v, loc, slots);
    if (s === '') return null;
  }
  if (textWidth(m, s, avail) > avail) return null;
  return { text: s };
}

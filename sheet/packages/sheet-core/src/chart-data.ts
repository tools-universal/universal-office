/**
 * Dados dos gráficos a partir das CÉLULAS da pasta. O Excel relê as células
 * ao abrir — os caches gravados no XML (`c:numCache`/`c:strCache`) podem estar
 * velhos ou ausentes (medido, lo-hidden_cells: cache de 2 pontos, o Excel
 * desenha os 4 das células; os gráficos do Office 2016 — `cx:` — nem gravam
 * cache, só o nome `_xlchart.v1.N`). Aqui as referências `<c:f>` são
 * resolvidas (aba!intervalo, uniões, nomes definidos) e os caches refeitos com
 * os valores e o texto exibido das células; linhas/colunas ocultas saem
 * quando `c:plotVisOnly` (o padrão do Excel).
 */
import { parseXml, childElements, firstChild, textContent, type XmlElement } from './xml.js';
import type { XlsxPackage } from './package.js';
import type { Worksheet, Cell, SharedString } from './model.js';
import { readWorkbook, readWorksheet, readSharedStrings } from './read.js';
import { readStyles, type Styles } from './styles.js';
import { formatValue, builtinFormatCode } from './format.js';

/** Célula vista por um gráfico. */
export interface ChartCell {
  /** Valor numérico (números, datas, booleanos); undefined = texto/vazio/erro. */
  num?: number;
  /** Texto exibido (formatado). */
  text: string;
  /** Código do formato numérico da célula. */
  fmt: string;
  /** Erro (#N/D…): ponto vazio. */
  err?: boolean;
}

/** De onde o gráfico lê as células (o componente dá as abas que já leu). */
export interface ChartCellSource {
  cell(sheet: string, row: number, col: number): ChartCell | undefined;
  hiddenRow(sheet: string, row: number): boolean;
  hiddenCol(sheet: string, col: number): boolean;
  hasSheet(sheet: string): boolean;
  /** Nome definido → fórmula (escopo da aba primeiro). */
  name(n: string, sheet?: string): string | undefined;
}

interface SheetData { cells: Map<number, Map<number, Cell>>; hiddenRows: Set<number>; hiddenCols: Set<number> }

const sources = new WeakMap<XlsxPackage, ChartCellSource>();

/**
 * Fonte das células a partir do pacote (abas lidas sob demanda, uma vez por
 * pacote). `sheets`: abas já lidas pelo hospedeiro (nome → Worksheet).
 */
export function pkgCellSource(pkg: XlsxPackage, sheets?: Map<string, Worksheet>): ChartCellSource {
  const hit = sources.get(pkg);
  if (hit) return hit;
  const wb = readWorkbook(pkg);
  let shared: SharedString[] | undefined;
  let styles: Styles | undefined;
  const data = new Map<string, SheetData | null>();
  const names = new Map<string, string>(); // "aba!nome" ou "!nome" (global), minúsculas
  const wbXml = pkg.getPartText('xl/workbook.xml');
  if (wbXml) {
    try {
      const root = parseXml(wbXml);
      const dn = firstChild(root, 'definedNames');
      for (const d of dn ? childElements(dn, 'definedName') : []) {
        const n = d.attrs['name'];
        if (!n) continue;
        const li = d.attrs['localSheetId'];
        const scope = li !== undefined ? wb.sheets[parseInt(li, 10)]?.name ?? '' : '';
        names.set(`${scope.toLowerCase()}!${n.toLowerCase()}`, textContent(d));
      }
    } catch { /* workbook ilegível: sem nomes */ }
  }
  const sheetOf = (name: string): SheetData | null => {
    const key = name.toLowerCase();
    if (data.has(key)) return data.get(key)!;
    const ref = wb.sheets.find((s) => s.name.toLowerCase() === key);
    let ws: Worksheet | undefined = sheets?.get(ref?.name ?? name);
    if (!ws && ref?.target) { try { ws = readWorksheet(pkg, ref.target); } catch { ws = undefined; } }
    if (!ws) { data.set(key, null); return null; }
    const cells = new Map<number, Map<number, Cell>>();
    const hiddenRows = new Set<number>(), hiddenCols = new Set<number>();
    for (const r of ws.rows) {
      if (r.hidden) hiddenRows.add(r.r);
      const m = new Map<number, Cell>();
      for (const c of r.cells) m.set(colOf(c.ref), c);
      cells.set(r.r, m);
    }
    for (const c of ws.cols ?? []) if (c.hidden) for (let k = c.min; k <= Math.min(c.max, 16384); k++) hiddenCols.add(k);
    const sd = { cells, hiddenRows, hiddenCols };
    data.set(key, sd);
    return sd;
  };
  const src: ChartCellSource = {
    hasSheet: (s) => !!sheetOf(s),
    hiddenRow: (s, r) => !!sheetOf(s)?.hiddenRows.has(r),
    hiddenCol: (s, c) => !!sheetOf(s)?.hiddenCols.has(c),
    name: (n, s) => names.get(`${(s ?? '').toLowerCase()}!${n.toLowerCase()}`) ?? names.get(`!${n.toLowerCase()}`),
    cell: (s, row, col) => {
      const c = sheetOf(s)?.cells.get(row)?.get(col);
      if (!c) return undefined;
      styles ??= readStyles(pkg);
      const xf = styles.cellXfs[c.style ?? 0];
      const id = xf?.numFmtId ?? 0;
      const fmt = styles.numFmts.get(id) ?? builtinFormatCode(id) ?? 'General';
      if (c.type === 's') {
        shared ??= readSharedStrings(pkg);
        const t = shared[parseInt(c.value ?? '-1', 10)]?.text ?? '';
        return { text: t, fmt };
      }
      if (c.type === 'inlineStr') return { text: c.inlineString?.text ?? '', fmt };
      if (c.type === 'str') return { text: c.value ?? '', fmt };
      if (c.type === 'e') return { text: c.value ?? '', fmt, err: true };
      if (c.value === undefined || c.value === '') return undefined;
      if (c.type === 'b') return { num: c.value === '1' ? 1 : 0, text: c.value === '1' ? 'VERDADEIRO' : 'FALSO', fmt };
      const n = parseFloat(c.value);
      if (!Number.isFinite(n)) return { text: c.value, fmt };
      return { num: n, text: formatValue(n, fmt, { date1904: !!wb.date1904 }).text, fmt };
    },
  };
  sources.set(pkg, src);
  return src;
}

function colOf(ref: string): number {
  let n = 0;
  for (const ch of ref) { const k = ch.charCodeAt(0); if (k < 65 || k > 90) break; n = n * 26 + k - 64; }
  return n;
}

/** Uma área de referência resolvida. */
interface Area { sheet: string; r0: number; c0: number; r1: number; c1: number }

/** `Aba!$A$1:$B$2`, `'Aba x'!A1`, `(área,área)`, nome definido → áreas; undefined se externo/ilegível. */
export function resolveRef(f: string, src: ChartCellSource, depth = 0): Area[] | undefined {
  let s = f.trim().replace(/^=/, '');
  if (s.startsWith('(') && s.endsWith(')')) s = s.slice(1, -1);
  const parts: string[] = [];
  let cur = '', q = false;
  for (const ch of s) {
    if (ch === "'") q = !q;
    if (ch === ',' && !q) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  const out: Area[] = [];
  for (const p0 of parts) {
    const p = p0.trim();
    const bang = p.lastIndexOf('!');
    let sheet = '', addr = p;
    if (bang >= 0) {
      sheet = p.slice(0, bang);
      addr = p.slice(bang + 1);
      if (sheet.startsWith("'") && sheet.endsWith("'")) sheet = sheet.slice(1, -1).replace(/''/g, "'");
      if (/^\[\d+\]/.test(sheet)) return undefined; // pasta externa: fica o cache
      sheet = sheet.replace(/^\[[^\]]*\]/, '');
    }
    const m = /^\$?([A-Za-z]{1,3})\$?(\d+)(?::\$?([A-Za-z]{1,3})\$?(\d+))?$/.exec(addr);
    if (!m) {
      // nome definido (escopo da aba citada, senão global)
      if (depth > 3) return undefined;
      const def = src.name(addr, sheet || undefined);
      if (!def) return undefined;
      const sub = resolveRef(def, src, depth + 1);
      if (!sub) return undefined;
      out.push(...sub);
      continue;
    }
    if (!sheet || !src.hasSheet(sheet)) return undefined;
    const c0 = colOf(m[1]!.toUpperCase()), r0 = parseInt(m[2]!, 10);
    const c1 = m[3] ? colOf(m[3].toUpperCase()) : c0, r1 = m[4] ? parseInt(m[4], 10) : r0;
    out.push({ sheet, r0: Math.min(r0, r1), c0: Math.min(c0, c1), r1: Math.max(r0, r1), c1: Math.max(c0, c1) });
  }
  return out.length ? out : undefined;
}

/** Células de áreas 1D na ordem do intervalo; `visOnly` pula linhas/colunas ocultas. */
function cellsOf(areas: Area[], src: ChartCellSource, visOnly: boolean): (ChartCell | undefined)[] | undefined {
  const out: (ChartCell | undefined)[] = [];
  for (const a of areas) {
    const n = (a.r1 - a.r0 + 1) * (a.c1 - a.c0 + 1);
    if (n > 100000) return undefined;
    // intervalo 2D fora de multiLvlStrRef: pontos ao longo da dimensão maior, o
    // texto das células da outra dimensão juntado (medido, boletim-agro: B703:C707
    // com C vazia → 5 categorias do B)
    if (a.r0 !== a.r1 && a.c0 !== a.c1) {
      const byRows = a.r1 - a.r0 >= a.c1 - a.c0;
      const [p0, p1, q0, q1] = byRows ? [a.r0, a.r1, a.c0, a.c1] : [a.c0, a.c1, a.r0, a.r1];
      for (let p = p0; p <= p1; p++) {
        if (visOnly && (byRows ? src.hiddenRow(a.sheet, p) : src.hiddenCol(a.sheet, p))) continue;
        const parts: ChartCell[] = [];
        for (let q = q0; q <= q1; q++) { const cl = byRows ? src.cell(a.sheet, p, q) : src.cell(a.sheet, q, p); if (cl && cl.text !== '') parts.push(cl); }
        out.push(parts.length ? { ...parts[parts.length - 1]!, text: parts.map((x) => x.text).join(' ') } : undefined);
      }
      continue;
    }
    // linha ou coluna oculta: o ponto sai (série inteira numa coluna oculta fica vazia)
    for (let r = a.r0; r <= a.r1; r++) for (let c = a.c0; c <= a.c1; c++) {
      if (visOnly && (src.hiddenRow(a.sheet, r) || src.hiddenCol(a.sheet, c))) continue;
      out.push(src.cell(a.sheet, r, c));
    }
  }
  return out;
}

const el = (name: string, attrs: Record<string, string> = {}, children: (XmlElement | string)[] = []): XmlElement => ({ name, attrs, children });

function numCache(cells: (ChartCell | undefined)[], tag: string, asValues: boolean): XmlElement {
  const first = cells.find((c) => c && (c.num !== undefined || !asValues));
  const fmt = first?.fmt ?? 'General';
  const pts: XmlElement[] = [];
  cells.forEach((c, i) => {
    if (!c || c.err) return;
    // texto num intervalo de valores: o Excel desenha como 0
    const v = c.num !== undefined ? c.num : asValues ? 0 : undefined;
    if (v === undefined) return;
    const attrs: Record<string, string> = { idx: String(i) };
    if (c.fmt !== fmt) attrs['formatCode'] = c.fmt;
    pts.push(el('c:pt', attrs, [el('c:v', {}, [String(v)])]));
  });
  return el(tag, {}, [el('c:formatCode', {}, [fmt]), el('c:ptCount', { val: String(cells.length) }), ...pts]);
}

function strCache(cells: (ChartCell | undefined)[], tag = 'c:strCache'): XmlElement {
  const pts: XmlElement[] = [];
  cells.forEach((c, i) => { if (c && c.text !== '') pts.push(el('c:pt', { idx: String(i) }, [el('c:v', {}, [c.text])])); });
  return el(tag, {}, [el('c:ptCount', { val: String(cells.length) }), ...pts]);
}

/**
 * Refaz os caches de dados do `c:chartSpace` (árvore com prefixos canônicos)
 * a partir das células. Devolve a mesma árvore (alterada) — ou intacta, quando
 * nada resolve (pasta externa, aba ausente).
 */
export function refreshChartData(root: XmlElement, src: ChartCellSource): XmlElement {
  const chart = firstChild(root, 'c:chart');
  // gráfico dinâmico: o Excel desenha da tabela dinâmica (sem os totais do intervalo) — fica o cache
  if (!chart || firstChild(root, 'c:pivotSource')) return root;
  const pv = firstChild(chart, 'c:plotVisOnly');
  // ausente: o Excel grava sempre; o schema diz verdadeiro
  const visOnly = !pv || pv.attrs['val'] === undefined || pv.attrs['val'] === '1' || pv.attrs['val'] === 'true';
  const visit = (e: XmlElement, inVal: boolean): void => {
    for (const c of childElements(e)) {
      if (c.name === 'c:numRef' || c.name === 'c:strRef') {
        const f = firstChild(c, 'c:f');
        const areas = f ? resolveRef(textContent(f), src) : undefined;
        const cells = areas ? cellsOf(areas, src, visOnly) : undefined;
        if (!cells) continue;
        const isNum = c.name === 'c:numRef';
        const cache = isNum ? numCache(cells, 'c:numCache', inVal) : strCache(cells);
        const ext = c.children.filter((x) => typeof x !== 'string' && x.name !== 'c:numCache' && x.name !== 'c:strCache' && x.name !== 'c:f');
        c.children = [f!, cache, ...ext];
        continue;
      }
      if (c.name === 'c:multiLvlStrRef') { refreshMultiLevel(c, src, visOnly); continue; }
      visit(c, inVal || c.name === 'c:val' || c.name === 'c:yVal' || c.name === 'c:bubbleSize');
    }
  };
  const plot = firstChild(chart, 'c:plotArea');
  if (plot) visit(plot, false);
  return root;
}

/** Categorias multinível: intervalo 2D, níveis = colunas (ou linhas), do interno (último) ao externo. */
function refreshMultiLevel(ref: XmlElement, src: ChartCellSource, visOnly: boolean): void {
  const f = firstChild(ref, 'c:f');
  const areas = f ? resolveRef(textContent(f), src) : undefined;
  if (!areas || areas.length !== 1) return;
  const a = areas[0]!;
  const byRows = a.r1 - a.r0 >= a.c1 - a.c0; // pontos ao longo das linhas
  const nPts = byRows ? a.r1 - a.r0 + 1 : a.c1 - a.c0 + 1, nLvl = byRows ? a.c1 - a.c0 + 1 : a.r1 - a.r0 + 1;
  if (nPts > 100000 || nLvl > 10) return;
  const idx: number[] = [];
  for (let k = 0; k < nPts; k++) {
    const r = byRows ? a.r0 + k : a.r0, c = byRows ? a.c0 : a.c0 + k;
    if (visOnly && (byRows ? src.hiddenRow(a.sheet, r) : src.hiddenCol(a.sheet, c))) continue;
    idx.push(k);
  }
  const lvls: XmlElement[] = [];
  for (let l = nLvl - 1; l >= 0; l--) {
    const pts: XmlElement[] = [];
    idx.forEach((k, i) => {
      const cell = byRows ? src.cell(a.sheet, a.r0 + k, a.c0 + l) : src.cell(a.sheet, a.r0 + l, a.c0 + k);
      if (cell && cell.text !== '') pts.push(el('c:pt', { idx: String(i) }, [el('c:v', {}, [cell.text])]));
    });
    lvls.push(el('c:lvl', {}, pts));
  }
  const cache = el('c:multiLvlStrCache', {}, [el('c:ptCount', { val: String(idx.length) }), ...lvls]);
  const ext = ref.children.filter((x) => typeof x !== 'string' && x.name !== 'c:multiLvlStrCache' && x.name !== 'c:f');
  ref.children = [f!, cache, ...ext];
}

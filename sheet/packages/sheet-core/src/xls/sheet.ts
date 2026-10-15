/**
 * Subfluxo de uma planilha ([MS-XLS] 2.1.7.20.5): células (NUMBER, RK, MULRK,
 * LABELSST, LABEL, RSTRING, BOOLERR, FORMULA + STRING, BLANK, MULBLANK),
 * linhas/colunas, mesclagens, janela (grade, painéis, zoom), hyperlinks,
 * notas (NOTE + OBJ + TXO) e o desenho (MSODRAWING concatenado + OBJ).
 *
 * As células já saem como fragmentos de XML (`<c>`) por linha — uma planilha
 * de 15 MB tem centenas de milhares delas; um modelo intermediário dobraria
 * o custo.
 */
import { Bytes, readChars, readXLString, RT, type BiffRecord, type FormatRun, type RichString } from './biff.js';
import type { XlsGlobals } from './globals.js';
import { colName, xmlText } from './xmlw.js';

/** Tabela de strings compartilhada: SST + strings de LABEL/RSTRING (BIFF5). */
export class StringTable {
  readonly items: RichString[];
  private readonly plain = new Map<string, number>();
  constructor(sst: RichString[]) { this.items = sst; }
  add(s: RichString): number {
    if (!s.runs) {
      const k = this.plain.get(s.text);
      if (k !== undefined) return k;
      this.plain.set(s.text, this.items.length);
    }
    this.items.push(s);
    return this.items.length - 1;
  }
}

/** Células de uma linha já em XML, com os XFs (autoajuste de altura). */
export interface RowCells {
  cols: number[];
  xml: string[];
  sorted: boolean;
  /** XF de cada célula (inclusive vazias formatadas). */
  xfs: number[];
  /** Alguma célula COM conteúdo quebra texto (altura multilinha: mantém a gravada). */
  wrap: boolean;
}

export interface RowInfo {
  /** Altura em twips. */
  height?: number;
  custom: boolean;
  hidden: boolean;
  /** XF padrão da linha (fGhostDirty). */
  xf?: number;
  /** fExAsc / fExDes: borda grossa em cima / embaixo (o auto-ajuste soma 1 px cada). */
  thickTop?: boolean;
  thickBot?: boolean;
}

export interface ColInfo { first: number; last: number; width: number; xf: number; hidden: boolean }

export interface HyperlinkInfo {
  r1: number; c1: number; r2: number; c2: number;
  url?: string;
  location?: string;
  display?: string;
  tooltip?: string;
}

export interface NoteInfo { row: number; col: number; objId: number; author: string; shown: boolean; text?: string }

/** Objeto (OBJ) com o offset do desenho até ele (liga ao OfficeArtClientData). */
export interface ObjInfo {
  ot: number;
  id: number;
  /** Tamanho do desenho concatenado quando o OBJ apareceu. */
  drawingAt: number;
  /** Texto do TXO que segue o objeto (caixas de texto/notas). */
  text?: RichString;
  /** Registros do subfluxo de gráfico embutido (BOF dt=0x20 … EOF) após o OBJ. */
  chart?: BiffRecord[];
}

export interface XlsSheet {
  /** Linha (0-based) → fragmentos `<c>` (col, xml). */
  cells: Map<number, RowCells>;
  rows: Map<number, RowInfo>;
  cols: ColInfo[];
  defColWidth?: number;
  stdWidth?: number;
  defRowHeight?: number;
  defRowHidden?: boolean;
  defRowCustom?: boolean;
  merges: [number, number, number, number][];
  showGrid: boolean;
  showZeros: boolean;
  showFormulas: boolean;
  rightToLeft: boolean;
  selected: boolean;
  zoom?: number;
  frozen?: { x: number; y: number; top: number; left: number };
  hyperlinks: HyperlinkInfo[];
  notes: NoteInfo[];
  objs: ObjInfo[];
  drawing?: Uint8Array;
  /** Registros do próprio subfluxo quando ele é uma folha de gráfico. */
  chartRecords?: BiffRecord[];
  /** AUTOFILTERINFO presente (autofiltro ativo na aba). */
  hasAutoFilter?: boolean;
  /** Área do autofiltro (do nome _FilterDatabase da aba). */
  autoFilter?: Rect;
  /** Valores das células referenciadas por gráficos (chave linha·16384 + coluna). */
  values?: Map<number, CellValue>;
}

/** Valor de célula guardado para os gráficos (os .xls raramente trazem o cache das séries). */
export interface CellValue { v: number | string; xf: number }

/** Retângulo 0-based inclusivo [r1, c1, r2, c2]. */
export type Rect = [number, number, number, number];

const ERRORS: Record<number, string> = {
  0x00: '#NULL!', 0x07: '#DIV/0!', 0x0f: '#VALUE!', 0x17: '#REF!', 0x1d: '#NAME?', 0x24: '#NUM!', 0x2a: '#N/A', 0x2b: '#GETTING_DATA',
};

/** Linhas/colunas máximas do formato .xlsx (refs fora disso são descartadas). */
const MAX_ROW = 1048576;
const MAX_COL = 16384;

const RK_VIEW = new DataView(new ArrayBuffer(8));

/** Decodifica um RK ([MS-XLS] 2.5.217): inteiro de 30 bits ou os 30 bits altos de um double, opcionalmente ÷100. */
export function rkValue(rk: number): number {
  let v: number;
  if (rk & 2) v = (rk | 0) >> 2;
  else {
    RK_VIEW.setUint32(0, 0, true);
    RK_VIEW.setUint32(4, (rk & 0xfffffffc) >>> 0, true);
    v = RK_VIEW.getFloat64(0, true);
  }
  return rk & 1 ? v / 100 : v;
}

/** Número → texto do `<v>` (round-trip exato do double). */
function num(v: number): string {
  return Number.isFinite(v) ? String(v) : '0';
}

/**
 * Lê o subfluxo de uma planilha (a partir do registro APÓS o BOF). `isChart`:
 * folha de gráfico (os registros vão crus para o conversor de gráficos).
 * `wanted`: áreas referenciadas por séries de gráficos — os valores dessas
 * células ficam em `values`.
 */
export function readSheet(recs: Iterator<BiffRecord>, g: XlsGlobals, strings: StringTable, isChart: boolean, wanted?: Rect[]): XlsSheet {
  const b8 = g.biff === 8;
  const sh: XlsSheet = {
    cells: new Map(), rows: new Map(), cols: [], merges: [],
    showGrid: true, showZeros: true, showFormulas: false, rightToLeft: false, selected: false,
    hyperlinks: [], notes: [], objs: [],
  };
  const keep = wanted?.length
    ? (row: number, col: number, v: number | string, xf: number): void => {
      for (const [r1, c1, r2, c2] of wanted) {
        if (row >= r1 && row <= r2 && col >= c1 && col <= c2) { (sh.values ??= new Map()).set(row * 16384 + col, { v, xf }); return; }
      }
    }
    : undefined;
  const drawing: Uint8Array[] = [];
  let drawingLen = 0;
  let pendingFormula: { row: number; col: number; xf: number } | undefined;
  let lastObj: ObjInfo | undefined;
  let lastLink: HyperlinkInfo | undefined;
  let lastNote5: NoteInfo | undefined;
  const chartRecs: BiffRecord[] | undefined = isChart ? [] : undefined;

  const put = (row: number, col: number, xml: string, xf: number, content = true): void => {
    let acc = sh.cells.get(row);
    if (!acc) { acc = { cols: [], xml: [], sorted: true, xfs: [], wrap: false }; sh.cells.set(row, acc); }
    acc.xfs.push(xf);
    if (content && g.xfs[xf]?.wrap) acc.wrap = true;
    const n = acc.cols.length;
    if (n > 0 && acc.cols[n - 1]! >= col) acc.sorted = false;
    acc.cols.push(col);
    acc.xml.push(xml);
  };
  const ref = (row: number, col: number): string => colName(col) + (row + 1);
  const sAttr = (xf: number): string => (xf > 0 && xf < g.xfs.length ? ` s="${xf}"` : '');
  const cellNum = (row: number, col: number, xf: number, v: number): void => {
    if (row >= MAX_ROW || col >= MAX_COL) return;
    put(row, col, `<c r="${ref(row, col)}"${sAttr(xf)}><v>${num(v)}</v></c>`, xf);
    keep?.(row, col, v, xf);
  };
  const cellStr = (row: number, col: number, xf: number, s: RichString): void => {
    if (row >= MAX_ROW || col >= MAX_COL) return;
    put(row, col, `<c r="${ref(row, col)}"${sAttr(xf)} t="s"><v>${strings.add(s)}</v></c>`, xf);
    keep?.(row, col, s.text, xf);
  };
  const cellBlank = (row: number, col: number, xf: number): void => {
    if (row >= MAX_ROW || col >= MAX_COL) return;
    put(row, col, `<c r="${ref(row, col)}"${sAttr(xf)}/>`, xf, false);
  };
  const flushFormula = (text: string | undefined): void => {
    if (!pendingFormula) return;
    const { row, col, xf } = pendingFormula;
    pendingFormula = undefined;
    if (row >= MAX_ROW || col >= MAX_COL) return;
    put(row, col, `<c r="${ref(row, col)}"${sAttr(xf)} t="str"><v>${xmlText(text ?? '')}</v></c>`, xf);
    if (text) keep?.(row, col, text, xf);
  };

  let depth = 0;
  let chartBuf: BiffRecord[] | undefined;
  for (let it = recs.next(); !it.done; it = recs.next()) {
    const rec = it.value;
    if (chartRecs) chartRecs.push(rec);
    // subfluxo aninhado (gráfico embutido): registros vão para o OBJ anterior
    if (rec.type === RT.BOF) {
      depth++;
      if (depth === 1 && lastObj && lastObj.ot === 5 && !lastObj.chart) { chartBuf = []; lastObj.chart = chartBuf; }
      chartBuf?.push(rec);
      continue;
    }
    if (depth > 0) {
      chartBuf?.push(rec);
      if (rec.type === RT.EOF) { depth--; if (depth === 0) chartBuf = undefined; }
      continue;
    }
    if (rec.type === RT.EOF) break;
    if (pendingFormula && rec.type !== RT.STRING && isCellRecord(rec.type)) flushFormula('');
    const r = new Bytes(rec.data);
    switch (rec.type) {
      case RT.NUMBER:
        cellNum(r.u16(0), r.u16(2), r.u16(4), r.f64(6));
        break;
      case RT.RK:
        cellNum(r.u16(0), r.u16(2), r.u16(4), rkValue(r.u32(6)));
        break;
      case RT.MULRK: {
        const row = r.u16(0);
        let col = r.u16(2);
        for (let o = 4; o + 6 <= r.length - 2; o += 6, col++) cellNum(row, col, r.u16(o), rkValue(r.u32(o + 2)));
        break;
      }
      case RT.LABELSST: {
        const row = r.u16(0), col = r.u16(2), xf = r.u16(4);
        const i = r.u32(6);
        if (row >= MAX_ROW || col >= MAX_COL) break;
        put(row, col, `<c r="${ref(row, col)}"${sAttr(xf)} t="s"><v>${i < strings.items.length ? i : strings.add({ text: '' })}</v></c>`, xf);
        keep?.(row, col, strings.items[i]?.text ?? '', xf);
        break;
      }
      case RT.LABEL: {
        const s = readXLString(r, 6, b8, g.cp, 2, rec.conts);
        cellStr(r.u16(0), r.u16(2), r.u16(4), { text: s.text });
        break;
      }
      case RT.RSTRING: {
        // BIFF5/7: cch u16 + bytes + cRuns u8 + (ich u8, ifnt u8)…; BIFF8: XLUnicodeString + cRuns u16 + (ich u16, ifnt u16)…
        const s = readXLString(r, 6, b8, g.cp, 2, rec.conts);
        const runs: FormatRun[] = [];
        let p = s.next;
        if (b8) {
          const n = r.u16(p); p += 2;
          for (let i = 0; i < n && p + 4 <= r.length; i++, p += 4) runs.push({ ich: r.u16(p), ifnt: r.u16(p + 2) });
        } else {
          const n = r.u8(p); p += 1;
          for (let i = 0; i < n && p + 2 <= r.length; i++, p += 2) runs.push({ ich: r.u8(p), ifnt: r.u8(p + 1) });
        }
        cellStr(r.u16(0), r.u16(2), r.u16(4), runs.length ? { text: s.text, runs } : { text: s.text });
        break;
      }
      case RT.BOOLERR: {
        const row = r.u16(0), col = r.u16(2), xf = r.u16(4);
        const v = r.u8(6);
        if (row >= MAX_ROW || col >= MAX_COL) break;
        if (r.u8(7)) put(row, col, `<c r="${ref(row, col)}"${sAttr(xf)} t="e"><v>${ERRORS[v] ?? '#N/A'}</v></c>`, xf);
        else put(row, col, `<c r="${ref(row, col)}"${sAttr(xf)} t="b"><v>${v ? 1 : 0}</v></c>`, xf);
        break;
      }
      case RT.FORMULA: {
        const row = r.u16(0), col = r.u16(2), xf = r.u16(4);
        if (r.u16(12) === 0xffff) {
          const kind = r.u8(6);
          if (kind === 0) pendingFormula = { row, col, xf };
          else if (row < MAX_ROW && col < MAX_COL) {
            if (kind === 1) put(row, col, `<c r="${ref(row, col)}"${sAttr(xf)} t="b"><v>${r.u8(8) ? 1 : 0}</v></c>`, xf);
            else if (kind === 2) put(row, col, `<c r="${ref(row, col)}"${sAttr(xf)} t="e"><v>${ERRORS[r.u8(8)] ?? '#N/A'}</v></c>`, xf);
            else put(row, col, `<c r="${ref(row, col)}"${sAttr(xf)} t="str"><v></v></c>`, xf);
          }
        } else cellNum(row, col, xf, r.f64(6));
        break;
      }
      case RT.STRING: {
        if (!pendingFormula) break;
        const s = b8 ? readXLString(r, 0, true, g.cp, 2, rec.conts) : readXLString(r, 0, false, g.cp, 2);
        flushFormula(s.text);
        break;
      }
      case RT.BLANK:
        cellBlank(r.u16(0), r.u16(2), r.u16(4));
        break;
      case RT.MULBLANK: {
        const row = r.u16(0);
        let col = r.u16(2);
        for (let o = 4; o + 2 <= r.length - 2; o += 2, col++) cellBlank(row, col, r.u16(o));
        break;
      }
      case RT.ROW: {
        const rw = r.u16(0);
        const miy = r.u16(6);
        const fl = r.u32(12);
        const info: RowInfo = { custom: (fl & 0x40) !== 0, hidden: (fl & 0x20) !== 0 };
        const h = miy & 0x7fff;
        if (!(miy & 0x8000) || h > 0) info.height = h;
        if (fl & 0x80) info.xf = (fl >>> 16) & 0xfff;
        if (fl & 0x10000000) info.thickTop = true;
        if (fl & 0x20000000) info.thickBot = true;
        if (rw < MAX_ROW) sh.rows.set(rw, info);
        break;
      }
      case RT.DEFAULTROWHEIGHT: {
        if (r.length >= 4) {
          const fl = r.u16(0);
          sh.defRowHeight = r.u16(2);
          sh.defRowHidden = (fl & 2) !== 0;
          sh.defRowCustom = (fl & 1) !== 0;
        } else sh.defRowHeight = r.u16(0) & 0x7fff;
        break;
      }
      case RT.DEFCOLWIDTH:
        sh.defColWidth = r.u16(0);
        break;
      case RT.STANDARDWIDTH:
        sh.stdWidth = r.u16(0);
        break;
      case RT.COLINFO: {
        const first = r.u16(0), last = r.u16(2);
        if (first > last || first >= MAX_COL) break;
        sh.cols.push({ first, last: Math.min(last, MAX_COL - 1), width: r.u16(4), xf: r.u16(6), hidden: (r.u16(8) & 1) !== 0 });
        break;
      }
      case RT.MERGECELLS: {
        const n = r.u16(0);
        for (let i = 0, o = 2; i < n && o + 8 <= r.length; i++, o += 8) {
          const r1 = r.u16(o), r2 = r.u16(o + 2), c1 = r.u16(o + 4), c2 = r.u16(o + 6);
          if (r2 < r1 || c2 < c1 || (r1 === r2 && c1 === c2)) continue;
          sh.merges.push([r1, c1, Math.min(r2, MAX_ROW - 1), Math.min(c2, MAX_COL - 1)]);
        }
        break;
      }
      case RT.WINDOW2: {
        const fl = r.u16(0);
        sh.showFormulas = (fl & 0x01) !== 0;
        sh.showGrid = (fl & 0x02) !== 0;
        sh.showZeros = (fl & 0x10) !== 0;
        sh.rightToLeft = (fl & 0x40) !== 0;
        sh.selected = (fl & 0x200) !== 0;
        if (fl & 0x08) sh.frozen = { x: 0, y: 0, top: r.u16(2), left: r.u16(4) };
        // BIFF8: wScaleNormal (zoom da vista normal) — o SCL, se vier, prevalece
        if (b8 && r.length >= 14) { const z = r.u16(12); if (z >= 10 && z <= 400) sh.zoom = z; }
        break;
      }
      case RT.SCL: {
        const n = r.i16(0), d = r.i16(2);
        if (n > 0 && d > 0) { const z = Math.round((n * 100) / d); if (z >= 10 && z <= 400) sh.zoom = z; }
        break;
      }
      case RT.PANE:
        if (sh.frozen) sh.frozen = { x: r.u16(0), y: r.u16(2), top: r.u16(4), left: r.u16(6) };
        break;
      case RT.HLINK: {
        const link = readHlink(r);
        if (link) { sh.hyperlinks.push(link); lastLink = link; }
        break;
      }
      case RT.HLINKTOOLTIP: {
        // FrtRefHeaderNoGrbit (10 bytes) + wzTooltip (UTF-16, terminado em 0)
        if (lastLink) {
          let t = '';
          for (let o = 10; o + 1 < r.length; o += 2) { const c = r.u16(o); if (!c) break; t += String.fromCharCode(c); }
          if (t) lastLink.tooltip = t;
        }
        break;
      }
      case RT.NOTE: {
        if (b8) {
          const s = readXLString(r, 8, true, g.cp, 2, rec.conts);
          sh.notes.push({ row: r.u16(0), col: r.u16(2), shown: (r.u16(4) & 2) !== 0, objId: r.u16(6), author: s.text });
        } else {
          // BIFF5: texto no próprio NOTE; continuações com rw = 0xFFFF
          const row = r.u16(0);
          const cch = r.u16(4);
          const text = g.cp.decode(r.sub(6, 6 + cch));
          if (row === 0xffff && lastNote5) lastNote5.text = (lastNote5.text ?? '') + text;
          else { lastNote5 = { row, col: r.u16(2), shown: false, objId: -1, author: '', text }; sh.notes.push(lastNote5); }
        }
        break;
      }
      case RT.OBJ: {
        if (!b8) { lastObj = undefined; break; }
        // ftCmo: ft u16 (0x15), cb u16, ot u16, id u16, …
        if (r.u16(0) === 0x15) {
          lastObj = { ot: r.u16(4), id: r.u16(6), drawingAt: drawingLen };
          sh.objs.push(lastObj);
        }
        break;
      }
      case RT.TXO: {
        if (!b8 || !lastObj || !rec.conts.length) break;
        const cch = r.u16(10);
        const c0 = rec.conts[0]!;
        const t = readChars(r, c0 + 1, cch, (r.u8(c0) & 1) !== 0, rec.conts);
        const rs: RichString = { text: t.text };
        // runs (8 bytes: ich, ifnt, 4 reservados) no CONTINUE seguinte ao texto
        const runStart = rec.conts.find((c) => c >= t.next);
        if (runStart !== undefined) {
          const runs: FormatRun[] = [];
          for (let o = runStart; o + 8 <= r.length; o += 8) {
            const ich = r.u16(o);
            if (ich >= cch) break;
            runs.push({ ich, ifnt: r.u16(o + 2) });
          }
          if (runs.length) rs.runs = runs;
        }
        lastObj.text = rs;
        break;
      }
      case RT.AUTOFILTERINFO:
        sh.hasAutoFilter = true;
        break;
      case RT.MSODRAWING:
        drawing.push(rec.data);
        drawingLen += rec.data.length;
        break;
    }
  }
  if (pendingFormula) flushFormula('');
  if (drawing.length) {
    const out = new Uint8Array(drawingLen);
    let o = 0;
    for (const d of drawing) { out.set(d, o); o += d.length; }
    sh.drawing = out;
  }
  if (chartRecs) sh.chartRecords = chartRecs;
  // notas do BIFF8: texto vem do TXO do OBJ (ot = 0x19) com o mesmo id
  const byId = new Map<number, ObjInfo>();
  for (const o of sh.objs) byId.set(o.id, o);
  for (const n of sh.notes) if (n.text === undefined) n.text = byId.get(n.objId)?.text?.text ?? '';
  return sh;
}

function isCellRecord(t: number): boolean {
  return t === RT.NUMBER || t === RT.RK || t === RT.MULRK || t === RT.LABELSST || t === RT.LABEL || t === RT.RSTRING
    || t === RT.BOOLERR || t === RT.FORMULA || t === RT.BLANK || t === RT.MULBLANK || t === RT.ROW;
}

// ───────────────────────────── HLINK ─────────────────────────────

const CLSID_URL = 'e0c9ea79f9bace118c8200aa004ba90b';
const CLSID_FILE = '0303000000000000c000000000000046';

function guidHex(r: Bytes, o: number): string {
  let s = '';
  for (let i = 0; i < 16; i++) s += r.u8(o + i).toString(16).padStart(2, '0');
  return s;
}

/** HyperlinkString: u32 com nº de caracteres (incluindo o 0 final) + UTF-16. */
function hlString(r: Bytes, o: number): { text: string; next: number } {
  const n = r.u32(o);
  const len = Math.min(n, Math.max(0, (r.length - o - 4) >> 1));
  let t = '';
  for (let i = 0; i < len; i++) { const c = r.u16(o + 4 + i * 2); if (!c) break; t += String.fromCharCode(c); }
  return { text: t, next: o + 4 + len * 2 };
}

/** HLINK ([MS-XLS] 2.4.140 + [MS-OSHARED] Hyperlink Object). */
function readHlink(r: Bytes): HyperlinkInfo | undefined {
  const link: HyperlinkInfo = { r1: r.u16(0), r2: r.u16(2), c1: r.u16(4), c2: r.u16(6) };
  if (link.r1 >= MAX_ROW || link.c1 >= MAX_COL) return undefined;
  let p = 8 + 16; // ref + hlinkClsid
  p += 4; // streamVersion
  const fl = r.u32(p); p += 4;
  try {
    if (fl & 0x10) { const s = hlString(r, p); link.display = s.text; p = s.next; }
    if (fl & 0x80) { p = hlString(r, p).next; }
    if (fl & 0x01) {
      if (fl & 0x100) { const s = hlString(r, p); link.url = s.text; p = s.next; }
      else {
        const clsid = guidHex(r, p); p += 16;
        if (clsid === CLSID_URL) {
          const len = r.u32(p); p += 4;
          let t = '';
          for (let i = 0; i + 1 < len && p + i + 1 < r.length; i += 2) { const c = r.u16(p + i); if (!c) break; t += String.fromCharCode(c); }
          link.url = t;
          p += len;
        } else if (clsid === CLSID_FILE) {
          const cAnti = r.u16(p); p += 2;
          const ansiLen = r.u32(p); p += 4;
          let ansi = '';
          for (let i = 0; i < ansiLen && p + i < r.length; i++) { const c = r.u8(p + i); if (!c) break; ansi += String.fromCharCode(c); }
          p += ansiLen;
          p += 2 + 2 + 20; // endServer, versionNumber, reserved
          const cbUni = r.u32(p); p += 4;
          let path = ansi;
          if (cbUni > 0) {
            const cbBytes = r.u32(p); p += 4 + 2; // cbUnicodePathBytes + usKeyValue
            let u = '';
            for (let i = 0; i + 1 < cbBytes && p + i + 1 < r.length; i += 2) u += String.fromCharCode(r.u16(p + i));
            p += cbBytes;
            if (u) path = u;
          }
          link.url = '../'.repeat(cAnti) + path.replace(/\\/g, '/');
        } else {
          return link.display !== undefined ? finishLink(link) : undefined;
        }
      }
    }
    if (fl & 0x08) { const s = hlString(r, p); link.location = s.text; p = s.next; }
  } catch { /* objeto truncado: fica com o que deu para ler */ }
  return finishLink(link);
}

function finishLink(l: HyperlinkInfo): HyperlinkInfo | undefined {
  if (l.url === undefined && l.location === undefined) return undefined;
  return l;
}

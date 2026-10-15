/**
 * Subfluxo de gráfico do BIFF8 (BOF dt=0x20 … EOF, [MS-XLS] 2.4 "Chart") →
 * `c:chartSpace` consumido pelo motor único de gráficos (shared/charts).
 *
 * O subfluxo é uma árvore (BEGIN/END): CHART { FRAME, SERIES { AI, SERIESTEXT,
 * DATAFORMAT { LINEFORMAT, AREAFORMAT, MARKERFORMAT… }, SERTOCRT }, TEXT
 * (títulos), AXISPARENT { AXIS { VALUERANGE/CATSERRANGE, TICK, AXISLINEFORMAT },
 * PLOTAREA, FRAME, CHARTFORMAT { BAR/LINE/PIE…, LEGEND } } }.
 *
 * Valores: os .xls quase nunca trazem o cache das séries (SIINDEX vazio — até o
 * Excel grava assim); as séries são resolvidas pelas REFERÊNCIAS (AI) contra as
 * células da pasta, com o cache como reserva. Formatação "automática" segue o
 * Excel 97–2003 (que o Excel atual mantém ao abrir .xls): preenchimentos da
 * paleta 24–31, linhas 32–39, área de plotagem cinza, marcadores em ciclo.
 */
import { builtinFormatCode } from '../format.js';
import { Bytes, Codepage, readXLString, RT, type BiffRecord } from './biff.js';
import type { XlsGlobals } from './globals.js';
import type { CellValue, Rect } from './sheet.js';
import { formulaAreas, type Area } from './formula.js';
import { fontAt, normalizeFormat } from './styles-xml.js';
import { XML_HEAD, xmlText } from './xmlw.js';
import { readFoptBlock } from './officeart.js';
import { foptFillXml } from './shapes.js';

/** Acesso às células da pasta para resolver as referências das séries. */
export interface ChartContext {
  g: XlsGlobals;
  /** Nomes das abas pela ordem do BOUNDSHEET. */
  sheetNames: string[];
  /** Valor da célula (aba pelo índice do BOUNDSHEET; linha/coluna 0-based). */
  cell: (sheet: number, row: number, col: number) => CellValue | undefined;
}

const CT = {
  CHART: 0x1002, SERIES: 0x1003, DATAFORMAT: 0x1006, LINEFORMAT: 0x1007, MARKERFORMAT: 0x1009, AREAFORMAT: 0x100a,
  PIEFORMAT: 0x100b, ATTACHEDLABEL: 0x100c, SERIESTEXT: 0x100d, CHARTFORMAT: 0x1014, LEGEND: 0x1015, BAR: 0x1017,
  LINE: 0x1018, PIE: 0x1019, AREA: 0x101a, SCATTER: 0x101b, AXIS: 0x101d, TICK: 0x101e, VALUERANGE: 0x101f,
  CATSERRANGE: 0x1020, AXISLINEFORMAT: 0x1021, DEFAULTTEXT: 0x1024, TEXT: 0x1025, FONTX: 0x1026, OBJECTLINK: 0x1027,
  FRAME: 0x1032, BEGIN: 0x1033, END: 0x1034, PLOTAREA: 0x1035, D3: 0x103a, RADAR: 0x103e, SURF: 0x103f,
  RADARAREA: 0x1040, AXISPARENT: 0x1041, SHTPROPS: 0x1044, SERTOCRT: 0x1045, SERPARENT: 0x104a, IFMT: 0x104e,
  AI: 0x1051, SERFMT: 0x105d, FBI: 0x1060, AXCEXT: 0x1062, BOPPOP: 0x1061, SIINDEX: 0x1065, GELFRAME: 0x1066,
} as const;

interface Node { t: number; r: Bytes; conts: number[]; kids: Node[]; gel?: Node }

/** Registros → árvore pelos BEGIN/END (o registro antes do BEGIN é o pai). */
function tree(records: BiffRecord[]): Node[] {
  const root: Node[] = [];
  const stack: Node[][] = [root];
  let last: Node | undefined;
  let first = true;
  for (const rec of records) {
    if (first) { first = false; if (rec.type === RT.BOF) continue; }
    if (rec.type === RT.EOF) break;
    if (rec.type === CT.BEGIN) {
      stack.push(last ? last.kids : []);
      last = undefined;
      if (stack.length > 64) break; // aninhamento absurdo: arquivo corrompido
      continue;
    }
    if (rec.type === CT.END) { if (stack.length > 1) stack.pop(); last = undefined; continue; }
    last = { t: rec.type, r: new Bytes(rec.data), conts: rec.conts, kids: [] };
    const level = stack[stack.length - 1]!;
    // GELFRAME (preenchimento do Office 2007 em OfficeArt) complementa o AREAFORMAT anterior
    if (rec.type === CT.GELFRAME) { const area = [...level].reverse().find((k) => k.t === CT.AREAFORMAT); if (area) area.gel = last; }
    level.push(last);
  }
  return root;
}

/** Codepage só para a assinatura de readXLString (strings do BIFF8 são Unicode). */
const CP = new Codepage(1252);

const kid = (n: Node | undefined, t: number): Node | undefined => n?.kids.find((k) => k.t === t);
const kidsOf = (n: Node | undefined, t: number): Node[] => n?.kids.filter((k) => k.t === t) ?? [];

// ───────────────────────────── referências ─────────────────────────────

/** ixti → índice da aba na própria pasta (undefined = externa/ inválida). */
function sheetOf(g: XlsGlobals, ixti: number): number | undefined {
  const x = g.xti[ixti];
  if (!x || !g.supbooks[x.book] || x.tab < 0 || x.tab >= g.sheets.length) return undefined;
  return x.tab;
}

/** AI (BRAI): id, rt, grbit, ifmt, fórmula. */
function aiOf(n: Node): { id: number; rt: number; unlinked: boolean; ifmt: number; areas: Area[] } {
  const r = n.r;
  return { id: r.u8(0), rt: r.u8(1), unlinked: (r.u16(2) & 1) !== 0, ifmt: r.u16(4), areas: formulaAreas(r, 8, r.u16(6)) };
}

/**
 * Pré-varredura do stream: áreas referenciadas pelas séries (AI) de TODOS os
 * gráficos, por aba — readSheet guarda só os valores dessas células.
 */
export function chartRefs(buf: Uint8Array, g: XlsGlobals): Map<number, Rect[]> {
  const out = new Map<number, Rect[]>();
  if (g.biff !== 8) return out;
  for (let off = 0; off + 4 <= buf.length;) {
    const t = buf[off]! | (buf[off + 1]! << 8);
    const len = buf[off + 2]! | (buf[off + 3]! << 8);
    if (t === CT.AI && buf[off + 5] === 2) {
      const r = new Bytes(buf.subarray(off + 4, Math.min(buf.length, off + 4 + len)));
      for (const a of formulaAreas(r, 8, r.u16(6))) {
        const s = sheetOf(g, a.ixti);
        if (s === undefined) continue;
        const list = out.get(s) ?? [];
        // limite: uma série não passa de 32 000 pontos no Excel 97–2003
        if (list.length < 4096) list.push([a.r1, a.c1, Math.min(a.r2, a.r1 + 32000), Math.min(a.c2, a.c1 + 32000)]);
        out.set(s, list);
      }
    }
    off += 4 + len;
  }
  return out;
}

// ───────────────────────────── cores e formatos ─────────────────────────────

const hex = (c: string): string => c.replace('#', '').toUpperCase();

function icvColor(g: XlsGlobals, icv: number): string {
  if (icv < 64) return g.palette[icv] ?? '#000000';
  if (icv === 0x41 || icv === 0x4e) return '#FFFFFF';
  if (icv === 0x50) return '#FFFFE1';
  return '#000000';
}

/** Cor automática de PREENCHIMENTO da série/ponto n (paleta 24–31 do Excel 97). */
const autoFill = (g: XlsGlobals, n: number): string => g.palette[24 + (n % 8)] ?? '#9999FF';
/** Cor automática de LINHA da série n (paleta 32–39). */
const autoLine = (g: XlsGlobals, n: number): string => g.palette[32 + (n % 8)] ?? '#000080';
/** Marcadores automáticos do Excel 97 em ciclo. */
const AUTO_MARKERS = ['diamond', 'square', 'triangle', 'x', 'star', 'circle', 'plus', 'dash', 'dot'];
const MARKERS = ['none', 'square', 'diamond', 'triangle', 'x', 'star', 'dash', 'dash', 'circle', 'plus'];
const LINE_W = (we: number): number => (we < 0 ? 3175 : we === 0 ? 9525 : we === 1 ? 19050 : 28575);
const DASH = ['', 'dash', 'sysDot', 'dashDot', 'lgDashDotDot'];

const solid = (c: string): string => `<a:solidFill><a:srgbClr val="${hex(c)}"/></a:solidFill>`;

/** LINEFORMAT → `<a:ln>`; `auto` = cor do automático. */
function lnXml(g: XlsGlobals, n: Node | undefined, auto: string, autoW = 9525): string {
  if (!n) return `<a:ln w="${autoW}">${solid(auto)}</a:ln>`;
  const r = n.r;
  const lns = r.u16(4), we = r.i16(6), grbit = r.u16(8), icv = r.u16(10);
  if (lns === 5) return '<a:ln><a:noFill/></a:ln>';
  const isAuto = (grbit & 1) !== 0;
  const color = isAuto ? auto : icvColor(g, icv);
  const w = isAuto ? autoW : LINE_W(we);
  const dash = DASH[lns] ? `<a:prstDash val="${DASH[lns]}"/>` : '';
  return `<a:ln w="${w}">${solid(color)}${dash}</a:ln>`;
}

/** AREAFORMAT → preenchimento; `auto` = cor do automático (undefined = sem preenchimento). */
function fillXml(g: XlsGlobals, n: Node | undefined, auto: string | undefined): string {
  if (!n) return auto ? solid(auto) : '<a:noFill/>';
  const r = n.r;
  const fls = r.u16(8), grbit = r.u16(10), icvFore = r.u16(12);
  if (grbit & 1) return auto ? solid(auto) : '<a:noFill/>';
  if (fls === 0) return '<a:noFill/>';
  // Excel 2007+: o GELFRAME traz o preenchimento verdadeiro (RGB, degradê com
  // fillShadeColors) — o AREAFORMAT guarda só a aproximação da paleta
  if (n.gel) {
    let x: string | undefined;
    try { const fo = readFoptBlock(n.gel.r.sub(0, n.gel.r.length)); x = foptFillXml(g, fo.props, fo.complex); } catch { x = undefined; }
    if (x) return x;
  }
  return solid(icvColor(g, icvFore));
}

/** Código de formato de um XF da pasta (o "vinculado à origem" das séries). */
function xfFormat(g: XlsGlobals, xf: number | undefined): string {
  const id = xf !== undefined ? g.xfs[xf]?.fmt ?? 0 : 0;
  return ifmtCode(g, id);
}

function ifmtCode(g: XlsGlobals, id: number): string {
  const own = g.formats.get(id);
  if (own !== undefined && (id >= 50 || (id >= 5 && id <= 8) || (id >= 41 && id <= 44))) return normalizeFormat(own);
  return builtinFormatCode(id) ?? (own !== undefined ? normalizeFormat(own) : 'General');
}

// ───────────────────────────── texto ─────────────────────────────

interface TextProps { size: number; bold: boolean; italic: boolean; underline: boolean; color: string; face: string }

function fontProps(g: XlsGlobals, ifnt: number | undefined, color?: string): TextProps {
  const f = fontAt(g, ifnt ?? 0);
  return {
    size: f.height / 20, bold: f.weight >= 600, italic: f.italic, underline: f.underline !== 0,
    color: color ?? (f.color === 0x7fff ? '#000000' : icvColor(g, f.color)), face: f.name,
  };
}

const rprAttrs = (p: TextProps): string => `sz="${Math.round(p.size * 100)}" b="${p.bold ? 1 : 0}" i="${p.italic ? 1 : 0}"${p.underline ? ' u="sng"' : ''}`;
const rprBody = (p: TextProps): string => `${solid(p.color)}<a:latin typeface="${xmlText(p.face)}"/>`;
const defRPr = (p: TextProps): string => `<a:defRPr ${rprAttrs(p)}>${rprBody(p)}</a:defRPr>`;

/** Rotação do TEXT/TICK (trot) → atributos do `a:bodyPr`. */
function bodyPr(trot: number): string {
  if (trot === 255) return '<a:bodyPr vert="wordArtVert"/>';
  if (trot > 0 && trot <= 90) return `<a:bodyPr rot="${-trot * 60000}" vert="horz"/>`;
  if (trot > 90 && trot <= 180) return `<a:bodyPr rot="${(trot - 90) * 60000}" vert="horz"/>`;
  return '<a:bodyPr/>';
}

const txPr = (p: TextProps, trot = 0): string => `<c:txPr>${bodyPr(trot)}<a:lstStyle/><a:p><a:pPr>${defRPr(p)}</a:pPr><a:endParaRPr lang="pt-BR"/></a:p></c:txPr>`;

/** TEXT → propriedades (fonte do FONTX, cor do TEXT quando não automática). */
function textNodeProps(g: XlsGlobals, t: Node | undefined, base: TextProps): TextProps {
  if (!t) return base;
  const fx = kid(t, CT.FONTX);
  const p = fx ? fontProps(g, fx.r.u16(0)) : { ...base };
  const grbit = t.r.u16(24);
  if (!(grbit & 1)) p.color = icvColor(g, t.r.u16(26));
  return p;
}

function richTitle(text: string, p: TextProps, trot: number): string {
  const paras = text.split(/\r\n|\r|\n/).map((line) => `<a:p><a:pPr>${defRPr(p)}</a:pPr><a:r><a:rPr lang="pt-BR" ${rprAttrs(p)}>${rprBody(p)}</a:rPr><a:t>${xmlText(line)}</a:t></a:r></a:p>`).join('');
  return `<c:title><c:tx><c:rich>${bodyPr(trot)}<a:lstStyle/>${paras}</c:rich></c:tx><c:overlay val="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr></c:title>`;
}

/** Texto literal do SERIESTEXT de um TEXT/SERIES. */
function seriesText(n: Node | undefined): string | undefined {
  const st = kid(n, CT.SERIESTEXT);
  if (!st) return undefined;
  return readXLString(st.r, 2, true, CP, 1, st.conts).text;
}

// ───────────────────────────── conversão ─────────────────────────────

interface SeriesData {
  name?: string;
  nameRef?: string;
  vals: (number | undefined)[];
  valRef?: string;
  valFmt: string;
  cats?: (number | string | undefined)[];
  catRef?: string;
  catFmt?: string;
  catsNumeric: boolean;
  bubbles?: (number | undefined)[];
  node: Node;
  group: number;
}

/** Valores de uma lista de áreas (linha por linha). */
function areaValues(ctx: ChartContext, areas: Area[]): { vals: (CellValue | undefined)[]; ref?: string } {
  const vals: (CellValue | undefined)[] = [];
  const refs: string[] = [];
  for (const a of areas) {
    const s = sheetOf(ctx.g, a.ixti);
    if (s === undefined) return { vals: [] };
    const name = ctx.sheetNames[s] ?? '';
    const q = /^[A-Za-z_][A-Za-z0-9_.]*$/.test(name) ? name : `'${name.replace(/'/g, "''")}'`;
    const abs = (r: number, c: number): string => `$${colLetters(c)}$${r + 1}`;
    refs.push(a.r1 === a.r2 && a.c1 === a.c2 ? `${q}!${abs(a.r1, a.c1)}` : `${q}!${abs(a.r1, a.c1)}:${abs(a.r2, a.c2)}`);
    const r2 = Math.min(a.r2, a.r1 + 32000), c2 = Math.min(a.c2, a.c1 + 32000);
    for (let r = a.r1; r <= r2; r++) for (let c = a.c1; c <= c2; c++) vals.push(ctx.cell(s, r, c));
  }
  return { vals, ref: refs.length === 1 ? refs[0] : `(${refs.join(',')})` };
}

function colLetters(c: number): string {
  let n = c + 1, s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Cache do próprio gráfico (SIINDEX + NUMBER/LABEL): [índice][série][ponto]. */
function chartCache(top: Node[]): Map<number, Map<number, Map<number, number | string>>> {
  const out = new Map<number, Map<number, Map<number, number | string>>>();
  let cur: Map<number, Map<number, number | string>> | undefined;
  for (const n of top) {
    if (n.t === CT.SIINDEX) { cur = new Map(); out.set(n.r.u16(0), cur); continue; }
    if (!cur) continue;
    const put = (v: number | string): void => {
      const s = n.r.u16(2), p = n.r.u16(0);
      if (!cur!.has(s)) cur!.set(s, new Map());
      cur!.get(s)!.set(p, v);
    };
    if (n.t === RT.NUMBER) put(n.r.f64(6));
    else if (n.t === RT.LABEL) put(readXLString(n.r, 6, true, CP, 2, n.conts).text);
  }
  return out;
}

const numXml = (vals: (number | undefined)[], fmt: string): string => {
  let pts = '';
  vals.forEach((v, i) => { if (v !== undefined && Number.isFinite(v)) pts += `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`; });
  return `<c:numCache><c:formatCode>${xmlText(fmt)}</c:formatCode><c:ptCount val="${vals.length}"/>${pts}</c:numCache>`;
};
const strXml = (vals: (number | string | undefined)[]): string => {
  let pts = '';
  vals.forEach((v, i) => { if (v !== undefined && v !== '') pts += `<c:pt idx="${i}"><c:v>${xmlText(String(v))}</c:v></c:pt>`; });
  return `<c:strCache><c:ptCount val="${vals.length}"/>${pts}</c:strCache>`;
};

type Kind = 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar' | 'bubble';

/** Converte o subfluxo de gráfico. undefined = vazio/não suportado. */
export function chartSpaceXml(ctx: ChartContext, records: BiffRecord[]): string | undefined {
  const g = ctx.g;
  if (g.biff !== 8) return undefined;
  const top = tree(records);
  const chart = top.find((n) => n.t === CT.CHART);
  if (!chart) return undefined;
  const cache = chartCache(top);

  // fontes padrão: DEFAULTTEXT 2 (todo o texto) e 3 (eixos)
  let baseText = fontProps(g, 0);
  let axisText: TextProps | undefined;
  chart.kids.forEach((n, i) => {
    if (n.t !== CT.DEFAULTTEXT) return;
    const t = chart.kids[i + 1];
    if (t?.t !== CT.TEXT) return;
    const p = textNodeProps(g, t, baseText);
    if (n.r.u16(0) === 2) baseText = p;
    else if (n.r.u16(0) === 3) axisText = p;
  });
  axisText ??= baseText;

  // grupos (CHARTFORMAT) por AXISPARENT, na ordem do arquivo
  const parents = kidsOf(chart, CT.AXISPARENT);
  interface GroupInfo { node: Node; parent: Node; secondary: boolean; kind: Kind; typeNode: Node; d3: boolean; varied: boolean }
  const groups: GroupInfo[] = [];
  for (const ap of parents) {
    for (const cf of kidsOf(ap, CT.CHARTFORMAT)) {
      const typeNode = cf.kids.find((k) => k.t === CT.BAR || k.t === CT.LINE || k.t === CT.PIE || k.t === CT.AREA || k.t === CT.SCATTER || k.t === CT.RADAR || k.t === CT.RADARAREA || k.t === CT.BOPPOP);
      if (!typeNode) continue;
      let kind: Kind = typeNode.t === CT.BAR ? 'bar' : typeNode.t === CT.LINE ? 'line' : typeNode.t === CT.AREA ? 'area'
        : typeNode.t === CT.SCATTER ? 'scatter' : typeNode.t === CT.RADAR || typeNode.t === CT.RADARAREA ? 'radar' : 'pie';
      if (kind === 'scatter' && (typeNode.r.u16(4) & 1)) kind = 'bubble';
      groups.push({ node: cf, parent: ap, secondary: ap.r.u16(0) === 1, kind, typeNode, d3: !!kid(cf, CT.D3), varied: (cf.r.u16(16) & 1) !== 0 });
    }
  }
  if (!groups.length) return undefined;

  // séries
  const series: SeriesData[] = [];
  let sIdx = -1;
  for (const s of kidsOf(chart, CT.SERIES)) {
    sIdx++;
    if (kid(s, CT.SERPARENT)) continue; // linha de tendência / barra de erro
    const sd: SeriesData = { vals: [], valFmt: 'General', catsNumeric: false, node: s, group: kid(s, CT.SERTOCRT)?.r.u16(0) ?? 0 };
    for (const aiNode of kidsOf(s, CT.AI)) {
      const ai = aiOf(aiNode);
      const resolved = ai.rt === 2 && ai.areas.length ? areaValues(ctx, ai.areas) : undefined;
      if (ai.id === 0) {
        if (ai.rt === 1) sd.name = seriesText(s);
        else if (resolved?.vals.length) { const v = resolved.vals[0]?.v; sd.name = v === undefined ? '' : String(v); sd.nameRef = resolved.ref; }
      } else if (ai.id === 1) {
        if (resolved?.vals.length) {
          sd.vals = resolved.vals.map((c) => (typeof c?.v === 'number' ? c.v : undefined));
          sd.valRef = resolved.ref;
          const firstXf = resolved.vals.find((c) => c !== undefined)?.xf;
          sd.valFmt = ai.unlinked ? ifmtCode(g, ai.ifmt) : xfFormat(g, firstXf);
        } else {
          const c = cache.get(1)?.get(sIdx);
          const n = s.r.u16(6);
          if (c) sd.vals = Array.from({ length: n || c.size }, (_, i) => { const v = c.get(i); return typeof v === 'number' ? v : undefined; });
        }
      } else if (ai.id === 2) {
        if (resolved?.vals.length) {
          sd.cats = resolved.vals.map((c) => c?.v);
          sd.catRef = resolved.ref;
          sd.catsNumeric = resolved.vals.every((c) => c === undefined || typeof c.v === 'number');
          sd.catFmt = xfFormat(g, resolved.vals.find((c) => c !== undefined)?.xf);
        } else {
          const c = cache.get(2)?.get(sIdx);
          if (c?.size) {
            const n = Math.max(...c.keys()) + 1;
            sd.cats = Array.from({ length: n }, (_, i) => c.get(i));
            sd.catsNumeric = sd.cats.every((v) => v === undefined || typeof v === 'number');
          }
        }
      } else if (ai.id === 3 && resolved?.vals.length) {
        sd.bubbles = resolved.vals.map((c) => (typeof c?.v === 'number' ? c.v : undefined));
      }
    }
    if (sd.name === undefined) { const t = seriesText(s); if (t !== undefined) sd.name = t; }
    series.push(sd);
  }

  // ── eixo de datas (AXCEXT fDateAxis): uma posição por unidade de tempo ──
  const dateAxes = new Map<Node, DateAxis>();
  for (const ap of parents) {
    const xAxis = kidsOf(ap, CT.AXIS).find((a) => a.r.u16(0) === 0);
    const ext = kid(xAxis, CT.AXCEXT);
    const gs = groups.filter((x) => x.parent === ap);
    if (!ext || !gs.length || gs.some((x) => x.kind === 'pie' || x.kind === 'scatter' || x.kind === 'bubble' || x.kind === 'radar')) continue;
    const sers = series.filter((s) => gs.includes(groups[s.group]!));
    const da = dateAxis(g, ext, sers);
    if (da) dateAxes.set(ap, da);
  }

  // ── eixos (um par por AXISPARENT) ──
  let axId = 100000;
  const axesXml: string[] = [];
  const parentAxes = new Map<Node, [number, number]>();
  const titles = new Map<number, Node>(); // OBJECTLINK → TEXT
  for (const t of [...kidsOf(chart, CT.TEXT), ...parents.flatMap((p) => kidsOf(p, CT.TEXT))]) {
    const ol = kid(t, CT.OBJECTLINK);
    if (ol) titles.set(ol.r.u16(0), t);
  }
  for (const ap of parents) {
    const gr = groups.find((x) => x.parent === ap);
    if (!gr || gr.kind === 'pie') continue;
    const secondary = ap.r.u16(0) === 1;
    const ids: [number, number] = [axId++, axId++];
    parentAxes.set(ap, ids);
    const axes = kidsOf(ap, CT.AXIS);
    const xAxis = axes.find((a) => a.r.u16(0) === 0);
    const yAxis = axes.find((a) => a.r.u16(0) === 1);
    const xy = gr.kind === 'scatter' || gr.kind === 'bubble';
    const horizontal = gr.kind === 'bar' && (gr.typeNode.r.u16(4) & 1) !== 0;
    const catRange = kid(xAxis, CT.CATSERRANGE);
    const between = catRange ? (catRange.r.u16(6) & 1) !== 0 : gr.kind === 'bar';
    const first = series.find((s) => s.group === groups.indexOf(gr));
    const xPos = secondary ? (horizontal ? 'r' : 't') : horizontal ? 'l' : 'b';
    const yPos = secondary ? (horizontal ? 't' : 'r') : horizontal ? 'b' : 'l';
    axesXml.push(axisXml(g, ctx, xAxis, xy ? 'val' : 'cat', ids[0], ids[1], xPos, secondary, axisText!,
      secondary ? undefined : titles.get(3), first?.catsNumeric ? first.catFmt : undefined, between, xy, dateAxes.get(ap)));
    axesXml.push(axisXml(g, ctx, yAxis, 'val', ids[1], ids[0], yPos, secondary, axisText!,
      secondary ? undefined : titles.get(2), first?.valFmt ?? 'General', between, xy));
  }

  // ── grupos → c:xxxChart ──
  let plot = '';
  let order = 0;
  groups.forEach((gr, gi) => {
    const sers = series.filter((s) => s.group === gi);
    if (!sers.length) return;
    const tr = gr.typeNode.r;
    let xml = '';
    const serXml = sers.map((s) => seriesXml(g, s, gr.kind, gr.varied, order++, series.indexOf(s))).join('');
    switch (gr.kind) {
      case 'bar': {
        const grbit = tr.u16(4);
        const grouping = grbit & 4 ? 'percentStacked' : grbit & 2 ? 'stacked' : 'clustered';
        const tag = gr.d3 ? 'c:bar3DChart' : 'c:barChart';
        xml = `<${tag}><c:barDir val="${grbit & 1 ? 'bar' : 'col'}"/><c:grouping val="${grouping}"/><c:varyColors val="${gr.varied ? 1 : 0}"/>${serXml}`
          + `<c:gapWidth val="${tr.u16(2)}"/>${gr.d3 ? '' : `<c:overlap val="${Math.max(-100, Math.min(100, tr.i16(0)))}"/>`}`;
        break;
      }
      case 'line': case 'area': {
        const grbit = tr.u16(0);
        const grouping = grbit & 2 ? 'percentStacked' : grbit & 1 ? 'stacked' : 'standard';
        const tag = gr.kind === 'line' ? (gr.d3 ? 'c:line3DChart' : 'c:lineChart') : gr.d3 ? 'c:area3DChart' : 'c:areaChart';
        xml = `<${tag}><c:grouping val="${grouping}"/><c:varyColors val="${gr.varied ? 1 : 0}"/>${serXml}${gr.kind === 'line' && !gr.d3 ? '<c:marker val="1"/>' : ''}`;
        break;
      }
      case 'pie': {
        const donut = tr.u16(2);
        if (donut > 0) xml = `<c:doughnutChart><c:varyColors val="1"/>${serXml}<c:firstSliceAng val="${tr.u16(0) % 360}"/><c:holeSize val="${Math.max(10, Math.min(90, donut))}"/></c:doughnutChart>`;
        else xml = `<${gr.d3 ? 'c:pie3DChart' : 'c:pieChart'}><c:varyColors val="1"/>${serXml}${gr.d3 ? '' : `<c:firstSliceAng val="${tr.u16(0) % 360}"/>`}</${gr.d3 ? 'c:pie3DChart' : 'c:pieChart'}>`;
        plot += xml;
        return;
      }
      case 'scatter':
        xml = `<c:scatterChart><c:scatterStyle val="lineMarker"/><c:varyColors val="0"/>${serXml}`;
        break;
      case 'bubble':
        xml = `<c:bubbleChart><c:varyColors val="0"/>${serXml}<c:bubbleScale val="${tr.u16(0) || 100}"/>`;
        break;
      case 'radar':
        xml = `<c:radarChart><c:radarStyle val="${gr.typeNode.t === CT.RADARAREA ? 'filled' : 'marker'}"/><c:varyColors val="0"/>${serXml}`;
        break;
    }
    const ids = parentAxes.get(gr.parent) ?? [axId++, axId++];
    const close = { bar: gr.d3 ? 'c:bar3DChart' : 'c:barChart', line: gr.d3 ? 'c:line3DChart' : 'c:lineChart', area: gr.d3 ? 'c:area3DChart' : 'c:areaChart', scatter: 'c:scatterChart', bubble: 'c:bubbleChart', radar: 'c:radarChart', pie: '' }[gr.kind];
    plot += `${xml}<c:axId val="${ids[0]}"/><c:axId val="${ids[1]}"/></${close}>`;
  });
  if (!plot) return undefined;

  // ── área de plotagem e do gráfico ──
  const ap0 = parents[0];
  const paIdx = ap0 ? ap0.kids.findIndex((k) => k.t === CT.PLOTAREA) : -1;
  const plotFrame = ap0 && paIdx >= 0 ? ap0.kids[paIdx + 1] : undefined;
  // sem PLOTAREA o Excel não pinta a área de plotagem (gráficos do Excel 2007+ salvos em .xls)
  const plotSp = plotFrame?.t === CT.FRAME
    ? `<c:spPr>${fillXml(g, kid(plotFrame, CT.AREAFORMAT), '#C0C0C0')}${lnXml(g, kid(plotFrame, CT.LINEFORMAT), '#808080')}</c:spPr>`
    : '<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>';
  // posição da área de plotagem INTERNA (sem rótulos dos eixos): retângulo do
  // AXISPARENT em SPRC (1/4000 da área do gráfico)
  const plotLayout = ap0 ? spcLayout(ap0.r.i32(2), ap0.r.i32(6), ap0.r.i32(10), ap0.r.i32(14), 'inner') : '<c:layout/>';
  const chartFrame = kid(chart, CT.FRAME);
  const chartSp = `<c:spPr>${fillXml(g, kid(chartFrame, CT.AREAFORMAT), '#FFFFFF')}${lnXml(g, kid(chartFrame, CT.LINEFORMAT), '#000000', 3175)}</c:spPr>`;

  // ── título ──
  let title = '';
  const tt = titles.get(1);
  if (tt && !(tt.r.u16(24) & 0x40)) {
    let text = seriesText(tt);
    if (text === undefined && series.length === 1) text = series[0]!.name;
    if (text) title = richTitle(text, textNodeProps(g, tt, { ...baseText, bold: true, size: baseText.size * 1.2 }), tt.r.u16(30));
  }

  // ── legenda ──
  let legend = '';
  const lgNode = groups.map((x) => kid(x.node, CT.LEGEND)).find(Boolean);
  if (lgNode) {
    const pos = ['b', 'tr', 't', 'r', 'l'][lgNode.r.u8(16)] ?? 'r';
    const lt = kid(lgNode, CT.TEXT);
    const lf = kid(lgNode, CT.FRAME);
    const lsp = lf ? `<c:spPr>${fillXml(g, kid(lf, CT.AREAFORMAT), '#FFFFFF')}${lnXml(g, kid(lf, CT.LINEFORMAT), '#000000', 3175)}</c:spPr>` : `<c:spPr>${solid('#FFFFFF')}<a:ln w="3175">${solid('#000000')}</a:ln></c:spPr>`;
    const lr = lgNode.r;
    const lay = spcLayout(lr.i32(0), lr.i32(4), lr.i32(8), lr.i32(12));
    legend = `<c:legend><c:legendPos val="${pos}"/>${lay === '<c:layout/>' ? '' : lay}<c:overlay val="0"/>${lsp}${txPr(textNodeProps(g, lt, baseText))}</c:legend>`;
  }

  // ── 3D ──
  let view3D = '';
  const d3 = groups.map((x) => kid(x.node, CT.D3)).find(Boolean);
  if (d3) {
    const r = d3.r;
    const persp = (r.u16(12) & 1) !== 0;
    view3D = `<c:view3D><c:rotX val="${Math.max(-90, Math.min(90, r.i16(2)))}"/><c:rotY val="${r.u16(0) % 360}"/>`
      + `<c:depthPercent val="${Math.max(20, Math.min(2000, r.u16(8) || 100))}"/><c:rAngAx val="${persp ? 0 : 1}"/>`
      + `${persp ? `<c:perspective val="${Math.max(0, Math.min(240, r.i16(4) * 2))}"/>` : ''}</c:view3D>`;
  }

  const sp = kid(chart, CT.SHTPROPS);
  const blanks = sp ? ['gap', 'zero', 'span'][sp.r.u8(2)] ?? 'gap' : 'gap';
  const plotVisOnly = sp ? (sp.r.u16(0) & 2) !== 0 : true;
  const autoDeleted = !title;
  return `${XML_HEAD}<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
    + '<c:roundedCorners val="0"/><c:chart>'
    + title + `<c:autoTitleDeleted val="${autoDeleted ? 1 : 0}"/>${view3D}`
    + `<c:plotArea>${plotLayout}${plot}${axesXml.join('')}${plotSp}</c:plotArea>`
    + legend + `<c:plotVisOnly val="${plotVisOnly ? 1 : 0}"/><c:dispBlanksAs val="${blanks}"/></c:chart>`
    + chartSp + txPr(baseText) + '</c:chartSpace>';
}

/**
 * Retângulo em SPRC (1/4000 da área do gráfico) → `c:layout` manual; fora do
 * intervalo plausível (posição automática gravada como 0) = layout automático.
 */
function spcLayout(x: number, y: number, w: number, h: number, target?: 'inner'): string {
  if (!(w > 40 && h > 40 && x >= 0 && y >= 0 && x + w <= 4400 && y + h <= 4400)) return '<c:layout/>';
  const f = (v: number): number => +(v / 4000).toFixed(5);
  return `<c:layout><c:manualLayout>${target ? `<c:layoutTarget val="${target}"/>` : ''}<c:xMode val="edge"/><c:yMode val="edge"/>`
    + `<c:x val="${f(x)}"/><c:y val="${f(y)}"/><c:w val="${f(w)}"/><c:h val="${f(h)}"/></c:manualLayout></c:layout>`;
}

/** Formatos da série (DATAFORMAT xi = 0xFFFF) e dos pontos. */
function seriesXml(g: XlsGlobals, s: SeriesData, kind: Kind, varied: boolean, order: number, idx: number): string {
  const dfs = kidsOf(s.node, CT.DATAFORMAT);
  const own = dfs.find((d) => d.r.u16(0) === 0xffff);
  // índice da formatação automática: iss do DATAFORMAT da série (ordem das cores)
  const n = own ? own.r.u16(4) : idx;
  const lineAuto = autoLine(g, n), fillAuto = autoFill(g, n);
  const filled = kind === 'bar' || kind === 'area' || kind === 'pie' || kind === 'bubble';
  const spOf = (df: Node | undefined, ptIndex?: number): string => {
    const fAuto = ptIndex !== undefined ? autoFill(g, ptIndex) : fillAuto;
    if (filled) return `<c:spPr>${fillXml(g, kid(df, CT.AREAFORMAT), fAuto)}${lnXml(g, kid(df, CT.LINEFORMAT), '#000000', 3175)}</c:spPr>`;
    return `<c:spPr>${lnXml(g, kid(df, CT.LINEFORMAT), lineAuto, kind === 'scatter' ? 9525 : 19050)}</c:spPr>`;
  };
  const markerOf = (df: Node | undefined): string => {
    if (kind !== 'line' && kind !== 'scatter' && kind !== 'radar') return '';
    const mf = kid(df, CT.MARKERFORMAT);
    if (!mf || (mf.r.u16(10) & 1)) {
      const sym = AUTO_MARKERS[n % AUTO_MARKERS.length]!;
      return `<c:marker><c:symbol val="${sym}"/><c:size val="5"/><c:spPr>${solid(lineAuto)}<a:ln w="9525">${solid(lineAuto)}</a:ln></c:spPr></c:marker>`;
    }
    const r = mf.r;
    const imk = r.u16(8), grbit = r.u16(10);
    const sym = MARKERS[imk] ?? 'none';
    if (sym === 'none') return '<c:marker><c:symbol val="none"/></c:marker>';
    const size = Math.max(2, Math.min(72, Math.round(r.u32(16) / 20)));
    const fill = grbit & 0x10 ? '<a:noFill/>' : solid(icvColor(g, r.u16(14)));
    const line = grbit & 0x20 ? '<a:ln><a:noFill/></a:ln>' : `<a:ln w="9525">${solid(icvColor(g, r.u16(12)))}</a:ln>`;
    return `<c:marker><c:symbol val="${sym}"/><c:size val="${size}"/><c:spPr>${fill}${line}</c:spPr></c:marker>`;
  };
  let x = `<c:ser><c:idx val="${idx}"/><c:order val="${order}"/>`;
  if (s.name !== undefined) {
    x += s.nameRef
      ? `<c:tx><c:strRef><c:f>${xmlText(s.nameRef)}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${xmlText(s.name)}</c:v></c:pt></c:strCache></c:strRef></c:tx>`
      : `<c:tx><c:v>${xmlText(s.name)}</c:v></c:tx>`;
  }
  x += spOf(own);
  if (kind === 'line' || kind === 'scatter' || kind === 'radar') x += markerOf(own);
  if (kind === 'bar' || kind === 'bubble') x += '<c:invertIfNegative val="0"/>';
  // pontos: formatação própria (DATAFORMAT xi) e cores variadas (pizza)
  const ptCount = s.vals.length;
  const pts = new Map<number, Node>();
  for (const d of dfs) if (d.r.u16(0) !== 0xffff) pts.set(d.r.u16(0), d);
  const varyPts = (kind === 'pie' || varied) && filled;
  for (let p = 0; p < ptCount && (varyPts || pts.size); p++) {
    const df = pts.get(p);
    if (!df && !varyPts) continue;
    if (!filled) {
      // linha/dispersão/radar: marcador e linha próprios do ponto
      x += `<c:dPt><c:idx val="${p}"/>${markerOf(df)}<c:spPr>${lnXml(g, kid(df, CT.LINEFORMAT) ?? kid(own, CT.LINEFORMAT), lineAuto, kind === 'scatter' ? 9525 : 19050)}</c:spPr></c:dPt>`;
      continue;
    }
    const ownArea = kid(df, CT.AREAFORMAT) ?? kid(own, CT.AREAFORMAT);
    const areaAuto = !ownArea || (ownArea.r.u16(10) & 1) !== 0;
    const fillAt = varyPts && areaAuto ? autoFill(g, p) : fillAuto;
    const pie = kid(df, CT.PIEFORMAT)?.r.u16(0);
    x += `<c:dPt><c:idx val="${p}"/>${kind === 'bar' ? '<c:invertIfNegative val="0"/>' : ''}${pie ? `<c:explosion val="${pie}"/>` : ''}`
      + `<c:spPr>${fillXml(g, kid(df, CT.AREAFORMAT) ?? kid(own, CT.AREAFORMAT), fillAt)}${lnXml(g, kid(df, CT.LINEFORMAT) ?? kid(own, CT.LINEFORMAT), '#000000', 3175)}</c:spPr></c:dPt>`;
  }
  // rótulos de dados (ATTACHEDLABEL da série)
  const al = kid(own, CT.ATTACHEDLABEL);
  if (al) {
    const f = al.r.u16(0);
    const b = (bit: number): number => ((f & bit) !== 0 ? 1 : 0);
    if (f & 0x77) {
      // pizza: rótulos fora, com linhas de chamada e quebra de linha entre nome e % (como o Excel mostra .xls)
      const pie = kind === 'pie';
      x += `<c:dLbls>${pie ? '<c:dLblPos val="bestFit"/>' : ''}<c:showLegendKey val="0"/><c:showVal val="${b(1)}"/><c:showCatName val="${b(0x10) || b(4)}"/><c:showSerName val="${b(0x40)}"/>`
        + `<c:showPercent val="${b(2) || b(4)}"/><c:showBubbleSize val="${b(0x20)}"/>${pie ? '<c:separator>\n</c:separator><c:showLeaderLines val="1"/>' : ''}</c:dLbls>`;
    }
  }
  const xy = kind === 'scatter' || kind === 'bubble';
  if (s.cats) {
    const tag = xy ? 'c:xVal' : 'c:cat';
    if (s.catsNumeric) {
      const nums = s.cats.map((v) => (typeof v === 'number' ? v : undefined));
      x += `<${tag}><c:numRef><c:f>${xmlText(s.catRef ?? '')}</c:f>${numXml(nums, s.catFmt ?? 'General')}</c:numRef></${tag}>`;
    } else {
      x += `<${tag}><c:strRef><c:f>${xmlText(s.catRef ?? '')}</c:f>${strXml(s.cats)}</c:strRef></${tag}>`;
    }
  }
  const vtag = xy ? 'c:yVal' : 'c:val';
  x += `<${vtag}><c:numRef><c:f>${xmlText(s.valRef ?? '')}</c:f>${numXml(s.vals, s.valFmt)}</c:numRef></${vtag}>`;
  if (kind === 'bubble') x += `<c:bubbleSize><c:numRef><c:f/>${numXml(s.bubbles ?? s.vals.map(() => 1), 'General')}</c:numRef></c:bubbleSize>`;
  if (kind === 'line' || kind === 'scatter') x += `<c:smooth val="${kid(own, CT.SERFMT) && (kid(own, CT.SERFMT)!.r.u16(0) & 1) ? 1 : 0}"/>`;
  return x + '</c:ser>';
}

const TICK_MARK = ['none', 'in', 'out', 'cross'];
const TICK_LBL = ['none', 'low', 'high', 'nextTo'];

/** Eixo de datas já resolvido: unidade base e unidades principal/secundária. */
interface DateAxis { base: number; major?: number; majorUnit: number; minor?: number; minorUnit: number }
const TIME_UNIT = ['days', 'months', 'years'];

/** Data serial → [ano, mês 0-based, dia] (sistema 1900 com o 29/02/1900 fictício, ou 1904). */
function serialYmd(v: number, d1904: boolean): [number, number, number] {
  let n = Math.floor(v);
  if (!d1904 && n < 61) n += 1; // antes do 29/02/1900 fictício
  const t = new Date(Date.UTC(d1904 ? 1904 : 1899, d1904 ? 0 : 11, d1904 ? 1 : 30) + n * 86400000);
  return [t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()];
}
function ymdSerial(y: number, m: number, d: number, d1904: boolean): number {
  const ms = Date.UTC(y, m, d) - Date.UTC(d1904 ? 1904 : 1899, d1904 ? 0 : 11, d1904 ? 1 : 30);
  let n = Math.round(ms / 86400000);
  if (!d1904 && n < 61) n -= 1;
  return n;
}

/**
 * Eixo de categorias com datas (AXCEXT.fDateAxis, [MS-XLS] 2.4.9): o Excel
 * põe UMA posição por unidade base (dias/meses/anos) entre o mínimo e o
 * máximo — categorias vazias somem e as datas repetidas caem na mesma
 * posição. O motor de gráficos posiciona por índice: as séries são
 * redistribuídas aqui nas posições de data (e o eixo sai como `c:dateAx`).
 */
function dateAxis(g: XlsGlobals, ext: Node, sers: SeriesData[]): DateAxis | undefined {
  const r = ext.r;
  const fl = r.u16(16);
  if (!(fl & 0x10)) return undefined;
  const ref = sers.find((s) => s.cats && s.catsNumeric && s.cats.some((v) => typeof v === 'number'));
  if (!ref) return undefined;
  // tipo automático (fAutoDate): datas só se as categorias estão formatadas como data
  const fmt = (ref.catFmt ?? 'General').replace(/"[^"]*"|\[[^\]]*\]|\\./g, '');
  if (fl & 0x80 && !(/[dmy]/i.test(fmt) && !/^general$/i.test(fmt.trim()))) return undefined;
  const base = Math.min(2, r.u16(12));
  const key = (v: number): number => {
    if (base === 0) return Math.floor(v);
    const [y, m] = serialYmd(v, g.date1904);
    return base === 1 ? y * 12 + m : y;
  };
  const nums = ref.cats!.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  let lo = Math.min(...nums.map(key)), hi = Math.max(...nums.map(key));
  if (!(fl & 1)) lo = key(r.u16(0));
  if (!(fl & 2)) hi = key(r.u16(2));
  const n = hi - lo + 1;
  if (!(n > 0 && n <= 4000)) return undefined;
  const slotSerial = (k: number): number => {
    const v = lo + k;
    if (base === 0) return v;
    return base === 1 ? ymdSerial(Math.floor(v / 12), v % 12, 1, g.date1904) : ymdSerial(v, 0, 1, g.date1904);
  };
  const cats = Array.from({ length: n }, (_, k) => slotSerial(k));
  for (const s of sers) {
    const own = s.cats && s.catsNumeric ? s.cats : ref.cats!;
    const vals: (number | undefined)[] = new Array(n).fill(undefined);
    s.vals.forEach((v, i) => {
      const d = own[i];
      if (typeof d !== 'number' || v === undefined) return;
      const k = key(d) - lo;
      if (k >= 0 && k < n) vals[k] = v;
    });
    s.vals = vals;
    s.cats = cats;
    s.catsNumeric = true;
    s.catFmt ??= ref.catFmt;
  }
  return {
    base, major: fl & 4 ? undefined : r.u16(4), majorUnit: Math.min(2, r.u16(6)),
    minor: fl & 8 ? undefined : r.u16(8), minorUnit: Math.min(2, r.u16(10)),
  };
}

function axisXml(g: XlsGlobals, _ctx: ChartContext, ax: Node | undefined, kind: 'cat' | 'val', id: number, cross: number, pos: string,
  secondary: boolean, base: TextProps, titleNode: Node | undefined, fmt: string | undefined, between: boolean, xy: boolean, date?: DateAxis): string {
  const tick = kid(ax, CT.TICK);
  const vr = kid(ax, CT.VALUERANGE);
  const cr = kid(ax, CT.CATSERRANGE);
  const tag = kind === 'cat' ? (date ? 'c:dateAx' : 'c:catAx') : 'c:valAx';
  let reversed = false, scaling = '', crosses = secondary ? '<c:crosses val="max"/>' : '<c:crosses val="autoZero"/>', units = '';
  if (vr) {
    const r = vr.r;
    const fl = r.u16(40);
    reversed = (fl & 0x40) !== 0;
    if (fl & 0x20) scaling += '<c:logBase val="10"/>';
    scaling += `<c:orientation val="${reversed ? 'maxMin' : 'minMax'}"/>`;
    if (!(fl & 2)) scaling += `<c:max val="${r.f64(8)}"/>`;
    if (!(fl & 1)) scaling += `<c:min val="${r.f64(0)}"/>`;
    if (!(fl & 0x10)) crosses = `<c:crossesAt val="${r.f64(32)}"/>`;
    if (fl & 0x80) crosses = '<c:crosses val="max"/>';
    if (!(fl & 4)) units += `<c:majorUnit val="${r.f64(16)}"/>`;
    if (!(fl & 8)) units += `<c:minorUnit val="${r.f64(24)}"/>`;
  } else {
    if (cr) {
      reversed = (cr.r.u16(6) & 4) !== 0;
      if (cr.r.u16(6) & 2) crosses = '<c:crosses val="max"/>';
    }
    scaling = `<c:orientation val="${reversed ? 'maxMin' : 'minMax'}"/>`;
  }
  // linhas: eixo (AXISLINEFORMAT 0) e grades (1 = principal, 2 = secundária)
  let axisLine = '<a:ln w="9525">' + solid('#000000') + '</a:ln>';
  let major = '', minor = '';
  const kids = ax?.kids ?? [];
  kids.forEach((k, i) => {
    if (k.t !== CT.AXISLINEFORMAT) return;
    const lf = kids[i + 1]?.t === CT.LINEFORMAT ? kids[i + 1] : undefined;
    const id2 = k.r.u16(0);
    if (id2 === 0) axisLine = lnXml(g, lf, '#000000');
    else if (id2 === 1) major = `<c:majorGridlines><c:spPr>${lnXml(g, lf, '#000000')}</c:spPr></c:majorGridlines>`;
    else if (id2 === 2) minor = `<c:minorGridlines><c:spPr>${lnXml(g, lf, '#000000')}</c:spPr></c:minorGridlines>`;
  });
  const ifmt = kid(ax, CT.IFMT);
  const numFmt = ifmt ? `<c:numFmt formatCode="${xmlText(ifmtCode(g, ifmt.r.u16(0)))}" sourceLinked="0"/>`
    : fmt ? `<c:numFmt formatCode="${xmlText(fmt)}" sourceLinked="1"/>` : '';
  const tr = tick?.r;
  const majorT = TICK_MARK[tr?.u8(0) ?? 2] ?? 'out';
  const minorT = TICK_MARK[tr?.u8(1) ?? 0] ?? 'none';
  const lblPos = TICK_LBL[tr?.u8(2) ?? 3] ?? 'nextTo';
  const fx = kid(ax, CT.FONTX);
  const tp = fx ? fontProps(g, fx.r.u16(0)) : { ...base };
  if (tr && !(tr.u16(24) & 1)) tp.color = icvColor(g, tr.u16(26));
  const rot = tr ? tr.u16(28) : 0;
  let title = '';
  if (titleNode && !(titleNode.r.u16(24) & 0x40)) {
    const text = seriesText(titleNode);
    if (text) title = richTitle(text, textNodeProps(g, titleNode, { ...base, bold: true }), titleNode.r.u16(30));
  }
  let x = `<${tag}><c:axId val="${id}"/><c:scaling>${scaling}</c:scaling><c:delete val="${ax ? 0 : 1}"/><c:axPos val="${pos}"/>${major}${minor}${title}${numFmt}`
    + `<c:majorTickMark val="${majorT}"/><c:minorTickMark val="${minorT}"/><c:tickLblPos val="${lblPos}"/>`
    + `<c:spPr><a:noFill/>${axisLine}</c:spPr>${txPr(tp, rot)}<c:crossAx val="${cross}"/>${crosses}`;
  if (kind === 'cat' && date) {
    x += `<c:auto val="0"/><c:lblOffset val="100"/><c:baseTimeUnit val="${TIME_UNIT[date.base]}"/>`
      + `${date.major ? `<c:majorUnit val="${date.major}"/><c:majorTimeUnit val="${TIME_UNIT[date.majorUnit]}"/>` : ''}`
      + `${date.minor ? `<c:minorUnit val="${date.minor}"/><c:minorTimeUnit val="${TIME_UNIT[date.minorUnit]}"/>` : ''}`;
  } else if (kind === 'cat') {
    x += '<c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/>';
    if (cr && cr.r.u16(2) > 1) x += `<c:tickLblSkip val="${cr.r.u16(2)}"/>`;
    if (cr && cr.r.u16(4) > 1) x += `<c:tickMarkSkip val="${cr.r.u16(4)}"/>`;
    x += '<c:noMultiLvlLbl val="0"/>';
  } else {
    x += `<c:crossBetween val="${xy ? 'midCat' : between ? 'between' : 'midCat'}"/>${units}`;
  }
  return x + `</${tag}>`;
}

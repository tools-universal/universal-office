/**
 * Desenhos da planilha .xls → xl/drawings/drawingN.xml (+ mídia e gráficos).
 *
 * As formas vêm do MSODRAWING concatenado (officeart.ts); cada uma liga, pelo
 * offset do seu ClientData, ao OBJ que a segue no subfluxo (ot = 8 imagem,
 * 5 gráfico, 0x19 nota…). A âncora de célula do BIFF guarda os deslocamentos
 * em 1/1024 da largura da coluna e 1/256 da altura da linha — convertidos
 * aqui para EMU com as MESMAS larguras/alturas em px da grade.
 */
import { colWidthToPx, defaultColPx, excelMdw, excelRowPx, rowPtToPx } from '../grid-metrics.js';
import { fontAt } from './styles-xml.js';
import type { XlsGlobals } from './globals.js';
import type { ObjInfo, XlsSheet } from './sheet.js';
import { BlipStore, flattenShapes, readDrawingDefaults, readShapes, type CellAnchor, type XlsShape } from './officeart.js';
import { XML_HEAD, REL, relsXml } from './xmlw.js';
import { rowHeightPt } from './sheet-xml.js';
import { chartSpaceXml, type ChartContext } from './chart.js';
import { isHiddenShape, objectXml, shapeKind, type ShapeEnv } from './shapes.js';

export interface DrawingOut {
  parts: Map<string, Uint8Array>;
  overrides: [string, string][];
  defaults: [string, string][];
}

/** Estado compartilhado entre as planilhas: contadores e mídia já gravada. */
export interface MediaState {
  n: number;
  charts: number;
  /** pib → caminho da mídia (uma imagem usada em várias planilhas sai uma vez). */
  byPib?: Map<number, string>;
  store?: BlipStore;
  /** FOPT padrão do documento (DggContainer). */
  defaults?: Map<number, number>;
  /** Acesso às células da pasta para as séries dos gráficos. */
  chartCtx?: ChartContext;
}

const EMU_PER_PX = 9525;
const MIME: Record<string, string> = {
  png: 'image/png', jpeg: 'image/jpeg', bmp: 'image/bmp', tiff: 'image/tiff', emf: 'image/x-emf', wmf: 'image/x-wmf', pict: 'image/pict',
};

/**
 * Larguras/alturas em px da grade pelas MESMAS regras do renderizador
 * (grid-metrics: MDW da fonte Normal; linha sem altura manual = auto-ajuste
 * pela maior fonte da linha — aqui sem as quebras de texto).
 */
export function gridMetrics(g: XlsGlobals, sh: XlsSheet): { colPx: (c: number) => number; rowPx: (r: number) => number } {
  const f0 = fontAt(g, 0);
  const mdw = excelMdw(f0.name, f0.height / 20) ?? 7;
  const defCol = defaultColPx(mdw, sh.stdWidth !== undefined ? sh.stdWidth / 256 : undefined, sh.defColWidth);
  const fontPx = (ixf: number): number => {
    const f = fontAt(g, g.xfs[ixf]?.font ?? 0);
    return excelRowPx(f.name, f.height / 20, f.weight >= 600);
  };
  const normalPx = excelRowPx(f0.name, f0.height / 20, f0.weight >= 600);
  const defRow = sh.defRowCustom ? rowPtToPx(rowHeightPt(sh.defRowHeight ?? 255)) : normalPx;
  return {
    colPx: (c: number): number => {
      for (const ci of sh.cols) if (c >= ci.first && c <= ci.last) return ci.hidden ? 0 : colWidthToPx(ci.width / 256, mdw);
      return defCol;
    },
    rowPx: (r: number): number => {
      const info = sh.rows.get(r);
      if (info?.hidden) return 0;
      if (info?.custom && info.height !== undefined) return rowPtToPx(rowHeightPt(info.height));
      if (!info) return defRow;
      let h = normalPx;
      for (const xf of sh.cells.get(r)?.xfs ?? []) h = Math.max(h, fontPx(xf));
      return h;
    },
  };
}

function anchorXml(a: CellAnchor, m: ReturnType<typeof gridMetrics>): string {
  const off = (frac: number, size: number): number => Math.round(frac * size * EMU_PER_PX);
  const dx1 = off(Math.min(a.dx1, 1024) / 1024, m.colPx(a.c1));
  const dy1 = off(Math.min(a.dy1, 256) / 256, m.rowPx(a.r1));
  const dx2 = off(Math.min(a.dx2, 1024) / 1024, m.colPx(a.c2));
  const dy2 = off(Math.min(a.dy2, 256) / 256, m.rowPx(a.r2));
  return `<xdr:from><xdr:col>${a.c1}</xdr:col><xdr:colOff>${dx1}</xdr:colOff><xdr:row>${a.r1}</xdr:row><xdr:rowOff>${dy1}</xdr:rowOff></xdr:from>`
    + `<xdr:to><xdr:col>${a.c2}</xdr:col><xdr:colOff>${dx2}</xdr:colOff><xdr:row>${a.r2}</xdr:row><xdr:rowOff>${dy2}</xdr:rowOff></xdr:to>`;
}

/** Tamanho em EMU da caixa da âncora (proporção para os ajustes das presets). */
function anchorSize(a: CellAnchor, m: ReturnType<typeof gridMetrics>): { w: number; h: number } {
  const span = (c1: number, d1: number, c2: number, d2: number, size: (i: number) => number, unit: number): number => {
    if (c2 - c1 > 2000) return 0;
    let px = 0;
    for (let i = c1; i < c2; i++) px += size(i);
    return (px - (Math.min(d1, unit) / unit) * size(c1) + (Math.min(d2, unit) / unit) * size(c2)) * EMU_PER_PX;
  };
  return { w: Math.max(0, span(a.c1, a.dx1, a.c2, a.dx2, m.colPx, 1024)), h: Math.max(0, span(a.r1, a.dy1, a.r2, a.dy2, m.rowPx, 256)) };
}

export function drawingParts(g: XlsGlobals, sh: XlsSheet, index: number, media: MediaState): DrawingOut | undefined {
  if (!sh.drawing && !sh.chartRecords) return undefined;
  const out: DrawingOut = { parts: new Map(), overrides: [], defaults: [] };
  const rels: { id: string; type: string; target: string }[] = [];
  const m = gridMetrics(g, sh);
  let anchors = '';
  let id = 1;
  const enc = new TextEncoder();

  /** Grava o gráfico (chartN.xml + rel); devolve o rId. */
  const chartRel = (records: XlsSheet['chartRecords']): string | undefined => {
    let xml: string | undefined;
    try { xml = records && media.chartCtx ? chartSpaceXml(media.chartCtx, records) : undefined; } catch { xml = undefined; }
    if (!xml) return undefined;
    const n = ++media.charts;
    const rid = `rId${rels.length + 1}`;
    rels.push({ id: rid, type: `${REL}/chart`, target: `../charts/chart${n}.xml` });
    out.parts.set(`xl/charts/chart${n}.xml`, enc.encode(xml));
    out.overrides.push([`/xl/charts/chart${n}.xml`, 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml']);
    return rid;
  };
  const addChart = (obj: ObjInfo | undefined, records: XlsSheet['chartRecords'], anchor: string): void => {
    const rid = chartRel(records);
    if (!rid) return;
    id++;
    anchors += `<xdr:twoCellAnchor>${anchor}<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${id}" name="Gráfico ${obj?.id ?? media.charts}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>`
      + '<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">'
      + `<c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="${rid}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
  };

  if (sh.drawing) {
    let shapes: XlsShape[] = [];
    try { shapes = readShapes(sh.drawing); } catch { shapes = []; }
    // liga forma → OBJ pelo offset (o OBJ vem logo depois do MSODRAWING da forma), grupos inclusive
    const objs = sh.objs;
    const objOf = new Map<XlsShape, ObjInfo>();
    let j = 0;
    for (const s of flattenShapes(shapes).filter((x) => x.clientDataAt !== undefined).sort((a, b) => a.clientDataAt! - b.clientDataAt!)) {
      while (j < objs.length && objs[j]!.drawingAt <= s.clientDataAt!) j++;
      const o = objs[j];
      if (o) objOf.set(s, o);
    }
    media.store ??= new BlipStore(g.drawingGroup);
    media.defaults ??= readDrawingDefaults(g.drawingGroup);
    const store = media.store;
    /** rId da imagem pib (mídia gravada uma vez por pasta, rel uma vez por desenho). */
    const imageRels = new Map<number, string>();
    const env: ShapeEnv = {
      g, defaults: media.defaults,
      objOf: (s) => objOf.get(s),
      nextId: () => ++id,
      blipBytes: (pib) => store.get(pib)?.bytes,
      imageRel: (pib) => {
        const hit = imageRels.get(pib);
        if (hit) return hit;
        let path = media.byPib?.get(pib);
        if (!path) {
          const blip = store.get(pib);
          if (!blip) return undefined;
          path = `xl/media/image${++media.n}.${blip.ext}`;
          out.parts.set(path, blip.bytes);
          out.defaults.push([blip.ext, MIME[blip.ext] ?? 'application/octet-stream']);
          (media.byPib ??= new Map()).set(pib, path);
        }
        const rid = `rId${rels.length + 1}`;
        rels.push({ id: rid, type: `${REL}/image`, target: `../media/${path.slice('xl/media/'.length)}` });
        imageRels.set(pib, rid);
        return rid;
      },
      chartRel: (obj) => chartRel(obj.chart),
    };
    for (const s of shapes) {
      if (!s.anchor || isHiddenShape(s)) continue;
      const a = s.anchor;
      if (a.c1 > 16383 || a.r1 > 1048575 || a.c2 < a.c1 || a.r2 < a.r1) continue;
      const anchor = anchorXml(a, m);
      const obj = objOf.get(s);
      const kind = shapeKind(s, obj);
      if (kind === 'chart') { addChart(obj, obj?.chart, anchor); continue; }
      if (!kind) continue;
      let xml = '';
      try { xml = objectXml(env, s, anchorSize(a, m)); } catch { xml = ''; }
      if (xml) anchors += `<xdr:twoCellAnchor${kind === 'pic' ? ' editAs="oneCell"' : ''}>${anchor}${xml}<xdr:clientData/></xdr:twoCellAnchor>`;
    }
  }
  // folha de gráfico: o gráfico ocupa a área visível inicial (sem âncora no arquivo)
  if (sh.chartRecords) {
    addChart(undefined, sh.chartRecords, '<xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>'
      + '<xdr:to><xdr:col>12</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>30</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>');
  }
  if (!anchors) return undefined;
  const path = `xl/drawings/drawing${index}.xml`;
  out.parts.set(path, enc.encode(`${XML_HEAD}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" `
    + `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors}</xdr:wsDr>`));
  out.overrides.push([`/${path}`, 'application/vnd.openxmlformats-officedocument.drawing+xml']);
  out.parts.set(`xl/drawings/_rels/drawing${index}.xml.rels`, enc.encode(relsXml(rels)));
  return out;
}


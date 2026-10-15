/**
 * Desenhos da planilha .xls → xl/drawings/drawingN.xml (+ mídia e gráficos).
 *
 * As formas vêm do MSODRAWING concatenado (officeart.ts); cada uma liga, pelo
 * offset do seu ClientData, ao OBJ que a segue no subfluxo (ot = 8 imagem,
 * 5 gráfico, 0x19 nota…). A âncora de célula do BIFF guarda os deslocamentos
 * em 1/1024 da largura da coluna e 1/256 da altura da linha — convertidos
 * aqui para EMU com as MESMAS larguras/alturas em px da grade.
 */
import { colWidthToPx, maxDigitWidth } from '../font-metrics.js';
import { fontAt } from './styles-xml.js';
import type { XlsGlobals } from './globals.js';
import type { ObjInfo, XlsSheet } from './sheet.js';
import { BlipStore, readShapes, type CellAnchor, type XlsShape } from './officeart.js';
import { XML_HEAD, REL, relsXml, xmlText } from './xmlw.js';
import { resolveRowHeights } from './sheet-xml.js';
import { chartSpaceXml, type ChartContext } from './chart.js';

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
  /** Acesso às células da pasta para as séries dos gráficos. */
  chartCtx?: ChartContext;
}

const EMU_PER_PX = 9525;
const MIME: Record<string, string> = {
  png: 'image/png', jpeg: 'image/jpeg', bmp: 'image/bmp', tiff: 'image/tiff', emf: 'image/x-emf', wmf: 'image/x-wmf', pict: 'image/pict',
};

/** Larguras/alturas em px da grade (mesmas regras do leitor/renderizador). */
export function gridMetrics(g: XlsGlobals, sh: XlsSheet): { colPx: (c: number) => number; rowPx: (r: number) => number } {
  const f0 = fontAt(g, 0);
  const mdw = maxDigitWidth(f0.name, f0.height / 20);
  const defCol = sh.stdWidth !== undefined
    ? colWidthToPx(sh.stdWidth / 256, mdw)
    : Math.ceil(((sh.defColWidth ?? 8) * mdw + 5) / 8) * 8;
  const hts = resolveRowHeights(g, sh);
  const defRow = Math.round(hts.def * 4 / 3);
  return {
    colPx: (c: number): number => {
      for (const ci of sh.cols) if (c >= ci.first && c <= ci.last) return ci.hidden ? 0 : colWidthToPx(ci.width / 256, mdw);
      return defCol;
    },
    rowPx: (r: number): number => {
      if (sh.rows.get(r)?.hidden) return 0;
      const h = hts.rows.get(r);
      return h !== undefined ? Math.round(h * 4 / 3) : defRow;
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

/** Forma oculta (fHidden do conjunto de booleanos de grupo 0x03BF)? */
function isHidden(s: XlsShape): boolean {
  const v = s.props.get(0x3bf);
  return v !== undefined && (v & 0x2) !== 0 && ((v >>> 16) & 0x2) !== 0;
}

/** Recorte (16.16, fração da imagem) → `a:srcRect` em milésimos de ponto percentual. */
function srcRect(s: XlsShape): string {
  const v = (id: number): number => { const x = s.props.get(id); return x === undefined ? 0 : Math.round(((x | 0) / 65536) * 100000); };
  const t = v(0x100), b = v(0x101), l = v(0x102), r = v(0x103);
  if (!t && !b && !l && !r) return '';
  return `<a:srcRect${l ? ` l="${l}"` : ''}${t ? ` t="${t}"` : ''}${r ? ` r="${r}"` : ''}${b ? ` b="${b}"` : ''}/>`;
}

export function drawingParts(g: XlsGlobals, sh: XlsSheet, index: number, media: MediaState): DrawingOut | undefined {
  if (!sh.drawing && !sh.chartRecords) return undefined;
  const out: DrawingOut = { parts: new Map(), overrides: [], defaults: [] };
  const rels: { id: string; type: string; target: string }[] = [];
  const m = gridMetrics(g, sh);
  let anchors = '';
  let id = 1;
  const enc = new TextEncoder();

  const addChart = (obj: ObjInfo | undefined, records: XlsSheet['chartRecords'], anchor: string): void => {
    let xml: string | undefined;
    try { xml = records && media.chartCtx ? chartSpaceXml(media.chartCtx, records) : undefined; } catch { xml = undefined; }
    if (!xml) return;
    const n = ++media.charts;
    const rid = `rId${rels.length + 1}`;
    rels.push({ id: rid, type: `${REL}/chart`, target: `../charts/chart${n}.xml` });
    out.parts.set(`xl/charts/chart${n}.xml`, enc.encode(xml));
    out.overrides.push([`/xl/charts/chart${n}.xml`, 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml']);
    id++;
    anchors += `<xdr:twoCellAnchor>${anchor}<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${id}" name="Gráfico ${obj?.id ?? n}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>`
      + '<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">'
      + `<c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="${rid}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
  };

  if (sh.drawing) {
    let shapes: XlsShape[] = [];
    try { shapes = readShapes(sh.drawing); } catch { shapes = []; }
    // liga forma → OBJ pelo offset (o OBJ vem logo depois do MSODRAWING da forma)
    const objs = sh.objs;
    let j = 0;
    const withObj = shapes
      .filter((s) => s.clientDataAt !== undefined)
      .sort((a, b) => a.clientDataAt! - b.clientDataAt!)
      .map((s) => {
        while (j < objs.length && objs[j]!.drawingAt <= s.clientDataAt!) j++;
        return { s, obj: objs[j] };
      });
    media.store ??= new BlipStore(g.drawingGroup);
    for (const { s, obj } of withObj) {
      if (!s.anchor || isHidden(s) || s.group) continue;
      const a = s.anchor;
      if (a.c1 > 16383 || a.r1 > 1048575 || a.c2 < a.c1 || a.r2 < a.r1) continue;
      const anchor = anchorXml(a, m);
      if (obj?.ot === 5) { addChart(obj, obj.chart, anchor); continue; }
      // imagem: pib (moldura de imagem) ou preenchimento de imagem (fillBlip + fillType 3)
      let pib = s.props.get(0x104);
      if (pib === undefined && s.props.get(0x180) === 3) pib = s.props.get(0x186);
      if (pib === undefined) continue;
      let path = media.byPib?.get(pib);
      if (!path) {
        const blip = media.store.get(pib);
        if (!blip) continue;
        path = `xl/media/image${++media.n}.${blip.ext}`;
        out.parts.set(path, blip.bytes);
        out.defaults.push([blip.ext, MIME[blip.ext] ?? 'application/octet-stream']);
        (media.byPib ??= new Map()).set(pib, path);
      }
      const rid = `rId${rels.length + 1}`;
      rels.push({ id: rid, type: `${REL}/image`, target: `../media/${path.slice('xl/media/'.length)}` });
      id++;
      anchors += `<xdr:twoCellAnchor editAs="oneCell">${anchor}<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="${xmlText(`Imagem ${id - 1}`)}"/>`
        + '<xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>'
        + `<xdr:blipFill><a:blip r:embed="${rid}"/>${srcRect(s)}<a:stretch><a:fillRect/></a:stretch></xdr:blipFill>`
        + '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>';
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

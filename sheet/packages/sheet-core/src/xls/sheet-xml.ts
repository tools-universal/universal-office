/**
 * Planilha do .xls (XlsSheet) → xl/worksheets/sheetN.xml (+ comentários).
 * Unidades: COLINFO/STANDARDWIDTH já vêm em 1/256 de caractere COM o
 * preenchimento — a mesma unidade do `<col width>`; ROW/DEFAULTROWHEIGHT em
 * twips (÷20 = pontos).
 */
import type { XlsGlobals } from './globals.js';
import type { NoteInfo, XlsSheet } from './sheet.js';
import { drawingParts, type MediaState } from './drawing.js';
import { XML_HEAD, NS_MAIN, NS_R, REL, cellRef, rangeRef, xmlText } from './xmlw.js';

export interface SheetParts {
  xml: string;
  rels: { id: string; type: string; target: string; external?: boolean }[];
  /** Partes extras do pacote (desenho, mídia, gráficos). */
  parts: Map<string, Uint8Array>;
  overrides: [string, string][];
  defaults: [string, string][];
}

const fmtNum = (v: number): string => String(+v.toFixed(6));

/**
 * Altura em twips → pontos AJUSTADOS AO PIXEL como o Excel mostra a 96 dpi:
 * px = floor(tw/15 + 0,1) (medido: 764/764 linhas custom do corpus — 282 tw
 * = 18,8 px → 18 px; 224 tw = 14,93 px → 15 px).
 */
export function rowHeightPt(tw: number): number {
  return Math.floor(tw / 15 + 0.1) * 0.75;
}

export function worksheetXml(g: XlsGlobals, sh: XlsSheet, index: number, media: MediaState): SheetParts {
  const out: SheetParts = { xml: '', rels: [], parts: new Map(), overrides: [], defaults: [] };
  const rid = (): string => `rId${out.rels.length + 1}`;

  // ── linhas: união das linhas com ROW e das linhas com células ──
  const rowIdx = new Set<number>(sh.rows.keys());
  for (const r of sh.cells.keys()) rowIdx.add(r);
  const rows = [...rowIdx].sort((a, b) => a - b);
  let maxR = -1, maxC = -1, minR = Infinity, minC = Infinity;
  const body: string[] = [];
  for (const r of rows) {
    const info = sh.rows.get(r);
    const acc = sh.cells.get(r);
    let attrs = `r="${r + 1}"`;
    if (info) {
      // altura gravada ajustada ao pixel; customHeight = fUnsynced (sem ele o
      // renderizador refaz o auto-ajuste pela fonte, como o Excel ao abrir)
      if (info.height !== undefined) attrs += ` ht="${fmtNum(rowHeightPt(info.height))}"`;
      if (info.custom) attrs += ' customHeight="1"';
      if (info.thickTop) attrs += ' thickTop="1"';
      if (info.thickBot) attrs += ' thickBot="1"';
      if (info.hidden) attrs += ' hidden="1"';
      if (info.xf !== undefined && info.xf > 0 && info.xf < g.xfs.length) attrs += ` s="${info.xf}" customFormat="1"`;
    }
    let cells = '';
    if (acc) {
      if (!acc.sorted) {
        // ordena por coluna; a última gravação de uma mesma coluna vence
        const order = acc.cols.map((c, i) => i).sort((a, b) => acc.cols[a]! - acc.cols[b]! || a - b);
        const xs: string[] = [];
        for (let k = 0; k < order.length; k++) {
          const i = order[k]!;
          const nx = order[k + 1];
          if (nx !== undefined && acc.cols[nx] === acc.cols[i]) continue;
          xs.push(acc.xml[i]!);
        }
        cells = xs.join('');
        for (const c of acc.cols) { if (c > maxC) maxC = c; if (c < minC) minC = c; }
      } else {
        cells = acc.xml.join('');
        const a = acc.cols[0]!, b = acc.cols[acc.cols.length - 1]!;
        if (b > maxC) maxC = b;
        if (a < minC) minC = a;
      }
      if (r > maxR) maxR = r;
      if (r < minR) minR = r;
    }
    body.push(cells ? `<row ${attrs}>${cells}</row>` : `<row ${attrs}/>`);
  }

  let x = `${XML_HEAD}<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_R}">`;
  x += `<dimension ref="${maxR >= 0 ? rangeRef(minR, minC, maxR, maxC) : 'A1'}"/>`;

  // ── vista ──
  let view = '<sheetView';
  if (sh.showFormulas) view += ' showFormulas="1"';
  if (!sh.showGrid) view += ' showGridLines="0"';
  if (!sh.showZeros) view += ' showZeros="0"';
  if (sh.rightToLeft) view += ' rightToLeft="1"';
  if (sh.selected) view += ' tabSelected="1"';
  if (sh.zoom && sh.zoom !== 100) view += ` zoomScale="${sh.zoom}" zoomScaleNormal="${sh.zoom}"`;
  view += ' workbookViewId="0"';
  const fz = sh.frozen;
  if (fz && (fz.x > 0 || fz.y > 0)) {
    const pane = fz.x && fz.y ? 'bottomRight' : fz.y ? 'bottomLeft' : 'topRight';
    view += '><pane';
    if (fz.x) view += ` xSplit="${fz.x}"`;
    if (fz.y) view += ` ySplit="${fz.y}"`;
    view += ` topLeftCell="${cellRef(Math.max(fz.top, fz.y), Math.max(fz.left, fz.x))}" activePane="${pane}" state="frozen"/></sheetView>`;
  } else view += '/>';
  x += `<sheetViews>${view}</sheetViews>`;

  // ── padrões do grid ──
  // sem STANDARDWIDTH a largura padrão sai do baseColWidth (o leitor aplica a
  // regra do Excel: base × MDW + 5 px, arredondado ao múltiplo de 8 px)
  const base = sh.defColWidth ?? 8;
  const defW = sh.stdWidth !== undefined ? ` defaultColWidth="${fmtNum(sh.stdWidth / 256)}"` : '';
  x += `<sheetFormatPr baseColWidth="${base}"${defW} defaultRowHeight="${fmtNum(rowHeightPt(sh.defRowHeight ?? 255))}"`
    + `${sh.defRowCustom ? ' customHeight="1"' : ''}${sh.defRowHidden ? ' zeroHeight="1"' : ''}/>`;

  // ── colunas ──
  if (sh.cols.length) {
    const cols = [...sh.cols].sort((a, b) => a.first - b.first);
    let cx = '';
    let lastMax = -1;
    for (const c of cols) {
      const first = Math.max(c.first, lastMax + 1);
      if (first > c.last) continue;
      lastMax = c.last;
      // até a última coluna do BIFF (IV = 255, ou 256 no registro "resto da linha"):
      // vale para a linha inteira — o .xls aberto no Excel só tem 256 colunas, então
      // não sobra coluna "sem formato" (o auto-ajuste não usa a fonte Normal como piso)
      const max = c.last >= 255 ? 16384 : c.last + 1;
      cx += `<col min="${first + 1}" max="${max}" width="${fmtNum(c.width / 256)}" customWidth="1"`;
      if (c.hidden) cx += ' hidden="1"';
      if (c.xf > 0 && c.xf < g.xfs.length) cx += ` style="${c.xf}"`;
      cx += '/>';
    }
    if (cx) x += `<cols>${cx}</cols>`;
  }

  x += body.length ? `<sheetData>${body.join('')}</sheetData>` : '<sheetData/>';

  if (sh.autoFilter) {
    const [r1, c1, r2, c2] = sh.autoFilter;
    x += `<autoFilter ref="${rangeRef(r1, c1, Math.max(r1, r2), Math.max(c1, c2))}"/>`;
  }

  if (sh.merges.length) {
    x += `<mergeCells count="${sh.merges.length}">`;
    for (const [r1, c1, r2, c2] of sh.merges) x += `<mergeCell ref="${rangeRef(r1, c1, r2, c2)}"/>`;
    x += '</mergeCells>';
  }

  for (const cf of sh.condFormats) {
    if (cf.rules.length) x += `<conditionalFormatting sqref="${cf.sqref}">${cf.rules.join('')}</conditionalFormatting>`;
  }

  if (sh.dataValidations.length) x += `<dataValidations count="${sh.dataValidations.length}">${sh.dataValidations.join('')}</dataValidations>`;

  if (sh.hyperlinks.length) {
    let hx = '';
    for (const l of sh.hyperlinks) {
      let a = `<hyperlink ref="${rangeRef(l.r1, l.c1, Math.max(l.r1, l.r2), Math.max(l.c1, l.c2))}"`;
      if (l.url) {
        const id = rid();
        out.rels.push({ id, type: `${REL}/hyperlink`, target: l.url, external: true });
        a += ` r:id="${id}"`;
      }
      if (l.location) a += ` location="${xmlText(l.location.replace(/^#/, ''))}"`;
      if (l.display) a += ` display="${xmlText(l.display)}"`;
      if (l.tooltip) a += ` tooltip="${xmlText(l.tooltip)}"`;
      hx += a + '/>';
    }
    x += `<hyperlinks>${hx}</hyperlinks>`;
  }

  const dr = drawingParts(g, sh, index, media);
  if (dr) {
    const id = rid();
    out.rels.push({ id, type: `${REL}/drawing`, target: `../drawings/drawing${index}.xml` });
    x += `<drawing r:id="${id}"/>`;
    for (const [p, d] of dr.parts) out.parts.set(p, d);
    out.overrides.push(...dr.overrides);
    out.defaults.push(...dr.defaults);
  }

  out.xml = x + '</worksheet>';
  return out;
}

/** Notas da planilha → xl/commentsN.xml. */
export function commentsXml(notes: NoteInfo[]): string {
  const authors: string[] = [];
  const aIdx = new Map<string, number>();
  let list = '';
  for (const n of notes) {
    let ai = aIdx.get(n.author);
    if (ai === undefined) { ai = authors.length; authors.push(n.author); aIdx.set(n.author, ai); }
    list += `<comment ref="${cellRef(n.row, n.col)}" authorId="${ai}"><text><t xml:space="preserve">${xmlText(n.text ?? '')}</t></text></comment>`;
  }
  return `${XML_HEAD}<comments xmlns="${NS_MAIN}"><authors>${authors.map((a) => `<author>${xmlText(a)}</author>`).join('')}</authors>`
    + `<commentList>${list}</commentList></comments>`;
}

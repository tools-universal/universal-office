/**
 * Estilos de tabela (`ppt/tableStyles.xml`) — o `<a:tblPr>` de cada `<a:tbl>`
 * referencia um `<a:tblStyle styleId="{GUID}">` cujas partes (wholeTbl,
 * band1H/band2H, firstRow, …) definem fill, cor/negrito de texto e bordas
 * default das células. O app de referência SEMPRE cria tabelas com um estilo
 * ("Estilo Médio 2 - Ênfase 1"); sem resolver isso a tabela sai branca.
 *
 * Resolução aplicada NO READ (cores já viram #RRGGBB via tema): as células
 * recebem defaults em `fill`/`txColor`/`txBold`/`borderColor`/`borderWidth`
 * apenas onde o XML da célula não especifica.
 */
import { parseXml, childElements, firstChild, textContent, type XmlElement } from './xml.js';
import { colorFromDml } from './theme.js';
import type { PptxPackage } from './package.js';
import type { Theme, Table } from './model.js';

/** Parte de estilo (wholeTbl/band1H/firstRow/…) com valores já resolvidos. */
export interface TableStylePart {
  fill?: string;
  txColor?: string;
  txBold?: boolean;
  borderColor?: string;
  borderWidth?: number; // EMU
}

export interface TableStyleDef {
  wholeTbl?: TableStylePart;
  band1H?: TableStylePart;
  band2H?: TableStylePart;
  firstRow?: TableStylePart;
  lastRow?: TableStylePart;
  firstCol?: TableStylePart;
  lastCol?: TableStylePart;
}

const PART_NAMES: [keyof TableStyleDef, string][] = [
  ['wholeTbl', 'a:wholeTbl'], ['band1H', 'a:band1H'], ['band2H', 'a:band2H'],
  ['firstRow', 'a:firstRow'], ['lastRow', 'a:lastRow'],
  ['firstCol', 'a:firstCol'], ['lastCol', 'a:lastCol'],
];

/** Parse de uma parte (`<a:wholeTbl>` etc.) -> valores resolvidos. */
function parsePart(el: XmlElement, theme: Theme): TableStylePart {
  const out: TableStylePart = {};
  const tx = firstChild(el, 'a:tcTxStyle');
  if (tx) {
    if (tx.attrs['b'] === 'on') out.txBold = true;
    // cor do texto: primeiro filho de COR direto do tcTxStyle (fora do fontRef)
    for (const c of childElements(tx)) {
      if (c.name === 'a:fontRef') continue;
      const col = colorFromDml(c, theme);
      if (col) { out.txColor = col; break; }
    }
  }
  const tc = firstChild(el, 'a:tcStyle');
  if (tc) {
    const fill = firstChild(tc, 'a:fill');
    const sf = fill ? firstChild(fill, 'a:solidFill') : undefined;
    if (sf) {
      const col = colorFromDml(childElements(sf)[0], theme);
      if (col) out.fill = col;
    }
    // bordas: v1 usa uma cor/espessura uniforme — insideH > left > top
    const bdr = firstChild(tc, 'a:tcBdr');
    if (bdr) {
      for (const side of ['a:insideH', 'a:insideV', 'a:left', 'a:top'] as const) {
        const s = firstChild(bdr, side);
        const ln = s ? firstChild(s, 'a:ln') : undefined;
        if (!ln) continue;
        const sf2 = firstChild(ln, 'a:solidFill');
        const col = sf2 ? colorFromDml(childElements(sf2)[0], theme) : undefined;
        if (col) out.borderColor = col;
        if (ln.attrs['w']) out.borderWidth = parseInt(ln.attrs['w'], 10);
        if (out.borderColor) break;
      }
    }
  }
  return out;
}

/** Lê `ppt/tableStyles.xml` e devolve o estilo com o `styleId` dado. */
export function readTableStyle(pkg: PptxPackage, styleId: string, theme: Theme): TableStyleDef | undefined {
  const xml = pkg.getPartText('ppt/tableStyles.xml');
  if (!xml) return undefined;
  let root: XmlElement;
  try { root = parseXml(xml); } catch { return undefined; }
  for (const st of childElements(root, 'a:tblStyle')) {
    if (st.attrs['styleId'] !== styleId) continue;
    const def: TableStyleDef = {};
    for (const [key, name] of PART_NAMES) {
      const el = firstChild(st, name);
      if (el) def[key] = parsePart(el, theme);
    }
    return def;
  }
  return undefined;
}

/** Extrai styleId + flags do `<a:tblPr>` (firstRow/bandRow ativos por atributo). */
export function readTblPr(tbl: XmlElement): { styleId?: string; firstRow: boolean; bandRow: boolean } {
  const pr = firstChild(tbl, 'a:tblPr');
  const out: { styleId?: string; firstRow: boolean; bandRow: boolean } = {
    firstRow: pr?.attrs['firstRow'] === '1',
    bandRow: pr?.attrs['bandRow'] === '1',
  };
  const idEl = pr ? firstChild(pr, 'a:tableStyleId') : undefined;
  if (idEl) out.styleId = textContent(idEl).trim();
  return out;
}

/**
 * Aplica o estilo nas células como DEFAULTS (o que a célula define no XML
 * vence). Banding do app de referência: primeira linha de DADOS = band1H,
 * segunda = band2H (cai no wholeTbl quando a parte não define fill), etc.
 */
export function applyTableStyle(t: Table, def: TableStyleDef, firstRowOn: boolean, bandRowOn: boolean): void {
  const whole = def.wholeTbl;
  for (let ri = 0; ri < t.rows.length; ri++) {
    const isHeader = firstRowOn && ri === 0;
    const dataIdx = ri - (firstRowOn ? 1 : 0);
    for (const cell of t.rows[ri]!.cells) {
      if (cell.hMerge || cell.vMerge) continue;
      let part: TableStylePart | undefined;
      if (isHeader) part = def.firstRow;
      else if (bandRowOn && dataIdx >= 0 && dataIdx % 2 === 0) part = def.band1H;
      else if (bandRowOn && dataIdx >= 0) part = def.band2H;
      if (cell.fill === undefined && !cell.noFill) {
        const f = part?.fill ?? whole?.fill;
        if (f) cell.fill = f;
      }
      if (cell.txColor === undefined) {
        const c = part?.txColor ?? whole?.txColor;
        if (c) cell.txColor = c;
      }
      if (cell.txBold === undefined && (part?.txBold ?? whole?.txBold)) cell.txBold = true;
      if (cell.borderColor === undefined) {
        const b = part?.borderColor ?? whole?.borderColor;
        if (b) cell.borderColor = b;
      }
      if (cell.borderWidth === undefined) {
        const w = part?.borderWidth ?? whole?.borderWidth;
        if (w) cell.borderWidth = w;
      }
    }
  }
}

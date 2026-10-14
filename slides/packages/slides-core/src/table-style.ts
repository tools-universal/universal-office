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
import { parseXml, childElements, firstChild, lastChild, textContent, type XmlElement } from './xml.js';
import { colorFromDml } from './theme.js';
import type { PptxPackage } from './package.js';
import { builtinTableStyleXml } from './table-styles-builtin.js';
import type { Theme, Table } from './model.js';

/** Parte de estilo (wholeTbl/band1H/firstRow/…) com valores já resolvidos. */
export interface TableStylePart {
  fill?: string;
  fillAlpha?: number;
  txColor?: string;
  txBold?: boolean;
  borderColor?: string;
  borderWidth?: number; // EMU
  /** Bordas por lado do `<a:tcBdr>` (null = `<a:noFill/>` explícito). */
  bdr?: Partial<Record<BdrSide, { color: string; width: number } | null>>;
}

type BdrSide = 'left' | 'right' | 'top' | 'bottom' | 'insideH' | 'insideV';
const BDR_SIDES: BdrSide[] = ['left', 'right', 'top', 'bottom', 'insideH', 'insideV'];

export interface TableStyleDef {
  tblBg?: { color: string; alpha?: number };
  wholeTbl?: TableStylePart;
  band1H?: TableStylePart;
  band2H?: TableStylePart;
  firstRow?: TableStylePart;
  lastRow?: TableStylePart;
  firstCol?: TableStylePart;
  lastCol?: TableStylePart;
}

const PART_NAMES: [Exclude<keyof TableStyleDef, 'tblBg'>, string][] = [
  ['wholeTbl', 'a:wholeTbl'], ['band1H', 'a:band1H'], ['band2H', 'a:band2H'],
  ['firstRow', 'a:firstRow'], ['lastRow', 'a:lastRow'],
  ['firstCol', 'a:firstCol'], ['lastCol', 'a:lastCol'],
];

/** Cor (e alfa) de um preenchimento: `<a:solidFill>` ou `<a:fillRef idx>` (estilo do tema com phClr; degradê = stop do meio). */
function fillColor(parent: XmlElement, theme: Theme): { color: string; alpha?: number } | undefined {
  const sf = firstChild(parent, 'a:solidFill');
  if (sf) {
    const c = childElements(sf)[0];
    const color = colorFromDml(c, theme);
    const a = c ? lastChild(c, 'a:alpha')?.attrs['val'] : undefined;
    return color ? { color, ...(a ? { alpha: parseInt(a, 10) / 100000 } : {}) } : undefined;
  }
  const ref = firstChild(parent, 'a:fillRef');
  if (!ref) return undefined;
  const ph = colorFromDml(childElements(ref)[0], theme);
  const st = theme.fillStyles?.[parseInt(ref.attrs['idx'] ?? '0', 10) - 1];
  if (!st || !ph) return ph ? { color: ph } : undefined;
  const t2: Theme = { ...theme, colors: { ...theme.colors, phClr: ph } };
  if (st.name === 'a:solidFill') { const c = colorFromDml(childElements(st)[0], t2); return c ? { color: c } : undefined; }
  if (st.name === 'a:gradFill') {
    const gs = childElements(firstChild(st, 'a:gsLst') ?? st, 'a:gs');
    const mid = gs[Math.floor(gs.length / 2)];
    const c = mid ? colorFromDml(childElements(mid)[0], t2) : undefined;
    return c ? { color: c } : undefined;
  }
  return { color: ph };
}

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
    const fc = fill ? fillColor(fill, theme) : undefined;
    if (fc) { out.fill = fc.color; if (fc.alpha !== undefined) out.fillAlpha = fc.alpha; }
    // bordas: v1 usa uma cor/espessura uniforme — insideH > left > top
    const bdr = firstChild(tc, 'a:tcBdr');
    if (bdr) {
      for (const side of BDR_SIDES) {
        const s = firstChild(bdr, 'a:' + side);
        const ln = s ? firstChild(s, 'a:ln') : undefined;
        if (!ln) {
          // <a:lnRef idx>: estilo de linha do tema (largura) na cor da referência
          const lr = s ? firstChild(s, 'a:lnRef') : undefined;
          const col = lr ? colorFromDml(childElements(lr)[0], theme) : undefined;
          if (col) (out.bdr ??= {})[side] = { color: col, width: theme.lineWidths?.[parseInt(lr!.attrs['idx'] ?? '1', 10) - 1] ?? 9525 };
          continue;
        }
        if (firstChild(ln, 'a:noFill')) { (out.bdr ??= {})[side] = null; continue; }
        const sf2 = firstChild(ln, 'a:solidFill');
        const col = sf2 ? colorFromDml(childElements(sf2)[0], theme) : undefined;
        if (col) (out.bdr ??= {})[side] = { color: col, width: ln.attrs['w'] ? parseInt(ln.attrs['w'], 10) : 12700 };
      }
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
  const fromEl = (st: XmlElement): TableStyleDef => {
    const def: TableStyleDef = {};
    const bgEl = firstChild(st, 'a:tblBg');
    const bg = bgEl ? fillColor(bgEl, theme) : undefined;
    if (bg) def.tblBg = bg;
    for (const [key, name] of PART_NAMES) {
      const el = firstChild(st, name);
      if (el) def[key] = parsePart(el, theme);
    }
    return def;
  };
  const xml = pkg.getPartText('ppt/tableStyles.xml');
  if (xml) {
    try {
      for (const st of childElements(parseXml(xml), 'a:tblStyle')) if (st.attrs['styleId'] === styleId) return fromEl(st);
    } catch { /* tableStyles.xml inválido: cai nos predefinidos */ }
  }
  // estilo PREDEFINIDO do app não gravado no arquivo
  const body = builtinTableStyleXml(styleId);
  if (!body) return undefined;
  try { return fromEl(parseXml(`<a:tblStyle xmlns:a="a">${body}</a:tblStyle>`)); } catch { return undefined; }
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
  if (def.tblBg && !t.bg) t.bg = def.tblBg;
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
        const src = part?.fill ? part : whole;
        if (src?.fill) { cell.fill = src.fill; if (src.fillAlpha !== undefined && cell.fillAlpha === undefined) cell.fillAlpha = src.fillAlpha; }
      }
      if (cell.txColor === undefined) {
        const c = part?.txColor ?? whole?.txColor;
        if (c) cell.txColor = c;
      }
      if (cell.txBold === undefined && (part?.txBold ?? whole?.txBold)) cell.txBold = true;
      // bordas POR LADO: externas (left/right/top/bottom) ou internas (insideH/V) conforme a
      // posição da célula; a parte da região (cabeçalho/faixa) vence a da tabela inteira
      const ci = t.rows[ri]!.cells.indexOf(cell), nc = t.rows[ri]!.cells.length, nr = t.rows.length;
      const want: [keyof NonNullable<typeof cell.borders>, BdrSide][] = [
        ['t', ri === 0 ? 'top' : 'insideH'], ['b', ri === nr - 1 ? 'bottom' : 'insideH'],
        ['l', ci === 0 ? 'left' : 'insideV'], ['r', ci === nc - 1 ? 'right' : 'insideV'],
      ];
      for (const [k, side] of want) {
        if (cell.borders?.[k] || cell.borderNone?.[k]) continue;
        const pb = part?.bdr && side in part.bdr ? part.bdr[side] : whole?.bdr?.[side];
        if (pb) (cell.borders ??= {})[k] = { color: pb.color, width: pb.width };
      }
    }
  }
}

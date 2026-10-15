/**
 * Estilos de tabela: o `<a:tblPr>` de cada `<a:tbl>` referencia um estilo pelo
 * GUID (`<a:tableStyleId>`) e liga as partes (firstRow, lastRow, firstCol,
 * lastCol, bandRow, bandCol). Regras medidas no app de referência (decks
 * syn-a-tbl*):
 *  - só valem as definições EMBUTIDAS do app, pelo GUID — o `ppt/tableStyles.xml`
 *    é ignorado (estilo personalizado ou GUID desconhecido = sem estilo);
 *  - sem estilo, a tabela sai como "Sem Estilo, Grade da Tabela" (grade de 1 pt tx1);
 *  - cada parte vale numa REGIÃO (a tabela, uma linha/coluna de faixa, o cabeçalho…)
 *    e as bordas da parte são as da região: left/right/top/bottom no contorno dela,
 *    insideH/insideV entre as células dela; partes posteriores na precedência
 *    sobrescrevem preenchimento, texto e bordas que definem.
 *
 * O read resolve tudo para o modelo: preenchimento/cor/negrito por célula e a grade
 * de bordas da tabela (`hLines`/`vLines`), já com as bordas explícitas das células.
 */
import { parseXml, childElements, firstChild, lastChild, textContent, type XmlElement } from './xml.js';
import { colorFromDml } from './theme.js';
import { builtinTableStyleXml, TABLE_GRID_STYLE_ID } from './table-styles-builtin.js';
import type { Theme, Table, TableCell, TableLine, Fill, ImageRef } from './model.js';

/** Preenchimento resolvido (sólido/degradê/padrão em `fill`, imagem em `image`). */
export interface CellPaint { fill?: Fill; alpha?: number; image?: ImageRef; tile?: boolean }

type BdrSide = 'left' | 'right' | 'top' | 'bottom' | 'insideH' | 'insideV';
const BDR_SIDES: BdrSide[] = ['left', 'right', 'top', 'bottom', 'insideH', 'insideV'];

/** Parte de estilo (wholeTbl/band1H/firstRow/…) com valores já resolvidos. */
export interface TableStylePart {
  /** Preenchimento (`<a:fill>`/`<a:fillRef>`); null = `<a:noFill/>` explícito. */
  paint?: CellPaint | null;
  txColor?: string;
  txBold?: boolean;
  txItalic?: boolean;
  /** Bordas do `<a:tcBdr>` (null = `<a:noFill/>` explícito). */
  bdr?: Partial<Record<BdrSide, TableLine | null>>;
}

export type TablePartName = 'wholeTbl' | 'band1H' | 'band2H' | 'band1V' | 'band2V' | 'firstCol' | 'lastCol' | 'firstRow' | 'lastRow' | 'nwCell' | 'neCell' | 'swCell' | 'seCell';

/** Ordem de aplicação (a última vence) — medida contra as 74 definições do app. */
const PRECEDENCE: TablePartName[] = ['wholeTbl', 'band1V', 'band2V', 'band1H', 'band2H', 'firstCol', 'lastCol', 'firstRow', 'lastRow', 'nwCell', 'neCell', 'swCell', 'seCell'];

export interface TableStyleDef {
  /** Fundo da tabela (`<a:tblBg>`): preenchimento e o elemento com o `<a:effectRef>`. */
  tblBg?: { paint?: CellPaint; effectEl?: XmlElement };
  parts: Partial<Record<TablePartName, TableStylePart>>;
}

/** Opções ligadas no `<a:tblPr>`. */
export interface TblFlags { firstRow: boolean; lastRow: boolean; firstCol: boolean; lastCol: boolean; bandRow: boolean; bandCol: boolean }

/** Resolve um preenchimento: `el` é o `<a:fill>` (ou contêiner com EG_FillProperties) ou o `<a:fillRef>`. */
export type PaintResolver = (el: XmlElement) => CellPaint | null | undefined;

/** Linha (`<a:ln>` ou `<a:lnRef idx>`) → TableLine; null = sem linha. */
function lineOf(el: XmlElement, theme: Theme): TableLine | null | undefined {
  if (el.name === 'a:lnRef') {
    const col = colorFromDml(childElements(el)[0], theme);
    if (!col) return undefined;
    return { color: col, width: theme.lineWidths?.[parseInt(el.attrs['idx'] ?? '1', 10) - 1] ?? 9525 };
  }
  if (firstChild(el, 'a:noFill')) return null;
  const sf = firstChild(el, 'a:solidFill');
  const c = sf ? childElements(sf)[0] : undefined;
  const color = c ? colorFromDml(c, theme) : undefined;
  if (!color) return undefined;
  const out: TableLine = { color, width: el.attrs['w'] !== undefined ? parseInt(el.attrs['w'], 10) : 12700 };
  const a = c ? lastChild(c, 'a:alpha')?.attrs['val'] : undefined;
  if (a !== undefined) out.alpha = parseInt(a, 10) / 100000;
  const dash = firstChild(el, 'a:prstDash')?.attrs['val'];
  if (dash && dash !== 'solid') out.dash = dash;
  const cmpd = el.attrs['cmpd'];
  if (cmpd && cmpd !== 'sng') out.cmpd = cmpd;
  return out;
}

/** Borda de célula (`<a:lnL>`…): TableLine, null (noFill) ou undefined (sem cor). */
export function cellLine(el: XmlElement, theme: Theme): TableLine | null | undefined {
  return lineOf(el, theme);
}

/** Parse de uma parte (`<a:wholeTbl>` etc.) → valores resolvidos. */
function parsePart(el: XmlElement, theme: Theme, paint: PaintResolver): TableStylePart {
  const out: TableStylePart = {};
  const tx = firstChild(el, 'a:tcTxStyle');
  if (tx) {
    if (tx.attrs['b'] === 'on') out.txBold = true; else if (tx.attrs['b'] === 'off') out.txBold = false;
    if (tx.attrs['i'] === 'on') out.txItalic = true; else if (tx.attrs['i'] === 'off') out.txItalic = false;
    // cor do texto: o filho de COR direto do tcTxStyle (fora do fontRef/font)
    for (const c of childElements(tx)) {
      if (c.name === 'a:fontRef' || c.name === 'a:font') continue;
      const col = colorFromDml(c, theme);
      if (col) { out.txColor = col; break; }
    }
  }
  const tc = firstChild(el, 'a:tcStyle');
  if (tc) {
    // <a:fill> e <a:fillRef> são irmãos dentro do tcStyle
    const f = firstChild(tc, 'a:fill') ?? firstChild(tc, 'a:fillRef');
    if (f) { const p = paint(f); if (p !== undefined) out.paint = p; }
    const bdr = firstChild(tc, 'a:tcBdr');
    if (bdr) {
      for (const side of BDR_SIDES) {
        const s = firstChild(bdr, 'a:' + side);
        const ln = s ? firstChild(s, 'a:ln') ?? firstChild(s, 'a:lnRef') : undefined;
        if (!ln) continue;
        const l = lineOf(ln, theme);
        if (l !== undefined) (out.bdr ??= {})[side] = l;
      }
    }
  }
  return out;
}

/** Estilo pelo GUID: SÓ as definições embutidas do app; desconhecido/ausente = grade simples. */
export function readTableStyle(styleId: string | undefined, theme: Theme, paint: PaintResolver): TableStyleDef | undefined {
  const body = (styleId ? builtinTableStyleXml(styleId) : undefined) ?? builtinTableStyleXml(TABLE_GRID_STYLE_ID);
  if (!body) return undefined;
  let st: XmlElement;
  try { st = parseXml(`<a:tblStyle xmlns:a="a">${body}</a:tblStyle>`); } catch { return undefined; }
  const def: TableStyleDef = { parts: {} };
  const bgEl = firstChild(st, 'a:tblBg');
  if (bgEl) {
    const f = firstChild(bgEl, 'a:fill') ?? firstChild(bgEl, 'a:fillRef');
    const p = f ? paint(f) : undefined;
    def.tblBg = {};
    if (p) def.tblBg.paint = p;
    if (firstChild(bgEl, 'a:effectRef')) def.tblBg.effectEl = bgEl;
  }
  for (const name of PRECEDENCE) {
    const el = firstChild(st, 'a:' + name);
    if (el) def.parts[name] = parsePart(el, theme, paint);
  }
  return def;
}

/** Extrai styleId + opções do `<a:tblPr>`. */
export function readTblPr(tbl: XmlElement): TblFlags & { styleId?: string } {
  const pr = firstChild(tbl, 'a:tblPr');
  const on = (k: string): boolean => pr?.attrs[k] === '1' || pr?.attrs[k] === 'true';
  const out: TblFlags & { styleId?: string } = {
    firstRow: on('firstRow'), lastRow: on('lastRow'), firstCol: on('firstCol'), lastCol: on('lastCol'), bandRow: on('bandRow'), bandCol: on('bandCol'),
  };
  const idEl = pr ? firstChild(pr, 'a:tableStyleId') : undefined;
  if (idEl) out.styleId = textContent(idEl).trim();
  return out;
}

/** Região (retângulo de grade inclusivo) de cada parte que vale na célula (r, c). */
interface Region { part: TablePartName; r0: number; r1: number; c0: number; c1: number }

/** Partes que valem na célula de grade (r, c), na ordem de precedência, com a região de cada uma. */
function partsAt(r: number, c: number, nR: number, nC: number, f: TblFlags): Region[] {
  const out: Region[] = [{ part: 'wholeTbl', r0: 0, r1: nR - 1, c0: 0, c1: nC - 1 }];
  const fr = f.firstRow ? 1 : 0, lr = f.lastRow ? 1 : 0, fc = f.firstCol ? 1 : 0, lc = f.lastCol ? 1 : 0;
  const isFR = f.firstRow && r === 0, isLR = f.lastRow && r === nR - 1 && nR > fr;
  const isFC = f.firstCol && c === 0, isLC = f.lastCol && c === nC - 1 && nC > fc;
  if (f.bandCol && !isFC && !isLC) {
    const k = c - fc;
    out.push({ part: k % 2 === 0 ? 'band1V' : 'band2V', r0: fr, r1: nR - 1 - lr, c0: c, c1: c });
  }
  if (f.bandRow && !isFR && !isLR) {
    const k = r - fr;
    out.push({ part: k % 2 === 0 ? 'band1H' : 'band2H', r0: r, r1: r, c0: fc, c1: nC - 1 - lc });
  }
  if (isFC) out.push({ part: 'firstCol', r0: 0, r1: nR - 1, c0: 0, c1: 0 });
  if (isLC) out.push({ part: 'lastCol', r0: 0, r1: nR - 1, c0: nC - 1, c1: nC - 1 });
  if (isFR) out.push({ part: 'firstRow', r0: 0, r1: 0, c0: 0, c1: nC - 1 });
  if (isLR) out.push({ part: 'lastRow', r0: nR - 1, r1: nR - 1, c0: 0, c1: nC - 1 });
  if (isFR && isFC) out.push({ part: 'nwCell', r0: 0, r1: 0, c0: 0, c1: 0 });
  if (isFR && isLC) out.push({ part: 'neCell', r0: 0, r1: 0, c0: nC - 1, c1: nC - 1 });
  if (isLR && isFC) out.push({ part: 'swCell', r0: nR - 1, r1: nR - 1, c0: 0, c1: 0 });
  if (isLR && isLC) out.push({ part: 'seCell', r0: nR - 1, r1: nR - 1, c0: nC - 1, c1: nC - 1 });
  out.sort((a, b) => PRECEDENCE.indexOf(a.part) - PRECEDENCE.indexOf(b.part));
  return out;
}

/** Célula de origem que cobre a posição de grade (r, c) — mesclas gridSpan/rowSpan. */
export function mergeOrigins(t: Table): { r: number; c: number }[][] {
  const nR = t.rows.length, nC = t.colWidthsEmu.length;
  const own: { r: number; c: number }[][] = Array.from({ length: nR }, (_, r) => Array.from({ length: nC }, (_, c) => ({ r, c })));
  for (let r = 0; r < nR; r++) {
    const cells = t.rows[r]!.cells;
    for (let c = 0; c < Math.min(nC, cells.length); c++) {
      const cell = cells[c]!;
      if (cell.hMerge || cell.vMerge) continue;
      const gs = Math.max(1, cell.gridSpan ?? 1), rs = Math.max(1, cell.rowSpan ?? 1);
      if (gs === 1 && rs === 1) continue;
      for (let rr = r; rr < Math.min(nR, r + rs); rr++) for (let cc = c; cc < Math.min(nC, c + gs); cc++) if (rr !== r || cc !== c) own[rr]![cc] = { r, c };
    }
  }
  return own;
}

/**
 * Aplica o estilo e resolve a grade de bordas. Células: preenchimento/cor/negrito/itálico
 * do estilo onde o XML da célula não define. Bordas (medido, syn-a-tbl1 #17/#18,
 * syn-a-tbl3 #8): a aresta entre duas células é a da célula de CIMA/ESQUERDA (`lnB`/`lnR`);
 * `lnT`/`lnL` só valem no contorno da tabela; sem borda explícita vale a do estilo.
 * Célula coberta por mescla herda as bordas da origem só na linha/coluna da origem.
 */
export function applyTableStyle(t: Table, def: TableStyleDef | undefined, f: TblFlags): void {
  const nR = t.rows.length, nC = t.colWidthsEmu.length;
  if (!nR || !nC) return;
  if (def?.tblBg?.paint && !t.bgPaint) t.bgPaint = def.tblBg.paint;
  const hL: (TableLine | null)[][] = Array.from({ length: nR + 1 }, () => Array<TableLine | null>(nC).fill(null));
  const vL: (TableLine | null)[][] = Array.from({ length: nR }, () => Array<TableLine | null>(nC + 1).fill(null));
  const parts = def?.parts ?? {};
  // valores do estilo por célula de origem (a parte de maior precedência que define vence)
  const sty = new Map<TableCell, { paint?: CellPaint | null; tx?: string; b?: boolean; i?: boolean }>();
  // parte a parte (as arestas são COMPARTILHADAS: a parte posterior vence nas duas células)
  const regsAt = Array.from({ length: nR }, (_, r) => Array.from({ length: nC }, (_, c) => partsAt(r, c, nR, nC, f)));
  for (const name of PRECEDENCE) {
    const p = parts[name];
    if (!p) continue;
    for (let r = 0; r < nR; r++) for (let c = 0; c < nC; c++) {
      const cell = t.rows[r]!.cells[c];
      const origin = cell && !cell.hMerge && !cell.vMerge;
      for (const reg of regsAt[r]![c]!) {
        if (reg.part !== name) continue;
        if (origin && cell) {
          const s = sty.get(cell) ?? {};
          if (p.paint !== undefined) s.paint = p.paint;
          if (p.txColor !== undefined) s.tx = p.txColor;
          if (p.txBold !== undefined) s.b = p.txBold;
          if (p.txItalic !== undefined) s.i = p.txItalic;
          sty.set(cell, s);
        }
        const b = p.bdr;
        if (!b) continue;
        const set = (k: BdrSide, put: (l: TableLine | null) => void): void => { if (b[k] !== undefined) put(b[k]!); };
        set(r === reg.r0 ? 'top' : 'insideH', (l) => { hL[r]![c] = l; });
        set(r === reg.r1 ? 'bottom' : 'insideH', (l) => { hL[r + 1]![c] = l; });
        set(c === reg.c0 ? 'left' : 'insideV', (l) => { vL[r]![c] = l; });
        set(c === reg.c1 ? 'right' : 'insideV', (l) => { vL[r]![c + 1] = l; });
      }
    }
  }
  // estilo → célula (o XML da célula vence)
  for (const [cell, s] of sty) {
    const sp = s.paint;
    if (sp && cell.fill === undefined && !cell.noFill && !cell.fillPaint && !cell.fillImage) {
      if (sp.fill?.type === 'solid' && sp.fill.color) { cell.fill = sp.fill.color; if (sp.alpha !== undefined && cell.fillAlpha === undefined) cell.fillAlpha = sp.alpha; }
      else if (sp.fill && sp.fill.type !== 'none') cell.fillPaint = sp.fill;
      else if (sp.image) { cell.fillImage = sp.image; if (sp.tile) cell.fillTile = true; }
    }
    if (cell.txColor === undefined && s.tx !== undefined) cell.txColor = s.tx;
    if (cell.txBold === undefined && s.b) cell.txBold = true;
    if (cell.txItalic === undefined && s.i) cell.txItalic = true;
  }
  // bordas EXPLÍCITAS: a célula de cima/esquerda é dona da aresta; lnL/lnT só no contorno
  const own = mergeOrigins(t);
  for (let r = 0; r < nR; r++) {
    for (let c = 0; c < nC; c++) {
      const o = own[r]![c]!;
      const src = o.r === r && o.c === c ? t.rows[r]!.cells[c]
        : (o.r === r || o.c === c) ? t.rows[o.r]!.cells[o.c] : undefined;
      const ex = src?.lines;
      if (!ex) continue;
      if (ex.r !== undefined) vL[r]![c + 1] = ex.r;
      if (ex.b !== undefined) hL[r + 1]![c] = ex.b;
      if (c === 0 && ex.l !== undefined) vL[r]![0] = ex.l;
      if (r === 0 && ex.t !== undefined) hL[0]![c] = ex.t;
    }
  }
  // arestas INTERNAS de uma mescla não aparecem
  for (let r = 0; r < nR; r++) {
    for (let c = 0; c < nC; c++) {
      const o = own[r]![c]!;
      if (c + 1 < nC) { const o2 = own[r]![c + 1]!; if (o2.r === o.r && o2.c === o.c) vL[r]![c + 1] = null; }
      if (r + 1 < nR) { const o2 = own[r + 1]![c]!; if (o2.r === o.r && o2.c === o.c) hL[r + 1]![c] = null; }
    }
  }
  t.hLines = hL;
  t.vLines = vL;
}

/** Imagens da tabela (fundo, células, marcadores e letras do texto) — para pré-carregar. */
export function tableImages(t: Table): ImageRef[] {
  const out: ImageRef[] = [];
  if (t.bgPaint?.image) out.push(t.bgPaint.image);
  for (const row of t.rows) for (const cell of row.cells) {
    if (cell.fillImage) out.push(cell.fillImage);
    for (const p of cell.txBody?.paragraphs ?? []) {
      if (p.bulletImage) out.push(p.bulletImage);
      for (const r of p.runs) if (r.fillImage) out.push(r.fillImage);
    }
  }
  return out;
}

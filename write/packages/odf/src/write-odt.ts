// Escritor de OpenDocument Text (.odt). Recebe um FullDocument (do docx-core)
// e devolve os bytes de um pacote ODF válido para abrir no LibreOffice/Office.
//
// Estratégia:
//  - mimetype (uncompressed, PRIMEIRA entrada — exigência do ODF spec)
//  - content.xml: office:automatic-styles + office:body/office:text
//  - styles.xml: master-style + page-layout (geometria da seção 0)
//  - META-INF/manifest.xml: lista todas as partes do ZIP
//  - Pictures/imgN.<ext>: bytes brutos das imagens
//
// Estilos automáticos: cada combinação única de RunProps/ParaProps vira uma
// entrada em office:automatic-styles ("R1", "R2", "P1", "P2"...). Texto-span
// referencia por text:style-name. Headings emitem text:h com text:outline-level.

import { writeZip } from './zip.js';
import type {
  FullDocument,
  Paragraph,
  Run,
  RunProps,
  ParaProps,
  TableBlock,
  TableCell,
  Block,
  InlineImage,
  DrawingTextbox,
  ParagraphBorders,
  BorderEdge,
  CommentInfo,
} from '@universal-office/docx-core';

export interface WriteOdtOptions {
  /** Como tratar imagens. 'embed' (default) inclui no Pictures/; 'omit' descarta. */
  images?: 'embed' | 'omit';
}

const ENC = new TextEncoder();
const MIMETYPE = 'application/vnd.oasis.opendocument.text';

interface Ctx {
  paraStyles: Map<string, string>;     // chave canonica → nome (P1, P2…)
  runStyles: Map<string, string>;      // chave canonica → nome (R1, R2…)
  paraStyleDefs: { name: string; xml: string }[];
  runStyleDefs: { name: string; xml: string }[];
  pictures: { path: string; data: Uint8Array; ext: string }[];
  options: Required<WriteOdtOptions>;
  comments: Map<number, CommentInfo>;
  /** Ids já emitidos: o reader inlina o comentário; emitimos só uma vez. */
  emittedComments: Set<number>;
  /** molduras de texto emitidas (nome único) */
  frames?: number;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function twipsToPt(t: number): string { return `${(t / 20).toFixed(2)}pt`; }
function twipsToCm(t: number): string { return `${(t / 1440 * 2.54).toFixed(4)}cm`; }
function halfPtToPt(hp: number): string { return `${(hp / 2).toFixed(2)}pt`; }
function eighthPtToPt(ep: number): number { return ep / 8; }

// ───────────────────────── estilos automáticos ─────────────────────────

function runStyleKey(p: RunProps): string {
  return [
    p.bold ? 'B' : '', p.italic ? 'I' : '', p.underline ? 'U' : '',
    p.underlineStyle ?? '', p.underlineColor ?? '',
    p.strike ? 'S' : '', p.doubleStrike ? 'DS' : '',
    p.vertAlign ?? '',
    p.szHalfPt ?? '', p.color ?? '', p.highlight ?? '',
    p.fontAscii ?? '', p.allCaps ? 'C' : '', p.smallCaps ? 'SC' : '',
    p.charSpacingTwips ?? '',
  ].join('|');
}

function getRunStyle(ctx: Ctx, p: RunProps): string {
  const key = runStyleKey(p);
  const cached = ctx.runStyles.get(key);
  if (cached) return cached;
  const name = `R${ctx.runStyleDefs.length + 1}`;
  ctx.runStyles.set(key, name);
  ctx.runStyleDefs.push({ name, xml: runStyleXml(name, p) });
  return name;
}

function runStyleXml(name: string, p: RunProps): string {
  const text: string[] = [];
  if (p.bold) text.push(`fo:font-weight="bold"`);
  if (p.italic) text.push(`fo:font-style="italic"`);
  if (p.underline) {
    const u = p.underlineStyle === 'double' ? 'double'
      : p.underlineStyle === 'dotted' ? 'dotted'
      : p.underlineStyle === 'dash' ? 'dash'
      : p.underlineStyle === 'wave' ? 'wave'
      : 'solid';
    text.push(`style:text-underline-style="${u}"`, `style:text-underline-width="auto"`);
    if (p.underlineColor) text.push(`style:text-underline-color="#${p.underlineColor}"`);
    else text.push(`style:text-underline-color="font-color"`);
  }
  if (p.strike || p.doubleStrike) {
    text.push(`style:text-line-through-style="solid"`);
    if (p.doubleStrike) text.push(`style:text-line-through-type="double"`);
  }
  if (p.vertAlign === 'superscript') text.push(`style:text-position="super 58%"`);
  else if (p.vertAlign === 'subscript') text.push(`style:text-position="sub 58%"`);
  if (p.szHalfPt) text.push(`fo:font-size="${halfPtToPt(p.szHalfPt)}"`);
  if (p.color) text.push(`fo:color="#${p.color}"`);
  if (p.highlight) text.push(`fo:background-color="${highlightToHex(p.highlight)}"`);
  if (p.fontAscii) text.push(`style:font-name="${xmlEscape(p.fontAscii)}"`);
  if (p.allCaps) text.push(`fo:text-transform="uppercase"`);
  if (p.smallCaps) text.push(`fo:font-variant="small-caps"`);
  if (p.charSpacingTwips) text.push(`fo:letter-spacing="${twipsToPt(p.charSpacingTwips)}"`);
  const attrs = text.length ? ` ${text.join(' ')}` : '';
  return `<style:style style:name="${name}" style:family="text"><style:text-properties${attrs}/></style:style>`;
}

const HIGHLIGHTS: Record<string, string> = {
  yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff',
  blue: '#0000ff', red: '#ff0000', darkBlue: '#000080', darkCyan: '#008080',
  darkGreen: '#008000', darkMagenta: '#800080', darkRed: '#800000',
  darkYellow: '#808000', darkGray: '#808080', lightGray: '#c0c0c0',
  black: '#000000', white: '#ffffff',
};
function highlightToHex(name: string): string {
  return HIGHLIGHTS[name] ?? (name.startsWith('#') ? name : `#${name}`);
}

function paraStyleKey(p: ParaProps): string {
  return [
    p.alignment ?? '',
    p.indentLeftTwips ?? '', p.indentRightTwips ?? '', p.indentFirstLineTwips ?? '',
    p.spaceBeforeTwips ?? '', p.spaceAfterTwips ?? '', p.lineTwentieths ?? '',
    p.shadingHex ?? '', p.pageBreakBefore ? 'PBB' : '',
    borderKey(p.borders),
  ].join('|');
}

function borderKey(b: ParagraphBorders | undefined): string {
  if (!b) return '';
  const e = (x: BorderEdge | undefined): string => x ? `${x.style}-${x.sizeEighthPt}-${x.color ?? ''}` : '';
  return `${e(b.top)}/${e(b.right)}/${e(b.bottom)}/${e(b.left)}`;
}

function getParaStyle(ctx: Ctx, p: ParaProps, parentStyleName?: string): string {
  const key = (parentStyleName ?? '') + '||' + paraStyleKey(p);
  const cached = ctx.paraStyles.get(key);
  if (cached) return cached;
  const name = `P${ctx.paraStyleDefs.length + 1}`;
  ctx.paraStyles.set(key, name);
  ctx.paraStyleDefs.push({ name, xml: paraStyleXml(name, p, parentStyleName) });
  return name;
}

function paraStyleXml(name: string, p: ParaProps, parentStyleName?: string): string {
  const para: string[] = [];
  if (p.alignment === 'center') para.push(`fo:text-align="center"`);
  else if (p.alignment === 'right') para.push(`fo:text-align="end"`);
  else if (p.alignment === 'both') para.push(`fo:text-align="justify"`);
  else if (p.alignment === 'left') para.push(`fo:text-align="start"`);
  if (p.indentLeftTwips) para.push(`fo:margin-left="${twipsToPt(p.indentLeftTwips)}"`);
  if (p.indentRightTwips) para.push(`fo:margin-right="${twipsToPt(p.indentRightTwips)}"`);
  if (p.indentFirstLineTwips) para.push(`fo:text-indent="${twipsToPt(p.indentFirstLineTwips)}"`);
  if (p.spaceBeforeTwips) para.push(`fo:margin-top="${twipsToPt(p.spaceBeforeTwips)}"`);
  if (p.spaceAfterTwips) para.push(`fo:margin-bottom="${twipsToPt(p.spaceAfterTwips)}"`);
  if (p.shadingHex) para.push(`fo:background-color="#${p.shadingHex}"`);
  if (p.pageBreakBefore) para.push(`fo:break-before="page"`);
  if (p.borders) {
    const b = p.borders;
    const edge = (e: BorderEdge): string =>
      `${eighthPtToPt(e.sizeEighthPt).toFixed(2)}pt ${cssStyle(e.style)} #${e.color ?? '000000'}`;
    if (b.top) para.push(`fo:border-top="${edge(b.top)}"`);
    if (b.bottom) para.push(`fo:border-bottom="${edge(b.bottom)}"`);
    if (b.left) para.push(`fo:border-left="${edge(b.left)}"`);
    if (b.right) para.push(`fo:border-right="${edge(b.right)}"`);
  }
  const attrs = para.length ? ` ${para.join(' ')}` : '';
  const parent = parentStyleName ? ` style:parent-style-name="${xmlEscape(parentStyleName)}"` : '';
  return `<style:style style:name="${name}" style:family="paragraph"${parent}><style:paragraph-properties${attrs}/></style:style>`;
}

function cssStyle(s: string): string {
  if (s === 'dashed' || s === 'dotted' || s === 'double') return s;
  if (s === 'none' || s === 'nil') return 'none';
  return 'solid';
}

// ───────────────────────── corpo (parágrafos / runs / listas / tabelas) ─────────────────────────

function annotationsForRun(run: Run, ctx: Ctx): string {
  const ids = run.props.commentIds;
  if (!ids?.length) return '';
  let out = '';
  for (const id of ids) {
    if (ctx.emittedComments.has(id)) continue;
    const c = ctx.comments.get(id);
    if (!c) continue;
    ctx.emittedComments.add(id);
    const author = c.author ? `<dc:creator>${xmlEscape(c.author)}</dc:creator>` : '';
    out += `<office:annotation>${author}<text:p>${escapeText(c.text)}</text:p></office:annotation>`;
  }
  return out;
}

function runXml(run: Run, ctx: Ctx): string {
  if (run.image) {
    if (ctx.options.images === 'omit') return '';
    return annotationsForRun(run, ctx) + imageXml(run.image, ctx);
  }
  if (run.textbox) return annotationsForRun(run, ctx) + textFrameXml(run.textbox, ctx);
  const styleName = isAllDefault(run.props) ? null : getRunStyle(ctx, run.props);
  const text = escapeText(run.text);
  if (!text) return annotationsForRun(run, ctx); // ainda emite comentário em run vazio
  const ann = annotationsForRun(run, ctx);
  if (run.props.link) {
    const styleAttr = styleName ? ` text:style-name="${styleName}"` : '';
    return `${ann}<text:a xlink:type="simple" xlink:href="${xmlEscape(run.props.link)}"><text:span${styleAttr}>${text}</text:span></text:a>`;
  }
  if (!styleName) return ann + text;
  return `${ann}<text:span text:style-name="${styleName}">${text}</text:span>`;
}

function isAllDefault(p: RunProps): boolean {
  return !p.bold && !p.italic && !p.underline && !p.strike && !p.doubleStrike
    && !p.vertAlign && p.szHalfPt === undefined && !p.color && !p.highlight
    && !p.fontAscii && !p.allCaps && !p.smallCaps && !p.charSpacingTwips;
}

/** Texto com tratamento ODF de espaços (text:s para sequências ≥2). */
function escapeText(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === '\t') { out += '<text:tab/>'; continue; }
    if (ch === '\n') { out += '<text:line-break/>'; continue; }
    if (ch === ' ') {
      // conta corrida de espaços
      let n = 1;
      while (i + n < s.length && s[i + n] === ' ') n++;
      if (n === 1) { out += ' '; }
      else { out += ` <text:s text:c="${n - 1}"/>`; i += n - 1; }
      continue;
    }
    if (ch === '&') { out += '&amp;'; continue; }
    if (ch === '<') { out += '&lt;'; continue; }
    if (ch === '>') { out += '&gt;'; continue; }
    const code = ch.charCodeAt(0);
    // XML 1.0 proíbe C0 controls exceto \t \n \r. Form feed (0x0C) é como o
    // editor codifica page breaks no run.text — vira <text:soft-page-break/>.
    if (code === 0x0C) { out += '<text:soft-page-break/>'; continue; }
    if (code < 0x20 && code !== 0x09 && code !== 0x0A && code !== 0x0D) continue; // drop
    out += ch;
  }
  return out;
}

function imageXml(img: InlineImage, ctx: Ctx): string {
  const idx = ctx.pictures.length + 1;
  const ext = img.ext.toLowerCase() === 'jpg' ? 'jpeg' : img.ext.toLowerCase();
  const path = `Pictures/img${idx}.${ext}`;
  ctx.pictures.push({ path, data: img.data, ext });
  return `<draw:frame draw:name="Image${idx}" text:anchor-type="as-char" ` +
    `svg:width="${twipsToCm(img.widthTwips)}" svg:height="${twipsToCm(img.heightTwips)}">` +
    `<draw:image xlink:href="${path}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>` +
    `</draw:frame>`;
}

/** Caixa de texto → moldura de texto (draw:frame + draw:text-box) na posição dela. */
function textFrameXml(tb: DrawingTextbox, ctx: Ctx): string {
  const out: string[] = [];
  emitBlocks(tb.blocks ?? tb.paras.map((paragraph) => ({ type: 'paragraph' as const, paragraph })), out, ctx);
  const a = tb.floating ? tb.anchor : undefined;
  const at = !a ? 'as-char' : a.posV.relativeFrom === 'page' ? 'page' : 'paragraph';
  const pos = a ? ` svg:x="${twipsToCm(a.posH.offset ?? 0)}" svg:y="${twipsToCm(a.posV.offset ?? 0)}"` : '';
  ctx.frames = (ctx.frames ?? 0) + 1;
  return `<draw:frame draw:name="Moldura${ctx.frames}" text:anchor-type="${at}"${pos} svg:width="${twipsToCm(tb.widthTwips)}" svg:height="${twipsToCm(tb.heightTwips)}">`
    + `<draw:text-box>${out.join('')}</draw:text-box></draw:frame>`;
}

function paragraphXml(para: Paragraph, ctx: Ctx, opts: {
  parentStyleName?: string;
  asHeading?: number;
}): string {
  const styleName = getParaStyle(ctx, para.props, opts.parentStyleName);
  const inner = para.runs.map((r) => runXml(r, ctx)).join('');
  if (opts.asHeading) {
    return `<text:h text:style-name="${styleName}" text:outline-level="${opts.asHeading}">${inner}</text:h>`;
  }
  return `<text:p text:style-name="${styleName}">${inner}</text:p>`;
}

function headingLevelOf(p: Paragraph): number {
  const id = p.props.styleId ?? '';
  // "Title" / "Subtitle" do app de referência não trazem número → mapeia p/ 1 e 2.
  if (/^title$/i.test(id) || /^t[íi]tulo$/i.test(id)) return 1;
  if (/^subtitle$/i.test(id) || /^subt[íi]tulo$/i.test(id)) return 2;
  const m = id.match(/(?:heading|t[íi]tulo|titulo)\s*([1-9])/i) ?? id.match(/^h([1-6])$/i);
  if (m) return Math.min(6, parseInt(m[1]!, 10));
  return 0;
}

/** Renderiza um parágrafo solto (não-lista). */
function emitParagraph(para: Paragraph, out: string[], ctx: Ctx): void {
  const lvl = headingLevelOf(para);
  if (lvl) {
    out.push(paragraphXml(para, ctx, { parentStyleName: `Heading_20_${lvl}`, asHeading: lvl }));
  } else {
    out.push(paragraphXml(para, ctx, { parentStyleName: 'Standard' }));
  }
}

/** Agrupa parágrafos contíguos com `numbering` em estruturas text:list aninhadas. */
function emitList(items: Paragraph[], out: string[], ctx: Ctx): void {
  if (!items.length) return;
  // monta a árvore por ilvl
  type Node = { paras: Paragraph[]; children: Node[]; ilvl: number; kind: 'bullet' | 'decimal' };
  const root: Node[] = [];
  // pilha que rastreia o nó aberto em cada nível
  const stack: Node[] = [];
  for (const p of items) {
    const num = p.props.numbering!;
    const node: Node = { paras: [p], children: [], ilvl: num.ilvl, kind: num.kind };
    while (stack.length && stack[stack.length - 1]!.ilvl >= num.ilvl) stack.pop();
    if (stack.length === 0) root.push(node);
    else stack[stack.length - 1]!.children.push(node);
    stack.push(node);
  }
  const styleNameFor = (kind: 'bullet' | 'decimal'): string =>
    kind === 'bullet' ? 'WNListBullet' : 'WNListNumber';
  const render = (nodes: Node[]): string => {
    if (!nodes.length) return '';
    const kind = nodes[0]!.kind;
    let xml = `<text:list text:style-name="${styleNameFor(kind)}">`;
    for (const n of nodes) {
      xml += `<text:list-item>`;
      xml += paragraphXml(n.paras[0]!, ctx, { parentStyleName: 'Standard' });
      if (n.children.length) xml += render(n.children);
      xml += `</text:list-item>`;
    }
    return xml + `</text:list>`;
  };
  out.push(render(root));
}

function tableXml(t: TableBlock, ctx: Ctx): string {
  // estilo único para a tabela + colunas com larguras (style:column-width)
  const tableName = `T${ctx.paraStyleDefs.length + ctx.runStyleDefs.length + 1}`;
  ctx.paraStyleDefs.push({
    name: tableName,
    xml: `<style:style style:name="${tableName}" style:family="table">` +
      `<style:table-properties style:width="${twipsToPt(t.gridColsTwips.reduce((a, b) => a + b, 0))}" table:align="left"/>` +
      `</style:style>`,
  });
  let xml = `<table:table table:name="${tableName}" table:style-name="${tableName}">`;
  // cols
  t.gridColsTwips.forEach((w, i) => {
    const colName = `${tableName}.C${i + 1}`;
    ctx.paraStyleDefs.push({
      name: colName,
      xml: `<style:style style:name="${colName}" style:family="table-column">` +
        `<style:table-column-properties style:column-width="${twipsToPt(w)}"/>` +
        `</style:style>`,
    });
    xml += `<table:table-column table:style-name="${colName}"/>`;
  });
  // rows
  t.rows.forEach((row) => {
    xml += `<table:table-row>`;
    row.cells.forEach((cell) => {
      xml += tableCellXml(cell, ctx, tableName);
      for (let i = 1; i < cell.gridSpan; i++) xml += `<table:covered-table-cell/>`;
    });
    xml += `</table:table-row>`;
  });
  return xml + `</table:table>`;
}

function tableCellXml(cell: TableCell, ctx: Ctx, tableName: string): string {
  const cellName = `${tableName}.A${ctx.paraStyleDefs.length}`;
  const cellAttrs: string[] = [];
  if (cell.shadingHex) cellAttrs.push(`fo:background-color="#${cell.shadingHex}"`);
  if (cell.borders) {
    const b = cell.borders;
    const edge = (e: BorderEdge): string =>
      `${eighthPtToPt(e.sizeEighthPt).toFixed(2)}pt ${cssStyle(e.style)} #${e.color ?? '000000'}`;
    if (b.top) cellAttrs.push(`fo:border-top="${edge(b.top)}"`);
    if (b.bottom) cellAttrs.push(`fo:border-bottom="${edge(b.bottom)}"`);
    if (b.left) cellAttrs.push(`fo:border-left="${edge(b.left)}"`);
    if (b.right) cellAttrs.push(`fo:border-right="${edge(b.right)}"`);
  }
  cellAttrs.push(`fo:padding="0.05cm"`);
  ctx.paraStyleDefs.push({
    name: cellName,
    xml: `<style:style style:name="${cellName}" style:family="table-cell">` +
      `<style:table-cell-properties ${cellAttrs.join(' ')}/></style:style>`,
  });
  let xml = `<table:table-cell table:style-name="${cellName}"` +
    (cell.gridSpan > 1 ? ` table:number-columns-spanned="${cell.gridSpan}"` : '') + `>`;
  // conteúdo da célula
  const body: string[] = [];
  emitBlocks([
    ...cell.paragraphs.map((p): Block => ({ type: 'paragraph', paragraph: p })),
    ...cell.tables.map((t): Block => t),
  ], body, ctx);
  xml += body.join('');
  return xml + `</table:table-cell>`;
}

function emitBlocks(blocks: Block[], out: string[], ctx: Ctx): void {
  let listBuf: Paragraph[] = [];
  const flushList = (): void => {
    if (listBuf.length) { emitList(listBuf, out, ctx); listBuf = []; }
  };
  for (const b of blocks) {
    if (b.type === 'paragraph' && b.paragraph.props.numbering) {
      listBuf.push(b.paragraph);
      continue;
    }
    flushList();
    if (b.type === 'paragraph') emitParagraph(b.paragraph, out, ctx);
    else out.push(tableXml(b, ctx));
  }
  flushList();
}

// ───────────────────────── arquivos do pacote ─────────────────────────

function styleStandardXml(): string {
  // estilo de parágrafo "Standard" minimal — necessário para parent-style cascade
  return `<style:style style:name="Standard" style:family="paragraph"><style:paragraph-properties/></style:style>` +
    `<style:style style:name="Heading_20_1" style:display-name="Heading 1" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="20pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style>` +
    `<style:style style:name="Heading_20_2" style:display-name="Heading 2" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="16pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style>` +
    `<style:style style:name="Heading_20_3" style:display-name="Heading 3" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="14pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style>` +
    `<style:style style:name="Heading_20_4" style:display-name="Heading 4" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="13pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style>` +
    `<style:style style:name="Heading_20_5" style:display-name="Heading 5" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="12pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style>` +
    `<style:style style:name="Heading_20_6" style:display-name="Heading 6" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="11pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style>` +
    // listas padrão (bullet / decimal)
    `<text:list-style style:name="WNListBullet">` +
    [0, 1, 2, 3, 4].map((lvl) =>
      `<text:list-level-style-bullet text:level="${lvl + 1}" text:bullet-char="•">` +
      `<style:list-level-properties text:list-level-position-and-space-mode="label-alignment">` +
      `<style:list-level-label-alignment text:label-followed-by="listtab" fo:margin-left="${(lvl + 1) * 0.5}cm" fo:text-indent="-0.5cm"/>` +
      `</style:list-level-properties></text:list-level-style-bullet>`,
    ).join('') +
    `</text:list-style>` +
    `<text:list-style style:name="WNListNumber">` +
    [0, 1, 2, 3, 4].map((lvl) =>
      `<text:list-level-style-number text:level="${lvl + 1}" style:num-format="1" style:num-suffix=".">` +
      `<style:list-level-properties text:list-level-position-and-space-mode="label-alignment">` +
      `<style:list-level-label-alignment text:label-followed-by="listtab" fo:margin-left="${(lvl + 1) * 0.5}cm" fo:text-indent="-0.5cm"/>` +
      `</style:list-level-properties></text:list-level-style-number>`,
    ).join('') +
    `</text:list-style>`;
}

function pageLayoutXml(doc: FullDocument): string {
  const sp = doc.sections[0]?.sectPr ?? {
    pageWidthTwips: 11906, pageHeightTwips: 16838,
    marginLeftTwips: 1417, marginRightTwips: 1417,
    marginTopTwips: 1417, marginBottomTwips: 1417,
  };
  return `<style:page-layout style:name="WNPage"><style:page-layout-properties ` +
    `fo:page-width="${twipsToCm(sp.pageWidthTwips)}" fo:page-height="${twipsToCm(sp.pageHeightTwips)}" ` +
    `fo:margin-left="${twipsToCm(sp.marginLeftTwips)}" fo:margin-right="${twipsToCm(sp.marginRightTwips)}" ` +
    `fo:margin-top="${twipsToCm(sp.marginTopTwips)}" fo:margin-bottom="${twipsToCm(sp.marginBottomTwips)}"/>` +
    `</style:page-layout>`;
}

function masterStyleXml(): string {
  return `<style:master-page style:name="Standard" style:page-layout-name="WNPage"/>`;
}

const NS = [
  `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"`,
  `xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"`,
  `xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"`,
  `xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"`,
  `xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"`,
  `xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"`,
  `xmlns:xlink="http://www.w3.org/1999/xlink"`,
  `xmlns:dc="http://purl.org/dc/elements/1.1/"`,
  `xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"`,
  `xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"`,
].join(' ');

function contentXml(doc: FullDocument, ctx: Ctx): string {
  const body: string[] = [];
  emitBlocks(doc.blocks, body, ctx);
  const autoStyles = [
    ...ctx.paraStyleDefs.map((s) => s.xml),
    ...ctx.runStyleDefs.map((s) => s.xml),
  ].join('');
  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<office:document-content ${NS} office:version="1.3">` +
    `<office:automatic-styles>${autoStyles}</office:automatic-styles>` +
    `<office:body><office:text>${body.join('')}</office:text></office:body>` +
    `</office:document-content>`;
}

function stylesXml(doc: FullDocument): string {
  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<office:document-styles ${NS} office:version="1.3">` +
    `<office:styles>${styleStandardXml()}</office:styles>` +
    `<office:automatic-styles>${pageLayoutXml(doc)}</office:automatic-styles>` +
    `<office:master-styles>${masterStyleXml()}</office:master-styles>` +
    `</office:document-styles>`;
}

function manifestXml(pictures: { path: string; ext: string }[]): string {
  const picEntries = pictures.map((p) => {
    const mime = p.ext === 'jpeg' || p.ext === 'jpg' ? 'image/jpeg'
      : p.ext === 'png' ? 'image/png'
      : p.ext === 'gif' ? 'image/gif'
      : `image/${p.ext}`;
    return `<manifest:file-entry manifest:full-path="${p.path}" manifest:media-type="${mime}"/>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">` +
    `<manifest:file-entry manifest:full-path="/" manifest:version="1.3" manifest:media-type="${MIMETYPE}"/>` +
    `<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>` +
    `<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>` +
    picEntries +
    `</manifest:manifest>`;
}

// ───────────────────────── entrypoint ─────────────────────────

export function writeOdt(doc: FullDocument, options: WriteOdtOptions = {}): Uint8Array {
  const ctx: Ctx = {
    paraStyles: new Map(),
    runStyles: new Map(),
    paraStyleDefs: [],
    runStyleDefs: [],
    pictures: [],
    options: { images: options.images ?? 'embed' },
    comments: new Map(doc.comments.map((c) => [c.id, c])),
    emittedComments: new Set(),
  };
  // content.xml DEPENDE de paraStyleDefs/runStyleDefs (mutados via emit*)
  const contentBody = contentXml(doc, ctx);
  const styles = stylesXml(doc);
  const manifest = manifestXml(ctx.pictures);

  // Ordem importa: 'mimetype' PRIMEIRO (writeZip já o emite STORED via level:0)
  const parts: Record<string, Uint8Array> = {
    'mimetype': ENC.encode(MIMETYPE),
    'content.xml': ENC.encode(contentBody),
    'styles.xml': ENC.encode(styles),
    'META-INF/manifest.xml': ENC.encode(manifest),
  };
  for (const pic of ctx.pictures) parts[pic.path] = pic.data;
  return writeZip(parts);
}

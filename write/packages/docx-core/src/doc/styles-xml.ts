/**
 * STSH → styles.xml. Estilos internos (sti < 4094) recebem o nome canônico em
 * inglês (como o Word grava: "heading 1", "header", "Normal Table"...) e
 * styleIds conhecidos ("Heading1", "Header", "TableNormal"...); os nomes
 * gravados no .doc vêm localizados ("Título 1"). Estilos do usuário mantêm o
 * nome e recebem um styleId derivado dele (só [A-Za-z0-9], como o Word).
 */
import { pPrInner, rPrInner, lcidTag, brcXml, shdXml, type PropCtx } from './ooxml-props.js';
import type { DocReader } from './reader.js';
import { prls, sgcOf } from './sprm.js';
import { ISTD_NIL, type DocStyle } from './stsh.js';
import { applyTap, newTap } from './props.js';
import { el, XML_DECL, NS, attrs } from './xmlw.js';

/** Nomes dos estilos internos por sti ([ECMA-376] 17.7.4.9, "Index within Built-in Styles"). */
export const STI_NAMES: string[] = [
  'Normal', 'heading 1', 'heading 2', 'heading 3', 'heading 4', 'heading 5', 'heading 6', 'heading 7',
  'heading 8', 'heading 9', 'index 1', 'index 2', 'index 3', 'index 4', 'index 5', 'index 6', 'index 7',
  'index 8', 'index 9', 'toc 1', 'toc 2', 'toc 3', 'toc 4', 'toc 5', 'toc 6', 'toc 7', 'toc 8', 'toc 9',
  'Normal Indent', 'footnote text', 'annotation text', 'header', 'footer', 'index heading', 'caption',
  'table of figures', 'envelope address', 'envelope return', 'footnote reference', 'annotation reference',
  'line number', 'page number', 'endnote reference', 'endnote text', 'table of authorities', 'macro',
  'toa heading', 'List', 'List Bullet', 'List Number', 'List 2', 'List 3', 'List 4', 'List 5',
  'List Bullet 2', 'List Bullet 3', 'List Bullet 4', 'List Bullet 5', 'List Number 2', 'List Number 3',
  'List Number 4', 'List Number 5', 'Title', 'Closing', 'Signature', 'Default Paragraph Font', 'Body Text',
  'Body Text Indent', 'List Continue', 'List Continue 2', 'List Continue 3', 'List Continue 4',
  'List Continue 5', 'Message Header', 'Subtitle', 'Salutation', 'Date', 'Body Text First Indent',
  'Body Text First Indent 2', 'Note Heading', 'Body Text 2', 'Body Text 3', 'Body Text Indent 2',
  'Body Text Indent 3', 'Block Text', 'Hyperlink', 'FollowedHyperlink', 'Strong', 'Emphasis',
  'Document Map', 'Plain Text', 'E-mail Signature', 'HTML Top of Form', 'HTML Bottom of Form',
  'Normal (Web)', 'HTML Acronym', 'HTML Address', 'HTML Cite', 'HTML Code', 'HTML Definition',
  'HTML Keyboard', 'HTML Preformatted', 'HTML Sample', 'HTML Typewriter', 'HTML Variable', 'Normal Table',
  'annotation subject', 'No List', 'Outline List 1', 'Outline List 2', 'Outline List 3', 'Table Simple 1',
  'Table Simple 2', 'Table Simple 3', 'Table Classic 1', 'Table Classic 2', 'Table Classic 3',
  'Table Classic 4', 'Table Colorful 1', 'Table Colorful 2', 'Table Colorful 3', 'Table Columns 1',
  'Table Columns 2', 'Table Columns 3', 'Table Columns 4', 'Table Columns 5', 'Table Grid 1',
  'Table Grid 2', 'Table Grid 3', 'Table Grid 4', 'Table Grid 5', 'Table Grid 6', 'Table Grid 7',
  'Table Grid 8', 'Table List 1', 'Table List 2', 'Table List 3', 'Table List 4', 'Table List 5',
  'Table List 6', 'Table List 7', 'Table List 8', 'Table 3D effects 1', 'Table 3D effects 2',
  'Table 3D effects 3', 'Table Contemporary', 'Table Elegant', 'Table Professional', 'Table Subtle 1',
  'Table Subtle 2', 'Table Web 1', 'Table Web 2', 'Table Web 3', 'Balloon Text', 'Table Grid', 'Table Theme',
  // Word 2007+ (sti 156-266; ordem conferida contra o .docx do Word)
  'Placeholder Text', 'No Spacing', 'Light Shading', 'Light List', 'Light Grid', 'Medium Shading 1',
  'Medium Shading 2', 'Medium List 1', 'Medium List 2', 'Medium Grid 1', 'Medium Grid 2', 'Medium Grid 3',
  'Dark List', 'Colorful Shading', 'Colorful List', 'Colorful Grid',
  ...accent(1, 0, 6), 'Revision', 'List Paragraph', 'Quote', 'Intense Quote', ...accent(1, 6, 14),
  ...accent(2), ...accent(3), ...accent(4), ...accent(5), ...accent(6),
  'Subtle Emphasis', 'Intense Emphasis', 'Subtle Reference', 'Intense Reference', 'Book Title', 'Bibliography', 'TOC Heading',
];

/** Estilos de tabela com ênfase (14 por cor de ênfase). */
function accent(n: number, from = 0, to = 14): string[] {
  const base = ['Light Shading', 'Light List', 'Light Grid', 'Medium Shading 1', 'Medium Shading 2', 'Medium List 1',
    'Medium List 2', 'Medium Grid 1', 'Medium Grid 2', 'Medium Grid 3', 'Dark List', 'Colorful Shading', 'Colorful List', 'Colorful Grid'];
  return base.slice(from, to).map((b) => `${b} Accent ${n}`);
}

/** styleIds do Word (inglês) que não saem do nome só tirando espaços. */
const SPECIAL_IDS: Record<string, string> = {
  'annotation text': 'CommentText', 'annotation reference': 'CommentReference', 'annotation subject': 'CommentSubject',
  'Normal Table': 'TableNormal', 'table of figures': 'TableofFigures', 'table of authorities': 'TableofAuthorities',
  'toa heading': 'TOAHeading', 'Normal (Web)': 'NormalWeb', 'E-mail Signature': 'E-mailSignature',
  'macro': 'MacroText', 'List': 'List', 'line number': 'LineNumber',
};

function englishId(name: string): string {
  if (SPECIAL_IDS[name]) return SPECIAL_IDS[name]!;
  const toc = /^toc (\d)$/.exec(name);
  if (toc) return `TOC${toc[1]}`;
  return name.split(/\s+/).map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : '')).join('').replace(/[^A-Za-z0-9-]/g, '');
}

/** Nome exibido no styles.xml. */
/** sti esparsos depois de 266 (Word 2013+), conferidos no Word. */
const STI_EXTRA: Record<number, string> = { 374: 'Unresolved Mention' };

export function styleName(st: DocStyle): string {
  if (st.sti < STI_NAMES.length) return STI_NAMES[st.sti]!;
  if (STI_EXTRA[st.sti]) return STI_EXTRA[st.sti]!;
  return st.name || `Estilo ${st.istd}`;
}

export function styleIdMap(styles: (DocStyle | undefined)[]): Map<number, string> {
  const ids = new Map<number, string>();
  const used = new Set<string>();
  // estilos internos primeiro (ids "reservados")
  const order = [...styles.filter(Boolean)] as DocStyle[];
  order.sort((a, b) => (a.sti < STI_NAMES.length ? 0 : 1) - (b.sti < STI_NAMES.length ? 0 : 1) || a.istd - b.istd);
  for (const st of order) {
    let base = st.sti < STI_NAMES.length || STI_EXTRA[st.sti] ? englishId(styleName(st)) : (st.name || '').replace(/[^A-Za-z0-9-]/g, '');
    let id = base;
    if (!base) {
      // nome sem caracteres ASCII (ou vazio): o Word usa "a", "a0", "a1"...
      id = 'a';
      for (let k = 0; used.has(id.toLowerCase()); k++) id = `a${k}`;
    } else {
      let k = 1;
      while (used.has(id.toLowerCase())) id = `${base}${++k}`;
    }
    used.add(id.toLowerCase());
    ids.set(st.istd, id);
  }
  return ids;
}

function styleXml(r: DocReader, st: DocStyle, ids: Map<number, string>, ctx: PropCtx, numIdOf: (n: number) => number): string {
  const type = ['', 'paragraph', 'character', 'table', 'numbering'][st.stk] ?? 'paragraph';
  const isDefault = (st.stk === 1 && st.sti === 0) || (st.stk === 2 && st.sti === 65) || (st.stk === 3 && st.sti === 105) || (st.stk === 4 && st.sti === 107);
  // sem nome gravado (estilo do usuário): o Word omite w:name
  let x = st.sti >= STI_NAMES.length && !st.name ? '' : el('w:name', { 'w:val': styleName(st) });
  if (st.aliases) x += el('w:aliases', { 'w:val': st.aliases });
  if (st.istdBase !== ISTD_NIL && ids.has(st.istdBase) && st.istdBase !== st.istd) x += el('w:basedOn', { 'w:val': ids.get(st.istdBase) });
  if (st.stk === 1 && st.istdNext !== st.istd && st.istdNext !== ISTD_NIL && ids.has(st.istdNext)) x += el('w:next', { 'w:val': ids.get(st.istdNext) });
  if (st.istdLink !== undefined && ids.has(st.istdLink)) x += el('w:link', { 'w:val': ids.get(st.istdLink) });
  if (st.autoRedef) x += '<w:autoRedefine/>';
  if (st.hidden) x += '<w:hidden/>';
  if (st.semiHidden) x += '<w:semiHidden/>';
  if (st.unhideWhenUsed) x += '<w:unhideWhenUsed/>';
  if (st.qFormat) x += '<w:qFormat/>';
  if (st.locked) x += '<w:locked/>';
  if (st.stk === 1 || st.stk === 3 || st.stk === 4) {
    const res = r.styles.resolve(st.istd);
    const parent = st.istdBase !== ISTD_NIL && r.stsh.styles[st.istdBase] ? r.styles.resolve(st.istdBase) : undefined;
    const ppr = pPrInner(res.pap, res.ownPap, ctx, { withStyle: false, baseTabs: parent?.pap.tabs, numId: numIdOf });
    if (ppr) x += `<w:pPr>${ppr}</w:pPr>`;
    if (st.stk !== 4) {
      const rpr = rPrInner(res.chp, res.ownChp, ctx, false);
      if (rpr) x += `<w:rPr>${rpr}</w:rPr>`;
    }
    if (st.stk === 3) {
      const tbl = tableStylePr(st);
      if (tbl) x += `<w:tblPr>${tbl}</w:tblPr>`;
    }
  } else if (st.stk === 2) {
    const { chp, own } = r.styles.resolveChar(st.istd);
    const rpr = rPrInner(chp, own, ctx, false);
    if (rpr) x += `<w:rPr>${rpr}</w:rPr>`;
  }
  return el('w:style', {
    'w:type': type,
    'w:default': isDefault ? '1' : undefined,
    'w:customStyle': st.sti >= STI_NAMES.length && !STI_EXTRA[st.sti] ? '1' : undefined,
    'w:styleId': ids.get(st.istd),
  }, x);
}

/** TAPX de estilo de tabela → w:tblPr (recuo, bordas, margens). */
function tableStylePr(st: DocStyle): string {
  if (!st.tapx) return '';
  const tap = newTap();
  for (const p of prls(st.tapx)) if (sgcOf(p.sprm) === 5) applyTap(tap, p);
  let x = '';
  const ind = tap.widthIndent && tap.widthIndent.fts === 3 ? tap.widthIndent.w : tap.dxaLeft;
  if (ind !== undefined) x += el('w:tblInd', { 'w:w': ind, 'w:type': 'dxa' });
  if (tap.bordersSet) {
    const sides = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'] as const;
    x += `<w:tblBorders>${sides.map((s) => brcXml(`w:${s}`, tap.borders[s])).join('')}</w:tblBorders>`;
  }
  if (tap.shdTable) x += shdXml(tap.shdTable);
  const p = tap.padding;
  if (p.top !== undefined || p.left !== undefined || p.bottom !== undefined || p.right !== undefined) {
    let m = '';
    if (p.top !== undefined) m += el('w:top', { 'w:w': p.top, 'w:type': 'dxa' });
    if (p.left !== undefined) m += el('w:left', { 'w:w': p.left, 'w:type': 'dxa' });
    if (p.bottom !== undefined) m += el('w:bottom', { 'w:w': p.bottom, 'w:type': 'dxa' });
    if (p.right !== undefined) m += el('w:right', { 'w:w': p.right, 'w:type': 'dxa' });
    x += `<w:tblCellMar>${m}</w:tblCellMar>`;
  }
  return x;
}

export function buildStyles(r: DocReader, ctx: PropCtx, ids: Map<number, string>, numIdOf: (n: number) => number): string {
  const f = r.stsh.stshif;
  const font = (ftc: number): string | undefined => r.fonts[ftc]?.name;
  // docDefaults: fontes padrão do Stshif; idioma do estilo Normal (o Word o move para cá)
  const normal = r.styles.resolve(0).chp;
  const lang = el('w:lang', {
    'w:val': lcidTag(normal.lid) ?? 'pt-BR',
    'w:eastAsia': lcidTag(normal.lidFE) ?? lcidTag(normal.lid) ?? 'pt-BR',
    'w:bidi': lcidTag(normal.lidBi && normal.lidBi !== 0x400 ? normal.lidBi : 0x0401) ?? 'ar-SA',
  });
  const rFonts = el('w:rFonts', { 'w:ascii': font(f.ftcAsci), 'w:eastAsia': font(f.ftcFE), 'w:hAnsi': font(f.ftcOther), 'w:cs': font(f.ftcBi) });
  let x = `<w:docDefaults><w:rPrDefault><w:rPr>${rFonts}${lang}</w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults>`;
  for (const st of r.stsh.styles) {
    if (!st) continue;
    x += styleXml(r, st, ids, ctx, numIdOf);
  }
  // .doc antigos (Word 97/2000) não trazem estes estilos padrão; o Word os cria ao salvar
  const has = (sti: number, stk: number): boolean => r.stsh.styles.some((s) => s && s.sti === sti && s.stk === stk);
  const used = new Set([...ids.values()].map((v) => v.toLowerCase()));
  const freeId = (base: string): string => { let id = base; for (let k = 2; used.has(id.toLowerCase()); k++) id = `${base}${k}`; used.add(id.toLowerCase()); return id; };
  if (!has(65, 2)) x += `<w:style w:type="character" w:default="1" w:styleId="${freeId('DefaultParagraphFont')}"><w:name w:val="Default Paragraph Font"/><w:semiHidden/></w:style>`;
  if (!has(105, 3)) {
    x += `<w:style w:type="table" w:default="1" w:styleId="${freeId('TableNormal')}"><w:name w:val="Normal Table"/><w:semiHidden/>` +
      '<w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/>' +
      '<w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>';
  }
  if (!has(107, 4)) x += `<w:style w:type="numbering" w:default="1" w:styleId="${freeId('NoList')}"><w:name w:val="No List"/><w:semiHidden/></w:style>`;
  return `${XML_DECL}<w:styles${attrs({ 'xmlns:w': NS.w, 'xmlns:r': NS.r })}>${x}</w:styles>`;
}

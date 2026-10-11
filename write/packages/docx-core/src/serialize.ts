import { DocxPackage } from './package.js';
import { EMU_PER_TWIP, type DocumentModel, type Paragraph, type Run, type SectPr, type BorderEdge } from './document.js';
import type { TableBlock, TableBorders, Block } from './fulldoc.js';

/**
 * Serializa o DocumentModel de volta para word/document.xml, seguindo a
 * ordem canônica de elementos observada no word-lab (FINDINGS.md):
 *   rPr: rFonts → b → i → caps → smallCaps → strike → color → sz →
 *        highlight → u → vertAlign
 *   pPr: pStyle → numPr → spacing → ind → jc
 * Gera word/numbering.xml (numId 1001 bullet / 1002 decimal) se houver listas.
 *
 * NOTA round-trip: partes não relacionadas ficam intactas. document.xml é
 * regenerado — a fase atual perde elementos que o modelo ainda não representa
 * (bookmarks, campos...). TODO: mutação incremental da árvore XML original.
 */

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string): string => esc(s).replace(/"/g, '&quot;');

/** Coletadas durante a serialização; viram media parts + rels. */
interface MediaOut { rid: string; path: string; data: Uint8Array; ext: string }
let mediaOut: MediaOut[] = [];
let drawingId = 0;

function drawingXml(run: Run): string {
  const img = run.image!;
  const n = ++drawingId;
  const rid = `rIdWnImg${n}`;
  mediaOut.push({ rid, path: `word/media/wnimage${n}.${img.ext}`, data: img.data, ext: img.ext });
  const cx = Math.round(img.widthTwips * EMU_PER_TWIP);
  const cy = Math.round(img.heightTwips * EMU_PER_TWIP);
  return (
    `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${cx}" cy="${cy}"/>` +
    `<wp:docPr id="${n}" name="Imagem ${n}"/>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:nvPicPr><pic:cNvPr id="${n}" name="Imagem ${n}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`
  );
}

/** Atualiza a GEOMETRIA (tamanho/posição) do <w:drawing> cru a partir dos
 *  valores atuais do objeto — reflete mover/redimensionar feitos na UI mantendo
 *  o resto do shape intacto. Idempotente quando nada mudou. */
function patchDrawingGeometry(
  raw: string,
  obj: { widthTwips: number; heightTwips: number; offsetXTwips?: number; offsetYTwips?: number },
): string {
  const cx = Math.round(obj.widthTwips * EMU_PER_TWIP);
  const cy = Math.round(obj.heightTwips * EMU_PER_TWIP);
  let out = raw
    .replace(/<wp:extent\b[^>]*\/>/, (m) => m.replace(/cx="\d+"/, `cx="${cx}"`).replace(/cy="\d+"/, `cy="${cy}"`))
    .replace(/<a:ext\b[^>]*\/>/g, (m) => m.replace(/cx="\d+"/, `cx="${cx}"`).replace(/cy="\d+"/, `cy="${cy}"`));
  if (obj.offsetXTwips !== undefined) {
    const ex = Math.round(obj.offsetXTwips * EMU_PER_TWIP);
    out = out.replace(/<wp:positionH\b[^>]*>[\s\S]*?<\/wp:positionH>/, (b) =>
      b.replace(/(<wp:posOffset>)-?\d+(<\/wp:posOffset>)/, `$1${ex}$2`));
  }
  if (obj.offsetYTwips !== undefined) {
    const ey = Math.round(obj.offsetYTwips * EMU_PER_TWIP);
    out = out.replace(/<wp:positionV\b[^>]*>[\s\S]*?<\/wp:positionV>/, (b) =>
      b.replace(/(<wp:posOffset>)-?\d+(<\/wp:posOffset>)/, `$1${ey}$2`));
  }
  return out;
}

/** Reemite o <w:drawing> CRU trocando o conteúdo de CADA <w:txbxContent> pelos
 *  parágrafos (possivelmente editados). Preserva shape/âncora/fill do original;
 *  campos (PAGE/NUMPAGES) voltam como fldSimple via paraXml. */
function drawingWithParas(rawDrawingXml: string, paras: Paragraph[]): string {
  const inner = paras.map(paraXml).join('');
  return rawDrawingXml.replace(
    /<w:txbxContent\b[^>]*>[\s\S]*?<\/w:txbxContent>/g,
    (m) => `${/^<w:txbxContent\b[^>]*>/.exec(m)![0]}${inner}</w:txbxContent>`,
  );
}

function runXml(run: Run): string {
  if (run.custom) {
    const type = run.custom.type;
    if (!/^[a-zA-Z0-9._-]+$/.test(type)) {
      throw new Error(`tipo de inline customizado inválido: ${type}`);
    }
    const json = JSON.stringify(run.custom.data);
    if (json === undefined) throw new Error(`dados do inline "${type}" não são serializáveis em JSON`);
    const tag = `wordnext:inline:${type}:${encodeURIComponent(json)}`;
    const fallbackRun: Run = {
      text: run.custom.fallbackText,
      props: run.props,
    };
    return (
      `<w:sdt><w:sdtPr>` +
      `<w:alias w:val="${escAttr(run.custom.fallbackText)}"/>` +
      `<w:tag w:val="${escAttr(tag)}"/>` +
      `<w:lock w:val="sdtLocked"/>` +
      `</w:sdtPr><w:sdtContent>${runXml(fallbackRun)}</w:sdtContent></w:sdt>`
    );
  }
  if (run.image) {
    // imagem original: reemite o <w:drawing> CRU (preserva âncora/flutuante e
    // reusa a mídia/rels existentes), com a geometria atual (mover/redimensionar).
    // Só reconstrói para imagens NOVAS.
    if (run.image.rawDrawingXml) {
      return `<w:r>${patchDrawingGeometry(run.image.rawDrawingXml, run.image)}</w:r>`;
    }
    return `<w:r>${drawingXml(run)}</w:r>`;
  }
  // caixa de texto: reemite o <w:drawing> CRU com a geometria atual, trocando só
  // o <w:txbxContent> pelos parágrafos (possivelmente editados). Sem o cru (caixa
  // criada por nós), emite nada — evitando XML de shape inválido.
  if (run.textbox) {
    if (run.textbox.rawDrawingXml) {
      const geo = patchDrawingGeometry(run.textbox.rawDrawingXml, run.textbox);
      return `<w:r>${drawingWithParas(geo, run.textbox.paras)}</w:r>`;
    }
    return '';
  }
  const p = run.props;
  const rpr: string[] = [];
  if (p.fontAscii) {
    rpr.push(`<w:rFonts w:ascii="${escAttr(p.fontAscii)}" w:hAnsi="${escAttr(p.fontAscii)}" w:cs="${escAttr(p.fontAscii)}"/>`);
  }
  if (p.bold) rpr.push('<w:b/>');
  if (p.italic) rpr.push('<w:i/>');
  if (p.allCaps) rpr.push('<w:caps/>');
  if (p.smallCaps) rpr.push('<w:smallCaps/>');
  if (p.strike) rpr.push('<w:strike/>');
  if (p.doubleStrike) rpr.push('<w:dstrike/>');
  if (p.color) rpr.push(`<w:color w:val="${escAttr(p.color)}"/>`);
  if (p.charSpacingTwips !== undefined && p.charSpacingTwips !== 0) {
    rpr.push(`<w:spacing w:val="${p.charSpacingTwips}"/>`);
  }
  if (p.szHalfPt !== undefined) {
    rpr.push(`<w:sz w:val="${p.szHalfPt}"/><w:szCs w:val="${p.szHalfPt}"/>`);
  }
  if (p.highlight) rpr.push(`<w:highlight w:val="${escAttr(p.highlight)}"/>`);
  if (p.underline) {
    const uColor = p.underlineColor ? ` w:color="${escAttr(p.underlineColor)}"` : '';
    rpr.push(`<w:u w:val="${p.underlineStyle ?? 'single'}"${uColor}/>`);
  }
  if (p.vertAlign) rpr.push(`<w:vertAlign w:val="${p.vertAlign}"/>`);

  const parts: string[] = [];
  if (rpr.length) parts.push(`<w:rPr>${rpr.join('')}</w:rPr>`);
  const segments = run.text.split(/(\t|\n|\f|\u000B|\u2011|\u00AD)/);
  for (const seg of segments) {
    if (seg === '\t') parts.push('<w:tab/>');
    else if (seg === '\n') parts.push('<w:br/>');
    else if (seg === '\f') parts.push('<w:br w:type="page"/>');
    else if (seg === '\u000B') parts.push('<w:br w:type="column"/>');
    else if (seg === '\u2011') parts.push('<w:noBreakHyphen/>');
    else if (seg === '\u00AD') parts.push('<w:softHyphen/>');
    else if (seg.length > 0) {
      const space = seg !== seg.trim() ? ' xml:space="preserve"' : '';
      parts.push(`<w:t${space}>${esc(seg)}</w:t>`);
    }
  }
  return `<w:r>${parts.join('')}</w:r>`;
}

function paraXml(para: Paragraph): string {
  // intervalos de comentário: Start antes do primeiro run com o id,
  // End + reference depois do último
  const firstOf = new Map<number, number>();
  const lastOf = new Map<number, number>();
  para.runs.forEach((r, i) => {
    for (const id of r.props.commentIds ?? []) {
      if (!firstOf.has(id)) firstOf.set(id, i);
      lastOf.set(id, i);
    }
  });
  const runParts: string[] = [];
  para.runs.forEach((r, i) => {
    for (const [id, fi] of firstOf) if (fi === i) runParts.push(`<w:commentRangeStart w:id="${id}"/>`);
    // run de CAMPO: emite fldSimple (o app de referência atualiza sozinho) com o cache atual
    if (r.field) {
      runParts.push(`<w:fldSimple w:instr="${escAttr(r.field)}">${runXml(r)}</w:fldSimple>`);
    } else runParts.push(runXml(r));
    for (const [id, li] of lastOf) {
      if (li === i) {
        runParts.push(`<w:commentRangeEnd w:id="${id}"/>`);
        runParts.push(`<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="${id}"/></w:r>`);
      }
    }
  });
  return paraXmlInner(para, runParts.join(''));
}

function paraXmlInner(para: Paragraph, runsXml: string): string {
  const pp = para.props;
  const ppr: string[] = [];
  if (pp.styleId) ppr.push(`<w:pStyle w:val="${escAttr(pp.styleId)}"/>`);
  // quebra de seção: sectPr DENTRO do pPr (encerra a seção neste parágrafo)
  if (pp.sectionBreak) {
    const refs = [...pp.sectionBreak.headerRefs, ...pp.sectionBreak.footerRefs];
    ppr.push(`<w:sectPr>${sectPrInner(pp.sectionBreak.sectPr, refs)}</w:sectPr>`);
  }
  if (pp.pageBreakBefore) ppr.push('<w:pageBreakBefore/>');
  if (pp.tabStops?.length) {
    ppr.push('<w:tabs>' + pp.tabStops.map((t) =>
      `<w:tab w:val="${t.align}"${t.leader ? ` w:leader="${t.leader}"` : ''} w:pos="${t.posTwips}"/>`,
    ).join('') + '</w:tabs>');
  }
  if (pp.numbering) {
    const numId = pp.numbering.kind === 'decimal' ? 1002 : 1001;
    ppr.push(`<w:numPr><w:ilvl w:val="${pp.numbering.ilvl}"/><w:numId w:val="${numId}"/></w:numPr>`);
  }
  if (pp.borders) {
    let inner = '';
    for (const side of ['top', 'left', 'bottom', 'right'] as const) {
      const e = pp.borders[side];
      if (!e) continue;
      inner += `<w:${side} w:val="${escAttr(e.style)}" w:sz="${e.sizeEighthPt}" ` +
        `w:space="${e.spacePt}" w:color="${e.color ? escAttr(e.color) : 'auto'}"/>`;
    }
    if (inner) ppr.push(`<w:pBdr>${inner}</w:pBdr>`);
  } else if (pp.boxBorder) {
    const b = '<w:bottom w:val="single" w:sz="4" w:space="1" w:color="auto"/>';
    ppr.push(
      '<w:pBdr>' +
      b.replace('w:bottom', 'w:top') + b.replace('w:bottom', 'w:left') +
      b + b.replace('w:bottom', 'w:right') +
      '</w:pBdr>',
    );
  }
  if (pp.shadingHex) {
    ppr.push(`<w:shd w:val="clear" w:color="auto" w:fill="${escAttr(pp.shadingHex)}"/>`);
  }
  if (pp.lineTwentieths !== undefined || pp.spaceAfterTwips !== undefined || pp.spaceBeforeTwips !== undefined) {
    const line = pp.lineTwentieths !== undefined
      ? ` w:line="${pp.lineTwentieths}" w:lineRule="auto"` : '';
    const before = pp.spaceBeforeTwips !== undefined ? ` w:before="${pp.spaceBeforeTwips}"` : '';
    const after = pp.spaceAfterTwips !== undefined ? ` w:after="${pp.spaceAfterTwips}"` : '';
    ppr.push(`<w:spacing${before}${after}${line}/>`);
  }
  if (pp.indentLeftTwips || pp.indentRightTwips || pp.indentFirstLineTwips) {
    let attrs = '';
    if (pp.indentLeftTwips) attrs += ` w:left="${pp.indentLeftTwips}"`;
    if (pp.indentRightTwips) attrs += ` w:right="${pp.indentRightTwips}"`;
    if (pp.indentFirstLineTwips) {
      attrs += pp.indentFirstLineTwips > 0
        ? ` w:firstLine="${pp.indentFirstLineTwips}"`
        : ` w:hanging="${-pp.indentFirstLineTwips}"`;
    }
    ppr.push(`<w:ind${attrs}/>`);
  }
  if (pp.alignment && pp.alignment !== 'left') ppr.push(`<w:jc w:val="${pp.alignment}"/>`);

  const inner =
    (ppr.length ? `<w:pPr>${ppr.join('')}</w:pPr>` : '') +
    runsXml;
  return `<w:p>${inner}</w:p>`;
}

const W_NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';

export interface HfPartInfo {
  kind: 'header' | 'footer';
  type: 'default' | 'first' | 'even';
  rid: string;
  path: string;
  paragraphs: Paragraph[];
  /** Só partes sujas são reescritas (preserva imagens/campos não suportados). */
  dirty: boolean;
}

/** Referência de header/footer para emitir no sectPr (type + rId). */
export interface HfRefXml { kind: 'header' | 'footer'; type: string; rid: string }

/** Corpo de um <w:sectPr> (sem a tag) com refs + geometria + orientação. */
export function sectPrInner(s: SectPr, refs: HfRefXml[] = []): string {
  const refsXml = refs
    .map((h) => `<w:${h.kind}Reference w:type="${h.type}" r:id="${h.rid}"/>`)
    .join('');
  const orient = s.pageWidthTwips > s.pageHeightTwips ? ' w:orient="landscape"' : '';
  const cols = s.cols
    ? `<w:cols w:space="${s.cols.spaceTwips}" w:num="${s.cols.count}"` +
      `${s.cols.sep ? ' w:sep="true"' : ''} w:equalWidth="true"/>`
    : '';
  const titlePg = s.titlePg ? '<w:titlePg/>' : '';
  const pgNumType = s.pgNumStart !== undefined ? `<w:pgNumType w:start="${s.pgNumStart}"/>` : '';
  return (
    `${refsXml}<w:pgSz w:w="${s.pageWidthTwips}" w:h="${s.pageHeightTwips}"${orient}/>` +
    `<w:pgMar w:top="${s.marginTopTwips}" w:right="${s.marginRightTwips}" ` +
    `w:bottom="${s.marginBottomTwips}" w:left="${s.marginLeftTwips}" ` +
    `w:header="${s.headerDistanceTwips ?? 720}" w:footer="${s.footerDistanceTwips ?? 720}" w:gutter="0"/>${cols}${pgNumType}${titlePg}`
  );
}

function borderXml(tag: string, e: BorderEdge): string {
  return `<w:${tag} w:val="${escAttr(e.style)}" w:sz="${e.sizeEighthPt}" ` +
    `w:space="0" w:color="${e.color ? escAttr(e.color) : 'auto'}"/>`;
}

function borderSetXml(wrap: string, b: TableBorders, sides: readonly string[]): string {
  let inner = '';
  for (const side of sides) {
    const e = (b as Record<string, BorderEdge | undefined>)[side];
    if (e) inner += borderXml(side, e);
  }
  return inner ? `<w:${wrap}>${inner}</w:${wrap}>` : '';
}

const TBL_SIDES = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'] as const;
const CELL_SIDES = ['top', 'left', 'bottom', 'right'] as const;

export function tableXml(t: TableBlock): string {
  const total = t.gridColsTwips.reduce((a, b) => a + b, 0) || undefined;
  const tblPr =
    '<w:tblPr>' +
    (total ? `<w:tblW w:w="${total}" w:type="dxa"/>` : '') +
    (t.borders ? borderSetXml('tblBorders', t.borders, TBL_SIDES) : '') +
    '</w:tblPr>';
  const grid = `<w:tblGrid>${t.gridColsTwips.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
  const rows = t.rows.map((row) => {
    const cells = row.cells.map((cell) => {
      const tcPr =
        '<w:tcPr>' +
        (cell.widthTwips ? `<w:tcW w:w="${cell.widthTwips}" w:type="dxa"/>` : '') +
        (cell.gridSpan > 1 ? `<w:gridSpan w:val="${cell.gridSpan}"/>` : '') +
        (cell.borders ? borderSetXml('tcBorders', cell.borders, CELL_SIDES) : '') +
        (cell.shadingHex ? `<w:shd w:val="clear" w:color="auto" w:fill="${escAttr(cell.shadingHex)}"/>` : '') +
        '</w:tcPr>';
      const body = cell.paragraphs.length
        ? cell.paragraphs.map(paraXml).join('') + cell.tables.map(tableXml).join('')
        : '<w:p/>';
      return `<w:tc>${tcPr}${body}</w:tc>`;
    }).join('');
    return `<w:tr>${cells}</w:tr>`;
  }).join('');
  return `<w:tbl>${tblPr}${grid}${rows}</w:tbl>`;
}

/** Serializa o corpo a partir de uma lista de blocos (parágrafos E tabelas). */
export function serializeBlocks(blocks: Block[], sectPr: SectPr, hfRefs: HfPartInfo[] = []): string {
  const bodyRefs: HfRefXml[] = hfRefs.map((h) => ({ kind: h.kind, type: h.type, rid: h.rid }));
  const sect = `<w:sectPr>${sectPrInner(sectPr, bodyRefs)}</w:sectPr>`;
  const body = blocks.map((b) => (b.type === 'table' ? tableXml(b) : paraXml(b.paragraph))).join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<w:document ${W_NS}><w:body>${body}${sect}</w:body></w:document>`
  );
}

export function serializeDocument(model: DocumentModel, hfRefs: HfPartInfo[] = []): string {
  const bodyRefs: HfRefXml[] = hfRefs.map((h) => ({ kind: h.kind, type: h.type, rid: h.rid }));
  const sect = `<w:sectPr>${sectPrInner(model.sectPr, bodyRefs)}</w:sectPr>`;
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<w:document ${W_NS}><w:body>` +
    model.paragraphs.map(paraXml).join('') +
    sect +
    '</w:body></w:document>'
  );
}

function numberingXml(): string {
  const bulletLvls = Array.from({ length: 3 }, (_, i) =>
    `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="bullet"/>` +
    `<w:lvlText w:val="${['', 'o', ''][i]}"/><w:lvlJc w:val="left"/>` +
    `<w:pPr><w:ind w:left="${720 * (i + 1)}" w:hanging="360"/></w:pPr>` +
    `<w:rPr><w:rFonts w:ascii="${['Symbol', 'Courier New', 'Wingdings'][i]}" w:hAnsi="${['Symbol', 'Courier New', 'Wingdings'][i]}" w:hint="default"/></w:rPr></w:lvl>`,
  ).join('');
  const decimalLvls = Array.from({ length: 3 }, (_, i) =>
    `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="decimal"/>` +
    `<w:lvlText w:val="%${i + 1}."/><w:lvlJc w:val="left"/>` +
    `<w:pPr><w:ind w:left="${720 * (i + 1)}" w:hanging="360"/></w:pPr></w:lvl>`,
  ).join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<w:numbering ${W_NS}>` +
    `<w:abstractNum w:abstractNumId="1001">${bulletLvls}</w:abstractNum>` +
    `<w:abstractNum w:abstractNumId="1002">${decimalLvls}</w:abstractNum>` +
    '<w:num w:numId="1001"><w:abstractNumId w:val="1001"/></w:num>' +
    '<w:num w:numId="1002"><w:abstractNumId w:val="1002"/></w:num>' +
    '</w:numbering>'
  );
}

const W_NS_HF =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

/** Serializa uma parte de cabeçalho/rodapé (w:hdr / w:ftr). */
export function serializeHfPart(kind: 'header' | 'footer', paragraphs: Paragraph[]): string {
  const tag = kind === 'header' ? 'w:hdr' : 'w:ftr';
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<${tag} ${W_NS_HF}>` +
    paragraphs.map(paraXml).join('') +
    `</${tag}>`
  );
}

/** Grava o modelo no pacote (document.xml + numbering/media/rels/content-types).
 *  hfParts: cabeçalhos/rodapés a referenciar no sectPr; os sujos são reescritos
 *  (criando parte + rel + content-type quando novos). */
export interface CommentOut {
  id: number;
  author?: string;
  text: string;
}

export interface WriteOptions {
  comments?: CommentOut[];
  /** refs de header/footer da ÚLTIMA seção (body sectPr); demais vão nos
   *  sectionBreak dos parágrafos. Se ausente, usa todos os hfParts. */
  bodySectRefs?: { kind: 'header' | 'footer'; type: string; rid: string }[];
  /** corpo como blocos (parágrafos E tabelas) — preserva tabelas no save. */
  blocks?: Block[];
}

export function writeDocument(
  pkg: DocxPackage,
  model: DocumentModel,
  hfParts: HfPartInfo[] = [],
  opts: WriteOptions = {},
): void {
  mediaOut = [];
  drawingId = 0;

  // comentários: regrava word/comments.xml + rel + content-type
  if (opts.comments && opts.comments.length > 0) {
    const body = opts.comments.map((c) =>
      `<w:comment w:id="${c.id}" w:author="${escAttr(c.author ?? 'Write')}" w:initials="WN">` +
      `<w:p><w:r><w:t xml:space="preserve">${esc(c.text)}</w:t></w:r></w:p></w:comment>`,
    ).join('');
    pkg.setPartText('word/comments.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      `<w:comments ${W_NS_HF}>${body}</w:comments>`);
    const relsPath = 'word/_rels/document.xml.rels';
    let rels = pkg.getPartText(relsPath) ??
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    if (!rels.includes('comments.xml')) {
      rels = rels.replace('</Relationships>',
        '<Relationship Id="rIdWnComments" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/></Relationships>');
      pkg.setPartText(relsPath, rels);
    }
    let ct = pkg.getPartText('[Content_Types].xml') ?? '';
    if (ct && !ct.includes('comments+xml')) {
      ct = ct.replace('</Types>',
        '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/></Types>');
      pkg.setPartText('[Content_Types].xml', ct);
    }
  }

  // cabeçalhos/rodapés: cria/reescreve as partes antes do document.xml
  if (hfParts.length > 0) {
    const relsPath = 'word/_rels/document.xml.rels';
    let rels = pkg.getPartText(relsPath) ??
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    let ct = pkg.getPartText('[Content_Types].xml') ?? '';
    for (const hf of hfParts) {
      if (hf.dirty || !pkg.getPart(hf.path)) {
        pkg.setPartText(hf.path, serializeHfPart(hf.kind, hf.paragraphs));
      }
      const relTarget = hf.path.replace(/^word\//, '');
      if (!rels.includes(`Id="${hf.rid}"`)) {
        rels = rels.replace(
          '</Relationships>',
          `<Relationship Id="${hf.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${hf.kind}" Target="${relTarget}"/></Relationships>`,
        );
      }
      const ctType = `application/vnd.openxmlformats-officedocument.wordprocessingml.${hf.kind}+xml`;
      if (ct && !ct.includes(`PartName="/${hf.path}"`)) {
        ct = ct.replace('</Types>', `<Override PartName="/${hf.path}" ContentType="${ctType}"/></Types>`);
      }
    }
    pkg.setPartText(relsPath, rels);
    if (ct) pkg.setPartText('[Content_Types].xml', ct);
  }

  // refs do body sectPr: explícitas (multi-seção) OU todos os hfParts (1 seção)
  const bodyRefs: HfPartInfo[] = opts.bodySectRefs
    ? opts.bodySectRefs.map((r) => ({
        kind: r.kind, type: r.type as HfPartInfo['type'], rid: r.rid,
        path: '', paragraphs: [], dirty: false,
      }))
    : hfParts;
  pkg.setPartText('word/document.xml',
    opts.blocks
      ? serializeBlocks(opts.blocks, model.sectPr, bodyRefs)
      : serializeDocument(model, bodyRefs));

  if (mediaOut.length > 0) {
    const relsPath = 'word/_rels/document.xml.rels';
    let rels = pkg.getPartText(relsPath) ??
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    let ct = pkg.getPartText('[Content_Types].xml') ?? '';
    // dedupe: se os MESMOS bytes já existem em word/media, reusa a parte
    const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i += 1009) if (a[i] !== b[i]) return false;
      return a[a.length - 1] === b[b.length - 1];
    };
    const existingMedia = pkg.partNames().filter((p) => p.startsWith('word/media/'));
    const exts = new Set<string>();
    for (const m of mediaOut) {
      let target = `media/${m.path.split('/').pop()}`;
      const dup = existingMedia.find((p) => sameBytes(pkg.getPart(p)!, m.data));
      if (dup) {
        target = dup.replace(/^word\//, '');
      } else {
        pkg.setPart(m.path, m.data);
      }
      if (!rels.includes(`"${m.rid}"`)) {
        rels = rels.replace(
          '</Relationships>',
          `<Relationship Id="${m.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${target}"/></Relationships>`,
        );
      }
      exts.add(m.ext);
    }
    for (const ext of exts) {
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
      if (ct && !ct.includes(`Extension="${ext}"`)) {
        ct = ct.replace('</Types>', `<Default Extension="${ext}" ContentType="${mime}"/></Types>`);
      }
    }
    pkg.setPartText(relsPath, rels);
    if (ct) pkg.setPartText('[Content_Types].xml', ct);
  }

  const hasLists = model.paragraphs.some((p) => p.props.numbering);
  if (!hasLists) return;

  pkg.setPartText('word/numbering.xml', numberingXml());

  const relsPath = 'word/_rels/document.xml.rels';
  let rels = pkg.getPartText(relsPath) ??
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  if (!rels.includes('numbering.xml')) {
    rels = rels.replace(
      '</Relationships>',
      '<Relationship Id="rIdWnNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>',
    );
    pkg.setPartText(relsPath, rels);
  }

  const ctPath = '[Content_Types].xml';
  let ct = pkg.getPartText(ctPath);
  if (ct && !ct.includes('numbering+xml')) {
    ct = ct.replace(
      '</Types>',
      '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>',
    );
    pkg.setPartText(ctPath, ct);
  }
}

import { DocxPackage } from './package.js';
import { parseXml, childElements, firstChild, type XmlElement } from './xml.js';

/**
 * Modelo de documento — espelha o OOXML. v2: conjunto de formatação amplo
 * (caractere + parágrafo) para o editor. O que não entendemos fica intocado
 * no pacote (round-trip é responsabilidade do DocxPackage).
 */

export interface RunProps {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** estilo do w:u quando underline=true (single é o padrão). */
  underlineStyle?: 'single' | 'double' | 'dotted' | 'dash' | 'wave' | 'thick';
  /** cor do sublinhado (w:u w:color), hex RRGGBB. */
  underlineColor?: string;
  strike: boolean;
  /** w:dstrike (tachado duplo). */
  doubleStrike?: boolean;
  /** w:vertAlign */
  vertAlign?: 'superscript' | 'subscript';
  /** half-points (w:sz). undefined = herda (22 = Aptos 11 no Normal atual). */
  szHalfPt?: number;
  /** hex RRGGBB (w:color). */
  color?: string;
  /** w:highlight (nomes do app de referência: yellow, green, cyan, ...). */
  highlight?: string;
  fontAscii?: string;
  allCaps: boolean;
  smallCaps: boolean;
  /** w:spacing do rPr (espaçamento entre caracteres), twips. */
  charSpacingTwips?: number;
  /** URL do w:hyperlink que envolve o run. */
  link?: string;
  /** Run veio de m:oMath (render fallback em itálico). */
  isMath?: boolean;
  /** Comentários cujo intervalo cobre este run. */
  commentIds?: number[];
}

export const DEFAULT_RUN_PROPS: RunProps = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  allCaps: false,
  smallCaps: false,
};

export interface InlineImage {
  /** bytes da parte de mídia (fallback raster: png, jpeg, gif...). */
  data: Uint8Array;
  /** extensão (png, jpeg, gif...). */
  ext: string;
  /** asvg:svgBlip — versão VETORIAL da imagem (Office 2016+). Quando presente,
   *  o Word renderiza este SVG; usá-lo evita a pixelização do raster de fallback. */
  svg?: Uint8Array;
  widthTwips: number;
  heightTwips: number;
  /** wp:anchor (flutuante) em vez de wp:inline. */
  floating?: boolean;
  /** offsets do wp:anchor (twips) relativos ao que relH/relV indicam. */
  offsetXTwips?: number;
  offsetYTwips?: number;
  /** wp:positionH/@relativeFrom (page|margin|column|character…). */
  relH?: string;
  /** wp:positionV/@relativeFrom (page|margin|paragraph|line…). */
  relV?: string;
  /** wp:anchor/@behindDoc — imagem ATRÁS do texto (marca d'água/capa full-bleed). */
  behindDoc?: boolean;
  /** XML CRU do <w:drawing> — preservado p/ reemissão fiel do shape no save
   *  (âncora, geometria, fill). Sem ele, reconstruímos um drawing inline. */
  rawDrawingXml?: string;
}

/** Caixa de texto de DrawingML (wps:txbx / VML v:textbox) — usada em
 *  timbrados de cabeçalho e afins. Renderizamos o texto no ponto ancorado. */
export interface DrawingTextbox {
  paras: Paragraph[];
  widthTwips: number;
  heightTwips: number;
  floating?: boolean;
  offsetXTwips?: number;
  offsetYTwips?: number;
  relH?: string;
  relV?: string;
  /** wp:anchor/@behindDoc — caixa ATRÁS do texto. */
  behindDoc?: boolean;
  /** wps:bodyPr/a:spAutoFit — a caixa AJUSTA a altura ao texto (o cy declarado
   *  é ignorado pelo Word). Sem isto, usa a altura declarada. */
  autoFit?: boolean;
  /** margens internas (twips) do bodyPr (lIns/tIns/rIns/bIns). Padrão do Word:
   *  l/r = 91440 EMU (144tw), t/b = 45720 EMU (72tw). */
  insets?: { l: number; t: number; r: number; b: number };
  /** XML CRU do <w:drawing> que contém a caixa — no save reemitimos este XML
   *  trocando só o <w:txbxContent> pelos parágrafos (possivelmente editados). */
  rawDrawingXml?: string;
}

export interface NoteRef {
  kind: 'footnote' | 'endnote';
  id: number;
}

/**
 * Conteúdo inline definido por plugin. No modelo ele ocupa um único caractere
 * U+FFFC; fallbackText é o texto exibido pelo Word dentro de um w:sdt e também
 * o fallback quando o plugin não está instalado.
 */
export interface CustomInline {
  type: string;
  data: unknown;
  fallbackText: string;
}

export interface Run {
  /** Para run de imagem, text é o objeto de substituição U+FFFC. */
  text: string;
  props: RunProps;
  image?: InlineImage;
  /** Caixa de texto ancorada (DrawingML). */
  textbox?: DrawingTextbox;
  /** Marcador de nota (rodapé/fim). */
  noteRef?: NoteRef;
  /** Instrução de campo (w:fldSimple w:instr), ex.: " PAGE ". */
  field?: string;
  /** Nó inline atômico registrado por plugin. */
  custom?: CustomInline;
}

export const EMU_PER_TWIP = 635;

export interface NumberingProps {
  /** v1: bullet ou decimal (numId 1001/1002 gerados por nós). */
  kind: 'bullet' | 'decimal';
  ilvl: number;
}

export interface ParaProps {
  alignment?: 'left' | 'center' | 'right' | 'both';
  styleId?: string;
  numbering?: NumberingProps;
  /** w:ind w:left, twips. */
  indentLeftTwips?: number;
  /** w:ind w:right, twips. */
  indentRightTwips?: number;
  /** w:ind w:firstLine (>0) ou w:hanging (<0), twips. */
  indentFirstLineTwips?: number;
  /** w:spacing w:line com lineRule auto (240=single, 360=1.5, 480=duplo). */
  lineTwentieths?: number;
  /** w:spacing w:after, twips. */
  spaceAfterTwips?: number;
  /** w:spacing w:before, twips. */
  spaceBeforeTwips?: number;
  /** Instrução de campo TOC (parágrafo é o sumário a gerar/atualizar). */
  tocInstr?: string;
  /** Entrada de sumário gerada por nós (substituída ao atualizar). */
  tocEntry?: boolean;
  /** w:tabs (tab stops customizados). */
  tabStops?: { posTwips: number; align: 'left' | 'right'; leader?: 'dot' }[];
  /** w:shd w:fill (hex RRGGBB). */
  shadingHex?: string;
  /** w:pBdr caixa simples nas 4 bordas (legado da toolbar; borders tem prioridade). */
  boxBorder?: boolean;
  /** w:pBdr por lado, com estilo/espessura/cor/afastamento. */
  borders?: ParagraphBorders;
  /** w:pageBreakBefore. */
  pageBreakBefore?: boolean;
  /** w:framePr w:dropCap — letra capitular sobreposta ao parágrafo seguinte. */
  dropCap?: boolean;
  /** Quebra de seção: este parágrafo encerra uma seção (w:pPr/w:sectPr).
   *  Preserva geometria/orientação e refs de header/footer da seção. */
  sectionBreak?: {
    sectPr: SectPr;
    headerRefs: { kind: 'header'; type: string; rid: string }[];
    footerRefs: { kind: 'footer'; type: string; rid: string }[];
  };
}

export interface BorderEdge {
  /** w:val (single, double, dashed, dotted...). */
  style: string;
  /** w:sz em oitavos de ponto (8 = 1pt). */
  sizeEighthPt: number;
  /** hex RRGGBB; undefined = auto (preto). */
  color?: string;
  /** w:space em pontos (afastamento do texto). */
  spacePt: number;
}

export interface ParagraphBorders {
  top?: BorderEdge;
  left?: BorderEdge;
  bottom?: BorderEdge;
  right?: BorderEdge;
}

export function readBorderEdge(el: XmlElement | undefined): BorderEdge | undefined {
  if (!el) return undefined;
  const style = el.attrs['w:val'];
  if (!style || style === 'none' || style === 'nil') return undefined;
  const color = el.attrs['w:color'];
  return {
    style,
    sizeEighthPt: parseInt(el.attrs['w:sz'] ?? '4', 10),
    color: color && color !== 'auto' ? color : undefined,
    spacePt: parseInt(el.attrs['w:space'] ?? '0', 10),
  };
}

export interface Paragraph {
  runs: Run[];
  props: ParaProps;
}

export interface SectPr {
  pageWidthTwips: number;
  pageHeightTwips: number;
  marginLeftTwips: number;
  marginRightTwips: number;
  marginTopTwips: number;
  marginBottomTwips: number;
  /** w:cols — colunas de texto (>1 = layout em colunas). */
  cols?: {
    count: number;
    /** w:space entre colunas (twips). */
    spaceTwips: number;
    /** w:sep — linha separadora entre colunas. */
    sep: boolean;
  };
  /** w:titlePg — a 1ª página usa header/footer "first". Sem isto, a 1ª
   *  página usa o header/footer default (regra do Word). */
  titlePg?: boolean;
  /** w:pgMar/@w:header — distância do topo da página ao cabeçalho (twips). */
  headerDistanceTwips?: number;
  /** w:pgMar/@w:footer — distância da base da página ao rodapé (twips). */
  footerDistanceTwips?: number;
  /** w:pgNumType/@w:start — número inicial de página da seção (campo PAGE).
   *  Ausente = 1 (padrão do Word). start=0 → 1ª página é "0". */
  pgNumStart?: number;
}

export interface DocumentModel {
  paragraphs: Paragraph[];
  sectPr: SectPr;
}

const onOff = (el: XmlElement | undefined): boolean => {
  if (!el) return false;
  const v = el.attrs['w:val'];
  return v !== '0' && v !== 'false' && v !== 'none';
};

function readRunProps(rPr: XmlElement | undefined): RunProps {
  const p: RunProps = { ...DEFAULT_RUN_PROPS };
  if (!rPr) return p;
  for (const el of childElements(rPr)) {
    const val = el.attrs['w:val'];
    switch (el.name) {
      case 'w:b': p.bold = onOff(el); break;
      case 'w:i': p.italic = onOff(el); break;
      case 'w:u':
        p.underline = val !== undefined && val !== 'none';
        if (val === 'double' || val === 'dotted' || val === 'dash' || val === 'wave' || val === 'thick') {
          p.underlineStyle = val;
        }
        if (el.attrs['w:color'] && el.attrs['w:color'] !== 'auto') p.underlineColor = el.attrs['w:color'];
        break;
      case 'w:strike': p.strike = onOff(el); break;
      case 'w:dstrike': p.doubleStrike = onOff(el); break;
      case 'w:caps': p.allCaps = onOff(el); break;
      case 'w:smallCaps': p.smallCaps = onOff(el); break;
      case 'w:vertAlign':
        if (val === 'superscript' || val === 'subscript') p.vertAlign = val;
        break;
      case 'w:sz': if (val) p.szHalfPt = parseInt(val, 10); break;
      case 'w:color': if (val && val !== 'auto') p.color = val; break;
      case 'w:highlight': if (val && val !== 'none') p.highlight = val; break;
      case 'w:rFonts': p.fontAscii = el.attrs['w:ascii']; break;
      case 'w:spacing': if (val) p.charSpacingTwips = parseInt(val, 10); break;
    }
  }
  return p;
}

function findDeep(el: XmlElement, name: string): XmlElement | undefined {
  for (const c of childElements(el)) {
    if (c.name === name) return c;
    const found = findDeep(c, name);
    if (found) return found;
  }
  return undefined;
}

export type ImageResolver = (rid: string) => { data: Uint8Array; ext: string } | undefined;
export type LinkResolver = (rid: string) => string | undefined;

export interface ReadContext {
  resolveImage: ImageResolver;
  resolveLink: LinkResolver;
  /** Comentários abertos (commentRangeStart sem End) — atravessa parágrafos. */
  activeComments?: Set<number>;
  /** Bookmarks vistos (nome → preenchido pelo chamador com o índice). */
  onBookmark?: (name: string) => void;
  /** Estado de campo complexo (fldChar begin…end) atravessando runs. */
  fieldState?: { instr: string; phase: 'instr' | 'result'; result: string } | null;
}

function readDrawing(drawing: XmlElement, resolveImage: ImageResolver): InlineImage | undefined {
  const anchor = firstChild(drawing, 'wp:anchor');
  const extent = findDeep(drawing, 'wp:extent');
  const blip = findDeep(drawing, 'a:blip');
  const rid = blip?.attrs['r:embed'];
  if (!extent || !rid) return undefined;
  const media = resolveImage(rid);
  if (!media) return undefined;
  // versão vetorial (asvg:svgBlip no extLst do a:blip) — preferida pelo Word
  const svgRid = findDeep(blip, 'asvg:svgBlip')?.attrs['r:embed'];
  const svgMedia = svgRid ? resolveImage(svgRid) : undefined;
  const img: InlineImage = {
    data: media.data,
    ext: media.ext,
    ...(svgMedia ? { svg: svgMedia.data } : {}),
    widthTwips: parseInt(extent.attrs['cx'] ?? '0', 10) / EMU_PER_TWIP,
    heightTwips: parseInt(extent.attrs['cy'] ?? '0', 10) / EMU_PER_TWIP,
  };
  if (anchor) {
    img.floating = true;
    if (anchor.attrs['behindDoc'] === '1' || anchor.attrs['behindDoc'] === 'true') img.behindDoc = true;
    const posH = firstChild(anchor, 'wp:positionH');
    const posV = firstChild(anchor, 'wp:positionV');
    if (posH?.attrs['relativeFrom']) img.relH = posH.attrs['relativeFrom'];
    if (posV?.attrs['relativeFrom']) img.relV = posV.attrs['relativeFrom'];
    const offH = posH && firstChild(posH, 'wp:posOffset');
    const offV = posV && firstChild(posV, 'wp:posOffset');
    if (offH) img.offsetXTwips = parseInt(textContentOf(offH), 10) / EMU_PER_TWIP;
    if (offV) img.offsetYTwips = parseInt(textContentOf(offV), 10) / EMU_PER_TWIP;
  }
  if (drawing.raw) img.rawDrawingXml = drawing.raw;
  return img;
}

/** Caixa de texto de um <w:drawing> (wps:txbx no mc:Choice, ou v:textbox no
 *  fallback VML). Lê o PRIMEIRO w:txbxContent (o moderno) e seus parágrafos. */
function readTextbox(drawing: XmlElement, ctx: ReadContext): DrawingTextbox | undefined {
  const txbx = findDeep(drawing, 'w:txbxContent');
  if (!txbx) return undefined;
  const paras: Paragraph[] = [];
  for (const p of childElements(txbx, 'w:p')) paras.push(readParagraph(p, ctx));
  if (!paras.length) return undefined;
  const extent = findDeep(drawing, 'wp:extent');
  const tb: DrawingTextbox = {
    paras,
    widthTwips: extent ? parseInt(extent.attrs['cx'] ?? '0', 10) / EMU_PER_TWIP : 0,
    heightTwips: extent ? parseInt(extent.attrs['cy'] ?? '0', 10) / EMU_PER_TWIP : 0,
  };
  const anchor = firstChild(drawing, 'wp:anchor');
  if (anchor) {
    tb.floating = true;
    if (anchor.attrs['behindDoc'] === '1' || anchor.attrs['behindDoc'] === 'true') tb.behindDoc = true;
    const posH = firstChild(anchor, 'wp:positionH');
    const posV = firstChild(anchor, 'wp:positionV');
    if (posH?.attrs['relativeFrom']) tb.relH = posH.attrs['relativeFrom'];
    if (posV?.attrs['relativeFrom']) tb.relV = posV.attrs['relativeFrom'];
    const offH = posH && firstChild(posH, 'wp:posOffset');
    const offV = posV && firstChild(posV, 'wp:posOffset');
    if (offH) tb.offsetXTwips = parseInt(textContentOf(offH), 10) / EMU_PER_TWIP;
    if (offV) tb.offsetYTwips = parseInt(textContentOf(offV), 10) / EMU_PER_TWIP;
  }
  // bodyPr: autoFit (altura ajusta ao texto) + margens internas
  const bodyPr = findDeep(drawing, 'wps:bodyPr') ?? findDeep(drawing, 'a:bodyPr');
  if (bodyPr) {
    if (findDeep(bodyPr, 'a:spAutoFit')) tb.autoFit = true;
    const insTw = (name: string, def: number): number => {
      const v = bodyPr.attrs[name];
      return v !== undefined ? Math.round(parseInt(v, 10) / EMU_PER_TWIP) : def;
    };
    tb.insets = { l: insTw('lIns', 144), t: insTw('tIns', 72), r: insTw('rIns', 144), b: insTw('bIns', 72) };
  }
  if (drawing.raw) tb.rawDrawingXml = drawing.raw;
  return tb;
}

function textContentOf(el: XmlElement): string {
  let out = '';
  for (const c of el.children) out += typeof c === 'string' ? c : textContentOf(c);
  return out;
}

/** Lê os runs de um container (w:r diretos, w:hyperlink, m:oMath, w:fldSimple). */
function readRunsInto(
  runs: Run[],
  container: XmlElement,
  ctx: ReadContext,
  inherit?: { link?: string; field?: string },
): void {
  for (const child of childElements(container)) {
    if (child.name === 'w:commentRangeStart') {
      ctx.activeComments?.add(parseInt(child.attrs['w:id'] ?? '-1', 10));
    } else if (child.name === 'w:commentRangeEnd') {
      ctx.activeComments?.delete(parseInt(child.attrs['w:id'] ?? '-1', 10));
    } else if (child.name === 'w:bookmarkStart') {
      const name = child.attrs['w:name'];
      if (name) ctx.onBookmark?.(name);
    } else if (child.name === 'w:r') {
      readSingleRun(runs, child, ctx, inherit);
    } else if (child.name === 'w:hyperlink') {
      const rid = child.attrs['r:id'];
      const anchor = child.attrs['w:anchor'];
      const link = (rid && ctx.resolveLink(rid)) || (anchor ? `#${anchor}` : undefined);
      readRunsInto(runs, child, ctx, { ...inherit, link });
    } else if (child.name === 'w:fldSimple') {
      const instr = child.attrs['w:instr'] ?? '';
      const before = runs.length;
      readRunsInto(runs, child, ctx, { ...inherit, field: instr });
      // auto-fechado (sem resultado em cache): sintetiza o run de campo
      if (runs.length === before) {
        runs.push({ text: '', props: { ...DEFAULT_RUN_PROPS }, field: instr });
      }
    } else if (child.name === 'm:oMath' || child.name === 'm:oMathPara') {
      const text = collectMathText(child);
      if (text) {
        runs.push({
          text,
          props: { ...DEFAULT_RUN_PROPS, italic: true, isMath: true },
        });
      }
    } else if (child.name === 'w:sdt') {
      const content = findDeep(child, 'w:sdtContent');
      const sdtPr = firstChild(child, 'w:sdtPr');
      const tag = sdtPr ? firstChild(sdtPr, 'w:tag')?.attrs['w:val'] : undefined;
      const custom = parseCustomInlineTag(tag);
      if (content && custom) {
        const nested: Run[] = [];
        readRunsInto(nested, content, ctx, inherit);
        const fallbackText = nested.map((run) => run.text).join('');
        runs.push({
          text: '\uFFFC',
          props: { ...(nested[0]?.props ?? DEFAULT_RUN_PROPS) },
          custom: { ...custom, fallbackText },
        });
      } else if (content) {
        readRunsInto(runs, content, ctx, inherit);
      }
    } else if (child.name === 'w:smartTag' || child.name === 'w:ins') {
      readRunsInto(runs, child, ctx, inherit);
    }
  }
}

const CUSTOM_INLINE_TAG_PREFIX = 'wordnext:inline:';

function parseCustomInlineTag(tag: string | undefined): Omit<CustomInline, 'fallbackText'> | undefined {
  if (!tag?.startsWith(CUSTOM_INLINE_TAG_PREFIX)) return undefined;
  const payload = tag.slice(CUSTOM_INLINE_TAG_PREFIX.length);
  const split = payload.indexOf(':');
  if (split <= 0) return undefined;
  const type = payload.slice(0, split);
  if (!/^[a-zA-Z0-9._-]+$/.test(type)) return undefined;
  try {
    return { type, data: JSON.parse(decodeURIComponent(payload.slice(split + 1))) as unknown };
  } catch {
    return undefined;
  }
}

function collectMathText(el: XmlElement): string {
  let out = '';
  for (const c of el.children) {
    if (typeof c === 'string') continue;
    if (c.name === 'm:t') out += textContentOf(c);
    else out += collectMathText(c);
  }
  return out;
}

function readSingleRun(
  runs: Run[],
  rEl: XmlElement,
  ctx: ReadContext,
  inherit?: { link?: string; field?: string },
): void {
  const rProps = readRunProps(firstChild(rEl, 'w:rPr'));
  if (inherit?.link) {
    rProps.link = inherit.link;
    rProps.underline = true;
    rProps.color ??= '0563C1';
  }
  const flush = (text: string, extra?: Partial<Run>) => {
    if (text.length === 0 && !extra) return;
    const props = { ...rProps };
    if (ctx.activeComments?.size) props.commentIds = [...ctx.activeComments];
    runs.push({ text, props, ...(inherit?.field ? { field: inherit.field } : {}), ...extra });
  };
  let text = '';
  for (const child of childElements(rEl)) {
    // campos complexos: fldChar begin/separate/end + instrText (PAGE, NUMPAGES…)
    if (child.name === 'w:fldChar') {
      const type = child.attrs['w:fldCharType'];
      if (type === 'begin') {
        if (text) { flush(text); text = ''; }
        ctx.fieldState = { instr: '', phase: 'instr', result: '' };
      } else if (type === 'separate') {
        if (ctx.fieldState) ctx.fieldState.phase = 'result';
      } else if (type === 'end') {
        const fs = ctx.fieldState;
        ctx.fieldState = null;
        if (fs) {
          const instr = ` ${fs.instr.trim()} `;
          const props = { ...rProps };
          if (ctx.activeComments?.size) props.commentIds = [...ctx.activeComments];
          runs.push({ text: fs.result, props, field: instr });
        }
      }
      continue;
    }
    if (child.name === 'w:instrText') {
      if (ctx.fieldState) ctx.fieldState.instr += textContentOf(child);
      continue;
    }
    if (ctx.fieldState) {
      // dentro de um campo: o texto vai para o resultado em cache (não emite run)
      if (child.name === 'w:t' && ctx.fieldState.phase === 'result') {
        ctx.fieldState.result += child.children.filter((c): c is string => typeof c === 'string').join('');
      }
      continue;
    }
    if (child.name === 'w:t') {
      text += child.children.filter((c): c is string => typeof c === 'string').join('');
    } else if (child.name === 'w:tab') text += '\t';
    else if (child.name === 'w:br' || child.name === 'w:cr') {
      // \f = quebra de página (w:br type="page"); \n = quebra de linha manual
      text += child.attrs['w:type'] === 'page' ? '\f' : '\n';
    }
    else if (child.name === 'w:sym') {
      if (text) { flush(text); text = ''; }
      const hex = child.attrs['w:char'] ?? 'F0B7';
      let code = parseInt(hex, 16);
      // só códigos legados de 1 byte mapeiam para a área privada F0xx;
      // valores Unicode reais (ex.: 2612 ☒) ficam como estão
      if (code <= 0xff) code |= 0xf000;
      runs.push({
        text: String.fromCharCode(code),
        props: { ...rProps, fontAscii: child.attrs['w:font'] ?? rProps.fontAscii },
      });
    } else if (child.name === 'w:footnoteReference' || child.name === 'w:endnoteReference') {
      if (text) { flush(text); text = ''; }
      const id = parseInt(child.attrs['w:id'] ?? '0', 10);
      runs.push({
        text: '',
        props: { ...rProps, vertAlign: 'superscript' },
        noteRef: { kind: child.name === 'w:footnoteReference' ? 'footnote' : 'endnote', id },
      });
    } else if (child.name === 'w:drawing') {
      if (text) { flush(text); text = ''; }
      const image = readDrawing(child, ctx.resolveImage);
      if (image) runs.push({ text: '￼', props: { ...rProps }, image });
      else {
        const textbox = readTextbox(child, ctx);
        if (textbox) runs.push({ text: '￼', props: { ...rProps }, textbox });
      }
    } else if (child.name === 'mc:AlternateContent') {
      // formas/caixas de texto de DrawingML: o w:drawing moderno fica em
      // mc:Choice (Requires="wps"); o mc:Fallback é VML. Descemos no drawing.
      const choice = firstChild(child, 'mc:Choice') ?? child;
      const drawing = findDeep(choice, 'w:drawing');
      if (drawing) {
        if (text) { flush(text); text = ''; }
        const image = readDrawing(drawing, ctx.resolveImage);
        if (image) runs.push({ text: '￼', props: { ...rProps }, image });
        else {
          const textbox = readTextbox(drawing, ctx);
          if (textbox) runs.push({ text: '￼', props: { ...rProps }, textbox });
        }
      }
    }
  }
  if (text.length > 0) flush(text);
}

export function readParagraph(pEl: XmlElement, ctx: ReadContext): Paragraph {
  const props: ParaProps = {};
  const pPr = firstChild(pEl, 'w:pPr');
  if (pPr) {
    const jc = firstChild(pPr, 'w:jc')?.attrs['w:val'];
    if (jc === 'center' || jc === 'right' || jc === 'both' || jc === 'left') props.alignment = jc;
    props.styleId = firstChild(pPr, 'w:pStyle')?.attrs['w:val'];
    const numPr = firstChild(pPr, 'w:numPr');
    if (numPr) {
      const numId = parseInt(firstChild(numPr, 'w:numId')?.attrs['w:val'] ?? '0', 10);
      props.numbering = {
        kind: numId === 1002 ? 'decimal' : 'bullet',
        ilvl: parseInt(firstChild(numPr, 'w:ilvl')?.attrs['w:val'] ?? '0', 10),
      };
    }
    const ind = firstChild(pPr, 'w:ind');
    if (ind) {
      if (ind.attrs['w:left']) props.indentLeftTwips = parseInt(ind.attrs['w:left'], 10);
      if (ind.attrs['w:right']) props.indentRightTwips = parseInt(ind.attrs['w:right'], 10);
      if (ind.attrs['w:firstLine']) props.indentFirstLineTwips = parseInt(ind.attrs['w:firstLine'], 10);
      if (ind.attrs['w:hanging']) props.indentFirstLineTwips = -parseInt(ind.attrs['w:hanging'], 10);
    }
    const spacing = firstChild(pPr, 'w:spacing');
    if (spacing) {
      if (spacing.attrs['w:line'] && spacing.attrs['w:lineRule'] === 'auto') {
        props.lineTwentieths = parseInt(spacing.attrs['w:line'], 10);
      }
      if (spacing.attrs['w:after']) props.spaceAfterTwips = parseInt(spacing.attrs['w:after'], 10);
      if (spacing.attrs['w:before']) props.spaceBeforeTwips = parseInt(spacing.attrs['w:before'], 10);
    }
    const shd = firstChild(pPr, 'w:shd')?.attrs['w:fill'];
    if (shd && shd !== 'auto') props.shadingHex = shd;
    const tabs = firstChild(pPr, 'w:tabs');
    if (tabs) {
      const stops = childElements(tabs, 'w:tab')
        .map((t) => ({
          posTwips: parseInt(t.attrs['w:pos'] ?? '0', 10),
          align: (t.attrs['w:val'] === 'right' ? 'right' : 'left') as 'left' | 'right',
          leader: t.attrs['w:leader'] === 'dot' ? ('dot' as const) : undefined,
        }))
        .filter((t) => t.posTwips > 0);
      if (stops.length) props.tabStops = stops;
    }
    const pBdr = firstChild(pPr, 'w:pBdr');
    if (pBdr) {
      props.boxBorder = true;
      const borders: ParagraphBorders = {};
      for (const side of ['top', 'left', 'bottom', 'right'] as const) {
        const edge = readBorderEdge(firstChild(pBdr, `w:${side}`));
        if (edge) borders[side] = edge;
      }
      if (Object.keys(borders).length > 0) props.borders = borders;
    }
    if (firstChild(pPr, 'w:pageBreakBefore')) props.pageBreakBefore = true;
    const framePr = firstChild(pPr, 'w:framePr');
    if (framePr?.attrs['w:dropCap'] && framePr.attrs['w:dropCap'] !== 'none') props.dropCap = true;
  }
  const runs: Run[] = [];
  readRunsInto(runs, pEl, ctx);
  // campo TOC (mesmo "sujo"/sem cache): marca o parágrafo p/ geração
  const instr = collectInstrText(pEl);
  if (/\bTOC\b/.test(instr)) props.tocInstr = instr.trim();
  return { runs, props };
}

function collectInstrText(el: XmlElement): string {
  let out = '';
  for (const c of el.children) {
    if (typeof c === 'string') continue;
    if (c.name === 'w:instrText') out += textContentOf(c);
    else out += collectInstrText(c);
  }
  return out;
}

/** Constrói o contexto de leitura (resolvers de imagem/link) para uma parte. */
export function buildReadContext(pkg: DocxPackage, relsPath: string): ReadContext {
  const relsXml = pkg.getPartText(relsPath);
  const relMap = new Map<string, { target: string; external: boolean }>();
  if (relsXml) {
    const rels = parseXml(relsXml);
    for (const rel of childElements(rels, 'Relationship')) {
      const id = rel.attrs['Id'];
      const target = rel.attrs['Target'];
      if (id && target) {
        relMap.set(id, {
          target: target.replace(/^\.\//, ''),
          external: rel.attrs['TargetMode'] === 'External',
        });
      }
    }
  }
  return {
    activeComments: new Set<number>(),
    fieldState: null,
    resolveImage: (rid) => {
      const rel = relMap.get(rid);
      if (!rel || rel.external) return undefined;
      const path = rel.target.startsWith('/') ? rel.target.slice(1) : `word/${rel.target}`;
      const data = pkg.getPart(path);
      if (!data) return undefined;
      const ext = path.split('.').pop()?.toLowerCase() ?? 'png';
      return { data, ext };
    },
    resolveLink: (rid) => {
      const rel = relMap.get(rid);
      return rel?.external ? rel.target : undefined;
    },
  };
}

const tw = (el: XmlElement | undefined, attr: string, fallback: number): number => {
  const v = el?.attrs[attr];
  return v === undefined ? fallback : parseInt(v, 10);
};

export function readDocument(pkg: DocxPackage): DocumentModel {
  const root = parseXml(pkg.documentXml());
  const body = firstChild(root, 'w:body');
  if (!body) throw new Error('w:document sem w:body');

  const ctx = buildReadContext(pkg, 'word/_rels/document.xml.rels');
  const paragraphs = childElements(body, 'w:p').map((p) => readParagraph(p, ctx));
  if (paragraphs.length === 0) paragraphs.push({ runs: [], props: {} });

  const sectPr = readSectPr(firstChild(body, 'w:sectPr'));
  return { paragraphs, sectPr };
}

export function readSectPr(sectEl: XmlElement | undefined): SectPr {
  const pgSz = sectEl && firstChild(sectEl, 'w:pgSz');
  const pgMar = sectEl && firstChild(sectEl, 'w:pgMar');
  const colsEl = sectEl && firstChild(sectEl, 'w:cols');
  const sect: SectPr = {
    pageWidthTwips: tw(pgSz, 'w:w', 11906),
    pageHeightTwips: tw(pgSz, 'w:h', 16838),
    marginLeftTwips: tw(pgMar, 'w:left', 1701),
    marginRightTwips: tw(pgMar, 'w:right', 1701),
    marginTopTwips: tw(pgMar, 'w:top', 1417),
    marginBottomTwips: tw(pgMar, 'w:bottom', 1417),
    headerDistanceTwips: tw(pgMar, 'w:header', 720),
    footerDistanceTwips: tw(pgMar, 'w:footer', 720),
  };
  const num = colsEl ? parseInt(colsEl.attrs['w:num'] ?? '1', 10) : 1;
  if (num > 1) {
    sect.cols = {
      count: num,
      spaceTwips: parseInt(colsEl!.attrs['w:space'] ?? '720', 10),
      sep: colsEl!.attrs['w:sep'] === 'true' || colsEl!.attrs['w:sep'] === '1',
    };
  }
  const titlePg = sectEl && firstChild(sectEl, 'w:titlePg');
  if (titlePg && titlePg.attrs['w:val'] !== '0' && titlePg.attrs['w:val'] !== 'false') {
    sect.titlePg = true;
  }
  const pgNumType = sectEl && firstChild(sectEl, 'w:pgNumType');
  const startAttr = pgNumType?.attrs['w:start'];
  if (startAttr !== undefined) {
    const n = parseInt(startAttr, 10);
    if (!Number.isNaN(n)) sect.pgNumStart = n;
  }
  return sect;
}

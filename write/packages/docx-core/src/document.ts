import { DocxPackage } from './package.js';
import { parseXml, childElements, firstChild, type XmlElement } from './xml.js';
import { readRPr, readPPr, type RPr, type PPr } from './ooxml/props.js';
import {
  readWpAnchor, readSpPr, parseVmlStyle, vmlAnchor, vmlLenTwips, vmlShapeStyle,
  type DrawingAnchor, type ShapeStyle,
} from './drawing.js';

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
  /** wp:anchor completo (wrap, alinhamentos, distâncias) — motor de layout. */
  anchor?: DrawingAnchor;
  /** wp:inline effectExtent (twips): margem de efeitos que ocupa espaço na linha */
  inlineEffect?: { l: number; t: number; r: number; b: number };
  /** a:srcRect — recorte em frações (0..1) de cada lado. */
  crop?: { l: number; t: number; r: number; b: number };
  /** rotação/espelhamento/contorno da imagem (pic:spPr). */
  style?: ShapeStyle;
  /** Veio de VML (w:pict/w:object) — sem rawDrawingXml para o save. */
  vml?: boolean;
  /** Ajustes de cor (VML gain/blacklevel/grayscale/bilevel, DrawingML
   *  a:lum/a:grayscl/a:biLevel) — o Word os aplica aos pixels ao exportar. */
  effects?: ImageEffects;
}

/**
 * Ajustes de cor de imagem, no modelo único do Word (medido no PDF exportado):
 * cinza (Rec. 709) primeiro; depois, por canal (0..1),
 * x' = (x − ½)·gain + ½ + bright/2·(1 + gain). VML: gain = gain,
 * bright = 2·blacklevel (arredonda); DrawingML a:lum: gain = 1/(1−c) (c > 0)
 * ou 1 + c, bright = bright (trunca).
 */
export interface ImageEffects {
  gray?: boolean;
  gain?: number;
  bright?: number;
  /** DrawingML: trunca em vez de arredondar */
  floor?: boolean;
  /** preto e branco: luminância ≥ limiar (0..1) → branco */
  biLevel?: number;
}

/** Valor VML de imagedata: "19661f" (16.16) ou número. */
function vmlFixed(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = v.endsWith('f') ? parseInt(v, 10) / 65536 : parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Efeitos de cor de um v:imagedata. */
function vmlImageEffects(el: XmlElement): ImageEffects | undefined {
  const a = el.attrs;
  const fx: ImageEffects = {};
  const gain = vmlFixed(a['gain']), bl = vmlFixed(a['blacklevel']);
  if (gain !== undefined && gain !== 1) fx.gain = gain;
  if (bl) fx.bright = 2 * bl;
  if (a['grayscale'] === 't' || a['grayscale'] === 'true') fx.gray = true;
  if (a['bilevel'] === 't' || a['bilevel'] === 'true') fx.biLevel = 0.5;
  return Object.keys(fx).length ? fx : undefined;
}

/** Efeitos de cor de um a:blip (a:lum, a:grayscl, a:biLevel). */
function blipImageEffects(blip: XmlElement): ImageEffects | undefined {
  const fx: ImageEffects = {};
  const lum = firstChild(blip, 'a:lum');
  if (lum) {
    const b = (parseInt(lum.attrs['bright'] ?? '0', 10) || 0) / 100000;
    const c = Math.max(-1, Math.min(0.999, (parseInt(lum.attrs['contrast'] ?? '0', 10) || 0) / 100000));
    if (c) fx.gain = c > 0 ? 1 / (1 - c) : 1 + c;
    if (b) fx.bright = b;
    if (b || c) fx.floor = true;
  }
  if (firstChild(blip, 'a:grayscl')) fx.gray = true;
  const bi = firstChild(blip, 'a:biLevel');
  if (bi) fx.biLevel = (parseInt(bi.attrs['thresh'] ?? '50000', 10) || 0) / 100000;
  return Object.keys(fx).length ? fx : undefined;
}

/** Forma sem texto (retângulo, linha, elipse…) — DrawingML wps:wsp ou VML. */
export interface DrawingShape {
  style: ShapeStyle;
  widthTwips: number;
  heightTwips: number;
  floating?: boolean;
  anchor?: DrawingAnchor;
  /** wp:inline effectExtent (twips) */
  inlineEffect?: { l: number; t: number; r: number; b: number };
  /** Para linhas VML (v:line from/to): pontos relativos ao canto (twips). */
  line?: { x1: number; y1: number; x2: number; y2: number };
  /** linha horizontal VML (v:rect o:hr="t", "Inserir linha horizontal") */
  hr?: boolean;
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
  /** wps:bodyPr wrap="none" / VML mso-wrap-style:none — o texto NÃO quebra
   *  na largura da caixa (com autoFit, a caixa toma a largura do texto) */
  noWrap?: boolean;
  /** margens internas (twips) do bodyPr (lIns/tIns/rIns/bIns). Padrão do Word:
   *  l/r = 91440 EMU (144tw), t/b = 45720 EMU (72tw). */
  insets?: { l: number; t: number; r: number; b: number };
  /** XML CRU do <w:drawing> que contém a caixa — no save reemitimos este XML
   *  trocando só o <w:txbxContent> pelos parágrafos (possivelmente editados). */
  rawDrawingXml?: string;
  /** wp:anchor completo — motor de layout. */
  anchor?: DrawingAnchor;
  /** preenchimento/contorno da própria caixa. */
  shape?: ShapeStyle;
  /** wps:bodyPr anchor (t | ctr | b) — alinhamento vertical do texto. */
  vAnchor?: 't' | 'ctr' | 'b';
  /** rotação da caixa (graus, horário) — xfrm rot / VML rotation */
  rot?: number;
  /** WordArt (bodyPr fromWordArt / VML v:textpath): o texto é esticado para
   *  preencher a forma conforme a deformação (prstTxWarp, ex.: textPlain) */
  wordArt?: string;
  /** Blocos em ordem (parágrafos + tabelas) do txbxContent. */
  blocks?: import('./fulldoc.js').Block[];
  vml?: boolean;
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
  /** Formatação DIRETA completa do w:rPr (tri-estado) — motor de layout. */
  rpr?: RPr;
  /** Campo complexo: os runs FORMATADOS do resultado em cache (o run em si
   *  guarda o texto achatado, usado pela edição/salvamento). */
  fieldResult?: Run[];
  /** Forma sem texto ancorada/inline. */
  shape?: DrawingShape;
  /** w:ptab — tab de posição absoluta (texto é '	'). */
  ptab?: { alignment: string; relativeTo: string; leader?: string };
  /** w:sym — fonte do símbolo (o texto já vem mapeado p/ a área F0xx). */
  symFont?: string;
  /** Grupo de desenho (wpg:wgp / v:group / tela wpc). */
  group?: DrawingGroup;
  /** Run dentro do RESULTADO de um campo TOC (o Word não aplica o estilo
   *  Hyperlink nas entradas do sumário). */
  inToc?: boolean;
  /** Campo de formulário legado (w:ffData): caixa de seleção / texto / lista.
   *  Lista (FORMDROPDOWN): entradas e o índice exibido. */
  formField?: { type: 'checkBox' | 'textInput' | 'dropDown'; checked?: boolean; sizeHalfPt?: number; sizeAuto?: boolean; entries?: string[]; selected?: number };
}

/** Grupo de objetos: cada item com retângulo relativo ao canto do grupo. */
export interface DrawingGroup {
  widthTwips: number;
  heightTwips: number;
  /** rotação (graus, horário) e espelhos do grupo — valem para todos os filhos */
  rot?: number;
  flipH?: boolean;
  flipV?: boolean;
  floating?: boolean;
  anchor?: DrawingAnchor;
  items: { x: number; y: number; w: number; h: number; run: Run }[];
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
  /** Formatação DIRETA completa do w:pPr (tri-estado) — motor de layout. */
  ppr?: PPr;
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

/** Props de EDIÇÃO (achatadas) derivadas da formatação direta tipada. É a
 *  definição única do que o modelo de edição enxerga de um w:rPr — o motor de
 *  layout usa a mesma função para detectar o que a edição mudou. */
export function runPropsFromRPr(rpr: RPr | undefined): RunProps {
  const p: RunProps = { ...DEFAULT_RUN_PROPS };
  if (!rpr) return p;
  if (rpr.b !== undefined) p.bold = rpr.b;
  if (rpr.i !== undefined) p.italic = rpr.i;
  if (rpr.u) {
    const val = rpr.u.val;
    p.underline = val !== 'none' && val !== '';
    if (val === 'double' || val === 'dotted' || val === 'dash' || val === 'wave' || val === 'thick') p.underlineStyle = val;
    if (rpr.u.color && rpr.u.color !== 'auto') p.underlineColor = rpr.u.color;
  }
  if (rpr.strike !== undefined) p.strike = rpr.strike;
  if (rpr.dstrike !== undefined) p.doubleStrike = rpr.dstrike;
  if (rpr.caps !== undefined) p.allCaps = rpr.caps;
  if (rpr.smallCaps !== undefined) p.smallCaps = rpr.smallCaps;
  if (rpr.vertAlign === 'superscript' || rpr.vertAlign === 'subscript') p.vertAlign = rpr.vertAlign;
  if (rpr.sz !== undefined) p.szHalfPt = rpr.sz;
  if (rpr.color?.val && rpr.color.val !== 'auto') p.color = rpr.color.val;
  if (rpr.highlight && rpr.highlight !== 'none') p.highlight = rpr.highlight;
  if (rpr.rFonts) p.fontAscii = rpr.rFonts.ascii;
  if (rpr.spacing !== undefined && rpr.spacing !== 0) p.charSpacingTwips = rpr.spacing;
  return p;
}

/** Props de parágrafo de EDIÇÃO derivadas do w:pPr tipado (ver runPropsFromRPr). */
export function paraPropsFromPPr(ppr: PPr | undefined): ParaProps {
  const props: ParaProps = {};
  if (!ppr) return props;
  const jc = ppr.jc;
  if (jc === 'center' || jc === 'right' || jc === 'both' || jc === 'left') props.alignment = jc;
  else if (jc === 'start') props.alignment = 'left';
  else if (jc === 'end') props.alignment = 'right';
  else if (jc === 'distribute') props.alignment = 'both';
  if (ppr.pStyle !== undefined) props.styleId = ppr.pStyle;
  if (ppr.numPr) {
    const numId = ppr.numPr.numId ?? 0;
    props.numbering = { kind: numId === 1002 ? 'decimal' : 'bullet', ilvl: ppr.numPr.ilvl ?? 0 };
  }
  if (ppr.ind) {
    if (ppr.ind.left !== undefined) props.indentLeftTwips = ppr.ind.left;
    if (ppr.ind.right !== undefined) props.indentRightTwips = ppr.ind.right;
    if (ppr.ind.firstLine !== undefined) props.indentFirstLineTwips = ppr.ind.firstLine;
    if (ppr.ind.hanging !== undefined) props.indentFirstLineTwips = -ppr.ind.hanging;
  }
  if (ppr.spacing) {
    if (ppr.spacing.line !== undefined && ppr.spacing.lineRule === 'auto') props.lineTwentieths = ppr.spacing.line;
    if (ppr.spacing.after !== undefined) props.spaceAfterTwips = ppr.spacing.after;
    if (ppr.spacing.before !== undefined) props.spaceBeforeTwips = ppr.spacing.before;
  }
  if (ppr.shd?.fill && ppr.shd.fill !== 'auto') props.shadingHex = ppr.shd.fill;
  if (ppr.tabs) {
    const stops = ppr.tabs
      .filter((t) => t.pos > 0 && t.val !== 'clear' && t.val !== 'bar')
      .map((t) => ({
        posTwips: t.pos,
        align: (t.val === 'right' ? 'right' : 'left') as 'left' | 'right',
        leader: t.leader === 'dot' ? ('dot' as const) : undefined,
      }));
    if (stops.length) props.tabStops = stops;
  }
  if (ppr.pBdr) {
    props.boxBorder = true;
    const borders: ParagraphBorders = {};
    for (const side of ['top', 'left', 'bottom', 'right'] as const) {
      const b = ppr.pBdr[side];
      if (!b || b.val === 'none' || b.val === 'nil') continue;
      borders[side] = {
        style: b.val,
        sizeEighthPt: b.sz ?? 4,
        color: b.color && b.color !== 'auto' ? b.color : undefined,
        spacePt: b.space ?? 0,
      };
    }
    if (Object.keys(borders).length > 0) props.borders = borders;
  }
  if (ppr.pageBreakBefore) props.pageBreakBefore = true;
  if (ppr.framePr?.dropCap && ppr.framePr.dropCap !== 'none') props.dropCap = true;
  return props;
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

/** Campo complexo aberto (fldChar begin…end), possivelmente aninhado. */
interface FieldFrame {
  instr: string;
  /** w:ffData do fldChar begin (campos de formulário). */
  ff?: Run['formField'];
  phase: 'instr' | 'result';
  /** runs do resultado (enquanto o campo não atravessou parágrafo). */
  runs: Run[];
  /** o resultado atravessou um fim de parágrafo: o resto sai como runs normais. */
  crossed: boolean;
  props: RunProps;
  rpr?: RPr;
}

export interface ReadContext {
  resolveImage: ImageResolver;
  resolveLink: LinkResolver;
  /** Comentários abertos (commentRangeStart sem End) — atravessa parágrafos. */
  activeComments?: Set<number>;
  /** Bookmarks vistos (nome → preenchido pelo chamador com o índice); `offset` =
   *  posição no texto do parágrafo (run.text concatenado) — PAGEREF depois de quebra. */
  onBookmark?: (name: string, offset: number) => void;
  /** Pilha de campos complexos abertos (atravessa runs e parágrafos). */
  fieldStack?: FieldFrame[];
  /** Lê os blocos (parágrafos + tabelas) de um container (w:txbxContent) —
   *  injetado pelo leitor do documento completo (fulldoc). */
  readBlocks?: (container: XmlElement, ctx: ReadContext) => import('./fulldoc.js').Block[];
}

const OBJ = '\uFFFC';

/** Lê a imagem de um pic:pic (blip + recorte + estilo). */
function readPic(pic: XmlElement, ctx: ReadContext, wTw: number, hTw: number): InlineImage | undefined {
  const blip = findDeep(pic, 'a:blip');
  const rid = blip?.attrs['r:embed'] ?? blip?.attrs['r:link'];
  if (!rid) return undefined;
  // mídia ausente/externa: o Word ainda reserva o quadro (mostra o ícone de imagem quebrada)
  const media = ctx.resolveImage(rid) ?? { data: new Uint8Array(0), ext: 'png' };
  const svgRid = blip && findDeep(blip, 'asvg:svgBlip')?.attrs['r:embed'];
  const svgMedia = svgRid ? ctx.resolveImage(svgRid) : undefined;
  const img: InlineImage = {
    data: media.data, ext: media.ext,
    ...(svgMedia ? { svg: svgMedia.data } : {}),
    widthTwips: wTw, heightTwips: hTw,
  };
  const fx = blip && blipImageEffects(blip);
  if (fx) img.effects = fx;
  const src = findDeep(pic, 'a:srcRect');
  if (src && (src.attrs['l'] || src.attrs['t'] || src.attrs['r'] || src.attrs['b'])) {
    const f = (k: string) => (parseInt(src.attrs[k] ?? '0', 10) || 0) / 100000;
    img.crop = { l: f('l'), t: f('t'), r: f('r'), b: f('b') };
  }
  const spPr = firstChild(pic, 'pic:spPr');
  if (spPr) {
    const st = readSpPr(spPr);
    if (st.rot || st.flipH || st.flipV || st.line) img.style = st;
  }
  return img;
}

function bodyPrOf(tb: DrawingTextbox, bodyPr: XmlElement | undefined): void {
  if (!bodyPr) return;
  if (findDeep(bodyPr, 'a:spAutoFit')) tb.autoFit = true;
  if (bodyPr.attrs['wrap'] === 'none') tb.noWrap = true;
  const insTw = (name: string, def: number): number => {
    const v = bodyPr.attrs[name];
    return v !== undefined ? Math.round(parseInt(v, 10) / EMU_PER_TWIP) : def;
  };
  tb.insets = { l: insTw('lIns', 144), t: insTw('tIns', 72), r: insTw('rIns', 144), b: insTw('bIns', 72) };
  const anc = bodyPr.attrs['anchor'];
  if (anc === 't' || anc === 'ctr' || anc === 'b') tb.vAnchor = anc;
  if (bodyPr.attrs['fromWordArt'] === '1' || bodyPr.attrs['fromWordArt'] === 'true') {
    tb.wordArt = firstChild(bodyPr, 'a:prstTxWarp')?.attrs['prst'] ?? 'textPlain';
  }
}

function textboxBlocks(txbx: XmlElement, ctx: ReadContext, tb: DrawingTextbox): void {
  if (ctx.readBlocks) {
    const blocks = ctx.readBlocks(txbx, ctx);
    tb.blocks = blocks;
    // parágrafos do modelo de edição: os do nível de cima + os das células
    const paras: Paragraph[] = [];
    const walk = (bs: import('./fulldoc.js').Block[]) => {
      for (const b of bs) {
        if (b.type === 'paragraph') paras.push(b.paragraph);
        else for (const r of b.rows) for (const c of r.cells) walk(c.blocks ?? c.paragraphs.map((p) => ({ type: 'paragraph' as const, paragraph: p })));
      }
    };
    walk(blocks);
    tb.paras = paras.length ? paras : [{ runs: [], props: {} }];
  } else {
    tb.paras = childElements(txbx, 'w:p').map((p) => readParagraph(p, ctx));
  }
}

/** Um objeto de desenho (wps:wsp, pic:pic, grupo) → Run (sem props). */
function readGraphicObject(
  obj: XmlElement, ctx: ReadContext, wTw: number, hTw: number,
): Omit<Run, 'props'> | undefined {
  if (obj.name === 'pic:pic') {
    const image = readPic(obj, ctx, wTw, hTw);
    return image ? { text: OBJ, image } : undefined;
  }
  if (obj.name === 'wps:wsp') {
    const spPr = firstChild(obj, 'wps:spPr');
    const style = readSpPr(spPr, firstChild(obj, 'wps:style'));
    const txbx = firstChild(obj, 'wps:txbx');
    const content = txbx && firstChild(txbx, 'w:txbxContent');
    if (content) {
      const tb: DrawingTextbox = { paras: [], widthTwips: wTw, heightTwips: hTw };
      textboxBlocks(content, ctx, tb);
      bodyPrOf(tb, firstChild(obj, 'wps:bodyPr'));
      if (style.fill || style.line || style.gradient) tb.shape = style;
      if (style.rot) tb.rot = style.rot;
      return { text: OBJ, textbox: tb };
    }
    // imagem como preenchimento da forma (a:blipFill)
    const blipFill = spPr && firstChild(spPr, 'a:blipFill');
    if (blipFill) {
      const image = readPic({ name: 'pic:pic', attrs: {}, children: [blipFill] }, ctx, wTw, hTw);
      if (image) return { text: OBJ, image };
    }
    return { text: OBJ, shape: { style, widthTwips: wTw, heightTwips: hTw } };
  }
  if (obj.name === 'wpg:wgp' || obj.name === 'wpg:grpSp' || obj.name === 'wpc:wpc') {
    const grpSpPr = firstChild(obj, 'wpg:grpSpPr');
    const xfrm = grpSpPr && firstChild(grpSpPr, 'a:xfrm');
    const n = (el: XmlElement | undefined, k: string) => parseInt(el?.attrs[k] ?? '0', 10) || 0;
    const chOff = xfrm && firstChild(xfrm, 'a:chOff');
    const chExt = xfrm && firstChild(xfrm, 'a:chExt');
    const ext = xfrm && firstChild(xfrm, 'a:ext');
    const cw = n(chExt, 'cx') || n(ext, 'cx');
    const ch = n(chExt, 'cy') || n(ext, 'cy');
    const sx = cw ? (wTw * EMU_PER_TWIP) / cw : 1;
    const sy = ch ? (hTw * EMU_PER_TWIP) / ch : 1;
    const items: DrawingGroup['items'] = [];
    for (const child of childElements(obj)) {
      if (!['wps:wsp', 'pic:pic', 'wpg:grpSp'].includes(child.name)) continue;
      const cpr = firstChild(child, 'wps:spPr') ?? firstChild(child, 'pic:spPr') ?? firstChild(child, 'wpg:grpSpPr');
      const cx = cpr && firstChild(cpr, 'a:xfrm');
      const off = cx && firstChild(cx, 'a:off');
      const cext = cx && firstChild(cx, 'a:ext');
      const x = ((n(off, 'x') - n(chOff, 'x')) * sx) / EMU_PER_TWIP;
      const y = ((n(off, 'y') - n(chOff, 'y')) * sy) / EMU_PER_TWIP;
      const w = (n(cext, 'cx') * sx) / EMU_PER_TWIP;
      const h = (n(cext, 'cy') * sy) / EMU_PER_TWIP;
      const run = readGraphicObject(child, ctx, w, h);
      if (run) items.push({ x, y, w, h, run: { ...run, props: { ...DEFAULT_RUN_PROPS } } });
    }
    if (!items.length) return undefined;
    const group: DrawingGroup = { widthTwips: wTw, heightTwips: hTw, items };
    const rot = parseInt(xfrm?.attrs['rot'] ?? '0', 10);
    if (rot) group.rot = rot / 60000;
    if (xfrm?.attrs['flipH'] === '1') group.flipH = true;
    if (xfrm?.attrs['flipV'] === '1') group.flipV = true;
    return { text: OBJ, group };
  }
  return undefined;
}

/** w:drawing → run (imagem, caixa de texto, forma ou grupo). */
function readDrawingRun(drawing: XmlElement, ctx: ReadContext): Omit<Run, 'props'> | undefined {
  const anchorEl = firstChild(drawing, 'wp:anchor');
  const container = anchorEl ?? firstChild(drawing, 'wp:inline');
  if (!container) return undefined;
  const extent = firstChild(container, 'wp:extent');
  const wTw = parseInt(extent?.attrs['cx'] ?? '0', 10) / EMU_PER_TWIP;
  const hTw = parseInt(extent?.attrs['cy'] ?? '0', 10) / EMU_PER_TWIP;
  const gd = findDeep(container, 'a:graphicData');
  const obj = gd && childElements(gd).find((c) => ['pic:pic', 'wps:wsp', 'wpg:wgp', 'wpc:wpc'].includes(c.name));
  // SmartArt (a:graphicData .../diagram) ainda sem desenho: uma caixa vazia do tamanho
  // da extensão — em linha, ela ocupa a linha como uma imagem (oráculo dgmspace)
  const dgm = !obj && /\/drawingml\/2006\/diagram$/.test(gd?.attrs['uri'] ?? '');
  if (!obj && !dgm) return undefined;
  const run = obj ? readGraphicObject(obj, ctx, wTw, hTw) : { text: OBJ, shape: { style: { geom: 'rect' }, widthTwips: wTw, heightTwips: hTw } };
  if (!run) return undefined;
  const anchor = readWpAnchor(anchorEl);
  const target = run.image ?? run.textbox ?? run.shape ?? run.group;
  // em linha: a margem de efeitos (sombra, brilho) ocupa espaço na linha (oráculo effext)
  const ee = !anchorEl ? firstChild(container, 'wp:effectExtent') : undefined;
  if (ee && (run.image || run.shape)) {
    const e = (k: string) => (parseInt(ee.attrs[k] ?? '0', 10) || 0) / EMU_PER_TWIP;
    const v = { l: e('l'), t: e('t'), r: e('r'), b: e('b') };
    if (v.l || v.t || v.r || v.b) (run.image ?? run.shape)!.inlineEffect = v;
  }
  if (target && anchor) {
    target.floating = true;
    target.anchor = anchor;
    if (anchor.behindDoc && (run.image || run.textbox)) (run.image ?? run.textbox)!.behindDoc = true;
  }
  // campos legados usados pelo editor (relH/relV/offsets + XML cru p/ o save)
  for (const t of [run.image, run.textbox]) {
    if (!t) continue;
    if (anchor) {
      t.relH = anchor.posH.relativeFrom;
      t.relV = anchor.posV.relativeFrom;
      if (anchor.posH.offset !== undefined) t.offsetXTwips = anchor.posH.offset;
      if (anchor.posV.offset !== undefined) t.offsetYTwips = anchor.posV.offset;
    }
    if (drawing.raw) t.rawDrawingXml = drawing.raw;
  }
  return run;
}

/** VML (w:pict / w:object) → runs. */
function readVmlRuns(container: XmlElement, ctx: ReadContext, inline: boolean): Omit<Run, 'props'>[] {
  const out: Omit<Run, 'props'>[] = [];
  const shapeOf = (el: XmlElement, inGroup?: { sx: number; sy: number }): Omit<Run, 'props'> | undefined => {
    const st = parseVmlStyle(el.attrs['style']);
    if (st['visibility'] === 'hidden' || st['display'] === 'none') return undefined;
    let w = vmlLenTwips(st['width']) ?? 0;
    let h = vmlLenTwips(st['height']) ?? 0;
    let anchor = inGroup ? undefined : vmlAnchor(st, findDeep(el, 'w10:wrap'));
    if (inGroup) {
      w = (parseFloat(st['width'] ?? '0') || 0) * inGroup.sx;
      h = (parseFloat(st['height'] ?? '0') || 0) * inGroup.sy;
    }
    const textpath = findDeep(el, 'v:textpath');
    if (textpath) {
      // WordArt VML (marca d'água "PowerPlusWaterMark"): texto esticado na forma
      const text = textpath.attrs['string'] ?? '';
      if (!text.trim()) return undefined;
      const tps = parseVmlStyle(textpath.attrs['style']);
      const famRaw = (tps['font-family'] ?? '').replace(/^["']|["']$/g, '').trim();
      const sh = vmlShapeStyle(el, 'rect');
      // opacidade do preenchimento: misturada ao branco (a cor do texto não tem alfa)
      let color = sh.fill ?? '000000';
      const a = sh.fillAlpha;
      if (a !== undefined && a < 1) {
        const mix = (i: number) => Math.round(parseInt(color.slice(i, i + 2), 16) * a + 255 * (1 - a));
        color = [0, 2, 4].map((i) => mix(i).toString(16).padStart(2, '0')).join('').toUpperCase();
      }
      const rpr: RPr = {
        ...(famRaw ? { rFonts: { ascii: famRaw, hAnsi: famRaw, cs: famRaw } } : {}),
        color: { val: color }, sz: 72,
        ...(/bold|[6-9]00/.test(tps['font-weight'] ?? '') ? { b: true } : {}),
        ...(/italic/.test(tps['font-style'] ?? '') ? { i: true } : {}),
      };
      // props de edição derivadas do MESMO pPr (senão o espaçamento parece editado e some)
      const wppr: PPr = { jc: 'center', spacing: { before: 0, after: 0, line: 240, lineRule: 'auto' } };
      const para: Paragraph = { runs: [{ text, props: runPropsFromRPr(rpr), rpr }], props: paraPropsFromPPr(wppr), ppr: wppr };
      const tb: DrawingTextbox = { paras: [para], blocks: [{ type: 'paragraph', paragraph: para }], widthTwips: w, heightTwips: h, vml: true, insets: { l: 0, t: 0, r: 0, b: 0 }, vAnchor: 'ctr', wordArt: 'textPlain' };
      const rot = parseFloat(st['rotation'] ?? '0');
      if (rot) tb.rot = rot;
      const run: Omit<Run, 'props'> = { text: OBJ, textbox: tb };
      if (anchor) {
        tb.floating = true;
        tb.anchor = anchor;
        if (anchor.behindDoc) tb.behindDoc = true;
        tb.relH = anchor.posH.relativeFrom;
        tb.relV = anchor.posV.relativeFrom;
        if (anchor.posH.offset !== undefined) tb.offsetXTwips = anchor.posH.offset;
        if (anchor.posV.offset !== undefined) tb.offsetYTwips = anchor.posV.offset;
      }
      return run;
    }
    const imagedata = firstChild(el, 'v:imagedata');
    const rid = imagedata?.attrs['r:id'] ?? imagedata?.attrs['r:pict'];
    let run: Omit<Run, 'props'> | undefined;
    if (rid) {
      const media = ctx.resolveImage(rid);
      if (!media) return undefined;
      const image: InlineImage = { data: media.data, ext: media.ext, widthTwips: w, heightTwips: h, vml: true };
      const crop = (k: string) => {
        const v = imagedata!.attrs[k];
        if (!v) return 0;
        return v.endsWith('f') ? parseInt(v, 10) / 65536 : parseFloat(v);
      };
      const c = { l: crop('cropleft'), t: crop('croptop'), r: crop('cropright'), b: crop('cropbottom') };
      if (c.l || c.t || c.r || c.b) image.crop = c;
      const fx = vmlImageEffects(imagedata!);
      if (fx) image.effects = fx;
      run = { text: OBJ, image };
    } else {
      const txb = firstChild(el, 'v:textbox');
      const content = txb && firstChild(txb, 'w:txbxContent');
      if (content) {
        const tb: DrawingTextbox = { paras: [], widthTwips: w, heightTwips: h, vml: true };
        textboxBlocks(content, ctx, tb);
        const inset = (txb!.attrs['inset'] ?? '').split(',');
        const ins = (i: number, def: number) => (inset[i] && inset[i]!.trim() ? vmlLenTwips(inset[i]!.trim()) ?? def : def);
        tb.insets = { l: ins(0, 144), t: ins(1, 72), r: ins(2, 144), b: ins(3, 72) };
        const tbStyle = parseVmlStyle(txb!.attrs['style']);
        if (tbStyle['mso-fit-shape-to-text'] === 't') tb.autoFit = true;
        if (parseVmlStyle(el.attrs['style'])['mso-wrap-style'] === 'none') tb.noWrap = true;
        const sh = vmlShapeStyle(el, 'rect');
        if (sh.fill || sh.line) tb.shape = sh;
        run = { text: OBJ, textbox: tb };
      } else {
        const tag = el.name.replace(/^v:/, '');
        const type = el.attrs['type'] ?? '';
        const declared = el.attrs['fillcolor'] || el.attrs['strokecolor'] || el.attrs['filled'] || el.attrs['stroked']
          || firstChild(el, 'v:fill') || firstChild(el, 'v:stroke');
        if (tag === 'shape' && (type.includes('_x0000_t75') || !declared)) {
          return undefined; // moldura de imagem sem imagem / forma sem aparência declarada
        }
        const geom = tag === 'oval' ? 'ellipse' : tag === 'roundrect' ? 'roundRect'
          : tag === 'line' || type.includes('_x0000_t32') ? 'line' : 'rect';
        const style = vmlShapeStyle(el, geom);
        if (geom === 'line') delete style.fill;
        const shape: DrawingShape = { style, widthTwips: w, heightTwips: h };
        if (el.attrs['o:hr'] === 't') shape.hr = true;
        if (tag === 'line') {
          const pt = (s: string | undefined) => (s ?? '0,0').split(',').map((v) => vmlLenTwips(v.trim()) ?? 0);
          const [x1 = 0, y1 = 0] = pt(el.attrs['from']);
          const [x2 = 0, y2 = 0] = pt(el.attrs['to']);
          shape.line = { x1, y1, x2, y2 };
          shape.widthTwips = Math.abs(x2 - x1);
          shape.heightTwips = Math.abs(y2 - y1);
          if (!anchor && !inGroup) anchor = vmlAnchor({ ...st, position: 'absolute' });
        }
        run = { text: OBJ, shape };
      }
    }
    const target = run.image ?? run.textbox ?? run.shape;
    if (target && anchor) {
      target.floating = true;
      target.anchor = anchor;
      if (run.image || run.textbox) {
        const t = (run.image ?? run.textbox)!;
        if (anchor.behindDoc) t.behindDoc = true;
        t.relH = anchor.posH.relativeFrom;
        t.relV = anchor.posV.relativeFrom;
        if (anchor.posH.offset !== undefined) t.offsetXTwips = anchor.posH.offset;
        if (anchor.posV.offset !== undefined) t.offsetYTwips = anchor.posV.offset;
      }
    }
    return run;
  };
  for (const el of childElements(container)) {
    if (el.name === 'v:shapetype' || el.name.startsWith('o:') || el.name.startsWith('w10:')) continue;
    if (el.name === 'v:group') {
      const st = parseVmlStyle(el.attrs['style']);
      const w = vmlLenTwips(st['width']) ?? 0;
      const h = vmlLenTwips(st['height']) ?? 0;
      const cs = (el.attrs['coordsize'] ?? '1000,1000').split(',').map((v) => parseFloat(v) || 1000);
      const co = (el.attrs['coordorigin'] ?? '0,0').split(',').map((v) => parseFloat(v) || 0);
      const sx = w / (cs[0] || 1), sy = h / (cs[1] || 1);
      const items: DrawingGroup['items'] = [];
      for (const c of childElements(el)) {
        if (!c.name.startsWith('v:') || c.name === 'v:shapetype') continue;
        const cst = parseVmlStyle(c.attrs['style']);
        const r = shapeOf(c, { sx, sy });
        if (!r) continue;
        const x = ((parseFloat(cst['left'] ?? '0') || 0) - (co[0] ?? 0)) * sx;
        const y = ((parseFloat(cst['top'] ?? '0') || 0) - (co[1] ?? 0)) * sy;
        const tgt = r.image ?? r.textbox ?? r.shape;
        items.push({ x, y, w: tgt?.widthTwips ?? 0, h: tgt?.heightTwips ?? 0, run: { ...r, props: { ...DEFAULT_RUN_PROPS } } });
      }
      if (!items.length) continue;
      const group: DrawingGroup = { widthTwips: w, heightTwips: h, items };
      const anchor = vmlAnchor(st, findDeep(el, 'w10:wrap'));
      if (anchor) { group.floating = true; group.anchor = anchor; }
      out.push({ text: OBJ, group });
      continue;
    }
    if (el.name.startsWith('v:')) {
      const r = shapeOf(el);
      if (r) {
        // w:object: a imagem do OLE é inline
        if (inline && r.image) { delete r.image.floating; delete r.image.anchor; }
        out.push(r);
      }
    }
  }
  return out;
}

function textContentOf(el: XmlElement): string {
  let out = '';
  for (const c of el.children) out += typeof c === 'string' ? c : textContentOf(c);
  return out;
}

/** Destino dos runs: resultado do campo aberto (se houver) ou o parágrafo. */
function runTarget(ctx: ReadContext, runs: Run[]): Run[] | null {
  const top = ctx.fieldStack?.[ctx.fieldStack.length - 1];
  if (!top) return runs;
  if (top.phase === 'instr') return null; // conteúdo da instrução: descartado
  return top.crossed ? runs : top.runs;
}

const isObjectRun = (r: Run): boolean => !!(r.image || r.textbox || r.shape || r.group);

/** Fecha o campo do topo da pilha, emitindo o run achatado (texto + runs formatados). */
function closeField(ctx: ReadContext, runs: Run[]): void {
  const f = ctx.fieldStack!.pop()!;
  if (f.crossed) return;
  const textRuns = f.runs.filter((r) => !isObjectRun(r));
  const text = textRuns.map((r) => r.text).join('');
  const first = textRuns[0] ?? f.runs[0];
  const parent = ctx.fieldStack![ctx.fieldStack!.length - 1];
  if (parent && parent.phase === 'instr') { parent.instr += text; return; }
  const run: Run = {
    text,
    props: { ...(first?.props ?? f.props) },
    field: ` ${f.instr.trim()} `,
  };
  // campo de formulário: a formatação é a do run do fldChar begin
  const rpr = f.ff ? f.rpr : (first?.rpr ?? f.rpr);
  if (rpr) run.rpr = rpr;
  if (f.ff) run.formField = f.ff;
  if (f.runs.length) run.fieldResult = f.runs;
  runTarget(ctx, runs)?.push(run);
}

/** Lê os runs de um container (w:r diretos, w:hyperlink, m:oMath, w:fldSimple…). */
function readRunsInto(
  runs: Run[],
  container: XmlElement,
  ctx: ReadContext,
  inherit?: { link?: string; field?: string },
): void {
  for (const child of childElements(container)) {
    switch (child.name) {
      case 'w:commentRangeStart':
        ctx.activeComments?.add(parseInt(child.attrs['w:id'] ?? '-1', 10));
        break;
      case 'w:commentRangeEnd':
        ctx.activeComments?.delete(parseInt(child.attrs['w:id'] ?? '-1', 10));
        break;
      case 'w:bookmarkStart': {
        const name = child.attrs['w:name'];
        if (name) ctx.onBookmark?.(name, runs.reduce((n, r) => n + r.text.length, 0));
        break;
      }
      case 'w:r':
        readSingleRun(runs, child, ctx, inherit);
        break;
      case 'w:hyperlink': {
        const rid = child.attrs['r:id'];
        const anchor = child.attrs['w:anchor'];
        const link = (rid && ctx.resolveLink(rid)) || (anchor ? `#${anchor}` : undefined);
        readRunsInto(runs, child, ctx, { ...inherit, link });
        break;
      }
      case 'w:fldSimple': {
        const instr = child.attrs['w:instr'] ?? '';
        const inner: Run[] = [];
        readRunsInto(inner, child, ctx, inherit);
        const textRuns = inner.filter((r) => !isObjectRun(r));
        const first = textRuns[0];
        const run: Run = {
          text: textRuns.map((r) => r.text).join(''),
          props: { ...(first?.props ?? DEFAULT_RUN_PROPS) },
          field: instr,
        };
        if (first?.rpr) run.rpr = first.rpr;
        if (inner.length) run.fieldResult = inner;
        runTarget(ctx, runs)?.push(run);
        break;
      }
      case 'm:oMath':
      case 'm:oMathPara': {
        const text = collectMathText(child);
        if (text) runTarget(ctx, runs)?.push({ text, props: { ...DEFAULT_RUN_PROPS, italic: true, isMath: true } });
        break;
      }
      case 'w:sdt': {
        const content = findDeep(child, 'w:sdtContent');
        const sdtPr = firstChild(child, 'w:sdtPr');
        const tag = sdtPr ? firstChild(sdtPr, 'w:tag')?.attrs['w:val'] : undefined;
        const custom = parseCustomInlineTag(tag);
        if (content && custom) {
          const nested: Run[] = [];
          readRunsInto(nested, content, ctx, inherit);
          const fallbackText = nested.map((run) => run.text).join('');
          runTarget(ctx, runs)?.push({
            text: '\uFFFC',
            props: { ...(nested[0]?.props ?? DEFAULT_RUN_PROPS) },
            custom: { ...custom, fallbackText },
          });
        } else if (content) {
          readRunsInto(runs, content, ctx, inherit);
        }
        break;
      }
      case 'w:smartTag':
      case 'w:ins':
      case 'w:moveTo':
      case 'w:customXml':
      case 'w:dir':
      case 'w:bdo':
        readRunsInto(runs, child, ctx, inherit);
        break;
      // w:del / w:moveFrom: texto excluído (visão "final") — fora do fluxo
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
  const rpr = readRPr(firstChild(rEl, 'w:rPr'));
  const rProps = runPropsFromRPr(rpr);
  if (inherit?.link) {
    rProps.link = inherit.link;
    rProps.underline = true;
    rProps.color ??= '0563C1';
  }
  ctx.fieldStack ??= [];
  const stack = ctx.fieldStack;
  const make = (text: string, extra?: Partial<Run>): Run => {
    const props = { ...rProps };
    if (ctx.activeComments?.size) props.commentIds = [...ctx.activeComments];
    const run: Run = { text, props, ...(inherit?.field ? { field: inherit.field } : {}), ...extra };
    if (rpr) run.rpr = rpr;
    if (stack.some((f) => f.phase === 'result' && /^\s*TOC\b/i.test(f.instr))) run.inToc = true;
    return run;
  };
  let text = '';
  const flush = () => {
    if (text.length === 0) return;
    runTarget(ctx, runs)?.push(make(text));
    text = '';
  };
  const pushRun = (extra: Partial<Run> & { text: string }) => {
    flush();
    runTarget(ctx, runs)?.push(make(extra.text, extra));
  };
  for (const child of childElements(rEl)) {
    if (child.name === 'w:rPr') continue;
    // campos complexos: fldChar begin/separate/end + instrText (PAGE, NUMPAGES…)
    if (child.name === 'w:fldChar') {
      flush();
      const type = child.attrs['w:fldCharType'];
      if (type === 'begin') {
        const frame: FieldFrame = { instr: '', phase: 'instr', runs: [], crossed: false, props: { ...rProps } };
        if (rpr) frame.rpr = rpr;
        const ff = firstChild(child, 'w:ffData');
        if (ff) {
          const cb = firstChild(ff, 'w:checkBox');
          if (cb) {
            const def = firstChild(cb, 'w:default')?.attrs['w:val'];
            const chk = firstChild(cb, 'w:checked');
            const size = firstChild(cb, 'w:size')?.attrs['w:val'];
            frame.ff = {
              type: 'checkBox',
              checked: chk ? chk.attrs['w:val'] !== '0' && chk.attrs['w:val'] !== 'false' : def === '1' || def === 'true',
              ...(size ? { sizeHalfPt: parseInt(size, 10) } : {}),
              ...(firstChild(cb, 'w:sizeAuto') || !size ? { sizeAuto: true } : {}),
            };
          } else if (firstChild(ff, 'w:ddList')) {
            // o Word exibe a entrada w:result; sem ela (ou fora da lista), w:default;
            // senão a 1ª — nunca o resultado em cache (oráculo hidetext/ff-dropdown)
            const dl = firstChild(ff, 'w:ddList')!;
            const entries = childElements(dl, 'w:listEntry').map((e) => e.attrs['w:val'] ?? '');
            const idx = (name: string): number | undefined => {
              const k = parseInt(firstChild(dl, name)?.attrs['w:val'] ?? '', 10);
              return Number.isInteger(k) && k >= 0 && k < entries.length ? k : undefined;
            };
            frame.ff = { type: 'dropDown', entries, selected: idx('w:result') ?? idx('w:default') ?? 0 };
          }
          else if (firstChild(ff, 'w:textInput')) frame.ff = { type: 'textInput' };
        }
        stack.push(frame);
      } else if (type === 'separate') {
        const top = stack[stack.length - 1];
        if (top) top.phase = 'result';
      } else if (type === 'end') {
        if (stack.length) closeField(ctx, runs);
      }
      continue;
    }
    if (child.name === 'w:instrText') {
      const top = stack[stack.length - 1];
      if (top && top.phase === 'instr') top.instr += textContentOf(child);
      continue;
    }
    switch (child.name) {
      case 'w:t':
        // U+00AD LITERAL no texto não é hífen opcional para o Word: aparece
        // sempre (hífen da própria fonte) e não quebra a linha — igual ao
        // w:noBreakHyphen (oráculo hidetext/shy-literal). Opcional é só w:softHyphen.
        // quebra de linha LITERAL (CR, LF, CRLF) no texto é um espaço para o Word
        // (e ele a grava assim) — só w:br/w:cr quebram a linha (oráculo ctlspace)
        text += child.children.filter((c): c is string => typeof c === 'string').join('').replace(/\u00AD/g, '\u2011').replace(/\r\n|[\r\n]/g, ' ');
        break;
      case 'w:tab':
        text += '\t';
        break;
      case 'w:ptab':
        pushRun({
          text: '\t',
          ptab: {
            alignment: child.attrs['w:alignment'] ?? 'left',
            relativeTo: child.attrs['w:relativeTo'] ?? 'margin',
            ...(child.attrs['w:leader'] ? { leader: child.attrs['w:leader'] } : {}),
          },
        });
        break;
      case 'w:br':
      case 'w:cr': {
        // \f = quebra de página; \u000B = quebra de coluna; \n = quebra de linha
        const t = child.attrs['w:type'];
        // quebra de linha com w:clear (desce para baixo dos flutuantes): U+2028
        const clr = child.attrs['w:clear'];
        text += t === 'page' ? '\f' : t === 'column' ? '\u000B' : clr && clr !== 'none' ? '\u2028' : '\n';
        break;
      }
      case 'w:noBreakHyphen':
        text += '\u2011';
        break;
      case 'w:softHyphen':
        text += '\u00AD';
        break;
      case 'w:sym': {
        const hex = child.attrs['w:char'] ?? 'F0B7';
        let code = parseInt(hex, 16);
        // só códigos legados de 1 byte mapeiam para a área privada F0xx;
        // valores Unicode reais (ex.: 2612 ☒) ficam como estão
        if (code <= 0xff) code |= 0xf000;
        const font = child.attrs['w:font'];
        flush();
        const run = make(String.fromCharCode(code));
        run.props.fontAscii = font ?? rProps.fontAscii;
        if (font) run.symFont = font;
        runTarget(ctx, runs)?.push(run);
        break;
      }
      case 'w:footnoteReference':
      case 'w:endnoteReference': {
        const id = parseInt(child.attrs['w:id'] ?? '0', 10);
        flush();
        const run = make('', { noteRef: { kind: child.name === 'w:footnoteReference' ? 'footnote' : 'endnote', id } });
        run.props.vertAlign = 'superscript';
        runTarget(ctx, runs)?.push(run);
        break;
      }
      case 'w:footnoteRef':
      case 'w:endnoteRef':
        // número da própria nota (dentro de footnotes.xml): o motor numera
        pushRun({ text: '', field: child.name === 'w:footnoteRef' ? ' FOOTNOTEREF_MARK ' : ' ENDNOTEREF_MARK ' });
        break;
      case 'w:pgNum':
        pushRun({ text: '', field: ' PAGE ' });
        break;
      case 'w:drawing': {
        const r = readDrawingRun(child, ctx);
        if (r) pushRun(r);
        break;
      }
      case 'w:pict':
        for (const r of readVmlRuns(child, ctx, false)) pushRun(r);
        break;
      case 'w:object':
        for (const r of readVmlRuns(child, ctx, true)) pushRun(r);
        break;
      case 'mc:AlternateContent': {
        // formas/caixas de texto de DrawingML: o w:drawing moderno fica em
        // mc:Choice (Requires="wps"); o mc:Fallback é VML.
        const choice = firstChild(child, 'mc:Choice');
        const drawing = choice && findDeep(choice, 'w:drawing');
        const r = drawing && readDrawingRun(drawing, ctx);
        if (r) pushRun(r);
        else {
          const fb = firstChild(child, 'mc:Fallback');
          const pict = fb && (findDeep(fb, 'w:pict') ?? findDeep(fb, 'w:object'));
          if (pict) for (const v of readVmlRuns(pict, ctx, pict.name === 'w:object')) pushRun(v);
        }
        break;
      }
      case 'w:ruby': {
        const base = firstChild(child, 'w:rubyBase');
        if (base) { flush(); readRunsInto(runs, base, ctx, inherit); }
        break;
      }
    }
  }
  flush();
}

export function readParagraph(pEl: XmlElement, ctx: ReadContext): Paragraph {
  const ppr = readPPr(firstChild(pEl, 'w:pPr'));
  const props = paraPropsFromPPr(ppr);
  const runs: Run[] = [];
  readRunsInto(runs, pEl, ctx);
  // campo cujo resultado atravessa o fim do parágrafo (ex.: TOC): o pedaço
  // deste parágrafo vira o run do campo; o resto segue como runs normais
  const stack = ctx.fieldStack ?? [];
  for (let i = stack.length - 1; i >= 0; i--) {
    const f = stack[i]!;
    if (f.phase !== 'result' || f.crossed) continue;
    if (i === stack.length - 1 && f.runs.length) {
      const textRuns = f.runs.filter((r) => !isObjectRun(r));
      const first = textRuns[0] ?? f.runs[0];
      const run: Run = {
        text: textRuns.map((r) => r.text).join(''),
        props: { ...(first?.props ?? f.props) },
        field: ` ${f.instr.trim()} `,
        fieldResult: f.runs,
      };
      const rpr = first?.rpr ?? f.rpr;
      if (rpr) run.rpr = rpr;
      runs.push(run);
    }
    f.crossed = true;
    f.runs = [];
  }
  // campo TOC (mesmo "sujo"/sem cache): marca o parágrafo p/ geração
  const instr = collectInstrText(pEl);
  if (/\bTOC\b/.test(instr)) props.tocInstr = instr.trim();
  const para: Paragraph = { runs, props };
  if (ppr) para.ppr = ppr;
  return para;
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
    fieldStack: [],
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

/**
 * Modelo de dados que espelha o PresentationML/DrawingML literalmente
 * (ppt/presentation.xml, ppt/slides/slideN.xml). Sem camada "bonita": os tipos
 * correspondem aos elementos OOXML — e o que garante compatibilidade.
 *
 * Unidades de geometria em EMU (English Metric Units): 914400 por polegada,
 * 12700 por ponto. Tamanho de fonte (sz) em centesimos de ponto.
 */

export const EMU_PER_INCH = 914400;
export const EMU_PER_POINT = 12700;
/** EMU -> pixels @96dpi. */
export const EMU_PER_PX = EMU_PER_INCH / 96; // 9525

/** Referencia de slide em ppt/presentation.xml (<p:sldId>). */
export interface SlideRef {
  id: string;
  rId: string;
  /** Caminho resolvido (ex.: "ppt/slides/slide1.xml"). */
  target?: string;
}

export interface Presentation {
  /** Largura/altura do slide em EMU (<p:sldSz cx cy>). */
  slideW: number;
  slideH: number;
  sizeType?: string;
  slides: SlideRef[];
}

/** Parada de gradiente (`<a:gs pos>`), pos normalizado 0..1. */
export interface GradientStop {
  pos: number;
  color: string;
}

/**
 * Preenchimento (solidFill / noFill / gradFill linear). Cores ja resolvidas
 * p/ #RRGGBB. Para `gradient`, `stops` vem de `<a:gsLst>` e `angleDeg` do
 * `<a:lin ang>` (graus no sentido horario, 0 = esquerda→direita).
 */
export interface Fill {
  type: 'solid' | 'none' | 'gradient';
  color?: string;
  stops?: GradientStop[];
  angleDeg?: number;
  /** `<a:lin scaled="1">`: o vetor do gradiente é esticado pela proporção do rect
   *  (45° vira a diagonal geométrica do retângulo, não 45° absolutos). */
  scaled?: boolean;
}

/**
 * Imagem embutida resolvida a partir de `<a:blip r:embed="rIdN">` via o `.rels`
 * do slide. Mantemos os bytes brutos — o renderer decodifica para `HTMLImageElement`.
 */
export interface ImageRef {
  /** Caminho da parte no pacote (ex.: "ppt/media/image1.png"). Usada como chave de cache. */
  part: string;
  /** Bytes brutos da imagem (PNG/JPEG/GIF/SVG). */
  bytes: Uint8Array;
  /** MIME inferido pela extensao (image/png, image/jpeg, image/gif, image/svg+xml). */
  mime: string;
}

/** Geometria de uma forma (<a:xfrm>) em EMU. */
export interface Xfrm {
  x: number;
  y: number;
  cx: number;
  cy: number;
  rot?: number; // 1/60000 de grau
  flipH?: boolean;
  flipV?: boolean;
}

/** Run de texto (<a:r><a:rPr/><a:t>). */
export interface Run {
  text: string;
  sz?: number;       // pontos (sz/100)
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;    // #RRGGBB
  font?: string;
  /** Hyperlink alvo (resolvido via slideRels a partir de `<a:hlinkClick r:id>`). */
  hyperlink?: string;
}

/** Paragrafo (<a:p>). */
export interface Paragraph {
  align?: string;    // l | ctr | r | just
  level?: number;    // 0-based (a:pPr lvl)
  runs: Run[];
  /** Marcador (bullet) presente. `false` = buNone explicito. */
  bullet?: boolean;
  /** Caractere do bullet (`<a:buChar char>` ou herdado da cascata de estilos). */
  bulletChar?: string;
  /** Esquema de numeracao (`<a:buAutoNum type>`, ex.: arabicPeriod). */
  bulletAutoNum?: string;
  /** Margem esquerda do paragrafo em EMU (`a:pPr marL` ou herdada por nivel). */
  marL?: number;
  /** Indent da primeira linha em EMU (`a:pPr indent`, tipicamente negativo). */
  indent?: number;
}

/** Corpo de texto (<p:txBody>). */
export interface TextBody {
  anchor?: string;   // t | ctr | b (a:bodyPr anchor)
  paragraphs: Paragraph[];
  /** Quebra de linha (`<a:bodyPr wrap>`): "square" (default) | "none". */
  wrap?: string;
  /** Escala de fonte do autofit (`<a:normAutofit fontScale>`), 0..1. */
  fontScale?: number;
  /** Reducao de entrelinha do autofit (`<a:normAutofit lnSpcReduction>`), 0..1. */
  lnSpcReduction?: number;
  /** Insets do bodyPr em EMU (lIns/tIns/rIns/bIns); ausentes = default do app. */
  insL?: number;
  insT?: number;
  insR?: number;
  insB?: number;
  /** `<a:lstStyle>` proprio do txBody, ja parseado por nivel (maior prioridade). */
  lstStyle?: import('./text-style.js').TextStyleLevel[];
}

/** Forma (<p:sp> ou <p:pic>). Quando `image` esta preenchida, e um `<p:pic>` e o
 *  renderer desenha a imagem em `xfrm` (com `srcRect` opcional para crop). */
export interface Shape {
  id: string;
  name: string;
  /** Placeholder (<p:ph type idx>) — herda geometria do layout/master. */
  phType?: string;
  phIdx?: string;
  isTextBox?: boolean;
  xfrm?: Xfrm;
  geom?: string;     // prstGeom prst (rect, ellipse, roundRect, …)
  fill?: Fill;
  lineColor?: string;
  lineWidth?: number; // EMU
  txBody?: TextBody;
  /** Imagem embutida (<p:pic>) com bytes ja resolvidos via rels. */
  image?: ImageRef;
  /** Crop normalizado [0..1] (`<a:srcRect l t r b>` em milesimos de %). */
  srcRect?: { l: number; t: number; r: number; b: number };
  /** Opacidade 0..1, vinda de `<a:alphaModFix amt="...">` (milesimos de %). */
  alpha?: number;
  /** XML cru do chart (`ppt/charts/chartN.xml`) — engine parseia on-demand no paint. */
  chartXml?: string;
  /** Paleta default do chart = accents 1..6 do TEMA (séries sem spPr). */
  chartPalette?: string[];
  /** Tabela embutida (`<a:tbl>` dentro de `<p:graphicFrame>`). */
  table?: Table;
  /**
   * Sombra externa (`<a:effectLst><a:outerShdw>`). EMU para `blurRad`/`dist`,
   * `dir` em 1/60000 de grau (0 = direita; 5400000 = baixo-esq), `alpha` em
   * milésimos de %.
   */
  shadow?: { color: string; blurRad: number; dist: number; dirDeg: number; alpha: number };
  /** Transparência do fill (`<a:solidFill><a:srgbClr><a:alpha val=...`). 0..1. */
  fillAlpha?: number;
  /** Estilo de traço da borda (`<a:ln><a:prstDash val>`). v1: solid|dash|dot|lgDash|sysDash. */
  lineDash?: string;
  /**
   * Imagem de PREENCHIMENTO da shape (`<p:spPr><a:blipFill>` com stretch) —
   * diferente de `image` (que e um `<p:pic>` inteiro). Desenhada esticada
   * dentro do path da geometria.
   */
  fillImage?: ImageRef;
  /**
   * Cor de texto default vinda de `<p:style><a:fontRef>` (resolvida via tema).
   * Aplicada na cascata quando run/lstStyle nao especificam cor.
   */
  styleFontColor?: string;
  /** `<a:fontRef idx>` (major|minor) — resolve fonte via fontScheme do tema. */
  styleFontIdx?: string;
}

/** Célula de tabela (`<a:tc>`). */
export interface TableCell {
  /** Mesclagem horizontal: ocupa N colunas (default 1). `<a:tc gridSpan="N">`. */
  gridSpan?: number;
  /** Mesclagem vertical: ocupa N linhas. `<a:tc rowSpan="N">`. */
  rowSpan?: number;
  /** Célula coberta por gridSpan da vizinha — não desenha. */
  hMerge?: boolean;
  /** Célula coberta por rowSpan da vizinha de cima — não desenha. */
  vMerge?: boolean;
  /** Conteúdo da célula. */
  txBody?: TextBody;
  /** Cor de fundo sólida (`<a:tcPr><a:solidFill>`). */
  fill?: string;
  /** Cor da borda (lados L/R/T/B) — v1 usa cor uniforme média. */
  borderColor?: string;
  /** Espessura da borda em EMU (`<a:lnL w>`). v1: max dos 4 lados. */
  borderWidth?: number;
  /** Anchor vertical do txBody (t/ctr/b). */
  anchor?: string;
  /** Cor default do texto vinda do ESTILO da tabela (tcTxStyle). */
  txColor?: string;
  /** Negrito default vindo do estilo da tabela (firstRow etc.). */
  txBold?: boolean;
}

/** Linha de tabela (`<a:tr>`). */
export interface TableRow {
  /** Altura em EMU (atributo `h`). */
  heightEmu: number;
  cells: TableCell[];
}

/** Tabela (`<a:tbl>` dentro de `<p:graphicFrame>`). */
export interface Table {
  /** Larguras das colunas em EMU (`<a:tblGrid><a:gridCol w>`). */
  colWidthsEmu: number[];
  rows: TableRow[];
}

/**
 * Efeito de entrada (`<p:par>` dentro de `<p:seq>` em `<p:timing>`). v1
 * cobre o padrão "cascade fade" do showcase: cada shape recebe um set de
 * visibility + animEffect filter="fade", com delay relativo à anterior e
 * `dur` no `<p:cTn>` que envolve o animEffect.
 *
 * Convenção do nosso runtime: `delayMs` é o atraso desde o início da playback
 * (acumulado a partir dos `stCondLst/cond@delay` ao longo da cadeia). `endMs`
 * = momento absoluto em que a transição termina.
 */
export interface SlideAnimEntry {
  /** Target shape id (atributo `cNvPr.id`, alvo de `<p:spTgt spid>`). */
  spid: string;
  /** Atraso absoluto em ms para o INÍCIO desse efeito. */
  delayMs: number;
  /** Duração em ms da transição (default 500). */
  durMs: number;
  /** Tipo do efeito de entrada. */
  type: 'fade' | 'appear';
  /** True quando o nodeType é `clickEffect` (espera clique para começar). */
  clickGated?: boolean;
}

/**
 * Transição entre slides (`<p:transition>`). v1 reconhece `fade` e `push`
 * (com direção `l|r|u|d`); demais tipos viram `fade` como fallback.
 */
export interface SlideTransition {
  type: 'fade' | 'push' | 'wipe' | 'cover' | 'dissolve' | 'blinds' | 'split' | 'circle';
  /** Duração mapeada de `spd` (fast=300, med=500, slow=1000). */
  durMs: number;
  /** Direção do push/cover/wipe (`l|r|u|d|t|b`). */
  dir?: string;
}

/** Slide (<p:sld>). */
export interface Slide {
  shapes: Shape[];
  /** Cor de fundo do slide (se sobrescrita no proprio slide). */
  bg?: Fill;
  /** Imagem de fundo (`<p:bgPr><a:blipFill>`) — desenhada antes das shapes. */
  bgImage?: ImageRef;
  /** Efeitos de entrada animados, em ordem do `<p:seq>` (`<p:timing>`). */
  animations?: SlideAnimEntry[];
  /** Transição quando o slide ENTRA (vinda do anterior). */
  transition?: SlideTransition;
}

/** Mapa de cores do tema (<a:clrScheme>) + clrMap aplicado. */
export interface Theme {
  /** Nome de cor (dk1,lt1,accent1…,tx1,bg1,…) -> #RRGGBB. */
  colors: Record<string, string>;
  /** Fontes do fontScheme (`+mj-lt` → major, `+mn-lt` → minor). */
  fonts?: { major?: string; minor?: string };
}

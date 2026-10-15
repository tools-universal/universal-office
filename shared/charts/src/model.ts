/**
 * Modelo de um `<c:chartSpace>` (DrawingML Chart, ISO/IEC 29500-1 §21.2) já com
 * as cores resolvidas pelo tema do hospedeiro. Ausente = default do Office
 * (decidido no layout/pintura, que conhece o estilo `c:style`).
 */

/** Propriedades de texto (`a:defRPr`/`a:rPr`) — ausentes herdam. */
export interface TextProps {
  /** Tamanho em pt. */
  sz?: number;
  b?: boolean;
  i?: boolean;
  u?: boolean;
  color?: string;
  alpha?: number;
  font?: string;
  /** Rotação do bloco (`a:bodyPr rot`) em graus; -90 = vertical subindo. */
  rot?: number;
  /** `a:bodyPr vert` (vert, vert270, wordArtVert…). */
  vert?: string;
}

export interface GradStop { pos: number; color: string; alpha?: number }

/** `<a:tile>`: escala (1 = tamanho natural), deslocamento (pt), alinhamento e espelho do ladrilho. */
export interface BlipTile { sx: number; sy: number; tx: number; ty: number; algn: string; flip?: 'x' | 'y' | 'xy' }

export type Paint =
  | { kind: 'none' }
  | { kind: 'solid'; color: string; alpha?: number }
  | { kind: 'grad'; stops: GradStop[]; angle: number; path?: 'circle' | 'rect' | 'shape' }
  | { kind: 'patt'; fg: string; bg: string; prst: string }
  /**
   * `a:blipFill`: imagem da parte do gráfico — `ref` é a chave opaca que o
   * hospedeiro deu ao `<a:blip>` (`ChartHost.blip`) e devolve decodificada na
   * pintura (`RenderOptions.image`). Sem `tile` = esticada (`a:stretch`) no
   * retângulo recuado por `fillRect` (frações dos lados).
   */
  | { kind: 'blip'; ref: string; tile?: BlipTile; fillRect?: { l: number; t: number; r: number; b: number }; alpha?: number };

export interface LineProps {
  /** null = sem linha (`a:noFill`). */
  paint?: Paint;
  /** Largura em pt. */
  w?: number;
  dash?: string;
  cap?: string;
}

/** `c:spPr`: undefined em cada campo = default do estilo. */
export interface ShapeProps {
  fill?: Paint;
  line?: LineProps;
  /** Sombra externa (effectLst/outerShdw) — só a presença e cor/alpha/deslocamento. */
  shadow?: { color: string; alpha: number; dx: number; dy: number; blur: number };
}

export interface ManualLayout {
  /** inner = retângulo da área de plotagem SEM rótulos de eixo; outer = com. */
  target?: 'inner' | 'outer';
  xMode?: 'edge' | 'factor';
  yMode?: 'edge' | 'factor';
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface RichPara {
  runs: { text: string; props: TextProps }[];
  props: TextProps;
  align?: string;
  /** Parágrafo sem `a:pPr/a:defRPr`: o título usa o estilo próprio do Office (18,62 pt, regular). */
  noDefRPr?: boolean;
}

export interface ChartTitle {
  /** Texto rico (`c:tx/c:rich`); undefined = título automático. */
  paras?: RichPara[];
  /** `c:tx/c:strRef` (texto de célula). */
  text?: string;
  overlay: boolean;
  layout?: ManualLayout;
  sp: ShapeProps;
  txPr: TextProps;
}

export interface NumFmt { code: string; linked: boolean }

export interface DLbls {
  delete?: boolean;
  showVal?: boolean;
  showCat?: boolean;
  showSer?: boolean;
  showPct?: boolean;
  showBubble?: boolean;
  showLegendKey?: boolean;
  pos?: string;
  sep?: string;
  numFmt?: NumFmt;
  txPr: TextProps;
  sp: ShapeProps;
  /** Rótulos de ponto (`c:dLbl idx`) — sobrepõem os da série. */
  points?: Map<number, DLbls & { text?: string; layout?: ManualLayout }>;
}

/** `c:trendline`: tipo, estilo, extrapolação e o rótulo da equação/R². */
export interface Trendline {
  kind: string;
  sp: ShapeProps;
  order?: number;
  period?: number;
  name?: string;
  forward?: number;
  backward?: number;
  intercept?: number;
  dispEq?: boolean;
  dispRSqr?: boolean;
  label?: { layout?: ManualLayout; numFmt?: NumFmt; txPr: TextProps; sp: ShapeProps };
}

export interface Marker { symbol?: string; size?: number; sp: ShapeProps }

export interface DataPoint {
  sp: ShapeProps;
  marker?: Marker;
  explosion?: number;
  invertIfNegative?: boolean;
  bubble3D?: boolean;
}

export interface Series {
  idx: number;
  order: number;
  name: string;
  values: (number | null)[];
  /** Rótulos de categoria por ponto (texto já formatado) e os números crus quando numéricos. */
  cats?: string[];
  catNums?: (number | null)[];
  /** Níveis extras de categoria (multiLvlStrRef), do mais interno ao externo. */
  catLevels?: string[][];
  catFmt?: string;
  xVals?: (number | null)[];
  bubble?: (number | null)[];
  fmt?: string;
  /** Formato por ponto (`c:pt formatCode`), quando o cache traz — vence `fmt`. */
  ptFmts?: (string | undefined)[];
  sp: ShapeProps;
  marker?: Marker;
  smooth?: boolean;
  invertIfNegative?: boolean;
  explosion?: number;
  dPts: Map<number, DataPoint>;
  dLbls?: DLbls;
  trendlines: Trendline[];
  /** Caixa estreita (chartex): o que mostrar e o método dos quartis. */
  box?: { meanLine: boolean; meanMarker: boolean; outliers: boolean; nonoutliers: boolean; exclusive: boolean };
}

export type GroupKind = 'bar' | 'line' | 'area' | 'pie' | 'doughnut' | 'ofPie' | 'scatter' | 'radar' | 'bubble' | 'stock' | 'surface'
  /** chartex (Office 2016): caixa estreita, mapa de árvore, explosão solar. */
  | 'box' | 'treemap' | 'sunburst';

export interface Group {
  kind: GroupKind;
  threeD: boolean;
  /** Ordem do bloco no plotArea (combo). */
  index: number;
  dir: 'col' | 'bar';
  grouping: 'clustered' | 'stacked' | 'percentStacked' | 'standard';
  varyColors: boolean;
  gapWidth: number;
  overlap: number;
  holeSize: number;
  firstSliceAng: number;
  scatterStyle?: string;
  radarStyle?: string;
  /** lineChart `<c:marker val>` do GRUPO (mostrar marcadores por default). */
  showMarker: boolean;
  series: Series[];
  axIds: string[];
  dLbls?: DLbls;
  dropLines?: ShapeProps;
  hiLowLines?: ShapeProps;
  upDownBars?: { gapWidth: number; up: ShapeProps; down: ShapeProps };
  serLines?: ShapeProps;
  bubbleScale?: number;
  /** 3D: vão entre as fileiras de barras em profundidade, % da largura da barra (default 150). */
  gapDepth?: number;
  shape?: string;
  ofPieType?: string;
  /** Pizza/barra de pizza: como separar o 2º gráfico (pos/val/percent/cust/auto), limite, pontos e tamanho (%). */
  ofPie?: { splitType: string; splitPos?: number; custSplit?: number[]; secondPieSize: number };
  /** Mapa de árvore/explosão solar: rótulo dos pais (overlapping/banner/none). */
  parentLabel?: string;
}

export interface Axis {
  id: string;
  kind: 'cat' | 'val' | 'date' | 'ser';
  pos: 'b' | 'l' | 'r' | 't';
  deleted: boolean;
  reversed: boolean;
  min?: number;
  max?: number;
  logBase?: number;
  majorUnit?: number;
  minorUnit?: number;
  crossAx?: string;
  crosses: 'autoZero' | 'min' | 'max';
  crossesAt?: number;
  crossBetween?: 'between' | 'midCat';
  /** undefined = sem grade; ShapeProps (talvez vazio) = com grade. */
  majorGrid?: ShapeProps;
  minorGrid?: ShapeProps;
  majorTick: 'none' | 'in' | 'out' | 'cross';
  minorTick: 'none' | 'in' | 'out' | 'cross';
  tickLblPos: 'nextTo' | 'low' | 'high' | 'none';
  numFmt?: NumFmt;
  title?: ChartTitle;
  txPr: TextProps;
  sp: ShapeProps;
  lblOffset: number;
  tickLblSkip?: number;
  tickMarkSkip?: number;
  noMultiLvlLbl: boolean;
  dispUnits?: number;
  /** dateAx: unidade base (days/months/years). */
  baseTimeUnit?: string;
}

export interface Legend {
  pos: 'b' | 't' | 'l' | 'r' | 'tr';
  overlay: boolean;
  layout?: ManualLayout;
  /** Entradas apagadas (`c:legendEntry/c:delete`), por índice da entrada. */
  deleted: Set<number>;
  txPr: TextProps;
  sp: ShapeProps;
}

/** Texto de uma forma do desenho do gráfico (`cdr:txBody`). */
export interface UserText {
  paras: RichPara[];
  /** Recuos internos (pt; default 7,2/3,6/7,2/3,6). */
  ins: { l: number; t: number; r: number; b: number };
  anchor: 't' | 'ctr' | 'b';
  wrap: boolean;
  /** `vertOverflow="clip"`: corta o texto na caixa. */
  clip: boolean;
  /** Rotação do texto (`a:bodyPr rot`/`vert`) em graus. */
  rot?: number;
  /** Padrão do texto (lstStyle lvl1 + cor do fontRef). */
  def: TextProps;
}

/**
 * Forma do desenho do gráfico (`c:userShapes`, parte chartDrawing: caixas de
 * texto, notas de fonte, setas…): caixa em FRAÇÕES da área do gráfico
 * (`relSizeAnchor`) ou canto em frações + tamanho em pt (`absSizeAnchor`).
 */
export interface UserShape {
  x: number; y: number; w: number; h: number;
  /** `w`/`h` em pt (absSizeAnchor). */
  abs?: boolean;
  /** Dentro de grupo: retângulo em frações da caixa da âncora. */
  sub?: { x: number; y: number; w: number; h: number };
  /** Geometria predefinida (`rect`, `ellipse`, `line`…) ou 'custom'. */
  geom: string;
  rot?: number;
  flipH?: boolean;
  flipV?: boolean;
  sp: ShapeProps;
  text?: UserText;
  /** Imagem (`cdr:pic`): chave do hospedeiro (`ChartHost.blip`). */
  blip?: string;
}

/** `c:view3D`: ausentes = default do tipo (barras 15°/20°, pizza 30°/0°), decidido na pintura. */
export interface View3D { rotX?: number; rotY?: number; rAngAx: boolean; perspective: number; depthPercent: number; hPercent?: number }

export interface ChartSpace {
  /** `c:style` (1–48; default 2) — define cores/efeitos default. */
  style: number;
  /** Gráfico do Office 2010+ (`c14:style`) ou deck do Office 2007: linhas default cinza (tx1 tint 75%), não pretas. */
  office2010: boolean;
  roundedCorners: boolean;
  title?: ChartTitle;
  autoTitleDeleted: boolean;
  groups: Group[];
  axes: Axis[];
  plotLayout?: ManualLayout;
  plotSp: ShapeProps;
  legend?: Legend;
  sp: ShapeProps;
  txPr: TextProps;
  dispBlanksAs: 'gap' | 'zero' | 'span';
  /** Tabela de dados sob a plotagem (`c:dTable`). */
  dTable?: { horz: boolean; vert: boolean; outline: boolean; keys: boolean; txPr: TextProps };
  view3D?: View3D;
  floorSp?: ShapeProps;
  backWallSp?: ShapeProps;
  sideWallSp?: ShapeProps;
  /** Paleta do tema (accent1…6) já resolvida — base das cores automáticas. */
  accents: string[];
  /** Cores de texto/linha do tema (tx1/bg1) para os defaults. */
  tx1: string;
  bg1: string;
  /** Fonte menor do tema (texto sem `latin`). */
  minorFont?: string;
  /** Estilo de preenchimento do tema (fillStyleLst idx, phClr) — vem do host. */
  themeFill?: (idx: number, phClr: string) => Paint | undefined;
  majorFont?: string;
  /** Larguras (pt) do lnStyleLst do tema, quando o hospedeiro as dá (Excel: linha de série = k × a 1ª). */
  themeLn?: number[];
  /** Formas do desenho do gráfico (`c:userShapes`), pintadas por cima. */
  userShapes?: UserShape[];
}

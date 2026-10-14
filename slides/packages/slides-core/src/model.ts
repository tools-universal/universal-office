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
  /** Configuração da apresentação (`ppt/presProps.xml` → `<p:showPr>`), quando o arquivo traz. */
  show?: ShowSettings;
}

/** "Configurar apresentação de slides" (`<p:showPr>`). Ausente = default do app. */
export interface ShowSettings {
  /** `loop="1"`: repetir até Esc. */
  loop?: boolean;
  /** `useTimings="0"`: avançar manualmente (ignora os intervalos). */
  useTimings?: boolean;
  /** `showAnimation="0"`: apresentar sem animação. */
  showAnimation?: boolean;
  /** `<p:kiosk>`: quiosque — repete e só avança sozinho/por hiperlink (clique não avança). */
  kiosk?: boolean;
  /** `<p:sldRg st end>`: faixa de slides, índices 0-based inclusivos. */
  range?: [number, number];
}

/** Parada de gradiente (`<a:gs pos>`), pos normalizado 0..1. */
export interface GradientStop {
  pos: number;
  color: string;
  /** Alfa 0..1 do stop (`<a:alpha val>` dentro da cor); ausente = opaco. */
  alpha?: number;
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
  /** Gradiente RADIAL (`<a:path path="rect|circle|shape">`): pos 0 = centro
   *  (fillToRect), pos 1 = borda. Presente => ignora angleDeg. */
  path?: string;
  /** `<a:fillToRect l t r b>` do gradiente de caminho: retângulo de FOCO como
   *  recuos (frações) de cada borda; ausente = ponto central. */
  fillTo?: { l: number; t: number; r: number; b: number };
  /** Padrão (`<a:pattFill prst>`): `color` vira a cor MÉDIA (fallback de quem não desenha padrão). */
  pattern?: { prst: string; fg: string; bg: string };
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
  /** Efeitos de cor do `<a:blip>` aplicados ao desenhar (a imagem decodificada é a crua). */
  fx?: ImageFx;
  /** Ladrilho (`<a:tile>`): escala (1 = tamanho natural a 96 dpi) e deslocamento em EMU. */
  tile?: { sx: number; sy: number; tx: number; ty: number };
}

/** Efeitos de cor de imagem (DrawingML `<a:blip>`). Cores #RRGGBB, frações 0..1. */
export interface ImageFx {
  /** `<a:duotone>`: luminância mapeada entre as duas cores (escuro → claro). */
  duotone?: [string, string];
  /** `<a:alphaModFix amt>`: opacidade da imagem. */
  alpha?: number;
  /** `<a:grayscl>`. */
  gray?: boolean;
  /** `<a:biLevel thresh>`: preto e branco pelo limiar de luminância. */
  biLevel?: number;
  /** `<a:lum bright contrast>` (−1..1). */
  bright?: number;
  contrast?: number;
  /** `<a:clrChange>`: troca a cor `from` (pixels iguais) por `to` com alfa. */
  clrChange?: { from: string; to: string; toAlpha: number };
}

/** Mídia embutida (vídeo/áudio) de um `<p:pic>`. */
export interface MediaRef {
  kind: 'video' | 'audio';
  /** Parte no pacote (ex.: "ppt/media/media1.mp4"); ausente se só houver link externo. */
  part?: string;
  /** Alvo externo (`TargetMode="External"`), quando a mídia não está embutida. */
  url?: string;
  /** MIME pela extensão (video/mp4, audio/wav…). */
  mime: string;
  /** Corte (`p14:trim`): ms cortados do INÍCIO e do FIM do arquivo. */
  trim?: { startMs: number; endMs: number };
  /** Esmaecer (`p14:fade`): entrada/saída em ms (o vídeo surge/some sobre a capa). */
  fade?: { inMs: number; outMs: number };
  /** Marcadores (`p14:bmkLst`): nome → posição no arquivo (ms). */
  bookmarks?: { name: string; timeMs: number }[];
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
  /** Sombra do TEXTO (`<a:rPr><a:effectLst><a:outerShdw>`), como na shape. */
  shadow?: { color: string; blurRad: number; dist: number; dirDeg: number; alpha: number };
  /** Sobrescrito/subscrito (`baseline`, fração do tamanho; + = acima). Exibido a 2/3 do tamanho. */
  baseline?: number;
  /** Maiúsculas (`cap="all"`) ou versalete (`cap="small"`). */
  cap?: 'all' | 'small' | 'none';
  /** Tachado (`strike="sngStrike|dblStrike"`). */
  strike?: boolean;
  /** Espaçamento entre caracteres em pontos (`spc`, centésimos de pt no XML). */
  spc?: number;
  /** Texto com hiperlink: cor `hlink` do tema (desenhado sublinhado nessa cor). */
  linkColor?: string;
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
  /** Entrelinha `<a:lnSpc><a:spcPct val>` como fração (200000 => 2.0). */
  lineSpacing?: number;
  /** Entrelinha absoluta `<a:lnSpc><a:spcPts val>` em pontos. */
  lineSpacingPt?: number;
  /** Espaço antes do parágrafo `<a:spcBef><a:spcPts>` em pontos. */
  spaceBeforePt?: number;
  /** Espaço depois do parágrafo `<a:spcAft><a:spcPts>` em pontos. */
  spaceAfterPt?: number;
  /** spcBef/spcAft em PORCENTAGEM da altura de uma linha simples (`<a:spcPct>`), fração. */
  spaceBeforePct?: number;
  spaceAfterPct?: number;
  /** Fonte do marcador (`<a:buFont typeface>`); ausente = a do 1º run. */
  bulletFont?: string;
  /** Cor do marcador (`<a:buClr>`); ausente = a do 1º run. */
  bulletColor?: string;
  /** Tamanho do marcador: fração do texto (`<a:buSzPct>`) ou pontos (`<a:buSzPts>`). */
  bulletSizePct?: number;
  bulletSizePt?: number;
  /** Marcador de IMAGEM (`<a:buBlip>`): desenhado no lugar do caractere. */
  bulletImage?: ImageRef;
  /** Tamanho (pt) do fim de parágrafo (`<a:endParaRPr sz>`) — altura de parágrafo VAZIO. */
  endSz?: number;
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
  /** `<a:bodyPr spcFirstLastPara="1">`: aplica o spcBef do 1º parágrafo (e o spcAft do último). */
  spcFirstLastPara?: boolean;
  /** WordArt: deformação do texto (`<a:prstTxWarp prst>` ≠ textNoShape) + ajustes (fração). */
  warp?: { prst: string; adj?: number[] };
  /** Insets do bodyPr em EMU (lIns/tIns/rIns/bIns); ausentes = default do app. */
  insL?: number;
  insT?: number;
  insR?: number;
  insB?: number;
  /** Texto vertical (`<a:bodyPr vert>` / `<a:tcPr vert>`): vert (90°), vert270, eaVert… */
  vert?: string;
  /** Colunas de texto (`<a:bodyPr numCol spcCol>`); spcCol em EMU. */
  numCol?: number;
  spcCol?: number;
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
  /** `<a:grpFill/>`: o preenchimento é o do GRUPO pai (resolvido na leitura do grupo). */
  grpFill?: boolean;
  /** Adjust values do prstGeom (`<a:avLst><a:gd fmla="val N">`), na ordem. */
  adj?: number[];
  /** Nomes dos adjust values (`<a:gd name>`), paralelos a `adj`. */
  adjNames?: string[];
  /** Geometria custom (`<a:custGeom>`, freeforms): paths em unidades w×h próprias. */
  custGeom?: { w: number; h: number; subs: import('./geometry.js').PathSeg[][] };
  fill?: Fill;
  lineColor?: string;
  lineWidth?: number; // EMU
  /** `<a:ln><a:noFill/>`: SEM contorno explícito (bloqueia o fallback do lnRef). */
  lineNone?: boolean;
  /** Seta no INÍCIO da linha (`<a:headEnd type>`: triangle|stealth|arrow|diamond|oval). */
  headArrow?: string;
  /** Seta no FIM da linha (`<a:tailEnd type>`). */
  tailArrow?: string;
  txBody?: TextBody;
  /** Imagem embutida (<p:pic>) com bytes ja resolvidos via rels. */
  image?: ImageRef;
  /**
   * Forma do desenho de um SmartArt: `modelId` do `dsp:sp` (o ponto "pres" do
   * modelo de dados) — é o id que a animação por partes (`<a:dgm id>`) nomeia.
   */
  dgmId?: string;
  /**
   * Vídeo/áudio do `<p:pic>` (`p14:media r:embed` / `a:videoFile`): a imagem
   * acima é a CAPA; a reprodução troca pelos quadros da mídia (media.ts).
   */
  media?: MediaRef;
  /** Crop normalizado [0..1] (`<a:srcRect l t r b>` em milesimos de %). */
  srcRect?: { l: number; t: number; r: number; b: number };
  /** Opacidade 0..1, vinda de `<a:alphaModFix amt="...">` (milesimos de %). */
  alpha?: number;
  /** XML cru do chart (`ppt/charts/chartN.xml`) — engine parseia on-demand no paint. */
  chartXml?: string;
  /** Tema da apresentação: resolve cores (schemeClr) e fontes (+mn-lt) do gráfico. */
  chartTheme?: Theme;
  /** Tabela embutida (`<a:tbl>` dentro de `<p:graphicFrame>`). */
  table?: Table;
  /**
   * Sombra externa (`<a:effectLst><a:outerShdw>`). EMU para `blurRad`/`dist`,
   * `dir` em 1/60000 de grau (0 = direita; 5400000 = baixo-esq), `alpha` em
   * milésimos de %.
   */
  shadow?: { color: string; blurRad: number; dist: number; dirDeg: number; alpha: number; sx?: number; sy?: number; algn?: string };
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
  /** `<a:blipFill><a:tile>`: ladrilha a imagem no tamanho natural (96dpi). */
  fillTile?: boolean;
  /**
   * Cor de texto default vinda de `<p:style><a:fontRef>` (resolvida via tema).
   * Aplicada na cascata quando run/lstStyle nao especificam cor.
   */
  styleFontColor?: string;
  /** `<a:fontRef idx>` (major|minor) — resolve fonte via fontScheme do tema. */
  styleFontIdx?: string;
  /** Ids (`cNvPr id`) dos `<p:grpSp>` que contêm a shape (achatada), do mais externo ao mais interno — alvos de animação de grupo. */
  groupIds?: string[];
  /** Decoração herdada do layout/master (ids não pertencem ao slide — animações do slide não se aplicam). */
  inherited?: boolean;
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
  /** Alfa 0..1 do fill da célula (`<a:solidFill>` com `<a:alpha>`). */
  fillAlpha?: number;
  /** Bordas POR LADO explícitas (vencem a uniforme): `<a:lnL/lnR/lnT/lnB>`. */
  borders?: {
    l?: { color: string; width: number; dash?: string };
    r?: { color: string; width: number; dash?: string };
    t?: { color: string; width: number; dash?: string };
    b?: { color: string; width: number; dash?: string };
  };
  /** Anchor vertical do txBody (t/ctr/b). */
  anchor?: string;
  /** Texto vertical da célula (`<a:tcPr vert>`). */
  vert?: string;
  /** `<a:tcPr><a:noFill/>` explícito: anula o preenchimento do estilo da tabela. */
  noFill?: boolean;
  /** Lados com `<a:lnX><a:noFill/>` explícito: anulam a borda do estilo. */
  borderNone?: { l?: boolean; r?: boolean; t?: boolean; b?: boolean };
  /** Margens internas da célula em EMU (`<a:tcPr marL marR marT marB>`); ausentes = 0,1"/0,05". */
  marL?: number;
  marR?: number;
  marT?: number;
  marB?: number;
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
  /** `bgImage` em LADRILHO (`<a:tile>`, tamanho natural a 96 dpi) em vez de esticada. */
  bgTile?: boolean;
  /** Efeitos de entrada animados, em ordem do `<p:seq>` (`<p:timing>`). */
  animations?: SlideAnimEntry[];
  /** Transição quando o slide ENTRA (vinda do anterior). */
  transition?: SlideTransition;
  /**
   * Modelo de tempo COMPLETO (transição com advTm/p14:dur + passos/efeitos da
   * árvore `<p:timing>`) — usado pela reprodução automática (`playback.ts`).
   */
  timing?: import('./timing.js').SlideTimingModel;
}

/** Mapa de cores do tema (<a:clrScheme>) + clrMap aplicado. */
export interface Theme {
  /** Nome de cor (dk1,lt1,accent1…,tx1,bg1,…) -> #RRGGBB. */
  colors: Record<string, string>;
  /** Cores CRUAS do `<a:clrScheme>` (dk1…folHlink), antes do clrMap — base de `applyClrMap`. */
  scheme?: Record<string, string>;
  /** Fontes do fontScheme (`+mj-lt` → major, `+mn-lt` → minor). */
  fonts?: { major?: string; minor?: string };
  /** clrMap aplicado (alias → nome do esquema): reaplicado a temas de gráfico (themeOverride). */
  clrMap?: Record<string, string>;
  /** Larguras (EMU) do `<a:lnStyleLst>` — resolvem `<a:lnRef idx>`. */
  lineWidths?: number[];
  /** `<a:fillStyleLst>` (idx 1…) e `<a:bgFillStyleLst>` (idx 1001…) — resolvem fillRef/bgRef (cor `phClr`). */
  fillStyles?: import('./xml.js').XmlElement[];
  bgFillStyles?: import('./xml.js').XmlElement[];
  /** Parte do tema (os `r:embed` dos estilos com imagem resolvem pelos rels DELE). */
  part?: string;
}

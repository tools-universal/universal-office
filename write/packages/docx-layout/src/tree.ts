import type { InlineImage, ShapeStyle } from '@universal-office/docx-core';
import type { FontFace } from './fonts.js';

/**
 * Saída do motor: páginas com itens de desenho em TWIPS (origem no canto
 * superior esquerdo da página). Canvas, PDF e o port .NET pintam a mesma
 * árvore — é ela que os testes comparam com o Word.
 */

export interface GlyphRunItem {
  t: 'glyphs';
  face: FontFace;
  /** tamanho em pontos (nominal). */
  sizePt: number;
  /** RRGGBB */
  color: string;
  /** baseline (twips, do topo da página). */
  y: number;
  /** glifos: code point + x absoluto (twips); gid = índice de glifo direto
   *  (EMF ETO_GLYPH_INDEX — sem caractere: só desenhável como curva) */
  glyphs: { cp: number; x: number; gid?: number }[];
  /** escala horizontal (w:w) — 1 = normal. */
  scaleX?: number;
  /** texto original (busca, ToUnicode, depuração). */
  text: string;
  /** contornos sintéticos */
  synthBold?: boolean;
  synthItalic?: boolean;
  /** opacidade (0..1) — texto semitransparente (w14:textFill) */
  alpha?: number;
  /** desenhar como CURVAS no PDF (WordArt: o Word converte em contornos;
   *  texto semitransparente e caixa girada fora de 90°: o Word não grava texto) */
  asPath?: boolean;
  /** caixa da LINHA em torno do run (twips, relativos — sobrevivem a shiftItem):
   *  asc/desc acima/abaixo de y; lead = do 1º glifo até a borda esquerda do
   *  quadro; line = identidade da linha (os runs da mesma linha saem juntos).
   *  O Word não grava a linha que fica inteira fora da página (cullOffPage). */
  lineBox?: { asc: number; desc: number; lead: number; line: number };
  /** glifos COLORIDOS (COLR, ex.: Segoe UI Emoji): curvas por camada, nas
   *  cores da paleta — o Word também não grava texto extraível para eles */
  colr?: boolean;
}

export interface RectItem {
  t: 'rect';
  x: number; y: number; w: number; h: number;
  fill: string;
  alpha?: number;
}

export interface LineItem {
  t: 'line';
  x1: number; y1: number; x2: number; y2: number;
  color: string;
  /** espessura em pontos */
  widthPt: number;
  /** solid | dotted | dashed | dashDot | double (desenhado como 2 linhas pelo motor) */
  dash?: 'dotted' | 'dashed' | 'dashDot' | 'dashDotDot'
    /** tracejados de BORDA (múltiplos de w, medidos): [w w], [3w w], [3w w w w], [3w w w w w w], [25w/6 5w/6] */
    | 'bdrDot' | 'bdrDash' | 'bdrDashDot' | 'bdrDashDotDot' | 'bdrDashSmall';
}

export interface ImageItem {
  t: 'image';
  x: number; y: number; w: number; h: number;
  image: InlineImage;
  /** recorte (frações 0..1) */
  crop?: { l: number; t: number; r: number; b: number };
  rot?: number;
  flipH?: boolean;
  flipV?: boolean;
}

export interface ShapeItem {
  t: 'shape';
  x: number; y: number; w: number; h: number;
  style: ShapeStyle;
  /** fill/linha já resolvidos (RRGGBB) */
  fill?: string;
  stroke?: { color: string; widthPt: number; dash?: string };
  /** linha (geom line): pontos relativos ao canto */
  line?: { x1: number; y1: number; x2: number; y2: number };
  /** degradê com as cores das paradas já resolvidas (RRGGBB) */
  grad?: GradFill;
  /** sombra externa resolvida (deslocamento em twips) */
  shadow?: { dx: number; dy: number; color: string; alpha?: number; blur?: number };
}

/** Degradê (a:gradFill): paradas (pos 0..1), a:lin (ângulo, scaled), rotWithShape, a:path. */
export interface GradFill {
  stops: { pos: number; color: string }[];
  angleDeg: number;
  scaled?: boolean;
  rotWithShape?: boolean;
  path?: string;
  fillTo?: { l: number; t: number; r: number; b: number };
}

/** Comando de caminho em twips (origem no topo da página). */
export type PathCmdTw =
  | { op: 'M'; x: number; y: number }
  | { op: 'L'; x: number; y: number }
  | { op: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { op: 'Z' };

export interface PathItem {
  t: 'path';
  cmds: PathCmdTw[];
  fill?: string;
  stroke?: { color: string; widthPt: number; dash?: string };
  evenOdd?: boolean;
}

export interface ClipItem {
  t: 'clip';
  /** empilha recorte (push) ou desempilha (pop). */
  op: 'push' | 'pop';
  x?: number; y?: number; w?: number; h?: number;
  /** imagem vetorial (EMF/WMF) desenhada dentro do recorte — o editor a acha pelo item */
  src?: import('@universal-office/docx-core').InlineImage;
}

/**
 * Transformação afim (twips → twips, origem no topo) aplicada aos itens até o
 * pop correspondente: ponto' = (a·x + c·y + e, b·x + d·y + f). Usada no texto
 * vertical de células (textDirection btLr/tbRl).
 */
export interface XformItem {
  t: 'xform';
  op: 'push' | 'pop';
  m?: [number, number, number, number, number, number];
}

export type PageItem = GlyphRunItem | RectItem | LineItem | ImageItem | ShapeItem | PathItem | ClipItem | XformItem;

/** Linha de texto posicionada (mapeamento p/ o editor e testes). */
export interface LaidOutLine {
  /** referência do parágrafo: caminho no documento (ex.: "b12", "b3/r0/c1/b0", "hdr:default/b0"). */
  ref: string;
  /** offsets [start, end) no texto do parágrafo (run.text concatenado) */
  start: number;
  end: number;
  x: number;
  y: number;
  height: number;
  baseline: number;
  width: number;
  /** caracteres da linha: offset no parágrafo, x absoluto (twips) e largura
   *  (justificação/tabs incluídos) — cursor, seleção e clique no editor */
  chars?: { o: number; x: number; w: number }[];
  /** a linha tem revisão que pede barra de alteração: o espaço antes (1ª linha do
   *  parágrafo) e depois (última) que a barra também cobre (twips) */
  rev?: { before: number; after: number };
  /** quadro do parágrafo (coluna, célula, caixa ou cabeçalho, antes dos recuos):
   *  bordas esquerda/direita RELATIVAS a `x` (acompanham os deslocamentos da
   *  linha) — régua do editor; fora da paridade .NET */
  frame?: { l: number; r: number };
  /** recuos e tabulações efetivos do parágrafo (twips; firstLine < 0 = deslocado;
   *  tabs sem os clear) — régua do editor; o mesmo objeto em todas as linhas */
  pfmt?: LineParaFormat;
}

export interface LineParaFormat {
  left: number;
  right: number;
  firstLine: number;
  tabs: readonly import('@universal-office/docx-core').TabSpec[];
}

export interface LayoutPage {
  widthTw: number;
  heightTw: number;
  /** índice da seção */
  section: number;
  /** número exibido (PAGE) */
  number: number;
  items: PageItem[];
  lines: LaidOutLine[];
  /** quantos itens do início de `items` são do cabeçalho/rodapé (camadas do HF) */
  hfItems?: number;
  /** cor de fundo da página (w:background, RRGGBB) — o Word a grava no PDF */
  background?: string;
  /** objetos flutuantes posicionados (seleção/arrasto no editor) */
  objects?: PlacedObject[];
  /** caixas das células de tabela do corpo (seleção de células, alças e
   *  arrasto de bordas no editor) — uma por parte de linha nesta página */
  cells?: PlacedCell[];
}

/** Caixa de uma célula de tabela na página (twips). `ref` = "b3/r0/c1" (linha
 *  e coluna da GRADE, como as referências das linhas de texto). */
export interface PlacedCell {
  ref: string;
  x: number; y: number; w: number; h: number;
  /** colunas da grade cobertas */
  span: number;
}

/** Objeto flutuante posicionado na página (twips). */
export interface PlacedObject {
  run: import('@universal-office/docx-core').Run;
  x: number; y: number; w: number; h: number;
  layer: 'behind' | 'front';
  /** pertence ao cabeçalho/rodapé */
  hf: boolean;
  /** referências do posicionamento (twips de página): coluna, topo do parágrafo
   *  âncora e a geometria da página — o editor converte posições entre elas */
  frame?: ObjectFrame;
}

export interface ObjectFrame {
  colX: number; colW: number; paraTop: number;
  pageW: number; pageH: number; marL: number; marR: number; marT: number; marB: number;
  /** topo da área de texto (abaixo do cabeçalho) */
  bodyTop: number;
}

export interface LayoutResult {
  pages: LayoutPage[];
  /** avisos (recursos não suportados encontrados) */
  warnings: string[];
}

/** Tracejados de borda (Word: múltiplos da espessura). */
export const BORDER_DASHES: Record<string, (w: number) => number[]> = {
  bdrDot: (w) => [w, w], bdrDash: (w) => [3 * w, w], bdrDashDot: (w) => [3 * w, w, w, w],
  bdrDashDotDot: (w) => [3 * w, w, w, w, w, w], bdrDashSmall: (w) => [(25 * w) / 6, (5 * w) / 6],
};

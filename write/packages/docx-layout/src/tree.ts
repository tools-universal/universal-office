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
  /** glifos: code point + x absoluto (twips). */
  glyphs: { cp: number; x: number }[];
  /** escala horizontal (w:w) — 1 = normal. */
  scaleX?: number;
  /** texto original (busca, ToUnicode, depuração). */
  text: string;
  /** contornos sintéticos */
  synthBold?: boolean;
  synthItalic?: boolean;
  /** opacidade (0..1) — texto semitransparente (w14:textFill) */
  alpha?: number;
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
  dash?: 'dotted' | 'dashed' | 'dashDot' | 'dashDotDot';
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
  /** objetos flutuantes posicionados (seleção/arrasto no editor) */
  objects?: PlacedObject[];
}

/** Objeto flutuante posicionado na página (twips). */
export interface PlacedObject {
  run: import('@universal-office/docx-core').Run;
  x: number; y: number; w: number; h: number;
  layer: 'behind' | 'front';
  /** pertence ao cabeçalho/rodapé */
  hf: boolean;
}

export interface LayoutResult {
  pages: LayoutPage[];
  /** avisos (recursos não suportados encontrados) */
  warnings: string[];
}

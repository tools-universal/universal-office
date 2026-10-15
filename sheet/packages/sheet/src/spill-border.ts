/**
 * Borda do intervalo DERRAMADO de uma fórmula de matriz dinâmica, desenhada
 * quando a seleção está na âncora ou em qualquer célula derramada (como o
 * Excel 365). A cor é a do azul de destaque do Office — não medida (a borda é
 * da interface, não sai na imagem da câmera do oráculo).
 */
export const SPILL_BORDER_COLOR = '#4472C4';

/** Contorno de 1 px do retângulo (x1,y1)–(x2,y2) em px de tela. */
export function paintSpillBorder(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  const w = Math.round(x2) - Math.round(x1), h = Math.round(y2) - Math.round(y1);
  if (w <= 0 || h <= 0) return;
  ctx.save();
  ctx.strokeStyle = SPILL_BORDER_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.strokeRect(Math.round(x1) + 0.5, Math.round(y1) + 0.5, w - 1, h - 1);
  ctx.restore();
}

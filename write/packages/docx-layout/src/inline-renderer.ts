import type { CustomInline, RunProps } from '@universal-office/docx-core';
import type { EnginePaintEnv } from './canvas.js';
import type { RunBox } from './run-boxes.js';
import type { LayoutPage } from './tree.js';

/**
 * Desenho de inlines de plugin (CustomInline, gravados como w:sdt) — o MESMO
 * contrato no editor (<universal-write>) e no viewer
 * (<universal-document-viewer>): o motor diagrama o texto de reserva e o
 * renderer desenha por cima, na caixa dele.
 */
export interface InlineMeasureContext<T = unknown> {
  data: T;
  fallbackText: string;
  props: RunProps;
  sizePt: number;
  measureText(text: string): number;
}

export interface InlineDrawContext<T = unknown> extends InlineMeasureContext<T> {
  ctx: CanvasRenderingContext2D;
  xTwips: number;
  yTwips: number;
  baselineTwips: number;
  widthTwips: number;
  heightTwips: number;
  scale: number;
  dark: boolean;
  color: string;
}

export interface InlineRenderer<T = unknown> {
  type: string;
  toText?(data: T): string;
  measure?(context: InlineMeasureContext<T>): { widthTwips: number; heightTwips?: number };
  draw?(context: InlineDrawContext<T>): void;
}

/**
 * Pinta os inlines de plugin de uma página sobre o que o motor já desenhou:
 * apaga a caixa do texto de reserva e chama o `draw` do renderer com a face,
 * o tamanho e a cor do texto de reserva. `ctx` chega em twips (como o
 * paintItems); o renderer recebe px de dispositivo e a escala px/twip.
 */
export function paintCustomInlines(
  ctx: CanvasRenderingContext2D,
  page: LayoutPage,
  boxes: readonly RunBox<CustomInline>[],
  renderers: ReadonlyMap<string, InlineRenderer>,
  env: EnginePaintEnv,
  opts: { dark?: boolean; paper?: string } = {},
): void {
  // o contrato do renderer é o do editor: coordenadas em twips × `scale` em px
  // de dispositivo, origem no topo da página — tira a escala do ctx (twips)
  const m = ctx.getTransform();
  const scale = m.a;
  for (const box of boxes) {
    const renderer = renderers.get(box.value.type);
    if (!renderer?.draw) continue;
    const glyphs = page.items.find((it) => it.t === 'glyphs' && Math.abs(it.y - box.baseline) < 400
      && it.glyphs.some((g) => g.x >= box.x - 0.5 && g.x < box.x + box.w));
    const run0 = glyphs?.t === 'glyphs' ? glyphs : null;
    const sizePt = run0?.sizePt ?? (box.run.props.szHalfPt ?? 22) / 2;
    const font = run0?.face.font;
    const measureText = (text: string): number => {
      if (!font) return text.length * sizePt * 10;
      let w = 0;
      for (const ch of text) w += (font.advanceWidth(font.glyphId(ch.codePointAt(0)!)) * sizePt * 20) / (font.metrics.unitsPerEm || 1000);
      return w;
    };
    const css = run0 ? env.fontOf(run0.face) : { family: 'sans-serif', weight: 400, italic: false };
    const ink = env.color(run0?.color ?? box.run.props.color ?? '000000');
    const fallbackText = renderer.toText?.(box.value.data) ?? box.value.fallbackText;
    ctx.save();
    ctx.fillStyle = opts.paper ?? (opts.dark ? '#1e1e1e' : '#ffffff');
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.setTransform(1, 0, 0, 1, m.e, m.f);
    ctx.font = `${css.italic ? 'italic ' : ''}${css.weight} ${sizePt * 20 * scale}px ${css.family}`;
    ctx.fillStyle = ink;
    try {
      renderer.draw({
        data: box.value.data, fallbackText, props: box.run.props, sizePt, measureText, ctx,
        xTwips: box.x, yTwips: box.y, baselineTwips: box.baseline, widthTwips: box.w, heightTwips: box.h,
        scale, dark: !!opts.dark, color: ink,
      });
    } catch { /* renderer com erro: fica a caixa apagada com o texto de reserva por baixo */ }
    ctx.restore();
  }
}

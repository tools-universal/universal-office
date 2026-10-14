/**
 * Texto com DEFORMAÇÃO (WordArt: `<a:bodyPr><a:prstTxWarp prst>`). Cada linha
 * é desenhada num canvas auxiliar e remapeada em faixas verticais estreitas:
 *  - famílias de ENVELOPE (plain, inflar/desinflar, ondas, inclinações,
 *    triângulo, chevron, cascata, curva, lata, esmaecer): curva superior e
 *    inferior y(u) na caixa; cada linha ocupa sua fração da altura;
 *  - famílias de ARCO (archUp/archDown/circle/button e "pour"): a linha segue a
 *    elipse inscrita na caixa, cada faixa girada pela tangente.
 * As curvas são aproximações das formas do app (o texto PREENCHE a caixa —
 * o que mais pesa visualmente); `adj` modula a intensidade.
 */

type Ctx = CanvasRenderingContext2D;

export interface WarpLine {
  text: string;
  font: string;   // CSS font com tamanho de REFERÊNCIA (px)
  refPx: number;  // tamanho de referência usado em `font`
  color: string;
}

const STRIPS = 240;

/** Envelope (topo, base) em frações da altura para u ∈ [0, 1]. */
function envelope(prst: string, u: number, adj: number): [number, number] {
  const c = 2 * u - 1; // −1..1
  const k = Math.max(0.02, Math.min(0.45, adj));
  switch (prst) {
    case 'textInflate': return [k * c * c, 1 - k * c * c];
    case 'textDeflate': return [k * (1 - c * c), 1 - k * (1 - c * c)];
    case 'textInflateBottom': return [0, 1 - k * c * c];
    case 'textDeflateBottom': return [0, 1 - k * (1 - c * c)];
    case 'textInflateTop': return [k * c * c, 1];
    case 'textDeflateTop': return [k * (1 - c * c), 1];
    case 'textDeflateInflate': return [k * (1 - c * c) * 0.5, 1 - k * c * c * 0.5];
    case 'textDeflateInflateDeflate': { const w = Math.sin(Math.PI * u * 2); return [k * Math.abs(w) * 0.5, 1 - k * Math.abs(w) * 0.5]; }
    case 'textWave1': case 'textWave2': case 'textWave4': case 'textDoubleWave1': {
      const cycles = prst === 'textDoubleWave1' ? 2 : 1;
      const s = Math.sin(2 * Math.PI * u * cycles) * k * (prst === 'textWave2' ? -1 : 1);
      return [k + s, 1 - k + s];
    }
    case 'textSlantUp': return [k * 2 * (1 - u), 1 - k * 2 * u];
    case 'textSlantDown': return [k * 2 * u, 1 - k * 2 * (1 - u)];
    case 'textCascadeUp': return [k * 2 * (1 - u), 1];
    case 'textCascadeDown': return [k * 2 * u, 1];
    case 'textFadeRight': return [k * u, 1 - k * u];
    case 'textFadeLeft': return [k * (1 - u), 1 - k * (1 - u)];
    case 'textFadeUp': return [0, 1 - k * c * c * 0];
    case 'textTriangle': return [Math.abs(c) * 0.9, 1];
    case 'textTriangleInverted': return [0, 1 - Math.abs(c) * 0.9];
    case 'textChevron': return [k * 2 * (1 - Math.abs(c)) * -1 + k * 2, 1 - k * 2 * Math.abs(c)];
    case 'textChevronInverted': return [k * 2 * Math.abs(c), 1 - k * 2 + k * 2 * Math.abs(c)];
    case 'textCurveUp': return [k * 2 * (1 - Math.sin(Math.PI * u / 2)), 1 - k * 0.5 * Math.sin(Math.PI * u)];
    case 'textCurveDown': return [k * 2 * (1 - Math.cos(Math.PI * u / 2)), 1 - k * 0.5 * Math.sin(Math.PI * u)];
    case 'textCanUp': return [k * (1 - Math.sin(Math.PI * u)), 1 - k * Math.sin(Math.PI * u)];
    case 'textCanDown': return [k * Math.sin(Math.PI * u), 1 - k * (1 - Math.sin(Math.PI * u))];
    default: return [0, 1]; // textPlain, textStop… : preenche a caixa
  }
}

const ARCS = new Set(['textArchUp', 'textArchDown', 'textCircle', 'textButton', 'textArchUpPour', 'textArchDownPour', 'textCirclePour', 'textButtonPour']);

/** Desenha as linhas deformadas na caixa (px). */
export function paintWarpedText(ctx: Ctx, prst: string, adj: number[] | undefined, lines: WarpLine[], x: number, y: number, w: number, h: number,
  makeCanvas: (w: number, h: number) => (HTMLCanvasElement | OffscreenCanvas) | undefined): void {
  const vis = lines.filter((l) => l.text.trim());
  if (!vis.length || w <= 0 || h <= 0) return;
  // raster de cada linha (altura = ascendente+descendente do tamanho de referência)
  const rasters = vis.map((l) => {
    ctx.save(); ctx.font = l.font;
    const m = ctx.measureText(l.text);
    ctx.restore();
    // caixa da FONTE (não a dos glifos): as letras ocupam a parte delas da faixa
    const asc = m.fontBoundingBoxAscent || l.refPx * 0.9, desc = m.fontBoundingBoxDescent || l.refPx * 0.22;
    const lw = Math.max(1, Math.ceil(m.width)), lh = Math.max(1, Math.ceil(asc + desc));
    const cv = makeCanvas(lw, lh);
    const c2 = cv?.getContext('2d') as CanvasRenderingContext2D | null | undefined;
    if (!cv || !c2) return undefined;
    c2.font = l.font; c2.fillStyle = l.color; c2.textBaseline = 'alphabetic';
    c2.fillText(l.text, 0, asc);
    return { cv, lw, lh };
  });
  // ajustes: fração direta (inflar/desinflar 18750, onda 12500…); arcos: ângulo em 1/60000°
  const depth = (adj?.[0] ?? (/Wave/.test(prst) ? 12500 : 18750)) / 100000;
  const arcDeg = (adj?.[0] ?? 10800000) / 60000;
  if (ARCS.has(prst)) {
    // elipse inscrita; archUp: arco superior (180° → 0°), archDown: inferior (180° → 360° invertido);
    // circle: volta inteira a partir do topo; button: arco em cima, linha no meio, arco embaixo
    const cx = x + w / 2, cy = y + h / 2;
    rasters.forEach((r, i) => {
      if (!r) return;
      const isDown = prst.startsWith('textArchDown') || (prst.startsWith('textButton') && i === rasters.length - 1 && rasters.length > 1);
      const isMid = prst.startsWith('textButton') && i > 0 && i < rasters.length - 1;
      if (isMid) { ctx.drawImage(r.cv as CanvasImageSource, x, cy - h * 0.12, w, h * 0.24); return; }
      // espessura do texto na direção radial ~ 22% do menor raio
      const band = Math.min(w, h) * 0.22;
      const rx = w / 2 - band / 2, ry = h / 2 - band / 2;
      const span = prst.startsWith('textCircle') ? 2 * Math.PI * 0.98 : Math.max(0.3, Math.min(2 * Math.PI * 0.98, (arcDeg * Math.PI) / 180));
      for (let k = 0; k < STRIPS; k++) {
        const u = (k + 0.5) / STRIPS;
        // ângulo (y para baixo): archUp vai de −π/2−span/2 a −π/2+span/2
        const t = isDown ? Math.PI / 2 + span / 2 - u * span : -Math.PI / 2 - span / 2 + u * span;
        const px = cx + rx * Math.cos(t), py = cy + ry * Math.sin(t);
        // tangente → rotação (texto "em pé" para fora no arco de cima, para dentro embaixo)
        const tx = -rx * Math.sin(t), ty = ry * Math.cos(t);
        const ang = Math.atan2(ty, tx) + (isDown ? Math.PI : 0);
        const segLen = Math.hypot(tx, ty) * span / STRIPS;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        ctx.drawImage(r.cv as CanvasImageSource, (k / STRIPS) * r.lw, 0, r.lw / STRIPS, r.lh, -segLen / 2, -band / 2, segLen + 0.6, band);
        ctx.restore();
      }
    });
    return;
  }
  // várias linhas: escala COMUM — a linha mais larga (espaços incluídos) cobre a
  // largura e as outras mantêm a proporção, centradas (medido num WordArt de 3
  // linhas do .ppt: letras da mesma altura, a linha com espaços à esquerda desloca)
  const n = rasters.length;
  const maxW = Math.max(1, ...rasters.map((r) => r?.lw ?? 0));
  for (let i = 0; i < n; i++) {
    const r = rasters[i];
    if (!r) continue;
    const u0 = n > 1 ? (maxW - r.lw) / 2 / maxW : 0, uw = n > 1 ? r.lw / maxW : 1;
    for (let k = 0; k < STRIPS; k++) {
      const u = u0 + ((k + 0.5) / STRIPS) * uw;
      const [t, b] = envelope(prst, u, depth);
      const top = y + h * (t + ((b - t) * i) / n), bot = y + h * (t + ((b - t) * (i + 1)) / n);
      const dx = x + (u0 + (k / STRIPS) * uw) * w;
      ctx.drawImage(r.cv as CanvasImageSource, (k / STRIPS) * r.lw, 0, r.lw / STRIPS, r.lh, dx, top, (w * uw) / STRIPS + 0.6, Math.max(0.5, bot - top));
    }
  }
}

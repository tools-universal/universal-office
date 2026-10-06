/**
 * MÁSCARAS DE REVELAÇÃO — a geometria dos filtros de transição do
 * PresentationML (`<p:animEffect filter="wipe(down)">` nos efeitos e os
 * elementos de `<p:transition>` nos slides compartilham as mesmas formas):
 * wipe, barn (dividir), blinds (persianas), box (caixa), circle, diamond,
 * plus, checkerboard (quadriculado), dissolve, randombar, strips (faixas),
 * wedge (cunha), wheel (relógio/roda), slide (espiar), fade.
 *
 * `applyReveal` recebe o progresso de REVELAÇÃO `q` (0 = nada visível,
 * 1 = tudo) já resolvido (saída = 1 − p), monta o recorte no contexto
 * (ctx.clip) e devolve um multiplicador de opacidade (fade). Coordenadas em
 * px do canvas, retângulo da parte (x, y, w, h).
 */

/** Hash determinístico 0..1 (padrões "aleatórios" estáveis entre quadros). */
function hash01(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Decompõe "nome(arg)" → [nome, arg]. */
export function parseFilter(filter: string): [string, string] {
  const m = /^([a-zA-Z]+)(?:\(([^)]*)\))?$/.exec(filter.trim());
  return m ? [m[1]!.toLowerCase(), (m[2] ?? '').trim()] : [filter.toLowerCase(), ''];
}

/** Ângulo (rad) no sentido horário a partir das 12h, 0..2π. */
function clockAngle(dx: number, dy: number): number {
  const a = Math.atan2(dx, -dy);
  return a < 0 ? a + Math.PI * 2 : a;
}

/** Setor do relógio (cx,cy) de a0→a1 (rad, horário a partir das 12h). */
function sector(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, a0: number, a1: number): void {
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, a0 - Math.PI / 2, a1 - Math.PI / 2, false);
  ctx.closePath();
}

/**
 * Recorta o contexto à região visível do filtro em `q` e devolve o
 * multiplicador de opacidade. Filtros desconhecidos viram esmaecer.
 */
export function applyReveal(ctx: CanvasRenderingContext2D, filter: string, q: number,
  x: number, y: number, w: number, h: number): number {
  q = Math.max(0, Math.min(1, q));
  if (q >= 1) return 1;
  const [name, arg] = parseFilter(filter);
  if (name === 'fade') return q;
  if (q <= 0) { ctx.beginPath(); ctx.rect(x, y, 0, 0); ctx.clip(); return 1; }
  const cx = x + w / 2, cy = y + h / 2;
  ctx.beginPath();
  switch (name) {
    case 'wipe': {
      // medido no app: wipe(down) é o "Revelar de baixo" — começa pela BASE e
      // sobe; o argumento aponta o lado de ONDE a revelação parte
      if (arg === 'down') ctx.rect(x, y + h * (1 - q), w, h * q);
      else if (arg === 'up') ctx.rect(x, y, w, h * q);
      else if (arg === 'left') ctx.rect(x, y, w * q, h);
      else ctx.rect(x + w * (1 - q), y, w * q, h);
      break;
    }
    case 'barn': {
      // inVertical: portas verticais que FECHAM (bordas → centro); out: centro → bordas
      const vertical = arg.includes('Vertical');
      const inward = arg.startsWith('in');
      if (vertical) {
        if (inward) { ctx.rect(x, y, (w * q) / 2, h); ctx.rect(x + w - (w * q) / 2, y, (w * q) / 2, h); }
        else ctx.rect(cx - (w * q) / 2, y, w * q, h);
      } else if (inward) { ctx.rect(x, y, w, (h * q) / 2); ctx.rect(x, y + h - (h * q) / 2, w, (h * q) / 2); }
      else ctx.rect(x, cy - (h * q) / 2, w, h * q);
      break;
    }
    case 'blinds': {
      const n = 6;
      if (arg === 'vertical') { const bw = w / n; for (let i = 0; i < n; i++) ctx.rect(x + i * bw, y, bw * q, h); }
      else { const bh = h / n; for (let i = 0; i < n; i++) ctx.rect(x, y + i * bh, w, bh * q); }
      break;
    }
    case 'box': {
      if (arg === 'in') {
        // revela das bordas p/ o centro: fora de um retângulo interno que encolhe
        const iw = w * (1 - q), ih = h * (1 - q);
        ctx.rect(x, y, w, h);
        ctx.rect(cx + iw / 2, cy - ih / 2, -iw, ih); // retângulo interno em sentido inverso (furo)
      } else ctx.rect(cx - (w * q) / 2, cy - (h * q) / 2, w * q, h * q);
      break;
    }
    case 'circle': {
      const R = Math.hypot(w, h) / 2;
      if (arg === 'in') { ctx.rect(x, y, w, h); ctx.moveTo(cx + R * (1 - q), cy); ctx.arc(cx, cy, R * (1 - q), 0, Math.PI * 2, true); }
      else ctx.arc(cx, cy, R * q, 0, Math.PI * 2);
      break;
    }
    case 'diamond': {
      const dx = w * q, dy = h * q; // em q=1 o losango cobre os cantos (|u|+|v| ≤ 2)
      if (arg === 'in') {
        const ix = w * (1 - q), iy = h * (1 - q);
        ctx.rect(x, y, w, h);
        ctx.moveTo(cx, cy - iy); ctx.lineTo(cx - ix, cy); ctx.lineTo(cx, cy + iy); ctx.lineTo(cx + ix, cy); ctx.closePath();
      } else { ctx.moveTo(cx, cy - dy); ctx.lineTo(cx + dx, cy); ctx.lineTo(cx, cy + dy); ctx.lineTo(cx - dx, cy); ctx.closePath(); }
      break;
    }
    case 'plus': {
      if (arg === 'in') {
        // revela pelos cantos: o "mais" oculto encolhe
        const aw = (w / 2) * (1 - q), ah = (h / 2) * (1 - q);
        ctx.rect(x, y, w, h);
        ctx.moveTo(cx - aw, y); ctx.lineTo(cx - aw, cy - ah); ctx.lineTo(x, cy - ah); ctx.lineTo(x, cy + ah); ctx.lineTo(cx - aw, cy + ah);
        ctx.lineTo(cx - aw, y + h); ctx.lineTo(cx + aw, y + h); ctx.lineTo(cx + aw, cy + ah); ctx.lineTo(x + w, cy + ah); ctx.lineTo(x + w, cy - ah);
        ctx.lineTo(cx + aw, cy - ah); ctx.lineTo(cx + aw, y); ctx.closePath();
      } else {
        const aw = (w / 2) * q, ah = (h / 2) * q;
        ctx.rect(cx - aw, y, aw * 2, h);
        ctx.rect(x, cy - ah, w, ah * 2);
      }
      break;
    }
    case 'checkerboard': {
      const cols = 8, rows = 8;
      const cw = w / cols, ch = h / rows;
      // casas alternadas defasadas meia casa; cada casa revela em 2× (q·2 − defasagem)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const odd = (r + c) % 2;
          const f = Math.max(0, Math.min(1, q * 2 - odd));
          if (f <= 0) continue;
          if (arg === 'down') ctx.rect(x + c * cw, y + r * ch, cw, ch * f);
          else ctx.rect(x + c * cw, y + r * ch, cw * f, ch);
        }
      }
      break;
    }
    case 'dissolve': {
      // grão fino (~8 px a 1280): o app dissolve em pontos pequenos
      const cols = Math.max(24, Math.round(w / 8)), rows = Math.max(1, Math.round((cols * h) / Math.max(1, w)));
      const cw = w / cols, ch = h / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (hash01(c, r) < q) ctx.rect(x + c * cw, y + r * ch, cw + 0.5, ch + 0.5);
      break;
    }
    case 'randombar': {
      const n = 64;
      if (arg === 'vertical') { const bw = w / n; for (let i = 0; i < n; i++) if (hash01(i, 7) < q) ctx.rect(x + i * bw, y, bw + 0.5, h); }
      else { const bh = h / n; for (let i = 0; i < n; i++) if (hash01(i, 3) < q) ctx.rect(x, y + i * bh, w, bh + 0.5); }
      break;
    }
    case 'strips': {
      // diagonal em degraus: downLeft parte do canto sup. direito
      const steps = 16;
      const fromRight = arg.includes('Left'), fromTop = arg.startsWith('down');
      const cw = w / steps, ch = h / steps;
      for (let r = 0; r < steps; r++) {
        for (let c = 0; c < steps; c++) {
          const u = fromRight ? steps - 1 - c : c;
          const v = fromTop ? r : steps - 1 - r;
          if ((u + v) / (2 * steps - 2) <= q) ctx.rect(x + c * cw, y + r * ch, cw + 0.5, ch + 0.5);
        }
      }
      break;
    }
    case 'wedge': {
      const R = Math.hypot(w, h);
      sector(ctx, cx, cy, R, 2 * Math.PI - Math.PI * q, 2 * Math.PI);
      sector(ctx, cx, cy, R, 0, Math.PI * q);
      break;
    }
    case 'wheel': {
      const n = Math.max(1, parseInt(arg, 10) || 1);
      const R = Math.hypot(w, h);
      const span = (2 * Math.PI) / n;
      for (let i = 0; i < n; i++) sector(ctx, cx, cy, R, i * span, i * span + span * q);
      break;
    }
    case 'slide': {
      // espiar: o conteúdo desliza p/ dentro da própria caixa (recorte + deslocamento)
      ctx.rect(x, y, w, h);
      ctx.clip();
      const off = 1 - q;
      if (arg === 'fromBottom') ctx.translate(0, h * off);
      else if (arg === 'fromTop') ctx.translate(0, -h * off);
      else if (arg === 'fromLeft') ctx.translate(-w * off, 0);
      else ctx.translate(w * off, 0);
      return 1;
    }
    default:
      return q;
  }
  // nonzero: furos (in) são desenhados no sentido inverso; uniões somam
  ctx.clip();
  return 1;
}

/** Usado pelos testes/diagnóstico: o ponto (px,py) está visível em `q`? (aprox. analítica). */
export function revealContains(filter: string, q: number, px: number, py: number, w: number, h: number): boolean {
  const [name, arg] = parseFilter(filter);
  const u = px / w, v = py / h;
  switch (name) {
    case 'wipe': return arg === 'down' ? v >= 1 - q : arg === 'up' ? v <= q : arg === 'left' ? u <= q : u >= 1 - q;
    case 'wedge': { const a = clockAngle(px - w / 2, py - h / 2); return a <= Math.PI * q || a >= 2 * Math.PI - Math.PI * q; }
    case 'wheel': { const n = Math.max(1, parseInt(arg, 10) || 1); const a = clockAngle(px - w / 2, py - h / 2); const span = (2 * Math.PI) / n; return (a % span) <= span * q; }
    default: return true;
  }
}

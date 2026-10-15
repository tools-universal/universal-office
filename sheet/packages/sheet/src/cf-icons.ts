/**
 * Ícones dos conjuntos de ícones da formatação condicional — aproximações
 * VETORIAIS dos do Excel 365 (forma, cor de preenchimento e contorno medidos
 * no oráculo, pasta t-cf: vermelho #D65532/#9E381C, amarelo #EAC282/#A4802B,
 * verde #68A490/#326F5B, cinza #808080/#646262, escuro #505050/#303030,
 * barras azuis #497CB0/#34608D). Caixa de 16×16 px a 100%.
 * Índice 0 = o ícone do MENOR valor (3Arrows: 0 seta vermelha p/ baixo).
 */

const RED: [string, string] = ['#D65532', '#9E381C'];
const YEL: [string, string] = ['#EAC282', '#A4802B'];
const GRN: [string, string] = ['#68A490', '#326F5B'];
const GRAY: [string, string] = ['#808080', '#646262'];
const DARK: [string, string] = ['#505050', '#303030'];
const LGRAY: [string, string] = ['#B1B1B1', '#8E8E8E'];
const PINK: [string, string] = ['#EDB2A3', '#C98F80'];
const RED2: [string, string] = ['#D86344', '#A8492D'];
const BLUE: [string, string] = ['#497CB0', '#34608D'];
const BAR_OFF: [string, string] = ['#B3B3B3', '#747474'];

type Kind =
  | { k: 'arrow'; dir: number; c: [string, string] }
  | { k: 'circle'; c: [string, string] }
  | { k: 'light'; c: [string, string] }
  | { k: 'flag'; c: [string, string] }
  | { k: 'diamond'; c: [string, string] }
  | { k: 'tri'; c: [string, string]; down?: boolean }
  | { k: 'dash'; c: [string, string] }
  | { k: 'sym'; s: 'x' | '!' | 'v'; c: [string, string]; ring: boolean }
  | { k: 'bars'; n: number; of: number }
  | { k: 'quarter'; q: number }
  | { k: 'star'; fill: number }
  | { k: 'boxes'; n: number };

// direção das setas em graus (0 = para cima, sentido horário)
const UP = 0, NE = 45, RIGHT = 90, SE = 135, DOWN = 180;

const SETS: Record<string, Kind[]> = {
  '3Arrows': [{ k: 'arrow', dir: DOWN, c: RED }, { k: 'arrow', dir: RIGHT, c: YEL }, { k: 'arrow', dir: UP, c: GRN }],
  '3ArrowsGray': [{ k: 'arrow', dir: DOWN, c: GRAY }, { k: 'arrow', dir: RIGHT, c: GRAY }, { k: 'arrow', dir: UP, c: GRAY }],
  '3Flags': [{ k: 'flag', c: RED }, { k: 'flag', c: YEL }, { k: 'flag', c: GRN }],
  '3TrafficLights1': [{ k: 'circle', c: RED }, { k: 'circle', c: YEL }, { k: 'circle', c: GRN }],
  '3TrafficLights2': [{ k: 'light', c: RED }, { k: 'light', c: YEL }, { k: 'light', c: GRN }],
  '3Signs': [{ k: 'diamond', c: RED }, { k: 'tri', c: YEL }, { k: 'circle', c: GRN }],
  '3Symbols': [{ k: 'sym', s: 'x', c: RED, ring: true }, { k: 'sym', s: '!', c: YEL, ring: true }, { k: 'sym', s: 'v', c: GRN, ring: true }],
  '3Symbols2': [{ k: 'sym', s: 'x', c: RED, ring: false }, { k: 'sym', s: '!', c: YEL, ring: false }, { k: 'sym', s: 'v', c: GRN, ring: false }],
  '3Stars': [{ k: 'star', fill: 0 }, { k: 'star', fill: 0.5 }, { k: 'star', fill: 1 }],
  '3Triangles': [{ k: 'tri', c: RED, down: true }, { k: 'dash', c: YEL }, { k: 'tri', c: GRN }],
  '4Arrows': [{ k: 'arrow', dir: DOWN, c: RED }, { k: 'arrow', dir: SE, c: YEL }, { k: 'arrow', dir: NE, c: YEL }, { k: 'arrow', dir: UP, c: GRN }],
  '4ArrowsGray': [{ k: 'arrow', dir: DOWN, c: GRAY }, { k: 'arrow', dir: SE, c: GRAY }, { k: 'arrow', dir: NE, c: GRAY }, { k: 'arrow', dir: UP, c: GRAY }],
  '4RedToBlack': [{ k: 'circle', c: DARK }, { k: 'circle', c: LGRAY }, { k: 'circle', c: PINK }, { k: 'circle', c: RED2 }],
  '4Rating': [1, 2, 3, 4].map((n) => ({ k: 'bars', n, of: 4 }) as Kind),
  '4TrafficLights': [{ k: 'circle', c: DARK }, { k: 'circle', c: RED }, { k: 'circle', c: YEL }, { k: 'circle', c: GRN }],
  '5Arrows': [{ k: 'arrow', dir: DOWN, c: RED }, { k: 'arrow', dir: SE, c: YEL }, { k: 'arrow', dir: RIGHT, c: YEL }, { k: 'arrow', dir: NE, c: YEL }, { k: 'arrow', dir: UP, c: GRN }],
  '5ArrowsGray': [{ k: 'arrow', dir: DOWN, c: GRAY }, { k: 'arrow', dir: SE, c: GRAY }, { k: 'arrow', dir: RIGHT, c: GRAY }, { k: 'arrow', dir: NE, c: GRAY }, { k: 'arrow', dir: UP, c: GRAY }],
  '5Rating': [0, 1, 2, 3, 4].map((n) => ({ k: 'bars', n, of: 4 }) as Kind),
  '5Quarters': [0, 1, 2, 3, 4].map((q) => ({ k: 'quarter', q }) as Kind),
  '5Boxes': [0, 1, 2, 3, 4].map((n) => ({ k: 'boxes', n }) as Kind),
};

/** Desenha o ícone `index` do conjunto `set` com o canto superior esquerdo em (x,y), lado `s` px. */
export function paintCfIcon(ctx: CanvasRenderingContext2D, set: string, index: number, x: number, y: number, s = 16): void {
  const kinds = SETS[set];
  const kind = kinds?.[Math.max(0, Math.min(kinds.length - 1, index))];
  if (!kind) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 16, s / 16);
  ctx.lineJoin = 'miter';
  ctx.lineWidth = 1;
  const fillStroke = (p: Path2D, c: [string, string]): void => { ctx.fillStyle = c[0]; ctx.fill(p); ctx.strokeStyle = c[1]; ctx.stroke(p); };
  switch (kind.k) {
    case 'arrow': {
      const p = new Path2D();
      // seta "gorda" do Excel (medida pixel a pixel, t-cf): haste de 5 px,
      // cabeça de 13 px com farpas em V e ponta arredondada; desenhada para
      // CIMA na caixa 16×16 e girada em torno do centro
      // (vértices nos CENTROS dos pixels: o contorno de 1 px fecha a forma exata)
      const pts: [number, number][] = [
        [5.5, 0.5], [9.5, 0.5], [13.5, 4.5], [13.5, 10.5], [10.5, 7.5], [9.5, 7.5], [9.5, 14.5],
        [5.5, 14.5], [5.5, 7.5], [4.5, 7.5], [1.5, 10.5], [1.5, 4.5],
      ];
      const a = (kind.dir * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
      pts.forEach(([px, py], i) => {
        const dx = px - 7.5, dy = py - 7.5;
        const rx = 7.5 + dx * ca - dy * sa, ry = 7.5 + dx * sa + dy * ca;
        if (i === 0) p.moveTo(rx, ry); else p.lineTo(rx, ry);
      });
      p.closePath();
      fillStroke(p, kind.c);
      break;
    }
    case 'circle': {
      const p = new Path2D(); p.arc(8, 8, 7.5, 0, Math.PI * 2);
      fillStroke(p, kind.c);
      break;
    }
    case 'light': {
      const box = new Path2D(); box.roundRect?.(0.5, 0.5, 15, 15, 2.5) ?? box.rect(0.5, 0.5, 15, 15);
      fillStroke(box, DARK);
      const p = new Path2D(); p.arc(8, 8, 4.5, 0, Math.PI * 2);
      fillStroke(p, kind.c);
      break;
    }
    case 'flag': {
      // haste de 2 px em x=2 (altura toda) e bandeira de x=5 a 16 (medido)
      ctx.fillStyle = '#727272'; ctx.fillRect(2, 0, 2, 15);
      const p = new Path2D(); p.moveTo(5.5, 0.5); p.lineTo(15.5, 4.5); p.lineTo(5.5, 8.5); p.closePath();
      fillStroke(p, kind.c);
      break;
    }
    case 'diamond': {
      const p = new Path2D(); p.moveTo(8, 0.5); p.lineTo(15.5, 8); p.lineTo(8, 15.5); p.lineTo(0.5, 8); p.closePath();
      fillStroke(p, kind.c);
      break;
    }
    case 'tri': {
      const p = new Path2D();
      if (kind.down) { p.moveTo(1, 3.5); p.lineTo(15, 3.5); p.lineTo(8, 13.5); }
      else { p.moveTo(8, 1.5); p.lineTo(15.5, 14.5); p.lineTo(0.5, 14.5); }
      p.closePath();
      fillStroke(p, kind.c);
      break;
    }
    case 'dash': {
      const p = new Path2D(); p.rect(1.5, 6.5, 13, 4);
      fillStroke(p, kind.c);
      break;
    }
    case 'sym': {
      if (kind.ring) {
        const p = new Path2D(); p.arc(8, 8, 7.5, 0, Math.PI * 2);
        fillStroke(p, kind.c);
      }
      ctx.strokeStyle = kind.ring ? '#FFFFFF' : kind.c[0];
      ctx.lineWidth = kind.ring ? 2 : 3;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      if (kind.s === 'x') { const m = kind.ring ? 4.5 : 2; ctx.moveTo(m, m); ctx.lineTo(16 - m, 16 - m); ctx.moveTo(16 - m, m); ctx.lineTo(m, 16 - m); ctx.stroke(); }
      else if (kind.s === 'v') { if (kind.ring) { ctx.moveTo(4.5, 8.5); ctx.lineTo(7, 11); ctx.lineTo(11.5, 5); } else { ctx.moveTo(1.5, 8.5); ctx.lineTo(6, 13); ctx.lineTo(14.5, 3); } ctx.stroke(); }
      else {
        ctx.fillStyle = kind.ring ? '#FFFFFF' : kind.c[0];
        if (kind.ring) { ctx.fillRect(7, 3.5, 2, 6); ctx.fillRect(7, 11, 2, 2); }
        else { ctx.fillRect(6.5, 1, 3, 10); ctx.fillRect(6.5, 12.5, 3, 3); ctx.strokeStyle = kind.c[1]; ctx.lineWidth = 1; ctx.strokeRect(6.5, 1, 3, 10); ctx.strokeRect(6.5, 12.5, 3, 3); }
      }
      break;
    }
    case 'bars': {
      for (let i = 0; i < 4; i++) {
        const h = 4 + i * 3.5, bx = 1.5 + i * 3.5;
        const p = new Path2D(); p.rect(bx, 15.5 - h, 3, h);
        fillStroke(p, i < kind.n ? BLUE : BAR_OFF);
      }
      break;
    }
    case 'quarter': {
      const ring = new Path2D(); ring.arc(8, 8, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF'; ctx.fill(ring);
      if (kind.q > 0) {
        const p = new Path2D();
        if (kind.q >= 4) p.arc(8, 8, 7.5, 0, Math.PI * 2);
        else { p.moveTo(8, 8); p.arc(8, 8, 7.5, -Math.PI / 2, -Math.PI / 2 + (Math.PI / 2) * kind.q); p.closePath(); }
        ctx.fillStyle = DARK[0]; ctx.fill(p);
      }
      ctx.strokeStyle = DARK[0]; ctx.stroke(ring);
      break;
    }
    case 'star': {
      const p = new Path2D();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 7.5 : 3.2, a = -Math.PI / 2 + (i * Math.PI) / 5;
        const px = 8 + r * Math.cos(a), py = 8.6 + r * Math.sin(a);
        if (i === 0) p.moveTo(px, py); else p.lineTo(px, py);
      }
      p.closePath();
      ctx.fillStyle = '#FFFFFF'; ctx.fill(p);
      if (kind.fill > 0) {
        ctx.save();
        if (kind.fill < 1) { ctx.beginPath(); ctx.rect(0, 0, 8, 16); ctx.clip(); }
        ctx.fillStyle = YEL[0]; ctx.fill(p);
        ctx.restore();
      }
      ctx.strokeStyle = kind.fill >= 1 ? YEL[1] : '#727272'; ctx.stroke(p);
      break;
    }
    case 'boxes': {
      const cells: [number, number][] = [[1.5, 8.5], [8.5, 8.5], [1.5, 1.5], [8.5, 1.5]];
      cells.forEach(([bx, by], i) => { const p = new Path2D(); p.rect(bx, by, 6, 6); fillStroke(p, i < kind.n ? BLUE : BAR_OFF); });
      break;
    }
  }
  ctx.restore();
}

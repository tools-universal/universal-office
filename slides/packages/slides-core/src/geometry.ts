/**
 * Geometrias preset do DrawingML (`<a:prstGeom prst>`) como FUNÇÃO PURA
 * (spec 03, item F). Devolve um descritor de path parametrizado pelo retângulo
 * `w × h` — o renderer (canvas) e o export (PDF, spec 05) constroem o path
 * final a partir do descritor. Usa os adj DEFAULTS de cada preset (avLst
 * custom fica fora do escopo v1).
 */

export interface Pt { x: number; y: number }

/** Segmento de um subpath genérico (coordenadas absolutas no rect w×h). */
export type PathSeg =
  | { c: 'M'; x: number; y: number }
  | { c: 'L'; x: number; y: number }
  | { c: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { c: 'Q'; x1: number; y1: number; x: number; y: number }
  /** Arco de elipse (ctx.ellipse): ângulos em RADIANOS, a0→a1, ccw opcional. */
  | { c: 'E'; cx: number; cy: number; rx: number; ry: number; a0: number; a1: number; ccw?: boolean }
  | { c: 'Z' };

export type PresetPath =
  /** Polígono fechado. */
  | { kind: 'poly'; points: Pt[] }
  /** Linha pura (line / straightConnector1) — só stroke, sem fill. */
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number }
  /** Fatia de torta: arco de startDeg até endDeg (graus, sentido horário, 0 = leste). */
  | { kind: 'pie'; startDeg: number; endDeg: number }
  | { kind: 'rect' }
  | { kind: 'ellipse' }
  /** Retângulo arredondado com raio em unidades do rect. */
  | { kind: 'roundRect'; r: number }
  /** Path genérico (beziers/arcos, múltiplos subpaths, fillRule opcional).
   *  `subLum` (paralelo a subs): offset de luminância HSL do FILL por subpath
   *  (sombreado 3D de can/cube; null = subpath só de stroke, não preenche). */
  | { kind: 'path'; fillRule?: 'evenodd'; subs: PathSeg[][]; subLum?: (number | null)[] };

/** Vértices de um polígono regular inscrito na elipse w×h, começando no topo. */
function regularPolygon(n: number, w: number, h: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    pts.push({ x: w / 2 + (w / 2) * Math.cos(a), y: h / 2 + (h / 2) * Math.sin(a) });
  }
  return pts;
}

/**
 * Normaliza um polígono para PREENCHER exatamente o rect w×h (o app de
 * referência escala pentagon/star5 ao bounding box, não à elipse inscrita).
 */
function fitToBox(pts: Pt[], w: number, h: number): Pt[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  const sw = maxX - minX || 1, sh = maxY - minY || 1;
  return pts.map((p) => ({ x: ((p.x - minX) / sw) * w, y: ((p.y - minY) / sh) * h }));
}

/**
 * Descritor de path para o preset `geom` num rect `w × h`.
 * Presets desconhecidos caem em `rect` (comportamento anterior preservado).
 */
export function presetPath(geom: string | undefined, w: number, h: number): PresetPath {
  const ss = Math.min(w, h); // "shortest side" das fórmulas DrawingML
  switch (geom) {
    case 'ellipse': return { kind: 'ellipse' };
    case 'roundRect': return { kind: 'roundRect', r: ss * 0.1 };

    case 'triangle': // isósceles, ápice no topo (adj 50000)
      return { kind: 'poly', points: [{ x: w / 2, y: 0 }, { x: w, y: h }, { x: 0, y: h }] };
    case 'rtTriangle': // ângulo reto no canto inferior-esquerdo
      return { kind: 'poly', points: [{ x: 0, y: 0 }, { x: w, y: h }, { x: 0, y: h }] };
    case 'diamond':
      return { kind: 'poly', points: [{ x: w / 2, y: 0 }, { x: w, y: h / 2 }, { x: w / 2, y: h }, { x: 0, y: h / 2 }] };
    case 'parallelogram': { // adj=25000 → deslocamento = ss/4
      const d = ss * 0.25;
      return { kind: 'poly', points: [{ x: d, y: 0 }, { x: w, y: 0 }, { x: w - d, y: h }, { x: 0, y: h }] };
    }
    case 'trapezoid': { // adj=25000 → topo mais estreito
      const d = ss * 0.25;
      return { kind: 'poly', points: [{ x: d, y: 0 }, { x: w - d, y: 0 }, { x: w, y: h }, { x: 0, y: h }] };
    }
    case 'pentagon':
      return { kind: 'poly', points: fitToBox(regularPolygon(5, w, h), w, h) };
    case 'hexagon': { // hexágono "horizontal" do PowerPoint (adj=25000)
      const d = ss * 0.25;
      return {
        kind: 'poly', points: [
          { x: d, y: 0 }, { x: w - d, y: 0 }, { x: w, y: h / 2 },
          { x: w - d, y: h }, { x: d, y: h }, { x: 0, y: h / 2 },
        ],
      };
    }
    case 'star5': { // adj=19098 → raio interno ≈ 0.38196 do externo
      const inner = 19098 / 50000;
      const pts: Pt[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const fx = i % 2 === 0 ? 1 : inner;
        pts.push({ x: w / 2 + (w / 2) * fx * Math.cos(a), y: h / 2 + (h / 2) * fx * Math.sin(a) });
      }
      // o app de referência ESCALA a estrela ao bounding box (fica maior/mais larga)
      return { kind: 'poly', points: fitToBox(pts, w, h) };
    }

    // setas em bloco (adj1=50000 → haste com metade da altura; adj2=50000 →
    // cabeça com comprimento ss/2)
    case 'rightArrow': {
      const hd = ss * 0.5, t = h * 0.25;
      return {
        kind: 'poly', points: [
          { x: 0, y: t }, { x: w - hd, y: t }, { x: w - hd, y: 0 }, { x: w, y: h / 2 },
          { x: w - hd, y: h }, { x: w - hd, y: h - t }, { x: 0, y: h - t },
        ],
      };
    }
    case 'leftArrow': {
      const hd = ss * 0.5, t = h * 0.25;
      return {
        kind: 'poly', points: [
          { x: w, y: t }, { x: hd, y: t }, { x: hd, y: 0 }, { x: 0, y: h / 2 },
          { x: hd, y: h }, { x: hd, y: h - t }, { x: w, y: h - t },
        ],
      };
    }
    case 'upArrow': {
      const hd = ss * 0.5, t = w * 0.25;
      return {
        kind: 'poly', points: [
          { x: t, y: h }, { x: t, y: hd }, { x: 0, y: hd }, { x: w / 2, y: 0 },
          { x: w, y: hd }, { x: w - t, y: hd }, { x: w - t, y: h },
        ],
      };
    }
    case 'downArrow': {
      const hd = ss * 0.5, t = w * 0.25;
      return {
        kind: 'poly', points: [
          { x: t, y: 0 }, { x: t, y: h - hd }, { x: 0, y: h - hd }, { x: w / 2, y: h },
          { x: w, y: h - hd }, { x: w - t, y: h - hd }, { x: w - t, y: 0 },
        ],
      };
    }
    case 'chevron': { // adj=50000 → recuo = ss/2
      const d = ss * 0.5;
      return {
        kind: 'poly', points: [
          { x: 0, y: 0 }, { x: w - d, y: 0 }, { x: w, y: h / 2 },
          { x: w - d, y: h }, { x: 0, y: h }, { x: d, y: h / 2 },
        ],
      };
    }
    case 'pie': // adj1=0, adj2=270 (graus × 60000 no XML)
      return { kind: 'pie', startDeg: 0, endDeg: 270 };
    case 'line':
    case 'straightConnector1':
      return { kind: 'line', x1: 0, y1: 0, x2: w, y2: h };
    case 'bentConnector2': // 1 dobra: H depois V
      return { kind: 'path', subs: [[{ c: 'M', x: 0, y: 0 }, { c: 'L', x: w, y: 0 }, { c: 'L', x: w, y: h }]] };
    case 'bentConnector3': // 2 dobras: H, V, H (dobra em w/2)
      return {
        kind: 'path', subs: [[
          { c: 'M', x: 0, y: 0 }, { c: 'L', x: w / 2, y: 0 },
          { c: 'L', x: w / 2, y: h }, { c: 'L', x: w, y: h },
        ]],
      };
    case 'bentConnector4': // 3 dobras: H, V, H, V
      return {
        kind: 'path', subs: [[
          { c: 'M', x: 0, y: 0 }, { c: 'L', x: w / 2, y: 0 },
          { c: 'L', x: w / 2, y: h / 2 }, { c: 'L', x: w, y: h / 2 },
          { c: 'L', x: w, y: h },
        ]],
      };
    case 'curvedConnector2':
    case 'curvedConnector3':
    case 'curvedConnector4':
    case 'curvedConnector5': // curva S (aproximação suave dos roteamentos)
      return {
        kind: 'path', subs: [[
          { c: 'M', x: 0, y: 0 },
          { c: 'C', x1: w / 2, y1: 0, x2: w / 2, y2: h, x: w, y: h },
        ]],
      };

    case 'arc': { // adj1=16200000 (270°) → adj2=0: quarto de arco (SÓ stroke)
      return {
        kind: 'path', subs: [[
          { c: 'E', cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2, a0: -Math.PI / 2, a1: 0 },
        ]],
      };
    }
    case 'blockArc': { // adj: 180°→0° com espessura ss/4 — "arco" (meia rosca)
      const t = ss * 0.25;
      return {
        kind: 'path', subs: [[
          { c: 'M', x: 0, y: h / 2 },
          { c: 'E', cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2, a0: Math.PI, a1: Math.PI * 2 },
          { c: 'L', x: w - t, y: h / 2 },
          { c: 'E', cx: w / 2, cy: h / 2, rx: w / 2 - t, ry: h / 2 - t, a0: 0, a1: Math.PI, ccw: true },
          { c: 'Z' },
        ]],
      };
    }
    case 'octagon': { // adj=29289 → corte ≈ (1-1/√2)·ss
      const d = ss * 0.29289;
      return {
        kind: 'poly', points: [
          { x: d, y: 0 }, { x: w - d, y: 0 }, { x: w, y: d }, { x: w, y: h - d },
          { x: w - d, y: h }, { x: d, y: h }, { x: 0, y: h - d }, { x: 0, y: d },
        ],
      };
    }
    case 'donut': { // adj=25000 → espessura do anel = ss/4
      const t = ss * 0.25;
      return {
        kind: 'path', fillRule: 'evenodd', subs: [
          [{ c: 'E', cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2, a0: 0, a1: Math.PI * 2 }, { c: 'Z' }],
          [{ c: 'E', cx: w / 2, cy: h / 2, rx: w / 2 - t, ry: h / 2 - t, a0: 0, a1: Math.PI * 2 }, { c: 'Z' }],
        ],
      };
    }
    case 'moon': { // adj=87500/50000 — crescente com abertura à DIREITA
      // arco externo: elipse do box inteiro; arco interno: elipse com rx menor
      // ancorada na borda direita (formato "C").
      const irx = w * 0.5;
      return {
        kind: 'path', subs: [[
          { c: 'M', x: w, y: 0 },
          { c: 'E', cx: w, cy: h / 2, rx: w, ry: h / 2, a0: -Math.PI / 2, a1: -Math.PI * 1.5, ccw: true },
          { c: 'E', cx: w, cy: h / 2, rx: irx, ry: h * 0.4, a0: Math.PI / 2, a1: -Math.PI / 2, ccw: false },
          { c: 'Z' },
        ]],
      };
    }
    case 'heart': {
      return {
        kind: 'path', subs: [[
          { c: 'M', x: w / 2, y: h * 0.3 },
          { c: 'C', x1: w * 0.5, y1: h * 0.12, x2: w * 0.38, y2: h * 0.01, x: w * 0.26, y: h * 0.01 },
          { c: 'C', x1: w * 0.1, y1: h * 0.01, x2: 0, y2: h * 0.14, x: 0, y: h * 0.31 },
          { c: 'C', x1: 0, y1: h * 0.51, x2: w * 0.18, y2: h * 0.66, x: w / 2, y: h },
          { c: 'C', x1: w * 0.82, y1: h * 0.66, x2: w, y2: h * 0.51, x: w, y: h * 0.31 },
          { c: 'C', x1: w, y1: h * 0.14, x2: w * 0.9, y2: h * 0.01, x: w * 0.74, y: h * 0.01 },
          { c: 'C', x1: w * 0.62, y1: h * 0.01, x2: w * 0.5, y2: h * 0.12, x: w / 2, y: h * 0.3 },
          { c: 'Z' },
        ]],
      };
    }
    case 'lightningBolt': { // path do preset (unidades 21600) escalado ao rect
      const u = (px: number, py: number): Pt => ({ x: (px / 21600) * w, y: (py / 21600) * h });
      const pts = [
        u(8472, 0), u(12860, 6080), u(11050, 6797), u(16577, 12007), u(14767, 12877),
        u(21600, 21600), u(10800, 14915), u(12482, 14072), u(7602, 8382), u(9722, 7292), u(0, 3890),
      ];
      return { kind: 'poly', points: pts };
    }
    case 'sun': { // adj=25000 — 8 raios triangulares + disco central
      const cx = w / 2, cy = h / 2;
      const rx = w * 0.28, ry = h * 0.28;   // disco
      const brx = w * 0.32, bry = h * 0.32; // base dos raios
      const subs: PathSeg[][] = [
        [{ c: 'E', cx, cy, rx, ry, a0: 0, a1: Math.PI * 2 }, { c: 'Z' }],
      ];
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const spread = 0.35;
        subs.push([
          { c: 'M', x: cx + Math.cos(a) * (w / 2), y: cy + Math.sin(a) * (h / 2) },
          { c: 'L', x: cx + Math.cos(a + spread) * brx, y: cy + Math.sin(a + spread) * bry },
          { c: 'L', x: cx + Math.cos(a - spread) * brx, y: cy + Math.sin(a - spread) * bry },
          { c: 'Z' },
        ]);
      }
      return { kind: 'path', subs };
    }
    case 'can': { // adj=25000 → "tampa" com meia-altura ss/8; tampa MAIS CLARA
      const ry = ss * 0.125;
      return {
        kind: 'path',
        subs: [
          [ // corpo: laterais + fundo arqueado + topo arqueado (contorno completo)
            { c: 'M', x: 0, y: ry },
            { c: 'L', x: 0, y: h - ry },
            { c: 'E', cx: w / 2, cy: h - ry, rx: w / 2, ry, a0: Math.PI, a1: 0, ccw: true },
            { c: 'L', x: w, y: ry },
            { c: 'E', cx: w / 2, cy: ry, rx: w / 2, ry, a0: 0, a1: Math.PI, ccw: true },
            { c: 'Z' },
          ],
          [ // tampa (elipse completa — o stroke marca a boca do cilindro)
            { c: 'E', cx: w / 2, cy: ry, rx: w / 2, ry, a0: 0, a1: Math.PI * 2 },
            { c: 'Z' },
          ],
        ],
        subLum: [0, 0.18],
      };
    }
    case 'cube': { // adj=25000 → profundidade ss/4; faces sombreadas como o app
      const d = ss * 0.25;
      return {
        kind: 'path',
        subs: [
          [ // face frontal
            { c: 'M', x: 0, y: d }, { c: 'L', x: w - d, y: d }, { c: 'L', x: w - d, y: h },
            { c: 'L', x: 0, y: h }, { c: 'Z' },
          ],
          [ // face superior (mais clara)
            { c: 'M', x: 0, y: d }, { c: 'L', x: d, y: 0 }, { c: 'L', x: w, y: 0 },
            { c: 'L', x: w - d, y: d }, { c: 'Z' },
          ],
          [ // face lateral direita (mais escura)
            { c: 'M', x: w - d, y: d }, { c: 'L', x: w, y: 0 }, { c: 'L', x: w, y: h - d },
            { c: 'L', x: w - d, y: h }, { c: 'Z' },
          ],
        ],
        subLum: [0, 0.15, -0.15],
      };
    }
    default:
      // action buttons: face retangular + GLIFO central mais escuro (o app de
      // referência desenha o ícone com sombra do próprio fill)
      if (geom?.startsWith('actionButton')) {
        const cx = w / 2, cy = h / 2, g = Math.min(w, h) * 0.3;
        const glyph = actionGlyph(geom, cx, cy, g);
        return {
          kind: 'path',
          subs: [
            [{ c: 'M', x: 0, y: 0 }, { c: 'L', x: w, y: 0 }, { c: 'L', x: w, y: h }, { c: 'L', x: 0, y: h }, { c: 'Z' }],
            ...glyph,
          ],
          subLum: [0, ...glyph.map(() => -0.25)],
        };
      }
      return { kind: 'rect' };
  }
}

/** Glifos dos action buttons (setas/barras) centrados em (cx,cy), raio g. */
function actionGlyph(geom: string, cx: number, cy: number, g: number): PathSeg[][] {
  const tri = (dir: 1 | -1): PathSeg[] => [
    { c: 'M', x: cx + dir * g, y: cy }, { c: 'L', x: cx - dir * g, y: cy - g },
    { c: 'L', x: cx - dir * g, y: cy + g }, { c: 'Z' },
  ];
  const bar = (x: number): PathSeg[] => [
    { c: 'M', x: x - g * 0.18, y: cy - g }, { c: 'L', x: x + g * 0.18, y: cy - g },
    { c: 'L', x: x + g * 0.18, y: cy + g }, { c: 'L', x: x - g * 0.18, y: cy + g }, { c: 'Z' },
  ];
  switch (geom) {
    case 'actionButtonForwardNext': return [tri(1)];
    case 'actionButtonBackPrevious': return [tri(-1)];
    case 'actionButtonBeginning': return [bar(cx - g), tri(-1)];
    case 'actionButtonEnd': return [tri(1), bar(cx + g)];
    case 'actionButtonReturn': // seta em U (aprox. poligonal)
      return [[
        { c: 'M', x: cx - g, y: cy - g * 0.2 }, { c: 'L', x: cx - g * 0.2, y: cy - g },
        { c: 'L', x: cx + g * 0.6, y: cy - g }, { c: 'L', x: cx + g * 0.6, y: cy + g },
        { c: 'L', x: cx - g * 0.6, y: cy + g }, { c: 'L', x: cx - g * 0.6, y: cy + g * 0.5 },
        { c: 'L', x: cx + g * 0.1, y: cy + g * 0.5 }, { c: 'L', x: cx + g * 0.1, y: cy - g * 0.5 },
        { c: 'L', x: cx - g * 0.2, y: cy - g * 0.5 }, { c: 'L', x: cx - g, y: cy - g * 0.2 }, { c: 'Z' },
      ]];
    case 'actionButtonDocument': // folha com canto dobrado
      return [[
        { c: 'M', x: cx - g * 0.7, y: cy - g }, { c: 'L', x: cx + g * 0.3, y: cy - g },
        { c: 'L', x: cx + g * 0.7, y: cy - g * 0.6 }, { c: 'L', x: cx + g * 0.7, y: cy + g },
        { c: 'L', x: cx - g * 0.7, y: cy + g }, { c: 'Z' },
      ]];
    default: return [tri(1)];
  }
}

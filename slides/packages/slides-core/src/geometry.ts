/**
 * Geometrias preset do DrawingML (`<a:prstGeom prst>`) como FUNÇÃO PURA
 * (spec 03, item F). Devolve um descritor de path parametrizado pelo retângulo
 * `w × h` — o renderer (canvas) e o export (PDF, spec 05) constroem o path
 * final a partir do descritor. Usa os adj DEFAULTS de cada preset (avLst
 * custom fica fora do escopo v1).
 */

export interface Pt { x: number; y: number }

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
  | { kind: 'roundRect'; r: number };

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
      return { kind: 'poly', points: regularPolygon(5, w, h) };
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
      return { kind: 'poly', points: pts };
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
    default:
      return { kind: 'rect' };
  }
}

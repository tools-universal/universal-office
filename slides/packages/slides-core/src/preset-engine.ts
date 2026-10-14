/**
 * Interpretador das geometrias PRESET do DrawingML (ECMA-376 Parte 1, 20.1.9):
 * avalia as guias (`avLst` com os ajustes da forma, depois `gdLst`) e monta
 * os caminhos (`moveTo`/`lnTo`/`arcTo`/`quadBezTo`/`cubicBezTo`/`close`) de
 * qualquer um dos ~187 presets de preset-defs.ts — as mesmas fórmulas que o
 * app de referência usa. Ângulos em 1/60000 de grau.
 */
import { PRESET_DEFS } from './preset-defs.js';
import type { PathSeg } from './geometry.js';

interface PathDef { w?: number; h?: number; fill: string; stroke: boolean; cmds: string[][] }
interface PresetDef { av: [string, string[]][]; gd: [string, string[]][]; paths: PathDef[]; rect?: string[] }

const parsed = new Map<string, PresetDef | null>();

function parseDef(name: string): PresetDef | null {
  if (parsed.has(name)) return parsed.get(name)!;
  const raw = Object.prototype.hasOwnProperty.call(PRESET_DEFS, name) ? PRESET_DEFS[name] : undefined;
  let def: PresetDef | null = null;
  if (raw !== undefined) {
    const [av = '', gd = '', ps = '', rc = ''] = raw.split('|');
    // tokens por QUALQUER espaço: a definição oficial tem "*/ vc  vf 100000"
    // (espaço duplo em pentagon/heptagon/star5/star7/leftArrow/upArrow) — com
    // split(' ') os argumentos deslocavam e `svc` virava 0 (forma deformada)
    const words = (s: string): string[] => s.trim().split(/\s+/).filter(Boolean);
    const guides = (s: string): [string, string[]][] => (s ? s.split(';').map((e) => {
      const i = e.indexOf('=');
      return [e.slice(0, i).trim(), words(e.slice(i + 1))] as [string, string[]];
    }) : []);
    const paths = ps ? ps.split('#').map((p): PathDef => {
      const [attrs = '', cmds = ''] = p.split('~');
      const [w = '', h = '', fill = '', stroke = ''] = attrs.split(',');
      const d: PathDef = { fill, stroke: stroke !== 'false' && stroke !== '0', cmds: cmds ? cmds.split(';').map(words) : [] };
      if (w) d.w = Number(w);
      if (h) d.h = Number(h);
      return d;
    }) : [];
    def = { av: guides(av), gd: guides(gd), paths };
    const rw = words(rc);
    if (rw.length === 4) def.rect = rw;
  }
  parsed.set(name, def);
  return def;
}

/** O preset tem definição oficial interpretável? */
export function hasPresetDef(name: string | undefined): boolean {
  return !!name && parseDef(name) !== null;
}

const DEG = Math.PI / (180 * 60000);

/** Variáveis embutidas da especificação (20.1.9.11) para um retângulo w×h. */
function builtins(w: number, h: number): Map<string, number> {
  const ss = Math.min(w, h), ls = Math.max(w, h);
  const v: [string, number][] = [
    ['l', 0], ['t', 0], ['r', w], ['b', h], ['w', w], ['h', h], ['hc', w / 2], ['vc', h / 2],
    ['ss', ss], ['ls', ls],
    ['cd2', 10800000], ['cd4', 5400000], ['cd8', 2700000], ['3cd4', 16200000], ['3cd8', 8100000],
    ['5cd8', 13500000], ['7cd8', 18900000],
  ];
  for (const d of [2, 3, 4, 5, 6, 8, 10, 12, 16, 32]) {
    v.push([`wd${d}`, w / d], [`hd${d}`, h / d], [`ssd${d}`, ss / d]);
  }
  return new Map(v);
}

function evalFormula(f: string[], val: (t: string) => number): number {
  const [op, a = '0', b = '0', c = '0'] = f;
  const x = (): number => val(a), y = (): number => val(b), z = (): number => val(c);
  switch (op) {
    case 'val': return x();
    case '*/': return (x() * y()) / (z() || 1);
    case '+-': return x() + y() - z();
    case '+/': return (x() + y()) / (z() || 1);
    case '?:': return x() > 0 ? y() : z();
    case 'abs': return Math.abs(x());
    case 'at2': return Math.atan2(y(), x()) / DEG;
    case 'cat2': return x() * Math.cos(Math.atan2(z(), y()));
    case 'sat2': return x() * Math.sin(Math.atan2(z(), y()));
    case 'cos': return x() * Math.cos(y() * DEG);
    case 'sin': return x() * Math.sin(y() * DEG);
    case 'tan': return x() * Math.tan(y() * DEG);
    case 'max': return Math.max(x(), y());
    case 'min': return Math.min(x(), y());
    case 'mod': return Math.sqrt(x() * x() + y() * y() + z() * z());
    case 'pin': { const lo = x(), v = y(), hi = z(); return v < lo ? lo : v > hi ? hi : v; }
    case 'sqrt': return Math.sqrt(Math.max(0, x()));
    default: return 0;
  }
}

/**
 * Guias de uma geometria PERSONALIZADA (`<a:custGeom>` com `avLst`/`gdLst` em
 * fórmulas — LibreOffice grava assim os presets): resolvedor de nome/número
 * para um retângulo w×h. Fórmula malformada vale 0 (não lança).
 */
export function customGuides(av: [string, string[]][], gd: [string, string[]][], w: number, h: number): (t: string) => number {
  const vars = builtins(w, h);
  const val = (t: string): number => {
    const v = vars.get(t);
    if (v !== undefined) return v;
    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
  };
  for (const [n, f] of av) vars.set(n, evalFormula(f, val));
  for (const [n, f] of gd) vars.set(n, evalFormula(f, val));
  return val;
}

/**
 * `arcTo` que continua do ponto (cx, cy): elipse rx×ry em que o ponto atual está
 * no ângulo stAng (1/60000°), varrendo swAng. Devolve o segmento e o ponto final.
 */
export function arcToSeg(cx: number, cy: number, rx: number, ry: number, stAng: number, swAng: number): { seg: PathSeg; x: number; y: number } | null {
  const st = stAng * DEG, sw = swAng * DEG;
  if (rx <= 0 || ry <= 0 || sw === 0) return null;
  const param = (a: number): number => Math.atan2(rx * Math.sin(a), ry * Math.cos(a));
  const p0 = param(st);
  let p1 = param(st + sw);
  if (Math.abs(sw) >= 2 * Math.PI - 1e-9) p1 = p0 + Math.sign(sw) * 2 * Math.PI;
  else if (sw > 0) { while (p1 <= p0) p1 += 2 * Math.PI; }
  else { while (p1 >= p0) p1 -= 2 * Math.PI; }
  const ecx = cx - rx * Math.cos(p0), ecy = cy - ry * Math.sin(p0);
  return { seg: { c: 'E', cx: ecx, cy: ecy, rx, ry, a0: p0, a1: p1, ccw: sw < 0 }, x: ecx + rx * Math.cos(p1), y: ecy + ry * Math.sin(p1) };
}

/** Geometria resolvida: subcaminhos + preenchimento (null = sem; número = deslocamento de luminância) + contorno. */
export interface PresetGeometry { subs: PathSeg[][]; fill: (number | null)[]; stroke: boolean[] }

/** Sombreado dos caminhos (`fill="darken"…`) como deslocamento de luminância. */
// medido (lo-cshapes, PowerPoint): darken = RGB×0,6, darkenLess = ×0,8, lighten = 40% rumo ao
// branco, lightenLess = 20% — negativo multiplica (1+v), positivo clareia v (ver shadeRgb)
const SHADE: Record<string, number | null> = { none: null, darken: -0.4, darkenLess: -0.2, lighten: 0.4, lightenLess: 0.2 };

/**
 * Caminhos do preset `name` num retângulo w×h (origem 0,0), com os ajustes da
 * forma (`adj`, por nome em `adjNames` ou na ordem do `avLst`). null = preset
 * sem definição.
 */
/** Guias do preset avaliadas num retângulo w×h, com os ajustes da forma. */
function presetVals(def: PresetDef, w: number, h: number, adj?: number[], adjNames?: string[]): (t: string) => number {
  const vars = builtins(w, h);
  const val = (t: string): number => {
    const v = vars.get(t);
    if (v !== undefined) return v;
    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
  };
  // ajustes: os da forma vencem os defaults do avLst (por nome; sem nome, na ordem)
  def.av.forEach(([n, f], i) => {
    let v: number | undefined;
    if (adj && adjNames) { const k = adjNames.indexOf(n); if (k >= 0) v = adj[k]; }
    else if (adj && i < adj.length) v = adj[i];
    vars.set(n, v ?? evalFormula(f, val));
  });
  for (const [n, f] of def.gd) vars.set(n, evalFormula(f, val));
  return val;
}

/**
 * Retângulo de TEXTO do preset (`<a:rect l t r b>` da definição oficial) num
 * retângulo w×h: o app quebra e ancora o texto dentro dele (elipse ≈ 70,7% da
 * caixa, triângulo na metade de baixo…). null = sem definição (caixa inteira).
 */
export function presetTextRect(name: string | undefined, w: number, h: number, adj?: number[], adjNames?: string[]): { l: number; t: number; r: number; b: number } | null {
  const def = name ? parseDef(name) : null;
  if (!def?.rect) return null;
  const val = presetVals(def, w, h, adj, adjNames);
  const [l, t, r, b] = def.rect.map(val) as [number, number, number, number];
  if (!(r > l) || !(b > t)) return null;
  return { l, t, r, b };
}

export function evalPreset(name: string, w: number, h: number, adj?: number[], adjNames?: string[]): PresetGeometry | null {
  const def = parseDef(name);
  if (!def) return null;
  const val = presetVals(def, w, h, adj, adjNames);

  const out: PresetGeometry = { subs: [], fill: [], stroke: [] };
  for (const p of def.paths) {
    // sistema de coordenadas próprio do caminho (w/h do <a:path>) → retângulo
    const sx = p.w ? w / p.w : 1, sy = p.h ? h / p.h : 1;
    const segs: PathSeg[] = [];
    let cx = 0, cy = 0;
    for (const c of p.cmds) {
      switch (c[0]) {
        case 'M': cx = val(c[1]!) * sx; cy = val(c[2]!) * sy; segs.push({ c: 'M', x: cx, y: cy }); break;
        case 'L': cx = val(c[1]!) * sx; cy = val(c[2]!) * sy; segs.push({ c: 'L', x: cx, y: cy }); break;
        case 'Q': {
          const x1 = val(c[1]!) * sx, y1 = val(c[2]!) * sy;
          cx = val(c[3]!) * sx; cy = val(c[4]!) * sy;
          segs.push({ c: 'Q', x1, y1, x: cx, y: cy });
          break;
        }
        case 'C': {
          const x1 = val(c[1]!) * sx, y1 = val(c[2]!) * sy, x2 = val(c[3]!) * sx, y2 = val(c[4]!) * sy;
          cx = val(c[5]!) * sx; cy = val(c[6]!) * sy;
          segs.push({ c: 'C', x1, y1, x2, y2, x: cx, y: cy });
          break;
        }
        case 'A': {
          // arco que CONTINUA do ponto atual: elipse wR×hR em que o ponto atual
          // está no ângulo stAng (ângulo visual → paramétrico), varrendo swAng
          const rx = val(c[1]!) * sx, ry = val(c[2]!) * sy;
          const st = val(c[3]!) * DEG, sw = val(c[4]!) * DEG;
          if (rx <= 0 || ry <= 0 || sw === 0) break;
          const param = (a: number): number => Math.atan2(rx * Math.sin(a), ry * Math.cos(a));
          const p0 = param(st);
          let p1 = param(st + sw);
          if (Math.abs(sw) >= 2 * Math.PI - 1e-9) p1 = p0 + Math.sign(sw) * 2 * Math.PI;
          else if (sw > 0) { while (p1 <= p0) p1 += 2 * Math.PI; }
          else { while (p1 >= p0) p1 -= 2 * Math.PI; }
          const ecx = cx - rx * Math.cos(p0), ecy = cy - ry * Math.sin(p0);
          segs.push({ c: 'E', cx: ecx, cy: ecy, rx, ry, a0: p0, a1: p1, ccw: sw < 0 });
          cx = ecx + rx * Math.cos(p1); cy = ecy + ry * Math.sin(p1);
          break;
        }
        case 'Z': segs.push({ c: 'Z' }); break;
      }
    }
    out.subs.push(segs);
    out.fill.push(p.fill in SHADE ? SHADE[p.fill]! : 0);
    out.stroke.push(p.stroke);
  }
  return out;
}

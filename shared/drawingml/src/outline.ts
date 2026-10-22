/**
 * Contorno de uma forma predefinida pelas definições OFICIAIS
 * (presetShapeDefinitions.xml) — para recortar imagem (Cortar para Forma), o
 * contorno da imagem e a silhueta dos efeitos. Ajustes pelo nome (a:gd).
 */
import { evalPreset } from './preset-engine.js';
import type { PathSeg } from './geometry.js';

export interface Outline {
  subs: PathSeg[][];
  /** subcaminho preenchido (false = só traço) */
  fill: boolean[];
  /** subcaminho traçado */
  stroke: boolean[];
}

const rect = (w: number, h: number): Outline => ({
  subs: [[{ c: 'M', x: 0, y: 0 }, { c: 'L', x: w, y: 0 }, { c: 'L', x: w, y: h }, { c: 'L', x: 0, y: h }, { c: 'Z' }]],
  fill: [true], stroke: [true],
});

/** Subcaminhos da forma `prst` no retângulo w×h (unidades do chamador). */
export function presetOutline(prst: string | undefined, w: number, h: number, adj?: Record<string, number>): Outline {
  if (!prst || prst === 'rect') return rect(w, h);
  const names = adj ? Object.keys(adj) : undefined;
  const g = evalPreset(prst, w, h, names?.map((n) => adj![n]!), names);
  if (!g || !g.subs.length) return rect(w, h);
  return { subs: g.subs, fill: g.fill.map((f) => f !== null), stroke: g.stroke };
}

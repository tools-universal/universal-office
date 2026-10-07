import { describe, expect, it } from 'vitest';
import { presetPath, type PathSeg } from '../src/index.js';

describe('presetPath — geometrias preset (spec 03 F)', () => {
  it('rect/ellipse/roundRect preservam o comportamento anterior', () => {
    expect(presetPath('rect', 100, 50)).toEqual({ kind: 'rect' });
    expect(presetPath(undefined, 100, 50)).toEqual({ kind: 'rect' });
    expect(presetPath('ellipse', 100, 50)).toEqual({ kind: 'ellipse' });
    expect(presetPath('roundRect', 100, 50)).toEqual({ kind: 'roundRect', r: 50 * 16667 / 100000 }); // default de spec (adj 16667)
    // nome fora da especificação cai em rect (fallback)
    expect(presetPath('naoExiste', 100, 50)).toEqual({ kind: 'rect' });
  });

  it('presets sem caso próprio saem das definições OFICIAIS (presetShapeDefinitions)', () => {
    const end = (segs: PathSeg[]): { x: number; y: number } => {
      // ponto final do último segmento com coordenadas
      for (let i = segs.length - 1; i >= 0; i--) {
        const s = segs[i]!;
        if (s.c === 'E') return { x: s.cx + s.rx * Math.cos(s.a1), y: s.cy + s.ry * Math.sin(s.a1) };
        if ('x' in s) return { x: s.x, y: s.y };
      }
      return { x: NaN, y: NaN };
    };
    // flowChartDelay: lado esquerdo reto, semielipse à direita
    const d = presetPath('flowChartDelay', 100, 60);
    expect(d.kind).toBe('path');
    if (d.kind !== 'path') return;
    const s = d.subs[0]!;
    expect(s[0]).toEqual({ c: 'M', x: 0, y: 0 });
    expect(s[1]).toEqual({ c: 'L', x: 50, y: 0 });
    const arc = s[2]!;
    expect(arc.c).toBe('E');
    if (arc.c === 'E') {
      [arc.cx, arc.cy, arc.rx, arc.ry].forEach((v, i) => expect(v).toBeCloseTo([50, 30, 50, 30][i]!, 9));
      expect(end([arc]).x).toBeCloseTo(50, 9);
      expect(end([arc]).y).toBeCloseTo(60, 9);
    }
    // flowChartConnector: elipse inteira (4 quartos de arco)
    const c = presetPath('flowChartConnector', 80, 40);
    expect(c.kind === 'path' && c.subs[0]!.filter((x) => x.c === 'E').length).toBe(4);
    // ajuste por NOME: round2SameRect com cantos de cima de 50%
    const r = presetPath('round2SameRect', 100, 40, [50000, 0], ['adj1', 'adj2']);
    expect(r.kind === 'path' && r.subs[0]![0]).toEqual({ c: 'M', x: 20, y: 0 });
    // caminho só de contorno (fill="none") não preenche
    const sort = presetPath('flowChartSort', 40, 40);
    expect(sort.kind === 'path' && sort.subLum?.includes(null)).toBe(true);
  });

  it('triângulos e diamante', () => {
    expect(presetPath('triangle', 100, 60)).toEqual({
      kind: 'poly', points: [{ x: 50, y: 0 }, { x: 100, y: 60 }, { x: 0, y: 60 }],
    });
    expect(presetPath('rtTriangle', 100, 60)).toEqual({
      kind: 'poly', points: [{ x: 0, y: 0 }, { x: 100, y: 60 }, { x: 0, y: 60 }],
    });
    expect(presetPath('diamond', 100, 60)).toEqual({
      kind: 'poly', points: [{ x: 50, y: 0 }, { x: 100, y: 30 }, { x: 50, y: 60 }, { x: 0, y: 30 }],
    });
  });

  it('parallelogram/trapezoid/hexagon usam adj default (ss/4)', () => {
    const par = presetPath('parallelogram', 200, 100);
    expect(par).toEqual({
      kind: 'poly',
      points: [{ x: 25, y: 0 }, { x: 200, y: 0 }, { x: 175, y: 100 }, { x: 0, y: 100 }],
    });
    const hex = presetPath('hexagon', 200, 100);
    expect(hex.kind).toBe('poly');
    if (hex.kind === 'poly') {
      expect(hex.points.length).toBe(6);
      expect(hex.points[5]).toEqual({ x: 0, y: 50 });
    }
  });

  it('pentagon: 5 vértices, ápice no topo', () => {
    const p = presetPath('pentagon', 100, 100);
    expect(p.kind).toBe('poly');
    if (p.kind === 'poly') {
      expect(p.points.length).toBe(5);
      expect(p.points[0]!.x).toBeCloseTo(50, 6);
      expect(p.points[0]!.y).toBeCloseTo(0, 6);
    }
  });

  it('star5: 10 vértices e ESCALADA ao bounding box (como o app de referência)', () => {
    const p = presetPath('star5', 100, 100);
    expect(p.kind).toBe('poly');
    if (p.kind === 'poly') {
      expect(p.points.length).toBe(10);
      // o app de referência preenche o rect: extremos tocam as 4 bordas
      const xs = p.points.map((q) => q.x);
      const ys = p.points.map((q) => q.y);
      expect(Math.min(...xs)).toBeCloseTo(0, 6);
      expect(Math.max(...xs)).toBeCloseTo(100, 6);
      expect(Math.min(...ys)).toBeCloseTo(0, 6);
      expect(Math.max(...ys)).toBeCloseTo(100, 6);
      // ponta de cima continua no meio do topo
      expect(p.points[0]!.y).toBeCloseTo(0, 6);
    }
  });

  it('setas: rightArrow com haste em h/4 e cabeça de ss/2', () => {
    const p = presetPath('rightArrow', 200, 100);
    expect(p).toEqual({
      kind: 'poly',
      points: [
        { x: 0, y: 25 }, { x: 150, y: 25 }, { x: 150, y: 0 }, { x: 200, y: 50 },
        { x: 150, y: 100 }, { x: 150, y: 75 }, { x: 0, y: 75 },
      ],
    });
    for (const g of ['leftArrow', 'upArrow', 'downArrow'] as const) {
      const a = presetPath(g, 200, 100);
      expect(a.kind).toBe('poly');
      if (a.kind === 'poly') expect(a.points.length).toBe(7);
    }
  });

  it('chevron com 6 vértices', () => {
    const p = presetPath('chevron', 200, 100);
    expect(p.kind).toBe('poly');
    if (p.kind === 'poly') {
      expect(p.points.length).toBe(6);
      expect(p.points[2]).toEqual({ x: 200, y: 50 });
      expect(p.points[5]).toEqual({ x: 50, y: 50 });
    }
  });

  it('pie e linhas puras', () => {
    expect(presetPath('pie', 100, 100)).toEqual({ kind: 'pie', startDeg: 0, endDeg: 270 });
    expect(presetPath('line', 100, 50)).toEqual({ kind: 'line', x1: 0, y1: 0, x2: 100, y2: 50 });
    expect(presetPath('straightConnector1', 100, 50)).toEqual({ kind: 'line', x1: 0, y1: 0, x2: 100, y2: 50 });
  });
});

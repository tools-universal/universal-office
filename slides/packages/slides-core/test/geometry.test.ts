import { describe, expect, it } from 'vitest';
import { presetPath } from '../src/index.js';

describe('presetPath — geometrias preset (spec 03 F)', () => {
  it('rect/ellipse/roundRect preservam o comportamento anterior', () => {
    expect(presetPath('rect', 100, 50)).toEqual({ kind: 'rect' });
    expect(presetPath(undefined, 100, 50)).toEqual({ kind: 'rect' });
    expect(presetPath('ellipse', 100, 50)).toEqual({ kind: 'ellipse' });
    expect(presetPath('roundRect', 100, 50)).toEqual({ kind: 'roundRect', r: 5 });
    // preset desconhecido cai em rect (fallback)
    expect(presetPath('teardrop', 100, 50)).toEqual({ kind: 'rect' });
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

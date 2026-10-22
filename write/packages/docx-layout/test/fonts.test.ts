/**
 * Substituição de fonte com SUBSTITUTA do hospedeiro (FontFace.standIn): o navegador
 * não tem "Arial Unicode MS" e o resolvedor de shared/fonts a troca pela Liberation
 * Sans (métricas da Arial, medido no PowerPoint). O Word, com a família ausente e o
 * fontTable dizendo charset 80, usa a Yu Gothic (oráculo altname) — e o motor no
 * Node, onde o provedor devolve null, já fazia isso. Varredura do editor no corpus
 * (2026-10-22): t20-cfecc1c7 e t15-3e9218f1 divergiam editor × motor por isso.
 */
import { describe, it, expect } from 'vitest';
import { FaceResolver, type FontFace, type FontProvider, type LayoutFont } from '../src/index.js';

const font = {} as LayoutFont;
/** provedor falso: `have` = famílias instaladas; `standIn` = ausentes trocadas pela substituta */
function provider(have: string[], standIn: Record<string, string> = {}): FontProvider & { asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    face(family, bold, italic): FontFace | null {
      asked.push(family);
      const sub = standIn[family.toLowerCase()];
      if (sub) return { key: `${family}|sub`, family, font, bold, italic, standIn: true };
      return have.some((h) => h.toLowerCase() === family.toLowerCase()) ? { key: family, family, font, bold, italic } : null;
    },
  };
}
const AUMS = { 'Arial Unicode MS': { charset: '80', family: 'swiss', panose1: '020B0604020202020204' } };

describe('FaceResolver: substituta do hospedeiro', () => {
  it('família ausente com charset do Leste Asiático: a fonte da escrita vence a substituta', () => {
    const p = provider(['Yu Gothic', 'Arial'], { 'arial unicode ms': 'Liberation Sans' });
    expect(new FaceResolver(p, AUMS).get('Arial Unicode MS', false, false).family).toBe('Yu Gothic');
  });

  it('igual ao provedor sem a família (motor no Node)', () => {
    const p = provider(['Yu Gothic', 'Arial']);
    expect(new FaceResolver(p, AUMS).get('Arial Unicode MS', false, false).family).toBe('Yu Gothic');
  });

  it('sem charset asiático: o mapeamento do Word (Arial Unicode MS → Arial) antes da substituta', () => {
    const p = provider(['Arial'], { 'arial unicode ms': 'Liberation Sans' });
    const f = new FaceResolver(p, {}).get('Arial Unicode MS', false, false);
    expect(f.family).toBe('Arial');
    expect(f.standIn).toBeUndefined();
  });

  it('nada mapeado instalado: fica a substituta métrico-compatível (não cai na cadeia genérica)', () => {
    const p = provider(['Times New Roman'], { calibri: 'Carlito' });
    const f = new FaceResolver(p, { Calibri: { family: 'swiss' } }).get('Calibri', false, false);
    expect(f).toMatchObject({ family: 'Calibri', standIn: true });
  });

  it('a escrita asiática e o mapeamento também só como substitutas: fica a da família pedida', () => {
    const p = provider(['Times New Roman'], { 'arial unicode ms': 'Liberation Sans', 'yu gothic': 'Liberation Sans', arial: 'Liberation Sans' });
    expect(new FaceResolver(p, AUMS).get('Arial Unicode MS', false, false)).toMatchObject({ family: 'Arial Unicode MS', standIn: true });
  });
});

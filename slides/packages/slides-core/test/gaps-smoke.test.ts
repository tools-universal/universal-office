import { describe, expect, it } from 'vitest';
import { PptxPackage, readPresentation, readSlide } from '../src/index.js';
// fixture sintética gerada em memória (mesmo código que grava samples/gaps-smoke.pptx)
// @ts-expect-error — script .mjs sem declaração de tipos
import { buildGapsSmoke } from '../../../tools/gen-gaps-smoke.mjs';

const bytes: Uint8Array = buildGapsSmoke();

describe('gaps-smoke.pptx — fixture sintética da spec 03', () => {
  const pkg = PptxPackage.load(bytes);
  const pres = readPresentation(pkg);
  const slide = readSlide(pkg, 'ppt/slides/slide1.xml');
  const byName = (n: string) => slide.shapes.find((s) => s.name === n)!;

  it('estrutura básica: 1 slide 16:9', () => {
    expect(pres.slides.length).toBe(1);
    expect(pres.slideW).toBe(9144000);
    // 5 shapes de topo + 1 filho do grupo achatado (o grupo em si não emite shape)
    expect(slide.shapes.length).toBe(6);
  });

  it('A: título herda sz/algn do titleStyle do master e cor do lstStyle do layout', () => {
    const title = byName('Titulo');
    const p = title.txBody!.paragraphs[0]!;
    const r = p.runs[0]!;
    expect(r.text).toBe('Titulo Herdado');
    expect(r.sz).toBe(44);                 // master titleStyle sz=4400
    expect(p.align).toBe('ctr');           // master titleStyle algn=ctr
    expect(r.color).toBe('#2E8B57');       // layout lstStyle accent2 SOBREPÕE tx1 do master
    expect(r.font).toBe('Trebuchet MS');   // +mj-lt -> fontScheme major
    expect(p.bullet).toBe(false);          // titleStyle buNone
  });

  it('A: body herda bullets/marL/indent/sz por nível do bodyStyle do master', () => {
    const body = byName('Corpo');
    const [p0, p1] = body.txBody!.paragraphs;
    // nível 0: • marL 342900 indent -342900 sz 28
    expect(p0!.bullet).toBe(true);
    expect(p0!.bulletChar).toBe('•');
    expect(p0!.marL).toBe(342900);
    expect(p0!.indent).toBe(-342900);
    expect(p0!.runs[0]!.sz).toBe(28);
    expect(p0!.runs[0]!.font).toBe('Verdana'); // +mn-lt -> fontScheme minor
    // nível 1: – marL 742950 sz 24
    expect(p1!.level).toBe(1);
    expect(p1!.bulletChar).toBe('–');
    expect(p1!.marL).toBe(742950);
    expect(p1!.runs[0]!.sz).toBe(24);
  });

  it('D (read): normAutofit fontScale/lnSpcReduction parseados', () => {
    const body = byName('Corpo');
    expect(body.txBody!.fontScale).toBeCloseTo(0.9, 5);
    expect(body.txBody!.lnSpcReduction).toBeCloseTo(0.1, 5);
  });

  it('C (regressão): shape rotacionada mantém rot=2700000 (45°)', () => {
    const rot = byName('Rotacionada');
    expect(rot.xfrm!.rot).toBe(2700000);
    expect(rot.fill!.color).toBe('#4472C4');
  });

  it('E: grupo com chOff/chExt achata coordenadas do filho (escala ×2)', () => {
    const child = byName('FilhoDoGrupo');
    expect(child).toBeDefined();
    // x' = 914400 + (228600 − 0) × (1828800/914400) = 1371600
    expect(child.xfrm).toEqual({ x: 1371600, y: 1143000, cx: 914400, cy: 457200 });
    expect(child.fill!.color).toBe('#2E8B57');
  });

  it('G: gradFill linear com 2 stops e ang 90°', () => {
    const g = byName('Gradiente');
    expect(g.fill!.type).toBe('gradient');
    expect(g.fill!.angleDeg).toBe(90);
    expect(g.fill!.stops).toEqual([
      { pos: 0, color: '#FFFFFF' },
      { pos: 1, color: '#4472C4' },
    ]);
  });

  it('B+F: star5 com <p:style> resolve fill/linha/texto via tema', () => {
    const star = byName('Estrela');
    expect(star.geom).toBe('star5');
    expect(star.fill).toEqual({ type: 'solid', color: '#FF6600' }); // fillRef accent1
    expect(star.lineColor).toBe('#2E8B57');                          // lnRef accent2
    const r = star.txBody!.paragraphs[0]!.runs[0]!;
    expect(r.color).toBe('#FEFEFE');                                 // fontRef lt1
    expect(r.font).toBe('Verdana');                                  // fontRef idx=minor
    expect(r.sz).toBe(18);                                           // otherStyle do master
  });

  it('round-trip: pacote sintético preserva partes byte a byte', () => {
    const reloaded = PptxPackage.load(pkg.save());
    expect(reloaded.partNames()).toEqual(pkg.partNames());
    for (const name of pkg.partNames()) {
      expect(reloaded.getPart(name)).toEqual(pkg.getPart(name));
    }
  });
});

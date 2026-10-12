/**
 * Hifenização automática (w:autoHyphenation) e hífen opcional — regras medidas no Word
 * (oráculos hyphlang, hyphzone, hyphfit, hyphmin, hyphshy, hyphmix). Usa só as fontes
 * abertas versionadas (Carlito): roda no CI.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DocxPackage, readFullDocument } from '@universal-office/docx-core';
import { SfntFont, loadHyphenation } from '@universal-office/layout';
import { layoutDocument, documentHyphenationLanguages, type FontFace, type FontProvider, type GlyphRunItem, type LayoutResult } from '../src/index.js';
// @ts-expect-error módulos JS das ferramentas do oráculo (sem tipos)
import { buildDocx, docDefaults, p, r } from '../../../tools/layout-oracle/docx-builder.mjs';
// @ts-expect-error idem
import { withHyphenation, shyRuns } from '../../../tools/layout-oracle/hyph-settings.mjs';

const FILES = join(__dirname, '..', '..', '..', '..', 'shared', 'fonts', 'files');
const font = new SfntFont(new Uint8Array(readFileSync(join(FILES, 'carlito-regular.ttf'))));
const bytes = new Uint8Array(readFileSync(join(FILES, 'carlito-regular.ttf')));
const provider: FontProvider = {
  // toda família (inclusive as de fallback de glifo) cai na Carlito
  face(family, bold, italic): FontFace | null {
    return { key: 'Carlito|r', family: 'Carlito', font, bytes, bold, italic, ...(bold ? { synthBold: true } : {}), ...(italic ? { synthItalic: true } : {}) };
  },
};
const W = (s: string): number => [...s].reduce((a, ch) => a + (font.advanceWidth(font.glyphId(ch.codePointAt(0)!)) * 11 * 20) / font.metrics.unitsPerEm, 0);
const TEXTW = 11906 - 2 * 1701;

await loadHyphenation(['pt', 'en-us', 'es']);

interface Opts { auto?: boolean; zone?: number; limit?: number; noCaps?: boolean; compat?: number }
const docOf = (body: string, o: Opts = {}) => {
  const docx = withHyphenation(buildDocx({ body, compat: o.compat ?? 15, defaults: docDefaults({ font: 'Carlito', size: 11 }) }), o);
  return readFullDocument(DocxPackage.load(docx));
};
const lay = (body: string, o: Opts = {}): LayoutResult => layoutDocument(docOf(body, o), provider);
/** texto de cada linha, sem os espaços (o hífen automático aparece como "-") */
const lines = (res: LayoutResult): string[] => {
  const out: string[] = [];
  for (const pg of res.pages) {
    const byY = new Map<number, string>();
    for (const it of pg.items) if (it.t === 'glyphs') byY.set(it.y, (byY.get(it.y) ?? '') + it.text);
    out.push(...[...byY.entries()].sort((a, b) => a[0] - b[0]).map(([, t]) => t.replace(/\s+/g, '')));
  }
  return out;
};
const para = (text: string, width: number, pPr = '', rPr = '') => p(r(text, rPr), `<w:spacing w:after="0"/>${pPr}<w:ind w:left="0" w:right="${Math.round(TEXTW - width)}"/>`);

describe('hifenização automática', () => {
  it('liga só com w:autoHyphenation; pontos dos padrões do idioma', () => {
    const body = para('12 responsabilidade fim', W('12 responsabilidade') - 200);
    expect(lines(lay(body, { auto: false }))).toEqual(['12', 'responsabilidade', 'fim']);
    expect(lines(lay(body))).toEqual(['12responsabili-', 'dadefim']);
  });

  it('modo 15: vão ≥ ~421 twips para hifenizar (a zona do documento não vale)', () => {
    const at = (gap: number, zone?: number) => lines(lay(para('12 filhotinho fim', W('12') + gap), { zone }))[0];
    expect(at(400)).toBe('12');
    expect(at(440)).toBe('12fi-');
    expect(at(440, 1440)).toBe('12fi-');
  });

  it('modos ≤ 14: início da palavra a ≥ zona da margem (sem zona: 425)', () => {
    const at = (rem: number, zone?: number) => lines(lay(para('12 filhotinho fim', W('12 ') + rem), { zone, compat: 14 }))[0];
    expect(at(410)).toBe('12');
    expect(at(440)).toBe('12fi-');
    expect(at(380, 360)).toBe('12fi-');
  });

  it('o pedaço cabe com o hífen; modo 15 exige 3 letras depois, os ≤ 14 duas', () => {
    const fit = (d: number) => lines(lay(para('12 responsabilidade fim', W('12 responsabili-') + d)))[0];
    expect(fit(-2)).toBe('12responsabi-');
    expect(fit(2)).toBe('12responsabili-');
    // (modo ≤ 14: também a letra seguinte ao ponto tem de caber)
    const tail = (compat: number) => lines(lay(para('12 responsabilidade fim', Math.max(W('12 responsabilida-'), W('12 responsabilidad')) + 5), { compat, zone: 1 }))[0];
    expect(tail(15)).toBe('12responsabili-');
    expect(tail(14)).toBe('12responsabilida-');
  });

  it('w:noProof, w:suppressAutoHyphens e w:doNotHyphenateCaps', () => {
    const w = W('12 responsabilidade') - 200;
    expect(lines(lay(para('12 responsabilidade fim', w, '', '<w:noProof/>')))[0]).toBe('12');
    expect(lines(lay(para('12 responsabilidade fim', w, '<w:suppressAutoHyphens/>')))[0]).toBe('12');
    const caps = (t: string, rPr = '') => lines(lay(para(`12 ${t} fim`, W(`12 ${t}`) - 200, '', rPr), { noCaps: true }))[0];
    expect(caps('RESPONSABILIDADE')).toBe('12');
    expect(caps('responsabilidade', '<w:caps/>')).toBe('12');
    expect(caps('Responsabilidade')).toBe('12Responsabili-');
  });

  it('trechos de letras: dígitos e hífen da palavra separam', () => {
    const w = W('12 respon2sabi') + 30;
    expect(lines(lay(para('12 respon2sabilidade fim', w)))[0]).toBe('12respon2sa-');
    expect(lines(lay(para('12 guarda-responsabilidade fim', W('12 guarda-respon-') + 5)))[0]).toBe('12guarda-respon-');
  });

  it('w:consecutiveHyphenLimit: no máximo N linhas seguidas com hífen automático', () => {
    const body = para('responsabilidade administração desenvolvimento extraordinariamente comunicação internacional', 2300);
    const hy = (ls: string[]) => ls.map((l) => (l.endsWith('-') ? 1 : 0)).join('');
    expect(hy(lines(lay(body)))).toMatch(/11/);
    expect(hy(lines(lay(body, { limit: 1 })))).not.toMatch(/11/);
  });

  it('hífen opcional: soma-se aos pontos automáticos, sem os mínimos', () => {
    const shy = (o: Opts) => lines(lay(p(r('12 ') + shyRuns('administraçã|o', '', r) + r(' fim'), `<w:spacing w:after="0"/><w:ind w:left="0" w:right="${Math.round(TEXTW - W('12 administraçã-') - 5)}"/>`), o))[0];
    expect(shy({})).toBe('12administraçã-');
    expect(shy({ auto: false })).toBe('12administraçã-');
  });

  it('idiomas do documento para pré-carregar os padrões', () => {
    const full = docOf(p(r('olá', '<w:lang w:val="es-MX"/>')) + p(r('hi', '<w:lang w:val="en-GB"/>')));
    expect(documentHyphenationLanguages(full).sort()).toEqual(['en-GB', 'es-MX', 'pt-BR']);
    expect(documentHyphenationLanguages(docOf(p(r('x')), { auto: false }))).toEqual([]);
  });
});

void (null as unknown as GlyphRunItem);

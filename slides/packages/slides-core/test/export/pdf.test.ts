import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pptxToPdf, type PdfFontSource } from '../../src/export/index.js';

const reference = (): Uint8Array => readFileSync(join(__dirname, '../../../../samples/reference.pptx'));
const showcase = (): Uint8Array => readFileSync(join(__dirname, '../../../../samples/showcase_animado.pptx'));
const gaps = (): Uint8Array => readFileSync(join(__dirname, '../../../../samples/gaps-smoke.pptx'));

// mesmas TTFs usadas pelo sheet-export (Aptos Narrow do demo do sheet). A Aptos
// Narrow é PROPRIETÁRIA e não fica no repositório (npm run fonts:sync a copia da
// máquina); num clone limpo (o CI) os testes usam a Liberation Sans, aberta e
// versionada — o gerador só precisa de um TrueType
const fontsDir = join(__dirname, '../../../../../sheet/packages/sheet/demo/fonts');
const face = existsSync(join(fontsDir, 'aptos-narrow-regular.ttf')) ? 'aptos-narrow' : 'liberationsans';
function fonts(): PdfFontSource[] {
  return [
    { bytes: readFileSync(join(fontsDir, `${face}-regular.ttf`)), name: 'AptosNarrow' },
    { bytes: readFileSync(join(fontsDir, `${face}-bold.ttf`)), bold: true, name: 'AptosNarrowBold' },
    { bytes: readFileSync(join(fontsDir, `${face}-italic.ttf`)), italic: true, name: 'AptosNarrowItalic' },
    { bytes: readFileSync(join(fontsDir, `${face}-bolditalic.ttf`)), bold: true, italic: true, name: 'AptosNarrowBoldItalic' },
  ];
}

/** Conta objetos de página (/Type /Page, sem contar /Type /Pages). */
function pageCount(pdf: Uint8Array): number {
  const txt = new TextDecoder('latin1').decode(pdf);
  return (txt.match(/\/Type \/Page[^s]/g) ?? []).length;
}

describe('pptxToPdf', () => {
  it('fonts é obrigatório: erro claro sem ele', () => {
    expect(() => pptxToPdf(reference())).toThrow(/fonts é obrigatório/);
    expect(() => pptxToPdf(reference(), { fonts: [] })).toThrow(/fonts é obrigatório/);
  });

  it('reference: %PDF, n páginas == n slides (3)', () => {
    const pdf = pptxToPdf(reference(), { fonts: fonts() });
    expect(new TextDecoder('latin1').decode(pdf.slice(0, 8)).startsWith('%PDF-1.')).toBe(true);
    expect(pdf.length).toBeGreaterThan(1024);
    expect(pageCount(pdf)).toBe(3);
  });

  it('gaps-smoke: 1 slide → 1 página, fonte embutida Type0 com subset', () => {
    const pdf = pptxToPdf(gaps(), { fonts: fonts() });
    expect(pageCount(pdf)).toBe(1);
    const txt = new TextDecoder('latin1').decode(pdf);
    expect(txt).toContain('/Subtype /Type0');
    expect(txt).toContain('/FontFile2');
  });

  it('showcase: 12 páginas, PNGs embutidos como XObject (com SMask p/ alpha)', () => {
    const pdf = pptxToPdf(showcase(), { fonts: fonts() });
    expect(pageCount(pdf)).toBe(12);
    const txt = new TextDecoder('latin1').decode(pdf);
    expect(txt).toContain('/Subtype /Image');
    // os PNGs do showcase têm canal alpha → SMask emitido pelo embedRgba
    expect(txt).toContain('/SMask');
  });
});

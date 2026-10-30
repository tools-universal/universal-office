/**
 * Campos de página no rodapé, como o Word 365 pt-BR os mostra no PDF (lab
 * numpages: capa + 3 páginas, w:titlePg na 1ª seção, w:pgNumType w:start="0"):
 * NUMPAGES conta a capa ("1 de 4"); SECTIONPAGES conta só a seção da página;
 * { = { NUMPAGES } - 1 } dá o total sem a capa ("3").
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DocxPackage, readFullDocument } from '@universal-office/docx-core';
import { SfntFont } from '../src/typography/index.js';
import { layoutDocument, evaluateFieldFormula, type FontProvider, type GlyphRunItem, type LayoutResult } from '../src/index.js';
// @ts-expect-error módulo JS das ferramentas do lab (sem tipos)
import { buildDocx, docDefaults, p, r, sectPr } from '../../../tools/layout-oracle/docx-builder.mjs';

const bytes = new Uint8Array(readFileSync(join(__dirname, '..', '..', '..', '..', 'shared', 'fonts', 'files', 'carlito-regular.ttf')));
const font = new SfntFont(bytes);
const provider: FontProvider = { face: (family, bold, italic) => ({ key: 'carlito', family, font, bytes, bold, italic }) };

const field = (instr: string, cached = '9'): string =>
  `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r>`
  + `<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>${cached}</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
/** { = { inner } op } — fórmula com um campo aninhado no código. */
const formula = (inner: string, op: string, cached = '9'): string =>
  `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> = </w:instrText></w:r>${field(inner)}`
  + `<w:r><w:instrText xml:space="preserve"> ${op} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>`
  + `<w:r><w:t>${cached}</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
const PB = p('<w:r><w:br w:type="page"/></w:r>');
const FOOTER = p(r('P=') + field('PAGE \\* Arabic \\* MERGEFORMAT') + r(' de N=') + field('NUMPAGES \\* Arabic \\* MERGEFORMAT')
  + r(' S=') + field('SECTIONPAGES \\* Arabic \\* MERGEFORMAT') + r(' C=') + formula('NUMPAGES \\* Arabic \\* MERGEFORMAT', '- 1')
  + r(' CS=') + formula('SECTIONPAGES', '- 1') + r(' END'));
const COVER_SECT = sectPr({ extra: '' }).replace('<w:cols', '<w:pgNumType w:start="0"/><w:titlePg/><w:cols');

const layout = (body: string, footer = FOOTER, sect = COVER_SECT): LayoutResult =>
  layoutDocument(readFullDocument(DocxPackage.load(buildDocx({ body, sect, defaults: docDefaults({ font: 'Carlito', size: 11 }), footers: { default: footer } }))), provider);

/** Texto sem espaços (o espaço não vira glifo). */
const ns = (s: string): string => s.replace(/ /g, '');
/** Texto do rodapé de cada página (os glifos da metade de baixo da página), sem espaços. */
const footerText = (res: LayoutResult): string[] => res.pages.map((pg) => pg.items
  .filter((i): i is GlyphRunItem => i.t === 'glyphs' && i.y > pg.heightTw / 2)
  .sort((a, b) => (a.glyphs[0]?.x ?? 0) - (b.glyphs[0]?.x ?? 0)).map((g) => g.text).join(''));

describe('campos de página com capa (lab numpages, Word 365)', () => {
  it('uma seção: a capa não tem rodapé, PAGE começa em 1 e NUMPAGES conta a capa', () => {
    const res = layout(p(r('CAPA')) + PB + p(r('Corpo 1')) + PB + p(r('Corpo 2')) + PB + p(r('Corpo 3')));
    expect(footerText(res)).toEqual([
      '',
      'P=1 de N=4 S=4 C=3 CS=3 END',
      'P=2 de N=4 S=4 C=3 CS=3 END',
      'P=3 de N=4 S=4 C=3 CS=3 END',
    ].map(ns));
  });

  it('capa em seção própria: SECTIONPAGES conta só a seção da página', () => {
    const cover = p(r('CAPA'), COVER_SECT.replace('<w:sectPr>', '<w:sectPr><w:footerReference w:type="default" r:id="rId_footer_default"/>'));
    const last = sectPr({ extra: '<w:type w:val="nextPage"/>' });
    const res = layout(cover + p(r('Corpo 1')) + PB + p(r('Corpo 2')) + PB + p(r('Corpo 3')), FOOTER, last);
    const texts = footerText(res);
    expect(texts.slice(1)).toEqual([
      'P=1 de N=4 S=3 C=3 CS=2 END',
      'P=2 de N=4 S=3 C=3 CS=2 END',
      'P=3 de N=4 S=3 C=3 CS=2 END',
    ].map(ns));
  });

  it('fórmula sem campo aninhado: recalculada no rodapé, cache no corpo (como o Word)', () => {
    const simple = (cached: string) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> = 2 + 2 </w:instrText></w:r>`
      + `<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>${cached}</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
    const body = p(r('B1=') + formula('NUMPAGES', '- 1') + r(' B2=') + simple('9') + r(' B3=') + field('NUMPAGES') + r(' FIM')) + PB + p(r('Dois'));
    const res = layout(body, p(r('F1=') + simple('9') + r(' END')), sectPr());
    const bodyText = res.pages[0]!.items.filter((i): i is GlyphRunItem => i.t === 'glyphs' && i.y < res.pages[0]!.heightTw / 2).map((g) => g.text).join('');
    expect(bodyText).toBe(ns('B1=1 B2=9 B3=2 FIM'));
    expect(footerText(res)).toEqual(['F1=4 END', 'F1=4 END'].map(ns));
  });
});

/** Folha de rosto da galeria: sdt de bloco com docPartGallery (padrão "Cover Pages"). */
const coverSdt = (inner: string, gallery = 'Cover Pages'): string =>
  `<w:sdt><w:sdtPr><w:id w:val="1"/><w:docPartObj><w:docPartGallery w:val="${gallery}"/><w:docPartUnique/></w:docPartObj></w:sdtPr>`
  + `<w:sdtContent>${inner}</w:sdtContent></w:sdt>`;
const COVER = coverSdt(p(r('CAPA') + '<w:r><w:br w:type="page"/></w:r>'));
const BODY3 = p(r('Corpo 1')) + PB + p(r('Corpo 2')) + PB + p(r('Corpo 3'));
const NO_START_SECT = sectPr({ extra: '' }).replace('<w:cols', '<w:titlePg/><w:cols');
/** Seção encerrada no parágrafo, com o rodapé (as seguintes herdam). */
const sectPara = (sect: string): string => p('', sect.replace('<w:sectPr>', '<w:sectPr><w:footerReference w:type="default" r:id="rId_footer_default"/>'));

describe('NUMPAGES com folha de rosto da galeria (etica.docx, Word 365)', () => {
  it('folha de rosto "Cover Pages" e start=0 na 1ª seção: NUMPAGES desconta a capa (e a fórmula também)', () => {
    expect(footerText(layout(COVER + BODY3))).toEqual([
      '',
      'P=1 de N=3 S=4 C=2 CS=3 END',
      'P=2 de N=3 S=4 C=2 CS=3 END',
      'P=3 de N=3 S=4 C=2 CS=3 END',
    ].map(ns));
  });

  it('outra galeria ("Quick Parts"): páginas físicas', () => {
    expect(footerText(layout(coverSdt(p(r('CAPA') + '<w:r><w:br w:type="page"/></w:r>'), 'Quick Parts') + BODY3)).slice(1))
      .toEqual(['P=1 de N=4 S=4 C=3 CS=3 END', 'P=2 de N=4 S=4 C=3 CS=3 END', 'P=3 de N=4 S=4 C=3 CS=3 END'].map(ns));
  });

  it('numeração sem start=0: páginas físicas', () => {
    expect(footerText(layout(COVER + BODY3, FOOTER, NO_START_SECT)).slice(1))
      .toEqual(['P=2 de N=4 S=4 C=3 CS=3 END', 'P=3 de N=4 S=4 C=3 CS=3 END', 'P=4 de N=4 S=4 C=3 CS=3 END'].map(ns));
  });

  it('capa fora da 1ª página: o desconto continua (uma página)', () => {
    const res = layout(p(r('Antes') + '<w:r><w:br w:type="page"/></w:r>') + COVER + BODY3);
    expect(footerText(res).slice(1)).toEqual([
      'P=1 de N=4 S=5 C=3 CS=4 END',
      'P=2 de N=4 S=5 C=3 CS=4 END',
      'P=3 de N=4 S=5 C=3 CS=4 END',
      'P=4 de N=4 S=5 C=3 CS=4 END',
    ].map(ns));
  });

  it('duas seções, a 2ª reiniciando em 1: NUMPAGES desconta a capa, SECTIONPAGES não', () => {
    const sec2 = sectPr({ extra: '<w:type w:val="nextPage"/>' }).replace('<w:cols', '<w:pgNumType w:start="1"/><w:cols');
    const res = layout(COVER + p(r('Corpo 1')) + sectPara(COVER_SECT) + p(r('Corpo 2')) + PB + p(r('Corpo 3')), FOOTER, sec2);
    expect(footerText(res)).toEqual([
      '',
      'P=1 de N=3 S=2 C=2 CS=1 END',
      'P=1 de N=3 S=2 C=2 CS=1 END',
      'P=2 de N=3 S=2 C=2 CS=1 END',
    ].map(ns));
  });

  it('start=0 só na 2ª seção (a que abre na capa): páginas físicas', () => {
    const first = NO_START_SECT.replace('<w:titlePg/>', '');
    const res = layout(p(r('Antes')) + sectPara(first) + COVER + BODY3);
    expect(footerText(res)).toEqual([
      'P=1 de N=5 S=1 C=4 CS=0 END',
      '',
      'P=1 de N=5 S=4 C=4 CS=3 END',
      'P=2 de N=5 S=4 C=4 CS=3 END',
      'P=3 de N=5 S=4 C=4 CS=3 END',
    ].map(ns));
  });
});

describe('evaluateFieldFormula (formatos medidos no Word pt-BR)', () => {
  const v = (n: string, page = '2', sec = '3') => (name: string): string | undefined =>
    name === 'NUMPAGES' ? n : name === 'PAGE' ? page : name === 'SECTIONPAGES' ? sec : undefined;
  it.each([
    ['= { NUMPAGES } - 1', '3'],
    ['= { NUMPAGES } -1', '3'],
    ['={ NUMPAGES }-1', '3'],
    ['= { NUMPAGES } / 3', '1,33'],
    ['= { PAGE } * 2 \\# "00"', '04'],
    ['= { NUMPAGES } - 1 \\* roman', 'iii'],
    ['= { NUMPAGES } - 1 \\* Arabic \\* MERGEFORMAT', '3'],
    ['= { SECTIONPAGES } * 10 + 0,5', '30,5'],
    ['= ({ NUMPAGES } + 2) * 2', '12'],
    ['= -{ PAGE } + 10', '8'],
    ['= { = { NUMPAGES } - 1 } * 2', '6'],
    ['= 2 + 2', '4'],
  ])('%s → %s', (code, want) => {
    expect(evaluateFieldFormula(code, v('4'))).toBe(want);
  });

  it.each([
    '= { NUMPAGES } / 0',
    '= SUM(ABOVE)',
    '= { NUMPAGES } - x',
    '= { AUTHOR } - 1',
    '= { NUMPAGES } -',
    '= ( { NUMPAGES } - 1',
    '= Math.max(1)',
  ])('fora do subconjunto seguro (%s) → mantém o cache', (code) => {
    expect(evaluateFieldFormula(code, v('4'))).toBeUndefined();
  });

  it('valor não numérico de campo aninhado (PAGE em romanos) → mantém o cache', () => {
    expect(evaluateFieldFormula('= { PAGE } - 1', v('4', 'iv'))).toBeUndefined();
  });
});

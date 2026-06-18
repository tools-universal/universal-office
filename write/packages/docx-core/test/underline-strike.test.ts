import { describe, expect, it } from 'vitest';
import { DocxPackage, readDocument, writeDocument, type DocumentModel } from '../src/index.js';

const blank = (): DocumentModel => ({
  paragraphs: [{ runs: [], props: {} }],
  sectPr: { pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417 },
});

describe('estilos de sublinhado e tachado duplo', () => {
  for (const style of ['double', 'dotted', 'dash', 'wave', 'thick'] as const) {
    it(`u=${style} serializa e relê`, () => {
      const m = blank();
      m.paragraphs[0]!.runs = [{ text: 'x', props: { underline: true, underlineStyle: style } as never }];
      const pkg = DocxPackage.empty();
      writeDocument(pkg, m);
      expect(pkg.documentXml()).toContain(`<w:u w:val="${style}"/>`);
      const re = readDocument(pkg);
      expect(re.paragraphs[0]!.runs[0]!.props.underlineStyle).toBe(style);
      expect(re.paragraphs[0]!.runs[0]!.props.underline).toBe(true);
    });
  }

  it('sublinhado colorido', () => {
    const m = blank();
    m.paragraphs[0]!.runs = [{ text: 'x', props: { underline: true, underlineStyle: 'wave', underlineColor: 'FF0000' } as never }];
    const pkg = DocxPackage.empty();
    writeDocument(pkg, m);
    expect(pkg.documentXml()).toContain('w:color="FF0000"');
    expect(readDocument(pkg).paragraphs[0]!.runs[0]!.props.underlineColor).toBe('FF0000');
  });

  it('w:dstrike (tachado duplo) round-trip', () => {
    const m = blank();
    m.paragraphs[0]!.runs = [{ text: 'x', props: { doubleStrike: true } as never }];
    const pkg = DocxPackage.empty();
    writeDocument(pkg, m);
    expect(pkg.documentXml()).toContain('<w:dstrike/>');
    expect(readDocument(pkg).paragraphs[0]!.runs[0]!.props.doubleStrike).toBe(true);
  });
});

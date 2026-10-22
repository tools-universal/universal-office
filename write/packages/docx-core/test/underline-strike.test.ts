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

describe('Página Inicial: os 17 sublinhados, cores do tema e Fonte › Avançado (home-lab)', () => {
  it('os 17 estilos do w:u relêem como estilo próprio', () => {
    const all = ['words', 'double', 'thick', 'dotted', 'dottedHeavy', 'dash', 'dashedHeavy', 'dashLong', 'dashLongHeavy', 'dotDash',
      'dashDotHeavy', 'dotDotDash', 'dashDotDotHeavy', 'wave', 'wavyHeavy', 'wavyDouble'] as const;
    const m = blank();
    m.paragraphs[0]!.runs = all.map((s) => ({ text: s, props: { underline: true, underlineStyle: s } as never }));
    const pkg = DocxPackage.empty();
    writeDocument(pkg, m);
    expect(readDocument(pkg).paragraphs[0]!.runs.map((r) => r.props.underlineStyle)).toEqual([...all]);
  });

  it('cor do tema no sublinhado e na fonte grava como o Word (w:themeColor/Tint/Shade)', () => {
    const m = blank();
    m.paragraphs[0]!.runs = [{ text: 'x', props: {
      underline: true, underlineColor: 'BF4F14', underlineTheme: { themeColor: 'accent2', shade: 'BF' },
      color: '156082', colorTheme: { themeColor: 'accent1' },
    } as never }];
    const pkg = DocxPackage.empty();
    writeDocument(pkg, m);
    const x = pkg.documentXml();
    expect(x).toContain('<w:color w:val="156082" w:themeColor="accent1"/>');
    expect(x).toContain('<w:u w:val="single" w:color="BF4F14" w:themeColor="accent2" w:themeShade="BF"/>');
    const p = readDocument(pkg).paragraphs[0]!.runs[0]!.props;
    expect(p.underlineTheme).toEqual({ themeColor: 'accent2', shade: 'BF' });
    expect(p.colorTheme).toEqual({ themeColor: 'accent1' });
  });

  it('oculto, escala, posição e kerning na ordem do CT_RPr e de volta', () => {
    const m = blank();
    m.paragraphs[0]!.runs = [{ text: 'x', props: { hidden: true, scalePct: 150, positionHalfPt: -6, kernHalfPt: 24, charSpacingTwips: -10 } as never }];
    const pkg = DocxPackage.empty();
    writeDocument(pkg, m);
    expect(pkg.documentXml()).toContain('<w:rPr><w:vanish/><w:spacing w:val="-10"/><w:w w:val="150"/><w:kern w:val="24"/><w:position w:val="-6"/></w:rPr>');
    const p = readDocument(pkg).paragraphs[0]!.runs[0]!.props;
    expect([p.hidden, p.scalePct, p.positionHalfPt, p.kernHalfPt]).toEqual([true, 150, -6, 24]);
  });

  it('bordas do parágrafo: entre parágrafos (w:between) e barra (w:bar sem w:space)', () => {
    const m = blank();
    const e = { style: 'single', sizeEighthPt: 4, spacePt: 1 };
    m.paragraphs[0]!.props = { borders: { between: e, bar: { ...e, spacePt: 0 } } } as never;
    m.paragraphs[0]!.runs = [{ text: 'x', props: {} as never }];
    const pkg = DocxPackage.empty();
    writeDocument(pkg, m);
    expect(pkg.documentXml()).toContain('<w:pBdr><w:between w:val="single" w:sz="4" w:space="1" w:color="auto"/><w:bar w:val="single" w:sz="4" w:color="auto"/></w:pBdr>');
    expect(Object.keys(readDocument(pkg).paragraphs[0]!.props.borders ?? {})).toEqual(['between', 'bar']);
  });
});

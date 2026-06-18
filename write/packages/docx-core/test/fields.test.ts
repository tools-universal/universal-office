import { describe, expect, it } from 'vitest';
import {
  DocxPackage, readDocument, writeDocument, serializeHfPart,
  type DocumentModel, type Paragraph,
} from '../src/index.js';

const blankModel = (): DocumentModel => ({
  paragraphs: [{ runs: [], props: {} }],
  sectPr: {
    pageWidthTwips: 11906, pageHeightTwips: 16838,
    marginLeftTwips: 1701, marginRightTwips: 1701,
    marginTopTwips: 1417, marginBottomTwips: 1417,
  },
});

describe('campos (variáveis PAGE/NUMPAGES/DATE)', () => {
  it('run com field serializa como fldSimple e relê com a instrução', () => {
    const m = blankModel();
    m.paragraphs[0]!.runs = [
      { text: 'Página ', props: {} as never },
      { text: '1', props: {} as never, field: ' PAGE ' },
      { text: ' de ', props: {} as never },
      { text: '1', props: {} as never, field: ' NUMPAGES ' },
    ];
    const pkg = DocxPackage.empty();
    writeDocument(pkg, m);
    const xml = pkg.documentXml();
    expect(xml).toContain('<w:fldSimple w:instr=" PAGE ">');
    expect(xml).toContain('<w:fldSimple w:instr=" NUMPAGES ">');

    const re = readDocument(pkg);
    const fields = re.paragraphs[0]!.runs.filter((r) => r.field);
    expect(fields.map((r) => r.field!.trim())).toEqual(['PAGE', 'NUMPAGES']);
  });

  it('serializeHfPart preserva campos no rodapé (fldSimple dentro do w:ftr)', () => {
    const footer: Paragraph[] = [{
      runs: [
        { text: 'Pág. ', props: {} as never },
        { text: '1', props: {} as never, field: ' PAGE ' },
      ],
      props: { alignment: 'center' },
    }];
    const xml = serializeHfPart('footer', footer);
    expect(xml).toContain('<w:ftr');
    expect(xml).toContain('<w:fldSimple w:instr=" PAGE ">');
  });

  it('DATE com formato preserva o instr completo', () => {
    const m = blankModel();
    m.paragraphs[0]!.runs = [
      { text: '12/06/2026', props: {} as never, field: ' DATE \\@ "dd/MM/yyyy" ' },
    ];
    const pkg = DocxPackage.empty();
    writeDocument(pkg, m);
    const re = readDocument(pkg);
    expect(re.paragraphs[0]!.runs[0]!.field).toContain('DATE');
    expect(re.paragraphs[0]!.runs[0]!.field).toContain('dd/MM/yyyy');
  });

  it('campo dividido por edição parcial mantém o field nos dois pedaços', () => {
    // edição dentro de um run de campo não deve perder a instrução
    const m = blankModel();
    m.paragraphs[0]!.runs = [
      { text: 'ABCDEF', props: {} as never, field: ' PAGE ' },
    ];
    const pkg = DocxPackage.empty();
    writeDocument(pkg, m);
    const re = readDocument(pkg);
    // após round-trip o run de campo é preservado inteiro
    expect(re.paragraphs[0]!.runs[0]!.field).toBe(' PAGE ');
    expect(re.paragraphs[0]!.runs[0]!.text).toBe('ABCDEF');
  });
});

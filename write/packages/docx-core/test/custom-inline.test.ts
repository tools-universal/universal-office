import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RUN_PROPS,
  DocxPackage,
  insertRun,
  readDocument,
  writeDocument,
  type DocumentModel,
} from '../src/index.js';

const blankModel = (): DocumentModel => ({
  paragraphs: [{ runs: [], props: {} }],
  sectPr: {
    pageWidthTwips: 11906,
    pageHeightTwips: 16838,
    marginLeftTwips: 1701,
    marginRightTwips: 1701,
    marginTopTwips: 1417,
    marginBottomTwips: 1417,
  },
});

describe('conteúdo inline de plugins', () => {
  it('serializa em w:sdt com fallback legível pelo Word e relê os metadados', () => {
    const model = blankModel();
    model.paragraphs[0]!.runs = [{
      text: '\uFFFC',
      props: { ...DEFAULT_RUN_PROPS, bold: true },
      custom: {
        type: 'mention',
        data: { id: '42', label: 'Ada Lovelace' },
        fallbackText: '@Ada Lovelace',
      },
    }];

    const pkg = DocxPackage.empty();
    writeDocument(pkg, model);
    const xml = pkg.documentXml();
    expect(xml).toContain('<w:sdt>');
    expect(xml).toContain('wordnext:inline:mention:');
    expect(xml).toContain('<w:t>@Ada Lovelace</w:t>');

    const roundTrip = readDocument(pkg).paragraphs[0]!.runs[0]!;
    expect(roundTrip.text).toBe('\uFFFC');
    expect(roundTrip.props.bold).toBe(true);
    expect(roundTrip.custom).toEqual({
      type: 'mention',
      data: { id: '42', label: 'Ada Lovelace' },
      fallbackText: '@Ada Lovelace',
    });
  });

  it('insertRun mantém o inline atômico separado de texto adjacente', () => {
    const model = blankModel();
    model.paragraphs[0]!.runs = [{
      text: 'Olá ',
      props: { ...DEFAULT_RUN_PROPS },
    }];
    const pos = insertRun(model, { para: 0, offset: 4 }, {
      text: '\uFFFC',
      props: { ...DEFAULT_RUN_PROPS },
      custom: { type: 'mention', data: { id: 7 }, fallbackText: '@Lin' },
    });

    expect(pos).toEqual({ para: 0, offset: 5 });
    expect(model.paragraphs[0]!.runs).toHaveLength(2);
    expect(model.paragraphs[0]!.runs[1]!.custom?.type).toBe('mention');
  });

  it('rejeita dados que não podem sobreviver ao round-trip JSON', () => {
    const model = blankModel();
    model.paragraphs[0]!.runs = [{
      text: '\uFFFC',
      props: { ...DEFAULT_RUN_PROPS },
      custom: { type: 'invalid', data: undefined, fallbackText: 'fallback' },
    }];
    expect(() => writeDocument(DocxPackage.empty(), model)).toThrow(/não são serializáveis/);
  });
});

import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  DocxPackage, readDocument, writeDocument,
  insertText, deleteRange, splitParagraph, mergeWithPrevious,
  applyRunProps, applyParaProps, paraText,
  type DocumentModel,
} from '../src/index.js';

const labDir = join(__dirname, '../../../tools/word-lab');
// o word-lab é ignorado pelo git (worktrees não o têm): os testes que leem dele pulam
const labDoc = join(labDir, 'results/001-type-text/after.docx');
const itLab = existsSync(labDoc) ? it : it.skip;

function blankModel(): DocumentModel {
  return {
    paragraphs: [{ runs: [], props: {} }],
    sectPr: {
      pageWidthTwips: 11906, pageHeightTwips: 16838,
      marginLeftTwips: 1701, marginRightTwips: 1701,
      marginTopTwips: 1417, marginBottomTwips: 1417,
    },
  };
}

describe('operações de edição (espelham FINDINGS do app de referência)', () => {
  it('digitar, formatar parcialmente (divide o run), Enter e Backspace', () => {
    const m = blankModel();
    insertText(m, { para: 0, offset: 0 }, 'Hello world');
    expect(paraText(m.paragraphs[0]!)).toBe('Hello world');

    // negrito em "world" → run dividido [002]
    applyRunProps(m, {
      start: { para: 0, offset: 6 }, end: { para: 0, offset: 11 },
    }, { bold: true });
    expect(m.paragraphs[0]!.runs.map((r) => [r.text, r.props.bold])).toEqual([
      ['Hello ', false], ['world', true],
    ]);

    // Enter após "Hello" [003]
    splitParagraph(m, { para: 0, offset: 5 });
    expect(paraText(m.paragraphs[0]!)).toBe('Hello');
    expect(paraText(m.paragraphs[1]!)).toBe(' world');
    expect(m.paragraphs[1]!.runs[1]!.props.bold).toBe(true);

    // Backspace na fronteira funde de volta [009]
    mergeWithPrevious(m, 1);
    expect(m.paragraphs.length).toBe(1);
    expect(paraText(m.paragraphs[0]!)).toBe('Hello world');
  });

  it('deleteRange dentro e através de parágrafos', () => {
    const m = blankModel();
    insertText(m, { para: 0, offset: 0 }, 'abcdef');
    deleteRange(m, { start: { para: 0, offset: 2 }, end: { para: 0, offset: 4 } });
    expect(paraText(m.paragraphs[0]!)).toBe('abef');

    splitParagraph(m, { para: 0, offset: 2 });
    insertText(m, { para: 1, offset: 2 }, 'XY');
    // "ab" / "efXY" → apaga de a(1) até X(3)
    deleteRange(m, { start: { para: 0, offset: 1 }, end: { para: 1, offset: 3 } });
    expect(m.paragraphs.length).toBe(1);
    expect(paraText(m.paragraphs[0]!)).toBe('aY');
  });

  itLab('round-trip de edição: ler docx do app de referência, editar, serializar, reler', () => {
    const src = join(labDir, 'results/001-type-text/after.docx');
    const pkg = DocxPackage.load(new Uint8Array(readFileSync(src)));
    const model = readDocument(pkg);
    expect(paraText(model.paragraphs[0]!)).toBe('Hello world');

    applyRunProps(model, {
      start: { para: 0, offset: 0 }, end: { para: 0, offset: 5 },
    }, { italic: true, color: 'FF0000' });
    applyParaProps(model, {
      start: { para: 0, offset: 0 }, end: { para: 0, offset: 0 },
    }, { alignment: 'center' });
    insertText(model, { para: 0, offset: 11 }, '!');

    writeDocument(pkg, model);
    const bytes = pkg.save();
    const model2 = readDocument(DocxPackage.load(bytes));
    expect(paraText(model2.paragraphs[0]!)).toBe('Hello world!');
    expect(model2.paragraphs[0]!.runs[0]!.props.italic).toBe(true);
    expect(model2.paragraphs[0]!.runs[0]!.props.color).toBe('FF0000');
    expect(model2.paragraphs[0]!.props.alignment).toBe('center');

    // grava para validação no app de referência (validate-edited.ps1)
    const outDir = join(labDir, 'results/edited');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'edited.docx'), bytes);
  });

  itLab('listas geram numbering.xml + rels + content-type', () => {
    const src = join(labDir, 'results/001-type-text/after.docx');
    const pkg = DocxPackage.load(new Uint8Array(readFileSync(src)));
    const model = readDocument(pkg);
    applyParaProps(model, {
      start: { para: 0, offset: 0 }, end: { para: 0, offset: 0 },
    }, {
      numbering: { kind: 'bullet', ilvl: 0 },
      indentLeftTwips: 720,
      shadingHex: 'FFF2CC',
      boxBorder: true,
      spaceBeforeTwips: 120,
    });
    writeDocument(pkg, model);
    expect(pkg.getPartText('word/numbering.xml')).toContain('abstractNum');
    expect(pkg.getPartText('word/_rels/document.xml.rels')).toContain('numbering.xml');
    expect(pkg.getPartText('[Content_Types].xml')).toContain('numbering+xml');
    expect(pkg.documentXml()).toContain('w:fill="FFF2CC"');
    expect(pkg.documentXml()).toContain('<w:pBdr>');

    const outDir = join(labDir, 'results/edited');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'formatted.docx'), pkg.save());
  });
});

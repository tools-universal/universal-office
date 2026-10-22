import { describe, expect, it } from 'vitest';
import { blankDocxPackage, readStyleIndex, type Block } from '@universal-office/docx-core';
import { effectiveNoteOptions, notePropsOf, ensureNoteStyles, flattenBlocks, markNoteRuns, NOTE_DEFAULTS } from './notes.js';
import { DocStyles } from './styles.js';
import { locateRef } from './engine-doc.js';

describe('notas no editor', () => {
  it('opções efetivas: seção sobre documento; local da nota de fim só do documento', () => {
    expect(effectiveNoteOptions('footnote', undefined, undefined)).toEqual(NOTE_DEFAULTS.footnote);
    expect(effectiveNoteOptions('endnote', undefined, undefined).numberFormat).toBe('lowerRoman');
    const o = effectiveNoteOptions('footnote', { numFmt: 'chicago', pos: 'beneathText' }, { numFmt: 'upperRoman', numStart: 3 }, 2);
    expect(o).toEqual({ position: 'beneathText', numberFormat: 'upperRoman', startAt: 3, restart: 'continuous', columns: 2 });
    expect(effectiveNoteOptions('endnote', { pos: 'sectEnd' }, { pos: 'docEnd' }).position).toBe('sectEnd');
  });

  it('NoteProps gravadas: só o que difere do padrão do Word', () => {
    expect(notePropsOf('footnote', NOTE_DEFAULTS.footnote, true)).toBeUndefined();
    expect(notePropsOf('endnote', { ...NOTE_DEFAULTS.endnote, numberFormat: 'decimal', startAt: 4 }, false)).toEqual({ numFmt: 'decimal', numStart: 4 });
    expect(notePropsOf('footnote', { ...NOTE_DEFAULTS.footnote, position: 'beneathText', restart: 'eachPage' }, true)).toEqual({ pos: 'beneathText', numRestart: 'eachPage' });
  });

  it('estilos de nota do Word pt-BR entram uma vez (os do documento valem pelo nome)', () => {
    const ds = new DocStyles(blankDocxPackage().getPartText('word/styles.xml') ?? null);
    const r = ensureNoteStyles(ds, 'footnote');
    expect(r).toMatchObject({ text: 'Textodenotaderodap', ref: 'Refdenotaderodap' });
    const ids = readStyleIndex(r.xml).styles.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['Textodenotaderodap', 'TextodenotaderodapChar', 'Refdenotaderodap']));
    ds.commit(r.xml);
    expect(ensureNoteStyles(ds, 'footnote').xml).toBe(r.xml);
  });

  it('referência e marca da nota ocupam um caractere no editor', () => {
    const blocks: Block[] = [{ type: 'paragraph', paragraph: { props: {}, runs: [
      { text: '', field: ' FOOTNOTEREF_MARK ', props: { bold: false, italic: false, underline: false, strike: false, allCaps: false, smallCaps: false } },
      { text: ' nota', props: { bold: false, italic: false, underline: false, strike: false, allCaps: false, smallCaps: false } },
    ] } }];
    const ps = flattenBlocks(blocks);
    markNoteRuns(ps);
    expect(ps[0]!.runs.map((r) => r.text.length)).toEqual([1, 5]);
  });

  it('linhas das notas no motor: fn<id>/… e en<id>/…', () => {
    expect(locateRef('fn3/b0', [])).toEqual({ kind: 'note', note: 'footnote', id: 3, path: ['b0'] });
    expect(locateRef('en12/b1/r0/c0/b0', [])).toEqual({ kind: 'note', note: 'endnote', id: 12, path: ['b1', 'r0', 'c0', 'b0'] });
  });
});

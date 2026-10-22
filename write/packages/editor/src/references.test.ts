import { describe, expect, it } from 'vitest';
import { DEFAULT_RUN_PROPS, type Paragraph } from '@universal-office/docx-core';
import {
  validBookmarkName, bookmarksIn, findBookmark, addBookmarkMarks, removeBookmarkMarks, textBetween, runsBetween, hiddenBookmarkName,
  crossRefInstr, crossRefKinds, refFieldTarget, captionRange, captionFields, seqLabel, parseTocInstr, tocInstr, tocEntryParagraphs, unlinkRuns,
} from './references.js';

const P = (...texts: string[]): Paragraph => ({ props: {}, runs: texts.map((text) => ({ text, props: { ...DEFAULT_RUN_PROPS } })) });

describe('indicadores (regras do Word — refs-lab bm-*)', () => {
  it('nomes: letra, depois letras/dígitos/_, até 40', () => {
    for (const ok of ['marca', 'Ação', 'abc1_2', 'º', 'A'.repeat(40)]) expect(validBookmarkName(ok)).toBe(true);
    for (const no of ['', '1abc', '_x', 'a-b', 'a b', 'Ab.c', 'B'.repeat(41)]) expect(validBookmarkName(no)).toBe(false);
  });

  it('marcas: o novo por dentro dos que já estão no ponto; de ponto, juntas; achar sem caixa; tirar', () => {
    const ps = [P('Alfa beta gama.'), P('Fim.')];
    addBookmarkMarks(ps, 'marca', 1, { para: 0, offset: 5 }, { para: 0, offset: 9 });
    addBookmarkMarks(ps, 'ponto', 2, { para: 1, offset: 0 }, { para: 1, offset: 0 });
    expect(bookmarksIn(ps).map((b) => [b.name, b.start, b.end])).toEqual([
      ['marca', { para: 0, offset: 5 }, { para: 0, offset: 9 }],
      ['ponto', { para: 1, offset: 0 }, { para: 1, offset: 0 }],
    ]);
    expect(findBookmark(ps, 'MARCA')?.id).toBe(1);
    expect(textBetween(ps, { para: 0, offset: 5 }, { para: 0, offset: 9 })).toBe('beta');
    expect(removeBookmarkMarks(ps, 'Marca')).toBe(true);
    expect(bookmarksIn(ps).map((b) => b.name)).toEqual(['ponto']);
  });

  it('REF copia a formatação direta do trecho (xr-b-text)', () => {
    const p: Paragraph = { props: {}, runs: [{ text: 'Destino', props: { ...DEFAULT_RUN_PROPS, bold: true, src: 3 } }, { text: ' marcado', props: { ...DEFAULT_RUN_PROPS } }] };
    expect(runsBetween(p, 0, 15).map((r) => [r.text, r.props.bold, r.props.src])).toEqual([['Destino', true, undefined], [' marcado', false, undefined]]);
  });

  it('_Ref/_Toc: 9 dígitos sequenciais, pulando os usados', () => {
    const seed = { n: 243527863 };
    expect(hiddenBookmarkName('_Ref', (n) => n === '_Ref243527863', seed)).toBe('_Ref243527864');
    expect(hiddenBookmarkName('_Toc', () => false, seed)).toBe('_Toc243527865');
  });
});

describe('referência cruzada (xr-*)', () => {
  it('instruções como o Word grava', () => {
    expect(crossRefInstr('_Ref1', 'text')).toBe(' REF _Ref1 \\h ');
    expect(crossRefInstr('_Ref1', 'text', { hyperlink: false })).toBe(' REF _Ref1 ');
    expect(crossRefInstr('_Ref1', 'page')).toBe(' PAGEREF _Ref1 \\h ');
    expect(crossRefInstr('_Ref1', 'number')).toBe(' REF _Ref1 \\r \\h ');
    expect(crossRefInstr('_Ref1', 'numberFullContext', { separator: '-' })).toBe(' REF _Ref1 \\w \\h \\d "-" ');
    expect(crossRefInstr('_Ref1', 'position')).toBe(' REF _Ref1 \\p \\h ');
    expect(crossRefInstr('_Ref1', 'noteNumberFormatted')).toBe(' NOTEREF _Ref1 \\f \\h ');
    expect(refFieldTarget(' NOTEREF _Ref1 \\f \\h ')).toBe('_Ref1');
    expect(crossRefKinds('caption')).toEqual(['captionEntire', 'captionLabel', 'captionText', 'page', 'position']);
  });

  it('trechos da legenda: inteira, rótulo e número, só o texto (pula 1 caractere)', () => {
    // "Figura 1 - Grafico": o SEQ termina em 8
    expect(captionRange('captionEntire', 18, 8)).toEqual([0, 18]);
    expect(captionRange('captionLabel', 18, 8)).toEqual([0, 8]);
    expect(captionRange('captionText', 18, 8)).toEqual([9, 18]);
  });
});

describe('legendas (cap-*)', () => {
  it('SEQ e capítulo por STYLEREF \\s', () => {
    expect(captionFields('Figura', { format: 'ARABIC' })).toEqual({ seq: ' SEQ Figura \\* ARABIC ' });
    expect(captionFields('Figura', { format: 'roman', chapter: { level: 1, separator: 'hyphen' } })).toEqual({ chapter: ' STYLEREF 1 \\s ', seq: ' SEQ Figura \\* roman \\s 1 ' });
    expect(seqLabel(' SEQ Equação \\* ARABIC ')).toBe('Equação');
    expect(seqLabel(' REF x ')).toBe('');
  });
});

describe('motor de TOC (tof-*, toc-*)', () => {
  it('instrução: ler e gravar na ordem do Word', () => {
    expect(tocInstr(parseTocInstr(' TOC \\h \\z \\c "Figura" '))).toBe(' TOC \\h \\z \\c "Figura" ');
    expect(tocInstr(parseTocInstr(' TOC \\o "1-3" \\h \\z \\u '))).toBe(' TOC \\o "1-3" \\h \\z \\u ');
    expect(tocInstr(parseTocInstr(' TOC \\n \\h \\z \\a "Tabela" '))).toBe(' TOC \\n \\h \\z \\a "Tabela" ');
    expect(tocInstr(parseTocInstr(' TOC \\p " " \\h \\z \\c "Figura" '))).toBe(' TOC \\p " " \\h \\z \\c "Figura" ');
    expect(parseTocInstr(' TOC \\o "2-4" ')).toEqual({ outline: [2, 4] });
  });

  it('entradas: estilo, tabulação direita pontilhada, hiperlink, PAGEREF com noProof/webHidden', () => {
    const [e] = tocEntryParagraphs({ hyperlinks: true, hideInWeb: true, caption: 'Figura' }, [{ level: 1, text: 'Figura 1 - Foto', page: '3', bookmark: '_Toc1' }],
      { styleFor: () => 'ndicedeilustraes', hyperlinkStyle: 'Hyperlink', tabPos: 8494, leader: 'dot' });
    expect(e!.props).toEqual({ styleId: 'ndicedeilustraes', tabStops: [{ posTwips: 8494, align: 'right', leader: 'dot' }] });
    expect(e!.runs.map((r) => [r.text, r.props.link, r.props.charStyle, r.props.noProof, r.props.webHidden, r.field])).toEqual([
      ['Figura 1 - Foto', '#_Toc1', 'Hyperlink', true, undefined, undefined],
      ['\t', '#_Toc1', undefined, true, true, undefined],
      ['3', '#_Toc1', undefined, true, true, ' PAGEREF _Toc1 \\h '],
    ]);
    const [n] = tocEntryParagraphs({ noPageNumbers: true }, [{ level: 2, text: 'Um', number: '1.1', page: '1', bookmark: '_Toc2' }],
      { styleFor: (l) => `Sumrio${l}`, hyperlinkStyle: '', tabPos: 9350 });
    expect(n!.props.styleId).toBe('Sumrio2');
    expect(n!.runs.map((r) => r.text)).toEqual(['1.1', '\t', 'Um']);
  });
});

describe('hiperlink', () => {
  it('remover tira o link, a dica e o estilo Hyperlink (hl-remove)', () => {
    const p: Paragraph = { props: {}, runs: [{ text: 'Alfa beta', props: { ...DEFAULT_RUN_PROPS, link: 'https://x', linkTip: 'dica', charStyle: 'Hyperlink' } }] };
    unlinkRuns(p, 0, 4, 'Hyperlink');
    expect(p.runs.map((r) => [r.text, r.props.link, r.props.charStyle])).toEqual([['Alfa', undefined, undefined], [' beta', 'https://x', 'Hyperlink']]);
  });
});

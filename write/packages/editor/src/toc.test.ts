import { describe, expect, it } from 'vitest';
import { DEFAULT_RUN_PROPS } from '@universal-office/docx-core';
import { parseTocInstr, tocInstr, tocEntryParagraphs } from './references.js';
import {
  tocFormatStyle, parseTcInstr, tcInstr, tcInToc, tocOptionsFrom, dialogOptionsFrom, addTextPlan, tocSdtPr, TOC_TEMPLATES, manualPlaceholder,
} from './toc.js';

describe('campo TOC: \\f, \\l e \\n com intervalo (oráculo toc-lab)', () => {
  it('lê e grava na ordem do Word', () => {
    const cases = [
      ' TOC \\o "1-3" \\f \\h \\z \\u ',
      ' TOC \\f x \\h \\z ',
      ' TOC \\f \\l "1-2" \\h \\z ',
      ' TOC \\o "1-3" \\n "2-3" \\h \\z \\u ',
      ' TOC \\o "1-3" \\n \\h \\z \\u ',
      ' TOC \\o "1-3" \\p " " \\h \\z \\u ',
      ' TOC \\o "1-3" \\h \\z \\t "Título;1;Subtítulo;2" ',
    ];
    for (const c of cases) expect(tocInstr(parseTocInstr(c))).toBe(c);
    expect(parseTocInstr(' TOC \\f x \\h \\z ')).toMatchObject({ fields: true, fieldId: 'x', hyperlinks: true });
    expect(parseTocInstr(' TOC \\o "1-3" \\n "2-3" \\h ')).toMatchObject({ noPageLevels: [2, 3] });
    expect(parseTocInstr(' TOC \\o "1-3" \\n "2-3" \\h ').noPageNumbers).toBeUndefined();
  });

  it('entrada sem número de página: TC \\n e níveis do \\n "a-b" (toc-tc-n, toc-n-range)', () => {
    const look = { styleFor: (l: number) => `Sumrio${l}`, hyperlinkStyle: 'Hyperlink', tabPos: 8494, leader: 'dot' as const };
    const o = parseTocInstr(' TOC \\o "1-3" \\n "2-3" \\h \\z \\u ');
    const ps = tocEntryParagraphs(o, [
      { level: 1, text: 'Um', page: '1', bookmark: '_Toc1' },
      { level: 2, text: 'Um ponto um', page: '1', bookmark: '_Toc2' },
      { level: 1, text: 'TC', page: '1', bookmark: '_Toc3', noPage: true },
    ], look);
    expect(ps.map((p) => p.runs.map((r) => r.text).join(''))).toEqual(['Um\t1', 'Um ponto um', 'TC']);
  });
});

describe('campos TC (oráculo tc-mark, toc-fields)', () => {
  it('Marcar Entrada grava \\f C e o nível entre aspas; lê de volta', () => {
    expect(tcInstr({ text: 'Entrada TC', level: 2 })).toBe(' TC "Entrada TC" \\f C \\l "2" ');
    expect(tcInstr({ text: 'Diz "oi"', id: 'x' })).toBe(' TC "Diz \\"oi\\"" \\f x \\l "1" ');
    expect(parseTcInstr(' TC "Entrada TC" \\f C \\l "2" ')).toEqual({ text: 'Entrada TC', id: 'C', level: 2, noPage: false });
    expect(parseTcInstr(' TC "Sem pagina" \\n \\l 1 ')).toEqual({ text: 'Sem pagina', id: 'C', level: 1, noPage: true });
    expect(parseTcInstr(' TC "Diz \\"oi\\"" \\f x ')?.text).toBe('Diz "oi"');
    expect(parseTcInstr(' PAGEREF x ')).toBeNull();
  });

  it('\\f sem id = os TC de C; \\f x = só os de x; \\l filtra os níveis', () => {
    const c = parseTcInstr(' TC "a" \\f C \\l "2" ')!, x = parseTcInstr(' TC "b" \\f x \\l "1" ')!, none = parseTcInstr(' TC "c" \\l 3 ')!;
    const all = parseTocInstr(' TOC \\o "1-3" \\f \\h ');
    expect([tcInToc(all, c), tcInToc(all, x), tcInToc(all, none)]).toEqual([true, false, true]);
    expect(tcInToc(parseTocInstr(' TOC \\f x '), x)).toBe(true);
    expect(tcInToc(parseTocInstr(' TOC \\f \\l "1-2" '), none)).toBe(false);
    expect(tcInToc(parseTocInstr(' TOC \\o "1-3" '), c)).toBe(false);
  });
});

describe('diálogo Sumário Personalizado', () => {
  it('padrão = \\o "1-3" \\h \\z \\u (toc-add-def); opções do Word', () => {
    expect(tocInstr(tocOptionsFrom({}))).toBe(' TOC \\o "1-3" \\h \\z \\u ');
    expect(tocInstr(tocOptionsFrom({ pageNumbers: false }))).toBe(' TOC \\o "1-3" \\n \\h \\z \\u ');
    expect(tocInstr(tocOptionsFrom({ rightAlign: false }))).toBe(' TOC \\o "1-3" \\p " " \\h \\z \\u ');
    expect(tocInstr(tocOptionsFrom({ hyperlinks: false }))).toBe(' TOC \\o "1-3" \\z \\u ');
    expect(tocInstr(tocOptionsFrom({ levels: 5 }))).toBe(' TOC \\o "1-5" \\h \\z \\u ');
    expect(tocInstr(tocOptionsFrom({ fields: true }))).toBe(' TOC \\o "1-3" \\f \\h \\z \\u ');
    expect(tocInstr(tocOptionsFrom({ outlineLevels: false, styles: [{ style: 'Título', level: 1 }] }))).toBe(' TOC \\o "1-3" \\h \\z \\t "Título;1" ');
    expect(tocInstr(tocOptionsFrom({ useStyles: false, fields: true, fieldId: 'x', outlineLevels: false }))).toBe(' TOC \\f x \\h \\z ');
    expect(dialogOptionsFrom(parseTocInstr(' TOC \\o "1-2" \\n \\z \\u '))).toMatchObject({ pageNumbers: false, hyperlinks: false, levels: 2, outlineLevels: true });
  });

  it('formatos: os estilos toc N medidos (toc-format0–6)', () => {
    expect(tocFormatStyle('template', 1)).toEqual({ pPr: '<w:spacing w:after="100"/>', rPr: '' });
    expect(tocFormatStyle('template', 3).pPr).toBe('<w:spacing w:after="100"/><w:ind w:left="440"/>');
    expect(tocFormatStyle('classic', 1).rPr).toBe('<w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi"/><w:b/><w:bCs/><w:caps/><w:sz w:val="24"/><w:szCs w:val="24"/>');
    expect(tocFormatStyle('classic', 4).pPr).toBe('<w:spacing w:after="0"/><w:ind w:left="440"/>');
    expect(tocFormatStyle('modern', 3).pPr).toBe('<w:pBdr><w:between w:val="double" w:sz="6" w:space="0" w:color="auto"/></w:pBdr><w:spacing w:before="120" w:after="120"/><w:ind w:left="220"/><w:jc w:val="center"/>');
    expect(tocFormatStyle('fancy', 6)).toEqual({ pPr: '<w:spacing w:after="0"/>', rPr: '' });
    expect(tocFormatStyle('formal', 9).rPr).toBe('<w:sz w:val="18"/><w:szCs w:val="18"/>');
    expect(tocFormatStyle('simple', 2).pPr).toBe('<w:spacing w:before="120" w:after="0"/><w:ind w:left="220"/>');
  });
});

describe('galeria e Adicionar Texto', () => {
  it('controle do sumário e modelos', () => {
    expect(tocSdtPr(5)).toBe('<w:sdtPr><w:id w:val="5"/><w:docPartObj><w:docPartGallery w:val="Table of Contents"/><w:docPartUnique/></w:docPartObj></w:sdtPr>');
    expect(TOC_TEMPLATES.map((t) => t.id)).toEqual(['auto1', 'auto2', 'manual']);
    expect(manualPlaceholder('pt', 2)).toBe('Digite o título do capítulo (nível 2)');
  });

  it('Nível N: Título N em Normal/título; outro estilo, só o nível de tópico', () => {
    expect(addTextPlan(2, 'normal')).toEqual({ heading: 2 });
    expect(addTextPlan(1, 'heading')).toEqual({ heading: 1 });
    expect(addTextPlan(3, 'other')).toEqual({ outline: 3 });
    expect(addTextPlan(0, 'heading')).toEqual({ normal: true });
    expect(addTextPlan(0, 'other')).toEqual({ outline: null });
    void DEFAULT_RUN_PROPS;
  });
});

// Textos dos balões de formatação = Revision.FormatDescription do Word 365 pt-BR
// (write/tools/revisions-oracle/format-descriptions.ps1, medido em 2026-10-21).
import { describe, expect, it } from 'vitest';
import { DEFAULT_RUN_PROPS, type ParaProps, type RevisionSpan, type RunProps } from '@universal-office/docx-core';
import { formatDescription } from './revisions.js';

const run = (now: Partial<RunProps>, old: Partial<RunProps> = {}): RevisionSpan =>
  ({ kind: 'format', author: 'A', para: 0, start: 0, end: 1, text: 'x', old: { ...DEFAULT_RUN_PROPS, ...old }, now: { ...DEFAULT_RUN_PROPS, ...now } });
const para = (now: ParaProps, old: ParaProps = {}): RevisionSpan =>
  ({ kind: 'paraFormat', author: 'A', para: 0, start: 0, end: 1, text: 'x', old, now });

describe('descrição da formatação (Word pt-BR)', () => {
  const cases: [string, RevisionSpan, string][] = [
    ['bold', run({ bold: true }), 'Formatado: Fonte: Negrito'],
    ['unbold', run({ bold: false }, { bold: true }), 'Formatado: Fonte: Não Negrito'],
    ['italic', run({ italic: true }), 'Formatado: Fonte: Itálico'],
    ['bold-italic', run({ bold: true, italic: true }), 'Formatado: Fonte: Negrito, Itálico'],
    ['underline', run({ underline: true }), 'Formatado: Sublinhado'],
    ['strike', run({ strike: true }), 'Formatado: Tachado'],
    ['dstrike', run({ doubleStrike: true }), 'Formatado: Tachado duplo'],
    ['super', run({ vertAlign: 'superscript' }), 'Formatado: Sobrescrito'],
    ['sub', run({ vertAlign: 'subscript' }), 'Formatado: Subscrito'],
    ['caps', run({ allCaps: true }), 'Formatado: Todas em Maiúsculas'],
    ['smallcaps', run({ smallCaps: true }), 'Formatado: Versalete'],
    ['size', run({ szHalfPt: 32 }), 'Formatado: Fonte: 16 pt'],
    ['size-half', run({ szHalfPt: 21 }), 'Formatado: Fonte: 10,5 pt'],
    ['font', run({ fontAscii: 'Arial' }), 'Formatado: Fonte: (Padrão) Arial'],
    ['color-red', run({ color: 'FF0000' }), 'Formatado: Cor da fonte: Vermelho'],
    ['color-hex', run({ color: '996633' }), 'Formatado: Cor da fonte: Cor Personalizada(RGB(153;102;51))'],
    ['highlight', run({ highlight: 'yellow' }), 'Formatado: Realce'],
    ['spacing', run({ charSpacingTwips: 40 }), 'Formatado: Expandido por  2 pt'],
    ['center', para({ alignment: 'center' }), 'Formatado: Centralizado'],
    ['right', para({ alignment: 'right' }), 'Formatado: À direita'],
    ['justify', para({ alignment: 'both' }), 'Formatado: Justificado'],
    ['left-from-c', para({}, { alignment: 'center' }), 'Formatado: À esquerda'],
    ['indent-left', para({ indentLeftTwips: 720 }), 'Formatado: Recuo: À esquerda:  1,27 cm'],
    ['indent-right', para({ indentRightTwips: 720 }), 'Formatado: À direita:  1,27 cm'],
    ['first-line', para({ indentFirstLineTwips: 708 }), 'Formatado: Recuo: Primeira linha:  1,25 cm'],
    ['hanging', para({ indentLeftTwips: 0, indentFirstLineTwips: -708 }), 'Formatado: Recuo: À esquerda:  0 cm, Deslocamento:  1,25 cm'],
    ['space-after', para({ spaceAfterTwips: 480 }), 'Formatado: Espaço Depois de:  24 pt'],
    ['space-before', para({ spaceBeforeTwips: 240 }), 'Formatado: Espaço Antes:  12 pt'],
    ['line-1.5', para({ lineTwentieths: 360 }), 'Formatado: Espaçamento entre linhas:  1,5 linhas'],
    ['line-double', para({ lineTwentieths: 480 }), 'Formatado: Espaçamento entre linhas:  Duplo'],
    ['center-ind', para({ alignment: 'center', indentLeftTwips: 720 }), 'Formatado: Centralizado, Recuo: À esquerda:  1,27 cm'],
  ];
  for (const [name, span, want] of cases) it(name, () => expect(formatDescription(span, 'pt')).toBe(want));

  it('estilo pelo nome', () => {
    expect(formatDescription(para({ styleId: 'Ttulo1' }), 'pt', (id) => (id === 'Ttulo1' ? 'Título 1' : id))).toBe('Formatado: Título 1');
  });

  it('em inglês', () => {
    expect(formatDescription(run({ bold: true, italic: true }), 'en')).toBe('Formatted: Font: Bold, Italic');
    expect(formatDescription(para({ alignment: 'center' }), 'en')).toBe('Formatted: Centered');
  });

  it('inserção/exclusão não têm descrição', () => {
    expect(formatDescription({ kind: 'insert', author: 'A', para: 0, start: 0, end: 1, text: 'x' }, 'pt')).toBe('');
  });
});

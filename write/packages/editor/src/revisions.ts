// Controle de alterações no <universal-write>: tipos da API pública e textos
// dos balões / do Painel de Revisão. As regras de edição e de aceitar/rejeitar
// moram no docx-core (revisions.ts); a exibição, no docx-layout.
import type { ParaProps, RevisionSpan, RunProps } from '@universal-office/docx-core';

/** Exibir para Revisão: Marcação Simples, Todas as Marcações, Sem Marcação, Original. */
export type MarkupMode = 'simple' | 'all' | 'none' | 'original';

/** Mostrar Marcação. */
export interface MarkupOptions {
  /** Inserções e Exclusões */
  insertionsDeletions: boolean;
  /** Formatação */
  formatting: boolean;
  /** Comentários */
  comments: boolean;
  /** Balões: revisões nos balões / tudo embutido / só comentários e formatação nos balões */
  balloons: 'revisions' | 'inline' | 'mixed';
  /** Pessoas Específicas: só a marcação destes autores (null = todos) */
  authors: string[] | null;
}

export const DEFAULT_MARKUP: MarkupOptions = {
  insertionsDeletions: true, formatting: true, comments: true, balloons: 'mixed', authors: null,
};

/** Uma revisão, como a API devolve (getRevisions). */
export interface WriteRevision {
  kind: RevisionSpan['kind'];
  author: string;
  /** w:date como no arquivo (hora local com Z) */
  date?: string;
  /** o instante real (w16du:dateUtc), quando houver */
  dateUtc?: string;
  move?: boolean;
  /** marca de parágrafo inserida/excluída */
  mark?: boolean;
  /** texto inserido/excluído (formatação: o texto formatado) */
  text: string;
  /** descrição da formatação ("Formatado: Fonte: Negrito") */
  description?: string;
  /** onde está: corpo, tabela, cabeçalho ou rodapé */
  story: 'body' | 'table' | 'header' | 'footer';
  /** cor da marcação deste autor (RRGGBB) */
  color: string;
}

type Lang = 'en' | 'pt';

const COLOR_NAMES: Record<string, [string, string]> = {
  C00000: ['Dark Red', 'Vermelho Escuro'], FF0000: ['Red', 'Vermelho'], FFC000: ['Orange', 'Laranja'],
  FFFF00: ['Yellow', 'Amarelo'], '92D050': ['Light Green', 'Verde Claro'], '00B050': ['Green', 'Verde'],
  '00B0F0': ['Light Blue', 'Azul Claro'], '0070C0': ['Blue', 'Azul'], '002060': ['Dark Blue', 'Azul Escuro'],
  '7030A0': ['Purple', 'Roxo'], '000000': ['Black', 'Preto'], FFFFFF: ['White', 'Branco'],
};

/** cm (pt) ou polegadas (en), como os balões do Word. */
const len = (tw: number, lang: Lang): string => lang === 'pt'
  ? `${(Math.round(tw / 1440 * 2.54 * 100) / 100).toLocaleString('pt-BR')} cm`
  : `${Math.round(tw / 1440 * 100) / 100}"`;
const pt = (v: number, lang: Lang): string => `${lang === 'pt' ? String(v).replace('.', ',') : v} pt`;

/** Partes da descrição de uma mudança de formatação de caractere (medido no Word pt-BR). */
function runParts(old: RunProps, now: RunProps, lang: Lang): string[] {
  const en = lang === 'en';
  const font: string[] = [];
  const rest: string[] = [];
  if (!!now.bold !== !!old.bold) font.push(now.bold ? (en ? 'Bold' : 'Negrito') : (en ? 'Not Bold' : 'Não Negrito'));
  if (!!now.italic !== !!old.italic) font.push(now.italic ? (en ? 'Italic' : 'Itálico') : (en ? 'Not Italic' : 'Não Itálico'));
  if (now.szHalfPt !== old.szHalfPt && now.szHalfPt !== undefined) font.push(pt(now.szHalfPt / 2, lang));
  if (now.fontAscii !== old.fontAscii && now.fontAscii) font.push(`${en ? '(Default)' : '(Padrão)'} ${now.fontAscii}`);
  if (!!now.underline !== !!old.underline || now.underlineStyle !== old.underlineStyle) rest.push(now.underline ? (en ? 'Underline' : 'Sublinhado') : (en ? 'No underline' : 'Sem sublinhado'));
  if (!!now.strike !== !!old.strike) rest.push(now.strike ? (en ? 'Strikethrough' : 'Tachado') : (en ? 'Not Strikethrough' : 'Não Tachado'));
  if (!!now.doubleStrike !== !!old.doubleStrike) rest.push(now.doubleStrike ? (en ? 'Double strikethrough' : 'Tachado duplo') : (en ? 'Not Double strikethrough' : 'Não Tachado duplo'));
  if (now.vertAlign !== old.vertAlign) {
    rest.push(now.vertAlign === 'superscript' ? (en ? 'Superscript' : 'Sobrescrito') : now.vertAlign === 'subscript' ? (en ? 'Subscript' : 'Subscrito') : (en ? 'Not Superscript/ Subscript' : 'Não Sobrescrito/ Subscrito'));
  }
  if (!!now.allCaps !== !!old.allCaps) rest.push(now.allCaps ? (en ? 'All caps' : 'Todas em Maiúsculas') : (en ? 'Not All caps' : 'Não Todas em Maiúsculas'));
  if (!!now.smallCaps !== !!old.smallCaps) rest.push(now.smallCaps ? (en ? 'Small caps' : 'Versalete') : (en ? 'Not Small caps' : 'Não Versalete'));
  if (now.color !== old.color) {
    const c = (now.color ?? '').toUpperCase();
    const name = COLOR_NAMES[c]?.[en ? 0 : 1];
    const rgb = c.length === 6 ? [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16)) : null;
    const label = !c ? (en ? 'Auto' : 'Automática') : name ?? (rgb ? (en ? `Custom Color(RGB(${rgb.join(',')}))` : `Cor Personalizada(RGB(${rgb.join(';')}))`) : c);
    rest.push(`${en ? 'Font color' : 'Cor da fonte'}: ${label}`);
  }
  if (now.highlight !== old.highlight) rest.push(now.highlight ? (en ? 'Highlight' : 'Realce') : (en ? 'Not Highlight' : 'Sem realce'));
  if ((now.charSpacingTwips ?? 0) !== (old.charSpacingTwips ?? 0)) {
    const v = (now.charSpacingTwips ?? 0) / 20;
    rest.push(v === 0 ? (en ? 'Not Expanded by / Condensed by' : 'Não Expandido por / Condensado por') : v > 0 ? `${en ? 'Expanded by' : 'Expandido por'}  ${pt(v, lang)}` : `${en ? 'Condensed by' : 'Condensado por'}  ${pt(-v, lang)}`);
  }
  return [...(font.length ? [`${en ? 'Font' : 'Fonte'}: ${font.join(', ')}`] : []), ...rest];
}

/** Partes da descrição de uma mudança de formatação de parágrafo (medido no Word pt-BR). */
function paraParts(old: ParaProps, now: ParaProps, lang: Lang, styleName: (id: string) => string): string[] {
  const en = lang === 'en';
  const out: string[] = [];
  if (now.styleId !== old.styleId) out.push(now.styleId ? styleName(now.styleId) : 'Normal');
  if (now.numbering?.kind !== old.numbering?.kind) {
    out.push(!now.numbering ? (en ? 'No bullets or numbering' : 'Sem marcadores ou numeração') : now.numbering.kind === 'bullet' ? (en ? 'Bulleted' : 'Com marcadores') : (en ? 'Numbered' : 'Numerada'));
  }
  if ((now.alignment ?? 'left') !== (old.alignment ?? 'left')) {
    const a = now.alignment ?? 'left';
    out.push(en ? { left: 'Left', center: 'Centered', right: 'Right', both: 'Justified' }[a] : { left: 'À esquerda', center: 'Centralizado', right: 'À direita', both: 'Justificado' }[a]);
  }
  const ind: string[] = [];
  if ((now.indentLeftTwips ?? 0) !== (old.indentLeftTwips ?? 0) || ((now.indentFirstLineTwips ?? 0) < 0 && now.indentFirstLineTwips !== old.indentFirstLineTwips)) {
    ind.push(`${en ? 'Left' : 'À esquerda'}:  ${len(now.indentLeftTwips ?? 0, lang)}`);
  }
  if ((now.indentFirstLineTwips ?? 0) !== (old.indentFirstLineTwips ?? 0)) {
    const f = now.indentFirstLineTwips ?? 0;
    ind.push(f < 0 ? `${en ? 'Hanging' : 'Deslocamento'}:  ${len(-f, lang)}` : `${en ? 'First line' : 'Primeira linha'}:  ${len(f, lang)}`);
  }
  if (ind.length) out.push(`${en ? 'Indent' : 'Recuo'}: ${ind.join(', ')}`);
  if ((now.indentRightTwips ?? 0) !== (old.indentRightTwips ?? 0)) out.push(`${en ? 'Right' : 'À direita'}:  ${len(now.indentRightTwips ?? 0, lang)}`);
  if (now.spaceBeforeTwips !== old.spaceBeforeTwips) out.push(`${en ? 'Space Before' : 'Espaço Antes'}:  ${pt((now.spaceBeforeTwips ?? 0) / 20, lang)}`);
  if (now.spaceAfterTwips !== old.spaceAfterTwips) out.push(`${en ? 'Space After' : 'Espaço Depois de'}:  ${pt((now.spaceAfterTwips ?? 0) / 20, lang)}`);
  if (now.lineTwentieths !== old.lineTwentieths) {
    const l = now.lineTwentieths ?? 240;
    const v = l === 240 ? (en ? 'single' : 'simples') : l === 480 ? (en ? 'Double' : 'Duplo') : `${en ? l / 240 : String(l / 240).replace('.', ',')} ${en ? 'lines' : 'linhas'}`;
    out.push(`${en ? 'Line spacing' : 'Espaçamento entre linhas'}:  ${v}`);
  }
  if (now.shadingHex !== old.shadingHex) out.push(en ? 'Pattern: Clear' : 'Padrão: Transparente');
  if (JSON.stringify(now.borders ?? null) !== JSON.stringify(old.borders ?? null) || !!now.boxBorder !== !!old.boxBorder) out.push(en ? 'Border' : 'Borda');
  if (!!now.pageBreakBefore !== !!old.pageBreakBefore) out.push(now.pageBreakBefore ? (en ? 'Page break before' : 'Quebra de página antes') : (en ? 'No page break before' : 'Sem quebra de página antes'));
  return out;
}

/** "Formatado: …" de uma revisão de formatação (vazio se não for formatação). */
export function formatDescription(s: RevisionSpan, lang: Lang, styleName: (id: string) => string = (id) => id): string {
  if ((s.kind !== 'format' && s.kind !== 'paraFormat') || !s.old || !s.now) return '';
  const parts = s.kind === 'format'
    ? runParts(s.old as RunProps, s.now as RunProps, lang)
    : paraParts(s.old as ParaProps, s.now as ParaProps, lang, styleName);
  return `${lang === 'en' ? 'Formatted' : 'Formatado'}: ${parts.join(', ')}`;
}

// Controle de alterações no <universal-write>: tipos da API pública e textos
// dos balões / do Painel de Revisão. As regras de edição e de aceitar/rejeitar
// moram no docx-core (revisions.ts); a exibição, no docx-layout.
import { uiLocale, type UiLang } from '@universal-office/ui';
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
  /** onde está: corpo, tabela, cabeçalho, rodapé, nota de rodapé ou de fim */
  story: 'body' | 'table' | 'header' | 'footer' | 'footnote' | 'endnote';
  /** cor da marcação deste autor (RRGGBB) */
  color: string;
}

type Lang = UiLang;

const COLOR_NAMES: Record<string, Record<Lang, string>> = {
  C00000: { en: 'Dark Red', pt: 'Vermelho Escuro', es: 'Rojo oscuro' }, FF0000: { en: 'Red', pt: 'Vermelho', es: 'Rojo' }, FFC000: { en: 'Orange', pt: 'Laranja', es: 'Naranja' },
  FFFF00: { en: 'Yellow', pt: 'Amarelo', es: 'Amarillo' }, '92D050': { en: 'Light Green', pt: 'Verde Claro', es: 'Verde claro' }, '00B050': { en: 'Green', pt: 'Verde', es: 'Verde' },
  '00B0F0': { en: 'Light Blue', pt: 'Azul Claro', es: 'Azul claro' }, '0070C0': { en: 'Blue', pt: 'Azul', es: 'Azul' }, '002060': { en: 'Dark Blue', pt: 'Azul Escuro', es: 'Azul oscuro' },
  '7030A0': { en: 'Purple', pt: 'Roxo', es: 'Púrpura' }, '000000': { en: 'Black', pt: 'Preto', es: 'Negro' }, FFFFFF: { en: 'White', pt: 'Branco', es: 'Blanco' },
};

/** Texto do idioma (o Word escreve a descrição da revisão no idioma da interface). */
const tx = (lang: Lang, en: string, pt: string, es: string): string => (lang === 'en' ? en : lang === 'es' ? es : pt);

/** cm (pt, es) ou polegadas (en), como os balões do Word. */
const len = (tw: number, lang: Lang): string => lang !== 'en'
  ? `${(Math.round(tw / 1440 * 2.54 * 100) / 100).toLocaleString(uiLocale(lang))} cm`
  : `${Math.round(tw / 1440 * 100) / 100}"`;
const pt = (v: number, lang: Lang): string => `${lang !== 'en' ? String(v).replace('.', ',') : v} pt`;

/** Partes da descrição de uma mudança de formatação de caractere (medido no Word pt-BR). */
function runParts(old: RunProps, now: RunProps, lang: Lang): string[] {
  const en = lang === 'en';
  const T = (e: string, p: string, s: string): string => tx(lang, e, p, s);
  const font: string[] = [];
  const rest: string[] = [];
  if (!!now.bold !== !!old.bold) font.push(now.bold ? T('Bold', 'Negrito', 'Negrita') : T('Not Bold', 'Não Negrito', 'No Negrita'));
  if (!!now.italic !== !!old.italic) font.push(now.italic ? T('Italic', 'Itálico', 'Cursiva') : T('Not Italic', 'Não Itálico', 'No Cursiva'));
  if (now.szHalfPt !== old.szHalfPt && now.szHalfPt !== undefined) font.push(pt(now.szHalfPt / 2, lang));
  if (now.fontAscii !== old.fontAscii && now.fontAscii) font.push(`${T('(Default)', '(Padrão)', '(Predeterminado)')} ${now.fontAscii}`);
  if (!!now.underline !== !!old.underline || now.underlineStyle !== old.underlineStyle) rest.push(now.underline ? T('Underline', 'Sublinhado', 'Subrayado') : T('No underline', 'Sem sublinhado', 'Sin subrayado'));
  if (!!now.strike !== !!old.strike) rest.push(now.strike ? T('Strikethrough', 'Tachado', 'Tachado') : T('Not Strikethrough', 'Não Tachado', 'No Tachado'));
  if (!!now.doubleStrike !== !!old.doubleStrike) rest.push(now.doubleStrike ? T('Double strikethrough', 'Tachado duplo', 'Doble tachado') : T('Not Double strikethrough', 'Não Tachado duplo', 'No Doble tachado'));
  if (now.vertAlign !== old.vertAlign) {
    rest.push(now.vertAlign === 'superscript' ? T('Superscript', 'Sobrescrito', 'Superíndice') : now.vertAlign === 'subscript' ? T('Subscript', 'Subscrito', 'Subíndice') : T('Not Superscript/ Subscript', 'Não Sobrescrito/ Subscrito', 'No Superíndice/ Subíndice'));
  }
  if (!!now.allCaps !== !!old.allCaps) rest.push(now.allCaps ? T('All caps', 'Todas em Maiúsculas', 'Mayúsculas') : T('Not All caps', 'Não Todas em Maiúsculas', 'No Mayúsculas'));
  if (!!now.smallCaps !== !!old.smallCaps) rest.push(now.smallCaps ? T('Small caps', 'Versalete', 'Versalitas') : T('Not Small caps', 'Não Versalete', 'No Versalitas'));
  if (now.color !== old.color) {
    const c = (now.color ?? '').toUpperCase();
    const name = COLOR_NAMES[c]?.[lang];
    const rgb = c.length === 6 ? [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16)) : null;
    const label = !c ? T('Auto', 'Automática', 'Automático') : name ?? (rgb ? (en ? `Custom Color(RGB(${rgb.join(',')}))` : `${T('', 'Cor Personalizada', 'Color personalizado')}(RGB(${rgb.join(';')}))`) : c);
    rest.push(`${T('Font color', 'Cor da fonte', 'Color de fuente')}: ${label}`);
  }
  if (now.highlight !== old.highlight) rest.push(now.highlight ? T('Highlight', 'Realce', 'Resaltar') : T('Not Highlight', 'Sem realce', 'No Resaltar'));
  if ((now.charSpacingTwips ?? 0) !== (old.charSpacingTwips ?? 0)) {
    const v = (now.charSpacingTwips ?? 0) / 20;
    rest.push(v === 0 ? T('Not Expanded by / Condensed by', 'Não Expandido por / Condensado por', 'No Expandido / Comprimido') : v > 0 ? `${T('Expanded by', 'Expandido por', 'Expandido')}  ${pt(v, lang)}` : `${T('Condensed by', 'Condensado por', 'Comprimido')}  ${pt(-v, lang)}`);
  }
  return [...(font.length ? [`${T('Font', 'Fonte', 'Fuente')}: ${font.join(', ')}`] : []), ...rest];
}

/** Partes da descrição de uma mudança de formatação de parágrafo (medido no Word pt-BR). */
function paraParts(old: ParaProps, now: ParaProps, lang: Lang, styleName: (id: string) => string): string[] {
  const en = lang === 'en';
  const T = (e: string, p: string, s: string): string => tx(lang, e, p, s);
  const out: string[] = [];
  if (now.styleId !== old.styleId) out.push(now.styleId ? styleName(now.styleId) : 'Normal');
  if (now.numbering?.kind !== old.numbering?.kind) {
    out.push(!now.numbering ? T('No bullets or numbering', 'Sem marcadores ou numeração', 'Sin viñetas ni numeración') : now.numbering.kind === 'bullet' ? T('Bulleted', 'Com marcadores', 'Con viñetas') : T('Numbered', 'Numerada', 'Numerado'));
  }
  if ((now.alignment ?? 'left') !== (old.alignment ?? 'left')) {
    const a = now.alignment ?? 'left';
    out.push({ en: { left: 'Left', center: 'Centered', right: 'Right', both: 'Justified' }, pt: { left: 'À esquerda', center: 'Centralizado', right: 'À direita', both: 'Justificado' }, es: { left: 'Izquierda', center: 'Centrado', right: 'Derecha', both: 'Justificado' } }[lang][a]);
  }
  const ind: string[] = [];
  if ((now.indentLeftTwips ?? 0) !== (old.indentLeftTwips ?? 0) || ((now.indentFirstLineTwips ?? 0) < 0 && now.indentFirstLineTwips !== old.indentFirstLineTwips)) {
    ind.push(`${T('Left', 'À esquerda', 'Izquierda')}:  ${len(now.indentLeftTwips ?? 0, lang)}`);
  }
  if ((now.indentFirstLineTwips ?? 0) !== (old.indentFirstLineTwips ?? 0)) {
    const f = now.indentFirstLineTwips ?? 0;
    ind.push(f < 0 ? `${T('Hanging', 'Deslocamento', 'Francesa')}:  ${len(-f, lang)}` : `${T('First line', 'Primeira linha', 'Primera línea')}:  ${len(f, lang)}`);
  }
  if (ind.length) out.push(`${T('Indent', 'Recuo', 'Sangría')}: ${ind.join(', ')}`);
  if ((now.indentRightTwips ?? 0) !== (old.indentRightTwips ?? 0)) out.push(`${T('Right', 'À direita', 'Derecha')}:  ${len(now.indentRightTwips ?? 0, lang)}`);
  if (now.spaceBeforeTwips !== old.spaceBeforeTwips) out.push(`${T('Space Before', 'Espaço Antes', 'Espacio Antes')}:  ${pt((now.spaceBeforeTwips ?? 0) / 20, lang)}`);
  if (now.spaceAfterTwips !== old.spaceAfterTwips) out.push(`${T('Space After', 'Espaço Depois de', 'Espacio Después')}:  ${pt((now.spaceAfterTwips ?? 0) / 20, lang)}`);
  if (now.lineTwentieths !== old.lineTwentieths) {
    const l = now.lineTwentieths ?? 240;
    const v = l === 240 ? T('single', 'simples', 'sencillo') : l === 480 ? T('Double', 'Duplo', 'Doble') : `${en ? l / 240 : String(l / 240).replace('.', ',')} ${T('lines', 'linhas', 'líneas')}`;
    out.push(`${T('Line spacing', 'Espaçamento entre linhas', 'Interlineado')}:  ${v}`);
  }
  if (now.shadingHex !== old.shadingHex) out.push(T('Pattern: Clear', 'Padrão: Transparente', 'Trama: Claro'));
  if (JSON.stringify(now.borders ?? null) !== JSON.stringify(old.borders ?? null) || !!now.boxBorder !== !!old.boxBorder) out.push(T('Border', 'Borda', 'Borde'));
  if (!!now.pageBreakBefore !== !!old.pageBreakBefore) out.push(now.pageBreakBefore ? T('Page break before', 'Quebra de página antes', 'Salto de página anterior') : T('No page break before', 'Sem quebra de página antes', 'Sin salto de página anterior'));
  return out;
}

/** "Formatado: …" de uma revisão de formatação (vazio se não for formatação). */
export function formatDescription(s: RevisionSpan, lang: Lang, styleName: (id: string) => string = (id) => id): string {
  if ((s.kind !== 'format' && s.kind !== 'paraFormat') || !s.old || !s.now) return '';
  const parts = s.kind === 'format'
    ? runParts(s.old as RunProps, s.now as RunProps, lang)
    : paraParts(s.old as ParaProps, s.now as ParaProps, lang, styleName);
  return `${tx(lang, 'Formatted', 'Formatado', 'Con formato')}: ${parts.join(', ')}`;
}

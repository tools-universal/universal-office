// Regras puras da frente SUMÁRIO, sobre o motor único de TOC de references.ts:
// modelos da galeria (desenhados aqui — os blocos de construção do Word não
// entram no repositório), formatos do diálogo Sumário Personalizado (estilos
// toc 1–9), campos TC, Adicionar Texto e as opções ↔ instrução. Fatos do Word
// medidos em write/tools/toc-lab (memória word-toc-oracle-facts).
import type { UiLang } from '@universal-office/ui';
import type { BlockSdt } from '@universal-office/docx-core';
import type { TabLeaderChoice, TocOptions } from './references.js';

type Labels = { en: string; pt: string; es: string };

// ───────────────────────── galeria ─────────────────────────

export type TocTemplateId = 'auto1' | 'auto2' | 'manual';

export interface TocTemplate {
  id: TocTemplateId;
  name: Labels;
  /** texto do título (estilo Cabeçalho do Sumário) */
  heading: Labels;
  /** entradas digitadas (sem campo) */
  manual?: boolean;
}

/** Modelos da galeria Sumário. Os automáticos do Word pt-BR gravam o mesmo XML
 *  (oráculo bb-1/bb-2); os nossos seguem as descrições da galeria: o 1 rotulado
 *  "Conteúdo", o 2 "Sumário". */
export const TOC_TEMPLATES: readonly TocTemplate[] = [
  { id: 'auto1', name: { en: 'Automatic Table 1', pt: 'Sumário Automático 1', es: 'Tabla automática 1' }, heading: { en: 'Contents', pt: 'Conteúdo', es: 'Tabla de contenido' } },
  { id: 'auto2', name: { en: 'Automatic Table 2', pt: 'Sumário Automático 2', es: 'Tabla automática 2' }, heading: { en: 'Table of Contents', pt: 'Sumário', es: 'Tabla de contenido' } },
  { id: 'manual', name: { en: 'Manual Table', pt: 'Sumário Manual', es: 'Tabla manual' }, heading: { en: 'Table of Contents', pt: 'Sumário', es: 'Tabla de contenido' }, manual: true },
];

/** Instrução dos modelos automáticos (oráculo bb-1/bb-2). */
export const TOC_AUTO_INSTR = ' TOC \\o "1-3" \\h \\z \\u ';

/** Espaço reservado das entradas do Sumário Manual e os níveis (oráculo bb-3). */
export const manualPlaceholder = (lang: UiLang, level: number): string =>
  ({ pt: `Digite o título do capítulo (nível ${level})`, en: `Type chapter title (level ${level})`, es: `Escribe el título del capítulo (nivel ${level})` })[lang];
export const MANUAL_LEVELS: readonly number[] = [1, 2, 3, 1, 2, 3];

export const TOC_GALLERY = 'Table of Contents';
export const isTocSdt = (s: BlockSdt | undefined): boolean => s?.gallery === TOC_GALLERY;

/** w:sdtPr do controle do sumário (oráculo bb-*: docPartObj com docPartGallery
 *  "Table of Contents" e docPartUnique). */
export const tocSdtPr = (id: number): string =>
  `<w:sdtPr><w:id w:val="${id}"/><w:docPartObj><w:docPartGallery w:val="${TOC_GALLERY}"/><w:docPartUnique/></w:docPartObj></w:sdtPr>`;

// ───────────────────────── formatos ─────────────────────────

/** Formatos do diálogo (TablesOfContents.Format 0–6). */
export type TocFormat = 'template' | 'classic' | 'distinctive' | 'fancy' | 'modern' | 'formal' | 'simple';
export const TOC_FORMATS: readonly { id: TocFormat; label: Labels }[] = [
  { id: 'template', label: { en: 'From template', pt: 'Do modelo', es: 'De plantilla' } },
  { id: 'classic', label: { en: 'Classic', pt: 'Clássico', es: 'Clásico' } },
  { id: 'distinctive', label: { en: 'Distinctive', pt: 'Elegante', es: 'Distintivo' } },
  { id: 'fancy', label: { en: 'Fancy', pt: 'Sofisticado', es: 'Elegante' } },
  { id: 'modern', label: { en: 'Modern', pt: 'Moderno', es: 'Moderno' } },
  { id: 'formal', label: { en: 'Formal', pt: 'Formal', es: 'Formal' } },
  { id: 'simple', label: { en: 'Simple', pt: 'Simples', es: 'Sencillo' } },
];

const sp = (before: number | null, after: number): string => `<w:spacing${before !== null ? ` w:before="${before}"` : ''} w:after="${after}"/>`;
const ind = (left: number): string => (left > 0 ? `<w:ind w:left="${left}"/>` : '');
const sz = (hp: number): string => `<w:sz w:val="${hp}"/><w:szCs w:val="${hp}"/>`;
const B = '<w:b/><w:bCs/>', I = '<w:i/><w:iCs/>';

/**
 * w:pPr/w:rPr (conteúdo) do estilo "toc N" em cada formato, como o Word grava
 * (oráculo toc-format0–6). "Do modelo" = a definição interna (after 100, recuo
 * 220 por nível).
 */
export function tocFormatStyle(f: TocFormat, level: number): { pPr: string; rPr: string } {
  const n = Math.min(9, Math.max(1, level));
  switch (f) {
    case 'classic':
      if (n === 1) return { pPr: sp(360, 0), rPr: `<w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi"/>${B}<w:caps/>${sz(24)}` };
      if (n === 2) return { pPr: sp(240, 0), rPr: B + sz(20) };
      return { pPr: sp(null, 0) + ind(220 * (n - 2)), rPr: sz(20) };
    case 'distinctive':
      if (n === 1) return { pPr: sp(120, 0), rPr: B + I + sz(24) };
      if (n === 2) return { pPr: sp(120, 0) + ind(220), rPr: B };
      return { pPr: sp(null, 0) + ind(220 * (n - 1)), rPr: sz(20) };
    case 'fancy':
      if (n === 1) return { pPr: sp(360, 360), rPr: `${B}<w:caps/><w:u w:val="single"/>` };
      if (n === 2) return { pPr: sp(null, 0), rPr: `${B}<w:smallCaps/>` };
      if (n === 3) return { pPr: sp(null, 0), rPr: '<w:smallCaps/>' };
      return { pPr: sp(null, 0), rPr: '' };
    case 'modern': {
      const bdr = '<w:pBdr><w:between w:val="double" w:sz="6" w:space="0" w:color="auto"/></w:pBdr>';
      const jc = '<w:jc w:val="center"/>';
      if (n === 1) return { pPr: bdr + sp(120, 120) + jc, rPr: B + I + sz(24) };
      if (n === 2) return { pPr: bdr + sp(120, 120) + jc, rPr: I + sz(20) };
      return { pPr: bdr + sp(120, 120) + ind(220 * (n - 2)) + jc, rPr: sz(20) };
    }
    case 'formal':
      if (n === 1) return { pPr: sp(120, 120), rPr: `${B}<w:caps/>${sz(20)}` };
      if (n === 2) return { pPr: sp(null, 0) + ind(220), rPr: `<w:smallCaps/>${sz(20)}` };
      if (n === 3) return { pPr: sp(null, 0) + ind(440), rPr: I + sz(20) };
      return { pPr: sp(null, 0) + ind(220 * (n - 1)), rPr: sz(18) };
    case 'simple':
      if (n === 1) return { pPr: sp(240, 120), rPr: B + sz(20) };
      if (n === 2) return { pPr: sp(120, 0) + ind(220), rPr: I + sz(20) };
      return { pPr: sp(null, 0) + ind(220 * (n - 1)), rPr: sz(20) };
    default:
      return { pPr: sp(null, 100) + ind(220 * (n - 1)), rPr: '' };
  }
}

// ───────────────────────── campos TC ─────────────────────────

/** Entrada de sumário marcada com um campo TC. */
export interface TcEntry {
  text: string;
  /** identificador do sumário (\f; sem ele o Word usa "C") */
  id: string;
  /** nível (\l; padrão 1) */
  level: number;
  /** \n: sem número de página */
  noPage: boolean;
}

/** Lê `TC "texto" \f C \l "2" \n` (null se não é TC). */
export function parseTcInstr(instr: string | undefined): TcEntry | null {
  const m = /^\s*TC\s+(?:"((?:[^"\\]|\\.)*)"|(\S+))/i.exec(instr ?? '');
  if (!m) return null;
  const text = (m[1] ?? m[2] ?? '').replace(/\\(.)/g, '$1');
  const rest = (instr ?? '').slice(m.index + m[0].length);
  const f = /\\f\s+(?:"([^"]*)"|([^\s\\"]+))/i.exec(rest);
  const l = /\\l\s+"?(\d+)/i.exec(rest);
  return { text, id: f ? (f[1] ?? f[2] ?? 'C') : 'C', level: l ? Math.min(9, Math.max(1, +l[1]!)) : 1, noPage: /\\n\b/i.test(rest) };
}

/** Instrução do TC como "Marcar Entrada de Sumário" grava (oráculo tc-mark):
 *  ` TC "Entrada" \f C \l "2" ` — o identificador padrão é C. */
export function tcInstr(o: { text: string; id?: string; level?: number }): string {
  const id = (o.id ?? '').trim() || 'C';
  const text = o.text.replace(/(["\\])/g, '\\$1');
  return ` TC "${text}" \\f ${/\s/.test(id) ? `"${id}"` : id} \\l "${Math.min(9, Math.max(1, o.level ?? 1))}" `;
}

/** O TC entra no sumário? `\f` sem id = os TC com o identificador C (oráculo
 *  toc-fields); `\f x` = só os de x; `\l "a-b"` filtra os níveis (toc-f-l). */
export function tcInToc(o: TocOptions, tc: TcEntry): boolean {
  if (!o.fields) return false;
  if ((o.fieldId ?? 'C').toLowerCase() !== tc.id.toLowerCase()) return false;
  const l = o.fieldLevels;
  return !l || (tc.level >= l[0] && tc.level <= l[1]);
}

// ───────────────────────── diálogo ─────────────────────────

/** Opções do diálogo Sumário Personalizado (e da galeria, que usa o padrão). */
export interface TableOfContentsOptions {
  /** Mostrar números de página (senão \n) */
  pageNumbers?: boolean;
  /** Alinhar números de página à direita (senão \p " ") */
  rightAlign?: boolean;
  /** Preenchimento de tabulação */
  leader?: TabLeaderChoice;
  /** Usar hiperlinks em vez de números de página (\h) */
  hyperlinks?: boolean;
  /** Formatos: o que vai para os estilos Sumário 1–9 */
  format?: TocFormat;
  /** Mostrar níveis (1–9) */
  levels?: number;
  /** Opções › Estilos: títulos internos (\o) e os estilos da lista (\t) */
  useStyles?: boolean;
  /** estilos fora dos títulos, com o nível (nome de exibição) */
  styles?: { style: string; level: number }[];
  /** Opções › Níveis de tópicos (\u) */
  outlineLevels?: boolean;
  /** Opções › Campos de entrada de índice (\f) */
  fields?: boolean;
  /** identificador dos campos TC (\f x) */
  fieldId?: string;
}

/** Opções do diálogo → opções do campo (o padrão é o do Word: \o "1-3" \h \z \u). */
export function tocOptionsFrom(d: TableOfContentsOptions): TocOptions {
  const levels = Math.min(9, Math.max(1, d.levels ?? 3));
  const links = d.hyperlinks !== false;
  const o: TocOptions = { hyperlinks: links, hideInWeb: true };
  if (d.useStyles !== false) o.outline = [1, levels];
  // (o \l dos TC não sai do diálogo: TablesOfContents.Add com campos grava só \f — toc-fields-id)
  if (d.fields) { o.fields = true; if (d.fieldId) o.fieldId = d.fieldId; }
  if (d.pageNumbers === false) o.noPageNumbers = true;
  else if (d.rightAlign === false) o.separator = ' ';
  if (d.useStyles !== false && d.styles?.length) o.styles = d.styles.filter((s) => s.level >= 1 && s.level <= 9);
  if (d.outlineLevels !== false) o.outlineLevels = true;
  if (!links) delete o.hyperlinks;
  return o;
}

/** Opções do campo → diálogo (o formato e o preenchimento vêm de fora). */
export function dialogOptionsFrom(o: TocOptions): TableOfContentsOptions {
  return {
    pageNumbers: !o.noPageNumbers,
    rightAlign: o.separator === undefined,
    hyperlinks: !!o.hyperlinks,
    levels: o.outline?.[1] ?? o.fieldLevels?.[1] ?? 3,
    useStyles: !!o.outline || !!o.styles?.length,
    styles: o.styles ?? [],
    outlineLevels: !!o.outlineLevels,
    fields: !!o.fields,
    ...(o.fieldId ? { fieldId: o.fieldId } : {}),
  };
}

// ───────────────────────── Adicionar Texto ─────────────────────────

/**
 * O que "Adicionar Texto" faz com o parágrafo (a faixa não é mensurável por COM —
 * regra da MVP Suzanne Barnhill, TOC Tips): Nível N num parágrafo Normal ou de
 * título aplica o Título N; em outro estilo, só o nível de tópico. "Não Mostrar no
 * Sumário" num título volta para Normal; em outro estilo tira o nível de tópico.
 */
export function addTextPlan(level: number, styleKind: 'normal' | 'heading' | 'other'): { heading?: number; normal?: true; outline?: number | null } {
  if (level <= 0) return styleKind === 'heading' ? { normal: true } : { outline: null };
  if (styleKind === 'other') return { outline: level };
  return { heading: level };
}

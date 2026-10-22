// Regras puras da frente LINKS E REFERÊNCIAS (indicadores, referência cruzada,
// legendas, índice de ilustrações/sumário), sem DOM: o <universal-write> as usa e
// os testes as exercitam direto. Fatos do Word medidos em write/tools/refs-lab
// (memória word-refs-oracle-facts).
import {
  DEFAULT_RUN_PROPS, insertIndex, splitAt, comparePos, normalizeParagraph,
  type DocPosition, type Paragraph, type ParaTabStop, type Run, type RunProps, type TabLeader,
} from '@universal-office/docx-core';

// ───────────────────────── indicadores ─────────────────────────

/** Indicador no modelo: as duas marcas e onde estão. */
export interface BookmarkLoc {
  name: string;
  id: number;
  start: DocPosition;
  /** sem fim (marca solta — o fim está cru fora do parágrafo): ponto */
  end: DocPosition;
}

/** Nome válido na interface do Word: começa com letra, depois letras, dígitos ou
 *  `_`, até 40 caracteres (o Word trunca o resto; `_` no começo é dos ocultos). */
export function validBookmarkName(name: string): boolean {
  return name.length > 0 && name.length <= 40 && /^\p{L}[\p{L}\p{N}_]*$/u.test(name);
}

/** Oculto (_Ref, _Toc, _GoBack…): só o Word cria; a lista os mostra com a opção. */
export const isHiddenBookmark = (name: string): boolean => name.startsWith('_');

/** Indicadores (pelas marcas) de uma lista de parágrafos, na ordem dos começos. */
export function bookmarksIn(paras: readonly Paragraph[]): BookmarkLoc[] {
  const open = new Map<number, BookmarkLoc>();
  const out: BookmarkLoc[] = [];
  paras.forEach((p, para) => {
    let offset = 0;
    for (const r of p.runs) {
      const b = r.bookmark;
      if (b && !b.end) {
        const loc = { name: b.name, id: b.id, start: { para, offset }, end: { para, offset } };
        open.set(b.id, loc);
        out.push(loc);
      } else if (b?.end) {
        const loc = open.get(b.id);
        if (loc) { loc.end = { para, offset }; open.delete(b.id); }
      }
      offset += r.text.length;
    }
  });
  return out;
}

/** O indicador pelo nome (o Word não diferencia maiúsculas). */
export function findBookmark(paras: readonly Paragraph[], name: string): BookmarkLoc | undefined {
  const k = name.toLowerCase();
  return bookmarksIn(paras).find((b) => b.name.toLowerCase() === k);
}

/** Tira as marcas do indicador (o texto fica). */
export function removeBookmarkMarks(paras: readonly Paragraph[], name: string): boolean {
  const k = name.toLowerCase();
  const ids = new Set<number>();
  for (const p of paras) for (const r of p.runs) if (r.bookmark && !r.bookmark.end && r.bookmark.name.toLowerCase() === k) ids.add(r.bookmark.id);
  if (!ids.size) return false;
  for (const p of paras) {
    if (p.runs.some((r) => r.bookmark && ids.has(r.bookmark.id))) p.runs = p.runs.filter((r) => !(r.bookmark && ids.has(r.bookmark.id)));
  }
  return true;
}

const mark = (id: number, name: string, end: boolean, props?: RunProps): Run =>
  ({ text: '', props: { ...DEFAULT_RUN_PROPS, ...(props?.link ? { link: props.link, ...(props.linkTip ? { linkTip: props.linkTip } : {}) } : {}) }, bookmark: { id, name, ...(end ? { end: true } : {}) } });

/**
 * Põe as marcas de um indicador novo em [start, end]: o começo depois das marcas
 * que já estão no ponto, o fim antes delas (o indicador novo fica por dentro);
 * de ponto, as duas juntas. Dentro de um hiperlink a marca leva o alvo dele.
 */
export function addBookmarkMarks(paras: readonly Paragraph[], name: string, id: number, start: DocPosition, end: DocPosition): void {
  const [a, b] = comparePos(start, end) <= 0 ? [start, end] : [end, start];
  const pa = paras[a.para]!, pb = paras[b.para]!;
  if (comparePos(a, b) === 0) {
    const i = insertIndex(pa, a.offset);
    const near = pa.runs[i] ?? pa.runs[i - 1];
    pa.runs.splice(i, 0, mark(id, name, false, near?.props), mark(id, name, true, near?.props));
    return;
  }
  // o fim primeiro (o índice do começo não muda quando é outro parágrafo ou vem antes)
  const ie = splitAt(pb, b.offset);
  pb.runs.splice(ie, 0, mark(id, name, true, pb.runs[ie - 1]?.props));
  const is = insertIndex(pa, a.offset);
  pa.runs.splice(is, 0, mark(id, name, false, pa.runs[is]?.props));
}

/** Texto do trecho [start, end] (sem objetos). */
export function textBetween(paras: readonly Paragraph[], start: DocPosition, end: DocPosition): string {
  let out = '';
  for (let pi = start.para; pi <= end.para; pi++) {
    const p = paras[pi];
    if (!p) break;
    let acc = 0;
    for (const r of p.runs) {
      const rs = acc;
      acc += r.text.length;
      if (r.image || r.textbox || r.shape || r.group) continue;
      const from = pi === start.para ? start.offset : 0, to = pi === end.para ? end.offset : Infinity;
      out += r.text.slice(Math.max(0, from - rs), Math.max(0, to - rs));
    }
    if (pi < end.para) out += '\r';
  }
  return out;
}

/** Runs do trecho [start, end] de UM parágrafo, com a formatação direta (o resultado
 *  do REF a copia — oráculo refs-lab, xr-b-text), sem o que não é formatação. */
export function runsBetween(p: Paragraph, from: number, to: number): Run[] {
  const out: Run[] = [];
  let acc = 0;
  for (const r of p.runs) {
    const rs = acc;
    acc += r.text.length;
    if (r.image || r.textbox || r.shape || r.group || r.bookmark || r.fieldBegin !== undefined || r.fieldEnd) continue;
    const t = r.text.slice(Math.max(0, from - rs), Math.max(0, to - rs));
    if (!t) continue;
    const props: RunProps = { ...r.props };
    for (const k of ['src', 'link', 'linkTip', 'commentIds', 'ins', 'del', 'fmt', 'noProof', 'webHidden'] as const) delete props[k];
    if (r.noteRef) props.vertAlign = props.vertAlign ?? 'superscript';
    out.push({ text: t, props, ...(r.rpr ? { rpr: r.rpr } : {}) });
  }
  return out;
}

/** Maior w:id de indicador nas marcas e no XML cru (os indicadores fora do modelo). */
export function maxBookmarkId(paras: Iterable<Paragraph>, xmls: Iterable<string | undefined>): number {
  let max = -1;
  for (const p of paras) for (const r of p.runs) if (r.bookmark && r.bookmark.id > max) max = r.bookmark.id;
  for (const x of xmls) {
    if (!x) continue;
    for (const m of x.matchAll(/<w:bookmarkStart\b[^>]*\bw:id="(\d+)"/g)) max = Math.max(max, +m[1]!);
  }
  return max;
}

/**
 * Nome oculto novo (_Ref/_Toc + 9 dígitos, como o Word: sequencial na sessão a
 * partir de um começo qualquer — oráculo refs-lab, _Ref243527863, …64).
 */
export function hiddenBookmarkName(prefix: '_Ref' | '_Toc', taken: (name: string) => boolean, seed: { n: number }): string {
  for (;;) {
    const name = `${prefix}${String(seed.n++).padStart(9, '0').slice(-9)}`;
    if (!taken(name)) return name;
  }
}

// ───────────────────────── referência cruzada ─────────────────────────

export type CrossRefType = 'numbered' | 'heading' | 'bookmark' | 'footnote' | 'endnote' | 'caption';

/**
 * O que a referência insere (as opções de "Inserir referência para" do Word):
 * text = texto do parágrafo/título/indicador; page = número da página;
 * number / numberNoContext / numberFullContext = número do parágrafo (\r, \n, \w);
 * position = "acima"/"abaixo"; noteNumber / noteNumberFormatted = número da nota
 * (\f = com o estilo da referência); captionEntire / captionLabel / captionText.
 */
export type CrossRefKind = 'text' | 'page' | 'number' | 'numberNoContext' | 'numberFullContext' | 'position'
  | 'noteNumber' | 'noteNumberFormatted' | 'captionEntire' | 'captionLabel' | 'captionText';

/** Formas de referência que cada tipo oferece, na ordem do diálogo do Word. */
export function crossRefKinds(type: CrossRefType): CrossRefKind[] {
  switch (type) {
    case 'numbered': case 'heading': case 'bookmark':
      return ['text', 'page', 'number', 'numberNoContext', 'numberFullContext', 'position'];
    case 'footnote': case 'endnote':
      return ['noteNumber', 'page', 'position', 'noteNumberFormatted'];
    case 'caption':
      return ['captionEntire', 'captionLabel', 'captionText', 'page', 'position'];
  }
}

/**
 * Instrução do campo como o Word grava (oráculo refs-lab, xr-*): `REF n \h`,
 * `PAGEREF n \h`, `REF n \r \h`, `REF n \w \h \d "-"`, `REF n \p \h`,
 * `NOTEREF n \h`, `NOTEREF n \f \h`. Sem hiperlink: sem o \h.
 */
export function crossRefInstr(name: string, kind: CrossRefKind, opts: { hyperlink?: boolean; separator?: string } = {}): string {
  const h = opts.hyperlink === false ? '' : ' \\h';
  switch (kind) {
    case 'page': return ` PAGEREF ${name}${h} `;
    case 'number': return ` REF ${name} \\r${h} `;
    case 'numberNoContext': return ` REF ${name} \\n${h} `;
    case 'numberFullContext': return ` REF ${name} \\w${h}${opts.separator !== undefined && opts.separator !== '' ? ` \\d "${opts.separator}"` : ''} `;
    case 'position': return ` REF ${name} \\p${h} `;
    case 'noteNumber': return ` NOTEREF ${name}${h} `;
    case 'noteNumberFormatted': return ` NOTEREF ${name} \\f${h} `;
    default: return ` REF ${name}${h} `;
  }
}

/** Nome do indicador de um campo REF/PAGEREF/NOTEREF ("" se não é um deles). */
export function refFieldTarget(instr: string | undefined): string {
  const m = /^\s*(?:REF|PAGEREF|NOTEREF)\s+([^\s\\]+)/i.exec(instr ?? '');
  return m ? m[1]! : '';
}

/**
 * Trecho do parágrafo de legenda que cada forma marca (oráculo xr-cap-*): a
 * legenda inteira; "rótulo e número" até o fim do SEQ; "só o texto" depois do
 * número, pulando um caractere (o separador digitado). `seqEnd` = posição logo
 * depois do campo SEQ.
 */
export function captionRange(kind: CrossRefKind, len: number, seqEnd: number): [number, number] {
  if (kind === 'captionLabel') return [0, Math.min(len, seqEnd)];
  if (kind === 'captionText') return [Math.min(len, seqEnd + 1), len];
  return [0, len];
}

// ───────────────────────── legendas ─────────────────────────

/** Formato do número da legenda (o \* do SEQ — oráculo cap-fmt*). */
export type CaptionFormat = 'ARABIC' | 'ALPHABETIC' | 'alphabetic' | 'ROMAN' | 'roman';

/** Separador entre o capítulo e o número (oráculo cap-chap-sep*). */
export type ChapterSeparator = 'hyphen' | 'period' | 'colon' | 'emDash' | 'enDash';

export const CHAPTER_SEPARATOR_TEXT: Record<ChapterSeparator, string> = {
  hyphen: '‑', period: '.', colon: ':', emDash: '—', enDash: '–',
};

export interface CaptionNumbering {
  format: CaptionFormat;
  /** número do capítulo: o nível do título (Título 1–9) e o separador */
  chapter?: { level: number; separator: ChapterSeparator };
}

/** Rótulos internos e onde cada um põe a legenda (oráculo cap-labels). */
export const BUILTIN_LABELS: { en: string; pt: string; position: 'above' | 'below' }[] = [
  { en: 'Figure', pt: 'Figura', position: 'below' },
  { en: 'Table', pt: 'Tabela', position: 'above' },
  { en: 'Equation', pt: 'Equação', position: 'above' },
];

/** Instruções dos campos de uma legenda: o capítulo (STYLEREF) e o número (SEQ). */
export function captionFields(label: string, n: CaptionNumbering): { chapter?: string; seq: string } {
  const id = /\s/.test(label) ? `"${label}"` : label;
  if (!n.chapter) return { seq: ` SEQ ${id} \\* ${n.format} ` };
  return { chapter: ` STYLEREF ${n.chapter.level} \\s `, seq: ` SEQ ${id} \\* ${n.format} \\s ${n.chapter.level} ` };
}

/** Rótulo do campo SEQ ("" se não é SEQ). */
export function seqLabel(instr: string | undefined): string {
  const m = /^\s*SEQ\s+("([^"]+)"|\S+)/i.exec(instr ?? '');
  return m ? (m[2] ?? m[1]!) : '';
}

// ───────────────────────── índice de ilustrações / sumário ─────────────────────────

/** Opções de um campo TOC (o motor único do sumário e do índice de ilustrações). */
export interface TocOptions {
  /** \o "a-b": níveis de título */
  outline?: [number, number];
  /** \u: nível de tópico aplicado ao parágrafo */
  outlineLevels?: boolean;
  /** \t "Estilo;nível;…" */
  styles?: { style: string; level: number }[];
  /** \c "Rótulo" (com rótulo e número) ou \a "Rótulo" (só o texto) */
  caption?: string;
  includeLabel?: boolean;
  /** \h */
  hyperlinks?: boolean;
  /** \n (sem números de página) */
  noPageNumbers?: boolean;
  /** \p "x": separador no lugar da tabulação (sem alinhar à direita) */
  separator?: string;
  /** \z: some com os números no modo Web */
  hideInWeb?: boolean;
}

/** Lê a instrução TOC. */
export function parseTocInstr(instr: string): TocOptions {
  const o: TocOptions = {};
  const q = (sw: string): string | undefined => new RegExp(`\\\\${sw}\\s+"([^"]*)"`, 'i').exec(instr)?.[1];
  const has = (sw: string): boolean => new RegExp(`\\\\${sw}(?![a-z"])`, 'i').test(instr.replace(/"[^"]*"/g, '""'));
  const ol = q('o');
  if (ol !== undefined) { const m = /(\d)\s*-\s*(\d)/.exec(ol); o.outline = m ? [+m[1]!, +m[2]!] : [1, 9]; }
  else if (has('o')) o.outline = [1, 9];
  if (has('u')) o.outlineLevels = true;
  const t = q('t');
  if (t) {
    const parts = t.split(/[;,]/);
    o.styles = [];
    for (let i = 0; i + 1 < parts.length; i += 2) o.styles.push({ style: parts[i]!.trim(), level: parseInt(parts[i + 1]!, 10) || 1 });
  }
  const c = q('c'), a = q('a');
  if (c !== undefined) { o.caption = c; o.includeLabel = true; }
  else if (a !== undefined) { o.caption = a; o.includeLabel = false; }
  if (has('h')) o.hyperlinks = true;
  if (has('n')) o.noPageNumbers = true;
  const p = q('p');
  if (p !== undefined) o.separator = p;
  if (has('z')) o.hideInWeb = true;
  return o;
}

/** Instrução na ordem em que o Word grava (oráculo tof-*, toc-*):
 *  `TOC \o "1-3" \n \p " " \h \z \c "Figura" \u`. */
export function tocInstr(o: TocOptions): string {
  const parts: string[] = ['TOC'];
  if (o.outline) parts.push(`\\o "${o.outline[0]}-${o.outline[1]}"`);
  if (o.noPageNumbers) parts.push('\\n');
  if (o.separator !== undefined) parts.push(`\\p "${o.separator}"`);
  if (o.hyperlinks) parts.push('\\h');
  if (o.hideInWeb) parts.push('\\z');
  if (o.caption !== undefined) parts.push(`\\${o.includeLabel === false ? 'a' : 'c'} "${o.caption}"`);
  if (o.styles?.length) parts.push(`\\t "${o.styles.map((s) => `${s.style};${s.level}`).join(';')}"`);
  if (o.outlineLevels) parts.push('\\u');
  return ` ${parts.join(' ')} `;
}

/** Uma entrada do índice: o parágrafo de origem e o que aparece. */
export interface TocSource {
  /** nível (1 nas legendas) */
  level: number;
  /** texto da entrada (o número do título vai em `number`) */
  text: string;
  /** número de lista do título ("1.", "2.1"), vai antes com tabulação */
  number?: string;
  /** página exibida */
  page: string;
  /** indicador _Toc do parágrafo de origem */
  bookmark: string;
  /** formatação direta do texto (copiada) */
  runs?: Run[];
}

export interface TocLook {
  /** estilo de cada nível (Sumário N / Índice de ilustrações) */
  styleFor(level: number): string;
  /** estilo de caractere Hyperlink do documento */
  hyperlinkStyle: string;
  /** tabulação direita: largura do texto − 10 twips (oráculo tof-add: 8494 em 8504) */
  tabPos: number;
  leader?: TabLeader | 'none';
}

/**
 * Parágrafos de entrada como o Word gera (oráculo tof-add, toc-add-def): estilo
 * do nível + tabulação direita com preenchimento; com \h, tudo dentro do
 * hiperlink para o _Toc — o texto com o estilo Hyperlink e w:noProof, a
 * tabulação e o PAGEREF \h com w:noProof (+ w:webHidden com \z).
 */
export function tocEntryParagraphs(o: TocOptions, sources: readonly TocSource[], look: TocLook): Paragraph[] {
  const tabs: ParaTabStop[] = [{ posTwips: look.tabPos, align: 'right', ...(look.leader && look.leader !== 'none' ? { leader: look.leader } : {}) }];
  return sources.map((s) => {
    const link = o.hyperlinks ? { link: `#${s.bookmark}` } : {};
    const web = o.hideInWeb ? { webHidden: true } : {};
    const base: RunProps = { ...DEFAULT_RUN_PROPS, ...link, noProof: true };
    const runs: Run[] = [];
    if (s.number) {
      runs.push({ text: s.number, props: { ...base, ...(o.hyperlinks ? { charStyle: look.hyperlinkStyle } : {}) }, inToc: true });
      runs.push({ text: '\t', props: { ...base, ...(o.hyperlinks ? { charStyle: look.hyperlinkStyle } : {}) }, inToc: true });
    }
    const text = s.text.replace(/[\t\n\f\u000B\r]/g, ' ');
    runs.push({ text, props: { ...base, ...(o.hyperlinks ? { charStyle: look.hyperlinkStyle } : {}) }, inToc: true });
    if (!o.noPageNumbers) {
      runs.push({ text: o.separator ?? '\t', props: { ...base, ...web }, inToc: true });
      const instr = ` PAGEREF ${s.bookmark} \\h `;
      runs.push({ text: s.page, props: { ...base, ...web }, field: instr, fieldResult: [{ text: s.page, props: { ...base, ...web } }], inToc: true });
    }
    return { runs, props: { styleId: look.styleFor(s.level), tabStops: tabs } };
  });
}

/** Texto do índice vazio (oráculo tof-empty), em negrito. */
export const TOF_EMPTY = {
  en: 'No table of figures entries found.',
  pt: 'Nenhuma entrada de índice de ilustrações foi encontrada.',
};
export const TOC_EMPTY = {
  en: 'No table of contents entries found.',
  pt: 'Nenhuma entrada de sumário foi encontrada.',
};

/** Formatos do diálogo Índice de Ilustrações: o que cada um põe no estilo
 *  "table of figures" (oráculo tof-format*). */
export const TOF_FORMATS: Record<'template' | 'classic' | 'distinctive' | 'centered' | 'formal' | 'simple', { pPr: string; rPr: string }> = {
  template: { pPr: '<w:spacing w:after="0"/>', rPr: '' },
  classic: { pPr: '<w:spacing w:after="0"/><w:ind w:left="440" w:hanging="440"/>', rPr: '<w:caps/><w:sz w:val="20"/><w:szCs w:val="20"/>' },
  distinctive: { pPr: '<w:spacing w:after="0"/>', rPr: '<w:i/><w:iCs/><w:sz w:val="20"/><w:szCs w:val="20"/>' },
  centered: { pPr: '<w:spacing w:after="0"/><w:ind w:left="440" w:hanging="440"/><w:jc w:val="center"/>', rPr: '<w:b/><w:bCs/><w:i/><w:iCs/><w:sz w:val="20"/><w:szCs w:val="20"/>' },
  formal: { pPr: '<w:spacing w:after="0"/><w:ind w:left="440" w:hanging="440"/>', rPr: '<w:smallCaps/><w:sz w:val="20"/><w:szCs w:val="20"/>' },
  simple: { pPr: '<w:spacing w:after="0"/><w:ind w:left="440" w:hanging="440"/>', rPr: '<w:b/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/>' },
};

// ───────────────────────── tipos da API do editor ─────────────────────────

/** Indicador na lista do diálogo. */
export interface BookmarkInfo {
  name: string;
  /** oculto (_Ref, _Toc…) */
  hidden: boolean;
  /** texto do trecho (vazio no de ponto) */
  text: string;
}

/** Item do diálogo Referência Cruzada ("p:<parágrafo>", nome do indicador, "n:<nota>"). */
export interface CrossRefItem { id: string; text: string }

export interface CrossRefOptions {
  type: CrossRefType;
  /** rótulo da legenda (type 'caption') */
  label?: string;
  /** id do item (getCrossReferenceItems) */
  item: string;
  kind: CrossRefKind;
  /** Inserir como hiperlink (\h) — padrão sim */
  hyperlink?: boolean;
  /** Incluir acima/abaixo: REF \p depois do campo */
  position?: boolean;
  /** Separar números com (\d, só no contexto completo) */
  separator?: string;
}

/** Legendas: rótulos criados, numeração por rótulo e AutoLegenda. */
export interface CaptionSettings {
  labels: string[];
  numbering: Record<string, CaptionNumbering>;
  auto?: { table?: { label: string; position: 'above' | 'below' } };
}

export interface CaptionLabelInfo {
  name: string;
  builtIn: boolean;
  /** posição padrão (Figura abaixo, Tabela e Equação acima) */
  position: 'above' | 'below';
}

export interface CaptionOptions {
  label: string;
  /** texto depois do número (": Vendas", " - Gráfico") */
  title?: string;
  /** com imagem ou tabela selecionada */
  position?: 'above' | 'below';
  /** Excluir rótulo da legenda */
  excludeLabel?: boolean;
  /** numeração (padrão: a do rótulo) */
  numbering?: CaptionNumbering;
}

export type TofFormat = keyof typeof TOF_FORMATS;

export interface TableOfFiguresOptions {
  /** Nome da legenda (rótulo) */
  label: string;
  /** Incluir rótulo e número (senão \a) */
  includeLabel?: boolean;
  /** Mostrar números de página (senão \n) */
  pageNumbers?: boolean;
  /** Alinhar números de página à direita (senão \p " ") */
  rightAlign?: boolean;
  /** Preenchimento de tabulação */
  leader?: TabLeader | 'none';
  /** Usar hiperlinks em vez de números de página (\h \z) */
  hyperlinks?: boolean;
  /** Formatos (o estilo Índice de ilustrações) */
  format?: TofFormat;
}

export interface LinkInfo { address?: string; anchor?: string; tip?: string; text: string }

export interface HyperlinkOptions {
  /** endereço (https:, arquivo, mailto:) */
  address?: string;
  /** destino no documento: nome do indicador, "_top" (início) ou "p:<parágrafo>" (título) */
  anchor?: string;
  /** Dica de Tela (w:tooltip) */
  tip?: string;
  /** Texto para exibição */
  text?: string;
}

/** Campo TOC no corpo (parágrafos e runs de começo/fim; fim -1 = sem fim). */
export interface TocField { begin: number; end: number; beginRun: Run; endRun: Run | null; instr: string }

/** Tira o hiperlink de [from, to] do parágrafo: link, Dica de Tela e o estilo Hyperlink. */
export function unlinkRuns(p: Paragraph, from: number, to: number, hyperlinkStyle: string): void {
  splitAt(p, to);
  const i1 = splitAt(p, from);
  let acc = 0;
  p.runs.forEach((r, i) => {
    const rs = acc;
    acc += r.text.length;
    if (i < i1 || rs >= to) return;
    const props = { ...r.props };
    delete props.link;
    delete props.linkTip;
    if (props.charStyle === hyperlinkStyle) delete props.charStyle;
    r.props = props;
  });
  normalizeParagraph(p);
}

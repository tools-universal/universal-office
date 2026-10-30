// Política de formatação do <universal-write>: o hospedeiro diz o que o usuário
// pode formatar e o editor esconde o resto (barras, menus, galerias, diálogos e
// atalhos), recusa o resto na API e converte o resto ao colar. É o modo "como o
// Quill" de editores de documento com MODELO: estilos de parágrafo, fonte,
// espaçamentos, bordas, margens etc. são do modelo (template), não do texto.
// Nada disso toca o que já está no documento: carregar e salvar não filtram.
//
// Este módulo é PURO (sem DOM nem o elemento): tipos, preset, ids a ocultar,
// conversão de estilos e a limpeza de props de run/parágrafo usada no colar.
import type { ParaProps, RunProps } from '@universal-office/docx-core';

/** Formatação de caractere que a política controla. */
export type CharacterFormat =
  | 'bold' | 'italic' | 'underline'
  /** estilos e cor de sublinhado além do simples (duplo, ondulado…) */
  | 'underlineStyles'
  | 'strike' | 'doubleStrike'
  | 'superscript' | 'subscript'
  /** cor da fonte */
  | 'color'
  /** cor do realce */
  | 'highlight'
  | 'link'
  /** todas em maiúsculas / versalete (a formatação; "Maiúsculas e minúsculas" troca o texto e fica) */
  | 'caps'
  | 'hidden'
  /** espaçamento, escala, posição e kerning de caracteres */
  | 'charSpacing'
  /** efeitos de texto (contorno, sombra, brilho, gradiente…), OpenType e capitular */
  | 'textEffects';

/** Tipos de lista: marcador e numerada (os padrões da biblioteca do Word). */
export type ListKind = 'bullet' | 'decimal';

/**
 * Política de formatação definida pelo hospedeiro (propriedade `formattingPolicy`).
 * Campo ausente = permitido; `null` na propriedade = sem política (tudo).
 *
 * Estilos são citados pelo id ou pelo nome do estilo no .docx, sem diferenciar
 * maiúsculas nem espaços: `Normal`, `Title`, `Subtitle`, `Heading1` (= "heading 1")…
 * Vale o nome interno em inglês, então documentos em português (ids como
 * `Ttulo1`) casam pelo nome.
 */
export interface FormattingPolicy {
  /** estilos de parágrafo que o usuário pode aplicar (galeria, menus, atalhos, colar) */
  paragraphStyles?: readonly string[];
  /** estilos de caractere que o usuário pode aplicar (padrão: os de `paragraphStyles` restringidos = nenhum) */
  characterStyles?: readonly string[];
  /** listas: os tipos e quantos níveis (1–9; padrão 9). Galerias de listas do documento/modelo, vários níveis e definir novo formato somem. */
  lists?: { kinds: readonly ListKind[]; levels?: number };
  /** formatação de caractere permitida (ausente: toda) */
  character?: readonly CharacterFormat[];
  /** família da fonte */
  font?: boolean;
  /** tamanho da fonte (inclui aumentar/diminuir) */
  fontSize?: boolean;
  /** alinhamento do parágrafo (esquerda, centro, direita, justificado) */
  alignment?: boolean;
  /** recuos: `true` todos (recuo especial, réguas, valores exatos); `'steps'` só aumentar/diminuir recuo (o `indent` do Quill); `false` nenhum */
  indentation?: boolean | 'steps';
  /** espaçamento entre linhas e antes/depois, e as opções de paginação do parágrafo */
  spacing?: boolean;
  /** bordas de parágrafo e linha horizontal */
  borders?: boolean;
  /** sombreamento de parágrafo */
  shading?: boolean;
  /** tabulações */
  tabs?: boolean;
  /** criar, modificar, renomear e excluir estilos (Painel de Estilos, Inspetor) */
  styleEditing?: boolean;
  /** Pincel de Formatação */
  formatPainter?: boolean;
  /** margens, orientação, tamanho do papel, régua, números de linha e hifenização */
  pageSetup?: boolean;
  /** cor da página, marca-d'água e bordas de página */
  pageBackground?: boolean;
  /** cabeçalhos, rodapés e números de página */
  headersFooters?: boolean;
  /** colunas */
  columns?: boolean;
  /** quebra de página (e página em branco) e de coluna */
  pageBreaks?: boolean;
  /** quebras de seção */
  sectionBreaks?: boolean;
  /** inserir tabelas (as existentes continuam editáveis) */
  tables?: boolean;
  /** inserir imagens (também colar e soltar) */
  images?: boolean;
  /** estilos, bordas, efeitos, cortes, ajustes, quebra de texto e posição de imagens */
  imageFormatting?: boolean;
  /** formas, caixas de texto e folhas de rosto */
  shapes?: boolean;
}

/**
 * Política "documento com modelo": o editor se comporta como um editor de texto
 * rico leve (como o Quill) para documentos cuja aparência vem de um modelo — o
 * modelo .docx aplica estilos, fonte, espaçamentos, bordas e página; o texto só leva:
 * - estilos Normal, Título 1–3, Título (Title) e Subtítulo (Subtitle) — os
 *   cabeçalhos h1–h3, h5 e h6 de um seletor de cabeçalhos do Quill;
 * - listas com marcador e numerada, 9 níveis (o recuo 0–8 do Quill);
 * - negrito, itálico, sublinhado, tachado, cor da fonte, cor de realce e links;
 * - alinhamento e aumentar/diminuir recuo;
 * - imagens (o modelo ajusta o tamanho), tabelas, colunas e quebras de página
 *   (que o Quill não tem; no .docx elas sobrevivem à aplicação do modelo).
 */
export const TEMPLATE_DOCUMENT_POLICY: Readonly<FormattingPolicy> = Object.freeze({
  paragraphStyles: Object.freeze(['Normal', 'Heading1', 'Heading2', 'Heading3', 'Title', 'Subtitle']),
  characterStyles: Object.freeze([]),
  lists: Object.freeze({ kinds: Object.freeze(['bullet', 'decimal'] as ListKind[]), levels: 9 }),
  character: Object.freeze(['bold', 'italic', 'underline', 'strike', 'color', 'highlight', 'link'] as CharacterFormat[]),
  font: false,
  fontSize: false,
  alignment: true,
  indentation: 'steps',
  spacing: false,
  borders: false,
  shading: false,
  tabs: false,
  styleEditing: false,
  formatPainter: false,
  pageSetup: false,
  pageBackground: false,
  headersFooters: false,
  columns: true,
  pageBreaks: true,
  sectionBreaks: false,
  tables: true,
  images: true,
  imageFormatting: false,
  shapes: false,
}) as Readonly<FormattingPolicy>;

/** Presets por nome (atributo `formatting-policy`). */
export const FORMATTING_POLICY_PRESETS: Readonly<Record<string, Readonly<FormattingPolicy>>> = Object.freeze({
  'template-document': TEMPLATE_DOCUMENT_POLICY,
});

type Flag = Exclude<keyof FormattingPolicy, 'paragraphStyles' | 'characterStyles' | 'lists' | 'character' | 'indentation'>;

/** Política normalizada (o que o editor consulta). */
export interface ResolvedPolicy {
  readonly source: FormattingPolicy;
  /** chaves normalizadas dos estilos permitidos; null = todos */
  readonly styles: ReadonlySet<string> | null;
  readonly charStyles: ReadonlySet<string> | null;
  readonly lists: { readonly bullet: boolean; readonly decimal: boolean; readonly levels: number } | null;
  readonly chars: ReadonlySet<CharacterFormat> | null;
  readonly indentation: boolean | 'steps';
  allows(flag: Flag): boolean;
  char(f: CharacterFormat): boolean;
}

/** Chave de comparação de um estilo: minúsculas, sem espaços/hífens/sublinhados ("heading 1" = "Heading1"). */
export function styleKey(nameOrId: string): string {
  return nameOrId.toLowerCase().replace(/[\s_-]+/g, '');
}

export function resolvePolicy(p: FormattingPolicy | null | undefined): ResolvedPolicy | null {
  if (!p) return null;
  const styles = p.paragraphStyles ? new Set(p.paragraphStyles.map(styleKey)) : null;
  // estilos de parágrafo restritos e nada dito dos de caractere: nenhum de caractere
  const charStyles = p.characterStyles ? new Set(p.characterStyles.map(styleKey)) : styles ? new Set<string>() : null;
  const lists = p.lists ? {
    bullet: p.lists.kinds.includes('bullet'),
    decimal: p.lists.kinds.includes('decimal'),
    levels: Math.max(1, Math.min(9, Math.floor(p.lists.levels ?? 9))),
  } : null;
  const chars = p.character ? new Set(p.character) : null;
  return {
    source: p, styles, charStyles, lists, chars,
    indentation: p.indentation ?? true,
    allows: (flag) => p[flag] !== false,
    char: (f) => !chars || chars.has(f),
  };
}

/** O estilo (pela chave) é permitido? Normal sempre conta como o padrão do documento. */
export function styleAllowed(rp: ResolvedPolicy | null, key: string): boolean {
  return !rp?.styles || rp.styles.has(key);
}

/**
 * Estilo permitido mais próximo de um estilo de origem (chave normalizada), para
 * colar: Título N não permitido → o maior título permitido abaixo dele (Título 5–9
 * → o último título permitido); Título (Title) → Título 1; o resto → Normal.
 * Devolve a chave permitida ou null (= Normal, o padrão do documento).
 */
export function nearestAllowedStyle(rp: ResolvedPolicy | null, key: string): string | null {
  if (styleAllowed(rp, key)) return key === 'normal' ? null : key;
  const styles = rp!.styles!;
  const h = /^heading([1-9])$/.exec(key);
  if (h) {
    for (let n = Number(h[1]) - 1; n >= 1; n--) if (styles.has(`heading${n}`)) return `heading${n}`;
    return null;
  }
  if (key === 'title' && styles.has('heading1')) return 'heading1';
  return null;
}

/** Nome interno (w:name em inglês) de uma chave de estilo, para criar o estilo latente. */
export function builtinNameOfKey(key: string): string | null {
  const h = /^heading([1-9])$/.exec(key);
  if (h) return `heading ${h[1]}`;
  return ({ title: 'Title', subtitle: 'Subtitle', normal: 'Normal' } as Record<string, string>)[key] ?? null;
}

// ─────────────────────── ids das barras ───────────────────────

const CHAR_IDS: Record<CharacterFormat, readonly string[]> = {
  bold: ['bold'],
  italic: ['italic'],
  underline: ['underline', 'underlineMenu'],
  underlineStyles: ['underlineMenu', 'underline:more', 'underline:color'],
  strike: ['strike'],
  doubleStrike: ['doubleStrike'],
  superscript: ['sup'],
  subscript: ['sub'],
  color: ['color', 'color:gradient'],
  highlight: ['highlight', 'highlightMenu'],
  link: ['link'],
  caps: ['allCaps', 'smallCaps'],
  hidden: ['hidden'],
  charSpacing: ['charSpacing'],
  textEffects: ['fx:menu', 'fx:pane'],
};

const FLAG_IDS: Record<Flag, readonly string[]> = {
  font: ['font:family', 'dlg:font', 'fontAccess'],
  fontSize: ['font:size', 'grow', 'shrink', 'dlg:font'],
  alignment: ['align:left', 'align:center', 'align:right', 'align:both'],
  spacing: ['spacing', 'pspacing', 'spacing:before', 'spacing:after', 'spacing:caption',
    'spaceBefore:add', 'spaceBefore:remove', 'spaceAfter:add', 'spaceAfter:remove', 'dlg:paragraph'],
  borders: ['home:borders', 'homeBorders', 'dlg:borders', 'home:hrule'],
  shading: ['shading', 'shadingMenu'],
  tabs: ['dlg:tabs'],
  styleEditing: ['styles:pane', 'styles:paneFoot', 'style:inspector', 'styleInspector', 'style:new', 'style:create',
    'style:modify', 'style:modifyCurrent', 'style:update', 'style:updateCurrent', 'style:rename', 'style:delete',
    'style:togallery', 'style:ungallery', 'list:defineStyle'],
  formatPainter: ['painter'],
  pageSetup: ['page', 'margins', 'orientation', 'pageSize', 'dlg:page', 'view:ruler', 'lineNumbers', 'hyphenation',
    'dlg:lineNumbers', 'dlg:hyphenation'],
  pageBackground: ['background', 'watermark:menu', 'pageColor:menu', 'dlg:pageBorders', 'dlg:pageFill', 'dlg:watermark'],
  headersFooters: ['hf', 'hf:headerMenu', 'hf:footerMenu', 'hf:pgnumMenu', 'hf:editHeader', 'hf:editFooter', 'hf-tools', 'dlg:hfOptions', 'dlg:alignTab'],
  columns: ['columns', 'dlg:columns', 'columnbreak'],
  pageBreaks: ['pagebreak', 'blankPage', 'columnbreak'],
  sectionBreaks: ['sectionbreak', 'sectionbreak:continuous', 'sectionbreak:evenPage', 'sectionbreak:oddPage'],
  tables: ['table', 'tableMenu', 'table:menu', 'table:insertDlg', 'table:fromText', 'table:draw', 'table:excel', 'table:quickMenu'],
  images: ['image'],
  imageFormatting: ['picture', 'pic:menu', 'image-tools', 'pic:ctx:wrap', 'pic:ctx:front', 'pic:ctx:back'],
  shapes: ['textbox:sub', 'textbox:menu', 'textbox:draw', 'textbox:drawVertical', 'shape', 'shp:menu', 'shape-tools', 'cover:menu'],
};

/**
 * Ids das barras, menus, menu de contexto e atalhos que a política oculta (os
 * mesmos de `hidden-commands`), inclusive os atalhos de estilo (Alt+1…3,
 * Ctrl+Shift+N) dos estilos fora dela.
 */
export function policyHiddenIds(rp: ResolvedPolicy | null): string[] {
  if (!rp) return [];
  const out = new Set<string>();
  const add = (ids: readonly string[]): void => { for (const id of ids) out.add(id); };
  for (const f of Object.keys(CHAR_IDS) as CharacterFormat[]) if (!rp.char(f)) add(CHAR_IDS[f]);
  for (const f of Object.keys(FLAG_IDS) as Flag[]) if (!rp.allows(f)) add(FLAG_IDS[f]);
  if (rp.indentation !== true) add(['specialIndent', 'indent:left', 'indent:right', 'indent:caption', 'list:indents', 'dlg:paragraph', 'view:ruler']);
  if (rp.indentation === false) add(['indent', 'outdent']);
  if (rp.styles) {
    // atalhos/menus de estilo que apontam para estilos fora da política; o Sumário,
    // as legendas e o índice de ilustrações aplicam estilos próprios (TOC N, Legenda)
    for (const [id, key] of [['style:normal', 'normal'], ['style:h1', 'heading1'], ['style:h2', 'heading2'], ['style:h3', 'heading3']] as const) {
      if (!rp.styles.has(key)) out.add(id);
    }
    add(['toc', 'toc:sub', 'toc:menu', 'toc:addText', 'toc:mark', 'caption', 'tof', 'tof:update', 'dlg:format:para']);
  }
  if (rp.lists) {
    // só os dois botões (marcador e numerada) com o formato padrão: as galerias
    // (biblioteca, recentes, listas do documento/modelo), vários níveis e definir formato saem
    add(['list:multi', 'list:multiMenu', 'list:bulletMenu', 'list:numberMenu', 'list:defineBullet', 'list:defineNumber',
      'list:defineMultilevel', 'list:defineStyle', 'list:setValue', 'list:indents']);
    if (!rp.lists.bullet) out.add('list:bullet');
    if (!rp.lists.decimal) out.add('list:decimal');
    if (rp.lists.levels <= 1) out.add('list:levelMenu');
  }
  if (!rp.allows('styleEditing') || rp.styles) out.add('styleTools');
  if (!rp.char('underline') && !rp.char('underlineStyles')) out.add('underlineMenu');
  return [...out];
}

/** Botões divididos cujo menu a política tira: viram botão simples (o comando fica). */
export function policySplitsToPlain(rp: ResolvedPolicy | null): Set<string> {
  const out = new Set<string>();
  if (!rp) return out;
  if (rp.lists) { out.add('list:bullet'); out.add('list:decimal'); }
  if (!rp.char('underlineStyles')) out.add('underline');
  return out;
}

// ─────────────────────── colar ───────────────────────

const FONT_KEYS = ['fontAscii'] as const;
const SIZE_KEYS = ['szHalfPt'] as const;
const SPACING_KEYS = ['charSpacingTwips', 'scalePct', 'positionHalfPt', 'kernHalfPt'] as const;

/**
 * Formatação de caractere de um trecho colado, só com o que a política permite
 * (o resto cai e o trecho herda o estilo do parágrafo). Não muda o objeto dado.
 */
export function sanitizeRunProps<T extends Partial<RunProps>>(props: T, rp: ResolvedPolicy | null): T {
  if (!rp) return props;
  const p = { ...props } as Partial<RunProps> & Record<string, unknown>;
  const off = (k: keyof RunProps): void => {
    if (k === 'bold' || k === 'italic' || k === 'underline' || k === 'strike' || k === 'allCaps' || k === 'smallCaps') {
      if (k in p) (p as Record<string, unknown>)[k] = false;
    } else delete p[k];
  };
  if (!rp.allows('font')) for (const k of FONT_KEYS) off(k);
  if (!rp.allows('fontSize')) for (const k of SIZE_KEYS) off(k);
  if (!rp.char('bold')) off('bold');
  if (!rp.char('italic')) off('italic');
  if (!rp.char('underline')) { off('underline'); off('underlineStyle'); off('underlineColor'); off('underlineTheme'); }
  if (!rp.char('underlineStyles')) { off('underlineStyle'); off('underlineColor'); off('underlineTheme'); }
  if (p.doubleStrike && !rp.char('doubleStrike')) {
    // tachado duplo vira o simples, se ele puder
    if (rp.char('strike')) p.strike = true;
    off('doubleStrike');
  }
  if (!rp.char('strike')) off('strike');
  if ((p.vertAlign === 'superscript' && !rp.char('superscript')) || (p.vertAlign === 'subscript' && !rp.char('subscript'))) off('vertAlign');
  if (!rp.char('color')) { off('color'); off('colorTheme'); }
  if (!rp.char('highlight')) off('highlight');
  if (!rp.char('link')) { off('link'); off('linkTip'); }
  if (!rp.char('caps')) { off('allCaps'); off('smallCaps'); }
  if (!rp.char('hidden')) { off('hidden'); off('webHidden'); }
  if (!rp.char('charSpacing')) for (const k of SPACING_KEYS) off(k);
  if (!rp.char('textEffects')) { off('textFx'); off('openType'); }
  if (p.charStyle && rp.charStyles && !rp.charStyles.has(styleKey(p.charStyle))) {
    // o estilo Hyperlink acompanha o link (é o que dá a cor dele)
    if (!(p.link && styleKey(p.charStyle) === 'hyperlink')) off('charStyle');
  }
  return p as T;
}

/** Como o colar resolve estilos: chave de um id (pelo nome) e id de uma chave no destino. */
export interface StyleResolver {
  keyOf(id: string): string;
  idOf(key: string): string | undefined;
}

/**
 * Formatação de parágrafo de uma marca colada, só com o que a política permite:
 * estilo convertido para o permitido mais próximo; alinhamento, recuos,
 * espaçamento, paginação, bordas, sombreamento, tabulações, quebras de página e
 * de seção, nível de tópico e capitular caem. A numeração fica (o editor a
 * converte para marcador/numerada). Não muda o objeto dado.
 */
export function sanitizeParaProps(mark: ParaProps, rp: ResolvedPolicy | null, styles: StyleResolver): ParaProps {
  if (!rp) return mark;
  const m: ParaProps & Record<string, unknown> = { ...mark };
  if (rp.styles) {
    if (m.styleId) {
      const key = nearestAllowedStyle(rp, styles.keyOf(m.styleId));
      const id = key ? styles.idOf(key) : undefined;
      if (id) m.styleId = id; else delete m.styleId;
    }
    // nível de tópico fora do estilo: os títulos são os estilos
    delete m.outlineLvl;
  }
  if (!rp.allows('alignment')) delete m.alignment;
  if (rp.indentation !== true) {
    const left = m.indentLeftTwips;
    delete m.indentLeftTwips; delete m.indentRightTwips; delete m.indentFirstLineTwips;
    // 'steps': fica o recuo em passos de 0,5" (o indent do Quill), arredondado
    if (rp.indentation === 'steps' && left && left > 0 && !m.numbering) {
      const steps = Math.round(left / 720);
      if (steps > 0) m.indentLeftTwips = steps * 720;
    }
  }
  if (!rp.allows('spacing')) {
    for (const k of ['lineTwentieths', 'spaceBeforeTwips', 'spaceAfterTwips', 'spaceBeforeAuto', 'spaceAfterAuto',
      'keepNext', 'keepLines', 'widowControl', 'suppressAutoHyphens', 'textboxTightWrap'] as const) delete m[k];
  }
  if (!rp.allows('borders')) { delete m.borders; delete m.boxBorder; }
  if (!rp.allows('shading')) delete m.shadingHex;
  if (!rp.allows('tabs')) delete m.tabStops;
  if (!rp.allows('pageBreaks')) delete m.pageBreakBefore;
  if (!rp.allows('sectionBreaks') || !rp.allows('pageSetup')) delete m.sectionBreak;
  if (!rp.allows('pageSetup')) delete m.suppressLineNumbers;
  if (!rp.char('textEffects')) delete m.dropCap;
  return m;
}

/** Tipo de lista de um formato de número (w:numFmt): marcador ou numerada. */
export function listKindOfFormat(numFmt: string | undefined): ListKind {
  return numFmt === 'bullet' ? 'bullet' : 'decimal';
}

/**
 * Lista colada sob a política: o tipo permitido (o outro, se só um é permitido)
 * e o nível dentro do limite. null = a política não permite lista: vira parágrafo.
 */
export function policyList(rp: ResolvedPolicy | null, kind: ListKind, level: number): { kind: ListKind; level: number } | null {
  if (!rp?.lists) return { kind, level };
  const l = rp.lists;
  const k: ListKind | null = (kind === 'bullet' ? l.bullet : l.decimal) ? kind : l.bullet ? 'bullet' : l.decimal ? 'decimal' : null;
  return k ? { kind: k, level: Math.max(0, Math.min(l.levels - 1, level)) } : null;
}

// ─────────────────────── API (métodos do elemento) ───────────────────────

/** O que a guarda precisa do elemento (a chave do estilo de um id). */
export interface PolicyGuardHost {
  styleKeyOf(id: string): string;
}

type Guard = (rp: ResolvedPolicy, args: readonly unknown[], host: PolicyGuardHost) => boolean;

const flag = (f: Flag): Guard => (rp) => rp.allows(f);
const ch = (f: CharacterFormat): Guard => (rp) => rp.char(f);
const indentAll: Guard = (rp) => rp.indentation === true;
const listsFree: Guard = (rp) => !rp.lists;
const stylesFree: Guard = (rp) => !rp.styles;
const RUN_PROP: Record<string, CharacterFormat> = {
  bold: 'bold', italic: 'italic', underline: 'underline', strike: 'strike', doubleStrike: 'doubleStrike',
  allCaps: 'caps', smallCaps: 'caps', hidden: 'hidden',
};

/**
 * Métodos públicos do elemento que a política recusa (sem efeito) — inclusive
 * pelos atalhos do teclado, que chamam os mesmos métodos. O valor decide pelos
 * argumentos da chamada.
 */
export const POLICY_GUARDS: Readonly<Record<string, Guard>> = {
  // caractere
  toggleRunProp: (rp, [prop]) => { const f = RUN_PROP[String(prop)]; return !f || rp.char(f); },
  toggleUnderline: (rp, [style]) => rp.char('underline') && (style === undefined || style === 'single' || rp.char('underlineStyles')),
  setUnderline: (rp, [style]) => style === 'none' || (rp.char('underline') && (style === 'single' || style === undefined || rp.char('underlineStyles'))),
  setUnderlineColor: ch('underlineStyles'),
  toggleVertAlign: (rp, [kind]) => rp.char(kind === 'subscript' ? 'subscript' : 'superscript'),
  setFontFamily: flag('font'),
  setDefaultFont: flag('font'),
  setFontSize: flag('fontSize'),
  growFont: flag('fontSize'),
  setFontFormat: (rp) => rp.allows('font') && rp.allows('fontSize') && !rp.chars,
  setColor: ch('color'),
  setHighlight: ch('highlight'),
  setLink: ch('link'),
  insertHyperlink: ch('link'),
  setCharSpacing: ch('charSpacing'),
  setOpenType: ch('textEffects'),
  setTextEffects: ch('textEffects'),
  setTextGradient: ch('textEffects'),
  applyTextEffectPreset: ch('textEffects'),
  copyFormat: flag('formatPainter'),
  // parágrafo
  setAlignment: flag('alignment'),
  indent: (rp) => rp.indentation !== false,
  setSpecialIndent: indentAll,
  setIndentRight: indentAll,
  setParagraphIndents: indentAll,
  setParagraphLayout: (rp, [o]) => {
    const v = (o ?? {}) as Record<string, unknown>;
    return (!('left' in v || 'right' in v) || rp.indentation === true) && (!('before' in v || 'after' in v) || rp.allows('spacing'));
  },
  setLineSpacing: flag('spacing'),
  setSpaceBefore: flag('spacing'),
  setSpaceAfter: flag('spacing'),
  setParagraphFlow: flag('spacing'),
  setShading: flag('shading'),
  toggleBorder: flag('borders'),
  setParagraphBorders: flag('borders'),
  insertHorizontalLine: flag('borders'),
  setTabStops: flag('tabs'),
  setDefaultTabStop: flag('tabs'),
  // estilos
  applyStyle: (rp, [id], host) => !rp.styles || styleAllowed(rp, id === undefined || id === null ? 'normal' : host.styleKeyOf(String(id))),
  createStyle: flag('styleEditing'),
  modifyStyle: flag('styleEditing'),
  renameStyle: flag('styleEditing'),
  deleteStyle: flag('styleEditing'),
  updateStyleFromSelection: flag('styleEditing'),
  setStyleInGallery: flag('styleEditing'),
  createListStyle: (rp) => rp.allows('styleEditing') && !rp.lists,
  modifyListStyle: (rp) => rp.allows('styleEditing') && !rp.lists,
  // listas
  toggleList: (rp, [kind]) => !rp.lists || (kind === 'bullet' ? rp.lists.bullet : rp.lists.decimal),
  applyListLibrary: (rp, [kind, index]) => !rp.lists || index === null || (index === 0 && (kind === 'bullet' ? rp.lists.bullet : rp.lists.decimal)),
  applyMultilevelLibrary: (rp, [index]) => !rp.lists || index === null,
  applyListLevels: listsFree,
  applyListStyle: listsFree,
  defineListLevel: listsFree,
  defineMultilevelList: listsFree,
  setNumberingValue: listsFree,
  setListLevel: (rp, [lvl]) => !rp.lists || Number(lvl) < rp.lists.levels,
  // página, seções e quebras
  insertPageBreak: flag('pageBreaks'),
  insertBlankPage: flag('pageBreaks'),
  insertColumnBreak: (rp) => rp.allows('pageBreaks') && rp.allows('columns'),
  insertSectionBreak: (rp, [kind]) => rp.allows('sectionBreaks') || (kind === 'nextColumn' && rp.allows('columns')),
  setColumns: flag('columns'),
  setPageSetup: flag('pageSetup'),
  setSectionStart: flag('pageSetup'),
  setVerticalAlignment: flag('pageSetup'),
  setLineNumbering: flag('pageSetup'),
  setLineNumberingOptions: flag('pageSetup'),
  toggleLineNumberSuppression: flag('pageSetup'),
  setHyphenation: flag('pageSetup'),
  setHyphenationOptions: flag('pageSetup'),
  applyManualHyphenation: flag('pageSetup'),
  setPageColor: flag('pageBackground'),
  setPageFill: flag('pageBackground'),
  setWatermark: flag('pageBackground'),
  setPageBorders: flag('pageBackground'),
  enterHeaderFooter: flag('headersFooters'),
  insertHeaderFooterTemplate: flag('headersFooters'),
  setDifferentFirstPage: flag('headersFooters'),
  setDifferentOddEven: flag('headersFooters'),
  setHeaderFooterDistance: flag('headersFooters'),
  setPageNumberFormat: flag('headersFooters'),
  // objetos
  insertTable: flag('tables'),
  convertTextToTable: flag('tables'),
  insertImage: flag('images'),
  setImageFormat: flag('imageFormatting'),
  setImageBorder: flag('imageFormatting'),
  setImageCrop: flag('imageFormatting'),
  setImageRecolor: flag('imageFormatting'),
  setImageTransparency: flag('imageFormatting'),
  setImageTransparentColor: flag('imageFormatting'),
  setImageLayout: flag('imageFormatting'),
  setImageWrap: flag('imageFormatting'),
  setImagePosition: flag('imageFormatting'),
  setImageRotation: flag('imageFormatting'),
  insertTextbox: flag('shapes'),
  drawTextbox: flag('shapes'),
  insertCoverPage: flag('shapes'),
  setShapeFill: flag('shapes'),
  setShapeOutline: flag('shapes'),
  setShapeEffect: flag('shapes'),
  setShapeStyle: flag('shapes'),
  setShapeFormat: flag('shapes'),
  // conteúdo que aplica estilos próprios (TOC N, Legenda)
  insertTableOfContents: stylesFree,
  insertTocTemplate: stylesFree,
  insertTableOfFigures: stylesFree,
  insertCaption: stylesFree,
};

// Estilos nas barras do Write: GALERIA da ribbon (widget de galeria de
// @universal-office/ui, miniaturas desenhadas com a formatação REAL do estilo),
// PAINEL de Estilos (painel lateral do framework), diálogo Criar/Modificar
// Estilo e INSPETOR de Estilo. Tudo sobre a API pública do <universal-write>
// (listStyles, styleFormatting, applyStyle, createStyle, modifyStyle…).
import {
  openDialog, openMenu, openPane, pickLabels, promptDialog, symbol,
  type BarContext, type BarItem, type MenuEntry, type PaneHandle, type UiLang,
} from '@universal-office/ui';
import type { StyleFormat } from '@universal-office/docx-core';
import type { UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type { StyleInfo, StyleLook, StyleFilter, StyleKind } from './styles.js';

const T = {
  en: {
    gallery: 'Styles', pane: 'Styles', inspector: 'Style Inspector', createStyle: 'Create a Style', newStyle: 'New Style',
    newStyleTitle: 'Create New Style from Formatting', modifyTitle: 'Modify Style', name: 'Name', type: 'Style type',
    basedOn: 'Style based on', next: 'Style for following paragraph', properties: 'Properties', formatting: 'Formatting',
    linked: 'Linked (paragraph and character)', paragraph: 'Paragraph', character: 'Character',
    addToGallery: 'Add to the Styles gallery', autoUpdate: 'Automatically update', modify: 'Modify…',
    format: 'Format', fontDots: 'Font…', paraDots: 'Paragraph…', ok: 'OK', cancel: 'Cancel',
    update: (n: string) => `Update ${n} to Match Selection`, modifyDots: 'Modify…', rename: 'Rename…', renameTitle: 'Rename Style',
    removeFromGallery: 'Remove from Style Gallery', addGallery: 'Add to Style Gallery', del: (n: string) => `Delete "${n}"…`,
    delConfirm: (n: string) => `Delete all instances of the style "${n}" from the document? Its text will be formatted as Normal.`,
    delete: 'Delete', clearAll: 'Clear All', show: 'Show', recommended: 'Recommended', inUse: 'In use', inDoc: 'In current document',
    all: 'All styles', sort: 'Sort', asRecommended: 'As Recommended', alphabetical: 'Alphabetical', preview: 'Show Preview',
    paraFmt: 'Paragraph formatting', textFmt: 'Text level formatting', plus: 'Plus:', noDirect: '<none>',
    resetPara: 'Reset to Normal Paragraph Style', clearParaFmt: 'Clear Paragraph Formatting',
    clearCharStyle: 'Clear Character Style', clearCharFmt: 'Clear Character Formatting',
    nameTaken: 'There is already a style with this name', empty: 'Type a name for the style',
    kind: { paragraph: 'Paragraph style', character: 'Character style', linked: 'Linked style' },
    sample: 'Sample Text Sample Text Sample Text Sample Text Sample Text Sample Text Sample Text',
    prevPara: 'Previous Paragraph Previous Paragraph Previous Paragraph Previous Paragraph',
    font: 'Font', size: 'Size', bold: 'Bold', italic: 'Italic', underline: 'Underline', strike: 'Strikethrough',
    caps: 'All caps', smallCaps: 'Small caps', color: 'Font color', auto: 'Automatic', charSpacing: 'Character spacing',
    left: 'Left', center: 'Centered', right: 'Right', justify: 'Justified', lineSpacing: 'Line spacing',
    before: 'Space before (pt)', after: 'Space after (pt)', indentLeft: 'Left indent (cm)', indentRight: 'Right indent (cm)',
    special: 'Special indent', firstLine: 'First line', hanging: 'Hanging', none: '(none)', by: 'By (cm)',
    lines: { 240: 'Single', 259: '1.08', 276: '1.15', 360: '1.5 lines', 480: 'Double' } as Record<number, string>,
    d: {
      font: (v: string) => `Font: ${v}`, pt: (v: number) => `${v} pt`, bold: 'Bold', italic: 'Italic', underline: 'Underline',
      strike: 'Strikethrough', caps: 'All caps', smallCaps: 'Small caps', color: (v: string) => `Font color: ${v}`,
      align: (v: string) => v, before: (v: number) => `Space Before: ${v} pt`, after: (v: number) => `After: ${v} pt`,
      line: (v: string) => `Line spacing: ${v}`, indent: (v: string) => `Indent: Left ${v}`, gallery: 'Show in the Styles gallery',
      basedOn: (v: string) => `Based on: ${v}`, next: (v: string) => `Following Style: ${v}`, priority: (v: number) => `Priority: ${v}`,
      style: (v: string) => `Style: ${v}`, highlight: 'Highlight', sup: 'Superscript', sub: 'Subscript', numbering: 'Numbered or bulleted',
      borders: 'Borders', shading: 'Shading', tabs: 'Tab stops', pageBreak: 'Page break before', spacing: (v: string) => `Spacing: ${v}`,
    },
  },
  pt: {
    gallery: 'Estilos', pane: 'Estilos', inspector: 'Inspetor de Estilo', createStyle: 'Criar um Estilo', newStyle: 'Novo Estilo',
    newStyleTitle: 'Criar Novo Estilo a Partir da Formatação', modifyTitle: 'Modificar Estilo', name: 'Nome', type: 'Tipo de estilo',
    basedOn: 'Estilo baseado em', next: 'Estilo do parágrafo seguinte', properties: 'Propriedades', formatting: 'Formatação',
    linked: 'Vinculado (parágrafo e caractere)', paragraph: 'Parágrafo', character: 'Caractere',
    addToGallery: 'Adicionar à galeria de Estilos', autoUpdate: 'Atualizar automaticamente', modify: 'Modificar…',
    format: 'Formatar', fontDots: 'Fonte…', paraDots: 'Parágrafo…', ok: 'OK', cancel: 'Cancelar',
    update: (n: string) => `Atualizar ${n} para Corresponder à Seleção`, modifyDots: 'Modificar…', rename: 'Renomear…', renameTitle: 'Renomear Estilo',
    removeFromGallery: 'Remover da Galeria de Estilos', addGallery: 'Adicionar à Galeria de Estilos', del: (n: string) => `Excluir "${n}"…`,
    delConfirm: (n: string) => `Excluir todas as ocorrências do estilo "${n}" do documento? O texto ficará com o estilo Normal.`,
    delete: 'Excluir', clearAll: 'Limpar Tudo', show: 'Mostrar', recommended: 'Recomendados', inUse: 'Em uso', inDoc: 'No documento atual',
    all: 'Todos os estilos', sort: 'Ordenar', asRecommended: 'Como recomendado', alphabetical: 'Alfabética', preview: 'Mostrar Visualização',
    paraFmt: 'Formatação de parágrafo', textFmt: 'Formatação de nível de texto', plus: 'Mais:', noDirect: '<nenhuma>',
    resetPara: 'Redefinir para o Estilo de Parágrafo Normal', clearParaFmt: 'Limpar Formatação de Parágrafo',
    clearCharStyle: 'Limpar Estilo de Caractere', clearCharFmt: 'Limpar Formatação de Caractere',
    nameTaken: 'Já existe um estilo com esse nome', empty: 'Digite um nome para o estilo',
    kind: { paragraph: 'Estilo de parágrafo', character: 'Estilo de caractere', linked: 'Estilo vinculado' },
    sample: 'Texto de Exemplo Texto de Exemplo Texto de Exemplo Texto de Exemplo Texto de Exemplo Texto de Exemplo',
    prevPara: 'Parágrafo Anterior Parágrafo Anterior Parágrafo Anterior Parágrafo Anterior',
    font: 'Fonte', size: 'Tamanho', bold: 'Negrito', italic: 'Itálico', underline: 'Sublinhado', strike: 'Tachado',
    caps: 'Todas em maiúsculas', smallCaps: 'Versalete', color: 'Cor da fonte', auto: 'Automática', charSpacing: 'Espaçamento entre caracteres',
    left: 'Esquerda', center: 'Centralizado', right: 'Direita', justify: 'Justificado', lineSpacing: 'Espaçamento entre linhas',
    before: 'Espaço antes (pt)', after: 'Espaço depois (pt)', indentLeft: 'Recuo à esquerda (cm)', indentRight: 'Recuo à direita (cm)',
    special: 'Recuo especial', firstLine: 'Primeira linha', hanging: 'Deslocamento', none: '(nenhum)', by: 'Em (cm)',
    lines: { 240: 'Simples', 259: '1,08', 276: '1,15', 360: '1,5 linha', 480: 'Duplo' } as Record<number, string>,
    d: {
      font: (v: string) => `Fonte: ${v}`, pt: (v: number) => `${String(v).replace('.', ',')} pt`, bold: 'Negrito', italic: 'Itálico', underline: 'Sublinhado',
      strike: 'Tachado', caps: 'Todas em maiúsculas', smallCaps: 'Versalete', color: (v: string) => `Cor da fonte: ${v}`,
      align: (v: string) => v, before: (v: number) => `Espaço Antes: ${String(v).replace('.', ',')} pt`, after: (v: number) => `Depois de: ${String(v).replace('.', ',')} pt`,
      line: (v: string) => `Espaçamento entre linhas: ${v}`, indent: (v: string) => `Recuo: À esquerda ${v}`, gallery: 'Mostrar na galeria de Estilos',
      basedOn: (v: string) => `Baseado em: ${v}`, next: (v: string) => `Próximo Estilo: ${v}`, priority: (v: number) => `Prioridade: ${v}`,
      style: (v: string) => `Estilo: ${v}`, highlight: 'Realce', sup: 'Sobrescrito', sub: 'Subscrito', numbering: 'Numeração ou marcadores',
      borders: 'Bordas', shading: 'Sombreamento', tabs: 'Paradas de tabulação', pageBreak: 'Quebra de página antes', spacing: (v: string) => `Espaçamento: ${v}`,
    },
  },
};
type TT = typeof T.en;

export interface StylesEnv {
  ed: UniversalWriteElement;
  app: WriteApp;
  lang: UiLang;
  layer: HTMLElement;
  /** área do documento (o painel acopla à direita) */
  frame: () => DOMRect;
  /** depois de uma ação (foco de volta ao documento + sincronizar) */
  after: () => void;
}

const SAMPLE = 'AaBbCcDd';
const canEdit = (env: StylesEnv): boolean => !env.app.comparing && !env.ed.isProtected();
const ptOf = (tw: number): number => Math.round(tw / 2) / 10;
const cmOf = (tw: number, dec: string): string => (Math.round(tw / 567 * 100) / 100).toFixed(2).replace(/\.?0+$/, '').replace('.', dec);

/** Desenha a amostra de um estilo (fonte/tamanho/cor/negrito… reais) num canvas. */
export function drawSample(
  canvas: HTMLCanvasElement, ed: UniversalWriteElement, look: StyleLook,
  o: { text: string; w: number; h: number; maxPx: number; minPx?: number; paper?: boolean; align?: boolean; autoColor?: string },
): void {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  canvas.width = Math.round(o.w * dpr);
  canvas.height = Math.round(o.h * dpr);
  canvas.style.width = `${o.w}px`;
  canvas.style.height = `${o.h}px`;
  const c = canvas.getContext('2d');
  if (!c) return;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, o.w, o.h);
  if (o.paper) { c.fillStyle = '#ffffff'; c.fillRect(0, 0, o.w, o.h); }
  if (look.shadingHex) { c.fillStyle = `#${look.shadingHex}`; c.fillRect(2, 3, o.w - 4, o.h - 6); }
  const f = ed.canvasFont(look.fontFamily, look.bold, look.italic);
  const px = Math.max(o.minPx ?? 8, Math.min(o.maxPx, look.sizePt * 96 / 72));
  c.font = `${f.italic ? 'italic ' : ''}${f.weight} ${px}px ${f.family}`;
  // cor automática: preto no papel; sem papel (painel), a cor do texto da interface
  c.fillStyle = look.color ? `#${look.color}` : o.autoColor ?? '#000000';
  c.textBaseline = 'alphabetic';
  let text = look.allCaps ? o.text.toUpperCase() : o.text;
  if (look.smallCaps && !look.allCaps) text = text.toUpperCase();
  const tw = c.measureText(text).width;
  const x = o.align && look.alignment === 'center' ? Math.max(4, (o.w - tw) / 2)
    : o.align && look.alignment === 'right' ? Math.max(4, o.w - tw - 4) : 4;
  const y = Math.round(o.h / 2 + px * 0.33);
  if (look.borderTop || look.borderBottom) {
    c.strokeStyle = (look.borderTop ?? look.borderBottom ?? '').split(' ').pop() ?? '#000';
    c.lineWidth = 1;
    if (look.borderTop) { c.beginPath(); c.moveTo(3, 3.5); c.lineTo(o.w - 3, 3.5); c.stroke(); }
    if (look.borderBottom) { c.beginPath(); c.moveTo(3, o.h - 3.5); c.lineTo(o.w - 3, o.h - 3.5); c.stroke(); }
  }
  c.fillText(text, x, y);
  if (look.underline || look.strike) {
    c.fillRect(x, look.strike ? y - px * 0.3 : y + Math.max(1, px * 0.08), Math.min(tw, o.w - x), Math.max(1, px / 16));
  }
}

/** Miniatura da galeria: amostra num papel branco + nome do estilo. */
function renderTile(env: StylesEnv, tile: HTMLElement, s: StyleInfo, W: number, H: number): void {
  const look = env.ed.styleFormatting(s.id);
  tile.replaceChildren();
  const cv = document.createElement('canvas');
  cv.className = 'uw-style-sample';
  const cap = document.createElement('span');
  cap.className = 'uw-style-cap';
  cap.textContent = s.name;
  if (look) drawSample(cv, env.ed, look, { text: SAMPLE, w: W - 4, h: H - 22, maxPx: 22, paper: true, align: false });
  tile.append(cv, cap);
}

/** Galeria de estilos da ribbon (Página Inicial › Estilos). */
export function styleGalleryItem(env: StylesEnv, ui: StylesUI): BarItem {
  const W = 84, H = 64;
  let cache: { key: unknown; list: StyleInfo[]; items: { id: string; label: string; tip: string }[] } | null = null;
  const get = () => {
    const key = env.ed.stylesKey();
    if (!cache || cache.key !== key) {
      const list = env.ed.listStyles('gallery');
      const names = styleNames(env);
      cache = { key, list, items: list.map((s) => ({ id: s.id, label: s.name, tip: describeStyle(env, s, undefined, names) })) };
    }
    return cache;
  };
  const list = (): StyleInfo[] => get().list;
  return {
    gallery: {
      id: 'styles', label: { en: 'Styles', pt: 'Estilos' }, icon: 'style',
      tile: { w: W, h: H }, rows: 1, maxCols: 7, minCols: 3, expandCols: 7,
      supports: () => typeof env.ed.listStyles === 'function',
      isEnabled: () => canEdit(env),
      items: () => get().items,
      version: () => `${env.ed.stylesVersion()}|${env.ed.knownFontFamilies().length}|${env.lang}`,
      selected: () => {
        const cur = env.ed.currentStyles();
        return list().some((s) => s.id === cur.character) ? cur.character : cur.paragraph;
      },
      render: (tile, it) => {
        const s = list().find((x) => x.id === it.id) ?? env.ed.listStyles('all').find((x) => x.id === it.id);
        if (s) renderTile(env, tile, s, W, H);
      },
      onPick: (id) => env.ed.applyStyle(id),
      context: (it) => galleryMenu(env, ui, list().find((x) => x.id === it.id)!),
      footer: () => [
        { id: 'style:create', icon: 'add', label: { en: 'Create a Style', pt: 'Criar um Estilo' }, onClick: () => { void ui.quickCreate(); } },
        'clear',
        { id: 'styles:paneFoot', icon: 'view_sidebar', label: { en: 'Styles pane', pt: 'Painel de estilos' }, shortcut: 'Ctrl+Alt+Shift+S', onClick: () => ui.togglePane() },
      ],
    },
  };
}

/** id → nome de exibição de todos os estilos (descrições). */
function styleNames(env: StylesEnv): Map<string, string> {
  return new Map(env.ed.listStyles('all').map((s) => [s.id, s.name]));
}

/** Menu de uma miniatura (botão direito) / de um item do painel. */
function galleryMenu(env: StylesEnv, ui: StylesUI, s: StyleInfo): MenuEntry[] {
  const L = pickLabels(env.lang, T);
  const ok = canEdit(env);
  const out: MenuEntry[] = [
    { id: 'style:update', icon: 'refresh', label: L.update(s.name), disabled: !ok || s.kind === 'character', onClick: () => { env.ed.updateStyleFromSelection(s.id); env.after(); } },
    { id: 'style:modify', icon: 'edit', label: L.modifyDots, disabled: !ok, onClick: () => { void ui.styleDialog('modify', s.id); } },
    { id: 'style:rename', icon: 'drive_file_rename_outline', label: L.rename, disabled: !ok, onClick: () => { void ui.rename(s); } },
    s.quick
      ? { id: 'style:ungallery', icon: 'bookmark_remove', label: L.removeFromGallery, disabled: !ok, onClick: () => { env.ed.setStyleInGallery(s.id, false); env.after(); } }
      : { id: 'style:togallery', icon: 'bookmark_add', label: L.addGallery, disabled: !ok, onClick: () => { env.ed.setStyleInGallery(s.id, true); env.after(); } },
  ];
  if (!s.builtIn) {
    out.push('-', { id: 'style:delete', icon: 'delete', label: L.del(s.name), disabled: !ok, onClick: () => { void ui.remove(s); } });
  }
  return out;
}

const colorName = (hex: string | undefined, L: TT): string => (hex ? `#${hex}` : L.auto);

/** Descrição do estilo (tooltip do painel e do diálogo), como o Word escreve. */
export function describeStyle(env: StylesEnv, s: StyleInfo, look = env.ed.styleFormatting(s.id), names?: Map<string, string>): string {
  const L = pickLabels(env.lang, T);
  if (!look) return s.name;
  const parts: string[] = [];
  const d = L.d;
  parts.push(`${d.font(look.fontFamily)}, ${d.pt(look.sizePt)}`);
  if (look.bold) parts.push(d.bold);
  if (look.italic) parts.push(d.italic);
  if (look.underline) parts.push(d.underline);
  if (look.strike) parts.push(d.strike);
  if (look.allCaps) parts.push(d.caps);
  if (look.smallCaps) parts.push(d.smallCaps);
  if (look.color) parts.push(d.color(colorName(look.color, L)));
  if (s.kind !== 'character') {
    if (look.alignment !== 'left') parts.push(({ center: L.center, right: L.right, both: L.justify } as const)[look.alignment]);
    if (look.lineTwentieths !== undefined) parts.push(d.line(L.lines[look.lineTwentieths] ?? `${(look.lineTwentieths / 240).toFixed(2)}`));
    if (look.spaceBeforeTwips) parts.push(d.before(ptOf(look.spaceBeforeTwips)));
    if (look.spaceAfterTwips || look.spaceBeforeTwips) parts.push(d.after(ptOf(look.spaceAfterTwips)));
    if (look.indentLeftTwips) parts.push(d.indent(`${cmOf(look.indentLeftTwips, env.lang === 'pt' ? ',' : '.')} cm`));
  }
  parts.push(d.style(L.kind[s.kind]));
  if (s.quick) parts.push(d.gallery);
  parts.push(d.priority(s.priority + 1));
  const nm = names ?? styleNames(env);
  const name = (id?: string): string | undefined => (id ? nm.get(id) ?? id : undefined);
  if (s.basedOn) parts.push(d.basedOn(name(s.basedOn)!));
  if (s.kind !== 'character') parts.push(d.next(name(s.next) ?? s.name));
  return `${s.name}\n${parts.join(', ')}`;
}

/** Descrição da formatação DIRETA (Inspetor). */
function describeDirect(env: StylesEnv, run: Record<string, unknown>, para: Record<string, unknown> | null): string {
  const L = pickLabels(env.lang, T);
  const d = L.d;
  const parts: string[] = [];
  if (para) {
    const a = para['alignment'] as string | undefined;
    if (a) parts.push(({ left: L.left, center: L.center, right: L.right, both: L.justify } as Record<string, string>)[a] ?? a);
    if (para['lineTwentieths'] !== undefined) parts.push(d.line(L.lines[para['lineTwentieths'] as number] ?? String(para['lineTwentieths'])));
    if (para['spaceBeforeTwips'] !== undefined) parts.push(d.before(ptOf(para['spaceBeforeTwips'] as number)));
    if (para['spaceAfterTwips'] !== undefined) parts.push(d.after(ptOf(para['spaceAfterTwips'] as number)));
    if (para['indentLeftTwips'] !== undefined) parts.push(d.indent(`${cmOf(para['indentLeftTwips'] as number, env.lang === 'pt' ? ',' : '.')} cm`));
    if (para['numbering']) parts.push(d.numbering);
    if (para['borders']) parts.push(d.borders);
    if (para['shadingHex']) parts.push(d.shading);
    if (para['tabStops']) parts.push(d.tabs);
    if (para['pageBreakBefore']) parts.push(d.pageBreak);
  } else {
    if (run['fontAscii']) parts.push(d.font(run['fontAscii'] as string));
    if (run['szHalfPt'] !== undefined) parts.push(d.pt((run['szHalfPt'] as number) / 2));
    if (run['bold']) parts.push(d.bold);
    if (run['italic']) parts.push(d.italic);
    if (run['underline']) parts.push(d.underline);
    if (run['strike'] || run['doubleStrike']) parts.push(d.strike);
    if (run['allCaps']) parts.push(d.caps);
    if (run['smallCaps']) parts.push(d.smallCaps);
    if (run['color']) parts.push(d.color(colorName(run['color'] as string, L)));
    if (run['highlight']) parts.push(d.highlight);
    if (run['vertAlign']) parts.push(run['vertAlign'] === 'superscript' ? d.sup : d.sub);
    if (run['charSpacingTwips']) parts.push(d.spacing(d.pt(ptOf(run['charSpacingTwips'] as number))));
  }
  return parts.length ? parts.join(', ') : L.noDirect;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { cls?: string } = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const { cls, ...rest } = props as { cls?: string };
  const e = Object.assign(document.createElement(tag), rest);
  if (cls) e.className = cls;
  e.append(...kids);
  return e;
};

/** Formatação editável no diálogo (valores efetivos). */
interface Draft {
  fontAscii: string; szHalfPt: number; bold: boolean; italic: boolean; underline: boolean; strike: boolean;
  allCaps: boolean; smallCaps: boolean; color?: string; charSpacingTwips: number;
  alignment: 'left' | 'center' | 'right' | 'both'; spaceBeforeTwips: number; spaceAfterTwips: number;
  lineTwentieths?: number; indentLeftTwips: number; indentRightTwips: number; indentFirstLineTwips: number;
}
const draftOf = (l: StyleLook): Draft => ({
  fontAscii: l.fontFamily, szHalfPt: Math.round(l.sizePt * 2), bold: l.bold, italic: l.italic, underline: l.underline,
  strike: l.strike, allCaps: l.allCaps, smallCaps: l.smallCaps, color: l.color, charSpacingTwips: l.charSpacingTwips,
  alignment: l.alignment, spaceBeforeTwips: l.spaceBeforeTwips, spaceAfterTwips: l.spaceAfterTwips, lineTwentieths: l.lineTwentieths,
  indentLeftTwips: l.indentLeftTwips, indentRightTwips: l.indentRightTwips, indentFirstLineTwips: l.indentFirstLineTwips,
});
const lookOfDraft = (d: Draft, base: StyleLook): StyleLook => ({ ...base, ...d, fontFamily: d.fontAscii, sizePt: d.szHalfPt / 2 });
/** O que mudou entre dois rascunhos → StyleFormat (só as chaves tocadas). */
function diff(a: Draft, b: Draft, para: boolean): StyleFormat {
  const f: StyleFormat = {};
  const keys = ['fontAscii', 'szHalfPt', 'bold', 'italic', 'underline', 'strike', 'allCaps', 'smallCaps', 'color', 'charSpacingTwips',
    ...(para ? ['alignment', 'spaceBeforeTwips', 'spaceAfterTwips', 'lineTwentieths', 'indentLeftTwips', 'indentRightTwips', 'indentFirstLineTwips'] : [])] as (keyof Draft)[];
  for (const k of keys) {
    if (a[k] === b[k]) continue;
    (f as Record<string, unknown>)[k] = b[k] === undefined ? null : b[k];
  }
  return f;
}

/** Painel de Estilos, diálogos e Inspetor — um por barra montada. */
export class StylesUI {
  private pane: PaneHandle | null = null;
  private inspector: PaneHandle | null = null;
  private filter: StyleFilter = 'recommended';
  private alpha = false;
  private preview = false;
  private listEl: HTMLElement | null = null;
  private lastKey = '';
  private inspRows: { pStyle: HTMLElement; pDirect: HTMLElement; tStyle: HTMLElement; tDirect: HTMLElement } | null = null;

  constructor(private readonly env: StylesEnv) {
    this.filter = (env.app.prefs.get('stylesFilter') as StyleFilter | null) ?? 'recommended';
    this.alpha = env.app.prefs.get('stylesSort') === 'alpha';
    this.preview = env.app.prefs.get('stylesPreview') === '1';
  }

  private get L(): TT { return pickLabels(this.env.lang, T); }

  /** Galeria da ribbon (Página Inicial › Estilos). */
  galleryItem(): BarItem { return styleGalleryItem(this.env, this); }

  get paneOpen(): boolean { return !!this.pane?.open; }
  get inspectorOpen(): boolean { return !!this.inspector?.open; }

  // ── painel de estilos ──
  togglePane(): void {
    if (this.pane?.open) { this.pane.close(); return; }
    const { env } = this;
    const L = this.L;
    const body = el('div', { cls: 'uw-styles' });
    const sel = (name: string, opts: [string, string][], v: string, on: (v: string) => void): HTMLSelectElement => {
      const s = el('select', { name });
      for (const [k, t] of opts) s.append(el('option', { value: k, textContent: t }));
      s.value = v;
      s.addEventListener('change', () => { on(s.value); this.lastKey = ''; this.renderList(); });
      return s;
    };
    const opts = el('div', { cls: 'uw-styles-opts' },
      sel('filter', [['recommended', L.recommended], ['inUse', L.inUse], ['document', L.inDoc], ['all', L.all]], this.filter,
        (v) => { this.filter = v as StyleFilter; env.app.prefs.set('stylesFilter', v); }),
      sel('sort', [['prio', L.asRecommended], ['alpha', L.alphabetical]], this.alpha ? 'alpha' : 'prio',
        (v) => { this.alpha = v === 'alpha'; env.app.prefs.set('stylesSort', v === 'alpha' ? 'alpha' : ''); }));
    const prev = el('input', { type: 'checkbox', checked: this.preview });
    prev.addEventListener('change', () => { this.preview = prev.checked; env.app.prefs.set('stylesPreview', prev.checked ? '1' : ''); this.lastKey = ''; this.renderList(); });
    this.listEl = el('div', { cls: 'uw-styles-list' });
    this.listEl.setAttribute('role', 'listbox');
    body.append(opts, this.listEl, el('label', { cls: 'uo-check uw-styles-prev' }, prev, L.preview));
    const foot = el('div');
    const btn = (icon: string, label: string, a: string, fn: () => void): HTMLButtonElement => {
      const b = el('button', { type: 'button', cls: 'uo-btn', title: label });
      b.dataset['a'] = a;
      b.setAttribute('aria-label', label);
      b.innerHTML = symbol(icon);
      b.addEventListener('click', fn);
      return b;
    };
    foot.append(
      btn('add', L.newStyle, 'styles:new', () => { void this.styleDialog('new'); }),
      btn('manage_search', L.inspector, 'styles:inspector', () => this.toggleInspector()),
    );
    this.pane = openPane({
      id: 'styles', title: L.pane, lang: env.lang, layer: env.layer, width: 280, body, footer: foot,
      frame: env.frame,
      onClose: () => { this.pane = null; this.listEl = null; env.ed.classList.remove('uw-has-pane'); this.placeInspector(); env.after(); },
    });
    env.ed.classList.add('uw-has-pane');
    this.lastKey = '';
    this.renderList();
    this.placeInspector();
  }

  private renderList(): void {
    const box = this.listEl;
    if (!box) return;
    const { env } = this;
    const cur = env.ed.currentStyles();
    const key = `${env.ed.stylesKey()}|${this.filter}|${this.alpha}|${this.preview}|${cur.paragraph}|${cur.character}|${env.ed.knownFontFamilies().length}|${canEdit(env)}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    let list = env.ed.listStyles(this.filter);
    if (this.alpha) list = [...list].sort((a, b) => a.name.localeCompare(b.name, env.lang === 'pt' ? 'pt-BR' : 'en'));
    const ok = canEdit(env);
    const names = styleNames(env);
    box.replaceChildren(...list.map((s) => {
      const row = el('div', { cls: 'uw-style-row' });
      row.dataset['id'] = s.id;
      row.setAttribute('role', 'option');
      row.title = describeStyle(env, s, undefined, names);
      const on = s.id === cur.character || (s.id === cur.paragraph && !list.some((x) => x.id === cur.character));
      row.classList.toggle('uo-on', on);
      row.setAttribute('aria-selected', String(on));
      const name = el('span', { cls: 'uw-style-name' });
      if (this.preview) {
        const look = env.ed.styleFormatting(s.id);
        const cv = document.createElement('canvas');
        if (look) drawSample(cv, env.ed, look, { text: s.name, w: 190, h: 24, maxPx: 18, minPx: 9, autoColor: getComputedStyle(box).color });
        name.append(cv);
      } else name.textContent = s.name;
      const mark = el('span', { cls: 'uw-style-kind', textContent: ({ paragraph: '¶', character: 'a', linked: '¶a' } as Record<StyleKind, string>)[s.kind] });
      const more = el('button', { type: 'button', cls: 'uo-btn uw-style-more', title: this.L.modifyDots });
      more.innerHTML = symbol('arrow_drop_down');
      more.addEventListener('mousedown', (e) => e.preventDefault());
      more.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = more.getBoundingClientRect();
        openMenu(galleryMenu(env, this, s), { x: r.left, y: r.bottom }, { lang: env.lang, layer: env.layer, onClose: () => env.after() });
      });
      row.append(name, mark, more);
      row.addEventListener('mousedown', (e) => e.preventDefault());
      row.addEventListener('click', () => { if (ok) { env.ed.applyStyle(s.id); env.after(); } });
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openMenu(galleryMenu(env, this, s), { x: e.clientX, y: e.clientY }, { lang: env.lang, layer: env.layer, onClose: () => env.after() });
      });
      return row;
    }));
  }

  // ── inspetor ──
  toggleInspector(): void {
    if (this.inspector?.open) { this.inspector.close(); return; }
    const { env } = this;
    const L = this.L;
    const body = el('div', { cls: 'uw-insp' });
    const row = (value: HTMLElement, icon: string, tip: string, a: string, fn: () => void): HTMLElement => {
      const b = el('button', { type: 'button', cls: 'uo-btn', title: tip });
      b.dataset['a'] = a;
      b.setAttribute('aria-label', tip);
      b.innerHTML = symbol(icon);
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => { fn(); env.after(); });
      return el('div', { cls: 'uw-insp-row' }, value, b);
    };
    const box = (): HTMLElement => el('div', { cls: 'uw-insp-val' });
    const r = { pStyle: box(), pDirect: box(), tStyle: box(), tDirect: box() };
    body.append(
      el('div', { cls: 'uw-insp-h', textContent: L.paraFmt }),
      row(r.pStyle, 'format_clear', L.resetPara, 'insp:resetPara', () => env.ed.clearParagraphStyle()),
      row(r.pDirect, 'format_clear', L.clearParaFmt, 'insp:clearPara', () => env.ed.clearParagraphFormatting()),
      el('div', { cls: 'uw-insp-h', textContent: L.textFmt }),
      row(r.tStyle, 'format_clear', L.clearCharStyle, 'insp:clearCharStyle', () => env.ed.clearCharacterStyle()),
      row(r.tDirect, 'format_clear', L.clearCharFmt, 'insp:clearChar', () => env.ed.clearCharacterFormatting()),
    );
    this.inspRows = r;
    const foot = el('div');
    const pill = (label: string, a: string, fn: () => void): HTMLButtonElement => {
      const b = el('button', { type: 'button', cls: 'uo-pill', textContent: label });
      b.dataset['a'] = a;
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', fn);
      return b;
    };
    foot.append(
      pill(L.newStyle, 'insp:new', () => { void this.styleDialog('new'); }),
      pill(L.clearAll, 'insp:clearAll', () => { env.ed.clearFormatting(); env.after(); }),
    );
    this.inspector = openPane({
      id: 'styleInspector', title: L.inspector, lang: env.lang, layer: env.layer, width: 300, body, footer: foot,
      frame: () => this.inspectorFrame(),
      onClose: () => { this.inspector = null; this.inspRows = null; env.after(); },
    });
    this.inspector.el.classList.add('uw-insp-pane');
    this.syncInspector();
  }

  private inspectorFrame(): DOMRect {
    const f = this.env.frame();
    const right = this.pane?.open ? f.right - 290 : f.right - 12;
    return new DOMRect(right - 300, f.top + 12, 300, Math.min(330, f.height - 24));
  }
  private placeInspector(): void { this.inspector?.place(); }

  private syncInspector(): void {
    const r = this.inspRows;
    if (!r) return;
    const i = this.env.ed.inspectStyle();
    r.pStyle.textContent = i.paragraph.name;
    r.pDirect.textContent = `${this.L.plus} ${describeDirect(this.env, {}, i.paragraph.direct as Record<string, unknown>)}`;
    r.tStyle.textContent = i.text.name;
    r.tDirect.textContent = `${this.L.plus} ${describeDirect(this.env, i.text.direct as Record<string, unknown>, null)}`;
  }

  /** Chamado a cada sync da barra. */
  sync(): void {
    if (this.pane?.open) { this.pane.place(); this.renderList(); }
    if (this.inspector?.open) { this.inspector.place(); this.syncInspector(); }
  }

  close(): void { this.pane?.close(); this.inspector?.close(); }

  // ── diálogos ──
  /** "Criar um Estilo" (galeria): nome + visualização; Modificar… abre o completo. */
  async quickCreate(): Promise<void> {
    const { env } = this;
    const L = this.L;
    if (!canEdit(env)) return;
    const input = el('input', { type: 'text', value: this.freeName() });
    const look = this.selectionLook();
    const cv = document.createElement('canvas');
    if (look) drawSample(cv, env.ed, look, { text: SAMPLE, w: 360, h: 56, maxPx: 30, paper: true, align: true });
    const msg = el('div', { cls: 'uw-style-msg' });
    const body = el('div', { cls: 'uw-style-quick' }, el('label', { cls: 'uo-field' }, el('span', { textContent: L.name }), input), cv, msg);
    let action: string | null = null;
    const h = openDialog({
      title: L.newStyleTitle, body, layer: env.layer, lang: env.lang, width: 420,
      actions: [{ id: 'modify', label: L.modify }, { id: 'cancel', label: L.cancel }, { id: 'ok', label: L.ok, primary: true }],
      onAction: (id) => {
        if (id === 'cancel') return true;
        const name = input.value.trim();
        if (!name) { msg.textContent = L.empty; return false; }
        if (env.ed.listStyles('all').some((s) => s.name.toLowerCase() === name.toLowerCase())) { msg.textContent = L.nameTaken; return false; }
        return true;
      },
    });
    action = await h.result;
    if (action === 'ok') { env.ed.createStyle({ name: input.value.trim() }); env.after(); }
    else if (action === 'modify') await this.styleDialog('new', undefined, input.value.trim());
  }

  private freeName(): string {
    const names = new Set(this.env.ed.listStyles('all').map((s) => s.name.toLowerCase()));
    const base = this.env.lang === 'pt' ? 'Estilo' : 'Style';
    for (let i = 1; ; i++) if (!names.has(`${base}${i}`.toLowerCase())) return `${base}${i}`;
  }

  /** Formatação efetiva no cursor: o estilo do parágrafo + o direto da seleção. */
  private selectionLook(): StyleLook | null {
    const ed = this.env.ed;
    const base = ed.styleFormatting(ed.currentStyles().paragraph);
    if (!base) return null;
    const f = ed.selectionStyleFormat();
    const out = { ...base };
    for (const [k, v] of Object.entries(f)) if (v !== null && v !== undefined) (out as Record<string, unknown>)[k === 'fontAscii' ? 'fontFamily' : k === 'szHalfPt' ? 'sizePt' : k] = k === 'szHalfPt' ? (v as number) / 2 : v;
    return out;
  }

  /** Criar Novo Estilo / Modificar Estilo (diálogo completo). */
  async styleDialog(mode: 'new' | 'modify', id?: string, presetName?: string): Promise<void> {
    const { env } = this;
    const ed = env.ed;
    const L = this.L;
    if (!canEdit(env)) return;
    const all = ed.listStyles('all');
    const info = id ? all.find((s) => s.id === id) : undefined;
    if (mode === 'modify' && !info) return;
    const dec = env.lang === 'pt' ? ',' : '.';
    let kind: StyleKind = info?.kind ?? 'linked';
    const cur = ed.currentStyles().paragraph;
    // ponto de partida: o estilo (modificar) ou a formatação da seleção (novo)
    const startLook = mode === 'modify' ? ed.styleFormatting(id!)! : this.selectionLook()!;
    if (!startLook) return;
    const start = draftOf(startLook);
    const draft: Draft = { ...start };

    const nameIn = el('input', { type: 'text', value: info?.name ?? presetName ?? this.freeName() });
    const typeSel = el('select', { name: 'type' });
    for (const [k, t] of [['linked', L.linked], ['paragraph', L.paragraph], ['character', L.character]] as const) typeSel.append(el('option', { value: k, textContent: t }));
    typeSel.value = kind;
    typeSel.disabled = mode === 'modify';
    const baseSel = el('select', { name: 'basedOn' });
    const nextSel = el('select', { name: 'next' });
    const fillBases = (): void => {
      baseSel.replaceChildren();
      nextSel.replaceChildren();
      const paraStyles = all.filter((s) => s.kind !== 'character' && s.id !== id);
      const charStyles = all.filter((s) => s.kind !== 'paragraph' && s.id !== id);
      const opts = kind === 'character' ? charStyles : paraStyles;
      if (kind === 'character') baseSel.append(el('option', { value: '', textContent: L.none }));
      for (const s of opts) baseSel.append(el('option', { value: s.id, textContent: s.name }));
      baseSel.value = info?.basedOn ?? (kind === 'character' ? '' : cur);
      if (kind !== 'character') {
        nextSel.append(el('option', { value: '', textContent: nameIn.value.trim() || L.none }));
        for (const s of paraStyles) nextSel.append(el('option', { value: s.id, textContent: s.name }));
        nextSel.value = info?.next && info.next !== id ? info.next : '';
      }
      nextSel.disabled = kind === 'character';
    };
    fillBases();
    typeSel.addEventListener('change', () => { kind = typeSel.value as StyleKind; fillBases(); refresh(); });

    // formatação rápida
    const families = await ed.listAvailableFonts();
    const fontSel = el('select', { name: 'font' });
    for (const f of draft.fontAscii && !families.includes(draft.fontAscii) ? [draft.fontAscii, ...families] : families) fontSel.append(el('option', { value: f, textContent: f }));
    fontSel.value = draft.fontAscii;
    const sizeIn = el('input', { type: 'number', name: 'size', min: '1', max: '1638', step: '0.5', value: String(draft.szHalfPt / 2) });
    sizeIn.style.width = '64px';
    const tog = (k: 'bold' | 'italic' | 'underline', icon: string, tip: string): HTMLButtonElement => {
      const b = el('button', { type: 'button', cls: 'uo-btn', title: tip });
      b.dataset['a'] = `dlg:${k}`;
      b.innerHTML = symbol(icon);
      const upd = (): void => { b.classList.toggle('uo-on', draft[k]); b.setAttribute('aria-pressed', String(draft[k])); };
      b.addEventListener('click', () => { draft[k] = !draft[k]; upd(); refresh(); });
      upd();
      return b;
    };
    const colorIn = el('input', { type: 'color', name: 'color', value: `#${draft.color ?? '000000'}` });
    colorIn.style.cssText = 'width:40px;height:30px;padding:2px;border-radius:8px';
    const alignBtns = (['left', 'center', 'right', 'both'] as const).map((a) => {
      const b = el('button', { type: 'button', cls: 'uo-btn', title: ({ left: L.left, center: L.center, right: L.right, both: L.justify })[a] });
      b.dataset['a'] = `dlg:align:${a}`;
      b.innerHTML = symbol(a === 'both' ? 'format_align_justify' : `format_align_${a}`);
      b.addEventListener('click', () => { draft.alignment = a; syncAlign(); refresh(); });
      return b;
    });
    const syncAlign = (): void => alignBtns.forEach((b, i) => b.classList.toggle('uo-on', (['left', 'center', 'right', 'both'] as const)[i] === draft.alignment));
    syncAlign();
    const lineSel = el('select', { name: 'line' });
    for (const v of [240, 259, 276, 360, 480]) lineSel.append(el('option', { value: String(v), textContent: L.lines[v]! }));
    if (draft.lineTwentieths !== undefined && ![240, 259, 276, 360, 480].includes(draft.lineTwentieths)) {
      lineSel.append(el('option', { value: String(draft.lineTwentieths), textContent: (draft.lineTwentieths / 240).toFixed(2).replace('.', dec) }));
    }
    lineSel.value = String(draft.lineTwentieths ?? 240);
    const num = (v: number, step: string, name: string): HTMLInputElement => {
      const i = el('input', { type: 'number', name, min: '0', step, value: String(v) });
      i.style.width = '72px';
      return i;
    };
    const beforeIn = num(ptOf(draft.spaceBeforeTwips), '6', 'before');
    const afterIn = num(ptOf(draft.spaceAfterTwips), '6', 'after');
    const indentIn = num(Math.round(draft.indentLeftTwips / 567 * 100) / 100, '0.25', 'indentLeft');
    const read = (): void => {
      draft.fontAscii = fontSel.value;
      const sz = parseFloat(sizeIn.value.replace(',', '.'));
      if (sz > 0) draft.szHalfPt = Math.round(sz * 2);
      const hex = colorIn.value.slice(1).toUpperCase();
      if (hex !== (start.color ?? '000000') || draft.color !== start.color) draft.color = hex === '000000' && !start.color ? undefined : hex;
      draft.lineTwentieths = Number(lineSel.value);
      draft.spaceBeforeTwips = Math.round(Number(beforeIn.value.replace(',', '.')) * 20) || 0;
      draft.spaceAfterTwips = Math.round(Number(afterIn.value.replace(',', '.')) * 20) || 0;
      draft.indentLeftTwips = Math.round(Number(indentIn.value.replace(',', '.')) * 567) || 0;
    };
    for (const i of [fontSel, sizeIn, colorIn, lineSel, beforeIn, afterIn, indentIn]) i.addEventListener('change', () => { read(); refresh(); });

    const formatBtn = el('button', { type: 'button', cls: 'uo-pill', textContent: `${L.format} ▾` });
    formatBtn.dataset['a'] = 'dlg:format';
    formatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const r = formatBtn.getBoundingClientRect();
      openMenu([
        { id: 'dlg:format:font', icon: 'text_format', label: L.fontDots, onClick: () => { void this.fontSub(draft).then(refresh); } },
        { id: 'dlg:format:para', icon: 'format_textdirection_l_to_r', label: L.paraDots, disabled: kind === 'character', onClick: () => { void this.paraSub(draft).then(() => { syncAlign(); beforeIn.value = String(ptOf(draft.spaceBeforeTwips)); afterIn.value = String(ptOf(draft.spaceAfterTwips)); indentIn.value = String(Math.round(draft.indentLeftTwips / 567 * 100) / 100); lineSel.value = String(draft.lineTwentieths ?? 240); refresh(); }); } },
      ], { x: r.left, y: r.top - 4 }, { lang: env.lang, layer: env.layer });
    });

    const cv = document.createElement('canvas');
    cv.className = 'uw-style-prev';
    const desc = el('div', { cls: 'uw-style-desc' });
    const quick = el('input', { type: 'checkbox', checked: info?.quick ?? true });
    const auto = el('input', { type: 'checkbox', checked: info?.autoUpdate ?? false });
    const msg = el('div', { cls: 'uw-style-msg' });
    const refresh = (): void => {
      const look = lookOfDraft(draft, startLook);
      drawPreview(cv, ed, look, L, kind);
      const fake: StyleInfo = {
        id: id ?? '', name: nameIn.value.trim() || '…', rawName: '', kind, builtIn: !!info?.builtIn, defined: true, quick: quick.checked,
        hidden: false, priority: info?.priority ?? 0, inUse: false, isDefault: false,
        basedOn: baseSel.value || undefined, next: nextSel.value || undefined, autoUpdate: auto.checked,
      };
      desc.textContent = describeStyle(env, fake, look).split('\n')[1] ?? '';
      for (const b of alignBtns) b.disabled = kind === 'character';
      for (const i of [lineSel, beforeIn, afterIn, indentIn]) i.disabled = kind === 'character';
    };
    nameIn.addEventListener('input', () => { fillBases(); refresh(); });
    for (const i of [baseSel, nextSel, quick, auto]) i.addEventListener('change', refresh);

    const grid = el('div', { cls: 'uo-dialog-grid' },
      el('span', { textContent: L.name }), nameIn,
      el('span', { textContent: L.type }), typeSel,
      el('span', { textContent: L.basedOn }), baseSel,
      el('span', { textContent: L.next }), nextSel);
    const fmtRow1 = el('div', { cls: 'uw-style-fmt' }, fontSel, sizeIn, tog('bold', 'format_bold', L.bold), tog('italic', 'format_italic', L.italic),
      tog('underline', 'format_underlined', L.underline), colorIn);
    const fmtRow2 = el('div', { cls: 'uw-style-fmt' }, ...alignBtns, el('span', { textContent: L.lineSpacing }), lineSel);
    const fmtRow3 = el('div', { cls: 'uw-style-fmt' }, el('span', { textContent: L.before }), beforeIn, el('span', { textContent: L.after }), afterIn,
      el('span', { textContent: L.indentLeft }), indentIn);
    const checks = el('div', { cls: 'uw-style-checks' },
      el('label', { cls: 'uo-check' }, quick, L.addToGallery), el('label', { cls: 'uo-check' }, auto, L.autoUpdate));
    const body = el('div', { cls: 'uw-style-dlg' },
      el('strong', { textContent: L.properties }), grid,
      el('strong', { textContent: L.formatting }), fmtRow1, fmtRow2, fmtRow3, cv, desc, checks, el('div', {}, formatBtn), msg);
    refresh();
    const h = openDialog({
      title: mode === 'new' ? L.newStyleTitle : L.modifyTitle, body, layer: env.layer, lang: env.lang, width: 560,
      actions: [{ id: 'cancel', label: L.cancel }, { id: 'ok', label: L.ok, primary: true }],
      onAction: (a) => {
        if (a !== 'ok') return true;
        read();
        const name = nameIn.value.trim();
        if (!name) { msg.textContent = L.empty; return false; }
        if (all.some((s) => s.id !== id && s.name.toLowerCase() === name.toLowerCase())) { msg.textContent = L.nameTaken; return false; }
        return true;
      },
    });
    if ((await h.result) !== 'ok') return;
    const name = nameIn.value.trim();
    if (mode === 'new') {
      // o estilo guarda só o que difere do estilo base (como o Word)
      const baseLook = baseSel.value ? ed.styleFormatting(baseSel.value) : ed.styleFormatting(ed.currentStyles().paragraph);
      const format = baseLook ? diff(draftOf(baseLook), draft, kind !== 'character') : {};
      for (const k of Object.keys(format)) if ((format as Record<string, unknown>)[k] === null) delete (format as Record<string, unknown>)[k];
      ed.createStyle({ name, type: kind, basedOn: baseSel.value || undefined, next: nextSel.value || undefined, quick: quick.checked, autoUpdate: auto.checked, format, fromSelection: false });
    } else {
      ed.modifyStyle(id!, {
        name: name !== info!.name ? name : undefined,
        basedOn: baseSel.value && baseSel.value !== info!.basedOn ? baseSel.value : undefined,
        next: kind === 'character' ? undefined : (nextSel.value || null) !== (info!.next && info!.next !== id ? info!.next : null) ? (nextSel.value || null) : undefined,
        quick: quick.checked !== info!.quick ? quick.checked : undefined,
        autoUpdate: auto.checked !== info!.autoUpdate ? auto.checked : undefined,
        format: diff(start, draft, kind !== 'character'),
      });
    }
    env.after();
  }

  /** Formatar › Fonte… (rascunho do estilo). */
  private async fontSub(d: Draft): Promise<void> {
    const L = this.L;
    const box = (k: keyof Draft, label: string): HTMLLabelElement => {
      const i = el('input', { type: 'checkbox', checked: !!d[k] });
      i.name = k;
      return el('label', { cls: 'uo-check' }, i, label);
    };
    const spacing = el('input', { type: 'number', name: 'charSpacing', step: '0.5', value: String(ptOf(d.charSpacingTwips)) });
    const body = el('div', { cls: 'uw-style-sub' },
      el('div', { cls: 'uw-style-fx' },
        box('bold', L.bold), box('italic', L.italic), box('underline', L.underline), box('strike', L.strike), box('allCaps', L.caps), box('smallCaps', L.smallCaps)),
      el('label', { cls: 'uo-field' }, el('span', { textContent: `${L.charSpacing} (pt)` }), spacing));
    const h = openDialog({ title: L.font, body, layer: this.env.layer, lang: this.env.lang, width: 380, actions: [{ id: 'cancel', label: L.cancel }, { id: 'ok', label: L.ok, primary: true }] });
    if ((await h.result) !== 'ok') return;
    for (const k of ['bold', 'italic', 'underline', 'strike', 'allCaps', 'smallCaps'] as const) d[k] = (body.querySelector<HTMLInputElement>(`input[name="${k}"]`)!).checked;
    d.charSpacingTwips = Math.round(Number(spacing.value.replace(',', '.')) * 20) || 0;
  }

  /** Formatar › Parágrafo… (recuos à direita e especial). */
  private async paraSub(d: Draft): Promise<void> {
    const L = this.L;
    const right = el('input', { type: 'number', name: 'indentRight', min: '0', step: '0.25', value: String(Math.round(d.indentRightTwips / 567 * 100) / 100) });
    const special = el('select', { name: 'special' });
    for (const [k, t] of [['none', L.none], ['firstLine', L.firstLine], ['hanging', L.hanging]] as const) special.append(el('option', { value: k, textContent: t }));
    special.value = !d.indentFirstLineTwips ? 'none' : d.indentFirstLineTwips > 0 ? 'firstLine' : 'hanging';
    const by = el('input', { type: 'number', name: 'by', min: '0', step: '0.25', value: String(Math.round(Math.abs(d.indentFirstLineTwips) / 567 * 100) / 100 || 1.25) });
    const body = el('div', { cls: 'uo-dialog-grid' },
      el('span', { textContent: L.indentRight }), right, el('span', { textContent: L.special }), special, el('span', { textContent: L.by }), by);
    const h = openDialog({ title: L.paragraph, body, layer: this.env.layer, lang: this.env.lang, width: 380, actions: [{ id: 'cancel', label: L.cancel }, { id: 'ok', label: L.ok, primary: true }] });
    if ((await h.result) !== 'ok') return;
    d.indentRightTwips = Math.round(Number(right.value.replace(',', '.')) * 567) || 0;
    const v = Math.round(Number(by.value.replace(',', '.')) * 567) || 0;
    d.indentFirstLineTwips = special.value === 'none' ? 0 : special.value === 'firstLine' ? v : -v;
  }

  async rename(s: StyleInfo): Promise<void> {
    const L = this.L;
    const v = await promptDialog({ title: L.renameTitle, label: L.name, value: s.name, layer: this.env.layer, lang: this.env.lang });
    if (v === null || !v.trim() || v.trim() === s.name) return;
    if (!this.env.ed.renameStyle(s.id, v.trim())) this.env.app.ui?.flash(L.nameTaken);
    this.env.after();
  }

  async remove(s: StyleInfo): Promise<void> {
    const L = this.L;
    const h = openDialog({ title: L.del(s.name).replace(/…$/, ''), body: L.delConfirm(s.name), layer: this.env.layer, lang: this.env.lang, icon: 'delete',
      actions: [{ id: 'cancel', label: L.cancel }, { id: 'ok', label: L.delete, primary: true }] });
    if ((await h.result) === 'ok') this.env.ed.deleteStyle(s.id);
    this.env.after();
  }
}

/** Visualização do diálogo: parágrafo anterior (cinza), o exemplo no estilo e o seguinte. */
function drawPreview(cv: HTMLCanvasElement, ed: UniversalWriteElement, look: StyleLook, L: TT, kind: StyleKind): void {
  const W = 508, H = 96;
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  cv.width = W * dpr; cv.height = H * dpr;
  cv.style.width = `${W}px`; cv.style.height = `${H}px`;
  const c = cv.getContext('2d');
  if (!c) return;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#a0a0a0';
  c.font = '9px sans-serif';
  c.fillText(L.prevPara, 8, 14);
  const inner = document.createElement('canvas');
  drawSample(inner, ed, look, { text: kind === 'character' ? L.sample.split(' ').slice(0, 4).join(' ') : L.sample, w: W - 16, h: 46, maxPx: 28, minPx: 8, align: kind !== 'character' });
  c.drawImage(inner, 8, 22, W - 16, 46);
  c.fillStyle = '#a0a0a0';
  c.font = '9px sans-serif';
  c.fillText(L.prevPara, 8, 84);
}

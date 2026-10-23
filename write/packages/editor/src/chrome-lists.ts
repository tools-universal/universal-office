// LISTAS da guia Página Inicial: botões divididos Marcadores e Numeração (galerias com
// Usados Recentemente, Biblioteca e do Documento; Alterar Nível da Lista; Definir Novo
// Marcador/Formato de Número; Definir Valor de Numeração), Lista de Vários Níveis (Lista
// Atual, Biblioteca, Listas no Documento, Estilos de Lista; Definir Nova Lista de Vários
// Níveis e Novo Estilo de Lista) e os itens do menu de contexto (Reiniciar em 1, Continuar
// Numeração, Ajustar Recuos da Lista). Só DECLARA sobre a API pública do <universal-write>;
// regras do Word medidas em write/tools/home-lab (exp-lists/listkeys/listcmds/liststyle).
import {
  openDialog, pickLabels, tileGrid,
  type BarContext, type Command, type CommandRegistry, type MenuEntry, type UiLang,
} from '@universal-office/ui';
import { formatNumber } from '@universal-office/docx-layout';
import type { ListLevelFormat, ListLevelSpec, UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type { ChromeCtl } from './chrome-commands.js';
import type { WidgetEnv } from './chrome-widgets.js';
import type { DialogEnv } from './chrome-dialogs.js';
import { colorButton, type Pick } from './chrome-borders.js';

const L = (en: string, pt: string): { en: string; pt: string } => ({ en, pt });
const tr = (lang: UiLang, en: string, pt: string): string => pickLabels(lang, { en, pt });

type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { style?: string };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props<K> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
const select = (opts: readonly (readonly [string, string])[], value: string): HTMLSelectElement => {
  const s = el('select', { style: 'width:auto;min-width:120px' });
  for (const [v, t] of opts) s.append(el('option', { value: v, textContent: t }));
  s.value = value;
  return s;
};
const row = (...kids: (Node | string)[]): HTMLElement => el('div', { style: 'display:flex;align-items:center;gap:8px' }, ...kids);
const group = (title: string, ...kids: Node[]): HTMLElement =>
  el('fieldset', { style: 'border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:6px;padding:6px 10px;display:flex;flex-direction:column;gap:8px' },
    el('legend', { textContent: title }), ...kids);
/** cm ↔ twips (2 casas, vírgula no português), como os outros diálogos */
const cmText = (lang: UiLang, tw: number): string => (Math.round((tw / 1440) * 254) / 100).toFixed(2).replace('.', tr(lang, '.', ','));
const cmInput = (lang: UiLang, tw: number): HTMLInputElement => el('input', { type: 'text', inputMode: 'decimal', value: `${cmText(lang, tw)} cm`, style: 'width:90px' });
const twOf = (s: string): number | undefined => {
  const n = parseFloat(s.replace(',', '.').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? Math.round((n / 2.54) * 1440) : undefined;
};

/** Estilos de número do Word (os da lista "Estilo de número"), na ordem dele. */
export const NUMBER_STYLES: [string, { en: string; pt: string }][] = [
  ['decimal', L('1, 2, 3, ...', '1, 2, 3, ...')], ['upperRoman', L('I, II, III, ...', 'I, II, III, ...')],
  ['lowerRoman', L('i, ii, iii, ...', 'i, ii, iii, ...')], ['upperLetter', L('A, B, C, ...', 'A, B, C, ...')],
  ['lowerLetter', L('a, b, c, ...', 'a, b, c, ...')], ['ordinal', L('1st, 2nd, 3rd, ...', '1º, 2º, 3º, ...')],
  ['cardinalText', L('One, Two, Three, ...', 'Um, Dois, Três, ...')], ['ordinalText', L('First, Second, Third, ...', 'Primeiro, Segundo, Terceiro, ...')],
  ['decimalZero', L('01, 02, 03, ...', '01, 02, 03, ...')], ['none', L('(none)', '(nenhum)')],
];

const docLang = (lang: UiLang): string => (lang === 'pt' ? 'pt-BR' : 'en-US');

/** Texto do número de um nível com os valores dados (o motor numera igual). */
export function markerText(levels: readonly ListLevelSpec[], ilvl: number, values: readonly number[], lang: UiLang): string {
  const lvl = levels.find((l) => l.ilvl === ilvl);
  if (!lvl) return '';
  if (lvl.numFmt === 'bullet') return lvl.lvlText;
  return lvl.lvlText.replace(/%([1-9])/g, (_m, k: string) => {
    const i = Number(k) - 1;
    const src = levels.find((l) => l.ilvl === i);
    const fmt = lvl.isLgl && i !== ilvl ? 'decimal' : (src?.numFmt ?? 'decimal');
    return formatNumber(values[i] ?? src?.start ?? 1, fmt === 'bullet' ? 'decimal' : fmt, docLang(lang));
  });
}

/** Marcador/número com a face com que o canvas o desenha (ou o equivalente Unicode). */
function markerSpan(ed: UniversalWriteElement, text: string, lvl: ListLevelSpec | undefined, sizePx: number): HTMLElement {
  const p = lvl?.numFmt === 'bullet' ? ed.markerPreview(text, lvl.font) : { text, css: lvl?.font ? `"${ed.canvasFont(lvl.font).family}"` : 'inherit' };
  return el('span', { textContent: p.text, style: `font-family:${p.css};font-size:${sizePx}px;line-height:1;white-space:pre${lvl?.bold ? ';font-weight:700' : ''}${lvl?.italic ? ';font-style:italic' : ''}${lvl?.color ? `;color:#${lvl.color}` : ''}` });
}

const bar = (w: string): HTMLElement => el('span', { style: `display:inline-block;height:2px;width:${w};background:color-mix(in srgb, currentColor 35%, transparent);border-radius:1px` });

/**
 * Miniatura de uma lista (galerias): marcador grande no centro; numeração com 3 itens;
 * vários níveis com os 3 primeiros níveis recuados.
 */
export function listTile(ed: UniversalWriteElement, levels: readonly ListLevelSpec[], kind: 'bullet' | 'number' | 'multi', lang: UiLang): HTMLElement {
  const box = el('div', { style: 'width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;gap:9px;padding:6px 8px;box-sizing:border-box;overflow:hidden' });
  if (kind === 'bullet') {
    box.style.alignItems = 'center';
    const l0 = levels.find((l) => l.ilvl === 0);
    box.append(markerSpan(ed, l0?.lvlText ?? '', l0, 22));
    return box;
  }
  const rows = kind === 'number' ? [[0, 1], [0, 2], [0, 3]] : [[0, 1], [1, 1], [2, 1]];
  for (const [ilvl, v] of rows) {
    const lvl = levels.find((l) => l.ilvl === ilvl);
    const values = [1, 1, 1, 1, 1, 1, 1, 1, 1];
    values[ilvl!] = v!;
    const txt = markerText(levels, ilvl!, values, lang);
    box.append(el('div', { style: `display:flex;align-items:center;gap:4px;padding-left:${kind === 'multi' ? ilvl! * 9 : 0}px` },
      markerSpan(ed, txt, lvl, 10), bar('100%')));
  }
  return box;
}

const NONE = '__none';
const noneTile = (lang: UiLang, small = false): HTMLElement => el('div', { textContent: tr(lang, 'None', 'Nenhum'), style: `width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:${small ? 9 : 12}px` });

/** Formatos usados por último (Usados Recentemente), por sessão como no Word. */
function recents(app: WriteApp, kind: 'bullet' | 'number'): ListLevelSpec[][] {
  const a = app as unknown as { listRecents?: Record<string, ListLevelSpec[][]> };
  return ((a.listRecents ??= {})[kind] ??= []);
}
export function rememberList(app: WriteApp, kind: 'bullet' | 'number', levels: ListLevelSpec[]): void {
  const r = recents(app, kind);
  const key = (x: ListLevelSpec[]): string => JSON.stringify(x[0] ?? {});
  const i = r.findIndex((x) => key(x) === key(levels));
  if (i >= 0) r.splice(i, 1);
  r.unshift(levels);
  if (r.length > 7) r.length = 7;
}

/** Nível 0 de uma lista como formato do diálogo (aplicar um formato da galeria "do Documento"). */
const formatOf = (l: ListLevelSpec): ListLevelFormat => ({
  ...(l.numFmt === 'bullet' ? { bullet: l.lvlText } : { numFmt: l.numFmt, lvlText: l.lvlText.replace(/%[1-9]/g, '%1') }),
  align: l.jc ?? 'left', ...(l.font ? { font: l.font } : {}), ...(l.bold ? { bold: true } : {}), ...(l.italic ? { italic: true } : {}),
  ...(l.sizePt ? { sizePt: l.sizePt } : {}), ...(l.color ? { color: l.color } : {}),
});

/** Botão dividido Marcadores / Numeração: as galerias do Word. */
export function listMenu(env: WidgetEnv, ctx: BarContext, kind: 'bullet' | 'number'): MenuEntry[] {
  const ed = env.ed, lang = langOf(ctx);
  const lib = ed.listLibrary(kind);
  const docs = ed.documentLists().filter((d) => d.kind === kind).map((d) => d.levels);
  const rec = recents(env.app, kind);
  const all = new Map<string, ListLevelSpec[]>();
  const sec = (prefix: string, lists: ListLevelSpec[][]): { id: string; label: { en: string; pt: string } }[] => lists.map((lv, i) => {
    const id = `${prefix}${i}`;
    all.set(id, lv);
    const l0 = lv.find((l) => l.ilvl === 0);
    return { id, label: L(l0?.lvlText ?? '', l0?.lvlText ?? '') };
  });
  const tile = kind === 'bullet' ? { w: 44, h: 44 } : { w: 80, h: 80 };
  return [
    {
      content: (close) => tileGrid({
        sections: [
          { label: kind === 'bullet' ? L('Recently Used Bullets', 'Marcadores Usados Recentemente') : L('Recently Used Number Formats', 'Formatos de Número Usados Recentemente'), items: sec('r', rec) },
          { label: kind === 'bullet' ? L('Bullet Library', 'Biblioteca de Marcadores') : L('Numbering Library', 'Biblioteca de Numeração'), items: [{ id: NONE, label: L('None', 'Nenhum') }, ...sec('l', lib)] },
          { label: kind === 'bullet' ? L('Document Bullets', 'Marcadores do Documento') : L('Document Number Formats', 'Formatos de Número do Documento'), items: sec('d', docs) },
        ],
        tile, cols: kind === 'bullet' ? 7 : 3, close, text: (l) => ctx.registry.text(l),
        render: (b, it) => { b.replaceChildren(it.id === NONE ? noneTile(lang, kind === 'bullet') : listTile(ed, all.get(it.id)!, kind, lang)); },
        onPick: (id) => {
          if (id === NONE) ed.removeList();
          else if (id.startsWith('l')) { ed.applyListLibrary(kind, Number(id.slice(1))); rememberList(env.app, kind, all.get(id)!); }
          else { const lv = all.get(id)!; ed.defineListLevel(formatOf(lv[0]!)); rememberList(env.app, kind, lv); }
          ctx.after();
        },
      }),
    },
    '-',
    { id: 'list:levelMenu', label: L('Change List Level', 'Alterar Nível da Lista'), icon: 'format_indent_increase', disabled: !ed.listInfo(), submenu: () => levelMenu(env, ctx) },
    kind === 'bullet' ? 'list:defineBullet' : 'list:defineNumber',
    ...(kind === 'number' ? ['list:setValue'] : []),
  ];
}

/** Lista de Vários Níveis: Lista Atual, Biblioteca, Listas no Documento Atual, Estilos de Lista. */
export function multilevelMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed, lang = langOf(ctx);
  const info = ed.listInfo();
  const all = new Map<string, ListLevelSpec[]>();
  const put = (id: string, lv: ListLevelSpec[], label: string): { id: string; label: { en: string; pt: string } } => { all.set(id, lv); return { id, label: L(label, label) }; };
  const cur = info && info.levels.length ? [put('c', info.levels, tr(lang, 'Current List', 'Lista Atual'))] : [];
  const lib = ed.listLibrary('multilevel').map((lv, i) => put(`l${i}`, lv, markerText(lv, 0, [1], lang)));
  const docs = ed.documentLists().map((d, i) => put(`d${i}`, d.levels, markerText(d.levels, 0, [1], lang)));
  const styles = ed.listStylesInDocument().map((s) => put(`s:${s.id}`, s.levels, s.name));
  return [
    {
      content: (close) => tileGrid({
        sections: [
          { label: L('Current List', 'Lista Atual'), items: cur },
          { label: L('List Library', 'Biblioteca de Listas'), items: [{ id: NONE, label: L('None', 'Nenhum') }, ...lib] },
          { label: L('Lists in Current Documents', 'Listas nos Documentos Atuais'), items: docs },
          { label: L('List Styles', 'Estilos de Lista'), items: styles },
        ],
        tile: { w: 80, h: 80 }, cols: 3, close, text: (l) => ctx.registry.text(l),
        render: (b, it) => { b.replaceChildren(it.id === NONE ? noneTile(lang) : listTile(ed, all.get(it.id)!, 'multi', lang)); },
        onPick: (id) => {
          if (id === NONE) ed.removeList();
          else if (id === 'c') { /* já é a lista do cursor */ }
          else if (id.startsWith('l')) ed.applyMultilevelLibrary(Number(id.slice(1)));
          else if (id.startsWith('s:')) ed.applyListStyle(id.slice(2));
          else ed.applyListLevels(all.get(id)!);
          ctx.after();
        },
      }),
    },
    '-',
    { id: 'list:levelMenu', label: L('Change List Level', 'Alterar Nível da Lista'), icon: 'format_indent_increase', disabled: !info, submenu: () => levelMenu(env, ctx) },
    'list:defineMultilevel', 'list:defineStyle',
  ];
}

/** Alterar Nível da Lista: os 9 níveis da lista do cursor, com o marcador de cada um. */
export function levelMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed, lang = langOf(ctx);
  const info = ed.listInfo();
  if (!info) return [];
  const levels = info.levels;
  return [{
    content: (close) => tileGrid({
      sections: [{ items: levels.map((l) => ({ id: String(l.ilvl), label: L(`Level ${l.ilvl + 1}`, `Nível ${l.ilvl + 1}`) })) }],
      tile: { w: 220, h: 24 }, cols: 1, close, text: (l) => ctx.registry.text(l), selected: String(info.ilvl),
      render: (b, it) => {
        const ilvl = Number(it.id);
        const lvl = levels.find((l) => l.ilvl === ilvl);
        b.replaceChildren(el('div', { style: `display:flex;align-items:center;gap:6px;width:100%;padding-left:${6 + ilvl * 12}px;box-sizing:border-box` },
          markerSpan(ed, markerText(levels, ilvl, [1, 1, 1, 1, 1, 1, 1, 1, 1], lang), lvl, 12), bar('60%')));
      },
      onPick: (id) => { ed.setListLevel(Number(id)); ctx.after(); },
    }),
  }];
}

const langOf = (ctx: BarContext): UiLang => (ctx.registry.text(L('en', 'pt')) === 'pt' ? 'pt' : 'en');

export type ListDialogKind = 'bullet' | 'number' | 'value' | 'multilevel' | 'style' | 'indents';

export function registerListCommands(reg: CommandRegistry, ed: UniversalWriteElement, app: WriteApp, ctl: ChromeCtl): void {
  const canEdit = (): boolean => !app.comparing && !ed.isProtected();
  const has = (m: string) => (): boolean => typeof (ed as unknown as Record<string, unknown>)[m] === 'function';
  const inList = (): boolean => canEdit() && !!ed.listInfo();
  const numbered = (): boolean => canEdit() && ed.listInfo()?.kind === 'number';
  const cmds: Command[] = [
    { id: 'list:defineBullet', label: L('Define New Bullet…', 'Definir Novo Marcador...'), supports: has('defineListLevel'), isEnabled: canEdit, run: () => ctl.listDialog('bullet') },
    { id: 'list:defineNumber', label: L('Define New Number Format…', 'Definir Novo Formato de Número...'), supports: has('defineListLevel'), isEnabled: canEdit, run: () => ctl.listDialog('number') },
    { id: 'list:setValue', label: L('Set Numbering Value…', 'Definir Valor de Numeração...'), icon: 'numbers', supports: has('setNumberingValue'), isEnabled: numbered, run: () => ctl.listDialog('value') },
    { id: 'list:defineMultilevel', label: L('Define New Multilevel List…', 'Definir Nova Lista de Vários Níveis...'), supports: has('defineMultilevelList'), isEnabled: canEdit, run: () => ctl.listDialog('multilevel') },
    { id: 'list:defineStyle', label: L('Define New List Style…', 'Definir Novo Estilo de Lista...'), supports: has('createListStyle'), isEnabled: canEdit, run: () => ctl.listDialog('style') },
    { id: 'list:indents', label: L('Adjust List Indents…', 'Ajustar Recuos da Lista...'), icon: 'format_indent_increase', supports: has('defineMultilevelList'), isEnabled: inList, run: () => ctl.listDialog('indents') },
    { id: 'list:restart', label: L('Restart at 1', 'Reiniciar em 1'), icon: 'restart_alt', supports: has('restartNumbering'), isEnabled: numbered, run: () => ed.restartNumbering() },
    { id: 'list:continue', label: L('Continue Numbering', 'Continuar Numeração'), icon: 'arrow_forward', supports: has('continueNumbering'), isEnabled: numbered, run: () => { ed.continueNumbering(); } },
  ];
  reg.add(...cmds);
}

// ───────────────────────── diálogos ─────────────────────────

export async function openListDialog(env: DialogEnv, families: string[], kind: ListDialogKind): Promise<void> {
  switch (kind) {
    case 'bullet': return bulletDialog(env, families);
    case 'number': return numberDialog(env, families);
    case 'value': return valueDialog(env);
    case 'multilevel': return multilevelDialog(env, families, false);
    case 'indents': return indentsDialog(env);
    case 'style': return multilevelDialog(env, families, true);
  }
}

async function ask(env: DialogEnv, title: string, body: HTMLElement, width = 420): Promise<boolean> {
  const h = openDialog({ title, body, layer: env.layer, lang: env.lang, width,
    actions: [{ id: 'cancel', label: env.app.ui!.L.cancel }, { id: 'ok', label: 'OK', primary: true }] });
  return (await h.result) === 'ok';
}

/** Formatação do número/marcador (botão Fonte… dos diálogos): fonte, estilo, tamanho e cor. */
type MarkFont = Pick2<ListLevelSpec, 'font' | 'bold' | 'italic' | 'sizePt' | 'color'>;
type Pick2<T, K extends keyof T> = { [P in K]?: T[P] };

async function markFontDialog(env: DialogEnv, families: string[], cur: MarkFont): Promise<MarkFont | null> {
  const lang = env.lang;
  const fams = cur.font && !families.includes(cur.font) ? [cur.font, ...families] : families;
  const font = select([['', tr(lang, '(same as text)', '(a do texto)')], ...fams.map((f): [string, string] => [f, f])], cur.font ?? '');
  const style = select([['r', tr(lang, 'Regular', 'Normal')], ['i', tr(lang, 'Italic', 'Itálico')], ['b', tr(lang, 'Bold', 'Negrito')], ['bi', tr(lang, 'Bold Italic', 'Negrito Itálico')]],
    `${cur.bold ? 'b' : ''}${cur.italic ? 'i' : ''}` || 'r');
  const size = el('input', { type: 'text', inputMode: 'decimal', value: cur.sizePt ? String(cur.sizePt).replace('.', tr(lang, '.', ',')) : '', placeholder: tr(lang, '(text)', '(do texto)'), style: 'width:80px' });
  const pick: Pick = cur.color ? { hex: cur.color } : { hex: 'auto' };
  const color = colorButton(env, pick, env.app.ui!.L.automatic);
  const body = el('div', { style: 'display:grid;grid-template-columns:auto 1fr;gap:8px 12px;align-items:center' },
    tr(lang, 'Font:', 'Fonte:'), font, tr(lang, 'Font style:', 'Estilo da fonte:'), style, tr(lang, 'Size:', 'Tamanho:'), size, tr(lang, 'Font color:', 'Cor da fonte:'), color.el);
  if (!await ask(env, tr(lang, 'Font', 'Fonte'), body, 380)) return null;
  const sz = parseFloat(size.value.replace(',', '.'));
  const c = color.value();
  return {
    ...(font.value ? { font: font.value } : {}), ...(style.value.includes('b') ? { bold: true } : {}), ...(style.value.includes('i') ? { italic: true } : {}),
    ...(Number.isFinite(sz) && sz >= 1 && sz <= 1638 ? { sizePt: Math.round(sz * 2) / 2 } : {}), ...(c.hex !== 'auto' ? { color: c.hex.toUpperCase() } : {}),
  };
}

/** Fontes de símbolo oferecidas primeiro no diálogo Símbolo. */
const SYMBOL_FONTS = ['Symbol', 'Wingdings', 'Wingdings 2', 'Wingdings 3', 'Webdings'];
/** Faixas Unicode das fontes comuns no diálogo Símbolo (as fontes de símbolo usam F020–F0FF). */
const TEXT_RANGES: [number, number][] = [[0x21, 0x7e], [0xa1, 0x17f], [0x2010, 0x203a], [0x2190, 0x21ff], [0x2200, 0x22ff], [0x25a0, 0x25ff], [0x2600, 0x26ff], [0x2700, 0x27bf]];

/** Diálogo Símbolo (Definir Novo Marcador › Símbolo…): fonte + grade de caracteres. */
async function symbolDialog(env: DialogEnv, families: string[], cur: { char: string; font?: string }): Promise<{ char: string; font: string } | null> {
  const lang = env.lang, ed = env.ed;
  const fonts = [...SYMBOL_FONTS, ...families.filter((f) => !SYMBOL_FONTS.includes(f))];
  const font = select(fonts.map((f): [string, string] => [f, f]), cur.font && fonts.includes(cur.font) ? cur.font : 'Symbol');
  const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(16, 28px);gap:2px;max-height:260px;overflow:auto;padding:2px', tabIndex: 0 });
  const code = el('input', { type: 'text', style: 'width:80px' });
  let chosen = cur.char;
  const paint = (): void => {
    const f = font.value;
    const sym = SYMBOL_FONTS.includes(f);
    const cps: number[] = [];
    if (sym) for (let c = 0xf020; c <= 0xf0ff; c++) cps.push(c);
    else for (const [a, b] of TEXT_RANGES) for (let c = a; c <= b; c++) cps.push(c);
    // a fonte instalada pelo nome (CSS) mostra os glifos reais; sem ela, a face do canvas
    const css = `"${f}", ${ed.canvasFont(f).family === f ? '' : `"${ed.canvasFont(f).family}", `}sans-serif`;
    grid.replaceChildren(...cps.map((cp) => {
      const ch = String.fromCodePoint(cp);
      const b = el('button', { type: 'button', textContent: ch, title: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`,
        style: `width:28px;height:28px;padding:0;font-family:${css};font-size:16px;line-height:1;border:1px solid color-mix(in srgb, currentColor 20%, transparent);border-radius:3px;background:transparent;color:inherit${ch === chosen ? ';outline:2px solid var(--uo-accent, #1a73e8)' : ''}` });
      b.dataset['cp'] = String(cp);
      b.addEventListener('click', () => { chosen = ch; code.value = cp.toString(16).toUpperCase(); for (const x of grid.children) (x as HTMLElement).style.outline = ''; b.style.outline = '2px solid var(--uo-accent, #1a73e8)'; });
      b.addEventListener('dblclick', () => { chosen = ch; h.close('ok'); });
      return b;
    }));
  };
  code.addEventListener('change', () => {
    const cp = parseInt(code.value, 16);
    if (Number.isFinite(cp) && cp > 0x1f && cp <= 0x10ffff) { chosen = String.fromCodePoint(cp); paint(); }
  });
  font.addEventListener('change', paint);
  void ed.ensureFontLoaded(font.value);
  code.value = (chosen.codePointAt(0) ?? 0).toString(16).toUpperCase();
  paint();
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px' }, row(tr(lang, 'Font:', 'Fonte:'), font), grid, row(tr(lang, 'Character code:', 'Código do caractere:'), code));
  const h = openDialog({ title: tr(lang, 'Symbol', 'Símbolo'), body, layer: env.layer, lang, width: 540,
    actions: [{ id: 'cancel', label: env.app.ui!.L.cancel }, { id: 'ok', label: 'OK', primary: true }] });
  return (await h.result) === 'ok' && chosen ? { char: chosen, font: font.value } : null;
}

/** Visualização de um nível com 3 itens (linhas cinza), como a do Word. */
function levelPreview(ed: UniversalWriteElement, lang: UiLang, levels: () => ListLevelSpec[], ilvl: () => number): { el: HTMLElement; paint: () => void } {
  const box = el('div', { style: 'height:120px;border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:4px;padding:10px 16px;display:flex;flex-direction:column;gap:10px;overflow:hidden;background:#fff;color:#000' });
  const paint = (): void => {
    const lv = levels(), k = ilvl();
    const lvl = lv.find((l) => l.ilvl === k);
    box.replaceChildren(...[1, 2, 3].map((v) => {
      const values = [1, 1, 1, 1, 1, 1, 1, 1, 1];
      values[k] = (lvl?.start ?? 1) + v - 1;
      const jc = lvl?.jc ?? 'left';
      const mk = markerSpan(ed, markerText(lv, k, values, lang), lvl, 13);
      const cell = el('span', { style: `display:inline-flex;justify-content:${jc === 'right' ? 'flex-end' : jc === 'center' ? 'center' : 'flex-start'};width:36px;flex:none` }, mk);
      return el('div', { style: 'display:flex;align-items:center;gap:8px' }, cell, bar('100%'));
    }));
  };
  paint();
  return { el: box, paint };
}

/** Nível atual do cursor (ou o 1º da biblioteca do tipo) para começar os diálogos. */
function startLevel(ed: UniversalWriteElement, kind: 'bullet' | 'number'): { levels: ListLevelSpec[]; ilvl: number } {
  const info = ed.listInfo();
  if (info?.level && (info.level.numFmt === 'bullet') === (kind === 'bullet')) return { levels: info.levels.map((l) => ({ ...l })), ilvl: info.ilvl };
  return { levels: (ed.listLibrary(kind)[0] ?? []).map((l) => ({ ...l })), ilvl: info?.ilvl ?? 0 };
}

const ALIGNS = (lang: UiLang): [string, string][] => [['left', tr(lang, 'Left', 'Esquerda')], ['center', tr(lang, 'Centered', 'Centralizado')], ['right', tr(lang, 'Right', 'Direita')]];

/** Definir Novo Marcador: Símbolo…, Fonte…, alinhamento e visualização. */
async function bulletDialog(env: DialogEnv, families: string[]): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const st = startLevel(ed, 'bullet');
  const lvl = (): ListLevelSpec => st.levels.find((l) => l.ilvl === st.ilvl) ?? (st.levels[st.ilvl] = { ilvl: st.ilvl, numFmt: 'bullet', lvlText: '•', indLeft: 720, hanging: 360 });
  const align = select(ALIGNS(lang), lvl().jc ?? 'left');
  const prev = levelPreview(ed, lang, () => st.levels, () => st.ilvl);
  const symBtn = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Symbol...', 'Símbolo...') });
  const fontBtn = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Font...', 'Fonte...') });
  // Imagem…: o arquivo vira o marcador (w:numPicBullet); a miniatura mostra o escolhido
  const picBtn = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Picture...', 'Imagem...') });
  const thumb = el('img', { alt: '', style: 'height:24px;max-width:48px;object-fit:contain;display:none' });
  let picture: { data: Uint8Array; ext: string; name: string } | null = null;
  picBtn.addEventListener('click', () => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/png,image/jpeg,image/gif' });
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const ext = ({ 'image/jpeg': 'jpeg', 'image/gif': 'gif' } as Record<string, string>)[file.type] ?? 'png';
      picture = { data: new Uint8Array(await file.arrayBuffer()), ext, name: file.name.replace(/\.[^.]+$/, '') };
      thumb.src = URL.createObjectURL(file);
      thumb.style.display = '';
    });
    input.click();
  });
  symBtn.addEventListener('click', async () => {
    const r = await symbolDialog(env, families, { char: lvl().lvlText, font: lvl().font });
    if (r) { Object.assign(lvl(), { lvlText: r.char, font: r.font }); picture = null; thumb.style.display = 'none'; prev.paint(); }
  });
  fontBtn.addEventListener('click', async () => {
    const r = await markFontDialog(env, families, lvl());
    if (r) { const l = lvl(); delete l.bold; delete l.italic; delete l.sizePt; delete l.color; Object.assign(l, r); prev.paint(); }
  });
  align.addEventListener('change', () => { lvl().jc = align.value as 'left'; prev.paint(); });
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:12px' },
    group(tr(lang, 'Bullet character', 'Caractere de marcador'), row(symBtn, picBtn, fontBtn, thumb)),
    row(tr(lang, 'Alignment:', 'Alinhamento:'), align),
    group(tr(lang, 'Preview', 'Visualização'), prev.el));
  if (!await ask(env, tr(lang, 'Define New Bullet', 'Definir Novo Marcador'), body)) return;
  const l = lvl();
  const f: ListLevelFormat = { ...(picture ? { picture } : { bullet: l.lvlText }), align: align.value as 'left', ...(l.font ? { font: l.font } : {}), ...(l.bold ? { bold: true } : {}), ...(l.italic ? { italic: true } : {}), ...(l.sizePt ? { sizePt: l.sizePt } : {}), ...(l.color ? { color: l.color } : {}) };
  ed.defineListLevel(f);
  rememberList(env.app, 'bullet', [{ ...l, jc: f.align }]);
}

/** Definir Novo Formato de Número: estilo, texto do formato (o número em destaque), Fonte…, alinhamento. */
async function numberDialog(env: DialogEnv, families: string[]): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const st = startLevel(ed, 'number');
  const k = st.ilvl;
  const lvl = (): ListLevelSpec => st.levels.find((l) => l.ilvl === k) ?? (st.levels[k] = { ilvl: k, numFmt: 'decimal', lvlText: `%${k + 1}.`, indLeft: 720 * (k + 1), hanging: 360 });
  const cur = lvl();
  const style = select(NUMBER_STYLES.map(([v, l]): [string, string] => [v, pickLabels(lang, l)]), NUMBER_STYLES.some(([v]) => v === cur.numFmt) ? cur.numFmt : 'decimal');
  // o texto do formato com o número de exemplo (o Word o mostra sombreado); o 1º número
  // de exemplo vira o %n ao confirmar
  const sample = (): string => (style.value === 'none' ? '' : formatNumber(1, style.value, docLang(lang)));
  const toText = (lvlText: string): string => lvlText.replace(new RegExp(`%${k + 1}`), () => sample());
  const fmt = el('input', { type: 'text', value: toText(cur.lvlText), style: 'width:180px' });
  const fromText = (): string => {
    const s = sample();
    const i = s ? fmt.value.indexOf(s) : -1;
    return i < 0 ? `${fmt.value}%${k + 1}` : `${fmt.value.slice(0, i)}%${k + 1}${fmt.value.slice(i + s.length)}`;
  };
  const align = select(ALIGNS(lang), cur.jc ?? 'left');
  const prev = levelPreview(ed, lang, () => st.levels, () => k);
  const fontBtn = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Font...', 'Fonte...') });
  let lastSample = sample();
  style.addEventListener('change', () => {
    const s = sample();
    fmt.value = lastSample && fmt.value.includes(lastSample) ? fmt.value.replace(lastSample, () => s) : `${s}${fmt.value}`;
    lastSample = s;
    Object.assign(lvl(), { numFmt: style.value, lvlText: fromText() });
    prev.paint();
  });
  fmt.addEventListener('input', () => { lvl().lvlText = fromText(); prev.paint(); });
  align.addEventListener('change', () => { lvl().jc = align.value as 'left'; prev.paint(); });
  fontBtn.addEventListener('click', async () => {
    const r = await markFontDialog(env, families, lvl());
    if (r) { const l = lvl(); delete l.font; delete l.bold; delete l.italic; delete l.sizePt; delete l.color; Object.assign(l, r); prev.paint(); }
  });
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:12px' },
    group(tr(lang, 'Number format', 'Formato de número'),
      row(tr(lang, 'Number style:', 'Estilo de número:'), style, fontBtn),
      row(tr(lang, 'Number format:', 'Formato de número:'), fmt)),
    row(tr(lang, 'Alignment:', 'Alinhamento:'), align),
    group(tr(lang, 'Preview', 'Visualização'), prev.el));
  if (!await ask(env, tr(lang, 'Define New Number Format', 'Definir Novo Formato de Número'), body)) return;
  const l = lvl();
  ed.defineListLevel({ numFmt: style.value, lvlText: fromText(), align: align.value as 'left', start: l.start ?? 1,
    ...(l.font ? { font: l.font } : {}), ...(l.bold ? { bold: true } : {}), ...(l.italic ? { italic: true } : {}), ...(l.sizePt ? { sizePt: l.sizePt } : {}), ...(l.color ? { color: l.color } : {}) });
  rememberList(env.app, 'number', [{ ...l, numFmt: style.value, lvlText: fromText(), jc: align.value as 'left' }]);
}

/** Definir Valor de Numeração: iniciar nova lista / continuar a anterior (avançar valor). */
async function valueDialog(env: DialogEnv): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const info = ed.numberingValueInfo();
  if (!info) return;
  const radio = (v: string, label: string, on: boolean): { el: HTMLLabelElement; input: HTMLInputElement } => {
    const input = el('input', { type: 'radio', name: 'uw-numval', value: v, checked: on });
    return { el: el('label', { className: 'uo-check' }, input, label), input };
  };
  const fresh = radio('new', tr(lang, 'Start new list', 'Iniciar nova lista'), true);
  const cont = radio('continue', tr(lang, 'Continue from previous list', 'Continuar a partir da lista anterior'), false);
  cont.input.disabled = !info.canContinue;
  const adv = el('input', { type: 'checkbox' });
  const advL = el('label', { className: 'uo-check', style: 'margin-left:22px' }, adv, tr(lang, 'Advance value (skip numbers)', 'Avançar valor (ignorar números)'));
  const value = el('input', { type: 'number', min: '0', max: '32767', step: '1', value: String(info.value), style: 'width:90px' });
  const prev = el('span', {});
  const paint = (): void => {
    adv.disabled = !cont.input.checked;
    value.disabled = cont.input.checked && !adv.checked;
    const v = Math.max(0, Math.round(Number(value.value) || 0));
    prev.textContent = formatNumber(v, info.numFmt, docLang(lang));
  };
  for (const x of [fresh.input, cont.input, adv]) x.addEventListener('change', paint);
  value.addEventListener('input', paint);
  paint();
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px' }, fresh.el, cont.el, advL,
    row(tr(lang, 'Set value to:', 'Definir valor como:'), value), row(tr(lang, 'Preview:', 'Visualização:'), prev));
  if (!await ask(env, tr(lang, 'Set Numbering Value', 'Definir Valor de Numeração'), body, 380)) return;
  const v = Math.max(0, Math.round(Number(value.value) || 0));
  if (fresh.input.checked) ed.setNumberingValue({ mode: 'new', value: v });
  else ed.setNumberingValue({ mode: 'continue', ...(adv.checked ? { value: v } : {}) });
}

/** Ajustar Recuos da Lista (menu de contexto): posição do número, recuo do texto, o que segue o número. */
async function indentsDialog(env: DialogEnv): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const info = ed.listInfo();
  const lvl = info?.level;
  if (!info || !lvl) return;
  const numPos = cmInput(lang, lvl.indLeft - lvl.hanging);
  const textPos = cmInput(lang, lvl.indLeft);
  const follow = select([['tab', tr(lang, 'Tab character', 'Caractere de tabulação')], ['space', tr(lang, 'Space', 'Espaço')], ['nothing', tr(lang, 'Nothing', 'Nada')]], lvl.suff ?? 'tab');
  const tabOn = el('input', { type: 'checkbox', checked: lvl.tabPos !== undefined });
  const tabAt = cmInput(lang, lvl.tabPos ?? lvl.indLeft);
  const body = el('div', { style: 'display:grid;grid-template-columns:auto 1fr;gap:10px 12px;align-items:center' },
    tr(lang, 'Bullet position:', 'Posição do marcador:'), numPos, tr(lang, 'Text indent:', 'Recuo do texto:'), textPos,
    tr(lang, 'Follow number with:', 'Seguir número com:'), follow, el('label', { className: 'uo-check' }, tabOn, tr(lang, 'Add tab stop at:', 'Adicionar parada de tabulação em:')), tabAt);
  if (!await ask(env, tr(lang, 'Adjust List Indents', 'Ajustar Recuos da Lista'), body, 420)) return;
  const np = twOf(numPos.value) ?? lvl.indLeft - lvl.hanging, tp = twOf(textPos.value) ?? lvl.indLeft;
  const tab = tabOn.checked ? twOf(tabAt.value) : undefined;
  const { tabPos: _old, ...rest } = lvl;
  ed.defineMultilevelList([{ ...rest, indLeft: tp, hanging: tp - np, suff: follow.value as 'tab', ...(tab !== undefined ? { tabPos: tab } : {}) }]);
}

/**
 * Definir Nova Lista de Vários Níveis (e Definir Novo Estilo de Lista, `asStyle`): os 9
 * níveis, cada um com o formato (texto, estilo, níveis anteriores, início, reinício,
 * numeração legal), a fonte, a posição (alinhamento, número em, recuo do texto, o que segue
 * o número, tabulação) e o estilo vinculado; aplicar à lista inteira ou deste ponto em diante.
 */
async function multilevelDialog(env: DialogEnv, families: string[], asStyle: boolean): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const info = ed.listInfo();
  const base = info && info.levels.length >= 9 && !asStyle ? info.levels : ed.listLibrary('multilevel')[0] ?? [];
  const levels = base.map((l) => ({ ...l }));
  let k = info && !asStyle ? info.ilvl : 0;
  const lv = (): ListLevelSpec => levels.find((l) => l.ilvl === k)!;
  const headings = ed.listStyles('all').filter((s) => /^heading [1-9]$/i.test(s.rawName));

  const name = el('input', { type: 'text', value: '', style: 'width:220px' });
  const levelList = el('select', { size: 9, style: 'width:56px;height:180px' });
  for (let i = 0; i < 9; i++) levelList.append(el('option', { value: String(i), textContent: String(i + 1) }));
  const prev = el('div', { style: 'flex:1;height:180px;border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:4px;padding:6px 10px;overflow:hidden;background:#fff;color:#000;font-size:11px;display:flex;flex-direction:column;gap:3px' });
  const fmt = el('input', { type: 'text', style: 'width:200px' });
  const style = select([...NUMBER_STYLES.map(([v, l]): [string, string] => [v, pickLabels(lang, l)]), ['bullet', tr(lang, 'Bullet: •', 'Marcador: •')]], 'decimal');
  const include = select([['', '']], '');
  const fontBtn = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Font...', 'Fonte...') });
  const start = el('input', { type: 'number', min: '0', max: '32767', step: '1', style: 'width:80px' });
  const restartOn = el('input', { type: 'checkbox' });
  const restartAfter = select([['0', '']], '0');
  const legal = el('input', { type: 'checkbox' });
  const link = select([['', tr(lang, '(no style)', '(sem estilo)')], ...headings.map((s): [string, string] => [s.id, s.name])], '');
  const jc = select(ALIGNS(lang), 'left');
  const alignedAt = cmInput(lang, 0);
  const indentAt = cmInput(lang, 0);
  const follow = select([['tab', tr(lang, 'Tab character', 'Caractere de tabulação')], ['space', tr(lang, 'Space', 'Espaço')], ['nothing', tr(lang, 'Nothing', 'Nada')]], 'tab');
  const tabOn = el('input', { type: 'checkbox' });
  const tabAt = cmInput(lang, 0);
  const applyTo = select([['list', tr(lang, 'Whole list', 'Lista inteira')], ['forward', tr(lang, 'This point forward', 'Deste ponto em diante')]], 'list');

  const sampleOf = (fmtId: string): string => (fmtId === 'bullet' ? '•' : fmtId === 'none' ? '' : formatNumber(1, fmtId, docLang(lang)));
  /** número de exemplo do nível `i` dentro do texto do nível `l` (legal: algarismos) */
  const sampleFor = (l: ListLevelSpec, i: number): string => sampleOf(l.isLgl && i !== l.ilvl ? 'decimal' : levels.find((x) => x.ilvl === i)?.numFmt ?? 'decimal');
  /** w:lvlText em pedaços: texto e níveis citados (0–8) */
  const tokensOf = (l: ListLevelSpec): (string | number)[] => l.lvlText.split(/(%[1-9])/).filter(Boolean).map((s) => (/^%[1-9]$/.test(s) ? Number(s[1]) - 1 : s));
  /** texto do campo: os níveis citados com o número de exemplo de cada um */
  const toField = (l: ListLevelSpec): string => (l.numFmt === 'bullet' ? l.lvlText : tokensOf(l).map((t) => (typeof t === 'number' ? sampleFor(l, t) : t)).join(''));
  /** campo → w:lvlText: os números de exemplo, na ordem dos níveis citados, voltam a %n;
   *  o texto entre eles é o que a pessoa digitou */
  const fromField = (l: ListLevelSpec): string => {
    if (l.numFmt === 'bullet') return fmt.value || '•';
    const order = tokensOf(l).filter((t): t is number => typeof t === 'number');
    if (!order.includes(l.ilvl)) order.push(l.ilvl);
    let at = 0, res = '';
    for (const i of order) {
      const s = sampleFor(l, i);
      const p = s ? fmt.value.indexOf(s, at) : -1;
      if (p < 0) continue;
      res += fmt.value.slice(at, p) + `%${i + 1}`;
      at = p + s.length;
    }
    res += fmt.value.slice(at);
    return /%[1-9]/.test(res) ? res : `%${l.ilvl + 1}${res}`;
  };

  const paintPrev = (): void => {
    const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const rows: HTMLElement[] = [];
    for (let i = 0; i < 9; i++) {
      counts[i]! += 1;
      for (let d = i + 1; d < 9; d++) counts[d] = 0;
      const vals = counts.map((c, j) => (c || (levels.find((x) => x.ilvl === j)?.start ?? 1)));
      const l = levels.find((x) => x.ilvl === i);
      if (!l) continue;
      const txt = markerText(levels, i, vals, lang);
      const left = Math.max(0, (l.indLeft - l.hanging) / 1440 * 96 * 0.5);
      const r = el('div', { style: `display:flex;align-items:center;gap:4px;padding-left:${left}px;${i === k ? 'font-weight:700' : ''}` }, markerSpan(ed, txt, l, 11), bar('100%'));
      rows.push(r);
    }
    prev.replaceChildren(...rows);
  };

  const load = (): void => {
    const l = lv();
    levelList.value = String(k);
    fmt.value = toField(l);
    style.value = NUMBER_STYLES.some(([v]) => v === l.numFmt) || l.numFmt === 'bullet' ? l.numFmt : 'decimal';
    include.replaceChildren(el('option', { value: '', textContent: '' }), ...Array.from({ length: k }, (_v, i) => el('option', { value: String(i), textContent: tr(lang, `Level ${i + 1}`, `Nível ${i + 1}`) })));
    include.disabled = k === 0 || l.numFmt === 'bullet';
    start.value = String(l.start ?? 1);
    restartAfter.replaceChildren(...Array.from({ length: k }, (_v, i) => el('option', { value: String(i + 1), textContent: tr(lang, `Level ${i + 1}`, `Nível ${i + 1}`) })));
    restartOn.checked = k > 0 && l.lvlRestart !== 0;
    restartOn.disabled = k === 0;
    restartAfter.value = String(l.lvlRestart && l.lvlRestart > 0 ? l.lvlRestart : k);
    restartAfter.disabled = !restartOn.checked;
    legal.checked = !!l.isLgl;
    link.value = l.pStyle ?? '';
    jc.value = l.jc ?? 'left';
    alignedAt.value = `${cmText(lang, l.indLeft - l.hanging)} cm`;
    indentAt.value = `${cmText(lang, l.indLeft)} cm`;
    follow.value = l.suff ?? 'tab';
    tabOn.checked = l.tabPos !== undefined;
    tabAt.value = `${cmText(lang, l.tabPos ?? l.indLeft)} cm`;
    paintPrev();
  };
  const store = (): void => {
    const l = lv();
    l.numFmt = style.value;
    l.lvlText = fromField(l);
    l.start = Math.max(0, Math.round(Number(start.value) || 0));
    if (k > 0) { if (restartOn.checked) { const r = Number(restartAfter.value); if (r === k) delete l.lvlRestart; else l.lvlRestart = r; } else l.lvlRestart = 0; }
    if (legal.checked) l.isLgl = true; else delete l.isLgl;
    if (link.value) l.pStyle = link.value; else delete l.pStyle;
    l.jc = jc.value as 'left';
    const at = twOf(alignedAt.value), ti = twOf(indentAt.value);
    if (ti !== undefined) l.indLeft = ti;
    if (at !== undefined) l.hanging = l.indLeft - at;
    l.suff = follow.value as 'tab';
    const tp = tabOn.checked ? twOf(tabAt.value) : undefined;
    if (tp !== undefined) l.tabPos = tp; else delete l.tabPos;
    paintPrev();
  };
  levelList.addEventListener('change', () => { store(); k = Number(levelList.value); load(); });
  style.addEventListener('change', () => {
    const l = lv();
    const before = sampleOf(l.numFmt);
    l.numFmt = style.value;
    if (style.value === 'bullet') { l.lvlText = '•'; delete l.font; fmt.value = '•'; }
    else if (before && fmt.value.includes(before)) fmt.value = fmt.value.replace(before, () => sampleOf(style.value));
    store();
  });
  // Incluir número de nível de: o número do nível escolhido entra onde está o cursor do campo
  include.addEventListener('change', () => {
    if (!include.value) return;
    const i = Number(include.value);
    const pos = fmt.selectionStart ?? 0;
    store();
    const l = lv();
    const out: (string | number)[] = [];
    let acc = 0, done = false;
    for (const t of tokensOf(l)) {
      const len = typeof t === 'number' ? sampleFor(l, t).length : t.length;
      if (!done && pos <= acc + len) {
        if (typeof t === 'number') out.push(...(pos === acc ? [i, t] : [t, i]));
        else out.push(t.slice(0, pos - acc), i, t.slice(pos - acc));
        done = true;
      } else out.push(t);
      acc += len;
    }
    if (!done) out.push(i);
    l.lvlText = out.map((t) => (typeof t === 'number' ? `%${t + 1}` : t)).join('');
    fmt.value = toField(l);
    include.value = '';
    paintPrev();
  });
  restartOn.addEventListener('change', () => { restartAfter.disabled = !restartOn.checked; store(); });
  for (const x of [fmt, start, alignedAt, indentAt, tabAt]) x.addEventListener('change', store);
  for (const x of [restartAfter, legal, link, jc, follow, tabOn]) x.addEventListener('change', store);
  fontBtn.addEventListener('click', async () => {
    const r = await markFontDialog(env, families, lv());
    if (r) { const l = lv(); delete l.font; delete l.bold; delete l.italic; delete l.sizePt; delete l.color; Object.assign(l, r); paintPrev(); }
  });
  const setAll = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Set for All Levels...', 'Definir para Todos os Níveis...') });
  setAll.addEventListener('click', () => {
    // cada nível um recuo a mais (o do nível 1 + n × a diferença do 2º), como o Word
    store();
    const l0 = levels.find((x) => x.ilvl === 0)!, l1 = levels.find((x) => x.ilvl === 1) ?? l0;
    const step = Math.max(0, l1.indLeft - l0.indLeft) || 360;
    for (const l of levels) { l.indLeft = l0.indLeft + l.ilvl * step; l.hanging = l0.hanging; }
    load();
  });
  load();

  // (larguras fixas: os campos não esticam a grade)
  for (const s of [style, include, restartAfter, link, jc, follow, applyTo]) s.style.width = '170px';
  fmt.style.width = '150px';
  const grid = (...kids: (Node | string)[]): HTMLElement => el('div', { style: 'display:grid;grid-template-columns:auto auto auto auto;gap:6px 10px;align-items:center;justify-content:start' }, ...kids);
  const span2 = (n: Node): HTMLElement => el('div', { style: 'grid-column:span 2;display:flex;align-items:center;gap:8px' }, n);
  levelList.style.height = '204px';
  prev.style.height = '204px';
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px;font-size:13px' },
    ...(asStyle ? [row(tr(lang, 'Name:', 'Nome:'), name)] : []),
    el('div', { style: 'display:flex;gap:10px' }, el('div', { style: 'display:flex;flex-direction:column;gap:4px' }, tr(lang, 'Level:', 'Nível:'), levelList), prev),
    group(tr(lang, 'Number format', 'Formato de número'),
      grid(tr(lang, 'Enter formatting for number:', 'Digite a formatação do número:'), fmt, span2(fontBtn),
        tr(lang, 'Number style for this level:', 'Estilo de número para este nível:'), style,
        tr(lang, 'Include level number from:', 'Incluir número de nível de:'), include,
        tr(lang, 'Start at:', 'Iniciar em:'), start,
        el('label', { className: 'uo-check' }, restartOn, tr(lang, 'Restart list after:', 'Reiniciar lista após:')), restartAfter,
        span2(el('label', { className: 'uo-check' }, legal, tr(lang, 'Legal style numbering', 'Numeração no estilo legal'))),
        tr(lang, 'Link level to style:', 'Vincular nível ao estilo:'), link)),
    group(tr(lang, 'Position', 'Posição'),
      grid(tr(lang, 'Number alignment:', 'Alinhamento do número:'), jc, tr(lang, 'Aligned at:', 'Alinhado em:'), alignedAt,
        tr(lang, 'Text indent at:', 'Recuo do texto em:'), indentAt, span2(setAll),
        tr(lang, 'Follow number with:', 'Seguir número com:'), follow,
        el('label', { className: 'uo-check' }, tabOn, tr(lang, 'Add tab stop at:', 'Adicionar parada de tabulação em:')), tabAt)),
    ...(asStyle || !info ? [] : [row(tr(lang, 'Apply changes to:', 'Aplicar alterações a:'), applyTo)]));
  const title = asStyle ? tr(lang, 'Define New List Style', 'Definir Novo Estilo de Lista') : tr(lang, 'Define new Multilevel list', 'Definir nova Lista de Vários Níveis');
  for (;;) {
    if (!await ask(env, title, body, 720)) return;
    store();
    if (!asStyle) { ed.defineMultilevelList(levels, { applyTo: applyTo.value as 'list' }); return; }
    const nm = name.value.trim();
    if (nm && ed.createListStyle(nm, levels)) return;
    // nome vazio ou já usado: o diálogo volta (como o Word, que avisa)
    name.focus();
    name.style.outline = '2px solid #d93025';
  }
}

/** Menu de contexto de um item de lista (os itens que o Word acrescenta). */
export function listContextItems(ed: UniversalWriteElement): MenuEntry[] {
  const info = ed.listInfo();
  if (!info) return [];
  return info.kind === 'number' ? ['list:indents', '-', 'list:restart', 'list:continue', 'list:setValue'] : ['list:indents'];
}


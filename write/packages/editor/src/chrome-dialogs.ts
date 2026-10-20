// Diálogos das barras do Write (iniciadores da ribbon e itens "…" dos menus):
// Fonte, Parágrafo, Configurar Página, link, comentário, contar palavras,
// atalhos e sobre. Todos sobre o openDialog de @universal-office/ui (<dialog>
// nativo — sem a trava de animação do u-dialog).
import { openDialog, pickLabels, promptDialog, type UiLang } from '@universal-office/ui';
import type { UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';

type Env = { ed: UniversalWriteElement; app: WriteApp; layer: HTMLElement; lang: UiLang; state: () => ReturnType<UniversalWriteElement['getSelectionState']> };

type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { style?: string };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props<K> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
const select = (name: string, opts: readonly (readonly [string, string])[], value: string): HTMLSelectElement => {
  const s = el('select', { name });
  for (const [v, t] of opts) s.append(el('option', { value: v, textContent: t }));
  s.value = value;
  return s;
};
const check = (name: string, label: string, on: boolean): HTMLLabelElement => {
  const i = el('input', { type: 'checkbox', name, checked: on });
  return el('label', { className: 'uo-check' }, i, label);
};
// textos curtos dos diálogos: tabela { en, pt } escolhida por pickLabels (regra única de i18n)
const tr = (lang: UiLang, en: string, pt: string): string => pickLabels(lang, { en, pt });

export async function linkDialog(env: Env): Promise<void> {
  const L = env.app.ui!.L;
  const cur = (env.state().run.link as string | undefined) ?? '';
  const url = await promptDialog({ title: L.linkTitle, label: L.linkUrl, value: cur || 'https://', ok: L.linkApply, layer: env.layer, lang: env.lang });
  if (url === null) return;
  const v = url.trim();
  env.ed.setLink(v && v !== 'https://' ? v : undefined);
}

export async function commentDialog(env: Env): Promise<void> {
  const L = env.app.ui!.L;
  if (!env.ed.selectedText()) { env.app.ui!.flash(L.selectToComment); return; }
  const text = await promptDialog({ title: L.commentTitle, label: L.commentText, multiline: true, ok: L.commentAdd, layer: env.layer, lang: env.lang });
  if (!text?.trim()) return;
  env.app.ui!.flash(env.ed.addComment(text.trim()) === null ? L.selectToComment : L.commentAdded);
}

export async function fontDialog(env: Env, families: string[]): Promise<void> {
  const L = env.app.ui!.L, lang = env.lang;
  const r = env.state().run;
  const cur = (r.fontAscii as string | undefined) ?? '';
  const fams = cur && !families.includes(cur) ? [cur, ...families] : families;
  const font = select('font', fams.map((f) => [f, f] as const), cur);
  const size = el('input', { type: 'number', name: 'size', min: '1', max: '1638', step: '0.5', value: String(((r.szHalfPt as number | undefined) ?? 22) / 2) });
  const color = el('input', { type: 'color', name: 'color', value: `#${(r.color as string | undefined) && /^[0-9a-f]{6}$/i.test(r.color as string) ? r.color : '000000'}` });
  color.style.cssText = 'width:48px;height:32px;padding:2px;border-radius:8px';
  const spacing = select('spacing', [['0', 'Normal'], ['20', tr(lang, 'Expanded 1 pt', 'Expandido 1 pt')], ['40', tr(lang, 'Expanded 2 pt', 'Expandido 2 pt')],
    ['-10', tr(lang, 'Condensed 0.5 pt', 'Condensado 0,5 pt')], ['-20', tr(lang, 'Condensed 1 pt', 'Condensado 1 pt')]], String((r.charSpacingTwips as number | undefined) ?? 0));
  const flags = {
    bold: [tr(lang, 'Bold', 'Negrito'), !!r.bold], italic: [tr(lang, 'Italic', 'Itálico'), !!r.italic],
    underline: [tr(lang, 'Underline', 'Sublinhado'), !!r.underline], strike: [tr(lang, 'Strikethrough', 'Tachado'), !!r.strike],
    sup: [tr(lang, 'Superscript', 'Sobrescrito'), r.vertAlign === 'superscript'], sub: [tr(lang, 'Subscript', 'Subscrito'), r.vertAlign === 'subscript'],
    allCaps: [tr(lang, 'All caps', 'Todas em maiúsculas'), !!r.allCaps], smallCaps: [tr(lang, 'Small caps', 'Versalete'), !!r.smallCaps],
  } as const;
  const grid = el('div', { className: 'uo-dialog-grid' },
    el('span', {}, L.fontDlg), font, el('span', {}, L.size), size, el('span', {}, L.color), color, el('span', {}, L.charSpacing), spacing);
  const fx = el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:8px 16px' });
  for (const [k, [label, on]] of Object.entries(flags)) fx.append(check(k, label, on));
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:14px' }, grid, el('strong', {}, L.effects), fx);
  const h = openDialog({ title: L.fontDlg, body, layer: env.layer, lang, width: 440,
    actions: [{ id: 'cancel', label: L.cancel }, { id: 'ok', label: L.apply, primary: true }] });
  if ((await h.result) !== 'ok') return;
  const ed = env.ed;
  const box = (k: string): boolean => (fx.querySelector(`input[name="${k}"]`) as HTMLInputElement).checked;
  if (font.value && font.value !== cur) ed.setFontFamily(font.value);
  const sz = parseFloat(size.value);
  if (sz > 0 && sz * 2 !== r.szHalfPt) ed.setFontSize(sz);
  const hex = color.value.slice(1).toUpperCase();
  if (hex !== ((r.color as string | undefined) ?? '000000').toUpperCase()) ed.setColor(hex);
  for (const k of ['bold', 'italic', 'underline', 'strike', 'allCaps', 'smallCaps'] as const) {
    if (box(k) !== flags[k][1]) ed.toggleRunProp(k);
  }
  if (box('sup') !== flags.sup[1]) ed.toggleVertAlign('superscript');
  else if (box('sub') !== flags.sub[1]) ed.toggleVertAlign('subscript');
  const cs = Number(spacing.value);
  if (cs !== ((r.charSpacingTwips as number | undefined) ?? 0)) ed.setCharSpacing(cs || undefined);
}

export async function paragraphDialog(env: Env): Promise<void> {
  const L = env.app.ui!.L, lang = env.lang;
  const p = env.state().para;
  const first = p.indentFirstLineTwips as number | undefined;
  const align = select('align', [['left', tr(lang, 'Left', 'Esquerda')], ['center', tr(lang, 'Centered', 'Centralizada')],
    ['right', tr(lang, 'Right', 'Direita')], ['both', tr(lang, 'Justified', 'Justificada')]], (p.alignment as string | undefined) ?? 'left');
  const special = select('special', [['none', tr(lang, '(none)', '(nenhum)')], ['firstLine', tr(lang, 'First line', 'Primeira linha')],
    ['hanging', tr(lang, 'Hanging', 'Deslocamento')]], !first ? 'none' : first > 0 ? 'firstLine' : 'hanging');
  const pt = (tw: number | undefined): string => String(Math.round((tw ?? 0) / 2) / 10);
  const before = el('input', { type: 'number', name: 'before', min: '0', step: '6', value: pt(p.spaceBeforeTwips as number | undefined) });
  const after = el('input', { type: 'number', name: 'after', min: '0', step: '6', value: pt(p.spaceAfterTwips as number | undefined) });
  const dec = tr(lang, '.', ',');
  const line = select('line', [['240', `1${dec}0`], ['259', `1${dec}08`], ['276', `1${dec}15`], ['360', `1${dec}5`], ['480', `2${dec}0`]],
    String((p.lineTwentieths as number | undefined) ?? 259));
  const grid = el('div', { className: 'uo-dialog-grid' },
    el('span', {}, L.alignment), align, el('span', {}, L.specialIndent), special,
    el('span', {}, L.before), before, el('span', {}, L.after), after, el('span', {}, L.lineSpacing), line);
  const h = openDialog({ title: L.paraDlg, body: grid, layer: env.layer, lang, width: 420,
    actions: [{ id: 'cancel', label: L.cancel }, { id: 'ok', label: L.apply, primary: true }] });
  if ((await h.result) !== 'ok') return;
  const ed = env.ed;
  ed.setAlignment(align.value as 'left' | 'center' | 'right' | 'both');
  ed.setSpecialIndent(special.value as 'none' | 'firstLine' | 'hanging');
  ed.setSpaceBefore(Math.round(Number(before.value) * 20));
  ed.setSpaceAfter(Math.round(Number(after.value) * 20));
  ed.setLineSpacing(Number(line.value));
}

export async function pageDialog(env: Env): Promise<void> {
  const L = env.app.ui!.L, lang = env.lang;
  const orient = select('orientation', [['portrait', tr(lang, 'Portrait', 'Retrato')], ['landscape', tr(lang, 'Landscape', 'Paisagem')]], 'portrait');
  const size = select('size', [['A4', 'A4'], ['Letter', tr(lang, 'Letter', 'Carta')]], 'A4');
  const margins = select('margins', [['normal', 'Normal'], ['narrow', tr(lang, 'Narrow', 'Estreita')], ['wide', tr(lang, 'Wide', 'Larga')]], 'normal');
  // estado atual pela geometria da 1ª seção; margens pelo preset mais próximo
  try {
    const s = env.ed.sectPrAt(0);
    const w = s.pageWidthTwips, hgt = s.pageHeightTwips;
    orient.value = w > hgt ? 'landscape' : 'portrait';
    size.value = Math.abs(Math.min(w, hgt) - 12240) < 60 ? 'Letter' : 'A4';
    const m = s.marginLeftTwips;
    margins.value = m < 1000 ? 'narrow' : m > 2200 ? 'wide' : 'normal';
  } catch { /* sem documento */ }
  const grid = el('div', { className: 'uo-dialog-grid' },
    el('span', {}, L.orientation), orient, el('span', {}, L.paper), size, el('span', {}, L.margins), margins);
  const h = openDialog({ title: L.pageDlg, body: grid, layer: env.layer, lang, width: 380,
    actions: [{ id: 'cancel', label: L.cancel }, { id: 'ok', label: L.apply, primary: true }] });
  if ((await h.result) !== 'ok') return;
  env.ed.setPageSetup({
    orientation: orient.value as 'portrait' | 'landscape',
    size: size.value as 'A4' | 'Letter',
    margins: margins.value as 'normal' | 'narrow' | 'wide',
  });
}

export function wordCountDialog(env: Env): void {
  const L = env.app.ui!.L;
  const s = env.ed.stats();
  const fmt = (n: number): string => n.toLocaleString(tr(env.lang, 'en-US', 'pt-BR'));
  const grid = el('div', { className: 'uo-dialog-grid' },
    el('span', {}, L.pages), el('strong', {}, fmt(s.pages)),
    el('span', {}, L.words), el('strong', {}, fmt(s.words)),
    el('span', {}, L.chars), el('strong', {}, fmt(s.chars)));
  openDialog({ title: L.wordCountTitle, body: grid, layer: env.layer, lang: env.lang, width: 320 });
}

const SHORTCUTS: [string, string, string][] = [
  ['Ctrl+O', 'Open', 'Abrir'], ['Ctrl+S', 'Save', 'Salvar'], ['Ctrl+Shift+S', 'Save as', 'Salvar como'],
  ['Ctrl+P', 'Print', 'Imprimir'], ['Ctrl+Z / Ctrl+Y', 'Undo / Redo', 'Desfazer / Refazer'],
  ['Ctrl+X / C / V', 'Cut / Copy / Paste', 'Recortar / Copiar / Colar'], ['Ctrl+Shift+V', 'Paste without formatting', 'Colar sem formatação'],
  ['Ctrl+F / Ctrl+H', 'Find / Replace', 'Localizar / Substituir'], ['Ctrl+B / I / U', 'Bold / Italic / Underline', 'Negrito / Itálico / Sublinhado'],
  ['Ctrl+L / E / R / J', 'Align left / center / right / justify', 'Alinhar à esquerda / centralizar / à direita / justificar'],
  ['Ctrl+] / Ctrl+[', 'Increase / decrease font size', 'Aumentar / diminuir fonte'], ['Ctrl+K', 'Insert link', 'Inserir link'],
  ['Ctrl+Alt+M', 'New comment', 'Novo comentário'], ['Ctrl+Enter', 'Page break', 'Quebra de página'],
  ['Ctrl+D', 'Font dialog', 'Diálogo Fonte'], ['Ctrl+Shift+8', 'Formatting marks', 'Marcas de formatação'],
  ['Ctrl+scroll', 'Zoom', 'Zoom'],
];

export function shortcutsDialog(env: Env): void {
  const grid = el('div', { className: 'uo-dialog-grid' });
  grid.style.gridTemplateColumns = 'auto 1fr';
  for (const [k, en, pt] of SHORTCUTS) {
    grid.append(el('kbd', { style: 'font:inherit;font-size:12.5px;font-weight:600;white-space:nowrap' }, k), el('span', {}, tr(env.lang, en, pt)));
  }
  openDialog({ title: env.app.ui!.L.shortcutsTitle, body: grid, layer: env.layer, lang: env.lang, width: 520 });
}

export function aboutDialog(env: Env): void {
  const L = env.app.ui!.L;
  openDialog({ title: L.aboutTitle, icon: 'info', body: L.aboutText, layer: env.layer, lang: env.lang, width: 400 });
}

export type DialogEnv = Env;

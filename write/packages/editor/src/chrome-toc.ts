// Sumário nas barras do Write: a galeria (miniaturas desenhadas pelo motor),
// Sumário Personalizado (com Opções e Modificar), a pergunta de Atualizar
// Sumário, Adicionar Texto e Marcar Entrada de Sumário (Alt+Shift+O — e no menu,
// como o LibreOffice). O editor faz o trabalho pela API pública; regras em
// toc.ts e fatos do Word em write/tools/toc-lab.
import {
  openDialog, pickLabels,
  type BarContext, type Command, type CommandRegistry, type MenuEntry, type MenuItem, type UiLang,
} from '@universal-office/ui';
import type { UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type { ChromeCtl } from './chrome-commands.js';
import type { WidgetEnv } from './chrome-widgets.js';
import type { TabLeaderChoice } from './references.js';
import { TOC_FORMATS, tocFormatStyle, type TableOfContentsOptions, type TocFormat } from './toc.js';

export type TocDialogKind = 'custom' | 'update' | 'mark';

const L = (en: string, pt: string): { en: string; pt: string } => ({ en, pt });

/** Comandos do sumário (aparecem quando o método da API existe). */
export function registerTocCommands(reg: CommandRegistry, ed: UniversalWriteElement, app: WriteApp, ctl: ChromeCtl): void {
  const api = ed as unknown as Record<string, unknown>;
  const has = (m: string) => (): boolean => typeof api[m] === 'function';
  const canEdit = (): boolean => !app.comparing && !ed.isProtected();
  const edit = (c: Omit<Command, 'isEnabled'> & { isEnabled?: () => boolean }): Command =>
    ({ ...c, isEnabled: c.isEnabled ? () => canEdit() && c.isEnabled!() : canEdit });
  const hasToc = (): boolean => typeof api['hasTableOfContents'] === 'function' && ed.hasTableOfContents();
  const cmds: Command[] = [
    edit({ id: 'toc', label: L('Update Table', 'Atualizar Sumário'), tip: L('Update the table of contents so all the entries refer to the correct page numbers', 'Atualiza o sumário para que todas as entradas indiquem os números de página corretos'), icon: 'autorenew', supports: has('updateToc'), isEnabled: hasToc, run: () => ctl.tocDialog('update') }),
    edit({ id: 'toc:custom', label: L('Custom Table of Contents…', 'Sumário Personalizado…'), icon: 'tune', supports: has('insertTableOfContents'), isEnabled: () => ed.canInsertField(), run: () => ctl.tocDialog('custom') }),
    edit({ id: 'toc:remove', label: L('Remove Table of Contents', 'Remover Sumário'), icon: 'delete', supports: has('removeTableOfContents'), isEnabled: hasToc, run: () => { ed.removeTableOfContents(); } }),
    edit({ id: 'toc:mark', label: L('Mark Table of Contents Entry…', 'Marcar Entrada de Sumário…'), icon: 'bookmark_add', shortcut: 'Alt+Shift+O', supports: has('markTocEntry'), isEnabled: () => ed.canInsertField(), run: () => ctl.tocDialog('mark') }),
    ...Array.from({ length: 10 }, (_, lv): Command => edit({
      id: `toc:level${lv}`, label: lv ? L(`Level ${lv}`, `Nível ${lv}`) : L('Do Not Show in Table of Contents', 'Não Mostrar no Sumário'),
      supports: has('setTocLevel'), isChecked: () => ed.getTocLevel() === lv, run: () => ed.setTocLevel(lv),
    })),
  ];
  reg.add(...cmds);
}

/** Galeria do botão Sumário: os modelos + Sumário Personalizado e Remover. */
export function tocGalleryMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const tiles: MenuItem = {
    content: (close) => {
      const list = document.createElement('div');
      list.className = 'uw-toc-gallery';
      list.style.cssText = 'display:grid;grid-template-columns:1fr;gap:6px;padding:6px;max-height:460px;overflow:auto';
      for (const t of env.ed.tocTemplates()) {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset['template'] = t.id;
        b.title = t.name;
        b.setAttribute('aria-label', t.name);
        b.style.cssText = 'display:flex;flex-direction:column;gap:4px;align-items:stretch;padding:6px;border-radius:8px;border:1px solid var(--uo-border, #c7c7c7);background:transparent;color:inherit;cursor:pointer;font:inherit;text-align:left';
        const cap = document.createElement('span');
        cap.textContent = t.name;
        cap.style.cssText = 'font-size:12px;opacity:.8';
        const cv = document.createElement('canvas');
        cv.style.cssText = 'display:block;border:1px solid rgba(127,127,127,.25);background:#fff';
        b.append(cap, cv);
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => { close(); env.ed.insertTocTemplate(t.id); ctx.after(); });
        list.append(b);
        // miniatura depois do menu montado (o motor leva uns ms por modelo)
        requestAnimationFrame(() => { env.ed.paintTocTemplate(t.id, cv, 300); });
      }
      return list;
    },
  };
  return [tiles, '-', 'toc:custom', 'toc:remove'];
}

/** Adicionar Texto: Não Mostrar e os níveis que o sumário mostra (3 no mínimo) +
 *  Marcar Entrada de Sumário. */
export function addTextMenu(env: WidgetEnv): MenuEntry[] {
  const shown = Math.max(3, Math.min(9, env.ed.getTableOfContentsOptions()?.levels ?? 3));
  return [...Array.from({ length: shown + 1 }, (_, i) => `toc:level${i}`), '-', 'toc:mark'];
}

// ───────────────── diálogos ─────────────────

export interface TocEnv {
  ed: UniversalWriteElement;
  layer: HTMLElement;
  lang: UiLang;
  flash: (msg: string) => void;
  /** Modificar estilo (diálogo da frente Estilos) */
  modifyStyle?: (id: string) => void;
}

type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { style?: string };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props<K> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
const check = (label: string, on: boolean): { box: HTMLLabelElement; input: HTMLInputElement } => {
  const input = el('input', { type: 'checkbox', checked: on });
  return { box: el('label', { className: 'uo-check' }, input, label), input };
};
const select = (opts: readonly (readonly [string, string])[], value: string): HTMLSelectElement => {
  const s = el('select');
  for (const [v, t] of opts) s.append(el('option', { value: v, textContent: t }));
  s.value = value;
  return s;
};
const button = (label: string): HTMLButtonElement => el('button', { type: 'button', className: 'uo-pill', textContent: label });
const T = (env: TocEnv) => (en: string, pt: string): string => pickLabels(env.lang, { en, pt });

const LEADERS = (t: (en: string, pt: string) => string): [TabLeaderChoice, string][] => [
  ['none', t('(none)', '(nenhum)')], ['dot', '.......'], ['hyphen', '-------'], ['underscore', '_______'],
];

/** Pergunta do Word ao atualizar: só os números de página (o padrão) ou o índice inteiro. */
export async function updateTocDialog(env: TocEnv, scope: 'caret' | 'selection' = 'caret'): Promise<void> {
  const t = T(env), ed = env.ed;
  const name = `toc-upd-${Math.random().toString(36).slice(2)}`;
  const pages = el('input', { type: 'radio', name, checked: true });
  const all = el('input', { type: 'radio', name });
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px;min-width:320px' },
    el('div', { style: 'font-size:13px' }, t('Choose how to update the table of contents:', 'Selecione como atualizar o sumário:')),
    el('label', { className: 'uo-check' }, pages, t('Update page numbers only', 'Atualizar somente os números de página')),
    el('label', { className: 'uo-check' }, all, t('Update entire table', 'Atualizar o índice inteiro')));
  const h = openDialog({ title: t('Update Table of Contents', 'Atualizar Sumário'), icon: 'autorenew', body, layer: env.layer, lang: env.lang, width: 420,
    actions: [{ id: 'cancel', label: t('Cancel', 'Cancelar') }, { id: 'ok', label: 'OK', primary: true }] });
  if ((await h.result) !== 'ok') return;
  const mode = pages.checked ? 'pages' : 'all';
  if (scope === 'selection') ed.updateFields('selection', mode);
  else ed.updateToc(mode);
}

/** Pergunta "Substituir o sumário?" (Sim = substituir, Não = inserir outro). */
async function replaceQuestion(env: TocEnv): Promise<'yes' | 'no' | null> {
  const t = T(env);
  const h = openDialog({ title: t('Table of Contents', 'Sumário'), body: el('div', { style: 'min-width:300px;font-size:13px' }, t('Do you want to replace the selected table of contents?', 'Deseja substituir o sumário selecionado?')),
    layer: env.layer, lang: env.lang, width: 400,
    actions: [{ id: 'cancel', label: t('Cancel', 'Cancelar') }, { id: 'no', label: t('No', 'Não') }, { id: 'yes', label: t('Yes', 'Sim'), primary: true }] });
  const r = await h.result;
  return r === 'yes' || r === 'no' ? r : null;
}

/** Opções do Sumário: estilos (com o nível de cada um), níveis de tópicos e campos TC. */
async function optionsDialog(env: TocEnv, cur: TableOfContentsOptions): Promise<TableOfContentsOptions | null> {
  const t = T(env), ed = env.ed;
  const useStyles = check(t('Styles', 'Estilos'), cur.useStyles !== false);
  const outline = check(t('Outline levels', 'Níveis de tópicos'), cur.outlineLevels !== false);
  const fields = check(t('Table entry fields', 'Campos de entrada de índice'), !!cur.fields);
  const levels = cur.levels ?? 3;
  const styles = ed.listStyles('document').filter((s) => s.kind !== 'character');
  const isHeading = (raw: string): number => { const m = /^heading ([1-9])$/i.exec(raw); return m ? +m[1]! : 0; };
  const initial = (raw: string, name: string): string => {
    const hd = isHeading(raw);
    if (hd && cur.useStyles !== false && hd <= levels) return String(hd);
    const s = cur.styles?.find((x) => x.style.toLowerCase() === name.toLowerCase() || x.style.toLowerCase() === raw.toLowerCase());
    return s ? String(s.level) : '';
  };
  const rows = styles.map((s) => {
    const input = el('input', { type: 'text', value: initial(s.rawName, s.name), maxLength: 1, style: 'width:34px;height:22px;padding:0 4px;box-sizing:border-box;text-align:center;font:inherit' });
    return { s, input, row: el('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:12px;padding:1px 4px;font-size:13px' }, el('span', {}, s.name), input) };
  });
  const list = el('div', { style: 'height:200px;overflow:auto;border:1px solid color-mix(in srgb, currentColor 30%, transparent);border-radius:6px;padding:2px' }, ...rows.map((r) => r.row));
  const reset = button(t('Reset', 'Redefinir'));
  reset.addEventListener('click', () => {
    for (const r of rows) { const hd = isHeading(r.s.rawName); r.input.value = hd && hd <= 3 ? String(hd) : ''; }
    useStyles.input.checked = true; outline.input.checked = true; fields.input.checked = false;
  });
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:8px;min-width:360px' },
    el('strong', { style: 'font-size:13px' }, t('Build table of contents from:', 'Construir sumário a partir de:')),
    useStyles.box,
    el('div', { style: 'display:flex;justify-content:space-between;font-size:12px;opacity:.75;padding:0 4px' }, el('span', {}, t('Available styles:', 'Estilos disponíveis:')), el('span', {}, t('TOC level:', 'Nível do sumário:'))),
    list, outline.box, fields.box, el('div', {}, reset));
  const h = openDialog({ title: t('Table of Contents Options', 'Opções do Sumário'), body, layer: env.layer, lang: env.lang, width: 460,
    actions: [{ id: 'cancel', label: t('Cancel', 'Cancelar') }, { id: 'ok', label: 'OK', primary: true }] });
  if ((await h.result) !== 'ok') return null;
  // títulos 1..k no próprio nível = \o "1-k"; o resto que tiver nível vai no \t
  const map = rows.map((r) => ({ s: r.s, level: Math.min(9, Math.max(0, parseInt(r.input.value, 10) || 0)) })).filter((x) => x.level > 0);
  let k = 0;
  while (k < 9 && map.some((x) => isHeading(x.s.rawName) === k + 1 && x.level === k + 1)) k++;
  const extra = map.filter((x) => !(isHeading(x.s.rawName) && isHeading(x.s.rawName) <= k && x.level === isHeading(x.s.rawName)));
  return {
    ...cur, useStyles: useStyles.input.checked, outlineLevels: outline.input.checked, fields: fields.input.checked,
    levels: k || levels, styles: extra.map((x) => ({ style: x.s.name, level: x.level })),
  };
}

/** Modificar: os estilos Sumário 1–9 e o diálogo de estilo da frente Estilos. */
async function modifyDialog(env: TocEnv): Promise<void> {
  const t = T(env), ed = env.ed;
  const names = Array.from({ length: 9 }, (_, i): [string, string] => [`toc ${i + 1}`, t(`TOC ${i + 1}`, `Sumário ${i + 1}`)]);
  const list = el('select', { size: 9, style: 'width:100%;font:inherit' });
  for (const [v, txt] of names) list.append(el('option', { value: v, textContent: txt }));
  list.value = 'toc 1';
  const mod = button(t('Modify…', 'Modificar…'));
  mod.addEventListener('click', () => env.modifyStyle?.(ed.ensureBuiltinStyle(list.value)));
  list.addEventListener('dblclick', () => env.modifyStyle?.(ed.ensureBuiltinStyle(list.value)));
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:8px;min-width:280px' },
    el('span', { style: 'font-size:13px' }, t('Styles:', 'Estilos:')), list, el('div', {}, mod));
  const h = openDialog({ title: t('Style', 'Estilo'), body, layer: env.layer, lang: env.lang, width: 340,
    actions: [{ id: 'ok', label: 'OK', primary: true }] });
  await h.result;
}

/**
 * Sumário Personalizado (como no Word): Visualizar Impressão e da Web; mostrar e
 * alinhar números de página, preenchimento, hiperlinks; Formatos e Mostrar níveis;
 * Opções… e Modificar…. Com um sumário no documento, pergunta se o substitui.
 */
export async function customTocDialog(env: TocEnv): Promise<void> {
  const t = T(env), ed = env.ed;
  let cur: TableOfContentsOptions = ed.getTableOfContentsOptions() ?? {};
  const pages = check(t('Show page numbers', 'Mostrar números de página'), cur.pageNumbers !== false);
  const right = check(t('Right align page numbers', 'Alinhar números de página à direita'), cur.rightAlign !== false);
  const leader = select(LEADERS(t), cur.leader ?? 'dot');
  const links = check(t('Use hyperlinks instead of page numbers', 'Usar hiperlinks em vez de números de página'), cur.hyperlinks !== false);
  const format = select(TOC_FORMATS.map((f): [string, string] => [f.id, pickLabels(env.lang, f.label)]), 'template');
  let formatTouched = false;
  format.addEventListener('change', () => { formatTouched = true; });
  const levels = el('input', { type: 'number', min: '1', max: '9', value: String(cur.levels ?? 3), style: 'width:56px' });
  const print = el('div', { style: 'border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:6px;padding:8px 10px;font-size:12px;min-height:96px;display:flex;flex-direction:column;gap:2px;background:#fff;color:#1f1f1f' });
  const web = el('div', { style: 'border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:6px;padding:8px 10px;font-size:12px;min-height:96px;display:flex;flex-direction:column;gap:2px;background:#fff;color:#1f1f1f' });
  const paint = (): void => {
    const n = Math.max(1, Math.min(9, parseInt(levels.value, 10) || 3));
    const lead = { none: ' ', dot: '.', hyphen: '-', underscore: '_' }[leader.value] ?? '.';
    const f = format.value as TocFormat;
    const show = Math.min(n, 3);
    print.replaceChildren(...Array.from({ length: show }, (_, i) => {
      const st = tocFormatStyle(f, i + 1);
      const css = `padding-left:${(/w:left="(\d+)"/.exec(st.pPr)?.[1] ? +/w:left="(\d+)"/.exec(st.pPr)![1]! / 20 : 0)}px;${/<w:b\/>/.test(st.rPr) ? 'font-weight:700;' : ''}${/<w:i\/>/.test(st.rPr) ? 'font-style:italic;' : ''}${/<w:caps\/>/.test(st.rPr) ? 'text-transform:uppercase;' : ''}${/<w:smallCaps\/>/.test(st.rPr) ? 'font-variant:small-caps;' : ''}${/w:jc w:val="center"/.test(st.pPr) ? 'justify-content:center;' : ''}`;
      const row = el('div', { style: `display:flex;gap:4px;white-space:nowrap;${css}` }, el('span', {}, t(`Heading ${i + 1}`, `Título ${i + 1}`)));
      if (pages.input.checked && right.input.checked) row.append(el('span', { style: 'flex:1;overflow:hidden;opacity:.7', textContent: lead.repeat(200) }), el('span', {}, String(i * 2 + 1)));
      else if (pages.input.checked) row.append(el('span', {}, String(i * 2 + 1)));
      return row;
    }));
    web.replaceChildren(...Array.from({ length: show }, (_, i) => el('div', { style: `padding-left:${i * 11}px;${links.input.checked ? 'color:#0563c1;text-decoration:underline' : ''}` }, t(`Heading ${i + 1}`, `Título ${i + 1}`))));
    right.input.disabled = !pages.input.checked;
    leader.disabled = !pages.input.checked || !right.input.checked;
  };
  for (const c of [pages.input, right.input, links.input]) c.addEventListener('change', paint);
  for (const s of [leader, format]) s.addEventListener('change', paint);
  levels.addEventListener('input', paint);
  paint();
  const optBtn = button(t('Options…', 'Opções…'));
  optBtn.addEventListener('click', () => {
    void optionsDialog(env, { ...cur, levels: parseInt(levels.value, 10) || 3 }).then((o) => {
      if (!o) return;
      cur = o;
      levels.value = String(o.levels ?? 3);
      paint();
    });
  });
  const modBtn = button(t('Modify…', 'Modificar…'));
  modBtn.addEventListener('click', () => { void modifyDialog(env); });
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px;min-width:520px' },
    el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:12px' },
      el('div', { style: 'display:flex;flex-direction:column;gap:6px;min-width:0;overflow:hidden' }, el('strong', { style: 'font-size:13px' }, t('Print Preview', 'Visualizar Impressão')), print,
        pages.box, right.box, el('label', { className: 'uo-field' }, el('span', {}, t('Tab leader:', 'Preenchimento de tabulação:')), leader)),
      el('div', { style: 'display:flex;flex-direction:column;gap:6px;min-width:0;overflow:hidden' }, el('strong', { style: 'font-size:13px' }, t('Web Preview', 'Visualizar da Web')), web, links.box)),
    el('strong', { style: 'font-size:13px' }, t('General', 'Geral')),
    el('div', { className: 'uo-dialog-grid' }, el('span', {}, t('Formats:', 'Formatos:')), format, el('span', {}, t('Show levels:', 'Mostrar níveis:')), levels),
    el('div', { style: 'display:flex;gap:8px;justify-content:flex-end' }, optBtn, modBtn));
  const h = openDialog({ title: t('Table of Contents', 'Sumário'), icon: 'toc', body, layer: env.layer, lang: env.lang, width: 620,
    actions: [{ id: 'cancel', label: t('Cancel', 'Cancelar') }, { id: 'ok', label: 'OK', primary: true }] });
  if ((await h.result) !== 'ok') return;
  const opts: TableOfContentsOptions = {
    ...cur, pageNumbers: pages.input.checked, rightAlign: right.input.checked, leader: leader.value as TabLeaderChoice,
    hyperlinks: links.input.checked, levels: Math.max(1, Math.min(9, parseInt(levels.value, 10) || 3)),
    ...(formatTouched ? { format: format.value as TocFormat } : {}),
  };
  let replace: boolean | undefined;
  if (ed.hasTableOfContents()) {
    const r = await replaceQuestion(env);
    if (!r) return;
    replace = r === 'yes';
  }
  if (!ed.insertTableOfContents(opts, replace)) env.flash(t('The table of contents could not be inserted here', 'Não foi possível inserir o sumário aqui'));
}

/** Marcar Entrada de Sumário (Alt+Shift+O): texto, identificador e nível; fica
 *  aberto para marcar outras (como o Word). */
export async function markTocDialog(env: TocEnv): Promise<void> {
  const t = T(env), ed = env.ed;
  const entry = el('input', { type: 'text', value: ed.tocEntrySuggestion(), style: 'min-width:260px' });
  const ids = select('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c): [string, string] => [c, c]), 'C');
  const level = el('input', { type: 'number', min: '1', max: '9', value: '1', style: 'width:56px' });
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px;min-width:340px' },
    el('label', { className: 'uo-field' }, el('span', {}, t('Entry:', 'Entrada:')), entry),
    el('div', { className: 'uo-dialog-grid' }, el('span', {}, t('Table identifier:', 'Identificador do sumário:')), ids, el('span', {}, t('Level:', 'Nível:')), level));
  const h = openDialog({
    title: t('Mark Table of Contents Entry', 'Marcar Entrada de Sumário'), icon: 'bookmark_add', body, layer: env.layer, lang: env.lang, width: 440, modal: false,
    actions: [{ id: 'cancel', label: t('Close', 'Fechar') }, { id: 'mark', label: t('Mark', 'Marcar'), primary: true }],
    onAction: (id) => {
      if (id !== 'mark') return true;
      const ok = ed.markTocEntry({ text: entry.value, identifier: ids.value, level: parseInt(level.value, 10) || 1 });
      if (!ok) env.flash(t('Type the entry text', 'Digite o texto da entrada'));
      return false;
    },
  });
  // não modal (o documento segue clicável): centrado, como o do Word
  h.el.style.cssText += ';position:fixed;inset:0;margin:auto;height:fit-content';
  queueMicrotask(() => entry.focus());
  await h.result;
}

/** Abre o diálogo pedido (a barra chama). */
export function tocDialog(env: TocEnv, kind: TocDialogKind, scope: 'caret' | 'selection' = 'caret'): Promise<void> {
  switch (kind) {
    case 'custom': return customTocDialog(env);
    case 'update': return updateTocDialog(env, scope);
    case 'mark': return markTocDialog(env);
  }
}

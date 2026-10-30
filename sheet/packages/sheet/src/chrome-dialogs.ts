// Diálogos das barras do Sheet (sobre o diálogo de @universal-office/ui):
// Largura da Coluna, Altura da Linha, Ir Para, Localizar e Substituir, Inserir
// Função, Formatar Células, Mais Formatos de Número, Propriedades, Atalhos e
// Sobre. Cada um só chama a API pública do <universal-sheet>.
import { dialogTabs, openDialog, promptDialog, type CommandRegistry, type UiLang } from '@universal-office/ui';
import type { UniversalSheetElement } from './universal-sheet.js';
import type { ChromeLabels } from './chrome-labels.js';
import { categoryOf } from './chrome-widgets.js';
import { FONT_SIZES } from './chrome-commands.js';

export interface DialogEnv {
  el: UniversalSheetElement;
  layer: HTMLElement;
  lang: UiLang;
  L: ChromeLabels;
  reg: CommandRegistry;
  flash(msg: string): void;
  after(): void;
}

const tx = (env: DialogEnv, l: { en: string; pt: string }): string => l[env.lang] ?? l.en;
const num = (s: string): number => parseFloat(s.replace(',', '.'));

/** Largura da Coluna (em caracteres, como o Excel). */
export async function columnWidthDialog(env: DialogEnv): Promise<void> {
  const cur = env.el.columnWidth();
  const v = await promptDialog({
    title: { en: 'Column width', pt: 'Largura da coluna' }, label: { en: 'Column width:', pt: 'Largura da coluna:' },
    value: fmtNum(env, cur), layer: env.layer, lang: env.lang,
  });
  if (v === null) return;
  const w = num(v);
  if (!(w >= 0 && w <= 255)) { env.flash(tx(env, { en: '⚠ Enter a width between 0 and 255', pt: '⚠ Digite uma largura entre 0 e 255' })); return; }
  env.el.setColumnWidth(w);
  env.after();
}

/** Altura da Linha (em pontos). */
export async function rowHeightDialog(env: DialogEnv): Promise<void> {
  const cur = env.el.rowHeightPt();
  const v = await promptDialog({
    title: { en: 'Row height', pt: 'Altura da linha' }, label: { en: 'Row height:', pt: 'Altura da linha:' },
    value: fmtNum(env, cur), layer: env.layer, lang: env.lang,
  });
  if (v === null) return;
  const h = num(v);
  if (!(h >= 0 && h <= 409)) { env.flash(tx(env, { en: '⚠ Enter a height between 0 and 409', pt: '⚠ Digite uma altura entre 0 e 409' })); return; }
  env.el.setRowHeight(h);
  env.after();
}

function fmtNum(env: DialogEnv, n: number): string {
  const s = String(Math.round(n * 100) / 100);
  return env.lang === 'pt' ? s.replace('.', ',') : s;
}

/** Ir Para (F5 / Ctrl+G): uma referência ("B12", "A1:C5", "Plan2!A1"). */
export async function goToDialog(env: DialogEnv): Promise<void> {
  const v = await promptDialog({
    title: { en: 'Go to', pt: 'Ir para' }, label: { en: 'Reference:', pt: 'Referência:' },
    value: env.el.getSelection().range, layer: env.layer, lang: env.lang,
  });
  if (v === null || !v.trim()) return;
  try { env.el.selectRange(v.trim()); } catch { env.flash(env.L.invalidRef(v.trim())); return; }
  env.after();
}

function field(label: string, input: HTMLElement): HTMLLabelElement {
  const box = document.createElement('label');
  box.className = 'uo-field';
  const s = document.createElement('span');
  s.textContent = label;
  box.append(s, input);
  return box;
}

function check(label: string, on = false): { el: HTMLLabelElement; input: HTMLInputElement } {
  const el = document.createElement('label');
  el.className = 'us-check';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = on;
  el.append(input, document.createTextNode(` ${label}`));
  return { el, input };
}

function select(options: [string, string][], value: string): HTMLSelectElement {
  const s = document.createElement('select');
  for (const [v, l] of options) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = l;
    s.appendChild(o);
  }
  s.value = value;
  return s;
}

let findOpen: { focus(replace: boolean): void } | null = null;

/** Localizar e Substituir (não modal, como a caixa do Excel): Localizar Próxima, Substituir, Substituir Tudo. */
export function findDialog(env: DialogEnv, replace: boolean): void {
  if (findOpen) { findOpen.focus(replace); return; }
  const body = document.createElement('div');
  body.className = 'us-find';
  const what = document.createElement('input');
  what.type = 'text';
  what.dataset['a'] = 'find:what';
  const withEl = document.createElement('input');
  withEl.type = 'text';
  withEl.dataset['a'] = 'find:with';
  const withField = field(tx(env, { en: 'Replace with:', pt: 'Substituir por:' }), withEl);
  const matchCase = check(tx(env, { en: 'Match case', pt: 'Diferenciar maiúsculas de minúsculas' }));
  const whole = check(tx(env, { en: 'Match entire cell contents', pt: 'Coincidir conteúdo da célula inteira' }));
  const within = select([['sheet', tx(env, { en: 'Sheet', pt: 'Planilha' })], ['book', tx(env, { en: 'Workbook', pt: 'Pasta de trabalho' })]], 'sheet');
  const lookIn = select([['formulas', tx(env, { en: 'Formulas', pt: 'Fórmulas' })], ['values', tx(env, { en: 'Values', pt: 'Valores' })]], 'formulas');
  const opts = document.createElement('div');
  opts.className = 'us-find-opts';
  opts.append(field(tx(env, { en: 'Within:', pt: 'Em:' }), within), field(tx(env, { en: 'Look in:', pt: 'Examinar:' }), lookIn));
  const msg = document.createElement('div');
  msg.className = 'us-find-msg';
  msg.setAttribute('role', 'status');
  body.append(field(tx(env, { en: 'Find what:', pt: 'Localizar:' }), what), withField, matchCase.el, whole.el, opts, msg);
  const options = () => ({
    matchCase: matchCase.input.checked, wholeCell: whole.input.checked, allSheets: within.value === 'book',
    lookIn: lookIn.value as 'formulas' | 'values',
  });
  const setMode = (r: boolean): void => {
    withField.hidden = !r;
    lookIn.disabled = r;
    if (r) lookIn.value = 'formulas';
    h.el.querySelectorAll<HTMLElement>('[data-action="replace"],[data-action="replaceAll"]').forEach((b) => { b.hidden = !r; });
    h.setTitle(r ? { en: 'Replace', pt: 'Substituir' } : { en: 'Find', pt: 'Localizar' });
  };
  const h = openDialog({
    title: { en: 'Find', pt: 'Localizar' }, body, layer: env.layer, lang: env.lang, modal: false, width: 470,
    actions: [
      { id: 'replaceAll', label: { en: 'Replace all', pt: 'Substituir tudo' } },
      { id: 'replace', label: { en: 'Replace', pt: 'Substituir' } },
      { id: 'prev', label: { en: 'Find previous', pt: 'Localizar anterior' } },
      { id: 'next', label: { en: 'Find next', pt: 'Localizar próxima' }, primary: true },
    ],
    onAction: (id) => {
      const q = what.value;
      if (!q) { what.focus(); return false; }
      msg.textContent = '';
      if (id === 'replaceAll') {
        const n = env.el.replaceAll(q, withEl.value, options());
        msg.textContent = n ? env.L.replaced(n) : env.L.notFound(q);
      } else {
        const r = id === 'replace' ? env.el.replace(q, withEl.value, options()) : env.el.find(q, { ...options(), backwards: id === 'prev' });
        if (!r) msg.textContent = env.L.notFound(q);
      }
      env.after();
      return false;
    },
  });
  // não modal: flutua no canto superior direito, sem cobrir a seleção (como a caixa do Excel)
  Object.assign(h.el.style, { position: 'fixed', inset: '120px 24px auto auto', margin: '0' });
  setMode(replace);
  findOpen = { focus: (r) => { setMode(r); what.focus(); what.select(); } };
  void h.result.then(() => { findOpen = null; env.el.focus(); });
}

/** Inserir Função (Shift+F3): procura pelo nome e começa a fórmula na célula ativa. */
export async function insertFunctionDialog(env: DialogEnv): Promise<void> {
  const names = env.el.getFunctionNames();
  const body = document.createElement('div');
  body.className = 'us-fn';
  const search = document.createElement('input');
  search.type = 'text';
  search.placeholder = tx(env, { en: 'Search for a function', pt: 'Procure uma função' });
  const list = document.createElement('select');
  list.size = 12;
  list.className = 'us-fn-list';
  const fill = (): void => {
    const q = search.value.trim().toUpperCase();
    const hits = names.filter((n) => !q || n.toUpperCase().includes(q)).slice(0, 400);
    list.replaceChildren(...hits.map((n) => { const o = document.createElement('option'); o.value = n; o.textContent = n; return o; }));
    if (hits.length) list.selectedIndex = 0;
  };
  search.addEventListener('input', fill);
  search.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); list.focus(); }
  });
  fill();
  body.append(field(tx(env, { en: 'Search for a function:', pt: 'Procure por uma função:' }), search), list);
  let picked = '';
  const h = openDialog({
    title: { en: 'Insert function', pt: 'Inserir função' }, body, layer: env.layer, lang: env.lang, width: 380,
    actions: [{ id: 'cancel', label: { en: 'Cancel', pt: 'Cancelar' } }, { id: 'ok', label: { en: 'OK', pt: 'OK' }, primary: true }],
    onAction: (id) => { if (id === 'ok') picked = list.value || (names.find((n) => n.toUpperCase() === search.value.trim().toUpperCase()) ?? ''); return true; },
  });
  list.addEventListener('dblclick', () => { picked = list.value; h.close('ok'); });
  if ((await h.result) === 'ok' && picked) env.el.insertFunction(picked);
}

/** Mais Formatos de Número: o código (personalizado) aplicado à seleção. */
export async function customNumberFormatDialog(env: DialogEnv): Promise<void> {
  const v = await promptDialog({
    title: { en: 'Custom number format', pt: 'Formato de número personalizado' }, label: { en: 'Type:', pt: 'Tipo:' },
    value: env.el.getCellFormat().numFmtCode, layer: env.layer, lang: env.lang,
  });
  if (v === null || !v.trim()) return;
  env.el.setNumberFormat({ code: v.trim() });
  env.after();
}

const H_ALIGN: [string, { en: string; pt: string }][] = [
  ['general', { en: 'General', pt: 'Geral' }], ['left', { en: 'Left (Indent)', pt: 'Esquerda (Recuo)' }], ['center', { en: 'Center', pt: 'Centro' }],
  ['right', { en: 'Right (Indent)', pt: 'Direita (Recuo)' }], ['fill', { en: 'Fill', pt: 'Preencher' }], ['justify', { en: 'Justify', pt: 'Justificar' }],
  ['centerContinuous', { en: 'Center Across Selection', pt: 'Centralizar seleção' }], ['distributed', { en: 'Distributed (Indent)', pt: 'Distribuído (Recuo)' }],
];
const V_ALIGN: [string, { en: string; pt: string }][] = [
  ['top', { en: 'Top', pt: 'Superior' }], ['center', { en: 'Center', pt: 'Centro' }], ['bottom', { en: 'Bottom', pt: 'Inferior' }],
  ['justify', { en: 'Justify', pt: 'Justificar' }], ['distributed', { en: 'Distributed', pt: 'Distribuído' }],
];
const CATEGORIES: [string, { en: string; pt: string }][] = [
  ['general', { en: 'General', pt: 'Geral' }], ['number', { en: 'Number', pt: 'Número' }], ['currency', { en: 'Currency', pt: 'Moeda' }],
  ['accounting', { en: 'Accounting', pt: 'Contábil' }], ['shortDate', { en: 'Date', pt: 'Data' }], ['time', { en: 'Time', pt: 'Hora' }],
  ['percent', { en: 'Percentage', pt: 'Porcentagem' }], ['fraction', { en: 'Fraction', pt: 'Fração' }], ['scientific', { en: 'Scientific', pt: 'Científico' }],
  ['text', { en: 'Text', pt: 'Texto' }], ['custom', { en: 'Custom', pt: 'Personalizado' }],
];

/**
 * Formatar Células (Ctrl+1): guias Número, Alinhamento, Fonte e Preenchimento.
 * Só o que mudou é aplicado — de uma vez (uma ação de Desfazer).
 */
export async function formatCellsDialog(env: DialogEnv, tab: 'number' | 'alignment' | 'font' | 'fill' = 'number'): Promise<void> {
  const f = env.el.getCellFormat();
  const opt = (list: [string, { en: string; pt: string }][]): [string, string][] => list.map(([v, l]) => [v, tx(env, l)]);
  // Número
  const curCat = categoryOf(f.numFmtCode);
  const catValue = curCat === 'date' ? 'shortDate' : curCat;
  const cat = select(opt(CATEGORIES), CATEGORIES.some(([v]) => v === catValue) ? catValue : 'custom');
  const code = document.createElement('input');
  code.type = 'text';
  code.value = f.numFmtCode;
  const codeField = field(tx(env, { en: 'Type:', pt: 'Tipo:' }), code);
  const syncCode = (): void => { codeField.hidden = cat.value !== 'custom'; };
  cat.addEventListener('change', syncCode);
  syncCode();
  const numberPane = document.createElement('div');
  numberPane.className = 'us-fmt-pane';
  numberPane.append(field(tx(env, { en: 'Category:', pt: 'Categoria:' }), cat), codeField);
  // Alinhamento
  const hal = select(opt(H_ALIGN), f.horizontal ?? 'general');
  const val = select(opt(V_ALIGN), f.vertical ?? 'bottom');
  const indent = document.createElement('input');
  indent.type = 'number';
  indent.min = '0';
  indent.max = '250';
  indent.value = String(f.indent);
  const wrap = check(tx(env, { en: 'Wrap text', pt: 'Quebrar texto automaticamente' }), f.wrap);
  const merge = check(tx(env, { en: 'Merge cells', pt: 'Mesclar células' }), f.merged);
  const alignPane = document.createElement('div');
  alignPane.className = 'us-fmt-pane';
  alignPane.append(field(tx(env, { en: 'Horizontal:', pt: 'Horizontal:' }), hal), field(tx(env, { en: 'Vertical:', pt: 'Vertical:' }), val),
    field(tx(env, { en: 'Indent:', pt: 'Recuo:' }), indent), wrap.el, merge.el);
  // Fonte
  const fontName = document.createElement('input');
  fontName.type = 'text';
  fontName.value = f.fontName;
  const size = document.createElement('input');
  size.type = 'text';
  size.value = String(f.fontSize);
  size.setAttribute('list', 'us-fmt-sizes');
  const sizes = document.createElement('datalist');
  sizes.id = 'us-fmt-sizes';
  for (const s of FONT_SIZES) { const o = document.createElement('option'); o.value = String(s); sizes.appendChild(o); }
  const bold = check(tx(env, { en: 'Bold', pt: 'Negrito' }), f.bold);
  const italic = check(tx(env, { en: 'Italic', pt: 'Itálico' }), f.italic);
  const underline = check(tx(env, { en: 'Underline', pt: 'Sublinhado' }), f.underline);
  const strike = check(tx(env, { en: 'Strikethrough', pt: 'Tachado' }), f.strike);
  const color = document.createElement('input');
  color.type = 'color';
  color.value = (f.color ?? '#000000').toLowerCase();
  const autoColor = check(tx(env, { en: 'Automatic color', pt: 'Cor automática' }), !f.color);
  color.addEventListener('input', () => { autoColor.input.checked = false; });
  const fontPane = document.createElement('div');
  fontPane.className = 'us-fmt-pane';
  const styles = document.createElement('div');
  styles.className = 'us-fmt-checks';
  styles.append(bold.el, italic.el, underline.el, strike.el);
  const colorRow = document.createElement('div');
  colorRow.className = 'us-fmt-checks';
  colorRow.append(field(tx(env, { en: 'Color:', pt: 'Cor:' }), color), autoColor.el);
  fontPane.append(field(tx(env, { en: 'Font:', pt: 'Fonte:' }), fontName), field(tx(env, { en: 'Size:', pt: 'Tamanho:' }), size), sizes, styles, colorRow);
  // Preenchimento
  const fill = document.createElement('input');
  fill.type = 'color';
  fill.value = (f.fill ?? '#ffffff').toLowerCase();
  const noFill = check(tx(env, { en: 'No color', pt: 'Sem cor' }), !f.fill);
  fill.addEventListener('input', () => { noFill.input.checked = false; });
  const fillPane = document.createElement('div');
  fillPane.className = 'us-fmt-pane';
  fillPane.append(field(tx(env, { en: 'Background color:', pt: 'Cor do plano de fundo:' }), fill), noFill.el);

  const tabs = dialogTabs([
    { id: 'number', label: tx(env, { en: 'Number', pt: 'Número' }), body: numberPane },
    { id: 'alignment', label: tx(env, { en: 'Alignment', pt: 'Alinhamento' }), body: alignPane },
    { id: 'font', label: tx(env, { en: 'Font', pt: 'Fonte' }), body: fontPane },
    { id: 'fill', label: tx(env, { en: 'Fill', pt: 'Preenchimento' }), body: fillPane },
  ], tab);
  const h = openDialog({
    title: { en: 'Format cells', pt: 'Formatar células' }, body: tabs.el, layer: env.layer, lang: env.lang, width: 460,
    actions: [{ id: 'cancel', label: { en: 'Cancel', pt: 'Cancelar' } }, { id: 'ok', label: { en: 'OK', pt: 'OK' }, primary: true }],
  });
  if ((await h.result) !== 'ok') return;
  const change: Parameters<UniversalSheetElement['setFormat']>[0] = {};
  const catNow = cat.value;
  if (catNow === 'custom') { if (code.value.trim() && code.value.trim() !== f.numFmtCode) change.numFmt = { code: code.value.trim() }; }
  else if (catNow !== catValue) change.numFmt = catNow as never;
  const align: NonNullable<typeof change.align> = {};
  if (hal.value !== (f.horizontal ?? 'general')) align.horizontal = hal.value;
  if (val.value !== (f.vertical ?? 'bottom')) align.vertical = val.value;
  if (wrap.input.checked !== f.wrap) align.wrapText = wrap.input.checked;
  const ind = Math.max(0, Math.min(250, Math.floor(num(indent.value) || 0)));
  if (ind !== f.indent) align.indent = ind;
  if (Object.keys(align).length) change.align = align;
  const font: NonNullable<typeof change.font> = {};
  if (fontName.value.trim() && fontName.value.trim() !== f.fontName) font.name = fontName.value.trim();
  const sz = num(size.value);
  if (sz >= 1 && sz <= 409 && sz !== f.fontSize) font.size = Math.round(sz * 2) / 2;
  if (bold.input.checked !== f.bold) font.bold = bold.input.checked;
  if (italic.input.checked !== f.italic) font.italic = italic.input.checked;
  if (underline.input.checked !== f.underline) font.underline = underline.input.checked;
  if (strike.input.checked !== f.strike) font.strike = strike.input.checked;
  const newColor = autoColor.input.checked ? null : color.value.toUpperCase();
  if ((newColor ?? '') !== (f.color ?? '').toUpperCase()) font.color = newColor;
  if (Object.keys(font).length) change.font = font;
  const newFill = noFill.input.checked ? null : fill.value.toUpperCase();
  if ((newFill ?? '') !== (f.fill ?? '').toUpperCase()) change.fill = newFill;
  if (Object.keys(change).length) env.el.setFormat(change);
  if (merge.input.checked !== f.merged) { if (merge.input.checked) env.el.merge('cells'); else env.el.unmerge(); }
  env.after();
}

/** Mesclar com dados fora da superior esquerda: o aviso do Excel. */
export async function confirmMerge(env: DialogEnv): Promise<boolean> {
  const r = await openDialog({
    title: { en: 'Merge cells', pt: 'Mesclar células' }, icon: 'warning', body: env.L.mergeLoses, layer: env.layer, lang: env.lang,
    actions: [{ id: 'cancel', label: { en: 'Cancel', pt: 'Cancelar' } }, { id: 'ok', label: { en: 'OK', pt: 'OK' }, primary: true }],
  }).result;
  return r === 'ok';
}

/** Propriedades da pasta (docProps): título, autor, datas, abas. */
export function propertiesDialog(env: DialogEnv, docName: string): void {
  const p = env.el.getProperties();
  const rows: [string, string | undefined][] = [
    [tx(env, { en: 'File name', pt: 'Nome do arquivo' }), `${docName}.xlsx`],
    [tx(env, { en: 'Title', pt: 'Título' }), p.title],
    [tx(env, { en: 'Subject', pt: 'Assunto' }), p.subject],
    [tx(env, { en: 'Author', pt: 'Autor' }), p.creator],
    [tx(env, { en: 'Last modified by', pt: 'Modificado por' }), p.lastModifiedBy],
    [tx(env, { en: 'Created', pt: 'Criado' }), fmtDate(env, p.created)],
    [tx(env, { en: 'Modified', pt: 'Modificado' }), fmtDate(env, p.modified)],
    [tx(env, { en: 'Application', pt: 'Aplicativo' }), p.application],
    [tx(env, { en: 'Sheets', pt: 'Planilhas' }), String(p.sheets.length) + (p.sheets.length ? ` (${p.sheets.join(', ')})` : '')],
  ];
  const table = document.createElement('table');
  table.className = 'us-props';
  for (const [k, v] of rows) {
    if (!v) continue;
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = k;
    const td = document.createElement('td');
    td.textContent = v;
    tr.append(th, td);
    table.appendChild(tr);
  }
  openDialog({ title: { en: 'Properties', pt: 'Propriedades' }, body: table, layer: env.layer, lang: env.lang, width: 440 });
}

function fmtDate(env: DialogEnv, iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString(env.lang === 'pt' ? 'pt-BR' : 'en-US');
}

/** Atalhos de teclado: os dos comandos e os da grade. */
export function shortcutsDialog(env: DialogEnv): void {
  const grid: [string, { en: string; pt: string }][] = [
    ['Shift+↑↓←→', { en: 'Extend the selection', pt: 'Estender a seleção' }],
    ['Ctrl+↑↓←→', { en: 'Move to the edge of the data', pt: 'Ir até a borda dos dados' }],
    ['Ctrl+Home · Ctrl+End', { en: 'First / last used cell', pt: 'Primeira / última célula usada' }],
    ['Ctrl+Space · Shift+Space', { en: 'Select the column / row', pt: 'Selecionar a coluna / linha' }],
    ['F2 · Enter', { en: 'Edit the active cell', pt: 'Editar a célula ativa' }],
    ['Tab · Shift+Tab', { en: 'Move right / left', pt: 'Mover para a direita / esquerda' }],
  ];
  const table = document.createElement('table');
  table.className = 'us-props us-keys';
  const row = (k: string, label: string): void => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = label;
    const td = document.createElement('td');
    td.textContent = k;
    tr.append(th, td);
    table.appendChild(tr);
  };
  const seen = new Set<string>();
  for (const id of env.reg.ids()) {
    const c = env.reg.get(id)!;
    if (!c.shortcut || !env.reg.supported(id) || seen.has(c.shortcut)) continue;
    seen.add(c.shortcut);
    row(c.shortcut, env.reg.label(id));
  }
  for (const [k, l] of grid) row(k, tx(env, l));
  const box = document.createElement('div');
  box.className = 'us-keys-box';
  box.appendChild(table);
  openDialog({ title: { en: 'Keyboard shortcuts', pt: 'Atalhos de teclado' }, body: box, layer: env.layer, lang: env.lang, width: 520 });
}

export function aboutDialog(env: DialogEnv): void {
  const box = document.createElement('div');
  box.className = 'us-about';
  const b = document.createElement('b');
  b.textContent = 'Universal Sheet';
  const p = document.createElement('p');
  p.textContent = tx(env, {
    en: 'An .xlsx editor with a canvas grid faithful to Microsoft Excel. Part of Universal Office — MIT License.',
    pt: 'Editor de .xlsx com a grade em canvas fiel ao Microsoft Excel. Parte do Universal Office — Licença MIT.',
  });
  box.append(b, p);
  openDialog({ title: { en: 'About', pt: 'Sobre' }, body: box, layer: env.layer, lang: env.lang, width: 400 });
}

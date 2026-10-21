// Diálogos de TABELA das barras do Write: Inserir Tabela, Converter Texto em
// Tabela, Converter em Texto, Inserir/Excluir Células, Dividir Células e
// Margens da Célula (Opções de Tabela) e Fórmula. Sobre o openDialog de
// @universal-office/ui; textos { en, pt } (inglês por padrão); medidas em cm,
// como o Word pt-BR.
import { openDialog, pickLabels, type UiLang } from '@universal-office/ui';
import { FORMULA_FUNCTIONS, type TextSeparator } from '@universal-office/docx-core';
import type { DialogEnv } from './chrome-dialogs.js';

export type TableDialogKind = 'insert' | 'fromText' | 'toText' | 'insertCells' | 'deleteCells' | 'split' | 'margins' | 'formula';

/** Formatos numéricos da lista do diálogo Fórmula (os do Word pt-BR; os dados seguem o pt-BR). */
const NUMBER_FORMATS = ['#.##0', '#.##0,00', 'R$ #.##0,00;(R$ #.##0,00)', '0', '0%', '0,00', '0,00%'];

type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { style?: string };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props<K> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
const tr = (lang: UiLang, en: string, pt: string): string => pickLabels(lang, { en, pt });

/** Grupo de botões de opção (um por linha). */
function radios(name: string, opts: readonly (readonly [string, string])[], value: string): { el: HTMLElement; value: () => string } {
  const box = el('div', { style: 'display:flex;flex-direction:column;gap:6px' });
  for (const [v, t] of opts) {
    const i = el('input', { type: 'radio', name, value: v, checked: v === value });
    box.append(el('label', { className: 'uo-check' }, i, t));
  }
  return { el: box, value: () => (box.querySelector(`input[name="${name}"]:checked`) as HTMLInputElement | null)?.value ?? value };
}

const num = (name: string, value: number, min = 1, max = 63): HTMLInputElement =>
  el('input', { type: 'number', name, min: String(min), max: String(max), step: '1', value: String(value) });

/** cm ↔ twips (2 casas, vírgula no português). */
const cmText = (lang: UiLang, tw: number): string => (Math.round((tw / 1440) * 254) / 100).toFixed(2).replace('.', tr(lang, '.', ','));
const cmInput = (lang: UiLang, name: string, tw: number): HTMLInputElement =>
  el('input', { type: 'text', name, inputMode: 'decimal', value: `${cmText(lang, tw)} cm`, style: 'width:96px' });
const twOf = (s: string): number | undefined => {
  const n = parseFloat(s.replace(',', '.').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? Math.round((n / 2.54) * 1440) : undefined;
};

const section = (title: string, ...kids: Node[]): HTMLElement =>
  el('div', { style: 'display:flex;flex-direction:column;gap:8px' }, el('strong', {}, title), ...kids);

async function ask(env: DialogEnv, title: string, body: HTMLElement, width = 400): Promise<boolean> {
  const L = env.app.ui!.L;
  const h = openDialog({ title, body, layer: env.layer, lang: env.lang, width,
    actions: [{ id: 'cancel', label: L.cancel }, { id: 'ok', label: 'OK', primary: true }] });
  return (await h.result) === 'ok';
}

/** Separador escolhido nos diálogos de conversão. */
function separatorPicker(lang: UiLang, name: string, value: string, other: string, paraLabel: string) {
  const opts = [['paragraph', paraLabel], ['tab', tr(lang, 'Tabs', 'Tabulações')], ['semicolon', tr(lang, 'Semicolons', 'Ponto e vírgula')], ['other', tr(lang, 'Other:', 'Outro:')]] as const;
  const r = radios(name, opts, value);
  const otherIn = el('input', { type: 'text', name: `${name}-other`, maxLength: 1, value: other, style: 'width:40px;margin-left:8px' });
  r.el.lastElementChild!.append(otherIn);
  otherIn.addEventListener('input', () => { (r.el.querySelector('input[value="other"]') as HTMLInputElement).checked = true; });
  const read = (): TextSeparator => {
    const v = r.value();
    return v === 'other' ? { char: otherIn.value || '-' } : v as TextSeparator;
  };
  return { el: r.el, read, radios: r.el };
}

/** AutoAjuste do Inserir Tabela / Converter Texto em Tabela. */
function autofitPicker(lang: UiLang, value: string, colTw?: number) {
  const r = radios('autofit', [
    ['fixed', tr(lang, 'Fixed column width:', 'Largura fixa da coluna:')],
    ['content', tr(lang, 'AutoFit to contents', 'AutoAjuste ao conteúdo')],
    ['window', tr(lang, 'AutoFit to window', 'AutoAjustar à janela')],
  ], value);
  const auto = tr(lang, 'Auto', 'Automático');
  const w = el('input', { type: 'text', name: 'colw', value: colTw ? `${cmText(lang, colTw)} cm` : auto, style: 'width:120px;margin-left:8px' });
  r.el.firstElementChild!.append(w);
  const read = (): { autofit: 'fixed' | 'content' | 'window'; colWidthTwips?: number } => {
    const a = r.value() as 'fixed' | 'content' | 'window';
    const tw = a === 'fixed' && w.value.trim() !== auto ? twOf(w.value) : undefined;
    return { autofit: a, ...(tw && tw > 0 ? { colWidthTwips: tw } : {}) };
  };
  return { el: r.el, read };
}

export async function tableDialog(env: DialogEnv, kind: TableDialogKind): Promise<void> {
  const lang = env.lang, ed = env.ed;
  switch (kind) {
    case 'insert': {
      // o Word abre com 5 × 2 (ou as dimensões lembradas)
      const mem = env.app.prefs.get('tableDims')?.split('x').map(Number);
      const cols = num('cols', mem?.[0] || 5), rows = num('rows', mem?.[1] || 2, 1, 32767);
      const af = autofitPicker(lang, 'fixed');
      const remember = el('input', { type: 'checkbox', name: 'remember', checked: !!mem });
      const body = el('div', { style: 'display:flex;flex-direction:column;gap:14px' },
        section(tr(lang, 'Table size', 'Tamanho da tabela'), el('div', { className: 'uo-dialog-grid' },
          el('span', {}, tr(lang, 'Number of columns:', 'Número de colunas:')), cols,
          el('span', {}, tr(lang, 'Number of rows:', 'Número de linhas:')), rows)),
        section(tr(lang, 'AutoFit behavior', 'Comportamento de AutoAjuste'), af.el),
        el('label', { className: 'uo-check' }, remember, tr(lang, 'Remember dimensions for new tables', 'Lembrar dimensões para novas tabelas')));
      if (!(await ask(env, tr(lang, 'Insert Table', 'Inserir Tabela'), body, 420))) return;
      const c = Math.max(1, Math.min(63, parseInt(cols.value, 10) || 1)), r = Math.max(1, parseInt(rows.value, 10) || 1);
      env.app.prefs.set('tableDims', remember.checked ? `${c}x${r}` : '');
      ed.insertTable(r, c, af.read());
      return;
    }
    case 'fromText': {
      const sep = separatorPicker(lang, 'sep', 'tab', '-', tr(lang, 'Paragraphs', 'Parágrafos'));
      const cols = num('cols', 2);
      const rowsOut = el('input', { type: 'number', name: 'rows', readOnly: true, value: '1', style: 'opacity:.7' });
      const af = autofitPicker(lang, 'fixed');
      // o diálogo do Word detecta o separador e conta colunas/linhas
      const guess = ed.textToTableGuess();
      if (guess) {
        (sep.radios.querySelector(`input[value="${typeof guess.separator === 'string' ? guess.separator : 'other'}"]`) as HTMLInputElement).checked = true;
        cols.value = String(guess.cols);
        rowsOut.value = String(guess.rows);
      }
      const recount = (): void => {
        const g = ed.textToTableGuess(sep.read(), parseInt(cols.value, 10) || 1);
        if (g) { if (document.activeElement !== cols) cols.value = String(g.cols); rowsOut.value = String(g.rows); }
      };
      sep.el.addEventListener('change', recount);
      cols.addEventListener('input', recount);
      const body = el('div', { style: 'display:flex;flex-direction:column;gap:14px' },
        section(tr(lang, 'Table size', 'Tamanho da tabela'), el('div', { className: 'uo-dialog-grid' },
          el('span', {}, tr(lang, 'Number of columns:', 'Número de colunas:')), cols,
          el('span', {}, tr(lang, 'Number of rows:', 'Número de linhas:')), rowsOut)),
        section(tr(lang, 'AutoFit behavior', 'Comportamento de AutoAjuste'), af.el),
        section(tr(lang, 'Separate text at', 'Separar texto em'), sep.el));
      if (!(await ask(env, tr(lang, 'Convert Text to Table', 'Converter Texto em Tabela'), body, 420))) return;
      ed.convertTextToTable({ separator: sep.read(), cols: parseInt(cols.value, 10) || 1, ...af.read() });
      return;
    }
    case 'toText': {
      const sep = separatorPicker(lang, 'sep', 'tab', '-', tr(lang, 'Paragraph marks', 'Marcas de parágrafo'));
      const body = section(tr(lang, 'Separate text with', 'Separar texto com'), sep.el);
      if (!(await ask(env, tr(lang, 'Convert Table To Text', 'Converter Tabela em Texto'), body, 360))) return;
      ed.convertTableToText(sep.read());
      return;
    }
    case 'insertCells': {
      const r = radios('shift', [
        ['right', tr(lang, 'Shift cells right', 'Deslocar células para a direita')],
        ['down', tr(lang, 'Shift cells down', 'Deslocar células para baixo')],
        ['row', tr(lang, 'Insert entire row', 'Inserir linha inteira')],
        ['column', tr(lang, 'Insert entire column', 'Inserir coluna inteira')],
      ], 'down');
      if (!(await ask(env, tr(lang, 'Insert Cells', 'Inserir Células'), r.el, 340))) return;
      ed.insertCells(r.value() as 'right' | 'down' | 'row' | 'column');
      return;
    }
    case 'deleteCells': {
      const r = radios('shift', [
        ['left', tr(lang, 'Shift cells left', 'Deslocar células para a esquerda')],
        ['up', tr(lang, 'Shift cells up', 'Deslocar células para cima')],
        ['row', tr(lang, 'Delete entire row', 'Excluir linha inteira')],
        ['column', tr(lang, 'Delete entire column', 'Excluir coluna inteira')],
      ], 'left');
      if (!(await ask(env, tr(lang, 'Delete Cells', 'Excluir Células'), r.el, 340))) return;
      ed.deleteCells(r.value() as 'left' | 'up' | 'row' | 'column');
      return;
    }
    case 'split': {
      const s = ed.getTableState();
      const cols = num('cols', 2), rows = num('rows', 1, 1, 32767);
      const merge = el('input', { type: 'checkbox', name: 'merge', checked: true, disabled: !s?.canMerge });
      const body = el('div', { style: 'display:flex;flex-direction:column;gap:14px' },
        el('div', { className: 'uo-dialog-grid' },
          el('span', {}, tr(lang, 'Number of columns:', 'Número de colunas:')), cols,
          el('span', {}, tr(lang, 'Number of rows:', 'Número de linhas:')), rows),
        el('label', { className: 'uo-check' }, merge, tr(lang, 'Merge cells before split', 'Mesclar células antes de dividir')));
      if (!(await ask(env, tr(lang, 'Split Cells', 'Dividir Células'), body, 340))) return;
      ed.splitCell(parseInt(cols.value, 10) || 1, parseInt(rows.value, 10) || 1, merge.checked);
      return;
    }
    case 'margins': {
      const s = ed.getTableState();
      const mar = s?.tblPr.tblCellMar ?? {};
      const w = (v?: { w: number; type: string }, d = 0): number => (v?.type === 'dxa' ? v.w : d);
      const top = cmInput(lang, 'top', w(mar.top)), bottom = cmInput(lang, 'bottom', w(mar.bottom));
      const left = cmInput(lang, 'left', w(mar.left, 108)), right = cmInput(lang, 'right', w(mar.right, 108));
      // tblCellSpacing guarda a METADE do espaçamento que o Word mostra
      const spTw = s?.tblPr.tblCellSpacing?.type === 'dxa' ? s.tblPr.tblCellSpacing.w * 2 : 0;
      const allow = el('input', { type: 'checkbox', name: 'allow', checked: spTw > 0 });
      const spacing = cmInput(lang, 'spacing', spTw);
      const resize = el('input', { type: 'checkbox', name: 'resize', checked: s?.tblPr.tblLayout !== 'fixed' });
      const body = el('div', { style: 'display:flex;flex-direction:column;gap:14px' },
        section(tr(lang, 'Default cell margins', 'Margens padrão da célula'), el('div', { className: 'uo-dialog-grid' },
          el('span', {}, tr(lang, 'Top:', 'Superior:')), top, el('span', {}, tr(lang, 'Left:', 'Esquerda:')), left,
          el('span', {}, tr(lang, 'Bottom:', 'Inferior:')), bottom, el('span', {}, tr(lang, 'Right:', 'Direita:')), right)),
        section(tr(lang, 'Default cell spacing', 'Espaçamento padrão entre células'),
          el('div', { style: 'display:flex;align-items:center;gap:8px' }, el('label', { className: 'uo-check' }, allow, tr(lang, 'Allow spacing between cells', 'Permitir espaçamento entre células')), spacing)),
        section(tr(lang, 'Options', 'Opções'), el('label', { className: 'uo-check' }, resize, tr(lang, 'Automatically resize to fit contents', 'Redimensionar automaticamente para ajustar conteúdo'))));
      if (!(await ask(env, tr(lang, 'Table Options', 'Opções de Tabela'), body, 440))) return;
      ed.setTableCellMargins(
        { top: twOf(top.value), left: twOf(left.value), bottom: twOf(bottom.value), right: twOf(right.value) },
        allow.checked ? twOf(spacing.value) ?? 0 : 0, resize.checked,
      );
      return;
    }
    case 'formula': {
      const formula = el('input', { type: 'text', name: 'formula', value: ed.suggestFormula(), style: 'width:100%;box-sizing:border-box' });
      const fmt = el('input', { type: 'text', name: 'format', value: '', style: 'flex:1;min-width:0' });
      const fmtList = el('select', { name: 'format-list', style: 'width:28px' }, el('option', { value: '' }, ''),
        ...NUMBER_FORMATS.map((f) => el('option', { value: f }, f)));
      fmtList.addEventListener('change', () => { fmt.value = fmtList.value; fmtList.value = ''; });
      // Colar função: o nome com parênteses no cursor da fórmula
      const fn = el('select', { name: 'function' }, el('option', { value: '' }, tr(lang, 'Paste function', 'Colar função')),
        ...FORMULA_FUNCTIONS.map((f) => el('option', { value: f }, f)));
      fn.addEventListener('change', () => {
        if (!fn.value) return;
        const a = formula.selectionStart ?? formula.value.length, b = formula.selectionEnd ?? a;
        const ins = `${fn.value}()`;
        formula.value = formula.value.slice(0, a) + ins + formula.value.slice(b);
        formula.focus();
        formula.setSelectionRange(a + ins.length - 1, a + ins.length - 1);
        fn.value = '';
      });
      const body = el('div', { style: 'display:flex;flex-direction:column;gap:12px' },
        el('label', { style: 'display:flex;flex-direction:column;gap:4px' }, tr(lang, 'Formula:', 'Fórmula:'), formula),
        el('label', { style: 'display:flex;flex-direction:column;gap:4px' }, tr(lang, 'Number format:', 'Formato do número:'),
          el('div', { style: 'display:flex;gap:4px' }, fmt, fmtList)),
        el('div', { style: 'display:flex;gap:8px;align-items:center' }, fn));
      queueMicrotask(() => { formula.focus(); formula.setSelectionRange(formula.value.length, formula.value.length); });
      if (!(await ask(env, tr(lang, 'Formula', 'Fórmula'), body, 380))) return;
      ed.insertFormula(formula.value, fmt.value.trim() || undefined);
      return;
    }
  }
}

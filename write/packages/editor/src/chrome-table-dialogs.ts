// Diálogos de TABELA das barras do Write: Inserir Tabela, Converter Texto em
// Tabela, Converter em Texto, Inserir/Excluir Células, Dividir Células e
// Margens da Célula (Opções de Tabela) e Fórmula. Sobre o openDialog de
// @universal-office/ui; textos { en, pt } (inglês por padrão); medidas em cm,
// como o Word pt-BR.
import { dialogTabs, openDialog, pickLabels, type UiLang } from '@universal-office/ui';
import { FORMULA_FUNCTIONS, type TblPr, type TblpPr, type TcPr, type TextSeparator, type WidthSpec } from '@universal-office/docx-core';
import type { SortRequest, TablePropertiesInput } from './universal-write.js';
import type { DialogEnv } from './chrome-dialogs.js';

export type TableDialogKind = 'insert' | 'fromText' | 'toText' | 'insertCells' | 'deleteCells' | 'split' | 'margins' | 'formula'
  | 'properties' | 'properties:row' | 'properties:column' | 'properties:cell' | 'properties:alt' | 'sort';

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
    case 'sort':
      return sortDialog(env);
    case 'properties': case 'properties:row': case 'properties:column': case 'properties:cell': case 'properties:alt':
      return propertiesDialog(env, kind === 'properties' ? 'table' : kind.slice(11));
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

// ───────────────────────── Propriedades da Tabela ─────────────────────────

const sel = (name: string, opts: readonly (readonly [string, string])[], value: string): HTMLSelectElement => {
  const s = el('select', { name });
  for (const [v, t] of opts) s.append(el('option', { value: v, selected: v === value }, t));
  return s;
};
const line = (...kids: (Node | string)[]): HTMLElement => el('div', { style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap' }, ...kids);
const check = (name: string, on: boolean, label: string): { el: HTMLElement; box: HTMLInputElement } => {
  const box = el('input', { type: 'checkbox', name, checked: on });
  return { el: el('label', { className: 'uo-check' }, box, label), box };
};

/** Botões de opção numa linha. */
function radiosRow(name: string, opts: readonly (readonly [string, string])[], value: string): { el: HTMLElement; value: () => string } {
  const box = el('div', { style: 'display:flex;gap:14px;flex-wrap:wrap' });
  for (const [v, t] of opts) box.append(el('label', { className: 'uo-check' }, el('input', { type: 'radio', name, value: v, checked: v === value }), t));
  return { el: box, value: () => (box.querySelector(`input[name="${name}"]:checked`) as HTMLInputElement | null)?.value ?? value };
}

/** Largura preferencial: caixa + "Medir em" (centímetros/porcentagem). */
function widthField(lang: UiLang, name: string, w: WidthSpec | undefined, defTw: number) {
  const on = !!w && (w.type === 'dxa' || w.type === 'pct') && w.w > 0;
  const c = check(`${name}-on`, on, tr(lang, 'Preferred width:', 'Largura preferencial:'));
  const unit = sel(`${name}-unit`, [['dxa', tr(lang, 'Centimeters', 'Centímetros')], ['pct', tr(lang, 'Percent', 'Porcentagem')]], w?.type === 'pct' ? 'pct' : 'dxa');
  const pctText = (v: number): string => `${Math.round((v / 50) * 10) / 10}%`.replace('.', tr(lang, '.', ','));
  const val = el('input', {
    type: 'text', name, inputMode: 'decimal', style: 'width:96px',
    value: w?.type === 'pct' ? pctText(w.w) : `${cmText(lang, on && w ? w.w : defTw)} cm`,
  });
  unit.addEventListener('change', () => { val.value = unit.value === 'pct' ? '100%' : `${cmText(lang, defTw)} cm`; });
  const sync = (): void => { val.disabled = unit.disabled = !c.box.checked; };
  c.box.addEventListener('change', sync);
  sync();
  const read = (): WidthSpec | null => {
    if (!c.box.checked) return null;
    if (unit.value === 'pct') {
      const n = parseFloat(val.value.replace(',', '.').replace(/[^0-9.]/g, ''));
      return Number.isFinite(n) && n > 0 ? { w: Math.round(n * 50), type: 'pct' } : null;
    }
    const tw = twOf(val.value);
    return tw && tw > 0 ? { w: tw, type: 'dxa' } : null;
  };
  return { el: line(c.el, val, el('span', {}, tr(lang, 'Measure in:', 'Medir em:')), unit), read };
}

/** Diálogo Propriedades da Tabela (guias Tabela, Linha, Coluna, Célula e Texto Alt): só o que mudou é aplicado, num passo de desfazer. */
async function propertiesDialog(env: DialogEnv, tab: string): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const s = ed.getTableState();
  if (!s) return;
  const t = s.tblPr, rp = s.trPr, cp = s.tcPr;

  // ── Tabela ──
  const tWidth = widthField(lang, 'tw', t.tblW, s.availTwips);
  const curAlign = t.jc === 'center' || t.jc === 'right' ? t.jc : 'left';
  const align = radiosRow('talign', [['left', tr(lang, 'Left', 'Esquerda')], ['center', tr(lang, 'Center', 'Centralizado')], ['right', tr(lang, 'Right', 'Direita')]], curAlign);
  const indent = cmInput(lang, 'tind', t.tblInd?.type === 'dxa' ? t.tblInd.w : 0);
  const syncInd = (): void => { indent.disabled = align.value() !== 'left'; };
  align.el.addEventListener('change', syncInd);
  syncInd();
  const wrap = radiosRow('twrap', [['none', tr(lang, 'None', 'Nenhuma')], ['around', tr(lang, 'Around', 'Ao redor')]], t.tblpPr ? 'around' : 'none');
  let position: TblpPr | undefined = t.tblpPr ? { ...t.tblpPr } : undefined;
  let overlap: boolean | undefined;
  const posBtn = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Positioning…', 'Posicionamento…') });
  const syncWrap = (): void => { posBtn.disabled = wrap.value() !== 'around'; };
  wrap.el.addEventListener('change', syncWrap);
  syncWrap();
  posBtn.addEventListener('click', () => {
    const p0 = position ?? { leftFromText: 141, rightFromText: 141, vertAnchor: 'text' as const, tblpY: 1 };
    void positioningDialog(env, p0, overlap ?? (!!t.tblpPr && t.tblOverlap !== 'never')).then((r) => {
      if (r) { position = r.pos; overlap = r.overlap; }
    });
  });
  const optBtn = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Options…', 'Opções…') });
  optBtn.addEventListener('click', () => { void tableDialog(env, 'margins'); });
  const tableTab = el('div', {},
    section(tr(lang, 'Size', 'Tamanho'), tWidth.el),
    section(tr(lang, 'Alignment', 'Alinhamento'), line(align.el, el('span', {}, tr(lang, 'Indent from left:', 'Recuo à esquerda:')), indent)),
    section(tr(lang, 'Text wrapping', 'Quebra automática de texto'), line(wrap.el, posBtn)),
    el('div', { style: 'display:flex;justify-content:flex-end;gap:8px' }, optBtn));

  // ── Linha ──
  const rowsLabel = s.rect.r1 === s.rect.r2
    ? tr(lang, `Row ${s.rect.r1 + 1}:`, `Linha ${s.rect.r1 + 1}:`)
    : tr(lang, `Rows ${s.rect.r1 + 1}-${s.rect.r2 + 1}:`, `Linhas ${s.rect.r1 + 1}-${s.rect.r2 + 1}:`);
  const hOn = check('rh-on', !!rp.trHeight, tr(lang, 'Specify height:', 'Especificar altura:'));
  const hVal = cmInput(lang, 'rh', rp.trHeight?.val ?? s.rowHeight?.twips ?? 0);
  const hRule = sel('rh-rule', [['atLeast', tr(lang, 'At least', 'Pelo menos')], ['exact', tr(lang, 'Exactly', 'Exatamente')]], rp.trHeight?.hRule === 'exact' ? 'exact' : 'atLeast');
  const syncH = (): void => { hVal.disabled = hRule.disabled = !hOn.box.checked; };
  hOn.box.addEventListener('change', syncH);
  syncH();
  const brk = check('r-break', !rp.cantSplit, tr(lang, 'Allow row to break across pages', 'Permitir quebra de linha entre páginas'));
  const hdr = check('r-header', !!rp.tblHeader, tr(lang, 'Repeat as header row at the top of each page', 'Repetir como linha de cabeçalho na parte superior de cada página'));
  const rowTab = el('div', {},
    el('strong', {}, rowsLabel),
    section(tr(lang, 'Size', 'Tamanho'), line(hOn.el, hVal, el('span', {}, tr(lang, 'Row height is:', 'A altura da linha é:')), hRule)),
    section(tr(lang, 'Options', 'Opções'), brk.el, hdr.el));

  // ── Coluna ──
  const colsLabel = s.rect.c1 === s.rect.c2
    ? tr(lang, `Column ${s.rect.c1 + 1}:`, `Coluna ${s.rect.c1 + 1}:`)
    : tr(lang, `Columns ${s.rect.c1 + 1}-${s.rect.c2 + 1}:`, `Colunas ${s.rect.c1 + 1}-${s.rect.c2 + 1}:`);
  const tcW = cp.tcW?.type === 'dxa' || cp.tcW?.type === 'pct' ? cp.tcW : undefined;
  const cWidth = widthField(lang, 'cw', tcW, s.colWidth);
  const colTab = el('div', {}, el('strong', {}, colsLabel), section(tr(lang, 'Size', 'Tamanho'), cWidth.el));

  // ── Célula ──
  const kWidth = widthField(lang, 'kw', tcW, s.colWidth);
  const curV = cp.vAlign === 'center' || cp.vAlign === 'bottom' ? cp.vAlign : 'top';
  const vAlign = radiosRow('kva', [['top', tr(lang, 'Top', 'Superior')], ['center', tr(lang, 'Center', 'Centralizado')], ['bottom', tr(lang, 'Bottom', 'Inferior')]], curV);
  let cellOpts: CellOptions | undefined;
  const cellBtn = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Options…', 'Opções…') });
  cellBtn.addEventListener('click', () => { void cellOptionsDialog(env, cp, t).then((r) => { if (r) cellOpts = r; }); });
  const cellTab = el('div', {},
    section(tr(lang, 'Size', 'Tamanho'), kWidth.el),
    section(tr(lang, 'Vertical alignment', 'Alinhamento vertical'), vAlign.el),
    el('div', { style: 'display:flex;justify-content:flex-end' }, cellBtn));

  // ── Texto Alt ──
  const title = el('input', { type: 'text', name: 'alt-title', value: t.tblCaption ?? '', style: 'width:100%' });
  const descr = el('textarea', { name: 'alt-descr', value: t.tblDescription ?? '', rows: 5, style: 'width:100%;resize:vertical;font:inherit' });
  const altTab = el('div', {},
    el('label', { style: 'display:flex;flex-direction:column;gap:4px' }, tr(lang, 'Title', 'Título'), title),
    el('label', { style: 'display:flex;flex-direction:column;gap:4px' }, tr(lang, 'Description', 'Descrição'), descr));

  const tabs = dialogTabs([
    { id: 'table', label: tr(lang, 'Table', 'Tabela'), body: tableTab },
    { id: 'row', label: tr(lang, 'Row', 'Linha'), body: rowTab },
    { id: 'column', label: tr(lang, 'Column', 'Coluna'), body: colTab },
    { id: 'cell', label: tr(lang, 'Cell', 'Célula'), body: cellTab },
    { id: 'alt', label: tr(lang, 'Alt Text', 'Texto Alt'), body: altTab },
  ], tab);
  if (!(await ask(env, tr(lang, 'Table Properties', 'Propriedades da Tabela'), tabs.el, 540))) return;

  // só o que mudou entra (o resto da tabela fica como está)
  const sameW = (a: WidthSpec | null, b?: WidthSpec): boolean =>
    a === null ? !b || b.type === 'auto' || b.type === 'nil' || !b.w : !!b && a.type === b.type && a.w === b.w;
  const out: TablePropertiesInput = {};
  const tb: NonNullable<TablePropertiesInput['table']> = {};
  const tw = tWidth.read();
  if (!sameW(tw, t.tblW)) tb.width = tw;
  const al = align.value() as 'left' | 'center' | 'right';
  if (al !== curAlign) tb.align = al;
  const ind = twOf(indent.value) ?? 0;
  if (al === 'left' && ind !== (t.tblInd?.type === 'dxa' ? t.tblInd.w : 0)) tb.indentTwips = ind;
  const wr = wrap.value() as 'none' | 'around';
  if (wr !== (t.tblpPr ? 'around' : 'none')) tb.wrap = wr;
  if (wr === 'around' && position && JSON.stringify(position) !== JSON.stringify(t.tblpPr ?? null)) tb.position = position;
  if (wr === 'around' && overlap !== undefined) tb.overlap = overlap;
  if (title.value !== (t.tblCaption ?? '')) tb.title = title.value;
  if (descr.value !== (t.tblDescription ?? '')) tb.description = descr.value;
  if (Object.keys(tb).length) out.table = tb;

  const rw: NonNullable<TablePropertiesInput['row']> = {};
  const hTw = twOf(hVal.value) ?? 0;
  const hNew = hOn.box.checked && hTw > 0 ? { twips: hTw, rule: hRule.value as 'atLeast' | 'exact' } : null;
  const hOld = rp.trHeight ? { twips: rp.trHeight.val, rule: rp.trHeight.hRule === 'exact' ? 'exact' : 'atLeast' } : null;
  if (JSON.stringify(hNew) !== JSON.stringify(hOld)) rw.height = hNew;
  if (brk.box.checked !== !rp.cantSplit) rw.allowBreak = brk.box.checked;
  if (hdr.box.checked !== !!rp.tblHeader) rw.header = hdr.box.checked;
  if (Object.keys(rw).length) out.row = rw;

  const cw = cWidth.read();
  if (!sameW(cw, tcW)) out.column = { width: cw };
  const cl: NonNullable<TablePropertiesInput['cell']> = {};
  const kw = kWidth.read();
  if (!out.column && !sameW(kw, tcW)) cl.width = kw;
  const va = vAlign.value() as 'top' | 'center' | 'bottom';
  if (va !== curV) cl.vAlign = va;
  if (cellOpts) { cl.margins = cellOpts.margins; cl.wrap = cellOpts.wrap; cl.fitText = cellOpts.fitText; }
  if (Object.keys(cl).length) out.cell = cl;
  if (Object.keys(out).length) ed.setTableProperties(out);
}

/** Posicionamento da Tabela (tabela flutuante: tblpPr). */
async function positioningDialog(env: DialogEnv, pos: TblpPr, overlap: boolean): Promise<{ pos: TblpPr; overlap: boolean } | null> {
  const lang = env.lang;
  const hSpecs = [['left', tr(lang, 'Left', 'Esquerda')], ['center', tr(lang, 'Center', 'Centralizado')], ['right', tr(lang, 'Right', 'Direita')],
    ['inside', tr(lang, 'Inside', 'Interna')], ['outside', tr(lang, 'Outside', 'Externa')]] as const;
  const vSpecs = [['top', tr(lang, 'Top', 'Superior')], ['center', tr(lang, 'Center', 'Centralizado')], ['bottom', tr(lang, 'Bottom', 'Inferior')],
    ['inside', tr(lang, 'Inside', 'Interna')], ['outside', tr(lang, 'Outside', 'Externa')]] as const;
  // posição: uma das palavras da lista ou uma medida (cm)
  const combo = (name: string, specs: readonly (readonly [string, string])[], spec: string | undefined, tw: number | undefined) => {
    const input = el('input', { type: 'text', name, style: 'width:120px', value: spec ? specs.find(([v]) => v === spec)?.[1] ?? spec : `${cmText(lang, tw ?? 0)} cm` });
    const list = el('select', { name: `${name}-list`, style: 'width:28px' }, el('option', { value: '' }, ''), ...specs.map(([v, x]) => el('option', { value: v }, x)));
    list.addEventListener('change', () => { if (list.value) input.value = specs.find(([v]) => v === list.value)![1]; list.value = ''; });
    const read = (): { spec?: string; tw?: number } => {
      const hit = specs.find(([, x]) => x.toLowerCase() === input.value.trim().toLowerCase());
      return hit ? { spec: hit[0] } : { tw: twOf(input.value) ?? 0 };
    };
    return { el: el('span', { style: 'display:inline-flex;gap:4px' }, input, list), read };
  };
  const hPos = combo('hpos', hSpecs, pos.tblpXSpec, pos.tblpX);
  const hRel = sel('hrel', [['text', tr(lang, 'Column', 'Coluna')], ['margin', tr(lang, 'Margin', 'Margem')], ['page', tr(lang, 'Page', 'Página')]], pos.horzAnchor ?? 'text');
  const vPos = combo('vpos', vSpecs, pos.tblpYSpec, pos.tblpY);
  const vRel = sel('vrel', [['margin', tr(lang, 'Margin', 'Margem')], ['page', tr(lang, 'Page', 'Página')], ['text', tr(lang, 'Paragraph', 'Parágrafo')]], pos.vertAnchor ?? 'text');
  const top = cmInput(lang, 'dtop', pos.topFromText ?? 0), bottom = cmInput(lang, 'dbottom', pos.bottomFromText ?? 0);
  const left = cmInput(lang, 'dleft', pos.leftFromText ?? 0), right = cmInput(lang, 'dright', pos.rightFromText ?? 0);
  const move = check('move', (pos.vertAnchor ?? 'text') === 'text', tr(lang, 'Move with text', 'Mover com texto'));
  move.box.addEventListener('change', () => { vRel.value = move.box.checked ? 'text' : 'margin'; });
  vRel.addEventListener('change', () => { move.box.checked = vRel.value === 'text'; });
  const ov = check('overlap', overlap, tr(lang, 'Allow overlap', 'Permitir sobreposição'));
  const grid = (...kids: Node[]): HTMLElement => el('div', { className: 'uo-dialog-grid' }, ...kids);
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:14px' },
    section(tr(lang, 'Horizontal', 'Horizontal'), grid(el('span', {}, tr(lang, 'Position:', 'Posição:')), hPos.el, el('span', {}, tr(lang, 'Relative to:', 'Em relação a:')), hRel)),
    section(tr(lang, 'Vertical', 'Vertical'), grid(el('span', {}, tr(lang, 'Position:', 'Posição:')), vPos.el, el('span', {}, tr(lang, 'Relative to:', 'Em relação a:')), vRel)),
    section(tr(lang, 'Distance from surrounding text', 'Distância do texto ao redor'), grid(
      el('span', {}, tr(lang, 'Top:', 'Superior:')), top, el('span', {}, tr(lang, 'Left:', 'Esquerda:')), left,
      el('span', {}, tr(lang, 'Bottom:', 'Inferior:')), bottom, el('span', {}, tr(lang, 'Right:', 'Direita:')), right)),
    section(tr(lang, 'Options', 'Opções'), move.el, ov.el));
  if (!(await ask(env, tr(lang, 'Table Positioning', 'Posicionamento da Tabela'), body, 440))) return null;
  const h = hPos.read(), v = vPos.read();
  const nz = (x: number | undefined): number | undefined => (x ? x : undefined);
  const out: TblpPr = {
    leftFromText: nz(twOf(left.value)), rightFromText: nz(twOf(right.value)), topFromText: nz(twOf(top.value)), bottomFromText: nz(twOf(bottom.value)),
    vertAnchor: vRel.value as TblpPr['vertAnchor'], horzAnchor: hRel.value === 'text' ? undefined : hRel.value as TblpPr['horzAnchor'],
    tblpXSpec: h.spec, tblpX: h.spec ? undefined : nz(h.tw), tblpYSpec: v.spec, tblpY: v.spec ? undefined : nz(v.tw),
  };
  for (const k of Object.keys(out) as (keyof TblpPr)[]) if (out[k] === undefined) delete out[k];
  return { pos: out, overlap: ov.box.checked };
}

type CellOptions = { margins: { top?: number; left?: number; bottom?: number; right?: number } | null; wrap: boolean; fitText: boolean };

/** Opções da Célula: margens próprias, quebra automática e ajustar texto. */
async function cellOptionsDialog(env: DialogEnv, cp: TcPr, t: TblPr): Promise<CellOptions | null> {
  const lang = env.lang;
  const tm = t.tblCellMar ?? {};
  const w = (v?: { w: number; type: string }, d = 0): number => (v?.type === 'dxa' ? v.w : d);
  const own = !!cp.tcMar && Object.keys(cp.tcMar).length > 0;
  const same = check('same', !own, tr(lang, 'Same as the whole table', 'Igual à tabela inteira'));
  const m = cp.tcMar ?? {};
  const top = cmInput(lang, 'top', w(m.top, w(tm.top))), bottom = cmInput(lang, 'bottom', w(m.bottom, w(tm.bottom)));
  const left = cmInput(lang, 'left', w(m.left, w(tm.left, 108))), right = cmInput(lang, 'right', w(m.right, w(tm.right, 108)));
  const syncM = (): void => { for (const i of [top, bottom, left, right]) i.disabled = same.box.checked; };
  same.box.addEventListener('change', syncM);
  syncM();
  const wrap = check('wrap', !cp.noWrap, tr(lang, 'Wrap text', 'Quebrar texto automaticamente'));
  const fit = check('fit', !!cp.tcFitText, tr(lang, 'Fit text', 'Ajustar texto'));
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:14px' },
    section(tr(lang, 'Cell margins', 'Margens da célula'), same.el, el('div', { className: 'uo-dialog-grid' },
      el('span', {}, tr(lang, 'Top:', 'Superior:')), top, el('span', {}, tr(lang, 'Left:', 'Esquerda:')), left,
      el('span', {}, tr(lang, 'Bottom:', 'Inferior:')), bottom, el('span', {}, tr(lang, 'Right:', 'Direita:')), right)),
    section(tr(lang, 'Options', 'Opções'), wrap.el, fit.el));
  if (!(await ask(env, tr(lang, 'Cell Options', 'Opções da Célula'), body, 400))) return null;
  return {
    margins: same.box.checked ? null : { top: twOf(top.value), left: twOf(left.value), bottom: twOf(bottom.value), right: twOf(right.value) },
    wrap: wrap.box.checked, fitText: fit.box.checked,
  };
}

// ───────────────────────── Classificar ─────────────────────────

/** Diálogo Classificar (tabela ou parágrafos): até três chaves, cabeçalho e opções. */
async function sortDialog(env: DialogEnv): Promise<void> {
  const lang = env.lang, ed = env.ed;
  let separator: SortRequest['separator'] = undefined;
  let caseSensitive = false;
  let info = ed.sortInfo();
  if (!info) return;
  if (info.mergeError) {
    const h = openDialog({
      title: tr(lang, 'Sort', 'Classificar'), icon: 'warning', layer: env.layer, lang,
      body: tr(lang, 'Cannot sort a table that contains merged cells.', 'Não é possível classificar uma tabela que contém células mescladas.'),
    });
    await h.result;
    return;
  }
  const types: [string, string][] = [['text', tr(lang, 'Text', 'Texto')], ['number', tr(lang, 'Number', 'Número')], ['date', tr(lang, 'Date', 'Data')]];
  const none = tr(lang, '(none)', '(nenhum)');
  const header = radiosRow('hdr', [['yes', tr(lang, 'Header row', 'Linha de cabeçalho')], ['no', tr(lang, 'No header row', 'Nenhuma linha de cabeçalho')]], info.header ? 'yes' : 'no');
  const isHeader = (): boolean => header.value() === 'yes';
  // rótulos: o texto do cabeçalho (se houver) ou Coluna N / Campo N / Parágrafos
  const labels = (): string[] => info!.columns.map((c, i) => {
    if (info!.kind === 'paragraphs') return info!.columns.length === 1 ? tr(lang, 'Paragraphs', 'Parágrafos') : tr(lang, `Field ${i + 1}`, `Campo ${i + 1}`);
    return isHeader() && c.text ? c.text : tr(lang, `Column ${i + 1}`, `Coluna ${i + 1}`);
  });
  const keyRow = (n: number) => {
    const col = el('select', { name: `k${n}-col`, style: 'min-width:160px' });
    const type = sel(`k${n}-type`, types, 'text');
    const dir = radiosRow(`k${n}-dir`, [['asc', tr(lang, 'Ascending', 'Crescente')], ['desc', tr(lang, 'Descending', 'Decrescente')]], 'asc');
    const fill = (): void => {
      const cur = col.value;
      col.replaceChildren(...(n > 0 ? [el('option', { value: '' }, none)] : []), ...labels().map((l, i) => el('option', { value: String(i) }, l)));
      col.value = cur && [...col.options].some((o) => o.value === cur) ? cur : n > 0 ? '' : '0';
    };
    const sync = (): void => {
      type.disabled = col.value === '';
      for (const i of dir.el.querySelectorAll('input')) (i as HTMLInputElement).disabled = col.value === '';
    };
    // o tipo sugerido pela coluna (todos números → Número; todas datas → Data)
    const guess = (): void => { const c = info!.columns[+col.value]; if (col.value !== '' && c) type.value = c.guess; };
    fill();
    guess();
    sync();
    col.addEventListener('change', () => { guess(); sync(); });
    const title = n === 0 ? tr(lang, 'Sort by', 'Classificar por') : tr(lang, 'Then by', 'E depois por');
    return {
      el: section(title, line(col, el('span', {}, tr(lang, 'Type:', 'Tipo:')), type), dir.el),
      fill: (): void => { fill(); sync(); },
      read: (): SortRequest['keys'][number] | null =>
        (col.value === '' ? null : { column: +col.value, type: type.value as 'text' | 'number' | 'date', desc: dir.value() === 'desc' }),
    };
  };
  const keys = [keyRow(0), keyRow(1), keyRow(2)];
  header.el.addEventListener('change', () => keys.forEach((k) => k.fill()));
  const opts = el('button', { type: 'button', className: 'uo-pill', textContent: tr(lang, 'Options…', 'Opções…') });
  opts.addEventListener('click', () => {
    void sortOptionsDialog(env, info!.kind === 'paragraphs', separator, caseSensitive).then((r) => {
      if (!r) return;
      separator = r.separator;
      caseSensitive = r.caseSensitive;
      info = ed.sortInfo(separator) ?? info;
      keys.forEach((k) => k.fill());
    });
  });
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:14px' },
    ...keys.map((k) => k.el),
    section(tr(lang, 'My list has', 'Minha lista tem'), header.el),
    el('div', { style: 'display:flex;justify-content:flex-end' }, opts));
  if (!(await ask(env, tr(lang, 'Sort', 'Classificar'), body, 460))) return;
  const ks = keys.map((k) => k.read()).filter((k): k is NonNullable<typeof k> => !!k);
  if (ks.length) ed.sort({ keys: ks, header: isHeader(), caseSensitive, separator });
}

/** Opções de Classificação: separador de campos (parágrafos) e diferenciar maiúsculas. */
async function sortOptionsDialog(env: DialogEnv, paragraphs: boolean, sep: SortRequest['separator'], cs: boolean)
  : Promise<{ separator: SortRequest['separator']; caseSensitive: boolean } | null> {
  const lang = env.lang;
  const cur = sep === undefined ? 'tab' : typeof sep === 'string' ? sep : 'other';
  const r = radiosRow('ssep', [['tab', tr(lang, 'Tabs', 'Tabulações')], ['comma', tr(lang, 'Commas', 'Vírgulas')], ['other', tr(lang, 'Other:', 'Outro:')]], cur);
  const other = el('input', { type: 'text', name: 'ssep-other', maxLength: 1, value: typeof sep === 'object' ? sep.char : '', style: 'width:40px' });
  other.addEventListener('input', () => { (r.el.querySelector('input[value="other"]') as HTMLInputElement).checked = true; });
  const use = check('fields', sep !== undefined, tr(lang, 'Sort by fields', 'Classificar por campos'));
  const csBox = check('case', cs, tr(lang, 'Case sensitive', 'Diferenciar maiúsculas de minúsculas'));
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:14px' },
    ...(paragraphs ? [section(tr(lang, 'Separate fields at', 'Separar campos em'), use.el, line(r.el, other))] : []),
    section(tr(lang, 'Sort options', 'Opções de classificação'), csBox.el));
  if (!(await ask(env, tr(lang, 'Sort Options', 'Opções de Classificação'), body, 380))) return null;
  const v = r.value();
  const separator: SortRequest['separator'] = !paragraphs || !use.box.checked ? undefined : v === 'other' ? { char: other.value || '-' } : v as 'tab' | 'comma';
  return { separator, caseSensitive: csBox.box.checked };
}

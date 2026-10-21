// Comandos, menus e grupos de TABELA das barras do Write (compacta e ribbon):
// Inserir > Tabela, a guia contextual "Layout da Tabela", Formatar > Tabela e
// o menu de contexto dentro de uma tabela. Só DECLARA sobre a API pública do
// <universal-write>; comando cuja API não existe fica oculto (supports).
import { symbol, type BarContext, type BarItem, type BarGroup, type Command, type CommandRegistry, type MenuEntry, type MenuItem, type RibbonCell } from '@universal-office/ui';
import type { UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type { ChromeCtl } from './chrome-commands.js';
import type { WidgetEnv } from './chrome-widgets.js';

const L = (en: string, pt: string): { en: string; pt: string } => ({ en, pt });

/** Ícone do alinhamento na célula: moldura + 3 linhas na posição (viewBox 0 -960 960 960). */
function alignIcon(v: 'top' | 'center' | 'bottom', h: 'left' | 'center' | 'right'): string {
  const y0 = v === 'top' ? -760 : v === 'center' ? -560 : -360;
  const bars = [[0, 360], [80, 260], [160, 360]].map(([dy, w]) => {
    const x = h === 'left' ? 200 : h === 'center' ? 480 - w! / 2 : 760 - w!;
    return `M${x} ${y0 + dy!}h${w}v40h-${w}z`;
  }).join('');
  return `<path d="M120-120v-720h720v720H120Zm60-60h600v-600H180v600Z${bars}"/>`;
}

const ALIGN: [string, 'top' | 'center' | 'bottom', 'left' | 'center' | 'right', string, string][] = [
  ['tl', 'top', 'left', 'Align Top Left', 'Alinhar em Cima à Esquerda'], ['tc', 'top', 'center', 'Align Top Center', 'Alinhar em Cima no Centro'],
  ['tr', 'top', 'right', 'Align Top Right', 'Alinhar em Cima à Direita'], ['cl', 'center', 'left', 'Align Center Left', 'Alinhar no Centro à Esquerda'],
  ['cc', 'center', 'center', 'Align Center', 'Alinhar no Centro'], ['cr', 'center', 'right', 'Align Center Right', 'Alinhar no Centro à Direita'],
  ['bl', 'bottom', 'left', 'Align Bottom Left', 'Alinhar Embaixo à Esquerda'], ['bc', 'bottom', 'center', 'Align Bottom Center', 'Alinhar Embaixo no Centro'],
  ['br', 'bottom', 'right', 'Align Bottom Right', 'Alinhar Embaixo à Direita'],
];

export function registerTableCommands(reg: CommandRegistry, ed: UniversalWriteElement, app: WriteApp, ctl: ChromeCtl): void {
  const api = ed as unknown as Record<string, unknown>;
  const has = (m: string) => (): boolean => typeof api[m] === 'function';
  const canEdit = (): boolean => !app.comparing && !ed.isProtected();
  const tbl = () => ctl.state().table;
  const inTable = (): boolean => canEdit() && !!tbl();
  const t = (c: Omit<Command, 'isEnabled'> & { isEnabled?: () => boolean }): Command =>
    ({ ...c, isEnabled: c.isEnabled ? () => inTable() && c.isEnabled!() : inTable });
  const cmds: Command[] = [
    // ── Inserir ──
    { id: 'table', label: L('Table', 'Tabela'), tip: L('Insert table', 'Inserir tabela'), icon: 'table', supports: has('insertTable'), run: () => ctl.tableDialog('insert'), isEnabled: canEdit },
    { id: 'table:insertDlg', label: L('Insert Table…', 'Inserir Tabela…'), icon: 'table', supports: has('insertTable'), run: () => ctl.tableDialog('insert'), isEnabled: canEdit },
    { id: 'table:fromText', label: L('Convert Text to Table…', 'Converter Texto em Tabela…'), icon: 'table_convert', supports: has('convertTextToTable'), run: () => ctl.tableDialog('fromText'), isEnabled: () => canEdit() && !tbl() },
    // ── Layout da Tabela: Tabela ──
    t({ id: 'table:select:cell', label: L('Select Cell', 'Selecionar Célula'), icon: 'crop_square', supports: has('selectCell'), run: () => ed.selectCell() }),
    t({ id: 'table:select:column', label: L('Select Column', 'Selecionar Coluna'), icon: 'view_column', supports: has('selectColumn'), run: () => ed.selectColumn() }),
    t({ id: 'table:select:row', label: L('Select Row', 'Selecionar Linha'), icon: 'table_rows', supports: has('selectRow'), run: () => ed.selectRow() }),
    t({ id: 'table:select:table', label: L('Select Table', 'Selecionar Tabela'), icon: 'select_all', supports: has('selectTable'), run: () => ed.selectTable() }),
    // ── Linhas e Colunas ──
    t({ id: 'row:above', label: L('Insert Above', 'Inserir Acima'), icon: 'add_row_above', supports: has('insertRowAbove'), run: () => ed.insertRowAbove() }),
    t({ id: 'row:below', label: L('Insert Below', 'Inserir Abaixo'), icon: 'add_row_below', supports: has('insertRowBelow'), run: () => ed.insertRowBelow() }),
    t({ id: 'col:left', label: L('Insert Left', 'Inserir à Esquerda'), icon: 'add_column_left', supports: has('insertColumnLeft'), run: () => ed.insertColumnLeft() }),
    t({ id: 'col:right', label: L('Insert Right', 'Inserir à Direita'), icon: 'add_column_right', supports: has('insertColumnRight'), run: () => ed.insertColumnRight() }),
    t({ id: 'cells:insertDlg', label: L('Insert Cells…', 'Inserir Células…'), icon: 'add_box', supports: has('insertCells'), run: () => ctl.tableDialog('insertCells') }),
    t({ id: 'cells:deleteDlg', label: L('Delete Cells…', 'Excluir Células…'), icon: 'disabled_by_default', supports: has('deleteCells'), run: () => ctl.tableDialog('deleteCells') }),
    t({ id: 'col:delete', label: L('Delete Columns', 'Excluir Colunas'), icon: 'delete', supports: has('deleteColumn'), run: () => ed.deleteColumn() }),
    t({ id: 'row:delete', label: L('Delete Rows', 'Excluir Linhas'), icon: 'delete', supports: has('deleteRow'), run: () => ed.deleteRow() }),
    t({ id: 'table:delete', label: L('Delete Table', 'Excluir Tabela'), icon: 'delete_forever', supports: has('deleteTable'), run: () => ed.deleteTable() }),
    // ── Mesclar ──
    t({ id: 'cells:merge', label: L('Merge Cells', 'Mesclar Células'), icon: 'cell_merge', supports: has('mergeCells'), run: () => ed.mergeCells(), isEnabled: () => !!tbl()?.canMerge }),
    t({ id: 'cells:split', label: L('Split Cells…', 'Dividir Células…'), icon: 'splitscreen_vertical_add', supports: has('splitCell'), run: () => ctl.tableDialog('split') }),
    t({ id: 'table:split', label: L('Split Table', 'Dividir Tabela'), icon: 'splitscreen', supports: has('splitTable'), run: () => ed.splitTable() }),
    // ── Tamanho da Célula ──
    t({ id: 'table:autofit:content', label: L('AutoFit Contents', 'AutoAjuste de Conteúdo'), icon: 'fit_width', supports: has('autoFitTable'), run: () => ed.autoFitTable('content') }),
    t({ id: 'table:autofit:window', label: L('AutoFit Window', 'AutoAjuste de Janela'), icon: 'expand_content', supports: has('autoFitTable'), run: () => ed.autoFitTable('window') }),
    t({ id: 'table:autofit:fixed', label: L('Fixed Column Width', 'Largura Fixa da Coluna'), icon: 'width_normal', supports: has('autoFitTable'), run: () => ed.autoFitTable('fixed') }),
    t({ id: 'rows:distribute', label: L('Distribute Rows', 'Distribuir Linhas'), icon: 'view_agenda', supports: has('distributeRows'), run: () => ed.distributeRows() }),
    t({ id: 'cols:distribute', label: L('Distribute Columns', 'Distribuir Colunas'), icon: 'view_week', supports: has('distributeColumns'), run: () => ed.distributeColumns() }),
    // ── Alinhamento ──
    ...ALIGN.map(([id, v, h, en, pt]) => t({
      id: `cell:align:${id}`, label: L(en, pt), icon: alignIcon(v, h), supports: has('setCellAlignment'),
      run: () => ed.setCellAlignment(h, v),
      isChecked: () => {
        const s = tbl();
        const ph = (ctl.state().para.alignment as string | undefined) ?? 'left';
        return !!s && s.vAlign === v && ph === h;
      },
    })),
    t({ id: 'cell:textdir', label: L('Text Direction', 'Direção do Texto'), icon: 'text_rotate_vertical', supports: has('cycleTextDirection'), run: () => ed.cycleTextDirection() }),
    t({ id: 'cell:margins', label: L('Cell Margins', 'Margens da Célula'), icon: 'padding', supports: has('setTableCellMargins'), run: () => ctl.tableDialog('margins') }),
    // ── Dados ──
    t({ id: 'table:headerRows', label: L('Repeat Header Rows', 'Repetir Linhas de Cabeçalho'), icon: 'view_headline', supports: has('toggleRepeatHeaderRows'), run: () => ed.toggleRepeatHeaderRows(), isChecked: () => !!tbl()?.headerRow }),
    t({ id: 'table:toText', label: L('Convert to Text', 'Converter em Texto'), icon: 'text_snippet', supports: has('convertTableToText'), run: () => ctl.tableDialog('toText') }),
  ];
  reg.add(...cmds);
}

/** Grade "inserir tabela" + os itens do menu Tabela (Inserir). */
export const tableMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => [{
  content: (close) => {
    const box = document.createElement('div');
    const cap = document.createElement('div');
    cap.style.cssText = 'font-size:12.5px;margin-bottom:6px';
    cap.textContent = env.app.ui!.L.rows(1, 1);
    const g = document.createElement('div');
    g.style.cssText = 'display:grid;grid-template-columns:repeat(10,18px);gap:3px';
    const cells: HTMLElement[] = [];
    for (let r = 1; r <= 8; r++) for (let c = 1; c <= 10; c++) {
      const cell = document.createElement('div');
      cell.style.cssText = 'width:18px;height:18px;border:1px solid currentColor;opacity:.35;border-radius:2px;cursor:pointer';
      cell.addEventListener('mouseenter', () => {
        cap.textContent = env.app.ui!.L.rows(r, c);
        cells.forEach((x, i) => { const rr = Math.floor(i / 10) + 1, cc = (i % 10) + 1; x.style.opacity = rr <= r && cc <= c ? '1' : '.35'; });
      });
      cell.addEventListener('mousedown', (e) => e.preventDefault());
      cell.addEventListener('click', () => {
        close();
        env.ed.insertTable(r, c);
        ctx.after();
      });
      cells.push(cell);
      g.appendChild(cell);
    }
    box.append(cap, g);
    return box;
  },
}, '-', 'table:insertDlg', 'table:fromText'];

/** Medida da célula (Altura/Largura) com setas — cm, como o Word pt-BR. */
const measureWidget = (env: WidgetEnv, which: 'height' | 'width'): BarItem => ({
  widget: (ctx) => {
    const wrap = document.createElement('span');
    wrap.style.cssText = 'display:inline-flex;align-items:center;gap:4px';
    const ic = document.createElement('span');
    ic.innerHTML = symbol(which);
    ic.style.cssText = 'display:inline-flex;opacity:.8';
    const input = document.createElement('input');
    input.className = 'uo-num';
    input.inputMode = 'decimal';
    input.style.width = '64px';
    input.title = ctx.registry.text(which === 'height' ? L('Table Row Height', 'Altura da Linha da Tabela') : L('Table Column Width', 'Largura da Coluna da Tabela'));
    input.setAttribute('aria-label', input.title);
    const dec = ctx.registry.text(L('.', ','));
    const cm = (tw: number): string => `${(Math.round((tw / 1440) * 254) / 100).toFixed(2).replace('.', dec)} cm`;
    const tw = (s: string): number | undefined => {
      const n = parseFloat(s.replace(',', '.').replace(/[^0-9.]/g, ''));
      return Number.isFinite(n) ? Math.round((n / 2.54) * 1440) : undefined;
    };
    const cur = (): number => {
      const s = env.ctl.state().table;
      return which === 'height' ? s?.rowHeight?.twips ?? 0 : s?.colWidth ?? 0;
    };
    const set = (v: number): void => {
      if (which === 'height') env.ed.setRowHeight(Math.max(0, v), env.ctl.state().table?.rowHeight?.rule === 'exact' ? 'exact' : 'atLeast');
      else env.ed.setColumnWidth(Math.max(57, v));
      ctx.after();
    };
    const apply = (): void => { const v = tw(input.value); if (v !== undefined) set(v); };
    input.addEventListener('change', apply);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
    const step = (d: number): void => set(cur() + d * 57); // 0,1 cm
    const up = document.createElement('button'), dn = document.createElement('button');
    for (const [b, d, s] of [[up, 1, 'keyboard_arrow_up'], [dn, -1, 'keyboard_arrow_down']] as const) {
      b.type = 'button';
      b.className = 'uo-btn';
      b.style.cssText = 'width:18px;height:14px;min-width:0;padding:0';
      b.innerHTML = symbol(s);
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => step(d));
    }
    const arrows = document.createElement('span');
    arrows.style.cssText = 'display:inline-flex;flex-direction:column';
    arrows.append(up, dn);
    wrap.append(ic, input, arrows);
    return {
      el: wrap,
      sync: () => {
        const s = env.ctl.state().table;
        const off = !s || env.ed.isProtected();
        input.disabled = up.disabled = dn.disabled = off;
        if (document.activeElement !== input && env.ed.shadowRoot?.activeElement !== input) input.value = s ? cm(cur()) : '';
      },
    };
  },
});

/** Menus da guia Layout da Tabela (Selecionar, Excluir, AutoAjuste). */
const selectMenu = (): MenuEntry[] => ['table:select:cell', 'table:select:column', 'table:select:row', 'table:select:table'];
const deleteMenu = (): MenuEntry[] => ['cells:deleteDlg', 'col:delete', 'row:delete', 'table:delete'];
const autofitMenu = (): MenuEntry[] => ['table:autofit:content', 'table:autofit:window', 'table:autofit:fixed'];

/** Guia contextual "Layout da Tabela" da ribbon. */
export function tableLayoutGroups(env: WidgetEnv): BarGroup[] {
  const big = (cmd: string): BarItem => ({ cmd, size: 'large' });
  const has = (m: string) => (): boolean => typeof (env.ed as unknown as Record<string, unknown>)[m] === 'function';
  const alignGrid: RibbonCell = { rows: [['cell:align:tl', 'cell:align:tc', 'cell:align:tr'], ['cell:align:cl', 'cell:align:cc', 'cell:align:cr'], ['cell:align:bl', 'cell:align:bc', 'cell:align:br']] };
  return [
    { id: 'tl-table', label: L('Table', 'Tabela'), icon: 'table', prio: 3, cells: [
      { rows: [[{ menu: selectMenu, id: 'table:select', label: L('Select', 'Selecionar'), icon: 'select_all', showLabel: true, supports: has('selectTable') }]] },
    ] },
    { id: 'tl-rows', label: L('Rows & Columns', 'Linhas e Colunas'), icon: 'table_rows', prio: 6, launcher: 'cells:insertDlg', cells: [
      { menu: deleteMenu, id: 'table:deleteMenu', label: L('Delete', 'Excluir'), icon: 'delete', size: 'large', supports: has('deleteRow') },
      big('row:above'), { rows: [[{ cmd: 'row:below', label: true }], [{ cmd: 'col:left', label: true }], [{ cmd: 'col:right', label: true }]] },
    ] },
    { id: 'tl-merge', label: L('Merge', 'Mesclar'), icon: 'cell_merge', prio: 5, cells: [
      { rows: [[{ cmd: 'cells:merge', label: true }], [{ cmd: 'cells:split', label: true }], [{ cmd: 'table:split', label: true }]] },
    ] },
    { id: 'tl-size', label: L('Cell Size', 'Tamanho da Célula'), icon: 'width', prio: 4, cells: [
      { menu: autofitMenu, id: 'table:autofit', label: L('AutoFit', 'AutoAjuste'), icon: 'fit_width', size: 'large', supports: has('autoFitTable') },
      { rows: [[measureWidget(env, 'height')], [measureWidget(env, 'width')]] },
      { rows: [[{ cmd: 'rows:distribute', label: true }], [{ cmd: 'cols:distribute', label: true }]] },
    ] },
    { id: 'tl-align', label: L('Alignment', 'Alinhamento'), icon: 'vertical_align_center', prio: 5, cells: [
      alignGrid, big('cell:textdir'), big('cell:margins'),
    ] },
    { id: 'tl-data', label: L('Data', 'Dados'), icon: 'functions', prio: 2, cells: [
      { rows: [[{ cmd: 'table:headerRows', label: true }], [{ cmd: 'table:toText', label: true }]] },
    ] },
  ];
}

/** Formatar > Tabela (barra compacta). */
export const tableFormatMenu = (): MenuItem => ({
  id: 'tableFmt', label: L('Table', 'Tabela'), icon: 'table',
  submenu: () => [
    'row:above', 'row:below', 'col:left', 'col:right', 'cells:insertDlg', '-',
    'row:delete', 'col:delete', 'cells:deleteDlg', 'table:delete', '-',
    'cells:merge', 'cells:split', 'table:split', '-',
    { id: 'tableFmt:select', label: L('Select', 'Selecionar'), icon: 'select_all', submenu: selectMenu },
    { id: 'tableFmt:autofit', label: L('AutoFit', 'AutoAjuste'), icon: 'fit_width', submenu: autofitMenu },
    'rows:distribute', 'cols:distribute', '-',
    { id: 'tableFmt:align', label: L('Cell alignment', 'Alinhamento da célula'), icon: 'vertical_align_center', submenu: () => ALIGN.map(([id]) => `cell:align:${id}`) },
    'cell:textdir', 'cell:margins', '-', 'table:headerRows', 'table:toText',
  ],
});

/** Itens do menu de contexto dentro de uma tabela. */
export const tableContextItems = (): MenuEntry[] => [
  { id: 'ctxTableInsert', label: L('Insert', 'Inserir'), icon: 'add', submenu: () => ['row:above', 'row:below', 'col:left', 'col:right', 'cells:insertDlg'] },
  { id: 'ctxTableDelete', label: L('Delete', 'Excluir'), icon: 'delete', submenu: deleteMenu },
  'cells:merge', 'cells:split', '-',
  { id: 'ctxTableAlign', label: L('Cell alignment', 'Alinhamento da célula'), icon: 'vertical_align_center', submenu: () => ALIGN.map(([id]) => `cell:align:${id}`) },
  'cell:textdir', { id: 'ctxTableAutofit', label: L('AutoFit', 'AutoAjuste'), icon: 'fit_width', submenu: autofitMenu },
  'rows:distribute', 'cols:distribute', '-',
];


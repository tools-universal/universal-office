// Comandos, menus e grupos de TABELA das barras do Write (compacta e ribbon):
// Inserir > Tabela, a guia contextual "Layout da Tabela", Formatar > Tabela e
// o menu de contexto dentro de uma tabela. Só DECLARA sobre a API pública do
// <universal-write>; comando cuja API não existe fica oculto (supports).
import { pickLabels, symbol, colorGrid, themePaletteColors, parseThemePick, STANDARD_COLORS, type BarContext, type BarItem, type BarGroup, type Command, type CommandRegistry, type MenuEntry, type MenuItem, type RibbonCell } from '@universal-office/ui';
import type { UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type { ChromeCtl } from './chrome-commands.js';
import type { WidgetEnv } from './chrome-widgets.js';
import { BORDER_STYLES, BORDER_WIDTHS, borderSampleSvg } from './chrome-borders.js';

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
    { id: 'table:gridlines', label: L('View Gridlines', 'Exibir Linhas de Grade'), icon: 'grid_on', supports: has('showTableGridlines'),
      run: () => { const on = !ed.tableGridlinesShown(); ed.showTableGridlines(on); app.prefs.set('tableGridlines', on ? '1' : ''); },
      isChecked: () => ed.tableGridlinesShown() },
    t({ id: 'table:properties', label: L('Properties', 'Propriedades'), tip: L('Table Properties', 'Propriedades da Tabela'), icon: 'tune', supports: has('setTableProperties'), run: () => ctl.tableDialog('properties') }),
    t({ id: 'table:propertiesDlg', label: L('Table Properties…', 'Propriedades da Tabela…'), icon: 'tune', supports: has('setTableProperties'), run: () => ctl.tableDialog('properties') }),
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
    { id: 'sort', label: L('Sort', 'Classificar'), tip: L('Sort (rows of the table or the selected paragraphs)', 'Classificar (linhas da tabela ou os parágrafos selecionados)'), icon: 'sort_by_alpha', supports: has('sort'), isEnabled: canEdit, run: () => ctl.tableDialog('sort') },
    t({ id: 'table:formula', label: L('Formula', 'Fórmula'), tip: L('Formula (F9 updates)', 'Fórmula (F9 atualiza)'), icon: 'functions', supports: has('insertFormula'), run: () => ctl.tableDialog('formula'), isEnabled: () => !tbl()?.cells }),
    { id: 'fields:update', label: L('Update Fields', 'Atualizar Campos'), icon: 'autorenew', shortcut: 'F9', supports: has('updateFields'), isEnabled: canEdit,
      run: () => { if (!ed.updateFields()) ctl.flash(pickLabels(app.lang, L('No fields to update', 'Nenhum campo para atualizar'))); } },
    // ── Design da Tabela: Opções de Estilo ──
    ...LOOK.map(([id, key, en, pt]) => t({
      id: `table:look:${id}`, label: L(en, pt), icon: 'check_box_outline_blank', supports: has('setTableStyleOptions'),
      run: () => ed.setTableStyleOptions({ [key]: !lookOn(tbl()?.look, key) }),
      isChecked: () => lookOn(tbl()?.look, key),
    })),
    // ── Estilos de Tabela ──
    t({ id: 'table:style:clear', label: L('Clear', 'Limpar'), icon: 'format_clear', supports: has('setTableStyle'), run: () => { void ed.setTableStyle(null); } }),
    t({ id: 'table:shading', label: L('Shading', 'Sombreamento'), icon: 'format_color_fill', supports: has('setCellShading'),
      run: () => ed.setCellShading(app.lastTableShading), color: () => app.lastTableShadingCss }),
    // ── Bordas ──
    ...BORDERS.map(([kind, en, pt, icon]) => t({
      id: `table:border:${kind}`, label: L(en, pt), icon, supports: has('setCellBorders'),
      run: () => { app.lastTableBorder = kind; ed.setCellBorders(kind); },
    })),
    t({ id: 'table:borders', label: L('Borders', 'Bordas'), icon: 'border_all', supports: has('setCellBorders'),
      run: () => ed.setCellBorders(app.lastTableBorder) }),
    { id: 'table:painter', label: L('Border Painter', 'Pincel de Bordas'), tip: L('Border Painter: click cell borders to apply the pen (Esc ends)', 'Pincel de Bordas: clique nas bordas das células para aplicar a caneta (Esc encerra)'),
      icon: 'format_paint', supports: has('setTableTool'), isEnabled: canEdit, run: () => ed.setTableTool('painter'), isChecked: () => ed.getTableTool() === 'painter' },
    { id: 'table:draw', label: L('Draw Table', 'Desenhar Tabela'), tip: L('Draw Table: drag inside a cell to split it, outside to create a table (Esc ends)', 'Desenhar Tabela: arraste numa célula para dividi-la, fora para criar uma tabela (Esc encerra)'),
      icon: 'draw', supports: has('setTableTool'), isEnabled: canEdit, run: () => ed.setTableTool('draw'), isChecked: () => ed.getTableTool() === 'draw' },
    { id: 'table:eraser', label: L('Eraser', 'Borracha'), tip: L('Eraser: click a border between cells to merge them (Esc ends)', 'Borracha: clique numa divisa entre células para mesclá-las (Esc encerra)'),
      icon: 'ink_eraser', supports: has('setTableTool'), isEnabled: canEdit, run: () => ed.setTableTool('eraser'), isChecked: () => ed.getTableTool() === 'eraser' },
    // Opções de colagem de células (depois de copiar células)
    ...([['overwrite', 'Overwrite Cells', 'Substituir Células', 'content_paste'], ['rows', 'Insert as New Rows', 'Inserir como Novas Linhas', 'add_row_above'],
      ['nest', 'Nest Table', 'Aninhar Tabela', 'table'], ['text', 'Keep Text Only', 'Manter Somente Texto', 'text_snippet']] as const).map(([mode, en, pt, icon]): Command => ({
      id: `paste:cells:${mode}`, label: L(en, pt), icon, supports: has('pasteCells'),
      isEnabled: () => canEdit() && ed.hasCellsClip() && (mode === 'text' || mode === 'overwrite' || !!tbl()),
      run: () => { ed.pasteCells(mode); },
    })),
    { id: 'dlg:borders', label: L('Borders and Shading…', 'Bordas e Sombreamento…'), icon: 'border_style', supports: has('setParagraphBorders'), isEnabled: canEdit, run: () => ctl.tableDialog('borders') },
    { id: 'dlg:pageBorders', label: L('Page Borders', 'Bordas de Página'), tip: L('Page Borders (Borders and Shading)', 'Bordas de Página (Bordas e Sombreamento)'), icon: 'border_outer', supports: has('setPageBorders'), isEnabled: canEdit, run: () => ctl.tableDialog('pageBorders') },
  ];
  reg.add(...cmds);
}

type LookKey = 'headerRow' | 'totalRow' | 'bandedRows' | 'firstColumn' | 'lastColumn' | 'bandedColumns';
const LOOK: [string, LookKey, string, string][] = [
  ['header', 'headerRow', 'Header Row', 'Linha de Cabeçalho'], ['first', 'firstColumn', 'First Column', 'Primeira Coluna'],
  ['total', 'totalRow', 'Total Row', 'Linha de Total'], ['last', 'lastColumn', 'Last Column', 'Última Coluna'],
  ['bandedRows', 'bandedRows', 'Banded Rows', 'Linhas em Tiras'], ['bandedCols', 'bandedColumns', 'Banded Columns', 'Colunas em Tiras'],
];
const lookOn = (look: import('@universal-office/docx-core').TblLook | undefined, k: LookKey): boolean => {
  if (!look) return false;
  switch (k) {
    case 'headerRow': return !!look.firstRow;
    case 'totalRow': return !!look.lastRow;
    case 'firstColumn': return !!look.firstColumn;
    case 'lastColumn': return !!look.lastColumn;
    case 'bandedRows': return !look.noHBand;
    case 'bandedColumns': return !look.noVBand;
  }
};

type BorderKind = import('@universal-office/docx-core').BorderKind;
const BORDERS: [BorderKind, string, string, string][] = [
  ['bottom', 'Bottom Border', 'Borda Inferior', 'border_bottom'], ['top', 'Top Border', 'Borda Superior', 'border_top'],
  ['left', 'Left Border', 'Borda Esquerda', 'border_left'], ['right', 'Right Border', 'Borda Direita', 'border_right'],
  ['none', 'No Border', 'Sem Borda', 'border_clear'], ['all', 'All Borders', 'Todas as Bordas', 'border_all'],
  ['outside', 'Outside Borders', 'Bordas Externas', 'border_outer'], ['inside', 'Inside Borders', 'Bordas Internas', 'border_inner'],
  ['insideH', 'Inside Horizontal Border', 'Borda Horizontal Interna', 'border_horizontal'], ['insideV', 'Inside Vertical Border', 'Borda Vertical Interna', 'border_vertical'],
  ['tl2br', 'Diagonal Down Border', 'Borda Diagonal Inferior', 'south_east'], ['tr2bl', 'Diagonal Up Border', 'Borda Diagonal Superior', 'rotate_90_degrees_ccw'],
];

/** Galeria de estilos de tabela (provisória: grade num menu — a galeria do framework de barras a substitui). */
/** Fila das miniaturas de estilo de tabela (cada uma é um layout do motor): em lotes por quadro. */
const thumbQueue: (() => Promise<void>)[] = [];
let thumbBusy = false;
function queueThumb(f: () => Promise<void>): void {
  thumbQueue.push(f);
  if (thumbBusy) return;
  thumbBusy = true;
  const step = (): void => {
    const batch = thumbQueue.splice(0, 8);
    if (!batch.length) { thumbBusy = false; return; }
    void Promise.all(batch.map((g) => g().catch(() => undefined))).then(() => requestAnimationFrame(step));
  };
  requestAnimationFrame(step);
}

const STYLE_SECTIONS = [
  { id: 'custom', label: L('Custom', 'Personalizado') }, { id: 'plain', label: L('Plain Tables', 'Tabelas Simples') },
  { id: 'grid', label: L('Grid Tables', 'Tabelas de Grade') }, { id: 'list', label: L('List Tables', 'Tabelas de Lista') },
];

/** Galeria Estilos de Tabela (Design da Tabela): miniaturas 5 × 5 pintadas pelo motor com as opções de estilo atuais. */
export function tableStyleGallery(env: WidgetEnv): BarItem {
  const W = 72, H = 52;
  const list = () => env.ed.tableStyleListNow() ?? [];
  const lookKey = (): string => JSON.stringify(env.ctl.state().table?.look ?? {});
  return {
    gallery: {
      id: 'table:styles', label: L('Table Styles', 'Estilos de Tabela'), icon: 'table_view',
      tile: { w: W, h: H }, rows: 1, maxCols: 7, minCols: 3, expandCols: 7,
      sections: STYLE_SECTIONS,
      supports: () => typeof env.ed.tableStyleListNow === 'function',
      isEnabled: () => !!env.ctl.state().table && !env.ed.isProtected(),
      items: () => list().map((s) => ({ id: s.name, label: s.label, section: s.group })),
      version: () => `${env.ed.stylesVersion()}|${lookKey()}|${list().length}`,
      selected: () => {
        const cur = env.ctl.state().table?.style;
        return cur ? list().find((s) => s.id === cur)?.name : undefined;
      },
      render: (tile, it) => {
        const dpr = window.devicePixelRatio || 1;
        const cv = document.createElement('canvas');
        cv.width = Math.round((W - 6) * dpr); cv.height = Math.round((H - 6) * dpr);
        cv.style.cssText = `width:${W - 6}px;height:${H - 6}px;display:block;margin:auto`;
        tile.replaceChildren(cv);
        const look = env.ctl.state().table?.look;
        queueThumb(() => (cv.isConnected ? env.ed.renderTableStyleThumb(cv, it.id, look) : Promise.resolve()));
      },
      onPick: (name) => { void env.ed.setTableStyle(name).then(() => env.app.ui?.sync()); },
      footer: () => ['table:style:clear'],
    },
  };
}

/** Sombreamento: cores do tema (com a referência), padrão e Sem Cor. */
export const tableShadingMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => [{
  content: (close) => {
    const colors = env.ed.documentThemeColors();
    const box = document.createElement('div');
    const theme = colorGrid({
      colors: themePaletteColors(colors), columns: 10, close,
      onPick: (v) => {
        const p = parseThemePick(v, colors);
        if (!p) return;
        env.app.lastTableShading = { themeColor: p.themeColor, tint: p.tint, shade: p.shade };
        env.app.lastTableShadingCss = `#${p.hex}`;
        env.ed.setCellShading(env.app.lastTableShading);
        ctx.after();
      },
    });
    const std = colorGrid({
      colors: STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` })), columns: 10, close,
      onPick: (h) => { env.app.lastTableShading = h; env.app.lastTableShadingCss = `#${h}`; env.ed.setCellShading(h); ctx.after(); },
    });
    const cap = (en: string, pt: string): HTMLElement => {
      const d = document.createElement('div');
      d.textContent = ctx.registry.text(L(en, pt));
      d.style.cssText = 'font-size:12px;opacity:.8;margin:6px 0 4px';
      return d;
    };
    box.append(cap('Theme Colors', 'Cores do Tema'), theme, cap('Standard Colors', 'Cores Padrão'), std);
    return box;
  },
}, '-', { id: 'table:shading:none', label: L('No Color', 'Sem Cor'), icon: 'format_color_reset', onClick: () => { env.ed.setCellShading(null); ctx.after(); } }];

/** Menu Bordas. */
const bordersMenu = (): MenuEntry[] => [...BORDERS.map(([k]) => `table:border:${k}`), '-', 'dlg:borders'];


export const penStyleMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => [{
  content: (close) => {
    const box = document.createElement('div');
    box.style.cssText = 'display:flex;flex-direction:column;max-height:min(420px,60vh);overflow:auto;min-width:150px';
    const cur = env.ed.getBorderPen().val;
    for (const [v, en, pt] of BORDER_STYLES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'uo-mi';
      b.title = ctx.registry.text(L(en, pt));
      b.style.cssText = `display:flex;align-items:center;padding:6px 10px;border:0;background:${v === cur ? 'color-mix(in srgb, var(--u-color-primary,#005bc0) 18%, transparent)' : 'transparent'};color:inherit;cursor:pointer`;
      b.innerHTML = borderSampleSvg(v);
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => { close(); env.ed.setBorderPen({ val: v }); ctx.after(); });
      box.append(b);
    }
    return box;
  },
}];
export const penWidthMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => BORDER_WIDTHS.map(([sz, t]): MenuItem => ({
  id: `penw:${sz}`, label: `${t} pt`, checked: env.ed.getBorderPen().sz === sz,
  onClick: () => { env.ed.setBorderPen({ sz }); ctx.after(); },
}));
export const penColorMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => [{
  id: 'pen:auto', label: L('Automatic', 'Automático'), icon: 'format_color_text', onClick: () => { env.ed.setBorderPen({ color: 'auto', themeColor: undefined, themeTint: undefined, themeShade: undefined }); ctx.after(); },
}, '-', {
  content: (close) => {
    const colors = env.ed.documentThemeColors();
    return colorGrid({
      colors: [...themePaletteColors(colors), ...STANDARD_COLORS.map((h) => ({ value: h, css: `#${h}` }))], columns: 10, close,
      onPick: (v) => {
        const p = parseThemePick(v, colors);
        env.ed.setBorderPen(p ? { color: p.hex, themeColor: p.themeColor, themeTint: p.tint, themeShade: p.shade } : { color: v, themeColor: undefined, themeTint: undefined, themeShade: undefined });
        ctx.after();
      },
    });
  },
}];

/** Guia contextual "Design da Tabela" da ribbon. */
export function tableDesignGroups(env: WidgetEnv, ctx: BarContext): BarGroup[] {
  const has = (m: string) => (): boolean => typeof (env.ed as unknown as Record<string, unknown>)[m] === 'function';
  return [
    { id: 'td-options', label: L('Table Style Options', 'Opções de Estilo de Tabela'), icon: 'check_box', prio: 4, cells: [
      { rows: [[{ cmd: 'table:look:header', label: true }], [{ cmd: 'table:look:total', label: true }], [{ cmd: 'table:look:bandedRows', label: true }]] },
      { rows: [[{ cmd: 'table:look:first', label: true }], [{ cmd: 'table:look:last', label: true }], [{ cmd: 'table:look:bandedCols', label: true }]] },
    ] },
    { id: 'td-styles', label: L('Table Styles', 'Estilos de Tabela'), icon: 'table_view', prio: 6, cells: [
      tableStyleGallery(env),
      { split: 'table:shading', menu: () => tableShadingMenu(env, ctx), size: 'large' },
    ] },
    { id: 'td-borders', label: L('Borders', 'Bordas'), icon: 'border_all', prio: 5, cells: [
      { rows: [
        [{ menu: () => penStyleMenu(env, ctx), id: 'pen:style', label: L('Pen Style', 'Estilo da Caneta'), icon: 'line_style', showLabel: true, supports: has('setBorderPen') }],
        [{ menu: () => penWidthMenu(env, ctx), id: 'pen:width', label: L('Pen Weight', 'Espessura da Caneta'), icon: 'line_weight', showLabel: true, supports: has('setBorderPen') }],
        [{ menu: () => penColorMenu(env, ctx), id: 'pen:color', label: L('Pen Color', 'Cor da Caneta'), icon: 'border_color', showLabel: true, supports: has('setBorderPen') }],
      ] },
      { menu: () => borderStylesMenu(env, ctx), id: 'table:borderStyles', label: L('Border Styles', 'Estilos de Borda'), icon: 'style', size: 'large', supports: has('setBorderPen') },
      { split: 'table:borders', menu: bordersMenu, size: 'large' },
      { cmd: 'table:painter', size: 'large' },
    ] },
  ];
}

/** Estilos de Borda: linhas do tema (Texto 1 e Ênfases) em espessuras e traços comuns + as usadas por último; escolher liga o Pincel. */
const recentPens: { val: string; sz: number; color: string; themeColor?: string }[] = [];
const BORDER_STYLE_ROWS: [string, number][] = [['single', 4], ['single', 12], ['single', 18], ['double', 4], ['double', 12], ['thinThickSmallGap', 18], ['dotted', 4], ['dashed', 4]];
const borderStylesMenu = (env: WidgetEnv, ctx: BarContext): MenuEntry[] => [{
  content: (close) => {
    const colors = env.ed.documentThemeColors();
    const slots: [string, string][] = [['text1', colors['dk1'] ?? colors['text1'] ?? '000000'], ...[1, 2, 3, 4, 5, 6].map((i): [string, string] => [`accent${i}`, colors[`accent${i}`] ?? '808080'])];
    const box = document.createElement('div');
    box.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:2px;max-height:min(460px,65vh);overflow:auto';
    const pick = (pen: { val: string; sz: number; color: string; themeColor?: string }): void => {
      close();
      env.ed.setBorderPen({ val: pen.val, sz: pen.sz, color: pen.color, themeColor: pen.themeColor, themeTint: undefined, themeShade: undefined });
      const k = JSON.stringify(pen);
      const i = recentPens.findIndex((x) => JSON.stringify(x) === k);
      if (i >= 0) recentPens.splice(i, 1);
      recentPens.unshift(pen);
      recentPens.length = Math.min(recentPens.length, 7);
      if (env.ed.getTableTool() !== 'painter') env.ed.setTableTool('painter');
      ctx.after();
    };
    const grid = (pens: { val: string; sz: number; color: string; themeColor?: string }[]): HTMLElement => {
      const g = document.createElement('div');
      g.style.cssText = 'display:grid;grid-template-columns:repeat(7,64px);gap:3px';
      for (const pen of pens) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'uo-mi';
        b.title = `${ctx.registry.text(L(BORDER_STYLES.find(([v]) => v === pen.val)?.[1] ?? pen.val, BORDER_STYLES.find(([v]) => v === pen.val)?.[2] ?? pen.val))}, ${pen.sz / 8} pt`;
        b.style.cssText = 'height:26px;padding:2px;border:1px solid color-mix(in srgb, currentColor 20%, transparent);border-radius:4px;background:#fff;cursor:pointer;display:flex;align-items:center';
        b.innerHTML = borderSampleSvg(pen.val, `#${pen.color}`, 58, 14);
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => pick(pen));
        g.append(b);
      }
      return g;
    };
    const head = (t: { en: string; pt: string }): HTMLElement => {
      const h = document.createElement('div');
      h.textContent = ctx.registry.text(t);
      h.style.cssText = 'font-size:12px;font-weight:600;opacity:.8;margin:2px';
      return h;
    };
    box.append(head(L('Theme Borders', 'Bordas do Tema')),
      grid(BORDER_STYLE_ROWS.flatMap(([val, sz]) => slots.map(([slot, hex]) => ({ val, sz, color: hex, themeColor: slot })))));
    if (recentPens.length) box.append(head(L('Recently Used Borders', 'Bordas Usadas Recentemente')), grid(recentPens));
    return box;
  },
}];

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
      { rows: [
        [{ menu: selectMenu, id: 'table:select', label: L('Select', 'Selecionar'), icon: 'select_all', showLabel: true, supports: has('selectTable') }],
        [{ cmd: 'table:gridlines', label: true }],
        [{ cmd: 'table:properties', label: true }],
      ] },
    ] },
    { id: 'tl-draw', label: L('Draw', 'Desenhar'), icon: 'draw', prio: 1, cells: [big('table:draw'), big('table:eraser')] },
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
      big('sort'), { rows: [[{ cmd: 'table:headerRows', label: true }], [{ cmd: 'table:toText', label: true }], [{ cmd: 'table:formula', label: true }]] },
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
    'cell:textdir', 'cell:margins', '-', 'table:headerRows', 'table:toText', 'table:formula', 'sort', '-', 'table:gridlines', 'table:propertiesDlg',
  ],
});

/** Itens do menu de contexto dentro de uma tabela. */
export const tableContextItems = (): MenuEntry[] => [
  { id: 'ctxTablePaste', label: L('Paste Options', 'Opções de Colagem'), icon: 'content_paste', submenu: () => ['paste:cells:overwrite', 'paste:cells:rows', 'paste:cells:nest', 'paste:cells:text'] },
  { id: 'ctxTableInsert', label: L('Insert', 'Inserir'), icon: 'add', submenu: () => ['row:above', 'row:below', 'col:left', 'col:right', 'cells:insertDlg'] },
  { id: 'ctxTableDelete', label: L('Delete', 'Excluir'), icon: 'delete', submenu: deleteMenu },
  'cells:merge', 'cells:split', '-',
  { id: 'ctxTableAlign', label: L('Cell alignment', 'Alinhamento da célula'), icon: 'vertical_align_center', submenu: () => ALIGN.map(([id]) => `cell:align:${id}`) },
  'cell:textdir', { id: 'ctxTableAutofit', label: L('AutoFit', 'AutoAjuste'), icon: 'fit_width', submenu: autofitMenu },
  'rows:distribute', 'cols:distribute', '-', 'table:propertiesDlg',
];


// Layouts das duas barras do Sheet: COMPACTA (Google Planilhas — título acima
// dos menus Arquivo/Editar/Exibir/Inserir/Formatar/Ferramentas/Ajuda e uma linha de
// ferramentas que recolhe por prioridade) e RIBBON (Excel — guias Página
// Inicial, Inserir, Fórmulas, Exibir e Ajuda). Só referenciam comandos e
// controles; o que cada um faz está em chrome-commands.ts / chrome-widgets.ts.
import type { BarContext, BarItem, CompactConfig, MenuEntry, MenuItem, RibbonConfig } from '@universal-office/ui';
import {
  accentMenu, alignMenu, autosumMenu, bordersMenu, clearMenu, fillColorMenu, fillMenu, findMenu, fontColorMenu, fontWidget,
  formatCellsMenu, freezeMenu, mergeMenu, numberFormatMenu, numberFormatWidget, pasteMenu, saveWidget, sizeWidget,
  themeMenu, titleWidget, zoomItem, zoomMenu, type WidgetEnv,
} from './chrome-widgets.js';

const L = (en: string, pt: string): { en: string; pt: string } => ({ en, pt });
const sub = (id: string, label: { en: string; pt: string }, icon: string | undefined, items: () => MenuEntry[]): MenuItem =>
  ({ id, label, ...(icon ? { icon } : {}), submenu: items });

/** Submenus compartilhados pelas duas barras. */
function menus(env: WidgetEnv, ctx: BarContext) {
  return {
    exportAs: sub('export', L('Download', 'Baixar'), 'download', () => ['export:pdf', 'export:ods', 'export:csv', 'export:tsv', 'export:html', 'export:md', 'export:xml']),
    clear: sub('clearMenu', L('Clear', 'Limpar'), 'ink_eraser', clearMenu),
    fill: sub('fillMenu', L('Fill', 'Preencher'), 'arrow_forward', fillMenu),
    zoom: sub('zoomMenu', L('Zoom', 'Zoom'), 'zoom_in', () => zoomMenu(env)),
    freeze: sub('freezeMenu', L('Freeze', 'Congelar'), 'table_rows', freezeMenu),
    theme: sub('theme', L('Theme', 'Tema'), 'contrast', () => themeMenu(env)),
    accent: sub('accent', L('Accent color', 'Cor de destaque'), 'palette', () => accentMenu(env, ctx)),
    toolbar: sub('toolbar', L('Toolbar', 'Barra de ferramentas'), 'toolbar', () => ['toolbar:compact', 'toolbar:ribbon']),
    number: sub('numberMenu', L('Number', 'Número'), 'numbers', () => [...numberFormatMenu(), '-', 'numfmt:comma', 'numfmt:percent0', 'decimal:inc', 'decimal:dec']),
    text: sub('textMenu', L('Text', 'Texto'), 'format_bold', () => ['bold', 'italic', 'underline', 'strike', '-', 'grow', 'shrink']),
    align: sub('alignMenu', L('Alignment', 'Alinhamento'), 'format_align_left', alignMenu),
    merge: sub('mergeMenu', L('Merge cells', 'Mesclar células'), 'cell_merge', mergeMenu),
    borders: sub('bordersMenu', L('Borders', 'Bordas'), 'border_all', bordersMenu),
    color: sub('colorMenu', L('Font color', 'Cor da fonte'), 'format_color_text', () => fontColorMenu(env, ctx)),
    fillColor: sub('fillColorMenu', L('Fill color', 'Cor de preenchimento'), 'format_color_fill', () => fillColorMenu(env, ctx)),
    rows: sub('rowsMenu', L('Rows', 'Linhas'), 'table_rows', () => ['row:height', 'row:autofit', '-', 'row:hide', 'row:unhide']),
    cols: sub('colsMenu', L('Columns', 'Colunas'), 'view_column', () => ['col:width', 'col:autofit', '-', 'col:hide', 'col:unhide']),
    autosum: sub('autosumMenu', L('AutoSum', 'AutoSoma'), 'functions', autosumMenu),
  };
}

const fileMenu = (m: ReturnType<typeof menus>): MenuEntry[] => [
  'new', 'open', '-', 'save', 'saveAs', m.exportAs, '-', 'print', '-', 'properties',
];

export function compactLayout(env: WidgetEnv, ctx: BarContext): CompactConfig {
  const m = menus(env, ctx);
  return {
    title: titleWidget(env),
    trailing: [saveWidget(env)],
    menus: [
      { id: 'file', label: L('File', 'Arquivo'), items: () => fileMenu(m) },
      { id: 'edit', label: L('Edit', 'Editar'), items: () => ['undo', 'redo', '-', 'cut', 'copy', 'paste', 'paste:values', '-', m.fill, m.clear, '-', 'selectAll', '-', 'find', 'replace', 'goto'] },
      { id: 'view', label: L('View', 'Exibir'), items: () => ['view:formulaBar', 'view:gridlines', 'view:sheetTabs', 'statusbar', '-', m.freeze, '-', m.zoom, '-', 'sheet:prev', 'sheet:next', '-', m.theme, m.accent, m.toolbar] },
      { id: 'insert', label: L('Insert', 'Inserir'), items: () => ['sheet:insert', '-', 'function', m.autosum] },
      { id: 'format', label: L('Format', 'Formatar'), items: () => [m.number, m.text, m.color, m.fillColor, '-', m.align, m.merge, m.borders, '-', m.rows, m.cols, '-', 'dlg:formatCells', 'clear:formats'] },
      { id: 'tools', label: L('Tools', 'Ferramentas'), items: () => ['calc:now'] },
      { id: 'help', label: L('Help', 'Ajuda'), items: ['shortcuts', 'about'] },
    ],
    groups: [
      // Desfazer/Refazer/Imprimir nunca recolhem (como no Google Planilhas); o zoom recolhe cedo
      { id: 'history', label: L('Undo & print', 'Desfazer e imprimir'), icon: 'undo', prio: 9, items: ['undo', 'redo', 'print'] },
      { id: 'zoom', label: L('Zoom', 'Zoom'), icon: 'zoom_in', prio: 3, items: [zoomItem(env)] },
      { id: 'numfmt', label: L('Number', 'Número'), icon: 'numbers', prio: 6, items: [
        'numfmt:currency', 'numfmt:percent0', 'decimal:dec', 'decimal:inc',
        { menu: numberFormatMenu, id: 'numfmt:more', label: L('More formats', 'Mais formatos'), text: () => '123' },
      ] },
      { id: 'font', label: L('Font', 'Fonte'), icon: 'font_download', prio: 8, items: [fontWidget(env)] },
      { id: 'size', label: L('Font size', 'Tamanho da fonte'), icon: 'format_size', prio: 7, items: [sizeWidget(env, 'steppers')] },
      { id: 'textStyle', label: L('Formatting', 'Formatação'), icon: 'format_bold', prio: 9, items: [
        'bold', 'italic', 'strike',
        { split: 'fontColor', menu: () => fontColorMenu(env, ctx) },
      ] },
      { id: 'cells', label: L('Cells', 'Células'), icon: 'format_color_fill', prio: 6, items: [
        { split: 'fillColor', menu: () => fillColorMenu(env, ctx) },
        { split: 'borders:bottom', menu: bordersMenu },
        { split: 'merge:center', menu: mergeMenu },
      ] },
      { id: 'align', label: L('Alignment', 'Alinhamento'), icon: 'format_align_left', prio: 5, items: [
        { menu: () => ['align:left', 'align:center', 'align:right'], id: 'align:menu', label: L('Horizontal align', 'Alinhamento horizontal'), icon: 'format_align_left' },
        { menu: () => ['valign:top', 'valign:center', 'valign:bottom'], id: 'valign:menu', label: L('Vertical align', 'Alinhamento vertical'), icon: 'vertical_align_bottom' },
        'wrap',
      ] },
      { id: 'functions', label: L('Functions', 'Funções'), icon: 'functions', prio: 3, items: [{ split: 'autosum', menu: autosumMenu }] },
      { id: 'extras', label: L('More tools', 'Mais ferramentas'), icon: 'more_horiz', prio: 0, items: [
        'underline', 'grow', 'shrink', 'indent', 'outdent', 'freeze:panes', 'view:gridlines', 'col:autofit', 'clear:formats', 'find',
      ] },
    ],
  };
}

const large = (cmd: string): BarItem => ({ cmd, size: 'large' });

export function ribbonLayout(env: WidgetEnv, ctx: BarContext): RibbonConfig {
  const m = menus(env, ctx);
  return {
    qat: ['save', 'undo', 'redo'],
    title: titleWidget(env),
    tabs: [
      { id: 'file', label: L('File', 'Arquivo'), groups: [], menu: () => fileMenu(m) },
      {
        id: 'home', label: L('Home', 'Página Inicial'), groups: [
          { id: 'clipboard', label: L('Clipboard', 'Área de Transferência'), icon: 'content_paste', prio: 3, cells: [
            { split: 'paste', size: 'large', menu: pasteMenu },
            { rows: [['cut'], ['copy']] },
          ] },
          { id: 'font', label: L('Font', 'Fonte'), icon: 'text_format', prio: 8, launcher: 'dlg:formatCells', cells: [
            { rows: [
              [fontWidget(env, 140), sizeWidget(env, 'dropdown'), 'grow', 'shrink'],
              ['bold', 'italic', 'underline', 'strike', { split: 'borders:bottom', menu: bordersMenu }, { split: 'fillColor', menu: () => fillColorMenu(env, ctx) }, { split: 'fontColor', menu: () => fontColorMenu(env, ctx) }],
            ] },
          ] },
          { id: 'alignment', label: L('Alignment', 'Alinhamento'), icon: 'format_align_left', prio: 7, launcher: 'dlg:formatCells', cells: [
            { rows: [
              ['valign:top', 'valign:center', 'valign:bottom', { cmd: 'wrap', label: true }],
              ['align:left', 'align:center', 'align:right', 'outdent', 'indent', { split: 'merge:center', menu: mergeMenu, label: true }],
            ] },
          ] },
          { id: 'number', label: L('Number', 'Número'), icon: 'numbers', prio: 6, launcher: 'numfmt:custom', cells: [
            { rows: [
              [numberFormatWidget(env, 130)],
              ['numfmt:currency', 'numfmt:percent0', 'numfmt:comma', 'decimal:inc', 'decimal:dec'],
            ] },
          ] },
          { id: 'cells', label: L('Cells', 'Células'), icon: 'table_view', prio: 4, cells: [
            { menu: formatCellsMenu, id: 'format:menu', label: L('Format', 'Formatar'), icon: 'tune', size: 'large' },
          ] },
          { id: 'editing', label: L('Editing', 'Edição'), icon: 'functions', prio: 5, cells: [
            { rows: [
              [{ split: 'autosum', menu: autosumMenu, label: true }],
              [{ menu: fillMenu, id: 'fill:menu', label: L('Fill', 'Preencher'), icon: 'arrow_forward', showLabel: true }],
              [{ menu: clearMenu, id: 'clear:menu', label: L('Clear', 'Limpar'), icon: 'ink_eraser', showLabel: true }],
            ] },
            { menu: findMenu, id: 'find:menu', label: L('Find & Select', 'Localizar e Selecionar'), icon: 'search', size: 'large' },
          ] },
        ],
      },
      {
        id: 'insert', label: L('Insert', 'Inserir'), groups: [
          { id: 'sheets', label: L('Sheets', 'Planilhas'), icon: 'add', prio: 5, cells: [large('sheet:insert')] },
          { id: 'functions', label: L('Functions', 'Funções'), icon: 'functions', prio: 4, cells: [large('function'), { split: 'autosum', menu: autosumMenu, size: 'large' }] },
        ],
      },
      {
        id: 'formulas', label: L('Formulas', 'Fórmulas'), groups: [
          { id: 'library', label: L('Function Library', 'Biblioteca de Funções'), icon: 'functions', prio: 5, cells: [
            large('function'),
            { split: 'autosum', menu: autosumMenu, size: 'large' },
          ] },
          { id: 'calculation', label: L('Calculation', 'Cálculo'), icon: 'calculate', prio: 4, cells: [large('calc:now')] },
        ],
      },
      {
        id: 'view', label: L('View', 'Exibir'), groups: [
          { id: 'show', label: L('Show', 'Mostrar'), icon: 'visibility', prio: 5, cells: [
            { rows: [[{ cmd: 'view:formulaBar', label: true }], [{ cmd: 'view:gridlines', label: true }], [{ cmd: 'view:sheetTabs', label: true }]] },
            { rows: [[{ cmd: 'statusbar', label: true }]] },
          ] },
          { id: 'zoom', label: L('Zoom', 'Zoom'), icon: 'zoom_in', prio: 6, cells: [
            { menu: () => zoomMenu(env), id: 'zoom', label: L('Zoom', 'Zoom'), icon: 'zoom_in', size: 'large' },
            large('zoom100'),
            { rows: [['zoomin'], ['zoomout']] },
          ] },
          { id: 'window', label: L('Window', 'Janela'), icon: 'table_rows', prio: 4, cells: [
            { menu: freezeMenu, id: 'freeze:menu', label: L('Freeze Panes', 'Congelar Painéis'), icon: 'table_rows', size: 'large' },
          ] },
          { id: 'appearance', label: L('Appearance', 'Aparência'), icon: 'palette', prio: 2, cells: [
            { menu: () => themeMenu(env), id: 'theme', label: L('Theme', 'Tema'), icon: 'contrast', size: 'large' },
            { menu: () => accentMenu(env, ctx), id: 'accent', label: L('Accent', 'Destaque'), icon: 'palette', size: 'large' },
            { menu: () => ['toolbar:compact', 'toolbar:ribbon'], id: 'toolbarMode', label: L('Toolbar', 'Barra'), icon: 'toolbar', size: 'large' },
          ] },
        ],
      },
      {
        id: 'help', label: L('Help', 'Ajuda'), groups: [
          { id: 'help', label: L('Help', 'Ajuda'), icon: 'info', prio: 3, cells: [large('shortcuts'), large('about')] },
        ],
      },
    ],
  };
}

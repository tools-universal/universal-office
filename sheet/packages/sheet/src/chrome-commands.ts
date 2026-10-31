// Comandos do Sheet sobre a API PÚBLICA do <universal-sheet>: rótulo, ícone,
// atalho (os do Excel) e estado. Comando cuja API não existe fica oculto
// (`supports`), como no Write; nada aqui promete o que o componente não faz.
import type { Command, CommandRegistry } from '@universal-office/ui';
import type { UniversalSheetElement } from './universal-sheet.js';
import type { SheetApp } from './chrome-app.js';
import type { NumberFormatKind } from './number-formats.js';
import { ICONS } from './chrome-icons.js';

/** Zooms da lista (como o Excel). */
export const ZOOMS = [25, 50, 75, 100, 125, 150, 200, 300];

/** O que a barra montada oferece aos comandos (diálogos, painéis, modo). */
export interface ChromeCtl {
  flash(msg: string): void;
  find(replace: boolean): void;
  goTo(): void;
  formatCells(tab?: 'number' | 'alignment' | 'font' | 'fill'): void;
  customNumberFormat(): void;
  columnWidth(): void;
  rowHeight(): void;
  insertFunction(): void;
  properties(): void;
  shortcuts(): void;
  about(): void;
  /** Mesclar pede confirmação quando há dados fora da superior esquerda (como o Excel) */
  merge(kind: 'center' | 'across' | 'cells'): void;
  paste(valuesOnly: boolean): void;
  copy(cut: boolean): void;
  insertSheet(): void;
  toolbarMode(): 'compact' | 'ribbon';
  setToolbarMode(m: 'compact' | 'ribbon'): void;
  formulaBarOn(): boolean;
  toggleFormulaBar(): void;
  sheetTabsOn(): boolean;
  toggleSheetTabs(): void;
}

const L = (en: string, pt: string, es: string): { en: string; pt: string; es: string } => ({ en, pt, es });

export function registerSheetCommands(reg: CommandRegistry, el: UniversalSheetElement, app: SheetApp, ctl: ChromeCtl): void {
  const has = (m: string) => (): boolean => typeof (el as unknown as Record<string, unknown>)[m] === 'function';
  const loaded = (): boolean => el.getSheetNames().length > 0;
  const fmt = () => el.getCellFormat();
  const cmd = (c: Command): void => { reg.add(c); };
  const font = (id: string, label: { en: string; pt: string; es: string }, icon: string, shortcut: string | undefined, key: 'bold' | 'italic' | 'underline' | 'strike'): void => cmd({
    id, label, icon, ...(shortcut ? { shortcut } : {}), supports: has('setFont'), isEnabled: loaded,
    isChecked: () => loaded() && fmt()[key], run: () => el.setFont({ [key]: !fmt()[key] }),
  });
  const numFmt = (kind: NumberFormatKind, label: { en: string; pt: string; es: string }, icon?: string, shortcut?: string): void => cmd({
    id: `numfmt:${kind}`, label, ...(icon ? { icon } : {}), ...(shortcut ? { shortcut } : {}),
    supports: has('setNumberFormat'), isEnabled: loaded, run: () => el.setNumberFormat(kind),
  });

  // ── Arquivo ──
  cmd({ id: 'new', label: L('New', 'Novo', 'Nuevo'), icon: 'note_add', supports: has('newWorkbook'), run: () => app.newWorkbook() });
  cmd({ id: 'open', label: L('Open…', 'Abrir…', 'Abrir…'), icon: 'folder_open', shortcut: 'Ctrl+O', run: () => app.open() });
  cmd({ id: 'save', label: L('Save', 'Salvar', 'Guardar'), icon: 'save', shortcut: 'Ctrl+S', isEnabled: loaded, run: () => app.save(false) });
  cmd({ id: 'saveAs', label: L('Save as…', 'Salvar como…', 'Guardar como…'), icon: 'save_as', shortcut: 'F12', isEnabled: loaded, run: () => app.save(true) });
  for (const [k, en, pt, es, icon] of [
    ['pdf', 'PDF document (.pdf)', 'Documento PDF (.pdf)', 'Documento PDF (.pdf)', 'picture_as_pdf'],
    ['ods', 'OpenDocument Spreadsheet (.ods)', 'Planilha OpenDocument (.ods)', 'Hoja de cálculo de OpenDocument (.ods)', 'table_view'],
    ['csv', 'CSV, active sheet (.csv)', 'CSV, planilha ativa (.csv)', 'CSV, hoja activa (.csv)', 'description'],
    ['tsv', 'Tab-separated, active sheet (.tsv)', 'Separado por tabulação, planilha ativa (.tsv)', 'Delimitado por tabulaciones, hoja activa (.tsv)', 'description'],
    ['html', 'Web page (.html)', 'Página da Web (.html)', 'Página web (.html)', 'html'],
    ['md', 'Markdown (.md)', 'Markdown (.md)', 'Markdown (.md)', 'markdown'],
    ['xml', 'XML Spreadsheet 2003 (.xml)', 'Planilha XML 2003 (.xml)', 'Hoja de cálculo XML 2003 (.xml)', 'data_object'],
  ] as const) cmd({ id: `export:${k}`, label: L(en, pt, es), icon, isEnabled: loaded, run: () => app.export(k) });
  cmd({ id: 'print', label: L('Print…', 'Imprimir…', 'Imprimir…'), icon: 'print', shortcut: 'Ctrl+P', isEnabled: loaded, run: () => app.print() });
  cmd({ id: 'properties', label: L('Properties', 'Propriedades', 'Propiedades'), icon: 'info', isEnabled: loaded, run: () => ctl.properties() });

  // ── Editar ──
  cmd({ id: 'undo', label: L('Undo', 'Desfazer', 'Deshacer'), icon: 'undo', shortcut: 'Ctrl+Z', supports: has('undo'), isEnabled: () => el.canUndo(), run: () => el.undo() });
  cmd({ id: 'redo', label: L('Redo', 'Refazer', 'Rehacer'), icon: 'redo', shortcut: 'Ctrl+Y', supports: has('redo'), isEnabled: () => el.canRedo(), run: () => el.redo() });
  cmd({ id: 'cut', label: L('Cut', 'Recortar', 'Cortar'), icon: 'content_cut', shortcut: 'Ctrl+X', supports: has('cut'), isEnabled: loaded, run: () => ctl.copy(true) });
  cmd({ id: 'copy', label: L('Copy', 'Copiar', 'Copiar'), icon: 'content_copy', shortcut: 'Ctrl+C', supports: has('copy'), isEnabled: loaded, run: () => ctl.copy(false) });
  cmd({ id: 'paste', label: L('Paste', 'Colar', 'Pegar'), icon: 'content_paste', shortcut: 'Ctrl+V', supports: has('paste'), isEnabled: loaded, run: () => ctl.paste(false) });
  cmd({ id: 'paste:values', label: L('Paste values', 'Colar valores', 'Pegar valores'), icon: ICONS.pasteValues, supports: has('paste'), isEnabled: () => loaded() && el.hasClipboard, run: () => ctl.paste(true) });
  cmd({ id: 'fill:down', label: L('Fill down', 'Preencher abaixo', 'Rellenar hacia abajo'), icon: ICONS.arrowDown, shortcut: 'Ctrl+D', supports: has('fill'), isEnabled: loaded, run: () => el.fill('down') });
  cmd({ id: 'fill:right', label: L('Fill right', 'Preencher à direita', 'Rellenar hacia la derecha'), icon: 'arrow_forward', shortcut: 'Ctrl+R', supports: has('fill'), isEnabled: loaded, run: () => el.fill('right') });
  cmd({ id: 'clear:all', label: L('Clear all', 'Limpar tudo', 'Borrar todo'), icon: 'delete_sweep', supports: has('clear'), isEnabled: loaded, run: () => el.clear('all') });
  cmd({ id: 'clear:formats', label: L('Clear formats', 'Limpar formatos', 'Borrar formatos'), icon: 'format_clear', supports: has('clear'), isEnabled: loaded, run: () => el.clear('formats') });
  cmd({ id: 'clear:contents', label: L('Clear contents', 'Limpar conteúdo', 'Borrar contenido'), icon: 'ink_eraser', shortcut: 'Delete', supports: has('clear'), isEnabled: loaded, run: () => el.clear('contents') });
  cmd({ id: 'find', label: L('Find…', 'Localizar…', 'Buscar…'), icon: 'search', shortcut: 'Ctrl+F', supports: has('find'), isEnabled: loaded, run: () => ctl.find(false) });
  cmd({ id: 'replace', label: L('Replace…', 'Substituir…', 'Reemplazar…'), icon: 'find_replace', shortcut: 'Ctrl+H', supports: has('replaceAll'), isEnabled: loaded, run: () => ctl.find(true) });
  cmd({ id: 'goto', label: L('Go to…', 'Ir para…', 'Ir a…'), icon: 'arrow_outward', shortcut: 'Ctrl+G', supports: has('selectRange'), isEnabled: loaded, run: () => ctl.goTo() });
  cmd({ id: 'selectAll', label: L('Select all', 'Selecionar tudo', 'Seleccionar todo'), icon: 'select_all', shortcut: 'Ctrl+A', supports: has('selectAll'), isEnabled: loaded, run: () => el.selectAll() });

  // ── Exibir ──
  cmd({ id: 'zoomin', label: L('Zoom in', 'Ampliar', 'Acercar'), icon: 'zoom_in', isEnabled: () => loaded() && el.getZoom() < 3, run: () => el.setZoom(nextZoom(el.getZoom(), 1)) });
  cmd({ id: 'zoomout', label: L('Zoom out', 'Reduzir', 'Alejar'), icon: 'zoom_out', isEnabled: () => loaded() && el.getZoom() > 0.4, run: () => el.setZoom(nextZoom(el.getZoom(), -1)) });
  cmd({ id: 'zoom100', label: L('100%', '100%', '100%'), icon: ICONS.zoom100, isEnabled: loaded, run: () => el.setZoom(1) });
  const frozen = () => el.frozenPanes;
  cmd({ id: 'freeze:panes', label: L('Freeze panes', 'Congelar painéis', 'Inmovilizar paneles'), icon: ICONS.freeze, supports: has('freezePanes'), isEnabled: loaded, run: () => el.freezePanes() });
  cmd({ id: 'freeze:topRow', label: L('Freeze top row', 'Congelar linha superior', 'Inmovilizar fila superior'), icon: 'table_rows', supports: has('freezePanes'), isEnabled: loaded, isChecked: () => frozen().rows === 1 && frozen().cols === 0, run: () => el.freezePanes(0, 1) });
  cmd({ id: 'freeze:firstCol', label: L('Freeze first column', 'Congelar primeira coluna', 'Inmovilizar primera columna'), icon: 'view_column', supports: has('freezePanes'), isEnabled: loaded, isChecked: () => frozen().cols === 1 && frozen().rows === 0, run: () => el.freezePanes(1, 0) });
  cmd({ id: 'freeze:off', label: L('Unfreeze panes', 'Descongelar painéis', 'Movilizar paneles'), icon: ICONS.unfreeze, supports: has('freezePanes'), isEnabled: () => loaded() && (frozen().cols > 0 || frozen().rows > 0), run: () => el.freezePanes(0, 0) });
  cmd({ id: 'view:gridlines', label: L('Gridlines', 'Linhas de grade', 'Líneas de cuadrícula'), icon: 'grid_on', isEnabled: loaded, isChecked: () => el.showGridlines, run: () => { el.showGridlines = !el.showGridlines; } });
  cmd({ id: 'view:formulaBar', label: L('Formula bar', 'Barra de fórmulas', 'Barra de fórmulas'), icon: 'functions', isChecked: () => ctl.formulaBarOn(), run: () => ctl.toggleFormulaBar() });
  cmd({ id: 'view:sheetTabs', label: L('Sheet tabs', 'Guias de planilha', 'Pestañas de hoja'), icon: ICONS.tab, isChecked: () => ctl.sheetTabsOn(), run: () => ctl.toggleSheetTabs() });
  cmd({ id: 'statusbar', label: L('Status bar', 'Barra de status', 'Barra de estado'), icon: 'call_to_action', isChecked: () => el.bottombar, run: () => { el.bottombar = !el.bottombar; } });
  cmd({ id: 'toolbar:compact', label: L('Simplified toolbar', 'Barra simplificada', 'Barra de herramientas simplificada'), icon: 'toolbar', isChecked: () => ctl.toolbarMode() === 'compact', run: () => ctl.setToolbarMode('compact') });
  cmd({ id: 'toolbar:ribbon', label: L('Ribbon', 'Faixa de opções', 'Cinta de opciones'), icon: 'view_agenda', isChecked: () => ctl.toolbarMode() === 'ribbon', run: () => ctl.setToolbarMode('ribbon') });
  cmd({ id: 'sheet:prev', label: L('Previous sheet', 'Planilha anterior', 'Hoja anterior'), icon: 'navigate_before', shortcut: 'Ctrl+PageUp', isEnabled: () => el.getSheetNames().length > 1, run: () => { const n = el.getSheetNames().length; el.selectSheet((el.activeSheet + n - 1) % n); } });
  cmd({ id: 'sheet:next', label: L('Next sheet', 'Próxima planilha', 'Hoja siguiente'), icon: 'navigate_next', shortcut: 'Ctrl+PageDown', isEnabled: () => el.getSheetNames().length > 1, run: () => { const n = el.getSheetNames().length; el.selectSheet((el.activeSheet + 1) % n); } });

  // ── Inserir ──
  cmd({ id: 'sheet:insert', label: L('Insert sheet', 'Inserir planilha', 'Insertar hoja'), icon: ICONS.addSheet, shortcut: 'Shift+F11', supports: has('addSheet'), isEnabled: loaded, run: () => ctl.insertSheet() });
  cmd({ id: 'function', label: L('Insert function…', 'Inserir função…', 'Insertar función…'), icon: ICONS.fx, shortcut: 'Shift+F3', supports: has('insertFunction'), isEnabled: loaded, run: () => ctl.insertFunction() });
  for (const [fn, en, pt, es] of [['SUM', 'Sum', 'Soma', 'Suma'], ['AVERAGE', 'Average', 'Média', 'Promedio'], ['COUNT', 'Count numbers', 'Contar números', 'Contar números'], ['MAX', 'Max', 'Máx', 'Máx.'], ['MIN', 'Min', 'Mín', 'Mín.']] as const) {
    cmd({ id: `autosum:${fn.toLowerCase()}`, label: L(en, pt, es), icon: fn === 'SUM' ? 'functions' : undefined, ...(fn === 'SUM' ? { shortcut: 'Alt+=' } : {}), supports: has('autoSum'), isEnabled: loaded, run: () => el.autoSum(fn) });
  }
  cmd({ id: 'autosum', label: L('AutoSum', 'AutoSoma', 'Autosuma'), icon: 'functions', supports: has('autoSum'), isEnabled: loaded, run: () => el.autoSum('SUM') });
  cmd({ id: 'calc:now', label: L('Calculate now', 'Calcular agora', 'Calcular ahora'), icon: ICONS.calculate, shortcut: 'F9', supports: has('recalculate'), isEnabled: loaded, run: () => el.recalculate() });

  // ── Formatar: fonte ──
  font('bold', L('Bold', 'Negrito', 'Negrita'), 'format_bold', 'Ctrl+B', 'bold');
  font('italic', L('Italic', 'Itálico', 'Cursiva'), 'format_italic', 'Ctrl+I', 'italic');
  font('underline', L('Underline', 'Sublinhado', 'Subrayado'), 'format_underlined', 'Ctrl+U', 'underline');
  font('strike', L('Strikethrough', 'Tachado', 'Tachado'), 'format_strikethrough', 'Ctrl+5', 'strike');
  cmd({ id: 'fontColor', label: L('Font color', 'Cor da fonte', 'Color de fuente'), icon: 'format_color_text', supports: has('setFont'), isEnabled: loaded, color: () => app.lastFontColor, run: () => el.setFont({ color: app.lastFontColor }) });
  cmd({ id: 'fillColor', label: L('Fill color', 'Cor de preenchimento', 'Color de relleno'), icon: 'format_color_fill', supports: has('setFormat'), isEnabled: loaded, color: () => app.lastFill, run: () => el.setFormat({ fill: app.lastFill }) });
  cmd({ id: 'grow', label: L('Increase font size', 'Aumentar tamanho da fonte', 'Aumentar tamaño de fuente'), icon: 'text_increase', supports: has('setFont'), isEnabled: loaded, run: () => el.setFont({ size: stepSize(fmt().fontSize, 1) }) });
  cmd({ id: 'shrink', label: L('Decrease font size', 'Diminuir tamanho da fonte', 'Disminuir tamaño de fuente'), icon: 'text_decrease', supports: has('setFont'), isEnabled: loaded, run: () => el.setFont({ size: stepSize(fmt().fontSize, -1) }) });

  // ── alinhamento ──
  const align = (id: string, label: { en: string; pt: string; es: string }, icon: string, key: 'horizontal' | 'vertical', value: string): void => cmd({
    id, label, icon, supports: has('setAlignment'), isEnabled: loaded,
    isChecked: () => loaded() && (fmt()[key] ?? (key === 'vertical' ? 'bottom' : 'general')) === value,
    run: () => el.setAlignment({ [key]: fmt()[key] === value && value !== 'general' && value !== 'bottom' ? null : value }),
  });
  align('align:left', L('Align left', 'Alinhar à esquerda', 'Alinear a la izquierda'), 'format_align_left', 'horizontal', 'left');
  align('align:center', L('Center', 'Centralizar', 'Centrar'), 'format_align_center', 'horizontal', 'center');
  align('align:right', L('Align right', 'Alinhar à direita', 'Alinear a la derecha'), 'format_align_right', 'horizontal', 'right');
  align('valign:top', L('Top align', 'Alinhar em cima', 'Alinear en la parte superior'), 'vertical_align_top', 'vertical', 'top');
  align('valign:center', L('Middle align', 'Alinhar no meio', 'Alinear en el medio'), 'vertical_align_center', 'vertical', 'center');
  align('valign:bottom', L('Bottom align', 'Alinhar embaixo', 'Alinear en la parte inferior'), 'vertical_align_bottom', 'vertical', 'bottom');
  cmd({ id: 'indent', label: L('Increase indent', 'Aumentar recuo', 'Aumentar sangría'), icon: 'format_indent_increase', supports: has('setAlignment'), isEnabled: loaded, run: () => el.setAlignment({ horizontal: fmt().horizontal === 'right' ? 'right' : 'left', indent: indentOf(el) + 1 }) });
  cmd({ id: 'outdent', label: L('Decrease indent', 'Diminuir recuo', 'Disminuir sangría'), icon: 'format_indent_decrease', supports: has('setAlignment'), isEnabled: () => loaded() && indentOf(el) > 0, run: () => el.setAlignment({ indent: Math.max(0, indentOf(el) - 1) }) });
  cmd({ id: 'wrap', label: L('Wrap text', 'Quebrar texto automaticamente', 'Ajustar texto'), icon: 'wrap_text', supports: has('setAlignment'), isEnabled: loaded, isChecked: () => loaded() && fmt().wrap, run: () => el.setAlignment({ wrapText: !fmt().wrap }) });
  cmd({ id: 'merge:center', label: L('Merge & center', 'Mesclar e centralizar', 'Combinar y centrar'), icon: 'cell_merge', supports: has('merge'), isEnabled: loaded, isChecked: () => loaded() && fmt().merged, run: () => (fmt().merged ? el.unmerge() : ctl.merge('center')) });
  cmd({ id: 'merge:across', label: L('Merge across', 'Mesclar através', 'Combinar horizontalmente'), icon: 'cell_merge', supports: has('merge'), isEnabled: loaded, run: () => ctl.merge('across') });
  cmd({ id: 'merge:cells', label: L('Merge cells', 'Mesclar células', 'Combinar celdas'), icon: 'cell_merge', supports: has('merge'), isEnabled: loaded, run: () => ctl.merge('cells') });
  cmd({ id: 'merge:off', label: L('Unmerge cells', 'Desfazer mesclagem', 'Separar celdas'), icon: ICONS.unmerge, supports: has('unmerge'), isEnabled: loaded, run: () => el.unmerge() });

  // ── número ──
  numFmt('general', L('General', 'Geral', 'General'), ICONS.general, 'Ctrl+Shift+`');
  numFmt('number', L('Number', 'Número', 'Número'), 'numbers', 'Ctrl+Shift+1');
  numFmt('currency', L('Currency', 'Moeda', 'Moneda'), ICONS.currency, 'Ctrl+Shift+4');
  numFmt('accounting', L('Accounting', 'Contábil', 'Contabilidad'), ICONS.accounting);
  numFmt('shortDate', L('Short date', 'Data abreviada', 'Fecha corta'), 'calendar_today', 'Ctrl+Shift+3');
  numFmt('longDate', L('Long date', 'Data completa', 'Fecha larga'), ICONS.longDate);
  numFmt('time', L('Time', 'Hora', 'Hora'), ICONS.time, 'Ctrl+Shift+2');
  numFmt('percent', L('Percentage', 'Porcentagem', 'Porcentaje'), ICONS.percent);
  numFmt('fraction', L('Fraction', 'Fração', 'Fracción'), ICONS.fraction);
  numFmt('scientific', L('Scientific', 'Científico', 'Científica'), ICONS.scientific, 'Ctrl+Shift+6');
  numFmt('text', L('Text', 'Texto', 'Texto'), 'title');
  cmd({ id: 'numfmt:percent0', label: L('Percent style', 'Estilo de porcentagem', 'Estilo porcentual'), icon: ICONS.percent, shortcut: 'Ctrl+Shift+5', supports: has('setNumberFormat'), isEnabled: loaded, run: () => el.setNumberFormat('percent0') });
  cmd({ id: 'numfmt:comma', label: L('Comma style', 'Separador de milhares', 'Estilo de millares'), icon: ICONS.comma, supports: has('setNumberFormat'), isEnabled: loaded, run: () => el.setNumberFormat('comma') });
  cmd({ id: 'numfmt:custom', label: L('More number formats…', 'Mais formatos de número…', 'Más formatos de número…'), icon: 'tune', supports: has('setNumberFormat'), isEnabled: loaded, run: () => ctl.customNumberFormat() });
  cmd({ id: 'decimal:inc', label: L('Increase decimal', 'Aumentar casas decimais', 'Aumentar decimales'), icon: ICONS.decimalInc, supports: has('adjustDecimals'), isEnabled: loaded, run: () => el.adjustDecimals(1) });
  cmd({ id: 'decimal:dec', label: L('Decrease decimal', 'Diminuir casas decimais', 'Disminuir decimales'), icon: ICONS.decimalDec, supports: has('adjustDecimals'), isEnabled: loaded, run: () => el.adjustDecimals(-1) });
  cmd({ id: 'dlg:formatCells', label: L('Format cells…', 'Formatar células…', 'Formato de celdas…'), icon: 'tune', shortcut: 'Ctrl+1', supports: has('setFormat'), isEnabled: loaded, run: () => ctl.formatCells() });

  // ── bordas ──
  for (const [k, en, pt, es, icon, sc] of [
    ['bottom', 'Bottom border', 'Borda inferior', 'Borde inferior', 'border_bottom', undefined],
    ['top', 'Top border', 'Borda superior', 'Borde superior', 'border_top', undefined],
    ['left', 'Left border', 'Borda esquerda', 'Borde izquierdo', 'border_left', undefined],
    ['right', 'Right border', 'Borda direita', 'Borde derecho', 'border_right', undefined],
    ['none', 'No border', 'Sem borda', 'Sin borde', 'border_clear', 'Ctrl+Shift+-'],
    ['all', 'All borders', 'Todas as bordas', 'Todos los bordes', 'border_all', undefined],
    ['outside', 'Outside borders', 'Bordas externas', 'Bordes externos', 'border_outer', 'Ctrl+Shift+7'],
    ['thickOutside', 'Thick outside borders', 'Bordas externas espessas', 'Borde de cuadro grueso', 'border_style', undefined],
  ] as const) cmd({ id: `borders:${k}`, label: L(en, pt, es), icon, ...(sc ? { shortcut: sc } : {}), supports: has('setBorders'), isEnabled: loaded, run: () => el.setBorders(k) });

  // ── células: tamanho e visibilidade ──
  cmd({ id: 'row:height', label: L('Row height…', 'Altura da linha…', 'Alto de fila…'), icon: 'height', supports: has('setRowHeight'), isEnabled: loaded, run: () => ctl.rowHeight() });
  cmd({ id: 'row:autofit', label: L('AutoFit row height', 'AutoAjuste da altura da linha', 'Autoajustar alto de fila'), icon: 'unfold_more', supports: has('autofitRows'), isEnabled: loaded, run: () => el.autofitRows() });
  cmd({ id: 'col:width', label: L('Column width…', 'Largura da coluna…', 'Ancho de columna…'), icon: 'width', supports: has('setColumnWidth'), isEnabled: loaded, run: () => ctl.columnWidth() });
  cmd({ id: 'col:autofit', label: L('AutoFit column width', 'AutoAjuste da largura da coluna', 'Autoajustar ancho de columnas'), icon: 'width_normal', supports: has('autofitColumns'), isEnabled: loaded, run: () => el.autofitColumns() });
  cmd({ id: 'row:hide', label: L('Hide rows', 'Ocultar linhas', 'Ocultar filas'), icon: 'visibility_off', shortcut: 'Ctrl+9', supports: has('setHidden'), isEnabled: loaded, run: () => el.setHidden('rows', true) });
  cmd({ id: 'row:unhide', label: L('Unhide rows', 'Reexibir linhas', 'Mostrar filas'), icon: 'visibility', shortcut: 'Ctrl+Shift+9', supports: has('setHidden'), isEnabled: loaded, run: () => el.setHidden('rows', false) });
  cmd({ id: 'col:hide', label: L('Hide columns', 'Ocultar colunas', 'Ocultar columnas'), icon: 'visibility_off', shortcut: 'Ctrl+0', supports: has('setHidden'), isEnabled: loaded, run: () => el.setHidden('cols', true) });
  cmd({ id: 'col:unhide', label: L('Unhide columns', 'Reexibir colunas', 'Mostrar columnas'), icon: 'visibility', supports: has('setHidden'), isEnabled: loaded, run: () => el.setHidden('cols', false) });

  // ── Ajuda ──
  cmd({ id: 'shortcuts', label: L('Keyboard shortcuts', 'Atalhos de teclado', 'Métodos abreviados de teclado'), icon: 'keyboard', run: () => ctl.shortcuts() });
  cmd({ id: 'about', label: L('About Universal Sheet', 'Sobre o Universal Sheet', 'Acerca de Universal Sheet'), icon: 'info', run: () => ctl.about() });
}

/** Próximo zoom da lista (setas de zoom). */
export function nextZoom(z: number, dir: 1 | -1): number {
  const pct = Math.round(z * 100);
  const list = [40, ...ZOOMS.filter((x) => x >= 50 && x <= 300)];
  const next = dir > 0 ? list.find((x) => x > pct) ?? 300 : [...list].reverse().find((x) => x < pct) ?? 40;
  return next / 100;
}

/** Aumentar/Diminuir Tamanho da Fonte: os tamanhos da lista do Excel. */
export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
export function stepSize(size: number, dir: 1 | -1): number {
  if (dir > 0) return FONT_SIZES.find((s) => s > size) ?? Math.min(409, Math.ceil(size / 10) * 10 + 10);
  return [...FONT_SIZES].reverse().find((s) => s < size) ?? Math.max(1, size - 1);
}

function indentOf(el: UniversalSheetElement): number {
  return el.getCellFormat().indent;
}

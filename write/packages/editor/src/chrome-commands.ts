// Comandos do Write sobre a API PÚBLICA do <universal-write>. Comando cuja API
// ainda não existe fica oculto (supports = typeof editor[m] === 'function'):
// as frentes futuras (tabelas, controle de alterações, notas, ortografia…) só
// precisam implementar o método — o botão/menu aparece sozinho.
import { HIGHLIGHT_COLORS, type CommandRegistry, type Command } from '@universal-office/ui';
import type { UniversalWriteElement, ViewMode } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type { TableDialogKind } from './chrome-table-dialogs.js';
import { registerTableCommands } from './chrome-table.js';
import { registerHfCommands } from './chrome-hf.js';
import { registerPictureCommands } from './chrome-picture.js';
import { registerPageCommands } from './chrome-page.js';
import { registerTocCommands, type TocDialogKind } from './chrome-toc.js';
import { registerTextLayoutCommands, type TextLayoutDialogKind } from './chrome-textlayout.js';
import { registerShapeCommands } from './chrome-shape.js';
import { registerPictureAdjustCommands } from './chrome-picture-adjust.js';
import { registerHomeCommands, colorFromPick, pickHex } from './chrome-home.js';
import { registerListCommands } from './chrome-lists.js';
import { registerClipboardCommands } from './chrome-clipboard.js';

type SelState = ReturnType<UniversalWriteElement['getSelectionState']>;

/** O que a barra montada oferece aos comandos (diálogos, painéis, modo). */
export interface ChromeCtl {
  state(): SelState;
  find(replace: boolean): void;
  comment(): void;
  link(): void;
  image(): void;
  fontDialog(): void;
  paragraphDialog(): void;
  /** Configurar Página (guia: Margens, Papel ou Layout) */
  pageDialog(tab?: 'margins' | 'paper' | 'layout'): void;
  /** diálogos da frente Layout do texto (Opções de Hifenização, Hifenização Manual) */
  textLayoutDialog(kind: TextLayoutDialogKind): void;
  /** diálogo Mais Colunas */
  columnsDialog(): void;
  /** diálogo Notas de Rodapé e de Fim, Converter Notas e Mostrar Notas (que pergunta a área) */
  notesDialog(): void;
  convertNotesDialog(): void;
  showNotes(): void;
  wordCount(): void;
  /** diálogo Ortografia (F7) */
  spelling(): void;
  shortcuts(): void;
  about(): void;
  compare(): void;
  focusMode(): void;
  inFocusMode(): boolean;
  toolbarMode(): 'compact' | 'ribbon';
  setToolbarMode(m: 'compact' | 'ribbon'): void;
  toggleComments(): void;
  /** Controlar Alterações (pergunta o nome do autor na 1ª vez, se o host não o deu) */
  trackChanges(): void;
  /** Painel de Revisão: abre/fecha (sem argumento: alterna) ou muda a orientação */
  reviewPane(dir?: 'vertical' | 'horizontal'): void;
  reviewPaneOpen(): false | 'vertical' | 'horizontal';
  requestFonts(): void;
  flash(msg: string): void;
  /** destaque/modo mudaram em app.accent/app.mode */
  applyTheme(): void;
  /** Painel de Estilos e Inspetor de Estilo (chrome-styles.ts) */
  stylesPane(): void;
  stylesPaneOpen(): boolean;
  styleInspector(): void;
  inspectorOpen(): boolean;
  newStyle(): void;
  modifyStyle(): void;
  /** diálogos de tabela (Inserir Tabela, Dividir Células…) */
  tableDialog(kind: TableDialogKind, arg?: string): void;
  /** diálogos e painéis de imagem (Layout, Texto Alt…) */
  pictureDialog(kind: import('./chrome-picture.js').PictureDialogKind): void;
  /** painel da imagem aberto (Texto Alt, Seleção)? */
  pictureDialogOpen(kind: import('./chrome-picture.js').PictureDialogKind): boolean;
  /** Painel de Navegação, Régua, Linhas de Grade e o diálogo Tabulação (chrome-nav/ruler) */
  navPane(): void;
  navPaneOpen(): boolean;
  ruler(): void;
  rulerOn(): boolean;
  gridlines(): void;
  tabsDialog(): void;
  /** diálogos do cabeçalho/rodapé (chrome-hf.ts) */
  hfDialog(kind: 'pageNumbers' | 'dateTime' | 'alignTab' | 'options'): void;
  /** diálogos da frente Links e referências (Indicador, Referência Cruzada, Legenda, Índice de Ilustrações) */
  refsDialog(kind: 'bookmark' | 'crossref' | 'caption' | 'tof'): void;
  /** diálogos do Sumário (chrome-toc.ts): Sumário Personalizado, a pergunta de Atualizar, Marcar Entrada */
  tocDialog(kind: TocDialogKind, scope?: 'caret' | 'selection'): void;
  /** diálogos do Plano de Fundo da Página (chrome-page.ts): Efeitos de Preenchimento, Marca-d'Água Personalizada */
  pageBgDialog(kind: 'fill' | 'watermark'): void;
  /** diálogos de listas (chrome-lists.ts): Definir Novo Marcador/Formato de Número/Valor/Vários Níveis/Estilo de Lista, Ajustar Recuos */
  listDialog(kind: import('./chrome-lists.js').ListDialogKind): void;
  /** Área de Transferência (chrome-clipboard.ts): Colar Especial, Definir Colagem Padrão, painel */
  clipboard(kind: import('./chrome-clipboard.js').ClipboardUiKind): void;
}

export const ZOOMS = [50, 75, 90, 100, 125, 150, 200];

export function registerWriteCommands(reg: CommandRegistry, ed: UniversalWriteElement, app: WriteApp, ctl: ChromeCtl): void {
  const api = ed as unknown as Record<string, unknown>;
  const has = (m: string) => (): boolean => typeof api[m] === 'function';
  const call = (m: string, ...args: unknown[]): unknown => (api[m] as (...a: unknown[]) => unknown).apply(ed, args);
  const canEdit = (): boolean => !app.comparing && !ed.isProtected();
  const notComparing = (): boolean => !app.comparing;
  const run = (): SelState['run'] => ctl.state().run;
  const para = (): SelState['para'] => ctl.state().para;
  const L = app.ui!.L;
  let painterClick = 0;

  // controle de alterações
  const markup = (): { insertionsDeletions: boolean; formatting: boolean; balloons: string; authors: string[] | null } =>
    (typeof api['getMarkupOptions'] === 'function' ? call('getMarkupOptions') : { insertionsDeletions: true, formatting: true, balloons: 'mixed', authors: null }) as ReturnType<typeof markup>;
  const hasRevisions = (): boolean => typeof api['getRevisions'] === 'function' && (call('getRevisions') as unknown[]).length > 0;
  const resolved = (n: unknown, accept: boolean): void => { ctl.flash(accept ? L.revAccepted(Number(n) || 0) : L.revRejected(Number(n) || 0)); };

  const edit = (c: Omit<Command, 'isEnabled'> & { isEnabled?: () => boolean }): Command =>
    ({ ...c, isEnabled: c.isEnabled ? () => canEdit() && c.isEnabled!() : canEdit });
  /** quebras de seção/coluna valem no corpo (não em cabeçalho/rodapé, caixa ou célula) */
  const bodyOnly = (): boolean => ed.editingHeaderFooter() === null && !ed.editingTextbox() && !ed.editingTableCell();
  const section = (): ReturnType<UniversalWriteElement['getSection']> | null =>
    typeof api['getSection'] === 'function' ? (call('getSection') as ReturnType<UniversalWriteElement['getSection']>) : null;

  const cmds: Command[] = [
    // ── Arquivo ──
    { id: 'new', label: { en: 'New', pt: 'Novo' }, tip: { en: 'New document', pt: 'Novo documento' }, icon: 'note_add', run: () => app.newDocument(), isEnabled: notComparing },
    { id: 'open', label: { en: 'Open…', pt: 'Abrir…' }, icon: 'folder_open', shortcut: 'Ctrl+O', run: () => app.open(), isEnabled: notComparing },
    { id: 'save', label: { en: 'Save', pt: 'Salvar' }, icon: 'save', shortcut: 'Ctrl+S', run: () => app.save(false), isEnabled: notComparing },
    { id: 'saveAs', label: { en: 'Save as…', pt: 'Salvar como…' }, icon: 'save_as', shortcut: 'Ctrl+Shift+S', run: () => app.save(true), isEnabled: notComparing },
    { id: 'fontsInFile', label: { en: 'Fonts in the file…', pt: 'Fontes no arquivo…' }, icon: 'font_download', run: () => app.fontEmbedding() },
    { id: 'export:pdf', label: { en: 'PDF document (.pdf)', pt: 'Documento PDF (.pdf)' }, icon: 'picture_as_pdf', run: () => app.export('pdf') },
    { id: 'export:odt', label: { en: 'OpenDocument (.odt)', pt: 'OpenDocument (.odt)' }, icon: 'description', run: () => app.export('odt') },
    { id: 'export:html', label: { en: 'Web page (.html)', pt: 'Página da Web (.html)' }, icon: 'html', run: () => app.export('html') },
    { id: 'export:md', label: { en: 'Markdown (.md)', pt: 'Markdown (.md)' }, icon: 'markdown', run: () => app.export('md') },
    { id: 'export:xps', label: { en: 'XPS document (.xps)', pt: 'Documento XPS (.xps)' }, icon: 'draft', run: () => app.export('xps') },
    { id: 'print', label: { en: 'Print', pt: 'Imprimir' }, icon: 'print', shortcut: 'Ctrl+P', run: () => ed.print(), isEnabled: notComparing },
    { id: 'compare', label: { en: 'Compare with…', pt: 'Comparar com…' }, tip: { en: 'Compare the current document with another .docx', pt: 'Compara o documento atual com outro .docx' }, icon: 'compare', run: () => ctl.compare(), isEnabled: notComparing },

    // ── Editar ──
    edit({ id: 'undo', label: { en: 'Undo', pt: 'Desfazer' }, icon: 'undo', shortcut: 'Ctrl+Z', run: () => ed.undo() }),
    edit({ id: 'redo', label: { en: 'Redo', pt: 'Refazer' }, icon: 'redo', shortcut: 'Ctrl+Y', run: () => ed.redo() }),
    edit({ id: 'cut', label: { en: 'Cut', pt: 'Recortar' }, icon: 'content_cut', shortcut: 'Ctrl+X', run: () => ed.cut(), isEnabled: () => ed.selectedText().length > 0 }),
    { id: 'copy', label: { en: 'Copy', pt: 'Copiar' }, icon: 'content_copy', shortcut: 'Ctrl+C', run: () => ed.copy(), isEnabled: () => notComparing() && ed.selectedText().length > 0 },
    edit({ id: 'paste', label: { en: 'Paste', pt: 'Colar' }, icon: 'content_paste', shortcut: 'Ctrl+V', run: () => ed.paste() }),
    edit({ id: 'pastePlain', label: { en: 'Paste without formatting', pt: 'Colar sem formatação' }, icon: 'content_paste_go', shortcut: 'Ctrl+Shift+V', run: () => ed.pastePlain() }),
    { id: 'selectAll', label: { en: 'Select all', pt: 'Selecionar tudo' }, icon: 'select_all', shortcut: 'Ctrl+A', run: () => ed.selectAll(), isEnabled: notComparing },
    { id: 'find', label: { en: 'Find', pt: 'Localizar' }, icon: 'search', shortcut: 'Ctrl+F', run: () => ctl.find(false), isEnabled: notComparing },
    { id: 'replace', label: { en: 'Replace', pt: 'Substituir' }, icon: 'find_replace', shortcut: 'Ctrl+H', run: () => ctl.find(true), isEnabled: canEdit },
    // Pincel: um clique = uma vez; duplo clique trava (até Esc ou outro clique) — como o Word
    edit({ id: 'painter', label: { en: 'Format Painter', pt: 'Pincel de Formatação' }, tip: { en: 'Format Painter (double-click to apply to several places; Esc ends)', pt: 'Pincel de Formatação (clique duplo para aplicar em vários lugares; Esc encerra)' }, icon: 'format_paint',
      run: () => {
        const now = Date.now();
        if (now - painterClick < 450 && ed.painterActive()) ed.copyFormat(true);
        else if (ed.painterActive()) ed.cancelFormatPainter();
        else ed.copyFormat();
        painterClick = now;
      }, isChecked: () => ed.painterActive() }),

    // ── Exibir ──
    ...(['print', 'web', 'read', 'outline', 'draft'] as ViewMode[]).map((v): Command => ({
      id: `view:${v}`,
      label: {
        print: { en: 'Print Layout', pt: 'Layout de Impressão' }, web: { en: 'Web Layout', pt: 'Layout da Web' }, read: { en: 'Read Mode', pt: 'Modo de Leitura' },
        outline: { en: 'Outline', pt: 'Estrutura de Tópicos' }, draft: { en: 'Draft', pt: 'Rascunho' },
      }[v as 'print']!,
      icon: { print: 'article', web: 'language', read: 'menu_book', outline: 'format_list_bulleted', draft: 'notes' }[v as 'print'],
      run: () => ed.setView(v), isChecked: () => ed.getView() === v, isEnabled: notComparing,
    })),
    // Mostrar (Exibir): Régua, Linhas de Grade e Painel de Navegação
    { id: 'view:ruler', label: { en: 'Ruler', pt: 'Régua' }, tip: { en: 'Show the rulers to measure and line up objects, indents and tabs', pt: 'Mostra as réguas para medir e alinhar objetos, recuos e tabulações' }, icon: 'straighten', supports: has('getRulerInfo'), run: () => ctl.ruler(), isChecked: () => ctl.rulerOn() },
    { id: 'view:gridlines', label: { en: 'Gridlines', pt: 'Linhas de Grade' }, tip: { en: 'Show the document grid on the page', pt: 'Mostra a grade do documento na página' }, icon: 'grid_4x4', supports: has('showGridlines'), run: () => ctl.gridlines(), isChecked: () => ed.gridlinesShown() },
    { id: 'view:bookmarks', label: { en: 'Bookmarks', pt: 'Indicadores' }, tip: { en: 'Show bookmarks (gray brackets on the screen)', pt: 'Mostrar indicadores (colchetes cinza na tela)' }, icon: 'bookmarks', supports: has('showBookmarks'), run: () => { ed.showBookmarks(); }, isChecked: () => ed.bookmarksShown() },
    { id: 'view:navpane', label: { en: 'Navigation Pane', pt: 'Painel de Navegação' }, tip: { en: 'Headings, pages and search results of the document', pt: 'Títulos, páginas e resultados da pesquisa no documento' }, icon: 'side_navigation', supports: has('getHeadings'), run: () => ctl.navPane(), isChecked: () => ctl.navPaneOpen() },
    { id: 'focus', label: { en: 'Focus', pt: 'Foco' }, tip: { en: 'Focus mode — full screen (Esc to exit)', pt: 'Modo foco — tela inteira (Esc para sair)' }, icon: 'center_focus_strong', run: () => ctl.focusMode(), isChecked: () => ctl.inFocusMode() },
    { id: 'marks', label: { en: 'Formatting marks', pt: 'Mostrar tudo' }, tip: { en: 'Show paragraph marks and other formatting symbols', pt: 'Mostrar marcas de parágrafo e outros símbolos de formatação' }, icon: 'format_paragraph', shortcut: 'Ctrl+Shift+8', run: () => ed.toggleMarks(), isChecked: () => ctl.state().marks },
    { id: 'comments', label: { en: 'Show comments', pt: 'Mostrar comentários' }, icon: 'comment', run: () => ctl.toggleComments(), isChecked: () => app.commentsVisible, supports: () => true },
    { id: 'zoomin', label: { en: 'Zoom in', pt: 'Ampliar' }, icon: 'zoom_in', run: () => ed.setZoom(Math.min(5, Math.round(ed.getZoom() * 110) / 100)) },
    { id: 'zoomout', label: { en: 'Zoom out', pt: 'Reduzir' }, icon: 'zoom_out', run: () => ed.setZoom(Math.max(0.1, Math.round(ed.getZoom() / 1.1 * 100) / 100)) },
    { id: 'zoom100', label: { en: '100%', pt: '100%' }, tip: { en: 'Zoom to 100%', pt: 'Zoom em 100%' }, icon: 'search', run: () => ed.setZoom(1) },
    { id: 'toolbar:ribbon', label: { en: 'Ribbon', pt: 'Faixa de opções' }, icon: 'view_compact_alt', run: () => ctl.setToolbarMode('ribbon'), isChecked: () => ctl.toolbarMode() === 'ribbon' },
    { id: 'toolbar:compact', label: { en: 'Compact toolbar', pt: 'Barra compacta' }, icon: 'toolbar', run: () => ctl.setToolbarMode('compact'), isChecked: () => ctl.toolbarMode() === 'compact' },
    { id: 'statusbar', label: { en: 'Status bar', pt: 'Barra de status' }, icon: 'call_to_action', run: () => { ed.bottombar = !ed.bottombar; }, isChecked: () => ed.bottombar },

    // ── Inserir ──
    edit({ id: 'image', label: { en: 'Image…', pt: 'Imagem…' }, tip: { en: 'Insert image', pt: 'Inserir imagem' }, icon: 'image', run: () => ctl.image() }),
    edit({ id: 'link', label: { en: 'Link…', pt: 'Link…' }, tip: { en: 'Insert link', pt: 'Inserir link' }, icon: 'link', shortcut: 'Ctrl+K', run: () => ctl.link(), isChecked: () => !!run().link, isEnabled: () => ed.canInsertField() }),
    edit({ id: 'comment', label: { en: 'Comment', pt: 'Comentário' }, tip: { en: 'New comment', pt: 'Novo comentário' }, icon: 'add_comment', shortcut: 'Ctrl+Alt+M', run: () => ctl.comment() }),
    edit({ id: 'pagebreak', label: { en: 'Page break', pt: 'Quebra de página' }, icon: 'insert_page_break', shortcut: 'Ctrl+Enter', run: () => ed.insertPageBreak(), isEnabled: () => bodyOnly() }),
    edit({ id: 'field:page', label: { en: 'Page number', pt: 'Número da página' }, icon: 'numbers', run: () => ed.insertField('PAGE') }),
    edit({ id: 'field:numpages', label: { en: 'Page count', pt: 'Número de páginas' }, icon: 'filter_none', run: () => ed.insertField('NUMPAGES') }),
    edit({ id: 'field:date', label: { en: 'Date', pt: 'Data' }, tip: { en: 'Insert date field', pt: 'Inserir campo de data' }, icon: 'calendar_today', run: () => ed.insertField('DATE') }),
    edit({ id: 'header', label: { en: 'Header', pt: 'Cabeçalho' }, icon: 'vertical_align_top', run: () => ed.enterHeaderFooter('header') }),
    edit({ id: 'footer', label: { en: 'Footer', pt: 'Rodapé' }, icon: 'vertical_align_bottom', run: () => ed.enterHeaderFooter('footer') }),
    { id: 'hf:close', label: { en: 'Close Header and Footer', pt: 'Fechar Cabeçalho e Rodapé' }, icon: 'close', run: () => ed.exitHeaderFooter(), isEnabled: () => ed.editingHeaderFooter() !== null },
    // frentes futuras: aparecem quando o método existir (tabela: chrome-table.ts)
    edit({ id: 'footnote', label: { en: 'Footnote', pt: 'Nota de rodapé' }, tip: { en: 'Insert footnote', pt: 'Inserir nota de rodapé' }, icon: 'notes', shortcut: 'Ctrl+Alt+F', supports: has('insertFootnote'), isEnabled: () => ed.canInsertNote(), run: () => call('insertFootnote') }),
    edit({ id: 'endnote', label: { en: 'Endnote', pt: 'Nota de fim' }, tip: { en: 'Insert endnote', pt: 'Inserir nota de fim' }, icon: 'short_text', shortcut: 'Ctrl+Alt+D', supports: has('insertEndnote'), isEnabled: () => ed.canInsertNote(), run: () => call('insertEndnote') }),
    // notas: navegar, mostrar, opções e converter
    { id: 'note:next', label: { en: 'Next Footnote', pt: 'Próxima Nota de Rodapé' }, tip: { en: 'Go to the next footnote', pt: 'Ir para a próxima nota de rodapé' }, icon: 'keyboard_arrow_down', supports: has('nextNote'), isEnabled: () => ed.noteCount('footnote') > 0, run: () => { ed.nextNote('footnote', 1); } },
    { id: 'note:prev', label: { en: 'Previous Footnote', pt: 'Nota de Rodapé Anterior' }, icon: 'keyboard_arrow_up', supports: has('nextNote'), isEnabled: () => ed.noteCount('footnote') > 0, run: () => { ed.nextNote('footnote', -1); } },
    { id: 'note:nextEnd', label: { en: 'Next Endnote', pt: 'Próxima Nota de Fim' }, icon: 'keyboard_arrow_down', supports: has('nextNote'), isEnabled: () => ed.noteCount('endnote') > 0, run: () => { ed.nextNote('endnote', 1); } },
    { id: 'note:prevEnd', label: { en: 'Previous Endnote', pt: 'Nota de Fim Anterior' }, icon: 'keyboard_arrow_up', supports: has('nextNote'), isEnabled: () => ed.noteCount('endnote') > 0, run: () => { ed.nextNote('endnote', -1); } },
    { id: 'note:show', label: { en: 'Show Notes', pt: 'Mostrar Notas' }, tip: { en: 'Go from the reference to the note and back', pt: 'Vai da referência à nota e volta' }, icon: 'visibility', supports: has('showNotes'), isEnabled: () => ed.noteCount('footnote') + ed.noteCount('endnote') > 0, run: () => ctl.showNotes() },
    edit({ id: 'dlg:notes', label: { en: 'Footnote and Endnote…', pt: 'Notas de Rodapé e de Fim…' }, tip: { en: 'Location, number format and numbering of the notes', pt: 'Local, formato e numeração das notas' }, icon: 'notes', supports: has('setNoteOptions'), run: () => ctl.notesDialog() }),
    edit({ id: 'note:convert', label: { en: 'Convert Notes…', pt: 'Converter Notas…' }, icon: 'autorenew', supports: has('convertNotes'), isEnabled: () => ed.noteCount('footnote') + ed.noteCount('endnote') > 0, run: () => ctl.convertNotesDialog() }),
    { id: 'note:goRef', label: { en: 'Go to Reference', pt: 'Ir para a Referência' }, icon: 'keyboard_arrow_up', supports: () => !!ed.editingNote(), run: () => { const n = ed.editingNote(); if (n) ed.goToNoteRef(n.kind, n.id); } },
    edit({ id: 'note:toEndnote', label: { en: 'Convert to Endnote', pt: 'Converter em Nota de Fim' }, icon: 'autorenew', supports: () => ed.editingNote()?.kind === 'footnote', run: () => { const n = ed.editingNote(); if (n) ed.convertNotes('toEndnotes', n); } }),
    edit({ id: 'note:toFootnote', label: { en: 'Convert to Footnote', pt: 'Converter em Nota de Rodapé' }, icon: 'autorenew', supports: () => ed.editingNote()?.kind === 'endnote', run: () => { const n = ed.editingNote(); if (n) ed.convertNotes('toFootnotes', n); } }),
    edit({ id: 'bookmark', label: { en: 'Bookmark', pt: 'Indicador' }, tip: { en: 'Add, delete or go to a bookmark', pt: 'Adicionar, excluir ou ir para um indicador' }, icon: 'bookmark', supports: has('insertBookmark'), run: () => ctl.refsDialog('bookmark') }),
    // links e referências: Referência Cruzada, Legenda, Índice de Ilustrações
    edit({ id: 'crossref', label: { en: 'Cross-reference', pt: 'Referência Cruzada' }, tip: { en: 'Refer to a heading, numbered item, bookmark, note or caption', pt: 'Referir-se a título, item numerado, indicador, nota ou legenda' }, icon: 'arrow_outward', supports: has('insertCrossReference'), isEnabled: () => ed.canInsertField(), run: () => ctl.refsDialog('crossref') }),
    edit({ id: 'caption', label: { en: 'Insert Caption', pt: 'Inserir Legenda' }, tip: { en: 'Add a numbered caption to a picture, table or equation', pt: 'Adicionar uma legenda numerada a imagem, tabela ou equação' }, icon: 'subtitles', supports: has('insertCaption'), isEnabled: () => !!ed.captionTarget() || ed.canInsertField(), run: () => ctl.refsDialog('caption') }),
    edit({ id: 'tof', label: { en: 'Insert Table of Figures', pt: 'Inserir Índice de Ilustrações' }, tip: { en: 'List of the captions of a label', pt: 'Lista das legendas de um rótulo' }, icon: 'list_alt', supports: has('insertTableOfFigures'), isEnabled: () => ed.canInsertField(), run: () => ctl.refsDialog('tof') }),
    edit({ id: 'tof:update', label: { en: 'Update Table', pt: 'Atualizar Tabela' }, tip: { en: 'Update the table of figures', pt: 'Atualizar o índice de ilustrações' }, icon: 'autorenew', supports: has('updateTableOfFigures'), run: () => { if (!ed.updateTableOfFigures()) ctl.flash(L.noTof); } }),
    edit({ id: 'textbox', label: { en: 'Text box', pt: 'Caixa de texto' }, icon: 'text_fields', supports: has('insertTextbox'), run: () => call('insertTextbox') }),
    // quebras de seção/coluna: só no corpo (cabeçalho/rodapé, caixa e célula não)
    ...([['sectionbreak', 'nextPage', 'Section break (next page)', 'Quebra de seção (próxima página)', 'Start the new section on the next page', 'Começa a seção nova na próxima página', 'insert_page_break'],
      ['sectionbreak:continuous', 'continuous', 'Section break (continuous)', 'Quebra de seção (contínua)', 'Start the new section on the same page', 'Começa a seção nova na mesma página', 'horizontal_split'],
      ['sectionbreak:evenPage', 'evenPage', 'Section break (even page)', 'Quebra de seção (página par)', 'Start the new section on the next even-numbered page', 'Começa a seção nova na próxima página par', 'looks_two'],
      ['sectionbreak:oddPage', 'oddPage', 'Section break (odd page)', 'Quebra de seção (página ímpar)', 'Start the new section on the next odd-numbered page', 'Começa a seção nova na próxima página ímpar', 'looks_one']] as const)
      .map(([id, type, en, pt, ten, tpt, icon]) => edit({
        id, label: { en, pt }, tip: { en: ten, pt: tpt }, icon, supports: has('insertSectionBreak'),
        run: () => call('insertSectionBreak', type), isEnabled: bodyOnly,
      })),
    edit({ id: 'columnbreak', label: { en: 'Column break', pt: 'Quebra de coluna' }, tip: { en: 'Text after the break starts in the next column', pt: 'O texto depois da quebra começa na próxima coluna' }, icon: 'view_column', shortcut: 'Ctrl+Shift+Enter', supports: has('insertColumnBreak'), run: () => call('insertColumnBreak'), isEnabled: bodyOnly }),
    // colunas (galeria do grupo Configurar Página)
    ...([['one', 'One', 'Uma', 'crop_portrait'], ['two', 'Two', 'Duas', 'view_column_2'], ['three', 'Three', 'Três', 'view_column'],
      ['left', 'Left', 'Esquerda', 'splitscreen_left'], ['right', 'Right', 'Direita', 'splitscreen_right']] as const)
      .map(([p, en, pt, icon]) => edit({
        id: `columns:${p}`, label: { en, pt }, icon, supports: has('setColumns'), run: () => call('setColumns', p),
        isChecked: () => section()?.columns.preset === p,
      })),
    edit({ id: 'dlg:columns', label: { en: 'More Columns…', pt: 'Mais Colunas…' }, tip: { en: 'Number, width and spacing of the columns', pt: 'Número, largura e espaçamento das colunas' }, icon: 'view_week', supports: has('setColumns'), run: () => ctl.columnsDialog() }),

    // ── Formatar: fonte ──
    edit({ id: 'bold', label: { en: 'Bold', pt: 'Negrito' }, icon: 'format_bold', shortcut: 'Ctrl+B', run: () => ed.toggleRunProp('bold'), isChecked: () => !!run().bold }),
    edit({ id: 'italic', label: { en: 'Italic', pt: 'Itálico' }, icon: 'format_italic', shortcut: 'Ctrl+I', run: () => ed.toggleRunProp('italic'), isChecked: () => !!run().italic }),
    edit({ id: 'underline', label: { en: 'Underline', pt: 'Sublinhado' }, icon: 'format_underlined', shortcut: 'Ctrl+U', run: () => ed.toggleUnderline(), isChecked: () => !!run().underline }),
    edit({ id: 'doubleStrike', label: { en: 'Double strikethrough', pt: 'Tachado duplo' }, icon: 'format_strikethrough', run: () => ed.toggleRunProp('doubleStrike'), isChecked: () => !!run().doubleStrike }),
    edit({ id: 'hidden', label: { en: 'Hidden', pt: 'Oculto' }, icon: 'visibility_off', shortcut: 'Ctrl+Shift+H', run: () => ed.toggleRunProp('hidden'), isChecked: () => !!run().hidden }),
    edit({ id: 'strike', label: { en: 'Strikethrough', pt: 'Tachado' }, icon: 'format_strikethrough', run: () => ed.toggleRunProp('strike'), isChecked: () => !!run().strike }),
    edit({ id: 'sup', label: { en: 'Superscript', pt: 'Sobrescrito' }, icon: 'superscript', shortcut: 'Ctrl+Shift+=', run: () => ed.toggleVertAlign('superscript'), isChecked: () => run().vertAlign === 'superscript' }),
    edit({ id: 'sub', label: { en: 'Subscript', pt: 'Subscrito' }, icon: 'subscript', shortcut: 'Ctrl+=', run: () => ed.toggleVertAlign('subscript'), isChecked: () => run().vertAlign === 'subscript' }),
    edit({ id: 'allCaps', label: { en: 'All caps', pt: 'Todas em maiúsculas' }, icon: 'uppercase', shortcut: 'Ctrl+Shift+A', run: () => ed.toggleRunProp('allCaps'), isChecked: () => !!run().allCaps }),
    edit({ id: 'smallCaps', label: { en: 'Small caps', pt: 'Versalete' }, icon: 'match_case', shortcut: 'Ctrl+Shift+K', run: () => ed.toggleRunProp('smallCaps'), isChecked: () => !!run().smallCaps }),
    edit({ id: 'case:upper', label: { en: 'UPPERCASE', pt: 'MAIÚSCULAS' }, run: () => ed.changeCase('upper') }),
    edit({ id: 'case:lower', label: { en: 'lowercase', pt: 'minúsculas' }, run: () => ed.changeCase('lower') }),
    edit({ id: 'grow', label: { en: 'Increase font size', pt: 'Aumentar Fonte' }, icon: 'text_increase', shortcut: 'Ctrl+]', run: () => ed.growFont(1) }),
    edit({ id: 'shrink', label: { en: 'Decrease font size', pt: 'Diminuir Fonte' }, icon: 'text_decrease', shortcut: 'Ctrl+[', run: () => ed.growFont(-1) }),
    edit({ id: 'color', label: { en: 'Font color', pt: 'Cor da Fonte' }, icon: 'format_color_text', run: () => ed.setColor(colorFromPick(app.lastColor, ed.documentThemeColors())), color: () => `#${pickHex(app.lastColor, ed.documentThemeColors())}` }),
    edit({ id: 'highlight', label: { en: 'Text highlight color', pt: 'Cor do Realce do Texto' }, icon: 'format_ink_highlighter', run: () => ed.setHighlight(app.lastHighlight), color: () => HL_CSS[app.lastHighlight] }),
    edit({ id: 'clear', label: { en: 'Clear All Formatting', pt: 'Limpar Toda a Formatação' }, icon: 'format_clear', run: () => ed.clearFormatting() }),
    edit({ id: 'dlg:font', label: { en: 'Font…', pt: 'Fonte…' }, tip: { en: 'Font settings', pt: 'Configurações de fonte' }, icon: 'text_format', shortcut: 'Ctrl+D', run: () => ctl.fontDialog() }),

    // ── Estilos (chrome-styles.ts) ──
    { id: 'styles:pane', label: { en: 'Styles pane', pt: 'Painel de Estilos' }, tip: { en: 'Styles (Ctrl+Alt+Shift+S)', pt: 'Estilos (Ctrl+Alt+Shift+S)' }, icon: 'view_sidebar', shortcut: 'Ctrl+Alt+Shift+S', supports: has('listStyles'), run: () => ctl.stylesPane(), isChecked: () => ctl.stylesPaneOpen() },
    { id: 'style:inspector', label: { en: 'Style Inspector', pt: 'Inspetor de Estilo' }, icon: 'manage_search', supports: has('inspectStyle'), run: () => ctl.styleInspector(), isChecked: () => ctl.inspectorOpen() },
    edit({ id: 'style:new', label: { en: 'New style…', pt: 'Novo estilo…' }, tip: { en: 'Create a style from the formatting of the selection', pt: 'Cria um estilo com a formatação da seleção' }, icon: 'add', supports: has('createStyle'), run: () => ctl.newStyle() }),
    edit({ id: 'style:modifyCurrent', label: { en: 'Modify style…', pt: 'Modificar estilo…' }, tip: { en: 'Modify the style of the current paragraph', pt: 'Modifica o estilo do parágrafo atual' }, icon: 'edit', supports: has('modifyStyle'), run: () => ctl.modifyStyle() }),
    edit({ id: 'style:updateCurrent', label: { en: 'Update style to match selection', pt: 'Atualizar estilo para corresponder à seleção' }, icon: 'refresh', supports: has('updateStyleFromSelection'), run: () => ed.updateStyleFromSelection() }),
    edit({ id: 'style:normal', label: { en: 'Normal style', pt: 'Estilo Normal' }, icon: 'format_paragraph', shortcut: 'Ctrl+Shift+N', supports: has('applyStyle'), run: () => ed.applyStyle(undefined) }),
    ...[1, 2, 3].map((n) => edit({
      id: `style:h${n}`, label: { en: `Heading ${n}`, pt: `Título ${n}` }, icon: `format_h${n}`, shortcut: `Ctrl+Alt+${n}`, supports: has('listStyles'),
      run: () => ed.applyStyle(ed.listStyles('all').find((s) => s.rawName.toLowerCase() === `heading ${n}`)?.id),
    })),
    edit({ id: 'style:clearChar', label: { en: 'Clear character formatting', pt: 'Limpar formatação de caractere' }, icon: 'format_clear', shortcut: 'Ctrl+Space', supports: has('clearCharacterFormatting'), run: () => ed.clearCharacterFormatting() }),
    edit({ id: 'style:clearPara', label: { en: 'Clear paragraph formatting', pt: 'Limpar formatação de parágrafo' }, icon: 'format_clear', shortcut: 'Ctrl+Q', supports: has('clearParagraphFormatting'), run: () => ed.clearParagraphFormatting() }),

    // ── Formatar: parágrafo ──
    ...([['left', 'Align left', 'Alinhar à Esquerda', 'Ctrl+L'], ['center', 'Center', 'Centralizar', 'Ctrl+E'],
      ['right', 'Align right', 'Alinhar à Direita', 'Ctrl+R'], ['both', 'Justify', 'Justificar', 'Ctrl+J']] as const).map(([a, en, pt, sc]) =>
      edit({
        id: `align:${a}`, label: { en, pt }, icon: a === 'both' ? 'format_align_justify' : `format_align_${a}`, shortcut: sc,
        run: () => ed.setAlignment(a), isChecked: () => (para().alignment ?? 'left') === a,
      })),
    edit({ id: 'list:bullet', label: { en: 'Bullets', pt: 'Marcadores' }, icon: 'format_list_bulleted', run: () => ed.toggleList('bullet'), isChecked: () => ed.listInfo()?.kind === 'bullet' }),
    edit({ id: 'list:decimal', label: { en: 'Numbering', pt: 'Numeração' }, icon: 'format_list_numbered', run: () => ed.toggleList('decimal'), isChecked: () => ed.listInfo()?.kind === 'number' }),
    edit({ id: 'outdent', label: { en: 'Decrease indent', pt: 'Diminuir Recuo' }, icon: 'format_indent_decrease', run: () => ed.indent(-1) }),
    edit({ id: 'indent', label: { en: 'Increase indent', pt: 'Aumentar Recuo' }, icon: 'format_indent_increase', run: () => ed.indent(1) }),
    edit({ id: 'shading', label: { en: 'Shading', pt: 'Sombreamento' }, icon: 'format_color_fill', run: () => ed.setShading(app.lastShading), color: () => `#${app.lastShading}` }),
    edit({ id: 'borders', label: { en: 'Borders', pt: 'Bordas' }, icon: 'border_outer', run: () => ed.toggleBorder(), isChecked: () => !!para().boxBorder }),
    edit({ id: 'dlg:paragraph', label: { en: 'Paragraph…', pt: 'Parágrafo…' }, tip: { en: 'Paragraph settings', pt: 'Configurações de parágrafo' }, icon: 'format_textdirection_l_to_r', run: () => ctl.paragraphDialog() }),
    edit({ id: 'dlg:tabs', label: { en: 'Tabs…', pt: 'Tabulação…' }, tip: { en: 'Tab stops of the paragraph and the default tab stop', pt: 'Tabulações do parágrafo e a tabulação padrão' }, icon: 'keyboard_tab', supports: has('setTabStops'), run: () => ctl.tabsDialog() }),
    edit({ id: 'dlg:page', label: { en: 'Page setup…', pt: 'Configurar página…' }, icon: 'settings', run: () => ctl.pageDialog() }),

    // ── Revisão ──
    { id: 'comment:prev', label: { en: 'Previous', pt: 'Anterior' }, tip: { en: 'Previous comment', pt: 'Comentário anterior' }, icon: 'navigate_before', run: () => stepComment(-1), isEnabled: () => ed.getComments().length > 0 },
    { id: 'comment:next', label: { en: 'Next', pt: 'Próximo' }, tip: { en: 'Next comment', pt: 'Próximo comentário' }, icon: 'navigate_next', run: () => stepComment(1), isEnabled: () => ed.getComments().length > 0 },
    edit({ id: 'comment:delete', label: { en: 'Delete', pt: 'Excluir' }, tip: { en: 'Delete comment', pt: 'Excluir comentário' }, icon: 'delete', run: () => { for (const id of app.activeCommentIds) ed.removeComment(id); app.activeCommentIds = []; }, isEnabled: () => app.activeCommentIds.length > 0 }),
    edit({ id: 'comment:deleteAll', label: { en: 'Delete all comments', pt: 'Excluir todos os comentários' }, icon: 'delete_sweep', run: () => { for (const c of ed.getComments()) ed.removeComment(c.id); }, isEnabled: () => ed.getComments().length > 0 }),
    { id: 'enableEditing', label: { en: 'Enable Editing', pt: 'Habilitar Edição' }, icon: 'edit_document', run: () => app.enableEditing(), isEnabled: () => ed.isProtected(), supports: () => true },
    { id: 'wordCount', label: { en: 'Word count', pt: 'Contar Palavras' }, icon: 'numbers', shortcut: 'Ctrl+Shift+G', run: () => ctl.wordCount() },
    { id: 'spelling', label: { en: 'Spelling & grammar', pt: 'Ortografia e gramática' }, icon: 'spellcheck', shortcut: 'F7', supports: has('nextMisspelling'), run: () => ctl.spelling(), isEnabled: canEdit },
    { id: 'spellAsYouType', label: { en: 'Check spelling as you type', pt: 'Verificar ortografia ao digitar' }, icon: 'spellcheck', supports: has('toggleSpellCheck'), run: () => call('toggleSpellCheck'), isChecked: () => typeof api['spellCheckEnabled'] === 'function' && !!call('spellCheckEnabled') },
    // controle de alterações (rótulos do Word 365 pt-BR, guia Revisão)
    edit({ id: 'trackChanges', label: { en: 'Track Changes', pt: 'Controlar Alterações' }, icon: 'track_changes', shortcut: 'Ctrl+Shift+E', supports: has('toggleTrackChanges'), run: () => ctl.trackChanges(), isChecked: () => typeof api['isTrackingChanges'] === 'function' && !!call('isTrackingChanges') }),
    ...([['simple', 'Simple Markup', 'Marcação Simples'], ['all', 'All Markup', 'Todas as Marcações'], ['none', 'No Markup', 'Sem Marcação'], ['original', 'Original', 'Original']] as const).map(([m, en, pt]): Command =>
      ({ id: `markup:${m}`, label: { en, pt }, supports: has('setMarkupMode'), run: () => call('setMarkupMode', m), isChecked: () => typeof api['getMarkupMode'] === 'function' && call('getMarkupMode') === m })),
    ...([['insdel', 'Insertions and Deletions', 'Inserções e Exclusões', 'insertionsDeletions'], ['formatting', 'Formatting', 'Formatação', 'formatting']] as const).map(([k, en, pt, opt]): Command =>
      ({ id: `show:${k}`, label: { en, pt }, supports: has('setMarkupOptions'), run: () => call('setMarkupOptions', { [opt]: !markup()[opt] }), isChecked: () => !!markup()[opt] })),
    ...([['revisions', 'Show Revisions in Balloons', 'Mostrar Revisões em Balões'], ['inline', 'Show All Revisions Inline', 'Mostrar Todas as Revisões Embutidas'], ['mixed', 'Show Only Comments and Formatting in Balloons', 'Mostrar Somente Comentários e Formatação em Balões']] as const).map(([b, en, pt]): Command =>
      ({ id: `balloons:${b}`, label: { en, pt }, supports: has('setMarkupOptions'), run: () => call('setMarkupOptions', { balloons: b }), isChecked: () => markup().balloons === b })),
    { id: 'people:all', label: { en: 'All Reviewers', pt: 'Todos os Revisores' }, supports: has('setMarkupOptions'), run: () => call('setMarkupOptions', { authors: markup().authors ? null : [] }), isChecked: () => !markup().authors },
    { id: 'reviewPane', label: { en: 'Reviewing Pane', pt: 'Painel de Revisão' }, icon: 'view_column', supports: has('getRevisions'), run: () => ctl.reviewPane(), isChecked: () => !!ctl.reviewPaneOpen() },
    { id: 'reviewPane:vertical', label: { en: 'Reviewing Pane Vertical…', pt: 'Painel de Revisão Vertical...' }, supports: has('getRevisions'), run: () => ctl.reviewPane('vertical'), isChecked: () => ctl.reviewPaneOpen() === 'vertical' },
    { id: 'reviewPane:horizontal', label: { en: 'Reviewing Pane Horizontal…', pt: 'Painel de Revisão Horizontal...' }, supports: has('getRevisions'), run: () => ctl.reviewPane('horizontal'), isChecked: () => ctl.reviewPaneOpen() === 'horizontal' },
    edit({ id: 'change:accept', label: { en: 'Accept', pt: 'Aceitar' }, tip: { en: 'Accept and Move to Next', pt: 'Aceitar e Mover para a Próxima' }, icon: 'check_circle', supports: has('acceptChange'), run: () => call('acceptChange'), isEnabled: hasRevisions }),
    edit({ id: 'change:acceptNext', label: { en: 'Accept and Move to Next', pt: 'Aceitar e Mover para a Próxima' }, icon: 'check_circle', supports: has('acceptChange'), run: () => call('acceptChange'), isEnabled: hasRevisions }),
    edit({ id: 'change:acceptOne', label: { en: 'Accept This Change', pt: 'Aceitar Esta Alteração' }, supports: has('acceptChange'), run: () => call('acceptChange', { moveNext: false }), isEnabled: hasRevisions }),
    edit({ id: 'change:acceptShown', label: { en: 'Accept All Changes Shown', pt: 'Aceitar Todas as Alterações Mostradas' }, supports: has('acceptAllChanges'), run: () => resolved(call('acceptAllChanges', { shown: true }), true), isEnabled: hasRevisions }),
    edit({ id: 'change:acceptAll', label: { en: 'Accept All Changes', pt: 'Aceitar Todas as Alterações' }, icon: 'done_all', supports: has('acceptAllChanges'), run: () => resolved(call('acceptAllChanges'), true), isEnabled: hasRevisions }),
    edit({ id: 'change:acceptAllStop', label: { en: 'Accept All Changes and Stop Tracking', pt: 'Aceitar Todas as Alterações e Parar o Controle' }, supports: has('acceptAllChanges'), run: () => resolved(call('acceptAllChanges', { stopTracking: true }), true) }),
    edit({ id: 'change:reject', label: { en: 'Reject', pt: 'Rejeitar' }, tip: { en: 'Reject and Move to Next', pt: 'Rejeitar e Mover para a Próxima' }, icon: 'cancel', supports: has('rejectChange'), run: () => call('rejectChange'), isEnabled: hasRevisions }),
    edit({ id: 'change:rejectNext', label: { en: 'Reject and Move to Next', pt: 'Rejeitar e Mover para a Próxima' }, icon: 'cancel', supports: has('rejectChange'), run: () => call('rejectChange'), isEnabled: hasRevisions }),
    edit({ id: 'change:rejectOne', label: { en: 'Reject Change', pt: 'Rejeitar Alteração' }, supports: has('rejectChange'), run: () => call('rejectChange', { moveNext: false }), isEnabled: hasRevisions }),
    edit({ id: 'change:rejectShown', label: { en: 'Reject All Changes Shown', pt: 'Rejeitar Todas as Alterações Mostradas' }, supports: has('rejectAllChanges'), run: () => resolved(call('rejectAllChanges', { shown: true }), false), isEnabled: hasRevisions }),
    edit({ id: 'change:rejectAll', label: { en: 'Reject All Changes', pt: 'Rejeitar Todas as Alterações' }, icon: 'remove_done', supports: has('rejectAllChanges'), run: () => resolved(call('rejectAllChanges'), false), isEnabled: hasRevisions }),
    edit({ id: 'change:rejectAllStop', label: { en: 'Reject All Changes and Stop Tracking', pt: 'Rejeitar Todas as Alterações e Parar o Controle' }, supports: has('rejectAllChanges'), run: () => resolved(call('rejectAllChanges', { stopTracking: true }), false) }),
    { id: 'change:prev', label: { en: 'Previous', pt: 'Anterior' }, tip: { en: 'Previous Change', pt: 'Alteração Anterior' }, icon: 'navigate_before', supports: has('previousChange'), run: () => { if (!call('previousChange')) ctl.flash(L.noMoreRevisions); }, isEnabled: hasRevisions },
    { id: 'change:next', label: { en: 'Next', pt: 'Próximo' }, tip: { en: 'Next Change', pt: 'Próxima Alteração' }, icon: 'navigate_next', supports: has('nextChange'), run: () => { if (!call('nextChange')) ctl.flash(L.noMoreRevisions); }, isEnabled: hasRevisions },
    edit({ id: 'mailmerge', label: { en: 'Start Mail Merge', pt: 'Iniciar Mala Direta' }, icon: 'mail', supports: has('startMailMerge'), run: () => call('startMailMerge') }),
    edit({ id: 'mergefield', label: { en: 'Insert Merge Field', pt: 'Inserir Campo de Mesclagem' }, icon: 'data_object', supports: has('insertMergeField'), run: () => call('insertMergeField') }),
    edit({ id: 'image:delete', label: { en: 'Delete image', pt: 'Excluir imagem' }, icon: 'delete', supports: has('deleteSelectedImage'), run: () => call('deleteSelectedImage') }),

    // ── Ferramentas / Ajuda ──
    { id: 'fontAccess', label: { en: 'Use installed fonts…', pt: 'Usar as fontes instaladas…' }, icon: 'font_download', run: () => ctl.requestFonts(), supports: () => !ed.hasHostSystemFonts() && typeof (window as unknown as { queryLocalFonts?: unknown }).queryLocalFonts === 'function' },
    { id: 'shortcuts', label: { en: 'Keyboard shortcuts', pt: 'Atalhos de teclado' }, icon: 'keyboard', shortcut: 'Ctrl+/', run: () => ctl.shortcuts() },
    { id: 'about', label: { en: 'About Universal Write', pt: 'Sobre o Universal Write' }, icon: 'info', run: () => ctl.about() },
  ];
  reg.add(...cmds);
  registerTableCommands(reg, ed, app, ctl);
  registerHfCommands(reg, ed, app, ctl);
  registerPictureCommands(reg, ed, app, ctl);
  registerShapeCommands(reg, ed, app, ctl);
  registerPictureAdjustCommands(reg, ed, app, ctl);
  registerPageCommands(reg, ed, app, ctl);
  registerHomeCommands(reg, ed, app, ctl);
  registerListCommands(reg, ed, app, ctl);
  registerClipboardCommands(reg, ed, app, ctl);
  registerTocCommands(reg, ed, app, ctl);
  registerTextLayoutCommands(reg, ed, app, ctl);

  function stepComment(dir: 1 | -1): void {
    const cs = ed.getComments();
    if (!cs.length) return;
    const cur = cs.findIndex((c) => app.activeCommentIds.includes(c.id));
    const next = cs[(cur < 0 ? (dir > 0 ? 0 : cs.length - 1) : (cur + dir + cs.length) % cs.length)]!;
    app.activeCommentIds = [next.id];
    ed.goToComment(next.id);
  }
}

export const HL_CSS: Record<string, string> = Object.fromEntries(HIGHLIGHT_COLORS.map((h) => [h.value, h.css]));

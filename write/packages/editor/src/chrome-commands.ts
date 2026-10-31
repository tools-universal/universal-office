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
import { registerEffectsCommands } from './chrome-effects.js';
import { registerFindCommands } from './chrome-find.js';

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
  /** painel Formatar Efeitos de Texto (chrome-effects.ts) */
  textEffectsPane(): void;
  /** diálogo Localizar e Substituir (chrome-find.ts), na aba pedida */
  findDialog(tab: import('./chrome-find.js').FindTab): void;
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
    { id: 'new', label: { en: 'New', pt: 'Novo', es: 'Nuevo' }, tip: { en: 'New document', pt: 'Novo documento', es: 'Nuevo documento' }, icon: 'note_add', run: () => app.newDocument(), isEnabled: notComparing },
    { id: 'open', label: { en: 'Open…', pt: 'Abrir…', es: 'Abrir…' }, icon: 'folder_open', shortcut: 'Ctrl+O', run: () => app.open(), isEnabled: notComparing },
    { id: 'save', label: { en: 'Save', pt: 'Salvar', es: 'Guardar' }, icon: 'save', shortcut: 'Ctrl+S', run: () => app.save(false), isEnabled: notComparing },
    { id: 'saveAs', label: { en: 'Save as…', pt: 'Salvar como…', es: 'Guardar como…' }, icon: 'save_as', shortcut: 'Ctrl+Shift+S', run: () => app.save(true), isEnabled: notComparing },
    { id: 'fontsInFile', label: { en: 'Fonts in the file…', pt: 'Fontes no arquivo…', es: 'Fuentes en el archivo…' }, icon: 'font_download', run: () => app.fontEmbedding() },
    { id: 'export:pdf', label: { en: 'PDF document (.pdf)', pt: 'Documento PDF (.pdf)', es: 'Documento PDF (.pdf)' }, icon: 'picture_as_pdf', run: () => app.export('pdf') },
    { id: 'export:odt', label: { en: 'OpenDocument (.odt)', pt: 'OpenDocument (.odt)', es: 'OpenDocument (.odt)' }, icon: 'description', run: () => app.export('odt') },
    { id: 'export:html', label: { en: 'Web page (.html)', pt: 'Página da Web (.html)', es: 'Página web (.html)' }, icon: 'html', run: () => app.export('html') },
    { id: 'export:md', label: { en: 'Markdown (.md)', pt: 'Markdown (.md)', es: 'Markdown (.md)' }, icon: 'markdown', run: () => app.export('md') },
    { id: 'export:xps', label: { en: 'XPS document (.xps)', pt: 'Documento XPS (.xps)', es: 'Documento XPS (.xps)' }, icon: 'draft', run: () => app.export('xps') },
    { id: 'print', label: { en: 'Print', pt: 'Imprimir', es: 'Imprimir' }, icon: 'print', shortcut: 'Ctrl+P', run: () => ed.print(), isEnabled: notComparing },
    { id: 'compare', label: { en: 'Compare with…', pt: 'Comparar com…', es: 'Comparar con…' }, tip: { en: 'Compare the current document with another .docx', pt: 'Compara o documento atual com outro .docx', es: 'Compara el documento actual con otro .docx' }, icon: 'compare', run: () => ctl.compare(), isEnabled: notComparing },

    // ── Editar ──
    edit({ id: 'undo', label: { en: 'Undo', pt: 'Desfazer', es: 'Deshacer' }, icon: 'undo', shortcut: 'Ctrl+Z', run: () => ed.undo() }),
    edit({ id: 'redo', label: { en: 'Redo', pt: 'Refazer', es: 'Rehacer' }, icon: 'redo', shortcut: 'Ctrl+Y', run: () => ed.redo() }),
    edit({ id: 'cut', label: { en: 'Cut', pt: 'Recortar', es: 'Cortar' }, icon: 'content_cut', shortcut: 'Ctrl+X', run: () => ed.cut(), isEnabled: () => ed.selectedText().length > 0 }),
    { id: 'copy', label: { en: 'Copy', pt: 'Copiar', es: 'Copiar' }, icon: 'content_copy', shortcut: 'Ctrl+C', run: () => ed.copy(), isEnabled: () => notComparing() && ed.selectedText().length > 0 },
    edit({ id: 'paste', label: { en: 'Paste', pt: 'Colar', es: 'Pegar' }, icon: 'content_paste', shortcut: 'Ctrl+V', run: () => ed.paste() }),
    edit({ id: 'pastePlain', label: { en: 'Paste without formatting', pt: 'Colar sem formatação', es: 'Pegar sin formato' }, icon: 'content_paste_go', shortcut: 'Ctrl+Shift+V', run: () => ed.pastePlain() }),
    { id: 'selectAll', label: { en: 'Select all', pt: 'Selecionar tudo', es: 'Seleccionar todo' }, icon: 'select_all', shortcut: 'Ctrl+A', run: () => ed.selectAll(), isEnabled: notComparing },
    { id: 'find', label: { en: 'Find', pt: 'Localizar', es: 'Buscar' }, icon: 'search', shortcut: 'Ctrl+F', run: () => ctl.find(false), isEnabled: notComparing },
    { id: 'replace', label: { en: 'Replace', pt: 'Substituir', es: 'Reemplazar' }, icon: 'find_replace', shortcut: 'Ctrl+H', run: () => ctl.find(true), isEnabled: canEdit },
    // Pincel: um clique = uma vez; duplo clique trava (até Esc ou outro clique) — como o Word
    edit({ id: 'painter', label: { en: 'Format Painter', pt: 'Pincel de Formatação', es: 'Copiar formato' }, tip: { en: 'Format Painter (double-click to apply to several places; Esc ends)', pt: 'Pincel de Formatação (clique duplo para aplicar em vários lugares; Esc encerra)', es: 'Copiar formato (doble clic para aplicar en varios lugares; Esc para terminar)' }, icon: 'format_paint',
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
        print: { en: 'Print Layout', pt: 'Layout de Impressão', es: 'Diseño de impresión' }, web: { en: 'Web Layout', pt: 'Layout da Web', es: 'Diseño web' }, read: { en: 'Read Mode', pt: 'Modo de Leitura', es: 'Modo de lectura' },
        outline: { en: 'Outline', pt: 'Estrutura de Tópicos', es: 'Esquema' }, draft: { en: 'Draft', pt: 'Rascunho', es: 'Borrador' },
      }[v as 'print']!,
      icon: { print: 'article', web: 'language', read: 'menu_book', outline: 'format_list_bulleted', draft: 'notes' }[v as 'print'],
      run: () => ed.setView(v), isChecked: () => ed.getView() === v, isEnabled: notComparing,
    })),
    // Mostrar (Exibir): Régua, Linhas de Grade e Painel de Navegação
    { id: 'view:ruler', label: { en: 'Ruler', pt: 'Régua', es: 'Regla' }, tip: { en: 'Show the rulers to measure and line up objects, indents and tabs', pt: 'Mostra as réguas para medir e alinhar objetos, recuos e tabulações', es: 'Muestra las reglas para medir y alinear objetos, sangrías y tabulaciones' }, icon: 'straighten', supports: has('getRulerInfo'), run: () => ctl.ruler(), isChecked: () => ctl.rulerOn() },
    { id: 'view:gridlines', label: { en: 'Gridlines', pt: 'Linhas de Grade', es: 'Líneas de cuadrícula' }, tip: { en: 'Show the document grid on the page', pt: 'Mostra a grade do documento na página', es: 'Muestra la cuadrícula del documento en la página' }, icon: 'grid_4x4', supports: has('showGridlines'), run: () => ctl.gridlines(), isChecked: () => ed.gridlinesShown() },
    { id: 'view:bookmarks', label: { en: 'Bookmarks', pt: 'Indicadores', es: 'Marcadores' }, tip: { en: 'Show bookmarks (gray brackets on the screen)', pt: 'Mostrar indicadores (colchetes cinza na tela)', es: 'Mostrar marcadores (corchetes grises en la pantalla)' }, icon: 'bookmarks', supports: has('showBookmarks'), run: () => { ed.showBookmarks(); }, isChecked: () => ed.bookmarksShown() },
    { id: 'view:navpane', label: { en: 'Navigation Pane', pt: 'Painel de Navegação', es: 'Panel de navegación' }, tip: { en: 'Headings, pages and search results of the document', pt: 'Títulos, páginas e resultados da pesquisa no documento', es: 'Títulos, páginas y resultados de búsqueda del documento' }, icon: 'side_navigation', supports: has('getHeadings'), run: () => ctl.navPane(), isChecked: () => ctl.navPaneOpen() },
    { id: 'focus', label: { en: 'Focus', pt: 'Foco', es: 'Foco' }, tip: { en: 'Focus mode — full screen (Esc to exit)', pt: 'Modo foco — tela inteira (Esc para sair)', es: 'Modo foco — pantalla completa (Esc para salir)' }, icon: 'center_focus_strong', run: () => ctl.focusMode(), isChecked: () => ctl.inFocusMode() },
    { id: 'marks', label: { en: 'Formatting marks', pt: 'Mostrar tudo', es: 'Mostrar todo' }, tip: { en: 'Show paragraph marks and other formatting symbols', pt: 'Mostrar marcas de parágrafo e outros símbolos de formatação', es: 'Mostrar marcas de párrafo y otros símbolos de formato' }, icon: 'format_paragraph', shortcut: 'Ctrl+Shift+8', run: () => ed.toggleMarks(), isChecked: () => ctl.state().marks },
    { id: 'comments', label: { en: 'Show comments', pt: 'Mostrar comentários', es: 'Mostrar comentarios' }, icon: 'comment', run: () => ctl.toggleComments(), isChecked: () => app.commentsVisible, supports: () => true },
    { id: 'zoomin', label: { en: 'Zoom in', pt: 'Ampliar', es: 'Acercar' }, icon: 'zoom_in', run: () => ed.setZoom(Math.min(5, Math.round(ed.getZoom() * 110) / 100)) },
    { id: 'zoomout', label: { en: 'Zoom out', pt: 'Reduzir', es: 'Alejar' }, icon: 'zoom_out', run: () => ed.setZoom(Math.max(0.1, Math.round(ed.getZoom() / 1.1 * 100) / 100)) },
    { id: 'zoom100', label: { en: '100%', pt: '100%', es: '100%' }, tip: { en: 'Zoom to 100%', pt: 'Zoom em 100%', es: 'Zoom al 100%' }, icon: 'search', run: () => ed.setZoom(1) },
    { id: 'toolbar:ribbon', label: { en: 'Ribbon', pt: 'Faixa de opções', es: 'Cinta de opciones' }, icon: 'view_compact_alt', run: () => ctl.setToolbarMode('ribbon'), isChecked: () => ctl.toolbarMode() === 'ribbon' },
    { id: 'toolbar:compact', label: { en: 'Compact toolbar', pt: 'Barra compacta', es: 'Barra compacta' }, icon: 'toolbar', run: () => ctl.setToolbarMode('compact'), isChecked: () => ctl.toolbarMode() === 'compact' },
    { id: 'statusbar', label: { en: 'Status bar', pt: 'Barra de status', es: 'Barra de estado' }, icon: 'call_to_action', run: () => { ed.bottombar = !ed.bottombar; }, isChecked: () => ed.bottombar },

    // ── Inserir ──
    edit({ id: 'image', label: { en: 'Image…', pt: 'Imagem…', es: 'Imagen…' }, tip: { en: 'Insert image', pt: 'Inserir imagem', es: 'Insertar imagen' }, icon: 'image', run: () => ctl.image() }),
    edit({ id: 'link', label: { en: 'Link…', pt: 'Link…', es: 'Vínculo…' }, tip: { en: 'Insert link', pt: 'Inserir link', es: 'Insertar vínculo' }, icon: 'link', shortcut: 'Ctrl+K', run: () => ctl.link(), isChecked: () => !!run().link, isEnabled: () => ed.canInsertField() }),
    edit({ id: 'comment', label: { en: 'Comment', pt: 'Comentário', es: 'Comentario' }, tip: { en: 'New comment', pt: 'Novo comentário', es: 'Nuevo comentario' }, icon: 'add_comment', shortcut: 'Ctrl+Alt+M', run: () => ctl.comment() }),
    edit({ id: 'pagebreak', label: { en: 'Page break', pt: 'Quebra de página', es: 'Salto de página' }, icon: 'insert_page_break', shortcut: 'Ctrl+Enter', run: () => ed.insertPageBreak(), isEnabled: () => bodyOnly() }),
    edit({ id: 'field:page', label: { en: 'Page number', pt: 'Número da página', es: 'Número de página' }, icon: 'numbers', run: () => ed.insertField('PAGE') }),
    edit({ id: 'field:numpages', label: { en: 'Page count', pt: 'Número de páginas', es: 'Número de páginas' }, icon: 'filter_none', run: () => ed.insertField('NUMPAGES') }),
    edit({ id: 'field:date', label: { en: 'Date', pt: 'Data', es: 'Fecha' }, tip: { en: 'Insert date field', pt: 'Inserir campo de data', es: 'Insertar campo de fecha' }, icon: 'calendar_today', run: () => ed.insertField('DATE') }),
    edit({ id: 'header', label: { en: 'Header', pt: 'Cabeçalho', es: 'Encabezado' }, icon: 'vertical_align_top', run: () => ed.enterHeaderFooter('header') }),
    edit({ id: 'footer', label: { en: 'Footer', pt: 'Rodapé', es: 'Pie de página' }, icon: 'vertical_align_bottom', run: () => ed.enterHeaderFooter('footer') }),
    { id: 'hf:close', label: { en: 'Close Header and Footer', pt: 'Fechar Cabeçalho e Rodapé', es: 'Cerrar encabezado y pie de página' }, icon: 'close', run: () => ed.exitHeaderFooter(), isEnabled: () => ed.editingHeaderFooter() !== null },
    // frentes futuras: aparecem quando o método existir (tabela: chrome-table.ts)
    edit({ id: 'footnote', label: { en: 'Footnote', pt: 'Nota de rodapé', es: 'Nota al pie' }, tip: { en: 'Insert footnote', pt: 'Inserir nota de rodapé', es: 'Insertar nota al pie' }, icon: 'notes', shortcut: 'Ctrl+Alt+F', supports: has('insertFootnote'), isEnabled: () => ed.canInsertNote(), run: () => call('insertFootnote') }),
    edit({ id: 'endnote', label: { en: 'Endnote', pt: 'Nota de fim', es: 'Nota al final' }, tip: { en: 'Insert endnote', pt: 'Inserir nota de fim', es: 'Insertar nota al final' }, icon: 'short_text', shortcut: 'Ctrl+Alt+D', supports: has('insertEndnote'), isEnabled: () => ed.canInsertNote(), run: () => call('insertEndnote') }),
    // notas: navegar, mostrar, opções e converter
    { id: 'note:next', label: { en: 'Next Footnote', pt: 'Próxima Nota de Rodapé', es: 'Siguiente nota al pie' }, tip: { en: 'Go to the next footnote', pt: 'Ir para a próxima nota de rodapé', es: 'Ir a la siguiente nota al pie' }, icon: 'keyboard_arrow_down', supports: has('nextNote'), isEnabled: () => ed.noteCount('footnote') > 0, run: () => { ed.nextNote('footnote', 1); } },
    { id: 'note:prev', label: { en: 'Previous Footnote', pt: 'Nota de Rodapé Anterior', es: 'Nota al pie anterior' }, icon: 'keyboard_arrow_up', supports: has('nextNote'), isEnabled: () => ed.noteCount('footnote') > 0, run: () => { ed.nextNote('footnote', -1); } },
    { id: 'note:nextEnd', label: { en: 'Next Endnote', pt: 'Próxima Nota de Fim', es: 'Siguiente nota al final' }, icon: 'keyboard_arrow_down', supports: has('nextNote'), isEnabled: () => ed.noteCount('endnote') > 0, run: () => { ed.nextNote('endnote', 1); } },
    { id: 'note:prevEnd', label: { en: 'Previous Endnote', pt: 'Nota de Fim Anterior', es: 'Nota al final anterior' }, icon: 'keyboard_arrow_up', supports: has('nextNote'), isEnabled: () => ed.noteCount('endnote') > 0, run: () => { ed.nextNote('endnote', -1); } },
    { id: 'note:show', label: { en: 'Show Notes', pt: 'Mostrar Notas', es: 'Mostrar notas' }, tip: { en: 'Go from the reference to the note and back', pt: 'Vai da referência à nota e volta', es: 'Va de la referencia a la nota y vuelve' }, icon: 'visibility', supports: has('showNotes'), isEnabled: () => ed.noteCount('footnote') + ed.noteCount('endnote') > 0, run: () => ctl.showNotes() },
    edit({ id: 'dlg:notes', label: { en: 'Footnote and Endnote…', pt: 'Notas de Rodapé e de Fim…', es: 'Notas al pie y notas al final…' }, tip: { en: 'Location, number format and numbering of the notes', pt: 'Local, formato e numeração das notas', es: 'Ubicación, formato de número y numeración de las notas' }, icon: 'notes', supports: has('setNoteOptions'), run: () => ctl.notesDialog() }),
    edit({ id: 'note:convert', label: { en: 'Convert Notes…', pt: 'Converter Notas…', es: 'Convertir notas…' }, icon: 'autorenew', supports: has('convertNotes'), isEnabled: () => ed.noteCount('footnote') + ed.noteCount('endnote') > 0, run: () => ctl.convertNotesDialog() }),
    { id: 'note:goRef', label: { en: 'Go to Reference', pt: 'Ir para a Referência', es: 'Ir a la referencia' }, icon: 'keyboard_arrow_up', supports: () => !!ed.editingNote(), run: () => { const n = ed.editingNote(); if (n) ed.goToNoteRef(n.kind, n.id); } },
    edit({ id: 'note:toEndnote', label: { en: 'Convert to Endnote', pt: 'Converter em Nota de Fim', es: 'Convertir en nota al final' }, icon: 'autorenew', supports: () => ed.editingNote()?.kind === 'footnote', run: () => { const n = ed.editingNote(); if (n) ed.convertNotes('toEndnotes', n); } }),
    edit({ id: 'note:toFootnote', label: { en: 'Convert to Footnote', pt: 'Converter em Nota de Rodapé', es: 'Convertir en nota al pie' }, icon: 'autorenew', supports: () => ed.editingNote()?.kind === 'endnote', run: () => { const n = ed.editingNote(); if (n) ed.convertNotes('toFootnotes', n); } }),
    edit({ id: 'bookmark', label: { en: 'Bookmark', pt: 'Indicador', es: 'Marcador' }, tip: { en: 'Add, delete or go to a bookmark', pt: 'Adicionar, excluir ou ir para um indicador', es: 'Agregar, eliminar o ir a un marcador' }, icon: 'bookmark', supports: has('insertBookmark'), run: () => ctl.refsDialog('bookmark') }),
    // links e referências: Referência Cruzada, Legenda, Índice de Ilustrações
    edit({ id: 'crossref', label: { en: 'Cross-reference', pt: 'Referência Cruzada', es: 'Referencia cruzada' }, tip: { en: 'Refer to a heading, numbered item, bookmark, note or caption', pt: 'Referir-se a título, item numerado, indicador, nota ou legenda', es: 'Hacer referencia a un título, elemento numerado, marcador, nota o descripción' }, icon: 'arrow_outward', supports: has('insertCrossReference'), isEnabled: () => ed.canInsertField(), run: () => ctl.refsDialog('crossref') }),
    edit({ id: 'caption', label: { en: 'Insert Caption', pt: 'Inserir Legenda', es: 'Insertar título' }, tip: { en: 'Add a numbered caption to a picture, table or equation', pt: 'Adicionar uma legenda numerada a imagem, tabela ou equação', es: 'Agregar un título numerado a una imagen, tabla o ecuación' }, icon: 'subtitles', supports: has('insertCaption'), isEnabled: () => !!ed.captionTarget() || ed.canInsertField(), run: () => ctl.refsDialog('caption') }),
    edit({ id: 'tof', label: { en: 'Insert Table of Figures', pt: 'Inserir Índice de Ilustrações', es: 'Insertar tabla de ilustraciones' }, tip: { en: 'List of the captions of a label', pt: 'Lista das legendas de um rótulo', es: 'Lista de los títulos de un rótulo' }, icon: 'list_alt', supports: has('insertTableOfFigures'), isEnabled: () => ed.canInsertField(), run: () => ctl.refsDialog('tof') }),
    edit({ id: 'tof:update', label: { en: 'Update Table', pt: 'Atualizar Tabela', es: 'Actualizar tabla' }, tip: { en: 'Update the table of figures', pt: 'Atualizar o índice de ilustrações', es: 'Actualizar la tabla de ilustraciones' }, icon: 'autorenew', supports: has('updateTableOfFigures'), run: () => { if (!ed.updateTableOfFigures()) ctl.flash(L.noTof); } }),
    edit({ id: 'textbox', label: { en: 'Text box', pt: 'Caixa de texto', es: 'Cuadro de texto' }, icon: 'text_fields', supports: has('insertTextbox'), run: () => call('insertTextbox') }),
    // quebras de seção/coluna: só no corpo (cabeçalho/rodapé, caixa e célula não)
    ...([['sectionbreak', 'nextPage', 'Section break (next page)', 'Quebra de seção (próxima página)', 'Salto de sección (página siguiente)', 'Start the new section on the next page', 'Começa a seção nova na próxima página', 'Comienza la nueva sección en la página siguiente', 'insert_page_break'],
      ['sectionbreak:continuous', 'continuous', 'Section break (continuous)', 'Quebra de seção (contínua)', 'Salto de sección (continua)', 'Start the new section on the same page', 'Começa a seção nova na mesma página', 'Comienza la nueva sección en la misma página', 'horizontal_split'],
      ['sectionbreak:evenPage', 'evenPage', 'Section break (even page)', 'Quebra de seção (página par)', 'Salto de sección (página par)', 'Start the new section on the next even-numbered page', 'Começa a seção nova na próxima página par', 'Comienza la nueva sección en la siguiente página par', 'looks_two'],
      ['sectionbreak:oddPage', 'oddPage', 'Section break (odd page)', 'Quebra de seção (página ímpar)', 'Salto de sección (página impar)', 'Start the new section on the next odd-numbered page', 'Começa a seção nova na próxima página ímpar', 'Comienza la nueva sección en la siguiente página impar', 'looks_one']] as const)
      .map(([id, type, en, pt, es, ten, tpt, tes, icon]) => edit({
        id, label: { en, pt, es }, tip: { en: ten, pt: tpt, es: tes }, icon, supports: has('insertSectionBreak'),
        run: () => call('insertSectionBreak', type), isEnabled: bodyOnly,
      })),
    edit({ id: 'columnbreak', label: { en: 'Column break', pt: 'Quebra de coluna', es: 'Salto de columna' }, tip: { en: 'Text after the break starts in the next column', pt: 'O texto depois da quebra começa na próxima coluna', es: 'El texto después del salto comienza en la siguiente columna' }, icon: 'view_column', shortcut: 'Ctrl+Shift+Enter', supports: has('insertColumnBreak'), run: () => call('insertColumnBreak'), isEnabled: bodyOnly }),
    // colunas (galeria do grupo Configurar Página)
    ...([['one', 'One', 'Uma', 'Una', 'crop_portrait'], ['two', 'Two', 'Duas', 'Dos', 'view_column_2'], ['three', 'Three', 'Três', 'Tres', 'view_column'],
      ['left', 'Left', 'Esquerda', 'Izquierda', 'splitscreen_left'], ['right', 'Right', 'Direita', 'Derecha', 'splitscreen_right']] as const)
      .map(([p, en, pt, es, icon]) => edit({
        id: `columns:${p}`, label: { en, pt, es }, icon, supports: has('setColumns'), run: () => call('setColumns', p),
        isChecked: () => section()?.columns.preset === p,
      })),
    edit({ id: 'dlg:columns', label: { en: 'More Columns…', pt: 'Mais Colunas…', es: 'Más columnas…' }, tip: { en: 'Number, width and spacing of the columns', pt: 'Número, largura e espaçamento das colunas', es: 'Número, ancho y espaciado de las columnas' }, icon: 'view_week', supports: has('setColumns'), run: () => ctl.columnsDialog() }),

    // ── Formatar: fonte ──
    edit({ id: 'bold', label: { en: 'Bold', pt: 'Negrito', es: 'Negrita' }, icon: 'format_bold', shortcut: 'Ctrl+B', run: () => ed.toggleRunProp('bold'), isChecked: () => !!run().bold }),
    edit({ id: 'italic', label: { en: 'Italic', pt: 'Itálico', es: 'Cursiva' }, icon: 'format_italic', shortcut: 'Ctrl+I', run: () => ed.toggleRunProp('italic'), isChecked: () => !!run().italic }),
    edit({ id: 'underline', label: { en: 'Underline', pt: 'Sublinhado', es: 'Subrayado' }, icon: 'format_underlined', shortcut: 'Ctrl+U', run: () => ed.toggleUnderline(), isChecked: () => !!run().underline }),
    edit({ id: 'doubleStrike', label: { en: 'Double strikethrough', pt: 'Tachado duplo', es: 'Doble tachado' }, icon: 'format_strikethrough', run: () => ed.toggleRunProp('doubleStrike'), isChecked: () => !!run().doubleStrike }),
    edit({ id: 'hidden', label: { en: 'Hidden', pt: 'Oculto', es: 'Oculto' }, icon: 'visibility_off', shortcut: 'Ctrl+Shift+H', run: () => ed.toggleRunProp('hidden'), isChecked: () => !!run().hidden }),
    edit({ id: 'strike', label: { en: 'Strikethrough', pt: 'Tachado', es: 'Tachado' }, icon: 'format_strikethrough', run: () => ed.toggleRunProp('strike'), isChecked: () => !!run().strike }),
    edit({ id: 'sup', label: { en: 'Superscript', pt: 'Sobrescrito', es: 'Superíndice' }, icon: 'superscript', shortcut: 'Ctrl+Shift+=', run: () => ed.toggleVertAlign('superscript'), isChecked: () => run().vertAlign === 'superscript' }),
    edit({ id: 'sub', label: { en: 'Subscript', pt: 'Subscrito', es: 'Subíndice' }, icon: 'subscript', shortcut: 'Ctrl+=', run: () => ed.toggleVertAlign('subscript'), isChecked: () => run().vertAlign === 'subscript' }),
    edit({ id: 'allCaps', label: { en: 'All caps', pt: 'Todas em maiúsculas', es: 'Mayúsculas' }, icon: 'uppercase', shortcut: 'Ctrl+Shift+A', run: () => ed.toggleRunProp('allCaps'), isChecked: () => !!run().allCaps }),
    edit({ id: 'smallCaps', label: { en: 'Small caps', pt: 'Versalete', es: 'Versalitas' }, icon: 'match_case', shortcut: 'Ctrl+Shift+K', run: () => ed.toggleRunProp('smallCaps'), isChecked: () => !!run().smallCaps }),
    edit({ id: 'case:upper', label: { en: 'UPPERCASE', pt: 'MAIÚSCULAS', es: 'MAYÚSCULAS' }, run: () => ed.changeCase('upper') }),
    edit({ id: 'case:lower', label: { en: 'lowercase', pt: 'minúsculas', es: 'minúsculas' }, run: () => ed.changeCase('lower') }),
    edit({ id: 'grow', label: { en: 'Increase font size', pt: 'Aumentar Fonte', es: 'Aumentar tamaño de fuente' }, icon: 'text_increase', shortcut: 'Ctrl+]', run: () => ed.growFont(1) }),
    edit({ id: 'shrink', label: { en: 'Decrease font size', pt: 'Diminuir Fonte', es: 'Disminuir tamaño de fuente' }, icon: 'text_decrease', shortcut: 'Ctrl+[', run: () => ed.growFont(-1) }),
    edit({ id: 'color', label: { en: 'Font color', pt: 'Cor da Fonte', es: 'Color de fuente' }, icon: 'format_color_text', run: () => ed.setColor(colorFromPick(app.lastColor, ed.documentThemeColors())), color: () => `#${pickHex(app.lastColor, ed.documentThemeColors())}` }),
    edit({ id: 'highlight', label: { en: 'Text highlight color', pt: 'Cor do Realce do Texto', es: 'Color de resaltado del texto' }, icon: 'format_ink_highlighter', run: () => ed.setHighlight(app.lastHighlight), color: () => HL_CSS[app.lastHighlight] }),
    edit({ id: 'clear', label: { en: 'Clear All Formatting', pt: 'Limpar Toda a Formatação', es: 'Borrar todo el formato' }, icon: 'format_clear', run: () => ed.clearFormatting() }),
    edit({ id: 'dlg:font', label: { en: 'Font…', pt: 'Fonte…', es: 'Fuente…' }, tip: { en: 'Font settings', pt: 'Configurações de fonte', es: 'Configuración de fuente' }, icon: 'text_format', shortcut: 'Ctrl+D', run: () => ctl.fontDialog() }),

    // ── Estilos (chrome-styles.ts) ──
    { id: 'styles:pane', label: { en: 'Styles pane', pt: 'Painel de Estilos', es: 'Panel de estilos' }, tip: { en: 'Styles (Ctrl+Alt+Shift+S)', pt: 'Estilos (Ctrl+Alt+Shift+S)', es: 'Estilos (Ctrl+Alt+Shift+S)' }, icon: 'view_sidebar', shortcut: 'Ctrl+Alt+Shift+S', supports: has('listStyles'), run: () => ctl.stylesPane(), isChecked: () => ctl.stylesPaneOpen() },
    { id: 'style:inspector', label: { en: 'Style Inspector', pt: 'Inspetor de Estilo', es: 'Inspector de estilo' }, icon: 'manage_search', supports: has('inspectStyle'), run: () => ctl.styleInspector(), isChecked: () => ctl.inspectorOpen() },
    edit({ id: 'style:new', label: { en: 'New style…', pt: 'Novo estilo…', es: 'Nuevo estilo…' }, tip: { en: 'Create a style from the formatting of the selection', pt: 'Cria um estilo com a formatação da seleção', es: 'Crea un estilo con el formato de la selección' }, icon: 'add', supports: has('createStyle'), run: () => ctl.newStyle() }),
    edit({ id: 'style:modifyCurrent', label: { en: 'Modify style…', pt: 'Modificar estilo…', es: 'Modificar estilo…' }, tip: { en: 'Modify the style of the current paragraph', pt: 'Modifica o estilo do parágrafo atual', es: 'Modifica el estilo del párrafo actual' }, icon: 'edit', supports: has('modifyStyle'), run: () => ctl.modifyStyle() }),
    edit({ id: 'style:updateCurrent', label: { en: 'Update style to match selection', pt: 'Atualizar estilo para corresponder à seleção', es: 'Actualizar estilo para que coincida con la selección' }, icon: 'refresh', supports: has('updateStyleFromSelection'), run: () => ed.updateStyleFromSelection() }),
    edit({ id: 'style:normal', label: { en: 'Normal style', pt: 'Estilo Normal', es: 'Estilo Normal' }, icon: 'format_paragraph', shortcut: 'Ctrl+Shift+N', supports: has('applyStyle'), run: () => ed.applyStyle(undefined) }),
    ...[1, 2, 3].map((n) => edit({
      id: `style:h${n}`, label: { en: `Heading ${n}`, pt: `Título ${n}`, es: `Título ${n}` }, icon: `format_h${n}`, shortcut: `Ctrl+Alt+${n}`, supports: has('listStyles'),
      run: () => ed.applyStyle(ed.listStyles('all').find((s) => s.rawName.toLowerCase() === `heading ${n}`)?.id),
    })),
    edit({ id: 'style:clearChar', label: { en: 'Clear character formatting', pt: 'Limpar formatação de caractere', es: 'Borrar formato de caracteres' }, icon: 'format_clear', shortcut: 'Ctrl+Space', supports: has('clearCharacterFormatting'), run: () => ed.clearCharacterFormatting() }),
    edit({ id: 'style:clearPara', label: { en: 'Clear paragraph formatting', pt: 'Limpar formatação de parágrafo', es: 'Borrar formato de párrafo' }, icon: 'format_clear', shortcut: 'Ctrl+Q', supports: has('clearParagraphFormatting'), run: () => ed.clearParagraphFormatting() }),

    // ── Formatar: parágrafo ──
    ...([['left', 'Align left', 'Alinhar à Esquerda', 'Alinear a la izquierda', 'Ctrl+L'], ['center', 'Center', 'Centralizar', 'Centrar', 'Ctrl+E'],
      ['right', 'Align right', 'Alinhar à Direita', 'Alinear a la derecha', 'Ctrl+R'], ['both', 'Justify', 'Justificar', 'Justificar', 'Ctrl+J']] as const).map(([a, en, pt, es, sc]) =>
      edit({
        id: `align:${a}`, label: { en, pt, es }, icon: a === 'both' ? 'format_align_justify' : `format_align_${a}`, shortcut: sc,
        run: () => ed.setAlignment(a), isChecked: () => (para().alignment ?? 'left') === a,
      })),
    edit({ id: 'list:bullet', label: { en: 'Bullets', pt: 'Marcadores', es: 'Viñetas' }, icon: 'format_list_bulleted', run: () => ed.toggleList('bullet'), isChecked: () => ed.listInfo()?.kind === 'bullet' }),
    edit({ id: 'list:decimal', label: { en: 'Numbering', pt: 'Numeração', es: 'Numeración' }, icon: 'format_list_numbered', run: () => ed.toggleList('decimal'), isChecked: () => ed.listInfo()?.kind === 'number' }),
    edit({ id: 'outdent', label: { en: 'Decrease indent', pt: 'Diminuir Recuo', es: 'Disminuir sangría' }, icon: 'format_indent_decrease', run: () => ed.indent(-1) }),
    edit({ id: 'indent', label: { en: 'Increase indent', pt: 'Aumentar Recuo', es: 'Aumentar sangría' }, icon: 'format_indent_increase', run: () => ed.indent(1) }),
    edit({ id: 'shading', label: { en: 'Shading', pt: 'Sombreamento', es: 'Sombreado' }, icon: 'format_color_fill', run: () => ed.setShading(app.lastShading), color: () => `#${app.lastShading}` }),
    edit({ id: 'borders', label: { en: 'Borders', pt: 'Bordas', es: 'Bordes' }, icon: 'border_outer', run: () => ed.toggleBorder(), isChecked: () => !!para().boxBorder }),
    edit({ id: 'dlg:paragraph', label: { en: 'Paragraph…', pt: 'Parágrafo…', es: 'Párrafo…' }, tip: { en: 'Paragraph settings', pt: 'Configurações de parágrafo', es: 'Configuración de párrafo' }, icon: 'format_textdirection_l_to_r', run: () => ctl.paragraphDialog() }),
    edit({ id: 'dlg:tabs', label: { en: 'Tabs…', pt: 'Tabulação…', es: 'Tabulaciones…' }, tip: { en: 'Tab stops of the paragraph and the default tab stop', pt: 'Tabulações do parágrafo e a tabulação padrão', es: 'Tabulaciones del párrafo y tabulación predeterminada' }, icon: 'keyboard_tab', supports: has('setTabStops'), run: () => ctl.tabsDialog() }),
    edit({ id: 'dlg:page', label: { en: 'Page setup…', pt: 'Configurar página…', es: 'Configurar página…' }, icon: 'settings', run: () => ctl.pageDialog() }),

    // ── Revisão ──
    { id: 'comment:prev', label: { en: 'Previous', pt: 'Anterior', es: 'Anterior' }, tip: { en: 'Previous comment', pt: 'Comentário anterior', es: 'Comentario anterior' }, icon: 'navigate_before', run: () => stepComment(-1), isEnabled: () => ed.getComments().length > 0 },
    { id: 'comment:next', label: { en: 'Next', pt: 'Próximo', es: 'Siguiente' }, tip: { en: 'Next comment', pt: 'Próximo comentário', es: 'Siguiente comentario' }, icon: 'navigate_next', run: () => stepComment(1), isEnabled: () => ed.getComments().length > 0 },
    edit({ id: 'comment:delete', label: { en: 'Delete', pt: 'Excluir', es: 'Eliminar' }, tip: { en: 'Delete comment', pt: 'Excluir comentário', es: 'Eliminar comentario' }, icon: 'delete', run: () => { for (const id of app.activeCommentIds) ed.removeComment(id); app.activeCommentIds = []; }, isEnabled: () => app.activeCommentIds.length > 0 }),
    edit({ id: 'comment:deleteAll', label: { en: 'Delete all comments', pt: 'Excluir todos os comentários', es: 'Eliminar todos los comentarios' }, icon: 'delete_sweep', run: () => { for (const c of ed.getComments()) ed.removeComment(c.id); }, isEnabled: () => ed.getComments().length > 0 }),
    { id: 'enableEditing', label: { en: 'Enable Editing', pt: 'Habilitar Edição', es: 'Habilitar edición' }, icon: 'edit_document', run: () => app.enableEditing(), isEnabled: () => ed.isProtected(), supports: () => true },
    { id: 'wordCount', label: { en: 'Word count', pt: 'Contar Palavras', es: 'Contar palabras' }, icon: 'numbers', shortcut: 'Ctrl+Shift+G', run: () => ctl.wordCount() },
    { id: 'spelling', label: { en: 'Spelling & grammar', pt: 'Ortografia e gramática', es: 'Ortografía y gramática' }, icon: 'spellcheck', shortcut: 'F7', supports: has('nextMisspelling'), run: () => ctl.spelling(), isEnabled: canEdit },
    { id: 'spellAsYouType', label: { en: 'Check spelling as you type', pt: 'Verificar ortografia ao digitar', es: 'Revisar ortografía mientras escribes' }, icon: 'spellcheck', supports: has('toggleSpellCheck'), run: () => call('toggleSpellCheck'), isChecked: () => typeof api['spellCheckEnabled'] === 'function' && !!call('spellCheckEnabled') },
    // controle de alterações (rótulos do Word 365 pt-BR, guia Revisão)
    edit({ id: 'trackChanges', label: { en: 'Track Changes', pt: 'Controlar Alterações', es: 'Control de cambios' }, icon: 'track_changes', shortcut: 'Ctrl+Shift+E', supports: has('toggleTrackChanges'), run: () => ctl.trackChanges(), isChecked: () => typeof api['isTrackingChanges'] === 'function' && !!call('isTrackingChanges') }),
    ...([['simple', 'Simple Markup', 'Marcação Simples', 'Revisiones simples'], ['all', 'All Markup', 'Todas as Marcações', 'Todas las revisiones'], ['none', 'No Markup', 'Sem Marcação', 'Sin revisiones'], ['original', 'Original', 'Original', 'Original']] as const).map(([m, en, pt, es]): Command =>
      ({ id: `markup:${m}`, label: { en, pt, es }, supports: has('setMarkupMode'), run: () => call('setMarkupMode', m), isChecked: () => typeof api['getMarkupMode'] === 'function' && call('getMarkupMode') === m })),
    ...([['insdel', 'Insertions and Deletions', 'Inserções e Exclusões', 'Inserciones y eliminaciones', 'insertionsDeletions'], ['formatting', 'Formatting', 'Formatação', 'Formato', 'formatting']] as const).map(([k, en, pt, es, opt]): Command =>
      ({ id: `show:${k}`, label: { en, pt, es }, supports: has('setMarkupOptions'), run: () => call('setMarkupOptions', { [opt]: !markup()[opt] }), isChecked: () => !!markup()[opt] })),
    ...([['revisions', 'Show Revisions in Balloons', 'Mostrar Revisões em Balões', 'Mostrar revisiones en globos'], ['inline', 'Show All Revisions Inline', 'Mostrar Todas as Revisões Embutidas', 'Mostrar todas las revisiones en línea'], ['mixed', 'Show Only Comments and Formatting in Balloons', 'Mostrar Somente Comentários e Formatação em Balões', 'Mostrar solo comentarios y formato en globos']] as const).map(([b, en, pt, es]): Command =>
      ({ id: `balloons:${b}`, label: { en, pt, es }, supports: has('setMarkupOptions'), run: () => call('setMarkupOptions', { balloons: b }), isChecked: () => markup().balloons === b })),
    { id: 'people:all', label: { en: 'All Reviewers', pt: 'Todos os Revisores', es: 'Todos los revisores' }, supports: has('setMarkupOptions'), run: () => call('setMarkupOptions', { authors: markup().authors ? null : [] }), isChecked: () => !markup().authors },
    { id: 'reviewPane', label: { en: 'Reviewing Pane', pt: 'Painel de Revisão', es: 'Panel de revisiones' }, icon: 'view_column', supports: has('getRevisions'), run: () => ctl.reviewPane(), isChecked: () => !!ctl.reviewPaneOpen() },
    { id: 'reviewPane:vertical', label: { en: 'Reviewing Pane Vertical…', pt: 'Painel de Revisão Vertical...', es: 'Panel de revisiones vertical…' }, supports: has('getRevisions'), run: () => ctl.reviewPane('vertical'), isChecked: () => ctl.reviewPaneOpen() === 'vertical' },
    { id: 'reviewPane:horizontal', label: { en: 'Reviewing Pane Horizontal…', pt: 'Painel de Revisão Horizontal...', es: 'Panel de revisiones horizontal…' }, supports: has('getRevisions'), run: () => ctl.reviewPane('horizontal'), isChecked: () => ctl.reviewPaneOpen() === 'horizontal' },
    edit({ id: 'change:accept', label: { en: 'Accept', pt: 'Aceitar', es: 'Aceptar' }, tip: { en: 'Accept and Move to Next', pt: 'Aceitar e Mover para a Próxima', es: 'Aceptar y continuar con la siguiente' }, icon: 'check_circle', supports: has('acceptChange'), run: () => call('acceptChange'), isEnabled: hasRevisions }),
    edit({ id: 'change:acceptNext', label: { en: 'Accept and Move to Next', pt: 'Aceitar e Mover para a Próxima', es: 'Aceptar y continuar con la siguiente' }, icon: 'check_circle', supports: has('acceptChange'), run: () => call('acceptChange'), isEnabled: hasRevisions }),
    edit({ id: 'change:acceptOne', label: { en: 'Accept This Change', pt: 'Aceitar Esta Alteração', es: 'Aceptar este cambio' }, supports: has('acceptChange'), run: () => call('acceptChange', { moveNext: false }), isEnabled: hasRevisions }),
    edit({ id: 'change:acceptShown', label: { en: 'Accept All Changes Shown', pt: 'Aceitar Todas as Alterações Mostradas', es: 'Aceptar todos los cambios mostrados' }, supports: has('acceptAllChanges'), run: () => resolved(call('acceptAllChanges', { shown: true }), true), isEnabled: hasRevisions }),
    edit({ id: 'change:acceptAll', label: { en: 'Accept All Changes', pt: 'Aceitar Todas as Alterações', es: 'Aceptar todos los cambios' }, icon: 'done_all', supports: has('acceptAllChanges'), run: () => resolved(call('acceptAllChanges'), true), isEnabled: hasRevisions }),
    edit({ id: 'change:acceptAllStop', label: { en: 'Accept All Changes and Stop Tracking', pt: 'Aceitar Todas as Alterações e Parar o Controle', es: 'Aceptar todos los cambios y detener el seguimiento' }, supports: has('acceptAllChanges'), run: () => resolved(call('acceptAllChanges', { stopTracking: true }), true) }),
    edit({ id: 'change:reject', label: { en: 'Reject', pt: 'Rejeitar', es: 'Rechazar' }, tip: { en: 'Reject and Move to Next', pt: 'Rejeitar e Mover para a Próxima', es: 'Rechazar y continuar con la siguiente' }, icon: 'cancel', supports: has('rejectChange'), run: () => call('rejectChange'), isEnabled: hasRevisions }),
    edit({ id: 'change:rejectNext', label: { en: 'Reject and Move to Next', pt: 'Rejeitar e Mover para a Próxima', es: 'Rechazar y continuar con la siguiente' }, icon: 'cancel', supports: has('rejectChange'), run: () => call('rejectChange'), isEnabled: hasRevisions }),
    edit({ id: 'change:rejectOne', label: { en: 'Reject Change', pt: 'Rejeitar Alteração', es: 'Rechazar cambio' }, supports: has('rejectChange'), run: () => call('rejectChange', { moveNext: false }), isEnabled: hasRevisions }),
    edit({ id: 'change:rejectShown', label: { en: 'Reject All Changes Shown', pt: 'Rejeitar Todas as Alterações Mostradas', es: 'Rechazar todos los cambios mostrados' }, supports: has('rejectAllChanges'), run: () => resolved(call('rejectAllChanges', { shown: true }), false), isEnabled: hasRevisions }),
    edit({ id: 'change:rejectAll', label: { en: 'Reject All Changes', pt: 'Rejeitar Todas as Alterações', es: 'Rechazar todos los cambios' }, icon: 'remove_done', supports: has('rejectAllChanges'), run: () => resolved(call('rejectAllChanges'), false), isEnabled: hasRevisions }),
    edit({ id: 'change:rejectAllStop', label: { en: 'Reject All Changes and Stop Tracking', pt: 'Rejeitar Todas as Alterações e Parar o Controle', es: 'Rechazar todos los cambios y detener el seguimiento' }, supports: has('rejectAllChanges'), run: () => resolved(call('rejectAllChanges', { stopTracking: true }), false) }),
    { id: 'change:prev', label: { en: 'Previous', pt: 'Anterior', es: 'Anterior' }, tip: { en: 'Previous Change', pt: 'Alteração Anterior', es: 'Cambio anterior' }, icon: 'navigate_before', supports: has('previousChange'), run: () => { if (!call('previousChange')) ctl.flash(L.noMoreRevisions); }, isEnabled: hasRevisions },
    { id: 'change:next', label: { en: 'Next', pt: 'Próximo', es: 'Siguiente' }, tip: { en: 'Next Change', pt: 'Próxima Alteração', es: 'Siguiente cambio' }, icon: 'navigate_next', supports: has('nextChange'), run: () => { if (!call('nextChange')) ctl.flash(L.noMoreRevisions); }, isEnabled: hasRevisions },
    edit({ id: 'mailmerge', label: { en: 'Start Mail Merge', pt: 'Iniciar Mala Direta', es: 'Iniciar combinación de correspondencia' }, icon: 'mail', supports: has('startMailMerge'), run: () => call('startMailMerge') }),
    edit({ id: 'mergefield', label: { en: 'Insert Merge Field', pt: 'Inserir Campo de Mesclagem', es: 'Insertar campo combinado' }, icon: 'data_object', supports: has('insertMergeField'), run: () => call('insertMergeField') }),
    edit({ id: 'image:delete', label: { en: 'Delete image', pt: 'Excluir imagem', es: 'Eliminar imagen' }, icon: 'delete', supports: has('deleteSelectedImage'), run: () => call('deleteSelectedImage') }),

    // ── Ferramentas / Ajuda ──
    { id: 'fontAccess', label: { en: 'Use installed fonts…', pt: 'Usar as fontes instaladas…', es: 'Usar las fuentes instaladas…' }, icon: 'font_download', run: () => ctl.requestFonts(), supports: () => !ed.hasHostSystemFonts() && typeof (window as unknown as { queryLocalFonts?: unknown }).queryLocalFonts === 'function' },
    { id: 'shortcuts', label: { en: 'Keyboard shortcuts', pt: 'Atalhos de teclado', es: 'Métodos abreviados de teclado' }, icon: 'keyboard', shortcut: 'Ctrl+/', run: () => ctl.shortcuts() },
    { id: 'about', label: { en: 'About Universal Write', pt: 'Sobre o Universal Write', es: 'Acerca de Universal Write' }, icon: 'info', run: () => ctl.about() },
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
  registerEffectsCommands(reg, ed, app, ctl);
  registerFindCommands(reg, ed, app, ctl);
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

// Comandos das barras do <universal-slides>: a fonte única de rótulo, ícone,
// atalho e estado que a barra compacta, a ribbon, os menus e os atalhos
// consultam. Cada um só DECLARA o que chama na API do elemento; o que a API
// não tem fica oculto (`supports`), como no <universal-write>.
import type { Command, CommandRegistry } from '@universal-office/ui';
import type { UniversalSlidesElement } from './universal-slides.js';
import type { SlidesApp } from './chrome-app.js';
import { TRANSITION_TYPES, type TransitionSpec } from './deck-edit.js';
import { ICONS } from './chrome-icons.js';

/** Ícone: o comum (shared/ui) pelo nome, ou o SVG cru dos que só o Slides usa. */
export const ic = (name: string): string => ICONS[name] ?? name;

export type ViewMode = 'normal' | 'sorter' | 'reading';

/** O que os comandos pedem à barra montada (painéis, diálogos, modos). */
export interface ChromeCtl {
  app: SlidesApp;
  flash(msg: string): void;
  view(): ViewMode;
  setView(v: ViewMode): void;
  thumbsOpen(): boolean;
  toggleThumbs(): void;
  notesOpen(): boolean;
  toggleNotes(): void;
  toolbarMode(): 'compact' | 'ribbon';
  setToolbarMode(m: 'compact' | 'ribbon'): void;
  themeMode(): string | null;
  setThemeMode(m: string | null): void;
  findDialog(replace: boolean): void;
  propertiesDialog(): void;
  showSetupDialog(): void;
  sizeDialog(): void;
  linkDialog(): void;
  shortcutsDialog(): void;
  aboutDialog(): void;
  fontEmbeddingDialog(): void;
  advanceDialog(): void;
  pickImage(): void;
  clipboard(kind: 'cut' | 'copy' | 'paste'): void;
  present(from: number | 'start'): void;
  animationPane(): void;
  animationPaneOpen(): boolean;
}

export const L = (en: string, pt: string, es: string): { en: string; pt: string; es: string } => ({ en, pt, es });

/** Rótulos das transições (os do app em cada idioma). */
export const TRANSITION_LABELS: Record<string, { en: string; pt: string; es: string }> = {
  none: L('None', 'Nenhuma', 'Ninguno'), fade: L('Fade', 'Esmaecer', 'Desvanecer'), push: L('Push', 'Empurrar', 'Empujar'), wipe: L('Wipe', 'Revelar', 'Barrido'),
  split: L('Split', 'Dividir', 'División'), cover: L('Cover', 'Cobrir', 'Cubrir'), pull: L('Uncover', 'Descobrir', 'Descubrir'), randomBar: L('Random Bars', 'Barras Aleatórias', 'Barras aleatorias'),
  circle: L('Circle', 'Círculo', 'Círculo'), diamond: L('Diamond', 'Losango', 'Rombo'), plus: L('Plus', 'Mais', 'Más'), wedge: L('Wedge', 'Cunha', 'Cuña'),
  wheel: L('Wheel', 'Roda', 'Rueda'), zoom: L('Zoom', 'Zoom', 'Zoom'), dissolve: L('Dissolve', 'Dissolver', 'Disolver'), newsflash: L('Newsflash', 'Notícias', 'Noticias'),
  blinds: L('Blinds', 'Persianas', 'Persianas'), checker: L('Checkerboard', 'Quadriculado', 'Cuadros bicolores'), strips: L('Strips', 'Faixas', 'Franjas'), comb: L('Comb', 'Pente', 'Peine'),
  cut: L('Cut', 'Cortar', 'Cortar'),
};

/** Formas da galeria Inserir › Formas (rótulos do app). */
export const SHAPE_LABELS: Record<string, { en: string; pt: string; es: string }> = {
  rect: L('Rectangle', 'Retângulo', 'Rectángulo'), roundRect: L('Rounded Rectangle', 'Retângulo de Cantos Arredondados', 'Rectángulo: esquinas redondeadas'), ellipse: L('Oval', 'Elipse', 'Elipse'),
  triangle: L('Isosceles Triangle', 'Triângulo Isósceles', 'Triángulo isósceles'), rtTriangle: L('Right Triangle', 'Triângulo Retângulo', 'Triángulo rectángulo'), diamond: L('Diamond', 'Losango', 'Rombo'),
  pentagon: L('Regular Pentagon', 'Pentágono Regular', 'Pentágono regular'), hexagon: L('Hexagon', 'Hexágono', 'Hexágono'), parallelogram: L('Parallelogram', 'Paralelogramo', 'Paralelogramo'),
  trapezoid: L('Trapezoid', 'Trapezoide', 'Trapecio'), rightArrow: L('Right Arrow', 'Seta para a Direita', 'Flecha: a la derecha'), leftArrow: L('Left Arrow', 'Seta para a Esquerda', 'Flecha: a la izquierda'),
  upArrow: L('Up Arrow', 'Seta para Cima', 'Flecha: arriba'), downArrow: L('Down Arrow', 'Seta para Baixo', 'Flecha: abajo'), leftRightArrow: L('Left-Right Arrow', 'Seta Dupla', 'Flecha: izquierda y derecha'),
  chevron: L('Chevron', 'Divisa', 'Flecha: cheurón'), homePlate: L('Pentagon Arrow', 'Seta: Pentágono', 'Flecha: pentágono'), star5: L('5-Point Star', 'Estrela de 5 Pontas', 'Estrella: 5 puntas'),
  star6: L('6-Point Star', 'Estrela de 6 Pontas', 'Estrella: 6 puntas'), heart: L('Heart', 'Coração', 'Corazón'), cloud: L('Cloud', 'Nuvem', 'Nube'), lightningBolt: L('Lightning Bolt', 'Raio', 'Rayo'),
  wedgeRectCallout: L('Speech Bubble: Rectangle', 'Balão de Fala: Retângulo', 'Bocadillo: rectángulo'), wedgeEllipseCallout: L('Speech Bubble: Oval', 'Balão de Fala: Oval', 'Bocadillo: ovalado'),
  plus: L('Cross', 'Cruz', 'Cruz'), donut: L('Circle: Hollow', 'Círculo: Vazado', 'Círculo: vacío'), smileyFace: L('Smiley Face', 'Rosto Feliz', 'Cara sonriente'), line: L('Line', 'Linha', 'Línea'),
};

export const ZOOMS = [25, 33, 50, 66, 75, 100, 125, 150, 200, 300];

export function registerSlidesCommands(reg: CommandRegistry, el: UniversalSlidesElement, ctl: ChromeCtl): void {
  const has = (m: string) => (): boolean => typeof (el as unknown as Record<string, unknown>)[m] === 'function';
  const deck = (): boolean => el.getSlideCount() > 0;
  const shape = (): boolean => el.getShapeInfo() !== null;
  const text = (): boolean => el.getTextFormat() !== null;
  const movable = (): boolean => !!el.getShapeInfo()?.movable;
  const notPlaying = (): boolean => !el.isPresenting() && !el.isPlaying();
  const fmt = (k: 'bold' | 'italic' | 'underline' | 'strike') => (): boolean => !!el.getTextFormat()?.[k];
  const tr = (): TransitionSpec | null => el.getSlideTransition();
  const setTr = (patch: Partial<TransitionSpec>): void => {
    const cur = tr() ?? { type: 'none' };
    el.setSlideTransition({ ...cur, ...patch });
  };

  const cmds: Command[] = [
    // ── Arquivo ──
    { id: 'new', label: L('New presentation', 'Nova apresentação', 'Nueva presentación'), icon: 'note_add', supports: has('newPresentation'), run: () => ctl.app.newPresentation() },
    { id: 'open', label: L('Open…', 'Abrir…', 'Abrir…'), icon: 'folder_open', shortcut: 'Ctrl+O', run: () => ctl.app.open() },
    { id: 'save', label: L('Save', 'Salvar', 'Guardar'), icon: 'save', shortcut: 'Ctrl+S', isEnabled: deck, run: () => ctl.app.save(false) },
    { id: 'saveAs', label: L('Save as…', 'Salvar como…', 'Guardar como…'), icon: 'save_as', shortcut: 'Ctrl+Shift+S', isEnabled: deck, run: () => ctl.app.save(true) },
    { id: 'export:pdf', label: L('PDF document (.pdf)', 'Documento PDF (.pdf)', 'Documento PDF (.pdf)'), icon: 'picture_as_pdf', isEnabled: deck, run: () => ctl.app.export('pdf') },
    { id: 'export:html', label: L('Web page (.html)', 'Página da Web (.html)', 'Página web (.html)'), icon: 'html', isEnabled: deck, run: () => ctl.app.export('html') },
    { id: 'export:md', label: L('Markdown (.md)', 'Markdown (.md)', 'Markdown (.md)'), icon: 'markdown', isEnabled: deck, run: () => ctl.app.export('md') },
    { id: 'export:png', label: L('Current slide as image (.png)', 'Slide atual como imagem (.png)', 'Diapositiva actual como imagen (.png)'), icon: 'image', isEnabled: deck, run: () => ctl.app.export('png') },
    { id: 'fontsInFile', label: L('Fonts in file…', 'Fontes no arquivo…', 'Fuentes en el archivo…'), icon: 'font_download', supports: has('setFontEmbedding'), isEnabled: deck, run: () => ctl.fontEmbeddingDialog() },
    { id: 'print', label: L('Print', 'Imprimir', 'Imprimir'), icon: 'print', shortcut: 'Ctrl+P', isEnabled: deck, run: () => ctl.app.print() },
    { id: 'properties', label: L('Properties…', 'Propriedades…', 'Propiedades…'), icon: 'info', supports: has('getProperties'), isEnabled: deck, run: () => ctl.propertiesDialog() },

    // ── Editar ──
    { id: 'undo', label: L('Undo', 'Desfazer', 'Deshacer'), icon: 'undo', shortcut: 'Ctrl+Z', supports: has('undo'), isEnabled: () => el.canUndo(), run: () => el.undo() },
    { id: 'redo', label: L('Redo', 'Refazer', 'Rehacer'), icon: 'redo', shortcut: 'Ctrl+Y', supports: has('redo'), isEnabled: () => el.canRedo(), run: () => el.redo() },
    { id: 'cut', label: L('Cut', 'Recortar', 'Cortar'), icon: 'content_cut', shortcut: 'Ctrl+X', isEnabled: shape, run: () => ctl.clipboard('cut') },
    { id: 'copy', label: L('Copy', 'Copiar', 'Copiar'), icon: 'content_copy', shortcut: 'Ctrl+C', isEnabled: shape, run: () => ctl.clipboard('copy') },
    { id: 'paste', label: L('Paste', 'Colar', 'Pegar'), icon: 'content_paste', shortcut: 'Ctrl+V', isEnabled: deck, run: () => ctl.clipboard('paste') },
    { id: 'delete', label: L('Delete', 'Excluir', 'Eliminar'), icon: 'delete', shortcut: 'Del', supports: has('deleteShape'), isEnabled: shape, run: () => el.deleteShape() },
    { id: 'find', label: L('Find…', 'Localizar…', 'Buscar…'), icon: 'search', shortcut: 'Ctrl+F', supports: has('findText'), isEnabled: deck, run: () => ctl.findDialog(false) },
    { id: 'replace', label: L('Replace…', 'Substituir…', 'Reemplazar…'), icon: 'find_replace', shortcut: 'Ctrl+H', supports: has('replaceText'), isEnabled: deck, run: () => ctl.findDialog(true) },

    // ── Exibir ──
    { id: 'view:normal', label: L('Normal', 'Normal', 'Normal'), icon: 'view_sidebar', isChecked: () => ctl.view() === 'normal', run: () => ctl.setView('normal') },
    { id: 'view:sorter', label: L('Slide Sorter', 'Classificação de Slides', 'Clasificador de diapositivas'), icon: 'grid_view', isEnabled: deck, isChecked: () => ctl.view() === 'sorter', run: () => ctl.setView(ctl.view() === 'sorter' ? 'normal' : 'sorter') },
    { id: 'view:reading', label: L('Reading View', 'Modo de Exibição de Leitura', 'Vista de lectura'), icon: ic('chrome_reader_mode'), isEnabled: deck, isChecked: () => ctl.view() === 'reading', run: () => ctl.setView(ctl.view() === 'reading' ? 'normal' : 'reading') },
    { id: 'view:thumbnails', label: L('Thumbnails', 'Miniaturas', 'Miniaturas'), icon: ic('view_carousel'), isChecked: () => ctl.thumbsOpen(), run: () => ctl.toggleThumbs() },
    { id: 'view:notes', label: L('Notes', 'Anotações', 'Notas'), icon: ic('speaker_notes'), isChecked: () => ctl.notesOpen(), run: () => ctl.toggleNotes() },
    { id: 'statusbar', label: L('Status bar', 'Barra de status', 'Barra de estado'), icon: 'web_asset', isChecked: () => el.hasAttribute('bottombar'), run: () => el.toggleAttribute('bottombar') },
    { id: 'zoomin', label: L('Zoom in', 'Ampliar', 'Acercar'), icon: 'zoom_in', shortcut: 'Ctrl+=', supports: has('setZoom'), isEnabled: () => deck() && notPlaying(), run: () => el.setZoom(nextZoom(el.getZoom(), 1)) },
    { id: 'zoomout', label: L('Zoom out', 'Reduzir', 'Alejar'), icon: 'zoom_out', shortcut: 'Ctrl+-', supports: has('setZoom'), isEnabled: () => deck() && notPlaying(), run: () => el.setZoom(nextZoom(el.getZoom(), -1)) },
    { id: 'zoomfit', label: L('Fit to window', 'Ajustar à janela', 'Ajustar a la ventana'), icon: 'fit_screen', supports: has('setZoom'), isChecked: () => el.isZoomFit(), run: () => el.setZoom('fit') },
    { id: 'zoom100', label: L('100%', '100%', '100%'), icon: ic('zoom_out_map'), supports: has('setZoom'), run: () => el.setZoom(1) },
    { id: 'toolbar:compact', label: L('Compact', 'Compacta', 'Compacta'), isChecked: () => ctl.toolbarMode() === 'compact', run: () => ctl.setToolbarMode('compact') },
    { id: 'toolbar:ribbon', label: L('Ribbon', 'Faixa de opções', 'Cinta de opciones'), isChecked: () => ctl.toolbarMode() === 'ribbon', run: () => ctl.setToolbarMode('ribbon') },

    // ── Slides ──
    { id: 'slide:new', label: L('New slide', 'Novo slide', 'Nueva diapositiva'), icon: ic('add_to_photos'), shortcut: 'Ctrl+M', supports: has('addSlide'), isEnabled: notPlaying, run: () => el.addSlide() },
    { id: 'slide:duplicate', label: L('Duplicate slide', 'Duplicar slide', 'Duplicar diapositiva'), icon: ic('library_add'), supports: has('duplicateSlide'), isEnabled: () => deck() && notPlaying(), run: () => el.duplicateSlide() },
    { id: 'slide:delete', label: L('Delete slide', 'Excluir slide', 'Eliminar diapositiva'), icon: 'delete', supports: has('deleteSlide'), isEnabled: () => deck() && notPlaying(), run: () => el.deleteSlide() },
    { id: 'slide:hide', label: L('Hide slide', 'Ocultar slide', 'Ocultar diapositiva'), icon: 'visibility_off', supports: has('setSlideHidden'), isEnabled: deck, isChecked: () => el.isSlideHidden(), run: () => el.setSlideHidden(!el.isSlideHidden()) },
    { id: 'slide:up', label: L('Move slide up', 'Mover slide para cima', 'Subir diapositiva'), icon: ic('arrow_upward'), supports: has('moveSlide'), isEnabled: () => el.getSlideIndex() > 0, run: () => el.moveSlide(el.getSlideIndex(), el.getSlideIndex() - 1) },
    { id: 'slide:down', label: L('Move slide down', 'Mover slide para baixo', 'Bajar diapositiva'), icon: ic('arrow_downward'), supports: has('moveSlide'), isEnabled: () => el.getSlideIndex() < el.getSlideCount() - 1, run: () => el.moveSlide(el.getSlideIndex(), el.getSlideIndex() + 1) },
    { id: 'slide:resetBackground', label: L('Reset background', 'Redefinir plano de fundo', 'Restablecer fondo'), icon: 'format_color_reset', supports: has('setSlideBackground'), isEnabled: deck, run: () => el.setSlideBackground(null) },

    // ── Inserir ──
    { id: 'textbox', label: L('Text box', 'Caixa de texto', 'Cuadro de texto'), icon: 'text_fields', supports: has('insertTextBox'), isEnabled: notPlaying, run: () => { el.insertTextBox(); } },
    { id: 'image', label: L('Image…', 'Imagem…', 'Imagen…'), icon: ic('add_photo_alternate'), supports: has('insertImage'), isEnabled: notPlaying, run: () => ctl.pickImage() },
    { id: 'link', label: L('Link…', 'Link…', 'Vínculo…'), icon: 'link', shortcut: 'Ctrl+K', supports: has('setLink'), isEnabled: text, run: () => ctl.linkDialog() },

    // ── Formatar (texto da forma) ──
    { id: 'bold', label: L('Bold', 'Negrito', 'Negrita'), icon: 'format_bold', shortcut: 'Ctrl+B', supports: has('toggleTextFormat'), isEnabled: text, isChecked: fmt('bold'), run: () => el.toggleTextFormat('bold') },
    { id: 'italic', label: L('Italic', 'Itálico', 'Cursiva'), icon: 'format_italic', shortcut: 'Ctrl+I', supports: has('toggleTextFormat'), isEnabled: text, isChecked: fmt('italic'), run: () => el.toggleTextFormat('italic') },
    { id: 'underline', label: L('Underline', 'Sublinhado', 'Subrayado'), icon: 'format_underlined', shortcut: 'Ctrl+U', supports: has('toggleTextFormat'), isEnabled: text, isChecked: fmt('underline'), run: () => el.toggleTextFormat('underline') },
    { id: 'strike', label: L('Strikethrough', 'Tachado', 'Tachado'), icon: 'format_strikethrough', supports: has('toggleTextFormat'), isEnabled: text, isChecked: fmt('strike'), run: () => el.toggleTextFormat('strike') },
    { id: 'grow', label: L('Increase font size', 'Aumentar tamanho da fonte', 'Aumentar tamaño de fuente'), icon: 'text_increase', shortcut: 'Ctrl+]', supports: has('growFont'), isEnabled: text, run: () => el.growFont(1) },
    { id: 'shrink', label: L('Decrease font size', 'Diminuir tamanho da fonte', 'Disminuir tamaño de fuente'), icon: 'text_decrease', shortcut: 'Ctrl+[', supports: has('growFont'), isEnabled: text, run: () => el.growFont(-1) },
    { id: 'align:left', label: L('Align left', 'Alinhar à esquerda', 'Alinear a la izquierda'), icon: 'format_align_left', shortcut: 'Ctrl+L', supports: has('alignText'), isEnabled: text, isChecked: () => el.getTextFormat()?.align === 'l', run: () => el.alignText('l') },
    { id: 'align:center', label: L('Center', 'Centralizar', 'Centrar'), icon: 'format_align_center', shortcut: 'Ctrl+E', supports: has('alignText'), isEnabled: text, isChecked: () => el.getTextFormat()?.align === 'ctr', run: () => el.alignText('ctr') },
    { id: 'align:right', label: L('Align right', 'Alinhar à direita', 'Alinear a la derecha'), icon: 'format_align_right', shortcut: 'Ctrl+R', supports: has('alignText'), isEnabled: text, isChecked: () => el.getTextFormat()?.align === 'r', run: () => el.alignText('r') },
    { id: 'align:justify', label: L('Justify', 'Justificar', 'Justificar'), icon: 'format_align_justify', shortcut: 'Ctrl+J', supports: has('alignText'), isEnabled: text, isChecked: () => el.getTextFormat()?.align === 'just', run: () => el.alignText('just') },
    { id: 'list:bullet', label: L('Bullets', 'Marcadores', 'Viñetas'), icon: 'format_list_bulleted', supports: has('setBullets'), isEnabled: text, isChecked: () => el.getTextFormat()?.bullet === 'bullet', run: () => el.setBullets(el.getTextFormat()?.bullet === 'bullet' ? 'none' : 'bullet') },
    { id: 'list:number', label: L('Numbering', 'Numeração', 'Numeración'), icon: 'format_list_numbered', supports: has('setBullets'), isEnabled: text, isChecked: () => el.getTextFormat()?.bullet === 'number', run: () => el.setBullets(el.getTextFormat()?.bullet === 'number' ? 'none' : 'number') },
    { id: 'clear', label: L('Clear formatting', 'Limpar formatação', 'Borrar formato'), icon: 'format_clear', shortcut: 'Ctrl+Space', supports: has('clearFormatting'), isEnabled: text, run: () => el.clearFormatting() },
    { id: 'shape:noFill', label: L('No fill', 'Sem preenchimento', 'Sin relleno'), icon: 'format_color_reset', supports: has('setShapeFill'), isEnabled: shape, run: () => el.setShapeFill(null) },
    { id: 'shape:noOutline', label: L('No outline', 'Sem contorno', 'Sin contorno'), icon: 'border_clear', supports: has('setShapeOutline'), isEnabled: shape, run: () => el.setShapeOutline(null) },
    { id: 'arrange:front', label: L('Bring to front', 'Trazer para a frente', 'Traer al frente'), icon: 'flip_to_front', supports: has('arrangeShape'), isEnabled: movable, run: () => el.arrangeShape('front') },
    { id: 'arrange:forward', label: L('Bring forward', 'Avançar', 'Traer adelante'), icon: ic('keyboard_double_arrow_up'), supports: has('arrangeShape'), isEnabled: movable, run: () => el.arrangeShape('forward') },
    { id: 'arrange:backward', label: L('Send backward', 'Recuar', 'Enviar atrás'), icon: ic('keyboard_double_arrow_down'), supports: has('arrangeShape'), isEnabled: movable, run: () => el.arrangeShape('backward') },
    { id: 'arrange:back', label: L('Send to back', 'Enviar para trás', 'Enviar al fondo'), icon: 'flip_to_back', supports: has('arrangeShape'), isEnabled: movable, run: () => el.arrangeShape('back') },
    { id: 'shape:size', label: L('Size and position…', 'Tamanho e posição…', 'Tamaño y posición…'), icon: 'aspect_ratio', supports: has('setShapeFrame'), isEnabled: movable, run: () => ctl.sizeDialog() },

    // ── Apresentação de Slides ──
    { id: 'show:start', label: L('From beginning', 'Do começo', 'Desde el principio'), icon: ic('slideshow'), shortcut: 'F5', isEnabled: deck, run: () => ctl.present('start') },
    { id: 'show:current', label: L('From current slide', 'Do slide atual', 'Desde la diapositiva actual'), icon: ic('present_to_all'), shortcut: 'Shift+F5', isEnabled: deck, run: () => ctl.present(el.getSlideIndex()) },
    { id: 'show:auto', label: L('Play automatically (use timings)', 'Reproduzir automaticamente (usar intervalos)', 'Reproducir automáticamente (usar intervalos)'), icon: ic('play_arrow'), isEnabled: deck, isChecked: () => el.isPlaying(), run: () => (el.isPlaying() ? el.stopPlayback() : void el.play({ from: el.getSlideIndex() })) },
    { id: 'show:setup', label: L('Set up slide show…', 'Configurar apresentação…', 'Configurar presentación con diapositivas…'), icon: 'settings', supports: has('setShowSettings'), isEnabled: deck, run: () => ctl.showSetupDialog() },

    // ── Transições ──
    { id: 'transition:preview', label: L('Preview transition', 'Visualizar transição', 'Vista previa de la transición'), icon: ic('preview'), supports: has('previewSlide'), isEnabled: () => deck() && notPlaying(), run: () => el.previewSlide('transition') },
    { id: 'transition:applyAll', label: L('Apply to all slides', 'Aplicar a todos os slides', 'Aplicar a todas las diapositivas'), icon: 'done_all', supports: has('setSlideTransition'), isEnabled: deck, run: () => el.setSlideTransition(tr(), 'all') },
    { id: 'transition:onClick', label: L('On mouse click', 'Ao clicar com o mouse', 'Al hacer clic con el mouse'), icon: 'check', supports: has('setSlideTransition'), isEnabled: deck, isChecked: () => tr()?.advanceOnClick !== false, run: () => setTr({ advanceOnClick: tr()?.advanceOnClick === false }) },
    { id: 'transition:after', label: L('After…', 'Após…', 'Después de…'), icon: ic('timer'), supports: has('setSlideTransition'), isEnabled: deck, isChecked: () => tr()?.advanceAfterMs !== undefined, run: () => ctl.advanceDialog() },
    ...TRANSITION_TYPES.map((t): Command => ({
      id: `transition:${t}`, label: TRANSITION_LABELS[t]!, icon: t === 'none' ? ic('block') : ic('transition_fade'),
      supports: has('setSlideTransition'), isEnabled: deck,
      isChecked: () => (tr()?.type ?? 'none') === t,
      run: () => (t === 'none' ? (tr()?.advanceAfterMs !== undefined || tr()?.advanceOnClick === false ? setTr({ type: 'none' }) : el.setSlideTransition(null)) : setTr({ type: t, dir: defaultDir(t) })),
    })),

    // ── Animações (só visualizar: o editor não cria nem edita animações) ──
    { id: 'animation:preview', label: L('Preview animations', 'Visualizar animações', 'Vista previa de las animaciones'), icon: ic('animation'), supports: has('previewSlide'), isEnabled: () => deck() && notPlaying() && hasAnimations(el), run: () => el.previewSlide('animations') },
    { id: 'animation:pane', label: L('Animation pane', 'Painel de animação', 'Panel de animación'), icon: ic('auto_awesome_motion'), isEnabled: deck, isChecked: () => ctl.animationPaneOpen(), run: () => ctl.animationPane() },

    // ── Ajuda ──
    { id: 'shortcuts', label: L('Keyboard shortcuts', 'Atalhos do teclado', 'Métodos abreviados de teclado'), icon: 'keyboard', run: () => ctl.shortcutsDialog() },
    { id: 'about', label: L('About Universal Slides', 'Sobre o Universal Slides', 'Acerca de Universal Slides'), icon: 'info', run: () => ctl.aboutDialog() },
  ];
  reg.add(...cmds);
}

/** Próximo degrau de zoom (como os botões da barra de status do app). */
export function nextZoom(z: number, dir: 1 | -1): number {
  const pct = Math.round(z * 100);
  const steps = ZOOMS;
  const n = dir > 0 ? steps.find((s) => s > pct + 0.5) ?? Math.min(400, pct + 50) : [...steps].reverse().find((s) => s < pct - 0.5) ?? Math.max(10, pct - 10);
  return n / 100;
}

/** Direção padrão de cada transição (a do app ao escolher na galeria). */
export function defaultDir(t: string): string | undefined {
  return t === 'push' || t === 'cover' ? 'u' : t === 'wipe' || t === 'pull' ? 'l' : t === 'split' ? 'out' : undefined;
}

/** O slide atual tem animações (passos da sequência principal)? */
export function hasAnimations(el: UniversalSlidesElement): boolean {
  return !!el.getSlideAnimations().length;
}

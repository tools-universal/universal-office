// Layouts das duas barras do Slides: COMPACTA (Google Slides — título acima
// dos menus, linha de ferramentas que recolhe por prioridade) e RIBBON
// (PowerPoint — guias, grupos e a guia contextual Formato da Forma). Só
// referenciam comandos e controles (chrome-commands.ts, chrome-widgets.ts).
import type { BarContext, BarItem, CompactConfig, MenuEntry, MenuItem, RibbonConfig } from '@universal-office/ui';
import { L, ic } from './chrome-commands.js';
import {
  advanceWidget, backgroundMenu, directionMenu, fillMenu, fontColorMenu, fontWidget, layoutMenu, leadingWidget, outlineMenu,
  shapesMenu, sizeWidget, slideshowWidget, speedMenu, themeMenu, titleWidget, transitionGallery, transitionMenu, zoomItem, zoomMenu,
  type WidgetEnv,
} from './chrome-widgets.js';

/** Submenus compartilhados pelas duas barras. */
function menus(env: WidgetEnv, ctx: BarContext) {
  const sub = (label: { en: string; pt: string }, icon: string | undefined, items: () => MenuEntry[], id: string): MenuItem =>
    ({ id, label, icon, submenu: items });
  return {
    download: sub(L('Download', 'Baixar'), 'download', () => ['export:pdf', 'export:html', 'export:md', 'export:png'], 'download'),
    zoom: sub(L('Zoom', 'Zoom'), 'zoom_in', () => zoomMenu(env), 'zoomMenu'),
    theme: sub(L('Theme', 'Tema'), 'contrast', () => themeMenu(env, ctx), 'theme'),
    toolbar: sub(L('Toolbar', 'Barra de ferramentas'), 'toolbar', () => ['toolbar:compact', 'toolbar:ribbon', '-', 'statusbar'], 'toolbar'),
    newLayout: sub(L('New slide with layout', 'Novo slide com layout'), ic('add_to_photos'), () => layoutMenu(env, ctx, 'new'), 'slide:newLayout'),
    layout: sub(L('Layout', 'Layout'), ic('dashboard'), () => layoutMenu(env, ctx, 'change'), 'layout'),
    background: sub(L('Background', 'Plano de fundo'), ic('wallpaper'), () => backgroundMenu(env, ctx), 'background'),
    transition: sub(L('Transition', 'Transição'), ic('transition_fade'), () => transitionMenu(env, ctx), 'transition'),
    shapes: sub(L('Shapes', 'Formas'), 'shapes', () => shapesMenu(env, ctx), 'shapes'),
    text: sub(L('Text', 'Texto'), 'format_bold', () => ['bold', 'italic', 'underline', 'strike', '-', 'grow', 'shrink'], 'text'),
    color: sub(L('Font color', 'Cor da fonte'), 'format_color_text', () => fontColorMenu(env, ctx), 'color'),
    align: sub(L('Align', 'Alinhar'), 'format_align_left', () => ['align:left', 'align:center', 'align:right', 'align:justify'], 'align'),
    fill: sub(L('Shape fill', 'Preenchimento da forma'), 'format_color_fill', () => fillMenu(env, ctx), 'fill'),
    outline: sub(L('Shape outline', 'Contorno da forma'), 'border_color', () => outlineMenu(env, ctx), 'outline'),
    arrange: sub(L('Arrange', 'Organizar'), 'flip_to_front', () => ['arrange:front', 'arrange:forward', 'arrange:backward', 'arrange:back'], 'arrange'),
  };
}

const fileMenu = (m: ReturnType<typeof menus>): MenuEntry[] => [
  'new', 'open', '-', 'save', 'saveAs', m.download, 'fontsInFile', '-', 'print', '-', 'properties',
];

const shapeSelected = (env: WidgetEnv) => (): boolean => env.el.getShapeInfo() !== null;

export function compactLayout(env: WidgetEnv, ctx: BarContext): CompactConfig {
  const m = menus(env, ctx);
  return {
    leading: leadingWidget(),
    title: titleWidget(env),
    trailing: [slideshowWidget(env)],
    menus: [
      { id: 'file', label: L('File', 'Arquivo'), items: () => fileMenu(m) },
      { id: 'edit', label: L('Edit', 'Editar'), items: ['undo', 'redo', '-', 'cut', 'copy', 'paste', 'delete', '-', 'find', 'replace'] },
      { id: 'view', label: L('View', 'Exibir'), items: () => ['view:normal', 'view:sorter', 'view:reading', '-', 'view:thumbnails', 'view:notes', 'statusbar', '-', m.zoom, '-', m.theme, m.toolbar] },
      { id: 'insert', label: L('Insert', 'Inserir'), items: () => ['slide:new', m.newLayout, 'slide:duplicate', '-', 'textbox', 'image', m.shapes, '-', 'link'] },
      { id: 'format', label: L('Format', 'Formatar'), items: () => [m.text, m.color, m.align, 'list:bullet', 'list:number', 'clear', '-', m.fill, m.outline, m.arrange, 'shape:size'] },
      { id: 'slide', label: L('Slide', 'Slide'), items: () => ['slide:new', 'slide:duplicate', 'slide:delete', 'slide:hide', '-', 'slide:up', 'slide:down', '-', m.layout, m.background, m.transition] },
      { id: 'slideshow', label: L('Slide Show', 'Apresentação'), items: ['show:start', 'show:current', 'show:auto', '-', 'show:setup', 'slide:hide', '-', 'animation:preview', 'animation:pane'] },
      { id: 'help', label: L('Help', 'Ajuda'), items: ['shortcuts', 'about'] },
    ],
    groups: [
      { id: 'tools', label: L('Tools', 'Ferramentas'), icon: 'undo', prio: 4, items: ['undo', 'redo', 'print', zoomItem(env)] },
      { id: 'slides', label: L('Slides', 'Slides'), icon: ic('add_to_photos'), prio: 6, items: [
        { split: 'slide:new', menu: () => layoutMenu(env, ctx, 'new') },
        { menu: () => layoutMenu(env, ctx, 'change'), id: 'layout:menu', label: L('Layout', 'Layout'), icon: ic('dashboard'), isEnabled: () => env.el.getSlideCount() > 0 },
      ] },
      { id: 'insert', label: L('Insert', 'Inserir'), icon: 'text_fields', prio: 5, items: [
        'textbox', 'image', { menu: () => shapesMenu(env, ctx), id: 'shapes:menu', label: L('Shapes', 'Formas'), icon: 'shapes' }, 'link',
      ] },
      { id: 'font', label: L('Font', 'Fonte'), icon: 'font_download', prio: 8, items: [fontWidget(env)] },
      { id: 'size', label: L('Font size', 'Tamanho da fonte'), icon: 'format_size', prio: 7, items: [sizeWidget(env, 'steppers')] },
      { id: 'format', label: L('Formatting', 'Formatação'), icon: 'format_bold', prio: 9, items: [
        'bold', 'italic', 'underline',
        { menu: () => fontColorMenu(env, ctx), id: 'color:menu', label: L('Font color', 'Cor da fonte'), icon: 'format_color_text', isEnabled: () => env.el.getTextFormat() !== null },
      ] },
      { id: 'para', label: L('Paragraph', 'Parágrafo'), icon: 'format_align_left', prio: 6, items: [
        'align:left', 'align:center', 'align:right', 'align:justify', 'list:bullet', 'list:number', 'clear',
      ] },
      { id: 'shape', label: L('Shape', 'Forma'), icon: 'format_shapes', prio: 3, items: [
        { menu: () => fillMenu(env, ctx), id: 'fill:menu', label: L('Shape fill', 'Preenchimento da forma'), icon: 'format_color_fill', isEnabled: shapeSelected(env) },
        { menu: () => outlineMenu(env, ctx), id: 'outline:menu', label: L('Shape outline', 'Contorno da forma'), icon: 'border_color', isEnabled: shapeSelected(env) },
        { menu: () => ['arrange:front', 'arrange:forward', 'arrange:backward', 'arrange:back'], id: 'arrange:menu', label: L('Arrange', 'Organizar'), icon: 'flip_to_front', isEnabled: shapeSelected(env) },
      ] },
      { id: 'motion', label: L('Transitions and animations', 'Transições e animações'), icon: ic('transition_fade'), prio: 2, items: [
        { menu: () => transitionMenu(env, ctx), id: 'transition:menu', label: L('Transition', 'Transição'), icon: ic('transition_fade'), isEnabled: () => env.el.getSlideCount() > 0 },
        'animation:preview',
      ] },
      { id: 'extras', label: L('More tools', 'Mais ferramentas'), icon: 'more_horiz', prio: 0, items: [
        'strike', 'grow', 'shrink', 'slide:hide', 'find', 'view:notes',
      ] },
    ],
  };
}

const large = (cmd: string): BarItem => ({ cmd, size: 'large' });

export function ribbonLayout(env: WidgetEnv, ctx: BarContext): RibbonConfig {
  const m = menus(env, ctx);
  const deck = (): boolean => env.el.getSlideCount() > 0;
  return {
    qat: ['save', 'undo', 'redo', 'show:start'],
    title: titleWidget(env),
    trailing: [slideshowWidget(env)],
    tabs: [
      { id: 'file', label: L('File', 'Arquivo'), groups: [], menu: () => fileMenu(m) },
      {
        id: 'home', label: L('Home', 'Página Inicial'), groups: [
          { id: 'clipboard', label: L('Clipboard', 'Área de Transferência'), icon: 'content_paste', prio: 3, cells: [
            large('paste'), { rows: [[{ cmd: 'cut', label: true }], [{ cmd: 'copy', label: true }], [{ cmd: 'delete', label: true }]] },
          ] },
          { id: 'slides', label: L('Slides', 'Slides'), icon: ic('add_to_photos'), prio: 7, cells: [
            { split: 'slide:new', size: 'large', menu: () => layoutMenu(env, ctx, 'new') },
            { rows: [
              [{ menu: () => layoutMenu(env, ctx, 'change'), id: 'layout:menu', label: L('Layout', 'Layout'), icon: ic('dashboard'), showLabel: true, isEnabled: deck }],
              [{ cmd: 'slide:duplicate', label: true }],
              [{ cmd: 'slide:hide', label: true }],
            ] },
          ] },
          { id: 'font', label: L('Font', 'Fonte'), icon: 'text_format', prio: 8, cells: [
            { rows: [
              [fontWidget(env, 140), sizeWidget(env, 'dropdown'), 'grow', 'shrink', 'clear'],
              ['bold', 'italic', 'underline', 'strike',
                { menu: () => fontColorMenu(env, ctx), id: 'color:menu', label: L('Font color', 'Cor da fonte'), icon: 'format_color_text', isEnabled: () => env.el.getTextFormat() !== null }],
            ] },
          ] },
          { id: 'paragraph', label: L('Paragraph', 'Parágrafo'), icon: 'format_align_left', prio: 7, cells: [
            { rows: [['list:bullet', 'list:number'], ['align:left', 'align:center', 'align:right', 'align:justify']] },
          ] },
          { id: 'drawing', label: L('Drawing', 'Desenho'), icon: 'shapes', prio: 5, cells: [
            { menu: () => shapesMenu(env, ctx), id: 'shapes:menu', label: L('Shapes', 'Formas'), icon: 'shapes', size: 'large' },
            { menu: () => ['arrange:front', 'arrange:forward', 'arrange:backward', 'arrange:back'], id: 'arrange:menu', label: L('Arrange', 'Organizar'), icon: 'flip_to_front', size: 'large', isEnabled: shapeSelected(env) },
            { rows: [
              [{ menu: () => fillMenu(env, ctx), id: 'fill:menu', label: L('Shape Fill', 'Preenchimento da Forma'), icon: 'format_color_fill', showLabel: true, isEnabled: shapeSelected(env) }],
              [{ menu: () => outlineMenu(env, ctx), id: 'outline:menu', label: L('Shape Outline', 'Contorno da Forma'), icon: 'border_color', showLabel: true, isEnabled: shapeSelected(env) }],
            ] },
          ] },
          { id: 'editing', label: L('Editing', 'Edição'), icon: 'search', prio: 4, cells: [
            { rows: [[{ cmd: 'find', label: true }], [{ cmd: 'replace', label: true }]] },
          ] },
        ],
      },
      {
        id: 'insert', label: L('Insert', 'Inserir'), groups: [
          { id: 'slides', label: L('Slides', 'Slides'), icon: ic('add_to_photos'), prio: 6, cells: [
            { split: 'slide:new', size: 'large', menu: () => layoutMenu(env, ctx, 'new') }, large('slide:duplicate'),
          ] },
          { id: 'images', label: L('Images', 'Imagens'), icon: 'image', prio: 6, cells: [large('image')] },
          { id: 'illustrations', label: L('Illustrations', 'Ilustrações'), icon: 'shapes', prio: 5, cells: [
            { menu: () => shapesMenu(env, ctx), id: 'shapes:menu', label: L('Shapes', 'Formas'), icon: 'shapes', size: 'large' },
          ] },
          { id: 'links', label: L('Links', 'Links'), icon: 'link', prio: 4, cells: [large('link')] },
          { id: 'text', label: L('Text', 'Texto'), icon: 'text_fields', prio: 5, cells: [large('textbox')] },
        ],
      },
      {
        id: 'design', label: L('Design', 'Design'), groups: [
          { id: 'customize', label: L('Customize', 'Personalizar'), icon: ic('wallpaper'), prio: 4, cells: [
            { menu: () => backgroundMenu(env, ctx), id: 'background:menu', label: L('Format Background', 'Formatar Plano de Fundo'), icon: ic('wallpaper'), size: 'large', isEnabled: deck },
            { menu: () => layoutMenu(env, ctx, 'change'), id: 'layout:menu', label: L('Layout', 'Layout'), icon: ic('dashboard'), size: 'large', isEnabled: deck },
          ] },
        ],
      },
      {
        id: 'transitions', label: L('Transitions', 'Transições'), groups: [
          { id: 'preview', label: L('Preview', 'Visualizar'), icon: ic('preview'), prio: 5, cells: [large('transition:preview')] },
          { id: 'gallery', label: L('Transition to This Slide', 'Transição para Este Slide'), icon: ic('transition_fade'), prio: 6, cells: [
            { gallery: transitionGallery(env, ctx) },
            { menu: () => directionMenu(env, ctx), id: 'transition:dirMenu', label: L('Effect Options', 'Opções de Efeito'), icon: 'tune', size: 'large', isEnabled: deck },
          ] },
          { id: 'timing', label: L('Timing', 'Intervalo'), icon: ic('timer'), prio: 4, cells: [
            { rows: [
              [{ menu: () => speedMenu(env, ctx), id: 'transition:speedMenu', label: L('Speed', 'Velocidade'), icon: ic('timer'), showLabel: true, isEnabled: deck }],
              [{ cmd: 'transition:applyAll', label: true }],
            ] },
            { rows: [[{ cmd: 'transition:onClick', label: true }], [advanceWidget(env)]] },
          ] },
        ],
      },
      {
        // o editor visualiza as animações do arquivo; criar/editar animações não existe (ainda)
        id: 'animations', label: L('Animations', 'Animações'), groups: [
          { id: 'preview', label: L('Preview', 'Visualizar'), icon: ic('preview'), prio: 5, cells: [large('animation:preview')] },
          { id: 'advanced', label: L('Advanced Animation', 'Animação Avançada'), icon: ic('auto_awesome_motion'), prio: 4, cells: [large('animation:pane')] },
        ],
      },
      {
        id: 'slideshow', label: L('Slide Show', 'Apresentação de Slides'), groups: [
          { id: 'start', label: L('Start Slide Show', 'Iniciar Apresentação de Slides'), icon: ic('slideshow'), prio: 6, cells: [
            large('show:start'), large('show:current'), large('show:auto'),
          ] },
          { id: 'setup', label: L('Set Up', 'Configurar'), icon: 'settings', prio: 5, cells: [large('show:setup'), large('slide:hide')] },
        ],
      },
      {
        id: 'view', label: L('View', 'Exibir'), groups: [
          { id: 'views', label: L('Presentation Views', 'Modos de Exibição de Apresentação'), icon: 'view_sidebar', prio: 6, cells: [
            large('view:normal'), large('view:sorter'), large('view:reading'),
          ] },
          { id: 'show', label: L('Show', 'Mostrar'), icon: 'visibility', prio: 4, cells: [
            { rows: [[{ cmd: 'view:thumbnails', label: true }], [{ cmd: 'view:notes', label: true }], [{ cmd: 'statusbar', label: true }]] },
          ] },
          { id: 'zoom', label: L('Zoom', 'Zoom'), icon: 'zoom_in', prio: 5, cells: [
            { menu: () => zoomMenu(env), id: 'zoom:menu', label: L('Zoom', 'Zoom'), icon: 'zoom_in', size: 'large' },
            large('zoomfit'),
            { rows: [['zoomin'], ['zoomout'], ['zoom100']] },
          ] },
          { id: 'appearance', label: L('Appearance', 'Aparência'), icon: 'contrast', prio: 2, cells: [
            { menu: () => themeMenu(env, ctx), id: 'theme:menu', label: L('Theme', 'Tema'), icon: 'contrast', size: 'large' },
            { menu: () => ['toolbar:compact', 'toolbar:ribbon'], id: 'toolbarMode', label: L('Toolbar', 'Barra'), icon: 'toolbar', size: 'large' },
          ] },
        ],
      },
      {
        id: 'shape-format', label: L('Shape Format', 'Formato da Forma'), contextual: shapeSelected(env), groups: [
          { id: 'styles', label: L('Shape Styles', 'Estilos de Forma'), icon: 'format_color_fill', prio: 5, cells: [
            { menu: () => fillMenu(env, ctx), id: 'fill:menu', label: L('Shape Fill', 'Preenchimento da Forma'), icon: 'format_color_fill', size: 'large' },
            { menu: () => outlineMenu(env, ctx), id: 'outline:menu', label: L('Shape Outline', 'Contorno da Forma'), icon: 'border_color', size: 'large' },
          ] },
          { id: 'arrange', label: L('Arrange', 'Organizar'), icon: 'flip_to_front', prio: 4, cells: [
            { rows: [[{ cmd: 'arrange:front', label: true }], [{ cmd: 'arrange:back', label: true }]] },
            { rows: [[{ cmd: 'arrange:forward', label: true }], [{ cmd: 'arrange:backward', label: true }]] },
          ] },
          { id: 'size', label: L('Size', 'Tamanho'), icon: 'aspect_ratio', prio: 4, cells: [large('shape:size'), large('delete')] },
        ],
      },
    ],
  };
}

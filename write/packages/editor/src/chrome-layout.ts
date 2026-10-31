// Layouts das duas barras do Write: COMPACTA (Google Docs — menus + linha que
// recolhe por prioridade) e RIBBON (Word — guias, grupos com iniciador de
// diálogo e guias contextuais). Só referenciam comandos e controles; o que
// cada um faz está em chrome-commands.ts / chrome-widgets.ts.
import type { BarContext, BarItem, CompactConfig, MenuEntry, MenuItem, RibbonConfig } from '@universal-office/ui';
import type { WidgetEnv } from './chrome-widgets.js';
import {
  accentMenu, caseMenu, charSpacingMenu, fieldsMenu, fontWidget, highlightMenu, lineSpacingMenu,
  marginsMenu, orientationMenu, paragraphSpacingMenu, saveWidget, shadingMenu, sizeMenu, sizeWidget,
  specialIndentMenu, styleWidget, symbolMenu, themeMenu, titleWidget, zoomItem,
} from './chrome-widgets.js';
import { tableDesignGroups, tableFormatMenu, tableLayoutGroups, tableMenu } from './chrome-table.js';
import { docInfoMenu, hfGalleryMenu, hfToolsGroups, pageNumberMenu } from './chrome-hf.js';
import { pictureCompactGroup, pictureFormatGroups, pictureMenu } from './chrome-picture.js';
import { coverPageMenu, pageColorMenu, watermarkMenu } from './chrome-page.js';
import { addTextMenu, tocGalleryMenu } from './chrome-toc.js';
import { shapeCompactGroup, shapeFormatGroups, shapeMenu, textboxMenu } from './chrome-shape.js';
import { hyphenationMenu, lineNumbersMenu, paragraphLayoutCells } from './chrome-textlayout.js';
import { ZOOMS } from './chrome-commands.js';
import { fontColorMenu, homeBordersMenu, underlineMenu } from './chrome-home.js';
import { listMenu, multilevelMenu } from './chrome-lists.js';
import { pasteMenu } from './chrome-clipboard.js';
import { textEffectsMenu } from './chrome-effects.js';
import { findMenu, selectMenu } from './chrome-find.js';

/** Submenus compartilhados pelas duas barras. */
function menus(env: WidgetEnv, ctx: BarContext) {
  const sub = (label: { en: string; pt: string; es: string }, icon: string | undefined, items: () => MenuEntry[], id?: string): MenuItem =>
    ({ id, label, icon, submenu: items });
  const autosave = (): MenuItem[] => ([[0, 'Off', 'Desligado', 'Desactivado'], [1, '1 min', '1 min', '1 min'], [5, '5 min', '5 min', '5 min'],
    [10, '10 min', '10 min', '10 min'], [30, '30 min', '30 min', '30 min']] as const).map(([n, en, pt, es]) => ({
    id: `autosave:${n}`, label: { en, pt, es }, checked: env.app.autosaveMinutes === n,
    onClick: () => { env.app.autosaveMinutes = n; },
  }));
  const recents = (): MenuItem[] => env.app.recents.map((r) => ({
    id: `recent:${r.name}`, label: r.name, icon: 'description', onClick: () => { void env.app.openRecent(r); },
  }));
  const zoom = (): MenuItem[] => ZOOMS.map((z) => ({
    id: `zoom:${z}`, label: `${z}%`, checked: Math.round(env.ed.getZoom() * 100) === z,
    onClick: () => { env.ed.setZoom(z / 100); ctx.after(); },
  }));
  return {
    exportAs: sub({ en: 'Download', pt: 'Baixar', es: 'Descargar' }, 'download', () => ['export:pdf', 'export:odt', 'export:html', 'export:md', 'export:xps'], 'export'),
    recent: sub({ en: 'Open recent', pt: 'Abrir recente', es: 'Abrir reciente' }, 'history', recents, 'recent'),
    autosave: sub({ en: 'Autosave', pt: 'Salvamento automático', es: 'Autoguardado' }, 'autorenew', autosave, 'autosave'),
    zoomItems: (): MenuEntry[] => [...zoom(), '-', 'zoomin', 'zoomout'],
    zoom: sub({ en: 'Zoom', pt: 'Zoom', es: 'Zoom' }, 'zoom_in', () => [...zoom(), '-', 'zoomin', 'zoomout'], 'zoom'),
    theme: sub({ en: 'Theme', pt: 'Tema', es: 'Tema' }, 'contrast', () => themeMenu(env, ctx), 'theme'),
    accent: sub({ en: 'Accent color', pt: 'Cor de destaque', es: 'Color de énfasis' }, 'palette', () => accentMenu(env, ctx), 'accent'),
    toolbar: sub({ en: 'Toolbar', pt: 'Barra de ferramentas', es: 'Barra de herramientas' }, 'toolbar', () => ['toolbar:compact', 'toolbar:ribbon', '-', 'statusbar'], 'toolbar'),
    fields: sub({ en: 'Field', pt: 'Campo', es: 'Campo' }, 'data_object', fieldsMenu, 'fields'),
    // Sumário: a galeria, Adicionar Texto (com Marcar Entrada) e Atualizar
    toc: sub({ en: 'Table of contents', pt: 'Sumário', es: 'Tabla de contenido' }, 'toc', () => [...tocGalleryMenu(env, ctx), '-',
      sub({ en: 'Add text', pt: 'Adicionar texto', es: 'Agregar texto' }, 'playlist_add', () => addTextMenu(env), 'toc:addText'), 'toc'], 'toc:sub'),
    symbols: sub({ en: 'Special characters', pt: 'Caracteres especiais', es: 'Caracteres especiales' }, 'special_character', () => symbolMenu(env, ctx), 'symbols'),
    breaks: sub({ en: 'Break', pt: 'Quebra', es: 'Salto' }, 'insert_page_break', breaksMenu, 'breaks'),
    columns: sub({ en: 'Columns', pt: 'Colunas', es: 'Columnas' }, 'view_column_2', columnsMenu, 'columns'),
    // Layout do texto: Hifenização e Números de Linha (guia Layout da ribbon)
    hyphenation: { ...sub({ en: 'Hyphenation', pt: 'Hifenização', es: 'Guiones' }, 'horizontal_rule', hyphenationMenu, 'hyphenation'), hidden: typeof (env.ed as unknown as { setHyphenation?: unknown }).setHyphenation !== 'function' },
    lineNumbers: { ...sub({ en: 'Line numbers', pt: 'Números de linha', es: 'Números de línea' }, 'format_list_numbered', lineNumbersMenu, 'lineNumbers'), hidden: typeof (env.ed as unknown as { setLineNumbering?: unknown }).setLineNumbering !== 'function' },
    cover: { ...sub({ en: 'Cover page', pt: 'Folha de rosto', es: 'Portada' }, 'auto_stories', () => coverPageMenu(env, ctx), 'cover:menu'), hidden: typeof (env.ed as unknown as { insertCoverPage?: unknown }).insertCoverPage !== 'function' },
    // Plano de Fundo da Página (guia Design da ribbon)
    background: { ...sub({ en: 'Page background', pt: 'Plano de fundo da página', es: 'Fondo de página' }, 'format_color_fill', () => [
      sub({ en: 'Watermark', pt: 'Marca-d\'água', es: 'Marca de agua' }, 'branding_watermark', () => watermarkMenu(env, ctx), 'watermark:menu'),
      sub({ en: 'Page color', pt: 'Cor da página', es: 'Color de página' }, 'format_color_fill', () => pageColorMenu(env, ctx), 'pageColor:menu'),
      'dlg:pageBorders',
    ], 'background'), hidden: typeof (env.ed as unknown as { setPageColor?: unknown }).setPageColor !== 'function' },
    // Cabeçalho, Rodapé e Número de Página com as galerias de modelos; opções e vínculo no diálogo
    hf: sub({ en: 'Headers & footers', pt: 'Cabeçalhos e rodapés', es: 'Encabezados y pies de página' }, 'call_to_action', () => [
      sub({ en: 'Header', pt: 'Cabeçalho', es: 'Encabezado' }, 'vertical_align_top', () => hfGalleryMenu(env, ctx, 'header'), 'hf:headerMenu'),
      sub({ en: 'Footer', pt: 'Rodapé', es: 'Pie de página' }, 'vertical_align_bottom', () => hfGalleryMenu(env, ctx, 'footer'), 'hf:footerMenu'),
      sub({ en: 'Page number', pt: 'Número de página', es: 'Número de página' }, 'numbers', () => pageNumberMenu(env, ctx), 'hf:pgnumMenu'),
      '-', 'dlg:dateTime', sub({ en: 'Document info', pt: 'Informações do documento', es: 'Información del documento' }, 'info', docInfoMenu, 'hf:docinfo'), 'dlg:alignTab',
      '-', 'dlg:hfOptions', 'hf:link', 'hf:prev', 'hf:next', 'hf:showText', '-', 'hf:close',
    ], 'hf'),
    text: sub({ en: 'Text', pt: 'Texto', es: 'Texto' }, 'format_bold', () => ['bold', 'italic', 'underline', 'strike', 'doubleStrike', 'sup', 'sub', '-', 'grow', 'shrink', '-', 'allCaps', 'smallCaps', 'hidden',
      { id: 'caseSub', label: { en: 'Change case', pt: 'Maiúsculas e minúsculas', es: 'Cambiar mayúsculas y minúsculas' }, icon: 'match_case', submenu: caseMenu }], 'text'),
    color: sub({ en: 'Font color', pt: 'Cor da fonte', es: 'Color de fuente' }, 'format_color_text', () => fontColorMenu(env, ctx), 'color'),
    underline: sub({ en: 'Underline', pt: 'Sublinhado', es: 'Subrayado' }, 'format_underlined', () => underlineMenu(env, ctx), 'underlineMenu'),
    borders: sub({ en: 'Borders', pt: 'Bordas', es: 'Bordes' }, 'border_bottom', homeBordersMenu, 'homeBorders'),
    highlight: sub({ en: 'Highlight color', pt: 'Cor do realce', es: 'Color de resaltado' }, 'format_ink_highlighter', () => highlightMenu(env, ctx), 'highlightMenu'),
    styles: sub({ en: 'Paragraph styles', pt: 'Estilos de parágrafo', es: 'Estilos de párrafo' }, 'style', () => {
      const cur = (env.ctl.state().para.styleId as string | undefined) || 'Normal';
      const ds = env.ed.paragraphStyles();
      return (ds.length ? ds : [{ id: 'Normal', name: 'Normal' }]).map((s): MenuItem => ({
        id: `style:${s.id}`, label: s.name, checked: s.id === cur,
        onClick: () => { env.ed.applyStyle(s.id === 'Normal' ? undefined : s.id); ctx.after(); },
      }));
    }, 'styles'),
    styleTools: sub({ en: 'Styles', pt: 'Estilos', es: 'Estilos' }, 'view_sidebar', () => ['styles:pane', 'style:inspector', '-', 'style:new', 'style:modifyCurrent', 'style:updateCurrent', '-', 'style:normal', 'style:h1', 'style:h2', 'style:h3'], 'styleTools'),
    align: sub({ en: 'Align & indent', pt: 'Alinhar e recuar', es: 'Alinear y aplicar sangría' }, 'format_align_left', () => ['align:left', 'align:center', 'align:right', 'align:both', '-', 'indent', 'outdent', '-',
      sub({ en: 'Special indent', pt: 'Recuo especial', es: 'Sangría especial' }, undefined, () => specialIndentMenu(env, ctx), 'specialIndent')], 'align'),
    spacing: sub({ en: 'Line & paragraph spacing', pt: 'Espaçamento entre linhas e parágrafos', es: 'Espaciado entre líneas y párrafos' }, 'format_line_spacing', () => lineSpacingMenu(env, ctx), 'spacing'),
    lists: sub({ en: 'Bullets & numbering', pt: 'Marcadores e numeração', es: 'Viñetas y numeración' }, 'format_list_bulleted', () => [
      { id: 'list:bulletMenu', label: { en: 'Bullets', pt: 'Marcadores', es: 'Viñetas' }, icon: 'format_list_bulleted', submenu: () => listMenu(env, ctx, 'bullet') },
      { id: 'list:numberMenu', label: { en: 'Numbering', pt: 'Numeração', es: 'Numeración' }, icon: 'format_list_numbered', submenu: () => listMenu(env, ctx, 'number') },
      { id: 'list:multiMenu', label: { en: 'Multilevel List', pt: 'Lista de Vários Níveis', es: 'Lista multinivel' }, icon: 'list_alt', submenu: () => multilevelMenu(env, ctx) },
      '-', 'list:defineBullet', 'list:defineNumber', 'list:setValue', 'list:defineMultilevel', 'list:defineStyle'], 'lists'),
    shading: sub({ en: 'Paragraph shading', pt: 'Sombreamento do parágrafo', es: 'Sombreado de párrafo' }, 'format_color_fill', () => shadingMenu(env, ctx), 'shadingMenu'),
    charSpacing: sub({ en: 'Character spacing', pt: 'Espaçamento entre caracteres', es: 'Espaciado entre caracteres' }, 'format_letter_spacing', () => charSpacingMenu(env, ctx), 'charSpacing'),
    page: sub({ en: 'Page setup', pt: 'Configurar página', es: 'Configurar página' }, 'description', () => [
      sub({ en: 'Orientation', pt: 'Orientação', es: 'Orientación' }, 'crop_rotate', () => orientationMenu(env, ctx), 'orientation'),
      sub({ en: 'Size', pt: 'Tamanho', es: 'Tamaño' }, 'aspect_ratio', () => sizeMenu(env, ctx), 'pageSize'),
      sub({ en: 'Margins', pt: 'Margens', es: 'Márgenes' }, 'margin', () => marginsMenu(env, ctx), 'margins'),
      '-', 'dlg:pageBorders',
    ], 'page'),
    trackChanges: sub({ en: 'Track Changes', pt: 'Controlar Alterações', es: 'Control de cambios' }, 'track_changes', () => ['trackChanges', '-',
      sub({ en: 'Display for Review', pt: 'Exibir para Revisão', es: 'Mostrar para revisión' }, 'visibility', markupModes, 'markupMode'),
      sub({ en: 'Show Markup', pt: 'Mostrar Marcação', es: 'Mostrar marcas' }, 'notes', () => showMarkup(env, ctx), 'showMarkup'),
      'reviewPane', '-', 'change:prev', 'change:next', '-',
      sub({ en: 'Accept', pt: 'Aceitar', es: 'Aceptar' }, 'check_circle', acceptItems, 'acceptMenu'),
      sub({ en: 'Reject', pt: 'Rejeitar', es: 'Rechazar' }, 'cancel', rejectItems, 'rejectMenu'),
    ], 'tracking'),
    comments: sub({ en: 'Comments', pt: 'Comentários', es: 'Comentarios' }, 'comment', () => ['comment', 'comment:prev', 'comment:next', 'comment:delete', 'comment:deleteAll', '-', 'comments'], 'commentsMenu'),
    table: { ...sub({ en: 'Table', pt: 'Tabela', es: 'Tabla' }, 'table', () => tableMenu(env, ctx), 'tableMenu'), hidden: typeof (env.ed as unknown as { insertTable?: unknown }).insertTable !== 'function' },
    notes: sub({ en: 'Notes', pt: 'Notas', es: 'Notas' }, 'notes', () => [...noteNavMenu(), '-', 'note:show', 'note:convert', 'dlg:notes'], 'notesMenu'),
  };
}

/** Quebras: de página e coluna; de seção pelos quatro tipos (como o menu Quebras). */
const breaksMenu = (): MenuEntry[] => ['pagebreak', 'columnbreak', '-', 'sectionbreak', 'sectionbreak:continuous', 'sectionbreak:evenPage', 'sectionbreak:oddPage'];
/** Próxima/Anterior nota de rodapé e de fim (menu do botão Próxima Nota). */
const noteNavMenu = (): MenuEntry[] => ['note:next', 'note:prev', 'note:nextEnd', 'note:prevEnd'];
/** Galeria Colunas: predefinições + Mais Colunas. */
const columnsMenu = (): MenuEntry[] => ['columns:one', 'columns:two', 'columns:three', 'columns:left', 'columns:right', '-', 'dlg:columns'];

// ── controle de alterações (guia Revisão do Word) ──
const markupModes = (): MenuEntry[] => ['markup:simple', 'markup:all', 'markup:none', 'markup:original'];
const acceptItems = (): MenuEntry[] => ['change:acceptNext', 'change:acceptOne', 'change:acceptShown', 'change:acceptAll', 'change:acceptAllStop'];
const rejectItems = (): MenuEntry[] => ['change:rejectNext', 'change:rejectOne', 'change:rejectShown', 'change:rejectAll', 'change:rejectAllStop'];
const MODE_LABELS: Record<string, { en: string; pt: string; es: string }> = {
  simple: { en: 'Simple Markup', pt: 'Marcação Simples', es: 'Revisiones simples' }, all: { en: 'All Markup', pt: 'Todas as Marcações', es: 'Todas las revisiones' },
  none: { en: 'No Markup', pt: 'Sem Marcação', es: 'Sin revisiones' }, original: { en: 'Original', pt: 'Original', es: 'Original' },
};

/** Mostrar Marcação: tipos, balões e pessoas específicas (autores do documento). */
function showMarkup(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const ed = env.ed;
  const people = (): MenuEntry[] => {
    const all = ed.revisionAuthors();
    const sel = ed.getMarkupOptions().authors;
    return ['people:all', '-', ...all.map((a): MenuItem => ({
      id: `people:${a}`, label: a, swatch: `#${ed.authorColor(a)}`, checked: !sel || sel.includes(a),
      onClick: () => {
        const cur = ed.getMarkupOptions().authors ?? all;
        const next = cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a];
        ed.setMarkupOptions({ authors: all.every((x) => next.includes(x)) ? null : next });
        ctx.after();
      },
    }))];
  };
  return ['comments', 'show:insdel', 'show:formatting', '-',
    { id: 'balloons', label: { en: 'Balloons', pt: 'Balões', es: 'Globos' }, submenu: () => ['balloons:revisions', 'balloons:inline', 'balloons:mixed'] },
    { id: 'people', label: { en: 'Specific People', pt: 'Pessoas Específicas', es: 'Personas específicas' }, submenu: people }];
}

const fileMenu = (m: ReturnType<typeof menus>): MenuEntry[] => [
  'new', 'open', m.recent, '-', 'save', 'saveAs', m.exportAs, 'fontsInFile', '-', 'compare', '-', 'print', '-', m.autosave,
];

export function compactLayout(env: WidgetEnv, ctx: BarContext): CompactConfig {
  const m = menus(env, ctx);
  return {
    title: titleWidget(env),
    trailing: [saveWidget(env)],
    menus: [
      { id: 'file', label: { en: 'File', pt: 'Arquivo', es: 'Archivo' }, items: () => fileMenu(m) },
      { id: 'edit', label: { en: 'Edit', pt: 'Editar', es: 'Editar' }, items: ['undo', 'redo', '-', 'cut', 'copy', 'paste', 'pastePlain', 'paste:special', 'paste:defaults', 'clipboard:pane', '-', 'selectAll', 'select:objects', 'select:similar', '-', 'find', 'find:advanced', 'replace', 'goto'] },
      { id: 'view', label: { en: 'View', pt: 'Ver', es: 'Ver' }, items: () => ['view:print', 'view:web', 'view:read', 'view:outline', 'view:draft', 'focus', '-', 'view:ruler', 'view:gridlines', 'view:navpane', 'view:bookmarks', '-', 'marks', 'comments', '-', m.zoom, '-', m.theme, m.accent, m.toolbar] },
      { id: 'insert', label: { en: 'Insert', pt: 'Inserir', es: 'Insertar' }, items: () => ['image', m.table, 'link', 'comment', '-', m.cover, 'blankPage', m.breaks, m.hf, m.fields, m.toc, '-', 'footnote', 'endnote', m.notes, 'bookmark', 'crossref', 'caption', 'tof', 'tof:update', { id: 'textbox:sub', label: { en: 'Text box', pt: 'Caixa de texto', es: 'Cuadro de texto' }, icon: 'text_fields', submenu: () => textboxMenu(env, ctx) }, m.symbols] },
      { id: 'format', label: { en: 'Format', pt: 'Formatar', es: 'Formato' }, items: () => [m.text, m.underline, m.color, m.highlight, m.styles, m.styleTools, '-', m.align, m.spacing, m.lists, m.shading, m.borders, 'dlg:borders', m.charSpacing, '-', tableFormatMenu(), pictureMenu(env, ctx), shapeMenu(env, ctx), '-', m.page, m.background, m.columns, '-', 'dlg:font', 'dlg:paragraph', 'dlg:tabs', '-', 'clear', 'style:clearChar', 'style:clearPara'] },
      { id: 'tools', label: { en: 'Tools', pt: 'Ferramentas', es: 'Herramientas' }, items: () => ['spelling', 'spellAsYouType', 'wordCount', 'sort', '-', m.trackChanges, m.comments, '-', 'compare', 'mailmerge', '-', 'fontAccess', m.hyphenation, m.lineNumbers, '-', 'enableEditing'] },
      { id: 'help', label: { en: 'Help', pt: 'Ajuda', es: 'Ayuda' }, items: ['shortcuts', 'about'] },
    ],
    groups: [
      { id: 'tools', label: { en: 'Tools', pt: 'Ferramentas', es: 'Herramientas' }, icon: 'undo', prio: 4, items: ['undo', 'redo', 'print', 'spelling', 'painter', zoomItem(env)] },
      { id: 'style', label: { en: 'Style', pt: 'Estilo', es: 'Estilo' }, icon: 'style', prio: 8, items: [styleWidget(env)] },
      { id: 'font', label: { en: 'Font', pt: 'Fonte', es: 'Fuente' }, icon: 'font_download', prio: 8, items: [fontWidget(env)] },
      { id: 'size', label: { en: 'Font size', pt: 'Tamanho da fonte', es: 'Tamaño de fuente' }, icon: 'format_size', prio: 7, items: [sizeWidget(env, 'steppers')] },
      { id: 'format', label: { en: 'Formatting', pt: 'Formatação', es: 'Formato' }, icon: 'format_bold', prio: 9, items: [
        'bold', 'italic',
        { split: 'underline', menu: () => underlineMenu(env, ctx) },
        { split: 'color', menu: () => fontColorMenu(env, ctx) },
        { split: 'highlight', menu: () => highlightMenu(env, ctx) },
        { menu: () => textEffectsMenu(env, ctx), id: 'fx:menu', label: { en: 'Text Effects and Typography', pt: 'Efeitos de Texto e Tipografia', es: 'Efectos de texto y tipografía' }, icon: 'format_color_text' },
      ] },
      { id: 'insert', label: { en: 'Insert', pt: 'Inserir', es: 'Insertar' }, icon: 'link', prio: 5, items: ['link', 'comment', 'image', { menu: () => tableMenu(env, ctx), id: 'table:menu', label: { en: 'Table', pt: 'Tabela', es: 'Tabla' }, icon: 'table', supports: () => typeof (env.ed as unknown as { insertTable?: unknown }).insertTable === 'function' }] },
      { id: 'para', label: { en: 'Paragraph', pt: 'Parágrafo', es: 'Párrafo' }, icon: 'format_align_left', prio: 6, items: [
        'align:left', 'align:center', 'align:right', 'align:both',
        { menu: () => lineSpacingMenu(env, ctx), id: 'spacing', label: { en: 'Line & paragraph spacing', pt: 'Espaçamento entre linhas e parágrafos', es: 'Espaciado entre líneas y párrafos' }, icon: 'format_line_spacing' },
        { split: 'list:bullet', menu: () => listMenu(env, ctx, 'bullet') },
        { split: 'list:decimal', menu: () => listMenu(env, ctx, 'number') },
        { menu: () => multilevelMenu(env, ctx), id: 'list:multi', label: { en: 'Multilevel List', pt: 'Lista de Vários Níveis', es: 'Lista multinivel' }, icon: 'list_alt' },
        'outdent', 'indent', 'clear',
      ] },
      pictureCompactGroup(env, ctx),
      shapeCompactGroup(env, ctx),
      { id: 'extras', label: { en: 'More tools', pt: 'Mais ferramentas', es: 'Más herramientas' }, icon: 'more_horiz', prio: 0, items: [
        'strike', 'sub', 'sup',
        { menu: caseMenu, id: 'case', label: { en: 'Change case', pt: 'Maiúsculas e minúsculas', es: 'Cambiar mayúsculas y minúsculas' }, icon: 'match_case' },
        { split: 'shading', menu: () => shadingMenu(env, ctx) }, { split: 'home:borders', menu: homeBordersMenu }, 'marks',
        { menu: () => charSpacingMenu(env, ctx), id: 'charSpacing', label: { en: 'Character spacing', pt: 'Espaçamento entre caracteres', es: 'Espaciado entre caracteres' }, icon: 'format_letter_spacing' },
        { menu: () => specialIndentMenu(env, ctx), id: 'specialIndent', label: { en: 'Special indent', pt: 'Recuo especial', es: 'Sangría especial' }, icon: 'format_indent_increase' },
        { menu: () => orientationMenu(env, ctx), id: 'orientation', label: { en: 'Orientation', pt: 'Orientação', es: 'Orientación' }, icon: 'crop_rotate' },
        { menu: () => sizeMenu(env, ctx), id: 'pageSize', label: { en: 'Paper size', pt: 'Tamanho do papel', es: 'Tamaño del papel' }, icon: 'aspect_ratio' },
        { menu: () => marginsMenu(env, ctx), id: 'margins', label: { en: 'Margins', pt: 'Margens', es: 'Márgenes' }, icon: 'margin' },
        'find',
      ] },
    ],
  };
}

const L = (en: string, pt: string, es: string): { en: string; pt: string; es: string } => ({ en, pt, es });
const large = (cmd: string): BarItem => ({ cmd, size: 'large' });

export function ribbonLayout(env: WidgetEnv, ctx: BarContext): RibbonConfig {
  const m = menus(env, ctx);
  const has = (meth: string) => (): boolean => typeof (env.ed as unknown as Record<string, unknown>)[meth] === 'function';
  return {
    qat: ['save', 'undo', 'redo'],
    title: titleWidget(env),
    tabs: [
      { id: 'file', label: L('File', 'Arquivo', 'Archivo'), groups: [], menu: () => fileMenu(m) },
      {
        id: 'home', label: L('Home', 'Página Inicial', 'Inicio'), groups: [
          { id: 'clipboard', label: L('Clipboard', 'Área de Transferência', 'Portapapeles'), icon: 'content_paste', prio: 3, launcher: 'clipboard:pane', cells: [
            { split: 'paste', size: 'large', menu: () => pasteMenu(env, ctx) },
            { rows: [['cut'], ['copy'], ['painter']] },
          ] },
          { id: 'font', label: L('Font', 'Fonte', 'Fuente'), icon: 'text_format', prio: 8, launcher: 'dlg:font', cells: [
            { rows: [
              [fontWidget(env, 140), sizeWidget(env, 'dropdown'), 'grow', 'shrink', { menu: caseMenu, id: 'case', label: L('Change case', 'Maiúsculas e minúsculas', 'Cambiar mayúsculas y minúsculas'), icon: 'match_case' }, 'clear'],
              ['bold', 'italic', { split: 'underline', menu: () => underlineMenu(env, ctx) }, 'strike', 'sub', 'sup', { menu: () => textEffectsMenu(env, ctx), id: 'fx:menu', label: L('Text Effects and Typography', 'Efeitos de Texto e Tipografia', 'Efectos de texto y tipografía'), icon: 'format_color_text' }, { split: 'highlight', menu: () => highlightMenu(env, ctx) }, { split: 'color', menu: () => fontColorMenu(env, ctx) }],
            ] },
          ] },
          { id: 'paragraph', label: L('Paragraph', 'Parágrafo', 'Párrafo'), icon: 'format_align_left', prio: 7, launcher: 'dlg:paragraph', cells: [
            { rows: [
              [{ split: 'list:bullet', menu: () => listMenu(env, ctx, 'bullet') }, { split: 'list:decimal', menu: () => listMenu(env, ctx, 'number') },
                { menu: () => multilevelMenu(env, ctx), id: 'list:multi', label: L('Multilevel List', 'Lista de Vários Níveis', 'Lista multinivel'), icon: 'list_alt' },
                'outdent', 'indent', 'sort', 'marks'],
              ['align:left', 'align:center', 'align:right', 'align:both',
                { menu: () => lineSpacingMenu(env, ctx), id: 'spacing', label: L('Line & paragraph spacing', 'Espaçamento entre linhas e parágrafos', 'Espaciado entre líneas y párrafos'), icon: 'format_line_spacing' },
                { split: 'shading', menu: () => shadingMenu(env, ctx) }, { split: 'home:borders', menu: homeBordersMenu }],
            ] },
          ] },
          // galeria com miniaturas (widget de galeria do framework; elástica) + ↘ Painel de Estilos
          { id: 'styles', label: L('Styles', 'Estilos', 'Estilos'), icon: 'style', prio: 5, launcher: 'styles:pane', cells: env.styles
            ? [env.styles.galleryItem()]
            : [{ rows: [[styleWidget(env, 150)]] }] },
          { id: 'editing', label: L('Editing', 'Edição', 'Edición'), icon: 'search', prio: 4, cells: [
            { rows: [[{ split: 'find', menu: findMenu, label: true }], [{ cmd: 'replace', label: true }],
              [{ menu: selectMenu, id: 'select:menu', label: L('Select', 'Selecionar', 'Seleccionar'), icon: 'select_all', showLabel: true }]] },
          ] },
        ],
      },
      {
        id: 'insert', label: L('Insert', 'Inserir', 'Insertar'), groups: [
          { id: 'pages', label: L('Pages', 'Páginas', 'Páginas'), icon: 'insert_page_break', prio: 4, cells: [
            { menu: () => coverPageMenu(env, ctx), id: 'cover:menu', label: L('Cover Page', 'Folha de Rosto', 'Portada'), icon: 'auto_stories', size: 'large', supports: has('insertCoverPage') },
            large('blankPage'),
            large('pagebreak'),
            { menu: breaksMenu, id: 'breaks', label: L('Breaks', 'Quebras', 'Saltos'), icon: 'insert_page_break', size: 'large', supports: has('insertSectionBreak') },
          ] },
          { id: 'objects', label: L('Illustrations', 'Ilustrações', 'Ilustraciones'), icon: 'image', prio: 6, cells: [
            { menu: () => tableMenu(env, ctx), id: 'table:menu', label: L('Table', 'Tabela', 'Tabla'), icon: 'table', size: 'large', supports: has('insertTable') },
            large('image'),
          ] },
          // Links (Link, Indicador, Referência Cruzada) e Comentários, como no Word
          { id: 'links', label: L('Links', 'Links', 'Vínculos'), icon: 'link', prio: 5, cells: [large('link'), large('bookmark'), large('crossref')] },
          { id: 'comments', label: L('Comments', 'Comentários', 'Comentarios'), icon: 'add_comment', prio: 4, cells: [large('comment')] },
          { id: 'hf', label: L('Header & Footer', 'Cabeçalho e Rodapé', 'Encabezado y pie de página'), icon: 'call_to_action', prio: 4, cells: [
            { menu: () => hfGalleryMenu(env, ctx, 'header'), id: 'hf:headerMenu', label: L('Header', 'Cabeçalho', 'Encabezado'), icon: 'vertical_align_top', size: 'large' },
            { menu: () => hfGalleryMenu(env, ctx, 'footer'), id: 'hf:footerMenu', label: L('Footer', 'Rodapé', 'Pie de página'), icon: 'vertical_align_bottom', size: 'large' },
            { menu: () => pageNumberMenu(env, ctx), id: 'hf:pgnumMenu', label: L('Page Number', 'Número de Página', 'Número de página'), icon: 'numbers', size: 'large' },
          ] },
          { id: 'text', label: L('Text', 'Texto', 'Texto'), icon: 'text_fields', prio: 3, cells: [
            { menu: () => textboxMenu(env, ctx), id: 'textbox:menu', label: L('Text Box', 'Caixa de Texto', 'Cuadro de texto'), icon: 'text_fields', size: 'large', supports: has('insertTextbox') },
            { rows: [[{ cmd: 'dlg:dateTime', label: true }], [{ menu: () => symbolMenu(env, ctx), id: 'symbols', label: L('Symbol', 'Símbolo', 'Símbolo'), icon: 'special_character', showLabel: true }]] },
          ] },
        ],
      },
      {
        // guia Design (como no Word): por ora só o Plano de Fundo da Página; Formatação do
        // Documento (temas, conjuntos de estilos) entra quando chegar
        id: 'design', label: L('Design', 'Design', 'Diseño'), groups: [
          { id: 'docformat', label: L('Document Formatting', 'Formatação do Documento', 'Formato del documento'), icon: 'format_line_spacing', prio: 3, cells: [
            { menu: () => paragraphSpacingMenu(env, ctx), id: 'pspacing', label: L('Paragraph Spacing', 'Espaçamento entre Parágrafos', 'Espaciado entre párrafos'), icon: 'format_line_spacing', size: 'large' },
          ] },
          { id: 'background', label: L('Page Background', 'Plano de Fundo da Página', 'Fondo de página'), icon: 'format_color_fill', prio: 4, cells: [
            { menu: () => watermarkMenu(env, ctx), id: 'watermark:menu', label: L('Watermark', 'Marca-d\'Água', 'Marca de agua'), icon: 'branding_watermark', size: 'large', supports: has('setWatermark') },
            { menu: () => pageColorMenu(env, ctx), id: 'pageColor:menu', label: L('Page Color', 'Cor da Página', 'Color de página'), icon: 'format_color_fill', size: 'large', supports: has('setPageColor') },
            { cmd: 'dlg:pageBorders', size: 'large' },
          ] },
        ],
      },
      {
        id: 'layout', label: L('Layout', 'Layout', 'Disposición'), groups: [
          { id: 'pagesetup', label: L('Page Setup', 'Configurar Página', 'Configurar página'), icon: 'description', prio: 6, launcher: 'dlg:page', cells: [
            { menu: () => marginsMenu(env, ctx), id: 'margins', label: L('Margins', 'Margens', 'Márgenes'), icon: 'margin', size: 'large' },
            { menu: () => orientationMenu(env, ctx), id: 'orientation', label: L('Orientation', 'Orientação', 'Orientación'), icon: 'crop_rotate', size: 'large' },
            { menu: () => sizeMenu(env, ctx), id: 'pageSize', label: L('Size', 'Tamanho', 'Tamaño'), icon: 'aspect_ratio', size: 'large' },
            { menu: columnsMenu, id: 'columns', label: L('Columns', 'Colunas', 'Columnas'), icon: 'view_column_2', size: 'large', supports: has('setColumns') },
            { rows: [
              [{ menu: breaksMenu, id: 'breaks', label: L('Breaks', 'Quebras', 'Saltos'), icon: 'insert_page_break', showLabel: true }],
              [{ menu: lineNumbersMenu, id: 'lineNumbers', label: L('Line Numbers', 'Números de Linha', 'Números de línea'), icon: 'format_list_numbered', showLabel: true, supports: has('setLineNumbering') }],
              [{ menu: hyphenationMenu, id: 'hyphenation', label: L('Hyphenation', 'Hifenização', 'Guiones'), icon: 'horizontal_rule', showLabel: true, supports: has('setHyphenation') }],
            ] },
          ] },
          // Recuar (À Esquerda/À Direita) e Espaçamento (Antes/Depois) em caixas numéricas, como no Word
          { id: 'paragraph', label: L('Paragraph', 'Parágrafo', 'Párrafo'), icon: 'format_indent_increase', prio: 5, launcher: 'dlg:paragraph', cells: paragraphLayoutCells(env) },
        ],
      },
      {
        // guia Referências (como no Word): Sumário e Notas de Rodapé; Links, Citações e
        // Índice entram aqui quando chegarem
        id: 'references', label: L('References', 'Referências', 'Referencias'), groups: [
          // Sumário (como no Word): a galeria com Personalizado/Remover, Adicionar Texto e Atualizar
          { id: 'toc', label: L('Table of Contents', 'Sumário', 'Tabla de contenido'), icon: 'toc', prio: 4, cells: [
            { menu: () => tocGalleryMenu(env, ctx), id: 'toc:menu', label: L('Table of Contents', 'Sumário', 'Tabla de contenido'), icon: 'toc', size: 'large', supports: has('insertTocTemplate') },
            { rows: [
              [{ menu: () => addTextMenu(env), id: 'toc:addText', label: L('Add Text', 'Adicionar Texto', 'Agregar texto'), icon: 'playlist_add', showLabel: true, supports: has('setTocLevel') }],
              [{ cmd: 'toc', label: true }],
            ] },
          ] },
          { id: 'footnotes', label: L('Footnotes', 'Notas de Rodapé', 'Notas al pie'), icon: 'notes', prio: 6, launcher: 'dlg:notes', cells: [
            large('footnote'),
            { rows: [
              [{ cmd: 'endnote', label: true }],
              [{ menu: noteNavMenu, id: 'note:nav', label: L('Next Footnote', 'Próxima Nota de Rodapé', 'Siguiente nota al pie'), icon: 'keyboard_arrow_down', showLabel: true, supports: has('nextNote') }],
              [{ cmd: 'note:show', label: true }],
            ] },
          ] },
          { id: 'captions', label: L('Captions', 'Legendas', 'Títulos'), icon: 'subtitles', prio: 5, cells: [
            large('caption'),
            { rows: [[{ cmd: 'tof', label: true }], [{ cmd: 'tof:update', label: true }], [{ cmd: 'crossref', label: true }]] },
          ] },
        ],
      },
      {
        id: 'mailings', label: L('Mailings', 'Correspondências', 'Correspondencia'), groups: [
          { id: 'merge', label: L('Mail Merge', 'Mala Direta', 'Combinar correspondencia'), icon: 'mail', prio: 5, cells: [large('mailmerge'), large('mergefield')] },
        ],
      },
      {
        id: 'review', label: L('Review', 'Revisão', 'Revisar'), groups: [
          { id: 'proofing', label: L('Proofing', 'Revisão de Texto', 'Revisión'), icon: 'spellcheck', prio: 5, cells: [large('spelling'), { rows: [[{ cmd: 'spellAsYouType', label: true }], [{ cmd: 'wordCount', label: true }]] }] },
          { id: 'comments', label: L('Comments', 'Comentários', 'Comentarios'), icon: 'comment', prio: 6, cells: [
            large('comment'),
            { rows: [[{ cmd: 'comment:delete', label: true }], [{ cmd: 'comment:prev', label: true }], [{ cmd: 'comment:next', label: true }]] },
            { cmd: 'comments', size: 'large' },
          ] },
          { id: 'tracking', label: L('Tracking', 'Controle', 'Seguimiento'), icon: 'track_changes', prio: 4, cells: [
            large('trackChanges'),
            { rows: [
              [{ menu: markupModes, id: 'markupMode', label: L('Display for Review', 'Exibir para Revisão', 'Mostrar para revisión'), icon: 'visibility', text: () => MODE_LABELS[env.ed.getMarkupMode()]![ctx.lang], supports: () => typeof env.ed.setMarkupMode === 'function' }],
              [{ menu: () => showMarkup(env, ctx), id: 'showMarkup', label: L('Show Markup', 'Mostrar Marcação', 'Mostrar marcas'), icon: 'notes', showLabel: true, supports: () => typeof env.ed.setMarkupOptions === 'function' }],
              [{ cmd: 'reviewPane', label: true }, { menu: () => ['reviewPane:vertical', 'reviewPane:horizontal'], id: 'reviewPaneDir', label: { en: 'Reviewing Pane', pt: 'Painel de Revisão', es: 'Panel de revisiones' }, icon: 'arrow_drop_down', supports: () => typeof env.ed.getRevisions === 'function' }],
            ] },
          ] },
          { id: 'changes', label: L('Changes', 'Alterações', 'Cambios'), icon: 'check_circle', prio: 4, cells: [
            { split: 'change:accept', menu: acceptItems, size: 'large' },
            { split: 'change:reject', menu: rejectItems, size: 'large' },
            { rows: [[{ cmd: 'change:prev', label: true }], [{ cmd: 'change:next', label: true }]] },
          ] },
          { id: 'document', label: L('Compare & Protect', 'Comparar e Proteger', 'Comparar y proteger'), icon: 'compare', prio: 3, cells: [large('compare'), large('enableEditing')] },
        ],
      },
      {
        id: 'view', label: L('View', 'Exibir', 'Vista'), groups: [
          { id: 'views', label: L('Views', 'Modos de Exibição', 'Vistas'), icon: 'article', prio: 6, cells: [
            large('view:read'), large('view:print'), large('view:web'),
            { rows: [[{ cmd: 'view:outline', label: true }], [{ cmd: 'view:draft', label: true }]] },
            large('focus'),
          ] },
          { id: 'show', label: L('Show', 'Mostrar', 'Mostrar'), icon: 'visibility', prio: 4, cells: [
            { rows: [[{ cmd: 'view:ruler', label: true }], [{ cmd: 'view:gridlines', label: true }], [{ cmd: 'view:navpane', label: true }]] },
            { rows: [[{ cmd: 'marks', label: true }], [{ cmd: 'comments', label: true }], [{ cmd: 'statusbar', label: true }]] },
            { rows: [[{ cmd: 'view:bookmarks', label: true }]] },
          ] },
          { id: 'zoom', label: L('Zoom', 'Zoom', 'Zoom'), icon: 'zoom_in', prio: 5, cells: [
            { menu: m.zoomItems, id: 'zoom', label: L('Zoom', 'Zoom', 'Zoom'), icon: 'zoom_in', size: 'large' },
            large('zoom100'),
            { rows: [['zoomin'], ['zoomout']] },
          ] },
          { id: 'appearance', label: L('Appearance', 'Aparência', 'Apariencia'), icon: 'palette', prio: 2, cells: [
            { menu: () => themeMenu(env, ctx), id: 'theme', label: L('Theme', 'Tema', 'Tema'), icon: 'contrast', size: 'large' },
            { menu: () => accentMenu(env, ctx), id: 'accent', label: L('Accent', 'Destaque', 'Énfasis'), icon: 'palette', size: 'large' },
            { menu: () => ['toolbar:compact', 'toolbar:ribbon'], id: 'toolbarMode', label: L('Toolbar', 'Barra', 'Barra'), icon: 'toolbar', size: 'large' },
          ] },
        ],
      },
      {
        id: 'hf-tools', label: L('Header & Footer', 'Cabeçalho e Rodapé', 'Encabezado y pie de página'), contextual: () => env.ed.editingHeaderFooter() !== null, groups: hfToolsGroups(env, ctx),
      },
      {
        id: 'table-design', label: L('Table Design', 'Design da Tabela', 'Diseño de tabla'), contextual: () => env.ed.editingTableCell(), groups: tableDesignGroups(env, ctx),
      },
      {
        id: 'table-layout', label: L('Table Layout', 'Layout da Tabela', 'Disposición de tabla'), contextual: () => env.ed.editingTableCell(), groups: tableLayoutGroups(env),
      },
      {
        id: 'image-tools', label: L('Picture Format', 'Formato da Imagem', 'Formato de imagen'),
        contextual: () => {
          const f = (env.ed as unknown as { selectedImage?: () => unknown }).selectedImage;
          return typeof f === 'function' && !!f.call(env.ed);
        },
        groups: pictureFormatGroups(env, ctx),
      },
      {
        id: 'shape-tools', label: L('Shape Format', 'Formato da Forma', 'Formato de forma'),
        contextual: () => {
          const f = (env.ed as unknown as { selectedShape?: () => unknown }).selectedShape;
          return typeof f === 'function' && !!f.call(env.ed);
        },
        groups: shapeFormatGroups(env, ctx),
      },
    ],
  };
}

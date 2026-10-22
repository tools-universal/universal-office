// Layouts das duas barras do Write: COMPACTA (Google Docs — menus + linha que
// recolhe por prioridade) e RIBBON (Word — guias, grupos com iniciador de
// diálogo e guias contextuais). Só referenciam comandos e controles; o que
// cada um faz está em chrome-commands.ts / chrome-widgets.ts.
import type { BarContext, BarItem, CompactConfig, MenuEntry, MenuItem, RibbonConfig } from '@universal-office/ui';
import type { WidgetEnv } from './chrome-widgets.js';
import {
  accentMenu, caseMenu, charSpacingMenu, colorMenu, fieldsMenu, fontWidget, highlightMenu, lineSpacingMenu,
  marginsMenu, orientationMenu, paragraphSpacingMenu, saveWidget, shadingMenu, sizeMenu, sizeWidget,
  specialIndentMenu, styleWidget, symbolMenu, themeMenu, titleWidget, zoomItem,
} from './chrome-widgets.js';
import { tableDesignGroups, tableFormatMenu, tableLayoutGroups, tableMenu } from './chrome-table.js';
import { docInfoMenu, hfGalleryMenu, hfToolsGroups, pageNumberMenu } from './chrome-hf.js';
import { pictureCompactGroup, pictureFormatGroups, pictureMenu } from './chrome-picture.js';
import { ZOOMS } from './chrome-commands.js';

/** Submenus compartilhados pelas duas barras. */
function menus(env: WidgetEnv, ctx: BarContext) {
  const sub = (label: { en: string; pt: string }, icon: string | undefined, items: () => MenuEntry[], id?: string): MenuItem =>
    ({ id, label, icon, submenu: items });
  const autosave = (): MenuItem[] => ([[0, 'Off', 'Desligado'], [1, '1 min', '1 min'], [5, '5 min', '5 min'],
    [10, '10 min', '10 min'], [30, '30 min', '30 min']] as const).map(([n, en, pt]) => ({
    id: `autosave:${n}`, label: { en, pt }, checked: env.app.autosaveMinutes === n,
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
    exportAs: sub({ en: 'Download', pt: 'Baixar' }, 'download', () => ['export:pdf', 'export:odt', 'export:html', 'export:md', 'export:xps'], 'export'),
    recent: sub({ en: 'Open recent', pt: 'Abrir recente' }, 'history', recents, 'recent'),
    autosave: sub({ en: 'Autosave', pt: 'Salvamento automático' }, 'autorenew', autosave, 'autosave'),
    zoomItems: (): MenuEntry[] => [...zoom(), '-', 'zoomin', 'zoomout'],
    zoom: sub({ en: 'Zoom', pt: 'Zoom' }, 'zoom_in', () => [...zoom(), '-', 'zoomin', 'zoomout'], 'zoom'),
    theme: sub({ en: 'Theme', pt: 'Tema' }, 'contrast', () => themeMenu(env, ctx), 'theme'),
    accent: sub({ en: 'Accent color', pt: 'Cor de destaque' }, 'palette', () => accentMenu(env, ctx), 'accent'),
    toolbar: sub({ en: 'Toolbar', pt: 'Barra de ferramentas' }, 'toolbar', () => ['toolbar:compact', 'toolbar:ribbon', '-', 'statusbar'], 'toolbar'),
    fields: sub({ en: 'Field', pt: 'Campo' }, 'data_object', fieldsMenu, 'fields'),
    symbols: sub({ en: 'Special characters', pt: 'Caracteres especiais' }, 'special_character', () => symbolMenu(env, ctx), 'symbols'),
    breaks: sub({ en: 'Break', pt: 'Quebra' }, 'insert_page_break', breaksMenu, 'breaks'),
    columns: sub({ en: 'Columns', pt: 'Colunas' }, 'view_column_2', columnsMenu, 'columns'),
    // Cabeçalho, Rodapé e Número de Página com as galerias de modelos; opções e vínculo no diálogo
    hf: sub({ en: 'Headers & footers', pt: 'Cabeçalhos e rodapés' }, 'call_to_action', () => [
      sub({ en: 'Header', pt: 'Cabeçalho' }, 'vertical_align_top', () => hfGalleryMenu(env, ctx, 'header'), 'hf:headerMenu'),
      sub({ en: 'Footer', pt: 'Rodapé' }, 'vertical_align_bottom', () => hfGalleryMenu(env, ctx, 'footer'), 'hf:footerMenu'),
      sub({ en: 'Page number', pt: 'Número de página' }, 'numbers', () => pageNumberMenu(env, ctx), 'hf:pgnumMenu'),
      '-', 'dlg:dateTime', sub({ en: 'Document info', pt: 'Informações do documento' }, 'info', docInfoMenu, 'hf:docinfo'), 'dlg:alignTab',
      '-', 'dlg:hfOptions', 'hf:link', 'hf:prev', 'hf:next', 'hf:showText', '-', 'hf:close',
    ], 'hf'),
    text: sub({ en: 'Text', pt: 'Texto' }, 'format_bold', () => ['bold', 'italic', 'underline', 'strike', 'sup', 'sub', '-', 'grow', 'shrink', '-', 'allCaps', 'smallCaps', 'case:upper', 'case:lower'], 'text'),
    color: sub({ en: 'Font color', pt: 'Cor da fonte' }, 'format_color_text', () => colorMenu(env, ctx), 'color'),
    highlight: sub({ en: 'Highlight color', pt: 'Cor do realce' }, 'format_ink_highlighter', () => highlightMenu(env, ctx), 'highlightMenu'),
    styles: sub({ en: 'Paragraph styles', pt: 'Estilos de parágrafo' }, 'style', () => {
      const cur = (env.ctl.state().para.styleId as string | undefined) || 'Normal';
      const ds = env.ed.paragraphStyles();
      return (ds.length ? ds : [{ id: 'Normal', name: 'Normal' }]).map((s): MenuItem => ({
        id: `style:${s.id}`, label: s.name, checked: s.id === cur,
        onClick: () => { env.ed.applyStyle(s.id === 'Normal' ? undefined : s.id); ctx.after(); },
      }));
    }, 'styles'),
    styleTools: sub({ en: 'Styles', pt: 'Estilos' }, 'view_sidebar', () => ['styles:pane', 'style:inspector', '-', 'style:new', 'style:modifyCurrent', 'style:updateCurrent', '-', 'style:normal', 'style:h1', 'style:h2', 'style:h3'], 'styleTools'),
    align: sub({ en: 'Align & indent', pt: 'Alinhar e recuar' }, 'format_align_left', () => ['align:left', 'align:center', 'align:right', 'align:both', '-', 'indent', 'outdent', '-',
      sub({ en: 'Special indent', pt: 'Recuo especial' }, undefined, () => specialIndentMenu(env, ctx), 'specialIndent')], 'align'),
    spacing: sub({ en: 'Line & paragraph spacing', pt: 'Espaçamento entre linhas e parágrafos' }, 'format_line_spacing', () => lineSpacingMenu(env, ctx), 'spacing'),
    lists: sub({ en: 'Bullets & numbering', pt: 'Marcadores e numeração' }, 'format_list_bulleted', () => ['list:bullet', 'list:decimal'], 'lists'),
    shading: sub({ en: 'Paragraph shading', pt: 'Sombreamento do parágrafo' }, 'format_color_fill', () => shadingMenu(env, ctx), 'shadingMenu'),
    charSpacing: sub({ en: 'Character spacing', pt: 'Espaçamento entre caracteres' }, 'format_letter_spacing', () => charSpacingMenu(env, ctx), 'charSpacing'),
    page: sub({ en: 'Page setup', pt: 'Configurar página' }, 'description', () => [
      sub({ en: 'Orientation', pt: 'Orientação' }, 'crop_rotate', () => orientationMenu(env, ctx), 'orientation'),
      sub({ en: 'Size', pt: 'Tamanho' }, 'aspect_ratio', () => sizeMenu(env, ctx), 'pageSize'),
      sub({ en: 'Margins', pt: 'Margens' }, 'margin', () => marginsMenu(env, ctx), 'margins'),
      '-', 'dlg:pageBorders',
    ], 'page'),
    trackChanges: sub({ en: 'Track Changes', pt: 'Controlar Alterações' }, 'track_changes', () => ['trackChanges', '-',
      sub({ en: 'Display for Review', pt: 'Exibir para Revisão' }, 'visibility', markupModes, 'markupMode'),
      sub({ en: 'Show Markup', pt: 'Mostrar Marcação' }, 'notes', () => showMarkup(env, ctx), 'showMarkup'),
      'reviewPane', '-', 'change:prev', 'change:next', '-',
      sub({ en: 'Accept', pt: 'Aceitar' }, 'check_circle', acceptItems, 'acceptMenu'),
      sub({ en: 'Reject', pt: 'Rejeitar' }, 'cancel', rejectItems, 'rejectMenu'),
    ], 'tracking'),
    comments: sub({ en: 'Comments', pt: 'Comentários' }, 'comment', () => ['comment', 'comment:prev', 'comment:next', 'comment:delete', 'comment:deleteAll', '-', 'comments'], 'commentsMenu'),
    table: { ...sub({ en: 'Table', pt: 'Tabela' }, 'table', () => tableMenu(env, ctx), 'tableMenu'), hidden: typeof (env.ed as unknown as { insertTable?: unknown }).insertTable !== 'function' },
    notes: sub({ en: 'Notes', pt: 'Notas' }, 'notes', () => [...noteNavMenu(), '-', 'note:show', 'note:convert', 'dlg:notes'], 'notesMenu'),
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
const MODE_LABELS: Record<string, { en: string; pt: string }> = {
  simple: { en: 'Simple Markup', pt: 'Marcação Simples' }, all: { en: 'All Markup', pt: 'Todas as Marcações' },
  none: { en: 'No Markup', pt: 'Sem Marcação' }, original: { en: 'Original', pt: 'Original' },
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
    { id: 'balloons', label: { en: 'Balloons', pt: 'Balões' }, submenu: () => ['balloons:revisions', 'balloons:inline', 'balloons:mixed'] },
    { id: 'people', label: { en: 'Specific People', pt: 'Pessoas Específicas' }, submenu: people }];
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
      { id: 'file', label: { en: 'File', pt: 'Arquivo' }, items: () => fileMenu(m) },
      { id: 'edit', label: { en: 'Edit', pt: 'Editar' }, items: ['undo', 'redo', '-', 'cut', 'copy', 'paste', 'pastePlain', '-', 'selectAll', '-', 'find', 'replace'] },
      { id: 'view', label: { en: 'View', pt: 'Ver' }, items: () => ['view:print', 'view:web', 'view:read', 'view:outline', 'view:draft', 'focus', '-', 'view:ruler', 'view:gridlines', 'view:navpane', 'view:bookmarks', '-', 'marks', 'comments', '-', m.zoom, '-', m.theme, m.accent, m.toolbar] },
      { id: 'insert', label: { en: 'Insert', pt: 'Inserir' }, items: () => ['image', m.table, 'link', 'comment', '-', m.breaks, m.hf, m.fields, 'toc', '-', 'footnote', 'endnote', m.notes, 'bookmark', 'crossref', 'caption', 'tof', 'tof:update', 'textbox', m.symbols] },
      { id: 'format', label: { en: 'Format', pt: 'Formatar' }, items: () => [m.text, m.color, m.highlight, m.styles, m.styleTools, '-', m.align, m.spacing, m.lists, m.shading, 'borders', 'dlg:borders', m.charSpacing, '-', tableFormatMenu(), pictureMenu(env, ctx), '-', m.page, m.columns, '-', 'dlg:font', 'dlg:paragraph', 'dlg:tabs', '-', 'clear', 'style:clearChar', 'style:clearPara'] },
      { id: 'tools', label: { en: 'Tools', pt: 'Ferramentas' }, items: () => ['spelling', 'spellAsYouType', 'wordCount', 'sort', '-', m.trackChanges, m.comments, '-', 'compare', 'mailmerge', '-', 'fontAccess', 'hyphenation', '-', 'enableEditing'] },
      { id: 'help', label: { en: 'Help', pt: 'Ajuda' }, items: ['shortcuts', 'about'] },
    ],
    groups: [
      { id: 'tools', label: { en: 'Tools', pt: 'Ferramentas' }, icon: 'undo', prio: 4, items: ['undo', 'redo', 'print', 'spelling', 'painter', zoomItem(env)] },
      { id: 'style', label: { en: 'Style', pt: 'Estilo' }, icon: 'style', prio: 8, items: [styleWidget(env)] },
      { id: 'font', label: { en: 'Font', pt: 'Fonte' }, icon: 'font_download', prio: 8, items: [fontWidget(env)] },
      { id: 'size', label: { en: 'Font size', pt: 'Tamanho da fonte' }, icon: 'format_size', prio: 7, items: [sizeWidget(env, 'steppers')] },
      { id: 'format', label: { en: 'Formatting', pt: 'Formatação' }, icon: 'format_bold', prio: 9, items: [
        'bold', 'italic', 'underline',
        { split: 'color', menu: () => colorMenu(env, ctx) },
        { split: 'highlight', menu: () => highlightMenu(env, ctx) },
      ] },
      { id: 'insert', label: { en: 'Insert', pt: 'Inserir' }, icon: 'link', prio: 5, items: ['link', 'comment', 'image', { menu: () => tableMenu(env, ctx), id: 'table:menu', label: { en: 'Table', pt: 'Tabela' }, icon: 'table', supports: () => typeof (env.ed as unknown as { insertTable?: unknown }).insertTable === 'function' }] },
      { id: 'para', label: { en: 'Paragraph', pt: 'Parágrafo' }, icon: 'format_align_left', prio: 6, items: [
        'align:left', 'align:center', 'align:right', 'align:both',
        { menu: () => lineSpacingMenu(env, ctx), id: 'spacing', label: { en: 'Line & paragraph spacing', pt: 'Espaçamento entre linhas e parágrafos' }, icon: 'format_line_spacing' },
        'list:bullet', 'list:decimal', 'outdent', 'indent', 'clear',
      ] },
      pictureCompactGroup(env, ctx),
      { id: 'extras', label: { en: 'More tools', pt: 'Mais ferramentas' }, icon: 'more_horiz', prio: 0, items: [
        'strike', 'sub', 'sup',
        { menu: caseMenu, id: 'case', label: { en: 'Change case', pt: 'Maiúsculas e minúsculas' }, icon: 'match_case' },
        { split: 'shading', menu: () => shadingMenu(env, ctx) }, 'borders', 'marks',
        { menu: () => charSpacingMenu(env, ctx), id: 'charSpacing', label: { en: 'Character spacing', pt: 'Espaçamento entre caracteres' }, icon: 'format_letter_spacing' },
        { menu: () => specialIndentMenu(env, ctx), id: 'specialIndent', label: { en: 'Special indent', pt: 'Recuo especial' }, icon: 'format_indent_increase' },
        { menu: () => orientationMenu(env, ctx), id: 'orientation', label: { en: 'Orientation', pt: 'Orientação' }, icon: 'crop_rotate' },
        { menu: () => sizeMenu(env, ctx), id: 'pageSize', label: { en: 'Paper size', pt: 'Tamanho do papel' }, icon: 'aspect_ratio' },
        { menu: () => marginsMenu(env, ctx), id: 'margins', label: { en: 'Margins', pt: 'Margens' }, icon: 'margin' },
        'find',
      ] },
    ],
  };
}

const L = (en: string, pt: string): { en: string; pt: string } => ({ en, pt });
const large = (cmd: string): BarItem => ({ cmd, size: 'large' });

export function ribbonLayout(env: WidgetEnv, ctx: BarContext): RibbonConfig {
  const m = menus(env, ctx);
  const has = (meth: string) => (): boolean => typeof (env.ed as unknown as Record<string, unknown>)[meth] === 'function';
  return {
    qat: ['save', 'undo', 'redo'],
    title: titleWidget(env),
    tabs: [
      { id: 'file', label: L('File', 'Arquivo'), groups: [], menu: () => fileMenu(m) },
      {
        id: 'home', label: L('Home', 'Página Inicial'), groups: [
          { id: 'clipboard', label: L('Clipboard', 'Área de Transferência'), icon: 'content_paste', prio: 3, cells: [
            { split: 'paste', size: 'large', menu: ['paste', 'pastePlain'] },
            { rows: [['cut'], ['copy'], ['painter']] },
          ] },
          { id: 'font', label: L('Font', 'Fonte'), icon: 'text_format', prio: 8, launcher: 'dlg:font', cells: [
            { rows: [
              [fontWidget(env, 140), sizeWidget(env, 'dropdown'), 'grow', 'shrink', { menu: caseMenu, id: 'case', label: L('Change case', 'Maiúsculas e minúsculas'), icon: 'match_case' }, 'clear'],
              ['bold', 'italic', 'underline', 'strike', 'sub', 'sup', { split: 'color', menu: () => colorMenu(env, ctx) }, { split: 'highlight', menu: () => highlightMenu(env, ctx) }],
            ] },
          ] },
          { id: 'paragraph', label: L('Paragraph', 'Parágrafo'), icon: 'format_align_left', prio: 7, launcher: 'dlg:paragraph', cells: [
            { rows: [
              ['list:bullet', 'list:decimal', 'outdent', 'indent', 'sort', 'marks'],
              ['align:left', 'align:center', 'align:right', 'align:both',
                { menu: () => lineSpacingMenu(env, ctx), id: 'spacing', label: L('Line & paragraph spacing', 'Espaçamento entre linhas e parágrafos'), icon: 'format_line_spacing' },
                { split: 'shading', menu: () => shadingMenu(env, ctx) }, 'borders'],
            ] },
          ] },
          // galeria com miniaturas (widget de galeria do framework; elástica) + ↘ Painel de Estilos
          { id: 'styles', label: L('Styles', 'Estilos'), icon: 'style', prio: 5, launcher: 'styles:pane', cells: env.styles
            ? [env.styles.galleryItem()]
            : [{ rows: [[styleWidget(env, 150)]] }] },
          { id: 'editing', label: L('Editing', 'Edição'), icon: 'search', prio: 4, cells: [
            { rows: [[{ cmd: 'find', label: true }], [{ cmd: 'replace', label: true }], [{ cmd: 'selectAll', label: true }]] },
          ] },
        ],
      },
      {
        id: 'insert', label: L('Insert', 'Inserir'), groups: [
          { id: 'pages', label: L('Pages', 'Páginas'), icon: 'insert_page_break', prio: 4, cells: [
            large('pagebreak'),
            { menu: breaksMenu, id: 'breaks', label: L('Breaks', 'Quebras'), icon: 'insert_page_break', size: 'large', supports: has('insertSectionBreak') },
          ] },
          { id: 'objects', label: L('Illustrations', 'Ilustrações'), icon: 'image', prio: 6, cells: [
            { menu: () => tableMenu(env, ctx), id: 'table:menu', label: L('Table', 'Tabela'), icon: 'table', size: 'large', supports: has('insertTable') },
            large('image'),
          ] },
          // Links (Link, Indicador, Referência Cruzada) e Comentários, como no Word
          { id: 'links', label: L('Links', 'Links'), icon: 'link', prio: 5, cells: [large('link'), large('bookmark'), large('crossref')] },
          { id: 'comments', label: L('Comments', 'Comentários'), icon: 'add_comment', prio: 4, cells: [large('comment')] },
          { id: 'hf', label: L('Header & Footer', 'Cabeçalho e Rodapé'), icon: 'call_to_action', prio: 4, cells: [
            { menu: () => hfGalleryMenu(env, ctx, 'header'), id: 'hf:headerMenu', label: L('Header', 'Cabeçalho'), icon: 'vertical_align_top', size: 'large' },
            { menu: () => hfGalleryMenu(env, ctx, 'footer'), id: 'hf:footerMenu', label: L('Footer', 'Rodapé'), icon: 'vertical_align_bottom', size: 'large' },
            { menu: () => pageNumberMenu(env, ctx), id: 'hf:pgnumMenu', label: L('Page Number', 'Número de Página'), icon: 'numbers', size: 'large' },
          ] },
          { id: 'text', label: L('Text', 'Texto'), icon: 'text_fields', prio: 3, cells: [
            large('textbox'),
            { rows: [[{ cmd: 'dlg:dateTime', label: true }], [{ menu: () => symbolMenu(env, ctx), id: 'symbols', label: L('Symbol', 'Símbolo'), icon: 'special_character', showLabel: true }]] },
          ] },
        ],
      },
      {
        id: 'layout', label: L('Layout', 'Layout'), groups: [
          { id: 'pagesetup', label: L('Page Setup', 'Configurar Página'), icon: 'description', prio: 6, launcher: 'dlg:page', cells: [
            { menu: () => marginsMenu(env, ctx), id: 'margins', label: L('Margins', 'Margens'), icon: 'margin', size: 'large' },
            { menu: () => orientationMenu(env, ctx), id: 'orientation', label: L('Orientation', 'Orientação'), icon: 'crop_rotate', size: 'large' },
            { menu: () => sizeMenu(env, ctx), id: 'pageSize', label: L('Size', 'Tamanho'), icon: 'aspect_ratio', size: 'large' },
            { menu: columnsMenu, id: 'columns', label: L('Columns', 'Colunas'), icon: 'view_column_2', size: 'large', supports: has('setColumns') },
            { rows: [[{ menu: breaksMenu, id: 'breaks', label: L('Breaks', 'Quebras'), icon: 'insert_page_break', showLabel: true }], ['hyphenation'], [{ cmd: 'dlg:pageBorders', label: true }]] },
          ] },
          { id: 'paragraph', label: L('Paragraph', 'Parágrafo'), icon: 'format_indent_increase', prio: 5, launcher: 'dlg:paragraph', cells: [
            { menu: () => paragraphSpacingMenu(env, ctx), id: 'pspacing', label: L('Paragraph Spacing', 'Espaçamento entre Parágrafos'), icon: 'format_line_spacing', size: 'large' },
            { rows: [
              [{ cmd: 'outdent', label: true }, { cmd: 'indent', label: true }],
              [{ menu: () => specialIndentMenu(env, ctx), id: 'specialIndent', label: L('Special indent', 'Recuo especial'), icon: 'format_indent_increase', showLabel: true }],
              [{ menu: () => lineSpacingMenu(env, ctx), id: 'spacing', label: L('Spacing', 'Espaçamento'), icon: 'format_line_spacing', showLabel: true }],
            ] },
          ] },
          { id: 'background', label: L('Page Background', 'Plano de Fundo da Página'), icon: 'format_color_fill', prio: 4, cells: [
            { cmd: 'pageColor', size: 'large' }, { cmd: 'watermark', size: 'large' },
          ] },
        ],
      },
      {
        // guia Referências (como no Word): Sumário e Notas de Rodapé; Links, Citações e
        // Índice entram aqui quando chegarem
        id: 'references', label: L('References', 'Referências'), groups: [
          { id: 'toc', label: L('Table of Contents', 'Sumário'), icon: 'toc', prio: 4, cells: [large('toc')] },
          { id: 'footnotes', label: L('Footnotes', 'Notas de Rodapé'), icon: 'notes', prio: 6, launcher: 'dlg:notes', cells: [
            large('footnote'),
            { rows: [
              [{ cmd: 'endnote', label: true }],
              [{ menu: noteNavMenu, id: 'note:nav', label: L('Next Footnote', 'Próxima Nota de Rodapé'), icon: 'keyboard_arrow_down', showLabel: true, supports: has('nextNote') }],
              [{ cmd: 'note:show', label: true }],
            ] },
          ] },
          { id: 'captions', label: L('Captions', 'Legendas'), icon: 'subtitles', prio: 5, cells: [
            large('caption'),
            { rows: [[{ cmd: 'tof', label: true }], [{ cmd: 'tof:update', label: true }], [{ cmd: 'crossref', label: true }]] },
          ] },
        ],
      },
      {
        id: 'mailings', label: L('Mailings', 'Correspondências'), groups: [
          { id: 'merge', label: L('Mail Merge', 'Mala Direta'), icon: 'mail', prio: 5, cells: [large('mailmerge'), large('mergefield')] },
        ],
      },
      {
        id: 'review', label: L('Review', 'Revisão'), groups: [
          { id: 'proofing', label: L('Proofing', 'Revisão de Texto'), icon: 'spellcheck', prio: 5, cells: [large('spelling'), { rows: [[{ cmd: 'spellAsYouType', label: true }], [{ cmd: 'wordCount', label: true }]] }] },
          { id: 'comments', label: L('Comments', 'Comentários'), icon: 'comment', prio: 6, cells: [
            large('comment'),
            { rows: [[{ cmd: 'comment:delete', label: true }], [{ cmd: 'comment:prev', label: true }], [{ cmd: 'comment:next', label: true }]] },
            { cmd: 'comments', size: 'large' },
          ] },
          { id: 'tracking', label: L('Tracking', 'Controle'), icon: 'track_changes', prio: 4, cells: [
            large('trackChanges'),
            { rows: [
              [{ menu: markupModes, id: 'markupMode', label: L('Display for Review', 'Exibir para Revisão'), icon: 'visibility', text: () => MODE_LABELS[env.ed.getMarkupMode()]![ctx.lang], supports: () => typeof env.ed.setMarkupMode === 'function' }],
              [{ menu: () => showMarkup(env, ctx), id: 'showMarkup', label: L('Show Markup', 'Mostrar Marcação'), icon: 'notes', showLabel: true, supports: () => typeof env.ed.setMarkupOptions === 'function' }],
              [{ cmd: 'reviewPane', label: true }, { menu: () => ['reviewPane:vertical', 'reviewPane:horizontal'], id: 'reviewPaneDir', label: { en: 'Reviewing Pane', pt: 'Painel de Revisão' }, icon: 'arrow_drop_down', supports: () => typeof env.ed.getRevisions === 'function' }],
            ] },
          ] },
          { id: 'changes', label: L('Changes', 'Alterações'), icon: 'check_circle', prio: 4, cells: [
            { split: 'change:accept', menu: acceptItems, size: 'large' },
            { split: 'change:reject', menu: rejectItems, size: 'large' },
            { rows: [[{ cmd: 'change:prev', label: true }], [{ cmd: 'change:next', label: true }]] },
          ] },
          { id: 'document', label: L('Compare & Protect', 'Comparar e Proteger'), icon: 'compare', prio: 3, cells: [large('compare'), large('enableEditing')] },
        ],
      },
      {
        id: 'view', label: L('View', 'Exibir'), groups: [
          { id: 'views', label: L('Views', 'Modos de Exibição'), icon: 'article', prio: 6, cells: [
            large('view:read'), large('view:print'), large('view:web'),
            { rows: [[{ cmd: 'view:outline', label: true }], [{ cmd: 'view:draft', label: true }]] },
            large('focus'),
          ] },
          { id: 'show', label: L('Show', 'Mostrar'), icon: 'visibility', prio: 4, cells: [
            { rows: [[{ cmd: 'view:ruler', label: true }], [{ cmd: 'view:gridlines', label: true }], [{ cmd: 'view:navpane', label: true }]] },
            { rows: [[{ cmd: 'marks', label: true }], [{ cmd: 'comments', label: true }], [{ cmd: 'statusbar', label: true }]] },
            { rows: [[{ cmd: 'view:bookmarks', label: true }]] },
          ] },
          { id: 'zoom', label: L('Zoom', 'Zoom'), icon: 'zoom_in', prio: 5, cells: [
            { menu: m.zoomItems, id: 'zoom', label: L('Zoom', 'Zoom'), icon: 'zoom_in', size: 'large' },
            large('zoom100'),
            { rows: [['zoomin'], ['zoomout']] },
          ] },
          { id: 'appearance', label: L('Appearance', 'Aparência'), icon: 'palette', prio: 2, cells: [
            { menu: () => themeMenu(env, ctx), id: 'theme', label: L('Theme', 'Tema'), icon: 'contrast', size: 'large' },
            { menu: () => accentMenu(env, ctx), id: 'accent', label: L('Accent', 'Destaque'), icon: 'palette', size: 'large' },
            { menu: () => ['toolbar:compact', 'toolbar:ribbon'], id: 'toolbarMode', label: L('Toolbar', 'Barra'), icon: 'toolbar', size: 'large' },
          ] },
        ],
      },
      {
        id: 'hf-tools', label: L('Header & Footer', 'Cabeçalho e Rodapé'), contextual: () => env.ed.editingHeaderFooter() !== null, groups: hfToolsGroups(env, ctx),
      },
      {
        id: 'table-design', label: L('Table Design', 'Design da Tabela'), contextual: () => env.ed.editingTableCell(), groups: tableDesignGroups(env, ctx),
      },
      {
        id: 'table-layout', label: L('Table Layout', 'Layout da Tabela'), contextual: () => env.ed.editingTableCell(), groups: tableLayoutGroups(env),
      },
      {
        id: 'image-tools', label: L('Picture Format', 'Formato da Imagem'),
        contextual: () => {
          const f = (env.ed as unknown as { selectedImage?: () => unknown }).selectedImage;
          return typeof f === 'function' && !!f.call(env.ed);
        },
        groups: pictureFormatGroups(env, ctx),
      },
    ],
  };
}

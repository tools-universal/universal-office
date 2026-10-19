// Layouts das duas barras do Write: COMPACTA (Google Docs — menus + linha que
// recolhe por prioridade) e RIBBON (Word — guias, grupos com iniciador de
// diálogo e guias contextuais). Só referenciam comandos e controles; o que
// cada um faz está em chrome-commands.ts / chrome-widgets.ts.
import type { BarContext, BarItem, CompactConfig, MenuEntry, MenuItem, RibbonConfig } from '@universal-office/ui';
import type { WidgetEnv } from './chrome-widgets.js';
import {
  accentMenu, caseMenu, charSpacingMenu, colorMenu, fieldsMenu, fontWidget, highlightMenu, lineSpacingMenu,
  marginsMenu, orientationMenu, paragraphSpacingMenu, saveWidget, shadingMenu, sizeMenu, sizeWidget,
  specialIndentMenu, styleWidget, symbolMenu, tableMenu, themeMenu, titleWidget, zoomItem,
} from './chrome-widgets.js';
import { ZOOMS } from './chrome-commands.js';

/** Submenus compartilhados pelas duas barras. */
function menus(env: WidgetEnv, ctx: BarContext) {
  const sub = (label: { en: string; pt: string }, icon: string | undefined, items: () => MenuEntry[], id?: string): MenuItem =>
    ({ id, label, icon, submenu: items });
  const autosave = (): MenuItem[] => ([[0, 'Off', 'Desligado'], [1, '1 min', '1 min'], [5, '5 min', '5 min'],
    [10, '10 min (Word)', '10 min (Word)'], [30, '30 min', '30 min']] as const).map(([n, en, pt]) => ({
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
    breaks: sub({ en: 'Break', pt: 'Quebra' }, 'insert_page_break', () => ['pagebreak', 'columnbreak', 'sectionbreak'], 'breaks'),
    hf: sub({ en: 'Headers & footers', pt: 'Cabeçalhos e rodapés' }, 'call_to_action', () => ['header', 'footer'], 'hf'),
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
    ], 'page'),
    trackChanges: sub({ en: 'Track changes', pt: 'Controlar alterações' }, 'track_changes', () => ['trackChanges', '-', 'change:accept', 'change:reject', 'change:acceptAll', 'change:rejectAll'], 'tracking'),
    comments: sub({ en: 'Comments', pt: 'Comentários' }, 'comment', () => ['comment', 'comment:prev', 'comment:next', 'comment:delete', 'comment:deleteAll', '-', 'comments'], 'commentsMenu'),
  };
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
      { id: 'view', label: { en: 'View', pt: 'Ver' }, items: () => ['view:print', 'view:web', 'view:read', 'focus', '-', 'marks', 'comments', '-', m.zoom, '-', m.theme, m.accent, m.toolbar] },
      { id: 'insert', label: { en: 'Insert', pt: 'Inserir' }, items: () => ['image', 'table', 'link', 'comment', '-', m.breaks, m.hf, m.fields, 'toc', '-', 'footnote', 'endnote', 'bookmark', 'textbox', m.symbols] },
      { id: 'format', label: { en: 'Format', pt: 'Formatar' }, items: () => [m.text, m.color, m.highlight, m.styles, '-', m.align, m.spacing, m.lists, m.shading, 'borders', m.charSpacing, '-', m.page, '-', 'dlg:font', 'dlg:paragraph', '-', 'clear'] },
      { id: 'tools', label: { en: 'Tools', pt: 'Ferramentas' }, items: () => ['spelling', 'wordCount', '-', m.trackChanges, m.comments, '-', 'compare', 'mailmerge', '-', 'fontAccess', 'hyphenation', '-', 'enableEditing'] },
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
              ['list:bullet', 'list:decimal', 'outdent', 'indent', 'marks'],
              ['align:left', 'align:center', 'align:right', 'align:both',
                { menu: () => lineSpacingMenu(env, ctx), id: 'spacing', label: L('Line & paragraph spacing', 'Espaçamento entre linhas e parágrafos'), icon: 'format_line_spacing' },
                { split: 'shading', menu: () => shadingMenu(env, ctx) }, 'borders'],
            ] },
          ] },
          { id: 'styles', label: L('Styles', 'Estilos'), icon: 'style', prio: 5, cells: [
            { rows: [[styleWidget(env, 150)]] },
          ] },
          { id: 'editing', label: L('Editing', 'Edição'), icon: 'search', prio: 4, cells: [
            { rows: [[{ cmd: 'find', label: true }], [{ cmd: 'replace', label: true }], [{ cmd: 'selectAll', label: true }]] },
          ] },
        ],
      },
      {
        id: 'insert', label: L('Insert', 'Inserir'), groups: [
          { id: 'pages', label: L('Pages', 'Páginas'), icon: 'insert_page_break', prio: 4, cells: [large('pagebreak')] },
          { id: 'tables', label: L('Tables', 'Tabelas'), icon: 'table', prio: 6, cells: [{ menu: () => tableMenu(env, ctx), id: 'table:menu', label: L('Table', 'Tabela'), icon: 'table', size: 'large', supports: has('insertTable') }] },
          { id: 'illustrations', label: L('Illustrations', 'Ilustrações'), icon: 'image', prio: 6, cells: [large('image')] },
          { id: 'links', label: L('Links', 'Links'), icon: 'link', prio: 5, cells: [large('link'), { rows: [['bookmark']] }] },
          { id: 'comments', label: L('Comments', 'Comentários'), icon: 'add_comment', prio: 5, cells: [large('comment')] },
          { id: 'hf', label: L('Header & Footer', 'Cabeçalho e Rodapé'), icon: 'call_to_action', prio: 4, cells: [
            large('header'), large('footer'),
            { menu: fieldsMenu, id: 'fields', label: L('Page Number', 'Número de Página'), icon: 'numbers', size: 'large' },
          ] },
          { id: 'text', label: L('Text', 'Texto'), icon: 'text_fields', prio: 3, cells: [
            large('textbox'),
            { rows: [[{ cmd: 'field:date', label: true }], [{ menu: () => symbolMenu(env, ctx), id: 'symbols', label: L('Symbol', 'Símbolo'), icon: 'special_character', showLabel: true }]] },
          ] },
          { id: 'notes', label: L('Notes', 'Notas'), icon: 'notes', prio: 2, cells: [large('footnote'), large('endnote')] },
        ],
      },
      {
        id: 'design', label: L('Design', 'Design'), groups: [
          { id: 'formatting', label: L('Document Formatting', 'Formatação do Documento'), icon: 'style', prio: 5, cells: [
            { menu: () => paragraphSpacingMenu(env, ctx), id: 'pspacing', label: L('Paragraph Spacing', 'Espaçamento entre Parágrafos'), icon: 'format_line_spacing', size: 'large' },
          ] },
          { id: 'background', label: L('Page Background', 'Plano de Fundo da Página'), icon: 'format_color_fill', prio: 4, cells: [
            { cmd: 'pageColor', size: 'large' }, { cmd: 'watermark', size: 'large' },
          ] },
        ],
      },
      {
        id: 'layout', label: L('Layout', 'Layout'), groups: [
          { id: 'pagesetup', label: L('Page Setup', 'Configurar Página'), icon: 'description', prio: 6, launcher: 'dlg:page', cells: [
            { menu: () => marginsMenu(env, ctx), id: 'margins', label: L('Margins', 'Margens'), icon: 'margin', size: 'large' },
            { menu: () => orientationMenu(env, ctx), id: 'orientation', label: L('Orientation', 'Orientação'), icon: 'crop_rotate', size: 'large' },
            { menu: () => sizeMenu(env, ctx), id: 'pageSize', label: L('Size', 'Tamanho'), icon: 'aspect_ratio', size: 'large' },
            { menu: () => ['pagebreak', 'columnbreak', 'sectionbreak'], id: 'breaks', label: L('Breaks', 'Quebras'), icon: 'insert_page_break', size: 'large' },
            { rows: [['hyphenation']] },
          ] },
          { id: 'paragraph', label: L('Paragraph', 'Parágrafo'), icon: 'format_indent_increase', prio: 5, launcher: 'dlg:paragraph', cells: [
            { rows: [
              [{ cmd: 'outdent', label: true }, { cmd: 'indent', label: true }],
              [{ menu: () => specialIndentMenu(env, ctx), id: 'specialIndent', label: L('Special indent', 'Recuo especial'), icon: 'format_indent_increase', showLabel: true }],
              [{ menu: () => lineSpacingMenu(env, ctx), id: 'spacing', label: L('Spacing', 'Espaçamento'), icon: 'format_line_spacing', showLabel: true }],
            ] },
          ] },
        ],
      },
      {
        id: 'references', label: L('References', 'Referências'), groups: [
          { id: 'toc', label: L('Table of Contents', 'Sumário'), icon: 'toc', prio: 5, cells: [large('toc')] },
          { id: 'footnotes', label: L('Footnotes', 'Notas de Rodapé'), icon: 'notes', prio: 4, cells: [large('footnote'), { rows: [['endnote']] }] },
        ],
      },
      {
        id: 'mailings', label: L('Mailings', 'Correspondências'), groups: [
          { id: 'merge', label: L('Mail Merge', 'Mala Direta'), icon: 'mail', prio: 5, cells: [large('mailmerge'), large('mergefield')] },
        ],
      },
      {
        id: 'review', label: L('Review', 'Revisão'), groups: [
          { id: 'proofing', label: L('Proofing', 'Revisão de Texto'), icon: 'spellcheck', prio: 5, cells: [large('spelling'), { rows: [[{ cmd: 'wordCount', label: true }]] }] },
          { id: 'comments', label: L('Comments', 'Comentários'), icon: 'comment', prio: 6, cells: [
            large('comment'),
            { rows: [[{ cmd: 'comment:delete', label: true }], [{ cmd: 'comment:prev', label: true }], [{ cmd: 'comment:next', label: true }]] },
            { cmd: 'comments', size: 'large' },
          ] },
          { id: 'tracking', label: L('Tracking', 'Controle'), icon: 'track_changes', prio: 4, cells: [large('trackChanges')] },
          { id: 'changes', label: L('Changes', 'Alterações'), icon: 'check_circle', prio: 3, cells: [large('change:accept'), large('change:reject')] },
          { id: 'compare', label: L('Compare', 'Comparar'), icon: 'compare', prio: 3, cells: [large('compare')] },
          { id: 'protect', label: L('Protect', 'Proteger'), icon: 'edit_document', prio: 2, cells: [large('enableEditing')] },
        ],
      },
      {
        id: 'view', label: L('View', 'Exibir'), groups: [
          { id: 'views', label: L('Views', 'Modos de Exibição'), icon: 'article', prio: 6, cells: [large('view:read'), large('view:print'), large('view:web')] },
          { id: 'immersive', label: L('Immersive', 'Imersivo'), icon: 'center_focus_strong', prio: 4, cells: [large('focus')] },
          { id: 'show', label: L('Show', 'Mostrar'), icon: 'visibility', prio: 3, cells: [{ rows: [[{ cmd: 'marks', label: true }], [{ cmd: 'comments', label: true }], [{ cmd: 'statusbar', label: true }]] }] },
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
        id: 'hf-tools', label: L('Header & Footer', 'Cabeçalho e Rodapé'), contextual: () => env.ed.editingHeaderFooter() !== null, groups: [
          { id: 'hf-insert', label: L('Insert', 'Inserir'), icon: 'numbers', prio: 5, cells: [large('field:page'), large('field:numpages'), large('field:date')] },
          { id: 'hf-close', label: L('Close', 'Fechar'), icon: 'close', prio: 9, cells: [large('hf:close')] },
        ],
      },
      {
        id: 'table-tools', label: L('Table', 'Tabela'), contextual: () => env.ed.editingTableCell(), groups: [
          { id: 'rows', label: L('Rows & Columns', 'Linhas e Colunas'), icon: 'table_rows', prio: 5, cells: [
            large('row:above'), large('row:below'), large('col:left'), large('col:right'),
            { rows: [['row:delete'], ['col:delete'], ['table:delete']] },
          ] },
          { id: 'merge', label: L('Merge', 'Mesclar'), icon: 'cell_merge', prio: 4, cells: [large('cells:merge'), large('cells:split')] },
        ],
      },
      {
        id: 'image-tools', label: L('Picture', 'Imagem'),
        contextual: () => {
          const f = (env.ed as unknown as { selectedImage?: () => unknown }).selectedImage;
          return typeof f === 'function' && !!f.call(env.ed);
        },
        groups: [
          { id: 'image', label: L('Picture', 'Imagem'), icon: 'image', prio: 5, cells: [large('image:delete')] },
        ],
      },
    ],
  };
}

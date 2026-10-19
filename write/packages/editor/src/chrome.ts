// Built-in chrome for <universal-write>: an optional top toolbar and bottom
// status bar, toggled via the boolean `topbar` and `bottombar` attributes.
// Loaded on demand (dynamic import) so the default (no bars) never pulls in
// Material. The toolbar has two rows, modeled on a word processor's Standard +
// Formatting toolbars.
import '@universal-material/web/button/button.js';
import '@universal-material/web/button/icon-button.js';
import { ThemeBuilder } from '@universal-material/web/theme/index.js';
import { ICON } from './chrome-icons.js';
import type { UniversalWriteElement } from './universal-write.js';
import { pickLabels, type UiLang } from '@universal-office/i18n';

// Textos da barra no idioma da interface (`lang` do <universal-write> ou o do
// navegador; inglês por padrão — ver @universal-office/i18n). Em pt, os nomes
// do Word pt-BR.
const LABELS = {
  en: {
    new: 'New document', open: 'Open .docx', save: 'Save .docx', cut: 'Cut', copy: 'Copy', paste: 'Paste',
    painter: 'Clone formatting', clear: 'Clear direct formatting', undo: 'Undo', redo: 'Redo',
    find: 'Find & replace', image: 'Insert image', pagebreak: 'Insert page break', comment: 'Insert comment',
    toc: 'Update table of contents', marks: 'Formatting marks', style: 'Paragraph style', font: 'Font',
    shrink: 'Decrease font size', size: 'Font size', grow: 'Increase font size', bold: 'Bold', italic: 'Italic',
    underline: 'Underline', strike: 'Strikethrough', sup: 'Superscript', sub: 'Subscript', color: 'Font color',
    hl: 'Highlight color', alignLeft: 'Align left', alignCenter: 'Align center', alignRight: 'Align right',
    justify: 'Justify', spacing: 'Line spacing', bullets: 'Bulleted list', numbered: 'Numbered list',
    outdent: 'Decrease indent', indent: 'Increase indent', print: 'Print layout', web: 'Web layout',
    read: 'Read mode', zoomOut: 'Zoom out', zoomIn: 'Zoom in',
    heading: (n: number) => `Heading ${n}`, title: 'Title',
    noHighlight: 'No highlight', yellow: 'Yellow', green: 'Green', cyan: 'Cyan', magenta: 'Magenta',
    decimal: '.', fileName: 'document.docx',
    findPrompt: 'Find:', replacePrompt: 'Replace with (blank = just find next):', noMatches: 'No matches',
    commentPrompt: 'Comment:',
    status: (page: number, pages: number, words: number) =>
      `Page ${page} of ${pages} · ${words} word${words === 1 ? '' : 's'}`,
  },
  pt: {
    new: 'Novo documento', open: 'Abrir .docx', save: 'Salvar .docx', cut: 'Recortar', copy: 'Copiar', paste: 'Colar',
    painter: 'Pincel de formatação', clear: 'Limpar formatação direta', undo: 'Desfazer', redo: 'Refazer',
    find: 'Localizar e substituir', image: 'Inserir imagem', pagebreak: 'Inserir quebra de página',
    comment: 'Inserir comentário', toc: 'Atualizar sumário', marks: 'Marcas de formatação',
    style: 'Estilo de parágrafo', font: 'Fonte', shrink: 'Diminuir fonte', size: 'Tamanho da fonte',
    grow: 'Aumentar fonte', bold: 'Negrito', italic: 'Itálico', underline: 'Sublinhado', strike: 'Tachado',
    sup: 'Sobrescrito', sub: 'Subscrito', color: 'Cor da fonte', hl: 'Cor do realce do texto',
    alignLeft: 'Alinhar à esquerda', alignCenter: 'Centralizar', alignRight: 'Alinhar à direita',
    justify: 'Justificar', spacing: 'Espaçamento entre linhas', bullets: 'Marcadores', numbered: 'Numeração',
    outdent: 'Diminuir recuo', indent: 'Aumentar recuo', print: 'Layout de impressão', web: 'Layout da Web',
    read: 'Modo de leitura', zoomOut: 'Diminuir zoom', zoomIn: 'Aumentar zoom',
    heading: (n: number) => `Título ${n}`, title: 'Título',
    noHighlight: 'Sem realce', yellow: 'Amarelo', green: 'Verde', cyan: 'Turquesa', magenta: 'Rosa',
    decimal: ',', fileName: 'documento.docx',
    findPrompt: 'Localizar:', replacePrompt: 'Substituir por (em branco = só localizar a próxima):',
    noMatches: 'Nenhuma ocorrência', commentPrompt: 'Comentário:',
    status: (page: number, pages: number, words: number) =>
      `Página ${page} de ${pages} · ${words} palavra${words === 1 ? '' : 's'}`,
  },
};
type Labels = typeof LABELS.en;

const svg = (name: string): string =>
  `<svg class="uw-ic" viewBox="0 -960 960 960" aria-hidden="true">${ICON[name] ?? ''}</svg>`;

const iconBtn = (id: string, name: string, title: string): string =>
  `<u-icon-button shape="square" variant="standard" data-a="${id}" title="${title}">${svg(name)}</u-icon-button>`;

const textBtn = (id: string, text: string, title: string): string =>
  `<u-icon-button shape="square" variant="standard" data-a="${id}" title="${title}"><span class="uw-glyph">${text}</span></u-icon-button>`;

const sel = (id: string, title: string, options: string, cls = 'uw-sel'): string =>
  `<select class="${cls}" data-a="${id}" title="${title}">${options}</select>`;

const SEP = '<span class="uw-sep"></span>';

let themeStyle: HTMLStyleElement | null = null;
function ensureTheme(): void {
  if (themeStyle) return;
  themeStyle = document.createElement('style');
  themeStyle.id = 'uw-theme';
  themeStyle.textContent = ThemeBuilder.create('#1A73E8').build();
  document.head.appendChild(themeStyle);
  if (!document.documentElement.style.colorScheme) {
    document.documentElement.style.colorScheme = 'light dark';
  }
}

export const CHROME_CSS = /* css */ `
.uw-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 6px 10px;
  font-family: system-ui, sans-serif; box-sizing: border-box; width: 100%; }
.uw-topbar .uw-bar { gap: 2px; padding: 4px 8px; }
.uw-topbar .uw-bar + .uw-bar { padding-top: 0; }
.uw-ic { width: 20px; height: 20px; display: inline-block; fill: currentColor; pointer-events: none; }
.uw-glyph { font-size: 17px; line-height: 1; pointer-events: none; }
.uw-sep { width: 1px; align-self: stretch; margin: 4px 4px; background: var(--u-color-outline-variant, #ccc); }
.uw-spacer { flex: 1 1 auto; }
.uw-topbar u-icon-button, .uw-topbar u-button, .uw-bottombar u-icon-button { vertical-align: middle; }
.uw-sel, .uw-size {
  font: inherit; font-size: 12.5px; height: 30px;
  border: 1px solid var(--u-color-outline-variant, #ccc); border-radius: 6px;
  background: var(--u-color-surface, #fff); color: var(--u-color-on-surface, #1b1b1f);
}
.uw-sel { padding: 0 4px; max-width: 132px; }
.uw-size { width: 46px; text-align: center; padding: 0 4px; }
.uw-color {
  width: 32px; height: 30px; padding: 2px; cursor: pointer;
  border: 1px solid var(--u-color-outline-variant, #ccc); border-radius: 6px;
  background: var(--u-color-surface, #fff);
}
.uw-status { font-size: 12.5px; color: var(--u-color-on-surface-variant, #555);
  font-variant-numeric: tabular-nums; padding: 0 4px; }
.uw-bottombar .uw-bar { padding: 4px 12px; }
.uw-view { display: inline-flex; gap: 2px; }
`;

interface ChromeHandle { sync: () => void; }

function download(data: Uint8Array | string, name: string, type: string): void {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const styleOpts = (L: Labels): string => `<option value="">Normal</option>`
  + [1, 2, 3].map((n) => `<option value="Heading${n}">${L.heading(n)}</option>`).join('')
  + `<option value="Title">${L.title}</option>`;
const FONT_OPTS = `<option>Aptos</option><option>Calibri</option>`;
const hlOpts = (L: Labels): string => `<option value="">${L.noHighlight}</option>`
  + (['yellow', 'green', 'cyan', 'magenta'] as const).map((c) => `<option value="${c}">${L[c]}</option>`).join('');
const spacingOpts = (L: Labels): string => ([[240, '1.0'], [276, '1.15'], [360, '1.5'], [480, '2.0']] as const)
  .map(([v, t]) => `<option value="${v}">${t.replace('.', L.decimal)}</option>`).join('');

// ── Top toolbar (two rows: Standard + Formatting) ─────────────────────────
function buildToolbar(el: HTMLElement, editor: UniversalWriteElement, L: Labels): () => void {
  el.innerHTML = `<div class="uw-bar">
    ${iconBtn('new', 'note_add', L.new)}
    ${iconBtn('open', 'folder_open', L.open)}
    ${iconBtn('save', 'save', L.save)}
    ${SEP}
    ${iconBtn('cut', 'content_cut', L.cut)}
    ${iconBtn('copy', 'content_copy', L.copy)}
    ${iconBtn('paste', 'content_paste', L.paste)}
    ${iconBtn('painter', 'format_paint', L.painter)}
    ${iconBtn('clear', 'format_clear', L.clear)}
    ${SEP}
    ${iconBtn('undo', 'undo', L.undo)}
    ${iconBtn('redo', 'redo', L.redo)}
    ${SEP}
    ${iconBtn('find', 'find_replace', L.find)}
    ${SEP}
    ${iconBtn('image', 'image', L.image)}
    ${iconBtn('pagebreak', 'insert_page_break', L.pagebreak)}
    ${iconBtn('comment', 'add_comment', L.comment)}
    ${iconBtn('toc', 'toc', L.toc)}
    ${SEP}
    ${textBtn('marks', '&para;', L.marks)}
    <input type="file" data-a="file-docx" accept=".docx,.doc,.odt" hidden />
    <input type="file" data-a="file-img" accept="image/*" hidden />
  </div>
  <div class="uw-bar">
    ${sel('style', L.style, styleOpts(L))}
    ${sel('font', L.font, FONT_OPTS)}
    ${textBtn('shrink', 'A&minus;', L.shrink)}
    <input type="number" class="uw-size" data-a="size" min="1" max="400" title="${L.size}" />
    ${textBtn('grow', 'A+', L.grow)}
    ${SEP}
    ${iconBtn('bold', 'format_bold', L.bold)}
    ${iconBtn('italic', 'format_italic', L.italic)}
    ${iconBtn('underline', 'format_underlined', L.underline)}
    ${iconBtn('strike', 'format_strikethrough', L.strike)}
    ${iconBtn('sup', 'superscript', L.sup)}
    ${iconBtn('sub', 'subscript', L.sub)}
    ${SEP}
    <input type="color" class="uw-color" data-a="color" title="${L.color}" value="#000000" />
    ${sel('hl', L.hl, hlOpts(L))}
    ${SEP}
    ${iconBtn('align:left', 'format_align_left', L.alignLeft)}
    ${iconBtn('align:center', 'format_align_center', L.alignCenter)}
    ${iconBtn('align:right', 'format_align_right', L.alignRight)}
    ${iconBtn('align:both', 'format_align_justify', L.justify)}
    ${SEP}
    ${sel('spacing', L.spacing, spacingOpts(L))}
    ${iconBtn('list:bullet', 'format_list_bulleted', L.bullets)}
    ${iconBtn('list:decimal', 'format_list_numbered', L.numbered)}
    ${iconBtn('outdent', 'format_indent_decrease', L.outdent)}
    ${iconBtn('indent', 'format_indent_increase', L.indent)}
  </div>`;

  const fileDocx = el.querySelector<HTMLInputElement>('[data-a="file-docx"]')!;
  const fileImg = el.querySelector<HTMLInputElement>('[data-a="file-img"]')!;

  const act: Record<string, () => void> = {
    new: () => editor.newDocument(),
    open: () => fileDocx.click(),
    save: () => void editor.save('docx').then((d) => download(d as Uint8Array, L.fileName, DOCX_MIME)),
    cut: () => void editor.cut(),
    copy: () => void editor.copy(),
    paste: () => void editor.paste(),
    painter: () => editor.copyFormat(),
    clear: () => editor.clearFormatting(),
    undo: () => editor.undo(),
    redo: () => editor.redo(),
    find: () => {
      const q = prompt(L.findPrompt);
      if (!q) return;
      const r = prompt(L.replacePrompt);
      if (r) { const n = editor.replaceAll(q, r); if (n === 0) alert(L.noMatches); }
      else editor.findNext(q);
    },
    image: () => fileImg.click(),
    pagebreak: () => editor.insertPageBreak(),
    comment: () => { const t = prompt(L.commentPrompt); if (t) editor.addComment(t); },
    toc: () => editor.updateToc(),
    marks: () => editor.toggleMarks(),
    bold: () => editor.toggleRunProp('bold'),
    italic: () => editor.toggleRunProp('italic'),
    underline: () => editor.toggleRunProp('underline'),
    strike: () => editor.toggleRunProp('strike'),
    sup: () => editor.toggleVertAlign('superscript'),
    sub: () => editor.toggleVertAlign('subscript'),
    grow: () => editor.growFont(1),
    shrink: () => editor.growFont(-1),
    'align:left': () => editor.setAlignment('left'),
    'align:center': () => editor.setAlignment('center'),
    'align:right': () => editor.setAlignment('right'),
    'align:both': () => editor.setAlignment('both'),
    'list:bullet': () => editor.toggleList('bullet'),
    'list:decimal': () => editor.toggleList('decimal'),
    outdent: () => editor.indent(-1),
    indent: () => editor.indent(1),
  };

  el.querySelectorAll<HTMLElement>('u-icon-button[data-a], u-button[data-a]').forEach((b) => {
    const key = b.dataset['a']!;
    b.addEventListener('click', () => { act[key]?.(); editor.focusEditor(); });
  });

  fileDocx.addEventListener('change', async () => {
    const f = fileDocx.files?.[0];
    if (!f) return;
    editor.load(new Uint8Array(await f.arrayBuffer()), 'auto', { protected: false });
    editor.focusEditor();
    fileDocx.value = '';
  });
  fileImg.addEventListener('change', async () => {
    const f = fileImg.files?.[0];
    if (!f) return;
    const ext = f.type.replace('image/', '') || 'png';
    await editor.insertImage(new Uint8Array(await f.arrayBuffer()), ext);
    editor.focusEditor();
    fileImg.value = '';
  });

  const styleSel = el.querySelector<HTMLSelectElement>('[data-a="style"]')!;
  // O dropdown de estilos reflete os estilos de PARÁGRAFO REAIS do documento.
  // A barra é montada antes de qualquer documento carregar, então repovoamos
  // quando a lista muda (chamado no sync). Os hardcoded (Heading1/Title) só
  // valem para documentos novos sem styles.xml.
  let styleSig = '';
  const syncStyleOptions = (): void => {
    const ds = editor.paragraphStyles();
    if (!ds.length) return;
    const sig = ds.map((s) => s.id).join('|');
    if (sig === styleSig) return;
    styleSig = sig;
    styleSel.replaceChildren();
    for (const s of ds) {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = s.name;
      styleSel.appendChild(o);
    }
  };
  const fontSel = el.querySelector<HTMLSelectElement>('[data-a="font"]')!;
  const sizeInp = el.querySelector<HTMLInputElement>('[data-a="size"]')!;
  const colorInp = el.querySelector<HTMLInputElement>('[data-a="color"]')!;
  const hlSel = el.querySelector<HTMLSelectElement>('[data-a="hl"]')!;
  const spacingSel = el.querySelector<HTMLSelectElement>('[data-a="spacing"]')!;

  styleSel.addEventListener('change', () => { editor.applyStyle(styleSel.value || undefined); editor.focusEditor(); });
  fontSel.addEventListener('change', () => { editor.setFontFamily(fontSel.value); editor.focusEditor(); });

  // seletor de fonte: o que o resolvedor de fontes enxerga (Electron: todas as
  // do SO; navegador: as instaladas descobertas pelo nome + abertas embarcadas)
  // + as carregadas do documento. No Chromium, o 1º gesto no seletor pede a
  // Local Font Access (queryLocalFonts exige interação) e a lista completa.
  const escOpt = (s: string): string =>
    s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c));
  const fillFonts = (families: string[]): void => {
    const cur = fontSel.value;
    // a fonte no cursor fora da lista segue como opção dinâmica (ver sync)
    const dyn = cur && !families.includes(cur) ? `<option data-dyn="1">${escOpt(cur)}</option>` : '';
    fontSel.innerHTML = dyn + families.map((f) => `<option>${escOpt(f)}</option>`).join('');
    fontSel.value = cur;
  };
  fillFonts(editor.knownFontFamilies());
  const listFonts = (): void => { void editor.listAvailableFonts().then(fillFonts); };
  listFonts();
  let accessAsked = false;
  const askFontAccess = (): void => {
    if (accessAsked || editor.hasHostSystemFonts()) return;
    accessAsked = true;
    void editor.requestSystemFonts().then((ok) => { if (ok) listFonts(); });
  };
  fontSel.addEventListener('mousedown', askFontAccess);
  fontSel.addEventListener('focus', askFontAccess);
  sizeInp.addEventListener('change', () => { const v = Number(sizeInp.value); if (v > 0) editor.setFontSize(v); editor.focusEditor(); });
  colorInp.addEventListener('change', () => { editor.setColor(colorInp.value.slice(1).toUpperCase()); editor.focusEditor(); });
  hlSel.addEventListener('change', () => { editor.setHighlight(hlSel.value || undefined); editor.focusEditor(); });
  spacingSel.addEventListener('change', () => { editor.setLineSpacing(Number(spacingSel.value)); editor.focusEditor(); });

  const setActive = (key: string, on: boolean): void => {
    el.querySelector(`[data-a="${key}"]`)?.toggleAttribute('selected', on);
  };
  let lastFontCount = 0;
  return () => {
    syncStyleOptions();
    // re-popula o seletor conforme novas famílias carregam (embedadas do doc);
    // a lista do resolvedor é cacheada (o host pode ser ligado depois de o
    // elemento montar a barra — a próxima sincronização já o enxerga)
    const known = editor.knownFontFamilies();
    if (known.length !== lastFontCount && document.activeElement !== fontSel) {
      lastFontCount = known.length;
      listFonts();
    }
    const st = editor.getSelectionState();
    const run = st.run as unknown as Record<string, unknown>;
    const para = st.para as unknown as Record<string, unknown>;
    setActive('bold', !!run['bold']);
    setActive('italic', !!run['italic']);
    setActive('underline', !!run['underline']);
    setActive('strike', !!run['strike']);
    setActive('sup', run['vertAlign'] === 'superscript');
    setActive('sub', run['vertAlign'] === 'subscript');
    setActive('painter', editor.painterActive());
    setActive('marks', !!st.marks);
    const a = para['alignment'];
    setActive('align:left', a === 'left' || a === undefined);
    setActive('align:center', a === 'center');
    setActive('align:right', a === 'right');
    setActive('align:both', a === 'both');
    const list = (para['numbering'] as { kind?: string } | undefined)?.kind;
    setActive('list:bullet', list === 'bullet');
    setActive('list:decimal', list === 'decimal');
    // reflect current values in the selects/inputs
    // parágrafo sem w:pStyle (ou com estilo fora da lista) usa 'Normal'
    const curStyle = (para['styleId'] as string) || 'Normal';
    styleSel.value = curStyle;
    if (styleSel.value !== curStyle && styleSel.querySelector('option[value="Normal"]')) {
      styleSel.value = 'Normal';
    }
    // the font may not be one of our options (docs use any font) — inject it so
    // the dropdown always shows the real font at the caret.
    const font = (run['fontAscii'] as string) ?? '';
    fontSel.querySelector('option[data-dyn]')?.remove();
    const hasOpt = !!font && [...fontSel.options].some((o) => o.value === font || o.textContent === font);
    if (font && !hasOpt) {
      const opt = document.createElement('option');
      opt.value = font; opt.textContent = font; opt.dataset['dyn'] = '1';
      fontSel.insertBefore(opt, fontSel.firstChild);
    }
    fontSel.value = font;
    const half = run['szHalfPt'] as number | undefined;
    if (half) sizeInp.value = String(half / 2);
    const color = run['color'] as string | undefined;
    if (color && /^[0-9a-fA-F]{6}$/.test(color)) colorInp.value = `#${color}`;
  };
}

// ── Bottom status bar ─────────────────────────────────────────────────────
function buildBottomBar(el: HTMLElement, editor: UniversalWriteElement, L: Labels): () => void {
  el.innerHTML = `<div class="uw-bar">
    <span class="uw-status" data-a="status"></span>
    <span class="uw-spacer"></span>
    <span class="uw-view">
      ${iconBtn('view:print', 'article', L.print)}
      ${iconBtn('view:web', 'language', L.web)}
      ${iconBtn('view:read', 'menu_book', L.read)}
    </span>
    <span class="uw-sep"></span>
    ${iconBtn('zoomout', 'zoom_out', L.zoomOut)}
    <span class="uw-status" data-a="zoom" style="min-width:44px;text-align:center"></span>
    ${iconBtn('zoomin', 'zoom_in', L.zoomIn)}
  </div>`;

  const act: Record<string, () => void> = {
    'view:print': () => editor.setView('print'),
    'view:web': () => editor.setView('web'),
    'view:read': () => editor.setView('read'),
    zoomout: () => editor.setZoom(Math.max(0.2, editor.getZoom() - 0.1)),
    zoomin: () => editor.setZoom(Math.min(5, editor.getZoom() + 0.1)),
  };
  el.querySelectorAll<HTMLElement>('[data-a]').forEach((b) => {
    const key = b.dataset['a']!;
    if (act[key]) b.addEventListener('click', () => { act[key]!(); editor.focusEditor(); });
  });

  const statusEl = el.querySelector<HTMLElement>('[data-a="status"]')!;
  const zoomEl = el.querySelector<HTMLElement>('[data-a="zoom"]')!;
  return () => {
    const s = editor.stats();
    statusEl.textContent = L.status(s.page, s.pages, s.words);
    zoomEl.textContent = `${Math.round(editor.getZoom() * 100)}%`;
    const view = editor.getView();
    for (const v of ['print', 'web', 'read'] as const) {
      el.querySelector(`[data-a="view:${v}"]`)?.toggleAttribute('selected', view === v);
    }
  };
}

export function setupChrome(
  editor: UniversalWriteElement,
  topbarEl: HTMLElement,
  bottombarEl: HTMLElement,
  opts: { topbar: boolean; bottombar: boolean; lang: UiLang },
): ChromeHandle {
  ensureTheme();

  // inject chrome CSS into the shadow root once
  const root = topbarEl.getRootNode() as ShadowRoot;
  if (!root.querySelector('#uw-chrome-style')) {
    const s = document.createElement('style');
    s.id = 'uw-chrome-style';
    s.textContent = CHROME_CSS;
    root.appendChild(s);
  }

  const syncers: Array<() => void> = [];
  topbarEl.replaceChildren();
  const L = pickLabels(opts.lang, LABELS);
  if (opts.topbar) syncers.push(buildToolbar(topbarEl, editor, L));
  bottombarEl.replaceChildren();
  if (opts.bottombar) syncers.push(buildBottomBar(bottombarEl, editor, L));

  const sync = (): void => { for (const fn of syncers) fn(); };
  sync();
  return { sync };
}

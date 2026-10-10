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

const STYLE_OPTS = `<option value="">Normal</option><option value="Heading1">Heading 1</option>`
  + `<option value="Heading2">Heading 2</option><option value="Heading3">Heading 3</option>`
  + `<option value="Title">Title</option>`;
const FONT_OPTS = `<option>Aptos</option><option>Calibri</option>`;
const HL_OPTS = `<option value="">No highlight</option><option value="yellow">Yellow</option>`
  + `<option value="green">Green</option><option value="cyan">Cyan</option><option value="magenta">Magenta</option>`;
const SPACING_OPTS = `<option value="240">1.0</option><option value="276">1.15</option>`
  + `<option value="360">1.5</option><option value="480">2.0</option>`;

// ── Top toolbar (two rows: Standard + Formatting) ─────────────────────────
function buildToolbar(el: HTMLElement, editor: UniversalWriteElement): () => void {
  el.innerHTML = `<div class="uw-bar">
    ${iconBtn('new', 'note_add', 'New document')}
    ${iconBtn('open', 'folder_open', 'Open .docx')}
    ${iconBtn('save', 'save', 'Save .docx')}
    ${SEP}
    ${iconBtn('cut', 'content_cut', 'Cut')}
    ${iconBtn('copy', 'content_copy', 'Copy')}
    ${iconBtn('paste', 'content_paste', 'Paste')}
    ${iconBtn('painter', 'format_paint', 'Clone formatting')}
    ${iconBtn('clear', 'format_clear', 'Clear direct formatting')}
    ${SEP}
    ${iconBtn('undo', 'undo', 'Undo')}
    ${iconBtn('redo', 'redo', 'Redo')}
    ${SEP}
    ${iconBtn('find', 'find_replace', 'Find & replace')}
    ${SEP}
    ${iconBtn('image', 'image', 'Insert image')}
    ${iconBtn('pagebreak', 'insert_page_break', 'Insert page break')}
    ${iconBtn('comment', 'add_comment', 'Insert comment')}
    ${iconBtn('toc', 'toc', 'Update table of contents')}
    ${SEP}
    ${textBtn('marks', '&para;', 'Formatting marks')}
    <input type="file" data-a="file-docx" accept=".docx,.odt" hidden />
    <input type="file" data-a="file-img" accept="image/*" hidden />
  </div>
  <div class="uw-bar">
    ${sel('style', 'Paragraph style', STYLE_OPTS)}
    ${sel('font', 'Font', FONT_OPTS)}
    ${textBtn('shrink', 'A&minus;', 'Decrease font size')}
    <input type="number" class="uw-size" data-a="size" min="1" max="400" title="Font size" />
    ${textBtn('grow', 'A+', 'Increase font size')}
    ${SEP}
    ${iconBtn('bold', 'format_bold', 'Bold')}
    ${iconBtn('italic', 'format_italic', 'Italic')}
    ${iconBtn('underline', 'format_underlined', 'Underline')}
    ${iconBtn('strike', 'format_strikethrough', 'Strikethrough')}
    ${iconBtn('sup', 'superscript', 'Superscript')}
    ${iconBtn('sub', 'subscript', 'Subscript')}
    ${SEP}
    <input type="color" class="uw-color" data-a="color" title="Font color" value="#000000" />
    ${sel('hl', 'Highlight color', HL_OPTS)}
    ${SEP}
    ${iconBtn('align:left', 'format_align_left', 'Align left')}
    ${iconBtn('align:center', 'format_align_center', 'Align center')}
    ${iconBtn('align:right', 'format_align_right', 'Align right')}
    ${iconBtn('align:both', 'format_align_justify', 'Justify')}
    ${SEP}
    ${sel('spacing', 'Line spacing', SPACING_OPTS)}
    ${iconBtn('list:bullet', 'format_list_bulleted', 'Bulleted list')}
    ${iconBtn('list:decimal', 'format_list_numbered', 'Numbered list')}
    ${iconBtn('outdent', 'format_indent_decrease', 'Decrease indent')}
    ${iconBtn('indent', 'format_indent_increase', 'Increase indent')}
  </div>`;

  const fileDocx = el.querySelector<HTMLInputElement>('[data-a="file-docx"]')!;
  const fileImg = el.querySelector<HTMLInputElement>('[data-a="file-img"]')!;

  const act: Record<string, () => void> = {
    new: () => editor.newDocument(),
    open: () => fileDocx.click(),
    save: () => void editor.save('docx').then((d) => download(d as Uint8Array, 'document.docx', DOCX_MIME)),
    cut: () => void editor.cut(),
    copy: () => void editor.copy(),
    paste: () => void editor.paste(),
    painter: () => editor.copyFormat(),
    clear: () => editor.clearFormatting(),
    undo: () => editor.undo(),
    redo: () => editor.redo(),
    find: () => {
      const q = prompt('Find:');
      if (!q) return;
      const r = prompt('Replace with (blank = just find next):');
      if (r) { const n = editor.replaceAll(q, r); if (n === 0) alert('No matches'); }
      else editor.findNext(q);
    },
    image: () => fileImg.click(),
    pagebreak: () => editor.insertPageBreak(),
    comment: () => { const t = prompt('Comment:'); if (t) editor.addComment(t); },
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

  // seletor de fonte: começa com as famílias conhecidas (bundled + embedadas do
  // doc) e soma as do SO — já de início se o host as fornece (Electron), senão
  // no 1º gesto (queryLocalFonts exige interação).
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
  let sysFontsRequested = false;
  const loadSysFonts = (): void => {
    if (sysFontsRequested) return;
    sysFontsRequested = true;
    void editor.listAvailableFonts().then(fillFonts);
  };
  fontSel.addEventListener('mousedown', loadSysFonts);
  fontSel.addEventListener('focus', loadSysFonts);
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
    // re-popula o seletor conforme novas famílias carregam (embedadas do doc),
    // sem esperar o gesto; já com as do SO pedidas, junta as duas (cacheadas).
    // (o host pode ser ligado depois de o elemento montar a barra: checa aqui)
    if (!sysFontsRequested && editor.hasHostSystemFonts()) loadSysFonts();
    const known = editor.knownFontFamilies();
    if (known.length !== lastFontCount && document.activeElement !== fontSel) {
      lastFontCount = known.length;
      if (sysFontsRequested) void editor.listAvailableFonts().then(fillFonts);
      else fillFonts(known);
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
function buildBottomBar(el: HTMLElement, editor: UniversalWriteElement): () => void {
  el.innerHTML = `<div class="uw-bar">
    <span class="uw-status" data-a="status"></span>
    <span class="uw-spacer"></span>
    <span class="uw-view">
      ${iconBtn('view:print', 'article', 'Print layout')}
      ${iconBtn('view:web', 'language', 'Web layout')}
      ${iconBtn('view:read', 'menu_book', 'Read mode')}
    </span>
    <span class="uw-sep"></span>
    ${iconBtn('zoomout', 'zoom_out', 'Zoom out')}
    <span class="uw-status" data-a="zoom" style="min-width:44px;text-align:center"></span>
    ${iconBtn('zoomin', 'zoom_in', 'Zoom in')}
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
    statusEl.textContent = `Page ${s.page} of ${s.pages} · ${s.words} word${s.words === 1 ? '' : 's'}`;
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
  opts: { topbar: boolean; bottombar: boolean },
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
  if (opts.topbar) syncers.push(buildToolbar(topbarEl, editor));
  bottombarEl.replaceChildren();
  if (opts.bottombar) syncers.push(buildBottomBar(bottombarEl, editor));

  const sync = (): void => { for (const fn of syncers) fn(); };
  sync();
  return { sync };
}

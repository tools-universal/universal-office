import '../src/universal-write.js';
import type { UniversalWriteElement, ViewMode } from '../src/universal-write.js';
import '@universal-office/compare';
import type { UniversalWriteDiffElement } from '@universal-office/compare';
import { createMentionPlugin } from '../src/mention-plugin.js';
import { setupCollapsibleToolbar, setupIconMenus, refreshIconMenus } from './toolbar.js';
import { openMenu, menuOpen, type MenuItem } from './menu.js';
import { openContextMenu, type CtxItem } from './context-menu.js';
import { rippleAll } from './ripple.js';
import { applyGeneratedTheme } from './theme.js';
import { isOdt } from '@universal-office/odf';
import '@universal-material/web/button/button.js';
import '@universal-material/web/button/icon-button.js';
import '@universal-material/web/dialog/dialog.js';

const wn = document.getElementById('wn') as UniversalWriteElement;
wn.use(createMentionPlugin());
const $ = (id: string) => document.getElementById(id)!;
const titleInput = $('docTitle') as HTMLInputElement;

// ───────────────────────── modos de cor ─────────────────────────
// 4 modos. Claro/Escuro são resolvidos pelo `color-scheme` (as variáveis usam
// light-dark()); "Escuro total" ainda escurece a FOLHA do editor (setDarkPage).
type ColorMode = 'auto' | 'light' | 'dark' | 'black';
const MODE_LABELS: Record<ColorMode, string> = { auto: 'Automatic', light: 'Claro', dark: 'Escuro', black: 'Escuro total' };
const MODE_ICONS: Record<ColorMode, string> = { auto: 'brightness_auto', light: 'light_mode', dark: 'dark_mode', black: 'bedtime' };
let colorMode: ColorMode = 'auto';
const prefersDark = matchMedia('(prefers-color-scheme: dark)');
const effectiveDark = (m: ColorMode): boolean =>
  m === 'dark' || m === 'black' || (m === 'auto' && prefersDark.matches);
const applyMode = (m: ColorMode): void => {
  colorMode = m;
  document.documentElement.style.colorScheme = m === 'auto' ? 'light dark' : m === 'light' ? 'light' : 'dark';
  wn.setDarkPage(m === 'black'); // só "Escuro total" deixa a folha preta
  $('darkToggleIcon').textContent = MODE_ICONS[m]; // ícone Material dentro do u-icon-button
  (window as unknown as { wordnext?: { setTitleTheme?: (d: boolean) => void } })
    .wordnext?.setTitleTheme?.(effectiveDark(m));
  localStorage.setItem('uw-mode', m);
};
// "Automatic" reage à troca do SO (folha branca; só chrome/título mudam)
prefersDark.addEventListener('change', () => { if (colorMode === 'auto') applyMode('auto'); });
$('darkToggle').addEventListener('mousedown', (e) => e.preventDefault());
$('darkToggle').addEventListener('click', (e) => {
  e.stopPropagation();
  const item = (m: ColorMode): MenuItem => ({ label: MODE_LABELS[m], checked: colorMode === m, onClick: () => applyMode(m) });
  openMenu([item('auto'), item('light'), item('dark'), item('black')], { anchor: $('darkToggle') });
});

// ───────────── cor de destaque (troca SÓ a cor primária) ─────────────
const accentMenu = $('accentMenu');
const applyAccent = (a: string): void => {
  applyGeneratedTheme(a); // regenera TODA a paleta a partir da cor-semente do accent
  accentMenu.querySelectorAll<HTMLElement>('.accent-sw').forEach((b) =>
    b.classList.toggle('sel', b.dataset.accent === (a || 'neutral')),
  );
};
$('accentBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  if (accentMenu.style.display !== 'none') { accentMenu.style.display = 'none'; return; }
  const r = $('accentBtn').getBoundingClientRect();
  accentMenu.style.display = 'grid';
  accentMenu.style.top = `${r.bottom + 6}px`;
  accentMenu.style.left = `${Math.max(8, r.right - accentMenu.offsetWidth)}px`;
});
accentMenu.querySelectorAll<HTMLElement>('.accent-sw').forEach((b) =>
  b.addEventListener('click', () => { applyAccent(b.dataset.accent!); localStorage.setItem('uw-accent-v2', b.dataset.accent!); accentMenu.style.display = 'none'; }),
);
document.addEventListener('mousedown', (e) => {
  // fecha ao clicar fora — usa closest p/ ignorar cliques no ícone DENTRO do u-icon-button
  if (accentMenu.style.display !== 'none' && !accentMenu.contains(e.target as Node) &&
      !(e.target as HTMLElement)?.closest?.('#accentBtn')) accentMenu.style.display = 'none';
});

// ───────────────────────── menus ─────────────────────────
const menus: [string, string][] = [['menuFile', 'ddFile'], ['menuInsert', 'ddInsert']];
for (const [btn, dd] of menus) {
  $(btn).addEventListener('click', (e) => {
    e.stopPropagation();
    const open = $(dd).classList.contains('show');
    closeMenus();
    if (!open) { $(dd).classList.add('show'); $(btn).classList.add('open'); }
  });
}
function closeMenus(): void {
  for (const [btn, dd] of menus) { $(dd).classList.remove('show'); $(btn).classList.remove('open'); }
}
document.addEventListener('click', closeMenus);

// ───────────────────────── arquivo ─────────────────────────
type FsHandle = FileSystemFileHandle | null;
let fileHandle: FsHandle = null;
const recents: { name: string; handle: FsHandle }[] = [];

// ───── critério do app de referência p/ Modo Protegido ─────
// Electron: Mark-of-the-Web real (Zone.Identifier) via ponte do main process.
// Browser: Trusted Documents — arquivos já habilitados/salvos reabrem editáveis.
interface ElectronBridge {
  openDocx(): Promise<{ name: string; bytes: ArrayBuffer; motw: boolean } | null>;
  /** Diálogo com título custom p/ escolher o outro lado da comparação. */
  openDocxForCompare?(title: string): Promise<{ name: string; bytes: ArrayBuffer } | null>;
}
const bridge = (window as unknown as { wordnext?: ElectronBridge }).wordnext;
// marca o app como Electron → CSS reserva a área dos controles da janela só aqui
document.documentElement.classList.toggle('electron', !!bridge);

const trusted = new Set<string>(JSON.parse(localStorage.getItem('uw-trusted') ?? '[]'));
let currentTrustKey: string | null = null;
const trustKeyOf = (f: File) => `${f.name}|${f.size}|${f.lastModified}`;
const rememberTrust = (key: string | null) => {
  if (!key) return;
  trusted.add(key);
  localStorage.setItem('uw-trusted', JSON.stringify([...trusted]));
};

function setTitle(name: string): void {
  titleInput.value = name.replace(/\.(docx|odt)$/i, '');
  document.title = `${titleInput.value} — Write`;
}

// formato do arquivo aberto/salvo — Save usa esse formato; Save As pode trocar
type DocFormat = 'docx' | 'odt';
let currentFormat: DocFormat = 'docx';
function setCurrentFormat(fmt: DocFormat): void {
  currentFormat = fmt;
  const lbl = document.getElementById('saveBtnLabel');
  if (lbl) lbl.textContent = `Save .${fmt}`;
}

function rememberRecent(name: string, handle: FsHandle): void {
  const i = recents.findIndex((r) => r.name === name);
  if (i >= 0) recents.splice(i, 1);
  recents.unshift({ name, handle });
  recents.splice(6);
  localStorage.setItem('uw-recents', JSON.stringify(recents.map((r) => r.name)));
  renderRecents();
}
function renderRecents(): void {
  const el = $('recentList');
  if (recents.length === 0) { el.textContent = 'Recentes aparecem aqui'; return; }
  el.replaceChildren(...recents.map((r) => {
    const b = document.createElement('button');
    b.textContent = `🕘 ${r.name}`;
    b.addEventListener('click', async () => {
      if (r.handle) {
        const file = await r.handle.getFile();
        openBytes(new Uint8Array(await file.arrayBuffer()), r.name, r.handle, { trustKey: trustKeyOf(file) });
      }
    });
    return b;
  }));
}

function openBytes(
  bytes: Uint8Array,
  name: string,
  handle: FsHandle,
  security?: { motw?: boolean; trustKey?: string },
): void {
  // critério do app de referência: MOTW manda; Trusted Documents libera os já confiados
  const key = security?.trustKey ?? null;
  const isTrusted = key !== null && trusted.has(key);
  const isProtected = security?.motw !== undefined
    ? security.motw && !isTrusted   // Electron: MOTW real
    : !isTrusted;                   // browser: só a lista de confiança
  const isOdtFile = isOdt(bytes) || /\.odt$/i.test(name);
  try {
    if (isOdtFile) wn.loadOdt(bytes, { protected: isProtected });
    else wn.loadDocx(bytes, { protected: isProtected });
  } catch {
    flashStatus(`⚠ "${name}" is not a valid document or is corrupted`);
    return;
  }
  setCurrentFormat(isOdtFile ? 'odt' : 'docx');
  currentTrustKey = key;
  fileHandle = handle;
  setTitle(name);
  rememberRecent(name, handle);
  wn.focusEditor();
}

async function actionOpen(): Promise<void> {
  closeMenus();
  // Electron: diálogo nativo + Mark-of-the-Web REAL lido do Zone.Identifier
  if (bridge) {
    const r = await bridge.openDocx();
    if (r) {
      openBytes(new Uint8Array(r.bytes), r.name, null, {
        motw: r.motw,
        trustKey: `${r.name}|${r.bytes.byteLength}`,
      });
    }
    return;
  }
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as unknown as {
        showOpenFilePicker: (o: object) => Promise<FileSystemFileHandle[]>;
      }).showOpenFilePicker({
        types: [{
          description: 'Documents',
          accept: {
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.oasis.opendocument.text': ['.odt'],
          },
        }],
      });
      const file = await handle!.getFile();
      openBytes(new Uint8Array(await file.arrayBuffer()), file.name, handle!, {
        trustKey: trustKeyOf(file),
      });
      return;
    } catch { return; } // cancelado
  }
  ($('docxFile') as HTMLInputElement).click();
}
($('docxFile') as HTMLInputElement).addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) openBytes(new Uint8Array(await file.arrayBuffer()), file.name, null, { trustKey: trustKeyOf(file) });
  (e.target as HTMLInputElement).value = '';
});

function bytesForFormat(fmt: DocFormat): Uint8Array {
  return fmt === 'odt' ? wn.exportOdt() : wn.saveDocx();
}
function pickerTypes(): { description: string; accept: Record<string, string[]> }[] {
  return [
    { description: 'Reference app document', accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] } },
    { description: 'OpenDocument Text', accept: { 'application/vnd.oasis.opendocument.text': ['.odt'] } },
  ];
}
function nameForFormat(fmt: DocFormat): string {
  return `${titleInput.value || 'Document'}.${fmt}`;
}
function detectFormatFromName(name: string): DocFormat {
  return /\.odt$/i.test(name) ? 'odt' : 'docx';
}

async function actionSave(saveAs: boolean): Promise<void> {
  closeMenus();
  // Save: usa o formato do documento aberto. Save As: a escolha do file picker
  // pode alterar (extensão escolhida → formato).
  let fmt: DocFormat = currentFormat;
  let suggestedName = nameForFormat(fmt);
  if ('showSaveFilePicker' in window) {
    try {
      if (!fileHandle || saveAs) {
        // Save As reordena: o formato atual fica em PRIMEIRO (default no picker)
        const types = pickerTypes();
        if (fmt === 'odt') types.reverse();
        fileHandle = await (window as unknown as {
          showSaveFilePicker: (o: object) => Promise<FileSystemFileHandle>;
        }).showSaveFilePicker({ suggestedName, types });
        // O usuário pode ter escolhido outra extensão; respeita.
        fmt = detectFormatFromName(fileHandle.name);
        setCurrentFormat(fmt);
      }
      const bytes = bytesForFormat(fmt);
      const w = await fileHandle.createWritable();
      await w.write(new Blob([bytes.buffer as ArrayBuffer]));
      await w.close();
      rememberRecent(fileHandle.name, fileHandle);
      // arquivo salvo por você é confiável (como no app de referência)
      try {
        const f = await fileHandle.getFile();
        currentTrustKey = trustKeyOf(f);
        rememberTrust(currentTrustKey);
      } catch { /* sem meta */ }
      dirty = false;
      lastAutosave = Date.now();
      flashStatus(`Salvo ✓ (${fmt})`);
      return;
    } catch { return; }
  }
  // Fallback (sem File System Access API): download direto no formato vigente
  const bytes = bytesForFormat(fmt);
  const mime = fmt === 'odt' ? 'application/vnd.oasis.opendocument.text'
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  downloadBlob(bytes.buffer as ArrayBuffer, suggestedName, mime);
}

function flashStatus(msg: string): void {
  const st = $('status');
  const prev = st.textContent;
  st.textContent = msg;
  setTimeout(() => { st.textContent = prev; }, 1800);
}

$('actNew').addEventListener('click', () => { closeMenus(); fileHandle = null; wn.newDocument(); setTitle('Untitled document'); setCurrentFormat('docx'); wn.focusEditor(); });
$('actOpen').addEventListener('click', () => void actionOpen());
$('actSave').addEventListener('click', () => void actionSave(false));
$('saveBtn').addEventListener('click', () => void actionSave(false));
$('actSaveAs').addEventListener('click', () => void actionSave(true));
function downloadBlob(data: BlobPart, filename: string, type: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const docName = (): string => titleInput.value || 'Document';
$('actExportPdf').addEventListener('click', () => void (async () => {
  closeMenus();
  const bytes = await wn.exportPdf();
  downloadBlob(bytes.buffer as ArrayBuffer, `${docName()}.pdf`, 'application/pdf');
})());
$('actExportHtml').addEventListener('click', (e) => void (async () => {
  closeMenus();
  // Shift = "slim" (sem imagens embutidas) — útil pra documentos com muitas
  // fotos onde o data URI infla o arquivo em 100×
  const slim = (e as MouseEvent).shiftKey;
  const html = await wn.exportHtml(docName(), slim ? { images: 'omit' } : {});
  const suffix = slim ? '-slim' : '';
  downloadBlob(html, `${docName()}${suffix}.html`, 'text/html;charset=utf-8');
  flashStatus(slim ? 'HTML slim (sem imagens) exportado ✓' : 'HTML exportado ✓');
})());
$('actExportMd').addEventListener('click', (e) => void (async () => {
  closeMenus();
  const slim = (e as MouseEvent).shiftKey;
  const md = await wn.exportMarkdown(docName(), slim ? { images: 'omit' } : {});
  const suffix = slim ? '-slim' : '';
  downloadBlob(md, `${docName()}${suffix}.md`, 'text/markdown;charset=utf-8');
  flashStatus(slim ? 'Markdown slim (sem imagens) exportado ✓' : 'Markdown exportado ✓');
})());
$('actExportOdt').addEventListener('click', () => {
  closeMenus();
  const bytes = wn.exportOdt();
  downloadBlob(bytes.buffer as ArrayBuffer, `${docName()}.odt`,
    'application/vnd.oasis.opendocument.text');
  flashStatus('ODT exportado ✓');
});
$('actExportXps').addEventListener('click', () => void (async () => {
  closeMenus();
  const bytes = await wn.exportXps();
  downloadBlob(bytes.buffer as ArrayBuffer, `${docName()}.xps`, 'application/vnd.ms-xpsdocument');
  flashStatus('XPS exportado ✓');
})());
$('actPrint').addEventListener('click', () => { closeMenus(); wn.print(); });
titleInput.addEventListener('change', () => { document.title = `${titleInput.value} — Write`; });

// ─────────────────── comparação de documentos ───────────────────
// "Comparar com…": o lado esquerdo é o ESTADO ATUAL do editor (com edições
// não salvas); o direito é um .docx escolhido. A exibição troca o <universal-write>
// pelo <universal-write-diff> — fechar volta ao editor intacto.
const wd = document.getElementById('wd') as UniversalWriteDiffElement;

async function pickDocxForCompare(): Promise<{ name: string; bytes: Uint8Array } | null> {
  if (bridge) {
    // O invoke rejeita se a leitura falhar no main (arquivo sumiu entre o
    // diálogo e o read, share desconectado, EBUSY...) — sem o catch isso
    // viraria unhandled rejection silenciosa.
    try {
      const r = bridge.openDocxForCompare
        ? await bridge.openDocxForCompare('Compare with…')
        : await bridge.openDocx();
      return r ? { name: r.name, bytes: new Uint8Array(r.bytes) } : null;
    } catch {
      flashStatus('⚠ Could not read the selected file');
      return null;
    }
  }
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as unknown as {
        showOpenFilePicker: (o: object) => Promise<FileSystemFileHandle[]>;
      }).showOpenFilePicker({
        types: [{
          description: 'Word document',
          accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
        }],
      });
      const file = await handle!.getFile();
      return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
    } catch { return null; } // cancelado
  }
  flashStatus('⚠ Comparison requires Electron or a browser with File System Access');
  return null;
}

function closeCompare(): void {
  wd.style.display = 'none';
  wn.style.display = '';
  wn.focusEditor();
}
wd.addEventListener('close-request', closeCompare);
wd.addEventListener('ready', (e) => {
  const s = (e as CustomEvent<{ stats: { inserted: number; deleted: number; changed: number; formatOnly: number } }>).detail.stats;
  flashStatus(`Comparison: +${s.inserted} −${s.deleted} ~${s.changed} ✎${s.formatOnly}`);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || wd.style.display === 'none') return;
  // Esc destinado a outra UI não fecha o diff: menus flutuantes (menu.ts os
  // fecha em capture sem stopPropagation), dropdowns do header, diálogo de
  // localizar e modo foco têm precedência.
  if (menuOpen() || document.querySelector('.dropdown.show')) return;
  if ($('findDialog').style.display !== 'none') return;
  if (document.body.classList.contains('focus-mode')) return;
  closeCompare();
});

async function actionCompare(): Promise<void> {
  closeMenus();
  const other = await pickDocxForCompare();
  if (!other) return;
  // saveDocx e loadPair falham por motivos diferentes — mensagens separadas
  // (culpar o arquivo escolhido quando o editor nem terminou de iniciar
  // mandaria o usuário atrás do problema errado).
  let current: Uint8Array;
  try {
    current = wn.saveDocx();
  } catch {
    flashStatus('⚠ The editor is still loading — try again in a moment');
    return;
  }
  try {
    wd.loadPair(current, other.bytes, {
      leftLabel: `${docName()} (atual)`,
      rightLabel: other.name,
    });
  } catch {
    flashStatus(`⚠ "${other.name}" is not a valid .docx`);
    return;
  }
  wn.style.display = 'none';
  wd.style.display = 'flex';
}
$('actCompare').addEventListener('click', () => void actionCompare());

document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  // Durante a comparação o editor está oculto — Ctrl+F/O/S/P agiriam sobre o
  // documento invisível (replaceAll mutaria o que o usuário não vê).
  if (wd.style.display !== 'none') return;
  const k = e.key.toLowerCase();
  if (k === 'o') { e.preventDefault(); void actionOpen(); }
  if (k === 's') { e.preventDefault(); void actionSave(e.shiftKey); }
  if (k === 'p') { e.preventDefault(); wn.print(); }
  if (k === 'f') { e.preventDefault(); openFind(false); }
  if (k === 'h') { e.preventDefault(); openFind(true); }
});

// ─────────── Localizar e substituir (diálogo + atalhos) ───────────
const findDialog = $('findDialog');
function openFind(focusReplace: boolean): void {
  findDialog.style.display = 'flex';
  const target = $(focusReplace ? 'replText' : 'findText') as HTMLInputElement;
  target.focus();
  target.select();
}
function closeFind(): void { findDialog.style.display = 'none'; wn.focusEditor(); }
$('findOpen').addEventListener('click', () => openFind(false));
$('findClose').addEventListener('click', closeFind);
findDialog.addEventListener('mousedown', (e) => { if (e.target === findDialog) closeFind(); });
for (const id of ['findText', 'replText']) {
  $(id).addEventListener('keydown', (e) => {
    const ev = e as KeyboardEvent;
    if (ev.key === 'Escape') { ev.preventDefault(); closeFind(); }
    if (ev.key === 'Enter') { ev.preventDefault(); ($('findNext') as HTMLButtonElement).click(); }
  });
}

// drag & drop
let dragDepth = 0;
document.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; $('dropOverlay').classList.add('show'); });
document.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('dropOverlay').classList.remove('show'); } });
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', async (e) => {
  e.preventDefault();
  dragDepth = 0;
  $('dropOverlay').classList.remove('show');
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  // aceita .docx / .odt por extensão OU sniff (ODT detecta mimetype no ZIP;
  // DOCX é qualquer outro ZIP com PK... então abrimos sob a suspeita)
  const looksDocLike = /\.(docx|odt)$/i.test(file.name)
    || isOdt(bytes)
    || (bytes[0] === 0x50 && bytes[1] === 0x4b); // PK (qualquer ZIP)
  if (looksDocLike) {
    openBytes(bytes, file.name, null, { trustKey: trustKeyOf(file) });
  } else {
    flashStatus(`⚠ "${file.name}" doesn't look like a .docx or .odt`);
  }
});

// ───────────────────────── toolbar ─────────────────────────
// caixa de tamanho da fonte (− [11] +) estilo Google Docs: digitar+Enter aplica
const sizeSel = $('size') as HTMLInputElement;
const applySize = () => {
  const v = parseFloat(sizeSel.value.replace(',', '.'));
  if (!isNaN(v) && v > 0) wn.setFontSize(v);
  wn.focusEditor();
};
sizeSel.addEventListener('change', applySize);
sizeSel.addEventListener('keydown', (e) => {
  if ((e as KeyboardEvent).key === 'Enter') { e.preventDefault(); applySize(); }
});
const on = (id: string, fn: () => void) => {
  $(id).addEventListener('mousedown', (e) => e.preventDefault());
  $(id).addEventListener('click', () => { fn(); wn.focusEditor(); });
};
on('undo', () => wn.undo());
on('redo', () => wn.redo());
on('painter', () => { wn.copyFormat(); $('painter').classList.add('active'); });
on('bold', () => wn.toggleRunProp('bold'));
on('italic', () => wn.toggleRunProp('italic'));
on('underline', () => wn.toggleRunProp('underline'));
on('strike', () => wn.toggleRunProp('strike'));
on('sub', () => wn.toggleVertAlign('subscript'));
on('sup', () => wn.toggleVertAlign('superscript'));
on('clear', () => wn.clearFormatting());
on('grow', () => wn.growFont(1));
on('shrink', () => wn.growFont(-1));
on('bullets', () => wn.toggleList('bullet'));
on('numbers', () => wn.toggleList('decimal'));
on('actBullets2', () => { closeMenus(); wn.toggleList('bullet'); });
on('actNumbers2', () => { closeMenus(); wn.toggleList('decimal'); });
on('indent', () => wn.indent(1));
on('outdent', () => wn.indent(-1));
on('marks', () => wn.toggleMarks());
on('border', () => wn.toggleBorder());
let caseUpper = true;
on('case', () => { wn.changeCase(caseUpper ? 'upper' : 'lower'); caseUpper = !caseUpper; });

// ── botões novos espelhando a barra do Google Docs ──
on('print', () => wn.print());
on('spell', () => flashStatus('Spell check: no errors found'));
on('checklist', () => flashStatus('Lista de tarefas: em breve'));
on('imageBtn', () => ($('imageFile') as HTMLInputElement).click());
on('commentBtn', () => {
  const text = window.prompt('Comment text:');
  if (text) { const id = wn.addComment(text); flashStatus(id === null ? 'Selecione um trecho para comentar' : 'Comment added ✓'); }
});
on('linkBtn', () => {
  const url = window.prompt('URL do link:', 'https://');
  if (url) { wn.setLink(url); flashStatus('Link aplicado ✓'); }
});
on('colorBtn', () => ($('color') as HTMLInputElement).click());
// alinhamento como menu único (▾) — ícone reflete o alinhamento atual
$('alignMenu').addEventListener('mousedown', (e) => e.preventDefault());
$('alignMenu').addEventListener('click', (e) => {
  e.stopPropagation();
  const cur = wn.getSelectionState().para.alignment || 'left';
  const opt = (val: 'left'|'center'|'right'|'both', icon: string, label: string): MenuItem =>
    ({ icon, label, checked: cur === val, onClick: () => { wn.setAlignment(val); syncToolbar(); wn.focusEditor(); } });
  openMenu([
    opt('left', 'format_align_left', 'Esquerda'),
    opt('center', 'format_align_center', 'Centralizar'),
    opt('right', 'format_align_right', 'Direita'),
    opt('both', 'format_align_justify', 'Justificar'),
  ], { anchor: $('alignMenu') });
});
// zoom na barra (▾) — presets, sincronizado com o slider do rodapé
const ZOOMS = [50, 75, 90, 100, 125, 150, 200];
$('zoomMenu').addEventListener('mousedown', (e) => e.preventDefault());
$('zoomMenu').addEventListener('click', (e) => {
  e.stopPropagation();
  const cur = Math.round(wn.getZoom() * 100);
  openMenu(ZOOMS.map((z) => ({ label: `${z}%`, checked: z === cur, onClick: () => { wn.setZoom(z / 100); wn.focusEditor(); } })), { anchor: $('zoomMenu') });
});

const onSel = (id: string, fn: (v: string) => void) =>
  $(id).addEventListener('change', (e) => { fn((e.target as HTMLSelectElement).value); wn.focusEditor(); });
onSel('style', (v) => wn.applyStyle(v || undefined));
onSel('font', (v) => wn.setFontFamily(v));
onSel('highlight', (v) => wn.setHighlight(v || undefined));
onSel('spacing', (v) => wn.setLineSpacing(parseInt(v, 10)));
onSel('spaceAfter', (v) => wn.setSpaceAfter(v === '' ? undefined : parseInt(v, 10)));
onSel('charSpacing', (v) => wn.setCharSpacing(v === '' ? undefined : parseInt(v, 10)));
onSel('specialIndent', (v) => wn.setSpecialIndent(v as 'none' | 'firstLine' | 'hanging'));
onSel('orientation', (v) => wn.setPageSetup({ orientation: v as 'portrait' | 'landscape' }));
onSel('pagesize', (v) => wn.setPageSetup({ size: v as 'A4' | 'Letter' }));
onSel('margins', (v) => wn.setPageSetup({ margins: v as 'normal' | 'narrow' | 'wide' }));
// zoom: slider 10–500% sincronizado com Ctrl+scroll do componente
const zoomSlider = $('zoom') as HTMLInputElement;
const zoomLabel = $('zoomLabel');
const showZoom = (z: number) => {
  const pct = Math.round(z * 100);
  zoomSlider.value = String(pct);
  zoomLabel.textContent = `${pct}%`;
  const zn = $('zoomMenu').querySelector('.tb-menu-num');
  if (zn) zn.textContent = `${pct}%`;
};
zoomSlider.addEventListener('input', () => {
  wn.setZoom(parseInt(zoomSlider.value, 10) / 100);
  zoomLabel.textContent = `${zoomSlider.value}%`;
});
$('zoomOut').addEventListener('click', () => { wn.setZoom(wn.getZoom() / 1.1); wn.focusEditor(); });
$('zoomIn').addEventListener('click', () => { wn.setZoom(wn.getZoom() * 1.1); wn.focusEditor(); });
wn.addEventListener('uw-zoom', ((e: CustomEvent) => showZoom(e.detail.zoom)) as EventListener);
($('color') as HTMLInputElement).addEventListener('change', (e) => {
  wn.setColor((e.target as HTMLInputElement).value.slice(1).toUpperCase());
  wn.focusEditor();
});
($('shading') as HTMLInputElement).addEventListener('change', (e) => {
  const hex = (e.target as HTMLInputElement).value.slice(1).toUpperCase();
  wn.setShading(hex === 'FFFFFF' ? undefined : hex);
  wn.focusEditor();
});

$('actImage').addEventListener('click', () => { closeMenus(); ($('imageFile') as HTMLInputElement).click(); });
$('actMention').addEventListener('click', () => {
  closeMenus();
  if (wn.isProtected()) {
    flashStatus('Enable editing before inserting a mention');
    return;
  }
  const label = 'Ada Lovelace';
  wn.insertCustomInline('mention', { id: label.toLowerCase().replace(/\s+/g, '-'), label });
  wn.focusEditor();
});
on('actPageBreak', () => { closeMenus(); wn.insertPageBreak(); });
on('actFieldPage', () => { closeMenus(); wn.insertField('PAGE'); });
on('actFieldNumPages', () => { closeMenus(); wn.insertField('NUMPAGES'); });
on('actFieldDate', () => { closeMenus(); wn.insertField('DATE'); });
$('actToc').addEventListener('click', () => {
  closeMenus();
  flashStatus(wn.updateToc() ? 'Table of contents updated ✓' : 'Document has no table-of-contents field');
  wn.focusEditor();
});
$('actComment').addEventListener('click', () => {
  closeMenus();
  const text = window.prompt('Comment text:');
  if (text) {
    const id = wn.addComment(text);
    flashStatus(id === null ? 'Selecione um trecho para comentar' : 'Comment added ✓');
  }
  wn.focusEditor();
});

// Modo de Exibição Protegido (mecânica do app de referência: "Enable Editing")
let wasProtected = false;
// true só durante o clique em "Enable Editing". No app de referência o aviso de campos
// (e a atualização) é disparado ao HABILITAR EDIÇÃO — não ao abrir. Doc já
// confiável abre direto, sem o prompt (atualiza-se via Enable Editing/F9).
let enabledByUser = false;
wn.addEventListener('uw-protected', ((e: CustomEvent) => {
  $('protectedBar').classList.toggle('bar-off', !e.detail.active);
  // Modo Protegido: a barra de ferramentas fica desabilitada (como no app de referência)
  $('toolbarRow').classList.toggle('tb-locked', !!e.detail.active);
  if (enabledByUser && e.detail.hasFields) {
    // só ao clicar "Enable Editing" num doc com campos (como no app de referência)
    ($('fieldsDialog') as HTMLElement & { open: boolean }).open = true;
  }
  if (!e.detail.active) {
    // Trusted Documents (como o app de referência): habilitou uma vez → lembra o arquivo
    rememberTrust(currentTrustKey);
    // habilitar edição salva IMEDIATAMENTE (quando há arquivo de destino)
    if (wasProtected && fileHandle) {
      void actionSave(false).then(() => flashStatus('Editing enabled — saved ✓'));
    }
  }
  wasProtected = e.detail.active;
}) as EventListener);

// ───── AUTOSAVE (timing do app de referência: AutoRecover 10 min por padrão) ─────
let dirty = false;
let lastAutosave = Date.now();
const autosaveSel = $('autosaveSel') as HTMLSelectElement;
autosaveSel.value = localStorage.getItem('uw-autosave-min') ?? '10';
autosaveSel.addEventListener('change', () => {
  localStorage.setItem('uw-autosave-min', autosaveSel.value);
  flashStatus(autosaveSel.value === '0' ? 'Autosave desativado' : `Autosave: a cada ${autosaveSel.value} min`);
});
function checkAutosave(): void {
  const min = parseFloat(localStorage.getItem('uw-autosave-min') ?? '10');
  if (min <= 0 || !dirty) return;
  if (Date.now() - lastAutosave < min * 60000) return;
  if (!fileHandle) {
    flashStatus('Autosave pendente — salve uma vez para definir o arquivo');
    lastAutosave = Date.now();
    return;
  }
  void actionSave(false).then(() => {
    dirty = false;
    lastAutosave = Date.now();
    flashStatus('Autosave ✓');
  });
}
wn.addEventListener('uw-change', () => {
  dirty = true;
  // além do timer: checa pouco depois de cada edição (timers de fundo
  // sofrem throttling — assim o autosave não atrasa com a janela oculta)
  window.setTimeout(checkAutosave, 800);
});
window.setInterval(checkAutosave, 15000);
// ação bloqueada pelo Modo Protegido: chama forte atenção p/ Enable Editing
wn.addEventListener('uw-blocked', (() => {
  const bar = $('protectedBar');
  const btn = $('enableEditing');
  bar.scrollIntoView({ block: 'nearest' });
  btn.classList.remove('uw-pulse');
  void btn.offsetWidth; // reinicia a animação
  btn.classList.add('uw-pulse');
  flashStatus('🔒 Protected document — click "Enable Editing" to edit');
}) as EventListener);
$('enableEditing').addEventListener('click', () => {
  // sinaliza p/ o handler uw-protected que a saída do modo protegido foi pelo
  // usuário (enableEditing despacha uw-protected de forma síncrona)
  enabledByUser = true;
  wn.enableEditing();
  enabledByUser = false;
  flashStatus('Editing enabled');
});

// dica de descoberta da edição de cabeçalho/rodapé (hover na margem)
wn.addEventListener('uw-hfhover', ((e: CustomEvent) => {
  const hint = $('hfHint');
  if (e.detail.kind) {
    hint.textContent = `Double-click to edit ${e.detail.kind === 'header' ? 'header' : 'footer'}`;
    hint.style.left = `${e.detail.x + 14}px`;
    hint.style.top = `${e.detail.y + 14}px`;
    hint.style.display = 'block';
  } else {
    hint.style.display = 'none';
  }
}) as EventListener);
const fieldsDialog = () => $('fieldsDialog') as HTMLElement & { open: boolean };
// Fecha o diálogo sem depender da animação de saída do u-dialog. O close()
// do componente espera o 'animationend' da .container; se a animação não rodar
// (renderer ocioso/offscreen, janela em background, motion reduzido), o close
// trava e o diálogo nunca some. Fechamos o <dialog> nativo direto e só então
// zeramos o estado lógico — o setter retorna cedo porque já está fechado.
function closeFieldsDialog(): void {
  const dlg = fieldsDialog();
  const inner = dlg.shadowRoot?.querySelector('dialog') as HTMLDialogElement | null;
  if (inner?.open) inner.close();
  dlg.classList.remove('closing');
  if (dlg.open) dlg.open = false;
}
// Esc / clique no scrim passam pelo evento 'cancel': fechamos nós mesmos
// (preventDefault evita o close() animado do componente, que poderia travar).
$('fieldsDialog').addEventListener('cancel', (e) => { e.preventDefault(); closeFieldsDialog(); });
$('updateFields').addEventListener('click', () => {
  closeFieldsDialog();
  flashStatus(wn.updateToc() ? 'Campos atualizados ✓' : 'No table-of-contents field to update');
  wn.focusEditor();
});
$('dismissFields').addEventListener('click', () => { closeFieldsDialog(); wn.focusEditor(); });

// painel de anotações
// Modo INLINE: cards alinhados à linha do trecho comentado, com sync ao scroll
// do editor. Persiste a preferência em localStorage.
let inlineComments = localStorage.getItem('uw-inline-comments') === '1';
document.body.classList.toggle('inline-comments', inlineComments);

function buildCard(c: { id: number; author?: string; text: string }, active: boolean): HTMLElement {
  const card = document.createElement('div');
  card.className = 'comment-card' + (active ? ' active' : '');
  card.dataset.commentId = String(c.id);
  const del = document.createElement('button');
  del.className = 'del';
  del.textContent = '🗑';
  del.title = 'Delete comment';
  del.addEventListener('click', (e) => { e.stopPropagation(); wn.removeComment(c.id); });
  const who = document.createElement('div');
  who.className = 'who';
  who.textContent = c.author ?? 'Anonymous';
  const body = document.createElement('div');
  body.textContent = c.text;
  card.append(del, who, body);
  card.addEventListener('click', () => { wn.goToComment(c.id); renderComments([c.id]); });
  return card;
}

let lastActiveIds: number[] = [];
// A BARRA é sempre uma lista simples. O modo inline acrescenta os MESMOS cards
// num overlay fixo ao lado da página — não troca o conteúdo da barra.
const renderComments = (activeIds: number[] = lastActiveIds) => {
  lastActiveIds = activeIds;
  const comments = wn.getComments();
  $('commentsPanel').style.display = comments.length ? 'block' : 'none';
  $('commentsList').replaceChildren(
    ...comments.map((c) => buildCard(c, activeIds.includes(c.id))),
  );
  if (inlineComments) {
    $('inlineCommentsOverlay').replaceChildren(
      ...comments.map((c) => buildCard(c, activeIds.includes(c.id))),
    );
    positionInlineCards();
  } else {
    $('inlineCommentsOverlay').replaceChildren();
  }
};

// Posiciona cada card no espaço da VIEWPORT, à direita da página onde o
// trecho anotado está. Sincronizado com o scroll do editor. Cards que
// ficariam fora da viewport ganham display:none (não inflam o DOM visível).
function positionInlineCards(): void {
  if (!inlineComments) return;
  const overlay = $('inlineCommentsOverlay');
  const cards = Array.from(overlay.querySelectorAll<HTMLElement>('.comment-card'));
  if (!cards.length) return;
  const shadow = (wn as unknown as { shadowRoot: ShadowRoot }).shadowRoot;
  const canvases = Array.from(shadow.querySelectorAll('canvas')) as HTMLCanvasElement[];
  const vh = window.innerHeight;
  const GAP_FROM_PAGE = 20;
  type Placed = { card: HTMLElement; idealTop: number; leftPx: number };
  const placed: Placed[] = [];
  for (const card of cards) {
    const id = parseInt(card.dataset.commentId ?? '-1', 10);
    const anchor = wn.commentAnchorPx?.(id);
    if (!anchor) { card.style.display = 'none'; continue; }
    const canvas = canvases[anchor.page];
    if (!canvas || canvas.width <= 1) { card.style.display = 'none'; continue; }
    const rect = canvas.getBoundingClientRect();
    // Y da linha na viewport: top do canvas + (anchor.topPx - canvas.offsetTop)
    const yInCanvas = anchor.topPx - canvas.offsetTop;
    const idealTop = rect.top + yInCanvas;
    const leftPx = rect.right + GAP_FROM_PAGE;
    card.style.display = '';
    card.style.left = `${leftPx}px`;
    placed.push({ card, idealTop, leftPx });
  }
  placed.sort((a, b) => a.idealTop - b.idealTop);
  // empilha sem overlap; marca .anchored quando ficou na posição ideal
  const CARD_GAP = 8;
  const ANCHOR_TOL = 6;
  let prevBottom = -Infinity;
  for (const p of placed) {
    const h = p.card.getBoundingClientRect().height || 56;
    const finalTop = Math.max(p.idealTop, prevBottom + CARD_GAP);
    // se o card estiver completamente fora da viewport, oculta — economiza paint
    if (finalTop + h < 0 || finalTop > vh) {
      p.card.style.display = 'none';
      continue;
    }
    p.card.style.top = `${finalTop}px`;
    const drift = Math.abs(finalTop - p.idealTop);
    p.card.classList.toggle('anchored', drift <= ANCHOR_TOL);
    prevBottom = finalTop + h;
  }
}

wn.addEventListener('uw-comments-changed', () => renderComments());
wn.addEventListener('uw-comment-click', ((e: CustomEvent) => renderComments(e.detail.ids)) as EventListener);
// Sync do scroll do editor com a camada inline. O evento 'scroll' nativo
// do host é DISPARADO DE FORMA INCONSISTENTE com mudanças programáticas
// de scrollTop (browser coalesce); então mantemos também um rAF poll
// que só age quando estamos em modo inline E o scrollTop mudou de fato.
let lastWnScroll = -1;
function inlineRafLoop(): void {
  if (!inlineComments) return;
  const st = (wn as unknown as { scrollTop: number }).scrollTop;
  if (st !== lastWnScroll) { lastWnScroll = st; positionInlineCards(); }
  requestAnimationFrame(inlineRafLoop);
}
function startInlineSync(): void { lastWnScroll = -1; requestAnimationFrame(inlineRafLoop); }
if (inlineComments) startInlineSync();
window.addEventListener('resize', () => { if (inlineComments) positionInlineCards(); });
// Quando o layout do editor refresca (mudança de zoom, edição), reposiciona
wn.addEventListener('uw-change', () => { if (inlineComments) positionInlineCards(); });
// Reforço para entradas de usuário (wheel/touch/teclas) — alguns navegadores
// só emitem 'scroll' depois do gesto inteiro; o rAF poll já cobre, mas isso
// elimina o delay de 1 frame na 1ª resposta visual.
for (const ev of ['wheel', 'touchmove', 'keyup', 'mouseup'] as const) {
  wn.addEventListener(ev, () => { if (inlineComments) positionInlineCards(); }, { passive: true });
}

$('commentsInlineToggle').addEventListener('click', () => {
  inlineComments = !inlineComments;
  localStorage.setItem('uw-inline-comments', inlineComments ? '1' : '0');
  document.body.classList.toggle('inline-comments', inlineComments);
  renderComments(lastActiveIds);
  if (inlineComments) startInlineSync();
});
$('commentsClose').addEventListener('click', () => { $('commentsPanel').style.display = 'none'; });
on('actHeader', () => { closeMenus(); wn.enterHeaderFooter('header'); });
on('actFooter', () => { closeMenus(); wn.enterHeaderFooter('footer'); });
($('imageFile') as HTMLInputElement).addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const ext = file.type === 'image/jpeg' ? 'jpeg' : file.type === 'image/gif' ? 'gif' : 'png';
  await wn.insertImage(new Uint8Array(await file.arrayBuffer()), ext);
  (e.target as HTMLInputElement).value = '';
  wn.focusEditor();
});

$('findNext').addEventListener('click', () => {
  const ok = wn.findNext(($('findText') as HTMLInputElement).value);
  $('findText').style.outline = ok ? '' : '2px solid #d93025';
});
$('replaceAll').addEventListener('click', () => {
  const n = wn.replaceAll(($('findText') as HTMLInputElement).value, ($('replText') as HTMLInputElement).value);
  flashStatus(`${n} replacements`);
});

// visões (botões do rodapé). "Foco" é PSEUDO-modo (toggle): tela cheia + esconde
// TODAS as barras, renderizando o modo atual. Leitura esconde a barra de
// ferramentas (sem tela cheia). Impressão/Web/Leitura são exclusivas.
const setActiveView = (v: string) =>
  document.querySelectorAll<HTMLElement>('footer [data-view]:not([data-view="focus"])')
    .forEach((b) => b.classList.toggle('active', b.dataset.view === v));
const enterFocus = (): void => {
  document.body.classList.add('focus-mode');
  document.querySelector('footer [data-view="focus"]')?.classList.add('active');
  document.documentElement.requestFullscreen?.().catch(() => { /* bloqueado (iframe) */ });
};
const exitFocus = (): void => {
  document.body.classList.remove('focus-mode');
  document.querySelector('footer [data-view="focus"]')?.classList.remove('active');
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
};
for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-view]')) {
  btn.addEventListener('click', () => {
    closeMenus();
    const v = btn.dataset.view!;
    if (v === 'focus') {
      document.body.classList.contains('focus-mode') ? exitFocus() : enterFocus();
    } else {
      setActiveView(v);
      document.body.classList.toggle('reading', v === 'read'); // Leitura esconde a toolbar
      wn.setView(v as ViewMode);
    }
    wn.focusEditor();
  });
}
// sair da tela cheia (Esc / botão do SO) também sai do modo foco
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && document.body.classList.contains('focus-mode')) exitFocus();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('focus-mode')) { exitFocus(); wn.focusEditor(); }
});

// ───────────────────────── estado da seleção ─────────────────────────
const syncToolbar = () => {
  const st = wn.getSelectionState();
  const set = (id: string, active: boolean) => $(id).classList.toggle('active', active);
  set('bold', st.run.bold);
  set('italic', st.run.italic);
  set('underline', st.run.underline);
  set('strike', st.run.strike);
  set('sub', st.run.vertAlign === 'subscript');
  set('sup', st.run.vertAlign === 'superscript');
  // alinhamento: ícone do gatilho único reflete o estado
  const al = st.para.alignment || 'left';
  const alIcon = $('alignMenu').querySelector('.micon');
  if (alIcon) alIcon.textContent =
    al === 'center' ? 'format_align_center' : al === 'right' ? 'format_align_right'
    : al === 'both' ? 'format_align_justify' : 'format_align_left';
  // barra de cor do texto
  const cbar = $('colorBar');
  if (cbar && st.run.color) cbar.style.background = `#${st.run.color}`;
  set('bullets', st.para.numbering?.kind === 'bullet');
  set('numbers', st.para.numbering?.kind === 'decimal');
  set('marks', st.marks);
  set('painter', wn.painterActive());
  if (st.run.szHalfPt) sizeSel.value = String(st.run.szHalfPt / 2);
  ($('style') as HTMLSelectElement).value = st.para.styleId ?? '';
  if (st.run.fontAscii) {
    const fs = $('font') as HTMLSelectElement;
    const raw = st.run.fontAscii;
    // Aptos/Calibri (e variantes) colapsam; qualquer outra fonte do documento é
    // injetada como opção para o select mostrar a fonte REAL do cursor.
    const f = raw.startsWith('Calibri') ? 'Calibri' : raw.startsWith('Aptos') ? 'Aptos' : raw;
    fs.querySelector('option[data-dyn]')?.remove();
    if (f !== 'Aptos' && f !== 'Calibri') {
      const o = document.createElement('option');
      o.value = f; o.textContent = f; o.dataset['dyn'] = '1';
      fs.insertBefore(o, fs.firstChild);
    }
    fs.value = f;
  }
  refreshIconMenus(); // atualiza o número do gatilho de tamanho
  const s = wn.stats();
  $('status').textContent =
    `Page ${s.page} of ${s.pages} · ${s.words} word${s.words === 1 ? '' : 's'} · paragraph ${s.paragraph}`;
};
wn.onSelectionChange = syncToolbar;

// ───────────────────────── menu de contexto (botão direito) ─────────────────
wn.addEventListener('contextmenu', (e) => {
  const ev = e as MouseEvent;
  ev.preventDefault();
  const st = wn.getSelectionState();
  const hasSel = wn.selectedText().length > 0;
  const ro = wn.isProtected(); // somente leitura / modo protegido
  const sync = () => { wn.focusEditor(); syncToolbar(); };
  const items: CtxItem[] = [
    { icon: 'content_cut', label: 'Cut', shortcut: 'Ctrl+X', disabled: !hasSel || ro, onClick: () => { void wn.cut(); } },
    { icon: 'content_copy', label: 'Copy', shortcut: 'Ctrl+C', disabled: !hasSel, onClick: () => { void wn.copy(); } },
    { icon: 'content_paste', label: 'Paste', shortcut: 'Ctrl+V', disabled: ro, onClick: () => { void wn.paste().then(sync); } },
    { icon: 'content_paste_off', label: 'Paste without formatting', shortcut: 'Ctrl+Shift+V', disabled: ro, onClick: () => { void wn.pastePlain().then(sync); } },
    { sep: true },
    { icon: 'format_bold', label: 'Bold', shortcut: 'Ctrl+B', checked: st.run.bold, disabled: ro, onClick: () => { wn.toggleRunProp('bold'); sync(); } },
    { icon: 'format_italic', label: 'Italic', shortcut: 'Ctrl+I', checked: st.run.italic, disabled: ro, onClick: () => { wn.toggleRunProp('italic'); sync(); } },
    { icon: 'format_underlined', label: 'Underline', shortcut: 'Ctrl+U', checked: st.run.underline, disabled: ro, onClick: () => { wn.toggleRunProp('underline'); sync(); } },
    { sep: true },
    { icon: 'format_list_bulleted', label: 'Bullets', checked: st.para.numbering?.kind === 'bullet', disabled: ro, onClick: () => { wn.toggleList('bullet'); sync(); } },
    { icon: 'format_list_numbered', label: 'Numbering', checked: st.para.numbering?.kind === 'decimal', disabled: ro, onClick: () => { wn.toggleList('decimal'); sync(); } },
    { sep: true },
    { icon: 'add_comment', label: 'New comment…', disabled: !hasSel || ro, onClick: () => {
        const text = window.prompt('Comment text:');
        if (text) { const id = wn.addComment(text); flashStatus(id === null ? 'Selecione um trecho para comentar' : 'Comment added ✓'); }
        wn.focusEditor();
      } },
    { icon: 'search', label: 'Find and replace…', shortcut: 'Ctrl+F', onClick: () => openFind(false) },
    { sep: true },
    { icon: 'select_all', label: 'Select all', shortcut: 'Ctrl+A', onClick: () => { wn.selectAll(); sync(); } },
  ];
  openContextMenu(ev.clientX, ev.clientY, items);
});

// atualiza "Page X of Y" enquanto rola
let statusScrollTick = false;
wn.addEventListener('scroll', () => {
  if (statusScrollTick) return;
  statusScrollTick = true;
  setTimeout(() => {
    statusScrollTick = false;
    const s = wn.stats();
    $('status').textContent =
      `Page ${s.page} of ${s.pages} · ${s.words} word${s.words === 1 ? '' : 's'} · paragraph ${s.paragraph}`;
  }, 150);
});

// ───────────────────────── boot ─────────────────────────
applyAccent(localStorage.getItem('uw-accent-v2') || 'blue'); // gera a paleta; tema padrão: azul
applyMode((localStorage.getItem('uw-mode') as ColorMode) || 'auto'); // modo padrão: Automatic
setupIconMenus();
setupCollapsibleToolbar();
// ripple Material (@universal-material/web) nos clicáveis: TODOS os botões dos
// grupos (mesmo os escondidos na stash/colapsados — .tb-menu também é <button>),
// botões de visão do rodapé e do diálogo. Gatilhos/⋮/itens de menu recebem na criação.
rippleAll(document, '#toolbarRow .tb-g button, footer .views button, .dlg-btn');
// ganchos de teste/depuração (estado interno do demo)
(window as unknown as { __wnDemo: object }).__wnDemo = {
  openWithHandle: (bytes: Uint8Array, name: string, handle: FsHandle, sec?: { motw?: boolean; trustKey?: string }) =>
    openBytes(bytes, name, handle, sec),
  setHandle: (h: FsHandle) => { fileHandle = h; },
  state: () => ({ dirty, lastAutosave, temHandle: !!fileHandle, protegido: wn.isProtected() }),
  forceAutosave: () => { lastAutosave = 0; },
};

wn.addEventListener('uw-ready', async () => {
  setTimeout(() => renderComments(), 1500);
  // abre o catálogo de recursos por padrão (arquivo-alvo da meta)
  try {
    const resp = await fetch('/samples/Catalogo-Recursos-Word.docx');
    if (resp.ok) {
      // veio da REDE: equivale a ter Mark-of-the-Web (critério do app de referência)
      openBytes(new Uint8Array(await resp.arrayBuffer()), 'Catalogo-Recursos-Word.docx', null, {
        motw: true,
        trustKey: 'url:/samples/Catalogo-Recursos-Word.docx',
      });
      return;
    }
  } catch { /* segue vazio */ }
  wn.focusEditor();
});

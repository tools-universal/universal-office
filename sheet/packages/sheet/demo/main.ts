import '../src/universal-sheet';
import type { UniversalSheetElement } from '../src/universal-sheet';
import { FontResolver, type HostFontProvider } from '@universal-office/fonts';
import {
  xlsxToCsv, xlsxToTsv, xlsxToMarkdown, xlsxToHtml, xlsxToPdf, xlsxToOds, xlsxToXml2003,
} from '@universal-office/sheet-export';
import { openMenu, type MenuItem } from './menu.js';
import { rippleAll } from './ripple.js';
import { applyGeneratedTheme } from './theme.js';
import '@universal-material/web/button/button.js';
import '@universal-material/web/button/icon-button.js';

// Electron: fontes do SO pela ponte do main process (Windows\Fonts + fontes do
// usuário + cache CloudFonts do Office, que o queryLocalFonts não enxerga)
// — configurado no resolvedor ÚNICO dos apps (shared/fonts)
const fontBridge = (window as unknown as {
  universalSheet?: { listFonts?: HostFontProvider['list']; resolveFonts?: HostFontProvider['resolve'] };
}).universalSheet;
FontResolver.shared().configure({
  baseUrl: './fonts',
  host: fontBridge?.listFonts && fontBridge.resolveFonts
    ? { list: fontBridge.listFonts, resolve: fontBridge.resolveFonts }
    : null,
});

const us = document.getElementById('us') as UniversalSheetElement;
const $ = (id: string) => document.getElementById(id)!;
const titleInput = $('docTitle') as HTMLInputElement;

// Electron: a ponte window.universalSheet marca o modo desktop — o CSS
// reserva a área dos controles da janela (mesmo padrão do write)
if ((window as { universalSheet?: unknown }).universalSheet) {
  document.documentElement.classList.add('electron');
}

// ───────────────────────── modos de cor ─────────────────────────
type ColorMode = 'auto' | 'light' | 'dark' | 'black';
const MODE_LABELS: Record<ColorMode, string> = { auto: 'Automático', light: 'Claro', dark: 'Escuro', black: 'Escuro total' };
const MODE_ICONS: Record<ColorMode, string> = { auto: 'brightness_auto', light: 'light_mode', dark: 'dark_mode', black: 'bedtime' };
let colorMode: ColorMode = 'auto';
const prefersDark = matchMedia('(prefers-color-scheme: dark)');
const applyMode = (m: ColorMode): void => {
  colorMode = m;
  document.documentElement.style.colorScheme = m === 'auto' ? 'light dark' : m === 'light' ? 'light' : 'dark';
  $('darkToggleIcon').textContent = MODE_ICONS[m];
  localStorage.setItem('us-mode', m);
  // Electron: controles da janela acompanham o tema
  const dark = m === 'dark' || m === 'black' || (m === 'auto' && prefersDark.matches);
  (window as { universalSheet?: { setTitleTheme(d: boolean): void } }).universalSheet?.setTitleTheme(dark);
};
prefersDark.addEventListener('change', () => { if (colorMode === 'auto') applyMode('auto'); });
$('darkToggle').addEventListener('mousedown', (e) => e.preventDefault());
$('darkToggle').addEventListener('click', (e) => {
  e.stopPropagation();
  const item = (m: ColorMode): MenuItem => ({ label: MODE_LABELS[m], checked: colorMode === m, onClick: () => applyMode(m) });
  openMenu([item('auto'), item('light'), item('dark'), item('black')], { anchor: $('darkToggle') });
});

// ───────────── cor de destaque ─────────────
const accentMenu = $('accentMenu');
const applyAccent = (a: string): void => {
  applyGeneratedTheme(a);
  accentMenu.querySelectorAll<HTMLElement>('.accent-sw').forEach((b) =>
    b.classList.toggle('sel', b.dataset.accent === (a || 'neutral')));
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
  b.addEventListener('click', () => {
    applyAccent(b.dataset.accent!); localStorage.setItem('us-accent', b.dataset.accent!); accentMenu.style.display = 'none';
  }),
);
document.addEventListener('mousedown', (e) => {
  if (accentMenu.style.display !== 'none' && !accentMenu.contains(e.target as Node) &&
      !(e.target as HTMLElement)?.closest?.('#accentBtn')) accentMenu.style.display = 'none';
});

// ───────────────────────── menus ─────────────────────────
const menus: [string, string][] = [['menuFile', 'ddFile'], ['menuInsert', 'ddInsert'], ['menuFormat', 'ddFormat']];
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

function setTitle(name: string): void {
  titleInput.value = name.replace(/\.xlsx$/i, '');
  document.title = `${titleInput.value} — Universal Sheet`;
}
function flashStatus(msg: string): void {
  const st = $('status');
  const prev = st.textContent;
  st.textContent = msg;
  setTimeout(() => { st.textContent = prev; }, 1800);
}
function downloadBlob(data: BlobPart, filename: string, type: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function openBytes(bytes: Uint8Array, name: string): void {
  try { us.loadXlsx(bytes); } catch { flashStatus(`⚠ "${name}" não é uma planilha válida`); return; }
  fileHandle = null;
  setTitle(name);
  renderTabs();
  flashStatus(`"${name}" aberto ✓`);
}
async function actionOpen(): Promise<void> {
  closeMenus();
  if ('showOpenFilePicker' in window) {
    try {
      const [h] = await (window as unknown as {
        showOpenFilePicker: (o: object) => Promise<FileSystemFileHandle[]>;
      }).showOpenFilePicker({
        types: [{ description: 'Planilha', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
      });
      const file = await h!.getFile();
      fileHandle = h!;
      openBytes(new Uint8Array(await file.arrayBuffer()), file.name);
      return;
    } catch { return; }
  }
  ($('xlsxFile') as HTMLInputElement).click();
}
($('xlsxFile')).addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) openBytes(new Uint8Array(await file.arrayBuffer()), file.name);
  (e.target as HTMLInputElement).value = '';
});
async function actionSave(saveAs: boolean): Promise<void> {
  closeMenus();
  const bytes = us.saveXlsx();
  const suggested = `${titleInput.value || 'Pasta'}.xlsx`;
  if ('showSaveFilePicker' in window) {
    try {
      if (!fileHandle || saveAs) {
        fileHandle = await (window as unknown as {
          showSaveFilePicker: (o: object) => Promise<FileSystemFileHandle>;
        }).showSaveFilePicker({
          suggestedName: suggested,
          types: [{ description: 'Planilha', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
        });
      }
      const w = await fileHandle.createWritable();
      await w.write(new Blob([bytes.buffer as ArrayBuffer]));
      await w.close();
      flashStatus('Salvo ✓');
      return;
    } catch { return; }
  }
  downloadBlob(bytes.buffer as ArrayBuffer, suggested,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  flashStatus('Baixado .xlsx ✓');
}
// ───────────── Salvar como multi-formato + Imprimir (PDF real) ─────────────

/** Cache das TTFs Aptos Narrow do demo (embed no PDF). */
let pdfFontsCache: { bytes: Uint8Array; bold?: boolean; italic?: boolean }[] | null = null;
async function pdfFonts(): Promise<NonNullable<typeof pdfFontsCache>> {
  if (pdfFontsCache) return pdfFontsCache;
  const load = async (file: string): Promise<Uint8Array> =>
    new Uint8Array(await (await fetch(`fonts/${file}`)).arrayBuffer());
  pdfFontsCache = [
    { bytes: await load('aptos-narrow-regular.ttf') },
    { bytes: await load('aptos-narrow-bold.ttf'), bold: true },
    { bytes: await load('aptos-narrow-italic.ttf'), italic: true },
    { bytes: await load('aptos-narrow-bolditalic.ttf'), bold: true, italic: true },
  ];
  return pdfFontsCache;
}

/** Gera o PDF da pasta atual (todas as sheets visíveis). */
async function currentPdf(): Promise<Uint8Array> {
  return xlsxToPdf(us.saveXlsx(), { fonts: await pdfFonts() });
}

/** Imprimir = abrir o PDF real no viewer (que imprime), não print da view. */
async function actionPrint(): Promise<void> {
  closeMenus();
  flashStatus('Gerando PDF…');
  try {
    const bytes = await currentPdf();
    const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' }));
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    flashStatus(`⚠ Falha ao gerar PDF: ${err instanceof Error ? err.message : err}`);
  }
}

interface SaveFormat {
  label: string;
  ext: string;
  mime: string;
  filterName: string;
  make: () => Promise<Uint8Array | string>;
}
const SAVE_FORMATS: SaveFormat[] = [
  { label: 'Pasta de trabalho (.xlsx)', ext: 'xlsx', filterName: 'Planilha Excel',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    make: async () => us.saveXlsx() },
  { label: 'PDF (.pdf)', ext: 'pdf', filterName: 'PDF', mime: 'application/pdf',
    make: () => currentPdf() },
  { label: 'OpenDocument (.ods)', ext: 'ods', filterName: 'Planilha OpenDocument',
    mime: 'application/vnd.oasis.opendocument.spreadsheet',
    make: async () => xlsxToOds(us.saveXlsx()) },
  { label: 'Planilha XML 2003 (.xml)', ext: 'xml', filterName: 'Planilha XML 2003',
    mime: 'application/xml',
    make: async () => xlsxToXml2003(us.saveXlsx()) },
  { label: 'CSV (aba ativa, ;)', ext: 'csv', filterName: 'CSV', mime: 'text/csv',
    make: async () => xlsxToCsv(us.saveXlsx()) },
  { label: 'TSV (aba ativa)', ext: 'tsv', filterName: 'TSV', mime: 'text/tab-separated-values',
    make: async () => xlsxToTsv(us.saveXlsx()) },
  { label: 'Markdown (.md)', ext: 'md', filterName: 'Markdown', mime: 'text/markdown',
    make: async () => xlsxToMarkdown(us.saveXlsx()) },
  { label: 'HTML (.html)', ext: 'html', filterName: 'HTML', mime: 'text/html',
    make: async () => xlsxToHtml(us.saveXlsx(), { fullDocument: true }) },
];

async function saveAsFormat(f: SaveFormat): Promise<void> {
  flashStatus(`Gerando ${f.ext.toUpperCase()}…`);
  try {
    const out = await f.make();
    const bytes = typeof out === 'string' ? new TextEncoder().encode(out) : out;
    const name = `${titleInput.value || 'Pasta'}.${f.ext}`;
    const bridge = (window as {
      universalSheet?: { saveFile(b: ArrayBuffer, n: string, fn: string, e: string): Promise<string | null> };
    }).universalSheet;
    if (bridge?.saveFile) {
      const path = await bridge.saveFile(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
        name, f.filterName, f.ext,
      );
      flashStatus(path ? `Salvo em ${path} ✓` : 'Cancelado');
      return;
    }
    downloadBlob(bytes.buffer as ArrayBuffer, name, f.mime);
    flashStatus(`Baixado .${f.ext} ✓`);
  } catch (err) {
    flashStatus(`⚠ Falha: ${err instanceof Error ? err.message : err}`);
  }
}

function openSaveAsMenu(anchor: HTMLElement): void {
  closeMenus();
  openMenu(SAVE_FORMATS.map((f): MenuItem => ({
    label: f.label,
    onClick: () => void saveAsFormat(f),
  })), { anchor });
}

$('actNew').addEventListener('click', () => { closeMenus(); flashStatus('Novo: em breve'); });
$('actOpen').addEventListener('click', () => void actionOpen());
$('actSave').addEventListener('click', () => void actionSave(false));
$('saveBtn').addEventListener('click', () => void actionSave(false));
$('actSaveAs').addEventListener('click', (e) => { e.stopPropagation(); openSaveAsMenu($('actSaveAs')); });
$('actPrint').addEventListener('click', () => void actionPrint());
titleInput.addEventListener('change', () => { document.title = `${titleInput.value} — Universal Sheet`; });

document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key.toLowerCase();
  if (k === 'o') { e.preventDefault(); void actionOpen(); }
  if (k === 's') {
    e.preventDefault();
    if (e.shiftKey) openSaveAsMenu($('saveBtn'));
    else void actionSave(false);
  }
  if (k === 'p') { e.preventDefault(); void actionPrint(); }
});

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
  if (/\.xlsx$/i.test(file.name) || (bytes[0] === 0x50 && bytes[1] === 0x4b)) openBytes(bytes, file.name);
  else flashStatus(`⚠ "${file.name}" não parece ser .xlsx`);
});

// ───────────────────────── abas de planilha ─────────────────────────
function renderTabs(): void {
  const names = us.getSheetNames();
  const host = $('sheetTabs');
  host.replaceChildren();
  names.forEach((n, i) => {
    const b = document.createElement('button');
    b.className = 'tab' + (i === 0 ? ' active' : '');
    b.textContent = n;
    b.addEventListener('click', () => {
      us.selectSheet(i);
      host.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      b.classList.add('active');
    });
    host.appendChild(b);
  });
  const add = document.createElement('button');
  add.className = 'add';
  add.title = 'Nova planilha';
  add.innerHTML = '<span class="micon" style="font-size:18px">add</span>';
  add.addEventListener('click', () => flashStatus('Nova planilha: em breve'));
  host.appendChild(add);
}

// ───────────────────────── barra de fórmulas ─────────────────────────
const cellRef = $('cellRef') as HTMLInputElement;
const fxInput = $('fxInput') as HTMLInputElement;
let fxGhost = false;
// a barra mostra a fórmula no idioma (ou o texto de edição da constante); célula
// derramada mostra a fórmula da âncora em cinza, como o Excel
us.addEventListener('us-selection', ((e: CustomEvent) => {
  cellRef.value = e.detail.ref;
  fxInput.value = e.detail.edit ?? e.detail.formula ?? '';
  fxGhost = !!e.detail.ghost;
  if (fxGhost) { fxInput.value = e.detail.formula; fxInput.style.color = '#9a9a9a'; }
  else fxInput.style.color = '';
}) as EventListener);
cellRef.addEventListener('change', () => { try { us.goToRef(cellRef.value.trim().toUpperCase()); } catch { /* ref inválida */ } });
// Barra de fórmulas: Enter commita o conteúdo na célula ativa (mesmo
// comportamento do Excel; fórmula inválida é recusada com o aviso). Escape
// descarta e recarrega o texto atual. Autocompletar de funções no idioma.
us.attachFormulaBar(fxInput);
// editar a célula derramada começa vazio (a fórmula cinza é a da âncora)
fxInput.addEventListener('focus', () => { if (fxGhost) { fxInput.value = ''; fxGhost = false; } fxInput.style.color = ''; });
fxInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const r = us.setActiveCellText(fxInput.value);
    if (r.ok) us.focus(); else flashStatus(`⚠ ${r.message}`);
  } else if (e.key === 'Escape') { e.preventDefault(); fxInput.value = us.activeCellEditText; us.focus(); }
});
us.addEventListener('us-entry-error', ((e: CustomEvent) => flashStatus(`⚠ ${e.detail.message}`)) as EventListener);

// ───────────────────────── zoom ─────────────────────────
const zoomSlider = $('zoom') as HTMLInputElement;
const zoomLabel = $('zoomLabel');
let zoom = 1;
const showZoom = (z: number): void => {
  zoom = z;
  const pct = Math.round(z * 100);
  zoomSlider.value = String(pct);
  zoomLabel.textContent = `${pct}%`;
  $('zoomNum').textContent = `${pct}%`;
};
zoomSlider.addEventListener('input', () => us.setZoom(parseInt(zoomSlider.value, 10) / 100));
$('zoomOut').addEventListener('click', () => us.setZoom(zoom / 1.1));
$('zoomIn').addEventListener('click', () => us.setZoom(zoom * 1.1));
us.addEventListener('us-zoom', ((e: CustomEvent) => showZoom(e.detail.zoom)) as EventListener);
const ZOOMS = [50, 75, 90, 100, 125, 150, 200];
$('zoomMenu').addEventListener('click', (e) => {
  e.stopPropagation();
  openMenu(ZOOMS.map((z) => ({ label: `${z}%`, checked: z === Math.round(zoom * 100), onClick: () => us.setZoom(z / 100) })), { anchor: $('zoomMenu') });
});

// ───────────────────────── toolbar (formatação — em breve) ─────────────────────────
const soon = (id: string): void => { $(id).addEventListener('click', () => flashStatus('Edição de células: em breve')); };
for (const id of ['undo', 'redo', 'bold', 'italic', 'underline', 'shrink', 'grow', 'merge', 'borders',
  'alignMenu', 'valignMenu', 'wrap', 'numFmtMenu', 'percent', 'currency', 'condFormat', 'filter',
  'actInsChart', 'actInsFunc', 'actInsLink', 'actFmtCells', 'actFmtRowH', 'actFmtColW', 'actFmtSheet']) {
  if ($(id)) soon(id);
}
$('print').addEventListener('click', () => void actionPrint());
const onSel = (id: string, fn: (v: string) => void) => $(id).addEventListener('change', (e) => fn((e.target as HTMLSelectElement).value));
onSel('font', () => flashStatus('Fonte: em breve'));
$('colorBtn').addEventListener('click', () => ($('color') as HTMLInputElement).click());
($('color') as HTMLInputElement).addEventListener('change', (e) => {
  const v = (e.target as HTMLInputElement).value;
  ($('colorBar')).style.background = v; flashStatus('Cor do texto: em breve');
});
$('fillBtn').addEventListener('click', () => ($('fill') as HTMLInputElement).click());
($('fill') as HTMLInputElement).addEventListener('change', (e) => {
  const v = (e.target as HTMLInputElement).value;
  ($('fillBar')).style.background = v; flashStatus('Preenchimento: em breve');
});

// visões do rodapé
for (const btn of document.querySelectorAll<HTMLButtonElement>('footer [data-view]')) {
  btn.addEventListener('click', () => {
    document.querySelectorAll('footer [data-view]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    if (btn.dataset.view !== 'normal') flashStatus('Modos de exibição: em breve');
  });
}

// ───────────────────────── boot ─────────────────────────
applyAccent(localStorage.getItem('us-accent') || 'green');
applyMode((localStorage.getItem('us-mode') as ColorMode) || 'auto');
rippleAll(document, '#toolbarRow .tb-g button, footer [data-view]');

(async () => {
  try {
    const res = await fetch('/samples/showcase.xlsx');
    if (res.ok) {
      openBytes(new Uint8Array(await res.arrayBuffer()), 'showcase.xlsx');
      us.setZoom(1);
    }
  } catch { /* sem sample */ }
})();

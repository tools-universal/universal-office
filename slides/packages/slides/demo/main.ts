import '../src/universal-slides';
import type { UniversalSlidesElement } from '../src/universal-slides';
import type { UniversalPresentationViewerElement } from '@universal/presentation-viewer';

const us = document.getElementById('us') as UniversalSlidesElement;
const $ = (id: string) => document.getElementById(id)!;
const docTitle = $('docTitle') as HTMLInputElement;
const status = $('status');
const slideNumEl = $('slideNum');
const thumbsEl = $('thumbs');

let savedBytes: Uint8Array | null = null;
let savedName = 'apresentacao.pptx';

// ───────────── menus (dropdowns) ─────────────
const menus: [string, string][] = [['menuFile', 'ddFile'], ['menuInsert', 'ddInsert'], ['menuPresent', 'ddPresent']];
for (const [btn, dd] of menus) {
  $(btn).addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = $(dd).classList.contains('show');
    closeMenus();
    if (!wasOpen) { $(dd).classList.add('show'); $(btn).classList.add('open'); }
  });
}
function closeMenus(): void {
  for (const [btn, dd] of menus) { $(dd).classList.remove('show'); $(btn).classList.remove('open'); }
}
document.addEventListener('click', closeMenus);

// ───────────── modo claro / escuro ─────────────
const applyTheme = (dark: boolean): void => {
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('us-theme', dark ? 'dark' : 'light');
};
$('darkToggle').addEventListener('click', () => applyTheme(!document.documentElement.classList.contains('dark')));
applyTheme(localStorage.getItem('us-theme') === 'dark');

// ───────────── arquivo (abrir / salvar / imprimir) ─────────────
function setStatus(msg: string, ms = 1800): void {
  status.textContent = msg;
  if (ms) setTimeout(() => { if (status.textContent === msg) status.textContent = 'Pronto'; }, ms);
}
function setTitle(name: string): void {
  docTitle.value = name.replace(/\.pptx$/i, '');
  document.title = `${docTitle.value} — Universal Slides`;
  savedName = name;
}
function openBytes(bytes: Uint8Array, name: string): void {
  try { us.loadPptx(bytes); } catch (e) {
    setStatus(`⚠ "${name}" não é um .pptx válido`);
    console.error(e); return;
  }
  savedBytes = bytes;
  setTitle(name);
  setStatus(`"${name}" aberto ✓`);
  renderThumbnails();
}
async function actionOpen(): Promise<void> {
  closeMenus();
  if ('showOpenFilePicker' in window) {
    try {
      const [h] = await (window as unknown as {
        showOpenFilePicker: (o: object) => Promise<FileSystemFileHandle[]>;
      }).showOpenFilePicker({
        types: [{ description: 'Apresentação', accept: { 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'] } }],
      });
      const file = await h!.getFile();
      openBytes(new Uint8Array(await file.arrayBuffer()), file.name);
      return;
    } catch { return; }
  }
  ($('pptxFile') as HTMLInputElement).click();
}
($('pptxFile') as HTMLInputElement).addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) openBytes(new Uint8Array(await file.arrayBuffer()), file.name);
  (e.target as HTMLInputElement).value = '';
});

function actionSave(saveAs = false): void {
  closeMenus();
  if (!savedBytes) { setStatus('⚠ Nada para salvar'); return; }
  // Round-trip lossless: por enquanto re-salva o pacote original byte a byte
  // (edicao destrutiva ainda nao implementada). Assim que houver edicao no
  // modelo, este caminho passa pelo `pkg.save()` do componente.
  const suggested = saveAs ? `${docTitle.value}.pptx` : savedName;
  downloadBlob(savedBytes, suggested, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  setStatus(`"${suggested}" baixado ✓`);
}
function downloadBlob(data: BlobPart, filename: string, type: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

$('actNew').addEventListener('click', () => { closeMenus(); setStatus('Novo: em breve'); });
$('actOpen').addEventListener('click', () => void actionOpen());
$('actSave').addEventListener('click', () => actionSave(false));
$('actSaveAs').addEventListener('click', () => actionSave(true));
$('actPrint').addEventListener('click', () => { closeMenus(); window.print(); });
$('primaryOpen').addEventListener('click', () => void actionOpen());

// ───────────── inserir / apresentar — placeholders ─────────────
for (const id of ['actInsSlide', 'actInsImage', 'actInsShape', 'actInsText'])
  $(id).addEventListener('click', () => { closeMenus(); setStatus('Edição de slide: em breve'); });
$('actPlayBegin').addEventListener('click', () => { closeMenus(); play(0); });
$('actPlayHere').addEventListener('click', () => { closeMenus(); play(us.getSlideIndex()); });
$('play').addEventListener('click', () => play(us.getSlideIndex()));

function play(from: number): void {
  // Modo apresentar: instância DEDICADA do <universal-presentation-viewer>
  // (o webcomponent de visualização pura) em overlay fullscreen — o mesmo
  // componente embarcável que terceiros usam fora do editor.
  if (!savedBytes) { setStatus('⚠ Nada para apresentar'); return; }
  const pv = document.createElement('universal-presentation-viewer') as UniversalPresentationViewerElement;
  pv.style.cssText = 'position:fixed;inset:0;z-index:100;background:#000;';
  document.body.appendChild(pv);
  pv.loadPptx(savedBytes);
  pv.selectSlide(from);
  const close = (): void => {
    pv.remove();
    document.removeEventListener('fullscreenchange', onFsChange);
    document.removeEventListener('keydown', onKey, true);
    us.selectSlide(pv.getSlideIndex()); // volta para o editor no slide atual
  };
  const onFsChange = (): void => { if (!document.fullscreenElement) close(); };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && !document.fullscreenElement) { e.preventDefault(); close(); }
  };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('keydown', onKey, true);
  pv.present();
}

// ───────────── navegação prev/next + atalhos ─────────────
$('prev').addEventListener('click', () => us.prev());
$('next').addEventListener('click', () => us.next());
$('prev2').addEventListener('click', () => us.prev());
$('next2').addEventListener('click', () => us.next());
$('zoomFit').addEventListener('click', () => { /* fit ja e default */ setStatus('Ajustado'); });
$('undo').addEventListener('click', () => setStatus('Desfazer: em breve'));
$('redo').addEventListener('click', () => setStatus('Refazer: em breve'));

document.addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement | null;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (e.ctrlKey || e.metaKey) {
    const k = e.key.toLowerCase();
    if (k === 'o') { e.preventDefault(); void actionOpen(); }
    else if (k === 's') { e.preventDefault(); actionSave(e.shiftKey); }
    else if (k === 'p') { e.preventDefault(); window.print(); }
    return;
  }
  if (e.key === 'F5') { e.preventDefault(); play(e.shiftKey ? us.getSlideIndex() : 0); }
});

// ───────────── drag & drop ─────────────
let dragDepth = 0;
document.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; $('dropOverlay').classList.add('show'); });
document.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('dropOverlay').classList.remove('show'); } });
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', async (e) => {
  e.preventDefault(); dragDepth = 0; $('dropOverlay').classList.remove('show');
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  if (/\.pptx$/i.test(file.name)) openBytes(new Uint8Array(await file.arrayBuffer()), file.name);
  else setStatus(`⚠ "${file.name}" não parece ser .pptx`);
});

// ───────────── miniaturas (sidebar) ─────────────
function renderThumbnails(): void {
  const total = us.getSlideCount();
  thumbsEl.replaceChildren();
  for (let i = 0; i < total; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'thumb' + (i === us.getSlideIndex() ? ' active' : '');
    wrap.dataset.idx = String(i);
    const c = document.createElement('canvas');
    wrap.appendChild(c);
    const num = document.createElement('span');
    num.className = 'num'; num.textContent = String(i + 1);
    wrap.appendChild(num);
    wrap.addEventListener('click', () => us.selectSlide(i));
    thumbsEl.appendChild(wrap);
  }
  // pinta uma vez agora; imagens decodificam async e disparam `us-image` -> repinta
  paintAllThumbs();
}
function paintAllThumbs(): void {
  const total = us.getSlideCount();
  for (let i = 0; i < total; i++) {
    const wrap = thumbsEl.children[i] as HTMLElement | undefined;
    if (!wrap) continue;
    const canvas = wrap.querySelector('canvas')!;
    us.renderThumbnail(i, canvas);
  }
}
function updateActiveThumb(): void {
  for (const el of thumbsEl.querySelectorAll<HTMLElement>('.thumb')) {
    el.classList.toggle('active', Number(el.dataset.idx) === us.getSlideIndex());
  }
  const active = thumbsEl.querySelector('.thumb.active');
  active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

us.addEventListener('us-loaded', ((e: CustomEvent) => {
  slideNumEl.textContent = `1 / ${e.detail.count}`;
}) as EventListener);
us.addEventListener('us-slide', ((e: CustomEvent) => {
  slideNumEl.textContent = `${e.detail.index + 1} / ${us.getSlideCount()}`;
  updateActiveThumb();
}) as EventListener);
us.addEventListener('us-image', (() => { paintAllThumbs(); }) as EventListener);

// ───────────── boot: carrega showcase por padrão ─────────────
(async () => {
  try {
    const res = await fetch('/samples/showcase_animado.pptx');
    if (res.ok) {
      openBytes(new Uint8Array(await res.arrayBuffer()), 'showcase_animado.pptx');
      return;
    }
  } catch { /* fall through */ }
  try {
    const res = await fetch('/samples/reference.pptx');
    if (res.ok) openBytes(new Uint8Array(await res.arrayBuffer()), 'reference.pptx');
  } catch { setStatus('Arraste um .pptx para começar', 0); }
})();

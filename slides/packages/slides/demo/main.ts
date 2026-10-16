import '../src/universal-slides';
import type { UniversalSlidesElement } from '../src/universal-slides';
import type { UniversalPresentationViewerElement } from '@universal-office/presentation-viewer';
import { FontResolver, openFontEmbeddingDialog, describeFontEmbedding, type HostFontProvider } from '@universal-office/fonts';
import { isCfb, convertPptToPptx } from '@universal-office/slides-core';

// Electron: fontes do SO por família vêm do processo principal (Windows\Fonts +
// usuário + cache CloudFonts do Office, que o queryLocalFonts não enxerga) —
// configurado no resolvedor ÚNICO dos apps (shared/fonts)
const bridge = (window as unknown as {
  universalSlides?: { listFonts?: HostFontProvider['list']; resolveFonts?: HostFontProvider['resolve'] };
}).universalSlides;
FontResolver.shared().configure({
  baseUrl: './fonts',
  host: bridge?.listFonts && bridge.resolveFonts ? { list: bridge.listFonts, resolve: bridge.resolveFonts } : null,
});

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
  docTitle.value = name.replace(/\.pptx?$/i, '');
  document.title = `${docTitle.value} — Universal Slides`;
  savedName = name;
}
function openBytes(bytes: Uint8Array, name: string): void {
  try {
    // .ppt (97-2003): converte uma vez p/ .pptx — salvar grava o .pptx convertido
    if (isCfb(bytes)) { bytes = convertPptToPptx(bytes); name = name.replace(/\.ppt$/i, '.pptx'); }
    us.loadPptx(bytes);
  } catch (e) {
    setStatus(`⚠ "${name}" não abriu: ${e instanceof Error ? e.message : String(e)}`);
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
        types: [{ description: 'Apresentação', accept: {
          'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
          'application/vnd.ms-powerpoint': ['.ppt'],
        } }],
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

async function actionSave(saveAs = false): Promise<void> {
  closeMenus();
  if (!savedBytes) { setStatus('⚠ Nada para salvar'); return; }
  // Round-trip lossless: re-salva o pacote original byte a byte (edicao
  // destrutiva ainda nao implementada) — exceto quando a opcao "fontes no
  // arquivo" esta ligada ou foi mexida: ai o componente aplica a opcao sobre
  // uma copia do pacote (us.savePptx).
  const suggested = saveAs ? `${docTitle.value}.pptx` : savedName;
  let bytes: Uint8Array = savedBytes;
  let note = '';
  if (fontOptionTouched || us.getFontEmbedding().embed) {
    const onReport = ((e: CustomEvent) => { note = describeFontEmbedding(e.detail); }) as EventListener;
    us.addEventListener('us-font-embedding', onReport, { once: true });
    try { bytes = await us.savePptx(); }
    catch (e) { setStatus(`⚠ Não salvou: ${e instanceof Error ? e.message : String(e)}`); return; }
    finally { us.removeEventListener('us-font-embedding', onReport); }
  }
  downloadBlob(bytes as BlobPart, suggested, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  setStatus(`"${suggested}" baixado ✓${note ? ` · ${note}` : ''}`, note ? 6000 : 1800);
}

// ───── fontes no arquivo (opção única dos apps — shared/fonts) ─────
let fontOptionTouched = false;
$('actFontEmbedding').addEventListener('click', () => {
  closeMenus();
  void openFontEmbeddingDialog({ app: 'slides', settings: us.getFontEmbedding() }).then((s) => {
    if (!s) return;
    us.setFontEmbedding(s);
    fontOptionTouched = true;
  });
});
function downloadBlob(data: BlobPart, filename: string, type: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

$('actNew').addEventListener('click', () => { closeMenus(); setStatus('Novo: em breve'); });
$('actOpen').addEventListener('click', () => void actionOpen());
$('actSave').addEventListener('click', () => void actionSave(false));
$('actSaveAs').addEventListener('click', () => void actionSave(true));
$('actPrint').addEventListener('click', () => { closeMenus(); window.print(); });
$('primaryOpen').addEventListener('click', () => void actionOpen());

// ───────────── inserir / apresentar — placeholders ─────────────
for (const id of ['actInsSlide', 'actInsImage', 'actInsShape', 'actInsText'])
  $(id).addEventListener('click', () => { closeMenus(); setStatus('Edição de slide: em breve'); });
$('actPlayBegin').addEventListener('click', () => { closeMenus(); play('start'); });
$('actPlayHere').addEventListener('click', () => { closeMenus(); play(us.getSlideIndex()); });
$('play').addEventListener('click', () => play(us.getSlideIndex()));

function play(from: number | 'start'): void {
  // Modo apresentar: instância DEDICADA do <universal-presentation-viewer>
  // (o webcomponent de visualização pura) em overlay — o mesmo componente
  // embarcável que terceiros usam fora do editor. A apresentação (tela cheia,
  // clique/teclas do apresentador, Esc) é dele; ao sair, `us-present-end`.
  if (!savedBytes) { setStatus('⚠ Nada para apresentar'); return; }
  const pv = document.createElement('universal-presentation-viewer') as UniversalPresentationViewerElement;
  pv.style.cssText = 'position:fixed;inset:0;z-index:100;background:#000;';
  document.body.appendChild(pv);
  pv.loadPptx(savedBytes);
  pv.addEventListener('us-present-end', () => {
    pv.remove();
    us.selectSlide(pv.getSlideIndex()); // volta para o editor no slide atual
  }, { once: true });
  pv.present(from);
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
    else if (k === 's') { e.preventDefault(); void actionSave(e.shiftKey); }
    else if (k === 'p') { e.preventDefault(); window.print(); }
    return;
  }
  if (e.key === 'F5') { e.preventDefault(); play(e.shiftKey ? us.getSlideIndex() : 'start'); }
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
  if (!/\.pptx?$/i.test(file.name)) { setStatus(`⚠ "${file.name}" não parece ser .pptx/.ppt`); return; }
  try {
    openBytes(new Uint8Array(await file.arrayBuffer()), file.name);
  } catch (err) {
    setStatus(`⚠ "${file.name}" não pôde ser lido: ${err instanceof Error ? err.message : String(err)}`);
  }
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

// Página de teste do <universal-presentation-viewer>: abrir arquivo (botão,
// arrastar e soltar, amostras do repositório), miniaturas, navegação,
// apresentação (F5) e reprodução automática. Bundle: demo/build.mjs.
import '../src/universal-presentation-viewer';
import type { UniversalPresentationViewerElement } from '../src/universal-presentation-viewer';

const pv = document.getElementById('pv') as UniversalPresentationViewerElement;
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const fileInput = $<HTMLInputElement>('file');
const samples = $<HTMLSelectElement>('samples');
const thumbs = $('thumbs');
const statusEl = $('status');
const playBtn = $<HTMLButtonElement>('play');

let fileName = '';
let playing = false;
/** Abertura mais recente: uma amostra lenta não sobrescreve um arquivo aberto depois. */
let openSeq = 0;

function setStatus(msg: string, error = false): void {
  statusEl.textContent = msg;
  statusEl.className = error ? 'error' : '';
}

// ───────────── abrir ─────────────

function openBytes(bytes: Uint8Array, name: string): void {
  const t0 = performance.now();
  const legacy = bytes[0] === 0xd0 && bytes[1] === 0xcf; // CFB: .ppt 97-2003 (convertido na carga)
  try {
    pv.loadPptx(bytes);
  } catch (e) {
    setStatus(`"${name}" não abriu: ${e instanceof Error ? e.message : String(e)}`, true);
    console.error(e);
    return;
  }
  fileName = name;
  if (playing) endPlay(''); // a reprodução era do deck anterior (o viewer já parou)
  document.title = `${name} — Viewer`;
  $('fileName').textContent = name;
  $('empty').style.display = 'none';
  const n = pv.getSlideCount();
  setStatus(`"${name}": ${n} slide${n === 1 ? '' : 's'}${legacy ? ' (.ppt convertido)' : ''} em ${Math.round(performance.now() - t0)} ms`);
  for (const id of ['prev', 'next', 'play', 'full']) $<HTMLButtonElement>(id).disabled = n === 0;
  buildThumbs();
  updateNav();
  // fontes embutidas chegam depois: repinta as miniaturas
  void pv.fontsReady().then(paintThumbs);
}

async function openFile(file: File): Promise<void> {
  const seq = ++openSeq;
  setStatus(`Abrindo "${file.name}"…`);
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch (e) { // pasta solta, arquivo sumiu/sem permissão…
    if (seq === openSeq) setStatus(`"${file.name}" não pôde ser lido: ${e instanceof Error ? e.message : String(e)}`, true);
    return;
  }
  if (seq === openSeq) openBytes(bytes, file.name);
}

$('open').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  const f = fileInput.files?.[0];
  if (f) void openFile(f);
  fileInput.value = '';
});

// arrastar e soltar em qualquer lugar da página
let dragDepth = 0;
document.addEventListener('dragenter', (e) => { if (e.dataTransfer?.types.includes('Files')) { dragDepth++; document.body.classList.add('dragging'); } });
document.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dragging'); } });
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('dragging');
  const f = e.dataTransfer?.files[0];
  if (f) void openFile(f);
});

// amostras do repositório (lista gerada pelo build)
void fetch('./samples.json').then((r) => (r.ok ? r.json() : [])).then((list: { name: string; url: string }[]) => {
  for (const s of list) samples.add(new Option(s.name, s.url));
}).catch(() => { samples.style.display = 'none'; });
samples.addEventListener('change', async () => {
  const url = samples.value;
  const name = samples.selectedOptions[0]?.text ?? url;
  samples.value = '';
  if (!url) return;
  const seq = ++openSeq;
  setStatus(`Baixando "${name}"…`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (seq === openSeq) openBytes(bytes, name.split('/').pop()!);
  } catch (e) {
    if (seq === openSeq) setStatus(`"${name}" não baixou: ${e instanceof Error ? e.message : String(e)}`, true);
  }
});

// ───────────── miniaturas ─────────────

let thumbCanvases: HTMLCanvasElement[] = [];

function buildThumbs(): void {
  thumbs.replaceChildren();
  // proporção real do slide (4:3, 16:9, A4…)
  const probe = document.createElement('canvas');
  const ratio = pv.renderSlideToCanvas(0, probe, 160) ? `${probe.width} / ${probe.height}` : '16 / 9';
  thumbCanvases = [];
  for (let i = 0; i < pv.getSlideCount(); i++) {
    const item = document.createElement('div');
    item.className = 'thumb';
    item.title = `Slide ${i + 1}`;
    const num = document.createElement('span');
    num.textContent = String(i + 1);
    const cv = document.createElement('canvas');
    cv.style.aspectRatio = ratio;
    item.append(num, cv);
    item.addEventListener('click', () => { pv.selectSlide(i); updateNav(); });
    thumbs.appendChild(item);
    thumbCanvases.push(cv);
  }
  paintThumbs();
}

let thumbRaf = 0;
function paintThumbs(): void {
  if (thumbRaf) return;
  thumbRaf = requestAnimationFrame(() => {
    thumbRaf = 0;
    thumbCanvases.forEach((cv, i) => pv.renderThumbnail(i, cv));
  });
}

// imagens decodificam depois da carga; fontes chegam sob demanda
pv.addEventListener('us-image', paintThumbs);
document.fonts?.addEventListener?.('loadingdone', paintThumbs);

// ───────────── navegação ─────────────

function updateNav(): void {
  const n = pv.getSlideCount(), i = pv.getSlideIndex();
  $('counter').textContent = n ? `${i + 1} / ${n}` : '–';
  $<HTMLButtonElement>('prev').disabled = !n || i === 0;
  $<HTMLButtonElement>('next').disabled = !n || i >= n - 1;
  thumbs.querySelectorAll('.thumb').forEach((el, k) => el.classList.toggle('current', k === i));
  thumbs.children[i]?.scrollIntoView({ block: 'nearest' });
}

pv.addEventListener('us-slide', updateNav);
$('prev').addEventListener('click', () => { pv.prev(); updateNav(); });
$('next').addEventListener('click', () => { pv.next(); updateNav(); });

// ───────────── apresentação (F5) ─────────────

function present(from: number | 'start'): void {
  if (!pv.getSlideCount()) return;
  if (playing) { pv.stopPlayback(); endPlay('Reprodução parada'); }
  pv.present(from, {
    useTimings: $<HTMLInputElement>('useTimings').checked,
    loop: $<HTMLInputElement>('loop').checked,
  });
}

type StepDetail = { index: number; step?: number; steps?: number };
function presentStatus(d: StepDetail): void {
  const passos = d.steps ? ` · passo ${d.step ?? 0}/${d.steps}` : '';
  setStatus(`"${fileName}" · apresentando slide ${d.index + 1}${passos} — clique/→ avança, ← volta, Esc sai`);
}

$('full').addEventListener('click', () => present(pv.getSlideIndex()));
pv.addEventListener('us-slide', (e) => { if (pv.isPresenting()) presentStatus((e as CustomEvent<StepDetail>).detail); });
pv.addEventListener('us-step', (e) => presentStatus((e as CustomEvent<StepDetail>).detail));
pv.addEventListener('us-present-end', () => { setStatus('Apresentação encerrada'); updateNav(); });

// ───────────── reprodução automática ─────────────

function togglePlay(): void {
  if (!pv.getSlideCount()) return;
  if (playing) { pv.stopPlayback(); return endPlay('Reprodução parada'); }
  const secs = Math.max(0.5, Number($<HTMLInputElement>('defaultSec').value) || 3);
  const tl = pv.play({
    from: pv.getSlideIndex(),
    loop: $<HTMLInputElement>('loop').checked,
    useTimings: $<HTMLInputElement>('useTimings').checked,
    defaultSlideMs: secs * 1000,
  });
  playing = true;
  playBtn.textContent = '■ Parar';
  const total = (tl.durationMs / 1000).toFixed(1).replace('.', ',');
  const tick = (): void => {
    const t = pv.getPlaybackTime();
    if (t !== null) setStatus(`"${fileName}" · reproduzindo ${(t / 1000).toFixed(1).replace('.', ',')} / ${total} s`);
  };
  tick();
  window.clearInterval(clock);
  clock = window.setInterval(tick, 200);
}

let clock = 0;
function endPlay(msg: string): void {
  window.clearInterval(clock);
  playing = false;
  playBtn.textContent = '▶ Reproduzir';
  if (msg) setStatus(msg);
  updateNav();
}

playBtn.addEventListener('click', togglePlay);
pv.addEventListener('us-playback-end', () => endPlay('Reprodução terminou'));
// o viewer para sozinho em Esc / ao navegar manualmente
pv.addEventListener('us-slide', () => { if (playing && !pv.isPlaying()) endPlay('Reprodução parada'); });

// ───────────── teclado ─────────────

document.addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement;
  if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement) return;
  const k = e.key.toLowerCase();
  // apresentando: as teclas são do apresentador (o viewer já tratou); F5 não recarrega a página
  if (pv.isPresenting()) { if (k === 'f5') e.preventDefault(); return; }
  // Ctrl/Alt/Meta + tecla é atalho do navegador (Ctrl+F buscar, Ctrl+P imprimir…)
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === 'f5') { present(e.shiftKey ? pv.getSlideIndex() : 'start'); e.preventDefault(); return; }
  if (k === 'f') { present(pv.getSlideIndex()); e.preventDefault(); return; }
  if (k === 'p') { togglePlay(); e.preventDefault(); return; }
  if (k === 'escape' && playing) { pv.stopPlayback(); endPlay('Reprodução parada'); return; }
  if (t === pv) { queueMicrotask(updateNav); return; } // o canvas do viewer já tratou as setas
  if (k === 'arrowright' || k === 'pagedown' || k === ' ') { pv.next(); updateNav(); e.preventDefault(); }
  else if (k === 'arrowleft' || k === 'pageup') { pv.prev(); updateNav(); e.preventDefault(); }
  else if (k === 'home') { pv.selectSlide(0); updateNav(); e.preventDefault(); }
  else if (k === 'end') { pv.selectSlide(pv.getSlideCount() - 1); updateNav(); e.preventDefault(); }
});

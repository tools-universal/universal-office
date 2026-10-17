// Demo do <universal-document-viewer> (index.html): atributos, variáveis CSS e
// eventos ao vivo, com o HTML/CSS equivalente.
import '../src/index.js';
import { CONTROL_ITEMS, type UniversalDocumentViewerElement } from '../src/index.js';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const dv = $<UniversalDocumentViewerElement>('dv');
const log = (s: string): void => { $('log').textContent = s; };

const list = $('list');
for (const it of CONTROL_ITEMS) {
  const l = document.createElement('label');
  l.innerHTML = `<input type="checkbox" data-t="${it}" /> no${it}`;
  list.appendChild(l);
}

const FIXTURES = ['caracteres', 'cp1252', 'degrades', 'estilos', 'formas', 'imagens', 'listas', 'notas-campos', 'paragrafos', 'secoes', 'tabelas'];
const sel = $<HTMLSelectElement>('samples');
sel.add(new Option('amostra-indice-comentarios.docx', './amostra-indice-comentarios.docx', true, true));
for (const f of FIXTURES) {
  const url = `../../docx-core/test/fixtures/doc/${f}.word.docx`;
  sel.add(new Option(`${f}.docx`, url, false, url === dv.getAttribute('src')));
  const doc = `../../docx-core/test/fixtures/doc/${f}.doc`;
  sel.add(new Option(`${f}.doc (binário)`, doc));
}
sel.addEventListener('change', () => dv.setAttribute('src', sel.value));

$('open').addEventListener('click', () => $<HTMLInputElement>('file').click());
$<HTMLInputElement>('file').addEventListener('change', async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  dv.removeAttribute('src');
  try { await dv.loadDocx(new Uint8Array(await f.arrayBuffer())); } catch (err) { log(`erro: ${String(err)}`); }
});

// índice montado pela API pública: getHeadings() + goToHeading(i); udv-heading marca o atual
const api = $('api');
const renderApi = (): void => {
  api.textContent = '';
  const hs = dv.getHeadings();
  if (!hs.length) { api.textContent = '(sem títulos)'; return; }
  hs.forEach((h, i) => {
    const b = document.createElement('button');
    b.style.paddingLeft = `${(h.level - 1) * 14}px`;
    b.textContent = `${h.text} — p. ${h.page + 1}`;
    b.addEventListener('click', () => dv.goToHeading(i));
    api.appendChild(b);
  });
};
dv.addEventListener('udv-loaded', (e) => { renderApi(); log(`udv-loaded { pages: ${(e as CustomEvent).detail.pages}, headings: ${dv.getHeadings().length}, comments: ${dv.getComments().length} }`); });
dv.addEventListener('udv-heading', (e) => {
  const d = (e as CustomEvent).detail as { index: number; text?: string };
  api.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-current', String(i === d.index)));
  log(`udv-heading { index: ${d.index}${d.text ? `, text: ${JSON.stringify(d.text)}` : ''} }`);
});
dv.addEventListener('udv-comment', (e) => { const d = (e as CustomEvent).detail; log(`udv-comment { id: ${d.id}, author: ${JSON.stringify(d.author)} }`); });
dv.addEventListener('udv-page', (e) => log(`udv-page { index: ${(e as CustomEvent).detail.index} }`));
dv.addEventListener('udv-zoom', (e) => { const d = (e as CustomEvent).detail; log(`udv-zoom { zoom: ${JSON.stringify(d.zoom)}, factor: ${d.factor.toFixed(2)} }`); });
dv.addEventListener('udv-error', (e) => log(`udv-error ${String((e as CustomEvent).detail.error)}`));
for (const name of ['udv-download', 'udv-print']) {
  dv.addEventListener(name, (e) => {
    const d = (e as CustomEvent).detail as { filename?: string; bytes?: Uint8Array; pdf?: Uint8Array };
    const size = (d.bytes ?? d.pdf)?.length ?? 0;
    if ($<HTMLInputElement>('cancel').checked) { e.preventDefault(); log(`${name} cancelado pelo host (${d.filename ?? 'PDF'}, ${size} bytes)`); }
    else log(`${name}: ${d.filename ?? 'PDF'} (${size} bytes)`);
  });
}

function apply(): void {
  const no = $<HTMLInputElement>('nocontrols').checked;
  dv.toggleAttribute('nocontrols', no);
  let off = '';
  for (const i of list.querySelectorAll<HTMLInputElement>('input')) {
    dv.toggleAttribute(`no${i.dataset['t']}`, i.checked);
    if (i.checked) off += ` no${i.dataset['t']}`;
  }
  const color = $<HTMLInputElement>('vColor').value, prog = $<HTMLInputElement>('vProgress').value, bg = $<HTMLInputElement>('vBg').value;
  const size = $<HTMLInputElement>('vSize').value, ph = $<HTMLInputElement>('vPh').value;
  const outs = document.querySelectorAll<HTMLOutputElement>('.var output');
  outs[3]!.value = `${size}px`; outs[4]!.value = `${ph}px`;
  const vars: string[] = [];
  if (color !== '#ffffff') vars.push(`  --udv-controls-color: ${color};`);
  if (prog !== '#ffffff') vars.push(`  --udv-progress-color: ${prog};`);
  if (bg !== '#2b2b2b') vars.push(`  --udv-background: ${bg};`);
  if (size !== '22') vars.push(`  --udv-controls-size: ${size}px;`);
  if (ph !== '3') vars.push(`  --udv-progress-height: ${ph}px;`);
  const css = vars.length ? `universal-document-viewer {\n${vars.join('\n')}\n}\n` : '';
  $('userCss').textContent = css;
  $('markup').textContent = (css ? `<style>\n${css}</style>\n` : '')
    + `<universal-document-viewer src="contrato.docx"${no ? ' nocontrols' : off}></universal-document-viewer>`;
}
document.querySelector('aside')!.addEventListener('input', apply);
apply();

// Demo dos controles do viewer (controls.html): liga atributos, variáveis CSS e
// ::part() ao vivo e mostra o HTML/CSS equivalente.
import '../src/index.js';
import { CONTROL_ITEMS } from '../src/index.js';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const pv = $('pv');
const log = (s: string): void => { $('log').textContent = s; };

const list = $('list');
for (const it of CONTROL_ITEMS) {
  const l = document.createElement('label');
  l.innerHTML = `<input type="checkbox" data-t="${it}" /> no${it}`;
  list.appendChild(l);
}

void fetch('./samples.json').then((r) => (r.ok ? r.json() : [])).then((items: { name: string; url: string }[]) => {
  const sel = $<HTMLSelectElement>('samples');
  for (const s of items) sel.add(new Option(s.name, s.url, false, s.url === pv.getAttribute('src')));
  sel.addEventListener('change', () => pv.setAttribute('src', sel.value));
}).catch(() => {});

pv.addEventListener('us-loaded', (e) => log(`us-loaded { count: ${(e as CustomEvent).detail.count} }`));
pv.addEventListener('us-slide', (e) => log(`us-slide { index: ${(e as CustomEvent).detail.index} }`));
pv.addEventListener('us-present-end', () => log('us-present-end'));
pv.addEventListener('us-playback-end', () => log('us-playback-end'));
pv.addEventListener('us-download', (e) => {
  const d = (e as CustomEvent).detail as { filename: string; bytes: Uint8Array };
  if ($<HTMLInputElement>('cancelDl').checked) { e.preventDefault(); log(`us-download cancelado pelo host: ${d.filename} (${d.bytes.length} bytes)`); }
  else log(`us-download: ${d.filename} (${d.bytes.length} bytes)`);
});

function apply(): void {
  const no = $<HTMLInputElement>('nocontrols').checked;
  pv.toggleAttribute('nocontrols', no);
  let off = '';
  for (const i of list.querySelectorAll<HTMLInputElement>('input')) {
    pv.toggleAttribute(`no${i.dataset['t']}`, i.checked);
    if (i.checked) off += ` no${i.dataset['t']}`;
  }

  const color = $<HTMLInputElement>('vColor').value, prog = $<HTMLInputElement>('vProgress').value;
  const hover = $<HTMLInputElement>('vHover').value, size = $<HTMLInputElement>('vSize').value, ph = $<HTMLInputElement>('vPh').value;
  const outs = document.querySelectorAll<HTMLOutputElement>('.var output');
  outs[2]!.value = `${hover}%`; outs[3]!.value = `${size}px`; outs[4]!.value = `${ph}px`;
  const vars: string[] = [];
  if (color !== '#ffffff') vars.push(`  --upv-controls-color: ${color};`);
  if (prog !== '#ffffff') vars.push(`  --upv-progress-color: ${prog};`);
  if (hover !== '16') vars.push(`  --upv-controls-hover-bg: rgb(255 255 255 / ${hover}%);`);
  if (size !== '22') vars.push(`  --upv-controls-size: ${size}px;`);
  if (ph !== '3') vars.push(`  --upv-progress-height: ${ph}px;`);
  let css = vars.length ? `universal-presentation-viewer {\n${vars.join('\n')}\n}\n` : '';
  if ($<HTMLInputElement>('partDemo').checked) {
    css += `universal-presentation-viewer::part(button-present) {\n  width: auto; padding: 0 14px; border-radius: 999px;\n  background: rgb(255 255 255 / .2);\n}\n`
      + `universal-presentation-viewer::part(progress-value) { border-radius: 999px; }\n`
      + `universal-presentation-viewer::part(progress) { border-radius: 999px; }\n`;
  }
  $('userCss').textContent = css;
  const attrs = no ? ' nocontrols' : off;
  $('markup').textContent = (css ? `<style>\n${css}</style>\n` : '') + `<universal-presentation-viewer src="deck.pptx"${attrs}></universal-presentation-viewer>`;
}
document.querySelector('aside')!.addEventListener('input', apply);
apply();

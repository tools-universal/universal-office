/**
 * Demo mínima do @universal-office/spell: revisa a caixa de texto, sublinha os
 * erros e mostra sugestões / Adicionar / Ignorar. `npm run demo` (esbuild com
 * splitting, como o tools/build-pkg.mjs: dicionários e motor viram chunks) e
 * servir a pasta demo/ (ex.: python -m http.server 8095).
 */
import { SpellChecker, localStorageStore, type Misspelling } from '../src/index.js';
import { registerBuiltinSources } from '../src/builtin.js';

// motor e dicionários do repositório (chunks da demo); no pacote publicado, os pacotes à parte
registerBuiltinSources();

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const sc = new SpellChecker({ store: localStorageStore('universal-office.spell.demo') });
(globalThis as unknown as { spell: SpellChecker }).spell = sc;

const text = $<HTMLTextAreaElement>('text');
const out = $('out');
const lang = $<HTMLSelectElement>('lang');
const status = $('status');
const panel = $('panel');
let errs: Misspelling[] = [];
let current: Misspelling | undefined;

async function run(): Promise<void> {
  const l = lang.value;
  const r = sc.resolve(l);
  const t0 = performance.now();
  const wasLoaded = sc.isLoaded(l);
  errs = await sc.checkText(text.value, l, { ignoreUppercase: $<HTMLInputElement>('upper').checked });
  const ms = performance.now() - t0;
  status.textContent = !r
    ? `${l}: sem dicionário — nada é sublinhado`
    : `${l} → dicionário ${r.id}${r.exact ? '' : ' (variante da mesma língua)'} · motor: ${sc.mode} · ${errs.length} erro(s) · ${wasLoaded ? 'revisão' : 'carga + revisão'} em ${ms.toFixed(0)} ms`;
  render();
}

function render(): void {
  out.textContent = '';
  let pos = 0;
  const src = text.value;
  for (const e of errs) {
    out.append(src.slice(pos, e.start));
    const span = document.createElement('span');
    span.className = 'err';
    span.textContent = src.slice(e.start, e.end);
    span.dataset.start = String(e.start);
    span.onclick = () => pick(e, span);
    out.append(span);
    pos = e.end;
  }
  out.append(src.slice(pos));
  panel.style.display = 'none';
}

async function pick(e: Misspelling, span: HTMLElement): Promise<void> {
  current = e;
  out.querySelectorAll('.sel').forEach((s) => s.classList.remove('sel'));
  span.classList.add('sel');
  $('pword').textContent = e.word;
  const sugs = $('sugs');
  sugs.textContent = '…';
  panel.style.display = 'block';
  const list = await sc.suggest(e.word, lang.value);
  sugs.textContent = list.length ? '' : '(nenhuma)';
  for (const s of list) {
    const b = document.createElement('button');
    b.className = 'sug';
    b.textContent = s;
    b.onclick = () => {
      text.value = text.value.slice(0, e.start) + s + text.value.slice(e.end);
      void run();
    };
    sugs.append(b);
  }
}

$('check').onclick = () => void run();
lang.onchange = () => void run();
$('upper').onchange = () => void run();
$('add').onclick = async () => { if (current) await sc.add(current.word); };
$('ignore').onclick = () => { if (current) sc.ignore(current.word); };
sc.onChange((ev) => { if (ev.kind !== 'load') void run(); });
void run();

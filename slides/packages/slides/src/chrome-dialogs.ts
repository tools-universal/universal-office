// Diálogos das barras do Slides (sobre o <dialog> nativo de shared/ui):
// Localizar/Substituir (não modal), Propriedades, Configurar Apresentação,
// Tamanho e Posição, Link, "Avançar após", Atalhos e Sobre.
import { uiDecimal, uiLocale, openDialog, pickLabels, promptDialog, type UiLang } from '@universal-office/ui';
import type { UniversalSlidesElement, FindHit } from './universal-slides.js';
import { LABELS } from './chrome-labels.js';
import { L } from './chrome-commands.js';

export interface DialogEnv { el: UniversalSlidesElement; layer: HTMLElement; lang: UiLang; after: () => void }

const tx = (lang: UiLang, l: { en: string; pt: string; es: string }): string => l[lang];

function field(label: string, input: HTMLElement): HTMLLabelElement {
  const box = document.createElement('label');
  box.className = 'uo-field';
  const s = document.createElement('span');
  s.textContent = label;
  box.append(s, input);
  return box;
}

function textInput(value: string, name: string): HTMLInputElement {
  const i = document.createElement('input');
  i.type = 'text';
  i.name = name;
  i.value = value;
  i.spellcheck = false;
  return i;
}

function check(label: string, checked: boolean, name: string): { el: HTMLLabelElement; input: HTMLInputElement } {
  const el = document.createElement('label');
  el.className = 'uo-check';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = name;
  input.checked = checked;
  const s = document.createElement('span');
  s.textContent = label;
  el.append(input, s);
  return { el, input };
}

/** Localizar e Substituir — não modal: o slide continua visível e clicável. */
export class FindDialog {
  private handle: ReturnType<typeof openDialog> | null = null;
  private query!: HTMLInputElement;
  private repl!: HTMLInputElement;
  private replRow!: HTMLElement;
  private matchCase!: HTMLInputElement;
  private msg!: HTMLElement;
  private hits: FindHit[] = [];
  private pos = -1;

  constructor(private readonly env: DialogEnv) {}

  /** Substituir só aparece no modo Substituir (Ctrl+H); Localizar (Ctrl+F) mostra só Localizar Próxima. */
  private syncReplace(): void {
    for (const b of this.handle?.el.querySelectorAll<HTMLElement>('.uo-dialog-actions .uo-pill') ?? []) {
      const id = b.dataset['action'];
      if (id === 'replace' || id === 'replaceAll') b.hidden = this.replRow.hidden;
    }
  }

  open(replace: boolean): void {
    if (this.handle) { this.replRow.hidden = !replace; this.syncReplace(); this.query.focus(); this.query.select(); return; }
    const { lang } = this.env;
    const T = (l: { en: string; pt: string; es: string }): string => tx(lang, l);
    const body = document.createElement('div');
    body.className = 'us-find';
    this.query = textInput('', 'find');
    this.repl = textInput('', 'replace');
    this.replRow = field(T(L('Replace with', 'Substituir por', 'Reemplazar con')), this.repl);
    this.replRow.hidden = !replace;
    const mc = check(T(L('Match case', 'Diferenciar maiúsculas de minúsculas', 'Coincidir mayúsculas y minúsculas')), false, 'matchCase');
    this.matchCase = mc.input;
    this.msg = document.createElement('div');
    this.msg.className = 'us-find-msg';
    this.msg.setAttribute('role', 'status');
    body.append(field(T(L('Find what', 'Localizar', 'Buscar')), this.query), this.replRow, mc.el, this.msg);
    const reset = (): void => { this.hits = []; this.pos = -1; this.msg.textContent = ''; };
    this.query.addEventListener('input', reset);
    this.matchCase.addEventListener('change', reset);
    this.handle = openDialog({
      title: L('Find and Replace', 'Localizar e Substituir', 'Buscar y reemplazar'), body, layer: this.env.layer, lang, modal: false, width: 380, icon: 'find_replace',
      actions: [
        { id: 'replaceAll', label: L('Replace All', 'Substituir Tudo', 'Reemplazar todos') },
        { id: 'replace', label: L('Replace', 'Substituir', 'Reemplazar') },
        { id: 'next', label: L('Find Next', 'Localizar Próxima', 'Buscar siguiente'), primary: true },
      ],
      onAction: (id) => {
        if (id === 'next') this.next();
        else if (id === 'replace') this.replaceOne();
        else if (id === 'replaceAll') this.replaceAll();
        return false;
      },
    });
    this.syncReplace();
    void this.handle.result.then(() => { this.handle = null; });
  }

  private search(): void {
    this.hits = this.env.el.findText(this.query.value, { matchCase: this.matchCase.checked });
  }

  private next(): void {
    const L0 = pickLabels(this.env.lang, LABELS);
    if (!this.hits.length) this.search();
    if (!this.hits.length) { this.msg.textContent = L0.notFound; return; }
    this.pos = (this.pos + 1) % this.hits.length;
    const h = this.hits[this.pos]!;
    this.env.el.selectSlide(h.slide);
    this.env.el.selectShape(h.shape);
    this.msg.textContent = L0.found(this.pos + 1, this.hits.length);
    this.env.after();
  }

  private replaceOne(): void {
    const L0 = pickLabels(this.env.lang, LABELS);
    if (this.pos < 0 || !this.hits[this.pos]) { this.next(); return; }
    const n = this.env.el.replaceText(this.query.value, this.repl.value, { matchCase: this.matchCase.checked, hit: this.hits[this.pos] });
    this.msg.textContent = L0.replaced(n);
    this.hits = [];
    this.pos = -1;
    this.env.after();
  }

  private replaceAll(): void {
    const L0 = pickLabels(this.env.lang, LABELS);
    const n = this.env.el.replaceText(this.query.value, this.repl.value, { matchCase: this.matchCase.checked });
    this.msg.textContent = n ? L0.replaced(n) : L0.notFound;
    this.hits = [];
    this.pos = -1;
    this.env.after();
  }

  close(): void { this.handle?.close(null); this.handle = null; }
}

/** Arquivo › Propriedades: título, assunto, autor, palavras-chave, comentários (+ informações). */
export async function propertiesDialog(env: DialogEnv): Promise<void> {
  const { el, lang } = env;
  const T = (l: { en: string; pt: string; es: string }): string => tx(lang, l);
  const p = el.getProperties();
  const body = document.createElement('div');
  body.className = 'uo-dialog-grid us-props';
  const inputs = {
    title: textInput(p.title ?? '', 'title'),
    subject: textInput(p.subject ?? '', 'subject'),
    author: textInput(p.author ?? '', 'author'),
    keywords: textInput(p.keywords ?? '', 'keywords'),
    description: textInput(p.description ?? '', 'description'),
  };
  const rows: [string, HTMLElement][] = [
    [T(L('Title', 'Título', 'Título')), inputs.title], [T(L('Subject', 'Assunto', 'Asunto')), inputs.subject], [T(L('Author', 'Autor', 'Autor')), inputs.author],
    [T(L('Keywords', 'Palavras-chave', 'Palabras clave')), inputs.keywords], [T(L('Comments', 'Comentários', 'Comentarios')), inputs.description],
  ];
  const size = el.getSlideSize();
  const cm = (emu: number): string => (emu / 360000).toLocaleString(uiLocale(lang), { maximumFractionDigits: 2 });
  const fmtDate = (s?: string): string => { if (!s) return '—'; const d = new Date(s); return isNaN(d.getTime()) ? s : d.toLocaleString(uiLocale(lang)); };
  const info: [string, string][] = [
    [T(L('Slides', 'Slides', 'Diapositivas')), String(el.getSlideCount())],
    [T(L('Slide size', 'Tamanho do slide', 'Tamaño de diapositiva')), `${cm(size.width)} × ${cm(size.height)} cm`],
    [T(L('Created', 'Criado', 'Creado')), fmtDate(p.created)],
    [T(L('Modified', 'Modificado', 'Modificado')), fmtDate(p.modified)],
    [T(L('Last modified by', 'Modificado por', 'Modificado por')), p.lastModifiedBy ?? '—'],
  ];
  for (const [label, input] of rows) {
    const l = document.createElement('label');
    l.textContent = label;
    body.append(l, input);
  }
  for (const [label, value] of info) {
    const l = document.createElement('span');
    l.textContent = label;
    l.className = 'us-props-k';
    const v = document.createElement('span');
    v.textContent = value;
    v.className = 'us-props-v';
    body.append(l, v);
  }
  const h = openDialog({
    title: L('Properties', 'Propriedades', 'Propiedades'), body, layer: env.layer, lang, width: 460, icon: 'info',
    actions: [{ id: 'cancel', label: L('Cancel', 'Cancelar', 'Cancelar') }, { id: 'ok', label: L('OK', 'OK', 'Aceptar'), primary: true }],
  });
  if ((await h.result) !== 'ok') return;
  el.setProperties({
    title: inputs.title.value.trim(), subject: inputs.subject.value.trim(), author: inputs.author.value.trim(),
    keywords: inputs.keywords.value.trim(), description: inputs.description.value.trim(),
  });
  if (!el.documentName && inputs.title.value.trim()) el.documentName = inputs.title.value.trim();
  env.after();
}

/** Apresentação de Slides › Configurar Apresentação (gravado no arquivo, como o app). */
export async function showSetupDialog(env: DialogEnv): Promise<void> {
  const { el, lang } = env;
  const T = (l: { en: string; pt: string; es: string }): string => tx(lang, l);
  const s = el.getShowSettings();
  const body = document.createElement('div');
  body.className = 'us-setup';
  const kiosk = check(T(L('Browsed at a kiosk (full screen, loops, advances only by timings)', 'Apresentada em um quiosque (tela inteira, repete, avança só pelos intervalos)', 'Examinada en exposición (pantalla completa, se repite, avanza solo por intervalos)')), s.kiosk, 'kiosk');
  const loop = check(T(L('Loop continuously until Esc', 'Repetir até ESC ser pressionada', 'Repetir el ciclo hasta presionar Esc')), s.loop, 'loop');
  const anim = check(T(L('Show with animation', 'Apresentar com animação', 'Mostrar con animación')), s.showAnimation, 'showAnimation');
  const timings = check(T(L('Use timings, if present', 'Usar intervalos, se houver', 'Usar intervalos, si existen')), s.useTimings, 'useTimings');
  const syncKiosk = (): void => { loop.input.disabled = kiosk.input.checked; if (kiosk.input.checked) loop.input.checked = true; };
  kiosk.input.addEventListener('change', syncKiosk);
  syncKiosk();
  body.append(kiosk.el, loop.el, anim.el, timings.el);
  const h = openDialog({
    title: L('Set Up Slide Show', 'Configurar Apresentação', 'Configurar presentación'), body, layer: env.layer, lang, width: 440, icon: 'settings',
    actions: [{ id: 'cancel', label: L('Cancel', 'Cancelar', 'Cancelar') }, { id: 'ok', label: L('OK', 'OK', 'Aceptar'), primary: true }],
  });
  if ((await h.result) !== 'ok') return;
  el.setShowSettings({ kiosk: kiosk.input.checked, loop: loop.input.checked, showAnimation: anim.input.checked, useTimings: timings.input.checked });
  env.after();
}

/** Formatar › Tamanho e Posição (cm no português, polegadas no inglês). */
export async function sizeDialog(env: DialogEnv): Promise<void> {
  const { el, lang } = env;
  const info = el.getShapeInfo();
  if (!info?.frame) return;
  const T = (l: { en: string; pt: string; es: string }): string => tx(lang, l);
  const unit = lang !== 'en' ? 360000 : 914400;
  const suffix = lang !== 'en' ? 'cm' : 'in';
  const fmt = (emu: number): string => String(Math.round(emu / unit * 100) / 100).replace('.', uiDecimal(lang));
  const parse = (s: string): number | null => { const v = parseFloat(s.replace(',', '.')); return Number.isFinite(v) ? Math.round(v * unit) : null; };
  const f = info.frame;
  const body = document.createElement('div');
  body.className = 'uo-dialog-grid';
  const make = (label: string, emu: number, name: string): HTMLInputElement => {
    const l = document.createElement('label');
    l.textContent = `${label} (${suffix})`;
    const i = textInput(fmt(emu), name);
    i.inputMode = 'decimal';
    body.append(l, i);
    return i;
  };
  const w = make(T(L('Width', 'Largura', 'Ancho')), f.cx, 'width');
  const hh = make(T(L('Height', 'Altura', 'Alto')), f.cy, 'height');
  const x = make(T(L('Horizontal position', 'Posição horizontal', 'Posición horizontal')), f.x, 'x');
  const y = make(T(L('Vertical position', 'Posição vertical', 'Posición vertical')), f.y, 'y');
  const lock = check(T(L('Lock aspect ratio', 'Bloquear taxa de proporção', 'Bloquear relación de aspecto')), info.kind === 'picture', 'lock');
  body.append(document.createElement('span'), lock.el);
  const ratio = f.cy > 0 ? f.cx / f.cy : 1;
  w.addEventListener('change', () => { const v = parse(w.value); if (lock.input.checked && v !== null) hh.value = fmt(v / ratio); });
  hh.addEventListener('change', () => { const v = parse(hh.value); if (lock.input.checked && v !== null) w.value = fmt(v * ratio); });
  const h = openDialog({
    title: L('Size and Position', 'Tamanho e Posição', 'Tamaño y posición'), body, layer: env.layer, lang, width: 380, icon: 'aspect_ratio',
    actions: [{ id: 'cancel', label: L('Cancel', 'Cancelar', 'Cancelar') }, { id: 'ok', label: L('OK', 'OK', 'Aceptar'), primary: true }],
  });
  if ((await h.result) !== 'ok') return;
  const nf = { x: parse(x.value) ?? f.x, y: parse(y.value) ?? f.y, cx: Math.max(12700, parse(w.value) ?? f.cx), cy: Math.max(0, parse(hh.value) ?? f.cy) };
  el.setShapeFrame(nf, info.index);
  env.after();
}

/** Inserir › Link: URL no texto inteiro da forma (vazio tira o link). */
export async function linkDialog(env: DialogEnv): Promise<void> {
  const { el, lang } = env;
  const L0 = pickLabels(lang, LABELS);
  if (!el.getTextFormat()) return;
  const url = await promptDialog({ title: L0.linkTitle, label: L0.linkPrompt, value: el.getLink() ?? 'https://', layer: env.layer, lang });
  if (url === null) return;
  const v = url.trim();
  el.setLink(v && v !== 'https://' ? v : null);
  env.after();
}

/** Transições › Após: avançar o slide sozinho depois de N segundos (vazio = só no clique). */
export async function advanceDialog(env: DialogEnv): Promise<void> {
  const { el, lang } = env;
  const cur = el.getSlideTransition();
  const ms = cur?.advanceAfterMs;
  const v = await promptDialog({
    title: L('Advance slide', 'Avançar slide', 'Avanzar diapositiva'), label: L('After (seconds); empty = only on click', 'Após (segundos); vazio = só ao clicar', 'Después de (segundos); vacío = solo al hacer clic'),
    value: ms !== undefined ? String(ms / 1000).replace('.', uiDecimal(lang)) : '', layer: env.layer, lang,
  });
  if (v === null) return;
  const secs = parseFloat(v.replace(',', '.'));
  const next = { ...(cur ?? { type: 'none' }) };
  if (Number.isFinite(secs) && secs >= 0) next.advanceAfterMs = Math.round(secs * 1000); else delete next.advanceAfterMs;
  el.setSlideTransition(next);
  env.after();
}

const SHORTCUTS: [string, { en: string; pt: string; es: string }][] = [
  ['F5', L('Start the slide show from the beginning', 'Apresentar do começo', 'Iniciar la presentación desde el principio')],
  ['Shift+F5', L('Start the slide show from the current slide', 'Apresentar do slide atual', 'Iniciar la presentación desde la diapositiva actual')],
  ['Esc', L('End the slide show / deselect', 'Encerrar a apresentação / tirar a seleção', 'Finalizar la presentación / anular la selección')],
  ['Ctrl+M', L('New slide', 'Novo slide', 'Nueva diapositiva')],
  ['Ctrl+D', L('Duplicate the selected shape or the slide', 'Duplicar a forma selecionada ou o slide', 'Duplicar la forma seleccionada o la diapositiva')],
  ['Ctrl+Z / Ctrl+Y', L('Undo / redo', 'Desfazer / refazer', 'Deshacer / rehacer')],
  ['Ctrl+X / C / V', L('Cut / copy / paste the shape', 'Recortar / copiar / colar a forma', 'Cortar / copiar / pegar la forma')],
  ['Del', L('Delete the selected shape (or slide, in the thumbnails)', 'Excluir a forma selecionada (ou o slide, nas miniaturas)', 'Eliminar la forma seleccionada (o la diapositiva, en las miniaturas)')],
  ['F2 / Enter', L('Edit the text of the selected shape', 'Editar o texto da forma selecionada', 'Editar el texto de la forma seleccionada')],
  ['Tab', L('Select the next shape', 'Selecionar a próxima forma', 'Seleccionar la forma siguiente')],
  ['←↑→↓', L('Nudge the shape (Ctrl: finer) / change slide', 'Mover a forma (Ctrl: fino) / trocar de slide', 'Desplazar la forma (Ctrl: más fino) / cambiar de diapositiva')],
  ['Ctrl+B / I / U', L('Bold / italic / underline', 'Negrito / itálico / sublinhado', 'Negrita / cursiva / subrayado')],
  ['Ctrl+] / Ctrl+[', L('Increase / decrease font size', 'Aumentar / diminuir a fonte', 'Aumentar / disminuir el tamaño de fuente')],
  ['Ctrl+L / E / R / J', L('Align left / center / right / justify', 'Alinhar à esquerda / centro / direita / justificar', 'Alinear a la izquierda / centro / derecha / justificar')],
  ['Ctrl+K', L('Link', 'Link', 'Vínculo')],
  ['Ctrl+F / Ctrl+H', L('Find / replace', 'Localizar / substituir', 'Buscar / reemplazar')],
  ['Ctrl+O / S / Shift+S / P', L('Open / save / save as / print', 'Abrir / salvar / salvar como / imprimir', 'Abrir / guardar / guardar como / imprimir')],
  ['Ctrl+= / Ctrl+- / Ctrl+wheel', L('Zoom in / out', 'Ampliar / reduzir', 'Acercar / alejar')],
];

export function shortcutsDialog(env: DialogEnv): void {
  const body = document.createElement('div');
  body.className = 'us-keys';
  for (const [k, l] of SHORTCUTS) {
    const kbd = document.createElement('kbd');
    kbd.textContent = k;
    const d = document.createElement('span');
    d.textContent = l[env.lang];
    body.append(kbd, d);
  }
  openDialog({ title: L('Keyboard shortcuts', 'Atalhos do teclado', 'Métodos abreviados de teclado'), body, layer: env.layer, lang: env.lang, width: 520, icon: 'keyboard' });
}

export function aboutDialog(env: DialogEnv): void {
  const body = document.createElement('div');
  body.className = 'us-about';
  const p1 = document.createElement('p');
  p1.textContent = tx(env.lang, L('Universal Slides — the <universal-slides> web component: a .pptx editor faithful to PowerPoint, part of Universal Office (MIT).',
    'Universal Slides — o web component <universal-slides>: um editor de .pptx fiel ao PowerPoint, parte do Universal Office (MIT).', 'Universal Slides — el componente web <universal-slides>: un editor de .pptx fiel a PowerPoint, parte de Universal Office (MIT).'));
  const p2 = document.createElement('p');
  p2.textContent = tx(env.lang, L('Text is edited per shape; formatting applies to the whole text of the shape. Animations play as recorded in the file.',
    'O texto é editado por forma; a formatação vale para o texto inteiro da forma. As animações tocam como estão gravadas no arquivo.', 'El texto se edita por forma; el formato se aplica a todo el texto de la forma. Las animaciones se reproducen tal como están grabadas en el archivo.'));
  body.append(p1, p2);
  openDialog({ title: L('About Universal Slides', 'Sobre o Universal Slides', 'Acerca de Universal Slides'), body, layer: env.layer, lang: env.lang, width: 440, icon: 'info' });
}

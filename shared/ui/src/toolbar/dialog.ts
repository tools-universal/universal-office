// Diálogo das barras sobre o <dialog> NATIVO, com o visual Material 3. Sem
// animação de entrada/saída de propósito: o u-dialog do @universal-material
// espera o 'animationend' para fechar e trava (some nunca) quando o relógio de
// animação não anda — janela em 2º plano, renderer ocioso, motion reduzido.
import { DEFAULT_UI_LANG, pickLabels, type UiLang } from '../i18n.js';
import { symbol } from './icons.js';
import type { Lbl } from './types.js';

const LABELS = {
  en: { ok: 'OK', cancel: 'Cancel', close: 'Close' },
  pt: { ok: 'OK', cancel: 'Cancelar', close: 'Fechar' },
};

export interface DialogAction {
  id: string;
  label: Lbl;
  primary?: boolean;
}

export interface DialogOptions {
  title: Lbl;
  body: HTMLElement | string;
  actions?: DialogAction[];
  /** onde pendurar (padrão: document.body); precisa do CSS das barras */
  layer?: HTMLElement;
  lang?: UiLang;
  /** Material Symbol acima do título (avisos) */
  icon?: string;
  /** false = não modal (o documento continua clicável) */
  modal?: boolean;
  width?: number;
  /** antes de fechar por uma ação; devolver false mantém aberto */
  onAction?: (id: string, dlg: HTMLDialogElement) => boolean | void;
}

export interface DialogHandle {
  el: HTMLDialogElement;
  close(value?: string | null): void;
  /** id da ação escolhida; null = cancelado (Esc, ×, clique no fundo) */
  result: Promise<string | null>;
}

/** Diálogos abertos (para quem desmonta a interface fechá-los como cancelados). */
const open = new Set<DialogHandle>();

/**
 * Fecha como CANCELADOS (a promessa resolve null) os diálogos abertos dentro
 * de `layer` (ou todos) — também os <dialog> nativos de terceiros ali dentro.
 */
export function closeDialogs(layer?: HTMLElement): void {
  for (const h of [...open]) if (!layer || layer.contains(h.el)) h.close(null);
  for (const d of layer?.querySelectorAll('dialog') ?? []) if (d.open) d.close();
}

const txt = (l: Lbl, lang: UiLang): string => (typeof l === 'string' ? l : pickLabels(lang, l));

export function openDialog(opts: DialogOptions): DialogHandle {
  const lang = opts.lang ?? DEFAULT_UI_LANG;
  const L = pickLabels(lang, LABELS);
  const dlg = document.createElement('dialog');
  dlg.className = 'uo-dialog';
  dlg.setAttribute('part', 'dialog');
  if (opts.width) dlg.style.width = `${opts.width}px`;
  const head = document.createElement('div');
  head.className = 'uo-dialog-head';
  head.innerHTML = `${opts.icon ? `<span class="uo-dialog-icon">${symbol(opts.icon)}</span>` : ''}`
    + `<span class="uo-dialog-title"></span>`
    + `<button type="button" class="uo-btn uo-dialog-x" title="${L.close}">${symbol('close')}</button>`;
  head.querySelector('.uo-dialog-title')!.textContent = txt(opts.title, lang);
  const body = document.createElement('div');
  body.className = 'uo-dialog-body';
  if (typeof opts.body === 'string') body.textContent = opts.body;
  else body.appendChild(opts.body);
  dlg.append(head, body);
  const actions = opts.actions ?? [{ id: 'ok', label: L.ok, primary: true }];
  if (actions.length) {
    const bar = document.createElement('div');
    bar.className = 'uo-dialog-actions';
    for (const a of actions) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = a.primary ? 'uo-pill uo-pill-primary' : 'uo-pill';
      b.dataset['action'] = a.id;
      b.textContent = txt(a.label, lang);
      b.addEventListener('click', () => {
        if (opts.onAction?.(a.id, dlg) === false) return;
        handle.close(a.id);
      });
      bar.appendChild(b);
    }
    dlg.appendChild(bar);
  }
  let resolve!: (v: string | null) => void;
  const result = new Promise<string | null>((r) => { resolve = r; });
  let done = false;
  const handle: DialogHandle = {
    el: dlg,
    result,
    close(value = null) {
      if (done) return;
      done = true;
      open.delete(handle);
      if (dlg.open) dlg.close();
      dlg.remove();
      resolve(value);
    },
  };
  head.querySelector('.uo-dialog-x')!.addEventListener('click', () => handle.close(null));
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); handle.close(null); });
  // clique no fundo (fora da caixa) fecha o modal
  dlg.addEventListener('mousedown', (e) => {
    if (e.target !== dlg || opts.modal === false) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) handle.close(null);
  });
  // Enter num campo de texto = ação primária
  dlg.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
    if ((e.target as HTMLElement).tagName !== 'INPUT') return;
    const p = dlg.querySelector<HTMLButtonElement>('.uo-pill-primary');
    if (p) { e.preventDefault(); p.click(); }
  });
  (opts.layer ?? document.body).appendChild(dlg);
  open.add(handle);
  if (opts.modal === false) dlg.show(); else dlg.showModal();
  const first = body.querySelector<HTMLElement>('input, select, textarea');
  if (first) { first.focus(); if (first instanceof HTMLInputElement) first.select(); }
  return handle;
}

export interface PromptOptions {
  title: Lbl;
  label?: Lbl;
  value?: string;
  placeholder?: string;
  multiline?: boolean;
  ok?: Lbl;
  layer?: HTMLElement;
  lang?: UiLang;
}

/** Campo único; resolve com o texto (OK) ou null (cancelado). */
export async function promptDialog(opts: PromptOptions): Promise<string | null> {
  const lang = opts.lang ?? DEFAULT_UI_LANG;
  const L = pickLabels(lang, LABELS);
  const box = document.createElement('label');
  box.className = 'uo-field';
  if (opts.label) {
    const s = document.createElement('span');
    s.textContent = txt(opts.label, lang);
    box.appendChild(s);
  }
  const input = document.createElement(opts.multiline ? 'textarea' : 'input') as HTMLInputElement;
  input.value = opts.value ?? '';
  if (opts.placeholder) input.placeholder = opts.placeholder;
  box.appendChild(input);
  const h = openDialog({
    title: opts.title, body: box, layer: opts.layer, lang,
    actions: [{ id: 'cancel', label: L.cancel }, { id: 'ok', label: opts.ok ?? L.ok, primary: true }],
  });
  return (await h.result) === 'ok' ? input.value : null;
}

/** Guias dentro de um diálogo (Propriedades da Tabela, Bordas e Sombreamento…):
 *  uma linha de abas e um painel por aba; setas trocam de aba. */
export function dialogTabs(tabs: { id: string; label: string; body: HTMLElement }[], selected?: string): { el: HTMLElement; select(id: string): void; current(): string } {
  const el = document.createElement('div');
  el.className = 'uo-dtabs';
  const strip = document.createElement('div');
  strip.className = 'uo-dtabs-strip';
  strip.setAttribute('role', 'tablist');
  const panes = document.createElement('div');
  panes.className = 'uo-dtabs-panes';
  let cur = selected && tabs.some((t) => t.id === selected) ? selected : tabs[0]?.id ?? '';
  const buttons = tabs.map((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'uo-dtab';
    b.setAttribute('role', 'tab');
    b.textContent = t.label;
    b.addEventListener('click', () => select(t.id));
    b.addEventListener('keydown', (e) => {
      const i = tabs.findIndex((x) => x.id === cur);
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const n = tabs[(i + d + tabs.length) % tabs.length]!;
      select(n.id);
      buttons[tabs.indexOf(n)]!.focus();
    });
    strip.append(b);
    t.body.classList.add('uo-dtab-pane');
    t.body.setAttribute('role', 'tabpanel');
    panes.append(t.body);
    return b;
  });
  function select(id: string): void {
    cur = id;
    tabs.forEach((t, i) => {
      const on = t.id === id;
      buttons[i]!.classList.toggle('uo-on', on);
      buttons[i]!.setAttribute('aria-selected', String(on));
      buttons[i]!.tabIndex = on ? 0 : -1;
      // as guias ocupam a mesma célula da grade: o diálogo fica do tamanho da maior (não pula ao trocar)
      t.body.classList.toggle('uo-off', !on);
      t.body.inert = !on;
    });
  }
  select(cur);
  el.append(strip, panes);
  return { el, select, current: () => cur };
}

/** Aviso curto no rodapé (snackbar). */
export function showToast(layer: HTMLElement, message: string, ms = 2600): void {
  layer.querySelector(':scope > .uo-toast')?.remove();
  const t = document.createElement('div');
  t.className = 'uo-toast';
  t.setAttribute('role', 'status');
  t.textContent = message;
  layer.appendChild(t);
  window.setTimeout(() => t.remove(), ms);
}

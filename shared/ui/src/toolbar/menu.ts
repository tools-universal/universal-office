// Menu flutuante (Material Design 3) das barras, da barra de menus e do menu
// de contexto — um só motor (antes: menu.ts e context-menu.ts copiados nos
// demos do Write e do Sheet). Submenus, teclado (setas, Enter, Esc) e um menu
// aberto por vez. Funciona dentro de shadow root: o "clique fora" usa
// composedPath(), não contains() (o alvo chega retargetado ao host).
import type { UiLang } from '../i18n.js';
import { DEFAULT_UI_LANG, pickLabels } from '../i18n.js';
import type { CommandRegistry } from './commands.js';
import { symbol } from './icons.js';
import type { Lbl, MenuEntry, MenuItem, MenuSource } from './types.js';

export type MenuAt = { x: number; y: number } | { anchor: HTMLElement; side?: 'below' | 'right' };

export interface MenuOptions {
  lang?: UiLang;
  /** resolve ids de comando e separadores '-' */
  registry?: CommandRegistry;
  /** onde pendurar o menu (padrão: document.body); precisa do CSS das barras */
  layer?: HTMLElement;
  /** chamado quando o menu raiz fecha (por ação, Esc ou clique fora) */
  onClose?: () => void;
  /** foca o 1º item (aberto pelo teclado) */
  focus?: boolean;
  /** setas ←/→ no nível 0 (barra de menus troca de menu) */
  onNavigate?: (dir: -1 | 1) => void;
}

interface Level { el: HTMLElement; items: MenuItem[]; parentBtn?: HTMLElement }

let stack: Level[] = [];
let rootOpts: MenuOptions | null = null;
let rootAnchor: HTMLElement | null = null;
let detach: (() => void) | null = null;
let hoverTimer = 0;

export function isMenuOpen(): boolean { return stack.length > 0; }

/** O menu aberto saiu deste gatilho? (para o gatilho alternar abrir/fechar) */
export function isMenuOpenFor(anchor: HTMLElement): boolean { return stack.length > 0 && rootAnchor === anchor; }

export function closeMenus(): void {
  window.clearTimeout(hoverTimer);
  for (const l of stack) l.el.remove();
  stack = [];
  rootAnchor = null;
  detach?.();
  detach = null;
  const o = rootOpts;
  rootOpts = null;
  o?.onClose?.();
}

const labelText = (l: Lbl | undefined, lang: UiLang): string =>
  l === undefined ? '' : typeof l === 'string' ? l : pickLabels(lang, l);

function resolveItems(src: MenuSource | MenuItem[], opts: MenuOptions): MenuItem[] {
  const entries: MenuEntry[] = typeof src === 'function' ? src() : src;
  if (opts.registry) return opts.registry.resolve(entries);
  return entries.filter((e): e is MenuItem => typeof e !== 'string' && !e.hidden);
}

function closeFrom(level: number): void {
  while (stack.length > level) stack.pop()!.el.remove();
}

function place(menu: HTMLElement, at: MenuAt): void {
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  let x: number, y: number;
  if ('anchor' in at) {
    const r = at.anchor.getBoundingClientRect();
    if (at.side === 'right') {
      x = r.right - 2; y = r.top - 5;
      if (x + mw > vw - 8) x = Math.max(8, r.left - mw + 2);
      if (y + mh > vh - 8) y = Math.max(8, vh - mh - 8);
    } else {
      x = r.left; y = r.bottom + 4;
      if (y + mh > vh - 8) y = r.top - mh - 4 >= 8 ? r.top - mh - 4 : Math.max(8, vh - mh - 8);
    }
  } else {
    x = at.x; y = at.y;
    if (y + mh > vh - 8) y = Math.max(8, y - mh);
  }
  if (x + mw > vw - 8) x = Math.max(8, vw - mw - 8);
  menu.style.left = `${Math.max(8, x)}px`;
  menu.style.top = `${Math.max(8, y)}px`;
}

function focusables(el: HTMLElement): HTMLButtonElement[] {
  return [...el.querySelectorAll<HTMLButtonElement>(':scope > .uo-menu-item:not([disabled])')];
}

function build(items: MenuItem[], level: number, opts: MenuOptions): HTMLElement {
  const lang = opts.lang ?? DEFAULT_UI_LANG;
  const menu = document.createElement('div');
  menu.className = 'uo-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('part', 'menu');
  for (const it of items) {
    if (it.sep) {
      const s = document.createElement('div');
      s.className = 'uo-menu-sep';
      s.setAttribute('role', 'separator');
      menu.appendChild(s);
      continue;
    }
    if (it.content) {
      const box = document.createElement('div');
      box.className = 'uo-menu-content';
      box.appendChild(it.content(closeMenus));
      menu.appendChild(box);
      continue;
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'uo-menu-item';
    if (it.id) b.dataset['a'] = it.id;
    b.setAttribute('role', it.checked !== undefined ? 'menuitemcheckbox' : 'menuitem');
    if (it.checked !== undefined) b.setAttribute('aria-checked', String(!!it.checked));
    if (it.disabled) b.disabled = true;
    if (it.checked) b.classList.add('checked');
    const lead = document.createElement('span');
    lead.className = 'lead';
    if (it.swatch !== undefined) {
      const sw = document.createElement('span');
      sw.className = 'sw';
      if (it.swatch) sw.style.background = it.swatch;
      else sw.style.borderStyle = 'dashed';
      lead.appendChild(sw);
    } else if (it.icon) lead.innerHTML = symbol(it.icon);
    else if (it.checked) lead.innerHTML = symbol('check');
    const lb = document.createElement('span');
    lb.className = 'lb';
    lb.textContent = labelText(it.label, lang);
    b.append(lead, lb);
    if (it.submenu) {
      b.setAttribute('aria-haspopup', 'menu');
      const ar = document.createElement('span');
      ar.className = 'sc';
      ar.innerHTML = symbol('chevron_right');
      b.appendChild(ar);
    } else if (it.shortcut) {
      const sc = document.createElement('span');
      sc.className = 'sc';
      sc.textContent = it.shortcut;
      b.appendChild(sc);
    }
    if (customElements.get('u-ripple') && !it.disabled) b.appendChild(document.createElement('u-ripple'));
    b.addEventListener('mousedown', (e) => e.preventDefault());
    const openSub = (focus: boolean): void => {
      window.clearTimeout(hoverTimer);
      if (stack[level + 1]?.parentBtn === b) return;
      closeFrom(level + 1);
      const sub = resolveItems(it.submenu as MenuSource, opts);
      if (!sub.length) return;
      const el = build(sub, level + 1, opts);
      (opts.layer ?? document.body).appendChild(el);
      place(el, { anchor: b, side: 'right' });
      stack.push({ el, items: sub, parentBtn: b });
      if (focus) focusables(el)[0]?.focus();
    };
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (it.submenu) { openSub(false); return; }
      closeMenus();
      it.onClick?.();
    });
    b.addEventListener('mouseenter', () => {
      window.clearTimeout(hoverTimer);
      if (it.submenu) hoverTimer = window.setTimeout(() => openSub(false), 160);
      else if (stack.length > level + 1) hoverTimer = window.setTimeout(() => closeFrom(level + 1), 220);
    });
    (b as HTMLButtonElement & { _openSub?: (f: boolean) => void })._openSub = it.submenu ? openSub : undefined;
    menu.appendChild(b);
  }
  return menu;
}

/** Abre um menu (fecha qualquer outro). Devolve o elemento do menu raiz. */
export function openMenu(src: MenuSource | MenuItem[], at: MenuAt, opts: MenuOptions = {}): HTMLElement | null {
  closeMenus();
  const items = resolveItems(src, opts);
  if (!items.length) return null;
  const el = build(items, 0, opts);
  (opts.layer ?? document.body).appendChild(el);
  place(el, at);
  stack = [{ el, items }];
  rootOpts = opts;
  rootAnchor = 'anchor' in at ? at.anchor : null;
  if (opts.focus) focusables(el)[0]?.focus();

  const inMenus = (e: Event): boolean => {
    const path = e.composedPath();
    return stack.some((l) => path.includes(l.el)) || (!!rootAnchor && path.includes(rootAnchor));
  };
  const onDown = (e: Event): void => { if (!inMenus(e)) closeMenus(); };
  const onKey = (e: KeyboardEvent): void => {
    if (!stack.length) return;
    const top = stack[stack.length - 1]!;
    const items = focusables(top.el);
    const active = top.el.getRootNode() instanceof ShadowRoot
      ? (top.el.getRootNode() as ShadowRoot).activeElement
      : document.activeElement;
    const i = items.indexOf(active as HTMLButtonElement);
    const handled = (): void => { e.preventDefault(); e.stopPropagation(); };
    switch (e.key) {
      case 'Escape':
        handled();
        if (stack.length > 1) { const p = top.parentBtn; closeFrom(stack.length - 1); p?.focus(); } else closeMenus();
        break;
      case 'ArrowDown': handled(); items[(i + 1) % items.length]?.focus(); break;
      case 'ArrowUp': handled(); items[(i - 1 + items.length) % items.length]?.focus(); break;
      case 'Home': handled(); items[0]?.focus(); break;
      case 'End': handled(); items[items.length - 1]?.focus(); break;
      case 'ArrowRight': {
        handled();
        const open = (items[i] as HTMLButtonElement & { _openSub?: (f: boolean) => void } | undefined)?._openSub;
        if (open) open(true);
        else rootOpts?.onNavigate?.(1);
        break;
      }
      case 'ArrowLeft':
        handled();
        if (stack.length > 1) { const p = top.parentBtn; closeFrom(stack.length - 1); p?.focus(); } else rootOpts?.onNavigate?.(-1);
        break;
      case 'Enter': case ' ':
        if (i >= 0) { handled(); items[i]!.click(); }
        break;
      case 'Tab': handled(); closeMenus(); break;
    }
  };
  const onBlur = (): void => closeMenus();
  const t = window.setTimeout(() => {
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('contextmenu', onDown, true);
    window.addEventListener('resize', onBlur);
    window.addEventListener('blur', onBlur);
  }, 0);
  document.addEventListener('keydown', onKey, true);
  detach = () => {
    window.clearTimeout(t);
    document.removeEventListener('mousedown', onDown, true);
    document.removeEventListener('contextmenu', onDown, true);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onBlur);
    window.removeEventListener('blur', onBlur);
  };
  return el;
}

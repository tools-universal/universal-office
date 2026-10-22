// Desenho dos itens de barra (botão de comando, botão de menu, botão dividido,
// controle livre) — o mesmo para a barra compacta e a ribbon. Cada item sabe
// se sincronizar com o registro (oculto / desabilitado / marcado).
import { symbol } from './icons.js';
import { isMenuOpenFor, openMenu, closeMenus } from './menu.js';
import type { BarContext, BarItem, MenuSource } from './types.js';
import { renderGallery } from './gallery.js';

export interface RenderedItem {
  el: HTMLElement;
  sync(): void;
  visible(): boolean;
  /** px que o item pode ceder (galeria) e ceder (0 = cheio) — ribbon elástica */
  shrink?(): number;
  fit?(px: number): void;
}

export function ripple(el: HTMLElement): void {
  if (customElements.get('u-ripple') && !el.querySelector(':scope > u-ripple')) {
    el.appendChild(document.createElement('u-ripple'));
  }
}

function button(cls: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  // não tira o foco/seleção do documento
  b.addEventListener('mousedown', (e) => e.preventDefault());
  return b;
}

/** Abre/fecha o menu de um gatilho. */
export function toggleMenu(anchor: HTMLElement, src: MenuSource, ctx: BarContext, focus = false): void {
  if (isMenuOpenFor(anchor)) { closeMenus(); return; }
  anchor.classList.add('uo-open');
  openMenu(src, { anchor }, {
    lang: ctx.lang, registry: ctx.registry, layer: ctx.layer, focus,
    onClose: () => anchor.classList.remove('uo-open'),
  });
}

const CHEV = (): string => `<span class="uo-chev">${symbol('arrow_drop_down')}</span>`;

export function renderItem(item: BarItem, ctx: BarContext, defSize: 'small' | 'large' = 'small'): RenderedItem {
  const reg = ctx.registry;
  if (typeof item === 'string') item = { cmd: item };

  if ('gallery' in item) return renderGallery(item.gallery, ctx, defSize === 'large');

  if ('widget' in item) {
    const w = item.widget(ctx);
    return {
      el: w.el,
      sync: () => { const v = w.visible?.() ?? true; w.el.hidden = !v; if (v) w.sync?.(); },
      visible: () => w.visible?.() ?? true,
    };
  }

  if ('cmd' in item) {
    const { cmd } = item;
    const c = reg.get(cmd);
    const size = item.size ?? defSize;
    const showLabel = item.label ?? size === 'large';
    const icon = item.icon ?? c?.icon;
    const b = button(`uo-btn${size === 'large' ? ' uo-btn-lg' : ''}${showLabel ? ' uo-btn-lbl' : ''}`);
    b.dataset['a'] = cmd;
    b.title = reg.tooltip(cmd);
    b.setAttribute('aria-label', reg.label(cmd));
    b.innerHTML = (icon ? symbol(icon) : '')
      + (showLabel || !icon ? `<span class="uo-lbl">${esc(reg.label(cmd))}</span>` : '')
      + (c?.color ? '<span class="uo-swbar"></span>' : '');
    ripple(b);
    b.addEventListener('click', () => { void reg.run(cmd); });
    const bar = b.querySelector<HTMLElement>('.uo-swbar');
    return {
      el: b,
      visible: () => reg.supported(cmd),
      sync: () => {
        const v = reg.supported(cmd);
        b.hidden = !v;
        if (!v) return;
        b.disabled = !reg.enabled(cmd);
        if (c?.isChecked) {
          const on = reg.checked(cmd);
          b.classList.toggle('uo-on', on);
          b.setAttribute('aria-pressed', String(on));
        }
        if (bar) bar.style.background = c!.color!() ?? 'transparent';
      },
    };
  }

  if ('split' in item) {
    const cmd = item.split;
    const main = renderItem({ cmd, size: item.size ?? defSize, ...(item.label !== undefined ? { label: item.label } : {}) }, ctx, defSize);
    const wrap = document.createElement('span');
    wrap.className = `uo-split${(item.size ?? defSize) === 'large' ? ' uo-split-lg' : ''}`;
    const arrow = button('uo-btn uo-split-arrow');
    arrow.dataset['a'] = `${cmd}:menu`;
    arrow.title = reg.tooltip(cmd);
    arrow.innerHTML = symbol('arrow_drop_down');
    ripple(arrow);
    const src = item.menu;
    arrow.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(wrap, src, ctx); });
    wrap.append(main.el, arrow);
    return {
      el: wrap,
      visible: main.visible,
      sync: () => {
        main.sync();
        wrap.hidden = !main.visible();
        main.el.hidden = false;
        arrow.disabled = !reg.enabled(cmd);
      },
    };
  }

  // botão de menu
  const m = item;
  const size = m.size ?? defSize;
  const showLabel = m.showLabel ?? size === 'large';
  const b = button(`uo-btn uo-drop${size === 'large' ? ' uo-btn-lg' : ''}${showLabel ? ' uo-btn-lbl' : ''}`);
  b.dataset['a'] = m.id;
  const label = reg.text(m.label);
  b.title = label;
  b.setAttribute('aria-label', label);
  b.setAttribute('aria-haspopup', 'menu');
  const head = m.text ? '<span class="uo-drop-text"></span>' : symbol(m.icon);
  b.innerHTML = head + (showLabel ? `<span class="uo-lbl">${esc(label)}</span>` : '') + CHEV();
  ripple(b);
  const textEl = b.querySelector<HTMLElement>('.uo-drop-text');
  b.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(b, m.menu, ctx, e.detail === 0); });
  const vis = (): boolean => { try { return m.supports?.() ?? true; } catch { return false; } };
  return {
    el: b,
    visible: vis,
    sync: () => {
      const v = vis();
      b.hidden = !v;
      if (!v) return;
      b.disabled = m.isEnabled ? !m.isEnabled() : false;
      if (m.isChecked) b.classList.toggle('uo-on', m.isChecked());
      if (textEl) textEl.textContent = m.text!();
    },
  };
}

export function esc(s: string): string {
  return s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] ?? c));
}

/** Grupo de itens (div.uo-g) com sincronização em bloco. */
export function renderGroupItems(items: readonly BarItem[], ctx: BarContext, into: HTMLElement): RenderedItem[] {
  const out = items.map((it) => renderItem(it, ctx));
  for (const r of out) into.appendChild(r.el);
  return out;
}

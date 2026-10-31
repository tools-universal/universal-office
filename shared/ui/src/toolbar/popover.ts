// Popover dos grupos recolhidos: MOVE os nós vivos do grupo para dentro (os
// handlers e o estado continuam valendo) e os devolve ao fechar.
import { isMenuOpen } from './menu.js';

interface PopState {
  pop: HTMLElement;
  anchor: HTMLElement;
  moved: { el: HTMLElement; home: HTMLElement }[];
  detach: () => void;
}

let state: PopState | null = null;

export function isPopoverOpenFor(anchor: HTMLElement): boolean { return state?.anchor === anchor; }

export function closePopover(): void {
  if (!state) return;
  const s = state;
  state = null;
  for (const m of s.moved) m.home.appendChild(m.el);
  s.pop.remove();
  s.anchor.classList.remove('uo-open');
  s.detach();
}

export interface PopSection { el: HTMLElement; label: string; home: HTMLElement }

export function openPopover(anchor: HTMLElement, sections: PopSection[], layer: HTMLElement): void {
  closePopover();
  const pop = document.createElement('div');
  pop.className = 'uo-pop';
  pop.setAttribute('part', 'popover');
  for (const s of sections) {
    const sec = document.createElement('div');
    sec.className = 'uo-pop-sec';
    if (s.label) {
      const lbl = document.createElement('div');
      lbl.className = 'uo-pop-lbl';
      lbl.textContent = s.label;
      sec.appendChild(lbl);
    }
    sec.appendChild(s.el);
    pop.appendChild(sec);
  }
  layer.appendChild(pop);
  const position = (): void => {
    const ar = anchor.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    let top = ar.bottom + 4;
    if (top + pop.offsetHeight > vh - 8) top = Math.max(8, ar.top - pop.offsetHeight - 4);
    pop.style.top = `${top}px`;
    pop.style.left = `${Math.max(8, Math.min(ar.left, vw - pop.offsetWidth - 8))}px`;
  };
  position();
  anchor.classList.add('uo-open');

  const onDown = (e: Event): void => {
    const path = e.composedPath();
    if (path.includes(pop) || path.includes(anchor)) return;
    // menus abertos de dentro do popover (seletores) não fecham o popover
    if (path.some((n) => n instanceof HTMLElement && n.classList.contains('uo-menu'))) return;
    closePopover();
  };
  const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape' && !isMenuOpen()) closePopover(); };
  // como os menus: acompanha o botão quando a janela muda de altura (teclado e barras
  // do navegador no celular) ou a página rola; fecha se a largura mudar ou o botão sumir
  const width0 = window.innerWidth;
  const follow = (): void => {
    const r = anchor.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight || (!r.width && !r.height)) { closePopover(); return; }
    position();
  };
  const onResize = (): void => { if (Math.abs(window.innerWidth - width0) > 1) closePopover(); else follow(); };
  const onScroll = (e: Event): void => { if (!e.composedPath().includes(pop)) follow(); };
  document.addEventListener('mousedown', onDown, true);
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onResize);
  state = {
    pop, anchor,
    moved: sections.map((s) => ({ el: s.el, home: s.home })),
    detach: () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    },
  };
}

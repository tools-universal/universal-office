// Menu flutuante reutilizável (Material Design 3): usado pelos selects
// "iconificados" da toolbar e pelo menu de contexto do editor. Apenas UM menu
// fica aberto por vez; fecha em clique fora, Esc, scroll ou resize.

export interface MenuItem {
  /** separador horizontal — ignora os demais campos. */
  sep?: boolean;
  /** ligature do Material Symbols (slot de ícone). */
  icon?: string;
  /** cor CSS para exibir um chip de cor no lugar do ícone (''=sem cor). */
  swatch?: string;
  label?: string;
  /** atalho exibido à direita (ex.: "Ctrl+C"). */
  shortcut?: string;
  /** mostra um "check" à esquerda (opção selecionada / toggle ativo). */
  checked?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

import { attachRipple } from './ripple.js';

type Anchor = { x: number; y: number } | { anchor: HTMLElement };

let current: HTMLElement | null = null;
let detach: (() => void) | null = null;

export function menuOpen(): boolean {
  return !!current;
}

export function closeMenu(): void {
  if (current) { current.remove(); current = null; }
  if (detach) { detach(); detach = null; }
}

export function openMenu(items: MenuItem[], at: Anchor): void {
  closeMenu();
  const menu = document.createElement('div');
  menu.className = 'wn-menu';
  menu.setAttribute('role', 'menu');

  for (const it of items) {
    if (it.sep) {
      const s = document.createElement('div');
      s.className = 'wn-menu-sep';
      menu.appendChild(s);
      continue;
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'wn-menu-item';
    if (it.disabled) b.disabled = true;
    if (it.checked) b.classList.add('checked');

    // slot único à esquerda: swatch de cor, OU ícone, OU "check" quando
    // selecionado e sem ícone (itens selecionados ainda ganham fundo tonal)
    const lead = document.createElement('span');
    lead.className = 'lead';
    if (it.swatch !== undefined) {
      const sw = document.createElement('span');
      sw.className = 'sw';
      if (it.swatch) sw.style.background = it.swatch;
      else sw.style.borderStyle = 'dashed';
      lead.appendChild(sw);
    } else if (it.icon) {
      lead.classList.add('micon');
      lead.textContent = it.icon;
    } else if (it.checked) {
      lead.classList.add('micon');
      lead.textContent = 'check';
    }
    b.appendChild(lead);

    const lb = document.createElement('span');
    lb.className = 'lb';
    lb.textContent = it.label ?? '';
    b.appendChild(lb);

    if (it.shortcut) {
      const sc = document.createElement('span');
      sc.className = 'sc';
      sc.textContent = it.shortcut;
      b.appendChild(sc);
    }

    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', (e) => { e.stopPropagation(); closeMenu(); it.onClick?.(); });
    if (!it.disabled) attachRipple(b);
    menu.appendChild(b);
  }

  document.body.appendChild(menu);

  // posiciona (preso ao gatilho ou em ponto) e mantém dentro da viewport
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  let x: number, y: number;
  if ('anchor' in at) {
    const r = at.anchor.getBoundingClientRect();
    x = r.left;
    y = r.bottom + 4;
    if (y + mh > vh - 8) y = Math.max(8, r.top - mh - 4); // vira para cima
  } else {
    x = at.x; y = at.y;
    if (y + mh > vh - 8) y = Math.max(8, y - mh);          // abre acima do cursor
  }
  if (x + mw > vw - 8) x = Math.max(8, vw - mw - 8);
  menu.style.left = `${Math.max(8, x)}px`;
  menu.style.top = `${Math.max(8, y)}px`;
  current = menu;

  const onDown = (e: MouseEvent): void => {
    if (current && !current.contains(e.target as Node)) closeMenu();
  };
  const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') closeMenu(); };
  const onBlur = (): void => closeMenu();
  // adia o registro p/ não capturar o próprio clique/contextmenu de abertura
  setTimeout(() => {
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onBlur);
    window.addEventListener('blur', onBlur);
  }, 0);
  detach = () => {
    document.removeEventListener('mousedown', onDown, true);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onBlur);
    window.removeEventListener('blur', onBlur);
  };
}

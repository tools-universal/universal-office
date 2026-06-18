// Menu de contexto usando o componente <u-menu> do @universal-material/web.
// Ancorado num ponto (cursor) via um elemento 0×0 fixo; o u-menu calcula a
// posição (com auto-flip nas bordas) a partir do anchorElement.
import '@universal-material/web/menu/menu.js';
import '@universal-material/web/menu/menu-item.js';

export interface CtxItem {
  sep?: boolean;
  icon?: string;       // ligature Material Symbols (slot leading-icon)
  label?: string;
  shortcut?: string;   // texto à direita (slot trailing-icon)
  checked?: boolean;   // mostra "check" no lugar do ícone
  disabled?: boolean;
  onClick?: () => void;
}

interface UMenu extends HTMLElement {
  positioning: 'relative' | 'fixed';
  anchorCorner: string;
  direction: string;
  anchorElement: HTMLElement | null;
  open: boolean;
}

let menuEl: UMenu | null = null;
let anchorEl: HTMLElement | null = null;

export function closeContextMenu(): void {
  menuEl?.remove(); menuEl = null;
  anchorEl?.remove(); anchorEl = null;
}

export function openContextMenu(x: number, y: number, items: CtxItem[]): void {
  closeContextMenu();
  const anchor = document.createElement('div');
  anchor.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:0;height:0;pointer-events:none;`;
  document.body.appendChild(anchor);

  const menu = document.createElement('u-menu') as UMenu;
  menu.positioning = 'fixed';
  menu.anchorCorner = 'start-start';
  menu.direction = 'down-end';
  menu.style.cssText = 'position:fixed;left:0;top:0;';
  menu.anchorElement = anchor;

  for (const it of items) {
    if (it.sep) {
      const hr = document.createElement('div');
      hr.className = 'u-ctx-sep';
      menu.appendChild(hr);
      continue;
    }
    const mi = document.createElement('u-menu-item') as HTMLElement & { disabled?: boolean };
    if (it.disabled) mi.disabled = true;
    const lead = document.createElement('span');
    lead.className = 'micon';
    lead.slot = 'leading-icon';
    lead.textContent = it.checked ? 'check' : (it.icon ?? '');
    mi.appendChild(lead);
    mi.appendChild(document.createTextNode(it.label ?? ''));
    if (it.shortcut) {
      const sc = document.createElement('span');
      sc.className = 'u-ctx-kbd';
      sc.slot = 'trailing-icon';
      sc.textContent = it.shortcut;
      mi.appendChild(sc);
    }
    if (!it.disabled && it.onClick) {
      mi.addEventListener('click', () => { closeContextMenu(); it.onClick!(); });
    }
    menu.appendChild(mi);
  }

  document.body.appendChild(menu);
  menu.addEventListener('closed', () => closeContextMenu());
  menu.anchorElement = anchor; // reforça após conectar
  menu.open = true;
  menuEl = menu;
  anchorEl = anchor;
}

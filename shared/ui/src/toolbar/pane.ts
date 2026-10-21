// PAINEL LATERAL dos editores (Painel de Estilos, de Revisão, de Navegação…):
// título, fechar, corpo livre e rodapé opcional, acoplado à DIREITA da área que
// o app indica (`frame`) — ou à esquerda, ou embaixo na largura toda (`dock`). O app reserva o espaço (ex.: padding das páginas) e
// chama place() quando o layout muda; o painel se reposiciona sozinho em
// resize/scroll da janela. Um painel por id.
import { DEFAULT_UI_LANG, pickLabels, type UiLang } from '../i18n.js';
import { symbol } from './icons.js';
import type { Lbl } from './types.js';

const LABELS = { en: { close: 'Close' }, pt: { close: 'Fechar' } };

export interface PaneOptions {
  id: string;
  title: Lbl;
  lang?: UiLang;
  /** onde pendurar o painel (precisa do CSS das barras) */
  layer: HTMLElement;
  /** área onde o painel acopla */
  frame: () => DOMRect;
  /** lado da área: à direita (padrão) ou à esquerda, de cima a baixo; embaixo, na largura toda */
  dock?: 'right' | 'left' | 'bottom';
  /** largura (px, padrão 300) — à direita/esquerda */
  width?: number;
  /** altura (px, padrão 220) — embaixo */
  height?: number;
  body: HTMLElement;
  footer?: HTMLElement;
  /** depois de fechar (× ou close()) */
  onClose?: () => void;
}

export interface PaneHandle {
  el: HTMLElement;
  body: HTMLElement;
  readonly open: boolean;
  close(): void;
  /** reposiciona (o app chama quando a área muda) */
  place(): void;
  setTitle(title: Lbl): void;
}

const panes = new Map<string, PaneHandle>();

/** Painel aberto com esse id (ou undefined). */
export function paneOpen(id: string): PaneHandle | undefined { return panes.get(id); }

/** Fecha os painéis pendurados em `layer` (ou todos). */
export function closePanes(layer?: HTMLElement): void {
  for (const p of [...panes.values()]) if (!layer || layer.contains(p.el)) p.close();
}

export function openPane(o: PaneOptions): PaneHandle {
  const cur = panes.get(o.id);
  if (cur) { cur.place(); return cur; }
  const lang = o.lang ?? DEFAULT_UI_LANG;
  const L = pickLabels(lang, LABELS);
  const txt = (l: Lbl): string => (typeof l === 'string' ? l : pickLabels(lang, l));
  const width = o.width ?? 300;
  const height = o.height ?? 220;
  const dock = o.dock ?? 'right';
  const el = document.createElement('aside');
  el.className = 'uo-pane';
  el.dataset['pane'] = o.id;
  el.dataset['dock'] = dock;
  el.setAttribute('part', 'pane');
  el.setAttribute('role', 'complementary');
  if (dock !== 'bottom') el.style.width = `${width}px`;
  const head = document.createElement('div');
  head.className = 'uo-pane-head';
  const title = document.createElement('span');
  title.className = 'uo-pane-title';
  title.textContent = txt(o.title);
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'uo-btn uo-pane-x';
  x.dataset['a'] = `pane:${o.id}:close`;
  x.title = L.close;
  x.setAttribute('aria-label', L.close);
  x.innerHTML = symbol('close');
  head.append(title, x);
  const body = o.body;
  body.classList.add('uo-pane-body');
  el.append(head, body);
  if (o.footer) { o.footer.classList.add('uo-pane-foot'); el.appendChild(o.footer); }
  el.setAttribute('aria-label', txt(o.title));
  o.layer.appendChild(el);

  const place = (): void => {
    const r = o.frame();
    const top = Math.max(0, r.top), bottom = Math.min(r.bottom, window.innerHeight);
    if (dock === 'bottom') {
      const h = Math.min(height, Math.max(120, bottom - top));
      el.style.top = `${bottom - h}px`;
      el.style.height = `${h}px`;
      el.style.left = `${Math.max(0, r.left)}px`;
      el.style.width = `${r.width}px`;
      return;
    }
    el.style.top = `${top}px`;
    el.style.height = `${Math.max(120, bottom - top)}px`;
    el.style.left = `${Math.max(0, dock === 'left' ? r.left : r.right - width)}px`;
  };
  let open = true;
  const onWin = (): void => place();
  window.addEventListener('resize', onWin);
  window.addEventListener('scroll', onWin, true);
  const handle: PaneHandle = {
    el, body,
    get open() { return open; },
    place,
    setTitle: (t) => { title.textContent = txt(t); el.setAttribute('aria-label', txt(t)); },
    close: () => {
      if (!open) return;
      open = false;
      panes.delete(o.id);
      window.removeEventListener('resize', onWin);
      window.removeEventListener('scroll', onWin, true);
      el.remove();
      o.onClose?.();
    },
  };
  x.addEventListener('click', () => handle.close());
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape' && e.target === el) handle.close(); });
  panes.set(o.id, handle);
  place();
  return handle;
}

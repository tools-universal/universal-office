// GALERIA das barras (estilos do Write; estilos de forma/tabela, temas, layouts
// do Slides e do Sheet depois): miniaturas desenhadas pelo APP (render), item
// atual destacado, menu de contexto por miniatura.
//  - ribbon (célula grande): uma faixa de linhas com ▲ ▼ (rola uma linha) e ⌄
//    (expande a grade inteira + rodapé de comandos); a largura é ELÁSTICA — a
//    ribbon tira colunas (até minCols) antes de recolher o grupo (fit);
//  - barra compacta (item pequeno): um botão com o rótulo do item atual que
//    abre a mesma grade.
// Teclado: setas entre as miniaturas, Enter/Espaço escolhe, Esc fecha a grade.
import { symbol } from './icons.js';
import { closeMenus, openMenu } from './menu.js';
import { esc, ripple } from './items.js';
import type { BarContext, Lbl, MenuSource } from './types.js';

export interface GalleryItem {
  id: string;
  /** legenda/nome (tooltip e leitores de tela) */
  label: Lbl;
  /** tooltip mais longo (descrição) */
  tip?: Lbl;
  /** seção na grade expandida (ver GalleryConfig.sections) */
  section?: string;
}

export interface GalleryConfig {
  id: string;
  /** nome da galeria (rótulo do gatilho e acessibilidade) */
  label: Lbl;
  /** ícone do gatilho (barra compacta / grupo recolhido) */
  icon?: string;
  items: () => GalleryItem[];
  /** desenha a miniatura dentro do botão (canvas, HTML…) */
  render: (tile: HTMLElement, item: GalleryItem) => void;
  /** muda → as miniaturas são redesenhadas (ex.: versão da folha de estilos) */
  version?: () => unknown;
  /** id do item atual (destacado) */
  selected?: () => string | undefined;
  onPick: (id: string) => void;
  supports?: () => boolean;
  isEnabled?: () => boolean;
  /** tamanho da miniatura (px) */
  tile: { w: number; h: number };
  /** linhas visíveis na ribbon (padrão 1) */
  rows?: number;
  /** colunas na ribbon com espaço sobrando (padrão 7) e o mínimo antes de recolher (padrão 3) */
  maxCols?: number;
  minCols?: number;
  /** colunas da grade expandida (padrão: maxCols) */
  expandCols?: number;
  sections?: { id: string; label: Lbl }[];
  /** comandos sob a grade expandida */
  footer?: MenuSource;
  /** botão direito numa miniatura */
  context?: (item: GalleryItem) => MenuSource;
}

export interface RenderedGallery {
  el: HTMLElement;
  sync(): void;
  visible(): boolean;
  /** largura que o item pode ceder sem recolher (ribbon) */
  shrink(): number;
  /** ceder `px` de largura (0 = largura cheia) */
  fit(px: number): void;
}

const L_UP = { en: 'Previous row', pt: 'Linha anterior' };
const L_DOWN = { en: 'Next row', pt: 'Próxima linha' };
const L_MORE = { en: 'More', pt: 'Mais' };
const NAV_W = 22, GAP = 2, PAD = 6;

let openGrid: { close: () => void; owner: HTMLElement } | null = null;
export function closeGallery(): void { openGrid?.close(); }

export function renderGallery(cfg: GalleryConfig, ctx: BarContext, inline: boolean): RenderedGallery {
  const reg = ctx.registry;
  const t = (l: Lbl): string => reg.text(l);
  const rows = cfg.rows ?? 1;
  const maxCols = cfg.maxCols ?? 7;
  const minCols = Math.min(cfg.minCols ?? 3, maxCols);
  let cols = maxCols;
  let top = 0; // 1ª linha visível
  let items: GalleryItem[] = [];
  let itemsKey = '';
  let drawn: unknown = Symbol('none');
  let sel: string | undefined;
  const enabled = (): boolean => { try { return cfg.isEnabled?.() ?? true; } catch { return false; } };
  const vis = (): boolean => { try { return cfg.supports?.() ?? true; } catch { return false; } };

  const tile = (it: GalleryItem): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'uo-gal-tile';
    b.dataset['id'] = it.id;
    b.setAttribute('role', 'option');
    b.title = t(it.tip ?? it.label);
    b.setAttribute('aria-label', t(it.label));
    b.style.width = `${cfg.tile.w}px`;
    b.style.height = `${cfg.tile.h}px`;
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => { closeGallery(); cfg.onPick(it.id); ctx.after(); });
    b.addEventListener('contextmenu', (e) => {
      if (!cfg.context) return;
      e.preventDefault();
      e.stopPropagation();
      openMenu(cfg.context(it), { x: e.clientX, y: e.clientY }, { lang: ctx.lang, registry: reg, layer: ctx.layer, onClose: () => ctx.after() });
    });
    b.addEventListener('keydown', (e) => keyNav(e, b));
    cfg.render(b, it);
    ripple(b);
    return b;
  };

  /** setas entre as miniaturas da grade (a da faixa ou a expandida) */
  const keyNav = (e: KeyboardEvent, b: HTMLElement): void => {
    const grid = b.parentElement;
    if (!grid) return;
    const list = [...grid.querySelectorAll<HTMLButtonElement>('.uo-gal-tile')];
    const i = list.indexOf(b as HTMLButtonElement);
    const n = parseInt(getComputedStyle(grid).gridTemplateColumns.split(' ').length.toString(), 10) || cols;
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: n, ArrowUp: -n };
    if (step[e.key] === undefined) return;
    e.preventDefault();
    const j = Math.max(0, Math.min(list.length - 1, i + step[e.key]!));
    list[j]?.focus();
  };

  // ── faixa da ribbon ──
  const root = document.createElement('div');
  root.dataset['a'] = `gallery:${cfg.id}`;
  let view: HTMLElement | null = null, strip: HTMLElement | null = null;
  let up: HTMLButtonElement | null = null, down: HTMLButtonElement | null = null;
  let trigText: HTMLElement | null = null;
  const navBtn = (icon: string, lbl: Lbl, a: string): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'uo-btn uo-gal-nav-btn';
    b.dataset['a'] = `gallery:${cfg.id}:${a}`;
    b.title = t(lbl);
    b.setAttribute('aria-label', t(lbl));
    b.innerHTML = symbol(icon);
    b.addEventListener('mousedown', (e) => e.preventDefault());
    ripple(b);
    return b;
  };
  if (inline) {
    root.className = 'uo-gal';
    root.setAttribute('role', 'listbox');
    root.setAttribute('aria-label', t(cfg.label));
    view = document.createElement('div');
    view.className = 'uo-gal-view';
    view.style.height = `${rows * cfg.tile.h + (rows - 1) * GAP + PAD}px`;
    strip = document.createElement('div');
    strip.className = 'uo-gal-grid';
    view.appendChild(strip);
    const nav = document.createElement('div');
    nav.className = 'uo-gal-nav';
    up = navBtn('keyboard_arrow_up', L_UP, 'up');
    down = navBtn('keyboard_arrow_down', L_DOWN, 'down');
    const more = navBtn('expand_more', L_MORE, 'more');
    up.addEventListener('click', () => { top = Math.max(0, top - 1); layoutStrip(); });
    down.addEventListener('click', () => { top = Math.min(lastTop(), top + 1); layoutStrip(); });
    more.addEventListener('click', (e) => { e.stopPropagation(); toggleGrid(root); });
    nav.append(up, down, more);
    root.append(view, nav);
  } else {
    root.className = 'uo-btn uo-drop uo-combo uo-gal-trigger';
    root.setAttribute('role', 'button');
    root.setAttribute('aria-haspopup', 'listbox');
    root.tabIndex = 0;
    root.title = t(cfg.label);
    root.innerHTML = `<span class="uo-drop-text"></span><span class="uo-chev">${symbol('arrow_drop_down')}</span>`;
    trigText = root.querySelector('.uo-drop-text');
    root.addEventListener('mousedown', (e) => e.preventDefault());
    root.addEventListener('click', (e) => { e.stopPropagation(); if (!root.hasAttribute('aria-disabled')) toggleGrid(root); });
    root.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); toggleGrid(root); } });
    ripple(root);
  }

  const lastTop = (): number => Math.max(0, Math.ceil(items.length / cols) - rows);
  const stripWidth = (c: number): number => c * cfg.tile.w + (c - 1) * GAP + PAD;
  const layoutStrip = (): void => {
    if (!strip || !view) return;
    strip.style.gridTemplateColumns = `repeat(${cols}, ${cfg.tile.w}px)`;
    view.style.width = `${stripWidth(cols)}px`;
    top = Math.min(top, lastTop());
    strip.style.transform = `translateY(${-top * (cfg.tile.h + GAP)}px)`;
    up!.disabled = top <= 0;
    down!.disabled = top >= lastTop();
    for (const b of strip.querySelectorAll<HTMLElement>('.uo-gal-tile')) {
      const i = items.findIndex((x) => x.id === b.dataset['id']);
      const row = Math.floor(i / cols);
      b.tabIndex = row >= top && row < top + rows ? 0 : -1;
    }
  };
  /** rola para a linha do item atual */
  const reveal = (): void => {
    const i = items.findIndex((x) => x.id === sel);
    if (i < 0) return;
    const row = Math.floor(i / cols);
    if (row < top) top = row;
    else if (row >= top + rows) top = row - rows + 1;
  };

  const rebuild = (): void => {
    if (!strip) return;
    strip.replaceChildren(...items.map(tile));
    layoutStrip();
  };
  const markSel = (scope: ParentNode): void => {
    for (const b of scope.querySelectorAll<HTMLElement>('.uo-gal-tile')) {
      const on = b.dataset['id'] === sel;
      b.classList.toggle('uo-on', on);
      b.setAttribute('aria-selected', String(on));
    }
  };

  // ── grade expandida (popover próprio, sobre a faixa) ──
  const toggleGrid = (anchor: HTMLElement): void => {
    if (openGrid?.owner === anchor) { closeGallery(); return; }
    closeGallery();
    closeMenus();
    // a grade usa a lista ATUAL (o documento pode ter mudado desde o último sync)
    items = cfg.items();
    const pop = document.createElement('div');
    pop.className = 'uo-pop uo-gal-pop';
    pop.setAttribute('role', 'listbox');
    pop.setAttribute('aria-label', t(cfg.label));
    const n = cfg.expandCols ?? maxCols;
    const secs = cfg.sections?.length ? cfg.sections : [{ id: '', label: '' }];
    for (const s of secs) {
      const its = cfg.sections?.length ? items.filter((it) => (it.section ?? '') === s.id) : items;
      if (!its.length) continue;
      if (s.label) {
        const h = document.createElement('div');
        h.className = 'uo-pop-lbl';
        h.textContent = t(s.label);
        pop.appendChild(h);
      }
      const g = document.createElement('div');
      g.className = 'uo-gal-grid';
      g.style.gridTemplateColumns = `repeat(${Math.min(n, its.length)}, ${cfg.tile.w}px)`;
      g.append(...its.map(tile));
      pop.appendChild(g);
    }
    if (cfg.footer) {
      const entries = reg.resolve(typeof cfg.footer === 'function' ? cfg.footer() : cfg.footer);
      if (entries.length) {
        const f = document.createElement('div');
        f.className = 'uo-gal-foot';
        for (const m of entries) {
          if (m.sep) { const s = document.createElement('div'); s.className = 'uo-menu-sep'; f.appendChild(s); continue; }
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'uo-menu-item';
          if (m.id) b.dataset['a'] = m.id;
          b.disabled = !!m.disabled;
          b.innerHTML = `<span class="lead">${m.icon ? symbol(m.icon) : ''}</span><span class="lb">${esc(m.label === undefined ? '' : t(m.label))}</span>`
            + (m.shortcut ? `<span class="sc">${esc(m.shortcut)}</span>` : '');
          b.addEventListener('mousedown', (e) => e.preventDefault());
          b.addEventListener('click', () => { closeGallery(); m.onClick?.(); ctx.after(); });
          f.appendChild(b);
        }
        pop.appendChild(f);
      }
    }
    markSel(pop);
    ctx.layer.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    let y = inline ? r.top : r.bottom + 4;
    if (y + pop.offsetHeight > vh - 8) y = Math.max(8, vh - pop.offsetHeight - 8);
    pop.style.top = `${y}px`;
    pop.style.left = `${Math.max(8, Math.min(r.left, vw - pop.offsetWidth - 8))}px`;
    anchor.classList.add('uo-open');
    const onDown = (e: Event): void => {
      const path = e.composedPath();
      if (path.includes(pop) || path.includes(anchor)) return;
      if (path.some((x) => x instanceof HTMLElement && x.classList.contains('uo-menu'))) return;
      close();
    };
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') { e.preventDefault(); close(); anchor.focus?.(); } };
    const close = (): void => {
      if (openGrid?.owner !== anchor) return;
      openGrid = null;
      pop.remove();
      anchor.classList.remove('uo-open');
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', close);
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', close);
    openGrid = { close, owner: anchor };
    (pop.querySelector<HTMLElement>('.uo-gal-tile.uo-on') ?? pop.querySelector<HTMLElement>('.uo-gal-tile'))?.focus({ preventScroll: true });
  };

  return {
    el: root,
    visible: vis,
    shrink: () => (inline ? Math.max(0, stripWidth(maxCols) - stripWidth(minCols)) : 0),
    fit: (px) => {
      if (!inline) return;
      const want = Math.max(minCols, Math.min(maxCols, Math.floor((stripWidth(maxCols) - px - PAD + GAP) / (cfg.tile.w + GAP))));
      if (want === cols) return;
      cols = want;
      reveal();
      layoutStrip();
    },
    sync: () => {
      const v = vis();
      root.hidden = !v;
      if (!v) return;
      const its = cfg.items();
      const key = its.map((x) => `${x.id}\u0001${t(x.label)}`).join('\u0002');
      const ver = cfg.version?.();
      const prevSel = sel;
      sel = cfg.selected?.();
      if (key !== itemsKey || ver !== drawn) {
        items = its;
        itemsKey = key;
        drawn = ver;
        rebuild();
      }
      if (sel !== prevSel) { reveal(); layoutStrip(); }
      markSel(root);
      const ok = enabled();
      root.classList.toggle('uo-disabled', !ok);
      if (ok) root.removeAttribute('aria-disabled'); else root.setAttribute('aria-disabled', 'true');
      for (const b of root.querySelectorAll<HTMLButtonElement>('button')) b.disabled = !ok || (b === up && top <= 0) || (b === down && top >= lastTop());
      if (trigText) trigText.textContent = items.find((x) => x.id === sel) ? t(items.find((x) => x.id === sel)!.label) : '';
    },
  };
}

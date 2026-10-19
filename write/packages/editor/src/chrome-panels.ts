// Painéis das barras do Write: Localizar/Substituir (flutuante, não modal),
// cartões de comentário AO LADO DA PÁGINA e a barra de status.
import { renderItem, symbol, toggleMenu, type BarContext, type RenderedItem, type MenuItem } from '@universal-office/ui';
import type { UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import { ZOOMS } from './chrome-commands.js';

// ───────────────────────── Localizar e substituir ─────────────────────────

export class FindPanel {
  readonly el: HTMLElement;
  private readonly find: HTMLInputElement;
  private readonly repl: HTMLInputElement;
  private readonly msg: HTMLElement;

  constructor(private readonly ed: UniversalWriteElement, private readonly app: WriteApp, layer: HTMLElement) {
    const L = app.ui!.L;
    const el = document.createElement('div');
    el.className = 'uw-find';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', L.findTitle);
    el.setAttribute('part', 'find');
    el.hidden = true;
    el.innerHTML = `
      <div class="uw-find-head"><strong></strong>
        <button type="button" class="uo-btn" data-a="find:close">${symbol('close')}</button></div>
      <input type="text" data-a="find:text" />
      <input type="text" data-a="find:replace" />
      <div class="uw-find-actions"><span class="uw-find-msg"></span>
        <button type="button" class="uo-pill" data-a="find:next"></button>
        <button type="button" class="uo-pill" data-a="find:one"></button>
        <button type="button" class="uo-pill uo-pill-primary" data-a="find:all"></button></div>`;
    el.querySelector('strong')!.textContent = L.findTitle;
    this.find = el.querySelector('[data-a="find:text"]')!;
    this.repl = el.querySelector('[data-a="find:replace"]')!;
    this.msg = el.querySelector('.uw-find-msg')!;
    this.find.placeholder = L.find;
    this.repl.placeholder = L.replaceWith;
    const b = (id: string, label: string, fn: () => void): void => {
      const x = el.querySelector<HTMLButtonElement>(`[data-a="find:${id}"]`)!;
      x.textContent = label;
      x.addEventListener('click', fn);
    };
    b('next', L.findNext, () => this.next());
    b('one', L.replace, () => this.replaceOne());
    b('all', L.replaceAll, () => this.replaceAll());
    el.querySelector('[data-a="find:close"]')!.addEventListener('click', () => this.close());
    for (const i of [this.find, this.repl]) {
      i.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); this.close(); }
        if (e.key === 'Enter') { e.preventDefault(); if (i === this.repl && e.ctrlKey) this.replaceAll(); else this.next(); }
      });
    }
    this.find.addEventListener('input', () => { this.msg.textContent = ''; this.find.classList.remove('uw-miss'); });
    layer.appendChild(el);
    this.el = el;
  }

  get isOpen(): boolean { return !this.el.hidden; }

  open(replace: boolean, top: number): void {
    this.el.hidden = false;
    this.el.style.top = `${Math.max(8, top)}px`;
    const editable = !this.ed.isProtected();
    for (const x of this.el.querySelectorAll<HTMLElement>('[data-a="find:replace"],[data-a="find:one"],[data-a="find:all"]')) x.hidden = !editable;
    const sel = this.ed.selectedText();
    if (sel && !sel.includes('\n') && sel.length < 200) this.find.value = sel;
    const t = replace && editable ? this.repl : this.find;
    t.focus();
    t.select();
  }

  close(): void {
    this.el.hidden = true;
    this.ed.focusEditor();
  }

  private next(): boolean {
    const ok = !!this.find.value && this.ed.findNext(this.find.value);
    this.find.classList.toggle('uw-miss', !ok && !!this.find.value);
    this.msg.textContent = ok || !this.find.value ? '' : this.app.ui!.L.notFound;
    return ok;
  }

  private replaceOne(): void {
    const needle = this.find.value;
    if (!needle) return;
    if (this.ed.selectedText().toLowerCase() === needle.toLowerCase()) this.ed.pasteText(this.repl.value);
    this.next();
  }

  private replaceAll(): void {
    if (!this.find.value) return;
    const n = this.ed.replaceAll(this.find.value, this.repl.value);
    this.msg.textContent = n ? this.app.ui!.L.replaced(n) : this.app.ui!.L.notFound;
  }
}

// ───────────────────────── comentários ao lado da página ─────────────────────────

/**
 * Cartões posicionados no espaço de ROLAGEM do componente (filhos absolutos do
 * shadow root, cujo bloco de contenção é o próprio host com overflow): rolam
 * junto com as páginas, sem laço de rAF. Empilham sem sobreposição; o que fica
 * na altura exata do trecho ganha a linha pontilhada até a página.
 */
export class CommentCards {
  readonly el: HTMLElement;
  private raf = 0;

  constructor(private readonly ed: UniversalWriteElement, private readonly app: WriteApp, root: ShadowRoot, private readonly after: () => void) {
    const el = document.createElement('div');
    el.className = 'uw-comments';
    el.setAttribute('part', 'comments');
    for (const t of ['mousedown', 'dblclick', 'contextmenu', 'keydown', 'wheel'] as const) {
      el.addEventListener(t, (e) => { if (t !== 'wheel') e.stopPropagation(); }, { passive: t === 'wheel' });
    }
    root.appendChild(el);
    this.el = el;
  }

  schedule(): void {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.render(); });
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.el.remove();
    this.ed.classList.remove('uw-has-comments');
  }

  render(): void {
    const pages = [...(this.ed.shadowRoot?.querySelectorAll<HTMLCanvasElement>('canvas.page') ?? [])];
    // só com espaço ao lado das páginas comentadas (calha de 300 px); sem ele, nada de cartões
    const all = this.app.commentsVisible && this.ed.getView() === 'print' ? this.ed.getComments() : [];
    const pageW = Math.max(0, ...all.map((c) => pages[this.ed.commentAnchorPx(c.id)?.page ?? -1]?.offsetWidth ?? 0));
    const comments = this.ed.clientWidth >= pageW + 300 + 48 ? all : [];
    this.ed.classList.toggle('uw-has-comments', comments.length > 0);
    const L = this.app.ui!.L;
    const active = new Set(this.app.activeCommentIds);
    this.el.replaceChildren();
    if (!comments.length) return;
    type Placed = { card: HTMLElement; ideal: number };
    const placed: Placed[] = [];
    for (const c of comments) {
      const a = this.ed.commentAnchorPx(c.id);
      const page = a ? pages[a.page] : undefined;
      if (!a || !page) continue;
      const card = document.createElement('div');
      card.className = `uw-card${active.has(c.id) ? ' active' : ''}`;
      card.dataset['commentId'] = String(c.id);
      card.innerHTML = `<div class="uw-card-head"><span class="who"></span>
        <button type="button" class="uo-btn" data-a="comment:delete:${c.id}" title="${L.deleteComment}">${symbol('delete')}</button></div>
        <div class="txt"></div>`;
      card.querySelector('.who')!.textContent = c.author ?? L.anonymous;
      card.querySelector('.txt')!.textContent = c.text;
      card.querySelector('button')!.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.ed.isProtected()) return;
        this.ed.removeComment(c.id);
        this.after();
      });
      card.addEventListener('click', () => {
        this.app.activeCommentIds = [c.id];
        this.ed.goToComment(c.id);
        this.render();
        this.after();
      });
      card.style.left = `${page.offsetLeft + page.offsetWidth + 24}px`;
      this.el.appendChild(card);
      placed.push({ card, ideal: a.topPx });
    }
    placed.sort((x, y) => x.ideal - y.ideal);
    let bottom = -Infinity;
    for (const p of placed) {
      const top = Math.max(p.ideal, bottom + 8);
      p.card.style.top = `${top}px`;
      p.card.classList.toggle('anchored', Math.abs(top - p.ideal) <= 6);
      bottom = top + (p.card.offsetHeight || 56);
    }
  }
}

// ───────────────────────── barra de status ─────────────────────────

export class StatusBar {
  private readonly status: HTMLElement;
  private readonly slider: HTMLInputElement;
  private readonly items: RenderedItem[] = [];
  private flashTimer = 0;
  private flashing = false;

  constructor(private readonly ed: UniversalWriteElement, private readonly app: WriteApp, container: HTMLElement, ctx: BarContext) {
    const bar = document.createElement('div');
    bar.className = 'uw-status-bar';
    bar.setAttribute('part', 'statusbar');
    this.status = document.createElement('span');
    this.status.className = 'uw-status';
    this.status.dataset['a'] = 'status';
    this.status.setAttribute('role', 'status');
    const sp = document.createElement('span');
    sp.className = 'uo-spacer';
    bar.append(this.status, sp);
    const views = document.createElement('span');
    views.className = 'uw-views';
    for (const id of ['view:print', 'view:web', 'view:read', 'focus']) {
      const r = renderItem(id, ctx);
      views.appendChild(r.el);
      this.items.push(r);
    }
    bar.appendChild(views);
    const zo = renderItem('zoomout', ctx);
    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.min = '10';
    this.slider.max = '500';
    this.slider.step = '5';
    this.slider.className = 'uw-zoom-slider';
    this.slider.dataset['a'] = 'zoom:slider';
    this.slider.title = ctx.registry.text({ en: 'Zoom (Ctrl+scroll on the document)', pt: 'Zoom (Ctrl+rolagem no documento)' });
    this.slider.addEventListener('input', () => ed.setZoom(Number(this.slider.value) / 100));
    this.slider.addEventListener('change', () => ctx.after());
    const zi = renderItem('zoomin', ctx);
    const pct = document.createElement('button');
    pct.type = 'button';
    pct.className = 'uo-btn uw-zoom-pct';
    pct.dataset['a'] = 'zoom';
    pct.title = ctx.registry.text({ en: 'Zoom', pt: 'Zoom' });
    pct.addEventListener('mousedown', (e) => e.preventDefault());
    pct.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu(pct, () => ZOOMS.map((z): MenuItem => ({
        label: `${z}%`, checked: Math.round(ed.getZoom() * 100) === z,
        onClick: () => { ed.setZoom(z / 100); ctx.after(); },
      })), ctx);
    });
    this.items.push(zo, zi, { el: pct, visible: () => true, sync: () => { pct.textContent = `${Math.round(ed.getZoom() * 100)}%`; } });
    bar.append(zo.el, this.slider, zi.el, pct);
    container.appendChild(bar);
  }

  flash(msg: string): void {
    window.clearTimeout(this.flashTimer);
    if (!msg) { this.flashing = false; this.sync(); return; }
    this.flashing = true;
    this.status.textContent = msg;
    this.flashTimer = window.setTimeout(() => { this.flashing = false; this.sync(); }, 2400);
  }

  sync(): void {
    if (!this.flashing) {
      const s = this.ed.stats();
      this.status.textContent = this.app.ui!.L.status(s.page, s.pages, s.words);
    }
    for (const r of this.items) r.sync();
    if (this.ed.getRootNode() && document.activeElement !== this.slider) this.slider.value = String(Math.round(this.ed.getZoom() * 100));
  }
}

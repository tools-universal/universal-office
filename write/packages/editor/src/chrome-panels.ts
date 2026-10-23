// Painéis das barras do Write: cartões de comentário AO LADO DA PÁGINA e a barra
// de status (o Localizar e Substituir é o diálogo do chrome-find.ts).
import { renderItem, symbol, toggleMenu, uiLang, type BarContext, type RenderedItem, type MenuItem } from '@universal-office/ui';
import type { UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import { ZOOMS } from './chrome-commands.js';

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
    const print = this.ed.getView() === 'print';
    const L = this.app.ui!.L;
    // balões de revisão (Todas as Marcações): formatação — e, com "revisões nos balões",
    // as exclusões — no mesmo trilho dos comentários
    const mode = this.ed.getMarkupMode();
    const mk = this.ed.getMarkupOptions();
    const revs = print && mode === 'all' && mk.balloons !== 'inline' ? this.ed.getRevisions() : [];
    const anchors = revs.length ? this.ed.revisionAnchors() : [];
    const balloons = anchors.filter((a) => {
      const r = revs[a.index]!;
      if (r.kind === 'format' || r.kind === 'paraFormat') return mk.formatting && (!mk.authors || mk.authors.includes(r.author));
      return mk.balloons === 'revisions' && r.kind === 'delete' && mk.insertionsDeletions && (!mk.authors || mk.authors.includes(r.author));
    });
    // só com espaço ao lado das páginas (calha de 300 px); sem ele, nada de cartões
    const all = this.app.commentsVisible && mk.comments && print ? this.ed.getComments() : [];
    const pageW = Math.max(0,
      ...all.map((c) => pages[this.ed.commentAnchorPx(c.id)?.page ?? -1]?.offsetWidth ?? 0),
      ...balloons.map((a) => pages[a.page]?.offsetWidth ?? 0));
    const room = this.ed.clientWidth >= pageW + 300 + 48;
    const comments = room ? all : [];
    const shown = room ? balloons : [];
    this.ed.classList.toggle('uw-has-comments', comments.length + shown.length > 0);
    const active = new Set(this.app.activeCommentIds);
    this.el.replaceChildren();
    if (!comments.length && !shown.length) return;
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
    for (const a of shown) {
      const r = revs[a.index]!;
      const page = pages[a.page];
      if (!page) continue;
      const card = document.createElement('div');
      card.className = 'uw-card uw-rev-card';
      card.style.setProperty('--uw-rev', `#${r.color}`);
      card.innerHTML = `<div class="uw-card-head"><span class="who"></span><span class="when"></span>
        <button type="button" class="uo-btn" data-a="rev:accept" title="${L.revAccept}">${symbol('check')}</button>
        <button type="button" class="uo-btn" data-a="rev:reject" title="${L.revReject}">${symbol('close')}</button></div>
        <div class="txt"></div>`;
      card.querySelector('.who')!.textContent = r.author;
      card.querySelector('.when')!.textContent = revisionTime(r.date, uiLang(this.ed));
      const txt = card.querySelector('.txt')!;
      if (r.description) {
        const [head, ...rest] = r.description.split(': ');
        txt.append(Object.assign(document.createElement('b'), { textContent: `${head}: ` }), rest.join(': '));
      } else {
        txt.append(Object.assign(document.createElement('b'), { textContent: `${r.mark ? L.revParaDeleted : L.revDeleted}: ` }), r.text);
      }
      const [acc, rej] = card.querySelectorAll('button');
      acc!.addEventListener('click', (e) => { e.stopPropagation(); if (this.ed.acceptRevisionAt(a.index)) this.after(); });
      rej!.addEventListener('click', (e) => { e.stopPropagation(); if (this.ed.rejectRevisionAt(a.index)) this.after(); });
      card.addEventListener('click', () => { this.ed.selectRevision(a.index); this.after(); });
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

/** Data e hora curtas de uma revisão no idioma da interface (o w:date do Word já é hora local). */
export function revisionTime(date: string | undefined, lang: string): string {
  const m = date ? /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(date) : null;
  if (!m) return '';
  const d = new Date(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!);
  return d.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' });
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

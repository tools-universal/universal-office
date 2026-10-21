// Painel de Revisão do Write: lista as revisões (e os comentários) do
// documento, com o total por tipo; clicar leva à revisão, ✓/✗ aceita/rejeita.
// Vertical (à esquerda das páginas) ou horizontal (acima da barra de status),
// preso na área visível enquanto o documento rola.
import { symbol, uiLang } from '@universal-office/ui';
import type { UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import { revisionTime } from './chrome-panels.js';

export type PaneDir = 'vertical' | 'horizontal';

export class ReviewPane {
  readonly el: HTMLElement;
  dir: PaneDir | null = null;
  private raf = 0;
  private readonly ro: ResizeObserver;

  constructor(private readonly ed: UniversalWriteElement, private readonly app: WriteApp, private readonly root: ShadowRoot, private readonly after: () => void) {
    const el = document.createElement('div');
    el.className = 'uw-review';
    el.setAttribute('part', 'review-pane');
    el.setAttribute('role', 'complementary');
    for (const t of ['mousedown', 'dblclick', 'contextmenu', 'keydown', 'wheel'] as const) {
      el.addEventListener(t, (e) => { if (t !== 'wheel') e.stopPropagation(); }, { passive: t === 'wheel' });
    }
    this.el = el;
    this.ro = new ResizeObserver(() => this.fit());
  }

  open(dir: PaneDir): void {
    this.dir = dir;
    const pages = this.root.querySelector('.pages');
    if (!pages) return;
    if (dir === 'vertical') pages.before(this.el); else pages.after(this.el);
    this.el.classList.toggle('h', dir === 'horizontal');
    this.ed.classList.toggle('uw-review-v', dir === 'vertical');
    this.ed.classList.toggle('uw-review-h', dir === 'horizontal');
    this.ro.observe(this.ed);
    this.render();
  }

  close(): void {
    this.dir = null;
    this.el.remove();
    this.ro.disconnect();
    this.ed.classList.remove('uw-review-v', 'uw-review-h');
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.close();
  }

  schedule(): void {
    if (!this.dir || this.raf) return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.render(); });
  }

  /** Altura do painel vertical: a área visível entre as barras. */
  private fit(): void {
    const top = this.root.querySelector<HTMLElement>('.uw-topbar')?.offsetHeight ?? 0;
    const bottom = this.root.querySelector<HTMLElement>('.uw-bottombar')?.offsetHeight ?? 0;
    if (this.dir === 'horizontal') {
      this.el.style.cssText = `bottom: ${bottom}px`;
      return;
    }
    // preso entre as barras, sem ocupar lugar no fluxo (as páginas abrem a calha)
    const h = Math.max(120, this.ed.clientHeight - top - bottom);
    this.el.style.cssText = `top: ${top}px; height: ${h}px; margin-bottom: ${-h}px`;
  }

  render(): void {
    if (!this.dir) return;
    this.fit();
    const L = this.app.ui!.L;
    const lang = uiLang(this.ed);
    const revs = this.ed.getRevisions();
    const comments = this.app.commentsVisible ? this.ed.getComments() : [];
    const n = { ins: 0, del: 0, move: 0, fmt: 0 };
    for (const r of revs) {
      if (r.move) n.move++;
      else if (r.kind === 'insert') n.ins++;
      else if (r.kind === 'delete') n.del++;
      else n.fmt++;
    }
    const head = document.createElement('div');
    head.className = 'uw-review-head';
    const title = document.createElement('strong');
    title.textContent = `${L.revPane}: ${L.revCount(revs.length)}`;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'uo-btn';
    close.title = L.revClose;
    close.innerHTML = symbol('close');
    close.addEventListener('click', () => { this.close(); this.after(); });
    head.append(title, close);
    const sum = document.createElement('div');
    sum.className = 'uw-review-sum';
    sum.textContent = [`${L.revInsertions}: ${n.ins}`, `${L.revDeletions}: ${n.del}`, `${L.revMoves}: ${n.move}`, `${L.revFormatting}: ${n.fmt}`, `${L.revComments}: ${comments.length}`].join(' · ');
    const list = document.createElement('ul');
    list.className = 'uw-review-list';
    revs.forEach((r, i) => {
      const li = document.createElement('li');
      li.className = 'uw-rev';
      li.style.setProperty('--uw-rev', `#${r.color}`);
      const what = r.move ? (r.kind === 'delete' ? L.revMovedFrom : L.revMovedTo)
        : r.kind === 'insert' ? (r.mark ? L.revParaInserted : L.revInserted)
          : r.kind === 'delete' ? (r.mark ? L.revParaDeleted : L.revDeleted) : L.revFormatted;
      li.innerHTML = `<div class="uw-rev-head"><span class="who"></span><span class="what"></span><span class="gap"></span>
        <button type="button" class="uo-btn" data-a="rev:accept">${symbol('check')}</button>
        <button type="button" class="uo-btn" data-a="rev:reject">${symbol('close')}</button></div><div class="when"></div><div class="txt"></div>`;
      li.querySelector('.who')!.textContent = r.author;
      li.querySelector('.what')!.textContent = what;
      li.querySelector('.when')!.textContent = revisionTime(r.date, lang);
      li.querySelector('.txt')!.textContent = r.description ? r.description.replace(/^[^:]*:\s*/, '') : r.text;
      const [acc, rej] = li.querySelectorAll('button');
      acc!.title = L.revAccept;
      rej!.title = L.revReject;
      acc!.addEventListener('click', (e) => { e.stopPropagation(); if (this.ed.acceptRevisionAt(i)) this.after(); });
      rej!.addEventListener('click', (e) => { e.stopPropagation(); if (this.ed.rejectRevisionAt(i)) this.after(); });
      li.addEventListener('click', () => { this.ed.selectRevision(i); this.after(); });
      list.appendChild(li);
    });
    for (const c of comments) {
      const li = document.createElement('li');
      li.className = 'uw-rev uw-rev-comment';
      li.innerHTML = '<div class="uw-rev-head"><span class="who"></span><span class="what"></span></div><div class="txt"></div>';
      li.querySelector('.who')!.textContent = c.author ?? L.anonymous;
      li.querySelector('.what')!.textContent = L.revComments;
      li.querySelector('.txt')!.textContent = c.text;
      li.addEventListener('click', () => { this.app.activeCommentIds = [c.id]; this.ed.goToComment(c.id); this.after(); });
      list.appendChild(li);
    }
    if (!revs.length && !comments.length) {
      const li = document.createElement('li');
      li.className = 'uw-rev-empty';
      li.textContent = L.revNone;
      list.appendChild(li);
    }
    this.el.replaceChildren(head, sum, list);
  }
}

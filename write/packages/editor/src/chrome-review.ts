// Painel de Revisão do Write: lista as revisões (e os comentários) do
// documento, com o total por tipo; clicar leva à revisão, ✓/✗ aceita/rejeita.
// É o painel lateral das barras (openPane): vertical à esquerda das páginas ou
// horizontal acima da barra de status, como no Word.
import { openPane, symbol, uiLang, type PaneHandle, type UiLang } from '@universal-office/ui';
import type { UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import { revisionTime } from './chrome-panels.js';

export type PaneDir = 'vertical' | 'horizontal';

export interface ReviewPaneEnv {
  layer: HTMLElement;
  /** área entre as barras */
  frame: () => DOMRect;
  lang?: UiLang;
}

export class ReviewPane {
  dir: PaneDir | null = null;
  private pane: PaneHandle | null = null;
  private raf = 0;

  constructor(private readonly ed: UniversalWriteElement, private readonly app: WriteApp, private readonly env: ReviewPaneEnv, private readonly after: () => void) {}

  open(dir: PaneDir): void {
    this.close();
    this.dir = dir;
    const body = document.createElement('div');
    body.className = 'uw-review';
    const pane = openPane({
      id: 'revisions', title: this.app.ui!.L.revPane, lang: this.env.lang, layer: this.env.layer, frame: this.env.frame,
      dock: dir === 'vertical' ? 'left' : 'bottom', width: 300, height: 220, body,
      // fechado pelo ×: o painel não volta na próxima abertura
      onClose: () => {
        if (this.pane !== pane) return;
        this.pane = null;
        this.dir = null;
        this.ed.classList.remove('uw-review-v', 'uw-review-h');
        this.app.prefs.set('reviewPane', '');
        this.after();
      },
    });
    pane.el.setAttribute('part', 'pane review-pane');
    this.pane = pane;
    this.ed.classList.toggle('uw-review-v', dir === 'vertical');
    this.ed.classList.toggle('uw-review-h', dir === 'horizontal');
    this.render();
  }

  close(): void {
    const pane = this.pane;
    this.pane = null;
    this.dir = null;
    pane?.close();
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

  /** Reposiciona (a área entre as barras mudou). */
  place(): void { this.pane?.place(); }

  render(): void {
    const pane = this.pane;
    if (!pane) return;
    pane.place();
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
    pane.setTitle(`${L.revPane}: ${L.revCount(revs.length)}`);
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
    pane.body.replaceChildren(sum, list);
  }
}

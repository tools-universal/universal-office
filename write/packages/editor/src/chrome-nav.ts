// Painel de Navegação do Write (Exibir > Painel de Navegação, Ctrl+F): busca
// no topo e três abas, como no Word —
//  - Títulos: a árvore dos títulos do corpo (getHeadings), clicar vai, a
//    seta recolhe/expande, arrastar move a seção inteira (moveHeading) e o menu
//    de contexto promove/rebaixa, cria, exclui e seleciona;
//  - Páginas: miniaturas (paintPageThumbnail), pintadas quando aparecem;
//  - Resultados: as ocorrências da busca com o trecho em volta.
// Com busca ativa, os títulos com ocorrência ficam realçados e Páginas só
// mostra as páginas com ocorrência. É o painel lateral das barras (openPane),
// à esquerda.
import { openMenu, openPane, pickLabels, symbol, type MenuItem, type PaneHandle, type UiLang } from '@universal-office/ui';
import type { HeadingInfo, SearchResult, UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';

const LABELS = {
  en: {
    title: 'Navigation', search: 'Search document', options: 'Search options',
    headings: 'Headings', pages: 'Pages', results: 'Results',
    matchCase: 'Match case', wholeWord: 'Find whole words only', highlight: 'Highlight all', incremental: 'Incremental find',
    replace: 'Replace…', clear: 'Clear search',
    result: (i: number, n: number) => `Result ${i} of ${n}`, results0: 'No results', resultsN: (n: number) => `${n} results`,
    prev: 'Previous result', next: 'Next result',
    noHeadings: 'Apply Heading styles to the titles in your document so they show up here.',
    noPages: 'Thumbnails are available in Print Layout.',
    noSearch: 'Type in the search box to find text in the document.',
    noMatch: 'We couldn’t find what you were looking for.',
    promote: 'Promote', demote: 'Demote', newBefore: 'New Heading Before', newAfter: 'New Heading After', newSub: 'New Subheading',
    del: 'Delete', select: 'Select Heading and Content', expandAll: 'Expand All', collapseAll: 'Collapse All',
    showLevels: 'Show Heading Levels', all: 'All', level: (n: number) => `Show Heading ${n}`,
    page: (n: number) => `Page ${n}`, collapse: 'Collapse', expand: 'Expand',
  },
  pt: {
    title: 'Navegação', search: 'Pesquisar documento', options: 'Opções de pesquisa',
    headings: 'Títulos', pages: 'Páginas', results: 'Resultados',
    matchCase: 'Diferenciar maiúsculas e minúsculas', wholeWord: 'Localizar apenas palavras inteiras', highlight: 'Realçar tudo', incremental: 'Pesquisa incremental',
    replace: 'Substituir…', clear: 'Limpar pesquisa',
    result: (i: number, n: number) => `Resultado ${i} de ${n}`, results0: 'Nenhum resultado', resultsN: (n: number) => `${n} resultados`,
    prev: 'Resultado anterior', next: 'Próximo resultado',
    noHeadings: 'Aplique estilos de Título aos títulos do documento para que apareçam aqui.',
    noPages: 'As miniaturas aparecem no Layout de Impressão.',
    noSearch: 'Digite na caixa de pesquisa para localizar texto no documento.',
    noMatch: 'Não encontramos o que você procurava.',
    promote: 'Promover', demote: 'Rebaixar', newBefore: 'Novo Título Antes', newAfter: 'Novo Título Depois', newSub: 'Novo Subtítulo',
    del: 'Excluir', select: 'Selecionar Título e Conteúdo', expandAll: 'Expandir Tudo', collapseAll: 'Recolher Tudo',
    showLevels: 'Mostrar Níveis de Título', all: 'Todos', level: (n: number) => `Mostrar Título ${n}`,
    page: (n: number) => `Página ${n}`, collapse: 'Recolher', expand: 'Expandir',
  },
};

type Tab = 'headings' | 'pages' | 'results';

export interface NavEnv {
  ed: UniversalWriteElement;
  app: WriteApp;
  lang: UiLang;
  layer: HTMLElement;
  frame: () => DOMRect;
  /** Localizar e Substituir (Substituir… do menu da busca) */
  replace(): void;
  after(): void;
}

interface TreeNode { h: HeadingInfo; kids: TreeNode[] }

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export class NavPane {
  private pane: PaneHandle | null = null;
  private readonly L: (typeof LABELS)['en'];
  private tab: Tab = 'headings';
  private input!: HTMLInputElement;
  private status!: HTMLElement;
  private bodyEl!: HTMLElement;
  private tabs = new Map<Tab, HTMLButtonElement>();
  private heads: HeadingInfo[] = [];
  private results: SearchResult[] = [];
  private current = -1;
  private query = '';
  private opts = { matchCase: false, wholeWord: false, highlight: true, incremental: true };
  /** títulos recolhidos (nível + texto + ocorrência) */
  private collapsed = new Set<string>();
  private maxLevel = 9;
  private raf = 0;
  private searchTimer = 0;
  private thumbs = new Map<number, HTMLCanvasElement>();
  private io: IntersectionObserver | null = null;
  private dirtyThumbs = true;
  private dragFrom = -1;
  /** assinatura da árvore desenhada (redesenha só quando muda) */
  private treeSig = '';

  constructor(private readonly env: NavEnv) {
    this.L = pickLabels(env.lang, LABELS);
  }

  get isOpen(): boolean { return !!this.pane; }

  open(focusSearch = false): void {
    if (!this.pane) this.build();
    this.pane!.place();
    this.refresh();
    if (focusSearch) {
      const sel = this.env.ed.selectedText();
      if (sel && !sel.includes('\n') && sel.length < 200) { this.input.value = sel; this.runSearch(true); }
      this.input.focus();
      this.input.select();
    }
  }

  close(): void { this.pane?.close(); }
  /** Desmonta sem mexer na preferência (troca de barra, desmontagem). */
  private detach(): void {
    const p = this.pane;
    this.pane = null;
    this.io?.disconnect();
    this.io = null;
    this.thumbs.clear();
    p?.close();
    this.env.ed.classList.remove('uw-nav-open');
  }
  toggle(): void { if (this.pane) this.close(); else this.open(); }
  place(): void { this.pane?.place(); }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.searchTimer);
    this.detach();
  }

  /** O documento mudou (edição, seleção, zoom): redesenha no próximo quadro. */
  schedule(docChanged = false): void {
    if (!this.pane) return;
    if (docChanged) {
      this.dirtyThumbs = true;
      // a busca acompanha a edição (como o painel do Word refaz a pesquisa)
      if (this.query) { clearTimeout(this.searchTimer); this.searchTimer = window.setTimeout(() => this.runSearch(false), 300); }
    }
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.refresh(); });
  }

  private build(): void {
    const L = this.L;
    const body = el('div', 'uw-nav');
    // busca
    const box = el('div', 'uw-nav-search');
    const ic = el('span', 'uw-nav-search-ic');
    ic.innerHTML = symbol('search');
    this.input = el('input', 'uw-nav-input');
    this.input.type = 'search';
    this.input.placeholder = L.search;
    this.input.setAttribute('aria-label', L.search);
    this.input.dataset['a'] = 'nav:search';
    const optBtn = el('button', 'uo-btn uw-nav-opt');
    optBtn.type = 'button';
    optBtn.title = L.options;
    optBtn.setAttribute('aria-label', L.options);
    optBtn.dataset['a'] = 'nav:options';
    optBtn.innerHTML = symbol('arrow_drop_down');
    optBtn.addEventListener('click', () => this.optionsMenu(optBtn));
    box.append(ic, this.input, optBtn);
    this.input.addEventListener('input', () => {
      clearTimeout(this.searchTimer);
      if (this.opts.incremental || !this.input.value) this.searchTimer = window.setTimeout(() => this.runSearch(true), this.input.value ? 250 : 0);
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.input.value !== this.query) this.runSearch(true);
        else this.step(e.shiftKey ? -1 : 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (this.input.value) { this.input.value = ''; this.runSearch(true); } else this.env.ed.focusEditor();
      }
    });
    // estado da busca: "Resultado X de N" ▲ ▼
    const st = el('div', 'uw-nav-status');
    this.status = el('span', 'uw-nav-count');
    const prev = el('button', 'uo-btn uw-nav-step');
    prev.type = 'button'; prev.title = L.prev; prev.setAttribute('aria-label', L.prev); prev.innerHTML = symbol('keyboard_arrow_up');
    prev.dataset['a'] = 'nav:prev';
    prev.addEventListener('click', () => this.step(-1));
    const next = el('button', 'uo-btn uw-nav-step');
    next.type = 'button'; next.title = L.next; next.setAttribute('aria-label', L.next); next.innerHTML = symbol('keyboard_arrow_down');
    next.dataset['a'] = 'nav:next';
    next.addEventListener('click', () => this.step(1));
    st.append(this.status, prev, next);
    // abas
    const tabs = el('div', 'uw-nav-tabs');
    tabs.setAttribute('role', 'tablist');
    for (const t of ['headings', 'pages', 'results'] as Tab[]) {
      const b = el('button', 'uw-nav-tab', L[t]);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.dataset['a'] = `nav:tab:${t}`;
      b.addEventListener('click', () => { this.tab = t; this.refresh(); });
      this.tabs.set(t, b);
      tabs.appendChild(b);
    }
    this.bodyEl = el('div', 'uw-nav-body');
    body.append(box, st, tabs, this.bodyEl);
    const pane = openPane({
      id: 'navigation', title: L.title, lang: this.env.lang, layer: this.env.layer, frame: this.env.frame,
      dock: 'left', width: 300, body,
      onClose: () => {
        if (this.pane !== pane) return;
        this.pane = null;
        this.io?.disconnect();
        this.io = null;
        this.thumbs.clear();
        this.env.ed.classList.remove('uw-nav-open');
        // fechar o painel tira o realce da busca, como no Word
        this.env.ed.clearSearch();
        this.results = [];
        this.query = '';
        this.env.app.prefs.set('navPane', '');
        this.env.after();
      },
    });
    pane.el.setAttribute('part', 'pane navigation-pane');
    this.pane = pane;
    this.env.ed.classList.add('uw-nav-open');
    this.env.app.prefs.set('navPane', '1');
  }

  private optionsMenu(anchor: HTMLElement): void {
    const L = this.L;
    const flag = (k: keyof NavPane['opts'], label: string): MenuItem => ({
      id: `nav:${k}`, label, checked: this.opts[k],
      onClick: () => { this.opts[k] = !this.opts[k]; if (k !== 'incremental') this.runSearch(false); },
    });
    openMenu([
      flag('matchCase', L.matchCase), flag('wholeWord', L.wholeWord), flag('highlight', L.highlight), flag('incremental', L.incremental),
      { sep: true },
      { id: 'nav:replace', label: L.replace, icon: 'find_replace', onClick: () => this.env.replace(), disabled: this.env.ed.isProtected() },
      { id: 'nav:clear', label: L.clear, icon: 'close', onClick: () => { this.input.value = ''; this.runSearch(true); }, disabled: !this.query },
    ], { anchor, side: 'below' }, { layer: this.env.layer, lang: this.env.lang });
  }

  private runSearch(showResults: boolean): void {
    const q = this.input.value;
    this.query = q;
    this.results = q ? this.env.ed.search(q, { matchCase: this.opts.matchCase, wholeWord: this.opts.wholeWord, highlight: this.opts.highlight }) : (this.env.ed.clearSearch(), []);
    this.current = -1;
    if (q && showResults && this.tab === 'headings' && !this.heads.length) this.tab = 'results';
    this.refresh();
  }

  private step(dir: 1 | -1): void {
    const n = this.results.length;
    if (!n) return;
    this.current = this.current < 0 ? (dir > 0 ? 0 : n - 1) : (this.current + dir + n) % n;
    this.env.ed.goToSearchResult(this.current);
    this.refresh();
    this.input.focus();
  }

  refresh(): void {
    if (!this.pane) return;
    const L = this.L;
    const ed = this.env.ed;
    this.pane.place();
    this.heads = ed.getHeadings();
    for (const [t, b] of this.tabs) {
      b.classList.toggle('uo-on', t === this.tab);
      b.setAttribute('aria-selected', String(t === this.tab));
    }
    const n = this.results.length;
    this.status.parentElement!.hidden = !this.query;
    this.status.textContent = !this.query ? '' : !n ? L.results0 : this.current >= 0 ? L.result(this.current + 1, n) : L.resultsN(n);
    for (const b of this.status.parentElement!.querySelectorAll('button')) b.disabled = !n;
    if (this.tab === 'headings') this.renderHeadings();
    else if (this.tab === 'pages') this.renderPages();
    else this.renderResults();
  }

  // ───── Títulos ─────
  private keyOf(h: HeadingInfo): string {
    let k = 0;
    for (const x of this.heads) { if (x.index >= h.index) break; if (x.level === h.level && x.text === h.text) k++; }
    return `${h.level}|${h.text}|${k}`;
  }

  private tree(): TreeNode[] {
    const roots: TreeNode[] = [];
    const stack: TreeNode[] = [];
    for (const h of this.heads) {
      const node: TreeNode = { h, kids: [] };
      while (stack.length && stack[stack.length - 1]!.h.level >= h.level) stack.pop();
      if (stack.length) stack[stack.length - 1]!.kids.push(node); else roots.push(node);
      stack.push(node);
    }
    return roots;
  }

  private renderHeadings(): void {
    const L = this.L;
    const ed = this.env.ed;
    const list = el('div', 'uw-nav-tree');
    list.setAttribute('role', 'tree');
    if (!this.heads.length) {
      this.treeSig = '';
      this.bodyEl.replaceChildren(el('p', 'uw-nav-empty', L.noHeadings));
      return;
    }
    const cur = ed.currentHeading(this.heads);
    const hit = new Set(this.results.map((r) => r.heading));
    const editable = !ed.isProtected();
    // mesma árvore (só o cursor andou): troca o destaque sem refazer as linhas
    const sig = [this.heads.map((h) => `${h.level}|${h.text}`).join('\n'), [...this.collapsed].join('\n'), this.maxLevel, [...hit].join(','), editable].join('\u0001');
    const old = this.bodyEl.querySelector<HTMLElement>('.uw-nav-tree');
    if (old && this.treeSig === sig) {
      for (const r of old.querySelectorAll<HTMLElement>('.uw-nav-row')) r.classList.toggle('uo-on', +r.dataset['index']! === cur);
      old.querySelector('.uo-on')?.scrollIntoView({ block: 'nearest' });
      return;
    }
    this.treeSig = sig;
    const row = (node: TreeNode, depth: number): void => {
      const h = node.h;
      if (h.level > this.maxLevel) return;
      const kids = node.kids.filter((k) => k.h.level <= this.maxLevel);
      const key = this.keyOf(h);
      const closed = this.collapsed.has(key);
      const r = el('div', 'uw-nav-row');
      r.setAttribute('role', 'treeitem');
      r.dataset['index'] = String(h.index);
      r.style.paddingLeft = `${4 + depth * 14}px`;
      r.classList.toggle('uo-on', h.index === cur);
      r.classList.toggle('uw-nav-hit', hit.has(h.index));
      if (kids.length) r.setAttribute('aria-expanded', String(!closed));
      const tw = el('button', 'uw-nav-twisty');
      tw.type = 'button';
      tw.tabIndex = -1;
      if (kids.length) {
        tw.innerHTML = symbol(closed ? 'chevron_right' : 'expand_more');
        tw.title = closed ? L.expand : L.collapse;
        tw.addEventListener('click', (e) => {
          e.stopPropagation();
          if (closed) this.collapsed.delete(key); else this.collapsed.add(key);
          this.refresh();
        });
      } else tw.classList.add('uw-nav-leaf');
      const label = el('span', 'uw-nav-label', h.text);
      label.title = h.text;
      r.append(tw, label);
      r.addEventListener('click', () => { ed.goToHeading(h.index); this.refresh(); });
      r.addEventListener('contextmenu', (e) => { e.preventDefault(); this.headingMenu(h, e.clientX, e.clientY); });
      if (editable) {
        r.draggable = true;
        r.addEventListener('dragstart', (e) => {
          this.dragFrom = h.index;
          e.dataTransfer?.setData('text/plain', h.text);
          if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
          r.classList.add('uw-nav-dragging');
        });
        r.addEventListener('dragend', () => { this.dragFrom = -1; r.classList.remove('uw-nav-dragging'); this.clearDrop(); });
      }
      list.appendChild(r);
      if (!closed) for (const k of kids) row(k, depth + 1);
    };
    for (const n of this.tree()) row(n, 0);
    // soltar entre os títulos: a seção vai para antes do título da linha (ou para o fim)
    list.addEventListener('dragover', (e) => {
      if (this.dragFrom < 0) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      this.markDrop(list, e.clientY);
    });
    list.addEventListener('dragleave', (e) => { if (!list.contains(e.relatedTarget as Node | null)) this.clearDrop(); });
    list.addEventListener('drop', (e) => {
      if (this.dragFrom < 0) return;
      e.preventDefault();
      const before = this.dropTarget(list, e.clientY);
      const from = this.dragFrom;
      this.dragFrom = -1;
      this.clearDrop();
      if (ed.moveHeading(from, before)) this.env.after();
      this.refresh();
    });
    this.bodyEl.replaceChildren(list);
    list.querySelector('.uo-on')?.scrollIntoView({ block: 'nearest' });
  }

  /** Título antes do qual a seção arrastada entra (heads.length = fim). */
  private dropTarget(list: HTMLElement, y: number): number {
    const rows = [...list.querySelectorAll<HTMLElement>('.uw-nav-row')];
    for (const r of rows) {
      const b = r.getBoundingClientRect();
      if (y < b.top + b.height / 2) return +r.dataset['index']!;
    }
    // depois da última linha visível: depois da seção dela inteira
    const last = rows[rows.length - 1];
    if (!last) return this.heads.length;
    const li = +last.dataset['index']!;
    const lh = this.heads[li]!;
    const nxt = this.heads.find((h) => h.index > li && h.level <= lh.level);
    return nxt ? nxt.index : this.heads.length;
  }

  private markDrop(list: HTMLElement, y: number): void {
    this.clearDrop();
    const before = this.dropTarget(list, y);
    const r = list.querySelector<HTMLElement>(`.uw-nav-row[data-index="${before}"]`);
    if (r) r.classList.add('uw-nav-drop-before');
    else list.classList.add('uw-nav-drop-end');
  }

  private clearDrop(): void {
    for (const r of this.bodyEl.querySelectorAll('.uw-nav-drop-before')) r.classList.remove('uw-nav-drop-before');
    this.bodyEl.querySelector('.uw-nav-tree')?.classList.remove('uw-nav-drop-end');
  }

  private headingMenu(h: HeadingInfo, x: number, y: number): void {
    const L = this.L;
    const ed = this.env.ed;
    const ro = ed.isProtected();
    const done = (ok: unknown): void => { if (ok !== false) this.env.after(); this.refresh(); };
    const levels = (): MenuItem[] => [
      { id: 'nav:levels:all', label: L.all, checked: this.maxLevel === 9, onClick: () => { this.maxLevel = 9; this.refresh(); } },
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((n): MenuItem => ({ id: `nav:levels:${n}`, label: L.level(n), checked: this.maxLevel === n, onClick: () => { this.maxLevel = n; this.refresh(); } })),
    ];
    openMenu([
      { id: 'nav:promote', label: L.promote, icon: 'arrow_back', disabled: ro || h.level <= 1, onClick: () => done(ed.promoteHeading(h.index)) },
      { id: 'nav:demote', label: L.demote, icon: 'arrow_forward', disabled: ro || h.level >= 9, onClick: () => done(ed.demoteHeading(h.index)) },
      { sep: true },
      { id: 'nav:newBefore', label: L.newBefore, disabled: ro, onClick: () => done(ed.insertHeading(h.index, 'before')) },
      { id: 'nav:newAfter', label: L.newAfter, disabled: ro, onClick: () => done(ed.insertHeading(h.index, 'after')) },
      { id: 'nav:newSub', label: L.newSub, disabled: ro || h.level >= 9, onClick: () => done(ed.insertHeading(h.index, 'sub')) },
      { id: 'nav:delete', label: L.del, icon: 'delete', disabled: ro, onClick: () => done(ed.deleteHeading(h.index)) },
      { sep: true },
      { id: 'nav:select', label: L.select, icon: 'select_all', onClick: () => { ed.selectHeading(h.index); this.env.after(); } },
      { sep: true },
      { id: 'nav:expandAll', label: L.expandAll, icon: 'unfold_more', onClick: () => { this.collapsed.clear(); this.refresh(); } },
      { id: 'nav:collapseAll', label: L.collapseAll, icon: 'unfold_less', onClick: () => { for (const x of this.heads) this.collapsed.add(this.keyOf(x)); this.refresh(); } },
      { id: 'nav:levels', label: L.showLevels, submenu: levels },
    ], { x, y }, { layer: this.env.layer, lang: this.env.lang });
  }

  // ───── Páginas ─────
  private renderPages(): void {
    const L = this.L;
    const ed = this.env.ed;
    const total = ed.layoutPageCount();
    if (!total) { this.bodyEl.replaceChildren(el('p', 'uw-nav-empty', L.noPages)); return; }
    const only = this.query ? new Set(this.results.map((r) => r.page).filter((p) => p >= 0)) : null;
    if (only && !only.size) { this.bodyEl.replaceChildren(el('p', 'uw-nav-empty', L.noMatch)); return; }
    const cur = ed.currentPage() - 1;
    let grid = this.bodyEl.querySelector<HTMLElement>('.uw-nav-pages');
    const want = [...Array(total).keys()].filter((i) => !only || only.has(i));
    const sig = want.join(',');
    if (!grid || grid.dataset['sig'] !== sig) {
      grid = el('div', 'uw-nav-pages');
      grid.dataset['sig'] = sig;
      this.io?.disconnect();
      this.thumbs.clear();
      this.io = new IntersectionObserver((ents) => {
        for (const e of ents) if (e.isIntersecting) this.paintThumb(+(e.target as HTMLElement).dataset['page']!);
      }, { root: this.bodyEl, rootMargin: '200px' });
      for (const i of want) {
        const item = el('button', 'uw-nav-page');
        item.type = 'button';
        item.dataset['page'] = String(i);
        item.dataset['a'] = `nav:page:${i + 1}`;
        item.title = L.page(i + 1);
        const c = el('canvas', 'uw-nav-thumb');
        const num = el('span', 'uw-nav-pnum', String(i + 1));
        item.append(c, num);
        item.addEventListener('click', () => { ed.goToPage(i); this.refresh(); });
        this.thumbs.set(i, c);
        grid.appendChild(item);
        this.io.observe(item);
      }
      this.bodyEl.replaceChildren(grid);
      this.dirtyThumbs = true;
    }
    for (const b of grid.querySelectorAll<HTMLElement>('.uw-nav-page')) b.classList.toggle('uo-on', +b.dataset['page']! === cur);
    if (this.dirtyThumbs) {
      this.dirtyThumbs = false;
      // repinta as que já apareceram (as outras pintam ao aparecer)
      for (const [i, c] of this.thumbs) if (c.dataset['painted']) this.paintThumb(i);
    }
  }

  private paintThumb(i: number): void {
    const c = this.thumbs.get(i);
    if (!c) return;
    if (this.env.ed.paintPageThumbnail(i, c, 150)) c.dataset['painted'] = '1';
  }

  // ───── Resultados ─────
  private renderResults(): void {
    const L = this.L;
    if (!this.query) { this.bodyEl.replaceChildren(el('p', 'uw-nav-empty', L.noSearch)); return; }
    if (!this.results.length) { this.bodyEl.replaceChildren(el('p', 'uw-nav-empty', L.noMatch)); return; }
    const list = el('div', 'uw-nav-results');
    list.setAttribute('role', 'list');
    for (const r of this.results) {
      const b = el('button', 'uw-nav-result');
      b.type = 'button';
      b.setAttribute('role', 'listitem');
      b.dataset['a'] = `nav:result:${r.index + 1}`;
      b.classList.toggle('uo-on', r.index === this.current);
      b.append(document.createTextNode(r.before), el('strong', undefined, r.match), document.createTextNode(r.after));
      b.addEventListener('click', () => {
        this.current = r.index;
        this.env.ed.goToSearchResult(r.index);
        this.refresh();
      });
      list.appendChild(b);
    }
    this.bodyEl.replaceChildren(list);
    list.querySelector('.uo-on')?.scrollIntoView({ block: 'nearest' });
  }
}

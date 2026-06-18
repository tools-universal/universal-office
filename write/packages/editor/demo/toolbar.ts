// Toolbar colapsável no padrão Material Design 3 (ref.: Kûara Editor).
// Escada de prioridade: ao faltar largura, os grupos de menor prioridade
// colapsam — primeiro em gatilhos individuais (ícone + ▾) e, se ainda não
// couberem, num único "⋮". Cada gatilho abre um popover com os CONTROLES VIVOS
// do grupo (os nós são movidos, então handlers e estado são preservados).

import { openMenu } from './menu.js';
import { attachRipple } from './ripple.js';

interface Grp {
  el: HTMLElement;
  prio: number;
  label: string;
  icon: string;
  width: number;
}

// ── selects "iconificados": todo <select data-menu> da toolbar vira um botão
// com ícone + ▾ que abre um menu flutuante. O <select> original fica em
// display:none mas VIVO — escolher no menu seta seu .value e dispara 'change',
// preservando todos os handlers existentes. Exceções: #style e #font (que
// continuam como menus de TEXTO, sem data-menu). ─────────────────────────────
const numRefreshers: Array<() => void> = [];

export function setupIconMenus(): void {
  const sels = document.querySelectorAll<HTMLSelectElement>('#toolbar select[data-menu]');
  sels.forEach((sel) => {
    const icon = sel.dataset.menu ?? 'expand_more';
    const showNum = sel.dataset.menuNum === '1'; // tamanho de fonte mostra o número
    const isColor = sel.id === 'highlight';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tb-menu';
    btn.title = sel.title;

    const render = (): void => {
      const head = showNum
        ? `<span class="tb-menu-num">${sel.value || '11'}</span>`
        : `<span class="micon">${icon}</span>`;
      btn.innerHTML = `${head}<span class="chev">▾</span>`;
      const isDefault = sel.selectedIndex <= 0 || sel.value === '';
      btn.classList.toggle('active', !showNum && !isDefault);
    };
    render();
    if (showNum) numRefreshers.push(render);

    sel.style.display = 'none';
    sel.insertAdjacentElement('beforebegin', btn);
    attachRipple(btn);
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const items = Array.from(sel.options).map((o) => ({
        label: o.textContent ?? o.value,
        checked: o.value === sel.value,
        swatch: isColor ? (o.value || '') : undefined,
        onClick: (): void => {
          sel.value = o.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          render();
        },
      }));
      openMenu(items, { anchor: btn });
    });
  });
}

/** Re-sincroniza os gatilhos que exibem valor (tamanho da fonte). */
export function refreshIconMenus(): void {
  for (const f of numRefreshers) f();
}

export function setupCollapsibleToolbar(): void {
  const toolbar = document.getElementById('toolbar');
  const row = document.getElementById('toolbarRow');
  if (!toolbar || !row) return;

  const groupEls = Array.from(toolbar.querySelectorAll<HTMLElement>('.tb-g'));
  const fileAnchor = toolbar.querySelector('input[type=file]'); // grupos/gatilhos vão antes
  const stash = document.createElement('div');
  stash.style.display = 'none';
  row.appendChild(stash);

  const groups: Grp[] = groupEls.map((el) => ({
    el,
    prio: Number(el.dataset.prio ?? '5'),
    label: el.dataset.label ?? '',
    icon: el.dataset.icon ?? '▾',
    width: 0,
  }));

  const TRIG_W = 50, MORE_W = 42, PAD = 18;
  let popState: { pop: HTMLElement; back: HTMLElement[] } | null = null;

  const remeasure = (): void => {
    // mede com TODOS os grupos inline (largura intrínseca + separador)
    for (const g of groups) toolbar.insertBefore(g.el, fileAnchor);
    for (const g of groups) g.width = g.el.getBoundingClientRect().width + 14;
  };

  const closePop = (): void => {
    if (!popState) return;
    for (const el of popState.back) stash.appendChild(el);
    popState.pop.remove();
    popState = null;
    document.removeEventListener('mousedown', onDocDown, true);
  };
  const onDocDown = (e: MouseEvent): void => {
    if (popState && !popState.pop.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('.tb-trig,.tb-more')) closePop();
  };

  const openPop = (anchor: HTMLElement, sections: Grp[]): void => {
    closePop();
    const pop = document.createElement('div');
    pop.className = 'tb-pop';
    const back: HTMLElement[] = [];
    for (const g of sections) {
      const sec = document.createElement('div');
      sec.className = 'tb-pop-sec';
      const lbl = document.createElement('div');
      lbl.className = 'tb-pop-lbl';
      lbl.textContent = g.label;
      sec.appendChild(lbl);
      sec.appendChild(g.el); // move o nó vivo
      back.push(g.el);
      pop.appendChild(sec);
    }
    row.appendChild(pop);
    // posiciona sob o gatilho, dentro do row (que é position:relative)
    const ar = anchor.getBoundingClientRect();
    const rr = row.getBoundingClientRect();
    pop.style.top = `${ar.bottom - rr.top + 4}px`;
    const left = Math.min(ar.left - rr.left, rr.width - pop.offsetWidth - 8);
    pop.style.left = `${Math.max(8, left)}px`;
    popState = { pop, back };
    document.addEventListener('mousedown', onDocDown, true);
  };

  const makeTrigger = (g: Grp): HTMLButtonElement => {
    const b = document.createElement('button');
    b.className = 'tb-trig';
    b.title = g.label;
    b.innerHTML = `<span class="micon">${g.icon}</span><span class="chev">▾</span>`;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = popState?.back.includes(g.el);
      closePop();
      if (!open) openPop(b, [g]);
    });
    attachRipple(b);
    return b;
  };
  const makeMore = (gs: Grp[]): HTMLButtonElement => {
    const b = document.createElement('button');
    b.className = 'tb-more';
    b.title = 'Mais ferramentas';
    b.innerHTML = '<span class="micon">more_horiz</span>';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = popState && gs.some((g) => popState!.back.includes(g.el));
      closePop();
      if (!open) openPop(b, gs);
    });
    attachRipple(b);
    return b;
  };

  const sumW = (arr: Grp[]): number => arr.reduce((s, g) => s + g.width, 0);

  const relayout = (): void => {
    closePop();
    toolbar.querySelectorAll('.tb-trig,.tb-more').forEach((e) => e.remove());
    const avail = toolbar.clientWidth - PAD;

    // prio 0 = grupo "extras": NUNCA inline, sempre no "⋮" (independe da largura)
    const always = groups.filter((g) => g.prio === 0);
    let inline = groups.filter((g) => g.prio > 0);
    const collapsed: Grp[] = [];
    // reserva o "⋮" sempre que houver extras fixos
    const moreW = (): number => (always.length || collapsed.length ? MORE_W : 0);
    // colapsa do menor prio até caber (prio 9 = formatação, nunca colapsa)
    while (sumW(inline) + collapsed.length * TRIG_W + moreW() > avail) {
      const cand = inline.filter((g) => g.prio < 9).sort((a, b) => a.prio - b.prio)[0];
      if (!cand) break;
      inline = inline.filter((g) => g !== cand);
      collapsed.push(cand);
    }
    // gatilhos que não cabem migram para o "⋮" (junto com os extras fixos)
    let triggers = [...collapsed];
    const more: Grp[] = [...always];
    while (triggers.length && sumW(inline) + triggers.length * TRIG_W + MORE_W > avail) {
      const c = triggers.sort((a, b) => a.prio - b.prio)[0]!;
      triggers = triggers.filter((x) => x !== c);
      more.push(c);
    }

    // render: grupos inline (ordem original) → gatilhos → "⋮"
    for (const g of groups) stash.appendChild(g.el);
    const inlineSet = new Set(inline), trigSet = new Set(triggers);
    for (const g of groups) if (inlineSet.has(g)) toolbar.insertBefore(g.el, fileAnchor);
    for (const g of groups) if (trigSet.has(g)) toolbar.insertBefore(makeTrigger(g), fileAnchor);
    if (more.length) {
      // "⋮" reúne os de menor prio primeiro
      more.sort((a, b) => a.prio - b.prio);
      toolbar.insertBefore(makeMore(more), fileAnchor);
    }
    markFirst();
  };

  const markFirst = (): void => {
    toolbar.querySelectorAll('.tb-first').forEach((e) => e.classList.remove('tb-first'));
    const first = toolbar.querySelector('.tb-g, .tb-trig, .tb-more');
    first?.classList.add('tb-first');
  };

  remeasure();
  relayout();
  const ro = new ResizeObserver(() => relayout());
  ro.observe(toolbar);
  // RO pode ser intermitente em alguns ambientes; resize da janela reforça
  window.addEventListener('resize', relayout);
  // re-mede quando fontes/zoom assentam
  window.addEventListener('load', () => { remeasure(); relayout(); });
  // hook de depuração/teste
  (window as unknown as { __tbRelayout?: () => void }).__tbRelayout = () => { remeasure(); relayout(); };
}

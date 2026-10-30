// Barras do <universal-sheet> (topbar/bottombar/toolbar): sem os atributos nada
// muda; com `topbar` a barra compacta (título acima dos menus) ou a ribbon, os
// menus e as guias do Excel ligados à API do elemento, a barra de fórmulas, as
// guias e a barra de status; `hidden-commands` e as contribuições de plugins
// (`toolbar`) como no Write; atalhos do Excel. Elemento de verdade sobre o DOM falso.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../../write/test-support/fake-dom.js';
import type { UniversalSheetElement as Sheet } from '../src/universal-sheet.js';
import type { UniversalSheetPlugin } from '../src/plugins.js';

let dom: FakeDom;
let Ctor: typeof Sheet;
let el: Sheet;

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  dom = installFakeDom();
  dom.customElements.define('u-ripple', class extends (globalThis as unknown as { HTMLElement: typeof HTMLElement }).HTMLElement {});
  // o DOM falso não tem layout: a linha de ferramentas "tem largura" para os grupos entrarem nela
  const proto = Object.getPrototypeOf(dom.document.createElement('div')) as object;
  let p: object | null = proto;
  while (p && !Object.getOwnPropertyDescriptor(p, 'clientWidth')) p = Object.getPrototypeOf(p);
  const d = Object.getOwnPropertyDescriptor(p!, 'clientWidth')!;
  Object.defineProperty(p!, 'clientWidth', {
    configurable: true,
    get(this: { classList: { contains(c: string): boolean } }) { return this.classList.contains('uo-toolbar') ? 2400 : d.get!.call(this); },
    set(v: number) { d.set!.call(this, v); },
  });
  Ctor = (await import('../src/universal-sheet.js')).UniversalSheetElement;
  await import('../src/chrome.js');
}, 60_000);
afterAll(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  el = new Ctor();
  el.setAttribute('lang', 'en');
  el.setAttribute('formula-locale', 'en-US');
  dom.document.body.appendChild(el as unknown as FakeNode);
  el.newWorkbook();
});
afterEach(() => {
  (el as unknown as FakeNode).remove();
  vi.clearAllTimers();
});

/** espera o import das barras e o sync do próximo quadro */
async function settle(): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await vi.dynamicImportSettled();
    await Promise.resolve();
    vi.advanceTimersByTime(20);
  }
}

const root = (): ShadowRoot => (el as unknown as { shadowRoot: ShadowRoot }).shadowRoot;
const top = (): HTMLElement => root().querySelector<HTMLElement>('.us-topbar')!;
const bottom = (): HTMLElement => root().querySelector<HTMLElement>('.us-bottombar')!;
const menus = (): string[] => [...top().querySelectorAll<HTMLElement>('.uo-mbtn')].map((b) => b.dataset['menu']!);
const tabs = (): string[] => [...top().querySelectorAll<HTMLElement>('.uo-tab')].map((b) => b.dataset['tab']!);
/** elemento pelo `data-a` (o dataset do DOM falso não vira atributo) */
const byA = (scope: HTMLElement, id: string): HTMLElement | null =>
  scope.querySelectorAll<HTMLElement>('*').find((e) => e.dataset?.['a'] === id) ?? null;
const button = (id: string): HTMLButtonElement | null => byA(top(), id) as HTMLButtonElement | null;

function key(code: string, init: { ctrl?: boolean; shift?: boolean; alt?: boolean; key?: string } = {}): Event {
  const e = new Event('keydown', { bubbles: true, cancelable: true });
  Object.assign(e, { code, key: init.key ?? code.replace(/^Key|^Digit/, ''), ctrlKey: !!init.ctrl, metaKey: false, shiftKey: !!init.shift, altKey: !!init.alt });
  return e;
}

describe('sem atributos: a grade como sempre foi', () => {
  it('nenhuma barra é montada e o elemento segue funcionando', async () => {
    await settle();
    expect(top().childNodes.length).toBe(0);
    expect(bottom().childNodes.length).toBe(0);
    expect(el.topbar).toBe(false);
    el.selectRange('A1');
    expect(el.setActiveCellText('1').ok).toBe(true);
  });
});

describe('barra compacta (padrão)', () => {
  it('título acima dos menus do Excel, ferramentas, barra de fórmulas', async () => {
    el.setAttribute('topbar', '');
    await settle();
    expect(top().querySelector('.uo-compact')).not.toBeNull();
    expect(top().querySelector('.uo-titlebar.uo-stacked')).not.toBeNull();
    expect(menus()).toEqual(['file', 'edit', 'view', 'insert', 'format', 'tools', 'help']);
    expect((top().querySelector<HTMLInputElement>('.uo-title'))!.value).toBe('Book1');
    for (const id of ['undo', 'redo', 'print', 'bold', 'italic', 'strike', 'decimal:inc', 'wrap']) expect(button(id), id).not.toBeNull();
    expect(top().querySelector('.us-formula')).not.toBeNull();
    expect(top().querySelector<HTMLInputElement>('.us-namebox')!.value).toBe('A1');
  });

  it('comandos ligados à API: Negrito pelo botão e pelo Ctrl+B; Desfazer volta', async () => {
    el.setAttribute('topbar', '');
    await settle();
    el.selectRange('B2');
    button('bold')!.click();
    expect(el.getCellFormat().bold).toBe(true);
    await settle();
    expect(button('bold')!.classList.contains('uo-on')).toBe(true);
    el.dispatchEvent(key('KeyB', { ctrl: true }));
    expect(el.getCellFormat().bold).toBe(false);
    el.dispatchEvent(key('KeyU', { ctrl: true }));
    expect(el.getCellFormat().underline).toBe(true);
    button('undo')!.click();
    expect(el.getCellFormat().underline).toBe(false);
  });

  it('formato de número (Ctrl+Shift+5 = porcentagem) e AutoSoma (Alt+=)', async () => {
    el.setAttribute('topbar', '');
    await settle();
    el.selectRange('A1');
    el.setActiveCellText('0.25');
    el.dispatchEvent(key('Digit5', { ctrl: true, shift: true, key: '%' }));
    expect(el.getCellFormat().numFmtCode).toBe('0%');
    el.selectRange('A2');
    el.setActiveCellText('0.75');
    el.selectRange('A1:A2');
    el.autoSum('SUM');
    el.selectRange('A3');
    expect(el.activeCellEditText).toBe('=SUM(A1:A2)');
  });

  it('hidden-commands tira comandos, menus e grupos', async () => {
    el.setAttribute('hidden-commands', 'print, format, numfmt');
    el.setAttribute('topbar', '');
    await settle();
    expect(menus()).not.toContain('format');
    expect(button('print')).toBeNull();
    expect(button('decimal:inc')).toBeNull();
    expect(button('bold')).not.toBeNull();
  });

  it('contribuição de plugin (toolbar): comando e grupo novos; sem o plugin, saem', async () => {
    const run = vi.fn();
    const plugin: UniversalSheetPlugin = {
      id: 'acme',
      toolbar: (ctx) => ({
        commands: [{ id: 'acme:hello', label: { en: 'Hello', pt: 'Olá' }, icon: 'info', run }],
        compact: { groups: [{ id: 'acme', label: 'Acme', items: ['acme:hello'] }], menus: [{ id: 'acme-menu', label: 'Acme', items: ['acme:hello'], before: 'help' }] },
        ribbon: { groups: [{ tab: 'home', id: 'acme', label: 'Acme', cells: [{ cmd: 'acme:hello', size: 'large' }] }] },
      }),
    };
    el.use(plugin);
    el.setAttribute('topbar', '');
    await settle();
    expect(menus()).toEqual(['file', 'edit', 'view', 'insert', 'format', 'tools', 'acme-menu', 'help']);
    button('acme:hello')!.click();
    expect(run).toHaveBeenCalledTimes(1);
    expect(el.pluginIds()).toEqual(['acme']);
    el.unuse('acme');
    await settle();
    expect(button('acme:hello')).toBeNull();
  });
});

describe('título e aviso', () => {
  it('openWorkbook dá o título; o hospedeiro carregando direto no elemento volta ao "Book1"', async () => {
    const titles: string[] = [];
    el.host = { setTitle: (t) => titles.push(t) };
    el.setAttribute('topbar', '');
    await settle();
    const { openWorkbook } = await import('../src/index.js');
    const bytes = el.saveXlsx();
    expect(await openWorkbook(el, bytes, 'Orçamento 2026.xlsx')).toBe(true);
    await settle();
    expect(top().querySelector<HTMLInputElement>('.uo-title')!.value).toBe('Orçamento 2026');
    expect(titles.at(-1)).toBe('Orçamento 2026');
    el.newWorkbook();
    await settle();
    expect(top().querySelector<HTMLInputElement>('.uo-title')!.value).toBe('Book1');
    expect(await openWorkbook(el, new Uint8Array([1, 2, 3]), 'x.xlsx')).toBe(false);
  });

  it('setNotice põe o aviso na faixa da barra (e sobrevive à troca de barra)', async () => {
    const note = dom.document.createElement('span') as unknown as HTMLElement;
    note.textContent = 'Somente leitura';
    el.setNotice(note, { tone: 'warning' });
    el.setAttribute('topbar', '');
    await settle();
    const band = top().querySelector<HTMLElement>('.uo-notice')!;
    expect(band.hidden).toBe(false);
    expect(band.dataset['tone']).toBe('warning');
    el.setAttribute('toolbar', 'ribbon');
    await settle();
    expect(top().querySelector<HTMLElement>('.uo-notice')!.textContent).toBe('Somente leitura');
    el.setNotice(null);
    expect(top().querySelector<HTMLElement>('.uo-notice')!.hidden).toBe(true);
  });
});

describe('ribbon e barra inferior', () => {
  it('toolbar="ribbon": guias do Excel; os grupos da Página Inicial', async () => {
    el.setAttribute('toolbar', 'ribbon');
    el.setAttribute('topbar', '');
    await settle();
    expect(top().querySelector('.uo-ribbon')).not.toBeNull();
    expect(tabs()).toEqual(['file', 'home', 'insert', 'formulas', 'view', 'help']);
    const groups = [...top().querySelectorAll<HTMLElement>('.uo-rpanel[data-tab="home"] .uo-rgroup, .uo-rgroup')].map((g) => g.dataset['g']);
    for (const g of ['clipboard', 'font', 'alignment', 'number', 'cells', 'editing']) expect(groups).toContain(g);
  });

  it('bottombar: guias das planilhas (+ inserir) e a soma/contagem da seleção', async () => {
    el.setAttribute('bottombar', '');
    await settle();
    expect(top().childNodes.length).toBe(0);
    expect([...bottom().querySelectorAll<HTMLElement>('.us-tab')].map((t) => t.textContent)).toEqual(['Sheet1']);
    el.selectRange('A1'); el.setActiveCellText('2');
    el.selectRange('A2'); el.setActiveCellText('3');
    el.selectRange('A1:A3');
    await settle();
    const stats = byA(bottom(), 'stats')!.textContent!;
    expect(stats).toContain('Sum: 5');
    expect(stats).toContain('Count: 2');
    expect(stats).toMatch(/Average: 2[.,]5/); // números no formato da grade
    (byA(bottom(), 'sheet:insert') as HTMLButtonElement).click();
    await settle();
    expect([...bottom().querySelectorAll<HTMLElement>('.us-tab')].map((t) => t.textContent)).toEqual(['Sheet1', 'Sheet2']);
  });

  it('tirar os atributos desmonta as barras; o modo protegido da janela (uo-wco) vem do host', async () => {
    el.host = { windowControlsOverlay: true, setTitleTheme: vi.fn() };
    el.setAttribute('topbar', '');
    el.setAttribute('bottombar', '');
    await settle();
    expect(top().classList.contains('uo-wco')).toBe(true);
    expect(vi.mocked(el.host.setTitleTheme!).mock.calls.at(-1)![0]).toBe(false);
    el.removeAttribute('topbar');
    el.removeAttribute('bottombar');
    await settle();
    expect(top().childNodes.length).toBe(0);
    expect(bottom().childNodes.length).toBe(0);
  });
});

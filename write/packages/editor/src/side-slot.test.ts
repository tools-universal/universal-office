// Painéis laterais do hospedeiro (slot="side" / slot="side-start"): light DOM
// projetado abaixo das barras, ao lado das páginas; teclas, roda, cliques e
// arquivos soltos nele são do hospedeiro, não do editor. Elemento de verdade
// sobre o DOM falso.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { installFakeDom, mouseEvent, type FakeDom, type FakeNode } from '../../../test-support/fake-dom.js';
import { installColorSchemeEnv } from '../../../test-support/color-scheme-env.js';
import type { UniversalWriteElement as Editor } from './universal-write.js';
import type { UniversalWriteFontAsset } from './plugins.js';

const FONTS = join(__dirname, '..', 'demo', 'fonts');
const VARIANTS = { regular: 'regular', bold: 'bold', italic: 'italic', boldItalic: 'bolditalic' } as const;
const FONT_ASSETS: UniversalWriteFontAsset[] = Object.entries(VARIANTS).map(([variant, file]) => ({
  family: 'Liberation Sans', variant: variant as UniversalWriteFontAsset['variant'],
  data: new Uint8Array(readFileSync(join(FONTS, `liberationsans-${file}.ttf`))),
}));

let dom: FakeDom;
let Ctor: typeof Editor;
let ed: Editor;

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  dom = installFakeDom();
  dom.customElements.define('u-ripple', class extends (globalThis as unknown as { HTMLElement: typeof HTMLElement }).HTMLElement {});
  Ctor = (await import('./universal-write.js')).UniversalWriteElement;
  await import('./chrome.js');
}, 60_000);
afterAll(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

beforeEach(async () => {
  installColorSchemeEnv();
  ed = new Ctor();
  ed.setAttribute('manual-init', '');
  ed.setAttribute('lang', 'pt');
  ed.hiddenCommands = ['tools', 'style', 'font', 'size', 'save'];
  dom.document.body.appendChild(ed as unknown as FakeNode);
  await ed.initialize({ fonts: FONT_ASSETS });
});
afterEach(() => {
  (ed as unknown as FakeNode).remove();
  vi.clearAllTimers();
});

async function settleChrome(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await vi.dynamicImportSettled();
    await Promise.resolve();
    vi.advanceTimersByTime(20);
  }
}

const shadow = (): ShadowRoot => (ed as unknown as { shadowRoot: ShadowRoot }).shadowRoot;
const wrapper = (name: 'side' | 'side-start'): HTMLElement => shadow().querySelector<HTMLElement>(`.uw-side[data-side="${name}"]`)!;

/** painel do hospedeiro no slot pedido (um div qualquer, como um componente Angular) */
function panel(slot = 'side'): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('slot', slot);
  el.className = 'host-panel';
  ed.appendChild(el);
  return el;
}

const key = (k: string, code: string, mods: Partial<Record<'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey', boolean>> = {}): KeyboardEvent =>
  Object.assign(new Event('keydown', { bubbles: true, cancelable: true, composed: true }), { key: k, code, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, repeat: false, ...mods }) as unknown as KeyboardEvent;

describe('estrutura: slots no shadow DOM', () => {
  it('side-start, páginas e side na linha entre as barras; cada envoltório tem o slot e o part', () => {
    const main = shadow().querySelector<HTMLElement>('.uw-main')!;
    expect(main).not.toBeNull();
    const kids = [...main.children] as HTMLElement[];
    expect(kids.map((k) => k.className)).toEqual(['uw-side', 'pages', 'uw-side']);
    expect(kids[0]!.getAttribute('data-side')).toBe('side-start');
    expect(kids[2]!.getAttribute('data-side')).toBe('side');
    for (const name of ['side', 'side-start'] as const) {
      const w = wrapper(name);
      expect(w.getAttribute('part')).toBe(name);
      expect(w.querySelector('slot')!.getAttribute('name')).toBe(name);
      expect(w.hasAttribute('data-empty')).toBe(true); // vazio não ocupa altura nem largura
    }
    // barra superior antes, inferior depois (o painel fica ABAIXO das barras)
    expect(main.previousElementSibling!.className).toBe('uw-topbar');
    expect(main.nextElementSibling!.className).toBe('uw-bottombar');
  });

  it('o CSS põe o painel sticky entre as barras, rolando sozinho, e fora da impressão', () => {
    const css = shadow().querySelector('style')!.textContent!;
    expect(css).toContain('.uw-side {');
    expect(css).toContain('position: sticky; top: var(--uw-top-h, 0px)');
    expect(css).toContain('height: var(--uw-side-h, auto); overflow: auto; overscroll-behavior: contain');
    expect(css).toContain('@media print { .uw-side { display: none !important; } }');
    expect(css).toContain('.uw-main > .pages, .uw-main > .uw-compare { flex: 1 1 0; }');
  });

  it('a largura do painel sai da largura útil das páginas e avisa com uw-side-resize', () => {
    const seen: { start: number; end: number }[] = [];
    ed.addEventListener('uw-side-resize', (e) => seen.push((e as CustomEvent<{ start: number; end: number }>).detail));
    panel();
    Object.defineProperty(wrapper('side'), 'offsetWidth', { value: 320, configurable: true });
    (ed as unknown as { measureSides(): void }).measureSides();
    expect(wrapper('side').hasAttribute('data-empty')).toBe(false);
    expect(wrapper('side-start').hasAttribute('data-empty')).toBe(true);
    expect(ed.sidePanelWidths()).toEqual({ start: 0, end: 320 });
    expect(seen).toEqual([{ start: 0, end: 320 }]);
    Object.defineProperty(wrapper('side'), 'offsetWidth', { value: 0, configurable: true });
    (ed as unknown as { measureSides(): void }).measureSides();
    expect(wrapper('side').hasAttribute('data-empty')).toBe(true);
    expect(seen.at(-1)).toEqual({ start: 0, end: 0 });
  });
});

describe('eventos do painel são do hospedeiro', () => {
  it('isSidePanelEvent: verdadeiro dentro do slot (side e side-start), falso nas páginas', () => {
    const p = panel(), q = panel('side-start');
    const inside = document.createElement('button');
    p.appendChild(inside);
    let got: boolean[] = [];
    ed.addEventListener('ping', (e) => got.push(ed.isSidePanelEvent(e)));
    inside.dispatchEvent(new Event('ping', { bubbles: true, composed: true }));
    q.dispatchEvent(new Event('ping', { bubbles: true, composed: true }));
    shadow().querySelector('.pages')!.dispatchEvent(new Event('ping', { bubbles: true, composed: true }));
    expect(got).toEqual([true, true, false]);
    got = [];
  });

  it('atalho da barra (Ctrl+] aumentar fonte) não roda com o foco num elemento do painel; nas páginas roda', async () => {
    ed.setAttribute('topbar', '');
    await settleChrome();
    const box = document.createElement('div');
    box.tabIndex = 0;
    panel().appendChild(box);
    const inPanel = key(']', 'BracketRight', { ctrlKey: true });
    box.dispatchEvent(inPanel);
    expect(inPanel.defaultPrevented).toBe(false);
    const onPages = key(']', 'BracketRight', { ctrlKey: true });
    shadow().querySelector('.pages')!.dispatchEvent(onPages);
    expect(onPages.defaultPrevented).toBe(true);
  });

  it('atalhos de app (Ctrl+F localizar) continuam valendo no painel, como num campo da barra', async () => {
    ed.setAttribute('topbar', '');
    await settleChrome();
    // (o painel de localizar mede a área do documento)
    vi.stubGlobal('DOMRect', class {
      constructor(readonly x = 0, readonly y = 0, readonly width = 0, readonly height = 0) {}
      get left(): number { return this.x; } get top(): number { return this.y; }
      get right(): number { return this.x + this.width; } get bottom(): number { return this.y + this.height; }
    });
    const box = document.createElement('div');
    panel().appendChild(box);
    const find = key('f', 'KeyF', { ctrlKey: true });
    box.dispatchEvent(find);
    expect(find.defaultPrevented).toBe(true);
  });

  it('Modo de Leitura: setas/espaço e roda dentro do painel não viram página', () => {
    ed.setView('read');
    const box = panel();
    const space = key(' ', 'Space');
    box.dispatchEvent(space);
    expect(space.defaultPrevented).toBe(false);
    const wheel = Object.assign(new Event('wheel', { bubbles: true, cancelable: true, composed: true }), { deltaY: 120, ctrlKey: false });
    box.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
    // nas páginas, a roda avança o bloco (o editor consome)
    const pagesWheel = Object.assign(new Event('wheel', { bubbles: true, cancelable: true, composed: true }), { deltaY: 120, ctrlKey: false });
    shadow().querySelector('.pages')!.dispatchEvent(pagesWheel);
    expect(pagesWheel.defaultPrevented).toBe(true);
  });

  it('clique no painel não tira o foco do campo do hospedeiro (o editor não puxa o foco para o documento)', () => {
    const input = document.createElement('input');
    panel().appendChild(input);
    input.focus();
    const md = mouseEvent('mousedown', { clientX: 10, clientY: 10 });
    input.dispatchEvent(md);
    expect(dom.document.activeElement).toBe(input as unknown as FakeNode);
    expect(md.defaultPrevented).toBe(false);
  });

  it('arquivo solto no painel é do hospedeiro: sem uw-file-drop e sem preventDefault', () => {
    const drops: Event[] = [];
    ed.addEventListener('uw-file-drop', (e) => drops.push(e));
    const box = panel();
    const dt = { types: ['Files'], files: [] as File[], dropEffect: 'none' };
    const over = Object.assign(new Event('dragover', { bubbles: true, cancelable: true, composed: true }), { dataTransfer: dt });
    box.dispatchEvent(over);
    expect(over.defaultPrevented).toBe(false);
    const drop = Object.assign(new Event('drop', { bubbles: true, cancelable: true, composed: true }), { dataTransfer: dt });
    box.dispatchEvent(drop);
    expect(drop.defaultPrevented).toBe(false);
    expect(drops).toHaveLength(0);
  });
});

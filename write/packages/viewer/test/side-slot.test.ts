/**
 * Painéis laterais do hospedeiro no <universal-document-viewer> (slot="side" /
 * slot="side-start"): light DOM ao lado da área das páginas (com a barra de
 * controles dela), fora dos ouvintes de teclado/roda do viewer e fora da tela
 * cheia e da impressão. Elemento de verdade sobre o DOM falso (write/test-support).
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../test-support/fake-dom.js';
import { installColorSchemeEnv } from '../../../test-support/color-scheme-env.js';
import type { UniversalDocumentViewerElement as Viewer } from '../src/universal-document-viewer.js';

let dom: FakeDom;
let Ctor: typeof Viewer;
let dv: Viewer;

beforeAll(async () => {
  dom = installFakeDom();
  Ctor = (await import('../src/universal-document-viewer.js')).UniversalDocumentViewerElement;
}, 60_000);
afterAll(() => vi.unstubAllGlobals());

beforeEach(() => {
  installColorSchemeEnv();
  dv = new Ctor();
  dom.document.body.appendChild(dv as unknown as FakeNode);
});
afterEach(() => { (dv as unknown as FakeNode).remove(); });

const root = (): ShadowRoot => (dv as unknown as { shadowRoot: ShadowRoot }).shadowRoot;

describe('slots side / side-start', () => {
  it('a área do viewer fica entre os dois painéis; cada envoltório tem o slot e o part', () => {
    const shell = root().querySelector<HTMLElement>('.udv-shell')!;
    expect(shell).not.toBeNull();
    const kids = [...shell.children] as HTMLElement[];
    expect(kids.map((k) => k.className)).toEqual(['udv-side', 'udv-wrap', 'udv-side']);
    expect(kids.map((k) => k.getAttribute('part'))).toEqual(['side-start', 'viewer', 'side']);
    expect(kids[0]!.querySelector('slot')!.getAttribute('name')).toBe('side-start');
    expect(kids[2]!.querySelector('slot')!.getAttribute('name')).toBe('side');
    // a barra de controles continua dentro da área das páginas (não cobre o painel)
    expect(kids[1]!.querySelector('.uoc-ui')).not.toBeNull();
    expect(kids[2]!.querySelector('.uoc-ui')).toBeNull();
  });

  it('o CSS: a área das páginas é flexível (encolhe e recentraliza), o painel rola sozinho e sai da impressão', () => {
    const css = root().querySelector('style')!.textContent!;
    expect(css).toContain('.udv-shell > .udv-wrap { flex: 1 1 0; min-width: 0; width: auto; }');
    expect(css).toContain('overflow: auto; overscroll-behavior: contain');
    expect(css).toContain('@media print { .udv-side { display: none !important; } }');
  });

  it('teclas e roda no painel não chegam aos ouvintes do viewer (nem viram página no Modo de Leitura)', () => {
    dv.setAttribute('view', 'read');
    const panel = document.createElement('div');
    panel.setAttribute('slot', 'side');
    dv.appendChild(panel);
    const path: EventTarget[] = [];
    const wheel = Object.assign(new Event('wheel', { bubbles: true, cancelable: true, composed: true }), { deltaY: 120, ctrlKey: false });
    panel.addEventListener('wheel', (e) => path.push(...e.composedPath()));
    panel.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
    const wrap = root().querySelector('.udv-wrap')!;
    const side = root().querySelector('.udv-side[data-side="side"]') ?? [...root().querySelectorAll('.udv-side')].at(-1)!;
    expect(path).toContain(side);
    expect(path).not.toContain(wrap);
    const space = Object.assign(new Event('keydown', { bubbles: true, cancelable: true, composed: true }), { key: ' ', code: 'Space' });
    panel.dispatchEvent(space);
    expect(space.defaultPrevented).toBe(false);
  });
});

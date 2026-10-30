/**
 * Claro/escuro do <universal-document-viewer>: segue o `color-scheme` do
 * CONTEXTO (herdado pelo host, sem olhar classes), reage em tempo real (sonda +
 * matchMedia), `theme="light|dark"` força, a desconexão desliga tudo; e o fundo
 * único (`--udv-background`) com as variáveis antigas como alias.
 * Elemento de verdade sobre o DOM falso (write/test-support).
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../test-support/fake-dom.js';
import { installColorSchemeEnv, type ColorSchemeEnv } from '../../../test-support/color-scheme-env.js';
import type { UniversalDocumentViewerElement as Viewer } from '../src/universal-document-viewer.js';

let dom: FakeDom;
let env: ColorSchemeEnv;
let Ctor: typeof Viewer;
let dv: Viewer;
let changes: string[];

beforeAll(async () => {
  dom = installFakeDom();
  Ctor = (await import('../src/universal-document-viewer.js')).UniversalDocumentViewerElement;
}, 60_000);
afterAll(() => vi.unstubAllGlobals());

beforeEach(() => {
  env = installColorSchemeEnv();
  dv = new Ctor();
  changes = [];
  dv.addEventListener('udv-theme-change', (e) => changes.push((e as CustomEvent<{ theme: string }>).detail.theme));
});
afterEach(() => { (dv as unknown as FakeNode).remove(); });

const connect = (): void => { dom.document.body.appendChild(dv as unknown as FakeNode); };
const root = (): ShadowRoot => (dv as unknown as { shadowRoot: ShadowRoot }).shadowRoot;
const forced = (): string | null => root().querySelector('style[data-uo-scheme]')?.textContent ?? null;

describe('tema automático pelo color-scheme do contexto', () => {
  it('normal = claro; contexto escuro → escuro em tempo real; e volta', () => {
    connect();
    expect(dv.effectiveTheme).toBe('light');
    env.context = 'dark';
    env.settle(dv as unknown as Element);
    expect(dv.effectiveTheme).toBe('dark');
    env.context = 'light';
    env.settle(dv as unknown as Element);
    expect(dv.effectiveTheme).toBe('light');
    expect(changes).toEqual(['dark', 'light']);
  });

  it('`light dark` segue o SO (change do matchMedia)', () => {
    env.context = 'light dark';
    connect();
    expect(dv.effectiveTheme).toBe('light');
    env.setOsDark(true);
    expect(dv.effectiveTheme).toBe('dark');
    expect(changes).toEqual(['dark']);
    env.setOsDark(false);
  });
});

describe('atributo theme', () => {
  it('força claro/escuro sobre o contexto; auto/ausente herda', () => {
    env.context = 'dark';
    dv.setAttribute('theme', 'light');
    connect();
    expect(forced()).toContain('color-scheme: light');
    expect(dv.effectiveTheme).toBe('light');
    dv.setAttribute('theme', 'dark');
    expect(dv.effectiveTheme).toBe('dark');
    env.context = 'light';
    dv.removeAttribute('theme');
    expect(forced()).toBeNull();
    expect(dv.effectiveTheme).toBe('light');
    expect(changes).toEqual(['dark', 'light']);
  });

  it('theme definido antes de conectar já vale na conexão', () => {
    dv.setAttribute('theme', 'dark');
    expect(forced()).toContain('color-scheme: dark');
    connect();
    expect(dv.effectiveTheme).toBe('dark');
    expect(changes).toEqual([]);
  });
});

describe('desconexão', () => {
  it('tira a sonda e os ouvintes (matchMedia, ResizeObserver); nada mais avisa', () => {
    env.context = 'light dark';
    connect();
    expect(env.mqListeners).toBe(1);
    const ro = env.observers.find((o) => o.observed.includes(dv))!;
    const probe = root().querySelector('.uo-scheme-probe')!;
    (dv as unknown as FakeNode).remove();
    expect(env.mqListeners).toBe(0);
    expect(ro.disconnected).toBe(true);
    expect(root().querySelector('.uo-scheme-probe')).toBeNull();
    env.setOsDark(true);
    probe.dispatchEvent(new Event('transitionend'));
    expect(changes).toEqual([]);
    env.setOsDark(false);
  });
});

describe('fundo único', () => {
  it('mesa, painéis e barra usam --udv-background (alias --uo-background), padrão um token do @universal-material', () => {
    const css = root().querySelector('style')!.textContent!;
    expect(css).toContain('--udv-bg: var(--udv-background, var(--uo-background, var(--u-color-surface-container-low, light-dark(');
    expect(css).toMatch(/\.udv-wrap \{[^}]*background: var\(--udv-bg\)/);
    expect(css).toMatch(/\.udv-nav, \.udv-comments \{[^}]*background: var\(--udv-panel-bg, var\(--udv-bg\)\)/);
    expect(css).toContain('var(--udv-bg))'); // o degradê da barra de controles termina na mesma cor
    expect(css).not.toContain('rgba(20,20,20'); // o painel escuro fixo saiu
    expect(css).toMatch(/\.udv-page \{[^}]*background: #fff/); // a página continua branca
  });
});

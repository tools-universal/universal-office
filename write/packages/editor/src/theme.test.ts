// Claro/escuro do <universal-write>: segue o `color-scheme` do CONTEXTO (herdado
// pelo host — não procura classes `u-dark`/`u-light`), reage em tempo real pela
// sonda (transitionend) e pelo matchMedia, o atributo `theme` força e a
// desconexão desliga tudo. Elemento de verdade sobre o DOM falso.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../test-support/fake-dom.js';
import { installColorSchemeEnv, type ColorSchemeEnv } from '../../../test-support/color-scheme-env.js';
import type { UniversalWriteElement as Editor } from './universal-write.js';

let dom: FakeDom;
let env: ColorSchemeEnv;
let Ctor: typeof Editor;
let ed: Editor;
let changes: string[];

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  dom = installFakeDom();
  Ctor = (await import('./universal-write.js')).UniversalWriteElement;
}, 60_000);
afterAll(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  env = installColorSchemeEnv();
  ed = new Ctor();
  ed.setAttribute('manual-init', '');
  changes = [];
  ed.addEventListener('uw-theme-change', (e) => changes.push((e as CustomEvent<{ theme: string }>).detail.theme));
});
afterEach(() => {
  (ed as unknown as FakeNode).remove();
});

const connect = (): void => { dom.document.body.appendChild(ed as unknown as FakeNode); };
const root = (): ShadowRoot => (ed as unknown as { shadowRoot: ShadowRoot }).shadowRoot;
const forced = (): string | null => root().querySelector('style[data-uo-scheme]')?.textContent ?? null;

describe('tema automático pelo color-scheme do contexto', () => {
  it('sem color-scheme no contexto (normal) é claro; o contexto escurece → escuro em tempo real (sonda)', () => {
    connect();
    expect(ed.effectiveTheme).toBe('light');
    expect(forced()).toBeNull(); // auto: não impõe nada, herda
    expect(root().querySelector('.uo-scheme-probe')).not.toBeNull();

    env.context = 'dark'; // ex.: body.u-dark (color-scheme: dark !important)
    env.settle(ed as unknown as Element);
    expect(ed.effectiveTheme).toBe('dark');
    expect(changes).toEqual(['dark']);

    env.context = 'light'; // body.u-light
    env.settle(ed as unknown as Element);
    expect(ed.effectiveTheme).toBe('light');
    expect(changes).toEqual(['dark', 'light']);

    env.settle(ed as unknown as Element); // transição sem mudança: sem evento
    expect(changes).toEqual(['dark', 'light']);
  });

  it('já conectado num contexto escuro: lê escuro sem disparar evento (a 1ª leitura é silenciosa)', () => {
    env.context = 'dark';
    connect();
    expect(ed.effectiveTheme).toBe('dark');
    expect(changes).toEqual([]);
  });

  it('`light dark` (padrão do @universal-material) segue o SO, com a troca do SO em tempo real', () => {
    env.context = 'light dark';
    connect();
    expect(ed.effectiveTheme).toBe('light');
    env.setOsDark(true); // change do matchMedia
    expect(ed.effectiveTheme).toBe('dark');
    expect(changes).toEqual(['dark']);
    env.setOsDark(false);
    expect(ed.effectiveTheme).toBe('light');
    expect(changes).toEqual(['dark', 'light']);
  });

  it('não olha classes: `u-dark` no body sem color-scheme não muda nada', () => {
    connect();
    (dom.document.body as unknown as Element).classList.add('u-dark');
    env.settle(ed as unknown as Element);
    expect(ed.effectiveTheme).toBe('light');
    expect(changes).toEqual([]);
    (dom.document.body as unknown as Element).classList.remove('u-dark');
  });

  it('navegador sem light-dark(): cai no color-scheme computado do host', () => {
    env.noLightDark = true;
    env.context = 'dark';
    connect();
    expect(ed.effectiveTheme).toBe('dark');
    env.context = 'light dark';
    env.setOsDark(false);
    expect(ed.effectiveTheme).toBe('light');
  });
});

describe('atributo theme', () => {
  it('theme="dark" força o escuro num contexto claro; "light" força o claro num escuro; auto/ausente herda', () => {
    ed.setAttribute('theme', 'dark');
    connect();
    expect(forced()).toContain('color-scheme: dark');
    expect(ed.effectiveTheme).toBe('dark');

    env.context = 'dark';
    ed.setAttribute('theme', 'light');
    expect(forced()).toContain('color-scheme: light');
    expect(ed.effectiveTheme).toBe('light');
    expect(changes).toEqual(['light']);

    ed.setAttribute('theme', 'auto');
    expect(forced()).toBeNull();
    expect(ed.effectiveTheme).toBe('dark'); // herdou o contexto escuro
    ed.removeAttribute('theme');
    expect(forced()).toBeNull();
    expect(ed.effectiveTheme).toBe('dark');
    expect(changes).toEqual(['light', 'dark']);
  });

  it('`black` (Escuro total) também força o escuro; valor desconhecido herda', () => {
    ed.setAttribute('theme', 'black');
    connect();
    expect(ed.effectiveTheme).toBe('dark');
    ed.setAttribute('theme', 'sepia');
    expect(forced()).toBeNull();
    expect(ed.effectiveTheme).toBe('light');
  });

  it('a escolha do menu (setUiColorMode) força quando não há atributo; o atributo vence', () => {
    connect();
    ed.setUiColorMode('dark');
    expect(ed.effectiveTheme).toBe('dark');
    ed.setAttribute('theme', 'light');
    expect(ed.effectiveTheme).toBe('light');
    ed.removeAttribute('theme');
    expect(ed.effectiveTheme).toBe('dark');
    ed.setUiColorMode(null);
    expect(ed.effectiveTheme).toBe('light');
  });
});

describe('desconexão', () => {
  it('desliga a sonda, o matchMedia e o ResizeObserver; reconectar religa e relê', () => {
    env.context = 'light dark';
    connect();
    expect(env.mqListeners).toBe(1);
    const ro = env.observers.at(-1)!;
    expect(ro.observed).toContain(ed);
    const probe = root().querySelector('.uo-scheme-probe')!;

    (ed as unknown as FakeNode).remove();
    expect(env.mqListeners).toBe(0);
    expect(ro.disconnected).toBe(true);
    expect(root().querySelector('.uo-scheme-probe')).toBeNull();
    env.setOsDark(true);
    probe.dispatchEvent(new Event('transitionend'));
    expect(changes).toEqual([]); // nada escuta mais

    connect(); // reconectado num SO já escuro: relê e avisa a mudança
    expect(env.mqListeners).toBe(1);
    expect(ed.effectiveTheme).toBe('dark');
    expect(changes).toEqual(['dark']);
    env.setOsDark(false);
  });
});

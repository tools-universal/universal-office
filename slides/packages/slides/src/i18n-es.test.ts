// Interface em espanhol do <universal-slides>: com lang="es" (qualquer região)
// as barras saem em espanhol (compacta e ribbon) e TODO comando do registro tem
// o texto em espanhol. Elemento de verdade sobre o DOM falso.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../../write/test-support/fake-dom.js';
import { installColorSchemeEnv } from '../../../../write/test-support/color-scheme-env.js';
import type { CommandRegistry, Lbl } from '@universal-office/ui';
import type { UniversalSlidesElement as Slides } from './universal-slides.js';
import type { UniversalSlidesPlugin } from './plugins.js';

const SAMPLES = join(__dirname, '../../../samples');
const showcase = (): Uint8Array => new Uint8Array(readFileSync(join(SAMPLES, 'showcase_animado.pptx')));

let dom: FakeDom;
let Ctor: typeof Slides;
let el: Slides;

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  dom = installFakeDom();
  Ctor = (await import('./universal-slides.js')).UniversalSlidesElement;
  await import('./chrome.js');
}, 60_000);
afterAll(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  installColorSchemeEnv();
  el = new Ctor();
  el.setAttribute('lang', 'es-ES');
  dom.document.body.appendChild(el as unknown as FakeNode);
  el.openPresentation(showcase(), { name: 'Informe.pptx' });
});
afterEach(() => {
  (el as unknown as FakeNode).remove();
  vi.clearAllTimers();
});

async function settle(): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await vi.dynamicImportSettled();
    await Promise.resolve();
    vi.advanceTimersByTime(20);
  }
}

const root = (): ShadowRoot => (el as unknown as { shadowRoot: ShadowRoot }).shadowRoot;
const texts = (sel: string): string[] => [...root().querySelectorAll<HTMLElement>(sel)].map((e) => (e.textContent ?? '').trim());

function probe(out: { reg?: CommandRegistry }): UniversalSlidesPlugin {
  return {
    id: 'test.probe',
    toolbar: () => ({ compact: { trailing: [{ id: 'probe', widget: (ctx) => { out.reg = ctx.registry; return { el: document.createElement('span') }; } }] } }),
  };
}

function missingEs(reg: CommandRegistry): string[] {
  const bad: string[] = [];
  const check = (id: string, what: string, l: Lbl | undefined): void => {
    if (l === undefined || typeof l === 'string') return;
    if (typeof l.es !== 'string' || !l.es.trim()) bad.push(`${id}.${what}`);
  };
  for (const id of reg.ids()) {
    const c = reg.get(id)!;
    check(id, 'label', c.label);
    check(id, 'tip', c.tip);
  }
  return bad;
}

describe('lang="es": interface em espanhol', () => {
  it('barra compacta: menus do PowerPoint e comandos em espanhol; nenhum comando sem espanhol', async () => {
    const got: { reg?: CommandRegistry } = {};
    el.use(probe(got));
    el.setAttribute('topbar', '');
    await settle();
    expect(texts('.uo-mbtn')).toEqual(['Archivo', 'Editar', 'Vista', 'Insertar', 'Formato', 'Diapositiva', 'Presentación', 'Ayuda']);
    const reg = got.reg!;
    expect(reg.lang).toBe('es');
    expect(reg.label('bold')).toBe('Negrita');
    expect(reg.label('slide:new')).toBe('Nueva diapositiva');
    expect(reg.label('show:start')).toBe('Desde el principio');
    expect(reg.ids().length).toBeGreaterThan(80);
    expect(missingEs(reg)).toEqual([]);
  });

  it('ribbon: guias do PowerPoint em espanhol', async () => {
    el.setAttribute('toolbar', 'ribbon');
    el.setAttribute('topbar', '');
    await settle();
    expect(texts('.uo-tab')).toEqual(['Archivo', 'Inicio', 'Insertar', 'Diseño', 'Transiciones', 'Animaciones', 'Presentación con diapositivas', 'Vista', 'Formato de forma']);
    const groups = [...root().querySelectorAll<HTMLElement>('.uo-rgroup')].map((g) => g.getAttribute('aria-label'));
    expect(groups).toEqual(expect.arrayContaining(['Portapapeles', 'Diapositivas', 'Fuente', 'Párrafo', 'Dibujo', 'Edición']));
  });
});

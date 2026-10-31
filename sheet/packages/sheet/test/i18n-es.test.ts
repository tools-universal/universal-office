// Interface em espanhol do <universal-sheet>: com lang="es" (qualquer região)
// as barras saem em espanhol (compacta, ribbon, barra de fórmulas, guias e barra
// de status) e TODO comando do registro tem o texto em espanhol. As fórmulas
// continuam no idioma de `formula-locale` (não há tabela de nomes em espanhol).
// Elemento de verdade sobre o DOM falso.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../../write/test-support/fake-dom.js';
import type { CommandRegistry, Lbl } from '@universal-office/ui';
import type { UniversalSheetElement as Sheet } from '../src/universal-sheet.js';
import type { UniversalSheetPlugin } from '../src/plugins.js';

let dom: FakeDom;
let Ctor: typeof Sheet;
let el: Sheet;

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  dom = installFakeDom();
  dom.customElements.define('u-ripple', class extends (globalThis as unknown as { HTMLElement: typeof HTMLElement }).HTMLElement {});
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
  el.setAttribute('lang', 'es-MX');
  el.setAttribute('formula-locale', 'en-US');
  dom.document.body.appendChild(el as unknown as FakeNode);
  el.newWorkbook();
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
const top = (): HTMLElement => root().querySelector<HTMLElement>('.us-topbar')!;
const texts = (scope: HTMLElement, sel: string): string[] => [...scope.querySelectorAll<HTMLElement>(sel)].map((e) => (e.textContent ?? '').trim());

function probe(out: { reg?: CommandRegistry }): UniversalSheetPlugin {
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
  it('barra compacta: menus do Excel, título e comandos em espanhol; nenhum comando sem espanhol', async () => {
    const got: { reg?: CommandRegistry } = {};
    el.use(probe(got));
    el.setAttribute('topbar', '');
    await settle();
    expect(texts(top(), '.uo-mbtn')).toEqual(['Archivo', 'Editar', 'Vista', 'Insertar', 'Formato', 'Herramientas', 'Ayuda']);
    expect(top().querySelector<HTMLInputElement>('.uo-title')!.value).toBe('Libro1');
    const reg = got.reg!;
    expect(reg.lang).toBe('es');
    expect(reg.label('bold')).toBe('Negrita');
    expect(reg.label('undo')).toBe('Deshacer');
    expect(reg.label('autosum:sum')).toBe('Suma');
    expect(reg.label('autosum:average')).toBe('Promedio');
    expect(reg.ids().length).toBeGreaterThan(100);
    expect(missingEs(reg)).toEqual([]);
  });

  it('ribbon: guias do Excel em espanhol', async () => {
    el.setAttribute('toolbar', 'ribbon');
    el.setAttribute('topbar', '');
    await settle();
    expect(texts(top(), '.uo-tab')).toEqual(['Archivo', 'Inicio', 'Insertar', 'Fórmulas', 'Vista', 'Ayuda']);
    const groups = [...top().querySelectorAll<HTMLElement>('.uo-rgroup')].map((g) => g.getAttribute('aria-label'));
    expect(groups).toEqual(expect.arrayContaining(['Portapapeles', 'Fuente', 'Alineación', 'Número', 'Celdas', 'Edición']));
  });

  it('as fórmulas seguem formula-locale, não o idioma da interface', async () => {
    el.setAttribute('topbar', '');
    await settle();
    expect(el.formulaLocale).toBe('en-US');
  });
});

// Interface em espanhol: com lang="es" (qualquer região) as barras do
// <universal-write> saem em espanhol (compacta e ribbon), e TODO comando do
// registro tem o texto em espanhol — a tabela { en, pt, es } é obrigatória no
// tipo, e esta varredura pega o que escapar dele (rótulo montado em tempo de
// execução, plugin interno). Elemento de verdade sobre o DOM falso.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../test-support/fake-dom.js';
import { installColorSchemeEnv } from '../../../test-support/color-scheme-env.js';
import type { CommandRegistry, Lbl } from '@universal-office/ui';
import type { UniversalWriteElement as Editor } from './universal-write.js';
import type { UniversalWriteFontAsset, UniversalWritePlugin } from './plugins.js';

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
  ed.setAttribute('lang', 'es-419');
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

const topbar = (): HTMLElement => (ed as unknown as { shadowRoot: ShadowRoot }).shadowRoot.querySelector<HTMLElement>('.uw-topbar')!;
const texts = (sel: string): string[] => [...topbar().querySelectorAll<HTMLElement>(sel)].map((e) => (e.textContent ?? '').trim());

/** plugin que só captura o registro de comandos da barra */
function probe(out: { reg?: CommandRegistry }): UniversalWritePlugin {
  return {
    id: 'test.probe',
    toolbar: () => ({
      compact: { trailing: [{ id: 'probe', widget: (ctx) => { out.reg = ctx.registry; return { el: document.createElement('span') }; } }] },
    }),
  };
}

/** rótulos { en, pt, es } sem espanhol (ou com espanhol vazio) */
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
  it('barra compacta: menus e comandos em espanhol; nenhum comando sem espanhol', async () => {
    const got: { reg?: CommandRegistry } = {};
    ed.use(probe(got));
    ed.setAttribute('topbar', '');
    await settleChrome();
    const menus = texts('.uo-mbtn');
    expect(menus).toEqual(expect.arrayContaining(['Archivo', 'Editar', 'Ver', 'Insertar', 'Formato']));
    const reg = got.reg!;
    expect(reg.lang).toBe('es');
    expect(reg.label('bold')).toBe('Negrita');
    expect(reg.label('italic')).toBe('Cursiva');
    expect(reg.label('undo')).toBe('Deshacer');
    expect(reg.label('redo')).toBe('Rehacer');
    expect(reg.ids().length).toBeGreaterThan(300);
    expect(missingEs(reg)).toEqual([]);
  });

  it('ribbon: guias e grupos do Word em espanhol', async () => {
    ed.setAttribute('toolbar', 'ribbon');
    ed.setAttribute('topbar', '');
    await settleChrome();
    const tabs = texts('.uo-tab');
    expect(tabs).toEqual(expect.arrayContaining(['Archivo', 'Inicio', 'Insertar', 'Diseño', 'Disposición', 'Referencias', 'Revisar', 'Vista']));
    expect(new Set(tabs).size).toBe(tabs.length);
    expect([...topbar().querySelectorAll<HTMLElement>('.uo-rgroup')].map((g) => g.getAttribute('aria-label'))).toEqual(expect.arrayContaining(['Portapapeles', 'Párrafo', 'Estilos', 'Edición', 'Ilustraciones', 'Configurar página', 'Tabla de contenido', 'Notas al pie']));
  });

  it('lang="es-ES" e lang="es-MX" dão o mesmo espanhol; lang="en" volta ao inglês', async () => {
    const got: { reg?: CommandRegistry } = {};
    ed.use(probe(got));
    ed.setAttribute('lang', 'es-MX');
    ed.setAttribute('topbar', '');
    await settleChrome();
    expect(got.reg!.label('bold')).toBe('Negrita');
    ed.setAttribute('lang', 'en');
    await settleChrome();
    expect(got.reg!.label('bold')).toBe('Bold');
  });
});

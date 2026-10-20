// Ciclo de vida do estado de aplicativo das barras: montar/desmontar não deixa
// intervalo nem ouvintes em window/document (o elemento tem de poder ser
// coletado ao sair da página) e os opt-outs do hospedeiro valem.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WriteApp } from './chrome-app.js';
import { LABELS } from './chrome-labels.js';
import type { UniversalWriteElement } from './universal-write.js';

class FakeEl extends EventTarget {
  id = '';
  attrs = new Map<string, string>();
  host: unknown = null;
  getAttribute(n: string): string | null { return this.attrs.get(n) ?? null; }
  hasAttribute(n: string): boolean { return this.attrs.has(n); }
}

type Win = EventTarget & { setInterval: typeof setInterval; clearInterval: typeof clearInterval; setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout };
let win: Win;

beforeEach(() => {
  vi.useFakeTimers();
  win = Object.assign(new EventTarget(), {
    setInterval: vi.fn((fn: () => void, ms: number) => setInterval(fn, ms)),
    clearInterval: vi.fn((id: ReturnType<typeof setInterval>) => clearInterval(id)),
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
  }) as unknown as Win;
  (globalThis as { window?: unknown }).window = win;
});
afterEach(() => {
  vi.useRealTimers();
  delete (globalThis as { window?: unknown }).window;
});

const make = (): { el: FakeEl; app: WriteApp } => {
  const el = new FakeEl();
  const app = new WriteApp(el as unknown as UniversalWriteElement);
  app.ui = { L: LABELS.en, layer: {} as HTMLElement, flash: () => {}, sync: () => {}, protectedChanged: () => {}, pulseEnable: () => {} };
  return { el, app };
};
const unload = (): boolean => {
  const e = new Event('beforeunload', { cancelable: true });
  win.dispatchEvent(e);
  return e.defaultPrevented;
};

describe('WriteApp: montar/desmontar', () => {
  it('attach liga ouvintes e intervalo; detach tira todos', () => {
    const { el, app } = make();
    app.attach();
    app.attach(); // idempotente
    expect(win.setInterval).toHaveBeenCalledTimes(1);
    el.dispatchEvent(new Event('uw-change'));
    expect(app.dirty).toBe(true);
    expect(unload()).toBe(true);

    app.detach();
    const id = (win.setInterval as ReturnType<typeof vi.fn>).mock.results[0]!.value;
    expect(win.clearInterval).toHaveBeenCalledWith(id);
    expect(vi.getTimerCount()).toBe(0); // nem intervalo nem o timeout do autosave
    app.setDirty(false);
    el.dispatchEvent(new Event('uw-change'));
    expect(app.dirty).toBe(false); // ouvinte do elemento saiu
    app.setDirty(true);
    expect(unload()).toBe(false); // beforeunload saiu de window
    expect(app.ui).toBeNull();
  });

  it('remontar depois de desmontar volta a funcionar', () => {
    const { el, app } = make();
    app.attach();
    app.detach();
    app.ui = make().app.ui;
    app.attach();
    el.dispatchEvent(new Event('uw-change'));
    expect(app.dirty).toBe(true);
    app.detach();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('WriteApp: opt-outs do hospedeiro', () => {
  it('nounloadprompt desliga o aviso do navegador ao sair', () => {
    const { el, app } = make();
    el.attrs.set('nounloadprompt', '');
    app.attach();
    app.setDirty(true);
    expect(unload()).toBe(false);
    app.detach();
  });

  it('uw-save-request tratado pelo hospedeiro: a barra não salva e larga autosave/aviso', async () => {
    const { el, app } = make();
    app.attach();
    const seen: unknown[] = [];
    el.addEventListener('uw-save-request', (e) => { seen.push((e as CustomEvent).detail); e.preventDefault(); });
    expect(await app.save(true)).toBe(true);
    expect(seen).toEqual([{ saveAs: true, format: 'docx' }]);
    expect(app.hostOwnsSave).toBe(true);
    expect(app.autosaveEnabled).toBe(false);
    app.setDirty(true);
    expect(unload()).toBe(false);
    app.detach();
  });

  it('noautosave desliga o salvamento automático', () => {
    const { el, app } = make();
    el.attrs.set('noautosave', '');
    expect(app.autosaveEnabled).toBe(false);
  });

  it('tema: só com o atributo `theme` ou a escolha explícita', () => {
    const { el, app } = make();
    expect(app.mode).toBeNull();
    el.attrs.set('theme', 'dark');
    expect(app.mode).toBe('dark');
    el.attrs.delete('theme');
    app.chosenMode = 'light';
    expect(app.mode).toBe('light');
  });
});

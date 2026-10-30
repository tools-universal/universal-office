// Registro global de plugins do <universal-write> (register/unregister, como o
// Quill.register) e as guardas de carga dupla: customElements.define e u-ripple.
// Elemento de verdade sobre o DOM falso (write/test-support).
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../test-support/fake-dom.js';
import type { UniversalWriteElement as Editor } from './universal-write.js';
import type { UniversalWritePlugin } from './plugins.js';

let dom: FakeDom;
let Ctor: typeof Editor;
const live: Editor[] = [];

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
afterEach(() => {
  for (const el of live.splice(0)) (el as unknown as FakeNode).remove();
  for (const id of ['acme.a', 'acme.b', 'acme.c']) Ctor.unregister(id);
});

/** Editor conectado (sem inicializar fontes/documento). */
const connected = (): Editor => {
  const el = new Ctor();
  el.setAttribute('manual-init', '');
  dom.document.body.appendChild(el as unknown as FakeNode);
  live.push(el);
  return el;
};

const plugin = (id: string, inline?: string, setup?: UniversalWritePlugin['setup']): UniversalWritePlugin => ({
  id,
  ...(inline ? { inlineRenderers: [{ type: inline, toText: () => inline }] } : {}),
  ...(setup ? { setup } : {}),
});

describe('UniversalWriteElement.register / unregister', () => {
  it('instância já conectada recebe na hora; instância nova recebe ao conectar; unregister tira das duas', () => {
    const a = connected();
    const added = vi.fn();
    a.addEventListener('uw-plugin-added', added);
    const cleanup = vi.fn();
    const p = plugin('acme.a', 'acme.mark', () => cleanup);

    Ctor.register(p);
    expect(a.pluginIds()).toEqual(['acme.a']);
    expect(added).toHaveBeenCalledTimes(1);

    const b = connected();
    expect(b.pluginIds()).toEqual(['acme.a']);

    expect(Ctor.unregister('acme.a')).toBe(true);
    expect(a.pluginIds()).toEqual([]);
    expect(b.pluginIds()).toEqual([]);
    expect(cleanup).toHaveBeenCalledTimes(2);
    expect(Ctor.unregister('acme.a')).toBe(false);
  });

  it('não mexe no plugin que o hospedeiro instalou com use() (mesmo id)', () => {
    const a = connected();
    const own = plugin('acme.a');
    a.use(own);
    Ctor.register(plugin('acme.a'));
    expect(a.pluginIds()).toEqual(['acme.a']);
    Ctor.unregister('acme.a');
    expect(a.pluginIds()).toEqual(['acme.a']); // o do hospedeiro continua
  });

  it('registrar outro plugin com o mesmo id troca o anterior', () => {
    const a = connected();
    const first = plugin('acme.a', 'acme.one');
    const second = plugin('acme.a', 'acme.two');
    Ctor.register(first);
    Ctor.register(second);
    expect(a.pluginIds()).toEqual(['acme.a']);
    // o tipo de inline do primeiro saiu com ele: outro plugin pode usá-lo
    expect(() => a.use(plugin('acme.b', 'acme.one'))).not.toThrow();
  });

  it('conflito numa instância vira aviso: não lança no register nem interrompe a conexão', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const a = connected();
      a.use(plugin('acme.b', 'acme.mark')); // o tipo já é de outro plugin nesta instância
      expect(() => Ctor.register(plugin('acme.a', 'acme.mark'))).not.toThrow();
      expect(a.pluginIds()).toEqual(['acme.b']);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"acme.a"'), expect.any(Error));

      // instância nova sem conflito recebe; o connectedCallback segue (fontes, idioma…)
      const b = connected();
      expect(b.pluginIds()).toEqual(['acme.a']);
      // setup que lança no connect: aviso, e o elemento conecta mesmo assim
      Ctor.register(plugin('acme.c', undefined, () => { throw new Error('boom'); }));
      const c = connected();
      expect(c.isConnected).toBe(true);
      expect(c.pluginIds()).toEqual(['acme.a']);
    } finally {
      warn.mockRestore();
    }
  });

  it('instância desconectada no unregister perde o plugin ao reconectar', () => {
    const a = connected();
    Ctor.register(plugin('acme.a'));
    (a as unknown as FakeNode).remove();
    Ctor.unregister('acme.a');
    expect(a.pluginIds()).toEqual(['acme.a']); // fora do documento: não é tocada
    dom.document.body.appendChild(a as unknown as FakeNode);
    expect(a.pluginIds()).toEqual([]);
  });
});

describe('carga dupla do módulo', () => {
  it('importar universal-write duas vezes não lança (customElements.define com guarda)', async () => {
    const calls = dom.customElements.define.mock.calls.filter(([name]) => name === 'universal-write').length;
    expect(calls).toBe(1);
    vi.resetModules();
    const again = await import('./universal-write.js');
    expect(again.UniversalWriteElement).not.toBe(Ctor); // outra avaliação do módulo
    expect(dom.customElements.define.mock.calls.filter(([name]) => name === 'universal-write')).toHaveLength(1);
    expect(dom.customElements.get('universal-write')).toBe(Ctor);
  }, 60_000);

  // (nesta ordem: o módulo do ripple fica em cache depois da 1ª importação)
  it('as barras não registram u-ripple de novo quando o hospedeiro já registrou', async () => {
    class HostRipple {}
    vi.resetModules();
    const fresh = installFakeDom({ defined: { 'u-ripple': HostRipple as unknown as CustomElementConstructor } });
    await import('./chrome.js');
    expect(fresh.customElements.define.mock.calls.map(([name]) => name)).not.toContain('u-ripple');
    expect(fresh.customElements.get('u-ripple')).toBe(HostRipple);
  }, 60_000); // (importa as barras inteiras)

  it('as barras registram u-ripple quando ninguém registrou', async () => {
    vi.resetModules();
    const fresh = installFakeDom();
    await import('./chrome.js');
    expect(fresh.customElements.define.mock.calls.map(([name]) => name)).toContain('u-ripple');
  }, 60_000);
});

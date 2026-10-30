import { afterEach, describe, expect, it, vi } from 'vitest';
import { PluginRegistry } from './plugin-registry';

type P = { id: string; boom?: boolean };

/** Instância mínima: o que o elemento faz no use/unuse. */
class Host {
  readonly plugins = new Map<string, P>();
  use(p: P): void {
    if (p.boom) throw new Error(`conflito: ${p.id}`);
    if (this.plugins.has(p.id)) throw new Error(`plugin already installed: ${p.id}`);
    this.plugins.set(p.id, p);
  }
  unuse(id: string): void { this.plugins.delete(id); }
  ids(): string[] { return [...this.plugins.keys()]; }
}

const make = () => new PluginRegistry<P, Host>({
  name: 'teste',
  install: (h, p) => { if (h.plugins.has(p.id)) return false; h.use(p); return true; },
  uninstall: (h, p) => { if (h.plugins.get(p.id) === p) h.unuse(p.id); },
});

afterEach(() => vi.restoreAllMocks());

describe('PluginRegistry', () => {
  it('conectadas recebem no register; novas ao conectar; unregister tira de todas', () => {
    const reg = make();
    const a = new Host();
    reg.connect(a);
    reg.register({ id: 'x' });
    expect(a.ids()).toEqual(['x']);
    const b = new Host();
    reg.connect(b);
    expect(b.ids()).toEqual(['x']);
    expect(reg.list().map((p) => p.id)).toEqual(['x']);
    expect(reg.unregister('x')).toBe(true);
    expect([a.ids(), b.ids()]).toEqual([[], []]);
    expect(reg.unregister('x')).toBe(false);
  });

  it('não tira o plugin que a instância instalou por conta própria', () => {
    const reg = make();
    const a = new Host();
    const own = { id: 'x' };
    a.use(own);
    reg.connect(a);
    reg.register({ id: 'x' });
    reg.unregister('x');
    expect(a.plugins.get('x')).toBe(own);
  });

  it('register com o mesmo id troca o plugin nas instâncias', () => {
    const reg = make();
    const a = new Host();
    reg.connect(a);
    const v1 = { id: 'x' }, v2 = { id: 'x' };
    reg.register(v1);
    reg.register(v2);
    expect(a.plugins.get('x')).toBe(v2);
  });

  it('falha numa instância vira aviso e não impede as outras nem lança', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const reg = make();
    const a = new Host(), b = new Host();
    reg.connect(a);
    reg.connect(b);
    a.plugins.set('outro', { id: 'outro' });
    expect(() => reg.register({ id: 'y', boom: true })).not.toThrow();
    expect(() => reg.connect(new Host())).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(3);
    expect(String(warn.mock.calls[0]![0])).toContain('[teste] plugin "y"');
    reg.register({ id: 'z' });
    expect(a.ids()).toEqual(['outro', 'z']);
    expect(b.ids()).toEqual(['z']);
  });

  it('desconectada: fica como está; ao reconectar, sincroniza com o registro', () => {
    const reg = make();
    const a = new Host();
    reg.connect(a);
    reg.register({ id: 'x' });
    reg.disconnect(a);
    reg.unregister('x');
    reg.register({ id: 'w' });
    expect(a.ids()).toEqual(['x']);
    reg.connect(a);
    expect(a.ids()).toEqual(['w']);
  });
});

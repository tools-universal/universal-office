/**
 * Registro GLOBAL de plugins de um web component (o `Quill.register`): os
 * plugins registrados valem para todas as instâncias — as conectadas os recebem
 * na hora e as próximas ao conectar. O elemento continua dono da instalação por
 * instância (`use`/`unuse`); o registro só decide QUANDO instalar e tirar, e
 * lembra o que ele mesmo instalou em cada instância (o que o hospedeiro
 * instalou com `use` não é tocado).
 *
 * Falha ao instalar ou tirar numa instância (ex.: dois plugins com o mesmo tipo
 * de inline) vira aviso no console: não interrompe a conexão do elemento nem
 * as outras instâncias.
 */
export interface PluginRegistryHooks<P extends { id: string }, H> {
  /** nome do componente nos avisos (ex.: 'universal-write') */
  name: string;
  /** instala o plugin na instância; false = a instância já tem um plugin com esse id */
  install(host: H, plugin: P): boolean;
  /** tira da instância o plugin que o registro instalou (se ainda for ele) */
  uninstall(host: H, plugin: P): void;
}

export class PluginRegistry<P extends { id: string }, H extends object> {
  private readonly plugins = new Map<string, P>();
  private readonly connected = new Set<H>();
  /** o que o registro instalou em cada instância (inclusive desconectadas) */
  private readonly installed = new WeakMap<H, Map<string, P>>();

  constructor(private readonly hooks: PluginRegistryHooks<P, H>) {}

  /** Registra (ou troca, pelo id) e instala nas instâncias conectadas. */
  register(plugin: P): void {
    this.plugins.set(plugin.id, plugin);
    for (const host of this.connected) this.sync(host);
  }

  /** Tira do registro e das instâncias conectadas que o receberam por ele. */
  unregister(id: string): boolean {
    if (!this.plugins.delete(id)) return false;
    for (const host of this.connected) this.sync(host);
    return true;
  }

  /** Plugins registrados, na ordem de registro. */
  list(): P[] { return [...this.plugins.values()]; }

  /** A instância entrou no documento: recebe os registrados (e perde os que
   *  saíram do registro enquanto estava fora). */
  connect(host: H): void {
    this.connected.add(host);
    this.sync(host);
  }

  disconnect(host: H): void {
    this.connected.delete(host);
  }

  private sync(host: H): void {
    let mine = this.installed.get(host);
    if (!mine) this.installed.set(host, (mine = new Map()));
    for (const [id, plugin] of [...mine]) {
      if (this.plugins.get(id) === plugin) continue;
      mine.delete(id);
      this.attempt('uninstall', plugin, () => this.hooks.uninstall(host, plugin));
    }
    for (const plugin of this.plugins.values()) {
      if (mine.has(plugin.id)) continue;
      if (this.attempt('install', plugin, () => this.hooks.install(host, plugin))) mine.set(plugin.id, plugin);
    }
  }

  private attempt(what: 'install' | 'uninstall', plugin: P, fn: () => boolean | void): boolean {
    try {
      return fn() !== false;
    } catch (e) {
      console.warn(`[${this.hooks.name}] plugin "${plugin.id}": ${what === 'install' ? 'instalação' : 'remoção'} falhou`, e);
      return false;
    }
  }
}

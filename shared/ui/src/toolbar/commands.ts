// Registro de comandos: a fonte única de rótulo, ícone, atalho e estado que
// botões, menus, menu de contexto e ribbon consultam. Comando sem suporte
// (`supports()` falso — a API do app ainda não existe) some de todos.
import { pickLabels, type UiLang } from '../i18n.js';
import type { Command, Lbl, MenuEntry, MenuItem } from './types.js';

export class CommandRegistry {
  private readonly cmds = new Map<string, Command>();
  /** ids ocultos pelo hospedeiro (comandos, itens de menu, grupos, guias…) */
  private readonly hidden = new Set<string>();

  constructor(readonly lang: UiLang) {}

  /** Oculta ids em tudo: barra, menus, menu de contexto e atalhos. */
  hide(ids: Iterable<string>): this {
    for (const id of ids) this.hidden.add(id);
    return this;
  }

  unhide(ids: Iterable<string>): this {
    for (const id of ids) this.hidden.delete(id);
    return this;
  }

  isHidden(id: string): boolean { return this.hidden.has(id); }

  hiddenIds(): string[] { return [...this.hidden]; }

  add(...cmds: Command[]): this {
    for (const c of cmds) this.cmds.set(c.id, c);
    return this;
  }

  get(id: string): Command | undefined { return this.cmds.get(id); }

  ids(): string[] { return [...this.cmds.keys()]; }

  /** Texto de um rótulo no idioma da interface. */
  text(l: Lbl | undefined): string {
    if (l === undefined) return '';
    return typeof l === 'string' ? l : pickLabels(this.lang, l);
  }

  label(id: string): string { return this.text(this.cmds.get(id)?.label); }

  /** Tooltip: dica (ou rótulo) + atalho. */
  tooltip(id: string): string {
    const c = this.cmds.get(id);
    if (!c) return '';
    const t = this.text(c.tip ?? c.label);
    return c.shortcut ? `${t} (${c.shortcut})` : t;
  }

  supported(id: string): boolean {
    const c = this.cmds.get(id);
    if (!c || this.hidden.has(id)) return false;
    try { return c.supports?.() ?? true; } catch { return false; }
  }

  enabled(id: string): boolean {
    const c = this.cmds.get(id);
    if (!c || !this.supported(id)) return false;
    try { return c.isEnabled?.() ?? true; } catch { return false; }
  }

  checked(id: string): boolean {
    const c = this.cmds.get(id);
    try { return !!c?.isChecked?.(); } catch { return false; }
  }

  /** Chamado depois de cada comando (e de novo quando um comando assíncrono termina). */
  afterRun: ((id: string) => void) | null = null;

  /** Executa (se existe, é suportado e está habilitado). */
  run(id: string): unknown {
    if (!this.enabled(id)) return undefined;
    const r = this.cmds.get(id)!.run();
    this.afterRun?.(id);
    if (r instanceof Promise) void r.finally(() => this.afterRun?.(id)).catch(() => {});
    return r;
  }

  /** Item de menu do comando; null quando não suportado. */
  menuItem(id: string): MenuItem | null {
    const c = this.cmds.get(id);
    if (!c || !this.supported(id)) return null;
    return {
      id,
      icon: c.icon,
      label: this.text(c.label),
      shortcut: c.shortcut,
      checked: c.isChecked ? this.checked(id) : undefined,
      disabled: !this.enabled(id),
      onClick: () => { void this.run(id); },
    };
  }

  /**
   * Resolve entradas declarativas: ids viram itens, '-' vira separador,
   * ocultos e não suportados saem, separadores repetidos/nas pontas somem e
   * submenus sem nenhum item visível também.
   */
  resolve(entries: readonly MenuEntry[]): MenuItem[] {
    const out: MenuItem[] = [];
    for (const e of entries) {
      let it: MenuItem | null;
      if (typeof e === 'string') it = e === '-' ? { sep: true } : this.menuItem(e);
      else it = e.hidden || (e.id !== undefined && this.hidden.has(e.id)) ? null : e;
      if (!it) continue;
      if (it.submenu && !it.content) {
        const sub = typeof it.submenu === 'function' ? it.submenu() : it.submenu;
        const resolved = this.resolve(sub);
        if (!resolved.some((s) => !s.sep)) continue;
        it = { ...it, submenu: resolved };
      }
      if (it.sep && (out.length === 0 || out[out.length - 1]!.sep)) continue;
      out.push(it);
    }
    while (out.length && out[out.length - 1]!.sep) out.pop();
    return out;
  }
}

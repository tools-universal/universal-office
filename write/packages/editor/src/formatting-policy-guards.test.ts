// Coerência da política de formatação com o elemento e as barras: toda guarda de
// POLICY_GUARDS embrulha um método que existe no <universal-write> (guarda com
// nome errado não protege nada) e todo id que a política oculta existe no
// registro de comandos ou na estrutura das barras (id errado não oculta nada).
// Elemento de verdade sobre o DOM falso.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../test-support/fake-dom.js';
import { installColorSchemeEnv } from '../../../test-support/color-scheme-env.js';
import { CommandRegistry, barItemId, type BarGroup, type BarItem, type CompactConfig, type MenuSource, type RibbonCell, type RibbonConfig } from '@universal-office/ui';
import type { UniversalWriteElement as Editor } from './universal-write.js';
import type { UniversalWriteFontAsset } from './plugins.js';
import { POLICY_GUARDS, TEMPLATE_DOCUMENT_POLICY, policyHiddenIds, resolvePolicy } from './formatting-policy.js';

// as estruturas das barras ANTES de tirar os ids ocultos, para conferir os ids
const layouts = vi.hoisted(() => ({ compact: [] as unknown[], ribbon: [] as unknown[] }));
vi.mock('@universal-office/ui', async (importOriginal) => {
  const ui = await importOriginal<typeof import('@universal-office/ui')>();
  return {
    ...ui,
    hideInCompact: (...a: Parameters<typeof ui.hideInCompact>) => { layouts.compact.push(a[0]); return ui.hideInCompact(...a); },
    hideInRibbon: (...a: Parameters<typeof ui.hideInRibbon>) => { layouts.ribbon.push(a[0]); return ui.hideInRibbon(...a); },
  };
});

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
  ed.setAttribute('lang', 'pt');
  ed.hiddenCommands = ['style:combo', 'font:family', 'font:size', 'tools', 'save'];
  dom.document.body.appendChild(ed as unknown as FakeNode);
  await ed.initialize({ fonts: FONT_ASSETS });
});
afterEach(() => {
  (ed as unknown as FakeNode).remove();
  vi.restoreAllMocks();
  vi.clearAllTimers();
});

async function settleChrome(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await vi.dynamicImportSettled();
    await Promise.resolve();
    vi.advanceTimersByTime(20);
  }
}

describe('POLICY_GUARDS', () => {
  it('cada guarda é um método do elemento', () => {
    const proto = Ctor.prototype as unknown as Record<string, unknown>;
    const missing = Object.keys(POLICY_GUARDS).filter((m) => typeof proto[m] !== 'function');
    expect(missing).toEqual([]);
  });

  it('cada método guardado passa pela guarda (o instalador pula, calado, o que não existe)', () => {
    const proto = Ctor.prototype as unknown as Record<string, { name: string }>;
    const unguarded = Object.keys(POLICY_GUARDS).filter((m) => proto[m]?.name !== 'guarded');
    expect(unguarded).toEqual([]);
  });
});

/** ids declarados nas estruturas das barras: menus, grupos, guias, itens e entradas de menu. */
function layoutIds(cfg: CompactConfig | RibbonConfig, reg: CommandRegistry): Set<string> {
  const out = new Set<string>();
  const seen = new Set<unknown>();
  const menu = (src: MenuSource | undefined): void => {
    if (!src) return;
    let entries;
    try { entries = typeof src === 'function' ? src() : src; } catch { return; }
    if (seen.has(entries)) return;
    seen.add(entries);
    for (const e of entries) {
      if (typeof e === 'string') { out.add(e); continue; }
      if (e.id) out.add(e.id);
      if (e.submenu) menu(e.submenu as MenuSource);
    }
  };
  const item = (it: BarItem): void => {
    const id = barItemId(it);
    if (id) out.add(id);
    if (typeof it === 'object' && 'menu' in it) menu(it.menu);
  };
  const cell = (c: RibbonCell): void => {
    if (typeof c === 'object' && 'rows' in c) for (const r of c.rows) r.forEach(item);
    else item(c);
  };
  const group = (g: BarGroup): void => {
    out.add(g.id);
    if (g.launcher) out.add(g.launcher);
    g.items?.forEach(item);
    g.cells?.forEach(cell);
  };
  if ('menus' in cfg) {
    for (const m of cfg.menus) { out.add(m.id); menu(m.items); }
    cfg.groups.forEach(group);
  } else {
    for (const t of cfg.tabs) { out.add(t.id); menu(t.menu); t.groups.forEach(group); }
    cfg.qat?.forEach(item);
  }
  cfg.trailing?.forEach(item);
  for (const id of reg.ids()) out.add(id);
  return out;
}

/** ids de entradas montadas na hora (menus de contexto, galerias, painéis, diálogos): `id: '…'` nos fontes do editor. */
function declaredIds(): Set<string> {
  const out = new Set<string>();
  for (const f of readdirSync(__dirname)) {
    if (!f.endsWith('.ts') || f.endsWith('.test.ts') || f === 'formatting-policy.ts') continue;
    for (const m of readFileSync(join(__dirname, f), 'utf8').matchAll(/\bid: '([^']+)'/g)) out.add(m[1]!);
  }
  return out;
}

describe('policyHiddenIds do modelo "documento com modelo"', () => {
  it('cada id oculto existe: comando registrado, item das barras (compacta e ribbon) ou entrada de menu/painel/diálogo', async () => {
    const commands = new Set<string>();
    const add = CommandRegistry.prototype.add;
    vi.spyOn(CommandRegistry.prototype, 'add').mockImplementation(function (this: CommandRegistry, ...cmds) {
      for (const c of cmds) commands.add(c.id);
      return add.apply(this, cmds);
    });
    ed.setAttribute('topbar', '');
    await settleChrome();
    ed.setAttribute('toolbar', 'ribbon');
    await settleChrome();

    const reg = new CommandRegistry('pt');
    const known = new Set<string>([...commands, ...declaredIds()]);
    for (const cfg of [layouts.compact.at(-1), layouts.ribbon.at(-1)]) {
      expect(cfg).toBeDefined();
      for (const id of layoutIds(cfg as CompactConfig | RibbonConfig, reg)) known.add(id);
    }
    const hidden = policyHiddenIds(resolvePolicy(TEMPLATE_DOCUMENT_POLICY));
    expect(hidden.length).toBeGreaterThan(10);
    expect(hidden.filter((id) => !known.has(id))).toEqual([]);
  });
});

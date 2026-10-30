import { describe, expect, it } from 'vitest';
import { CommandRegistry } from './commands.js';
import { barItemId, extendCompact, extendRibbon, hideInCompact, hideInRibbon } from './extend.js';
import type { BarGroup, BarItem, CompactConfig, RibbonConfig } from './types.js';

const widget = (id?: string): BarItem => ({ widget: () => ({ el: {} as HTMLElement }), ...(id ? { id } : {}) });

const itemIds = (items: readonly BarItem[]): string[] => items.map((it) => {
  if (typeof it === 'string') return it;
  if ('cmd' in it) return it.cmd;
  if ('split' in it) return it.split;
  if ('gallery' in it) return it.gallery.id;
  if ('widget' in it) return it.id ?? '(widget)';
  return it.id;
});

const compact = (): CompactConfig => ({
  title: widget('title'),
  trailing: [widget('save:button')],
  menus: [
    { id: 'file', label: 'File', items: ['new', 'open'] },
    { id: 'edit', label: 'Edit', items: ['undo'] },
    { id: 'help', label: 'Help', items: ['about'] },
  ],
  groups: [
    { id: 'tools', label: 'Tools', items: ['undo', 'redo', 'print'] },
    { id: 'insert', label: 'Insert', items: ['link', { menu: [], id: 'table:menu', label: 'Table' }, { split: 'list:bullet', menu: [] }] },
    { id: 'extras', label: 'More', items: [widget(), { gallery: { id: 'styles:gallery', label: 'Styles', items: () => [], render: () => undefined } }] },
  ],
});

const ribbon = (): RibbonConfig => ({
  qat: ['save', 'undo'],
  tabs: [
    { id: 'file', label: 'File', groups: [], menu: ['new'] },
    { id: 'home', label: 'Home', groups: [
      { id: 'clipboard', label: 'Clipboard', cells: [{ split: 'paste', menu: [] }, { rows: [['cut'], ['copy']] }] },
      { id: 'font', label: 'Font', cells: [{ rows: [['bold', 'italic']] }] },
    ] },
    { id: 'insert', label: 'Insert', groups: [{ id: 'pages', label: 'Pages', cells: ['blankPage'] }] },
  ],
});

describe('CommandRegistry.hide', () => {
  const registry = (): CommandRegistry => new CommandRegistry('pt').add(
    { id: 'new', label: 'Novo', run: () => 'novo' },
    { id: 'open', label: 'Abrir', run: () => 'abrir' },
  );

  it('comando oculto deixa de ser suportado e não executa', () => {
    const reg = registry().hide(['new']);
    expect(reg.isHidden('new')).toBe(true);
    expect(reg.supported('new')).toBe(false);
    expect(reg.run('new')).toBeUndefined();
    expect(reg.supported('open')).toBe(true);
  });

  it('resolve tira comandos e itens de menu ocultos pelo id, e o separador que sobrou', () => {
    const reg = registry().hide(['new', 'recent']);
    const items = reg.resolve(['new', { id: 'recent', label: 'Recentes', submenu: ['open'] }, '-', 'open']);
    expect(items.map((i) => i.id ?? (i.sep ? '-' : '?'))).toEqual(['open']);
  });

  it('hide acumula e unhide devolve', () => {
    const reg = registry().hide(['new']).hide(['open']);
    expect(reg.hiddenIds().sort()).toEqual(['new', 'open']);
    reg.unhide(['new']);
    expect(reg.supported('new')).toBe(true);
  });
});

describe('hideInCompact', () => {
  it('remove menus, grupos e itens ocultos pelo id', () => {
    const cfg = hideInCompact(compact(), new Set(['file', 'print', 'table:menu', 'list:bullet', 'styles:gallery', 'save:button', 'title']));
    expect(cfg.menus.map((m) => m.id)).toEqual(['edit', 'help']);
    expect(cfg.groups.map((g) => itemIds(g.items ?? []))).toEqual([['undo', 'redo'], ['link'], ['(widget)']]);
    expect(cfg.trailing).toEqual([]);
    expect(cfg.title).toBeUndefined();
  });

  it('grupo oculto sai inteiro', () => {
    const cfg = hideInCompact(compact(), new Set(['insert']));
    expect(cfg.groups.map((g) => g.id)).toEqual(['tools', 'extras']);
  });

  it('sem ids ocultos devolve a mesma configuração', () => {
    const original = compact();
    expect(hideInCompact(original, new Set())).toBe(original);
  });
});

describe('hideInRibbon', () => {
  it('remove guias, grupos, itens das linhas e da barra de acesso rápido', () => {
    const cfg = hideInRibbon(ribbon(), new Set(['file', 'insert', 'paste', 'copy', 'save']));
    expect(cfg.tabs.map((t) => t.id)).toEqual(['home']);
    const clipboard = cfg.tabs[0]!.groups[0]!;
    expect(clipboard.cells).toEqual([{ rows: [['cut']] }]);
    expect(cfg.qat).toEqual(['undo']);
  });

  it('linha que ficou vazia sai da célula, célula vazia sai do grupo e o grupo vazio sai da guia', () => {
    const cfg = hideInRibbon(ribbon(), new Set(['bold']));
    expect(cfg.tabs[1]!.groups[1]!.cells).toEqual([{ rows: [['italic']] }]);
    const empty = hideInRibbon(ribbon(), new Set(['bold', 'italic']));
    expect(empty.tabs[1]!.groups.map((g) => g.id)).toEqual(['clipboard']);
  });

  it('guia cujos grupos todos saíram sai; a guia de menu (Arquivo, sem grupos) fica', () => {
    const cfg = hideInRibbon(ribbon(), new Set(['blankPage']));
    expect(cfg.tabs.map((t) => t.id)).toEqual(['file', 'home']);
  });

  it('caixas numéricas e títulos de coluna (spinField/barCaption) também se ocultam pelo id', () => {
    const r: RibbonConfig = { tabs: [{ id: 'layout', label: 'Layout', groups: [
      { id: 'para', label: 'Paragraph', cells: [{ rows: [[widget('indent:caption')], [widget('indent:left')]] }] },
      { id: 'setup', label: 'Setup', cells: ['margins'] },
    ] }] };
    const cfg = hideInRibbon(r, new Set(['indent:caption', 'indent:left']));
    expect(cfg.tabs[0]!.groups.map((g) => g.id)).toEqual(['setup']);
  });
});

describe('hideInCompact: grupo vazio', () => {
  it('grupo cujos itens todos foram ocultos sai (não fica só o rótulo/gatilho)', () => {
    const cfg = hideInCompact(compact(), new Set(['undo', 'redo', 'print']));
    expect(cfg.groups.map((g) => g.id)).toEqual(['insert', 'extras']);
  });
});

describe('extendCompact', () => {
  const tags: BarGroup = { id: 'host:tags', label: 'Tags', items: ['host:tag:name'] };

  it('acrescenta menus e grupos no fim', () => {
    const cfg = extendCompact(compact(), [{ compact: { menus: [{ id: 'host', label: 'Host', items: [] }], groups: [tags] } }]);
    expect(cfg.menus.map((m) => m.id)).toEqual(['file', 'edit', 'help', 'host']);
    expect(cfg.groups.map((g) => g.id)).toEqual(['tools', 'insert', 'extras', 'host:tags']);
  });

  it('before posiciona antes do id indicado; id desconhecido vai para o fim', () => {
    const cfg = extendCompact(compact(), [
      { compact: { menus: [{ id: 'host', label: 'Host', items: [], before: 'help' }], groups: [{ ...tags, before: 'insert' }] } },
      { compact: { groups: [{ id: 'other', label: 'Other', items: [], before: 'nope' }] } },
    ]);
    expect(cfg.menus.map((m) => m.id)).toEqual(['file', 'edit', 'host', 'help']);
    expect(cfg.groups.map((g) => g.id)).toEqual(['tools', 'host:tags', 'insert', 'extras', 'other']);
  });

  it('itens à direita (trailing) entram depois dos do componente', () => {
    const cfg = extendCompact(compact(), [{ compact: { trailing: ['host:fullscreen'] } }]);
    expect(itemIds(cfg.trailing ?? [])).toEqual(['save:button', 'host:fullscreen']);
  });

  it('title substitui o título embutido; a última contribuição com título vence; sem title, fica o embutido', () => {
    const host = widget('host:title');
    const other = widget('other:title');
    expect(barItemId(extendCompact(compact(), [{ compact: { title: host } }]).title!)).toBe('host:title');
    expect(barItemId(extendCompact(compact(), [{ compact: { title: host } }, { compact: { title: other } }, { compact: {} }]).title!)).toBe('other:title');
    expect(barItemId(extendCompact(compact(), [{ compact: { trailing: ['x'] } }]).title!)).toBe('title');
    const noTitle = compact();
    delete noTitle.title;
    expect(barItemId(extendCompact(noTitle, [{ compact: { title: host } }]).title!)).toBe('host:title');
  });

  it('o título do hospedeiro com id próprio sobrevive a hidden-commands "title"', () => {
    const cfg = hideInCompact(extendCompact(compact(), [{ compact: { title: widget('host:title') } }]), new Set(['title']));
    expect(barItemId(cfg.title!)).toBe('host:title');
  });

  it('a contribuição não carrega o before para a configuração final', () => {
    const cfg = extendCompact(compact(), [{ compact: { groups: [{ ...tags, before: 'insert' }] } }]);
    expect(cfg.groups.find((g) => g.id === 'host:tags')).not.toHaveProperty('before');
  });

  it('titlePlacement e leading: padrão inline sem leading; a última contribuição que define vence', () => {
    const base = extendCompact(compact(), [{ compact: { trailing: ['x'] } }]);
    expect(base.titlePlacement).toBeUndefined();
    expect(base.leading).toBeUndefined();
    const cfg = extendCompact(compact(), [
      { compact: { titlePlacement: 'above-menus', leading: widget('host:logo') } },
      { compact: { leading: widget('other:logo') } },
      { compact: {} },
    ]);
    expect(cfg.titlePlacement).toBe('above-menus');
    expect(barItemId(cfg.leading!)).toBe('other:logo');
    expect(extendCompact(compact(), [{ compact: { titlePlacement: 'above-menus' } }, { compact: { titlePlacement: 'inline' } }]).titlePlacement).toBe('inline');
  });

  it('leading oculto pelo id (hidden-commands) sai; o resto fica', () => {
    const cfg = hideInCompact(extendCompact(compact(), [{ compact: { titlePlacement: 'above-menus', leading: widget('host:logo') } }]), new Set(['host:logo']));
    expect(cfg.leading).toBeUndefined();
    expect(cfg.titlePlacement).toBe('above-menus');
    expect(barItemId(cfg.title!)).toBe('title');
  });
});

describe('extendRibbon', () => {
  it('acrescenta guia (com before) e grupo numa guia existente', () => {
    const cfg = extendRibbon(ribbon(), [{
      ribbon: {
        tabs: [{ id: 'host', label: 'Host', groups: [], before: 'insert' }],
        groups: [{ tab: 'home', id: 'host:tags', label: 'Tags', cells: ['host:tag:name'], before: 'font' }],
        qat: ['host:fullscreen'],
      },
    }]);
    expect(cfg.tabs.map((t) => t.id)).toEqual(['file', 'home', 'host', 'insert']);
    expect(cfg.tabs[1]!.groups.map((g) => g.id)).toEqual(['clipboard', 'host:tags', 'font']);
    expect(cfg.qat).toEqual(['save', 'undo', 'host:fullscreen']);
  });

  it('title substitui o título embutido da ribbon', () => {
    expect(extendRibbon(ribbon(), [{ ribbon: {} }]).title).toBeUndefined();
    expect(barItemId(extendRibbon({ ...ribbon(), title: widget('title') }, [{ ribbon: { title: widget('host:title') } }]).title!)).toBe('host:title');
  });

  it('grupo para guia inexistente é ignorado', () => {
    const cfg = extendRibbon(ribbon(), [{ ribbon: { groups: [{ tab: 'nope', id: 'x', label: 'X', cells: [] }] } }]);
    expect(cfg.tabs.flatMap((t) => t.groups.map((g) => g.id))).toEqual(['clipboard', 'font', 'pages']);
  });
});

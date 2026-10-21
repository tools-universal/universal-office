import { describe, expect, it } from 'vitest';
import { planCollapse } from './collapse.js';
import { CommandRegistry } from './commands.js';
import { hasSymbol, symbol } from './icons.js';
import { OFFICE_COLORS } from './colors.js';

describe('planCollapse (escada de prioridade)', () => {
  const opts = { trigW: 50, moreW: 40 };

  it('tudo cabe: nada recolhe', () => {
    const p = planCollapse([{ prio: 5, width: 100 }, { prio: 9, width: 100 }], 500, opts);
    expect(p).toEqual({ inline: [0, 1], triggers: [], more: [] });
  });

  it('prio 0 vai sempre para o "⋮", mesmo com largura de sobra', () => {
    const p = planCollapse([{ prio: 5, width: 100 }, { prio: 0, width: 300 }], 2000, opts);
    expect(p.inline).toEqual([0]);
    expect(p.more).toEqual([1]);
  });

  it('recolhe primeiro a MENOR prioridade, em gatilho próprio', () => {
    const g = [{ prio: 4, width: 200 }, { prio: 8, width: 200 }, { prio: 9, width: 200 }, { prio: 6, width: 200 }];
    const p = planCollapse(g, 700, opts);
    expect(p.inline).toEqual([1, 2, 3]);
    expect(p.triggers).toEqual([0]);
    expect(p.more).toEqual([]);
  });

  it('gatilhos que não cabem migram para o "⋮" (menor prio primeiro)', () => {
    const g = [{ prio: 4, width: 200 }, { prio: 5, width: 200 }, { prio: 9, width: 200 }];
    const p = planCollapse(g, 260, opts);
    expect(p.inline).toEqual([2]);
    expect(p.triggers).toEqual([]);
    expect(p.more).toEqual([0, 1]);
  });

  it('prio 9 nunca recolhe, nem sem espaço', () => {
    const p = planCollapse([{ prio: 9, width: 500 }], 100, opts);
    expect(p.inline).toEqual([0]);
  });

  it('grupo elástico (galeria) cede largura antes de qualquer grupo recolher', () => {
    const p = planCollapse([{ prio: 5, width: 300 }, { prio: 8, width: 600, shrink: 300 }], 700, opts);
    expect(p.inline).toEqual([0, 1]);
    expect(p.triggers).toEqual([]);
    expect(p.give).toEqual([0, 200]);
  });

  it('nem o elástico no mínimo cabe: recolhe e o elástico cede só o que falta', () => {
    const p = planCollapse([{ prio: 5, width: 300 }, { prio: 8, width: 600, shrink: 300 }], 500, opts);
    expect(p.inline).toEqual([1]);
    expect(p.triggers).toEqual([0]);
    expect(p.give).toEqual([0, 150]);
  });

  it('empate de prioridade: recolhe o da direita primeiro', () => {
    const p = planCollapse([{ prio: 8, width: 200 }, { prio: 8, width: 200 }], 300, opts);
    expect(p.inline).toEqual([0]);
    expect(p.triggers).toEqual([1]);
  });
});

describe('CommandRegistry', () => {
  const make = (lang: 'en' | 'pt' = 'en'): { reg: CommandRegistry; log: string[] } => {
    const log: string[] = [];
    const reg = new CommandRegistry(lang).add(
      { id: 'bold', label: { en: 'Bold', pt: 'Negrito' }, icon: 'format_bold', shortcut: 'Ctrl+B', run: () => log.push('bold'), isChecked: () => true },
      { id: 'table', label: 'Table', supports: () => false, run: () => log.push('table') },
      { id: 'cut', label: 'Cut', isEnabled: () => false, run: () => log.push('cut') },
    );
    return { reg, log };
  };

  it('rótulo pelo idioma da interface e tooltip com atalho', () => {
    expect(make('pt').reg.label('bold')).toBe('Negrito');
    expect(make('en').reg.tooltip('bold')).toBe('Bold (Ctrl+B)');
  });

  it('comando sem suporte (API ausente) some dos menus e não roda', () => {
    const { reg, log } = make();
    expect(reg.supported('table')).toBe(false);
    expect(reg.menuItem('table')).toBeNull();
    reg.run('table');
    expect(log).toEqual([]);
  });

  it('desabilitado não roda; afterRun avisa depois de cada execução', () => {
    const { reg, log } = make();
    const after: string[] = [];
    reg.afterRun = (id) => after.push(id);
    reg.run('cut');
    reg.run('bold');
    expect(log).toEqual(['bold']);
    expect(after).toEqual(['bold']);
  });

  it('resolve: separadores repetidos/nas pontas e submenus vazios somem', () => {
    const { reg } = make();
    const items = reg.resolve(['-', 'table', '-', 'bold', '-', '-', { label: 'Sub', submenu: ['table'] }, '-']);
    expect(items.map((i) => (i.sep ? '-' : i.id ?? i.label))).toEqual(['bold']);
    expect(items[0]!.checked).toBe(true);
  });
});

describe('ícones e cores', () => {
  it('Material Symbols embutidos como SVG', () => {
    expect(hasSymbol('format_bold')).toBe(true);
    expect(symbol('format_bold')).toMatch(/^<svg class="uo-ic" viewBox="0 -960 960 960"/);
    expect(symbol('nao_existe')).toBe('');
  });

  it('paleta do Office: 6 linhas de tema + cores padrão', () => {
    expect(OFFICE_COLORS).toHaveLength(70);
    expect(OFFICE_COLORS.every((c) => /^[0-9A-F]{6}$/.test(c))).toBe(true);
  });
});

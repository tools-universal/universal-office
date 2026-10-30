// Faixa de aviso das barras (BarHandle.setNotice): oculta até ter conteúdo, tom
// em data-tone, conteúdo trocado inteiro.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNoticeRegion } from './notice.js';
import { BAR_CSS } from './css.js';

class El {
  className = '';
  hidden = false;
  parent: El | null = null;
  readonly dataset: Record<string, string> = {};
  readonly attrs = new Map<string, string>();
  children: El[] = [];
  constructor(readonly tagName: string) {}
  setAttribute(k: string, v: string): void { this.attrs.set(k, v); }
  getAttribute(k: string): string | null { return this.attrs.get(k) ?? null; }
  replaceChildren(...cs: El[]): void {
    for (const c of this.children) c.parent = null;
    for (const c of cs) { c.parent?.children.splice(c.parent.children.indexOf(c), 1); c.parent = this; }
    this.children = [...cs];
  }
}

beforeEach(() => vi.stubGlobal('document', { createElement: (t: string) => new El(t.toUpperCase()) }));
afterEach(() => vi.unstubAllGlobals());

describe('createNoticeRegion', () => {
  it('nasce oculta, com part="notice" e role="status"', () => {
    const { el } = createNoticeRegion() as unknown as { el: El };
    expect(el.className).toBe('uo-notice');
    expect(el.hidden).toBe(true);
    expect(el.getAttribute('part')).toBe('notice');
    expect(el.getAttribute('role')).toBe('status');
  });

  it('conteúdo mostra (tom padrão info), outro conteúdo substitui, null esconde e solta o elemento', () => {
    const region = createNoticeRegion();
    const el = region.el as unknown as El;
    const a = new El('DIV'), b = new El('DIV');
    region.set(a as unknown as HTMLElement);
    expect(el.hidden).toBe(false);
    expect(el.dataset['tone']).toBe('info');
    expect(el.children).toEqual([a]);

    region.set(b as unknown as HTMLElement, 'warning');
    expect(el.children).toEqual([b]);
    expect(a.parent).toBeNull();
    expect(el.dataset['tone']).toBe('warning');

    region.set(null);
    expect(el.hidden).toBe(true);
    expect(el.children).toEqual([]);
    expect(b.parent).toBeNull();
  });

  it('o CSS das barras tem a faixa e os tons (com --uo-notice-* para o hospedeiro)', () => {
    expect(BAR_CSS).toContain('.uo-notice {');
    expect(BAR_CSS).toContain('.uo-notice[data-tone="warning"]');
    expect(BAR_CSS).toContain('.uo-notice[data-tone="error"]');
    expect(BAR_CSS).toContain('--uo-notice-bg');
  });
});

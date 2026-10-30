// createBarButton / createBarIcon: o visual da barra para os widgets do
// hospedeiro (Material Symbols em SVG, classes do BAR_CSS, ripple, idioma).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adoptBarStyles, barCss, createBarButton, createBarIcon, createBarRow, hasBarIcon } from './bar-button.js';
import { BAR_CSS } from './css.js';

/** DOM mínimo: o bastante para os helpers (sem parser — innerHTML fica como texto). */
class El {
  className = '';
  title = '';
  type = '';
  disabled = false;
  innerHTML = '';
  readonly dataset: Record<string, string> = {};
  readonly attrs = new Map<string, string>();
  readonly children: El[] = [];
  readonly listeners = new Map<string, ((e: unknown) => void)[]>();
  readonly style = { props: {} as Record<string, string>, setProperty(k: string, v: string) { this.props[k] = v; } };
  constructor(readonly tagName: string) {}
  setAttribute(k: string, v: string): void { this.attrs.set(k, v); }
  getAttribute(k: string): string | null { return this.attrs.get(k) ?? null; }
  textContent = '';
  appendChild(c: El): El { this.children.push(c); return c; }
  append(...cs: El[]): void { this.children.push(...cs); }
  querySelector(sel: string): El | null { return sel === ':scope > u-ripple' ? this.children.find((c) => c.tagName === 'U-RIPPLE') ?? null : null; }
  addEventListener(t: string, l: (e: unknown) => void): void { this.listeners.set(t, [...(this.listeners.get(t) ?? []), l]); }
  fire(t: string, e: Record<string, unknown> = {}): Record<string, unknown> {
    const ev = { type: t, defaultPrevented: false, preventDefault() { ev.defaultPrevented = true; }, ...e };
    for (const l of this.listeners.get(t) ?? []) l(ev);
    return ev;
  }
}

let ripple = false;
beforeEach(() => {
  ripple = false;
  vi.stubGlobal('document', { createElement: (t: string) => new El(t.toUpperCase()) });
  vi.stubGlobal('customElements', { get: (n: string) => (n === 'u-ripple' && ripple ? class {} : undefined) });
});
afterEach(() => vi.unstubAllGlobals());

const make = (o: Parameters<typeof createBarButton>[0]): El => createBarButton(o) as unknown as El;

describe('createBarButton', () => {
  it('variantes viram as classes da barra; com rótulo o padrão é outlined, sem rótulo é icon', () => {
    expect(make({ label: 'x', variant: 'filled' }).className).toBe('uo-pill uo-pill-primary');
    expect(make({ label: 'x', variant: 'tonal' }).className).toBe('uo-pill uo-pill-tonal');
    expect(make({ label: 'x', variant: 'text' }).className).toBe('uo-pill uo-pill-text');
    expect(make({ label: 'x' }).className).toBe('uo-pill');
    expect(make({ icon: 'send' }).className).toBe('uo-btn uo-btn-icon');
  });

  it('ícone em SVG (Material Symbols embutidos) + rótulo escapado no idioma pedido', () => {
    const b = make({ icon: 'send', label: { en: 'Send <now>', pt: 'Enviar <já>' }, lang: 'pt', variant: 'filled' });
    expect(b.innerHTML).toMatch(/^<svg class="uo-ic" viewBox="0 -960 960 960" aria-hidden="true"><path d="M/);
    expect(b.innerHTML).toContain('<span class="uo-lbl">Enviar &#60;já&#62;</span>');
    expect(b.title).toBe('Enviar <já>');
    expect(b.type).toBe('button');
  });

  it('botão de ícone: sem texto visível, nome acessível e dica pelo rótulo (ou title)', () => {
    const b = make({ icon: 'visibility', label: 'Preview', variant: 'icon' });
    expect(b.innerHTML).not.toContain('uo-lbl');
    expect(b.getAttribute('aria-label')).toBe('Preview');
    expect(make({ icon: 'visibility', title: { en: 'Preview', pt: 'Pré-visualizar' }, lang: 'pt' }).getAttribute('aria-label')).toBe('Pré-visualizar');
  });

  it('clique chama onClick; mousedown não tira o foco do documento; disabled', () => {
    const onClick = vi.fn();
    const b = make({ label: 'Salvar', onClick, disabled: true });
    expect(b.disabled).toBe(true);
    b.fire('click');
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(b.fire('mousedown').defaultPrevented).toBe(true);
  });

  it('põe o u-ripple só quando ele está registrado', () => {
    expect(make({ label: 'x' }).children).toHaveLength(0);
    ripple = true;
    expect(make({ label: 'x' }).children.map((c) => c.tagName)).toEqual(['U-RIPPLE']);
  });
});

describe('createBarButton: variantes de ícone com destaque e tamanho pequeno', () => {
  it('icon-filled / icon-tonal: botão redondo só de ícone, com fundo; rótulo vira nome acessível', () => {
    const f = make({ icon: 'send', label: 'Enviar', variant: 'icon-filled' });
    expect(f.className).toBe('uo-btn uo-btn-icon uo-btn-icon-filled');
    expect(f.innerHTML).not.toContain('uo-lbl');
    expect(f.getAttribute('aria-label')).toBe('Enviar');
    expect(make({ icon: 'send', variant: 'icon-tonal' }).className).toBe('uo-btn uo-btn-icon uo-btn-icon-tonal');
  });

  it("size: 'small' acrescenta uo-btn-sm (pílula de 24px para chips de status)", () => {
    const chip = make({ icon: 'check_circle', label: 'Publicado', variant: 'tonal', size: 'small' });
    expect(chip.className).toBe('uo-pill uo-pill-tonal uo-btn-sm uo-pill-ic');
    expect(chip.dataset['size']).toBe('small');
    expect(make({ label: 'Rascunho', size: 'small' }).className).toBe('uo-pill uo-btn-sm');
    expect(make({ icon: 'close', size: 'small' }).className).toBe('uo-btn uo-btn-icon uo-btn-sm');
  });

  it('ícone + rótulo ganha uo-pill-ic (espaço só pelo gap, padding do M3); sem ícone, não', () => {
    expect(make({ icon: 'save', label: 'Salvar', variant: 'filled' }).className).toBe('uo-pill uo-pill-primary uo-pill-ic');
    expect(make({ label: 'Salvar', variant: 'filled' }).className).toBe('uo-pill uo-pill-primary');
  });

  it('o CSS tem as variantes, o tamanho pequeno e o gap/padding do ícone', () => {
    for (const sel of ['.uo-btn-icon-filled', '.uo-btn-icon-tonal', '.uo-pill.uo-btn-sm', '.uo-btn-icon.uo-btn-sm', '.uo-pill.uo-pill-ic', '.uo-title-slot', '.uo-host-row']) {
      expect(BAR_CSS).toContain(sel);
    }
    expect(/\.uo-pill\.uo-btn-sm \{[^}]*height: 24px/.test(BAR_CSS)).toBe(true);
    // .uo-title (17px, borda no hover/foco) é só do campo embutido
    expect(/\.uo-title-slot \{[^}]*font-size/.test(BAR_CSS)).toBe(false);
  });
});

describe('createBarRow / barCss / adoptBarStyles (linha mínima fora do editor)', () => {
  it('monta .uo-bar > .uo-titlebar com o título no .uo-title-slot, espaçador e ações', () => {
    const save = make({ label: 'Salvar' });
    const row = createBarRow({ title: 'Política.docx', actions: [save as unknown as Node] }) as unknown as El;
    expect(row.className).toBe('uo-bar uo-host-row');
    const line = row.children[0]!;
    expect(line.className).toBe('uo-titlebar');
    expect(line.children.map((c) => c.className)).toEqual(['uo-title-slot', 'uo-spacer', 'uo-pill']);
  });

  it('above-menus: a geometria da barra com o título acima dos menus — leading, título na 1ª linha, 2ª linha vazia e ações à direita', () => {
    const logo = new El('SPAN');
    const send = make({ label: 'Enviar', variant: 'filled' });
    const row = createBarRow({ title: 'Política.docx', leading: logo as unknown as Node, actions: [send as unknown as Node], titlePlacement: 'above-menus' }) as unknown as El;
    expect(row.className).toBe('uo-bar uo-host-row uo-title-above');
    const line = row.children[0]!;
    expect(line.className).toBe('uo-titlebar uo-stacked');
    expect(line.children.map((c) => c.className)).toEqual(['uo-leading', 'uo-titlebar-main', 'uo-trailing']);
    expect(line.children[0]!.children).toEqual([logo]);
    const [titleRow, menuRow] = line.children[1]!.children;
    expect(titleRow!.className).toBe('uo-title-row');
    expect(titleRow!.children[0]!.className).toBe('uo-title-slot');
    expect(titleRow!.children[0]!.textContent).toBe('Política.docx');
    expect(menuRow!.className).toBe('uo-menu-row');
    expect(menuRow!.children).toEqual([]);
    expect(line.children[2]!.children).toEqual([send]);
  });

  it('inline com leading: o ícone vem antes do título, na mesma linha', () => {
    const logo = new El('SPAN');
    const row = createBarRow({ title: 'Doc', leading: logo as unknown as Node }) as unknown as El;
    expect(row.children[0]!.children.map((c) => c.className)).toEqual(['uo-leading', 'uo-title-slot', 'uo-spacer']);
  });

  it('o CSS tem o layout com o título acima dos menus', () => {
    for (const sel of ['.uo-titlebar.uo-stacked', '.uo-titlebar-main', '.uo-title-row', '.uo-menu-row', '.uo-trailing', '.uo-leading']) expect(BAR_CSS).toContain(sel);
  });

  it('barCss é o CSS das barras; adoptBarStyles adota a folha construída uma vez (ou cai num <style>)', () => {
    expect(barCss).toBe(BAR_CSS);
    class Sheet { text = ''; replaceSync(t: string): void { this.text = t; } }
    vi.stubGlobal('CSSStyleSheet', Sheet);
    const root = { adoptedStyleSheets: [] as unknown[] };
    adoptBarStyles(root as unknown as ShadowRoot);
    adoptBarStyles(root as unknown as ShadowRoot);
    expect(root.adoptedStyleSheets).toHaveLength(1);
    expect((root.adoptedStyleSheets[0] as Sheet).text).toBe(BAR_CSS);
  });
});

describe('createBarIcon / hasBarIcon', () => {
  it('ícone decorativo (aria-hidden) ou com nome (role=img); tamanho pela variável', () => {
    const i = createBarIcon('check_circle') as unknown as El;
    expect(i.className).toBe('uo-ic-box');
    expect(i.innerHTML).toContain('<svg class="uo-ic"');
    expect(i.getAttribute('aria-hidden')).toBe('true');
    const j = createBarIcon('error', { size: 16, title: 'Erro' }) as unknown as El;
    expect(j.getAttribute('role')).toBe('img');
    expect(j.getAttribute('aria-label')).toBe('Erro');
    expect(j.style.props['--uo-ic-size']).toBe('16px');
  });

  it('o conjunto tem os ícones do hospedeiro (send, save, visibility, check_circle, error, warning, folder_open, arrow_back)', () => {
    for (const n of ['send', 'save', 'visibility', 'check_circle', 'error', 'warning', 'folder_open', 'arrow_back']) expect(hasBarIcon(n)).toBe(true);
    expect(hasBarIcon('no_such_icon')).toBe(false);
    expect(hasBarIcon('<path d="M0 0"/>')).toBe(true);
  });
});

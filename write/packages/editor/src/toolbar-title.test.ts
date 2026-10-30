// Barra do <universal-write> como barra do app hospedeiro: a contribuição
// `compact.title`/`ribbon.title` SUBSTITUI o título embutido, os widgets recebem
// o kit (botões/ícones com o visual da barra, Material Symbols em SVG) e
// acompanham o claro/escuro no sync. Elemento de verdade sobre o DOM falso.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../test-support/fake-dom.js';
import { installColorSchemeEnv, type ColorSchemeEnv } from '../../../test-support/color-scheme-env.js';
import type { UniversalWriteElement as Editor } from './universal-write.js';
import type { UniversalWriteFontAsset, UniversalWritePlugin, UniversalWriteToolbarContext } from './plugins.js';

const FONTS = join(__dirname, '..', 'demo', 'fonts');
const VARIANTS = { regular: 'regular', bold: 'bold', italic: 'italic', boldItalic: 'bolditalic' } as const;
const FONT_ASSETS: UniversalWriteFontAsset[] = Object.entries(VARIANTS).map(([variant, file]) => ({
  family: 'Liberation Sans', variant: variant as UniversalWriteFontAsset['variant'],
  data: new Uint8Array(readFileSync(join(FONTS, `liberationsans-${file}.ttf`))),
}));

let dom: FakeDom;
let env: ColorSchemeEnv;
let Ctor: typeof Editor;
let ed: Editor;

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  dom = installFakeDom();
  // u-ripple de mentira (o de verdade é Lit e não renderiza no DOM falso): as barras não registram outro
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
  env = installColorSchemeEnv();
  ed = new Ctor();
  ed.setAttribute('manual-init', '');
  ed.setAttribute('lang', 'pt');
  // os controles montados por innerHTML (estilo, fonte, tamanho, zoom) dependem de um
  // parser que o DOM falso não tem: fora da barra, como um hospedeiro faria com hidden-commands
  ed.hiddenCommands = ['tools', 'style', 'font', 'size', 'save'];
  dom.document.body.appendChild(ed as unknown as FakeNode);
  await ed.initialize({ fonts: FONT_ASSETS });
});
afterEach(() => {
  (ed as unknown as FakeNode).remove();
  vi.clearAllTimers();
});

/** espera o import das barras e o sync do próximo quadro */
async function settleChrome(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await vi.dynamicImportSettled();
    await Promise.resolve();
    vi.advanceTimersByTime(20);
  }
}

const topbar = (): HTMLElement => (ed as unknown as { shadowRoot: ShadowRoot }).shadowRoot.querySelector<HTMLElement>('.uw-topbar')!;

function hostPlugin(onSend: () => void, seen: UniversalWriteToolbarContext[]): UniversalWritePlugin {
  const title = (ctx: UniversalWriteToolbarContext) => ({
    id: 'host:title',
    widget: () => {
      const el = document.createElement('div');
      el.className = 'host-title';
      el.append(ctx.ui.createBarIcon('description'));
      return { el, sync: () => { el.dataset['theme'] = ctx.editor.effectiveTheme; } };
    },
  });
  return {
    id: 'host.bar',
    toolbar: (ctx) => {
      seen.push(ctx);
      return {
        compact: {
          title: title(ctx),
          trailing: [{ id: 'host:send', widget: () => ({ el: ctx.ui.createBarButton({ icon: 'send', label: { en: 'Send', pt: 'Enviar' }, variant: 'filled', onClick: onSend }) }) }],
        },
        ribbon: { title: title(ctx) },
      };
    },
  };
}

describe('contribuição title + kit de widgets', () => {
  it('compact.title substitui o título embutido; o botão do kit tem o visual, o ícone e o idioma da barra', async () => {
    const onSend = vi.fn();
    const seen: UniversalWriteToolbarContext[] = [];
    ed.use(hostPlugin(onSend, seen));
    ed.setAttribute('topbar', '');
    await settleChrome();

    const bar = topbar();
    expect(bar.querySelector('.uo-title')).toBeNull(); // o input embutido saiu
    const t = bar.querySelector<HTMLElement>('.host-title')!;
    expect(t).not.toBeNull();
    expect(t.classList.contains('uo-title-slot')).toBe(true);
    expect(t.querySelector('.uo-ic-box')!.innerHTML).toContain('<svg class="uo-ic"');

    const send = [...bar.querySelectorAll<HTMLButtonElement>('.uo-pill-primary')].at(-1)!;
    expect(send.className).toBe('uo-pill uo-pill-primary uo-pill-ic'); // ícone + rótulo: padding do M3, espaço só pelo gap
    expect(send.innerHTML).toContain('<svg class="uo-ic"'); // o ícone `send` existe no conjunto
    expect(send.innerHTML).toContain('Enviar'); // lang="pt" do elemento
    send.click();
    expect(onSend).toHaveBeenCalledTimes(1);

    expect(seen.at(-1)!.theme).toBe('light');
    expect(seen.at(-1)!.ui.hasBarIcon('send')).toBe(true);
  });

  it('os widgets acompanham o claro/escuro (sync a cada uw-theme-change)', async () => {
    ed.use(hostPlugin(() => {}, []));
    ed.setAttribute('topbar', '');
    await settleChrome();
    const t = topbar().querySelector<HTMLElement>('.host-title')!;
    expect(t.dataset['theme']).toBe('light');

    env.context = 'dark';
    env.settle(ed as unknown as Element);
    await settleChrome();
    expect(t.dataset['theme']).toBe('dark');
  });

  it('ribbon.title substitui o título embutido da ribbon', async () => {
    ed.use(hostPlugin(() => {}, []));
    ed.setAttribute('toolbar', 'ribbon');
    ed.setAttribute('topbar', '');
    await settleChrome();
    const bar = topbar();
    expect(bar.querySelector('.uo-ribbon')).not.toBeNull();
    expect(bar.querySelector('.uo-title')).toBeNull();
    expect(bar.querySelector('.host-title')?.classList.contains('uo-title-slot')).toBe(true);
  });

  it('título do hospedeiro que é um <input> também recebe só o lugar (.uo-title-slot), não o visual de campo', async () => {
    ed.use({ id: 'host.input', toolbar: () => ({ compact: { title: { id: 'host:title', widget: () => ({ el: Object.assign(document.createElement('input'), { className: 'host-input' }) }) } } }) });
    ed.setAttribute('topbar', '');
    await settleChrome();
    const t = topbar().querySelector<HTMLElement>('.host-input')!;
    expect(t.classList.contains('uo-title-slot')).toBe(true);
    expect(t.classList.contains('uo-title')).toBe(false);
  });

  it('o kit tem a linha mínima e o CSS das barras para montar fora do editor', async () => {
    const seen: UniversalWriteToolbarContext[] = [];
    ed.use(hostPlugin(() => {}, seen));
    ed.setAttribute('topbar', '');
    await settleChrome();
    const ui = seen.at(-1)!.ui;
    expect(ui.barCss).toContain('.uo-title-slot');
    const row = ui.createBarRow({ title: 'Doc', actions: [ui.createBarButton({ label: { en: 'Save', pt: 'Salvar' }, size: 'small', variant: 'tonal' })] });
    expect(row.className).toBe('uo-bar uo-host-row uo-title-above');
    expect(row.querySelector('.uo-btn-sm')!.innerHTML).toContain('Salvar');
    const { loadBarKit } = await import('./index.js');
    const kit = await loadBarKit('pt');
    expect(kit.createBarButton({ label: { en: 'Send', pt: 'Enviar' } }).innerHTML).toContain('Enviar');
  });

  it('sem contribuição de título, o título embutido continua', async () => {
    ed.setAttribute('topbar', '');
    await settleChrome();
    expect(topbar().querySelector('.uo-title')).not.toBeNull();
  });
});

describe('título acima dos menus (compact.titlePlacement: above-menus, estilo Google Docs)', () => {
  /** plugin do hospedeiro: logo (leading), título e ações, no layout pedido */
  function stackedPlugin(placement?: 'inline' | 'above-menus'): UniversalWritePlugin {
    return {
      id: 'host.stacked',
      toolbar: (ctx) => ({
        compact: {
          ...(placement ? { titlePlacement: placement } : {}),
          leading: { id: 'host:logo', widget: () => ({ el: Object.assign(ctx.ui.createBarIcon('description', { size: 40 }), { id: 'host-logo' }) }) },
          title: { id: 'host:title', widget: () => ({ el: Object.assign(document.createElement('div'), { className: 'host-title' }) }) },
          trailing: [
            { id: 'host:preview', widget: () => ({ el: Object.assign(ctx.ui.createBarButton({ icon: 'visibility', label: 'Pré-visualizar' }), { id: 'host-preview' }) }) },
            { id: 'host:save', widget: () => ({ el: Object.assign(ctx.ui.createBarButton({ icon: 'save', label: 'Salvar', variant: 'filled' }), { id: 'host-save' }) }) },
          ],
        },
      }),
    };
  }

  it('a linha de título fica ACIMA da de menus; leading e ações nas pontas, ocupando as duas linhas', async () => {
    ed.use(stackedPlugin('above-menus'));
    ed.setAttribute('topbar', '');
    await settleChrome();
    const bar = topbar().querySelector<HTMLElement>('.uo-compact')!;
    expect(bar.classList.contains('uo-title-above')).toBe(true);
    const titlebar = bar.querySelector<HTMLElement>('.uo-titlebar')!;
    expect(titlebar.classList.contains('uo-stacked')).toBe(true);
    expect([...titlebar.children].map((c) => (c as HTMLElement).className)).toEqual(['uo-leading', 'uo-titlebar-main', 'uo-trailing']);
    expect(titlebar.querySelector('.uo-leading #host-logo')).not.toBeNull();
    expect(titlebar.querySelector('.uo-leading')!.getAttribute('part')).toBe('leading');
    const [titleRow, menuRow] = [...titlebar.querySelector('.uo-titlebar-main')!.children] as HTMLElement[];
    expect(titleRow!.className).toBe('uo-title-row');
    expect(titleRow!.querySelector('.host-title')!.classList.contains('uo-title-slot')).toBe(true);
    expect(menuRow!.className).toBe('uo-menu-row');
    expect(menuRow!.querySelector('.uo-menubar')).not.toBeNull();
    expect(menuRow!.querySelector('.uo-burger')).not.toBeNull(); // o "☰" do recolhimento continua na linha dos menus
    expect([...menuRow!.querySelectorAll('.uo-mbtn')].map((b) => (b as HTMLElement).dataset['menu'])).toContain('file');
    const trailing = titlebar.querySelector<HTMLElement>('.uo-trailing')!;
    expect([...trailing.children].map((c) => (c as HTMLElement).id)).toEqual(['host-preview', 'host-save']);
    expect(titlebar.querySelector('.uo-spacer')).toBeNull();
  });

  it('a faixa de aviso continua entre o bloco título+menus e a toolbar', async () => {
    ed.use(stackedPlugin('above-menus'));
    ed.setAttribute('topbar', '');
    await settleChrome();
    const el = Object.assign(document.createElement('div'), { className: 'host-notice' });
    ed.setNotice(el, { tone: 'error' });
    const r = topbar().querySelector<HTMLElement>('.uo-notice')!;
    expect(r.previousElementSibling!.classList.contains('uo-titlebar')).toBe(true);
    expect(r.nextElementSibling!.classList.contains('uo-toolrow')).toBe(true);
    expect(el.parentElement).toBe(r);
  });

  it('sem titlePlacement, o título já fica acima dos menus', async () => {
    ed.use(stackedPlugin());
    ed.setAttribute('topbar', '');
    await settleChrome();
    const titlebar = topbar().querySelector<HTMLElement>('.uo-titlebar')!;
    expect(titlebar.classList.contains('uo-stacked')).toBe(true);
    expect(topbar().querySelector('.uo-compact')!.classList.contains('uo-title-above')).toBe(true);
  });

  it('inline: tudo numa linha (leading antes do título, espaçador, ações)', async () => {
    ed.use(stackedPlugin('inline'));
    ed.setAttribute('topbar', '');
    await settleChrome();
    const titlebar = topbar().querySelector<HTMLElement>('.uo-titlebar')!;
    expect(titlebar.classList.contains('uo-stacked')).toBe(false);
    expect(topbar().querySelector('.uo-title-above')).toBeNull();
    const kids = [...titlebar.children] as HTMLElement[];
    expect(kids[0]!.className).toBe('uo-leading');
    expect(kids[1]!.classList.contains('host-title')).toBe(true);
    expect(kids.map((k) => k.id).slice(-2)).toEqual(['host-preview', 'host-save']);
    expect(titlebar.querySelector(':scope > .uo-menubar')).not.toBeNull();
  });

  it('o kit monta a linha mínima com a mesma geometria (título em cima, sem menus, ações à direita)', async () => {
    const seen: UniversalWriteToolbarContext[] = [];
    ed.use(hostPlugin(() => {}, seen));
    ed.setAttribute('topbar', '');
    await settleChrome();
    const ui = seen.at(-1)!.ui;
    const row = ui.createBarRow({ title: 'Doc', leading: ui.createBarIcon('description'), actions: [ui.createBarButton({ label: 'Editar' })], titlePlacement: 'above-menus' });
    expect(row.className).toBe('uo-bar uo-host-row uo-title-above');
    expect(ui.createBarRow({ title: 'Doc' }).className).toBe('uo-bar uo-host-row uo-title-above');
    expect(ui.createBarRow({ title: 'Doc', titlePlacement: 'inline' }).className).toBe('uo-bar uo-host-row');
    expect(row.querySelector('.uo-titlebar.uo-stacked > .uo-titlebar-main > .uo-title-row > .uo-title-slot')!.textContent).toBe('Doc');
    expect(row.querySelector('.uo-menu-row')!.childElementCount).toBe(0);
    expect(row.querySelector('.uo-trailing')!.childElementCount).toBe(1);
  });
});

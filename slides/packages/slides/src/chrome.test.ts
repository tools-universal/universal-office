// Barras do <universal-slides> sobre o DOM falso (o mesmo dos testes do Write):
// sem atributos não há barra nenhuma; com `topbar` vêm a barra compacta (título
// acima dos menus) ou a ribbon, o painel de miniaturas e as anotações; os
// menus têm os itens e os comandos rodam a API do elemento; `hidden-commands`
// e as contribuições dos plugins valem; tirar os atributos desmonta tudo.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../../write/test-support/fake-dom.js';
import { installColorSchemeEnv, type ColorSchemeEnv } from '../../../../write/test-support/color-scheme-env.js';
import type { UniversalSlidesElement as Slides } from './universal-slides.js';

const SAMPLES = join(__dirname, '../../../samples');
const showcase = (): Uint8Array => new Uint8Array(readFileSync(join(SAMPLES, 'showcase_animado.pptx')));

let dom: FakeDom;
let env: ColorSchemeEnv;
let Ctor: typeof Slides;
let blankDeck: () => Uint8Array;
let el: Slides;

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  dom = installFakeDom();
  Ctor = (await import('./universal-slides.js')).UniversalSlidesElement;
  blankDeck = (await import('./blank-deck.js')).blankDeck;
  await import('./chrome.js');
}, 60_000);
afterAll(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  env = installColorSchemeEnv();
  el = new Ctor();
  el.setAttribute('lang', 'pt');
  dom.document.body.appendChild(el as unknown as FakeNode);
  el.openPresentation(showcase(), { name: 'Relatório.pptx' });
});
afterEach(() => {
  (el as unknown as FakeNode).remove();
  vi.clearAllTimers();
});

/** espera o import das barras e o sync do próximo quadro */
async function settle(): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await vi.dynamicImportSettled();
    await Promise.resolve();
    vi.advanceTimersByTime(20);
  }
}

const root = (): ShadowRoot => (el as unknown as { shadowRoot: ShadowRoot }).shadowRoot;
const q = <T extends Element = HTMLElement>(sel: string): T | null => root().querySelector<T>(sel);
const qa = <T extends Element = HTMLElement>(sel: string): T[] => [...root().querySelectorAll<T>(sel)];
const layer = (): HTMLElement => q('.us-layer')!;
/** o DOM falso não reflete `dataset` em atributos nem entende combinadores: filtra à mão */
const byData = <T extends HTMLElement = HTMLElement>(sel: string, k: string, v: string, from: ParentNode = root()): T | null =>
  [...from.querySelectorAll<T>(sel)].find((e) => e.dataset[k] === v) ?? null;
const inside = <T extends Element = HTMLElement>(parent: string, sel: string): T[] => {
  const p = q(parent);
  return p ? [...p.querySelectorAll<T>(sel)] : [];
};

/** abre um menu da barra compacta e devolve os ids dos itens */
function openTopMenu(id: string): string[] {
  const b = byData<HTMLButtonElement>('.uo-mbtn', 'menu', id);
  if (!b) throw new Error(`menu ${id} ausente`);
  b.click();
  const menu = layer().querySelector('.uo-menu');
  return menu ? [...menu.querySelectorAll<HTMLElement>('.uo-menu-item')].map((x) => x.dataset['a'] ?? '') : [];
}
const menuItem = (id: string): HTMLButtonElement | null => byData<HTMLButtonElement>('.uo-menu-item', 'a', id, layer());

function key(target: EventTarget, init: { key: string; code?: string; ctrlKey?: boolean; shiftKey?: boolean }): Event {
  const e = new Event('keydown', { bubbles: true, cancelable: true, composed: true } as EventInit);
  Object.assign(e, { altKey: false, metaKey: false, ctrlKey: false, shiftKey: false, code: '', ...init });
  target.dispatchEvent(e);
  return e;
}

describe('sem atributos', () => {
  it('é só a área do slide: nem barra, nem estilos, nem estrutura nova', async () => {
    await settle();
    expect(q('.us-shell')).toBeNull();
    expect(qa<HTMLElement>('style').some((x) => 'usChrome' in x.dataset || 'uoBar' in x.dataset)).toBe(false);
    expect(el.chromeParts().wrap.parentNode).toBe(root());
    // a edição continua pela API
    el.addSlide();
    expect(el.getSlideCount()).toBe(13);
  });
});

describe('barra compacta (topbar)', () => {
  beforeEach(async () => {
    el.setAttribute('topbar', '');
    el.setAttribute('bottombar', '');
    await settle();
  });

  it('título acima dos menus, logo, menus do app e o botão Apresentar', () => {
    expect(q('.us-shell')).not.toBeNull();
    expect(el.chromeParts().wrap.parentNode).toBe(q('.us-stage'));
    const bar = q('.uo-compact')!;
    expect(bar.classList.contains('uo-title-above')).toBe(true);
    expect(q<HTMLInputElement>('.uo-title')!.value).toBe('Relatório');
    expect(q('.us-logo')).not.toBeNull();
    expect(qa<HTMLElement>('.uo-mbtn').map((b) => b.dataset['menu'])).toEqual(['file', 'edit', 'view', 'insert', 'format', 'slide', 'slideshow', 'help']);
    expect(byData('button', 'a', 'show:current')).not.toBeNull();
  });

  it('miniaturas (uma por slide), anotações e barra de status', () => {
    expect(inside('.us-thumbs', '.us-slide')).toHaveLength(12);
    expect(inside('.us-thumbs', '.us-slide').find((x) => x.classList.contains('uo-on'))!.dataset['i']).toBe('0');
    expect(q<HTMLTextAreaElement>('.us-notes-text')!.value).toBe(el.getSlideNotes(0));
    expect(q('.us-status')!.textContent).toBe('Slide 1 de 12');
  });

  it('os menus têm os itens do que o componente faz', () => {
    expect(openTopMenu('file')).toEqual(['new', 'open', 'save', 'saveAs', 'download', 'fontsInFile', 'print', 'properties']);
    expect(openTopMenu('edit')).toEqual(['undo', 'redo', 'cut', 'copy', 'paste', 'delete', 'find', 'replace']);
    expect(openTopMenu('view')).toEqual(['view:normal', 'view:sorter', 'view:reading', 'view:thumbnails', 'view:notes', 'statusbar', 'zoomMenu', 'theme', 'toolbar']);
    expect(openTopMenu('insert')).toEqual(['slide:new', 'slide:newLayout', 'slide:duplicate', 'textbox', 'image', 'shapes', 'link']);
    expect(openTopMenu('slide')).toEqual(['slide:new', 'slide:duplicate', 'slide:delete', 'slide:hide', 'slide:up', 'slide:down', 'layout', 'background', 'transition']);
    expect(openTopMenu('slideshow')).toEqual(['show:start', 'show:current', 'show:auto', 'show:setup', 'slide:hide', 'animation:preview', 'animation:pane']);
    expect(openTopMenu('help')).toEqual(['shortcuts', 'about']);
  });

  it('itens sem alvo ficam desabilitados (formatação sem forma selecionada)', () => {
    openTopMenu('edit');
    expect(menuItem('undo')!.disabled).toBe(true);
    expect(menuItem('cut')!.disabled).toBe(true);
    openTopMenu('format');
    expect(layer().querySelector('.uo-menu')).not.toBeNull();
  });

  it('os comandos rodam a API: novo slide, ocultar, desfazer, excluir', async () => {
    openTopMenu('insert');
    menuItem('slide:new')!.click();
    await settle();
    expect(el.getSlideCount()).toBe(13);
    expect(el.getSlideIndex()).toBe(1);
    expect(inside('.us-thumbs', '.us-slide')).toHaveLength(13);
    expect(q('.us-status')!.textContent).toBe('Slide 2 de 13');
    openTopMenu('slide');
    menuItem('slide:hide')!.click();
    await settle();
    expect(el.isSlideHidden(1)).toBe(true);
    expect(inside('.us-thumbs', '.us-slide').find((x) => x.classList.contains('uo-on'))!.classList.contains('us-is-hidden')).toBe(true);
    openTopMenu('edit');
    menuItem('undo')!.click();
    menuItem('undo')?.click();
    await settle();
    expect(el.isSlideHidden(1)).toBe(false);
    openTopMenu('edit');
    menuItem('undo')!.click();
    await settle();
    expect(el.getSlideCount()).toBe(12);
    openTopMenu('slide');
    menuItem('slide:delete')!.click();
    await settle();
    expect(el.getSlideCount()).toBe(11);
  });

  it('atalhos do PowerPoint: Ctrl+M, Ctrl+Z, F5 e Shift+F5', async () => {
    const canvas = el.chromeParts().canvas;
    key(canvas, { key: 'm', code: 'KeyM', ctrlKey: true });
    expect(el.getSlideCount()).toBe(13);
    key(canvas, { key: 'z', code: 'KeyZ', ctrlKey: true });
    expect(el.getSlideCount()).toBe(12);
    const present = vi.spyOn(el, 'present').mockImplementation(() => {});
    key(canvas, { key: 'F5', code: 'F5' });
    expect(present).toHaveBeenLastCalledWith('start');
    el.selectSlide(3);
    key(canvas, { key: 'F5', code: 'F5', shiftKey: true });
    expect(present).toHaveBeenLastCalledWith(3);
  });

  it('com a forma selecionada, a formatação vale para o texto dela', async () => {
    const hit = el.findText('O que esta apresentação')[0]!;
    el.selectSlide(hit.slide);
    el.selectShape(hit.shape);
    const info = el.getShapeInfo();
    expect(info).not.toBeNull();
    await settle();
    // (no DOM falso a linha de ferramentas da compacta não mede largura e fica guardada: o atalho)
    const before = el.getTextFormat()!.bold;
    key(el.chromeParts().canvas, { key: 'b', code: 'KeyB', ctrlKey: true });
    expect(el.getTextFormat()!.bold).toBe(!before);
    key(el.chromeParts().canvas, { key: 'e', code: 'KeyE', ctrlKey: true });
    expect(el.getTextFormat()!.align).toBe('ctr');
    key(el.chromeParts().canvas, { key: ']', code: 'BracketRight', ctrlKey: true });
    expect(el.getTextFormat()!.size).toBe(36);
    // o arquivo salvo tem a formatação
    const bytes = await el.savePptx();
    const again = new Ctor();
    again.loadPptx(bytes);
    again.selectSlide(hit.slide);
    again.selectShape(hit.shape);
    expect(again.getTextFormat()).toMatchObject({ bold: !before, align: 'ctr', size: 36 });
  });

  it('Classificação de Slides e volta ao Normal', async () => {
    openTopMenu('view');
    menuItem('view:sorter')!.click();
    await settle();
    expect(q('.us-shell')!.classList.contains('us-view-sorter')).toBe(true);
    expect(q('.us-sorter')!.hidden).toBe(false);
    expect(inside('.us-sorter', '.us-slide')).toHaveLength(12);
    key(q('.us-sorter')!, { key: 'Escape', code: 'Escape' });
    await settle();
    expect(q('.us-shell')!.classList.contains('us-view-sorter')).toBe(false);
  });

  it('miniaturas e anotações liga/desliga pelo Exibir', async () => {
    openTopMenu('view');
    menuItem('view:thumbnails')!.click();
    await settle();
    expect(q('.us-thumbs')!.hidden).toBe(true);
    openTopMenu('view');
    menuItem('view:notes')!.click();
    await settle();
    expect(q('.us-notes')!.hidden).toBe(true);
  });

  it('anotações escritas no painel vão para o arquivo', async () => {
    const area = q<HTMLTextAreaElement>('.us-notes-text')!;
    area.value = 'Nova anotação';
    area.dispatchEvent(new Event('blur'));
    await settle();
    expect(el.getSlideNotes(0)).toBe('Nova anotação');
    expect(el.isDirty()).toBe(true);
  });

  it('texto digitado nas anotações já conta como alteração para o host (fechar pergunta)', async () => {
    const dirty: boolean[] = [];
    el.appHost = { setDirty: (d: boolean) => { dirty.push(d); } };
    await settle();
    expect(el.isDirty()).toBe(false);
    const area = q<HTMLTextAreaElement>('.us-notes-text')!;
    area.value = 'Antes de fechar';
    area.dispatchEvent(new Event('input'));
    expect(dirty.at(-1)).toBe(true);
    expect(el.isDirty()).toBe(false);
    area.value = el.getSlideNotes(0);
    area.dispatchEvent(new Event('input'));
    expect(dirty.at(-1)).toBe(false);
  });

  it('salvar logo depois de digitar a anotação leva o texto ainda pendente', async () => {
    let saved: Uint8Array | null = null;
    el.appHost = { saveFile: async (bytes: Uint8Array) => { saved = bytes; return 'C:/tmp/Relatório.pptx'; } };
    const area = q<HTMLTextAreaElement>('.us-notes-text')!;
    area.value = 'Digitada e salva na hora';
    area.dispatchEvent(new Event('input'));
    const { appFor } = await import('./chrome-app.js');
    expect(await appFor(el).save(false)).toBe(true);
    const reopened = new Ctor();
    dom.document.body.appendChild(reopened as unknown as FakeNode);
    reopened.openPresentation(saved!, { name: 'Relatório.pptx' });
    await settle();
    expect(reopened.getSlideNotes(0)).toBe('Digitada e salva na hora');
    (reopened as unknown as FakeNode).remove();
  });

  it('o título renomeia o documento', async () => {
    const t = q<HTMLInputElement>('.uo-title')!;
    t.value = 'Planejamento 2027';
    t.dispatchEvent(new Event('change'));
    expect(el.documentName).toBe('Planejamento 2027');
  });

  it('janela sem moldura: appHost.windowControlsOverlay liga .uo-wco na linha de título', async () => {
    el.appHost = { windowControlsOverlay: true };
    el.addSlide();
    await settle();
    expect(q('.us-top')!.classList.contains('uo-wco')).toBe(true);
  });
});

describe('hidden-commands', () => {
  it('tira menus, comandos e grupos das barras', async () => {
    el.setAttribute('hidden-commands', 'slideshow, new textbox slides');
    el.setAttribute('topbar', '');
    await settle();
    expect(qa<HTMLElement>('.uo-mbtn').map((b) => b.dataset['menu'])).not.toContain('slideshow');
    expect(openTopMenu('file')).not.toContain('new');
    expect(openTopMenu('insert')).not.toContain('textbox');
    expect(byData('.uo-g', 'g', 'slides')).toBeNull();
  });

  it('comando oculto também não tem atalho', async () => {
    el.setAttribute('hidden-commands', 'slide:new');
    el.setAttribute('topbar', '');
    await settle();
    key(el.chromeParts().canvas, { key: 'm', code: 'KeyM', ctrlKey: true });
    expect(el.getSlideCount()).toBe(12);
  });
});

describe('ribbon', () => {
  it('guias do PowerPoint; Formato da Forma só com uma forma selecionada', async () => {
    el.setAttribute('toolbar', 'ribbon');
    el.setAttribute('topbar', '');
    await settle();
    expect(q('.uo-ribbon')).not.toBeNull();
    const tabs = (): string[] => qa<HTMLElement>('.uo-tab').filter((t) => !t.hidden).map((t) => t.dataset['tab']!);
    expect(tabs()).toEqual(['file', 'home', 'insert', 'design', 'transitions', 'animations', 'slideshow', 'view']);
    expect(byData('.uo-btn', 'a', 'slide:new', q('.uo-ribbon')!)).not.toBeNull();
    expect(byData('.uo-btn', 'a', 'transition:preview', q('.uo-ribbon')!)).not.toBeNull();
    const hit = el.findText('O que esta apresentação')[0]!;
    el.selectSlide(hit.slide);
    el.selectShape(hit.shape);
    await settle();
    expect(tabs()).toContain('shape-format');
    const italic = byData<HTMLButtonElement>('.uo-btn', 'a', 'italic', q('.uo-ribbon')!)!;
    expect(italic.disabled).toBe(false);
    italic.click();
    expect(el.getTextFormat()!.italic).toBe(true);
    el.selectShape(null);
    await settle();
    expect(tabs()).not.toContain('shape-format');
  });

  it('a guia Arquivo abre o menu de arquivo', async () => {
    el.setAttribute('toolbar', 'ribbon');
    el.setAttribute('topbar', '');
    await settle();
    byData<HTMLButtonElement>('.uo-tab', 'tab', 'file')!.click();
    const ids = [...layer().querySelectorAll<HTMLElement>('.uo-menu .uo-menu-item')].map((x) => x.dataset['a']);
    expect(ids).toEqual(['new', 'open', 'save', 'saveAs', 'download', 'fontsInFile', 'print', 'properties']);
  });
});

describe('plugins', () => {
  it('a contribuição acrescenta comando, menu e guia', async () => {
    const run = vi.fn();
    el.use({
      id: 'acme',
      toolbar: (ctx) => ({
        commands: [{ id: 'acme:hello', label: { en: 'Hello', pt: 'Olá', es: 'Hola' }, icon: 'send', run }],
        compact: { menus: [{ id: 'acme', label: 'Acme', items: ['acme:hello'], before: 'help' }] },
        ribbon: { tabs: [{ id: 'acme', label: 'Acme', groups: [{ id: 'g', label: 'G', cells: [{ cmd: 'acme:hello', size: 'large' }] }] }] },
        ...(ctx.lang === 'pt' ? {} : {}),
      }),
    });
    el.setAttribute('topbar', '');
    await settle();
    expect(qa<HTMLElement>('.uo-mbtn').map((b) => b.dataset['menu']).slice(-2)).toEqual(['acme', 'help']);
    expect(openTopMenu('acme')).toEqual(['acme:hello']);
    menuItem('acme:hello')!.click();
    expect(run).toHaveBeenCalledTimes(1);
    el.setAttribute('toolbar', 'ribbon');
    await settle();
    expect(byData('.uo-tab', 'tab', 'acme')).not.toBeNull();
    el.unuse('acme');
    await settle();
    expect(byData('.uo-tab', 'tab', 'acme')).toBeNull();
  });
});

describe('desmontar e só a barra de status', () => {
  it('tirar topbar e bottombar restaura a estrutura original', async () => {
    el.setAttribute('topbar', '');
    el.setAttribute('bottombar', '');
    await settle();
    expect(q('.us-shell')).not.toBeNull();
    el.removeAttribute('topbar');
    el.removeAttribute('bottombar');
    await settle();
    expect(q('.us-shell')).toBeNull();
    expect(qa<HTMLElement>('style').some((x) => 'usChrome' in x.dataset)).toBe(false);
    expect(el.chromeParts().wrap.parentNode).toBe(root());
    expect(el.chromeParts().wrap.classList.contains('us-wrap')).toBe(false);
  });

  it('bottombar sozinho: status sem miniaturas', async () => {
    el.setAttribute('bottombar', '');
    await settle();
    expect(q('.us-status')!.textContent).toBe('Slide 1 de 12');
    expect(q('.us-thumbs')).toBeNull();
    expect(q('.uo-bar.uo-compact')).toBeNull();
  });

  it('apresentação nova pelo Arquivo › Novo', async () => {
    el.setAttribute('topbar', '');
    await settle();
    openTopMenu('file');
    menuItem('new')!.click();
    await settle();
    expect(el.getSlideCount()).toBe(1);
    expect(q<HTMLInputElement>('.uo-title')!.value).toBe('Apresentação sem título');
    expect(el.getLayouts()).toHaveLength(6);
    void blankDeck;
  });
});

describe('claro/escuro', () => {
  it('paleta própria sem os tokens da página; segue o color-scheme do contexto', async () => {
    el.setAttribute('topbar', '');
    await settle();
    expect(qa<HTMLElement>('style').some((x) => 'usPalette' in x.dataset)).toBe(true);
    expect(el.effectiveTheme).toBe('light');
    const seen: string[] = [];
    el.addEventListener('us-theme-change', ((e: CustomEvent<{ theme: string }>) => seen.push(e.detail.theme)) as EventListener);
    env.context = 'dark';
    env.settle(el as unknown as Element);
    expect(el.effectiveTheme).toBe('dark');
    expect(seen).toEqual(['dark']);
    el.setAttribute('theme', 'light');
    expect(q('style[data-uo-scheme]')?.textContent).toContain('light');
  });
});

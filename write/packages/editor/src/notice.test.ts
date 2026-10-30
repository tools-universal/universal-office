// Faixa de aviso do hospedeiro (setNotice): entre a linha de título/menus e as
// ferramentas, na compacta e na ribbon, sobrevivendo à troca de barra.
// Elemento de verdade sobre o DOM falso.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../test-support/fake-dom.js';
import { installColorSchemeEnv } from '../../../test-support/color-scheme-env.js';
import type { UniversalWriteElement as Editor } from './universal-write.js';
import type { UniversalWriteFontAsset } from './plugins.js';
import { EXTERNAL_LINK_FEATURES, openExternalLink } from './external-link.js';

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
  ed.hiddenCommands = ['tools', 'style', 'font', 'size', 'save'];
  dom.document.body.appendChild(ed as unknown as FakeNode);
  await ed.initialize({ fonts: FONT_ASSETS });
});
afterEach(() => {
  (ed as unknown as FakeNode).remove();
  vi.clearAllTimers();
});

async function settleChrome(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await vi.dynamicImportSettled();
    await Promise.resolve();
    vi.advanceTimersByTime(20);
  }
}

const topbar = (): HTMLElement => (ed as unknown as { shadowRoot: ShadowRoot }).shadowRoot.querySelector<HTMLElement>('.uw-topbar')!;
const region = (): HTMLElement => topbar().querySelector<HTMLElement>('.uo-notice')!;

function notice(text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'host-notice';
  el.textContent = text;
  return el;
}

describe('setNotice', () => {
  it('compacta: a faixa fica entre a linha de título/menus e a de ferramentas, oculta sem aviso', async () => {
    ed.setAttribute('topbar', '');
    await settleChrome();
    const r = region();
    expect(r).not.toBeNull();
    expect(r.hidden).toBe(true);
    expect(r.getAttribute('part')).toBe('notice');
    expect(r.getAttribute('role')).toBe('status');
    expect(r.previousElementSibling!.classList.contains('uo-titlebar')).toBe(true);
    expect(r.nextElementSibling!.classList.contains('uo-toolrow')).toBe(true);

    const el = notice('Documento em edição por outra pessoa');
    ed.setNotice(el, { tone: 'warning' });
    expect(r.hidden).toBe(false);
    expect(r.dataset['tone']).toBe('warning');
    expect(el.parentElement).toBe(r);
    expect(ed.notice).toBe(el);
  });

  it('aviso posto antes das barras aparece quando elas montam; null tira o elemento', async () => {
    const el = notice('Pouco espaço de armazenamento');
    ed.setNotice(el);
    ed.setAttribute('topbar', '');
    await settleChrome();
    expect(region().hidden).toBe(false);
    expect(region().dataset['tone']).toBe('info');
    expect(el.parentElement).toBe(region());

    ed.setNotice(null);
    expect(region().hidden).toBe(true);
    expect(el.parentElement).toBeNull();
    expect(ed.notice).toBeNull();
  });

  it('ribbon: a faixa fica antes das guias e o aviso sobrevive à troca de barra', async () => {
    const el = notice('Somente leitura');
    ed.setAttribute('topbar', '');
    await settleChrome();
    ed.setNotice(el, { tone: 'error' });

    ed.setAttribute('toolbar', 'ribbon');
    await settleChrome();
    const r = region();
    expect(topbar().querySelector('.uo-ribbon')).not.toBeNull();
    expect(r.previousElementSibling!.classList.contains('uo-titlebar')).toBe(true);
    expect(r.nextElementSibling!.classList.contains('uo-tabs')).toBe(true);
    expect(el.parentElement).toBe(r);
    expect(r.dataset['tone']).toBe('error');
    expect(r.hidden).toBe(false);
  });
});

describe('Ctrl+clique em hiperlink (openExternalLink)', () => {
  it('http, https e mailto abrem numa aba nova sem opener nem Referer', () => {
    const open = vi.fn();
    for (const url of ['https://example.com/a', 'http://x.test/', 'mailto:a@b.c']) {
      expect(openExternalLink(url, open)).toBe(true);
      expect(open).toHaveBeenLastCalledWith(url, '_blank', 'noopener,noreferrer');
    }
    expect(EXTERNAL_LINK_FEATURES).toBe('noopener,noreferrer');
  });

  it('outros esquemas e âncoras não abrem nada', () => {
    const open = vi.fn();
    for (const url of ['javascript:alert(1)', 'data:text/html,x', 'file:///c:/x', '#_Toc1', 'vbscript:x', ' https://x']) {
      expect(openExternalLink(url, open)).toBe(false);
    }
    expect(open).not.toHaveBeenCalled();
  });
});

// Política de formatação nas barras do <universal-write> (compacta e ribbon):
// os comandos, grupos, guias e galerias fora da política somem; os botões de
// lista ficam simples (sem a galeria). Elemento de verdade sobre o DOM falso.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../test-support/fake-dom.js';
import { installColorSchemeEnv, type ColorSchemeEnv } from '../../../test-support/color-scheme-env.js';
import type { UniversalWriteElement as Editor } from './universal-write.js';
import type { UniversalWriteFontAsset } from './plugins.js';
import { TEMPLATE_DOCUMENT_POLICY } from './formatting-policy.js';

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
  ed.hiddenCommands = ['style:combo', 'font:family', 'font:size', 'tools', 'save'];
  ed.setAttribute('toolbar', 'ribbon');
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

/** ids (data-a) dos controles montados na barra (o DOM falso não reflete dataset em atributo) */
function ids(): string[] {
  const out = new Set<string>();
  const walk = (el: HTMLElement): void => {
    const a = el.dataset?.['a'];
    if (a) out.add(a);
    for (const c of Array.from(el.children ?? [])) walk(c as HTMLElement);
  };
  walk(topbar());
  return [...out].sort();
}

describe('ribbon com a política "documento com modelo"', () => {
  it('somem fonte/tamanho, sobrescrito, espaçamento, bordas, sombreamento, página, cabeçalho, estilos (painel), pincel, formas e as galerias de lista', async () => {
    ed.setAttribute('topbar', '');
    await settleChrome();
    const before = new Set(ids());
    // sem política estão lá (o teste vale)
    for (const id of ['list:bullet:menu', 'list:multi', 'shading', 'home:borders', 'spacing', 'dlg:paragraph', 'margins', 'orientation',
      'hf:headerMenu', 'styles:pane', 'view:ruler', 'painter', 'textbox:menu', 'pspacing', 'watermark:menu', 'indent:left', 'toc:menu', 'cover:menu']) {
      expect(before.has(id), id).toBe(true);
    }

    ed.formattingPolicy = TEMPLATE_DOCUMENT_POLICY;
    await settleChrome();
    const after = new Set(ids());
    for (const id of ['list:bullet:menu', 'list:decimal:menu', 'list:multi', 'shading', 'home:borders', 'spacing', 'spacing:before', 'dlg:paragraph',
      'margins', 'orientation', 'pageSize', 'dlg:page', 'hf:headerMenu', 'styles:pane', 'view:ruler', 'painter', 'textbox:menu', 'pspacing',
      'watermark:menu', 'pageColor:menu', 'indent:left', 'indent:caption', 'toc:menu', 'cover:menu', 'lineNumbers', 'hyphenation',
      'sup', 'sub', 'underline:menu', 'grow', 'shrink', 'fx:menu', 'dlg:font']) {
      expect(after.has(id), id).toBe(false);
    }
    // o que o Quill tinha fica; marcador e numerada como botões simples (sem a seta da galeria)
    for (const id of ['align:left', 'align:center', 'align:right', 'align:both', 'indent', 'outdent', 'list:bullet', 'list:decimal',
      'link', 'image', 'table:menu', 'pagebreak', 'columns', 'gallery:styles', 'undo', 'redo', 'paste',
      'bold', 'italic', 'underline', 'strike', 'color', 'color:menu', 'highlight', 'highlight:menu']) {
      expect(after.has(id), id).toBe(true);
    }
  });

  it('a política pelo atributo e tirar a política devolvem a barra inteira', async () => {
    ed.setAttribute('formatting-policy', 'template-document');
    ed.setAttribute('topbar', '');
    await settleChrome();
    expect(ids()).not.toContain('margins');
    ed.formattingPolicy = null;
    await settleChrome();
    expect(ids()).toContain('margins');
  });
});

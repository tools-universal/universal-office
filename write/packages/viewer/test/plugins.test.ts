/**
 * Plugins e cliques do <universal-document-viewer>: registro global
 * (register/unregister), `udv-link-click` (padrão: abre só http/https/mailto com
 * noopener,noreferrer; âncora vai para goToBookmark; preventDefault cancela) e
 * `udv-inline-click`, e a guarda do customElements.define. Elemento de verdade
 * sobre o DOM falso (write/test-support); fontes ABERTAS versionadas servidas
 * por um fetch falso: roda no CI.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { blankDocxPackage, type CustomInline, type DocumentLink } from '@universal-office/docx-core';
import type { RunBox } from '@universal-office/docx-layout';
import { installFakeDom, mouseEvent, type FakeDom, type FakeElement, type FakeNode } from '../../../test-support/fake-dom.js';
import type { UniversalDocumentViewerElement as Viewer } from '../src/universal-document-viewer.js';
import type { UniversalDocumentViewerPlugin, ViewerInlineClickDetail, ViewerLinkClickDetail } from '../src/plugins.js';

const ROOT = join(__dirname, '..', '..', '..', '..');
const FONT_DIRS = [join(ROOT, 'write', 'packages', 'editor', 'demo', 'fonts'), join(ROOT, 'shared', 'fonts', 'files')];
const FONTS_BASE = 'http://fonts.test';

/** fetch falso: as fontes abertas do repositório em http://fonts.test/<arquivo>; o resto, 404. */
const fakeFetch = async (input: string | URL): Promise<Response> => {
  const url = String(input);
  if (url.startsWith(`${FONTS_BASE}/`)) {
    const file = url.slice(FONTS_BASE.length + 1);
    for (const dir of FONT_DIRS) {
      const path = join(dir, file);
      if (/^[\w.-]+\.ttf$/.test(file) && existsSync(path)) return new Response(new Uint8Array(readFileSync(path)));
    }
  }
  return new Response(null, { status: 404 });
};

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const r = (t: string): string => `<w:r><w:t xml:space="preserve">${t}</w:t></w:r>`;
const LINKS: [string, string][] = [['rIdWeb', 'https://exemplo.test/politica'], ['rIdMail', 'mailto:etica@exemplo.test'], ['rIdJs', 'javascript:alert(1)']];

/** .docx: links externos (https, mailto, javascript), link interno para um indicador e um inline de plugin. */
function sampleDocx(): Uint8Array {
  const pkg = blankDocxPackage();
  pkg.setPartText('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    + LINKS.map(([id, url]) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${url}" TargetMode="External"/>`).join('')
    + '</Relationships>');
  const tag = `wordnext:inline:acme.mark:${encodeURIComponent(JSON.stringify({ id: 7 }))}`;
  pkg.setPartText('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>`
    + `<w:p>${r('Veja ')}<w:hyperlink r:id="rIdWeb">${r('o site')}</w:hyperlink>${r(' e ')}<w:hyperlink r:id="rIdMail">${r('escreva')}</w:hyperlink></w:p>`
    + `<w:p><w:hyperlink r:id="rIdJs">${r('perigo')}</w:hyperlink>${r(' ou ')}<w:hyperlink w:anchor="cap2">${r('capítulo 2')}</w:hyperlink></w:p>`
    + `<w:p>${r('Marca: ')}<w:sdt><w:sdtPr><w:tag w:val="${tag}"/></w:sdtPr><w:sdtContent>${r('Integridade')}</w:sdtContent></w:sdt></w:p>`
    + '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
    + `<w:p><w:bookmarkStart w:id="0" w:name="cap2"/>${r('Capítulo 2')}<w:bookmarkEnd w:id="0"/></w:p>`
    + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'
    + '</w:body></w:document>');
  return pkg.save();
}

let dom: FakeDom;
let Ctor: typeof Viewer;
const live: Viewer[] = [];

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  dom = installFakeDom();
  vi.stubGlobal('fetch', fakeFetch);
  Ctor = (await import('../src/universal-document-viewer.js')).UniversalDocumentViewerElement;
}, 60_000);
afterAll(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
afterEach(() => {
  for (const el of live.splice(0)) (el as unknown as FakeNode).remove();
  for (const id of ['acme.a', 'acme.b']) Ctor.unregister(id);
  vi.clearAllTimers();
});

const connected = (): Viewer => {
  const el = new Ctor();
  el.setAttribute('fonts', FONTS_BASE);
  dom.document.body.appendChild(el as unknown as FakeNode);
  live.push(el);
  return el;
};

const plugin = (id: string, inline?: string, setup?: UniversalDocumentViewerPlugin['setup']): UniversalDocumentViewerPlugin => ({
  id,
  ...(inline ? { inlineRenderers: [{ type: inline, toText: () => inline }] } : {}),
  ...(setup ? { setup } : {}),
});

describe('UniversalDocumentViewerElement.register / unregister', () => {
  it('instância já conectada recebe na hora; instância nova recebe ao conectar; unregister tira das duas', () => {
    const a = connected();
    const added = vi.fn();
    a.addEventListener('udv-plugin-added', added);
    const cleanup = vi.fn();
    Ctor.register(plugin('acme.a', 'acme.mark', () => cleanup));
    expect(a.pluginIds()).toEqual(['acme.a']);
    expect(added).toHaveBeenCalledTimes(1);

    const b = connected();
    expect(b.pluginIds()).toEqual(['acme.a']);

    expect(Ctor.unregister('acme.a')).toBe(true);
    expect([a.pluginIds(), b.pluginIds()]).toEqual([[], []]);
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it('não mexe no plugin instalado com use(); conflito vira aviso e não interrompe a conexão', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const a = connected();
      a.use(plugin('acme.b', 'acme.mark'));
      expect(() => Ctor.register(plugin('acme.a', 'acme.mark'))).not.toThrow();
      expect(a.pluginIds()).toEqual(['acme.b']);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('[universal-document-viewer] plugin "acme.a"'), expect.any(Error));
      const b = connected();
      expect(b.isConnected).toBe(true);
      expect(b.pluginIds()).toEqual(['acme.a']);
      Ctor.unregister('acme.a');
      expect(a.pluginIds()).toEqual(['acme.b']);
    } finally {
      warn.mockRestore();
    }
  });
});

describe('cliques nas páginas', () => {
  type Internals = { pageEls: FakeElement[]; linkBoxes: RunBox<string>[][]; inlineBoxes: RunBox<CustomInline>[][]; layout: { pages: { widthTw: number; heightTw: number }[] } };

  /** Viewer com a amostra carregada; cada página na tela com 1 px = 1 twip. */
  const loaded = async (): Promise<{ v: Viewer; internals: Internals }> => {
    const v = connected();
    await v.loadDocx(sampleDocx());
    const internals = v as unknown as Internals;
    internals.pageEls.forEach((el, i) => {
      const p = internals.layout.pages[i]!;
      el.getBoundingClientRect = () => ({ left: 0, top: 0, right: p.widthTw, bottom: p.heightTw, x: 0, y: 0, width: p.widthTw, height: p.heightTw, toJSON: () => ({}) }) as DOMRect;
    });
    return { v, internals };
  };
  /** Clique no meio da caixa (página e twips = px). */
  const clickBox = (internals: Internals, page: number, box: { x: number; y: number; w: number; h: number }): void => {
    internals.pageEls[page]!.dispatchEvent(mouseEvent('click', { clientX: box.x + box.w / 2, clientY: box.y + box.h / 2 }));
  };
  const linkBox = (internals: Internals, target: string): { page: number; box: RunBox<string> } => {
    for (const [page, boxes] of internals.linkBoxes.entries()) {
      const box = boxes.find((b) => b.value === target);
      if (box) return { page, box };
    }
    throw new Error(`link ${target} fora das páginas`);
  };

  it('getLinks e getCustomInlines leem o documento', async () => {
    const { v } = await loaded();
    expect(v.getLinks()).toEqual<DocumentLink[]>([
      { address: 'https://exemplo.test/politica', text: 'o site' },
      { address: 'mailto:etica@exemplo.test', text: 'escreva' },
      { address: 'javascript:alert(1)', text: 'perigo' },
      { anchor: 'cap2', text: 'capítulo 2' },
    ]);
    expect(v.getCustomInlines()).toEqual([{ type: 'acme.mark', data: { id: 7 }, fallbackText: 'Integridade' }]);
  });

  it('padrão: http/https/mailto abrem numa aba nova com noopener,noreferrer; outros esquemas não abrem', async () => {
    const { v, internals } = await loaded();
    const seen: ViewerLinkClickDetail[] = [];
    v.addEventListener('udv-link-click', (e) => seen.push((e as CustomEvent<ViewerLinkClickDetail>).detail));

    const web = linkBox(internals, 'https://exemplo.test/politica');
    clickBox(internals, web.page, web.box);
    const mail = linkBox(internals, 'mailto:etica@exemplo.test');
    clickBox(internals, mail.page, mail.box);
    const js = linkBox(internals, 'javascript:alert(1)');
    clickBox(internals, js.page, js.box);

    expect(seen.map((d) => [d.address, d.text, d.page])).toEqual([
      ['https://exemplo.test/politica', 'o site', 0], ['mailto:etica@exemplo.test', 'escreva', 0], ['javascript:alert(1)', 'perigo', 0],
    ]);
    expect(dom.opened).toEqual([
      ['https://exemplo.test/politica', '_blank', 'noopener,noreferrer'],
      ['mailto:etica@exemplo.test', '_blank', 'noopener,noreferrer'],
    ]);
  });

  it('âncora vai para o indicador (goToBookmark) e o evento traz o nome', async () => {
    const { v, internals } = await loaded();
    const go = vi.spyOn(v, 'goToBookmark');
    const seen: ViewerLinkClickDetail[] = [];
    v.addEventListener('udv-link-click', (e) => seen.push((e as CustomEvent<ViewerLinkClickDetail>).detail));
    const anchor = linkBox(internals, '#cap2');
    clickBox(internals, anchor.page, anchor.box);
    expect(seen).toEqual([{ anchor: 'cap2', text: 'capítulo 2', page: anchor.page }]);
    expect(go).toHaveBeenCalledWith('cap2');
    expect(go.mock.results[0]!.value).toBe(true);
    expect(v.goToBookmark('nao-existe')).toBe(false);
  });

  it('preventDefault no udv-link-click: nada abre e a âncora não navega', async () => {
    const { v, internals } = await loaded();
    const go = vi.spyOn(v, 'goToBookmark');
    v.addEventListener('udv-link-click', (e) => e.preventDefault());
    const opened = dom.opened.length;
    for (const target of ['https://exemplo.test/politica', '#cap2']) {
      const { page, box } = linkBox(internals, target);
      clickBox(internals, page, box);
    }
    expect(dom.opened.length).toBe(opened);
    expect(go).not.toHaveBeenCalled();
  });

  it('clique num inline de plugin dispara udv-inline-click com o tipo, os dados e a página', async () => {
    const { v, internals } = await loaded();
    const seen: ViewerInlineClickDetail[] = [];
    const links = vi.fn();
    v.addEventListener('udv-inline-click', (e) => seen.push((e as CustomEvent<ViewerInlineClickDetail>).detail));
    v.addEventListener('udv-link-click', links);
    const page = internals.inlineBoxes.findIndex((boxes) => boxes.length > 0);
    clickBox(internals, page, internals.inlineBoxes[page]![0]!);
    expect(seen).toEqual([{ type: 'acme.mark', data: { id: 7 }, fallbackText: 'Integridade', page }]);
    expect(links).not.toHaveBeenCalled();
  });
});

describe('carga dupla do módulo', () => {
  it('importar o viewer duas vezes não lança (customElements.define com guarda)', async () => {
    expect(dom.customElements.define.mock.calls.filter(([n]) => n === 'universal-document-viewer')).toHaveLength(1);
    vi.resetModules();
    const again = await import('../src/universal-document-viewer.js');
    expect(again.UniversalDocumentViewerElement).not.toBe(Ctor);
    expect(dom.customElements.define.mock.calls.filter(([n]) => n === 'universal-document-viewer')).toHaveLength(1);
    expect(dom.customElements.get('universal-document-viewer')).toBe(Ctor);
  });
});

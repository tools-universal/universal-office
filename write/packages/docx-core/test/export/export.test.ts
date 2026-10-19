import { describe, it, expect } from 'vitest';
import { DEFAULT_RUN_PROPS, type Paragraph, type RunProps, type TableBlock } from '../../src/index.js';
import { toHtml } from '../../src/export/html.js';
import { toMarkdown } from '../../src/export/markdown.js';
import type { ExportDoc } from '../../src/export/model.js';

const rp = (o: Partial<RunProps> = {}): RunProps => ({ ...DEFAULT_RUN_PROPS, ...o });
const para = (text: string, props: Paragraph['props'] = {}, rprops: Partial<RunProps> = {}): Paragraph => ({
  runs: [{ text, props: rp(rprops) }],
  props,
});

describe('toHtml', () => {
  it('títulos viram h1..h6', () => {
    const doc: ExportDoc = { paragraphs: [para('Cap', { styleId: 'Heading2' })] };
    expect(toHtml(doc, { fullDocument: false })).toBe('<h2>Cap</h2>');
  });

  it('negrito/itálico/link', () => {
    const doc: ExportDoc = {
      paragraphs: [{
        runs: [
          { text: 'a', props: rp({ bold: true }) },
          { text: 'b', props: rp({ italic: true }) },
          { text: 'link', props: rp({ link: 'https://x.com' }) },
        ],
        props: {},
      }],
    };
    const h = toHtml(doc, { fullDocument: false });
    expect(h).toContain('<strong>a</strong>');
    expect(h).toContain('<em>b</em>');
    expect(h).toContain('<a href="https://x.com">link</a>');
  });

  it('listas aninhadas (ul/ol)', () => {
    const doc: ExportDoc = {
      paragraphs: [
        para('a', { numbering: { kind: 'bullet', ilvl: 0 } }),
        para('a.1', { numbering: { kind: 'bullet', ilvl: 1 } }),
        para('b', { numbering: { kind: 'bullet', ilvl: 0 } }),
      ],
    };
    const h = toHtml(doc, { fullDocument: false });
    expect(h).toBe('<ul><li>a<ul><li>a.1</li></ul></li><li>b</li></ul>');
  });

  it('tabela com colspan e shading', () => {
    const table: TableBlock = {
      type: 'table',
      gridColsTwips: [1000, 1000],
      rows: [{ cells: [
        { paragraphs: [para('h1')], tables: [], gridSpan: 2, shadingHex: 'eeeeee' },
      ] }, { cells: [
        { paragraphs: [para('c1')], tables: [], gridSpan: 1 },
        { paragraphs: [para('c2')], tables: [], gridSpan: 1 },
      ] }],
    };
    const doc: ExportDoc = { paragraphs: [para('antes')], tableAnchors: [{ beforePara: 1, table }] };
    const h = toHtml(doc, { fullDocument: false });
    expect(h).toContain('colspan="2"');
    expect(h).toContain('background-color:#eeeeee');
    expect(h.indexOf('antes')).toBeLessThan(h.indexOf('<table>')); // ordem preservada
  });

  it('comentário inline + lista de comentários', () => {
    const doc: ExportDoc = {
      paragraphs: [{ runs: [{ text: 'oi', props: rp({ commentIds: [3] }) }], props: {} }],
      comments: [{ id: 3, author: 'Ana', text: 'rever isto' }],
    };
    const h = toHtml(doc, { fullDocument: false });
    expect(h).toContain('class="uw-comment"');
    expect(h).toContain('rever isto');
    expect(h).toContain('Comentários');
  });

  it('documento completo tem doctype e título', () => {
    const h = toHtml({ paragraphs: [para('x')], title: 'Meu Doc' });
    expect(h.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(h).toContain('<title>Meu Doc</title>');
  });
});

describe('toMarkdown', () => {
  it('títulos e ênfase', () => {
    const doc: ExportDoc = {
      paragraphs: [
        para('Título', { styleId: 'Heading1' }),
        { runs: [{ text: 'bold', props: rp({ bold: true }) }, { text: ' normal', props: rp() }], props: {} },
      ],
    };
    const md = toMarkdown(doc);
    expect(md).toContain('# Título');
    expect(md).toContain('**bold** normal');
  });

  it('lista e tabela GFM', () => {
    const table: TableBlock = {
      type: 'table', gridColsTwips: [1, 1],
      rows: [
        { cells: [{ paragraphs: [para('A')], tables: [], gridSpan: 1 }, { paragraphs: [para('B')], tables: [], gridSpan: 1 }] },
        { cells: [{ paragraphs: [para('1')], tables: [], gridSpan: 1 }, { paragraphs: [para('2')], tables: [], gridSpan: 1 }] },
      ],
    };
    const doc: ExportDoc = {
      paragraphs: [para('item', { numbering: { kind: 'bullet', ilvl: 0 } })],
      tableAnchors: [{ beforePara: 1, table }],
    };
    const md = toMarkdown(doc);
    expect(md).toContain('- item');
    expect(md).toContain('| A | B |');
    expect(md).toContain('| --- | --- |');
  });

  it('comentário vira footnote', () => {
    const doc: ExportDoc = {
      paragraphs: [{ runs: [{ text: 'texto', props: rp({ commentIds: [1] }) }], props: {} }],
      comments: [{ id: 1, author: 'Bea', text: 'nota' }],
    };
    const md = toMarkdown(doc);
    expect(md).toContain('[^c1]');
    expect(md).toContain('[^c1]: **Bea**: nota');
  });
});

describe('opção images:omit (slim)', () => {
  // imagem "real" — 4KB de bytes para que slim seja MENOR que full;
  // imagens triviais (<200 bytes) cabem inline mais barato que o placeholder.
  const BIG_IMG = new Uint8Array(4096).fill(0xab);
  const imgPara = (): Paragraph => ({
    runs: [{
      text: '', props: rp(),
      image: { data: BIG_IMG, ext: 'jpg', widthTwips: 100, heightTwips: 100 },
    }],
    props: {},
  });

  it('HTML slim: substitui <img> por placeholder', () => {
    const doc: ExportDoc = { paragraphs: [imgPara(), para('texto')] };
    const full = toHtml(doc, { fullDocument: false });
    const slim = toHtml(doc, { fullDocument: false, images: 'omit' });
    expect(full).toContain('<img');
    expect(full).toContain('data:image/jpeg;base64');
    expect(slim).not.toContain('<img');
    expect(slim).not.toContain('data:image/');
    expect(slim).toContain('class="uw-img-placeholder"');
    // placeholder traz fallback inline → funciona embeddado sem a CSS
    expect(slim).toContain('style="display:inline-block');
    expect(slim).toContain('aria-label="imagem"');
    expect(slim.length).toBeLessThan(full.length);
  });

  it('Markdown slim: substitui ![] por [imagem]', () => {
    const doc: ExportDoc = { paragraphs: [imgPara(), para('texto')] };
    const full = toMarkdown(doc);
    const slim = toMarkdown(doc, { images: 'omit' });
    expect(full).toContain('data:image/jpeg;base64');
    expect(slim).not.toContain('data:image/');
    expect(slim).not.toContain('![](');
    expect(slim).toContain('[imagem]');
    expect(slim.length).toBeLessThan(full.length);
  });

  it('HTML slim: imagem dentro de célula de tabela também substituída', () => {
    const table: TableBlock = {
      type: 'table', gridColsTwips: [1000],
      rows: [{ cells: [{ paragraphs: [imgPara()], tables: [], gridSpan: 1 }] }],
    };
    const doc: ExportDoc = { paragraphs: [para('antes')], tableAnchors: [{ beforePara: 1, table }] };
    const slim = toHtml(doc, { fullDocument: false, images: 'omit' });
    expect(slim).not.toContain('<img');
    expect(slim).toContain('uw-img-placeholder');
  });

  it('default mantém comportamento antigo (images embutidas)', () => {
    const doc: ExportDoc = { paragraphs: [imgPara()] };
    const h = toHtml(doc, { fullDocument: false });
    expect(h).toContain('<img');
    const md = toMarkdown(doc);
    expect(md).toMatch(/!\[\]\(data:image\//);
  });
});

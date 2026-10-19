import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pptxToMarkdown, pptxToHtml } from '../../src/export/index.js';

const reference = (): Uint8Array => readFileSync(join(__dirname, '../../../../samples/reference.pptx'));
const showcase = (): Uint8Array => readFileSync(join(__dirname, '../../../../samples/showcase_animado.pptx'));
const gaps = (): Uint8Array => readFileSync(join(__dirname, '../../../../samples/gaps-smoke.pptx'));

describe('pptxToMarkdown', () => {
  it('reference: um heading por slide, com título do placeholder', () => {
    const md = pptxToMarkdown(reference());
    expect(md.startsWith('## Slide 1')).toBe(true);
    expect(md.match(/^## Slide \d+/gm)?.length).toBe(3);
    expect(md).toMatchSnapshot();
  });

  it('gaps-smoke: snapshot estável (bullets/tabelas/notas)', () => {
    expect(pptxToMarkdown(gaps())).toMatchSnapshot();
  });

  it('showcase: 12 slides, notas do apresentador como blockquote', () => {
    const md = pptxToMarkdown(showcase());
    expect(md.match(/^## Slide \d+/gm)?.length).toBe(12);
    expect(md).toMatch(/^> /m); // notesSlideN.xml presentes no deck
  });

  it('imagens: default vira [imagem]; images:"data" embute data URI', () => {
    const omit = pptxToMarkdown(showcase());
    expect(omit).toContain('[imagem]');
    expect(omit).not.toContain('data:image/');
    const data = pptxToMarkdown(showcase(), { images: 'data' });
    expect(data).toContain('![](data:image/png;base64,');
  });
});

describe('pptxToHtml', () => {
  it('reference: um <section class="slide"> por slide, posições em %', () => {
    const html = pptxToHtml(reference());
    expect(html.match(/<section class="slide"/g)?.length).toBe(3);
    expect(html).toContain('position:absolute');
    expect(html).toContain('aspect-ratio:');
    expect(html).toMatchSnapshot();
  });

  it('showcase: imagens como data URI por default; "omit" remove', () => {
    const html = pptxToHtml(showcase());
    expect(html).toContain('data:image/png;base64,');
    const omitted = pptxToHtml(showcase(), { images: 'omit' });
    expect(omitted).not.toContain('data:image/');
  });

  it('fullDocument embrulha em HTML5', () => {
    const html = pptxToHtml(reference(), { fullDocument: true });
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<meta charset="utf-8">');
  });
});

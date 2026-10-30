import { describe, expect, it } from 'vitest';
import { DEFAULT_RUN_PROPS, type FullDocument, type Run } from '@universal-office/docx-core';
import { PdfDocument, safePdfUri } from '../src/pdf-writer/index.js';
import { pdfNavigation } from '../src/pdf-navigation.js';
import type { LaidOutLine, LayoutResult } from '../src/tree.js';

const text = (pdf: Uint8Array): string => new TextDecoder('latin1').decode(pdf);
const count = (s: string, what: string): number => s.split(what).length - 1;

describe('PdfDocument: links e marcadores', () => {
  it('grava /Link com /URI escapada e destino interno, e ignora esquema fora da lista', () => {
    const doc = new PdfDocument({ compress: false });
    const p1 = doc.addPage(595, 842);
    doc.addPage(595, 842);
    p1.addLink({ xPt: 72, yTopPt: 100, wPt: 120, hPt: 14, uri: 'https://exemplo.test/a b(c)' });
    p1.addLink({ xPt: 72, yTopPt: 130, wPt: 50, hPt: 14, pageIndex: 1, destTopPt: 40 });
    p1.addLink({ xPt: 72, yTopPt: 160, wPt: 50, hPt: 14, uri: 'javascript:alert(1)' });
    const pdf = text(doc.build());
    expect(count(pdf, '/Subtype /Link')).toBe(2);
    expect(pdf).toContain('/URI (https://exemplo.test/a%20b\\(c\\))');
    expect(pdf).not.toContain('javascript');
    expect(pdf).toMatch(/\/Dest \[\d+ 0 R \/XYZ 0 802 null\]/);
  });

  it('grava /Outlines aninhados com títulos em UTF-16BE', () => {
    const doc = new PdfDocument({ compress: false });
    doc.addPage(595, 842);
    doc.addOutline({ title: 'Introdução', level: 1, pageIndex: 0, topPt: 50 });
    doc.addOutline({ title: 'Escopo', level: 2, pageIndex: 0, topPt: 300 });
    const pdf = text(doc.build());
    expect(pdf).toContain('/Outlines ');
    expect(pdf).toContain('/Title <FEFF0049006E00740072006F0064007500E700E3006F>');
    expect(pdf).toContain('/Count -1');
  });

  it('sem links nem títulos o PDF não ganha anotações nem marcadores', () => {
    const doc = new PdfDocument({ compress: false });
    doc.addPage(595, 842);
    const pdf = text(doc.build());
    expect(pdf).not.toContain('/Annots');
    expect(pdf).not.toContain('/Outlines');
  });

  it('safePdfUri aceita só http, https e mailto', () => {
    expect(safePdfUri('mailto:a@b.test')).toBe('mailto:a@b.test');
    expect(safePdfUri('file:///etc/passwd')).toBeNull();
    expect(safePdfUri(' ')).toBeNull();
  });
});

describe('pdfNavigation', () => {
  const run = (t: string, link?: string): Run => ({ text: t, props: { ...DEFAULT_RUN_PROPS, ...(link ? { link } : {}) } });
  const line = (ref: string, start: number, end: number, y: number): LaidOutLine => ({
    ref, start, end, x: 1000, y, height: 300, baseline: y + 240, width: (end - start) * 100,
    chars: Array.from({ length: end - start }, (_, i) => ({ o: start + i, x: 1000 + i * 100, w: 100 })),
  });

  it('links externos e para indicadores viram áreas clicáveis em pt', () => {
    const full = {
      blocks: [
        { type: 'paragraph', paragraph: { props: {}, runs: [run('Veja '), run('site', 'https://a.test'), run(' e '), run('fim', '#fim')] } },
        { type: 'paragraph', paragraph: { props: {}, runs: [run('Fim')] } },
      ],
      bookmarks: new Map([['fim', 1]]),
      sections: [], footnotes: new Map(), endnotes: new Map(), comments: [], styles: {},
    } as unknown as FullDocument;
    const layout: LayoutResult = {
      warnings: [],
      pages: [
        { widthTw: 11906, heightTw: 16838, section: 0, number: 1, items: [], lines: [line('b0', 0, 15, 1000)] },
        { widthTw: 11906, heightTw: 16838, section: 0, number: 2, items: [], lines: [line('b1', 0, 3, 2000)] },
      ],
    };
    const nav = pdfNavigation(full, layout);
    expect(nav.links).toEqual([
      { page: 0, link: { xPt: 75, yTopPt: 50, wPt: 20, hPt: 15, uri: 'https://a.test' } },
      { page: 0, link: { xPt: 110, yTopPt: 50, wPt: 15, hPt: 15, pageIndex: 1, destTopPt: 100 } },
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import {
  DocxPackage, readFullDocument, readDocument, writeDocument, insertText,
  type DocumentModel,
} from '../src/index.js';

const CATALOG = 'D:\\Projects\\OfficeNext\\WordNext\\samples\\Catalogo-Recursos-Word.docx';

const blankModel = (): DocumentModel => ({
  paragraphs: [{ runs: [], props: {} }],
  sectPr: {
    pageWidthTwips: 11906, pageHeightTwips: 16838,
    marginLeftTwips: 1701, marginRightTwips: 1701,
    marginTopTwips: 1417, marginBottomTwips: 1417,
  },
});

describe('comentários (anotações)', () => {
  if (!existsSync(CATALOG)) { it.skip('catálogo ausente', () => {}); return; }
  const doc = readFullDocument(DocxPackage.load(new Uint8Array(readFileSync(CATALOG))));

  it('runs dentro de commentRangeStart/End carregam commentIds (corpo E célula)', () => {
    const allRuns = doc.blocks.flatMap((b) =>
      b.type === 'paragraph'
        ? b.paragraph.runs
        : b.rows.flatMap((r) => r.cells.flatMap((c) => c.paragraphs.flatMap((p) => p.runs))),
    );
    const marked = allRuns.filter((r) => r.props.commentIds?.length);
    expect(marked.length).toBeGreaterThanOrEqual(2);
    const target = marked.find((r) => r.text.includes('este intervalo possui um comentario'));
    expect(target!.props.commentIds).toContain(0);
    const inCell = marked.find((r) => r.text.includes('celula com comentario'));
    expect(inCell!.props.commentIds).toContain(1);
  });

  it('comments.xml: 2 comentários com autor e texto', () => {
    expect(doc.comments.length).toBe(2);
    expect(doc.comments[0]!.text.length).toBeGreaterThan(3);
  });

  it('adicionar comentário + serializar → relê com range e texto', () => {
    const m = blankModel();
    insertText(m, { para: 0, offset: 0 }, 'Texto com trecho comentado aqui.');
    // marca "trecho comentado" (10..27) com o comentário 5
    const p = m.paragraphs[0]!;
    const run = p.runs[0]!;
    p.runs = [
      { text: run.text.slice(0, 10), props: { ...run.props } },
      { text: run.text.slice(10, 27), props: { ...run.props, commentIds: [5] } },
      { text: run.text.slice(27), props: { ...run.props } },
    ];
    const pkg = DocxPackage.empty();
    writeDocument(pkg, m, [], {
      comments: [{ id: 5, author: 'Erich', text: 'minha anotação' }],
    });
    expect(pkg.documentXml()).toContain('<w:commentRangeStart w:id="5"/>');
    expect(pkg.documentXml()).toContain('<w:commentRangeEnd w:id="5"/>');
    expect(pkg.getPartText('word/comments.xml')).toContain('minha anotação');
    expect(pkg.getPartText('word/_rels/document.xml.rels')).toContain('comments.xml');

    const re = readFullDocument(DocxPackage.load(pkg.save()));
    expect(re.comments.length).toBe(1);
    expect(re.comments[0]!.text).toBe('minha anotação');
    const marked = re.blocks.flatMap((b) => (b.type === 'paragraph' ? b.paragraph.runs : []))
      .find((r) => r.props.commentIds?.includes(5));
    expect(marked?.text).toBe('trecho comentado ');
  });
});

describe('sumário (TOC)', () => {
  if (!existsSync(CATALOG)) { it.skip('catálogo ausente', () => {}); return; }
  const doc = readFullDocument(DocxPackage.load(new Uint8Array(readFileSync(CATALOG))));

  it('detecta o campo TOC (instrText) no parágrafo do sdt', () => {
    const toc = doc.blocks.find((b) => b.type === 'paragraph' && b.paragraph.props.tocInstr);
    expect(toc).toBeTruthy();
    if (toc?.type === 'paragraph') expect(toc.paragraph.props.tocInstr).toContain('TOC');
  });

  it('lê bookmarks (o catálogo tem "topo")', () => {
    expect(doc.bookmarks.get('topo')).toBeTypeOf('number');
  });

  it('headings 1-3 existem para alimentar o sumário', () => {
    const headings = doc.blocks.filter(
      (b) => b.type === 'paragraph' && /^Heading[123]$/.test(b.paragraph.props.styleId ?? ''),
    );
    expect(headings.length).toBeGreaterThanOrEqual(10);
  });
});

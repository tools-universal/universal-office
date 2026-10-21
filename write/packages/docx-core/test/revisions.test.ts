// Controle de alterações no modelo: cada caso refaz uma operação medida no Word
// (write/tools/revisions-oracle/revisions-xml.ps1) e compara o corpo gravado com o
// que o Word gravou (fixtures/revisions/word.json, normalizado por
// revisions-fixtures.mjs — sem rsids, ids e datas).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DocxPackage, readFullDocument, writeDocument, markSectionBreaks, insertText, deleteRange,
  trackInsertText, trackDelete, trackSplitParagraph, trackApplyRunProps, trackApplyParaProps,
  acceptRevisions, rejectRevisions, collectRevisions, revisionAt, spanScope, revisionAuthors, newRevision,
  type FullDocument, type Paragraph, type RevisionInfo, type DocumentModel,
} from '../src/index.js';

const WORD = JSON.parse(readFileSync(join(__dirname, 'fixtures/revisions/word.json'), 'utf8')) as Record<string, string>;

const W_ROOT = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
const SECT = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>';
const D = 'w:date="2024-03-05T10:20:00Z"';
const ME: RevisionInfo = { author: 'Eric Kono', date: '2026-10-21T15:27:00Z', dateUtc: '2026-10-21T18:27:00Z' };

/** Corpo normalizado (a mesma regra de revisions-fixtures.mjs + xml:space, que o
 *  gerador sintético sempre grava e o Word só quando precisa). */
function norm(documentXml: string): string {
  let x = documentXml.slice(documentXml.indexOf('<w:body>') + 8);
  const sect = x.lastIndexOf('<w:sectPr');
  x = x.slice(0, sect >= 0 ? sect : x.lastIndexOf('</w:body>'));
  return x
    .replace(/ w:rsid\w*="[^"]*"/g, '')
    .replace(/ w14:(?:paraId|textId)="[^"]*"/g, '')
    .replace(/<w:proofErr\b[^>]*\/>/g, '')
    .replace(/<w:lang\b[^>]*\/>/g, '')
    .replace(/<w:rPr><\/w:rPr>/g, '')
    .replace(/ w:id="-?\d+"/g, ' w:id="#"')
    .replace(/ w:date="[^"]*"/g, ' w:date="D"')
    .replace(/ w16du:dateUtc="[^"]*"/g, ' w16du:dateUtc="U"')
    .replace(/ xml:space="preserve"/g, '')
    .replace(/<w:p><\/w:p>/g, '<w:p/>');
}
const word = (name: string): string => norm(`<w:body>${WORD[name]!}<w:sectPr/></w:body>`);

interface Doc { pkg: DocxPackage; full: FullDocument; model: DocumentModel }

/** Abre um corpo sintético como o editor (com a fonte original e a linha de base). */
function open(body: string): Doc {
  const pkg = DocxPackage.empty();
  pkg.setPartText('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${W_ROOT}<w:body>${body}${SECT}</w:body></w:document>`);
  const full = readFullDocument(DocxPackage.load(pkg.save()), { sources: true });
  markSectionBreaks(full);
  full.sources!.baseline();
  const paragraphs = full.blocks.filter((b): b is Extract<typeof b, { type: 'paragraph' }> => b.type === 'paragraph').map((b) => b.paragraph);
  return { pkg: DocxPackage.load(pkg.save()), full, model: { paragraphs, sectPr: full.sections[full.sections.length - 1]!.sectPr } };
}

/** Grava (sem perdas) e devolve o corpo normalizado. */
function saved(d: Doc): string {
  writeDocument(d.pkg, d.model, [], { blocks: d.model.paragraphs.map((paragraph) => ({ type: 'paragraph' as const, paragraph })), sources: d.full.sources });
  return norm(d.pkg.getPartText('word/document.xml')!);
}

const P = (text: string, ppr = ''): string => `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${text ? `<w:r><w:t xml:space="preserve">${text}</w:t></w:r>` : ''}</w:p>`;
const hello = (): Doc => open(P('Hello world'));
const at = (para: number, offset: number) => ({ para, offset });
const del = (d: Doc, a: [number, number], b: [number, number]) => trackDelete(d.model, { start: at(...a), end: at(...b) }, ME);
const text = (p: Paragraph): string => p.runs.map((r) => r.text).join('');

describe('revisões: leitura', () => {
  it('lê inserção, exclusão, formatação, marcas e movimentação com a autoria', () => {
    const d = open(
      P('Alpha ').slice(0, -6) + `<w:ins w:id="1" w:author="Ana" ${D} w16du:dateUtc="2024-03-05T13:20:00Z"><w:r><w:t>novo</w:t></w:r></w:ins>`
      + `<w:del w:id="2" w:author="Bruno" ${D}><w:r><w:delText>velho</w:delText></w:r></w:del>`
      + `<w:moveFrom w:id="3" w:author="Davi" ${D}><w:r><w:t>ida</w:t></w:r></w:moveFrom></w:p>`
      + `<w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:del w:id="4" w:author="Bruno" ${D}/></w:rPr><w:pPrChange w:id="5" w:author="Carla" ${D}><w:pPr/></w:pPrChange></w:pPr>`
      + `<w:r><w:rPr><w:b/><w:rPrChange w:id="6" w:author="Carla" ${D}><w:rPr><w:i/></w:rPr></w:rPrChange></w:rPr><w:t>fmt</w:t></w:r></w:p>`,
    );
    const [p0, p1] = d.model.paragraphs;
    expect(text(p0!)).toBe('Alpha novovelhoida');
    expect(p0!.runs[1]!.props.ins).toEqual({ author: 'Ana', date: '2024-03-05T10:20:00Z', dateUtc: '2024-03-05T13:20:00Z' });
    expect(p0!.runs[2]!.props.del?.author).toBe('Bruno');
    expect(p0!.runs[3]!.props.del).toEqual({ author: 'Davi', date: '2024-03-05T10:20:00Z', move: true });
    expect(p1!.props.markDel?.author).toBe('Bruno');
    expect(p1!.props.pfmt).toMatchObject({ author: 'Carla', old: {} });
    expect(p1!.runs[0]!.props.fmt).toMatchObject({ author: 'Carla', old: { bold: false, italic: true } });
    expect(collectRevisions(d.model.paragraphs).map((s) => [s.kind, s.author, s.para, s.start, s.end, !!s.mark])).toEqual([
      ['insert', 'Ana', 0, 6, 10, false], ['delete', 'Bruno', 0, 10, 15, false], ['delete', 'Davi', 0, 15, 18, false],
      ['paraFormat', 'Carla', 1, 0, 3, false], ['format', 'Carla', 1, 0, 3, false], ['delete', 'Bruno', 1, 3, 3, true],
    ]);
    expect(revisionAuthors(d.full)).toEqual(['Ana', 'Bruno', 'Davi', 'Carla']);
  });

  it('documento sem edição grava igual (revisões cruas)', () => {
    const body = P('a') + `<w:p><w:del w:id="1" w:author="A" ${D}><w:r><w:delText>x</w:delText></w:r></w:del><w:ins w:id="2" w:author="B" ${D}><w:r><w:t>y</w:t></w:r></w:ins></w:p>`;
    const d = open(body);
    expect(saved(d)).toBe(norm(`<w:body>${body}<w:sectPr/></w:body>`));
  });

  it('autoria nova: hora local com Z e UTC, segundos zerados', () => {
    const r = newRevision('X', new Date(2026, 9, 21, 15, 27, 13));
    expect(r.date).toBe('2026-10-21T15:27:00Z');
    expect(r.dateUtc).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:00Z$/);
  });
});

describe('revisões: edição com o controle ligado = XML do Word', () => {
  const cases: [string, () => Doc][] = [
    ['type-mid', () => { const d = hello(); trackInsertText(d.model, at(0, 5), ' big', ME); return d; }],
    ['type-contiguous', () => { const d = hello(); const p = trackInsertText(d.model, at(0, 5), ' big', ME); trackInsertText(d.model, p, 'ger', ME); return d; }],
    ['type-two-places', () => { const d = hello(); trackInsertText(d.model, at(0, 5), ' big', ME); trackInsertText(d.model, at(0, 15), '!', ME); return d; }],
    ['type-replace-sel', () => { const d = hello(); const r = del(d, [0, 6], [0, 11]); trackInsertText(d.model, r.end, 'earth', ME); return d; }],
    ['type-after-del', () => { const d = hello(); const r = del(d, [0, 6], [0, 11]); trackInsertText(d.model, r.end, 'earth', ME); return d; }],
    ['del-sel', () => { const d = hello(); del(d, [0, 6], [0, 11]); return d; }],
    ['backspace-one', () => { const d = hello(); del(d, [0, 10], [0, 11]); return d; }],
    ['backspace-two', () => { const d = hello(); del(d, [0, 10], [0, 11]); del(d, [0, 9], [0, 10]); return d; }],
    ['delete-fwd-two', () => { const d = hello(); const r = del(d, [0, 6], [0, 7]); del(d, [0, r.end.offset], [0, r.end.offset + 1]); return d; }],
    ['del-own-ins', () => { const d = hello(); trackInsertText(d.model, at(0, 5), ' big', ME); del(d, [0, 6], [0, 8]); return d; }],
    ['bksp-own-ins', () => { const d = hello(); trackInsertText(d.model, at(0, 5), ' big', ME); del(d, [0, 8], [0, 9]); return d; }],
    ['type-before-own-ins', () => { const d = hello(); trackInsertText(d.model, at(0, 5), ' big', ME); trackInsertText(d.model, at(0, 5), 'X', ME); return d; }],
    ['bksp-into-ins-start', () => { const d = hello(); trackInsertText(d.model, at(0, 5), ' big', ME); del(d, [0, 4], [0, 5]); return d; }],
    ['bold-word', () => { const d = hello(); trackApplyRunProps(d.model, { start: at(0, 6), end: at(0, 11) }, { bold: true }, ME); return d; }],
    ['bold-then-italic', () => { const d = hello(); const r = { start: at(0, 6), end: at(0, 11) }; trackApplyRunProps(d.model, r, { bold: true }, ME); trackApplyRunProps(d.model, r, { italic: true }, ME); return d; }],
    ['bold-then-unbold', () => { const d = hello(); const r = { start: at(0, 6), end: at(0, 11) }; trackApplyRunProps(d.model, r, { bold: true }, ME); trackApplyRunProps(d.model, r, { bold: false }, ME); return d; }],
    ['bold-overlap', () => { const d = hello(); trackApplyRunProps(d.model, { start: at(0, 6), end: at(0, 11) }, { bold: true }, ME); trackApplyRunProps(d.model, { start: at(0, 3), end: at(0, 8) }, { italic: true }, ME); return d; }],
    ['color-word', () => { const d = hello(); trackApplyRunProps(d.model, { start: at(0, 0), end: at(0, 5) }, { color: 'FF0000' }, ME); return d; }],
    ['bold-own-ins', () => { const d = hello(); trackInsertText(d.model, at(0, 5), ' big', ME); trackApplyRunProps(d.model, { start: at(0, 6), end: at(0, 9) }, { bold: true }, ME); return d; }],
    ['del-formatted', () => { const d = hello(); trackApplyRunProps(d.model, { start: at(0, 6), end: at(0, 11) }, { bold: true }, ME); del(d, [0, 6], [0, 11]); return d; }],
    ['align-center', () => { const d = hello(); trackApplyParaProps(d.model, { start: at(0, 0), end: at(0, 0) }, { alignment: 'center' }, ME); return d; }],
    ['align-then-ind', () => { const d = hello(); const r = { start: at(0, 0), end: at(0, 0) }; trackApplyParaProps(d.model, r, { alignment: 'center' }, ME); trackApplyParaProps(d.model, r, { indentLeftTwips: 720 }, ME); return d; }],
    ['spacing', () => { const d = hello(); trackApplyParaProps(d.model, { start: at(0, 0), end: at(0, 0) }, { spaceAfterTwips: 480, lineTwentieths: 360 }, ME); return d; }],
    ['enter-mid', () => { const d = hello(); trackSplitParagraph(d.model, at(0, 5), ME); return d; }],
    ['enter-end-type', () => { const d = hello(); const p = trackSplitParagraph(d.model, at(0, 11), ME); trackInsertText(d.model, p, 'Second', ME); return d; }],
    ['enter-styled', () => { const d = open(P('Hello world', '<w:jc w:val="center"/>')); trackSplitParagraph(d.model, at(0, 5), ME); return d; }],
    ['enter-in-own-ins', () => { const d = hello(); trackInsertText(d.model, at(0, 5), ' big', ME); trackSplitParagraph(d.model, at(0, 7), ME); return d; }],
    ['bksp-own-mark', () => { const d = hello(); trackSplitParagraph(d.model, at(0, 5), ME); del(d, [0, 5], [1, 0]); return d; }],
    ['join-backspace', () => { const d = open(P('Hello') + P('World')); del(d, [0, 5], [1, 0]); return d; }],
    ['join-delete', () => { const d = open(P('Hello') + P('World')); del(d, [0, 5], [1, 0]); return d; }],
    ['join-props', () => { const d = open(P('Hello', '<w:jc w:val="right"/>') + P('World', '<w:jc w:val="center"/>')); del(d, [0, 5], [1, 0]); return d; }],
    ['join-props-delete', () => { const d = open(P('Hello', '<w:jc w:val="right"/>') + P('World', '<w:jc w:val="center"/>')); del(d, [0, 5], [1, 0]); return d; }],
    ['join-props-empty1', () => { const d = open(P('', '<w:jc w:val="right"/>') + P('World', '<w:jc w:val="center"/>')); del(d, [0, 0], [1, 0]); return d; }],
    ['del-across', () => { const d = open(P('Hello there') + P('big World')); del(d, [0, 6], [1, 4]); return d; }],
    ['del-across-props', () => { const d = open(P('Hello there', '<w:jc w:val="right"/>') + P('big World', '<w:jc w:val="center"/>')); del(d, [0, 6], [1, 4]); return d; }],
    ['del-whole-para', () => { const d = open(P('One') + P('Two') + P('Three')); del(d, [1, 0], [2, 0]); return d; }],
    ['untracked-in-ins', () => { const d = hello(); trackInsertText(d.model, at(0, 5), ' big', ME); insertText(d.model, at(0, 7), 'X'); return d; }],
    ['untracked-end-ins', () => { const d = hello(); trackInsertText(d.model, at(0, 5), ' big', ME); insertText(d.model, at(0, 9), 'Y'); return d; }],
    ['untracked-in-del', () => { const d = hello(); del(d, [0, 6], [0, 11]); insertText(d.model, at(0, 8), 'Z'); return d; }],
    ['untracked-del-ins', () => { const d = hello(); trackInsertText(d.model, at(0, 5), ' big', ME); deleteRange(d.model, { start: at(0, 6), end: at(0, 8) }); return d; }],
    ['type-new-doc', () => { const d = open(P('')); trackInsertText(d.model, at(0, 0), 'Fresh', ME); return d; }],
    ['empty-para-enter', () => { const d = open(P('')); trackSplitParagraph(d.model, at(0, 0), ME); return d; }],
  ];
  const other = (): Doc => open(`<w:p><w:r><w:t>Hello</w:t></w:r><w:ins w:id="1" w:author="Outro Autor" ${D}><w:r><w:t xml:space="preserve"> big</w:t></w:r></w:ins><w:r><w:t xml:space="preserve"> world</w:t></w:r></w:p>`);
  cases.push(
    ['other-del-part', () => { const d = other(); del(d, [0, 7], [0, 10]); return d; }],
    ['other-del-all', () => { const d = other(); del(d, [0, 5], [0, 9]); return d; }],
    ['other-type-in', () => { const d = other(); trackInsertText(d.model, at(0, 7), 'Q', ME); return d; }],
    ['other-bold', () => { const d = other(); trackApplyRunProps(d.model, { start: at(0, 6), end: at(0, 9) }, { bold: true }, ME); return d; }],
  );
  for (const [name, run] of cases) {
    it(name, () => {
      expect(WORD[name], `fixture ${name}`).toBeDefined();
      // desfeita a formatação, o Word deixa o run partido; o nosso volta a ser um só (igual ao original)
      if (name === 'bold-then-unbold') expect(word(name)).toBe('<w:p><w:r><w:t>Hello </w:t></w:r><w:r><w:t>world</w:t></w:r></w:p>');
      expect(saved(run())).toBe(name === 'bold-then-unbold' ? '<w:p><w:r><w:t>Hello world</w:t></w:r></w:p>' : word(name));
    });
  }
});

describe('revisões: aceitar e rejeitar = Word', () => {
  // o mesmo documento de write/tools/revisions-oracle/synthetic.mjs (fix/mixed)
  const mixed = (): Doc => open(
    `<w:p><w:r><w:t xml:space="preserve">Alpha </w:t></w:r><w:ins w:id="1" w:author="Ana" ${D}><w:r><w:t xml:space="preserve">inserted </w:t></w:r></w:ins><w:r><w:t xml:space="preserve">beta </w:t></w:r><w:del w:id="2" w:author="Bruno" ${D}><w:r><w:delText xml:space="preserve">deleted </w:delText></w:r></w:del><w:r><w:t xml:space="preserve">gamma.</w:t></w:r></w:p>`
    + `<w:p><w:r><w:t xml:space="preserve">Bold </w:t></w:r><w:r><w:rPr><w:b/><w:rPrChange w:id="3" w:author="Carla" ${D}><w:rPr/></w:rPrChange></w:rPr><w:t>changed</w:t></w:r><w:r><w:t xml:space="preserve"> text.</w:t></w:r></w:p>`
    + `<w:p><w:pPr><w:jc w:val="center"/><w:pPrChange w:id="4" w:author="Davi" ${D}><w:pPr/></w:pPrChange></w:pPr><w:r><w:t xml:space="preserve">Centered paragraph.</w:t></w:r></w:p>`
    + `<w:p><w:pPr><w:rPr><w:ins w:id="5" w:author="Ana" ${D}/></w:rPr></w:pPr><w:r><w:t xml:space="preserve">Mark inserted</w:t></w:r></w:p>`
    + P('after mark ins.')
    + `<w:p><w:pPr><w:jc w:val="right"/><w:rPr><w:del w:id="6" w:author="Bruno" ${D}/></w:rPr></w:pPr><w:r><w:t xml:space="preserve">Mark deleted</w:t></w:r></w:p>`
    + P('after mark del.', '<w:jc w:val="center"/>'),
  );
  const marks = (): Doc => open(
    `<w:p><w:pPr><w:jc w:val="right"/><w:rPr><w:ins w:id="1" w:author="Ana" ${D}/></w:rPr></w:pPr><w:r><w:t xml:space="preserve">First</w:t></w:r></w:p>`
    + P('Second', '<w:jc w:val="center"/>')
    + `<w:p><w:pPr><w:jc w:val="right"/><w:rPr><w:del w:id="2" w:author="Bruno" ${D}/></w:rPr></w:pPr><w:r><w:t xml:space="preserve">Third</w:t></w:r></w:p>`
    + P('Fourth', '<w:jc w:val="center"/>'),
  );
  /** O Word separa runs que o nosso gravador junta: compara só o texto e o pPr por parágrafo. */
  const shape = (xml: string): string[] => [...xml.matchAll(/<w:p\b[^>]*?(?:\/>|>([\s\S]*?)<\/w:p>)/g)].map((m) => {
    const inner = m[1] ?? '';
    const ppr = /<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(inner)?.[1] ?? '';
    const runs = inner.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, '');
    const t = [...runs.matchAll(/<w:(?:t|delText)\b[^>]*>([^<]*)</g)].map((x) => x[1]).join('');
    const rprs = [...runs.matchAll(/<w:rPr>([\s\S]*?)<\/w:rPr>/g)].map((x) => x[1]).join('|');
    return `${ppr} :: ${t} :: ${rprs} :: ${/<w:(?:ins|del)\b/.test(runs) ? 'rev' : ''}`;
  });
  it('aceitar todas', () => { const d = mixed(); acceptRevisions(d.model.paragraphs); expect(shape(saved(d))).toEqual(shape(word('accept-all'))); });
  it('rejeitar todas', () => { const d = mixed(); rejectRevisions(d.model.paragraphs); expect(shape(saved(d))).toEqual(shape(word('reject-all'))); });
  it('aceitar marca inserida', () => { const d = marks(); acceptRevisions(d.model.paragraphs, spanScope(collectRevisions(d.model.paragraphs)[0]!)); expect(shape(saved(d))).toEqual(shape(word('accept-mark-ins'))); });
  it('rejeitar marca inserida: junta com o pPr do 2º', () => { const d = marks(); rejectRevisions(d.model.paragraphs, spanScope(collectRevisions(d.model.paragraphs)[0]!)); expect(shape(saved(d))).toEqual(shape(word('reject-mark-ins'))); });
  it('aceitar marca excluída: junta com o pPr do 2º', () => { const d = marks(); acceptRevisions(d.model.paragraphs, spanScope(collectRevisions(d.model.paragraphs)[1]!)); expect(shape(saved(d))).toEqual(shape(word('accept-mark-del'))); });
  it('rejeitar marca excluída', () => { const d = marks(); rejectRevisions(d.model.paragraphs, spanScope(collectRevisions(d.model.paragraphs)[1]!)); expect(shape(saved(d))).toEqual(shape(word('reject-mark-del'))); });

  it('rejeitar formatação do arquivo volta ao rPr/pPr antigo cru', () => {
    const d = open(`<w:p><w:pPr><w:jc w:val="center"/><w:pPrChange w:id="1" w:author="A" ${D}><w:pPr><w:ind w:left="567"/><w:jc w:val="right"/></w:pPr></w:pPrChange></w:pPr>`
      + `<w:r><w:rPr><w:rStyle w:val="Forte"/><w:b/><w:rPrChange w:id="2" w:author="A" ${D}><w:rPr><w:rFonts w:eastAsia="MS Gothic"/><w:i/></w:rPr></w:rPrChange></w:rPr><w:t>x</w:t></w:r></w:p>`);
    rejectRevisions(d.model.paragraphs);
    expect(saved(d)).toBe('<w:p><w:pPr><w:ind w:left="567"/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:rFonts w:eastAsia="MS Gothic"/><w:i/></w:rPr><w:t>x</w:t></w:r></w:p>');
  });

  it('aceitar/rejeitar a revisão no cursor e só ela', () => {
    const d = mixed();
    const spans = collectRevisions(d.model.paragraphs);
    const ins = revisionAt(spans, at(0, 8))!;
    expect(ins).toMatchObject({ kind: 'insert', author: 'Ana', start: 6, end: 15 });
    rejectRevisions(d.model.paragraphs, spanScope(ins));
    expect(text(d.model.paragraphs[0]!)).toBe('Alpha beta deleted gamma.');
    expect(collectRevisions(d.model.paragraphs)).toHaveLength(spans.length - 1);
  });

  it('aceitar só um autor ("todas as mostradas")', () => {
    const d = mixed();
    acceptRevisions(d.model.paragraphs, { authors: new Set(['Bruno']) });
    const left = collectRevisions(d.model.paragraphs).map((s) => s.author);
    expect(left).not.toContain('Bruno');
    expect(left).toContain('Ana');
  });

  it('inserção que atravessa a marca de parágrafo é uma revisão só (como o Word lista)', () => {
    const d = hello();
    const p = trackSplitParagraph(d.model, at(0, 11), ME);
    trackInsertText(d.model, p, 'Second', ME);
    const spans = collectRevisions(d.model.paragraphs);
    expect(spans).toHaveLength(1);
    expect(spans[0]).toMatchObject({ kind: 'insert', para: 0, start: 11, endPara: 1, end: 6, text: '\nSecond' });
    expect(revisionAt(spans, at(1, 3))).toBe(spans[0]);
    rejectRevisions(d.model.paragraphs, spanScope(spans[0]!));
    expect(d.model.paragraphs.map(text)).toEqual(['Hello world']);
  });

  it('juntar parágrafos ao aceitar avisa o índice que saiu', () => {
    const d = marks();
    const out: number[] = [];
    acceptRevisions(d.model.paragraphs, {}, (i) => out.push(i));
    expect(out).toEqual([3]);
    expect(d.model.paragraphs.map(text)).toEqual(['First', 'Second', 'ThirdFourth']);
  });
});

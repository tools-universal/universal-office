import { describe, expect, it } from 'vitest';
import {
  DocxPackage, readFullDocument, writeDocument, markSectionBreaks, insertText, applyRunProps, insertRun,
  type FullDocument, type Paragraph, type Block, type HfPartInfo,
} from '../src/index.js';

// Casos sintéticos da gravação sem perdas (achados da revisão de 2026-10-19).

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
  'xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" ' +
  'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"';

function make(body: string, parts: Record<string, string> = {}, sect = '<w:sectPr/>'): DocxPackage {
  const pkg = DocxPackage.empty();
  pkg.setPartText('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document ${NS}><w:body>${body}${sect}</w:body></w:document>`);
  for (const [k, v] of Object.entries(parts)) pkg.setPartText(k, v);
  return pkg;
}

function open(pkg: DocxPackage): FullDocument {
  const full = readFullDocument(pkg, { sources: true });
  markSectionBreaks(full);
  full.sources!.baseline();
  return full;
}

const paras = (blocks: Block[]): Paragraph[] =>
  blocks.filter((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph').map((b) => b.paragraph);

function save(pkg: DocxPackage, full: FullDocument): string {
  const last = full.sections[full.sections.length - 1]!;
  const hfParts: HfPartInfo[] = [];
  for (const s of full.sections) {
    for (const [kind, refs, set] of [['header', s.headerRefs, s.headers], ['footer', s.footerRefs, s.footers]] as const) {
      for (const r of refs) if (set[r.type]) hfParts.push({ kind, type: r.type, rid: r.rid, path: r.path, paragraphs: set[r.type]!, dirty: false });
    }
  }
  writeDocument(pkg, { paragraphs: paras(full.blocks), sectPr: last.sectPr }, hfParts, {
    comments: full.comments.length ? full.comments : undefined,
    bodySectRefs: hfParts.map((h) => ({ kind: h.kind, type: h.type, rid: h.rid })),
    blocks: full.blocks,
    sources: full.sources,
  });
  return pkg.documentXml();
}

const count = (s: string, t: string): number => s.split(t).length - 1;
const model = (full: FullDocument) => ({ paragraphs: paras(full.blocks), sectPr: full.sections[0]!.sectPr });

describe('gravação sem perdas — casos', () => {
  it('grupo VML com duas caixas: editar uma não copia o texto para a outra', () => {
    const box = (t: string, l: number) => `<v:shape style="position:absolute;left:${l};top:0;width:100;height:100" type="#_x0000_t202"><v:textbox><w:txbxContent><w:p><w:r><w:t>${t}</w:t></w:r></w:p></w:txbxContent></v:textbox></v:shape>`;
    const pkg = make(`<w:p><w:r><w:t>antes </w:t></w:r><w:r><w:pict><v:group style="position:absolute;width:200pt;height:100pt" coordsize="200,100">${box('AAA', 0)}${box('BBB', 100)}</v:group></w:pict></w:r></w:p>`);
    const full = open(pkg);
    const g = paras(full.blocks)[0]!.runs.find((r) => r.group)!;
    const second = g.group!.items[1]!.run.textbox!;
    insertText({ paragraphs: second.paras, sectPr: full.sections[0]!.sectPr }, { para: 0, offset: 3 }, 'XYZ');
    const xml = save(pkg, full);
    expect(xml).toContain('>AAA<');
    expect(xml).toContain('BBBXYZ');
    expect(count(xml, 'BBB')).toBe(1);
    expect(count(xml, '<v:group')).toBe(1);
  });

  it('cópia colada de uma imagem sai com wp:docPr id novo', () => {
    const drawing = '<w:drawing><wp:inline><wp:extent cx="635000" cy="635000"/><wp:docPr id="7" name="Img"/>' +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:blipFill><a:blip r:embed="rId9"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>';
    const pkg = make(`<w:p><w:r><w:t>x</w:t></w:r><w:r>${drawing}</w:r></w:p>`);
    const full = open(pkg);
    const p = paras(full.blocks)[0]!;
    const img = p.runs.find((r) => r.image)!;
    insertRun(model(full), { para: 0, offset: 0 }, img);
    const xml = save(pkg, full);
    const ids = [...xml.matchAll(/<wp:docPr id="(\d+)"/g)].map((m) => m[1]);
    expect(ids.length).toBe(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('sumário editado à mão: um só begin/end, sem fldSimple TOC', () => {
    const pkg = make(
      '<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" </w:instrText></w:r>' +
      '<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>Introdução 1</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t>Capítulo 2</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>');
    const full = open(pkg);
    insertText(model(full), { para: 0, offset: 5 }, 'XYZ');
    const xml = save(pkg, full);
    expect(count(xml, 'fldCharType="begin"')).toBe(1);
    expect(count(xml, 'fldCharType="end"')).toBe(1);
    expect(xml).not.toContain('w:fldSimple');
  });

  it('equação inline sobrevive a negrito aplicado sobre o parágrafo', () => {
    const pkg = make('<w:p><w:r><w:t>Seja </w:t></w:r><m:oMath><m:r><m:t>x+1</m:t></m:r></m:oMath><w:r><w:t> o valor</w:t></w:r></w:p>');
    const full = open(pkg);
    const len = paras(full.blocks)[0]!.runs.reduce((n, r) => n + r.text.length, 0);
    applyRunProps(model(full), { start: { para: 0, offset: 0 }, end: { para: 0, offset: len } }, { bold: true });
    const xml = save(pkg, full);
    expect(count(xml, '<m:oMath>')).toBe(1);
    expect(xml).toContain('<m:t>x+1</m:t>');
  });

  it('comentário apagado: marcadores saem do rodapé não editado', () => {
    const cm = (id: number) => `<w:commentRangeStart w:id="${id}"/><w:r><w:t>t${id}</w:t></w:r><w:commentRangeEnd w:id="${id}"/><w:r><w:commentReference w:id="${id}"/></w:r>`;
    const pkg = make(`<w:p>${cm(1)}</w:p>`, {
      'word/footer1.xml': `<?xml version="1.0"?><w:ftr ${NS}><w:p>${cm(2)}</w:p></w:ftr>`,
      'word/comments.xml': `<?xml version="1.0"?><w:comments ${NS}><w:comment w:id="1" w:author="A"><w:p><w:r><w:t>um</w:t></w:r></w:p></w:comment><w:comment w:id="2" w:author="A"><w:p><w:r><w:t>dois</w:t></w:r></w:p></w:comment></w:comments>`,
      'word/_rels/document.xml.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rIdF" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' +
        '<Relationship Id="rIdC" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/></Relationships>',
    }, '<w:sectPr><w:footerReference w:type="default" r:id="rIdF"/></w:sectPr>');
    const full = open(pkg);
    full.comments = full.comments.filter((c) => c.id !== 2);
    for (const p of full.sections[0]!.footers.default ?? []) for (const r of p.runs) delete r.props.commentIds;
    save(pkg, full);
    const footer = pkg.getPartText('word/footer1.xml')!;
    expect(footer).not.toMatch(/commentRange(Start|End) w:id="2"|commentReference w:id="2"/);
    expect(footer).toContain('t2');
    expect(pkg.getPartText('word/comments.xml')).not.toContain('w:id="2"');
  });

  it('comments.xml com comentário vazio (<w:comment …/>): o seguinte não duplica nem some', () => {
    const pkg = make('<w:p><w:r><w:t>x</w:t></w:r></w:p>', {
      'word/comments.xml': `<?xml version="1.0"?><w:comments ${NS}><w:comment w:id="3" w:author="A"/><w:comment w:id="4" w:author="A"><w:p><w:r><w:t>quatro</w:t></w:r></w:p></w:comment><w:comment w:id="5" w:author="A"><w:p><w:r><w:t>cinco</w:t></w:r></w:p></w:comment></w:comments>`,
      'word/_rels/document.xml.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rIdC" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/></Relationships>',
    });
    const full = open(pkg);
    full.comments = full.comments.filter((c) => c.id !== 5);
    save(pkg, full);
    const cx = pkg.getPartText('word/comments.xml')!;
    expect(count(cx, 'w:id="4"')).toBe(1);
    expect(count(cx, 'w:id="3"')).toBe(1);
    expect(cx).not.toContain('w:id="5"');
  });

  it('lista nova não reaproveita numIds 1001/1002 que o documento já usa; salvar de novo é idempotente', () => {
    const numbering = `<?xml version="1.0"?><w:numbering ${NS}>` +
      '<w:abstractNum w:abstractNumId="1001"><w:lvl w:ilvl="0"><w:numFmt w:val="lowerLetter"/></w:lvl></w:abstractNum>' +
      '<w:abstractNum w:abstractNumId="1002"><w:lvl w:ilvl="0"><w:numFmt w:val="upperRoman"/></w:lvl></w:abstractNum>' +
      '<w:num w:numId="1001"><w:abstractNumId w:val="1001"/></w:num><w:num w:numId="1002"><w:abstractNumId w:val="1002"/></w:num></w:numbering>';
    const pkg = make('<w:p><w:r><w:t>item</w:t></w:r></w:p>', { 'word/numbering.xml': numbering });
    const full = open(pkg);
    paras(full.blocks)[0]!.props.numbering = { kind: 'decimal', ilvl: 0 };
    const xml = save(pkg, full);
    const num = pkg.getPartText('word/numbering.xml')!;
    expect(xml).toContain('<w:numId w:val="1004"/>');
    expect(num).toContain('w:abstractNumId="1004"');
    expect(num).toContain('<w:numFmt w:val="upperRoman"/>');
    save(pkg, full);
    expect(pkg.getPartText('word/numbering.xml')).toBe(num);
  });
});

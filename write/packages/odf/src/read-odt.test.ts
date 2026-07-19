import { describe, expect, it } from 'vitest';
import type { Block, ParagraphBlock, TableBlock, Paragraph } from '@universal-office/docx-core';
import { readOdt, isOdt } from './index.js';
import { writeZip } from './zip.js';

const enc = new TextEncoder();

const MIME = 'application/vnd.oasis.opendocument.text';

/** Monta um .odt mínimo a partir de fragmentos XML. */
function makeOdt(opts: {
  body: string;
  automaticStyles?: string;
  styles?: string;
  pageLayout?: string;
  extraFiles?: Record<string, Uint8Array>;
}): Uint8Array {
  const content =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<office:document-content ' +
    'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" ' +
    'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" ' +
    'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" ' +
    'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" ' +
    'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" ' +
    'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" ' +
    'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" ' +
    'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/">' +
    '<office:automatic-styles>' + (opts.automaticStyles ?? '') + '</office:automatic-styles>' +
    '<office:body><office:text>' + opts.body + '</office:text></office:body>' +
    '</office:document-content>';

  const styles =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<office:document-styles ' +
    'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" ' +
    'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" ' +
    'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" ' +
    'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0">' +
    '<office:styles>' + (opts.styles ?? '') + '</office:styles>' +
    '<office:automatic-styles>' + (opts.pageLayout ?? '') + '</office:automatic-styles>' +
    '</office:document-styles>';

  return writeZip({
    mimetype: enc.encode(MIME),
    'content.xml': enc.encode(content),
    'styles.xml': enc.encode(styles),
    ...(opts.extraFiles ?? {}),
  });
}

function paras(blocks: Block[]): Paragraph[] {
  return blocks.filter((b): b is ParagraphBlock => b.type === 'paragraph').map((b) => b.paragraph);
}

function paraText(p: Paragraph): string {
  return p.runs.map((r) => r.text).join('');
}

describe('isOdt', () => {
  it('reconhece um .odt válido pelo mimetype', () => {
    const odt = makeOdt({ body: '<text:p>oi</text:p>' });
    expect(isOdt(odt)).toBe(true);
  });

  it('rejeita bytes que não são ZIP', () => {
    expect(isOdt(enc.encode('not a zip'))).toBe(false);
  });

  it('rejeita um ZIP com mimetype errado', () => {
    const zip = writeZip({ mimetype: enc.encode('application/zip'), 'content.xml': enc.encode('<x/>') });
    expect(isOdt(zip)).toBe(false);
  });
});

describe('parágrafos e runs', () => {
  it('lê parágrafos simples', () => {
    const odt = makeOdt({ body: '<text:p>Primeiro</text:p><text:p>Segundo</text:p>' });
    const doc = readOdt(odt);
    const ps = paras(doc.blocks);
    expect(ps).toHaveLength(2);
    expect(paraText(ps[0]!)).toBe('Primeiro');
    expect(paraText(ps[1]!)).toBe('Segundo');
  });

  it('text:span com negrito/itálico via estilos automáticos', () => {
    const odt = makeOdt({
      automaticStyles:
        '<style:style style:name="T1" style:family="text">' +
        '<style:text-properties fo:font-weight="bold"/></style:style>' +
        '<style:style style:name="T2" style:family="text">' +
        '<style:text-properties fo:font-style="italic"/></style:style>',
      body: '<text:p>normal <text:span text:style-name="T1">forte</text:span> ' +
        '<text:span text:style-name="T2">inclinado</text:span></text:p>',
    });
    const p = paras(readOdt(odt).blocks)[0]!;
    const bold = p.runs.find((r) => r.text === 'forte')!;
    const italic = p.runs.find((r) => r.text === 'inclinado')!;
    const normal = p.runs.find((r) => r.text.startsWith('normal'))!;
    expect(bold.props.bold).toBe(true);
    expect(bold.props.italic).toBe(false);
    expect(italic.props.italic).toBe(true);
    expect(italic.props.bold).toBe(false);
    expect(normal.props.bold).toBe(false);
  });

  it('sublinhado, cor, tamanho, fonte, small-caps, tachado e sobrescrito', () => {
    const odt = makeOdt({
      automaticStyles:
        '<style:style style:name="T1" style:family="text"><style:text-properties ' +
        'style:text-underline-style="solid" fo:color="#FF0000" fo:font-size="14pt" ' +
        'style:font-name="Georgia" fo:font-variant="small-caps" ' +
        'style:text-line-through-style="solid" style:text-position="super 58%"/></style:style>',
      body: '<text:p><text:span text:style-name="T1">x</text:span></text:p>',
    });
    const run = paras(readOdt(odt).blocks)[0]!.runs.find((r) => r.text === 'x')!;
    expect(run.props.underline).toBe(true);
    expect(run.props.color).toBe('FF0000');
    expect(run.props.szHalfPt).toBe(28); // 14pt * 2
    expect(run.props.fontAscii).toBe('Georgia');
    expect(run.props.smallCaps).toBe(true);
    expect(run.props.strike).toBe(true);
    expect(run.props.vertAlign).toBe('superscript');
  });

  it('herança via style:parent-style-name (cascata)', () => {
    const odt = makeOdt({
      styles:
        '<style:style style:name="Base" style:family="text">' +
        '<style:text-properties fo:font-weight="bold"/></style:style>',
      automaticStyles:
        '<style:style style:name="T1" style:family="text" style:parent-style-name="Base">' +
        '<style:text-properties fo:color="#0000FF"/></style:style>',
      body: '<text:p><text:span text:style-name="T1">y</text:span></text:p>',
    });
    const run = paras(readOdt(odt).blocks)[0]!.runs.find((r) => r.text === 'y')!;
    expect(run.props.bold).toBe(true); // herdado do pai
    expect(run.props.color).toBe('0000FF'); // próprio
  });

  it('espaços (text:s), tab e quebra de linha', () => {
    const odt = makeOdt({
      body: '<text:p>a<text:s text:c="3"/>b<text:tab/>c<text:line-break/>d</text:p>',
    });
    const p = paras(readOdt(odt).blocks)[0]!;
    expect(paraText(p)).toBe('a   b\tc\nd');
  });

  it('hyperlink text:a vira run com link e sublinhado', () => {
    const odt = makeOdt({
      body: '<text:p><text:a xlink:href="https://example.com">clique</text:a></text:p>',
    });
    const run = paras(readOdt(odt).blocks)[0]!.runs.find((r) => r.text === 'clique')!;
    expect(run.props.link).toBe('https://example.com');
    expect(run.props.underline).toBe(true);
  });
});

describe('propriedades de parágrafo', () => {
  it('alinhamento, indentação e espaçamento a partir do estilo', () => {
    const odt = makeOdt({
      automaticStyles:
        '<style:style style:name="P1" style:family="paragraph"><style:paragraph-properties ' +
        'fo:text-align="center" fo:margin-left="1cm" fo:text-indent="0.5cm" ' +
        'fo:margin-top="6pt" fo:margin-bottom="12pt" fo:break-before="page"/></style:style>',
      body: '<text:p text:style-name="P1">centrado</text:p>',
    });
    const p = paras(readOdt(odt).blocks)[0]!;
    expect(p.props.alignment).toBe('center');
    expect(p.props.indentLeftTwips).toBe(567); // 1cm
    expect(p.props.indentFirstLineTwips).toBe(284); // 0.5cm ≈ 283.5 → 284
    expect(p.props.spaceBeforeTwips).toBe(120); // 6pt
    expect(p.props.spaceAfterTwips).toBe(240); // 12pt
    expect(p.props.pageBreakBefore).toBe(true);
  });

  it('justificado (justify→both) e fundo (shading)', () => {
    const odt = makeOdt({
      automaticStyles:
        '<style:style style:name="P1" style:family="paragraph"><style:paragraph-properties ' +
        'fo:text-align="justify" fo:background-color="#FFFF00"/></style:style>',
      body: '<text:p text:style-name="P1">just</text:p>',
    });
    const p = paras(readOdt(odt).blocks)[0]!;
    expect(p.props.alignment).toBe('both');
    expect(p.props.shadingHex).toBe('FFFF00');
  });

  it('bordas de parágrafo (fo:border "0.5pt solid #000000")', () => {
    const odt = makeOdt({
      automaticStyles:
        '<style:style style:name="P1" style:family="paragraph"><style:paragraph-properties ' +
        'fo:border="0.5pt solid #000000"/></style:style>',
      body: '<text:p text:style-name="P1">box</text:p>',
    });
    const p = paras(readOdt(odt).blocks)[0]!;
    expect(p.props.borders?.top?.style).toBe('single');
    expect(p.props.borders?.top?.sizeEighthPt).toBe(4); // 0.5pt * 8
    expect(p.props.borders?.top?.color).toBe('000000');
    expect(p.props.borders?.bottom?.style).toBe('single');
  });
});

describe('títulos', () => {
  it('text:h vira parágrafo com styleId HeadingN e aparência assada', () => {
    const odt = makeOdt({
      body: '<text:h text:outline-level="1">Título 1</text:h>' +
        '<text:h text:outline-level="2">Título 2</text:h>',
    });
    const ps = paras(readOdt(odt).blocks);
    expect(ps[0]!.props.styleId).toBe('Heading1');
    expect(ps[1]!.props.styleId).toBe('Heading2');
    // aparência assada no run (negrito + maior)
    expect(ps[0]!.runs[0]!.props.bold).toBe(true);
    expect(ps[0]!.runs[0]!.props.szHalfPt).toBeGreaterThan(22);
    expect(paraText(ps[0]!)).toBe('Título 1');
  });

  it('nível fora do intervalo é limitado a 1..6', () => {
    const odt = makeOdt({ body: '<text:h text:outline-level="9">x</text:h>' });
    expect(paras(readOdt(odt).blocks)[0]!.props.styleId).toBe('Heading6');
  });
});

describe('listas', () => {
  it('bullet vs. decimal por estilo de lista', () => {
    const odt = makeOdt({
      automaticStyles:
        '<text:list-style style:name="LB"><text:list-level-style-bullet text:level="1"/></text:list-style>' +
        '<text:list-style style:name="LN"><text:list-level-style-number text:level="1"/></text:list-style>',
      body:
        '<text:list text:style-name="LB"><text:list-item><text:p>b1</text:p></text:list-item>' +
        '<text:list-item><text:p>b2</text:p></text:list-item></text:list>' +
        '<text:list text:style-name="LN"><text:list-item><text:p>n1</text:p></text:list-item></text:list>',
    });
    const ps = paras(readOdt(odt).blocks);
    expect(ps[0]!.props.numbering).toEqual({ kind: 'bullet', ilvl: 0 });
    expect(ps[1]!.props.numbering).toEqual({ kind: 'bullet', ilvl: 0 });
    expect(ps[2]!.props.numbering).toEqual({ kind: 'decimal', ilvl: 0 });
    expect(paraText(ps[0]!)).toBe('b1');
  });

  it('listas aninhadas aumentam ilvl', () => {
    const odt = makeOdt({
      automaticStyles:
        '<text:list-style style:name="LB">' +
        '<text:list-level-style-bullet text:level="1"/>' +
        '<text:list-level-style-bullet text:level="2"/></text:list-style>',
      body:
        '<text:list text:style-name="LB"><text:list-item><text:p>top</text:p>' +
        '<text:list><text:list-item><text:p>nested</text:p></text:list-item></text:list>' +
        '</text:list-item></text:list>',
    });
    const ps = paras(readOdt(odt).blocks);
    expect(ps[0]!.props.numbering).toEqual({ kind: 'bullet', ilvl: 0 });
    expect(ps[1]!.props.numbering).toEqual({ kind: 'bullet', ilvl: 1 });
  });
});

describe('tabelas', () => {
  it('table:table vira TableBlock com linhas, células e gridSpan', () => {
    const odt = makeOdt({
      automaticStyles:
        '<style:style style:name="co1" style:family="table-column">' +
        '<style:table-column-properties style:column-width="3cm"/></style:style>',
      body:
        '<table:table>' +
        '<table:table-column table:style-name="co1" table:number-columns-repeated="2"/>' +
        '<table:table-row>' +
        '<table:table-cell><text:p>A1</text:p></table:table-cell>' +
        '<table:table-cell><text:p>B1</text:p></table:table-cell>' +
        '</table:table-row>' +
        '<table:table-row>' +
        '<table:table-cell table:number-columns-spanned="2"><text:p>merged</text:p></table:table-cell>' +
        '<table:covered-table-cell/>' +
        '</table:table-row>' +
        '</table:table>',
    });
    const tbl = readOdt(odt).blocks.find((b): b is TableBlock => b.type === 'table')!;
    expect(tbl.rows).toHaveLength(2);
    expect(tbl.rows[0]!.cells).toHaveLength(2);
    expect(paraText(tbl.rows[0]!.cells[0]!.paragraphs[0]!)).toBe('A1');
    expect(tbl.rows[1]!.cells).toHaveLength(1);
    expect(tbl.rows[1]!.cells[0]!.gridSpan).toBe(2);
    expect(tbl.gridColsTwips).toEqual([1701, 1701]); // 3cm = 1701 twips, repetido 2x
  });

  it('sombreamento e bordas de célula via style:table-cell-properties', () => {
    const odt = makeOdt({
      automaticStyles:
        '<style:style style:name="ce1" style:family="table-cell">' +
        '<style:table-cell-properties fo:background-color="#CCCCCC" ' +
        'fo:border="1pt solid #333333"/></style:style>',
      body:
        '<table:table><table:table-row>' +
        '<table:table-cell table:style-name="ce1"><text:p>shaded</text:p></table:table-cell>' +
        '</table:table-row></table:table>',
    });
    const tbl = readOdt(odt).blocks.find((b): b is TableBlock => b.type === 'table')!;
    const cell = tbl.rows[0]!.cells[0]!;
    expect(cell.shadingHex).toBe('CCCCCC');
    expect(cell.borders?.top?.color).toBe('333333');
    expect(cell.borders?.top?.sizeEighthPt).toBe(8); // 1pt * 8
  });
});

describe('imagens', () => {
  it('draw:frame/draw:image lê os bytes do zip e dimensões do frame', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5, 6, 7, 8]);
    const odt = makeOdt({
      body:
        '<text:p><draw:frame svg:width="2cm" svg:height="1cm">' +
        '<draw:image xlink:href="Pictures/x.png"/></draw:frame></text:p>',
      extraFiles: { 'Pictures/x.png': png },
    });
    const p = paras(readOdt(odt).blocks)[0]!;
    const imgRun = p.runs.find((r) => r.image)!;
    expect(imgRun.image!.ext).toBe('png');
    expect(imgRun.image!.data.length).toBe(png.length);
    expect(imgRun.image!.widthTwips).toBe(1134); // 2cm
    expect(imgRun.image!.heightTwips).toBe(567); // 1cm
  });
});

describe('anotações (comentários)', () => {
  it('office:annotation vira CommentInfo', () => {
    const odt = makeOdt({
      body:
        '<text:p>texto<office:annotation>' +
        '<dc:creator>Alice</dc:creator><text:p>um comentário</text:p>' +
        '</office:annotation></text:p>',
    });
    const doc = readOdt(odt);
    expect(doc.comments).toHaveLength(1);
    expect(doc.comments[0]!.author).toBe('Alice');
    expect(doc.comments[0]!.text).toBe('um comentário');
    expect(doc.comments[0]!.id).toBe(0);
  });
});

describe('geometria de página', () => {
  it('lê page-layout de styles.xml', () => {
    const odt = makeOdt({
      body: '<text:p>x</text:p>',
      pageLayout:
        '<style:page-layout style:name="PL"><style:page-layout-properties ' +
        'fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-left="2cm" ' +
        'fo:margin-right="2cm" fo:margin-top="2.5cm" fo:margin-bottom="2.5cm"/></style:page-layout>',
    });
    const sec = readOdt(odt).sections[0]!;
    expect(sec.sectPr.pageWidthTwips).toBe(11907); // 21cm
    expect(sec.sectPr.pageHeightTwips).toBe(16840); // 29.7cm ≈ 16839.9
    expect(sec.sectPr.marginLeftTwips).toBe(1134); // 2cm
    expect(sec.sectPr.marginTopTwips).toBe(1418); // 2.5cm ≈ 1417.5 → 1418
    expect(sec.blockStart).toBe(0);
    expect(sec.blockEnd).toBe(readOdt(odt).blocks.length);
  });

  it('cai para A4 quando não há page-layout', () => {
    const odt = makeOdt({ body: '<text:p>x</text:p>' });
    const sec = readOdt(odt).sections[0]!;
    expect(sec.sectPr.pageWidthTwips).toBe(11906);
    expect(sec.sectPr.pageHeightTwips).toBe(16838);
  });
});

describe('estrutura geral', () => {
  it('uma única seção cobre todos os blocos; maps de notas vazios', () => {
    const odt = makeOdt({ body: '<text:p>a</text:p><text:p>b</text:p>' });
    const doc = readOdt(odt);
    expect(doc.sections).toHaveLength(1);
    expect(doc.footnotes.size).toBe(0);
    expect(doc.endnotes.size).toBe(0);
    expect(doc.bookmarks.size).toBe(0);
    expect(doc.styles.has('Heading1')).toBe(true);
  });

  it('readOdt lança em pacote sem content.xml', () => {
    const zip = writeZip({ mimetype: enc.encode(MIME) });
    expect(() => readOdt(zip)).toThrow();
  });
});

import { describe, it, expect } from 'vitest';
import { unzipSync } from 'fflate';
import {
  DEFAULT_RUN_PROPS,
  type FullDocument,
  type Paragraph,
  type RunProps,
  type TableBlock,
} from '@universal-office/docx-core';
import { writeOdt } from './write-odt.js';
import { readOdt } from './index.js';

// Atalhos para montar parágrafos/runs
const rp = (over: Partial<RunProps> = {}): RunProps => ({ ...DEFAULT_RUN_PROPS, ...over });
const para = (
  text: string,
  pp: Paragraph['props'] = {},
  rpOver: Partial<RunProps> = {},
): Paragraph => ({
  runs: [{ text, props: rp(rpOver) }],
  props: pp,
});

const A4: FullDocument['sections'][0]['sectPr'] = {
  pageWidthTwips: 11906, pageHeightTwips: 16838,
  marginLeftTwips: 1417, marginRightTwips: 1417,
  marginTopTwips: 1417, marginBottomTwips: 1417,
};

function emptyFD(): FullDocument {
  return {
    blocks: [],
    sections: [{
      sectPr: A4, blockStart: 0, blockEnd: 0,
      headers: {}, footers: {}, headerRefs: [], footerRefs: [],
    }],
    footnotes: new Map(), endnotes: new Map(),
    comments: [], styles: new Map(), bookmarks: new Map(),
  };
}

function readContentXml(bytes: Uint8Array): string {
  const files = unzipSync(bytes);
  return new TextDecoder().decode(files['content.xml']);
}

describe('writeOdt — estrutura do pacote', () => {
  it('mimetype é a PRIMEIRA entrada e tem o valor canônico', () => {
    const odt = writeOdt(emptyFD());
    // local file header (LFH) começa em 0; nome do arquivo após 30 bytes
    const dec = new TextDecoder();
    const firstName = dec.decode(odt.subarray(30, 38));
    expect(firstName).toBe('mimetype');
    const files = unzipSync(odt);
    expect(dec.decode(files['mimetype'])).toBe('application/vnd.oasis.opendocument.text');
  });

  it('inclui content.xml, styles.xml e META-INF/manifest.xml', () => {
    const files = unzipSync(writeOdt(emptyFD()));
    expect(files['content.xml']).toBeDefined();
    expect(files['styles.xml']).toBeDefined();
    expect(files['META-INF/manifest.xml']).toBeDefined();
  });

  it('content.xml é XML 1.0 válido para parágrafos simples', () => {
    const fd = emptyFD();
    fd.blocks = [
      { type: 'paragraph', paragraph: para('Olá mundo & friends <html>') },
    ];
    fd.sections[0]!.blockEnd = 1;
    const xml = readContentXml(writeOdt(fd));
    // chars proibidos NÃO aparecem cru
    expect(xml).not.toContain('& f'); // & escapado
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&lt;html&gt;');
  });
});

describe('writeOdt — texto e formatação', () => {
  it('emite text:p para parágrafo normal', () => {
    const fd = emptyFD();
    fd.blocks = [{ type: 'paragraph', paragraph: para('Olá') }];
    fd.sections[0]!.blockEnd = 1;
    const xml = readContentXml(writeOdt(fd));
    expect(xml).toMatch(/<text:p[^>]*>Olá<\/text:p>/);
  });

  it('emite text:h com text:outline-level para headings', () => {
    const fd = emptyFD();
    fd.blocks = [
      { type: 'paragraph', paragraph: para('Cap1', { styleId: 'Heading1' }) },
      { type: 'paragraph', paragraph: para('Cap2', { styleId: 'Heading2' }) },
      { type: 'paragraph', paragraph: para('Título', { styleId: 'Title' }) },
    ];
    fd.sections[0]!.blockEnd = 3;
    const xml = readContentXml(writeOdt(fd));
    expect(xml).toMatch(/<text:h[^>]*text:outline-level="1"[^>]*>Cap1<\/text:h>/);
    expect(xml).toMatch(/<text:h[^>]*text:outline-level="2"[^>]*>Cap2<\/text:h>/);
    // Title vira heading nível 1
    expect((xml.match(/text:outline-level="1"/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('bold/italic produzem text:span com style apontando p/ auto-style', () => {
    const fd = emptyFD();
    fd.blocks = [{
      type: 'paragraph',
      paragraph: {
        runs: [
          { text: 'normal ', props: rp() },
          { text: 'negrito', props: rp({ bold: true }) },
          { text: ' italico', props: rp({ italic: true }) },
        ],
        props: {},
      },
    }];
    fd.sections[0]!.blockEnd = 1;
    const xml = readContentXml(writeOdt(fd));
    expect(xml).toContain('fo:font-weight="bold"');
    expect(xml).toContain('fo:font-style="italic"');
    expect(xml).toMatch(/<text:span[^>]*>negrito<\/text:span>/);
  });

  it('link vira text:a wrapping um text:span', () => {
    const fd = emptyFD();
    fd.blocks = [{
      type: 'paragraph',
      paragraph: {
        runs: [{ text: 'site', props: rp({ link: 'https://example.com' }) }],
        props: {},
      },
    }];
    fd.sections[0]!.blockEnd = 1;
    const xml = readContentXml(writeOdt(fd));
    expect(xml).toContain('xlink:href="https://example.com"');
    expect(xml).toMatch(/<text:a[^>]*>.*site.*<\/text:a>/);
  });

  it('listas viram text:list/text:list-item aninhados pela ilvl', () => {
    const fd = emptyFD();
    fd.blocks = [
      { type: 'paragraph', paragraph: para('A', { numbering: { kind: 'bullet', ilvl: 0 } }) },
      { type: 'paragraph', paragraph: para('A1', { numbering: { kind: 'bullet', ilvl: 1 } }) },
      { type: 'paragraph', paragraph: para('B', { numbering: { kind: 'bullet', ilvl: 0 } }) },
    ];
    fd.sections[0]!.blockEnd = 3;
    const xml = readContentXml(writeOdt(fd));
    expect(xml).toMatch(/<text:list[^>]*style-name="WNListBullet"/);
    // A1 vira lista aninhada dentro do item de A
    expect(xml.match(/<text:list/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

describe('writeOdt — espaços e quebras', () => {
  it('múltiplos espaços viram text:s com text:c', () => {
    const fd = emptyFD();
    fd.blocks = [{ type: 'paragraph', paragraph: para('a   b') }];
    fd.sections[0]!.blockEnd = 1;
    const xml = readContentXml(writeOdt(fd));
    expect(xml).toMatch(/<text:s text:c="2"\/>/);
  });

  it('tab e line break viram elementos próprios', () => {
    const fd = emptyFD();
    fd.blocks = [{ type: 'paragraph', paragraph: para('col1\tcol2\nlinha2') }];
    fd.sections[0]!.blockEnd = 1;
    const xml = readContentXml(writeOdt(fd));
    expect(xml).toContain('<text:tab/>');
    expect(xml).toContain('<text:line-break/>');
  });

  it('form feed (0x0C) vira text:soft-page-break (XML 1.0 proíbe cru)', () => {
    const fd = emptyFD();
    fd.blocks = [{ type: 'paragraph', paragraph: para('antes\fdepois') }];
    fd.sections[0]!.blockEnd = 1;
    const xml = readContentXml(writeOdt(fd));
    expect(xml).toContain('<text:soft-page-break/>');
    expect(xml).not.toContain('\f');
  });
});

describe('writeOdt — tabelas', () => {
  it('emite table:table com colunas e células', () => {
    const tbl: TableBlock = {
      type: 'table', gridColsTwips: [1000, 1000],
      rows: [
        { cells: [
          { paragraphs: [para('A')], tables: [], gridSpan: 1 },
          { paragraphs: [para('B')], tables: [], gridSpan: 1 },
        ] },
      ],
    };
    const fd = emptyFD();
    fd.blocks = [tbl];
    fd.sections[0]!.blockEnd = 1;
    const xml = readContentXml(writeOdt(fd));
    expect(xml).toContain('<table:table');
    expect(xml).toContain('<table:table-column');
    expect(xml).toMatch(/<table:table-row>.*<table:table-cell/);
    expect(xml).toContain('A</text:p>');
    expect(xml).toContain('B</text:p>');
  });

  it('gridSpan > 1 emite table:covered-table-cell', () => {
    const tbl: TableBlock = {
      type: 'table', gridColsTwips: [1000, 1000, 1000],
      rows: [
        { cells: [
          { paragraphs: [para('span2')], tables: [], gridSpan: 2 },
          { paragraphs: [para('C')], tables: [], gridSpan: 1 },
        ] },
      ],
    };
    const fd = emptyFD();
    fd.blocks = [tbl];
    fd.sections[0]!.blockEnd = 1;
    const xml = readContentXml(writeOdt(fd));
    expect(xml).toContain('table:number-columns-spanned="2"');
    expect(xml).toContain('<table:covered-table-cell/>');
  });
});

describe('writeOdt — comentários', () => {
  it('emite office:annotation com dc:creator no run que carrega o id', () => {
    const fd = emptyFD();
    fd.blocks = [{
      type: 'paragraph',
      paragraph: {
        runs: [{ text: 'comentado', props: rp({ commentIds: [42] }) }],
        props: {},
      },
    }];
    fd.sections[0]!.blockEnd = 1;
    fd.comments = [{ id: 42, author: 'Ana', text: 'rever isto' }];
    const xml = readContentXml(writeOdt(fd));
    expect(xml).toContain('<office:annotation>');
    expect(xml).toContain('<dc:creator>Ana</dc:creator>');
    expect(xml).toContain('rever isto');
  });

  it('só emite UMA vez por id, mesmo que múltiplos runs carreguem', () => {
    const fd = emptyFD();
    fd.blocks = [
      {
        type: 'paragraph',
        paragraph: {
          runs: [
            { text: 'um', props: rp({ commentIds: [1] }) },
            { text: ' dois', props: rp({ commentIds: [1] }) },
          ],
          props: {},
        },
      },
    ];
    fd.sections[0]!.blockEnd = 1;
    fd.comments = [{ id: 1, author: 'X', text: 'unica' }];
    const xml = readContentXml(writeOdt(fd));
    expect((xml.match(/<office:annotation>/g) ?? []).length).toBe(1);
  });
});

describe('writeOdt — round-trip via readOdt', () => {
  it('preserva texto, headings, tabela e comentários', () => {
    const tbl: TableBlock = {
      type: 'table', gridColsTwips: [1000, 1000],
      rows: [{ cells: [
        { paragraphs: [para('h1')], tables: [], gridSpan: 1 },
        { paragraphs: [para('h2')], tables: [], gridSpan: 1 },
      ] }],
    };
    const fd = emptyFD();
    fd.blocks = [
      { type: 'paragraph', paragraph: para('Título', { styleId: 'Heading1' }) },
      { type: 'paragraph', paragraph: para('Sub', { styleId: 'Heading2' }) },
      { type: 'paragraph', paragraph: {
        runs: [{ text: 'comentado', props: rp({ commentIds: [7] }) }],
        props: {},
      } },
      tbl,
    ];
    fd.sections[0]!.blockEnd = 4;
    fd.comments = [{ id: 7, author: 'Beto', text: 'nota7' }];

    const odt = writeOdt(fd);
    const back = readOdt(odt);

    // texto e estrutura
    const paras = back.blocks.filter((b) => b.type === 'paragraph').map((b) =>
      b.type === 'paragraph' ? b.paragraph : null,
    ).filter(Boolean) as Paragraph[];
    const texts = paras.map((p) => p.runs.map((r) => r.text).join(''));
    expect(texts).toContain('Título');
    expect(texts).toContain('Sub');
    expect(texts).toContain('comentado');

    // headings preservados como Heading1/Heading2
    const styleIds = paras.map((p) => p.props.styleId ?? '');
    expect(styleIds).toContain('Heading1');
    expect(styleIds).toContain('Heading2');

    // tabela preservada (1 tabela, 2 colunas, 1 linha de 2 células)
    const tables = back.blocks.filter((b) => b.type === 'table');
    expect(tables.length).toBe(1);
    expect((tables[0] as TableBlock).rows[0]!.cells.length).toBe(2);

    // comentário preservado
    expect(back.comments.length).toBe(1);
    expect(back.comments[0]!.author).toBe('Beto');
    expect(back.comments[0]!.text).toContain('nota7');
  });
});

describe('writeOdt — opções', () => {
  it('images:"omit" não inclui imagens nem entrada Pictures/', () => {
    const fd = emptyFD();
    const img = { data: new Uint8Array([0xff, 0xd8, 0xff]), ext: 'jpg', widthTwips: 100, heightTwips: 100 };
    fd.blocks = [{
      type: 'paragraph',
      paragraph: {
        runs: [{ text: '', props: rp(), image: img }],
        props: {},
      },
    }];
    fd.sections[0]!.blockEnd = 1;
    const files = unzipSync(writeOdt(fd, { images: 'omit' }));
    expect(Object.keys(files).some((n) => n.startsWith('Pictures/'))).toBe(false);
    expect(new TextDecoder().decode(files['content.xml'])).not.toContain('<draw:frame');
  });

  it('images:"embed" (default) inclui Pictures/imgN.<ext>', () => {
    const fd = emptyFD();
    const img = { data: new Uint8Array([0xff, 0xd8, 0xff]), ext: 'jpg', widthTwips: 100, heightTwips: 100 };
    fd.blocks = [{
      type: 'paragraph',
      paragraph: {
        runs: [{ text: '', props: rp(), image: img }],
        props: {},
      },
    }];
    fd.sections[0]!.blockEnd = 1;
    const files = unzipSync(writeOdt(fd));
    expect(Object.keys(files).filter((n) => n.startsWith('Pictures/')).length).toBe(1);
    const xml = new TextDecoder().decode(files['content.xml']);
    expect(xml).toContain('<draw:frame');
    expect(xml).toContain('<draw:image');
  });
});

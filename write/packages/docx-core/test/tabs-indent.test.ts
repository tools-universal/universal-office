import { describe, expect, it } from 'vitest';
import {
  DocxPackage, readFullDocument, writeDocument, markSectionBreaks, writeDefaultTabStop,
  type FullDocument, type Paragraph, type Block,
} from '../src/index.js';

// Tabulações e recuos do parágrafo como a régua e o diálogo Tabulação os
// gravam — fatos do Word em write/tools/nav-lab/results (oráculo da frente
// Navegação): o tipo/preenchimento de cada w:tab chega inteiro ao modelo
// (center, decimal, bar, clear e os cinco preenchimentos), o que não muda sai
// byte a byte e atributo de recuo igual ao herdado sai do XML.

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const make = (body: string): DocxPackage => {
  const pkg = DocxPackage.empty();
  pkg.setPartText('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document ${NS}><w:body>${body}<w:sectPr/></w:body></w:document>`);
  return pkg;
};
const open = (pkg: DocxPackage): FullDocument => {
  const full = readFullDocument(pkg, { sources: true });
  markSectionBreaks(full);
  full.sources!.baseline();
  return full;
};
const paras = (blocks: Block[]): Paragraph[] =>
  blocks.filter((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph').map((b) => b.paragraph);
const save = (pkg: DocxPackage, full: FullDocument): string => {
  writeDocument(pkg, { paragraphs: paras(full.blocks), sectPr: full.sections[0]!.sectPr }, [], { blocks: full.blocks, sources: full.sources });
  return pkg.documentXml();
};

const TABS = '<w:tabs><w:tab w:val="clear" w:pos="2000"/><w:tab w:val="center" w:pos="2835"/><w:tab w:val="decimal" w:leader="middleDot" w:pos="5669"/><w:tab w:val="bar" w:pos="7000"/><w:tab w:val="right" w:leader="none" w:pos="9000"/></w:tabs>';

describe('tabulações no modelo de edição', () => {
  it('lê todos os tipos e preenchimentos, inclusive clear (antes ficavam só esquerda/direita)', () => {
    const full = open(make(`<w:p><w:pPr>${TABS}</w:pPr><w:r><w:t>a</w:t></w:r></w:p>`));
    expect(paras(full.blocks)[0]!.props.tabStops).toEqual([
      { posTwips: 2000, align: 'clear' },
      { posTwips: 2835, align: 'center' },
      { posTwips: 5669, align: 'decimal', leader: 'middleDot' },
      { posTwips: 7000, align: 'bar' },
      { posTwips: 9000, align: 'right' },
    ]);
  });

  it('salvar sem mexer devolve o w:tabs como estava (w:leader="none" incluído)', () => {
    const pkg = make(`<w:p><w:pPr>${TABS}</w:pPr><w:r><w:t>a</w:t></w:r></w:p>`);
    const full = open(pkg);
    paras(full.blocks)[0]!.runs[0]!.text = 'ab';
    expect(save(pkg, full)).toContain(TABS);
  });

  it('editar grava na ordem dada, como o Word (w:val, w:leader, w:pos)', () => {
    const pkg = make('<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>a</w:t></w:r></w:p>');
    const full = open(pkg);
    paras(full.blocks)[0]!.props.tabStops = [{ posTwips: 2000, align: 'clear' }, { posTwips: 3000, align: 'left' }, { posTwips: 4000, align: 'decimal', leader: 'dot' }];
    const xml = save(pkg, full);
    expect(xml).toContain('<w:pPr><w:tabs><w:tab w:val="clear" w:pos="2000"/><w:tab w:val="left" w:pos="3000"/><w:tab w:val="decimal" w:leader="dot" w:pos="4000"/></w:tabs><w:jc w:val="center"/></w:pPr>');
  });

  it('tirar todas tira o w:tabs', () => {
    const pkg = make(`<w:p><w:pPr>${TABS}</w:pPr><w:r><w:t>a</w:t></w:r></w:p>`);
    const full = open(pkg);
    paras(full.blocks)[0]!.props.tabStops = undefined;
    expect(save(pkg, full)).not.toContain('<w:tabs>');
  });
});

describe('recuos', () => {
  it('voltar ao herdado tira o w:ind inteiro (oráculo ind-to-zero)', () => {
    const pkg = make('<w:p><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:r><w:t>a</w:t></w:r></w:p>');
    const full = open(pkg);
    const p = paras(full.blocks)[0]!;
    p.props.indentLeftTwips = undefined;
    p.props.indentFirstLineTwips = undefined;
    expect(save(pkg, full)).not.toContain('<w:ind');
  });

  it('zero explícito contra o herdado vai para o XML (ind-style-zero, ind-list-first)', () => {
    const pkg = make('<w:p><w:pPr><w:pStyle w:val="PargrafodaLista"/></w:pPr><w:r><w:t>a</w:t></w:r></w:p><w:p><w:r><w:t>b</w:t></w:r></w:p>');
    const full = open(pkg);
    const [p0] = paras(full.blocks);
    p0!.props.indentLeftTwips = 0;
    p0!.props.indentFirstLineTwips = 0;
    // parágrafo novo (sem XML de origem): o mesmo
    const novo: Paragraph = { runs: [{ text: 'c', props: { ...p0!.runs[0]!.props } }], props: { indentLeftTwips: 0, indentFirstLineTwips: 0 } };
    full.blocks.push({ type: 'paragraph', paragraph: novo });
    const xml = save(pkg, full);
    expect(xml).toContain('<w:ind w:left="0" w:firstLine="0"/>');
    expect(xml.split('<w:ind w:left="0" w:firstLine="0"/>').length - 1).toBe(2);
  });
});

describe('tabulação padrão (w:defaultTabStop)', () => {
  const settings = (inner: string): DocxPackage => {
    const pkg = make('<w:p/>');
    pkg.setPartText('word/settings.xml', `<?xml version="1.0" encoding="UTF-8"?><w:settings ${NS}>${inner}</w:settings>`);
    return pkg;
  };
  it('troca o valor que existe', () => {
    const pkg = settings('<w:zoom w:percent="100"/><w:defaultTabStop w:val="708"/><w:hyphenationZone w:val="425"/>');
    writeDefaultTabStop(pkg, 566.93);
    expect(pkg.getPartText('word/settings.xml')).toContain('<w:zoom w:percent="100"/><w:defaultTabStop w:val="567"/><w:hyphenationZone w:val="425"/>');
  });
  it('sem o elemento: entra na posição do schema', () => {
    const pkg = settings('<w:zoom w:percent="100"/><w:trackRevisions/><w:characterSpacingControl w:val="doNotCompress"/>');
    writeDefaultTabStop(pkg, 720);
    expect(pkg.getPartText('word/settings.xml')).toContain('<w:trackRevisions/><w:defaultTabStop w:val="720"/><w:characterSpacingControl');
  });
});

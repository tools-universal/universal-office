import { describe, expect, it } from 'vitest';
import {
  DocxPackage, readFullDocument, writeDocument, markSectionBreaks, writeHyphenationSettings, parseXml,
  type FullDocument, type Paragraph, type Block,
} from '../src/index.js';
import { readSectPr } from '../src/document.js';

// Layout do texto como o Word grava — fatos em write/tools/textlayout-lab/results
// (oráculo da frente Layout do texto): quebras de linha e de página do parágrafo
// (ligado, desligado contra o herdado com w:val="0", herdado = sem elemento),
// números de linha e alinhamento vertical da seção, opções de hifenização no
// settings.xml.

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const SECT = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>';
const make = (body: string, sect = SECT): DocxPackage => {
  const pkg = DocxPackage.empty();
  pkg.setPartText('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document ${NS}><w:body>${body}${sect}</w:body></w:document>`);
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
  writeDocument(pkg, { paragraphs: paras(full.blocks), sectPr: full.sections[full.sections.length - 1]!.sectPr }, [], { blocks: full.blocks, sources: full.sources });
  return pkg.documentXml();
};
const P = '<w:p><w:r><w:t>um dois tres</w:t></w:r></w:p>';

describe('Quebras de linha e de página (pPr)', () => {
  it('lê ligado, desligado (w:val="0") e o ajuste rígido', () => {
    const full = open(make('<w:p><w:pPr><w:keepNext w:val="0"/><w:keepLines/><w:widowControl w:val="0"/><w:suppressLineNumbers/><w:suppressAutoHyphens w:val="0"/><w:textboxTightWrap w:val="firstLineOnly"/></w:pPr><w:r><w:t>a</w:t></w:r></w:p>'));
    expect(paras(full.blocks)[0]!.props).toMatchObject({
      keepNext: false, keepLines: true, widowControl: false, suppressLineNumbers: true, suppressAutoHyphens: false, textboxTightWrap: 'firstLineOnly',
    });
  });

  it('grava todos na ordem do schema (oráculo pf-all)', () => {
    const pkg = make(P);
    const full = open(pkg);
    Object.assign(paras(full.blocks)[0]!.props, { widowControl: false, keepNext: true, keepLines: true, pageBreakBefore: true, suppressLineNumbers: true, suppressAutoHyphens: true });
    expect(save(pkg, full)).toContain('<w:pPr><w:keepNext/><w:keepLines/><w:pageBreakBefore/><w:widowControl w:val="0"/><w:suppressLineNumbers/><w:suppressAutoHyphens/></w:pPr>');
  });

  it('desligar contra o estilo grava w:val="0"; voltar ao herdado tira o elemento (pf-heading-off, pf-widow-on)', () => {
    const pkg = make('<w:p><w:pPr><w:pStyle w:val="Ttulo1"/><w:widowControl w:val="0"/></w:pPr><w:r><w:t>a</w:t></w:r></w:p>');
    const full = open(pkg);
    const p = paras(full.blocks)[0]!;
    p.props.keepNext = false;
    p.props.keepLines = false;
    delete p.props.widowControl;
    expect(save(pkg, full)).toContain('<w:pPr><w:pStyle w:val="Ttulo1"/><w:keepNext w:val="0"/><w:keepLines w:val="0"/></w:pPr>');
  });

  it('ajuste rígido: os quatro valores; Nenhum tira (pf-tight-*)', () => {
    for (const v of ['allLines', 'firstAndLastLine', 'firstLineOnly', 'lastLineOnly'] as const) {
      const pkg = make(P);
      const full = open(pkg);
      paras(full.blocks)[0]!.props.textboxTightWrap = v;
      expect(save(pkg, full)).toContain(`<w:pPr><w:textboxTightWrap w:val="${v}"/></w:pPr>`);
    }
    const pkg = make('<w:p><w:pPr><w:textboxTightWrap w:val="allLines"/></w:pPr><w:r><w:t>a</w:t></w:r></w:p>');
    const full = open(pkg);
    delete paras(full.blocks)[0]!.props.textboxTightWrap;
    expect(save(pkg, full)).not.toContain('textboxTightWrap');
  });

  it('parágrafo novo (sem XML de origem) leva as flags na ordem', () => {
    const pkg = make(P);
    const full = open(pkg);
    const ps = paras(full.blocks);
    full.blocks.push({ type: 'paragraph', paragraph: { runs: [{ text: 'novo', props: ps[0]!.runs[0]!.props }], props: { suppressAutoHyphens: true, keepLines: true, widowControl: false, textboxTightWrap: 'allLines', alignment: 'center' } } });
    expect(save(pkg, full)).toContain('<w:pPr><w:keepLines/><w:widowControl w:val="0"/><w:suppressAutoHyphens/><w:jc w:val="center"/><w:textboxTightWrap w:val="allLines"/></w:pPr>');
  });
});

describe('espaçamento "Automático" (w:beforeAutospacing/afterAutospacing)', () => {
  it('liga só o atributo (sp-before-auto, sp-after-auto) e lê de volta', () => {
    const pkg = make(P);
    const full = open(pkg);
    Object.assign(paras(full.blocks)[0]!.props, { spaceBeforeAuto: true });
    expect(save(pkg, full)).toContain('<w:pPr><w:spacing w:beforeAutospacing="1"/></w:pPr>');
    const back = open(make('<w:p><w:pPr><w:spacing w:before="120" w:afterAutospacing="1"/></w:pPr><w:r><w:t>a</w:t></w:r></w:p>'));
    expect(paras(back.blocks)[0]!.props).toMatchObject({ spaceBeforeTwips: 120, spaceAfterAuto: true });
  });

  it('valor digitado tira o Automático; espaçamento vazio sai do pPr', () => {
    const pkg = make('<w:p><w:pPr><w:spacing w:beforeAutospacing="1"/><w:jc w:val="center"/></w:pPr><w:r><w:t>a</w:t></w:r></w:p>');
    const full = open(pkg);
    const p = paras(full.blocks)[0]!;
    p.props.spaceBeforeTwips = 120;
    delete p.props.spaceBeforeAuto;
    expect(save(pkg, full)).toContain('<w:pPr><w:spacing w:before="120"/><w:jc w:val="center"/></w:pPr>');
    delete p.props.spaceBeforeTwips;
    expect(save(pkg, full)).toContain('<w:pPr><w:jc w:val="center"/></w:pPr>');
  });
});

describe('números de linha e alinhamento vertical (sectPr)', () => {
  const sect = (inner: string): ReturnType<typeof readSectPr> => readSectPr(parseXml(`<w:sectPr ${NS}>${inner}</w:sectPr>`));
  it('lê w:lnNumType nos valores do XML e w:vAlign', () => {
    expect(sect('<w:lnNumType w:countBy="5" w:start="2" w:distance="567" w:restart="newSection"/><w:vAlign w:val="both"/>'))
      .toMatchObject({ lnNumType: { countBy: 5, start: 2, distance: 567, restart: 'newSection' }, vAlign: 'both' });
    expect(sect('<w:lnNumType w:countBy="1"/><w:vAlign w:val="top"/>').lnNumType).toEqual({ countBy: 1 });
    expect(sect('<w:vAlign w:val="top"/>').vAlign).toBeUndefined();
  });

  const cases: [string, NonNullable<ReturnType<typeof readSectPr>['lnNumType']>, string][] = [
    ['ln-continuous (cada página)', { countBy: 1 }, '<w:lnNumType w:countBy="1"/>'],
    ['ln-cont (Contínuo)', { countBy: 1, restart: 'continuous' }, '<w:lnNumType w:countBy="1" w:restart="continuous"/>'],
    ['ln-section', { countBy: 1, restart: 'newSection' }, '<w:lnNumType w:countBy="1" w:restart="newSection"/>'],
    ['ln-start3 (Iniciar em 3)', { countBy: 1, start: 2 }, '<w:lnNumType w:countBy="1" w:start="2"/>'],
    ['ln-dist (1 cm)', { countBy: 1, distance: 567 }, '<w:lnNumType w:countBy="1" w:distance="567"/>'],
    ['ln-all', { countBy: 5, start: 2, distance: 567, restart: 'newSection' }, '<w:lnNumType w:countBy="5" w:start="2" w:distance="567" w:restart="newSection"/>'],
  ];
  for (const [name, ln, xml] of cases) {
    it(`grava como o Word: ${name}`, () => {
      const pkg = make(P);
      const full = open(pkg);
      full.sections[0]!.sectPr.lnNumType = ln;
      expect(save(pkg, full)).toContain(`<w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>${xml}<w:cols w:space="708"/>`);
    });
  }

  it('desligar tira o elemento (ln-off); alinhamento vertical entra depois de w:cols e superior tira', () => {
    const pkg = make(P, SECT.replace('<w:cols', '<w:lnNumType w:countBy="1"/><w:cols').replace('<w:docGrid', '<w:vAlign w:val="center"/><w:docGrid'));
    const full = open(pkg);
    const sp = full.sections[0]!.sectPr;
    delete sp.lnNumType;
    sp.vAlign = 'bottom';
    let xml = save(pkg, full);
    expect(xml).not.toContain('lnNumType');
    expect(xml).toContain('<w:cols w:space="708"/><w:vAlign w:val="bottom"/><w:docGrid');
    delete sp.vAlign;
    xml = save(pkg, full);
    expect(xml).not.toContain('vAlign');
  });

  it('sem mexer, a seção sai byte a byte (mesmo com atributos fora da ordem)', () => {
    const raw = SECT.replace('<w:cols', '<w:lnNumType w:restart="continuous" w:countBy="1"/><w:cols');
    const pkg = make(P, raw);
    const full = open(pkg);
    paras(full.blocks)[0]!.runs[0]!.text = 'x';
    expect(save(pkg, full)).toContain(raw);
  });
});

describe('hifenização no settings.xml', () => {
  const SET = (inner: string): DocxPackage => {
    const pkg = make(P);
    pkg.setPartText('word/settings.xml', `<?xml version="1.0" encoding="UTF-8"?><w:settings ${NS}><w:zoom w:percent="100"/><w:defaultTabStop w:val="708"/>${inner}<w:characterSpacingControl w:val="doNotCompress"/></w:settings>`);
    return pkg;
  };
  const settings = (pkg: DocxPackage): string => pkg.getPartText('word/settings.xml')!;

  it('Automática grava w:autoHyphenation depois da tabulação padrão (hy-auto)', () => {
    const pkg = SET('<w:hyphenationZone w:val="425"/>');
    writeHyphenationSettings(pkg, { auto: true, caps: true, limit: 0, zone: 425 });
    expect(settings(pkg)).toContain('<w:defaultTabStop w:val="708"/><w:autoHyphenation/><w:hyphenationZone w:val="425"/><w:characterSpacingControl');
  });

  it('Nenhuma TIRA o elemento (hy-none); MAIÚSCULAS e limite de volta tiram os deles', () => {
    const pkg = SET('<w:autoHyphenation/><w:consecutiveHyphenLimit w:val="2"/><w:hyphenationZone w:val="425"/><w:doNotHyphenateCaps/>');
    writeHyphenationSettings(pkg, { auto: false, caps: true, limit: 0, zone: 425 });
    expect(settings(pkg)).toContain('<w:defaultTabStop w:val="708"/><w:hyphenationZone w:val="425"/><w:characterSpacingControl');
  });

  it('zona ausente no estado (o arquivo não tinha) sai — o desfazer volta a "sem zona"', () => {
    const pkg = SET('<w:autoHyphenation/><w:hyphenationZone w:val="567"/>');
    writeHyphenationSettings(pkg, { auto: true, caps: true, limit: 0 });
    expect(settings(pkg)).toContain('<w:defaultTabStop w:val="708"/><w:autoHyphenation/><w:characterSpacingControl');
  });

  it('todas as opções na ordem do schema (hy-all)', () => {
    const pkg = SET('<w:hyphenationZone w:val="425"/>');
    writeHyphenationSettings(pkg, { auto: true, caps: false, limit: 3, zone: 567 });
    expect(settings(pkg)).toContain('<w:defaultTabStop w:val="708"/><w:autoHyphenation/><w:consecutiveHyphenLimit w:val="3"/><w:hyphenationZone w:val="567"/><w:doNotHyphenateCaps/><w:characterSpacingControl');
  });

  it('sem nada a ligar e sem settings.xml, não cria a parte', () => {
    const pkg = make(P);
    writeHyphenationSettings(pkg, { auto: false, caps: true, limit: 0 });
    expect(pkg.getPartText('word/settings.xml')).toBeFalsy();
  });
});

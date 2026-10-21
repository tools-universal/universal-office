import { describe, expect, it } from 'vitest';
import {
  DocxPackage, readFullDocument, writeDocument, markSectionBreaks, parseXml, firstChild,
  insertSectionBreak, sectionRanges, columnsFor, presetColumns, columnsPresetOf, columnWidths, maxColumns, setOrientation,
  deleteRange, type DocumentModel, type FullDocument, type Paragraph, type Block, type HfPartInfo, type SectPr,
} from '../src/index.js';
import { patchSectPr } from '../src/lossless.js';
import { readSectPr } from '../src/document.js';
import { sectPrInner } from '../src/serialize.js';

// Regras medidas no Word 365 pt-BR (write/tools/sections-lab, results/*.txt).

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
  + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const A4 = '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>';
const txt = (t: string) => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
const three = txt('Alpha beta') + txt('Gamma delta') + txt('Epsilon zeta');

function make(body: string, sect: string, parts: Record<string, string> = {}, rels = ''): DocxPackage {
  const pkg = DocxPackage.empty();
  pkg.setPartText('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document ${NS}><w:body>${body}${sect}</w:body></w:document>`);
  for (const [k, v] of Object.entries(parts)) pkg.setPartText(k, v);
  if (rels) pkg.setPartText('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`);
  return pkg;
}

function open(pkg: DocxPackage): { full: FullDocument; model: DocumentModel } {
  const full = readFullDocument(pkg, { sources: true });
  markSectionBreaks(full);
  full.sources!.baseline();
  const last = full.sections[full.sections.length - 1]!;
  const model: DocumentModel = {
    paragraphs: paras(full.blocks), sectPr: last.sectPr,
    bodyRefs: {
      headerRefs: last.headerRefs.map((r) => ({ kind: 'header' as const, type: r.type, rid: r.rid })),
      footerRefs: last.footerRefs.map((r) => ({ kind: 'footer' as const, type: r.type, rid: r.rid })),
    },
  };
  return { full, model };
}

const paras = (blocks: Block[]): Paragraph[] =>
  blocks.filter((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph').map((b) => b.paragraph);

/** Salva como o editor: partes de cabeçalho/rodapé de todas as seções; refs do corpo do modelo. */
function save(pkg: DocxPackage, full: FullDocument, model: DocumentModel): string {
  const hfParts: HfPartInfo[] = [];
  for (const s of full.sections) {
    for (const [kind, refs, set] of [['header', s.headerRefs, s.headers], ['footer', s.footerRefs, s.footers]] as const) {
      for (const r of refs) if (set[r.type] && !hfParts.some((h) => h.path === r.path)) hfParts.push({ kind, type: r.type, rid: r.rid, path: r.path, paragraphs: set[r.type]!, dirty: false });
    }
  }
  writeDocument(pkg, model, hfParts, {
    bodySectRefs: [...(model.bodyRefs?.headerRefs ?? []), ...(model.bodyRefs?.footerRefs ?? [])],
    sources: full.sources,
    blocks: model.paragraphs.map((paragraph) => ({ type: 'paragraph' as const, paragraph })),
  });
  return pkg.documentXml();
}

/** w:sectPr do corpo e os dos parágrafos, na ordem. */
const sectPrs = (xml: string): string[] => [...xml.matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr>|<w:sectPr\/>/g)].map((m) => m[0]);
const texts = (m: DocumentModel) => m.paragraphs.map((p) => p.runs.map((r) => r.text).join(''));

describe('insertSectionBreak (regras do Word)', () => {
  it('no meio do parágrafo: divide, a 1ª metade leva a cópia e o tipo vai para a seção de depois (sb-cont-mid)', () => {
    const pkg = make(three, `<w:sectPr>${A4}<w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>`);
    const { full, model } = open(pkg);
    const at = insertSectionBreak(model, { para: 1, offset: 6 }, 'continuous', { raw: full.sources!.sectPrRaw() });
    expect(texts(model)).toEqual(['Alpha beta', 'Gamma ', 'delta', 'Epsilon zeta']);
    expect(at).toEqual({ para: 2, offset: 0 });
    expect(model.paragraphs[1]!.props.sectionBreak!.sectPr.type).toBeUndefined();
    expect(model.sectPr.type).toBe('continuous');
    const s = sectPrs(save(pkg, full, model));
    // a cópia mantém o que o modelo não representa (docGrid); o corpo ganha w:type
    expect(s[0]).toBe(`<w:sectPr>${A4}<w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>`);
    expect(s[1]).toBe(`<w:sectPr><w:type w:val="continuous"/>${A4}<w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>`);
  });

  it('no início e no fim do parágrafo: a metade vazia é um parágrafo (sb-next-start, sb-next-end)', () => {
    const m1 = open(make(three, `<w:sectPr>${A4}</w:sectPr>`)).model;
    insertSectionBreak(m1, { para: 1, offset: 0 });
    expect(texts(m1)).toEqual(['Alpha beta', '', 'Gamma delta', 'Epsilon zeta']);
    expect(m1.paragraphs[1]!.props.sectionBreak).toBeDefined();
    const m2 = open(make(three, `<w:sectPr>${A4}</w:sectPr>`)).model;
    const at = insertSectionBreak(m2, { para: 0, offset: 10 });
    expect(texts(m2)).toEqual(['Alpha beta', '', 'Gamma delta', 'Epsilon zeta']);
    expect(m2.paragraphs[0]!.props.sectionBreak).toBeDefined();
    expect(at).toEqual({ para: 1, offset: 0 });
  });

  it('as refs de cabeçalho/rodapé MUDAM para a seção de antes; a de depois fica vinculada (sb-hdr-next)', () => {
    const hdr = `<?xml version="1.0" encoding="UTF-8"?><w:hdr ${NS}>${txt('Cabecalho')}</w:hdr>`;
    const pkg = make(three, `<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/>${A4}</w:sectPr>`, { 'word/header1.xml': hdr },
      '<Relationship Id="rIdH" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>');
    const { full, model } = open(pkg);
    insertSectionBreak(model, { para: 1, offset: 6 }, 'nextPage', { raw: full.sources!.sectPrRaw() });
    expect(model.paragraphs[1]!.props.sectionBreak!.headerRefs).toEqual([{ kind: 'header', type: 'default', rid: 'rIdH' }]);
    expect(model.bodyRefs).toEqual({ headerRefs: [], footerRefs: [] });
    const s = sectPrs(save(pkg, full, model));
    expect(s[0]).toBe(`<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/>${A4}</w:sectPr>`);
    expect(s[1]).toBe(`<w:sectPr>${A4}</w:sectPr>`);
  });

  it('numa seção encerrada por parágrafo: a cópia leva o tipo dela e a original fica com o novo (sb-twice)', () => {
    const pkg = make(`<w:p><w:pPr><w:sectPr><w:type w:val="evenPage"/>${A4}</w:sectPr></w:pPr><w:r><w:t>Alpha beta</w:t></w:r></w:p>${txt('Gamma delta')}`, `<w:sectPr>${A4}</w:sectPr>`);
    const { full, model } = open(pkg);
    insertSectionBreak(model, { para: 0, offset: 5 }, 'continuous', { raw: full.sources!.sectPrRaw(model.paragraphs[0]) });
    expect(texts(model)).toEqual(['Alpha', ' beta', 'Gamma delta']);
    expect(model.paragraphs[0]!.props.sectionBreak!.sectPr.type).toBe('evenPage');
    expect(model.paragraphs[1]!.props.sectionBreak!.sectPr.type).toBe('continuous');
    expect(sectionRanges(model).map((r) => [r.start, r.end])).toEqual([[0, 0], [1, 1], [2, 2]]);
    const s = sectPrs(save(pkg, full, model));
    expect(s[0]).toBe(`<w:sectPr><w:type w:val="evenPage"/>${A4}</w:sectPr>`);
    expect(s[1]).toBe(`<w:sectPr><w:type w:val="continuous"/>${A4}</w:sectPr>`);
  });

  it('apagar a marca da quebra funde as seções e fica o sectPr de depois (del-mid-delete)', () => {
    const m = open(make(three, `<w:sectPr>${A4}</w:sectPr>`)).model;
    insertSectionBreak(m, { para: 1, offset: 6 }, 'continuous');
    deleteRange(m, { start: { para: 1, offset: 6 }, end: { para: 2, offset: 0 } });
    expect(texts(m)).toEqual(['Alpha beta', 'Gamma delta', 'Epsilon zeta']);
    expect(sectionRanges(m)).toHaveLength(1);
    expect(m.sectPr.type).toBe('continuous');
  });
});

describe('colunas (regras do Word)', () => {
  const a4 = (): SectPr => readSectPr(parseXml(`<w:sectPr ${NS}>${A4}</w:sectPr>`));

  it('colunas iguais, linha e desiguais no XML do Word (cols-2, cols-2-line, cols-uneq)', () => {
    const sp = a4();
    sp.cols = columnsFor(sp, { count: 2 });
    expect(sectPrInner(sp)).toContain('<w:cols w:num="2" w:space="708"/>');
    sp.cols = columnsFor(sp, { count: 2, sep: true });
    expect(sectPrInner(sp)).toContain('<w:cols w:num="2" w:sep="1" w:space="708"/>');
    sp.cols = columnsFor(sp, { count: 2, widths: [{ widthTwips: 2400, spaceTwips: 600 }, { widthTwips: 5504, spaceTwips: 0 }] });
    expect(sectPrInner(sp)).toContain('<w:cols w:num="2" w:space="708" w:equalWidth="0"><w:col w:w="2400" w:space="600"/><w:col w:w="5504" w:space="708"/></w:cols>');
  });

  it('largura mínima 720: o espaço encolhe e o máximo é ⌊W/720⌋ (cols-limit)', () => {
    const sp = a4();
    expect(maxColumns(sp)).toBe(11);
    expect(columnsFor(sp, { count: 6 })).toEqual({ count: 6, spaceTwips: 708, sep: false });
    expect(columnsFor(sp, { count: 7 })!.spaceTwips).toBe(577);
    expect(columnsFor(sp, { count: 11 })!.spaceTwips).toBe(58);
    expect(columnsFor(sp, { count: 20 })!.count).toBe(11);
    expect(columnsFor(sp, { count: 1 })).toBeUndefined();
  });

  it('predefinições e a predefinição corrente', () => {
    const sp = a4();
    expect(presetColumns(sp, 'left').widths!.map((w) => w.widthTwips)).toEqual([2363, 5433]);
    expect(presetColumns(sp, 'right').widths!.map((w) => w.widthTwips)).toEqual([5433, 2363]);
    sp.cols = columnsFor(sp, presetColumns(sp, 'left'));
    expect(columnsPresetOf(sp)).toBe('left');
    sp.cols = columnsFor(sp, presetColumns(sp, 'three'));
    expect(columnsPresetOf(sp)).toBe('three');
    expect(columnWidths(sp).map((w) => w.widthTwips)).toEqual([2363, 2363, 2363]);
  });

  it('patchSectPr: tipo e colunas sobre o cru; uma coluna mantém a linha (cols-back1)', () => {
    const raw = `<w:sectPr><w:type w:val="continuous"/>${A4}<w:cols w:num="2" w:sep="1" w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>`;
    const cur = readSectPr(parseXml(raw.replace('<w:sectPr>', `<w:sectPr ${NS}>`)));
    delete cur.type;
    cur.cols = undefined;
    expect(patchSectPr(raw, cur, undefined)).toBe(`<w:sectPr>${A4}<w:cols w:sep="1" w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>`);
  });
});

describe('orientação', () => {
  it('gira as margens como o Word (orient-asym)', () => {
    const sp: SectPr = { pageWidthTwips: 11906, pageHeightTwips: 16838, marginTopTwips: 1000, marginRightTwips: 1100, marginBottomTwips: 1200, marginLeftTwips: 1300 };
    setOrientation(sp, 'landscape');
    expect([sp.pageWidthTwips, sp.pageHeightTwips, sp.marginTopTwips, sp.marginRightTwips, sp.marginBottomTwips, sp.marginLeftTwips]).toEqual([16838, 11906, 1300, 1000, 1100, 1200]);
    setOrientation(sp, 'portrait');
    expect([sp.marginTopTwips, sp.marginRightTwips, sp.marginBottomTwips, sp.marginLeftTwips]).toEqual([1000, 1100, 1200, 1300]);
  });
});

describe('leitura', () => {
  it('w:type e colunas desiguais', () => {
    const sp = readSectPr(firstChild(parseXml(`<w:body ${NS}><w:sectPr><w:type w:val="nextColumn"/>${A4}<w:cols w:num="2" w:space="708" w:equalWidth="0"><w:col w:w="2362" w:space="708"/><w:col w:w="5434"/></w:cols></w:sectPr></w:body>`), 'w:sectPr'));
    expect(sp.type).toBe('nextColumn');
    expect(sp.cols).toEqual({ count: 2, spaceTwips: 708, sep: false, widths: [{ widthTwips: 2362, spaceTwips: 708 }, { widthTwips: 5434, spaceTwips: 0 }] });
  });
});

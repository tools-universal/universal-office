import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  DocxPackage, readFullDocument, readDocument, writeDocument,
  type DocumentModel, type HfPartInfo,
} from '../src/index.js';

const CATALOG = 'D:\\Projects\\OfficeNext\\write\\samples\\Catalogo-Recursos-Word.docx';
const labOut = 'D:\\Projects\\OfficeNext\\write\\tools\\word-lab\\results\\edited';

const blank = (): DocumentModel => ({
  paragraphs: [{ runs: [], props: {} }],
  sectPr: { pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417 },
});

describe('serialização multi-seção', () => {
  it('sectionBreak no pPr serializa e relê como 2 seções', () => {
    const m = blank();
    m.paragraphs = [
      { runs: [{ text: 'Seção 1 retrato', props: {} as never }], props: {
        sectionBreak: {
          sectPr: { pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417 },
          headerRefs: [], footerRefs: [],
        },
      } },
      { runs: [{ text: 'Seção 2 paisagem', props: {} as never }], props: {} },
    ];
    // seção 2 (body) é paisagem
    m.sectPr = { pageWidthTwips: 16838, pageHeightTwips: 11906, marginLeftTwips: 1417, marginRightTwips: 1417, marginTopTwips: 1417, marginBottomTwips: 1417 };
    const pkg = DocxPackage.empty();
    writeDocument(pkg, m);
    expect(pkg.documentXml()).toContain('<w:sectPr>'); // body
    expect(pkg.documentXml()).toContain('w:orient="landscape"');
    const full = readFullDocument(DocxPackage.load(pkg.save()));
    expect(full.sections.length).toBe(2);
    expect(full.sections[1]!.sectPr.pageWidthTwips).toBeGreaterThan(full.sections[1]!.sectPr.pageHeightTwips);
  });

  it('round-trip do catálogo PRESERVA as 3 seções + a paisagem', () => {
    if (!existsSync(CATALOG)) return;
    const pkg = DocxPackage.load(new Uint8Array(readFileSync(CATALOG)));
    const doc = readFullDocument(pkg);
    expect(doc.sections.length).toBe(3);

    // reconstrói o modelo plano marcando sectionBreak nos últimos parágrafos
    const paragraphs = doc.blocks.filter((b) => b.type === 'paragraph').map((b) => (b.type === 'paragraph' ? b.paragraph : null)!);
    const blockToPara = (bi: number) => {
      let n = -1;
      for (let b = 0; b <= bi; b++) if (doc.blocks[b]!.type === 'paragraph') n++;
      return n;
    };
    for (let si = 0; si < doc.sections.length - 1; si++) {
      const s = doc.sections[si]!;
      const p = paragraphs[blockToPara(s.blockEnd)];
      if (p) p.props.sectionBreak = {
        sectPr: s.sectPr,
        headerRefs: s.headerRefs.map((r) => ({ kind: 'header' as const, type: r.type, rid: r.rid })),
        footerRefs: s.footerRefs.map((r) => ({ kind: 'footer' as const, type: r.type, rid: r.rid })),
      };
    }
    const model = readDocument(pkg);
    model.paragraphs = paragraphs;
    model.sectPr = doc.sections[doc.sections.length - 1]!.sectPr;

    // hf parts de todas as seções
    const hfParts: HfPartInfo[] = [];
    const seen = new Set<string>();
    for (const s of doc.sections) {
      for (const [kind, refs, set] of [['header', s.headerRefs, s.headers], ['footer', s.footerRefs, s.footers]] as const) {
        for (const ref of refs) {
          if (seen.has(ref.path) || !set[ref.type]) continue;
          seen.add(ref.path);
          hfParts.push({ kind, type: ref.type, rid: ref.rid, path: ref.path, paragraphs: set[ref.type]!, dirty: false });
        }
      }
    }
    const lastSec = doc.sections[doc.sections.length - 1]!;
    const bodyRefs = [...lastSec.headerRefs, ...lastSec.footerRefs].map((r) => ({
      kind: (lastSec.headerRefs.includes(r as never) ? 'header' : 'footer') as 'header' | 'footer',
      type: r.type, rid: r.rid,
    }));
    writeDocument(pkg, model, hfParts, { bodySectRefs: bodyRefs });

    const bytes = pkg.save();
    const re = readFullDocument(DocxPackage.load(bytes));
    expect(re.sections.length).toBe(3);
    const landscape = re.sections.filter((s) => s.sectPr.pageWidthTwips > s.sectPr.pageHeightTwips);
    expect(landscape.length).toBe(1);

    mkdirSync(labOut, { recursive: true });
    writeFileSync(join(labOut, 'sections-roundtrip.docx'), bytes);
  });
});

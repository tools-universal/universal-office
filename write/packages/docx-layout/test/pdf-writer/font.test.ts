import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SfntFont } from '../../src/typography/index.js';
import { PdfDocument, hexColor, type FontProgram, type PlacedGlyph } from '../../src/pdf-writer/index.js';

const FONT = join(__dirname, '..', '..', '..', '..', 'tools', 'word-lab', 'fonts', 'aptos-regular.ttf');

const latin1 = (b: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]!);
  return s;
};

const adapt = (f: SfntFont): FontProgram => ({
  unitsPerEm: f.metrics.unitsPerEm,
  ascender: f.metrics.ascender,
  descender: f.metrics.descender,
  glyphId: (cp) => f.glyphId(cp),
  advanceWidth: (g) => f.advanceWidth(g),
});

describe('embed de TrueType (CIDFontType2 / Identity-H)', () => {
  if (!existsSync(FONT)) { it.skip('fonte ausente', () => {}); return; }

  const bytes = new Uint8Array(readFileSync(FONT));
  const sfnt = new SfntFont(bytes);

  const placeWord = (font: ReturnType<PdfDocument['embedFont']>, text: string): PlacedGlyph[] => {
    const out: PlacedGlyph[] = [];
    let x = 72;
    for (const ch of text) {
      const cp = ch.codePointAt(0)!;
      const { gid, advanceWidth } = font.encode(cp);
      out.push({ gid, codePoint: cp, xPt: x, baselineFromTopPt: 100 });
      x += (advanceWidth * 11) / sfnt.metrics.unitsPerEm; // ~11pt
    }
    return out;
  };

  it('emite o grafo Type0/CIDFontType2/FontFile2/ToUnicode', () => {
    const doc = new PdfDocument({ compress: false });
    const font = doc.embedFont('Aptos', bytes, adapt(sfnt));
    const page = doc.addPage(595, 842);
    page.glyphs(font, 11, hexColor('000000'), placeWord(font, 'Olá, mundo!'));
    const s = latin1(doc.build());

    expect(s).toContain('/Subtype /Type0');
    expect(s).toContain('/Encoding /Identity-H');
    expect(s).toContain('/Subtype /CIDFontType2');
    expect(s).toContain('/CIDToGIDMap /Identity');
    expect(s).toContain('/FontFile2');
    // FontFile2 é um SUBSET: /Length1 presente e menor que a fonte cheia
    const len1 = s.match(/\/Length1 (\d+)/);
    expect(len1).toBeTruthy();
    expect(parseInt(len1![1]!, 10)).toBeLessThan(bytes.length);
    expect(s).toContain('/ToUnicode');
    expect(s).toContain('beginbfchar');
    // texto: deve haver Tf, Tm e Tj
    expect(s).toContain('/F0 11 Tf');
    expect(s).toContain(' Tj');
    expect(s).toMatch(/1 0 0 1 [\d.]+ [\d.]+ Tm/);
  });

  it('/W traz larguras dos glifos usados (em milésimos de em)', () => {
    const doc = new PdfDocument({ compress: false });
    const font = doc.embedFont('Aptos', bytes, adapt(sfnt));
    const page = doc.addPage(595, 842);
    page.glyphs(font, 11, hexColor('000000'), placeWord(font, 'AV'));
    const s = latin1(doc.build());
    // o array /W tem colchetes aninhados ("gid [w]"); captura até "] >>"
    const w = s.match(/\/W \[([\s\S]*?)\] >>/);
    expect(w).toBeTruthy();
    // ex.: "36 [1234] 50 [1300]" — pelo menos um par gid [largura]
    expect(w![1]!).toMatch(/\d+ \[\d+\]/);
    // a largura de 'A' deve bater com advanceWidth*1000/unitsPerEm
    const gidA = sfnt.glyphId('A'.codePointAt(0)!);
    const expectedA = Math.round((sfnt.advanceWidth(gidA) * 1000) / sfnt.metrics.unitsPerEm);
    expect(w![1]!).toContain(`${gidA} [${expectedA}]`);
  });

  it('o glifo desenhado usa o gid correto no Tj (Identity-H: CID=GID)', () => {
    const doc = new PdfDocument({ compress: false });
    const font = doc.embedFont('Aptos', bytes, adapt(sfnt));
    const page = doc.addPage(595, 842);
    const cp = 'A'.codePointAt(0)!;
    const { gid } = font.encode(cp);
    page.glyphs(font, 11, hexColor('000000'), [{ gid, codePoint: cp, xPt: 72, baselineFromTopPt: 100 }]);
    const s = latin1(doc.build());
    expect(s).toContain(`<${gid.toString(16).padStart(4, '0')}> Tj`);
  });
});

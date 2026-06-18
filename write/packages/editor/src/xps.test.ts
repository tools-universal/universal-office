import { describe, it, expect } from 'vitest';
import { unzipSync } from 'fflate';
import { buildXps, type XpsPage, type XpsGlyphRun } from './xps.js';

// Bytes mínimos passando por "fonte" — buildXps copia ZIP-cru, nunca toca a TTF.
const FAKE_TTF = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0xDE, 0xAD, 0xBE, 0xEF]);
const FONT_BYTES = {
  Aptos: {
    regular: FAKE_TTF,
    bold: FAKE_TTF,
    italic: FAKE_TTF,
    boldItalic: FAKE_TTF,
  },
  Calibri: {
    regular: FAKE_TTF,
    bold: FAKE_TTF,
    italic: FAKE_TTF,
    boldItalic: FAKE_TTF,
  },
};

const glyph = (over: Partial<XpsGlyphRun> = {}): XpsGlyphRun => ({
  text: 'Olá',
  xPt: 72, baselinePt: 72,
  fontFamily: 'Aptos', variant: 'regular', sizePt: 11,
  colorRgb: [0, 0, 0],
  ...over,
});

const page = (over: Partial<XpsPage> = {}): XpsPage => ({
  widthPt: 612, heightPt: 792,
  fills: [], lines: [], glyphs: [],
  ...over,
});

describe('buildXps — estrutura OPC', () => {
  it('produz ZIP com PK signature', () => {
    const bytes = buildXps({ pages: [page()], fontBytes: FONT_BYTES });
    expect(bytes[0]).toBe(0x50); // P
    expect(bytes[1]).toBe(0x4b); // K
  });

  it('contém os arquivos obrigatórios do XPS', () => {
    const files = unzipSync(buildXps({ pages: [page()], fontBytes: FONT_BYTES }));
    expect(files['[Content_Types].xml']).toBeDefined();
    expect(files['_rels/.rels']).toBeDefined();
    expect(files['FixedDocumentSequence.fdseq']).toBeDefined();
    expect(files['Documents/1/FixedDocument.fdoc']).toBeDefined();
    expect(files['Documents/1/Pages/1.fpage']).toBeDefined();
  });

  it('cada FixedPage tem um .rels associado', () => {
    const files = unzipSync(buildXps({
      pages: [page({ glyphs: [glyph()] }), page({ glyphs: [glyph()] })],
      fontBytes: FONT_BYTES,
    }));
    expect(files['Documents/1/Pages/_rels/1.fpage.rels']).toBeDefined();
    expect(files['Documents/1/Pages/_rels/2.fpage.rels']).toBeDefined();
  });

  it('FixedDocument.fdoc lista todas as páginas em ordem', () => {
    const files = unzipSync(buildXps({
      pages: [page(), page(), page()],
      fontBytes: FONT_BYTES,
    }));
    const fdoc = new TextDecoder().decode(files['Documents/1/FixedDocument.fdoc']);
    expect(fdoc).toContain('Pages/1.fpage');
    expect(fdoc).toContain('Pages/2.fpage');
    expect(fdoc).toContain('Pages/3.fpage');
    // ordem: 1 antes de 2, 2 antes de 3
    expect(fdoc.indexOf('Pages/1.fpage')).toBeLessThan(fdoc.indexOf('Pages/2.fpage'));
    expect(fdoc.indexOf('Pages/2.fpage')).toBeLessThan(fdoc.indexOf('Pages/3.fpage'));
  });
});

describe('buildXps — XAML válido', () => {
  it('FixedPage tem dimensões em CSS pixels (pt × 96/72)', () => {
    const files = unzipSync(buildXps({
      pages: [page({ widthPt: 612, heightPt: 792 })], // letter
      fontBytes: FONT_BYTES,
    }));
    const xaml = new TextDecoder().decode(files['Documents/1/Pages/1.fpage']);
    // 612pt × 96/72 = 816px
    expect(xaml).toContain('Width="816.00"');
    // 792pt × 96/72 = 1056px
    expect(xaml).toContain('Height="1056.00"');
  });

  it('Glyphs com UnicodeString escapado e dimensões corretas', () => {
    const files = unzipSync(buildXps({
      pages: [page({
        glyphs: [glyph({ text: 'A&B<C>"D', xPt: 36, baselinePt: 100, sizePt: 12 })],
      })],
      fontBytes: FONT_BYTES,
    }));
    const xaml = new TextDecoder().decode(files['Documents/1/Pages/1.fpage']);
    expect(xaml).toContain('UnicodeString="A&amp;B&lt;C&gt;&quot;D"');
    // x = 36pt × 96/72 = 48px; baseline = 100pt × 96/72 = 133.33px
    expect(xaml).toContain('OriginX="48.00"');
    expect(xaml).toContain('OriginY="133.33"');
    // em size = 12pt × 96/72 = 16px
    expect(xaml).toContain('FontRenderingEmSize="16.00"');
  });

  it('itálico vira StyleSimulations="ItalicSimulation"', () => {
    const files = unzipSync(buildXps({
      pages: [page({ glyphs: [glyph({ variant: 'italic' })] })],
      fontBytes: FONT_BYTES,
    }));
    const xaml = new TextDecoder().decode(files['Documents/1/Pages/1.fpage']);
    expect(xaml).toContain('StyleSimulations="ItalicSimulation"');
  });

  it('cor RGB vira #AARRGGBB com alfa FF', () => {
    const files = unzipSync(buildXps({
      pages: [page({ glyphs: [glyph({ colorRgb: [1, 0.5, 0] })] })],
      fontBytes: FONT_BYTES,
    }));
    const xaml = new TextDecoder().decode(files['Documents/1/Pages/1.fpage']);
    expect(xaml).toContain('Fill="#FFFF8000"');
  });

  it('linha (sublinhado/borda) vira Path com Stroke + Data M..L', () => {
    const files = unzipSync(buildXps({
      pages: [page({ lines: [{
        ax: 10, ay: 20, bx: 100, by: 20, widthPt: 0.5, colorRgb: [0, 0, 0],
      }] })],
      fontBytes: FONT_BYTES,
    }));
    const xaml = new TextDecoder().decode(files['Documents/1/Pages/1.fpage']);
    expect(xaml).toMatch(/<Path[^>]*Stroke="#FF000000"[^>]*Data="M [^"]*L [^"]*"/);
  });

  it('preenchimento (shading) vira Path com Fill e polígono Z', () => {
    const files = unzipSync(buildXps({
      pages: [page({ fills: [{
        xPt: 50, yPt: 100, wPt: 200, hPt: 30, colorRgb: [0.93, 0.93, 0.93],
      }] })],
      fontBytes: FONT_BYTES,
    }));
    const xaml = new TextDecoder().decode(files['Documents/1/Pages/1.fpage']);
    expect(xaml).toMatch(/<Path[^>]*Fill="#FFEDEDED"[^>]*Data="M [^"]*Z"/);
  });
});

describe('buildXps — fontes embutidas', () => {
  it('só embute as fontes EFETIVAMENTE referenciadas pelos glyphs', () => {
    const files = unzipSync(buildXps({
      pages: [page({
        glyphs: [
          glyph({ fontFamily: 'Aptos', variant: 'regular' }),
          glyph({ fontFamily: 'Aptos', variant: 'bold' }),
        ],
      })],
      fontBytes: FONT_BYTES,
    }));
    const fontFiles = Object.keys(files).filter((n) => n.startsWith('Resources/Fonts/'));
    expect(fontFiles.sort()).toEqual([
      'Resources/Fonts/Aptos-bold.ttf',
      'Resources/Fonts/Aptos-regular.ttf',
    ]);
  });

  it('FixedPage.fpage.rels referencia as fontes da página como required-resource', () => {
    const files = unzipSync(buildXps({
      pages: [page({ glyphs: [glyph()] })],
      fontBytes: FONT_BYTES,
    }));
    const rels = new TextDecoder().decode(files['Documents/1/Pages/_rels/1.fpage.rels']);
    expect(rels).toContain('required-resource');
    expect(rels).toContain('/Resources/Fonts/Aptos-regular.ttf');
  });

  it('lança se a página usa fonte sem bytes correspondentes', () => {
    expect(() => buildXps({
      pages: [page({ glyphs: [glyph({ fontFamily: 'Calibri', variant: 'regular' })] })],
      fontBytes: { Aptos: { regular: FAKE_TTF } }, // sem Calibri
    })).toThrow(/fonte sem bytes para XPS/);
  });
});

describe('buildXps — Content Types', () => {
  it('Content_Types.xml declara TTF como ms-opentype', () => {
    const files = unzipSync(buildXps({ pages: [page()], fontBytes: FONT_BYTES }));
    const ct = new TextDecoder().decode(files['[Content_Types].xml']);
    expect(ct).toContain('Extension="ttf"');
    expect(ct).toContain('application/vnd.ms-opentype');
  });

  it('Content_Types tem Override por página declarada', () => {
    const files = unzipSync(buildXps({
      pages: [page(), page(), page()],
      fontBytes: FONT_BYTES,
    }));
    const ct = new TextDecoder().decode(files['[Content_Types].xml']);
    for (let i = 1; i <= 3; i++) {
      expect(ct).toContain(`PartName="/Documents/1/Pages/${i}.fpage"`);
    }
  });
});

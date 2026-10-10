import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { planFontEmbedding, DEFAULT_EMBEDDING, type FontEmbeddingSettings } from './embedding.js';
import type { FontEnvironment } from './environment.js';
import { readDocxEmbedding, readPptxEmbedding, writeDocxEmbedding, writePptxEmbedding, obfuscateOdttf, type OpcPackage } from './ooxml.js';
import { FontResolver } from './resolver.js';
import { glyphIdsFor } from './sfnt.js';

const FILES = join(__dirname, '..', 'files');
const font = (name: string) => new Uint8Array(readFileSync(join(FILES, name)));

/** Resolvedor com as embarcadas lidas do disco; nada instalado. */
function resolver(): FontResolver {
  const env: FontEnvironment = {
    isInstalled: () => false,
    loadLocal: async () => false,
    addFace: async () => true,
    pageFamilies: () => new Map(),
    loadPageFamily: async () => {},
    fetchBytes: async (url) => { try { return font(url.replace(/^.*\//, '')); } catch { return null; } },
    localAccess: null,
  };
  const r = new FontResolver(env);
  r.configure({ baseUrl: '/f' });
  return r;
}

class MemPackage implements OpcPackage {
  parts = new Map<string, Uint8Array>();
  constructor(files: Record<string, string>) { for (const [k, v] of Object.entries(files)) this.setPartText(k, v); }
  partNames() { return [...this.parts.keys()]; }
  getPart(p: string) { return this.parts.get(p); }
  getPartText(p: string) { const d = this.parts.get(p); return d && new TextDecoder().decode(d); }
  setPart(p: string, d: Uint8Array) { this.parts.set(p, d); }
  setPartText(p: string, t: string) { this.parts.set(p, new TextEncoder().encode(t)); }
  removePart(p: string) { this.parts.delete(p); }
}

const on = (s: Partial<FontEmbeddingSettings>, app: 'write' | 'slides' = 'write'): FontEmbeddingSettings =>
  ({ ...DEFAULT_EMBEDDING[app], embed: true, ...s });

describe('planFontEmbedding', () => {
  it('Word: fonte comum fica de fora; substituta NUNCA entra no lugar da original; aberta de mesmo nome entra inteira', async () => {
    const plan = await planFontEmbedding(resolver(), [
      { family: 'Arial', variants: ['regular'], text: 'abc' },
      { family: 'Calibri', variants: ['regular'], text: 'abc' },          // só a substituta Carlito existe
      { family: 'Liberation Serif', variants: ['regular', 'bold'], text: 'Olá' },
    ], on({}), 'write');
    expect(plan.skipped).toEqual([
      { family: 'Arial', reason: 'common' },
      { family: 'Calibri', reason: 'unavailable' },
    ]);
    expect(plan.faces.map((f) => `${f.family}/${f.variant}/${f.subsetted}`)).toEqual([
      'Liberation Serif/regular/false', 'Liberation Serif/bold/false',
    ]);
    expect(plan.faces[0]!.bytes.length).toBe(font('liberationserif-regular.ttf').length);
  });

  it('subconjunto: só os glifos do texto (bem menor) e os caracteres usados continuam mapeados', async () => {
    const plan = await planFontEmbedding(resolver(), [{ family: 'Carlito', variants: ['regular'], text: 'Olá, mundo' }], on({ subset: true }), 'write');
    const sub = plan.faces[0]!;
    expect(sub.subsetted).toBe(true);
    expect(sub.bytes.length).toBeLessThan(font('carlito-regular.ttf').length / 2);
    const cps = [...'Olá, mundo'].map((c) => c.codePointAt(0)!);
    expect(glyphIdsFor(sub.bytes, cps).size).toBe(new Set(cps).size); // cmap intacto
  });

  it('PowerPoint: as 4 variantes mesmo com só a regular usada; Calibri/Aptos nunca', async () => {
    const plan = await planFontEmbedding(resolver(), [
      { family: 'Caladea', variants: ['regular'], text: 'x' },
      { family: 'Aptos', variants: ['regular'], text: 'x' },
    ], on({}, 'slides'), 'slides');
    expect(plan.faces.map((f) => f.variant)).toEqual(['regular', 'bold', 'italic', 'boldItalic']);
    expect(plan.skipped).toEqual([{ family: 'Aptos', reason: 'common' }]);
  });

  it('licença restrita (fsType 0x2) fica de fora; fonte já incorporada fica como veio', async () => {
    const restricted = font('caladea-regular.ttf');
    const v = new DataView(restricted.buffer);
    // fsType = 0x0002 na OS/2
    for (let i = 0; i < v.getUint16(4); i++) {
      const p = 12 + i * 16;
      if (String.fromCharCode(...restricted.subarray(p, p + 4)) === 'OS/2') v.setUint16(v.getUint32(p + 8) + 8, 2);
    }
    const plan = await planFontEmbedding(resolver(), [
      { family: 'Restrita', variants: ['regular'], text: 'x' },
      { family: 'Carlito', variants: ['regular'], text: 'x' },
    ], on({}), 'write', {
      documentFace: (f) => (f === 'Restrita' ? restricted : undefined),
      alreadyEmbedded: new Set(['carlito']),
    });
    expect(plan.faces).toEqual([]);
    expect(plan.skipped).toEqual([
      { family: 'Restrita', reason: 'license' },
      { family: 'Carlito', reason: 'already-embedded' },
    ]);
  });
});

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
function docx(): MemPackage {
  return new MemPackage({
    '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
    'word/document.xml': `<w:document ${W}><w:body/></w:document>`,
    'word/_rels/document.xml.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/></Relationships>',
    'word/settings.xml': `<w:settings ${W}><w:zoom w:percent="100"/><w:defaultTabStop w:val="708"/></w:settings>`,
    'word/fontTable.xml': `<w:fonts ${W}><w:font w:name="Carlito"><w:panose1 w:val="020F0502020204030204"/><w:charset w:val="00"/></w:font></w:fonts>`,
  });
}

describe('.docx', () => {
  it('liga: settings na ordem do schema, odttf ofuscado, relação, content type e w:embed* no fim do w:font', async () => {
    const pkg = docx();
    const plan = await planFontEmbedding(resolver(), [
      { family: 'Carlito', variants: ['regular', 'italic'], text: 'abc' },
      { family: 'Caladea', variants: ['bold'], text: 'abc' },
    ], on({ subset: true }), 'write');
    writeDocxEmbedding(pkg, plan, on({ subset: true }));
    expect(pkg.getPartText('word/settings.xml')).toContain('<w:zoom w:percent="100"/><w:embedTrueTypeFonts/><w:saveSubsetFonts/><w:defaultTabStop');
    const table = pkg.getPartText('word/fontTable.xml')!;
    expect(table).toMatch(/<w:font w:name="Carlito">.*<w:charset w:val="00"\/><w:embedRegular r:id="rId\d+" w:subsetted="1" w:fontKey="\{[0-9A-F-]{36}\}"\/><w:embedItalic /);
    expect(table).toMatch(/<w:font w:name="Caladea"><w:panose1 [^>]*\/>.*<w:embedBold /);
    expect(table).toMatch(/<w:fonts xmlns:r=/);
    expect(pkg.getPartText('[Content_Types].xml')).toContain('Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"');
    // a parte ofuscada volta ao TTF com a mesma chave (XOR)
    const key = /w:fontKey="([^"]+)"/.exec(table)![1]!;
    const id = /<w:embedRegular r:id="(rId\d+)"/.exec(table)![1]!;
    const target = new RegExp(`Id="${id}"[^>]*Target="([^"]+)"`).exec(pkg.getPartText('word/_rels/fontTable.xml.rels')!)![1]!;
    expect(target).toMatch(/^fonts\/font\d+\.odttf$/);
    const back = obfuscateOdttf(pkg.getPart(`word/${target}`)!, key);
    expect([...back.subarray(0, 4)]).toEqual([0, 1, 0, 0]);
    expect(readDocxEmbedding(pkg)).toEqual({ settings: { embed: true, subset: true, skipCommonFonts: true }, embedded: new Set(['carlito', 'caladea']) });
  });

  it('desliga: tira settings, w:embed*, relações e partes', async () => {
    const pkg = docx();
    const plan = await planFontEmbedding(resolver(), [{ family: 'Carlito', variants: ['regular'], text: 'a' }], on({}), 'write');
    writeDocxEmbedding(pkg, plan, on({}));
    writeDocxEmbedding(pkg, { faces: [], skipped: [] }, { ...on({}), embed: false });
    expect(pkg.getPartText('word/settings.xml')).toBe(`<w:settings ${W}><w:zoom w:percent="100"/><w:defaultTabStop w:val="708"/></w:settings>`);
    expect(pkg.getPartText('word/fontTable.xml')).not.toContain('w:embed');
    expect(pkg.partNames().some((p) => p.endsWith('.odttf'))).toBe(false);
    expect(pkg.getPartText('word/_rels/fontTable.xml.rels')).not.toContain('relationships/font"');
  });
});

describe('.pptx', () => {
  const pres = '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" saveSubsetFonts="1"><p:sldSz cx="1" cy="1"/><p:notesSz cx="1" cy="1"/><p:defaultTextStyle/></p:presentation>';
  const pptx = () => new MemPackage({
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
    'ppt/presentation.xml': pres,
    'ppt/_rels/presentation.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="x" Target="slides/slide1.xml"/></Relationships>',
  });

  it('liga: atributos, embeddedFontLst antes do defaultTextStyle, EOT em ppt/fonts', async () => {
    const pkg = pptx();
    const plan = await planFontEmbedding(resolver(), [{ family: 'Caladea', variants: ['regular'], text: 'abc' }], on({}, 'slides'), 'slides');
    writePptxEmbedding(pkg, plan, on({}, 'slides'));
    const xml = pkg.getPartText('ppt/presentation.xml')!;
    expect(xml).toMatch(/^<p:presentation [^>]*embedTrueTypeFonts="1" saveSubsetFonts="1">/);
    expect(xml).toMatch(/<p:notesSz [^>]*\/><p:embeddedFontLst><p:embeddedFont><p:font typeface="Caladea" panose="[0-9A-F]{20}" charset="0"\/><p:regular r:id="rId2"\/><p:bold r:id="rId3"\/><p:italic r:id="rId4"\/><p:boldItalic r:id="rId5"\/><\/p:embeddedFont><\/p:embeddedFontLst><p:defaultTextStyle/);
    const eot = pkg.getPart('ppt/fonts/font1.fntdata')!;
    expect(new DataView(eot.buffer, eot.byteOffset).getUint16(34, true)).toBe(0x504c);
    expect(pkg.getPartText('[Content_Types].xml')).toContain('Extension="fntdata" ContentType="application/x-fontdata"');
    expect(readPptxEmbedding(pkg)).toEqual({ settings: { embed: true, subset: true }, embedded: new Set(['caladea']) });
  });

  it('desliga: some tudo (inclusive o que já veio no arquivo)', async () => {
    const pkg = pptx();
    const plan = await planFontEmbedding(resolver(), [{ family: 'Caladea', variants: ['regular'], text: 'abc' }], on({}, 'slides'), 'slides');
    writePptxEmbedding(pkg, plan, on({}, 'slides'));
    writePptxEmbedding(pkg, { faces: [], skipped: [] }, { ...on({}, 'slides'), embed: false });
    expect(pkg.getPartText('ppt/presentation.xml')).toBe(pres.replace(' saveSubsetFonts="1"', ''));
    expect(pkg.partNames().some((p) => p.startsWith('ppt/fonts/'))).toBe(false);
  });
});

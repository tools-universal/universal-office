import { describe, expect, it } from 'vitest';
import { DocxPackage, readEmbeddedFonts, deobfuscateFont } from '../src/index.js';

describe('fontes embedadas (ODTTF)', () => {
  it('desofusca: XOR dos 32 primeiros bytes com a chave (GUID revertida)', () => {
    const key = '{9D4001D5-43C4-45C7-BD84-DBC7A6647050}';
    // aplica a ofuscação (mesma operação — XOR é involutivo) num "sfnt" fake
    const hex = key.replace(/[{}-]/g, '');
    const kb = new Uint8Array(16);
    for (let i = 0; i < 16; i++) kb[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    kb.reverse();
    const original = new Uint8Array(64);
    original[0] = 0x00; original[1] = 0x01; original[2] = 0x00; original[3] = 0x00; // sfnt 1.0
    for (let i = 4; i < 64; i++) original[i] = (i * 7) & 0xff;
    const obfuscated = original.slice();
    for (let i = 0; i < 32; i++) obfuscated[i] = obfuscated[i]! ^ kb[i % 16]!;

    const back = deobfuscateFont(obfuscated, key);
    expect(Array.from(back)).toEqual(Array.from(original));
    // cabeçalho sfnt válido restaurado
    expect([back[0], back[1], back[2], back[3]]).toEqual([0x00, 0x01, 0x00, 0x00]);
  });

  it('readEmbeddedFonts: sem fontTable → vazio', () => {
    const pkg = DocxPackage.empty();
    expect(readEmbeddedFonts(pkg)).toEqual([]);
  });

  it('readEmbeddedFonts: lê família/variante/desofusca via fontTable + rels', () => {
    const pkg = DocxPackage.empty();
    const key = '{9D4001D5-43C4-45C7-BD84-DBC7A6647050}';
    // fonte fake "sfnt" ofuscada
    const hex = key.replace(/[{}-]/g, '');
    const kb = new Uint8Array(16);
    for (let i = 0; i < 16; i++) kb[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    kb.reverse();
    const font = new Uint8Array(48);
    font[0] = 0x00; font[1] = 0x01; font[2] = 0x00; font[3] = 0x00;
    const obf = font.slice();
    for (let i = 0; i < 32; i++) obf[i] = obf[i]! ^ kb[i % 16]!;
    pkg.setPart('word/fonts/font3.odttf', obf);
    pkg.setPartText('word/fontTable.xml',
      '<?xml version="1.0"?><w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"' +
      ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      `<w:font w:name="Lato"><w:embedRegular r:id="rId3" w:fontKey="${key}"/></w:font></w:fonts>`);
    pkg.setPartText('word/_rels/fontTable.xml.rels',
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font3.odttf"/></Relationships>');

    const out = readEmbeddedFonts(pkg);
    expect(out.length).toBe(1);
    expect(out[0]!.family).toBe('Lato');
    expect(out[0]!.variant).toBe('regular');
    expect([out[0]!.data[0], out[0]!.data[1], out[0]!.data[2], out[0]!.data[3]]).toEqual([0, 1, 0, 0]);
  });
});

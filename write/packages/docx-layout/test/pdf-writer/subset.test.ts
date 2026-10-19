import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SfntFont } from '../../src/typography/index.js';
import { subsetTrueType } from '../../src/pdf-writer/index.js';

// Carlito: aberta (OFL) e versionada — roda num clone limpo
const CARLITO = join(__dirname, '..', '..', '..', '..', '..', 'shared', 'fonts', 'files', 'carlito-regular.ttf');
const FONT = join(__dirname, '..', '..', '..', '..', 'tools', 'word-lab', 'fonts', 'calibri.ttf');

describe('subset de TrueType', () => {
  if (!existsSync(FONT)) { it.skip('fonte ausente', () => {}); return; }
  const bytes = new Uint8Array(readFileSync(FONT));
  const sfnt = new SfntFont(bytes);

  it('reduz drasticamente o tamanho mantendo só os glifos usados', () => {
    const used = [...'Olá, mundo! 0123'].map((c) => sfnt.glyphId(c.codePointAt(0)!));
    const sub = subsetTrueType(bytes, used);
    expect(sub.length).toBeLessThan(bytes.length / 4); // Calibri ~1.6MB → dezenas de KB
    // ainda é um sfnt válido com tabelas essenciais
    expect(sub.length).toBeGreaterThan(2000);
  });

  it('preserva o outline dos glifos usados e esvazia os não usados', () => {
    const gidA = sfnt.glyphId('A'.codePointAt(0)!);
    const sub = subsetTrueType(bytes, [gidA]);

    // relê o subset e confere loca: o glifo usado tem outline, os demais não
    const v = new DataView(sub.buffer, sub.byteOffset, sub.byteLength);
    const dir = new Map<string, { offset: number; length: number }>();
    const n = v.getUint16(4);
    for (let i = 0; i < n; i++) {
      const p = 12 + i * 16;
      const tag = String.fromCharCode(sub[p]!, sub[p + 1]!, sub[p + 2]!, sub[p + 3]!);
      dir.set(tag, { offset: v.getUint32(p + 8), length: v.getUint32(p + 12) });
    }
    const head = dir.get('head')!, loca = dir.get('loca')!;
    expect(v.getUint16(head.offset + 50)).toBe(1); // loca longo
    const at = (i: number) => v.getUint32(loca.offset + i * 4);
    const lenOf = (g: number) => at(g + 1) - at(g);
    expect(lenOf(gidA)).toBeGreaterThan(0); // 'A' tem outline
    // .notdef (0) é mantido; um glifo distante e não usado deve estar vazio
    const unused = gidA + 50;
    expect(lenOf(unused)).toBe(0);
  });

  it('devolve os bytes originais se a fonte não tiver glyf (CFF/inválida)', () => {
    const fake = new Uint8Array(64); // sem tabelas
    expect(subsetTrueType(fake, [1, 2, 3])).toBe(fake);
  });
});

// Veio dos testes do sheet-export (regressão achada no PDF do Sheet).
describe('subset de TrueType com Buffer do Node', () => {
  it('regressão: subset TrueType válido mesmo com Buffer do Node (view no pool)', () => {
    // O Buffer do readFileSync é uma VIEW num pool compartilhado (byteOffset≠0);
    // o subset já saiu corrompido por isso (loca longo com head marcando curto
    // → todos os glifos viravam tofu). Fixa o formato do head no subset.
    const bytes = readFileSync(CARLITO); // Buffer!
    const p = new SfntFont(new Uint8Array(bytes));
    const gids = [...'Teste'].map((c) => p.glyphId(c.codePointAt(0)!));
    const sub = subsetTrueType(bytes, gids);
    expect(sub.length).toBeLessThan(bytes.length);
    const v = new DataView(sub.buffer, sub.byteOffset, sub.byteLength);
    const n = v.getUint16(4);
    const dir = new Map<string, { off: number; len: number }>();
    for (let i = 0; i < n; i++) {
      const q = 12 + i * 16;
      const tag = String.fromCharCode(sub[q]!, sub[q + 1]!, sub[q + 2]!, sub[q + 3]!);
      dir.set(tag, { off: v.getUint32(q + 8), len: v.getUint32(q + 12) });
    }
    const head = dir.get('head')!;
    const maxp = dir.get('maxp')!;
    const loca = dir.get('loca')!;
    const numGlyphs = v.getUint16(maxp.off + 4);
    expect(v.getUint16(head.off + 50)).toBe(1); // indexToLocFormat = long
    expect(loca.len).toBe((numGlyphs + 1) * 4);
    // glifos usados continuam com outline
    for (const g of gids) {
      expect(v.getUint32(loca.off + (g + 1) * 4) - v.getUint32(loca.off + g * 4)).toBeGreaterThan(0);
    }
  });
});

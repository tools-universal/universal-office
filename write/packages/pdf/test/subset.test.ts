import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SfntFont } from '@universal-office/layout';
import { subsetTrueType } from '../src/index.js';

const FONT = join(__dirname, '..', '..', '..', 'tools', 'word-lab', 'fonts', 'calibri.ttf');

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

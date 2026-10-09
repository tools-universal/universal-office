import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { eotToSfnt, looksLikeEot } from '../src/eot.js';

// Fixture VERSIONADA (o teste de corpus usa um deck local, pulado num checkout
// limpo): Chivo Regular (SIL Open Font License) como o Google Slides grava em
// ppt/fonts/*.fntdata — EOT + MicroType Express.
const chivo = new Uint8Array(readFileSync(join(__dirname, 'fixtures', 'Chivo-regular.fntdata')));

/** Cabeçalho EOT mínimo (v2.1) em volta de `font`, com `flags`. */
function eot(font: Uint8Array, flags: number): Uint8Array {
  const hdr = 82;
  const b = new Uint8Array(hdr + font.length);
  const v = new DataView(b.buffer);
  v.setUint32(0, b.length, true); v.setUint32(4, font.length, true); v.setUint32(8, 0x00020001, true);
  v.setUint32(12, flags, true); v.setUint16(34, 0x504c, true);
  b.set(font, hdr);
  return b;
}

describe('EOT / MicroType Express', () => {
  it('decodifica a fonte real para TrueType (saída fixada por hash)', () => {
    expect(looksLikeEot(chivo)).toBe(true);
    const sf = eotToSfnt(chivo)!;
    expect(sf).not.toBeNull();
    expect([...sf.subarray(0, 4)]).toEqual([0, 1, 0, 0]);
    expect(createHash('sha1').update(sf).digest('hex')).toBe('6d312fd0c2697816ca542b8715062884ae11de1d');
  });

  it('MTX forjado: bloco de 3 bytes declarando 16 MB → recusado na hora (não gera 16 MB)', () => {
    // contêiner MTX v1: versão, 3 bytes, offsets u24 dos blocos 2 e 3; bloco 1 = só o tamanho (0xFFFFFF)
    const mtx = new Uint8Array([1, 0, 0, 0, 0, 0, 13, 0, 0, 13, 0xff, 0xff, 0xff]);
    const t0 = performance.now();
    expect(eotToSfnt(eot(mtx, 0x4))).toBeNull();
    expect(performance.now() - t0).toBeLessThan(200);
  });

  it('EOT truncado ou com tamanhos incoerentes → null (o deck segue sem a fonte)', () => {
    expect(eotToSfnt(chivo.subarray(0, chivo.length - 1000))).toBeNull();
    const bad = chivo.slice();
    new DataView(bad.buffer).setUint32(4, bad.length + 10, true); // FontDataSize > arquivo
    expect(eotToSfnt(bad)).toBeNull();
    expect(eotToSfnt(new Uint8Array(10))).toBeNull();
  });
});

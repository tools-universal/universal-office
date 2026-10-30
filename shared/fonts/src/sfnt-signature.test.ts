import { describe, expect, it } from 'vitest';
import { isFontFile } from './sfnt.js';

const bytes = (...head: number[]): Uint8Array => new Uint8Array([...head, 0, 0, 0, 0, 0, 0, 0, 0]);
const ascii = (s: string): Uint8Array => bytes(...[...s].map((c) => c.charCodeAt(0)));

describe('isFontFile', () => {
  it('reconhece TrueType, OpenType CFF, coleção e WOFF pela assinatura', () => {
    expect(isFontFile(bytes(0x00, 0x01, 0x00, 0x00))).toBe(true);
    for (const tag of ['true', 'OTTO', 'ttcf', 'wOFF', 'wOF2']) expect(isFontFile(ascii(tag))).toBe(true);
  });

  it('recusa HTML (fallback de SPA respondendo 200), vazio e lixo', () => {
    expect(isFontFile(ascii('<!doctype html><html>'))).toBe(false);
    expect(isFontFile(new Uint8Array())).toBe(false);
    expect(isFontFile(ascii('PK\u0003\u0004'))).toBe(false);
  });
});

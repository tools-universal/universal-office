// Regressões dos achados da revisão adversarial (2026-07): spoof de
// marcadores, split de campo, colisão de hash de imagem e ambiguidade de
// composição de chave de célula.
import { describe, expect, it } from 'vitest';
import { diffBlocks, fnv1a, tokenizeBlock } from '../src/index.js';
import type { Run, TableBlock } from '@universal-office/docx-core';
import { cell, doc, imageRun, para, run, runProps, table } from './helpers.js';

const kinds = (d: ReturnType<typeof diffBlocks>) => d.edits.map((e) => e.kind);

const fieldRun = (text: string, instr: string): Run => ({
  text,
  props: runProps(),
  field: instr,
});

describe('campos (w:fldSimple / fldChar)', () => {
  it('mesmo campo com resultado dividido em 2 runs NÃO é mudança', () => {
    // O reader propaga `field` para todos os runs do resultado em cache; o
    // Word divide por rsid/formatação sem mudar o campo.
    const a = doc(para([fieldRun('12', ' PAGE ')]));
    const b = doc(para([fieldRun('1', ' PAGE '), fieldRun('2', ' PAGE ')]));
    expect(kinds(diffBlocks(a, b))).toEqual(['equal']);
  });

  it('fldSimple (instr crua) e fldChar (instr normalizada) são o mesmo campo', () => {
    const a = doc(para([fieldRun('3', 'PAGE')]));   // fldSimple: atributo cru
    const b = doc(para([fieldRun('3', ' PAGE ')])); // fldChar: ' INSTR '
    expect(kinds(diffBlocks(a, b))).toEqual(['equal']);
  });

  it('campos com instruções diferentes SÃO mudança', () => {
    const a = doc(para([fieldRun('3', ' PAGE ')]));
    const b = doc(para([fieldRun('3', ' NUMPAGES ')]));
    expect(kinds(diffBlocks(a, b))).toEqual(['change']);
  });
});

describe('spoof de marcadores', () => {
  it('texto literal imitando marcador de campo não compara igual a um campo real', () => {
    // Antes: marcador usava U+FFFC, que é texto válido — "￼fld: PAGE " como
    // texto literal colidia com um campo PAGE de verdade.
    const spoof = doc(para([run('￼fld: PAGE ')]));
    const real = doc(para([fieldRun('3', ' PAGE ')]));
    expect(kinds(diffBlocks(spoof, real))).toEqual(['change']);
  });

  it('U+001F em texto (XML malformado) não fabrica marcador de imagem', () => {
    const img = new Uint8Array([1, 2, 3]);
    const marker = `img:${img.byteLength}:${fnv1a(img)}`;
    const spoof = doc(para([run(marker)]));
    const real = doc(para([imageRun(img)]));
    const d = diffBlocks(spoof, real);
    expect(kinds(d)).toEqual(['change']);
    expect(d.edits[0]!.formatOnly).toBeUndefined();
  });
});

describe('colisão de hash de imagem (garantia byte a byte)', () => {
  // Par real de colisão FNV-1a 32-bit (ambos → b0bb90c7), mesmo comprimento.
  const collA = new Uint8Array([70, 91, 67, 231, 72, 24, 9, 142]);
  const collB = new Uint8Array([104, 166, 97, 0, 194, 64, 6, 31]);

  it('o par de teste realmente colide no hash', () => {
    expect(fnv1a(collA)).toBe(fnv1a(collB));
    expect(collA.byteLength).toBe(collB.byteLength);
  });

  it('chaves colidem mas o memcmp decide: change nos dois algoritmos', () => {
    const a = doc(para([imageRun(collA)]));
    const b = doc(para([imageRun(collB)]));
    const ta = tokenizeBlock(a[0]!);
    const tb = tokenizeBlock(b[0]!);
    expect(ta.contentKey).toBe(tb.contentKey); // hash colide de propósito
    for (const algorithm of ['histogram', 'myers'] as const) {
      const d = diffBlocks(a, b, { algorithm });
      expect(kinds(d)).toEqual(['change']);
      expect(d.stats.changed).toBe(1);
    }
  });

  it('colisão cercada de contexto igual não vira âncora equal no histogram', () => {
    const a = doc(para('antes'), para([imageRun(collA)]), para('depois'));
    const b = doc(para('antes'), para([imageRun(collB)]), para('depois'));
    const d = diffBlocks(a, b); // histogram é o default
    expect(kinds(d)).toEqual(['equal', 'change', 'equal']);
  });
});

describe('ambiguidade de composição de chave de célula', () => {
  it("parágrafo com texto 'span1' não colide com tabela aninhada", () => {
    // Antes: cell(['a','b','span1']) e cell(['a'] + tabela aninhada com 'b')
    // produziam a MESMA contentKey → mudança de conteúdo virava formatOnly.
    const flat = table([['x']]);
    flat.rows[0]!.cells[0]! = cell(['a', 'b', 'span1']);

    const nested = table([['x']]);
    const inner: TableBlock = table([['b']]);
    nested.rows[0]!.cells[0]! = cell(['a'], { tables: [inner] });

    const d = diffBlocks(doc(flat), doc(nested));
    expect(kinds(d)).toEqual(['change']);
    expect(d.edits[0]!.formatOnly).toBeUndefined(); // é conteúdo, não formatação
  });
});

import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { xlsxToPdf, type PdfFontSource } from '../src/index.js';
import { makeXlsx, sheetXml, inlineStr, STYLES_XML } from './helpers.js';

const showcase = (): Uint8Array => readFileSync(join(__dirname, '../../../samples/showcase.xlsx'));
const gaps = (): Uint8Array => readFileSync(join(__dirname, '../../../samples/gaps-smoke.xlsx'));

// Aptos Narrow é PROPRIETÁRIA e não fica no repositório (npm run fonts:sync a
// copia da máquina); num clone limpo os testes usam a Liberation Sans (aberta,
// versionada) — o gerador só precisa de um TrueType
const fontsDir = join(__dirname, '../../sheet/demo/fonts');
const face = existsSync(join(fontsDir, 'aptos-narrow-regular.ttf')) ? 'aptos-narrow' : 'liberationsans';
function fonts(): PdfFontSource[] {
  return [
    { bytes: readFileSync(join(fontsDir, `${face}-regular.ttf`)), name: 'AptosNarrow' },
    { bytes: readFileSync(join(fontsDir, `${face}-bold.ttf`)), bold: true, name: 'AptosNarrowBold' },
    { bytes: readFileSync(join(fontsDir, `${face}-italic.ttf`)), italic: true, name: 'AptosNarrowItalic' },
    { bytes: readFileSync(join(fontsDir, `${face}-bolditalic.ttf`)), bold: true, italic: true, name: 'AptosNarrowBoldItalic' },
  ];
}

/** Conta objetos de página (/Type /Page, sem contar /Type /Pages). */
function pageCount(pdf: Uint8Array): number {
  const txt = new TextDecoder('latin1').decode(pdf);
  return (txt.match(/\/Type \/Page[^s]/g) ?? []).length;
}

describe('xlsxToPdf', () => {
  it('fonts é obrigatório: erro claro sem ele', () => {
    expect(() => xlsxToPdf(showcase())).toThrow(/fonts é obrigatório/);
    expect(() => xlsxToPdf(showcase(), { fonts: [] })).toThrow(/fonts é obrigatório/);
  });

  it('showcase: %PDF, uma página por sheet visível, > 1kb', () => {
    const pdf = xlsxToPdf(showcase(), { fonts: fonts() });
    const head = new TextDecoder('latin1').decode(pdf.slice(0, 8));
    expect(head.startsWith('%PDF-1.')).toBe(true);
    expect(pdf.length).toBeGreaterThan(1024);
    // 14 sheets visíveis com conteúdo, cada uma cabe numa página A4
    expect(pageCount(pdf)).toBe(14);
  });

  it('gaps-smoke: 2 sheets → 2 páginas; seleção limita a 1', () => {
    const all = xlsxToPdf(gaps(), { fonts: fonts() });
    expect(pageCount(all)).toBe(2);
    const one = xlsxToPdf(gaps(), { fonts: fonts(), sheet: 0 });
    expect(pageCount(one)).toBe(1);
  });

  it('paginação por linhas: muitas linhas quebram em várias páginas', () => {
    // 120 linhas de 30pt ≈ 3600pt de conteúdo; A4 retrato útil ≈ 770pt → 5 páginas
    let rows = '';
    for (let r = 1; r <= 120; r++) {
      rows += `<row r="${r}" ht="30" customHeight="1"><c r="A${r}"><v>${r}</v></c></row>`;
    }
    const pdf = xlsxToPdf(makeXlsx([{ name: 'Longa', xml: sheetXml(rows) }]), { fonts: fonts() });
    expect(pageCount(pdf)).toBe(5);
  });

  it('fills e texto estilizado não quebram o gerador (conteúdo comprimido válido)', () => {
    const bytes = makeXlsx([{
      name: 'Estilo',
      xml: sheetXml(
        '<row r="1">' + inlineStr('A1', 'Negrito com fill', 3) + '<c r="B1" s="1"><v>1234.5</v></c></row>',
      ),
    }], STYLES_XML);
    const pdf = xlsxToPdf(bytes, { fonts: fonts() });
    expect(pageCount(pdf)).toBe(1);
    const txt = new TextDecoder('latin1').decode(pdf);
    // fonte embutida como Type0/Identity-H com subset TrueType
    expect(txt).toContain('/Subtype /Type0');
    expect(txt).toContain('/FontFile2');
  });

  it('regressão: subset TrueType válido mesmo com Buffer do Node (view no pool)', async () => {
    // O Buffer do readFileSync é uma VIEW num pool compartilhado (byteOffset≠0);
    // o subset já saiu corrompido por isso (loca longo com head marcando curto
    // → todos os glifos viravam tofu). Fixa o formato do head no subset.
    const { subsetTrueType } = await import('@wordnext/pdf');
    const { TtfProgram } = await import('../src/sfnt.js');
    const bytes = readFileSync(join(fontsDir, `${face}-regular.ttf`)); // Buffer!
    const p = new TtfProgram(bytes);
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

  it('planilha vazia é pulada (sem página em branco)', () => {
    const bytes = makeXlsx([
      { name: 'Vazia', xml: sheetXml('') },
      { name: 'Cheia', xml: sheetXml('<row r="1"><c r="A1"><v>1</v></c></row>') },
    ]);
    expect(pageCount(xlsxToPdf(bytes, { fonts: fonts() }))).toBe(1);
  });
});

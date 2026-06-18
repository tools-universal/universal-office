import { describe, expect, it } from 'vitest';
import { unzlibSync } from 'fflate';
import { PdfDocument, hexColor } from '../src/index.js';

const latin1 = (b: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]!);
  return s;
};

describe('estrutura do PDF', () => {
  it('emite header, catálogo/pages/page, xref e trailer válidos', () => {
    const doc = new PdfDocument({ compress: false });
    const page = doc.addPage(595.32, 841.92); // A4 em pt
    page.fillRect(72, 72, 100, 20, hexColor('ff0000'));
    const pdf = doc.build();
    const s = latin1(pdf);

    expect(s.startsWith('%PDF-1.7')).toBe(true);
    expect(s).toContain('/Type /Catalog');
    expect(s).toContain('/Type /Pages');
    expect(s).toContain('/Type /Page');
    expect(s).toContain('/MediaBox [0 0 595.32 841.92]');
    expect(s).toContain('xref');
    expect(s).toContain('trailer');
    expect(s).toContain('%%EOF');
    // retângulo vermelho
    expect(s).toContain('1 0 0 rg');
    expect(s).toContain('re f');
  });

  it('startxref aponta exatamente para a tabela xref', () => {
    const doc = new PdfDocument({ compress: false });
    doc.addPage(200, 200);
    const pdf = doc.build();
    const s = latin1(pdf);
    const m = s.match(/startxref\n(\d+)\n%%EOF/);
    expect(m).toBeTruthy();
    const off = parseInt(m![1]!, 10);
    expect(s.slice(off, off + 4)).toBe('xref');
  });

  it('cada offset do xref aponta para o início do objeto correspondente', () => {
    const doc = new PdfDocument({ compress: false });
    doc.addPage(200, 200);
    const pdf = doc.build();
    const s = latin1(pdf);
    const xrefStart = parseInt(s.match(/startxref\n(\d+)\n/)![1]!, 10);
    const header = s.slice(xrefStart).match(/xref\n0 (\d+)\n/)!;
    const count = parseInt(header[1]!, 10);
    const entriesStart = xrefStart + header[0].length;
    // entrada 0 é o objeto livre; checa objetos 1..count-1
    for (let i = 1; i < count; i++) {
      const entry = s.slice(entriesStart + i * 20, entriesStart + i * 20 + 20);
      const off = parseInt(entry.slice(0, 10), 10);
      expect(s.slice(off).startsWith(`${i} 0 obj`)).toBe(true);
    }
  });

  it('comprime streams grandes com FlateDecode quando habilitado', () => {
    const doc = new PdfDocument({ compress: true });
    const page = doc.addPage(600, 800);
    // muito conteúdo repetitivo → comprime bem
    for (let i = 0; i < 500; i++) page.fillRect(0, i, 100, 1, hexColor('000000'));
    const s = latin1(doc.build());
    expect(s).toContain('/Filter /FlateDecode');
  });

  it('o stream FlateDecode é zlib VÁLIDO (RFC 1950, não deflate cru)', () => {
    const doc = new PdfDocument({ compress: true });
    const page = doc.addPage(600, 800);
    for (let i = 0; i < 500; i++) page.fillRect(0, i, 100, 1, hexColor('000000'));
    const pdf = doc.build();
    const s = latin1(pdf);
    const m = s.match(/\/Filter \/FlateDecode \/Length (\d+) >>\nstream\n/);
    expect(m).toBeTruthy();
    const start = m!.index! + m![0].length;
    const len = parseInt(m![1]!, 10);
    // não deve lançar: zlib bem-formado (header + adler32)
    const inflated = latin1(unzlibSync(pdf.slice(start, start + len)));
    expect(inflated).toContain('re f');
  });
});

import { describe, expect, it } from 'vitest';
import { DocxPackage, readDocument, writeDocument } from '../src/index.js';

function docXmlWithSect(sectInner: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"' +
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<w:body><w:p><w:r><w:t>oi</w:t></w:r></w:p>' +
    `<w:sectPr>${sectInner}</w:sectPr>` +
    '</w:body></w:document>'
  );
}

describe('w:pgNumType/@w:start (numeração de página)', () => {
  it('lê start=0 e preserva no roundtrip', () => {
    const pkg = DocxPackage.empty();
    pkg.setPartText('word/document.xml', docXmlWithSect(
      '<w:pgSz w:w="11906" w:h="16838"/><w:pgNumType w:start="0"/><w:titlePg/>'));
    const model = readDocument(pkg);
    expect(model.sectPr.pgNumStart).toBe(0);
    expect(model.sectPr.titlePg).toBe(true);

    writeDocument(pkg, model);
    const saved = pkg.getPartText('word/document.xml')!;
    expect(saved).toContain('<w:pgNumType w:start="0"/>');

    const model2 = readDocument(DocxPackage.load(pkg.save()));
    expect(model2.sectPr.pgNumStart).toBe(0);
  });

  it('sem pgNumType, pgNumStart fica indefinido (padrão 1 no consumidor)', () => {
    const pkg = DocxPackage.empty();
    pkg.setPartText('word/document.xml', docXmlWithSect('<w:pgSz w:w="11906" w:h="16838"/>'));
    const model = readDocument(pkg);
    expect(model.sectPr.pgNumStart).toBeUndefined();
    writeDocument(pkg, model);
    expect(pkg.getPartText('word/document.xml')!).not.toContain('pgNumType');
  });
});

import { describe, expect, it } from 'vitest';
import { DocxPackage, readDocument, writeDocument } from '../src/index.js';

// <w:drawing> flutuante com uma wps:txbx (caixa de texto) — mesma forma que o
// Word gera para timbrados/nº de página. O texto interno é "ORIGINAL".
function docXmlWithTextbox(innerText: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"' +
    ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"' +
    ' xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"' +
    ' xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"' +
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<w:body><w:p><w:r><w:drawing>' +
    '<wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="1"' +
    ' behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">' +
    '<wp:positionH relativeFrom="page"><wp:posOffset>6524625</wp:posOffset></wp:positionH>' +
    '<wp:positionV relativeFrom="page"><wp:posOffset>10188575</wp:posOffset></wp:positionV>' +
    '<wp:extent cx="742950" cy="304800"/>' +
    '<wp:docPr id="7" name="Caixa 7"/>' +
    '<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">' +
    '<wps:wsp><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="742950" cy="304800"/></a:xfrm>' +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></wps:spPr>' +
    '<wps:txbx><w:txbxContent><w:p><w:pPr><w:jc w:val="right"/></w:pPr>' +
    `<w:r><w:t xml:space="preserve">${innerText}</w:t></w:r>` +
    '</w:p></w:txbxContent></wps:txbx>' +
    '<wps:bodyPr rot="0" wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720">' +
    '<a:spAutoFit/></wps:bodyPr></wps:wsp>' +
    '</a:graphicData></a:graphic>' +
    '</wp:anchor></w:drawing></w:r></w:p>' +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>' +
    '</w:body></w:document>'
  );
}

describe('edição de caixa de texto (wps:txbx)', () => {
  it('lê o conteúdo interno e preserva o XML cru do drawing', () => {
    const pkg = DocxPackage.empty();
    pkg.setPartText('word/document.xml', docXmlWithTextbox('ORIGINAL'));
    const model = readDocument(pkg);
    const tbRun = model.paragraphs.flatMap((p) => p.runs).find((r) => r.textbox);
    expect(tbRun, 'deveria achar o run com textbox').toBeTruthy();
    expect(tbRun!.textbox!.paras[0]!.runs.map((r) => r.text).join('')).toBe('ORIGINAL');
    expect(tbRun!.textbox!.floating).toBe(true);
    expect(tbRun!.textbox!.rawDrawingXml).toContain('wps:txbx');
    expect(tbRun!.textbox!.rawDrawingXml).toContain('prstGeom');
  });

  it('lê spAutoFit e as margens internas (bodyPr insets)', () => {
    const pkg = DocxPackage.empty();
    pkg.setPartText('word/document.xml', docXmlWithTextbox('X'));
    const model = readDocument(pkg);
    const tb = model.paragraphs.flatMap((p) => p.runs).find((r) => r.textbox)!.textbox!;
    expect(tb.autoFit).toBe(true);
    // 91440 EMU / 635 = 144 twips; 45720 / 635 = 72 twips
    expect(tb.insets).toEqual({ l: 144, t: 72, r: 144, b: 72 });
  });

  it('edita o texto interno e o roundtrip preserva a edição E o shape', () => {
    const pkg = DocxPackage.empty();
    pkg.setPartText('word/document.xml', docXmlWithTextbox('ORIGINAL'));
    const model = readDocument(pkg);
    const tbRun = model.paragraphs.flatMap((p) => p.runs).find((r) => r.textbox)!;
    // edita o conteúdo da caixa (como faria a UI de edição in-place)
    tbRun.textbox!.paras[0]!.runs[0]!.text = 'EDITADO';

    writeDocument(pkg, model);
    const savedXml = pkg.getPartText('word/document.xml')!;
    // o shape foi preservado e só o texto trocou
    expect(savedXml).toContain('wps:txbx');
    expect(savedXml).toContain('prstGeom');
    expect(savedXml).toContain('EDITADO');
    expect(savedXml).not.toContain('ORIGINAL');
    // a âncora/geometria original permanece
    expect(savedXml).toContain('cx="742950"');
    expect(savedXml).toContain('relativeFrom="page"');

    const model2 = readDocument(DocxPackage.load(pkg.save()));
    const tbRun2 = model2.paragraphs.flatMap((p) => p.runs).find((r) => r.textbox)!;
    expect(tbRun2.textbox!.paras[0]!.runs.map((r) => r.text).join('')).toBe('EDITADO');
    expect(tbRun2.textbox!.floating).toBe(true);
  });

  it('mover/redimensionar a caixa persiste extent e posOffset', () => {
    const pkg = DocxPackage.empty();
    pkg.setPartText('word/document.xml', docXmlWithTextbox('X'));
    const model = readDocument(pkg);
    const tb = model.paragraphs.flatMap((p) => p.runs).find((r) => r.textbox)!.textbox!;
    // redimensiona e move (como a UI faria)
    tb.widthTwips = 2000;   // 2000 twips → 1270000 EMU
    tb.heightTwips = 600;   // 600 twips → 381000 EMU
    tb.offsetXTwips = 1000; // 1000 twips → 635000 EMU
    tb.offsetYTwips = 2000; // 2000 twips → 1270000 EMU

    writeDocument(pkg, model);
    const savedXml = pkg.getPartText('word/document.xml')!;
    expect(savedXml).toContain('cx="1270000"');      // wp:extent + a:ext
    expect(savedXml).toContain('cy="381000"');
    expect(savedXml).toContain('<wp:posOffset>635000</wp:posOffset>');
    expect(savedXml).toContain('<wp:posOffset>1270000</wp:posOffset>');

    const model2 = readDocument(DocxPackage.load(pkg.save()));
    const tb2 = model2.paragraphs.flatMap((p) => p.runs).find((r) => r.textbox)!.textbox!;
    expect(Math.round(tb2.widthTwips)).toBe(2000);
    expect(Math.round(tb2.heightTwips)).toBe(600);
    expect(Math.round(tb2.offsetXTwips!)).toBe(1000);
    expect(Math.round(tb2.offsetYTwips!)).toBe(2000);
  });
});

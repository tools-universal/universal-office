// Referência JS do DocxPdf.ToPdf(bytes, fonts) do .NET (dotnet/src/UniversalOffice.Docx/Export/
// DocxPdf.cs): o MOTOR DE LAYOUT do Write (@universal-office/docx-layout) com um
// provedor de fontes FIXAS — as variantes dadas (regular/negrito/itálico) servem
// a qualquer família do documento, sintetizando o que faltar; o .NET usa a mesma
// regra (DocxPdf.FixedFontProvider). Substitui o algoritmo v1 pragmático.
// Usado por gen-parity-pdf.mjs (paridade estrutural) e bench-export-pdf.mjs.
const root = new URL('..', import.meta.url).href;
const { DocxPackage, readFullDocument, readEmbeddedFonts, isWordBinary, convertDocToDocx } = await import(new URL('write/packages/docx-core/dist/index.js', root).href);
const { layoutDocument, renderPdf, withEmbeddedFonts } = await import(new URL('write/packages/docx-layout/dist/index.js', root).href);
const { SfntFont } = await import(new URL('write/packages/docx-layout/dist/index.js', root).href);

/** Provedor de fontes fixas: { bytes, bold?, italic?, name? }[] → FontProvider. */
export function fixedFontProvider(fonts) {
  const variants = fonts.map((f, i) => ({
    index: i, bold: !!f.bold, italic: !!f.italic, bytes: f.bytes, font: new SfntFont(f.bytes), name: f.name ?? `Font${i}`,
  }));
  const pick = (bold, italic) =>
    variants.find((v) => v.bold === bold && v.italic === italic) ??
    variants.find((v) => !v.bold && !v.italic) ?? variants[0];
  return {
    face(family, bold, italic) {
      const v = pick(bold, italic);
      return {
        key: `fixed${v.index}`, family: v.name, font: v.font, bytes: v.bytes, bold, italic,
        ...(bold && !v.bold ? { synthBold: true } : {}),
        ...(italic && !v.italic ? { synthItalic: true } : {}),
      };
    },
  };
}

/** .docx (ou .doc) → PDF pelo motor docx-layout com fontes fixas. */
export function docxToPdfRef(bytes, fonts) {
  if (!fonts || !fonts.length) throw new Error('docxToPdfRef: fonts é obrigatório');
  if (isWordBinary(bytes)) bytes = convertDocToDocx(bytes);
  const pkg = DocxPackage.load(bytes);
  const full = readFullDocument(pkg);
  let embedded = [];
  try { embedded = readEmbeddedFonts(pkg); } catch { /* sem fontes embutidas legíveis */ }
  const provider = withEmbeddedFonts(fixedFontProvider(fonts), embedded, (b) => new SfntFont(b));
  return renderPdf(layoutDocument(full, provider));
}

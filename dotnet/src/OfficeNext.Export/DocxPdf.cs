using OfficeNext.DocBinary;
using OfficeNext.DocxLayout;
using OfficeNext.Layout;

namespace OfficeNext.Export;

/// <summary>
/// Export PDF do docx pelo MOTOR DE LAYOUT do Write portado (OfficeNext.DocxLayout
/// — porta de @universal-office/docx-layout, paridade com o JS): cascata OOXML
/// completa, paginação, tabelas, cabeçalhos/rodapés, notas, objetos flutuantes,
/// campos de página e as regras medidas no Word (oráculo). Substitui o v1
/// pragmático (quebra por palavra, sem cabeçalhos/tabs/imagens).
///
/// Fontes: <see cref="ToPdf(byte[])"/> usa as INSTALADAS na máquina (Windows\Fonts,
/// fontes do usuário, cache CloudFonts do Office — lidas em tempo de execução,
/// nunca copiadas); <see cref="ToPdf(byte[], List{PdfFontSource})"/> mantém a API
/// v1: as faces dadas valem para TODA família do documento.
/// .doc (Word 97-2003) é convertido antes pelo OfficeNext.DocBinary.
/// </summary>
public static class DocxPdf
{
    /// <summary>API v1: fontes fixas (as variantes dadas servem a qualquer família).</summary>
    public static byte[] ToPdf(byte[] bytes, List<PdfFontSource> fonts)
    {
        if (fonts is null || fonts.Count == 0)
            throw new ArgumentException("DocxPdf.ToPdf: fonts é obrigatório — o gerador de PDF não tem fontes base-14.");
        return ToPdf(bytes, new FixedFontProvider(fonts));
    }

    /// <summary>Fontes instaladas na máquina (mesmo provedor do corpus lab / testes de paridade).</summary>
    public static byte[] ToPdf(byte[] bytes) => ToPdf(bytes, SystemFontProvider.Shared);

    /// <summary>Provedor de fontes do host + opções do motor.</summary>
    public static byte[] ToPdf(byte[] bytes, IFontProvider provider, LayoutOptions? opts = null, PdfRenderOptions? pdfOpts = null)
    {
        // .doc (Word 97-2003): converte para .docx e segue o caminho normal
        if (DocBinary.DocBinary.IsWordBinary(bytes)) bytes = DocBinary.DocBinary.ConvertDocToDocx(bytes);
        return DocxLayoutPipeline.ToPdf(bytes, provider, opts, pdfOpts);
    }

    /// <summary>
    /// Provedor de fontes FIXAS (API v1): para qualquer família devolve a variante
    /// pedida (negrito/itálico) — ou a regular, ou a primeira — sintetizando o que
    /// faltar. Mesma regra de tools/docx-pdf-ref.mjs (referência JS da paridade).
    /// </summary>
    public sealed class FixedFontProvider : IFontProvider
    {
        private sealed record Variant(int Index, bool Bold, bool Italic, byte[] Bytes, SfntFont Font, string Name);
        private readonly List<Variant> _variants;

        public FixedFontProvider(IReadOnlyList<PdfFontSource> fonts)
        {
            _variants = fonts.Select((f, i) => new Variant(i, f.Bold, f.Italic, f.Bytes, new SfntFont(f.Bytes), f.Name ?? $"Font{i}")).ToList();
        }

        public FontFace? Face(string family, bool bold, bool italic)
        {
            var v = _variants.FirstOrDefault(x => x.Bold == bold && x.Italic == italic)
                ?? _variants.FirstOrDefault(x => !x.Bold && !x.Italic)
                ?? _variants[0];
            return new FontFace
            {
                Key = $"fixed{v.Index}", Family = v.Name, Font = v.Font, Bytes = v.Bytes, Bold = bold, Italic = italic,
                SynthBold = bold && !v.Bold, SynthItalic = italic && !v.Italic,
            };
        }
    }
}

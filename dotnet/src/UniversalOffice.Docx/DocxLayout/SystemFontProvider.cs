using UniversalOffice.Docx;
using UniversalOffice.Fonts;

namespace UniversalOffice.DocxLayout;

/// <summary>
/// Provedor de fontes do motor sobre as fontes INSTALADAS no Windows (porta do
/// provedor de write/tools/corpus-lab/node-fonts.mjs — o índice fica em
/// UniversalOffice.Fonts.SystemFontIndex). As fontes são lidas da máquina em tempo
/// de execução; nada é copiado (CLAUDE.md).
/// </summary>
public sealed class SystemFontProvider : IFontProvider
{
    private readonly SystemFontIndex _index;
    private readonly Dictionary<string, FontFace?> _cache = new(StringComparer.Ordinal);
    private static readonly Lazy<SystemFontProvider> SharedLazy = new(() => new SystemFontProvider(SystemFontIndex.Create()));

    public SystemFontProvider(SystemFontIndex index) { _index = index; }

    /// <summary>Instância compartilhada do processo (o índice varre as pastas de fontes uma vez).</summary>
    public static SystemFontProvider Shared => SharedLazy.Value;

    public SystemFontIndex Index => _index;

    public FontFace? Face(string family, bool bold, bool italic)
    {
        string key = $"{family}\u0000{bold}\u0000{italic}";
        lock (_cache)
        {
            if (_cache.TryGetValue(key, out var cached)) return cached;
            var f = _index.Face(family, bold, italic);
            FontFace? outp = f is null ? null : new FontFace
            {
                Key = f.Key, Family = f.Family, Font = f.Font, Bytes = f.Bytes, Bold = f.Bold, Italic = f.Italic,
                SynthBold = f.SynthBold, SynthItalic = f.SynthItalic,
            };
            _cache[key] = outp;
            return outp;
        }
    }

    /// <summary>As 3 famílias exigidas pelos testes de paridade/oráculo estão instaladas?</summary>
    public bool HasCoreFonts() => new[] { "Arial", "Calibri", "Times New Roman" }.All(f => Face(f, false, false) is not null);
}

/// <summary>Atalhos do caminho completo .docx → layout → PDF (o mesmo convert() do run-engine.mjs).</summary>
public static class DocxLayoutPipeline
{
    /// <summary>Lê o .docx, aplica as fontes embutidas (se legíveis) e diagrama.</summary>
    public static LayoutResult Layout(byte[] docx, IFontProvider provider, LayoutOptions? opts = null)
    {
        var pkg = DocxPackage.Load(docx);
        return Layout(pkg, FullDocReader.ReadFullDocument(pkg), provider, opts);
    }

    private static LayoutResult Layout(DocxPackage pkg, FullDocument full, IFontProvider provider, LayoutOptions? opts)
    {
        List<EmbeddedFace> embedded;
        try
        {
            embedded = EmbeddedFonts.ReadEmbeddedFonts(pkg)
                .Select(e => new EmbeddedFace { Family = e.Family, Variant = e.Variant, Data = e.Data }).ToList();
        }
        catch { embedded = new List<EmbeddedFace>(); } // sem fontes embutidas legíveis
        var prov = Fonts.WithEmbeddedFonts(provider, embedded, b => new SfntFont(b));
        return LayoutEngine.LayoutDocument(full, prov, opts);
    }

    /// <summary>.docx → PDF pelo motor novo, com links clicáveis e marcadores pelos títulos
    /// (os de <c>pdfOpts.Navigation</c>, se dados; senão os do documento). Não altera
    /// <paramref name="pdfOpts"/>: a mesma instância serve a vários documentos.</summary>
    public static byte[] ToPdf(byte[] docx, IFontProvider provider, LayoutOptions? opts = null, PdfRenderOptions? pdfOpts = null)
    {
        var pkg = DocxPackage.Load(docx);
        var full = FullDocReader.ReadFullDocument(pkg);
        var layout = Layout(pkg, full, provider, opts);
        return PdfRenderer.RenderPdf(layout, pdfOpts, pdfOpts?.Navigation ?? PdfNavigation.From(full, layout));
    }
}

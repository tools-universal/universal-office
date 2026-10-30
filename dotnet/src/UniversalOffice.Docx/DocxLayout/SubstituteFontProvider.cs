namespace UniversalOffice.DocxLayout;

/// <summary>
/// Provedor com as SUBSTITUTAS da suíte (o lado servidor do FontResolver de
/// shared/fonts): a família pedida; ausente, a substituta métrico-compatível do
/// catálogo (Calibri → Carlito, Cambria → Caladea, Arial/Helvetica → Liberation
/// Sans, Times → Liberation Serif, Courier → Liberation Mono) — a quebra de linha
/// não muda e o PDF sai com as mesmas fontes que o editor desenha na tela. Sem
/// substituta, nulo: o FaceResolver segue a cadeia do Word até a Liberation Sans.
/// As fontes EMBUTIDAS no .docx continuam na frente (DocxLayoutPipeline).
/// </summary>
public sealed class SubstituteFontProvider(IFontProvider inner) : IFontProvider
{
    private static readonly Lazy<SubstituteFontProvider> SharedLazy = new(() => new SubstituteFontProvider(SystemFontProvider.Shared));

    /// <summary>Fontes do sistema (Windows, Linux, macOS, EXTRA_FONT_DIRS) com as substitutas.</summary>
    public static SubstituteFontProvider Shared => SharedLazy.Value;

    public FontFace? Face(string family, bool bold, bool italic)
    {
        if (inner.Face(family, bold, italic) is { } face) return face;
        if (FontCatalog.MetricSubstitute(family) is not { } sub || inner.Face(sub, bold, italic) is not { } stand) return null;
        // cópia marcada (a face do provedor interno pode estar em cache e servir à própria família)
        return new FontFace
        {
            Key = stand.Key, Family = stand.Family, Font = stand.Font, Bytes = stand.Bytes, Bold = stand.Bold, Italic = stand.Italic,
            SynthBold = stand.SynthBold, SynthItalic = stand.SynthItalic, StandIn = true,
        };
    }
}

using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using OfficeNext.Docx;
using OfficeNext.Layout;

namespace OfficeNext.DocxLayout;

/// <summary>
/// Fontes do motor (porta de docx-layout/src/fonts.ts): o HOST resolve
/// família+variante → face (métricas + bytes para embutir). O motor aplica a
/// substituição do Word para famílias ausentes e mede com as regras observadas
/// no oráculo (tools/layout-oracle):
///  - métricas verticais do DirectWrite: com OS/2.fsSelection bit 7
///    (USE_TYPO_METRICS) valem as typo (asc/desc/lineGap); senão win
///    ascent/descent e gap = max(0, total hhea − total win), posto ACIMA;
///  - altura "simples" = (asc + desc + gap) × tamanho NOMINAL (não o em de
///    dispositivo); baseline a (gap + asc) do topo da linha.
/// </summary>
public sealed class FontFace
{
    /// <summary>chave única (família efetiva + variante) — identifica a face no PDF.</summary>
    public string Key = "";
    /// <summary>família EFETIVA (após substituição).</summary>
    public string Family = "";
    public ILayoutFont Font = null!;
    /// <summary>bytes sfnt para embutir no PDF (nulo: não embutível).</summary>
    public byte[]? Bytes;
    public bool Bold;
    public bool Italic;
    /// <summary>negrito/itálico SINTÉTICO (a família não tem a variante).</summary>
    public bool SynthBold;
    public bool SynthItalic;
}

public interface IFontProvider
{
    /// <summary>Face da família (nome como no documento) ou nulo se a família não existe.</summary>
    FontFace? Face(string family, bool bold, bool italic);
}

public sealed class FaceMetrics
{
    /// <summary>frações do em</summary>
    public double Ascent;
    public double Descent;
    public double LineHeight;
    /// <summary>sublinhado (post table) — frações do em; positivo = abaixo da baseline</summary>
    public double UnderlinePos;
    public double UnderlineThick;
}

/// <summary>Face embutida no documento (word/fonts, já desofuscada).</summary>
public sealed class EmbeddedFace
{
    public string Family = "";
    /// <summary>regular | bold | italic | boldItalic</summary>
    public string Variant = "regular";
    public byte[] Data = [];
}

public sealed class FontTableInfo
{
    public string? AltName;
    public string? Family;
    public string? Panose1;
    public string? Pitch;
    public string? Charset;
}

public static class Fonts
{
    private static readonly ConditionalWeakTable<ILayoutFont, FaceMetrics> MetricsCache = new();

    public static FaceMetrics FaceMetrics(ILayoutFont font)
    {
        if (MetricsCache.TryGetValue(font, out var m)) return m;
        var fm = font.Metrics;
        double u = Truthy(fm.UnitsPerEm) ? fm.UnitsPerEm : 1000;
        double hheaTotal = fm.Ascender - fm.Descender + fm.LineGap;
        double asc, desc, gap;
        if ((fm.FsSelection & 0x80) != 0)
        {
            asc = fm.STypoAscender; desc = -fm.STypoDescender; gap = fm.STypoLineGap;
        }
        else if (fm.UsWinAscent > 0 || fm.UsWinDescent > 0)
        {
            asc = fm.UsWinAscent; desc = fm.UsWinDescent; gap = Math.Max(0, hheaTotal - (asc + desc));
        }
        else
        {
            asc = fm.Ascender; desc = -fm.Descender; gap = fm.LineGap;
        }
        double lineHeight = (asc + desc + gap) / u;
        m = new FaceMetrics
        {
            Ascent = (gap + asc) / u,
            Descent = desc / u,
            LineHeight = lineHeight,
            UnderlinePos = Truthy(fm.UnderlinePosition) ? -fm.UnderlinePosition / u : 0.1,
            UnderlineThick = fm.UnderlineThickness > 0 ? fm.UnderlineThickness / u : 0.05,
        };
        MetricsCache.AddOrUpdate(font, m);
        return m;
    }

    private static bool Truthy(double v) => v != 0 && !double.IsNaN(v);

    /// <summary>em arredondado ao pixel de 600 dpi (o Word mede LARGURAS nesse em).</summary>
    public static double DeviceEmPt(double sizePt) => (Js.Round((sizePt * 600) / 72) * 72) / 600;

    // ───────────────────────── substituição de fontes ─────────────────────────

    /// <summary>Substitutas que o Windows/Word aplicam (FontSubstitutes + nomes PostScript).</summary>
    internal static readonly Dictionary<string, string> Aliases = new(StringComparer.Ordinal)
    {
        ["helvetica"] = "Arial", ["helvetica neue"] = "Arial", ["arialmt"] = "Arial", ["arial mt"] = "Arial", ["ms sans serif"] = "Microsoft Sans Serif",
        ["tms rmn"] = "Times New Roman", ["times"] = "Times New Roman", ["times roman"] = "Times New Roman", ["timesnewromanpsmt"] = "Times New Roman",
        ["ms serif"] = "Times New Roman", ["courier"] = "Courier New", ["courier newpsmt"] = "Courier New", ["couriernewpsmt"] = "Courier New",
        ["ms shell dlg"] = "Microsoft Sans Serif", ["ms shell dlg 2"] = "Tahoma", ["arial unicode ms"] = "Arial",
        ["symbolmt"] = "Symbol", ["wingdings-regular"] = "Wingdings", ["zapfdingbats"] = "Wingdings",
    };

    private static readonly Regex PsRe = new(
        @"^([A-Za-z][A-Za-z0-9 ]*?)[-,](Bold|BoldMT|Italic|ItalicMT|BoldItalic|BoldItalicMT|Regular|MT|Roman|BoldOblique|Oblique|Light|Semibold)\z",
        RegexOptions.CultureInvariant);
    private static readonly Regex CamelRe = new(@"([a-z])([A-Z])", RegexOptions.CultureInvariant);

    /// <summary>"Arial-BoldMT", "Calibri-Italic", "Verdana-Bold" → família + variante.</summary>
    public static (string Family, bool Bold, bool Italic)? ParsePostScriptName(string name)
    {
        var m = PsRe.Match(name);
        if (!m.Success) return null;
        string fam = m.Groups[1].Value;
        if (fam.EndsWith("MT", StringComparison.Ordinal)) fam = fam[..^2];
        if (fam.EndsWith("PS", StringComparison.Ordinal)) fam = fam[..^2];
        string st = m.Groups[2].Value.ToLowerInvariant();
        return (CamelRe.Replace(fam, "$1 $2"), st.Contains("bold"), st.Contains("italic") || st.Contains("oblique"));
    }

    /// <summary>Família padrão do Word para uma família de fonte genérica do fontTable.</summary>
    internal static string GenericFor(FontTableInfo? info)
    {
        switch (info?.Family)
        {
            case "roman": return "Times New Roman";
            case "modern": return "Courier New";
            case "script": return "Times New Roman";
            case "decorative": return "Times New Roman";
            case "swiss": return "Arial";
            default:
                {
                    // PANOSE: byte 0 = família (2 = texto latino), byte 1 = serifa (11-13 = sans)
                    string? p = info?.Panose1;
                    if (!string.IsNullOrEmpty(p) && p.Length >= 4)
                    {
                        double serif = OfficeNext.Core.JsNumber.ParseInt(p.Substring(2, 2), 16);
                        if (serif >= 11 && serif <= 13) return "Arial";
                        if (serif > 0 && serif < 11) return "Times New Roman";
                    }
                    return "Times New Roman";
                }
        }
    }

    /// <summary>
    /// Provedor que consulta primeiro as fontes EMBUTIDAS no documento (o Word as
    /// usa quando a família não está instalada — e mesmo quando está, salvo
    /// subconjunto) e depois o provedor do host.
    /// </summary>
    public static IFontProvider WithEmbeddedFonts(IFontProvider provider, IReadOnlyList<EmbeddedFace> embedded, Func<byte[], ILayoutFont> makeFont)
    {
        if (embedded.Count == 0) return provider;
        return new EmbeddedProvider(provider, embedded, makeFont);
    }

    private sealed class EmbeddedProvider : IFontProvider
    {
        private readonly IFontProvider _provider;
        private readonly Dictionary<string, Dictionary<string, (ILayoutFont Font, byte[] Bytes)>> _byFam = new(StringComparer.Ordinal);
        private readonly Dictionary<string, FontFace?> _cache = new(StringComparer.Ordinal);

        public EmbeddedProvider(IFontProvider provider, IReadOnlyList<EmbeddedFace> embedded, Func<byte[], ILayoutFont> makeFont)
        {
            _provider = provider;
            foreach (var e in embedded)
            {
                try
                {
                    var font = makeFont(e.Data);
                    string k = e.Family.ToLowerInvariant();
                    if (!_byFam.TryGetValue(k, out var m)) { m = new(StringComparer.Ordinal); _byFam[k] = m; }
                    m[e.Variant] = (font, e.Data);
                }
                catch { /* fonte embutida ilegível: ignora */ }
            }
        }

        public FontFace? Face(string family, bool bold, bool italic)
        {
            if (!_byFam.TryGetValue(family.ToLowerInvariant(), out var fam)) return _provider.Face(family, bold, italic);
            string key = $"{family.ToLowerInvariant()}|{(bold ? "true" : "false")}|{(italic ? "true" : "false")}";
            if (_cache.TryGetValue(key, out var cached)) return cached;
            string want = bold && italic ? "boldItalic" : bold ? "bold" : italic ? "italic" : "regular";
            var order = new[] { want, bold ? "bold" : "regular", italic ? "italic" : "regular", "regular", "bold", "italic", "boldItalic" };
            FontFace? outp = null;
            foreach (var v in order)
            {
                if (!fam.TryGetValue(v, out var f)) continue;
                bool fb = v is "bold" or "boldItalic", fi = v is "italic" or "boldItalic";
                outp = new FontFace
                {
                    Key = $"embed:{family}|{v}", Family = family, Font = f.Font, Bytes = f.Bytes, Bold = bold, Italic = italic,
                    SynthBold = bold && !fb, SynthItalic = italic && !fi,
                };
                break;
            }
            // variante pedida não embutida mas a família existe no sistema: prefere o sistema
            if (outp is not null && (outp.SynthBold || outp.SynthItalic)) outp = _provider.Face(family, bold, italic) ?? outp;
            _cache[key] = outp;
            return outp;
        }
    }
}

/// <summary>Resolve a face com a cadeia de substituição do Word; nunca devolve
/// nulo se o provedor tiver ALGUMA das fontes padrão.</summary>
public sealed class FaceResolver
{
    private readonly Dictionary<string, FontFace> _cache = new(StringComparer.Ordinal);
    private readonly IFontProvider _provider;
    private readonly Dictionary<string, FontInfo> _fontTable;
    private readonly string[] _fallbacks;
    /// <summary>fonte padrão do documento (docDefaults/tema): o Word a usa no lugar de
    /// uma família ausente sem altName (medido: "Inter" → Calibri)</summary>
    private readonly string? _docDefault;

    public FaceResolver(IFontProvider provider, Dictionary<string, FontInfo>? fontTable = null, string[]? fallbacks = null, string? docDefault = null)
    {
        _provider = provider;
        _fontTable = fontTable ?? new Dictionary<string, FontInfo>(StringComparer.Ordinal);
        _fallbacks = fallbacks ?? new[] { "Times New Roman", "Arial", "Liberation Serif", "Liberation Sans" };
        _docDefault = docDefault;
    }

    public FontFace Get(string? family, bool bold, bool italic)
    {
        string fam = (family ?? "").Trim();
        if (fam == "") fam = "Times New Roman";
        string key = $"{fam.ToLowerInvariant()}|{(bold ? 1 : 0)}{(italic ? 1 : 0)}";
        if (!_cache.TryGetValue(key, out var f))
        {
            f = Lookup(fam, bold, italic);
            _cache[key] = f;
        }
        return f;
    }

    private static readonly char[] AltSep = { ',', ';' };

    private FontFace Lookup(string fam, bool bold, bool italic)
    {
        var tries = new List<(string Family, bool Bold, bool Italic)> { (fam, bold, italic) };
        if (Fonts.Aliases.TryGetValue(fam.ToLowerInvariant(), out var alias)) tries.Add((alias, bold, italic));
        var ps = Fonts.ParsePostScriptName(fam);
        if (ps is { } p)
        {
            string a2 = Fonts.Aliases.TryGetValue(p.Family.ToLowerInvariant(), out var al2) ? al2 : p.Family;
            tries.Add((a2, bold || p.Bold, italic || p.Italic));
        }
        _fontTable.TryGetValue(fam, out var fi);
        var info = fi is null ? null : new FontTableInfo { AltName = fi.AltName, Family = fi.Family, Panose1 = fi.Panose1, Pitch = fi.Pitch, Charset = fi.Charset };
        if (!string.IsNullOrEmpty(info?.AltName))
            foreach (var alt in info!.AltName!.Split(AltSep)) tries.Add((alt.Trim(), bold, italic));
        bool symbolic = info?.Charset == "02" || info?.Family == "decorative";
        // família ausente sem altName (oráculo fontsub, independe do padrão do
        // documento e do tema): serifada (roman) ou fora do fontTable → Cambria;
        // swiss/auto/modern → Calibri
        if (!symbolic) tries.Add((info is null || info.Family == "roman" ? "Cambria" : "Calibri", bold, italic));
        _ = _docDefault;
        tries.Add((Fonts.GenericFor(info), bold, italic));
        foreach (var fb in _fallbacks) tries.Add((fb, bold, italic));
        foreach (var t in tries)
        {
            if (string.IsNullOrEmpty(t.Family)) continue;
            var face = _provider.Face(t.Family, t.Bold, t.Italic);
            if (face is not null) return face;
        }
        throw new InvalidOperationException($"nenhuma fonte disponível para \"{fam}\"");
    }
}

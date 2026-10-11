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
    /// <summary>ascendente SEM o espaço entre linhas (Ascent = este + gap)</summary>
    public double BareAscent;
    /// <summary>OS/2 ySuperscriptYOffset (fração do em), se a fonte o tem</summary>
    public double? SupOffset;
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
    /// <summary>w:sig (usb0..3, csb0..1, hex)</summary>
    public Dictionary<string, string>? Sig;
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
        // fonte do Leste Asiático (página de código JIS/GB/Wansung/Big5/Johab no OS/2):
        // o Word dá à linha ≈1,3 × (ascendente + descendente) — 15% em cima e 15%
        // embaixo, em unidades inteiras da fonte (MS Gothic: 220+38 / 36+38) — sem o
        // lineGap (oráculo vmea)
        if (((fm.CodePageRange1 >> 17) & 0x1f) != 0)
        {
            double extra = Js.Round(0.15 * (asc + desc));
            asc += extra; desc += extra; gap = 0;
        }
        double lineHeight = (asc + desc + gap) / u;
        m = new FaceMetrics
        {
            Ascent = (gap + asc) / u,
            Descent = desc / u,
            LineHeight = lineHeight,
            UnderlinePos = Truthy(fm.UnderlinePosition) ? -fm.UnderlinePosition / u : 0.1,
            UnderlineThick = fm.UnderlineThickness > 0 ? fm.UnderlineThickness / u : 0.05,
            BareAscent = asc / u,
            SupOffset = fm.YSuperscriptYOffset is { } so && so > 0 ? so / u : null,
        };
        MetricsCache.AddOrUpdate(font, m);
        return m;
    }

    private static bool Truthy(double v) => v != 0 && !double.IsNaN(v);

    /// <summary>
    /// Sobrescrito e subscrito MEDIDOS no Word (oráculo supraise): elevação e queda em meios
    /// pontos (um dígito base 36 por corpo, de 6 a 24pt de meio em meio ponto). Só a fonte do
    /// PRÓPRIO run e o corpo contam — não a fonte do texto ao redor nem a posição na página — e
    /// nenhum arredondamento das métricas (ascendente, OS/2, TEXTMETRIC do GDI) reproduz os
    /// valores: fora da tabela, a fórmula abaixo (e 8% do corpo no subscrito). Calibri Light
    /// mede igual à Calibri.
    /// </summary>
    private static readonly Dictionary<string, (string Raise, string Drop)> VertTableData = new(StringComparer.Ordinal)
    {
        ["arial"] = ("5555666767878999aabbbcccdcdeeefffgggh", "1111221112221222222322233322333344434"),
        ["calibri"] = ("5544555677888999aabbabbbcccdddeeefffg", "1221122212222322233333334434444544455"),
        ["courier new"] = ("35445556567667778899999aababbccccdddd", "1221122222222322333233344434445444555"),
        ["segoe ui"] = ("4556666778989aaabbccbddceeefffggghhhi", "1121112221222232223333333344334445444"),
        ["times new roman"] = ("4555666777899999aabbbcccddeffefffgggh", "1112211222222222322233323233333333344"),
        ["tahoma"] = ("4555666777888999aabbbcccdddeeefffgggh", "0111122211222212222223222333323333444"),
        ["verdana"] = ("4555666777888999aabbbcccdddeeefffgggh", "0111112211222232222233222333223333444"),
        ["cambria"] = ("333444455556666777788889999aaaabbbbcc", "1111111112221222222222333323333333344"),
        ["georgia"] = ("334444555666677778888999aaaabbbbccccd", "1111111122221222222222333322333333333"),
        ["century gothic"] = ("3344445555666677788889999aaaabbbbcccc", "1111111111122212222222222233333333333"),
    };
    private static readonly Dictionary<string, string> VertAlias = new(StringComparer.Ordinal) { ["calibri light"] = "calibri" };

    private static double? VertTable(string family, double bse, int k)
    {
        string f = Js.ToLower(family);
        string key = VertAlias.TryGetValue(f, out var al) ? al : f;
        string? t = VertTableData.TryGetValue(key, out var tt) ? (k == 0 ? tt.Raise : tt.Drop) : null;
        double i = (bse - 6) * 2;
        if (t is null || double.IsNaN(i) || double.IsInfinity(i) || Math.Floor(i) != i || i < 0 || i >= t.Length) return null;
        char ch = t[(int)i];
        int v = ch >= '0' && ch <= '9' ? ch - '0' : ch - 'a' + 10;
        return v / 2.0;
    }

    /// <summary>Elevação do sobrescrito (pt) da fonte do run: tabela medida, senão a fórmula.</summary>
    public static double SuperscriptRaiseFor(string family, FaceMetrics m, double bse, double sup) =>
        VertTable(family, bse, 0) ?? SuperscriptRaisePt(m, bse, sup);

    /// <summary>Queda do subscrito (pt) da fonte do run: tabela medida, senão 8% do corpo.</summary>
    public static double SubscriptDropPt(string family, double bse) => VertTable(family, bse, 1) ?? bse * 0.08;

    /// <summary>
    /// Elevação do sobrescrito (pt), medida no Word em 10 fontes de 6 a 24pt (oráculo
    /// supraise): o topo da ascendente do sobrescrito encosta no da linha base —
    /// asc(linha)·corpo − asc·corpo_sobrescrito — limitado pelo ySuperscriptYOffset
    /// da fonte; os dois em meios pontos.
    /// </summary>
    public static double SuperscriptRaisePt(FaceMetrics m, double bse, double sup)
    {
        static double Half(double v) => Math.Floor(v * 2 + 0.5) / 2;
        double align = Half(m.Ascent * bse - m.BareAscent * sup);
        return m.SupOffset is { } so ? Math.Min(Half(so * bse), align) : align;
    }

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

    /// <summary>Fonte que o Word põe no lugar de uma família ausente com conjunto de caracteres
    /// do Leste Asiático no fontTable: [sem serifa, serifada] (oráculo altname).</summary>
    private static readonly Dictionary<string, (string Sans, string Serif)> CjkDefault = new(StringComparer.Ordinal)
    {
        ["80"] = ("Yu Gothic", "Yu Gothic"),
        ["81"] = ("Dotum", "Batang"),
        ["86"] = ("Microsoft YaHei", "SimSun"),
        ["88"] = ("Microsoft JhengHei", "PMingLiU"),
    };

    private FontFace Lookup(string fam, bool bold, bool italic)
    {
        var tries = new List<(string Family, bool Bold, bool Italic)> { (fam, bold, italic) };
        bool hasAlias = Fonts.Aliases.TryGetValue(fam.ToLowerInvariant(), out var alias);
        _fontTable.TryGetValue(fam, out var info0);
        // conjunto de caracteres do Leste Asiático no fontTable: a fonte padrão da escrita
        // (sem serifa × serifada) — antes do mapeamento próprio do Word; o altName só vale
        // para família que o Word não conhece (oráculo altname, sessão nova do Word)
        string? cjk = info0?.Charset is { } cs0 && CjkDefault.TryGetValue(cs0.ToUpperInvariant(), out var cjkPair)
            ? (info0.Family == "roman" ? cjkPair.Serif : cjkPair.Sans) : null;
        if (!string.IsNullOrEmpty(cjk))
        {
            if (!hasAlias && !string.IsNullOrEmpty(info0?.AltName))
                foreach (var alt in info0!.AltName!.Split(AltSep)) tries.Add((alt.Trim(), bold, italic));
            tries.Add((cjk, bold, italic));
        }
        if (hasAlias) tries.Add((alias!, bold, italic));
        var ps = Fonts.ParsePostScriptName(fam);
        if (ps is { } p)
        {
            string a2 = Fonts.Aliases.TryGetValue(p.Family.ToLowerInvariant(), out var al2) ? al2 : p.Family;
            tries.Add((a2, bold || p.Bold, italic || p.Italic));
        }
        _fontTable.TryGetValue(fam, out var fi);
        var info = fi is null ? null : new FontTableInfo { AltName = fi.AltName, Family = fi.Family, Panose1 = fi.Panose1, Pitch = fi.Pitch, Charset = fi.Charset, Sig = fi.Sig };
        if (!string.IsNullOrEmpty(info?.AltName))
            foreach (var alt in info!.AltName!.Split(AltSep)) tries.Add((alt.Trim(), bold, italic));
        bool symbolic = info?.Charset == "02" || info?.Family == "decorative";
        // família ausente sem altName (oráculo fontsub, independe do padrão do
        // documento e do tema): serifada (roman) ou fora do fontTable → Cambria;
        // swiss/auto/modern → Calibri
        if (!symbolic)
        {
            // assinatura (w:sig) com o bloco árabe: o mapeador de fontes escolhe uma fonte
            // com árabe — Arial (sem serifa/auto) ou Sakkal Majalla (serifada) (oráculo fontsubmark)
            double u0 = info?.Sig is not null && info.Sig.TryGetValue("usb0", out var usb0) && Js.Truthy(usb0)
                ? OfficeNext.Core.JsNumber.ParseInt(usb0, 16) : double.NaN;
            bool arabic = !double.IsNaN(u0) && ((long)u0 & (1 << 13)) != 0;
            if (arabic) tries.Add((info!.Family == "roman" ? "Sakkal Majalla" : "Arial", bold, italic));
            else tries.Add((info is null || info.Family == "roman" ? "Cambria" : "Calibri", bold, italic));
        }
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

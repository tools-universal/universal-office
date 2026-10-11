namespace OfficeNext.Pdf;

/// <summary>
/// Fonte TrueType embutida como Type0/CIDFontType2 com encoding Identity-H
/// (CID = GID) — porta de @wordnext/pdf font.ts. Rastreia os glifos usados para
/// emitir /W e o CMap ToUnicode (texto pesquisável/copiável). Os outlines vêm
/// do FontFile2 embutido (com SUBSET dos glifos usados).
/// </summary>
public sealed class EmbeddedFont
{
    /// <summary>Recurso usado no content stream (ex.: "F0").</summary>
    public string ResourceName { get; }
    public int Index { get; }

    private readonly string _baseName;
    /// <summary>fonte Symbol (codificação própria na área privada)</summary>
    private bool IsSymbolFont => System.Text.RegularExpressions.Regex.IsMatch(System.Text.RegularExpressions.Regex.Replace(_baseName, @"[\s,-]+", ""), @"^(?:[A-Z]{6}\+)?Symbol(?:MT)?$", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
    private readonly byte[] _bytes;
    private readonly IFontProgram _program;
    // gid -> codePoint (para ToUnicode). Concurrent: os exports desenham
    // planilhas/imagens em paralelo e Encode é o único ponto compartilhado.
    private readonly System.Collections.Concurrent.ConcurrentDictionary<int, int> _used = new();
    private readonly double _scale;

    public IFontProgram Program => _program;

    public EmbeddedFont(int index, string baseName, byte[] bytes, IFontProgram program)
    {
        Index = index;
        _baseName = baseName;
        _bytes = bytes;
        _program = program;
        ResourceName = $"F{index}";
        _scale = 1000.0 / program.UnitsPerEm;
    }

    /// <summary>Mapeia um code point para (gid, advance em unidades de fonte) e registra uso.</summary>
    public (int Gid, int AdvanceWidth) Encode(int codePoint)
    {
        // Identity-H tem 2 bytes por glifo: id fora de 0..0xFFFF (fonte/cmap inválido) vira .notdef
        int g0 = _program.GlyphId(codePoint);
        int gid = g0 >= 0 && g0 <= 0xffff ? g0 : 0;
        _used.TryAdd(gid, codePoint);
        return (gid, _program.AdvanceWidth(gid));
    }

    /// <summary>Largura em milésimos de em (espaço de texto do PDF) de um glifo.</summary>
    public int WidthThousandths(int gid) => (int)Math.Floor(_program.AdvanceWidth(gid) * _scale + 0.5);

    private string PsName()
    {
        // BaseFont não pode ter espaços; mantém ASCII.
        var sb = new System.Text.StringBuilder(_baseName.Length);
        foreach (char c in _baseName)
            if (char.IsAsciiLetterOrDigit(c) || c is '+' or '-') sb.Append(c);
        return sb.ToString();
    }

    /// <summary>FontFile2 pronto (subset + deflate) — computável em paralelo no Build.</summary>
    public sealed class PreparedFontFile
    {
        internal PdfWriter.PreparedStream Stream;
        internal int Length1;
    }

    /// <summary>Subset + compressão do FontFile2 (thread-safe; não toca o writer).</summary>
    public PreparedFontFile PrepareFontFile(bool compress)
    {
        var gids = new List<int>(_used.Keys);
        gids.Sort();
        byte[] subset = SubsetTrueType.Subset(_bytes, gids);
        return new PreparedFontFile
        {
            Stream = PdfWriter.Prepare(subset, compress),
            Length1 = subset.Length,
        };
    }

    /// <summary>Emite o grafo de objetos da fonte e retorna o número do objeto Type0.
    /// `prepared` (opcional) evita refazer subset+deflate no thread do Build.</summary>
    public int Write(PdfWriter w, PreparedFontFile? prepared = null)
    {
        string name = PsName();
        int um = _program.UnitsPerEm;
        int asc = (int)Math.Floor((_program.Ascender ?? um * 0.8) * _scale + 0.5);
        int desc = (int)Math.Floor((_program.Descender ?? -um * 0.2) * _scale + 0.5);
        int[] bbox = _program.FontBBox is { } bb
            ? new[]
            {
                (int)Math.Floor(bb.XMin * _scale + 0.5), (int)Math.Floor(bb.YMin * _scale + 0.5),
                (int)Math.Floor(bb.XMax * _scale + 0.5), (int)Math.Floor(bb.YMax * _scale + 0.5),
            }
            : new[] { -200, desc, 1200, asc };
        double italic = _program.ItalicAngle ?? 0;
        // 32 = não-simbólica (texto Latin). bit 7 (64) se itálica.
        int flags = 32 | (italic != 0 ? 64 : 0);

        // FontFile2: programa TrueType com SUBSET (só glifos usados).
        // /Length1 = tamanho descomprimido do subset.
        var gids = new List<int>(_used.Keys);
        gids.Sort();
        prepared ??= PrepareFontFile(w.CompressEnabled);
        int fontFile = w.AddStreamPrepared($"/Length1 {prepared.Length1}", prepared.Stream);

        int descriptor = w.AddDict(
            $"<< /Type /FontDescriptor /FontName /{name} /Flags {flags} " +
            $"/FontBBox [{string.Join(" ", bbox)}] /ItalicAngle {PdfNum.Fmt(italic)} " +
            $"/Ascent {asc} /Descent {desc} /CapHeight {asc} /StemV 80 " +
            $"/FontFile2 {fontFile} 0 R >>");

        // /W: largura por glifo usado, em milésimos de em
        var wParts = new System.Text.StringBuilder();
        foreach (int gid in gids)
        {
            if (wParts.Length > 0) wParts.Append(' ');
            wParts.Append(gid).Append(" [").Append(WidthThousandths(gid)).Append(']');
        }

        int cidFont = w.AddDict(
            $"<< /Type /Font /Subtype /CIDFontType2 /BaseFont /{name} " +
            "/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> " +
            $"/FontDescriptor {descriptor} 0 R /CIDToGIDMap /Identity /DW 1000 " +
            $"/W [{wParts}] >>");

        int toUnicode = w.AddStream("", BuildToUnicode(gids));

        return w.AddDict(
            $"<< /Type /Font /Subtype /Type0 /BaseFont /{name} /Encoding /Identity-H " +
            $"/DescendantFonts [{cidFont} 0 R] /ToUnicode {toUnicode} 0 R >>");
    }

    /// <summary>CMap ToUnicode: mapeia cada CID (=GID) usado ao seu code point Unicode.</summary>
    private byte[] BuildToUnicode(List<int> gids)
    {
        var b = new ByteBuilder(gids.Count * 24 + 320);
        b.Str(
            "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n" +
            "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n" +
            "/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n" +
            "1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n");
        for (int i = 0; i < gids.Count; i += 100)
        {
            int n = Math.Min(100, gids.Count - i);
            b.Str($"{n} beginbfchar\n");
            for (int k = 0; k < n; k++)
            {
                int gid = gids[i + k];
                int cp0 = _used[gid];
                // fonte Symbol (área privada F020–F0FF): o Word grava o caractere Unicode da
                // codificação Symbol (• − α ≤ …); nas demais (Wingdings…) fica o código privado
                int cp = IsSymbolFont && cp0 >= 0xf020 && cp0 <= 0xf0ff && SymbolUnicode.TryGetValue(cp0 - 0xf000, out int su) ? su : cp0;
                b.Str($"<{gid:x4}> <{PdfText.Utf16BeHex(char.ConvertFromUtf32(cp))}>\n");
            }
            b.Str("endbfchar\n");
        }
        b.Str("endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n");
        return b.ToArray();
    }
/// <summary>Codificação da fonte Symbol (código 0x20–0xFE) → Unicode (tabela da Adobe).</summary>
    private static readonly Dictionary<int, int> SymbolUnicode = BuildSymbolUnicode();

    private static Dictionary<int, int> BuildSymbolUnicode()
    {
        var t = new Dictionary<int, int>();
        for (int c = 0x20; c <= 0x7e; c++) t[c] = c;
        var map = new Dictionary<int, int> { [0x22] = 0x2200, [0x24] = 0x2203, [0x27] = 0x220b, [0x2a] = 0x2217, [0x2d] = 0x2212, [0x40] = 0x2245, [0x41] = 0x391, [0x42] = 0x392, [0x43] = 0x3a7, [0x44] = 0x394, [0x45] = 0x395, [0x46] = 0x3a6, [0x47] = 0x393, [0x48] = 0x397, [0x49] = 0x399, [0x4a] = 0x3d1, [0x4b] = 0x39a, [0x4c] = 0x39b, [0x4d] = 0x39c, [0x4e] = 0x39d, [0x4f] = 0x39f, [0x50] = 0x3a0, [0x51] = 0x398, [0x52] = 0x3a1, [0x53] = 0x3a3, [0x54] = 0x3a4, [0x55] = 0x3a5, [0x56] = 0x3c2, [0x57] = 0x3a9, [0x58] = 0x39e, [0x59] = 0x3a8, [0x5a] = 0x396, [0x5c] = 0x2234, [0x5e] = 0x22a5, [0x60] = 0x203e, [0x61] = 0x3b1, [0x62] = 0x3b2, [0x63] = 0x3c7, [0x64] = 0x3b4, [0x65] = 0x3b5, [0x66] = 0x3c6, [0x67] = 0x3b3, [0x68] = 0x3b7, [0x69] = 0x3b9, [0x6a] = 0x3d5, [0x6b] = 0x3ba, [0x6c] = 0x3bb, [0x6d] = 0x3bc, [0x6e] = 0x3bd, [0x6f] = 0x3bf, [0x70] = 0x3c0, [0x71] = 0x3b8, [0x72] = 0x3c1, [0x73] = 0x3c3, [0x74] = 0x3c4, [0x75] = 0x3c5, [0x76] = 0x3d6, [0x77] = 0x3c9, [0x78] = 0x3be, [0x79] = 0x3c8, [0x7a] = 0x3b6, [0x7e] = 0x223c, [0xa0] = 0x20ac, [0xa1] = 0x3d2, [0xa2] = 0x2032, [0xa3] = 0x2264, [0xa4] = 0x2044, [0xa5] = 0x221e, [0xa6] = 0x192, [0xa7] = 0x2663, [0xa8] = 0x2666, [0xa9] = 0x2665, [0xaa] = 0x2660, [0xab] = 0x2194, [0xac] = 0x2190, [0xad] = 0x2191, [0xae] = 0x2192, [0xaf] = 0x2193, [0xb0] = 0xb0, [0xb1] = 0xb1, [0xb2] = 0x2033, [0xb3] = 0x2265, [0xb4] = 0xd7, [0xb5] = 0x221d, [0xb6] = 0x2202, [0xb7] = 0x2022, [0xb8] = 0xf7, [0xb9] = 0x2260, [0xba] = 0x2261, [0xbb] = 0x2248, [0xbc] = 0x2026, [0xbf] = 0x21b5, [0xc0] = 0x2135, [0xc1] = 0x2111, [0xc2] = 0x211c, [0xc3] = 0x2118, [0xc4] = 0x2297, [0xc5] = 0x2295, [0xc6] = 0x2205, [0xc7] = 0x2229, [0xc8] = 0x222a, [0xc9] = 0x2283, [0xca] = 0x2287, [0xcb] = 0x2284, [0xcc] = 0x2282, [0xcd] = 0x2286, [0xce] = 0x2208, [0xcf] = 0x2209, [0xd0] = 0x2220, [0xd1] = 0x2207, [0xd2] = 0xae, [0xd3] = 0xa9, [0xd4] = 0x2122, [0xd5] = 0x220f, [0xd6] = 0x221a, [0xd7] = 0x22c5, [0xd8] = 0xac, [0xd9] = 0x2227, [0xda] = 0x2228, [0xdb] = 0x21d4, [0xdc] = 0x21d0, [0xdd] = 0x21d1, [0xde] = 0x21d2, [0xdf] = 0x21d3, [0xe0] = 0x25ca, [0xe1] = 0x2329, [0xe2] = 0xae, [0xe3] = 0xa9, [0xe4] = 0x2122, [0xe5] = 0x2211, [0xf1] = 0x232a, [0xf2] = 0x222b };
        foreach (var kv in map) t[kv.Key] = kv.Value;
        return t;
    }
}

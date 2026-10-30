namespace UniversalOffice.Pdf;

/// <summary>
/// Fonte TrueType embutida como Type0/CIDFontType2 com encoding Identity-H
/// (CID = GID) — porta de write/packages/docx-layout/src/pdf-writer/font.ts. Rastreia os glifos usados para
/// emitir /W e o CMap ToUnicode (texto pesquisável/copiável). Os outlines vêm
/// do FontFile2 embutido (com SUBSET dos glifos usados).
/// </summary>
public sealed class EmbeddedFont
{
    /// <summary>Recurso usado no content stream (ex.: "F0").</summary>
    public string ResourceName { get; }
    public int Index { get; }

    private readonly string _baseName;
    /// <summary>fonte de símbolo (Symbol, Wingdings — códigos na área privada F0xx) com a tabela de
    /// equivalentes Unicode que o Word grava no ToUnicode; também a negrita/itálica</summary>
    private Dictionary<int, int>? SymbolTable
    {
        get
        {
            string n = System.Text.RegularExpressions.Regex.Replace(System.Text.RegularExpressions.Regex.Replace(_baseName, @"^[A-Z]{6}\+", ""), @"[\s,]+", "");
            if (System.Text.RegularExpressions.Regex.IsMatch(n, @"^Symbol(?:MT)?(?:-|$)", System.Text.RegularExpressions.RegexOptions.IgnoreCase)) return WordSymbolUnicode;
            if (System.Text.RegularExpressions.Regex.IsMatch(n, @"^Wingdings(?:-|$)", System.Text.RegularExpressions.RegexOptions.IgnoreCase)) return WordWingdingsUnicode;
            return null;
        }
    }
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
                // fonte de símbolo (área privada F020–F0FF): o Word grava o equivalente Unicode só
                // de alguns códigos (• − → ✓ ▪ ➢ ⚫…); os demais ficam com o código privado
                var table = SymbolTable;
                int cp = table is not null && cp0 >= 0xf020 && cp0 <= 0xf0ff && table.TryGetValue(cp0 - 0xf000, out int su) ? su : cp0;
                b.Str($"<{gid:x4}> <{PdfText.Utf16BeHex(char.ConvertFromUtf32(cp))}>\n");
            }
            b.Str("endbfchar\n");
        }
        b.Str("endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n");
        return b.ToArray();
    }
/// <summary>
    /// Códigos da fonte Symbol (0x20–0xFF) que o Word grava como Unicode no ToUnicode do PDF —
    /// medido (os 224 códigos via w:sym); os demais, inclusive as letras gregas, ficam com o
    /// código privado F0xx.
    /// </summary>
    private static readonly Dictionary<int, int> WordSymbolUnicode = new()
    {
        [0x28] = 0x28, [0x29] = 0x29, [0x2b] = 0x2b, [0x2d] = 0x2212, [0x3d] = 0x3d, [0x5e] = 0x22a5,
        [0xae] = 0x2192, [0xb7] = 0x2022, [0xbe] = 0x23af, [0xd3] = 0xa9, [0xe3] = 0xa9,
    };

    /// <summary>Idem para a Wingdings (Wingdings 2/3 e Webdings: nenhum — tudo fica no código privado).</summary>
    private static readonly Dictionary<int, int> WordWingdingsUnicode = new()
    {
        [0x4a] = 0x263a, [0x6c] = 0x26ab, [0x6e] = 0x25fc, [0x71] = 0x2751, [0x73] = 0x2b27, [0x74] = 0x29eb, [0x75] = 0x25c6,
        [0x76] = 0x2756, [0xa7] = 0x25aa, [0xd8] = 0x27a2, [0xe0] = 0x2192, [0xe8] = 0x2794, [0xfc] = 0x2713,
    };
}

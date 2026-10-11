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
                int cp = _used[gid];
                b.Str($"<{gid:x4}> <{PdfText.Utf16BeHex(char.ConvertFromUtf32(cp))}>\n");
            }
            b.Str("endbfchar\n");
        }
        b.Str("endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n");
        return b.ToArray();
    }
}

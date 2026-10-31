using System.Buffers.Binary;

namespace UniversalOffice.Converter.Pdf;

/// <summary>
/// O mínimo que o gerador de PDF precisa saber de um programa de fonte
/// TrueType — porta da interface FontProgram de @wordnext/pdf font.ts.
/// </summary>
public interface IFontProgram
{
    /// <summary>unitsPerEm da tabela head.</summary>
    int UnitsPerEm { get; }
    /// <summary>glyph id de um code point Unicode (0 se ausente).</summary>
    int GlyphId(int codePoint);
    /// <summary>advance width de um glifo em unidades de fonte.</summary>
    int AdvanceWidth(int glyphId);
    /// <summary>caixa da fonte em unidades de fonte (head.xMin..yMax); null = derivado.</summary>
    (int XMin, int YMin, int XMax, int YMax)? FontBBox { get; }
    /// <summary>ascent em unidades de fonte; null = derivado.</summary>
    int? Ascender { get; }
    /// <summary>descent (negativo) em unidades de fonte; null = derivado.</summary>
    int? Descender { get; }
    double? ItalicAngle { get; }
}

/// <summary>
/// Parser mínimo de fontes TrueType (SFNT) — porta de
/// sheet/packages/export/src/sfnt.ts: unitsPerEm, cmap (formats 4 e 12),
/// hmtx (advance por glifo), bbox/ascender/descender/italicAngle p/ o
/// FontDescriptor. Extra da fase 2: tabela `kern` legada (formato 0) para o
/// DocxToPdf ("kerning se trivial" — GPOS fica fora do escopo).
/// </summary>
public sealed class TtfProgram : IFontProgram
{
    public int UnitsPerEm { get; }
    public int AscenderVal { get; }
    public int DescenderVal { get; } // negativo
    public (int XMin, int YMin, int XMax, int YMax)? FontBBox { get; }
    public int? Ascender => AscenderVal;
    public int? Descender => DescenderVal;
    public double? ItalicAngle { get; }

    private readonly byte[] _bytes;
    private readonly int _numberOfHMetrics;
    private readonly int _hmtxOffset;
    private readonly CmapRange[] _ranges;
    /// <summary>Cache de advances indexado pelo hMetric (-1 = vazio). Escrita
    /// idempotente de int → seguro sob concorrência (exports paralelos).</summary>
    private readonly int[] _advanceCache;
    private readonly Dictionary<long, int> _kernPairs;

    private readonly struct CmapRange
    {
        public readonly int Start;
        public readonly int End;
        /// <summary>format 4: delta quando RangeBase &lt; 0; senão glyphIdArray em RangeBase + (c-Start)*2.</summary>
        public readonly int Delta;
        public readonly int RangeBase;   // offset absoluto em bytes (ou -1)
        public readonly int StartGlyph;  // format 12 (ou -1)

        public CmapRange(int start, int end, int delta, int rangeBase, int startGlyph)
        {
            Start = start; End = end; Delta = delta; RangeBase = rangeBase; StartGlyph = startGlyph;
        }
    }

    /// <summary>
    /// Cache de métricas por INSTÂNCIA de byte[] (spec 07: "cache de métricas de
    /// fonte") — quem exporta várias vezes com os mesmos bytes não re-parseia
    /// cmap/hmtx/kern. Weak: solta junto com o array.
    /// </summary>
    private static readonly System.Runtime.CompilerServices.ConditionalWeakTable<byte[], TtfProgram> Cache = new();

    public static TtfProgram For(byte[] bytes) => Cache.GetValue(bytes, b => new TtfProgram(b));

    private ushort U16(int p) => BinaryPrimitives.ReadUInt16BigEndian(_bytes.AsSpan(p));
    private short I16(int p) => BinaryPrimitives.ReadInt16BigEndian(_bytes.AsSpan(p));
    private uint U32(int p) => BinaryPrimitives.ReadUInt32BigEndian(_bytes.AsSpan(p));
    private int I32(int p) => BinaryPrimitives.ReadInt32BigEndian(_bytes.AsSpan(p));

    public TtfProgram(byte[] bytes)
    {
        _bytes = bytes;
        var tables = new Dictionary<string, int>(StringComparer.Ordinal);
        int numTables = U16(4);
        for (int i = 0; i < numTables; i++)
        {
            int p = 12 + i * 16;
            string tag = $"{(char)bytes[p]}{(char)bytes[p + 1]}{(char)bytes[p + 2]}{(char)bytes[p + 3]}";
            tables[tag] = (int)U32(p + 8);
        }
        int Req(string tag) => tables.TryGetValue(tag, out int off)
            ? off
            : throw new InvalidDataException($"Fonte TTF sem a tabela {tag}");

        int head = Req("head");
        int hhea = Req("hhea");
        UnitsPerEm = U16(head + 18);
        FontBBox = (I16(head + 36), I16(head + 38), I16(head + 40), I16(head + 42));
        AscenderVal = I16(hhea + 4);
        DescenderVal = I16(hhea + 6);
        _numberOfHMetrics = U16(hhea + 34);
        _hmtxOffset = Req("hmtx");
        _advanceCache = new int[Math.Max(1, _numberOfHMetrics)];
        Array.Fill(_advanceCache, -1);
        ItalicAngle = tables.TryGetValue("post", out int post) ? I32(post + 4) / 65536.0 : 0;

        _ranges = ParseCmap(Req("cmap"));
        _kernPairs = tables.TryGetValue("kern", out int kern) ? ParseKern(kern) : new Dictionary<long, int>();
    }

    private CmapRange[] ParseCmap(int cmap)
    {
        int n = U16(cmap + 2);
        int best = -1, bestScore = -1;
        for (int i = 0; i < n; i++)
        {
            int p = cmap + 4 + i * 8;
            int platform = U16(p);
            int encoding = U16(p + 2);
            int offset = (int)U32(p + 4);
            // Preferência: Windows UCS-4 (3,10) > Windows BMP (3,1) > Unicode
            int score =
                platform == 3 && encoding == 10 ? 3 :
                platform == 3 && encoding == 1 ? 2 :
                platform == 0 ? 1 : 0;
            if (score > bestScore) { bestScore = score; best = cmap + offset; }
        }
        if (best < 0) throw new InvalidDataException("Fonte TTF: cmap sem subtabela utilizável");

        var ranges = new List<CmapRange>();
        int format = U16(best);
        if (format == 4)
        {
            int segCount = U16(best + 6) / 2;
            int endP = best + 14;
            int startP = endP + segCount * 2 + 2;
            int deltaP = startP + segCount * 2;
            int rangeP = deltaP + segCount * 2;
            for (int s = 0; s < segCount; s++)
            {
                int end = U16(endP + s * 2);
                int start = U16(startP + s * 2);
                int delta = I16(deltaP + s * 2);
                int rangeOffset = U16(rangeP + s * 2);
                int idP = rangeP + s * 2;
                ranges.Add(rangeOffset == 0
                    ? new CmapRange(start, end, delta, -1, -1)
                    : new CmapRange(start, end, delta, idP + rangeOffset, -1));
            }
        }
        else if (format == 12)
        {
            int nGroups = (int)U32(best + 12);
            for (int g = 0; g < nGroups; g++)
            {
                int p = best + 16 + g * 12;
                ranges.Add(new CmapRange((int)U32(p), (int)U32(p + 4), 0, -1, (int)U32(p + 8)));
            }
        }
        else
        {
            throw new InvalidDataException($"Fonte TTF: cmap format {format} não suportado");
        }
        ranges.Sort((a, b) => a.Start.CompareTo(b.Start));
        return ranges.ToArray();
    }

    /// <summary>Pares de kerning da tabela `kern` legada, formato 0 (horizontal).</summary>
    private Dictionary<long, int> ParseKern(int kern)
    {
        var pairs = new Dictionary<long, int>();
        try
        {
            int nTables = U16(kern + 2);
            int p = kern + 4;
            for (int t = 0; t < nTables; t++)
            {
                int length = U16(p + 2);
                int coverage = U16(p + 4);
                int fmt = coverage >> 8;
                bool horizontal = (coverage & 0x1) != 0;
                bool crossStream = (coverage & 0x4) != 0;
                if (fmt == 0 && horizontal && !crossStream)
                {
                    int nPairs = U16(p + 6);
                    int q = p + 14;
                    for (int i = 0; i < nPairs; i++, q += 6)
                    {
                        long key = ((long)U16(q) << 16) | U16(q + 2);
                        pairs[key] = I16(q + 4);
                    }
                }
                p += length;
            }
        }
        catch
        {
            // kern malformada: sem kerning (fidelidade degrada, não quebra)
            pairs.Clear();
        }
        return pairs;
    }

    /// <summary>glyph id de um code point (0 = .notdef).</summary>
    public int GlyphId(int codePoint)
    {
        int lo = 0, hi = _ranges.Length - 1;
        while (lo <= hi)
        {
            int mid = (lo + hi) >> 1;
            var r = _ranges[mid];
            if (codePoint < r.Start) hi = mid - 1;
            else if (codePoint > r.End) lo = mid + 1;
            else
            {
                if (r.StartGlyph >= 0) return r.StartGlyph + (codePoint - r.Start);       // format 12
                if (r.RangeBase < 0) return (codePoint + r.Delta) & 0xffff;               // format 4, delta
                int g = U16(r.RangeBase + (codePoint - r.Start) * 2);                     // format 4, glyphIdArray
                return g == 0 ? 0 : (g + r.Delta) & 0xffff;
            }
        }
        return 0;
    }

    /// <summary>Advance width do glifo em unidades da fonte.</summary>
    public int AdvanceWidth(int glyphId)
    {
        int i = Math.Min(glyphId, _numberOfHMetrics - 1);
        int w = _advanceCache[i];
        if (w < 0) _advanceCache[i] = w = U16(_hmtxOffset + i * 4);
        return w;
    }

    /// <summary>Ajuste de kerning (unidades de fonte) para o par de glifos; 0 se ausente.</summary>
    public int KernAdjust(int leftGid, int rightGid) =>
        _kernPairs.Count > 0 && _kernPairs.TryGetValue(((long)leftGid << 16) | (uint)rightGid, out int v) ? v : 0;

    public bool HasKerning => _kernPairs.Count > 0;
}

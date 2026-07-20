using System.Buffers.Binary;

namespace OfficeNext.Pdf;

/// <summary>
/// Subset de fonte TrueType mantendo os glyph ids (CID = GID, como usamos em
/// Identity-H) — porta de @wordnext/pdf subset.ts: preserva apenas os glifos
/// usados (e os componentes de glifos compostos), esvaziando os demais, e
/// descarta tabelas de layout pesadas (GPOS/GSUB/GDEF/kern…). `numGlyphs`,
/// `hmtx` e `cmap` ficam intactos, então os índices continuam válidos sem
/// remapear. Em caso de fonte sem glyf (ex.: CFF/OTF) devolve os bytes originais.
/// </summary>
public static class SubsetTrueType
{
    // tabelas mínimas para um programa TrueType embutível renderizar
    private static readonly HashSet<string> Keep = new(StringComparer.Ordinal)
    {
        "head", "hhea", "maxp", "hmtx", "cmap", "loca", "glyf", "OS/2", "post", "cvt ", "fpgm", "prep", "gasp", "name",
    };

    public static byte[] Subset(byte[] bytes, IEnumerable<int> usedGids)
    {
        try
        {
            return DoSubset(bytes, usedGids);
        }
        catch
        {
            return bytes; // qualquer imprevisto: melhor a fonte inteira do que quebrada
        }
    }

    private static ushort U16(byte[] b, int p) => BinaryPrimitives.ReadUInt16BigEndian(b.AsSpan(p));
    private static short I16(byte[] b, int p) => BinaryPrimitives.ReadInt16BigEndian(b.AsSpan(p));
    private static uint U32(byte[] b, int p) => BinaryPrimitives.ReadUInt32BigEndian(b.AsSpan(p));

    private sealed record Tbl(string Tag, int Offset, int Length);

    private static byte[] DoSubset(byte[] bytes, IEnumerable<int> usedGids)
    {
        uint sfntVersion = U32(bytes, 0);
        int numTables = U16(bytes, 4);
        var dir = new Dictionary<string, Tbl>(StringComparer.Ordinal);
        var order = new List<Tbl>();
        for (int i = 0; i < numTables; i++)
        {
            int p = 12 + i * 16;
            string tag = $"{(char)bytes[p]}{(char)bytes[p + 1]}{(char)bytes[p + 2]}{(char)bytes[p + 3]}";
            var t = new Tbl(tag, (int)U32(bytes, p + 8), (int)U32(bytes, p + 12));
            if (!dir.ContainsKey(tag)) { dir[tag] = t; order.Add(t); }
        }
        if (!dir.TryGetValue("head", out var head) || !dir.TryGetValue("maxp", out var maxp)
            || !dir.TryGetValue("loca", out var loca) || !dir.TryGetValue("glyf", out var glyf))
            return bytes; // sem outlines TrueType

        int numGlyphs = U16(bytes, maxp.Offset + 4);
        bool longLoca = U16(bytes, head.Offset + 50) == 1;
        var glyphOff = new int[numGlyphs + 1];
        for (int i = 0; i <= numGlyphs; i++)
            glyphOff[i] = longLoca ? (int)U32(bytes, loca.Offset + i * 4) : U16(bytes, loca.Offset + i * 2) * 2;

        // glifos a manter: usados + 0 (.notdef) + componentes (compostos, recursivo)
        var keep = new HashSet<int> { 0 };
        foreach (int g in usedGids) if (g >= 0 && g < numGlyphs) keep.Add(g);
        var work = new Stack<int>(keep);
        while (work.Count > 0)
        {
            int g = work.Pop();
            int s = glyf.Offset + glyphOff[g], e = glyf.Offset + glyphOff[g + 1];
            if (e <= s) continue;
            if (I16(bytes, s) >= 0) continue; // simples: sem componentes
            int p = s + 10;
            while (true)
            {
                int flags = U16(bytes, p);
                int comp = U16(bytes, p + 2);
                p += 4;
                if (keep.Add(comp)) work.Push(comp);
                p += (flags & 0x0001) != 0 ? 4 : 2;      // ARGS são words?
                if ((flags & 0x0008) != 0) p += 2;       // WE_HAVE_A_SCALE
                else if ((flags & 0x0040) != 0) p += 4;  // X_AND_Y_SCALE
                else if ((flags & 0x0080) != 0) p += 8;  // 2x2
                if ((flags & 0x0020) == 0) break;        // MORE_COMPONENTS
            }
        }

        // novo glyf (só glifos mantidos) + novo loca (long), preservando os índices
        var newLoca = new byte[(numGlyphs + 1) * 4];
        int acc = 0;
        var glyfParts = new List<(int Src, int Len, int Padded)>();
        for (int g = 0; g < numGlyphs; g++)
        {
            BinaryPrimitives.WriteUInt32BigEndian(newLoca.AsSpan(g * 4), (uint)acc);
            if (keep.Contains(g))
            {
                int s = glyf.Offset + glyphOff[g], e = glyf.Offset + glyphOff[g + 1];
                int len = e - s;
                if (len > 0)
                {
                    int padded = (len + 1) & ~1; // alinhamento par
                    glyfParts.Add((s, len, padded));
                    acc += padded;
                }
            }
        }
        BinaryPrimitives.WriteUInt32BigEndian(newLoca.AsSpan(numGlyphs * 4), (uint)acc);
        var newGlyf = new byte[acc];
        {
            int o = 0;
            foreach (var (src, len, padded) in glyfParts)
            {
                Buffer.BlockCopy(bytes, src, newGlyf, o, len);
                o += padded; // bytes de padding já são zero
            }
        }

        // head com loca longo e checkSumAdjustment zerado (recalculado ao final).
        // CUIDADO (fix herdado do JS): cópia explícita do head + escrita no offset
        // certo — no JS uma view com byteOffset esquecido corrompia o subset.
        var newHead = new byte[head.Length];
        Buffer.BlockCopy(bytes, head.Offset, newHead, 0, head.Length);
        BinaryPrimitives.WriteUInt16BigEndian(newHead.AsSpan(50), 1);  // indexToLocFormat = long
        BinaryPrimitives.WriteUInt32BigEndian(newHead.AsSpan(8), 0);   // checkSumAdjustment = 0

        var outTables = new List<(string Tag, byte[] Data)>();
        foreach (var t in order)
        {
            if (!Keep.Contains(t.Tag)) continue;
            if (t.Tag == "glyf") outTables.Add((t.Tag, newGlyf));
            else if (t.Tag == "loca") outTables.Add((t.Tag, newLoca));
            else if (t.Tag == "head") outTables.Add((t.Tag, newHead));
            else
            {
                var data = new byte[t.Length];
                Buffer.BlockCopy(bytes, t.Offset, data, 0, t.Length);
                outTables.Add((t.Tag, data));
            }
        }
        return BuildSfnt(sfntVersion, outTables);
    }

    private static uint Checksum(byte[] buf, int off, int len)
    {
        uint sum = 0;
        int end = off + ((len + 3) & ~3);
        for (int i = off; i < end; i += 4)
        {
            // leitura tolerante além do fim lógico (o buffer de saída já tem padding zero)
            uint v = (uint)(buf[i] << 24 | buf[i + 1] << 16 | buf[i + 2] << 8 | buf[i + 3]);
            sum = unchecked(sum + v);
        }
        return sum;
    }

    private static byte[] BuildSfnt(uint sfntVersion, List<(string Tag, byte[] Data)> tables)
    {
        tables.Sort((a, b) => string.CompareOrdinal(a.Tag, b.Tag));
        int num = tables.Count;
        int headerSize = 12 + num * 16;
        int offset = headerSize;
        var layout = new (string Tag, byte[] Data, int Offset)[num];
        for (int i = 0; i < num; i++)
        {
            layout[i] = (tables[i].Tag, tables[i].Data, offset);
            offset += (tables[i].Data.Length + 3) & ~3;
        }
        var outp = new byte[offset];
        BinaryPrimitives.WriteUInt32BigEndian(outp.AsSpan(0), sfntVersion);
        BinaryPrimitives.WriteUInt16BigEndian(outp.AsSpan(4), (ushort)num);
        int maxPow = (int)Math.Floor(Math.Log2(num));
        int searchRange = (1 << maxPow) * 16;
        BinaryPrimitives.WriteUInt16BigEndian(outp.AsSpan(6), (ushort)searchRange);
        BinaryPrimitives.WriteUInt16BigEndian(outp.AsSpan(8), (ushort)maxPow);
        BinaryPrimitives.WriteUInt16BigEndian(outp.AsSpan(10), (ushort)(num * 16 - searchRange));
        int p = 12;
        int headOffset = -1;
        foreach (var (tag, data, off) in layout)
        {
            Buffer.BlockCopy(data, 0, outp, off, data.Length);
            for (int i = 0; i < 4; i++) outp[p + i] = (byte)(i < tag.Length ? tag[i] : ' ');
            BinaryPrimitives.WriteUInt32BigEndian(outp.AsSpan(p + 4), Checksum(outp, off, data.Length));
            BinaryPrimitives.WriteUInt32BigEndian(outp.AsSpan(p + 8), (uint)off);
            BinaryPrimitives.WriteUInt32BigEndian(outp.AsSpan(p + 12), (uint)data.Length);
            if (tag == "head") headOffset = off;
            p += 16;
        }
        if (headOffset >= 0)
        {
            uint fileCs = Checksum(outp, 0, outp.Length);
            BinaryPrimitives.WriteUInt32BigEndian(outp.AsSpan(headOffset + 8), unchecked(0xb1b0afbau - fileCs));
        }
        return outp;
    }
}

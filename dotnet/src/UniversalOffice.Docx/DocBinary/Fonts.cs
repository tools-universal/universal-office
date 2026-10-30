namespace UniversalOffice.DocBinary;

/// <summary>Fonte da SttbfFfn (FFN).</summary>
internal sealed class DocFont
{
    public string Name = "";
    public string? AltName;
    /// <summary>0 default, 1 fixed, 2 variable.</summary>
    public int Prq;
    public bool TrueType;
    /// <summary>0 auto, 1 roman, 2 swiss, 3 modern, 4 script, 5 decorative.</summary>
    public int Ff;
    public int Weight;
    public int Charset;
    public byte[] Panose = Array.Empty<byte>();
    /// <summary>FONTSIGNATURE: usb0..3, csb0..1 (u32 não negativos).</summary>
    public long[] Sig = new long[6];
}

/// <summary>Tabela de fontes ([MS-DOC] SttbfFfn) — porta de fonts.ts.</summary>
internal static class Fonts
{
    private static (string S, long Next) Cstr(ByteReader r, long off, long end)
    {
        var sb = new System.Text.StringBuilder();
        long o = off;
        while (o + 1 < end)
        {
            int c = r.U16(o);
            o += 2;
            if (c == 0) break;
            sb.Append((char)c);
        }
        return (sb.ToString(), o);
    }

    /// <summary>Nome alternativo com lixo de memória (heap de depuração do MSVC) ou controle.</summary>
    private static bool IsGarbage(string s)
    {
        foreach (char ch in s)
        {
            int c = ch;
            if (c <= 0x1f || c == 0xfdfd || c == 0xcdcd || c == 0xdddd || c == 0xfffd || c == 0xffff) return true;
        }
        return false;
    }

    public static List<DocFont> Read(Fib fib, Bytes table)
    {
        var fonts = new List<DocFont>();
        var (fc, lcb) = fib.FcLcb(FC.SttbfFfn);
        if (lcb == 0 || fc + lcb > table.Length) return fonts;
        var r = new ByteReader(table);
        long off = fc;
        long end = fc + lcb;
        int cData = r.U16(off); off += 2;
        bool extended = false;
        if (cData == 0xffff) { extended = true; cData = r.U16(off); off += 2; }
        int cbExtra = r.U16(off); off += 2;
        for (int i = 0; i < cData && off < end; i++)
        {
            long cb = extended ? r.U16(off) * 2 : r.U8(off);
            off += extended ? 2 : 1;
            long o = off;
            int ffid = r.U8(o);
            long nameStart = o + 39;
            long lim = Math.Min(o + cb, end);
            var (name, next) = Cstr(r, nameStart, lim);
            int ixAlt = r.U8(o + 4);
            string? altName = null;
            if (ixAlt != 0)
            {
                string alt = Cstr(r, next, lim).S;
                // nome alternativo com lixo de memória (0xFD/0xCD/0xDD do heap de depuração do
                // MSVC, ex.: U+FDFD repetido) ou controle: o Word o descarta
                if (alt.Length > 0 && !IsGarbage(alt)) altName = alt;
            }
            var sig = new long[6];
            for (int k = 0; k < 6; k++) sig[k] = r.U32(o + 15 + k * 4);
            fonts.Add(new DocFont
            {
                Name = name.Length > 0 ? name : $"Font{i}",
                AltName = altName,
                Prq = ffid & 3,
                TrueType = (ffid & 4) != 0,
                Ff = (ffid >> 4) & 7,
                Weight = r.I16(o + 1),
                Charset = r.U8(o + 3),
                Panose = r.Sub(o + 5, o + 15).ToArray(),
                Sig = sig,
            });
            off = o + cb + cbExtra;
        }
        return fonts;
    }
}

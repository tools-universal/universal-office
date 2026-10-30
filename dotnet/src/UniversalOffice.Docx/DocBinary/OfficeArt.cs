using System.IO.Compression;

namespace UniversalOffice.DocBinary;

/// <summary>Propriedade de forma (OfficeArtFOPTE): id de 14 bits + valor de 32 bits.</summary>
internal sealed class OAProp
{
    public int Id;
    /// <summary>Valor u32 (não negativo, como no JS).</summary>
    public long Value;
    public Bytes? Complex;
    public bool Bid;
}

internal sealed class Rect
{
    public int L, T, R, B;
}

internal sealed class OAShape
{
    /// <summary>spid u32 (FSP).</summary>
    public long Spid;
    /// <summary>Tipo msosptXXX (FSP.recInstance).</summary>
    public int Type;
    public long Flags;
    /// <summary>Mapa id → propriedade (ordem de inserção do Map do JS).</summary>
    public Dictionary<int, OAProp> Props = new();
    public Rect? ChildAnchor;
    public Rect? GroupRect;
    public List<OAShape>? Children;
    /// <summary>Posição na ordem de desenho do DgContainer (formas de primeiro nível).</summary>
    public int? Z;

    public long? Pv(int id) => Props.TryGetValue(id, out var p) ? p.Value : null;
}

internal static class FSP
{
    public const long Group = 0x1, Child = 0x2, Patriarch = 0x4, Deleted = 0x8, OleShape = 0x10, HaveMaster = 0x20;
    public const long FlipH = 0x40, FlipV = 0x80, Connector = 0x100, HaveAnchor = 0x200, Background = 0x400, HaveSpt = 0x800;
}

internal sealed class Blip
{
    public string Ext = "";
    public string Mime = "";
    public byte[] Bytes = Array.Empty<byte>();
}

internal sealed class BseEntry
{
    public int BtWin32;
    public long Size;
    public long FoDelay;
    public Rec? Embedded;
}

/// <summary>Orçamento de descompressão de imagens (bombas zlib).</summary>
internal sealed class BlipBudget
{
    public long Left = 512L * 1024 * 1024;
}

/// <summary>
/// Desenhos OfficeArt ([MS-ODRAW]) — porta de officeart.ts: FOPT, árvore de
/// formas, BStore → BSE → BLIP.
/// </summary>
internal static class OfficeArt
{
    private static readonly HashSet<int> MsoArrayProps = new() { 0x145, 0x146, 0x151, 0x152, 0x153, 0x154, 0x155, 0x156, 0x157, 0x197, 0x1cf, 0x383, 0x3a0 };

    public static void ReadFopt(Rec rec, Dictionary<int, OAProp> into)
    {
        var r = rec.R;
        int n = rec.Inst;
        long complexOff = rec.Start + n * 6L;
        for (int i = 0; i < n; i++)
        {
            long o = rec.Start + i * 6L;
            if (o + 6 > rec.End) break;
            int opid = r.U16(o);
            long value = r.U32(o + 2);
            var prop = new OAProp { Id = opid & 0x3fff, Value = value, Bid = (opid & 0x4000) != 0 };
            if ((opid & 0x8000) != 0)
            {
                long size = value;
                if (MsoArrayProps.Contains(prop.Id) && complexOff + 6 <= rec.End)
                {
                    int cb = r.U16(complexOff + 4);
                    if (cb == 0xfff0) cb = 4;
                    long arrSize = 6 + (long)r.U16(complexOff) * cb;
                    if (value == arrSize - 6 && complexOff + arrSize <= rec.End) size = arrSize;
                }
                long len = Math.Max(0, Math.Min(size, rec.End - complexOff));
                prop.Complex = r.Sub(complexOff, complexOff + len);
                complexOff += len;
            }
            // propriedades booleanas: FOPT e TertiaryFOPT da mesma forma se somam bit a bit
            if (into.TryGetValue(prop.Id, out var prev) && prop.Complex is null && IsBooleanProp(prop.Id))
                prop.Value = MergeBooleans(prev.Value, value);
            into[prop.Id] = prop;
        }
    }

    /// <summary>Conjunto de booleanos ([MS-ODRAW] 2.3.*.BooleanProperties): id terminado em 0x3F.</summary>
    public static bool IsBooleanProp(int id) => (id & 0x3f) == 0x3f;

    /// <summary>Sobrepõe `over` a `base` só nos bits cujo fUse* (bit + 16) está ligado em `over`.</summary>
    public static long MergeBooleans(long @base, long over)
    {
        uint use = (uint)((over >> 16) & 0xffff);
        uint mask = use | (use << 16);
        return (uint)(((uint)@base & ~mask) | ((uint)over & mask));
    }

    private static Rect ReadRect(ByteReader r, long o) => new() { L = r.I32(o), T = r.I32(o + 4), R = r.I32(o + 8), B = r.I32(o + 12) };

    public static OAShape ReadSpContainer(Rec rec)
    {
        var shape = new OAShape();
        foreach (var c in Records.Children(rec))
        {
            switch (c.Type)
            {
                case OA.FSP:
                    shape.Type = c.Inst;
                    shape.Spid = c.R.U32(c.Start);
                    shape.Flags = c.R.U32(c.Start + 4);
                    break;
                case OA.FSPGR: shape.GroupRect = ReadRect(c.R, c.Start); break;
                case OA.FOPT:
                case OA.SecondaryFOPT:
                case OA.TertiaryFOPT:
                    ReadFopt(c, shape.Props);
                    break;
                case OA.ChildAnchor: shape.ChildAnchor = ReadRect(c.R, c.Start); break;
            }
        }
        return shape;
    }

    private const int MAX_GROUP_DEPTH = 64;

    public static OAShape ReadSpgrContainer(Rec rec, int depth = 0)
    {
        var kids = Records.Children(rec);
        var first = kids.Count > 0 ? kids[0] : null;
        bool firstIsSp = first is not null && first.Type == OA.SpContainer;
        var group = firstIsSp ? ReadSpContainer(first!) : new OAShape { Flags = FSP.Group };
        group.Children = new List<OAShape>();
        foreach (var c in kids.Skip(firstIsSp ? 1 : 0))
        {
            if (c.Type == OA.SpContainer)
            {
                var s = ReadSpContainer(c);
                if ((s.Flags & FSP.Deleted) == 0) group.Children.Add(s);
            }
            else if (c.Type == OA.SpgrContainer && depth < MAX_GROUP_DEPTH)
            {
                var g = ReadSpgrContainer(c, depth + 1);
                if ((g.Flags & FSP.Deleted) == 0) group.Children.Add(g);
            }
        }
        return group;
    }

    /// <summary>
    /// Indexa por spid as formas de primeiro nível (e grupos) de um DgContainer.
    /// Z = ordem no desenho (de trás para a frente), que é a ordem Z do Word.
    /// </summary>
    public static void IndexDrawing(Rec dg, Dictionary<long, OAShape> into)
    {
        foreach (var c in Records.Children(dg))
        {
            if (c.Type == OA.SpgrContainer)
            {
                var root = ReadSpgrContainer(c);
                foreach (var s in root.Children ?? new List<OAShape>()) { s.Z = into.Count; into[s.Spid] = s; }
            }
            else if (c.Type == OA.SpContainer)
            {
                var s = ReadSpContainer(c);
                s.Z = into.Count;
                into[s.Spid] = s;
            }
        }
    }

    /// <summary>
    /// Formas com mestre (hspMaster, 0x301): herdam as propriedades que não têm
    /// (booleanos bit a bit) e o mestre não é desenhado.
    /// </summary>
    public static void ApplyMasters(Dictionary<long, OAShape> shapes, HashSet<long> masters)
    {
        foreach (var s in shapes.Values)
        {
            long? @ref = s.Pv(0x301);
            OAShape? m = @ref is not null && shapes.TryGetValue(@ref.Value, out var mm) ? mm : null;
            if (m is null || ReferenceEquals(m, s)) continue;
            masters.Add(m.Spid);
            if (s.Type == 0) s.Type = m.Type;
            foreach (var (id, p) in m.Props.ToList())
            {
                if (id == 0x301) continue;
                if (!s.Props.TryGetValue(id, out var own)) s.Props[id] = p;
                else if (IsBooleanProp(id) && own.Complex is null)
                    s.Props[id] = new OAProp { Id = own.Id, Value = MergeBooleans(p.Value, own.Value), Complex = own.Complex, Bid = own.Bid };
            }
        }
    }

    // ───────────────────────────── imagens (BLIP) ─────────────────────────────

    /// <summary>OfficeArtFBSE (registro já lido) → entrada.</summary>
    public static BseEntry ReadFbse(Rec c)
    {
        var r = c.R;
        long o = c.Start;
        int cbName = r.U8(o + 33);
        var e = new BseEntry { BtWin32 = r.U8(o), Size = r.U32(o + 20), FoDelay = r.U32(o + 28) };
        long embOff = o + 36 + cbName;
        if (embOff + 8 <= c.End)
        {
            var emb = Records.ReadRec(r, embOff, c.End);
            if (emb is not null && emb.Type >= 0xf018 && emb.Type <= 0xf117) e.Embedded = emb;
        }
        return e;
    }

    public static List<BseEntry?> ReadBStore(Rec rec) =>
        Records.Children(rec).Select(c => c.Type == OA.FBSE ? ReadFbse(c) : null).ToList();

    private static int BlipUidCount(int type, int inst) => type switch
    {
        OA.BlipEMF => inst == 0x3d5 ? 2 : 1,
        OA.BlipWMF => inst == 0x217 ? 2 : 1,
        OA.BlipPICT => inst == 0x543 ? 2 : 1,
        OA.BlipJPEG or OA.BlipJPEGCMYK => inst == 0x46b || inst == 0x6e3 ? 2 : 1,
        OA.BlipPNG => inst == 0x6e1 ? 2 : 1,
        OA.BlipDIB => inst == 0x7a9 ? 2 : 1,
        OA.BlipTIFF => inst == 0x6e5 ? 2 : 1,
        _ => 1,
    };

    private const long MAX_BLIP = 64L * 1024 * 1024;

    /// <summary>
    /// Inflate com teto (porta do inflateCapped com fflate): zlib = cabeçalho de 2
    /// bytes validado como no Unzlib do fflate + 4 bytes finais descartados sem
    /// conferir o Adler-32; o resto é deflate cru.
    /// </summary>
    private static byte[] InflateCapped(Bytes raw, bool zlib, long max, BlipBudget? budget)
    {
        long limit = Math.Min(max, budget is not null ? budget.Left : max);
        Bytes data = raw;
        if (zlib)
        {
            if (raw.Length < 2) throw new InvalidDataException("invalid zlib data");
            int d0 = raw[0], d1 = raw[1];
            if ((d0 & 15) != 8 || (d0 >> 4) > 7 || (((d0 << 8) | d1) % 31) != 0) throw new InvalidDataException("invalid zlib data");
            if (((d1 >> 5) & 1) == 1) throw new InvalidDataException("invalid zlib data: preset dictionaries not supported");
            data = raw.Sub(2);
            if (data.Length < 4) throw new InvalidDataException("invalid zlib data");
            data = data.Sub(0, data.Length - 4);
        }
        using var ms = new MemoryStream(data.A, data.O, data.N, writable: false);
        using var ds = new DeflateStream(ms, CompressionMode.Decompress);
        var out_ = new MemoryStream();
        var buf = new byte[65536];
        long total = 0;
        int n;
        while ((n = ds.Read(buf, 0, buf.Length)) > 0)
        {
            total += n;
            if (total > limit) throw new InvalidDataException("imagem descomprimida grande demais");
            out_.Write(buf, 0, n);
        }
        if (budget is not null) budget.Left -= total;
        return out_.ToArray();
    }

    /// <summary>Registro de BLIP → bytes do arquivo de imagem.</summary>
    public static Blip? DecodeBlip(Rec rec, BlipBudget? budget)
    {
        var r = rec.R;
        int uids = BlipUidCount(rec.Type, rec.Inst) * 16;
        byte[] Data(long off) => r.Sub(rec.Start + off, rec.End).ToArray();
        switch (rec.Type)
        {
            case OA.BlipPNG: return new Blip { Ext = "png", Mime = "image/png", Bytes = Data(uids + 1) };
            case OA.BlipJPEG:
            case OA.BlipJPEGCMYK: return new Blip { Ext = "jpeg", Mime = "image/jpeg", Bytes = Data(uids + 1) };
            case OA.BlipTIFF: return new Blip { Ext = "tiff", Mime = "image/tiff", Bytes = Data(uids + 1) };
            case OA.BlipDIB: return new Blip { Ext = "bmp", Mime = "image/bmp", Bytes = DibToBmp(Data(uids + 1)) };
            case OA.BlipEMF:
            case OA.BlipWMF:
            case OA.BlipPICT:
            {
                long h = rec.Start + uids;
                long cbSize = r.U32(h);
                int compression = r.U8(h + 32);
                var raw = r.Sub(h + 34, rec.End);
                byte[] bytes;
                if (compression == 0)
                {
                    try { bytes = InflateCapped(raw, true, MAX_BLIP, budget); }
                    catch
                    {
                        try { bytes = InflateCapped(raw, false, MAX_BLIP, budget); }
                        catch { return null; }
                    }
                }
                else bytes = raw.ToArray();
                bytes = cbSize > 0 && cbSize < bytes.Length ? bytes[..(int)cbSize] : bytes;
                if (rec.Type == OA.BlipEMF) return new Blip { Ext = "emf", Mime = "image/x-emf", Bytes = bytes };
                if (rec.Type == OA.BlipWMF)
                {
                    var b = new Rect { L = r.I32(h + 4), T = r.I32(h + 8), R = r.I32(h + 12), B = r.I32(h + 16) };
                    // ptSize (EMU) dá o tamanho físico: unidades lógicas por polegada do cabeçalho placeable
                    int ptX = r.I32(h + 20);
                    double inch = ptX > 0 && b.R > b.L ? Core.JsNumber.Round(((double)(b.R - (long)b.L) * 914400) / ptX) : 1440;
                    return new Blip { Ext = "wmf", Mime = "image/x-wmf", Bytes = WithPlaceableHeader(bytes, b, inch) };
                }
                return new Blip { Ext = "pict", Mime = "image/pict", Bytes = bytes };
            }
        }
        return null;
    }

    private static byte[] DibToBmp(byte[] dib)
    {
        var v = new ByteReader(dib);
        long hdrSize = dib.Length >= 4 ? v.U32(0) : 40;
        int bitCount = dib.Length >= 16 ? v.U16(14) : 24;
        long compression = dib.Length >= 20 ? v.U32(16) : 0;
        long clrUsed = dib.Length >= 36 ? v.U32(32) : 0;
        // `1 << bitCount` do JS (int32)
        if (clrUsed == 0 && bitCount <= 8) clrUsed = 1 << bitCount;
        long masks = compression == 3 && hdrSize == 40 ? 12 : 0;
        long offBits = 14 + hdrSize + masks + clrUsed * 4;
        var out_ = new byte[14 + dib.Length];
        out_[0] = 0x42; out_[1] = 0x4d;
        WriteU32(out_, 2, (uint)out_.Length);
        WriteU32(out_, 10, (uint)(offBits & 0xffffffff));
        Buffer.BlockCopy(dib, 0, out_, 14, dib.Length);
        return out_;
    }

    private static void WriteU32(byte[] b, int off, uint v)
    {
        b[off] = (byte)v; b[off + 1] = (byte)(v >> 8); b[off + 2] = (byte)(v >> 16); b[off + 3] = (byte)(v >> 24);
    }

    private static void WriteU16(byte[] b, int off, int v)
    {
        b[off] = (byte)v; b[off + 1] = (byte)(v >> 8);
    }

    /// <summary>WMF do blip não tem o cabeçalho "placeable" (Aldus): gera um a partir do rcBounds.</summary>
    private static byte[] WithPlaceableHeader(byte[] wmf, Rect b, double inch)
    {
        // já tem cabeçalho placeable?
        if (wmf.Length >= 4 && wmf[0] == 0xd7 && wmf[1] == 0xcd && wmf[2] == 0xc6 && wmf[3] == 0x9a) return wmf;
        var out_ = new byte[22 + wmf.Length];
        WriteU32(out_, 0, 0x9ac6cdd7);
        WriteU16(out_, 6, b.L); WriteU16(out_, 8, b.T); WriteU16(out_, 10, b.R); WriteU16(out_, 12, b.B);
        WriteU16(out_, 14, (int)Math.Max(1, Math.Min(0xffff, inch)));
        int sum = 0;
        for (int i = 0; i < 10; i++) sum ^= out_[i * 2] | (out_[i * 2 + 1] << 8);
        WriteU16(out_, 20, sum);
        Buffer.BlockCopy(wmf, 0, out_, 22, wmf.Length);
        return out_;
    }
}

namespace OfficeNext.DocBinary;

internal sealed class Crop
{
    public double L, T, R, B;
}

internal sealed class HrInfo
{
    public string Align = "center";
    public long? Pct;
    public int? Fill;
    public bool Noshade;
}

internal sealed class PicInfo
{
    public Blip? Blip;
    /// <summary>Tamanho exibido em EMU (pode ser fracionário, como no JS).</summary>
    public double Cx;
    public double Cy;
    public string? Name;
    /// <summary>Corte em frações (0..1) de cada lado.</summary>
    public Crop? Crop;
    /// <summary>Linha horizontal (forma "HR" sem imagem).</summary>
    public HrInfo? Hr;
}

/// <summary>Imagens do .doc — porta de pictures.ts (PICF + BLIP; formas com pib → BStore).</summary>
internal static class Pictures
{
    private const int EMU_PER_TWIP = 635;

    public static PicInfo? ReadInlinePicture(DocReader r, long fc)
    {
        if (r.Data is null) return null;
        var data = r.Data.Value;
        if (fc < 0 || fc + 0x44 > data.Length) return null;
        var d = new ByteReader(data);
        int lcb = d.I32(fc);
        int cbHeader = d.U16(fc + 4);
        if (lcb < cbHeader || cbHeader < 0x44) return null;
        long end = Math.Min(data.Length, fc + lcb);
        int mm = d.I16(fc + 6);
        int dxaGoal = d.I16(fc + 28);
        int dyaGoal = d.I16(fc + 30);
        int mx = d.U16(fc + 32); if (mx == 0) mx = 1000;
        int my = d.U16(fc + 34); if (my == 0) my = 1000;
        int cropL = d.I16(fc + 36), cropT = d.I16(fc + 38), cropR = d.I16(fc + 40), cropB = d.I16(fc + 42);
        long o = fc + cbHeader;
        string? name = null;
        if (mm == 0x66)
        {
            int cch = d.U8(o);
            var sb = new System.Text.StringBuilder();
            for (int i = 0; i < cch; i++) sb.Append((char)d.U8(o + 1 + i));
            name = sb.ToString();
            o += 1 + cch;
        }
        double wTw = ((double)(dxaGoal - cropL - cropR) * mx) / 1000;
        double hTw = ((double)(dyaGoal - cropT - cropB) * my) / 1000;
        var info = new PicInfo { Cx = Math.Max(1, wTw) * EMU_PER_TWIP, Cy = Math.Max(1, hTw) * EMU_PER_TWIP, Name = name };
        // OfficeArtInlineSpContainer: SpContainer + FBSEs
        var recs = Records.RecsIn(d, o, end);
        OAShape? shape = null;
        var bses = new List<Blip>();
        foreach (var rec in recs)
        {
            if (rec.Type == OA.SpContainer && shape is null) shape = OfficeArt.ReadSpContainer(rec);
            else if (rec.Type == OA.FBSE)
            {
                var bse = OfficeArt.ReadFbse(rec);
                Blip? blip = null;
                if (bse.Embedded is not null) blip = OfficeArt.DecodeBlip(bse.Embedded, r.BlipBudget);
                else if (bse.FoDelay != 0 && bse.FoDelay != 0xffffffff) blip = BlipAt(r, r.Word, bse.FoDelay);
                if (blip is not null) bses.Add(blip);
            }
            else if (rec.Type >= 0xf018 && rec.Type <= 0xf117)
            {
                var blip = OfficeArt.DecodeBlip(rec, r.BlipBudget);
                if (blip is not null) bses.Add(blip);
            }
        }
        long pib = shape?.Pv(0x104) ?? 1;
        info.Blip = pib - 1 >= 0 && pib - 1 < bses.Count ? bses[(int)(pib - 1)] : (bses.Count > 0 ? bses[0] : null);
        if (shape is not null)
        {
            double F(int id) => (int)(uint)(shape.Pv(id) ?? 0) / 65536.0;
            var c = new Crop { T = F(0x100), B = F(0x101), L = F(0x102), R = F(0x103) };
            if (c.T != 0 || c.B != 0 || c.L != 0 || c.R != 0) info.Crop = c;
        }
        if (shape is not null && info.Blip is null && (shape.Props.ContainsKey(0x393) || shape.Props.ContainsKey(0x394) || shape.Props.ContainsKey(0x396)))
        {
            long? fill = shape.Pv(0x181);
            long alignIdx = shape.Pv(0x394) ?? 1;
            string[] aligns = { "left", "center", "right" };
            info.Hr = new HrInfo
            {
                Align = alignIdx >= 0 && alignIdx < 3 ? aligns[alignIdx] : "center",
                Pct = shape.Pv(0x393),
                Fill = fill is not null && (fill.Value >> 24) == 0
                    ? (int)(((fill.Value & 0xff) << 16) | (fill.Value & 0xff00) | ((fill.Value >> 16) & 0xff))
                    : null,
                Noshade = true,
            };
        }
        if (info.Crop is null && dxaGoal > 0 && dyaGoal > 0 && (cropL != 0 || cropT != 0 || cropR != 0 || cropB != 0))
        {
            info.Crop = new Crop { L = cropL / (double)dxaGoal, R = cropR / (double)dxaGoal, T = cropT / (double)dyaGoal, B = cropB / (double)dyaGoal };
        }
        return info;
    }

    /// <summary>BLIP gravado diretamente num stream (WordDocument em foDelay).</summary>
    private static Blip? BlipAt(DocReader r, Bytes stream, long off)
    {
        if (off + 8 > stream.Length) return null;
        var rec = Records.ReadRec(new ByteReader(stream), off);
        if (rec is null || rec.Type < 0xf018 || rec.Type > 0xf117) return null;
        return OfficeArt.DecodeBlip(rec, r.BlipBudget);
    }

    /// <summary>Imagem de uma forma flutuante (pib → BStore).</summary>
    public static Blip? ShapeBlip(DocReader r, OAShape shape)
    {
        if (!shape.Props.TryGetValue(0x104, out var pib) || pib.Value == 0) return null;
        var bse = r.Bse(pib.Value);
        if (bse is null) return null;
        if (bse.Embedded is not null) return OfficeArt.DecodeBlip(bse.Embedded, r.BlipBudget);
        if (bse.FoDelay != 0xffffffff) return BlipAt(r, r.Word, bse.FoDelay);
        return null;
    }
}

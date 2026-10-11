namespace OfficeNext.DocBinary;

/// <summary>Listas do .doc → numbering.xml — porta de numbering.ts.</summary>
internal static class Numbering
{
    private static string Hex8(long v) => Xml.Hex((uint)v, 8);

    /// <summary>xst do LVL → w:lvlText ("%1." etc.).</summary>
    public static string LvlText(Lvl lvl)
    {
        var marks = new HashSet<int>(lvl.RgbxchNums);
        var sb = new System.Text.StringBuilder();
        for (int i = 0; i < lvl.Xst.Length; i++)
        {
            int c = lvl.Xst[i];
            if (marks.Contains(i + 1) && c <= 8) sb.Append('%').Append(c + 1);
            else sb.Append(lvl.Xst[i]);
        }
        return sb.ToString();
    }

    private static string LvlXml(Lvl lvl, int ilvl, PropCtx ctx, string? pStyle, long? tplc = null)
    {
        string x = "";
        x += Xml.El("w:start", new Attrs { { "w:val", lvl.Start } });
        x += Xml.El("w:numFmt", new Attrs { { "w:val", OoxmlProps.NumFmtOf(lvl.Nfc) } });
        if (lvl.NoRestart) x += Xml.El("w:lvlRestart", new Attrs { { "w:val", lvl.IlvlRestartLim } });
        if (pStyle is not null) x += Xml.El("w:pStyle", new Attrs { { "w:val", pStyle } });
        if (lvl.Legal) x += "<w:isLgl/>";
        if (lvl.Follow == 1) x += Xml.El("w:suff", new Attrs { { "w:val", "space" } });
        else if (lvl.Follow == 2) x += Xml.El("w:suff", new Attrs { { "w:val", "nothing" } });
        x += Xml.El("w:lvlText", new Attrs { { "w:val", LvlText(lvl) } });
        string[] jcs = { "left", "center", "right" };
        x += Xml.El("w:lvlJc", new Attrs { { "w:val", lvl.Jc >= 0 && lvl.Jc < 3 ? jcs[lvl.Jc] : "left" } });
        var pap = new Pap { Istd = 0 };
        var pt = new HashSet<PapKey>();
        foreach (var p in Sprms.Prls(lvl.GrpprlPapx)) PapApply.Apply(pap, p, pt);
        string ppr = OoxmlProps.PPrInner(pap, pt, ctx, new PPrOpts { WithStyle = false, BaseTabs = new List<TabStop>() });
        if (ppr.Length > 0) x += $"<w:pPr>{ppr}</w:pPr>";
        var chp = new Chp();
        var ct = new HashSet<ChpKey>();
        foreach (var p in Sprms.Prls(lvl.GrpprlChpx)) ChpApply.Apply(chp, p, new ChpCtx { Base = new Chp() }, ct);
        string rpr = OoxmlProps.RPrInner(chp, ct, ctx, false);
        if (rpr.Length > 0) x += $"<w:rPr>{rpr}</w:rPr>";
        return Xml.El("w:lvl", new Attrs
        {
            { "w:ilvl", ilvl },
            { "w:tplc", tplc is not null ? Hex8(tplc.Value) : null },
            { "w:tentative", lvl.Tentative ? "1" : null },
        }, x);
    }

    public static string? Build(DocReader r, PropCtx ctx)
    {
        var lsts = r.Lists.Lsts;
        var lfos = r.Lists.Lfos;
        if (lsts.Count == 0) return null;
        string x = "";
        var absByLsid = new Dictionary<int, int>();
        for (int i = 0; i < lsts.Count; i++)
        {
            var l = lsts[i];
            absByLsid[l.Lsid] = i;
            string c = Xml.El("w:nsid", new Attrs { { "w:val", Hex8(l.Lsid) } });
            c += Xml.El("w:multiLevelType", new Attrs { { "w:val", l.Simple ? "singleLevel" : l.Hybrid ? "hybridMultilevel" : "multilevel" } });
            c += Xml.El("w:tmpl", new Attrs { { "w:val", Hex8(l.Tplc) } });
            for (int k = 0; k < l.Levels.Count; k++)
            {
                int? istd = k < l.RgistdPara.Count ? l.RgistdPara[k] : null;
                string? pStyle = istd is not null && istd != 0x0fff ? ctx.StyleId(istd.Value) : null;
                c += LvlXml(l.Levels[k], k, ctx, pStyle);
            }
            x += Xml.El("w:abstractNum", new Attrs { { "w:abstractNumId", i } }, c);
        }
        for (int i = 0; i < lfos.Count; i++)
        {
            var lfo = lfos[i];
            if (!absByLsid.TryGetValue(lfo.Lsid, out int abs)) continue;
            string c = Xml.El("w:abstractNumId", new Attrs { { "w:val", abs } });
            foreach (var ov in lfo.Overrides)
            {
                string o = "";
                if (ov.StartAt is not null) o += Xml.El("w:startOverride", new Attrs { { "w:val", ov.StartAt } });
                if (ov.Lvl is not null) o += LvlXml(ov.Lvl, ov.Ilvl, ctx, null);
                if (o.Length > 0) c += Xml.El("w:lvlOverride", new Attrs { { "w:ilvl", ov.Ilvl } }, o);
            }
            x += Xml.El("w:num", new Attrs { { "w:numId", i + 1 } }, c);
        }
        return $"{Xml.XML_DECL}<w:numbering xmlns:w=\"{Xml.NS.W}\" xmlns:r=\"{Xml.NS.R}\">{x}</w:numbering>";
    }
}

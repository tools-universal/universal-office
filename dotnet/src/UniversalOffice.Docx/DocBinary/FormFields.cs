namespace UniversalOffice.DocBinary;

/// <summary>
/// Campos de formulário (FORMTEXT / FORMCHECKBOX / FORMDROPDOWN) — porta de
/// formfields.ts: NilPICFAndBinData no Data stream com um FFData → w:ffData.
/// </summary>
internal static class FormFields
{
    /// <summary>Xstz: cch (u16) + caracteres UTF-16 + terminador.</summary>
    private static (string S, long Next) Xstz(ByteReader r, long off)
    {
        int cch = Math.Min(r.U16(off), 0x7fff);
        return (r.Utf16(off + 2, cch), off + 2 + cch * 2 + 2);
    }

    public static string? FfDataXml(Bytes? dataOpt, long fc)
    {
        if (dataOpt is null) return null;
        var data = dataOpt.Value;
        if (fc < 0 || fc + 0x44 + 10 > data.Length) return null;
        var r = new ByteReader(data);
        int lcb = r.I32(fc);
        int cbHeader = r.U16(fc + 4);
        if (cbHeader != 0x44 || lcb < cbHeader) return null;
        long end = Math.Min(data.Length, fc + lcb);
        long o = fc + cbHeader;
        // FFData.version: a spec pede 0xFFFFFFFF, mas há .doc com 0 (medido no Word) — não validar
        int bits = r.U16(o + 4);
        int iType = bits & 3;
        int iRes = (bits >> 2) & 0x1f;
        bool fOwnHelp = (bits & 0x80) != 0;
        bool fOwnStat = (bits & 0x100) != 0;
        bool fProt = (bits & 0x200) != 0;
        bool iSize = (bits & 0x400) != 0;
        int iTypeTxt = (bits >> 11) & 7;
        bool fRecalc = (bits & 0x4000) != 0;
        int cch = r.U16(o + 6);
        int hps = r.U16(o + 8);
        o += 10;
        string Read()
        {
            if (o + 2 > end) return "";
            var x = Xstz(r, o);
            o = x.Next;
            return x.S;
        }
        string name = Read();
        string textDef = "";
        int wDef = 0;
        if (iType == 0) textDef = Read();
        else { wDef = r.U16(o); o += 2; }
        string format = Read();
        string help = Read();
        string stat = Read();
        string entryMcr = Read();
        string exitMcr = Read();
        var entries = new List<string>();
        if (iType == 2 && o + 6 <= end)
        {
            // STTB estendida: fExtend (0xFFFF), cData, cbExtra, entradas cch (u16) + UTF-16
            long p = o;
            if (r.U16(p) == 0xffff) p += 2;
            int n = r.U16(p);
            int cbExtra = r.U16(p + 2);
            p += 4;
            for (int i = 0; i < n && p + 2 <= end; i++)
            {
                int c = r.U16(p);
                entries.Add(r.Utf16(p + 2, c));
                p += 2 + c * 2 + cbExtra;
            }
        }
        string x = Xml.El("w:name", new Attrs { { "w:val", name } });
        if (!fProt) x += "<w:enabled/>";
        x += fRecalc ? "<w:calcOnExit/>" : "<w:calcOnExit w:val=\"0\"/>";
        if (entryMcr.Length > 0) x += Xml.El("w:entryMacro", new Attrs { { "w:val", entryMcr } });
        if (exitMcr.Length > 0) x += Xml.El("w:exitMacro", new Attrs { { "w:val", exitMcr } });
        if (fOwnHelp && help.Length > 0) x += Xml.El("w:helpText", new Attrs { { "w:type", "text" }, { "w:val", help } });
        if (fOwnStat && stat.Length > 0) x += Xml.El("w:statusText", new Attrs { { "w:type", "text" }, { "w:val", stat } });
        if (iType == 1)
        {
            string c = iSize ? Xml.El("w:size", new Attrs { { "w:val", hps } }) : "<w:sizeAuto/>";
            c += Xml.El("w:default", new Attrs { { "w:val", wDef != 0 ? 1 : 0 } });
            if (iRes != 25) c += Xml.El("w:checked", new Attrs { { "w:val", iRes != 0 ? 1 : 0 } });
            x += $"<w:checkBox>{c}</w:checkBox>";
        }
        else if (iType == 2)
        {
            string c = "";
            if (iRes != 0 && iRes != 25) c += Xml.El("w:result", new Attrs { { "w:val", iRes } });
            if (wDef != 0) c += Xml.El("w:default", new Attrs { { "w:val", wDef } });
            foreach (var e in entries) c += Xml.El("w:listEntry", new Attrs { { "w:val", e } });
            x += $"<w:ddList>{c}</w:ddList>";
        }
        else
        {
            string c = "";
            string[] types = { "regular", "number", "date", "currentDate", "currentTime", "calculated" };
            string? type = iTypeTxt < types.Length ? types[iTypeTxt] : null;
            if (type is not null && type != "regular") c += Xml.El("w:type", new Attrs { { "w:val", type } });
            if (textDef.Length > 0) c += Xml.El("w:default", new Attrs { { "w:val", textDef } });
            if (cch != 0) c += Xml.El("w:maxLength", new Attrs { { "w:val", cch } });
            if (format.Length > 0) c += Xml.El("w:format", new Attrs { { "w:val", format } });
            x += c.Length > 0 ? $"<w:textInput>{c}</w:textInput>" : "<w:textInput/>";
        }
        return $"<w:ffData>{x}</w:ffData>";
    }
}

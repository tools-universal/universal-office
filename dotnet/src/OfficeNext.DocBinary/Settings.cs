namespace OfficeNext.DocBinary;

/// <summary>DOP ([MS-DOC] 2.7) lido.</summary>
internal sealed class Dop
{
    public bool FacingPages, MirrorMargins, AutoHyphen, HyphCapitals, RevMarking;
    public int DxaTab, DxaHotZ, CConsecHypLim, Fpc, RncFtn, NFtn, RncEdn, NEdn, Epc, Zoom, Copts60, Copts80hi;
    public uint? Copts, Copts2;
    public bool ProtForms, LockAtn, LockRev, LockAtnReadOnly, StyleLock, EnforceDocProt;
    public int DocProtCur;
    public bool PrintFormData, SaveFormData, ShadeFormData, IncludeSubdocsInStats;
    public bool SnapBorder, IncludeHeader, IncludeFooter;
    public bool KerningPunct;
    public int Justification;
    public (int Xa, int Ya, int Dxa, int Dya, int DyDisplay, int DxDisplay, bool FollowMargins)? Grid;
}

/// <summary>
/// DOP → settings.xml — porta de settings.ts: compatibilityMode 11 e w:compat
/// com as opções do Copts60/Copts80/Copts, bit a bit, na ordem de CT_Compat.
/// </summary>
internal static class Settings
{
    /// <summary>Bit de origem → elemento de w:compat. `Inv`: o elemento é o oposto do bit.</summary>
    private sealed record CompatFlag(string El, string Src, int Bit, bool Inv = false);

    /// <summary>Na ordem de CT_Compat.</summary>
    private static readonly CompatFlag[] Compat =
    {
        new("useSingleBorderforContiguousCells", "c60", 8),
        new("wpJustification", "c80", 14),
        new("noTabHangInd", "c60", 0),
        new("noLeading", "c80", 3),
        new("spaceForUL", "c80", 4, true),
        new("noColumnBalance", "c60", 5),
        new("balanceSingleByteDoubleByteWidth", "c60", 15, true),
        new("noExtraLineSpacing", "c80", 11),
        new("doNotLeaveBackslashAlone", "c60", 12, true),
        new("ulTrailSpace", "c60", 14, true),
        new("doNotExpandShiftReturn", "c60", 13, true),
        new("spacingInWholePoints", "c80", 1),
        new("lineWrapLikeWord6", "c80", 9),
        new("printBodyTextBeforeHeader", "c80", 2),
        new("printColBlack", "c60", 4),
        new("wpSpaceWidth", "c80", 13),
        new("showBreaksInFrames", "c60", 10),
        new("subFontBySize", "c80", 8),
        new("suppressBottomSpacing", "c80", 12),
        new("suppressTopSpacing", "c60", 7),
        new("suppressSpacingAtTopOfPage", "c80", 0),
        new("suppressTopSpacingWP", "c80", 6),
        new("suppressSpBfAfterPgBrk", "c60", 2),
        new("swapBordersFacingPages", "c60", 11),
        new("convMailMergeEsc", "c60", 6),
        new("truncateFontHeightsLikeWP6", "c80", 7),
        new("mwSmallCaps", "c80", 5),
        new("usePrinterMetrics", "c80", 15),
        new("doNotSuppressParagraphBorders", "c80", 10),
        new("wrapTrailSpaces", "c60", 3),
        new("footnoteLayoutLikeWW8", "c", 1),
        new("shapeLayoutLikeWW8", "c", 0),
        new("alignTablesRowByRow", "c", 6),
        new("forgetLastTabAlignment", "c", 4),
        new("adjustLineHeightInTable", "c", 3, true),
        new("autoSpaceLikeWord95", "c", 5),
        new("noSpaceRaiseLower", "c60", 1),
        new("doNotUseHTMLParagraphAutoSpacing", "c", 2),
        new("layoutRawTableWidth", "c", 7),
        new("layoutTableRowsApart", "c", 8),
        new("useWord97LineBreakRules", "c", 9),
        new("doNotBreakWrappedTables", "c", 10),
        new("doNotSnapToGridInCell", "c", 11),
        new("selectFldWithFirstOrLastChar", "c", 12),
        new("applyBreakingRules", "c", 13),
        new("doNotWrapTextWithPunct", "c", 14),
        new("doNotUseEastAsianBreakRules", "c", 15),
        new("useWord2002TableStyleRules", "c", 16),
        new("growAutofit", "c", 17),
        new("useFELayout", "fe", 0),
        new("useNormalStyleForList", "c", 18),
        new("doNotUseIndentAsNumberingTabStop", "c", 19),
        new("useAltKinsokuLineBreakRules", "c", 20),
        new("allowSpaceOfSameStyleInTable", "c", 21),
        new("doNotSuppressIndentation", "c", 22),
        new("doNotAutofitConstrainedTables", "c", 23),
        new("autofitToFirstFixedWidthCell", "c", 24),
        new("underlineTabInNumList", "c", 25),
        new("displayHangulFixedWidth", "c", 26),
        new("splitPgBreakAndParaMark", "c", 27),
        new("doNotVertAlignCellWithSp", "c", 28),
        new("doNotBreakConstrainedForcedTable", "c", 29),
        new("doNotVertAlignInTxbx", "c", 30),
        new("useAnsiKerningPairs", "c", 31),
        new("cachedColBalance", "c2", 0),
    };

    public static Dop ReadDop(Bytes bytes, int nFib = 0x112)
    {
        var r = new ByteReader(bytes);
        int b0 = r.U8(0);
        long f32 = r.U32(4);
        int n = bytes.Length;
        var dop = new Dop
        {
            FacingPages = (b0 & 1) != 0,
            Fpc = (b0 >> 5) & 3,
            RncFtn = r.U16(2) & 3,
            NFtn = r.U16(2) >> 2,
            MirrorMargins = (f32 & (1 << 21)) != 0,
            AutoHyphen = (f32 & (1 << 12)) != 0,
            HyphCapitals = (f32 & (1 << 11)) != 0,
            RevMarking = (f32 & (1 << 15)) != 0,
            Copts60 = r.U16(8),
            DxaTab = r.U16(10) != 0 ? r.U16(10) : 720,
            DxaHotZ = r.U16(14),
            CConsecHypLim = r.U16(16),
            RncEdn = r.U16(52) & 3,
            NEdn = r.U16(52) >> 2,
            Epc = r.U16(54) & 3,
            Zoom = (r.U16(82) >> 3) & 0x1ff,
            Copts80hi = n >= 88 ? r.U16(86) : 0,
            ProtForms = (f32 & (1 << 25)) != 0,
            LockAtn = (f32 & (1 << 20)) != 0,
            LockRev = (f32 & (1 << 30)) != 0,
            // Dop2003 (depois dos 594 bytes do Dop2002): flags A..M em 594, O..T em 598
            LockAtnReadOnly = n >= 600 && (r.U16(594) & 1) != 0,
            StyleLock = n >= 600 && (r.U16(594) & 2) != 0,
            EnforceDocProt = n >= 600 && (r.U16(598) & 8) != 0,
            DocProtCur = n >= 600 ? (r.U16(598) >> 4) & 7 : 7,
            PrintFormData = (r.U16(54) & 0x400) != 0,
            SaveFormData = (r.U16(54) & 0x800) != 0,
            ShadeFormData = (r.U16(54) & 0x1000) != 0,
            IncludeSubdocsInStats = (r.U16(54) & 0x8000) != 0,
            SnapBorder = n >= 412 && (r.U16(410) & 0x800) != 0,
            IncludeHeader = n < 412 || (r.U16(410) & 0x1000) != 0,
            IncludeFooter = n < 412 || (r.U16(410) & 0x2000) != 0,
            KerningPunct = n >= 92 && (r.U16(90) & 1) != 0,
            Justification = n >= 92 ? (r.U16(90) >> 1) & 3 : 0,
        };
        if (n >= 410)
        {
            int g = r.U16(408);
            dop.Grid = (r.U16(400), r.U16(402), r.U16(404), r.U16(406), g & 0x7f, (g >> 8) & 0x7f, (g & 0x8000) != 0);
        }
        // Dop2000+: Copts (32 bytes) em 508 = copts80 repetido + flags (512) + fCachedColBalance (516)
        if (n >= 520)
        {
            dop.Copts = (uint)r.U32(512);
            dop.Copts2 = (uint)r.U32(516);
        }
        // Documento do Word 2000/97: o Word liga as emulações dos recursos posteriores
        if (nFib <= 0xd9) dop.Copts = (dop.Copts ?? 0) | 0xffffdc00;
        // o Word sempre grava w:cachedColBalance ao salvar um .doc como .docx
        dop.Copts2 = (dop.Copts2 ?? 0) | 1;
        return dop;
    }

    /// <summary>Proteção do documento (medido contra o .docx do Word).</summary>
    private static string ProtectionXml(Dop dop)
    {
        string? edit = null;
        bool enforced = true;
        if (dop.LockRev) edit = "trackedChanges";
        else if (dop.LockAtn) edit = dop.LockAtnReadOnly ? "readOnly" : "comments";
        else if (dop.ProtForms) edit = "forms";
        else if (dop.EnforceDocProt)
        {
            string[] kinds = { "trackedChanges", "comments", "forms", "readOnly" };
            edit = dop.DocProtCur < kinds.Length ? kinds[dop.DocProtCur] : null;
            enforced = false;
        }
        if (edit is null && !dop.StyleLock) return "";
        return Xml.El("w:documentProtection", new Attrs
        {
            { "w:edit", edit },
            { "w:formatting", dop.StyleLock ? "1" : null },
            { "w:enforcement", edit is not null ? (enforced ? "1" : "0") : "0" },
        });
    }

    private static string CompatXml(Dop dop, bool feLayout)
    {
        string x = "";
        foreach (var f in Compat)
        {
            bool on;
            if (f.Src == "fe") on = feLayout;
            else if (f.Src == "c60") on = (dop.Copts60 & (1 << f.Bit)) != 0;
            else if (f.Src == "c80") on = (dop.Copts80hi & (1 << f.Bit)) != 0;
            else if (f.Src == "c") { if (dop.Copts is null) continue; on = ((dop.Copts.Value >> f.Bit) & 1) != 0; }
            else { if (dop.Copts2 is null) continue; on = ((dop.Copts2.Value >> f.Bit) & 1) != 0; }
            if (f.Inv) on = !on;
            if (on) x += $"<w:{f.El}/>";
        }
        // .doc abre no modo de compatibilidade do Word 2003
        x += Xml.El("w:compatSetting", new Attrs { { "w:name", "compatibilityMode" }, { "w:uri", "http://schemas.microsoft.com/office/word" }, { "w:val", 11 } });
        return $"<w:compat>{x}</w:compat>";
    }

    public static string Build(DocReader r, bool footnotes, bool endnotes)
    {
        var dop = ReadDop(r.Dop, r.Fib.NFib);
        // useFELayout: o Word liga quando a fonte padrão do Leste Asiático é de um charset CJK
        int ftcFE = r.Stsh.Stshif.FtcFE;
        var fe = ftcFE >= 0 && ftcFE < r.Fonts.Count ? r.Fonts[ftcFE] : null;
        bool feLayout = fe is not null && new[] { 128, 129, 130, 134, 136 }.Contains(fe.Charset);
        string x = "";
        if (dop.Zoom >= 10 && dop.Zoom <= 500) x += Xml.El("w:zoom", new Attrs { { "w:percent", dop.Zoom } });
        if (dop.PrintFormData) x += "<w:printFormsData/>";
        if (dop.SaveFormData) x += "<w:saveFormsData/>";
        if (dop.MirrorMargins) x += "<w:mirrorMargins/>";
        if (dop.SnapBorder) x += "<w:alignBordersAndEdges/>";
        if (!dop.IncludeHeader) x += "<w:bordersDoNotSurroundHeader/>";
        if (!dop.IncludeFooter) x += "<w:bordersDoNotSurroundFooter/>";
        if (dop.RevMarking) x += "<w:trackRevisions/>";
        x += ProtectionXml(dop);
        x += Xml.El("w:defaultTabStop", new Attrs { { "w:val", dop.DxaTab } });
        if (dop.AutoHyphen) x += "<w:autoHyphenation/>";
        if (dop.CConsecHypLim != 0) x += Xml.El("w:consecutiveHyphenLimit", new Attrs { { "w:val", dop.CConsecHypLim } });
        // o Word omite a zona padrão (360 = 0,25")
        if (dop.DxaHotZ != 0 && dop.DxaHotZ != 360) x += Xml.El("w:hyphenationZone", new Attrs { { "w:val", dop.DxaHotZ } });
        if (!dop.HyphCapitals) x += "<w:doNotHyphenateCaps/>";
        if (dop.FacingPages) x += "<w:evenAndOddHeaders/>";
        // grade de desenho: o Word omite os valores padrão (180 twips, exibir a cada 1, origem 1701/1984)
        if (dop.Grid is { } g)
        {
            if (g.Dxa != 180) x += Xml.El("w:drawingGridHorizontalSpacing", new Attrs { { "w:val", g.Dxa } });
            if (g.Dya != 180) x += Xml.El("w:drawingGridVerticalSpacing", new Attrs { { "w:val", g.Dya } });
            if (g.DxDisplay != 1) x += Xml.El("w:displayHorizontalDrawingGridEvery", new Attrs { { "w:val", g.DxDisplay } });
            if (g.DyDisplay != 1) x += Xml.El("w:displayVerticalDrawingGridEvery", new Attrs { { "w:val", g.DyDisplay } });
            if (!g.FollowMargins)
            {
                x += "<w:doNotUseMarginsForDrawingGridOrigin/>";
                if (g.Xa != 1701) x += Xml.El("w:drawingGridHorizontalOrigin", new Attrs { { "w:val", g.Xa } });
                if (g.Ya != 1984) x += Xml.El("w:drawingGridVerticalOrigin", new Attrs { { "w:val", g.Ya } });
            }
        }
        if (!dop.ShadeFormData) x += "<w:doNotShadeFormData/>";
        if (!dop.KerningPunct) x += "<w:noPunctuationKerning/>";
        string[] csc = { "doNotCompress", "compressPunctuation", "compressPunctuationAndJapaneseKana" };
        x += Xml.El("w:characterSpacingControl", new Attrs { { "w:val", dop.Justification < csc.Length ? csc[dop.Justification] : "doNotCompress" } });
        if (footnotes) x += "<w:footnotePr><w:footnote w:id=\"-1\"/><w:footnote w:id=\"0\"/></w:footnotePr>";
        if (endnotes) x += "<w:endnotePr><w:endnote w:id=\"-1\"/><w:endnote w:id=\"0\"/></w:endnotePr>";
        x += CompatXml(dop, feLayout);
        if (!dop.IncludeSubdocsInStats) x += "<w:doNotIncludeSubdocsInStats/>";
        return $"{Xml.XML_DECL}<w:settings{Xml.AttrsXml(new Attrs { { "xmlns:w", Xml.NS.W }, { "xmlns:r", Xml.NS.R }, { "xmlns:m", Xml.NS.M } })}>{x}</w:settings>";
    }
}

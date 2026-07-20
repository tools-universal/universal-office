using OfficeNext.Docx;
using OfficeNext.Pdf;

namespace OfficeNext.Export;

/// <summary>
/// Export PDF do docx — v1 PRAGMÁTICO da spec 07 (o layout completo do write é
/// enorme): parágrafos com quebra por palavra usando métricas TTF (advances
/// hmtx + tabela `kern` legada quando presente — subset do algoritmo breakRich
/// do @wordnext/layout), página e margens do sectPr, bold/italic/size/cor por
/// run (estilos resolvidos de styles.xml), headings, listas com marcador e
/// tabelas como grade simples.
///
/// Divergências conhecidas vs o pipeline canvas do write (documentadas):
/// - kerning: só a tabela `kern` legada (formato 0); GPOS pair adjustment e as
///   tabelas JSON de advances empíricos do layout NÃO são usados;
/// - entrelinha fixa 1.2×sz (o write deriva de hhea + w:spacing w:line);
/// - sem tabs (grade de 708tw), drop caps, colunas múltiplas, headers/footers,
///   footnotes, imagens (runs de imagem são pulados) e sem hifenização;
/// - tabelas: linhas atômicas (não quebram entre páginas), bordas uniformes;
/// - justify ≈ left (como nos exports md/html).
/// </summary>
public static class DocxPdf
{
    private const double LineFactor = 1.2;
    /// <summary>Recuo do marcador de lista à esquerda do texto (0.25" = 18pt).</summary>
    private const double MarkerHang = 18;
    /// <summary>Padding interno de célula de tabela (pt).</summary>
    private const double CellPad = 4;

    private sealed class FontVariant
    {
        public bool Bold;
        public bool Italic;
        public required TtfProgram Program;
        public required EmbeddedFont Embedded;
    }

    private sealed class Ctx
    {
        public required PdfDocument Doc;
        public required Func<bool, bool, FontVariant> Pick;
        public required FullDocument Full;
        public PdfPage Page = null!;
        public double PageW, PageH, MarL, MarR, MarT, MarB;
        public double Y;
        public int[] DecimalCounters = new int[9];

        public double ContentW => PageW - MarL - MarR;
        public double PageBottom => PageH - MarB;

        public void NewPage()
        {
            Page = Doc.AddPage(PageW, PageH);
            Y = MarT;
        }
    }

    /// <summary>Run com propriedades efetivas (estilo + diretas) já resolvidas.</summary>
    private sealed class EffRun
    {
        public string Text = "";
        public double SzPt;
        public bool Bold;
        public bool Italic;
        public bool Underline;
        public string Color = "000000";
    }

    private struct CharInfo
    {
        public int Cp;
        public int RunIndex;
        public double Advance;
        public bool IsGap;     // espaço
        public bool IsBreak;   // \n forçado
    }

    private struct LineInfo
    {
        public int Start;
        public int End;      // exclusivo
        public double Width; // sem gaps finais
    }

    public static byte[] ToPdf(byte[] bytes, List<PdfFontSource> fonts)
    {
        if (fonts is null || fonts.Count == 0)
            throw new ArgumentException("DocxPdf.ToPdf: fonts é obrigatório — o gerador de PDF não tem fontes base-14.");

        var pkg = DocxPackage.Load(bytes);
        var full = FullDocReader.ReadFullDocument(pkg);

        var doc = new PdfDocument();
        var variants = new List<FontVariant>();
        for (int i = 0; i < fonts.Count; i++)
        {
            var f = fonts[i];
            var program = TtfProgram.For(f.Bytes);
            variants.Add(new FontVariant
            {
                Bold = f.Bold,
                Italic = f.Italic,
                Program = program,
                Embedded = doc.EmbedFont(f.Name ?? $"Font{i}", f.Bytes, program),
            });
        }
        FontVariant Pick(bool bold, bool italic) =>
            variants.FirstOrDefault(v => v.Bold == bold && v.Italic == italic)
            ?? variants.FirstOrDefault(v => !v.Bold && !v.Italic)
            ?? variants[0];

        var sect = full.Sections.Count > 0 ? full.Sections[0].SectPr : new SectPr();
        var cx = new Ctx
        {
            Doc = doc,
            Pick = Pick,
            Full = full,
            PageW = sect.PageWidthTwips / 20.0,
            PageH = sect.PageHeightTwips / 20.0,
            MarL = sect.MarginLeftTwips / 20.0,
            MarR = sect.MarginRightTwips / 20.0,
            MarT = sect.MarginTopTwips / 20.0,
            MarB = sect.MarginBottomTwips / 20.0,
        };
        cx.NewPage();

        foreach (var block in full.Blocks)
        {
            if (block is ParagraphBlock pb) RenderParagraph(cx, pb.Paragraph);
            else if (block is TableBlock tb) RenderTable(cx, tb);
        }
        return doc.Build();
    }

    // ─────────────────── propriedades efetivas ───────────────────

    private static ResolvedStyle? StyleOf(Ctx cx, Paragraph p) =>
        p.Props.StyleId is string id && cx.Full.Styles.TryGetValue(id, out var s) ? s : null;

    private static double HeadingDefaultSz(int level) => level switch
    {
        1 => 17,
        2 => 14,
        3 => 13,
        _ => 12,
    };

    private static List<EffRun> EffectiveRuns(Paragraph p, ResolvedStyle? style, int heading)
    {
        double baseSz = style?.Run.SzHalfPt is int shp ? shp / 2.0 : heading > 0 ? HeadingDefaultSz(heading) : 11;
        bool baseBold = style?.Run.Bold ?? heading > 0;
        bool baseItalic = style?.Run.Italic ?? false;
        string baseColor = style?.Run.Color ?? "000000";
        bool baseUnderline = style?.Run.Underline ?? false;

        var outp = new List<EffRun>();
        foreach (var r in p.Runs)
        {
            if (r.Image is not null) continue; // v1: imagens fora do escopo
            string text = r.Text;
            if (text.Length == 0) continue;
            outp.Add(new EffRun
            {
                Text = text,
                SzPt = r.Props.SzHalfPt is int rs ? rs / 2.0 : baseSz,
                Bold = r.Props.Bold || baseBold,
                Italic = r.Props.Italic || baseItalic,
                Underline = r.Props.Underline || baseUnderline,
                Color = r.Props.Color ?? baseColor,
            });
        }
        if (outp.Count == 0)
        {
            outp.Add(new EffRun { Text = "", SzPt = baseSz, Bold = baseBold, Italic = baseItalic, Color = baseColor });
        }
        return outp;
    }

    // ─────────────────── quebra de linha (subset do breakRich) ───────────────────

    private static List<CharInfo> BuildChars(Ctx cx, List<EffRun> runs)
    {
        var chars = new List<CharInfo>();
        for (int ri = 0; ri < runs.Count; ri++)
        {
            var r = runs[ri];
            var v = cx.Pick(r.Bold, r.Italic);
            var prog = v.Program;
            double scale = r.SzPt / prog.UnitsPerEm;
            var cps = CodePointArray(r.Text);
            for (int i = 0; i < cps.Length; i++)
            {
                int cp = cps[i];
                if (cp is '\n' or '\f')
                {
                    chars.Add(new CharInfo { Cp = cp, RunIndex = ri, Advance = 0, IsBreak = true });
                    continue;
                }
                int gid = prog.GlyphId(cp);
                double adv = prog.AdvanceWidth(gid) * scale;
                // kerning do par (ch, próximo) dentro do run — só a tabela kern legada
                if (i + 1 < cps.Length && cp != ' ' && cps[i + 1] != ' ' && cps[i + 1] != '\n' && cps[i + 1] != '\f')
                    adv += prog.KernAdjust(gid, prog.GlyphId(cps[i + 1])) * scale;
                chars.Add(new CharInfo { Cp = cp, RunIndex = ri, Advance = adv, IsGap = cp == ' ' });
            }
        }
        return chars;
    }

    private static int[] CodePointArray(string s)
    {
        var list = new List<int>(s.Length);
        foreach (int cp in XlsxPdf.CodePoints(s)) list.Add(cp);
        return list.ToArray();
    }

    /// <summary>
    /// Greedy: quebra no início da palavra que não coube; espaços finais penduram;
    /// palavra maior que a linha quebra por caractere; \n força quebra.
    /// </summary>
    private static List<LineInfo> BreakLines(List<CharInfo> chars, Func<int, double> availOf)
    {
        var lines = new List<LineInfo>();
        int lineStart = 0;
        double width = 0;      // conteúdo sem gaps finais
        double pendingGap = 0; // gaps desde a última palavra
        int i = 0;

        while (i < chars.Count)
        {
            var c = chars[i];
            if (c.IsBreak)
            {
                lines.Add(new LineInfo { Start = lineStart, End = i + 1, Width = width + pendingGap });
                lineStart = i + 1;
                width = 0;
                pendingGap = 0;
                i++;
                continue;
            }
            if (c.IsGap)
            {
                pendingGap += c.Advance;
                i++;
                continue;
            }
            int wordStart = i;
            double wordWidth = 0;
            while (i < chars.Count && !chars[i].IsGap && !chars[i].IsBreak)
            {
                wordWidth += chars[i].Advance;
                i++;
            }
            double avail = availOf(lines.Count);
            if (wordStart > lineStart && width + pendingGap + wordWidth > avail)
            {
                lines.Add(new LineInfo { Start = lineStart, End = wordStart, Width = width });
                lineStart = wordStart;
                pendingGap = 0;
                width = Emergency(chars, wordStart, i, availOf, lines, s => lineStart = s, wordWidth);
            }
            else if (wordStart == lineStart && wordWidth > avail)
            {
                width = Emergency(chars, wordStart, i, availOf, lines, s => lineStart = s, wordWidth);
                pendingGap = 0;
            }
            else
            {
                width += pendingGap + wordWidth;
                pendingGap = 0;
            }
        }
        if (lineStart < chars.Count || lines.Count == 0)
            lines.Add(new LineInfo { Start = lineStart, End = chars.Count, Width = width });
        return lines;
    }

    /// <summary>Palavra-gigante: quebra por caractere.</summary>
    private static double Emergency(
        List<CharInfo> chars, int wordStart, int wordEnd,
        Func<int, double> availOf, List<LineInfo> lines, Action<int> setLineStart, double initialWidth)
    {
        if (initialWidth <= availOf(lines.Count)) return initialWidth;
        int start = wordStart;
        double w = 0;
        for (int k = wordStart; k < wordEnd; k++)
        {
            double a = chars[k].Advance;
            if (w + a > availOf(lines.Count) && k > start)
            {
                lines.Add(new LineInfo { Start = start, End = k, Width = w });
                start = k;
                w = a;
            }
            else w += a;
        }
        setLineStart(start);
        return w;
    }

    // ─────────────────── parágrafo ───────────────────

    private static void RenderParagraph(Ctx cx, Paragraph p)
    {
        var style = StyleOf(cx, p);
        int heading = DocxExportModel.HeadingLevel(p);
        var runs = EffectiveRuns(p, style, heading);

        bool pageBreakBefore = p.Props.PageBreakBefore || (style?.Para.PageBreakBefore ?? false);
        if (pageBreakBefore && cx.Y > cx.MarT) cx.NewPage();

        double spaceBefore = (p.Props.SpaceBeforeTwips ?? style?.Para.SpaceBeforeTwips ?? 0) / 20.0;
        double spaceAfter = (p.Props.SpaceAfterTwips ?? style?.Para.SpaceAfterTwips ?? 0) / 20.0;
        string align = p.Props.Alignment ?? style?.Para.Alignment ?? "left";

        var num = p.Props.Numbering;
        int ilvl = Math.Min(num?.Ilvl ?? 0, 8);
        double indentLeft = (p.Props.IndentLeftTwips ?? style?.Para.IndentLeftTwips
            ?? (num is not null ? 720 * (ilvl + 1) : 0)) / 20.0;
        double firstLine = (p.Props.IndentFirstLineTwips ?? 0) / 20.0;

        string? marker = null;
        if (num is not null)
        {
            if (num.Kind == "decimal")
            {
                for (int l = ilvl + 1; l < 9; l++) cx.DecimalCounters[l] = 0;
                cx.DecimalCounters[ilvl]++;
                marker = $"{cx.DecimalCounters[ilvl]}.";
            }
            else marker = "•";
        }

        cx.Y += spaceBefore;
        LayoutParagraph(cx, runs, marker, align,
            x0: cx.MarL, availTotal: cx.ContentW,
            indentLeft, firstLine, paginate: true, draw: true, yStart: 0, out _);
        cx.Y += spaceAfter;
    }

    /// <summary>
    /// Layout + desenho de um parágrafo numa coluna. Quando paginate=true usa o
    /// fluxo da página (cx.Y, quebra de página); senão (célula de tabela) opera
    /// de yStart sem quebra e devolve a altura em outHeight.
    /// </summary>
    private static void LayoutParagraph(
        Ctx cx, List<EffRun> runs, string? marker, string align,
        double x0, double availTotal, double indentLeft, double firstLine,
        bool paginate, bool draw, double yStart, out double outHeight)
    {
        var chars = BuildChars(cx, runs);
        double AvailOf(int lineIdx) =>
            Math.Max(1, availTotal - indentLeft - (lineIdx == 0 ? Math.Max(0, firstLine) : 0));
        var lines = BreakLines(chars, AvailOf);

        var regular = cx.Pick(false, false).Program;
        double localY = yStart;
        outHeight = 0;

        for (int li = 0; li < lines.Count; li++)
        {
            var line = lines[li];
            double maxSz = 0;
            for (int k = line.Start; k < line.End; k++)
            {
                if (chars[k].IsBreak) continue;
                maxSz = Math.Max(maxSz, runs[chars[k].RunIndex].SzPt);
            }
            if (maxSz == 0) maxSz = runs[0].SzPt;
            double lineH = maxSz * LineFactor;
            double asc = (double)regular.AscenderVal / regular.UnitsPerEm * maxSz;

            double lineTop;
            if (paginate)
            {
                if (cx.Y + lineH > cx.PageBottom && cx.Y > cx.MarT) cx.NewPage();
                lineTop = cx.Y;
            }
            else
            {
                lineTop = localY;
            }
            double baseline = lineTop + asc;

            if (draw)
            {
                double startX = x0 + indentLeft + (li == 0 ? Math.Max(0, firstLine) : 0);
                // alinhamento (justify ≈ left)
                double avail = AvailOf(li);
                double dx = align switch
                {
                    "center" => Math.Max(0, (avail - line.Width) / 2),
                    "right" => Math.Max(0, avail - line.Width),
                    _ => 0,
                };
                double penX = startX + dx;

                // marcador da lista na primeira linha, pendurado à esquerda
                if (li == 0 && marker is not null)
                {
                    var v0 = cx.Pick(runs[0].Bold, runs[0].Italic);
                    DrawText(cx, v0, runs[0].SzPt, runs[0].Color, x0 + indentLeft - MarkerHang, baseline, marker);
                }

                // segmentos contíguos do mesmo run
                int segStart = line.Start;
                for (int k = line.Start; k <= line.End; k++)
                {
                    bool boundary = k == line.End || chars[k].IsBreak
                        || chars[k].RunIndex != chars[segStart].RunIndex;
                    if (boundary && k > segStart)
                    {
                        var r = runs[chars[segStart].RunIndex];
                        var v = cx.Pick(r.Bold, r.Italic);
                        double segX = penX;
                        var glyphs = new List<PlacedGlyph>();
                        for (int m = segStart; m < k; m++)
                        {
                            var ci = chars[m];
                            if (!ci.IsBreak)
                            {
                                glyphs.Add(new PlacedGlyph
                                {
                                    Gid = v.Program.GlyphId(ci.Cp), CodePoint = ci.Cp,
                                    XPt = penX, BaselineFromTopPt = baseline,
                                });
                                v.Embedded.Encode(ci.Cp);
                                penX += ci.Advance;
                            }
                        }
                        if (glyphs.Count > 0)
                            cx.Page.Glyphs(v.Embedded, r.SzPt, PdfColor.Hex(r.Color), glyphs);
                        if (r.Underline && penX > segX)
                            cx.Page.Line(segX, baseline + r.SzPt * 0.12, penX, baseline + r.SzPt * 0.12,
                                PdfColor.Hex(r.Color), Math.Max(0.5, r.SzPt / 16));
                        segStart = k;
                    }
                    if (k < line.End && chars[k].IsBreak) segStart = k + 1;
                }
            }

            if (paginate) cx.Y += lineH;
            else localY += lineH;
            outHeight += lineH;
        }
    }

    private static void DrawText(Ctx cx, FontVariant v, double szPt, string color, double x, double baseline, string text)
    {
        var glyphs = new List<PlacedGlyph>();
        double pen = x;
        double scale = szPt / v.Program.UnitsPerEm;
        foreach (int cp in XlsxPdf.CodePoints(text))
        {
            var (gid, adv) = v.Embedded.Encode(cp);
            glyphs.Add(new PlacedGlyph { Gid = gid, CodePoint = cp, XPt = pen, BaselineFromTopPt = baseline });
            pen += adv * scale;
        }
        if (glyphs.Count > 0) cx.Page.Glyphs(v.Embedded, szPt, PdfColor.Hex(color), glyphs);
    }

    // ─────────────────── tabela ───────────────────

    private static void RenderTable(Ctx cx, TableBlock t)
    {
        if (t.Rows.Count == 0) return;
        int nCols = t.GridColsTwips.Count > 0
            ? t.GridColsTwips.Count
            : t.Rows.Max(r => r.Cells.Sum(c => Math.Max(1, c.GridSpan)));
        if (nCols == 0) return;

        var colsPt = t.GridColsTwips.Count > 0
            ? t.GridColsTwips.Select(tw => tw / 20.0).ToArray()
            : Enumerable.Repeat(cx.ContentW / nCols, nCols).ToArray();
        double totalW = colsPt.Sum();
        if (totalW > cx.ContentW && totalW > 0)
        {
            double f = cx.ContentW / totalW;
            for (int i = 0; i < colsPt.Length; i++) colsPt[i] *= f;
            totalW = cx.ContentW;
        }
        var colX = new double[colsPt.Length + 1];
        colX[0] = cx.MarL;
        for (int i = 0; i < colsPt.Length; i++) colX[i + 1] = colX[i] + colsPt[i];

        var borderColor = PdfColor.Hex("#808080");

        foreach (var row in t.Rows)
        {
            // 1º passo: altura da linha = max altura de célula (medição sem desenho)
            double rowH = 0;
            int col = 0;
            var cellSpans = new List<(TableCell Cell, int C0, int Span)>();
            foreach (var cell in row.Cells)
            {
                int span = Math.Max(1, cell.GridSpan);
                if (col + span > colsPt.Length) span = Math.Max(1, colsPt.Length - col);
                cellSpans.Add((cell, col, span));
                double cellW = colX[Math.Min(col + span, colX.Length - 1)] - colX[col] - 2 * CellPad;
                double h = MeasureCell(cx, cell, cellW);
                rowH = Math.Max(rowH, h + 2 * CellPad);
                col += span;
            }
            if (rowH == 0) rowH = 2 * CellPad + 11 * LineFactor;

            // linha atômica: se não cabe, vai para a próxima página
            if (cx.Y + rowH > cx.PageBottom && cx.Y > cx.MarT) cx.NewPage();
            double rowTop = cx.Y;

            // 2º passo: desenho
            foreach (var (cell, c0, span) in cellSpans)
            {
                double xL = colX[c0];
                double xR = colX[Math.Min(c0 + span, colX.Length - 1)];
                if (cell.ShadingHex is string shade)
                    cx.Page.FillRect(xL, rowTop, xR - xL, rowH, PdfColor.Hex(shade));
                // bordas uniformes (grade simples)
                cx.Page.Line(xL, rowTop, xR, rowTop, borderColor, 0.5);
                cx.Page.Line(xL, rowTop + rowH, xR, rowTop + rowH, borderColor, 0.5);
                cx.Page.Line(xL, rowTop, xL, rowTop + rowH, borderColor, 0.5);
                cx.Page.Line(xR, rowTop, xR, rowTop + rowH, borderColor, 0.5);
                DrawCell(cx, cell, xL + CellPad, rowTop + CellPad, xR - xL - 2 * CellPad);
            }
            cx.Y = rowTop + rowH;
        }
    }

    private static double MeasureCell(Ctx cx, TableCell cell, double cellW)
    {
        double h = 0;
        foreach (var p in cell.Paragraphs)
        {
            var style = StyleOf(cx, p);
            int heading = DocxExportModel.HeadingLevel(p);
            var runs = EffectiveRuns(p, style, heading);
            LayoutParagraph(cx, runs, null, "left", 0, Math.Max(1, cellW), 0, 0,
                paginate: false, draw: false, yStart: 0, out double ph);
            h += ph;
        }
        return h;
    }

    private static void DrawCell(Ctx cx, TableCell cell, double x, double yTop, double cellW)
    {
        double y = yTop;
        foreach (var p in cell.Paragraphs)
        {
            var style = StyleOf(cx, p);
            int heading = DocxExportModel.HeadingLevel(p);
            var runs = EffectiveRuns(p, style, heading);
            string align = p.Props.Alignment ?? style?.Para.Alignment ?? "left";
            LayoutParagraph(cx, runs, null, align, x, Math.Max(1, cellW), 0, 0,
                paginate: false, draw: true, yStart: y, out double ph);
            y += ph;
        }
    }
}

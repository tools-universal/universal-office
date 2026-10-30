using UniversalOffice.Pdf;
using UniversalOffice.Xlsx;

namespace UniversalOffice.Export;

public sealed class SheetPdfOptions : SheetExportOptions
{
    /// <summary>OBRIGATÓRIO: fontes TTF (não há base-14 no gerador).</summary>
    public List<PdfFontSource>? Fonts;
    /// <summary>Margem da página em pontos. Default 36 (0,5").</summary>
    public double MarginPt = 36;
}

/// <summary>
/// Export PDF do xlsx — porta de sheet/packages/sheet-core/src/export/pdf.ts: grid da
/// planilha paginado em A4 (retrato/paisagem automático), larguras de coluna
/// pela fórmula MDW→pt, alturas de linha em pt, texto com alinhamento General,
/// fills sólidos e bordas retas. Quebra de página por LINHAS; linhas/colunas
/// ocultas não saem.
/// </summary>
public static class XlsxPdf
{
    /// <summary>A4 em pontos (210 × 297 mm).</summary>
    private const double A4W = 595.276;
    private const double A4H = 841.89;
    /// <summary>Margem interna horizontal da célula (~3px do Excel).</summary>
    private const double CellPad = 2.25;
    /// <summary>Folga vertical do texto (bottom-align do Excel).</summary>
    private const double CellVPad = 1.5;

    private sealed class FontVariant
    {
        public bool Bold;
        public bool Italic;
        public required TtfProgram Program;
        public required EmbeddedFont Embedded;
    }

    /// <summary>Espessura em pt e tracejado por estilo de borda OOXML.</summary>
    private static (double Width, double[]? Dash) BorderStroke(BorderEdge edge) => edge.Style switch
    {
        "hair" => (0.5, null),
        "dotted" => (0.75, new[] { 1.0, 1.0 }),
        "dashed" or "dashDot" or "dashDotDot" => (0.75, new[] { 3.0, 2.0 }),
        "medium" => (1.5, null),
        "mediumDashed" or "mediumDashDot" or "mediumDashDotDot" or "slantDashDot" => (1.5, new[] { 3.0, 2.0 }),
        "thick" => (2.25, null),
        "double" => (2.25, null), // aproximação: linha única grossa
        _ => (0.75, null), // thin
    };

    internal static IEnumerable<int> CodePoints(string text)
    {
        for (int i = 0; i < text.Length; i++)
        {
            int cp = text[i];
            if (char.IsHighSurrogate(text[i]) && i + 1 < text.Length && char.IsLowSurrogate(text[i + 1]))
            {
                cp = char.ConvertToUtf32(text[i], text[i + 1]);
                i++;
            }
            yield return cp;
        }
    }

    /// <summary>Largura de um texto em pt para uma fonte/tamanho (loop inline: hot path).</summary>
    private static double TextWidthPt(string text, TtfProgram program, double sizePt)
    {
        long units = 0;
        for (int i = 0; i < text.Length; i++)
        {
            int cp = text[i];
            if (char.IsHighSurrogate(text[i]) && i + 1 < text.Length && char.IsLowSurrogate(text[i + 1]))
            {
                cp = char.ConvertToUtf32(text[i], text[i + 1]);
                i++;
            }
            units += program.AdvanceWidth(program.GlyphId(cp));
        }
        return units * sizePt / program.UnitsPerEm;
    }

    /// <summary>Exporta para PDF. Default: todas as planilhas visíveis, cada uma em página nova.</summary>
    public static byte[] ToPdf(byte[] bytes, SheetPdfOptions? opts = null)
    {
        opts ??= new SheetPdfOptions();
        var fonts = opts.Fonts;
        if (fonts is null || fonts.Count == 0)
            throw new ArgumentException(
                "XlsxPdf.ToPdf: opts.Fonts é obrigatório — o gerador de PDF não tem fontes base-14. " +
                "Passe ao menos uma TTF (ex.: Aptos Narrow regular; ideal: regular/bold/italic/bold-italic).");

        var model = SheetModelOps.LoadModel(bytes);
        var loc = opts.Locale ?? Format.PtBr;
        double margin = opts.MarginPt;

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

        var refs = SheetModelOps.SelectSheetRefs(model, opts, "all");
        // hot path: leitura do sheetData + grid + desenho são independentes por
        // planilha (Encode das fontes é concorrente); páginas anexadas em ordem
        // determinística ao final
        var perSheet = new List<PdfPage>[refs.Count];
        void One(int i) =>
            perSheet[i] = RenderSheet(model, SheetModelOps.ReadSelected(model, refs[i]), loc, margin, Pick);
        if (refs.Count > 1) Parallel.For(0, refs.Count, One);
        else for (int i = 0; i < refs.Count; i++) One(i);
        foreach (var pages in perSheet)
            foreach (var page in pages) doc.AddPage(page);
        return doc.Build();
    }

    private static List<PdfPage> RenderSheet(
        SheetModel model, SelectedSheet sel, FormatLocale loc,
        double margin, Func<bool, bool, FontVariant> pick)
    {
        var outPages = new List<PdfPage>();
        var grid = SheetModelOps.BuildGrid(model, sel, loc);
        if (grid.RowCount == 0 || grid.ColCount == 0) return outPages; // planilha vazia: sem página

        // métricas: MDW px → pt (×72/96); ocultas têm largura/participação zero
        var widthsPt = SheetModelOps.ColWidthsPx(grid.Ws, grid.ColCount).Select(px => px * 72.0 / 96).ToArray();
        var hidCols = SheetModelOps.HiddenCols(grid.Ws, grid.ColCount);
        foreach (int c in hidCols) widthsPt[c - 1] = 0;
        var heights = SheetModelOps.RowHeightsPt(grid.Ws, grid.RowCount);
        var hidRows = SheetModelOps.HiddenRows(grid.Ws);

        // orientação automática: paisagem quando o grid não cabe no retrato
        double totalW = widthsPt.Sum();
        bool landscape = totalW > A4W - 2 * margin;
        double pageW = landscape ? A4H : A4W;
        double pageH = landscape ? A4W : A4H;
        double contentH = pageH - 2 * margin;

        // x acumulado: xs[c-1] = borda esquerda da coluna c; xs[c] = direita
        var xs = new double[grid.ColCount + 1];
        xs[0] = margin;
        for (int c = 1; c <= grid.ColCount; c++) xs[c] = xs[c - 1] + widthsPt[c - 1];

        // paginação por linhas (visíveis), greedy — ao menos 1 linha por página
        var pagesRows = new List<List<int>>();
        var cur = new List<int>();
        double used = 0;
        for (int r = 1; r <= grid.RowCount; r++)
        {
            if (hidRows.Contains(r)) continue;
            double h = heights[r - 1];
            if (cur.Count > 0 && used + h > contentH) { pagesRows.Add(cur); cur = new List<int>(); used = 0; }
            cur.Add(r);
            used += h;
        }
        if (cur.Count > 0) pagesRows.Add(cur);

        foreach (var rows in pagesRows)
        {
            var page = new PdfPage(pageW, pageH);
            outPages.Add(page);
            DrawPage(page, model, grid, rows, xs, widthsPt, heights, hidCols, margin, pageH, pick);
        }
        return outPages;
    }

    private sealed class CellBox
    {
        public int R, C;
        public double X, Y, W, H;
        public int? Xf;
        public string Text = "";
        public string? Color;
        public bool Numeric;
        public bool Merged;
    }

    private static void DrawPage(
        PdfPage page, SheetModel model, SheetGrid grid, List<int> rows,
        double[] xs, double[] widthsPt, double[] heights, HashSet<int> hidCols,
        double margin, double pageH, Func<bool, bool, FontVariant> pick)
    {
        var styles = model.Styles;
        double pageBottom = pageH - margin;

        // yTop por linha desta página
        var yOf = new Dictionary<int, double>();
        double y = margin;
        foreach (int r in rows) { yOf[r] = y; y += heights[r - 1]; }

        var boxes = new List<CellBox>();
        foreach (int r in rows)
        {
            for (int c = 1; c <= grid.ColCount; c++)
            {
                if (hidCols.Contains(c)) continue;
                var merge = grid.MergeAt(r, c);
                // absorvidas: só o topo-esquerdo desenha (merge iniciando em página
                // anterior fica em branco aqui — aceitável no v1)
                if (merge is not null && (merge.R0 != r || merge.C0 != c)) continue;
                var gc = grid.Cells[r - 1][c - 1];
                double x = xs[c - 1];
                double w = widthsPt[c - 1];
                double h = heights[r - 1];
                if (merge is not null)
                {
                    w = xs[merge.C1] - xs[merge.C0 - 1];
                    h = 0;
                    for (int rr = merge.R0; rr <= merge.R1; rr++) h += heights[rr - 1];
                    h = Math.Min(h, pageBottom - yOf[r]); // não vaza da página
                }
                if (w <= 0 || h <= 0) continue;
                boxes.Add(new CellBox
                {
                    R = r, C = c, X = x, Y = yOf[r], W = w, H = h,
                    Xf = gc?.Xf, Text = gc?.Text ?? "", Color = gc?.Color, Numeric = gc?.Numeric ?? false,
                    Merged = merge is not null,
                });
            }
        }

        CellXf? XfOf(CellBox b) =>
            b.Xf is int xf && xf >= 0 && xf < styles.CellXfs.Count ? styles.CellXfs[xf] : null;

        // passo 1: fills
        foreach (var b in boxes)
        {
            var xf = XfOf(b);
            string? bg = SheetModelOps.FillColor(xf is not null && xf.FillId < styles.Fills.Count ? styles.Fills[xf.FillId] : null);
            if (bg is not null) page.FillRect(b.X, b.Y, b.W, b.H, PdfColor.Hex(bg));
        }

        // passo 2: bordas
        foreach (var b in boxes)
        {
            var xf = XfOf(b);
            var border = xf is not null && xf.BorderId < styles.Borders.Count ? styles.Borders[xf.BorderId] : null;
            if (border is null) continue;
            void Edge(BorderEdge? e, double x0, double y0, double x1, double y1)
            {
                if (e is null) return;
                var (width, dash) = BorderStroke(e);
                page.Line(x0, y0, x1, y1, PdfColor.Hex(e.Color ?? "#000000"), width, dash);
            }
            Edge(border.Top, b.X, b.Y, b.X + b.W, b.Y);
            Edge(border.Bottom, b.X, b.Y + b.H, b.X + b.W, b.Y + b.H);
            Edge(border.Left, b.X, b.Y, b.X, b.Y + b.H);
            Edge(border.Right, b.X + b.W, b.Y, b.X + b.W, b.Y + b.H);
        }

        // passo 3: texto
        foreach (var b in boxes)
        {
            if (b.Text.Length == 0) continue;
            var xf = XfOf(b);
            Font? font = xf is not null && xf.FontId >= 0 && xf.FontId < styles.Fonts.Count ? styles.Fonts[xf.FontId] : null;
            var variant = pick(font?.Bold ?? false, font?.Italic ?? false);
            double size = font?.Size ?? 11;
            // cor do numFmt ([Red]) tem prioridade sobre a cor da fonte
            var color = PdfColor.Hex(b.Color ?? font?.Color ?? "#000000");
            // só a primeira linha do texto (sem wrap no v1)
            string text = FirstLine(b.Text);
            double textW = TextWidthPt(text, variant.Program, size);

            // número que não cabe vira "####" (como o Excel) — dígitos truncados enganam
            if (b.Numeric && textW > b.W - 2 * CellPad)
            {
                double hashW = TextWidthPt("#", variant.Program, size);
                int n = (int)Math.Floor((b.W - 2 * CellPad) / hashW);
                if (n <= 0) continue;
                text = new string('#', n);
                textW = hashW * n;
            }

            // alinhamento: explícito do xf; General alinha números/datas à direita
            string? ha = xf?.Horizontal;
            if (ha is "general" or "fill") ha = null;
            if (ha == "centerContinuous") ha = "center";
            ha ??= b.Numeric ? "right" : "left";

            double startX = ha switch
            {
                "right" => b.X + b.W - CellPad - textW,
                "center" => b.X + (b.W - textW) / 2,
                _ => b.X + CellPad,
            };

            // texto à esquerda transborda sobre células vazias seguintes (como o Excel)
            double clipRight = b.X + b.W - CellPad;
            if (ha == "left" && !b.Merged && textW > b.W - 2 * CellPad)
            {
                int cc = b.C + 1;
                while (cc <= grid.ColCount)
                {
                    var next = grid.Cells[b.R - 1][cc - 1];
                    if ((next is not null && next.Text.Length > 0) || grid.MergeAt(b.R, cc) is not null) break;
                    clipRight = xs[cc];
                    cc++;
                }
            }
            double clipLeft = ha == "left" ? b.X : b.X - 0.01; // à direita/centro: clipe no próprio retângulo
            // baseline: bottom-align do Excel (vertical center/top quando pedido)
            double upem = variant.Program.UnitsPerEm;
            double ascPt = variant.Program.AscenderVal / upem * size;
            double descPt = -variant.Program.DescenderVal / upem * size;
            double baseline = xf?.Vertical switch
            {
                "top" => b.Y + CellVPad + ascPt,
                "center" => b.Y + (b.H - ascPt - descPt) / 2 + ascPt,
                _ => b.Y + b.H - CellVPad - descPt,
            };

            var glyphs = new List<PlacedGlyph>(text.Length);
            double penX = startX;
            for (int i = 0; i < text.Length; i++)
            {
                int cp = text[i];
                if (char.IsHighSurrogate(text[i]) && i + 1 < text.Length && char.IsLowSurrogate(text[i + 1]))
                {
                    cp = char.ConvertToUtf32(text[i], text[i + 1]);
                    i++;
                }
                var (gid, advanceWidth) = variant.Embedded.Encode(cp);
                double adv = advanceWidth * size / upem;
                if (penX >= clipLeft && penX + adv <= clipRight + 0.01)
                    glyphs.Add(new PlacedGlyph { Gid = gid, CodePoint = cp, XPt = penX, BaselineFromTopPt = baseline });
                penX += adv;
            }
            if (glyphs.Count > 0) page.Glyphs(variant.Embedded, size, color, glyphs);
        }
    }

    /// <summary>Primeira linha do texto (split /\r\n|\r|\n/, 1).</summary>
    private static string FirstLine(string text)
    {
        int i = text.IndexOfAny(new[] { '\r', '\n' });
        return i < 0 ? text : text[..i];
    }
}

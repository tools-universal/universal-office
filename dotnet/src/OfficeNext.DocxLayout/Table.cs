using System.Globalization;
using System.Text.RegularExpressions;
using OfficeNext.Docx;

namespace OfficeNext.DocxLayout;

/// <summary>
/// Tabela (porta de docx-layout/src/table.ts): grade de colunas, margens de
/// célula, cascata do estilo de tabela (incl. formatação condicional por
/// posição), bordas, sombreamento, altura de linha (trHeight), mesclas
/// horizontais/verticais e alinhamento vertical. O conteúdo das células é
/// diagramado pelo `layoutCell` injetado (fluxo estático do motor), que
/// devolve itens relativos ao topo da célula.
/// </summary>
public sealed class CellContent
{
    public List<PageItem> Items = new();
    public List<LaidOutLine> Lines = new();
    public double Height;
    /// <summary>algum parágrafo do conteúdo tem "manter com o próximo"</summary>
    public bool KeepNext;
}

/// <summary>Ambiente de uma célula: pPr/rPr do estilo de tabela e fundo escuro.</summary>
public sealed class CellEnv
{
    public PPr? TablePPr;
    public RPr? TableRPr;
    public bool DarkBackground;
}

/// <summary>(célula, x, largura, ambiente, ref) → conteúdo.</summary>
public delegate CellContent CellLayouter(TableCell cell, double x, double width, CellEnv env, string reference);

public sealed class RowLayout
{
    /// <summary>altura da linha (twips)</summary>
    public double Height;
    /// <summary>itens relativos ao TOPO da linha (y=0)</summary>
    public List<PageItem> Items = new();
    public List<LaidOutLine> Lines = new();
    public bool CantSplit;
    public bool Header;
    /// <summary>a linha fica com a seguinte (parágrafo keepNext em alguma célula)</summary>
    public bool KeepNext;
    /// <summary>altura só do conteúdo (sem a altura mínima trHeight): se couber e só a
    /// mínima não couber, o Word leva a linha inteira (não divide)</summary>
    public double? Natural;
    /// <summary>itens de bordas desenhados por cima</summary>
    public List<PageItem> BorderItems = new();
    /// <summary>borda inferior desenhada só se a página quebrar logo após esta linha</summary>
    public List<PageItem>? BreakBorderItems;
    /// <summary>divide a linha para caber em `avail` (twips): [parte que cabe, resto]
    /// — nulo se nenhuma linha de texto cabe (a linha inteira desce).</summary>
    public Func<double, (RowLayout First, RowLayout Remainder)?>? Split;
}

public sealed class TableLayout
{
    public double X;
    public double Width;
    public List<RowLayout> Rows = new();
    /// <summary>espessura da borda esquerda da 1ª célula (twips)</summary>
    public double? BorderLeft;
    /// <summary>propriedades de fluxo</summary>
    public TblpPr? TblpPr;
}

public static class TableEngine
{
    /// <summary>Parte um conteúdo de célula num corte vertical (fim da última linha que cabe).</summary>
    public static (CellContent A, CellContent B)? SplitContent(CellContent c, double availContent)
    {
        double cut = 0;
        foreach (var l in c.Lines)
        {
            double bottom = l.Y + l.Height;
            if (bottom <= availContent + 0.5 && bottom > cut) cut = bottom;
        }
        if (cut <= 0) return null;
        var a = new CellContent { Height = cut };
        var b = new CellContent { Height = Math.Max(0, c.Height - cut) };
        static double KeyY(PageItem it) => it switch
        {
            LineItem li => Math.Min(li.Y1, li.Y2),
            ClipItem ci => ci.Y ?? 0,
            XformItem xf => xf.M is not null ? xf.M[5] : 0,
            PathItem pi => pi.Cmds.Count == 0 ? double.PositiveInfinity : pi.Cmds.Select(cm => cm.Op == 'Z' ? double.PositiveInfinity : cm.Y).Aggregate(double.PositiveInfinity, (m, v) => double.IsNaN(m) || double.IsNaN(v) ? double.NaN : Math.Min(m, v)),
            GlyphRunItem g => g.Y,
            RectItem r => r.Y,
            ImageItem im => im.Y,
            ShapeItem sh => sh.Y,
            _ => 0,
        };
        foreach (var it in c.Items)
        {
            double y = KeyY(it);
            if (y < cut) a.Items.Add(it);
            else b.Items.Add(ShiftItem(it, -cut));
        }
        foreach (var l in c.Lines)
        {
            if (l.Y < cut) a.Lines.Add(l);
            else
            {
                var nl = l.ShallowClone();
                nl.Y = l.Y - cut;
                nl.Baseline = l.Baseline - cut;
                b.Lines.Add(nl);
            }
        }
        return (a, b);
    }

    private static double? WidthTw(WidthSpec? w, double b)
    {
        if (w is null) return null;
        if (w.Type == "dxa") return w.W;
        if (w.Type == "pct") return (b * w.W) / 5000;
        return null;
    }

    private sealed class CellSlot
    {
        public TableCell Cell = null!;
        public int Col;
        public int Span;
        public int Row;
        public TcPr TcPr = null!;
        /// <summary>vMerge: quantas linhas a célula cobre (1 = sem mescla)</summary>
        public int RowSpan;
        /// <summary>é continuação de mescla vertical (não pinta conteúdo)</summary>
        public bool Merged;
    }

    private sealed class Resolved
    {
        public TcPr TcPr = null!;
        public PPr PPr = null!;
        public RPr RPr = null!;
    }

    private sealed class CellInfo
    {
        public CellSlot Slot = null!;
        public TcPr TcPr = null!;
        public CellContent? Content;
        public double X0, X1, Bx0, Bx1, MarT, MarB, MarL, MarR;
        public string? Vertical;
        public CellEnv Env = null!;
    }

    private sealed class PendingMerge
    {
        public CellSlot Slot = null!;
        public CellContent? Content;
        public TcPr TcPr = null!;
        public double X0, X1;
        public int StartRow;
        public string? Vertical;
        public double MarL, MarR;
        public CellEnv Env = null!;
    }

    private static int ToIntSafe(double v) => double.IsFinite(v) ? (int)v : 0;

    /// <summary>
    /// Linha oculta (oráculo hidden): trPr/w:hidden E todo o conteúdo oculto (marcas
    /// e texto) — o Word a remove inteira, bordas incluídas. Com conteúdo visível
    /// (ou sem trPr/hidden) a linha fica.
    /// </summary>
    public static bool IsHiddenRow(DocContext ctx, TableRow row)
    {
        if (row.TrPr?.Hidden != true) return false;
        return row.Cells.All(c => (c.Blocks ?? c.Paragraphs.Select(p => (Block)new ParagraphBlock { Paragraph = p }).ToList()).All(b =>
        {
            if (b is not ParagraphBlock pb) return false;
            var v = Para.ParaVisibility(ctx, pb.Paragraph, new ParaEnv());
            return v.MarkHidden && !v.Visible;
        }));
    }

    private static TableBlock WithRows(TableBlock t, List<TableRow> rows) =>
        new() { Rows = rows, GridColsTwips = t.GridColsTwips, Borders = t.Borders, TblPr = t.TblPr };

    public static TableLayout LayoutTable(DocContext ctx, TableBlock table0, double frameX, double frameWidth, CellLayouter layoutCell, string reference)
    {
        var table = table0.Rows.Any(r => r.TrPr?.Hidden == true) ? WithRows(table0, table0.Rows.Where(r => !IsHiddenRow(ctx, r)).ToList()) : table0;
        var theme = ctx.Fmt.Theme;
        var direct = table.TblPr ?? new TblPr();
        var style = ctx.Resolver.TableStyle(direct.TblStyle);
        var tblPr = Resolve.MergeTblPr(style.TblPr, direct);
        var look = new TblLook { FirstRow = true, LastRow = false, FirstColumn = true, LastColumn = false, NoHBand = false, NoVBand = true }
            .With(direct.TblLook ?? style.TblPr.TblLook ?? new TblLook());
        int nRows = table.Rows.Count;

        // ── grade ──
        var grid = table.GridColsTwips.Select(g => (double)g).ToList();
        double? tblWidth = WidthTw(tblPr.TblW, frameWidth);
        if (grid.Count == 0 || grid.All(g => g <= 0))
        {
            double cols = Math.Max(1, table.Rows.Count == 0 ? double.NegativeInfinity : table.Rows.Max(r =>
                r.Cells.Aggregate(0.0, (s, c) => s + Math.Max(1, c.TcPr?.GridSpan ?? c.GridSpan)) + (r.TrPr?.GridBefore ?? 0) + (r.TrPr?.GridAfter ?? 0)));
            double total = tblWidth ?? frameWidth;
            int n = ToIntSafe(cols);
            grid = Enumerable.Range(0, Math.Max(0, n)).Select(_ => total / cols).ToList();
        }
        // tabela em pct/auto mais larga que o quadro: Word encolhe proporcionalmente (autofit)
        double width = grid.Aggregate(0.0, (a, b) => a + b);
        if (tblWidth is { } tw0 && tw0 != 0 && !double.IsNaN(tw0) && tblPr.TblW?.Type == "pct" && Math.Abs(tw0 - width) > 20)
        {
            double w0 = width;
            grid = grid.Select(g => (g * tw0) / w0).ToList();
            width = tw0;
        }
        var colX = new List<double> { 0 };
        foreach (var g in grid) colX.Add(colX[^1] + g);
        double ColAt(int i) => i >= 0 && i < colX.Count ? colX[i] : double.NaN; // colX[i] fora = undefined → NaN

        // ── posição ──
        double firstCellMarL;
        {
            var c = table.Rows.Count > 0 && table.Rows[0].Cells.Count > 0 ? table.Rows[0].Cells[0] : null;
            var m = c?.TcPr?.TcMar?.Left ?? tblPr.TblCellMar?.Left;
            firstCellMarL = WidthTw(m, width) ?? 108;
        }
        // tabela flutuante: posicionada pelo chamador (âncoras do tblpPr) — sem recuo/alinhamento
        bool floating = tblPr.TblpPr is not null && tblPr.TblpPr.TblpYSpec != "inline";
        double x = frameX + (floating ? 0 : WidthTw(tblPr.TblInd, frameWidth) ?? 0);
        // compat < 15: o recuo é até o TEXTO da 1ª célula (a borda sai para a esquerda)
        if (ctx.Fmt.Settings.CompatibilityMode < 15) x -= firstCellMarL;
        string? jc = floating ? null : tblPr.Jc;
        if (jc == "center") x = frameX + (frameWidth - width) / 2;
        else if (jc is "right" or "end") x = frameX + frameWidth - width;

        // ── células (vMerge) ──
        var slots = new List<List<CellSlot>>();
        for (int ri = 0; ri < table.Rows.Count; ri++)
        {
            var row = table.Rows[ri];
            var rowSlots = new List<CellSlot>();
            int col = ToIntSafe(row.TrPr?.GridBefore ?? 0);
            foreach (var cell in row.Cells)
            {
                var tc = cell.TcPr ?? new TcPr();
                int span = ToIntSafe(Math.Max(1, tc.GridSpan ?? cell.GridSpan));
                rowSlots.Add(new CellSlot { Cell = cell, Col = col, Span = span, Row = ri, TcPr = tc, RowSpan = 1, Merged = tc.VMerge == "continue" });
                col += span;
            }
            slots.Add(rowSlots);
        }
        // amarra continuações à célula inicial
        for (int ri = 0; ri < slots.Count; ri++)
        {
            foreach (var s in slots[ri])
            {
                if (s.TcPr.VMerge != "restart") continue;
                int k = ri + 1;
                while (k < slots.Count && slots[k].Any(o => o.Col == s.Col && o.Merged)) k++;
                s.RowSpan = k - ri;
            }
        }

        // ── formatação condicional ──
        double rowBand = Math.Max(1, tblPr.TblStyleRowBandSize ?? 1);
        double colBand = Math.Max(1, tblPr.TblStyleColBandSize ?? 1);
        int nCols = grid.Count;
        List<string> CondFor(int ri, CellSlot s)
        {
            var outp = new List<string> { "wholeTable" };
            bool firstRow = look.FirstRow == true && ri == 0 || (table.Rows[ri].TrPr?.TblHeader == true) && look.FirstRow == true;
            bool lastRow = look.LastRow == true && ri == nRows - 1;
            bool firstCol = look.FirstColumn == true && s.Col == 0;
            bool lastCol = look.LastColumn == true && s.Col + s.Span >= nCols;
            if (look.NoVBand != true)
            {
                int c0 = s.Col - (look.FirstColumn == true ? 1 : 0);
                if (c0 >= 0 && !(lastCol && look.LastColumn == true)) outp.Add(Math.Floor(c0 / colBand) % 2 == 0 ? "band1Vert" : "band2Vert");
            }
            if (look.NoHBand != true)
            {
                int r0 = ri - (look.FirstRow == true ? 1 : 0);
                if (r0 >= 0 && !lastRow) outp.Add(Math.Floor(r0 / rowBand) % 2 == 0 ? "band1Horz" : "band2Horz");
            }
            if (firstCol) outp.Add("firstCol");
            if (lastCol) outp.Add("lastCol");
            if (firstRow) outp.Add("firstRow");
            if (lastRow) outp.Add("lastRow");
            if (firstRow && firstCol) outp.Add("nwCell");
            if (firstRow && lastCol) outp.Add("neCell");
            if (lastRow && firstCol) outp.Add("swCell");
            if (lastRow && lastCol) outp.Add("seCell");
            return StyleResolver.CondOrder.Where(outp.Contains).ToList();
        }

        // ── propriedades resolvidas por célula (estilo + condicional + direto) ──
        var resolved = new Dictionary<CellSlot, Resolved>(ReferenceEqualityComparer.Instance);
        for (int ri = 0; ri < slots.Count; ri++)
        {
            foreach (var s in slots[ri])
            {
                TcPr tcPr = style.TcPr;
                PPr pPr = style.PPr;
                RPr rPr = style.RPr;
                foreach (var c in CondFor(ri, s))
                {
                    if (!style.Cond.TryGetValue(c, out var part)) continue;
                    tcPr = Resolve.MergeTcPr(tcPr, part.TcPr);
                    pPr = Resolve.MergePPr(pPr, part.PPr);
                    rPr = Resolve.MergeRPr(rPr, part.RPr);
                }
                resolved[s] = new Resolved { TcPr = Resolve.MergeTcPr(tcPr, s.TcPr), PPr = pPr, RPr = rPr };
            }
        }

        // ── bordas ──
        var tblBorders = tblPr.TblBorders ?? new TblBorders();
        BorderSpec? Edge(CellSlot s, string side)
        {
            var own = resolved.TryGetValue(s, out var rs) ? rs.TcPr.TcBorders?.Get(side) : null;
            if (own is not null) return own;
            var ex = s.Row < table.Rows.Count ? table.Rows[s.Row].TblPrEx : null;
            var tb = ex?.TblBorders is not null ? tblBorders.With(ex.TblBorders) : tblBorders;
            bool isOuter = side == "top" ? s.Row == 0 : side == "bottom" ? s.Row + s.RowSpan >= nRows
                : side == "left" ? s.Col == 0 : s.Col + s.Span >= nCols;
            return isOuter ? tb.Get(side) : (side is "top" or "bottom" ? tb.InsideH : tb.InsideV);
        }
        /// conflito entre bordas vizinhas: a mais grossa vence (empate: a de cima)
        static BorderSpec? Heavier(BorderSpec? a, BorderSpec? b) => Paint.BorderWidth(b) > Paint.BorderWidth(a) ? b : a;
        List<CellSlot> Covering(int ri, int c0, int c1) =>
            (ri >= 0 && ri < slots.Count ? slots[ri] : new List<CellSlot>()).Where(o => o.Col < c1 && o.Col + o.Span > c0).ToList();
        /// borda vencedora no topo da célula (divisa com a linha de cima)
        BorderSpec? TopWinner(CellSlot s)
        {
            BorderSpec? w = null;
            if (s.Row > 0) foreach (var u in Covering(s.Row - 1, s.Col, s.Col + s.Span)) w = Heavier(w, Edge(u, "bottom"));
            return Heavier(w, Edge(s, "top"));
        }
        // Faixas horizontais de borda (medido no Word, oráculo tables): cada divisa
        // entre linhas ocupa a espessura da borda mais grossa dela — o conteúdo da
        // linha começa abaixo; a última linha ganha a faixa da borda inferior.
        var band = new List<double>();
        for (int k = 0; k <= nRows; k++)
        {
            double m = 0;
            if (k == nRows) { if (nRows - 1 >= 0) foreach (var s in slots[nRows - 1]) m = Math.Max(m, Paint.BorderWidth(Edge(s, "bottom"))); }
            else foreach (var s in slots[k]) if (!s.Merged) m = Math.Max(m, Paint.BorderWidth(TopWinner(s)));
            band.Add(m);
        }
        // compat ≥ 15: a borda esquerda começa na margem (+recuo) — a grade fica meia borda adiante
        if (ctx.Fmt.Settings.CompatibilityMode >= 15 && string.IsNullOrEmpty(jc) && slots.Count > 0 && slots[0].Count > 0)
            x += Paint.BorderWidth(Edge(slots[0][0], "left")) / 2;

        // ── bordas SEPARADAS (oráculos cellsp/cellsp2) ──
        // tblCellSpacing presente (mesmo 0), na tabela ou em alguma linha: cada célula desenha
        // as PRÓPRIAS bordas dentro da sua caixa e a borda externa da tabela contorna tudo.
        // Entre células, entre linhas e entre a borda externa e as células: 2× o espaçamento.
        // Caixa da célula: [B_i + s, B_(i+1) − s], com B_0 = grade_0 + s, B_n = grade_n − s e
        // as divisas internas proporcionais à grade (exato com 2 colunas; aproximado com mais).
        // O texto começa na borda da célula + margem (com s = 0 o Word põe meia borda antes).
        bool separated = tblPr.TblCellSpacing is not null || table.Rows.Any(r => r.TrPr?.TblCellSpacing is not null);
        double SpRow(int ri) => WidthTw((ri < table.Rows.Count ? table.Rows[ri].TrPr?.TblCellSpacing : null) ?? tblPr.TblCellSpacing, width) ?? 0;
        double spTbl = WidthTw(tblPr.TblCellSpacing ?? table.Rows.FirstOrDefault(r => r.TrPr?.TblCellSpacing is not null)?.TrPr?.TblCellSpacing, width) ?? 0;
        BorderSpec? OuterB(int ri, string side) => (ri < table.Rows.Count ? table.Rows[ri].TblPrEx?.TblBorders?.Get(side) : null) ?? tblBorders.Get(side);
        // por linha: do topo da linha ao conteúdo / do conteúdo ao fim; espessuras das bordas das células
        var sepTop = new List<double>();
        var sepBottom = new List<double>();
        var sepWT = new List<double>();
        var sepWB = new List<double>();
        if (separated)
        {
            for (int ri = 0; ri < nRows; ri++)
            {
                double sp = SpRow(ri);
                double wT = 0, wB = 0;
                foreach (var sl in slots[ri]) { wT = Math.Max(wT, Paint.BorderWidth(Edge(sl, "top"))); wB = Math.Max(wB, Paint.BorderWidth(Edge(sl, "bottom"))); }
                sepWT.Add(wT);
                sepWB.Add(wB);
                sepTop.Add((ri == 0 ? Paint.BorderWidth(OuterB(0, "top")) + sp : 0) + sp + wT);
                sepBottom.Add(wB + sp + (ri == nRows - 1 ? sp + Paint.BorderWidth(OuterB(ri, "bottom")) : 0));
            }
        }
        double BandTopOf(int ri) => separated ? sepTop[ri] : band[ri];
        double BandBottomOf(int ri) => separated ? sepBottom[ri] : ri == nRows - 1 ? band[nRows] : 0;
        double g0 = ColAt(0), gn = ColAt(nCols);
        double SepB(int i) => g0 + spTbl + (ColAt(i) - g0) * ((gn - g0 - 2 * spTbl) / (gn - g0 is var dd && dd != 0 && !double.IsNaN(dd) ? dd : 1));

        var rows = new List<RowLayout>();
        var pendingMerges = new List<PendingMerge>();
        // maior largura de linha do conteúdo (comprimento do texto vertical)
        static double MaxLineW(CellContent c) => c.Lines.Aggregate(0.0, (m, l) => Math.Max(m, l.X + l.Width));
        // Texto vertical (textDirection btLr/tbRl): diagrama o conteúdo no
        // comprimento disponível (altura da linha) — sem quebrar se couber; senão
        // quebra, mas nunca abaixo da maior palavra.
        CellContent LayoutVertical(CellSlot s, double avail, CellEnv env, string cref)
        {
            // medições puras: só a diagramação final avança listas/SEQ/notas
            double natural = MaxLineW(ctx.Pure(() => layoutCell(s.Cell, 0, 31680, env, cref)));
            if (natural <= avail + 0.5) return layoutCell(s.Cell, 0, Math.Max(1, avail), env, cref);
            double longest = MaxLineW(ctx.Pure(() => layoutCell(s.Cell, 0, 1, env, cref)));
            return layoutCell(s.Cell, 0, Math.Max(Math.Max(1, avail), longest), env, cref);
        }
        var rowHeights = new List<double>();

        for (int ri = 0; ri < table.Rows.Count; ri++)
        {
            var row = table.Rows[ri];
            var ex = row.TblPrEx;
            double contentH = 0;
            var cellInfos = new List<CellInfo>();
            foreach (var s in slots[ri])
            {
                var rs = resolved[s];
                // bordas separadas: caixa da célula (bx) e área do conteúdo (x) dentro das bordas dela
                double bx0 = separated ? SepB(Math.Min(s.Col, nCols)) + spTbl : ColAt(Math.Min(s.Col, nCols));
                double bx1 = separated ? SepB(Math.Min(s.Col + s.Span, nCols)) - spTbl : ColAt(Math.Min(s.Col + s.Span, nCols));
                double x0r = bx0, x1r = bx1;
                var mar = (tblPr.TblCellMar ?? new CellMargins()).With(ex?.TblCellMar).With(rs.TcPr.TcMar);
                double marL = WidthTw(mar.Left, width) ?? 108;
                double marR = WidthTw(mar.Right, width) ?? 108;
                double marT = WidthTw(mar.Top, width) ?? 0;
                double marB = WidthTw(mar.Bottom, width) ?? 0;
                // texto: borda da célula + margem; com espaçamento 0 o Word conta só meia borda
                // (como no modelo colapsado), mas nunca menos que a borda inteira
                double wl = separated ? Paint.BorderWidth(Edge(s, "left")) : 0, wr = separated ? Paint.BorderWidth(Edge(s, "right")) : 0;
                double x0 = !separated ? x0r : spTbl > 0 ? x0r + wl : x0r + Math.Max(wl - marL, wl / 2);
                double x1 = !separated ? x1r : spTbl > 0 ? x1r - wr : x1r - Math.Max(wr - marR, wr / 2);
                // fundo escuro na célula: texto de cor automática vira branco
                var env = new CellEnv { TablePPr = rs.PPr, TableRPr = rs.RPr, DarkBackground = Para.IsDark(CellFill(ctx, rs.TcPr, tblPr, theme)) };
                string? td = rs.TcPr.TextDirection;
                string? vertical = td is "btLr" or "tbRl" or "tbRlV" ? td : null;
                var info = new CellInfo { Slot = s, TcPr = rs.TcPr, X0 = x0, X1 = x1, Bx0 = bx0, Bx1 = bx1, MarT = marT, MarB = marB, MarL = marL, MarR = marR, Env = env, Vertical = vertical };
                if (!s.Merged)
                {
                    if (vertical is not null)
                    {
                        // texto vertical: diagramado depois que a altura das outras células é conhecida
                        if (s.RowSpan != 1) pendingMerges.Add(new PendingMerge { Slot = s, Content = null, TcPr = rs.TcPr, X0 = x0, X1 = x1, StartRow = ri, Vertical = vertical, MarL = marL, MarR = marR, Env = env });
                    }
                    else
                    {
                        var content = layoutCell(s.Cell, x + x0 + marL, Math.Max(1, x1 - x0 - marL - marR), env, $"{reference}/r{ri}/c{s.Col}");
                        info.Content = content;
                        if (s.RowSpan == 1) contentH = Math.Max(contentH, content.Height + marT + marB);
                        else pendingMerges.Add(new PendingMerge { Slot = s, Content = content, TcPr = rs.TcPr, X0 = x0, X1 = x1, StartRow = ri, MarL = marL, MarR = marR, Env = env });
                    }
                }
                cellInfos.Add(info);
            }
            var th = row.TrPr?.TrHeight;
            // altura mínima × margens da célula (oráculo tcell): a mínima vale para o TEXTO
            // e as margens de cima/baixo somam por fora — max(trHeight, texto) + mT + mB; na
            // exata só a margem de BAIXO soma (a de cima fica dentro da altura)
            double maxMar = 0, maxMarB = 0;
            foreach (var ci in cellInfos) { maxMar = Math.Max(maxMar, ci.MarT + ci.MarB); maxMarB = Math.Max(maxMarB, ci.MarB); }
            // células de texto vertical (não mescladas): comprimento = altura da linha
            foreach (var ci in cellInfos)
            {
                if (ci.Vertical is null || ci.Slot.Merged || ci.Slot.RowSpan != 1) continue;
                double rowMin = th is not null ? th.Val + (th.HRule == "exact" ? maxMarB : maxMar) : 0;
                double availV = Math.Max(contentH, rowMin) - ci.MarT - ci.MarB;
                var cv = LayoutVertical(ci.Slot, availV, ci.Env, $"{reference}/r{ri}/c{ci.Slot.Col}");
                ci.Content = cv;
                if (th?.HRule != "exact") contentH = Math.Max(contentH, MaxLineW(cv) + ci.MarT + ci.MarB);
            }
            // keepNext em qualquer parágrafo de qualquer célula (oráculo keeptbl)
            bool rowKeepNext = cellInfos.Any(ci => ci.Content?.KeepNext == true);
            double contentHC = contentH;
            // altura da linha (sem as faixas de borda)
            double h = contentH;
            if (th is not null)
            {
                if (th.HRule == "exact") h = th.Val;
                else h = Math.Max(h, th.Val + maxMar);
            }
            double bandTop = BandTopOf(ri);
            // altura exata inclui a faixa de borda de cima (oráculo tables/tb-cellmar)
            if (th?.HRule == "exact") h = Math.Max(0, th.Val - bandTop) + maxMarB;
            if (h <= 0) h = 0;
            double bandBottom = BandBottomOf(ri);
            // mesclas verticais que TERMINAM nesta linha: a última linha cresce se faltar altura
            foreach (var m in pendingMerges)
            {
                if (m.StartRow + m.Slot.RowSpan - 1 != ri || m.Content is null) continue;
                double spanned = rowHeights.Skip(m.StartRow).Aggregate(0.0, (a, b) => a + b) - BandTopOf(m.StartRow) + bandTop + h;
                double need = m.Content.Height + (WidthTw(m.TcPr.TcMar?.Top, width) ?? 0) + (WidthTw(m.TcPr.TcMar?.Bottom, width) ?? 0);
                if (need > spanned) h += need - spanned;
            }
            rowHeights.Add(bandTop + h + bandBottom);
            int riC = ri;
            RowLayout PaintRow(double ch, Dictionary<CellSlot, CellContent?> contents, bool vTop, bool drawTop, double bTop, double bBottom)
            {
                var its = new List<PageItem>();
                var lns = new List<LaidOutLine>();
                var brd = new List<PageItem>();
                var brk = new List<PageItem>();
                double rh = bTop + ch + bBottom;
                if (separated)
                {
                    // cada célula: fundo e as próprias bordas dentro da caixa; depois a borda externa
                    double cy0 = bTop - sepWT[riC], cy1 = bTop + ch + (bBottom > 0 ? sepWB[riC] : 0);
                    foreach (var ci in cellInfos)
                    {
                        var s = ci.Slot;
                        if (s.Merged) continue;
                        string? fill = CellFill(ctx, ci.TcPr, tblPr, theme);
                        contents.TryGetValue(s, out var content);
                        if (fill is not null) its.Add(new RectItem { X = x + ci.Bx0, Y = cy0, W = ci.Bx1 - ci.Bx0, H = cy1 - cy0, Fill = fill });
                        if (s.RowSpan == 1)
                        {
                            if (content is not null && ci.Vertical is not null) PaintVertical(its, content, ci.Vertical, ci.TcPr.VAlign, x + ci.X0 + ci.MarL, x + ci.X1 - ci.MarR, bTop + ci.MarT, bTop + ch - ci.MarB);
                            else if (content is not null) PlaceContent(its, lns, content, vTop ? "top" : ci.TcPr.VAlign, ch, ci.MarT, ci.MarB, bTop);
                        }
                        BorderSpec? bT = Edge(s, "top"), bB = Edge(s, "bottom"), bL = Edge(s, "left"), bR = Edge(s, "right");
                        if (drawTop && bT is not null) Paint.PaintBorder(ctx, brd, bT, x + ci.Bx0, cy0 + Paint.BorderWidth(bT) / 2, x + ci.Bx1, cy0 + Paint.BorderWidth(bT) / 2);
                        if (bBottom > 0 && bB is not null) Paint.PaintBorder(ctx, brd, bB, x + ci.Bx0, cy1 - Paint.BorderWidth(bB) / 2, x + ci.Bx1, cy1 - Paint.BorderWidth(bB) / 2);
                        if (bL is not null) Paint.PaintBorder(ctx, brd, bL, x + ci.Bx0 + Paint.BorderWidth(bL) / 2, cy0, x + ci.Bx0 + Paint.BorderWidth(bL) / 2, cy1);
                        if (bR is not null) Paint.PaintBorder(ctx, brd, bR, x + ci.Bx1 - Paint.BorderWidth(bR) / 2, cy0, x + ci.Bx1 - Paint.BorderWidth(bR) / 2, cy1);
                    }
                    BorderSpec? oL = OuterB(riC, "left"), oR = OuterB(riC, "right"), oT = OuterB(riC, "top"), oB = OuterB(riC, "bottom");
                    double xl = x + g0, xr = x + gn;
                    Paint.PaintBorder(ctx, brd, oL, xl, 0, xl, rh);
                    Paint.PaintBorder(ctx, brd, oR, xr, 0, xr, rh);
                    if (riC == 0 && drawTop) Paint.PaintBorder(ctx, brd, oT, xl - Paint.BorderWidth(oL) / 2, Paint.BorderWidth(oT) / 2, xr + Paint.BorderWidth(oR) / 2, Paint.BorderWidth(oT) / 2);
                    if (riC == nRows - 1 && bBottom > 0) Paint.PaintBorder(ctx, brd, oB, xl - Paint.BorderWidth(oL) / 2, rh - Paint.BorderWidth(oB) / 2, xr + Paint.BorderWidth(oR) / 2, rh - Paint.BorderWidth(oB) / 2);
                    return new RowLayout
                    {
                        Height = rh, Items = its, Lines = lns, BorderItems = brd, BreakBorderItems = brk, CantSplit = row.TrPr?.CantSplit == true, Header = row.TrPr?.TblHeader == true,
                        KeepNext = rowKeepNext, Natural = bTop + Math.Min(ch, contentHC) + bBottom,
                    };
                }
                foreach (var ci in cellInfos)
                {
                    var s = ci.Slot;
                    string? fill = CellFill(ctx, ci.TcPr, tblPr, theme);
                    contents.TryGetValue(s, out var content);
                    if (!s.Merged && s.RowSpan == 1)
                    {
                        if (fill is not null) its.Add(new RectItem { X = x + ci.X0, Y = 0, W = ci.X1 - ci.X0, H = rh, Fill = fill });
                        if (content is not null && ci.Vertical is not null) PaintVertical(its, content, ci.Vertical, ci.TcPr.VAlign, x + ci.X0 + ci.MarL, x + ci.X1 - ci.MarR, bTop + ci.MarT, bTop + ch - ci.MarB);
                        else if (content is not null) PlaceContent(its, lns, content, vTop ? "top" : ci.TcPr.VAlign, ch, ci.MarT, ci.MarB, bTop);
                    }
                    else if (s.Merged && fill is not null)
                    {
                        its.Add(new RectItem { X = x + ci.X0, Y = 0, W = ci.X1 - ci.X0, H = rh, Fill = fill });
                    }
                    var tcb = ci.TcPr.TcBorders;
                    // topo: na faixa de cima (continuação de linha partida: a borda de cima da célula)
                    var top = drawTop ? (s.Merged ? null : TopWinner(s)) : (Edge(s, "top") ?? Edge(s, "bottom"));
                    if (top is not null) Paint.PaintBorder(ctx, brd, top, x + ci.X0, Paint.BorderWidth(top) / 2, x + ci.X1, Paint.BorderWidth(top) / 2);
                    var bottom = Edge(s, "bottom");
                    bool lastOfMerge = !(riC + 1 < slots.Count && slots[riC + 1].Any(o => o.Col == s.Col && o.Merged));
                    if (bBottom > 0)
                    {
                        var b = bottom ?? Edge(s, "top");
                        Paint.PaintBorder(ctx, brd, b, x + ci.X0, rh - bBottom + Paint.BorderWidth(b) / 2, x + ci.X1, rh - bBottom + Paint.BorderWidth(b) / 2);
                    }
                    else if (lastOfMerge)
                    {
                        // fim de página entre esta linha e a próxima: o Word fecha a linha com a borda da divisa
                        var w = bottom;
                        foreach (var d in Covering(riC + 1, s.Col, s.Col + s.Span)) w = Heavier(w, Edge(d, "top"));
                        if (w is not null) Paint.PaintBorder(ctx, brk, w, x + ci.X0, rh + Paint.BorderWidth(w) / 2, x + ci.X1, rh + Paint.BorderWidth(w) / 2);
                    }
                    var left = Edge(s, "left");
                    var right = Edge(s, "right");
                    Paint.PaintBorder(ctx, brd, left, x + ci.X0, 0, x + ci.X0, rh);
                    Paint.PaintBorder(ctx, brd, right, x + ci.X1, 0, x + ci.X1, rh);
                    if (tcb?.Tl2br is not null) Paint.PaintBorder(ctx, brd, tcb.Tl2br, x + ci.X0, bTop, x + ci.X1, rh - bBottom);
                    if (tcb?.Tr2bl is not null) Paint.PaintBorder(ctx, brd, tcb.Tr2bl, x + ci.X1, bTop, x + ci.X0, rh - bBottom);
                }
                return new RowLayout
                {
                    Height = rh, Items = its, Lines = lns, BorderItems = brd, BreakBorderItems = brk, CantSplit = row.TrPr?.CantSplit == true, Header = row.TrPr?.TblHeader == true,
                    KeepNext = rowKeepNext, Natural = bTop + Math.Min(ch, contentHC) + bBottom,
                };
            }
            var full = new Dictionary<CellSlot, CellContent?>(ReferenceEqualityComparer.Instance);
            foreach (var ci in cellInfos) full[ci.Slot] = ci.Content;
            bool canSplit = row.TrPr?.CantSplit != true && row.TrPr?.TrHeight?.HRule != "exact";
            double bandTopC = bandTop, bandBottomC = bandBottom;
            // linha (ou resto de linha) com divisão sob demanda entre páginas
            Func<double, Dictionary<CellSlot, CellContent?>, bool, bool, RowLayout> build = null!;
            build = (ch, contents, vTop, drawTop) =>
            {
                var r = PaintRow(ch, contents, vTop, drawTop, bandTopC, bandBottomC);
                if (!canSplit) return r;
                r.Split = avail =>
                {
                    var a = new Dictionary<CellSlot, CellContent?>(ReferenceEqualityComparer.Instance);
                    var rest = new Dictionary<CellSlot, CellContent?>(ReferenceEqualityComparer.Instance);
                    double h1 = 0, h2 = 0;
                    bool any = false;
                    double availContent = avail - bandTopC;
                    foreach (var ci in cellInfos)
                    {
                        contents.TryGetValue(ci.Slot, out var c);
                        if (c is null || ci.Slot.Merged || ci.Slot.RowSpan != 1) { a[ci.Slot] = c; continue; }
                        var sp = SplitContent(c, availContent - ci.MarT - ci.MarB);
                        if (sp is null)
                        {
                            rest[ci.Slot] = c;
                            h2 = Math.Max(h2, c.Height + ci.MarT + ci.MarB);
                            continue;
                        }
                        any = true;
                        a[ci.Slot] = sp.Value.A;
                        rest[ci.Slot] = sp.Value.B;
                        h1 = Math.Max(h1, sp.Value.A.Height + ci.MarT + ci.MarB);
                        h2 = Math.Max(h2, sp.Value.B.Height + ci.MarT + ci.MarB);
                    }
                    if (!any) return null;
                    var firstPart = PaintRow(h1, a, true, drawTop, bandTopC, 0);
                    // a parte de cima fecha com a borda inferior da célula (no pé da página)
                    firstPart.BorderItems.AddRange(firstPart.BreakBorderItems ?? new List<PageItem>());
                    firstPart.BreakBorderItems = new List<PageItem>();
                    return (firstPart, build(Math.Max(h2, 1), rest, true, false));
                };
                return r;
            };
            rows.Add(build(h, full, false, true));
        }

        // conteúdo das células mescladas verticalmente: o fundo vai na linha inicial
        // (altura somada); o texto, na ÚLTIMA linha da mescla (coordenadas negativas)
        // para ficar por cima dos fundos das linhas de continuação
        foreach (var m in pendingMerges)
        {
            int endRow = m.StartRow + m.Slot.RowSpan - 1;
            double h = rowHeights.Skip(m.StartRow).Take(endRow + 1 - m.StartRow).Aggregate(0.0, (a, b) => a + b) - BandTopOf(m.StartRow) - BandBottomOf(endRow);
            var first = rows[m.StartRow];
            var target = endRow >= 0 && endRow < rows.Count ? rows[endRow] : first;
            string? fill = CellFill(ctx, m.TcPr, tblPr, theme);
            if (fill is not null) first.Items.Insert(0, new RectItem { X = x + m.X0, Y = 0, W = m.X1 - m.X0, H = h, Fill = fill });
            double marT = WidthTw(m.TcPr.TcMar?.Top, width) ?? 0;
            double marB = WidthTw(m.TcPr.TcMar?.Bottom, width) ?? 0;
            // topo da célula mesclada no sistema de coordenadas da linha-alvo
            int sliceEnd = Math.Min(endRow, rows.Count - 1);
            double top = BandTopOf(m.StartRow) - rowHeights.Skip(m.StartRow).Take(Math.Max(0, sliceEnd - m.StartRow)).Aggregate(0.0, (a, b) => a + b);
            if (m.Vertical is not null)
            {
                var c = LayoutVertical(m.Slot, h - marT - marB, m.Env, $"{reference}/r{m.StartRow}/c{m.Slot.Col}");
                PaintVertical(target.Items, c, m.Vertical, m.TcPr.VAlign, x + m.X0 + m.MarL, x + m.X1 - m.MarR, top + marT, top + h - marB);
            }
            else if (m.Content is not null) PlaceContent(target.Items, target.Lines, m.Content, m.TcPr.VAlign, h, marT, marB, top);
        }

        double borderLeft = slots.Count > 0 && slots[0].Count > 0 ? Paint.BorderWidth(Edge(slots[0][0], "left")) : 0;
        return new TableLayout { X = x, Width = width, Rows = rows, BorderLeft = borderLeft, TblpPr = tblPr.TblpPr };
    }

    private static readonly Regex PctRe = new(@"^pct(\d+)\z", RegexOptions.CultureInvariant);

    private static string? CellFill(DocContext ctx, TcPr tcPr, TblPr tblPr, Theme theme)
    {
        var shd = tcPr.Shd ?? tblPr.Shd;
        if (shd is null) return null;
        if (shd.Val == "solid") return Resolve.ResolveColor(shd.Color, shd.ThemeColor, null, null, theme) ?? "000000";
        string? fill = Js.Truthy(shd.ThemeFill)
            ? Resolve.ResolveColor(null, shd.ThemeFill, shd.ThemeFillTint, shd.ThemeFillShade, theme)
            : Js.Truthy(shd.Fill) && shd.Fill != "auto" ? Js.ToUpper(shd.Fill!) : null;
        if (Js.Truthy(shd.Val) && PctRe.IsMatch(shd.Val!))
        {
            // padrão percentual: mistura a cor do padrão sobre o preenchimento
            double pct = Js.ParseInt(shd.Val![3..]) / 100;
            string fg = Resolve.ResolveColor(shd.Color, shd.ThemeColor, null, null, theme) ?? "000000";
            string bg = fill ?? "FFFFFF";
            double Hex2(string s, int i) => OfficeNext.Core.JsNumber.ParseInt(i < s.Length ? s.Substring(i, Math.Min(2, s.Length - i)) : "", 16);
            double Mix(int i) => Js.Round(Hex2(bg, i) * (1 - pct) + Hex2(fg, i) * pct);
            string Part(int i)
            {
                double v = Mix(i);
                if (double.IsNaN(v)) return "NaN";
                string s = ((long)v).ToString("x", CultureInfo.InvariantCulture);
                return s.Length < 2 ? "0" + s : s;
            }
            return (Part(0) + Part(2) + Part(4)).ToUpperInvariant();
        }
        return fill;
    }

    /// <summary>
    /// Pinta o conteúdo de uma célula de texto vertical: o conteúdo foi diagramado
    /// num quadro local (x ao longo do texto, y entre linhas) e entra girado —
    /// btLr: de baixo para cima (topo das letras à esquerda); tbRl: de cima para baixo.
    /// O alinhamento vertical da célula vale entre as linhas (na horizontal da página).
    /// </summary>
    private static void PaintVertical(List<PageItem> items, CellContent c, string dir, string? vAlign, double left, double right, double top, double bottom)
    {
        double free = right - left - c.Height;
        double off = vAlign == "center" ? free / 2 : vAlign == "bottom" ? free : 0;
        double[] m = dir == "btLr"
            ? new double[] { 0, -1, 1, 0, left, bottom }
            : new double[] { 0, 1, -1, 0, right, top };
        items.Add(XformItem.Push(m));
        foreach (var it in c.Items) items.Add(ShiftItem(it, Math.Max(0, off)));
        items.Add(XformItem.Pop());
    }

    private static void PlaceContent(List<PageItem> items, List<LaidOutLine> lines, CellContent? c, string? vAlign, double rowH, double marT, double marB, double y0 = 0)
    {
        if (c is null) return;
        double dy = y0 + marT;
        double free = rowH - marT - marB - c.Height;
        if (vAlign == "center" && free > 0) dy += free / 2;
        else if (vAlign == "bottom" && free > 0) dy += free;
        foreach (var it in c.Items) items.Add(ShiftItem(it, dy));
        foreach (var l in c.Lines)
        {
            var nl = l.ShallowClone();
            nl.Y = l.Y + dy;
            nl.Baseline = l.Baseline + dy;
            lines.Add(nl);
        }
    }

    public static PageItem ShiftItem(PageItem it, double dy, double dx = 0)
    {
        bool hasDx = dx != 0 && !double.IsNaN(dx);
        switch (it)
        {
            case GlyphRunItem g:
                {
                    var n = (GlyphRunItem)g.ShallowClone();
                    n.Y = g.Y + dy;
                    if (hasDx) n.Glyphs = g.Glyphs.Select(p => new GlyphPos(p.Cp, p.X + dx)).ToList();
                    return n;
                }
            case RectItem r:
                {
                    var n = (RectItem)r.ShallowClone();
                    n.X = r.X + dx; n.Y = r.Y + dy;
                    return n;
                }
            case ImageItem im:
                {
                    var n = (ImageItem)im.ShallowClone();
                    n.X = im.X + dx; n.Y = im.Y + dy;
                    return n;
                }
            case ShapeItem sh:
                {
                    var n = (ShapeItem)sh.ShallowClone();
                    n.X = sh.X + dx; n.Y = sh.Y + dy;
                    return n;
                }
            case LineItem li:
                {
                    var n = (LineItem)li.ShallowClone();
                    n.X1 = li.X1 + dx; n.X2 = li.X2 + dx; n.Y1 = li.Y1 + dy; n.Y2 = li.Y2 + dy;
                    return n;
                }
            case ClipItem ci:
                {
                    if (ci.Y is null) return ci;
                    var n = (ClipItem)ci.ShallowClone();
                    n.X = (ci.X ?? 0) + dx; n.Y = ci.Y + dy;
                    return n;
                }
            case XformItem xf:
                {
                    if (xf.M is null) return xf;
                    // mantém M'(p + d) = M(p) + d (o conteúdo de dentro também é deslocado)
                    double a = xf.M[0], b = xf.M[1], c = xf.M[2], d = xf.M[3], e = xf.M[4], f = xf.M[5];
                    var n = (XformItem)xf.ShallowClone();
                    n.M = new[] { a, b, c, d, e + dx - (a * dx + c * dy), f + dy - (b * dx + d * dy) };
                    return n;
                }
            case PathItem pi:
                {
                    var n = (PathItem)pi.ShallowClone();
                    n.Cmds = pi.Cmds.Select(c => c.Op == 'Z' ? c
                        : c.Op == 'C' ? PathCmdTw.C(c.X1 + dx, c.Y1 + dy, c.X2 + dx, c.Y2 + dy, c.X + dx, c.Y + dy)
                        : new PathCmdTw { Op = c.Op, X = c.X + dx, Y = c.Y + dy }).ToList();
                    return n;
                }
            default:
                return it;
        }
    }
}

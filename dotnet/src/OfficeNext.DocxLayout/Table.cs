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
    /// <summary>parágrafos do conteúdo (ref da linha → total de linhas, viúvas/órfãs, espaço
    /// depois) — onde a linha de tabela pode ser partida entre páginas</summary>
    public Dictionary<string, ParaSplitInfo>? Paras;
    /// <summary>linhas de tabela ANINHADA no conteúdo: topo, a linha e os itens/linhas dela (os
    /// mesmos objetos de Items/Lines) — partem como linha de tabela (oráculo nestsplit)</summary>
    public List<NestRow>? Nest;
    /// <summary>altura que se alinha na vertical (centro/base) quando passa de Height: inclui os
    /// objetos ancorados na célula sem quebra (oráculo cellwrap)</summary>
    public double? AlignH;
    /// <summary>tem forma ancorada: com w:doNotVertAlignCellWithSp (modos ≤ 14) não alinha na
    /// vertical (oráculo vcfloat)</summary>
    public bool Shape;
}

public sealed class NestRow
{
    public double Top;
    public RowLayout Row = null!;
    public List<PageItem> Items = new();
    public List<LaidOutLine> Lines = new();
}

public sealed class ParaSplitInfo
{
    public int Lines;
    public bool Widow;
    public double After;
    /// <summary>faixa da borda de baixo (pBdr) depois da última linha</summary>
    public double? Band;
}

/// <summary>Ambiente de uma célula: pPr/rPr do estilo de tabela e fundo escuro.</summary>
public sealed class CellEnv
{
    public PPr? TablePPr;
    public RPr? TableRPr;
    public bool DarkBackground;
    /// <summary>margens laterais da célula (âncoras relativas à célula — oráculo cellwrap)</summary>
    /// <summary>(T: do topo da LINHA da tabela ao do conteúdo — faixa de borda + margem de cima; oráculo cellout)</summary>
    public (double L, double R, double? T)? CellMar;
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
    /// <summary>mescla vertical que COMEÇA nesta linha: posição (em Items) do texto dela na
    /// ordem das colunas e a linha em que ela termina (oráculo vmorder)</summary>
    public List<MergeAtInfo>? MergeAt;
    /// <summary>texto de mescla vertical pintado nesta (última) linha da mescla e o deslocamento
    /// para as coordenadas da linha inicial</summary>
    public List<MergeTextInfo>? MergeText;
    /// <summary>espessura dessa borda: com a página quebrando depois desta linha, ela também
    /// tem de caber (oráculo rowfitbdr)</summary>
    public double? BreakW;
    /// <summary>divide a linha para caber em `avail` (twips): [parte que cabe, resto]
    /// — nulo se nenhuma linha de texto cabe (a linha inteira desce).</summary>
    public Func<double, (RowLayout First, RowLayout Remainder)?>? Split;
    /// <summary>linha inteira que abre a página (a anterior ficou na outra): a faixa de cima é só
    /// a borda de cima DELA — <c>TopCut</c> a menos — e as bordas de cima trocam (oráculo contband)</summary>
    public double? TopCut;
    public List<PageItem>? TopBorders;
    public List<PageItem>? OwnTopBorders;
    /// <summary>convertida por AtPageTop: quanto subiu</summary>
    public double? Cut;
    /// <summary>fundo de mescla vertical que começa nesta linha (retângulo com a altura somada) e a
    /// linha em que ela termina: no fluxo, o motor pinta uma faixa por página (oráculo vmshd)</summary>
    public List<MergeFill>? MergeFills;

    public RowLayout ShallowClone() => (RowLayout)MemberwiseClone();
}

/// <summary>fundo de mescla vertical (RowLayout.MergeFills)</summary>
public sealed class MergeFill
{
    public RectItem Item = null!;
    public int End;
}

public sealed class MergeAtInfo
{
    public int Col;
    public int At;
    public int EndRow;
}

public sealed class MergeTextInfo
{
    public int Col;
    public List<PageItem> Items = new();
    public List<LaidOutLine> Lines = new();
    public double Dy;
    /// <summary>linha inicial da mescla, o conteúdo dela, a margem de cima, a faixa de borda
    /// de cima da linha inicial e o alinhamento vertical (fluxo entre páginas — oráculo vmsplit)</summary>
    public int? Start;
    public CellContent? Content;
    public double? MarT;
    public double? Band;
    public string? VAlign;
}

public sealed class TableLayout
{
    public double X;
    public double Width;
    public List<RowLayout> Rows = new();
    /// <summary>espessura da borda esquerda da 1ª célula (twips)</summary>
    public double? BorderLeft;
    /// <summary>modo &lt; 15: do texto da última célula à borda direita (margem da célula ou meia borda)</summary>
    public double? EffR;
    /// <summary>propriedades de fluxo</summary>
    public TblpPr? TblpPr;
}

public static class TableEngine
{
    /// <summary>Parte um conteúdo de célula num corte vertical (fim da última linha que cabe).</summary>
    public static (CellContent A, CellContent B)? SplitContent(CellContent c, double availContent)
    {
        // linha de tabela aninhada cruzada pelo pé: parte como linha de tabela — cada célula no
        // seu corte, viúvas/órfãs por célula, a continuação no topo com a borda de cima (oráculo
        // nestsplit; corpus t191); se ela não pode partir, desce inteira
        var nr = c.Nest?.FirstOrDefault(n => n.Top < availContent - 0.5 && n.Top + n.Row.Height > availContent + 0.05);
        if (nr is not null)
        {
            var parts = nr.Row.Split?.Invoke(availContent - nr.Top);
            if (parts is { } pp && pp.First.Height > 0) return SplitAtNest(c, nr, pp.First, pp.Remainder);
            if (nr.Top > 0.5) return SplitContent(c, nr.Top);
        }
        var paras = c.Paras;
        // última linha de cada parágrafo: cabe só junto com o espaço depois dele (oráculo rowwidow, *-after*)
        var lastOf = new Dictionary<string, LaidOutLine>(StringComparer.Ordinal);
        if (paras is not null) foreach (var l in c.Lines) if (paras.ContainsKey(l.Ref)) lastOf[l.Ref] = l;
        double cut = 0;
        foreach (var l in c.Lines)
        {
            bool isLast = lastOf.TryGetValue(l.Ref, out var ll) && ReferenceEquals(ll, l);
            // (a borda de baixo do parágrafo fica com ele, em cima do corte — corpus t191)
            double bottom = l.Y + l.Height + (isLast ? paras![l.Ref].Band ?? 0 : 0);
            double after = isLast ? paras![l.Ref].After : 0;
            // (sem folga: o Word compara exato — oráculo bodyfit, bf-cf-*)
            if (bottom + after <= availContent + 0.05 && bottom > cut) cut = bottom;
        }
        if (cut > 0 && paras is not null) cut = WidowCut(c, paras, cut);
        if (cut > 0) cut = NestedRowCut(c, cut);
        if (cut <= 0) return null;
        // corte no fim de um parágrafo: o "depois" dele fica em cima; a continuação começa
        // só com o resto do espaço até o seguinte (oráculo rowwidow, gapcut)
        double cutB = cut;
        if (paras is not null)
        {
            LaidOutLine? last = null;
            double next = double.PositiveInfinity;
            foreach (var l in c.Lines)
            {
                if (l.Y + l.Height <= cut + 0.5) { if (last is null || l.Y + l.Height > last.Y + last.Height) last = l; }
                else next = Math.Min(next, l.Y);
            }
            if (last is not null && lastOf.TryGetValue(last.Ref, out var lo) && ReferenceEquals(lo, last)) cutB = Math.Min(cut + paras[last.Ref].After, next);
        }
        var a = new CellContent { Height = cut, Paras = paras };
        var b = new CellContent { Height = Math.Max(0, c.Height - cutB), Paras = paras };
        foreach (var it in c.Items)
        {
            double y = ItemTop(it);
            if (y < cut) a.Items.Add(it);
            else b.Items.Add(ShiftItem(it, -cutB));
        }
        foreach (var l in c.Lines)
        {
            if (l.Y < cut) a.Lines.Add(l);
            else
            {
                var nl = l.ShallowClone();
                nl.Y = l.Y - cutB;
                nl.Baseline = l.Baseline - cutB;
                b.Lines.Add(nl);
            }
        }
        return (a, b);
    }

    /// <summary>
    /// Linha de tabela ANINHADA cruzada pelo corte: se alguma célula dela (com texto)
    /// não fica com nenhuma linha em cima, ela desce inteira, como no corpo (oráculo
    /// nestwidow). Os refs das linhas aninhadas são "&lt;célula&gt;/bN/rM/cK/…".
    /// </summary>
    private static double NestedRowCut(CellContent c, double cut)
    {
        if (c.Lines.Count == 0) return cut;
        int baseN = c.Lines.Min(l => l.Ref.Split('/').Length) - 1;
        var rows = new Dictionary<string, List<LaidOutLine>>();
        var order = new List<string>();
        foreach (var l in c.Lines)
        {
            var s = l.Ref.Split('/');
            if (s.Length < baseN + 4) continue;
            string k = string.Join("/", s.Take(baseN + 2));
            if (!rows.TryGetValue(k, out var ls)) { ls = new List<LaidOutLine>(); rows[k] = ls; order.Add(k); }
            ls.Add(l);
        }
        foreach (var k in order)
        {
            var ls = rows[k];
            var above = ls.Where(l => l.Y < cut).ToList();
            if (above.Count == 0 || above.Count == ls.Count) continue;
            var cells = new HashSet<string>(ls.Select(l => string.Join("/", l.Ref.Split('/').Take(baseN + 3))));
            if (!cells.Any(ck => !above.Any(l => l.Ref.StartsWith(ck + "/", StringComparison.Ordinal)))) continue;
            double top = ls.Min(l => l.Y);
            double prev = 0;
            foreach (var l in c.Lines) if (l.Y + l.Height <= top + 0.5) prev = Math.Max(prev, l.Y + l.Height);
            cut = Math.Min(cut, Math.Min(prev, top));
        }
        return cut;
    }

    /// <summary>
    /// Viúvas/órfãs no parágrafo da célula partido pelo corte, como no corpo — só
    /// no modo 15 (oráculo rowwidow): a 1ª linha não fica sozinha no pé; a última
    /// não vai sozinha (e se sobrar só a 1ª, o parágrafo inteiro desce).
    /// </summary>
    private static double WidowCut(CellContent c, Dictionary<string, ParaSplitInfo> paras, double cut)
    {
        // todo parágrafo partido pelo corte (numa tabela aninhada pode haver vários lado a lado)
        var byRef = new Dictionary<string, List<LaidOutLine>>();
        var order = new List<string>();
        foreach (var l in c.Lines)
        {
            if (!byRef.TryGetValue(l.Ref, out var ls)) { ls = new List<LaidOutLine>(); byRef[l.Ref] = ls; order.Add(l.Ref); }
            ls.Add(l);
        }
        double outCut = cut;
        foreach (var rf in order)
        {
            var mine = byRef[rf];
            if (!paras.TryGetValue(rf, out var info) || !info.Widow) continue;
            int n1 = mine.Count(l => l.Y + l.Height <= cut + 0.5);
            if (n1 == 0 || n1 == mine.Count) continue;
            // a 1ª linha do parágrafo está nesta parte (não é continuação de outra página)
            bool hasFirst = mine.Count == info.Lines;
            int keep = n1;
            if (keep == 1 && hasFirst) keep = 0;
            else if (mine.Count - n1 == 1 && n1 >= 2) { keep--; if (keep == 1 && hasFirst) keep = 0; }
            if (keep == n1) continue;
            if (keep > 0) { outCut = Math.Min(outCut, mine[keep - 1].Y + mine[keep - 1].Height); continue; }
            // o parágrafo inteiro desce: corta no fim do conteúdo antes dele
            double prev = 0;
            foreach (var l in c.Lines) if (l.Y + l.Height <= mine[0].Y + 0.5) prev = Math.Max(prev, l.Y + l.Height);
            outCut = Math.Min(outCut, Math.Min(prev, mine[0].Y));
        }
        return outCut;
    }

    /// <summary>Topo de um item para decidir de que lado do corte ele fica.</summary>
    private static double ItemTop(PageItem it) => it switch
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

    /// <summary>Conteúdo partido numa linha aninhada: em cima, o que vem antes dela e a 1ª parte; em
    /// baixo, a continuação dela no topo e o que vem depois.</summary>
    private static (CellContent A, CellContent B) SplitAtNest(CellContent c, NestRow nr, RowLayout p0, RowLayout p1)
    {
        var own = new HashSet<object>(ReferenceEqualityComparer.Instance);
        foreach (var o in nr.Items) own.Add(o);
        foreach (var o in nr.Lines) own.Add(o);
        double end = nr.Top + nr.Row.Height;
        double dy = p1.Height - end;
        var aItems = new List<PageItem>(); var aLines = new List<LaidOutLine>();
        var bItems = new List<PageItem>(); var bLines = new List<LaidOutLine>();
        var moved = new Dictionary<object, object>(ReferenceEqualityComparer.Instance);
        foreach (var it in c.Items)
        {
            if (own.Contains(it)) continue;
            if (ItemTop(it) < nr.Top + 0.5) aItems.Add(it);
            else { var s = ShiftItem(it, dy); moved[it] = s; bItems.Add(s); }
        }
        foreach (var l in c.Lines)
        {
            if (own.Contains(l)) continue;
            if (l.Y < nr.Top + 0.5) aLines.Add(l);
            else
            {
                var s = l.ShallowClone();
                s.Y = l.Y + dy; s.Baseline = l.Baseline + dy;
                moved[l] = s; bLines.Add(s);
            }
        }
        aItems.AddRange(p0.Items.Concat(p0.BorderItems).Select(it => ShiftItem(it, nr.Top)));
        aLines.AddRange(p0.Lines.Select(l => { var s = l.ShallowClone(); s.Y = l.Y + nr.Top; s.Baseline = l.Baseline + nr.Top; return s; }));
        var p1Items = p1.Items.Concat(p1.BorderItems).ToList();
        var p1Lines = p1.Lines.Select(l => l.ShallowClone()).ToList();
        bItems.InsertRange(0, p1Items);
        bLines.InsertRange(0, p1Lines);
        var before = (c.Nest ?? new List<NestRow>()).Where(n => n.Top + n.Row.Height <= nr.Top + 0.5).ToList();
        var after = (c.Nest ?? new List<NestRow>()).Where(n => n.Top >= end - 0.5).Select(n => new NestRow
        {
            Top = n.Top + dy, Row = n.Row,
            Items = n.Items.Select(it => moved.TryGetValue(it, out var mv) ? (PageItem)mv : it).ToList(),
            Lines = n.Lines.Select(l => moved.TryGetValue(l, out var mv) ? (LaidOutLine)mv : l).ToList(),
        }).ToList();
        var a = new CellContent { Items = aItems, Lines = aLines, Height = nr.Top + p0.Height, Paras = c.Paras, Nest = before.Count > 0 ? before : null };
        var bNest = new List<NestRow> { new NestRow { Top = 0, Row = p1, Items = p1Items, Lines = p1Lines } };
        bNest.AddRange(after);
        var b = new CellContent { Items = bItems, Lines = bLines, Height = Math.Max(0, c.Height - end) + p1.Height, Paras = c.Paras, Nest = bNest };
        return (a, b);
    }

    private static double? WidthTw(WidthSpec? w, double b)
    {
        if (w is null) return null;
        if (w.Type == "dxa") return w.W;
        if (w.Type == "pct") return (b * w.W) / 5000;
        return null;
    }

    /// <summary>ref de tabela aninhada (dentro de uma célula)</summary>
    private static readonly Regex NestedRef = new(@"/r\d+/c\d+", RegexOptions.Compiled);

    /// <summary>Célula para a geometria: coluna inicial, colunas cobertas, largura preferida e conteúdo (sob demanda).</summary>
    private sealed class GeoCell
    {
        public int Col;
        public int Span;
        public WidthSpec? TcW;
        /// <summary>larguras mínima (maior palavra) e máxima (sem quebrar) do conteúdo + margens</summary>
        public Func<(double Min, double Max)> Measure = null!;
        /// <summary>noWrap com tcW dxa: a mínima é pelo menos o tcW (piso)</summary>
        public bool Floor;
        /// <summary>margens laterais (e espaçamento/bordas) incluídas nas larguras</summary>
        public double? Pad;
    }

    /// <summary>
    /// Largura de cada coluna por fronteiras (oráculo tblw d5/d6): a fronteira k é a
    /// maior entre (fronteira anterior + coluna) e (início + largura) das células que
    /// terminam em k — o excesso de uma célula mesclada vai para a ÚLTIMA coluna dela.
    /// Células mescladas com `spread` (larguras de conteúdo) entram depois e repartem o
    /// que faltar proporcionalmente às colunas que cobrem.
    /// </summary>
    private static List<double> BoundaryWidths(List<List<GeoCell>> cells, int nCols, Func<GeoCell, double> v, Func<GeoCell, bool>? spread = null)
    {
        var byEnd = Enumerable.Range(0, nCols + 1).Select(_ => new List<(int Start, double V)>()).ToList();
        var late = new List<GeoCell>();
        foreach (var row in cells)
        {
            foreach (var c in row)
            {
                int s = Math.Min(c.Col, nCols), e = Math.Min(nCols, c.Col + c.Span);
                if (e <= s) continue;
                if (e - s > 1 && spread is not null && spread(c)) late.Add(c);
                else byEnd[e].Add((s, v(c)));
            }
        }
        var b = new List<double> { 0 };
        for (int k = 1; k <= nCols; k++)
        {
            double m = b[k - 1];
            foreach (var c in byEnd[k]) m = Math.Max(m, b[c.Start] + c.V);
            b.Add(m);
        }
        var w = Enumerable.Range(0, nCols).Select(k => b[k + 1] - b[k]).ToList();
        foreach (var c in late.OrderBy(c => c.Span))
        {
            int s = Math.Min(c.Col, nCols), e = Math.Min(nCols, c.Col + c.Span);
            double have = 0;
            for (int k = s; k < e; k++) have += w[k];
            double need = v(c) - have;
            if (need <= 0) continue;
            for (int k = s; k < e; k++) w[k] += have > 0 ? (need * w[k]) / have : need / (e - s);
        }
        return w;
    }

    private static string PrefOf(WidthSpec? w) => w is not null && w.W > 0 && (w.Type == "dxa" || w.Type == "pct") ? w.Type : "auto";

    /// <summary>
    /// Célula cujo conteúdo não cabe nas colunas em pct que cobre: elas crescem até o mínimo
    /// e as demais colunas em pct (acima do mínimo próprio) perdem por igual (tblw f1/f3/f8).
    /// </summary>
    private static void FitPctMins(List<double> p, List<GeoCell> cells, Func<GeoCell, double> minOf, List<double> colMin, Func<int, bool> pct)
    {
        for (int it = 0; it < 2 * p.Count + 2; it++)
        {
            GeoCell? worst = null;
            double need = 1e-6;
            foreach (var c in cells)
            {
                if (!pct(c.Col)) continue;
                double have0 = 0;
                for (int k = c.Col; k < Math.Min(p.Count, c.Col + c.Span); k++) have0 += p[k];
                double d = minOf(c) - have0;
                if (d > need) { need = d; worst = c; }
            }
            if (worst is null) break;
            int s = worst.Col, e = Math.Min(p.Count, worst.Col + worst.Span);
            var others = Enumerable.Range(0, p.Count).Where(k => (k < s || k >= e) && pct(k) && p[k] > colMin[k] + 1e-6).ToList();
            double have = 0;
            for (int k = s; k < e; k++) have += p[k];
            for (int k = s; k < e; k++) p[k] += have > 0 ? (need * p[k]) / have : need / (e - s);
            // nenhuma outra coluna em pct para ceder: a tabela passa da largura pedida (oráculo tblpctmin)
            if (others.Count == 0) continue;
            foreach (int k in others) p[k] -= need / others.Count;
        }
    }

    /// <summary>
    /// Layout fixo: nenhuma célula fica mais estreita que as margens + 20 twips (a grade
    /// gravada pelo Google Docs traz colunas de ~58 twips) — a que falta cresce e o
    /// acréscimo sai das colunas das outras células, na proporção da largura (oráculo
    /// tblmincol).
    /// </summary>
    private static List<double> FixedMins(List<List<GeoCell>> cells, List<double> w)
    {
        var o = new List<double>(w);
        var locked = new HashSet<int>();
        for (int it = 0; it < 4; it++)
        {
            bool changed = false;
            foreach (var c in cells.SelectMany(r => r))
            {
                // (vão de gridBefore/gridAfter: não é célula)
                if (c.Pad is not { } pad) continue;
                var cols = Enumerable.Range(c.Col, Math.Max(0, Math.Min(o.Count, c.Col + c.Span) - c.Col)).ToList();
                if (cols.Count == 0) continue;
                double have = cols.Aggregate(0.0, (a, k) => a + o[k]);
                double need = pad + 20 - have;
                if (need <= 0.5) continue;
                var donors = Enumerable.Range(0, o.Count).Where(k => !cols.Contains(k) && !locked.Contains(k)).ToList();
                double pool = donors.Aggregate(0.0, (a, k) => a + o[k]);
                if (pool <= need) continue;
                foreach (int k in cols) { o[k] = o[k] + (have > 0 ? (need * o[k]) / have : need / cols.Count); locked.Add(k); }
                foreach (int k in donors) o[k] = o[k] - (need * o[k]) / pool;
                changed = true;
            }
            if (!changed) break;
        }
        return o;
    }

    /// <summary>
    /// Larguras das colunas (oráculos tblpct/tblw). `geoBase` = 100% de uma tabela em pct;
    /// `avail` = largura máxima de uma tabela automática (base − recuo: f7).
    ///  - Layout fixo: tcW (pct da largura da tabela); célula sem tcW usa a grade gravada
    ///    (d2/d3); com tblW, as colunas escalam proporcionalmente até ele (b7/b8).
    ///  - Autoajuste (a grade gravada é ignorada — b2/b10): largura da tabela = tblW, ou, se
    ///    automática, a soma do que as colunas querem limitada a `avail` (c5), ou a menor em
    ///    que as colunas em pct cabem na sua fração (tblpct auto, d11).
    ///    Colunas em pct: fração da largura, da esquerda para a direita, a última fica com o
    ///    que sobra (f2); se o conteúdo não cabe, a coluna vai ao mínimo e as outras em pct
    ///    perdem por igual (f1/f3/f8).
    ///    As demais repartem o resto por "palpites" (como no CSS): todas no mínimo (G1); tcW
    ///    dxa na largura pedida (G3, nunca abaixo do mínimo — c2); sem tcW, no máximo do
    ///    conteúdo (G4). Entre dois palpites, interpola: faltando largura, encolhem primeiro
    ///    as automáticas (f4/f5/f9), depois as dxa, proporcionais a (largura − mínimo)
    ///    (tblpct, b3, b13, d7, d8). Sobrando, crescem as automáticas, proporcionais ao
    ///    conteúdo (d1/d4/d10); sem elas, as demais, proporcionais à largura (b4). Abaixo da
    ///    soma dos mínimos: com tblW a tabela cresce (f6); automática, espreme (d9).
    /// </summary>
    private static List<double> ColumnWidths(List<List<GeoCell>> cells, int nCols, List<double> docGrid, WidthSpec? tblW, bool fixedLayout, double geoBase, double avail) =>
        // o Word guarda cada coluna em twips inteiros (arredonda): é essa a largura que decide a quebra (tblround)
        ColumnWidthsExact(cells, nCols, docGrid, tblW, fixedLayout, geoBase, avail).Select(JsRound).ToList();

    /// <summary>Math.round do JS (meio para cima).</summary>
    private static double JsRound(double x) => Math.Floor(x + 0.5);

    private static List<double> ColumnWidthsExact(List<List<GeoCell>> cells, int nCols, List<double> docGrid, WidthSpec? tblW, bool fixedLayout, double geoBase, double avail)
    {
        string tw = PrefOf(tblW);
        double? T0 = tw == "dxa" ? tblW!.W : tw == "pct" ? (geoBase * tblW!.W) / 5000 : null;
        var all = cells.SelectMany(r => r).ToList();
        if (fixedLayout)
        {
            double GridSum(GeoCell c) => docGrid.Skip(c.Col).Take(c.Span).Aggregate(0.0, (a, b) => a + b);
            double tRef = T0 ?? geoBase;
            var wf = BoundaryWidths(cells, nCols, c =>
            {
                string k = PrefOf(c.TcW);
                return k == "dxa" ? c.TcW!.W : k == "pct" ? (tRef * c.TcW!.W) / 5000 : GridSum(c);
            });
            double sum = wf.Aggregate(0.0, (a, b) => a + b);
            return FixedMins(cells, T0 is { } t0f && sum > 0 ? wf.Select(v => (v * t0f) / sum).ToList() : wf);
        }
        var m = new Dictionary<GeoCell, (double Min, double Max)>(ReferenceEqualityComparer.Instance);
        foreach (var c in all) m[c] = c.Measure();
        var g1 = BoundaryWidths(cells, nCols, c => m[c].Min, _ => true);
        double MinOf(GeoCell c) => m[c].Min;
        if (all.Count > 0 && all.All(c => PrefOf(c.TcW) == "pct"))
        {
            // só pct (como o Word grava o .doc convertido): frações por fronteira, mescladas inclusive
            double Tp = T0 ?? Math.Min(all.Max(c => (m[c].Max * 5000) / c.TcW!.W), avail);
            var pp = BoundaryWidths(cells, nCols, c => (Tp * c.TcW!.W) / 5000);
            // passou de 100%: a última fica com o que sobra (f2)
            double roomP = Tp;
            for (int j = 0; j < nCols; j++) { pp[j] = Math.Max(0, Math.Min(pp[j], roomP)); roomP -= pp[j]; }
            FitPctMins(pp, all, MinOf, g1, _ => true);
            double sp = pp.Aggregate(0.0, (a, b) => a + b);
            // a palavra mais longa alarga a tabela além do pedido: até a área de texto se o pedido
            // é ≤ 100%; acima de 100%, sem limite (oráculo tblpctmin)
            double cap = T0 is { } t0c && t0c > geoBase + 0.5 ? double.PositiveInfinity : Math.Max(Tp, geoBase);
            if (sp > cap + 0.5) return pp.Select(v => (v * cap) / sp).ToList();
            return sp > 0 && Tp > sp + 0.5 ? pp.Select(v => (v * Tp) / sp).ToList() : pp;
        }
        // coluna em pct: célula sem mescla em pct e nenhuma em dxa; a fração é a maior
        var frac = Enumerable.Range(0, nCols).Select(j =>
        {
            var own = all.Where(c => c.Span == 1 && c.Col == j).ToList();
            if (!own.Any(c => PrefOf(c.TcW) == "pct") || own.Any(c => PrefOf(c.TcW) == "dxa")) return 0.0;
            return own.Where(c => PrefOf(c.TcW) == "pct").Max(c => c.TcW!.W / 5000);
        }).ToList();
        var isPct = frac.Select(f => f > 0).ToList();
        // tipo de cada célula para os palpites: pct só a de coluna pct; pct mesclada vale como dxa
        (string K, double W) Kind(GeoCell c, double T)
        {
            string k = PrefOf(c.TcW);
            if (k == "pct") return c.Span == 1 && c.Col < nCols && isPct[c.Col] ? ("pct", 0) : ("dxa", (T * c.TcW!.W) / 5000);
            return (k, k == "dxa" ? c.TcW!.W : 0);
        }
        double SumOf(List<double> v, Func<int, bool> pick)
        {
            double a = 0;
            for (int j = 0; j < v.Count; j++) if (pick(j)) a += v[j];
            return a;
        }
        var gMax = BoundaryWidths(cells, nCols, c => m[c].Max, _ => true);
        // larguras pedidas (dxa) por fronteira; as de conteúdo das mescladas, repartidas
        List<double> G3of(double T) => BoundaryWidths(cells, nCols, c => { var q = Kind(c, T); return q.K == "dxa" ? Math.Max(q.W, m[c].Min) : m[c].Min; }, c => Kind(c, T).K != "dxa");
        List<double> G4of(double T) => BoundaryWidths(cells, nCols, c => { var q = Kind(c, T); var mm = m[c]; return q.K == "dxa" ? Math.Max(q.W, mm.Min) : q.K == "auto" ? mm.Max : mm.Min; }, c => Kind(c, T).K != "dxa");
        double Tt;
        if (T0 is { } t0v) Tt = t0v;
        else
        {
            var g4a = G4of(0);
            double rest = SumOf(g4a, j => !isPct[j]);
            double fr = Math.Min(1, frac.Sum());
            double t = rest;
            if (fr > 0)
            {
                // a menor largura em que cada coluna pct cabe na sua fração, e as demais no resto
                for (int j = 0; j < nCols; j++) if (isPct[j]) t = Math.Max(t, gMax[j] / frac[j]);
                if (fr < 1) t = Math.Max(t, rest / (1 - fr));
            }
            Tt = Math.Min(t, avail);
        }
        bool isExplicit = T0 is not null;
        // colunas em pct
        var p = Enumerable.Repeat(0.0, nCols).ToList();
        if (isPct.Any(x => x))
        {
            double room = Tt - SumOf(g1, j => !isPct[j]);
            for (int j = 0; j < nCols; j++) if (isPct[j]) { p[j] = Math.Max(0, Math.Min(frac[j] * Tt, room)); room -= p[j]; }
            FitPctMins(p, all.Where(c => c.Span == 1).ToList(), MinOf, g1, k => isPct[k]);
        }
        bool Np(int j) => !isPct[j];
        if (!isPct.Any(x => !x))
        {
            double sp = SumOf(p, _ => true);
            return sp > 0 && Tt > sp + 0.5 ? p.Select(v => (v * Tt) / sp).ToList() : p;
        }
        double R = Tt - SumOf(p, _ => true);
        var g3 = G3of(Tt);
        var g4 = G4of(Tt);
        double S1 = SumOf(g1, Np), S3 = SumOf(g3, Np), S4 = SumOf(g4, Np);
        List<double> Lerp(List<double> a, List<double> b, double t) => a.Select((x, j) => isPct[j] ? p[j] : x + (b[j] - x) * t).ToList();
        if (R >= S4 - 0.5)
        {
            // sobra: cresce a automática (proporcional ao conteúdo); sem ela, as dxa — coluna sem
            // célula nenhuma (gridBefore/gridAfter sem largura) fica com zero (tblw h3)
            bool Covered(int j) => all.Any(c => c.Col <= j && c.Col + c.Span > j);
            var grow = Enumerable.Range(0, nCols).Select(j => Np(j) && Covered(j) && !all.Any(c => c.Col <= j && c.Col + c.Span > j && Kind(c, Tt).K != "auto")).ToList();
            if (!grow.Any(g => g)) grow = isPct.Select((x, j) => !x && Covered(j)).ToList();
            double wsum = SumOf(g4, j => grow[j]);
            int n = grow.Count(g => g);
            return g4.Select((x, j) => isPct[j] ? p[j] : grow[j] ? x + ((R - S4) * (wsum > 0 ? x / wsum : 1.0 / n)) : x).ToList();
        }
        if (R >= S3) return Lerp(g3, g4, (R - S3) / (S4 - S3));
        if (R >= S1) return Lerp(g1, g3, S3 > S1 ? (R - S1) / (S3 - S1) : 0);
        // pisos de noWrap (tcW dxa) que não cabem: a tabela passa do tblW até a largura
        // disponível (se o tblW já passa dela, fica na soma dos pisos); acima disso os pisos
        // encolhem em proporção à área de texto, largura − margens (oráculo nowrap, nw-piso)
        if (all.Any(c => c.Floor) && !isPct.Any(v => v) && !(isExplicit && Tt > avail) && S1 > avail + 0.5)
        {
            var pad = Enumerable.Range(0, nCols).Select(j => all.Where(c => c.Span == 1 && c.Col == j).Aggregate(0.0, (mx, c) => Math.Max(mx, c.Pad ?? 0))).ToList();
            var inner = g1.Select((xv, j) => Math.Max(0, xv - pad[j])).ToList();
            double si = inner.Aggregate(0.0, (a, b) => a + b), cut = S1 - avail;
            return g1.Select((xv, j) => xv - (si > 0 ? (cut * inner[j]) / si : cut / nCols)).ToList();
        }
        // nem os mínimos cabem: com tblW a tabela cresce (f6) — mas se eles passam da largura
        // disponível e o pedido é pct até 100% ou twips abaixo dela, a tabela vai à
        // largura disponível e espreme como a automática; twips ≥ disponível, cresce (oráculo
        // tblsqueeze); automática, espreme (d9) — se a grade gravada já tem essa largura, ela
        // é o aperto que o próprio Word calculou
        if (isExplicit)
        {
            if (!(S1 > avail + 0.5 && (tw == "pct" ? Tt <= avail + 0.5 : Tt < avail - 0.5))) return g3.Select((x, j) => isPct[j] ? p[j] : x).ToList();
            R += avail - Tt;
            Tt = avail;
        }
        double sg = docGrid.Sum();
        if (!isPct.Any(x => x) && Math.Abs(sg - Tt) <= Math.Max(20, 0.005 * Tt)) return docGrid.Select(x => (x * Tt) / sg).ToList();
        return g1.Select((x, j) => isPct[j] ? p[j] : S1 > 0 ? (x * R) / S1 : x).ToList();
    }

    /// <summary>
    /// Larguras do conteúdo de uma célula para o autoajuste: mínima = maior trecho sem
    /// oportunidade de quebra; máxima = maior linha sem quebrar (tabs nas paradas).
    /// Recuos do parágrafo e margens da célula somados. Tabela aninhada: a largura dela.
    /// </summary>
    private static (double Min, double Max) MeasureCell(DocContext ctx, TableCell cell, Resolved r, double mar)
    {
        var blocks = cell.Blocks ?? cell.Paragraphs.Select(p => (Block)new ParagraphBlock { Paragraph = p }).ToList();
        var env = new ParaEnv { TablePPr = r.PPr, TableRPr = r.RPr };
        double min = 0, max = 0;
        ctx.Pure(() =>
        {
            foreach (var b in blocks)
            {
                if (b is TableBlock tb)
                {
                    string k = PrefOf(tb.TblPr?.TblW);
                    double w = k == "dxa" ? tb.TblPr!.TblW!.W : k == "pct" ? 0 : tb.GridColsTwips.Aggregate(0.0, (a, g) => a + g);
                    // a mínima de uma tabela aninhada é a do CONTEÚDO dela (palavra mais longa
                    // de cada coluna), não a grade — a grade só pesa na máxima (oráculo tblover, tov-in-*)
                    double nMin = 0;
                    foreach (var row in tb.Rows)
                    {
                        double sum = 0;
                        foreach (var nc in row.Cells) sum += MeasureCell(ctx, nc, new Resolved { PPr = new PPr(), RPr = new RPr() }, 216).Min;
                        nMin = Math.Max(nMin, sum);
                    }
                    min = Math.Max(min, k == "dxa" ? w : nMin);
                    max = Math.Max(max, w);
                    continue;
                }
                if (b is not ParagraphBlock pb) continue;
                var pw = ParaContentWidths(Para.PrepareParagraph(ctx, pb.Paragraph, env), ctx.Fmt.Settings.DefaultTabStop);
                // objeto ancorado na célula com quebra: a coluna automática alarga até caber nele (oráculo cellwrap)
                double ow = AnchoredWidth(ctx, pb.Paragraph);
                min = Math.Max(min, Math.Max(pw.Min, ow));
                max = Math.Max(max, Math.Max(pw.Max, ow));
            }
            return 0;
        });
        // o Word arredonda a largura do conteúdo para cima, em twips inteiros; vazio (ou só
        // espaços) mede 6 twips em qualquer tamanho de fonte (tblw e1 + sondas de largura)
        return (Math.Max(6, Math.Ceiling(min - 1e-6)) + mar, Math.Max(6, Math.Ceiling(max - 1e-6)) + mar);
    }

    /// <summary>Largura dos objetos ancorados no parágrafo da célula com quebra de texto (layoutInCell);
    /// caixa que se ajusta ao texto sem quebrar: a linha mais longa + margens (oráculo cellwrap)</summary>
    private static double AnchoredWidth(DocContext ctx, Paragraph para)
    {
        double w = 0;
        foreach (var run in para.Runs)
        {
            bool floating; DrawingAnchor? anc; double tw0;
            if (run.Image is { } im) { floating = im.Floating; anc = im.Anchor; tw0 = im.WidthTwips; }
            else if (run.Shape is { } sh) { floating = sh.Floating; anc = sh.Anchor; tw0 = sh.WidthTwips; }
            else if (run.Group is { } gr) { floating = gr.Floating; anc = gr.Anchor; tw0 = gr.WidthTwips; }
            else if (run.Textbox is { } tbx) { floating = tbx.Floating; anc = tbx.Anchor; tw0 = tbx.WidthTwips; }
            else continue;
            if (!floating || anc is null || anc.Wrap == "none" || anc.Wrap == "inline" || anc.LayoutInCell == false) continue;
            double ow = tw0;
            var tb = run.Textbox;
            if (tb is not null && tb.AutoFit && tb.NoWrap)
            {
                double tw = 0;
                foreach (var tp in tb.Paras) tw = Math.Max(tw, ParaContentWidths(Para.PrepareParagraph(ctx, tp, new ParaEnv()), ctx.Fmt.Settings.DefaultTabStop).Max);
                ow = tw + (tb.Insets?.L ?? 144) + (tb.Insets?.R ?? 144);
            }
            w = Math.Max(w, ow);
        }
        return w;
    }

    private static (double Min, double Max) ParaContentWidths(PreparedPara p, double defaultTab)
    {
        var tabs = p.Tabs.Where(t => t.Val != "bar").Select(t => t.Pos).OrderBy(v => v).ToList();
        double dts = defaultTab > 0 ? defaultTab : 720;
        double NextTab(double x)
        {
            double? t = null;
            foreach (var pos in tabs) if (pos > x + 0.5) { t = pos; break; }
            if (p.FirstLine < 0 && p.IndLeft > x + 0.5 && (t is null || p.IndLeft < t)) return p.IndLeft;
            if (t is { } tv) return tv;
            return (Math.Floor(Math.Max(x, tabs.Count > 0 ? tabs[^1] : x) / dts + 1e-6) + 1) * dts;
        }
        double x = p.IndLeft + p.FirstLine;
        if (p.Marker is not null)
        {
            x += p.Marker.Width;
            if (p.Marker.Suff == "tab") x = NextTab(x);
            else if (p.Marker.Suff == "space") x += p.MarkStyle.SizePt * 5;
        }
        double end = x, max = 0, min = 0, seg = 0;
        bool first = true;
        // a 1ª palavra começa no recuo da 1ª linha (com deslocamento, antes do recuo esquerdo)
        // — com número de lista, depois dele e da sua tabulação: não há quebra entre o número
        // e a 1ª palavra (oráculo tblnum)
        double x0 = x;
        void Flush()
        {
            if (seg > 0) min = Math.Max(min, seg + Math.Max(0, first ? x0 : p.IndLeft) + p.IndRight);
            if (seg > 0) first = false;
            seg = 0;
        }
        foreach (var g in p.Glyphs)
        {
            if (g.Kind is GlyphKind.Pb or GlyphKind.Cb) continue;
            if (g.Kind == GlyphKind.Lb) { Flush(); max = Math.Max(max, end + p.IndRight); x = p.IndLeft; end = x; continue; }
            if (g.Kind == GlyphKind.Tab) { Flush(); x = NextTab(x); continue; }
            x += g.Adv;
            if (g.Kind == GlyphKind.Space) { Flush(); continue; }
            end = x;
            seg += g.Adv;
            if (g.BreakAfter) Flush();
        }
        Flush();
        max = Math.Max(max, end + p.IndRight);
        return (min, max);
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
        /// <summary>margens de cima/baixo efetivas (as da linha onde a mescla começa — oráculo cellpic)</summary>
        public double MarT, MarB;
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
        // margem lateral de célula sem definição: 108 twips só sem estilo de tabela algum
        double defMar = style.HasStyle ? 0 : 108;
        // w:doNotVertAlignCellWithSp (modos ≤ 14): célula com forma ancorada fica no topo (oráculo vcfloat)
        bool noVaSp = ctx.Fmt.Settings.CompatibilityMode < 15 && ctx.Fmt.Settings.Compat.TryGetValue("doNotVertAlignCellWithSp", out var nvs) && nvs;
        string? VaOf(CellContent? c, string? v) => noVaSp && c is { Shape: true } ? null : v;
        int nRows = table.Rows.Count;

        // ── nº de colunas da grade (a grade gravada só vale como largura no layout fixo
        //    para células sem tcW — oráculo tblw d2/d3; no autoajuste o Word a recalcula) ──
        double usedColsD = Math.Max(1, table.Rows.Count == 0 ? double.NegativeInfinity : table.Rows.Max(r =>
            r.Cells.Aggregate(0.0, (s, c) => s + Math.Max(1, c.TcPr?.GridSpan ?? c.GridSpan)) + (r.TrPr?.GridBefore ?? 0) + (r.TrPr?.GridAfter ?? 0)));
        int usedCols = ToIntSafe(usedColsD);
        var docGrid = table.GridColsTwips.Select(g => (double)g).ToList();
        if (docGrid.Count == 0 || docGrid.All(g => g <= 0))
        {
            double? tw0 = WidthTw(tblPr.TblW, frameWidth);
            double total = tw0 is { } t0 && t0 != 0 && !double.IsNaN(t0) ? t0 : frameWidth;
            docGrid = Enumerable.Range(0, Math.Max(0, usedCols)).Select(_ => total / usedColsD).ToList();
        }
        else if (docGrid.Count < usedCols)
        {
            // linhas com mais colunas que a grade: completa com a largura média
            double avg = docGrid.Sum() / docGrid.Count;
            while (docGrid.Count < usedCols) docGrid.Add(avg);
        }
        int nCols = docGrid.Count;

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
            else foreach (var s in slots[k])
            {
                if (!s.Merged) m = Math.Max(m, Paint.BorderWidth(TopWinner(s)));
                // dentro de mescla vertical a borda inferior PRÓPRIA da célula de cima também
                // ocupa a divisa (não é desenhada ali) — oráculo vmdouble
                else foreach (var u in Covering(k - 1, s.Col, s.Col + s.Span)) m = Math.Max(m, Paint.BorderWidth(Edge(u, "bottom")));
            }
            band.Add(m);
        }

        // ── geometria: largura da tabela, das colunas e posição (oráculos tblpct/tblw) ──
        // Modo < 15 (tabela do topo; a aninhada segue o modo 15 — tblw d13): o TEXTO da 1ª/última
        // célula fica no quadro e a tabela sai pelas margens da célula (ou meia borda, se maior):
        // 100% = quadro + margens. Modo 15: as bordas EXTERNAS ficam no quadro — a grade
        // (centro das bordas) vai de meia borda a meia borda: 100% = quadro − bordas/2.
        bool legacy = ctx.Fmt.Settings.CompatibilityMode < 15 && !NestedRef.IsMatch(reference);
        var row0 = slots.Count > 0 ? slots[0] : new List<CellSlot>();
        CellSlot? sFirst = row0.Count > 0 ? row0[0] : null, sLast = row0.Count > 0 ? row0[^1] : null;
        double MarOf(CellSlot s, string side)
        {
            var ex = s.Row < table.Rows.Count ? table.Rows[s.Row].TblPrEx : null;
            var rtm = resolved.TryGetValue(s, out var rr) ? rr.TcPr.TcMar : null;
            var m = (side == "left" ? rtm?.Left : rtm?.Right) ?? (side == "left" ? ex?.TblCellMar?.Left : ex?.TblCellMar?.Right) ?? (side == "left" ? tblPr.TblCellMar?.Left : tblPr.TblCellMar?.Right);
            return WidthTw(m, frameWidth) ?? defMar;
        }
        double bL = sFirst is not null ? Paint.BorderWidth(Edge(sFirst, "left")) : 0;
        double bR = sLast is not null ? Paint.BorderWidth(Edge(sLast, "right")) : 0;
        double effL = sFirst is not null ? Math.Max(MarOf(sFirst, "left"), bL / 2) : 108;
        double effR = sLast is not null ? Math.Max(MarOf(sLast, "right"), bR / 2) : 108;
        // largura de 100% (pct) e máximo do autoajuste
        double geoBase = legacy ? frameWidth + effL + effR : frameWidth - (bL + bR) / 2;
        // espaçamento entre células (bordas separadas): no autoajuste cada célula ocupa também
        // 2× o espaçamento (a 1ª e a última coluna, mais um: a borda da tabela) — somado à
        // largura pedida e ao conteúdo; as bordas laterais da célula, inteiras, só ao conteúdo
        // (oráculo tblsp)
        double SpacingOf(int ri) => WidthTw((ri < table.Rows.Count ? table.Rows[ri].TrPr?.TblCellSpacing : null) ?? tblPr.TblCellSpacing, frameWidth) ?? 0;
        var rawMeasure = new Dictionary<CellSlot, (double Min, double Max)>(ReferenceEqualityComparer.Instance);
        // margem efetiva: borda mais larga que o dobro da margem empurra o texto (como no
        // desenho) e alarga também o mínimo/máximo da coluna (oráculo tblbdmin)
        double PadOf(CellSlot s) => new[] { "left", "right" }.Aggregate(0.0, (a, side) => a + (SpacingOf(s.Row) > 0 ? MarOf(s, side) : Math.Max(MarOf(s, side), Paint.BorderWidth(Edge(s, side)) / 2)));
        (double Min, double Max) RawOf(CellSlot s)
        {
            if (!rawMeasure.TryGetValue(s, out var mm)) rawMeasure[s] = mm = MeasureCell(ctx, s.Cell, resolved[s], PadOf(s));
            return mm;
        }
        var geoCells = new List<List<GeoCell>>();
        for (int ri = 0; ri < slots.Count; ri++)
        {
            var rs = slots[ri];
            var outc = new List<GeoCell>();
            double sp = SpacingOf(ri);
            foreach (var s in rs)
            {
                var sc = s;
                var tcW0 = resolved[s].TcPr.TcW;
                double exSp = sp > 0 ? 2 * sp + (s.Col == 0 ? sp : 0) + (s.Col + s.Span >= nCols ? sp : 0) : 0;
                double ex = sp > 0 ? exSp + Paint.BorderWidth(Edge(s, "left")) + Paint.BorderWidth(Edge(s, "right")) : 0;
                var tcW = tcW0 is not null && exSp != 0 && PrefOf(tcW0) == "dxa" ? new WidthSpec { W = tcW0.W + exSp, Type = tcW0.Type } : tcW0;
                // w:noWrap (oráculo nowrap): sem largura pedida em twips (automática ou pct), a célula
                // não quebra — a mínima é a largura sem quebrar (se nem assim a linha cabe na largura
                // disponível, fica a mínima comum); com tcW dxa, a célula não encolhe abaixo do tcW
                // (o texto ainda quebra nele)
                bool nw = resolved[s].TcPr.NoWrap == true;
                bool noWrap = nw && PrefOf(tcW0) != "dxa";
                double floorW = nw && PrefOf(tcW0) == "dxa" ? tcW0!.W : 0;
                string? tdir = resolved[s].TcPr.TextDirection;
                bool vertical = tdir is "btLr" or "tbRl" or "tbRlV";
                var rsC = rs;
                (double Min, double Max) Measure()
                {
                    if (vertical)
                    {
                        // texto vertical: a largura é a "altura" do conteúdo sem quebrar (oráculo tblvert)
                        var rr = resolved[sc];
                        var c = ctx.Pure(() => layoutCell(sc.Cell, 0, 31680, new CellEnv { TablePPr = rr.PPr, TableRPr = rr.RPr }, $"{reference}/r{sc.Row}/c{sc.Col}"));
                        // cada linha ocupa 37/36 da sua altura, em twips inteiros; espaçamentos como estão
                        double linesH = c.Lines.Aggregate(0.0, (a, l) => a + l.Height);
                        double vh = c.Lines.Aggregate(0.0, (a, l) => a + Js.Round((l.Height * 37) / 36)) + Math.Max(0, c.Height - linesH);
                        double wv = vh + 6 + PadOf(sc);
                        return (wv + ex, wv + ex);
                    }
                    var mm = RawOf(sc);
                    bool Fits() => mm.Max + rsC.Aggregate(0.0, (a, o) => a + (ReferenceEquals(o, sc) ? 0 : RawOf(o).Min)) <= geoBase;
                    double mn = noWrap && Fits() ? mm.Max : Math.Max(mm.Min, floorW);
                    return (mn + ex, Math.Max(mm.Max, mn) + ex);
                }
                outc.Add(new GeoCell { Col = s.Col, Span = s.Span, TcW = tcW, Measure = Measure, Floor = floorW != 0, Pad = PadOf(s) + ex });
            }
            var tr = ri < table.Rows.Count ? table.Rows[ri].TrPr : null;
            // gridBefore/gridAfter com wBefore/wAfter: células "vazias" de largura dada
            if (tr?.GridBefore is { } gb && gb != 0 && tr.WBefore is { Type: "dxa" } wb && wb.W > 0)
                outc.Insert(0, new GeoCell { Col = 0, Span = ToIntSafe(gb), TcW = wb, Measure = () => (0, 0) });
            int end = rs.Count > 0 ? rs[^1].Col + rs[^1].Span : 0;
            if (tr?.GridAfter is { } ga && ga != 0 && tr.WAfter is { Type: "dxa" } wa && wa.W > 0)
                outc.Add(new GeoCell { Col = end, Span = ToIntSafe(ga), TcW = wa, Measure = () => (0, 0) });
            geoCells.Add(outc);
        }
        // tabela flutuante: posicionada pelo chamador (âncoras do tblpPr) — sem recuo/alinhamento
        bool floating = tblPr.TblpPr is not null && tblPr.TblpPr.TblpYSpec != "inline";
        // sem w:jc na tabela, vale o da 1ª linha (trPr — oráculo rowjc)
        string? jc = floating ? null : tblPr.Jc ?? (table.Rows.Count > 0 ? table.Rows[0].TrPr?.Jc : null);
        double indent = floating || jc is "center" or "right" or "end" ? 0 : WidthTw(tblPr.TblInd, frameWidth) ?? 0;
        // a tabela automática vai do recuo até a margem direita (tblw f7)
        // (centralizada, nos modos ≤ 14 o tblInd não posiciona mas ainda entra na largura máxima —
        // negativo alarga, positivo estreita — oráculo tblindctr)
        double maxInd = legacy && jc == "center" && !floating ? WidthTw(tblPr.TblInd, frameWidth) ?? 0 : indent;
        var grid = ColumnWidths(geoCells, nCols, docGrid, tblPr.TblW, tblPr.TblLayout == "fixed", geoBase, geoBase - maxInd);
        double width = grid.Aggregate(0.0, (a, b) => a + b);
        var colX = new List<double> { 0 };
        foreach (var g in grid) colX.Add(colX[^1] + g);
        double ColAt(int i) => i >= 0 && i < colX.Count ? colX[i] : double.NaN; // colX[i] fora = undefined → NaN
        double x = frameX + indent + (legacy ? -effL : bL / 2);
        // centralizada: no meio do quadro; à direita: o espelho da esquerda (tblw a5/a9)
        if (jc == "center") x = frameX + (frameWidth - width) / 2;
        else if (jc is "right" or "end") x = frameX + frameWidth - width + (legacy ? effR : -bR / 2);
        // w:alignTablesRowByRow (modos < 15): cada linha alinha sozinha pelo seu jc (o da linha ou
        // o da tabela) — centralizada ou à direita só as CÉLULAS, sem o vão do gridBefore/gridAfter
        // (oráculo rowjc; .doc convertido com linhas deslocadas)
        bool rowByRow = legacy && !floating && ctx.Fmt.Settings.Compat.TryGetValue("alignTablesRowByRow", out var rbr) && rbr;
        double RowShift(int ri)
        {
            string? rjc = (ri < table.Rows.Count ? table.Rows[ri].TrPr?.Jc : null) ?? jc;
            var rsl = ri < slots.Count ? slots[ri] : new List<CellSlot>();
            if (!rowByRow || rsl.Count == 0 || (rjc != "center" && rjc != "right" && rjc != "end")) return 0;
            double c0 = ColAt(Math.Min(rsl[0].Col, nCols)), c1 = ColAt(Math.Min(rsl[^1].Col + rsl[^1].Span, nCols));
            double want = rjc == "center" ? frameX + (frameWidth - (c1 - c0)) / 2 : frameX + frameWidth - (c1 - c0) + effR;
            return want - (x + c0);
        }

        // ── bordas SEPARADAS (oráculos cellsp/cellsp2) ──
        // tblCellSpacing presente (mesmo 0), na tabela ou em alguma linha: cada célula desenha
        // as PRÓPRIAS bordas dentro da sua caixa e a borda externa da tabela contorna tudo.
        // Entre células, entre linhas e entre a borda externa e as células: 2× o espaçamento.
        // Caixa da célula: [B_i + s, B_(i+1) − s], com B_0 = grade_0 + s, B_n = grade_n − s e
        // as divisas internas na própria grade (oráculo tblsp).
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
        // divisas: as internas na própria grade; as externas um espaçamento para dentro (oráculo tblsp)
        double SepB(int i) => i <= 0 ? g0 + spTbl : i >= nCols ? gn - spTbl : ColAt(i);

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
            // propriedades da linha com as do estilo da tabela (trPr do estilo e da 1ª linha
            // condicional: cantSplit, tblHeader — oráculo tblstyletr)
            var trp = (style.TrPr ?? new TrPr())
                .With(look.FirstRow == true && ri == 0 && style.Cond.TryGetValue("firstRow", out var frPart) ? frPart.TrPr : null)
                .With(row.TrPr);
            double contentH = 0;
            var cellInfos = new List<CellInfo>();
            double shiftR = RowShift(ri);
            foreach (var s in slots[ri])
            {
                var rs = resolved[s];
                // bordas separadas: caixa da célula (bx) e área do conteúdo (x) dentro das bordas dela
                double bx0 = (separated ? SepB(Math.Min(s.Col, nCols)) + spTbl : ColAt(Math.Min(s.Col, nCols))) + shiftR;
                double bx1 = (separated ? SepB(Math.Min(s.Col + s.Span, nCols)) - spTbl : ColAt(Math.Min(s.Col + s.Span, nCols))) + shiftR;
                double x0r = bx0, x1r = bx1;
                var mar = (tblPr.TblCellMar ?? new CellMargins()).With(ex?.TblCellMar).With(rs.TcPr.TcMar);
                // bordas colapsadas: o texto fica pelo menos meia borda depois da linha da grade (tblw a11)
                double marL = Math.Max(WidthTw(mar.Left, width) ?? defMar, separated ? 0 : Paint.BorderWidth(Edge(s, "left")) / 2);
                double marR = Math.Max(WidthTw(mar.Right, width) ?? defMar, separated ? 0 : Paint.BorderWidth(Edge(s, "right")) / 2);
                double marT = WidthTw(mar.Top, width) ?? 0;
                double marB = WidthTw(mar.Bottom, width) ?? 0;
                // texto: borda da célula + margem; com espaçamento 0 o Word conta só meia borda
                // (como no modelo colapsado), mas nunca menos que a borda inteira
                double wl = separated ? Paint.BorderWidth(Edge(s, "left")) : 0, wr = separated ? Paint.BorderWidth(Edge(s, "right")) : 0;
                double x0 = !separated ? x0r : spTbl > 0 ? x0r + wl : x0r + Math.Max(wl - marL, wl / 2);
                double x1 = !separated ? x1r : spTbl > 0 ? x1r - wr : x1r - Math.Max(wr - marR, wr / 2);
                // fundo escuro na célula: texto de cor automática vira branco
                var env = new CellEnv { TablePPr = rs.PPr, TableRPr = rs.RPr, DarkBackground = Para.IsDark(CellFill(rs.TcPr, theme)) };
                string? td = rs.TcPr.TextDirection;
                string? vertical = td is "btLr" or "tbRl" or "tbRlV" ? td : null;
                var info = new CellInfo { Slot = s, TcPr = rs.TcPr, X0 = x0, X1 = x1, Bx0 = bx0, Bx1 = bx1, MarT = marT, MarB = marB, MarL = marL, MarR = marR, Env = env, Vertical = vertical };
                if (!s.Merged)
                {
                    if (vertical is not null)
                    {
                        // texto vertical: diagramado depois que a altura das outras células é conhecida
                        if (s.RowSpan != 1) pendingMerges.Add(new PendingMerge { Slot = s, Content = null, TcPr = rs.TcPr, X0 = x0, X1 = x1, StartRow = ri, Vertical = vertical, MarL = marL, MarR = marR, MarT = marT, MarB = marB, Env = env });
                    }
                    else
                    {
                        var content = layoutCell(s.Cell, x + x0 + marL, Math.Max(1, x1 - x0 - marL - marR), new CellEnv { TablePPr = env.TablePPr, TableRPr = env.TableRPr, DarkBackground = env.DarkBackground, CellMar = (marL, marR, BandTopOf(ri) + marT) }, $"{reference}/r{ri}/c{s.Col}");
                        info.Content = content;
                        if (s.RowSpan == 1) contentH = Math.Max(contentH, content.Height + marT + marB);
                        else pendingMerges.Add(new PendingMerge { Slot = s, Content = content, TcPr = rs.TcPr, X0 = x0, X1 = x1, StartRow = ri, MarL = marL, MarR = marR, MarT = marT, MarB = marB, Env = env });
                    }
                }
                cellInfos.Add(info);
            }
            // margens de cima/baixo: a MAIOR da linha vale para todas as células dela — mesmo com
            // tcMar 0 explícito ou a da tabela (oráculo rowmar)
            double rowMarT = cellInfos.Aggregate(0.0, (mx, ci) => Math.Max(mx, ci.MarT)), rowMarB = cellInfos.Aggregate(0.0, (mx, ci) => Math.Max(mx, ci.MarB));
            foreach (var ci in cellInfos)
            {
                if (ci.MarT == rowMarT && ci.MarB == rowMarB) continue;
                ci.MarT = rowMarT;
                ci.MarB = rowMarB;
                if (ci.Content is not null && !ci.Slot.Merged && ci.Slot.RowSpan == 1 && ci.Vertical is null) contentH = Math.Max(contentH, ci.Content.Height + rowMarT + rowMarB);
            }
            // mesclas que começam nesta linha: as margens de cima/baixo efetivas (da tabela ou
            // da célula, a maior da linha) — antes só as da célula (tcMar) contavam (oráculo cellpic)
            foreach (var m in pendingMerges) if (m.StartRow == ri) { m.MarT = rowMarT; m.MarB = rowMarB; }
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
            // divisa cuja borda é só a de BAIXO da célula de cima (as de baixo sem borda
            // de cima própria): ela fica dentro da margem superior da célula de baixo — o
            // texto começa em máx(borda, margem). Com borda de cima própria (ou na 1ª
            // linha) a faixa soma — oráculos marborder, tcell
            double minMarT = double.PositiveInfinity, ownTop = 0;
            foreach (var ci in cellInfos)
            {
                if (ci.Slot.Merged) continue;
                minMarT = Math.Min(minMarT, ci.MarT);
                ownTop = Math.Max(ownTop, Paint.BorderWidth(Edge(ci.Slot, "top")));
            }
            bool absorb = !separated && ri > 0 && ownTop == 0 && double.IsFinite(minMarT);
            double bandTop = absorb ? Math.Max(0, BandTopOf(ri) - minMarT) : BandTopOf(ri);
            // altura exata inclui a faixa de borda de cima (oráculo tables/tb-cellmar)
            if (th?.HRule == "exact") h = Math.Max(0, th.Val - bandTop) + maxMarB;
            if (h <= 0) h = 0;
            double bandBottom = BandBottomOf(ri);
            // mesclas verticais que TERMINAM nesta linha: a última linha cresce se faltar altura
            // — menos com altura exata: a célula mesclada é recortada (oráculo vmexact)
            foreach (var m in pendingMerges)
            {
                if (th?.HRule == "exact") break;
                if (m.StartRow + m.Slot.RowSpan - 1 != ri || m.Content is null) continue;
                double spanned = rowHeights.Skip(m.StartRow).Aggregate(0.0, (a, b) => a + b) - BandTopOf(m.StartRow) + bandTop + h;
                double need = m.Content.Height + m.MarT + m.MarB;
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
                var mergeAt = new List<MergeAtInfo>();
                if (separated)
                {
                    // cada célula: fundo e as próprias bordas dentro da caixa; depois a borda externa
                    double cy0 = bTop - sepWT[riC], cy1 = bTop + ch + (bBottom > 0 ? sepWB[riC] : 0);
                    // o w:shd da TABELA pinta só o espaçamento em volta das células (oráculo tblshd, ts-cellsp)
                    string? tblFill = ShdFill(tblPr.Shd, theme);
                    if (tblFill is not null)
                    {
                        double sxl = x + g0, sxr = x + gn;
                        void Strip(double x0, double y0, double x1, double y1)
                        {
                            if (x1 - x0 > 0.01 && y1 - y0 > 0.01) its.Add(new RectItem { X = x0, Y = y0, W = x1 - x0, H = y1 - y0, Fill = tblFill });
                        }
                        Strip(sxl, 0, sxr, cy0);
                        Strip(sxl, cy1, sxr, rh);
                        double cx = sxl;
                        foreach (var ci in cellInfos.OrderBy(c => c.Bx0)) { Strip(cx, cy0, x + ci.Bx0, cy1); cx = Math.Max(cx, x + ci.Bx1); }
                        Strip(cx, cy0, sxr, cy1);
                    }
                    foreach (var ci in cellInfos)
                    {
                        var s = ci.Slot;
                        if (s.Merged) continue;
                        string? fill = CellFill(ci.TcPr, theme);
                        contents.TryGetValue(s, out var content);
                        if (fill is not null) its.Add(new RectItem { X = x + ci.Bx0, Y = cy0, W = ci.Bx1 - ci.Bx0, H = cy1 - cy0, Fill = fill });
                        if (s.RowSpan > 1) mergeAt.Add(new MergeAtInfo { Col = s.Col, At = its.Count, EndRow = riC + s.RowSpan - 1 });
                        if (s.RowSpan == 1)
                        {
                            if (content is not null && ci.Vertical is not null) PaintVertical(its, content, ci.Vertical, VaOf(content, ci.TcPr.VAlign), x + ci.X0 + ci.MarL, x + ci.X1 - ci.MarR, bTop + ci.MarT, bTop + ch - ci.MarB);
                            else if (content is not null) PlaceContent(its, lns, content, vTop ? "top" : VaOf(content, ci.TcPr.VAlign), ch, ci.MarT, ci.MarB, bTop);
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
                        Height = rh, Items = its, Lines = lns, BorderItems = brd, BreakBorderItems = brk, CantSplit = trp.CantSplit == true, Header = trp.TblHeader == true,
                        MergeAt = mergeAt.Count > 0 ? mergeAt : null, KeepNext = rowKeepNext, Natural = bTop + Math.Min(ch, contentHC) + bBottom,
                    };
                }
                // bordas de cima pintadas (divisa com a linha anterior) e as próprias da linha
                var topBrd = new List<PageItem>();
                var ownBrd = new List<PageItem>();
                double ownBand = 0;
                foreach (var ci in cellInfos)
                {
                    var s = ci.Slot;
                    string? fill = CellFill(ci.TcPr, theme);
                    contents.TryGetValue(s, out var content);
                    if (!s.Merged && s.RowSpan > 1) mergeAt.Add(new MergeAtInfo { Col = s.Col, At = its.Count, EndRow = riC + s.RowSpan - 1 });
                    if (!s.Merged && s.RowSpan == 1)
                    {
                        if (fill is not null) its.Add(new RectItem { X = x + ci.X0, Y = 0, W = ci.X1 - ci.X0, H = rh, Fill = fill });
                        if (content is not null && ci.Vertical is not null) PaintVertical(its, content, ci.Vertical, VaOf(content, ci.TcPr.VAlign), x + ci.X0 + ci.MarL, x + ci.X1 - ci.MarR, bTop + ci.MarT, bTop + ch - ci.MarB);
                        else if (content is not null) PlaceContent(its, lns, content, vTop ? "top" : VaOf(content, ci.TcPr.VAlign), ch, ci.MarT, ci.MarB, bTop);
                    }
                    // continuação de mescla: vale o fundo da célula inicial; o dela o Word ignora (oráculo vmshd)
                    var tcb = ci.TcPr.TcBorders;
                    // topo: na faixa de cima (continuação de linha partida: a borda de cima da célula)
                    var top = drawTop ? (s.Merged ? null : TopWinner(s)) : (Edge(s, "top") ?? Edge(s, "bottom"));
                    int nbBrd = brd.Count;
                    if (top is not null) Paint.PaintBorder(ctx, brd, top, x + ci.X0, Paint.BorderWidth(top) / 2, x + ci.X1, Paint.BorderWidth(top) / 2);
                    if (drawTop && riC > 0)
                    {
                        topBrd.AddRange(brd.Skip(nbBrd));
                        var own = Edge(s, "top");
                        ownBand = Math.Max(ownBand, Paint.BorderWidth(own));
                        if (own is not null && !s.Merged) Paint.PaintBorder(ctx, ownBrd, own, x + ci.X0, Paint.BorderWidth(own) / 2, x + ci.X1, Paint.BorderWidth(own) / 2);
                    }
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
                bool hasTopCut = drawTop && riC > 0 && bTop - ownBand > 0.5;
                return new RowLayout
                {
                    Height = rh, Items = its, Lines = lns, BorderItems = brd, BreakBorderItems = brk, CantSplit = trp.CantSplit == true, Header = trp.TblHeader == true,
                    MergeAt = mergeAt.Count > 0 ? mergeAt : null, KeepNext = rowKeepNext, Natural = bTop + Math.Min(ch, contentHC) + bBottom,
                    TopCut = hasTopCut ? bTop - ownBand : null, TopBorders = hasTopCut ? topBrd : null, OwnTopBorders = hasTopCut ? ownBrd : null,
                };
            }
            var full = new Dictionary<CellSlot, CellContent?>(ReferenceEqualityComparer.Instance);
            foreach (var ci in cellInfos) full[ci.Slot] = ci.Content;
            bool canSplit = trp.CantSplit != true && row.TrPr?.TrHeight?.HRule != "exact";
            // linha partida: a borda que fecha a parte de cima (a mais grossa da divisa) fica
            // abaixo do texto e também tem de caber na página (oráculo rowsplit)
            double brkW = 0;
            if (!separated)
            {
                foreach (var ci in cellInfos)
                {
                    var s = ci.Slot;
                    if (riC + 1 < slots.Count && slots[riC + 1].Any(o => o.Col == s.Col && o.Merged)) continue;
                    var w = Edge(s, "bottom");
                    foreach (var d in Covering(riC + 1, s.Col, s.Col + s.Span)) w = Heavier(w, Edge(d, "top"));
                    brkW = Math.Max(brkW, Paint.BorderWidth(w));
                }
            }
            // altura mínima (trHeight "atLeast") que não cabe no espaço livre: a linha não
            // parte, desce inteira — mesmo com conteúdo maior que ela (oráculo rowmin, modos 14/15)
            double minRow = th is not null && th.HRule != "exact" ? bandTop + th.Val + maxMar + bandBottom : 0;
            double contMin = th is not null && th.HRule != "exact" ? th.Val + maxMar : 0;
            double bandTopC = bandTop, bandBottomC = bandBottom;
            // linha (ou resto de linha) com divisão sob demanda entre páginas
            Func<double, Dictionary<CellSlot, CellContent?>, bool, bool, RowLayout> build = null!;
            build = (ch, contents, vTop, drawTop) =>
            {
                var r = PaintRow(ch, contents, vTop, drawTop, bandTopC, bandBottomC);
                if (brkW > 0 && riC < nRows - 1) r.BreakW = brkW;
                if (!canSplit) return r;
                r.Split = avail =>
                {
                    if (drawTop && minRow > avail + 0.5) return null;
                    var a = new Dictionary<CellSlot, CellContent?>(ReferenceEqualityComparer.Instance);
                    var rest = new Dictionary<CellSlot, CellContent?>(ReferenceEqualityComparer.Instance);
                    double h1 = 0, h2 = 0;
                    bool any = false;
                    double availContent = avail - bandTopC;
                    foreach (var ci in cellInfos)
                    {
                        contents.TryGetValue(ci.Slot, out var c);
                        if (c is null || ci.Slot.Merged || ci.Slot.RowSpan != 1) { a[ci.Slot] = c; continue; }
                        var sp = SplitContent(c, availContent - ci.MarT - ci.MarB - brkW);
                        if (sp is null)
                        {
                            // célula com texto que não põe nem a 1ª linha (ou só a órfã) nesta
                            // página: a linha da tabela desce inteira (oráculo rowwidow)
                            if (c.Lines.Count > 0) return null;
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
                    // o alinhamento vertical da célula vale dentro de CADA parte (oráculo splitvalign)
                    var firstPart = PaintRow(h1, a, false, drawTop, bandTopC, 0);
                    // a parte de cima fecha com a borda inferior da célula (no pé da página)
                    firstPart.BorderItems.AddRange(firstPart.BreakBorderItems ?? new List<PageItem>());
                    firstPart.BreakBorderItems = new List<PageItem>();
                    // o resto na página seguinte também tem a altura mínima (oráculo rowmin, rm3-cont-*)
                    return (firstPart, build(Math.Max(Math.Max(h2, 1), contMin), rest, false, false));
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
            string? fill = CellFill(m.TcPr, theme);
            if (fill is not null)
            {
                var fillItem = new RectItem { X = x + m.X0, Y = 0, W = m.X1 - m.X0, H = h, Fill = fill };
                first.Items.Insert(0, fillItem);
                foreach (var a in first.MergeAt ?? new List<MergeAtInfo>()) a.At++;
                if (!first.Header) (first.MergeFills ??= new List<MergeFill>()).Add(new MergeFill { Item = fillItem, End = endRow });
            }
            double marT = m.MarT, marB = m.MarB;
            // topo da célula mesclada no sistema de coordenadas da linha-alvo
            int sliceEnd = Math.Min(endRow, rows.Count - 1);
            double top = BandTopOf(m.StartRow) - rowHeights.Skip(m.StartRow).Take(Math.Max(0, sliceEnd - m.StartRow)).Aggregate(0.0, (a, b) => a + b);
            if (m.Vertical is not null)
            {
                var c = LayoutVertical(m.Slot, h - marT - marB, m.Env, $"{reference}/r{m.StartRow}/c{m.Slot.Col}");
                PaintVertical(target.Items, c, m.Vertical, VaOf(c, m.TcPr.VAlign), x + m.X0 + m.MarL, x + m.X1 - m.MarR, top + marT, top + h - marB);
            }
            else if (m.Content is not null)
            {
                int i0 = target.Items.Count, l0 = target.Lines.Count;
                PlaceContent(target.Items, target.Lines, m.Content, VaOf(m.Content, m.TcPr.VAlign), h, marT, marB, top);
                if (!ReferenceEquals(target, first))
                    (target.MergeText ??= new List<MergeTextInfo>()).Add(new MergeTextInfo
                    {
                        Col = m.Slot.Col, Items = target.Items.GetRange(i0, target.Items.Count - i0), Lines = target.Lines.GetRange(l0, target.Lines.Count - l0),
                        Dy = rowHeights.Skip(m.StartRow).Take(Math.Max(0, endRow - m.StartRow)).Aggregate(0.0, (a, b) => a + b),
                        Start = m.StartRow, Content = m.Content, MarT = marT, Band = BandTopOf(m.StartRow), VAlign = Js.Truthy(VaOf(m.Content, m.TcPr.VAlign)) ? VaOf(m.Content, m.TcPr.VAlign) : null,
                    });
            }
        }

        double borderLeft = slots.Count > 0 && slots[0].Count > 0 ? Paint.BorderWidth(Edge(slots[0][0], "left")) : 0;
        return new TableLayout { X = x, Width = width, Rows = rows, BorderLeft = borderLeft, EffR = legacy ? effR : null, TblpPr = tblPr.TblpPr };
    }

    private static readonly Regex PctRe = new(@"^pct(\d+)\z", RegexOptions.CultureInvariant);

    /// <summary>Preenchimento da célula: só o w:shd da CÉLULA (direto ou do w:tcPr do estilo,
    /// inclusive o condicional); o w:shd da tabela (w:tblPr, direto, do estilo ou do
    /// w:tblStylePr) não pinta a célula — com espaçamento entre células, pinta o vão
    /// (oráculo tblshd).</summary>
    private static string? CellFill(TcPr tcPr, Theme theme) => ShdFill(tcPr.Shd, theme);

    private static string? ShdFill(ShadingSpec? shd, Theme theme)
    {
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
        double free = rowH - marT - marB - (c.AlignH ?? c.Height);
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

    /// <summary>
    /// O Word grava o texto da célula mesclada na vertical na 1ª linha da mescla, na ordem
    /// das colunas (oráculo vmorder). Aqui ele vai para a linha <paramref name="ri"/> quando
    /// <paramref name="fits"/> garante que a mescla inteira fica na mesma página;
    /// <paramref name="moved"/> recebe os itens tirados da última.
    /// </summary>
    public static RowLayout MergeTextFirst(List<RowLayout> rows, int ri, RowLayout row, HashSet<object> moved, Func<double, bool> fits)
    {
        if (row.MergeAt is null || row.MergeAt.Count == 0) return row;
        var items = row.Items;
        var lines = row.Lines;
        foreach (var m in row.MergeAt.OrderByDescending(a => a.At).ThenByDescending(a => a.Col).ToList())
        {
            var mt = m.EndRow >= 0 && m.EndRow < rows.Count ? rows[m.EndRow].MergeText?.FirstOrDefault(xm => xm.Col == m.Col) : null;
            if (mt is null || !fits(rows.Skip(ri).Take(Math.Max(0, m.EndRow + 1 - ri)).Aggregate(0.0, (a, r) => a + r.Height))) continue;
            if (ReferenceEquals(items, row.Items)) { items = new List<PageItem>(items); lines = new List<LaidOutLine>(lines); }
            double dy = mt.Dy - (row.Cut ?? 0);
            items.InsertRange(m.At, mt.Items.Select(it => ShiftItem(it, dy)));
            foreach (var l in mt.Lines)
            {
                var nl = l.ShallowClone();
                nl.Y = l.Y + dy;
                nl.Baseline = l.Baseline + dy;
                lines.Add(nl);
            }
            foreach (var o in mt.Items) moved.Add(o);
            foreach (var o in mt.Lines) moved.Add(o);
        }
        if (ReferenceEquals(items, row.Items)) return row;
        var r2 = row.ShallowClone();
        r2.Items = items;
        r2.Lines = lines;
        return r2;
    }

    /// <summary>
    /// Linha inteira no topo da página com a anterior na outra (oráculo contband): o Word
    /// tira a divisa com a anterior — a faixa de cima fica só com a borda de cima da linha.
    /// Sobe o conteúdo <c>TopCut</c>, encurta fundos e bordas laterais e troca as bordas de cima.
    /// (Os itens de mescla vertical ficam como estão: a mescla começou na outra página.)
    /// </summary>
    public static RowLayout AtPageTop(RowLayout row)
    {
        double d = row.TopCut ?? 0;
        if (d <= 0) return row;
        double h = row.Height;
        var top = new HashSet<PageItem>(row.TopBorders ?? new List<PageItem>(), ReferenceEqualityComparer.Instance);
        var keep = new HashSet<object>(ReferenceEqualityComparer.Instance);
        foreach (var m in row.MergeText ?? new List<MergeTextInfo>()) { foreach (var o in m.Items) keep.Add(o); foreach (var o in m.Lines) keep.Add(o); }
        PageItem CutItem(PageItem it)
        {
            if (keep.Contains(it)) return it;
            if (it is RectItem r && r.Y == 0) { var c = (RectItem)r.ShallowClone(); c.H = r.H - d; return c; }
            if (it is LineItem ln && ln.Y1 == 0 && ln.Y2 == h) { var c = (LineItem)ln.ShallowClone(); c.Y2 = h - d; return c; }
            return ShiftItem(it, -d);
        }
        var r2 = row.ShallowClone();
        r2.Split = null; r2.TopCut = null; r2.TopBorders = null; r2.OwnTopBorders = null;
        r2.Height = h - d;
        r2.Cut = d;
        r2.Items = row.Items.Select(CutItem).ToList();
        if (row.MergeFills is not null)
            r2.MergeFills = row.MergeFills.Select(f =>
            {
                int idx = row.Items.FindIndex(it => ReferenceEquals(it, f.Item));
                return new MergeFill { Item = idx >= 0 ? (RectItem)r2.Items[idx] : f.Item, End = f.End };
            }).ToList();
        r2.Lines = row.Lines.Select(l =>
        {
            if (keep.Contains(l)) return l;
            var nl = l.ShallowClone();
            nl.Y = l.Y - d;
            nl.Baseline = l.Baseline - d;
            return nl;
        }).ToList();
        r2.BorderItems = row.BorderItems.Where(it => !top.Contains(it)).Select(CutItem).Concat(row.OwnTopBorders ?? new List<PageItem>()).ToList();
        if (row.BreakBorderItems is not null) r2.BreakBorderItems = row.BreakBorderItems.Select(it => ShiftItem(it, -d)).ToList();
        if (row.Natural is not null) r2.Natural = row.Natural - d;
        return r2;
    }

    /// <summary>a linha sem os itens de mescla que já foram gravados na linha inicial</summary>
    public static RowLayout DropMoved(RowLayout row, HashSet<object> moved)
    {
        if (moved.Count == 0 || row.MergeText is null) return row;
        var r2 = row.ShallowClone();
        r2.Items = row.Items.Where(it => !moved.Contains(it)).ToList();
        r2.Lines = row.Lines.Where(l => !moved.Contains(l)).ToList();
        return r2;
    }

    /// <summary>marca de um objeto ancorado em CÉLULA (ordem z e camada)</summary>
    public sealed class LateMark
    {
        public double Z;
        public int Seq;
        public bool Behind;
    }

    /// <summary>itens de objetos ancorados em CÉLULA: no PDF do Word entram na camada de objetos da
    /// página (atrás/na frente do texto), na ordem z junto com os outros flutuantes — a marca
    /// (um objeto por flutuante) acompanha os deslocamentos (oráculo cellwrap; corpus t43, t70)</summary>
    public static readonly System.Runtime.CompilerServices.ConditionalWeakTable<PageItem, LateMark> LateItems = new();

    public static PageItem ShiftItem(PageItem it, double dy, double dx = 0)
    {
        var outp = ShiftItem0(it, dy, dx);
        if (!ReferenceEquals(outp, it) && LateItems.TryGetValue(it, out var m)) LateItems.AddOrUpdate(outp, m);
        return outp;
    }

    private static PageItem ShiftItem0(PageItem it, double dy, double dx)
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

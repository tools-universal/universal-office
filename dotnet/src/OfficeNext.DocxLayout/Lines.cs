using OfficeNext.Docx;

namespace OfficeNext.DocxLayout;

/// <summary>
/// Quebra de linha do Word (greedy) — porta de docx-layout/src/lines.ts:
/// quebra no início da palavra que não coube; espaços/tabs finais penduram
/// além da margem; hífen e hífen opcional são oportunidades; palavra maior que
/// a linha quebra por caractere.
/// Tabs: paradas custom (left/center/right/decimal/bar, com preenchimento)
/// relativas à borda esquerda do quadro de texto; sem parada custom à frente,
/// grade de defaultTabStop a partir de 0; o recuo deslocado (hanging) é uma
/// parada implícita na 1ª linha.
/// </summary>
public sealed class PlacedGlyph
{
    public Glyph G = null!;
    /// <summary>x relativo à borda esquerda do quadro (twips)</summary>
    public double X;
    /// <summary>largura efetiva (tabs/justificação incluídos)</summary>
    public double W;
    /// <summary>tab com preenchimento</summary>
    public string? Leader;
}

public sealed class Line
{
    /// <summary>índices [start, end) em para.glyphs</summary>
    public int Start;
    public int End;
    public List<PlacedGlyph> Placed = new();
    /// <summary>marcador de numeração na 1ª linha</summary>
    public List<PlacedGlyph>? Marker;
    /// <summary>largura do conteúdo (sem espaços finais), a partir de xStart</summary>
    public double Width;
    public double XStart;
    /// <summary>métricas verticais naturais</summary>
    public double Asc;
    public double Desc;
    /// <summary>altura final (regra de entrelinha aplicada) e baseline relativa ao topo</summary>
    public double Height;
    public double Baseline;
    /// <summary>termina com quebra manual de página/coluna: page | column</summary>
    public string? BreakAfter;
    /// <summary>última linha do parágrafo</summary>
    public bool Last;
}

public struct LineFrame
{
    /// <summary>borda esquerda/direita do espaço disponível para ESTA linha, relativas ao quadro (já com recuos)</summary>
    public double Left;
    public double Right;
    /// <summary>sem espaço útil ao lado de um objeto: a linha passa para baixo dele (y)</summary>
    public double? SkipTo;

    public LineFrame(double left, double right) { Left = left; Right = right; SkipTo = null; }
}

public static class Lines
{
    internal static (double Pos, TabSpec? Tab) NextTab(double x, List<TabSpec> tabs, double defaultTab, double? hangingStop, double rightLimit)
    {
        (double Pos, TabSpec? Tab)? best = null;
        foreach (var t in tabs)
        {
            if (t.Val == "bar") continue;
            if (t.Pos > x + 0.5) { best = (t.Pos, t); break; }
        }
        if (hangingStop is { } hs && hs > x + 0.5 && (best is null || hs < best.Value.Pos))
        {
            best = (hs, null);
        }
        if (best is not null) return best.Value;
        double lastCustom = tabs.Count > 0 ? JsMax(tabs.Select(t => t.Pos)) : double.NegativeInfinity;
        double from = JsMax2(x, lastCustom);
        double dts = defaultTab > 0 ? defaultTab : 720;
        double pos = (Math.Floor(from / dts + 1e-6) + 1) * dts;
        if (pos <= x + 0.5) pos += dts;
        return (pos, null);
    }

    /// <summary>Math.max do JS (NaN contamina).</summary>
    internal static double JsMax(IEnumerable<double> vs)
    {
        double m = double.NegativeInfinity;
        foreach (var v in vs) { if (double.IsNaN(v)) return double.NaN; if (v > m) m = v; }
        return m;
    }

    /// <summary>Math.min do JS (NaN contamina; vazio = +∞).</summary>
    internal static double JsMinOf(IEnumerable<double> vs)
    {
        double m = double.PositiveInfinity;
        foreach (var v in vs) { if (double.IsNaN(v)) return double.NaN; if (v < m) m = v; }
        return m;
    }

    internal static double JsMax2(double a, double b) => double.IsNaN(a) || double.IsNaN(b) ? double.NaN : Math.Max(a, b);

    /// <summary>Altura/baseline da linha pela regra de entrelinha (medido no Word — ver FINDINGS).</summary>
    public static (double Height, double Baseline) LineBox(double asc, double desc, PreparedPara p, double? textNat = null, double? grid = null)
    {
        double nat = asc + desc;
        if (p.LineRule == "exact")
        {
            double h = p.Line;
            return (h, h * 0.8);
        }
        if (grid is { } gr && gr > 0)
        {
            // grade do documento (docGrid type=lines) — medido no oráculo docgrid: a
            // linha ocupa o menor nº de passos da grade que comporta a altura natural,
            // com o texto CENTRADO; a entrelinha múltipla vale sobre UM passo
            // (altura = máx(passo × fator, passos × passo)); mínima: a caixa da grade
            // fica no PÉ da altura mínima
            double g = Math.Max(1, Math.Ceiling((nat - 1) / gr)) * gr;
            double gBase = (g - nat) / 2 + asc;
            if (p.LineRule == "atLeast")
            {
                double h = Math.Max(g, p.Line);
                return (h, h - g + gBase);
            }
            double h2 = Math.Max((gr * p.Line) / 240, g);
            return (h2, (h2 - nat) / 2 + asc);
        }
        if (p.LineRule == "atLeast")
        {
            double h = Math.Max(nat, p.Line);
            return (h, h - desc);
        }
        // múltipla: o extra é (fator − 1) × altura do TEXTO (objetos inline não
        // são multiplicados — medido no Word) e vai ABAIXO da linha
        double extra = (p.Line / 240 - 1) * (textNat ?? nat);
        double hh = nat + extra;
        return (hh, extra >= 0 ? asc : asc * (hh / nat));
    }
}

public sealed class LineBreaker
{
    public int Pos;
    public int LineIdx;
    /// <summary>quebra de linha (w:br) no FIM do parágrafo: a marca de parágrafo vai
    /// para uma linha vazia própria (Word)</summary>
    private bool _trailingBreak;
    private readonly DocContext _ctx;
    public readonly PreparedPara P;
    /// <summary>passo da grade de linhas da seção (twips) — só no corpo, se o parágrafo encaixa</summary>
    private readonly double? _grid;

    public LineBreaker(DocContext ctx, PreparedPara p, double? grid = null)
    {
        _ctx = ctx;
        P = p;
        _grid = grid;
    }

    public bool Done() => Pos >= P.Glyphs.Count && LineIdx > 0 && !_trailingBreak;

    /// <summary>Estado antes de uma linha (para refazê-la noutro quadro).</summary>
    public (int Pos, int LineIdx, bool TrailingBreak) Mark() => (Pos, LineIdx, _trailingBreak);

    public void Reset((int Pos, int LineIdx, bool TrailingBreak) m)
    {
        Pos = m.Pos;
        LineIdx = m.LineIdx;
        _trailingBreak = m.TrailingBreak;
    }

    /// <summary>gs.slice(i + 1).some(q => q.kind in char/obj/nbsp/box)</summary>
    private static bool HasContentAfter(List<Glyph> gs, int i)
    {
        for (int k = i + 1; k < gs.Count; k++)
            if (gs[k].Kind is GlyphKind.Char or GlyphKind.Obj or GlyphKind.Nbsp or GlyphKind.Box) return true;
        return false;
    }

    private sealed class PendTab
    {
        public int Idx;
        public double Pos;
        public TabSpec Tab = null!;
        public double SegStart;
        public double StartX;
        public bool DecimalSeen;
        public double DecimalX;
    }

    /// <summary>Próxima linha no quadro dado. `frame` já desconta recuos do parágrafo.</summary>
    public Line Next(LineFrame frame)
    {
        var p = P;
        var gs = p.Glyphs;
        bool first = LineIdx == 0;
        int start = Pos;
        double xStart = frame.Left + (first ? p.FirstLine : 0);
        double right = frame.Right;
        var placed = new List<PlacedGlyph>();
        double x = xStart;
        List<PlacedGlyph>? markerPlaced = null;
        double defaultTab = _ctx.Fmt.Settings.DefaultTabStop;
        // recuo deslocado = parada implícita (1ª linha)
        double? hangingStop = first && p.FirstLine < 0 ? frame.Left : null;

        // marcador de numeração (só na 1ª linha)
        if (first && p.Marker is not null)
        {
            var mk = p.Marker;
            double mx = xStart;
            if (mk.Jc == "right") mx -= mk.Width;
            else if (mk.Jc == "center") mx -= mk.Width / 2;
            markerPlaced = new List<PlacedGlyph>();
            foreach (var g in mk.Glyphs) { markerPlaced.Add(new PlacedGlyph { G = g, X = mx, W = g.Adv }); mx += g.Adv; }
            x = Lines.JsMax2(mx, xStart);
            if (mk.Suff == "tab")
            {
                // tab após o número: próxima parada (o recuo esquerdo conta como parada)
                var ns = Lines.NextTab(x, p.Tabs, defaultTab, frame.Left > x + 0.5 ? frame.Left : null, right);
                x = ns.Pos;
            }
            else if (mk.Suff == "space")
            {
                x += Para.AdvanceTwips(_ctx, mk.Glyphs.Count > 0 ? mk.Glyphs[0].Face : p.MarkFace, 0x20, mk.Glyphs.Count > 0 ? mk.Glyphs[0].SizePt : p.MarkStyle.SizePt);
            }
        }

        int i = start;
        int lastBreak = -1;          // índice após o qual é possível quebrar
        // justificado: o Word 2013+ comprime os espaços para caber a palavra — medido
        // no oráculo (justify2..5): cabe se o excesso ≤ mín(25% da soma dos espaços
        // da linha, 35% da largura da palavra + espaço anterior). Nos modos de
        // compatibilidade ≤ 14 não há compressão: a palavra tem de caber (justify6)
        bool justify = (p.Jc == "both" || p.Jc == "distribute") && _ctx.Fmt.Settings.CompatibilityMode >= 15;
        var shrink = _ctx.Opts.JustifyShrink;
        double spacesW = 0;          // soma dos espaços da linha (após o último tab)
        double lastGapW = 0;         // largura dos espaços imediatamente antes da palavra
        bool wordOk = false;         // a palavra corrente já foi aceita inteira
        bool prevWasGap = true;
        double widthAtBreak = 0;     // largura do conteúdo até o ponto de quebra (sem gaps finais)
        double contentEnd = xStart;  // x do fim do último glifo não-branco
        // tab alinhado pendente (right/center/decimal): ajusta seu avanço conforme o segmento cresce
        PendTab? pendTab = null;
        string? breakAfter = null;
        bool pastMargin = false;
        bool forced = false;

        void ClosePending()
        {
            if (pendTab is null) return;
            var pt = placed[pendTab.Idx];
            double segW = x - pendTab.SegStart;
            double shift = 0;
            double avail = pendTab.Pos - pendTab.StartX;
            if (pendTab.Tab.Val == "right") shift = Math.Max(0, avail - segW);
            else if (pendTab.Tab.Val == "center") shift = Math.Max(0, avail - segW / 2);
            else if (pendTab.Tab.Val == "decimal")
            {
                double dx2 = pendTab.DecimalSeen ? pendTab.DecimalX - pendTab.SegStart : segW;
                shift = Math.Max(0, avail - dx2);
            }
            pt.W = shift;
            for (int k = pendTab.Idx + 1; k < placed.Count; k++) placed[k].X += shift;
            x += shift;
            if (contentEnd > pendTab.SegStart) contentEnd += shift;
            pendTab = null;
        }

        for (; i < gs.Count; i++)
        {
            var g = gs[i];
            if (g.Kind is GlyphKind.Lb or GlyphKind.Pb or GlyphKind.Cb)
            {
                ClosePending();
                placed.Add(new PlacedGlyph { G = g, X = x, W = 0 });
                i++;
                forced = true;
                if (g.Kind == GlyphKind.Pb) breakAfter = "page";
                else if (g.Kind == GlyphKind.Cb) breakAfter = "column";
                break;
            }
            if (g.Kind == GlyphKind.Tab)
            {
                ClosePending();
                double pos; TabSpec? tab;
                if (g.Ptab is not null)
                {
                    // tab absoluto: alinhamento relativo à margem/recuo
                    double width = right - frame.Left;
                    pos = g.Ptab.Alignment == "center" ? frame.Left + width / 2 : g.Ptab.Alignment == "right" ? right : frame.Left;
                    tab = new TabSpec
                    {
                        Val = g.Ptab.Alignment == "center" ? "center" : g.Ptab.Alignment == "right" ? "right" : "left",
                        Pos = pos,
                        Leader = Js.Truthy(g.Ptab.Leader) && g.Ptab.Leader != "none" ? g.Ptab.Leader : null,
                    };
                }
                else (pos, tab) = Lines.NextTab(x, p.Tabs, defaultTab, hangingStop, right);
                // sem parada até a margem direita: a linha quebra ANTES do tab, que
                // recomeça na linha seguinte (na 1ª parada dela) — oráculo tabs
                // (modo ≤ 14 com paradas custom: o tab segue além da margem pela grade padrão)
                bool legacyNoWrap = _ctx.Fmt.Settings.CompatibilityMode < 15 && p.Tabs.Any(t => t.Val != "bar" && t.Val != "clear");
                // (tab sem conteúdo depois, no fim do parágrafo: pendura como espaço)
                // (parada CUSTOM além da margem vale — sumários com tab direito na margem)
                if (g.Ptab is null && tab is null && !legacyNoWrap && pos > right + 0.5 && i > start && HasContentAfter(gs, i)) break;
                // modo antigo: depois de um tab além da margem o resto da linha não quebra (oráculo tabs c14)
                if (legacyNoWrap && pos > right + 0.5) pastMargin = true;
                var pg = new PlacedGlyph { G = g, X = x, W = 0, Leader = Js.Truthy(tab?.Leader) && tab!.Leader != "none" ? tab.Leader : null };
                placed.Add(pg);
                if (tab is not null && (tab.Val == "right" || tab.Val == "center" || tab.Val == "decimal"))
                {
                    pendTab = new PendTab { Idx = placed.Count - 1, Pos = pos, Tab = tab, SegStart = x, StartX = x, DecimalSeen = false, DecimalX = 0 };
                }
                else
                {
                    pg.W = Math.Max(0, pos - x);
                    x = Math.Max(x, pos);
                }
                lastBreak = i;
                widthAtBreak = contentEnd - xStart;
                spacesW = 0;
                lastGapW = 0;
                prevWasGap = true;
                continue;
            }
            if (g.Kind == GlyphKind.Obj && g.Adv == 0) { placed.Add(new PlacedGlyph { G = g, X = x, W = 0 }); continue; } // âncora
            bool isGap = g.Kind == GlyphKind.Space;
            if (!isGap && g.Kind != GlyphKind.Shy && prevWasGap)
            {
                // início de palavra: decide se ela cabe inteira (com compressão, se justificado)
                int e = i;
                double wordW = 0;
                for (; e < gs.Count; e++)
                {
                    var q = gs[e];
                    if (q.Kind is GlyphKind.Space or GlyphKind.Tab or GlyphKind.Lb or GlyphKind.Pb or GlyphKind.Cb) break;
                    if (q.Kind == GlyphKind.Obj && q.Adv == 0) continue;
                    wordW += q.Kind == GlyphKind.Shy ? 0 : q.Adv;
                    if (q.BreakAfter && q.Kind != GlyphKind.Char) break;
                    if (q.BreakAfter) { e++; break; }
                }
                double over = x + wordW - right;
                wordOk = over <= 0.5;
                if (!wordOk && justify && lastBreak >= start && i > start)
                {
                    double allowed = Math.Min(shrink.Ratio * spacesW, shrink.WordRatio * (wordW + lastGapW));
                    wordOk = over <= allowed + 0.5;
                }
            }
            // estouro: quebra no último ponto possível
            double projected = isGap ? x : x + g.Adv;
            if (!isGap && g.Kind != GlyphKind.Shy && !wordOk && !pastMargin && projected > right + 0.5 && i > start)
            {
                if (lastBreak >= start)
                {
                    // volta ao ponto de quebra
                    int keep = lastBreak + 1;
                    while (placed.Count > 0 && !ReferenceEquals(placed[^1].G, gs[lastBreak])) placed.RemoveAt(placed.Count - 1);
                    i = keep;
                    // hífen opcional no ponto de quebra vira hífen visível
                    var brk = gs[lastBreak];
                    if (brk.Kind == GlyphKind.Shy)
                    {
                        var last = placed[^1];
                        last.W = Para.AdvanceTwips(_ctx, brk.Face, 0x2d, brk.SizePt);
                        contentEnd = last.X + last.W;
                        widthAtBreak = contentEnd - xStart;
                    }
                    else
                    {
                        contentEnd = xStart + widthAtBreak;
                    }
                    pendTab = null;
                    break;
                }
                // palavra maior que a linha: quebra por caractere (o glifo atual desce)
                break;
            }
            if (g.Kind == GlyphKind.Shy)
            {
                placed.Add(new PlacedGlyph { G = g, X = x, W = 0 });
                prevWasGap = true;
                lastBreak = i;
                widthAtBreak = contentEnd - xStart;
                continue;
            }
            placed.Add(new PlacedGlyph { G = g, X = x, W = g.Adv });
            if (isGap)
            {
                if (!prevWasGap) lastGapW = 0;
                lastGapW += g.Adv;
                spacesW += g.Adv;
            }
            prevWasGap = isGap || g.BreakAfter;
            if (pendTab is not null && pendTab.Tab.Val == "decimal" && !pendTab.DecimalSeen && (g.Ch == "," || g.Ch == "."))
            {
                pendTab.DecimalSeen = true;
                pendTab.DecimalX = x;
            }
            x += g.Adv;
            if (!isGap) contentEnd = x;
            if (g.BreakAfter)
            {
                lastBreak = i;
                widthAtBreak = (isGap ? contentEnd : x) - xStart;
            }
        }
        ClosePending();
        // espaços/tabs finais penduram: largura = até o último não-branco
        double lineWidth = 0;
        for (int k = 0; k < placed.Count; k++)
        {
            var pg = placed[k];
            if (pg.G.Kind != GlyphKind.Space && pg.G.Kind != GlyphKind.Lb && pg.G.Kind != GlyphKind.Pb && pg.G.Kind != GlyphKind.Cb)
            {
                lineWidth = Lines.JsMax2(lineWidth, pg.X + pg.W - xStart);
            }
        }
        Pos = Math.Min(gs.Count, i);
        if (Pos == start && start < gs.Count) Pos = start + 1; // garante progresso
        _trailingBreak = forced && Pos >= gs.Count && placed.Count > 0 && placed[^1].G.Kind == GlyphKind.Lb;
        bool lastLine = Pos >= gs.Count && !_trailingBreak;
        LineIdx++;

        // métricas verticais
        double asc = 0, desc = 0, tAsc = 0, tDesc = 0;
        foreach (var pg in placed)
        {
            if (pg.G.Kind == GlyphKind.Obj && !(pg.G.Adv > 0)) continue;
            if (pg.G.Kind is GlyphKind.Pb or GlyphKind.Cb) continue;
            // espaço comum (U+0020) e tab não dão altura à linha — no fim, no meio ou
            // sozinhos (aí vale a marca de parágrafo); o NBSP dá — oráculos trailsp/hfimg
            if (pg.G.Ch == " " || pg.G.Kind == GlyphKind.Tab) continue;
            asc = Lines.JsMax2(asc, pg.G.Asc);
            desc = Lines.JsMax2(desc, pg.G.Desc);
            if (pg.G.Kind != GlyphKind.Obj && pg.G.Kind != GlyphKind.Box) { tAsc = Lines.JsMax2(tAsc, pg.G.Asc); tDesc = Lines.JsMax2(tDesc, pg.G.Desc); }
        }
        if (tAsc + tDesc == 0)
        {
            // só objetos: a altura de texto (p/ entrelinha múltipla) vem da marca de parágrafo
            var mm = Fonts.FaceMetrics(p.MarkFace.Font);
            tAsc = mm.Ascent * p.MarkStyle.SizePt * 20;
            tDesc = mm.Descent * p.MarkStyle.SizePt * 20;
        }
        if (asc == 0 && desc == 0)
        {
            // linha vazia: altura pela marca de parágrafo
            var mm = Fonts.FaceMetrics(p.MarkFace.Font);
            double sz = p.MarkStyle.SizePt * 20;
            asc = mm.Ascent * sz;
            desc = mm.Descent * sz;
        }
        // marcador de numeração: só a ASCENDENTE entra na linha (a descendente e a
        // entrelinha múltipla seguem o texto) — oráculo markers
        if (markerPlaced is not null) foreach (var pg in markerPlaced) asc = Lines.JsMax2(asc, pg.G.Asc);
        var box = Lines.LineBox(asc, desc, p, tAsc + tDesc > 0 ? tAsc + tDesc : null, _grid);

        // alinhamento/justificação
        double availW = right - xStart;
        double dx = 0;
        string jc = p.Jc;
        if (jc == "center") dx = (availW - lineWidth) / 2;
        else if (jc == "right") dx = availW - lineWidth;
        else if ((jc == "both" || jc == "distribute") && (!lastLine || jc == "distribute") && breakAfter is null)
        {
            // espaços internos (não finais, depois do último tab)
            int lastTab = -1;
            for (int k = 0; k < placed.Count; k++) if (placed[k].G.Kind == GlyphKind.Tab) lastTab = k;
            int lastContent = -1;
            for (int k = 0; k < placed.Count; k++) if (placed[k].G.Kind != GlyphKind.Space && placed[k].G.Kind != GlyphKind.Lb) lastContent = k;
            var spaces = new HashSet<PlacedGlyph>(ReferenceEqualityComparer.Instance);
            for (int k = 0; k < placed.Count; k++)
                if (k > lastTab && k < lastContent && placed[k].G.Kind == GlyphKind.Space) spaces.Add(placed[k]);
            double extra = availW - lineWidth;
            if (spaces.Count > 0 && (extra > 0 || extra < 0))
            {
                double each = extra / spaces.Count;
                double acc = 0;
                for (int k = 0; k < placed.Count; k++)
                {
                    var pg = placed[k];
                    pg.X += acc;
                    if (spaces.Contains(pg)) { pg.W += each; acc += each; }
                }
            }
        }
        if (dx > 0 || dx < 0)
        {
            foreach (var pg in placed) pg.X += dx;
            if (markerPlaced is not null && jc != "left") foreach (var pg in markerPlaced) pg.X += dx;
        }
        return new Line
        {
            Start = start, End = Pos, Placed = placed,
            Marker = markerPlaced,
            Width = lineWidth, XStart = xStart + Math.Max(0, dx),
            Asc = asc, Desc = desc, Height = box.Height, Baseline = box.Baseline,
            BreakAfter = breakAfter,
            Last = lastLine,
        };
    }
}

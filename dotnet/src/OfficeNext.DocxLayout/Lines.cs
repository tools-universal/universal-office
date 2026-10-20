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
    /// <summary>termina com quebra de linha w:clear: a seguinte desce para baixo dos flutuantes</summary>
    public bool Clear;
    /// <summary>última linha do parágrafo</summary>
    public bool Last;
    /// <summary>tab com parada além do vão do flutuante: "break" a linha acabou antes dele;
    /// "start" ele abre a linha (o motor a leva para baixo do flutuante) — oráculo tabgap</summary>
    public string? GapTab;
    /// <summary>um tab atravessou o flutuante: a linha já ocupou o vão seguinte (oráculo ftrtabs)</summary>
    public bool Spanned;
}

public struct LineFrame
{
    /// <summary>borda esquerda/direita do espaço disponível para ESTA linha, relativas ao quadro (já com recuos)</summary>
    public double Left;
    public double Right;
    /// <summary>sem espaço útil ao lado de um objeto: a linha passa para baixo dele (y)</summary>
    public double? SkipTo;
    /// <summary>objeto no meio da linha: os vãos todos, da esquerda para a direita (WrapFrame)</summary>
    public List<(double A, double B)>? Segs;
    /// <summary>vão ao lado de um flutuante (o quadro foi estreitado por ele)</summary>
    public bool Gap;
    /// <summary>o vão seguinte da mesma linha (depois do flutuante)</summary>
    public (double Left, double Right)? Next;

    public LineFrame(double left, double right) { Left = left; Right = right; SkipTo = null; Segs = null; Gap = false; Next = null; }
}

public static class Lines
{
    /// <summary>Há outro tab depois do glifo <paramref name="i"/>, antes da próxima quebra de linha/página?</summary>
    internal static bool MoreTabs(List<Glyph> gs, int i)
    {
        for (int k = i + 1; k < gs.Count; k++)
        {
            var q = gs[k];
            if (q.Kind == GlyphKind.Tab) return true;
            if (q.Kind is GlyphKind.Lb or GlyphKind.Pb or GlyphKind.Cb) return false;
        }
        return false;
    }

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
    /// <summary>folga do teste "cabe na linha" (twips): só o ruído de ponto flutuante</summary>
    // (as larguras e o limite já estão na unidade interna do Word, 1/4096 pt — oráculo emwidth)
    private const double FitEps = 0.001;
    /// <summary>Espaço de largura fixa (en, em, fino, ideográfico…): fora da justificação (oráculo formjust).</summary>
    private static bool FixedSpace(int cp) => (cp >= 0x2000 && cp <= 0x200a) || cp == 0x3000;
    public int Pos;
    public int LineIdx;
    /// <summary>quebra de linha (w:br) no FIM do parágrafo: a marca de parágrafo vai
    /// para uma linha vazia própria (Word)</summary>
    private bool _trailingBreak;
    /// <summary>linhas seguidas terminadas em hífen (w:consecutiveHyphenLimit)</summary>
    private int _hyphenRun;
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

    /// <summary>settings.compat[name] do JS (flag de compatibilidade ligada)</summary>
    private bool CompatOn(string name) => _ctx.Fmt.Settings.Compat.TryGetValue(name, out var on) && on;

    /// <summary>Estado antes de uma linha (para refazê-la noutro quadro).</summary>
    /// <summary>Linha com o recuo da 1ª linha: a 1ª — ou, no parágrafo que COMEÇA com quebra de
    /// coluna, a que vem depois dela, na coluna seguinte (oráculo brfirst, corpus t70).</summary>
    private bool IndentFirst() => LineIdx == 0 || (LineIdx == 1 && P.Glyphs.Count > 0 && P.Glyphs[0].Kind == GlyphKind.Cb);

    public (int Pos, int LineIdx, bool TrailingBreak, int HyphenRun) Mark() => (Pos, LineIdx, _trailingBreak, _hyphenRun);

    public void Reset((int Pos, int LineIdx, bool TrailingBreak, int HyphenRun) m)
    {
        Pos = m.Pos;
        LineIdx = m.LineIdx;
        _trailingBreak = m.TrailingBreak;
        _hyphenRun = m.HyphenRun;
    }

    /// <summary>largura da próxima palavra (até o 1º ponto de quebra): o vão ao lado de um
    /// objeto só recebe texto se ela cabe nele (oráculo wrapsides)</summary>
    public double PeekWordWidth()
    {
        var gs = P.Glyphs;
        double w = 0;
        for (int e = Pos; e < gs.Count; e++)
        {
            var q = gs[e];
            if (q.Kind is GlyphKind.Space or GlyphKind.Tab or GlyphKind.Lb or GlyphKind.Pb or GlyphKind.Cb) break;
            if (q.Kind == GlyphKind.Obj && q.Adv == 0) continue;
            w += q.Kind == GlyphKind.Shy ? 0 : q.Adv;
            if (q.BreakAfter) break;
        }
        return w + (IndentFirst() ? Math.Max(0, P.FirstLine) : 0);
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

    /// <summary>Borda direita do teste "cabe" (x relativo ao quadro): o Word converte a largura da
    /// coluna/célula (borda direita + recuo direito) e cada recuo para 1/4096 pt
    /// separadamente, arredondando — oráculo emwidth.</summary>
    private double FitRight(LineFrame frame, double xStart, bool first)
    {
        if (_ctx.Opts.AdvanceRound != "word" || _ctx.Opts.AdvanceEm == "device") return frame.Right;
        var p = P;
        static double Q(double tw) => Para.ToWordUnit(tw);
        return xStart + Q(frame.Right + p.IndRight) - Q(p.IndRight) - Q(frame.Left - p.IndLeft) - Q(p.IndLeft) - (first ? Q(p.FirstLine) : 0);
    }

    /// <summary>Próxima linha no quadro dado. `frame` já desconta recuos do parágrafo.</summary>
    public Line Next(LineFrame frame)
    {
        var p = P;
        var gs = p.Glyphs;
        bool first = LineIdx == 0;
        bool indFirst = IndentFirst();
        int start = Pos;
        double xStart = frame.Left + (indFirst ? p.FirstLine : 0);
        double right = frame.Right;
        // limite do "cabe na linha" na unidade interna do Word (1/4096 pt): largura da
        // coluna/célula e recuos direito, esquerdo e da 1ª linha convertidos CADA UM com
        // arredondamento (oráculo emwidth)
        double rightQ = FitRight(frame, xStart, indFirst);
        var placed = new List<PlacedGlyph>();
        double x = xStart;
        List<PlacedGlyph>? markerPlaced = null;
        double defaultTab = _ctx.Fmt.Settings.DefaultTabStop;
        // recuo deslocado = parada implícita (1ª linha)
        double? hangingStop = indFirst && p.FirstLine < 0 ? frame.Left : null;

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
                // o número pode terminar EM CIMA da parada (fim ≤ parada) — oráculo numrpr (nrs-*)
                double xe = x - 0.5 - 1e-3;
                var ns = Lines.NextTab(xe, p.Tabs, defaultTab, frame.Left > xe + 0.5 ? frame.Left : null, right);
                // doNotUseIndentAsNumberingTabStop (modos ≤ 14): o recuo deslocado não tem
                // prioridade — vale a parada mais próxima, padrão ou o recuo (oráculo numtabind)
                if (CompatOn("doNotUseIndentAsNumberingTabStop") && _ctx.Fmt.Settings.CompatibilityMode < 15)
                {
                    var plain = Lines.NextTab(xe, p.Tabs, defaultTab, null, right);
                    ns = frame.Left > xe + 0.5 && frame.Left < plain.Pos ? (frame.Left, null) : plain;
                }
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
        int nSpaces = 0;             // quantos são
        // espaços ANTES da 1ª palavra do segmento (início da linha / depois de tab) não
        // comprimem nem expandem (oráculo jlead)
        bool segWord = false;
        double lastGapW = 0;         // largura dos espaços imediatamente antes da palavra
        double lastGapSp = 0;        // … só os que comprimem/expandem (contados em spacesW)
        // unidade que desce inteira se não couber (palavra + palavras coladas por NBSP):
        // x do início, espaços da linha antes dela e o vão que a precede
        double unitX = xStart, unitSpacesW = 0, unitGapW = 0, unitGapSp = 0;
        // layout asiático dos modos ≤ 14: quanto os espaços da linha podem comprimir (oráculo fecompress)
        double feShrinkW = 0;
        bool wordOk = false;         // a palavra corrente já foi aceita inteira
        bool squeezed = false;       // uma palavra da linha só coube comprimindo/pendurando
        bool prevWasGap = true;
        double widthAtBreak = 0;     // largura do conteúdo até o ponto de quebra (sem gaps finais)
        double contentEnd = xStart;  // x do fim do último glifo não-branco
        // tab alinhado pendente (right/center/decimal): ajusta seu avanço conforme o segmento cresce
        PendTab? pendTab = null;
        string? breakAfter = null;
        bool clearAfter = false;
        string? gapTab = null;
        bool spanned = false;
        bool pastMargin = false;
        bool forced = false;
        // hifenização da palavra que não coube: a linha acaba depois do glifo hyphAt, com o
        // hífen (largura hyphW) — automática ou no hífen opcional (ver Hyphenate.cs)
        int hyphAt = -1;
        double hyphW = 0;
        bool endedHyphen = false;

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
            if (hyphAt >= 0 && i > hyphAt)
            {
                var kg = gs[hyphAt];
                if (kg.Kind == GlyphKind.Shy) placed[^1].W = hyphW;
                else
                {
                    var hg = kg.Clone();
                    hg.Kind = GlyphKind.Shy; hg.Ch = ""; hg.Cp = 0xad; hg.Adv = 0; hg.Hyph = false; hg.AutoHyphen = true; hg.Offset = kg.Offset + kg.Ch.Length;
                    placed.Add(new PlacedGlyph { G = hg, X = x, W = hyphW });
                }
                contentEnd = x + hyphW;
                // só o hífen automático conta para w:consecutiveHyphenLimit (oráculo hyphshy)
                endedHyphen = kg.Kind != GlyphKind.Shy;
                pendTab = null;
                break;
            }
            if (g.Kind is GlyphKind.Lb or GlyphKind.Pb or GlyphKind.Cb)
            {
                ClosePending();
                placed.Add(new PlacedGlyph { G = g, X = x, W = 0 });
                i++;
                forced = true;
                if (g.Kind == GlyphKind.Pb)
                {
                    breakAfter = "page";
                    // depois da quebra de página, só âncoras de flutuantes até o fim do parágrafo: ficam
                    // nesta linha e a marca não abre linha na página seguinte (oráculo pbanc)
                    int j = i;
                    while (j < gs.Count && gs[j].Kind == GlyphKind.Obj && gs[j].Adv == 0 && gs[j].Hr is null) j++;
                    if (j > i && j >= gs.Count) for (; i < j; i++) placed.Add(new PlacedGlyph { G = gs[i], X = x, W = 0 });
                }
                else if (g.Kind == GlyphKind.Cb) breakAfter = "column";
                else if (g.Clear) clearAfter = true;
                break;
            }
            // linha horizontal VML (o:hr): sozinha na linha — quebra antes e depois (oráculo vmlhr)
            if (g.Hr is not null)
            {
                if (placed.Any(q => q.G.Kind != GlyphKind.Obj || q.G.Adv > 0 || q.G.Hr is not null)) break;
                placed.Add(new PlacedGlyph { G = g, X = x, W = 0 });
                i++;
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
                // vão ao lado de um flutuante: parada além dele com OUTRO tab adiante na linha acaba a
                // linha antes do tab e o resto vai para baixo do flutuante; tab único fica no fim do
                // vão (oráculo tabgap)
                if (frame.Gap && g.Ptab is null && pos > right + 0.5 && Lines.MoreTabs(gs, i))
                {
                    // com uma parada no vão seguinte da mesma linha (antes do fim dele), o tab atravessa o
                    // flutuante e a linha continua lá — e se centraliza como linha inteira (oráculo ftrtabs;
                    // corpus t20); sem ela, a linha acaba aqui e o resto desce (tabgap)
                    (double Pos, TabSpec? Tab)? nxt = frame.Next is { } fnx0 && !spanned ? Lines.NextTab(fnx0.Left, p.Tabs, defaultTab, hangingStop, fnx0.Right) : null;
                    if (nxt is { } nxv && frame.Next is { } fnx && nxv.Pos <= fnx.Right + 0.5)
                    {
                        spanned = true;
                        x = fnx.Left;
                        right = fnx.Right;
                        rightQ = FitRight(new LineFrame(frame.Left, right), xStart, indFirst);
                        (pos, tab) = nxv;
                    }
                    else if (i > start) { gapTab = "break"; break; }
                    else gapTab = "start";
                }
                // Word 2013+ (oráculo tocdots-beyond-c15): parada custom direita/centro/decimal
                // além de máx(margem, fim da linha) alinha o texto pela DIREITA no fim da
                // linha (margem − recuo direito); no modo ≤ 14 a posição vale
                if (g.Ptab is null && tab is not null && (tab.Val == "right" || tab.Val == "center" || tab.Val == "decimal")
                    && _ctx.Fmt.Settings.CompatibilityMode >= 15 && pos > Math.Max(right, right + p.IndRight) + 0.5)
                {
                    pos = right;
                    tab = new TabSpec { Val = "right", Pos = tab.Pos, Leader = tab.Leader };
                }
                // Word 2013+: parada custom à ESQUERDA além da margem direita — a linha quebra antes
                // do tab mesmo sem nada depois dele (uma linha a mais no fim do parágrafo) e, abrindo
                // a linha, o tab só vai até a margem (oráculo tabbeyond)
                if (g.Ptab is null && tab is not null && tab.Val != "right" && tab.Val != "center" && tab.Val != "decimal"
                    && _ctx.Fmt.Settings.CompatibilityMode >= 15 && pos > right + 0.5)
                {
                    if (i > start) break;
                    pos = Math.Max(x, right);
                }
                // sem parada até a margem direita: a linha quebra ANTES do tab, que
                // recomeça na linha seguinte (na 1ª parada dela) — oráculo tabs
                // (modo ≤ 14 com paradas custom: o tab segue além da margem pela grade padrão)
                bool legacyNoWrap = _ctx.Fmt.Settings.CompatibilityMode < 15 && p.Tabs.Any(t => t.Val != "bar" && t.Val != "clear");
                // tab PADRÃO cuja parada passa da margem direita (fora do início da linha): quebra antes
                // dele, venha ou não conteúdo depois — também no fim do parágrafo (oráculo tabwrap)
                // (parada CUSTOM além da margem vale — sumários com tab direito na margem)
                if (g.Ptab is null && tab is null && !legacyNoWrap && pos > right + 0.5 && i > start) break;
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
                // a quebra fica ANTES do tab: se o texto depois dele não couber, o tab desce junto
                // e recomeça a linha seguinte — o pontilhado vai do início dela (oráculo tabnextline)
                lastBreak = i > start ? i - 1 : i;
                widthAtBreak = contentEnd - xStart;
                spacesW = 0;
                nSpaces = 0;
                feShrinkW = 0;
                segWord = false;
                lastGapW = 0;
                lastGapSp = 0;
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
                    // hífen opcional: ponto de hifenização DENTRO da palavra (oráculo hyphshy)
                    if (q.Kind == GlyphKind.Shy) continue;
                    wordW += q.Adv;
                    if (q.BreakAfter && q.Kind != GlyphKind.Char) break;
                    if (q.BreakAfter) { e++; break; }
                }
                double over = x + wordW - rightQ;
                // a palavra depois de um espaço que não quebra (colado a NBSP) continua a
                // unidade anterior: se descer, desce a unidade inteira (oráculo nbspglue)
                if (i == start || !(gs[i - 1].Kind == GlyphKind.Space && !gs[i - 1].BreakAfter))
                {
                    // depois de quebra SEM espaço (hífen, travessão, objeto): a saída alternativa é
                    // quebrar ali mesmo — nenhum vão sai da linha (oráculo hyphcomp)
                    bool gapBefore = i > start && gs[i - 1].Kind == GlyphKind.Space;
                    unitX = x; unitSpacesW = spacesW; unitGapW = gapBefore ? lastGapW : 0; unitGapSp = gapBefore ? lastGapSp : 0;
                }
                // cabe sse W ≤ A, larguras e limite na unidade interna do Word (oráculos fitwidth, emwidth)
                wordOk = over <= FitEps;
                // layout asiático: a pontuação final pendura além da margem — nos modos ≤ 14
                // sempre (oráculo fecompress), no 15 só no justificado (oráculo hang15)
                double hangW = e > i && gs[e - 1].Hang && (justify || _ctx.Fmt.Settings.CompatibilityMode < 15) ? gs[e - 1].Adv : 0;
                if (!wordOk && (hangW > 0 || feShrinkW > 0) && i > start)
                {
                    // modos ≤ 14: os espaços ainda comprimem até o mínimo de cada um — mas a última
                    // palavra do parágrafo que pendura a pontuação não soma a compressão (oráculo fehangcomp)
                    bool paraEnd = gs.Skip(e).All(q => q.Kind == GlyphKind.Pb || q.Kind == GlyphKind.Cb || (q.Kind == GlyphKind.Obj && q.Adv == 0));
                    wordOk = over - hangW <= (hangW > 0 && paraEnd ? 0 : feShrinkW) + FitEps;
                }
                if (!wordOk && justify && lastBreak >= start && i > start)
                {
                    // o Word compara as duas saídas: comprimir os n espaços para a palavra
                    // caber × levá-la para a linha seguinte e expandir os que sobram.
                    // Comprime se cada espaço perde ≤ 25% E ≤ metade do que ganharia
                    // (oráculo jsweep; folgas = quantização sub-twip medida no Word). As frações
                    // são relativas à LARGURA dos espaços (espaços de tamanhos diferentes na
                    // linha, vão duplo: cada um comprime/expande na proporção — oráculo jmixsp)
                    double slack = x + wordW - unitX + unitGapW - over;
                    double rest = unitSpacesW - unitGapSp;
                    double ov = over - hangW; // a pontuação pendurada não precisa caber (oráculo hang15)
                    wordOk = nSpaces > 0 && ov <= shrink.Ratio * spacesW + 0.0175
                        && (nSpaces <= 1 || rest <= 0 || ov / spacesW <= shrink.ExpandRatio * slack / rest + 0.0075 * nSpaces / spacesW);
                }
                // palavra que só coube comprimindo os espaços (ou pendurando a pontuação): a linha
                // acaba nela — a seguinte desce, mesmo que coubesse comprimindo mais (oráculo fejust)
                if (squeezed && i > start) wordOk = false;
                else if (wordOk && over > FitEps) squeezed = true;
                // não coube inteira: hifenizar (pontos automáticos e hífens opcionais), se o Word
                // hifenizaria — senão ela desce (ou, abrindo a linha, quebra por caractere)
                else if (!wordOk && pendTab is null && !pastMargin)
                {
                    var ch = Hyphenate.ChooseHyphenation(_ctx, gs, new HyphenUnit
                    {
                        I = i, E = e, X = x, Right = rightQ, LineStart = lastBreak < start, ContentEnd = xStart + widthAtBreak,
                        Justify = p.Jc == "both" || p.Jc == "distribute", SpacesW = spacesW, RestW = unitSpacesW - unitGapSp, NSpaces = nSpaces, HyphenRun = _hyphenRun,
                    });
                    if (ch is { } hc) { hyphAt = hc.K; hyphW = hc.W; wordOk = true; }
                }
                if (_ctx.Opts.OnWordFit is { } onWordFit && over > -2000)
                {
                    onWordFit(new WordFitInfo
                    {
                        Over = over, SpacesW = spacesW, NSpaces = nSpaces, WordW = wordW, LastGapW = lastGapW, Justify = justify, Accepted = wordOk,
                        LineStart = start, WordStart = i, WordEnd = e,
                        SizePt = g.SizePt, Family = g.Face?.Family ?? "", Compat = _ctx.Fmt.Settings.CompatibilityMode,
                        LineText = string.Concat(gs.Skip(start).Take(i - start).Select(q => q.Ch)),
                        WordText = string.Concat(gs.Skip(i).Take(e - i).Select(q => q.Ch)),
                    });
                }
            }
            // estouro: quebra no último ponto possível
            double projected = isGap ? x : x + g.Adv;
            // âncoras de flutuantes (objeto sem largura na linha) não contam como conteúdo: o
            // que vem depois delas e não cabe fica na linha assim mesmo (oráculo floatwide)
            // modo ≤ 14: o texto de um tab DIREITO que não cabe fica na linha, além da margem, e
            // a linha não quebra mais (oráculo tabnextline)
            if (!isGap && g.Kind != GlyphKind.Shy && !wordOk && !pastMargin && projected > rightQ + FitEps && i > start
                && pendTab?.Tab.Val == "right" && _ctx.Fmt.Settings.CompatibilityMode < 15) pastMargin = true;
            if (!isGap && g.Kind != GlyphKind.Shy && !wordOk && !pastMargin && projected > rightQ + FitEps && i > start
                && placed.Any(q => q.G.Kind != GlyphKind.Obj || q.G.Adv > 0))
            {
                if (lastBreak >= start)
                {
                    // volta ao ponto de quebra
                    int keep = lastBreak + 1;
                    while (placed.Count > 0 && !ReferenceEquals(placed[^1].G, gs[lastBreak])) placed.RemoveAt(placed.Count - 1);
                    i = keep;
                    contentEnd = xStart + widthAtBreak;
                    pendTab = null;
                    break;
                }
                // palavra maior que a linha: quebra por caractere (o glifo atual desce)
                break;
            }
            // hífen opcional: só vira quebra (com hífen) pela hifenização acima
            if (g.Kind == GlyphKind.Shy)
            {
                placed.Add(new PlacedGlyph { G = g, X = x, W = 0 });
                continue;
            }
            placed.Add(new PlacedGlyph { G = g, X = x, W = g.Adv });
            if (isGap)
            {
                if (!prevWasGap) { lastGapW = 0; lastGapSp = 0; }
                lastGapW += g.Adv;
                // espaços de largura fixa (en/em/fino… U+2000–U+200A) não comprimem nem expandem
                if (segWord && !FixedSpace(g.Cp) && !g.Fixed) { spacesW += g.Adv; nSpaces++; lastGapSp += g.Adv; feShrinkW += g.FeShrink ?? 0; }
            }
            else segWord = true;
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
        // espaços/tabs finais penduram: largura = até o último não-branco (a âncora de objeto
        // flutuante depois dos espaços não os segura — oráculo anctrail)
        double lineWidth = 0;
        for (int k = 0; k < placed.Count; k++)
        {
            var pg = placed[k];
            if (pg.G.Kind == GlyphKind.Obj && pg.G.Adv == 0) continue;
            if (pg.G.Kind != GlyphKind.Space && pg.G.Kind != GlyphKind.Lb && pg.G.Kind != GlyphKind.Pb && pg.G.Kind != GlyphKind.Cb)
            {
                lineWidth = Lines.JsMax2(lineWidth, pg.X + pg.W - xStart);
            }
        }
        Pos = Math.Min(gs.Count, i);
        if (Pos == start && start < gs.Count) Pos = start + 1; // garante progresso
        _hyphenRun = endedHyphen ? _hyphenRun + 1 : 0;
        // quebra de linha ou de COLUNA no fim do parágrafo: a marca vai para uma linha própria
        // (na coluna/página seguinte — oráculo colbreak); a de página não (pbfit)
        // (de página também, com splitPgBreakAndParaMark nos modos ≤ 14 — oráculo pbmark)
        // (âncoras depois da quebra no fim do parágrafo não contam — oráculo pbanc)
        int lkI = placed.Count - 1;
        while (lkI > 0 && placed[lkI].G.Kind == GlyphKind.Obj && placed[lkI].G.Adv == 0 && placed[lkI].G.Hr is null) lkI--;
        GlyphKind? lk = lkI >= 0 && placed[lkI].G.Kind == GlyphKind.Pb ? GlyphKind.Pb : placed.Count > 0 ? placed[^1].G.Kind : null;
        bool splitPg = _ctx.Fmt.Settings.CompatibilityMode < 15 && CompatOn("splitPgBreakAndParaMark");
        _trailingBreak = forced && Pos >= gs.Count && (lk is GlyphKind.Lb or GlyphKind.Cb || (lk == GlyphKind.Pb && splitPg));
        bool lastLine = Pos >= gs.Count && !_trailingBreak;
        LineIdx++;

        // métricas verticais
        double asc = 0, desc = 0, tAsc = 0, tDesc = 0;
        // fonte dos runs de objetos em linha (altura de texto de linha só com objetos)
        double oAsc = 0, oDesc = 0;
        // quebra de linha (w:br) numa linha com objeto em linha: como a marca de parágrafo,
        // não dá altura — a linha da imagem fica com a altura dela (oráculo imgbr)
        bool withObj = placed.Any(pg => pg.G.Kind == GlyphKind.Obj && pg.G.Adv > 0);
        foreach (var pg in placed)
        {
            if (pg.G.Kind == GlyphKind.Obj && !(pg.G.Adv > 0)) continue;
            if (pg.G.Kind is GlyphKind.Pb or GlyphKind.Cb) continue;
            if (pg.G.Kind == GlyphKind.Lb && withObj) continue;
            // espaço comum (U+0020) e tab não dão altura à linha — no fim, no meio ou
            // sozinhos (aí vale a marca de parágrafo); o NBSP dá — oráculos trailsp/hfimg
            if (pg.G.Ch == " " || pg.G.Kind == GlyphKind.Tab) continue;
            asc = Lines.JsMax2(asc, pg.G.Asc);
            desc = Lines.JsMax2(desc, pg.G.Desc);
            // (a caixa de seleção conta como texto — oráculo cbline)
            if (pg.G.Kind != GlyphKind.Obj) { tAsc = Lines.JsMax2(tAsc, pg.G.NAsc ?? pg.G.Asc); tDesc = Lines.JsMax2(tDesc, pg.G.NDesc ?? pg.G.Desc); }
            else
            {
                var om = Fonts.FaceMetrics(pg.G.Face.Font);
                oAsc = Lines.JsMax2(oAsc, om.Ascent * pg.G.SizePt * 20);
                oDesc = Lines.JsMax2(oDesc, om.Descent * pg.G.SizePt * 20);
                // objeto SUBLINHADO: o Word desenha o sublinhado sob ele e a descendente da
                // fonte do run entra na linha (oráculo imgul)
                if (pg.G.Style.Underline is { } ul && ul.Val != "none") desc = Lines.JsMax2(desc, om.Descent * pg.G.SizePt * 20);
            }
        }
        // linha só com objetos em linha: no mínimo a altura da fonte do RUN do objeto (o objeto
        // baixo fica no pé dela) — oráculo imgsmall; o objeto alto define a linha (imgbr)
        if (tAsc + tDesc == 0 && oAsc > 0) asc = Lines.JsMax2(asc, oAsc + oDesc - desc);
        // traço horizontal (o:hr), sozinho na linha: a altura é a da fonte do RUN do traço (a
        // marca de parágrafo não conta) e o traço é um objeto de altura h + 5 pt no pé dela —
        // a entrelinha múltipla soma (fator − 1) × a altura dessa fonte (oráculo hrfont)
        foreach (var pg in placed)
        {
            if (pg.G.Hr is not { } hr) continue;
            var om = Fonts.FaceMetrics(pg.G.Face.Font);
            double fa = om.Ascent * pg.G.SizePt * 20, fd = om.Descent * pg.G.SizePt * 20;
            tAsc = Lines.JsMax2(tAsc, fa);
            tDesc = Lines.JsMax2(tDesc, fd);
            desc = Lines.JsMax2(desc, fd);
            asc = Lines.JsMax2(Lines.JsMax2(asc, fa), hr + 100 - desc);
        }
        // linha SÓ com tabulações que não é a última do parágrafo (o texto desceu para a seguinte):
        // a altura é a das tabulações, não a da marca (oráculo ftrtabs; corpus t20)
        if (!lastLine && asc == 0 && desc == 0)
        {
            var tabContent = placed.Where(pg => pg.G.Kind != GlyphKind.Obj || pg.G.Adv > 0).ToList();
            if (tabContent.Any(pg => pg.G.Kind == GlyphKind.Tab) && tabContent.All(pg => pg.G.Kind == GlyphKind.Tab || pg.G.Ch == " "))
            {
                foreach (var pg in tabContent)
                {
                    if (pg.G.Kind != GlyphKind.Tab) continue;
                    asc = Lines.JsMax2(asc, pg.G.Asc); desc = Lines.JsMax2(desc, pg.G.Desc);
                    tAsc = Lines.JsMax2(tAsc, pg.G.NAsc ?? pg.G.Asc); tDesc = Lines.JsMax2(tDesc, pg.G.NDesc ?? pg.G.Desc);
                }
            }
        }
        bool emptyLine = asc == 0 && desc == 0;
        if (emptyLine)
        {
            // linha vazia: altura pela marca de parágrafo (deslocada por w:position — oráculo position)
            var mm = Fonts.FaceMetrics(p.MarkFace.Font);
            // marca em sobrescrito/subscrito: a linha tem a altura do corpo NORMAL, como o
            // texto (oráculo supmark)
            string? va = p.MarkStyle.Rpr.VertAlign;
            double sz = (va is "superscript" or "subscript" ? (p.MarkStyle.Rpr.Sz ?? 20) / 2 : p.MarkStyle.SizePt) * 20;
            double sh = Js.Truthy(va) ? 0 : p.MarkStyle.Shift;
            // (a sombra w14:shadow da marca também conta — oráculo shadowh)
            var (ea, ed) = Para.ShadowExtent(p.MarkStyle);
            asc = Math.Max(0, mm.Ascent * sz + ea + sh);
            desc = Math.Max(0, mm.Descent * sz + ed - sh);
        }
        if (tAsc + tDesc == 0)
        {
            // só objetos: a altura de texto (p/ entrelinha múltipla) vem da fonte do RUN do
            // objeto (oráculo imgline); linha vazia: a caixa da marca JÁ deslocada
            // (pos-empty15); senão a marca de parágrafo
            var mm = Fonts.FaceMetrics(p.MarkFace.Font);
            bool hasO = oAsc != 0 && !double.IsNaN(oAsc);
            tAsc = hasO ? oAsc : emptyLine ? asc : mm.Ascent * p.MarkStyle.SizePt * 20;
            tDesc = hasO ? oDesc : emptyLine ? desc : mm.Descent * p.MarkStyle.SizePt * 20;
        }
        // marcador de numeração: só a ASCENDENTE entra na linha (a descendente e a
        // entrelinha múltipla seguem o texto) — oráculo markers
        if (markerPlaced is not null) foreach (var pg in markerPlaced) asc = Lines.JsMax2(asc, pg.G.Asc);
        var box = Lines.LineBox(asc, desc, p, tAsc + tDesc > 0 ? tAsc + tDesc : null, _grid);

        // alinhamento/justificação
        double availW = right - xStart;
        double dx = 0;
        string jc = p.Jc;
        // layout asiático dos modos ≤ 14 (oráculo fecompress): a pontuação pendurada fica
        // além da margem e não conta no alinhamento; sem justificar, os espaços comprimem
        // o que passar da margem
        PlacedGlyph? lastC = null;
        foreach (var pg in placed) if (pg.G.Kind is not (GlyphKind.Space or GlyphKind.Lb or GlyphKind.Pb or GlyphKind.Cb)) lastC = pg;
        double alignW = lastC is not null && lastC.G.Hang && lineWidth > availW + FitEps ? lineWidth - lastC.W : lineWidth;
        bool justified = (jc == "both" || jc == "distribute") && (!lastLine || jc == "distribute") && breakAfter is null;
        if (!justified && alignW > availW + FitEps)
        {
            double lastCx = lastC?.X ?? 0;
            var sh = placed.Where(pg => pg.G.FeShrink is { } fs && fs != 0 && !double.IsNaN(fs) && pg.X < lastCx).ToList();
            double total = sh.Aggregate(0.0, (a, pg) => a + pg.G.FeShrink!.Value);
            if (total > 0)
            {
                double f = Math.Min(1, (alignW - availW) / total);
                double acc = 0;
                var shSet = new HashSet<PlacedGlyph>(sh, ReferenceEqualityComparer.Instance);
                foreach (var pg in placed)
                {
                    pg.X -= acc;
                    if (pg.G.FeShrink is { } fs2 && fs2 != 0 && shSet.Contains(pg)) { pg.W -= fs2 * f; acc += fs2 * f; }
                }
            }
        }
        if (jc == "center") dx = (availW - alignW) / 2;
        else if (jc == "right") dx = availW - alignW;
        else if (justified)
        {
            // espaços internos (não finais, depois do último tab)
            int lastTab = -1;
            for (int k = 0; k < placed.Count; k++) if (placed[k].G.Kind == GlyphKind.Tab) lastTab = k;
            int lastContent = -1;
            for (int k = 0; k < placed.Count; k++) if (placed[k].G.Kind != GlyphKind.Space && placed[k].G.Kind != GlyphKind.Lb) lastContent = k;
            int firstContent = placed.Count;
            for (int k = lastTab + 1; k < placed.Count; k++) if (placed[k].G.Kind != GlyphKind.Space) { firstContent = k; break; }
            var spaces = new HashSet<PlacedGlyph>(ReferenceEqualityComparer.Instance);
            for (int k = 0; k < placed.Count; k++)
                if (k > firstContent && k < lastContent && placed[k].G.Kind == GlyphKind.Space && !FixedSpace(placed[k].G.Cp) && !placed[k].G.Fixed) spaces.Add(placed[k]);
            double extra = availW - alignW;
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
            Clear = clearAfter,
            Last = lastLine,
            GapTab = gapTab,
            Spanned = spanned,
        };
    }
}

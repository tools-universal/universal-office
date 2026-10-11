using System.Text.RegularExpressions;
using System.Runtime.CompilerServices;
using OfficeNext.Docx;

namespace OfficeNext.DocxLayout;

/// <summary>
/// Motor de layout de documento (porta de docx-layout/src/engine.ts): seções →
/// páginas → colunas, parágrafos (espaçamento colapsado pelo maior,
/// contextual, autospacing, viúvas/órfãs, keepNext/keepLines), tabelas,
/// cabeçalhos/rodapés (que empurram o corpo), objetos flutuantes e campos de
/// página. Regras medidas no Word: ver write/tools/layout-oracle e os
/// .word.json em write/packages/docx-layout/test/oracle.
/// </summary>
public static class LayoutEngine
{
    public static LayoutResult LayoutDocument(FullDocument full, IFontProvider provider, LayoutOptions? opts = null)
    {
        var fmt = full.Formatting ?? DocContext.EmptyFormatting();
        // NUMPAGES e PAGEREF dependem do próprio layout: a 1ª passada estima, as
        // seguintes usam o total de páginas e as páginas dos indicadores da anterior
        double total = 1;
        var marks = new Dictionary<string, string>(StringComparer.Ordinal);
        LayoutResult? result = null;
        for (int pass = 0; pass < 4; pass++)
        {
            var ctx = new DocContext(fmt, provider, opts);
            var eng = new Engine(ctx, full, total, marks);
            result = eng.Run();
            var newMarks = eng.UsedPageRef ? eng.BookmarkPages() : marks;
            bool stable = (!eng.UsedNumPages || result.Pages.Count == total)
                && (!eng.UsedPageRef || SameMap(newMarks, marks));
            if (stable) break;
            total = result.Pages.Count;
            marks = newMarks;
        }
        return result!;
    }

    private static bool SameMap(Dictionary<string, string> a, Dictionary<string, string> b)
    {
        if (a.Count != b.Count) return false;
        foreach (var (k, v) in a) if (!b.TryGetValue(k, out var bv) || bv != v) return false;
        return true;
    }
}

internal sealed class SectGeom
{
    public int Index;
    public double PageW, PageH, MarL, MarR, MarT, MarB, Hdr, Ftr;
    public List<(double X, double W)> Cols = new();
    public bool ColSep;
    public bool TitlePg;
    public string Type = "nextPage";
    public string? VAlign;
    public double? PgStart;
    public string? PgFmt;
    public HfBlocks Headers = new();
    public HfBlocks Footers = new();
    public (int Start, int End) Blocks;
    /// <summary>w:lnNumType</summary>
    public (double CountBy, double Start, string Restart, double Distance)? LnNum;
    /// <summary>grade de linhas (docGrid type=lines/linesAndChars): passo em twips</summary>
    public double? LinePitch;
}

internal sealed class FloatBox
{
    public double X, Y, W, H;
    public string Wrap = "none";
    public double DistL, DistR, DistT, DistB;
}

/// <summary>Objeto flutuante com sua ordem z (wp:anchor relativeHeight / VML z-index).</summary>
internal sealed class ZObj
{
    public double Z;
    public int Seq;
    public List<PageItem> Items = new();
}

internal sealed class PageState
{
    public LayoutPage Page = null!;
    public SectGeom Geom = null!;
    public double BodyTop;
    public double BodyBottom;
    /// <summary>objetos flutuantes por camada (ordem final por relativeHeight)</summary>
    public List<ZObj> Behind = new();
    public List<PageItem> Hf = new();
    public List<PageItem> Body = new();
    public List<ZObj> Front = new();
    public List<ZObj> HfBehind = new();
    public List<ZObj> HfFront = new();
    public List<FloatBox> Floats = new();
    /// <summary>índice da página dentro da seção (0 = primeira)</summary>
    public int SectPage;
    /// <summary>notas de rodapé desta página (ids, na ordem) e o conteúdo já diagramado</summary>
    public List<(double Id, CellContent Content)> Notes = new();
    /// <summary>altura reservada no pé (separador + notas) e o fundo do corpo sem notas</summary>
    public double NoteArea;
    public double BodyBottomBase;
}

/// <summary>Parágrafo vizinho de uma célula na ordem do documento (espaçamento contextual).</summary>
internal sealed class CtxNeighbor
{
    public string? StyleId;
}

/// <summary>Vizinhos de uma célula: antes do 1º e depois do último parágrafo dela.</summary>
internal sealed class CellNeighbors
{
    public CtxNeighbor? Prev;
    public CtxNeighbor? Next;
}

internal sealed class PrevPara
{
    public double After;
    public bool AfterAuto;
    public string? StyleId;
    public bool Contextual;
    public PBdr? PBdr;
    public string? PBdrKey;
}

internal sealed class Engine
{
    private readonly List<PageState> _pages = new();
    private PageState _cur = null!;
    private int _col;
    private double _y;
    /// <summary>topo da área de colunas corrente (muda numa seção contínua)</summary>
    private double _colTop;
    private bool _atTop = true;
    private PrevPara? _prev;
    private bool _firstInDoc = true;
    public bool UsedNumPages;
    private List<SectGeom> _geoms = new();
    /// <summary>numeração de linhas: contador e onde foi zerado</summary>
    private double _lnCount;
    private PageState? _lnPage;
    private int _lnSect = -1;
    /// <summary>última linha de tabela emitida (borda de fechamento na quebra de página)</summary>
    private (RowLayout Row, double Y)? _lastRowEmit;
    /// <summary>diagramando cabeçalho/rodapé (floats vão para as camadas do HF)</summary>
    private bool _inHf;
    /// <summary>flutuantes já posicionados antes do fluxo (posição vertical absoluta no HF)</summary>
    private readonly HashSet<Run> _prePlaced = new(ReferenceEqualityComparer.Instance);
    private int _zSeq;
    public bool UsedPageRef;
    /// <summary>linhas de tabelas flutuantes que continuam na próxima página</summary>
    private List<FloatCarryItem> _floatCarry = new();
    /// <summary>medição do rodapé: ignora flutuantes de posição absoluta</summary>
    private bool _onlyTextFloats;

    private sealed record FloatCarryItem(TableLayout T, List<RowLayout> Rows, TblpPr Fp, double RefX);

    private readonly DocContext _ctx;
    private readonly FullDocument _full;
    private readonly double _totalPagesGuess;
    /// <summary>página exibida de cada indicador (passada anterior) — PAGEREF</summary>
    private readonly Dictionary<string, string> _marksGuess;

    public Engine(DocContext ctx, FullDocument full, double totalPagesGuess, Dictionary<string, string>? marksGuess = null)
    {
        _ctx = ctx;
        _full = full;
        _totalPagesGuess = totalPagesGuess;
        _marksGuess = marksGuess ?? new Dictionary<string, string>(StringComparer.Ordinal);
    }


    private static readonly Regex WsRe = new(@"\s+", RegexOptions.CultureInvariant);
    private static readonly Regex SeqR = new(@"\\r\s*([0-9]+)", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);
    private static readonly Regex SeqC = new(@"\\c(?![A-Za-z0-9_])", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);
    private static readonly Regex SeqH = new(@"\\h(?![A-Za-z0-9_])", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);
    private static readonly Regex SeqFmt = new(@"\\\*\s*([A-Za-z0-9_]+)", RegexOptions.CultureInvariant);
    private static readonly Regex RefSwitch = new(@"\\[nrwp](?![A-Za-z0-9_])", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);
    private static readonly Regex RefWs = new("[\t\n\f\u000B]", RegexOptions.CultureInvariant);
    private static readonly Regex BRef = new(@"^b([0-9]+)", RegexOptions.CultureInvariant);

    private static string[] SplitWs(string s) => WsRe.Split(s.Trim());

    /// <summary>SEQ id [\* formato] [\r n] [\c] [\h] — contadores na ordem do documento.</summary>
    private string? SeqValue(string instr)
    {
        var tok = SplitWs(instr);
        string? id = tok.Length > 1 ? Js.ToLower(tok[1]) : null;
        if (string.IsNullOrEmpty(id) || id.StartsWith('\\')) return null;
        double v = _ctx.SeqCounters.TryGetValue(id, out var cv) ? cv : 0;
        var r = SeqR.Match(instr);
        if (r.Success) v = Js.ParseInt(r.Groups[1].Value);
        else if (!SeqC.IsMatch(instr)) v++;
        _ctx.SeqCounters[id] = v;
        if (SeqH.IsMatch(instr)) return "";
        var fm = SeqFmt.Match(instr);
        string fmt = fm.Success ? fm.Groups[1].Value : "ARABIC";
        string mapped = fmt switch
        {
            "ARABIC" => "decimal",
            "ALPHABETIC" => "upperLetter",
            "alphabetic" => "lowerLetter",
            "ROMAN" => "upperRoman",
            "roman" => "lowerRoman",
            _ => "decimal",
        };
        return NumberFormat.FormatNumber(v, mapped, _ctx.Opts.Lang);
    }

    /// <summary>REF indicador: o texto do parágrafo do indicador (os do sumário cobrem o título inteiro).</summary>
    private string? RefValue(string instr)
    {
        var tok = SplitWs(instr);
        string? bm = tok.Length > 1 ? tok[1] : null;
        if (string.IsNullOrEmpty(bm) || RefSwitch.IsMatch(instr)) return null; // número de parágrafo / posição: mantém o cache
        if (!_full.Bookmarks.TryGetValue(bm, out var b)) return null;
        var blk = b >= 0 && b < _full.Blocks.Count ? _full.Blocks[b] : null;
        if (blk is not ParagraphBlock pb) return null;
        string text = string.Concat(pb.Paragraph.Runs.Select(x => Js.Truthy(x.Field) || x.Image is not null || x.Textbox is not null ? "" : x.Text));
        text = RefWs.Replace(text, " ").Trim();
        return text.Length > 0 ? text : null;
    }

    /// <summary>Página exibida (já formatada) do parágrafo de cada indicador.</summary>
    public Dictionary<string, string> BookmarkPages()
    {
        var outp = new Dictionary<string, string>(StringComparer.Ordinal);
        var firstPage = new Dictionary<double, LayoutPage>();
        foreach (var ps in _pages)
        {
            foreach (var l in ps.Page.Lines)
            {
                var m = BRef.Match(l.Ref);
                if (m.Success)
                {
                    double k = Js.ParseInt(m.Groups[1].Value);
                    if (!firstPage.ContainsKey(k)) firstPage[k] = ps.Page;
                }
            }
        }
        foreach (var name in _full.BookmarkOrder.Count == _full.Bookmarks.Count ? _full.BookmarkOrder : _full.Bookmarks.Keys.ToList())
        {
            int block = _full.Bookmarks[name];
            // indicador em bloco sem linha (vazio): a próxima linha diagramada
            LayoutPage? pg = null;
            for (double b = block; b < block + 50 && pg is null; b++) firstPage.TryGetValue(b, out pg);
            if (pg is null) continue;
            var ps = _pages.First(x => ReferenceEquals(x.Page, pg));
            outp[name] = NumberFormat.FormatNumber(pg.Number, ps.Geom.PgFmt ?? "decimal", _ctx.Opts.Lang);
        }
        return outp;
    }

    public LayoutResult Run()
    {
        var full = _full;
        // sequencial: cada seção herda cabeçalho/rodapé da anterior (geomOf lê this.geoms)
        _geoms = new List<SectGeom>();
        for (int i = 0; i < full.Sections.Count; i++) _geoms.Add(GeomOf(full.Sections[i], i));
        if (_geoms.Count == 0)
        {
            _geoms.Add(GeomOf(new Section
            {
                SectPr = new SectPr { PageWidthTwips = 11906, PageHeightTwips = 16838, MarginLeftTwips = 1701, MarginRightTwips = 1701, MarginTopTwips = 1417, MarginBottomTwips = 1417 },
                BlockStart = 0, BlockEnd = full.Blocks.Count - 1,
            }, 0));
        }
        foreach (var g in _geoms)
        {
            if (g.Index == 0 || g.Type != "continuous") NewPage(g, g.Type);
            else ContinuousSection(g);
            for (int b = g.Blocks.Start; b <= g.Blocks.End && b < full.Blocks.Count; b++)
            {
                var block = full.Blocks[b];
                if (block is ParagraphBlock pb) PlaceParagraph(pb.Paragraph, $"b{b}", b, g);
                else PlaceTable((TableBlock)block, $"b{b}", b);
            }
        }
        // tabela flutuante dividida no fim do documento: as linhas restantes ganham páginas
        for (int k = 0; k < 100 && _floatCarry.Count > 0 && _cur is not null; k++) NewPage(_cur.Geom);
        if (_cur is not null) PaintNotes(_cur);
        // finaliza páginas (cabeçalhos/rodapés já entram na criação)
        var pages = _pages.Select(ps =>
        {
            // camadas do Word: TODO o cabeçalho/rodapé (atrás, texto, frente) fica
            // abaixo do documento; no corpo, atrás do texto < texto < na frente
            var hfLayer = new List<PageItem>();
            hfLayer.AddRange(ZItems(ps.HfBehind));
            hfLayer.AddRange(ps.Hf);
            hfLayer.AddRange(ZItems(ps.HfFront));
            var items = new List<PageItem>(hfLayer);
            items.AddRange(ZItems(ps.Behind));
            items.AddRange(ps.Body);
            items.AddRange(ZItems(ps.Front));
            ps.Page.Items = items;
            ps.Page.HfItems = hfLayer.Count;
            return ps.Page;
        }).ToList();
        return new LayoutResult { Pages = pages, Warnings = _ctx.Warnings.ToList() };
    }

    private static IEnumerable<PageItem> ZItems(List<ZObj> objs) =>
        objs.OrderBy(o => o.Z, JsNumberComparer.Instance).ThenBy(o => o.Seq).SelectMany(o => o.Items).ToList();

    // ───────────────────────── seções e páginas ─────────────────────────

    private SectGeom GeomOf(Section s, int i)
    {
        var sp = s.SectPr;
        double pageW = sp.PageWidthTwips, pageH = sp.PageHeightTwips;
        double marL = sp.MarginLeftTwips, marR = sp.MarginRightTwips;
        double contentW = Math.Max(720, pageW - marL - marR);
        var cols = new List<(double X, double W)>();
        var defs = s.Sect?.ColDefs;
        double n = Math.Max(1, sp.Cols?.Count ?? 1);
        if (n > 1 && defs is not null && defs.Count >= n && s.Sect?.EqualWidth == false)
        {
            double x = marL;
            foreach (var d in defs.Take((int)n)) { cols.Add((x, d.W)); x += d.W + d.Space; }
        }
        else if (n > 1)
        {
            double space = sp.Cols?.SpaceTwips ?? 720;
            double w = (contentW - space * (n - 1)) / n;
            for (int k = 0; k < n; k++) cols.Add((marL + k * (w + space), w));
        }
        else cols.Add((marL, contentW));
        // header/footer herdados da seção anterior quando a seção não define
        var prev = i > 0 && i - 1 < _geoms.Count ? _geoms[i - 1] : null;
        static HfBlocks Pick(HfBlocks? own, HfBlocks? inherited)
        {
            var outp = new HfBlocks { Default = inherited?.Default, First = inherited?.First, Even = inherited?.Even };
            if (own?.Default is not null) outp.Default = own.Default;
            if (own?.First is not null) outp.First = own.First;
            if (own?.Even is not null) outp.Even = own.Even;
            return outp;
        }
        var hb = s.HeaderBlocks ?? BlocksOfParas(s.Headers);
        var fb = s.FooterBlocks ?? BlocksOfParas(s.Footers);
        var g = new SectGeom
        {
            Index = i, PageW = pageW, PageH = pageH, MarL = marL, MarR = marR,
            MarT = sp.MarginTopTwips, MarB = sp.MarginBottomTwips,
            Hdr = sp.HeaderDistanceTwips ?? 720, Ftr = sp.FooterDistanceTwips ?? 720,
            Cols = cols, ColSep = sp.Cols?.Sep == true, TitlePg = sp.TitlePg == true,
            Type = s.Sect?.Type ?? "nextPage",
            VAlign = Js.Truthy(s.Sect?.VAlign) ? s.Sect!.VAlign : null,
            PgStart = sp.PgNumStart,
            PgFmt = Js.Truthy(s.Sect?.PgNumFmt) ? s.Sect!.PgNumFmt : null,
            Headers = Pick(hb, prev?.Headers),
            Footers = Pick(fb, prev?.Footers),
            Blocks = (s.BlockStart, s.BlockEnd),
        };
        var dg = s.Sect?.DocGrid;
        if (dg is not null && (dg.Type == "lines" || dg.Type == "linesAndChars") && (dg.LinePitch ?? 0) > 0) g.LinePitch = dg.LinePitch;
        var ln = s.Sect?.LnNumType;
        if (ln is not null)
        {
            g.LnNum = (Math.Max(1, ln.CountBy ?? 1), ln.Start ?? 0, ln.Restart ?? "newPage", ln.Distance ?? 360);
        }
        return g;
    }

    private double PageNumber(SectGeom g, int sectPage)
    {
        // numeração continua da seção anterior, salvo pgNumType/@start
        if (g.PgStart is { } ps) return ps + sectPage;
        var prev = _pages.Count > 0 ? _pages[^1] : null;
        if (sectPage == 0) return prev is not null ? prev.Page.Number + 1 : 1;
        return (prev?.Page.Number ?? 0) + 1;
    }

    private void NewPage(SectGeom g, string breakType = "nextPage")
    {
        int sectPage = _cur is not null && ReferenceEquals(_cur.Geom, g) ? _cur.SectPage + 1 : 0;
        double number = PageNumber(g, sectPage);
        // evenPage/oddPage: página em branco para acertar a paridade
        if (sectPage == 0 && _pages.Count > 0 && (breakType == "evenPage" || breakType == "oddPage"))
        {
            bool wantEven = breakType == "evenPage";
            if ((number % 2 == 0) != wantEven)
            {
                MakePage(g, sectPage, number);
                number++;
                NewPageAt(g, sectPage + 1, number);
                return;
            }
        }
        NewPageAt(g, sectPage, number);
    }

    private void NewPageAt(SectGeom g, int sectPage, double number)
    {
        MakePage(g, sectPage, number);
        _col = 0;
        _colTop = _cur.BodyTop;
        _y = _cur.BodyTop;
        _atTop = true;
        _prev = null;
        if (_floatCarry.Count > 0) PlaceFloatCarry();
    }

    private void MakePage(SectGeom g, int sectPage, double number)
    {
        var page = new LayoutPage { WidthTw = g.PageW, HeightTw = g.PageH, Section = g.Index, Number = number };
        var ps = new PageState
        {
            Page = page, Geom = g, BodyTop = g.MarT, BodyBottom = g.PageH - g.MarB,
            SectPage = sectPage, NoteArea = 0, BodyBottomBase = g.PageH - g.MarB,
        };
        if (_cur is not null) PaintNotes(_cur);
        _pages.Add(ps);
        _cur = ps;
        LayoutHeaderFooter(ps);
        ps.BodyBottomBase = ps.BodyBottom;
    }

    private void ContinuousSection(SectGeom g)
    {
        // mesma página; nova geometria de colunas a partir do y atual
        _cur.Geom = g;
        _col = 0;
        _colTop = _y;
        _prev = null;
    }

    private (double X, double W) ColFrame()
    {
        var cols = _cur.Geom.Cols;
        var c = _col < cols.Count ? cols[_col] : cols[0];
        return (c.X, c.W);
    }

    /// <summary>Fim da coluna: próxima coluna ou nova página.</summary>
    private void BreakColumn()
    {
        var g = _cur.Geom;
        if (_col < g.Cols.Count - 1)
        {
            _col++;
            _y = _colTop;
            _atTop = true;
            _prev = null;
        }
        else NewPage(g);
    }

    // ───────────────────────── cabeçalho / rodapé ─────────────────────────

    private Func<string, string?, string?> FieldValue(PageState ps) => (name, instr) =>
    {
        if (name == "PAGEREF")
        {
            UsedPageRef = true;
            var tok = SplitWs(instr ?? "");
            string? bm = tok.Length > 1 ? tok[1] : null;
            return !string.IsNullOrEmpty(bm) && _marksGuess.TryGetValue(bm, out var v) ? v : null;
        }
        if (name == "SEQ") return SeqValue(instr ?? "");
        if (name == "REF") return RefValue(instr ?? "");
        if (name == "PAGE") return NumberFormat.FormatNumber(ps.Page.Number, ps.Geom.PgFmt ?? "decimal", _ctx.Opts.Lang);
        if (name == "NUMPAGES") { UsedNumPages = true; return Js.Str(_totalPagesGuess); }
        if (name == "SECTIONPAGES") { UsedNumPages = true; return Js.Str(_totalPagesGuess); }
        if (name == "SECTION") return Js.Str(ps.Geom.Index + 1);
        return null;
    };

    private void LayoutHeaderFooter(PageState ps)
    {
        var g = ps.Geom;
        var settings = _ctx.Fmt.Settings;
        bool first = ps.SectPage == 0 && g.TitlePg;
        bool even = settings.EvenAndOddHeaders && ps.Page.Number % 2 == 0;
        string kind = first ? "first" : even ? "even" : "default";
        List<Block>? Pick(HfBlocks set) => first ? set.First : even ? set.Even : set.Default;
        var env = new ParaEnv { Field = FieldValue(ps), Numbering = false };
        double width = g.PageW - g.MarL - g.MarR;
        // numeração em cabeçalho/rodapé não avança a lista do corpo
        var savedNum = _ctx.Numbering;
        _ctx.Numbering = new NumberingState(_ctx.Fmt.Numbering, _ctx.Fmt.Styles.Styles, _ctx.Opts.Lang);
        _inHf = true;
        try
        {
            var hdr = Pick(g.Headers);
            if (hdr is { Count: > 0 })
            {
                var r = LayoutStatic(hdr, g.MarL, width, env, $"hdr:{kind}", ps, g.Hdr);
                foreach (var it in r.Items) ps.Hf.Add(TableEngine.ShiftItem(it, g.Hdr));
                foreach (var l in r.Lines) ps.Page.Lines.Add(ShiftLine(l, g.Hdr));
                // o corpo começa abaixo do cabeçalho se ele invadir a margem
                ps.BodyTop = Math.Max(g.MarT, g.Hdr + r.Height);
            }
            var ftr = Pick(g.Footers);
            if (ftr is { Count: > 0 })
            {
                // 1ª passada só mede (sem página: floats não são colocados); a 2ª posiciona
                // os flutuantes ancorados no rodapé já com o topo real do rodapé
                // (medições puras: só a diagramação final avança listas/SEQ/notas)
                var probe = _ctx.Pure(() => LayoutStatic(ftr, g.MarL, width, env, $"ftr:{kind}", null, 0));
                double top = g.PageH - g.Ftr - probe.Height;
                // os flutuantes do rodapé podem empurrar o conteúdo (tabela que desce para
                // baixo de uma caixa de texto): mede de novo com eles, numa página de rascunho
                var probe2 = _ctx.Pure(() => LayoutStatic(ftr, g.MarL, width, env, $"ftr:{kind}", ScratchPage(ps), top));
                // o corpo recua só pelo desvio de flutuantes que acompanham o texto do
                // rodapé (caixa ancorada no parágrafo); os de posição absoluta não contam (medido no Word)
                double limitH = probe.Height;
                if (probe2.Height > probe.Height + 1)
                {
                    top = g.PageH - g.Ftr - probe2.Height;
                    _onlyTextFloats = true;
                    try
                    {
                        limitH = _ctx.Pure(() => LayoutStatic(ftr, g.MarL, width, env, $"ftr:{kind}", ScratchPage(ps), top)).Height;
                    }
                    finally { _onlyTextFloats = false; }
                }
                var r = LayoutStatic(ftr, g.MarL, width, env, $"ftr:{kind}", ps, top);
                foreach (var it in r.Items) ps.Hf.Add(TableEngine.ShiftItem(it, top));
                foreach (var l in r.Lines) ps.Page.Lines.Add(ShiftLine(l, top));
                ps.BodyBottom = Math.Min(g.PageH - g.MarB, g.PageH - g.Ftr - limitH);
            }
        }
        finally
        {
            _inHf = false;
            _ctx.Numbering = savedNum;
        }
    }

    // ───────────────────────── fluxo estático (célula, HF, caixa) ─────────────────────────

    /// <summary>
    /// Diagrama blocos sem paginação (y relativo a 0). Floats ancorados são
    /// posicionados na página `ps` (se houver) com `yOrigin` = y absoluto do topo.
    /// </summary>
    public CellContent LayoutStatic(List<Block> blocks, double x, double width, ParaEnv env, string reference, PageState? ps = null, double yOrigin = 0, CellNeighbors? nb = null)
    {
        var items = new List<PageItem>();
        var lines = new List<LaidOutLine>();
        double y = 0;
        PrevPara? prev = null;
        bool keepNext = false;
        int n = blocks.Count;
        var envNoBreaks = env.Clone();
        envNoBreaks.NoPageBreaks = true;
        bool isHf = ps is not null && HfRefRe.IsMatch(reference);
        // cabeçalho/rodapé (também nas medições sem página): o "depois" automático do
        // último parágrafo conta na altura — só na célula ele some (oráculo autosp)
        bool hfFlow = HfRefRe.IsMatch(reference);
        if (isHf)
        {
            // cabeçalho/rodapé: flutuantes com posição vertical absoluta (página/margem)
            // vão primeiro — o conteúdo ANTES da âncora também os contorna (medido no Word)
            foreach (var b0 in blocks)
            {
                if (b0 is not ParagraphBlock pb0) continue;
                foreach (var run in pb0.Paragraph.Runs)
                {
                    var anc = run.Image?.Anchor ?? run.Shape?.Anchor ?? run.Group?.Anchor ?? run.Textbox?.Anchor;
                    if (!IsFloating(run) || anc is null || !AbsoluteV.Contains(anc.PosV.RelativeFrom ?? "") || _onlyTextFloats) continue;
                    PlaceFloat(run, ps!, x, width, yOrigin, items, yOrigin);
                    _prePlaced.Add(run);
                }
            }
        }
        // runs de parágrafos de marca oculta que se juntam ao seguinte
        List<Run>? join = null;
        for (int bi = 0; bi < n; bi++)
        {
            var b = blocks[bi];
            if (b is ParagraphBlock pblk)
            {
                var para = join is not null ? JoinRuns(join, pblk.Paragraph) : pblk.Paragraph;
                join = null;
                var p = Para.PrepareParagraph(_ctx, para, envNoBreaks);
                // marca oculta (fora o último bloco): sem conteúdo visível não ocupa nada;
                // com conteúdo, junta-se ao parágrafo seguinte (oráculo hidden)
                if (p.MarkStyle.Hidden && bi < n - 1)
                {
                    if (p.Glyphs.Count == 0) continue;
                    if (blocks[bi + 1] is ParagraphBlock) { join = para.Runs; continue; }
                }
                if (p.KeepNext) keepNext = true;
                bool firstInCell = bi == 0;
                bool lastInCell = bi == n - 1;
                double before = p.BeforeAuto ? (firstInCell ? 0 : 280) : p.SpaceBefore;
                double prevAfter = prev is not null ? prev.After : 0;
                if (prev is not null && prev.StyleId == p.StyleId)
                {
                    if (prev.Contextual) prevAfter = 0;
                    if (p.Contextual) before = 0;
                }
                // 1º parágrafo da célula: o vizinho anterior é o parágrafo antes da tabela, o
                // último da célula anterior ou a marca de fim de linha (oráculo autosp2)
                if (bi == 0 && nb?.Prev is not null && p.Contextual && nb.Prev.StyleId == p.StyleId) before = 0;
                y += Collapse(prevAfter, before);
                double top = y;
                var br = new LineBreaker(_ctx, p);
                var frame0 = new LineFrame(p.IndLeft, width - p.IndRight);
                // cabeçalho/rodapé: os flutuantes do parágrafo são posicionados ANTES das
                // linhas e o texto (inclusive o do próprio parágrafo) os contorna — oráculo hffloat
                bool hfWrap = ps is not null && HfRefRe.IsMatch(reference);
                if (hfWrap) PlaceFloats(p, ps!, x, width, yOrigin + top, items, yOrigin);
                double boxTop = y;
                int boxAt = items.Count;
                y += BorderTopExtent(p, prev);
                do
                {
                    var frame = frame0;
                    if (hfWrap)
                    {
                        double lh = MarkLineH(p);
                        frame = WrapFrame(frame0, x, yOrigin + y, lh, ps);
                        for (int k = 0; k < 8 && frame.SkipTo is { } st && st - yOrigin > y; k++)
                        {
                            y = frame.SkipTo!.Value - yOrigin;
                            frame = WrapFrame(frame0, x, yOrigin + y, lh, ps);
                        }
                    }
                    var line = br.Next(frame);
                    Paint.PaintLine(_ctx, items, line, x, y);
                    lines.Add(LineRecord($"{reference}/b{bi}", p, line, x, y));
                    y += line.Height;
                } while (!br.Done());
                bool groupedNext = GroupsWithNext(p, bi + 1 < n ? blocks[bi + 1] : null, env);
                y += BorderBottomExtent(p, groupedNext);
                PaintBox(items, p, x, width, boxTop, y, prev, boxAt, groupedNext);
                // floats ancorados no parágrafo (fora do cabeçalho/rodapé: depois das linhas)
                if (ps is not null && !hfWrap) PlaceFloats(p, ps, x, width, yOrigin + top, items, yOrigin);
                double after = p.AfterAuto ? (lastInCell && !hfFlow ? 0 : 280) : p.SpaceAfter;
                // último da célula: o vizinho seguinte é o 1º da próxima célula ou a marca de fim de linha
                if (lastInCell && nb?.Next is not null && p.Contextual && nb.Next.StyleId == p.StyleId) after = 0;
                prev = new PrevPara
                {
                    After = after, AfterAuto = p.AfterAuto, StyleId = p.StyleId, Contextual = p.Contextual,
                    PBdr = p.Ppr.PBdr, PBdrKey = BdrKey(p.Ppr),
                };
            }
            else if (b is TableBlock htb && htb.Rows.All(r => TableEngine.IsHiddenRow(_ctx, r)))
            {
                // tabela só com linhas ocultas: some (oráculo hidden)
            }
            else if (b is TableBlock ftb && ftb.TblPr?.TblpPr is { } ffp && ffp.TblpYSpec != "inline" && ps is not null && HfRefRe.IsMatch(reference))
            {
                // tabela flutuante no cabeçalho/rodapé: posição absoluta na página
                var t = TableEngine.LayoutTable(_ctx, ftb, 0, width, (cell, cx, cw, cenv, cref) => LayoutCell(cell, cx, cw, cenv, cref, ps), $"{reference}/b{bi}");
                PlaceFloatingTable(t, ffp, ps, yOrigin + y, x, width, items, yOrigin, false);
            }
            else
            {
                var tb = (TableBlock)b;
                y += prev is not null && !DropsAfterBeforeTable(prev, tb) ? prev.After : 0;
                AssignCellNeighbors(tb, prev is not null ? new CtxNeighbor { StyleId = prev.StyleId } : bi == 0 ? nb?.Prev : null);
                var t = TableEngine.LayoutTable(_ctx, tb, x, width,
                    (cell, cx, cw, cenv, cref) => LayoutCell(cell, cx, cw, cenv, cref, ps), $"{reference}/b{bi}");
                if (isHf && t.Rows.Count > 0)
                {
                    // tabela não contorna: se a 1ª linha cruza um flutuante com quebra, desce para baixo dele
                    double h0 = t.Rows[0].Height;
                    for (int k = 0; k < 8; k++)
                    {
                        double yy = yOrigin + y;
                        var hit = ps!.Floats.FirstOrDefault(fl => (fl.Wrap == "topAndBottom" || fl.Wrap == "square" || fl.Wrap == "tight" || fl.Wrap == "through")
                            && yy + h0 > fl.Y - fl.DistT && yy < fl.Y + fl.H + fl.DistB
                            && t.X + t.Width > fl.X - fl.DistL && t.X < fl.X + fl.W + fl.DistR);
                        if (hit is null) break;
                        y = hit.Y + hit.H + hit.DistB - yOrigin;
                    }
                }
                foreach (var row in t.Rows)
                {
                    foreach (var it in row.Items) items.Add(TableEngine.ShiftItem(it, y));
                    foreach (var it in row.BorderItems) items.Add(TableEngine.ShiftItem(it, y));
                    foreach (var l in row.Lines)
                    {
                        var nl = l.ShallowClone();
                        nl.Y = l.Y + y;
                        nl.Baseline = l.Baseline + y;
                        lines.Add(nl);
                    }
                    y += row.Height;
                }
                prev = RowEndPrev();
            }
        }
        // espaço depois do último parágrafo conta na altura (célula/HF)
        if (prev is not null) y += prev.After;
        return new CellContent { Items = items, Lines = lines, Height = y, KeepNext = keepNext };
    }

    private CellContent LayoutCell(TableCell cell, double x, double width, CellEnv env, string reference, PageState? ps = null)
    {
        var blocks = cell.Blocks ?? cell.Paragraphs.Select(p => (Block)new ParagraphBlock { Paragraph = p }).ToList();
        var penv = new ParaEnv { TablePPr = env.TablePPr, TableRPr = env.TableRPr, DarkBackground = env.DarkBackground };
        if (ps is not null) penv.Field = FieldValue(ps);
        _cellNb.TryGetValue(cell, out var nb);
        var c = LayoutStatic(blocks, x, width, penv, reference, ps, 0, nb);
        // hideMark: a marca da célula vazia não conta na altura da linha (vale a
        // altura mínima da linha) — oráculo hidden
        if (cell.TcPr?.HideMark == true && blocks.All(b => b is ParagraphBlock pb && !Para.ParaVisibility(_ctx, pb.Paragraph, penv).Visible))
            return new CellContent { Items = c.Items, Lines = c.Lines, Height = 0, KeepNext = c.KeepNext };
        // o "depois" do último parágrafo da célula também ocupa (Word)
        return c;
    }

    /// <summary>Parágrafo com runs de parágrafos de marca oculta à frente (as propriedades são deste).</summary>
    private static Paragraph JoinRuns(List<Run> join, Paragraph para) =>
        new() { Runs = join.Concat(para.Runs).ToList(), Props = para.Props, Ppr = para.Ppr };

    // ───────────────────────── espaçamento contextual em volta de tabelas ─────────────────────────
    // (oráculos autosp/autosp2) Para o contextualSpacing, os parágrafos seguem a ordem do
    // documento através da tabela: o de antes → 1º parágrafo da 1ª célula; o último de cada
    // célula → 1º da célula seguinte; o fim de cada linha é uma marca com o estilo de
    // parágrafo PADRÃO (não o da célula, nem o do parágrafo antes) → próxima linha / depois.

    private readonly ConditionalWeakTable<TableCell, CellNeighbors> _cellNb = new();

    private static List<Block> CellBlocks(TableCell cell) =>
        cell.Blocks ?? cell.Paragraphs.Select(p => (Block)new ParagraphBlock { Paragraph = p }).ToList();

    /// <summary>Estilo do 1º parágrafo (em ordem de documento) de uma sequência de blocos.</summary>
    private CtxNeighbor? FirstParaNeighbor(List<Block> blocks)
    {
        if (blocks.Count == 0) return null;
        var b = blocks[0];
        if (b is ParagraphBlock pb) return new CtxNeighbor { StyleId = _ctx.Resolver.ParaStyleId(DocContext.DirectPPr(pb.Paragraph).PStyle) };
        var tb = (TableBlock)b;
        var c = tb.Rows.Count > 0 && tb.Rows[0].Cells.Count > 0 ? tb.Rows[0].Cells[0] : null;
        return c is not null ? FirstParaNeighbor(CellBlocks(c)) : null;
    }

    /// <summary>Estilo do último parágrafo de uma célula (tabela no fim: a marca de fim de linha dela).</summary>
    private CtxNeighbor? LastParaNeighbor(List<Block> blocks)
    {
        if (blocks.Count == 0) return null;
        if (blocks[^1] is not ParagraphBlock pb) return RowEndNeighbor();
        return new CtxNeighbor { StyleId = _ctx.Resolver.ParaStyleId(DocContext.DirectPPr(pb.Paragraph).PStyle) };
    }

    /// <summary>Marca de fim de linha da tabela: estilo de parágrafo padrão.</summary>
    private CtxNeighbor RowEndNeighbor() => new() { StyleId = _ctx.Resolver.ParaStyleId(null) };

    /// <summary>"Parágrafo anterior" depois de uma tabela: a marca de fim de linha (sem espaço próprio).</summary>
    private PrevPara RowEndPrev() => new() { After = 0, AfterAuto = false, StyleId = RowEndNeighbor().StyleId, Contextual = false };

    /// <summary>O "depois" do parágrafo antes da tabela some (contextual com o 1º parágrafo dela)?</summary>
    private bool DropsAfterBeforeTable(PrevPara prev, TableBlock table)
    {
        if (!prev.Contextual) return false;
        var f = FirstParaNeighbor(new List<Block> { table });
        return f is not null && f.StyleId == prev.StyleId;
    }

    /// <summary>Registra os vizinhos de cada célula da tabela (`prev` = parágrafo antes dela).</summary>
    private void AssignCellNeighbors(TableBlock table, CtxNeighbor? prev)
    {
        for (int ri = 0; ri < table.Rows.Count; ri++)
        {
            var row = table.Rows[ri];
            for (int ci = 0; ci < row.Cells.Count; ci++)
            {
                var pv = ci > 0 ? LastParaNeighbor(CellBlocks(row.Cells[ci - 1])) : ri > 0 ? RowEndNeighbor() : prev;
                var nx = ci + 1 < row.Cells.Count ? FirstParaNeighbor(CellBlocks(row.Cells[ci + 1])) : RowEndNeighbor();
                _cellNb.AddOrUpdate(row.Cells[ci], new CellNeighbors { Prev = pv, Next = nx });
            }
        }
    }

    private double Collapse(double after, double before)
    {
        if (_ctx.Fmt.Settings.Compat.TryGetValue("doNotUseHTMLParagraphAutoSpacing", out var f) && f) return after + before;
        return Math.Max(after, before);
    }

    /// <summary>
    /// Bordas em grupo (oráculo pbdr): parágrafos seguidos com as mesmas bordas e
    /// recuos formam uma caixa — o topo (espaço + espessura) só no 1º; entre eles
    /// a borda "between" com o espaço dos DOIS lados; a base só no último.
    /// </summary>
    private static double BorderTopExtent(PreparedPara p, PrevPara? prev)
    {
        var b = p.Ppr.PBdr;
        if (prev?.PBdrKey is not null && prev.PBdrKey == BdrKey(p.Ppr))
        {
            var bt = b?.Between;
            return bt is not null && bt.Val != "none" && bt.Val != "nil" ? 2 * (bt.Space ?? 0) * 20 + Paint.BorderWidth(bt) : 0;
        }
        var top = b?.Top;
        if (top is null || top.Val is "none" or "nil") return 0;
        return (top.Space ?? 0) * 20 + Paint.BorderWidth(top);
    }

    private static double BorderBottomExtent(PreparedPara p, bool groupedNext = false)
    {
        var bottom = p.Ppr.PBdr?.Bottom;
        if (groupedNext || bottom is null || bottom.Val is "none" or "nil") return 0;
        return (bottom.Space ?? 0) * 20 + Paint.BorderWidth(bottom);
    }

    /// <summary>O bloco seguinte continua o grupo de bordas deste parágrafo?</summary>
    private bool GroupsWithNext(PreparedPara p, Block? next, ParaEnv? env = null)
    {
        if (p.Ppr.PBdr is null || next is not ParagraphBlock nb) return false;
        return BdrKey(Para.ResolvePPr(_ctx, nb.Paragraph, env ?? new ParaEnv()).Ppr) == BdrKey(p.Ppr);
    }

    /// <summary>Identidade do grupo de bordas de parágrafo: bordas + recuos (JSON.stringify([pBdr, ind ?? null])).</summary>
    private static string? BdrKey(PPr ppr)
    {
        if (ppr.PBdr is null) return null;
        var sb = new System.Text.StringBuilder("[");
        sb.Append(ppr.PBdr.ToJson()).Append(',');
        if (ppr.Ind is null) sb.Append("null"); else ppr.Ind.AppendJson(sb);
        return sb.Append(']').ToString();
    }

    /// <summary>Rotação (graus, horário na tela) em torno de (cx, cy) — matriz de XformItem.</summary>
    private static double[] Rotation(double cx, double cy, double deg)
    {
        double r = (deg * Math.PI) / 180, c = Math.Cos(r), s = Math.Sin(r);
        return new[] { c, s, -s, c, cx - cx * c + cy * s, cy - cx * s - cy * c };
    }

    /// <summary>
    /// Número da linha (w:lnNumType) — medido no Word (oráculo lnnum): só linhas
    /// do corpo (tabela e parágrafo com suppressLineNumbers não contam), vazio
    /// conta; o 1º número é start+1; alinhado à direita em (coluna − distância,
    /// auto = 360tw), mesma baseline, estilo Normal + "Line Number".
    /// </summary>
    private void PaintLineNumber(double colX, double baseline)
    {
        var ln = _cur.Geom.LnNum!.Value;
        bool restart = ln.Restart == "continuous" ? _lnSect < 0
            : ln.Restart == "newSection" ? _lnSect != _cur.Geom.Index
                : !ReferenceEquals(_lnPage, _cur);
        if (restart) _lnCount = ln.Start;
        _lnPage = _cur;
        _lnSect = _cur.Geom.Index;
        _lnCount++;
        if (_lnCount % ln.CountBy != 0) return;
        var sid = _ctx.Fmt.Styles.Styles.Values.FirstOrDefault(d => d.Type == "character" && d.Name is { } nm && Js.ToLower(nm) == "line number")?.StyleId;
        var rpr = Js.Truthy(sid) ? new RPr { RStyle = sid } : new RPr();
        var para = new Paragraph
        {
            Runs = { new Run { Text = Js.Str(_lnCount), Props = DocumentReader.RunPropsFromRPr(rpr), Rpr = rpr } },
            Props = new ParaProps(),
            Ppr = new PPr(),
        };
        var np = Para.PrepareParagraph(_ctx, para, new ParaEnv { Numbering = false });
        var line = new LineBreaker(_ctx, np).Next(new LineFrame(0, 20000));
        double x = colX - ln.Distance - line.Width;
        Paint.PaintLine(_ctx, _cur.Body, line, x, baseline - line.Baseline);
    }

    /// <summary>Sombreamento/bordas do parágrafo — inseridos em `at` (antes do texto já pintado).</summary>
    private void PaintBox(List<PageItem> outp, PreparedPara p, double x, double width, double top, double bottom, PrevPara? prev, int at, bool groupedNext = false)
    {
        var shd = p.Ppr.Shd;
        bool hasFill = shd is not null && ((Js.Truthy(shd.Fill) && shd.Fill != "auto") || Js.Truthy(shd.ThemeFill));
        if (p.Ppr.PBdr is null && !hasFill) return;
        bool grouped = prev?.PBdrKey is not null && prev.PBdrKey == BdrKey(p.Ppr);
        double left = x + p.IndLeft + Math.Min(0, p.FirstLine);
        double right = x + width - p.IndRight;
        var box = new List<PageItem>();
        Paint.PaintParaBox(_ctx, box, p, p.Ppr.PBdr, left, right, top, bottom, !grouped, !groupedNext, grouped);
        outp.InsertRange(at, box);
    }

    // ───────────────────────── parágrafo no corpo (paginado) ─────────────────────────

    /// <summary>Passo da grade de linhas para um parágrafo do corpo (snapToGrid=0 desliga).</summary>
    private double? GridFor(PreparedPara p)
    {
        double? pitch = _cur?.Geom.LinePitch;
        return pitch is { } pt && pt != 0 && !double.IsNaN(pt) && p.Ppr.SnapToGrid != false ? pitch : null;
    }

    private sealed class Frag
    {
        public Line Line = null!;
        public double Y;
        public double FrameX;
    }

    private sealed class AnchorAt
    {
        public PageState Ps = null!;
        public double Top;
        public double X;
        public double W;
    }

    /// <summary>runs de parágrafos de marca oculta que se juntam ao parágrafo seguinte</summary>
    private List<Run>? _pendingJoin;

    private void PlaceParagraph(Paragraph para0, string reference, int blockIdx, SectGeom g)
    {
        var para = _pendingJoin is not null ? JoinRuns(_pendingJoin, para0) : para0;
        _pendingJoin = null;
        var p = Para.PrepareParagraph(_ctx, para, new ParaEnv { Field = FieldValue(_cur) });
        // texto oculto (oráculo hidden): parágrafo de marca oculta sem conteúdo visível
        // não ocupa nada (nem linha nem espaçamento); com conteúdo visível, junta-se ao
        // seguinte, que dá as propriedades. O último da seção (quebra) fica como está.
        if (p.MarkStyle.Hidden && blockIdx < g.Blocks.End)
        {
            if (p.Glyphs.Count == 0) return;
            if (blockIdx + 1 < _full.Blocks.Count && _full.Blocks[blockIdx + 1] is ParagraphBlock) { _pendingJoin = para.Runs; return; }
        }
        // quebra de página antes
        if (p.PageBreakBefore && !_atTop) NewPage(_cur.Geom);
        // keepNext / keepLines: decide antes de colocar a 1ª linha
        var frameBase = ColFrame();
        double Avail() => _cur.BodyBottom - _y;
        double before = p.BeforeAuto ? (_firstInDoc ? 0 : 280) : p.SpaceBefore;
        double prevAfter = _prev is not null ? _prev.After : 0;
        if (_prev is not null && _prev.StyleId == p.StyleId)
        {
            if (_prev.Contextual) prevAfter = 0;
            if (p.Contextual) before = 0;
        }
        // topo de página (exceto o 1º parágrafo do documento): espaço antes suprimido
        double gap = Collapse(prevAfter, before);
        if (_atTop && !_firstInDoc) gap = 0;
        if (p.KeepLines || p.KeepNext)
        {
            double need = gap + ParagraphHeight(p, frameBase.W) + (p.KeepNext ? NextBlockLead(blockIdx, g, frameBase.W) : 0);
            double fullH = _cur.BodyBottom - _colTop;
            if (need > Avail() && need <= fullH && !_atTop)
            {
                BreakColumn();
                gap = 0;
            }
        }
        if (!_atTop || _firstInDoc) _y += gap;
        _firstInDoc = false;

        var br = new LineBreaker(_ctx, p, GridFor(p));
        bool groupedNext = blockIdx + 1 <= g.Blocks.End && GroupsWithNext(p, blockIdx + 1 < _full.Blocks.Count ? _full.Blocks[blockIdx + 1] : null);
        bool widow = p.WidowControl || p.Ppr.WidowControl is null;
        // linhas colocadas na página corrente (para mover em viúvas/órfãs)
        var frag = new List<Frag>();
        double fragTop = _y;
        // o fragmento corrente contém a 1ª linha do parágrafo
        bool fragHasFirst = true;
        void FlushFrag(bool isLast)
        {
            if (frag.Count == 0) return;
            double frameX = frag[0].FrameX;
            double boxTop = fragTop;
            int boxAt = _cur.Body.Count;
            foreach (var f in frag)
            {
                if (_cur.Geom.LnNum is not null && p.Ppr.SuppressLineNumbers != true) PaintLineNumber(f.FrameX, f.Y + f.Line.Baseline);
                Paint.PaintLine(_ctx, _cur.Body, f.Line, f.FrameX, f.Y);
                _cur.Page.Lines.Add(LineRecord(reference, p, f.Line, f.FrameX, f.Y));
            }
            var last = frag[^1];
            double bottom = last.Y + last.Line.Height;
            if (isLast) bottom += BorderBottomExtent(p, groupedNext);
            PaintBox(_cur.Body, p, frameX, ColFrame().W, boxTop, bottom, _prev, boxAt, isLast && groupedNext);
            frag = new List<Frag>();
        }
        _y += BorderTopExtent(p, _prev);
        bool first = true;
        // onde ficou a 1ª linha: os objetos ancorados no parágrafo vão para ESSA
        // página (não a da última linha — parágrafo com quebra de página no fim)
        var anchorAt = new AnchorAt { Ps = _cur, Top = _y, X = ColFrame().X, W = ColFrame().W };
        var early = PlaceFloatsEarly(p, _cur, ColFrame().X, ColFrame().W, _y);
        // objeto com quebra, posicionado em relação ao parágrafo, passaria da margem
        // inferior: o Word o SOBE até a margem se assim ele não cruza as linhas do
        // próprio parágrafo; senão o parágrafo desce com ele para a próxima
        // página/coluna (oráculo selffloat)
        var over = early.Where(e => FollowsText(FloatAnchor(e.Obj.Run)) && e.Obj.Y + e.Obj.H > _cur.BodyBottom + 0.5).ToList();
        if (!_atTop && over.Count > 0)
        {
            double paraBottom = _y + ParagraphHeight(p, frameBase.W);
            bool lift = over.All(e => _cur.BodyBottom - e.Obj.H >= paraBottom - 0.5);
            foreach (var e in early) UnplaceFloat(e);
            if (lift)
            {
                early = PlaceFloatsEarly(p, _cur, ColFrame().X, ColFrame().W, _y, _cur.BodyBottom);
            }
            else
            {
                BreakColumn();
                _y += BorderTopExtent(p, _prev);
                anchorAt = new AnchorAt { Ps = _cur, Top = _y, X = ColFrame().X, W = ColFrame().W };
                early = PlaceFloatsEarly(p, _cur, ColFrame().X, ColFrame().W, _y);
            }
        }
        var earlyAtPs = _cur;
        double earlyAtX = ColFrame().X;
        var earlyRuns = new HashSet<Run>(early.Select(e => e.Obj.Run), ReferenceEqualityComparer.Instance);
        // parágrafo VAZIO que carrega a quebra de seção: não desce para a página
        // seguinte, fica pendurado abaixo da margem (oráculo sectfit)
        bool hangs = blockIdx == g.Blocks.End && g.Index < _full.Sections.Count - 1 && p.Glyphs.Count == 0;
        // quadro da linha em _y, contornando os flutuantes da página corrente
        LineFrame FrameHere()
        {
            var fr = ColFrame();
            double lineH = MarkLineH(p);
            var frame = WrapFrame(new LineFrame(p.IndLeft, fr.W - p.IndRight), fr.X, _y, lineH);
            // objeto sem espaço ao lado (ou quebra "superior e inferior"): desce para baixo dele
            for (int k = 0; k < 8 && frame.SkipTo is { } st && st > _y; k++)
            {
                _y = frame.SkipTo!.Value;
                frame = WrapFrame(new LineFrame(p.IndLeft, fr.W - p.IndRight), fr.X, _y, lineH);
            }
            return frame;
        }
        do
        {
            var frame = FrameHere();
            var mark = br.Mark();
            var line = br.Next(frame);
            var noteNeed = NoteNeed(p, line);
            bool pageChanged = false;
            // a entrelinha extra (múltipla > 1, posta abaixo do texto) pode passar da
            // margem inferior — medido no oráculo pagefit
            // linha só com a quebra de página e mais conteúdo depois dela no parágrafo: não
            // ocupa altura no teste — a quebra fica nesta página (oráculo pbfit)
            bool breakOnly = line.BreakAfter == "page" && !line.Last && line.Placed.All(pg => pg.G.Kind == GlyphKind.Pb);
            double fitH = breakOnly ? 0 : p.LineRule is "exact" or "atLeast" ? line.Height : Math.Min(line.Height, line.Baseline + line.Desc);
            if (_y + fitH > _cur.BodyBottom - noteNeed.Extra + 0.5 && !_atTop && !hangs)
            {
                // não cabe: viúvas/órfãs
                int placedHere = frag.Count;
                var moved = new List<Line>();
                if (widow && placedHere == 1 && fragHasFirst && !first)
                {
                    // órfã: a 1ª linha não fica sozinha no fim da página
                    moved.Add(Pop(frag).Line);
                }
                else if (widow && line.Last && placedHere >= 2)
                {
                    // viúva: a última linha não vai sozinha para a próxima página
                    moved.Add(Pop(frag).Line);
                    // …e se isso deixar a 1ª linha sozinha (parágrafo de 3 linhas), desce tudo
                    if (frag.Count == 1 && fragHasFirst) moved.Insert(0, Pop(frag).Line);
                }
                // tudo desceu: a 1ª linha continua no fragmento (agora na página nova)
                bool allMoved = fragHasFirst && frag.Count == 0;
                FlushFrag(false);
                fragHasFirst = allMoved;
                BreakColumn();
                fragTop = _y;
                if (allMoved) anchorAt = new AnchorAt { Ps = _cur, Top = _y, X = ColFrame().X, W = ColFrame().W };
                foreach (var m in moved)
                {
                    double fx = ColFrame().X;
                    frag.Add(new Frag { Line = m, Y = _y, FrameX = fx });
                    _y += m.Height;
                }
                pageChanged = true;
            }
            if (first)
            {
                // a 1ª linha foi para outra página/coluna: os flutuantes vão junto
                if (early.Count > 0 && (!ReferenceEquals(earlyAtPs, _cur) || earlyAtX != ColFrame().X))
                {
                    foreach (var e in early) UnplaceFloat(e);
                    early = PlaceFloatsEarly(p, _cur, ColFrame().X, ColFrame().W, _y);
                    earlyAtPs = _cur;
                    earlyAtX = ColFrame().X;
                }
                anchorAt = new AnchorAt { Ps = _cur, Top = _y, X = ColFrame().X, W = ColFrame().W };
            }
            if (pageChanged)
            {
                // a linha foi quebrada no quadro da página anterior (contorno de objetos): refaz no da nova
                var nf = FrameHere();
                if (nf.Left != frame.Left || nf.Right != frame.Right)
                {
                    br.Reset(mark);
                    line = br.Next(nf);
                    noteNeed = NoteNeed(p, line);
                }
            }
            if (noteNeed.Ids.Count > 0) ReserveNotes(noteNeed.Ids);
            frag.Add(new Frag { Line = line, Y = _y, FrameX = ColFrame().X });
            _y += line.Height;
            _atTop = false;
            first = false;
            if (line.BreakAfter == "page")
            {
                FlushFrag(false);
                fragHasFirst = false;
                NewPage(_cur.Geom);
                fragTop = _y;
                _atTop = true;
            }
            else if (line.BreakAfter == "column")
            {
                FlushFrag(false);
                fragHasFirst = false;
                BreakColumn();
                fragTop = _y;
            }
        } while (!br.Done());
        FlushFrag(true);
        _y += BorderBottomExtent(p, groupedNext);
        // objetos flutuantes ancorados neste parágrafo
        foreach (var r in earlyRuns) _prePlaced.Add(r);
        PlaceFloats(p, anchorAt.Ps, anchorAt.X, anchorAt.W, anchorAt.Top, anchorAt.Ps.Body, 0);
        foreach (var r in earlyRuns) _prePlaced.Remove(r);
        // parágrafo só com quebra de página: o próximo começa no topo
        var lastGlyph = p.Glyphs.Count > 0 ? p.Glyphs[^1] : null;
        if (lastGlyph?.Kind == GlyphKind.Pb) _atTop = true;
        _prev = new PrevPara
        {
            After = p.AfterAuto ? 280 : p.SpaceAfter,
            AfterAuto = p.AfterAuto,
            StyleId = p.StyleId,
            Contextual = p.Contextual,
            PBdr = p.Ppr.PBdr,
            PBdrKey = BdrKey(p.Ppr),
        };
    }

    private static Frag Pop(List<Frag> l)
    {
        var f = l[^1];
        l.RemoveAt(l.Count - 1);
        return f;
    }

    // ───────────────────────── notas de rodapé ─────────────────────────

    private readonly Dictionary<double, CellContent> _noteCache = new();

    /// <summary>Conteúdo diagramado de uma nota (largura do corpo da página).</summary>
    private CellContent NoteContent(double id)
    {
        if (!_noteCache.TryGetValue(id, out var c))
        {
            var g = _cur.Geom;
            int iid = (int)id;
            List<Block> blocks;
            if (_full.FootnoteBlocks is not null && _full.FootnoteBlocks.TryGetValue(iid, out var fb)) blocks = fb;
            else blocks = (_full.Footnotes.TryGetValue(iid, out var ps) ? ps : new List<Paragraph>())
                .Select(p => (Block)new ParagraphBlock { Paragraph = p }).ToList();
            double num = _ctx.FootnoteNumber(id);
            var saved = _ctx.Numbering;
            _ctx.Numbering = new NumberingState(_ctx.Fmt.Numbering, _ctx.Fmt.Styles.Styles, _ctx.Opts.Lang);
            try
            {
                c = LayoutStatic(blocks, g.MarL, g.PageW - g.MarL - g.MarR, new ParaEnv
                {
                    Field = (name, _) => name == "FOOTNOTEREF_MARK" ? Js.Str(num) : FieldValue(_cur)(name, null),
                }, $"fn{Js.Str(id)}");
            }
            finally { _ctx.Numbering = saved; }
            _noteCache[id] = c;
        }
        return c;
    }

    /// <summary>Altura do separador (1 linha do estilo Normal).</summary>
    private double SeparatorHeight()
    {
        var p = Para.PrepareParagraph(_ctx, new Paragraph { Runs = new List<Run>(), Props = new ParaProps() }, new ParaEnv());
        return new LineBreaker(_ctx, p).Next(new LineFrame(0, 10000)).Height;
    }

    /// <summary>Notas NOVAS referenciadas na linha e o espaço extra que exigem.</summary>
    private (List<double> Ids, double Extra) NoteNeed(PreparedPara p, Line line)
    {
        var ids = new List<double>();
        for (int k = line.Start; k < line.End; k++)
        {
            double? id = k < p.Glyphs.Count ? p.Glyphs[k].NoteId : null;
            if (id is { } v && !ids.Contains(v) && !_cur.Notes.Any(n => n.Id.Equals(v))) ids.Add(v);
        }
        if (ids.Count == 0) return (ids, 0);
        double extra = _cur.Notes.Count > 0 ? 0 : SeparatorHeight();
        foreach (var id in ids) extra += NoteContent(id).Height;
        return (ids, extra);
    }

    private void ReserveNotes(List<double> ids)
    {
        var ps = _cur;
        foreach (var id in ids)
        {
            if (ps.Notes.Any(n => n.Id.Equals(id))) continue;
            if (ps.Notes.Count == 0) ps.NoteArea += SeparatorHeight();
            var content = NoteContent(id);
            ps.Notes.Add((id, content));
            ps.NoteArea += content.Height;
        }
        ps.BodyBottom = ps.BodyBottomBase - ps.NoteArea;
    }

    /// <summary>Separador + notas, alinhados ao fundo do corpo (medido no Word).</summary>
    private void PaintNotes(PageState ps)
    {
        if (ps.Notes.Count == 0) return;
        var g = ps.Geom;
        double y = ps.BodyBottomBase - ps.NoteArea;
        double sepH = SeparatorHeight();
        // traço de 2" (144 pt) na altura do meio-x da linha do separador
        double ly = y + sepH * 0.62;
        ps.Body.Add(new LineItem { X1 = g.MarL, Y1 = ly, X2 = g.MarL + 2880, Y2 = ly, Color = "000000", WidthPt = 0.5 });
        y += sepH;
        foreach (var n in ps.Notes)
        {
            foreach (var it in n.Content.Items) ps.Body.Add(TableEngine.ShiftItem(it, y));
            y += n.Content.Height;
        }
    }

    /// <summary>Altura total de um parágrafo (sem quebra de página), p/ keepLines/keepNext.</summary>
    private double ParagraphHeight(PreparedPara p, double width)
    {
        var br = new LineBreaker(_ctx, p, GridFor(p));
        double h = BorderTopExtent(p, null) + BorderBottomExtent(p);
        do h += br.Next(new LineFrame(p.IndLeft, width - p.IndRight)).Height; while (!br.Done());
        return h;
    }

    /// <summary>Altura da 1ª linha (e cadeia keepNext) do bloco seguinte.</summary>
    private double NextBlockLead(int blockIdx, SectGeom g, double width)
    {
        var nb = blockIdx + 1 < _full.Blocks.Count ? _full.Blocks[blockIdx + 1] : null;
        if (nb is null || blockIdx + 1 > g.Blocks.End) return 0;
        // prévia pura: não avança listas, SEQ nem números de nota
        var saved = _ctx.SaveFlow();
        try
        {
            if (nb is TableBlock tbl)
            {
                // título antes de tabela: fica com a 1ª linha (e a seguinte, se a 1ª
                // tiver keepNext) — oráculo keeptbl. Prévia sem página: sem floats.
                var t = TableEngine.LayoutTable(_ctx, tbl, 0, width, (cell, cx, cw, cenv, cref) => LayoutCell(cell, cx, cw, cenv, cref), "preview");
                var r0 = t.Rows.Count > 0 ? t.Rows[0] : null;
                if (r0 is null) return 0;
                static double StartNeed(RowLayout r, double cap) =>
                    r.CantSplit || (r.Natural ?? r.Height) < r.Height ? r.Height : Math.Min(r.Height, cap);
                var r1 = t.Rows.Count > 1 ? t.Rows[1] : null;
                return r0.KeepNext && r1 is not null ? r0.Height + StartNeed(r1, 400) : StartNeed(r0, r0.Natural ?? r0.Height);
            }
            var q = Para.PrepareParagraph(_ctx, ((ParagraphBlock)nb).Paragraph, new ParaEnv());
            double gap = Collapse(0, q.SpaceBefore);
            if (q.KeepNext) return gap + ParagraphHeight(q, width) + NextBlockLead(blockIdx + 1, g, width);
            var br = new LineBreaker(_ctx, q, GridFor(q));
            return gap + br.Next(new LineFrame(q.IndLeft, width - q.IndRight)).Height;
        }
        finally
        {
            _ctx.RestoreFlow(saved);
        }
    }

    // ───────────────────────── tabelas no corpo ─────────────────────────

    private void PlaceTable(TableBlock table, string reference, int blockIdx = -1)
    {
        // tabela só com linhas ocultas: some, sem mexer no espaçamento (oráculo hidden)
        if (table.Rows.All(r => TableEngine.IsHiddenRow(_ctx, r))) return;
        var fr = ColFrame();
        var fp = table.TblPr?.TblpPr;
        if (fp is not null && fp.TblpYSpec != "inline")
        {
            // tabela flutuante (w:tblpPr): fora do fluxo, o texto seguinte a contorna
            var ft = TableEngine.LayoutTable(_ctx, table, 0, fr.W, (cell, cx, cw, cenv, cref) => LayoutCell(cell, cx, cw, cenv, cref, _cur), reference);
            // pintada depois do texto do corpo (como o Word: ordem do conteúdo da página)
            var fitems = new List<PageItem>();
            double flowY = _y;
            if (fp.VertAnchor != "page" && fp.VertAnchor != "margin")
            {
                // âncora no texto: o parágrafo seguinte desce para baixo de flutuantes que
                // não o deixam ao lado (tabelas flutuantes de largura total) e a tabela vai
                // junto; se ela então não couber, os dois passam para a próxima página (medido no Word)
                var f = WrapFrame(new LineFrame(0, fr.W), fr.X, flowY);
                for (int k = 0; k < 8 && f.SkipTo is { } st && st > flowY; k++)
                {
                    flowY = f.SkipTo!.Value;
                    f = WrapFrame(new LineFrame(0, fr.W), fr.X, flowY);
                }
                double top = Js.Truthy(fp.TblpYSpec) ? flowY : flowY + (fp.TblpY ?? 0);
                // nem a 1ª linha de texto cabe: a tabela (e a âncora) vão para a próxima página; senão
                // as linhas que não cabem continuam no topo da próxima (como o Word)
                var r0 = ft.Rows.Count > 0 ? ft.Rows[0] : null;
                if (!_atTop && r0 is not null && top + r0.Height > _cur.BodyBottom + 0.5)
                {
                    double avail = _cur.BodyBottom - top;
                    bool onlyMin = (r0.Natural ?? r0.Height) <= avail + 0.5;
                    var parts = onlyMin || r0.CantSplit ? null : r0.Split?.Invoke(avail);
                    if (!(parts is { } pp && pp.First.Height > 0))
                    {
                        BreakColumn();
                        flowY = _y;
                    }
                }
            }
            PlaceFloatingTable(ft, fp, _cur, flowY, fr.X, fr.W, fitems, 0, true, true);
            _cur.Front.Add(new ZObj { Z = -1, Seq = _zSeq++, Items = fitems });
            return;
        }
        if (_prev is not null)
        {
            _y += _atTop || DropsAfterBeforeTable(_prev, table) ? 0 : _prev.After;
        }
        AssignCellNeighbors(table, _prev is not null ? new CtxNeighbor { StyleId = _prev.StyleId } : null);
        _prev = null;
        _firstInDoc = false;
        var t = TableEngine.LayoutTable(_ctx, table, fr.X, fr.W, (cell, cx, cw, cenv, cref) => LayoutCell(cell, cx, cw, cenv, cref, _cur), reference);
        if (blockIdx >= 0) PinFloatsOverTable(t, blockIdx);
        _lastRowEmit = null;
        var headerRows = new List<RowLayout>();
        foreach (var r in t.Rows) { if (r.Header) headerRows.Add(r); else break; }
        for (int ri = 0; ri < t.Rows.Count; ri++)
        {
            var row = t.Rows[ri];
            // manter com a próxima: se a próxima linha não puder começar nesta página
            // logo depois desta, esta desce junto (oráculo keeptbl)
            if (row.KeepNext && !_atTop && ri + 1 < t.Rows.Count)
            {
                double availK = _cur.BodyBottom - _y;
                if (row.Height <= availK + 0.5 && !RowCanStart(t.Rows[ri + 1], availK - row.Height))
                {
                    if (_lastRowEmit is { } lk && lk.Row.BreakBorderItems is not null)
                        foreach (var it in lk.Row.BreakBorderItems) _cur.Body.Add(TableEngine.ShiftItem(it, lk.Y));
                    BreakColumn();
                    if (ri >= headerRows.Count) foreach (var hr in headerRows) EmitRow(hr);
                }
            }
            for (int guard = 0; guard < 500; guard++)
            {
                double avail = _cur.BodyBottom - _y;
                if (row.Height <= avail + 0.5) break;
                // não cabe: o Word divide a linha (salvo cantSplit) no fim da última linha de
                // texto que cabe — mas se o CONTEÚDO cabe e só a altura mínima não, a linha desce inteira
                bool onlyMin = (row.Natural ?? row.Height) <= avail + 0.5;
                var parts = onlyMin ? null : row.Split?.Invoke(avail);
                if (parts is { } pp && pp.First.Height > 0)
                {
                    EmitRow(pp.First);
                    row = pp.Remainder;
                }
                else if (_atTop) break; // nem uma linha cabe numa página vazia: coloca assim mesmo
                // a última linha desta página fecha com a borda da divisa
                if (_lastRowEmit is { } lre && lre.Row.BreakBorderItems is not null)
                    foreach (var it in lre.Row.BreakBorderItems) _cur.Body.Add(TableEngine.ShiftItem(it, lre.Y));
                BreakColumn();
                // repete as linhas de cabeçalho da tabela
                if (ri >= headerRows.Count) foreach (var h in headerRows) EmitRow(h);
            }
            EmitRow(row);
        }
        // o parágrafo seguinte vê a marca de fim de linha como anterior (contextual)
        _prev = RowEndPrev();
    }

    private static readonly Regex HfRefRe = new(@"^(hdr|ftr):[A-Za-z0-9_]+\z", RegexOptions.CultureInvariant);

    /// <summary>Cópia descartável do estado da página (medições que posicionam flutuantes).</summary>
    private static PageState ScratchPage(PageState ps) => new()
    {
        Page = new LayoutPage
        {
            WidthTw = ps.Page.WidthTw, HeightTw = ps.Page.HeightTw, Section = ps.Page.Section, Number = ps.Page.Number,
            Items = new List<PageItem>(), Lines = new List<LaidOutLine>(), HfItems = ps.Page.HfItems, Objects = new List<PlacedObject>(),
        },
        Geom = ps.Geom, BodyTop = ps.BodyTop, BodyBottom = ps.BodyBottom,
        Behind = new List<ZObj>(), Hf = new List<PageItem>(), Body = new List<PageItem>(), Front = new List<ZObj>(),
        HfBehind = new List<ZObj>(), HfFront = new List<ZObj>(), Floats = new List<FloatBox>(ps.Floats),
        SectPage = ps.SectPage, Notes = new List<(double Id, CellContent Content)>(), NoteArea = ps.NoteArea, BodyBottomBase = ps.BodyBottomBase,
    };

    /// <summary>Altura natural de uma linha com a fonte da marca de parágrafo (twips) —
    /// estimativa para o contorno de objetos antes de quebrar a linha.</summary>
    private static double MarkLineH(PreparedPara p)
    {
        var mm = Fonts.FaceMetrics(p.MarkFace.Font);
        return Js.Round((mm.Ascent + mm.Descent) * p.MarkStyle.SizePt * 20);
    }

    /// <summary>Desloca uma linha diagramada (y e baseline).</summary>
    private static LaidOutLine ShiftLine(LaidOutLine l, double dy)
    {
        var n = l.ShallowClone();
        n.Y = l.Y + dy;
        n.Baseline = l.Baseline + dy;
        return n;
    }

    /// <summary>Âncoras verticais que não dependem do fluxo do texto.</summary>
    private static readonly HashSet<string> AbsoluteV = new(StringComparer.Ordinal) { "page", "margin", "topMargin", "bottomMargin", "insideMargin", "outsideMargin" };

    /// <summary>Topo mínimo de um flutuante com quebra relativo ao texto: corpo (modo 15) ou página (≤ 14).</summary>
    private double FloatMinY(PageState ps) => _ctx.Fmt.Settings.CompatibilityMode >= 15 ? ps.BodyTop : 0;

    /// <summary>flutuantes com y já decidido (presos antes do parágrafo âncora)</summary>
    private readonly Dictionary<Run, (PageState Ps, double Y)> _pinnedFloats = new(ReferenceEqualityComparer.Instance);

    /// <summary>
    /// Flutuante com quebra do parágrafo SEGUINTE à tabela, relativo a ele e com
    /// deslocamento negativo que cai sobre a tabela (oráculo toptbl): o Word o posiciona
    /// pela posição INICIAL do parágrafo (logo após a tabela), preso no topo da margem;
    /// a tabela desce para baixo dele e o objeto fica onde foi posto, mesmo que o
    /// parágrafo desça com a tabela.
    /// </summary>
    private void PinFloatsOverTable(TableLayout t, int blockIdx)
    {
        if (blockIdx + 1 >= _full.Blocks.Count || _full.Blocks[blockIdx + 1] is not ParagraphBlock nb) return;
        var runs = nb.Paragraph.Runs.Where(run =>
        {
            var anc = FloatAnchor(run);
            return IsFloating(run) && anc is not null && Wrapping.Contains(anc.Wrap ?? "") && anc.SimplePos is null && (anc.PosV.RelativeFrom ?? "paragraph") == "paragraph"
                && anc.PosV.Align is null && anc.PosV.Pct is null && (anc.PosV.Offset ?? 0) < 0;
        }).ToList();
        if (runs.Count == 0) return;
        double H = t.Rows.Aggregate(0.0, (a, r) => a + r.Height);
        double top = _y;
        // 1ª posição do parágrafo: logo após a tabela (+ o espaço antes dele; o anterior é a marca de fim de linha)
        var q = _ctx.Pure(() => Para.PrepareParagraph(_ctx, nb.Paragraph, new ParaEnv()));
        double before = q.BeforeAuto ? 280 : q.SpaceBefore;
        if (q.Contextual && q.StyleId == RowEndNeighbor().StyleId) before = 0;
        double anchorTop0 = top + H + Collapse(0, before);
        var fr = ColFrame();
        var g = _cur.Geom;
        double newTop = top;
        foreach (var run in runs)
        {
            var anc = FloatAnchor(run)!;
            double w = run.Image?.WidthTwips ?? run.Shape?.WidthTwips ?? run.Group?.WidthTwips ?? run.Textbox?.WidthTwips ?? 0;
            double h = run.Image?.HeightTwips ?? run.Shape?.HeightTwips ?? run.Group?.HeightTwips ?? run.Textbox?.HeightTwips ?? 0;
            double y = Math.Max(FloatMinY(_cur), anchorTop0 + (anc.PosV.Offset ?? 0));
            var hRef = HorizRef(anc.PosH.RelativeFrom ?? "column", g, fr.X, fr.W);
            double x = AlignPos(anc.PosH.Align, anc.PosH.Offset, hRef.X, hRef.W, w, anc.PosH.Pct, g.PageW);
            bool overV = y - (anc.DistT ?? 0) < top + H && y + h + (anc.DistB ?? 0) > top;
            bool overH = x - (anc.DistL ?? 0) < t.X + t.Width && x + w + (anc.DistR ?? 0) > t.X;
            if (!overV || !overH) continue;
            _pinnedFloats[run] = (_cur, y);
            newTop = Math.Max(newTop, y + h + (anc.DistB ?? 0));
        }
        if (newTop > top) _y = newTop;
    }

    /// <summary>
    /// Tabela flutuante (oráculo ftable): âncoras página/margem/texto; tblpX/Y
    /// ou tblpX/YSpec (left/center/right, top/center/bottom). No modo 15 a borda
    /// externa fica na posição; nos antigos, o TEXTO da 1ª célula (como tblInd).
    /// `t` foi diagramada com frameX = 0; os itens são deslocados para a posição.
    /// </summary>
    private void PlaceFloatingTable(TableLayout t, TblpPr fp, PageState ps, double flowY, double colX, double colW, List<PageItem> outp, double yOrigin, bool wrap, bool split = false)
    {
        var g = ps.Geom;
        bool legacy = _ctx.Fmt.Settings.CompatibilityMode < 15;
        double H = t.Rows.Aggregate(0.0, (a, r) => a + r.Height);
        // caixa de referência (o que se alinha): modo 15 = borda externa; antigos = texto
        double refW = legacy ? Math.Max(0, t.Width - 216) : t.Width;
        var (aL, aR) = fp.HorzAnchor == "page" ? (0.0, g.PageW) : fp.HorzAnchor == "margin" ? (g.MarL, g.PageW - g.MarR) : (colX, colX + colW);
        string? xs = fp.TblpXSpec;
        double refX = xs == "center" ? aL + (aR - aL - refW) / 2 : xs is "right" or "outside" ? aR - refW : aL + (Js.Truthy(xs) ? 0 : fp.TblpX ?? 0);
        var (aT, aB) = fp.VertAnchor == "page" ? (0.0, g.PageH) : fp.VertAnchor == "margin" ? (g.MarT, g.PageH - g.MarB) : (flowY, flowY);
        string? ys = fp.TblpYSpec;
        double top = ys == "center" ? aT + (aB - aT - H) / 2 : ys == "bottom" ? aB - H : aT + (Js.Truthy(ys) ? 0 : fp.TblpY ?? 0);
        EmitFloatRows(t, t.Rows, fp, ps, refX, top, outp, yOrigin, wrap, split);
    }

    /// <summary>
    /// Linhas de uma tabela flutuante a partir de `top`. Com `split`, as que não
    /// cabem na página seguem para o topo da próxima (o texto as contorna lá).
    /// </summary>
    private void EmitFloatRows(TableLayout t, List<RowLayout> rowsIn, TblpPr fp, PageState ps, double refX, double top, List<PageItem> outp, double yOrigin, bool wrap, bool split)
    {
        bool legacy = _ctx.Fmt.Settings.CompatibilityMode < 15;
        double y = top;
        int n = 0;
        var rows = rowsIn.ToList();
        for (int i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            if (split && y + row.Height > ps.BodyBottom + 0.5)
            {
                // não cabe: divide a linha (salvo cantSplit / só a altura mínima) como no fluxo
                double avail = ps.BodyBottom - y;
                bool onlyMin = (row.Natural ?? row.Height) <= avail + 0.5;
                var parts = onlyMin || row.CantSplit ? null : row.Split?.Invoke(avail);
                if (parts is { } pp && pp.First.Height > 0)
                {
                    rows.RemoveAt(i);
                    rows.InsertRange(i, new[] { pp.First, pp.Remainder });
                    row = pp.First;
                }
                else if (n > 0) break;
            }
            foreach (var it in row.Items) outp.Add(TableEngine.ShiftItem(it, y - yOrigin, refX));
            foreach (var it in row.BorderItems) outp.Add(TableEngine.ShiftItem(it, y - yOrigin, refX));
            foreach (var l in row.Lines)
            {
                var nl = l.ShallowClone();
                nl.X = l.X + refX; nl.Y = l.Y + y; nl.Baseline = l.Baseline + y;
                if (l.Chars is not null) nl.Chars = l.Chars.Select(c => c with { X = c.X + refX }).ToList();
                ps.Page.Lines.Add(nl);
            }
            y += row.Height;
            n++;
        }
        if (wrap)
        {
            ps.Floats.Add(new FloatBox
            {
                // caixa = bordas externas (modo antigo: a grade fica na margem da célula antes do texto)
                X = refX + (legacy ? -108 - (t.BorderLeft ?? 0) / 2 : 0), Y = top, W = t.Width + (legacy ? (t.BorderLeft ?? 0) : 0), H = y - top, Wrap = "square",
                DistL = fp.LeftFromText ?? 0, DistR = fp.RightFromText ?? 0, DistT = fp.TopFromText ?? 0, DistB = fp.BottomFromText ?? 0,
            });
        }
        if (n < rows.Count) _floatCarry.Add(new FloatCarryItem(t, rows.Skip(n).ToList(), fp, refX));
    }

    /// <summary>Continuação de tabelas flutuantes divididas: topo do corpo da página nova.</summary>
    private void PlaceFloatCarry()
    {
        var carry = _floatCarry;
        _floatCarry = new List<FloatCarryItem>();
        foreach (var c in carry)
        {
            var items = new List<PageItem>();
            EmitFloatRows(c.T, c.Rows, c.Fp, _cur, c.RefX, _cur.BodyTop, items, 0, true, true);
            _cur.Front.Add(new ZObj { Z = -1, Seq = _zSeq++, Items = items });
        }
    }

    /// <summary>A linha pode começar no espaço dado (inteira, ou dividida se puder)?</summary>
    private static bool RowCanStart(RowLayout row, double avail)
    {
        if (row.Height <= avail + 0.5) return true;
        if (row.CantSplit || (row.Natural ?? row.Height) <= avail + 0.5) return false;
        var parts = row.Split?.Invoke(avail);
        return parts is { } pp && pp.First.Height > 0;
    }

    private void EmitRow(RowLayout row)
    {
        _lastRowEmit = (row, _y);
        foreach (var it in row.Items) _cur.Body.Add(TableEngine.ShiftItem(it, _y));
        foreach (var it in row.BorderItems) _cur.Body.Add(TableEngine.ShiftItem(it, _y));
        foreach (var l in row.Lines)
        {
            var nl = l.ShallowClone();
            nl.Y = l.Y + _y;
            nl.Baseline = l.Baseline + _y;
            _cur.Page.Lines.Add(nl);
        }
        _y += row.Height;
        _atTop = false;
    }

    // ───────────────────────── objetos flutuantes ─────────────────────────

    /// <summary>Quadro de uma linha descontando floats com contorno (wrap) que a cruzam.</summary>
    private LineFrame WrapFrame(LineFrame frame, double frameX, double y, double lineH = 240, PageState? ps = null)
    {
        var floats = (ps ?? _cur).Floats;
        if (floats.Count == 0) return frame;
        double left = frame.Left, right = frame.Right;
        double? skipTo = null;
        // intervalos livres da linha: o quadro menos a faixa de cada flutuante que a cruza
        var free = new List<(double A, double B)> { (left, right) };
        bool hit = false;
        double minBottom = double.PositiveInfinity;
        foreach (var f in floats)
        {
            if (f.Wrap != "square" && f.Wrap != "tight" && f.Wrap != "through" && f.Wrap != "topAndBottom") continue;
            double top = f.Y - f.DistT, bottom = f.Y + f.H + f.DistB;
            // (1 twip de folga: o Word compara em twips — 0,02pt de sobreposição
            // não desvia; 0,15pt desvia)
            if (y + lineH <= top + 1 || y >= bottom - 1) continue;
            double fl = f.X - f.DistL - frameX, frr = f.X + f.W + f.DistR - frameX;
            if (frr <= left || fl >= right) continue;
            if (f.Wrap == "topAndBottom") { skipTo = Math.Max(skipTo ?? 0, bottom); continue; }
            hit = true;
            minBottom = Math.Min(minBottom, bottom);
            var next = new List<(double A, double B)>();
            foreach (var (a, b) in free)
            {
                if (frr <= a || fl >= b) { next.Add((a, b)); continue; }
                if (fl > a) next.Add((a, fl));
                if (frr < b) next.Add((frr, b));
            }
            free = next;
        }
        if (hit)
        {
            // o intervalo mais largo (empate: o da esquerda) — vários flutuantes na mesma
            // linha: a linha vai para o vão livre, não para baixo deles (oráculo hfmix)
            (double A, double B)? best = null;
            foreach (var iv in free) if (best is null || iv.B - iv.A > best.Value.B - best.Value.A) best = iv;
            // sem espaço útil ao lado: a linha desce até o fim do 1º objeto que a bloqueia
            if (best is null || best.Value.B - best.Value.A < 300) skipTo = Math.Max(skipTo ?? 0, minBottom);
            else if (skipTo is null) return new LineFrame(best.Value.A, best.Value.B);
        }
        if (skipTo is not null) { var r = frame; r.SkipTo = skipTo; return r; }
        return new LineFrame(left, right);
    }

    private static bool IsFloating(Run run) =>
        run.Image?.Floating == true || run.Shape?.Floating == true || run.Group?.Floating == true || run.Textbox?.Floating == true;

    private void PlaceFloats(PreparedPara p, PageState ps, double colX, double colW, double paraTop, List<PageItem> flowItems, double yOrigin)
    {
        foreach (var g in p.Glyphs)
        {
            var run = g.Obj;
            if (run is null) continue;
            if (!IsFloating(run) || _prePlaced.Contains(run)) continue;
            if (_onlyTextFloats && !FollowsText(FloatAnchor(run))) continue;
            PlaceFloat(run, ps, colX, colW, paraTop, flowItems, yOrigin);
        }
    }

    private static readonly TextboxInsets DefaultInsets = new() { L = 144, T = 72, R = 144, B = 72 };

    /// <summary>Recibo de um flutuante colocado (para desfazer).</summary>
    private sealed class FloatReceipt
    {
        public PageState Ps = null!;
        public List<ZObj> Target = null!;
        public ZObj ZObj = null!;
        public PlacedObject Obj = null!;
        public FloatBox? Box;
        /// <summary>estado de listas/SEQ/notas antes da colocação (caixa de texto): volta no unplace</summary>
        public FlowState? Flow;
    }

    /// <summary>Quebras de texto que afastam as linhas do objeto.</summary>
    private static readonly HashSet<string> Wrapping = new(StringComparer.Ordinal) { "square", "tight", "through", "topAndBottom" };

    /// <summary>Desfaz um flutuante colocado (parágrafo que mudou de página).</summary>
    private void UnplaceFloat(FloatReceipt r)
    {
        r.Target.Remove(r.ZObj);
        r.Ps.Page.Objects?.Remove(r.Obj);
        if (r.Box is not null) r.Ps.Floats.Remove(r.Box);
        // o conteúdo de caixa de texto já diagramado não conta: será refeito na nova posição
        if (r.Flow is not null) _ctx.RestoreFlow(r.Flow);
    }

    /// <summary>
    /// Flutuantes do parágrafo do corpo posicionados ANTES das linhas, para que o
    /// próprio texto do parágrafo os contorne (como no cabeçalho). Só os
    /// de quebra que afeta o texto; os demais seguem depois das linhas.
    /// </summary>
    private List<FloatReceipt> PlaceFloatsEarly(PreparedPara p, PageState ps, double colX, double colW, double paraTop, double? clampBottom = null)
    {
        var outp = new List<FloatReceipt>();
        FlowState? flow = null;
        foreach (var g in p.Glyphs)
        {
            var run = g.Obj;
            if (run is null) continue;
            var anc = run.Image?.Anchor ?? run.Shape?.Anchor ?? run.Group?.Anchor ?? run.Textbox?.Anchor;
            if (!IsFloating(run) || anc is null || !Wrapping.Contains(anc.Wrap ?? "")) continue;
            // estado antes de TODAS as colocações (desfazer em qualquer ordem volta a ele)
            flow ??= _ctx.SaveFlow();
            var rc = PlaceFloat(run, ps, colX, colW, paraTop, ps.Body, 0, clampBottom is not null && FollowsText(anc) ? clampBottom : null);
            rc.Flow = flow;
            outp.Add(rc);
        }
        return outp;
    }

    /// <summary>Âncora de um objeto flutuante (qualquer tipo).</summary>
    private static DrawingAnchor? FloatAnchor(Run run) => run.Image?.Anchor ?? run.Shape?.Anchor ?? run.Group?.Anchor ?? run.Textbox?.Anchor;

    /// <summary>O objeto acompanha o texto (posição vertical relativa ao parágrafo/linha).</summary>
    private static bool FollowsText(DrawingAnchor? a) => a is not null && a.SimplePos is null && !AbsoluteV.Contains(a.PosV.RelativeFrom ?? "paragraph");

    private FloatReceipt PlaceFloat(Run run, PageState ps, double colX, double colW, double paraTop, List<PageItem> flowItems, double yOrigin, double? clampBottom = null)
    {
        var g = ps.Geom;
        var anchor = run.Image?.Anchor ?? run.Shape?.Anchor ?? run.Group?.Anchor ?? run.Textbox?.Anchor;
        double w = run.Image?.WidthTwips ?? run.Shape?.WidthTwips ?? run.Group?.WidthTwips ?? run.Textbox?.WidthTwips ?? 0;
        double h = run.Image?.HeightTwips ?? run.Shape?.HeightTwips ?? run.Group?.HeightTwips ?? run.Textbox?.HeightTwips ?? 0;
        bool behind = anchor?.BehindDoc == true || run.Image?.BehindDoc == true || run.Textbox?.BehindDoc == true;
        // conteúdo da caixa de texto (altura automática)
        CellContent? tbContent = null;
        if (run.Textbox is not null)
        {
            var tb = run.Textbox;
            var ins = tb.Insets ?? DefaultInsets;
            var blocks = tb.Blocks ?? tb.Paras.Select(p => (Block)new ParagraphBlock { Paragraph = p }).ToList();
            var env = new ParaEnv { Field = FieldValue(ps), DarkBackground = IsDark(tb.Shape?.Fill) };
            double inner = w - ins.L - ins.R;
            if (tb.NoWrap)
            {
                // texto sem quebra: mede a linha mais longa (sem posicionar nada na página);
                // com ajuste automático a caixa toma essa largura — caixa de uma linha só (medido no Word)
                var probe = _ctx.Pure(() => LayoutStatic(blocks, 0, 31680, env, "txbx"));
                // (linha + recuo do lado em que está encostada; centralizada: só a linha)
                double natural = probe.Lines.Aggregate(0.0, (m, l) =>
                {
                    double side = Math.Min(l.X, 31680 - l.X - l.Width);
                    return Math.Max(m, l.Width + (side < 2880 ? side : 0));
                });
                if (tb.AutoFit) { w = natural + ins.L + ins.R; inner = natural; } else inner = Math.Max(inner, natural);
            }
            tbContent = LayoutStatic(blocks, 0, Math.Max(1, inner), env, "txbx", ps);
            // ajuste automático: a altura é a do texto (o cy gravado pode estar desatualizado)
            if (tb.AutoFit) h = tbContent.Height + ins.T + ins.B;
        }
        double x, y;
        if (anchor?.SimplePos is not null) { x = anchor.SimplePos.X; y = anchor.SimplePos.Y; }
        else
        {
            var hRef = HorizRef(anchor?.PosH.RelativeFrom ?? "column", g, colX, colW);
            x = AlignPos(anchor?.PosH.Align, anchor?.PosH.Offset, hRef.X, hRef.W, w, anchor?.PosH.Pct, g.PageW);
            if (_pinnedFloats.TryGetValue(run, out var pin) && ReferenceEquals(pin.Ps, ps)) y = pin.Y;
            else
            {
                var vRef = VertRef(anchor?.PosV.RelativeFrom ?? "paragraph", g, ps, paraTop);
                y = AlignPos(anchor?.PosV.Align, anchor?.PosV.Offset, vRef.Y, vRef.H, h, anchor?.PosV.Pct, g.PageH);
                if (clampBottom is { } cb && y + h > cb) y = cb - h;
                // com quebra e relativo ao texto: não sobe além do topo do corpo; nos modos
                // antigos (≤ 14), só além do topo da PÁGINA (oráculos toptbl/toptbl2)
                if (!_inHf && anchor is not null && Wrapping.Contains(anchor.Wrap) && FollowsText(anchor)) y = Math.Max(y, FloatMinY(ps));
            }
        }
        // itens desenhados em coordenadas absolutas da página; o fluxo do chamador
        // pode deslocar y (yOrigin) — compensamos para o desenho ficar absoluto
        var target = _inHf ? (behind ? ps.HfBehind : ps.HfFront) : (behind ? ps.Behind : ps.Front);
        var items = PaintObject(run, x, y, w, h, tbContent, ps);
        var obj = new PlacedObject { Run = run, X = x, Y = y, W = w, H = h, Layer = behind ? "behind" : "front", Hf = _inHf };
        (ps.Page.Objects ??= new List<PlacedObject>()).Add(obj);
        var zobj = new ZObj { Z = anchor?.RelativeHeight ?? 0, Seq = _zSeq++, Items = items };
        target.Add(zobj);
        FloatBox? box = null;
        // modo de compatibilidade ≤ 14: flutuantes do cabeçalho/rodapé não afastam texto
        // nenhum (nem o do próprio cabeçalho, nem o do corpo) — oráculo hffloat (hff14-*)
        bool hfLegacy = _inHf && _ctx.Fmt.Settings.CompatibilityMode < 15;
        if (anchor is not null && Wrapping.Contains(anchor.Wrap) && !hfLegacy)
        {
            box = new FloatBox { X = x, Y = y, W = w, H = h, Wrap = anchor.Wrap, DistL = anchor.DistL ?? 0, DistR = anchor.DistR ?? 0, DistT = anchor.DistT ?? 0, DistB = anchor.DistB ?? 0 };
            ps.Floats.Add(box);
        }
        return new FloatReceipt { Ps = ps, Target = target, ZObj = zobj, Obj = obj, Box = box };
    }

    /// <summary>Desenha imagem/forma/caixa/grupo no retângulo dado.</summary>
    private List<PageItem> PaintObject(Run run, double x, double y, double w, double h, CellContent? tbContent, PageState? ps = null)
    {
        ps ??= _cur;
        var outp = new List<PageItem>();
        var theme = _ctx.Fmt.Theme;
        if (run.Image is not null && Emf.IsEmf(run.Image.Data))
        {
            outp.Add(ClipItem.Push(x, y, w, h));
            outp.AddRange(Emf.RenderEmf(_ctx, run.Image.Data, x, y, w, h));
            outp.Add(ClipItem.Pop());
        }
        else if (run.Image is not null)
        {
            outp.Add(Paint.ImageItemOf(run.Image, x, y, w, h));
        }
        else if (run.Shape is not null)
        {
            var s = run.Shape.Style;
            string? fill = Resolve.ResolveDrawingColor(s.Fill, theme);
            var stroke = s.Line is not null
                ? new StrokeSpec { Color = Resolve.ResolveDrawingColor(s.Line.Color, theme) ?? "000000", WidthPt = s.Line.WidthPt, Dash = Js.Truthy(s.Line.Dash) ? s.Line.Dash : null }
                : null;
            outp.Add(new ShapeItem { X = x, Y = y, W = w, H = h, Style = s, Fill = fill, Stroke = stroke, Line = run.Shape.Line });
        }
        else if (run.Textbox is not null)
        {
            var tb = run.Textbox;
            var s = tb.Shape;
            if (s is not null && (Js.Truthy(s.Fill) || s.Line is not null))
            {
                string? fill = Resolve.ResolveDrawingColor(s.Fill, theme);
                var stroke = s.Line is not null ? new StrokeSpec { Color = Resolve.ResolveDrawingColor(s.Line.Color, theme) ?? "000000", WidthPt = s.Line.WidthPt } : null;
                outp.Add(new ShapeItem { X = x, Y = y, W = w, H = h, Style = s, Fill = fill, Stroke = stroke });
            }
            if (tbContent is not null)
            {
                var ins = tb.Insets ?? DefaultInsets;
                // caixa girada: o conteúdo gira em torno do centro (a forma já gira no pintor)
                double rot = tb.Rot ?? s?.Rot ?? 0;
                bool rotOn = rot != 0 && !double.IsNaN(rot);
                if (rotOn) outp.Add(XformItem.Push(Rotation(x + w / 2, y + h / 2, rot)));
                if (Js.Truthy(tb.WordArt) && tbContent.Lines.Count > 0)
                {
                    // WordArt (textPlain): o texto estica para preencher a caixa interna
                    double x0 = Lines.JsMinOf(tbContent.Lines.Select(l => l.X)), x1 = Lines.JsMax(tbContent.Lines.Select(l => l.X + l.Width));
                    double iw = Math.Max(1, w - ins.L - ins.R), ih = Math.Max(1, h - ins.T - ins.B);
                    double sx = iw / Math.Max(1, x1 - x0), sy = ih / Math.Max(1, tbContent.Height);
                    outp.Add(XformItem.Push(new[] { sx, 0, 0, sy, x + ins.L - x0 * sx, y + ins.T }));
                    foreach (var it in tbContent.Items) outp.Add(it);
                    outp.Add(XformItem.Pop());
                }
                else
                {
                    double dy = y + ins.T;
                    double free = h - ins.T - ins.B - tbContent.Height;
                    if (tb.VAnchor == "ctr" && free > 0) dy += free / 2;
                    else if (tb.VAnchor == "b" && free > 0) dy += free;
                    outp.Add(ClipItem.Push(x, y, w, h));
                    foreach (var it in tbContent.Items) outp.Add(TableEngine.ShiftItem(it, dy, x + ins.L));
                    outp.Add(ClipItem.Pop());
                }
                if (rotOn) outp.Add(XformItem.Pop());
            }
        }
        else if (run.Group is not null)
        {
            var gr = run.Group;
            double sx = gr.WidthTwips != 0 && !double.IsNaN(gr.WidthTwips) ? w / gr.WidthTwips : 1;
            double sy = gr.HeightTwips != 0 && !double.IsNaN(gr.HeightTwips) ? h / gr.HeightTwips : 1;
            foreach (var item in gr.Items)
            {
                var r = item.Run;
                CellContent? tc = null;
                if (r.Textbox is not null)
                {
                    var ins = r.Textbox.Insets ?? DefaultInsets;
                    var blocks = r.Textbox.Blocks ?? r.Textbox.Paras.Select(p => (Block)new ParagraphBlock { Paragraph = p }).ToList();
                    tc = LayoutStatic(blocks, 0, Math.Max(1, item.W * sx - ins.L - ins.R), new ParaEnv { DarkBackground = IsDark(r.Textbox.Shape?.Fill) }, "grp", ps);
                }
                outp.AddRange(PaintObject(r, x + item.X * sx, y + item.Y * sy, item.W * sx, item.H * sy, tc, ps));
            }
        }
        return outp;
    }

    private static bool IsDark(string? hex) => Para.IsDark(hex);

    private static HfBlocks BlocksOfParas(HeaderFooterSet set)
    {
        static List<Block>? Conv(List<Paragraph>? ps) => ps?.Select(p => (Block)new ParagraphBlock { Paragraph = p }).ToList();
        var outp = new HfBlocks();
        if (set.Default is not null) outp.Default = Conv(set.Default);
        if (set.First is not null) outp.First = Conv(set.First);
        if (set.Even is not null) outp.Even = Conv(set.Even);
        return outp;
    }

    private static (double X, double W) HorizRef(string from, SectGeom g, double colX, double colW) => from switch
    {
        "page" => (0, g.PageW),
        "margin" => (g.MarL, g.PageW - g.MarL - g.MarR),
        "leftMargin" or "insideMargin" => (0, g.MarL),
        "rightMargin" or "outsideMargin" => (g.PageW - g.MarR, g.MarR),
        "character" => (colX, colW),
        _ => (colX, colW), // column
    };

    private static (double Y, double H) VertRef(string from, SectGeom g, PageState ps, double paraTop) => from switch
    {
        "page" => (0, g.PageH),
        "margin" => (g.MarT, g.PageH - g.MarT - g.MarB),
        "topMargin" or "insideMargin" => (0, g.MarT),
        "bottomMargin" or "outsideMargin" => (g.PageH - g.MarB, g.MarB),
        _ => (paraTop, 0), // paragraph | line
    };

    private static double AlignPos(string? align, double? offset, double b, double span, double size, double? pct, double pageSpan)
    {
        if (!string.IsNullOrEmpty(align))
        {
            return align switch
            {
                "center" => b + (span - size) / 2,
                "right" or "bottom" or "outside" => b + span - size,
                _ => b, // left | top | inside
            };
        }
        if (pct is not null) return b + (pct.Value / 100000) * pageSpan;
        return b + (offset ?? 0);
    }

    private static LaidOutLine LineRecord(string reference, PreparedPara p, Line line, double frameX, double top)
    {
        var gs = p.Glyphs;
        var first = line.Start < gs.Count ? gs[line.Start] : null;
        int li = Math.Max(line.Start, line.End - 1);
        var lastG = li >= 0 && li < gs.Count ? gs[li] : null;
        double start = first is not null ? first.Offset : 0;
        double end = lastG is not null ? lastG.Offset + (lastG.Ch.Length > 0 ? lastG.Ch.Length : 1) : start;
        // posição de cada caractere (offset no parágrafo → x absoluto e largura): o
        // editor mapeia cursor/seleção/clique por aqui
        var chars = line.Placed
            .Where(pg => pg.G.Kind != GlyphKind.Pb && pg.G.Kind != GlyphKind.Cb)
            .Select(pg => new LineChar(pg.G.Offset, frameX + pg.X, pg.W)).ToList();
        return new LaidOutLine
        {
            Ref = reference, Start = start, End = end,
            X = frameX + line.XStart, Y = top, Height = line.Height, Baseline = top + line.Baseline, Width = line.Width,
            Chars = chars,
        };
    }
}

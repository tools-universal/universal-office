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
    public static LayoutResult LayoutDocument(FullDocument full0, IFontProvider provider, LayoutOptions? opts = null)
    {
        var fmt = full0.Formatting ?? DocContext.EmptyFormatting();
        // molduras (w:framePr) saem do fluxo: viram caixas ancoradas no parágrafo seguinte
        var lifted = Frames.LiftFrames(full0.Blocks, new HashSet<int>(full0.Sections.Select(s => s.BlockEnd)));
        FullDocument full = full0;
        if (!ReferenceEquals(lifted, full0.Blocks)) { full = full0.ShallowClone(); full.Blocks = lifted; }
        // NUMPAGES e PAGEREF dependem do próprio layout: a 1ª passada estima, as
        // seguintes usam o total de páginas e as páginas dos indicadores da anterior
        double total = 1;
        var marks = new Dictionary<string, string>(StringComparer.Ordinal);
        LayoutResult? result = null;
        // flutuantes de posição vertical absoluta que cobrem texto JÁ diagramado da
        // página (ancorados depois dele): a passada seguinte os coloca no início da
        // página e o texto de antes os contorna (oráculo latefloat)
        var late = new Dictionary<int, List<Run>>();
        // tabelas flutuantes (âncora no texto) que cobrem linhas JÁ diagramadas antes
        // delas: na passada seguinte entram no início da página, na posição achada, e o
        // texto de antes as contorna (oráculo ftable2, ft2-form*)
        var lateTables = new Dictionary<int, LateTable>();
        Engine? last = null;
        for (int pass = 0; pass < 5; pass++)
        {
            var ctx = new DocContext(fmt, provider, opts);
            var eng = new Engine(ctx, full, total, marks, late, lateTables);
            result = eng.Run();
            last = eng;
            var newMarks = eng.UsedPageRef ? eng.BookmarkPages() : marks;
            var newLate = eng.LateFound.Count > 0 ? MergeLate(late, eng.LateFound) : late;
            var newLateTables = lateTables;
            if (eng.LateTablesFound.Count > 0)
            {
                newLateTables = new Dictionary<int, LateTable>(lateTables);
                foreach (var (k, v) in eng.LateTablesFound) newLateTables[k] = v;
            }
            bool stable = (!eng.UsedNumPages || result.Pages.Count == total)
                && (!eng.UsedPageRef || SameMap(newMarks, marks)) && ReferenceEquals(newLate, late) && ReferenceEquals(newLateTables, lateTables);
            if (stable) break;
            total = result.Pages.Count;
            marks = newMarks;
            lateTables = newLateTables;
            late = newLate;
        }
        // seções de várias colunas encerradas por quebra CONTÍNUA: o Word equilibra as
        // colunas da última página da seção — a menor altura de coluna com que o conteúdo,
        // enchido em sequência, ainda cabe nas colunas da página (oráculo colbal)
        var balance = new Dictionary<int, BalanceSpec>();
        Engine RunWith(Dictionary<int, BalanceSpec> bal)
        {
            var eng = new Engine(new DocContext(fmt, provider, opts), full, total, marks, late, lateTables, bal);
            result = eng.Run();
            return eng;
        }
        var done = new HashSet<int>();
        for (int guard = 0; guard < 20 && last is not null; guard++)
        {
            var next = last.BalanceFound.Where(kv => !done.Contains(kv.Key) && kv.Value.N > 1).Select(kv => (KeyValuePair<int, BalanceInfo>?)kv).FirstOrDefault();
            if (next is null) break;
            int s = next.Value.Key;
            var info = next.Value.Value;
            done.Add(s);
            double lo = Math.Max(0, Math.Floor(info.Sum / info.N) - 1), hi = Math.Ceiling(info.Bottom - info.ColTop);
            if (hi <= lo + 1) continue;
            bool Fits(double h)
            {
                var bal = new Dictionary<int, BalanceSpec>(balance) { [s] = new BalanceSpec(info.Page, h) };
                return RunWith(bal).BalanceFound.TryGetValue(s, out var bi) && bi.Page == info.Page;
            }
            if (!Fits(hi)) continue;
            while (hi - lo > 1)
            {
                double mid = Math.Floor((lo + hi) / 2);
                if (Fits(mid)) hi = mid; else lo = mid;
            }
            balance[s] = new BalanceSpec(info.Page, hi);
            last = RunWith(balance);
        }
        return result!;
    }

    /// <summary>Junta os flutuantes tardios achados numa passada (o mesmo objeto não entra duas vezes).</summary>
    private static Dictionary<int, List<Run>> MergeLate(Dictionary<int, List<Run>> a, Dictionary<int, List<Run>> b)
    {
        var seen = new HashSet<Run>(a.Values.SelectMany(v => v), ReferenceEqualityComparer.Instance);
        Dictionary<int, List<Run>>? outp = null;
        foreach (var (pg, runs) in b)
        {
            foreach (var r in runs)
            {
                if (!seen.Add(r)) continue;
                outp ??= a.ToDictionary(kv => kv.Key, kv => new List<Run>(kv.Value));
                if (!outp.TryGetValue(pg, out var list)) outp[pg] = list = new List<Run>();
                list.Add(r);
            }
        }
        return outp ?? a;
    }

    private static bool SameMap(Dictionary<string, string> a, Dictionary<string, string> b)
    {
        if (a.Count != b.Count) return false;
        foreach (var (k, v) in a) if (!b.TryGetValue(k, out var bv) || bv != v) return false;
        return true;
    }
}

/// <summary>Tabela flutuante tardia: página (índice) e y do fluxo de referência da âncora.</summary>
internal sealed record LateTable(int Page, double FlowY);

/// <summary>Coluna equilibrada: página (índice) da última página da seção e altura das colunas.</summary>
internal sealed record BalanceSpec(int Page, double H);

/// <summary>Conteúdo da seção na sua última página (passada sem equilíbrio): soma das alturas usadas.</summary>
internal sealed record BalanceInfo(int Page, double ColTop, double Bottom, double Sum, int N);

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
    /// <summary>wrapText: lado(s) por onde o texto passa (bothSides | left | right | largest)</summary>
    public string? Side;
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
    /// <summary>flutuantes do cabeçalho/rodapé nos modos ≤ 14: não afastam texto, só tabelas (oráculo tblfloat)</summary>
    public List<FloatBox>? TblFloats;
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
    /// <summary>lista (abstractNum) do parágrafo numerado/com marcador</summary>
    public string? List;

    public PrevPara ShallowClone() => (PrevPara)MemberwiseClone();
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
    /// <summary>topo de página que MANTÉM o espaço antes do próximo parágrafo (1º da seção
    /// nova, parágrafo que começa com quebra de página, quebra antes no modo ≤ 14):
    /// o "depois" do último parágrafo da página anterior, que o Word desconta —
    /// espaço = colapso(depois, antes) − depois (oráculo tocref-sectgap). null = suprime</summary>
    private double? _topGapPrevAfter;
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

    /// <summary>flutuantes tardios (passada anterior): índice da página → objetos</summary>
    private readonly Dictionary<int, List<Run>> _lateFloats;
    /// <summary>flutuantes tardios achados nesta passada</summary>
    public readonly Dictionary<int, List<Run>> LateFound = new();
    /// <summary>tabelas flutuantes tardias (passada anterior): bloco → página e y de referência</summary>
    private readonly Dictionary<int, LateTable> _lateTables;
    public readonly Dictionary<int, LateTable> LateTablesFound = new();
    /// <summary>tabelas flutuantes do corpo já colocadas (blocos)</summary>
    private readonly HashSet<int> _placedTables = new();
    /// <summary>tabelas tardias (início da página) que partiram: a âncora vai para a continuação</summary>
    private readonly HashSet<int> _lateSplit = new();

    public Engine(DocContext ctx, FullDocument full, double totalPagesGuess, Dictionary<string, string>? marksGuess = null, Dictionary<int, List<Run>>? lateFloats = null,
        Dictionary<int, LateTable>? lateTables = null,
        /* colunas equilibradas: seção → página e altura (busca em LayoutDocument) */
        Dictionary<int, BalanceSpec>? balance = null)
    {
        _ctx = ctx;
        _full = full;
        _totalPagesGuess = totalPagesGuess;
        _marksGuess = marksGuess ?? new Dictionary<string, string>(StringComparer.Ordinal);
        _lateFloats = lateFloats ?? new Dictionary<int, List<Run>>();
        _lateTables = lateTables ?? new Dictionary<int, LateTable>();
        _balance = balance ?? new Dictionary<int, BalanceSpec>();
    }

    private readonly Dictionary<int, BalanceSpec> _balance;
    /// <summary>seções de várias colunas seguidas de seção contínua: o que ocupam na última página</summary>
    public Dictionary<int, BalanceInfo> BalanceFound = new();
    /// <summary>alturas usadas pelas colunas já encerradas na porção da seção nesta página</summary>
    private List<double> _colUsed = new();
    /// <summary>fundo do corpo antes do limite de coluna equilibrada (restaurado na seção seguinte)</summary>
    private double? _balanceSaved;

    /// <summary>Limita a altura das colunas na última página de uma seção equilibrada.</summary>
    private void ApplyBalance()
    {
        if (!_balance.TryGetValue(_cur.Geom.Index, out var spec) || spec.Page != _pages.Count - 1) return;
        _balanceSaved = _cur.BodyBottom;
        _cur.BodyBottom = Math.Min(_cur.BodyBottom, _colTop + spec.H);
    }


    private static readonly Regex WsRe = new(@"\s+", RegexOptions.CultureInvariant);
    /// <summary>\s do JS (espaços e quebras Unicode)</summary>
    private static readonly Regex JsWsRe = new("[\t\n\u000b\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]", RegexOptions.CultureInvariant);
    private static readonly Regex SeqR = new(@"\\r\s*([0-9]+)", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);
    private static readonly Regex SeqC = new(@"\\c(?![A-Za-z0-9_])", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);
    private static readonly Regex SeqH = new(@"\\h(?![A-Za-z0-9_])", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);
    private static readonly Regex SeqFmt = new(@"\\\*\s*([A-Za-z0-9_]+)", RegexOptions.CultureInvariant);
    private static readonly Regex RefSwitchP = new(@"\\p(?![A-Za-z0-9_])", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);
    private static readonly Regex RefSwitchNum = new(@"\\[nrw](?![A-Za-z0-9_])", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);
    private static readonly Regex RefWs = new("[\t\n\f\u000B]", RegexOptions.CultureInvariant);
    private static readonly Regex BRef = new(@"^b([0-9]+)", RegexOptions.CultureInvariant);
    private static readonly Regex BOnlyRe = new(@"^b[0-9]+\z", RegexOptions.CultureInvariant);
    /// <summary>linhas que não são do corpo (cabeçalho, rodapé, caixa de texto)</summary>
    private static readonly Regex LateSkipRe = new(@"^(hdr|ftr|txbx)", RegexOptions.CultureInvariant);

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
        if (string.IsNullOrEmpty(bm) || RefSwitchP.IsMatch(instr)) return null; // posição (acima/abaixo): mantém o cache
        if (RefSwitchNum.IsMatch(instr))
        {
            // número do parágrafo: o Word recalcula na exportação; sem os pontos finais,
            // e "0" se o parágrafo do indicador não é numerado (oráculo numbering3, ref-num)
            if (!_full.Bookmarks.TryGetValue(bm, out var bi) || bi < 0 || bi >= _full.Blocks.Count || _full.Blocks[bi] is not ParagraphBlock) return null;
            string? t = ListNumberOf(bi);
            return Js.Truthy(t) ? t!.TrimEnd('.') : "0";
        }
        if (!_full.Bookmarks.TryGetValue(bm, out var b)) return null;
        var blk = b >= 0 && b < _full.Blocks.Count ? _full.Blocks[b] : null;
        if (blk is not ParagraphBlock pb) return null;
        string text = string.Concat(pb.Paragraph.Runs.Select(x => Js.Truthy(x.Field) || x.Image is not null || x.Textbox is not null ? "" : x.Text));
        text = RefWs.Replace(text, " ").Trim();
        return text.Length > 0 ? text : null;
    }

    /// <summary>texto do número de lista de cada parágrafo do corpo (bloco → texto), na ordem do documento</summary>
    private Dictionary<int, string>? _listTexts;

    private string? ListNumberOf(int block)
    {
        if (_listTexts is null)
        {
            var outp = new Dictionary<int, string>();
            var saved = _ctx.Numbering;
            var st = new NumberingState(_ctx.Fmt.Numbering, _ctx.Fmt.Styles.Styles, _ctx.Opts.Lang);
            _ctx.Numbering = st;
            string Num(Paragraph para)
            {
                var n = Para.ResolvePPr(_ctx, para, new ParaEnv()).Ppr.NumPr;
                return (n?.NumId is { } nid && nid != 0 && !double.IsNaN(nid) ? st.Next(nid, n.Ilvl ?? 0)?.Text : null) ?? "";
            }
            void Visit(Block b)
            {
                if (b is ParagraphBlock pb) { Num(pb.Paragraph); return; }
                foreach (var row in ((TableBlock)b).Rows)
                    foreach (var cell in row.Cells)
                        foreach (var c in CellBlocks(cell)) Visit(c);
            }
            try
            {
                for (int i = 0; i < _full.Blocks.Count; i++)
                {
                    if (_full.Blocks[i] is ParagraphBlock pb) outp[i] = Num(pb.Paragraph);
                    else Visit(_full.Blocks[i]);
                }
            }
            finally { _ctx.Numbering = saved; }
            _listTexts = outp;
        }
        return _listTexts.TryGetValue(block, out var t) ? t : null;
    }

    /// <summary>Página exibida (já formatada) do parágrafo de cada indicador.</summary>
    public Dictionary<string, string> BookmarkPages()
    {
        var outp = new Dictionary<string, string>(StringComparer.Ordinal);
        var firstPage = new Dictionary<double, LayoutPage>();
        // linhas de cada parágrafo do corpo: fim (offset) e página, na ordem
        var paraLines = new Dictionary<double, List<(double End, LayoutPage Page)>>();
        foreach (var ps in _pages)
        {
            foreach (var l in ps.Page.Lines)
            {
                var m = BRef.Match(l.Ref);
                if (m.Success)
                {
                    double k = Js.ParseInt(m.Groups[1].Value);
                    if (!firstPage.ContainsKey(k)) firstPage[k] = ps.Page;
                    if (l.Ref == "b" + m.Groups[1].Value)
                    {
                        if (!paraLines.TryGetValue(k, out var arr)) paraLines[k] = arr = new();
                        arr.Add((l.End, ps.Page));
                    }
                }
            }
        }
        foreach (var name in _full.BookmarkOrder.Count == _full.Bookmarks.Count ? _full.BookmarkOrder : _full.Bookmarks.Keys.ToList())
        {
            int block = _full.Bookmarks[name];
            // indicador em bloco sem linha (vazio): a próxima linha diagramada
            LayoutPage? pg = null;
            // dentro do parágrafo: a linha que contém a posição do indicador (depois de
            // uma quebra de página no meio do parágrafo, a página seguinte — oráculo tocref-pbstart)
            if (_full.BookmarkOffsets is not null && _full.BookmarkOffsets.TryGetValue(name, out int off)
                && paraLines.TryGetValue(block, out var lines))
            {
                foreach (var (end, page) in lines) if (end > off) { pg = page; break; }
            }
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
        // PDF do Word aberto e exportado direto: os parágrafos formatados na abertura
        // guardam o número; depois deles, as listas com startOverride recomeçam
        // (oráculo numbering3, pg2-*). Na abertura a 1ª página vai até o bloco que
        // transborda para a 2ª — e sem descontar o cabeçalho que empurra o corpo:
        // cabe mais essa altura (pg2-header).
        int numReopen = 0; // 0: 1ª página; 1: na 2ª, até o limite da abertura; 2: esquecer; 3: feito
        double openLimit = 0;
        void ToPage2()
        {
            var p1 = _pages[0];
            var p2 = _pages[1];
            openLimit = p2.BodyTop + Math.Max(0, p1.BodyTop - p1.Geom.MarT);
            numReopen = 1;
        }
        void PastOpen()
        {
            if (numReopen == 1 && (!ReferenceEquals(_cur, _pages[1]) || _y >= openLimit)) numReopen = 2;
        }
        foreach (var g in _geoms)
        {
            if (g.Index == 0 || g.Type != "continuous")
            {
                double lastAfter = _prev is not null ? _prev.After : 0;
                NewPage(g, g.Type);
                // seção nova (próxima página/par/ímpar): o 1º parágrafo mantém o espaço
                // antes, descontado o "depois" do último da seção anterior (tocref-sectgap)
                if (g.Index > 0) _topGapPrevAfter = lastAfter;
            }
            else ContinuousSection(g);
            for (int b = g.Blocks.Start; b <= g.Blocks.End && b < full.Blocks.Count; b++)
            {
                var block = full.Blocks[b];
                // quebra de seção: a 2ª página começa neste bloco
                if (numReopen == 0 && _pages.Count >= 2) { ToPage2(); PastOpen(); }
                if (numReopen == 2) { _ctx.Numbering.ForgetFirstUse(); numReopen = 3; }
                if (block is ParagraphBlock pb) PlaceParagraph(pb.Paragraph, $"b{b}", b, g);
                else PlaceTable((TableBlock)block, $"b{b}", b);
                if (numReopen == 0 && _pages.Count >= 2) ToPage2();
                PastOpen();
            }
        }
        // tabela flutuante dividida no fim do documento: as linhas restantes ganham páginas
        for (int k = 0; k < 100 && _floatCarry.Count > 0 && _cur is not null; k++) NewPage(_cur.Geom);
        if (_cur is not null) PaintNotes(_cur);
        // finaliza páginas (cabeçalhos/rodapés já entram na criação)
        // fundo da página (w:background): o Word o grava no PDF (corpus); branco = nada
        var bgSpec = full.Background;
        string? bg = bgSpec is not null ? Resolve.ResolveColor(bgSpec.Color, bgSpec.ThemeColor, bgSpec.ThemeTint, bgSpec.ThemeShade, _ctx.Fmt.Theme) : null;
        var pages = _pages.Select(ps =>
        {
            // camadas do Word: TODO o cabeçalho/rodapé (atrás, texto, frente) fica
            // abaixo do documento; no corpo, atrás do texto < texto < na frente
            // (descarte fora da página por camada: HfItems conta o que sobrou do HF)
            var hf = new List<PageItem>();
            hf.AddRange(ZItems(ps.HfBehind));
            hf.AddRange(ps.Hf);
            hf.AddRange(ZItems(ps.HfFront));
            var hfLayer = CullOffPage(hf, ps.Page.WidthTw, ps.Page.HeightTw);
            // bordas de página: atrás do texto (zOrder back) ou na frente (padrão)
            var pb = ps.Geom.Index < full.Sections.Count ? full.Sections[ps.Geom.Index].Sect?.PgBorders : null;
            var pbItems = pb is not null ? PageBorders(ps, pb) : new List<PageItem>();
            bool pbBack = pb?.ZOrder == "back";
            var body = new List<PageItem>();
            body.AddRange(ZItems(ps.Behind));
            body.AddRange(ps.Body);
            body.AddRange(ZItems(ps.Front));
            var items = new List<PageItem>(hfLayer);
            if (pbBack) items.AddRange(pbItems);
            items.AddRange(CullOffPage(body, ps.Page.WidthTw, ps.Page.HeightTw));
            if (!pbBack) items.AddRange(pbItems);
            ps.Page.Items = items;
            ps.Page.HfItems = hfLayer.Count;
            if (bg is not null && bg.ToUpperInvariant() != "FFFFFF" && bg != "auto") ps.Page.Background = bg;
            return ps.Page;
        }).ToList();
        return new LayoutResult { Pages = pages, Warnings = _ctx.Warnings.ToList() };
    }

    /// <summary>Bordas de página da seção nesta página (w:display, contorno do cabeçalho/rodapé).</summary>
    private List<PageItem> PageBorders(PageState ps, PgBordersSpec pb)
    {
        bool first = ps.SectPage == 0;
        if ((pb.Display == "firstPage" && !first) || (pb.Display == "notFirstPage" && first)) return new List<PageItem>();
        // cabeçalho/rodapé presentes = algo desenhado acima/abaixo do corpo
        static double? TopOf(PageItem it) => it switch
        {
            GlyphRunItem g => g.Y,
            RectItem r => r.Y,
            ImageItem im => im.Y,
            ShapeItem s => s.Y,
            LineItem l => l.Y1,
            _ => null,
        };
        var hf = new List<PageItem>(ps.Hf);
        hf.AddRange(ZItems(ps.HfBehind));
        hf.AddRange(ZItems(ps.HfFront));
        var set = _ctx.Fmt.Settings;
        return Paint.PageBorderItems(_ctx, pb, ps.Geom,
            !set.BordersDoNotSurroundHeader && hf.Any(it => (TopOf(it) ?? double.PositiveInfinity) < ps.BodyTop),
            !set.BordersDoNotSurroundFooter && hf.Any(it => (TopOf(it) ?? double.NegativeInfinity) > ps.BodyBottom));
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
        _colUsed = new List<double>();
        _balanceSaved = null;
        ApplyBalance();
        _atTop = true;
        _topGapPrevAfter = null;
        _prev = null;
        if (_floatCarry.Count > 0) PlaceFloatCarry();
        // flutuantes tardios desta página: entram antes do texto
        if (_lateFloats.TryGetValue(_pages.Count - 1, out var late))
        {
            var fr = ColFrame();
            foreach (var run in late)
            {
                PlaceFloat(run, _cur, fr.X, fr.W, _cur.BodyTop, _cur.Body, 0);
                _prePlaced.Add(run);
            }
        }
        foreach (var (bi, lt) in _lateTables)
        {
            var b = bi >= 0 && bi < _full.Blocks.Count ? _full.Blocks[bi] : null;
            if (lt.Page != _pages.Count - 1 || _placedTables.Contains(bi) || b is not TableBlock tbk || tbk.TblPr?.TblpPr is not { } ltp) continue;
            _placedTables.Add(bi);
            var fr = ColFrame();
            var t = TableEngine.LayoutTable(_ctx, tbk, 0, fr.W, (cell, cx, cw, cenv, cref) => LayoutCell(cell, cx, cw, cenv, cref, _cur), $"b{bi}");
            var items = new List<PageItem>();
            PlaceFloatingTable(t, ltp, _cur, lt.FlowY, fr.X, fr.W, items, 0, true, true);
            _cur.Front.Add(new ZObj { Z = -1, Seq = _zSeq++, Items = items });
            if (_floatCarry.Any(c => ReferenceEquals(c.T, t))) _lateSplit.Add(bi);
        }
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
        _colMaxY = 0;
        LayoutHeaderFooter(ps);
        ps.BodyBottomBase = ps.BodyBottom;
        // continuação de nota partida na página anterior: primeiro no pé desta (oráculo fncont)
        if (_noteCarry.Count > 0)
        {
            foreach (var nc in _noteCarry)
            {
                if (ps.Notes.Count == 0) ps.NoteArea += SeparatorHeight();
                ps.Notes.Add(nc);
                ps.NoteArea += nc.Content.Height;
            }
            _noteCarry = new List<(double Id, CellContent Content)>();
            ps.BodyBottom = ps.BodyBottomBase - ps.NoteArea;
        }
    }

    private void ContinuousSection(SectGeom g)
    {
        // a seção que termina (várias colunas): o que ocupou nesta página (equilíbrio)
        var ending = _cur.Geom;
        if (ending.Cols.Count > 1)
        {
            var used = new List<double>(_colUsed) { _y - _colTop };
            BalanceFound[ending.Index] = new BalanceInfo(_pages.Count - 1, _colTop, _balanceSaved ?? _cur.BodyBottom, used.Aggregate(0.0, (a, b) => a + Math.Max(0, b)), ending.Cols.Count);
        }
        if (_balanceSaved is { } bs) { _cur.BodyBottom = bs; _balanceSaved = null; }
        _colUsed = new List<double>();
        // mesma página; nova geometria de colunas a partir do fim da coluna mais
        // ALTA da seção anterior (corpus t89)
        _y = Math.Max(_y, _colMaxY);
        _colMaxY = 0;
        _cur.Geom = g;
        _col = 0;
        _colTop = _y;
        ApplyBalance();
        // o espaço "depois" do último parágrafo da seção anterior colapsa com o
        // "antes" do 1º desta, como entre parágrafos (oráculo colbreak, cb-textsect-*)
    }

    /// <summary>fundo da coluna mais alta já deixada nesta página (seção de várias colunas)</summary>
    private double _colMaxY;
    /// <summary>"depois" do parágrafo vazio de quebra contínua que não ocupa altura: o seguinte
    /// desconta (oráculo colbreak)</summary>
    private double? _sectGapAfter;

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
            _colUsed.Add(_y - _colTop);
            _colMaxY = Math.Max(_colMaxY, _y);
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
        // DATE/TIME: o Word recalcula ao exportar — o instante da exportação
        if (name is "DATE" or "TIME") return DateFmt.DateFieldValue(instr ?? name, _ctx.Opts.Now, _ctx.Opts.Lang);
        // datas das propriedades do documento (o Word as relê ao exportar; hora local)
        if (name is "SAVEDATE" or "CREATEDATE" or "PRINTDATE")
        {
            var cp = _full.CoreProps;
            string? iso = name == "SAVEDATE" ? cp?.Modified : name == "CREATEDATE" ? cp?.Created : cp?.LastPrinted;
            var d = DateFmt.ParseIsoLocal(iso);
            return d is { } dd ? DateFmt.DateFieldValue(instr ?? name, dd, _ctx.Opts.Lang) : null;
        }
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
        var env = new ParaEnv { Field = FieldValue(ps) };
        double width = g.PageW - g.MarL - g.MarR;
        // numeração em cabeçalho/rodapé: própria, não avança a lista do corpo (oráculo numbering3, hdr-list)
        var savedNum = _ctx.Numbering;
        _ctx.Numbering = new NumberingState(_ctx.Fmt.Numbering, _ctx.Fmt.Styles.Styles, _ctx.Opts.Lang);
        _inHf = true;
        try
        {
            var hdr = Pick(g.Headers);
            if (hdr is { Count: > 0 })
            {
                // a "margem" dos objetos do cabeçalho posicionados em relação a ela é o topo
                // REAL do corpo (empurrado pelo cabeçalho): mede antes (corpus t43)
                var hprobe = _ctx.Pure(() => LayoutStatic(hdr, g.MarL, width, env, $"hdr:{kind}", ScratchPage(ps), g.Hdr));
                ps.BodyTop = Math.Max(g.MarT, g.Hdr + hprobe.Height);
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
    public CellContent LayoutStatic(List<Block> blocks0, double x, double width, ParaEnv env, string reference, PageState? ps = null, double yOrigin = 0, CellNeighbors? nb = null)
    {
        // moldura dentro de célula de tabela: o Word a ignora (parágrafo normal — corpus t43)
        var blocks = _inCell ? blocks0 : Frames.LiftFrames(blocks0);
        var items = new List<PageItem>();
        var lines = new List<LaidOutLine>();
        double y = 0;
        PrevPara? prev = null;
        // lista do parágrafo anterior (espaçamento automático entre itens)
        string? prevList = null;
        bool keepNext = false;
        int n = blocks.Count;
        var envNoBreaks = env.Clone();
        envNoBreaks.NoPageBreaks = true;
        bool isHf = ps is not null && HfRefRe.IsMatch(reference);
        // cabeçalho/rodapé (também nas medições sem página): o "depois" automático do
        // último parágrafo conta na altura — só na célula ele some (oráculo autosp)
        bool hfFlow = HfRefRe.IsMatch(reference);
        // tabelas flutuantes aninhadas (célula): o texto seguinte da célula as contorna
        // e a célula cresce até o fim delas (oráculo cellftbl) — coordenadas locais
        var cellFloats = new List<FloatBox>();
        var cellPs = new PageState { Floats = cellFloats };
        double floatBottom = 0;
        // desenhadas depois do texto da célula (ordem do PDF do Word)
        var floatItems = new List<PageItem>();
        var floatLines = new List<LaidOutLine>();
        if (isHf)
        {
            // cabeçalho/rodapé: flutuantes com posição vertical absoluta (página/margem)
            // vão primeiro — o conteúdo ANTES da âncora também os contorna (medido no Word)
            foreach (var b0 in blocks)
            {
                if (b0 is not ParagraphBlock pb0) continue;
                var carry0 = Frames.CarryOf(pb0.Paragraph);
                var runs0 = Frames.IsSkipped(pb0.Paragraph) ? (carry0 is not null ? new List<Run> { carry0 } : new List<Run>()) : pb0.Paragraph.Runs;
                foreach (var run in runs0)
                {
                    var anc = run.Image?.Anchor ?? run.Shape?.Anchor ?? run.Group?.Anchor ?? run.Textbox?.Anchor;
                    if (!IsFloating(run) || anc is null || !AbsoluteV.Contains(anc.PosV.RelativeFrom ?? "") || _onlyTextFloats) continue;
                    PlaceFloat(run, ps!, x, width, yOrigin, items, yOrigin);
                    _prePlaced.Add(run);
                }
            }
        }
        // parágrafo de marca oculta que se junta ao seguinte
        HiddenJoin? join = null;
        // runs de parágrafos de marca excluída (revisão) que vão para o seguinte
        List<Run>? delRuns = null;
        var paras = new Dictionary<string, ParaSplitInfo>(StringComparer.Ordinal);
        // linhas de tabelas aninhadas (partem como linha na quebra da célula de fora)
        var nest = new List<NestRow>();
        ParaSplitInfo? lastPara = null;
        for (int bi = 0; bi < n; bi++)
        {
            var b = blocks[bi];
            if (b is ParagraphBlock pblk)
            {
                if (Frames.IsSkipped(pblk.Paragraph))
                {
                    var carry = Frames.CarryOf(pblk.Paragraph);
                    if (carry is not null && ps is not null && !_prePlaced.Contains(carry)) PlaceFloat(carry, ps, x + _staticDx, width, yOrigin + y + (prev is not null ? prev.After : 0), items, yOrigin);
                    // âncora = tabela: o texto da moldura entra na 1ª linha dela, na ordem das colunas
                    if (_hfFrameAfter.Count > 0 && bi + 1 < n && blocks[bi + 1] is TableBlock) { _hfFrameTbl.AddRange(_hfFrameAfter); _hfFrameAfter.Clear(); }
                    if (_hfFrameAfter.Count > 0) { items.AddRange(_hfFrameAfter); _hfFrameAfter.Clear(); }
                    continue;
                }
                // marca excluída (revisão): o texto vai para o parágrafo seguinte, com as
                // propriedades dele (oráculo delmark); todo o texto excluído: some (numbering3, del-mark)
                if (pblk.Paragraph.Ppr?.MarkDeleted == true && join is null && bi < n - 1 && blocks[bi + 1] is ParagraphBlock)
                {
                    delRuns = (delRuns ?? new List<Run>()).Concat(pblk.Paragraph.Runs).ToList();
                    continue;
                }
                if (pblk.Paragraph.Ppr?.MarkDeleted == true && pblk.Paragraph.Runs.Count == 0 && join is null && delRuns is null) continue;
                var merged = delRuns is not null ? new Paragraph { Runs = delRuns.Concat(pblk.Paragraph.Runs).ToList(), Props = pblk.Paragraph.Props, Ppr = pblk.Paragraph.Ppr } : pblk.Paragraph;
                delRuns = null;
                var para = join is not null ? JoinHidden(join, merged, env) : merged;
                ParaEnv penv = envNoBreaks;
                if (join is not null) { penv = envNoBreaks.Clone(); penv.Numbering = false; }
                var p = Para.PrepareParagraph(_ctx, para, penv);
                if (join is not null) p.Marker = join.Marker;
                join = null;
                // marca oculta (fora o último bloco): sem conteúdo visível não ocupa nada;
                // com conteúdo, junta-se ao parágrafo seguinte (oráculo hidden)
                if (p.MarkStyle.Hidden && bi < n - 1)
                {
                    if (p.Glyphs.Count == 0) continue;
                    if (blocks[bi + 1] is ParagraphBlock) { join = new HiddenJoin(para, p.Marker); continue; }
                }
                if (p.KeepNext) keepNext = true;
                bool firstInCell = bi == 0;
                bool lastInCell = bi == n - 1;
                double before = p.BeforeAuto ? (firstInCell ? 0 : 280) : p.SpaceBefore;
                double prevAfter = prev is not null ? prev.After : 0;
                // "depois" suprimido pelo contextual do anterior: o "antes" só vale o excedente (oráculo ctxmark)
                double? ctxAfter = null;
                if (prev is not null && prev.StyleId == p.StyleId)
                {
                    if (prev.Contextual) { ctxAfter = prevAfter; prevAfter = 0; }
                    if (p.Contextual) before = 0;
                }
                // espaçamento automático entre itens da mesma lista: zero (oráculo autosplist)
                string? list = ListOf(p);
                if (list is not null && prevList == list) { if (p.BeforeAuto) before = 0; if (prev?.AfterAuto == true) prevAfter = 0; }
                prevList = list;
                // 1º parágrafo da célula: o vizinho anterior é o parágrafo antes da tabela, o
                // último da célula anterior ou a marca de fim de linha (oráculo autosp2)
                if (bi == 0 && nb?.Prev is not null && p.Contextual && nb.Prev.StyleId == p.StyleId) before = 0;
                // o "depois" efetivo do anterior (contextual zera)
                if (lastPara is not null) lastPara.After = prevAfter;
                double gapS = ctxAfter is { } cxa ? Math.Max(0, Collapse(cxa, before) - cxa) : Collapse(prevAfter, before);
                // topo do parágrafo para objetos relativos a ele (oráculo anchorbefore)
                double paraRefS = y + Math.Min(prevAfter, gapS);
                y += gapS;
                double top = y;
                var br = new LineBreaker(_ctx, p);
                var frame0 = new LineFrame(p.IndLeft, width - p.IndRight);
                // cabeçalho/rodapé: os flutuantes do parágrafo são posicionados ANTES das
                // linhas e o texto (inclusive o do próprio parágrafo) os contorna — oráculo hffloat
                bool hfWrap = ps is not null && HfRefRe.IsMatch(reference);
                if (hfWrap) PlaceFloats(p, ps!, x, width, yOrigin + top, items, yOrigin, yOrigin + paraRefS);
                double boxTop = y;
                int boxAt = items.Count;
                y += BorderTopExtent(p, prev);
                int l0 = lines.Count;
                do
                {
                    var frame = frame0;
                    // contorno: flutuantes da página (cabeçalho/rodapé) ou da própria célula
                    PageState? wPs = hfWrap ? ps! : cellFloats.Count > 0 ? cellPs : null;
                    double wY0 = hfWrap ? yOrigin : 0;
                    if (wPs is not null)
                    {
                        double lhm = MarkLineH(p);
                        frame = WrapFrame(frame0, x, wY0 + y, lhm, wPs);
                        for (int k = 0; k < 8 && frame.SkipTo is { } st && st - wY0 > y; k++)
                        {
                            y = frame.SkipTo!.Value - wY0;
                            frame = WrapFrame(frame0, x, wY0 + y, lhm, wPs);
                        }
                    }
                    var mark = br.Mark();
                    var seg = PickSeg(br, frame);
                    var line = br.Next(seg.F);
                    // linha mais alta que a estimativa (imagem em linha): o contorno vale pela
                    // altura real — desce ou estreita (oráculo tallwrap)
                    double textH = Math.Min(line.Height, line.Baseline + line.Desc);
                    if (wPs is not null && wPs.Floats.Count > 0 && textH > MarkLineH(p) + 1)
                    {
                        var f2 = WrapFrame(frame0, x, wY0 + y, textH, wPs);
                        if (f2.SkipTo is { } sk && sk - wY0 > y)
                        {
                            y = sk - wY0;
                            frame = WrapFrame(frame0, x, wY0 + y, MarkLineH(p), wPs);
                            br.Reset(mark); seg = PickSeg(br, frame); line = br.Next(seg.F);
                        }
                        else if (Narrower(f2, frame))
                        {
                            frame = f2;
                            br.Reset(mark); seg = PickSeg(br, frame); line = br.Next(seg.F);
                        }
                    }
                    double lh = 0;
                    void Put(Line l)
                    {
                        Paint.PaintLine(_ctx, items, l, x, y);
                        PaintInlineDrawings(items, l, x, y, ps);
                        lines.Add(LineRecord($"{reference}/b{bi}", p, l, x, y));
                        lh = Math.Max(lh, l.Height);
                    }
                    Put(line);
                    MoreSegs(br, frame, seg.K, line, Put);
                    y += lh;
                } while (!br.Done());
                if (_hfFrameAfter.Count > 0) { items.AddRange(_hfFrameAfter); _hfFrameAfter.Clear(); }
                bool groupedNext = GroupsWithNext(p, bi + 1 < n ? blocks[bi + 1] : null, env);
                y += BorderBottomExtent(p, groupedNext);
                PaintBox(items, p, x, width, boxTop, y, prev, boxAt, groupedNext);
                // floats ancorados no parágrafo (fora do cabeçalho/rodapé: depois das linhas)
                if (ps is not null && !hfWrap) PlaceFloats(p, ps, x + _staticDx, width, yOrigin + top, items, yOrigin, yOrigin + paraRefS);
                double after = p.AfterAuto ? (lastInCell && !hfFlow ? 0 : 280) : p.SpaceAfter;
                // último da célula: o vizinho seguinte é o 1º da próxima célula ou a marca de fim de linha
                if (lastInCell && nb?.Next is not null && p.Contextual && nb.Next.StyleId == p.StyleId) after = 0;
                // linha de tabela partida entre páginas: viúvas/órfãs (só modo 15) e o espaço
                // depois (efetivo) que tem de caber com a última linha (oráculo rowwidow)
                lastPara = new ParaSplitInfo
                {
                    Lines = lines.Count - l0, After = after,
                    Widow = _ctx.Fmt.Settings.CompatibilityMode >= 15 && (p.WidowControl || p.Ppr.WidowControl is null),
                };
                paras[$"{reference}/b{bi}"] = lastPara;
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
            else if (b is TableBlock ctb && ctb.TblPr?.TblpPr is { } cfp && cfp.TblpYSpec != "inline" && !hfFlow && _inCell)
            {
                // tabela flutuante aninhada numa célula (oráculo cellftbl): fora do fluxo, a
                // partir do topo do parágrafo âncora (o seguinte); "margem"/texto = área de
                // texto da célula, "página" = a célula (borda); o texto seguinte a contorna
                // o "depois" do parágrafo anterior segue a regra de antes de tabela (contextual
                // com o 1º parágrafo da tabela: some — corpus t43)
                if (prev is not null && DropsAfterBeforeTable(prev, ctb))
                {
                    prev = prev.ShallowClone();
                    prev.After = 0;
                    if (lastPara is not null) lastPara.After = 0;
                }
                var t0 = _ctx.Pure(() => TableEngine.LayoutTable(_ctx, ctb, 0, width, (cell, cx, cw, cenv, cref) => LayoutCell(cell, cx, cw, cenv, cref, ps), $"{reference}/b{bi}"));
                double H = t0.Rows.Aggregate(0.0, (a, r) => a + r.Height);
                double top = y + (prev is not null ? prev.After : 0) + (Js.Truthy(cfp.TblpYSpec) ? 0 : cfp.TblpY ?? 0);
                double aL = cfp.HorzAnchor == "page" ? x - 103 : x, aR = cfp.HorzAnchor == "page" ? x + width + 103 : x + width;
                string? xs = cfp.TblpXSpec;
                double refX = xs == "center" ? aL + (aR - aL - t0.Width) / 2 : xs is "right" or "outside" ? aR - t0.Width : aL + (Js.Truthy(xs) ? 0 : cfp.TblpX ?? 0);
                var t = TableEngine.LayoutTable(_ctx, ctb, refX - t0.X, width, (cell, cx, cw, cenv, cref) => LayoutCell(cell, cx, cw, cenv, cref, ps), $"{reference}/b{bi}");
                double ry = top;
                foreach (var row in t.Rows)
                {
                    foreach (var it in row.Items) floatItems.Add(TableEngine.ShiftItem(it, ry));
                    foreach (var it in row.BorderItems) floatItems.Add(TableEngine.ShiftItem(it, ry));
                    foreach (var l in row.Lines)
                    {
                        var nl = l.ShallowClone();
                        nl.Y = l.Y + ry;
                        nl.Baseline = l.Baseline + ry;
                        floatLines.Add(nl);
                    }
                    ry += row.Height;
                }
                cellFloats.Add(new FloatBox
                {
                    X = t.X, Y = top, W = t.Width, H = H, Wrap = "square", Side = "bothSides",
                    DistL = cfp.LeftFromText ?? 0, DistR = cfp.RightFromText ?? 0, DistT = cfp.TopFromText ?? 0, DistB = cfp.BottomFromText ?? 0,
                });
                floatBottom = Math.Max(floatBottom, top + H);
            }
            else if (b is TableBlock ftb && ftb.TblPr?.TblpPr is { } ffp && ffp.TblpYSpec != "inline" && hfFlow)
            {
                // tabela flutuante no cabeçalho/rodapé: posição absoluta na página, fora da
                // altura do cabeçalho/rodapé (também na medição sem página); no modo 15 o texto
                // seguinte (do cabeçalho e do corpo) a contorna (oráculo hftable)
                if (ps is not null)
                {
                    var t = TableEngine.LayoutTable(_ctx, ftb, 0, width, (cell, cx, cw, cenv, cref) => LayoutCell(cell, cx, cw, cenv, cref, ps), $"{reference}/b{bi}");
                    // pintada depois do texto do cabeçalho/rodapé (ordem do Word)
                    var fItems = new List<PageItem>();
                    PlaceFloatingTable(t, ffp, ps, yOrigin + y, x, width, fItems, 0, _ctx.Fmt.Settings.CompatibilityMode >= 15);
                    ps.HfFront.Add(new ZObj { Z = -1, Seq = _zSeq++, Items = fItems });
                }
            }
            else
            {
                var tb = (TableBlock)b;
                y += prev is not null && !DropsAfterBeforeTable(prev, tb) ? prev.After : 0;
                if (lastPara is not null && prev is not null && DropsAfterBeforeTable(prev, tb)) lastPara.After = 0;
                lastPara = null;
                AssignCellNeighbors(tb, prev is not null ? new CtxNeighbor { StyleId = prev.StyleId } : bi == 0 ? nb?.Prev : null);
                // os parágrafos da tabela aninhada também seguem viúvas/órfãs e o espaço depois
                // quando a célula de fora parte entre páginas (oráculo nestwidow)
                var t = TableEngine.LayoutTable(_ctx, tb, x, width,
                    (cell, cx, cw, cenv, cref) =>
                    {
                        var cc = LayoutCell(cell, cx, cw, cenv, cref, ps);
                        if (cc.Paras is not null) foreach (var kv in cc.Paras) paras[kv.Key] = kv.Value;
                        return cc;
                    }, $"{reference}/b{bi}");
                int tblAt = items.Count;
                if (isHf && t.Rows.Count > 0)
                {
                    // tabela não contorna: se ela (inteira — não só a 1ª linha: oráculo latefloat)
                    // cruza um flutuante com quebra, desce para baixo dele
                    double h0 = t.Rows.Sum(r => r.Height);
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
                var mergeMoved = new HashSet<object>(ReferenceEqualityComparer.Instance);
                for (int mri = 0; mri < t.Rows.Count; mri++)
                {
                    // texto de mescla vertical na 1ª linha dela, na ordem das colunas (oráculo vmorder)
                    var row = TableEngine.DropMoved(TableEngine.MergeTextFirst(t.Rows, mri, t.Rows[mri], mergeMoved, _ => true), mergeMoved);
                    var ni = new List<PageItem>();
                    var nls = new List<LaidOutLine>();
                    foreach (var it in row.Items) { var s = TableEngine.ShiftItem(it, y); items.Add(s); ni.Add(s); }
                    foreach (var it in row.BorderItems) { var s = TableEngine.ShiftItem(it, y); items.Add(s); ni.Add(s); }
                    foreach (var l in row.Lines)
                    {
                        var nl = l.ShallowClone();
                        nl.Y = l.Y + y;
                        nl.Baseline = l.Baseline + y;
                        lines.Add(nl);
                        nls.Add(nl);
                    }
                    nest.Add(new NestRow { Top = y, Row = row, Items = ni, Lines = nls });
                    y += row.Height;
                }
                // moldura ancorada nesta tabela (cabeçalho/rodapé): o texto dela vai antes da 1ª
                // célula que começa depois dela — ordem do PDF do Word (oráculo hfframetbl)
                if (_hfFrameTbl.Count > 0)
                {
                    double fx = _hfFrameTbl.Aggregate(double.PositiveInfinity, (mn, it) => Math.Min(mn, it is GlyphRunItem gr && gr.Glyphs.Count > 0 ? gr.Glyphs[0].X : double.PositiveInfinity));
                    int at = items.Count;
                    for (int k = tblAt; k < items.Count; k++)
                    {
                        if (items[k] is GlyphRunItem gk && gk.Glyphs.Count > 0 && gk.Glyphs[0].X >= fx - 10) { at = k; break; }
                    }
                    items.InsertRange(at, _hfFrameTbl);
                    _hfFrameTbl.Clear();
                }
                prev = RowEndPrev();
                prevList = null;
            }
        }
        // espaço depois do último parágrafo conta na altura (célula/HF)
        if (prev is not null) y += prev.After;
        items.AddRange(floatItems);
        lines.AddRange(floatLines);
        return new CellContent { Items = items, Lines = lines, Height = Math.Max(y, floatBottom), KeepNext = keepNext, Paras = paras.Count > 0 ? paras : null, Nest = nest.Count > 0 ? nest : null };
    }

    /// <summary>molduras do cabeçalho/rodapé à direita do início da linha: entram depois das linhas do âncora</summary>
    private readonly List<PageItem> _hfFrameAfter = new();
    /// <summary>molduras do cabeçalho/rodapé ancoradas na tabela seguinte (entram na 1ª linha dela)</summary>
    private readonly List<PageItem> _hfFrameTbl = new();
    /// <summary>conteúdo de caixa de texto: x da caixa na página (flutuantes dentro dela)</summary>
    private double _staticDx;

    /// <summary>Lista (abstractNum) do parágrafo numerado/com marcador.</summary>
    private string? ListOf(PreparedPara p)
    {
        var id = p.Ppr.NumPr?.NumId;
        return id is { } v && v != 0 && !double.IsNaN(v) ? _ctx.Numbering.ListKey(v) : null;
    }

    /// <summary>diagramando o conteúdo de uma célula (flutuantes ficam relativos à célula)</summary>
    private bool _inCell;

    private CellContent LayoutCell(TableCell cell, double x, double width, CellEnv env, string reference, PageState? ps = null)
    {
        bool prevInCell = _inCell;
        _inCell = true;
        try
        {
            return LayoutCellIn(cell, x, width, env, reference, ps);
        }
        finally
        {
            _inCell = prevInCell;
        }
    }

    private CellContent LayoutCellIn(TableCell cell, double x, double width, CellEnv env, string reference, PageState? ps = null)
    {
        var blocks = cell.Blocks ?? cell.Paragraphs.Select(p => (Block)new ParagraphBlock { Paragraph = p }).ToList();
        var penv = new ParaEnv { TablePPr = env.TablePPr, TableRPr = env.TableRPr, DarkBackground = env.DarkBackground };
        if (ps is not null) penv.Field = FieldValue(ps);
        _cellNb.TryGetValue(cell, out var nb);
        var c = LayoutStatic(blocks, x, width, penv, reference, ps, 0, nb);
        // hideMark: a marca da célula vazia não conta na altura da linha (vale a
        // altura mínima da linha) — oráculo hidden
        if (cell.TcPr?.HideMark == true && blocks.All(b => b is ParagraphBlock pb && !Para.ParaVisibility(_ctx, pb.Paragraph, penv).Visible))
            return new CellContent { Items = c.Items, Lines = c.Lines, Height = 0, KeepNext = c.KeepNext, Paras = c.Paras };
        // ... e com conteúdo: o último parágrafo VAZIO (o da marca) não conta na altura
        // nem no alinhamento vertical (oráculo hidemark)
        if (cell.TcPr?.HideMark == true && blocks.Count > 1 && blocks[^1] is ParagraphBlock lastB && !Para.ParaVisibility(_ctx, lastB.Paragraph, penv).Visible)
        {
            var rest = blocks.Take(blocks.Count - 1).ToList();
            double h = _ctx.Pure(() => LayoutStatic(rest, x, width, penv, reference, ps, 0, nb)).Height;
            return new CellContent { Items = c.Items, Lines = c.Lines, Height = h, KeepNext = c.KeepNext, Paras = c.Paras };
        }
        // parágrafo final vazio logo depois de uma tabela aninhada (a marca de fim de
        // célula): sem altura, com ou sem hideMark (oráculo tblw)
        if (blocks.Count > 1 && blocks[^1] is ParagraphBlock lastP && blocks[^2] is TableBlock && !Para.ParaVisibility(_ctx, lastP.Paragraph, penv).Visible)
        {
            var rest = blocks.Take(blocks.Count - 1).ToList();
            double h = _ctx.Pure(() => LayoutStatic(rest, x, width, penv, reference, ps, 0, nb)).Height;
            return new CellContent { Items = c.Items, Lines = c.Lines, Height = h, KeepNext = c.KeepNext, Paras = c.Paras };
        }
        // o "depois" do último parágrafo da célula também ocupa (Word)
        return c;
    }

    /// <summary>parágrafo de marca oculta (com texto visível) à espera do seguinte</summary>
    private sealed record HiddenJoin(Paragraph Para, ParaMarker? Marker);

    /// <summary>
    /// Parágrafo de marca oculta + o seguinte: um parágrafo só, com as propriedades
    /// (recuos, alinhamento…) do 1º e a marca do seguinte; o número que aparece é o
    /// do 1º, mas o do seguinte também é consumido (oráculo numbering3, hidmark-*).
    /// </summary>
    private Paragraph JoinHidden(HiddenJoin join, Paragraph next, ParaEnv env)
    {
        var n = Para.ResolvePPr(_ctx, next, env).Ppr.NumPr;
        if (n?.NumId is { } nid && nid != 0 && !double.IsNaN(nid) && env.Numbering != false) _ctx.Numbering.Next(nid, n.Ilvl ?? 0);
        var ppr = join.Para.Ppr?.Clone() ?? new PPr();
        ppr.RPr = next.Ppr?.RPr;
        return new Paragraph { Runs = join.Para.Runs.Concat(next.Runs).ToList(), Props = join.Para.Props, Ppr = ppr };
    }

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
        // com sombra a espessura conta duas vezes (oráculo pbdrshadow)
        return (top.Space ?? 0) * 20 + Paint.BorderWidth(top) * (top.Shadow == true ? 2 : 1);
    }

    private static double BorderBottomExtent(PreparedPara p, bool groupedNext = false)
    {
        var bottom = p.Ppr.PBdr?.Bottom;
        if (groupedNext || bottom is null || bottom.Val is "none" or "nil") return 0;
        return (bottom.Space ?? 0) * 20 + Paint.BorderWidth(bottom) * (bottom.Shadow == true ? 2 : 1);
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

    /// <summary>{ ...it, asPath: true }</summary>
    private static GlyphRunItem AsPathCopy(GlyphRunItem g)
    {
        var n = (GlyphRunItem)g.ShallowClone();
        n.AsPath = true;
        return n;
    }

    /// <summary>
    /// O Word não grava no PDF o texto que fica INTEIRO fora da página: some a
    /// LINHA cuja caixa (topo/base da linha; da borda esquerda do quadro até o
    /// último glifo) não cruza a página — a linha que só encosta na borda sai
    /// inteira, com todos os runs, inclusive os de fora (oráculo hidetext: off-*,
    /// ftr-far, straddle-*, cull-bottom, right-start-out). Considera as rotações (xform).
    /// </summary>
    private static List<PageItem> CullOffPage(List<PageItem> items, double pageW, double pageH)
    {
        var stack = new List<double[]?>();
        double[]? m = null;
        // cada run diz se cruza a página; a linha fica se ALGUM dos seus runs cruza
        var outside = new HashSet<PageItem>();
        var lineIn = new HashSet<int>();
        foreach (var it in items)
        {
            if (it is XformItem xf)
            {
                if (xf.Op == "push" && xf.M is { } n)
                {
                    stack.Add(m);
                    m = m is not null
                        ? new[] { m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
                            m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5] }
                        : n;
                }
                else if (xf.Op == "pop")
                {
                    if (stack.Count > 0) { m = stack[^1]; stack.RemoveAt(stack.Count - 1); }
                    else m = null;
                }
                continue;
            }
            if (it is not GlyphRunItem g || g.Glyphs.Count == 0) continue;
            double em = g.SizePt * 20;
            double asc = g.LineBox?.Asc ?? em, desc = g.LineBox?.Desc ?? em * 0.3, lead = g.LineBox?.Lead ?? 0;
            double x0 = double.PositiveInfinity, x1 = double.NegativeInfinity;
            foreach (var p in g.Glyphs) { x0 = Math.Min(x0, p.X); x1 = Math.Max(x1, p.X + em); }
            // borda esquerda do quadro (o texto pode transbordar para qualquer lado)
            double frameL = g.Glyphs[0].X - lead;
            x0 = Math.Min(x0, frameL); x1 = Math.Max(x1, frameL);
            double y0 = g.Y - asc, y1 = g.Y + desc;
            double bx0 = x0, bx1 = x1, by0 = y0, by1 = y1;
            if (m is not null)
            {
                bx0 = double.PositiveInfinity; bx1 = double.NegativeInfinity;
                by0 = double.PositiveInfinity; by1 = double.NegativeInfinity;
                foreach (var (px, py) in new[] { (x0, y0), (x1, y0), (x0, y1), (x1, y1) })
                {
                    double tx = m[0] * px + m[2] * py + m[4], ty = m[1] * px + m[3] * py + m[5];
                    bx0 = Math.Min(bx0, tx); bx1 = Math.Max(bx1, tx);
                    by0 = Math.Min(by0, ty); by1 = Math.Max(by1, ty);
                }
            }
            if (bx1 <= 0 || bx0 >= pageW || by1 <= 0 || by0 >= pageH) outside.Add(it);
            else if (g.LineBox is not null) lineIn.Add(g.LineBox.Line);
        }
        if (outside.Count == 0) return items;
        return items.Where(it => !outside.Contains(it) || (it is GlyphRunItem g && g.LineBox is not null && lineIn.Contains(g.LineBox.Line))).ToList();
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
        /// <summary>topo do parágrafo para objetos relativos a ele (oráculo anchorbefore)</summary>
        public double? Ref;
    }

    /// <summary>parágrafo de marca oculta que se junta ao parágrafo seguinte</summary>
    private HiddenJoin? _pendingJoin;
    /// <summary>runs de parágrafos de marca excluída (revisão) que vão para o início do seguinte</summary>
    private List<Run>? _pendingDel;

    /// <summary>o bloco anterior é uma tabela flutuante ancorada no texto (o parágrafo âncora
    /// empurrado para baixo dela tem o "antes" de novo — oráculo ftable2)</summary>
    private bool _floatTableGap;
    /// <summary>âncora levada para a página da continuação da tabela flutuante: abaixo dela, o "antes" inteiro</summary>
    private bool _carryAnchorGap;

    private void PlaceParagraph(Paragraph para0, string reference, int blockIdx, SectGeom g)
    {
        // moldura: fora do fluxo (a caixa vai com o parágrafo âncora; sem âncora, fica aqui)
        if (Frames.IsSkipped(para0))
        {
            var carry = Frames.CarryOf(para0);
            if (carry is not null) { var cfr = ColFrame(); PlaceFloat(carry, _cur, cfr.X, cfr.W, _y, _cur.Body, 0); }
            return;
        }
        // marca excluída (revisão): o texto passa para o parágrafo seguinte, que fica com
        // as propriedades DELE (a marca que sobra) — estilo, recuos, numeração; o número
        // do excluído não conta (oráculo delmark). Todo o texto excluído: some (numbering3,
        // del-mark). O último da seção (quebra) fica como está.
        if (para0.Ppr?.MarkDeleted == true && _pendingJoin is null && blockIdx < g.Blocks.End && blockIdx + 1 < _full.Blocks.Count && _full.Blocks[blockIdx + 1] is ParagraphBlock)
        {
            _pendingDel = (_pendingDel ?? new List<Run>()).Concat(para0.Runs).ToList();
            return;
        }
        if (para0.Ppr?.MarkDeleted == true && para0.Runs.Count == 0 && _pendingJoin is null && _pendingDel is null) return;
        var join = _pendingJoin;
        _pendingJoin = null;
        var env = new ParaEnv { Field = FieldValue(_cur) };
        var merged = _pendingDel is not null ? new Paragraph { Runs = _pendingDel.Concat(para0.Runs).ToList(), Props = para0.Props, Ppr = para0.Ppr } : para0;
        _pendingDel = null;
        var para = join is not null ? JoinHidden(join, merged, env) : merged;
        ParaEnv penv = env;
        if (join is not null) { penv = env.Clone(); penv.Numbering = false; }
        var p = Para.PrepareParagraph(_ctx, para, penv);
        if (join is not null) p.Marker = join.Marker;
        // texto oculto (oráculo hidden): parágrafo de marca oculta sem conteúdo visível
        // não ocupa nada (nem linha nem espaçamento); com conteúdo visível, junta-se ao
        // seguinte, com as propriedades do 1º (JoinHidden). O último da seção (quebra) fica como está.
        if (p.MarkStyle.Hidden && blockIdx < g.Blocks.End)
        {
            if (p.Glyphs.Count == 0) return;
            if (blockIdx + 1 < _full.Blocks.Count && _full.Blocks[blockIdx + 1] is ParagraphBlock) { _pendingJoin = new HiddenJoin(para, p.Marker); return; }
        }
        // parágrafo VAZIO que só carrega a quebra para uma seção CONTÍNUA: não ocupa
        // altura nem tem espaçamento próprio, mas separa os vizinhos — o "depois" do
        // anterior e o "antes" do seguinte se SOMAM (oráculo colbreak, cb-emptysect-*).
        // Logo depois de tabela ele ocupa a linha no modo 15 (cb-emptysect-aftertbl); nos
        // modos 11/14 também some (…-c11/-c14)
        var nextGeom = g.Index + 1 < _geoms.Count ? _geoms[g.Index + 1] : null;
        if (blockIdx == g.Blocks.End && p.Glyphs.Count == 0 && nextGeom?.Type == "continuous"
            && ((blockIdx - 1 >= 0 && blockIdx - 1 < _full.Blocks.Count && _full.Blocks[blockIdx - 1] is ParagraphBlock) || _ctx.Fmt.Settings.CompatibilityMode < 15))
        {
            // o próprio espaçamento dele se desconta dos vizinhos: colapso(depois anterior,
            // antes dele) − antes dele; e no seguinte colapso(depois dele, antes) − depois
            // dele (cb-emptysect-spacing, cb-par-sp-empty-text, cb-seq-*)
            double sb = p.BeforeAuto ? 280 : p.SpaceBefore, sa = p.AfterAuto ? 280 : p.SpaceAfter;
            if (_prev is not null && !_atTop) _y += Math.Max(0, Collapse(_prev.After, sb) - sb);
            _prev = new PrevPara { After = 0, AfterAuto = false, Contextual = false };
            // seção seguinte em várias colunas: o 1º parágrafo da coluna leva o "antes"
            // inteiro (corpus t70)
            _sectGapAfter = nextGeom.Cols.Count > 1 ? null : sa;
            return;
        }
        // a marca FINAL do documento oculta e sem conteúdo visível também não ocupa
        // nada — não cria página nova (oráculo hidden, hid-form-end)
        if (p.MarkStyle.Hidden && p.Glyphs.Count == 0 && blockIdx == _full.Blocks.Count - 1 && !_atTop) return;
        // parágrafo que COMEÇA com quebra de página (oráculo tocref-pbstart, modos 11/14/15):
        // o Word leva o parágrafo inteiro — número da lista, indicadores (PAGEREF) e o
        // espaço antes (como depois de quebra de seção) — para a página seguinte; a
        // quebra não deixa linha na de cima
        if (p.Glyphs.Count > 1 && p.Glyphs[0].Kind == GlyphKind.Pb)
        {
            double lastAfter = _prev is not null ? _prev.After : 0;
            p.Glyphs = p.Glyphs.GetRange(1, p.Glyphs.Count - 1);
            NewPage(_cur.Geom);
            _topGapPrevAfter = lastAfter;
        }
        // quebra de página antes (espaço antes no topo: suprimido no modo 15, mantido no ≤ 14 — tocref-spbefore)
        if (p.PageBreakBefore && !_atTop)
        {
            double lastAfter = _prev is not null ? _prev.After : 0;
            NewPage(_cur.Geom);
            if (_ctx.Fmt.Settings.CompatibilityMode < 15) _topGapPrevAfter = lastAfter;
        }
        // keepNext / keepLines: decide antes de colocar a 1ª linha
        var frameBase = ColFrame();
        double Avail() => _cur.BodyBottom - _y;
        double before = p.BeforeAuto ? (_firstInDoc ? 0 : 280) : p.SpaceBefore;
        double prevAfter = _prev is not null ? _prev.After : 0;
        // "depois" do anterior que o contextual DELE suprimiu: o "antes" deste só vale o que
        // passa dele — colapso(depois, antes) − depois (oráculo ctxmark)
        double? ctxAfter = null;
        if (_prev is not null && _prev.StyleId == p.StyleId)
        {
            if (_prev.Contextual) { ctxAfter = prevAfter; prevAfter = 0; }
            if (p.Contextual) before = 0;
        }
        // espaçamento automático ("HTML") entre itens da mesma lista (mesmo abstractNum,
        // numerada ou com marcador): zero; na borda da lista vale (oráculo autosplist)
        string? list = ListOf(p);
        if (list is not null && _prev?.List == list) { if (p.BeforeAuto) before = 0; if (_prev.AfterAuto) prevAfter = 0; }
        // topo de página: espaço antes suprimido, exceto no 1º parágrafo do documento
        // e depois de quebra de seção / quebra no início do parágrafo, em que vale
        // colapso(depois anterior, antes) − depois anterior (oráculo tocref-sectgap)
        double gap = Collapse(prevAfter, before);
        if (ctxAfter is { } cxa) gap = Math.Max(0, Collapse(cxa, before) - cxa);
        if (_sectGapAfter is { } sga) { gap = Math.Max(0, Collapse(sga, before) - sga); _sectGapAfter = null; }
        double? keepAfter = _topGapPrevAfter;
        _topGapPrevAfter = null;
        if (_atTop && !_firstInDoc) gap = keepAfter is { } ka ? Math.Max(0, Collapse(ka, before) - ka) : 0;
        // keepNext sem keepLines (modo 15): a partir desta linha o parágrafo desce com o seguinte
        int tailAt = -1;
        if (p.KeepLines || p.KeepNext)
        {
            var ls = ParagraphLines(p, frameBase.W);
            var lastL = ls[^1];
            double fullPH = ls.Aggregate(BorderTopExtent(p, null) + BorderBottomExtent(p), (a, l) => a + l.Height);
            // a linha que fecha o bloco só precisa caber até o texto: a entrelinha extra
            // (múltipla > 1) abaixo dele pode passar da margem, como na colocação (oráculo keepfit)
            double closedH = fullPH - lastL.Height + ClosingFit(p, lastL);
            double need = gap + (p.KeepNext ? fullPH + NextBlockLead(blockIdx, g, frameBase.W) : closedH);
            double fullH = _cur.BodyBottom - _colTop;
            if (need > Avail() && need <= fullH && !_atTop)
            {
                // keepNext SEM keepLines (oráculo keepsplit): o parágrafo que não cabe inteiro
                // parte normalmente (a última linha já vai com o seguinte); se ele cabe e só o
                // início do seguinte não, no modo 15 descem só as últimas linhas (2 com
                // viúvas/órfãs, 1 sem; todas se sobrar uma só) — nos modos antigos, ele inteiro
                if (!p.KeepLines && gap + closedH > Avail())
                {
                    // parte normalmente
                }
                else if (!p.KeepLines && _ctx.Fmt.Settings.CompatibilityMode >= 15 && ls.Count > 1)
                {
                    bool widowOn = p.WidowControl || p.Ppr.WidowControl is null;
                    int m = widowOn ? (ls.Count - 2 >= 2 ? 2 : ls.Count) : 1;
                    if (m >= ls.Count) { BreakColumn(); gap = 0; } else tailAt = ls.Count - m;
                }
                else
                {
                    BreakColumn();
                    gap = 0;
                }
            }
        }
        double yPre = _y;
        double gapIn = !_atTop || _firstInDoc || keepAfter is not null ? gap : 0;
        _y += gapIn;
        // topo do parágrafo para objetos relativos a ele: o fim do "depois" do anterior
        double? paraRef = yPre + Math.Min(prevAfter, gapIn);
        double selfGap = gapIn - Math.Min(prevAfter, gapIn);
        // âncora de tabela flutuante: se ela a empurra para baixo, o espaço antes vale de novo lá (oráculo ftable2)
        double ftGap = _floatTableGap && !_atTop ? gap : _carryAnchorGap ? before : 0;
        _floatTableGap = false;
        _carryAnchorGap = false;
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
                PaintInlineDrawings(_cur.Body, f.Line, f.FrameX, f.Y, _cur);
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
        // linhas (visuais) já colocadas e a página onde o parágrafo começou (keepNext: tailAt)
        int lineNo = 0;
        var tailPs = _cur;
        // onde ficou a 1ª linha: os objetos ancorados no parágrafo vão para ESSA
        // página (não a da última linha — parágrafo com quebra de página no fim)
        var anchorAt = new AnchorAt { Ps = _cur, Top = _y, X = ColFrame().X, W = ColFrame().W, Ref = paraRef };
        var early = PlaceFloatsEarly(p, _cur, ColFrame().X, ColFrame().W, _y, null, paraRef);
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
                // (os outros objetos seguem medidos do topo antes do "antes" — oráculo liftref)
                early = PlaceFloatsEarly(p, _cur, ColFrame().X, ColFrame().W, _y, _cur.BodyBottom, paraRef);
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
        bool hangs = blockIdx == g.Blocks.End && g.Index < _full.Sections.Count - 1 && p.Glyphs.All(gl => gl.Kind == GlyphKind.Obj && gl.Adv == 0); // (só âncoras de flutuantes: vazio — corpus t20)
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
            double y0 = _y;
            var frame = FrameHere();
            // empurrado para baixo de flutuante: o "antes" vale de novo lá — o da âncora de
            // tabela flutuante inteiro; senão a parte do vão que fica DENTRO do parágrafo (a
            // que excede o "depois" do anterior: a caixa do parágrafo desce com ela — oráculos
            // ftable2 img-tb-*, ftaftdist fad-html-*)
            double pushGap = ftGap > 0 ? ftGap : selfGap;
            if (first && pushGap > 0 && _y > y0) { _y += pushGap; frame = FrameHere(); }
            var mark = br.Mark();
            var seg = PickSeg(br, frame);
            var line = br.Next(seg.F);
            // texto da linha mais alto que a estimativa (fonte da marca) cruza um flutuante que a
            // altura estimada não cruzava: desce para baixo dele (oráculo ftable2, ft2-formx-noempty-before;
            // a entrelinha extra abaixo do texto não conta)
            double textH = Math.Min(line.Height, line.Baseline + line.Desc);
            if (_cur.Floats.Count > 0 && textH > MarkLineH(p) + 1)
            {
                var tfr = ColFrame();
                var f2 = WrapFrame(new LineFrame(p.IndLeft, tfr.W - p.IndRight), tfr.X, _y, textH);
                if (f2.SkipTo is { } sk2 && sk2 > _y)
                {
                    _y = sk2 + (first ? selfGap : 0);
                    frame = FrameHere();
                    br.Reset(mark);
                    seg = PickSeg(br, frame);
                    line = br.Next(seg.F);
                }
                else if (Narrower(f2, frame))
                {
                    // cruza um flutuante que deixa espaço ao lado: a linha estreita (oráculo tallwrap)
                    frame = f2;
                    br.Reset(mark);
                    seg = PickSeg(br, frame);
                    line = br.Next(seg.F);
                }
            }
            // texto mais BAIXO que a marca: o salto para baixo do flutuante foi pela altura da
            // marca; se a linha real cabe acima dele, ela fica lá (oráculo liftref, lr-mark11)
            if (_cur.Floats.Count > 0 && _y > y0 + 0.5)
            {
                double textH2 = Math.Min(line.Height, line.Baseline + line.Desc);
                if (textH2 < MarkLineH(p) - 1)
                {
                    var fr0 = ColFrame();
                    var f0 = WrapFrame(new LineFrame(p.IndLeft, fr0.W - p.IndRight), fr0.X, y0, textH2);
                    if (f0.SkipTo is null && !Narrower(f0, frame))
                    {
                        double yb = _y;
                        _y = y0;
                        br.Reset(mark);
                        var seg0 = PickSeg(br, f0);
                        var line0 = br.Next(seg0.F);
                        if (Math.Min(line0.Height, line0.Baseline + line0.Desc) <= textH2 + 0.5) { frame = f0; seg = seg0; line = line0; }
                        else
                        {
                            _y = yb;
                            br.Reset(mark);
                            seg = PickSeg(br, frame);
                            line = br.Next(seg.F);
                        }
                    }
                }
            }
            // palavra que não cabe no vão ao lado de um flutuante: o Word não a parte por
            // caractere — a linha desce para baixo dele (oráculo gapind, gi-*-r0)
            if (_cur.Floats.Count > 0 && !line.Last && line.End > line.Start && line.End < p.Glyphs.Count)
            {
                var frw = ColFrame();
                bool narrowed = frame.Left > p.IndLeft + 0.5 || frame.Right < frw.W - p.IndRight - 0.5;
                var gw0 = p.Glyphs[line.End - 1];
                var gw1 = p.Glyphs[line.End];
                static bool IsWord(Glyph g) => g.Kind == GlyphKind.Char && !JsWsRe.IsMatch(g.Ch);
                if (narrowed && IsWord(gw0) && !gw0.BreakAfter && IsWord(gw1))
                {
                    double lineHw = Math.Max(MarkLineH(p), line.Height);
                    double below = double.PositiveInfinity;
                    foreach (var f in _cur.Floats)
                    {
                        if (f.Wrap != "square" && f.Wrap != "tight" && f.Wrap != "through") continue;
                        if (_y + lineHw <= f.Y - f.DistT + 0.5 || _y >= f.Y + f.H + f.DistB - 0.5) continue;
                        below = Math.Min(below, f.Y + f.H + f.DistB);
                    }
                    if (below < double.PositiveInfinity && below > _y)
                    {
                        _y = below;
                        frame = FrameHere();
                        br.Reset(mark);
                        seg = PickSeg(br, frame);
                        line = br.Next(seg.F);
                    }
                }
            }
            // modos < 15: a última linha do parágrafo só fica acima/ao lado de um flutuante se
            // a linha INTEIRA mais o "depois" ficarem fora dele; senão desce (oráculo ftafter)
            if (_cur.Floats.Count > 0 && line.Last && _ctx.Fmt.Settings.CompatibilityMode < 15)
            {
                double aft = p.AfterAuto ? 280 : p.SpaceAfter;
                var afr = ColFrame();
                LineFrame? f3 = aft > 0 ? WrapFrame(new LineFrame(p.IndLeft, afr.W - p.IndRight), afr.X, _y, line.Height + aft) : null;
                if (f3?.SkipTo is { } sk3 && sk3 > _y)
                {
                    _y = sk3 + (first ? selfGap : 0);
                    frame = FrameHere();
                    br.Reset(mark);
                    seg = PickSeg(br, frame);
                    line = br.Next(seg.F);
                }
            }
            var noteNeed = NoteNeed(p, line);
            bool pageChanged = false;
            // a entrelinha extra (múltipla > 1, posta abaixo do texto) pode passar da
            // margem inferior — medido no oráculo pagefit
            // linha só com a quebra de página e mais conteúdo depois dela no parágrafo: não
            // ocupa altura no teste — a quebra fica nesta página (oráculo pbfit)
            bool breakOnly = line.BreakAfter == "page" && !line.Last && line.Placed.All(pg => pg.G.Kind == GlyphKind.Pb);
            double fitH = breakOnly ? 0 : p.LineRule is "exact" or "atLeast" ? line.Height : Math.Min(line.Height, line.Baseline + line.Desc);
            // nota nova que não cabe inteira: o começo dela fica com a linha (oráculo fncont)
            NoteCut? noteCut = null;
            if (noteNeed.Extra > 0 && !_atTop && !hangs && _y + NoteLineFit(p, line) > _cur.BodyBottom - noteNeed.Extra + 0.05
                && _y + NoteLineFit(p, line) <= _cur.BodyBottom + 0.05) noteCut = NotePartial(noteNeed.Ids, _y + NoteLineFit(p, line));
            if (lineNo == tailAt && ReferenceEquals(_cur, tailPs) && frag.Count > 0 && !_atTop)
            {
                // keepNext: as últimas linhas descem com o início do seguinte (oráculo keepsplit)
                FlushFrag(false);
                fragHasFirst = false;
                BreakColumn();
                fragTop = _y;
                pageChanged = true;
            }
            // (sem folga: 0,21 tw além da margem e 0,12 tw além do topo do rodapé já descem — oráculo bodyfit)
            else if (noteCut is null && _y + (noteNeed.Extra > 0 ? NoteLineFit(p, line) : fitH) > _cur.BodyBottom - noteNeed.Extra + 0.05 && !_atTop && !hangs)
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
                if (nf.Left != frame.Left || nf.Right != frame.Right || nf.Segs is not null || frame.Segs is not null)
                {
                    br.Reset(mark);
                    frame = nf;
                    seg = PickSeg(br, nf);
                    line = br.Next(seg.F);
                    noteNeed = NoteNeed(p, line);
                }
            }
            if (noteNeed.Ids.Count > 0) ReserveNotes(noteNeed.Ids, pageChanged ? null : noteCut);
            frag.Add(new Frag { Line = line, Y = _y, FrameX = ColFrame().X });
            // os outros vãos da mesma linha (objeto no meio: texto dos dois lados)
            double lineH = line.Height;
            line = MoreSegs(br, frame, seg.K, line, l =>
            {
                var nn = NoteNeed(p, l);
                if (nn.Ids.Count > 0) ReserveNotes(nn.Ids);
                frag.Add(new Frag { Line = l, Y = _y, FrameX = ColFrame().X });
                lineH = Math.Max(lineH, l.Height);
            });
            _y += lineH;
            _atTop = false;
            first = false;
            lineNo++;
            // quebra de linha w:clear: a linha seguinte começa abaixo dos flutuantes com
            // contorno que alcançam esta altura (oráculo brclear)
            if (line.Clear)
            {
                for (int k = 0; k < 8; k++)
                {
                    double yy = _y;
                    var below = _cur.Floats.Where(f => f.Wrap != "none" && f.Y - f.DistT < yy && f.Y + f.H + f.DistB > yy).ToList();
                    if (below.Count == 0) break;
                    _y = below.Max(f => f.Y + f.H + f.DistB);
                }
            }
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
        PlaceFloats(p, anchorAt.Ps, anchorAt.X, anchorAt.W, anchorAt.Top, anchorAt.Ps.Body, 0, anchorAt.Ref);
        foreach (var r in earlyRuns) _prePlaced.Remove(r);
        // parágrafo só com quebra de página: o próximo começa no topo
        var lastGlyph = p.Glyphs.Count > 0 ? p.Glyphs[^1] : null;
        // (com splitPgBreakAndParaMark a marca já ocupou a 1ª linha da página — oráculo pbmark)
        bool splitPg = _ctx.Fmt.Settings.CompatibilityMode < 15 && _ctx.Fmt.Settings.Compat.TryGetValue("splitPgBreakAndParaMark", out var spb) && spb;
        if (lastGlyph?.Kind == GlyphKind.Pb && !splitPg) _atTop = true;
        _prev = new PrevPara
        {
            After = p.AfterAuto ? 280 : p.SpaceAfter,
            AfterAuto = p.AfterAuto,
            List = list,
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

    /// <summary>Notas de rodapé NOVAS referenciadas pelas linhas de texto de uma linha de tabela
    /// (cada linha diz o parágrafo de origem no ref: b3/r2/c0/b1…).</summary>
    private List<double> RowNoteIds(RowLayout row)
    {
        var ids = new List<double>();
        foreach (var l in row.Lines)
        {
            var para = ParaByRef(l.Ref);
            if (para is null) continue;
            double off = 0;
            foreach (var r in para.Runs)
            {
                double len = r.Text.Length;
                double? id = r.NoteRef?.Kind == "footnote" ? r.NoteRef.Id : null;
                if (id is { } v && off + Math.Max(len, 1) > l.Start && off < Math.Max(l.End, l.Start + 1)
                    && !ids.Contains(v) && !_cur.Notes.Any(n => n.Id.Equals(v))) ids.Add(v);
                off += len;
            }
        }
        return ids;
    }

    private double RowNoteExtra(RowLayout row)
    {
        var ids = RowNoteIds(row);
        if (ids.Count == 0) return 0;
        double extra = _cur.Notes.Count > 0 ? 0 : SeparatorHeight();
        foreach (var id in ids) extra += NoteContent(id).Height;
        return extra;
    }

    private static readonly Regex RefB = new(@"^b([0-9]+)\z", RegexOptions.CultureInvariant);
    private static readonly Regex RefR = new(@"^r([0-9]+)\z", RegexOptions.CultureInvariant);
    private static readonly Regex RefC = new(@"^c([0-9]+)\z", RegexOptions.CultureInvariant);

    /// <summary>Parágrafo do corpo pelo caminho do ref ("b3/r2/c0/b1").</summary>
    private Paragraph? ParaByRef(string reference)
    {
        var seg = reference.Split('/');
        var m = RefB.Match(seg[0]);
        if (!m.Success) return null;
        int b0 = (int)Js.ParseInt(m.Groups[1].Value);
        Block? block = b0 >= 0 && b0 < _full.Blocks.Count ? _full.Blocks[b0] : null;
        for (int i = 1; i + 2 < seg.Length + 1 && block is not null; i += 3)
        {
            if (block is not TableBlock tb) return null;
            var ri = RefR.Match(i < seg.Length ? seg[i] : "");
            var ci = RefC.Match(i + 1 < seg.Length ? seg[i + 1] : "");
            var bi = RefB.Match(i + 2 < seg.Length ? seg[i + 2] : "");
            if (!ri.Success || !ci.Success || !bi.Success) return null;
            int rIdx = (int)Js.ParseInt(ri.Groups[1].Value), cIdx = (int)Js.ParseInt(ci.Groups[1].Value), bIdx = (int)Js.ParseInt(bi.Groups[1].Value);
            // "cN" é a coluna da GRADE (table: gridBefore + gridSpans), não o índice da célula
            // — nota em célula depois de uma mesclada na horizontal (oráculo cellnote, corpus t34)
            var nrow = rIdx < tb.Rows.Count ? tb.Rows[rIdx] : null;
            double gcol = nrow?.TrPr?.GridBefore ?? 0;
            TableCell? cell = null;
            foreach (var c in nrow?.Cells ?? new List<TableCell>())
            {
                if (gcol == cIdx) { cell = c; break; }
                gcol += Math.Max(1, c.TcPr?.GridSpan ?? c.GridSpan);
            }
            if (cell is null) return null;
            var blocks = CellBlocks(cell);
            block = bIdx < blocks.Count ? blocks[bIdx] : null;
        }
        return block is ParagraphBlock pb ? pb.Paragraph : null;
    }

    /// <summary>Altura do separador (1 linha do estilo Normal).</summary>
    private double SeparatorHeight()
    {
        // linha SIMPLES da fonte do Normal, sem espaçamento (o pPr do separador e a
        // entrelinha do Normal não contam — oráculo fnsep)
        var ppr = new PPr { Spacing = new SpacingSpec { Before = 0, After = 0, Line = 240, LineRule = "auto" } };
        var p = Para.PrepareParagraph(_ctx, new Paragraph { Runs = new List<Run>(), Props = DocumentReader.ParaPropsFromPPr(ppr), Ppr = ppr }, new ParaEnv());
        return new LineBreaker(_ctx, p).Next(new LineFrame(0, 10000)).Height;
    }

    /// <summary>Altura com que a linha que traz uma nota NOVA precisa caber acima das notas: a
    /// linha inteira (com a entrelinha extra) e, na última do parágrafo, o "depois"
    /// dele (oráculo fnsep, varreduras fsep-top* / fsep-a0-*)</summary>
    private static double NoteLineFit(PreparedPara p, Line line) =>
        line.Height + (line.Last ? (p.AfterAuto ? 280 : p.SpaceAfter) : 0);

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

    private void ReserveNotes(List<double> ids, NoteCut? cut = null)
    {
        var ps = _cur;
        foreach (var id in ids)
        {
            if (ps.Notes.Any(n => n.Id.Equals(id))) continue;
            if (ps.Notes.Count == 0) ps.NoteArea += SeparatorHeight();
            var content = cut is not null && cut.Id.Equals(id) ? cut.First : NoteContent(id);
            ps.Notes.Add((id, content));
            ps.NoteArea += content.Height;
            if (cut is not null && cut.Id.Equals(id)) _noteCarry.Add((id, cut.Rest));
        }
        ps.BodyBottom = ps.BodyBottomBase - ps.NoteArea;
    }

    /// <summary>notas que continuam na página seguinte (o resto de uma nota partida)</summary>
    private List<(double Id, CellContent Content)> _noteCarry = new();
    /// <summary>nota partida da linha de tabela que vai ser emitida</summary>
    private NoteCut? _rowNoteCut;

    /// <summary>Nota partida entre páginas: o começo (nesta) e o resto (na seguinte).</summary>
    private sealed record NoteCut(double Id, CellContent First, CellContent Rest);

    /// <summary>
    /// Nota NOVA que não cabe inteira com a linha da referência (que termina em <paramref name="bottom"/>):
    /// o começo dela fica nesta página — o que couber, com viúvas/órfãs da própria nota — e o
    /// resto continua no pé da seguinte, antes das notas de lá (oráculo fncont). Só a última
    /// das notas da linha parte; sem ao menos o começo permitido, nulo (a linha desce).
    /// </summary>
    private NoteCut? NotePartial(List<double> ids, double bottom)
    {
        if (ids.Count == 0) return null;
        var ps = _cur;
        double h = ps.Notes.Count > 0 ? 0 : SeparatorHeight();
        foreach (var nid in ids.Take(ids.Count - 1)) h += NoteContent(nid).Height;
        double id = ids[^1];
        double avail = ps.BodyBottom - bottom - h;
        if (avail <= 0) return null;
        var sp = TableEngine.SplitContent(NoteContent(id), avail);
        return sp is { } spv && spv.A.Lines.Count > 0 && spv.B.Lines.Count > 0 ? new NoteCut(id, spv.A, spv.B) : null;
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

    /// <summary>Linhas de um parágrafo (sem quebra de página), p/ keepLines/keepNext.</summary>
    private List<Line> ParagraphLines(PreparedPara p, double width)
    {
        var br = new LineBreaker(_ctx, p, GridFor(p));
        var ls = new List<Line>();
        do ls.Add(br.Next(new LineFrame(p.IndLeft, width - p.IndRight))); while (!br.Done());
        return ls;
    }

    /// <summary>Altura com que a linha que fecha um bloco precisa caber: a entrelinha extra
    /// (múltipla &gt; 1) fica abaixo do texto e pode passar da margem (oráculos pagefit, keepfit).</summary>
    private static double ClosingFit(PreparedPara p, Line l) =>
        p.LineRule == "exact" || p.LineRule == "atLeast" ? l.Height : Math.Min(l.Height, l.Baseline + l.Desc);

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
            // o "depois" do próprio parágrafo (keepNext) conta até o início do seguinte;
            // contextual com o seguinte no mesmo estilo zera (oráculo keepgap)
            var curB = blockIdx >= 0 && blockIdx < _full.Blocks.Count ? _full.Blocks[blockIdx] : null;
            var from = curB is ParagraphBlock cpb ? Para.PrepareParagraph(_ctx, cpb.Paragraph, new ParaEnv()) : null;
            double after = from is not null ? (from.AfterAuto ? 280 : from.SpaceAfter) : 0;
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
                // (cadeia de linhas com keepNext: até a 1ª que não tem — oráculo keepchain)
                double chain = 0;
                int kc = 0;
                while (kc < t.Rows.Count && t.Rows[kc].KeepNext && kc + 1 < t.Rows.Count) { chain += t.Rows[kc].Height; kc++; }
                double lead = kc > 0 ? chain + StartNeed(t.Rows[kc], 400) : r1 is not null && r0.KeepNext ? r0.Height + StartNeed(r1, 400) : StartNeed(r0, r0.Natural ?? r0.Height);
                bool dropped = from is not null && DropsAfterBeforeTable(new PrevPara { After = after, AfterAuto = from.AfterAuto, Contextual = from.Contextual, StyleId = from.StyleId }, tbl);
                return (dropped ? 0 : after) + lead;
            }
            var q = Para.PrepareParagraph(_ctx, ((ParagraphBlock)nb).Paragraph, new ParaEnv());
            double before = q.SpaceBefore;
            double? ctxAfter = null;
            if (from is not null && from.StyleId == q.StyleId)
            {
                if (from.Contextual) { ctxAfter = after; after = 0; }
                if (q.Contextual) before = 0;
            }
            double gap = ctxAfter is { } cxa ? Math.Max(0, Collapse(cxa, before) - cxa) : Collapse(after, before);
            if (q.KeepNext) return gap + ParagraphHeight(q, width) + NextBlockLead(blockIdx + 1, g, width);
            // o seguinte só começa nesta página com as linhas que ele não pode deixar
            // sozinhas: inteiro com keepLines; com viúvas/órfãs, 2 linhas (todas se
            // tiver até 3) — oráculo keepwidow
            // (a última linha exigida fecha o bloco: só o texto dela precisa caber — oráculo keepfit)
            if (q.KeepLines)
            {
                var ls = ParagraphLines(q, width);
                var lastL = ls[^1];
                return gap + ls.Aggregate(BorderTopExtent(q, null), (a, l) => a + l.Height) - lastL.Height + ClosingFit(q, lastL);
            }
            var br = new LineBreaker(_ctx, q, GridFor(q));
            var qs = new List<Line>();
            do qs.Add(br.Next(new LineFrame(q.IndLeft, width - q.IndRight))); while (!br.Done() && qs.Count < 4);
            bool widow = q.WidowControl || q.Ppr.WidowControl is null;
            int n = !widow ? 1 : br.Done() && qs.Count <= 3 ? qs.Count : 2;
            var take = qs.Take(n).ToList();
            return gap + take.Aggregate(0.0, (a, l) => a + l.Height) - take[n - 1].Height + ClosingFit(q, take[n - 1]);
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
        _sectGapAfter = null;
        var fr = ColFrame();
        var fp = table.TblPr?.TblpPr;
        if (fp is not null && fp.TblpYSpec != "inline")
        {
            bool textAnchor = fp.VertAnchor != "page" && fp.VertAnchor != "margin";
            if (textAnchor)
            {
                // âncora no texto: a posição conta do fim do "depois" do parágrafo anterior;
                // o parágrafo âncora tem o "antes" inteiro, abaixo da tabela se ela o empurra (oráculo ftable2)
                if (_prev is not null && !_atTop && _prev.After > 0 && !_prev.Contextual)
                {
                    _y += _prev.After;
                    var pv = _prev.ShallowClone();
                    pv.After = 0;
                    _prev = pv;
                }
                _floatTableGap = true;
            }
            // já posta no início da página (tabela tardia, passada anterior): não repete
            // tabela de posição na página que a passada anterior mandou para uma página
            // ADIANTE (a âncora não coube na página dela com o texto contornando): a âncora
            // começa naquela página, onde a tabela já entrou (oráculo ftpage, fpg-overflow)
            var ltp = blockIdx >= 0 && !textAnchor && _lateTables.TryGetValue(blockIdx, out var ltp0) ? ltp0 : null;
            for (int k = 0; ltp is not null && k < 20 && _pages.Count - 1 < ltp.Page; k++) BreakColumn();
            if (blockIdx >= 0 && _placedTables.Contains(blockIdx))
            {
                // posição na página e a âncora desceu para outra página (o texto antes dela
                // contornou a tabela e passou): a tabela vai junto, para o início da página
                // da âncora, na próxima passada (oráculo ftpage)
                if (_lateTables.TryGetValue(blockIdx, out var lt) && !textAnchor && _pages.Count - 1 > lt.Page && LateTablesFound.Count == 0)
                    LateTablesFound[blockIdx] = new LateTable(_pages.Count - 1, _y);
                // ela partiu e a continuação ainda não saiu: a âncora vai junto (oráculo ftvmsplit)
                if (_lateSplit.Remove(blockIdx) && _floatCarry.Count > 0 && _col == _cur.Geom.Cols.Count - 1) { BreakColumn(); _carryAnchorGap = true; }
                return;
            }
            if (blockIdx >= 0) _placedTables.Add(blockIdx);
            // tabela flutuante (w:tblpPr): fora do fluxo, o texto seguinte a contorna
            var ft = TableEngine.LayoutTable(_ctx, table, 0, fr.W, (cell, cx, cw, cenv, cref) => LayoutCell(cell, cx, cw, cenv, cref, _cur), reference);
            // pintada depois do texto do corpo (como o Word: ordem do conteúdo da página)
            var fitems = new List<PageItem>();
            double flowY = _y;
            if (textAnchor)
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
                // "não dividir tabelas com quebra automática de texto" (w:compat, modos < 15): a
                // tabela fica inteira — passando da margem — se a altura dela couber a partir do
                // topo da âncora; senão desce inteira com a âncora (oráculo ftnobreak)
                if (NoBreakWrapped())
                {
                    if (!_atTop && flowY + ft.Rows.Aggregate(0.0, (a, r) => a + r.Height) > _cur.BodyBottom + 0.5)
                    {
                        BreakColumn();
                        flowY = _y;
                    }
                }
                else if (!_atTop && r0 is not null && top + r0.Height > _cur.BodyBottom + 0.5)
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
            int nFloats = _cur.Floats.Count;
            int nCarry = _floatCarry.Count;
            PlaceFloatingTable(ft, fp, _cur, flowY, fr.X, fr.W, fitems, 0, true, true);
            _cur.Front.Add(new ZObj { Z = -1, Seq = _zSeq++, Items = fitems });
            // cobre linhas de parágrafos JÁ diagramadas antes dela (deslocamento negativo): na
            // passada seguinte entra no início da página e essas linhas a contornam (oráculo ftable2, ft2-form*)
            var box = _cur.Floats.Count > nFloats ? _cur.Floats[^1] : null;
            // (posição relativa à página/margem também: o texto antes da âncora a contorna — oráculo ftpage)
            if (blockIdx >= 0 && box is not null)
            {
                var gg = _cur.Geom;
                bool hit = _cur.Page.Lines.Any(l => BOnlyRe.IsMatch(l.Ref) && l.Y + l.Height > box.Y - box.DistT + 1 && l.Y < box.Y + box.H + box.DistB - 1
                    && box.X + box.W + box.DistR > gg.MarL && box.X - box.DistL < gg.PageW - gg.MarR);
                // uma por passada: a posição das seguintes depende do texto que esta empurrar
                if (hit && LateTablesFound.Count == 0) LateTablesFound[blockIdx] = new LateTable(_pages.IndexOf(_cur), flowY);
            }
            // a tabela continua na página seguinte: o parágrafo âncora vai junto e contorna a
            // continuação lá (largura total: fica depois do fim dela) — oráculo ftsplit
            // (posição relativa à página/margem também; lá, abaixo dela, com o "antes" inteiro — oráculo ftvmsplit)
            if (_floatCarry.Count > nCarry && _col == _cur.Geom.Cols.Count - 1) { BreakColumn(); _carryAnchorGap = true; }
            return;
        }
        _floatTableGap = false;
        if (_prev is not null)
        {
            _y += _atTop || DropsAfterBeforeTable(_prev, table) ? 0 : _prev.After;
        }
        AssignCellNeighbors(table, _prev is not null ? new CtxNeighbor { StyleId = _prev.StyleId } : null);
        _prev = null;
        _firstInDoc = false;
        _topGapPrevAfter = null;
        var t = TableEngine.LayoutTable(_ctx, table, fr.X, fr.W, (cell, cx, cw, cenv, cref) => LayoutCell(cell, cx, cw, cenv, cref, _cur), reference);
        if (blockIdx >= 0) PinFloatsOverTable(t, blockIdx);
        _lastRowEmit = null;
        var headerRows = new List<RowLayout>();
        foreach (var r in t.Rows) { if (r.Header) headerRows.Add(r); else break; }
        var mergeMovedT = new HashSet<object>(ReferenceEqualityComparer.Instance);
        // partes de linhas emitidas e mesclas verticais que atravessam a página
        var rowEmits = new List<RowEmit>();
        var flowMerges = new List<FlowMerge>();
        for (int ri = 0; ri < t.Rows.Count; ri++)
        {
            var row0 = t.Rows[ri];
            var row = row0;
            // modo 15: as linhas de cabeçalho (repetidas) não ficam sozinhas no pé — se a
            // 1ª linha de dados não puder começar logo depois delas, descem juntas
            // (oráculo hdrrow; nos modos 11/14 ficam e se repetem)
            if (ri == 0 && headerRows.Count > 0 && headerRows.Count < t.Rows.Count && !_atTop && _ctx.Fmt.Settings.CompatibilityMode >= 15)
            {
                double availH = _cur.BodyBottom - _y;
                double hh = headerRows.Aggregate(0.0, (a, r) => a + r.Height);
                if (hh <= availH + 0.5 && !RowCanStart(t.Rows[headerRows.Count], availH - hh)) BreakColumn();
            }
            // manter com a próxima: se a próxima linha não puder começar nesta página
            // logo depois desta, esta desce junto (oráculo keeptbl)
            if (row.KeepNext && !_atTop && ri + 1 < t.Rows.Count)
            {
                double availK = _cur.BodyBottom - _y;
                // cadeia de linhas com keepNext: todas ficam com a primeira que não tem
                // (oráculo keepchain)
                double chainH = row.Height;
                int kk = ri + 1;
                while (kk + 1 < t.Rows.Count && t.Rows[kk].KeepNext && chainH + t.Rows[kk].Height <= availK + 0.5) { chainH += t.Rows[kk].Height; kk++; }
                if (chainH <= availK + 0.5 && !RowCanStart(t.Rows[kk], availK - chainH))
                {
                    if (_lastRowEmit is { } lk && lk.Row.BreakBorderItems is not null)
                        foreach (var it in lk.Row.BreakBorderItems) _cur.Body.Add(TableEngine.ShiftItem(it, lk.Y));
                    BreakColumn();
                    if (ri >= headerRows.Count) foreach (var hr in headerRows) EmitRow(hr);
                }
            }
            for (int guard = 0; guard < 500; guard++)
            {
                // a tabela não contorna: a linha cuja 1ª linha de texto cruzaria um flutuante com
                // quebra (inclusive atrás do texto; do cabeçalho também nos modos ≤ 14) desce para
                // baixo dele (oráculo tblfloat); o resto da linha parte no pé como sempre (corpus t191)
                _y = BelowFloats(t.X, t.Width, _y, row.Lines.Count > 0 ? Math.Min(row.Height, row.Lines.Min(l => l.Y + l.Height)) : row.Height);
                // notas de rodapé referenciadas nas células desta linha ocupam o pé da página
                // flutuante com quebra que ocupa o pé da página (do rodapé, p.ex.) e cruza a
                // tabela: a linha parte no topo dele, como no pé (oráculo tblfoot)
                double avail = Math.Min(_cur.BodyBottom - RowNoteExtra(row), FloatFloor(t.X, t.Width, _y)) - _y;
                // fora a última da tabela, a borda que fecharia a página logo abaixo dela
                // também tem de caber (oráculo rowfitbdr)
                double bw = ri < t.Rows.Count - 1 ? row.BreakW ?? 0 : 0;
                // linha que abre a página (a anterior ficou na outra): a faixa de cima é só a
                // borda de cima dela (oráculo contband)
                if (_atTop && row.TopCut is { } tc && tc != 0 && !double.IsNaN(tc) && row.Height - tc + bw <= avail + 0.5) row = TableEngine.AtPageTop(row);
                // (sem folga, como as linhas do corpo — oráculo bodyfit, bf-cf-*)
                if (row.Height + bw <= avail + 0.05) break;
                // só a nota não cabe inteira: o começo dela fica com a linha (oráculo fncont)
                if (!_atTop && _y + row.Height + bw <= Math.Min(_cur.BodyBottom, FloatFloor(t.X, t.Width, _y)) + 0.05)
                {
                    var ncut = NotePartial(RowNoteIds(row), _y + row.Height + bw);
                    if (ncut is not null) { _rowNoteCut = ncut; break; }
                }
                // não cabe: o Word divide a linha (salvo cantSplit) no fim da última linha de
                // texto que cabe — mas se o CONTEÚDO cabe e só a altura mínima não, a linha desce inteira
                bool onlyMin = (row.Natural ?? row.Height) + bw <= avail + 0.05;
                var parts = onlyMin ? null : row.Split?.Invoke(avail);
                if (parts is { } pp && pp.First.Height > 0)
                {
                    rowEmits.Add(new RowEmit(ri, _cur, _y, pp.First.Height, _cur.Body.Count));
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
            // texto de mescla vertical na 1ª linha dela, na ordem das colunas — se a mescla
            // inteira cabe aqui, sem flutuantes no caminho (oráculo vmorder)
            if (ReferenceEquals(row, row0) || row.Cut is not null)
                row = TableEngine.DropMoved(TableEngine.MergeTextFirst(t.Rows, ri, row, mergeMovedT,
                    hh => _y + hh <= _cur.BodyBottom + 0.5 && BelowFloats(t.X, t.Width, _y, hh) == _y), mergeMovedT);
            // mescla vertical que começou em OUTRA página: o texto dela flui pelas partes
            // (topo da mescla em cada página), como célula que parte (oráculo vmsplit)
            double grow = 0;
            foreach (var mt in row0.MergeText ?? new List<MergeTextInfo>())
            {
                var se = rowEmits.FirstOrDefault(e => e.Ri == mt.Start);
                if (se is null || ReferenceEquals(se.Ps, _cur) || mt.Content is null) continue;
                foreach (var o in mt.Items) mergeMovedT.Add(o);
                foreach (var o in mt.Lines) mergeMovedT.Add(o);
                double off = (mt.Band ?? 0) + (mt.MarT ?? 0);
                flowMerges.Add(new FlowMerge(mt.Start!.Value, ri, mt.Col, mt.Content, off, mt.VAlign));
                // a parte desta página cresce o que faltar ao resto do texto: o corte nas páginas
                // anteriores perde o espaço abaixo da última linha que coube (vms-top)
                // (parte que começa com linha no topo da página: o texto sobe junto — contband)
                CellContent? rest = mt.Content;
                PageState? segPs = null;
                double segTop = 0, segBot = 0, segCut = 0;
                foreach (var e in rowEmits)
                {
                    if (e.Ri < mt.Start!.Value || ReferenceEquals(e.Ps, _cur) || rest is null) continue;
                    if (!ReferenceEquals(e.Ps, segPs))
                    {
                        if (segPs is not null) rest = TableEngine.SplitContent(rest, segBot - segTop - (off - segCut))?.B ?? rest;
                        segPs = e.Ps; segTop = e.Y; segCut = e.Cut;
                    }
                    segBot = e.Y + e.H;
                }
                if (segPs is not null && rest is not null) rest = TableEngine.SplitContent(rest, segBot - segTop - (off - segCut))?.B ?? rest;
                var hereE = rowEmits.FirstOrDefault(e => e.Ri >= mt.Start!.Value && ReferenceEquals(e.Ps, _cur));
                double here = hereE?.Y ?? _y;
                double hereCut = hereE is not null ? hereE.Cut : row.Cut ?? 0;
                if (rest is not null) grow = Math.Max(grow, off - hereCut + rest.Height + (mt.Band ?? 0) - (_y - here + row.Height));
            }
            if (row0.MergeText is not null && mergeMovedT.Count > 0) row = TableEngine.DropMoved(row, mergeMovedT);
            rowEmits.Add(new RowEmit(ri, _cur, _y, row.Height + Math.Max(0, grow), _cur.Body.Count, row.Cut ?? 0));
            EmitRow(row);
            if (grow > 0.5) _y += grow;
        }
        // inserções no corpo de cada página (ordem do PDF do Word: texto da mescla na
        // 1ª linha da parte, na ordem das colunas) — aplicadas do fim para o começo
        var ins = new List<(PageState Ps, int At, List<PageItem> Items)>();
        foreach (var m in flowMerges)
        {
            // partes da mescla por página (topo da 1ª parte, fundo da última)
            var segs = new List<MergeSeg>();
            foreach (var e in rowEmits)
            {
                if (e.Ri < m.Start || e.Ri > m.End) continue;
                var lastS = segs.Count > 0 ? segs[^1] : null;
                if (lastS is not null && ReferenceEquals(lastS.Ps, e.Ps)) lastS.Bottom = e.Y + e.H;
                else segs.Add(new MergeSeg { Ps = e.Ps, Top = e.Y, Bottom = e.Y + e.H, At = e.At, Cut = e.Cut });
            }
            // posição da coluna da mescla entre as células da 1ª linha (1ª parte)
            int colAt = (m.Start >= 0 && m.Start < t.Rows.Count ? t.Rows[m.Start].MergeAt?.FirstOrDefault(a => a.Col == m.Col)?.At : null) ?? 0;
            CellContent? c = m.Content;
            for (int k = 0; k < segs.Count; k++)
            {
                var sg = segs[k];
                if (c is null) continue;
                CellContent part = c;
                CellContent? rest = null;
                if (k < segs.Count - 1)
                {
                    var sp = TableEngine.SplitContent(c, sg.Bottom - sg.Top - (m.Off - sg.Cut));
                    if (sp is { } spv) { part = spv.A; rest = spv.B; }
                    else { part = new CellContent { Items = new List<PageItem>(), Lines = new List<LaidOutLine>(), Height = 0 }; rest = c; }
                }
                // alinhamento vertical da célula vale dentro de CADA parte (vms-center)
                double free = Math.Max(0, sg.Bottom - sg.Top - (m.Off - sg.Cut) - part.Height);
                double dy = sg.Top + m.Off - sg.Cut + (m.VAlign == "center" ? free / 2 : m.VAlign == "bottom" ? free : 0);
                ins.Add((sg.Ps, sg.At + (k == 0 ? colAt : 0), part.Items.Select(it => TableEngine.ShiftItem(it, dy)).ToList()));
                foreach (var l in part.Lines)
                {
                    var nl = l.ShallowClone();
                    nl.Y = l.Y + dy;
                    nl.Baseline = l.Baseline + dy;
                    sg.Ps.Page.Lines.Add(nl);
                }
                c = rest;
            }
        }
        foreach (var n in ins.OrderByDescending(a => a.At).ToList()) n.Ps.Body.InsertRange(n.At, n.Items);
        // o parágrafo seguinte vê a marca de fim de linha como anterior (contextual)
        _prev = RowEndPrev();
    }

    /// <summary>parte de linha de tabela emitida (página, y, altura, posição no corpo) — oráculo vmsplit</summary>
    private sealed record RowEmit(int Ri, PageState Ps, double Y, double H, int At, double Cut = 0);
    /// <summary>mescla vertical que atravessa a página: linhas, coluna, conteúdo, deslocamento do topo, alinhamento</summary>
    private sealed record FlowMerge(int Start, int End, int Col, CellContent Content, double Off, string? VAlign);
    private sealed class MergeSeg
    {
        public PageState Ps = null!;
        public double Top;
        public double Bottom;
        public int At;
        public double Cut;
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
        TblFloats = ps.TblFloats is not null ? new List<FloatBox>(ps.TblFloats) : null,
    };

    /// <summary>O quadro <paramref name="a"/> aperta a linha mais que <paramref name="b"/> (lados ou vãos ao redor de flutuantes)?</summary>
    private static bool Narrower(LineFrame a, LineFrame b) =>
        a.Left > b.Left + 0.5 || a.Right < b.Right - 0.5 || (a.Segs?.Count ?? 0) != (b.Segs?.Count ?? 0);

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

    /// <summary>Topo do flutuante com quebra abaixo de <paramref name="y"/> que cruza [x, x+w] e vai até o pé do corpo
    /// (o conteúdo da tabela não passa dele nesta página); sem nenhum, o pé do corpo.</summary>
    private double FloatFloor(double x, double w, double y)
    {
        var fls = _cur.TblFloats is not null ? _cur.Floats.Concat(_cur.TblFloats).ToList() : _cur.Floats;
        double floor = _cur.BodyBottom;
        foreach (var f in fls)
        {
            double top = f.Y - f.DistT;
            if (f.Wrap == "none" || top <= y + 0.5 || f.Y + f.H + f.DistB < _cur.BodyBottom - 0.5) continue;
            if (x + w > f.X - f.DistL && x < f.X + f.W + f.DistR) floor = Math.Min(floor, top);
        }
        return floor;
    }

    /// <summary>Topo livre para uma faixa [x, x+w] × [y, y+h] que não contorna flutuantes (linha de tabela).</summary>
    private double BelowFloats(double x, double w, double y, double h)
    {
        var fls = _cur.TblFloats is not null ? _cur.Floats.Concat(_cur.TblFloats).ToList() : _cur.Floats;
        for (int k = 0; k < 8; k++)
        {
            var hit = fls.FirstOrDefault(f => f.Wrap != "none" && y + h > f.Y - f.DistT + 0.5 && y < f.Y + f.H + f.DistB - 0.5
                && x + w > f.X - f.DistL && x < f.X + f.W + f.DistR);
            if (hit is null) break;
            y = hit.Y + hit.H + hit.DistB;
        }
        return y;
    }

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
            double x = AlignPos(anc.PosH.Align, anc.PosH.Offset, hRef.X, hRef.W, w, anc.PosH.Pct, g.PageW, anc.EffectExtent?.L ?? 0, anc.EffectExtent?.R ?? 0);
            // justo/através: vale a caixa do polígono de contorno (oráculo wrappoly)
            var wb = anc.Wrap is "tight" or "through" ? anc.WrapBox : null;
            double by0 = wb is not null ? y + h * wb.T : y, by1 = wb is not null ? y + h * wb.B : y + h;
            double bx0 = wb is not null ? x + w * wb.L : x, bx1 = wb is not null ? x + w * wb.R : x + w;
            bool overV = by0 - (anc.DistT ?? 0) < top + H && by1 + (anc.DistB ?? 0) > top;
            bool overH = bx0 - (anc.DistL ?? 0) < t.X + t.Width && bx1 + (anc.DistR ?? 0) > t.X;
            if (!overV || !overH) continue;
            _pinnedFloats[run] = (_cur, y);
            newTop = Math.Max(newTop, by1 + (anc.DistB ?? 0));
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
        // no cabeçalho/rodapé a tabela não sai pelo pé da página: sobe até caber, sem
        // afastar o texto de lá (corpus t43; oráculo hfclamp)
        if (_inHf && top + H > g.PageH) { top = Math.Max(0, g.PageH - H); wrap = false; }
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
        FloatFlowState? fl = null;
        if (split) _floatFlow.TryGetValue(t, out fl);
        if (split && fl is null && t.Rows.Any(r => r.MergeText is { Count: > 0 }))
        {
            fl = new FloatFlowState();
            for (int k = 0; k < t.Rows.Count; k++) fl.Idx.TryAdd(t.Rows[k], k);
            _floatFlow[t] = fl;
        }
        for (int i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            int? ri = fl is not null && fl.Idx.TryGetValue(row, out var rix) ? rix : null;
            // continuação na página nova: a 1ª linha (inteira) só com a borda de cima dela (oráculo contband)
            if (split && n == 0 && i == 0 && !(t.Rows.Count > 0 && ReferenceEquals(row, t.Rows[0])) && row.TopCut is { } tc && tc != 0 && !double.IsNaN(tc)
                && y + row.Height - tc <= ps.BodyBottom + 0.5)
            {
                row = TableEngine.AtPageTop(row);
                rows[i] = row;
            }
            // fora a última, a borda que fecharia a página logo abaixo dela também tem de
            // caber, como no fluxo; sem folga (oráculos rowfitbdr, ftrowbdr, bodyfit)
            double bw = i < rows.Count - 1 ? row.BreakW ?? 0 : 0;
            bool cutHere = false;
            if (split && !NoBreakWrapped() && y + row.Height + bw > ps.BodyBottom + 0.05)
            {
                // não cabe: divide a linha (salvo cantSplit / só a altura mínima) como no fluxo
                double avail = ps.BodyBottom - y;
                bool onlyMin = (row.Natural ?? row.Height) + bw <= avail + 0.05;
                var parts = onlyMin || row.CantSplit ? null : row.Split?.Invoke(avail);
                if (parts is { } pp && pp.First.Height > 0)
                {
                    rows.RemoveAt(i);
                    rows.InsertRange(i, new[] { pp.First, pp.Remainder });
                    cutHere = true;
                    if (fl is not null && ri is { } rv) { fl.Idx[pp.First] = rv; fl.Idx[pp.Remainder] = rv; }
                    row = pp.First;
                }
                else if (n > 0) break;
            }
            // mescla vertical que começou em OUTRA página: o texto sai da última linha e flui
            // pelas partes; a parte desta página cresce o que faltar (como no fluxo — vmsplit)
            double grow = 0;
            if (fl is not null && ri is { } riv)
            {
                foreach (var mt in t.Rows[riv].MergeText ?? new List<MergeTextInfo>())
                {
                    if (fl.Seen.Contains(mt)) continue;
                    var se = fl.Emits.FirstOrDefault(e => e.Ri == mt.Start);
                    if (se is null || ReferenceEquals(se.Ps, ps) || mt.Content is null) continue;
                    fl.Seen.Add(mt);
                    foreach (var o in mt.Items) fl.Moved.Add(o);
                    foreach (var o in mt.Lines) fl.Moved.Add(o);
                    double off = (mt.Band ?? 0) + (mt.MarT ?? 0);
                    fl.Merges.Add(new FlowMerge(mt.Start!.Value, riv, mt.Col, mt.Content, off, mt.VAlign));
                    CellContent? rest = mt.Content;
                    PageState? segPs = null;
                    double segTop = 0, segBot = 0, segCut = 0;
                    foreach (var e in fl.Emits)
                    {
                        if (e.Ri < mt.Start!.Value || ReferenceEquals(e.Ps, ps) || rest is null) continue;
                        if (!ReferenceEquals(e.Ps, segPs))
                        {
                            if (segPs is not null) rest = TableEngine.SplitContent(rest, segBot - segTop - (off - segCut))?.B ?? rest;
                            segPs = e.Ps; segTop = e.Y; segCut = e.Cut;
                        }
                        segBot = e.Y + e.H;
                    }
                    if (segPs is not null && rest is not null) rest = TableEngine.SplitContent(rest, segBot - segTop - (off - segCut))?.B ?? rest;
                    var hereE = fl.Emits.FirstOrDefault(e => e.Ri >= mt.Start!.Value && ReferenceEquals(e.Ps, ps));
                    double here = hereE?.Y ?? y;
                    double hereCut = hereE is not null ? hereE.Cut : row.Cut ?? 0;
                    if (rest is not null) grow = Math.Max(grow, off - hereCut + rest.Height + (mt.Band ?? 0) - (y - here + row.Height));
                }
                if (fl.Moved.Count > 0) row = TableEngine.DropMoved(row, fl.Moved);
                fl.Emits.Add(new FloatEmit(riv, ps, y, row.Height + Math.Max(0, grow), outp, outp.Count, yOrigin, refX, row.Cut ?? 0));
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
            y += row.Height + (grow > 0.5 ? grow : 0);
            n++;
            // linha partida: o resto vai inteiro para a página seguinte (oráculo ftwidow)
            if (cutHere) break;
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
        else if (fl is not null) { _floatFlow.Remove(t); FlowFloatMerges(t, fl); }
    }

    /// <summary>tabela flutuante que parte: partes de linhas emitidas e mesclas verticais que
    /// atravessam a página (o texto flui pelas partes — oráculo ftvmsplit)</summary>
    private readonly Dictionary<TableLayout, FloatFlowState> _floatFlow = new(ReferenceEqualityComparer.Instance);

    private sealed class FloatFlowState
    {
        public Dictionary<RowLayout, int> Idx = new(ReferenceEqualityComparer.Instance);
        public HashSet<object> Moved = new(ReferenceEqualityComparer.Instance);
        public HashSet<object> Seen = new(ReferenceEqualityComparer.Instance);
        public List<FloatEmit> Emits = new();
        public List<FlowMerge> Merges = new();
    }

    private sealed record FloatEmit(int Ri, PageState Ps, double Y, double H, List<PageItem> Out, int At, double YOrigin, double RefX, double Cut);

    private sealed class FloatSeg
    {
        public PageState Ps = null!;
        public double Top, Bottom;
        public List<PageItem> Out = null!;
        public int At;
        public double YOrigin, RefX, Cut;
    }

    /// <summary>Texto das mesclas verticais de uma tabela flutuante que partiu: cada parte no topo
    /// da mescla na sua página (1ª parte na posição da coluna entre as células)</summary>
    private void FlowFloatMerges(TableLayout t, FloatFlowState fl)
    {
        var ins = new List<(List<PageItem> Out, int At, List<PageItem> Items)>();
        foreach (var m in fl.Merges)
        {
            var segs = new List<FloatSeg>();
            foreach (var e in fl.Emits)
            {
                if (e.Ri < m.Start || e.Ri > m.End) continue;
                var lastS = segs.Count > 0 ? segs[^1] : null;
                if (lastS is not null && ReferenceEquals(lastS.Ps, e.Ps)) lastS.Bottom = e.Y + e.H;
                else segs.Add(new FloatSeg { Ps = e.Ps, Top = e.Y, Bottom = e.Y + e.H, Out = e.Out, At = e.At, YOrigin = e.YOrigin, RefX = e.RefX, Cut = e.Cut });
            }
            int colAt = (m.Start >= 0 && m.Start < t.Rows.Count ? t.Rows[m.Start].MergeAt?.FirstOrDefault(a => a.Col == m.Col)?.At : null) ?? 0;
            CellContent? c = m.Content;
            for (int k = 0; k < segs.Count; k++)
            {
                var sg = segs[k];
                if (c is null) continue;
                CellContent part = c;
                CellContent? rest = null;
                if (k < segs.Count - 1)
                {
                    var sp = TableEngine.SplitContent(c, sg.Bottom - sg.Top - (m.Off - sg.Cut));
                    if (sp is { } spv) { part = spv.A; rest = spv.B; }
                    else { part = new CellContent { Items = new List<PageItem>(), Lines = new List<LaidOutLine>(), Height = 0 }; rest = c; }
                }
                double free = Math.Max(0, sg.Bottom - sg.Top - (m.Off - sg.Cut) - part.Height);
                double dy = sg.Top + m.Off - sg.Cut + (m.VAlign == "center" ? free / 2 : m.VAlign == "bottom" ? free : 0);
                ins.Add((sg.Out, sg.At + (k == 0 ? colAt : 0), part.Items.Select(it => TableEngine.ShiftItem(it, dy - sg.YOrigin, sg.RefX)).ToList()));
                foreach (var l in part.Lines)
                {
                    var nl = l.ShallowClone();
                    nl.X = l.X + sg.RefX; nl.Y = l.Y + dy; nl.Baseline = l.Baseline + dy;
                    if (l.Chars is not null) nl.Chars = l.Chars.Select(ch => ch with { X = ch.X + sg.RefX }).ToList();
                    sg.Ps.Page.Lines.Add(nl);
                }
                c = rest;
            }
        }
        foreach (var n in ins.OrderByDescending(a => a.At).ToList()) n.Out.InsertRange(n.At, n.Items);
    }

    /// <summary>w:doNotBreakWrappedTables: tabelas flutuantes não partem (o modo 15 ignora — oráculo ftnobreak)</summary>
    private bool NoBreakWrapped() =>
        _ctx.Fmt.Settings.CompatibilityMode < 15 && _ctx.Fmt.Settings.Compat.TryGetValue("doNotBreakWrappedTables", out var on) && on;

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
        // notas de rodapé de referências em células (oráculo notes)
        var ids = RowNoteIds(row);
        if (ids.Count > 0) ReserveNotes(ids, _rowNoteCut);
        _rowNoteCut = null;
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
            // (o Word compara em twips inteiros — 0,02pt de sobreposição não desvia;
            // 1 twip (moldura com y=1, oráculo frames) e 0,15pt desviam)
            if (y + lineH <= top + 0.5 || y >= bottom - 0.5) continue;
            double fl = f.X - f.DistL - frameX, frr = f.X + f.W + f.DistR - frameX;
            if (frr <= left || fl >= right) continue;
            if (f.Wrap == "topAndBottom") { skipTo = Math.Max(skipTo ?? 0, bottom); continue; }
            hit = true;
            minBottom = Math.Min(minBottom, bottom);
            // wrapText: o texto passa só de um lado — o outro também fica bloqueado
            // (largest: o vão maior; oráculo wrapsides)
            double bl = fl, bh = frr;
            string side = f.Side ?? "bothSides";
            if (side == "left") bh = double.PositiveInfinity;
            else if (side == "right") bl = double.NegativeInfinity;
            else if (side == "largest") { if (fl - left >= right - frr) bh = double.PositiveInfinity; else bl = double.NegativeInfinity; }
            var next = new List<(double A, double B)>();
            foreach (var (a, b) in free)
            {
                if (bh <= a || bl >= b) { next.Add((a, b)); continue; }
                if (bl > a) next.Add((a, bl));
                if (bh < b) next.Add((bh, b));
            }
            free = next;
        }
        if (hit)
        {
            // o intervalo mais largo (empate: o da esquerda) — vários flutuantes na mesma
            // linha: a linha vai para o vão livre, não para baixo deles (oráculo hfmix)
            // vão com menos de 18pt não recebe texto (oráculo wrapsides, ws-a-*)
            // o vão conta só DENTRO da coluna: recuo negativo não abre espaço ao lado do
            // flutuante (oráculo ftnegind)
            var col = ColFrame();
            double cR = Math.Abs(frameX - col.X) < 0.5 ? col.W : double.PositiveInfinity, cL = double.IsPositiveInfinity(cR) ? double.NegativeInfinity : 0;
            // (o vão conta até a margem da coluna: o recuo do parágrafo não o estreita — oráculo gapind)
            (double, double) Ext(double a, double b) => double.IsPositiveInfinity(cR) ? (a, b) : (a <= left + 0.5 ? Math.Min(a, cL) : a, b >= right - 0.5 ? Math.Max(b, cR) : b);
            free = free.Where(iv => { var (ea, eb) = Ext(iv.A, iv.B); return Math.Min(eb, cR) - Math.Max(ea, cL) >= MinGap; }).ToList();
            (double A, double B)? best = null;
            foreach (var iv in free) if (best is null || iv.B - iv.A > best.Value.B - best.Value.A) best = iv;
            // sem espaço útil ao lado: a linha desce até o fim do 1º objeto que a bloqueia
            if (best is null) skipTo = Math.Max(skipTo ?? 0, minBottom);
            // objeto no meio: o texto ocupa os vãos da esquerda para a direita (wrapsides)
            else if (skipTo is null) return new LineFrame(best.Value.A, best.Value.B) { Segs = free.Count > 1 ? free : null };
        }
        if (skipTo is not null) { var r = frame; r.SkipTo = skipTo; return r; }
        return new LineFrame(left, right);
    }

    /// <summary>vão mínimo ao lado de um objeto para receber texto: 18pt (twips; oráculo wrapsides)</summary>
    private const double MinGap = 359.5;

    /// <summary>
    /// Vão onde começa a linha: com o objeto no meio dela, o 1º vão (da esquerda)
    /// em que a próxima palavra cabe — vão estreito demais fica vazio (oráculo
    /// wrapsides). Nenhum cabe: o mais largo, sozinho (k = fim).
    /// </summary>
    private static (int K, LineFrame F) PickSeg(LineBreaker br, LineFrame frame)
    {
        if (frame.Segs is null) return (-1, frame);
        double need = br.PeekWordWidth();
        for (int k = 0; k < frame.Segs.Count; k++)
        {
            var (a, b) = frame.Segs[k];
            if (b - a + 0.01 >= need) return (k, new LineFrame(a, b));
        }
        return (frame.Segs.Count, new LineFrame(frame.Left, frame.Right));
    }

    /// <summary>linhas dos vãos seguintes da mesma linha (depois do vão `k`)</summary>
    private static Line MoreSegs(LineBreaker br, LineFrame frame, int k, Line last, Action<Line> put)
    {
        if (frame.Segs is null) return last;
        for (int j = k + 1; j < frame.Segs.Count && !br.Done() && last.BreakAfter is null && !last.Clear; j++)
        {
            var (a, b) = frame.Segs[j];
            if (b - a + 0.01 < br.PeekWordWidth()) continue;
            last = br.Next(new LineFrame(a, b));
            put(last);
        }
        return last;
    }

    private static bool IsFloating(Run run) =>
        run.Image?.Floating == true || run.Shape?.Floating == true || run.Group?.Floating == true || run.Textbox?.Floating == true;

    private void PlaceFloats(PreparedPara p, PageState ps, double colX, double colW, double paraTop, List<PageItem> flowItems, double yOrigin, double? paraRef = null)
    {
        foreach (var g in p.Glyphs)
        {
            var run = g.Obj;
            if (run is null) continue;
            if (!IsFloating(run) || _prePlaced.Contains(run)) continue;
            if (_onlyTextFloats && !FollowsText(FloatAnchor(run))) continue;
            PlaceFloat(run, ps, colX, colW, paraTop, flowItems, yOrigin, null, paraRef);
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
        /// <summary>moldura: itens postos no FLUXO (camada do texto)</summary>
        public (List<PageItem> Arr, List<PageItem> Items)? InFlow;
    }

    /// <summary>Quebras de texto que afastam as linhas do objeto.</summary>
    private static readonly HashSet<string> Wrapping = new(StringComparer.Ordinal) { "square", "tight", "through", "topAndBottom" };

    /// <summary>Desfaz um flutuante colocado (parágrafo que mudou de página).</summary>
    private void UnplaceFloat(FloatReceipt r)
    {
        r.Target.Remove(r.ZObj);
        if (r.InFlow is { } inf) foreach (var it in inf.Items) inf.Arr.Remove(it);
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
    private List<FloatReceipt> PlaceFloatsEarly(PreparedPara p, PageState ps, double colX, double colW, double paraTop, double? clampBottom = null, double? paraRef = null)
    {
        var outp = new List<FloatReceipt>();
        FlowState? flow = null;
        foreach (var g in p.Glyphs)
        {
            var run = g.Obj;
            if (run is null) continue;
            var anc = run.Image?.Anchor ?? run.Shape?.Anchor ?? run.Group?.Anchor ?? run.Textbox?.Anchor;
            // (já posto no início da página como flutuante tardio: não duplica)
            if (!IsFloating(run) || anc is null || !Wrapping.Contains(anc.Wrap ?? "") || _prePlaced.Contains(run)) continue;
            // estado antes de TODAS as colocações (desfazer em qualquer ordem volta a ele)
            flow ??= _ctx.SaveFlow();
            var rc = PlaceFloat(run, ps, colX, colW, paraTop, ps.Body, 0, clampBottom is not null && FollowsText(anc) ? clampBottom : null, paraRef);
            rc.Flow = flow;
            outp.Add(rc);
        }
        return outp;
    }

    /// <summary>Âncora de um objeto flutuante (qualquer tipo).</summary>
    private static DrawingAnchor? FloatAnchor(Run run) => run.Image?.Anchor ?? run.Shape?.Anchor ?? run.Group?.Anchor ?? run.Textbox?.Anchor;

    /// <summary>O objeto acompanha o texto (posição vertical relativa ao parágrafo/linha).</summary>
    private static bool FollowsText(DrawingAnchor? a) => a is not null && a.SimplePos is null && !AbsoluteV.Contains(a.PosV.RelativeFrom ?? "paragraph");

    private FloatReceipt PlaceFloat(Run run, PageState ps, double colX, double colW, double paraTop, List<PageItem> flowItems, double yOrigin, double? clampBottom = null,
        /* topo do PARÁGRAFO como referência vertical (antes do "antes" que exceda o
           "depois" do anterior — oráculo anchorbefore); a linha usa paraTop */
        double? paraRef = null)
    {
        var g = ps.Geom;
        var anchor = run.Image?.Anchor ?? run.Shape?.Anchor ?? run.Group?.Anchor ?? run.Textbox?.Anchor;
        double w = run.Image?.WidthTwips ?? run.Shape?.WidthTwips ?? run.Group?.WidthTwips ?? run.Textbox?.WidthTwips ?? 0;
        double h = run.Image?.HeightTwips ?? run.Shape?.HeightTwips ?? run.Group?.HeightTwips ?? run.Textbox?.HeightTwips ?? 0;
        bool behind = anchor?.BehindDoc == true || run.Image?.BehindDoc == true || run.Textbox?.BehindDoc == true;
        // conteúdo da caixa de texto (altura automática)
        CellContent? tbContent = null;
        // diagramação final do conteúdo da caixa já no lugar: flutuantes DENTRO dela
        // ficam relativos à caixa (antes iam para a origem da página)
        Func<double, double, CellContent>? tbFinal = null;
        if (run.Textbox is not null)
        {
            var tb = run.Textbox;
            var ins = TbInsets(tb);
            var blocks = tb.Blocks ?? tb.Paras.Select(p => (Block)new ParagraphBlock { Paragraph = p }).ToList();
            var env = new ParaEnv { Field = FieldValue(ps), DarkBackground = IsDark(Resolve.ResolveDrawingColor(tb.Shape?.Fill, _ctx.Fmt.Theme)) };
            double inner = w - ins.L - ins.R;
            var fi = Frames.InfoOf(tb);
            if (fi?.AutoWidth == true)
            {
                // moldura sem largura: a da linha mais longa, quebrando na largura da coluna
                var fprobe = _ctx.Pure(() => LayoutStatic(blocks, 0, colW, env, "txbx"));
                // (linha + recuo do lado em que está encostada; centralizada: só a linha)
                w = inner = Math.Max(1, fprobe.Lines.Aggregate(0.0, (m, l) =>
                {
                    double side = Math.Min(l.X, colW - l.X - l.Width);
                    return Math.Max(m, l.Width + (side < 2880 ? side : 0));
                }));
            }
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
            double iw = Math.Max(1, inner);
            tbContent = _ctx.Pure(() => LayoutStatic(blocks, 0, iw, env, "txbx"));
            tbFinal = (bx, by) =>
            {
                double prevDx = _staticDx;
                _staticDx = bx + ins.L;
                try { return LayoutStatic(blocks, 0, iw, env, "txbx", ps, by + ins.T); }
                finally { _staticDx = prevDx; }
            };
            // ajuste automático: a altura é a do texto (o cy gravado pode estar desatualizado)
            if (tb.AutoFit) h = tbContent.Height + ins.T + ins.B;
            if (fi is not null) h = fi.HRule == "exact" ? fi.H : fi.HRule == "atLeast" ? Math.Max(fi.H, tbContent.Height) : tbContent.Height;
        }
        double x, y;
        if (anchor?.SimplePos is not null) { x = anchor.SimplePos.X; y = anchor.SimplePos.Y; }
        else
        {
            var hRef = HorizRef(anchor?.PosH.RelativeFrom ?? "column", g, colX, colW);
            x = AlignPos(anchor?.PosH.Align, anchor?.PosH.Offset, hRef.X, hRef.W, w, anchor?.PosH.Pct, g.PageW, anchor?.EffectExtent?.L ?? 0, anchor?.EffectExtent?.R ?? 0);
            if (_pinnedFloats.TryGetValue(run, out var pin) && ReferenceEquals(pin.Ps, ps)) y = pin.Y;
            else
            {
                string vFrom0 = anchor?.PosV.RelativeFrom ?? "paragraph";
                var vRef = VertRef(vFrom0, g, ps, vFrom0 == "paragraph" && paraRef is not null ? paraRef.Value : paraTop);
                y = AlignPos(anchor?.PosV.Align, anchor?.PosV.Offset, vRef.Y, vRef.H, h, anchor?.PosV.Pct, g.PageH, anchor?.EffectExtent?.T ?? 0, anchor?.EffectExtent?.B ?? 0);
                if (clampBottom is { } cb && y + h > cb) y = cb - h;
                // com quebra e relativo ao texto: não sobe além do topo do corpo; nos modos
                // antigos (≤ 14), só além do topo da PÁGINA (oráculos toptbl/toptbl2)
                if (!_inHf && anchor is not null && Wrapping.Contains(anchor.Wrap) && FollowsText(anchor)) y = Math.Max(y, FloatMinY(ps));
            }
        }
        // itens desenhados em coordenadas absolutas da página; o fluxo do chamador
        // pode deslocar y (yOrigin) — compensamos para o desenho ficar absoluto
        // ancorado em CÉLULA de tabela: referências relativas à célula (área de texto da
        // célula na horizontal; parágrafo, ou topo da célula, na vertical) e itens no fluxo
        // da célula, que se desloca com a linha — oráculo cellfloat (lab de desenho)
        if (_inCell && anchor?.SimplePos is null)
        {
            string vFrom = anchor?.PosV.RelativeFrom ?? "paragraph";
            x = AlignPos(anchor?.PosH.Align, anchor?.PosH.Offset, colX, colW, w, null, g.PageW, anchor?.EffectExtent?.L ?? 0, anchor?.EffectExtent?.R ?? 0);
            y = AlignPos(anchor?.PosV.Align, anchor?.PosV.Offset, vFrom == "paragraph" ? paraRef ?? paraTop : vFrom == "line" ? paraTop : yOrigin, 0, h, null, g.PageH, anchor?.EffectExtent?.T ?? 0, anchor?.EffectExtent?.B ?? 0);
            if (tbFinal is not null) { double fx0 = x, fy0 = y; tbContent = _ctx.Pure(() => tbFinal(fx0, fy0)); }
            var cellItems = PaintObject(run, x, y, w, h, tbContent, ps);
            if (behind) flowItems.InsertRange(0, cellItems); else flowItems.AddRange(cellItems);
            return new FloatReceipt
            {
                Ps = ps, Target = new List<ZObj>(), ZObj = new ZObj { Z = 0, Seq = _zSeq++, Items = cellItems },
                Obj = new PlacedObject { Run = run, X = x, Y = y, W = w, H = h, Layer = behind ? "behind" : "front", Hf = _inHf },
            };
        }
        var target = _inHf ? (behind ? ps.HfBehind : ps.HfFront) : (behind ? ps.Behind : ps.Front);
        if (tbFinal is not null) tbContent = tbFinal(x, y);
        var items = PaintObject(run, x, y, w, h, tbContent, ps);
        var obj = new PlacedObject { Run = run, X = x, Y = y, W = w, H = h, Layer = behind ? "behind" : "front", Hf = _inHf };
        (ps.Page.Objects ??= new List<PlacedObject>()).Add(obj);
        // moldura no cabeçalho/rodapé: vai no fluxo — no PDF do Word o texto dela vem
        // na ordem da linha: antes do parágrafo âncora se está no começo dela
        // (fr-hdr-left), depois se está mais à direita (fr-hdr-pgnum); no corpo, depois
        // de todo o texto da página (camada da frente)
        bool frameFlow = _inHf && run.Textbox is not null && Frames.InfoOf(run.Textbox) is not null;
        (List<PageItem> Arr, List<PageItem> Items)? inFlow = null;
        if (frameFlow)
        {
            var rel = yOrigin != 0 && !double.IsNaN(yOrigin) ? items.Select(it => TableEngine.ShiftItem(it, -yOrigin)).ToList() : items;
            if (x > colX + 20) _hfFrameAfter.AddRange(rel); else flowItems.AddRange(rel);
            inFlow = (flowItems, rel);
        }
        var zobj = new ZObj { Z = anchor?.RelativeHeight ?? 0, Seq = _zSeq++, Items = frameFlow ? new List<PageItem>() : items };
        if (!frameFlow) target.Add(zobj);
        FloatBox? box = null;
        // modo de compatibilidade ≤ 14: flutuantes do cabeçalho/rodapé não afastam texto
        // nenhum (nem o do próprio cabeçalho, nem o do corpo) — oráculo hffloat (hff14-*)
        bool hfLegacy = _inHf && _ctx.Fmt.Settings.CompatibilityMode < 15;
        if (anchor is not null && Wrapping.Contains(anchor.Wrap))
        {
            // justo/através: a caixa do polígono de contorno (oráculo wrappoly)
            var wb = anchor.Wrap is "tight" or "through" ? anchor.WrapBox : null;
            double bbx = wb is not null ? x + w * wb.L : x, bby = wb is not null ? y + h * wb.T : y;
            double bbw = wb is not null ? w * (wb.R - wb.L) : w, bbh = wb is not null ? h * (wb.B - wb.T) : h;
            var fb = new FloatBox { X = bbx, Y = bby, W = bbw, H = bbh, Wrap = anchor.Wrap, Side = anchor.WrapText ?? "bothSides", DistL = anchor.DistL ?? 0, DistR = anchor.DistR ?? 0, DistT = anchor.DistT ?? 0, DistB = anchor.DistB ?? 0 };
            // (mas as tabelas do corpo descem para baixo deles — oráculo tblfloat)
            if (hfLegacy) (ps.TblFloats ??= new List<FloatBox>()).Add(fb);
            else box = fb;
        }
        if (box is not null)
        {
            ps.Floats.Add(box);
            // posição absoluta cobrindo linhas do corpo já colocadas nesta página: na
            // próxima passada ele entra no início da página (oráculo latefloat)
            if (!_inHf && !FollowsText(anchor) && !_prePlaced.Contains(run))
            {
                int pi = _pages.IndexOf(ps);
                var bx = box;
                bool hit = pi >= 0 && ps.Page.Lines.Any(l => !LateSkipRe.IsMatch(l.Ref)
                    && l.Y + l.Height > bx.Y - bx.DistT && l.Y < bx.Y + bx.H + bx.DistB
                    && bx.X + bx.W + bx.DistR > ps.Geom.MarL && bx.X - bx.DistL < ps.Geom.PageW - ps.Geom.MarR);
                if (hit)
                {
                    if (!LateFound.TryGetValue(pi, out var list)) LateFound[pi] = list = new List<Run>();
                    list.Add(run);
                }
            }
        }
        return new FloatReceipt { Ps = ps, Target = target, ZObj = zobj, Obj = obj, Box = box, InFlow = inFlow };
    }

    /// <summary>Desenha imagem/forma/caixa/grupo no retângulo dado.</summary>
    /// <summary>Grupo de desenho e caixa de texto EM LINHA (wp:inline): desenhados como os
    /// flutuantes, na caixa do glifo — o PaintLine só desenha imagem e forma (corpus t15)</summary>
    private void PaintInlineDrawings(List<PageItem> outp, Line line, double frameX, double top, PageState? ps)
    {
        foreach (var pg in line.Placed)
        {
            var r = pg.G.Obj;
            if (pg.G.Kind != GlyphKind.Obj || r is null || !(pg.G.Adv > 0) || (r.Group is null && r.Textbox is null) || r.Image is not null || r.Shape is not null) continue;
            double w = r.Group?.WidthTwips ?? r.Textbox?.WidthTwips ?? 0, h = r.Group?.HeightTwips ?? r.Textbox?.HeightTwips ?? 0;
            double x = frameX + pg.X, y = top + line.Baseline - pg.G.Style.Shift - h;
            CellContent? tc = null;
            if (r.Textbox is not null)
            {
                var ins = TbInsets(r.Textbox);
                var blocks = r.Textbox.Blocks ?? r.Textbox.Paras.Select(p => (Block)new ParagraphBlock { Paragraph = p }).ToList();
                tc = LayoutStatic(blocks, 0, Math.Max(1, w - ins.L - ins.R), new ParaEnv { DarkBackground = IsDark(Resolve.ResolveDrawingColor(r.Textbox.Shape?.Fill, _ctx.Fmt.Theme)) }, "itb", ps);
            }
            var drawn = PaintObject(r, x, y, w, h, tc, ps ?? _cur);
            // no corpo, como os flutuantes: depois do texto da página (ordem do PDF do Word — oráculo inlinegrp)
            if (ReferenceEquals(outp, _cur.Body)) _cur.Front.Add(new ZObj { Z = 0, Seq = _zSeq++, Items = drawn });
            else outp.AddRange(drawn);
        }
    }

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
            var (sGrad, sShadow) = Geometry.ShapeExtras(s, theme);
            outp.Add(new ShapeItem { X = x, Y = y, W = w, H = h, Style = s, Fill = fill, Stroke = stroke, Line = run.Shape.Line, Grad = sGrad, Shadow = sShadow });
        }
        else if (run.Textbox is not null)
        {
            var tb = run.Textbox;
            var s = tb.Shape;
            if (s is not null && (Js.Truthy(s.Fill) || s.Line is not null))
            {
                string? fill = Resolve.ResolveDrawingColor(s.Fill, theme);
                var stroke = s.Line is not null ? new StrokeSpec { Color = Resolve.ResolveDrawingColor(s.Line.Color, theme) ?? "000000", WidthPt = s.Line.WidthPt } : null;
                var (tGrad, tShadow) = Geometry.ShapeExtras(s, theme);
                outp.Add(new ShapeItem { X = x, Y = y, W = w, H = h, Style = s, Fill = fill, Stroke = stroke, Grad = tGrad, Shadow = tShadow });
            }
            if (tbContent is not null)
            {
                var ins = TbInsets(tb);
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
                    // o Word grava o texto do WordArt como CURVAS no PDF (não é texto extraível)
                    foreach (var it in tbContent.Items) outp.Add(it is GlyphRunItem g ? AsPathCopy(g) : it);
                    outp.Add(XformItem.Pop());
                }
                else
                {
                    double dy = y + ins.T;
                    double free = h - ins.T - ins.B - tbContent.Height;
                    if (tb.VAnchor == "ctr" && free > 0) dy += free / 2;
                    else if (tb.VAnchor == "b" && free > 0) dy += free;
                    outp.Add(ClipItem.Push(x, y, w, h));
                    // caixa girada fora de múltiplos de 90°: o Word rasteriza o conteúdo
                    // (imagem no PDF, sem texto) — curvas aqui (oráculo hidetext/rot-tb, rot-1)
                    bool raster = rot % 90 != 0;
                    foreach (var it in tbContent.Items)
                    {
                        var s2 = TableEngine.ShiftItem(it, dy, x + ins.L);
                        outp.Add(raster && s2 is GlyphRunItem g2 ? AsPathCopy(g2) : s2);
                    }
                    outp.Add(ClipItem.Pop());
                }
                if (rotOn) outp.Add(XformItem.Pop());
            }
        }
        else if (run.Group is not null)
        {
            var gr = run.Group;
            foreach (var item in gr.Items)
            {
                // rotação/espelho do grupo aplicados ao filho (oráculo de formas)
                var (r, ix, iy, iw, ih) = Geometry.GroupChild(gr, item, x, y, w, h);
                CellContent? tc = null;
                if (r.Textbox is not null)
                {
                    var ins = TbInsets(r.Textbox);
                    var blocks = r.Textbox.Blocks ?? r.Textbox.Paras.Select(p => (Block)new ParagraphBlock { Paragraph = p }).ToList();
                    tc = LayoutStatic(blocks, 0, Math.Max(1, iw - ins.L - ins.R), new ParaEnv { DarkBackground = IsDark(Resolve.ResolveDrawingColor(r.Textbox.Shape?.Fill, _ctx.Fmt.Theme)) }, "grp", ps);
                }
                outp.AddRange(PaintObject(r, ix, iy, iw, ih, tc, ps));
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
        "margin" => (Math.Max(g.MarT, ps?.BodyTop ?? g.MarT), g.PageH - Math.Max(g.MarT, ps?.BodyTop ?? g.MarT) - g.MarB),
        "topMargin" or "insideMargin" => (0, g.MarT),
        "bottomMargin" or "outsideMargin" => (g.PageH - g.MarB, g.MarB),
        _ => (paraTop, 0), // paragraph | line
    };

    /// <summary>Recuos internos da caixa de texto (twips); com contorno, o Word ainda afasta o texto meia
    /// espessura da linha de cada lado (oráculo txbxctr).</summary>
    private static TextboxInsets TbInsets(DrawingTextbox tb)
    {
        var ins = tb.Insets ?? DefaultInsets;
        double half = (tb.Shape?.Line?.WidthPt ?? 0) * 10;
        return half != 0 && !double.IsNaN(half) ? new TextboxInsets { L = ins.L + half, T = ins.T + half, R = ins.R + half, B = ins.B + half } : ins;
    }

    /// <summary>Posição do objeto pelo alinhamento ou deslocamento. Alinhado, o Word alinha a caixa JUNTO
    /// com a margem de efeitos (wp:effectExtent: e0 antes, e1 depois — sombra, brilho) e o objeto
    /// fica e0 para dentro dela (oráculo txbxctr); o deslocamento vale para o próprio objeto.</summary>
    private static double AlignPos(string? align, double? offset, double b, double span, double size, double? pct, double pageSpan, double e0 = 0, double e1 = 0)
    {
        if (!string.IsNullOrEmpty(align) && ((e0 != 0 && !double.IsNaN(e0)) || (e1 != 0 && !double.IsNaN(e1)))) return AlignPos(align, offset, b, span, size + e0 + e1, pct, pageSpan) + e0;
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

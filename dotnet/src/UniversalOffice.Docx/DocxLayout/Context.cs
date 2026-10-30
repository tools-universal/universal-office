using UniversalOffice.Docx;

namespace UniversalOffice.DocxLayout;

/// <summary>Compressão de espaços na justificação (medida no Word, oráculo jsweep):
/// o excesso cabe se for ≤ Ratio × soma dos espaços E a compressão por espaço for
/// ≤ ExpandRatio × a expansão por espaço que a linha teria sem a palavra.</summary>
public sealed class JustifyShrink
{
    public double Ratio = 0.25;
    public double ExpandRatio = 0.5;
}

/// <summary>Opções do motor (porta de LayoutOptions em docx-layout/src/context.ts).</summary>
public sealed class LayoutOptions
{
    /// <summary>em das LARGURAS de caractere: 'nominal' (medido no Word: as larguras usam o
    /// tamanho nominal, não o em de 600 dpi) ou 'device' (11→11,04).</summary>
    public string? AdvanceEm;
    /// <summary>largura de cada caractere: 'word' (padrão, medido no Word — oráculo emwidth: piso em
    /// 1/4096 pt, escala horizontal pela largura média inteira; o limite da linha também na
    /// unidade interna) ou arredondamentos de calibração ('none' = largura linear exata):
    /// word | none | twip | twipFloor | twipCeil | dev600 | half.</summary>
    public string? AdvanceRound;
    /// <summary>compressão de espaços na justificação (medida no Word).</summary>
    public JustifyShrink? JustifyShrink;
    /// <summary>idioma para números/datas (padrão pt-BR).</summary>
    public string? Lang;
    /// <summary>valor do campo DATE/TIME (padrão: agora).</summary>
    public DateTime? Now;
    /// <summary>diagnóstico (laboratório): cada decisão "a palavra cabe na linha?"</summary>
    public Action<WordFitInfo>? OnWordFit;
    /// <summary>hifenização automática (w:autoHyphenation) — padrão: ligada</summary>
    public bool? Hyphenation;
    /// <summary>só hifeniza estes idiomas (etiquetas BCP 47 ou prefixos: "pt-BR", "en"…): o Word
    /// só hifeniza os idiomas com revisores instalados — padrão: todos com padrões</summary>
    public List<string>? HyphenationLanguages;
    /// <summary>exibição das revisões (controle de alterações) — padrão: visão final, sem marcas</summary>
    public RevisionView? Revisions;

    /// <summary>Cópia rasa ({ ...opts }).</summary>
    public LayoutOptions ShallowClone() => (LayoutOptions)MemberwiseClone();
}

/// <summary>Dados de uma decisão de quebra (twips): para medir a regra do Word no corpus.</summary>
public sealed class WordFitInfo
{
    /// <summary>quanto a palavra passa da margem (≤ 0 cabe sem comprimir)</summary>
    public double Over;
    public double SpacesW;
    public int NSpaces;
    public double WordW;
    public double LastGapW;
    public bool Justify;
    public bool Accepted;
    /// <summary>índices em para.Glyphs: início da linha e da palavra</summary>
    public int LineStart;
    public int WordStart;
    public int WordEnd;
    public double SizePt;
    public string Family = "";
    public double Compat;
    /// <summary>texto da linha até a palavra e da palavra (sem marcador)</summary>
    public string LineText = "";
    public string WordText = "";
}

/// <summary>Opções efetivas (Required&lt;LayoutOptions&gt;).</summary>
public sealed class ResolvedLayoutOptions
{
    public string AdvanceEm = "nominal";
    public string AdvanceRound = "word";
    public JustifyShrink JustifyShrink = new();
    public string Lang = "pt-BR";
    public DateTime Now = DateTime.Now;
    public Action<WordFitInfo>? OnWordFit;
    public bool Hyphenation = true;
    public List<string>? HyphenationLanguages;
}

/// <summary>Estado compartilhado de um layout de documento.</summary>
/// <summary>Estado que avança com o conteúdo: listas, campos SEQ e números de nota.</summary>
public sealed class FlowState
{
    public NumberingState Numbering = null!;
    public Dictionary<string, double> Seq = null!;
    /// <summary>níveis dos títulos ("heading N") já diagramados, na ordem; e, por SEQ, quantos
    /// títulos havia na última vez em que ele contou (\s n reinicia — oráculo refs-lab, sr-*)</summary>
    public List<int> Heads = null!;
    public Dictionary<string, int> SeqHeads = null!;
    public NoteFlow Notes = null!;
}

/// <summary>Numeração das notas de um tipo na seção corrente (sectPr sobre o settings).</summary>
public sealed class NoteNumbering
{
    public string Fmt = "decimal";
    public double Start = 1;
    /// <summary>continuous | eachSect | eachPage</summary>
    public string Restart = "continuous";
}

/// <summary>Numeração das notas de rodapé e de fim de uma seção.</summary>
public sealed class NoteNumberingPair
{
    public NoteNumbering Footnote = new() { Fmt = "decimal" };
    public NoteNumbering Endnote = new() { Fmt = "lowerRoman" };

    public NoteNumbering Of(string kind) => kind == "endnote" ? Endnote : Footnote;
}

/// <summary>Marcas das notas já referenciadas e os contadores (reinício por seção/página).</summary>
public sealed class NoteFlow
{
    public Dictionary<int, string> FootnoteMarks = new();
    public Dictionary<int, string> EndnoteMarks = new();
    public double FootnoteSeq;
    public double EndnoteSeq;
    /// <summary>notas de fim na ordem da 1ª referência (as que ainda não saíram ficam pendentes)</summary>
    public List<int> EndnoteOrder = new();

    public Dictionary<int, string> Marks(string kind) => kind == "endnote" ? EndnoteMarks : FootnoteMarks;

    public NoteFlow Clone() => new()
    {
        FootnoteMarks = new Dictionary<int, string>(FootnoteMarks),
        EndnoteMarks = new Dictionary<int, string>(EndnoteMarks),
        FootnoteSeq = FootnoteSeq,
        EndnoteSeq = EndnoteSeq,
        EndnoteOrder = new List<int>(EndnoteOrder),
    };
}

public sealed class DocContext
{
    public readonly DocFormatting Fmt;
    public readonly StyleResolver Resolver;
    public readonly FaceResolver Faces;
    public NumberingState Numbering;
    private readonly List<string> _warnings = new();
    private readonly HashSet<string> _warnSet = new(StringComparer.Ordinal);
    public readonly ResolvedLayoutOptions Opts;
    /// <summary>como as revisões aparecem (modo, filtros, cores)</summary>
    public readonly RevisionDisplay Rev;

    public DocContext(DocFormatting fmt, IFontProvider provider, LayoutOptions? opts = null)
    {
        opts ??= new LayoutOptions();
        Fmt = fmt;
        Resolver = new StyleResolver(fmt);
        var ddFonts = fmt.Styles.DocDefaults.RPr?.RFonts;
        Faces = new FaceResolver(provider, fmt.FontTable, null, Resolve.FontOfSlot(ddFonts, "ascii", fmt.Theme) ?? fmt.Theme.Minor.Latin);
        Opts = new ResolvedLayoutOptions
        {
            AdvanceEm = opts.AdvanceEm ?? "nominal",
            AdvanceRound = opts.AdvanceRound ?? "word",
            JustifyShrink = opts.JustifyShrink ?? new JustifyShrink(),
            Lang = opts.Lang ?? "pt-BR",
            Now = opts.Now ?? DateTime.Now,
            OnWordFit = opts.OnWordFit,
            Hyphenation = opts.Hyphenation ?? true,
            HyphenationLanguages = opts.HyphenationLanguages,
        };
        Numbering = new NumberingState(fmt.Numbering, fmt.Styles.Styles, Opts.Lang);
        Rev = new RevisionDisplay(opts.Revisions, opts.Revisions?.Order ?? Array.Empty<string>());
    }

    /// <summary>Avisos na ordem de inserção (Set do JS).</summary>
    public IReadOnlyList<string> Warnings => _warnings;

    public void Warn(string msg)
    {
        if (_warnSet.Add(msg)) _warnings.Add(msg);
    }

    private NoteFlow _notes = new();
    /// <summary>numeração da seção corrente (o motor troca em cada seção)</summary>
    public NoteNumberingPair NoteNumbering = new();
    /// <summary>marcas finais de uma passada anterior (reinício por página: a página da
    /// referência só se sabe depois de diagramar)</summary>
    public Dictionary<string, string>? NoteMarkOverride;
    /// <summary>contadores dos campos SEQ (ordem do documento)</summary>
    public Dictionary<string, double> SeqCounters = new(StringComparer.Ordinal);
    /// <summary>títulos diagramados (níveis) e o ponto de cada SEQ — ver FlowState</summary>
    public List<int> Heads = new();
    public Dictionary<string, int> SeqHeads = new(StringComparer.Ordinal);

    /// <summary>Fotografia do estado que avança com o conteúdo.</summary>
    public FlowState SaveFlow() => new()
    {
        Numbering = Numbering.Clone(), Seq = new Dictionary<string, double>(SeqCounters, StringComparer.Ordinal),
        Heads = new List<int>(Heads), SeqHeads = new Dictionary<string, int>(SeqHeads, StringComparer.Ordinal),
        Notes = _notes.Clone(),
    };

    /// <summary>Volta ao estado fotografado (a fotografia continua reutilizável).</summary>
    public void RestoreFlow(FlowState s)
    {
        Numbering = s.Numbering.Clone();
        SeqCounters = new Dictionary<string, double>(s.Seq, StringComparer.Ordinal);
        Heads = new List<int>(s.Heads);
        SeqHeads = new Dictionary<string, int>(s.SeqHeads, StringComparer.Ordinal);
        _notes = s.Notes.Clone();
    }

    /// <summary>Medição sem efeito colateral: não avança listas, SEQ nem números de nota.</summary>
    public T Pure<T>(Func<T> fn)
    {
        var s = SaveFlow();
        try { return fn(); }
        finally { RestoreFlow(s); }
    }

    /// <summary>Seção nova: formato/início da numeração das notas e o reinício por seção.</summary>
    public void BeginNoteSection(NoteNumberingPair n, bool first)
    {
        NoteNumbering = n;
        if (first || n.Footnote.Restart == "eachSect") _notes.FootnoteSeq = 0;
        if (first || n.Endnote.Restart == "eachSect") _notes.EndnoteSeq = 0;
    }

    /// <summary>Página nova: reinicia a contagem das notas de rodapé "a cada página".</summary>
    public void BeginNotePage()
    {
        if (NoteNumbering.Footnote.Restart == "eachPage") _notes.FootnoteSeq = 0;
    }

    /// <summary>Marca exibida de uma nota (ordem da 1ª referência, no formato da seção dela);
    /// com marca personalizada não consome número (oráculo notefmt, custom-mark).</summary>
    public string NoteMark(string kind, int id, bool custom = false)
    {
        var marks = _notes.Marks(kind);
        if (!marks.TryGetValue(id, out var m))
        {
            if (kind == "endnote") _notes.EndnoteOrder.Add(id);
            if (custom) m = "";
            else
            {
                var nn = NoteNumbering.Of(kind);
                double seq = kind == "endnote" ? ++_notes.EndnoteSeq : ++_notes.FootnoteSeq;
                m = NoteMarkOverride is not null && NoteMarkOverride.TryGetValue($"{kind[0]}{id}", out var ov)
                    ? ov
                    : NumberFormat.FormatNumber(nn.Start - 1 + seq, nn.Fmt, Opts.Lang);
            }
            marks[id] = m;
        }
        return m;
    }

    /// <summary>Marca já atribuída (sem numerar).</summary>
    public string? NoteMarkOf(string kind, int id) => _notes.Marks(kind).TryGetValue(id, out var m) ? m : null;

    /// <summary>Todas as marcas atribuídas ("f&lt;id&gt;"/"e&lt;id&gt;") — NOTEREF na passada seguinte.</summary>
    public Dictionary<string, string> AllNoteMarks()
    {
        var outp = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var kv in _notes.FootnoteMarks) outp[$"f{kv.Key}"] = kv.Value;
        foreach (var kv in _notes.EndnoteMarks) outp[$"e{kv.Key}"] = kv.Value;
        return outp;
    }

    /// <summary>Notas de fim referenciadas até aqui (ordem da 1ª referência).</summary>
    public IReadOnlyList<int> EndnoteOrder => _notes.EndnoteOrder;

    /// <summary>Formatação vazia (documentos sem as partes — ex.: ODT convertido).</summary>
    public static DocFormatting EmptyFormatting() => new()
    {
        Settings = new Settings { DefaultTabStop = 720, CompatibilityMode = 15 },
    };

    // ───────────── formatação direta efetiva (modelo de edição × rPr/pPr originais) ─────────────

    /// <summary>
    /// rPr DIRETO efetivo de um run. O leitor guarda o w:rPr original (run.Rpr) e
    /// deriva dele as props de edição (run.Props); a edição só mexe nas props.
    /// Campos cujas props divergem do que o rPr original implica foram editados e
    /// sobrepõem o rPr (semântica absoluta, como formatação direta).
    /// </summary>
    public static RPr DirectRPr(Run run)
    {
        var b = run.Rpr is not null ? run.Rpr.Clone() : new RPr();
        var p = run.Props;
        var orig = DocumentReader.RunPropsFromRPr(run.Rpr);
        if (Js.Truthy(p.Link) && orig.Underline == false)
        {
            // hyperlink: o leitor força sublinhado/cor nas props de edição — não é rPr. O
            // w:hyperlink em si não formata nada: só o estilo/rPr do run (w:u="none" vale;
            // run sem rPr fica sem cor e sem sublinhado) — oráculo hlink
            orig.Underline = true;
            orig.Color ??= "0563C1";
        }
        if (run.Rpr is null)
        {
            // run criado pela edição (sem rPr original): as props são a formatação direta
            if (p.Bold) b.B = true;
            if (p.Italic) b.I = true;
            // (hyperlink: o sublinhado simples forçado pelo leitor não é formatação — oráculo hlink)
            if (p.Underline && !(Js.Truthy(p.Link) && !Js.Truthy(p.UnderlineStyle) && !Js.Truthy(p.UnderlineColor))) b.U = new UnderlineSpec { Val = p.UnderlineStyle ?? "single", Color = Js.Truthy(p.UnderlineColor) ? p.UnderlineColor : null };
            if (p.Strike) b.Strike = true;
            if (p.DoubleStrike) b.Dstrike = true;
            if (p.AllCaps) b.Caps = true;
            if (p.SmallCaps) b.SmallCaps = true;
            if (Js.Truthy(p.VertAlign)) b.VertAlign = p.VertAlign;
            if (p.SzHalfPt is not null) b.Sz = p.SzHalfPt;
            if (Js.Truthy(p.Color) && !(Js.Truthy(p.Link) && p.Color == "0563C1")) b.Color = new ColorSpec { Val = p.Color };
            if (Js.Truthy(p.Highlight)) b.Highlight = p.Highlight;
            if (Js.Truthy(p.FontAscii)) b.RFonts = new RFonts { Ascii = p.FontAscii, HAnsi = p.FontAscii, Cs = p.FontAscii };
            if (p.CharSpacingTwips is { } cs && cs != 0) b.Spacing = cs;
            if (Js.Truthy(p.CharStyle)) b.RStyle = p.CharStyle;
            return b;
        }
        if (p.Bold != orig.Bold) b.B = p.Bold;
        if (p.Italic != orig.Italic) b.I = p.Italic;
        if (p.Underline != orig.Underline || p.UnderlineStyle != orig.UnderlineStyle || p.UnderlineColor != orig.UnderlineColor)
        {
            b.U = p.Underline
                ? new UnderlineSpec { Val = p.UnderlineStyle ?? "single", Color = Js.Truthy(p.UnderlineColor) ? p.UnderlineColor : null }
                : new UnderlineSpec { Val = "none" };
        }
        if (p.Strike != orig.Strike) b.Strike = p.Strike;
        if (p.DoubleStrike != orig.DoubleStrike) b.Dstrike = p.DoubleStrike;
        if (p.AllCaps != orig.AllCaps) b.Caps = p.AllCaps;
        if (p.SmallCaps != orig.SmallCaps) b.SmallCaps = p.SmallCaps;
        if (p.VertAlign != orig.VertAlign) b.VertAlign = p.VertAlign ?? "baseline";
        if (p.SzHalfPt != orig.SzHalfPt) b.Sz = p.SzHalfPt;
        if (p.Color != orig.Color) b.Color = p.Color is null ? null : new ColorSpec { Val = p.Color };
        if (p.Highlight != orig.Highlight) b.Highlight = p.Highlight;
        if (p.FontAscii != orig.FontAscii)
        {
            if (p.FontAscii is null) b.RFonts = null;
            else
            {
                var rf = b.RFonts?.Clone() ?? new RFonts();
                rf.Ascii = p.FontAscii; rf.HAnsi = p.FontAscii; rf.Cs = p.FontAscii;
                rf.AsciiTheme = null; rf.HAnsiTheme = null; rf.CsTheme = null;
                b.RFonts = rf;
            }
        }
        if (p.CharSpacingTwips != orig.CharSpacingTwips)
        {
            if (p.CharSpacingTwips is null or 0) b.Spacing = null; else b.Spacing = p.CharSpacingTwips;
        }
        if (p.CharStyle != orig.CharStyle) b.RStyle = p.CharStyle;
        return b;
    }

    private static bool EqNumbering(NumberingProps? a, NumberingProps? b) =>
        a is null ? b is null : b is not null && a.Kind == b.Kind && a.Ilvl == b.Ilvl;

    private static bool EqEdge(DocxBorderEdge? a, DocxBorderEdge? b) =>
        a is null ? b is null : b is not null && a.Style == b.Style && a.SizeEighthPt == b.SizeEighthPt && a.Color == b.Color && a.SpacePt == b.SpacePt;

    private static bool EqBorders(ParagraphBorders? a, ParagraphBorders? b) =>
        a is null ? b is null : b is not null && EqEdge(a.Top, b.Top) && EqEdge(a.Left, b.Left) && EqEdge(a.Bottom, b.Bottom) && EqEdge(a.Right, b.Right);

    private static bool EqTabs(List<TabStop>? a, List<TabStop>? b)
    {
        if (a is null || b is null) return a is null && b is null;
        if (a.Count != b.Count) return false;
        for (int i = 0; i < a.Count; i++)
            if (a[i].PosTwips != b[i].PosTwips || a[i].Align != b[i].Align || a[i].Leader != b[i].Leader) return false;
        return true;
    }

    /// <summary>pPr DIRETO efetivo (mesma lógica de DirectRPr para parágrafos).</summary>
    public static PPr DirectPPr(Paragraph para)
    {
        var b = para.Ppr is not null ? para.Ppr.Clone() : new PPr();
        var p = para.Props;
        var orig = DocumentReader.ParaPropsFromPPr(para.Ppr);
        if (p.Alignment != orig.Alignment) b.Jc = Js.Truthy(p.Alignment) ? p.Alignment : null;
        if (p.StyleId != orig.StyleId) b.PStyle = Js.Truthy(p.StyleId) ? p.StyleId : null;
        if (!EqNumbering(p.Numbering, orig.Numbering))
        {
            if (p.Numbering is null) b.NumPr = new NumPr { NumId = 0 };
            else if (para.Ppr?.NumPr?.NumId is { } nid && nid != 0 && !double.IsNaN(nid)) b.NumPr = new NumPr { NumId = nid, Ilvl = p.Numbering.Ilvl };
            else b.NumPr = new NumPr { NumId = p.Numbering.Kind == "decimal" ? 1002 : 1001, Ilvl = p.Numbering.Ilvl };
        }
        if (p.IndentLeftTwips != orig.IndentLeftTwips || p.IndentRightTwips != orig.IndentRightTwips || p.IndentFirstLineTwips != orig.IndentFirstLineTwips)
        {
            var ind = b.Ind?.Clone() ?? new IndSpec();
            ind.Left = p.IndentLeftTwips;
            ind.Right = p.IndentRightTwips;
            ind.FirstLine = null; ind.Hanging = null;
            if (p.IndentFirstLineTwips is { } fl)
            {
                if (fl < 0) ind.Hanging = -fl;
                else ind.FirstLine = fl;
            }
            b.Ind = ind;
        }
        if (p.LineTwentieths != orig.LineTwentieths || p.SpaceAfterTwips != orig.SpaceAfterTwips || p.SpaceBeforeTwips != orig.SpaceBeforeTwips)
        {
            var sp = (b.Spacing ?? new SpacingSpec()).With(null);
            if (p.LineTwentieths != orig.LineTwentieths)
            {
                if (p.LineTwentieths is { } lt) { sp.Line = lt; sp.LineRule = "auto"; } else { sp.Line = null; sp.LineRule = null; }
            }
            if (p.SpaceAfterTwips != orig.SpaceAfterTwips) sp.After = p.SpaceAfterTwips;
            if (p.SpaceBeforeTwips != orig.SpaceBeforeTwips) sp.Before = p.SpaceBeforeTwips;
            b.Spacing = sp;
        }
        if (p.ShadingHex != orig.ShadingHex)
        {
            b.Shd = Js.Truthy(p.ShadingHex) ? new ShadingSpec { Val = "clear", Fill = p.ShadingHex } : null;
        }
        if (!EqBorders(p.Borders, orig.Borders))
        {
            if (p.Borders is null) b.PBdr = null;
            else
            {
                var pb = new PBdr();
                foreach (var (side, e) in new[] { ("top", p.Borders.Top), ("left", p.Borders.Left), ("bottom", p.Borders.Bottom), ("right", p.Borders.Right) })
                {
                    if (e is not null) pb.Set(side, new BorderSpec { Val = e.Style, Sz = e.SizeEighthPt, Space = e.SpacePt, Color = Js.Truthy(e.Color) ? e.Color : null });
                }
                b.PBdr = pb;
            }
        }
        if (!EqTabs(p.TabStops, orig.TabStops))
        {
            b.Tabs = (p.TabStops ?? new List<TabStop>())
                .Select(t => new TabSpec { Val = t.Align, Pos = t.PosTwips, Leader = Js.Truthy(t.Leader) ? t.Leader : null }).ToList();
        }
        if (p.PageBreakBefore != orig.PageBreakBefore) b.PageBreakBefore = p.PageBreakBefore;
        return b;
    }
}

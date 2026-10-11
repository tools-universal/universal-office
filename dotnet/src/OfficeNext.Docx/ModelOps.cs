namespace OfficeNext.Docx;

/// <summary>Posição no documento (parágrafo + offset em caracteres).</summary>
public readonly record struct DocPosition(int Para, int Offset);

public readonly record struct DocRange(DocPosition Start, DocPosition End);

/// <summary>
/// Patch parcial de RunProps (espelho de Partial&lt;RunProps&gt; do JS) —
/// só os campos não-nulos são aplicados.
/// </summary>
public sealed class RunPropsPatch
{
    public bool? Bold;
    public bool? Italic;
    public bool? Underline;
    public string? UnderlineStyle;
    public string? UnderlineColor;
    public bool? Strike;
    public bool? DoubleStrike;
    public string? VertAlign;
    public int? SzHalfPt;
    public string? Color;
    public string? Highlight;
    public string? FontAscii;
    public bool? AllCaps;
    public bool? SmallCaps;
    public int? CharSpacingTwips;

    public void ApplyTo(RunProps p)
    {
        if (Bold is bool b) p.Bold = b;
        if (Italic is bool i) p.Italic = i;
        if (Underline is bool u) p.Underline = u;
        if (UnderlineStyle is not null) p.UnderlineStyle = UnderlineStyle;
        if (UnderlineColor is not null) p.UnderlineColor = UnderlineColor;
        if (Strike is bool st) p.Strike = st;
        if (DoubleStrike is bool ds) p.DoubleStrike = ds;
        if (VertAlign is not null) p.VertAlign = VertAlign;
        if (SzHalfPt is int sz) p.SzHalfPt = sz;
        if (Color is not null) p.Color = Color;
        if (Highlight is not null) p.Highlight = Highlight;
        if (FontAscii is not null) p.FontAscii = FontAscii;
        if (AllCaps is bool ac) p.AllCaps = ac;
        if (SmallCaps is bool sc) p.SmallCaps = sc;
        if (CharSpacingTwips is int cs) p.CharSpacingTwips = cs;
    }
}

/// <summary>
/// Operações de edição sobre o DocumentModel — porta de docx-core/src/model-ops.ts.
/// Formatação parcial divide runs no limite exato; merges herdam props do
/// SEGUNDO parágrafo (identidade na marca ¶ final); runs adjacentes idênticos
/// são normalizados.
/// </summary>
public static class ModelOps
{
    public static string ParaText(Paragraph p) => string.Concat(p.Runs.Select(r => r.Text));
    public static int ParaLength(Paragraph p) => p.Runs.Sum(r => r.Text.Length);

    public static int ComparePos(DocPosition a, DocPosition b) =>
        a.Para != b.Para ? a.Para - b.Para : a.Offset - b.Offset;

    public static DocRange NormalizeRange(DocRange r) =>
        ComparePos(r.Start, r.End) <= 0 ? r : new DocRange(r.End, r.Start);

    private static bool SameProps(RunProps a, RunProps b) =>
        a.Bold == b.Bold && a.Italic == b.Italic && a.Underline == b.Underline &&
        a.UnderlineStyle == b.UnderlineStyle && a.UnderlineColor == b.UnderlineColor &&
        a.Strike == b.Strike && a.DoubleStrike == b.DoubleStrike &&
        a.VertAlign == b.VertAlign && a.SzHalfPt == b.SzHalfPt &&
        a.Color == b.Color && a.Highlight == b.Highlight && a.FontAscii == b.FontAscii &&
        a.AllCaps == b.AllCaps && a.SmallCaps == b.SmallCaps &&
        SameComments(a.CommentIds, b.CommentIds);

    private static bool SameComments(List<int>? a, List<int>? b)
    {
        if (ReferenceEquals(a, b)) return true;
        if (a is null || b is null || a.Count != b.Count) return false;
        for (int i = 0; i < a.Count; i++) if (a[i] != b[i]) return false;
        return true;
    }

    /// <summary>
    /// Formatação tipada original (rPr) igual? Runs com rPr diferente não se fundem
    /// (estilo de caractere, efeitos que as props de edição não representam).
    /// O JS compara por JSON.stringify (ordem de chaves = ordem dos elementos no
    /// XML); aqui a comparação é estrutural (mesmo conteúdo em qualquer ordem).
    /// </summary>
    private static bool SameRPr(Run a, Run b) => ReferenceEquals(a.Rpr, b.Rpr) || DeepEquals(a.Rpr, b.Rpr);

    private static bool DeepEquals(object? a, object? b)
    {
        if (ReferenceEquals(a, b)) return true;
        if (a is null || b is null || a.GetType() != b.GetType()) return false;
        var t = a.GetType();
        if (t.IsPrimitive || a is string || a is decimal) return a.Equals(b);
        if (a is System.Collections.IList la && b is System.Collections.IList lb)
        {
            if (la.Count != lb.Count) return false;
            for (int i = 0; i < la.Count; i++) if (!DeepEquals(la[i], lb[i])) return false;
            return true;
        }
        foreach (var f in t.GetFields(System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic))
            if (!DeepEquals(f.GetValue(a), f.GetValue(b))) return false;
        return true;
    }

    /// <summary>Extras de TEXTO que acompanham cada pedaço de um run dividido.</summary>
    private static Run TextExtras(Run run) => new()
    {
        Field = string.IsNullOrEmpty(run.Field) ? null : run.Field,
        Rpr = run.Rpr,
        SymFont = string.IsNullOrEmpty(run.SymFont) ? null : run.SymFont,
        InToc = run.InToc,
    };

    /// <summary>Runs especiais (imagem/campo/nota/plugin/caixa/forma/grupo/ptab) nunca se fundem e preservam extras.</summary>
    private static bool IsSpecial(Run r) => r.Image is not null || Js.Truthy(r.Field) || r.NoteRef is not null || r.Custom is not null
        || r.Textbox is not null || r.Shape is not null || r.Group is not null || r.Ptab is not null;

    public static void NormalizeParagraph(Paragraph p)
    {
        var outp = new List<Run>();
        foreach (var run in p.Runs)
        {
            if (run.Text.Length == 0 && !IsSpecial(run)) continue;
            var last = outp.Count > 0 ? outp[^1] : null;
            if (last is not null && !IsSpecial(last) && !IsSpecial(run) && SameProps(last.Props, run.Props) && SameRPr(last, run)
                && last.FieldResult is null && run.FieldResult is null && last.Field == run.Field)
                last.Text += run.Text;
            else
            {
                var c = run.ShallowClone();
                c.Props = run.Props.Clone();
                outp.Add(c);
            }
        }
        p.Runs = outp;
    }

    /// <summary>Divide o run que contém offset, retornando o índice do run que começa ali.</summary>
    private static int SplitAt(Paragraph p, int offset)
    {
        int acc = 0;
        for (int i = 0; i < p.Runs.Count; i++)
        {
            var run = p.Runs[i];
            if (offset == acc) return i;
            if (offset < acc + run.Text.Length)
            {
                var head = TextExtras(run);
                head.Text = run.Text[..(offset - acc)];
                head.Props = run.Props.Clone();
                var tail = TextExtras(run);
                tail.Text = run.Text[(offset - acc)..];
                tail.Props = run.Props.Clone();
                p.Runs.RemoveAt(i);
                p.Runs.Insert(i, head);
                p.Runs.Insert(i + 1, tail);
                return i + 1;
            }
            acc += run.Text.Length;
        }
        return p.Runs.Count;
    }

    /// <summary>Props efetivas no ponto de inserção (herda do caractere anterior).</summary>
    public static RunProps PropsAt(DocumentModel model, DocPosition pos)
    {
        if (pos.Para >= model.Paragraphs.Count) return new RunProps();
        var p = model.Paragraphs[pos.Para];
        if (p.Runs.Count == 0) return new RunProps();
        int acc = 0;
        foreach (var run in p.Runs)
        {
            if (pos.Offset <= acc + run.Text.Length) return run.Props.Clone();
            acc += run.Text.Length;
        }
        return p.Runs[^1].Props.Clone();
    }

    /// <summary>rPr do run onde o texto entra (o anterior, como PropsAt).</summary>
    private static RPr? RprAt(DocumentModel model, DocPosition pos)
    {
        if (pos.Para >= model.Paragraphs.Count) return null;
        var p = model.Paragraphs[pos.Para];
        if (p.Runs.Count == 0) return null;
        int acc = 0;
        foreach (var run in p.Runs)
        {
            if (pos.Offset <= acc + run.Text.Length && !IsSpecial(run)) return run.Rpr;
            acc += run.Text.Length;
        }
        for (int i = p.Runs.Count - 1; i >= 0; i--) if (!IsSpecial(p.Runs[i])) return p.Runs[i].Rpr;
        return null;
    }

    public static DocPosition InsertText(DocumentModel model, DocPosition pos, string text, RunProps? props = null)
    {
        var p = model.Paragraphs[pos.Para];
        var effective = props ?? PropsAt(model, pos);
        // o texto novo herda a formatação tipada (rPr) do run vizinho, como herda as props
        var rpr = RprAt(model, pos);
        int idx = SplitAt(p, pos.Offset);
        p.Runs.Insert(idx, new Run { Text = text, Props = effective.Clone(), Rpr = rpr });
        NormalizeParagraph(p);
        return new DocPosition(pos.Para, pos.Offset + text.Length);
    }

    public static DocPosition SplitParagraph(DocumentModel model, DocPosition pos)
    {
        var p = model.Paragraphs[pos.Para];
        int idx = SplitAt(p, pos.Offset);
        var tailRuns = p.Runs.Skip(idx).ToList();
        p.Runs = p.Runs.Take(idx).ToList();
        var tail = new Paragraph { Runs = tailRuns, Props = p.Props.Clone() };
        model.Paragraphs.Insert(pos.Para + 1, tail);
        NormalizeParagraph(p);
        NormalizeParagraph(tail);
        return new DocPosition(pos.Para + 1, 0);
    }

    public static DocPosition DeleteRange(DocumentModel model, DocRange range)
    {
        var (start, end) = NormalizeRange(range);
        if (start.Para == end.Para)
        {
            var p = model.Paragraphs[start.Para];
            RebuildDelete(p, start.Offset, end.Offset);
            NormalizeParagraph(p);
            return start;
        }
        var first = model.Paragraphs[start.Para];
        var last = model.Paragraphs[end.Para];
        RebuildDelete(first, start.Offset, ParaLength(first));
        RebuildDelete(last, 0, end.Offset);
        first.Runs = first.Runs.Concat(last.Runs).ToList();
        first.Props = last.Props.Clone(); // herda props do ÚLTIMO parágrafo
        model.Paragraphs.RemoveRange(start.Para + 1, end.Para - start.Para);
        NormalizeParagraph(first);
        return start;
    }

    /// <summary>Remove [from,to) reconstruindo os runs.</summary>
    private static void RebuildDelete(Paragraph p, int from, int to)
    {
        var outp = new List<Run>();
        int acc = 0;
        foreach (var run in p.Runs)
        {
            int rs = acc;
            int re = acc + run.Text.Length;
            acc = re;
            string keepHead = run.Text[..Math.Max(0, Math.Min(from, re) - rs)];
            string keepTail = re > to ? run.Text[Math.Max(0, to - rs)..] : "";
            string text = keepHead + keepTail;
            if (text.Length > 0)
            {
                // inteiro: o run segue como era (todos os extras); parcial: extras de texto
                bool intact = text.Length == run.Text.Length;
                Run r;
                if (intact) { r = run.ShallowClone(); r.Text = text; }
                else { r = TextExtras(run); r.Text = text; r.Props = run.Props; }
                outp.Add(r);
            }
        }
        p.Runs = outp;
    }

    /// <summary>Funde o parágrafo `para` com o anterior (Backspace no início).</summary>
    public static DocPosition MergeWithPrevious(DocumentModel model, int para)
    {
        var prev = model.Paragraphs[para - 1];
        var cur = model.Paragraphs[para];
        int offset = ParaLength(prev);
        prev.Runs = prev.Runs.Concat(cur.Runs).ToList();
        prev.Props = cur.Props.Clone(); // sobrevive a identidade do SEGUNDO
        model.Paragraphs.RemoveAt(para);
        NormalizeParagraph(prev);
        return new DocPosition(para - 1, offset);
    }

    public static void ApplyRunProps(DocumentModel model, DocRange range, RunPropsPatch patch)
    {
        var (start, end) = NormalizeRange(range);
        for (int pi = start.Para; pi <= end.Para; pi++)
        {
            var p = model.Paragraphs[pi];
            int from = pi == start.Para ? start.Offset : 0;
            int to = pi == end.Para ? end.Offset : ParaLength(p);
            if (to <= from) continue;
            SplitAt(p, to);
            int i1 = SplitAt(p, from);
            int acc = 0;
            for (int ri = 0; ri < p.Runs.Count; ri++)
            {
                int rs = acc;
                acc += p.Runs[ri].Text.Length;
                if (ri < i1) continue;
                if (rs >= to) break;
                patch.ApplyTo(p.Runs[ri].Props);
            }
            NormalizeParagraph(p);
        }
    }
}

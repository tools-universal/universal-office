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

    /// <summary>Runs especiais (imagem/campo/nota) nunca se fundem.</summary>
    private static bool IsSpecial(Run r) => r.Image is not null || r.Field is not null || r.NoteRef is not null;

    public static void NormalizeParagraph(Paragraph p)
    {
        var outp = new List<Run>();
        foreach (var run in p.Runs)
        {
            if (run.Text.Length == 0 && !IsSpecial(run)) continue;
            var last = outp.Count > 0 ? outp[^1] : null;
            if (last is not null && !IsSpecial(last) && !IsSpecial(run) && SameProps(last.Props, run.Props))
                last.Text += run.Text;
            else
                outp.Add(new Run
                {
                    Text = run.Text, Props = run.Props.Clone(),
                    Image = run.Image, NoteRef = run.NoteRef, Field = run.Field,
                });
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
                var head = new Run { Text = run.Text[..(offset - acc)], Props = run.Props.Clone(), Field = run.Field };
                var tail = new Run { Text = run.Text[(offset - acc)..], Props = run.Props.Clone(), Field = run.Field };
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

    public static DocPosition InsertText(DocumentModel model, DocPosition pos, string text, RunProps? props = null)
    {
        var p = model.Paragraphs[pos.Para];
        var effective = props ?? PropsAt(model, pos);
        int idx = SplitAt(p, pos.Offset);
        p.Runs.Insert(idx, new Run { Text = text, Props = effective.Clone() });
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
                bool intact = text.Length == run.Text.Length;
                outp.Add(new Run
                {
                    Text = text,
                    Props = run.Props,
                    Field = run.Field,
                    Image = intact ? run.Image : null,
                    NoteRef = intact ? run.NoteRef : null,
                });
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

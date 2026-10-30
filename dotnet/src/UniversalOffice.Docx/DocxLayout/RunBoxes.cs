using System.Text.RegularExpressions;
using UniversalOffice.Docx;

namespace UniversalOffice.DocxLayout;

/// <summary>
/// Navegação pelas referências das linhas do motor ("b12", "b3/r0/c1/b0"…) de
/// volta aos parágrafos do documento (porta de docx-layout/src/refs.ts).
/// </summary>
public static class LineRefs
{
    private static readonly Regex BlockStep = new(@"^b(\d+)$", RegexOptions.CultureInvariant);
    private static readonly Regex RowStep = new(@"^r(\d+)$", RegexOptions.CultureInvariant);
    private static readonly Regex ColStep = new(@"^c(\d+)$", RegexOptions.CultureInvariant);

    /// <summary>Célula da linha <paramref name="r"/> que começa na coluna <paramref name="c"/> da grade (gridBefore + spans).</summary>
    public static TableCell? CellAtGrid(TableBlock t, int r, int c)
    {
        if (r < 0 || r >= t.Rows.Count) return null;
        var row = t.Rows[r];
        int col = (int)(row.TrPr?.GridBefore ?? 0);
        foreach (var cell in row.Cells)
        {
            if (col == c) return cell;
            col += Math.Max(1, (int)(cell.TcPr?.GridSpan ?? cell.GridSpan));
        }
        return null;
    }

    /// <summary>Blocos de uma célula na ordem (como o motor os lê).</summary>
    public static IReadOnlyList<Block> CellBlocks(TableCell cell) =>
        cell.Blocks ?? cell.Paragraphs.Select(p => (Block)new ParagraphBlock { Paragraph = p }).ToList();

    /// <summary>Parágrafo no caminho "b&lt;i&gt;[/r&lt;r&gt;/c&lt;c&gt;/b&lt;k&gt;…]" de uma lista de blocos.</summary>
    public static Paragraph? ParagraphAtPath(IReadOnlyList<Block> blocks, IReadOnlyList<string> path)
    {
        var list = blocks;
        for (int i = 0; i < path.Count; i += 3)
        {
            var b = BlockStep.Match(path[i]);
            if (!b.Success) return null;
            int bi = int.Parse(b.Groups[1].Value);
            if (bi >= list.Count) return null;
            var blk = list[bi];
            if (i + 1 >= path.Count) return blk is ParagraphBlock pb ? pb.Paragraph : null;
            var r = RowStep.Match(i + 1 < path.Count ? path[i + 1] : "");
            var c = ColStep.Match(i + 2 < path.Count ? path[i + 2] : "");
            if (blk is not TableBlock tb || !r.Success || !c.Success) return null;
            var cell = CellAtGrid(tb, int.Parse(r.Groups[1].Value), int.Parse(c.Groups[1].Value));
            if (cell is null) return null;
            list = CellBlocks(cell);
        }
        return null;
    }
}

/// <summary>Caixa (twips) de um run escolhido numa linha diagramada.</summary>
public sealed record RunBox<T>(int Page, double X, double Y, double W, double H, double Baseline, Run Run, T Value);

/// <summary>
/// Onde os runs de um tipo foram parar nas páginas (porta de
/// docx-layout/src/run-boxes.ts): por linha, a extensão dos caracteres do run.
/// Só o corpo (refs "b…").
/// </summary>
public static class RunBoxes
{
    /// <summary>
    /// Caracteres da linha com o texto de reserva de cada inline de plugin juntado num
    /// caractere só: o motor desenha o texto de reserva com offsets a partir do do inline
    /// (1 caractere no modelo), que colidem com os do run seguinte (porta de
    /// collapseCustomInlineChars em docx-layout/src/run-boxes.ts).
    /// </summary>
    public static List<LineChar> CollapseCustomInlineChars(IReadOnlyList<LineChar> chars, Paragraph paragraph)
    {
        var outp = chars.ToList();
        int acc = 0;
        foreach (var run in paragraph.Runs)
        {
            int a = acc;
            acc += run.Text.Length;
            if (run.Custom is null) continue;
            int n = Math.Max(1, (run.Custom.FallbackText.Length > 0 ? run.Custom.FallbackText : " ").EnumerateRunes().Count());
            int i = outp.FindIndex(c => c.O == a);
            if (i < 0) continue;
            int j = i;
            while (j + 1 < outp.Count && j - i + 1 < n && outp[j + 1].O == outp[j].O + 1) j++;
            var last = outp[j];
            var merged = new LineChar(a, outp[i].X, last.X + last.W - outp[i].X);
            outp.RemoveRange(i, j - i + 1);
            outp.Insert(i, merged);
        }
        return outp;
    }

    public static List<RunBox<T>> Collect<T>(FullDocument full, LayoutResult layout, Func<Run, T?> pick)
    {
        var paras = new Dictionary<string, Paragraph?>(StringComparer.Ordinal);
        Paragraph? Para(string @ref)
        {
            if (!paras.TryGetValue(@ref, out var p))
            {
                p = @ref.Length > 1 && @ref[0] == 'b' && char.IsDigit(@ref[1]) ? LineRefs.ParagraphAtPath(full.Blocks, @ref.Split('/')) : null;
                paras[@ref] = p;
            }
            return p;
        }
        var outp = new List<RunBox<T>>();
        for (int pi = 0; pi < layout.Pages.Count; pi++)
        {
            foreach (var line in layout.Pages[pi].Lines)
            {
                var p = Para(line.Ref);
                if (p is null || line.Chars is not { Count: > 0 } lineChars) continue;
                IReadOnlyList<LineChar> chars = p.Runs.Any(r => r.Custom is not null) ? CollapseCustomInlineChars(lineChars, p) : lineChars;
                int acc = 0;
                foreach (var run in p.Runs)
                {
                    int a = acc;
                    acc += run.Text.Length;
                    if (acc <= line.Start || a >= line.End) continue;
                    var value = pick(run);
                    if (value is null || value is string { Length: 0 }) continue;
                    double x1 = double.PositiveInfinity, x2 = double.NegativeInfinity;
                    foreach (var c in chars)
                    {
                        if (c.O < a || c.O >= acc) continue;
                        x1 = Math.Min(x1, c.X);
                        x2 = Math.Max(x2, c.X + c.W);
                    }
                    if (!(x2 > x1)) continue;
                    outp.Add(new RunBox<T>(pi, x1, line.Y, x2 - x1, line.Height, line.Baseline, run, value));
                }
            }
        }
        return outp;
    }
}

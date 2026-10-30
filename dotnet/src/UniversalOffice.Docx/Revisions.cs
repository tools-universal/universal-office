namespace UniversalOffice.Docx;

/// <summary>
/// Controle de alterações no modelo — porta da parte de leitura de
/// docx-core/src/revisions.ts: a visão FINAL (o que exportações enxergam) e os
/// autores na ordem de leitura (cor por autor no motor de layout). Listar,
/// aceitar/rejeitar e editar com o controle ligado ficam só no JS (editor).
/// </summary>
public static class Revisions
{
    /// <summary>Run excluído em revisão (fica no modelo; a visão final o esconde).</summary>
    public static bool IsDeletedRun(Run r) => r.Props.Del is not null;

    /// <summary>Runs da visão FINAL (sem o texto excluído) — exportações, contagem, diff.</summary>
    public static List<Run> FinalRuns(Paragraph p) =>
        p.Runs.Any(IsDeletedRun) ? p.Runs.Where(r => r.Props.Del is null).ToList() : p.Runs;

    /// <summary>
    /// Visão FINAL de uma lista de parágrafos (como se tudo fosse aceito): sem o texto
    /// excluído, e o parágrafo de marca excluída junto do seguinte, com a formatação do
    /// seguinte (a marca que sobra) — o que exportações e o diff enxergam.
    /// <c>Index[i]</c>: posição, na saída, do parágrafo que recebe o texto do i-ésimo.
    /// </summary>
    public static (List<Paragraph> Paras, int[] Index) FinalParagraphs(IReadOnlyList<Paragraph> paras)
    {
        var outp = new List<Paragraph>();
        var index = new int[paras.Count];
        var carry = new List<Run>();
        for (int i = 0; i < paras.Count; i++)
        {
            var p = paras[i];
            var own = FinalRuns(p);
            var runs = carry.Count > 0 ? carry.Concat(own).ToList() : own;
            index[i] = outp.Count;
            if (p.Props.MarkDel is not null && i < paras.Count - 1) { carry = runs; continue; }
            carry = new List<Run>();
            outp.Add(ReferenceEquals(runs, p.Runs) ? p : new Paragraph { Runs = runs, Props = p.Props, Ppr = p.Ppr });
        }
        return (outp, index);
    }

    /// <summary>FinalParagraphs nos blocos (parágrafos seguidos; dentro das células também).</summary>
    public static List<Block> FinalBlocks(IReadOnlyList<Block> blocks)
    {
        var outp = new List<Block>();
        var run = new List<Paragraph>();
        void Flush()
        {
            if (run.Count == 0) return;
            foreach (var paragraph in FinalParagraphs(run).Paras) outp.Add(new ParagraphBlock { Paragraph = paragraph });
            run = new List<Paragraph>();
        }
        foreach (var b in blocks)
        {
            if (b is ParagraphBlock pb) { run.Add(pb.Paragraph); continue; }
            Flush();
            var t = ((TableBlock)b).ShallowClone();
            t.Rows = t.Rows.Select(row =>
            {
                var r = row.ShallowClone();
                r.Cells = row.Cells.Select(cell =>
                {
                    var c = cell.ShallowClone();
                    c.Paragraphs = FinalParagraphs(cell.Paragraphs).Paras;
                    if (cell.Blocks is not null) c.Blocks = FinalBlocks(cell.Blocks);
                    return c;
                }).ToList();
                return r;
            }).ToList();
            outp.Add(t);
        }
        Flush();
        return outp;
    }

    /// <summary>O parágrafo tem alguma revisão (texto, formatação ou marca)?</summary>
    public static bool ParagraphHasRevisions(Paragraph p) =>
        p.Props.MarkIns is not null || p.Props.MarkDel is not null || p.Props.Pfmt is not null
        || p.Runs.Any(r => r.Props.Ins is not null || r.Props.Del is not null || r.Props.Fmt is not null);

    // ───────────────────────── autores ─────────────────────────

    /// <summary>Autores das revisões na ordem de leitura (corpo, cabeçalhos/rodapés, notas) —
    /// a ordem em que o Word os encontra e lhes dá cor.</summary>
    public static List<string> RevisionAuthors(FullDocument full)
    {
        var seen = new List<string>();
        var set = new HashSet<string>(StringComparer.Ordinal);
        void Add(RevisionInfo? r)
        {
            if (r is not null && set.Add(r.Author)) seen.Add(r.Author);
        }
        void Para(Paragraph p)
        {
            Add(p.Props.Pfmt);
            foreach (var r in p.Runs)
            {
                Add(r.Props.Del); Add(r.Props.Ins); Add(r.Props.Fmt);
                if (r.Textbox?.Blocks is not null) Blocks(r.Textbox.Blocks);
                else if (r.Textbox?.Paras is not null) foreach (var tp in r.Textbox.Paras) Para(tp);
            }
            Add(p.Props.MarkIns); Add(p.Props.MarkDel);
        }
        void Blocks(IEnumerable<Block> bs)
        {
            foreach (var b in bs)
            {
                if (b is ParagraphBlock pb) Para(pb.Paragraph);
                else foreach (var row in ((TableBlock)b).Rows)
                        foreach (var cell in row.Cells)
                            Blocks(cell.Blocks ?? cell.Paragraphs.Select(paragraph => (Block)new ParagraphBlock { Paragraph = paragraph }));
            }
        }
        Blocks(full.Blocks);
        foreach (var s in full.Sections)
        {
            foreach (var set2 in new[] { s.HeaderBlocks, s.FooterBlocks })
            {
                if (set2 is null) continue;
                foreach (var b in new[] { set2.Default, set2.First, set2.Even }) if (b is not null) Blocks(b);
            }
        }
        foreach (var m in new[] { full.FootnoteBlocks, full.EndnoteBlocks })
            if (m is not null) foreach (var b in m.Values) Blocks(b);
        return seen;
    }

    /// <summary>JSON.stringify(a) === JSON.stringify(b) do JS (igualdade estrutural).</summary>
    public static bool SameJson(object? a, object? b) => ModelOps.DeepEquals(a, b);
}

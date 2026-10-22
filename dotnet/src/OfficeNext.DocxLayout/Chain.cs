using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using OfficeNext.Docx;

namespace OfficeNext.DocxLayout;

/// <summary>Cadeia de caixas de texto vinculadas.</summary>
internal sealed class TextboxChain
{
    /// <summary>a 1ª caixa (com o conteúdo) e as vinculadas, na ordem do seq</summary>
    public List<DrawingTextbox> Members = new();
}

/// <summary>
/// Caixas de texto VINCULADAS (wps:txbx id + wps:linkedTxbx id/seq): o conteúdo da 1ª
/// caixa da cadeia flui pelas seguintes — cada caixa com a sua largura (o resto quebra de
/// novo), viúvas/órfãs e o espaço depois como na quebra de linha de tabela; o que não cabe
/// na última fica nela (transborda, recortado). Oráculo txbxlink. Porta de
/// docx-layout/src/chain.ts.
/// </summary>
internal static class Chain
{
    private sealed class Marker { }
    private static readonly Marker Mark = new();

    /// <summary>Parágrafos que continuam um parágrafo partido na caixa anterior (sem marcador, sem
    /// recuo da 1ª linha, sem espaço antes) — LayoutStatic passa Continuation ao preparar.</summary>
    private static readonly ConditionalWeakTable<Paragraph, Marker> Continuation = new();

    public static bool IsContinuation(Paragraph p) => Continuation.TryGetValue(p, out _);

    /// <summary>Cadeias do documento: o corpo e cada cabeçalho/rodapé à parte (os ids das histórias
    /// são da parte). Caixa → a cadeia dela.</summary>
    public static Dictionary<DrawingTextbox, TextboxChain> IndexChains(FullDocument full)
    {
        var outp = new Dictionary<DrawingTextbox, TextboxChain>(ReferenceEqualityComparer.Instance);
        void Scan(List<Block> blocks)
        {
            // (Map do JS: ordem de inserção)
            var heads = new List<(int Id, DrawingTextbox Tb)>();
            var headIds = new HashSet<int>();
            var links = new List<DrawingTextbox>();
            FullDocReader.ForEachTextbox(blocks, (tb, _) =>
            {
                if (tb.Link is not null) links.Add(tb);
                else if (tb.Story is { } s && headIds.Add(s)) heads.Add((s, tb));
            });
            if (links.Count == 0) return;
            foreach (var (id, head) in heads)
            {
                // (ordenação estável, como o sort do JS)
                var ms = links.Where(l => l.Link!.Id == id).OrderBy(l => l.Link!.Seq).ToList();
                if (ms.Count == 0) continue;
                var chain = new TextboxChain();
                chain.Members.Add(head);
                chain.Members.AddRange(ms);
                foreach (var m in chain.Members) outp[m] = chain;
            }
        }
        Scan(full.Blocks);
        var seen = new HashSet<List<Block>>(ReferenceEqualityComparer.Instance);
        foreach (var s in full.Sections)
        {
            foreach (var set in new[] { s.HeaderBlocks, s.FooterBlocks })
            {
                if (set is null) continue;
                foreach (var bs in new[] { set.Default, set.First, set.Even })
                {
                    if (bs is not null && seen.Add(bs)) Scan(bs);
                }
            }
        }
        return outp;
    }

    /// <summary>O parágrafo a partir de <paramref name="offset"/> (no texto concatenado dos runs): a
    /// continuação na caixa seguinte. Run cortado no meio vira dois; campo/objeto não se corta
    /// (fica inteiro).</summary>
    public static Paragraph SliceParagraphFrom(Paragraph p, double offset)
    {
        var runs = new List<Run>();
        double pos = 0;
        foreach (var r in p.Runs)
        {
            int len = r.Text.Length;
            if (pos + len <= offset) { pos += len; continue; }
            if (pos >= offset || Js.Truthy(r.Field) || r.FieldResult is not null || r.Image is not null || r.Textbox is not null
                || r.Shape is not null || r.Group is not null || r.Custom is not null || r.Math is not null)
                runs.Add(r);
            else
            {
                var c = r.ShallowClone();
                c.Text = r.Text[(int)(offset - pos)..];
                runs.Add(c);
            }
            pos += len;
        }
        var outp = new Paragraph { Runs = runs, Props = p.Props, Ppr = p.Ppr };
        Continuation.AddOrUpdate(outp, Mark);
        return outp;
    }

    private static readonly Regex TopBlockRe = new(@"^[^/]+/b([0-9]+)", RegexOptions.CultureInvariant);
    private static readonly Regex LineRefRe = new(@"^([^/]+)/b([0-9]+)(.*)$", RegexOptions.CultureInvariant);

    /// <summary>Bloco de cima do ref de uma linha do conteúdo ("txbx/b3", "txbx/b3/r0/c1/b0" → 3).</summary>
    public static int TopBlockOf(string reference)
    {
        var m = TopBlockRe.Match(reference);
        return m.Success ? int.Parse(m.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture) : -1;
    }

    private static readonly Regex TopRowRe = new(@"^[^/]+/b[0-9]+/r([0-9]+)/", RegexOptions.CultureInvariant);
    private static readonly Regex RowHeadRe = new(@"^/r([0-9]+)", RegexOptions.CultureInvariant);

    /// <summary>Linha de tabela do ref de uma linha do conteúdo ("txbx/b3/r2/c0/b0" → 2), ou -1.</summary>
    public static int TopRowOf(string reference)
    {
        var m = TopRowRe.Match(reference);
        return m.Success ? int.Parse(m.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture) : -1;
    }

    /// <summary>Refs e offsets das linhas do resto para os blocos ORIGINAIS: o bloco j do resto é o
    /// map[j] do conteúdo da 1ª caixa; o 1º, se continua um parágrafo, soma <paramref name="cont"/>
    /// aos offsets; se é o resto de uma tabela partida entre as caixas, soma <paramref name="rows"/>
    /// às linhas dela.</summary>
    public static List<LaidOutLine> RemapLines(IReadOnlyList<LaidOutLine> lines, IReadOnlyList<int> map, double cont, int rows = 0)
    {
        return lines.Select(l =>
        {
            var m = LineRefRe.Match(l.Ref);
            if (!m.Success) return l;
            int j = int.Parse(m.Groups[2].Value, System.Globalization.CultureInfo.InvariantCulture);
            string rest = m.Groups[3].Value;
            string tail = j == 0 && rows != 0
                ? RowHeadRe.Replace(rest, mm => "/r" + (int.Parse(mm.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture) + rows).ToString(System.Globalization.CultureInfo.InvariantCulture), 1)
                : rest;
            string reference = $"{m.Groups[1].Value}/b{(j < map.Count ? map[j] : j)}{tail}";
            // offsets só na continuação (o próprio parágrafo, não células de tabela)
            if (j != 0 || cont == 0 || double.IsNaN(cont) || rest.Length > 0)
            {
                if (reference == l.Ref) return l;
                var r = l.ShallowClone();
                r.Ref = reference;
                return r;
            }
            var n = l.ShallowClone();
            n.Ref = reference;
            n.Start = l.Start + cont;
            n.End = l.End + cont;
            if (l.Chars is not null) n.Chars = l.Chars.Select(c => c with { O = c.O + cont }).ToList();
            return n;
        }).ToList();
    }
}

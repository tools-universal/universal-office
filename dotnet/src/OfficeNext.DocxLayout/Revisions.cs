using System.Runtime.CompilerServices;
using OfficeNext.Docx;

namespace OfficeNext.DocxLayout;

/// <summary>
/// Exibição das revisões (controle de alterações) no motor — porta de
/// docx-layout/src/revisions.ts. Medido no Word (write/tools/revisions-oracle,
/// PDF "com marcação"):
///  - inserção sublinhada e exclusão tachada na cor do autor (a cor da revisão
///    vence a cor e o sublinhado do próprio run); movimentação em verde 2C6234,
///    origem com tachado duplo e destino com sublinhado duplo;
///  - formatação controlada não marca o texto (só a barra e o balão);
///  - cor "por autor": paleta de 20 na ordem em que os autores aparecem;
///  - barra de alteração preta de 0,72 pt na margem esquerda, borda esquerda em
///    margem − 36 pt (margem/2 se a margem for menor que 1 pol.), cobrindo a caixa
///    da linha (a 1ª linha com o espaço antes, a última com o depois).
/// Modos (Exibir para Revisão): "final" (padrão, sem marcas — o PDF do Word sem
/// marcação), "simple" (final + barras vermelhas), "all" e "original".
/// </summary>
public sealed class RevisionView
{
    /// <summary>final | simple | all | original</summary>
    public string Mode = "final";
    /// <summary>"Mostrar Marcação": inserções e exclusões (padrão: sim). Desligado, o texto
    /// aparece como ficaria aceito.</summary>
    public bool? InsDel;
    /// <summary>"Mostrar Marcação": formatação (padrão: sim) — só a barra.</summary>
    public bool? Formatting;
    /// <summary>só a marcação destes autores aparece (os demais: como aceito); padrão: todos</summary>
    public IReadOnlyList<string>? Authors;
    /// <summary>cor RRGGBB por autor; padrão: paleta do Word na ordem de <c>Order</c></summary>
    public IReadOnlyDictionary<string, string>? Colors;
    /// <summary>autores na ordem de encontro (cor da paleta); padrão: a ordem de leitura do documento</summary>
    public IReadOnlyList<string>? Order;

    /// <summary>Cópia rasa ({ ...view }).</summary>
    public RevisionView ShallowClone() => (RevisionView)MemberwiseClone();
}

/// <summary>Decisão para um run: esconder (<see cref="Hide"/>), mostrar marcado ou como está (nulo).</summary>
public sealed class RunRevision
{
    public static readonly RunRevision Hide = new() { IsHide = true };
    public bool IsHide;
    public string Color = "";
    /// <summary>ins | del</summary>
    public string Kind = "ins";
    public bool Move;
}

/// <summary>Revisões que pedem barra de alteração num parágrafo (offsets; parágrafo inteiro; marca).</summary>
public sealed class RevBars
{
    /// <summary>faixas [início, fim) no texto do parágrafo; Hidden = texto que a visão esconde</summary>
    public List<(double A, double B, bool Hidden)> Ranges = new();
    public bool Whole;
    public bool Mark;
}

public sealed class RevisionDisplay
{
    public readonly string Mode;
    private readonly bool _insDel;
    private readonly bool _fmt;
    private readonly HashSet<string>? _authors;
    private readonly List<string> _order;
    private readonly IReadOnlyDictionary<string, string> _colors;

    public RevisionDisplay(RevisionView? view, IReadOnlyList<string> docOrder)
    {
        Mode = view?.Mode ?? "final";
        _insDel = view?.InsDel ?? true;
        _fmt = view?.Formatting ?? true;
        _authors = view?.Authors is not null ? new HashSet<string>(view.Authors, StringComparer.Ordinal) : null;
        _order = new List<string>(view?.Order ?? docOrder);
        _colors = view?.Colors ?? new Dictionary<string, string>(StringComparer.Ordinal);
    }

    /// <summary>A marcação desta revisão aparece (modo "all"/"simple", tipo e autor ligados)?</summary>
    private bool Shown(RevisionInfo? r, bool fmt)
    {
        if (r is null) return false;
        if (fmt ? !_fmt : !_insDel) return false;
        return _authors is null || _authors.Contains(r.Author);
    }

    public string Color(string author) =>
        _colors.TryGetValue(author, out var c) ? c : RevisionLayout.AuthorColor(_order, author);

    /// <summary>O run aparece? Marcado? (texto inserido/excluído)</summary>
    public RunRevision? Run(Run run)
    {
        var ins = run.Props.Ins;
        var del = run.Props.Del;
        if (ins is null && del is null) return null;
        if (Mode == "original") return ins is not null ? RunRevision.Hide : null;
        bool marks = Mode == "all";
        if (del is not null)
        {
            if (!marks || !Shown(del, false)) return RunRevision.Hide;
            return new RunRevision { Color = del.Move ? RevisionLayout.MoveColor : Color(del.Author), Kind = "del", Move = del.Move };
        }
        if (!marks || !Shown(ins, false)) return null;
        return new RunRevision { Color = ins!.Move ? RevisionLayout.MoveColor : Color(ins.Author), Kind = "ins", Move = ins.Move };
    }

    /// <summary>rPr direto a desenhar: no modo Original, o de antes da formatação controlada.</summary>
    public RPr DirectRPr(Run run)
    {
        var f = run.Props.Fmt;
        if (Mode != "original" || f is null) return DocContext.DirectRPr(run);
        var c = run.Rpr?.Change;
        // do arquivo e intocada: o rPr antigo exato; criada na edição: as props de antes
        if (c is not null && c.Author == f.Author && c.Date == f.Date && Revisions.SameJson(DocumentReader.RunPropsFromRPr(c.RPr), f.Old)) return c.RPr.Clone();
        var p = run.Props;
        var props = f.Old.Clone();
        if (Js.Truthy(p.Link)) props.Link = p.Link;
        var r = run.ShallowClone();
        r.Props = props;
        return DocContext.DirectRPr(r);
    }

    /// <summary>Parágrafo a diagramar: no modo Original, com a formatação de antes.</summary>
    public Paragraph Paragraph(Paragraph para)
    {
        var f = para.Props.Pfmt;
        if (Mode != "original" || f is null) return para;
        var c = para.Ppr?.Change;
        if (c is not null && c.Author == f.Author && c.Date == f.Date && Revisions.SameJson(DocumentReader.ParaPropsFromPPr(c.PPr), f.Old))
        {
            var ppr = c.PPr.Clone();
            if (para.Ppr?.RPr is not null) ppr.RPr = para.Ppr.RPr;
            var props = DocumentReader.ParaPropsFromPPr(ppr);
            if (para.Props.SectionBreak is not null) props.SectionBreak = para.Props.SectionBreak;
            return new Paragraph { Runs = para.Runs, Ppr = ppr, Props = props };
        }
        var old = f.Old.Clone();
        if (para.Props.SectionBreak is not null) old.SectionBreak = para.Props.SectionBreak;
        return new Paragraph { Runs = para.Runs, Ppr = DocContext.DirectPPr(new Paragraph { Runs = para.Runs, Props = old, Ppr = para.Ppr }), Props = old };
    }

    /// <summary>A marca deste parágrafo some (o texto vai para o seguinte) nesta visão?</summary>
    public bool MarkGone(Paragraph para)
    {
        var markDel = para.Props.MarkDel;
        if (Mode == "original") return para.Props.MarkIns is not null;
        if (markDel is null) return false;
        return Mode != "all" || !Shown(markDel, false);
    }

    /// <summary>A revisão pede barra nesta visão? (texto/marca; <paramref name="fmt"/> = formatação)</summary>
    public bool BarFor(RevisionInfo? r, bool fmt)
    {
        if (r is null || (Mode != "all" && Mode != "simple")) return false;
        if (Mode == "simple") return fmt ? _fmt : _insDel;
        return Shown(r, fmt);
    }

    /// <summary>Cor das barras (nulo = sem barras).</summary>
    public string? BarColor() => Mode == "all" ? RevisionLayout.BarColor : Mode == "simple" ? RevisionLayout.SimpleBarColor : null;
}

public static class RevisionLayout
{
    /// <summary>Paleta "por autor" do Word 365 (20 cores, recomeça).</summary>
    public static readonly string[] AuthorPalette =
    {
        "D13438", "0078D4", "5C2E91", "498205", "CC3595", "7160E8", "038387", "6D5700", "CF0F1F", "4E6AED",
        "B146C2", "394146", "0B6A0B", "CA5010", "750B1C", "5D5A58", "881798", "69797E", "005B70", "8E562E",
    };
    /// <summary>Movimentação (w:moveFrom/To).</summary>
    public const string MoveColor = "2C6234";
    /// <summary>Barra de alteração: Todas as Marcações (preta, medida) e Marcação Simples (vermelha).</summary>
    public const string BarColor = "000000";
    public const string SimpleBarColor = "C00000";
    /// <summary>Largura da barra (twips): 0,72 pt.</summary>
    public const double BarWidth = 14.4;

    /// <summary>Cor de um autor pela ordem de encontro.</summary>
    public static string AuthorColor(IReadOnlyList<string> order, string author)
    {
        int i = -1;
        for (int k = 0; k < order.Count; k++) if (order[k] == author) { i = k; break; }
        return AuthorPalette[(i < 0 ? order.Count : i) % AuthorPalette.Length];
    }

    /// <summary>Borda esquerda da barra (twips) para a margem esquerda da página (twips).</summary>
    public static double BarX(double marginLeft) => Math.Max(268.8, marginLeft >= 1440 ? marginLeft - 720 : marginLeft / 2);

    /// <summary>Onde ficavam as marcas excluídas de um parágrafo juntado ao seguinte.</summary>
    private static readonly ConditionalWeakTable<Paragraph, List<double>> RevJoins = new();

    /// <summary>Parágrafo(s) de marca excluída juntado(s) ao seguinte na visão final: o texto
    /// deles na frente, a formatação do seguinte; guarda o ponto da junção.</summary>
    public static Paragraph JoinDeleted(List<Run> carried, Paragraph next)
    {
        var outp = new Paragraph { Runs = carried.Concat(next.Runs).ToList(), Props = next.Props, Ppr = next.Ppr };
        RevJoins.AddOrUpdate(outp, new List<double> { carried.Sum(r => r.Text.Length) });
        return outp;
    }

    /// <summary>{ ...from } leva as junções junto (o símbolo do JS é copiado pelo espalhamento).</summary>
    internal static void CopyJoins(Paragraph from, Paragraph to)
    {
        if (RevJoins.TryGetValue(from, out var j)) RevJoins.AddOrUpdate(to, j);
    }

    /// <summary>Faixas [início, fim, escondida] (offsets) do parágrafo com revisão que pede barra,
    /// e se o parágrafo inteiro / a última linha pedem.</summary>
    public static RevBars? RevisionRanges(RevisionDisplay rd, Paragraph para)
    {
        if (rd.BarColor() is null) return null;
        var ranges = new List<(double A, double B, bool Hidden)>();
        double acc = 0;
        foreach (var r in para.Runs)
        {
            double rs = acc;
            acc += r.Text.Length;
            if (rd.BarFor(r.Props.Ins, false) || rd.BarFor(r.Props.Del, false) || rd.BarFor(r.Props.Fmt, true)) ranges.Add((rs, acc, rd.Run(r)?.IsHide == true));
        }
        // marca excluída que sumiu na junção (Marcação Simples): barra na linha da junção
        if (rd.Mode == "simple" && RevJoins.TryGetValue(para, out var joins)) foreach (var k in joins) ranges.Add((k, k, true));
        bool whole = rd.BarFor(para.Props.Pfmt, true);
        bool mark = rd.BarFor(para.Props.MarkIns, false) || rd.BarFor(para.Props.MarkDel, false);
        return ranges.Count > 0 || whole || mark ? new RevBars { Ranges = ranges, Whole = whole, Mark = mark } : null;
    }
}

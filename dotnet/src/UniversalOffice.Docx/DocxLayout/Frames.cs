using System.Runtime.CompilerServices;
using UniversalOffice.Docx;

namespace UniversalOffice.DocxLayout;

/// <summary>dados da moldura que a caixa de texto sintética não carrega</summary>
public sealed class FrameInfo
{
    public bool AutoWidth;
    /// <summary>auto | exact | atLeast</summary>
    public string HRule = "auto";
    public double H;
}

/// <summary>
/// Molduras de texto (w:framePr sem capitular) — porta de docx-layout/src/frames.ts.
/// O Word tira do fluxo os parágrafos seguidos com a mesma moldura e os põe numa
/// caixa flutuante, ancorada no parágrafo seguinte (o texto em volta a contorna) —
/// medido no oráculo frames:
///  - sem w:w a largura é a da linha mais longa (quebrando na largura da coluna);
///    a altura é a do conteúdo — w:h vale como mínima, ou exata com hRule="exact";
///  - âncoras padrão: horizontal relativa à coluna, vertical à MARGEM; vAnchor
///    "text" é relativa ao topo do parágrafo âncora;
///  - wrap around/auto (padrão) contorna dos dois lados, notBeside só acima e
///    abaixo, none não afasta o texto; hSpace/vSpace são as distâncias.
/// Sem parágrafo depois (fim do contêiner, tabela, outra seção), a moldura fica
/// no lugar em que estaria no fluxo, sem ocupar altura.
/// </summary>
public static class Frames
{
    private sealed class Marker { }
    private static readonly Marker Mark = new();

    /// <summary>dados de cada caixa sintética de moldura</summary>
    public static readonly ConditionalWeakTable<DrawingTextbox, FrameInfo> FrameInfoOf = new();
    /// <summary>parágrafos de moldura retirados do fluxo (não ocupam nada)</summary>
    private static readonly ConditionalWeakTable<Paragraph, Marker> Skip = new();
    /// <summary>moldura sem parágrafo âncora: carregada pelo seu 1º parágrafo, no lugar dele</summary>
    private static readonly ConditionalWeakTable<Paragraph, Run> Carry = new();
    /// <summary>parágrafos DENTRO da caixa (não são levantados de novo)</summary>
    private static readonly ConditionalWeakTable<Paragraph, Marker> Inner = new();
    /// <summary>caixa sintética de cada moldura (pelo 1º parágrafo) e cópia do parágrafo âncora</summary>
    private static readonly ConditionalWeakTable<Paragraph, Run> RunCache = new();
    private sealed class AnchorCopy { public List<Run> Runs = new(); public Paragraph Para = null!; }
    private static readonly ConditionalWeakTable<Paragraph, AnchorCopy> AnchorCache = new();

    /// <summary>número "truthy" do JS (definido, ≠ 0, não NaN)</summary>
    private static bool Num(double? v) => v is { } d && d != 0 && !double.IsNaN(d);

    public static bool IsSkipped(Paragraph p) => Skip.TryGetValue(p, out _);
    public static Run? CarryOf(Paragraph p) => Carry.TryGetValue(p, out var r) ? r : null;
    public static FrameInfo? InfoOf(DrawingTextbox? tb) => tb is not null && FrameInfoOf.TryGetValue(tb, out var fi) ? fi : null;

    public static FramePr? FrameOf(Paragraph p)
    {
        var f = p.Ppr?.FramePr;
        if (f is null || (Js.Truthy(f.DropCap) && f.DropCap != "none") || Inner.TryGetValue(p, out _)) return null;
        return f;
    }

    private static bool SameFrame(FramePr a, FramePr b) =>
        a.DropCap == b.DropCap && Equals(a.Lines, b.Lines) && Equals(a.W, b.W) && Equals(a.H, b.H) && a.HRule == b.HRule
        && Equals(a.HSpace, b.HSpace) && Equals(a.VSpace, b.VSpace) && a.Wrap == b.Wrap && a.HAnchor == b.HAnchor && a.VAnchor == b.VAnchor
        && Equals(a.X, b.X) && Equals(a.Y, b.Y) && a.XAlign == b.XAlign && a.YAlign == b.YAlign && Equals(a.AnchorLock, b.AnchorLock);

    private static Run FrameRun(List<Paragraph> paras, FramePr f)
    {
        if (RunCache.TryGetValue(paras[0], out var hit)) return hit;
        var inner = paras.Select(p =>
        {
            var ppr = p.Ppr?.Clone() ?? new PPr();
            ppr.FramePr = null;
            var q = new Paragraph { Runs = p.Runs, Props = p.Props, Ppr = ppr };
            Inner.AddOrUpdate(q, Mark);
            return q;
        }).ToList();
        string hRule = f.HRule ?? (Num(f.H) ? "atLeast" : "auto");
        string wrap = f.Wrap == "none" ? "none" : f.Wrap == "notBeside" ? "topAndBottom" : "square";
        string hFrom = f.HAnchor == "page" ? "page" : f.HAnchor == "margin" ? "margin" : "column";
        string vFrom = f.VAnchor == "page" ? "page" : f.VAnchor == "text" ? "paragraph" : "margin";
        double hs = f.HSpace ?? 0, vs = f.VSpace ?? 0;
        var tb = new DrawingTextbox
        {
            Paras = inner,
            Blocks = inner.Select(paragraph => (Block)new ParagraphBlock { Paragraph = paragraph }).ToList(),
            WidthTwips = f.W ?? 0,
            HeightTwips = f.H ?? 0,
            Floating = true,
            Insets = new TextboxInsets { L = 0, T = 0, R = 0, B = 0 },
            Anchor = new DrawingAnchor
            {
                // (o vão à esquerda da moldura mede 1 twip a menos — ws-a-fr-l18, ws-fr-l30)
                Wrap = wrap, WrapText = "bothSides", DistL = hs + 1, DistR = hs, DistT = vs, DistB = vs,
                PosH = Js.Truthy(f.XAlign) ? new AnchorPos { RelativeFrom = hFrom, Align = f.XAlign } : new AnchorPos { RelativeFrom = hFrom, Offset = f.X ?? 0 },
                PosV = Js.Truthy(f.YAlign) && f.YAlign != "inline" ? new AnchorPos { RelativeFrom = vFrom, Align = f.YAlign } : new AnchorPos { RelativeFrom = vFrom, Offset = f.Y ?? 0 },
                LayoutInCell = true, AllowOverlap = true,
            },
        };
        bool hasH = Num(f.H);
        FrameInfoOf.AddOrUpdate(tb, new FrameInfo
        {
            AutoWidth = !Num(f.W),
            HRule = hRule == "exact" && hasH ? "exact" : hRule == "auto" || !hasH ? "auto" : "atLeast",
            H = f.H ?? 0,
        });
        var run = new Run { Text = DocumentReader.Obj, Props = new RunProps(), Textbox = tb };
        RunCache.AddOrUpdate(paras[0], run);
        return run;
    }

    /// <summary>
    /// Levanta as molduras de uma sequência de blocos. Devolve a MESMA sequência
    /// (mesmo comprimento: as referências b&lt;i&gt; continuam valendo) com os parágrafos
    /// âncora trocados por cópias que carregam a caixa no fim (o deslocamento dos
    /// caracteres não muda). `stops`: índices depois dos quais a âncora não é buscada
    /// (fim de seção). Sem molduras: a própria lista.
    /// </summary>
    public static List<Block> LiftFrames(List<Block> blocks, HashSet<int>? stops = null)
    {
        List<Block>? outp = null;
        bool Stop(int i) => stops is not null && stops.Contains(i);
        for (int i = 0; i < blocks.Count; i++)
        {
            if (blocks[i] is not ParagraphBlock b) continue;
            var f = FrameOf(b.Paragraph);
            if (f is null) continue;
            var group = new List<Paragraph> { b.Paragraph };
            int j = i + 1;
            for (; j < blocks.Count && !Stop(j - 1); j++)
            {
                var nf = blocks[j] is ParagraphBlock nb ? FrameOf(nb.Paragraph) : null;
                if (nf is null || !SameFrame(f, nf)) break;
                group.Add(((ParagraphBlock)blocks[j]).Paragraph);
            }
            foreach (var p in group) Skip.AddOrUpdate(p, Mark);
            var run = FrameRun(group, f);
            // âncora: o próximo parágrafo que não é moldura, na mesma seção
            int k = j;
            while (k < blocks.Count && !Stop(k - 1))
            {
                if (blocks[k] is not ParagraphBlock pk || FrameOf(pk.Paragraph) is null) break;
                k++;
            }
            var anchorB = k < blocks.Count && !Stop(k - 1) ? blocks[k] : null;
            if (anchorB is ParagraphBlock)
            {
                outp ??= new List<Block>(blocks);
                var src = ((ParagraphBlock)outp[k]).Paragraph;
                if (!AnchorCache.TryGetValue(src, out var c) || !c.Runs.Contains(run))
                {
                    var prevRuns = c?.Runs ?? new List<Run>();
                    var runs = new List<Run>(prevRuns) { run };
                    var bse = c is not null ? c.Para : src;
                    var para = new Paragraph { Runs = new List<Run>(bse.Runs) { run }, Props = bse.Props, Ppr = bse.Ppr };
                    c = new AnchorCopy { Runs = runs, Para = para };
                    AnchorCache.AddOrUpdate(src, c);
                }
                outp[k] = new ParagraphBlock { Paragraph = c.Para };
            }
            else Carry.AddOrUpdate(group[0], run);
            i = j - 1;
        }
        return outp ?? blocks;
    }
}

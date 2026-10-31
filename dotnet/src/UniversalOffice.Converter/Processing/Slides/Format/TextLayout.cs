using System.Globalization;
using System.Text.RegularExpressions;

namespace UniversalOffice.Converter.Processing.Slides.Pptx;

/// <summary>Fonte usada na medição/pintura.</summary>
public sealed class LayoutFont
{
    public string Family = "Calibri";
    public double SizePt;
    public bool Bold;
    public bool Italic;
}

/// <summary>Mede a largura de `text` em PONTOS na fonte dada (injetável).</summary>
public delegate double MeasureText(string text, LayoutFont font);

/// <summary>Run posicionado numa linha (posições em EMU relativas à caixa).</summary>
public sealed class PlacedRun
{
    public string Text = "";
    /// <summary>X do início do run, EMU relativo à caixa.</summary>
    public double X;
    /// <summary>Largura medida, EMU.</summary>
    public double W;
    public LayoutFont Font = new();
    public string Color = "#000000";
    public bool Underline;
    public string? Hyperlink;
}

public sealed class PlacedBullet
{
    public string Text = "";
    public double X;
    public LayoutFont Font = new();
    public string Color = "#000000";
}

/// <summary>Linha final do layout.</summary>
public sealed class PlacedLine
{
    public List<PlacedRun> Runs = new();
    /// <summary>Baseline em EMU relativo ao topo da caixa.</summary>
    public double Baseline;
    /// <summary>Altura da linha em EMU.</summary>
    public double Height;
    /// <summary>Marcador do parágrafo — presente apenas na PRIMEIRA linha dele.</summary>
    public PlacedBullet? Bullet;
}

public sealed class TextLayoutResult
{
    public List<PlacedLine> Lines = new();
    /// <summary>Altura total do bloco de texto em EMU (soma das linhas).</summary>
    public double TotalH;
}

public sealed class LayoutTextOptions
{
    public double? InsL;
    public double? InsT;
    public double? InsR;
    public double? InsB;
    /// <summary>Tamanho default em pt para runs sem sz resolvido.</summary>
    public double DefaultSzPt = 18;
    public string DefaultFont = "Calibri";
    public string DefaultColor = "#000000";
    /// <summary>Âncora default quando o bodyPr não especifica (t).</summary>
    public string DefaultAnchor = "t";
}

/// <summary>Helpers de texto usados pelos exportadores — porta de
/// slides-core/src/text-layout.ts (formatAutoNum na fase 1; layoutTextBody
/// completo na fase 2 para o export PDF).</summary>
public static class TextLayoutOps
{
    /// <summary>Formata o número de um buAutoNum conforme o esquema (subconjunto comum).</summary>
    public static string FormatAutoNum(string scheme, int n)
    {
        static string Roman(int v)
        {
            (int Val, string Sym)[] table =
            [
                (1000, "m"), (900, "cm"), (500, "d"), (400, "cd"), (100, "c"), (90, "xc"),
                (50, "l"), (40, "xl"), (10, "x"), (9, "ix"), (5, "v"), (4, "iv"), (1, "i"),
            ];
            var outp = new System.Text.StringBuilder();
            int x = v;
            foreach (var (val, sym) in table)
                while (x >= val) { outp.Append(sym); x -= val; }
            return outp.ToString();
        }
        static string Alpha(int v) => ((char)(96 + ((v - 1) % 26) + 1)).ToString();
        return scheme switch
        {
            "alphaLcPeriod" => $"{Alpha(n)}.",
            "alphaUcPeriod" => $"{Alpha(n).ToUpperInvariant()}.",
            "alphaLcParenR" => $"{Alpha(n)})",
            "alphaUcParenR" => $"{Alpha(n).ToUpperInvariant()})",
            "romanLcPeriod" => $"{Roman(n)}.",
            "romanUcPeriod" => $"{Roman(n).ToUpperInvariant()}.",
            "arabicParenR" => $"{n.ToString(CultureInfo.InvariantCulture)})",
            "arabicPlain" => n.ToString(CultureInfo.InvariantCulture),
            _ => $"{n.ToString(CultureInfo.InvariantCulture)}.",
        };
    }

    // ─────────────── layoutTextBody (spec 03, item D) ───────────────

    // Defaults de bodyPr do PowerPoint: 0.1in lateral, 0.05in vertical.
    private const double DefInsL = 91440, DefInsT = 45720, DefInsR = 91440, DefInsB = 45720;
    /// <summary>Fator de entrelinha "single" aproximado do PowerPoint.</summary>
    private const double LineFactorConst = 1.2;
    /// <summary>Fração da altura da linha acima da baseline.</summary>
    private const double BaselineFactor = 0.8;

    private static readonly Regex TokenRe = new(@"\S+\s*|\s+", RegexOptions.CultureInvariant);
    private static readonly Regex TrailWsRe = new(@"\s+$", RegexOptions.CultureInvariant);

    private sealed class Word
    {
        public string Text = "";
        public Run Run = new();
    }

    /// <summary>Quebra os runs de um parágrafo em tokens (palavras + espaços), preservando o run de origem.</summary>
    private static List<Word> Tokenize(List<Run> runs)
    {
        var outp = new List<Word>();
        foreach (var r in runs)
        {
            if (r.Text == "\n") { outp.Add(new Word { Text = "\n", Run = r }); continue; }
            // separa mantendo espaços colados à palavra anterior (quebra APÓS espaço)
            foreach (Match m in TokenRe.Matches(r.Text)) outp.Add(new Word { Text = m.Value, Run = r });
        }
        return outp;
    }

    private static LayoutFont FontOf(Run r, double fontScale, LayoutTextOptions opts) => new()
    {
        Family = r.Font ?? opts.DefaultFont,
        SizePt = (r.Sz ?? opts.DefaultSzPt) * fontScale,
        Bold = r.Bold ?? false,
        Italic = r.Italic ?? false,
    };

    private sealed class ProtoLine
    {
        public List<Word> Runs = new();
        public double MarL;
        public string Align = "l";
        public PlacedBullet? Bullet;
    }

    /// <summary>
    /// Layout completo de um txBody na caixa boxW × boxH (EMU) — porta fiel de
    /// layoutTextBody: word-wrap, autofit (fontScale/lnSpcReduction), âncora
    /// vertical, alinhamento horizontal e bullets com hanging indent.
    /// Pura e determinística — depende apenas dos argumentos.
    /// </summary>
    public static TextLayoutResult LayoutTextBody(
        TextBody tb, double boxW, double boxH, MeasureText measure, LayoutTextOptions? optsIn = null)
    {
        var opts = optsIn ?? new LayoutTextOptions();
        double insL = tb.InsL ?? opts.InsL ?? DefInsL;
        double insT = tb.InsT ?? opts.InsT ?? DefInsT;
        double insR = tb.InsR ?? opts.InsR ?? DefInsR;
        double insB = tb.InsB ?? opts.InsB ?? DefInsB;
        double fontScale = tb.FontScale ?? 1;
        double lineFactor = LineFactorConst * (1 - (tb.LnSpcReduction ?? 0));
        double usableW = Math.Max(0, boxW - insL - insR);
        bool wrap = tb.Wrap != "none";

        double MeasureEmu(string text, LayoutFont f) => measure(text, f) * Emu.PerPoint;

        var proto = new List<ProtoLine>();
        var heights = new List<double>();
        // contador de numeração automática por nível (reinicia quando o nível "sobe")
        var autoNumCounters = new int[9];

        foreach (var p in tb.Paragraphs)
        {
            int level = Math.Min(p.Level ?? 0, 8);
            double marL = p.MarL ?? 0;
            double indent = p.Indent ?? 0;
            string align = p.Align ?? "l";
            var runs = p.Runs.Count > 0 ? p.Runs : new List<Run> { new() };

            // bullet do parágrafo (só na primeira linha)
            PlacedBullet? bullet = null;
            if (p.Bullet == true)
            {
                // reinicia contadores de níveis mais profundos
                for (int l = level + 1; l < 9; l++) autoNumCounters[l] = 0;
                string btext;
                if (p.BulletAutoNum is not null)
                {
                    autoNumCounters[level]++;
                    btext = FormatAutoNum(p.BulletAutoNum, autoNumCounters[level]);
                }
                else
                {
                    btext = p.BulletChar ?? "•";
                }
                var bFont = FontOf(runs[0], fontScale, opts);
                bullet = new PlacedBullet
                {
                    Text = btext,
                    // hanging indent: bullet fica em marL+indent (indent tipicamente negativo)
                    X = insL + Math.Max(0, marL + indent),
                    Font = bFont,
                    Color = runs[0].Color ?? opts.DefaultColor,
                };
            }

            // indent de 1ª linha vale SÓ para a primeira linha do parágrafo;
            // continuações voltam para marL (hanging/first-line indent do PowerPoint)
            double contX = insL + marL;
            double firstX = p.Bullet == true ? contX : insL + Math.Max(0, marL + indent);
            var words = Tokenize(runs);

            // agrupamento em linhas por largura
            var cur = new ProtoLine { MarL = firstX, Align = align, Bullet = bullet };
            double curW = 0;
            double emptyPt = (runs[0].Sz ?? opts.DefaultSzPt) * fontScale;
            void Flush()
            {
                proto.Add(cur);
                // altura da linha = maior sz presente (linha vazia usa o sz do parágrafo)
                double maxPt = cur.Runs.Count > 0
                    ? cur.Runs.Max(t => (t.Run.Sz ?? opts.DefaultSzPt) * fontScale)
                    : emptyPt;
                heights.Add(maxPt * Emu.PerPoint * lineFactor);
                cur = new ProtoLine { MarL = contX, Align = align };
                curW = 0;
            }
            foreach (var wd in words)
            {
                if (wd.Text == "\n") { Flush(); continue; }
                var f = FontOf(wd.Run, fontScale, opts);
                double wEmu = MeasureEmu(wd.Text, f);
                double availW = Math.Max(0, usableW - (cur.MarL - insL));
                if (wrap && cur.Runs.Count > 0 && curW + MeasureEmu(TrailWsRe.Replace(wd.Text, ""), f) > availW) Flush();
                cur.Runs.Add(wd);
                curW += wEmu;
            }
            Flush();
        }

        // âncora vertical
        double totalH = heights.Sum();
        double usableH = Math.Max(0, boxH - insT - insB);
        string anchor = tb.Anchor ?? opts.DefaultAnchor;
        double y = insT;
        if (anchor == "ctr") y = insT + (usableH - totalH) / 2;
        else if (anchor == "b") y = insT + usableH - totalH;

        // materializa linhas: junta tokens contíguos do MESMO run, mede e alinha
        var lines = new List<PlacedLine>();
        for (int i = 0; i < proto.Count; i++)
        {
            var pl = proto[i];
            double h = heights[i];
            var merged = new List<Word>();
            foreach (var t in pl.Runs)
            {
                var last = merged.Count > 0 ? merged[^1] : null;
                if (last is not null && ReferenceEquals(last.Run, t.Run)) last.Text += t.Text;
                else merged.Add(new Word { Text = t.Text, Run = t.Run });
            }
            // remove trailing whitespace da última fatia (não conta p/ alinhamento)
            if (merged.Count > 0) merged[^1].Text = TrailWsRe.Replace(merged[^1].Text, "");

            var placed = new List<PlacedRun>();
            double w = 0;
            foreach (var m in merged)
            {
                var f = FontOf(m.Run, fontScale, opts);
                double mw = MeasureEmu(m.Text, f);
                placed.Add(new PlacedRun
                {
                    Text = m.Text, X = pl.MarL + w, W = mw, Font = f,
                    Color = m.Run.Color ?? opts.DefaultColor, Underline = m.Run.Underline ?? false,
                    Hyperlink = m.Run.Hyperlink,
                });
                w += mw;
            }
            // alinhamento horizontal desloca os runs (bullet fica fixo no marL+indent)
            double dx = 0;
            if (pl.Align == "ctr") dx = (usableW - (pl.MarL - insL) - w) / 2;
            else if (pl.Align == "r") dx = usableW - (pl.MarL - insL) - w;
            if (dx > 0) foreach (var pr in placed) pr.X += dx;
            lines.Add(new PlacedLine
            {
                Runs = placed, Baseline = y + h * BaselineFactor, Height = h, Bullet = pl.Bullet,
            });
            y += h;
        }
        return new TextLayoutResult { Lines = lines, TotalH = totalH };
    }
}

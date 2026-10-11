using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using OfficeNext.DocxLayout;
using Xunit;
using Xunit.Abstractions;

namespace OfficeNext.Tests;

/// <summary>
/// Regressão motor .NET × Word — espelho de write/packages/docx-layout/test/
/// oracle.test.ts + oracle-compare.ts: cada caso do oráculo foi exportado para
/// PDF pelo Word real e as linhas medidas estão em &lt;caso&gt;.word.json. O
/// motor tem de reproduzir a paginação, o texto de cada linha (quebras) e a
/// baseline (±0,3 pt), com as MESMAS tolerâncias do teste JS.
/// Usa as fontes INSTALADAS (nunca versionadas — CLAUDE.md); sem elas, não avalia.
/// </summary>
public class LayoutOracleTests
{
    private readonly ITestOutputHelper _out;
    public LayoutOracleTests(ITestOutputHelper output) { _out = output; }

    /// <summary>Casos com .word.json, "grupo/caso".</summary>
    public static IEnumerable<object[]> Cases() =>
        LayoutParityTests.Cases().Select(c => (string)c[0])
            .Where(c => File.Exists(Path.Combine(LayoutParityTests.OracleDir, c + ".word.json")))
            .Select(c => new object[] { c });

    /// <summary>Varreduras de limiar (justify2/4/5): a fronteira exata pode errar 1 passo de 2-4 twips.</summary>
    private static readonly HashSet<string> Sweeps = new(StringComparer.Ordinal) { "justify2", "justify3", "justify4", "justify5", "justify8" };
    /// <summary>Tolerância de baseline por grupo (resíduo conhecido do sobrescrito).</summary>
    private static readonly Dictionary<string, double> DyTol = new(StringComparer.Ordinal) { ["vertalign"] = 0.6, ["notes"] = 0.6 };

    [Theory]
    [MemberData(nameof(Cases))]
    public void Oraculo_Word(string caseId)
    {
        if (!LayoutParityTests.HasFonts.Value) { _out.WriteLine("fontes Arial/Calibri/Times New Roman ausentes — caso não avaliado"); return; }
        string g = caseId[..caseId.IndexOf('/')];
        var word = OracleCompare.ReadOracle(Path.Combine(LayoutParityTests.OracleDir, caseId + ".word.json"));
        var res = DocxLayoutPipeline.Layout(File.ReadAllBytes(Path.Combine(LayoutParityTests.OracleDir, caseId + ".docx")), SystemFontProvider.Shared);
        var r = OracleCompare.CompareLines(word, OracleCompare.EngineLines(res));
        _out.WriteLine($"páginas W/O {r.PagesW}/{r.PagesO}, linhas {r.Matched}/{r.LinesW}, mesma página {r.SamePage}, Δy máx {r.MaxDy:0.###} pt");
        if (Sweeps.Contains(g) || g == "vertalign")
        {
            // vertalign: o deslocamento do sobrescrito muda o agrupamento em linhas da extração
            double min = g == "vertalign" ? 0.9 : 0.98;
            Assert.True((double)r.Matched / r.LinesW >= min, $"linhas casadas {r.Matched}/{r.LinesW} (1ª diferença: {r.FirstDiff})");
        }
        else
        {
            Assert.True(r.PagesO == r.PagesW, $"páginas: Word {r.PagesW}, motor {r.PagesO}");
            Assert.True(r.Matched == r.LinesW, $"linhas casadas {r.Matched}/{r.LinesW} (1ª diferença: {r.FirstDiff})");
            Assert.True(r.SamePage == r.Matched, $"linhas na mesma página {r.SamePage}/{r.Matched}");
            double tol = DyTol.TryGetValue(g, out var t) ? t : 0.3;
            Assert.True(r.MaxDy <= tol, $"Δbaseline máx {r.MaxDy} pt > {tol}");
        }
        var wl = word.Pages.SelectMany(p => p.Lines).ToList();
        var ol = res.Pages.SelectMany(p => p.Lines).ToList();
        if (g == "fontsub")
        {
            // a fonte substituta certa dá a mesma largura de linha (fim da linha ±2 pt;
            // o x1 do Word é a caixa do último glifo, o nosso é o avanço)
            for (int k = 0; k < wl.Count; k++)
            {
                Assert.True(k < ol.Count, $"linha {k} ausente no motor");
                var o = ol[k];
                Assert.True(Math.Abs((o.X + o.Width) / 20 - wl[k].X1) < 2, $"largura de \"{wl[k].Text}\"");
            }
        }
        if (g == "kern")
        {
            // linhas aos pares (com kern, sem kern): a soma dos ajustes de cada linha
            // = x1(sem) − x1(com) tem de bater com a do Word (±0,15 pt ou 0,6%)
            for (int k = 0; k + 1 < wl.Count && k + 1 < ol.Count; k++)
            {
                if (wl[k].Text != wl[k + 1].Text) continue; // linha quebrada: sem par
                double wk = wl[k + 1].X1 - wl[k].X1;
                double ok = (ol[k + 1].X + ol[k + 1].Width - ol[k].X - ol[k].Width) / 20;
                Assert.True(Math.Abs(ok - wk) < Math.Max(0.15, 0.006 * Math.Abs(wk)),
                    $"kerning da linha \"{wl[k].Text}\" (Word {wk:0.00}, motor {ok:0.00})");
                k++;
            }
        }
    }
}

/// <summary>Porta de write/packages/docx-layout/test/oracle-compare.ts.</summary>
internal static class OracleCompare
{
    public sealed class OLine { public double Y, X0, X1, Size; public string Text = ""; }
    public sealed class OPage { public double W, H; public List<OLine> Lines = new(); }
    public sealed class ODoc { public List<OPage> Pages = new(); }

    public static ODoc ReadOracle(string path)
    {
        using var doc = JsonDocument.Parse(File.ReadAllText(path));
        var outp = new ODoc();
        foreach (var p in doc.RootElement.GetProperty("pages").EnumerateArray())
        {
            var op = new OPage { W = p.GetProperty("w").GetDouble(), H = p.GetProperty("h").GetDouble() };
            foreach (var l in p.GetProperty("lines").EnumerateArray())
                op.Lines.Add(new OLine
                {
                    Y = l.GetProperty("y").GetDouble(), X0 = l.GetProperty("x0").GetDouble(), X1 = l.GetProperty("x1").GetDouble(),
                    Size = l.GetProperty("size").GetDouble(), Text = l.GetProperty("text").GetString() ?? "",
                });
            outp.Pages.Add(op);
        }
        return outp;
    }

    private static readonly HashSet<int> PuaBullets = new() { 0xf0b7, 0xf0a7, 0xf0d8, 0xf0fc, 0xf076, 0xf0a8, 0xf06e, 0xf0e0, 0xf0a1 };
    private static readonly HashSet<int> Bullets = new() { 0x2022, 0x25aa, 0x25cf, 0x25e6, 0x2023, 0x2043, 0x25a0, 0x25a1, 0x2219, 0x00b7, 0x27a2, 0x2713, 0x2714, 0x25c6, 0x25c7, 0x2756, 0x00a7, 0x2192, 0x27a4 };

    public static string NormChar(int cp)
    {
        if (PuaBullets.Contains(cp) || Bullets.Contains(cp) || (cp >= 0xf020 && cp <= 0xf0ff)) return "•";
        if (cp is 0xa0 or 0x2007 or 0x202f) return " ";
        if (cp == 0xad) return "";
        if (cp is 0x2010 or 0x2011 or 0x2012 or 0x2013 or 0x2014 or 0x2212) return "-";
        if (cp is 0x2018 or 0x2019 or 0x201a or 0x2032) return "'";
        if (cp is 0x201c or 0x201d or 0x201e or 0x2033) return "\"";
        if (cp == 0x2026) return "...";
        if (cp == 0xfb01) return "fi";
        if (cp == 0xfb02) return "fl";
        return cp >= 0xD800 && cp <= 0xDFFF ? ((char)cp).ToString() : char.ConvertFromUtf32(cp);
    }

    private static readonly Regex Ws = new(@"\s", RegexOptions.CultureInvariant);

    /// <summary>Linhas da árvore de layout (pt), agrupando glifos por baseline na ordem dos itens.</summary>
    public static ODoc EngineLines(LayoutResult res)
    {
        var outp = new ODoc();
        foreach (var p in res.Pages)
        {
            var lines = new List<OLine>();
            OLine? cur = null;
            foreach (var item in p.Items)
            {
                if (item is not GlyphRunItem it) continue;
                double y = it.Y / 20;
                foreach (var g in it.Glyphs)
                {
                    string ch = NormChar(g.Cp);
                    if (ch.Length == 0 || Ws.IsMatch(ch)) continue;
                    double x = g.X / 20;
                    double tol = Math.Max(1, 0.3 * it.SizePt);
                    if (cur is not null && Math.Abs(y - cur.Y) <= tol && x >= cur.X1 - tol * 2)
                    {
                        cur.Text += ch;
                        cur.X1 = Math.Max(cur.X1, x + 1);
                        cur.Size = Math.Max(cur.Size, it.SizePt);
                    }
                    else
                    {
                        cur = new OLine { Y = y, X0 = x, X1 = x + 1, Size = it.SizePt, Text = ch };
                        lines.Add(cur);
                    }
                }
            }
            outp.Pages.Add(new OPage { W = p.WidthTw / 20, H = p.HeightTw / 20, Lines = lines });
        }
        return outp;
    }

    public sealed class Result
    {
        public int PagesW, PagesO, LinesW, Matched, SamePage;
        public double MaxDy, MaxDx, MeanDy;
        public string? FirstDiff;
    }

    private static readonly Regex Leader = new(@"([._\-·])\1{2,}", RegexOptions.CultureInvariant);

    /// <summary>Casa as linhas por texto (LCS) e mede Δbaseline/Δx nos pares da mesma página.</summary>
    public static Result CompareLines(ODoc word, ODoc ours)
    {
        // preenchimento de tab (pontos/hífens/sublinhados): a contagem exata varia — compara colapsado
        static string Collapse(string t) => Leader.Replace(t, "$1$1$1");
        static List<(int Pi, OLine L, string Text)> Norm(ODoc d) =>
            d.Pages.SelectMany((p, pi) => p.Lines.Select(l => (pi, l, Collapse(l.Text)))).ToList();
        var wl = Norm(word);
        var ol = Norm(ours);
        int n = wl.Count, m = ol.Count;
        // LCS (O(n·m) — casos do oráculo são pequenos)
        var dp = new int[n + 1, m + 1];
        for (int i = n - 1; i >= 0; i--)
            for (int j = m - 1; j >= 0; j--)
                dp[i, j] = wl[i].Text == ol[j].Text ? (dp[i + 1, j + 1] + 1) & 0xFFFF : Math.Max(dp[i + 1, j], dp[i, j + 1]);
        var pairs = new List<(int, int)>();
        {
            int i = 0, j = 0;
            while (i < n && j < m)
            {
                if (wl[i].Text == ol[j].Text) { pairs.Add((i, j)); i++; j++; }
                else if (dp[i + 1, j] >= dp[i, j + 1]) i++;
                else j++;
            }
        }
        int samePage = 0;
        double maxDy = 0, maxDx = 0, sumDy = 0;
        foreach (var (a, b) in pairs)
        {
            if (wl[a].Pi != ol[b].Pi) continue;
            samePage++;
            double dy = Math.Abs(wl[a].L.Y - ol[b].L.Y);
            double dx = Math.Abs(wl[a].L.X0 - ol[b].L.X0);
            maxDy = Math.Max(maxDy, dy);
            maxDx = Math.Max(maxDx, dx);
            sumDy += dy;
        }
        var matchedW = new HashSet<int>(pairs.Select(p => p.Item1));
        string? firstDiff = null;
        for (int k = 0; k < n; k++)
        {
            if (!matchedW.Contains(k))
            {
                string t = wl[k].L.Text;
                firstDiff = $"p{wl[k].Pi + 1} y={wl[k].L.Y.ToString("0.0", CultureInfo.InvariantCulture)} \"{(t.Length > 40 ? t[..40] : t)}\"";
                break;
            }
        }
        return new Result
        {
            PagesW = word.Pages.Count, PagesO = ours.Pages.Count, LinesW = n,
            Matched = pairs.Count, SamePage = samePage, MaxDy = maxDy, MaxDx = maxDx, MeanDy = samePage > 0 ? sumDy / samePage : 0,
            FirstDiff = firstDiff,
        };
    }
}

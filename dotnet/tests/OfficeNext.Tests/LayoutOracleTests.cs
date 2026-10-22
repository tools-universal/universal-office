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

    /// <summary>Grupos medidos caractere a caractere em teste próprio (SobrescritoElevacao).</summary>
    private static readonly HashSet<string> CharOnly = new(StringComparer.Ordinal) { "supraise" };

    /// <summary>Casos com .word.json, "grupo/caso".</summary>
    public static IEnumerable<object[]> Cases() =>
        LayoutParityTests.Cases().Select(c => (string)c[0])
            .Where(c => !CharOnly.Contains(c[..c.IndexOf('/')]))
            .Where(c => File.Exists(Path.Combine(LayoutParityTests.OracleDir, c + ".word.json")))
            .Select(c => new object[] { c });

    /// <summary>Fontes da tabela do oráculo supraise (raise.json).</summary>
    public static IEnumerable<object[]> SupRaiseFonts()
    {
        string f = Path.Combine(LayoutParityTests.OracleDir, "supraise", "raise.json");
        if (!File.Exists(f)) yield break;
        using var doc = JsonDocument.Parse(File.ReadAllText(f));
        foreach (var p in doc.RootElement.EnumerateObject()) yield return new object[] { p.Name };
    }

    /// <summary>
    /// Elevação do sobrescrito e queda do subscrito × Word (oráculo supraise) — espelho de
    /// supraise.test.ts: para 11 fontes, de 6 a 24pt em meios pontos, a distância entre a
    /// baseline do texto e a do sobrescrito/subscrito lida caractere a caractere no PDF do
    /// Word (raise.json: [corpo, elevação, queda], em meios pontos — o PDF quantiza a
    /// 0,12pt). O motor tem de acertar todas (tabela medida em Fonts.cs).
    /// </summary>
    [Theory]
    [MemberData(nameof(SupRaiseFonts))]
    public void SobrescritoElevacao(string font)
    {
        string dir = Path.Combine(LayoutParityTests.OracleDir, "supraise");
        using var table = JsonDocument.Parse(File.ReadAllText(Path.Combine(dir, "raise.json")));
        var rows = table.RootElement.GetProperty(font).EnumerateArray()
            .Select(r => (Size: r[0].GetDouble(), Raise: r[1].GetDouble(), Drop: r.GetArrayLength() > 2 ? r[2].GetDouble() : (double?)null)).ToList();
        string face = Regex.Replace(font.Replace('-', ' '), @"\b\w", m => m.Value.ToUpperInvariant()).Replace("Segoe Ui", "Segoe UI");
        if (SystemFontProvider.Shared.Face(face, false, false) is null) { _out.WriteLine($"fonte {face} ausente — caso não avaliado"); return; }
        var res = DocxLayoutPipeline.Layout(File.ReadAllBytes(Path.Combine(dir, $"sr-{font}.docx")), SystemFontProvider.Shared);
        // runs de glifos em ordem: "Base", "SUP", " meio ", "SUB", " fim" por parágrafo
        var runs = res.Pages.SelectMany(p => p.Items).OfType<GlyphRunItem>().ToList();
        var got = new List<double>();
        var drops = new List<double>();
        static string Txt(GlyphRunItem it) => string.Concat(it.Glyphs.Select(g => char.ConvertFromUtf32(g.Cp)));
        for (int i = 0; i + 1 < runs.Count; i++)
        {
            var a = runs[i]; var b = runs[i + 1];
            if (Txt(a) == "Base" && Txt(b) == "SUP") got.Add((a.Y - b.Y) / 20);
            if (Txt(a).Trim() == "meio" && Txt(b) == "SUB") drops.Add((b.Y - a.Y) / 20);
        }
        Assert.Equal(rows.Count, got.Count);
        for (int k = 0; k < rows.Count; k++)
        {
            Assert.True(Math.Abs(got[k] - rows[k].Raise) < 0.01, $"sobrescrito, corpo {rows[k].Size}: motor {got[k]}, Word {rows[k].Raise}");
            if (rows[k].Drop is { } drop)
                Assert.True(k < drops.Count && Math.Abs(drops[k] - drop) < 0.01, $"subscrito, corpo {rows[k].Size}: motor {(k < drops.Count ? drops[k] : double.NaN)}, Word {drop}");
        }
    }

    /// <summary>Varreduras de limiar (justify2/4/5): a fronteira exata pode errar 1 passo de 2-4 twips.</summary>
    private static readonly HashSet<string> Sweeps = new(StringComparer.Ordinal) { "justify2", "justify3", "justify4", "justify5", "justify8", "jsweep" };
    /// <summary>Tolerância de baseline por grupo (resíduo conhecido do sobrescrito).</summary>
    private static readonly Dictionary<string, double> DyTol = new(StringComparer.Ordinal) { ["vertalign"] = 0.6, ["notes"] = 0.65, ["fnsep"] = 0.65, ["fnrefsup"] = 0.65, ["omath"] = 0.4 };
    /// <summary>Grupos em que o motor também não pode ter linhas A MAIS (texto que o Word
    /// não grava no PDF: fora da página, sem preenchimento, curvas…).</summary>
    private static readonly HashSet<string> Strict = new(StringComparer.Ordinal) { "hidetext", "emfrop", "txbxscale" };
    /// <summary>Grupos em que a posição horizontal é o que se mede (x da 1ª letra, ±pt).</summary>
    private static readonly Dictionary<string, double> DxTol = new(StringComparer.Ordinal) { ["tblpct"] = 0.6, ["tblw"] = 0.6, ["formtext"] = 0.6, ["spacerun"] = 0.6, ["numtabind"] = 0.6, ["tallwrap"] = 0.6, ["numstyind"] = 0.6, ["tblsp"] = 0.6, ["nowrap"] = 0.6, ["tblvert"] = 0.6, ["tblnum"] = 0.6, ["fejust"] = 0.6, ["tblpctmin"] = 0.6, ["tblindctr"] = 0.6, ["txbxctr"] = 0.6, ["txbxln"] = 0.6, ["tbinset"] = 0.3, ["ftcellmar"] = 0.3, ["omath"] = 0.6, ["tblbdmin"] = 0.6, ["sckmix"] = 0.6, ["rowjc"] = 0.6, ["wmftext"] = 0.6, ["cellwrap"] = 0.3, ["txrect"] = 0.3, ["tblmincol"] = 0.6, ["felead"] = 0.6, ["feknown"] = 0.6, ["fehangcomp"] = 0.6, ["glyphfb"] = 0.6, ["anctrail"] = 0.3, ["cellout"] = 0.3, ["brfirst"] = 0.6 };
    /// <summary>Grupos em que a contagem de pontos do preenchimento de tab é comparada exata.</summary>
    private static readonly HashSet<string> ExactLeaders = new(StringComparer.Ordinal) { "tdhalfpx", "tdend" };
    /// <summary>Casos em que a ORDEM das linhas no PDF não é a do motor: o Word emite as colunas da
    /// área de notas (de fim, ou de rodapé numa seção em colunas) intercaladas com as do
    /// texto (coluna 1 do texto, coluna 1 das notas, coluna 2…). Compara com as linhas ordenadas por coluna e altura.</summary>
    private static readonly HashSet<string> Orderless = new(StringComparer.Ordinal) { "en-cols", "sect-cols2" };

    private static OracleCompare.ODoc ByColumn(OracleCompare.ODoc d) => new()
    {
        Pages = d.Pages.Select(p => new OracleCompare.OPage
        {
            W = p.W, H = p.H, Objs = p.Objs,
            Lines = p.Lines.OrderBy(l => OfficeNext.Docx.Js.Round(l.X0 / 100)).ThenBy(l => l.Y).ToList(),
        }).ToList(),
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public void Oraculo_Word(string caseId)
    {
        if (!LayoutParityTests.HasFonts.Value) { _out.WriteLine("fontes Arial/Calibri/Times New Roman ausentes — caso não avaliado"); return; }
        string g = caseId[..caseId.IndexOf('/')];
        var word = OracleCompare.ReadOracle(Path.Combine(LayoutParityTests.OracleDir, caseId + ".word.json"));
        // casos mk-* (controle de alterações): o PDF do Word "com marcação" = Todas as Marcações
        var opts = caseId.Split('/')[^1].StartsWith("mk-", StringComparison.Ordinal)
            ? new LayoutOptions { Revisions = new RevisionView { Mode = "all" } }
            : null;
        var res = DocxLayoutPipeline.Layout(File.ReadAllBytes(Path.Combine(LayoutParityTests.OracleDir, caseId + ".docx")), SystemFontProvider.Shared, opts);
        bool orderless = Orderless.Contains(caseId[(caseId.IndexOf('/') + 1)..]);
        var r = orderless
            ? OracleCompare.CompareLines(ByColumn(word), ByColumn(OracleCompare.EngineLines(res)))
            : OracleCompare.CompareLines(word, OracleCompare.EngineLines(res), ExactLeaders.Contains(g));
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
            if (DxTol.TryGetValue(g, out var dxTol)) Assert.True(r.MaxDx <= dxTol, $"Δx máx {r.MaxDx} pt > {dxTol}");
            if (Strict.Contains(g)) Assert.True(r.ExtraO == 0, $"linhas só nossas {r.ExtraO} (1ª: {r.FirstExtra})");
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
        if (g == "tblshd")
        {
            // tabelas sem bordas: cada preenchimento do Word é um caminho (o PDF do
            // Word grava 2 por célula); as faixas verticais pintadas têm de ser as mesmas
            static string Band(double y0, double y1) => $"{Math.Floor(y0 + 0.5).ToString(CultureInfo.InvariantCulture)}-{Math.Floor(y1 + 0.5).ToString(CultureInfo.InvariantCulture)}";
            var wb = word.Pages[0].Objs.Where(o => o.T == "path").Select(o => Band(o.Y0, o.Y1)).Distinct().OrderBy(s => s, StringComparer.Ordinal).ToList();
            var ob = res.Pages[0].Items.OfType<RectItem>().Select(it => Band(it.Y / 20, (it.Y + it.H) / 20)).Distinct().OrderBy(s => s, StringComparer.Ordinal).ToList();
            Assert.True(wb.SequenceEqual(ob), $"faixas preenchidas (pt): Word [{string.Join(", ", wb)}], motor [{string.Join(", ", ob)}]");
        }
        if (g == "hfgroup")
        {
            // ordem de pintura: a caixa (caminho preenchido) sai depois da imagem da faixa
            // no Word (objs na ordem do PDF)? A nossa tem de ser a mesma (igual ao oracle.test.ts)
            var objs = word.Pages[0].Objs;
            int wImg = objs.FindIndex(o => o.T == "image" && o.Y0 < 0.5 && o.Y1 > 93);
            int wBox = objs.FindIndex(o => o.T == "path");
            if (wImg >= 0 && wBox >= 0)
            {
                var items = res.Pages[0].Items;
                int oImg = items.FindIndex(it => it is ImageItem im && im.Y < 10 && im.H > 1870);
                int oBox = items.FindIndex(it => it is ShapeItem);
                Assert.True((oBox > oImg) == (wBox > wImg), "caixa na frente da faixa");
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
    public sealed class OObj { public string T = ""; public double X0, Y0, X1, Y1; }
    public sealed class OPage { public double W, H; public List<OLine> Lines = new(); public List<OObj> Objs = new(); }
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
            if (p.TryGetProperty("objs", out var objs))
                foreach (var o in objs.EnumerateArray())
                    op.Objs.Add(new OObj
                    {
                        T = o.GetProperty("t").GetString() ?? "", X0 = o.GetProperty("x0").GetDouble(), Y0 = o.GetProperty("y0").GetDouble(),
                        X1 = o.GetProperty("x1").GetDouble(), Y1 = o.GetProperty("y1").GetDouble(),
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
            var lastCp = new List<int>();
            OLine? cur = null;
            foreach (var item in p.Items)
            {
                // curvas (WordArt, texto semitransparente, emoji colorido, caixa girada):
                // não é texto no PDF — nem no do Word
                if (item is not GlyphRunItem it || it.AsPath) continue;
                double y = it.Y / 20;
                foreach (var g in it.Glyphs)
                {
                    string ch = NormChar(g.Cp);
                    // fora do BMP (itálico matemático, emoji…): o pdfium devolve pares substitutos,
                    // que a extração descarta (pdftext.py)
                    if (ch.Length == 0 || Ws.IsMatch(ch) || g.Cp > 0xffff) continue;
                    double x = g.X / 20;
                    // corpo como no PDF (múltiplo de 0,12 pt: 10 → 9,96), que decide a tolerância da extração
                    double size = OfficeNext.Core.JsNumber.Round(it.SizePt / 0.12) * 0.12;
                    double tol = Math.Max(1, 0.3 * size);
                    if (cur is not null && Math.Abs(y - cur.Y) <= tol && x >= cur.X1 - tol * 2)
                    {
                        cur.Text += ch;
                        cur.X1 = Math.Max(cur.X1, x + 1);
                        cur.Size = Math.Max(cur.Size, size);
                    }
                    else
                    {
                        cur = new OLine { Y = y, X0 = x, X1 = x + 1, Size = size, Text = ch };
                        lines.Add(cur);
                        lastCp.Add(0);
                    }
                    lastCp[lines.Count - 1] = g.Cp;
                }
            }
            // como o pdfium ao extrair: hífen no fim da linha depois de LETRA some se a
            // linha seguinte começa com letra ou dígito decimal ("guarda-|chuva" →
            // "guarda", "com-|840" → "com"); depois de dígito fica ("12.345-|678"), e
            // antes de pontuação/símbolo/"²" também ("abc-|_def", oráculo dashsym); só o
            // hífen-menos (U+002D) — travessões ficam
            static bool StartsLetterOrDigit(string s)
            {
                if (s.Length == 0) return false;
                var cat = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(s, 0);
                return cat is System.Globalization.UnicodeCategory.UppercaseLetter or System.Globalization.UnicodeCategory.LowercaseLetter
                    or System.Globalization.UnicodeCategory.TitlecaseLetter or System.Globalization.UnicodeCategory.ModifierLetter
                    or System.Globalization.UnicodeCategory.OtherLetter or System.Globalization.UnicodeCategory.DecimalDigitNumber;
            }
            for (int k = 0; k + 1 < lines.Count; k++)
            {
                string t = lines[k].Text;
                if (t.Length > 1 && t.EndsWith('-') && lastCp[k] == 0x2d && char.IsLetter(t, t.Length - 2)
                    && StartsLetterOrDigit(lines[k + 1].Text))
                    lines[k].Text = t[..^1];
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
        /// <summary>linhas NOSSAS sem par no Word (texto que o Word não grava)</summary>
        public int ExtraO;
        public string? FirstExtra;
    }

    private static readonly Regex Leader = new(@"([._\-·])\1{2,}", RegexOptions.CultureInvariant);

    /// <summary>Casa as linhas por texto (LCS) e mede Δbaseline/Δx nos pares da mesma página.</summary>
    public static Result CompareLines(ODoc word, ODoc ours, bool exactLeaders = false)
    {
        // preenchimento de tab (pontos/hífens/sublinhados): a contagem exata varia — compara
        // colapsado (exceto nos grupos que medem a grade dos pontos: tdhalfpx)
        string Collapse(string t) => exactLeaders ? t : Leader.Replace(t, "$1$1$1");
        List<(int Pi, OLine L, string Text)> Norm(ODoc d) =>
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
        var matchedO = new HashSet<int>(pairs.Select(p => p.Item2));
        var extra = Enumerable.Range(0, m).Where(k => !matchedO.Contains(k)).ToList();
        string? firstExtra = null;
        if (extra.Count > 0)
        {
            var e = ol[extra[0]];
            string t = e.L.Text;
            firstExtra = $"p{e.Pi + 1} y={e.L.Y.ToString("0.0", CultureInfo.InvariantCulture)} \"{(t.Length > 40 ? t[..40] : t)}\"";
        }
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
            ExtraO = extra.Count,
            FirstExtra = firstExtra,
        };
    }
}

using System.Globalization;
using System.Text;
using System.Text.Json;
using OfficeNext.DocxLayout;
using Xunit;
using Xunit.Abstractions;

namespace OfficeNext.Tests;

/// <summary>
/// Paridade do MOTOR DE LAYOUT JS × .NET: cada caso do oráculo Word
/// (write/packages/docx-layout/test/oracle/&lt;grupo&gt;/&lt;caso&gt;.docx) é diagramado
/// pelo port .NET com as fontes INSTALADAS e comparado ao dump do motor JS
/// (tools/gen-parity-layout.mjs → fixtures/expected/layout). Estrutura exata
/// (mesmos itens, na mesma ordem, mesmas strings) e números com ±0,05 twip.
/// Sem Arial/Calibri/Times New Roman na máquina os casos não são avaliados
/// (as fontes nunca são versionadas — CLAUDE.md).
/// </summary>
public class LayoutParityTests
{
    private readonly ITestOutputHelper _out;
    public LayoutParityTests(ITestOutputHelper output) { _out = output; }

    internal static readonly Lazy<string> RepoRoot = new(() =>
        new DirectoryInfo(Fixtures.Dir).Parent!.Parent!.Parent!.FullName);

    internal static string OracleDir => Path.Combine(RepoRoot.Value, "write", "packages", "docx-layout", "test", "oracle");
    private static string ExpectedDir => Path.Combine(Fixtures.Dir, "expected", "layout");

    /// <summary>Casos "grupo/caso" em ordem ordinal (a mesma do gerador JS).</summary>
    public static IEnumerable<object[]> Cases()
    {
        if (!Directory.Exists(OracleDir)) yield break;
        var all = new List<string>();
        foreach (var f in Directory.EnumerateFiles(OracleDir, "*.docx", SearchOption.AllDirectories))
            all.Add(Path.GetRelativePath(OracleDir, f).Replace('\\', '/')[..^5]);
        all.Sort(StringComparer.Ordinal);
        foreach (var c in all) yield return new object[] { c };
    }

    internal static readonly Lazy<bool> HasFonts = new(() => SystemFontProvider.Shared.HasCoreFonts());

    [Theory]
    [MemberData(nameof(Cases))]
    public void Layout_Js_Net(string caseId)
    {
        if (!HasFonts.Value) { _out.WriteLine("fontes Arial/Calibri/Times New Roman ausentes — caso não avaliado"); return; }
        string expPath = Path.Combine(ExpectedDir, caseId + ".layout.json");
        Assert.True(File.Exists(expPath), $"dump JS ausente: {expPath} — rode node tools/gen-parity-layout.mjs");
        using var exp = JsonDocument.Parse(File.ReadAllText(expPath));
        byte[] docx = File.ReadAllBytes(Path.Combine(OracleDir, caseId + ".docx"));
        // casos mk-* (controle de alterações): Todas as Marcações — como o gerador JS
        var opts = caseId.Split('/')[^1].StartsWith("mk-", StringComparison.Ordinal)
            ? new LayoutOptions { Revisions = new RevisionView { Mode = "all" } }
            : null;
        if (exp.RootElement.TryGetProperty("error", out var err))
        {
            Assert.ThrowsAny<Exception>(() => DocxLayoutPipeline.Layout(docx, SystemFontProvider.Shared, opts));
            _out.WriteLine($"JS também falha: {err.GetString()}");
            return;
        }
        var res = DocxLayoutPipeline.Layout(docx, SystemFontProvider.Shared, opts);
        using var act = JsonDocument.Parse(LayoutDump.Normalize(res));
        string? diff = JsonDiff.First(exp.RootElement, act.RootElement, "$", 0.05);
        Assert.True(diff is null, $"{caseId}: {diff}");
    }
}

/// <summary>Comparação estrutural de JSON com tolerância numérica.</summary>
internal static class JsonDiff
{
    public static string? First(JsonElement e, JsonElement a, string path, double tol)
    {
        if (e.ValueKind != a.ValueKind)
        {
            // número × número com representação diferente é ok; aqui só tipos distintos
            return $"{path}: tipo {e.ValueKind} esperado, obtido {a.ValueKind} (esperado {Snip(e)}, obtido {Snip(a)})";
        }
        switch (e.ValueKind)
        {
            case JsonValueKind.Object:
                {
                    var ek = e.EnumerateObject().Select(p => p.Name).ToList();
                    var ak = a.EnumerateObject().Select(p => p.Name).ToList();
                    foreach (var k in ek) if (!a.TryGetProperty(k, out _)) return $"{path}.{k}: ausente no .NET";
                    foreach (var k in ak) if (!e.TryGetProperty(k, out _)) return $"{path}.{k}: sobra no .NET";
                    foreach (var k in ek)
                    {
                        var d = First(e.GetProperty(k), a.GetProperty(k), $"{path}.{k}", tol);
                        if (d is not null) return d;
                    }
                    return null;
                }
            case JsonValueKind.Array:
                {
                    int ne = e.GetArrayLength(), na = a.GetArrayLength();
                    int n = Math.Min(ne, na);
                    for (int i = 0; i < n; i++)
                    {
                        var d = First(e[i], a[i], $"{path}[{i}]", tol);
                        if (d is not null) return d;
                    }
                    if (ne != na) return $"{path}: {ne} elementos esperados, {na} obtidos" + (na > ne ? $" (sobra {Snip(a[ne])})" : $" (falta {Snip(e[na])})");
                    return null;
                }
            case JsonValueKind.Number:
                {
                    double x = e.GetDouble(), y = a.GetDouble();
                    return Math.Abs(x - y) <= tol + 1e-9 ? null : $"{path}: {x.ToString(CultureInfo.InvariantCulture)} esperado, {y.ToString(CultureInfo.InvariantCulture)} obtido";
                }
            case JsonValueKind.String:
                return e.GetString() == a.GetString() ? null : $"{path}: \"{e.GetString()}\" esperado, \"{a.GetString()}\" obtido";
            default:
                return null; // true/false/null: ValueKind igual já basta
        }
    }

    private static string Snip(JsonElement x)
    {
        string s = x.GetRawText();
        return s.Length > 200 ? s[..200] + "…" : s;
    }
}

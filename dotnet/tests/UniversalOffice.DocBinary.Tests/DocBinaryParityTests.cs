using System.IO.Compression;
using System.Text;
using System.Text.Json;
using UniversalOffice.DocBinary;
using Xunit;

namespace UniversalOffice.DocBinary.Tests;

/// <summary>
/// Paridade do conversor .doc → .docx com o JS: o .NET converte as fixtures
/// sintéticas de write/packages/docx-core/test/fixtures/doc e cada parte do
/// pacote tem de ser IDÊNTICA à gerada pelo conversor JS
/// (dotnet/tests/fixtures/expected/doc, regenerável com tools/gen-parity-doc.mjs).
/// </summary>
public class DocBinaryParityTests
{
    private static readonly string RepoRoot = LocateRoot();

    private static string LocateRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "dotnet", "tests", "fixtures", "expected", "doc")) &&
                Directory.Exists(Path.Combine(dir.FullName, "write", "packages", "docx-core", "test", "fixtures", "doc")))
                return dir.FullName;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException("raiz do repositório não encontrada (fixtures de .doc) — rode tools/gen-parity-doc.mjs");
    }

    private static string ExpectedDir => Path.Combine(RepoRoot, "dotnet", "tests", "fixtures", "expected", "doc");
    private static string InputDir => Path.Combine(RepoRoot, "write", "packages", "docx-core", "test", "fixtures", "doc");

    public static IEnumerable<object[]> FixtureNames() =>
        Directory.GetDirectories(Path.Combine(LocateRoot(), "dotnet", "tests", "fixtures", "expected", "doc"))
            .Select(d => new object[] { Path.GetFileName(d) })
            .OrderBy(o => (string)o[0], StringComparer.Ordinal);

    /// <summary>Compara texto ordinal com mensagem apontando a 1ª divergência.</summary>
    private static void AssertSameText(string expected, string actual, string label)
    {
        if (string.Equals(expected, actual, StringComparison.Ordinal)) return;
        int n = Math.Min(expected.Length, actual.Length);
        int at = 0;
        while (at < n && expected[at] == actual[at]) at++;
        int from = Math.Max(0, at - 80);
        string Ctx(string s) => s.Substring(from, Math.Min(160, s.Length - from)).Replace("\n", "\\n").Replace("\r", "\\r");
        throw new Xunit.Sdk.XunitException(
            $"Paridade quebrada em {label} @char {at} (JS {expected.Length} chars, .NET {actual.Length}).\n" +
            $"JS:   …{Ctx(expected)}…\n.NET: …{Ctx(actual)}…");
    }

    [Theory]
    [MemberData(nameof(FixtureNames))]
    public void Fixture_PartesIdenticasAoJs(string name)
    {
        byte[] doc = File.ReadAllBytes(Path.Combine(InputDir, name + ".doc"));
        var parts = DocBinary.ConvertDocToParts(doc);
        string dir = Path.Combine(ExpectedDir, name);
        var order = File.ReadAllLines(Path.Combine(dir, "_parts.txt")).Where(l => l.Length > 0).ToList();
        Assert.Equal(order, parts.Select(p => p.Key).ToList());
        foreach (var (path, data) in parts)
        {
            byte[] expected = File.ReadAllBytes(Path.Combine(dir, Path.Combine(path.Split('/'))));
            if (path.EndsWith(".xml", StringComparison.Ordinal) || path.EndsWith(".rels", StringComparison.Ordinal))
                AssertSameText(Encoding.UTF8.GetString(expected), Encoding.UTF8.GetString(data), $"{name}:{path}");
            Assert.True(expected.AsSpan().SequenceEqual(data), $"{name}:{path} difere byte a byte");
        }
    }

    [Theory]
    [MemberData(nameof(FixtureNames))]
    public void Fixture_ZipComAsMesmasPartes(string name)
    {
        byte[] doc = File.ReadAllBytes(Path.Combine(InputDir, name + ".doc"));
        Assert.True(DocBinary.IsWordBinary(doc));
        byte[] docx = DocBinary.ConvertDocToDocx(doc);
        using var zip = new ZipArchive(new MemoryStream(docx), ZipArchiveMode.Read);
        var order = File.ReadAllLines(Path.Combine(ExpectedDir, name, "_parts.txt")).Where(l => l.Length > 0).ToList();
        Assert.Equal(order, zip.Entries.Select(e => e.FullName).ToList());
        foreach (var e in zip.Entries)
        {
            using var s = e.Open();
            var ms = new MemoryStream();
            s.CopyTo(ms);
            byte[] expected = File.ReadAllBytes(Path.Combine(ExpectedDir, name, Path.Combine(e.FullName.Split('/'))));
            Assert.True(expected.AsSpan().SequenceEqual(ms.ToArray()), $"{name}:{e.FullName} difere no ZIP");
        }
    }

    /// <summary>Offset (no arquivo) do FIB: setor do WordDocument que começa com wIdent 0xA5EC.</summary>
    private static int FibOffset(byte[] doc)
    {
        for (int off = 512; off + 0x20 < doc.Length; off += 512)
            if (doc[off] == 0xec && doc[off + 1] == 0xa5 && doc[off + 2] == 0xc1 && doc[off + 3] == 0x00) return off;
        throw new InvalidDataException("FIB não encontrado");
    }

    [Fact]
    public void Erros_MensagensEmPortugues()
    {
        var ex = Assert.Throws<DocFormatException>(() => DocBinary.ConvertDocToDocx(new byte[64]));
        Assert.Contains("não é um .doc", ex.Message);
        Assert.False(DocBinary.IsWordBinary(new byte[16]));
        Assert.False(DocBinary.IsWordBinary(Encoding.ASCII.GetBytes("PK\u0003\u0004 não é cfb")));

        byte[] doc = File.ReadAllBytes(Path.Combine(InputDir, "caracteres.doc"));
        int fib = FibOffset(doc);
        // FibBase.fEncrypted (0x0100) / fObfuscated (0x8000)
        byte[] enc = (byte[])doc.Clone();
        enc[fib + 0x0b] |= 0x01;
        Assert.Contains("criptografado", Assert.Throws<DocFormatException>(() => DocBinary.ConvertDocToDocx(enc)).Message);
        byte[] obf = (byte[])doc.Clone();
        obf[fib + 0x0b] |= 0x81;
        Assert.Contains("ofuscação", Assert.Throws<DocFormatException>(() => DocBinary.ConvertDocToDocx(obf)).Message);
        // nFib do Word 6 (0x65)
        byte[] w6 = (byte[])doc.Clone();
        w6[fib + 2] = 0x65; w6[fib + 3] = 0x00;
        Assert.Contains("anterior ao Word 97", Assert.Throws<DocFormatException>(() => DocBinary.ConvertDocToDocx(w6)).Message);
        // assinatura do FIB inválida
        byte[] bad = (byte[])doc.Clone();
        bad[fib] = 0x34; bad[fib + 1] = 0x12;
        Assert.Contains("corrompido", Assert.Throws<DocFormatException>(() => DocBinary.ConvertDocToDocx(bad)).Message);
    }

    [Fact]
    public void BytesCorrompidos_SoDocFormatException()
    {
        byte[] doc = File.ReadAllBytes(Path.Combine(InputDir, "tabelas.doc"));
        var rnd = new Random(1234);
        for (int k = 0; k < 40; k++)
        {
            byte[] m = (byte[])doc.Clone();
            int n = 1 + rnd.Next(64);
            for (int i = 0; i < n; i++) m[512 + rnd.Next(m.Length - 512)] = (byte)rnd.Next(256);
            try { DocBinary.ConvertDocToDocx(m); }
            catch (DocFormatException) { }
        }
    }

    /// <summary>
    /// Paridade sobre um corpus externo (fora do repositório): só roda com
    /// DOC_PARITY_LIST = arquivo com linhas "id|caminho.doc|caminho-do-docx-do-JS"
    /// (write/tools/doc-lab/parity-net.mjs). Grava o resumo em DOC_PARITY_OUT.
    /// </summary>
    [Fact]
    public void Corpus_ParidadeParteAParte()
    {
        string? list = Environment.GetEnvironmentVariable("DOC_PARITY_LIST");
        if (string.IsNullOrEmpty(list) || !File.Exists(list)) return;
        string outPath = Environment.GetEnvironmentVariable("DOC_PARITY_OUT") ?? Path.ChangeExtension(list, ".json");
        var rows = new List<Dictionary<string, object?>>();
        foreach (var line in File.ReadAllLines(list))
        {
            var cols = line.Split('|');
            if (cols.Length < 3) continue;
            var row = new Dictionary<string, object?> { ["id"] = cols[0] };
            try
            {
                var net = DocBinary.ConvertDocToParts(File.ReadAllBytes(cols[1])).ToList();
                var js = new List<KeyValuePair<string, byte[]>>();
                using (var zip = new ZipArchive(new MemoryStream(File.ReadAllBytes(cols[2])), ZipArchiveMode.Read))
                {
                    foreach (var e in zip.Entries)
                    {
                        using var s = e.Open();
                        var ms = new MemoryStream();
                        s.CopyTo(ms);
                        js.Add(new(e.FullName, ms.ToArray()));
                    }
                }
                var diff = new List<string>();
                var jsMap = js.ToDictionary(p => p.Key, p => p.Value, StringComparer.Ordinal);
                var netMap = net.ToDictionary(p => p.Key, p => p.Value, StringComparer.Ordinal);
                foreach (var k in jsMap.Keys.Union(netMap.Keys))
                {
                    if (!jsMap.TryGetValue(k, out var a) || !netMap.TryGetValue(k, out var b)) { diff.Add($"{k} (ausente em {(jsMap.ContainsKey(k) ? ".NET" : "JS")})"); continue; }
                    if (!a.AsSpan().SequenceEqual(b))
                    {
                        string sa = Encoding.UTF8.GetString(a), sb = Encoding.UTF8.GetString(b);
                        int at = 0;
                        while (at < Math.Min(sa.Length, sb.Length) && sa[at] == sb[at]) at++;
                        int from = Math.Max(0, at - 60);
                        diff.Add($"{k} @{at}: JS …{sa.Substring(from, Math.Min(140, sa.Length - from))}… × .NET …{sb.Substring(from, Math.Min(140, sb.Length - from))}…");
                    }
                }
                bool orderSame = js.Select(p => p.Key).SequenceEqual(net.Select(p => p.Key));
                row["identical"] = diff.Count == 0 && orderSame;
                row["orderSame"] = orderSame;
                row["parts"] = net.Count;
                row["diff"] = diff;
            }
            catch (Exception e)
            {
                row["identical"] = false;
                row["error"] = $"{e.GetType().Name}: {e.Message}";
            }
            rows.Add(row);
        }
        File.WriteAllText(outPath, JsonSerializer.Serialize(rows, new JsonSerializerOptions { WriteIndented = true }));
    }
}

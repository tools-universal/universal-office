using System.Text;

namespace UniversalOffice.Tests;

/// <summary>Localização das fixtures de paridade (dotnet/tests/fixtures).</summary>
public static class Fixtures
{
    public static readonly string Dir = Locate();

    private static string Locate()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            string candidate = Path.Combine(dir.FullName, "fixtures", "oracle-format.json");
            if (File.Exists(candidate)) return Path.Combine(dir.FullName, "fixtures");
            string candidate2 = Path.Combine(dir.FullName, "tests", "fixtures", "oracle-format.json");
            if (File.Exists(candidate2)) return Path.Combine(dir.FullName, "tests", "fixtures");
            dir = dir.Parent!;
        }
        throw new DirectoryNotFoundException("fixtures/ não encontrado — rode tools/gen-parity-fixtures.mjs");
    }

    public static byte[] InputBytes(string name) => File.ReadAllBytes(Path.Combine(Dir, "input", name));

    /// <summary>Lê o expected como texto UTF-8 cru (sem normalizar NADA).</summary>
    public static string Expected(string name)
    {
        byte[] raw = File.ReadAllBytes(Path.Combine(Dir, "expected", name));
        int offset = raw.Length >= 3 && raw[0] == 0xEF && raw[1] == 0xBB && raw[2] == 0xBF ? 3 : 0;
        return Encoding.UTF8.GetString(raw, offset, raw.Length - offset);
    }

    /// <summary>Compara byte a byte (ordinal) com mensagem apontando a 1ª divergência.</summary>
    public static void AssertParity(string expected, string actual, string label)
    {
        if (string.Equals(expected, actual, StringComparison.Ordinal)) return;
        int n = Math.Min(expected.Length, actual.Length);
        int at = 0;
        while (at < n && expected[at] == actual[at]) at++;
        int from = Math.Max(0, at - 60);
        string expCtx = expected.Substring(from, Math.Min(120, expected.Length - from));
        string actCtx = actual.Substring(from, Math.Min(120, actual.Length - from));
        throw new Xunit.Sdk.XunitException(
            $"Paridade quebrada em {label} @char {at} (expected {expected.Length} chars, actual {actual.Length}).\n" +
            $"esperado: …{expCtx.Replace("\n", "\\n").Replace("\r", "\\r")}…\n" +
            $"obtido:   …{actCtx.Replace("\n", "\\n").Replace("\r", "\\r")}…");
    }
}

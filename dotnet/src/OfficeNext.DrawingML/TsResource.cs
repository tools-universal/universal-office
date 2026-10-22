using System.Reflection;
using System.Text.RegularExpressions;

namespace OfficeNext.DrawingML;

/// <summary>
/// Tabelas de texto lidas dos PRÓPRIOS fontes TS de shared/drawingml, embutidos como
/// recurso (preset-defs.ts, light3d.ts, bevel-word.ts) — uma fonte só para JS e .NET:
/// as linhas <c>  nome: '…',</c> / <c>  'chave': '…',</c> de um objeto literal (sem
/// escapes dentro das aspas, como os geradores gravam).
/// </summary>
internal static class TsResource
{
    private static readonly Regex Entry = new(@"^\s+'?([^'\s:]+)'?: '(.*)',?\s*$", RegexOptions.CultureInvariant);

    /// <summary>Entradas string do recurso <paramref name="name"/> (todas as linhas no formato acima).</summary>
    public static Dictionary<string, string> StringTable(string name)
    {
        var outp = new Dictionary<string, string>(StringComparer.Ordinal);
        using var s = Assembly.GetExecutingAssembly().GetManifestResourceStream(name)
            ?? throw new InvalidOperationException($"{name} não embutido em OfficeNext.DrawingML");
        using var rd = new StreamReader(s);
        string? line;
        while ((line = rd.ReadLine()) is not null)
        {
            var m = Entry.Match(line);
            if (m.Success) outp[m.Groups[1].Value] = m.Groups[2].Value;
        }
        return outp;
    }
}

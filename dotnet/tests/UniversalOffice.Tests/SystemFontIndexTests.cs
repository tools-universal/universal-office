using System.Runtime.CompilerServices;
using UniversalOffice.Fonts;
using Xunit;

namespace UniversalOffice.Tests;

/// <summary>
/// Índice das fontes instaladas: as pastas são varridas com o separador do SO
/// (no Linux, um "\" no caminho fazia toda leitura de pasta falhar e o índice
/// ficava vazio — o PDF do servidor não achava nem a Liberation Serif).
/// </summary>
public class SystemFontIndexTests
{
    private static string RepoFont(string fileName, [CallerFilePath] string source = "") =>
        Path.GetFullPath(Path.Combine(Path.GetDirectoryName(source)!, "..", "..", "..", "shared", "fonts", "files", fileName));

    [Fact]
    public void Pasta_Extra_Com_Subpastas_Entra_No_Indice_Com_Caminhos_Do_So()
    {
        string root = Path.Combine(Path.GetTempPath(), "uo-fonts-" + Guid.NewGuid().ToString("N"));
        string nested = Path.Combine(root, "truetype", "liberation");
        Directory.CreateDirectory(nested);
        try
        {
            File.Copy(RepoFont("liberationserif-regular.ttf"), Path.Combine(nested, "LiberationSerif-Regular.ttf"));

            var index = SystemFontIndex.Create([root]);

            var entry = Assert.Single(index.Entries, e => e.Path.StartsWith(root, StringComparison.Ordinal));
            Assert.True(File.Exists(entry.Path), entry.Path);
            Assert.Equal("Liberation Serif", index.Face("Liberation Serif", false, false)?.Family);
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }
}

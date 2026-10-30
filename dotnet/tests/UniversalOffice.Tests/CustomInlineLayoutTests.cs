using UniversalOffice.Docx;
using UniversalOffice.DocxLayout;
using Xunit;

namespace UniversalOffice.Tests;

/// <summary>Inline de plugin (w:sdt wordnext:inline): o texto de reserva é atômico — a linha não quebra dentro dele (paridade com docx-layout/src/para.ts).</summary>
public class CustomInlineLayoutTests
{
    private const string Sdt =
        "<w:sdt><w:sdtPr><w:alias w:val=\"Integridade 2026\"/><w:tag w:val=\"wordnext:inline:acme.link:%7B%7D\"/>" +
        "<w:lock w:val=\"sdtLocked\"/></w:sdtPr><w:sdtContent><w:r><w:t xml:space=\"preserve\">Integridade 2026</w:t></w:r></w:sdtContent></w:sdt>";

    private static byte[] Docx(int words)
    {
        var pkg = DocxPackage.Empty();
        pkg.SetPartText("word/document.xml",
            "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
            "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body>" +
            $"<w:p><w:r><w:t xml:space=\"preserve\">{string.Concat(Enumerable.Repeat("palavra ", words))}</w:t></w:r>{Sdt}</w:p>" +
            "<w:sectPr><w:pgSz w:w=\"11906\" w:h=\"16838\"/><w:pgMar w:top=\"1417\" w:right=\"1701\" w:bottom=\"1417\" w:left=\"1701\"/></w:sectPr>" +
            "</w:body></w:document>");
        return pkg.Save();
    }

    [Fact]
    public void Texto_De_Reserva_Do_Inline_Nao_Quebra_Entre_Linhas()
    {
        if (!LayoutParityTests.HasFonts.Value) return; // sem as fontes da máquina: não avalia
        for (int n = 10; n <= 30; n++)
        {
            var layout = DocxLayoutPipeline.Layout(Docx(n), SubstituteFontProvider.Shared);
            var runs = layout.Pages.SelectMany(p => p.Items).OfType<GlyphRunItem>().ToList();
            double Y(string word) => runs.First(g => g.Text.Contains(word, StringComparison.Ordinal)).Y;
            Assert.True(Y("2026") == Y("Integridade"), $"com {n} palavras antes o inline quebrou");
        }
    }
}

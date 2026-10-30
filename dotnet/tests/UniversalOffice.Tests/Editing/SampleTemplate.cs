using static UniversalOffice.Tests.Editing.DocxBuilder;

namespace UniversalOffice.Tests.Editing;

/// <summary>
/// Modelo sintético de documento corporativo, salvo por um Word em português: estilos
/// com ids "Ttulo1"… e nomes internos em inglês, parágrafos-amostra #{...} (listas
/// com numeração própria) quebrados em runs, caixa de texto com #{Logo},
/// #{TitleWithCode} quebrado, rodapé com forma colorida e campos PAGE/NUMPAGES, e uma
/// capa em seção própria.
/// </summary>
internal static class SampleTemplate
{
    public const string HeadingColor = "1F3864";

    /// <summary>Nomes das amostras que um aplicativo procura no modelo (as que faltam aqui ficam de fora).</summary>
    public static readonly IReadOnlyList<string> SampleNames =
    [
        "Heading1", "Heading2", "Normal", "BulletList", "NumberedList", "Heading3", "TitleTypo", "SubtitleTypo",
        "NumberedParenthesesList", "RomanList", "UpperRomanList", "LatinList", "UpperLatinList", "LatinParenthesesList",
    ];

    /// <summary>Marcadores <c>#{...}</c> das amostras (para removê-las ao aplicar conteúdo).</summary>
    public static readonly IReadOnlyList<string> SampleMarkers = SampleNames.Select(Docx.Editing.DocxText.Parameter).ToList();

    public static readonly string Styles = $"""
        <w:styles xmlns:w="{WordNs}">
          <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
          <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
          <w:style w:type="character" w:default="1" w:styleId="Fontepargpadro"><w:name w:val="Default Paragraph Font"/></w:style>
          <w:style w:type="paragraph" w:styleId="Ttulo1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:color w:val="{HeadingColor}"/><w:sz w:val="32"/></w:rPr></w:style>
          <w:style w:type="paragraph" w:styleId="Ttulo2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:sz w:val="28"/></w:rPr></w:style>
          <w:style w:type="paragraph" w:styleId="Ttulo3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/></w:style>
          <w:style w:type="paragraph" w:styleId="Ttulo"><w:name w:val="Title"/><w:basedOn w:val="Normal"/></w:style>
          <w:style w:type="paragraph" w:styleId="Subttulo"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/></w:style>
          <w:style w:type="paragraph" w:styleId="PargrafodaLista"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="720"/></w:pPr></w:style>
          <w:style w:type="paragraph" w:styleId="Rodap"><w:name w:val="footer"/><w:basedOn w:val="Normal"/></w:style>
        </w:styles>
        """;

    public static readonly string Numbering = $"""
        <w:numbering xmlns:w="{WordNs}">
          <w:abstractNum w:abstractNumId="0"><w:nsid w:val="11111111"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
          <w:abstractNum w:abstractNumId="1"><w:nsid w:val="22222222"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
          <w:abstractNum w:abstractNumId="2"><w:nsid w:val="33333333"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%1."/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
          <w:num w:numId="7"><w:abstractNumId w:val="0"/></w:num>
          <w:num w:numId="8"><w:abstractNumId w:val="1"/></w:num>
          <w:num w:numId="10"><w:abstractNumId w:val="2"/></w:num>
        </w:numbering>
        """;

    private const string ListPPr = "<w:spacing w:after=\"360\" w:line=\"360\" w:lineRule=\"auto\"/><w:jc w:val=\"both\"/>";

    public static string ListSample(string name, string numId) =>
        Paragraph(Run("#{") + Run(name, "<w:rFonts w:cs=\"Arial\"/>") + Run("}"),
            $"<w:pStyle w:val=\"PargrafodaLista\"/><w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"{numId}\"/></w:numPr>{ListPPr}");

    public static readonly string Body =
        Paragraph(Run("Capa da política"), """<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>""") +
        Paragraph(TextBox(Paragraph(Run("#{Logo}"))) + Run("#{", "<w:sz w:val=\"40\"/>") + Run("TitleWithCode", "<w:rFonts w:cs=\"Arial\"/><w:sz w:val=\"40\"/>") + Run("}", "<w:sz w:val=\"40\"/>"),
            "<w:spacing w:after=\"1920\"/>") +
        Paragraph(Run("Versão #{Version} — #{Area}")) +
        Paragraph("", "<w:pStyle w:val=\"Ttulo1\"/>") +
        Paragraph(Run("#{") + Run("Heading1") + Run("}"), "<w:pStyle w:val=\"Ttulo1\"/>") +
        Paragraph(Run("#{") + Run("Heading2") + Run("}"), "<w:pStyle w:val=\"Ttulo2\"/>") +
        Paragraph(Run("#{") + Run("Heading3") + Run("}"), "<w:pStyle w:val=\"Ttulo3\"/>") +
        Paragraph(Run("#{") + Run("Title") + Run("Typo") + Run("}"), "<w:pStyle w:val=\"Ttulo\"/>") +
        Paragraph(Run("#{") + Run("Subtitle") + Run("Typo") + Run("}"), "<w:pStyle w:val=\"Subttulo\"/>") +
        ListSample("NumberedList", "7") +
        ListSample("RomanList", "10") +
        ListSample("BulletList", "8") +
        Paragraph(Run("#{Normal}"));

    public static readonly string Footer = $"""
        <w:ftr xmlns:w="{WordNs}" xmlns:r="{RelNs}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><w:p><w:pPr><w:pStyle w:val="Rodap"/></w:pPr>{TextBox(Paragraph(Field("PAGE  \\* Arabic", "1") + Run(" / ") + Field("NUMPAGES", "2"), "<w:jc w:val=\"right\"/>"), 1, "<a:solidFill><a:schemeClr val=\"bg2\"><a:lumMod val=\"90000\"/></a:schemeClr></a:solidFill>")}</w:p></w:ftr>
        """;

    public static byte[] Build(bool withSamples = true) =>
        new DocxBuilder()
            .WithStyles(Styles)
            .WithNumbering(Numbering)
            .WithSettings($"""<w:settings xmlns:w="{WordNs}"><w:zoom w:percent="100"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>""")
            .WithTheme("""<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office"><a:themeElements><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/></a:minorFont></a:fontScheme></a:themeElements></a:theme>""")
            .WithFooter("rId8", Footer)
            .WithBody(withSamples ? Body : Paragraph(Run("Modelo sem amostras")))
            .WithSectionProperties("""<w:sectPr><w:footerReference w:type="default" r:id="rId8"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="0" w:footer="283" w:gutter="0"/><w:cols w:space="708"/></w:sectPr>""")
            .WithEntry("customXml/item1.xml", "<b:Sources xmlns:b=\"http://schemas.openxmlformats.org/officeDocument/2006/bibliography\"/>", "application/xml")
            .WithDocumentRelationship("rId1", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml", "../customXml/item1.xml")
            .Build();
}

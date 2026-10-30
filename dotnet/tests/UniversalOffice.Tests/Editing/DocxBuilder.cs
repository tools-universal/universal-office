using System.IO.Compression;
using System.Net;
using System.Text;
using System.Xml.Linq;

namespace UniversalOffice.Tests.Editing;

/// <summary>
/// Monta .docx sintéticos para os testes de edição.
/// </summary>
internal sealed class DocxBuilder
{
    public const string WordNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    public const string RelNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    public static readonly XNamespace W = WordNs;
    public static readonly XNamespace R = RelNs;

    private const string RelBase = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
    public const string DocumentNamespaces =
        "xmlns:w=\"" + WordNs + "\" xmlns:r=\"" + RelNs + "\" " +
        "xmlns:wp=\"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing\" " +
        "xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" " +
        "xmlns:pic=\"http://schemas.openxmlformats.org/drawingml/2006/picture\" " +
        "xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" " +
        "xmlns:mc=\"http://schemas.openxmlformats.org/markup-compatibility/2006\" " +
        "xmlns:wps=\"http://schemas.microsoft.com/office/word/2010/wordprocessingShape\" " +
        "xmlns:w14=\"http://schemas.microsoft.com/office/word/2010/wordml\" mc:Ignorable=\"w14\"";

    private readonly List<(string Name, byte[] Data)> _extra = [];
    private readonly Dictionary<string, string> _overrides = [];
    private readonly Dictionary<string, string> _defaults = new()
    {
        ["rels"] = "application/vnd.openxmlformats-package.relationships+xml",
        ["xml"] = "application/xml",
        ["png"] = "image/png",
    };
    private readonly List<string> _documentRels = [];
    private readonly List<string> _packageRels = [];
    private readonly Dictionary<string, (string Xml, string ContentType)> _parts = [];
    private readonly Dictionary<string, List<string>> _partRels = [];
    private string _body = Paragraph(Run("Texto"));
    private string? _sectPr = """<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>""";
    private string _mainContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";
    private int _nextRel = 100;

    public static string Paragraph(string content, string? properties = null) =>
        $"<w:p>{(properties is null ? "" : $"<w:pPr>{properties}</w:pPr>")}{content}</w:p>";

    public static string Run(string text, string? properties = null) =>
        $"<w:r>{(properties is null ? "" : $"<w:rPr>{properties}</w:rPr>")}<w:t xml:space=\"preserve\">{WebUtility.HtmlEncode(text)}</w:t></w:r>";

    public static string CustomInline(string type, string json, string fallback, string? runProperties = null)
    {
        var tag = $"wordnext:inline:{type}:{Uri.EscapeDataString(json)}";
        return $"<w:sdt><w:sdtPr><w:alias w:val=\"{WebUtility.HtmlEncode(fallback)}\"/><w:tag w:val=\"{WebUtility.HtmlEncode(tag)}\"/><w:lock w:val=\"sdtLocked\"/></w:sdtPr><w:sdtContent>{Run(fallback, runProperties)}</w:sdtContent></w:sdt>";
    }

    public static string TagInline(string name, string fallback, string? runProperties = null) =>
        CustomInline("sample.tag", $$"""{"v":1,"name":"{{name}}"}""", fallback, runProperties);

    public static string ItemLinkInline(string type, int id, string title, int? page = null) =>
        CustomInline("sample.item-link",
            page is null
                ? $$"""{"v":1,"type":"{{type}}","id":{{id}},"title":"{{title}}"}"""
                : $$"""{"v":1,"type":"{{type}}","id":{{id}},"page":{{page}},"title":"{{title}}"}""",
            title);

    public static string Table(params string[] cells) =>
        $"<w:tbl><w:tblPr><w:tblW w:w=\"0\" w:type=\"auto\"/></w:tblPr><w:tblGrid>{string.Concat(cells.Select(_ => "<w:gridCol w:w=\"2000\"/>"))}</w:tblGrid><w:tr>{string.Concat(cells.Select(c => $"<w:tc><w:tcPr><w:tcW w:w=\"2000\" w:type=\"dxa\"/></w:tcPr>{c}</w:tc>"))}</w:tr></w:tbl>";

    public static string Rows(params string[][] rows) =>
        $"<w:tbl><w:tblPr><w:tblW w:w=\"0\" w:type=\"auto\"/></w:tblPr><w:tblGrid>{string.Concat(rows[0].Select(_ => "<w:gridCol w:w=\"2000\"/>"))}</w:tblGrid>" +
        string.Concat(rows.Select(r => $"<w:tr>{string.Concat(r.Select(c => $"<w:tc><w:tcPr><w:tcW w:w=\"2000\" w:type=\"dxa\"/></w:tcPr>{c}</w:tc>"))}</w:tr>")) +
        "</w:tbl>";

    public static string Field(string instruction, string result) =>
        "<w:r><w:fldChar w:fldCharType=\"begin\"/></w:r>" +
        $"<w:r><w:instrText xml:space=\"preserve\">{WebUtility.HtmlEncode(instruction)}</w:instrText></w:r>" +
        "<w:r><w:fldChar w:fldCharType=\"separate\"/></w:r>" +
        Run(result) +
        "<w:r><w:fldChar w:fldCharType=\"end\"/></w:r>";

    /// <summary>Caixa de texto (wps + VML de reserva) com os parágrafos dados.</summary>
    public static string TextBox(string paragraphs, int id = 6, string? fill = "<a:noFill/>") =>
        "<w:r><w:rPr><w:noProof/></w:rPr><mc:AlternateContent><mc:Choice Requires=\"wps\"><w:drawing>" +
        $"<wp:anchor distT=\"0\" distB=\"0\" distL=\"0\" distR=\"0\" simplePos=\"0\" relativeHeight=\"1\" behindDoc=\"0\" locked=\"0\" layoutInCell=\"1\" allowOverlap=\"1\"><wp:simplePos x=\"0\" y=\"0\"/><wp:positionH relativeFrom=\"margin\"><wp:align>left</wp:align></wp:positionH><wp:positionV relativeFrom=\"paragraph\"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx=\"2714625\" cy=\"1019175\"/><wp:effectExtent l=\"0\" t=\"0\" r=\"0\" b=\"0\"/><wp:wrapTopAndBottom/><wp:docPr id=\"{id}\" name=\"Caixa {id}\"/><wp:cNvGraphicFramePr/>" +
        "<a:graphic><a:graphicData uri=\"http://schemas.microsoft.com/office/word/2010/wordprocessingShape\"><wps:wsp><wps:cNvSpPr txBox=\"1\"/>" +
        $"<wps:spPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"2714625\" cy=\"1019175\"/></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom>{fill}<a:ln><a:noFill/></a:ln></wps:spPr>" +
        $"<wps:txbx><w:txbxContent>{paragraphs}</w:txbxContent></wps:txbx><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice>" +
        $"<mc:Fallback><w:pict><v:shape id=\"Caixa {id}\" type=\"#_x0000_t202\" style=\"position:absolute;width:213.75pt;height:80.25pt\" fillcolor=\"#cfcdcd\" stroked=\"f\"><v:textbox><w:txbxContent>{paragraphs}</w:txbxContent></v:textbox></v:shape></w:pict></mc:Fallback></mc:AlternateContent></w:r>";

    /// <summary>Imagem inline (relacionamento rId dado) com o tamanho em EMU.</summary>
    public static string Picture(string relId, long cx, long cy, int id = 1) =>
        $"<w:r><w:drawing><wp:inline distT=\"0\" distB=\"0\" distL=\"0\" distR=\"0\"><wp:extent cx=\"{cx}\" cy=\"{cy}\"/><wp:docPr id=\"{id}\" name=\"Imagem {id}\"/>" +
        "<a:graphic><a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/picture\"><pic:pic><pic:nvPicPr><pic:cNvPr id=\"0\" name=\"img.png\"/><pic:cNvPicPr/></pic:nvPicPr>" +
        $"<pic:blipFill><a:blip r:embed=\"{relId}\"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"{cx}\" cy=\"{cy}\"/></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>";

    public DocxBuilder WithBody(params string[] blocks)
    {
        _body = string.Concat(blocks);
        return this;
    }

    public DocxBuilder WithSectionProperties(string? sectPr)
    {
        _sectPr = sectPr;
        return this;
    }

    public DocxBuilder WithMainContentType(string contentType)
    {
        _mainContentType = contentType;
        return this;
    }

    public DocxBuilder WithStyles(string xml) => WithPart("word/styles.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml", "styles", xml);

    public DocxBuilder WithSettings(string xml) => WithPart("word/settings.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml", "settings", xml);

    public DocxBuilder WithNumbering(string xml) => WithPart("word/numbering.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml", "numbering", xml);

    public DocxBuilder WithComments(string xml) => WithPart("word/comments.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml", "comments", xml);

    public DocxBuilder WithTheme(string xml) => WithPart("word/theme/theme1.xml", "application/vnd.openxmlformats-officedocument.theme+xml", "theme", xml, "theme/theme1.xml");

    public DocxBuilder WithFootnotes(string xml) => WithPart("word/footnotes.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml", "footnotes", xml);

    public DocxBuilder WithHeader(string relId, string xml, string file = "header1.xml")
    {
        _parts["word/" + file] = (xml, "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml");
        _documentRels.Add(Rel(relId, RelBase + "header", file));
        return this;
    }

    public DocxBuilder WithFooter(string relId, string xml, string file = "footer1.xml")
    {
        _parts["word/" + file] = (xml, "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml");
        _documentRels.Add(Rel(relId, RelBase + "footer", file));
        return this;
    }

    public DocxBuilder WithFontTable(string xml, params (string RelId, string File, byte[] Data)[] embedded)
    {
        WithPart("word/fontTable.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml", "fontTable", xml);
        if (embedded.Length > 0)
        {
            _defaults["odttf"] = "application/vnd.openxmlformats-officedocument.obfuscatedFont";
            _partRels["word/fontTable.xml"] = embedded.Select(e => Rel(e.RelId, RelBase + "font", "fonts/" + e.File)).ToList();
            foreach (var e in embedded) _extra.Add(("word/fonts/" + e.File, e.Data));
        }
        return this;
    }

    public DocxBuilder WithImage(string relId, string file, byte[] data)
    {
        _extra.Add(("word/media/" + file, data));
        _documentRels.Add(Rel(relId, RelBase + "image", "media/" + file));
        return this;
    }

    public DocxBuilder WithDocumentRelationship(string id, string type, string target, bool external = false)
    {
        _documentRels.Add(Rel(id, type, target, external));
        return this;
    }

    public DocxBuilder WithPackageRelationship(string id, string type, string target)
    {
        _packageRels.Add(Rel(id, type, target));
        return this;
    }

    public DocxBuilder WithEntry(string name, string text, string? contentType = null) => WithEntry(name, Encoding.UTF8.GetBytes(text), contentType);

    public DocxBuilder WithEntry(string name, byte[] data, string? contentType = null)
    {
        _extra.Add((name, data));
        if (contentType is not null) _overrides["/" + name] = contentType;
        return this;
    }

    public DocxBuilder WithPartRelationships(string part, params string[] relationships)
    {
        _partRels[part] = [.. relationships];
        return this;
    }

    public byte[] Build()
    {
        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
        {
            var overrides = new Dictionary<string, string>(_overrides) { ["/word/document.xml"] = _mainContentType };
            foreach (var (name, (_, ct)) in _parts) overrides["/" + name] = ct;
            Write(zip, "[Content_Types].xml",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
                string.Concat(_defaults.Select(d => $"<Default Extension=\"{d.Key}\" ContentType=\"{d.Value}\"/>")) +
                string.Concat(overrides.Select(o => $"<Override PartName=\"{o.Key}\" ContentType=\"{o.Value}\"/>")) + "</Types>");
            Write(zip, "_rels/.rels", Rels([Rel("rId1", RelBase + "officeDocument", "word/document.xml"), .. _packageRels]));
            Write(zip, "word/document.xml", $"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><w:document {DocumentNamespaces}><w:body>{_body}{_sectPr}</w:body></w:document>");
            Write(zip, "word/_rels/document.xml.rels", Rels(_documentRels));
            foreach (var (name, (xml, _)) in _parts) Write(zip, name, xml);
            foreach (var (part, rels) in _partRels)
            {
                int slash = part.LastIndexOf('/');
                Write(zip, part[..(slash + 1)] + "_rels/" + part[(slash + 1)..] + ".rels", Rels(rels));
            }
            foreach (var (name, data) in _extra)
            {
                using var s = zip.CreateEntry(name).Open();
                s.Write(data);
            }
        }
        return stream.ToArray();
    }

    private DocxBuilder WithPart(string name, string contentType, string relType, string xml, string? target = null)
    {
        bool isNew = !_parts.ContainsKey(name);
        _parts[name] = (xml, contentType);
        if (isNew) _documentRels.Add(Rel($"rId{_nextRel++}", RelBase + relType, target ?? name["word/".Length..]));
        return this;
    }

    public static string Rel(string id, string type, string target, bool external = false) =>
        $"<Relationship Id=\"{id}\" Type=\"{type}\" Target=\"{WebUtility.HtmlEncode(target)}\"{(external ? " TargetMode=\"External\"" : "")}/>";

    private static string Rels(IEnumerable<string> rels) =>
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" + string.Concat(rels) + "</Relationships>";

    private static void Write(ZipArchive zip, string name, string content)
    {
        using var writer = new StreamWriter(zip.CreateEntry(name).Open(), new UTF8Encoding(false));
        writer.Write(content);
    }

    // ─────────────────────────────── leitura do resultado ───────────────────────────────

    public static string ReadPart(byte[] docx, string name)
    {
        using var zip = new ZipArchive(new MemoryStream(docx), ZipArchiveMode.Read);
        var entry = zip.GetEntry(name) ?? throw new InvalidOperationException($"parte {name} ausente");
        using var reader = new StreamReader(entry.Open());
        return reader.ReadToEnd();
    }

    public static byte[] ReadBytes(byte[] docx, string name)
    {
        using var zip = new ZipArchive(new MemoryStream(docx), ZipArchiveMode.Read);
        var entry = zip.GetEntry(name) ?? throw new InvalidOperationException($"parte {name} ausente");
        using var ms = new MemoryStream();
        using (var s = entry.Open()) s.CopyTo(ms);
        return ms.ToArray();
    }

    public static bool HasPart(byte[] docx, string name)
    {
        using var zip = new ZipArchive(new MemoryStream(docx), ZipArchiveMode.Read);
        return zip.GetEntry(name) is not null;
    }

    public static List<string> PartNames(byte[] docx)
    {
        using var zip = new ZipArchive(new MemoryStream(docx), ZipArchiveMode.Read);
        return zip.Entries.Select(e => e.FullName).ToList();
    }

    public static XDocument Xml(byte[] docx, string name = "word/document.xml") => XDocument.Parse(ReadPart(docx, name));

    public static string BodyText(byte[] docx) =>
        string.Concat(Xml(docx).Descendants(W + "body").Single().Descendants(W + "t").Select(t => t.Value));

    public static List<XElement> BodyParagraphs(byte[] docx) =>
        Xml(docx).Descendants(W + "body").Single().Elements(W + "p").ToList();

    public static string Text(XElement paragraph) => string.Concat(paragraph.Descendants(W + "t").Select(t => t.Value));

    public static string? StyleOf(XElement paragraph) =>
        (string?)paragraph.Element(W + "pPr")?.Element(W + "pStyle")?.Attribute(W + "val");

    public static string AllXml(byte[] docx) =>
        string.Concat(PartNames(docx).Where(n => n.EndsWith(".xml", StringComparison.Ordinal) || n.EndsWith(".rels", StringComparison.Ordinal)).Select(n => ReadPart(docx, n)));

    /// <summary>Alvo do relacionamento da parte principal.</summary>
    public static string? RelTarget(byte[] docx, string id, string part = "word/_rels/document.xml.rels") =>
        (string?)XDocument.Parse(ReadPart(docx, part)).Root!.Elements().FirstOrDefault(e => (string?)e.Attribute("Id") == id)?.Attribute("Target");

    /// <summary>PNG 1×1 válido.</summary>
    public static readonly byte[] OnePixelPng = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

    /// <summary>PNG com o tamanho dado no cabeçalho (só o IHDR importa para o leitor de tamanho).</summary>
    public static byte[] PngOfSize(int width, int height)
    {
        var png = (byte[])OnePixelPng.Clone();
        png[16] = (byte)(width >> 24); png[17] = (byte)(width >> 16); png[18] = (byte)(width >> 8); png[19] = (byte)width;
        png[20] = (byte)(height >> 24); png[21] = (byte)(height >> 16); png[22] = (byte)(height >> 8); png[23] = (byte)height;
        return png;
    }
}

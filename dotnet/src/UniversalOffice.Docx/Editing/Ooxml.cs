using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>Namespaces OOXML usados pela edição (XLinq resolve por namespace, não por prefixo).</summary>
internal static class Ns
{
    public static readonly XNamespace W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    public static readonly XNamespace R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    public static readonly XNamespace PackageRels = "http://schemas.openxmlformats.org/package/2006/relationships";
    public static readonly XNamespace ContentTypes = "http://schemas.openxmlformats.org/package/2006/content-types";
    public static readonly XNamespace Wp = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
    public static readonly XNamespace A = "http://schemas.openxmlformats.org/drawingml/2006/main";
    public static readonly XNamespace Pic = "http://schemas.openxmlformats.org/drawingml/2006/picture";
    public static readonly XNamespace Mc = "http://schemas.openxmlformats.org/markup-compatibility/2006";
    public static readonly XNamespace V = "urn:schemas-microsoft-com:vml";
    public static readonly XNamespace O = "urn:schemas-microsoft-com:office:office";
    public static readonly XNamespace W14 = "http://schemas.microsoft.com/office/word/2010/wordml";
    public static readonly XNamespace Wps = "http://schemas.microsoft.com/office/word/2010/wordprocessingShape";
    public static readonly XNamespace M = "http://schemas.openxmlformats.org/officeDocument/2006/math";
    public static readonly XNamespace Cp = "http://schemas.openxmlformats.org/package/2006/metadata/core-properties";
    public static readonly XNamespace Dc = "http://purl.org/dc/elements/1.1/";
    public static readonly XNamespace DcTerms = "http://purl.org/dc/terms/";
    public static readonly XNamespace Xsi = "http://www.w3.org/2001/XMLSchema-instance";
    public static readonly XNamespace ExtendedProps = "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties";
    public static readonly XNamespace CustomProps = "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties";
    public static readonly XNamespace Xml = XNamespace.Xml;
}

/// <summary>Nomes WordprocessingML mais usados (w:*).</summary>
internal static class W
{
    private static XName N(string local) => Ns.W + local;

    public static readonly XName document = N("document");
    public static readonly XName body = N("body");
    public static readonly XName p = N("p");
    public static readonly XName pPr = N("pPr");
    public static readonly XName r = N("r");
    public static readonly XName rPr = N("rPr");
    public static readonly XName t = N("t");
    public static readonly XName tab = N("tab");
    public static readonly XName br = N("br");
    public static readonly XName cr = N("cr");
    public static readonly XName sym = N("sym");
    public static readonly XName noBreakHyphen = N("noBreakHyphen");
    public static readonly XName softHyphen = N("softHyphen");
    public static readonly XName ptab = N("ptab");
    public static readonly XName delText = N("delText");
    public static readonly XName instrText = N("instrText");
    public static readonly XName delInstrText = N("delInstrText");
    public static readonly XName fldChar = N("fldChar");
    public static readonly XName fldCharType = N("fldCharType");
    public static readonly XName fldSimple = N("fldSimple");
    public static readonly XName instr = N("instr");
    public static readonly XName hyperlink = N("hyperlink");
    public static readonly XName anchor = N("anchor");
    public static readonly XName history = N("history");
    public static readonly XName sdt = N("sdt");
    public static readonly XName sdtPr = N("sdtPr");
    public static readonly XName sdtContent = N("sdtContent");
    public static readonly XName sdtEndPr = N("sdtEndPr");
    public static readonly XName alias = N("alias");
    public static readonly XName tag = N("tag");
    public static readonly XName @lock = N("lock");
    public static readonly XName id = N("id");
    public static readonly XName val = N("val");
    public static readonly XName name = N("name");
    public static readonly XName type = N("type");
    public static readonly XName smartTag = N("smartTag");
    public static readonly XName customXml = N("customXml");
    public static readonly XName dir = N("dir");
    public static readonly XName bdo = N("bdo");
    public static readonly XName ins = N("ins");
    public static readonly XName del = N("del");
    public static readonly XName moveFrom = N("moveFrom");
    public static readonly XName moveTo = N("moveTo");
    public static readonly XName tbl = N("tbl");
    public static readonly XName tr = N("tr");
    public static readonly XName trPr = N("trPr");
    public static readonly XName tc = N("tc");
    public static readonly XName tcPr = N("tcPr");
    public static readonly XName sectPr = N("sectPr");
    public static readonly XName headerReference = N("headerReference");
    public static readonly XName footerReference = N("footerReference");
    public static readonly XName pgSz = N("pgSz");
    public static readonly XName pgMar = N("pgMar");
    public static readonly XName cols = N("cols");
    public static readonly XName col = N("col");
    public static readonly XName space = N("space");
    public static readonly XName equalWidth = N("equalWidth");
    public static readonly XName pgNumType = N("pgNumType");
    public static readonly XName titlePg = N("titlePg");
    public static readonly XName sectPrChange = N("sectPrChange");
    public static readonly XName pStyle = N("pStyle");
    public static readonly XName rStyle = N("rStyle");
    public static readonly XName tblStyle = N("tblStyle");
    public static readonly XName numPr = N("numPr");
    public static readonly XName ilvl = N("ilvl");
    public static readonly XName numId = N("numId");
    public static readonly XName ind = N("ind");
    public static readonly XName jc = N("jc");
    public static readonly XName keepNext = N("keepNext");
    public static readonly XName spacing = N("spacing");
    public static readonly XName b = N("b");
    public static readonly XName i = N("i");
    public static readonly XName u = N("u");
    public static readonly XName strike = N("strike");
    public static readonly XName color = N("color");
    public static readonly XName shd = N("shd");
    public static readonly XName vertAlign = N("vertAlign");
    public static readonly XName rFonts = N("rFonts");
    public static readonly XName drawing = N("drawing");
    public static readonly XName pict = N("pict");
    public static readonly XName @object = N("object");
    public static readonly XName control = N("control");
    public static readonly XName altChunk = N("altChunk");
    public static readonly XName subDoc = N("subDoc");
    public static readonly XName txbxContent = N("txbxContent");
    public static readonly XName hdr = N("hdr");
    public static readonly XName ftr = N("ftr");
    public static readonly XName footnotes = N("footnotes");
    public static readonly XName endnotes = N("endnotes");
    public static readonly XName footnote = N("footnote");
    public static readonly XName endnote = N("endnote");
    public static readonly XName footnoteReference = N("footnoteReference");
    public static readonly XName endnoteReference = N("endnoteReference");
    public static readonly XName comment = N("comment");
    public static readonly XName comments = N("comments");
    public static readonly XName commentRangeStart = N("commentRangeStart");
    public static readonly XName commentRangeEnd = N("commentRangeEnd");
    public static readonly XName commentReference = N("commentReference");
    public static readonly XName bookmarkStart = N("bookmarkStart");
    public static readonly XName bookmarkEnd = N("bookmarkEnd");
    public static readonly XName styles = N("styles");
    public static readonly XName style = N("style");
    public static readonly XName styleId = N("styleId");
    public static readonly XName @default = N("default");
    public static readonly XName basedOn = N("basedOn");
    public static readonly XName next = N("next");
    public static readonly XName link = N("link");
    public static readonly XName numbering = N("numbering");
    public static readonly XName abstractNum = N("abstractNum");
    public static readonly XName abstractNumId = N("abstractNumId");
    public static readonly XName num = N("num");
    public static readonly XName nsid = N("nsid");
    public static readonly XName lvl = N("lvl");
    public static readonly XName start = N("start");
    public static readonly XName lvlOverride = N("lvlOverride");
    public static readonly XName startOverride = N("startOverride");
    public static readonly XName numStyleLink = N("numStyleLink");
    public static readonly XName styleLink = N("styleLink");
    public static readonly XName lvlPicBulletId = N("lvlPicBulletId");
    public static readonly XName numPicBullet = N("numPicBullet");
    public static readonly XName numPicBulletId = N("numPicBulletId");
    public static readonly XName numIdMacAtCleanup = N("numIdMacAtCleanup");
    public static readonly XName fonts = N("fonts");
    public static readonly XName font = N("font");
    public static readonly XName settings = N("settings");
    public static readonly XName embedTrueTypeFonts = N("embedTrueTypeFonts");
    public static readonly XName left = N("left");
    public static readonly XName w = N("w");
    public static readonly XName h = N("h");
    public static readonly XName top = N("top");
    public static readonly XName bottom = N("bottom");
    public static readonly XName right = N("right");
    public static readonly XName gutter = N("gutter");
    public static readonly XName lastRenderedPageBreak = N("lastRenderedPageBreak");
    public static readonly XName proofErr = N("proofErr");
    public static readonly XName permStart = N("permStart");
    public static readonly XName permEnd = N("permEnd");
}

/// <summary>Tipos de relacionamento (comparação pelo último segmento, que é estável entre variantes).</summary>
internal static class RelTypes
{
    public const string OfficeDocumentBase = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
    public const string OfficeDocument = OfficeDocumentBase + "officeDocument";
    public const string Styles = OfficeDocumentBase + "styles";
    public const string Numbering = OfficeDocumentBase + "numbering";
    public const string Settings = OfficeDocumentBase + "settings";
    public const string FontTable = OfficeDocumentBase + "fontTable";
    public const string Footnotes = OfficeDocumentBase + "footnotes";
    public const string Endnotes = OfficeDocumentBase + "endnotes";
    public const string Header = OfficeDocumentBase + "header";
    public const string Footer = OfficeDocumentBase + "footer";
    public const string Image = OfficeDocumentBase + "image";
    public const string Hyperlink = OfficeDocumentBase + "hyperlink";
    public const string CustomProperties = OfficeDocumentBase + "custom-properties";
    public const string ExtendedProperties = OfficeDocumentBase + "extended-properties";
    public const string CoreProperties = "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties";

    /// <summary>O tipo termina com <paramref name="suffix"/> (ex.: "image", "header").</summary>
    public static bool Is(string type, string suffix) =>
        type.EndsWith("/" + suffix, StringComparison.OrdinalIgnoreCase);

    public static string Last(string type)
    {
        int slash = type.LastIndexOf('/');
        return slash < 0 ? type : type[(slash + 1)..];
    }

    /// <summary>Relacionamentos cujo alvo só existe enquanto algum atributo da parte aponta para o id
    /// (os demais — estilos, numeração, notas… — são implícitos e nunca são coletados).</summary>
    public static readonly HashSet<string> Referenced = new(StringComparer.OrdinalIgnoreCase)
    {
        "image", "hyperlink", "oleObject", "package", "control", "aFChunk", "header", "footer", "subDocument",
        "chart", "diagramData", "diagramLayout", "diagramQuickStyle", "diagramColors", "diagramDrawing",
        "video", "audio", "media", "hdphoto", "font", "activeXControlBinary", "frame", "attachedTemplate",
        "mailMergeSource", "mailMergeHeaderSource", "recipientData", "slide",
    };
}

/// <summary>Content types das partes que a edição cria.</summary>
internal static class ContentTypes
{
    public const string MainDocument = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";
    public const string Styles = "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml";
    public const string Numbering = "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml";
    public const string Footnotes = "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml";
    public const string Endnotes = "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml";
    public const string FontTable = "application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml";
    public const string Settings = "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml";
    public const string CoreProperties = "application/vnd.openxmlformats-package.core-properties+xml";
    public const string ExtendedProperties = "application/vnd.openxmlformats-officedocument.extended-properties+xml";
    public const string Relationships = "application/vnd.openxmlformats-package.relationships+xml";
}

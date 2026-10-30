using System.Globalization;
using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>Área útil da página de uma seção (twips).</summary>
public readonly record struct DocxPageArea(int PageWidth, int PageHeight, int MarginLeft, int MarginRight, int MarginTop, int MarginBottom, int Gutter)
{
    public int ClientWidth => Math.Max(0, PageWidth - MarginLeft - MarginRight - Gutter);
    public int ClientHeight => Math.Max(0, PageHeight - Math.Abs(MarginTop) - Math.Abs(MarginBottom));

    /// <summary>Área da seção (padrão do Word, Carta com margens de 1", quando o sectPr não diz).</summary>
    public static DocxPageArea From(XElement? sectPr)
    {
        var size = sectPr?.Element(W.pgSz);
        var mar = sectPr?.Element(W.pgMar);
        return new DocxPageArea(
            Twips(size, W.w, 12240), Twips(size, W.h, 15840),
            Twips(mar, W.left, 1440), Twips(mar, W.right, 1440),
            Twips(mar, W.top, 1440), Twips(mar, W.bottom, 1440),
            Twips(mar, W.gutter, 0));
    }

    private static int Twips(XElement? el, XName attr, int fallback) =>
        int.TryParse((string?)el?.Attribute(attr), NumberStyles.Integer, CultureInfo.InvariantCulture, out var v) ? v : fallback;
}

/// <summary>Imagens: inserir (inline, DrawingML) e reduzir as que não cabem na página.</summary>
public static class DocxPictures
{
    public const long EmuPerTwip = 635;
    public const long EmuPerPoint = 12700;

    /// <summary>
    /// Acrescenta a imagem ao pacote (word/media) relacionada à parte dada e devolve o
    /// <c>w:drawing</c> inline no tamanho físico dela (pela resolução da imagem; 96 dpi
    /// se não houver), reduzido proporcionalmente para caber em <paramref name="maxWidthEmu"/>
    /// × <paramref name="maxHeightEmu"/> quando dados. Formatos: PNG, JPEG, GIF, BMP.
    /// </summary>
    internal static XElement CreateInline(DocxDocument doc, string partPath, byte[] image, long? maxWidthEmu = null, long? maxHeightEmu = null, string? name = null)
    {
        var (relId, info) = AddImage(doc, partPath, image);
        var (cx, cy) = Fit(info.WidthEmu, info.HeightEmu, maxWidthEmu, maxHeightEmu);
        return InlineDrawing(relId, cx, cy, NextDocPrId(doc), name ?? "Picture");
    }

    /// <summary>Grava a imagem em word/media e relaciona à parte; devolve o id do relacionamento.</summary>
    internal static (string RelId, ImageInfo Info) AddImage(DocxDocument doc, string partPath, byte[] image)
    {
        var info = ImageInfo.TryRead(image) ?? throw new ArgumentException("imagem em formato não suportado (PNG, JPEG, GIF ou BMP)", nameof(image));
        string mediaPath = doc.UniquePartPath("word/media/image1." + info.Extension);
        doc.SetBinaryPart(mediaPath, image, info.ContentType);
        string relId = doc.AddRelationship(partPath, RelTypes.Image, DocxDocument.RelativeTarget(partPath, mediaPath), external: false);
        return (relId, info);
    }

    /// <summary>w:drawing inline (wp:inline + pic:pic) para uma imagem já relacionada.</summary>
    internal static XElement InlineDrawing(string relId, long cx, long cy, int docPrId, string name) =>
        new(W.drawing,
            new XElement(Ns.Wp + "inline",
                new XAttribute("distT", "0"), new XAttribute("distB", "0"), new XAttribute("distL", "0"), new XAttribute("distR", "0"),
                new XElement(Ns.Wp + "extent", new XAttribute("cx", cx), new XAttribute("cy", cy)),
                new XElement(Ns.Wp + "effectExtent", new XAttribute("l", "0"), new XAttribute("t", "0"), new XAttribute("r", "0"), new XAttribute("b", "0")),
                new XElement(Ns.Wp + "docPr", new XAttribute("id", docPrId), new XAttribute("name", name + " " + docPrId)),
                new XElement(Ns.Wp + "cNvGraphicFramePr",
                    new XElement(Ns.A + "graphicFrameLocks", new XAttribute(XNamespace.Xmlns + "a", Ns.A.NamespaceName), new XAttribute("noChangeAspect", "1"))),
                new XElement(Ns.A + "graphic", new XAttribute(XNamespace.Xmlns + "a", Ns.A.NamespaceName),
                    new XElement(Ns.A + "graphicData", new XAttribute("uri", Ns.Pic.NamespaceName),
                        new XElement(Ns.Pic + "pic", new XAttribute(XNamespace.Xmlns + "pic", Ns.Pic.NamespaceName),
                            new XElement(Ns.Pic + "nvPicPr",
                                new XElement(Ns.Pic + "cNvPr", new XAttribute("id", "0"), new XAttribute("name", name)),
                                new XElement(Ns.Pic + "cNvPicPr")),
                            new XElement(Ns.Pic + "blipFill",
                                new XElement(Ns.A + "blip", new XAttribute(Ns.R + "embed", relId)),
                                new XElement(Ns.A + "stretch", new XElement(Ns.A + "fillRect"))),
                            new XElement(Ns.Pic + "spPr",
                                new XElement(Ns.A + "xfrm",
                                    new XElement(Ns.A + "off", new XAttribute("x", "0"), new XAttribute("y", "0")),
                                    new XElement(Ns.A + "ext", new XAttribute("cx", cx), new XAttribute("cy", cy))),
                                new XElement(Ns.A + "prstGeom", new XAttribute("prst", "rect"), new XElement(Ns.A + "avLst"))))))));

    /// <summary>Reduz (nunca amplia) mantendo a proporção.</summary>
    public static (long Cx, long Cy) Fit(long cx, long cy, long? maxCx, long? maxCy)
    {
        double scale = 1;
        if (maxCx is > 0 && cx > maxCx) scale = Math.Min(scale, (double)maxCx.Value / cx);
        if (maxCy is > 0 && cy > maxCy) scale = Math.Min(scale, (double)maxCy.Value / cy);
        return scale < 1 ? ((long)Math.Round(cx * scale), (long)Math.Round(cy * scale)) : (cx, cy);
    }

    /// <summary>
    /// Reduz proporcionalmente toda imagem do corpo (DrawingML inline/âncora com
    /// pic:pic e VML com v:imagedata) maior que a área útil da seção onde está: largura
    /// útil (da coluna, em seção com colunas) menos o recuo esquerdo do parágrafo
    /// (direto, do nível da lista ou do estilo) e altura útil. Devolve quantas reduziu.
    /// </summary>
    public static int FitToPage(DocxDocument doc) => FitWithin(doc, [doc.Body]);

    /// <summary>Como <see cref="FitToPage"/>, só nas imagens dentro dos elementos dados.</summary>
    internal static int FitWithin(DocxDocument doc, IEnumerable<XElement> containers)
    {
        int count = 0;
        var roots = containers.ToList();
        foreach (var drawing in roots.SelectMany(r => r.DescendantsAndSelf(W.drawing)).ToList())
        {
            var paragraph = drawing.Ancestors(W.p).FirstOrDefault();
            if (paragraph is null) continue;
            var (width, height) = AvailableArea(doc, paragraph);
            long maxCx = width * EmuPerTwip;
            long maxCy = height * EmuPerTwip;
            var shape = drawing.Elements().FirstOrDefault(e => e.Name == Ns.Wp + "inline" || e.Name == Ns.Wp + "anchor");
            var extent = shape?.Element(Ns.Wp + "extent");
            if (extent is null || shape!.Element(Ns.A + "graphic")?.Element(Ns.A + "graphicData")?.Element(Ns.Pic + "pic") is not { } pic) continue;
            if (!long.TryParse((string?)extent.Attribute("cx"), out long cx) || !long.TryParse((string?)extent.Attribute("cy"), out long cy)) continue;
            var (nx, ny) = Fit(cx, cy, maxCx, maxCy);
            if (nx == cx && ny == cy) continue;
            extent.SetAttributeValue("cx", nx);
            extent.SetAttributeValue("cy", ny);
            var ext = pic.Element(Ns.Pic + "spPr")?.Element(Ns.A + "xfrm")?.Element(Ns.A + "ext");
            ext?.SetAttributeValue("cx", nx);
            ext?.SetAttributeValue("cy", ny);
            count++;
        }
        foreach (var shape in roots.SelectMany(r => r.Descendants(Ns.V + "shape")).Where(s => s.Element(Ns.V + "imagedata") is not null && s.Ancestors(W.pict).Any()).ToList())
        {
            var paragraph = shape.Ancestors(W.p).FirstOrDefault();
            if (paragraph is null) continue;
            var (width, height) = AvailableArea(doc, paragraph);
            double maxW = width / 20.0;
            double maxH = height / 20.0;
            if (FitVml(shape, maxW, maxH)) count++;
        }
        return count;
    }

    /// <summary>Largura e altura (twips) disponíveis para uma imagem no parágrafo: coluna da seção menos o recuo esquerdo, e altura útil.</summary>
    private static (int Width, int Height) AvailableArea(DocxDocument doc, XElement paragraph)
    {
        var section = DocxSections.SectionOf(doc, paragraph);
        var area = DocxPageArea.From(section);
        int width = DocxSections.ColumnWidth(section, area.ClientWidth) - Math.Max(0, LeftIndent(doc, paragraph));
        return (width, area.ClientHeight);
    }

    /// <summary>Recuo esquerdo efetivo (twips): direto → nível da numeração → estilo.</summary>
    internal static int LeftIndent(DocxDocument doc, XElement paragraph)
    {
        var direct = paragraph.Element(W.pPr)?.Element(W.ind);
        if (IndentValue(direct) is int d) return d;
        var numPr = paragraph.Element(W.pPr)?.Element(W.numPr) ?? DocxStyles.ResolvePPrChild(doc, paragraph, W.numPr);
        if (numPr is not null)
        {
            string? numId = (string?)numPr.Element(W.numId)?.Attribute(W.val);
            int ilvl = int.TryParse((string?)numPr.Element(W.ilvl)?.Attribute(W.val), out var l) ? l : 0;
            if (numId is not null && DocxNumbering.LevelIndent(doc, numId, ilvl) is int fromList) return fromList;
        }
        return IndentValue(DocxStyles.ResolvePPrChild(doc, paragraph, W.ind)) ?? 0;
    }

    private static int? IndentValue(XElement? ind)
    {
        if (ind is null) return null;
        string? v = (string?)ind.Attribute(W.left) ?? (string?)ind.Attribute(Ns.W + "start");
        return int.TryParse(v, NumberStyles.Integer, CultureInfo.InvariantCulture, out var n) ? n : null;
    }

    private static readonly Regex VmlSize = new(@"(?<prop>width|height)\s*:\s*(?<num>[0-9.]+)\s*(?<unit>pt|in|cm|mm|px)?", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

    private static bool FitVml(XElement shape, double maxWidthPt, double maxHeightPt)
    {
        string style = (string?)shape.Attribute("style") ?? "";
        double? width = null, height = null;
        foreach (Match m in VmlSize.Matches(style))
        {
            double pt = ToPoints(double.Parse(m.Groups["num"].Value, CultureInfo.InvariantCulture), m.Groups["unit"].Value);
            if (m.Groups["prop"].Value.Equals("width", StringComparison.OrdinalIgnoreCase)) width ??= pt;
            else height ??= pt;
        }
        if (width is not > 0 || height is not > 0) return false;
        double scale = Math.Min(1, Math.Min(maxWidthPt / width.Value, maxHeightPt / height.Value));
        if (scale >= 1) return false;
        string fixedStyle = VmlSize.Replace(style, m =>
        {
            bool isWidth = m.Groups["prop"].Value.Equals("width", StringComparison.OrdinalIgnoreCase);
            double v = (isWidth ? width.Value : height.Value) * scale;
            return m.Groups["prop"].Value + ":" + v.ToString("0.##", CultureInfo.InvariantCulture) + "pt";
        });
        shape.SetAttributeValue("style", fixedStyle);
        return true;
    }

    private static double ToPoints(double value, string unit) => unit.ToLowerInvariant() switch
    {
        "in" => value * 72,
        "cm" => value * 72 / 2.54,
        "mm" => value * 72 / 25.4,
        "px" => value * 0.75,
        _ => value,
    };

    /// <summary>Próximo wp:docPr id livre (únicos no documento inteiro, como o Word exige).</summary>
    internal static int NextDocPrId(DocxDocument doc)
    {
        int max = 0;
        foreach (var (_, root) in doc.Stories())
            foreach (var docPr in root.Descendants(Ns.Wp + "docPr"))
                if (int.TryParse((string?)docPr.Attribute("id"), out var id)) max = Math.Max(max, id);
        return max + 1;
    }
}

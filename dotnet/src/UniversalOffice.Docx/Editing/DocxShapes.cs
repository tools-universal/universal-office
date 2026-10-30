using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>Cabeçalho ou rodapé de uma seção (o tipo da referência w:headerReference/w:footerReference).</summary>
public enum DocxHeaderFooterType
{
    Default,
    First,
    Even,
}

/// <summary>
/// Forma/caixa de texto do documento (DrawingML <c>wps:wsp</c> e/ou o VML de reserva
/// <c>v:shape</c> do mesmo mc:AlternateContent — as operações valem para os dois).
/// </summary>
public sealed class DocxShape
{
    private readonly XElement _run;

    internal DocxShape(XElement run) => _run = run;

    private IEnumerable<XElement> DrawingShapes => _run.Descendants(Ns.Wps + "wsp").Where(IsOwn);
    private IEnumerable<XElement> VmlShapes => _run.Descendants().Where(e => e.Name.Namespace == Ns.V && e.Name.LocalName is "shape" or "rect" or "roundrect" && IsOwn(e));
    private IEnumerable<XElement> TextBoxes => _run.Descendants(W.txbxContent).Where(IsOwn);

    /// <summary>O elemento é deste run (não de uma forma aninhada no texto da caixa).</summary>
    private bool IsOwn(XElement e) => e.Ancestors(W.r).FirstOrDefault() == _run;

    internal static bool HasOwnShape(XElement run) =>
        run.Descendants().Any(e => (e.Name == Ns.Wps + "wsp" || (e.Name.Namespace == Ns.V && e.Name.LocalName is "shape" or "rect" or "roundrect"))
                                   && e.Ancestors(W.r).FirstOrDefault() == run);

    /// <summary>Texto da caixa (primeira representação).</summary>
    public string Text => TextBoxes.FirstOrDefault() is { } box
        ? string.Join("\r\n", box.Elements(W.p).Select(ParagraphText.PlainText))
        : "";

    /// <summary>Esvazia o texto da caixa (fica um parágrafo vazio).</summary>
    public void ClearText()
    {
        foreach (var box in TextBoxes.ToList())
        {
            box.RemoveNodes();
            box.Add(new XElement(W.p));
        }
    }

    /// <summary>Preenchimento sólido com a cor RGB dada ("RRGGBB" ou "#RRGGBB").</summary>
    public void SetFillColor(string rgb)
    {
        string hex = Colors.NormalizeHex(rgb) ?? throw new ArgumentException("cor RGB inválida", nameof(rgb));
        foreach (var wsp in DrawingShapes)
            SetDrawingFill(wsp, new XElement(Ns.A + "solidFill", new XElement(Ns.A + "srgbClr", new XAttribute("val", hex))));
        foreach (var shape in VmlShapes)
        {
            shape.SetAttributeValue("fillcolor", "#" + hex);
            shape.SetAttributeValue("filled", null);
            shape.Elements(Ns.V + "fill").Remove();
        }
    }

    /// <summary>Sem preenchimento (o "transparência 100%" do DocIO).</summary>
    public void SetFillTransparent()
    {
        foreach (var wsp in DrawingShapes)
            SetDrawingFill(wsp, new XElement(Ns.A + "noFill"));
        foreach (var shape in VmlShapes)
        {
            shape.SetAttributeValue("filled", "f");
            shape.Elements(Ns.V + "fill").Remove();
        }
    }

    /// <summary>Cor do texto dos runs da caixa (só do último parágrafo, o padrão, ou de todos).</summary>
    public void SetTextColor(string rgb, bool lastParagraphOnly = true)
    {
        string hex = Colors.NormalizeHex(rgb) ?? throw new ArgumentException("cor RGB inválida", nameof(rgb));
        foreach (var box in TextBoxes.ToList())
        {
            var paragraphs = box.Elements(W.p).ToList();
            if (paragraphs.Count == 0) continue;
            foreach (var p in lastParagraphOnly ? [paragraphs[^1]] : paragraphs)
                foreach (var r in p.Descendants(W.r).Where(r => r.Ancestors(W.txbxContent).First() == box).ToList())
                    XmlOrder.Set(XmlOrder.EnsureRPr(r), new XElement(W.color, new XAttribute(W.val, hex)), XmlOrder.RPr);
        }
    }

    /// <summary>Remove a forma do documento (o run que a contém).</summary>
    public void Remove()
    {
        _run.Remove();
    }

    private static readonly HashSet<string> FillNames = ["noFill", "solidFill", "gradFill", "blipFill", "pattFill", "grpFill"];

    private static void SetDrawingFill(XElement wsp, XElement fill)
    {
        var spPr = wsp.Element(Ns.Wps + "spPr");
        if (spPr is null)
        {
            spPr = new XElement(Ns.Wps + "spPr");
            var after = wsp.Element(Ns.Wps + "cNvSpPr") ?? wsp.Element(Ns.Wps + "cNvCnPr");
            if (after is not null) after.AddAfterSelf(spPr); else wsp.AddFirst(spPr);
        }
        var existing = spPr.Elements().FirstOrDefault(e => e.Name.Namespace == Ns.A && FillNames.Contains(e.Name.LocalName));
        if (existing is not null)
        {
            existing.ReplaceWith(fill);
            return;
        }
        // ordem: xfrm, custGeom|prstGeom, (preenchimento), ln, effectLst…
        var geometry = spPr.Elements().LastOrDefault(e => e.Name == Ns.A + "xfrm" || e.Name == Ns.A + "custGeom" || e.Name == Ns.A + "prstGeom");
        if (geometry is not null) geometry.AddAfterSelf(fill);
        else spPr.AddFirst(fill);
    }
}

/// <summary>
/// Formas, caixas de texto, cabeçalhos e rodapés de um modelo (ex.: logotipo numa
/// caixa de texto, faixa colorida com número de página no rodapé).
/// </summary>
public static class DocxShapes
{
    /// <summary>
    /// Formas (caixas de texto) cujo texto contém <paramref name="text"/> (diferencia
    /// maiúsculas, palavra inteira), em ordem de documento — corpo, cabeçalhos e rodapés.
    /// </summary>
    public static IReadOnlyList<DocxShape> FindContaining(DocxDocument doc, string text)
    {
        var runs = new List<XElement>();
        foreach (var p in DocxText.FindParagraphs(doc, text, caseSensitive: true, wholeWord: true, DocxTextScope.Document))
        {
            var box = p.Ancestors(W.txbxContent).LastOrDefault();
            var run = box?.Ancestors(W.r).FirstOrDefault();
            if (run is not null && !runs.Contains(run)) runs.Add(run);
        }
        return runs.Select(r => new DocxShape(r)).ToList();
    }

    /// <summary>Remove as formas cujo texto contém <paramref name="text"/>. Devolve quantas removeu.</summary>
    public static int RemoveContaining(DocxDocument doc, string text)
    {
        var shapes = FindContaining(doc, text);
        foreach (var shape in shapes) shape.Remove();
        if (shapes.Count > 0) doc.MarkChanged();
        return shapes.Count;
    }

    /// <summary>
    /// Troca cada ocorrência do texto (ex.: <c>#{Logo}</c>, sem diferenciar maiúsculas,
    /// palavra inteira) por uma imagem inline no tamanho físico dela, reduzida para caber
    /// em <paramref name="maxWidthPt"/> × <paramref name="maxHeightPt"/> (pontos) quando
    /// dados. A imagem é gravada uma vez por parte. Devolve quantas trocou.
    /// </summary>
    public static int ReplaceTextWithImage(DocxDocument doc, string text, byte[] image, float? maxWidthPt = null, float? maxHeightPt = null)
    {
        int count = 0;
        var relByPart = new Dictionary<string, (string RelId, ImageInfo Info)>(StringComparer.OrdinalIgnoreCase);
        foreach (var (part, root) in doc.Stories())
        {
            foreach (var p in ParagraphText.Paragraphs(root).ToList())
            {
                var matches = ParagraphText.Build(p).Find(text, caseSensitive: false, wholeWord: true);
                for (int k = matches.Count - 1; k >= 0; k--)
                {
                    if (!relByPart.TryGetValue(part, out var added))
                        relByPart[part] = added = DocxPictures.AddImage(doc, part, image);
                    var (cx, cy) = DocxPictures.Fit(added.Info.WidthEmu, added.Info.HeightEmu,
                        maxWidthPt is null ? null : (long)(maxWidthPt.Value * DocxPictures.EmuPerPoint),
                        maxHeightPt is null ? null : (long)(maxHeightPt.Value * DocxPictures.EmuPerPoint));
                    int docPrId = DocxPictures.NextDocPrId(doc);
                    ParagraphText.Build(p).ReplaceWithElement(matches[k].Start, matches[k].Length, rPr =>
                    {
                        var run = new XElement(W.r);
                        if (rPr is not null) run.Add(rPr);
                        run.Add(DocxPictures.InlineDrawing(added.RelId, cx, cy, docPrId, "Picture"));
                        return run;
                    });
                    count++;
                }
            }
        }
        if (count > 0) doc.MarkChanged();
        return count;
    }

    /// <summary>
    /// Primeira forma (caixa de texto/forma DrawingML ou VML) do cabeçalho ou rodapé
    /// da ÚLTIMA seção, ou null.
    /// </summary>
    public static DocxShape? FirstShapeIn(DocxDocument doc, bool footer, DocxHeaderFooterType type = DocxHeaderFooterType.Default)
    {
        var root = HeaderFooterRoot(doc, footer, type);
        var run = root?.Descendants(W.r).FirstOrDefault(DocxShape.HasOwnShape);
        return run is null ? null : new DocxShape(run);
    }

    /// <summary>
    /// Esvazia o cabeçalho ou rodapé da última seção (fica um parágrafo vazio com as
    /// propriedades do primeiro). Falso se a seção não tem esse cabeçalho/rodapé.
    /// </summary>
    public static bool ClearHeaderFooter(DocxDocument doc, bool footer, DocxHeaderFooterType type = DocxHeaderFooterType.Default)
    {
        var root = HeaderFooterRoot(doc, footer, type);
        if (root is null) return false;
        var pPr = root.Elements(W.p).FirstOrDefault()?.Element(W.pPr);
        root.RemoveNodes();
        root.Add(new XElement(W.p, pPr is null ? null : new XElement(pPr)));
        doc.MarkChanged();
        return true;
    }

    /// <summary>Raiz (w:hdr/w:ftr) do cabeçalho/rodapé da última seção (herdado de seções anteriores, como no Word).</summary>
    internal static XElement? HeaderFooterRoot(DocxDocument doc, bool footer, DocxHeaderFooterType type)
    {
        XName refName = footer ? W.footerReference : W.headerReference;
        string typeName = type switch { DocxHeaderFooterType.First => "first", DocxHeaderFooterType.Even => "even", _ => "default" };
        var sections = doc.Body.Descendants(W.sectPr).ToList();
        for (int k = sections.Count - 1; k >= 0; k--)
        {
            var reference = sections[k].Elements(refName).FirstOrDefault(r => ((string?)r.Attribute(W.type) ?? "default") == typeName);
            var id = (string?)reference?.Attribute(Ns.R + "id");
            if (id is null) continue;
            var rel = doc.GetRelationship(doc.MainPartPath, id);
            var part = rel is null ? null : doc.ResolveTarget(doc.MainPartPath, rel);
            return part is null ? null : doc.TryXml(part)?.Root;
        }
        return null;
    }
}

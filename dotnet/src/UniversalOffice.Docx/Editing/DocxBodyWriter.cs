using System.Globalization;
using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>Como <see cref="DocxBodyWriter"/> escreve o conteúdo.</summary>
public sealed record DocxBodyWriterOptions
{
    /// <summary>Esquemas aceitos em links (os demais viram texto; "www.…" ganha http://).</summary>
    public IReadOnlyCollection<string> AllowedLinkSchemes { get; init; } = DocxFields.DefaultAllowedSchemes;

    /// <summary>
    /// Cor dos links ("RRGGBB" ou cor CSS), sem sublinhado salvo se o próprio texto for
    /// sublinhado. Null = estilo de caractere "Hyperlink" (criado se o documento não tiver).
    /// </summary>
    public string? LinkColor { get; init; }

    /// <summary>O primeiro parágrafo escrito entra no último parágrafo do corpo se ele estiver vazio (e mantém o w:sectPr dele).</summary>
    public bool ReuseEmptyLastParagraph { get; init; } = true;

    /// <summary>
    /// <see cref="DocxBodyWriter.Finish"/> remove o último parágrafo escrito se ele ficar
    /// só com espaços (e sem imagem), desde que o corpo continue com outro bloco.
    /// </summary>
    public bool TrimTrailingEmptyParagraph { get; init; } = true;

    /// <summary><see cref="DocxBodyWriter.Finish"/> reduz as imagens escritas que não cabem na área útil da página.</summary>
    public bool FitPictures { get; init; } = true;
}

/// <summary>
/// Escreve conteúdo formatado no FIM do corpo (antes do w:sectPr final): texto com
/// formatação de caractere, quebras de linha, links e imagens, linha a linha, fechadas
/// em parágrafos com a formatação dada — ex.: converter conteúdo de outro editor para
/// .docx com a formatação das amostras do modelo (<see cref="DocxParagraphSamples"/>).
/// Chame <see cref="Finish"/> no fim.
/// </summary>
public sealed class DocxBodyWriter
{
    private const int MaxListLevel = 8;

    private static readonly HashSet<string> Alignments = new(StringComparer.Ordinal)
    {
        "start", "end", "left", "right", "center", "both", "mediumKashida", "distribute", "numTab", "highKashida", "lowKashida", "thaiDistribute",
    };

    private readonly DocxDocument _doc;
    private readonly DocxBodyWriterOptions _options;
    private readonly XElement? _sectPr;
    private readonly List<XElement> _line = [];
    private readonly List<XElement> _written = [];
    private XElement? _reuse;
    private int _nextDocPrId;

    public DocxBodyWriter(DocxDocument document, DocxBodyWriterOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(document);
        _doc = document;
        _options = options ?? new DocxBodyWriterOptions();
        _sectPr = document.LastSectionProperties;
        if (_options.ReuseEmptyLastParagraph && DocxTemplate.BodyBlocks(document).LastOrDefault() is { } last && DocxTemplate.IsEmptyParagraph(last))
            _reuse = last;
        _nextDocPrId = DocxPictures.NextDocPrId(document);
    }

    /// <summary>A linha atual (o parágrafo ainda não fechado) está vazia?</summary>
    public bool LineIsEmpty => _line.Count == 0;

    /// <summary>Texto na linha atual; <c>\t</c> vira w:tab e quebras de linha viram w:br. Texto vazio não faz nada.</summary>
    public void AddText(string text, DocxRunFormat format)
    {
        ArgumentNullException.ThrowIfNull(text);
        ArgumentNullException.ThrowIfNull(format);
        if (text.Length == 0) return;
        var run = new XElement(W.r);
        var rPr = RunProperties(format);
        if (rPr.HasElements) run.Add(rPr);
        run.Add(XmlText.RunContent(text));
        _line.Add(WrapLink(run, format.Link));
    }

    /// <summary>Quebra de linha (w:br) dentro do parágrafo atual.</summary>
    public void AddBreak() => _line.Add(new XElement(W.r, new XElement(W.br)));

    /// <summary>
    /// Imagem em linha no tamanho físico (PNG, JPEG, GIF, BMP… — o que <see cref="ImageInfo"/>
    /// lê), opcionalmente com link. Devolve false, sem acrescentar nada, se a imagem não for reconhecida.
    /// </summary>
    public bool AddImage(byte[] image, string? link = null)
    {
        ArgumentNullException.ThrowIfNull(image);
        if (ImageInfo.TryRead(image) is null) return false;
        var (relId, info) = DocxPictures.AddImage(_doc, _doc.MainPartPath, image);
        var run = new XElement(W.r, DocxPictures.InlineDrawing(relId, info.WidthEmu, info.HeightEmu, _nextDocPrId++, "Picture"));
        _line.Add(WrapLink(run, link));
        return true;
    }

    /// <summary>
    /// Fecha a linha atual num parágrafo com a formatação dada (linha vazia = parágrafo
    /// vazio). O primeiro parágrafo reaproveita o último parágrafo vazio do corpo quando
    /// <see cref="DocxBodyWriterOptions.ReuseEmptyLastParagraph"/>.
    /// </summary>
    public void EndParagraph(DocxParagraphFormat format)
    {
        ArgumentNullException.ThrowIfNull(format);
        var pPr = ParagraphProperties(format);
        var paragraph = _reuse ?? new XElement(W.p);
        var keepSectPr = paragraph.Element(W.pPr)?.Element(W.sectPr);
        paragraph.Elements(W.pPr).Remove();
        if (keepSectPr is not null) XmlOrder.Set(pPr, keepSectPr, XmlOrder.PPr);
        if (pPr.HasElements) paragraph.AddFirst(pPr);
        paragraph.Add(_line);
        _line.Clear();
        if (_reuse is null)
        {
            if (_sectPr is not null) _sectPr.AddBeforeSelf(paragraph);
            else _doc.Body.Add(paragraph);
        }
        _reuse = null;
        _written.Add(paragraph);
    }

    /// <summary>Fecha a linha pendente, apara o último parágrafo vazio e ajusta as imagens (conforme as opções).</summary>
    public void Finish()
    {
        if (_line.Count > 0) EndParagraph(DocxParagraphFormat.None);
        if (_options.TrimTrailingEmptyParagraph && _written.Count > 0)
        {
            var last = _written[^1];
            bool blank = string.IsNullOrWhiteSpace(ParagraphText.PlainText(last)) && !last.Descendants(W.drawing).Any();
            if (blank && DocxTemplate.BodyBlocks(_doc).Count > 1)
            {
                last.Remove();
                _written.RemoveAt(_written.Count - 1);
            }
        }
        if (_options.FitPictures) DocxPictures.FitWithin(_doc, _written);
        _doc.MarkChanged();
    }

    // ─────────────────────────────── parágrafo ───────────────────────────────

    private XElement ParagraphProperties(DocxParagraphFormat format)
    {
        var pPr = format.Base?.Copy() ?? new XElement(W.pPr);
        if (format.StyleId is { } styleId && styleId != DocxStyles.DefaultParagraphStyleId(DocxStyles.Root(_doc)))
            XmlOrder.Set(pPr, new XElement(W.pStyle, new XAttribute(W.val, styleId)), XmlOrder.PPr);
        if (format.KeepWithNext) XmlOrder.Set(pPr, new XElement(W.keepNext), XmlOrder.PPr);
        if (format.ListNumId is { } numId)
        {
            int level = Math.Clamp(format.ListLevel, 0, MaxListLevel);
            var numPr = XmlOrder.Ensure(pPr, W.numPr, XmlOrder.PPr);
            XmlOrder.Set(numPr, new XElement(W.ilvl, new XAttribute(W.val, level.ToString(CultureInfo.InvariantCulture))), XmlOrder.NumPr);
            XmlOrder.Set(numPr, new XElement(W.numId, new XAttribute(W.val, numId)), XmlOrder.NumPr);
        }
        if (format.LeftIndentTwips > 0)
            XmlOrder.Ensure(pPr, W.ind, XmlOrder.PPr).SetAttributeValue(W.left, format.LeftIndentTwips.ToString(CultureInfo.InvariantCulture));
        if (format.Alignment is { } alignment)
        {
            if (!Alignments.Contains(alignment))
                throw new ArgumentException($"Alinhamento de parágrafo inválido: \"{alignment}\" (valores de ST_Jc, ex.: left, center, right, both).", nameof(format));
            XmlOrder.Set(pPr, new XElement(W.jc, new XAttribute(W.val, alignment)), XmlOrder.PPr);
        }
        return pPr;
    }

    // ─────────────────────────────── caractere ───────────────────────────────

    private XElement RunProperties(DocxRunFormat f)
    {
        var rPr = new XElement(W.rPr);
        bool linked = f.Link is not null && LinkTarget(f.Link) is not null;
        string? color = linked && _options.LinkColor is not null ? Colors.NormalizeHex(_options.LinkColor) : Colors.NormalizeHex(f.Color);
        if (linked && _options.LinkColor is null)
            XmlOrder.Set(rPr, new XElement(W.rStyle, new XAttribute(W.val, DocxStyles.EnsureHyperlinkCharacterStyle(_doc))), XmlOrder.RPr);
        if (f.Bold) XmlOrder.Set(rPr, new XElement(W.b), XmlOrder.RPr);
        if (f.Italic) XmlOrder.Set(rPr, new XElement(W.i), XmlOrder.RPr);
        if (f.Strike) XmlOrder.Set(rPr, new XElement(W.strike), XmlOrder.RPr);
        if (color is not null) XmlOrder.Set(rPr, new XElement(W.color, new XAttribute(W.val, color)), XmlOrder.RPr);
        if (f.Underline) XmlOrder.Set(rPr, new XElement(W.u, new XAttribute(W.val, "single")), XmlOrder.RPr);
        else if (linked && _options.LinkColor is not null) XmlOrder.Set(rPr, new XElement(W.u, new XAttribute(W.val, "none")), XmlOrder.RPr);
        if (Colors.NormalizeHex(f.Background) is { } background)
            XmlOrder.Set(rPr, new XElement(W.shd, new XAttribute(W.val, "clear"), new XAttribute(Ns.W + "color", "auto"), new XAttribute(Ns.W + "fill", background)), XmlOrder.RPr);
        if (f.VerticalAlign is { } verticalAlign)
            XmlOrder.Set(rPr, new XElement(W.vertAlign, new XAttribute(W.val, verticalAlign == DocxVerticalAlign.Subscript ? "subscript" : "superscript")), XmlOrder.RPr);
        return rPr;
    }

    private XElement WrapLink(XElement run, string? link)
    {
        var target = link is null ? null : LinkTarget(link);
        if (target is null) return run;
        string id = _doc.AddRelationship(_doc.MainPartPath, RelTypes.Hyperlink, target, external: true);
        return new XElement(W.hyperlink, new XAttribute(Ns.R + "id", id), new XAttribute(W.history, "1"), run);
    }

    /// <summary>URL absoluta permitida; "www.…" ganha http://; o resto (âncoras "#…", relativos) não vira link.</summary>
    private string? LinkTarget(string link)
    {
        string trimmed = link.Trim();
        if (DocxFields.IsAllowedUrl(trimmed, _options.AllowedLinkSchemes)) return trimmed;
        if (trimmed.StartsWith("www.", StringComparison.OrdinalIgnoreCase) && DocxFields.IsAllowedUrl("http://" + trimmed, _options.AllowedLinkSchemes))
            return "http://" + trimmed;
        return null;
    }
}

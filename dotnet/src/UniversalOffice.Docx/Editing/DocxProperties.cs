using System.Globalization;
using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>
/// Propriedades do documento: docProps/core.xml (título, autor…), docProps/app.xml
/// (empresa, gerente, aplicativo) e docProps/custom.xml (personalizadas). As partes
/// que faltam são criadas na primeira escrita. Valor vazio ou null remove o elemento.
/// </summary>
public sealed class DocxProperties
{
    private readonly DocxDocument _doc;

    internal DocxProperties(DocxDocument doc) => _doc = doc;

    public string? Title { get => Core(Ns.Dc + "title"); set => SetCore(Ns.Dc + "title", value); }
    public string? Subject { get => Core(Ns.Dc + "subject"); set => SetCore(Ns.Dc + "subject", value); }
    public string? Author { get => Core(Ns.Dc + "creator"); set => SetCore(Ns.Dc + "creator", value); }
    public string? Keywords { get => Core(Ns.Cp + "keywords"); set => SetCore(Ns.Cp + "keywords", value); }
    /// <summary>Comentários (dc:description).</summary>
    public string? Comments { get => Core(Ns.Dc + "description"); set => SetCore(Ns.Dc + "description", value); }
    public string? LastAuthor { get => Core(Ns.Cp + "lastModifiedBy"); set => SetCore(Ns.Cp + "lastModifiedBy", value); }
    public string? Category { get => Core(Ns.Cp + "category"); set => SetCore(Ns.Cp + "category", value); }

    /// <summary>Data da última gravação (dcterms:modified, UTC).</summary>
    public DateTime? LastSaveDate
    {
        get => ParseDate(Core(Ns.DcTerms + "modified"));
        set => SetCoreDate(Ns.DcTerms + "modified", value);
    }

    public DateTime? CreatedDate
    {
        get => ParseDate(Core(Ns.DcTerms + "created"));
        set => SetCoreDate(Ns.DcTerms + "created", value);
    }

    public string? Company { get => App("Company"); set => SetApp("Company", value); }
    public string? Manager { get => App("Manager"); set => SetApp("Manager", value); }
    /// <summary>Aplicativo que gravou (app.xml Application).</summary>
    public string? ApplicationName { get => App("Application"); set => SetApp("Application", value); }

    /// <summary>Nomes das propriedades personalizadas.</summary>
    public IReadOnlyList<string> CustomPropertyNames =>
        CustomRoot()?.Elements(Ns.CustomProps + "property").Select(p => (string?)p.Attribute("name") ?? "").ToList() ?? [];

    /// <summary>Propriedade personalizada de texto (vt:lpwstr); substitui se já existir.</summary>
    public void SetCustomProperty(string name, string value)
    {
        var root = CustomRoot(create: true)!;
        root.Elements(Ns.CustomProps + "property").Where(p => (string?)p.Attribute("name") == name).Remove();
        int pid = root.Elements(Ns.CustomProps + "property")
            .Select(p => int.TryParse((string?)p.Attribute("pid"), out var n) ? n : 1)
            .DefaultIfEmpty(1).Max() + 1;
        XNamespace vt = "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes";
        root.Add(new XElement(Ns.CustomProps + "property",
            new XAttribute("fmtid", "{D5CDD505-2E9C-101B-9397-08002B2CF9AE}"),
            new XAttribute("pid", pid.ToString(CultureInfo.InvariantCulture)),
            new XAttribute("name", name),
            new XElement(vt + "lpwstr", value)));
    }

    /// <summary>Remove todas as propriedades personalizadas (e a parte custom.xml).</summary>
    public void RemoveCustomProperties()
    {
        var rel = _doc.GetRelationships("").FirstOrDefault(r => RelTypes.Is(r.Type, "custom-properties"));
        if (rel is null) return;
        var part = _doc.ResolveTarget("", rel);
        _doc.RemoveRelationship("", rel.Id);
        if (part is not null) _doc.DeletePart(part);
    }

    /// <summary>
    /// Limpa os metadados pessoais/organizacionais: autor, último autor, empresa,
    /// gerente, categoria, comentários, palavras-chave, assunto, título e as personalizadas.
    /// </summary>
    public void RemovePersonalMetadata()
    {
        Author = null;
        LastAuthor = null;
        Company = null;
        Manager = null;
        Category = null;
        Comments = null;
        Keywords = null;
        Subject = null;
        Title = null;
        RemoveCustomProperties();
    }

    // ─────────────────────────────── core ───────────────────────────────

    private XElement? CoreRoot(bool create = false) =>
        PackagePartRoot("core-properties", create, "docProps/core.xml", ContentTypes.CoreProperties, RelTypes.CoreProperties,
            () => new XElement(Ns.Cp + "coreProperties",
                new XAttribute(XNamespace.Xmlns + "cp", Ns.Cp.NamespaceName),
                new XAttribute(XNamespace.Xmlns + "dc", Ns.Dc.NamespaceName),
                new XAttribute(XNamespace.Xmlns + "dcterms", Ns.DcTerms.NamespaceName),
                new XAttribute(XNamespace.Xmlns + "dcmitype", "http://purl.org/dc/dcmitype/"),
                new XAttribute(XNamespace.Xmlns + "xsi", Ns.Xsi.NamespaceName)));

    private string? Core(XName name) => CoreRoot()?.Element(name)?.Value;

    private void SetCore(XName name, string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            CoreRoot()?.Elements(name).Remove();
            return;
        }
        var root = CoreRoot(create: true)!;
        var el = root.Element(name);
        if (el is null) root.Add(new XElement(name, Clean(value)));
        else el.Value = Clean(value);
    }

    private void SetCoreDate(XName name, DateTime? value)
    {
        if (value is null)
        {
            CoreRoot()?.Elements(name).Remove();
            return;
        }
        var root = CoreRoot(create: true)!;
        root.Elements(name).Remove();
        var utc = value.Value.Kind == DateTimeKind.Local ? value.Value.ToUniversalTime() : value.Value;
        root.Add(new XElement(name, new XAttribute(Ns.Xsi + "type", "dcterms:W3CDTF"),
            utc.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture)));
    }

    private static DateTime? ParseDate(string? text) =>
        DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var d) ? d : null;

    // ─────────────────────────────── app ───────────────────────────────

    private XElement? AppRoot(bool create = false) =>
        PackagePartRoot("extended-properties", create, "docProps/app.xml", ContentTypes.ExtendedProperties, RelTypes.ExtendedProperties,
            () => new XElement(Ns.ExtendedProps + "Properties",
                new XAttribute(XNamespace.Xmlns + "vt", "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes")));

    private string? App(string local) => AppRoot()?.Element(Ns.ExtendedProps + local)?.Value;

    private void SetApp(string local, string? value)
    {
        XName name = Ns.ExtendedProps + local;
        if (string.IsNullOrEmpty(value))
        {
            AppRoot()?.Elements(name).Remove();
            return;
        }
        var root = AppRoot(create: true)!;
        var el = root.Element(name);
        if (el is null) root.Add(new XElement(name, Clean(value)));
        else el.Value = Clean(value);
    }

    // ─────────────────────────────── custom ───────────────────────────────

    private XElement? CustomRoot(bool create = false) =>
        PackagePartRoot("custom-properties", create, "docProps/custom.xml",
            "application/vnd.openxmlformats-officedocument.custom-properties+xml", RelTypes.CustomProperties,
            () => new XElement(Ns.CustomProps + "Properties",
                new XAttribute(XNamespace.Xmlns + "vt", "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes")));

    private XElement? PackagePartRoot(string relSuffix, bool create, string defaultPath, string contentType, string relType, Func<XElement> newRoot)
    {
        var rel = _doc.GetRelationships("").FirstOrDefault(r => RelTypes.Is(r.Type, relSuffix) && !r.External);
        var part = rel is null ? null : _doc.ResolveTarget("", rel);
        if (part is not null) return _doc.Xml(part).Root;
        if (!create) return null;
        string path = _doc.UniquePartPath(defaultPath);
        var doc = new XDocument(new XDeclaration("1.0", "UTF-8", "yes"), newRoot());
        _doc.SetXmlPart(path, doc, contentType);
        _doc.AddRelationship("", relType, path, false);
        return doc.Root;
    }

    private static string Clean(string value) => XmlText.RemoveInvalidChars(value);
}

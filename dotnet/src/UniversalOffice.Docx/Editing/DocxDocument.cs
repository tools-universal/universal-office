using System.Text;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;
using UniversalOffice.Core;

namespace UniversalOffice.Docx.Editing;

/// <summary>Relacionamento de uma parte (.rels).</summary>
public sealed record DocxRelationship(string Id, string Type, string Target, bool External);

/// <summary>
/// .docx aberto para EDIÇÃO no servidor (o que se faria com uma biblioteca como o
/// Syncfusion DocIO, sem DOM próprio). Trabalha direto sobre o XML das partes
/// com System.Xml.Linq (BCL): namespaces, prefixos, comentários e atributos
/// desconhecidos passam intactos — o MiniXml é um leitor (porta do xml.ts) e não
/// regrava. O ZIP é o <see cref="OpcPackage"/>: partes não tocadas saem byte a
/// byte iguais e na mesma ordem; só as partes XML alteradas são reserializadas.
/// <para>Entrada não confiável: DTD recusado, sem resolver externo; bytes
/// descomprimidos, profundidade de XML e campos com teto (<see cref="DocxLimits"/>,
/// <see cref="OfficeLimitExceededException"/>). Alvos de relacionamento seguem
/// <see cref="OpcPartName.ResolveRelationshipTarget"/> (desescapa uma vez só).</para>
/// </summary>
public sealed class DocxDocument
{
    private sealed class XmlPartState
    {
        public required XDocument Doc;
        public bool Dirty;
    }

    private readonly OpcPackage _package;
    private readonly Dictionary<string, XmlPartState> _xml = new(StringComparer.OrdinalIgnoreCase);
    private bool _structureChanged;

    /// <summary>Caminho da parte principal (normalmente word/document.xml).</summary>
    public string MainPartPath { get; }

    /// <summary>Tetos com que o documento foi aberto (valem para as partes carregadas depois).</summary>
    public DocxLimits Limits { get; }

    private DocxDocument(OpcPackage package, DocxLimits limits)
    {
        _package = package;
        Limits = limits;
        MainPartPath = ResolveMainPart() ?? throw new InvalidDataException("Pacote sem a parte principal do documento (officeDocument)");
        if (Xml(MainPartPath).Root?.Element(W.body) is null)
            throw new InvalidDataException("A parte principal não é um documento WordprocessingML (w:document/w:body)");
    }

    /// <summary>Abre um .docx (também .docm/.dotx — o salvamento continua no mesmo tipo) com os tetos padrão.</summary>
    public static DocxDocument Open(byte[] docx) => Open(docx, DocxLimits.Default);

    /// <summary>Abre um .docx com os tetos dados (descompressão, profundidade de XML, campos).</summary>
    public static DocxDocument Open(byte[] docx, DocxLimits limits)
    {
        ArgumentNullException.ThrowIfNull(docx);
        ArgumentNullException.ThrowIfNull(limits);
        return new DocxDocument(OpcPackage.Load(docx, limits.Package), limits);
    }

    /// <summary>Grava o pacote. Partes XML alteradas são reserializadas; as demais saem intactas.</summary>
    public byte[] Save()
    {
        if (_structureChanged || _xml.Values.Any(s => s.Dirty))
        {
            DocxStructure.Normalize(this);
            CollectGarbage();
        }
        foreach (var (path, state) in _xml)
        {
            if (!state.Dirty) continue;
            _package.SetPart(path, Serialize(state.Doc));
            state.Dirty = false;
        }
        _structureChanged = false;
        return _package.Save();
    }

    /// <summary>Cópia independente (mesmo conteúdo do salvamento atual).</summary>
    public DocxDocument Clone() => Open(Save(), Limits);

    // ─────────────────────────────── partes ───────────────────────────────

    public IReadOnlyList<string> PartNames => _package.PartNames();

    public bool HasPart(string path) => FindPart(path) is not null;

    public byte[]? GetPartBytes(string path)
    {
        var real = FindPart(path);
        if (real is null) return null;
        if (_xml.TryGetValue(real, out var state) && state.Dirty) return Serialize(state.Doc);
        return _package.GetPart(real);
    }

    /// <summary>
    /// Nome real da parte (OPC compara sem diferenciar maiúsculas). Recebe nome de
    /// parte já resolvido — nunca desescapa: alvo de relacionamento passa antes por
    /// <see cref="OpcPartName.ResolveRelationshipTarget"/>.
    /// </summary>
    internal string? FindPart(string path)
    {
        if (_package.GetPart(path) is not null) return path;
        foreach (var name in _package.PartNames())
            if (string.Equals(name, path, StringComparison.OrdinalIgnoreCase)) return name;
        return null;
    }

    /// <summary>XML da parte (carregado uma vez; qualquer alteração marca a parte para regravar).</summary>
    internal XDocument Xml(string path) => TryXml(path) ?? throw new InvalidDataException($"Parte ausente: {path}");

    internal XDocument? TryXml(string path)
    {
        var real = FindPart(path);
        if (real is null) return null;
        if (_xml.TryGetValue(real, out var state)) return state.Doc;
        var doc = Parse(_package.GetPart(real)!, Limits.MaxXmlDepth, real);
        Track(real, doc, dirty: false);
        return doc;
    }

    private void Track(string path, XDocument doc, bool dirty)
    {
        var state = new XmlPartState { Doc = doc, Dirty = dirty };
        doc.Changed += (_, _) => state.Dirty = true;
        _xml[path] = state;
    }

    /// <summary>Cria (ou substitui) uma parte XML com o content type dado.</summary>
    internal void SetXmlPart(string path, XDocument doc, string? contentType)
    {
        doc.Declaration ??= new XDeclaration("1.0", "UTF-8", "yes");
        string real = FindPart(path) ?? path;
        _package.SetPart(real, Serialize(doc));
        Track(real, doc, dirty: false);
        if (contentType is not null) SetContentType(real, contentType);
        _structureChanged = true;
    }

    /// <summary>Cria (ou substitui) uma parte binária.</summary>
    internal void SetBinaryPart(string path, byte[] data, string? contentType)
    {
        string real = FindPart(path) ?? path;
        _xml.Remove(real);
        _package.SetPart(real, data);
        if (contentType is not null) SetContentType(real, contentType);
        _structureChanged = true;
    }

    /// <summary>Remove a parte, o .rels dela e o Override de content type.</summary>
    internal void DeletePart(string path)
    {
        var real = FindPart(path);
        if (real is null) return;
        _xml.Remove(real);
        _package.RemovePart(real);
        var rels = RelsPath(real);
        var realRels = FindPart(rels);
        if (realRels is not null)
        {
            _xml.Remove(realRels);
            _package.RemovePart(realRels);
        }
        RemoveContentTypeOverride(real);
        _structureChanged = true;
    }

    /// <summary>Caminho livre: <c>word/media/image.png</c> → <c>word/media/image1.png</c>, <c>image2.png</c>…</summary>
    internal string UniquePartPath(string desired)
    {
        if (FindPart(desired) is null) return desired;
        string dir = desired.Contains('/') ? desired[..(desired.LastIndexOf('/') + 1)] : "";
        string file = desired[dir.Length..];
        string ext = Path.GetExtension(file);
        string stem = file[..(file.Length - ext.Length)];
        var m = Regex.Match(stem, @"^(.*?)(\d+)$");
        string baseName = m.Success ? m.Groups[1].Value : stem;
        for (int i = 1; ; i++)
        {
            string candidate = dir + baseName + i.ToString(System.Globalization.CultureInfo.InvariantCulture) + ext;
            if (FindPart(candidate) is null) return candidate;
        }
    }

    // ─────────────────────────────── relacionamentos ───────────────────────────────

    /// <summary>Caminho do .rels de uma parte ("" = raiz do pacote).</summary>
    internal static string RelsPath(string partPath)
    {
        if (partPath.Length == 0) return "_rels/.rels";
        int slash = partPath.LastIndexOf('/');
        string dir = slash < 0 ? "" : partPath[..(slash + 1)];
        return dir + "_rels/" + partPath[(slash + 1)..] + ".rels";
    }

    public IReadOnlyList<DocxRelationship> GetRelationships(string partPath)
    {
        var doc = TryXml(RelsPath(partPath));
        if (doc?.Root is null) return [];
        return doc.Root.Elements(Ns.PackageRels + "Relationship").Select(ToRel).ToList();
    }

    private static DocxRelationship ToRel(XElement e) => new(
        (string?)e.Attribute("Id") ?? "",
        (string?)e.Attribute("Type") ?? "",
        (string?)e.Attribute("Target") ?? "",
        string.Equals((string?)e.Attribute("TargetMode"), "External", StringComparison.OrdinalIgnoreCase));

    public DocxRelationship? GetRelationship(string partPath, string id) =>
        GetRelationships(partPath).FirstOrDefault(r => r.Id == id);

    /// <summary>Primeiro relacionamento do tipo dado (sufixo, ex.: "styles").</summary>
    internal DocxRelationship? FindRelationship(string partPath, string typeSuffix) =>
        GetRelationships(partPath).FirstOrDefault(r => RelTypes.Is(r.Type, typeSuffix));

    /// <summary>Parte apontada por um relacionamento interno (null se externo ou ausente).</summary>
    internal string? ResolveTarget(string partPath, DocxRelationship rel)
    {
        if (rel.External) return null;
        var name = OpcPartName.ResolveRelationshipTarget(partPath, rel.Target);
        return name is null ? null : FindPart(name);
    }

    /// <summary>Parte alvo do primeiro relacionamento do tipo dado.</summary>
    internal string? FindRelatedPart(string partPath, string typeSuffix)
    {
        var rel = FindRelationship(partPath, typeSuffix);
        return rel is null ? null : ResolveTarget(partPath, rel);
    }

    private XDocument RelsDocument(string partPath, bool create)
    {
        string relsPath = RelsPath(partPath);
        var doc = TryXml(relsPath);
        if (doc is not null || !create) return doc!;
        doc = new XDocument(new XDeclaration("1.0", "UTF-8", "yes"), new XElement(Ns.PackageRels + "Relationships"));
        SetXmlPart(relsPath, doc, null);
        return doc;
    }

    /// <summary>Acrescenta um relacionamento e devolve o id novo (rIdN acima dos existentes).</summary>
    internal string AddRelationship(string partPath, string type, string target, bool external)
    {
        var doc = RelsDocument(partPath, create: true);
        string id = NextRelId(doc.Root!.Elements(Ns.PackageRels + "Relationship").Select(e => (string?)e.Attribute("Id") ?? ""));
        AddRelationship(partPath, id, type, target, external);
        return id;
    }

    /// <summary>Acrescenta um relacionamento com id dado (cópia de partes: o XML copiado já aponta para ele).</summary>
    internal void AddRelationship(string partPath, string id, string type, string target, bool external)
    {
        var doc = RelsDocument(partPath, create: true);
        var el = new XElement(Ns.PackageRels + "Relationship",
            new XAttribute("Id", id), new XAttribute("Type", type), new XAttribute("Target", target));
        if (external) el.Add(new XAttribute("TargetMode", "External"));
        doc.Root!.Add(el);
    }

    internal static string NextRelId(IEnumerable<string> existing)
    {
        int max = 0;
        var set = new HashSet<string>(StringComparer.Ordinal);
        foreach (var id in existing)
        {
            set.Add(id);
            if (id.StartsWith("rId", StringComparison.Ordinal) && int.TryParse(id.AsSpan(3), System.Globalization.NumberStyles.None, System.Globalization.CultureInfo.InvariantCulture, out int n))
                max = Math.Max(max, n);
        }
        string candidate;
        do candidate = "rId" + (++max).ToString(System.Globalization.CultureInfo.InvariantCulture);
        while (set.Contains(candidate));
        return candidate;
    }

    internal void RemoveRelationship(string partPath, string id)
    {
        var doc = RelsDocument(partPath, create: false);
        doc?.Root?.Elements(Ns.PackageRels + "Relationship")
            .Where(e => (string?)e.Attribute("Id") == id)
            .ToList()
            .ForEach(e => e.Remove());
    }

    /// <summary>Target relativo de <paramref name="fromPart"/> até <paramref name="toPart"/>.</summary>
    internal static string RelativeTarget(string fromPart, string toPart)
    {
        var from = fromPart.Split('/')[..^1];
        var to = toPart.Split('/');
        int common = 0;
        while (common < from.Length && common < to.Length - 1 && string.Equals(from[common], to[common], StringComparison.OrdinalIgnoreCase)) common++;
        var sb = new StringBuilder();
        for (int i = common; i < from.Length; i++) sb.Append("../");
        sb.Append(string.Join('/', to[common..].Select(OpcPartName.EscapeSegment)));
        return sb.ToString();
    }

    // ─────────────────────────────── content types ───────────────────────────────

    private XElement ContentTypesRoot => Xml("[Content_Types].xml").Root!;

    public string? GetContentType(string partPath)
    {
        var real = FindPart(partPath) ?? partPath;
        foreach (var o in ContentTypesRoot.Elements(Ns.ContentTypes + "Override"))
            if (string.Equals(((string?)o.Attribute("PartName"))?.TrimStart('/'), real, StringComparison.OrdinalIgnoreCase))
                return (string?)o.Attribute("ContentType");
        string ext = Path.GetExtension(real).TrimStart('.');
        foreach (var d in ContentTypesRoot.Elements(Ns.ContentTypes + "Default"))
            if (string.Equals((string?)d.Attribute("Extension"), ext, StringComparison.OrdinalIgnoreCase))
                return (string?)d.Attribute("ContentType");
        return null;
    }

    /// <summary>Garante que a parte resolva para o content type dado (Override só quando o Default não serve).</summary>
    internal void SetContentType(string partPath, string contentType)
    {
        RemoveContentTypeOverride(partPath);
        if (string.Equals(GetContentType(partPath), contentType, StringComparison.OrdinalIgnoreCase)) return;
        var root = ContentTypesRoot;
        string ext = Path.GetExtension(partPath).TrimStart('.');
        bool hasDefault = root.Elements(Ns.ContentTypes + "Default")
            .Any(d => string.Equals((string?)d.Attribute("Extension"), ext, StringComparison.OrdinalIgnoreCase));
        if (!hasDefault && ext.Length > 0 && !contentType.EndsWith("+xml", StringComparison.OrdinalIgnoreCase))
        {
            // mídia: Default por extensão, como o Word grava
            var defaults = root.Elements(Ns.ContentTypes + "Default").ToList();
            var el = new XElement(Ns.ContentTypes + "Default", new XAttribute("Extension", ext), new XAttribute("ContentType", contentType));
            if (defaults.Count > 0) defaults[^1].AddAfterSelf(el);
            else root.AddFirst(el);
            return;
        }
        root.Add(new XElement(Ns.ContentTypes + "Override", new XAttribute("PartName", "/" + partPath), new XAttribute("ContentType", contentType)));
    }

    private void RemoveContentTypeOverride(string partPath)
    {
        ContentTypesRoot.Elements(Ns.ContentTypes + "Override")
            .Where(o => string.Equals(((string?)o.Attribute("PartName"))?.TrimStart('/'), partPath, StringComparison.OrdinalIgnoreCase))
            .ToList()
            .ForEach(o => o.Remove());
    }

    // ─────────────────────────────── atalhos do documento ───────────────────────────────

    internal XElement MainRoot => Xml(MainPartPath).Root!;

    /// <summary>w:body da parte principal.</summary>
    internal XElement Body => MainRoot.Element(W.body)!;

    /// <summary>sectPr da última seção (o filho w:sectPr do body), se houver.</summary>
    internal XElement? LastSectionProperties => Body.Elements(W.sectPr).LastOrDefault();

    /// <summary>Parte relacionada à principal pelo tipo (styles, numbering, settings…).</summary>
    internal string? MainRelatedPart(string typeSuffix) => FindRelatedPart(MainPartPath, typeSuffix);

    /// <summary>Raiz XML de uma parte relacionada à principal, criada vazia quando <paramref name="create"/>.</summary>
    internal XElement? MainRelatedRoot(string typeSuffix, bool create, string defaultPath, string contentType, XName rootName)
    {
        var path = MainRelatedPart(typeSuffix);
        if (path is not null) return Xml(path).Root;
        if (!create) return null;
        string newPath = UniquePartPath(defaultPath);
        var doc = new XDocument(new XDeclaration("1.0", "UTF-8", "yes"),
            new XElement(rootName, new XAttribute(XNamespace.Xmlns + "w", Ns.W.NamespaceName), new XAttribute(XNamespace.Xmlns + "r", Ns.R.NamespaceName)));
        SetXmlPart(newPath, doc, contentType);
        AddRelationship(MainPartPath, RelTypes.OfficeDocumentBase + typeSuffix, RelativeTarget(MainPartPath, newPath), false);
        return doc.Root;
    }

    /// <summary>Partes com texto do documento: principal, cabeçalhos, rodapés, notas de rodapé e de fim.</summary>
    internal IEnumerable<string> StoryParts(bool includeHeadersAndFooters = true, bool includeNotes = true)
    {
        yield return MainPartPath;
        foreach (var rel in GetRelationships(MainPartPath))
        {
            bool hf = RelTypes.Is(rel.Type, "header") || RelTypes.Is(rel.Type, "footer");
            bool notes = RelTypes.Is(rel.Type, "footnotes") || RelTypes.Is(rel.Type, "endnotes");
            if (!(hf && includeHeadersAndFooters) && !(notes && includeNotes)) continue;
            var target = ResolveTarget(MainPartPath, rel);
            if (target is not null && TryXml(target) is not null) yield return target;
        }
    }

    /// <summary>Raízes XML das partes com texto (ver <see cref="StoryParts"/>).</summary>
    internal IEnumerable<(string Part, XElement Root)> Stories(bool includeHeadersAndFooters = true, bool includeNotes = true)
    {
        foreach (var part in StoryParts(includeHeadersAndFooters, includeNotes).Distinct(StringComparer.OrdinalIgnoreCase).ToList())
        {
            var root = TryXml(part)?.Root;
            if (root is not null) yield return (part, root);
        }
    }

    /// <summary>Propriedades do documento (docProps/core.xml, app.xml, custom.xml).</summary>
    public DocxProperties Properties => new(this);

    // ─────────────────────────────── coleta de lixo ───────────────────────────────

    /// <summary>
    /// Remove relacionamentos que ninguém mais referencia (imagens, hiperlinks,
    /// cabeçalhos… — ids procurados em todos os atributos da parte) e as partes que
    /// ficaram inalcançáveis a partir de _rels/.rels, com os .rels e Overrides delas.
    /// </summary>
    internal void CollectGarbage()
    {
        foreach (var part in _package.PartNames().ToList())
        {
            if (part.EndsWith(".rels", StringComparison.OrdinalIgnoreCase) || part == "[Content_Types].xml") continue;
            var rels = GetRelationships(part);
            if (!rels.Any(r => RelTypes.Referenced.Contains(RelTypes.Last(r.Type)))) continue;
            if (!IsXmlPart(part)) continue;
            XDocument doc;
            try { doc = Xml(part); }
            catch (XmlException) { continue; }
            var used = new HashSet<string>(StringComparer.Ordinal);
            foreach (var el in doc.Descendants())
                foreach (var a in el.Attributes())
                    used.Add(a.Value);
            foreach (var rel in rels)
                if (RelTypes.Referenced.Contains(RelTypes.Last(rel.Type)) && !used.Contains(rel.Id))
                    RemoveRelationship(part, rel.Id);
        }

        var reachable = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var pending = new Stack<string>();
        foreach (var rel in GetRelationships(""))
        {
            var target = ResolveTarget("", rel);
            if (target is not null && reachable.Add(target)) pending.Push(target);
        }
        while (pending.TryPop(out var part))
        {
            foreach (var rel in GetRelationships(part))
            {
                var target = ResolveTarget(part, rel);
                if (target is not null && reachable.Add(target)) pending.Push(target);
            }
        }
        foreach (var part in _package.PartNames().ToList())
        {
            if (part == "[Content_Types].xml" || part.EndsWith(".rels", StringComparison.OrdinalIgnoreCase)) continue;
            if (!reachable.Contains(part)) DeletePart(part);
        }
        // .rels órfãos (parte de origem removida)
        foreach (var part in _package.PartNames().ToList())
        {
            if (!part.EndsWith(".rels", StringComparison.OrdinalIgnoreCase) || part == "_rels/.rels") continue;
            string source = SourceOfRels(part);
            if (FindPart(source) is null)
            {
                _xml.Remove(part);
                _package.RemovePart(part);
            }
        }
    }

    private static string SourceOfRels(string relsPath)
    {
        int idx = relsPath.LastIndexOf("_rels/", StringComparison.OrdinalIgnoreCase);
        string dir = relsPath[..idx];
        string file = relsPath[(idx + "_rels/".Length)..];
        return dir + file[..^".rels".Length];
    }

    private bool IsXmlPart(string part)
    {
        var ct = GetContentType(part);
        return ct is not null && (ct.EndsWith("xml", StringComparison.OrdinalIgnoreCase) || ct.EndsWith("+xml", StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>Marca a estrutura do pacote como alterada (normalização e coleta no próximo salvamento).</summary>
    internal void MarkChanged() => _structureChanged = true;

    // ─────────────────────────────── XML ───────────────────────────────

    private static readonly XmlReaderSettings ReaderSettings = new()
    {
        DtdProcessing = DtdProcessing.Prohibit,
        XmlResolver = null,
        IgnoreWhitespace = false,
        IgnoreComments = false,
        IgnoreProcessingInstructions = false,
    };

    /// <summary>
    /// XML de uma parte. A profundidade é conferida numa leitura prévia em fluxo
    /// (sem montar árvore), então XML profundo nunca vira árvore — nem chega às
    /// rotinas recursivas do System.Xml.Linq (cópia de XElement, comparação…).
    /// </summary>
    internal static XDocument Parse(byte[] bytes, int maxDepth, string? partName = null)
    {
        using (var scan = XmlReader.Create(new MemoryStream(bytes, writable: false), ReaderSettings))
        {
            while (scan.Read())
                if (scan.Depth > maxDepth) throw new OfficeLimitExceededException(OfficeLimit.XmlDepth, maxDepth, partName);
        }
        using var reader = XmlReader.Create(new MemoryStream(bytes, writable: false), ReaderSettings);
        return XDocument.Load(reader, LoadOptions.PreserveWhitespace);
    }

    /// <summary>Prefixos canônicos (os que o Word grava e que o leitor MiniXml/xml.ts espera).</summary>
    private static readonly Dictionary<string, string> CanonicalPrefixes = new(StringComparer.Ordinal)
    {
        ["http://schemas.openxmlformats.org/wordprocessingml/2006/main"] = "w",
        ["http://schemas.openxmlformats.org/officeDocument/2006/relationships"] = "r",
        ["http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"] = "wp",
        ["http://schemas.openxmlformats.org/drawingml/2006/main"] = "a",
        ["http://schemas.openxmlformats.org/drawingml/2006/picture"] = "pic",
        ["http://schemas.openxmlformats.org/drawingml/2006/chart"] = "c",
        ["http://schemas.openxmlformats.org/drawingml/2006/diagram"] = "dgm",
        ["http://schemas.openxmlformats.org/officeDocument/2006/math"] = "m",
        ["http://schemas.openxmlformats.org/markup-compatibility/2006"] = "mc",
        ["http://schemas.microsoft.com/office/word/2010/wordprocessingShape"] = "wps",
        ["http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"] = "wpg",
        ["http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"] = "wpc",
        ["http://schemas.microsoft.com/office/word/2010/wordprocessingInk"] = "wpi",
        ["http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"] = "wp14",
        ["http://schemas.microsoft.com/office/word/2010/wordml"] = "w14",
        ["http://schemas.microsoft.com/office/word/2012/wordml"] = "w15",
        ["http://schemas.microsoft.com/office/word/2015/wordml/symex"] = "w16se",
        ["http://schemas.microsoft.com/office/word/2016/wordml/cid"] = "w16cid",
        ["http://schemas.microsoft.com/office/word/2018/wordml"] = "w16",
        ["http://schemas.microsoft.com/office/word/2018/wordml/cex"] = "w16cex",
        ["http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash"] = "w16sdtdh",
        ["http://schemas.microsoft.com/office/word/2023/wordml/word16du"] = "w16du",
        ["http://schemas.microsoft.com/office/drawing/2010/main"] = "a14",
        ["http://schemas.microsoft.com/office/word/2006/wordml"] = "wne",
        ["urn:schemas-microsoft-com:vml"] = "v",
        ["urn:schemas-microsoft-com:office:office"] = "o",
        ["urn:schemas-microsoft-com:office:word"] = "w10",
    };

    /// <summary>
    /// Conteúdo copiado de outra parte/pacote chega sem as declarações de namespace dos
    /// ancestrais de lá; sem isto o XmlWriter gravaria <c>xmlns="…"</c> no próprio
    /// elemento (XML válido, mas o leitor por prefixo — MiniXml, xml.ts — não reconhece).
    /// Declara na raiz, com o prefixo canônico, todo namespace usado sem prefixo em
    /// escopo; namespaces de extensão do Word entram também em mc:Ignorable.
    /// </summary>
    internal static void EnsureNamespaceDeclarations(XElement root)
    {
        var used = new HashSet<XNamespace>();
        foreach (var e in root.DescendantsAndSelf())
        {
            used.Add(e.Name.Namespace);
            foreach (var a in e.Attributes())
                if (!a.IsNamespaceDeclaration && a.Name.Namespace != XNamespace.None) used.Add(a.Name.Namespace);
        }
        used.Remove(XNamespace.None);
        used.Remove(XNamespace.Xml);
        used.Remove(XNamespace.Xmlns);
        var added = new List<string>();
        foreach (var ns in used)
        {
            if (root.GetPrefixOfNamespace(ns) is not null || root.GetDefaultNamespace() == ns) continue;
            string prefix = CanonicalPrefixes.TryGetValue(ns.NamespaceName, out var canonical) ? canonical : "ns";
            string candidate = prefix;
            for (int k = 1; root.Attribute(XNamespace.Xmlns + candidate) is not null; k++) candidate = prefix + k.ToString(System.Globalization.CultureInfo.InvariantCulture);
            root.Add(new XAttribute(XNamespace.Xmlns + candidate, ns.NamespaceName));
            if (ns.NamespaceName.StartsWith("http://schemas.microsoft.com/office/", StringComparison.Ordinal)
                && ns.NamespaceName.Contains("/word/20", StringComparison.Ordinal)
                && !ns.NamespaceName.EndsWith("wordprocessingShape", StringComparison.Ordinal)
                && !ns.NamespaceName.EndsWith("wordprocessingGroup", StringComparison.Ordinal)
                && !ns.NamespaceName.EndsWith("wordprocessingCanvas", StringComparison.Ordinal)
                && !ns.NamespaceName.EndsWith("wordprocessingInk", StringComparison.Ordinal))
                added.Add(candidate);
        }
        if (added.Count == 0) return;
        if (root.GetPrefixOfNamespace(Ns.Mc) is null) root.Add(new XAttribute(XNamespace.Xmlns + "mc", Ns.Mc.NamespaceName));
        var ignorable = root.Attribute(Ns.Mc + "Ignorable");
        var list = (ignorable?.Value ?? "").Split(' ', StringSplitOptions.RemoveEmptyEntries).ToList();
        foreach (var p in added) if (!list.Contains(p)) list.Add(p);
        root.SetAttributeValue(Ns.Mc + "Ignorable", string.Join(' ', list));
    }

    internal static byte[] Serialize(XDocument doc)
    {
        if (doc.Root is not null) EnsureNamespaceDeclarations(doc.Root);
        var ms = new MemoryStream();
        var settings = new XmlWriterSettings
        {
            Encoding = new UTF8Encoding(false),
            Indent = false,
            NewLineHandling = NewLineHandling.Entitize,
            OmitXmlDeclaration = false,
            CheckCharacters = true,
        };
        using (var writer = XmlWriter.Create(ms, settings)) doc.Save(writer);
        return ms.ToArray();
    }

    private string? ResolveMainPart()
    {
        foreach (var rel in GetRelationships(""))
        {
            if (rel.External || !string.Equals(rel.Type, RelTypes.OfficeDocument, StringComparison.OrdinalIgnoreCase)) continue;
            var target = ResolveTarget("", rel);
            if (target is not null) return target;
        }
        return FindPart("word/document.xml");
    }
}

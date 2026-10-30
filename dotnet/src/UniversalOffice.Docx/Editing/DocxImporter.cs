using System.Globalization;
using System.Security.Cryptography;
using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>
/// Importa o corpo de um .docx em outro com os estilos do DESTINO (o
/// <c>ImportContent(ImportOptions.UseDestinationStyles)</c> do DocIO): estilo de mesmo
/// nome usa o do destino; os que faltam entram (com id livre). Numeração, imagens e
/// demais partes relacionadas, fontes da tabela de fontes (inclusive embutidas),
/// notas de rodapé/fim, indicadores e ids de desenho/parágrafo/controle são
/// copiados sem colidir com os do destino. As cópias são iterativas
/// (<see cref="XmlTree.DeepClone"/>): XML aninhado não estoura a pilha.
/// </summary>
internal sealed class DocxImporter
{
    private static readonly string[] FontAttributes = ["ascii", "hAnsi", "eastAsia", "cs"];

    private readonly DocxDocument _target;
    private readonly DocxDocument _source;
    private readonly XElement? _sourceStyles;
    private readonly XElement? _sourceNumbering;
    private readonly Dictionary<string, string?> _styleMap = new(StringComparer.Ordinal);
    private readonly Dictionary<string, string> _numMap = new(StringComparer.Ordinal);
    private readonly Dictionary<string, string> _abstractMap = new(StringComparer.Ordinal);
    private readonly Dictionary<string, string> _picBulletMap = new(StringComparer.Ordinal);
    private readonly Dictionary<(string, string, string), string> _relMap = [];
    private readonly Dictionary<string, string> _partMap = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<(string Kind, string Id), string> _noteMap = [];
    private readonly HashSet<string> _fonts = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, string> _bookmarkIds = new(StringComparer.Ordinal);
    private readonly Dictionary<string, string> _bookmarkNames = new(StringComparer.Ordinal);
    private readonly HashSet<string> _targetBookmarkNames;
    private readonly HashSet<string> _targetParaIds;
    private readonly HashSet<string> _targetSdtIds;
    private int _nextBookmarkId;
    private int _nextDocPrId;

    public DocxImporter(DocxDocument target, DocxDocument source)
    {
        _target = target;
        _source = source;
        _sourceStyles = DocxStyles.Root(source);
        _sourceNumbering = DocxNumbering.Root(source);
        var targetRoots = target.Stories().Select(s => s.Root).ToList();
        _targetBookmarkNames = new HashSet<string>(targetRoots.SelectMany(r => r.Descendants(W.bookmarkStart)).Select(b => (string?)b.Attribute(W.name) ?? ""), StringComparer.OrdinalIgnoreCase);
        _nextBookmarkId = targetRoots.SelectMany(r => r.Descendants(W.bookmarkStart)).Select(b => int.TryParse((string?)b.Attribute(W.id), out var v) ? v : 0).DefaultIfEmpty(0).Max() + 1;
        _targetParaIds = new HashSet<string>(targetRoots.SelectMany(r => r.Descendants()).SelectMany(e => e.Attributes(Ns.W14 + "paraId")).Select(a => a.Value), StringComparer.OrdinalIgnoreCase);
        _targetSdtIds = new HashSet<string>(targetRoots.SelectMany(r => r.Descendants(W.sdtPr)).Select(p => (string?)p.Element(W.id)?.Attribute(W.val) ?? ""), StringComparer.Ordinal);
        _nextDocPrId = DocxPictures.NextDocPrId(target);
    }

    /// <summary>
    /// Copia os blocos do corpo da origem e insere no fim da última seção do destino.
    /// Sem <paramref name="sectionBreak"/> as quebras de seção saem (tudo vai para a
    /// seção onde entra); com ele, cada quebra de seção da origem é trocada pelas
    /// propriedades que ele devolve (recebe as da origem, em ordem de documento), já
    /// no destino — nenhum relacionamento delas é copiado. Devolve os blocos inseridos.
    /// </summary>
    public List<XElement> ImportBody(Func<XElement, XElement>? sectionBreak = null)
    {
        var blocks = _source.Body.Elements().Where(e => e.Name != W.sectPr).Select(e => XmlTree.DeepClone(e)).ToList();
        foreach (var block in blocks)
        {
            var sourceBreak = sectionBreak is null ? null : DocxSections.BreakOf(block);
            foreach (var sectPr in block.DescendantsAndSelf(W.sectPr).ToList()) sectPr.Remove();
            Process(block, _source.MainPartPath, _target.MainPartPath);
            if (sourceBreak is not null) XmlOrder.Set(XmlOrder.EnsurePPr(block), sectionBreak!(sourceBreak), XmlOrder.PPr);
        }
        var anchor = _target.LastSectionProperties;
        if (anchor is not null) anchor.AddBeforeSelf(blocks);
        else _target.Body.Add(blocks);
        ImportFonts();
        _target.MarkChanged();
        return blocks;
    }

    /// <summary>Ajusta um trecho copiado da parte <paramref name="sourcePart"/> para viver em <paramref name="targetPart"/>.</summary>
    private void Process(XElement root, string sourcePart, string targetPart)
    {
        var all = root.DescendantsAndSelf().ToList();
        // comentários não são importados
        foreach (var e in all.Where(e => e.Name == W.commentRangeStart || e.Name == W.commentRangeEnd || e.Name == W.commentReference))
        {
            var parent = e.Parent;
            e.Remove();
            if (parent is not null) ParagraphText.RemoveIfEmpty(parent);
        }
        foreach (var e in root.DescendantsAndSelf().ToList())
        {
            if (e.Name == W.pStyle || e.Name == W.rStyle || e.Name == W.tblStyle)
            {
                string? id = (string?)e.Attribute(W.val);
                if (id is null) continue;
                var mapped = ImportStyle(id);
                if (mapped is null) e.Remove();
                else e.SetAttributeValue(W.val, mapped);
            }
            else if (e.Name == W.numId && e.Parent?.Name == W.numPr)
            {
                string? id = (string?)e.Attribute(W.val);
                if (id is not null && id != "0") e.SetAttributeValue(W.val, ImportNum(id));
            }
            else if (e.Name == W.rFonts)
            {
                foreach (var a in FontAttributes)
                    if ((string?)e.Attribute(Ns.W + a) is { Length: > 0 } font) _fonts.Add(font);
            }
            else if (e.Name == W.footnoteReference || e.Name == W.endnoteReference)
            {
                string kind = e.Name == W.footnoteReference ? "footnotes" : "endnotes";
                string? id = (string?)e.Attribute(W.id);
                if (id is not null) e.SetAttributeValue(W.id, ImportNote(kind, id));
            }
            else if (e.Name == W.bookmarkStart || e.Name == W.bookmarkEnd)
            {
                RenumberBookmark(e);
            }
            else if (e.Name == Ns.Wp + "docPr")
            {
                e.SetAttributeValue("id", (_nextDocPrId++).ToString(CultureInfo.InvariantCulture));
            }
            else if (e.Name == W.sdtPr && e.Element(W.id) is { } sdtId && !_targetSdtIds.Add((string?)sdtId.Attribute(W.val) ?? ""))
            {
                string id;
                do id = RandomNumberGenerator.GetInt32(1, int.MaxValue).ToString(CultureInfo.InvariantCulture);
                while (!_targetSdtIds.Add(id));
                sdtId.SetAttributeValue(W.val, id);
            }
            if (e.Attribute(Ns.W14 + "paraId") is { } paraId && !_targetParaIds.Add(paraId.Value))
            {
                string id;
                do id = RandomNumberGenerator.GetInt32(1, 0x7FFFFFFF).ToString("X8", CultureInfo.InvariantCulture);
                while (!_targetParaIds.Add(id));
                paraId.Value = id;
            }
            foreach (var a in e.Attributes().Where(a => a.Name.Namespace == Ns.R || a.Name == Ns.O + "relid").ToList())
            {
                var mapped = ImportRelationship(sourcePart, targetPart, a.Value);
                if (mapped is null) a.Remove();
                else a.Value = mapped;
            }
        }
        RenameBookmarkReferences(root);
    }

    // ─────────────────────────────── estilos ───────────────────────────────

    /// <summary>Id no destino do estilo <paramref name="sourceId"/> da origem (null = estilo não existe na origem).</summary>
    private string? ImportStyle(string sourceId)
    {
        if (_styleMap.TryGetValue(sourceId, out var mapped)) return mapped;
        var style = DocxStyles.ById(_sourceStyles, sourceId);
        var targetRoot = DocxStyles.Root(_target, create: style is not null);
        if (style is null)
        {
            // sem definição na origem: o id do destino, ou o estilo interno de mesmo nome
            // ("Heading1" → "heading 1"), como o Word/DocIO interpretam ids internos
            mapped = DocxStyles.ById(targetRoot, sourceId) is not null
                ? sourceId
                : DocxStyles.BuiltInName(sourceId) is { } builtIn && DocxStyles.ByName(targetRoot, builtIn) is { } byName
                    ? DocxStyles.Id(byName)
                    : null;
            _styleMap[sourceId] = mapped;
            return mapped;
        }
        string name = DocxStyles.Name(style) ?? sourceId;
        var existing = DocxStyles.ByName(targetRoot, name, DocxStyles.Type(style));
        if (existing is not null)
        {
            mapped = DocxStyles.Id(existing);
            _styleMap[sourceId] = mapped;
            return mapped;
        }
        string newId = DocxStyles.UniqueId(targetRoot!, sourceId);
        _styleMap[sourceId] = newId;
        var copy = XmlTree.DeepClone(style);
        copy.SetAttributeValue(W.styleId, newId);
        copy.Attribute(W.@default)?.Remove();
        foreach (var link in copy.Elements().Where(e => e.Name == W.basedOn || e.Name == W.next || e.Name == W.link).ToList())
        {
            var linked = ImportStyle((string?)link.Attribute(W.val) ?? "");
            if (linked is null) link.Remove();
            else link.SetAttributeValue(W.val, linked);
        }
        foreach (var numId in copy.Descendants(W.numId).Where(n => n.Parent?.Name == W.numPr).ToList())
        {
            string? id = (string?)numId.Attribute(W.val);
            if (id is not null && id != "0") numId.SetAttributeValue(W.val, ImportNum(id));
        }
        foreach (var fonts in copy.Descendants(W.rFonts))
            foreach (var a in FontAttributes)
                if ((string?)fonts.Attribute(Ns.W + a) is { Length: > 0 } font) _fonts.Add(font);
        targetRoot!.Add(copy);
        return newId;
    }

    // ─────────────────────────────── numeração ───────────────────────────────

    private string ImportNum(string sourceNumId)
    {
        if (_numMap.TryGetValue(sourceNumId, out var mapped)) return mapped;
        var num = DocxNumbering.Num(_sourceNumbering, sourceNumId);
        if (num is null) return sourceNumId;
        var targetRoot = DocxNumbering.Root(_target, create: true)!;
        string newNumId = DocxNumbering.NextNumId(targetRoot);
        _numMap[sourceNumId] = newNumId;
        var copy = XmlTree.DeepClone(num);
        copy.SetAttributeValue(W.numId, newNumId);
        var abstractRef = copy.Element(W.abstractNumId);
        if ((string?)abstractRef?.Attribute(W.val) is { } abstractId)
            abstractRef!.SetAttributeValue(W.val, ImportAbstract(abstractId));
        foreach (var pStyle in copy.Descendants(W.pStyle).ToList())
        {
            var s = ImportStyle((string?)pStyle.Attribute(W.val) ?? "");
            if (s is null) pStyle.Remove(); else pStyle.SetAttributeValue(W.val, s);
        }
        DocxNumbering.InsertNum(targetRoot, copy);
        return newNumId;
    }

    private string ImportAbstract(string sourceAbstractId)
    {
        if (_abstractMap.TryGetValue(sourceAbstractId, out var mapped)) return mapped;
        var abstractNum = DocxNumbering.AbstractNum(_sourceNumbering, sourceAbstractId);
        var targetRoot = DocxNumbering.Root(_target, create: true)!;
        if (abstractNum is null) return sourceAbstractId;
        string newId = DocxNumbering.NextAbstractId(targetRoot);
        _abstractMap[sourceAbstractId] = newId;
        var copy = XmlTree.DeepClone(abstractNum);
        copy.SetAttributeValue(W.abstractNumId, newId);
        // nsid novo: o Word junta listas de mesmo nsid ao colar
        var nsid = copy.Element(W.nsid);
        if (nsid is not null) nsid.SetAttributeValue(W.val, RandomNumberGenerator.GetInt32(1, int.MaxValue).ToString("X8", CultureInfo.InvariantCulture));
        foreach (var e in copy.Descendants().ToList())
        {
            if (e.Name == W.pStyle || e.Name == W.numStyleLink || e.Name == W.styleLink)
            {
                var s = ImportStyle((string?)e.Attribute(W.val) ?? "");
                if (s is null) e.Remove(); else e.SetAttributeValue(W.val, s);
            }
            else if (e.Name == W.lvlPicBulletId)
            {
                var id = (string?)e.Attribute(W.val);
                if (id is not null) e.SetAttributeValue(W.val, ImportPicBullet(id));
            }
            else if (e.Name == W.rFonts)
            {
                foreach (var a in FontAttributes)
                    if ((string?)e.Attribute(Ns.W + a) is { Length: > 0 } font) _fonts.Add(font);
            }
        }
        DocxNumbering.InsertAbstract(targetRoot, copy);
        return newId;
    }

    private string ImportPicBullet(string sourceId)
    {
        if (_picBulletMap.TryGetValue(sourceId, out var mapped)) return mapped;
        var bullet = _sourceNumbering?.Elements(W.numPicBullet).FirstOrDefault(b => (string?)b.Attribute(W.numPicBulletId) == sourceId);
        if (bullet is null) return sourceId;
        var targetRoot = DocxNumbering.Root(_target, create: true)!;
        string newId = (targetRoot.Elements(W.numPicBullet).Select(b => int.TryParse((string?)b.Attribute(W.numPicBulletId), out var v) ? v : -1).DefaultIfEmpty(-1).Max() + 1)
            .ToString(CultureInfo.InvariantCulture);
        _picBulletMap[sourceId] = newId;
        var copy = XmlTree.DeepClone(bullet);
        copy.SetAttributeValue(W.numPicBulletId, newId);
        string sourcePart = _source.MainRelatedPart("numbering")!;
        string targetPart = _target.MainRelatedPart("numbering")!;
        foreach (var e in copy.DescendantsAndSelf())
            foreach (var a in e.Attributes().Where(a => a.Name.Namespace == Ns.R || a.Name == Ns.O + "relid").ToList())
            {
                var rel = ImportRelationship(sourcePart, targetPart, a.Value);
                if (rel is null) a.Remove(); else a.Value = rel;
            }
        DocxNumbering.InsertPicBullet(targetRoot, copy);
        return newId;
    }

    // ─────────────────────────────── relacionamentos e partes ───────────────────────────────

    private string? ImportRelationship(string sourcePart, string targetPart, string sourceId)
    {
        if (_relMap.TryGetValue((sourcePart, targetPart, sourceId), out var mapped)) return mapped;
        var rel = _source.GetRelationship(sourcePart, sourceId);
        if (rel is null) return null;
        string id;
        if (rel.External)
        {
            id = _target.AddRelationship(targetPart, rel.Type, rel.Target, external: true);
        }
        else
        {
            var sourceTarget = _source.ResolveTarget(sourcePart, rel);
            if (sourceTarget is null) return null;
            string copied = CopyPart(sourceTarget);
            id = _target.AddRelationship(targetPart, rel.Type, DocxDocument.RelativeTarget(targetPart, copied), external: false);
        }
        _relMap[(sourcePart, targetPart, sourceId)] = id;
        return id;
    }

    /// <summary>Copia a parte (e, recursivamente, as partes dela) para um caminho livre do destino.</summary>
    private string CopyPart(string sourcePath)
    {
        if (_partMap.TryGetValue(sourcePath, out var copied)) return copied;
        string targetPath = _target.UniquePartPath(sourcePath);
        _partMap[sourcePath] = targetPath;
        var bytes = _source.GetPartBytes(sourcePath) ?? [];
        _target.SetBinaryPart(targetPath, bytes, _source.GetContentType(sourcePath) ?? "application/octet-stream");
        foreach (var rel in _source.GetRelationships(sourcePath))
        {
            if (rel.External)
            {
                _target.AddRelationship(targetPath, rel.Id, rel.Type, rel.Target, external: true);
                continue;
            }
            var child = _source.ResolveTarget(sourcePath, rel);
            if (child is null) continue;
            string childTarget = CopyPart(child);
            _target.AddRelationship(targetPath, rel.Id, rel.Type, DocxDocument.RelativeTarget(targetPath, childTarget), external: false);
        }
        return targetPath;
    }

    // ─────────────────────────────── notas ───────────────────────────────

    private string ImportNote(string kind, string sourceId)
    {
        if (_noteMap.TryGetValue((kind, sourceId), out var mapped)) return mapped;
        XName noteName = kind == "footnotes" ? W.footnote : W.endnote;
        XName rootName = kind == "footnotes" ? W.footnotes : W.endnotes;
        var sourcePart = _source.MainRelatedPart(kind);
        var note = sourcePart is null ? null : _source.TryXml(sourcePart)?.Root?.Elements(noteName).FirstOrDefault(n => (string?)n.Attribute(W.id) == sourceId);
        if (note is null) return sourceId;
        var targetRoot = NotesRoot(kind, rootName, noteName);
        string targetPart = _target.MainRelatedPart(kind)!;
        string newId = (targetRoot.Elements(noteName).Select(n => int.TryParse((string?)n.Attribute(W.id), out var v) ? v : 0).DefaultIfEmpty(0).Max() + 1)
            .ToString(CultureInfo.InvariantCulture);
        _noteMap[(kind, sourceId)] = newId;
        var copy = XmlTree.DeepClone(note);
        copy.SetAttributeValue(W.id, newId);
        Process(copy, sourcePart!, targetPart);
        targetRoot.Add(copy);
        return newId;
    }

    private XElement NotesRoot(string kind, XName rootName, XName noteName)
    {
        var existing = _target.MainRelatedPart(kind);
        if (existing is not null) return _target.Xml(existing).Root!;
        var root = _target.MainRelatedRoot(kind, true, "word/" + kind + ".xml", kind == "footnotes" ? ContentTypes.Footnotes : ContentTypes.Endnotes, rootName)!;
        // separadores obrigatórios (ids -1 e 0), como o Word grava
        root.Add(
            new XElement(noteName, new XAttribute(W.type, "separator"), new XAttribute(W.id, "-1"),
                new XElement(W.p, new XElement(W.r, new XElement(Ns.W + "separator")))),
            new XElement(noteName, new XAttribute(W.type, "continuationSeparator"), new XAttribute(W.id, "0"),
                new XElement(W.p, new XElement(W.r, new XElement(Ns.W + "continuationSeparator")))));
        return root;
    }

    // ─────────────────────────────── indicadores ───────────────────────────────

    private void RenumberBookmark(XElement e)
    {
        string? id = (string?)e.Attribute(W.id);
        if (id is null) return;
        if (!_bookmarkIds.TryGetValue(id, out var newId))
        {
            newId = (_nextBookmarkId++).ToString(CultureInfo.InvariantCulture);
            _bookmarkIds[id] = newId;
        }
        e.SetAttributeValue(W.id, newId);
        if (e.Name != W.bookmarkStart || (string?)e.Attribute(W.name) is not { } name) return;
        if (!_targetBookmarkNames.Contains(name))
        {
            _targetBookmarkNames.Add(name);
            return;
        }
        string renamed;
        int n = 1;
        do renamed = name + "_" + (n++).ToString(CultureInfo.InvariantCulture);
        while (_targetBookmarkNames.Contains(renamed));
        _targetBookmarkNames.Add(renamed);
        _bookmarkNames[name] = renamed;
        e.SetAttributeValue(W.name, renamed);
    }

    /// <summary>Âncoras de hiperlink e referências de campo (REF, PAGEREF, HYPERLINK \l) apontam para o nome novo.</summary>
    private void RenameBookmarkReferences(XElement root)
    {
        if (_bookmarkNames.Count == 0) return;
        foreach (var h in root.DescendantsAndSelf(W.hyperlink))
            if ((string?)h.Attribute(W.anchor) is { } anchor && _bookmarkNames.TryGetValue(anchor, out var renamed))
                h.SetAttributeValue(W.anchor, renamed);
        foreach (var instr in root.DescendantsAndSelf(W.instrText))
        {
            var parts = instr.Value.Split(' ');
            bool changed = false;
            for (int k = 0; k < parts.Length; k++)
            {
                string token = parts[k].Trim('"');
                if (_bookmarkNames.TryGetValue(token, out var renamed))
                {
                    parts[k] = parts[k].Replace(token, renamed, StringComparison.Ordinal);
                    changed = true;
                }
            }
            if (changed) instr.Value = string.Join(' ', parts);
        }
    }

    // ─────────────────────────────── fontes ───────────────────────────────

    /// <summary>Fontes usadas pelo conteúdo importado que faltam na tabela de fontes do destino (com as embutidas).</summary>
    private void ImportFonts()
    {
        var sourcePart = _source.MainRelatedPart("fontTable");
        var sourceRoot = sourcePart is null ? null : _source.TryXml(sourcePart)?.Root;
        if (sourceRoot is null || _fonts.Count == 0) return;
        var missing = sourceRoot.Elements(W.font)
            .Where(f => _fonts.Contains((string?)f.Attribute(W.name) ?? ""))
            .ToList();
        if (missing.Count == 0) return;
        var targetRoot = _target.MainRelatedRoot("fontTable", true, "word/fontTable.xml", ContentTypes.FontTable, W.fonts)!;
        string targetPart = _target.MainRelatedPart("fontTable")!;
        var present = new HashSet<string>(targetRoot.Elements(W.font).Select(f => (string?)f.Attribute(W.name) ?? ""), StringComparer.OrdinalIgnoreCase);
        bool embedded = false;
        foreach (var font in missing)
        {
            if (!present.Add((string?)font.Attribute(W.name) ?? "")) continue;
            var copy = XmlTree.DeepClone(font);
            foreach (var embed in copy.Elements().Where(e => e.Name.LocalName.StartsWith("embed", StringComparison.Ordinal)).ToList())
            {
                var rid = embed.Attribute(Ns.R + "id");
                var mapped = rid is null ? null : ImportRelationship(sourcePart!, targetPart, rid.Value);
                if (mapped is null) embed.Remove();
                else
                {
                    rid!.Value = mapped;
                    embedded = true;
                }
            }
            targetRoot.Add(copy);
        }
        if (embedded && DocxReview.SettingsRoot(_target) is { } settings && settings.Element(W.embedTrueTypeFonts) is null)
            XmlOrder.Set(settings, new XElement(W.embedTrueTypeFonts), XmlOrder.Settings);
    }
}

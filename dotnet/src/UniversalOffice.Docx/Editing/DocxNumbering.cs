using System.Globalization;
using System.Xml.Linq;

namespace UniversalOffice.Docx.Editing;

/// <summary>Numeração (word/numbering.xml): consultas e listas novas.</summary>
public static class DocxNumbering
{
    internal static XElement? Root(DocxDocument doc, bool create = false) =>
        doc.MainRelatedRoot("numbering", create, "word/numbering.xml", ContentTypes.Numbering, W.numbering);

    internal static XElement? Num(XElement? root, string numId) =>
        root?.Elements(W.num).FirstOrDefault(n => (string?)n.Attribute(W.numId) == numId);

    internal static XElement? AbstractNum(XElement? root, string abstractId) =>
        root?.Elements(W.abstractNum).FirstOrDefault(a => (string?)a.Attribute(W.abstractNumId) == abstractId);

    internal static XElement? AbstractOf(XElement? root, string numId)
    {
        var num = Num(root, numId);
        var abstractId = (string?)num?.Element(W.abstractNumId)?.Attribute(W.val);
        return abstractId is null ? null : AbstractNum(root, abstractId);
    }

    /// <summary>Recuo esquerdo (twips) do nível da lista, se definido.</summary>
    internal static int? LevelIndent(DocxDocument doc, string numId, int ilvl)
    {
        var root = Root(doc);
        var num = Num(root, numId);
        var overrideLvl = num?.Elements(W.lvlOverride).FirstOrDefault(o => (string?)o.Attribute(W.ilvl) == ilvl.ToString(CultureInfo.InvariantCulture))?.Element(W.lvl);
        var lvl = overrideLvl ?? AbstractOf(root, numId)?.Elements(W.lvl).FirstOrDefault(l => (string?)l.Attribute(W.ilvl) == ilvl.ToString(CultureInfo.InvariantCulture));
        var ind = lvl?.Element(W.pPr)?.Element(W.ind);
        string? v = (string?)ind?.Attribute(W.left) ?? (string?)ind?.Attribute(Ns.W + "start");
        return int.TryParse(v, NumberStyles.Integer, CultureInfo.InvariantCulture, out var n) ? n : null;
    }

    /// <summary>
    /// Nova instância (w:num) da mesma lista abstrata de <paramref name="numId"/>, com
    /// a contagem reiniciada em todos os níveis (w:startOverride = início do nível) —
    /// o "reiniciar numeração" do Word. Devolve o numId novo, ou null se a lista não existe.
    /// </summary>
    public static string? AddRestartedInstance(DocxDocument doc, string numId)
    {
        var root = Root(doc);
        var num = Num(root, numId);
        var abstractId = (string?)num?.Element(W.abstractNumId)?.Attribute(W.val);
        if (root is null || num is null || abstractId is null) return null;
        var abstractNum = AbstractNum(root, abstractId);
        string newId = NextNumId(root);
        var created = new XElement(W.num, new XAttribute(W.numId, newId), new XElement(W.abstractNumId, new XAttribute(W.val, abstractId)));
        for (int level = 0; level <= 8; level++)
        {
            string ilvl = level.ToString(CultureInfo.InvariantCulture);
            var lvl = abstractNum?.Elements(W.lvl).FirstOrDefault(l => (string?)l.Attribute(W.ilvl) == ilvl);
            string start = (string?)lvl?.Element(W.start)?.Attribute(W.val) ?? "1";
            created.Add(new XElement(W.lvlOverride, new XAttribute(W.ilvl, ilvl),
                new XElement(W.startOverride, new XAttribute(W.val, start))));
        }
        InsertNum(root, created);
        return newId;
    }

    internal static string NextNumId(XElement root) =>
        (root.Elements(W.num).Select(n => int.TryParse((string?)n.Attribute(W.numId), out var v) ? v : 0).DefaultIfEmpty(0).Max() + 1)
        .ToString(CultureInfo.InvariantCulture);

    internal static string NextAbstractId(XElement root) =>
        (root.Elements(W.abstractNum).Select(n => int.TryParse((string?)n.Attribute(W.abstractNumId), out var v) ? v : -1).DefaultIfEmpty(-1).Max() + 1)
        .ToString(CultureInfo.InvariantCulture);

    /// <summary>w:num entra depois do último w:num (antes de w:numIdMacAtCleanup).</summary>
    internal static void InsertNum(XElement root, XElement num)
    {
        var last = root.Elements(W.num).LastOrDefault();
        if (last is not null) { last.AddAfterSelf(num); return; }
        var cleanup = root.Element(W.numIdMacAtCleanup);
        if (cleanup is not null) cleanup.AddBeforeSelf(num);
        else root.Add(num);
    }

    /// <summary>w:abstractNum entra depois do último w:abstractNum (os w:num vêm depois de todos eles).</summary>
    internal static void InsertAbstract(XElement root, XElement abstractNum)
    {
        var last = root.Elements(W.abstractNum).LastOrDefault();
        if (last is not null) { last.AddAfterSelf(abstractNum); return; }
        var lastBullet = root.Elements(W.numPicBullet).LastOrDefault();
        if (lastBullet is not null) { lastBullet.AddAfterSelf(abstractNum); return; }
        root.AddFirst(abstractNum);
    }

    /// <summary>w:numPicBullet entra antes de tudo (depois dos já existentes).</summary>
    internal static void InsertPicBullet(XElement root, XElement bullet)
    {
        var last = root.Elements(W.numPicBullet).LastOrDefault();
        if (last is not null) last.AddAfterSelf(bullet);
        else root.AddFirst(bullet);
    }
}

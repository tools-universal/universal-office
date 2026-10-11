using static OfficeNext.Core.MiniXml;

namespace OfficeNext.Docx;

/// <summary>Face embutida no .docx (porta de EmbeddedFont em docx-core/src/fonts.ts).</summary>
public sealed class EmbeddedFontData
{
    /// <summary>nome da família (w:font/@w:name), ex.: "Lato", "Lato Black".</summary>
    public string Family = "";
    /// <summary>regular | bold | italic | boldItalic</summary>
    public string Variant = "regular";
    /// <summary>bytes do sfnt já DESOFUSCADO (TTF/OTF válido).</summary>
    public byte[] Data = [];
}

/// <summary>
/// Fontes EMBEDADAS no .docx (word/fontTable.xml + word/fonts/*.odttf) —
/// porta de docx-core/src/fonts.ts. O Word ofusca cada arquivo (ECMA-376
/// §17.8.1): os PRIMEIROS 32 bytes são XOR'ados com uma chave de 16 bytes
/// derivada do w:fontKey (GUID) — os bytes do GUID em ordem REVERSA. Os bytes
/// ficam só em memória (nunca gravados em disco — CLAUDE.md).
/// </summary>
public static class EmbeddedFonts
{
    private static readonly (string Tag, string Variant)[] EmbedTags =
    {
        ("w:embedRegular", "regular"),
        ("w:embedBold", "bold"),
        ("w:embedItalic", "italic"),
        ("w:embedBoldItalic", "boldItalic"),
    };

    /// <summary>Desofusca um .odttf: XOR dos 32 primeiros bytes com a chave do GUID (revertida).</summary>
    public static byte[] DeobfuscateFont(byte[] data, string fontKey)
    {
        string hex = fontKey.Replace("{", "").Replace("}", "").Replace("-", "");
        if (hex.Length < 32) return data;
        var key = new byte[16];
        for (int i = 0; i < 16; i++)
        {
            double v = OfficeNext.Core.JsNumber.ParseInt(hex.Substring(i * 2, 2), 16);
            key[i] = double.IsNaN(v) ? (byte)0 : (byte)v;
        }
        Array.Reverse(key);
        var outp = (byte[])data.Clone();
        int n = Math.Min(32, outp.Length);
        for (int i = 0; i < n; i++) outp[i] = (byte)(outp[i] ^ key[i % 16]);
        return outp;
    }

    /// <summary>Lê e desofusca todas as fontes embedadas do pacote. Vazio se não houver.</summary>
    public static List<EmbeddedFontData> ReadEmbeddedFonts(DocxPackage pkg)
    {
        string? tableXml = pkg.GetPartText("word/fontTable.xml");
        if (string.IsNullOrEmpty(tableXml)) return new List<EmbeddedFontData>();
        string? relsXml = pkg.GetPartText("word/_rels/fontTable.xml.rels");
        var rels = new Dictionary<string, string>(StringComparer.Ordinal);
        if (!string.IsNullOrEmpty(relsXml))
        {
            foreach (var rel in ChildElements(Parse(relsXml), "Relationship"))
            {
                string? id = rel.Attr("Id");
                string? target = rel.Attr("Target");
                if (Js.Truthy(id) && Js.Truthy(target)) rels[id!] = target!;
            }
        }
        var outp = new List<EmbeddedFontData>();
        var root = Parse(tableXml);
        foreach (var font in ChildElements(root, "w:font"))
        {
            string? family = font.Attr("w:name");
            if (!Js.Truthy(family)) continue;
            foreach (var (tag, variant) in EmbedTags)
            {
                var embed = FirstChild(font, tag);
                if (embed is null) continue;
                string? rid = embed.Attr("r:id");
                string? fontKey = embed.Attr("w:fontKey");
                if (!Js.Truthy(rid) || !Js.Truthy(fontKey)) continue;
                if (!rels.TryGetValue(rid!, out var target)) continue;
                string path;
                if (target.StartsWith("word/", StringComparison.Ordinal)) path = target;
                else
                {
                    // target.replace(/^\.?\//, '')
                    string t = target.StartsWith("./", StringComparison.Ordinal) ? target[2..]
                        : target.StartsWith('/') ? target[1..] : target;
                    path = "word/" + t;
                }
                var raw = pkg.GetPart(path);
                if (raw is null) continue;
                outp.Add(new EmbeddedFontData { Family = family!, Variant = variant, Data = DeobfuscateFont(raw, fontKey!) });
            }
        }
        return outp;
    }
}

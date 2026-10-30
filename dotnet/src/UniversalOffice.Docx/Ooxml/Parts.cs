using System.Text.RegularExpressions;
using UniversalOffice.Core;
using static UniversalOffice.Core.MiniXml;

namespace UniversalOffice.Docx;

/// <summary>
/// Objeto JS usado como dicionário (Record&lt;string, T&gt;): a iteração segue a
/// ordem do JS — chaves "índice de array" (inteiros canônicos) em ordem
/// crescente primeiro, depois as demais na ordem de inserção.
/// </summary>
public sealed class JsRecord<T> where T : class
{
    private readonly Dictionary<string, T> _map = new(StringComparer.Ordinal);
    private readonly List<string> _order = new();

    public T? this[string key]
    {
        get => _map.TryGetValue(key, out var v) ? v : null;
        set
        {
            if (value is null) { if (_map.Remove(key)) _order.Remove(key); return; }
            if (!_map.ContainsKey(key)) _order.Add(key);
            _map[key] = value;
        }
    }

    public bool ContainsKey(string key) => _map.ContainsKey(key);
    public int Count => _map.Count;

    private static bool IsIndex(string k, out uint v)
    {
        v = 0;
        if (k.Length == 0 || k.Length > 10) return false;
        if (k.Length > 1 && k[0] == '0') return false;
        foreach (char c in k) if (c < '0' || c > '9') return false;
        if (!ulong.TryParse(k, out ulong u) || u >= 4294967295UL) return false;
        v = (uint)u;
        return true;
    }

    /// <summary>Chaves na ordem de Object.keys.</summary>
    public IEnumerable<string> Keys
    {
        get
        {
            var idx = new List<(uint, string)>();
            var rest = new List<string>();
            foreach (var k in _order)
            {
                if (IsIndex(k, out uint v)) idx.Add((v, k));
                else rest.Add(k);
            }
            foreach (var (_, k) in idx.OrderBy(t => t.Item1)) yield return k;
            foreach (var k in rest) yield return k;
        }
    }

    /// <summary>Valores na ordem de Object.values.</summary>
    public IEnumerable<T> Values
    {
        get { foreach (var k in Keys) yield return _map[k]; }
    }
}

// ───────────────────────── estilos ─────────────────────────

/// <summary>wholeTable | firstRow | lastRow | firstCol | lastCol | band1Vert | band2Vert |
/// band1Horz | band2Horz | neCell | nwCell | seCell | swCell</summary>
public sealed class TblStylePart
{
    public PPr? PPr;
    public RPr? RPr;
    public TblPr? TblPr;
    public TrPr? TrPr;
    public TcPr? TcPr;
}

public sealed class StyleDef
{
    public string StyleId = "";
    /// <summary>paragraph | character | table | numbering</summary>
    public string Type = "paragraph";
    public string? Name;
    public string? BasedOn;
    public string? Next;
    public string? Link;
    public bool? IsDefault;
    public PPr? PPr;
    public RPr? RPr;
    public TblPr? TblPr;
    public TrPr? TrPr;
    public TcPr? TcPr;
    /// <summary>tipo condicional → parte (ordem de leitura; a última definição do tipo vence).</summary>
    public Dictionary<string, TblStylePart>? TblStylePr;
}

public sealed class DocDefaults
{
    public RPr? RPr;
    public PPr? PPr;
}

public sealed class StyleDefaults
{
    public string? Paragraph;
    public string? Character;
    public string? Table;
    public string? Numbering;
}

public sealed class StyleSheet
{
    public DocDefaults DocDefaults = new();
    public JsRecord<StyleDef> Styles = new();
    /// <summary>styleId do estilo padrão de cada tipo (w:default="1").</summary>
    public StyleDefaults Defaults = new();
}

// ───────────────────────── numeração ─────────────────────────

public sealed class NumLevel
{
    public double Ilvl;
    public double? Start;
    public string? NumFmt;
    /// <summary>w:numFmt w:format (formato customizado, ex.: "001, 002").</summary>
    public string? NumFmtCustom;
    public double? LvlRestart;
    public string? PStyle;
    public bool? IsLgl;
    /// <summary>tab | space | nothing</summary>
    public string? Suff;
    public string? LvlText;
    /// <summary>w:lvlText w:null="1" — sem texto.</summary>
    public bool? LvlTextNull;
    public double? LvlPicBulletId;
    public string? LvlJc;
    public PPr? PPr;
    public RPr? RPr;
}

public sealed class AbstractNum
{
    public double AbstractNumId;
    public string? MultiLevelType;
    public string? StyleLink;
    public string? NumStyleLink;
    public Dictionary<double, NumLevel> Levels = new();
}

public sealed class LevelOverride
{
    public double? StartOverride;
    public NumLevel? Lvl;
}

public sealed class NumInstance
{
    public double NumId;
    public double AbstractNumId;
    /// <summary>ilvl → override (ordem de inserção; a ordem não afeta o motor).</summary>
    public Dictionary<double, LevelOverride> Overrides = new();
}

public sealed class PicBullet
{
    public double Id;
    /// <summary>r:id da imagem (v:imagedata / a:blip) na parte de numeração.</summary>
    public string? Rid;
    public double? WidthPt;
    public double? HeightPt;
    /// <summary>a imagem (resolvida pela relação da parte de numeração)</summary>
    public byte[]? ImageData;
    public string? ImageExt;
}

public sealed class Numbering
{
    public Dictionary<double, AbstractNum> AbstractNums = new();
    public Dictionary<double, NumInstance> Nums = new();
    public Dictionary<double, PicBullet> PicBullets = new();
}

// ───────────────────────── tema ─────────────────────────

public sealed class ThemeFontSet
{
    public string? Latin;
    public string? Ea;
    public string? Cs;
    /// <summary>a:font script="…" (Jpan, Hang, Arab…)</summary>
    public Dictionary<string, string> Scripts = new(StringComparer.Ordinal);
}

public sealed class Theme
{
    public ThemeFontSet Major = new();
    public ThemeFontSet Minor = new();
    /// <summary>dk1, lt1, dk2, lt2, accent1..6, hlink, folHlink → RRGGBB</summary>
    public Dictionary<string, string> Colors = new(StringComparer.Ordinal);
    /// <summary>espessuras (pt) das linhas do a:lnStyleLst — lnRef idx 1..3</summary>
    public List<double>? LineWidthsPt;
    /// <summary>preenchimentos do a:fillStyleLst (fillRef idx 1..3) e do a:bgFillStyleLst (idx
    /// 1001..1003), com a cor do marcador phClr (@phClr) — Estilos de Forma</summary>
    public List<ShapeStyle>? FillStyles;
    public List<ShapeStyle>? BgFillStyles;
    /// <summary>sombras do a:effectStyleLst (effectRef idx 1..3; sem efeito = nulo)</summary>
    public List<ShapeShadow?>? EffectStyles;
}

// ───────────────────────── configurações ─────────────────────────

/// <summary>w:footnotePr / w:endnotePr (do sectPr ou do settings): numeração e local.</summary>
public sealed class NoteProps
{
    /// <summary>rodapé: pageBottom | beneathText; fim: sectEnd | docEnd</summary>
    public string? Pos;
    /// <summary>w:numFmt (decimal, lowerRoman, chicago…)</summary>
    public string? NumFmt;
    public double? NumStart;
    /// <summary>continuous | eachSect | eachPage</summary>
    public string? NumRestart;
}

public sealed class Settings
{
    /// <summary>twips (padrão do Word: 720; templates pt-BR costumam ter 708).</summary>
    public double DefaultTabStop = 720;
    /// <summary>w:compatSetting compatibilityMode (11 = Word 2003, 12 = 2007, 14 = 2010, 15 = 2013+).</summary>
    public double CompatibilityMode = 15;
    /// <summary>flags de w:compat (doNotExpandShiftReturn, …) presentes = true.</summary>
    public Dictionary<string, bool> Compat = new(StringComparer.Ordinal);
    public bool EvenAndOddHeaders;
    public bool MirrorMargins;
    public bool AutoHyphenation;
    public bool DoNotHyphenateCaps;
    public double? HyphenationZone;
    public double? ConsecutiveHyphenLimit;
    public string? CharacterSpacingControl;
    public LangSpec? ThemeFontLang;
    public bool DisplayBackgroundShape;
    public bool UpdateFields;
    /// <summary>bordas de página (offsetFrom text) NÃO contornam o cabeçalho/rodapé</summary>
    public bool BordersDoNotSurroundHeader;
    public bool BordersDoNotSurroundFooter;
    /// <summary>w:footnotePr / w:endnotePr do documento (padrão das seções; o local da nota
    /// de fim só existe aqui)</summary>
    public NoteProps? FootnotePr;
    public NoteProps? EndnotePr;
}

// ───────────────────────── tabela de fontes ─────────────────────────

public sealed class FontInfo
{
    public string Name = "";
    public string? AltName;
    /// <summary>10 bytes em hex.</summary>
    public string? Panose1;
    public string? Charset;
    /// <summary>roman | swiss | modern | script | decorative | auto</summary>
    public string? Family;
    public string? Pitch;
    /// <summary>usb0..3, csb0..1</summary>
    public Dictionary<string, string>? Sig;
}

/// <summary>Formatação do documento inteiro, para o motor de layout.</summary>
public sealed class DocFormatting
{
    public StyleSheet Styles = new();
    public Numbering Numbering = new();
    public Theme Theme = new();
    public Settings Settings = new();
    public Dictionary<string, FontInfo> FontTable = new(StringComparer.Ordinal);
}

/// <summary>
/// Partes que definem a FORMATAÇÃO (estilos, numeração, tema, configurações e
/// tabela de fontes) — porta de docx-core/src/ooxml/parts.ts. Lidas cruas (sem
/// resolver herança); a cascata é do motor de layout.
/// </summary>
public static class OoxmlParts
{
    private static XmlElement? Find(XmlElement e, string name)
    {
        foreach (var c in ChildElements(e))
        {
            if (c.Name == name) return c;
            var f = Find(c, name);
            if (f is not null) return f;
        }
        return null;
    }

    public static StyleSheet ReadStyleSheet(string? xml)
    {
        var sheet = new StyleSheet();
        if (string.IsNullOrEmpty(xml)) return sheet;
        var root = Parse(xml);
        var dd = FirstChild(root, "w:docDefaults");
        if (dd is not null)
        {
            var rPr = OoxmlProps.ReadRPr(FirstChild(FirstChild(dd, "w:rPrDefault") ?? dd, "w:rPr"));
            var pPr = OoxmlProps.ReadPPr(FirstChild(FirstChild(dd, "w:pPrDefault") ?? dd, "w:pPr"));
            if (rPr is not null) sheet.DocDefaults.RPr = rPr;
            if (pPr is not null) sheet.DocDefaults.PPr = pPr;
        }
        foreach (var st in ChildElements(root, "w:style"))
        {
            string? id = st.Attr("w:styleId");
            string type = st.Attr("w:type") ?? "paragraph";
            if (!Js.Truthy(id) || (type != "paragraph" && type != "character" && type != "table" && type != "numbering")) continue;
            var def = new StyleDef { StyleId = id!, Type = type };
            string? Val(string n) => FirstChild(st, n)?.Attr("w:val");
            string? name = Val("w:name");
            if (name is not null) def.Name = name;
            string? basedOn = Val("w:basedOn");
            if (Js.Truthy(basedOn)) def.BasedOn = basedOn;
            string? next = Val("w:next");
            if (Js.Truthy(next)) def.Next = next;
            string? link = Val("w:link");
            if (Js.Truthy(link)) def.Link = link;
            string? d = st.Attr("w:default");
            if (d is "1" or "true" or "on")
            {
                def.IsDefault = true;
                switch (type)
                {
                    case "paragraph": sheet.Defaults.Paragraph ??= id; break;
                    case "character": sheet.Defaults.Character ??= id; break;
                    case "table": sheet.Defaults.Table ??= id; break;
                    case "numbering": sheet.Defaults.Numbering ??= id; break;
                }
            }
            def.PPr = OoxmlProps.ReadPPr(FirstChild(st, "w:pPr"));
            def.RPr = OoxmlProps.ReadRPr(FirstChild(st, "w:rPr"));
            def.TblPr = OoxmlProps.ReadTblPr(FirstChild(st, "w:tblPr"));
            def.TrPr = OoxmlProps.ReadTrPr(FirstChild(st, "w:trPr"));
            def.TcPr = OoxmlProps.ReadTcPr(FirstChild(st, "w:tcPr"));
            foreach (var tsp in ChildElements(st, "w:tblStylePr"))
            {
                string? t = tsp.Attr("w:type");
                if (!Js.Truthy(t)) continue;
                var part = new TblStylePart
                {
                    PPr = OoxmlProps.ReadPPr(FirstChild(tsp, "w:pPr")),
                    RPr = OoxmlProps.ReadRPr(FirstChild(tsp, "w:rPr")),
                    TblPr = OoxmlProps.ReadTblPr(FirstChild(tsp, "w:tblPr")),
                    TrPr = OoxmlProps.ReadTrPr(FirstChild(tsp, "w:trPr")),
                    TcPr = OoxmlProps.ReadTcPr(FirstChild(tsp, "w:tcPr")),
                };
                (def.TblStylePr ??= new Dictionary<string, TblStylePart>(StringComparer.Ordinal))[t!] = part;
            }
            // w:styleId repetido: a ÚLTIMA definição substitui as anteriores inteira
            // (medido no Word, oráculo styledup)
            sheet.Styles[id!] = def;
        }
        return sheet;
    }

    private static NumLevel ReadLevel(XmlElement el)
    {
        double ilvl = Js.IntOr0(el.Attr("w:ilvl") ?? "0");
        var lvl = new NumLevel { Ilvl = ilvl };
        string? V(string n) => FirstChild(el, n)?.Attr("w:val");
        string? start = V("w:start");
        if (start is not null) lvl.Start = Js.ParseInt(start);
        var fmtEl = FirstChild(el, "w:numFmt");
        if (Js.Truthy(fmtEl?.Attr("w:val"))) lvl.NumFmt = fmtEl!.Attr("w:val");
        if (Js.Truthy(fmtEl?.Attr("w:format"))) lvl.NumFmtCustom = fmtEl!.Attr("w:format");
        string? restart = V("w:lvlRestart");
        if (restart is not null) lvl.LvlRestart = Js.ParseInt(restart);
        string? ps = V("w:pStyle");
        if (Js.Truthy(ps)) lvl.PStyle = ps;
        var isLgl = FirstChild(el, "w:isLgl");
        if (isLgl is not null) lvl.IsLgl = OoxmlProps.OnOffVal(isLgl);
        string? suff = V("w:suff");
        if (suff is "tab" or "space" or "nothing") lvl.Suff = suff;
        var lt = FirstChild(el, "w:lvlText");
        if (lt is not null)
        {
            if (lt.Attr("w:val") is { } v) lvl.LvlText = v;
            if (lt.Attr("w:null") is "1" or "true") lvl.LvlTextNull = true;
        }
        string? pic = V("w:lvlPicBulletId");
        if (pic is not null) lvl.LvlPicBulletId = Js.ParseInt(pic);
        string? jc = V("w:lvlJc");
        if (Js.Truthy(jc)) lvl.LvlJc = jc;
        lvl.PPr = OoxmlProps.ReadPPr(FirstChild(el, "w:pPr"));
        lvl.RPr = OoxmlProps.ReadRPr(FirstChild(el, "w:rPr"));
        return lvl;
    }

    /// <summary>Comprimento de estilo VML ("360pt", "5in", "480px", "2cm") em pontos.</summary>
    private static double? VmlLenPt(string style, string prop)
    {
        var m = Regex.Match(style, @"(?:^|;)\s*" + prop + @":\s*([0-9.]+)\s*(pt|in|px|cm|mm|pc)?", RegexOptions.CultureInvariant);
        if (!m.Success) return null;
        double v = Js.ParseFloat(m.Groups[1].Value);
        double k = (m.Groups[2].Success ? m.Groups[2].Value : "px") switch { "pt" => 1, "in" => 72, "px" => 0.75, "cm" => 72 / 2.54, "mm" => 72 / 25.4, "pc" => 12, _ => 1 };
        return double.IsFinite(v) ? v * k : null;
    }

    public static Numbering ReadNumbering(string? xml)
    {
        var outp = new Numbering();
        if (string.IsNullOrEmpty(xml)) return outp;
        var root = Parse(xml);
        foreach (var pb in ChildElements(root, "w:numPicBullet"))
        {
            double id = Js.ParseInt(pb.Attr("w:numPicBulletId") ?? "-1");
            var bullet = new PicBullet { Id = id };
            var img = Find(pb, "v:imagedata");
            var blip = Find(pb, "a:blip");
            string? rid = img?.Attr("r:id") ?? blip?.Attr("r:embed");
            if (Js.Truthy(rid)) bullet.Rid = rid;
            var shape = Find(pb, "v:shape");
            string style = shape?.Attr("style") ?? "";
            if (VmlLenPt(style, "width") is { } w) bullet.WidthPt = w;
            if (VmlLenPt(style, "height") is { } h) bullet.HeightPt = h;
            outp.PicBullets[id] = bullet;
        }
        foreach (var an in ChildElements(root, "w:abstractNum"))
        {
            double id = Js.ParseInt(an.Attr("w:abstractNumId") ?? "-1");
            var a = new AbstractNum { AbstractNumId = id };
            string? mlt = FirstChild(an, "w:multiLevelType")?.Attr("w:val");
            if (Js.Truthy(mlt)) a.MultiLevelType = mlt;
            string? sl = FirstChild(an, "w:styleLink")?.Attr("w:val");
            if (Js.Truthy(sl)) a.StyleLink = sl;
            string? nsl = FirstChild(an, "w:numStyleLink")?.Attr("w:val");
            if (Js.Truthy(nsl)) a.NumStyleLink = nsl;
            foreach (var lvl in ChildElements(an, "w:lvl"))
            {
                var l = ReadLevel(lvl);
                a.Levels[l.Ilvl] = l;
            }
            outp.AbstractNums[id] = a;
        }
        foreach (var num in ChildElements(root, "w:num"))
        {
            double numId = Js.ParseInt(num.Attr("w:numId") ?? "-1");
            double abs = Js.ParseInt(FirstChild(num, "w:abstractNumId")?.Attr("w:val") ?? "-1");
            var inst = new NumInstance { NumId = numId, AbstractNumId = abs };
            foreach (var ov in ChildElements(num, "w:lvlOverride"))
            {
                double ilvl = Js.IntOr0(ov.Attr("w:ilvl") ?? "0");
                var o = new LevelOverride();
                string? so = FirstChild(ov, "w:startOverride")?.Attr("w:val");
                if (so is not null) o.StartOverride = Js.ParseInt(so);
                var lvl = FirstChild(ov, "w:lvl");
                if (lvl is not null) o.Lvl = ReadLevel(lvl);
                inst.Overrides[ilvl] = o;
            }
            outp.Nums[numId] = inst;
        }
        return outp;
    }

    public static Theme ReadTheme(string? xml)
    {
        var theme = new Theme();
        if (string.IsNullOrEmpty(xml)) return theme;
        var root = Parse(xml);
        var fontScheme = Find(root, "a:fontScheme");
        foreach (var (key, tag) in new[] { ("major", "a:majorFont"), ("minor", "a:minorFont") })
        {
            var el = fontScheme is not null ? FirstChild(fontScheme, tag) : null;
            if (el is null) continue;
            var set = key == "major" ? theme.Major : theme.Minor;
            string? latin = FirstChild(el, "a:latin")?.Attr("typeface");
            if (Js.Truthy(latin)) set.Latin = latin;
            string? ea = FirstChild(el, "a:ea")?.Attr("typeface");
            if (Js.Truthy(ea)) set.Ea = ea;
            string? cs = FirstChild(el, "a:cs")?.Attr("typeface");
            if (Js.Truthy(cs)) set.Cs = cs;
            foreach (var f in ChildElements(el, "a:font"))
            {
                if (Js.Truthy(f.Attr("script")) && Js.Truthy(f.Attr("typeface"))) set.Scripts[f.Attr("script")!] = f.Attr("typeface")!;
            }
        }
        var lnList = Find(root, "a:lnStyleLst");
        if (lnList is not null) theme.LineWidthsPt = ChildElements(lnList, "a:ln").Select(l => Js.IntOr0(l.Attr("w") ?? "0") / 12700.0).ToList();
        // estilos de preenchimento/efeito (fillRef/effectRef dos Estilos de Forma)
        static ShapeStyle AsSpPr(IEnumerable<XmlElement> kids)
        {
            var sp = new XmlElement("a:spPr");
            sp.Children.AddRange(kids);
            return DrawingReader.ReadSpPr(sp);
        }
        var fills = Find(root, "a:fillStyleLst");
        if (fills is not null) theme.FillStyles = ChildElements(fills).Select(f => AsSpPr(new[] { f })).ToList();
        var bgFills = Find(root, "a:bgFillStyleLst");
        if (bgFills is not null) theme.BgFillStyles = ChildElements(bgFills).Select(f => AsSpPr(new[] { f })).ToList();
        var effects = Find(root, "a:effectStyleLst");
        if (effects is not null) theme.EffectStyles = ChildElements(effects, "a:effectStyle").Select(e => AsSpPr(ChildElements(e, "a:effectLst")).Shadow).ToList();
        var clr = Find(root, "a:clrScheme");
        if (clr is not null)
        {
            foreach (var c in ChildElements(clr))
            {
                string key = c.Name.StartsWith("a:", StringComparison.Ordinal) ? c.Name[2..] : c.Name;
                string? srgb = FirstChild(c, "a:srgbClr")?.Attr("val");
                var sys = FirstChild(c, "a:sysClr");
                string? v = srgb ?? sys?.Attr("lastClr") ?? (sys?.Attr("val") == "window" ? "FFFFFF" : sys?.Attr("val") == "windowText" ? "000000" : null);
                if (Js.Truthy(v)) theme.Colors[key] = Js.ToUpper(v!);
            }
        }
        return theme;
    }

    private static readonly HashSet<string> RootCompatFlags = new(StringComparer.Ordinal)
    {
        "w:doNotUseHTMLParagraphAutoSpacing", "w:doNotExpandShiftReturn", "w:ulTrailSpace", "w:spaceForUL",
        "w:balanceSingleByteDoubleByteWidth", "w:adjustLineHeightInTable", "w:doNotSuppressParagraphBorders",
        "w:noSpaceRaiseLower", "w:suppressSpBfAfterPgBrk", "w:suppressTopSpacing", "w:doNotUseIndentAsNumberingTabStop",
    };

    private static string StripW(string name) => name.StartsWith("w:", StringComparison.Ordinal) ? name[2..] : name;

    /// <summary>w:footnotePr / w:endnotePr → NoteProps (sem nada = null).</summary>
    public static NoteProps? ReadNoteProps(XmlElement? el)
    {
        if (el is null) return null;
        var o = new NoteProps();
        bool any = false;
        string? V(string n) => FirstChild(el, n)?.Attr("w:val");
        string? pos = V("w:pos");
        if (Js.Truthy(pos)) { o.Pos = pos; any = true; }
        string? fmt = V("w:numFmt");
        if (Js.Truthy(fmt)) { o.NumFmt = fmt; any = true; }
        double start = JsNumber.ParseInt(V("w:numStart") ?? "");
        if (double.IsFinite(start)) { o.NumStart = start; any = true; }
        string? rs = V("w:numRestart");
        if (rs is "continuous" or "eachSect" or "eachPage") { o.NumRestart = rs; any = true; }
        return any ? o : null;
    }

    public static Settings ReadSettings(string? xml)
    {
        var s = new Settings { CompatibilityMode = xml is not null && xml != "" ? 12 : 15 };
        if (string.IsNullOrEmpty(xml)) return s;
        var root = Parse(xml);
        bool On(string n) { var e = FirstChild(root, n); return e is not null && OoxmlProps.OnOffVal(e); }
        var dts = OoxmlProps.MeasureTwips(FirstChild(root, "w:defaultTabStop")?.Attr("w:val"));
        if (dts is not null && dts.Value > 0) s.DefaultTabStop = dts.Value;
        s.EvenAndOddHeaders = On("w:evenAndOddHeaders");
        s.MirrorMargins = On("w:mirrorMargins");
        s.AutoHyphenation = On("w:autoHyphenation");
        s.DoNotHyphenateCaps = On("w:doNotHyphenateCaps");
        s.DisplayBackgroundShape = On("w:displayBackgroundShape");
        s.UpdateFields = On("w:updateFields");
        if (On("w:bordersDoNotSurroundHeader")) s.BordersDoNotSurroundHeader = true;
        if (On("w:bordersDoNotSurroundFooter")) s.BordersDoNotSurroundFooter = true;
        var fnPr = ReadNoteProps(FirstChild(root, "w:footnotePr"));
        if (fnPr is not null) s.FootnotePr = fnPr;
        var enPr = ReadNoteProps(FirstChild(root, "w:endnotePr"));
        if (enPr is not null) s.EndnotePr = enPr;
        var hz = OoxmlProps.MeasureTwips(FirstChild(root, "w:hyphenationZone")?.Attr("w:val"));
        if (hz is not null) s.HyphenationZone = hz;
        string? chl = FirstChild(root, "w:consecutiveHyphenLimit")?.Attr("w:val");
        if (chl is not null) s.ConsecutiveHyphenLimit = Js.ParseInt(chl);
        string? csc = FirstChild(root, "w:characterSpacingControl")?.Attr("w:val");
        if (Js.Truthy(csc)) s.CharacterSpacingControl = csc;
        var tfl = FirstChild(root, "w:themeFontLang");
        if (tfl is not null)
        {
            s.ThemeFontLang = new LangSpec();
            if (Js.Truthy(tfl.Attr("w:val"))) s.ThemeFontLang.Val = tfl.Attr("w:val");
            if (Js.Truthy(tfl.Attr("w:eastAsia"))) s.ThemeFontLang.EastAsia = tfl.Attr("w:eastAsia");
            if (Js.Truthy(tfl.Attr("w:bidi"))) s.ThemeFontLang.Bidi = tfl.Attr("w:bidi");
        }
        // flags de compatibilidade soltas na raiz de w:settings: o Word as respeita
        // (medido: doNotUseHTMLParagraphAutoSpacing fora de w:compat vale)
        foreach (var c in ChildElements(root))
        {
            if (RootCompatFlags.Contains(c.Name)) s.Compat[StripW(c.Name)] = OoxmlProps.OnOffVal(c);
        }
        var compat = FirstChild(root, "w:compat");
        if (compat is not null)
        {
            // sem compatSetting: documento de versão antiga (o Word trata como modo 12)
            foreach (var c in ChildElements(compat))
            {
                if (c.Name == "w:compatSetting")
                {
                    if (c.Attr("w:name") == "compatibilityMode" && c.Attr("w:uri") == "http://schemas.microsoft.com/office/word")
                    {
                        double n = Js.ParseInt(c.Attr("w:val") ?? "");
                        if (double.IsFinite(n)) s.CompatibilityMode = n;
                    }
                    continue;
                }
                s.Compat[StripW(c.Name)] = OoxmlProps.OnOffVal(c);
            }
        }
        return s;
    }

    public static Dictionary<string, FontInfo> ReadFontTable(string? xml)
    {
        var outp = new Dictionary<string, FontInfo>(StringComparer.Ordinal);
        if (string.IsNullOrEmpty(xml)) return outp;
        var root = Parse(xml);
        foreach (var f in ChildElements(root, "w:font"))
        {
            string? name = f.Attr("w:name");
            if (!Js.Truthy(name)) continue;
            var info = new FontInfo { Name = name! };
            string? V(string n) => FirstChild(f, n)?.Attr("w:val");
            string? alt = V("w:altName");
            if (Js.Truthy(alt)) info.AltName = alt;
            string? pan = V("w:panose1");
            if (Js.Truthy(pan)) info.Panose1 = pan;
            string? cs = V("w:charset");
            if (Js.Truthy(cs)) info.Charset = cs;
            string? fam = V("w:family");
            if (Js.Truthy(fam)) info.Family = fam;
            string? pitch = V("w:pitch");
            if (Js.Truthy(pitch)) info.Pitch = pitch;
            var sig = FirstChild(f, "w:sig");
            if (sig is not null)
            {
                info.Sig = new Dictionary<string, string>(StringComparer.Ordinal);
                foreach (var kv in sig.Attrs) info.Sig[StripW(kv.Key)] = kv.Value;
            }
            outp[name!] = info;
        }
        return outp;
    }

    /// <summary>Caminho de uma parte pelo tipo de relacionamento do document.xml.</summary>
    private static string PartByRelType(DocxPackage pkg, string type, string fallback)
    {
        string? rels = pkg.GetPartText("word/_rels/document.xml.rels");
        if (rels is not null)
        {
            foreach (var rel in ChildElements(Parse(rels), "Relationship"))
            {
                if ((rel.Attr("Type") ?? "").EndsWith("/" + type, StringComparison.Ordinal) && Js.Truthy(rel.Attr("Target")) && rel.Attr("TargetMode") != "External")
                {
                    string t = rel.Attr("Target")!;
                    if (t.StartsWith("./", StringComparison.Ordinal)) t = t[2..];
                    return t.StartsWith('/') ? t[1..] : "word/" + t;
                }
            }
        }
        return fallback;
    }

    /// <summary>Imagens da parte de numeração (os marcadores de imagem): r:id → bytes e extensão.</summary>
    public static Dictionary<string, (byte[] Data, string Ext)> NumberingImages(DocxPackage pkg)
    {
        var outp = new Dictionary<string, (byte[], string)>(StringComparer.Ordinal);
        string part = PartByRelType(pkg, "numbering", "word/numbering.xml");
        int slash = part.LastIndexOf('/');
        string dir = part[..(slash + 1)];
        string? rels = pkg.GetPartText(dir + "_rels/" + part[(slash + 1)..] + ".rels");
        if (rels is null) return outp;
        foreach (var rel in ChildElements(Parse(rels), "Relationship"))
        {
            string? id = rel.Attr("Id"), target = rel.Attr("Target");
            if (!Js.Truthy(id) || !Js.Truthy(target) || rel.Attr("TargetMode") == "External" || !(rel.Attr("Type") ?? "").EndsWith("/image", StringComparison.Ordinal)) continue;
            // caminho relativo à pasta da parte ("media/x.png", "../media/x.png") ou absoluto
            var segs = (target!.StartsWith('/') ? target[1..] : dir + target).Split('/');
            var p = new List<string>();
            foreach (var g in segs) { if (g == "..") { if (p.Count > 0) p.RemoveAt(p.Count - 1); } else if (g.Length > 0 && g != ".") p.Add(g); }
            var data = pkg.GetPart(string.Join('/', p));
            if (data is null) continue;
            var em = Regex.Match(target, @"\.([a-z0-9]+)$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
            outp[id!] = (data, em.Success ? em.Groups[1].Value.ToLowerInvariant() : "png");
        }
        return outp;
    }

    public static DocFormatting ReadDocFormatting(DocxPackage pkg)
    {
        var numbering = ReadNumbering(pkg.GetPartText(PartByRelType(pkg, "numbering", "word/numbering.xml")));
        if (numbering.PicBullets.Count > 0)
        {
            var imgs = NumberingImages(pkg);
            foreach (var pb in numbering.PicBullets.Values)
                if (pb.Rid is not null && imgs.TryGetValue(pb.Rid, out var im)) { pb.ImageData = im.Data; pb.ImageExt = im.Ext; }
        }
        return ReadDocFormattingWith(pkg, numbering);
    }

    private static DocFormatting ReadDocFormattingWith(DocxPackage pkg, Numbering numbering) => new()
    {
        Styles = ReadStyleSheet(pkg.GetPartText(PartByRelType(pkg, "styles", "word/styles.xml"))),
        Numbering = numbering,
        Theme = ReadTheme(pkg.GetPartText(PartByRelType(pkg, "theme", "word/theme/theme1.xml"))),
        Settings = ReadSettings(pkg.GetPartText(PartByRelType(pkg, "settings", "word/settings.xml"))),
        FontTable = ReadFontTable(pkg.GetPartText(PartByRelType(pkg, "fontTable", "word/fontTable.xml"))),
    };
}

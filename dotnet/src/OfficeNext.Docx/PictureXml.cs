using System.Text.RegularExpressions;
using OfficeNext.Core;
using static OfficeNext.Core.MiniXml;

namespace OfficeNext.Docx;

// ───────────────────────── tipos da formatação ─────────────────────────

/// <summary>Cor DrawingML como gravada (srgbClr | schemeClr | prstClr | sysClr) com os
/// modificadores na ordem do arquivo (alpha incluso): [nome sem prefixo, val].</summary>
public sealed class DmlColor
{
    public string Kind = "srgbClr";
    public string Val = "000000";
    /// <summary>sysClr: última cor</summary>
    public string? LastClr;
    public List<(string Name, double Val)>? Mods;
}

/// <summary>a:ln de uma imagem (EMU, como no XML).</summary>
public sealed class PicLine
{
    /// <summary>espessura em EMU (ausente = 9525, a padrão do DrawingML)</summary>
    public double? W;
    public string? Cap;
    public string? Cmpd;
    public string? Algn;
    /// <summary>preenchimento sólido (null com <see cref="NoFill"/> = a:noFill; os dois nulos =
    /// sem preenchimento declarado)</summary>
    public DmlColor? Fill;
    public bool NoFill;
    /// <summary>gradiente/padrão do contorno (a:gradFill | a:pattFill): só o nome — o JS guarda o XML cru</summary>
    public string? FillRawName;
    public string? Dash;
    public string? Join;
    public double? MiterLim;
}

public sealed class PicShadow
{
    /// <summary>outer | inner | prst</summary>
    public string Kind = "outer";
    public double? BlurRad;
    public double? Dist;
    /// <summary>direção em 60000 avos de grau</summary>
    public double? Dir;
    public double? Sx, Sy, Kx, Ky;
    public string? Algn;
    public bool? RotWithShape;
    /// <summary>prstShdw: shdw1…shdw20</summary>
    public string? Prst;
    public DmlColor Color = new();
}

public sealed class PicReflection
{
    public double? BlurRad, StA, StPos, EndA, EndPos, Dist, Dir, FadeDir, Sx, Sy, Kx, Ky;
    public string? Algn;
    public bool? RotWithShape;
}

public sealed class PicGlow
{
    public double Rad;
    public DmlColor Color = new();
}

public sealed class PicEffects
{
    public PicShadow? Shadow;
    public PicReflection? Reflection;
    public PicGlow? Glow;
    public double? SoftEdge;
    /// <summary>a:blur / a:fillOverlay… (o JS preserva o XML cru; aqui só os nomes)</summary>
    public List<string>? OtherNames;
}

public sealed class PicRot3D
{
    public double Lat, Lon, Rev;
}

public sealed class PicBevel
{
    public double? W, H;
    public string? Prst;
}

public sealed class Pic3D
{
    public string? CameraPrst;
    public double? CameraFov, CameraZoom;
    public PicRot3D? CameraRot;
    public string? LightRig;
    public string? LightDir;
    public PicRot3D? LightRot;
    public PicBevel? BevelT, BevelB;
    public double? ExtrusionH, ContourW, Z;
    public string? PrstMaterial;
    public DmlColor? ExtrusionClr, ContourClr;
}

/// <summary>Office 2010 (a14:imgProps): a imagem do a:blip JÁ vem processada; o original
/// fica na camada (r:embed da a14:imgLayer, HD Photo).</summary>
public sealed class PicA14
{
    public string? LayerRid;
    public double? Saturation, ColorTemp, Sharpen, Bright, Contrast;
    /// <summary>efeitos artísticos / remoção de fundo (o JS preserva crus; aqui só os nomes)</summary>
    public List<string>? OtherNames;
}

/// <summary>Ajustes da imagem gravados no a:blip.</summary>
public sealed class PicBlipFx
{
    /// <summary>opacidade (a:alphaModFix amt, 0..100000)</summary>
    public double? AlphaModFix;
    public bool HasLum;
    public double? LumBright, LumContrast;
    public bool Grayscl;
    public double? BiLevel;
    public (DmlColor A, DmlColor B)? Duotone;
    public DmlColor? ClrChangeFrom, ClrChangeTo;
    public bool? ClrChangeUseA;
    public PicA14? A14;
}

/// <summary>Posição do wp:anchor (EMU; pct em milésimos de %).</summary>
public sealed class PicPos
{
    public string RelativeFrom = "column";
    public string? Align;
    public double? Offset;
    public double? Pct;
}

public sealed class PicDocPr
{
    public string? Id, Name, Descr, Title;
    public bool Hidden, Decorative;
}

/// <summary>
/// Formatação completa de uma imagem num w:drawing (EMU, como no XML) — porta da
/// leitura de docx-core/src/picture-xml.ts (readPictureFormat). A edição cirúrgica
/// do XML (patchPicture) é só do editor JS e não foi portada.
/// </summary>
public sealed class PictureFormat
{
    public bool Inline;
    /// <summary>inline | square | tight | through | topAndBottom | behind | front</summary>
    public string Wrap = "inline";
    /// <summary>bothSides | left | right | largest</summary>
    public string WrapText = "bothSides";
    public double DistT, DistB, DistL, DistR;
    public PicPos? PosH, PosV;
    public double Cx, Cy;
    public (string RelativeFrom, double Pct)? SizeRelH, SizeRelV;
    public double EffL, EffT, EffR, EffB;
    public bool Locked, LayoutInCell, AllowOverlap, BehindDoc;
    public double? RelativeHeight;
    /// <summary>polígono do contorno (21600 avos), Comprimido/Através</summary>
    public bool? PolygonEdited;
    public List<(double X, double Y)>? Polygon;
    public PicDocPr DocPr = new();
    public bool NoChangeAspect;
    public double Rot;
    public bool FlipH, FlipV;
    /// <summary>a:srcRect em milésimos de % (pode ser negativo: Ajustar)</summary>
    public double SrcL, SrcT, SrcR, SrcB;
    public string Geom = "rect";
    /// <summary>ajustes do a:prstGeom pelo nome (ordem do arquivo)</summary>
    public Dictionary<string, double>? Adj;
    public bool CustGeom;
    /// <summary>a:ln ausente = null</summary>
    public PicLine? Line;
    public PicEffects Effects = new();
    public Pic3D? ThreeD;
    public PicBlipFx Blip = new();
    /// <summary>r:embed do a:blip</summary>
    public string? Embed;
}

/// <summary>Leitura da formatação da imagem (pic:pic dentro de um w:drawing).</summary>
public static class PictureXml
{
    public const double EmuPerPt = 12700;

    private static readonly string[] ColorNames = { "a:srgbClr", "a:schemeClr", "a:prstClr", "a:sysClr", "a:scrgbClr", "a:hslClr" };
    private static readonly string[] WrapNames = { "wp:wrapNone", "wp:wrapSquare", "wp:wrapTight", "wp:wrapThrough", "wp:wrapTopAndBottom" };

    /// <summary>parseInt(v, 10) finito, senão <paramref name="d"/>.</summary>
    private static double Int(string? v, double d = 0)
    {
        if (v is null) return d;
        double n = Js.ParseInt(v);
        return double.IsFinite(n) ? n : d;
    }

    private static bool Bool(string? v, bool d = false) => v is null ? d : v is "1" or "true" or "on";

    private static double? OptInt(XmlElement el, string k) => el.Attr(k) is { } v ? Int(v) : null;

    private static DmlColor ColorOf(XmlElement c)
    {
        string kind = c.Name.Length > 2 ? c.Name[2..] : c.Name;
        if (kind is not ("srgbClr" or "schemeClr" or "prstClr" or "sysClr")) return new DmlColor { Kind = "srgbClr", Val = "000000" };
        var outp = new DmlColor { Kind = kind, Val = c.Attr("val") ?? "000000" };
        if (Js.Truthy(c.Attr("lastClr"))) outp.LastClr = c.Attr("lastClr");
        var mods = ChildElements(c).Select(m => (m.Name.Length > 2 ? m.Name[2..] : m.Name, Js.IntOr0(m.Attr("val") ?? "0"))).ToList();
        if (mods.Count > 0) outp.Mods = mods;
        return outp;
    }

    /// <summary>Primeira cor DrawingML filha de <paramref name="parent"/> (null se nenhuma).</summary>
    public static DmlColor? ReadDmlColor(XmlElement? parent)
    {
        if (parent is null) return null;
        var c = ChildElements(parent).FirstOrDefault(k => ColorNames.Contains(k.Name));
        return c is null ? null : ColorOf(c);
    }

    private static readonly Dictionary<string, string> PrstRgb = new(StringComparer.Ordinal)
    {
        ["black"] = "000000", ["white"] = "FFFFFF", ["red"] = "FF0000", ["green"] = "008000", ["blue"] = "0000FF", ["yellow"] = "FFFF00", ["gray"] = "808080",
    };
    private static readonly Dictionary<string, string> SchemeAlias = new(StringComparer.Ordinal)
    {
        ["tx1"] = "dk1", ["bg1"] = "lt1", ["tx2"] = "dk2", ["bg2"] = "lt2",
    };

    /// <summary>Cor no formato do motor de layout ("RRGGBB|mod=v,…" ou "@accent1|…") + alfa 0..1.</summary>
    public static (string Spec, double Alpha) DmlColorSpec(DmlColor c)
    {
        string head = c.Kind == "srgbClr" ? c.Val.ToUpperInvariant()
            : c.Kind == "schemeClr" ? "@" + (SchemeAlias.TryGetValue(c.Val, out var al) ? al : c.Val)
            : c.Kind == "prstClr" ? (PrstRgb.TryGetValue(c.Val, out var pr) ? pr : "000000")
            : c.LastClr ?? (c.Val == "window" ? "FFFFFF" : "000000");
        double alpha = 1;
        var mods = new List<string>();
        foreach (var (n, v) in c.Mods ?? new())
        {
            if (n == "alpha") alpha = v / 100000;
            else mods.Add($"{n}={Js.Str(v)}");
        }
        if (mods.Count > 0) head += "|" + string.Join(",", mods);
        return (head, alpha);
    }

    private static PicPos? ReadPos(XmlElement? el)
    {
        if (el is null) return null;
        var p = new PicPos { RelativeFrom = el.Attr("relativeFrom") ?? "column" };
        var al = FirstChild(el, "wp:align");
        if (al is not null) p.Align = TextContent(al).Trim();
        var off = FirstChild(el, "wp:posOffset");
        if (off is not null) p.Offset = Int(TextContent(off).Trim());
        var pct = FirstChild(el, "wp14:pctPosHOffset") ?? FirstChild(el, "wp14:pctPosVOffset");
        if (pct is not null) p.Pct = Int(TextContent(pct).Trim());
        return p;
    }

    /// <summary>a:ln de uma imagem (null = ausente).</summary>
    public static PicLine? ReadPicLine(XmlElement? ln)
    {
        if (ln is null) return null;
        var outp = new PicLine();
        if (ln.Attr("w") is { } w) outp.W = Int(w);
        if (Js.Truthy(ln.Attr("cap"))) outp.Cap = ln.Attr("cap");
        if (Js.Truthy(ln.Attr("cmpd"))) outp.Cmpd = ln.Attr("cmpd");
        if (Js.Truthy(ln.Attr("algn"))) outp.Algn = ln.Attr("algn");
        foreach (var k in ChildElements(ln))
        {
            switch (k.Name)
            {
                case "a:noFill": outp.Fill = null; outp.NoFill = true; break;
                case "a:solidFill":
                    outp.Fill = ReadDmlColor(k);
                    outp.NoFill = outp.Fill is null;
                    break;
                case "a:gradFill": case "a:pattFill": outp.FillRawName = k.Name; break;
                case "a:prstDash": outp.Dash = k.Attr("val") ?? "solid"; break;
                case "a:round": case "a:bevel": outp.Join = k.Name[2..]; break;
                case "a:miter":
                    outp.Join = "miter";
                    if (Js.Truthy(k.Attr("lim"))) outp.MiterLim = Int(k.Attr("lim"));
                    break;
            }
        }
        return outp;
    }

    private static PicShadow ReadShadow(XmlElement k)
    {
        string kind = k.Name == "a:outerShdw" ? "outer" : k.Name == "a:innerShdw" ? "inner" : "prst";
        var s = new PicShadow { Kind = kind, Color = ReadDmlColor(k) ?? new DmlColor() };
        s.BlurRad = OptInt(k, "blurRad");
        s.Dist = OptInt(k, "dist");
        s.Dir = OptInt(k, "dir");
        s.Sx = OptInt(k, "sx");
        s.Sy = OptInt(k, "sy");
        s.Kx = OptInt(k, "kx");
        s.Ky = OptInt(k, "ky");
        if (Js.Truthy(k.Attr("algn"))) s.Algn = k.Attr("algn");
        if (k.Attr("rotWithShape") is { } rws) s.RotWithShape = Bool(rws);
        if (Js.Truthy(k.Attr("prst"))) s.Prst = k.Attr("prst");
        return s;
    }

    private static PicEffects ReadEffects(XmlElement? el)
    {
        var fx = new PicEffects();
        if (el is null) return fx;
        foreach (var k in ChildElements(el))
        {
            switch (k.Name)
            {
                case "a:outerShdw": case "a:innerShdw": case "a:prstShdw": fx.Shadow = ReadShadow(k); break;
                case "a:glow": fx.Glow = new PicGlow { Rad = Int(k.Attr("rad")), Color = ReadDmlColor(k) ?? new DmlColor() }; break;
                case "a:softEdge": fx.SoftEdge = Int(k.Attr("rad")); break;
                case "a:reflection":
                    fx.Reflection = new PicReflection
                    {
                        BlurRad = OptInt(k, "blurRad"), StA = OptInt(k, "stA"), StPos = OptInt(k, "stPos"),
                        EndA = OptInt(k, "endA"), EndPos = OptInt(k, "endPos"), Dist = OptInt(k, "dist"),
                        Dir = OptInt(k, "dir"), FadeDir = OptInt(k, "fadeDir"), Sx = OptInt(k, "sx"),
                        Sy = OptInt(k, "sy"), Kx = OptInt(k, "kx"), Ky = OptInt(k, "ky"),
                        Algn = Js.Truthy(k.Attr("algn")) ? k.Attr("algn") : null,
                        RotWithShape = k.Attr("rotWithShape") is { } r ? Bool(r) : null,
                    };
                    break;
                default: (fx.OtherNames ??= new()).Add(k.Name); break;
            }
        }
        return fx;
    }

    private static PicRot3D? ReadRot(XmlElement? el) =>
        el is null ? null : new PicRot3D { Lat = Int(el.Attr("lat")), Lon = Int(el.Attr("lon")), Rev = Int(el.Attr("rev")) };

    private static Pic3D? Read3D(XmlElement? scene, XmlElement? sp3d)
    {
        if (scene is null && sp3d is null) return null;
        var t = new Pic3D();
        var cam = scene is not null ? FirstChild(scene, "a:camera") : null;
        if (cam is not null)
        {
            t.CameraPrst = cam.Attr("prst") ?? "orthographicFront";
            t.CameraFov = OptInt(cam, "fov");
            t.CameraZoom = OptInt(cam, "zoom");
            t.CameraRot = ReadRot(FirstChild(cam, "a:rot"));
        }
        var lr = scene is not null ? FirstChild(scene, "a:lightRig") : null;
        if (lr is not null)
        {
            t.LightRig = lr.Attr("rig") ?? "threePt";
            t.LightDir = lr.Attr("dir") ?? "t";
            t.LightRot = ReadRot(FirstChild(lr, "a:rot"));
        }
        if (sp3d is not null)
        {
            static PicBevel? Bv(XmlElement? b) => b is null ? null : new PicBevel
            {
                W = b.Attr("w") is { } w ? Int(w) : null,
                H = b.Attr("h") is { } h ? Int(h) : null,
                Prst = Js.Truthy(b.Attr("prst")) ? b.Attr("prst") : null,
            };
            t.BevelT = Bv(FirstChild(sp3d, "a:bevelT"));
            t.BevelB = Bv(FirstChild(sp3d, "a:bevelB"));
            t.ExtrusionH = OptInt(sp3d, "extrusionH");
            t.ContourW = OptInt(sp3d, "contourW");
            t.Z = OptInt(sp3d, "z");
            if (Js.Truthy(sp3d.Attr("prstMaterial"))) t.PrstMaterial = sp3d.Attr("prstMaterial");
            t.ExtrusionClr = ReadDmlColor(FirstChild(sp3d, "a:extrusionClr"));
            t.ContourClr = ReadDmlColor(FirstChild(sp3d, "a:contourClr"));
        }
        return t;
    }

    private static PicBlipFx ReadBlip(XmlElement? blip)
    {
        var fx = new PicBlipFx();
        if (blip is null) return fx;
        foreach (var k in ChildElements(blip))
        {
            switch (k.Name)
            {
                case "a:alphaModFix": fx.AlphaModFix = Int(k.Attr("amt"), 100000); break;
                case "a:lum":
                    fx.HasLum = true;
                    fx.LumBright = OptInt(k, "bright");
                    fx.LumContrast = OptInt(k, "contrast");
                    break;
                case "a:grayscl": fx.Grayscl = true; break;
                case "a:biLevel": fx.BiLevel = Int(k.Attr("thresh"), 50000); break;
                case "a:duotone":
                    {
                        var cs = ChildElements(k).Where(c => ColorNames.Contains(c.Name)).ToList();
                        DmlColor Wrap(int i) => i < cs.Count ? ColorOf(cs[i]) : new DmlColor();
                        fx.Duotone = (Wrap(0), Wrap(1));
                        break;
                    }
                case "a:clrChange":
                    fx.ClrChangeFrom = ReadDmlColor(FirstChild(k, "a:clrFrom")) ?? new DmlColor { Val = "FFFFFF" };
                    fx.ClrChangeTo = ReadDmlColor(FirstChild(k, "a:clrTo")) ?? new DmlColor { Val = "FFFFFF" };
                    if (k.Attr("useA") is { } ua) fx.ClrChangeUseA = Bool(ua);
                    break;
                case "a:extLst":
                    {
                        var props = DrawingReader.FindDeep(k, "a14:imgProps");
                        var layer = props is not null ? FirstChild(props, "a14:imgLayer") : null;
                        if (layer is null) break;
                        var a14 = new PicA14();
                        if (Js.Truthy(layer.Attr("r:embed"))) a14.LayerRid = layer.Attr("r:embed");
                        foreach (var ie in ChildElements(layer, "a14:imgEffect"))
                        {
                            foreach (var e in ChildElements(ie))
                            {
                                switch (e.Name)
                                {
                                    case "a14:saturation": a14.Saturation = Int(e.Attr("sat"), 100000); break;
                                    case "a14:colorTemperature": a14.ColorTemp = Int(e.Attr("colorTemp"), 6500); break;
                                    case "a14:sharpenSoften": a14.Sharpen = Int(e.Attr("amount")); break;
                                    case "a14:brightnessContrast": a14.Bright = Int(e.Attr("bright")); a14.Contrast = Int(e.Attr("contrast")); break;
                                    default: (a14.OtherNames ??= new()).Add(e.Name); break;
                                }
                            }
                        }
                        fx.A14 = a14;
                        break;
                    }
            }
        }
        return fx;
    }

    private static readonly Regex AdjVal = new(@"^val\s+(-?[0-9]+)", RegexOptions.CultureInvariant);

    /// <summary>Formatação da imagem de um w:drawing (null se não for imagem).</summary>
    public static PictureFormat? ReadPictureFormat(XmlElement drawing)
    {
        var c = FirstChild(drawing, "wp:anchor") ?? FirstChild(drawing, "wp:inline");
        if (c is null) return null;
        var gd = DrawingReader.FindDeep(c, "a:graphicData");
        var pic = gd is not null ? FirstChild(gd, "pic:pic") : null;
        if (pic is null) return null;
        var spPr = FirstChild(pic, "pic:spPr");
        var blipFill = FirstChild(pic, "pic:blipFill");
        var blip = blipFill is not null ? FirstChild(blipFill, "a:blip") : null;

        bool inline = c.Name == "wp:inline";
        var ext = FirstChild(c, "wp:extent");
        var ee = FirstChild(c, "wp:effectExtent");
        var docPr = FirstChild(c, "wp:docPr");
        var wrapEl = inline ? null : ChildElements(c).FirstOrDefault(k => WrapNames.Contains(k.Name));
        bool behindDoc = Bool(c.Attr("behindDoc"));
        string wrap = "inline";
        if (!inline)
        {
            string n = wrapEl?.Name ?? "wp:wrapNone";
            wrap = n == "wp:wrapSquare" ? "square" : n == "wp:wrapTight" ? "tight" : n == "wp:wrapThrough" ? "through"
                : n == "wp:wrapTopAndBottom" ? "topAndBottom" : behindDoc ? "behind" : "front";
        }
        var poly = wrapEl is not null ? FirstChild(wrapEl, "wp:wrapPolygon") : null;
        (string, double)? SizeRel(string n, string k)
        {
            var el = FirstChild(c, n);
            if (el is null) return null;
            var v = FirstChild(el, k);
            return (el.Attr("relativeFrom") ?? "page", v is not null ? Int(TextContent(v).Trim()) : 0);
        }
        var xfrm = spPr is not null ? FirstChild(spPr, "a:xfrm") : null;
        var prst = spPr is not null ? FirstChild(spPr, "a:prstGeom") : null;
        var adj = new Dictionary<string, double>(StringComparer.Ordinal);
        var av = prst is not null ? FirstChild(prst, "a:avLst") : null;
        if (av is not null)
        {
            foreach (var g in ChildElements(av, "a:gd"))
            {
                var m = AdjVal.Match(g.Attr("fmla") ?? "");
                if (m.Success && Js.Truthy(g.Attr("name"))) adj[g.Attr("name")!] = Js.ParseInt(m.Groups[1].Value);
            }
        }
        var src = blipFill is not null ? FirstChild(blipFill, "a:srcRect") : null;
        var decor = docPr is not null ? DrawingReader.FindDeep(docPr, "adec:decorative") : null;
        var locks = DrawingReader.FindDeep(c, "a:graphicFrameLocks");
        var custGeom = spPr is not null ? FirstChild(spPr, "a:custGeom") : null;
        var outp = new PictureFormat
        {
            Inline = inline,
            Wrap = wrap,
            WrapText = wrapEl?.Attr("wrapText") ?? "bothSides",
            DistT = Int(c.Attr("distT")), DistB = Int(c.Attr("distB")), DistL = Int(c.Attr("distL")), DistR = Int(c.Attr("distR")),
            Cx = Int(ext?.Attr("cx")), Cy = Int(ext?.Attr("cy")),
            EffL = Int(ee?.Attr("l")), EffT = Int(ee?.Attr("t")), EffR = Int(ee?.Attr("r")), EffB = Int(ee?.Attr("b")),
            Locked = Bool(c.Attr("locked")), LayoutInCell = Bool(c.Attr("layoutInCell"), true), AllowOverlap = Bool(c.Attr("allowOverlap"), true),
            BehindDoc = behindDoc,
            DocPr = new PicDocPr
            {
                Id = Js.Truthy(docPr?.Attr("id")) ? docPr!.Attr("id") : null,
                Name = docPr?.Attr("name"),
                Descr = docPr?.Attr("descr"),
                Title = docPr?.Attr("title"),
                Hidden = Bool(docPr?.Attr("hidden")),
                Decorative = decor is not null && Bool(decor.Attr("val"), true),
            },
            NoChangeAspect = Bool(locks?.Attr("noChangeAspect")),
            Rot = Int(xfrm?.Attr("rot")), FlipH = Bool(xfrm?.Attr("flipH")), FlipV = Bool(xfrm?.Attr("flipV")),
            SrcL = Int(src?.Attr("l")), SrcT = Int(src?.Attr("t")), SrcR = Int(src?.Attr("r")), SrcB = Int(src?.Attr("b")),
            Geom = prst?.Attr("prst") ?? (custGeom is not null ? "custom" : "rect"),
            Effects = ReadEffects(spPr is not null ? FirstChild(spPr, "a:effectLst") : null),
            Blip = ReadBlip(blip),
        };
        if (!inline)
        {
            outp.PosH = ReadPos(DrawingReader.AnchorChild(c, "wp:positionH"));
            outp.PosV = ReadPos(DrawingReader.AnchorChild(c, "wp:positionV"));
            if (c.Attr("relativeHeight") is { } rh) outp.RelativeHeight = Int(rh);
            outp.SizeRelH = SizeRel("wp14:sizeRelH", "wp14:pctWidth");
            outp.SizeRelV = SizeRel("wp14:sizeRelV", "wp14:pctHeight");
        }
        if (poly is not null)
        {
            outp.PolygonEdited = Bool(poly.Attr("edited"));
            outp.Polygon = ChildElements(poly).Select(pt => (Int(pt.Attr("x")), Int(pt.Attr("y")))).ToList();
        }
        if (adj.Count > 0) outp.Adj = adj;
        if (custGeom is not null) outp.CustGeom = true;
        outp.Line = ReadPicLine(spPr is not null ? FirstChild(spPr, "a:ln") : null);
        outp.ThreeD = Read3D(spPr is not null ? FirstChild(spPr, "a:scene3d") : null, spPr is not null ? FirstChild(spPr, "a:sp3d") : null);
        if (Js.Truthy(blip?.Attr("r:embed"))) outp.Embed = blip!.Attr("r:embed");
        return outp;
    }
}

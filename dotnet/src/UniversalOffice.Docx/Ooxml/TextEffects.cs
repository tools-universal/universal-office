using UniversalOffice.Core;
using static UniversalOffice.Core.MiniXml;

namespace UniversalOffice.Docx;

/// <summary>Cor DrawingML do w14: RGB ou do tema, com os modificadores na ordem gravada
/// (alpha, lumMod, lumOff, tint, shade, satMod… em milésimos de %).</summary>
public sealed class FxColor
{
    public string? Rgb;
    public string? Scheme;
    public List<(string K, double V)>? Mods;
}

public sealed class FxGradStop
{
    /// <summary>0–100000</summary>
    public double Pos;
    public FxColor Color = new();
}

/// <summary>Retângulo de preenchimento do w14:path (1000 avos de %).</summary>
public sealed class FxPath
{
    /// <summary>circle | rect | shape</summary>
    public string Kind = "circle";
    public double L, T, R, B;
}

/// <summary>Preenchimento w14 (texto ou contorno): none | solid | grad.</summary>
public sealed class FxFill
{
    public string Type = "solid";
    public FxColor? Color;
    public List<FxGradStop> Stops = new();
    /// <summary>linear: ângulo em 60000 avos de grau; scaled</summary>
    public (double Ang, bool Scaled)? Lin;
    public FxPath? Path;
}

public sealed class FxOutline
{
    /// <summary>largura em EMU</summary>
    public double? W;
    public string? Cap;
    public string? Cmpd;
    public string? Algn;
    public FxFill? Fill;
    /// <summary>w14:prstDash (solid, dash, sysDot…)</summary>
    public string? Dash;
    public string? Join;
    public double? MiterLim;
}

public sealed class FxShadow
{
    /// <summary>EMU</summary>
    public double BlurRad, Dist;
    /// <summary>60000 avos de grau, horário a partir do leste</summary>
    public double Dir;
    /// <summary>escalas e inclinações (1000 avos de %, 60000 avos de grau)</summary>
    public double Sx = 100000, Sy = 100000, Kx, Ky;
    public string Algn = "b";
    public FxColor Color = new();
}

public sealed class FxReflection
{
    public double BlurRad;
    /// <summary>alfas e posições em 1000 avos de %</summary>
    public double StA = 100000, StPos, EndA, EndPos = 100000;
    public double Dist, Dir, FadeDir = 5400000;
    public double Sx = 100000, Sy = 100000, Kx, Ky;
    public string Algn = "b";
}

public sealed class FxGlow
{
    /// <summary>raio em EMU</summary>
    public double Rad;
    public FxColor Color = new();
}

/// <summary>Efeitos de texto w14 de um run (porta de docx-core/src/text-effects.ts; o 3D é
/// só preservado no editor e desenhado plano — aqui não entra).</summary>
public sealed class TextEffects
{
    public FxFill? Fill;
    public FxOutline? Outline;
    public FxShadow? Shadow;
    public FxReflection? Reflection;
    public FxGlow? Glow;

    /// <summary>{ ...this, ...over } por efeito (cada w14 é uma propriedade da cascata).</summary>
    public TextEffects With(TextEffects over) => new()
    {
        Fill = over.Fill ?? Fill,
        Outline = over.Outline ?? Outline,
        Shadow = over.Shadow ?? Shadow,
        Reflection = over.Reflection ?? Reflection,
        Glow = over.Glow ?? Glow,
    };
}

/// <summary>Tipografia OpenType w14 de um run.</summary>
public sealed class OpenTypeProps
{
    /// <summary>w14:ligatures: none, standard, contextual, historical, discretional, combinações ou all</summary>
    public string? Ligatures;
    /// <summary>default | lining | oldStyle</summary>
    public string? NumForm;
    /// <summary>default | proportional | tabular</summary>
    public string? NumSpacing;
    /// <summary>conjuntos estilísticos ligados (1–20)</summary>
    public List<int>? StylisticSets;
    public bool? CntxtAlts;

    public OpenTypeProps With(OpenTypeProps over) => new()
    {
        Ligatures = over.Ligatures ?? Ligatures,
        NumForm = over.NumForm ?? NumForm,
        NumSpacing = over.NumSpacing ?? NumSpacing,
        StylisticSets = over.StylisticSets ?? StylisticSets,
        CntxtAlts = over.CntxtAlts ?? CntxtAlts,
    };

    /// <summary>Chave estável (agrupa runs que ligam/trocam glifos entre si).</summary>
    public string Key() => $"{Ligatures}|{NumForm}|{NumSpacing}|{(StylisticSets is null ? "" : string.Join(",", StylisticSets))}|{(CntxtAlts is null ? "" : CntxtAlts.Value ? "1" : "0")}";
}

/// <summary>Leitura dos efeitos e da tipografia w14 de um w:rPr (ordem do esquema w14,
/// a mesma que o Word grava — write/tools/home-lab exp-effects.ps1).</summary>
public static class TextEffectsReader
{
    private static string? W14(XmlElement a, string k) => a.Attr("w14:" + k);

    private static double Num(string? v, double d = 0)
    {
        if (v is null) return d;
        double n = Js.ParseInt(v);
        return double.IsNaN(n) ? d : n;
    }

    private static FxColor? ReadColor(XmlElement? el)
    {
        var c = el is null ? null : FirstChild(el, "w14:srgbClr") ?? FirstChild(el, "w14:schemeClr");
        if (c is null) return null;
        var outp = c.Name == "w14:srgbClr" ? new FxColor { Rgb = Js.ToUpper(W14(c, "val") ?? "000000") } : new FxColor { Scheme = W14(c, "val") ?? "tx1" };
        var mods = ChildElements(c).Select(m => (m.Name[4..], Num(W14(m, "val")))).ToList();
        if (mods.Count > 0) outp.Mods = mods;
        return outp;
    }

    private static FxFill? ReadFill(XmlElement? el)
    {
        if (el is null) return null;
        if (FirstChild(el, "w14:noFill") is not null) return new FxFill { Type = "none" };
        var solid = FirstChild(el, "w14:solidFill");
        if (solid is not null) { var color = ReadColor(solid); return color is not null ? new FxFill { Type = "solid", Color = color } : null; }
        var g = FirstChild(el, "w14:gradFill");
        if (g is null) return null;
        var f = new FxFill { Type = "grad" };
        foreach (var s in ChildElements(FirstChild(g, "w14:gsLst") ?? g, "w14:gs"))
        {
            var color = ReadColor(s);
            if (color is not null) f.Stops.Add(new FxGradStop { Pos = Num(W14(s, "pos")), Color = color });
        }
        var lin = FirstChild(g, "w14:lin");
        if (lin is not null) f.Lin = (Num(W14(lin, "ang")), W14(lin, "scaled") is "1" or "true");
        var path = FirstChild(g, "w14:path");
        if (path is not null)
        {
            var fr = FirstChild(path, "w14:fillToRect");
            f.Path = new FxPath
            {
                Kind = W14(path, "path") ?? "circle",
                L = Num(fr is null ? null : W14(fr, "l")), T = Num(fr is null ? null : W14(fr, "t")),
                R = Num(fr is null ? null : W14(fr, "r")), B = Num(fr is null ? null : W14(fr, "b")),
            };
        }
        return f;
    }

    /// <summary>Os efeitos e a tipografia w14 de um w:rPr (nulos se não houver).</summary>
    public static (TextEffects? Fx, OpenTypeProps? Ot) Read(XmlElement rPr)
    {
        var fx = new TextEffects();
        var ot = new OpenTypeProps();
        bool anyFx = false, anyOt = false;
        foreach (var el in ChildElements(rPr))
        {
            switch (el.Name)
            {
                case "w14:glow":
                    {
                        var color = ReadColor(el);
                        if (color is not null) { fx.Glow = new FxGlow { Rad = Num(W14(el, "rad")), Color = color }; anyFx = true; }
                        break;
                    }
                case "w14:shadow":
                    {
                        var color = ReadColor(el);
                        if (color is not null)
                        {
                            fx.Shadow = new FxShadow
                            {
                                BlurRad = Num(W14(el, "blurRad")), Dist = Num(W14(el, "dist")), Dir = Num(W14(el, "dir")),
                                Sx = Num(W14(el, "sx"), 100000), Sy = Num(W14(el, "sy"), 100000), Kx = Num(W14(el, "kx")), Ky = Num(W14(el, "ky")),
                                Algn = W14(el, "algn") ?? "b", Color = color,
                            };
                            anyFx = true;
                        }
                        break;
                    }
                case "w14:reflection":
                    fx.Reflection = new FxReflection
                    {
                        BlurRad = Num(W14(el, "blurRad")), StA = Num(W14(el, "stA"), 100000), StPos = Num(W14(el, "stPos")),
                        EndA = Num(W14(el, "endA")), EndPos = Num(W14(el, "endPos"), 100000),
                        Dist = Num(W14(el, "dist")), Dir = Num(W14(el, "dir")), FadeDir = Num(W14(el, "fadeDir"), 5400000),
                        Sx = Num(W14(el, "sx"), 100000), Sy = Num(W14(el, "sy"), 100000), Kx = Num(W14(el, "kx")), Ky = Num(W14(el, "ky")),
                        Algn = W14(el, "algn") ?? "b",
                    };
                    anyFx = true;
                    break;
                case "w14:textOutline":
                    {
                        var o = new FxOutline();
                        if (W14(el, "w") is not null) o.W = Num(W14(el, "w"));
                        if (Js.Truthy(W14(el, "cap"))) o.Cap = W14(el, "cap");
                        if (Js.Truthy(W14(el, "cmpd"))) o.Cmpd = W14(el, "cmpd");
                        if (Js.Truthy(W14(el, "algn"))) o.Algn = W14(el, "algn");
                        var f = ReadFill(el);
                        if (f is not null) o.Fill = f;
                        var d = FirstChild(el, "w14:prstDash");
                        if (d is not null) o.Dash = W14(d, "val") ?? "solid";
                        if (FirstChild(el, "w14:round") is not null) o.Join = "round";
                        else if (FirstChild(el, "w14:bevel") is not null) o.Join = "bevel";
                        else if (FirstChild(el, "w14:miter") is { } m) { o.Join = "miter"; if (Js.Truthy(W14(m, "lim"))) o.MiterLim = Num(W14(m, "lim")); }
                        fx.Outline = o;
                        anyFx = true;
                        break;
                    }
                case "w14:textFill":
                    {
                        var f = ReadFill(el);
                        if (f is not null) { fx.Fill = f; anyFx = true; }
                        break;
                    }
                case "w14:ligatures": ot.Ligatures = W14(el, "val") ?? "standard"; anyOt = true; break;
                case "w14:numForm": ot.NumForm = W14(el, "val") ?? "default"; anyOt = true; break;
                case "w14:numSpacing": ot.NumSpacing = W14(el, "val") ?? "default"; anyOt = true; break;
                case "w14:stylisticSets":
                    ot.StylisticSets = ChildElements(el, "w14:styleSet").Select(s => (int)Num(W14(s, "id"))).Where(n => n >= 1 && n <= 20).ToList();
                    anyOt = true;
                    break;
                case "w14:cntxtAlts": ot.CntxtAlts = W14(el, "val") is not ("0" or "false"); anyOt = true; break;
            }
        }
        return (anyFx ? fx : null, anyOt ? ot : null);
    }
}

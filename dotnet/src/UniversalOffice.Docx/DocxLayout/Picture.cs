using UniversalOffice.Docx;

namespace UniversalOffice.DocxLayout;

/// <summary>
/// Formato da Imagem no layout — porta de docx-layout/src/picture.ts: a aparência da
/// imagem além do bitmap (forma, contorno, sombra, brilho, bordas suaves, reflexo e
/// ajustes do a:blip) com as cores do tema já resolvidas; o pintor do PDF desenha a
/// partir disto (com os efeitos de UniversalOffice.DrawingML).
/// </summary>
public static class Picture
{
    private const double EmuPt = 12700;

    private static (string Color, double Alpha)? ColorOf(DmlColor? c, Theme theme)
    {
        if (c is null) return null;
        var (spec, alpha) = PictureXml.DmlColorSpec(c);
        string? hex = Resolve.ResolveDrawingColor(spec, theme);
        return string.IsNullOrEmpty(hex) ? null : (hex, alpha);
    }

    private static bool Nz(double? v) => v is { } x && x != 0 && !double.IsNaN(x);

    /// <summary>Aparência da imagem (null = só o bitmap, como antes).</summary>
    public static PictureLook? PictureLookOf(InlineImage im, Theme theme)
    {
        var f = im.Format;
        if (f is null) return null;
        var outp = new PictureLook();
        bool any = false;
        if (!string.IsNullOrEmpty(f.Geom) && f.Geom != "rect" && f.Geom != "custom")
        {
            outp.Geom = new PicGeomLook { Prst = f.Geom, Adj = f.Adj };
            any = true;
        }
        var ln = f.Line;
        if (ln?.Fill is not null && ColorOf(ln.Fill, theme) is { } lc)
        {
            outp.Line = new PicLineLook
            {
                Color = lc.Color, Alpha = lc.Alpha, WidthPt = (ln.W ?? 9525) / EmuPt,
                Dash = !string.IsNullOrEmpty(ln.Dash) && ln.Dash != "solid" ? ln.Dash : null,
                Cmpd = !string.IsNullOrEmpty(ln.Cmpd) && ln.Cmpd != "sng" ? ln.Cmpd : null,
                Cap = string.IsNullOrEmpty(ln.Cap) ? null : ln.Cap,
                Join = string.IsNullOrEmpty(ln.Join) ? null : ln.Join,
            };
            any = true;
        }
        var fx = f.Effects;
        var s = fx.Shadow;
        if (s is not null && s.Kind is "outer" or "inner" && ColorOf(s.Color, theme) is { } sc)
        {
            outp.Shadow = new PicShadowLook
            {
                Kind = s.Kind, Color = sc.Color, Alpha = sc.Alpha,
                BlurPt = (s.BlurRad ?? 0) / EmuPt, DistPt = (s.Dist ?? 0) / EmuPt, DirDeg = (s.Dir ?? 0) / 60000,
                Sx = s.Sx is { } sx ? sx / 100000 : null, Sy = s.Sy is { } sy ? sy / 100000 : null,
                KxDeg = Nz(s.Kx) ? s.Kx!.Value / 60000 : null, KyDeg = Nz(s.Ky) ? s.Ky!.Value / 60000 : null,
                Algn = string.IsNullOrEmpty(s.Algn) ? null : s.Algn, RotWithShape = s.RotWithShape,
            };
            any = true;
        }
        if (fx.Glow is not null && ColorOf(fx.Glow.Color, theme) is { } gc)
        {
            outp.Glow = new PicGlowLook { Color = gc.Color, Alpha = gc.Alpha, RadPt = fx.Glow.Rad / EmuPt };
            any = true;
        }
        if (Nz(fx.SoftEdge)) { outp.SoftEdgePt = fx.SoftEdge!.Value / EmuPt; any = true; }
        // chanfro (câmera de frente; a rotação 3D/perspectiva não é desenhada)
        var td = f.ThreeD;
        if (td?.BevelT is { } bt && (td.CameraPrst is null || td.CameraPrst == "orthographicFront") && td.CameraRot is null)
        {
            outp.Bevel = new PicBevelLook
            {
                WPt = (bt.W ?? 76200) / EmuPt, HPt = (bt.H ?? 76200) / EmuPt,
                Prst = string.IsNullOrEmpty(bt.Prst) ? null : bt.Prst,
                Rig = td.LightRig, Dir = td.LightRig is not null ? td.LightDir : null,
                Material = string.IsNullOrEmpty(td.PrstMaterial) ? null : td.PrstMaterial,
            };
            any = true;
        }
        var r = fx.Reflection;
        if (r is not null)
        {
            outp.Reflection = new PicReflectionLook
            {
                BlurPt = (r.BlurRad ?? 0) / EmuPt, StA = (r.StA ?? 100000) / 100000, StPos = (r.StPos ?? 0) / 100000,
                EndA = (r.EndA ?? 0) / 100000, EndPos = (r.EndPos ?? 100000) / 100000,
                DistPt = (r.Dist ?? 0) / EmuPt, DirDeg = (r.Dir ?? 5400000) / 60000, Sy = (r.Sy ?? 100000) / 100000,
                Algn = string.IsNullOrEmpty(r.Algn) ? null : r.Algn, RotWithShape = r.RotWithShape,
            };
            any = true;
        }
        if (BlipLook(f.Blip, theme, outp)) any = true;
        return any ? outp : null;
    }

    /// <summary>A parte do a:blip da aparência: transparência, tom duplo e cor transparente.</summary>
    private static bool BlipLook(PicBlipFx b, Theme theme, PictureLook outp)
    {
        bool any = false;
        if (b.AlphaModFix is { } am && am < 100000) { outp.Alpha = am / 100000; any = true; }
        if (b.Duotone is { } d && ColorOf(d.A, theme) is { } c0 && ColorOf(d.B, theme) is { } c1)
        {
            outp.Duotone = (c0.Color, c1.Color);
            any = true;
        }
        if (b.ClrChangeFrom is not null && b.ClrChangeTo is not null
            && ColorOf(b.ClrChangeFrom, theme) is { } from && ColorOf(b.ClrChangeTo, theme) is { } to)
        {
            outp.ClrChange = new PicClrChangeLook { From = from.Color, To = to.Color, ToAlpha = to.Alpha };
            any = true;
        }
        return any;
    }
}

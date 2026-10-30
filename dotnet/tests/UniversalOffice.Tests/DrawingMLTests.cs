using UniversalOffice.Core;
using UniversalOffice.Docx;
using UniversalOffice.DocxLayout;
using UniversalOffice.DrawingML;
using Xunit;

namespace UniversalOffice.Tests;

/// <summary>
/// UniversalOffice.DrawingML (porta de shared/drawingml) e o Formato da Imagem no layout:
/// intérprete das formas oficiais, contorno, rasterização, efeitos e a leitura/resolução
/// da aparência da imagem — espelho de preset-engine.test.ts e dos usos de
/// picture.ts/pdf-picture.ts (entradas sintéticas mínimas).
/// </summary>
public class DrawingMLTests
{
    private static List<(double X, double Y)> Points(IEnumerable<IReadOnlyList<PathSeg>> subs)
    {
        var outp = new List<(double, double)>();
        foreach (var s in subs)
            foreach (var g in s)
            {
                if (g.C is 'M' or 'L') outp.Add((g.X, g.Y));
                else if (g.C == 'C') { outp.Add((g.X1, g.Y1)); outp.Add((g.X2, g.Y2)); outp.Add((g.X, g.Y)); }
                else if (g.C == 'Q') { outp.Add((g.X1, g.Y1)); outp.Add((g.X, g.Y)); }
            }
        return outp;
    }

    // ── formas predefinidas (preset-defs.ts embutido) ──

    [Fact]
    public void PresetDefs_TodasAsDefinicoesAvaliamParaCoordenadasFinitas()
    {
        var names = PresetEngine.Names.ToList();
        Assert.Equal(187, names.Count); // as 187 do presetShapeDefinitions.xml
        var bad = new List<string>();
        foreach (var name in names)
        {
            var g = PresetEngine.EvalPreset(name, 200, 100);
            if (g is null) { bad.Add($"{name}: null"); continue; }
            foreach (var (x, y) in Points(g.Subs))
            {
                // callouts apontam para fora da caixa (até ~1,2×); nada além de 3× é plausível
                if (!double.IsFinite(x) || !double.IsFinite(y) || x < -400 || x > 600 || y < -300 || y > 400) { bad.Add($"{name}: ({x}, {y})"); break; }
            }
        }
        Assert.Empty(bad);
    }

    [Fact]
    public void PresetDefs_EspacoDuploNaoDeslocaArgumentos()
    {
        foreach (var name in new[] { "pentagon", "heptagon", "star5", "star7" })
        {
            var p = Points(PresetEngine.EvalPreset(name, 100, 100)!.Subs);
            Assert.True(p.Min(q => q.Y) >= -0.5 && p.Max(q => q.Y) <= 100.5, name);
            Assert.True(p.Min(q => q.X) >= -0.5 && p.Max(q => q.X) <= 100.5, name);
        }
    }

    [Fact]
    public void PresetDefs_AjustePorNome()
    {
        var a = Points(PresetEngine.EvalPreset("rightArrow", 200, 100, new[] { 80000.0 }, new[] { "adj2" })!.Subs);
        var b = Points(PresetEngine.EvalPreset("rightArrow", 200, 100, new[] { 80000.0 }, new[] { "adj1" })!.Subs);
        Assert.NotEqual(a, b);
    }

    [Fact]
    public void Outline_ElipseOficial_PontosNaElipse()
    {
        var o = PresetOutline.Of("ellipse", 200, 100);
        Assert.Single(o.Subs);
        Assert.True(o.Fill[0]);
        var polys = Raster.FlattenPath(o.Subs, 0.2);
        Assert.Single(polys);
        var p = polys[0];
        double minX = double.MaxValue, maxX = double.MinValue, minY = double.MaxValue, maxY = double.MinValue;
        for (int i = 0; i < p.Length; i += 2)
        {
            double x = p[i], y = p[i + 1];
            double e = (x - 100) * (x - 100) / (100 * 100) + (y - 50) * (y - 50) / (50 * 50);
            Assert.InRange(e, 0.999, 1.001);
            minX = Math.Min(minX, x); maxX = Math.Max(maxX, x); minY = Math.Min(minY, y); maxY = Math.Max(maxY, y);
        }
        Assert.InRange(minX, -0.01, 0.01); Assert.InRange(maxX, 199.99, 200.01);
        Assert.InRange(minY, -0.01, 0.01); Assert.InRange(maxY, 99.99, 100.01);
    }

    [Fact]
    public void Outline_RetanguloERecuoParaDesconhecida()
    {
        Assert.Equal(5, PresetOutline.Of("rect", 10, 20).Subs[0].Count);
        Assert.Equal(5, PresetOutline.Of("naoExiste", 10, 20).Subs[0].Count);
        // roundRect com ajuste pelo nome: cantos em arco
        var rr = PresetOutline.Of("roundRect", 100, 50, new Dictionary<string, double> { ["adj"] = 30000 });
        Assert.Contains(rr.Subs[0], s => s.C == 'E');
    }

    // ── rasterização ──

    [Fact]
    public void FillPolygons_RetanguloCobreAArea()
    {
        var m = Raster.FillPolygons(Raster.NewMask(10, 10), new List<double[]> { new double[] { 2, 2, 8, 2, 8, 6, 2, 6 } });
        double sum = m.A.Sum(v => (double)v);
        Assert.InRange(sum, 23.99, 24.01); // 6 × 4 px
        Assert.Equal(1f, m.A[3 * 10 + 3]);
        Assert.Equal(0f, m.A[0]);
    }

    [Fact]
    public void GaussianBlur_SimetricoEConservaAMassa()
    {
        var m = Raster.NewMask(41, 41);
        m.A[20 * 41 + 20] = 1;
        var b = Raster.GaussianBlur(m, 3);
        Assert.InRange(b.A.Sum(v => (double)v), 0.999, 1.001);
        for (int d = 1; d <= 9; d++)
        {
            Assert.Equal(b.A[20 * 41 + 20 + d], b.A[20 * 41 + 20 - d]);
            Assert.Equal(b.A[(20 + d) * 41 + 20], b.A[(20 - d) * 41 + 20]);
            Assert.Equal(b.A[20 * 41 + 20 + d], b.A[(20 + d) * 41 + 20], 6);
        }
        Assert.True(b.A[20 * 41 + 20] > b.A[20 * 41 + 21]);
    }

    [Fact]
    public void Morph_DilataEErode()
    {
        var sq = Raster.FillPolygons(Raster.NewMask(30, 30), new List<double[]> { new double[] { 10, 10, 20, 10, 20, 20, 10, 20 } });
        double area = sq.A.Sum(v => (double)v);
        var grown = Raster.Morph(sq, 3);
        var shrunk = Raster.Morph(sq, -3);
        Assert.True(grown.A.Sum(v => (double)v) > area + 100);
        Assert.InRange(shrunk.A.Sum(v => (double)v), 15, 30); // ~4×4 (+ meia unidade de transição)
        Assert.Equal(1f, grown.A[15 * 30 + 8]);
        Assert.Equal(0f, shrunk.A[15 * 30 + 11]);
    }

    [Fact]
    public void OuterShadow_DeslocadaNaDirecaoEDentroDosLimites()
    {
        // silhueta 20×20 px em (20,20); sombra a 10 pt × 1 px/pt para a direita (dir 0), sem desfoque
        var sil = Raster.FillPolygons(Raster.NewMask(80, 60), new List<double[]> { new double[] { 20, 20, 40, 20, 40, 40, 20, 40 } });
        var sh = Effects.OuterShadowMask(sil, new Box(20, 20, 20, 20), new ShadowSpec(0, 10, 0), 1);
        double sx = 0, sy = 0, n = 0;
        int minX = int.MaxValue, maxX = 0;
        for (int y = 0; y < 60; y++)
            for (int x = 0; x < 80; x++)
            {
                double a = sh.A[y * 80 + x];
                if (a <= 0.001) continue;
                sx += a * x; sy += a * y; n += a;
                minX = Math.Min(minX, x); maxX = Math.Max(maxX, x);
            }
        Assert.InRange(n, 399, 401);
        Assert.InRange(sx / n, 39.4, 39.6); // centróide 29,5 + 10
        Assert.InRange(sy / n, 29.4, 29.6);
        Assert.Equal(30, minX);
        Assert.Equal(49, maxX);
        // escala vertical negativa em volta da base (perspectiva): a sombra vai para baixo da forma
        var flip = Effects.OuterShadowMask(sil, new Box(20, 20, 20, 20), new ShadowSpec(0, 0, 0, Sy: -0.5, Algn: "b"), 1);
        for (int y = 0; y < 40; y++) Assert.Equal(0f, flip.A[y * 80 + 30]);
        Assert.True(flip.A[45 * 80 + 30] > 0.9f);
    }

    [Fact]
    public void ReflectionAlpha_DegradeLinear()
    {
        Assert.Equal(0.5, Effects.ReflectionAlpha(0, 0.5, 0, 0, 0.5));
        Assert.Equal(0.25, Effects.ReflectionAlpha(0.25, 0.5, 0, 0, 0.5), 9);
        Assert.Equal(0, Effects.ReflectionAlpha(0.75, 0.5, 0, 0, 0.5));
    }

    // ── luz 3D e chanfro (light3d.ts / bevel-word.ts embutidos) ──

    [Fact]
    public void Light3D_TabelasDoTsEmbutido()
    {
        var t = Light3D.LightTable("threePt", null)!;
        Assert.Equal(24 * 11 * 4 + 4, t.Length);
        Assert.Same(t, Light3D.LightTable("naoExiste", "warmMatte")); // rig desconhecido = threePt
        Assert.NotSame(t, Light3D.LightTable("threePt", "metal"));
        var face = new float[4];
        Light3D.LightFace(t, face);
        Assert.InRange(face[0], 0.5f, 2f);
        // perfil circular: na borda quase vertical, na face plano
        Assert.True(Light3D.BevelPhi("circle", 0.01, 1) > 80);
        Assert.InRange(Light3D.BevelPhi(null, 1, 1), -0.01, 0.01);
        Assert.Equal(45, Light3D.BevelPhi("angle", 0.5, 1), 9);
    }

    [Theory]
    // valores do shadeBevel do JS (shared/drawingml/dist) no mesmo quadrado cinza 40×40,
    // chanfro de 8 px: (20,1) topo, (20,38) base, (1,20) esquerda, (38,20) direita,
    // (20,20) face, (3,3) canto, (5,30)
    [InlineData(true, "circle", new[] { 141, 83, 108, 70, 139, 171, 136 })]
    [InlineData(true, "cross", new[] { 137, 137, 137, 137, 137, 128, 137 })]
    [InlineData(false, "circle", new[] { 141, 79, 104, 68, 138, 186, 141 })]
    [InlineData(false, "cross", new[] { 141, 79, 104, 68, 138, 186, 141 })]
    public void ShadeBevel_IgualAoJs(bool word, string prst, int[] expected)
    {
        const int S = 40;
        var sil = Raster.FillPolygons(Raster.NewMask(S, S), new List<double[]> { new double[] { 0, 0, S, 0, S, S, 0, S } });
        var px = new byte[S * S * 4];
        for (int i = 0; i < px.Length; i += 4) { px[i] = px[i + 1] = px[i + 2] = 128; px[i + 3] = 255; }
        Bevel.ShadeBevel(px, sil, new BevelSpec(8, 8, prst, Word: word));
        int At(int x, int y) => px[(y * S + x) * 4];
        Assert.Equal(expected, new[] { At(20, 1), At(20, 38), At(1, 20), At(38, 20), At(20, 20), At(3, 3), At(5, 30) });
    }

    [Fact]
    public void ShadeBevel_SemLarguraNaoMuda()
    {
        // sem largura: nada muda
        var p2 = new byte[] { 10, 20, 30, 255 };
        Bevel.ShadeBevel(p2, new Mask(1, 1, new[] { 1f }), new BevelSpec(0, 0));
        Assert.Equal(new byte[] { 10, 20, 30, 255 }, p2);
    }

    // ── Formato da Imagem: leitura e aparência ──

    private const string Drawing =
        "<w:drawing><wp:anchor distT=\"0\" distB=\"0\" distL=\"114300\" distR=\"114300\" simplePos=\"0\" relativeHeight=\"5\" behindDoc=\"0\" locked=\"0\" layoutInCell=\"1\" allowOverlap=\"1\">"
        + "<wp:simplePos x=\"0\" y=\"0\"/>"
        + "<mc:AlternateContent><mc:Choice Requires=\"wp14\"><wp:positionH relativeFrom=\"margin\"><wp14:pctPosHOffset>25000</wp14:pctPosHOffset></wp:positionH></mc:Choice>"
        + "<mc:Fallback><wp:positionH relativeFrom=\"page\"><wp:posOffset>1828800</wp:posOffset></wp:positionH></mc:Fallback></mc:AlternateContent>"
        + "<wp:positionV relativeFrom=\"paragraph\"><wp:posOffset>0</wp:posOffset></wp:positionV>"
        + "<wp:extent cx=\"1270000\" cy=\"952500\"/><wp:effectExtent l=\"0\" t=\"0\" r=\"0\" b=\"0\"/><wp:wrapSquare wrapText=\"bothSides\"/>"
        + "<wp:docPr id=\"7\" name=\"Imagem 7\" descr=\"teste\" hidden=\"1\"/>"
        + "<a:graphic><a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/picture\"><pic:pic><pic:nvPicPr><pic:cNvPr id=\"7\" name=\"\"/><pic:cNvPicPr/></pic:nvPicPr>"
        + "<pic:blipFill><a:blip r:embed=\"rId4\"><a:alphaModFix amt=\"60000\"/><a:duotone><a:prstClr val=\"black\"/><a:schemeClr val=\"accent1\"><a:tint val=\"45000\"/></a:schemeClr></a:duotone></a:blip><a:srcRect l=\"10000\"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>"
        + "<pic:spPr><a:xfrm rot=\"1800000\" flipH=\"1\"><a:off x=\"0\" y=\"0\"/><a:ext cx=\"1270000\" cy=\"952500\"/></a:xfrm><a:prstGeom prst=\"roundRect\"><a:avLst><a:gd name=\"adj\" fmla=\"val 30000\"/></a:avLst></a:prstGeom>"
        + "<a:ln w=\"25400\" cmpd=\"dbl\"><a:solidFill><a:schemeClr val=\"tx2\"/></a:solidFill><a:prstDash val=\"sysDash\"/></a:ln>"
        + "<a:effectLst><a:glow rad=\"63500\"><a:srgbClr val=\"FFC000\"><a:alpha val=\"60000\"/></a:srgbClr></a:glow>"
        + "<a:outerShdw blurRad=\"50800\" dist=\"38100\" dir=\"2700000\" sx=\"90000\" kx=\"-800400\" algn=\"bl\" rotWithShape=\"0\"><a:schemeClr val=\"accent1\"><a:lumMod val=\"75000\"/><a:alpha val=\"40000\"/></a:schemeClr></a:outerShdw>"
        + "<a:softEdge rad=\"31750\"/></a:effectLst></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing>";

    private static Theme TestTheme()
    {
        var t = new Theme();
        t.Colors["accent1"] = "4472C4";
        t.Colors["dk2"] = "44546A";
        return t;
    }

    [Fact]
    public void ReadPictureFormat_LeFormaContornoEfeitosEAjustes()
    {
        var f = PictureXml.ReadPictureFormat(MiniXml.Parse(Drawing))!;
        Assert.False(f.Inline);
        Assert.Equal("square", f.Wrap);
        Assert.Equal("roundRect", f.Geom);
        Assert.Equal(30000, f.Adj!["adj"]);
        Assert.Equal(1800000, f.Rot);
        Assert.True(f.FlipH);
        Assert.Equal(10000, f.SrcL);
        Assert.True(f.DocPr.Hidden);
        Assert.Equal("teste", f.DocPr.Descr);
        // posição em % dentro de mc:AlternateContent (Choice)
        Assert.Equal("margin", f.PosH!.RelativeFrom);
        Assert.Equal(25000, f.PosH.Pct);
        Assert.Equal(25400, f.Line!.W);
        Assert.Equal("dbl", f.Line.Cmpd);
        Assert.Equal("sysDash", f.Line.Dash);
        Assert.Equal("outer", f.Effects.Shadow!.Kind);
        Assert.Equal(-800400, f.Effects.Shadow.Kx);
        Assert.False(f.Effects.Shadow.RotWithShape);
        Assert.Equal(63500, f.Effects.Glow!.Rad);
        Assert.Equal(31750, f.Effects.SoftEdge);
        Assert.Equal(60000, f.Blip.AlphaModFix);
        Assert.Equal("prstClr", f.Blip.Duotone!.Value.A.Kind);
        Assert.Equal("rId4", f.Embed);
        // a âncora do motor também lê a posição de dentro do mc:AlternateContent
        var anchor = DrawingReader.ReadWpAnchor(MiniXml.FirstChild(MiniXml.Parse(Drawing), "wp:anchor"))!;
        Assert.Equal("margin", anchor.PosH.RelativeFrom);
        Assert.Equal(25000, anchor.PosH.Pct);
    }

    [Fact]
    public void PictureLookOf_ResolveCoresDoTema()
    {
        var theme = TestTheme();
        var im = new InlineImage { Format = PictureXml.ReadPictureFormat(MiniXml.Parse(Drawing)) };
        var look = Picture.PictureLookOf(im, theme)!;
        Assert.Equal("roundRect", look.Geom!.Prst);
        // sombra: schemeClr accent1 + lumMod pelo resolvedor do DrawingML; alfa à parte
        Assert.Equal(Resolve.ResolveDrawingColor("@accent1|lumMod=75000", theme), look.Shadow!.Color);
        Assert.NotEqual("4472C4", look.Shadow.Color);
        Assert.Equal(0.4, look.Shadow.Alpha, 9);
        Assert.Equal(4, look.Shadow.BlurPt, 9);
        Assert.Equal(3, look.Shadow.DistPt, 9);
        Assert.Equal(45, look.Shadow.DirDeg, 9);
        Assert.Equal(0.9, look.Shadow.Sx!.Value, 9);
        Assert.Null(look.Shadow.Sy);
        Assert.Equal(-13.34, look.Shadow.KxDeg!.Value, 9);
        Assert.False(look.Shadow.RotWithShape);
        // contorno: tx2 → dk2; 2 pt; tracejado e duplo
        Assert.Equal("44546A", look.Line!.Color);
        Assert.Equal(2, look.Line.WidthPt, 9);
        Assert.Equal("sysDash", look.Line.Dash);
        Assert.Equal("dbl", look.Line.Cmpd);
        Assert.Equal("FFC000", look.Glow!.Color);
        Assert.Equal(0.6, look.Glow.Alpha, 9);
        Assert.Equal(2.5, look.SoftEdgePt!.Value, 9);
        Assert.Equal(0.6, look.Alpha!.Value, 9);
        Assert.Equal("000000", look.Duotone!.Value.A);
        Assert.Equal(Resolve.ResolveDrawingColor("@accent1|tint=45000", theme), look.Duotone.Value.B);
        // sem formatação: só o bitmap
        Assert.Null(Picture.PictureLookOf(new InlineImage(), theme));
    }

    [Fact]
    public void PdfWriter_RecortePorCaminhoImagemPorMatrizEJpegComMascara()
    {
        var doc = new UniversalOffice.Pdf.PdfDocument(compress: false);
        var page = doc.AddPage(100, 100);
        var img = doc.EmbedJpeg(new byte[] { 0xFF, 0xD8, 0xFF, 0xD9 }, 2, 2, 3, false, null, (new byte[] { 0, 255, 255, 0 }, 2, 2));
        page.PushClipPath(new[] { UniversalOffice.Pdf.PathCmd.M(0, 0), UniversalOffice.Pdf.PathCmd.L(10, 0), UniversalOffice.Pdf.PathCmd.L(10, 10), UniversalOffice.Pdf.PathCmd.Z }, true);
        page.DrawImageMatrix(img, 10, 0, 0, 20, 5, 5);
        page.PopClip();
        string content = System.Text.Encoding.Latin1.GetString(page.Content.ToArray());
        // recorte par-ímpar (y a partir do topo → PDF) e a matriz do quadrado unitário
        Assert.Equal("q\n0 100 m\n10 100 l\n10 90 l\nh\nW* n\nq\n10 0 0 20 5 75 cm\n/Im0 Do\nQ\nQ\n", content);
        string pdf = System.Text.Encoding.Latin1.GetString(doc.Build());
        Assert.Contains("/Filter /DCTDecode /SMask ", pdf);
        Assert.Contains("/Width 2 /Height 2 /ColorSpace /DeviceGray /BitsPerComponent 8", pdf);
    }

    [Fact]
    public void ApplyPictureAdjust_CorTransparenteTomDuploEAlfa()
    {
        var d = new byte[] { 40, 160, 60, 255, 255, 255, 255, 255 };
        Images.ApplyPictureAdjust(d, 0.5, null, new PicClrChangeLook { From = "28A03C", To = "28A03C", ToAlpha = 0 });
        Assert.Equal(0, d[3]);   // a cor exata vira transparente
        Assert.Equal(128, d[7]); // alfa 50% (Math.round de 127,5)
        var g = new byte[] { 255, 255, 255, 255 };
        Images.ApplyPictureAdjust(g, null, ("000000", "4472C4"), null);
        Assert.Equal(new byte[] { 0x44, 0x72, 0xC4, 255 }, g);
    }
}

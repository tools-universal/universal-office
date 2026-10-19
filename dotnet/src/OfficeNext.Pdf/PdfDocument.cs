using System.Globalization;

namespace OfficeNext.Pdf;

/// <summary>Cor RGB em componentes 0..1.</summary>
public readonly record struct PdfColor(double R, double G, double B)
{
    public static PdfColor Rgb255(int r, int g, int b) => new(r / 255.0, g / 255.0, b / 255.0);

    /// <summary>Aceita "RRGGBB" (com ou sem #).</summary>
    public static PdfColor Hex(string hex)
    {
        string h = hex.StartsWith('#') ? hex[1..] : hex;
        return Rgb255(
            int.Parse(h.AsSpan(0, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture),
            int.Parse(h.AsSpan(2, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture),
            int.Parse(h.AsSpan(4, 2), NumberStyles.HexNumber, CultureInfo.InvariantCulture));
    }
}

/// <summary>Um glifo já posicionado: gid (=CID), code point (p/ ToUnicode) e coords em pt.</summary>
public readonly struct PlacedGlyph
{
    public required int Gid { get; init; }
    public required int CodePoint { get; init; }
    /// <summary>x absoluto na página, em pontos (origem no canto superior esquerdo).</summary>
    public required double XPt { get; init; }
    /// <summary>y da baseline medido a partir do TOPO da página, em pontos.</summary>
    public required double BaselineFromTopPt { get; init; }
}

/// <summary>Imagem embutida (XObject) pronta para desenhar.</summary>
public sealed record PdfImage(string ResourceName, int ObjNum);

/// <summary>Degradê embutido (recurso /Shading) pronto para pintar dentro de um recorte.</summary>
public sealed record PdfShading(string ResourceName, int ObjNum);

/// <summary>Geometria de um degradê (pt, y a partir do TOPO): axial (do ponto 0 ao 1)
/// ou radial (centro (X0, Y0), raio 0 → R).</summary>
public sealed record PdfShadingGeom(bool Radial, double X0, double Y0, double X1, double Y1, double R);

/// <summary>Formatação numérica dos operadores PDF (até 3 casas, sem zeros supérfluos).</summary>
public static class PdfNum
{
    /// <summary>Maior módulo escrito num número do PDF (evita a notação exponencial).</summary>
    public const double MaxReal = 1e9;

    public static string Fmt(double n)
    {
        // nunca NaN/Infinity/expoente (inválidos no PDF): NaN vira 0 e o módulo é limitado
        if (double.IsNaN(n)) return "0";
        n = Math.Max(-MaxReal, Math.Min(MaxReal, n));
        double r = JsRound(n * 1000) / 1000;
        if (r == 0) return "0"; // inclusive -0
        // "0.###" só reproduz o String() do JS enquanto cabe nos 15 dígitos do .NET;
        // fora disso (e NaN/±∞, 1e+21…) usa o Number::toString completo
        if (!(Math.Abs(r) < 1e11)) return OfficeNext.Core.JsNumber.ToString(r);
        return r.ToString("0.###", CultureInfo.InvariantCulture);
    }

    /// <summary>
    /// Math.round do JS (empate vai para +∞). Igual a floor(x + 0.5), exceto onde a
    /// soma arredonda (0.49999999999999994 → 0, inteiros ≥ 2^52) — mesmo algoritmo do V8.
    /// </summary>
    public static double JsRound(double x)
    {
        double c = Math.Ceiling(x);
        return c - 0.5 > x ? c - 1 : c;
    }
}

/// <summary>Operação de um comando de caminho.</summary>
public enum PathOp : byte { M, L, C, Z }

/// <summary>
/// Comando de caminho (coordenadas em pt, y a partir do TOPO) — porta do tipo
/// PathCmd do JS. M/L usam (X, Y); C usa (X1, Y1, X2, Y2, X, Y); Z fecha o subcaminho.
/// </summary>
public readonly record struct PathCmd(PathOp Op, double X, double Y, double X1, double Y1, double X2, double Y2)
{
    public static PathCmd M(double x, double y) => new(PathOp.M, x, y, 0, 0, 0, 0);
    public static PathCmd L(double x, double y) => new(PathOp.L, x, y, 0, 0, 0, 0);
    public static PathCmd C(double x1, double y1, double x2, double y2, double x, double y) =>
        new(PathOp.C, x, y, x1, y1, x2, y2);
    public static PathCmd Z => new(PathOp.Z, 0, 0, 0, 0, 0, 0);
}

/// <summary>Traço de um caminho: cor, espessura (pt) e tracejado opcional.</summary>
public readonly record struct PathStroke(PdfColor Color, double WidthPt, IReadOnlyList<double>? Dash = null);

/// <summary>
/// Página PDF — porta de write/packages/docx-layout/src/pdf-writer/document.ts. As coordenadas de entrada
/// usam origem no canto SUPERIOR esquerdo (y cresce para baixo, como no canvas);
/// a conversão para o sistema do PDF (origem inferior esquerda) é feita aqui.
/// </summary>
public sealed class PdfPage
{
    public ByteBuilder Content { get; } = new(4096);
    public double WidthPt { get; }
    public double HeightPt { get; }
    /// <summary>nome do ExtGState com a opacidade (preenchimento, traço); null = página avulsa</summary>
    private readonly Func<double, double, string>? _gsFor;

    /// <summary>Página avulsa (sem documento): WithAlpha desenha direto, sem ExtGState.</summary>
    public PdfPage(double widthPt, double heightPt) : this(widthPt, heightPt, null) { }

    internal PdfPage(double widthPt, double heightPt, Func<double, double, string>? gsFor)
    {
        WidthPt = widthPt;
        HeightPt = heightPt;
        _gsFor = gsFor;
    }

    /// <summary>
    /// Desenha com opacidade (0..1) de preenchimento/traço: envolve o desenho em
    /// q /GSn gs … Q. Página avulsa (sem documento) ou opaco: desenha direto.
    /// </summary>
    public void WithAlpha(double? fillAlpha, double? strokeAlpha, Action draw)
    {
        double fa = fillAlpha ?? 1, sa = strokeAlpha ?? 1;
        if (_gsFor is null || (fa >= 1 && sa >= 1)) { draw(); return; }
        // Math.Max do .NET propaga NaN como o Math.max do JS
        Content.Str("q\n/").Str(_gsFor(Math.Max(0, fa), Math.Max(0, sa))).Str(" gs\n");
        draw();
        Content.Str("Q\n");
    }

    private double FromTop(double yTop) => HeightPt - yTop;

    /// <summary>Retângulo preenchido (sombreado, realce). yTopPt = topo do retângulo.</summary>
    public void FillRect(double xPt, double yTopPt, double wPt, double hPt, PdfColor color)
    {
        double y = FromTop(yTopPt + hPt); // canto inferior em coords PDF
        Content.Num(color.R).Byte((byte)' ').Num(color.G).Byte((byte)' ').Num(color.B).Str(" rg\n")
            .Num(xPt).Byte((byte)' ').Num(y).Byte((byte)' ').Num(wPt).Byte((byte)' ').Num(hPt).Str(" re f\n");
    }

    /// <summary>Segmento de reta (bordas, sublinhado, divisores). Coords y a partir do topo.</summary>
    public void Line(
        double x0, double y0Top, double x1, double y1Top,
        PdfColor color, double widthPt, IReadOnlyList<double>? dash = null)
    {
        var c = Content;
        c.Num(color.R).Byte((byte)' ').Num(color.G).Byte((byte)' ').Num(color.B).Str(" RG\n")
         .Num(widthPt).Str(" w\n");
        DashOp(c, dash);
        c.Num(x0).Byte((byte)' ').Num(FromTop(y0Top)).Str(" m ")
         .Num(x1).Byte((byte)' ').Num(FromTop(y1Top)).Str(" l S\n");
    }

    /// <summary>
    /// Desenha glifos já posicionados, todos na mesma fonte/tamanho/cor. Cada glifo
    /// recebe sua própria matriz de texto (posição absoluta), reproduzindo
    /// exatamente as posições calculadas pelo layout.
    /// </summary>
    public void Glyphs(EmbeddedFont font, double sizePt, PdfColor color, IReadOnlyList<PlacedGlyph> glyphs)
        => Glyphs(font, sizePt, color, glyphs, scaleX: null);

    /// <summary>
    /// Idem, com as opções do JS: <paramref name="scaleX"/> (escala horizontal na
    /// matriz de texto; null = 1), negrito sintético (preenche + contorna, modo 2,
    /// traço = corpo/35) e itálico sintético (inclinação 0.21).
    /// </summary>
    public void Glyphs(
        EmbeddedFont font, double sizePt, PdfColor color, IReadOnlyList<PlacedGlyph> glyphs,
        double? scaleX = null, bool synthBold = false, bool synthItalic = false, bool runs = false)
    {
        if (glyphs.Count == 0) return;
        var c = Content;
        c.Str("BT\n/").Str(font.ResourceName).Byte((byte)' ').Num(sizePt).Str(" Tf\n")
         .Num(color.R).Byte((byte)' ').Num(color.G).Byte((byte)' ').Num(color.B).Str(" rg\n");
        // negrito sintético: preenche + contorna (modo 2) com traço proporcional ao corpo
        if (synthBold)
            c.Num(color.R).Byte((byte)' ').Num(color.G).Byte((byte)' ').Num(color.B).Str(" RG ")
             .Num(sizePt / 35).Str(" w 2 Tr\n");
        string a = PdfNum.Fmt(scaleX ?? 1);
        string skew = synthItalic ? "0.21" : "0";
        if (runs)
        {
            // corridas como no PDF do Word: UMA matriz (Tm) no 1º glifo de cada trecho de mesma
            // baseline e x crescente, e um TJ com ajustes INTEIROS (milésimos do corpo) que levam
            // cada glifo à posição do layout. Cada ajuste parte da posição real da caneta
            // (larguras do /W + ajustes já gravados): o arredondamento não se acumula
            double sx = scaleX ?? 1;
            int i = 0;
            while (i < glyphs.Count)
            {
                var g0 = glyphs[i];
                int j = i + 1;
                while (j < glyphs.Count && glyphs[j].BaselineFromTopPt == g0.BaselineFromTopPt && glyphs[j].XPt >= glyphs[j - 1].XPt) j++;
                c.Str(a).Str(" 0 ").Str(skew).Str(" 1 ").Num(g0.XPt).Byte((byte)' ').Num(FromTop(g0.BaselineFromTopPt)).Str(" Tm [");
                // caneta: deslocamento (pt, espaço de texto) desde o 1º glifo da corrida
                double pen = 0;
                for (int k = i; k < j; k++)
                {
                    var g = glyphs[k];
                    if (k > i)
                    {
                        double n = OfficeNext.Core.JsNumber.Round(((pen - (g.XPt - g0.XPt) / sx) * 1000) / sizePt);
                        if (n != 0) { c.Str(((long)n).ToString(CultureInfo.InvariantCulture)); pen -= (n * sizePt) / 1000; }
                    }
                    c.GlyphHex(g.Gid);
                    pen += (font.WidthThousandths(g.Gid) * sizePt) / 1000;
                }
                c.Str("] TJ\n");
                i = j;
            }
        }
        else foreach (var g in glyphs)
        {
            double y = FromTop(g.BaselineFromTopPt);
            c.Str(a).Str(" 0 ").Str(skew).Str(" 1 ").Num(g.XPt).Byte((byte)' ').Num(y).Str(" Tm ")
             .GlyphHex(g.Gid).Str(" Tj\n");
        }
        if (synthBold) c.Str("0 Tr\n");
        c.Str("ET\n");
    }

    /// <summary>Caminho preenchido e/ou contornado (evenOdd: preenchimento par-ímpar — furos de a:custGeom).</summary>
    public void Path(IReadOnlyList<PathCmd> cmds, PdfColor? fill = null, PathStroke? stroke = null, bool evenOdd = false)
    {
        if (cmds.Count == 0 || (fill is null && stroke is null)) return;
        var c = Content;
        if (fill is { } f)
            c.Num(f.R).Byte((byte)' ').Num(f.G).Byte((byte)' ').Num(f.B).Str(" rg\n");
        if (stroke is { } s)
        {
            c.Num(s.Color.R).Byte((byte)' ').Num(s.Color.G).Byte((byte)' ').Num(s.Color.B).Str(" RG ")
             .Num(s.WidthPt).Str(" w ");
            DashOp(c, s.Dash);
        }
        foreach (var cmd in cmds)
        {
            switch (cmd.Op)
            {
                case PathOp.M:
                    c.Num(cmd.X).Byte((byte)' ').Num(FromTop(cmd.Y)).Str(" m\n");
                    break;
                case PathOp.L:
                    c.Num(cmd.X).Byte((byte)' ').Num(FromTop(cmd.Y)).Str(" l\n");
                    break;
                case PathOp.C:
                    c.Num(cmd.X1).Byte((byte)' ').Num(FromTop(cmd.Y1)).Byte((byte)' ')
                     .Num(cmd.X2).Byte((byte)' ').Num(FromTop(cmd.Y2)).Byte((byte)' ')
                     .Num(cmd.X).Byte((byte)' ').Num(FromTop(cmd.Y)).Str(" c\n");
                    break;
                default:
                    c.Str("h\n");
                    break;
            }
        }
        c.Str(fill is not null && stroke is not null ? (evenOdd ? "B*\n" : "B\n") : fill is not null ? (evenOdd ? "f*\n" : "f\n") : "S\n");
    }

    /// <summary>Preenche o caminho com um degradê (recorta pelo caminho e pinta com `sh`).</summary>
    public void FillShaded(IReadOnlyList<PathCmd> cmds, PdfShading sh, bool evenOdd = false)
    {
        if (cmds.Count == 0) return;
        var c = Content;
        c.Str("q\n");
        foreach (var cmd in cmds)
        {
            switch (cmd.Op)
            {
                case PathOp.M:
                    c.Num(cmd.X).Byte((byte)' ').Num(FromTop(cmd.Y)).Str(" m\n");
                    break;
                case PathOp.L:
                    c.Num(cmd.X).Byte((byte)' ').Num(FromTop(cmd.Y)).Str(" l\n");
                    break;
                case PathOp.C:
                    c.Num(cmd.X1).Byte((byte)' ').Num(FromTop(cmd.Y1)).Byte((byte)' ')
                     .Num(cmd.X2).Byte((byte)' ').Num(FromTop(cmd.Y2)).Byte((byte)' ')
                     .Num(cmd.X).Byte((byte)' ').Num(FromTop(cmd.Y)).Str(" c\n");
                    break;
                default:
                    c.Str("h\n");
                    break;
            }
        }
        c.Str(evenOdd ? "W*" : "W").Str(" n\n/").Str(sh.ResourceName).Str(" sh\nQ\n");
    }

    /// <summary>"[d0 d1 …] 0 d\n" (ou "[] 0 d\n" sem tracejado).</summary>
    private static void DashOp(ByteBuilder c, IReadOnlyList<double>? dash)
    {
        if (dash is { Count: > 0 })
        {
            c.Byte((byte)'[');
            for (int i = 0; i < dash.Count; i++)
            {
                if (i > 0) c.Byte((byte)' ');
                c.Num(dash[i]);
            }
            c.Str("] 0 d\n");
        }
        else c.Str("[] 0 d\n");
    }

    /// <summary>Empilha um recorte retangular (até PopClip).</summary>
    public void PushClipRect(double xPt, double yTopPt, double wPt, double hPt)
    {
        Content.Str("q\n").Num(xPt).Byte((byte)' ').Num(FromTop(yTopPt + hPt)).Byte((byte)' ')
            .Num(wPt).Byte((byte)' ').Num(hPt).Str(" re W n\n");
    }

    public void PopClip() => Content.Str("Q\n");

    /// <summary>Empilha uma transformação afim (matriz cm, em pt) até PopClip.</summary>
    public void PushTransform(double a, double b, double c, double d, double e, double f)
    {
        Content.Str("q\n").Num(a).Byte((byte)' ').Num(b).Byte((byte)' ').Num(c).Byte((byte)' ')
            .Num(d).Byte((byte)' ').Num(e).Byte((byte)' ').Num(f).Str(" cm\n");
    }

    /// <summary>
    /// Imagem com rotação (graus, horário, em torno do centro) e espelhamento.
    /// Math.Cos/Sin do .NET (CRT) e do V8 (fdlibm) podem diferir em 1 ulp; depois
    /// do Fmt (3 casas) isso só mudaria um dígito exatamente na fronteira de arredondamento.
    /// </summary>
    public void DrawImageTransformed(
        PdfImage img, double xPt, double yTopPt, double wPt, double hPt,
        double rotDeg = 0, bool flipH = false, bool flipV = false)
    {
        double cx = xPt + wPt / 2;
        double cy = FromTop(yTopPt + hPt / 2);
        double r = (-rotDeg * Math.PI) / 180;
        double cos = Math.Cos(r), sin = Math.Sin(r);
        double sx = flipH ? -wPt : wPt, sy = flipV ? -hPt : hPt;
        // M = T(centro) · R · S · T(-½,-½)
        double a = cos * sx, b = sin * sx, c = -sin * sy, d = cos * sy;
        double e = cx - (a + c) / 2, f = cy - (b + d) / 2;
        Content.Str("q\n").Num(a).Byte((byte)' ').Num(b).Byte((byte)' ').Num(c).Byte((byte)' ')
            .Num(d).Byte((byte)' ').Num(e).Byte((byte)' ').Num(f).Str(" cm\n/")
            .Str(img.ResourceName).Str(" Do\nQ\n");
    }

    /// <summary>Desenha uma imagem já embutida. (x,y) = canto superior esquerdo.</summary>
    public void DrawImage(PdfImage img, double xPt, double yTopPt, double wPt, double hPt)
    {
        double y = FromTop(yTopPt + hPt);
        Content.Str("q\n").Num(wPt).Str(" 0 0 ").Num(hPt).Byte((byte)' ')
            .Num(xPt).Byte((byte)' ').Num(y).Str(" cm\n/").Str(img.ResourceName).Str(" Do\nQ\n");
    }
}

/// <summary>Documento PDF: fontes/imagens compartilhadas + páginas, montado em Build().</summary>
public sealed class PdfDocument
{
    private readonly PdfWriter _writer;
    private readonly List<EmbeddedFont> _fonts = new();
    private readonly List<PdfImage> _images = new();
    private readonly List<PdfPage> _pages = new();
    private readonly List<PdfShading> _shadings = new();
    /// <summary>ExtGState de opacidade, em ordem de criação: chave "ca|CA" → nome do recurso</summary>
    private readonly List<(string Key, string Name)> _alphaStates = new();
    private readonly Dictionary<string, string> _alphaByKey = new();

    public PdfDocument(bool compress = true)
    {
        _writer = new PdfWriter(compress);
    }

    /// <summary>Nome do ExtGState (GS0, GS1…) para a opacidade (preenchimento, traço).</summary>
    private string AlphaState(double ca, double CA)
    {
        string key = $"{PdfNum.Fmt(ca)}|{PdfNum.Fmt(CA)}";
        lock (_alphaByKey) // páginas podem ser desenhadas em paralelo
        {
            if (!_alphaByKey.TryGetValue(key, out string? name))
            {
                name = $"GS{_alphaStates.Count}";
                _alphaByKey[key] = name;
                _alphaStates.Add((key, name));
            }
            return name;
        }
    }

    /// <summary>Embute uma fonte TrueType (bytes crus + consultas de métrica).</summary>
    public EmbeddedFont EmbedFont(string name, byte[] bytes, IFontProgram program)
    {
        var f = new EmbeddedFont(_fonts.Count, name, bytes, program);
        _fonts.Add(f);
        return f;
    }

    /// <summary>
    /// Embute um JPEG (baseline) diretamente via DCTDecode. 1 componente = DeviceGray,
    /// 4 = DeviceCMYK (com /Decode invertido quando o APP14 da Adobe marca CMYK
    /// invertido), senão DeviceRGB.
    /// </summary>
    public PdfImage EmbedJpeg(byte[] bytes, int widthPx, int heightPx, int components = 3, bool adobeInverted = false, IReadOnlyList<double>? decodeArr = null)
    {
        string cs = components == 1 ? "/DeviceGray" : components == 4 ? "/DeviceCMYK" : "/DeviceRGB";
        // decodeArr: reta por componente (brilho/contraste sem decodificar o JPEG)
        string decode = components == 4 && adobeInverted ? " /Decode [1 0 1 0 1 0 1 0]"
            : decodeArr is { Count: > 0 } ? $" /Decode [{string.Join(" ", decodeArr.Select(PdfNum.Fmt))}]" : "";
        int objNum = _writer.AddStream(
            $"/Type /XObject /Subtype /Image /Width {widthPx} /Height {heightPx} " +
            $"/ColorSpace {cs} /BitsPerComponent 8 /Filter /DCTDecode{decode}",
            bytes,
            allowCompress: false); // já comprimido
        var handle = new PdfImage($"Im{_images.Count}", objNum);
        _images.Add(handle);
        return handle;
    }

    /// <summary>
    /// Embute pixels RGBA crus via DeviceRGB + FlateDecode. Quando o alpha não é
    /// trivial (algum pixel &lt; 255), o canal vira um /SMask DeviceGray — PNGs com
    /// transparência preservam o recorte no PDF.
    /// </summary>
    public PdfImage EmbedRgba(byte[] rgba, int widthPx, int heightPx) =>
        EmbedRgba(PrepareRgba(rgba, widthPx, heightPx, _writer.CompressEnabled));

    /// <summary>Imagem RGBA já separada em RGB(+SMask) e comprimida — preparável em paralelo.</summary>
    public sealed class PreparedRgba
    {
        internal PdfWriter.PreparedStream Rgb;
        internal PdfWriter.PreparedStream? Alpha;
        internal int W;
        internal int H;
    }

    /// <summary>Split RGB/alpha + deflate (thread-safe; não toca o writer).</summary>
    public static PreparedRgba PrepareRgba(byte[] rgba, int widthPx, int heightPx, bool compress = true)
    {
        var rgb = new byte[widthPx * heightPx * 3];
        var alpha = new byte[widthPx * heightPx];
        bool hasAlpha = false;
        for (int i = 0, j = 0, k = 0; i < rgba.Length; i += 4, j += 3, k++)
        {
            rgb[j] = rgba[i];
            rgb[j + 1] = rgba[i + 1];
            rgb[j + 2] = rgba[i + 2];
            byte a = rgba[i + 3];
            alpha[k] = a;
            if (a != 255) hasAlpha = true;
        }
        return new PreparedRgba
        {
            Rgb = PdfWriter.Prepare(rgb, compress),
            Alpha = hasAlpha ? PdfWriter.Prepare(alpha, compress) : null,
            W = widthPx,
            H = heightPx,
        };
    }

    public PdfImage EmbedRgba(PreparedRgba p)
    {
        string smask = "";
        if (p.Alpha is { } alphaPs)
        {
            int smaskNum = _writer.AddStreamPrepared(
                $"/Type /XObject /Subtype /Image /Width {p.W} /Height {p.H} " +
                "/ColorSpace /DeviceGray /BitsPerComponent 8",
                alphaPs);
            smask = $" /SMask {smaskNum} 0 R";
        }
        int objNum = _writer.AddStreamPrepared(
            $"/Type /XObject /Subtype /Image /Width {p.W} /Height {p.H} " +
            $"/ColorSpace /DeviceRGB /BitsPerComponent 8{smask}",
            p.Rgb);
        var handle = new PdfImage($"Im{_images.Count}", objNum);
        _images.Add(handle);
        return handle;
    }

    /// <summary>
    /// Degradê axial (ShadingType 2, do ponto 0 ao 1) ou radial (ShadingType 3,
    /// círculos concêntricos de centro (x0,y0), raio 0 → r) com cores amostradas
    /// (função tipo 0: n amostras RGB de 8 bits, como o Word grava). Coordenadas em
    /// pt com y a partir do TOPO; estende as cores das pontas.
    /// </summary>
    public PdfShading AddShading(PdfShadingGeom geom, byte[] samples, double pageHeightPt)
    {
        int n = Math.Max(2, samples.Length / 3);
        var data = new byte[n * 3];
        Array.Copy(samples, data, Math.Min(samples.Length, n * 3));
        int fn = _writer.AddStream(
            $"/FunctionType 0 /Domain [0 1] /Range [0 1 0 1 0 1] /Size [{n}] /BitsPerSample 8 /Order 1 /Encode [0 {n - 1}]",
            data);
        double H = pageHeightPt;
        static string F(double v) => PdfNum.Fmt(v);
        string coords = !geom.Radial
            ? $"/ShadingType 2 /Coords [{F(geom.X0)} {F(H - geom.Y0)} {F(geom.X1)} {F(H - geom.Y1)}]"
            : $"/ShadingType 3 /Coords [{F(geom.X0)} {F(H - geom.Y0)} 0 {F(geom.X0)} {F(H - geom.Y0)} {F(geom.R)}]";
        int objNum = _writer.AddDict($"<< /ColorSpace /DeviceRGB {coords} /Extend [true true] /Function {fn} 0 R >>");
        var handle = new PdfShading($"Sh{_shadings.Count}", objNum);
        _shadings.Add(handle);
        return handle;
    }

    public PdfPage AddPage(double widthPt, double heightPt)
    {
        var p = new PdfPage(widthPt, heightPt, AlphaState);
        _pages.Add(p);
        return p;
    }

    /// <summary>Anexa uma página desenhada fora do documento (render paralelo; sem ExtGState).</summary>
    public void AddPage(PdfPage page) => _pages.Add(page);

    /// <summary>Serializa o PDF completo.</summary>
    public byte[] Build()
    {
        var w = _writer;

        // hot path: subset+deflate das fontes e deflate dos content streams são
        // independentes — prepara em PARALELO; a alocação de objetos continua
        // sequencial e determinística.
        var preparedFonts = new EmbeddedFont.PreparedFontFile[_fonts.Count];
        var contentBytes = new byte[_pages.Count][];
        for (int i = 0; i < _pages.Count; i++) contentBytes[i] = _pages[i].Content.ToArray();
        var preparedContents = new PdfWriter.PreparedStream[_pages.Count];
        int jobs = _fonts.Count + _pages.Count;
        if (jobs > 1)
        {
            Parallel.For(0, jobs, i =>
            {
                if (i < _fonts.Count) preparedFonts[i] = _fonts[i].PrepareFontFile(w.CompressEnabled);
                else preparedContents[i - _fonts.Count] = PdfWriter.Prepare(contentBytes[i - _fonts.Count], w.CompressEnabled);
            });
        }
        else
        {
            for (int i = 0; i < _fonts.Count; i++) preparedFonts[i] = _fonts[i].PrepareFontFile(w.CompressEnabled);
            for (int i = 0; i < _pages.Count; i++) preparedContents[i] = PdfWriter.Prepare(contentBytes[i], w.CompressEnabled);
        }

        // fontes
        var fontRefs = _fonts.Select((f, i) => (f.ResourceName, Ref: f.Write(w, preparedFonts[i]))).ToList();
        string fontDict = fontRefs.Count > 0
            ? $"/Font << {string.Join(" ", fontRefs.Select(f => $"/{f.ResourceName} {f.Ref} 0 R"))} >>"
            : "";
        string xobjDict = _images.Count > 0
            ? $"/XObject << {string.Join(" ", _images.Select(i => $"/{i.ResourceName} {i.ObjNum} 0 R"))} >>"
            : "";
        string gsDict = _alphaStates.Count > 0
            ? $"/ExtGState << {string.Join(" ", _alphaStates.Select(s =>
            {
                int bar = s.Key.IndexOf('|');
                return $"/{s.Name} << /Type /ExtGState /ca {s.Key[..bar]} /CA {s.Key[(bar + 1)..]} >>";
            }))} >>"
            : "";
        string shDict = _shadings.Count > 0
            ? $"/Shading << {string.Join(" ", _shadings.Select(h => $"/{h.ResourceName} {h.ObjNum} 0 R"))} >>"
            : "";
        string resources = gsDict.Length > 0 || shDict.Length > 0 ? $"<< {fontDict} {xobjDict} {gsDict} {shDict} >>" : $"<< {fontDict} {xobjDict} >>";

        int catalog = w.Alloc();
        int pagesNode = w.Alloc();

        var pageRefs = new List<int>();
        for (int i = 0; i < _pages.Count; i++)
        {
            var page = _pages[i];
            int contentNum = w.AddStreamPrepared("", preparedContents[i]);
            int pageNum = w.AddDict(
                $"<< /Type /Page /Parent {pagesNode} 0 R " +
                $"/MediaBox [0 0 {PdfNum.Fmt(page.WidthPt)} {PdfNum.Fmt(page.HeightPt)}] " +
                $"/Resources {resources} /Contents {contentNum} 0 R >>");
            pageRefs.Add(pageNum);
        }

        w.Define(pagesNode,
            $"<< /Type /Pages /Count {pageRefs.Count} /Kids [{string.Join(" ", pageRefs.Select(r => $"{r} 0 R"))}] >>");
        w.Define(catalog, $"<< /Type /Catalog /Pages {pagesNode} 0 R >>");
        return w.Build(catalog);
    }
}

using OfficeNext.Docx;

namespace OfficeNext.DocxLayout;

/// <summary>
/// Saída do motor: páginas com itens de desenho em TWIPS (origem no canto
/// superior esquerdo da página) — porta de docx-layout/src/tree.ts. Canvas, PDF
/// e o port .NET pintam a mesma árvore; é ela que os testes comparam com o Word.
/// </summary>
public abstract class PageItem
{
    /// <summary>Discriminante do JS: glyphs | rect | line | image | shape | path | clip.</summary>
    public abstract string T { get; }

    /// <summary>Cópia rasa ({ ...it }).</summary>
    public PageItem ShallowClone() => (PageItem)MemberwiseClone();
}

/// <summary>Glifo posicionado: code point + x absoluto (twips).</summary>
public readonly record struct GlyphPos(int Cp, double X);

public sealed class GlyphRunItem : PageItem
{
    public override string T => "glyphs";
    public FontFace Face = null!;
    /// <summary>tamanho em pontos (nominal).</summary>
    public double SizePt;
    /// <summary>RRGGBB</summary>
    public string Color = "000000";
    /// <summary>baseline (twips, do topo da página).</summary>
    public double Y;
    /// <summary>glifos: code point + x absoluto (twips).</summary>
    public List<GlyphPos> Glyphs = new();
    /// <summary>escala horizontal (w:w) — 1 = normal; nulo = ausente.</summary>
    public double? ScaleX;
    /// <summary>texto original (busca, ToUnicode, depuração).</summary>
    public string Text = "";
    /// <summary>contornos sintéticos</summary>
    public bool SynthBold;
    public bool SynthItalic;
    /// <summary>opacidade (0..1) — texto semitransparente (w14:textFill)</summary>
    public double? Alpha;
}

public sealed class RectItem : PageItem
{
    public override string T => "rect";
    public double X, Y, W, H;
    public string Fill = "";
    public double? Alpha;
}

public sealed class LineItem : PageItem
{
    public override string T => "line";
    public double X1, Y1, X2, Y2;
    public string Color = "000000";
    /// <summary>espessura em pontos</summary>
    public double WidthPt;
    /// <summary>dotted | dashed | dashDot | dashDotDot (nulo = sólida)</summary>
    public string? Dash;
}

public sealed class ImageItem : PageItem
{
    public override string T => "image";
    public double X, Y, W, H;
    public InlineImage Image = null!;
    /// <summary>recorte (frações 0..1)</summary>
    public ImageCrop? Crop;
    public double? Rot;
    public bool FlipH;
    public bool FlipV;
}

public sealed class StrokeSpec
{
    public string Color = "000000";
    public double WidthPt;
    public string? Dash;
}

public sealed class ShapeItem : PageItem
{
    public override string T => "shape";
    public double X, Y, W, H;
    public ShapeStyle Style = null!;
    /// <summary>fill/linha já resolvidos (RRGGBB)</summary>
    public string? Fill;
    public StrokeSpec? Stroke;
    /// <summary>linha (geom line): pontos relativos ao canto</summary>
    public ShapeLinePoints? Line;
}

/// <summary>Comando de caminho em twips (origem no topo da página). Op: M | L | C | Z.</summary>
public sealed class PathCmdTw
{
    public char Op;
    public double X1, Y1, X2, Y2, X, Y;

    public static PathCmdTw M(double x, double y) => new() { Op = 'M', X = x, Y = y };
    public static PathCmdTw L(double x, double y) => new() { Op = 'L', X = x, Y = y };
    public static PathCmdTw C(double x1, double y1, double x2, double y2, double x, double y) =>
        new() { Op = 'C', X1 = x1, Y1 = y1, X2 = x2, Y2 = y2, X = x, Y = y };
    public static PathCmdTw Z() => new() { Op = 'Z' };
}

public sealed class PathItem : PageItem
{
    public override string T => "path";
    public List<PathCmdTw> Cmds = new();
    public string? Fill;
    public StrokeSpec? Stroke;
    public bool EvenOdd;
}

public sealed class ClipItem : PageItem
{
    public override string T => "clip";
    /// <summary>push (empilha recorte) | pop (desempilha).</summary>
    public string Op = "push";
    public double? X, Y, W, H;

    public static ClipItem Push(double x, double y, double w, double h) => new() { Op = "push", X = x, Y = y, W = w, H = h };
    public static ClipItem Pop() => new() { Op = "pop" };
}

/// <summary>
/// Transformação afim (twips → twips, origem no topo) aplicada aos itens até o
/// pop correspondente: ponto' = (a·x + c·y + e, b·x + d·y + f). Usada no texto
/// vertical de células (textDirection btLr/tbRl) e em caixas giradas/WordArt.
/// </summary>
public sealed class XformItem : PageItem
{
    public override string T => "xform";
    /// <summary>push | pop</summary>
    public string Op = "push";
    public double[]? M;

    public static XformItem Push(double[] m) => new() { Op = "push", M = m };
    public static XformItem Pop() => new() { Op = "pop" };
}

/// <summary>Caractere de uma linha: offset no parágrafo, x absoluto e largura (twips).</summary>
public readonly record struct LineChar(double O, double X, double W);

/// <summary>Linha de texto posicionada (mapeamento p/ o editor e testes).</summary>
public sealed class LaidOutLine
{
    /// <summary>referência do parágrafo: caminho no documento (ex.: "b12", "b3/r0/c1/b0", "hdr:default/b0").</summary>
    public string Ref = "";
    /// <summary>offsets [start, end) no texto do parágrafo (run.text concatenado)</summary>
    public double Start;
    public double End;
    public double X;
    public double Y;
    public double Height;
    public double Baseline;
    public double Width;
    /// <summary>posição de cada caractere (offset no parágrafo → x absoluto e largura):
    /// o editor mapeia cursor/seleção/clique por aqui</summary>
    public List<LineChar>? Chars;

    public LaidOutLine ShallowClone() => (LaidOutLine)MemberwiseClone();
}

public sealed class LayoutPage
{
    public double WidthTw;
    public double HeightTw;
    /// <summary>índice da seção</summary>
    public int Section;
    /// <summary>número exibido (PAGE)</summary>
    public double Number;
    public List<PageItem> Items = new();
    public List<LaidOutLine> Lines = new();
    /// <summary>quantos itens do início de `Items` são do cabeçalho/rodapé (camadas do HF)</summary>
    public int? HfItems;
    /// <summary>objetos flutuantes posicionados (seleção/arrasto no editor)</summary>
    public List<PlacedObject>? Objects;
}

/// <summary>Objeto flutuante posicionado na página (twips).</summary>
public sealed class PlacedObject
{
    public Run Run = null!;
    public double X, Y, W, H;
    /// <summary>behind | front</summary>
    public string Layer = "front";
    /// <summary>pertence ao cabeçalho/rodapé</summary>
    public bool Hf;
}

public sealed class LayoutResult
{
    public List<LayoutPage> Pages = new();
    /// <summary>avisos (recursos não suportados encontrados)</summary>
    public List<string> Warnings = new();
}

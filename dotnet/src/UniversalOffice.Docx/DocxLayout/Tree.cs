using UniversalOffice.Docx;

namespace UniversalOffice.DocxLayout;

/// <summary>
/// Saída do motor: páginas com itens de desenho em TWIPS (origem no canto
/// superior esquerdo da página) — porta de docx-layout/src/tree.ts. Canvas, PDF
/// e o port .NET pintam a mesma árvore; é ela que os testes comparam com o Word.
/// </summary>
public abstract class PageItem
{
    /// <summary>Discriminante do JS: glyphs | rect | line | image | shape | path | clip | xform.</summary>
    public abstract string T { get; }

    /// <summary>Cópia rasa ({ ...it }).</summary>
    public PageItem ShallowClone() => (PageItem)MemberwiseClone();
}

/// <summary>Glifo posicionado: code point + x absoluto (twips); Gid = glifo trocado por uma
/// substituição OpenType (onum, tnum, ss01…), desenhado em curvas.</summary>
public readonly record struct GlyphPos(int Cp, double X, int? Gid = null);

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
    /// <summary>os Cp dos glifos são ÍNDICES de glifo diretos (EMF ETO_GLYPH_INDEX — sem
    /// caractere: só desenhável como curva). No TS é o `gid` de cada glifo (= cp);
    /// aqui vale para o run inteiro, para sobreviver às cópias de GlyphPos.</summary>
    public bool ByGid;
    /// <summary>escala horizontal (w:w) — 1 = normal; nulo = ausente.</summary>
    public double? ScaleX;
    /// <summary>texto original (busca, ToUnicode, depuração).</summary>
    public string Text = "";
    /// <summary>contornos sintéticos</summary>
    public bool SynthBold;
    public bool SynthItalic;
    /// <summary>opacidade (0..1) — texto semitransparente (w14:textFill)</summary>
    public double? Alpha;
    /// <summary>desenhar como CURVAS no PDF (WordArt: o Word converte em contornos;
    /// texto semitransparente e caixa girada fora de 90°: o Word não grava texto)</summary>
    public bool AsPath;
    /// <summary>caixa da LINHA em torno do run (twips, relativos — sobrevivem a ShiftItem):
    /// Asc/Desc acima/abaixo de Y; Lead = do 1º glifo até a borda esquerda do
    /// quadro; Line = identidade da linha (os runs da mesma linha saem juntos).
    /// O Word não grava a linha que fica inteira fora da página (CullOffPage).</summary>
    public LineBoxInfo? LineBox;
    /// <summary>número de linha (w:lnNumType): vai para o PDF mesmo fora da página
    /// (oráculo lnnum2/ln-dist-wide)</summary>
    public bool LineNum;
    /// <summary>glifos COLORIDOS (COLR, ex.: Segoe UI Emoji): curvas por camada, nas
    /// cores da paleta — o Word também não grava texto extraível para eles</summary>
    public bool Colr;
    /// <summary>efeitos de texto w14 (degradê, contorno, sombra, brilho, reflexo)</summary>
    public ResolvedTextFx? Fx;
}

/// <summary>Caixa da linha de um run de glifos (GlyphRunItem.LineBox).</summary>
public sealed record LineBoxInfo(double Asc, double Desc, double Lead, int Line);

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
    /// <summary>dotted | dashed | dashDot | dashDotDot | bdrDot | bdrDash | bdrDashDot | bdrDashDotDot | bdrDashSmall (nulo = sólida)</summary>
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
    /// <summary>Formato da Imagem (cores já resolvidas): forma, contorno, efeitos e ajustes</summary>
    public PictureLook? Pic;
}

/// <summary>Aparência da imagem além do bitmap (Formato da Imagem), resolvida no layout —
/// porta do PictureLook de tree.ts.</summary>
public sealed class PictureLook
{
    /// <summary>Cortar para Forma: a forma predefinida (sem = retângulo)</summary>
    public PicGeomLook? Geom;
    /// <summary>contorno: todo do lado de FORA da forma (medido)</summary>
    public PicLineLook? Line;
    public PicShadowLook? Shadow;
    public PicGlowLook? Glow;
    public double? SoftEdgePt;
    /// <summary>chanfro de cima com a câmera de frente (pt; luz/material do scene3d/sp3d)</summary>
    public PicBevelLook? Bevel;
    public PicReflectionLook? Reflection;
    /// <summary>ajustes do a:blip que o Word aplica aos pixels (os de a:lum/grayscl/biLevel
    /// ficam em image.Effects)</summary>
    public double? Alpha;
    public (string A, string B)? Duotone;
    public PicClrChangeLook? ClrChange;
}

public sealed class PicGeomLook
{
    public string Prst = "rect";
    public Dictionary<string, double>? Adj;
}

public sealed class PicLineLook
{
    public string Color = "000000";
    public double Alpha = 1;
    public double WidthPt;
    public string? Dash;
    public string? Cmpd;
    public string? Cap;
    public string? Join;
}

public sealed class PicShadowLook
{
    /// <summary>outer | inner</summary>
    public string Kind = "outer";
    public string Color = "000000";
    public double Alpha = 1;
    public double BlurPt, DistPt, DirDeg;
    public double? Sx, Sy, KxDeg, KyDeg;
    public string? Algn;
    public bool? RotWithShape;
}

public sealed class PicGlowLook
{
    public string Color = "000000";
    public double Alpha = 1;
    public double RadPt;
}

public sealed class PicBevelLook
{
    public double WPt, HPt;
    public string? Prst, Rig, Dir, Material;
}

public sealed class PicReflectionLook
{
    public double BlurPt, StA, StPos, EndA, EndPos, DistPt, DirDeg, Sy;
    public string? Algn;
    public bool? RotWithShape;
}

public sealed class PicClrChangeLook
{
    public string From = "FFFFFF";
    public string To = "FFFFFF";
    public double ToAlpha = 1;
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
    /// <summary>degradê com as cores das paradas já resolvidas (RRGGBB)</summary>
    public GradFill? Grad;
    /// <summary>sombra externa resolvida (deslocamento em twips)</summary>
    public ShapeShadow? Shadow;
    /// <summary>padrão (a:pattFill) com as cores resolvidas: bitmap 8×8, 1 pixel = 0,75 pt</summary>
    public ShapePattern? Pattern;
    /// <summary>imagem (a:blipFill): esticada no quadro ou em mosaico (a:tile)</summary>
    public ShapeBlip? Blip;
    /// <summary>Efeitos de Forma (cores resolvidas): sombra externa com escala/inclinação ou interna,
    /// brilho, bordas suaves e reflexo — os modelos dos efeitos das imagens, sobre a silhueta
    /// da forma (corpo e contorno). O Pick&lt;PictureLook, 'shadow' | 'glow' | 'softEdgePt' |
    /// 'reflection'&gt; do JS: só esses campos vêm preenchidos.</summary>
    public PictureLook? Fx;
}

/// <summary>Degradê (a:gradFill): paradas (pos 0..1), a:lin (ângulo, scaled), rotWithShape, a:path.</summary>
public sealed class GradFill
{
    public List<GradStop> Stops = new();
    public double AngleDeg;
    public bool? Scaled;
    public bool? RotWithShape;
    public string? Path;
    public RectTw? FillTo;
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
    /// <summary>a linha tem revisão que pede barra de alteração: o espaço antes (1ª linha do
    /// parágrafo) e depois (última) que a barra também cobre (twips)</summary>
    public LineRev? Rev;

    public LaidOutLine ShallowClone() => (LaidOutLine)MemberwiseClone();
}

/// <summary>Barra de alteração de uma linha: espaço antes/depois que ela também cobre (twips).</summary>
public sealed record LineRev(double Before, double After);

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
    /// <summary>cor de fundo da página (w:background, RRGGBB) — o Word a grava no PDF</summary>
    public string? Background;
    /// <summary>efeito de preenchimento da página (gradiente, padrão, imagem, textura) — PageFill.cs</summary>
    public PageFillPaint? BackgroundFill;
    /// <summary>a TELA mostra o fundo (w:displayBackgroundShape); o PDF mostra sempre</summary>
    public bool BackgroundShow;
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

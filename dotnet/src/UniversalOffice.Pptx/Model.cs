namespace UniversalOffice.Pptx;

/// <summary>
/// Modelo que espelha o PresentationML/DrawingML literalmente — porta de
/// slides-core/src/model.ts. Geometria em EMU; sz em pontos (sz/100).
/// </summary>
public static class Emu
{
    public const int PerInch = 914400;
    public const int PerPoint = 12700;
    /// <summary>EMU → pixels @96dpi (9525).</summary>
    public const double PerPx = PerInch / 96.0;
}

public sealed class SlideRef
{
    public string Id = "";
    public string RId = "";
    public string? Target;
}

public sealed class Presentation
{
    public long SlideW;
    public long SlideH;
    public string? SizeType;
    public List<SlideRef> Slides = new();
}

public sealed class GradientStop
{
    public double Pos;
    public string Color = "#000000";
}

public sealed class Fill
{
    public string Type = "solid"; // solid | none | gradient
    public string? Color;
    public List<GradientStop>? Stops;
    public double? AngleDeg;
}

public sealed class ImageRef
{
    public string Part = "";
    public byte[] Bytes = [];
    public string Mime = "application/octet-stream";
}

public sealed class Xfrm
{
    public double X;
    public double Y;
    public double Cx;
    public double Cy;
    public double? Rot; // 1/60000 de grau
    public bool? FlipH;
    public bool? FlipV;
}

public sealed class Run
{
    public string Text = "";
    public double? Sz;   // pontos
    public bool? Bold;
    public bool? Italic;
    public bool? Underline;
    public string? Color;
    public string? Font;
    public string? Hyperlink;
}

public sealed class Paragraph
{
    public string? Align;   // l | ctr | r | just
    public int? Level;      // 0-based
    public List<Run> Runs = new();
    public bool? Bullet;
    public string? BulletChar;
    public string? BulletAutoNum;
    public long? MarL;
    public long? Indent;
}

public sealed class TextBody
{
    public string? Anchor;  // t | ctr | b
    public List<Paragraph> Paragraphs = new();
    public string? Wrap;
    public double? FontScale;
    public double? LnSpcReduction;
    public long? InsL;
    public long? InsT;
    public long? InsR;
    public long? InsB;
    /// <summary>&lt;a:lstStyle&gt; próprio do txBody (maior prioridade da cascata).</summary>
    public List<TextStyleLevel>? LstStyle;
}

public sealed class Shadow
{
    public string Color = "#000000";
    public long BlurRad;
    public long Dist;
    public double DirDeg;
    public double Alpha = 1;
}

public sealed class Shape
{
    public string Id = "";
    public string Name = "";
    public string? PhType;
    public string? PhIdx;
    public bool IsTextBox;
    public Xfrm? Xfrm;
    public string? Geom;
    public Fill? Fill;
    public string? LineColor;
    public double? LineWidth; // EMU
    public TextBody? TxBody;
    public ImageRef? Image;
    public SrcRect? SrcRect;
    public double? Alpha;
    public string? ChartXml;
    public Table? Table;
    public Shadow? ShadowFx;
    public double? FillAlpha;
    public string? LineDash;
    public ImageRef? FillImage;
    public string? StyleFontColor;
    public string? StyleFontIdx;
}

public sealed class SrcRect
{
    public double L;
    public double T;
    public double R;
    public double B;
}

public sealed class TableCell
{
    public int? GridSpan;
    public int? RowSpan;
    public bool HMerge;
    public bool VMerge;
    public TextBody? TxBody;
    public string? FillColor;
    public string? BorderColor;
    public long? BorderWidth;
    public string? Anchor;
}

public sealed class TableRow
{
    public long HeightEmu;
    public List<TableCell> Cells = new();
}

public sealed class Table
{
    public List<long> ColWidthsEmu = new();
    public List<TableRow> Rows = new();
}

public sealed class SlideAnimEntry
{
    public string Spid = "";
    public int DelayMs;
    public int DurMs = 500;
    public string Type = "appear"; // fade | appear
    public bool ClickGated;
}

public sealed class SlideTransition
{
    public string Type = "fade";
    public int DurMs = 500;
    public string? Dir;
}

public sealed class Slide
{
    public List<Shape> Shapes = new();
    public Fill? Bg;
    public ImageRef? BgImage;
    public List<SlideAnimEntry>? Animations;
    public SlideTransition? Transition;
}

/// <summary>Mapa de cores do tema (&lt;a:clrScheme&gt;) + fontScheme.</summary>
public sealed class Theme
{
    public Dictionary<string, string> Colors = new(StringComparer.Ordinal);
    public string? FontMajor;
    public string? FontMinor;
}

/// <summary>Propriedades efetivas de UM nível (lvl1pPr..lvl9pPr) já resolvidas.</summary>
public sealed class TextStyleLevel
{
    public double? Sz;
    public bool? Bold;
    public bool? Italic;
    public string? Color;
    public string? Font;
    public string? Align;
    public string? BuChar;
    public string? BuAutoNum;
    public bool BuNone;
    public long? MarL;
    public long? Indent;

    public TextStyleLevel Clone() => new()
    {
        Sz = Sz, Bold = Bold, Italic = Italic, Color = Color, Font = Font, Align = Align,
        BuChar = BuChar, BuAutoNum = BuAutoNum, BuNone = BuNone, MarL = MarL, Indent = Indent,
    };
}

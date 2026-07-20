using OfficeNext.Core;
using static OfficeNext.Core.MiniXml;

namespace OfficeNext.Docx;

/// <summary>
/// Modelo de documento — espelha o OOXML (porta de docx-core/src/document.ts +
/// fulldoc.ts). O que não entendemos fica intocado no pacote.
/// </summary>
public sealed class RunProps
{
    public bool Bold;
    public bool Italic;
    public bool Underline;
    /// <summary>Estilo do w:u quando Underline=true (single é o padrão).</summary>
    public string? UnderlineStyle; // double | dotted | dash | wave | thick
    public string? UnderlineColor;
    public bool Strike;
    public bool DoubleStrike;
    public string? VertAlign;      // superscript | subscript
    /// <summary>half-points (w:sz). Null = herda.</summary>
    public int? SzHalfPt;
    public string? Color;          // hex RRGGBB
    public string? Highlight;
    public string? FontAscii;
    public bool AllCaps;
    public bool SmallCaps;
    public int? CharSpacingTwips;
    /// <summary>URL do w:hyperlink que envolve o run.</summary>
    public string? Link;
    public bool IsMath;
    /// <summary>Comentários cujo intervalo cobre este run.</summary>
    public List<int>? CommentIds;

    public RunProps Clone() => new()
    {
        Bold = Bold, Italic = Italic, Underline = Underline,
        UnderlineStyle = UnderlineStyle, UnderlineColor = UnderlineColor,
        Strike = Strike, DoubleStrike = DoubleStrike, VertAlign = VertAlign,
        SzHalfPt = SzHalfPt, Color = Color, Highlight = Highlight, FontAscii = FontAscii,
        AllCaps = AllCaps, SmallCaps = SmallCaps, CharSpacingTwips = CharSpacingTwips,
        Link = Link, IsMath = IsMath,
        CommentIds = CommentIds is null ? null : new List<int>(CommentIds),
    };
}

public sealed class InlineImage
{
    public byte[] Data = [];
    public string Ext = "png";
    public double WidthTwips;
    public double HeightTwips;
    public bool Floating;
    public double? OffsetXTwips;
    public double? OffsetYTwips;
}

public sealed class NoteRef
{
    public string Kind = "footnote"; // footnote | endnote
    public int Id;
}

public sealed class Run
{
    /// <summary>Para run de imagem, Text é o objeto de substituição U+FFFC.</summary>
    public string Text = "";
    public RunProps Props = new();
    public InlineImage? Image;
    public NoteRef? NoteRef;
    /// <summary>Instrução de campo (w:fldSimple w:instr), ex.: " PAGE ".</summary>
    public string? Field;
}

public sealed class NumberingProps
{
    public string Kind = "bullet"; // bullet | decimal
    public int Ilvl;
}

public sealed class TabStop
{
    public int PosTwips;
    public string Align = "left"; // left | right
    public string? Leader;        // dot
}

public sealed class DocxBorderEdge
{
    public string Style = "single";
    public int SizeEighthPt = 4;
    public string? Color;
    public int SpacePt;
}

public sealed class ParagraphBorders
{
    public DocxBorderEdge? Top;
    public DocxBorderEdge? Left;
    public DocxBorderEdge? Bottom;
    public DocxBorderEdge? Right;
    public bool Any => Top is not null || Left is not null || Bottom is not null || Right is not null;
}

public sealed class SectionBreakInfo
{
    public SectPr SectPr = new();
    public List<HfRefXml> HeaderRefs = new();
    public List<HfRefXml> FooterRefs = new();
}

public sealed class HfRefXml
{
    public string Kind = "header"; // header | footer
    public string Type = "default";
    public string Rid = "";
}

public sealed class ParaProps
{
    public string? Alignment;      // left | center | right | both
    public string? StyleId;
    public NumberingProps? Numbering;
    public int? IndentLeftTwips;
    public int? IndentRightTwips;
    public int? IndentFirstLineTwips;
    public int? LineTwentieths;
    public int? SpaceAfterTwips;
    public int? SpaceBeforeTwips;
    public string? TocInstr;
    public bool TocEntry;
    public List<TabStop>? TabStops;
    public string? ShadingHex;
    public bool BoxBorder;
    public ParagraphBorders? Borders;
    public bool PageBreakBefore;
    public bool DropCap;
    public SectionBreakInfo? SectionBreak;

    public ParaProps Clone() => new()
    {
        Alignment = Alignment, StyleId = StyleId,
        Numbering = Numbering is null ? null : new NumberingProps { Kind = Numbering.Kind, Ilvl = Numbering.Ilvl },
        IndentLeftTwips = IndentLeftTwips, IndentRightTwips = IndentRightTwips,
        IndentFirstLineTwips = IndentFirstLineTwips, LineTwentieths = LineTwentieths,
        SpaceAfterTwips = SpaceAfterTwips, SpaceBeforeTwips = SpaceBeforeTwips,
        TocInstr = TocInstr, TocEntry = TocEntry, TabStops = TabStops?.ToList(),
        ShadingHex = ShadingHex, BoxBorder = BoxBorder, Borders = Borders,
        PageBreakBefore = PageBreakBefore, DropCap = DropCap, SectionBreak = SectionBreak,
    };
}

public sealed class Paragraph
{
    public List<Run> Runs = new();
    public ParaProps Props = new();
}

public sealed class SectPrCols
{
    public int Count = 1;
    public int SpaceTwips = 720;
    public bool Sep;
}

public sealed class SectPr
{
    public int PageWidthTwips = 11906;
    public int PageHeightTwips = 16838;
    public int MarginLeftTwips = 1701;
    public int MarginRightTwips = 1701;
    public int MarginTopTwips = 1417;
    public int MarginBottomTwips = 1417;
    public SectPrCols? Cols;
}

public sealed class DocumentModel
{
    public List<Paragraph> Paragraphs = new();
    public SectPr SectPr = new();
}

// ─────────────────────────── fulldoc.ts ───────────────────────────

public sealed class TableBorders
{
    public DocxBorderEdge? Top;
    public DocxBorderEdge? Left;
    public DocxBorderEdge? Bottom;
    public DocxBorderEdge? Right;
    public DocxBorderEdge? InsideH;
    public DocxBorderEdge? InsideV;
}

public sealed class TableCell
{
    public List<Paragraph> Paragraphs = new();
    public List<TableBlock> Tables = new();
    public int? WidthTwips;
    public string? ShadingHex;
    public int GridSpan = 1;
    public TableBorders? Borders;
}

public sealed class TableRow
{
    public List<TableCell> Cells = new();
}

public abstract class Block { }

public sealed class ParagraphBlock : Block
{
    public Paragraph Paragraph = new();
}

public sealed class TableBlock : Block
{
    public List<TableRow> Rows = new();
    public List<int> GridColsTwips = new();
    public TableBorders? Borders;
}

public sealed class HeaderFooterSet
{
    public List<Paragraph>? Default;
    public List<Paragraph>? First;
    public List<Paragraph>? Even;
}

public sealed class HfRef
{
    public string Type = "default"; // default | first | even
    public string Rid = "";
    public string Path = "";
}

public sealed class Section
{
    public SectPr SectPr = new();
    public int BlockStart;
    public int BlockEnd;
    public HeaderFooterSet Headers = new();
    public HeaderFooterSet Footers = new();
    public List<HfRef> HeaderRefs = new();
    public List<HfRef> FooterRefs = new();
}

public sealed class CommentInfo
{
    public int Id;
    public string? Author;
    public string Text = "";
}

/// <summary>Estilo resolvido de styles.xml (basedOn + docDefaults).</summary>
public sealed class ResolvedStyle
{
    public StylePara Para = new();
    public StyleRun Run = new();
}

/// <summary>Subconjunto de ParaProps que estilos definem (Partial&lt;ParaProps&gt;).</summary>
public sealed class StylePara
{
    public string? Alignment;
    public int? LineTwentieths;
    public int? SpaceAfterTwips;
    public int? SpaceBeforeTwips;
    public int? IndentLeftTwips;
    public int? IndentRightTwips;
    public bool? PageBreakBefore;
    public ParagraphBorders? Borders;
    public string? ShadingHex;
}

/// <summary>Subconjunto de RunProps que estilos definem (Partial&lt;RunProps&gt;).</summary>
public sealed class StyleRun
{
    public bool? Bold;
    public bool? Italic;
    public bool? AllCaps;
    public bool? SmallCaps;
    public bool? Strike;
    public int? SzHalfPt;
    public string? Color;
    public string? FontAscii;
    public bool? Underline;
}

public sealed class FullDocument
{
    public List<Block> Blocks = new();
    public List<Section> Sections = new();
    public Dictionary<int, List<Paragraph>> Footnotes = new();
    public Dictionary<int, List<Paragraph>> Endnotes = new();
    public List<CommentInfo> Comments = new();
    public Dictionary<string, ResolvedStyle> Styles = new(StringComparer.Ordinal);
    /// <summary>Bookmarks: nome → índice do bloco onde começa.</summary>
    public Dictionary<string, int> Bookmarks = new(StringComparer.Ordinal);
}

public static class DocxModel
{
    public const int EmuPerTwip = 635;

    public static DocxBorderEdge? ReadBorderEdge(XmlElement? el)
    {
        if (el is null) return null;
        string? style = el.Attr("w:val");
        if (string.IsNullOrEmpty(style) || style is "none" or "nil") return null;
        string? color = el.Attr("w:color");
        return new DocxBorderEdge
        {
            Style = style!,
            SizeEighthPt = JsNumber.ParseIntOr(el.Attr("w:sz") ?? "4", 4),
            Color = !string.IsNullOrEmpty(color) && color != "auto" ? color : null,
            SpacePt = JsNumber.ParseIntOr(el.Attr("w:space") ?? "0", 0),
        };
    }
}

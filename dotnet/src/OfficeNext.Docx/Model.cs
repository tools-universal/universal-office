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
    /// <summary>Estilo de caractere (w:rStyle) — vinculado em parte do parágrafo usa o par "…Char".</summary>
    public string? CharStyle;
    public bool IsMath;
    /// <summary>Comentários cujo intervalo cobre este run.</summary>
    public List<int>? CommentIds;
    /// <summary>Texto inserido em revisão (w:ins; w:moveTo com Move).</summary>
    public RevisionInfo? Ins;
    /// <summary>Texto EXCLUÍDO em revisão (w:del; w:moveFrom com Move): fica no modelo e
    /// no texto do parágrafo (offsets); a visão final o esconde.</summary>
    public RevisionInfo? Del;
    /// <summary>Formatação controlada (w:rPrChange): autoria e as props ANTES da mudança.</summary>
    public FormatChange? Fmt;

    public RunProps Clone() => new()
    {
        Bold = Bold, Italic = Italic, Underline = Underline,
        UnderlineStyle = UnderlineStyle, UnderlineColor = UnderlineColor,
        Strike = Strike, DoubleStrike = DoubleStrike, VertAlign = VertAlign,
        SzHalfPt = SzHalfPt, Color = Color, Highlight = Highlight, FontAscii = FontAscii,
        AllCaps = AllCaps, SmallCaps = SmallCaps, CharSpacingTwips = CharSpacingTwips,
        Link = Link, CharStyle = CharStyle, IsMath = IsMath,
        CommentIds = CommentIds is null ? null : new List<int>(CommentIds),
        Ins = Ins, Del = Del, Fmt = Fmt,
    };
}

/// <summary>w:rPrChange no modelo de edição: <c>Old</c> são as props de formatação de antes
/// (sem as de origem/revisão/comentário/link) — rejeitar volta a elas.</summary>
public sealed class FormatChange : RevisionInfo
{
    public RunProps Old = new();
}

/// <summary>w:pPrChange no modelo de edição (ver FormatChange).</summary>
public sealed class ParaFormatChange : RevisionInfo
{
    public ParaProps Old = new();
}

public sealed class InlineImage
{
    public byte[] Data = [];
    public string Ext = "png";
    /// <summary>asvg:svgBlip — versão VETORIAL da imagem (Office 2016+).</summary>
    public byte[]? Svg;
    public double WidthTwips;
    public double HeightTwips;
    public bool Floating;
    public double? OffsetXTwips;
    public double? OffsetYTwips;
    /// <summary>wp:positionH/@relativeFrom (page|margin|column|character…).</summary>
    public string? RelH;
    /// <summary>wp:positionV/@relativeFrom (page|margin|paragraph|line…).</summary>
    public string? RelV;
    /// <summary>wp:anchor/@behindDoc — imagem ATRÁS do texto.</summary>
    public bool BehindDoc;
    /// <summary>XML CRU do &lt;w:drawing&gt; (o MiniXml do .NET não captura — sempre nulo).</summary>
    public string? RawDrawingXml;
    /// <summary>wp:anchor completo (wrap, alinhamentos, distâncias) — motor de layout.</summary>
    public DrawingAnchor? Anchor;
    /// <summary>a:srcRect — recorte em frações (0..1) de cada lado.</summary>
    public ImageCrop? Crop;
    /// <summary>rotação/espelhamento/contorno da imagem (pic:spPr).</summary>
    public ShapeStyle? Style;
    /// <summary>Veio de VML (w:pict/w:object).</summary>
    public bool Vml;
    /// <summary>wp:inline effectExtent (twips): margem de efeitos que ocupa espaço na linha</summary>
    public RectTw? InlineEffect;
    /// <summary>Ajustes de cor (VML gain/blacklevel/grayscale/bilevel, DrawingML
    /// a:lum/a:grayscl/a:biLevel) — o Word os aplica aos pixels ao exportar.</summary>
    public ImageEffects? Effects;
    /// <summary>Formatação da imagem lida do w:drawing (forma, contorno, efeitos, 3D,
    /// ajustes do a:blip, texto alt) — PictureXml.ReadPictureFormat.</summary>
    public PictureFormat? Format;

    /// <summary>Cópia rasa ({ ...x }).</summary>
    public InlineImage ShallowClone() => (InlineImage)MemberwiseClone();
}

/// <summary>
/// Ajustes de cor de imagem, no modelo único do Word (medido no PDF exportado):
/// cinza (Rec. 709) primeiro; depois, por canal (0..1),
/// x' = (x − ½)·gain + ½ + bright/2·(1 + gain). VML: gain = gain,
/// bright = 2·blacklevel (arredonda); DrawingML a:lum: gain = 1/(1−c) (c &gt; 0)
/// ou 1 + c, bright = bright (trunca).
/// </summary>
public sealed class ImageEffects
{
    public bool Gray;
    public double? Gain;
    public double? Bright;
    /// <summary>DrawingML: trunca em vez de arredondar</summary>
    public bool Floor;
    /// <summary>preto e branco: luminância ≥ limiar (0..1) → branco</summary>
    public double? BiLevel;

    public bool Any => Gray || Gain is not null || Bright is not null || Floor || BiLevel is not null;
}

/// <summary>Recorte em frações (0..1) de cada lado.</summary>
public sealed class ImageCrop
{
    public double L;
    public double T;
    public double R;
    public double B;
}

/// <summary>Forma sem texto (retângulo, linha, elipse…) — DrawingML wps:wsp ou VML.</summary>
public sealed class DrawingShape
{
    public ShapeStyle Style = new();
    public double WidthTwips;
    public double HeightTwips;
    public bool Floating;
    public DrawingAnchor? Anchor;
    /// <summary>Para linhas VML (v:line from/to): pontos relativos ao canto (twips).</summary>
    public ShapeLinePoints? Line;
    /// <summary>wp:inline effectExtent (twips)</summary>
    public RectTw? InlineEffect;
    /// <summary>linha horizontal VML (v:rect o:hr="t", "Inserir linha horizontal")</summary>
    public bool Hr;
    /// <summary>wp:docPr hidden (Painel de Seleção): não desenha nem afasta o texto</summary>
    public bool Hidden;

    /// <summary>Cópia rasa ({ ...x }).</summary>
    public DrawingShape ShallowClone() => (DrawingShape)MemberwiseClone();
}

public sealed class ShapeLinePoints
{
    public double X1;
    public double Y1;
    public double X2;
    public double Y2;
}

/// <summary>Forma predefinida da caixa de texto (prstGeom + a:avLst) — retângulo de texto (oráculo txrect).</summary>
public sealed class TextboxGeom
{
    public string Prst = "";
    public Dictionary<string, double>? Adj;
}

public sealed class TextboxInsets
{
    public double L;
    public double T;
    public double R;
    public double B;
}

/// <summary>Caixa de texto de DrawingML (wps:txbx / VML v:textbox).</summary>
public sealed class DrawingTextbox
{
    public List<Paragraph> Paras = new();
    public double WidthTwips;
    public double HeightTwips;
    public bool Floating;
    public double? OffsetXTwips;
    public double? OffsetYTwips;
    public string? RelH;
    public string? RelV;
    public bool BehindDoc;
    /// <summary>wps:bodyPr/a:spAutoFit — a caixa AJUSTA a altura ao texto.</summary>
    public bool AutoFit;
    /// <summary>wps:bodyPr wrap="none" / VML mso-wrap-style:none — o texto NÃO quebra
    /// na largura da caixa (com AutoFit, a caixa toma a largura do texto)</summary>
    public bool NoWrap;
    /// <summary>margens internas (twips) do bodyPr (lIns/tIns/rIns/bIns).</summary>
    public TextboxInsets? Insets;
    public string? RawDrawingXml;
    public DrawingAnchor? Anchor;
    /// <summary>preenchimento/contorno da própria caixa.</summary>
    public ShapeStyle? Shape;
    /// <summary>espessura do contorno para o recuo do texto (wps), mesmo sem linha visível</summary>
    public LineInset? LineInset;
    /// <summary>forma predefinida que não é retângulo: o texto vai no retângulo de texto dela (oráculo txrect)</summary>
    public TextboxGeom? Geom;
    /// <summary>t | ctr | b — alinhamento vertical do texto.</summary>
    public string? VAnchor;
    /// <summary>rotação da caixa (graus, horário) — xfrm rot / VML rotation</summary>
    public double? Rot;
    /// <summary>WordArt (bodyPr fromWordArt / VML v:textpath): o texto é esticado para
    /// preencher a forma conforme a deformação (prstTxWarp, ex.: textPlain)</summary>
    public string? WordArt;
    /// <summary>Blocos em ordem (parágrafos + tabelas) do txbxContent.</summary>
    public List<Block>? Blocks;
    public bool Vml;
    /// <summary>wps:txbx@id — 1ª caixa de uma cadeia de caixas vinculadas (a história)</summary>
    public int? Story;
    /// <summary>wps:linkedTxbx — caixa seguinte de uma cadeia (sem conteúdo próprio): o id da
    /// história e a posição na cadeia (1, 2…)</summary>
    public TextboxLink? Link;
    /// <summary>VML: id do v:shape e o da caixa seguinte (mso-next-textbox) — viram Story/Link
    /// na leitura da parte (LinkVmlTextboxes)</summary>
    public string? VmlId;
    public string? VmlNext;
    /// <summary>direção do texto (wps:bodyPr vert ≠ horz; VML layout-flow): vert, vert270,
    /// eaVert, mongolianVert, wordArtVert, wordArtVertRtl</summary>
    public string? Vert;
    /// <summary>wps:bodyPr upright — o texto não gira com a forma</summary>
    public bool Upright;
    /// <summary>wp:docPr hidden (Painel de Seleção): não desenha nem afasta o texto</summary>
    public bool Hidden;
    /// <summary>cor do texto sem cor própria: a do wps:style/a:fontRef (medido: estilo de forma
    /// com fontRef lt1 deixa o texto branco) — RRGGBB ou @esquema|mods</summary>
    public string? FontColor;

    /// <summary>Cópia rasa ({ ...x }).</summary>
    public DrawingTextbox ShallowClone() => (DrawingTextbox)MemberwiseClone();
}

/// <summary>wps:linkedTxbx: o id da história e a posição na cadeia (1, 2…).</summary>
public sealed class TextboxLink
{
    public int Id;
    public int Seq;
}

/// <summary>Item de um grupo de desenho: retângulo relativo ao canto do grupo.</summary>
public sealed class GroupItem
{
    public double X;
    public double Y;
    public double W;
    public double H;
    public Run Run = new();
}

/// <summary>Grupo de desenho (wpg:wgp / v:group / tela wpc).</summary>
public sealed class DrawingGroup
{
    public double WidthTwips;
    public double HeightTwips;
    public bool Floating;
    public DrawingAnchor? Anchor;
    public List<GroupItem> Items = new();
    /// <summary>rotação (graus, horário) e espelhos do grupo — valem para todos os filhos</summary>
    public double? Rot;
    public bool FlipH;
    public bool FlipV;
    /// <summary>wp:docPr hidden (Painel de Seleção): não desenha nem afasta o texto</summary>
    public bool Hidden;

    /// <summary>Cópia rasa ({ ...x }).</summary>
    public DrawingGroup ShallowClone() => (DrawingGroup)MemberwiseClone();
}

/// <summary>Conteúdo inline definido por plugin (w:sdt com tag wordnext:inline:).</summary>
public sealed class CustomInline
{
    public string Type = "";
    /// <summary>JSON do payload (texto cru decodificado).</summary>
    public string? DataJson;
    public string FallbackText = "";
}

/// <summary>w:ptab — tab de posição absoluta.</summary>
public sealed class PtabInfo
{
    public string Alignment = "left";
    public string RelativeTo = "margin";
    public string? Leader;
}

/// <summary>Campo de formulário legado (w:ffData): caixa de seleção / texto / lista.
/// Lista (FORMDROPDOWN): entradas e o índice exibido.</summary>
public sealed class FormFieldInfo
{
    /// <summary>checkBox | textInput | dropDown</summary>
    public string Type = "checkBox";
    public bool? Checked;
    public double? SizeHalfPt;
    public bool SizeAuto;
    public List<string>? Entries;
    public int? Selected;
}

public sealed class NoteRef
{
    public string Kind = "footnote"; // footnote | endnote
    public int Id;
    /// <summary>w:customMarkFollows — a marca é o texto que segue (não consome número).</summary>
    public bool Custom;
}

/// <summary>
/// Nó de equação (OMML) — modelo mínimo para o layout: texto (m:r, com o estilo
/// m:sty e o w:rPr do run), fração (m:f) e quebra de linha (w:br num m:r). Os
/// demais objetos (índices, radicais, n-ários…) entram achatados como texto; os
/// delimitadores (m:d) viram os caracteres de abertura/separação/fechamento.
/// </summary>
public abstract class MathNode { }

/// <summary>m:r: texto com o estilo m:sty e o w:rPr do run</summary>
public sealed class MathRun : MathNode
{
    public string Text = "";
    public string? Sty;
    public RPr? Rpr;
}

/// <summary>m:f: fração (m:type: bar, noBar, skw, lin)</summary>
public sealed class MathFrac : MathNode
{
    public List<MathNode> Num = new();
    public List<MathNode> Den = new();
    public string? Type;
}

/// <summary>w:br num m:r: quebra de linha da equação</summary>
public sealed class MathBreak : MathNode
{
    public RPr? Rpr;
}

/// <summary>Equação de exibição (m:oMathPara): justificação (m:jc) e conteúdo.</summary>
public sealed class MathZone
{
    public string? Jc;
    public List<MathNode> Nodes = new();
}

public sealed class Run
{
    /// <summary>Para run de imagem, Text é o objeto de substituição U+FFFC.</summary>
    public string Text = "";
    public RunProps Props = new();
    public InlineImage? Image;
    /// <summary>Caixa de texto ancorada (DrawingML/VML).</summary>
    public DrawingTextbox? Textbox;
    public NoteRef? NoteRef;
    /// <summary>Instrução de campo (w:fldSimple w:instr), ex.: " PAGE ".</summary>
    public string? Field;
    /// <summary>Nó inline atômico registrado por plugin.</summary>
    public CustomInline? Custom;
    /// <summary>Formatação DIRETA completa do w:rPr (tri-estado) — motor de layout.</summary>
    public RPr? Rpr;
    /// <summary>Campo complexo: os runs FORMATADOS do resultado em cache.</summary>
    public List<Run>? FieldResult;
    /// <summary>Forma sem texto ancorada/inline.</summary>
    public DrawingShape? Shape;
    /// <summary>w:ptab — tab de posição absoluta (texto é um tab).</summary>
    public PtabInfo? Ptab;
    /// <summary>w:sym — fonte do símbolo (o texto já vem mapeado p/ a área F0xx).</summary>
    public string? SymFont;
    /// <summary>Grupo de desenho (wpg:wgp / v:group / tela wpc).</summary>
    public DrawingGroup? Group;
    /// <summary>Run dentro do RESULTADO de um campo TOC.</summary>
    public bool InToc;
    /// <summary>Campo de formulário legado (w:ffData).</summary>
    public FormFieldInfo? FormField;
    /// <summary>Equação de exibição (m:oMathPara) estruturada para o layout — Text guarda o
    /// texto achatado (edição/salvamento).</summary>
    public MathZone? Math;

    /// <summary>Cópia rasa ({ ...run }).</summary>
    public Run ShallowClone() => (Run)MemberwiseClone();
}

public sealed class NumberingProps
{
    public string Kind = "bullet"; // bullet | decimal
    public int Ilvl;
}

public sealed class TabStop
{
    public int PosTwips;
    public string Align = "left"; // left | center | right | decimal | bar | clear | num
    public string? Leader;        // dot | hyphen | underscore | heavy | middleDot
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
    /// <summary>Marca de parágrafo (¶) inserida em revisão (w:pPr/w:rPr/w:ins ou w:moveTo).</summary>
    public RevisionInfo? MarkIns;
    /// <summary>Marca de parágrafo excluída em revisão (w:pPr/w:rPr/w:del ou w:moveFrom): na
    /// visão final o parágrafo se junta ao seguinte.</summary>
    public RevisionInfo? MarkDel;
    /// <summary>Formatação de parágrafo controlada (w:pPrChange).</summary>
    public ParaFormatChange? Pfmt;

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
        MarkIns = MarkIns, MarkDel = MarkDel, Pfmt = Pfmt,
    };
}

public sealed class Paragraph
{
    public List<Run> Runs = new();
    public ParaProps Props = new();
    /// <summary>Formatação DIRETA completa do w:pPr (tri-estado) — motor de layout.</summary>
    public PPr? Ppr;
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
    /// <summary>w:titlePg — a 1ª página usa header/footer "first".</summary>
    public bool? TitlePg;
    /// <summary>w:pgMar/@w:header — distância do topo da página ao cabeçalho (twips).</summary>
    public int? HeaderDistanceTwips;
    /// <summary>w:pgMar/@w:footer — distância da base da página ao rodapé (twips).</summary>
    public int? FooterDistanceTwips;
    /// <summary>w:pgNumType/@w:start — número inicial de página da seção.</summary>
    public int? PgNumStart;
    /// <summary>w:pgNumType/@w:fmt — formato do número de página (ausente = decimal).</summary>
    public string? PgNumFmt;
    /// <summary>w:pgNumType/@w:chapStyle — nível do título (1–9) do número de capítulo.</summary>
    public int? PgNumChapStyle;
    /// <summary>w:pgNumType/@w:chapSep — separador capítulo–página (ausente = hífen).</summary>
    public string? PgNumChapSep;
    /// <summary>w:footnotePr / w:endnotePr da seção (sobre os do settings).</summary>
    public NoteProps? FootnotePr;
    public NoteProps? EndnotePr;
    /// <summary>w15:footnoteColumns — colunas da área de notas de rodapé (ausente = as da seção).</summary>
    public int? FootnoteColumns;
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
    /// <summary>w:tcPr completo (tri-estado) — motor de layout.</summary>
    public TcPr? TcPr;
    /// <summary>Conteúdo da célula NA ORDEM (parágrafos e tabelas aninhadas intercalados).</summary>
    public List<Block>? Blocks;

    /// <summary>Cópia rasa ({ ...cell }).</summary>
    public TableCell ShallowClone() => (TableCell)MemberwiseClone();
}

public sealed class TableRow
{
    public List<TableCell> Cells = new();
    /// <summary>w:trPr completo — motor de layout.</summary>
    public TrPr? TrPr;
    /// <summary>w:tblPrEx — exceções de propriedades da tabela nesta linha.</summary>
    public TblPr? TblPrEx;

    /// <summary>Cópia rasa ({ ...row }).</summary>
    public TableRow ShallowClone() => (TableRow)MemberwiseClone();
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
    /// <summary>w:tblPr completo (tri-estado) — motor de layout.</summary>
    public TblPr? TblPr;

    /// <summary>Cópia rasa ({ ...table }).</summary>
    public TableBlock ShallowClone() => (TableBlock)MemberwiseClone();
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
    /// <summary>w:sectPr completo (tipo de quebra, grade, bordas de página…) — motor de layout.</summary>
    public SectionProps? Sect;
    /// <summary>Cabeçalhos/rodapés como BLOCOS (tabelas preservadas) — motor de layout.</summary>
    public HfBlocks? HeaderBlocks;
    public HfBlocks? FooterBlocks;
}

/// <summary>Cabeçalhos/rodapés como blocos, por tipo.</summary>
public sealed class HfBlocks
{
    public List<Block>? Default;
    public List<Block>? First;
    public List<Block>? Even;
}

public sealed class ColDef
{
    public double W;
    public double Space;
}

public sealed class DocGridSpec
{
    public string? Type;
    public double? LinePitch;
    public double? CharSpace;
}

public sealed class PgBordersSpec
{
    public string? OffsetFrom;
    public string? Display;
    public string? ZOrder;
    public BorderSpec? Top;
    public BorderSpec? Left;
    public BorderSpec? Bottom;
    public BorderSpec? Right;
}

public sealed class LnNumTypeSpec
{
    public double? CountBy;
    public double? Start;
    public string? Restart;
    public double? Distance;
}

/// <summary>w:sectPr além da geometria básica do SectPr.</summary>
public sealed class SectionProps
{
    /// <summary>nextPage | continuous | evenPage | oddPage | nextColumn</summary>
    public string Type = "nextPage";
    /// <summary>portrait | landscape</summary>
    public string? Orient;
    public double? Gutter;
    /// <summary>colunas de largura desigual (w:col).</summary>
    public List<ColDef>? ColDefs;
    public bool? EqualWidth;
    /// <summary>w:vAlign — alinhamento vertical do texto na página.</summary>
    public string? VAlign;
    public DocGridSpec? DocGrid;
    public PgBordersSpec? PgBorders;
    /// <summary>w:pgNumType w:fmt</summary>
    public string? PgNumFmt;
    public LnNumTypeSpec? LnNumType;
    public bool Bidi;
    public bool RtlGutter;
    public bool FormProt;
    public bool NoEndnote;
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
    /// <summary>Ordem de inserção dos bookmarks (o Map do JS itera nessa ordem).</summary>
    public List<string> BookmarkOrder = new();
    /// <summary>Posição de cada bookmark no texto do parágrafo onde começa (Run.Text concatenado).</summary>
    public Dictionary<string, int>? BookmarkOffsets;
    /// <summary>Onde cada bookmark termina (w:bookmarkEnd): bloco e posição no texto do parágrafo — REF pelo trecho.</summary>
    public Dictionary<string, (int Block, int Offset)>? BookmarkEnds;
    /// <summary>Estilos/numeração/tema/configurações/fontes CRUS — motor de layout.</summary>
    public DocFormatting? Formatting;
    /// <summary>Notas como blocos (tabelas preservadas).</summary>
    public Dictionary<int, List<Block>>? FootnoteBlocks;
    public Dictionary<int, List<Block>>? EndnoteBlocks;
    /// <summary>docProps/core.xml (W3CDTF) — campos CREATEDATE/SAVEDATE/PRINTDATE.</summary>
    public CoreProps? CoreProps;
    /// <summary>w:background (cor da página): hex e/ou cor do tema com tom/sombra.</summary>
    public PageBackground? Background;

    /// <summary>Cópia rasa ({ ...full }).</summary>
    public FullDocument ShallowClone() => (FullDocument)MemberwiseClone();
}

/// <summary>Datas do docProps/core.xml (texto W3CDTF, como no arquivo).</summary>
public sealed class CoreProps
{
    public string? Created;
    public string? Modified;
    public string? LastPrinted;
}

/// <summary>w:document/w:background: cor hex e/ou cor do tema com tom/sombra e o
/// efeito de preenchimento (v:background/v:fill) — page-background.ts.</summary>
public sealed class PageBackground
{
    public string? Color;
    public string? ThemeColor;
    public string? ThemeTint;
    public string? ThemeShade;
    public PageFill? Fill;
}

/// <summary>Efeito de preenchimento da página (v:fill do v:background) — page-background.ts.</summary>
public sealed class PageFill
{
    /// <summary>gradient | gradientRadial | pattern | frame | tile</summary>
    public string Type = "gradient";
    /// <summary>cor 1 (fillcolor), RRGGBB</summary>
    public string? Color;
    /// <summary>cor 2 crua do VML ("blue", "fill darken(128)"…)</summary>
    public string? Color2;
    public double? Angle;
    /// <summary>foco em %</summary>
    public double? Focus;
    public (double X, double Y)? FocusPosition;
    public bool GradientCenter;
    public List<(double Pos, string Color)>? Colors;
    public string? Method;
    public string? Title;
    public (byte[] Data, string Ext)? Image;
    public bool TargetScreen;
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

using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using OfficeNext.Core;
using static OfficeNext.Core.MiniXml;

namespace OfficeNext.Docx;

/// <summary>
/// Propriedades OOXML de run/parágrafo/tabela em forma ESPARSA e TIPADA —
/// porta de docx-core/src/ooxml/props.ts. Campo nulo = não especificado (herda).
/// É a entrada do motor de layout (OfficeNext.DocxLayout), que faz a cascata do
/// Word. Diferente de RunProps/ParaProps (modelo de EDIÇÃO), aqui B = false
/// significa &lt;w:b w:val="0"/&gt; explícito.
///
/// Números são double (no JS tudo é number — evita divisão inteira no motor).
/// <c>With(over)</c> = <c>{ ...this, ...over }</c> do JS (raso, campo a campo).
/// </summary>
public sealed class ColorSpec
{
    /// <summary>RRGGBB ou 'auto'.</summary>
    public string? Val;
    public string? ThemeColor;
    /// <summary>00-FF em hex (fração do tint/shade).</summary>
    public string? ThemeTint;
    public string? ThemeShade;
}

public sealed class RFonts
{
    public string? Ascii;
    public string? HAnsi;
    public string? EastAsia;
    public string? Cs;
    public string? AsciiTheme;
    public string? HAnsiTheme;
    public string? EastAsiaTheme;
    public string? CsTheme;
    public string? Hint;

    public RFonts Clone() => (RFonts)MemberwiseClone();
}

public sealed class BorderSpec
{
    /// <summary>w:val (single, double, dashed, dotted, thick, nil, none…).</summary>
    public string Val = "single";
    /// <summary>oitavos de ponto.</summary>
    public double? Sz;
    /// <summary>pontos.</summary>
    public double? Space;
    public string? Color;
    public string? ThemeColor;
    public string? ThemeTint;
    public string? ThemeShade;
    public bool? Shadow;
    public bool? Frame;

    /// <summary>JSON.stringify do objeto (ordem de inserção de readBorder).</summary>
    public void AppendJson(StringBuilder sb)
    {
        sb.Append("{\"val\":").Append(Js.JsonString(Val));
        if (Sz is { } sz) sb.Append(",\"sz\":").Append(Js.JsonNumber(sz));
        if (Space is { } sp) sb.Append(",\"space\":").Append(Js.JsonNumber(sp));
        if (Color is not null) sb.Append(",\"color\":").Append(Js.JsonString(Color));
        if (ThemeColor is not null) sb.Append(",\"themeColor\":").Append(Js.JsonString(ThemeColor));
        if (ThemeTint is not null) sb.Append(",\"themeTint\":").Append(Js.JsonString(ThemeTint));
        if (ThemeShade is not null) sb.Append(",\"themeShade\":").Append(Js.JsonString(ThemeShade));
        if (Shadow is { } sh) sb.Append(",\"shadow\":").Append(sh ? "true" : "false");
        if (Frame is { } fr) sb.Append(",\"frame\":").Append(fr ? "true" : "false");
        sb.Append('}');
    }
}

public sealed class ShadingSpec
{
    /// <summary>padrão (clear, solid, pct10…, horzStripe…, nil).</summary>
    public string? Val;
    public string? Color;
    public string? Fill;
    public string? ThemeFill;
    public string? ThemeFillTint;
    public string? ThemeFillShade;
    public string? ThemeColor;
}

public sealed class UnderlineSpec
{
    public string Val = "single";
    public string? Color;
    public string? ThemeColor;
    /// <summary>00-FF em hex (fração do tint/shade da cor do tema).</summary>
    public string? ThemeTint;
    public string? ThemeShade;
}

public sealed class LangSpec
{
    public string? Val;
    public string? EastAsia;
    public string? Bidi;

    public LangSpec With(LangSpec? over) => new()
    {
        Val = over?.Val ?? Val,
        EastAsia = over?.EastAsia ?? EastAsia,
        Bidi = over?.Bidi ?? Bidi,
    };
}

/// <summary>
/// Autoria de uma revisão (w:ins, w:del, w:moveFrom/To, w:rPrChange, w:pPrChange
/// e as marcas de parágrafo). <c>Date</c> fica como está no arquivo — o Word grava a
/// hora LOCAL com sufixo Z — e <c>DateUtc</c> é o w16du:dateUtc (o instante real).
/// </summary>
public class RevisionInfo
{
    public string Author = "";
    public string? Date;
    public string? DateUtc;
    /// <summary>movimentação (w:moveFrom / w:moveTo)</summary>
    public bool Move;
}

/// <summary>w:rPrChange — formatação controlada: autoria e o rPr ANTERIOR.</summary>
public sealed class RPrChange : RevisionInfo
{
    public RPr RPr = new();
}

/// <summary>w:pPrChange — formatação de parágrafo controlada: autoria e o pPr ANTERIOR.</summary>
public sealed class PPrChange : RevisionInfo
{
    public PPr PPr = new();
}

/// <summary>w14:shadow: desfoque e deslocamento (pt), direção (graus).</summary>
public sealed class TextShadowSpec
{
    public double Blur;
    public double Dist;
    public double Dir;
}

public sealed class RPr
{
    public string? RStyle;
    public RFonts? RFonts;
    public bool? B;
    public bool? BCs;
    public bool? I;
    public bool? ICs;
    public bool? Caps;
    public bool? SmallCaps;
    public bool? Strike;
    public bool? Dstrike;
    public bool? Outline;
    public bool? Shadow;
    public bool? Emboss;
    public bool? Imprint;
    public bool? Vanish;
    public bool? SpecVanish;
    public bool? WebHidden;
    public bool? NoProof;
    public bool? SnapToGrid;
    public ColorSpec? Color;
    /// <summary>w:spacing — espaçamento entre caracteres (twips, pode ser negativo).</summary>
    public double? Spacing;
    /// <summary>w:w — escala horizontal (%).</summary>
    public double? W;
    /// <summary>w:kern — tamanho mínimo (half-points) para aplicar kerning.</summary>
    public double? Kern;
    /// <summary>w:position — deslocamento vertical (half-points, + sobe).</summary>
    public double? Position;
    /// <summary>half-points</summary>
    public double? Sz;
    public double? SzCs;
    public string? Highlight;
    public UnderlineSpec? U;
    public string? Effect;
    public BorderSpec? Bdr;
    public ShadingSpec? Shd;
    /// <summary>superscript | subscript | baseline</summary>
    public string? VertAlign;
    public bool? Rtl;
    public bool? Cs;
    public string? Em;
    public LangSpec? Lang;
    /// <summary>w14:textFill (Word 2010+): cor sólida e OPACIDADE (0..1) do texto —
    /// w14:alpha é transparência (100000 = invisível)</summary>
    public TextFillSpec? TextFill;
    /// <summary>w14:textOutline com preenchimento (contorno visível do texto)</summary>
    public bool? TextOutline;
    /// <summary>w14:shadow (sombra do texto, Word 2010+): desfoque e deslocamento em pt, direção em
    /// graus (0 = direita, 90 = para baixo) — a sombra aumenta a altura da linha</summary>
    public TextShadowSpec? TextShadow;
    /// <summary>w14:ligatures (Word 2010+): ligaduras OpenType — standard, contextual, historical,
    /// discretional, combinações ou all; none = desligadas</summary>
    public string? Ligatures;
    /// <summary>w:rPrChange — formatação controlada: autoria e o rPr ANTERIOR.</summary>
    public RPrChange? Change;

    public RPr Clone() => (RPr)MemberwiseClone();

    /// <summary>{ ...this, ...over } (raso).</summary>
    public RPr With(RPr? over)
    {
        var o = Clone();
        if (over is null) return o;
        if (over.RStyle is not null) o.RStyle = over.RStyle;
        if (over.RFonts is not null) o.RFonts = over.RFonts;
        for (int k = 0; k < ToggleCount; k++) if (over.GetToggle(k) is { } t) o.SetToggle(k, t);
        if (over.SpecVanish is not null) o.SpecVanish = over.SpecVanish;
        if (over.WebHidden is not null) o.WebHidden = over.WebHidden;
        if (over.NoProof is not null) o.NoProof = over.NoProof;
        if (over.SnapToGrid is not null) o.SnapToGrid = over.SnapToGrid;
        if (over.Color is not null) o.Color = over.Color;
        if (over.Spacing is not null) o.Spacing = over.Spacing;
        if (over.W is not null) o.W = over.W;
        if (over.Kern is not null) o.Kern = over.Kern;
        if (over.Position is not null) o.Position = over.Position;
        if (over.Sz is not null) o.Sz = over.Sz;
        if (over.SzCs is not null) o.SzCs = over.SzCs;
        if (over.Highlight is not null) o.Highlight = over.Highlight;
        if (over.U is not null) o.U = over.U;
        if (over.Effect is not null) o.Effect = over.Effect;
        if (over.Bdr is not null) o.Bdr = over.Bdr;
        if (over.Shd is not null) o.Shd = over.Shd;
        if (over.VertAlign is not null) o.VertAlign = over.VertAlign;
        if (over.Rtl is not null) o.Rtl = over.Rtl;
        if (over.Cs is not null) o.Cs = over.Cs;
        if (over.Em is not null) o.Em = over.Em;
        if (over.Lang is not null) o.Lang = over.Lang;
        if (over.TextFill is not null) o.TextFill = over.TextFill;
        if (over.TextOutline is not null) o.TextOutline = over.TextOutline;
        if (over.TextShadow is not null) o.TextShadow = over.TextShadow;
        if (over.Ligatures is not null) o.Ligatures = over.Ligatures;
        if (over.Change is not null) o.Change = over.Change;
        return o;
    }

    /// <summary>Alternáveis (TOGGLES do motor): b, bCs, i, iCs, caps, smallCaps,
    /// strike, dstrike, outline, shadow, emboss, imprint, vanish.</summary>
    public const int ToggleCount = 13;

    public bool? GetToggle(int k) => k switch
    {
        0 => B, 1 => BCs, 2 => I, 3 => ICs, 4 => Caps, 5 => SmallCaps, 6 => Strike,
        7 => Dstrike, 8 => Outline, 9 => Shadow, 10 => Emboss, 11 => Imprint, 12 => Vanish,
        _ => throw new ArgumentOutOfRangeException(nameof(k)),
    };

    public void SetToggle(int k, bool? v)
    {
        switch (k)
        {
            case 0: B = v; break;
            case 1: BCs = v; break;
            case 2: I = v; break;
            case 3: ICs = v; break;
            case 4: Caps = v; break;
            case 5: SmallCaps = v; break;
            case 6: Strike = v; break;
            case 7: Dstrike = v; break;
            case 8: Outline = v; break;
            case 9: Shadow = v; break;
            case 10: Emboss = v; break;
            case 11: Imprint = v; break;
            case 12: Vanish = v; break;
            default: throw new ArgumentOutOfRangeException(nameof(k));
        }
    }
}

public sealed class TextFillSpec
{
    public string? Color;
    public string? ThemeColor;
    public double? Alpha;
}

public sealed class TabSpec
{
    /// <summary>left | center | right | decimal | bar | clear | num</summary>
    public string Val = "left";
    /// <summary>twips (pode ser negativo).</summary>
    public double Pos;
    /// <summary>none | dot | hyphen | underscore | heavy | middleDot</summary>
    public string? Leader;
}

public sealed class SpacingSpec
{
    public double? Before;
    public double? BeforeLines;
    public bool? BeforeAutospacing;
    public double? After;
    public double? AfterLines;
    public bool? AfterAutospacing;
    public double? Line;
    /// <summary>auto | exact | atLeast</summary>
    public string? LineRule;

    public SpacingSpec With(SpacingSpec? over)
    {
        var o = (SpacingSpec)MemberwiseClone();
        if (over is null) return o;
        if (over.Before is not null) o.Before = over.Before;
        if (over.BeforeLines is not null) o.BeforeLines = over.BeforeLines;
        if (over.BeforeAutospacing is not null) o.BeforeAutospacing = over.BeforeAutospacing;
        if (over.After is not null) o.After = over.After;
        if (over.AfterLines is not null) o.AfterLines = over.AfterLines;
        if (over.AfterAutospacing is not null) o.AfterAutospacing = over.AfterAutospacing;
        if (over.Line is not null) o.Line = over.Line;
        if (over.LineRule is not null) o.LineRule = over.LineRule;
        return o;
    }
}

/// <summary>
/// w:ind — guarda a ORDEM de inserção das chaves como um objeto JS (o motor
/// identifica grupos de bordas por JSON.stringify([pBdr, ind])): atribuir uma
/// chave nova a põe no fim, reatribuir mantém a posição, nulo remove.
/// </summary>
public sealed class IndSpec
{
    private static readonly string[] Names = { "left", "right", "hanging", "firstLine", "leftChars", "rightChars", "hangingChars", "firstLineChars" };
    private readonly double?[] _v = new double?[8];
    private List<int> _order = new();

    private double? Get(int k) => _v[k];
    private void Set(int k, double? v)
    {
        if (v is null) { _v[k] = null; _order.Remove(k); return; }
        if (_v[k] is null) _order.Add(k);
        _v[k] = v;
    }

    public double? Left { get => Get(0); set => Set(0, value); }
    public double? Right { get => Get(1); set => Set(1, value); }
    public double? Hanging { get => Get(2); set => Set(2, value); }
    public double? FirstLine { get => Get(3); set => Set(3, value); }
    public double? LeftChars { get => Get(4); set => Set(4, value); }
    public double? RightChars { get => Get(5); set => Set(5, value); }
    public double? HangingChars { get => Get(6); set => Set(6, value); }
    public double? FirstLineChars { get => Get(7); set => Set(7, value); }

    public IndSpec Clone()
    {
        var o = new IndSpec();
        Array.Copy(_v, o._v, 8);
        o._order = new List<int>(_order);
        return o;
    }

    /// <summary>{ ...this, ...over }</summary>
    public IndSpec With(IndSpec? over)
    {
        var o = Clone();
        if (over is null) return o;
        foreach (int k in over._order) o.Set(k, over._v[k]);
        return o;
    }

    /// <summary>JSON.stringify(ind) do JS (ordem de inserção).</summary>
    public void AppendJson(StringBuilder sb)
    {
        sb.Append('{');
        for (int i = 0; i < _order.Count; i++)
        {
            if (i > 0) sb.Append(',');
            int k = _order[i];
            sb.Append('"').Append(Names[k]).Append("\":").Append(Js.JsonNumber(_v[k]!.Value));
        }
        sb.Append('}');
    }
}

public sealed class FramePr
{
    /// <summary>none | drop | margin</summary>
    public string? DropCap;
    public double? Lines;
    public double? W;
    public double? H;
    public string? HRule;
    public double? HSpace;
    public double? VSpace;
    public string? Wrap;
    public string? HAnchor;
    public string? VAnchor;
    public double? X;
    public double? Y;
    public string? XAlign;
    public string? YAlign;
    public bool? AnchorLock;

    public FramePr With(FramePr? over)
    {
        var o = (FramePr)MemberwiseClone();
        if (over is null) return o;
        if (over.DropCap is not null) o.DropCap = over.DropCap;
        if (over.Lines is not null) o.Lines = over.Lines;
        if (over.W is not null) o.W = over.W;
        if (over.H is not null) o.H = over.H;
        if (over.HRule is not null) o.HRule = over.HRule;
        if (over.HSpace is not null) o.HSpace = over.HSpace;
        if (over.VSpace is not null) o.VSpace = over.VSpace;
        if (over.Wrap is not null) o.Wrap = over.Wrap;
        if (over.HAnchor is not null) o.HAnchor = over.HAnchor;
        if (over.VAnchor is not null) o.VAnchor = over.VAnchor;
        if (over.X is not null) o.X = over.X;
        if (over.Y is not null) o.Y = over.Y;
        if (over.XAlign is not null) o.XAlign = over.XAlign;
        if (over.YAlign is not null) o.YAlign = over.YAlign;
        if (over.AnchorLock is not null) o.AnchorLock = over.AnchorLock;
        return o;
    }
}

/// <summary>
/// w:pBdr — guarda a ORDEM de inserção das chaves (o motor compara grupos de
/// bordas por JSON.stringify, que depende da ordem das chaves no JS).
/// </summary>
public sealed class PBdr
{
    private readonly List<KeyValuePair<string, BorderSpec>> _items = new();

    public BorderSpec? Get(string side)
    {
        foreach (var kv in _items) if (kv.Key == side) return kv.Value;
        return null;
    }

    public void Set(string side, BorderSpec b)
    {
        for (int i = 0; i < _items.Count; i++)
            if (_items[i].Key == side) { _items[i] = new(side, b); return; }
        _items.Add(new(side, b));
    }

    public void Remove(string side) => _items.RemoveAll(kv => kv.Key == side);

    public IReadOnlyList<KeyValuePair<string, BorderSpec>> Items => _items;

    public BorderSpec? Top => Get("top");
    public BorderSpec? Left => Get("left");
    public BorderSpec? Bottom => Get("bottom");
    public BorderSpec? Right => Get("right");
    public BorderSpec? Between => Get("between");
    public BorderSpec? Bar => Get("bar");

    /// <summary>{ ...this, ...over }</summary>
    public PBdr With(PBdr? over)
    {
        var o = new PBdr();
        foreach (var kv in _items) o._items.Add(kv);
        if (over is not null) foreach (var kv in over._items) o.Set(kv.Key, kv.Value);
        return o;
    }

    /// <summary>JSON.stringify(pBdr) do JS.</summary>
    public string ToJson()
    {
        var sb = new StringBuilder("{");
        for (int i = 0; i < _items.Count; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append(Js.JsonString(_items[i].Key)).Append(':');
            _items[i].Value.AppendJson(sb);
        }
        return sb.Append('}').ToString();
    }
}

public sealed class NumPr
{
    public double? NumId;
    public double? Ilvl;

    public NumPr With(NumPr? over) => new()
    {
        NumId = over?.NumId ?? NumId,
        Ilvl = over?.Ilvl ?? Ilvl,
    };
}

public sealed class PPr
{
    public string? PStyle;
    public bool? KeepNext;
    public bool? KeepLines;
    public bool? PageBreakBefore;
    public FramePr? FramePr;
    public bool? WidowControl;
    /// <summary>numId 0 = remove a numeração herdada.</summary>
    public NumPr? NumPr;
    public bool? SuppressLineNumbers;
    public PBdr? PBdr;
    public ShadingSpec? Shd;
    public List<TabSpec>? Tabs;
    public bool? SuppressAutoHyphens;
    public bool? Kinsoku;
    public bool? WordWrap;
    public bool? OverflowPunct;
    public bool? AutoSpaceDE;
    public bool? AutoSpaceDN;
    public bool? Bidi;
    public bool? AdjustRightInd;
    public bool? SnapToGrid;
    public SpacingSpec? Spacing;
    public IndSpec? Ind;
    public bool? ContextualSpacing;
    public bool? MirrorIndents;
    public bool? SuppressOverlap;
    public string? Jc;
    public string? TextAlignment;
    public double? OutlineLvl;
    /// <summary>rPr da MARCA de parágrafo (¶) — define a altura de parágrafo vazio.</summary>
    public RPr? RPr;
    /// <summary>marca de parágrafo excluída em revisão (w:rPr/w:del ou w:moveFrom): na
    /// visão final o parágrafo se junta ao seguinte.</summary>
    public bool? MarkDeleted;
    /// <summary>autoria da marca de parágrafo inserida (w:rPr/w:ins ou w:moveTo)</summary>
    public RevisionInfo? MarkIns;
    /// <summary>autoria da marca de parágrafo excluída (acompanha MarkDeleted)</summary>
    public RevisionInfo? MarkDel;
    /// <summary>w:pPrChange — formatação de parágrafo controlada: autoria e o pPr ANTERIOR.</summary>
    public PPrChange? Change;

    public PPr Clone() => (PPr)MemberwiseClone();

    /// <summary>{ ...this, ...over } (raso).</summary>
    public PPr With(PPr? over)
    {
        var o = Clone();
        if (over is null) return o;
        if (over.PStyle is not null) o.PStyle = over.PStyle;
        if (over.KeepNext is not null) o.KeepNext = over.KeepNext;
        if (over.KeepLines is not null) o.KeepLines = over.KeepLines;
        if (over.PageBreakBefore is not null) o.PageBreakBefore = over.PageBreakBefore;
        if (over.FramePr is not null) o.FramePr = over.FramePr;
        if (over.WidowControl is not null) o.WidowControl = over.WidowControl;
        if (over.NumPr is not null) o.NumPr = over.NumPr;
        if (over.SuppressLineNumbers is not null) o.SuppressLineNumbers = over.SuppressLineNumbers;
        if (over.PBdr is not null) o.PBdr = over.PBdr;
        if (over.Shd is not null) o.Shd = over.Shd;
        if (over.Tabs is not null) o.Tabs = over.Tabs;
        if (over.SuppressAutoHyphens is not null) o.SuppressAutoHyphens = over.SuppressAutoHyphens;
        if (over.Kinsoku is not null) o.Kinsoku = over.Kinsoku;
        if (over.WordWrap is not null) o.WordWrap = over.WordWrap;
        if (over.OverflowPunct is not null) o.OverflowPunct = over.OverflowPunct;
        if (over.AutoSpaceDE is not null) o.AutoSpaceDE = over.AutoSpaceDE;
        if (over.AutoSpaceDN is not null) o.AutoSpaceDN = over.AutoSpaceDN;
        if (over.Bidi is not null) o.Bidi = over.Bidi;
        if (over.AdjustRightInd is not null) o.AdjustRightInd = over.AdjustRightInd;
        if (over.SnapToGrid is not null) o.SnapToGrid = over.SnapToGrid;
        if (over.Spacing is not null) o.Spacing = over.Spacing;
        if (over.Ind is not null) o.Ind = over.Ind;
        if (over.ContextualSpacing is not null) o.ContextualSpacing = over.ContextualSpacing;
        if (over.MirrorIndents is not null) o.MirrorIndents = over.MirrorIndents;
        if (over.SuppressOverlap is not null) o.SuppressOverlap = over.SuppressOverlap;
        if (over.Jc is not null) o.Jc = over.Jc;
        if (over.TextAlignment is not null) o.TextAlignment = over.TextAlignment;
        if (over.OutlineLvl is not null) o.OutlineLvl = over.OutlineLvl;
        if (over.RPr is not null) o.RPr = over.RPr;
        if (over.MarkDeleted is not null) o.MarkDeleted = over.MarkDeleted;
        if (over.MarkIns is not null) o.MarkIns = over.MarkIns;
        if (over.MarkDel is not null) o.MarkDel = over.MarkDel;
        if (over.Change is not null) o.Change = over.Change;
        return o;
    }
}

public sealed class WidthSpec
{
    public double W;
    /// <summary>dxa (twips) | pct (50ºs de %) | auto | nil</summary>
    public string Type = "dxa";
}

/// <summary>Bordas de tabela/célula (TblBorders e TcBorders do TS: mesmo leitor).</summary>
public sealed class TblBorders
{
    public BorderSpec? Top;
    public BorderSpec? Left;
    public BorderSpec? Bottom;
    public BorderSpec? Right;
    public BorderSpec? InsideH;
    public BorderSpec? InsideV;
    public BorderSpec? Tl2br;
    public BorderSpec? Tr2bl;

    public BorderSpec? Get(string side) => side switch
    {
        "top" => Top, "left" => Left, "bottom" => Bottom, "right" => Right,
        "insideH" => InsideH, "insideV" => InsideV, "tl2br" => Tl2br, "tr2bl" => Tr2bl, _ => null,
    };

    public TblBorders With(TblBorders? over)
    {
        var o = (TblBorders)MemberwiseClone();
        if (over is null) return o;
        if (over.Top is not null) o.Top = over.Top;
        if (over.Left is not null) o.Left = over.Left;
        if (over.Bottom is not null) o.Bottom = over.Bottom;
        if (over.Right is not null) o.Right = over.Right;
        if (over.InsideH is not null) o.InsideH = over.InsideH;
        if (over.InsideV is not null) o.InsideV = over.InsideV;
        if (over.Tl2br is not null) o.Tl2br = over.Tl2br;
        if (over.Tr2bl is not null) o.Tr2bl = over.Tr2bl;
        return o;
    }
}

public sealed class CellMargins
{
    public WidthSpec? Top;
    public WidthSpec? Left;
    public WidthSpec? Bottom;
    public WidthSpec? Right;

    public CellMargins With(CellMargins? over)
    {
        var o = (CellMargins)MemberwiseClone();
        if (over is null) return o;
        if (over.Top is not null) o.Top = over.Top;
        if (over.Left is not null) o.Left = over.Left;
        if (over.Bottom is not null) o.Bottom = over.Bottom;
        if (over.Right is not null) o.Right = over.Right;
        return o;
    }
}

public sealed class TblLook
{
    public bool? FirstRow;
    public bool? LastRow;
    public bool? FirstColumn;
    public bool? LastColumn;
    public bool? NoHBand;
    public bool? NoVBand;

    public TblLook With(TblLook? over)
    {
        var o = (TblLook)MemberwiseClone();
        if (over is null) return o;
        if (over.FirstRow is not null) o.FirstRow = over.FirstRow;
        if (over.LastRow is not null) o.LastRow = over.LastRow;
        if (over.FirstColumn is not null) o.FirstColumn = over.FirstColumn;
        if (over.LastColumn is not null) o.LastColumn = over.LastColumn;
        if (over.NoHBand is not null) o.NoHBand = over.NoHBand;
        if (over.NoVBand is not null) o.NoVBand = over.NoVBand;
        return o;
    }
}

public sealed class TblpPr
{
    public double? LeftFromText;
    public double? RightFromText;
    public double? TopFromText;
    public double? BottomFromText;
    /// <summary>text | margin | page</summary>
    public string? VertAnchor;
    public string? HorzAnchor;
    public string? TblpXSpec;
    public double? TblpX;
    public string? TblpYSpec;
    public double? TblpY;
}

public sealed class TblPr
{
    public string? TblStyle;
    public TblpPr? TblpPr;
    public string? TblOverlap;
    public bool? BidiVisual;
    public double? TblStyleRowBandSize;
    public double? TblStyleColBandSize;
    public WidthSpec? TblW;
    public string? Jc;
    public WidthSpec? TblCellSpacing;
    public WidthSpec? TblInd;
    public TblBorders? TblBorders;
    public ShadingSpec? Shd;
    /// <summary>fixed | autofit</summary>
    public string? TblLayout;
    public CellMargins? TblCellMar;
    public TblLook? TblLook;

    public TblPr Clone() => (TblPr)MemberwiseClone();

    public TblPr With(TblPr? over)
    {
        var o = Clone();
        if (over is null) return o;
        if (over.TblStyle is not null) o.TblStyle = over.TblStyle;
        if (over.TblpPr is not null) o.TblpPr = over.TblpPr;
        if (over.TblOverlap is not null) o.TblOverlap = over.TblOverlap;
        if (over.BidiVisual is not null) o.BidiVisual = over.BidiVisual;
        if (over.TblStyleRowBandSize is not null) o.TblStyleRowBandSize = over.TblStyleRowBandSize;
        if (over.TblStyleColBandSize is not null) o.TblStyleColBandSize = over.TblStyleColBandSize;
        if (over.TblW is not null) o.TblW = over.TblW;
        if (over.Jc is not null) o.Jc = over.Jc;
        if (over.TblCellSpacing is not null) o.TblCellSpacing = over.TblCellSpacing;
        if (over.TblInd is not null) o.TblInd = over.TblInd;
        if (over.TblBorders is not null) o.TblBorders = over.TblBorders;
        if (over.Shd is not null) o.Shd = over.Shd;
        if (over.TblLayout is not null) o.TblLayout = over.TblLayout;
        if (over.TblCellMar is not null) o.TblCellMar = over.TblCellMar;
        if (over.TblLook is not null) o.TblLook = over.TblLook;
        return o;
    }
}

public sealed class TrHeight
{
    public double Val;
    /// <summary>auto | exact | atLeast</summary>
    public string HRule = "atLeast";
}

public sealed class TrPr
{
    public string? CnfStyle;
    public double? GridBefore;
    public double? GridAfter;
    public WidthSpec? WBefore;
    public WidthSpec? WAfter;
    public bool? CantSplit;
    public TrHeight? TrHeight;
    public bool? TblHeader;
    public WidthSpec? TblCellSpacing;
    public string? Jc;
    public bool? Hidden;

    public TrPr With(TrPr? over)
    {
        var o = (TrPr)MemberwiseClone();
        if (over is null) return o;
        if (over.CnfStyle is not null) o.CnfStyle = over.CnfStyle;
        if (over.GridBefore is not null) o.GridBefore = over.GridBefore;
        if (over.GridAfter is not null) o.GridAfter = over.GridAfter;
        if (over.WBefore is not null) o.WBefore = over.WBefore;
        if (over.WAfter is not null) o.WAfter = over.WAfter;
        if (over.CantSplit is not null) o.CantSplit = over.CantSplit;
        if (over.TrHeight is not null) o.TrHeight = over.TrHeight;
        if (over.TblHeader is not null) o.TblHeader = over.TblHeader;
        if (over.TblCellSpacing is not null) o.TblCellSpacing = over.TblCellSpacing;
        if (over.Jc is not null) o.Jc = over.Jc;
        if (over.Hidden is not null) o.Hidden = over.Hidden;
        return o;
    }
}

public sealed class TcPr
{
    public string? CnfStyle;
    public WidthSpec? TcW;
    public double? GridSpan;
    /// <summary>restart | continue</summary>
    public string? HMerge;
    public string? VMerge;
    public TblBorders? TcBorders;
    public ShadingSpec? Shd;
    public bool? NoWrap;
    public CellMargins? TcMar;
    public string? TextDirection;
    public bool? TcFitText;
    /// <summary>top | center | bottom | both</summary>
    public string? VAlign;
    public bool? HideMark;

    public TcPr Clone() => (TcPr)MemberwiseClone();

    public TcPr With(TcPr? over)
    {
        var o = Clone();
        if (over is null) return o;
        if (over.CnfStyle is not null) o.CnfStyle = over.CnfStyle;
        if (over.TcW is not null) o.TcW = over.TcW;
        if (over.GridSpan is not null) o.GridSpan = over.GridSpan;
        if (over.HMerge is not null) o.HMerge = over.HMerge;
        if (over.VMerge is not null) o.VMerge = over.VMerge;
        if (over.TcBorders is not null) o.TcBorders = over.TcBorders;
        if (over.Shd is not null) o.Shd = over.Shd;
        if (over.NoWrap is not null) o.NoWrap = over.NoWrap;
        if (over.TcMar is not null) o.TcMar = over.TcMar;
        if (over.TextDirection is not null) o.TextDirection = over.TextDirection;
        if (over.TcFitText is not null) o.TcFitText = over.TcFitText;
        if (over.VAlign is not null) o.VAlign = over.VAlign;
        if (over.HideMark is not null) o.HideMark = over.HideMark;
        return o;
    }
}

/// <summary>Utilitários com semântica JS usados pelos leitores e pelo motor.</summary>
public static class Js
{
    /// <summary>parseInt(v, 10) (NaN quando não há dígitos).</summary>
    public static double ParseInt(string? v) => JsNumber.ParseInt(v, 10);

    public static double ParseFloat(string? v) => JsNumber.ParseFloat(v);

    /// <summary>`parseInt(x) || 0` do JS (NaN e 0 viram 0).</summary>
    public static double IntOr0(string? v)
    {
        double n = JsNumber.ParseInt(v, 10);
        return double.IsNaN(n) ? 0 : n;
    }

    /// <summary>`parseFloat(x) || 0`.</summary>
    public static double FloatOr0(string? v)
    {
        double n = JsNumber.ParseFloat(v);
        return double.IsNaN(n) ? 0 : n;
    }

    /// <summary>Math.round do JS.</summary>
    public static double Round(double x) => JsNumber.Round(x);

    /// <summary>String(n) do JS.</summary>
    public static string Str(double n) => JsNumber.ToString(n);

    /// <summary>"truthy" de string do JS (não nula e não vazia).</summary>
    public static bool Truthy(string? s) => !string.IsNullOrEmpty(s);

    /// <summary>JSON.stringify de string.</summary>
    public static string JsonString(string s)
    {
        var sb = new StringBuilder(s.Length + 2);
        sb.Append('"');
        foreach (char c in s)
        {
            switch (c)
            {
                case '"': sb.Append("\\\""); break;
                case '\\': sb.Append("\\\\"); break;
                case '\b': sb.Append("\\b"); break;
                case '\f': sb.Append("\\f"); break;
                case '\n': sb.Append("\\n"); break;
                case '\r': sb.Append("\\r"); break;
                case '\t': sb.Append("\\t"); break;
                default:
                    if (c < 0x20 || char.IsSurrogate(c) && !IsPairedSurrogate(s, c))
                        sb.Append("\\u").Append(((int)c).ToString("x4", CultureInfo.InvariantCulture));
                    else sb.Append(c);
                    break;
            }
        }
        return sb.Append('"').ToString();
    }

    // simplificação: o JSON.stringify do JS escapa surrogates ÓRFÃOS; aqui
    // tratamos todos os surrogates como pareados (texto vindo de XML válido)
    private static bool IsPairedSurrogate(string s, char c) => true;

    /// <summary>JSON.stringify de número (NaN/Infinity → null).</summary>
    public static string JsonNumber(double n) => double.IsFinite(n) ? JsNumber.ToString(n) : "null";

    /// <summary>"Array.from(str)" — divide em code points (pares de surrogates juntos).</summary>
    public static List<string> CodePoints(string s)
    {
        var outp = new List<string>(s.Length);
        for (int i = 0; i < s.Length; i++)
        {
            if (char.IsHighSurrogate(s[i]) && i + 1 < s.Length && char.IsLowSurrogate(s[i + 1]))
            {
                outp.Add(s.Substring(i, 2));
                i++;
            }
            else outp.Add(s[i].ToString());
        }
        return outp;
    }

    /// <summary>str.codePointAt(0)</summary>
    public static int CodePointAt0(string s)
    {
        if (s.Length >= 2 && char.IsHighSurrogate(s[0]) && char.IsLowSurrogate(s[1]))
            return char.ConvertToUtf32(s[0], s[1]);
        return s[0];
    }

    /// <summary>String.fromCodePoint(cp) (surrogate isolado vira o próprio char).</summary>
    public static string FromCodePoint(int cp)
    {
        if (cp >= 0xD800 && cp <= 0xDFFF) return ((char)cp).ToString();
        return char.ConvertFromUtf32(cp);
    }

    /// <summary>String.fromCharCode(code) (16 bits).</summary>
    public static string FromCharCode(int code) => ((char)(code & 0xFFFF)).ToString();

    /// <summary>str.toUpperCase() do JS (mapeamento Unicode invariante, sem cultura).</summary>
    public static string ToUpper(string s)
    {
        string u = s.ToUpperInvariant();
        // mapeamentos incondicionais do SpecialCasing (o JS expande; o .NET não)
        foreach (char c in s)
        {
            if (SpecialUpper.ContainsKey(c))
            {
                var sb = new StringBuilder(s.Length + 4);
                foreach (char ch in s) sb.Append(SpecialUpper.TryGetValue(ch, out var m) ? m : char.ToUpperInvariant(ch).ToString());
                return sb.ToString();
            }
        }
        return u;
    }

    private static readonly Dictionary<char, string> SpecialUpper = new()
    {
        ['ß'] = "SS", ['ŉ'] = "ʼN", ['ǰ'] = "J̌", ['ΐ'] = "Ϊ́", ['ΰ'] = "Ϋ́", ['և'] = "ԵՒ",
        ['ẖ'] = "H̱", ['ẗ'] = "T̈", ['ẘ'] = "W̊", ['ẙ'] = "Y̊", ['ẚ'] = "Aʾ",
        ['ﬀ'] = "FF", ['ﬁ'] = "FI", ['ﬂ'] = "FL", ['ﬃ'] = "FFI", ['ﬄ'] = "FFL", ['ﬅ'] = "ST", ['ﬆ'] = "ST",
        ['ﬓ'] = "ՄՆ", ['ﬔ'] = "ՄԵ", ['ﬕ'] = "ՄԻ", ['ﬖ'] = "ՎՆ", ['ﬗ'] = "ՄԽ",
    };

    /// <summary>str.toLowerCase() do JS.</summary>
    public static string ToLower(string s) => s.ToLowerInvariant();
}

/// <summary>Leitura das propriedades (porta das funções read* de props.ts).</summary>
public static class OoxmlProps
{
    private static double? Int(string? v)
    {
        if (v is null || v == "") return null;
        double n = Js.ParseInt(v);
        return double.IsFinite(n) ? n : null;
    }

    public static RevisionInfo ReadRevisionInfo(XmlElement el) => FillRevisionInfo(new RevisionInfo(), el);

    /// <summary>Autoria (w:author, w:date, w16du:dateUtc, movimentação) num objeto de revisão.</summary>
    private static T FillRevisionInfo<T>(T info, XmlElement el) where T : RevisionInfo
    {
        info.Author = el.Attr("w:author") ?? "";
        if (Js.Truthy(el.Attr("w:date"))) info.Date = el.Attr("w:date");
        if (Js.Truthy(el.Attr("w16du:dateUtc"))) info.DateUtc = el.Attr("w16du:dateUtc");
        if (el.Name is "w:moveFrom" or "w:moveTo") info.Move = true;
        return info;
    }

    private static readonly Regex MeasureRe = new(@"^(-?[0-9.]+)(mm|cm|in|pt|pc|pi)?\z",RegexOptions.CultureInvariant);

    /// <summary>Medida de "universal measure" (twips por padrão; aceita "12pt", "1in"…).</summary>
    public static double? MeasureTwips(string? v)
    {
        if (v is null || v == "") return null;
        var m = MeasureRe.Match(v.Trim());
        if (!m.Success) return null;
        double n = Js.ParseFloat(m.Groups[1].Value);
        return m.Groups[2].Success ? m.Groups[2].Value switch
        {
            "mm" => Js.Round((n / 25.4) * 1440),
            "cm" => Js.Round((n / 2.54) * 1440),
            "in" => Js.Round(n * 1440),
            "pt" => Js.Round(n * 20),
            _ => Js.Round(n * 240), // pc | pi
        } : Js.Round(n);
    }

    /// <summary>ST_OnOff: ausência de w:val = true; "0"/"false"/"off" = false.</summary>
    public static bool OnOffVal(XmlElement el)
    {
        string? v = el.Attr("w:val");
        return !(v == "0" || v == "false" || v == "off" || v == "none");
    }

    private static bool OnOffAttr(string? v) => !(v == "0" || v == "false" || v == "off");

    private static ColorSpec ColorOf(XmlElement el)
    {
        var c = new ColorSpec();
        if (el.Attr("w:val") is { } val) c.Val = val;
        if (Js.Truthy(el.Attr("w:themeColor"))) c.ThemeColor = el.Attr("w:themeColor");
        if (Js.Truthy(el.Attr("w:themeTint"))) c.ThemeTint = el.Attr("w:themeTint");
        if (Js.Truthy(el.Attr("w:themeShade"))) c.ThemeShade = el.Attr("w:themeShade");
        return c;
    }

    public static BorderSpec? ReadBorder(XmlElement? el)
    {
        if (el is null) return null;
        var b = new BorderSpec { Val = el.Attr("w:val") ?? "single" };
        if (Int(el.Attr("w:sz")) is { } sz) b.Sz = sz;
        if (Int(el.Attr("w:space")) is { } space) b.Space = space;
        if (Js.Truthy(el.Attr("w:color"))) b.Color = el.Attr("w:color");
        if (Js.Truthy(el.Attr("w:themeColor"))) b.ThemeColor = el.Attr("w:themeColor");
        if (Js.Truthy(el.Attr("w:themeTint"))) b.ThemeTint = el.Attr("w:themeTint");
        if (Js.Truthy(el.Attr("w:themeShade"))) b.ThemeShade = el.Attr("w:themeShade");
        if (el.Attr("w:shadow") is { } sh) b.Shadow = OnOffAttr(sh);
        if (el.Attr("w:frame") is { } fr) b.Frame = OnOffAttr(fr);
        return b;
    }

    public static ShadingSpec? ReadShading(XmlElement? el)
    {
        if (el is null) return null;
        return new ShadingSpec
        {
            Val = el.Attr("w:val"),
            Color = el.Attr("w:color"),
            Fill = el.Attr("w:fill"),
            ThemeFill = el.Attr("w:themeFill"),
            ThemeFillTint = el.Attr("w:themeFillTint"),
            ThemeFillShade = el.Attr("w:themeFillShade"),
            ThemeColor = el.Attr("w:themeColor"),
        };
    }

    private static WidthSpec? ReadWidth(XmlElement? el)
    {
        if (el is null) return null;
        string type = el.Attr("w:type") ?? "dxa";
        string raw = el.Attr("w:w") ?? "0";
        double w;
        if (raw.EndsWith('%')) w = Js.Round(Js.ParseFloat(raw) * 50); // "50%" → 2500 (50ºs de %)
        else w = type == "dxa" ? (MeasureTwips(raw) ?? 0) : (Int(raw) ?? 0);
        return new WidthSpec { W = w, Type = type is "pct" or "auto" or "nil" ? type : "dxa" };
    }

    public static RPr? ReadRPr(XmlElement? rPr)
    {
        if (rPr is null) return null;
        var p = new RPr();
        foreach (var el in ChildElements(rPr))
        {
            string? val = el.Attr("w:val");
            switch (el.Name)
            {
                case "w:rStyle": if (Js.Truthy(val)) p.RStyle = val; break;
                case "w:rFonts":
                    p.RFonts = new RFonts
                    {
                        Ascii = el.Attr("w:ascii"),
                        HAnsi = el.Attr("w:hAnsi"),
                        EastAsia = el.Attr("w:eastAsia"),
                        Cs = el.Attr("w:cs"),
                        AsciiTheme = el.Attr("w:asciiTheme"),
                        HAnsiTheme = el.Attr("w:hAnsiTheme"),
                        EastAsiaTheme = el.Attr("w:eastAsiaTheme"),
                        CsTheme = el.Attr("w:cstheme"),
                        Hint = el.Attr("w:hint"),
                    };
                    break;
                case "w:b": p.B = OnOffVal(el); break;
                case "w:bCs": p.BCs = OnOffVal(el); break;
                case "w:i": p.I = OnOffVal(el); break;
                case "w:iCs": p.ICs = OnOffVal(el); break;
                case "w:caps": p.Caps = OnOffVal(el); break;
                case "w:smallCaps": p.SmallCaps = OnOffVal(el); break;
                case "w:strike": p.Strike = OnOffVal(el); break;
                case "w:dstrike": p.Dstrike = OnOffVal(el); break;
                case "w:outline": p.Outline = OnOffVal(el); break;
                case "w:shadow": p.Shadow = OnOffVal(el); break;
                case "w:emboss": p.Emboss = OnOffVal(el); break;
                case "w:imprint": p.Imprint = OnOffVal(el); break;
                case "w:vanish": p.Vanish = OnOffVal(el); break;
                case "w:specVanish": p.SpecVanish = OnOffVal(el); break;
                case "w:webHidden": p.WebHidden = OnOffVal(el); break;
                case "w:noProof": p.NoProof = OnOffVal(el); break;
                case "w:snapToGrid": p.SnapToGrid = OnOffVal(el); break;
                case "w:rtl": p.Rtl = OnOffVal(el); break;
                case "w:cs": p.Cs = OnOffVal(el); break;
                case "w:color": p.Color = ColorOf(el); break;
                case "w14:textFill":
                    {
                        var solid = FirstChild(el, "w14:solidFill");
                        var clr = solid is not null ? (FirstChild(solid, "w14:srgbClr") ?? FirstChild(solid, "w14:schemeClr")) : null;
                        if (clr is not null)
                        {
                            var tf = new TextFillSpec();
                            string? v = clr.Attr("w14:val");
                            if (clr.Name == "w14:srgbClr" && Js.Truthy(v)) tf.Color = Js.ToUpper(v!);
                            else if (Js.Truthy(v)) tf.ThemeColor = v;
                            string? a = FirstChild(clr, "w14:alpha")?.Attr("w14:val");
                            if (a is not null) tf.Alpha = Math.Max(0, 1 - Js.IntOr0(a) / 100000);
                            p.TextFill = tf;
                        }
                        else if (FirstChild(el, "w14:noFill") is not null) p.TextFill = new TextFillSpec { Alpha = 0 };
                        break;
                    }
                case "w14:ligatures":
                    p.Ligatures = el.Attr("w14:val") ?? "standard";
                    break;
                case "w:rPrChange":
                    p.Change = FillRevisionInfo(new RPrChange { RPr = ReadRPr(FirstChild(el, "w:rPr")) ?? new RPr() }, el);
                    break;
                case "w14:shadow":
                    {
                        double Emu(string k) { double n = Js.ParseInt(el.Attr(k) ?? "0"); return (double.IsNaN(n) ? 0 : n) / 12700; }
                        double dir = Js.ParseInt(el.Attr("w14:dir") ?? "0");
                        p.TextShadow = new TextShadowSpec { Blur = Emu("w14:blurRad"), Dist = Emu("w14:dist"), Dir = (double.IsNaN(dir) ? 0 : dir) / 60000 };
                        break;
                    }
                case "w14:textOutline":
                    p.TextOutline = FirstChild(el, "w14:noFill") is null && (FirstChild(el, "w14:solidFill") ?? FirstChild(el, "w14:gradFill")) is not null;
                    break;
                case "w:spacing": { if (MeasureTwips(val) is { } n) p.Spacing = n; break; }
                case "w:w": { if (Int(val is null ? null : ReplaceFirst(val, "%", "")) is { } n) p.W = n; break; }
                case "w:kern": { if (Int(val) is { } n) p.Kern = n; break; }
                case "w:position": { if (Int(val) is { } n) p.Position = n; break; }
                case "w:sz": { if (Int(val) is { } n) p.Sz = n; break; }
                case "w:szCs": { if (Int(val) is { } n) p.SzCs = n; break; }
                case "w:highlight": if (Js.Truthy(val)) p.Highlight = val; break;
                case "w:u":
                    {
                        var u = new UnderlineSpec { Val = val ?? "single" };
                        if (Js.Truthy(el.Attr("w:color"))) u.Color = el.Attr("w:color");
                        if (Js.Truthy(el.Attr("w:themeColor"))) u.ThemeColor = el.Attr("w:themeColor");
                        if (Js.Truthy(el.Attr("w:themeTint"))) u.ThemeTint = el.Attr("w:themeTint");
                        if (Js.Truthy(el.Attr("w:themeShade"))) u.ThemeShade = el.Attr("w:themeShade");
                        p.U = u;
                        break;
                    }
                case "w:effect": if (Js.Truthy(val)) p.Effect = val; break;
                case "w:bdr": p.Bdr = ReadBorder(el); break;
                case "w:shd": p.Shd = ReadShading(el); break;
                case "w:vertAlign":
                    if (val is "superscript" or "subscript" or "baseline") p.VertAlign = val;
                    break;
                case "w:em": if (Js.Truthy(val)) p.Em = val; break;
                case "w:lang":
                    {
                        var l = new LangSpec();
                        if (Js.Truthy(el.Attr("w:val"))) l.Val = el.Attr("w:val");
                        if (Js.Truthy(el.Attr("w:eastAsia"))) l.EastAsia = el.Attr("w:eastAsia");
                        if (Js.Truthy(el.Attr("w:bidi"))) l.Bidi = el.Attr("w:bidi");
                        p.Lang = l;
                        break;
                    }
            }
        }
        return p;
    }

    private static string ReplaceFirst(string s, string a, string b)
    {
        int i = s.IndexOf(a, StringComparison.Ordinal);
        return i < 0 ? s : s[..i] + b + s[(i + a.Length)..];
    }

    private static PBdr? ReadPBdr(XmlElement? el)
    {
        if (el is null) return null;
        var b = new PBdr();
        foreach (var side in new[] { "top", "left", "bottom", "right", "between", "bar" })
        {
            var e = ReadBorder(FirstChild(el, "w:" + side)
                ?? (side == "left" ? FirstChild(el, "w:start") : side == "right" ? FirstChild(el, "w:end") : null));
            if (e is not null) b.Set(side, e);
        }
        return b;
    }

    private static readonly HashSet<string> TabVals = new(StringComparer.Ordinal)
        { "left", "center", "right", "decimal", "bar", "clear", "num", "start", "end" };
    private static readonly HashSet<string> Leaders = new(StringComparer.Ordinal)
        { "none", "dot", "hyphen", "underscore", "heavy", "middleDot" };

    public static PPr? ReadPPr(XmlElement? pPr)
    {
        if (pPr is null) return null;
        var p = new PPr();
        foreach (var el in ChildElements(pPr))
        {
            string? val = el.Attr("w:val");
            switch (el.Name)
            {
                case "w:pStyle": if (Js.Truthy(val)) p.PStyle = val; break;
                case "w:keepNext": p.KeepNext = OnOffVal(el); break;
                case "w:keepLines": p.KeepLines = OnOffVal(el); break;
                case "w:pageBreakBefore": p.PageBreakBefore = OnOffVal(el); break;
                case "w:widowControl": p.WidowControl = OnOffVal(el); break;
                case "w:suppressLineNumbers": p.SuppressLineNumbers = OnOffVal(el); break;
                case "w:suppressAutoHyphens": p.SuppressAutoHyphens = OnOffVal(el); break;
                case "w:kinsoku": p.Kinsoku = OnOffVal(el); break;
                case "w:wordWrap": p.WordWrap = OnOffVal(el); break;
                case "w:overflowPunct": p.OverflowPunct = OnOffVal(el); break;
                case "w:autoSpaceDE": p.AutoSpaceDE = OnOffVal(el); break;
                case "w:autoSpaceDN": p.AutoSpaceDN = OnOffVal(el); break;
                case "w:bidi": p.Bidi = OnOffVal(el); break;
                case "w:adjustRightInd": p.AdjustRightInd = OnOffVal(el); break;
                case "w:snapToGrid": p.SnapToGrid = OnOffVal(el); break;
                case "w:contextualSpacing": p.ContextualSpacing = OnOffVal(el); break;
                case "w:mirrorIndents": p.MirrorIndents = OnOffVal(el); break;
                case "w:suppressOverlap": p.SuppressOverlap = OnOffVal(el); break;
                case "w:jc": if (Js.Truthy(val)) p.Jc = val; break;
                case "w:textAlignment": if (Js.Truthy(val)) p.TextAlignment = val; break;
                case "w:outlineLvl": { if (Int(val) is { } n) p.OutlineLvl = n; break; }
                case "w:numPr":
                    {
                        var numPr = new NumPr();
                        var numId = Int(FirstChild(el, "w:numId")?.Attr("w:val"));
                        var ilvl = Int(FirstChild(el, "w:ilvl")?.Attr("w:val"));
                        if (numId is not null) numPr.NumId = numId;
                        if (ilvl is not null) numPr.Ilvl = ilvl;
                        p.NumPr = numPr;
                        break;
                    }
                case "w:pBdr": p.PBdr = ReadPBdr(el); break;
                case "w:shd": p.Shd = ReadShading(el); break;
                case "w:tabs":
                    {
                        var tabs = new List<TabSpec>();
                        foreach (var t in ChildElements(el, "w:tab"))
                        {
                            string v = t.Attr("w:val") ?? "left";
                            if (v == "start") v = "left";
                            if (v == "end") v = "right";
                            if (!TabVals.Contains(v)) continue;
                            var pos = MeasureTwips(t.Attr("w:pos"));
                            if (pos is null) continue;
                            var tab = new TabSpec { Val = v, Pos = pos.Value };
                            string? leader = t.Attr("w:leader");
                            if (Js.Truthy(leader) && Leaders.Contains(leader!)) tab.Leader = leader;
                            tabs.Add(tab);
                        }
                        p.Tabs = tabs;
                        break;
                    }
                case "w:spacing":
                    {
                        var s = new SpacingSpec();
                        if (MeasureTwips(el.Attr("w:before")) is { } before) s.Before = before;
                        if (MeasureTwips(el.Attr("w:after")) is { } after) s.After = after;
                        if (Int(el.Attr("w:beforeLines")) is { } bl) s.BeforeLines = bl;
                        if (Int(el.Attr("w:afterLines")) is { } al) s.AfterLines = al;
                        if (el.Attr("w:beforeAutospacing") is { } ba) s.BeforeAutospacing = OnOffAttr(ba);
                        if (el.Attr("w:afterAutospacing") is { } aa) s.AfterAutospacing = OnOffAttr(aa);
                        if (MeasureTwips(el.Attr("w:line")) is { } line) s.Line = line;
                        string? rule = el.Attr("w:lineRule");
                        if (rule is "auto" or "exact" or "atLeast") s.LineRule = rule;
                        p.Spacing = s;
                        break;
                    }
                case "w:ind":
                    {
                        var s = new IndSpec();
                        if (MeasureTwips(el.Attr("w:left") ?? el.Attr("w:start")) is { } left) s.Left = left;
                        if (MeasureTwips(el.Attr("w:right") ?? el.Attr("w:end")) is { } right) s.Right = right;
                        if (MeasureTwips(el.Attr("w:hanging")) is { } hanging) s.Hanging = hanging;
                        if (MeasureTwips(el.Attr("w:firstLine")) is { } firstLine) s.FirstLine = firstLine;
                        if (Int(el.Attr("w:leftChars") ?? el.Attr("w:startChars")) is { } lc) s.LeftChars = lc;
                        if (Int(el.Attr("w:rightChars") ?? el.Attr("w:endChars")) is { } rc) s.RightChars = rc;
                        if (Int(el.Attr("w:hangingChars")) is { } hc) s.HangingChars = hc;
                        if (Int(el.Attr("w:firstLineChars")) is { } fc) s.FirstLineChars = fc;
                        p.Ind = s;
                        break;
                    }
                case "w:framePr":
                    {
                        var f = new FramePr();
                        string? dc = el.Attr("w:dropCap");
                        if (dc is "none" or "drop" or "margin") f.DropCap = dc;
                        if (Int(el.Attr("w:lines")) is { } lines) f.Lines = lines;
                        if (MeasureTwips(el.Attr("w:w")) is { } w) f.W = w;
                        if (MeasureTwips(el.Attr("w:h")) is { } h) f.H = h;
                        if (MeasureTwips(el.Attr("w:hSpace")) is { } hs) f.HSpace = hs;
                        if (MeasureTwips(el.Attr("w:vSpace")) is { } vs) f.VSpace = vs;
                        if (MeasureTwips(el.Attr("w:x")) is { } x) f.X = x;
                        if (MeasureTwips(el.Attr("w:y")) is { } y) f.Y = y;
                        string? hr = el.Attr("w:hRule");
                        if (hr is "auto" or "exact" or "atLeast") f.HRule = hr;
                        if (Js.Truthy(el.Attr("w:wrap"))) f.Wrap = el.Attr("w:wrap");
                        if (Js.Truthy(el.Attr("w:hAnchor"))) f.HAnchor = el.Attr("w:hAnchor");
                        if (Js.Truthy(el.Attr("w:vAnchor"))) f.VAnchor = el.Attr("w:vAnchor");
                        if (Js.Truthy(el.Attr("w:xAlign"))) f.XAlign = el.Attr("w:xAlign");
                        if (Js.Truthy(el.Attr("w:yAlign"))) f.YAlign = el.Attr("w:yAlign");
                        if (el.Attr("w:anchorLock") is { } al) f.AnchorLock = OnOffAttr(al);
                        p.FramePr = f;
                        break;
                    }
                case "w:rPr":
                    p.RPr = ReadRPr(el);
                    foreach (var c in ChildElements(el))
                    {
                        if (c.Name is "w:del" or "w:moveFrom") { p.MarkDeleted = true; p.MarkDel = ReadRevisionInfo(c); }
                        else if (c.Name is "w:ins" or "w:moveTo") p.MarkIns = ReadRevisionInfo(c);
                    }
                    break;
                case "w:pPrChange":
                    p.Change = FillRevisionInfo(new PPrChange { PPr = ReadPPr(FirstChild(el, "w:pPr")) ?? new PPr() }, el);
                    break;
            }
        }
        return p;
    }

    private static TblBorders? ReadBorders(XmlElement? el)
    {
        if (el is null) return null;
        var b = new TblBorders();
        b.Top = ReadBorder(FirstChild(el, "w:top"));
        b.Left = ReadBorder(FirstChild(el, "w:left")) ?? ReadBorder(FirstChild(el, "w:start"));
        b.Bottom = ReadBorder(FirstChild(el, "w:bottom"));
        b.Right = ReadBorder(FirstChild(el, "w:right")) ?? ReadBorder(FirstChild(el, "w:end"));
        b.InsideH = ReadBorder(FirstChild(el, "w:insideH"));
        b.InsideV = ReadBorder(FirstChild(el, "w:insideV"));
        b.Tl2br = ReadBorder(FirstChild(el, "w:tl2br"));
        b.Tr2bl = ReadBorder(FirstChild(el, "w:tr2bl"));
        return b;
    }

    private static CellMargins? ReadCellMar(XmlElement? el)
    {
        if (el is null) return null;
        return new CellMargins
        {
            Top = ReadWidth(FirstChild(el, "w:top")),
            Left = ReadWidth(FirstChild(el, "w:left") ?? FirstChild(el, "w:start")),
            Bottom = ReadWidth(FirstChild(el, "w:bottom")),
            Right = ReadWidth(FirstChild(el, "w:right") ?? FirstChild(el, "w:end")),
        };
    }

    public static TblPr? ReadTblPr(XmlElement? tblPr)
    {
        if (tblPr is null) return null;
        var p = new TblPr();
        foreach (var el in ChildElements(tblPr))
        {
            string? val = el.Attr("w:val");
            switch (el.Name)
            {
                case "w:tblStyle": if (Js.Truthy(val)) p.TblStyle = val; break;
                case "w:tblpPr":
                    {
                        var t = new TblpPr
                        {
                            LeftFromText = MeasureTwips(el.Attr("w:leftFromText")),
                            RightFromText = MeasureTwips(el.Attr("w:rightFromText")),
                            TopFromText = MeasureTwips(el.Attr("w:topFromText")),
                            BottomFromText = MeasureTwips(el.Attr("w:bottomFromText")),
                            TblpX = MeasureTwips(el.Attr("w:tblpX")),
                            TblpY = MeasureTwips(el.Attr("w:tblpY")),
                        };
                        string? va = el.Attr("w:vertAnchor");
                        if (va is "text" or "margin" or "page") t.VertAnchor = va;
                        string? ha = el.Attr("w:horzAnchor");
                        if (ha is "text" or "margin" or "page") t.HorzAnchor = ha;
                        if (Js.Truthy(el.Attr("w:tblpXSpec"))) t.TblpXSpec = el.Attr("w:tblpXSpec");
                        if (Js.Truthy(el.Attr("w:tblpYSpec"))) t.TblpYSpec = el.Attr("w:tblpYSpec");
                        p.TblpPr = t;
                        break;
                    }
                case "w:tblOverlap": if (Js.Truthy(val)) p.TblOverlap = val; break;
                case "w:bidiVisual": p.BidiVisual = OnOffVal(el); break;
                case "w:tblStyleRowBandSize": { if (Int(val) is { } n) p.TblStyleRowBandSize = n; break; }
                case "w:tblStyleColBandSize": { if (Int(val) is { } n) p.TblStyleColBandSize = n; break; }
                case "w:tblW": p.TblW = ReadWidth(el); break;
                case "w:jc": if (Js.Truthy(val)) p.Jc = val; break;
                case "w:tblCellSpacing": p.TblCellSpacing = ReadWidth(el); break;
                case "w:tblInd": p.TblInd = ReadWidth(el); break;
                case "w:tblBorders": p.TblBorders = ReadBorders(el); break;
                case "w:shd": p.Shd = ReadShading(el); break;
                case "w:tblLayout": p.TblLayout = el.Attr("w:type") == "fixed" ? "fixed" : "autofit"; break;
                case "w:tblCellMar": p.TblCellMar = ReadCellMar(el); break;
                case "w:tblLook":
                    {
                        var look = new TblLook();
                        double hex = JsNumber.ParseInt(el.Attr("w:val") ?? "", 16);
                        if (double.IsFinite(hex))
                        {
                            long h = (long)hex;
                            look.FirstRow = (h & 0x20) != 0;
                            look.LastRow = (h & 0x40) != 0;
                            look.FirstColumn = (h & 0x80) != 0;
                            look.LastColumn = (h & 0x100) != 0;
                            look.NoHBand = (h & 0x200) != 0;
                            look.NoVBand = (h & 0x400) != 0;
                        }
                        if (el.Attr("w:firstRow") is { } a1) look.FirstRow = OnOffAttr(a1);
                        if (el.Attr("w:lastRow") is { } a2) look.LastRow = OnOffAttr(a2);
                        if (el.Attr("w:firstColumn") is { } a3) look.FirstColumn = OnOffAttr(a3);
                        if (el.Attr("w:lastColumn") is { } a4) look.LastColumn = OnOffAttr(a4);
                        if (el.Attr("w:noHBand") is { } a5) look.NoHBand = OnOffAttr(a5);
                        if (el.Attr("w:noVBand") is { } a6) look.NoVBand = OnOffAttr(a6);
                        p.TblLook = look;
                        break;
                    }
            }
        }
        return p;
    }

    public static TrPr? ReadTrPr(XmlElement? trPr)
    {
        if (trPr is null) return null;
        var p = new TrPr();
        foreach (var el in ChildElements(trPr))
        {
            string? val = el.Attr("w:val");
            switch (el.Name)
            {
                case "w:cnfStyle": if (Js.Truthy(val)) p.CnfStyle = val; break;
                case "w:gridBefore": { if (Int(val) is { } n) p.GridBefore = n; break; }
                case "w:gridAfter": { if (Int(val) is { } n) p.GridAfter = n; break; }
                case "w:wBefore": p.WBefore = ReadWidth(el); break;
                case "w:wAfter": p.WAfter = ReadWidth(el); break;
                case "w:cantSplit": p.CantSplit = OnOffVal(el); break;
                case "w:trHeight":
                    {
                        double v = MeasureTwips(val) ?? 0;
                        string? r = el.Attr("w:hRule");
                        p.TrHeight = new TrHeight { Val = v, HRule = r is "exact" or "auto" ? r : "atLeast" };
                        break;
                    }
                case "w:tblHeader": p.TblHeader = OnOffVal(el); break;
                case "w:tblCellSpacing": p.TblCellSpacing = ReadWidth(el); break;
                case "w:jc": if (Js.Truthy(val)) p.Jc = val; break;
                case "w:hidden": p.Hidden = OnOffVal(el); break;
            }
        }
        return p;
    }

    public static TcPr? ReadTcPr(XmlElement? tcPr)
    {
        if (tcPr is null) return null;
        var p = new TcPr();
        foreach (var el in ChildElements(tcPr))
        {
            string? val = el.Attr("w:val");
            switch (el.Name)
            {
                case "w:cnfStyle": if (Js.Truthy(val)) p.CnfStyle = val; break;
                case "w:tcW": p.TcW = ReadWidth(el); break;
                case "w:gridSpan": { if (Int(val) is { } n) p.GridSpan = n; break; }
                case "w:hMerge": p.HMerge = val == "restart" ? "restart" : "continue"; break;
                case "w:vMerge": p.VMerge = val == "restart" ? "restart" : "continue"; break;
                case "w:tcBorders": p.TcBorders = ReadBorders(el); break;
                case "w:shd": p.Shd = ReadShading(el); break;
                case "w:noWrap": p.NoWrap = OnOffVal(el); break;
                case "w:tcMar": p.TcMar = ReadCellMar(el); break;
                case "w:textDirection": if (Js.Truthy(val)) p.TextDirection = val; break;
                case "w:tcFitText": p.TcFitText = OnOffVal(el); break;
                case "w:vAlign":
                    if (val is "top" or "center" or "bottom" or "both") p.VAlign = val;
                    break;
                case "w:hideMark": p.HideMark = OnOffVal(el); break;
            }
        }
        return p;
    }
}

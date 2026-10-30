using UniversalOffice.Core;

namespace UniversalOffice.DocBinary;

internal sealed class PresetResult
{
    public string Prst = "rect";
    /// <summary>avLst: pares nome/valor já arredondados (adj, adj1, adj2…).</summary>
    public List<(string Name, double Val)> Av = new();
    /// <summary>A preset precisa de flipV adicional para reproduzir o desenho binário.</summary>
    public bool FlipV;
}

/// <summary>
/// Tipos de forma do OfficeArt binário (MSOSPT) → geometrias preset do DrawingML,
/// com a conversão dos "adjust values" — porta de preset-map.ts (cópia do
/// conversor .ppt). Mesma aritmética de ponto flutuante do JS.
/// </summary>
internal static class PresetMap
{
    private delegate double?[] AdjFn(double?[] a, double w, double h);

    private sealed record PresetDef(string Prst, AdjFn? Adj = null, double[]? BinDefaults = null, bool FlipV = false);

    private const double K = 100000.0 / 21600;

    private static double Ratio(double w, double h, bool horiz)
    {
        double ss = Math.Min(w, h);
        if (ss == 0 || double.IsNaN(ss)) ss = 1;
        return (horiz ? w : h) / ss;
    }

    /// <summary>Fração linear no espaço 21600 → ×100000.</summary>
    private static AdjFn Lin(int i) => (a, _, _) => new double?[] { a[i] is null ? null : a[i]!.Value * K };

    /// <summary>Deslocamento horizontal (fração de w) → relativo a ss.</summary>
    private static readonly AdjFn OffW = (a, w, h) => new double?[] { a[0] is null ? null : a[0]!.Value * K * Ratio(w, h, true) };

    /// <summary>Ponta (homePlate/chevron): x do início da ponta → profundidade relativa a ss.</summary>
    private static readonly AdjFn TipW = (a, w, h) => new double?[] { a[0] is null ? null : (21600 - a[0]!.Value) * K * Ratio(w, h, true) };

    /// <summary>Estrelas (seal): distância dos vértices internos ao centro → raio interno ×50000.</summary>
    private static readonly AdjFn Seal = (a, _, _) => new double?[] { a[0] is null ? null : ((10800 - a[0]!.Value) / 10800) * 50000 };

    /// <summary>Seta horizontal: adj1 = x da cabeça, adj2 = y do topo da haste.</summary>
    private static AdjFn ArrowH(bool headAtStart) => (a, w, h) => new double?[]
    {
        a[1] is null ? null : ((21600 - 2 * a[1]!.Value) / 21600) * 100000,
        a[0] is null ? null : (headAtStart ? a[0]!.Value : 21600 - a[0]!.Value) * K * Ratio(w, h, true),
    };

    /// <summary>Seta vertical: adj1 = y da cabeça, adj2 = x da esquerda da haste.</summary>
    private static AdjFn ArrowV(bool headAtStart) => (a, w, h) => new double?[]
    {
        a[1] is null ? null : ((21600 - 2 * a[1]!.Value) / 21600) * 100000,
        a[0] is null ? null : (headAtStart ? a[0]!.Value : 21600 - a[0]!.Value) * K * Ratio(w, h, false),
    };

    /// <summary>Balões com ponta: posição da ponta relativa ao centro (fração de w/h).</summary>
    private static readonly AdjFn Wedge = (a, _, _) => new double?[]
    {
        a[0] is null ? null : (a[0]!.Value - 10800) * K,
        a[1] is null ? null : (a[1]!.Value - 10800) * K,
    };

    private static readonly AdjFn VertK = (a, w, h) => new double?[] { a[0] is null ? null : a[0]!.Value * K * Ratio(w, h, false) };

    private static readonly AdjFn Brace = (a, w, h) => new double?[]
    {
        a[0] is null ? null : a[0]!.Value * K * Ratio(w, h, false),
        a[1] is null ? null : a[1]!.Value * K,
    };

    private static readonly double[] WedgeDefaults = { 1350, 25920 };

    private static readonly Dictionary<int, PresetDef> P = new()
    {
        [1] = new("rect"),
        [2] = new("roundRect", Lin(0)),
        [3] = new("ellipse"),
        [4] = new("diamond"),
        [5] = new("triangle", Lin(0)),
        [6] = new("rtTriangle"),
        [7] = new("parallelogram", OffW),
        [8] = new("trapezoid", OffW, null, true),
        [9] = new("hexagon", OffW),
        [10] = new("octagon", Lin(0)),
        [11] = new("plus", Lin(0)),
        [12] = new("star5"),
        [13] = new("rightArrow", ArrowH(false)),
        [14] = new("rightArrow", ArrowH(false)),
        [15] = new("homePlate", TipW),
        [16] = new("cube", Lin(0)),
        [17] = new("wedgeRoundRectCallout", Wedge, WedgeDefaults),
        [18] = new("star16", Seal),
        [19] = new("arc"),
        [20] = new("line"),
        [21] = new("plaque", Lin(0)),
        [22] = new("can", VertK),
        [23] = new("donut", Lin(0)),
        [32] = new("straightConnector1"),
        [33] = new("bentConnector2"),
        [34] = new("bentConnector3"),
        [35] = new("bentConnector4"),
        [36] = new("bentConnector5"),
        [37] = new("curvedConnector2"),
        [38] = new("curvedConnector3"),
        [39] = new("curvedConnector4"),
        [40] = new("curvedConnector5"),
        [41] = new("callout1"),
        [42] = new("callout2"),
        [43] = new("callout3"),
        [44] = new("accentCallout1"),
        [45] = new("accentCallout2"),
        [46] = new("accentCallout3"),
        [47] = new("borderCallout1"),
        [48] = new("borderCallout2"),
        [49] = new("borderCallout3"),
        [50] = new("accentBorderCallout1"),
        [51] = new("accentBorderCallout2"),
        [52] = new("accentBorderCallout3"),
        [53] = new("ribbon"),
        [54] = new("ribbon2"),
        [55] = new("chevron", TipW),
        [56] = new("pentagon"),
        [57] = new("noSmoking"),
        [58] = new("star8", Seal),
        [59] = new("star16", Seal),
        [60] = new("star32", Seal),
        [61] = new("wedgeRectCallout", Wedge, WedgeDefaults),
        [62] = new("wedgeRoundRectCallout", Wedge, WedgeDefaults),
        [63] = new("wedgeEllipseCallout", Wedge, WedgeDefaults),
        [64] = new("wave"),
        [65] = new("foldedCorner"),
        [66] = new("leftArrow", ArrowH(true)),
        [67] = new("downArrow", ArrowV(false)),
        [68] = new("upArrow", ArrowV(true)),
        [69] = new("leftRightArrow", ArrowH(true)),
        [70] = new("upDownArrow", ArrowV(true)),
        [71] = new("irregularSeal1"),
        [72] = new("irregularSeal2"),
        [73] = new("lightningBolt"),
        [74] = new("heart"),
        [75] = new("rect"),
        [76] = new("quadArrow"),
        [77] = new("leftArrowCallout"),
        [78] = new("rightArrowCallout"),
        [79] = new("upArrowCallout"),
        [80] = new("downArrowCallout"),
        [81] = new("leftRightArrowCallout"),
        [82] = new("upDownArrowCallout"),
        [83] = new("quadArrowCallout"),
        [84] = new("bevel", Lin(0)),
        [85] = new("leftBracket", VertK),
        [86] = new("rightBracket", VertK),
        [87] = new("leftBrace", Brace),
        [88] = new("rightBrace", Brace),
        [89] = new("leftUpArrow"),
        [90] = new("bentUpArrow"),
        [91] = new("bentArrow"),
        [92] = new("star24", Seal),
        [93] = new("stripedRightArrow", ArrowH(false)),
        [94] = new("notchedRightArrow", ArrowH(false)),
        [95] = new("blockArc"),
        [96] = new("smileyFace", (a, _, _) => new double?[] { a[0] is null ? null : ((a[0]!.Value - 16515) / (17520 - 16515)) * 4653 }),
        [97] = new("verticalScroll"),
        [98] = new("horizontalScroll"),
        [99] = new("circularArrow"),
        [100] = new("circularArrow"),
        [101] = new("uturnArrow"),
        [102] = new("curvedRightArrow"),
        [103] = new("curvedLeftArrow"),
        [104] = new("curvedUpArrow"),
        [105] = new("curvedDownArrow"),
        [106] = new("cloudCallout", Wedge, WedgeDefaults),
        [107] = new("ellipseRibbon"),
        [108] = new("ellipseRibbon2"),
        [109] = new("flowChartProcess"),
        [110] = new("flowChartDecision"),
        [111] = new("flowChartInputOutput"),
        [112] = new("flowChartPredefinedProcess"),
        [113] = new("flowChartInternalStorage"),
        [114] = new("flowChartDocument"),
        [115] = new("flowChartMultidocument"),
        [116] = new("flowChartTerminator"),
        [117] = new("flowChartPreparation"),
        [118] = new("flowChartManualInput"),
        [119] = new("flowChartManualOperation"),
        [120] = new("flowChartConnector"),
        [121] = new("flowChartPunchedCard"),
        [122] = new("flowChartPunchedTape"),
        [123] = new("flowChartSummingJunction"),
        [124] = new("flowChartOr"),
        [125] = new("flowChartCollate"),
        [126] = new("flowChartSort"),
        [127] = new("flowChartExtract"),
        [128] = new("flowChartMerge"),
        [129] = new("flowChartOfflineStorage"),
        [130] = new("flowChartOnlineStorage"),
        [131] = new("flowChartMagneticTape"),
        [132] = new("flowChartMagneticDisk"),
        [133] = new("flowChartMagneticDrum"),
        [134] = new("flowChartDisplay"),
        [135] = new("flowChartDelay"),
        [176] = new("flowChartAlternateProcess"),
        [177] = new("flowChartOffpageConnector"),
        [178] = new("callout1"),
        [179] = new("accentCallout1"),
        [180] = new("borderCallout1"),
        [181] = new("accentBorderCallout1"),
        [182] = new("leftRightUpArrow"),
        [183] = new("sun", Lin(0)),
        [184] = new("moon", Lin(0)),
        [185] = new("bracketPair"),
        [186] = new("bracePair"),
        [187] = new("star4", Seal),
        [188] = new("doubleWave"),
        [189] = new("actionButtonBlank"),
        [190] = new("actionButtonHome"),
        [191] = new("actionButtonHelp"),
        [192] = new("actionButtonInformation"),
        [193] = new("actionButtonForwardNext"),
        [194] = new("actionButtonBackPrevious"),
        [195] = new("actionButtonEnd"),
        [196] = new("actionButtonBeginning"),
        [197] = new("actionButtonReturn"),
        [198] = new("actionButtonDocument"),
        [199] = new("actionButtonSound"),
        [200] = new("actionButtonMovie"),
        [201] = new("rect"),
        [202] = new("rect"),
    };

    /// <summary>Tipos de texto artístico (WordArt clássico) → retângulo com o texto.</summary>
    public static bool IsWordArtType(int spt) => (spt >= 24 && spt <= 31) || (spt >= 136 && spt <= 175);

    /// <summary>É conector?</summary>
    public static bool IsConnectorType(int spt) => spt >= 32 && spt <= 40;

    /// <summary>Padrões DrawingML (presetShapeDefinitions) dos ajustes que convertemos.</summary>
    private static readonly Dictionary<string, double[]> DmlDefaults = new()
    {
        ["roundRect"] = new double[] { 16667 }, ["triangle"] = new double[] { 50000 }, ["parallelogram"] = new double[] { 25000 },
        ["trapezoid"] = new double[] { 25000 }, ["hexagon"] = new double[] { 25000 },
        ["octagon"] = new double[] { 29289 }, ["plus"] = new double[] { 25000 }, ["rightArrow"] = new double[] { 50000, 50000 },
        ["leftArrow"] = new double[] { 50000, 50000 },
        ["upArrow"] = new double[] { 50000, 50000 }, ["downArrow"] = new double[] { 50000, 50000 }, ["leftRightArrow"] = new double[] { 50000, 50000 },
        ["upDownArrow"] = new double[] { 50000, 50000 }, ["homePlate"] = new double[] { 50000 }, ["chevron"] = new double[] { 50000 },
        ["cube"] = new double[] { 25000 }, ["can"] = new double[] { 25000 },
        ["donut"] = new double[] { 25000 }, ["plaque"] = new double[] { 16667 }, ["bevel"] = new double[] { 12500 }, ["sun"] = new double[] { 25000 },
        ["moon"] = new double[] { 50000 }, ["smileyFace"] = new double[] { 4653 },
        ["star4"] = new double[] { 12500 }, ["star8"] = new double[] { 38250 }, ["star16"] = new double[] { 37500 }, ["star24"] = new double[] { 37500 },
        ["star32"] = new double[] { 37500 },
        ["wedgeRectCallout"] = new double[] { -20833, 62500 }, ["wedgeRoundRectCallout"] = new double[] { -20833, 62500, 16667 },
        ["wedgeEllipseCallout"] = new double[] { -20833, 62500 }, ["cloudCallout"] = new double[] { -20833, 62500 },
        ["leftBracket"] = new double[] { 8333 }, ["rightBracket"] = new double[] { 8333 }, ["leftBrace"] = new double[] { 8333, 50000 },
        ["rightBrace"] = new double[] { 8333, 50000 },
        ["stripedRightArrow"] = new double[] { 50000, 50000 }, ["notchedRightArrow"] = new double[] { 50000, 50000 },
    };

    /// <summary>
    /// Mapeia tipo + ajustes para a preset. null = sem preset equivalente.
    /// </summary>
    public static PresetResult? PresetFor(int spt, double?[] adjust, double w, double h)
    {
        if (IsWordArtType(spt)) return new PresetResult { Prst = "rect" };
        if (!P.TryGetValue(spt, out var def)) return null;
        var out_ = new PresetResult { Prst = def.Prst };
        if (def.FlipV) out_.FlipV = true;
        if (def.Adj is not null)
        {
            // o JS indexa a[i] além do fim como undefined
            double?[] a = def.BinDefaults is not null
                ? def.BinDefaults.Select((d, i) => (double?)(i < adjust.Length && adjust[i] is not null ? adjust[i]!.Value : d)).ToArray()
                : adjust;
            var padded = new double?[Math.Max(a.Length, 10)];
            Array.Copy(a, padded, a.Length);
            var vals = def.Adj(padded, w, h);
            if (vals.Any(v => v is not null))
            {
                // um ajuste presente obriga a listar todos (posicionais): completa com o padrão DrawingML
                var dflt = DmlDefaults.TryGetValue(def.Prst, out var dd) ? dd : Array.Empty<double>();
                for (int i = 0; i < vals.Length; i++)
                {
                    double? val = vals[i] ?? (i < dflt.Length ? dflt[i] : null);
                    if (val is null) continue;
                    out_.Av.Add((vals.Length == 1 ? "adj" : $"adj{i + 1}", JsNumber.Round(val.Value)));
                }
            }
        }
        return out_;
    }
}

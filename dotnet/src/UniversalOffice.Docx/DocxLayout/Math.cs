using System.Buffers.Binary;
using System.Runtime.CompilerServices;
using UniversalOffice.Docx;
using UniversalOffice.Fonts;

namespace UniversalOffice.DocxLayout;

/// <summary>Item da caixa diagramada da equação: x a partir da borda esquerda, y relativo à baseline (+ desce).</summary>
public sealed class MathItem
{
    public int Cp;
    public double X;
    public double Y;
    public FontFace Face = null!;
    public double SizePt;
    public RunStyle Style = null!;

    public MathItem With(double x, double y) => new() { Cp = Cp, X = x, Y = y, Face = Face, SizePt = SizePt, Style = Style };
}

/// <summary>Traço (barra da fração).</summary>
public sealed class MathRule
{
    public double X, Y, W, H;
    public string Color = "000000";

    public MathRule With(double x, double y) => new() { X = x, Y = y, W = W, H = H, Color = Color };
}

/// <summary>Caixa diagramada (twips): itens com x a partir da borda esquerda e y relativo à
/// baseline (+ desce); traços; tinta acima/abaixo; e a altura que a linha recebe.</summary>
public sealed class MathBox
{
    public double W;
    public List<MathItem> Items = new();
    public List<MathRule> Rules = new();
    public double Top;
    public double Bottom;
    public double LineTop;
    public double LineBottom;
}

public sealed class MathAtom
{
    /// <summary>char: um glifo; frac: caixa da fração</summary>
    public string Kind = "char";
    public int Cp;
    public FontFace Face = null!;
    public double SizePt;
    public RunStyle Style = null!;
    /// <summary>avanço (twips) já com o espaço até o átomo seguinte</summary>
    public double Adv;
    public MathBox? Box;
    /// <summary>índice do caractere no texto achatado do run</summary>
    public int Offset;
    // (RawAtom do JS)
    internal string Cls = "ord";
    internal double Ital;
    internal bool Italic;
    internal double Top;
    internal double Bottom;
}

/// <summary>Ambiente da equação: cascata do rPr, face da fonte de matemática, avanço e kerning.</summary>
public sealed class MathEnv
{
    /// <summary>cascata do w:rPr de um m:r → rPr final e estilo resolvido</summary>
    public Func<RPr?, (RPr Rpr, RunStyle Style)> StyleOf = null!;
    /// <summary>face da fonte de matemática</summary>
    public Func<bool, bool, FontFace> Face = null!;
    /// <summary>avanço (twips) do caractere na face</summary>
    public Func<FontFace, int, double, double> Adv = null!;
    /// <summary>kerning (twips) do par na face</summary>
    public Func<FontFace, int, int, double, double> Kern = null!;
}

/// <summary>
/// Equações de exibição (OMML, m:oMathPara) como o Word as diagrama (porta de
/// docx-layout/src/math.ts) — medido no oráculo omath (Cambria Math, 11/12/16 pt):
///  - fração de exibição: constantes da tabela MATH da fonte (deslocamento do
///    numerador e do denominador, eixo, espessura do traço, folgas mínimas) em
///    unidades de 1/600 pol. arredondadas PARA CIMA; numerador e denominador centrados
///    na largura do maior, traço sem sobra, centrado no eixo;
///  - na linha, a fração mede acima o deslocamento do numerador + a tinta do
///    numerador + mathLeading; abaixo, o deslocamento EXATO do denominador + a
///    tinta dele; a entrelinha múltipla vale sobre o texto da linha, não a fração;
///  - espaço grosso (5/18 em) em volta das relações, médio (4/18 em) em volta dos
///    operadores binários — o operador no início vira unário, sem espaço; correção de
///    itálico (tabela MATH) da letra itálica antes de um caractere reto; sem kerning nem ligaduras;
///  - letras sem m:sty (ou "i") no alfabeto itálico matemático (U+1D434…), "b" e
///    "bi" no negrito; dígitos e o estilo "p" retos;
///  - texto com as métricas typo da fonte de matemática;
///  - o PDF grava o numerador, o denominador e depois o resto da linha.
/// </summary>
public static class MathLayout
{
    // Índices das constantes na MathConstants (depois dos 4 campos de 16 bits).
    private const int KLeading = 0, KAxis = 1, KNumUp = 28, KNumUpD = 29, KDenDown = 30, KDenDownD = 31, KNumGap = 32, KNumGapD = 33, KRule = 34, KDenGap = 35, KDenGapD = 36;
    /// <summary>Fonte sem tabela MATH: as proporções da Cambria Math (unidades de 2048).</summary>
    private static readonly Dictionary<int, double> CM = new()
    {
        [0] = 300, [1] = 585, [28] = 1200, [29] = 1550, [30] = 1030, [31] = 1370, [32] = 133, [33] = 260, [34] = 133, [35] = 133, [36] = 260,
    };

    private sealed class FontInfo
    {
        public double Upm;
        /// <summary>constantes da MATH (unidades da fonte); nulo = fonte sem MATH</summary>
        public int[]? K;
        public double ScriptPct;
        /// <summary>correção de itálico por glifo (unidades)</summary>
        public Dictionary<int, int> Ital = new();
        /// <summary>tinta vertical do glifo [yMin, yMax] (unidades); nulo = sem contorno</summary>
        public Func<int, (int YMin, int YMax)?> Box = _ => null;
    }

    private static readonly ConditionalWeakTable<ILayoutFont, FontInfo> InfoCache = new();

    private static FontInfo GetFontInfo(FontFace face)
    {
        if (InfoCache.TryGetValue(face.Font, out var info)) return info;
        double upm0 = face.Font.Metrics.UnitsPerEm;
        info = new FontInfo { Upm = upm0 != 0 && !double.IsNaN(upm0) ? upm0 : 2048, K = null, ScriptPct = 73 };
        try
        {
            if (face.Bytes is not null) info = ParseFont(face.Bytes) ?? info;
        }
        catch (Exception)
        {
            // fonte malformada: fica sem MATH nem contornos
        }
        InfoCache.AddOrUpdate(face.Font, info);
        return info;
    }

    private static int U16(byte[] b, long o) => BinaryPrimitives.ReadUInt16BigEndian(b.AsSpan(checked((int)o), 2));
    private static int I16(byte[] b, long o) => BinaryPrimitives.ReadInt16BigEndian(b.AsSpan(checked((int)o), 2));
    private static long U32(byte[] b, long o) => BinaryPrimitives.ReadUInt32BigEndian(b.AsSpan(checked((int)o), 4));

    private static FontInfo? ParseFont(byte[] b)
    {
        var tables = new Dictionary<string, long>(StringComparer.Ordinal);
        int n = U16(b, 4);
        for (int i = 0; i < n; i++)
        {
            int p = 12 + 16 * i;
            string tag = new(new[] { (char)b[p], (char)b[p + 1], (char)b[p + 2], (char)b[p + 3] });
            tables[tag] = U32(b, p + 8);
        }
        if (!tables.TryGetValue("head", out long head)) return null;
        int upm16 = U16(b, head + 18);
        double upm = upm16 != 0 ? upm16 : 2048;
        int[]? k = null;
        double scriptPct = 73;
        var ital = new Dictionary<int, int>();
        if (tables.TryGetValue("MATH", out long m))
        {
            long c = m + U16(b, m + 4);
            int sp = I16(b, c);
            scriptPct = sp != 0 ? sp : 73;
            k = new int[37];
            for (int i = 0; i <= 36; i++) k[i] = I16(b, c + 8 + 4 * i);
            long gi = m + U16(b, m + 6);
            int io = U16(b, gi);
            if (io != 0)
            {
                long ic = gi + io;
                long cov = ic + U16(b, ic);
                int cnt = U16(b, ic + 2);
                ForCoverage(b, cov, (g, idx) => { if (idx < cnt) ital[g] = I16(b, ic + 4 + 4 * idx); });
            }
        }
        bool hasGlyf = tables.TryGetValue("glyf", out long glyf), hasLoca = tables.TryGetValue("loca", out long loca);
        bool longLoca = I16(b, head + 50) == 1;
        (int, int)? Box(int gid)
        {
            if (!hasGlyf || !hasLoca) return null;
            long At(int i) => longLoca ? U32(b, loca + 4L * i) : U16(b, loca + 2L * i) * 2L;
            long s = At(gid), e = At(gid + 1);
            if (e <= s || glyf + s + 10 > b.Length) return null;
            return (I16(b, glyf + s + 4), I16(b, glyf + s + 8));
        }
        return new FontInfo { Upm = upm, K = k, ScriptPct = scriptPct, Ital = ital, Box = Box };
    }

    /// <summary>Percorre uma Coverage (formatos 1 e 2): glifo → índice.</summary>
    private static void ForCoverage(byte[] b, long at, Action<int, int> fn)
    {
        int fmt = U16(b, at), cnt = U16(b, at + 2);
        for (int i = 0; i < cnt; i++)
        {
            if (fmt == 1) fn(U16(b, at + 4 + 2 * i), i);
            else
            {
                int s = U16(b, at + 4 + 6 * i), e = U16(b, at + 6 + 6 * i), si = U16(b, at + 8 + 6 * i);
                for (int g = s; g <= e; g++) fn(g, si + g - s);
            }
        }
    }

    /// <summary>Constante (fração do em) — a da fonte, ou a proporção da Cambria Math.</summary>
    private static double KEm(FontInfo info, int i) => info.K is not null ? info.K[i] / info.Upm : CM[i] / 2048;

    /// <summary>Arredonda para cima em unidades de 1/600 pol. (2,4 twips).</summary>
    private static double Q600(double tw) => Math.Ceiling(tw / 2.4 - 1e-6) * 2.4;

    /// <summary>Métricas verticais do texto da equação (frações do em): typo da fonte de matemática.</summary>
    public static (double Ascent, double Descent) MathTextMetrics(FontFace face)
    {
        var info = GetFontInfo(face);
        var fm = face.Font.Metrics;
        if (info.K is not null && fm.STypoAscender > 0)
        {
            double u = fm.UnitsPerEm != 0 && !double.IsNaN(fm.UnitsPerEm) ? fm.UnitsPerEm : 2048;
            return ((fm.STypoAscender + Math.Max(0, fm.STypoLineGap)) / u, -fm.STypoDescender / u);
        }
        var mm = Fonts.FaceMetrics(face.Font);
        return (mm.Ascent, mm.Descent);
    }

    private static HashSet<int> CpSet(string s) => new(Js.CodePoints(s).Select(Js.CodePointAt0));
    private static readonly HashSet<int> Rel = CpSet("=<>≤≥≠≈≡∼≃≅∝←→↔⇐⇒⇔∈∉∋⊂⊃⊆⊇≪≫≔");
    private static readonly HashSet<int> Bin = CpSet("+-−±∓×÷·∗∘∙∩∪∧∨⊕⊗⊖*");
    private static readonly HashSet<int> Open = CpSet("([{⟨⌈⌊");
    private static readonly HashSet<int> Close = CpSet(")]}⟩⌉⌋");
    private static string ClsOf(int cp) => Rel.Contains(cp) ? "rel" : Bin.Contains(cp) ? "bin" : Open.Contains(cp) ? "open" : Close.Contains(cp) ? "close" : "ord";

    /// <summary>Letra no alfabeto matemático do estilo m:sty (nulo/"i" itálico, "b", "bi", "p").</summary>
    private static int MathAlpha(int cp, string? sty)
    {
        bool up = cp >= 0x41 && cp <= 0x5a, lo = cp >= 0x61 && cp <= 0x7a;
        string s = sty ?? "i";
        if (s == "i")
        {
            if (cp == 0x68) return 0x210e; // ℎ (o itálico "h" fica no bloco de letras)
            if (up) return 0x1d434 + cp - 0x41;
            if (lo) return 0x1d44e + cp - 0x61;
            if (cp >= 0x3b1 && cp <= 0x3c9) return 0x1d6fc + cp - 0x3b1;
        }
        else if (s == "b")
        {
            if (up) return 0x1d400 + cp - 0x41;
            if (lo) return 0x1d41a + cp - 0x61;
            if (cp >= 0x30 && cp <= 0x39) return 0x1d7ce + cp - 0x30;
        }
        else if (s == "bi")
        {
            if (up) return 0x1d468 + cp - 0x41;
            if (lo) return 0x1d482 + cp - 0x61;
        }
        return cp;
    }

    /// <summary>Contador do índice no texto achatado (avança com os m:t).</summary>
    public sealed class Counter { public int N; }

    /// <summary>
    /// Átomos de uma linha da equação, com os espaços entre eles somados ao avanço do
    /// anterior. off = contador do índice no texto achatado (avança com os m:t).
    /// lvl: D exibição, T texto, S índice (corpo reduzido).
    /// </summary>
    public static List<MathAtom> MathAtoms(MathEnv env, List<MathNode> nodes, string lvl = "D", double scale = 1, Counter? off = null)
    {
        off ??= new Counter();
        var atoms = new List<MathAtom>();
        foreach (var nd in nodes)
        {
            if (nd is MathBreak) continue;
            if (nd is MathFrac f)
            {
                int o0 = off.N;
                var fb = FracBox(env, f, lvl, scale, off);
                var st = env.StyleOf(null);
                atoms.Add(new MathAtom { Kind = "frac", Cp = 0xfffc, Face = env.Face(false, false), SizePt = st.Style.SizePt * scale, Style = st.Style, Adv = fb.W, Box = fb, Offset = o0, Cls = "ord", Ital = 0, Italic = false, Top = fb.Top, Bottom = fb.Bottom });
                continue;
            }
            var r = (MathRun)nd;
            var style = env.StyleOf(r.Rpr).Style;
            double size = style.SizePt * scale;
            bool bold = r.Sty is "b" or "bi";
            foreach (var ch in Js.CodePoints(r.Text))
            {
                int cp0 = Js.CodePointAt0(ch);
                int cp = MathAlpha(cp0, r.Sty);
                var face = env.Face(bold && cp == cp0, false);
                // fonte sem o alfabeto matemático: a letra comum, em itálico
                if (cp != cp0 && face.Font.GlyphId(cp) == 0) { face = env.Face(bold, r.Sty != "b"); cp = cp0; }
                var info = GetFontInfo(face);
                int gid = face.Font.GlyphId(cp);
                var bx = info.Box(gid);
                double em = (size * 20) / info.Upm;
                bool italic = cp != cp0 && r.Sty != "b";
                atoms.Add(new MathAtom
                {
                    Kind = "char", Cp = cp, Face = face, SizePt = size, Style = style, Adv = env.Adv(face, cp, size), Offset = off.N,
                    Cls = ClsOf(cp0), Ital = italic ? (info.Ital.TryGetValue(gid, out var iv) ? iv : 0) * em : 0, Italic = italic,
                    Top = bx is { } b1 ? Math.Max(0, b1.YMax) * em : 0, Bottom = bx is { } b2 ? Math.Max(0, -b2.YMin) * em : 0,
                });
                off.N += ch.Length;
            }
        }
        // operador binário no início, depois de outro operador, relação ou abertura, ou
        // no fim: unário (sem espaço)
        for (int i = 0; i < atoms.Count; i++)
        {
            var a = atoms[i];
            if (a.Cls != "bin") continue;
            string? pv = i - 1 >= 0 ? atoms[i - 1].Cls : null, nx = i + 1 < atoms.Count ? atoms[i + 1].Cls : null;
            if (pv is null || pv == "bin" || pv == "rel" || pv == "open" || nx is null || nx == "rel" || nx == "close") a.Cls = "ord";
        }
        static double EmTw(MathAtom a) => a.SizePt * 20;
        for (int i = 0; i + 1 < atoms.Count; i++)
        {
            var a = atoms[i];
            var b = atoms[i + 1];
            // kerning (w:kern) entre caracteres vizinhos da mesma face e corpo
            if (a.Style.Rpr.Kern is { } kern && kern != 0 && !double.IsNaN(kern) && a.Kind == "char" && b.Kind == "char" && ReferenceEquals(a.Face, b.Face) && a.SizePt == b.SizePt && a.SizePt * 2 >= kern)
                a.Adv += env.Kern(a.Face, a.Cp, b.Cp, a.SizePt);
            // correção de itálico antes de caractere reto
            if (a.Italic && !b.Italic) a.Adv += a.Ital;
            if (lvl == "S") continue; // nos índices o Word não espaça os operadores
            double sp = 0;
            if ((a.Cls == "rel") != (b.Cls == "rel") && a.Cls != "open" && b.Cls != "close") sp = 5.0 / 18;
            else if ((a.Cls == "bin" || b.Cls == "bin") && a.Cls != "open") sp = 4.0 / 18;
            if (sp != 0) a.Adv += sp * EmTw(a.Cls is "ord" or "close" ? b : a);
        }
        return atoms;
    }

    /// <summary>Linha de átomos → caixa (x acumulado a partir de 0, baseline em y = 0).</summary>
    private static MathBox RowBox(List<MathAtom> atoms)
    {
        var box = new MathBox();
        double x = 0;
        foreach (var a in atoms)
        {
            if (a.Kind == "frac" && a.Box is not null)
            {
                foreach (var it in a.Box.Items) box.Items.Add(it.With(it.X + x, it.Y));
                foreach (var r in a.Box.Rules) box.Rules.Add(r.With(r.X + x, r.Y));
            }
            else if (a.Cp != 0x20)
            {
                box.Items.Add(new MathItem { Cp = a.Cp, X = x, Y = 0, Face = a.Face, SizePt = a.SizePt, Style = a.Style });
            }
            box.Top = Math.Max(box.Top, a.Top);
            box.Bottom = Math.Max(box.Bottom, a.Bottom);
            x += a.Adv;
        }
        box.W = x;
        return box;
    }

    /// <summary>Fração (m:f): numerador e denominador centrados, traço no eixo.</summary>
    private static MathBox FracBox(MathEnv env, MathFrac f, string lvl, double scale, Counter off)
    {
        var face = env.Face(false, false);
        var info = GetFontInfo(face);
        var st = env.StyleOf(null).Style;
        bool display = lvl == "D";
        // numerador/denominador: na exibição, estilo de texto (mesmo corpo); senão, de índice
        string inner = display ? "T" : "S";
        double iscale = display ? scale : scale * (info.ScriptPct / 100);
        var num = RowBox(MathAtoms(env, f.Num, inner, iscale, off));
        var den = RowBox(MathAtoms(env, f.Den, inner, iscale, off));
        // corpo da fração: o do primeiro caractere de dentro (desfeita a redução), ou o da zona
        var first = num.Items.Count > 0 ? num.Items[0] : den.Items.Count > 0 ? den.Items[0] : null;
        double size = first is not null ? first.SizePt * (scale / iscale) : st.SizePt * scale;
        double em = size * 20;
        double C(int i) => KEm(info, i) * em;
        double axis = C(KAxis), rule = C(KRule);
        bool noBar = f.Type == "noBar";
        double ruleQ = noBar ? 0 : Q600(rule);
        double numShift = C(display ? KNumUpD : KNumUp);
        double denShift = C(display ? KDenDownD : KDenDown);
        // folgas mínimas entre a tinta e o traço
        numShift = Math.Max(numShift, axis + rule / 2 + C(display ? KNumGapD : KNumGap) + num.Bottom);
        denShift = Math.Max(denShift, den.Top + C(display ? KDenGapD : KDenGap) - (axis - rule / 2));
        double numQ = Q600(numShift), denQ = Q600(denShift);
        double w = Math.Max(num.W, den.W);
        double nx = (w - num.W) / 2, dx = (w - den.W) / 2;
        var box = new MathBox
        {
            W = w,
            Top = numQ + num.Top,
            Bottom = denQ + den.Bottom,
            LineTop = numQ + num.Top + C(KLeading),
            LineBottom = denShift + den.Bottom,
        };
        foreach (var it in num.Items) box.Items.Add(it.With(it.X + nx, it.Y - numQ));
        foreach (var it in den.Items) box.Items.Add(it.With(it.X + dx, it.Y + denQ));
        foreach (var r in num.Rules) box.Rules.Add(r.With(r.X + nx, r.Y - numQ));
        foreach (var r in den.Rules) box.Rules.Add(r.With(r.X + dx, r.Y + denQ));
        if (!noBar) box.Rules.Add(new MathRule { X = 0, Y = -(axis + ruleQ / 2), W = w, H = ruleQ, Color = st.Color });
        return box;
    }
}

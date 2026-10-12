using System.Globalization;
using System.Text;
using OfficeNext.Docx;
using OfficeNext.Layout;

namespace OfficeNext.DocxLayout;

/// <summary>Unidade (palavra até a próxima oportunidade de quebra) que não coube na linha.</summary>
public sealed class HyphenUnit
{
    /// <summary>índices [I, E) da unidade em para.Glyphs</summary>
    public int I;
    public int E;
    /// <summary>x do início da unidade e margem direita da linha (twips, relativos ao quadro)</summary>
    public double X;
    public double Right;
    /// <summary>a unidade abre a linha: não há para onde descer</summary>
    public bool LineStart;
    /// <summary>fim do conteúdo (sem espaços) no ponto de quebra anterior à unidade</summary>
    public double ContentEnd;
    public bool Justify;
    /// <summary>espaços que comprimem/expandem até a unidade (com o vão antes dela) e os que
    /// sobram se ela descer</summary>
    public double SpacesW;
    public double RestW;
    public int NSpaces;
    /// <summary>linhas anteriores seguidas terminadas em hífen</summary>
    public int HyphenRun;
}

/// <summary>
/// Hifenização automática (w:autoHyphenation) e hífen opcional (w:softHyphen) como o Word —
/// regras medidas no oráculo (grupos hyph*). Porta de write/packages/docx-layout/src/hyphenate.ts
/// (ver o cabeçalho de lá: pontos, mínimos, encaixe com o hífen, quando hifenizar, limite).
/// </summary>
public static class Hyphenate
{
    /// <summary>vão mínimo (twips) para hifenizar no modo 15 sem justificar (oráculo hyphzone)</summary>
    public const double HyphenGap15 = 421;
    /// <summary>expansão relativa máxima dos espaços para a palavra descer em vez de hifenizar
    /// (modo 15 justificado, oráculo hyphzone)</summary>
    public const double HyphenExpand15 = 0.4868;
    /// <summary>zona padrão dos modos ≤ 14 sem w:hyphenationZone: a do Word pt-BR (0,75 cm)</summary>
    public const double HyphenZoneDefault = 425;

    /// <summary>Mínimos de letras antes/depois do hífen no Word (oráculo hyphmin).</summary>
    public static (int Left, int Right) HyphenMins(double compat) => (2, compat >= 15 ? 3 : 2);

    /// <summary>/^[\p{L}\p{M}]$/u</summary>
    private static bool IsLetter(string ch)
    {
        if (!OneRune(ch, out var r)) return false;
        var c = Rune.GetUnicodeCategory(r);
        return c is UnicodeCategory.UppercaseLetter or UnicodeCategory.LowercaseLetter or UnicodeCategory.TitlecaseLetter
            or UnicodeCategory.ModifierLetter or UnicodeCategory.OtherLetter
            or UnicodeCategory.NonSpacingMark or UnicodeCategory.SpacingCombiningMark or UnicodeCategory.EnclosingMark;
    }

    /// <summary>/^\p{M}$/u</summary>
    private static bool IsMark(string ch)
    {
        if (!OneRune(ch, out var r)) return false;
        var c = Rune.GetUnicodeCategory(r);
        return c is UnicodeCategory.NonSpacingMark or UnicodeCategory.SpacingCombiningMark or UnicodeCategory.EnclosingMark;
    }

    private static bool OneRune(string s, out Rune r)
    {
        r = default;
        if (string.IsNullOrEmpty(s) || Rune.DecodeFromUtf16(s, out r, out int n) != System.Buffers.OperationStatus.Done) return false;
        return n == s.Length;
    }

    private static string LangOf(DocContext ctx, Glyph g) => g.Style.Rpr.Lang?.Val ?? ctx.Opts.Lang;

    private static bool LangAllowed(DocContext ctx, string lang)
    {
        var list = ctx.Opts.HyphenationLanguages;
        if (list is null) return true;
        string l = lang.ToLowerInvariant();
        return list.Any(x => { string y = x.ToLowerInvariant(); return l == y || l.StartsWith(y + "-", StringComparison.Ordinal); });
    }

    /// <summary>Marca os pontos de hifenização automática (Hyph = pode quebrar com hífen DEPOIS
    /// deste glifo) nos trechos de letras do parágrafo.</summary>
    public static void MarkHyphenation(DocContext ctx, PPr ppr, List<Glyph> glyphs, HashSet<int>? skipRuns)
    {
        var s = ctx.Fmt.Settings;
        if (!s.AutoHyphenation || ppr.SuppressAutoHyphens == true || !ctx.Opts.Hyphenation) return;
        var (left, right) = HyphenMins(s.CompatibilityMode);
        for (int k = 0; k < glyphs.Count;)
        {
            var g = glyphs[k];
            // (equações — skipRuns — não hifenizam)
            if (g.Kind != GlyphKind.Char || !IsLetter(g.Ch) || IsMark(g.Ch) || (skipRuns?.Contains(g.RunIdx) ?? false)) { k++; continue; }
            string lang = LangOf(ctx, g);
            // trecho: letras do mesmo idioma; o hífen opcional fica dentro (o Word hifeniza a
            // palavra inteira e soma o ponto dele)
            var idx = new List<int>();
            int e = k;
            for (; e < glyphs.Count; e++)
            {
                var q = glyphs[e];
                if (q.Kind == GlyphKind.Shy) continue;
                if (q.Kind != GlyphKind.Char || !IsLetter(q.Ch) || LangOf(ctx, q) != lang || (skipRuns?.Contains(q.RunIdx) ?? false)) break;
                idx.Add(e);
            }
            k = e;
            var rpr = g.Style.Rpr;
            if (rpr.NoProof == true || rpr.Cs == true || rpr.Rtl == true || !LangAllowed(ctx, lang)) continue;
            if (s.DoNotHyphenateCaps && idx.All(j => { string c = glyphs[j].Ch; return c.ToLowerInvariant() == c.ToUpperInvariant() || c == c.ToUpperInvariant(); })) continue;
            var h = Hyphenation.For(lang);
            if (h is null) continue;
            // aglomerados letra + marcas combinantes → um código NFC (os padrões são NFC)
            var clusters = new List<List<int>>();
            foreach (int j in idx)
            {
                if (IsMark(glyphs[j].Ch) && clusters.Count > 0) clusters[^1].Add(j);
                else clusters.Add(new List<int> { j });
            }
            if (clusters.Count < left + right) continue;
            var word = new StringBuilder();
            foreach (var c in clusters)
            {
                string t = string.Concat(c.Select(j => glyphs[j].Ch));
                string n = t.Normalize(NormalizationForm.FormC);
                word.Append(n.EnumerateRunes().Count() == 1 ? n : glyphs[c[0]].Ch);
            }
            foreach (int p in h.Hyphenate(word.ToString(), left, right))
            {
                var c = clusters[p - 1];
                glyphs[c[^1]].Hyph = true;
            }
        }
    }

    /// <summary>Pontos candidatos da unidade: automáticos (com ≥ 2 letras desde o início da
    /// unidade — a continuação de uma palavra partida na linha anterior conta do início da
    /// linha) e hífens opcionais (sem mínimos).</summary>
    public static List<int> HyphenCandidates(List<Glyph> gs, int i, int e)
    {
        var o = new List<int>();
        int letters = 0;
        for (int k = i; k < e - 1; k++)
        {
            var g = gs[k];
            if (g.Kind == GlyphKind.Shy) { if (k > i) o.Add(k); continue; }
            if (g.Kind == GlyphKind.Char && IsLetter(g.Ch) && !IsMark(g.Ch)) letters++;
            // ponto automático seguido do hífen opcional no mesmo lugar: fica o opcional
            if (g.Hyph && !(k + 1 < gs.Count && gs[k + 1].Kind == GlyphKind.Shy) && letters >= 2) o.Add(k);
        }
        return o;
    }

    /// <summary>
    /// Escolhe onde hifenizar a unidade que não coube (ou null: ela desce inteira / quebra
    /// por caractere). Além das regras do cabeçalho (oráculo hyphshy):
    ///  - w:consecutiveHyphenLimit só conta (e só barra) os pontos AUTOMÁTICOS;
    ///  - modos ≤ 14: o hífen opcional que cabe tem prioridade sobre os automáticos, sem a
    ///    zona e sem a regra da letra seguinte.
    /// </summary>
    public static (int K, double W)? ChooseHyphenation(DocContext ctx, List<Glyph> gs, HyphenUnit u)
    {
        var s = ctx.Fmt.Settings;
        var cands = HyphenCandidates(gs, u.I, u.E);
        double limit = s.ConsecutiveHyphenLimit ?? 0;
        if (limit > 0 && u.HyphenRun >= limit) cands = cands.Where(k => gs[k].Kind == GlyphKind.Shy).ToList();
        if (cands.Count == 0) return null;
        bool modern = s.CompatibilityMode >= 15;
        bool justify = u.Justify && modern;
        double HyphenW(int k) => Para.AdvanceTwips(ctx, gs[k].Face, 0x2d, gs[k].SizePt);
        // fim de cada pedaço (até o glifo k, sem o hífen)
        var ends = new List<double>();
        double x = u.X;
        int ci = 0;
        for (int k = u.I; k < u.E && ci < cands.Count; k++)
        {
            var g = gs[k];
            if (g.Kind != GlyphKind.Shy) x += g.Adv;
            if (k == cands[ci]) { ends.Add(x); ci++; }
        }
        if (!modern)
        {
            // modos ≤ 14: hífen opcional que cabe (o maior) primeiro
            for (int n = cands.Count - 1; n >= 0; n--)
            {
                int k = cands[n];
                if (gs[k].Kind == GlyphKind.Shy && ends[n] + HyphenW(k) - u.Right <= 1e-3) return (k, HyphenW(k));
            }
            if (!u.LineStart && u.Right - u.X < (s.HyphenationZone ?? HyphenZoneDefault) - 1e-3) return null;
            // automáticos: o pedaço com o hífen E a letra seguinte ao ponto têm de caber
            for (int n = cands.Count - 1; n >= 0; n--)
            {
                int k = cands[n];
                if (gs[k].Kind == GlyphKind.Shy) continue;
                int nx = k + 1;
                while (nx < u.E && (gs[nx].Kind == GlyphKind.Shy || (gs[nx].Kind == GlyphKind.Obj && gs[nx].Adv == 0))) nx++;
                double end = Math.Max(ends[n] + HyphenW(k), ends[n] + (nx < u.E ? gs[nx].Adv : 0));
                if (end - u.Right <= 1e-3) return (k, HyphenW(k));
            }
            return null;
        }
        if (!u.LineStart)
        {
            if (justify)
            {
                double slack = u.Right - u.ContentEnd;
                if (u.RestW > 0 && slack / u.RestW <= HyphenExpand15) return null;
            }
            else if (u.Right - u.ContentEnd < HyphenGap15) return null;
        }
        var fits = cands.Select((k, n) => ends[n] + HyphenW(k) - u.Right).ToList();
        for (int n = cands.Count - 1; n >= 0; n--)
        {
            double ov = fits[n];
            if (ov <= 1e-3) return (cands[n], HyphenW(cands[n]));
            if (!justify || u.NSpaces == 0) continue;
            // justificado (modo 15): comprime até 25% dos espaços, perdendo no máximo metade da
            // folga que o ponto anterior deixaria (oráculo hyphfit); o último ponto compara
            // com a palavra descer (regra do jsweep)
            var shrink = ctx.Opts.JustifyShrink;
            if (ov > shrink.Ratio * u.SpacesW + 0.0175) continue;
            if (n > 0)
            {
                // (+0,02 twip: quantização sub-twip do Word — medido entre 0,005 e 0,034)
                double slackPrev = -fits[n - 1];
                if (ov <= shrink.ExpandRatio * slackPrev + 0.02) return (cands[n], HyphenW(cands[n]));
            }
            else
            {
                double slack = u.Right - u.ContentEnd;
                if (u.LineStart || u.RestW <= 0 || ov / u.SpacesW <= (shrink.ExpandRatio * slack) / u.RestW + 0.0075 * u.NSpaces / u.SpacesW) return (cands[n], HyphenW(cands[n]));
            }
        }
        return null;
    }
}

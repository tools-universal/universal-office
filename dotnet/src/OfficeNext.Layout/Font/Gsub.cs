namespace OfficeNext.Layout;

/// <summary>
/// Parser mínimo de GSUB para ligaduras (porta de layout/src/font/gsub.ts): lookup tipo 4
/// (LigatureSubst), inclusive via extensão tipo 7, das features do script latino (latn; sem
/// ele, DFLT), idioma padrão. Com w14:ligatures o Word mede o glifo da ligadura, não a soma
/// das letras (oráculo ligwidth do docx-layout: Calibri "tt" −73/2048 em, "ti" −15, "fi" −11).
/// </summary>
internal static class Gsub
{
    /// <summary>Ligadura de um lookup: componentes seguintes ao 1º glifo e o glifo da ligadura.</summary>
    public sealed record LigEntry(int[] Rest, int Lig);

    public sealed class GsubLigatures
    {
        /// <summary>índices de lookup por feature (liga, clig, dlig, hlig…), do script latino</summary>
        public Dictionary<string, List<int>> Features = new(StringComparer.Ordinal);
        /// <summary>lookups de ligadura já lidos, por índice: 1º glifo → ligaduras, na ordem da fonte</summary>
        public Dictionary<int, Dictionary<int, List<LigEntry>>> Lookups = new();
        /// <summary>lookups de substituição simples (onum, tnum, ss01…): glifo → glifo</summary>
        public Dictionary<int, Dictionary<int, int>> Singles = new();
    }

    public static GsubLigatures ParseGsubLigatures(JsDataView view, long off)
    {
        int U16(long o) => view.GetUint16(o);
        long U32(long o) => view.GetUint32(o);
        string TagAt(long o) => new([(char)view.GetUint8(o), (char)view.GetUint8(o + 1), (char)view.GetUint8(o + 2), (char)view.GetUint8(o + 3)]);
        long scriptList = off + U16(off + 4);
        long featureList = off + U16(off + 6);
        long lookupList = off + U16(off + 8);
        var res = new GsubLigatures();
        long latn = -1, dflt = -1;
        for (int i = 0, n = U16(scriptList); i < n; i++)
        {
            long rec = scriptList + 2 + (long)i * 6;
            string tag = TagAt(rec);
            if (tag == "latn") latn = scriptList + U16(rec + 4);
            else if (tag == "DFLT") dflt = scriptList + U16(rec + 4);
        }
        long script = latn >= 0 ? latn : dflt;
        if (script < 0 || U16(script) == 0) return res;
        long ls = script + U16(script); // DefaultLangSys
        var fidx = new List<int>();
        int req = U16(ls + 2);
        if (req != 0xffff) fidx.Add(req);
        for (int k = 0, n = U16(ls + 4); k < n; k++) fidx.Add(U16(ls + 6 + (long)k * 2));
        foreach (int fi in fidx)
        {
            string tag = TagAt(featureList + 2 + (long)fi * 6);
            long fo = featureList + U16(featureList + 2 + (long)fi * 6 + 4);
            if (!res.Features.TryGetValue(tag, out var list)) list = new List<int>();
            for (int k = 0, n = U16(fo + 2); k < n; k++) list.Add(U16(fo + 4 + (long)k * 2));
            res.Features[tag] = list;
        }
        List<int> Coverage(long o)
        {
            var outp = new List<int>();
            if (U16(o) == 1) { for (int i = 0, n = U16(o + 2); i < n; i++) outp.Add(U16(o + 4 + (long)i * 2)); }
            else
            {
                for (int i = 0, n = U16(o + 2); i < n; i++)
                {
                    int s = U16(o + 4 + (long)i * 6), e = U16(o + 6 + (long)i * 6);
                    for (int g = s; g <= e; g++) outp.Add(g);
                }
            }
            return outp;
        }
        // Set do JS: ordem da primeira inserção, sem repetição
        var wanted = new List<int>();
        var seen = new HashSet<int>();
        foreach (var l in res.Features.Values) foreach (int li in l) if (seen.Add(li)) wanted.Add(li);
        foreach (int li in wanted)
        {
            if (li >= U16(lookupList)) continue;
            long lo = lookupList + U16(lookupList + 2 + (long)li * 2);
            int type = U16(lo);
            var map = new Dictionary<int, List<LigEntry>>();
            var one = new Dictionary<int, int>();
            for (int s = 0, ns = U16(lo + 4); s < ns; s++)
            {
                long so = lo + U16(lo + 6 + (long)s * 2);
                int t = type;
                if (t == 7) { t = U16(so + 2); so += U32(so + 4); }
                if (t == 1)
                {
                    // substituição simples: formato 1 = delta; formato 2 = lista de substitutos
                    int fmt = U16(so);
                    var scov = Coverage(so + U16(so + 2));
                    if (fmt == 1) { int d = view.GetInt16(so + 4); foreach (int g in scov) one[g] = (g + d) & 0xffff; }
                    else if (fmt == 2) for (int k = 0, n = U16(so + 4); k < n && k < scov.Count; k++) one[scov[k]] = U16(so + 6 + (long)k * 2);
                    continue;
                }
                if (t != 4 || U16(so) != 1) continue;
                var cov = Coverage(so + U16(so + 2));
                for (int k = 0, n = U16(so + 4); k < n && k < cov.Count; k++)
                {
                    long set = so + U16(so + 6 + (long)k * 2);
                    if (!map.TryGetValue(cov[k], out var list)) list = new List<LigEntry>();
                    for (int j = 0, m = U16(set); j < m; j++)
                    {
                        long lg = set + U16(set + 2 + (long)j * 2);
                        int cc = U16(lg + 2);
                        var rest = new int[Math.Max(0, cc - 1)];
                        for (int q = 1; q < cc; q++) rest[q - 1] = U16(lg + 4 + (long)(q - 1) * 2);
                        list.Add(new LigEntry(rest, U16(lg)));
                    }
                    if (list.Count > 0) map[cov[k]] = list;
                }
            }
            if (map.Count > 0) res.Lookups[li] = map;
            if (one.Count > 0) res.Singles[li] = one;
        }
        return res;
    }

    /// <summary>
    /// Aplica as ligaduras das features pedidas a uma sequência de glifos: cada lookup em
    /// ordem (índice crescente), da esquerda para a direita, a 1ª ligadura da fonte que casar.
    /// Devolve os grupos (glifo final + quantos glifos de entrada ele cobre).
    /// </summary>
    public static List<(int Gid, int Len)> ApplyLigatures(GsubLigatures g, IReadOnlyList<int> gids, IReadOnlyList<string> feats)
    {
        var outp = gids.Select(gid => (Gid: gid, Len: 1)).ToList();
        var idxSet = new List<int>();
        var seen = new HashSet<int>();
        foreach (var f in feats)
            if (g.Features.TryGetValue(f, out var l)) foreach (int li in l) if (seen.Add(li)) idxSet.Add(li);
        idxSet.Sort();
        foreach (int li in idxSet)
        {
            if (g.Singles.TryGetValue(li, out var sg))
            {
                outp = outp.Select(o => o.Len == 1 && sg.TryGetValue(o.Gid, out int ng) ? (ng, 1) : o).ToList();
                continue;
            }
            if (!g.Lookups.TryGetValue(li, out var lk)) continue;
            var next = new List<(int Gid, int Len)>();
            for (int i = 0; i < outp.Count; i++)
            {
                LigEntry? hit = null;
                if (lk.TryGetValue(outp[i].Gid, out var cands))
                {
                    int ii = i;
                    hit = cands.FirstOrDefault(c => c.Rest.Select((r, k) => (r, k)).All(p => ii + 1 + p.k < outp.Count && outp[ii + 1 + p.k].Gid == p.r));
                }
                if (hit is null) { next.Add(outp[i]); continue; }
                int len = outp[i].Len;
                for (int k = 0; k < hit.Rest.Length; k++) len += outp[i + 1 + k].Len;
                next.Add((hit.Lig, len));
                i += hit.Rest.Length;
            }
            outp = next;
        }
        return outp;
    }
}

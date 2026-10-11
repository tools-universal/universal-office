namespace OfficeNext.Layout;

/// <summary>
/// Porta de layout/src/font/gpos.ts — parser mínimo de GPOS para kerning de pares
/// (lookup type 2 / PairPos, formatos 1 e 2, incl. extensão type 9). O app de
/// referência moderno (DirectWrite) aplica a feature 'kern' por padrão — sem isso
/// os advances divergem ±0.2-0.6 unidades de 1/600" por par (visto no word-lab).
///
/// Retorna o ajuste de xAdvance (unidades da fonte) por par de gids, chave
/// <c>(g1 &lt;&lt; 16) | g2</c> como int32 do JS (com sinal). Mesma ordem de
/// inserção e "primeiro vence" do Map do JS; leituras fora dos limites lançam
/// (o chamador troca por mapa vazio, como o try/catch do SfntFont).
/// </summary>
internal static class Gpos
{
    /// <summary>Limite do Map do V8 (Node 24): a inserção da entrada 2^23+1 lança
    /// RangeError ("Map maximum size exceeded") — medido.</summary>
    internal const int JsMapMaxSize = 1 << 23;

    /// <summary>`if (!map.has(key)) map.set(key, v)` com o limite de tamanho do Map do V8.</summary>
    internal static void SetIfAbsent(Dictionary<int, int> map, int key, int value)
    {
        if (map.ContainsKey(key)) return;
        if (map.Count >= JsMapMaxSize) throw new JsRangeError("Map maximum size exceeded");
        map.Add(key, value);
    }

    /// <summary>
    /// PairPos formato 2: ajuste de um 1º glifo contra a classe 0 do ClassDef2 (todos
    /// os glifos NÃO listados nele). O par vale só se o 2º glifo não estiver no
    /// ClassDef2 da mesma subtabela (os listados já estão no mapa de pares).
    /// </summary>
    public sealed record Class0Entry(int Adv, Dictionary<int, int> Cd2);

    public static Dictionary<int, int> ParseGposKern(JsDataView view, long gposOffset, Dictionary<int, Class0Entry>? class0 = null)
    {
        var kern = new Dictionary<int, int>();

        long scriptListOff = gposOffset + view.GetUint16(gposOffset + 4);
        long featureListOff = gposOffset + view.GetUint16(gposOffset + 6);
        long lookupListOff = gposOffset + view.GetUint16(gposOffset + 8);

        // 1. coleta índices de feature 'kern' (qualquer script/lang — união)
        var kernFeatures = new List<int>(); // Set do JS: i crescente, sem repetição
        int featureCount = view.GetUint16(featureListOff);
        for (int i = 0; i < featureCount; i++)
        {
            long rec = featureListOff + 2 + (long)i * 6;
            int a = view.GetUint8(rec), b = view.GetUint8(rec + 1), c = view.GetUint8(rec + 2), d = view.GetUint8(rec + 3);
            if (a == 'k' && b == 'e' && c == 'r' && d == 'n') kernFeatures.Add(i);
        }
        if (kernFeatures.Count == 0) return kern;
        _ = scriptListOff; // união de todas as features kern, sem filtrar script

        // 2. lookups referenciados (Set do JS: ordem da primeira inserção)
        var lookupIdx = new List<int>();
        var seen = new HashSet<int>();
        foreach (int fi in kernFeatures)
        {
            long featOff = featureListOff + view.GetUint16(featureListOff + 2 + (long)fi * 6 + 4);
            int n = view.GetUint16(featOff + 2);
            for (int k = 0; k < n; k++)
            {
                int li = view.GetUint16(featOff + 4 + (long)k * 2);
                if (seen.Add(li)) lookupIdx.Add(li);
            }
        }

        int lookupCount = view.GetUint16(lookupListOff);
        foreach (int li in lookupIdx)
        {
            if (li >= lookupCount) continue;
            long lookupOff = lookupListOff + view.GetUint16(lookupListOff + 2 + (long)li * 2);
            int type = view.GetUint16(lookupOff);
            int subCount = view.GetUint16(lookupOff + 4);
            for (int s = 0; s < subCount; s++)
            {
                long subOff = lookupOff + view.GetUint16(lookupOff + 6 + (long)s * 2);
                int t = type;
                if (t == 9)
                { // extensão
                    t = view.GetUint16(subOff + 2);
                    subOff = subOff + view.GetUint32(subOff + 4);
                }
                if (t != 2) continue;
                ParsePairPos(view, subOff, kern, class0);
            }
        }
        return kern;
    }

    private static List<int> ReadCoverage(JsDataView view, long off)
    {
        int fmt = view.GetUint16(off);
        var output = new List<int>();
        if (fmt == 1)
        {
            int n = view.GetUint16(off + 2);
            for (int i = 0; i < n; i++) output.Add(view.GetUint16(off + 4 + (long)i * 2));
        }
        else if (fmt == 2)
        {
            int n = view.GetUint16(off + 2);
            for (int r = 0; r < n; r++)
            {
                int start = view.GetUint16(off + 4 + (long)r * 6);
                int end = view.GetUint16(off + 6 + (long)r * 6);
                for (int g = start; g <= end; g++) output.Add(g);
            }
        }
        return output;
    }

    /// <summary>ClassDef → mapa glifo→classe. Dictionary sem remoções enumera na
    /// ordem de inserção e sobrescrever mantém a posição (como o Map do JS).</summary>
    private static Dictionary<int, int> ReadClassDef(JsDataView view, long off)
    {
        var map = new Dictionary<int, int>();
        int fmt = view.GetUint16(off);
        if (fmt == 1)
        {
            int start = view.GetUint16(off + 2);
            int n = view.GetUint16(off + 4);
            for (int i = 0; i < n; i++) map[start + i] = view.GetUint16(off + 6 + (long)i * 2);
        }
        else if (fmt == 2)
        {
            int n = view.GetUint16(off + 2);
            for (int r = 0; r < n; r++)
            {
                int s = view.GetUint16(off + 4 + (long)r * 6);
                int e = view.GetUint16(off + 6 + (long)r * 6);
                int c = view.GetUint16(off + 8 + (long)r * 6);
                for (int g = s; g <= e; g++) map[g] = c;
            }
        }
        return map;
    }

    private static int ValueSize(int format)
    {
        int n = 0;
        for (int b = 0; b < 16; b++) if ((format & (1 << b)) != 0) n++;
        return n * 2;
    }

    /// <summary>Lê xAdvance de um ValueRecord no formato dado (0x0004 = XAdvance).</summary>
    private static int ReadXAdvance(JsDataView view, long off, int format)
    {
        long p = off;
        if ((format & 0x0001) != 0) p += 2; // XPlacement
        if ((format & 0x0002) != 0) p += 2; // YPlacement
        if ((format & 0x0004) != 0) return view.GetInt16(p);
        return 0;
    }

    private static void ParsePairPos(JsDataView view, long off, Dictionary<int, int> kern, Dictionary<int, Class0Entry>? class0)
    {
        int fmt = view.GetUint16(off);
        var coverage = ReadCoverage(view, off + view.GetUint16(off + 2));
        int vf1 = view.GetUint16(off + 4);
        int vf2 = view.GetUint16(off + 6);
        int size1 = ValueSize(vf1);
        int size2 = ValueSize(vf2);
        if (fmt == 1)
        {
            int pairSetCount = view.GetUint16(off + 8);
            for (int i = 0; i < Math.Min(pairSetCount, coverage.Count); i++)
            {
                long ps = off + view.GetUint16(off + 10 + (long)i * 2);
                int n = view.GetUint16(ps);
                int recSize = 2 + size1 + size2;
                for (int r = 0; r < n; r++)
                {
                    long rec = ps + 2 + (long)r * recSize;
                    int g2 = view.GetUint16(rec);
                    int adv = ReadXAdvance(view, rec + 2, vf1);
                    if (adv != 0) SetIfAbsent(kern, (coverage[i] << 16) | g2, adv);
                }
            }
        }
        else if (fmt == 2)
        {
            var cd1 = ReadClassDef(view, off + view.GetUint16(off + 8));
            var cd2 = ReadClassDef(view, off + view.GetUint16(off + 10));
            int c1n = view.GetUint16(off + 12);
            int c2n = view.GetUint16(off + 14);
            int recSize = size1 + size2;
            // pré-calcula advance por par de classes
            var classAdv = new int[c1n][];
            for (int c1 = 0; c1 < c1n; c1++)
            {
                classAdv[c1] = new int[c2n];
                for (int c2 = 0; c2 < c2n; c2++)
                {
                    long rec = off + 16 + ((long)c1 * c2n + c2) * recSize;
                    classAdv[c1][c2] = ReadXAdvance(view, rec, vf1);
                }
            }
            // classe de cada glifo coberto (classe 0 = default)
            var class1 = new Dictionary<int, int>();
            foreach (int g in coverage) class1[g] = cd1.TryGetValue(g, out int cc) ? cc : 0;
            // 2º glifo de classe 0 (fora do ClassDef2): ajuste próprio da classe do 1º
            if (class0 is not null)
            {
                foreach (var (g1, c1) in class1)
                {
                    int adv0 = c1 < classAdv.Length && classAdv[c1].Length > 0 ? classAdv[c1][0] : 0;
                    if (adv0 != 0 && !class0.ContainsKey(g1)) class0[g1] = new Class0Entry(adv0, cd2);
                }
            }
            // segunda classe: todos os glifos com classe ≠ 0 + os de classe 0 ficam de fora
            foreach (var (g1, c1) in class1)
            {
                int[]? row = c1 < classAdv.Length ? classAdv[c1] : null;
                foreach (var (g2, c2) in cd2)
                {
                    int adv = row != null && c2 < row.Length ? row[c2] : 0;
                    if (adv != 0) SetIfAbsent(kern, (g1 << 16) | g2, adv);
                }
            }
        }
    }
}

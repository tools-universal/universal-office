using System.Text;

namespace OfficeNext.Layout;

/// <summary>Padrões de hifenização de um idioma (o JSON gerado de hyph-utf8 por
/// write/tools/hyphen/gen-patterns.mjs — os mesmos dados dos módulos do JS).</summary>
public sealed class HyphenationPatterns
{
    /// <summary>id do arquivo hyph-utf8: 'pt', 'en-us', 'de-1996'…</summary>
    public string Id = "";
    /// <summary>mínimos tipográficos do hyph-utf8 (letras antes/depois do hífen)</summary>
    public int Left;
    public int Right;
    /// <summary>padrões de Liang na sintaxe TeX, separados por espaço</summary>
    public string Patterns = "";
    /// <summary>exceções (palavras com os pontos marcados por "-"), separadas por espaço</summary>
    public string Exceptions = "";
}

/// <summary>
/// Hifenização pelo algoritmo de Frank Liang (padrões do TeX — "Word Hy-phen-a-tion
/// by Com-put-er", 1983): para cada trecho da palavra (entre pontos ".") que casa
/// com um padrão, o maior número entre duas letras vale; ímpar = pode quebrar.
/// Porta de write/packages/docx-layout/src/typography/hyphen/liang.ts.
/// </summary>
public sealed class Hyphenator
{
    private sealed class Node
    {
        /// <summary>filhos por código de caractere</summary>
        public Dictionary<int, Node>? K;
        /// <summary>valores entre as letras do padrão (comprimento = letras + 1)</summary>
        public byte[]? V;
    }

    private const int Dot = 0x2e;
    private readonly Node _root = new();
    private readonly Dictionary<string, List<int>> _exceptions = new(StringComparer.Ordinal);
    private readonly Dictionary<string, List<int>> _cache = new(StringComparer.Ordinal);
    private readonly object _lock = new();

    public HyphenationPatterns Data { get; }

    private static readonly char[] Ws = { ' ', '\t', '\r', '\n' };

    public Hyphenator(HyphenationPatterns data)
    {
        Data = data;
        foreach (var p in data.Patterns.Split(Ws, StringSplitOptions.RemoveEmptyEntries)) Add(p.Normalize(NormalizationForm.FormC));
        foreach (var e in data.Exceptions.Split(Ws, StringSplitOptions.RemoveEmptyEntries))
        {
            var pts = new List<int>();
            int n = 0;
            foreach (var r in e.Normalize(NormalizationForm.FormC).EnumerateRunes())
            {
                if (r.Value == '-') pts.Add(n);
                else n++;
            }
            _exceptions[e.Replace("-", "").Normalize(NormalizationForm.FormC).ToLowerInvariant()] = pts;
        }
    }

    private void Add(string pat)
    {
        var letters = new List<int>();
        var vals = new List<byte> { 0 };
        foreach (var r in pat.EnumerateRunes())
        {
            if (r.Value >= '0' && r.Value <= '9') vals[^1] = (byte)(r.Value - '0');
            else { letters.Add(r.Value); vals.Add(0); }
        }
        var n = _root;
        foreach (int c in letters)
        {
            n.K ??= new Dictionary<int, Node>();
            if (!n.K.TryGetValue(c, out var nx)) { nx = new Node(); n.K[c] = nx; }
            n = nx;
        }
        n.V = vals.ToArray();
    }

    /// <summary>Letra em minúscula, mantendo UM código (as raras que viram duas ficam como estão).</summary>
    private static int LowerCp(Rune ch)
    {
        string s = ch.ToString();
        string l = s.ToLowerInvariant();
        var lr = Rune.GetRuneAt(l, 0);
        return l.Length == s.Length || lr.ToString() == l ? lr.Value : ch.Value;
    }

    /// <summary>Pontos de quebra pelos padrões, SEM mínimos: k ∈ [1, n−1] = hífen depois de k
    /// letras (código a código — a palavra deve vir em NFC, como os padrões).</summary>
    public IReadOnlyList<int> Points(string word)
    {
        lock (_lock)
        {
            if (_cache.TryGetValue(word, out var hit)) return hit;
            var low = word.EnumerateRunes().Select(LowerCp).ToList();
            int n = low.Count;
            var sb = new StringBuilder();
            foreach (int c in low) sb.Append(char.ConvertFromUtf32(c));
            List<int> o;
            if (_exceptions.TryGetValue(sb.ToString(), out var exc)) o = exc.Where(k => k > 0 && k < n).ToList();
            else
            {
                var w = new List<int>(n + 2) { Dot };
                w.AddRange(low);
                w.Add(Dot);
                var vals = new byte[w.Count + 1];
                for (int i = 0; i < w.Count; i++)
                {
                    Node? node = _root;
                    for (int j = i; j < w.Count && node is not null; j++)
                    {
                        node = node.K is not null && node.K.TryGetValue(w[j], out var nx) ? nx : null;
                        if (node?.V is { } v)
                        {
                            for (int q = 0; q < v.Length; q++) if (v[q] > vals[i + q]) vals[i + q] = v[q];
                        }
                    }
                }
                // posição k (depois de k letras da palavra) = vals[k + 1] (o "." inicial desloca 1)
                o = new List<int>();
                for (int k = 1; k < n; k++) if ((vals[k + 1] & 1) != 0) o.Add(k);
            }
            if (_cache.Count > 50000) _cache.Clear();
            _cache[word] = o;
            return o;
        }
    }

    /// <summary>Pontos com os mínimos de letras antes/depois do hífen (padrão: os do hyph-utf8).</summary>
    public List<int> Hyphenate(string word, int? left = null, int? right = null)
    {
        int l = left ?? Data.Left, r = right ?? Data.Right;
        int n = word.EnumerateRunes().Count();
        return Points(word).Where(k => k >= l && n - k >= r).ToList();
    }
}

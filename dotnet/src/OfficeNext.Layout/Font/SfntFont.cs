namespace OfficeNext.Layout;

/// <summary>
/// Porta de layout/src/font/sfnt.ts — parser mínimo de fontes SFNT (TTF/OTF), só o
/// necessário para layout:
///   head  → unitsPerEm
///   hhea  → ascender/descender/lineGap, numberOfHMetrics
///   hmtx  → advance width por glifo
///   cmap  → char → glyph id (formats 4 e 12; Windows Symbol (3,0) também
///           acha o glifo em U+F000 + código de 8 bits)
///   OS/2  → usWinAscent/usWinDescent, sTypoAscender/Descender/LineGap, fsSelection
///   post  → posição/espessura do sublinhado
///   GPOS  → kerning de pares (feature 'kern'); sem pares, a tabela 'kern' legada
///
/// Paridade exata com o JS (o teste de paridade do motor compara posições de glifo
/// a 0.05 twip): mesmas leituras na mesma ordem, leitura fora dos limites lança
/// (DataView), contas em double na ordem do JS, Math.round do JS.
/// </summary>
public sealed class SfntFont : ILayoutFont
{
    private readonly JsDataView _view;
    private readonly Dictionary<string, (long Offset, long Length)> _tables = new();
    public FontMetrics Metrics { get; }
    private readonly int _numGlyphs;
    private readonly int _numberOfHMetrics;
    private readonly long _hmtxOffset;
    private CmapRange[] _cmapRanges = [];
    // concorrente: a mesma face é compartilhada entre layouts (SystemFontProvider.Shared)
    private readonly System.Collections.Concurrent.ConcurrentDictionary<long, double> _advanceCache = new();
    private readonly Dictionary<int, int> _kernMap;
    /// <summary>'kern' registrada no script latino (ou DFLT) do GPOS — com ligaduras OpenType o
    /// Word só kerneia nesse caso; sem GPOS (só a tabela 'kern' legada): true</summary>
    public bool KernInLatin { get; private set; } = true;
    /// <summary>PairPos formato 2: ajuste contra a classe 0 do 2º glifo, por 1º glifo</summary>
    private readonly Dictionary<int, Gpos.Class0Entry> _kernClass0 = new();

    /// <summary>Faixa do cmap. Kind: 0 = formato 4 com delta; 1 = formato 4 via
    /// glyphIdArray (lido sob demanda — leitura fora dos limites lança no GlyphId,
    /// como no JS); 2 = formato 12.</summary>
    private readonly record struct CmapRange(long Start, long End, int Kind, int Delta, int RangeOffset, long IdP, long StartGlyph);

    public SfntFont(byte[] bytes)
    {
        _view = new JsDataView(bytes);
        var v = _view;

        int numTables = v.GetUint16(4);
        for (int i = 0; i < numTables; i++)
        {
            long p = 12 + (long)i * 16;
            string tag = new([(char)v.GetUint8(p), (char)v.GetUint8(p + 1), (char)v.GetUint8(p + 2), (char)v.GetUint8(p + 3)]);
            _tables[tag] = (v.GetUint32(p + 8), v.GetUint32(p + 12)); // Map.set: a última vence
        }

        var head = Req("head");
        var hhea = Req("hhea");
        var maxp = Req("maxp");
        var os2 = Req("OS/2");
        _numGlyphs = v.GetUint16(maxp.Offset + 4);
        _numberOfHMetrics = v.GetUint16(hhea.Offset + 34);
        _hmtxOffset = Req("hmtx").Offset;

        Metrics = new FontMetrics
        {
            UnitsPerEm = v.GetUint16(head.Offset + 18),
            Ascender = v.GetInt16(hhea.Offset + 4),
            Descender = v.GetInt16(hhea.Offset + 6),
            LineGap = v.GetInt16(hhea.Offset + 8),
            STypoAscender = v.GetInt16(os2.Offset + 68),
            STypoDescender = v.GetInt16(os2.Offset + 70),
            STypoLineGap = v.GetInt16(os2.Offset + 72),
            UsWinAscent = v.GetUint16(os2.Offset + 74),
            UsWinDescent = v.GetUint16(os2.Offset + 76),
            FsSelection = v.GetUint16(os2.Offset + 62),
            CodePageRange1 = os2.Length >= 86 && v.GetUint16(os2.Offset) >= 1 ? ((long)v.GetUint16(os2.Offset + 78) << 16) | v.GetUint16(os2.Offset + 80) : 0,
            YSuperscriptYOffset = os2.Length >= 26 ? v.GetInt16(os2.Offset + 24) : null,
            XAvgCharWidth = os2.Length >= 4 ? v.GetInt16(os2.Offset + 2) : null,
            Panose = os2.Length >= 42 ? Enumerable.Range(0, 10).Select(i => (int)v.GetUint8(os2.Offset + 32 + i)).ToArray() : null,
            UnderlinePosition = 0,
            UnderlineThickness = 0,
        };
        if (_tables.TryGetValue("post", out var post) && post.Length >= 12)
        {
            Metrics.UnderlinePosition = v.GetInt16(post.Offset + 8);
            Metrics.UnderlineThickness = v.GetInt16(post.Offset + 10);
        }

        ParseCmap();
        if (_tables.TryGetValue("GPOS", out var gpos))
        {
            try
            {
                _kernMap = Gpos.ParseGposKern(v, gpos.Offset, _kernClass0);
                KernInLatin = Gpos.GposKernInLatin(v, gpos.Offset);
            }
            catch (Exception) { _kernMap = new Dictionary<int, int>(); _kernClass0.Clear(); }
        }
        else _kernMap = new Dictionary<int, int>();
        // sem pares no GPOS: tabela 'kern' legada (formato 0) — Tahoma, Arial Narrow…
        if (_kernMap.Count == 0 && _tables.TryGetValue("kern", out var kernT))
        {
            // como no JS, o que já entrou no mapa antes de uma leitura inválida fica
            try { ParseLegacyKern(kernT.Offset); } catch (Exception) { /* tabela inválida: sem kerning */ }
        }
    }

    /// <summary>Pares de kerning (chave (g1&lt;&lt;16)|g2 int32, unidades da fonte), na
    /// ordem de inserção — para diagnóstico/paridade.</summary>
    internal IReadOnlyDictionary<int, int> KernMap => _kernMap;

    /// <summary>Tabela 'kern' (versão 0, subtabelas formato 0 horizontais).</summary>
    private void ParseLegacyKern(long off)
    {
        var v = _view;
        if (v.GetUint16(off) != 0) return;
        int n = v.GetUint16(off + 2);
        long p = off + 4;
        for (int t = 0; t < n; t++)
        {
            int length = v.GetUint16(p + 2);
            int coverage = v.GetUint16(p + 4);
            int format = coverage >> 8;
            bool horizontal = (coverage & 1) != 0;
            bool cross = (coverage & 4) != 0;
            if (format == 0 && horizontal && !cross)
            {
                int pairs = v.GetUint16(p + 6);
                for (int i = 0; i < pairs; i++)
                {
                    long r = p + 14 + (long)i * 6;
                    int key = (v.GetUint16(r) << 16) | v.GetUint16(r + 2);
                    // o valor só é lido quando o par é novo (como no JS)
                    if (!_kernMap.ContainsKey(key)) Gpos.SetIfAbsent(_kernMap, key, v.GetInt16(r + 4));
                }
            }
            p += length;
        }
    }

    /// <summary>Ajuste de kerning (par prev→cur) em TWIPS no em de dispositivo.
    /// O app de referência (DirectWrite) aplica a feature kern por padrão.</summary>
    public double KernTwips(int prevCodePoint, int codePoint, double sizePt) =>
        KernGlyphsTwips(GlyphIdJs(prevCodePoint), GlyphIdJs(codePoint), sizePt);

    /// <summary>Kerning do par de GLIFOS (g1→g2) em twips — para pares com glifo de ligadura.</summary>
    public double KernGlyphsTwips(long g1, long g2, double sizePt)
    {
        // as tabelas só têm ids de 16 bits: fora disso a chave colidiria com outro par
        if (g1 > 0xffff || g2 > 0xffff) return 0;
        int key = unchecked(((int)g1 << 16) | (int)g2);
        if (!_kernMap.TryGetValue(key, out int units))
        {
            units = _kernClass0.TryGetValue((int)g1, out var c0) && !c0.Cd2.ContainsKey((int)g2) ? c0.Adv : 0;
        }
        if (units == 0) return 0;
        double deviceEmPt = JsCompat.MathRound(sizePt * 600 / 72) * 72 / 600;
        return units * deviceEmPt * 20 / Metrics.UnitsPerEm;
    }

    private Gsub.GsubLigatures? _gsub;
    private bool _gsubRead;

    /// <summary>
    /// Ligaduras OpenType (GSUB, script latino) das features pedidas ('liga', 'clig',
    /// 'dlig', 'hlig') sobre uma sequência de glifos: grupos {glifo, quantos glifos de
    /// entrada cobre}; nulo se a fonte não tem nenhuma dessas ligaduras.
    /// </summary>
    public IReadOnlyList<(int Gid, int Len)>? Ligate(IReadOnlyList<int> gids, IReadOnlyList<string> features)
    {
        if (!_gsubRead)
        {
            _gsubRead = true;
            try { _gsub = _tables.TryGetValue("GSUB", out var t) ? Gsub.ParseGsubLigatures(_view, t.Offset) : null; }
            catch (Exception) { _gsub = null; }
        }
        var g = _gsub;
        if (g is null || g.Lookups.Count == 0 || !features.Any(f => g.Features.TryGetValue(f, out var l) && l.Any(li => g.Lookups.ContainsKey(li)))) return null;
        return Gsub.ApplyLigatures(g, gids, features);
    }

    private (long Offset, long Length) Req(string tag)
    {
        if (!_tables.TryGetValue(tag, out var t)) throw new InvalidDataException($"Tabela {tag} ausente");
        return t;
    }

    private void ParseCmap()
    {
        var v = _view;
        var cmap = Req("cmap");
        int n = v.GetUint16(cmap.Offset + 2);
        long best = -1;
        int bestScore = -1;
        for (int i = 0; i < n; i++)
        {
            long p = cmap.Offset + 4 + (long)i * 8;
            int platform = v.GetUint16(p);
            int encoding = v.GetUint16(p + 2);
            long offset = v.GetUint32(p + 4);
            // Preferência: Windows UCS-4 (3,10) > Windows BMP (3,1) > Unicode >
            // Windows Symbol (3,0: Wingdings, Symbol — códigos U+F0xx) > Mac
            int score =
                platform == 3 && encoding == 10 ? 4 :
                platform == 3 && encoding == 1 ? 3 :
                platform == 0 ? 2 :
                platform == 3 && encoding == 0 ? 1 : 0;
            if (score > bestScore) { bestScore = score; best = cmap.Offset + offset; }
        }
        if (best < 0) throw new InvalidDataException("cmap sem subtabela utilizável");
        _symbolCmap = bestScore == 1;

        var ranges = new List<CmapRange>();
        int format = v.GetUint16(best);
        if (format == 4)
        {
            // segCountX2 / 2 no JS pode ser fracionário (valor ímpar): o laço
            // `s < segCount` então dá uma volta a mais — preservado em double
            double segCount = v.GetUint16(best + 6) / 2.0;
            long endP = best + 14;
            long startP = endP + (long)(segCount * 2) + 2;
            long deltaP = startP + (long)(segCount * 2);
            long rangeP = deltaP + (long)(segCount * 2);
            for (int s = 0; s < segCount; s++)
            {
                int end = v.GetUint16(endP + (long)s * 2);
                int start = v.GetUint16(startP + (long)s * 2);
                int delta = v.GetInt16(deltaP + (long)s * 2);
                int rangeOffset = v.GetUint16(rangeP + (long)s * 2);
                long idP = rangeP + (long)s * 2;
                ranges.Add(new CmapRange(start, end, rangeOffset == 0 ? 0 : 1, delta, rangeOffset, idP, 0));
            }
        }
        else if (format == 12)
        {
            long nGroups = v.GetUint32(best + 12);
            for (long g = 0; g < nGroups; g++)
            {
                long p = best + 16 + g * 12;
                long start = v.GetUint32(p);
                long end = v.GetUint32(p + 4);
                long startGlyph = v.GetUint32(p + 8);
                ranges.Add(new CmapRange(start, end, 2, 0, 0, 0, startGlyph));
            }
        }
        else
        {
            throw new InvalidDataException($"cmap format {format} não suportado");
        }
        // Array.prototype.sort do V8 é estável; OrderBy também
        _cmapRanges = ranges.OrderBy(r => r.Start).ToArray();
    }

    /// <summary>cmap Windows Symbol (3,0): os glifos ficam em U+F000+código.</summary>
    private bool _symbolCmap;

    /// <summary>glyphId do JS: number — no formato 12 pode passar de int32
    /// (startGlyph u32 + deslocamento). O motor usa este valor; <see cref="GlyphId"/>
    /// devolve o mesmo truncado a int32 (idêntico para gids reais, &lt; 65536).</summary>
    internal long GlyphIdJs(int codePoint)
    {
        long g = LookupGlyph(codePoint);
        // fonte de símbolo: o código de 8 bits também vale (U+F000 + código)
        // (como no JS, vale também para code point negativo: < 0x100)
        if (g == 0 && _symbolCmap && codePoint < 0x100) return LookupGlyph(codePoint + 0xf000);
        return g;
    }

    private long LookupGlyph(int codePoint)
    {
        // busca binária nos ranges
        var ranges = _cmapRanges;
        int lo = 0, hi = ranges.Length - 1;
        while (lo <= hi)
        {
            int mid = (lo + hi) >> 1;
            ref readonly CmapRange r = ref ranges[mid];
            if (codePoint < r.Start) hi = mid - 1;
            else if (codePoint > r.End) lo = mid + 1;
            else return Map(in r, codePoint);
        }
        return 0;
    }

    private long Map(in CmapRange r, int c)
    {
        switch (r.Kind)
        {
            case 0:
                return (c + (long)r.Delta) & 0xffff;
            case 1:
            {
                long gp = r.IdP + r.RangeOffset + (c - r.Start) * 2;
                int g = _view.GetUint16(gp);
                return g == 0 ? 0 : (g + (long)r.Delta) & 0xffff;
            }
            default:
                return r.StartGlyph + (c - r.Start);
        }
    }

    public int GlyphId(int codePoint) => unchecked((int)GlyphIdJs(codePoint));

    /// <summary>Advance width do glifo em unidades da fonte.</summary>
    public double AdvanceWidth(int glyphId) => AdvanceWidthJs(glyphId);

    internal double AdvanceWidthJs(long glyphId)
    {
        if (_advanceCache.TryGetValue(glyphId, out double cached)) return cached;
        long i = Math.Min(glyphId, (long)_numberOfHMetrics - 1);
        double w = _view.GetUint16(_hmtxOffset + i * 4);
        _advanceCache[glyphId] = w;
        return w;
    }

    /// <summary>Tabela empírica de advances do app de referência (hinting/ClearType),
    /// por tamanho: { "11": { "a": twips, ... } } — extraída via
    /// word-lab/extract-advances.mjs. A chave do tamanho é `String(sizePt)` do JS e a
    /// do caractere, `String.fromCodePoint(cp)`.</summary>
    private Dictionary<string, Dictionary<string, double>>? _advanceTable;

    public void SetAdvanceTable(Dictionary<string, Dictionary<string, double>>? table) => _advanceTable = table;

    /// <summary>Advance de um code point em TWIPS para um tamanho em pontos.
    /// 1º tabela empírica do app de referência; fallback: escala linear com o em
    /// arredondado ao pixel de 600 DPI (11pt → 92/600" = 11.04pt).</summary>
    public double AdvanceTwips(int codePoint, double sizePt)
    {
        if (_advanceTable != null
            && _advanceTable.TryGetValue(JsCompat.NumberToString(sizePt), out var row)
            && row != null
            // String.fromCodePoint só é avaliado quando há linha (encadeamento opcional)
            && row.TryGetValue(JsCompat.FromCodePoint(codePoint), out double t))
            return t;
        double units = AdvanceWidthJs(GlyphIdJs(codePoint));
        double deviceEmPt = JsCompat.MathRound(sizePt * 600 / 72) * 72 / 600;
        return units * deviceEmPt * 20 / Metrics.UnitsPerEm;
    }

    // ───────────── contornos (texto como curvas no PDF) ─────────────

    private readonly System.Collections.Concurrent.ConcurrentDictionary<int, GlyphOutlineCmd[]?> _outlineCache = new();

    /// <summary>
    /// Contorno do glifo (TrueType glyf, glifos simples e compostos) em unidades
    /// da fonte, y para CIMA: M/L/Q/Z. null se a fonte não tem glyf (CFF) ou o
    /// glifo não existe. Usado para desenhar texto como curvas (WordArt, texto
    /// semitransparente, emoji colorido — como o Word faz no PDF).
    /// </summary>
    public IReadOnlyList<GlyphOutlineCmd>? GlyphOutline(int glyphId)
    {
        if (_outlineCache.TryGetValue(glyphId, out var cached)) return cached;
        GlyphOutlineCmd[]? outp;
        try
        {
            var pts = GlyphContours(glyphId, 0);
            outp = pts is not null ? ContoursToPath(pts) : null;
        }
        catch (Exception)
        {
            outp = null;
        }
        _outlineCache[glyphId] = outp;
        return outp;
    }

    private readonly record struct OutlinePt(double X, double Y, bool On);

    /// <summary>Contornos (pontos com on/off curve) de um glifo, compostos resolvidos.</summary>
    private List<List<OutlinePt>>? GlyphContours(int gid, int depth)
    {
        if (!_tables.TryGetValue("glyf", out var glyf) || !_tables.TryGetValue("loca", out var loca)
            || !_tables.TryGetValue("head", out var head) || !_tables.TryGetValue("maxp", out var maxp) || depth > 8) return null;
        var v = _view;
        int numGlyphs = v.GetUint16(maxp.Offset + 4);
        if (gid < 0 || gid >= numGlyphs) return null;
        bool longLoca = v.GetInt16(head.Offset + 50) == 1;
        long At(long i) => longLoca ? v.GetUint32(loca.Offset + i * 4) : v.GetUint16(loca.Offset + i * 2) * 2L;
        long start = At(gid), end = At(gid + 1);
        if (end <= start) return new List<List<OutlinePt>>(); // glifo vazio (espaço)
        long p0 = glyf.Offset + start;
        int nContours = v.GetInt16(p0);
        if (nContours >= 0)
        {
            long p = p0 + 10;
            var ends = new List<int>();
            for (int i = 0; i < nContours; i++) { ends.Add(v.GetUint16(p)); p += 2; }
            int nPts = nContours > 0 ? ends[nContours - 1] + 1 : 0;
            p += 2 + v.GetUint16(p); // instruções
            var flags = new List<int>();
            while (flags.Count < nPts)
            {
                int f = v.GetUint8(p++);
                flags.Add(f);
                if ((f & 8) != 0) { int rep = v.GetUint8(p++); while (rep-- > 0 && flags.Count < nPts) flags.Add(f); }
            }
            var xs = new List<double>(nPts);
            var ys = new List<double>(nPts);
            double x = 0;
            foreach (int f in flags)
            {
                if ((f & 2) != 0) { int d = v.GetUint8(p++); x += (f & 16) != 0 ? d : -d; }
                else if ((f & 16) == 0) { x += v.GetInt16(p); p += 2; }
                xs.Add(x);
            }
            double y = 0;
            foreach (int f in flags)
            {
                if ((f & 4) != 0) { int d = v.GetUint8(p++); y += (f & 32) != 0 ? d : -d; }
                else if ((f & 32) == 0) { y += v.GetInt16(p); p += 2; }
                ys.Add(y);
            }
            var contours = new List<List<OutlinePt>>();
            int s = 0;
            foreach (int e in ends)
            {
                var c = new List<OutlinePt>();
                for (int i = s; i <= e; i++) c.Add(new OutlinePt(xs[i], ys[i], (flags[i] & 1) == 1));
                contours.Add(c);
                s = e + 1;
            }
            return contours;
        }
        // composto
        var all = new List<List<OutlinePt>>();
        double F2(long o) => v.GetInt16(o) / 16384.0;
        long q0 = p0 + 10;
        for (int guard = 0; guard < 64; guard++)
        {
            int cflags = v.GetUint16(q0), comp = v.GetUint16(q0 + 2);
            q0 += 4;
            double dx, dy;
            if ((cflags & 1) != 0) { dx = v.GetInt16(q0); dy = v.GetInt16(q0 + 2); q0 += 4; }
            else { dx = (sbyte)v.GetUint8(q0); dy = (sbyte)v.GetUint8(q0 + 1); q0 += 2; }
            if ((cflags & 2) == 0) { dx = 0; dy = 0; } // casamento de pontos (raro): ignora
            double a = 1, b = 0, c = 0, d = 1;
            if ((cflags & 8) != 0) { a = d = F2(q0); q0 += 2; }
            else if ((cflags & 0x40) != 0) { a = F2(q0); d = F2(q0 + 2); q0 += 4; }
            else if ((cflags & 0x80) != 0) { a = F2(q0); b = F2(q0 + 2); c = F2(q0 + 4); d = F2(q0 + 6); q0 += 8; }
            var sub = GlyphContours(comp, depth + 1);
            if (sub is not null)
            {
                foreach (var ct in sub)
                {
                    var m = new List<OutlinePt>(ct.Count);
                    foreach (var q in ct) m.Add(new OutlinePt(a * q.X + c * q.Y + dx, b * q.X + d * q.Y + dy, q.On));
                    all.Add(m);
                }
            }
            if ((cflags & 0x20) == 0) break;
        }
        return all;
    }

    /// <summary>Pontos TrueType (on/off curve) → M/L/Q/Z (pontos "on" implícitos no meio de dois "off").</summary>
    private static GlyphOutlineCmd[] ContoursToPath(List<List<OutlinePt>> contours)
    {
        var outp = new List<GlyphOutlineCmd>();
        foreach (var c in contours)
        {
            int n = c.Count;
            if (n < 2) continue;
            // começa num ponto "on" (ou no meio de dois "off")
            int startIdx = c.FindIndex(q => q.On);
            double sx, sy;
            if (startIdx < 0) { sx = (c[0].X + c[1].X) / 2; sy = (c[0].Y + c[1].Y) / 2; startIdx = 0; }
            else { sx = c[startIdx].X; sy = c[startIdx].Y; }
            outp.Add(GlyphOutlineCmd.M(sx, sy));
            OutlinePt? ctrl = null;
            for (int k = 1; k <= n; k++)
            {
                var q = c[(startIdx + k) % n];
                if (q.On)
                {
                    if (ctrl is { } ct) { outp.Add(GlyphOutlineCmd.Q(ct.X, ct.Y, q.X, q.Y)); ctrl = null; }
                    else outp.Add(GlyphOutlineCmd.L(q.X, q.Y));
                }
                else if (ctrl is { } ct)
                {
                    outp.Add(GlyphOutlineCmd.Q(ct.X, ct.Y, (ct.X + q.X) / 2, (ct.Y + q.Y) / 2));
                    ctrl = q;
                }
                else ctrl = q;
            }
            if (ctrl is { } ce) outp.Add(GlyphOutlineCmd.Q(ce.X, ce.Y, sx, sy));
            outp.Add(GlyphOutlineCmd.Z);
        }
        return outp.ToArray();
    }

    // ───────────── glifos coloridos (COLR/CPAL) ─────────────

    /// <summary>COLR v0 (registros base/camadas — o v1 os mantém) + CPAL; preparado sob demanda</summary>
    private sealed record ColrInfo(long Base, int NBase, long Layers, int NLayers, long Colors, int FirstColor, int NColors);
    private ColrInfo? _colr;
    private volatile bool _colrDone;

    private ColrInfo? ColrTables()
    {
        if (_colrDone) return _colr;
        ColrInfo? info = null;
        if (_tables.TryGetValue("COLR", out var t) && _tables.TryGetValue("CPAL", out var cp) && t.Length >= 14 && cp.Length >= 14)
        {
            var v = _view;
            try
            {
                int nBase = v.GetUint16(t.Offset + 2);
                long bo = v.GetUint32(t.Offset + 4), lo = v.GetUint32(t.Offset + 8);
                int nLayers = v.GetUint16(t.Offset + 12);
                if (nBase != 0 && bo != 0 && lo != 0)
                    info = new ColrInfo(t.Offset + bo, nBase, t.Offset + lo, nLayers,
                        cp.Offset + v.GetUint32(cp.Offset + 8), v.GetUint16(cp.Offset + 12), v.GetUint16(cp.Offset + 2));
            }
            catch (Exception) { info = null; }
        }
        _colr = info;
        _colrDone = true;
        return info;
    }

    private Dictionary<int, (int YMax, int YMin)>? _vdmx;
    private bool _vdmxRead;

    /// <summary>VDMX, grupo da razão 1:1 (ou a que vale para todas): yMax/yMin no em em pixels.</summary>
    public (int YMax, int YMin)? Vdmx(int ppem)
    {
        if (!_vdmxRead)
        {
            _vdmxRead = true;
            if (_tables.TryGetValue("VDMX", out var t))
            {
                try
                {
                    var v = _view;
                    long o = t.Offset;
                    int nRatios = v.GetUint16(o + 4);
                    for (int i = 0; i < nRatios; i++)
                    {
                        long r = o + 6 + i * 4;
                        int x = v.GetUint8(r + 1), y0 = v.GetUint8(r + 2), y1 = v.GetUint8(r + 3);
                        // 1:1 (dispositivo quadrado) ou a razão "todas" (0:0:0)
                        if (!(x == 0 || (y0 <= x && x <= y1))) continue;
                        long g = o + v.GetUint16(o + 6 + nRatios * 4 + i * 2);
                        int recs = v.GetUint16(g);
                        var tab = new Dictionary<int, (int, int)>();
                        for (int k = 0; k < recs; k++)
                        {
                            long e = g + 4 + k * 6;
                            tab[v.GetUint16(e)] = (v.GetInt16(e + 2), v.GetInt16(e + 4));
                        }
                        _vdmx = tab;
                        break;
                    }
                }
                catch (Exception) { _vdmx = null; }
            }
        }
        return _vdmx is not null && _vdmx.TryGetValue(ppem, out var r2) ? r2 : null;
    }

    public bool HasColorGlyphs() => ColrTables() is not null;

    public IReadOnlyList<ColorLayer>? ColorLayers(int glyphId)
    {
        var c = ColrTables();
        if (c is null) return null;
        var v = _view;
        int lo = 0, hi = c.NBase - 1;
        while (lo <= hi)
        {
            int mid = (lo + hi) >> 1;
            long p = c.Base + (long)mid * 6;
            int g = v.GetUint16(p);
            if (g < glyphId) { lo = mid + 1; continue; }
            if (g > glyphId) { hi = mid - 1; continue; }
            int first = v.GetUint16(p + 2), n = v.GetUint16(p + 4);
            var outp = new List<ColorLayer>();
            for (int k = 0; k < n && first + k < c.NLayers; k++)
            {
                long q = c.Layers + (long)(first + k) * 4;
                int pal = v.GetUint16(q + 2);
                if (pal == 0xffff || pal >= c.NColors) { outp.Add(new ColorLayer(v.GetUint16(q), null, 1)); continue; }
                long r = c.Colors + (long)(c.FirstColor + pal) * 4; // BGRA
                string color = v.GetUint8(r + 2).ToString("X2") + v.GetUint8(r + 1).ToString("X2") + v.GetUint8(r).ToString("X2");
                outp.Add(new ColorLayer(v.GetUint16(q), color, v.GetUint8(r + 3) / 255.0));
            }
            return outp.Count > 0 ? outp : null;
        }
        return null;
    }
}

/// <summary>Comando de contorno de glifo (unidades da fonte, y para cima): M | L | Q | Z
/// (Q: controle em Cx/Cy, ponto final em X/Y).</summary>
public readonly record struct GlyphOutlineCmd(char Op, double X, double Y, double Cx, double Cy)
{
    public static GlyphOutlineCmd M(double x, double y) => new('M', x, y, 0, 0);
    public static GlyphOutlineCmd L(double x, double y) => new('L', x, y, 0, 0);
    public static GlyphOutlineCmd Q(double cx, double cy, double x, double y) => new('Q', x, y, cx, cy);
    public static readonly GlyphOutlineCmd Z = new('Z', 0, 0, 0, 0);
}

/// <summary>Camada de glifo colorido: glifo, cor RRGGBB (null = cor do texto) e opacidade.</summary>
public readonly record struct ColorLayer(int GlyphId, string? Color, double Alpha);

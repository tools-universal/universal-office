using System.IO.Enumeration;
using Microsoft.Win32.SafeHandles;

namespace OfficeNext.Layout;

/// <summary>Uma face indexada: arquivo + face na coleção (.ttc; 0 nos .ttf/.otf) e
/// os dados lidos do 'name'/'OS/2'. Nas listas do índice tipográfico,
/// <see cref="Family"/> é o nome tipográfico (ID 16), como no JS.</summary>
public sealed record SystemFontEntry(string Path, int Index, string Family, string? Typo, bool Bold, bool Italic, int Weight);

/// <summary>Face escolhida para (família, negrito, itálico) — porta do objeto devolvido
/// por face() em write/tools/corpus-lab/node-fonts.mjs.</summary>
public sealed class SystemFontFace
{
    /// <summary>`${family}|${b?'b':''}${i?'i':''}|${path}#${index}` (formato do JS).</summary>
    public required string Key { get; init; }
    public required string Family { get; init; }
    /// <summary>Bytes do sfnt (face extraída quando o arquivo é .ttc) — lidos da
    /// máquina, nunca gravados.</summary>
    public required byte[] Bytes { get; init; }
    public required SfntFont Font { get; init; }
    /// <summary>Variante PEDIDA.</summary>
    public bool Bold { get; init; }
    public bool Italic { get; init; }
    /// <summary>Pediu negrito/itálico e a face escolhida não é: sintetizar.</summary>
    public bool SynthBold { get; init; }
    public bool SynthItalic { get; init; }
}

/// <summary>
/// Provedor SÍNCRONO de fontes do sistema para o motor de layout — porta de
/// write/tools/corpus-lab/node-fonts.mjs: indexa as fontes instaladas
/// (Windows\Fonts, fontes do usuário, cache CloudFonts do Office — mesmas raízes
/// do shell Electron) e carrega os bytes sob demanda. As fontes são LIDAS da
/// máquina; nada é copiado (CLAUDE.md).
///
/// A ordem de varredura é a do Node (readdirSync na ordem do sistema de arquivos,
/// arquivos tratados na hora, subpastas empilhadas e desempilhadas LIFO) porque
/// ela decide empates e a deduplicação.
/// </summary>
public sealed class SystemFontIndex
{
    private sealed record Loaded(byte[] Bytes, SfntFont Font);
    private sealed record FaceInfo(string Family, string? Typo, bool Bold, bool Italic, int Weight);

    private readonly Dictionary<string, List<SystemFontEntry>> _index = new(StringComparer.Ordinal); // família(lc) → faces (nome RIBBI)
    private readonly List<List<SystemFontEntry>> _indexOrder = new(); // ordem de inserção do Map do JS
    private readonly Dictionary<string, List<SystemFontEntry>> _typoIndex = new(StringComparer.Ordinal); // nome tipográfico (ID 16)
    private readonly List<SystemFontEntry> _entries = new();
    private readonly Dictionary<string, Loaded?> _loaded = new(StringComparer.Ordinal);
    private readonly Dictionary<(string Family, bool Bold, bool Italic), SystemFontFace?> _faces = new();
    private readonly object _lock = new();

    /// <summary>Raízes varridas (existentes), na ordem.</summary>
    public IReadOnlyList<string> Roots { get; }

    /// <summary>Todas as faces lidas, na ordem de varredura (diagnóstico/paridade).</summary>
    public IReadOnlyList<SystemFontEntry> Entries => _entries;

    private SystemFontIndex(IReadOnlyList<string> roots) => Roots = roots;

    public static SystemFontIndex Create(IEnumerable<string>? extraRoots = null)
    {
        var idx = new SystemFontIndex(GetRoots(extraRoots));
        idx.Build();
        return idx;
    }

    private static List<string> GetRoots(IEnumerable<string>? extraRoots)
    {
        string local = Environment.GetEnvironmentVariable("LOCALAPPDATA")
            ?? JsPath.Join(HomeDir(), "AppData", "Local");
        var extra = (Environment.GetEnvironmentVariable("EXTRA_FONT_DIRS") ?? "")
            .Split(';').Where(s => s.Length > 0);
        var all = new List<string>
        {
            JsPath.Join(Environment.GetEnvironmentVariable("WINDIR") ?? "C:/Windows", "Fonts"),
            JsPath.Join(local, "Microsoft/Windows/Fonts"),
            JsPath.Join(local, "Microsoft/FontCache/4/CloudFonts"),
        };
        all.AddRange(extra);
        if (extraRoots != null) all.AddRange(extraRoots.Where(s => !string.IsNullOrEmpty(s)));
        // existsSync: arquivo ou pasta
        return all.Where(p => File.Exists(p) || Directory.Exists(p)).ToList();
    }

    /// <summary>os.homedir() do Node no Windows: USERPROFILE, senão o perfil do usuário.</summary>
    private static string HomeDir() =>
        Environment.GetEnvironmentVariable("USERPROFILE") is { } h
            ? h
            : Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

    private void Build()
    {
        foreach (string r in Roots)
        {
            var stack = new List<string> { r };
            while (stack.Count > 0)
            {
                string d = stack[^1];
                stack.RemoveAt(stack.Count - 1);
                List<(string Name, FileAttributes Attr)> ents;
                try { ents = ReadDir(d); } catch (Exception) { continue; }
                foreach (var (eName, attr) in ents)
                {
                    string p = JsPath.Join(d, eName);
                    if (IsDirectory(attr)) { stack.Add(p); continue; }
                    if (!HasFontExtension(eName)) continue;
                    foreach (var (i, faceIndex) in Infos(p))
                    {
                        _entries.Add(new SystemFontEntry(p, faceIndex, i.Family, i.Typo, i.Bold, i.Italic, i.Weight));
                        // nome RIBBI (ID 1) primeiro; o tipográfico (ID 16) só como alternativa
                        // ("Aptos Display" tem ID 16 = "Aptos" e não pode sombrear a Aptos)
                        AddTo(_index, i.Family, i, p, faceIndex, _indexOrder);
                        AddTo(_typoIndex, i.Typo, i, p, faceIndex, null);
                    }
                }
            }
        }
    }

    private static void AddTo(Dictionary<string, List<SystemFontEntry>> map, string? fam, FaceInfo i, string path, int faceIndex,
        List<List<SystemFontEntry>>? order)
    {
        if (string.IsNullOrEmpty(fam)) return;
        string key = JsCompat.ToLowerCase(fam);
        if (!map.TryGetValue(key, out var list))
        {
            list = new List<SystemFontEntry>();
            map[key] = list;
            order?.Add(list);
        }
        if (!list.Any(f => f.Bold == i.Bold && f.Italic == i.Italic && f.Weight == i.Weight))
            list.Add(new SystemFontEntry(path, faceIndex, fam, i.Typo, i.Bold, i.Italic, i.Weight));
    }

    /// <summary>readdirSync(d, { withFileTypes: true }): tudo ou erro (a pasta é pulada).
    /// Mesma fonte de dados do libuv (NtQueryDirectoryFile, ordem do sistema de
    /// arquivos); nada é filtrado por atributo (o .NET pula Hidden|System por padrão).</summary>
    private static List<(string Name, FileAttributes Attr)> ReadDir(string d)
    {
        var opts = new EnumerationOptions
        {
            AttributesToSkip = 0,
            IgnoreInaccessible = false,
            RecurseSubdirectories = false,
            ReturnSpecialDirectories = false,
        };
        var en = new FileSystemEnumerable<(string, FileAttributes)>(d,
            (ref FileSystemEntry e) => (e.FileName.ToString(), e.Attributes), opts);
        return en.ToList();
    }

    /// <summary>Dirent.isDirectory() do libuv no Windows: ponto de reparse (junção,
    /// symlink) é "link", nunca pasta — não é seguido na varredura.</summary>
    private static bool IsDirectory(FileAttributes a) =>
        (a & FileAttributes.ReparsePoint) == 0 && (a & FileAttributes.Directory) != 0;

    /// <summary>/\.(ttf|otf|ttc)$/i</summary>
    private static bool HasFontExtension(string name)
    {
        if (name.Length < 4 || name[^4] != '.') return false;
        int at = name.Length - 3;
        return JsCompat.MatchAsciiCI(name, at, "ttf") || JsCompat.MatchAsciiCI(name, at, "otf")
            || JsCompat.MatchAsciiCI(name, at, "ttc");
    }

    // ─────────────────────────── leitura do 'name'/'OS/2' ───────────────────────────

    /// <summary>Faces de um arquivo: .ttf/.otf = 1; coleção .ttc = todas (até 64).
    /// Qualquer erro no arquivo (fora do info de cada face) descarta o arquivo todo.</summary>
    private static List<(FaceInfo Info, int Index)> Infos(string path)
    {
        SafeFileHandle? fd = null;
        try
        {
            fd = File.OpenHandle(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
            byte[] head = ReadAt(fd, 0, 16);
            if (head.Length < 12) return [];
            if (Latin1(head, 0, 4) != "ttcf")
            {
                var i0 = Info(fd, 0);
                return i0 != null ? [(i0, 0)] : [];
            }
            long n = Math.Min(U32(head, 8), 64);
            byte[] offs = ReadAt(fd, 12, (int)(n * 4));
            var output = new List<(FaceInfo, int)>();
            for (int k = 0; k < n; k++)
            {
                var i = Info(fd, U32(offs, k * 4));
                if (i != null) output.Add((i, k));
            }
            return output;
        }
        catch (Exception) { return []; }
        finally { fd?.Dispose(); }
    }

    private static FaceInfo? Info(SafeFileHandle fd, long baseOff)
    {
        try
        {
            byte[] off = ReadAt(fd, baseOff, 12);
            int num = U16(off, 4);
            if (num == 0 || num > 512) return null;
            byte[] dir = ReadAt(fd, baseOff + 12, num * 16);
            var t = new Dictionary<string, (long Off, long Len)>(StringComparer.Ordinal);
            for (int i = 0; i < num; i++)
            {
                string tag = Latin1(dir, i * 16, i * 16 + 4);
                t[tag] = (U32(dir, i * 16 + 8), U32(dir, i * 16 + 12));
            }
            if (!t.TryGetValue("name", out var nameT)) return null;
            byte[] name = ReadAt(fd, nameT.Off, (int)Math.Min(nameT.Len, 1 << 20));
            int count = U16(name, 2), so = U16(name, 4);

            string? Get(int id)
            {
                string? any = null;
                for (int i = 0; i < count; i++)
                {
                    int r = 6 + i * 12;
                    if (U16(name, r) != 3 || U16(name, r + 6) != id) continue;
                    int len = U16(name, r + 8);
                    long o = so + U16(name, r + 10);
                    // Buffer.from(name.subarray(o, o + len)).swap16().toString('utf16le'):
                    // subarray limita ao tamanho; swap16 LANÇA com tamanho ímpar
                    long s0 = Math.Min(o, name.Length), s1 = Math.Min(o + len, name.Length);
                    int cnt = (int)Math.Max(0, s1 - s0);
                    if (cnt % 2 != 0) throw new JsRangeError("Buffer size must be a multiple of 16-bits");
                    // decodifica code units UTF-16BE sem validar (surrogate isolado fica, como no JS)
                    var chars = new char[cnt / 2];
                    for (int k = 0; k < chars.Length; k++)
                        chars[k] = (char)((name[s0 + 2 * k] << 8) | name[s0 + 2 * k + 1]);
                    string s = new(chars);
                    if (U16(name, r + 4) == 0x409) return s;
                    any ??= s;
                }
                return any;
            }

            string? family = Get(1) is { } f1 ? JsCompat.Trim(f1) : null;
            if (string.IsNullOrEmpty(family) || family[0] == '@') return null;
            string sub = Get(2) ?? "Regular";
            bool bold = JsCompat.ContainsWordAsciiCI(sub, "bold");
            bool italic = JsCompat.ContainsAsciiCI(sub, "italic") || JsCompat.ContainsAsciiCI(sub, "oblique");
            int weight = 400;
            if (t.TryGetValue("OS/2", out var os2T))
            {
                byte[] os2 = ReadAt(fd, os2T.Off, 64);
                if (os2.Length >= 64)
                {
                    int fs = U16(os2, 62);
                    int w = U16(os2, 4);
                    weight = w != 0 ? w : 400;
                    italic = (fs & 1) == 1 || italic;
                    bold = (fs & 0x20) != 0 || bold;
                }
            }
            // também indexa pelo nome "tipográfico" (ID 16) quando difere (ex.: famílias com pesos)
            string? typo = Get(16) is { } t16 ? JsCompat.Trim(t16) : null;
            return new FaceInfo(family, typo, bold, italic, weight);
        }
        catch (Exception) { return null; }
    }

    // ─────────────────────────── carga e escolha da face ───────────────────────────

    public IReadOnlyList<string> Families()
    {
        lock (_lock) return _indexOrder.Select(l => l[0].Family).ToList();
    }

    public SystemFontFace? Face(string family, bool bold, bool italic)
    {
        lock (_lock)
        {
            string lc = JsCompat.ToLowerCase(family);
            var key = (lc, bold, italic);
            if (_faces.TryGetValue(key, out var hit)) return hit;
            List<SystemFontEntry>? list = _index.GetValueOrDefault(lc) ?? _typoIndex.GetValueOrDefault(lc);
            SystemFontFace? output = null;
            if (list is { Count: > 0 })
            {
                // [...list].sort((a, b) => score(a) - score(b))[0]: sort estável ⇒ o
                // primeiro de menor score na ordem da lista
                double Score(SystemFontEntry f) =>
                    (f.Bold == bold ? 0 : 4) + (f.Italic == italic ? 0 : 2)
                    + Math.Abs(f.Weight - (bold ? 700 : 400)) / 1000.0;
                SystemFontEntry best = list[0];
                double bestScore = Score(best);
                for (int k = 1; k < list.Count; k++)
                {
                    double s = Score(list[k]);
                    if (s < bestScore) { best = list[k]; bestScore = s; }
                }
                var l = Load(best);
                if (l != null)
                {
                    output = new SystemFontFace
                    {
                        Key = $"{best.Family}|{(best.Bold ? "b" : "")}{(best.Italic ? "i" : "")}|{best.Path}#{best.Index}",
                        Family = best.Family,
                        Font = l.Font,
                        Bytes = l.Bytes,
                        Bold = bold,
                        Italic = italic,
                        SynthBold = bold && !best.Bold,
                        SynthItalic = italic && !best.Italic,
                    };
                }
            }
            _faces[key] = output;
            return output;
        }
    }

    private Loaded? Load(SystemFontEntry f)
    {
        string lk = f.Path + "#" + f.Index.ToString(System.Globalization.CultureInfo.InvariantCulture);
        if (_loaded.TryGetValue(lk, out var r)) return r;
        try
        {
            byte[] bytes = ReadAllBytes(f.Path);
            if (Latin1(bytes, 0, 4) == "ttcf") bytes = TtcFace(bytes, f.Index);
            r = new Loaded(bytes, new SfntFont(bytes));
        }
        catch (Exception) { r = null; }
        _loaded[lk] = r;
        return r;
    }

    /// <summary>Extrai a face <paramref name="index"/> de uma coleção .ttc como um
    /// sfnt autônomo (em memória). Semântica de Buffer do Node: leitura/escrita fora
    /// dos limites lança, copy limita ao tamanho, `(len + 3) &amp; ~3` em int32.</summary>
    private static byte[] TtcFace(byte[] buf, int index)
    {
        long baseOff = U32(buf, 12 + 4L * index);
        int num = U16(buf, baseOff + 4);
        var recs = new (long O, long Off, long Len)[num];
        for (int i = 0; i < num; i++)
        {
            long o = baseOff + 12 + (long)i * 16;
            recs[i] = (o, U32(buf, o + 8), U32(buf, o + 12));
        }
        long headerLen = 12 + (long)num * 16;
        long total = headerLen;
        foreach (var r in recs) total += Pad4(r.Len);
        if (total < 0 || total > Array.MaxLength) throw new JsRangeError("The value of \"size\" is out of range.");
        var output = new byte[total];
        NodeCopy(buf, output, 0, baseOff, baseOff + 12);
        long pos = headerLen;
        for (int i = 0; i < recs.Length; i++)
        {
            var r = recs[i];
            long d = 12 + (long)i * 16;
            NodeCopy(buf, output, d, r.O, r.O + 8);
            WriteU32(output, pos, d + 8);
            WriteU32(output, r.Len, d + 12);
            NodeCopy(buf, output, pos, r.Off, r.Off + r.Len);
            pos += Pad4(r.Len);
        }
        return output;
    }

    /// <summary>`(len + 3) &amp; ~3` do JS (ToInt32: u32 grande vira negativo).</summary>
    private static int Pad4(long len) => unchecked((int)(uint)(len + 3)) & ~3;

    // ─────────────────────────── Buffer do Node ───────────────────────────

    private static byte[] ReadAt(SafeFileHandle fd, long pos, int len)
    {
        var b = new byte[len];
        int n = 0;
        while (n < len)
        {
            int r = RandomAccess.Read(fd, b.AsSpan(n), pos + n);
            if (r <= 0) break;
            n += r;
        }
        return n == len ? b : b[..n];
    }

    /// <summary>readFileSync com o compartilhamento do libuv (leitura/escrita/exclusão).</summary>
    private static byte[] ReadAllBytes(string path)
    {
        using var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete,
            bufferSize: 1, FileOptions.SequentialScan);
        long len = fs.Length;
        if (len > Array.MaxLength) throw new IOException("File size is greater than 2 GiB");
        var b = new byte[len];
        int n = 0;
        while (n < b.Length)
        {
            int r = fs.Read(b, n, b.Length - n);
            if (r <= 0) break;
            n += r;
        }
        return n == b.Length ? b : b[..n];
    }

    /// <summary>buf.toString('latin1', start, end).</summary>
    private static string Latin1(byte[] b, int start, int end)
    {
        if (start >= b.Length) return "";
        if (end > b.Length) end = b.Length;
        if (end <= start) return "";
        var c = new char[end - start];
        for (int i = 0; i < c.Length; i++) c[i] = (char)b[start + i];
        return new string(c);
    }

    private static int U16(byte[] b, long o)
    {
        if (o < 0 || o + 2 > b.Length) throw new JsRangeError("Attempt to access memory outside buffer bounds");
        return (b[o] << 8) | b[o + 1];
    }

    private static long U32(byte[] b, long o)
    {
        if (o < 0 || o + 4 > b.Length) throw new JsRangeError("Attempt to access memory outside buffer bounds");
        return ((long)b[o] << 24) | ((long)b[o + 1] << 16) | ((long)b[o + 2] << 8) | b[o + 3];
    }

    private static void WriteU32(byte[] b, long value, long o)
    {
        if (value < 0 || value > 0xFFFFFFFFL) throw new JsRangeError("The value of \"value\" is out of range.");
        if (o < 0 || o + 4 > b.Length) throw new JsRangeError("Attempt to access memory outside buffer bounds");
        b[o] = (byte)(value >> 24);
        b[o + 1] = (byte)(value >> 16);
        b[o + 2] = (byte)(value >> 8);
        b[o + 3] = (byte)value;
    }

    /// <summary>buf.copy(target, targetStart, sourceStart, sourceEnd) do Node 24.</summary>
    private static void NodeCopy(byte[] source, byte[] target, long targetStart, long sourceStart, long sourceEnd)
    {
        if (targetStart < 0) throw new JsRangeError("The value of \"targetStart\" is out of range.");
        if (sourceStart < 0 || sourceStart > source.Length) throw new JsRangeError("The value of \"sourceStart\" is out of range.");
        if (sourceEnd < 0) throw new JsRangeError("The value of \"sourceEnd\" is out of range.");
        if (targetStart >= target.Length || sourceStart >= sourceEnd) return;
        long nb = Math.Min(Math.Min(sourceEnd - sourceStart, target.Length - targetStart), source.Length - sourceStart);
        if (nb <= 0) return;
        Array.Copy(source, sourceStart, target, targetStart, nb);
    }
}

namespace UniversalOffice.DocBinary;

/// <summary>Entrada do diretório (storage/stream).</summary>
internal sealed class CfbEntry
{
    public string Name = "";
    /// <summary>Caminho completo separado por "/" (a raiz não entra no caminho).</summary>
    public string Path = "";
    /// <summary>"root", "storage" ou "stream".</summary>
    public string Type = "";
    /// <summary>Tamanho do stream em bytes (double: v4 tem 64 bits).</summary>
    public double Size;
    public long Start;
}

/// <summary>
/// Leitor de Compound File Binary ([MS-CFB]) — porta de cfb.ts (cópia do
/// leitor do conversor .ppt). Só leitura; tolerante a arquivos levemente
/// truncados (setores fora do arquivo leem como zero) mas detecta ciclos.
/// </summary>
internal sealed class CfbFile
{
    private static readonly byte[] Signature = { 0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1 };
    private const long MAXREGSECT = 0xfffffffa;
    private const long ENDOFCHAIN = 0xfffffffe;
    private const long FREESECT = 0xffffffff;
    private const long NOSTREAM = 0xffffffff;

    public readonly List<CfbEntry> Entries = new();
    private readonly byte[] _bytes;
    private readonly int _sectorShift;
    private readonly int _miniSectorShift;
    private readonly long _miniCutoff;
    private readonly uint[] _fat;
    private readonly uint[] _miniFat;
    private Bytes? _miniStream;
    private readonly long _rootStart;
    private readonly double _rootSize;
    private readonly Dictionary<string, CfbEntry> _byPath = new(StringComparer.Ordinal);

    /// <summary>Verifica a assinatura de Compound File (D0 CF 11 E0 A1 B1 1A E1).</summary>
    public static bool IsCfbBytes(byte[] bytes)
    {
        if (bytes.Length < 8) return false;
        for (int i = 0; i < 8; i++) if (bytes[i] != Signature[i]) return false;
        return true;
    }

    private int U16At(long off) => _bytes[off] | (_bytes[off + 1] << 8);

    private long U32Raw(long off) =>
        (uint)(_bytes[off] | (_bytes[off + 1] << 8) | (_bytes[off + 2] << 16) | (_bytes[off + 3] << 24));

    public CfbFile(byte[] bytes)
    {
        if (!IsCfbBytes(bytes)) throw new InvalidDataException("Arquivo não é um Compound File (assinatura D0CF11E0 ausente)");
        if (bytes.Length < 512) throw new InvalidDataException("Compound File truncado (cabeçalho incompleto)");
        _bytes = bytes;
        int major = U16At(0x1a);
        if (U16At(0x1c) != 0xfffe) throw new InvalidDataException("Compound File com byte order inválido");
        _sectorShift = U16At(0x1e);
        _miniSectorShift = U16At(0x20);
        // tolera combinações fora do padrão (v3 = 2^9, v4 = 2^12), mas exige tamanhos
        // sãos para QUALQUER versão — um shift 28/30 alocava centenas de MB por setor
        if (_sectorShift < 7 || _sectorShift > 16) throw new InvalidDataException($"Compound File com setor inválido (2^{_sectorShift})");
        if (_miniSectorShift < 2 || _miniSectorShift > _sectorShift) throw new InvalidDataException("Compound File com mini setor inválido");
        long numFatSectors = U32Raw(0x2c);
        long firstDirSector = U32Raw(0x30);
        long cutoff = U32Raw(0x38);
        _miniCutoff = cutoff != 0 ? cutoff : 4096;
        long firstMiniFatSector = U32Raw(0x3c);
        long numMiniFatSectors = U32Raw(0x40);
        long firstDifatSector = U32Raw(0x44);
        long numDifatSectors = U32Raw(0x48);
        long sectorSize = 1L << _sectorShift;
        // setores que CABEM no arquivo: nada aponta (útil) além disso
        long fileSectors = Math.Max(0, (long)Math.Ceiling(bytes.Length / (double)sectorSize) - 1);
        bool InFile(long s) => s < fileSectors;

        // DIFAT: 109 entradas no cabeçalho + setores DIFAT encadeados
        var fatSectors = new List<long>();
        void AddFat(long s) { if (s <= MAXREGSECT) fatSectors.Add(s); }
        for (int i = 0; i < 109; i++) AddFat(U32Raw(0x4c + i * 4));
        long difat = firstDifatSector;
        long perDifat = sectorSize / 4 - 1;
        var seenDifat = new HashSet<long>();
        long perSector = sectorSize / 4;
        long maxFatSectors = (long)Math.Ceiling((fileSectors + 1) / (double)perSector);
        for (long n = 0; n < numDifatSectors && difat <= MAXREGSECT && InFile(difat) && fatSectors.Count < maxFatSectors; n++)
        {
            if (seenDifat.Contains(difat)) throw new InvalidDataException("Compound File com ciclo na DIFAT");
            seenDifat.Add(difat);
            long off = SectorOffset(difat);
            for (long i = 0; i < perDifat; i++) AddFat(U32At(off + i * 4));
            difat = U32At(off + perDifat * 4);
        }
        long fatCount = Math.Min(Math.Min(fatSectors.Count, numFatSectors != 0 ? numFatSectors : fatSectors.Count), maxFatSectors);
        _fat = new uint[fatCount * perSector];
        for (long i = 0; i < fatCount; i++)
        {
            long off = SectorOffset(fatSectors[(int)i]);
            for (long j = 0; j < perSector; j++) _fat[i * perSector + j] = (uint)U32At(off + j * 4);
        }

        // miniFAT (cadeia na FAT)
        Bytes miniFatBytes = numMiniFatSectors > 0 && firstMiniFatSector <= MAXREGSECT
            ? ReadChain(firstMiniFatSector, numMiniFatSectors * sectorSize)
            : Bytes.Empty;
        _miniFat = new uint[miniFatBytes.Length >> 2];
        var mfr = new ByteReader(miniFatBytes);
        for (int i = 0; i < _miniFat.Length; i++) _miniFat[i] = (uint)mfr.U32(i * 4);

        // diretório: entradas de 128 bytes numa cadeia da FAT
        var dir = ReadChain(firstDirSector, -1);
        var dv = new ByteReader(dir);
        var raw = new List<RawEntry>();
        for (long off = 0; off + 128 <= dir.Length; off += 128)
        {
            int nameLen = dv.U16(off + 0x40);
            var name = new System.Text.StringBuilder();
            double chars = Math.Max(0, Math.Min(32, nameLen / 2.0) - 1);
            for (int i = 0; i < chars; i++) name.Append((char)dv.U16(off + i * 2));
            long sizeLo = dv.U32(off + 0x78);
            long sizeHi = dv.U32(off + 0x7c);
            // v3: os 32 bits altos podem conter lixo (gravadores antigos) — ignorar
            double size = major == 3 ? sizeLo : sizeLo + sizeHi * 4294967296.0;
            raw.Add(new RawEntry
            {
                Name = name.ToString(), Type = dv.U8(off + 0x42),
                Left = dv.U32(off + 0x44), Right = dv.U32(off + 0x48),
                Child = dv.U32(off + 0x4c), Start = dv.U32(off + 0x74), Size = size,
            });
        }
        if (raw.Count == 0 || raw[0].Type != 5) throw new InvalidDataException("Compound File sem entrada raiz");
        var root = raw[0];
        _rootStart = root.Start;
        _rootSize = root.Size;

        Entries.Add(new CfbEntry { Name = root.Name, Path = "", Type = "root", Size = root.Size, Start = root.Start });
        var visited = new HashSet<long> { 0 };
        // profundidade de storages aninhados limitada
        const int MAX_DEPTH = 32;
        void Walk(long id, string prefix, int depth)
        {
            // pilha explícita: árvores degeneradas podem ser profundas
            var stack = new Stack<long>();
            long cur = id;
            while (stack.Count > 0 || (cur != NOSTREAM && cur < raw.Count))
            {
                while (cur != NOSTREAM && cur < raw.Count)
                {
                    if (visited.Contains(cur)) { cur = NOSTREAM; break; }
                    visited.Add(cur);
                    stack.Push(cur);
                    cur = raw[(int)cur].Left;
                }
                if (stack.Count == 0) break;
                long top = stack.Pop();
                var e = raw[(int)top];
                string path = prefix.Length > 0 ? $"{prefix}/{e.Name}" : e.Name;
                if (e.Type == 1 || e.Type == 2)
                {
                    var entry = new CfbEntry { Name = e.Name, Path = path, Type = e.Type == 1 ? "storage" : "stream", Size = e.Size, Start = e.Start };
                    Entries.Add(entry);
                    _byPath[path.ToLowerInvariant()] = entry;
                    if (e.Type == 1 && e.Child != NOSTREAM && depth < MAX_DEPTH) Walk(e.Child, path, depth + 1);
                }
                cur = e.Right;
            }
        }
        if (root.Child != NOSTREAM) Walk(root.Child, "", 0);
    }

    private sealed class RawEntry
    {
        public string Name = "";
        public int Type;
        public long Left, Right, Child, Start;
        public double Size;
    }

    /// <summary>Lê um stream pelo caminho (case-insensitive, como no Windows).</summary>
    public Bytes? GetStream(string path)
    {
        if (!_byPath.TryGetValue(path.ToLowerInvariant(), out var e) || e.Type != "stream") return null;
        if (e.Size == 0) return Bytes.Empty;
        if (e.Size < _miniCutoff) return ReadMiniChain(e.Start, e.Size);
        return ReadChain(e.Start, e.Size);
    }

    /// <summary>Há um stream/storage com esse caminho?</summary>
    public bool Has(string path) => _byPath.ContainsKey(path.ToLowerInvariant());

    private long SectorOffset(long sector) => (sector + 1) * (1L << _sectorShift);

    private long U32At(long off) => off + 4 <= _bytes.Length ? U32Raw(off) : FREESECT;

    /// <summary>Lê uma cadeia da FAT. `size &lt; 0` = cadeia inteira.</summary>
    private Bytes ReadChain(long start, double size)
    {
        long sectorSize = 1L << _sectorShift;
        var sectors = new List<long>();
        long limit = _fat.Length + 1;
        long s = start;
        while (s <= MAXREGSECT)
        {
            if (sectors.Count > limit) throw new InvalidDataException("Compound File com ciclo na FAT");
            sectors.Add(s);
            if (size >= 0 && sectors.Count * (double)sectorSize >= size) break;
            s = s < _fat.Length ? _fat[s] : ENDOFCHAIN;
        }
        // nunca mais que a cadeia real nem que o próprio arquivo
        long chainBytes = sectors.Count * sectorSize;
        long total = (long)Math.Min(Math.Min(size >= 0 ? size : chainBytes, chainBytes), _bytes.Length);
        var out_ = new byte[total];
        long pos = 0;
        foreach (long sec in sectors)
        {
            if (pos >= total) break;
            long off = SectorOffset(sec);
            long n = Math.Min(sectorSize, total - pos);
            long avail = Math.Max(0, Math.Min(n, _bytes.Length - off));
            if (avail > 0) Buffer.BlockCopy(_bytes, (int)off, out_, (int)pos, (int)avail);
            pos += n;
        }
        return new Bytes(out_);
    }

    /// <summary>Lê uma cadeia da miniFAT (dentro do mini stream da raiz).</summary>
    private Bytes ReadMiniChain(long start, double sizeD)
    {
        _miniStream ??= ReadChain(_rootStart, _rootSize);
        var mini = _miniStream.Value;
        long ms = 1L << _miniSectorShift;
        // stream pequeno vive DENTRO do mini stream: não pode ser maior que ele
        long size = (long)Math.Min(sizeD, mini.Length);
        var out_ = new byte[size];
        long pos = 0;
        long s = start;
        long guard = 0;
        while (s <= MAXREGSECT && pos < size)
        {
            if (guard++ > _miniFat.Length + 1) throw new InvalidDataException("Compound File com ciclo na miniFAT");
            long off = s * ms;
            long n = Math.Min(ms, size - pos);
            long avail = Math.Max(0, Math.Min(n, mini.Length - off));
            if (avail > 0) Buffer.BlockCopy(mini.A, mini.O + (int)off, out_, (int)pos, (int)avail);
            pos += n;
            s = s < _miniFat.Length ? _miniFat[s] : ENDOFCHAIN;
        }
        return new Bytes(out_);
    }
}

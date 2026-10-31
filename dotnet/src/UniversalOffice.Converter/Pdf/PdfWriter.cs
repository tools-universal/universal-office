using System.IO.Compression;

namespace UniversalOffice.Converter.Pdf;

/// <summary>
/// Writer PDF de baixo nível — porta de @wordnext/pdf writer.ts: aloca objetos
/// indiretos, serializa dicionários e streams, monta a tabela xref clássica e o
/// trailer. Sem conhecimento de fontes ou layout — só a mecânica do formato
/// (PDF 1.7, ISO 32000-1).
/// </summary>
public sealed class PdfWriter
{
    /// <summary>Corpo serializado de cada objeto (índice 0 = objeto 1). null = ainda não definido.</summary>
    private readonly List<byte[]?> _bodies = new();
    private readonly bool _compress;

    public PdfWriter(bool compress = true)
    {
        _compress = compress;
    }

    /// <summary>Reserva um número de objeto (1-based) para referência antecipada.</summary>
    public int Alloc()
    {
        _bodies.Add(null);
        return _bodies.Count;
    }

    /// <summary>Define o corpo de um objeto já alocado (entre `obj`/`endobj`).</summary>
    public void Define(int num, byte[] body) => _bodies[num - 1] = body;

    public void Define(int num, string body) => _bodies[num - 1] = Latin1(body);

    /// <summary>Atalho: aloca e define um dicionário a partir de uma string `&lt;&lt; ... &gt;&gt;`.</summary>
    public int AddDict(string dict)
    {
        int n = Alloc();
        Define(n, dict);
        return n;
    }

    /// <summary>
    /// Aloca e define um objeto stream. `dict` são as entradas extras do dicionário
    /// (sem /Length, sem &lt;&lt;/&gt;&gt;). Comprime com FlateDecode quando habilitado e
    /// vantajoso. Retorna o número do objeto.
    /// </summary>
    public int AddStream(string dict, byte[] data, bool allowCompress = true)
    {
        int n = Alloc();
        DefineStream(n, dict, data, allowCompress);
        return n;
    }

    public void DefineStream(int num, string dict, byte[] data, bool allowCompress = true)
        => DefineStreamPrepared(num, dict, Prepare(data, _compress, allowCompress));

    /// <summary>Compressão está habilitada neste writer?</summary>
    public bool CompressEnabled => _compress;

    /// <summary>Payload de stream já decidido (comprimido ou não) — permite preparar
    /// a compressão em PARALELO fora do writer e alocar objetos em ordem determinística.</summary>
    public readonly struct PreparedStream
    {
        public readonly byte[] Payload;
        public readonly bool Compressed;
        public PreparedStream(byte[] payload, bool compressed) { Payload = payload; Compressed = compressed; }
    }

    /// <summary>Decide e executa a compressão de um stream (thread-safe, sem tocar o writer).</summary>
    public static PreparedStream Prepare(byte[] data, bool compress, bool allowCompress = true)
    {
        if (compress && allowCompress && data.Length > 64)
        {
            // /FlateDecode espera um stream zlib (RFC 1950), não deflate cru (RFC 1951)
            byte[] z = Zlib(data);
            // só vale a pena se realmente reduzir
            if (z.Length < data.Length) return new PreparedStream(z, true);
        }
        return new PreparedStream(data, false);
    }

    public int AddStreamPrepared(string dict, PreparedStream ps)
    {
        int n = Alloc();
        DefineStreamPrepared(n, dict, ps);
        return n;
    }

    public void DefineStreamPrepared(int num, string dict, PreparedStream ps)
    {
        string filter = ps.Compressed ? " /Filter /FlateDecode" : "";
        var b = new ByteBuilder(ps.Payload.Length + dict.Length + 64);
        b.Str($"<< {dict.Trim()}{filter} /Length {ps.Payload.Length} >>\nstream\n")
         .Bytes(ps.Payload)
         .Str("\nendstream");
        Define(num, b.ToArray());
    }

    /// <summary>Monta o arquivo PDF completo, com xref clássico e trailer. `root` = obj do /Catalog.</summary>
    public byte[] Build(int root)
    {
        int total = 64;
        foreach (var body in _bodies) total += (body?.Length ?? 0) + 32;
        var outp = new ByteBuilder(total + _bodies.Count * 20 + 128);
        outp.Str("%PDF-1.7\n");
        // bytes binários no comentário inicial sinalizam arquivo binário a ferramentas
        outp.Bytes(stackalloc byte[] { 0x25, 0xe2, 0xe3, 0xcf, 0xd3 }).Str("\n");

        var offsets = new int[_bodies.Count];
        for (int i = 0; i < _bodies.Count; i++)
        {
            byte[] body = _bodies[i] ?? throw new InvalidOperationException($"Objeto PDF {i + 1} alocado mas não definido");
            offsets[i] = outp.Length;
            outp.Str($"{i + 1} 0 obj\n").Bytes(body).Str("\nendobj\n");
        }

        int xrefOffset = outp.Length;
        int count = _bodies.Count + 1; // +1 pelo objeto livre 0
        outp.Str($"xref\n0 {count}\n");
        outp.Str("0000000000 65535 f \n");
        for (int i = 0; i < _bodies.Count; i++)
            outp.Str($"{offsets[i].ToString(System.Globalization.CultureInfo.InvariantCulture).PadLeft(10, '0')} 00000 n \n");
        outp.Str("trailer\n");
        outp.Str($"<< /Size {count} /Root {root} 0 R >>\n");
        outp.Str($"startxref\n{xrefOffset}\n%%EOF\n");
        return outp.ToArray();
    }

    internal static byte[] Latin1(string s)
    {
        var outp = new byte[s.Length];
        for (int i = 0; i < s.Length; i++) outp[i] = unchecked((byte)s[i]);
        return outp;
    }

    /// <summary>Comprime em formato zlib (RFC 1950) — ZLibStream escreve header + adler32.</summary>
    internal static byte[] Zlib(byte[] data)
    {
        using var ms = new MemoryStream(data.Length / 2 + 64);
        using (var z = new ZLibStream(ms, CompressionLevel.Fastest, leaveOpen: true))
            z.Write(data, 0, data.Length);
        return ms.ToArray();
    }

    /// <summary>Descomprime um stream zlib (RFC 1950) — usado pelos testes de paridade.</summary>
    public static byte[] Unzlib(byte[] data)
    {
        using var src = new MemoryStream(data);
        using var z = new ZLibStream(src, CompressionMode.Decompress);
        using var outp = new MemoryStream(data.Length * 4 + 64);
        z.CopyTo(outp);
        return outp.ToArray();
    }
}

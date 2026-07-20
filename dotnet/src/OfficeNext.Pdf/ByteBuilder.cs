namespace OfficeNext.Pdf;

/// <summary>
/// Acumulador de bytes para montar um PDF — porta de @wordnext/pdf bytes.ts.
/// A estrutura do arquivo é ASCII/latin1, mas streams (fontes, imagens,
/// conteúdo comprimido) são binários; esta classe intercala texto (latin1)
/// e bytes crus num buffer único que cresce por duplicação.
/// </summary>
public sealed class ByteBuilder
{
    private byte[] _buf;
    private int _len;

    public ByteBuilder(int capacity = 1024)
    {
        _buf = new byte[Math.Max(16, capacity)];
    }

    /// <summary>Comprimento atual em bytes (offset corrente).</summary>
    public int Length => _len;

    private void Ensure(int extra)
    {
        int need = _len + extra;
        if (need <= _buf.Length) return;
        int cap = _buf.Length * 2;
        while (cap < need) cap *= 2;
        Array.Resize(ref _buf, cap);
    }

    /// <summary>Anexa uma string como latin1 (1 byte por code unit; só use ASCII/latin1).</summary>
    public ByteBuilder Str(string s)
    {
        Ensure(s.Length);
        var buf = _buf;
        int len = _len;
        for (int i = 0; i < s.Length; i++) buf[len + i] = unchecked((byte)s[i]);
        _len = len + s.Length;
        return this;
    }

    /// <summary>Anexa bytes crus.</summary>
    public ByteBuilder Bytes(ReadOnlySpan<byte> b)
    {
        Ensure(b.Length);
        b.CopyTo(_buf.AsSpan(_len));
        _len += b.Length;
        return this;
    }

    /// <summary>Anexa um byte.</summary>
    public ByteBuilder Byte(byte b)
    {
        Ensure(1);
        _buf[_len++] = b;
        return this;
    }

    /// <summary>Anexa um inteiro em decimal ASCII.</summary>
    public ByteBuilder Int(long v)
    {
        Ensure(20);
        if (v < 0) { _buf[_len++] = (byte)'-'; v = -v; }
        int start = _len;
        do
        {
            _buf[_len++] = (byte)('0' + (int)(v % 10));
            v /= 10;
        } while (v > 0);
        // inverte os dígitos
        for (int i = start, j = _len - 1; i < j; i++, j--)
            (_buf[i], _buf[j]) = (_buf[j], _buf[i]);
        return this;
    }

    /// <summary>
    /// Anexa um número no formato dos operadores PDF (até 3 casas, sem zeros
    /// supérfluos, -0 → 0) — MESMA saída de PdfNum.Fmt, sem alocar strings.
    /// </summary>
    public ByteBuilder Num(double n)
    {
        double scaled = Math.Floor(n * 1000 + 0.5); // Math.round do JS
        if (scaled == 0) return Byte((byte)'0');
        if (scaled > 9.2e18 || scaled < -9.2e18) return Str(PdfNum.Fmt(n)); // fora do long: caminho lento
        long s = (long)scaled;
        if (s < 0) { Byte((byte)'-'); s = -s; }
        Int(s / 1000);
        int frac = (int)(s % 1000);
        if (frac > 0)
        {
            Byte((byte)'.');
            Byte((byte)('0' + frac / 100));
            if (frac % 100 > 0)
            {
                Byte((byte)('0' + frac / 10 % 10));
                if (frac % 10 > 0) Byte((byte)('0' + frac % 10));
            }
        }
        return this;
    }

    /// <summary>Anexa um gid como &lt;hhhh&gt; (4 dígitos hex minúsculos).</summary>
    public ByteBuilder GlyphHex(int gid)
    {
        Ensure(6);
        _buf[_len++] = (byte)'<';
        for (int shift = 12; shift >= 0; shift -= 4)
        {
            int d = (gid >> shift) & 0xf;
            _buf[_len++] = (byte)(d < 10 ? '0' + d : 'a' + d - 10);
        }
        _buf[_len++] = (byte)'>';
        return this;
    }

    /// <summary>Concatena tudo num único array.</summary>
    public byte[] ToArray()
    {
        var outp = new byte[_len];
        Buffer.BlockCopy(_buf, 0, outp, 0, _len);
        return outp;
    }

    /// <summary>Visão dos bytes acumulados (sem cópia) — válida até o próximo append.</summary>
    public ReadOnlySpan<byte> AsSpan() => _buf.AsSpan(0, _len);
}

/// <summary>Utilidades de texto do pacote PDF.</summary>
public static class PdfText
{
    /// <summary>String UTF-16 → hex UTF-16BE (para CMaps/ToUnicode).</summary>
    public static string Utf16BeHex(string s)
    {
        var sb = new System.Text.StringBuilder(s.Length * 4);
        foreach (char c in s)
        {
            sb.Append(((c >> 8) & 0xff).ToString("x2"));
            sb.Append((c & 0xff).ToString("x2"));
        }
        return sb.ToString();
    }
}

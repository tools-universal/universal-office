namespace OfficeNext.Layout;

/// <summary>
/// Porta do DataView do JS sobre os bytes da fonte: leituras big-endian e, como no
/// JS, leitura fora dos limites LANÇA (RangeError) — os try/catch do parser
/// (GPOS inválido → sem kerning, 'kern' legado truncado…) dependem disso.
/// Offsets em long: no JS são number (somas de u32 não estouram).
/// </summary>
internal sealed class JsDataView
{
    private readonly byte[] _b;
    public readonly int Length;

    public JsDataView(byte[] bytes)
    {
        _b = bytes;
        Length = bytes.Length;
    }

    private int At(long o, int size)
    {
        if (o < 0 || o + size > Length) throw new JsRangeError($"Offset is outside the bounds of the DataView ({o})");
        return (int)o;
    }

    public int GetUint8(long o) => _b[At(o, 1)];

    public int GetUint16(long o)
    {
        int p = At(o, 2);
        return (_b[p] << 8) | _b[p + 1];
    }

    public int GetInt16(long o) => (short)GetUint16(o);

    public long GetUint32(long o)
    {
        int p = At(o, 4);
        return ((long)_b[p] << 24) | ((long)_b[p + 1] << 16) | ((long)_b[p + 2] << 8) | _b[p + 3];
    }
}

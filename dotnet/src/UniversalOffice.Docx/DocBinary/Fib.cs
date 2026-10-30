namespace UniversalOffice.DocBinary;

/// <summary>Índices dos pares fc/lcb em FibRgFcLcb97 (e extensões 2000+).</summary>
internal static class FC
{
    public const int StshfOrig = 0, Stshf = 1, PlcffndRef = 2, PlcffndTxt = 3, PlcfandRef = 4, PlcfandTxt = 5;
    public const int PlcfSed = 6, PlcPad = 7, PlcfPhe = 8, SttbfGlsy = 9, PlcfGlsy = 10, PlcfHdd = 11;
    public const int PlcfBteChpx = 12, PlcfBtePapx = 13, PlcfSea = 14, SttbfFfn = 15, PlcfFldMom = 16, PlcfFldHdr = 17;
    public const int SttbfBkmk = 21, PlcfBkf = 22, PlcfBkl = 23;
    public const int Dop = 31, Clx = 33, GrpXstAtnOwners = 36, SttbfAtnBkmk = 37;
    public const int PlcSpaMom = 40, PlcSpaHdr = 41, PlcfAtnBkf = 42, PlcfAtnBkl = 43;
    public const int PlcfendRef = 46, PlcfendTxt = 47, DggInfo = 50, SttbfRMark = 51;
    public const int PlcftxbxTxt = 56, PlcfHdrtxbxTxt = 58, PlfLst = 73, PlfLfo = 74;
}

/// <summary>
/// File Information Block ([MS-DOC] 2.5) — porta de fib.ts. Os tamanhos são
/// lidos dos contadores (csw/cslw/cbRgFcLcb), não presumidos.
/// </summary>
internal sealed class Fib
{
    public int WIdent;
    public int NFib;
    public int Lid;
    public bool FDot, FComplex, FEncrypted, FWhichTblStm, FObfuscated, FExtChar, FFarEast;
    public int LidFE;
    public int CcpText, CcpFtn, CcpHdd, CcpMcr, CcpAtn, CcpEdn, CcpTxbx, CcpHdrTxbx;

    private ByteReader _r = null!;
    private int _cbRgFcLcb;
    private long _rgFcLcb;

    /// <summary>Par fc/lcb pelo índice; ausentes = 0.</summary>
    public (long Fc, long Lcb) FcLcb(int index)
    {
        if (index >= _cbRgFcLcb) return (0, 0);
        return (_r.U32(_rgFcLcb + index * 8), _r.U32(_rgFcLcb + index * 8 + 4));
    }

    public static Fib Read(Bytes word)
    {
        if (word.Length < 0x9a) throw new DocFormatException("Arquivo .doc corrompido: FIB truncado.");
        var r = new ByteReader(word);
        int wIdent = r.U16(0);
        if (wIdent != 0xa5ec && wIdent != 0xa5dc) throw new DocFormatException($"Arquivo .doc corrompido: assinatura do FIB inválida (0x{wIdent:x}).");
        int nFib = r.U16(2);
        int lid = r.U16(6);
        int flags = r.U16(0x0a);
        // contadores variáveis
        long off = 32;
        int csw = r.U16(off); off += 2;
        long rgW = off; off += csw * 2;
        int cslw = r.U16(off); off += 2;
        long rgLw = off; off += cslw * 4;
        int cbRgFcLcb = r.U16(off); off += 2;
        long rgFcLcb = off; off += cbRgFcLcb * 8;
        int cswNew = off + 2 <= word.Length ? r.U16(off) : 0; off += 2;
        if (cswNew > 0 && off + 2 <= word.Length)
        {
            int nFibNew = r.U16(off);
            if (nFibNew != 0) nFib = nFibNew;
        }
        int Lw(int i) => i < cslw ? r.I32(rgLw + i * 4) : 0;
        return new Fib
        {
            WIdent = wIdent,
            NFib = nFib,
            Lid = lid,
            FDot = (flags & 0x0001) != 0,
            FComplex = (flags & 0x0004) != 0,
            FEncrypted = (flags & 0x0100) != 0,
            FWhichTblStm = (flags & 0x0200) != 0,
            FExtChar = (flags & 0x1000) != 0,
            FFarEast = (flags & 0x4000) != 0,
            FObfuscated = (flags & 0x8000) != 0,
            LidFE = csw > 13 ? r.U16(rgW + 26) : 0,
            CcpText = Lw(3),
            CcpFtn = Lw(4),
            CcpHdd = Lw(5),
            CcpMcr = Lw(6),
            CcpAtn = Lw(7),
            CcpEdn = Lw(8),
            CcpTxbx = Lw(9),
            CcpHdrTxbx = Lw(10),
            _r = r,
            _cbRgFcLcb = cbRgFcLcb,
            _rgFcLcb = rgFcLcb,
        };
    }
}

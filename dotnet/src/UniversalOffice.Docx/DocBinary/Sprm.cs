namespace UniversalOffice.DocBinary;

/// <summary>
/// Single Property Modifier ([MS-DOC] 2.2.5.1) — porta de sprm.ts. Op = início
/// do operando (para variáveis: DEPOIS dos bytes de tamanho); Len sem eles.
/// </summary>
internal readonly struct Prl
{
    public readonly int Sprm;
    public readonly long Op;
    public readonly long Len;
    public readonly ByteReader R;

    public Prl(int sprm, long op, long len, ByteReader r)
    {
        Sprm = sprm;
        Op = op;
        Len = len;
        R = r;
    }

    public int U8 => R.U8(Op);
    public int U16 => R.U16(Op);
    public int I16 => R.I16(Op);
    public long U32 => R.U32(Op);
    public int I32 => R.I32(Op);
}

internal static class Sprms
{
    public static int SgcOf(int sprm) => (sprm >> 10) & 7;

    /// <summary>Percorre os Prl de um grpprl. Para no primeiro que transborda.</summary>
    public static IEnumerable<Prl> Prls(Bytes grpprl)
    {
        var r = new ByteReader(grpprl);
        long off = 0;
        long end = grpprl.Length;
        while (off + 2 <= end)
        {
            int sprm = r.U16(off);
            off += 2;
            int spra = sprm >> 13;
            long op = off;
            long len;
            switch (spra)
            {
                case 0: case 1: len = 1; break;
                case 2: case 4: case 5: len = 2; break;
                case 3: len = 4; break;
                case 7: len = 3; break;
                default:
                    if (sprm == 0xd608 || sprm == 0xd606)
                    {
                        // TDefTableOperand: cb (u16) = bytes restantes + 1
                        int cb = r.U16(off);
                        op = off + 2;
                        len = Math.Max(0, cb - 1);
                    }
                    else if (sprm == 0xc615)
                    {
                        int cb = r.U8(off);
                        op = off + 1;
                        if (cb == 255)
                        {
                            // PChgTabsOperand longo: tamanho calculado pelas contagens
                            int cDel = r.U8(op);
                            int cAdd = r.U8(op + 1 + cDel * 4);
                            len = 1 + cDel * 4 + 1 + cAdd * 3;
                        }
                        else len = cb;
                    }
                    else
                    {
                        len = r.U8(off);
                        op = off + 1;
                    }
                    break;
            }
            if (op + len > end) yield break;
            yield return new Prl(sprm, op, len, r);
            off = op + len;
        }
    }
}

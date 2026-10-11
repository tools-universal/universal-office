namespace OfficeNext.DocBinary;

internal sealed class Section
{
    public long CpStart;
    public long CpEnd;
    public Sep Sep = new();
}

internal sealed class Note
{
    /// <summary>CP da referência no texto principal.</summary>
    public long RefCp;
    /// <summary>Numeração automática (FRD.nAuto &gt; 0) ou marca personalizada.</summary>
    public bool Auto;
    public long CpStart;
    public long CpEnd;
}

internal sealed class Comment
{
    public long RefCp;
    public long CpStart;
    public long CpEnd;
    public string Author = "";
    public string Initials = "";
    public long? RangeStart;
    public long? RangeEnd;
}

internal sealed class Bookmark
{
    public string Name = "";
    public long CpStart;
    public long CpEnd;
}

internal sealed class Fspa
{
    public long Cp;
    public int Spid;
    public int XaLeft, YaTop, XaRight, YaBottom;
    public int Bx, By, Wr, Wrk;
    public bool BelowText, AnchorLock;
}

internal sealed class TxbxStory
{
    public int Spid;
    public long CpStart;
    public long CpEnd;
}

internal sealed class Subdocs
{
    public (long, long) Main, Ftn, Hdd, Atn, Edn, Txbx, HdrTxbx;
}

/// <summary>
/// Leitor do .doc — porta de reader.ts: abre o Compound File, valida o FIB e
/// monta o contexto (texto, FKPs, estilos, fontes, listas, seções, notas,
/// cabeçalhos, desenhos).
/// </summary>
internal sealed class DocReader
{
    public readonly CfbFile Cfb;
    public readonly Fib Fib;
    public readonly Bytes Word;
    public readonly Bytes Table;
    public readonly Bytes? Data;
    public readonly PieceTable Pt;
    public readonly string Text;
    public readonly List<FcRun> Chpx;
    public readonly List<FcRun> Papx;
    public readonly StyleSheet Stsh;
    public readonly StyleResolver Styles;
    public readonly List<DocFont> Fonts;
    public readonly DocLists Lists;
    public readonly Subdocs Sub;
    public readonly List<Section> Sections;
    public readonly Bytes Dop;
    /// <summary>Orçamento de descompressão de imagens deste documento (bombas zlib).</summary>
    public readonly BlipBudget BlipBudget = new();
    private Dictionary<long, OAShape>? _shapesMain;
    private Dictionary<long, OAShape>? _shapesHdr;
    private List<BseEntry?>? _bstore;
    /// <summary>spids das formas-mestre (hspMaster de outra forma): o Word não as desenha.</summary>
    public readonly HashSet<long> Masters = new();

    private const string Pre97 = "Documento de uma versão anterior ao Word 97 (Word 6/95) — formato não suportado. Abra e salve no Word como .docx.";

    public DocReader(byte[] bytes)
    {
        CfbFile cfb;
        try { cfb = new CfbFile(bytes); }
        catch (Exception e) when (e is not DocFormatException)
        {
            throw new DocFormatException($"Arquivo .doc corrompido: {e.Message}");
        }
        Cfb = cfb;
        if (cfb.Has("EncryptionInfo") || cfb.Has("EncryptedPackage"))
            throw new DocFormatException("O documento está protegido por senha (criptografado) e não pode ser aberto.");
        var word = cfb.GetStream("WordDocument");
        if (word is null) throw new DocFormatException("O arquivo não é um documento do Word (.doc): stream WordDocument ausente.");
        Word = word.Value;
        if (Word.Length >= 4)
        {
            var w = new ByteReader(Word);
            int ident = w.U16(0);
            int nFib0 = w.U16(2);
            if ((ident == 0xa5ec || ident == 0xa5dc) && nFib0 < 0x00c1 && nFib0 != 0) throw new DocFormatException(Pre97);
        }
        var fib = Fib.Read(Word);
        Fib = fib;
        if (fib.NFib < 0x00c1) throw new DocFormatException(Pre97);
        if (fib.FEncrypted)
        {
            throw new DocFormatException(fib.FObfuscated
                ? "O documento está protegido por senha (ofuscação XOR) e não pode ser aberto."
                : "O documento está protegido por senha (criptografado) e não pode ser aberto.");
        }
        string tableName = fib.FWhichTblStm ? "1Table" : "0Table";
        var table = cfb.GetStream(tableName);
        if (table is null) throw new DocFormatException($"Arquivo .doc corrompido: stream {tableName} ausente.");
        Table = table.Value;
        Data = cfb.GetStream("Data");
        Pt = DocText.ReadPieceTable(fib, Table);
        long[] c = new long[] { fib.CcpText, fib.CcpFtn, fib.CcpHdd, fib.CcpMcr, fib.CcpAtn, fib.CcpEdn, fib.CcpTxbx, fib.CcpHdrTxbx }
            .Select(v => Math.Max(0L, v)).ToArray();
        long at = 0;
        (long, long) Span(long n) { var s = (at, at + n); at += n; return s; }
        var main = Span(c[0]);
        var ftn = Span(c[1]);
        var hdd = Span(c[2]);
        Span(c[3]);
        var atn = Span(c[4]);
        var edn = Span(c[5]);
        var txbx = Span(c[6]);
        var hdrTxbx = Span(c[7]);
        Sub = new Subdocs { Main = main, Ftn = ftn, Hdd = hdd, Atn = atn, Edn = edn, Txbx = txbx, HdrTxbx = hdrTxbx };
        long lastPieceCp = Pt.Pieces.Count > 0 ? Pt.Pieces[^1].CpEnd : 0;
        // subdocumentos não vazios têm um parágrafo final extra (coberto pelas peças)
        long totalCp = Math.Max(at, Math.Min(lastPieceCp, at + 1));
        Text = DocText.DecodeText(Pt, Word, totalCp);
        Chpx = Fkp.ReadChpxRuns(fib, Table, Word);
        Papx = Fkp.ReadPapxRuns(fib, Table, Word, Data);
        Stsh = global::OfficeNext.DocBinary.Stsh.Read(fib, Table);
        Styles = new StyleResolver(Stsh);
        Fonts = global::OfficeNext.DocBinary.Fonts.Read(fib, Table);
        Lists = global::OfficeNext.DocBinary.Lists.Read(fib, Table);
        Sections = ReadSections();
        var (dfc, dlcb) = fib.FcLcb(FC.Dop);
        Dop = dlcb != 0 && dfc + dlcb <= Table.Length ? Table.Sub(dfc, dfc + dlcb) : Bytes.Empty;
    }

    public List<Piece> Pieces => Pt.Pieces;

    /// <summary>grpprl do Prm de uma peça (salvamento rápido).</summary>
    public Bytes? PrmGrpprl(Piece piece)
    {
        int prm = piece.Prm;
        if ((prm & 1) != 0)
        {
            int i = prm >> 1;
            return i < Pt.Prcs.Count ? Pt.Prcs[i] : null;
        }
        return null; // Prm0 (sprm único comprimido) não é gerado pelo Word 97+
    }

    /// <summary>
    /// Fim do parágrafo que contém `cp` ([MS-DOC] 2.4.2): acha a faixa PAPX do FC;
    /// se termina dentro da peça, o parágrafo acaba ali; senão segue na peça seguinte.
    /// </summary>
    public (long End, FcRun? Run, Piece? Piece) ParagraphAt(long cp, long limit)
    {
        long cur = cp;
        int guard = 0;
        while (cur < limit && guard++ < 100000)
        {
            int i = DocText.PieceAt(Pt.Pieces, cur);
            if (i < 0) return (limit, null, null);
            var p = Pt.Pieces[i];
            int cs = p.Compressed ? 1 : 2;
            double fc = p.Fc + (cur - p.CpStart) * (double)cs;
            var run = Fkp.RunAt(Papx, fc);
            double pieceFcEnd = p.Fc + (p.CpEnd - p.CpStart) * (double)cs;
            if (run is not null && run.FcEnd <= pieceFcEnd && run.FcEnd > fc)
            {
                long end = p.CpStart + (long)Math.Ceiling((run.FcEnd - p.Fc) / cs);
                if (end > limit) return (limit, run, p);
                return (end, run, p);
            }
            cur = p.CpEnd;
        }
        return (limit, null, null);
    }

    // ───────────────────────────── seções ─────────────────────────────

    private List<Section> ReadSections()
    {
        var (fc, lcb) = Fib.FcLcb(FC.PlcfSed);
        var plc = Plc.Read(Table, fc, lcb, 12);
        var out_ = new List<Section>();
        var w = new ByteReader(Word);
        long mainEnd = Sub.Main.Item2;
        if (plc is not null)
        {
            for (long i = 0; i < plc.N; i++)
            {
                var sep = new Sep();
                long fcSepx = plc.R.U32(plc.DataAt(i) + 2);
                if (fcSepx != 0xffffffff && fcSepx + 2 <= Word.Length)
                {
                    int cb = w.I16(fcSepx);
                    var grpprl = w.Sub(fcSepx + 2, fcSepx + 2 + Math.Max(0, cb));
                    foreach (var p in Sprms.Prls(grpprl)) Sep.Apply(sep, p);
                }
                long cpStart = Math.Min(plc.Cps[(int)i], mainEnd);
                long cpEnd = Math.Min(plc.Cps[(int)i + 1], mainEnd);
                if (cpEnd > cpStart || out_.Count == 0) out_.Add(new Section { CpStart = cpStart, CpEnd = cpEnd, Sep = sep });
            }
        }
        if (out_.Count == 0) out_.Add(new Section { CpStart = 0, CpEnd = mainEnd, Sep = new Sep() });
        out_[^1].CpEnd = mainEnd;
        return out_;
    }

    // ───────────────────────────── cabeçalhos ─────────────────────────────

    /// <summary>Histórias de cabeçalho/rodapé: [início, fim) absolutos, por índice do Plcfhdd.</summary>
    public List<(long, long)?> HeaderStories()
    {
        var out_ = new List<(long, long)?>();
        var (fc, lcb) = Fib.FcLcb(FC.PlcfHdd);
        var plc = Plc.Read(Table, fc, lcb, 0);
        if (plc is null || Fib.CcpHdd == 0) return out_;
        long @base = Sub.Hdd.Item1;
        // o último CP é indefinido; o penúltimo só fecha a última história
        for (int i = 0; i < plc.Cps.Count - 2; i++)
        {
            long a = plc.Cps[i], b = plc.Cps[i + 1];
            out_.Add(b > a && b <= Fib.CcpHdd ? (@base + a, @base + b) : null);
        }
        return out_;
    }

    // ───────────────────────────── notas ─────────────────────────────

    public List<Note> Notes(bool ftn)
    {
        var out_ = new List<Note>();
        var @ref = Fib.FcLcb(ftn ? FC.PlcffndRef : FC.PlcfendRef);
        var txt = Fib.FcLcb(ftn ? FC.PlcffndTxt : FC.PlcfendTxt);
        var refPlc = Plc.Read(Table, @ref.Fc, @ref.Lcb, 2);
        var txtPlc = Plc.Read(Table, txt.Fc, txt.Lcb, 0);
        if (refPlc is null || txtPlc is null) return out_;
        long @base = (ftn ? Sub.Ftn : Sub.Edn).Item1;
        for (long i = 0; i < refPlc.N; i++)
        {
            long? a = txtPlc.Cp(i), b = txtPlc.Cp(i + 1);
            if (a is null || b is null) break;
            out_.Add(new Note { RefCp = refPlc.Cps[(int)i], Auto = refPlc.R.I16(refPlc.DataAt(i)) > 0, CpStart = @base + a.Value, CpEnd = @base + b.Value });
        }
        return out_;
    }

    // ───────────────────────────── comentários ─────────────────────────────

    public List<Comment> Comments()
    {
        var out_ = new List<Comment>();
        var @ref = Fib.FcLcb(FC.PlcfandRef);
        var txt = Fib.FcLcb(FC.PlcfandTxt);
        var refPlc = Plc.Read(Table, @ref.Fc, @ref.Lcb, 30);
        var txtPlc = Plc.Read(Table, txt.Fc, txt.Lcb, 0);
        if (refPlc is null || txtPlc is null) return out_;
        var owners = XstArray(FC.GrpXstAtnOwners);
        long @base = Sub.Atn.Item1;
        // bookmarks de anotação (faixas comentadas)
        var bkf = Fib.FcLcb(FC.PlcfAtnBkf);
        var bkl = Fib.FcLcb(FC.PlcfAtnBkl);
        var bkfPlc = Plc.Read(Table, bkf.Fc, bkf.Lcb, 4);
        var bklPlc = Plc.Read(Table, bkl.Fc, bkl.Lcb, 0);
        var sttb = Sttb(FC.SttbfAtnBkmk);
        var ranges = new Dictionary<long, (long, long)>();
        if (bkfPlc is not null && bklPlc is not null)
        {
            for (long i = 0; i < bkfPlc.N; i++)
            {
                int ibkl = bkfPlc.R.U16(bkfPlc.DataAt(i));
                long? end = bklPlc.Cp(ibkl);
                long lTag = i < sttb.Count && sttb[(int)i].Extra is { } extra ? new ByteReader(extra).I32(2) : i;
                if (end is not null) ranges[lTag] = (bkfPlc.Cps[(int)i], end.Value);
            }
        }
        for (long i = 0; i < refPlc.N; i++)
        {
            long? a = txtPlc.Cp(i), b = txtPlc.Cp(i + 1);
            if (a is null || b is null) break;
            long o = refPlc.DataAt(i);
            int cchInit = Math.Min(9, refPlc.R.U16(o));
            string initials = refPlc.R.Utf16(o + 2, cchInit);
            int ibst = refPlc.R.I16(o + 20);
            int lTag = refPlc.R.I32(o + 26);
            bool has = ranges.TryGetValue(lTag, out var range);
            out_.Add(new Comment
            {
                RefCp = refPlc.Cps[(int)i], CpStart = @base + a.Value, CpEnd = @base + b.Value,
                Author = ibst >= 0 && ibst < owners.Count ? owners[ibst] : "", Initials = initials,
                RangeStart = has ? range.Item1 : null, RangeEnd = has ? range.Item2 : null,
            });
        }
        return out_;
    }

    /// <summary>Lista de Xst (cch u16 + UTF-16) consecutivos.</summary>
    private List<string> XstArray(int idx)
    {
        var out_ = new List<string>();
        var (fc, lcb) = Fib.FcLcb(idx);
        if (lcb == 0 || fc + lcb > Table.Length) return out_;
        var r = new ByteReader(Table);
        long o = fc;
        while (o + 2 <= fc + lcb)
        {
            int cch = r.U16(o);
            out_.Add(r.Utf16(o + 2, cch));
            o += 2 + cch * 2;
        }
        return out_;
    }

    /// <summary>STTB (estendida ou não) → strings + dados extras.</summary>
    public List<(string S, Bytes? Extra)> Sttb(int idx)
    {
        var out_ = new List<(string, Bytes?)>();
        var (fc, lcb) = Fib.FcLcb(idx);
        if (lcb == 0 || fc + lcb > Table.Length) return out_;
        var r = new ByteReader(Table);
        long o = fc;
        int cData = r.U16(o); o += 2;
        bool ext = false;
        if (cData == 0xffff) { ext = true; cData = r.U16(o); o += 2; }
        int cbExtra = r.U16(o); o += 2;
        for (int i = 0; i < cData && o < fc + lcb; i++)
        {
            string s;
            if (ext) { int cch = r.U16(o); s = r.Utf16(o + 2, cch); o += 2 + cch * 2; }
            else
            {
                int cch = r.U8(o);
                var sb = new System.Text.StringBuilder();
                for (int k = 0; k < cch; k++) sb.Append((char)r.U8(o + 1 + k));
                s = sb.ToString();
                o += 1 + cch;
            }
            Bytes? extra = cbExtra != 0 ? r.Sub(o, o + cbExtra) : null;
            o += cbExtra;
            out_.Add((s, extra));
        }
        return out_;
    }

    // ───────────────────────────── bookmarks ─────────────────────────────

    public List<Bookmark> Bookmarks()
    {
        var out_ = new List<Bookmark>();
        var names = Sttb(FC.SttbfBkmk);
        var bkf = Fib.FcLcb(FC.PlcfBkf);
        var bkl = Fib.FcLcb(FC.PlcfBkl);
        var bkfPlc = Plc.Read(Table, bkf.Fc, bkf.Lcb, 4);
        var bklPlc = Plc.Read(Table, bkl.Fc, bkl.Lcb, 0);
        if (bkfPlc is null || bklPlc is null) return out_;
        for (long i = 0; i < bkfPlc.N && i < names.Count; i++)
        {
            int ibkl = bkfPlc.R.U16(bkfPlc.DataAt(i));
            long? end = bklPlc.Cp(ibkl);
            if (end is null) continue;
            out_.Add(new Bookmark { Name = names[(int)i].S, CpStart = bkfPlc.Cps[(int)i], CpEnd = end.Value });
        }
        return out_;
    }

    /// <summary>Autores de revisão (SttbfRMark).</summary>
    public List<string> RevisionAuthors() => Sttb(FC.SttbfRMark).Select(e => e.S).ToList();

    // ───────────────────────────── desenhos ─────────────────────────────

    public List<Fspa> Fspas(bool hdr)
    {
        var out_ = new List<Fspa>();
        var (fc, lcb) = Fib.FcLcb(hdr ? FC.PlcSpaHdr : FC.PlcSpaMom);
        var plc = Plc.Read(Table, fc, lcb, 26);
        if (plc is null) return out_;
        long @base = hdr ? Sub.Hdd.Item1 : 0;
        for (long i = 0; i < plc.N; i++)
        {
            long o = plc.DataAt(i);
            var r = plc.R;
            int flags = r.U16(o + 20);
            out_.Add(new Fspa
            {
                Cp = @base + plc.Cps[(int)i],
                Spid = r.I32(o), XaLeft = r.I32(o + 4), YaTop = r.I32(o + 8), XaRight = r.I32(o + 12), YaBottom = r.I32(o + 16),
                Bx = (flags >> 1) & 3, By = (flags >> 3) & 3, Wr = (flags >> 5) & 0xf, Wrk = (flags >> 9) & 0xf,
                BelowText = (flags & 0x4000) != 0, AnchorLock = (flags & 0x8000) != 0,
            });
        }
        return out_;
    }

    private void LoadDrawings()
    {
        if (_shapesMain is not null) return;
        _shapesMain = new Dictionary<long, OAShape>();
        _shapesHdr = new Dictionary<long, OAShape>();
        _bstore = new List<BseEntry?>();
        var (fc, lcb) = Fib.FcLcb(FC.DggInfo);
        if (lcb == 0 || fc + lcb > Table.Length) return;
        var r = new ByteReader(Table);
        long end = fc + lcb;
        var dgg = Records.ReadRec(r, fc, end);
        if (dgg is null || dgg.Type != OA.DggContainer) return;
        foreach (var c in Records.Children(dgg)) if (c.Type == OA.BStoreContainer) _bstore = OfficeArt.ReadBStore(c);
        // OfficeArtWordDrawing: dgglbl (u8) + OfficeArtDgContainer
        long o = dgg.Start + dgg.Len;
        int guard = 0;
        while (o + 9 <= end && guard++ < 16)
        {
            int lbl = r.U8(o);
            var dg = Records.ReadRec(r, o + 1, end);
            if (dg is null || dg.Type != OA.DgContainer) break;
            OfficeArt.IndexDrawing(dg, lbl == 1 ? _shapesHdr : _shapesMain);
            o = dg.Start + dg.Len;
        }
        foreach (var m in new[] { _shapesMain, _shapesHdr }) OfficeArt.ApplyMasters(m, Masters);
    }

    public OAShape? Shape(long spid, bool hdr)
    {
        LoadDrawings();
        var a = hdr ? _shapesHdr! : _shapesMain!;
        var b = hdr ? _shapesMain! : _shapesHdr!;
        return a.TryGetValue(spid, out var s) ? s : b.TryGetValue(spid, out var s2) ? s2 : null;
    }

    /// <summary>Forma de fundo do documento principal (FSP.fBackground): o fundo da página.</summary>
    public OAShape? BackgroundShape()
    {
        LoadDrawings();
        foreach (var s in _shapesMain!.Values) if ((s.Flags & FSP.Background) != 0) return s;
        return null;
    }

    /// <summary>Entrada do BStore (pib 1-based).</summary>
    public BseEntry? Bse(long pib)
    {
        LoadDrawings();
        long i = pib - 1;
        return i >= 0 && i < _bstore!.Count ? _bstore[(int)i] : null;
    }

    /// <summary>Histórias de caixas de texto: lid (spid) → faixa.</summary>
    public List<TxbxStory> Textboxes(bool hdr)
    {
        var out_ = new List<TxbxStory>();
        var (fc, lcb) = Fib.FcLcb(hdr ? FC.PlcfHdrtxbxTxt : FC.PlcftxbxTxt);
        var plc = Plc.Read(Table, fc, lcb, 22);
        if (plc is null) return out_;
        long @base = (hdr ? Sub.HdrTxbx : Sub.Txbx).Item1;
        for (long i = 0; i < plc.N; i++)
        {
            long o = plc.DataAt(i);
            int lid = plc.R.I32(o + 14);
            long a = plc.Cps[(int)i], b = plc.Cps[(int)i + 1];
            if (b > a) out_.Add(new TxbxStory { Spid = lid, CpStart = @base + a, CpEnd = @base + b });
        }
        return out_;
    }
}

using System.IO.Compression;
using System.Text;
using OfficeNext.Core;
using static OfficeNext.DocBinary.WriterUtil;

namespace OfficeNext.DocBinary;

/// <summary>Opções da conversão.</summary>
public sealed class ConvertOptions
{
    /// <summary>Inclui docProps/app.xml mínimo. Padrão: true.</summary>
    public bool DocProps { get; set; } = true;
}

/// <summary>
/// DocReader → pacote .docx (WordprocessingML) — porta de docx-writer.ts.
/// O texto de cada história passa pelo mesmo renderizador de parágrafos/tabelas.
/// </summary>
internal sealed class DocxWriter
{
    private static readonly Dictionary<string, string> Mime = new()
    {
        ["png"] = "image/png", ["jpeg"] = "image/jpeg", ["jpg"] = "image/jpeg", ["gif"] = "image/gif", ["bmp"] = "image/bmp",
        ["tiff"] = "image/tiff", ["emf"] = "image/x-emf", ["wmf"] = "image/x-wmf", ["pict"] = "image/pict",
    };

    private static readonly PapKey[] FrameKeys =
    {
        PapKey.DxaAbs, PapKey.DyaAbs, PapKey.DxaWidth, PapKey.Pc, PapKey.Wr, PapKey.WHeightAbs, PapKey.DyaFromText, PapKey.DxaFromText, PapKey.FrameLocked,
    };

    /// <summary>sprms de recuo esquerdo/1ª linha (sobrepostos pelo nível da lista em sprmPIlfo).</summary>
    private static readonly Dictionary<int, PapKey> IndentSprms = new()
    {
        [0x840f] = PapKey.DxaLeft, [0x845e] = PapKey.DxaLeft, [0x4610] = PapKey.DxaLeft, [0x465f] = PapKey.DxaLeft,
        [0x8411] = PapKey.DxaLeft1, [0x8460] = PapKey.DxaLeft1, [0x4456] = PapKey.DxcLeft, [0x4457] = PapKey.DxcLeft1,
    };

    public readonly DocReader R;
    /// <summary>Partes na ordem de inserção (Map do JS: regravar mantém a posição).</summary>
    private readonly List<string> _fileOrder = new();
    private readonly Dictionary<string, object> _files = new(StringComparer.Ordinal);
    private readonly List<(string Part, string Type)> _overrides = new();
    private readonly List<string> _mediaExt = new();
    private readonly Dictionary<string, string> _media = new(StringComparer.Ordinal);
    private int _mediaN, _hdrN, _ftrN, _docPrId;
    public readonly PropCtx PropCtx;
    private readonly Dictionary<int, string> _styleIds;
    private readonly Dictionary<string, (Chp Chp, HashSet<ChpKey> Touched)> _chpCache = new(StringComparer.Ordinal);
    private readonly Dictionary<long, int> _footnoteIds = new();
    private readonly Dictionary<long, int> _endnoteIds = new();
    private readonly Dictionary<long, int> _commentByRef = new();
    private readonly Dictionary<long, List<int>> _commentStarts = new();
    private readonly Dictionary<long, List<int>> _commentEnds = new();
    private readonly Dictionary<long, List<(int Id, string Name)>> _bkStarts = new();
    private readonly Dictionary<long, List<int>> _bkEnds = new();
    private readonly Dictionary<long, Fspa> _fspaMain = new();
    private readonly Dictionary<long, Fspa> _fspaHdr = new();
    private readonly Dictionary<long, (long, long)> _txbxMain = new();
    private readonly Dictionary<long, (long, long)> _txbxHdr = new();
    private readonly List<string> _revAuthors;
    /// <summary>Ids das marcas de revisão (w:ins/w:del) — únicos no documento.</summary>
    private readonly RevCounter _revIds = new();
    private readonly Func<int, int> _numIdOf;
    /// <summary>Faixas de CP descartadas (ex.: _PictureBullets).</summary>
    private readonly List<(long A, long B)> _skipRanges = new();
    /// <summary>Campos abertos (atravessam parágrafos).</summary>
    private List<FieldState> _fieldStack = new();

    public DocxWriter(DocReader reader)
    {
        R = reader;
        _styleIds = StylesXml.StyleIdMap(reader.Stsh.Styles);
        PropCtx = new PropCtx { Fonts = reader.Fonts, StyleId = istd => _styleIds.TryGetValue(istd, out var id) ? id : null };
        _revAuthors = reader.RevisionAuthors();
        int lfoCount = reader.Lists.Lfos.Count;
        _numIdOf = ilfo => ilfo >= 1 && ilfo <= lfoCount ? ilfo : 0;
    }

    private void SetFile(string path, object data)
    {
        if (!_files.ContainsKey(path)) _fileOrder.Add(path);
        _files[path] = data;
    }

    private string RevAuthor(int? ibst)
    {
        int i = ibst ?? 0;
        return i >= 0 && i < _revAuthors.Count ? _revAuthors[i] : "Autor desconhecido";
    }

    // ───────────────────────────── pacote ─────────────────────────────

    /// <summary>Partes do pacote (caminho → bytes), na ordem do ZIP do JS.</summary>
    public List<(string Path, byte[] Data)> BuildParts(ConvertOptions? opts = null)
    {
        opts ??= new ConvertOptions();
        var r = R;
        foreach (var f in r.Fspas(false)) _fspaMain[f.Cp] = f;
        foreach (var f in r.Fspas(true)) _fspaHdr[f.Cp] = f;
        foreach (var t in r.Textboxes(false)) _txbxMain[t.Spid] = (t.CpStart, t.CpEnd);
        foreach (var t in r.Textboxes(true)) _txbxHdr[t.Spid] = (t.CpStart, t.CpEnd);
        int bkId = 0;
        foreach (var b in r.Bookmarks())
        {
            // _PictureBullets: imagens de marcadores guardadas como texto oculto — o Word
            // as move para a numeração e descarta o trecho ao salvar como .docx
            if (b.Name == "_PictureBullets") { _skipRanges.Add((b.CpStart, b.CpEnd)); continue; }
            int id = bkId++;
            Push(_bkStarts, b.CpStart, (id, b.Name));
            Push(_bkEnds, b.CpEnd, id);
        }

        var docRels = new PartRels();
        docRels.Add("styles", "styles.xml");
        docRels.Add("settings", "settings.xml");
        docRels.Add("fontTable", "fontTable.xml");
        _overrides.Add(("/word/styles.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"));
        _overrides.Add(("/word/settings.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"));
        _overrides.Add(("/word/fontTable.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"));

        // notas e comentários (ids antes do corpo, que os referencia)
        var footnotes = r.Notes(true);
        var endnotes = r.Notes(false);
        for (int i = 0; i < footnotes.Count; i++) _footnoteIds[footnotes[i].RefCp] = i + 1;
        for (int i = 0; i < endnotes.Count; i++) _endnoteIds[endnotes[i].RefCp] = i + 1;
        var comments = r.Comments();
        for (int i = 0; i < comments.Count; i++)
        {
            var c = comments[i];
            _commentByRef[c.RefCp] = i;
            if (c.RangeStart is not null && c.RangeEnd is not null && c.RangeEnd >= c.RangeStart)
            {
                Push(_commentStarts, c.RangeStart.Value, i);
                Push(_commentEnds, c.RangeEnd.Value, i);
            }
        }

        // corpo
        string body = RenderMain(docRels);
        SetFile("word/document.xml", $"{Xml.XML_DECL}<w:document{Xml.CONTENT_NS}>{BackgroundXml(R.BackgroundShape())}<w:body>{body}</w:body></w:document>");
        _overrides.Add(("/word/document.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"));

        if (footnotes.Count > 0)
        {
            docRels.Add("footnotes", "footnotes.xml");
            string xml = RenderNotes(footnotes, "ftn");
            SetFile("word/footnotes.xml", xml);
            _overrides.Add(("/word/footnotes.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"));
        }
        if (endnotes.Count > 0)
        {
            docRels.Add("endnotes", "endnotes.xml");
            string xml = RenderNotes(endnotes, "edn");
            SetFile("word/endnotes.xml", xml);
            _overrides.Add(("/word/endnotes.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml"));
        }
        if (comments.Count > 0)
        {
            docRels.Add("comments", "comments.xml");
            string xml = RenderComments(comments);
            SetFile("word/comments.xml", xml);
            _overrides.Add(("/word/comments.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"));
        }

        // estilos, numeração, fontes, configurações
        SetFile("word/styles.xml", StylesXml.Build(r, PropCtx, _styleIds, _numIdOf));
        string? numbering = Numbering.Build(r, PropCtx);
        if (numbering is not null)
        {
            docRels.Add("numbering", "numbering.xml");
            SetFile("word/numbering.xml", numbering);
            _overrides.Add(("/word/numbering.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"));
        }
        SetFile("word/fontTable.xml", FontTable());
        SetFile("word/settings.xml", Settings.Build(r, footnotes.Count > 0, endnotes.Count > 0));
        SetFile("word/_rels/document.xml.rels", docRels.ToXml());

        if (opts.DocProps)
        {
            SetFile("docProps/app.xml", $"{Xml.XML_DECL}<Properties xmlns=\"http://schemas.openxmlformats.org/officeDocument/2006/extended-properties\"><Application>Universal Office (conversão de .doc)</Application></Properties>");
            _overrides.Add(("/docProps/app.xml", "application/vnd.openxmlformats-officedocument.extended-properties+xml"));
        }
        var rootRels = new PartRels();
        rootRels.Add("officeDocument", "word/document.xml");
        if (opts.DocProps) rootRels.Add("extended-properties", "docProps/app.xml");
        SetFile("_rels/.rels", rootRels.ToXml());

        var ct = new StringBuilder($"{Xml.XML_DECL}<Types xmlns=\"{Xml.NS.Ct}\">");
        ct.Append(Xml.El("Default", new Attrs { { "Extension", "rels" }, { "ContentType", "application/vnd.openxmlformats-package.relationships+xml" } }));
        ct.Append(Xml.El("Default", new Attrs { { "Extension", "xml" }, { "ContentType", "application/xml" } }));
        foreach (var ext in _mediaExt) ct.Append(Xml.El("Default", new Attrs { { "Extension", ext }, { "ContentType", Mime.TryGetValue(ext, out var m) ? m : "application/octet-stream" } }));
        foreach (var (part, type) in _overrides) ct.Append(Xml.El("Override", new Attrs { { "PartName", part }, { "ContentType", type } }));
        ct.Append("</Types>");

        var utf8 = new UTF8Encoding(false);
        var parts = new List<(string, byte[])> { ("[Content_Types].xml", utf8.GetBytes(ct.ToString())) };
        foreach (var path in _fileOrder)
        {
            var data = _files[path];
            parts.Add((path, data is string s ? utf8.GetBytes(s) : (byte[])data));
        }
        return parts;
    }

    public byte[] Build(ConvertOptions? opts = null)
    {
        var parts = BuildParts(opts);
        var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var (path, data) in parts)
            {
                var entry = zip.CreateEntry(path, CompressionLevel.Optimal);
                using var s = entry.Open();
                s.Write(data);
            }
        }
        return ms.ToArray();
    }

    private string FontTable()
    {
        string[] fams = { "auto", "roman", "swiss", "modern", "script", "decorative", "auto", "auto" };
        string[] pitch = { "default", "fixed", "variable", "default" };
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var x = new StringBuilder();
        foreach (var f in R.Fonts)
        {
            if (!seen.Add(f.Name)) continue;
            string c = "";
            if (!string.IsNullOrEmpty(f.AltName)) c += Xml.El("w:altName", new Attrs { { "w:val", f.AltName } });
            if (f.Panose.Any(b => b != 0)) c += Xml.El("w:panose1", new Attrs { { "w:val", string.Concat(f.Panose.Select(b => Xml.Hex(b, 2))) } });
            c += Xml.El("w:charset", new Attrs { { "w:val", Xml.Hex(f.Charset, 2) } });
            c += Xml.El("w:family", new Attrs { { "w:val", f.Ff >= 0 && f.Ff < fams.Length ? fams[f.Ff] : "auto" } });
            if (!f.TrueType) c += "<w:notTrueType/>";
            c += Xml.El("w:pitch", new Attrs { { "w:val", f.Prq >= 0 && f.Prq < pitch.Length ? pitch[f.Prq] : "default" } });
            static string H(long v) => Xml.Hex((uint)v, 8);
            c += Xml.El("w:sig", new Attrs
            {
                { "w:usb0", H(f.Sig[0]) }, { "w:usb1", H(f.Sig[1]) }, { "w:usb2", H(f.Sig[2]) },
                { "w:usb3", H(f.Sig[3]) }, { "w:csb0", H(f.Sig[4]) }, { "w:csb1", H(f.Sig[5]) },
            });
            x.Append(Xml.El("w:font", new Attrs { { "w:name", f.Name } }, c));
        }
        return $"{Xml.XML_DECL}<w:fonts xmlns:w=\"{Xml.NS.W}\" xmlns:r=\"{Xml.NS.R}\">{x}</w:fonts>";
    }

    // ───────────────────────────── histórias ─────────────────────────────

    private string RenderMain(PartRels rels)
    {
        var r = R;
        var ctx = new StoryCtx { Rels = rels, Kind = "main", Hdr = false };
        var (s, e) = r.Sub.Main;
        var paras = CollectParas(s, e);
        // marca o fim de cada seção (menos a última, que vai no w:body)
        var sectEnds = new Dictionary<long, int>();
        for (int i = 0; i < r.Sections.Count; i++) if (i < r.Sections.Count - 1) sectEnds[r.Sections[i].CpEnd] = i;
        var hdrStories = r.HeaderStories();
        var sectPrs = new List<string>();
        for (int i = 0; i < r.Sections.Count; i++) sectPrs.Add(SectPrXml(r.Sections[i].Sep, i, hdrStories, rels));
        _fieldStack = new List<FieldState>();
        string body = RenderBlocks(paras, 0, paras.Count, 0, ctx, p => sectEnds.TryGetValue(p.CpEnd, out int si) ? sectPrs[si] : null);
        return body + (sectPrs.Count > 0 ? sectPrs[^1] : "");
    }

    private string SectPrXml(Sep sep, int index, List<(long, long)?> stories, PartRels docRels)
    {
        // ordem das histórias por seção: header par, header ímpar, footer par, footer ímpar, header 1ª, footer 1ª
        var kinds = new (int K, string Kind, string Type)[]
        {
            (0, "header", "even"), (1, "header", "default"), (4, "header", "first"),
            (2, "footer", "even"), (3, "footer", "default"), (5, "footer", "first"),
        };
        var hdrRefs = new List<string>();
        var ftrRefs = new List<string>();
        foreach (var (k, kind, type) in kinds)
        {
            int si = 6 + index * 6 + k;
            var st = si < stories.Count ? stories[si] : null;
            if (st is null) continue;
            string? rid = RenderHeaderPart(st.Value, kind, docRels);
            if (rid is null) continue;
            string x0 = Xml.El(kind == "header" ? "w:headerReference" : "w:footerReference", new Attrs { { "w:type", type }, { "r:id", rid } });
            (kind == "header" ? hdrRefs : ftrRefs).Add(x0);
        }
        string x = string.Concat(hdrRefs) + string.Concat(ftrRefs);
        string[] fpcs = { "pageBottom", "pageBottom", "beneathText", "sectEnd" };
        string ftnPr = NotePr(sep.Fpc is not null ? (sep.Fpc.Value < fpcs.Length ? fpcs[sep.Fpc.Value] : null) : null, sep.NfcFtnRef, sep.NFtn, sep.RncFtn, false);
        if (ftnPr.Length > 0) x += $"<w:footnotePr>{ftnPr}</w:footnotePr>";
        string ednPr = NotePr(null, sep.NfcEdnRef, sep.NEdn, sep.RncEdn, true);
        if (ednPr.Length > 0) x += $"<w:endnotePr>{ednPr}</w:endnotePr>";
        string[] bkcs = { "continuous", "nextColumn", "nextPage", "evenPage", "oddPage" };
        string bkc = sep.Bkc >= 0 && sep.Bkc < bkcs.Length ? bkcs[sep.Bkc] : "nextPage";
        if (bkc != "nextPage") x += Xml.El("w:type", new Attrs { { "w:val", bkc } });
        x += Xml.El("w:pgSz", new Attrs
        {
            { "w:w", sep.XaPage }, { "w:h", sep.YaPage }, { "w:orient", sep.Orientation == 2 ? "landscape" : null },
            { "w:code", sep.DmPaperReq is not null && sep.DmPaperReq != 0 ? sep.DmPaperReq : null },
        });
        x += Xml.El("w:pgMar", new Attrs
        {
            { "w:top", sep.DyaTop }, { "w:right", sep.DxaRight }, { "w:bottom", sep.DyaBottom }, { "w:left", sep.DxaLeft },
            { "w:header", sep.DyaHdrTop }, { "w:footer", sep.DyaHdrBottom }, { "w:gutter", sep.DzaGutter },
        });
        if (sep.DmBinFirst != 0 || sep.DmBinOther != 0)
            x += Xml.El("w:paperSrc", new Attrs { { "w:first", sep.DmBinFirst != 0 ? sep.DmBinFirst : null }, { "w:other", sep.DmBinOther != 0 ? sep.DmBinOther : null } });
        if (sep.BrcTop is not null || sep.BrcLeft is not null || sep.BrcBottom is not null || sep.BrcRight is not null)
        {
            int pgb = sep.PgbProp;
            int applyTo = pgb & 7;
            var a = new Attrs
            {
                { "w:display", applyTo == 1 ? "firstPage" : applyTo == 2 ? "notFirstPage" : null },
                { "w:zOrder", (pgb & 0x8) != 0 ? "back" : null },
                { "w:offsetFrom", ((pgb >> 5) & 7) == 1 ? "page" : null },
            };
            string b = "";
            if (sep.BrcTop is not null) b += OoxmlProps.BrcXml("w:top", sep.BrcTop);
            if (sep.BrcLeft is not null) b += OoxmlProps.BrcXml("w:left", sep.BrcLeft);
            if (sep.BrcBottom is not null) b += OoxmlProps.BrcXml("w:bottom", sep.BrcBottom);
            if (sep.BrcRight is not null) b += OoxmlProps.BrcXml("w:right", sep.BrcRight);
            x += Xml.El("w:pgBorders", a, b);
        }
        if (sep.LnnMod != 0)
        {
            string[] rs = { "newPage", "newSection", "continuous" };
            x += Xml.El("w:lnNumType", new Attrs
            {
                { "w:countBy", sep.LnnMod }, { "w:start", sep.LnnMin != 0 ? sep.LnnMin : null }, { "w:distance", sep.DxaLnn != 0 ? sep.DxaLnn : null },
                { "w:restart", sep.Lnc >= 0 && sep.Lnc < rs.Length ? rs[sep.Lnc] : "newPage" },
            });
        }
        string nfc = OoxmlProps.NumFmtOf(sep.NfcPgn);
        if ((sep.NfcPgn != 0 && nfc.Length > 0) || sep.PgnRestart || (sep.HeadingPgn ?? 0) != 0)
        {
            string[] seps = { "hyphen", "period", "colon", "emDash", "enDash" };
            int cns = sep.CnsPgn ?? 0;
            x += Xml.El("w:pgNumType", new Attrs
            {
                { "w:fmt", sep.NfcPgn != 0 ? nfc : null },
                { "w:start", sep.PgnRestart ? sep.PgnStart : null },
                { "w:chapStyle", (sep.HeadingPgn ?? 0) != 0 ? sep.HeadingPgn : null },
                { "w:chapSep", (sep.HeadingPgn ?? 0) != 0 ? (cns < seps.Length ? seps[cns] : "hyphen") : null },
            });
        }
        int cols = sep.CcolM1 + 1;
        if (cols > 1 && !sep.EvenlySpaced)
        {
            string c = "";
            for (int i = 0; i < cols; i++)
            {
                c += Xml.El("w:col", new Attrs
                {
                    { "w:w", sep.ColWidths.TryGetValue(i, out int cw) ? cw : 0 },
                    { "w:space", i < cols - 1 ? (sep.ColSpacings.TryGetValue(i, out int cs) ? cs : 0) : null },
                });
            }
            x += Xml.El("w:cols", new Attrs { { "w:num", cols }, { "w:space", sep.DxaColumns }, { "w:equalWidth", "0" }, { "w:sep", sep.LBetween ? true : null } }, c);
        }
        else
        {
            x += Xml.El("w:cols", new Attrs { { "w:num", cols > 1 ? cols : null }, { "w:space", sep.DxaColumns }, { "w:sep", sep.LBetween ? true : null } });
        }
        if (sep.ProtectedSec == true) x += "<w:formProt w:val=\"0\"/>";
        if (sep.Vjc != 0)
        {
            string[] vj = { "top", "center", "both", "bottom" };
            x += Xml.El("w:vAlign", new Attrs { { "w:val", sep.Vjc < vj.Length ? vj[sep.Vjc] : "top" } });
        }
        if (!sep.FEndnote) x += "<w:noEndnote/>";
        if (sep.TitlePage) x += "<w:titlePg/>";
        if (sep.TextFlow != 0)
        {
            string[] tf = { "lrTb", "tbRl", "btLr", "lrTbV", "tbRlV", "tbLrV" };
            x += Xml.El("w:textDirection", new Attrs { { "w:val", sep.TextFlow < tf.Length ? tf[sep.TextFlow] : "lrTb" } });
        }
        if (sep.Bidi) x += "<w:bidi/>";
        if (sep.RtlGutter) x += "<w:rtlGutter/>";
        // SClmOperand: 0 padrão, 1 linhas e caracteres, 2 só linhas, 3 ajustar aos caracteres
        string[] gts = { "default", "linesAndChars", "lines", "snapToChars" };
        string gridType = sep.Clm < gts.Length ? gts[sep.Clm] : "default";
        x += Xml.El("w:docGrid", new Attrs
        {
            { "w:type", sep.Clm != 0 ? gridType : null },
            { "w:linePitch", sep.DyaLinePitch },
            { "w:charSpace", sep.DxtCharSpace != 0 ? sep.DxtCharSpace : null },
        });
        return $"<w:sectPr>{x}</w:sectPr>";
    }

    /// <summary>Cabeçalho/rodapé → parte própria. Devolve o rId (no document.xml.rels).</summary>
    private string? RenderHeaderPart((long, long) story, string kind, PartRels docRels)
    {
        var rels = new PartRels();
        var ctx = new StoryCtx { Rels = rels, Kind = "hdr", Hdr = true };
        var paras = CollectParas(story.Item1, story.Item2);
        // cada história termina com um parágrafo "guarda" que não é exibido
        if (paras.Count > 1 && paras[^1].CpEnd - paras[^1].CpStart == 1) paras = paras.Take(paras.Count - 1).ToList();
        var saved = _fieldStack;
        _fieldStack = new List<FieldState>();
        string body = RenderBlocks(paras, 0, paras.Count, 0, ctx);
        _fieldStack = saved;
        if (body.Length == 0) body = "<w:p/>";
        int n = kind == "header" ? ++_hdrN : ++_ftrN;
        string name = $"{kind}{n}.xml";
        string tag = kind == "header" ? "w:hdr" : "w:ftr";
        SetFile($"word/{name}", $"{Xml.XML_DECL}<{tag}{Xml.CONTENT_NS}>{body}</{tag}>");
        if (rels.Size > 0) SetFile($"word/_rels/{name}.rels", rels.ToXml());
        _overrides.Add(($"/word/{name}", $"application/vnd.openxmlformats-officedocument.wordprocessingml.{kind}+xml"));
        return docRels.Add(kind, name);
    }

    private string RenderNotes(List<Note> notes, string kind)
    {
        string tag = kind == "ftn" ? "w:footnote" : "w:endnote";
        var rels = new PartRels();
        var ctx = new StoryCtx { Rels = rels, Kind = kind, Hdr = false };
        var x = new StringBuilder();
        x.Append($"<{tag} w:type=\"separator\" w:id=\"-1\"><w:p><w:pPr><w:spacing w:after=\"0\" w:line=\"240\" w:lineRule=\"auto\"/></w:pPr><w:r><w:separator/></w:r></w:p></{tag}>");
        x.Append($"<{tag} w:type=\"continuationSeparator\" w:id=\"0\"><w:p><w:pPr><w:spacing w:after=\"0\" w:line=\"240\" w:lineRule=\"auto\"/></w:pPr><w:r><w:continuationSeparator/></w:r></w:p></{tag}>");
        for (int i = 0; i < notes.Count; i++)
        {
            var paras = CollectParas(notes[i].CpStart, notes[i].CpEnd);
            _fieldStack = new List<FieldState>();
            string body = RenderBlocks(paras, 0, paras.Count, 0, ctx);
            if (body.Length == 0) body = "<w:p/>";
            x.Append($"<{tag} w:id=\"{i + 1}\">{body}</{tag}>");
        }
        string root = kind == "ftn" ? "w:footnotes" : "w:endnotes";
        string name = kind == "ftn" ? "footnotes.xml" : "endnotes.xml";
        if (rels.Size > 0) SetFile($"word/_rels/{name}.rels", rels.ToXml());
        return $"{Xml.XML_DECL}<{root}{Xml.CONTENT_NS}>{x}</{root}>";
    }

    private string RenderComments(List<Comment> comments)
    {
        var rels = new PartRels();
        var ctx = new StoryCtx { Rels = rels, Kind = "atn", Hdr = false };
        var x = new StringBuilder();
        for (int i = 0; i < comments.Count; i++)
        {
            var c = comments[i];
            var paras = CollectParas(c.CpStart, c.CpEnd);
            _fieldStack = new List<FieldState>();
            string body = RenderBlocks(paras, 0, paras.Count, 0, ctx);
            if (body.Length == 0) body = "<w:p/>";
            x.Append(Xml.El("w:comment", new Attrs
            {
                { "w:id", i }, { "w:author", c.Author.Length > 0 ? c.Author : "Autor desconhecido" }, { "w:initials", c.Initials.Length > 0 ? c.Initials : null },
            }, body));
        }
        if (rels.Size > 0) SetFile("word/_rels/comments.xml.rels", rels.ToXml());
        return $"{Xml.XML_DECL}<w:comments{Xml.CONTENT_NS}>{x}</w:comments>";
    }

    // ───────────────────────────── parágrafos ─────────────────────────────

    /// <summary>Parágrafos de uma faixa de CPs.</summary>
    public List<PInfo> CollectParas(long cpStart, long cpEnd)
    {
        var r = R;
        var out_ = new List<PInfo>();
        long cp = cpStart;
        int guard = 0;
        while (cp < cpEnd && guard++ < 2_000_000)
        {
            var (end, run, _) = r.ParagraphAt(cp, cpEnd);
            long pEnd = Math.Max(cp + 1, Math.Min(end, cpEnd));
            long markCp = pEnd - 1;
            var grpprls = new List<Bytes>();
            if (run is not null && run.Grpprl.Length > 0) grpprls.Add(run.Grpprl);
            int pi = DocText.PieceAt(r.Pieces, markCp);
            var prm = pi >= 0 ? r.PrmGrpprl(r.Pieces[pi]) : null;
            if (prm is not null) grpprls.Add(prm.Value);
            int istd = run?.Istd ?? 0;
            var @base = r.Styles.Resolve(ValidParaStyle(istd));
            var pap = @base.Pap.Clone();
            pap.Istd = ValidParaStyle(istd);
            pap.Delete(PapKey.InTable); pap.Delete(PapKey.Ttp); pap.Delete(PapKey.Itap);
            pap.Delete(PapKey.InnerTableCell); pap.Delete(PapKey.InnerTtp);
            pap.TabsCleared = new List<int>();
            var touched = new HashSet<PapKey>();
            // sprmPIlfo (positivo) aplica o recuo do nível da lista por cima do recuo
            // definido ANTES dele; só recuos gravados depois sobrevivem como diretos
            int seq = 0;
            int ilfoSeq = -1;
            var lastIndent = new Dictionary<PapKey, int>();
            void Apply(Prl p)
            {
                seq++;
                if (IndentSprms.TryGetValue(p.Sprm, out var k)) lastIndent[k] = seq;
                if (p.Sprm == 0x460b) { int v = p.R.I16(p.Op); ilfoSeq = v > 0 ? seq : -1; }
                PapApply.Apply(pap, p, touched);
            }
            var tapPrls = new List<Prl>();
            foreach (var g in grpprls)
            {
                foreach (var p in Sprms.Prls(g))
                {
                    int sgc = Sprms.SgcOf(p.Sprm);
                    if (sgc == 5) { tapPrls.Add(p); continue; }
                    if (sgc != 1) continue;
                    if ((p.Sprm == 0x646b || p.Sprm == 0x6646) && r.Data is not null)
                    {
                        // sprmPTableProps/sprmPHugePapx: PrcData no Data stream. Quem o processa
                        // NÃO processa os Prl seguintes do mesmo grpprl (versões para leitores antigos)
                        var extra = PrcData(p.R.U32(p.Op));
                        if (extra.Length > 0)
                        {
                            foreach (var q in Sprms.Prls(extra))
                            {
                                int s2 = Sprms.SgcOf(q.Sprm);
                                if (s2 == 5) tapPrls.Add(q);
                                else if (s2 == 1) Apply(q);
                            }
                            break;
                        }
                        continue;
                    }
                    Apply(p);
                }
            }
            PapApply.PruneNoneBorders(pap, @base.Pap, touched);
            if (ilfoSeq > 0)
            {
                foreach (var k in new[] { PapKey.DxaLeft, PapKey.DxaLeft1, PapKey.DxcLeft, PapKey.DxcLeft1 })
                {
                    if (touched.Contains(k) && (lastIndent.TryGetValue(k, out int li) ? li : 0) < ilfoSeq)
                    {
                        touched.Remove(k);
                        pap.Set(k, @base.Pap.Get(k));
                    }
                }
            }
            if (pap.Istd != istd) pap.Istd = ValidParaStyle(pap.Istd);
            int mark = markCp < r.Text.Length ? r.Text[(int)markCp] : 0;
            int depth = pap.Itap ?? 0;
            if (pap.InTable == true && depth < 1) depth = 1;
            if (pap.InTable != true && pap.Itap is null) depth = 0;
            bool cellEnd = false, rowEnd = false;
            if (depth == 1)
            {
                if (mark == 0x07) { if (pap.Ttp == true) rowEnd = true; else cellEnd = true; }
            }
            else if (depth > 1)
            {
                if (pap.InnerTtp == true) rowEnd = true;
                else if (pap.InnerTableCell == true) cellEnd = true;
                else if (mark == 0x07) cellEnd = true;
            }
            out_.Add(new PInfo { CpStart = cp, CpEnd = pEnd, Mark = mark, Pap = pap, Touched = touched, Grpprls = grpprls, TapPrls = tapPrls, Depth = depth, CellEnd = cellEnd, RowEnd = rowEnd });
            cp = pEnd;
        }
        return out_;
    }

    private int ValidParaStyle(int istd)
    {
        var st = R.Stsh.At(istd);
        return st is not null && st.Stk == 1 ? istd : 0;
    }

    private Bytes PrcData(long off)
    {
        if (R.Data is null) return Bytes.Empty;
        var d = R.Data.Value;
        if (off + 2 > d.Length) return Bytes.Empty;
        int cb = d[(int)off] | (d[(int)off + 1] << 8);
        return d.Sub(off + 2, Math.Min(d.Length, off + 2 + cb));
    }

    /// <summary>Blocos (parágrafos e tabelas) de paras[from, to) na profundidade `depth`.</summary>
    private string RenderBlocks(List<PInfo> paras, int from, int to, int depth, StoryCtx ctx, Func<PInfo, string?>? sectPrOf = null)
    {
        var x = new StringBuilder();
        int i = from;
        while (i < to)
        {
            var p = paras[i];
            if (p.Depth > depth)
            {
                int j = i;
                while (j < to && paras[j].Depth > depth) j++;
                x.Append(RenderTable(paras, i, j, depth + 1, ctx));
                i = j;
                continue;
            }
            x.Append(RenderParagraph(p, ctx, sectPrOf?.Invoke(p)));
            i++;
        }
        return x.ToString();
    }

    private string RenderParagraph(PInfo p, StoryCtx ctx, string? sectPr)
    {
        var styleRes = R.Styles.Resolve(p.Pap.Istd);
        var markChp = ChpFor(p, p.CpEnd - 1);
        string markRPr = RevisionMark(markChp.Chp) + OoxmlProps.RPrInner(markChp.Chp, markChp.Touched, PropCtx);
        string pPr = OoxmlProps.PPrInner(p.Pap, p.Touched, PropCtx, new PPrOpts
        {
            BaseTabs = styleRes.Pap.Tabs, NumId = _numIdOf, RPr = markRPr.Length > 0 ? markRPr : null, SectPr = sectPr,
        });
        string runs = RenderRuns(p, ctx);
        return $"<w:p>{(pPr.Length > 0 ? $"<w:pPr>{pPr}</w:pPr>" : "")}{runs}</w:p>";
    }

    private string RevisionMark(Chp chp)
    {
        if (chp.RmarkIns == true)
            return Xml.El("w:ins", new Attrs { { "w:id", _revIds.Next++ }, { "w:author", RevAuthor(chp.IbstRMark) }, { "w:date", DttmIso(chp.DttmRMark) } });
        if (chp.RmarkDel == true)
            return Xml.El("w:del", new Attrs { { "w:id", _revIds.Next++ }, { "w:author", RevAuthor(chp.IbstRMarkDel) }, { "w:date", DttmIso(chp.DttmRMarkDel) } });
        return "";
    }

    /// <summary>CHP + tocados do caractere em `cp` (dentro do parágrafo p).</summary>
    private (Chp Chp, HashSet<ChpKey> Touched) ChpFor(PInfo p, long cp)
    {
        var seg = SegmentAt(cp);
        return ChpOf(p, seg.Grpprls);
    }

    private (Chp Chp, HashSet<ChpKey> Touched) ChpOf(PInfo p, List<Bytes> grpprls)
    {
        var r = R;
        // chave por conteúdo (o JS usa a identidade do Uint8Array; o resultado é o mesmo)
        string key = $"{p.Pap.Istd}|{string.Join("/", grpprls.Select(g => g.ContentKey()))}";
        if (_chpCache.TryGetValue(key, out var hit)) return hit;
        var paraChp = r.Styles.Resolve(p.Pap.Istd).Chp;
        var chp = paraChp.Clone();
        var touched = new HashSet<ChpKey>();
        var ctx = new ChpCtx
        {
            Base = paraChp.Clone(),
            ApplyCharStyle = istd => r.Styles.ApplyCharStyle(istd, paraChp),
            ParaStyle = paraChp,
        };
        foreach (var g in grpprls) foreach (var q in Sprms.Prls(g)) if (Sprms.SgcOf(q.Sprm) == 2) ChpApply.Apply(chp, q, ctx, touched);
        var res = (chp, touched);
        _chpCache[key] = res;
        return res;
    }

    private Segment SegmentAt(long cp)
    {
        foreach (var s in Segments(cp, cp + 1)) return s;
        return new Segment { CpStart = cp, CpEnd = cp + 1 };
    }

    /// <summary>Faixas de CHPX (por peça) em [s, e).</summary>
    private IEnumerable<Segment> Segments(long s, long e)
    {
        var r = R;
        long cp = s;
        while (cp < e)
        {
            int i = DocText.PieceAt(r.Pieces, cp);
            if (i < 0) { yield return new Segment { CpStart = cp, CpEnd = e }; yield break; }
            var p = r.Pieces[i];
            int cs = p.Compressed ? 1 : 2;
            double fc = p.Fc + (cp - p.CpStart) * (double)cs;
            long pieceEnd = Math.Min(p.CpEnd, e);
            long segEnd = pieceEnd;
            var grpprls = new List<Bytes>();
            int idx = Fkp.RunIndexFrom(r.Chpx, fc);
            var run = idx < r.Chpx.Count ? r.Chpx[idx] : null;
            if (run is not null && run.FcStart <= fc)
            {
                segEnd = Math.Min(pieceEnd, p.CpStart + (long)Math.Ceiling((run.FcEnd - p.Fc) / cs));
                if (run.Grpprl.Length > 0) grpprls.Add(run.Grpprl);
            }
            else if (run is not null)
            {
                segEnd = Math.Min(pieceEnd, Math.Max(cp + 1, p.CpStart + (long)Math.Ceiling((run.FcStart - p.Fc) / cs)));
            }
            var prm = r.PrmGrpprl(p);
            if (prm is not null) grpprls.Add(prm.Value);
            if (segEnd <= cp) segEnd = cp + 1;
            yield return new Segment { CpStart = cp, CpEnd = segEnd, Grpprls = grpprls };
            cp = segEnd;
        }
    }

    // ───────────────────────────── runs ─────────────────────────────

    private string RenderRuns(PInfo p, StoryCtx ctx)
    {
        var r = R;
        string text = r.Text;
        var out_ = new RunBuf(_revIds);
        long markCp = p.CpEnd - 1;
        // HYPERLINK simples (dentro do parágrafo) vira w:hyperlink, como o Word grava
        var links = ScanHyperlinks(p, ctx);
        HyperlinkField? link = null;
        foreach (var seg in Segments(p.CpStart, p.CpEnd))
        {
            var (chp, touched) = ChpOf(p, seg.Grpprls);
            string rPr = OoxmlProps.RPrInner(chp, touched, PropCtx);
            string wrap = WrapKey(chp);
            for (long cp = seg.CpStart; cp < seg.CpEnd; cp++)
            {
                EmitMarkers(cp, out_, ctx);
                if (cp == markCp) continue; // marca de parágrafo/célula
                if (_skipRanges.Count > 0 && _skipRanges.Any(sr => cp >= sr.A && cp < sr.B)) continue;
                int c = text[(int)cp];
                // resultado de campo aninhado DENTRO da instrução de outro continua sendo
                // instrução (o Word grava w:instrText): vale qualquer campo aberto em instrução
                bool inInstr = _fieldStack.Any(f => f.Instr);
                if (link is not null)
                {
                    if (cp <= link.Sep) continue; // código do campo + separador
                    if (cp == link.End) { if (!link.Unwrap) out_.Raw("</w:hyperlink>"); link = null; continue; }
                }
                else if (c == 0x13 && links.TryGetValue(cp, out var lk))
                {
                    link = lk;
                    if (!link.Unwrap)
                        out_.Raw($"<w:hyperlink{Xml.AttrsXml(new Attrs { { "r:id", link.Rid }, { "w:anchor", link.Anchor }, { "w:tooltip", link.Tooltip }, { "w:tgtFrame", link.Target }, { "w:history", "1" } })}>");
                    continue;
                }
                if (c == 0x13)
                {
                    _fieldStack.Add(new FieldState { Instr = true });
                    string? ff = FormFieldData(p, cp);
                    out_.Special(rPr, wrap, ff is not null ? $"<w:fldChar w:fldCharType=\"begin\">{ff}</w:fldChar>" : "<w:fldChar w:fldCharType=\"begin\"/>");
                    continue;
                }
                if (c == 0x14)
                {
                    if (_fieldStack.Count > 0) _fieldStack[^1].Instr = false;
                    out_.Special(rPr, wrap, "<w:fldChar w:fldCharType=\"separate\"/>");
                    continue;
                }
                if (c == 0x15)
                {
                    if (_fieldStack.Count > 0) _fieldStack.RemoveAt(_fieldStack.Count - 1);
                    out_.Special(rPr, wrap, "<w:fldChar w:fldCharType=\"end\"/>");
                    continue;
                }
                if (inInstr)
                {
                    if (c >= 0x20 || c == 0x09) out_.Instr(rPr, wrap, ((char)c).ToString(), chp.RmarkDel == true);
                    continue;
                }
                // nota com marca personalizada: o 1º caractere da marca carrega a referência
                if (ctx.Kind == "main" && chp.FSpec != true && c >= 0x20 && (_footnoteIds.ContainsKey(cp) || _endnoteIds.ContainsKey(cp)))
                {
                    string refXml = _footnoteIds.TryGetValue(cp, out int fid)
                        ? Xml.El("w:footnoteReference", new Attrs { { "w:customMarkFollows", "1" }, { "w:id", fid } })
                        : Xml.El("w:endnoteReference", new Attrs { { "w:customMarkFollows", "1" }, { "w:id", _endnoteIds[cp] } });
                    out_.Special(rPr, wrap, refXml + $"<w:t>{Xml.EscText(((char)c).ToString())}</w:t>");
                    continue;
                }
                if (chp.FSpec == true || c < 0x20)
                {
                    string? sx = SpecialChar(c, cp, chp, ctx);
                    if (sx is not null)
                    {
                        if (sx.Length > 0) out_.Special(rPr, wrap, sx);
                        continue;
                    }
                }
                if (chp.Symbol is not null && (chp.FSpec == true || c == 0x28))
                {
                    int ftc = chp.Symbol.Ftc;
                    string? font = ftc >= 0 && ftc < r.Fonts.Count ? r.Fonts[ftc].Name : null;
                    out_.Special(rPr, wrap, Xml.El("w:sym", new Attrs { { "w:font", font }, { "w:char", Xml.Hex(chp.Symbol.Xchar, 4) } }));
                    continue;
                }
                if (c < 0x20) continue;
                out_.Text(rPr, wrap, ((char)c).ToString(), chp.RmarkDel == true);
            }
        }
        if (link is not null && !link.Unwrap) out_.Raw("</w:hyperlink>");
        EmitMarkers(p.CpEnd, out_, ctx, true);
        return out_.Close();
    }

    /// <summary>FFData do campo de formulário que começa em `begin` (0x01 com sprmCFData na instrução).</summary>
    private string? FormFieldData(PInfo p, long begin)
    {
        string text = R.Text;
        int depth = 0;
        var instr = new StringBuilder();
        for (long cp = begin + 1; cp < p.CpEnd - 1; cp++)
        {
            int c = text[(int)cp];
            if (c == 0x13) depth++;
            else if (c == 0x15) { if (depth == 0) return null; depth--; }
            else if (c == 0x14 && depth == 0) return null;
            else if (c == 0x01 && depth == 0)
            {
                // só campos de formulário: outros campos também carregam dados binários (0x01 + fData)
                if (!IsFormField(instr.ToString())) return null;
                var (chp, _) = ChpFor(p, cp);
                if (chp.FData == true && chp.PicLocation is not null) return FormFields.FfDataXml(R.Data, chp.PicLocation.Value);
            }
            else if (depth == 0 && c >= 0x20) instr.Append((char)c);
        }
        return null;
    }

    private sealed class OpenField
    {
        public long Begin;
        public long? Sep;
        public bool Nested;
    }

    /// <summary>
    /// Campos HYPERLINK de nível superior inteiramente dentro do parágrafo, sem
    /// campos aninhados na instrução: begin (CP) → separador, fim, destino.
    /// </summary>
    private Dictionary<long, HyperlinkField> ScanHyperlinks(PInfo p, StoryCtx ctx)
    {
        var out_ = new Dictionary<long, HyperlinkField>();
        string text = R.Text;
        int first = p.CpStart < text.Length ? text.IndexOf('\x13', (int)p.CpStart) : -1;
        if (first < 0 || first >= p.CpEnd) return out_;
        // só no nível de fora dos campos já abertos (que atravessam parágrafos)
        if (_fieldStack.Count > 0) return out_;
        var stack = new List<OpenField>();
        for (long cp = p.CpStart; cp < p.CpEnd - 1; cp++)
        {
            int c = text[(int)cp];
            if (c == 0x13)
            {
                if (stack.Count > 0) stack[^1].Nested = stack[^1].Sep is null || stack[^1].Nested;
                stack.Add(new OpenField { Begin = cp });
            }
            else if (c == 0x14 && stack.Count > 0)
            {
                var top = stack[^1];
                if (top.Sep is null) top.Sep = cp;
            }
            else if (c == 0x15 && stack.Count > 0)
            {
                var f = stack[^1];
                stack.RemoveAt(stack.Count - 1);
                if (stack.Count > 0 || f.Sep is null || f.Nested) continue;
                string instr = text.Substring((int)f.Begin + 1, (int)(f.Sep.Value - f.Begin - 1));
                // SHAPE (tela de desenho/forma em linha): o Word descarta o campo e mantém o desenho
                if (IsShapeField(instr)) { out_[f.Begin] = new HyperlinkField { Sep = f.Sep.Value, End = cp, Unwrap = true }; continue; }
                string? m = HyperlinkArgs(instr);
                if (m is null) continue;
                var args = ParseFieldArgs(m);
                string? url = null, anchor = null, tooltip = null, target = null;
                for (int i = 0; i < args.Count; i++)
                {
                    string a = args[i];
                    if (a == "\\l") { i++; anchor = i < args.Count ? args[i] : null; }
                    else if (a == "\\o") { i++; tooltip = i < args.Count ? args[i] : null; }
                    else if (a == "\\t") { i++; target = i < args.Count ? args[i] : null; }
                    else if (a.StartsWith('\\')) { if (a == "\\m" || a == "\\n") continue; }
                    else if (url is null) url = a;
                }
                if (string.IsNullOrEmpty(url) && string.IsNullOrEmpty(anchor)) continue;
                string? rid = !string.IsNullOrEmpty(url) ? ctx.Rels.Add("hyperlink", url, true) : null;
                out_[f.Begin] = new HyperlinkField { Sep = f.Sep.Value, End = cp, Rid = rid, Anchor = anchor, Tooltip = tooltip, Target = target };
            }
        }
        return out_;
    }

    /// <summary>Bookmarks/comentários que começam/terminam neste CP.</summary>
    private void EmitMarkers(long cp, RunBuf out_, StoryCtx ctx, bool endOnly = false)
    {
        // bookmarks: CPs absolutos (valem em qualquer história); comentários só no corpo
        if (_bkEnds.TryGetValue(cp, out var ends)) { foreach (int id in ends) out_.Raw(Xml.El("w:bookmarkEnd", new Attrs { { "w:id", id } })); _bkEnds.Remove(cp); }
        if (ctx.Kind == "main" && _commentEnds.TryGetValue(cp, out var cEnds)) { foreach (int id in cEnds) out_.Raw(Xml.El("w:commentRangeEnd", new Attrs { { "w:id", id } })); _commentEnds.Remove(cp); }
        if (endOnly) return;
        if (_bkStarts.TryGetValue(cp, out var starts)) { foreach (var b in starts) out_.Raw(Xml.El("w:bookmarkStart", new Attrs { { "w:id", b.Id }, { "w:name", b.Name } })); _bkStarts.Remove(cp); }
        if (ctx.Kind == "main" && _commentStarts.TryGetValue(cp, out var cStarts)) { foreach (int id in cStarts) out_.Raw(Xml.El("w:commentRangeStart", new Attrs { { "w:id", id } })); _commentStarts.Remove(cp); }
    }

    private string WrapKey(Chp chp)
    {
        if (chp.RmarkIns == true) return $"ins|{RevAuthor(chp.IbstRMark)}|{DttmIso(chp.DttmRMark) ?? ""}";
        if (chp.RmarkDel == true) return $"del|{RevAuthor(chp.IbstRMarkDel)}|{DttmIso(chp.DttmRMarkDel) ?? ""}";
        return "";
    }

    /// <summary>Caractere especial → XML do conteúdo do run ("" = descartar), ou null se for texto comum.</summary>
    private string? SpecialChar(int c, long cp, Chp chp, StoryCtx ctx)
    {
        switch (c)
        {
            case 0x09: return "<w:tab/>";
            case 0x0b: return "<w:br/>";
            case 0x0c: return "<w:br w:type=\"page\"/>";
            case 0x0e: return "<w:br w:type=\"column\"/>";
            case 0x1e: return "<w:noBreakHyphen/>";
            case 0x1f: return "<w:softHyphen/>";
            case 0x0d: return "<w:cr/>"; // 0x0D que não é marca de parágrafo (o Word grava w:cr)
            case 0x07: return ""; // marca de célula solta
        }
        if (chp.FSpec != true) return c < 0x20 ? "" : null;
        switch (c)
        {
            case 0x01:
            {
                if (chp.FData == true || chp.PicLocation is null) return "";
                if (chp.FOle2 == true) return "";
                var pic = Pictures.ReadInlinePicture(R, chp.PicLocation.Value);
                if (pic is null) return "";
                if (pic.Blip is null && pic.Hr is not null) return HrVml(pic);
                return InlineDrawing(pic, ctx);
            }
            case 0x02:
            {
                if (ctx.Kind == "ftn") return "<w:footnoteRef/>";
                if (ctx.Kind == "edn") return "<w:endnoteRef/>";
                if (_footnoteIds.TryGetValue(cp, out int f)) return Xml.El("w:footnoteReference", new Attrs { { "w:id", f } });
                if (_endnoteIds.TryGetValue(cp, out int e)) return Xml.El("w:endnoteReference", new Attrs { { "w:id", e } });
                return "";
            }
            case 0x05:
            {
                if (ctx.Kind == "atn") return "<w:annotationRef/>";
                return _commentByRef.TryGetValue(cp, out int i) ? Xml.El("w:commentReference", new Attrs { { "w:id", i } }) : "";
            }
            case 0x08:
            {
                var map = ctx.Hdr ? _fspaHdr : _fspaMain;
                return map.TryGetValue(cp, out var f) ? AnchorDrawing(f, ctx) : "";
            }
            case 0x03: return ctx.Kind == "ftn" || ctx.Kind == "edn" ? "<w:separator/>" : "";
            case 0x04: return ctx.Kind == "ftn" || ctx.Kind == "edn" ? "<w:continuationSeparator/>" : "";
        }
        return c < 0x20 ? "" : null;
    }

    // ───────────────────────────── imagens/desenhos ─────────────────────────────

    private string MediaTarget(Blip blip)
    {
        string key = $"{blip.Ext}:{blip.Bytes.Length}:{Hash(blip.Bytes)}";
        if (_media.TryGetValue(key, out var hit)) return hit;
        string ext = blip.Ext == "jpeg" ? "jpeg" : blip.Ext;
        string name = $"media/image{++_mediaN}.{ext}";
        SetFile($"word/{name}", blip.Bytes);
        if (!_mediaExt.Contains(ext)) _mediaExt.Add(ext);
        _media[key] = name;
        return name;
    }

    private string InlineDrawing(PicInfo pic, StoryCtx ctx)
    {
        if (pic.Blip is null) return "";
        string rid = ctx.Rels.Add("image", MediaTarget(pic.Blip));
        int id = ++_docPrId;
        double cx = Math.Max(1, JsNumber.Round(pic.Cx));
        double cy = Math.Max(1, JsNumber.Round(pic.Cy));
        string name = pic.Name ?? $"Imagem {id}";
        return "<w:drawing>" +
            Xml.El("wp:inline", new Attrs { { "distT", 0 }, { "distB", 0 }, { "distL", 0 }, { "distR", 0 } },
                Xml.El("wp:extent", new Attrs { { "cx", cx }, { "cy", cy } }) +
                Xml.El("wp:effectExtent", new Attrs { { "l", 0 }, { "t", 0 }, { "r", 0 }, { "b", 0 } }) +
                Xml.El("wp:docPr", new Attrs { { "id", id }, { "name", name } }) +
                "<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect=\"1\"/></wp:cNvGraphicFramePr>" +
                PicGraphic(id, name, rid, cx, cy, pic.Crop, pic.Fx)) +
            "</w:drawing>";
    }

    private string AnchorDrawing(Fspa f, StoryCtx ctx)
    {
        var r = R;
        var shape = r.Shape(f.Spid, ctx.Hdr);
        // forma-mestre (hspMaster de outra): o Word não a desenha nem a grava no .docx
        if (shape is null || r.Masters.Contains(shape.Spid)) return "";
        long? Pv(int id) => shape.Pv(id);
        long cx = Math.Max(1, ((long)f.XaRight - f.XaLeft) * EMU_PER_TWIP);
        long cy = Math.Max(1, ((long)f.YaBottom - f.YaTop) * EMU_PER_TWIP);
        // posição: propriedades posh/posrelh/posv/posrelv (tertiary FOPT) ou FSPA bx/by
        string[] bxs = { "margin", "page", "column" };
        string[] bys = { "margin", "page", "paragraph" };
        string relH = f.Bx < bxs.Length ? bxs[f.Bx] : "column";
        string relV = f.By < bys.Length ? bys[f.By] : "paragraph";
        long? posrelh = Pv(0x390), posrelv = Pv(0x392), posh = Pv(0x38f), posv = Pv(0x391);
        // MSOPRH/MSOPRV (0 margem, 1 página, 2 texto, 3 caractere/linha...) — conferido contra o VML do Word
        string[] rhs = { "margin", "page", "column", "character", "leftMargin", "rightMargin", "insideMargin", "outsideMargin" };
        string[] rvs = { "margin", "page", "paragraph", "line", "topMargin", "bottomMargin", "insideMargin", "outsideMargin" };
        string relHName = posrelh is not null ? (posrelh.Value < rhs.Length ? rhs[posrelh.Value] : relH) : relH;
        string relVName = posrelv is not null ? (posrelv.Value < rvs.Length ? rvs[posrelv.Value] : relV) : relV;
        string[] has = { "", "left", "center", "right", "inside", "outside" };
        string[] vas = { "", "top", "center", "bottom", "inside", "outside" };
        string? hAlign = posh is not null && posh.Value != 0 ? (posh.Value < has.Length ? has[posh.Value] : null) : "";
        string? vAlign = posv is not null && posv.Value != 0 ? (posv.Value < vas.Length ? vas[posv.Value] : null) : "";
        string positionH = $"<wp:positionH relativeFrom=\"{relHName}\">{(!string.IsNullOrEmpty(hAlign) ? $"<wp:align>{hAlign}</wp:align>" : $"<wp:posOffset>{(long)f.XaLeft * EMU_PER_TWIP}</wp:posOffset>")}</wp:positionH>";
        string positionV = $"<wp:positionV relativeFrom=\"{relVName}\">{(!string.IsNullOrEmpty(vAlign) ? $"<wp:align>{vAlign}</wp:align>" : $"<wp:posOffset>{(long)f.YaTop * EMU_PER_TWIP}</wp:posOffset>")}</wp:positionV>";
        string[] wts = { "bothSides", "left", "right", "largest" };
        string wrapText = f.Wrk < wts.Length ? wts[f.Wrk] : "bothSides";
        string wrap = f.Wr switch
        {
            1 => "<wp:wrapTopAndBottom/>",
            2 or 0 => $"<wp:wrapSquare wrapText=\"{wrapText}\"/>",
            4 => $"<wp:wrapTight wrapText=\"{wrapText}\"><wp:wrapPolygon edited=\"0\"><wp:start x=\"0\" y=\"0\"/><wp:lineTo x=\"0\" y=\"21600\"/><wp:lineTo x=\"21600\" y=\"21600\"/><wp:lineTo x=\"21600\" y=\"0\"/><wp:lineTo x=\"0\" y=\"0\"/></wp:wrapPolygon></wp:wrapTight>",
            5 => $"<wp:wrapThrough wrapText=\"{wrapText}\"><wp:wrapPolygon edited=\"0\"><wp:start x=\"0\" y=\"0\"/><wp:lineTo x=\"0\" y=\"21600\"/><wp:lineTo x=\"21600\" y=\"21600\"/><wp:lineTo x=\"21600\" y=\"0\"/><wp:lineTo x=\"0\" y=\"0\"/></wp:wrapPolygon></wp:wrapThrough>",
            _ => "<wp:wrapNone/>",
        };
        long Dist(int id, long def) => Pv(id) ?? def;
        int id = ++_docPrId;
        string name = $"Forma {id}";
        string graphic = ShapeGraphic(shape, f, ctx, id, name, cx, cy);
        if (graphic.Length == 0) return "";
        // forma "em linha com o texto" (Word 2000+ grava como âncora no caractere/linha,
        // deslocamento 0): o Word a converte em objeto em linha
        if (posrelh == 3 && posrelv == 3 && (posh ?? 0) == 0 && (posv ?? 0) == 0 && f.XaLeft == 0 && f.YaTop == 0)
        {
            return "<w:drawing>" + Xml.El("wp:inline", new Attrs { { "distT", 0 }, { "distB", 0 }, { "distL", 0 }, { "distR", 0 } },
                Xml.El("wp:extent", new Attrs { { "cx", cx }, { "cy", cy } }) + Xml.El("wp:effectExtent", new Attrs { { "l", 0 }, { "t", 0 }, { "r", 0 }, { "b", 0 } }) +
                Xml.El("wp:docPr", new Attrs { { "id", id }, { "name", name } }) + "<wp:cNvGraphicFramePr/>" + graphic) + "</w:drawing>";
        }
        // GroupShapeBooleanProperties (0x3BF): fBehindDocument (5), fLayoutInCell (15),
        // fAllowOverlap (9), fHidden (1) — o FSPA.fBelowText só vale sem a propriedade
        long? g = Pv(0x3bf);
        bool behind = OaFlag(g, 5) ?? (f.Wr == 3 && f.BelowText);
        var a = new Attrs
        {
            { "distT", Dist(0x385, 0) }, { "distB", Dist(0x387, 0) }, { "distL", Dist(0x384, 114300) }, { "distR", Dist(0x386, 114300) },
            // ordem Z = ordem das formas no desenho (DgContainer), como o z-index do VML do Word
            { "simplePos", 0 }, { "relativeHeight", 251658240L + (long)(shape.Z ?? id) * 1024 }, { "behindDoc", behind ? 1 : 0 },
            { "locked", f.AnchorLock ? 1 : 0 }, { "layoutInCell", (OaFlag(g, 15) ?? true) ? 1 : 0 }, { "allowOverlap", (OaFlag(g, 9) ?? true) ? 1 : 0 },
        };
        return "<w:drawing>" + Xml.El("wp:anchor", a,
            "<wp:simplePos x=\"0\" y=\"0\"/>" + positionH + positionV +
            Xml.El("wp:extent", new Attrs { { "cx", cx }, { "cy", cy } }) + Xml.El("wp:effectExtent", new Attrs { { "l", 0 }, { "t", 0 }, { "r", 0 }, { "b", 0 } }) + wrap +
            Xml.El("wp:docPr", new Attrs { { "id", id }, { "name", name }, { "hidden", OaFlag(g, 1) == true ? 1 : null } }) + "<wp:cNvGraphicFramePr/>" + graphic) + "</w:drawing>";
    }

    /// <summary>a:graphic para uma forma flutuante: imagem, forma/caixa de texto ou grupo.</summary>
    private string ShapeGraphic(OAShape shape, Fspa f, StoryCtx ctx, int id, string name, long cx, long cy)
    {
        if (shape.Children is not null && (shape.Flags & FSP.Group) != 0)
        {
            var gr = shape.GroupRect;
            double gl = gr?.L ?? 0, gt = gr?.T ?? 0, grr = gr is not null ? gr.R : cx, gb = gr is not null ? gr.B : cy;
            string xfrm = XfrmXml("a:xfrm", new Box(0, 0, cx, cy), shape, new Box(gl, gt, grr - gl, gb - gt));
            string kids = string.Concat(shape.Children.Select(c => ChildShapeXml(c, ctx)));
            return "<a:graphic><a:graphicData uri=\"http://schemas.microsoft.com/office/word/2010/wordprocessingGroup\">" +
                $"<wpg:wgp><wpg:cNvGrpSpPr/><wpg:grpSpPr>{xfrm}</wpg:grpSpPr>{kids}</wpg:wgp></a:graphicData></a:graphic>";
        }
        var blip = Pictures.ShapeBlip(R, shape);
        var stories = ctx.Hdr ? _txbxHdr : _txbxMain;
        (long, long)? story = stories.TryGetValue(shape.Spid, out var s1) ? s1 : stories.TryGetValue(f.Spid, out var s2) ? s2 : null;
        if (blip is not null && story is null)
        {
            string rid = ctx.Rels.Add("image", MediaTarget(blip));
            return PicGraphic(id, name, rid, cx, cy, CropOf(shape), Pictures.PicFxOf(shape));
        }
        return "<a:graphic><a:graphicData uri=\"http://schemas.microsoft.com/office/word/2010/wordprocessingShape\">" +
            WspXml(shape, ctx, new Box(0, 0, cx, cy), story, false) + "</a:graphicData></a:graphic>";
    }

    /// <summary>Forma dentro de grupo (coordenadas no espaço filho do grupo).</summary>
    private string ChildShapeXml(OAShape shape, StoryCtx ctx)
    {
        var a = shape.ChildAnchor ?? new Rect();
        var box = new Box(a.L, a.T, Math.Max(0, (double)a.R - a.L), Math.Max(0, (double)a.B - a.T));
        if (shape.Children is not null && (shape.Flags & FSP.Group) != 0)
        {
            var g = shape.GroupRect ?? new Rect { L = a.L, T = a.T, R = a.R, B = a.B };
            string xfrm = XfrmXml("a:xfrm", box, shape, new Box(g.L, g.T, (double)g.R - g.L, (double)g.B - g.T));
            string kids = string.Concat(shape.Children.Select(c => ChildShapeXml(c, ctx)));
            return $"<wpg:grpSp><wpg:cNvGrpSpPr/><wpg:grpSpPr>{xfrm}</wpg:grpSpPr>{kids}</wpg:grpSp>";
        }
        int id = ++_docPrId;
        var blip = Pictures.ShapeBlip(R, shape);
        var stories = ctx.Hdr ? _txbxHdr : _txbxMain;
        (long, long)? story = stories.TryGetValue(shape.Spid, out var s1) ? s1 : null;
        if (blip is not null && story is null)
        {
            string rid = ctx.Rels.Add("image", MediaTarget(blip));
            return $"<pic:pic><pic:nvPicPr>{Xml.El("pic:cNvPr", new Attrs { { "id", id }, { "name", $"Imagem {id}" } })}<pic:cNvPicPr/></pic:nvPicPr>" +
                $"<pic:blipFill>{Xml.El("a:blip", new Attrs { { "r:embed", rid } })}<a:stretch><a:fillRect/></a:stretch></pic:blipFill>" +
                $"<pic:spPr>{XfrmXml("a:xfrm", box, shape)}<a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>";
        }
        return WspXml(shape, ctx, box, story, true, id);
    }

    private static readonly string[] Dashes = { "solid", "sysDash", "sysDot", "sysDashDot", "sysDashDotDot", "dot", "dash", "lgDash", "dashDot", "lgDashDot", "lgDashDotDot" };
    private static readonly string[] Arrows = { "none", "triangle", "stealth", "diamond", "oval", "arrow" };
    private static readonly string[] Anchors = { "t", "ctr", "b", "t", "ctr", "b" };

    /// <summary>wps:wsp: geometria predefinida, preenchimento, linha e (opcional) caixa de texto.</summary>
    private string WspXml(OAShape shape, StoryCtx ctx, Box box, (long, long)? story, bool child, int? id = null)
    {
        long? Pv(int k) => shape.Pv(k);
        if (PresetMap.IsWordArtType(shape.Type) && story is null)
        {
            string? art = WordArtXml(shape, box, child, id);
            if (art is not null) return art;
        }
        var adjust = new double?[10];
        for (int i = 0; i < 10; i++) { long? v = Pv(0x147 + i); adjust[i] = v is null ? null : (int)(uint)v.Value; }
        double bw = box.Cx != 0 && !double.IsNaN(box.Cx) ? box.Cx : 1;
        double bh = box.Cy != 0 && !double.IsNaN(box.Cy) ? box.Cy : 1;
        var geo = PresetMap.PresetFor(shape.Type, adjust, bw, bh) ?? new PresetResult { Prst = "rect" };
        bool isLine = shape.Type == 20 || PresetMap.IsConnectorType(shape.Type);
        // booleanos de preenchimento (0x1BF: fFilled, bit 4) e linha (0x1FF: fLine, bit 3);
        // sem o fUse* correspondente vale o padrão (linhas e conectores sem preenchimento)
        bool filled = OaFlag(Pv(0x1bf), 4) ?? !isLine;
        bool lined = OaFlag(Pv(0x1ff), 3) ?? true;
        long lineWidth = Pv(0x1cb) ?? 9525;
        string av = string.Concat(geo.Av.Select(g => Xml.El("a:gd", new Attrs { { "name", g.Name }, { "fmla", $"val {JsNumber.ToString(g.Val)}" } })));
        string spPr = XfrmXml("a:xfrm", box, shape, null, geo.FlipV) + $"<a:prstGeom prst=\"{geo.Prst}\">{(av.Length > 0 ? $"<a:avLst>{av}</a:avLst>" : "<a:avLst/>")}</a:prstGeom>";
        if (!isLine) spPr += filled ? $"<a:solidFill><a:srgbClr val=\"{OaColor(Pv(0x181), 0xffffff)}\"/></a:solidFill>" : "<a:noFill/>";
        if (lined)
        {
            long di = Pv(0x1ce) ?? 0;
            string dash = di >= 0 && di < Dashes.Length ? Dashes[di] : "solid";
            string? Arrow(long? v) => v is not null && v.Value != 0 ? (v.Value < Arrows.Length ? Arrows[v.Value] : "triangle") : null;
            string? head = Arrow(Pv(0x1d0)), tail = Arrow(Pv(0x1d1));
            spPr += $"<a:ln w=\"{lineWidth}\"><a:solidFill><a:srgbClr val=\"{OaColor(Pv(0x1c0), 0x000000)}\"/></a:solidFill>" +
                (dash != "solid" ? $"<a:prstDash val=\"{dash}\"/>" : "") +
                (head is not null ? $"<a:headEnd type=\"{head}\"/>" : "") + (tail is not null ? $"<a:tailEnd type=\"{tail}\"/>" : "") + "</a:ln>";
        }
        else spPr += "<a:ln><a:noFill/></a:ln>";
        string txbx = "";
        if (story is not null)
        {
            var paras = CollectParas(story.Value.Item1, story.Value.Item2);
            // a história da caixa termina com um parágrafo guarda vazio
            var last = paras.Count > 0 ? paras[^1] : null;
            var list = paras.Count > 1 && last is not null && last.CpEnd - last.CpStart == 1 ? paras.Take(paras.Count - 1).ToList() : paras;
            var saved = _fieldStack;
            _fieldStack = new List<FieldState>();
            string inner = RenderBlocks(list, 0, list.Count, 0, new StoryCtx { Rels = ctx.Rels, Kind = "txbx", Hdr = ctx.Hdr });
            _fieldStack = saved;
            txbx = $"<wps:txbx><w:txbxContent>{(inner.Length > 0 ? inner : "<w:p/>")}</w:txbxContent></wps:txbx>";
        }
        long l = Pv(0x81) ?? 91440, t = Pv(0x82) ?? 45720, rr = Pv(0x83) ?? 91440, b = Pv(0x84) ?? 45720;
        long ai = Pv(0x87) ?? 0;
        string anchor = ai >= 0 && ai < Anchors.Length ? Anchors[ai] : "t";
        // booleanos de texto (0xBF): fFitShapeToText (bit 1) com fUsefFitShapeToText (bit 17)
        long textBits = Pv(0xbf) ?? 0;
        bool autofit = (textBits & (1 << 17)) != 0 && (textBits & 2) != 0;
        string bodyPr = Xml.El("wps:bodyPr", new Attrs
        {
            { "rot", 0 }, { "vert", "horz" }, { "wrap", "square" }, { "lIns", l }, { "tIns", t }, { "rIns", rr }, { "bIns", b }, { "anchor", anchor }, { "anchorCtr", 0 },
        }, autofit ? "<a:spAutoFit/>" : "<a:noAutofit/>");
        string nv = child && id is not null ? Xml.El("wps:cNvPr", new Attrs { { "id", id }, { "name", $"Forma {id}" } }) : "";
        string cNv = isLine ? "<wps:cNvCnPr/>" : $"<wps:cNvSpPr{(story is not null ? " txBox=\"1\"" : "")}/>";
        return $"<wps:wsp>{nv}{cNv}<wps:spPr>{spPr}</wps:spPr>{txbx}{bodyPr}</wps:wsp>";
    }

    // ───────────────────────────── tabelas ─────────────────────────────

    private Tap TapOf(PInfo row)
    {
        var tap = TapApply.NewTap();
        // estilo de tabela: TAPX do estilo primeiro (sem a estrutura de células)
        foreach (var p in row.TapPrls)
        {
            if (p.Sprm != 0x563a) continue;
            var st = R.Stsh.At(p.R.U16(p.Op));
            if (st?.Tapx is not null)
                foreach (var q in Sprms.Prls(st.Tapx.Value)) if (Sprms.SgcOf(q.Sprm) == 5 && q.Sprm != 0x563a) TapApply.Apply(tap, q);
        }
        foreach (var p in row.TapPrls) TapApply.Apply(tap, p);
        TapApply.FinishTap(tap);
        return tap;
    }

    private sealed class Row
    {
        public List<(int, int)> Cells = new();
        public Tap Tap = null!;
        public PInfo? Ttp;
        public List<int> Centers = new();
    }

    private string RenderTable(List<PInfo> paras, int from, int to, int depth, StoryCtx ctx)
    {
        var rows = new List<Row>();
        var cells = new List<(int, int)>();
        int cellStart = from;
        for (int k = from; k < to; k++)
        {
            var p = paras[k];
            if (p.Depth != depth) continue;
            if (p.RowEnd)
            {
                if (k > cellStart && cells.Count == 0) cells.Add((cellStart, k));
                rows.Add(new Row { Cells = cells, Tap = TapOf(p), Ttp = p });
                cells = new List<(int, int)>();
                cellStart = k + 1;
            }
            else if (p.CellEnd)
            {
                cells.Add((cellStart, k + 1));
                cellStart = k + 1;
            }
        }
        if (cells.Count > 0 || cellStart < to)
        {
            if (cellStart < to) cells.Add((cellStart, to));
            rows.Add(new Row { Cells = cells, Tap = rows.Count > 0 ? rows[^1].Tap : TapApply.NewTap() });
        }
        if (rows.Count == 0) return "";
        // grade: todas as fronteiras de célula
        foreach (var row in rows) row.Centers = LayoutCenters(row.Tap, row.Cells.Count);
        // linhas centralizadas: o Word centraliza CADA linha — o rgdxaCenter de linhas de
        // larguras quase iguais pode vir deslocado de uma para outra (corpus t119); a grade
        // é montada com cada linha centrada no meio dela
        bool centered = rows.All(r => r.Tap.Jc == 1) && !IsPositioned(rows[0].Tap);
        if (centered)
        {
            foreach (var row in rows)
            {
                var c = row.Centers;
                int n = Math.Min(row.Cells.Count, c.Count - 1);
                if (n > 0)
                {
                    int mid = (int)JsNumber.Round((c[0] + c[n]) / 2.0);
                    row.Centers = c.Select(v => v - mid).ToList();
                }
            }
        }
        var bounds = new List<int>();
        foreach (var row in rows)
        {
            var c = row.Centers;
            for (int i = 0; i < c.Count && i <= row.Cells.Count; i++) if (!bounds.Contains(c[i])) bounds.Add(c[i]);
        }
        var grid = bounds.OrderBy(v => v).ToList();
        var first = rows[0].Tap;
        var x = new StringBuilder("<w:tbl>");
        x.Append($"<w:tblPr>{TblPrXml(first, centered && grid.Count > 1 ? grid[^1] - grid[0] : null)}</w:tblPr>");
        x.Append("<w:tblGrid>");
        for (int i = 0; i + 1 < grid.Count; i++) x.Append(Xml.El("w:gridCol", new Attrs { { "w:w", grid[i + 1] - grid[i] } }));
        if (grid.Count < 2) x.Append(Xml.El("w:gridCol", new Attrs { { "w:w", 0 } }));
        x.Append("</w:tblGrid>");
        int GridIdx(int pos)
        {
            int best = 0;
            double bestD = double.PositiveInfinity;
            for (int i = 0; i < grid.Count; i++) { int d = Math.Abs(grid[i] - pos); if (d < bestD) { bestD = d; best = i; } }
            return best;
        }
        foreach (var row in rows)
        {
            var tap = row.Tap;
            // tabela posicionada (tblpPr): as molduras dos parágrafos das células são a
            // posição da TABELA — o Word não as repete nos parágrafos (medido no Word)
            if (IsPositioned(tap))
            {
                foreach (var (cs, ce) in row.Cells)
                    for (int k = cs; k < ce; k++)
                        if (paras[k].Depth == depth) foreach (var key in FrameKeys) paras[k].Touched.Remove(key);
            }
            var c = row.Centers;
            string trPr = "";
            int startIdx = c.Count > 0 ? GridIdx(c[0]) : 0;
            int endIdx = c.Count > 0 ? GridIdx(c[Math.Min(row.Cells.Count, c.Count - 1)]) : 0;
            if (startIdx > 0) trPr += Xml.El("w:gridBefore", new Attrs { { "w:val", startIdx } });
            if (endIdx < grid.Count - 1 && c.Count > 0) trPr += Xml.El("w:gridAfter", new Attrs { { "w:val", grid.Count - 1 - endIdx } });
            if (startIdx > 0) trPr += Xml.El("w:wBefore", new Attrs { { "w:w", grid[startIdx] - grid[0] }, { "w:type", "dxa" } });
            if (endIdx < grid.Count - 1 && c.Count > 0) trPr += Xml.El("w:wAfter", new Attrs { { "w:w", grid[^1] - grid[endIdx] }, { "w:type", "dxa" } });
            if (tap.CantSplit == true) trPr += "<w:cantSplit/>";
            if ((tap.RowHeight ?? 0) != 0) trPr += Xml.El("w:trHeight", new Attrs { { "w:val", Math.Abs(tap.RowHeight!.Value) }, { "w:hRule", tap.RowHeight < 0 ? "exact" : null } });
            if (tap.Header == true) trPr += "<w:tblHeader/>";
            if ((tap.Jc ?? 0) != 0)
            {
                string[] jcs = { "left", "center", "right" };
                trPr += Xml.El("w:jc", new Attrs { { "w:val", tap.Jc!.Value < jcs.Length ? jcs[tap.Jc.Value] : "left" } });
            }
            // marca de fim de linha oculta (vanish) = linha oculta
            if (row.Ttp is not null && ChpFor(row.Ttp, row.Ttp.CpEnd - 1).Chp.Vanish == true) trPr += "<w:hidden/>";
            x.Append("<w:tr>");
            string ex = TblPrExXml(tap, first);
            if (ex.Length > 0) x.Append($"<w:tblPrEx>{ex}</w:tblPrEx>");
            if (trPr.Length > 0) x.Append($"<w:trPr>{trPr}</w:trPr>");
            int ci = 0;
            while (ci < row.Cells.Count)
            {
                Tc? tc = ci < tap.Tcs.Count ? tap.Tcs[ci] : null;
                var (cs, ce) = row.Cells[ci];
                int span = 1;
                // células mescladas horizontalmente (fMerged) somem dentro da primeira
                if (tc is not null && tc.HorzMerge >= 2)
                {
                    while (ci + span < row.Cells.Count && ci + span < tap.Tcs.Count && tap.Tcs[ci + span].HorzMerge == 1) span++;
                }
                int left = ci < c.Count ? c[ci] : 0;
                int ri = Math.Min(ci + span, c.Count - 1);
                int right = ri >= 0 && ri < c.Count ? c[ri] : left;
                int gs = Math.Max(1, GridIdx(right) - GridIdx(left));
                x.Append($"<w:tc><w:tcPr>{TcPrXml(tap, ci, gs, right - left)}</w:tcPr>");
                string inner = RenderBlocks(paras, cs, ce, depth, ctx);
                x.Append(inner.Length > 0 ? inner : "<w:p/>");
                // conteúdo das células mescladas (normalmente vazio) entra na primeira
                for (int k = 1; k < span; k++)
                {
                    var (ms, me) = row.Cells[ci + k];
                    bool any = false;
                    for (int q = ms; q < me; q++) if (paras[q].CpEnd - paras[q].CpStart > 1) { any = true; break; }
                    if (any) x.Append(RenderBlocks(paras, ms, me, depth, ctx));
                }
                x.Append("</w:tc>");
                ci += span;
            }
            x.Append("</w:tr>");
        }
        x.Append("</w:tbl>");
        return x.ToString();
    }

    private string TblPrXml(Tap tap, int? centeredW = null)
    {
        string x = "";
        if (tap.Istd is not null)
        {
            string? id = _styleIds.TryGetValue(tap.Istd.Value, out var sid) ? sid : null;
            if (!string.IsNullOrEmpty(id) && tap.Istd != 11) x += Xml.El("w:tblStyle", new Attrs { { "w:val", id } });
        }
        if (IsPositioned(tap))
        {
            int pc = tap.Pc ?? 0;
            int pcVert = (pc >> 4) & 3, pcHorz = (pc >> 6) & 3;
            string[] va = { "margin", "page", "text" };
            string[] ha = { "text", "margin", "page" };
            var a = new Attrs
            {
                { "w:leftFromText", tap.DxaFromText }, { "w:rightFromText", tap.DxaFromTextRight },
                { "w:topFromText", tap.DyaFromText }, { "w:bottomFromText", tap.DyaFromTextBottom },
                { "w:vertAnchor", pcVert < va.Length ? va[pcVert] : "text" },
                { "w:horzAnchor", pcHorz < ha.Length ? ha[pcHorz] : "text" },
            };
            int xa = tap.DxaAbs ?? 0, ya = tap.DyaAbs ?? 0;
            var xAl = new Dictionary<int, string> { [-4] = "center", [-8] = "right", [-12] = "inside", [-16] = "outside" };
            var yAl = new Dictionary<int, string> { [-4] = "top", [-8] = "center", [-12] = "bottom", [-16] = "inside", [-20] = "outside" };
            if (xAl.TryGetValue(xa, out var xs)) a["w:tblpXSpec"] = xs; else if (xa != 0) a["w:tblpX"] = xa;
            if (yAl.TryGetValue(ya, out var ys)) a["w:tblpYSpec"] = ys; else if (ya != 0) a["w:tblpY"] = ya;
            x += Xml.El("w:tblpPr", a);
            if (tap.NoAllowOverlap == true) x += "<w:tblOverlap w:val=\"never\"/>";
        }
        if (tap.Bidi == true) x += "<w:bidiVisual/>";
        // (linhas centralizadas: a largura dxa não passa da grade montada — ela somava o deslocamento)
        var tblW = centeredW is { } cw && tap.TableWidth?.Fts == 3 && tap.TableWidth.W > cw ? new FtsWidth { Fts = 3, W = cw } : tap.TableWidth;
        string tw = WidthXml("w:tblW", tblW);
        x += tw.Length > 0 ? tw : Xml.El("w:tblW", new Attrs { { "w:w", 0 }, { "w:type", "auto" } });
        if ((tap.Jc ?? 0) != 0)
        {
            string[] jcs = { "left", "center", "right" };
            x += Xml.El("w:jc", new Attrs { { "w:val", tap.Jc!.Value < jcs.Length ? jcs[tap.Jc.Value] : "left" } });
        }
        if ((tap.Spacing ?? 0) != 0) x += Xml.El("w:tblCellSpacing", new Attrs { { "w:w", tap.Spacing }, { "w:type", "dxa" } });
        // sprmTWidthIndent é o w:tblInd que o Word grava; sem ele, calcula pela 1ª célula. Na
        // tabela centralizada ele não posiciona, mas nos modos ≤ 14 ainda muda a largura máxima
        // do autoajuste (oráculo tblindctr do docx-layout) — vai também
        int? ind = tap.WidthIndent is not null && tap.WidthIndent.Fts == 3 ? tap.WidthIndent.W : TableIndent(tap);
        if (ind is not null && ind != 0 && ((tap.Jc ?? 0) == 0 || tap.Jc == 1)) x += Xml.El("w:tblInd", new Attrs { { "w:w", ind }, { "w:type", "dxa" } });
        if (tap.BordersSet && !AllNone(tap.Borders)) x += $"<w:tblBorders>{BordersXml(tap.Borders, true)}</w:tblBorders>";
        if (tap.ShdTable is not null) x += OoxmlProps.ShdXml(tap.ShdTable);
        if (tap.Autofit != true) x += "<w:tblLayout w:type=\"fixed\"/>";
        string mar = CellMargins(tap);
        if (mar.Length > 0) x += $"<w:tblCellMar>{mar}</w:tblCellMar>";
        // TLP.grfatl: bits 0x20..0x400 = primeira/última linha/coluna, sem faixas (mesmos bits do w:tblLook)
        int look = (tap.Tlp?.Grfatl ?? 0) & 0x07e0;
        x += Xml.El("w:tblLook", new Attrs
        {
            { "w:val", Xml.Hex(look, 4) },
            { "w:firstRow", (look & 0x20) != 0 ? 1 : 0 }, { "w:lastRow", (look & 0x40) != 0 ? 1 : 0 },
            { "w:firstColumn", (look & 0x80) != 0 ? 1 : 0 }, { "w:lastColumn", (look & 0x100) != 0 ? 1 : 0 },
            { "w:noHBand", (look & 0x200) != 0 ? 1 : 0 }, { "w:noVBand", (look & 0x400) != 0 ? 1 : 0 },
        });
        return x;
    }

    /// <summary>Propriedades da linha que diferem da 1ª linha (tblPrEx).</summary>
    private static string TblPrExXml(Tap tap, Tap first)
    {
        string x = "";
        if (ReferenceEquals(tap, first)) return "";
        if (tap.BordersSet && !tap.Borders.JsonEquals(first.Borders)) x += $"<w:tblBorders>{BordersXml(tap.Borders, true)}</w:tblBorders>";
        string mar = CellMargins(tap);
        if (mar.Length > 0 && mar != CellMargins(first)) x += $"<w:tblCellMar>{mar}</w:tblCellMar>";
        return x;
    }

    private static string TcPrXml(Tap tap, int i, int gridSpan, int width)
    {
        Tc? tc = i < tap.Tcs.Count ? tap.Tcs[i] : null;
        string x = "";
        if (tc is not null && tc.FtsWidth == 1) x += Xml.El("w:tcW", new Attrs { { "w:w", 0 }, { "w:type", "auto" } });
        else if (tc is not null && tc.FtsWidth != 0) x += WidthXml("w:tcW", new FtsWidth { Fts = tc.FtsWidth, W = tc.WWidth });
        else x += Xml.El("w:tcW", new Attrs { { "w:w", Math.Max(0, width) }, { "w:type", "dxa" } });
        if (gridSpan > 1) x += Xml.El("w:gridSpan", new Attrs { { "w:val", gridSpan } });
        if (tc is not null && tc.VertMerge != 0) x += tc.VertMerge == 3 || tc.VertMerge == 2 ? "<w:vMerge w:val=\"restart\"/>" : "<w:vMerge/>";
        if (tc is not null)
        {
            string b = "";
            if (tc.SetTop) b += OoxmlProps.BrcXml("w:top", tc.BrcTop);
            if (tc.SetLeft) b += OoxmlProps.BrcXml("w:left", tc.BrcLeft);
            if (tc.SetBottom) b += OoxmlProps.BrcXml("w:bottom", tc.BrcBottom);
            if (tc.SetRight) b += OoxmlProps.BrcXml("w:right", tc.BrcRight);
            if (b.Length > 0) x += $"<w:tcBorders>{b}</w:tcBorders>";
        }
        var shd = CellShd(tap, i);
        if (shd is not null) x += OoxmlProps.ShdXml(shd);
        if (tc is not null && tc.NoWrap) x += "<w:noWrap/>";
        if (tc is not null && (tc.Mar.Top is not null || tc.Mar.Left is not null || tc.Mar.Bottom is not null || tc.Mar.Right is not null))
        {
            string m = "";
            if (tc.Mar.Top is not null) m += Xml.El("w:top", new Attrs { { "w:w", tc.Mar.Top }, { "w:type", "dxa" } });
            if (tc.Mar.Left is not null) m += Xml.El("w:left", new Attrs { { "w:w", tc.Mar.Left }, { "w:type", "dxa" } });
            if (tc.Mar.Bottom is not null) m += Xml.El("w:bottom", new Attrs { { "w:w", tc.Mar.Bottom }, { "w:type", "dxa" } });
            if (tc.Mar.Right is not null) m += Xml.El("w:right", new Attrs { { "w:w", tc.Mar.Right }, { "w:type", "dxa" } });
            x += $"<w:tcMar>{m}</w:tcMar>";
        }
        if (tc is not null && tc.TextFlow != 0)
        {
            string[] tf = { "lrTb", "tbRl", "btLr", "lrTbV", "tbRlV", "tbLrV" };
            x += Xml.El("w:textDirection", new Attrs { { "w:val", tc.TextFlow < tf.Length ? tf[tc.TextFlow] : "lrTb" } });
        }
        if (tc is not null && tc.FitText) x += "<w:tcFitText/>";
        if (tc is not null && tc.VertAlign != 0)
        {
            string[] vas = { "top", "center", "bottom" };
            x += Xml.El("w:vAlign", new Attrs { { "w:val", tc.VertAlign < vas.Length ? vas[tc.VertAlign] : "top" } });
        }
        if (tc is not null && tc.HideMark) x += "<w:hideMark/>";
        return x;
    }
}

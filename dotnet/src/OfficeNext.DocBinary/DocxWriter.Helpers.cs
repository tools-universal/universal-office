using System.Text;
using System.Text.RegularExpressions;
using OfficeNext.Core;

namespace OfficeNext.DocBinary;

/// <summary>Parágrafo coletado de uma história.</summary>
internal sealed class PInfo
{
    public long CpStart;
    /// <summary>Exclusivo; a marca está em CpEnd - 1.</summary>
    public long CpEnd;
    public int Mark;
    public Pap Pap = null!;
    public HashSet<PapKey> Touched = null!;
    /// <summary>grpprls diretos (PAPX + Prm).</summary>
    public List<Bytes> Grpprls = null!;
    /// <summary>Prls de tabela (sgc 5) efetivos, em ordem — a TAP da linha (marca TTP).</summary>
    public List<Prl> TapPrls = null!;
    public int Depth;
    public bool CellEnd;
    public bool RowEnd;
}

internal sealed class Segment
{
    public long CpStart;
    public long CpEnd;
    public List<Bytes> Grpprls = new();
}

/// <summary>Relações de uma parte (document.xml, header1.xml...).</summary>
internal sealed class PartRels
{
    private readonly List<string> _items = new();
    private int _n;
    private readonly Dictionary<string, string> _byKey = new(StringComparer.Ordinal);

    public string Add(string type, string target, bool external = false)
    {
        string key = $"{type}|{target}|{(external ? "true" : "false")}";
        if (_byKey.TryGetValue(key, out var hit)) return hit;
        string id = $"rId{++_n}";
        _items.Add(Xml.El("Relationship", new Attrs
        {
            { "Id", id }, { "Type", $"{Xml.NS.RelType}/{type}" }, { "Target", target }, { "TargetMode", external ? "External" : null },
        }));
        _byKey[key] = id;
        return id;
    }

    public int Size => _items.Count;

    public string ToXml() => $"{Xml.XML_DECL}<Relationships xmlns=\"{Xml.NS.Rel}\">{string.Concat(_items)}</Relationships>";
}

/// <summary>Estado de renderização de uma parte (rels + tipo de história).</summary>
internal sealed class StoryCtx
{
    public PartRels Rels = null!;
    /// <summary>"main", "hdr", "ftn", "edn", "atn" ou "txbx".</summary>
    public string Kind = "main";
    /// <summary>Cabeçalho: desenhos vêm do PlcSpaHdr.</summary>
    public bool Hdr;
}

internal sealed class HyperlinkField
{
    public long Sep;
    public long End;
    public string? Rid;
    public string? Anchor;
    public string? Tooltip;
    public string? Target;
    public bool Unwrap;
}

/// <summary>Campo aberto (atravessa parágrafos).</summary>
internal sealed class FieldState
{
    public bool Instr;
}

internal sealed class RevCounter
{
    public int Next = 1;
}

/// <summary>
/// Acumulador de runs — porta do RunBuf: junta caracteres seguidos com o mesmo
/// rPr (e o mesmo invólucro de revisão) num único w:r.
/// </summary>
internal sealed class RunBuf
{
    private readonly List<string> _parts = new();
    private string? _curRPr;
    private string _openWrap = "";
    private readonly StringBuilder _content = new();
    private readonly StringBuilder _textBuf = new();
    private string _textKind = "t";
    private readonly RevCounter _ids;

    public RunBuf(RevCounter ids) { _ids = ids; }

    private void FlushText()
    {
        if (_textBuf.Length == 0) return;
        string tag = _textKind switch { "t" => "w:t", "instr" => "w:instrText", "del" => "w:delText", _ => "w:delInstrText" };
        string text = _textBuf.ToString();
        string sp = Xml.IsJsSpace(text[0]) || Xml.IsJsSpace(text[^1]) ? " xml:space=\"preserve\"" : "";
        _content.Append('<').Append(tag).Append(sp).Append('>').Append(Xml.EscText(text)).Append("</").Append(tag).Append('>');
        _textBuf.Clear();
    }

    private void FlushRun()
    {
        FlushText();
        if (_curRPr is not null && _content.Length > 0)
        {
            _parts.Add($"<w:r>{(_curRPr.Length > 0 ? $"<w:rPr>{_curRPr}</w:rPr>" : "")}{_content}</w:r>");
        }
        _content.Clear();
        _curRPr = null;
    }

    private void SetWrap(string wrap)
    {
        if (wrap == _openWrap) return;
        FlushRun();
        if (_openWrap.Length > 0) _parts.Add(_openWrap.StartsWith("ins|", StringComparison.Ordinal) ? "</w:ins>" : "</w:del>");
        _openWrap = wrap;
        if (wrap.Length > 0)
        {
            var parts = wrap.Split('|');
            string kind = parts[0];
            string? author = parts.Length > 1 ? parts[1] : null;
            string? date = parts.Length > 2 ? parts[2] : null;
            _parts.Add($"<w:{kind}{Xml.AttrsXml(new Attrs { { "w:id", _ids.Next++ }, { "w:author", author }, { "w:date", string.IsNullOrEmpty(date) ? null : date } })}>");
        }
    }

    private void Begin(string rPr, string wrap)
    {
        SetWrap(wrap);
        if (_curRPr != rPr) { FlushRun(); _curRPr = rPr; }
    }

    public void Text(string rPr, string wrap, string s, bool deleted)
    {
        Begin(rPr, wrap);
        string kind = deleted ? "del" : "t";
        if (_textKind != kind) { FlushText(); _textKind = kind; }
        _textBuf.Append(s);
    }

    public void Instr(string rPr, string wrap, string s, bool deleted)
    {
        Begin(rPr, wrap);
        string kind = deleted ? "delInstr" : "instr";
        if (_textKind != kind) { FlushText(); _textKind = kind; }
        _textBuf.Append(s);
    }

    public void Special(string rPr, string wrap, string xml)
    {
        Begin(rPr, wrap);
        FlushText();
        // fldChar sempre em run próprio (o Word exige)
        if (xml.StartsWith("<w:fldChar", StringComparison.Ordinal))
        {
            FlushRun();
            _curRPr = rPr;
            _content.Append(xml);
            FlushRun();
            return;
        }
        _content.Append(xml);
        if (xml.StartsWith("<w:drawing", StringComparison.Ordinal) || xml.StartsWith("<w:footnoteReference", StringComparison.Ordinal) ||
            xml.StartsWith("<w:endnoteReference", StringComparison.Ordinal) || xml.StartsWith("<w:commentReference", StringComparison.Ordinal))
        {
            FlushRun();
        }
    }

    public void Raw(string xml)
    {
        FlushRun();
        _parts.Add(xml);
    }

    public string Close()
    {
        SetWrap("");
        FlushRun();
        return string.Concat(_parts);
    }
}

/// <summary>Funções auxiliares do gravador (fim do docx-writer.ts).</summary>
internal static class WriterUtil
{
    public const int EMU_PER_TWIP = 635;

    public static void Push<TK, TV>(Dictionary<TK, List<TV>> m, TK k, TV v) where TK : notnull
    {
        if (m.TryGetValue(k, out var a)) a.Add(v); else m[k] = new List<TV> { v };
    }

    /// <summary>Hash FNV-1a amostrado (Math.imul do JS = multiplicação de 32 bits).</summary>
    public static uint Hash(byte[] b)
    {
        uint h = 2166136261;
        int step = Math.Max(1, b.Length / 4096);
        for (int i = 0; i < b.Length; i += step) h = unchecked((h ^ b[i]) * 16777619);
        return h;
    }

    /// <summary>DTTM → ISO 8601.</summary>
    public static string? DttmIso(long? vOpt)
    {
        if (vOpt is null || vOpt.Value == 0) return null;
        uint v = (uint)vOpt.Value;
        uint mint = v & 0x3f, hr = (v >> 6) & 0x1f, dom = (v >> 11) & 0x1f, mon = (v >> 16) & 0xf, yr = ((v >> 20) & 0x1ff) + 1900;
        if (dom == 0 || mon == 0) return null;
        static string P(uint n) => n.ToString(System.Globalization.CultureInfo.InvariantCulture).PadLeft(2, '0');
        return $"{yr}-{P(mon)}-{P(dom)}T{P(hr)}:{P(mint)}:00Z";
    }

    public static string NotePr(string? pos, int? nfc, int? start, int? rnc, bool endnote)
    {
        string x = "";
        if (pos is not null && pos != "pageBottom") x += Xml.El("w:pos", new Attrs { { "w:val", pos } });
        if (nfc is not null && nfc != (endnote ? 2 : 0)) x += Xml.El("w:numFmt", new Attrs { { "w:val", OoxmlProps.NumFmtOf(nfc.Value) } });
        if (start is not null && start > 1) x += Xml.El("w:numStart", new Attrs { { "w:val", start } });
        if (rnc is not null && rnc != 0)
        {
            string[] r = { "continuous", "eachSect", "eachPage" };
            x += Xml.El("w:numRestart", new Attrs { { "w:val", rnc.Value < r.Length ? r[rnc.Value] : "continuous" } });
        }
        return x;
    }

    public static string WidthXml(string name, FtsWidth? w)
    {
        if (w is null || w.Fts == 0) return "";
        string[] types = { "nil", "auto", "pct", "dxa" };
        string type = types[w.Fts & 3];
        return Xml.El(name, new Attrs { { "w:w", w.Fts == 1 ? 0 : w.W }, { "w:type", type } });
    }

    private static readonly string[] SidesAll = { "top", "left", "bottom", "right", "insideH", "insideV" };

    public static string BordersXml(TableBorders b, bool inside)
    {
        int n = inside ? 6 : 4;
        var sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.Append(OoxmlProps.BrcXml($"w:{SidesAll[i]}", b.Side(i)));
        return sb.ToString();
    }

    /// <summary>Fronteiras das células da linha (rgdxaCenter).</summary>
    public static List<int> LayoutCenters(Tap tap, int n) => tap.Centers;

    public static bool IsPositioned(Tap tap) => tap.DxaAbs is not null || tap.DyaAbs is not null || tap.Pc is not null;

    public static bool AllNone(TableBorders b)
    {
        for (int i = 0; i < 6; i++) if (!PropUtil.BrcNone(b.Side(i))) return false;
        return true;
    }

    public static string CellMargins(Tap tap)
    {
        var p = tap.Padding;
        int? left = p.Left, right = p.Right;
        // Word 97: sem sprmTCellPaddingDefault, a margem é o dxaGapHalf
        if (left is null && right is null && tap.DxaGapHalf is not null) { left = tap.DxaGapHalf; right = tap.DxaGapHalf; }
        string m = "";
        if (p.Top is not null) m += Xml.El("w:top", new Attrs { { "w:w", p.Top }, { "w:type", "dxa" } });
        if (left is not null) m += Xml.El("w:left", new Attrs { { "w:w", left }, { "w:type", "dxa" } });
        if (p.Bottom is not null) m += Xml.El("w:bottom", new Attrs { { "w:w", p.Bottom }, { "w:type", "dxa" } });
        if (right is not null) m += Xml.El("w:right", new Attrs { { "w:w", right }, { "w:type", "dxa" } });
        return m;
    }

    /// <summary>Recuo da tabela (modo de compatibilidade 11: até o texto da 1ª célula).</summary>
    public static int? TableIndent(Tap tap)
    {
        if (tap.Centers.Count == 0) return null;
        int left = (tap.Tcs.Count > 0 ? tap.Tcs[0].Mar.Left : null) ?? tap.Padding.Left ?? tap.DxaGapHalf ?? 0;
        return tap.Centers[0] + left;
    }

    public static Shd? CellShd(Tap tap, int i)
    {
        var tc = i < tap.Tcs.Count ? tap.Tcs[i] : null;
        if (tc?.Shd is not null) return tc.Shd;
        Shd? Pick(List<Shd?>? arr)
        {
            var s = arr is not null && i < arr.Count ? arr[i] : null;
            if (s is null) return null;
            // ShdAuto (tudo automático, padrão clear) = sem sombreamento
            if (s.Pat == 0 && s.Back == -1 && s.Fore == -1) return null;
            if (s.Pat == 0xffff) return null;
            return s;
        }
        return Pick(tap.ShdRaw) ?? Pick(tap.ShdDef) ?? Pick(tap.Shd80);
    }

    /// <summary>Cadeia UTF-16LE terminada em nulo de uma propriedade complexa.</summary>
    public static string? OaString(OAShape shape, int id)
    {
        if (!shape.Props.TryGetValue(id, out var p) || p.Complex is null || p.Complex.Value.Length < 2) return null;
        var c = p.Complex.Value;
        var sb = new StringBuilder();
        for (int i = 0; i + 1 < c.Length; i += 2)
        {
            int ch = c[i] | (c[i + 1] << 8);
            if (ch == 0) break;
            sb.Append((char)ch);
        }
        return sb.ToString();
    }

    /// <summary>
    /// Booleano OfficeArt: bit `bit` vale só se o fUse* correspondente (bit + 16)
    /// estiver ligado; senão null (= padrão).
    /// </summary>
    public static bool? OaFlag(long? v, int bit)
    {
        if (v is null || ((v.Value >> (bit + 16)) & 1) == 0) return null;
        return ((v.Value >> bit) & 1) == 1;
    }

    public static string OaColor(long? v, int def)
    {
        if (v is null || (v.Value >> 24) != 0) return OoxmlProps.Hex(def);
        long x = v.Value;
        return OoxmlProps.Hex((int)(((x & 0xff) << 16) | (x & 0xff00) | ((x >> 16) & 0xff)));
    }

    /// <summary>
    /// Fundo da página: forma de fundo do desenho principal com preenchimento sólido
    /// (fillType 0x180 = 0, fFilled em 0x1BF) → w:background com a cor (0x181).
    /// </summary>
    public static string BackgroundXml(OAShape? shape)
    {
        if (shape is null) return "";
        if ((shape.Pv(0x180) ?? 0) != 0 || OaFlag(shape.Pv(0x1bf), 4) == false) return "";
        long? c = shape.Pv(0x181);
        if (c is null || (unchecked((uint)c.Value) >> 24) != 0) return "";
        string color = OaColor(c, 0xffffff);
        return color == "FFFFFF" ? "" : Xml.El("w:background", new Attrs { { "w:color", color } });
    }

    /// <summary>Linha horizontal em linha (o:hr) — o Word grava VML.</summary>
    public static string HrVml(PicInfo pic)
    {
        var hr = pic.Hr!;
        static string Pt(double emu) => JsNumber.ToString(JsNumber.Round((emu / 12700) * 10) / 10);
        var a = new Attrs
        {
            { "style", $"width:{Pt(pic.Cx)}pt;height:{Pt(pic.Cy)}pt" },
            { "o:hrpct", hr.Pct }, { "o:hralign", hr.Align }, { "o:hrstd", "t" }, { "o:hrnoshade", hr.Noshade ? "t" : null }, { "o:hr", "t" },
            { "fillcolor", hr.Fill is not null ? $"#{OoxmlProps.Hex(hr.Fill.Value)}" : null }, { "stroked", "f" },
        };
        return $"<w:pict>{Xml.El("v:rect", a)}</w:pict>";
    }

    /// <summary>Caixa (x, y, cx, cy) — números do JS.</summary>
    public readonly record struct Box(double X, double Y, double Cx, double Cy);

    /// <summary>a:xfrm com rotação/espelhamento da forma (e o espaço filho, para grupos).</summary>
    public static string XfrmXml(string name, Box b, OAShape shape, Box? ch = null, bool extraFlipV = false)
    {
        long rotRaw = shape.Pv(0x0004) ?? 0;
        double rot = JsNumber.Round(((int)(uint)rotRaw / 65536.0) * 60000);
        var a = new Attrs
        {
            { "rot", rot != 0 ? ((rot % 21600000) + 21600000) % 21600000 : null },
            { "flipH", (shape.Flags & FSP.FlipH) != 0 ? 1 : null },
            // a preset pode ser o espelho vertical da geometria binária (preset-map)
            { "flipV", ((shape.Flags & FSP.FlipV) != 0) != extraFlipV ? 1 : null },
        };
        static string N(double v) => JsNumber.ToString(JsNumber.Round(v));
        static string NPos(double v) => JsNumber.ToString(Math.Max(0, JsNumber.Round(v)));
        string c = $"<a:off x=\"{N(b.X)}\" y=\"{N(b.Y)}\"/><a:ext cx=\"{NPos(b.Cx)}\" cy=\"{NPos(b.Cy)}\"/>";
        if (ch is { } h) c += $"<a:chOff x=\"{N(h.X)}\" y=\"{N(h.Y)}\"/><a:chExt cx=\"{NPos(h.Cx)}\" cy=\"{NPos(h.Cy)}\"/>";
        return Xml.El(name, a, c);
    }

    public static Crop? CropOf(OAShape shape)
    {
        double F(int id) => (int)(uint)(shape.Pv(id) ?? 0) / 65536.0;
        var c = new Crop { T = F(0x100), B = F(0x101), L = F(0x102), R = F(0x103) };
        return c.T != 0 || c.B != 0 || c.L != 0 || c.R != 0 ? c : null;
    }

    public static string PicGraphic(int id, string name, string rid, double cx, double cy, Crop? crop, PicFx? fx = null)
    {
        // ajustes de cor da imagem (marca-d'água "desbotada" etc.) dentro do a:blip
        string blipKids = fx is null ? "" : (fx.Gray ? "<a:grayscl/>" : "") + (fx.BiLevel ? "<a:biLevel thresh=\"50000\"/>" : "")
            + ((fx.Bright is { } b0 && b0 != 0) || (fx.Contrast is { } c0 && c0 != 0)
                ? Xml.El("a:lum", new Attrs { { "bright", fx.Bright is { } b && b != 0 ? b : null }, { "contrast", fx.Contrast is { } c && c != 0 ? c : null } })
                : "");
        string src = "";
        if (crop is not null)
        {
            static object? K(double v)
            {
                double r = JsNumber.Round(v * 100000);
                return r != 0 && !double.IsNaN(r) ? r : null;
            }
            src = Xml.El("a:srcRect", new Attrs { { "l", K(crop.L) }, { "t", K(crop.T) }, { "r", K(crop.R) }, { "b", K(crop.B) } });
        }
        return "<a:graphic><a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/picture\">" +
            $"<pic:pic><pic:nvPicPr>{Xml.El("pic:cNvPr", new Attrs { { "id", 0 }, { "name", name } })}<pic:cNvPicPr/></pic:nvPicPr>" +
            $"<pic:blipFill>{Xml.El("a:blip", new Attrs { { "r:embed", rid } }, blipKids)}{src}<a:stretch><a:fillRect/></a:stretch></pic:blipFill>" +
            $"<pic:spPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"{JsNumber.ToString(cx)}\" cy=\"{JsNumber.ToString(cy)}\"/></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>" +
            "</a:graphicData></a:graphic>";
    }

    /// <summary>
    /// WordArt clássico (geoText): texto WordArt do DrawingML com o texto na cor
    /// do preenchimento (a marca-d'água típica).
    /// </summary>
    public static string? WordArtXml(OAShape shape, Box box, bool child, int? id)
    {
        string? text = OaString(shape, 0xc0);
        if (string.IsNullOrEmpty(text)) return null;
        string? font = OaString(shape, 0xc5);
        long? sizeRaw = shape.Pv(0xc3);
        double size = sizeRaw is not null ? Math.Max(1, JsNumber.Round((sizeRaw.Value / 65536.0) * 2)) : 72;
        bool filled = OaFlag(shape.Pv(0x1bf), 4) ?? true;
        string rPr = (!string.IsNullOrEmpty(font) ? Xml.El("w:rFonts", new Attrs { { "w:ascii", font }, { "w:hAnsi", font }, { "w:cs", font } }) : "") +
            (filled ? Xml.El("w:color", new Attrs { { "w:val", OaColor(shape.Pv(0x181), 0xffffff) } }) : "") +
            Xml.El("w:sz", new Attrs { { "w:val", size } }) + Xml.El("w:szCs", new Attrs { { "w:val", size } });
        var lines = Regex.Split(text, "\r\n|\r|\n");
        string paras = string.Concat(lines.Select(line =>
            "<w:p><w:pPr><w:spacing w:after=\"0\" w:line=\"240\" w:lineRule=\"auto\"/><w:jc w:val=\"center\"/></w:pPr>" +
            $"<w:r><w:rPr>{rPr}</w:rPr><w:t xml:space=\"preserve\">{Xml.EscText(line)}</w:t></w:r></w:p>"));
        string spPr = XfrmXml("a:xfrm", box, shape) + "<a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln>";
        string bodyPr = Xml.El("wps:bodyPr", new Attrs
        {
            { "rot", 0 }, { "vert", "horz" }, { "wrap", "none" }, { "lIns", 0 }, { "tIns", 0 }, { "rIns", 0 }, { "bIns", 0 },
            { "fromWordArt", 1 }, { "anchor", "ctr" }, { "anchorCtr", 0 },
        }, "<a:prstTxWarp prst=\"textPlain\"><a:avLst/></a:prstTxWarp><a:noAutofit/>");
        string nv = child && id is not null ? Xml.El("wps:cNvPr", new Attrs { { "id", id }, { "name", $"WordArt {id}" } }) : "";
        return $"<wps:wsp>{nv}<wps:cNvSpPr txBox=\"1\"/><wps:spPr>{spPr}</wps:spPr><wps:txbx><w:txbxContent>{paras}</w:txbxContent></wps:txbx>{bodyPr}</wps:wsp>";
    }

    // ─────────────── campos: equivalentes manuais das regex do JS ───────────────

    /// <summary>
    /// /^\s*KW/i do JS: devolve o índice depois da palavra-chave (comparação
    /// ASCII sem caixa, como o /i sem flag u), ou -1.
    /// </summary>
    public static int MatchKeyword(string s, string kw)
    {
        int i = 0;
        while (i < s.Length && Xml.IsJsSpace(s[i])) i++;
        if (i + kw.Length > s.Length) return -1;
        for (int k = 0; k < kw.Length; k++)
        {
            char a = s[i + k], b = kw[k];
            if (a == b) continue;
            if (a < 128 && char.ToUpperInvariant(a) == char.ToUpperInvariant(b)) continue;
            return -1;
        }
        return i + kw.Length;
    }

    /// <summary>\b depois da posição: o próximo caractere não é de palavra ASCII.</summary>
    public static bool WordBoundaryAfter(string s, int pos)
    {
        if (pos >= s.Length) return true;
        char c = s[pos];
        bool word = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_';
        return !word;
    }

    /// <summary>/^\s*SHAPE\b/i</summary>
    public static bool IsShapeField(string instr)
    {
        int e = MatchKeyword(instr, "SHAPE");
        return e >= 0 && WordBoundaryAfter(instr, e);
    }

    /// <summary>/^\s*FORM(TEXT|CHECKBOX|DROPDOWN)\b/i</summary>
    public static bool IsFormField(string instr)
    {
        foreach (var kw in new[] { "FORMTEXT", "FORMCHECKBOX", "FORMDROPDOWN" })
        {
            int e = MatchKeyword(instr, kw);
            if (e >= 0 && WordBoundaryAfter(instr, e)) return true;
        }
        return false;
    }

    private static bool IsLineTerminator(char c) => c == '\n' || c == '\r' || c == '\u2028' || c == '\u2029';

    /// <summary>/^\s*HYPERLINK\s+(.*)$/i → grupo 1 ou null.</summary>
    public static string? HyperlinkArgs(string instr)
    {
        int e = MatchKeyword(instr, "HYPERLINK");
        if (e < 0 || e >= instr.Length || !Xml.IsJsSpace(instr[e])) return null;
        int i = e;
        while (i < instr.Length && Xml.IsJsSpace(instr[i])) i++;
        string rest = instr[i..];
        foreach (char c in rest) if (IsLineTerminator(c)) return null;
        return rest;
    }

    private static readonly Regex FieldArg = new(
        "\"((?:[^\"\\\\]|\\\\[^\\n\\r\\u2028\\u2029])*)\"|(" + Xml.JsNotS + "+)", RegexOptions.CultureInvariant);

    private static readonly Regex Unescape = new("\\\\([^\\n\\r\\u2028\\u2029])", RegexOptions.CultureInvariant);

    /// <summary>Argumentos de um código de campo: "entre aspas" ou palavras; \\x são chaves.</summary>
    public static List<string> ParseFieldArgs(string s)
    {
        var out_ = new List<string>();
        foreach (Match m in FieldArg.Matches(s))
            out_.Add(m.Groups[1].Success ? Unescape.Replace(m.Groups[1].Value, "$1") : m.Groups[2].Value);
        return out_;
    }
}

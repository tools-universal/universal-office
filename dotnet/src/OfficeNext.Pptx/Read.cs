using OfficeNext.Core;
using static OfficeNext.Core.MiniXml;

namespace OfficeNext.Pptx;

/// <summary>Leitura de presentation/slide/shapes — porta de slides-core/src/read.ts
/// (inclui grupos ACHATADOS, cascata de estilos de texto, timing e transição).</summary>
public static class PptxReader
{
    /// <summary>Lê um .rels → Map&lt;rId, target&gt;. External mantém a URL crua.</summary>
    public static Dictionary<string, string> ReadRels(PptxPackage pkg, string relsPart, string ownerPart)
    {
        var map = new Dictionary<string, string>(StringComparer.Ordinal);
        string? xml = pkg.GetPartText(relsPart);
        if (xml is null) return map;
        var root = Parse(xml);
        foreach (var rel in ChildElements(root, "Relationship"))
        {
            string? id = rel.Attr("Id");
            string? target = rel.Attr("Target");
            string? mode = rel.Attr("TargetMode");
            if (id is null || target is null) continue;
            map[id] = mode == "External" ? target : pkg.ResolveRelTarget(ownerPart, target);
        }
        return map;
    }

    private static string RelsPathFor(string part)
    {
        int slash = part.LastIndexOf('/');
        return $"{part[..slash]}/_rels/{part[(slash + 1)..]}.rels";
    }

    /// <summary>Lê ppt/presentation.xml → Presentation.</summary>
    public static Presentation ReadPresentation(PptxPackage pkg)
    {
        var root = Parse(pkg.PresentationXml());
        var rels = ReadRels(pkg, "ppt/_rels/presentation.xml.rels", "ppt/presentation.xml");

        var sz = FirstChild(root, "p:sldSz");
        long slideW = sz?.Attr("cx") is string cx ? JsNumber.ParseIntOr(cx, 0) : 9144000;
        long slideH = sz?.Attr("cy") is string cy ? JsNumber.ParseIntOr(cy, 0) : 5143500;

        var slides = new List<SlideRef>();
        var lst = FirstChild(root, "p:sldIdLst");
        if (lst is not null)
        {
            foreach (var s in ChildElements(lst, "p:sldId"))
            {
                string rId = s.Attr("r:id") ?? "";
                slides.Add(new SlideRef
                {
                    Id = s.Attr("id") ?? "",
                    RId = rId,
                    Target = rels.TryGetValue(rId, out var t) ? t : null,
                });
            }
        }
        var pres = new Presentation { SlideW = slideW, SlideH = slideH, Slides = slides };
        if (!string.IsNullOrEmpty(sz?.Attr("type"))) pres.SizeType = sz!.Attr("type");
        return pres;
    }

    /// <summary>Resolve o tema referenciado por uma parte (slide → layout → master → theme).</summary>
    private static Theme ThemeFor(PptxPackage pkg, string part)
    {
        string? masterPath = FindRelTarget(pkg, part, "slideMaster")
            ?? FindRelTarget(pkg, FindRelTarget(pkg, part, "slideLayout") ?? "", "slideMaster");
        string? themePath = masterPath is not null
            ? FindRelTarget(pkg, masterPath, "theme")
            : FindRelTarget(pkg, "ppt/presentation.xml", "theme");
        return PptxTheme.ReadTheme(pkg, themePath ?? "ppt/theme/theme1.xml");
    }

    private static string? FindRelTarget(PptxPackage pkg, string part, string typeSuffix)
    {
        if (string.IsNullOrEmpty(part)) return null;
        string? xml = pkg.GetPartText(RelsPathFor(part));
        if (xml is null) return null;
        var root = Parse(xml);
        foreach (var rel in ChildElements(root, "Relationship"))
        {
            if ((rel.Attr("Type") ?? "").EndsWith("/" + typeSuffix, StringComparison.Ordinal))
                return pkg.ResolveRelTarget(part, rel.Attr("Target") ?? "");
        }
        return null;
    }

    /// <summary>Lê um slide → Slide, herdando geometria de placeholder do layout/master
    /// e aplicando a cascata de estilos de texto.</summary>
    public static Slide ReadSlide(PptxPackage pkg, string slidePath)
    {
        string? xml = pkg.GetPartText(slidePath)
            ?? throw new InvalidDataException($"Pacote sem {slidePath}");
        var root = Parse(xml);
        var theme = ThemeFor(pkg, slidePath);
        var slideRels = ReadRels(pkg, RelsPathFor(slidePath), slidePath);

        var cSld = FirstChild(root, "p:cSld");
        var spTree = cSld is not null ? FirstChild(cSld, "p:spTree") : null;
        var shapes = spTree is not null
            ? ReadShapes(spTree, theme, pkg, slideRels)
            : new List<Shape>();

        // herda xfrm de placeholders sem geometria própria
        var phMap = PlaceholderXfrmMap(pkg, slidePath, theme);
        foreach (var sh in shapes)
        {
            if (sh.Xfrm is null && sh.PhType is not null)
            {
                Xfrm? x = null;
                if (phMap.TryGetValue(PhKey(sh.PhType, sh.PhIdx), out var a)) x = a;
                else if (phMap.TryGetValue(PhKey(sh.PhType, null), out var b)) x = b;
                else if (phMap.TryGetValue("idx:" + (sh.PhIdx ?? ""), out var c)) x = c;
                if (x is not null) sh.Xfrm = x;
            }
        }

        // cascata de estilos de texto (spec 03 A/B)
        var styleCtx = BuildTextStyleContext(pkg, slidePath, theme);
        foreach (var sh in shapes)
        {
            if (sh.TxBody is null) continue;
            var keys = (sh.PhType is not null || sh.PhIdx is not null)
                ? new List<string> { PhKey(sh.PhType, sh.PhIdx), PhKey(sh.PhType, null), "idx:" + (sh.PhIdx ?? "") }
                : new List<string>();
            TextStyle.ApplyShapeTextCascade(sh, styleCtx, theme, keys);
        }

        var slide = new Slide { Shapes = shapes };
        var bgEl = cSld is not null ? FirstChild(cSld, "p:bg") : null;
        if (bgEl is not null)
        {
            var bgPr = FirstChild(bgEl, "p:bgPr");
            if (bgPr is not null)
            {
                var c = PptxTheme.SolidFillColor(bgPr, theme);
                if (c is not null) slide.Bg = new Fill { Type = "solid", Color = c };
                var blip = Descend(bgPr, "a:blip");
                if (blip is not null)
                {
                    var img = ResolveBlip(blip, pkg, slideRels);
                    if (img is not null) slide.BgImage = img;
                }
            }
        }
        var timing = FirstChild(root, "p:timing");
        if (timing is not null)
        {
            var anims = ParseTiming(timing);
            if (anims.Count > 0) slide.Animations = anims;
        }
        var transEl = FirstChild(root, "p:transition");
        if (transEl is not null) slide.Transition = ParseTransition(transEl);
        return slide;
    }

    private static SlideTransition ParseTransition(XmlElement el)
    {
        string spd = el.Attr("spd") ?? "med";
        int durMs = spd == "fast" ? 300 : spd == "slow" ? 1000 : 500;
        foreach (var c in ChildElements(el))
        {
            switch (c.Name)
            {
                case "p:fade": return new SlideTransition { Type = "fade", DurMs = durMs };
                case "p:push": return new SlideTransition { Type = "push", DurMs = durMs, Dir = c.Attr("dir") };
                case "p:cover": return new SlideTransition { Type = "cover", DurMs = durMs, Dir = c.Attr("dir") };
                case "p:wipe": return new SlideTransition { Type = "wipe", DurMs = durMs, Dir = c.Attr("dir") };
                case "p:dissolve": return new SlideTransition { Type = "dissolve", DurMs = durMs };
                case "p:blinds": return new SlideTransition { Type = "blinds", DurMs = durMs, Dir = c.Attr("dir") };
                case "p:split": return new SlideTransition { Type = "split", DurMs = durMs, Dir = c.Attr("dir") };
                case "p:circle": return new SlideTransition { Type = "circle", DurMs = durMs };
            }
        }
        return new SlideTransition { Type = "fade", DurMs = durMs };
    }

    private static List<SlideAnimEntry> ParseTiming(XmlElement timing)
    {
        var outp = new List<SlideAnimEntry>();
        var mainSeq = DeepFindAttr(timing, "p:cTn", "nodeType", "mainSeq");
        if (mainSeq is null) return outp;
        var childList = FirstChild(mainSeq, "p:childTnLst");
        if (childList is null) return outp;
        int acc = 0;
        foreach (var par in ChildElements(childList, "p:par"))
        {
            var cTn = FirstChild(par, "p:cTn");
            if (cTn is null) continue;
            acc += ReadCondDelay(cTn);
            var inner = FirstChild(cTn, "p:childTnLst");
            if (inner is null) continue;
            foreach (var ipar in ChildElements(inner, "p:par"))
            {
                var icTn = FirstChild(ipar, "p:cTn");
                if (icTn is null) continue;
                if (icTn.Attr("presetClass") != "entr") continue;
                int localDelay = ReadCondDelay(icTn);
                bool clickGated = icTn.Attr("nodeType") == "clickEffect";
                var grandKids = FirstChild(icTn, "p:childTnLst");
                if (grandKids is null) continue;
                string type = "appear";
                int durMs = 500;
                string? spid = null;
                foreach (var k in ChildElements(grandKids))
                {
                    if (k.Name == "p:animEffect")
                    {
                        if ((k.Attr("filter") ?? "").Contains("fade", StringComparison.Ordinal)) type = "fade";
                        var cBhvr = FirstChild(k, "p:cBhvr");
                        var innerCTn = cBhvr is not null ? FirstChild(cBhvr, "p:cTn") : null;
                        if (!string.IsNullOrEmpty(innerCTn?.Attr("dur")))
                            durMs = JsNumber.ParseIntOr(innerCTn!.Attr("dur"), 500);
                        var tgt = cBhvr is not null ? FirstChild(cBhvr, "p:tgtEl") : null;
                        var spTgt = tgt is not null ? FirstChild(tgt, "p:spTgt") : null;
                        if (!string.IsNullOrEmpty(spTgt?.Attr("spid"))) spid = spTgt!.Attr("spid");
                    }
                    else if (k.Name == "p:set" && spid is null)
                    {
                        var cBhvr = FirstChild(k, "p:cBhvr");
                        var tgt = cBhvr is not null ? FirstChild(cBhvr, "p:tgtEl") : null;
                        var spTgt = tgt is not null ? FirstChild(tgt, "p:spTgt") : null;
                        if (!string.IsNullOrEmpty(spTgt?.Attr("spid"))) spid = spTgt!.Attr("spid");
                    }
                }
                if (spid is null) continue;
                outp.Add(new SlideAnimEntry
                {
                    Spid = spid, DelayMs = acc + localDelay, DurMs = durMs,
                    Type = type, ClickGated = clickGated,
                });
            }
        }
        return outp;
    }

    private static int ReadCondDelay(XmlElement cTn)
    {
        var st = FirstChild(cTn, "p:stCondLst");
        if (st is null) return 0;
        var cond = FirstChild(st, "p:cond");
        if (cond is null) return 0;
        string? d = cond.Attr("delay");
        if (string.IsNullOrEmpty(d) || d == "indefinite") return 0;
        return JsNumber.ParseIntOr(d, 0);
    }

    private static XmlElement? DeepFindAttr(XmlElement el, string name, string attr, string val)
    {
        foreach (var c in el.Children)
        {
            if (c is not XmlElement e) continue;
            if (e.Name == name && e.Attr(attr) == val) return e;
            var f = DeepFindAttr(e, name, attr, val);
            if (f is not null) return f;
        }
        return null;
    }

    private static string PhKey(string? type, string? idx)
    {
        string t = type == "ctrTitle" ? "title" : (type ?? "body");
        return idx is not null ? $"{t}#{idx}" : t;
    }

    /// <summary>Coleta xfrm dos placeholders do layout (e do master como fallback).</summary>
    private static Dictionary<string, Xfrm> PlaceholderXfrmMap(PptxPackage pkg, string slidePath, Theme theme)
    {
        var map = new Dictionary<string, Xfrm>(StringComparer.Ordinal);
        string? layoutPath = FindRelTarget(pkg, slidePath, "slideLayout");
        string? masterPath = layoutPath is not null ? FindRelTarget(pkg, layoutPath, "slideMaster") : null;
        foreach (var part in new[] { masterPath, layoutPath })
        {
            if (part is null) continue;
            string? xml = pkg.GetPartText(part);
            if (xml is null) continue;
            var tree = Descend(Parse(xml), "p:spTree");
            if (tree is null) continue;
            foreach (var sh in ReadShapes(tree, theme, pkg, new Dictionary<string, string>(StringComparer.Ordinal)))
            {
                if (sh.PhType is null && sh.PhIdx is null) continue;
                if (sh.Xfrm is null) continue;
                map[PhKey(sh.PhType, sh.PhIdx)] = sh.Xfrm;
                map[PhKey(sh.PhType, null)] = sh.Xfrm;
                if (sh.PhIdx is not null) map["idx:" + sh.PhIdx] = sh.Xfrm;
            }
        }
        return map;
    }

    /// <summary>Monta o contexto da cascata de estilos de texto para um slide.</summary>
    private static TextStyle.TextStyleContext BuildTextStyleContext(PptxPackage pkg, string slidePath, Theme theme)
    {
        var ctx = new TextStyle.TextStyleContext();
        string? presXml = pkg.GetPartText("ppt/presentation.xml");
        if (presXml is not null)
        {
            var dts = FirstChild(Parse(presXml), "p:defaultTextStyle");
            if (dts is not null) ctx.DefaultStyle = TextStyle.ParseTxStyleLevels(dts, theme);
        }
        string? layoutPath = FindRelTarget(pkg, slidePath, "slideLayout");
        string? masterPath = layoutPath is not null ? FindRelTarget(pkg, layoutPath, "slideMaster") : null;
        if (masterPath is not null)
        {
            string? xml = pkg.GetPartText(masterPath);
            if (xml is not null)
            {
                var root = Parse(xml);
                var tx = FirstChild(root, "p:txStyles");
                if (tx is not null)
                {
                    ctx.TitleStyle = TextStyle.ParseTxStyleLevels(FirstChild(tx, "p:titleStyle"), theme);
                    ctx.BodyStyle = TextStyle.ParseTxStyleLevels(FirstChild(tx, "p:bodyStyle"), theme);
                    ctx.OtherStyle = TextStyle.ParseTxStyleLevels(FirstChild(tx, "p:otherStyle"), theme);
                }
                CollectPhStyles(root, theme, pkg, ctx.MasterPh);
            }
        }
        if (layoutPath is not null)
        {
            string? xml = pkg.GetPartText(layoutPath);
            if (xml is not null) CollectPhStyles(Parse(xml), theme, pkg, ctx.LayoutPh);
        }
        return ctx;
    }

    private static void CollectPhStyles(XmlElement root, Theme theme, PptxPackage pkg, Dictionary<string, List<TextStyleLevel>> map)
    {
        var tree = Descend(root, "p:spTree");
        if (tree is null) return;
        foreach (var sh in ReadShapes(tree, theme, pkg, new Dictionary<string, string>(StringComparer.Ordinal)))
        {
            if (sh.PhType is null && sh.PhIdx is null) continue;
            var ls = sh.TxBody?.LstStyle;
            if (ls is null) continue;
            map[PhKey(sh.PhType, sh.PhIdx)] = ls;
            if (!map.ContainsKey(PhKey(sh.PhType, null))) map[PhKey(sh.PhType, null)] = ls;
            if (sh.PhIdx is not null && !map.ContainsKey("idx:" + sh.PhIdx)) map["idx:" + sh.PhIdx] = ls;
        }
    }

    /// <summary>Anda o &lt;p:spTree&gt; em ORDEM DE DOCUMENTO (z-order).</summary>
    private static List<Shape> ReadShapes(XmlElement spTree, Theme theme, PptxPackage pkg, Dictionary<string, string> rels)
    {
        var outp = new List<Shape>();
        foreach (var c in ChildElements(spTree))
        {
            if (c.Name is "p:sp" or "p:cxnSp") outp.Add(ReadShape(c, theme, pkg, rels));
            else if (c.Name == "p:pic") outp.Add(ReadPic(c, theme, pkg, rels));
            else if (c.Name == "p:graphicFrame")
            {
                var gf = ReadGraphicFrame(c, pkg, rels);
                if (gf is not null) outp.Add(gf);
            }
            else if (c.Name == "p:grpSp") outp.AddRange(ReadGroup(c, theme, pkg, rels));
        }
        return outp;
    }

    /// <summary>Lê &lt;p:grpSp&gt; ACHATANDO as coordenadas dos filhos (spec 03, item E).</summary>
    private static List<Shape> ReadGroup(XmlElement grp, Theme theme, PptxPackage pkg, Dictionary<string, string> rels)
    {
        var children = ReadShapes(grp, theme, pkg, rels);
        var grpSpPr = FirstChild(grp, "p:grpSpPr");
        var xfrmEl = grpSpPr is not null ? FirstChild(grpSpPr, "a:xfrm") : null;
        if (xfrmEl is null) return children;
        static double Num(XmlElement? el, string a, double dflt) =>
            el?.Attr(a) is string v ? JsNumber.ParseIntOr(v, 0) : dflt;
        var off = FirstChild(xfrmEl, "a:off");
        var ext = FirstChild(xfrmEl, "a:ext");
        var chOff = FirstChild(xfrmEl, "a:chOff");
        var chExt = FirstChild(xfrmEl, "a:chExt");
        double gx = Num(off, "x", 0), gy = Num(off, "y", 0);
        double gcx = Num(ext, "cx", 0), gcy = Num(ext, "cy", 0);
        double cox = Num(chOff, "x", gx), coy = Num(chOff, "y", gy);
        double cex = Num(chExt, "cx", gcx), cey = Num(chExt, "cy", gcy);
        double sx = cex != 0 ? gcx / cex : 1;
        double sy = cey != 0 ? gcy / cey : 1;
        double rotRaw = !string.IsNullOrEmpty(xfrmEl.Attr("rot")) ? JsNumber.ParseIntOr(xfrmEl.Attr("rot"), 0) : 0;
        bool flipH = xfrmEl.Attr("flipH") == "1";
        bool flipV = xfrmEl.Attr("flipV") == "1";
        double gCenterX = gx + gcx / 2, gCenterY = gy + gcy / 2;

        foreach (var sh in children)
        {
            var x = sh.Xfrm;
            if (x is null) continue;
            x.X = gx + (x.X - cox) * sx;
            x.Y = gy + (x.Y - coy) * sy;
            x.Cx *= sx;
            x.Cy *= sy;
            // F·R(θ) = R(−θ)·F: espelhar o grupo nega a rotação local do filho
            if (flipH)
            {
                x.X = 2 * gCenterX - (x.X + x.Cx);
                x.FlipH = x.FlipH != true ? true : null;
                if (x.Rot is double r1 && r1 != 0) x.Rot = -r1;
            }
            if (flipV)
            {
                x.Y = 2 * gCenterY - (x.Y + x.Cy);
                x.FlipV = x.FlipV != true ? true : null;
                if (x.Rot is double r2 && r2 != 0) x.Rot = -r2;
            }
            if (rotRaw != 0)
            {
                double a = rotRaw / 60000.0 * Math.PI / 180;
                double dx = (x.X + x.Cx / 2) - gCenterX;
                double dy = (x.Y + x.Cy / 2) - gCenterY;
                double ncx = gCenterX + dx * Math.Cos(a) - dy * Math.Sin(a);
                double ncy = gCenterY + dx * Math.Sin(a) + dy * Math.Cos(a);
                x.X = ncx - x.Cx / 2;
                x.Y = ncy - x.Cy / 2;
                double acc = (x.Rot ?? 0) + rotRaw;
                x.Rot = acc != 0 ? acc : null;
            }
            if (sh.LineWidth is double lw && sx > 0 && sy > 0)
                sh.LineWidth = JsNumber.Round(lw * Math.Sqrt(sx * sy));
        }
        return children;
    }

    /// <summary>Lê &lt;p:graphicFrame&gt; — charts (XML cru) e tabelas.</summary>
    private static Shape? ReadGraphicFrame(XmlElement gf, PptxPackage pkg, Dictionary<string, string> rels)
    {
        var nvPr = FirstChild(gf, "p:nvGraphicFramePr");
        var cNvPr = nvPr is not null ? FirstChild(nvPr, "p:cNvPr") : null;
        var shape = new Shape
        {
            Id = cNvPr?.Attr("id") ?? "",
            Name = cNvPr?.Attr("name") ?? "",
        };
        var xfrm = FirstChild(gf, "p:xfrm") ?? FirstChild(gf, "a:xfrm");
        if (xfrm is not null) shape.Xfrm = ParseXfrm(xfrm);
        var graphic = FirstChild(gf, "a:graphic");
        var data = graphic is not null ? FirstChild(graphic, "a:graphicData") : null;
        if (data is null) return shape;
        var chartEl = FirstChild(data, "c:chart");
        if (chartEl is not null)
        {
            string? rid = chartEl.Attr("r:id") ?? chartEl.Attr("id");
            if (rid is not null && rels.TryGetValue(rid, out var target))
            {
                string? xml = pkg.GetPartText(target);
                if (!string.IsNullOrEmpty(xml)) shape.ChartXml = xml;
            }
        }
        var tblEl = FirstChild(data, "a:tbl");
        if (tblEl is not null) shape.Table = ReadTable(tblEl, new Theme());
        return shape;
    }

    /// <summary>Parse de &lt;a:tbl&gt; → modelo Table.</summary>
    private static Table ReadTable(XmlElement tbl, Theme theme)
    {
        var gridEl = FirstChild(tbl, "a:tblGrid");
        var colWidthsEmu = new List<long>();
        if (gridEl is not null)
        {
            foreach (var gc in ChildElements(gridEl, "a:gridCol"))
                colWidthsEmu.Add(!string.IsNullOrEmpty(gc.Attr("w")) ? JsNumber.ParseIntOr(gc.Attr("w"), 0) : 0);
        }
        var rows = new List<TableRow>();
        foreach (var tr in ChildElements(tbl, "a:tr"))
        {
            long heightEmu = !string.IsNullOrEmpty(tr.Attr("h")) ? JsNumber.ParseIntOr(tr.Attr("h"), 0) : 0;
            var cells = new List<TableCell>();
            foreach (var tc in ChildElements(tr, "a:tc"))
            {
                var cell = new TableCell();
                if (!string.IsNullOrEmpty(tc.Attr("gridSpan"))) cell.GridSpan = JsNumber.ParseIntOr(tc.Attr("gridSpan"), 0);
                if (!string.IsNullOrEmpty(tc.Attr("rowSpan"))) cell.RowSpan = JsNumber.ParseIntOr(tc.Attr("rowSpan"), 0);
                if (tc.Attr("hMerge") == "1") cell.HMerge = true;
                if (tc.Attr("vMerge") == "1") cell.VMerge = true;
                var txBody = FirstChild(tc, "a:txBody");
                if (txBody is not null) cell.TxBody = ReadTxBody(txBody, theme, null);
                var tcPr = FirstChild(tc, "a:tcPr");
                if (tcPr is not null)
                {
                    if (!string.IsNullOrEmpty(tcPr.Attr("anchor"))) cell.Anchor = tcPr.Attr("anchor");
                    var fill = PptxTheme.SolidFillColor(tcPr, theme);
                    if (fill is not null) cell.FillColor = fill;
                    long bw = 0;
                    string? bc = null;
                    foreach (var side in new[] { "a:lnL", "a:lnR", "a:lnT", "a:lnB" })
                    {
                        var ln = FirstChild(tcPr, side);
                        if (ln is null) continue;
                        long w = !string.IsNullOrEmpty(ln.Attr("w")) ? JsNumber.ParseIntOr(ln.Attr("w"), 0) : 0;
                        if (w > bw) bw = w;
                        if (bc is null)
                        {
                            var fillEl = FirstChild(ln, "a:solidFill");
                            var srgb = fillEl is not null ? FirstChild(fillEl, "a:srgbClr") : null;
                            if (!string.IsNullOrEmpty(srgb?.Attr("val"))) bc = "#" + srgb!.Attr("val");
                        }
                    }
                    if (bw != 0) cell.BorderWidth = bw;
                    if (bc is not null) cell.BorderColor = bc;
                }
                cells.Add(cell);
            }
            rows.Add(new TableRow { HeightEmu = heightEmu, Cells = cells });
        }
        return new Table { ColWidthsEmu = colWidthsEmu, Rows = rows };
    }

    private static Shape ReadShape(XmlElement sp, Theme theme, PptxPackage? pkg, Dictionary<string, string>? rels)
    {
        var nvSpPr = FirstChild(sp, "p:nvSpPr") ?? FirstChild(sp, "p:nvCxnSpPr");
        var cNvPr = nvSpPr is not null ? FirstChild(nvSpPr, "p:cNvPr") : null;
        var cNvSpPr = nvSpPr is not null ? FirstChild(nvSpPr, "p:cNvSpPr") : null;
        var nvPr = nvSpPr is not null ? FirstChild(nvSpPr, "p:nvPr") : null;
        var ph = nvPr is not null ? FirstChild(nvPr, "p:ph") : null;
        var spPr = FirstChild(sp, "p:spPr");

        var shape = new Shape
        {
            Id = cNvPr?.Attr("id") ?? "",
            Name = cNvPr?.Attr("name") ?? "",
        };
        if (cNvSpPr?.Attr("txBox") == "1") shape.IsTextBox = true;
        if (ph is not null)
        {
            if (!string.IsNullOrEmpty(ph.Attr("type"))) shape.PhType = ph.Attr("type");
            if (!string.IsNullOrEmpty(ph.Attr("idx"))) shape.PhIdx = ph.Attr("idx");
        }
        if (ph is not null && shape.PhType is null) shape.PhType = "body";

        if (spPr is not null)
        {
            var xfrm = FirstChild(spPr, "a:xfrm");
            if (xfrm is not null) shape.Xfrm = ParseXfrm(xfrm);
            var geom = FirstChild(spPr, "a:prstGeom");
            if (!string.IsNullOrEmpty(geom?.Attr("prst"))) shape.Geom = geom!.Attr("prst");
            if (FirstChild(spPr, "a:noFill") is not null) shape.Fill = new Fill { Type = "none" };
            else
            {
                var c = PptxTheme.SolidFillColor(spPr, theme);
                if (c is not null) shape.Fill = new Fill { Type = "solid", Color = c };
            }
            if (shape.Fill is null)
            {
                var grad = FirstChild(spPr, "a:gradFill");
                if (grad is not null)
                {
                    var g = ParseGradFill(grad, theme);
                    if (g is not null) shape.Fill = g;
                }
            }
            if (pkg is not null && rels is not null)
            {
                var bf = FirstChild(spPr, "a:blipFill");
                var blip = bf is not null ? FirstChild(bf, "a:blip") : null;
                if (blip is not null)
                {
                    var img = ResolveBlip(blip, pkg, rels);
                    if (img is not null) shape.FillImage = img;
                }
            }
            var sf = FirstChild(spPr, "a:solidFill");
            if (sf is not null)
            {
                var alphaEl = Descend(sf, "a:alpha");
                if (!string.IsNullOrEmpty(alphaEl?.Attr("val")))
                    shape.FillAlpha = JsNumber.ParseIntOr(alphaEl!.Attr("val"), 0) / 100000.0;
            }
            var ln = FirstChild(spPr, "a:ln");
            if (ln is not null)
            {
                var lc = PptxTheme.SolidFillColor(ln, theme);
                if (lc is not null) shape.LineColor = lc;
                if (!string.IsNullOrEmpty(ln.Attr("w"))) shape.LineWidth = JsNumber.ParseIntOr(ln.Attr("w"), 0);
                var dash = FirstChild(ln, "a:prstDash");
                if (!string.IsNullOrEmpty(dash?.Attr("val"))) shape.LineDash = dash!.Attr("val");
            }
            var eff = FirstChild(spPr, "a:effectLst");
            var shd = eff is not null ? FirstChild(eff, "a:outerShdw") : null;
            if (shd is not null)
            {
                long blurRad = !string.IsNullOrEmpty(shd.Attr("blurRad")) ? JsNumber.ParseIntOr(shd.Attr("blurRad"), 0) : 0;
                long dist = !string.IsNullOrEmpty(shd.Attr("dist")) ? JsNumber.ParseIntOr(shd.Attr("dist"), 0) : 0;
                double dirDeg = (!string.IsNullOrEmpty(shd.Attr("dir")) ? JsNumber.ParseIntOr(shd.Attr("dir"), 0) : 5400000) / 60000.0;
                var srgb = FirstChild(shd, "a:srgbClr");
                var scheme = FirstChild(shd, "a:schemeClr");
                string color = "#000000";
                double alpha = 1;
                var colorEl = srgb ?? scheme;
                if (colorEl is not null)
                {
                    if (!string.IsNullOrEmpty(srgb?.Attr("val"))) color = "#" + srgb!.Attr("val");
                    var aEl = FirstChild(colorEl, "a:alpha");
                    if (!string.IsNullOrEmpty(aEl?.Attr("val"))) alpha = JsNumber.ParseIntOr(aEl!.Attr("val"), 0) / 100000.0;
                }
                shape.ShadowFx = new Shadow { Color = color, BlurRad = blurRad, Dist = dist, DirDeg = dirDeg, Alpha = alpha };
            }
        }

        // <p:style> (spec 03 B): defaults temáticos quando spPr/run não especifica
        var styleEl = FirstChild(sp, "p:style");
        if (styleEl is not null)
        {
            string? RefColor(string name)
            {
                var refEl = FirstChild(styleEl, name);
                if (refEl is null || refEl.Attr("idx") == "0") return null;
                return PptxTheme.ColorFromDml(ChildElements(refEl).FirstOrDefault(), theme);
            }
            if (shape.Fill is null && shape.FillImage is null)
            {
                var fc = RefColor("a:fillRef");
                if (fc is not null) shape.Fill = new Fill { Type = "solid", Color = fc };
            }
            if (shape.LineColor is null)
            {
                var lc = RefColor("a:lnRef");
                if (lc is not null) shape.LineColor = lc;
            }
            var fontRef = FirstChild(styleEl, "a:fontRef");
            if (fontRef is not null)
            {
                var fc = PptxTheme.ColorFromDml(ChildElements(fontRef).FirstOrDefault(), theme);
                if (fc is not null) shape.StyleFontColor = fc;
                if (!string.IsNullOrEmpty(fontRef.Attr("idx"))) shape.StyleFontIdx = fontRef.Attr("idx");
            }
        }

        var txBody = FirstChild(sp, "p:txBody");
        if (txBody is not null) shape.TxBody = ReadTxBody(txBody, theme, rels);
        return shape;
    }

    private static Fill? ParseGradFill(XmlElement grad, Theme theme)
    {
        var gsLst = FirstChild(grad, "a:gsLst");
        if (gsLst is null) return null;
        var stops = new List<GradientStop>();
        foreach (var gs in ChildElements(gsLst, "a:gs"))
        {
            double pos = gs.Attr("pos") is string p ? JsNumber.ParseIntOr(p, 0) / 100000.0 : 0;
            var color = PptxTheme.ColorFromDml(ChildElements(gs).FirstOrDefault(), theme);
            if (color is not null)
                stops.Add(new GradientStop { Pos = Math.Max(0, Math.Min(1, pos)), Color = color });
        }
        if (stops.Count < 2) return null;
        stops.Sort((a, b) => a.Pos.CompareTo(b.Pos));
        var lin = FirstChild(grad, "a:lin");
        double angleDeg = lin?.Attr("ang") is string ang ? JsNumber.ParseIntOr(ang, 0) / 60000.0 : 0;
        return new Fill { Type = "gradient", Stops = stops, AngleDeg = angleDeg };
    }

    private static Xfrm ParseXfrm(XmlElement el)
    {
        var off = FirstChild(el, "a:off");
        var ext = FirstChild(el, "a:ext");
        var x = new Xfrm
        {
            X = off?.Attr("x") is string xa ? JsNumber.ParseIntOr(xa, 0) : 0,
            Y = off?.Attr("y") is string ya ? JsNumber.ParseIntOr(ya, 0) : 0,
            Cx = ext?.Attr("cx") is string cxa ? JsNumber.ParseIntOr(cxa, 0) : 0,
            Cy = ext?.Attr("cy") is string cya ? JsNumber.ParseIntOr(cya, 0) : 0,
        };
        if (!string.IsNullOrEmpty(el.Attr("rot"))) x.Rot = JsNumber.ParseIntOr(el.Attr("rot"), 0);
        if (el.Attr("flipH") == "1") x.FlipH = true;
        if (el.Attr("flipV") == "1") x.FlipV = true;
        return x;
    }

    private static TextBody ReadTxBody(XmlElement el, Theme theme, Dictionary<string, string>? rels)
    {
        var bodyPr = FirstChild(el, "a:bodyPr");
        var tb = new TextBody();
        if (bodyPr is not null)
        {
            if (!string.IsNullOrEmpty(bodyPr.Attr("anchor"))) tb.Anchor = bodyPr.Attr("anchor");
            if (!string.IsNullOrEmpty(bodyPr.Attr("wrap"))) tb.Wrap = bodyPr.Attr("wrap");
            if (bodyPr.Attr("lIns") is string li) tb.InsL = JsNumber.ParseIntOr(li, 0);
            if (bodyPr.Attr("tIns") is string ti) tb.InsT = JsNumber.ParseIntOr(ti, 0);
            if (bodyPr.Attr("rIns") is string ri) tb.InsR = JsNumber.ParseIntOr(ri, 0);
            if (bodyPr.Attr("bIns") is string bi) tb.InsB = JsNumber.ParseIntOr(bi, 0);
            var na = FirstChild(bodyPr, "a:normAutofit");
            if (na is not null)
            {
                if (na.Attr("fontScale") is string fs) tb.FontScale = JsNumber.ParseIntOr(fs, 0) / 100000.0;
                if (na.Attr("lnSpcReduction") is string lr) tb.LnSpcReduction = JsNumber.ParseIntOr(lr, 0) / 100000.0;
            }
        }
        var lst = FirstChild(el, "a:lstStyle");
        if (lst is not null && ChildElements(lst).Any()) tb.LstStyle = TextStyle.ParseTxStyleLevels(lst, theme);
        foreach (var p in ChildElements(el, "a:p")) tb.Paragraphs.Add(ReadParagraph(p, theme, rels));
        return tb;
    }

    private static Paragraph ReadParagraph(XmlElement p, Theme theme, Dictionary<string, string>? rels)
    {
        var para = new Paragraph();
        var pPr = FirstChild(p, "a:pPr");
        if (pPr is not null)
        {
            if (!string.IsNullOrEmpty(pPr.Attr("algn"))) para.Align = pPr.Attr("algn");
            if (!string.IsNullOrEmpty(pPr.Attr("lvl"))) para.Level = JsNumber.ParseIntOr(pPr.Attr("lvl"), 0);
            if (pPr.Attr("marL") is string marL) para.MarL = JsNumber.ParseIntOr(marL, 0);
            if (pPr.Attr("indent") is string indent) para.Indent = JsNumber.ParseIntOr(indent, 0);
            var buChar = FirstChild(pPr, "a:buChar");
            var buAuto = FirstChild(pPr, "a:buAutoNum");
            if (buChar is not null)
            {
                para.Bullet = true;
                if (!string.IsNullOrEmpty(buChar.Attr("char"))) para.BulletChar = buChar.Attr("char");
            }
            else if (buAuto is not null)
            {
                para.Bullet = true;
                para.BulletAutoNum = buAuto.Attr("type") ?? "arabicPeriod";
            }
            else if (FirstChild(pPr, "a:buNone") is not null) para.Bullet = false;
        }
        foreach (var child in ChildElements(p))
        {
            if (child.Name == "a:r") para.Runs.Add(ReadRun(child, theme, rels));
            else if (child.Name == "a:br") para.Runs.Add(new Run { Text = "\n" });
            else if (child.Name == "a:fld")
            {
                var t = FirstChild(child, "a:t");
                para.Runs.Add(new Run { Text = t is not null ? TextContent(t) : "" });
            }
        }
        return para;
    }

    private static readonly System.Text.RegularExpressions.Regex HttpRe =
        new("^https?:", System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.CultureInvariant);

    private static Run ReadRun(XmlElement r, Theme theme, Dictionary<string, string>? rels)
    {
        var t = FirstChild(r, "a:t");
        var run = new Run { Text = t is not null ? TextContent(t) : "" };
        var rPr = FirstChild(r, "a:rPr");
        if (rPr is not null)
        {
            if (!string.IsNullOrEmpty(rPr.Attr("sz"))) run.Sz = JsNumber.ParseIntOr(rPr.Attr("sz"), 0) / 100.0;
            if (rPr.Attr("b") is string b) run.Bold = b == "1";
            if (rPr.Attr("i") is string it) run.Italic = it == "1";
            if (!string.IsNullOrEmpty(rPr.Attr("u")) && rPr.Attr("u") != "none") run.Underline = true;
            var c = PptxTheme.SolidFillColor(rPr, theme);
            if (c is not null) run.Color = c;
            var latin = FirstChild(rPr, "a:latin");
            if (!string.IsNullOrEmpty(latin?.Attr("typeface"))) run.Font = latin!.Attr("typeface");
            var hlink = FirstChild(rPr, "a:hlinkClick");
            if (hlink is not null && rels is not null)
            {
                string? rid = hlink.Attr("r:id") ?? hlink.Attr("id");
                if (rid is not null && rels.TryGetValue(rid, out var direct) && HttpRe.IsMatch(direct))
                    run.Hyperlink = direct;
            }
        }
        return run;
    }

    // ─────────────────────────── <p:pic> + blipFill ───────────────────────────

    private static Shape ReadPic(XmlElement pic, Theme theme, PptxPackage pkg, Dictionary<string, string> rels)
    {
        var nvPicPr = FirstChild(pic, "p:nvPicPr");
        var cNvPr = nvPicPr is not null ? FirstChild(nvPicPr, "p:cNvPr") : null;
        var blipFill = FirstChild(pic, "p:blipFill");
        var blip = blipFill is not null ? FirstChild(blipFill, "a:blip") : null;
        var srcRect = blipFill is not null ? FirstChild(blipFill, "a:srcRect") : null;
        var spPr = FirstChild(pic, "p:spPr");

        var shape = new Shape
        {
            Id = cNvPr?.Attr("id") ?? "",
            Name = cNvPr?.Attr("name") ?? "",
        };

        if (blip is not null)
        {
            var img = ResolveBlip(blip, pkg, rels);
            if (img is not null) shape.Image = img;
            var am = FirstChild(blip, "a:alphaModFix");
            if (!string.IsNullOrEmpty(am?.Attr("amt")))
                shape.Alpha = Math.Max(0, Math.Min(1, JsNumber.ParseIntOr(am!.Attr("amt"), 0) / 100000.0));
        }
        if (srcRect is not null)
        {
            static double Num(string? a) => (a is not null ? JsNumber.ParseIntOr(a, 0) : 0) / 100000.0;
            shape.SrcRect = new SrcRect
            {
                L = Num(srcRect.Attr("l")),
                T = Num(srcRect.Attr("t")),
                R = Num(srcRect.Attr("r")),
                B = Num(srcRect.Attr("b")),
            };
        }
        if (spPr is not null)
        {
            var xfrm = FirstChild(spPr, "a:xfrm");
            if (xfrm is not null) shape.Xfrm = ParseXfrm(xfrm);
            var geom = FirstChild(spPr, "a:prstGeom");
            if (!string.IsNullOrEmpty(geom?.Attr("prst"))) shape.Geom = geom!.Attr("prst");
            var ln = FirstChild(spPr, "a:ln");
            if (ln is not null)
            {
                var lc = PptxTheme.SolidFillColor(ln, theme);
                if (lc is not null) shape.LineColor = lc;
                if (!string.IsNullOrEmpty(ln.Attr("w"))) shape.LineWidth = JsNumber.ParseIntOr(ln.Attr("w"), 0);
            }
        }
        return shape;
    }

    private static ImageRef? ResolveBlip(XmlElement blip, PptxPackage pkg, Dictionary<string, string> rels)
    {
        string? rid = blip.Attr("r:embed") ?? blip.Attr("embed");
        if (rid is null) return null;
        if (!rels.TryGetValue(rid, out var part)) return null;
        var bytes = pkg.GetPart(part);
        if (bytes is null) return null;
        return new ImageRef { Part = part, Bytes = bytes, Mime = MimeFromPart(part) };
    }

    private static string MimeFromPart(string part)
    {
        int dot = part.LastIndexOf('.');
        string ext = (dot >= 0 ? part[(dot + 1)..] : "").ToLowerInvariant();
        return ext switch
        {
            "png" => "image/png",
            "jpg" or "jpeg" => "image/jpeg",
            "gif" => "image/gif",
            "svg" => "image/svg+xml",
            "webp" => "image/webp",
            "bmp" => "image/bmp",
            _ => "application/octet-stream",
        };
    }
}

using OfficeNext.Core;
using static OfficeNext.Core.MiniXml;

namespace OfficeNext.Xlsx;

/// <summary>Leitura de workbook/sharedStrings/worksheet — porta de sheet-core/src/read.ts.</summary>
public static class XlsxReader
{
    /// <summary>Mapa de relacionamentos rId → target, lido de um arquivo .rels do pacote.</summary>
    private static Dictionary<string, string> ReadRels(OpcPackage pkg, string relsPart)
    {
        var map = new Dictionary<string, string>(StringComparer.Ordinal);
        string? xml = pkg.GetPartText(relsPart);
        if (xml is null) return map;
        var root = Parse(xml);
        foreach (var rel in ChildElements(root, "Relationship"))
        {
            string? id = rel.Attr("Id");
            string? target = rel.Attr("Target");
            if (id is not null && target is not null) map[id] = target;
        }
        return map;
    }

    private static string RelsPathFor(string part)
    {
        int slash = part.LastIndexOf('/');
        string dir = part[..slash];
        string file = part[(slash + 1)..];
        return $"{dir}/_rels/{file}.rels";
    }

    /// <summary>Lê xl/workbook.xml → Workbook (resolve targets das planilhas via rels).</summary>
    public static Workbook ReadWorkbook(XlsxPackage pkg)
    {
        var root = Parse(pkg.WorkbookXml());
        var sheetsEl = FirstChild(root, "sheets");
        var sheets = new List<SheetRef>();
        var rels = ReadRels(pkg, "xl/_rels/workbook.xml.rels");
        if (sheetsEl is not null)
        {
            foreach (var s in ChildElements(sheetsEl, "sheet"))
            {
                string? rId = s.Attr("r:id");
                string? target = rId is not null && rels.TryGetValue(rId, out var t) ? t : null;
                sheets.Add(new SheetRef
                {
                    Name = s.Attr("name") ?? "",
                    SheetId = s.Attr("sheetId") ?? "",
                    RId = rId ?? "",
                    State = s.Attr("state"),
                    Target = target is not null ? pkg.ResolveRelTarget("xl/workbook.xml", target) : null,
                });
            }
        }
        var wb = new Workbook { Sheets = sheets };
        var bookViews = FirstChild(root, "bookViews");
        var wbView = bookViews is not null ? FirstChild(bookViews, "workbookView") : null;
        string? activeTabStr = wbView?.Attr("activeTab") ?? root.Attr("activeTab");
        if (activeTabStr is not null) wb.ActiveTab = JsNumber.ParseIntOr(activeTabStr, 0);
        var wbPr = FirstChild(root, "workbookPr");
        if (wbPr?.Attr("date1904") is "1" or "true") wb.Date1904 = true;
        return wb;
    }

    /// <summary>Lê xl/sharedStrings.xml → SharedString[] (ausente → []).</summary>
    public static List<SharedString> ReadSharedStrings(XlsxPackage pkg, ColorContext? cx = null)
    {
        string? xml = pkg.GetPartText("xl/sharedStrings.xml");
        if (xml is null) return new List<SharedString>();
        var ctx = cx ?? ThemeReader.BuildColorContext(pkg);
        var root = Parse(xml);
        var outp = new List<SharedString>();
        foreach (var si in ChildElements(root, "si")) outp.Add(ReadSharedStringEntry(si, ctx));
        return outp;
    }

    /// <summary>Parseia o &lt;rPr&gt; de um run rico → RichRunProps (booleans explícitos).</summary>
    private static RichRunProps? ReadRunProps(XmlElement rPr, ColorContext? cx)
    {
        var props = new RichRunProps();
        bool? BoolEl(string name)
        {
            var e = FirstChild(rPr, name);
            if (e is null) return null;
            string? v = e.Attr("val");
            return v != "0" && v != "false" && v != "none";
        }
        props.Bold = BoolEl("b");
        props.Italic = BoolEl("i");
        props.Underline = BoolEl("u");
        props.Strike = BoolEl("strike");
        var sz = FirstChild(rPr, "sz");
        if (sz?.Attr("val") is string szVal) props.Size = JsNumber.ParseFloat(szVal);
        var colEl = FirstChild(rPr, "color");
        if (colEl is not null) props.Color = ThemeReader.ResolveColorEl(colEl, cx);
        var rFont = FirstChild(rPr, "rFont");
        if (rFont?.Attr("val") is string fv) props.Font = fv;
        return props.Any ? props : null;
    }

    private static SharedString ReadSharedStringEntry(XmlElement el, ColorContext? cx)
    {
        var runsEls = ChildElements(el, "r").ToList();
        if (runsEls.Count > 0)
        {
            var runs = new List<RichRun>();
            foreach (var r in runsEls)
            {
                var t = FirstChild(r, "t");
                var rPr = FirstChild(r, "rPr");
                var run = new RichRun { Text = t is not null ? TextContent(t) : "" };
                if (rPr is not null && rPr.Attrs.Count > 0)
                    run.RPr = new Dictionary<string, string>(rPr.Attrs, StringComparer.Ordinal);
                if (rPr is not null)
                {
                    var props = ReadRunProps(rPr, cx);
                    if (props is not null) run.Props = props;
                }
                runs.Add(run);
            }
            return new SharedString { Text = string.Concat(runs.Select(r => r.Text)), Runs = runs };
        }
        var tEl = FirstChild(el, "t");
        return new SharedString { Text = tEl is not null ? TextContent(tEl) : "" };
    }

    /// <summary>Lê uma planilha (path) → Worksheet.</summary>
    public static Worksheet ReadWorksheet(XlsxPackage pkg, string sheetPath, ColorContext? cx = null)
    {
        string? xml = pkg.GetPartText(sheetPath)
            ?? throw new InvalidDataException($"Pacote sem {sheetPath}");
        var ctx = cx ?? ThemeReader.BuildColorContext(pkg);
        var root = Parse(xml);
        string relsPath = RelsPathFor(sheetPath);
        var sheetRels = ReadRels(pkg, relsPath);

        var rows = new List<Row>();
        var sheetData = FirstChild(root, "sheetData");
        if (sheetData is not null)
            foreach (var rowEl in ChildElements(sheetData, "row"))
                rows.Add(ReadRow(rowEl, ctx));

        var merges = new List<string>();
        var mergeCells = FirstChild(root, "mergeCells");
        if (mergeCells is not null)
            foreach (var mc in ChildElements(mergeCells, "mergeCell"))
                if (mc.Attr("ref") is string mref) merges.Add(mref);

        var cols = new List<ColDef>();
        var colsEl = FirstChild(root, "cols");
        if (colsEl is not null)
        {
            foreach (var c in ChildElements(colsEl, "col"))
            {
                var def = new ColDef
                {
                    Min = JsNumber.ParseIntOr(c.Attr("min") ?? "1", 1),
                    Max = JsNumber.ParseIntOr(c.Attr("max") ?? "1", 1),
                };
                if (c.Attr("width") is string w) def.Width = JsNumber.ParseFloat(w);
                if (c.Attr("customWidth") == "1") def.CustomWidth = true;
                if (c.Attr("hidden") == "1") def.Hidden = true;
                if (c.Attr("style") is string st) def.Style = JsNumber.ParseIntOr(st, 0);
                cols.Add(def);
            }
        }

        SheetFormatPr? sheetFormatPr = null;
        var sfp = FirstChild(root, "sheetFormatPr");
        if (sfp is not null)
        {
            var v = new SheetFormatPr();
            bool any = false;
            if (sfp.Attr("defaultColWidth") is string dcw) { v.DefaultColWidth = JsNumber.ParseFloat(dcw); any = true; }
            if (sfp.Attr("baseColWidth") is string bcw) { v.BaseColWidth = JsNumber.ParseFloat(bcw); any = true; }
            if (sfp.Attr("defaultRowHeight") is string drh) { v.DefaultRowHeight = JsNumber.ParseFloat(drh); any = true; }
            if (sfp.Attr("customHeight") is "1" or "true") { v.CustomHeight = true; any = true; }
            if (any) sheetFormatPr = v;
        }

        var hyperlinks = new List<Hyperlink>();
        var hlinksEl = FirstChild(root, "hyperlinks");
        if (hlinksEl is not null)
        {
            foreach (var hl in ChildElements(hlinksEl, "hyperlink"))
            {
                string? href = hl.Attr("ref");
                if (href is null) continue;
                var link = new Hyperlink { Ref = href };
                string? rid = hl.Attr("r:id") ?? hl.Attr("id");
                if (rid is not null && sheetRels.TryGetValue(rid, out var target)) link.Target = target;
                if (hl.Attr("location") is string lo) link.Location = lo;
                if (hl.Attr("display") is string di) link.Display = di;
                if (hl.Attr("tooltip") is string tt) link.Tooltip = tt;
                hyperlinks.Add(link);
            }
        }

        PaneInfo? pane = null;
        var sheetViews = FirstChild(root, "sheetViews");
        var sheetView = FirstChild(sheetViews ?? root, "sheetView");
        bool showGridLinesOff = sheetView?.Attr("showGridLines") == "0";
        var paneEl = sheetView is not null ? FirstChild(sheetView, "pane") : null;
        if (paneEl is not null)
        {
            pane = new PaneInfo
            {
                XSplit = JsNumber.ParseIntOr(paneEl.Attr("xSplit") ?? "0", 0),
                YSplit = JsNumber.ParseIntOr(paneEl.Attr("ySplit") ?? "0", 0),
                TopLeftCell = paneEl.Attr("topLeftCell"),
                State = paneEl.Attr("state") ?? "split",
            };
        }

        var condFormats = new List<CondFormat>();
        foreach (var cfEl in ChildElements(root, "conditionalFormatting"))
        {
            string sqref = cfEl.Attr("sqref") ?? "";
            var rules = new List<CondRule>();
            foreach (var ruleEl in ChildElements(cfEl, "cfRule"))
            {
                string type = ruleEl.Attr("type") ?? "";
                int priority = JsNumber.ParseIntOr(ruleEl.Attr("priority") ?? "0", 0);
                if (type == "colorScale")
                {
                    var cs = FirstChild(ruleEl, "colorScale");
                    var stops = new List<ColorStop>();
                    if (cs is not null)
                        foreach (var cfvo in ChildElements(cs, "cfvo"))
                            stops.Add(new ColorStop
                            {
                                Type = cfvo.Attr("type") ?? "min",
                                Value = cfvo.Attr("val") is string vv ? JsNumber.ParseFloat(vv) : null,
                                Color = "#808080",
                            });
                    int i = 0;
                    if (cs is not null)
                    {
                        foreach (var colEl in ChildElements(cs, "color"))
                        {
                            string c2 = ThemeReader.ResolveColorEl(colEl, ctx) ?? "#000000";
                            if (i < stops.Count) stops[i].Color = c2;
                            i++;
                        }
                    }
                    rules.Add(new CondRule { Type = type, Priority = priority, Stops = stops });
                }
                else if (type == "dataBar")
                {
                    var db = FirstChild(ruleEl, "dataBar");
                    var colorEl = db is not null ? FirstChild(db, "color") : null;
                    rules.Add(new CondRule
                    {
                        Type = type,
                        Priority = priority,
                        BarColor = (colorEl is not null ? ThemeReader.ResolveColorEl(colorEl, ctx) : null) ?? "#638EC6",
                    });
                }
                else if (type is "cellIs" or "expression")
                {
                    int? dxfId = ruleEl.Attr("dxfId") is string dx ? JsNumber.ParseIntOr(dx, 0) : null;
                    var formula = ChildElements(ruleEl, "formula").Select(TextContent).ToList();
                    rules.Add(new CondRule
                    {
                        Type = type, Priority = priority,
                        Operator = ruleEl.Attr("operator"), Formula = formula, DxfId = dxfId,
                    });
                }
            }
            if (rules.Count > 0) condFormats.Add(new CondFormat { Sqref = sqref, Rules = rules });
        }

        string? commentsTarget = FindRelByType(pkg, relsPath, "/comments");
        var comments = commentsTarget is not null
            ? ReadComments(pkg, pkg.ResolveRelTarget(sheetPath, commentsTarget))
            : new List<Comment>();
        string? drawingTarget = FindRelByType(pkg, relsPath, "/drawing");
        var charts = drawingTarget is not null
            ? ReadDrawingCharts(pkg, pkg.ResolveRelTarget(sheetPath, drawingTarget))
            : new List<DrawingChart>();

        var ws = new Worksheet { Rows = rows };
        if (merges.Count > 0)
        {
            ws.Merges = merges;
            ws.MergedAreas = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (var m in merges)
            {
                string tl = m.Split(':')[0];
                ws.MergedAreas[tl.Length > 0 ? tl : m] = m;
            }
        }
        if (cols.Count > 0) ws.Cols = cols;
        if (pane is not null) ws.Pane = pane;
        if (showGridLinesOff) ws.ShowGridLines = false;
        if (condFormats.Count > 0) ws.CondFormats = condFormats;
        if (comments.Count > 0) ws.Comments = comments;
        if (charts.Count > 0) ws.Charts = charts;
        if (hyperlinks.Count > 0) ws.Hyperlinks = hyperlinks;
        if (sheetFormatPr is not null) ws.SheetFormatPr = sheetFormatPr;
        return ws;
    }

    /// <summary>Lê xl/drawings/drawingN.xml + _rels → charts ancorados (twoCellAnchor).</summary>
    private static List<DrawingChart> ReadDrawingCharts(XlsxPackage pkg, string drawingPath)
    {
        var outp = new List<DrawingChart>();
        string? xml = pkg.GetPartText(drawingPath);
        if (xml is null) return outp;
        var root = Parse(xml);
        string drelsPath = RelsPathFor(drawingPath);
        var drelsMap = new Dictionary<string, string>(StringComparer.Ordinal);
        string? drelsXml = pkg.GetPartText(drelsPath);
        if (drelsXml is not null)
        {
            var drelsRoot = Parse(drelsXml);
            foreach (var rel in ChildElements(drelsRoot, "Relationship"))
            {
                string? id = rel.Attr("Id");
                string? target = rel.Attr("Target");
                if (!string.IsNullOrEmpty(id) && !string.IsNullOrEmpty(target))
                    drelsMap[id!] = pkg.ResolveRelTarget(drawingPath, target!);
            }
        }
        static int ParseInt0(string? s) => s is null || s.Length == 0 ? 0 : JsNumber.ParseIntOr(s, 0);
        static int ChildInt(XmlElement parent, string name)
        {
            var el = FirstChild(parent, name);
            return el is null ? 0 : ParseInt0(TextContent(el));
        }

        foreach (var anchor in ChildElements(root, "xdr:twoCellAnchor"))
        {
            var from = FirstChild(anchor, "xdr:from");
            var to = FirstChild(anchor, "xdr:to");
            if (from is null || to is null) continue;
            var gframe = FirstChild(anchor, "xdr:graphicFrame");
            if (gframe is null) continue;
            var graphic = FirstChild(gframe, "a:graphic");
            var data = graphic is not null ? FirstChild(graphic, "a:graphicData") : null;
            if (data is null) continue;
            var chartEl = FirstChild(data, "c:chart");
            if (chartEl is null) continue;
            string? rid = chartEl.Attr("r:id") ?? chartEl.Attr("id");
            if (string.IsNullOrEmpty(rid)) continue;
            if (!drelsMap.TryGetValue(rid!, out var chartPath)) continue;
            string? chartXml = pkg.GetPartText(chartPath);
            if (string.IsNullOrEmpty(chartXml)) continue;
            outp.Add(new DrawingChart
            {
                Anchor = new DrawingAnchor
                {
                    From = new DrawingAnchorPoint
                    {
                        Col = ChildInt(from, "xdr:col"), Row = ChildInt(from, "xdr:row"),
                        ColOff = ChildInt(from, "xdr:colOff"), RowOff = ChildInt(from, "xdr:rowOff"),
                    },
                    To = new DrawingAnchorPoint
                    {
                        Col = ChildInt(to, "xdr:col"), Row = ChildInt(to, "xdr:row"),
                        ColOff = ChildInt(to, "xdr:colOff"), RowOff = ChildInt(to, "xdr:rowOff"),
                    },
                },
                ChartXml = chartXml!,
            });
        }
        return outp;
    }

    /// <summary>Procura no .rels o primeiro relacionamento cujo Type termina em typeSuffix.</summary>
    private static string? FindRelByType(OpcPackage pkg, string relsPart, string typeSuffix)
    {
        string? xml = pkg.GetPartText(relsPart);
        if (xml is null) return null;
        var root = Parse(xml);
        foreach (var rel in ChildElements(root, "Relationship"))
        {
            string t = rel.Attr("Type") ?? "";
            if (t.EndsWith(typeSuffix, StringComparison.Ordinal)) return rel.Attr("Target");
        }
        return null;
    }

    /// <summary>Lê xl/commentsN.xml → Comment[] (refs + texto plano + autor resolvido).</summary>
    private static List<Comment> ReadComments(XlsxPackage pkg, string path)
    {
        string? xml = pkg.GetPartText(path);
        if (xml is null) return new List<Comment>();
        var root = Parse(xml);
        var authors = new List<string>();
        var authorsEl = FirstChild(root, "authors");
        if (authorsEl is not null)
            foreach (var a in ChildElements(authorsEl, "author")) authors.Add(TextContent(a));
        var list = FirstChild(root, "commentList");
        var outp = new List<Comment>();
        if (list is null) return outp;
        foreach (var cmt in ChildElements(list, "comment"))
        {
            string? cref = cmt.Attr("ref");
            if (string.IsNullOrEmpty(cref)) continue;
            var text = FirstChild(cmt, "text");
            string plain = text is not null ? TextContent(text) : "";
            int ai = cmt.Attr("authorId") is string aid ? JsNumber.ParseIntOr(aid, -1) : -1;
            var c = new Comment { Ref = cref!, Text = plain };
            if (ai >= 0 && ai < authors.Count) c.Author = authors[ai];
            outp.Add(c);
        }
        return outp;
    }

    private static Row ReadRow(XmlElement el, ColorContext? cx)
    {
        var row = new Row { R = JsNumber.ParseIntOr(el.Attr("r") ?? "0", 0) };
        if (el.Attr("spans") is string sp) row.Spans = sp;
        if (el.Attr("ht") is string ht) row.Height = JsNumber.ParseFloat(ht);
        if (el.Attr("customHeight") is "1" or "true") row.CustomHeight = true;
        if (el.Attr("hidden") is "1" or "true") row.Hidden = true;
        if (el.Attr("s") is string s) row.Style = JsNumber.ParseIntOr(s, 0);
        foreach (var cEl in ChildElements(el, "c")) row.Cells.Add(ReadCell(cEl, cx));
        return row;
    }

    private static Cell ReadCell(XmlElement el, ColorContext? cx)
    {
        var cell = new Cell { Ref = el.Attr("r") ?? "" };
        if (el.Attr("t") is string t) cell.Type = t;
        if (el.Attr("s") is string s) cell.Style = JsNumber.ParseIntOr(s, 0);
        var v = FirstChild(el, "v");
        if (v is not null) cell.Value = TextContent(v);
        var f = FirstChild(el, "f");
        if (f is not null) cell.Formula = TextContent(f);
        var isEl = FirstChild(el, "is");
        if (isEl is not null) cell.InlineString = ReadSharedStringEntry(isEl, cx);
        return cell;
    }
}

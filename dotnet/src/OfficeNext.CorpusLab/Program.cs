using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using OfficeNext.DocBinary;
using OfficeNext.DocxLayout;

// ─────────────────────────────────────────────────────────────────────────────
// OfficeNext.CorpusLab — porta de write/tools/corpus-lab/run-engine.mjs para o
// motor .NET: roda o OfficeNext.DocxLayout (fontes INSTALADAS na máquina) sobre
// o corpus de documentos reais e grava LAB_DIR/<tag>/<id>/net.pdf + info.json
// (status, pages, ms, error). Depois: `cd write/tools/corpus-lab &&
// python -I compare.py <tag> --source net`.
//
// O corpus (CORPUS_ROOT, padrão E:/UniversalWriteTest) é de terceiros: NADA dele
// (nem texto, nem imagens, nem dumps) entra no repositório — toda saída vai
// para LAB_DIR (padrão CORPUS_ROOT/_lab).
//
// Uso: dotnet run -c Release --project dotnet/src/OfficeNext.CorpusLab --
//        [--tag net] [--only id,id] [--list arquivo] [--container zip|cfb]
//        [--tenant N] [--from N] [--limit N] [--force] [--dump]
//      ... -- --file caminho.docx --out saida.pdf
// --dump grava também net.layout.json (árvore normalizada, mesmo formato de
// tools/gen-parity-layout.mjs) para comparar com o motor JS fora do repo.
// .doc (Word 97-2003) passa pelo conversor OfficeNext.DocBinary antes.
// ─────────────────────────────────────────────────────────────────────────────

string? Opt(string n, string? d = null)
{
    int i = Array.IndexOf(args, $"--{n}");
    return i >= 0 && i + 1 < args.Length ? args[i + 1] : d;
}
bool Flag(string n) => args.Contains($"--{n}");

var provider = SystemFontProvider.Shared;

(LayoutResult Res, byte[] Pdf) Convert(byte[] bytes)
{
    // .doc (Word 97-2003): converte para .docx e segue o caminho normal
    if (DocBinary.IsWordBinary(bytes)) bytes = DocBinary.ConvertDocToDocx(bytes);
    // .odt com extensão trocada (o Word abre): o JS usa o leitor ODF — ainda não portado
    string head = Encoding.Latin1.GetString(bytes, 0, Math.Min(200, bytes.Length));
    if (head.Contains("opendocument.text", StringComparison.Ordinal))
        throw new NotSupportedException(".odt: leitor ODF ainda não portado para .NET");
    var res = DocxLayoutPipeline.Layout(bytes, provider);
    return (res, PdfRenderer.RenderPdf(res));
}

if (Opt("file") is { } file)
{
    var sw = Stopwatch.StartNew();
    var (res, pdf) = Convert(File.ReadAllBytes(file));
    File.WriteAllBytes(Opt("out", "out.pdf")!, pdf);
    if (Flag("dump")) File.WriteAllText(Path.ChangeExtension(Opt("out", "out.pdf")!, ".layout.json"), LayoutDump.Normalize(res));
    Console.WriteLine($"{res.Pages.Count} páginas em {sw.ElapsedMilliseconds} ms; avisos: {(res.Warnings.Count > 0 ? string.Join("; ", res.Warnings) : "-")}");
    return 0;
}

string corpusRoot = Environment.GetEnvironmentVariable("CORPUS_ROOT") ?? "E:/UniversalWriteTest";
string labDir = Environment.GetEnvironmentVariable("LAB_DIR") ?? Path.Combine(corpusRoot, "_lab");
string manifestPath = Path.Combine(labDir, "manifest.json");
if (!File.Exists(manifestPath))
{
    Console.Error.WriteLine($"manifesto ausente: {manifestPath} — rode node write/tools/corpus-lab/corpus.mjs");
    return 1;
}
var docs = JsonNode.Parse(File.ReadAllText(manifestPath, Encoding.UTF8))!.AsArray()
    .Select(n => n!.AsObject()).ToList();

// filtros comuns (os mesmos de corpus.mjs selectDocs)
if (Opt("only") is { } only) { var s = new HashSet<string>(only.Split(',')); docs = docs.Where(d => s.Contains((string)d["id"]!)).ToList(); }
if (Opt("list") is { } listFile) { var s = new HashSet<string>(File.ReadAllLines(listFile).Where(l => l.Length > 0)); docs = docs.Where(d => s.Contains((string)d["id"]!)).ToList(); }
if (Opt("container") is { } container) docs = docs.Where(d => (string?)d["container"] == container).ToList();
if (Opt("tenant") is { } tenant) docs = docs.Where(d => (string?)d["tenant"] == tenant).ToList();
int from = int.Parse(Opt("from", "0")!);
int limit = Opt("limit") is { } l ? int.Parse(l) : int.MaxValue;
docs = docs.Skip(from).Take(limit).ToList();

string tag = Opt("tag", "net")!;
bool force = Flag("force"), dump = Flag("dump");
int n = 0, errors = 0;
var t0 = Stopwatch.StartNew();
var jsonOpts = new JsonSerializerOptions { WriteIndented = true, Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };
foreach (var d in docs)
{
    string id = (string)d["id"]!;
    string dir = Path.Combine(labDir, tag, id);
    if (!force && File.Exists(Path.Combine(dir, "info.json"))) continue;
    Directory.CreateDirectory(dir);
    var info = new JsonObject { ["id"] = id, ["rel"] = (string?)d["rel"], ["container"] = (string?)d["container"] };
    var ts = Stopwatch.StartNew();
    try
    {
        var (res, pdf) = Convert(File.ReadAllBytes((string)d["path"]!));
        File.WriteAllBytes(Path.Combine(dir, "net.pdf"), pdf);
        if (dump) File.WriteAllText(Path.Combine(dir, "net.layout.json"), LayoutDump.Normalize(res));
        info["status"] = "ok";
        info["pages"] = res.Pages.Count;
        if (res.Warnings.Count > 0) info["warnings"] = new JsonArray(res.Warnings.Select(w => (JsonNode?)w).ToArray());
    }
    catch (Exception e)
    {
        info["status"] = "error";
        string msg = e.ToString();
        info["error"] = msg.Length > 1200 ? msg[..1200] : msg;
        errors++;
    }
    info["ms"] = ts.ElapsedMilliseconds;
    File.WriteAllText(Path.Combine(dir, "info.json"), info.ToJsonString(jsonOpts));
    n++;
    if (n % 50 == 0) Console.WriteLine($"{n}/{docs.Count} ({t0.Elapsed.TotalSeconds:0}s, erros {errors})");
}
Console.WriteLine($"fim: {n} documentos, {errors} erros, {t0.Elapsed.TotalSeconds:0}s → {Path.Combine(labDir, tag)}");
return 0;

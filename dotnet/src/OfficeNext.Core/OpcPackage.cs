using System.IO.Compression;
using System.Text;

namespace OfficeNext.Core;

/// <summary>
/// Container OPC (Open Packaging Conventions) genérico — base de .docx/.xlsx/.pptx.
///
/// REGRA DE OURO (igual ao JS): round-trip sem perdas. Toda parte é preservada
/// byte a byte; só substituímos o conteúdo de uma parte quando uma edição a
/// modifica de fato. A ordem das partes no ZIP é preservada (diffs limpos).
/// </summary>
public class OpcPackage
{
    /// <summary>Caminho-no-zip → bytes, na ordem original do arquivo.</summary>
    private readonly List<string> _order = new();
    private readonly Dictionary<string, byte[]> _parts = new(StringComparer.Ordinal);

    protected OpcPackage() { }

    public static OpcPackage Load(byte[] bytes)
    {
        var pkg = new OpcPackage();
        pkg.LoadInto(bytes);
        return pkg;
    }

    protected void LoadInto(byte[] bytes)
    {
        ZipArchive zip;
        try
        {
            zip = new ZipArchive(new MemoryStream(bytes, writable: false), ZipArchiveMode.Read, leaveOpen: false);
        }
        catch (Exception)
        {
            throw new InvalidDataException("Arquivo não é um pacote OOXML válido (ZIP corrompido ou formato legado)");
        }
        using (zip)
        {
            foreach (var entry in zip.Entries)
            {
                if (entry.FullName.EndsWith('/')) continue; // diretório
                using var ms = new MemoryStream((int)entry.Length);
                using (var s = entry.Open()) s.CopyTo(ms);
                SetPart(entry.FullName, ms.ToArray());
            }
        }
    }

    public byte[] Save()
    {
        var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var path in _order)
            {
                var entry = zip.CreateEntry(path, CompressionLevel.Optimal);
                using var s = entry.Open();
                s.Write(_parts[path]);
            }
        }
        return ms.ToArray();
    }

    public IReadOnlyList<string> PartNames() => _order;

    public byte[]? GetPart(string path) => _parts.TryGetValue(path, out var d) ? d : null;

    private static readonly UTF8Encoding Utf8NoBom = new(encoderShouldEmitUTF8Identifier: false);

    /// <summary>Decodifica a parte como UTF-8, removendo BOM (mesma semântica do TextDecoder).</summary>
    public string? GetPartText(string path)
    {
        var d = GetPart(path);
        if (d is null) return null;
        int offset = d.Length >= 3 && d[0] == 0xEF && d[1] == 0xBB && d[2] == 0xBF ? 3 : 0;
        return Encoding.UTF8.GetString(d, offset, d.Length - offset);
    }

    public void SetPart(string path, byte[] data)
    {
        if (!_parts.ContainsKey(path)) _order.Add(path);
        _parts[path] = data;
    }

    public void SetPartText(string path, string text) => SetPart(path, Utf8NoBom.GetBytes(text));

    /// <summary>
    /// Resolve o caminho de uma parte alvo a partir de um relacionamento (.rels).
    /// Relativos ao diretório da parte-dona; "../" sobe um nível; "/x" é absoluto.
    /// </summary>
    public string ResolveRelTarget(string fromPart, string target)
    {
        if (target.StartsWith('/')) return target[1..];
        string dir = fromPart.Contains('/') ? fromPart[..fromPart.LastIndexOf('/')] : "";
        string t = target;
        while (t.StartsWith("../", StringComparison.Ordinal))
        {
            t = t[3..];
            dir = dir.Contains('/') ? dir[..dir.LastIndexOf('/')] : "";
        }
        return dir.Length > 0 ? dir + "/" + t : t;
    }
}

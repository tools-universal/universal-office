using System.Buffers.Binary;
using System.IO.Compression;
using System.Text;
using UniversalOffice.Core;
using Xunit;

namespace UniversalOffice.Tests;

/// <summary>Descompressão com teto: bytes contados ao ler, tamanho declarado no ZIP ignorado.</summary>
public class OpcPackageLimitsTests
{
    internal static byte[] Zip(params (string Name, byte[] Data)[] entries)
    {
        using var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var (name, data) in entries)
            {
                using var s = zip.CreateEntry(name, CompressionLevel.Optimal).Open();
                s.Write(data);
            }
        }
        return ms.ToArray();
    }

    /// <summary>Troca o tamanho descomprimido DECLARADO (cabeçalho local e diretório central) das entradas com o prefixo dado.</summary>
    internal static byte[] LieAboutSize(byte[] zip, string namePrefix, uint declared)
    {
        var bytes = (byte[])zip.Clone();
        for (int i = 0; i + 4 <= bytes.Length; i++)
        {
            uint sig = BinaryPrimitives.ReadUInt32LittleEndian(bytes.AsSpan(i));
            if (sig == 0x04034b50 && i + 30 <= bytes.Length)
            {
                int nameLen = BinaryPrimitives.ReadUInt16LittleEndian(bytes.AsSpan(i + 26));
                if (Encoding.UTF8.GetString(bytes, i + 30, nameLen).StartsWith(namePrefix, StringComparison.Ordinal))
                    BinaryPrimitives.WriteUInt32LittleEndian(bytes.AsSpan(i + 22), declared);
            }
            else if (sig == 0x02014b50 && i + 46 <= bytes.Length)
            {
                int nameLen = BinaryPrimitives.ReadUInt16LittleEndian(bytes.AsSpan(i + 28));
                if (Encoding.UTF8.GetString(bytes, i + 46, nameLen).StartsWith(namePrefix, StringComparison.Ordinal))
                    BinaryPrimitives.WriteUInt32LittleEndian(bytes.AsSpan(i + 24), declared);
            }
        }
        return bytes;
    }

    [Fact]
    public void Tamanho_Declarado_Mentiroso_Nao_Reserva_Memoria()
    {
        var entries = Enumerable.Range(0, 20).Select(k => ($"docProps/c{k}.xml", Encoding.UTF8.GetBytes("<r/>"))).ToArray();
        var zip = LieAboutSize(Zip(entries), "docProps/c", 2_000_000_000);

        long before = GC.GetAllocatedBytesForCurrentThread();
        var pkg = OpcPackage.Load(zip);
        long allocated = GC.GetAllocatedBytesForCurrentThread() - before;

        Assert.True(allocated < 64L * 1024 * 1024, $"alocou {allocated / 1048576} MB");
        Assert.Equal("<r/>", pkg.GetPartText("docProps/c0.xml"));
    }

    [Fact]
    public void Parte_Acima_Do_Teto_Lanca_Com_O_Nome_Da_Parte()
    {
        var zip = Zip(("a.xml", new byte[100]), ("bomba.bin", new byte[2 * 1024 * 1024]));

        var ex = Assert.Throws<OfficeLimitExceededException>(() => OpcPackage.Load(zip, new OpcPackageLimits { MaxPartBytes = 1024 * 1024 }));

        Assert.Equal(OfficeLimit.PartBytes, ex.Limit);
        Assert.Equal(1024 * 1024, ex.Maximum);
        Assert.Equal("bomba.bin", ex.PartName);
    }

    [Fact]
    public void Soma_Acima_Do_Teto_Lanca()
    {
        var zip = Zip(Enumerable.Range(0, 5).Select(k => ($"p{k}.bin", new byte[300 * 1024])).ToArray());

        var ex = Assert.Throws<OfficeLimitExceededException>(() => OpcPackage.Load(zip, new OpcPackageLimits { MaxTotalBytes = 1024 * 1024 }));

        Assert.Equal(OfficeLimit.TotalBytes, ex.Limit);
        Assert.Null(ex.PartName);
    }

    [Fact]
    public void Bomba_De_Compressao_Para_No_Teto_Padrao()
    {
        // 300 MiB de zeros comprimem para ~300 KB; o padrão por parte é 256 MiB
        byte[] zip;
        using (var ms = new MemoryStream())
        {
            using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
            using (var s = archive.CreateEntry("zeros.bin", CompressionLevel.Optimal).Open())
            {
                var chunk = new byte[1024 * 1024];
                for (int i = 0; i < 300; i++) s.Write(chunk);
            }
            zip = ms.ToArray();
        }

        var ex = Assert.Throws<OfficeLimitExceededException>(() => OpcPackage.Load(zip));

        Assert.Equal(OfficeLimit.PartBytes, ex.Limit);
        Assert.Equal(OpcPackageLimits.Default.MaxPartBytes, ex.Maximum);
    }

    [Fact]
    public void Sem_Teto_E_Dentro_Do_Teto_Le_Tudo()
    {
        var zip = Zip(("a.bin", new byte[300 * 1024]), ("b.bin", new byte[10]));

        Assert.Equal(300 * 1024, OpcPackage.Load(zip, OpcPackageLimits.None).GetPart("a.bin")!.Length);
        Assert.Equal(10, OpcPackage.Load(zip, new OpcPackageLimits { MaxPartBytes = 300 * 1024, MaxTotalBytes = 300 * 1024 + 10 }).GetPart("b.bin")!.Length);
    }
}

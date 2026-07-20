using System.Text.Json;
using System.Text.RegularExpressions;
using OfficeNext.Xlsx;
using Xunit;

namespace OfficeNext.Tests;

/// <summary>
/// Pino de fidelidade 1:1: FormatValue tem que reproduzir EXATAMENTE o
/// Range.Text do Excel pt-BR (oracle-format.json capturado via COM) —
/// espelho de sheet/packages/sheet-core/test/format.test.ts.
/// </summary>
public class FormatOracleTests
{
    public sealed record OracleCase(JsonElement V, string Fmt, string Text, string Note);

    public static IEnumerable<object[]> OracleCases()
    {
        string path = Path.Combine(Fixtures.Dir, "oracle-format.json");
        string raw = File.ReadAllText(path).TrimStart('﻿');
        using var doc = JsonDocument.Parse(raw);
        foreach (var c in doc.RootElement.EnumerateArray())
        {
            var v = c.GetProperty("v");
            string fmt = c.GetProperty("fmt").GetString()!;
            string text = c.GetProperty("text").GetString()!;
            object value = v.ValueKind == JsonValueKind.String ? v.GetString()! : v.GetDouble();
            yield return [value, fmt, text];
        }
    }

    private static readonly Regex WsRe = new(@"\s+", RegexOptions.CultureInvariant);

    [Theory]
    [MemberData(nameof(OracleCases))]
    public void FormatValue_ReproduzOraculo(object value, string fmt, string expected)
    {
        string actual = value is string s
            ? Format.FormatValue(s, fmt).Text
            : Format.FormatValue((double)value, fmt).Text;
        // `* ` (preenchimento) depende da largura da coluna → compara normalizado
        bool widthDependent = fmt.Contains("* ", StringComparison.Ordinal);
        string Norm(string x) => widthDependent ? WsRe.Replace(x, " ").Trim() : x;
        Assert.Equal(Norm(expected), Norm(actual));
    }

    [Fact]
    public void OraculoExiste()
    {
        Assert.True(OracleCases().Any());
    }

    // ───────── formatGeneral: limites de 11 caracteres e científico ─────────

    [Fact]
    public void FormatGeneral_InteirosEDecimaisSimples()
    {
        Assert.Equal("0", Format.FormatGeneral(0));
        Assert.Equal("42", Format.FormatGeneral(42));
        Assert.Equal("-42", Format.FormatGeneral(-42));
        Assert.Equal("0,1", Format.FormatGeneral(0.1));
    }

    [Fact]
    public void FormatGeneral_ViraCientificoQuandoNaoCabe()
    {
        Assert.Equal("1,23457E+11", Format.FormatGeneral(123456789012));
        Assert.Equal("1E-10", Format.FormatGeneral(1e-10));
        Assert.Equal("1E+20", Format.FormatGeneral(1e20));
    }

    // ───────── builtins de locale + fixes do oráculo 2026-07-01 ─────────

    [Fact]
    public void BuiltinFormatCode_HonraLocalePtBr()
    {
        Assert.Equal("17/06/2026", Format.FormatValue(46190, Format.BuiltinFormatCode(14)!).Text);
        Assert.Equal("17/jun/26", Format.FormatValue(46190, Format.BuiltinFormatCode(15)!).Text);
        Assert.Equal("17/jun", Format.FormatValue(46190, Format.BuiltinFormatCode(16)!).Text);
        Assert.Equal("jun/26", Format.FormatValue(46190, Format.BuiltinFormatCode(17)!).Text);
        Assert.Equal("14:30", Format.FormatValue(46190.604861, Format.BuiltinFormatCode(20)!).Text);
        Assert.Equal("17/06/2026 14:30", Format.FormatValue(46190.604861, Format.BuiltinFormatCode(22)!).Text);
    }

    [Fact]
    public void ZeroInsignificanteEmSlotDecimalSuprimido()
    {
        // showcase TextoENumeros!B5: Excel mostra "R$ 1999,9000"
        Assert.Equal("R$ 1999,9000", Format.FormatValue(1999.9, "\"R$\"\\ #.##000").Text);
    }

    [Fact]
    public void CientificoComGrupoNaMantissaUsaPassoDeEngenharia()
    {
        // showcase TextoENumeros!B7: Excel mostra "123E+04"
        Assert.Equal("123E+04", Format.FormatValue(1234567, "#,000E+00").Text);
        Assert.Equal("46,2E+3", Format.FormatValue(46190.604861, "##0.0E+0").Text);
    }
}

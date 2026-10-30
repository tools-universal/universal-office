using System.Text;

namespace UniversalOffice.Core;

/// <summary>
/// Nomes de parte OPC (ECMA-376 parte 2) no formato dos nomes de entrada do ZIP:
/// sem a barra inicial (<c>word/document.xml</c>), com os caracteres já
/// desescapados. É a regra ÚNICA de resolução de alvo de relacionamento do
/// UniversalOffice — o validador de quem hospeda deve usar o mesmo método, para que
/// "a parte que o validador conferiu" e "a parte que o UniversalOffice abre" sejam
/// sempre a mesma.
/// </summary>
public static class OpcPartName
{
    /// <summary>
    /// Resolve o <c>Target</c> de um relacionamento INTERNO para o nome da parte alvo.
    /// <para>Regra: tira o fragmento (<c>#…</c>); alvo começando com <c>/</c> é
    /// absoluto, senão é relativo à pasta de <paramref name="sourcePartName"/> ("" =
    /// raiz do pacote, para <c>_rels/.rels</c>); segmentos vazios e <c>.</c> somem e
    /// <c>..</c> sobe um nível; cada segmento é desescapado UMA vez (<c>%2531</c> vira
    /// o texto <c>%31</c>, nunca <c>1</c>).</para>
    /// <para>Devolve null para alvo que não nomeia uma parte: vazio, com esquema
    /// (<c>http:</c>…), com consulta (<c>?</c>) ou barra invertida, <c>..</c> acima da
    /// raiz, escape <c>%</c> malformado, ou segmento que desescapado vira vazio,
    /// <c>.</c>, <c>..</c> ou contém <c>/</c> ou <c>\</c>.</para>
    /// <para>O nome devolvido é comparado com os nomes do ZIP SEM diferenciar
    /// maiúsculas (como o OPC), e não deve ser desescapado de novo.</para>
    /// </summary>
    /// <param name="sourcePartName">Parte dona do .rels (ex.: <c>word/document.xml</c>; "" para <c>_rels/.rels</c>). Barra inicial é aceita.</param>
    /// <param name="target">Atributo <c>Target</c> do relacionamento.</param>
    public static string? ResolveRelationshipTarget(string sourcePartName, string target)
    {
        ArgumentNullException.ThrowIfNull(sourcePartName);
        ArgumentNullException.ThrowIfNull(target);

        int hash = target.IndexOf('#');
        string reference = hash >= 0 ? target[..hash] : target;
        if (reference.Length == 0 || HasScheme(reference)) return null;
        if (reference.Contains('?') || reference.Contains('\\')) return null;

        var segments = new List<string>();
        if (!reference.StartsWith('/'))
        {
            string source = sourcePartName.TrimStart('/');
            int slash = source.LastIndexOf('/');
            if (slash > 0)
            {
                foreach (var folder in source[..slash].Split('/'))
                {
                    if (folder is "." or "..") return null;
                    if (folder.Length > 0) segments.Add(folder);
                }
            }
        }

        foreach (var raw in reference.Split('/'))
        {
            if (raw.Length == 0 || raw == ".") continue;
            if (raw == "..")
            {
                if (segments.Count == 0) return null;
                segments.RemoveAt(segments.Count - 1);
                continue;
            }
            var decoded = DecodeSegment(raw);
            if (decoded is null) return null;
            segments.Add(decoded);
        }
        return segments.Count == 0 ? null : string.Join('/', segments);
    }

    /// <summary>
    /// Escapa um segmento de nome de parte para gravar num <c>Target</c> (inverso da
    /// resolução: <c>ResolveRelationshipTarget</c> devolve o texto original).
    /// </summary>
    public static string EscapeSegment(string segment)
    {
        ArgumentNullException.ThrowIfNull(segment);
        foreach (char c in segment)
            if (!IsSafe(c)) return Uri.EscapeDataString(segment);
        return segment;
    }

    private static bool IsSafe(char c) =>
        c is (>= 'a' and <= 'z') or (>= 'A' and <= 'Z') or (>= '0' and <= '9') or '-' or '.' or '_' or '~';

    /// <summary>Segmento desescapado uma vez; null se o escape é malformado ou o resultado não serve como segmento.</summary>
    private static string? DecodeSegment(string raw)
    {
        string decoded = raw;
        if (raw.Contains('%'))
        {
            for (int i = 0; i < raw.Length; i++)
            {
                if (raw[i] != '%') continue;
                if (i + 2 >= raw.Length || !Uri.IsHexDigit(raw[i + 1]) || !Uri.IsHexDigit(raw[i + 2])) return null;
                i += 2;
            }
            decoded = Uri.UnescapeDataString(raw);
        }
        if (decoded.Length == 0 || decoded == "." || decoded == "..") return null;
        foreach (char c in decoded)
            if (c is '/' or '\\' || char.IsControl(c)) return null;
        return decoded;
    }

    /// <summary>Primeiro segmento com ":" (esquema, ou ambíguo com esquema numa referência relativa).</summary>
    private static bool HasScheme(string reference)
    {
        int colon = reference.IndexOf(':');
        if (colon < 0) return false;
        int slash = reference.IndexOf('/');
        return slash < 0 || colon < slash;
    }
}

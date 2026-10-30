namespace UniversalOffice.Docx.Editing;

/// <summary>Posição vertical do texto (w:vertAlign).</summary>
public enum DocxVerticalAlign
{
    Superscript,
    Subscript,
}

/// <summary>Formatação de caractere do texto escrito por <see cref="DocxBodyWriter"/>.</summary>
public sealed record DocxRunFormat
{
    public bool Bold { get; init; }
    public bool Italic { get; init; }
    public bool Underline { get; init; }
    public bool Strike { get; init; }

    /// <summary>Cor do texto: hexadecimal ("RRGGBB", "#RGB"…), <c>rgb(…)</c> ou nome CSS; inválida é ignorada.</summary>
    public string? Color { get; init; }

    /// <summary>Cor de fundo (w:shd), no mesmo formato de <see cref="Color"/>.</summary>
    public string? Background { get; init; }

    public DocxVerticalAlign? VerticalAlign { get; init; }

    /// <summary>
    /// Destino do link (vira <c>w:hyperlink</c> com relacionamento externo). URL fora de
    /// <see cref="DocxBodyWriterOptions.AllowedLinkSchemes"/> (âncoras "#…", relativos)
    /// fica como texto; "www.…" ganha http://.
    /// </summary>
    public string? Link { get; init; }

    /// <summary>Sem formatação.</summary>
    public static DocxRunFormat None { get; } = new();
}

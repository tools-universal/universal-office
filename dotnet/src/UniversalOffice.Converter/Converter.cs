namespace UniversalOffice.Converter;

public sealed record ConversionResult(string MediaType, string? Text = null, byte[]? Bytes = null)
{
    public static ConversionResult Html(string value) => new("text/html", Text: value);
    public static ConversionResult Markdown(string value) => new("text/markdown", Text: value);
    public static ConversionResult Pdf(byte[] value) => new("application/pdf", Bytes: value);
}

public sealed record ConversionRequest(string Target, DocumentFormat? Source = null, object? Options = null);
public delegate ValueTask<ConversionResult> ConversionHandler(byte[] input, object? options, CancellationToken cancellationToken);

/// <summary>Extensible source/target registry. Built-ins are HTML, PDF, and Markdown.</summary>
public sealed class OfficeConverter
{
    private readonly Dictionary<string, ConversionHandler> handlers = new(StringComparer.OrdinalIgnoreCase);
    public static OfficeConverter Default { get; } = CreateDefault();

    public OfficeConverter Register(string source, string target, ConversionHandler handler)
    {
        handlers[$"{source}:{target}"] = handler;
        return this;
    }

    public bool CanConvert(string source, string target) => handlers.ContainsKey($"{source}:{target}");

    public ValueTask<ConversionResult> ConvertAsync(byte[] input, ConversionRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(input);
        var source = request.Source ?? FormatDetector.Detect(input);
        if (!handlers.TryGetValue($"{source.ToString().ToLowerInvariant()}:{request.Target}", out var handler))
            throw new NotSupportedException($"Unsupported conversion: {source} -> {request.Target}");
        return handler(input, request.Options, cancellationToken);
    }

    public static OfficeConverter CreateDefault() => new OfficeConverter()
        .Register("docx", "html", (input, options, _) => ValueTask.FromResult(ConversionResult.Html(FromDocx.DocxToHtml(input, options as DocxHtmlOptions))))
        .Register("docx", "markdown", (input, options, _) => ValueTask.FromResult(ConversionResult.Markdown(FromDocx.DocxToMarkdown(input, options as DocxMarkdownOptions))))
        .Register("docx", "pdf", (input, options, _) => ValueTask.FromResult(ConversionResult.Pdf(DocxPdf.ToPdf(input, options as List<PdfFontSource> ?? throw new ArgumentException("DOCX -> PDF requires List<PdfFontSource> options.")))))
        .Register("xlsx", "html", (input, options, _) => ValueTask.FromResult(ConversionResult.Html(XlsxHtml.ToHtml(input, options as SheetExportOptions, fullDocument: true))))
        .Register("xlsx", "markdown", (input, options, _) => ValueTask.FromResult(ConversionResult.Markdown(XlsxMarkdown.ToMarkdown(input, options as SheetExportOptions))))
        .Register("xlsx", "pdf", (input, options, _) => ValueTask.FromResult(ConversionResult.Pdf(XlsxPdf.ToPdf(input, options as SheetPdfOptions))))
        .Register("pptx", "html", (input, options, _) => ValueTask.FromResult(ConversionResult.Html(PptxHtml.ToHtml(input, options as PptxHtml.Options ?? new PptxHtml.Options { FullDocument = true }))))
        .Register("pptx", "markdown", (input, options, _) => ValueTask.FromResult(ConversionResult.Markdown(PptxMarkdown.ToMarkdown(input, options as PptxMarkdown.Options))))
        .Register("pptx", "pdf", (input, options, _) => ValueTask.FromResult(ConversionResult.Pdf(PptxPdf.ToPdf(input, options as SlidesPdfOptions))))
        .Register("pdf", "html", (input, options, _) => ValueTask.FromResult(ConversionResult.Html(PdfMarkdown.ToHtml(input, options as PdfMarkdownOptions))))
        .Register("pdf", "markdown", (input, options, _) => ValueTask.FromResult(ConversionResult.Markdown(PdfMarkdown.ToMarkdown(input, options as PdfMarkdownOptions))))
        .Register("pdf", "pdf", (input, _, _) => ValueTask.FromResult(ConversionResult.Pdf([.. input])));
}

public static class Converter
{
    public static ConversionResult Convert(byte[] input, ConversionRequest request) =>
        OfficeConverter.Default.ConvertAsync(input, request).AsTask().GetAwaiter().GetResult();

    public static string ToMarkdown(byte[] input, object? options = null) =>
        Convert(input, new ConversionRequest("markdown", Options: options)).Text!;
}

namespace UniversalOffice.Converter.Processing.Docs.Core;

/// <summary>Unidades OOXML (twips, EMU, half-points) — espelho dos helpers JS.</summary>
public static class Units
{
    public const int EmuPerTwip = 635;
    public const int EmuPerInch = 914400;
    public const int EmuPerPoint = 12700;
    /// <summary>EMU → pixels @96dpi (9525).</summary>
    public const double EmuPerPx = EmuPerInch / 96.0;

    /// <summary>twips → px @96dpi (Math.round((t/1440)*96) do JS).</summary>
    public static double TwipsToPx(double t) => JsNumber.Round(t / 1440.0 * 96);

    /// <summary>twips → pt com 2 casas (+(t/20).toFixed(2) do JS).</summary>
    public static double TwipsToPt(double t) =>
        double.Parse(JsNumber.ToFixed(t / 20.0, 2), System.Globalization.CultureInfo.InvariantCulture);

    public static double HalfPtToPt(double h) => h / 2.0;
}

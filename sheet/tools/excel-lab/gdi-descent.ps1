# tmDescent do GDI (px a 96 dpi) por familia/ppem/negrito — usado por
# gen-row-descents.mjs. Sem janela; so le metricas das fontes INSTALADAS.
# Saida JSON (-Out): { "<familia>|<0|1>": { face: "<face real>", d: [px por ppem] } }
# (face = GetTextFace: se difere da familia pedida, o GDI substituiu a fonte).
param([string]$Fonts = 'Calibri,Arial', [string]$Ppems = '4-40', [string]$Out)
$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class GdiD {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct TEXTMETRIC { public int tmHeight, tmAscent, tmDescent, tmInternalLeading, tmExternalLeading, tmAveCharWidth, tmMaxCharWidth, tmWeight, tmOverhang, tmDigitizedAspectX, tmDigitizedAspectY; public char tmFirstChar, tmLastChar, tmDefaultChar, tmBreakChar; public byte tmItalic, tmUnderlined, tmStruckOut, tmPitchAndFamily, tmCharSet; }
  [DllImport("gdi32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr CreateFontW(int h,int w,int e,int o,int weight,uint it,uint ul,uint so,uint cs,uint op,uint cp,uint q,uint pf,string face);
  [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleDC(IntPtr h);
  [DllImport("gdi32.dll")] public static extern IntPtr SelectObject(IntPtr dc, IntPtr o);
  [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr o);
  [DllImport("gdi32.dll")] public static extern bool DeleteDC(IntPtr dc);
  [DllImport("gdi32.dll", CharSet=CharSet.Unicode)] public static extern bool GetTextMetricsW(IntPtr dc, out TEXTMETRIC tm);
  [DllImport("gdi32.dll", CharSet=CharSet.Unicode)] public static extern int GetTextFaceW(IntPtr dc, int n, StringBuilder s);
}
"@
$p0, $p1 = $Ppems.Split('-') | ForEach-Object { [int]$_ }
$res = [ordered]@{}
$dc = [GdiD]::CreateCompatibleDC([IntPtr]::Zero)
foreach ($f in $Fonts.Split(',')) {
  foreach ($bold in 0, 1) {
    $ds = New-Object System.Collections.Generic.List[int]
    $face = ''
    for ($p = $p0; $p -le $p1; $p++) {
      $hf = [GdiD]::CreateFontW(-$p, 0, 0, 0, $(if ($bold) { 700 } else { 400 }), 0, 0, 0, 1, 0, 0, 5, 0, $f)
      $old = [GdiD]::SelectObject($dc, $hf)
      $sb = New-Object System.Text.StringBuilder 64
      [void][GdiD]::GetTextFaceW($dc, 64, $sb)
      $face = $sb.ToString()
      $tm = New-Object GdiD+TEXTMETRIC
      [void][GdiD]::GetTextMetricsW($dc, [ref]$tm)
      $ds.Add($tm.tmDescent)
      [void][GdiD]::SelectObject($dc, $old); [void][GdiD]::DeleteObject($hf)
    }
    $res["$f|$bold"] = [ordered]@{ face = $face; d = $ds.ToArray() }
  }
}
[void][GdiD]::DeleteDC($dc)
[System.IO.File]::WriteAllText($Out, (ConvertTo-Json -InputObject $res -Depth 4 -Compress), (New-Object System.Text.UTF8Encoding($false)))

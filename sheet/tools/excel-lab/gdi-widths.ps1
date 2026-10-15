# Larguras de avanco GDI (px inteiros, como o Excel mede/desenha a 96 dpi) dos
# caracteres de -CharsFile (UTF-8) por familia/ppem/negrito. Usado por
# gen-glyph-widths.mjs. Sem janela; so le metricas das fontes INSTALADAS.
# Saida JSON (-Out): { "<familia>|<ppem>|<0|1>": { face: "<face real>", w: [px...] } }
# (face = GetTextFace: se difere da familia pedida, o GDI substituiu a fonte).
param([string]$Fonts = 'Calibri,Arial', [string]$Ppems = '8-32', [string]$CharsFile, [string]$Out)
$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class GdiW {
  [DllImport("gdi32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr CreateFontW(int h,int w,int e,int o,int weight,uint it,uint ul,uint so,uint cs,uint op,uint cp,uint q,uint pf,string face);
  [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleDC(IntPtr h);
  [DllImport("gdi32.dll")] public static extern IntPtr SelectObject(IntPtr dc, IntPtr o);
  [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr o);
  [DllImport("gdi32.dll")] public static extern bool DeleteDC(IntPtr dc);
  [DllImport("gdi32.dll", CharSet=CharSet.Unicode)] public static extern bool GetCharWidth32W(IntPtr dc, uint a, uint b, int[] w);
  [DllImport("gdi32.dll", CharSet=CharSet.Unicode)] public static extern int GetTextFaceW(IntPtr dc, int n, StringBuilder s);
}
"@
$chars = [System.IO.File]::ReadAllText($CharsFile, [System.Text.Encoding]::UTF8)
$p0, $p1 = $Ppems.Split('-') | ForEach-Object { [int]$_ }
$res = [ordered]@{}
$dc = [GdiW]::CreateCompatibleDC([IntPtr]::Zero)
foreach ($f in $Fonts.Split(',')) {
  foreach ($bold in 0, 1) {
    for ($p = $p0; $p -le $p1; $p++) {
      $hf = [GdiW]::CreateFontW(-$p, 0, 0, 0, $(if ($bold) { 700 } else { 400 }), 0, 0, 0, 1, 0, 0, 5, 0, $f)
      $old = [GdiW]::SelectObject($dc, $hf)
      $sb = New-Object System.Text.StringBuilder 64
      [void][GdiW]::GetTextFaceW($dc, 64, $sb)
      $ws = New-Object System.Collections.Generic.List[int]
      foreach ($ch in $chars.ToCharArray()) {
        $w = New-Object int[] 1
        [void][GdiW]::GetCharWidth32W($dc, [uint32][char]$ch, [uint32][char]$ch, $w)
        $ws.Add($w[0])
      }
      $res["$f|$p|$bold"] = [ordered]@{ face = $sb.ToString(); w = $ws.ToArray() }
      [void][GdiW]::SelectObject($dc, $old); [void][GdiW]::DeleteObject($hf)
    }
  }
}
[void][GdiW]::DeleteDC($dc)
[System.IO.File]::WriteAllText($Out, (ConvertTo-Json -InputObject $res -Depth 4 -Compress), (New-Object System.Text.UTF8Encoding($false)))

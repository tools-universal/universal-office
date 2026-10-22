# Oraculo da frente Pagina (lote 8): os 48 padroes do Preenchimento da pagina
# (Fill.Patterned 1..48): o:title que o Word grava (localizado) e o bitmap 8x8
# do GIF (bit 7 = coluna 0, 1 = cor de frente), em results/patterns.txt.
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File page-oracle8.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.Drawing
$outDir = [string](Join-Path $PSScriptRoot 'results')
$tmp = [string](Join-Path $env:TEMP 'officenext-page-oracle')
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$lines = @()
try {
  for ($n = 1; $n -le 48; $n++) {
    $doc = $word.Documents.Add()
    try {
      $f = $doc.Background.Fill
      $f.Visible = -1
      $f.ForeColor.RGB = 0; $f.BackColor.RGB = 16777215
      $f.Patterned($n)
      $p = [string](Join-Path $tmp "pat$n.docx")
      $doc.SaveAs2($p, 16)
    } finally { $doc.Close(0) }
    $fs = New-Object System.IO.FileStream($p, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    $z = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Read, $false)
    try {
      $sr = New-Object System.IO.StreamReader($z.GetEntry('word/document.xml').Open())
      $x = $sr.ReadToEnd(); $sr.Close()
      $title = [regex]::Match($x, 'o:title="([^"]*)"').Groups[1].Value
      $gif = $null
      foreach ($e in $z.Entries) { if ($e.FullName -match '^word/media/') { $gif = $e } }
      $ms = New-Object System.IO.MemoryStream
      $s = $gif.Open(); $s.CopyTo($ms); $s.Close()
      $ms.Position = 0
      $bmp = New-Object System.Drawing.Bitmap($ms)
      $hex = ''
      for ($yy = 0; $yy -lt 8; $yy++) {
        $byte = 0
        for ($xx = 0; $xx -lt 8; $xx++) {
          $c = $bmp.GetPixel($xx, $yy)
          if ($c.R -lt 128) { $byte = $byte -bor (0x80 -shr $xx) }
        }
        $hex += ('{0:x2}' -f $byte)
      }
      $bmp.Dispose()
      $t = [System.Text.Encoding]::UTF8.GetBytes($title)
      $lines += ("$n`t$hex`t" + [Convert]::ToBase64String($t) + "`t" + $gif.Length + "`t" + $bmp.Width)
    } finally { $z.Dispose() }
  }
} finally { $word.Quit() }
[System.IO.File]::WriteAllText([string](Join-Path $outDir 'patterns.txt'), ($lines -join "`n") + "`n")
"ok " + $lines.Count

# Abre no Word (COM, invisivel) os .docx que o editor gravou com sumario
# (edit-check --only toc --save-toc <pasta>) e confere: o Word abre; ve o sumario
# (TablesOfContents); as entradas que gravamos sao as que o Word gera ao
# atualizar o MESMO sumario; e, regravado pelo Word, o controle de conteudo do
# sumario (docPartGallery "Table of Contents") continua no document.xml.
# Saida: results/open-check.txt (uma linha por documento). ASCII puro.
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/toc-lab/open-check.ps1 -Dir <pasta>
param([Parameter(Mandatory = $true)][string]$Dir)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$outDir = [string](Join-Path $PSScriptRoot 'results')
$tmp = [string](Join-Path $env:TEMP 'officenext-toc-open')
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$lines = New-Object System.Collections.ArrayList
$norm = { param($t) (([string]$t -split "`r") | ForEach-Object { (($_ -replace '\t[^\t]*$', '') -replace '[^\p{L}\p{N}]', '') } | Where-Object { $_ -ne '' }) -join '|' }
function DocXml([string]$p) {
  $fs = New-Object System.IO.FileStream($p, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  $z = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Read, $false)
  try { $sr = New-Object System.IO.StreamReader($z.GetEntry('word/document.xml').Open()); $x = $sr.ReadToEnd(); $sr.Close(); return $x } finally { $z.Dispose() }
}
try {
  foreach ($f in (Get-ChildItem -LiteralPath $Dir -Filter '*.docx')) {
    [string]$path = $f.FullName
    $status = 'ok'; $info = ''
    try {
      $d = $word.Documents.Open($path, $false, $false, $false)
      try {
        $n = $d.TablesOfContents.Count
        $sdtBefore = ([regex]::Matches((DocXml $path), 'docPartGallery w:val="Table of Contents"')).Count
        $info = "tocs=$n sdt=$sdtBefore"
        if ($n -gt 0) {
          if ($d.TrackRevisions) { $d.TrackRevisions = $false }
          $ours = & $norm $d.TablesOfContents.Item(1).Range.Text
          $null = $d.TablesOfContents.Item(1).Update()
          $wd = & $norm $d.TablesOfContents.Item(1).Range.Text
          if ($ours -ne $wd) { $status = 'toc-differs'; $info += " ours=[$ours] word=[$wd]" } else { $info += " entries=[$ours]" }
        }
        [string]$re = Join-Path $tmp ('re-' + $f.Name)
        $d.SaveAs2($re, 16)
        $sdtAfter = ([regex]::Matches((DocXml $re), 'docPartGallery w:val="Table of Contents"')).Count
        $info += " sdtAfterWordSave=$sdtAfter"
        if ($sdtAfter -ne $sdtBefore -and $status -eq 'ok') { $status = 'sdt-lost' }
      } finally { $d.Close(0) }
    } catch { $status = 'open-failed'; $info = $_.Exception.Message }
    [void]$lines.Add("$($f.Name)`t$status`t$info")
    Write-Host "$($f.Name) $status $info"
  }
} finally {
  [System.IO.File]::WriteAllLines([string](Join-Path $outDir 'open-check.txt'), $lines)
  $word.Quit()
}

# Abre cada .docx da pasta (Word invisivel, somente leitura) e exporta o PDF ao lado.
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File export-pdf.ps1 -Dir <pasta>
param([string]$Dir)
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  foreach ($f in Get-ChildItem -Path $Dir -Filter *.docx) {
    $p = [string]$f.FullName
    $doc = $word.Documents.Open($p, $false, $true, $false)
    try {
      $doc.ExportAsFixedFormat([string]($p -replace '\.docx$', '.pdf'), 17)
      "ok " + $f.Name
    } finally { $doc.Close(0) }
  }
} finally { $word.Quit() }

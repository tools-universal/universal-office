# Oraculo da frente Cabecalho e rodape (lote 4): resultado de cada imagem de
# data/hora (\@) no Word para uma data fixa (quinta-feira, 5/2/2026 14:07:09 --
# dia e mes de um digito separam d de dd), em pt-BR e en-US. Campo QUOTE com a
# data e o \@ (o Word formata a data citada como no DATE/TIME).
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -File hf-oracle4.ps1
# Saida: results/datetime-formats.txt (uma linha por idioma e imagem).
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
$ErrorActionPreference = 'Stop'
$outDir = [string](Join-Path $PSScriptRoot 'results')
$pt = @('dd/MM/yyyy', "dddd, d' de 'MMMM' de 'yyyy", "d' de 'MMMM' de 'yyyy", 'dd/MM/yy', 'yyyy-MM-dd', 'd-MMM-yy',
  'dd.MM.yyyy', 'd MMM. yy', "d' de 'MMMM' de 'yy", "MMMM' de 'yy", 'MMM-yy', 'dd/MM/yyyy HH:mm', 'dd/MM/yyyy HH:mm:ss',
  'h:mm am/pm', 'h:mm AM/PM', 'h:mm:ss AM/PM', 'HH:mm', 'HH:mm:ss')
$en = @('M/d/yyyy', 'dddd, MMMM d, yyyy', 'MMMM d, yyyy', 'M/d/yy', 'yyyy-MM-dd', 'd-MMM-yy', 'M.d.yyyy', 'MMM. d, yy',
  'd MMMM yyyy', 'MMMM yy', 'MMM-yy', 'M/d/yyyy h:mm am/pm', 'M/d/yyyy h:mm AM/PM', 'M/d/yyyy h:mm:ss AM/PM', 'h:mm AM/PM', 'h:mm:ss AM/PM',
  'HH:mm', 'HH:mm:ss')
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$lines = New-Object System.Collections.ArrayList
try {
  $doc = $word.Documents.Add()
  foreach ($set in @(@(1046, $pt, '05/02/2026 14:07:09'), @(1033, $en, '2/5/2026 2:07:09 PM'))) {
    $lang = [int]$set[0]; $quoted = [string]$set[2]
    foreach ($pic in $set[1]) {
      $doc.Content.Delete() | Out-Null
      $doc.Content.LanguageID = $lang
      $r = $doc.Content
      $f = $doc.Fields.Add($r, -1, "QUOTE `"$quoted`" \@ `"$pic`"", $false)
      $f.Update() | Out-Null
      [void]$lines.Add("$lang`t$pic`t" + [string]$f.Result.Text)
    }
  }
  $doc.Close(0)
} finally { $word.Quit() }
[System.IO.File]::WriteAllLines([string](Join-Path $outDir 'datetime-formats.txt'), [string[]]$lines, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "ok $($lines.Count)"

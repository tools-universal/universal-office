# Lista os comandos internos do Word (Application.ListCommands) que tratam de
# sumario/TOC/TC, para achar um jeito de acionar "Adicionar Texto" sem a
# interface. Saida: results/commands.txt. ASCII puro.
# Uso: node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/toc-lab/list-commands.ps1
$ErrorActionPreference = 'Stop'
$outDir = [string](Join-Path $PSScriptRoot 'results')
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $keep = $word.Documents.Add()
  $word.ListCommands($true)
  $doc = $word.ActiveDocument
  $t = $doc.Tables(1)
  $out = New-Object System.Collections.ArrayList
  $rows = $t.Rows.Count
  for ($i = 1; $i -le $rows; $i++) {
    $name = $t.Cell($i, 1).Range.Text -replace "[`r`a]", ''
    if ($name -match '.') {
      $line = $name
      for ($c = 2; $c -le $t.Columns.Count; $c++) { try { $line += "`t" + ($t.Cell($i, $c).Range.Text -replace "[`r`a]", '') } catch { } }
      [void]$out.Add($line)
    }
  }
  [System.IO.File]::WriteAllLines([string](Join-Path $outDir 'commands.txt'), $out)
  Write-Host "ok $($out.Count) de $rows"
  $doc.Close(0)
  $keep.Close(0)
} finally {
  $word.Quit()
}

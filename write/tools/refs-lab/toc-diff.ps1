# Diferenca entre o sumario atualizado pelo editor e o que o Word gera ao atualizar o
# mesmo campo (saida do edit-check --only toccorpus): imprime as entradas que diferem.
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/refs-lab/toc-diff.ps1 -Dir <pasta> -Names 6,11
param([string]$Dir, [string]$Names)
$ErrorActionPreference = 'Stop'
$w = New-Object -ComObject Word.Application
$w.Visible = $false
$w.DisplayAlerts = 0
foreach ($n in ($Names -split ',')) {
  [string]$f = Join-Path $Dir ($n + '.docx')
  $d = $w.Documents.Open($f, $false, $true, $false)
  try {
    $toc = $d.TablesOfContents.Item(1)
    $ours = @(([string]$toc.Range.Text) -split "`r")
    $null = $toc.Update()
    $word = @(([string]$d.TablesOfContents.Item(1).Range.Text) -split "`r")
    Write-Host "== $n ours=$($ours.Count) word=$($word.Count)"
    $m = [math]::Max($ours.Count, $word.Count)
    $shown = 0
    for ($i = 0; $i -lt $m -and $shown -lt 6; $i++) {
      $a = if ($i -lt $ours.Count) { $ours[$i] } else { '' }
      $b = if ($i -lt $word.Count) { $word[$i] } else { '' }
      $na = ($a -replace '\t[^\t]*$', '') -replace '[^\p{L}\p{N}]', ''
      $nb = ($b -replace '\t[^\t]*$', '') -replace '[^\p{L}\p{N}]', ''
      if ($na -ne $nb) { Write-Host "  [$i] ours=[$($a -replace "`t", '<TAB>')]"; Write-Host "  [$i] word=[$($b -replace "`t", '<TAB>')]"; $shown++ }
    }
  } finally { $d.Close(0) }
}
if ($w.Documents.Count -eq 0) { $w.Quit() }

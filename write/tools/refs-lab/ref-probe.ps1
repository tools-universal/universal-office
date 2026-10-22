# Texto do indicador RefLossless e resultado do REF a ele antes/depois de atualizar
# (saida do lossless-check --refs que o word-open-check -Refs marcou ref-result).
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/refs-lab/ref-probe.ps1 -Dir <pasta> -Names 182,540
param([string]$Dir, [string]$Names)
$ErrorActionPreference = 'Stop'
$w = New-Object -ComObject Word.Application
$w.Visible = $false
$w.DisplayAlerts = 0
foreach ($n in ($Names -split ',')) {
  [string]$f = Join-Path $Dir ($n + '.docx')
  $d = $w.Documents.Open($f, $false, $true, $false)
  try {
    $bm = $d.Bookmarks.Item('RefLossless')
    $bt = [string]$bm.Range.Text
    Write-Host "== $n indicador [$bt] ($($bm.Range.Start)-$($bm.Range.End)) story $($bm.StoryType)"
    foreach ($fl in $d.Fields) {
      $c = [string]$fl.Code.Text
      if ($c.Contains('REF RefLossless')) {
        $before = [string]$fl.Result.Text
        $null = $fl.Update()
        $after = [string]$fl.Result.Text
        $codes = ($after.ToCharArray() | ForEach-Object { [int]$_ }) -join ','
        Write-Host "  REF antes [$before] depois [$after] ($codes) tipo $($fl.Type)"
      }
    }
  } finally { $d.Close(0) }
}
if ($w.Documents.Count -eq 0) { $w.Quit() }

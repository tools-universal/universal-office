# Atualiza o REF RefLossless no Word e salva uma copia (para ler o XML que o Word grava
# no resultado). Saida: <Out>.
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/refs-lab/ref-save.ps1 -Path <docx> -Out <docx>
param([string]$Path, [string]$Out)
$ErrorActionPreference = 'Stop'
$w = New-Object -ComObject Word.Application
$w.Visible = $false
$w.DisplayAlerts = 0
[string]$p = $Path
[string]$o = $Out
$d = $w.Documents.Open($p, $false, $true, $false)
try {
  try { $d.TrackRevisions = $false } catch { Write-Host "TrackRevisions: protegido" }
  foreach ($fl in $d.Fields) {
    if (([string]$fl.Code.Text) -match 'REF RefLossless') { $null = $fl.Update(); Write-Host ("REF [" + [string]$fl.Result.Text + "] revisoes " + $d.Revisions.Count) }
  }
  $d.SaveAs2($o, 16)
} finally { $d.Close(0) }
if ($w.Documents.Count -eq 0) { $w.Quit() }

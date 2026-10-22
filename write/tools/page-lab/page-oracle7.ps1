# Oraculo da frente Pagina (lote 7): o LADRILHO que o Word desenha para cada
# gradiente de pagina -- salvar como pagina da Web filtrada grava o ladrilho
# (1025x769 px) em <nome>_arquivos/image001.png (fora do git) -- e o v:fill de
# cada estilo/variante, 1 cor (escurecer/clarear) e predefinido.
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File page-oracle7.ps1 [-Only a,b]
param([string]$Only = '')
. (Join-Path $PSScriptRoot 'page-oracle-lib.ps1')
$tileDir = [string]'E:\UniversalWriteTest\_lab\page\tiles'
New-Item -ItemType Directory -Force -Path $tileDir | Out-Null
function Rgb([int]$r, [int]$g, [int]$b) { return $r + 256 * $g + 65536 * $b }
function Web($doc, [string]$name) { $doc.SaveAs2([string](Join-Path $tileDir ($name + '.htm')), 10) }

foreach ($st in @(1, 2, 3, 4, 5, 7)) {
  foreach ($va in @(1, 2, 3, 4)) {
    if ($st -eq 7 -and $va -gt 2) { continue }
    Run-Exp ("tl-$st-$va") { param($doc, $sel) $sel.TypeText('Corpo') } {
      param($doc, $sel, $log)
      $f = $doc.Background.Fill
      $f.Visible = -1; $f.ForeColor.RGB = (Rgb 255 0 0); $f.BackColor.RGB = (Rgb 0 0 255)
      $f.TwoColorGradient($st, $va)
      Web $doc ("tl-$st-$va")
    }
  }
}
foreach ($dg in @(0, 0.25, 0.5, 0.75, 1)) {
  Run-Exp ("tl-one-$dg") { param($doc, $sel) $sel.TypeText('Corpo') } {
    param($doc, $sel, $log)
    $f = $doc.Background.Fill
    $f.Visible = -1; $f.ForeColor.RGB = (Rgb 0 128 0)
    $f.OneColorGradient(1, 1, $dg)
    Web $doc ("tl-one-$dg")
  }
}
# cores mais claras (mistura em gama?) e tema
Run-Exp 'tl-mix' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill
  $f.Visible = -1; $f.ForeColor.RGB = (Rgb 255 255 0); $f.BackColor.RGB = (Rgb 0 128 255)
  $f.TwoColorGradient(1, 1)
  Web $doc 'tl-mix'
}
Run-Exp 'tl-preset' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill
  $f.Visible = -1; $f.PresetGradient(1, 1, 1)
  Web $doc 'tl-preset'
}
Close-Word

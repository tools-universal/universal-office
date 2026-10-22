# Oraculo da frente Pagina (lote 4): tamanho do ladrilho que o Word usa no PDF
# para o plano de fundo -- imagem (frame) e textura (tile) de varios tamanhos e
# DPI, gradiente em paisagem/carta, padrao -- e se a pagina 2 continua o ladrilho.
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File page-oracle4.ps1 [-Only a,b]
param([string]$Only = '')
. (Join-Path $PSScriptRoot 'page-oracle-lib.ps1')
Add-Type -AssemblyName System.Drawing

function Make-Png([string]$name, [int]$w, [int]$h, [float]$dpi) {
  $p = [string](Join-Path $tmp $name)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $bmp.SetResolution($dpi, $dpi)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(255, 30, 90, 200))
  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 240, 200, 40))), 0, 0, [int]($w / 2), [int]($h / 2))
  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 200, 30, 30))), [int]($w * 3 / 4), [int]($h * 3 / 4), [int]($w / 4), [int]($h / 4))
  $g.Dispose()
  $bmp.Save($p, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
  return $p
}
function Rgb([int]$r, [int]$g, [int]$b) { return $r + 256 * $g + 65536 * $b }

$pics = @(
  @('p40', 40, 30, 96), @('p800', 800, 600, 96), @('p800d300', 800, 600, 300), @('p2000', 2000, 1500, 96), @('ptall', 300, 900, 96)
)
foreach ($pc in $pics) {
  $file = Make-Png ($pc[0] + '.png') $pc[1] $pc[2] $pc[3]
  Run-Exp ("bg-frame-" + $pc[0]) { param($doc, $sel) $sel.TypeText('Corpo') } {
    param($doc, $sel, $log) $f = $doc.Background.Fill; $f.Visible = -1; $f.UserPicture($file)
  } '' $false $true
  Run-Exp ("bg-tile-" + $pc[0]) { param($doc, $sel) $sel.TypeText('Corpo') } {
    param($doc, $sel, $log) $f = $doc.Background.Fill; $f.Visible = -1; $f.UserTextured($file)
  } '' $false $true
}
Run-Exp 'bg-grad-land' { param($doc, $sel) $sel.TypeText('Corpo'); $doc.Sections(1).PageSetup.Orientation = 1 } {
  param($doc, $sel, $log) $f = $doc.Background.Fill; $f.Visible = -1; $f.ForeColor.RGB = (Rgb 255 0 0); $f.BackColor.RGB = (Rgb 0 0 255); $f.TwoColorGradient(1, 1)
} '' $false $true
Run-Exp 'bg-grad-2pages' { param($doc, $sel) $sel.TypeText('Corpo'); $sel.InsertBreak(7); $sel.TypeText('P2') } {
  param($doc, $sel, $log) $f = $doc.Background.Fill; $f.Visible = -1; $f.ForeColor.RGB = (Rgb 255 0 0); $f.BackColor.RGB = (Rgb 0 0 255); $f.TwoColorGradient(2, 1)
} '' $false $true
Run-Exp 'bg-pattern-2pages' { param($doc, $sel) $sel.TypeText('Corpo'); $sel.InsertBreak(7); $sel.TypeText('P2') } {
  param($doc, $sel, $log) $f = $doc.Background.Fill; $f.Visible = -1; $f.ForeColor.RGB = (Rgb 200 0 0); $f.BackColor.RGB = (Rgb 255 255 200); $f.Patterned(41)
} '' $false $true
Close-Word

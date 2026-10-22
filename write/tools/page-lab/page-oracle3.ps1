# Oraculo da frente Pagina (lote 3): como o Word DESENHA o plano de fundo -- na
# tela (Page.EnhMetaFileBits -> EMF -> PNG pelo GDI+) e no PDF -- para gradientes
# (estilos/variantes), padrao, imagem e textura; e o que DisplayBackgrounds grava.
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File page-oracle3.ps1 [-Only a,b]
param([string]$Only = '')
. (Join-Path $PSScriptRoot 'page-oracle-lib.ps1')
Add-Type -AssemblyName System.Drawing
$pngDir = [string]'E:\UniversalWriteTest\_lab\page\png'
New-Item -ItemType Directory -Force -Path $pngDir | Out-Null

$png = [string](Join-Path $tmp 'quad.png')
$bmp = New-Object System.Drawing.Bitmap 40, 30
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(255, 30, 90, 200))
$g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 240, 200, 40))), 0, 0, 20, 15)
$g.Dispose()
$bmp.Save($png, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()

function Rgb([int]$r, [int]$g, [int]$b) { return $r + 256 * $g + 65536 * $b }
function Emf($doc, [string]$name, $log) {
  try {
    $bits = $doc.ActiveWindow.ActivePane.Pages.Item(1).EnhMetaFileBits
    $emf = [string](Join-Path $pngDir ($name + '.emf'))
    [System.IO.File]::WriteAllBytes($emf, [byte[]]$bits)
    $mf = New-Object System.Drawing.Imaging.Metafile($emf)
    $w = 298; $h = 421
    $out = New-Object System.Drawing.Bitmap $w, $h
    $gg = [System.Drawing.Graphics]::FromImage($out)
    $gg.Clear([System.Drawing.Color]::Magenta)
    $gg.DrawImage($mf, 0, 0, $w, $h)
    $gg.Dispose(); $mf.Dispose()
    $out.Save([string](Join-Path $pngDir ($name + '-screen.png')), [System.Drawing.Imaging.ImageFormat]::Png)
    $col = @()
    for ($y = 0; $y -lt $h; $y += 10) { $c = $out.GetPixel(149, $y); $col += ('{0:X2}{1:X2}{2:X2}' -f $c.R, $c.G, $c.B) }
    $row = @()
    for ($x = 0; $x -lt $w; $x += 10) { $c = $out.GetPixel($x, 210); $row += ('{0:X2}{1:X2}{2:X2}' -f $c.R, $c.G, $c.B) }
    $out.Dispose()
    [void]$log.Add("emf col: " + ($col -join ' '))
    [void]$log.Add("emf row: " + ($row -join ' '))
  } catch { [void]$log.Add("emf ERR " + $_.Exception.Message) }
}
function Grad($doc, [int]$st, [int]$va) {
  $f = $doc.Background.Fill
  $f.Visible = -1
  $f.ForeColor.RGB = (Rgb 255 0 0); $f.BackColor.RGB = (Rgb 0 0 255)
  $f.TwoColorGradient($st, $va)
}

Run-Exp 'sc-solid' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill; $f.ForeColor.RGB = (Rgb 255 255 0); $f.Visible = -1; $f.Solid()
  [void]$log.Add("DisplayBackgrounds=" + $doc.ActiveWindow.View.DisplayBackgrounds)
  Emf $doc 'sc-solid' $log
}
Run-Exp 'sc-solid-disp' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill; $f.ForeColor.RGB = (Rgb 255 255 0); $f.Visible = -1; $f.Solid()
  $doc.ActiveWindow.View.DisplayBackgrounds = $true
  [void]$log.Add("DisplayBackgrounds=" + $doc.ActiveWindow.View.DisplayBackgrounds)
  Emf $doc 'sc-solid-disp' $log
}
foreach ($c in @(@(1, 1), @(1, 2), @(1, 3), @(1, 4), @(2, 1), @(3, 1), @(4, 1), @(5, 1), @(5, 4), @(7, 1), @(7, 2))) {
  $st = $c[0]; $va = $c[1]
  Run-Exp ("sc-grad-$st-$va") { param($doc, $sel) $sel.TypeText('Corpo') } {
    param($doc, $sel, $log) Grad $doc $st $va; Emf $doc ("sc-grad-$st-$va") $log
  } '' $false $true
}
Run-Exp 'sc-grad1' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill; $f.Visible = -1; $f.ForeColor.RGB = (Rgb 0 128 0); $f.OneColorGradient(1, 1, 0.3)
  Emf $doc 'sc-grad1' $log
} '' $false $true
Run-Exp 'sc-pattern-7' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill; $f.Visible = -1; $f.ForeColor.RGB = (Rgb 200 0 0); $f.BackColor.RGB = (Rgb 255 255 200); $f.Patterned(7)
  Emf $doc 'sc-pattern-7' $log
} '' $false $true
Run-Exp 'sc-picture' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill; $f.Visible = -1; $f.UserPicture($png)
  Emf $doc 'sc-picture' $log
} '' $false $true
Run-Exp 'sc-texture' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill; $f.Visible = -1; $f.UserTextured($png)
  Emf $doc 'sc-texture' $log
} '' $false $true
# carta: o gradiente acompanha o papel?
Run-Exp 'sc-grad-letter' { param($doc, $sel) $sel.TypeText('Corpo'); $doc.Sections(1).PageSetup.PaperSize = 2 } {
  param($doc, $sel, $log) Grad $doc 1 1; Emf $doc 'sc-grad-letter' $log
} '' $false $true
Close-Word

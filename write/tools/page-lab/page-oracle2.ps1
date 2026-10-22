# Oraculo da frente Pagina (lote 2, cor da pagina): XML de Document.Background
# (cor solida, cor do tema com tom/sombra, sem cor, gradiente de 1 e 2 cores em
# cada estilo/variante, padroes, imagem, textura do usuario, transparencia),
# displayBackgroundShape e o PDF com e sem "imprimir cores e imagens de fundo".
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File page-oracle2.ps1 [-Only a,b]
param([string]$Only = '')
. (Join-Path $PSScriptRoot 'page-oracle-lib.ps1')

Add-Type -AssemblyName System.Drawing
$png = [string](Join-Path $tmp 'quad.png')
$bmp = New-Object System.Drawing.Bitmap 40, 30
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(255, 30, 90, 200))
$g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 240, 200, 40))), 0, 0, 20, 15)
$g.Dispose()
$bmp.Save($png, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()

$printBg = $word.Options.PrintBackground
$printBgs = $null
try { $printBgs = $word.Options.PrintBackgrounds } catch { }
Write-Host "Options.PrintBackground=$printBg PrintBackgrounds=$printBgs DisplayBackgrounds?"

function Body($doc, $sel) { $sel.TypeText('Corpo') }
function Rgb([int]$r, [int]$g, [int]$b) { return $r + 256 * $g + 65536 * $b }

Run-Exp 'pc-solid' { param($doc, $sel) Body $doc $sel } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill
  $f.ForeColor.RGB = (Rgb 255 255 0); $f.Visible = -1; $f.Solid()
  [void]$log.Add("displayBackgrounds=" + $doc.ActiveWindow.View.DisplayBackgrounds)
} '' $false $true
Run-Exp 'pc-solid-printbg' { param($doc, $sel) Body $doc $sel; $word.Options.PrintBackgrounds = $true } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill
  $f.ForeColor.RGB = (Rgb 255 255 0); $f.Visible = -1; $f.Solid()
} '' $false $true
$word.Options.PrintBackgrounds = $false
Run-Exp 'pc-solid-noprintbg' { param($doc, $sel) Body $doc $sel } {
  param($doc, $sel, $log)
  [void]$log.Add("PrintBackgrounds=" + $word.Options.PrintBackgrounds)
  $f = $doc.Background.Fill
  $f.ForeColor.RGB = (Rgb 255 255 0); $f.Visible = -1; $f.Solid()
} '' $false $true
if ($printBgs -ne $null) { $word.Options.PrintBackgrounds = $printBgs }
Run-Exp 'pc-white' { param($doc, $sel) Body $doc $sel } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill
  $f.ForeColor.RGB = (Rgb 255 255 255); $f.Visible = -1; $f.Solid()
}
Run-Exp 'pc-none' { param($doc, $sel) Body $doc $sel; $f = $doc.Background.Fill; $f.ForeColor.RGB = (Rgb 255 255 0); $f.Visible = -1; $f.Solid() } {
  param($doc, $sel, $log) $doc.Background.Fill.Visible = 0
}
foreach ($tc in @(@(5, 0.8), @(5, 0.6), @(5, 0.4), @(5, -0.25), @(5, -0.5), @(14, -0.05), @(13, 0.5), @(10, 0))) {
  $idx = $tc[0]; $ts = $tc[1]
  Run-Exp ("pc-theme-$idx-$ts") { param($doc, $sel) Body $doc $sel } {
    param($doc, $sel, $log)
    $f = $doc.Background.Fill
    $f.Visible = -1; $f.Solid()
    $f.ForeColor.ObjectThemeColor = $idx
    $f.ForeColor.TintAndShade = $ts
    [void]$log.Add("rgb=" + $f.ForeColor.RGB + " brightness=" + $f.ForeColor.Brightness)
  }
}
# gradiente: estilos 1 horiz, 2 vert, 3 diag cima, 4 diag baixo, 5 do canto, 7 do centro; variantes 1..4
foreach ($st in @(1, 2, 3, 4, 5, 7)) {
  foreach ($va in @(1, 2, 3, 4)) {
    if ($st -eq 7 -and $va -gt 2) { continue }
    Run-Exp ("pc-grad2-$st-$va") { param($doc, $sel) Body $doc $sel } {
      param($doc, $sel, $log)
      $f = $doc.Background.Fill
      $f.Visible = -1
      $f.ForeColor.RGB = (Rgb 255 0 0); $f.BackColor.RGB = (Rgb 0 0 255)
      $f.TwoColorGradient($st, $va)
    } '' $false ($st -eq 1 -and $va -eq 1)
  }
}
Run-Exp 'pc-grad1' { param($doc, $sel) Body $doc $sel } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill
  $f.Visible = -1; $f.ForeColor.RGB = (Rgb 0 128 0)
  $f.OneColorGradient(1, 1, 0.3)
} '' $false $true
Run-Exp 'pc-grad1-dark' { param($doc, $sel) Body $doc $sel } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill
  $f.Visible = -1; $f.ForeColor.RGB = (Rgb 0 128 0)
  $f.OneColorGradient(2, 2, 0.8)
}
Run-Exp 'pc-grad2-transp' { param($doc, $sel) Body $doc $sel } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill
  $f.Visible = -1; $f.ForeColor.RGB = (Rgb 255 0 0); $f.BackColor.RGB = (Rgb 0 0 255)
  $f.TwoColorGradient(1, 1)
  $f.Transparency = 0.3
  try { $f.GradientStops.Item(2).Transparency = 0.7 } catch { [void]$log.Add("stops: " + $_.Exception.Message) }
}
Run-Exp 'pc-grad-preset' { param($doc, $sel) Body $doc $sel } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill
  $f.Visible = -1
  $f.PresetGradient(1, 1, 1)
}
foreach ($pt in @(1, 2, 7, 13, 21, 26, 41, 48)) {
  Run-Exp ("pc-pattern-$pt") { param($doc, $sel) Body $doc $sel } {
    param($doc, $sel, $log)
    $f = $doc.Background.Fill
    $f.Visible = -1; $f.ForeColor.RGB = (Rgb 200 0 0); $f.BackColor.RGB = (Rgb 255 255 200)
    $f.Patterned($pt)
  } '' $false ($pt -eq 7)
}
Run-Exp 'pc-picture' { param($doc, $sel) Body $doc $sel } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill
  $f.Visible = -1; $f.UserPicture($png)
} '' $false $true
Run-Exp 'pc-texture' { param($doc, $sel) Body $doc $sel } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill
  $f.Visible = -1; $f.UserTextured($png)
} '' $false $true
Run-Exp 'pc-preset-texture' { param($doc, $sel) Body $doc $sel } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill
  $f.Visible = -1; $f.PresetTextured(1)
}
# solido que vira gradiente e volta: sobra v:fill?
Run-Exp 'pc-grad-then-solid' { param($doc, $sel) Body $doc $sel; $f = $doc.Background.Fill; $f.Visible = -1; $f.ForeColor.RGB = (Rgb 255 0 0); $f.BackColor.RGB = (Rgb 0 0 255); $f.TwoColorGradient(1, 1) } {
  param($doc, $sel, $log)
  $f = $doc.Background.Fill
  $f.ForeColor.RGB = (Rgb 0 200 0); $f.Solid()
}
Close-Word

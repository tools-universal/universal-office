# Oraculo da frente Pagina (lote 5): marca-d'agua no PDF (texto diagonal e
# horizontal, imagem desbotada e normal) e o XML que o caminho do diretor de
# macros do dialogo grava para a imagem (Shapes.AddPicture + ColorType marca).
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File page-oracle5.ps1 [-Only a,b]
param([string]$Only = '')
. (Join-Path $PSScriptRoot 'page-oracle-lib.ps1')
Add-Type -AssemblyName System.Drawing

$pic = [string](Join-Path $tmp 'wm.png')
$bmp = New-Object System.Drawing.Bitmap 400, 200
$bmp.SetResolution(96, 96)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(255, 30, 90, 200))
$g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 240, 200, 40))), 0, 0, 200, 100)
$g.Dispose()
$bmp.Save($pic, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()

$cf1 = Find-BB 8 'CONFIDENCIAL 1'
$cf2 = Find-BB 8 'CONFIDENCIAL 2'
function AllHeaders($doc, $bb) { foreach ($t in @(1, 2, 3)) { [void]$bb.Insert($doc.Sections(1).Headers($t).Range, $true) } }

Run-Exp 'wp-cf1' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log) AllHeaders $doc $cf1
} '' $false $true
Run-Exp 'wp-cf2' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log) AllHeaders $doc $cf2
} '' $false $true
# imagem como o diretor de macros grava o dialogo: AddPicture no cabecalho, nome
# WordPictureWatermark, ColorType = msoPictureWatermark (4), atras do texto, centro na margem
foreach ($wash in @($true, $false)) {
  Run-Exp ("wp-pic-" + $wash) { param($doc, $sel) $sel.TypeText('Corpo') } {
    param($doc, $sel, $log)
    $h = $doc.Sections(1).Headers(1)
    $s = $h.Shapes.AddPicture($pic, $false, $true)
    $s.Name = 'WordPictureWatermark123456'
    if ($wash) { $s.PictureFormat.ColorType = 4 }
    $s.LockAspectRatio = -1
    $s.WrapFormat.AllowOverlap = -1
    $s.WrapFormat.Side = 3
    $s.WrapFormat.Type = 3
    $s.RelativeHorizontalPosition = 0
    $s.RelativeVerticalPosition = 0
    $s.Left = -999995
    $s.Top = -999995
    [void]$log.Add("w=" + $s.Width + " h=" + $s.Height + " bright=" + $s.PictureFormat.Brightness + " contrast=" + $s.PictureFormat.Contrast)
  } '' $false $true
}
Close-Word

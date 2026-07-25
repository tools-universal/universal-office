# Deck 5 de ESTRESSE (stress-advanced): recursos ainda nao exercitados pelos
# decks A-D — multi-coluna, SmartArt, fill em ladrilho, grupos escalados,
# action buttons, tabela SEM estilo com bordas custom, texto com espacamento.
# Uso: powershell -ExecutionPolicy Bypass -File tools/ppt-lab/gen-stress2.ps1
$ErrorActionPreference = 'Stop'
$labRoot = $PSScriptRoot
$repoRoot = Split-Path (Split-Path $labRoot)
$samplesDir = Join-Path $repoRoot 'samples'
$stressDir = Join-Path $labRoot 'results\stress'
$assetsDir = Join-Path $stressDir 'assets'

function RGB([int]$r, [int]$g, [int]$b) { return $r + ($g -shl 8) + ($b -shl 16) }
function Try-Step([string]$label, [scriptblock]$block) {
  try { & $block } catch { Write-Host "SKIP ($label): $($_.Exception.Message)" }
}
function Export-Deck($pres, [string]$name) {
  $pptxPath = Join-Path $samplesDir "$name.pptx"
  $pres.SaveAs($pptxPath, 24)
  $pngDir = Join-Path $stressDir "$name\ppt"
  if (Test-Path $pngDir) { Remove-Item -Recurse -Force $pngDir }
  New-Item -ItemType Directory -Force -Path $pngDir | Out-Null
  for ($i = 1; $i -le $pres.Slides.Count; $i++) {
    $pres.Slides.Item($i).Export((Join-Path $pngDir "slide$i.png"), 'PNG', 1280, 720)
  }
  $xmlDir = Join-Path $stressDir "$name\xml"
  if (Test-Path $xmlDir) { Remove-Item -Recurse -Force $xmlDir }
  $zip = "$pptxPath.zip"
  Copy-Item $pptxPath $zip -Force
  Expand-Archive $zip -DestinationPath $xmlDir -Force
  Remove-Item $zip
  Write-Host "deck $name -> $($pres.Slides.Count) slides"
}

$img1 = Join-Path $assetsDir 'checker.png'
$ppt = $null
try {
  $ppt = New-Object -ComObject PowerPoint.Application
  try { $ppt.WindowState = 2 } catch {}
  $p = $ppt.Presentations.Add($true)
  $p.PageSetup.SlideSize = 15
  $w = $p.PageSetup.SlideWidth; $h = $p.PageSetup.SlideHeight

  # Slide 1: texto multi-coluna + espacamento de letras + tabs
  $s = $p.Slides.Add(1, 12)
  Try-Step 'multicoluna' {
    $tb = $s.Shapes.AddTextbox(1, 30, 30, 620, 300)
    $tb.TextFrame2.Column.Number = 2
    $tb.TextFrame2.Column.Spacing = 20
    $tb.TextFrame2.TextRange.Text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
    $tb.Line.Visible = -1; $tb.Line.ForeColor.RGB = RGB 180 180 180
  }
  Try-Step 'espacamento' {
    $tb2 = $s.Shapes.AddTextbox(1, 680, 30, 260, 140)
    $tb2.TextFrame2.TextRange.Text = "Espacado 4pt`r`nNormal"
    $tb2.TextFrame2.TextRange.Paragraphs(1).Font.Spacing = 4
  }
  Try-Step 'vertical-tf2' {
    $sh = $s.Shapes.AddShape(1, 680, 200, 100, 220)
    $sh.Fill.ForeColor.RGB = RGB 230 240 255
    $sh.TextFrame2.Orientation = 5
    $sh.TextFrame2.TextRange.Text = 'Vertical TF2'
    $sh.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = RGB 20 20 20
  }

  # Slide 2: SmartArt basico
  $s = $p.Slides.Add(2, 12)
  Try-Step 'smartart' {
    $layout = $ppt.SmartArtLayouts.Item(1)
    $sa = $s.Shapes.AddSmartArt($layout, 60, 60, 840, 400)
  }

  # Slide 3: fill em ladrilho + grupo ESCALADO (chOff/chExt)
  $s = $p.Slides.Add(3, 12)
  Try-Step 'tile fill' {
    $sh = $s.Shapes.AddShape(5, 40, 40, 300, 200)
    $sh.Fill.UserPicture($img1)
    $sh.Fill.TextureTile = -1
  }
  Try-Step 'grupo escalado' {
    $a = $s.Shapes.AddShape(1, 420, 60, 100, 60); $a.Fill.ForeColor.RGB = RGB 68 114 196
    $b = $s.Shapes.AddShape(9, 540, 60, 100, 60); $b.Fill.ForeColor.RGB = RGB 220 90 40
    $g = $s.Shapes.Range(@($a.Name, $b.Name)).Group()
    # ESCALA o grupo (children mantem coords antigas -> chOff/chExt divergem)
    $g.Width = $g.Width * 1.6
    $g.Height = $g.Height * 1.8
    $g.Left = 420; $g.Top = 200
  }

  # Slide 4: action buttons + tabela SEM estilo com bordas custom
  $s = $p.Slides.Add(4, 12)
  $btns = @(129, 130, 131, 132, 133, 134)  # msoShapeActionButton*
  for ($i = 0; $i -lt $btns.Count; $i++) {
    Try-Step "action $($btns[$i])" {
      $sh = $s.Shapes.AddShape($btns[$i], 30 + $i * 90, 30, 70, 55)
    }
  }
  Try-Step 'tabela custom' {
    $tblShape = $s.Shapes.AddTable(3, 3, 40, 140, 500, 200)
    $tbl = $tblShape.Table
    Try-Step 'sem estilo' { $tblShape.Table.ApplyStyle('', $false) }
    for ($r0 = 1; $r0 -le 3; $r0++) { for ($c0 = 1; $c0 -le 3; $c0++) {
      $cell = $tbl.Cell($r0, $c0)
      $cell.Shape.TextFrame.TextRange.Text = "C$r0$c0"
      $cell.Shape.Fill.ForeColor.RGB = RGB (240 - 20 * $r0) 245 (230 + 5 * $c0)
    } }
    # bordas custom grossas vermelhas na diagonal
    for ($i = 1; $i -le 3; $i++) {
      $bord = $tbl.Cell($i, $i).Borders(3)  # ppBorderBottom
      $bord.ForeColor.RGB = RGB 200 30 30
      $bord.Weight = 3
    }
  }

  Export-Deck $p 'stress-advanced'
  $p.Close()
}
finally {
  if ($ppt) { try { $ppt.Quit() } catch {} }
  if ($ppt) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) }
}
Write-Host 'gen-stress2: OK'

# Gera 4 decks de ESTRESSE com o PowerPoint real (COM) cobrindo o maximo de
# recursos: geometrias, fills, linhas, texto rico, tabelas, charts, midia,
# grupos, fundos, rodapes. Para cada deck: salva .pptx em samples/, exporta
# PNGs de referencia (Slide.Export 1280x720) e extrai o XML indentado.
#
# Uso: powershell -ExecutionPolicy Bypass -File tools/ppt-lab/gen-stress.ps1
$ErrorActionPreference = 'Stop'
$labRoot = $PSScriptRoot
$repoRoot = Split-Path (Split-Path $labRoot)
$samplesDir = Join-Path $repoRoot 'samples'
$stressDir = Join-Path $labRoot 'results\stress'
$assetsDir = Join-Path $stressDir 'assets'
New-Item -ItemType Directory -Force -Path $samplesDir, $stressDir, $assetsDir | Out-Null

function RGB([int]$r, [int]$g, [int]$b) { return $r + ($g -shl 8) + ($b -shl 16) }

# ── imagens de teste (System.Drawing) ──
Add-Type -AssemblyName System.Drawing
$img1 = Join-Path $assetsDir 'photo-gradient.png'
$img2 = Join-Path $assetsDir 'checker.png'
if (-not (Test-Path $img1)) {
  $bmp = New-Object System.Drawing.Bitmap 640, 480
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $rect = New-Object System.Drawing.Rectangle 0, 0, 640, 480
  $br = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255, 30, 90, 200)), ([System.Drawing.Color]::FromArgb(255, 240, 120, 30)), 35.0
  $g.FillRectangle($br, $rect)
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 6
  $g.DrawEllipse($pen, 180, 100, 280, 280)
  $font = New-Object System.Drawing.Font 'Arial', 40, ([System.Drawing.FontStyle]::Bold)
  $g.DrawString('FOTO', $font, [System.Drawing.Brushes]::White, 240, 200)
  $g.Dispose(); $bmp.Save($img1, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
}
if (-not (Test-Path $img2)) {
  $bmp = New-Object System.Drawing.Bitmap 400, 400
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  for ($x = 0; $x -lt 8; $x++) { for ($y = 0; $y -lt 8; $y++) {
    $c = if ((($x + $y) % 2) -eq 0) { [System.Drawing.Brushes]::DarkSlateBlue } else { [System.Drawing.Brushes]::Gold }
    $g.FillRectangle($c, $x * 50, $y * 50, 50, 50)
  } }
  $g.FillEllipse([System.Drawing.Brushes]::Crimson, 120, 120, 160, 160)
  $g.Dispose(); $bmp.Save($img2, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
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
  # extrai XML indentado
  $xmlDir = Join-Path $stressDir "$name\xml"
  if (Test-Path $xmlDir) { Remove-Item -Recurse -Force $xmlDir }
  $zip = "$pptxPath.zip"
  Copy-Item $pptxPath $zip -Force
  Expand-Archive $zip -DestinationPath $xmlDir -Force
  Remove-Item $zip
  Get-ChildItem $xmlDir -Recurse -File | Where-Object { $_.Name -match '\.(xml|rels)$' } | ForEach-Object {
    try {
      $x = [System.Xml.Linq.XDocument]::Load($_.FullName)
      $settings = New-Object System.Xml.XmlWriterSettings
      $settings.Indent = $true
      $wr = [System.Xml.XmlWriter]::Create($_.FullName, $settings)
      $x.Save($wr); $wr.Close()
    } catch {}
  }
  Write-Host "deck $name -> $($pres.Slides.Count) slides"
}

function Try-Step([string]$label, [scriptblock]$block) {
  try { & $block } catch { Write-Host "SKIP ($label): $($_.Exception.Message)" }
}

$ppt = $null
try {
  $ppt = New-Object -ComObject PowerPoint.Application
  try { $ppt.WindowState = 2 } catch {}

  # ════════════════════ DECK A: stress-shapes ════════════════════
  $p = $ppt.Presentations.Add($true)
  $p.PageSetup.SlideSize = 15
  $w = $p.PageSetup.SlideWidth; $h = $p.PageSetup.SlideHeight

  # Slide 1: grade de geometrias preset
  $s = $p.Slides.Add(1, 12)
  $geoms = @(1, 5, 9, 7, 8, 4, 2, 3, 12, 10, 6, 92, 33, 34, 35, 36, 52, 21, 22, 23, 24, 13, 14, 18)
  $cols = 6
  $cw = ($w - 40) / $cols; $ch = 70; $gap = 14
  for ($i = 0; $i -lt $geoms.Count; $i++) {
    $cx = 20 + ($i % $cols) * $cw
    $cy = 20 + [math]::Floor($i / $cols) * ($ch + $gap)
    Try-Step "geom $($geoms[$i])" {
      $sh = $s.Shapes.AddShape($geoms[$i], $cx + 5, $cy, $cw - 24, $ch)
      $sh.Fill.ForeColor.RGB = RGB (60 + 30 * ($i % 7)) (100 + 20 * ($i % 5)) (200 - 15 * ($i % 8))
    }
  }

  # Slide 2: fills — solidos, gradientes, transparencias
  $s = $p.Slides.Add(2, 12)
  Try-Step 'solid' { $sh = $s.Shapes.AddShape(1, 20, 20, 130, 90); $sh.Fill.ForeColor.RGB = RGB 196 114 68 }
  Try-Step 'grad-h' { $sh = $s.Shapes.AddShape(1, 170, 20, 130, 90); $sh.Fill.ForeColor.RGB = RGB 68 114 196; $sh.Fill.BackColor.RGB = RGB 255 255 255; $sh.Fill.TwoColorGradient(1, 1) }
  Try-Step 'grad-v' { $sh = $s.Shapes.AddShape(1, 320, 20, 130, 90); $sh.Fill.ForeColor.RGB = RGB 220 60 60; $sh.Fill.BackColor.RGB = RGB 255 230 120; $sh.Fill.TwoColorGradient(2, 1) }
  Try-Step 'grad-diag' { $sh = $s.Shapes.AddShape(1, 470, 20, 130, 90); $sh.Fill.ForeColor.RGB = RGB 40 160 90; $sh.Fill.BackColor.RGB = RGB 10 40 80; $sh.Fill.TwoColorGradient(3, 2) }
  Try-Step 'grad-center' { $sh = $s.Shapes.AddShape(9, 620, 20, 130, 90); $sh.Fill.ForeColor.RGB = RGB 150 60 200; $sh.Fill.BackColor.RGB = RGB 255 255 255; $sh.Fill.TwoColorGradient(7, 2) }
  Try-Step 'grad-1cor' { $sh = $s.Shapes.AddShape(1, 770, 20, 130, 90); $sh.Fill.ForeColor.RGB = RGB 0 120 144; $sh.Fill.OneColorGradient(1, 1, 0.7) }
  $tr = @(0.25, 0.5, 0.75)
  for ($i = 0; $i -lt 3; $i++) {
    Try-Step "transp $($tr[$i])" {
      $sh = $s.Shapes.AddShape(9, 20 + $i * 150, 140, 130, 90)
      $sh.Fill.ForeColor.RGB = RGB 68 114 196
      $sh.Fill.Transparency = $tr[$i]
      $sh.Line.Visible = 0
    }
  }
  # sobreposicao com transparencia (alpha compositing visivel)
  Try-Step 'overlap' {
    $a = $s.Shapes.AddShape(9, 500, 130, 150, 110); $a.Fill.ForeColor.RGB = RGB 230 60 60; $a.Fill.Transparency = 0.4; $a.Line.Visible = 0
    $b = $s.Shapes.AddShape(9, 570, 130, 150, 110); $b.Fill.ForeColor.RGB = RGB 60 90 230; $b.Fill.Transparency = 0.4; $b.Line.Visible = 0
    $c = $s.Shapes.AddShape(9, 535, 190, 150, 110); $c.Fill.ForeColor.RGB = RGB 60 200 90; $c.Fill.Transparency = 0.4; $c.Line.Visible = 0
  }
  # cores de tema com brilho
  for ($i = 0; $i -lt 6; $i++) {
    Try-Step "theme accent$($i+1)" {
      $sh = $s.Shapes.AddShape(1, 20 + $i * 150, 280, 130, 70)
      $sh.Fill.ForeColor.ObjectThemeColor = 5 + $i
      $sh.TextFrame.TextRange.Text = "accent$($i+1)"
    }
  }
  for ($i = 0; $i -lt 6; $i++) {
    Try-Step "theme brightness" {
      $sh = $s.Shapes.AddShape(1, 20 + $i * 150, 360, 130, 70)
      $sh.Fill.ForeColor.ObjectThemeColor = 5 + $i
      $sh.Fill.ForeColor.Brightness = @(0.4, -0.25)[$i % 2]
      $sh.TextFrame.TextRange.Text = @('claro', 'escuro')[$i % 2]
    }
  }

  # Slide 3: linhas — espessuras, dashes, setas, conectores
  $s = $p.Slides.Add(3, 12)
  $weights = @(0.5, 1.0, 2.25, 4.5, 6.0)
  for ($i = 0; $i -lt $weights.Count; $i++) {
    Try-Step "peso $($weights[$i])" {
      $ln = $s.Shapes.AddLine(30, 30 + $i * 22, 280, 30 + $i * 22)
      $ln.Line.Weight = $weights[$i]
      $ln.Line.ForeColor.RGB = RGB 30 30 30
    }
  }
  $dashes = @(2, 3, 4, 5, 6, 7, 8)
  for ($i = 0; $i -lt $dashes.Count; $i++) {
    Try-Step "dash $($dashes[$i])" {
      $ln = $s.Shapes.AddLine(320, 30 + $i * 22, 580, 30 + $i * 22)
      $ln.Line.Weight = 2
      $ln.Line.DashStyle = $dashes[$i]
      $ln.Line.ForeColor.RGB = RGB 180 40 40
    }
  }
  $arrows = @(2, 3, 4, 5, 6)
  for ($i = 0; $i -lt $arrows.Count; $i++) {
    Try-Step "seta $($arrows[$i])" {
      $ln = $s.Shapes.AddLine(620, 30 + $i * 26, 900, 30 + $i * 26)
      $ln.Line.Weight = 2.5
      $ln.Line.EndArrowheadStyle = $arrows[$i]
      $ln.Line.BeginArrowheadStyle = 6
      $ln.Line.ForeColor.RGB = RGB 40 90 180
    }
  }
  Try-Step 'conectores' {
    $b1 = $s.Shapes.AddShape(5, 60, 250, 130, 60); $b1.TextFrame.TextRange.Text = 'A'
    $b2 = $s.Shapes.AddShape(5, 420, 380, 130, 60); $b2.TextFrame.TextRange.Text = 'B'
    $b3 = $s.Shapes.AddShape(9, 760, 260, 120, 90); $b3.TextFrame.TextRange.Text = 'C'
    $c1 = $s.Shapes.AddConnector(1, 0, 0, 10, 10); $c1.ConnectorFormat.BeginConnect($b1, 4); $c1.ConnectorFormat.EndConnect($b2, 2); $c1.Line.Weight = 2
    $c2 = $s.Shapes.AddConnector(2, 0, 0, 10, 10); $c2.ConnectorFormat.BeginConnect($b2, 4); $c2.ConnectorFormat.EndConnect($b3, 2); $c2.Line.Weight = 2; $c2.Line.EndArrowheadStyle = 2
    $c3 = $s.Shapes.AddConnector(3, 0, 0, 10, 10); $c3.ConnectorFormat.BeginConnect($b1, 3); $c3.ConnectorFormat.EndConnect($b3, 1); $c3.Line.Weight = 2; $c3.Line.DashStyle = 4
  }

  # Slide 4: rotacao, flip, sombra
  $s = $p.Slides.Add(4, 12)
  $rots = @(0, 15, 45, 90, 180, 300)
  for ($i = 0; $i -lt $rots.Count; $i++) {
    Try-Step "rot $($rots[$i])" {
      $sh = $s.Shapes.AddShape(33, 40 + $i * 150, 40, 110, 60)
      $sh.Rotation = $rots[$i]
      $sh.Fill.ForeColor.RGB = RGB 68 114 196
      $sh.TextFrame.TextRange.Text = "$($rots[$i])"
    }
  }
  Try-Step 'flipH' { $sh = $s.Shapes.AddShape(8, 60, 180, 120, 90); $sh.Fill.ForeColor.RGB = RGB 200 90 40; $sh.Flip(0) }
  Try-Step 'flipV' { $sh = $s.Shapes.AddShape(8, 220, 180, 120, 90); $sh.Fill.ForeColor.RGB = RGB 200 90 40; $sh.Flip(1) }
  Try-Step 'sombra' {
    $sh = $s.Shapes.AddShape(5, 420, 180, 160, 100)
    $sh.Fill.ForeColor.RGB = RGB 255 255 255
    $sh.Shadow.Visible = -1
    $sh.Shadow.OffsetX = 8; $sh.Shadow.OffsetY = 8
    $sh.Shadow.Blur = 10
    $sh.Shadow.ForeColor.RGB = RGB 0 0 0
    $sh.Shadow.Transparency = 0.5
  }
  Try-Step 'rot+grad' {
    $sh = $s.Shapes.AddShape(4, 680, 170, 140, 140)
    $sh.Fill.ForeColor.RGB = RGB 40 160 90; $sh.Fill.BackColor.RGB = RGB 255 255 120
    $sh.Fill.TwoColorGradient(2, 1)
    $sh.Rotation = 30
  }
  Try-Step 'freeform' {
    $fb = $s.Shapes.BuildFreeform(1, 120, 360)
    $fb.AddNodes(0, 0, 260, 330)
    $fb.AddNodes(0, 0, 380, 430)
    $fb.AddNodes(0, 0, 250, 490)
    $fb.AddNodes(0, 0, 120, 440)
    $fb.AddNodes(0, 0, 120, 360)
    $sh = $fb.ConvertToShape()
    $sh.Fill.ForeColor.RGB = RGB 150 60 200
  }
  Try-Step 'arco+blockArc' {
    $sh = $s.Shapes.AddShape(25, 520, 350, 130, 130); $sh.Line.Weight = 3
    $sh2 = $s.Shapes.AddShape(20, 700, 350, 130, 130); $sh2.Fill.ForeColor.RGB = RGB 240 170 40
  }

  Export-Deck $p 'stress-shapes'
  $p.Close()

  # ════════════════════ DECK B: stress-text ════════════════════
  $p = $ppt.Presentations.Add($true)
  $p.PageSetup.SlideSize = 15
  $w = $p.PageSetup.SlideWidth; $h = $p.PageSetup.SlideHeight

  # Slide 1: layout titulo+conteudo com bullets multiniveis
  $s = $p.Slides.Add(1, 2)
  $s.Shapes.Title.TextFrame.TextRange.Text = 'Bullets multiníveis'
  $body = $s.Shapes.Item(2).TextFrame.TextRange
  $body.Text = "Nível um`r`nNível dois`r`nNível três`r`nNível quatro`r`nNível cinco`r`nDe volta ao um"
  for ($i = 1; $i -le 6; $i++) {
    $lvl = @(1, 2, 3, 4, 5, 1)[$i - 1]
    $body.Paragraphs($i).IndentLevel = $lvl
  }

  # Slide 2: runs ricos
  $s = $p.Slides.Add(2, 12)
  $tb = $s.Shapes.AddTextbox(1, 30, 20, 900, 480)
  $r = $tb.TextFrame.TextRange
  $r.Text = "Normal 18pt Calibri`r`nNegrito Itálico Sublinhado`r`nTachado e VERSALETE e TUDO MAIÚSCULO`r`nColorido vermelho azul verde`r`nFontes: Arial, Times New Roman, Courier New, Segoe UI`r`nTamanhos: 8 12 20 32 44`r`nSub­script x2 e superscript x²`r`nEspaçamento expandido entre letras"
  Try-Step 'runs' {
    $p2 = $r.Paragraphs(2); $p2.Words(1).Font.Bold = -1; $p2.Words(2).Font.Italic = -1; $p2.Words(3).Font.Underline = -1
    $r3 = $r.Paragraphs(3)
    $tr2 = $tb.TextFrame2.TextRange.Paragraphs(3)
    $tr2.Words(1).Font.StrikeThrough = -1
    $tr2.Words(3).Font.Smallcaps = -1
    $tr2.Words(5).Font.Allcaps = -1
    $p4 = $r.Paragraphs(4)
    $p4.Words(2).Font.Color.RGB = RGB 220 40 40
    $p4.Words(3).Font.Color.RGB = RGB 40 60 220
    $p4.Words(4).Font.Color.RGB = RGB 30 160 70
    $p5 = $r.Paragraphs(5)
    $p5.Words(2).Font.Name = 'Arial'
    $p5.Words(4).Font.Name = 'Times New Roman'
    $p5.Words(7).Font.Name = 'Courier New'
    $p5.Words(10).Font.Name = 'Segoe UI'
    $p6 = $r.Paragraphs(6)
    $sizes = @(8, 12, 20, 32, 44)
    for ($i = 0; $i -lt 5; $i++) { $p6.Words(2 + $i).Font.Size = $sizes[$i] }
    $p7 = $r.Paragraphs(7)
    $p7.Words(2).Font.Subscript = -1
    $p7.Words(5).Font.Superscript = -1
    $tb.TextFrame2.TextRange.Paragraphs(8).Font.Spacing = 3
  }

  # Slide 3: alinhamentos + ancoras + wrap + autofit
  $s = $p.Slides.Add(3, 12)
  $aligns = @(1, 2, 3, 4)  # ppAlignLeft, Center, Right, Justify
  $alignNames = @('esquerda', 'centro', 'direita', 'justificado texto mais longo para ver a distribuição das palavras na linha')
  for ($i = 0; $i -lt 4; $i++) {
    Try-Step "align $i" {
      $tb2 = $s.Shapes.AddTextbox(1, 20 + $i * 230, 20, 215, 110)
      $tb2.TextFrame.TextRange.Text = "Alinhado à $($alignNames[$i])"
      $tb2.TextFrame.TextRange.ParagraphFormat.Alignment = $aligns[$i]
      $tb2.Line.Visible = -1; $tb2.Line.ForeColor.RGB = RGB 180 180 180
      $tb2.TextFrame.WordWrap = -1
    }
  }
  $anchors = @(1, 3, 4)
  $anchorNames = @('topo', 'meio', 'base')
  for ($i = 0; $i -lt 3; $i++) {
    Try-Step "anchor $i" {
      $sh = $s.Shapes.AddShape(1, 20 + $i * 230, 160, 215, 130)
      $sh.Fill.ForeColor.RGB = RGB 240 240 245
      $sh.Line.ForeColor.RGB = RGB 150 150 160
      $sh.TextFrame.TextRange.Text = "âncora $($anchorNames[$i])"
      $sh.TextFrame.TextRange.Font.Color.RGB = RGB 30 30 30
      $sh.TextFrame.VerticalAnchor = $anchors[$i]
    }
  }
  Try-Step 'wrap off' {
    $tb3 = $s.Shapes.AddTextbox(1, 720, 160, 120, 60)
    $tb3.TextFrame.WordWrap = 0
    $tb3.TextFrame.TextRange.Text = 'Sem quebra: linha segue além da caixa'
    $tb3.Line.Visible = -1; $tb3.Line.ForeColor.RGB = RGB 200 120 120
  }
  Try-Step 'autofit shrink' {
    $sh = $s.Shapes.AddShape(1, 20, 320, 300, 120)
    $sh.Fill.ForeColor.RGB = RGB 255 250 230
    $sh.Line.ForeColor.RGB = RGB 200 160 60
    $sh.TextFrame2.TextRange.Text = 'Este texto é bem longo e deveria ENCOLHER automaticamente para caber na forma porque o autofit está em shrink-text-on-overflow. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.'
    $sh.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = RGB 40 40 40
    $sh.TextFrame2.AutoSize = 2
  }
  Try-Step 'line spacing' {
    $tb4 = $s.Shapes.AddTextbox(1, 350, 320, 280, 160)
    $tb4.TextFrame.TextRange.Text = "Entrelinha 1.0`r`nEntrelinha 1.0`r`nEntrelinha 2.0`r`nEntrelinha 2.0"
    $tb4.TextFrame.TextRange.Paragraphs(3).ParagraphFormat.SpaceWithin = 2
    $tb4.TextFrame.TextRange.Paragraphs(4).ParagraphFormat.SpaceWithin = 2
    $tb4.Line.Visible = -1; $tb4.Line.ForeColor.RGB = RGB 180 180 180
  }
  Try-Step 'vertical text' {
    $sh = $s.Shapes.AddShape(1, 680, 320, 90, 170)
    $sh.Fill.ForeColor.RGB = RGB 230 240 255
    $sh.TextFrame.Orientation = 5
    $sh.TextFrame.TextRange.Text = 'Texto vertical'
    $sh.TextFrame.TextRange.Font.Color.RGB = RGB 20 20 20
  }

  # Slide 4: listas numeradas + bullets custom
  $s = $p.Slides.Add(4, 12)
  Try-Step 'autonum' {
    $tb5 = $s.Shapes.AddTextbox(1, 30, 30, 420, 300)
    $r5 = $tb5.TextFrame.TextRange
    $r5.Text = "Primeiro numerado`r`nSegundo numerado`r`nTerceiro numerado`r`nQuarto alfa`r`nQuinto alfa`r`nRomano um`r`nRomano dois"
    for ($i = 1; $i -le 3; $i++) { $r5.Paragraphs($i).ParagraphFormat.Bullet.Type = 2; $r5.Paragraphs($i).ParagraphFormat.Bullet.Style = 3 }
    for ($i = 4; $i -le 5; $i++) { $r5.Paragraphs($i).ParagraphFormat.Bullet.Type = 2; $r5.Paragraphs($i).ParagraphFormat.Bullet.Style = 0 }
    for ($i = 6; $i -le 7; $i++) { $r5.Paragraphs($i).ParagraphFormat.Bullet.Type = 2; $r5.Paragraphs($i).ParagraphFormat.Bullet.Style = 5 }
  }
  Try-Step 'bullet custom' {
    $tb6 = $s.Shapes.AddTextbox(1, 500, 30, 420, 300)
    $r6 = $tb6.TextFrame.TextRange
    $r6.Text = "Marcador seta`r`nMarcador seta`r`nMarcador losango`r`nMarcador check"
    for ($i = 1; $i -le 2; $i++) { $r6.Paragraphs($i).ParagraphFormat.Bullet.Type = 1; $r6.Paragraphs($i).ParagraphFormat.Bullet.Character = 0x27A2 }
    $r6.Paragraphs(3).ParagraphFormat.Bullet.Type = 1; $r6.Paragraphs(3).ParagraphFormat.Bullet.Character = 0x25C6
    $r6.Paragraphs(4).ParagraphFormat.Bullet.Type = 1; $r6.Paragraphs(4).ParagraphFormat.Bullet.Character = 0x2714
  }
  Try-Step 'space before/after + indent' {
    $tb7 = $s.Shapes.AddTextbox(1, 30, 350, 560, 150)
    $r7 = $tb7.TextFrame.TextRange
    $r7.Text = "Parágrafo normal sem espaçamento`r`nCom SpaceBefore 18pt`r`nCom recuo de primeira linha maior"
    $r7.Paragraphs(2).ParagraphFormat.SpaceBefore = 18
    $r7.Paragraphs(3).ParagraphFormat.Bullet.Visible = 0
    $tb7.Line.Visible = -1; $tb7.Line.ForeColor.RGB = RGB 180 180 180
  }
  Try-Step 'wordart' {
    $wa = $s.Shapes.AddTextEffect(13, 'WordArt Stress', 'Arial Black', 40, 0, 0, 620, 380)
  }

  Export-Deck $p 'stress-text'
  $p.Close()

  # ════════════════════ DECK C: stress-table-chart ════════════════════
  $p = $ppt.Presentations.Add($true)
  $p.PageSetup.SlideSize = 15

  # Slide 1: tabela com merges
  $s = $p.Slides.Add(1, 12)
  Try-Step 'tabela' {
    $tblShape = $s.Shapes.AddTable(6, 5, 40, 40, 880, 420)
    $tbl = $tblShape.Table
    for ($r0 = 1; $r0 -le 6; $r0++) { for ($c0 = 1; $c0 -le 5; $c0++) {
      $tbl.Cell($r0, $c0).Shape.TextFrame.TextRange.Text = "R$r0 C$c0"
    } }
    $tbl.Cell(1, 1).Shape.TextFrame.TextRange.Text = 'Cabeçalho mesclado'
    $tbl.Cell(1, 1).Merge($tbl.Cell(1, 3))
    $tbl.Cell(3, 2).Merge($tbl.Cell(4, 2))
    $tbl.Cell(5, 4).Merge($tbl.Cell(6, 5))
    $tbl.Cell(2, 2).Shape.Fill.ForeColor.RGB = RGB 255 230 150
    $tbl.Cell(3, 4).Shape.Fill.ForeColor.RGB = RGB 190 230 255
  }

  # Slides 2..5: charts (dados default do PowerPoint)
  $chartTypes = @(
    @(51, 'Colunas agrupadas'),
    @(4, 'Linhas'),
    @(5, 'Pizza'),
    @(-4120, 'Rosca'),
    @(-4151, 'Radar'),
    @(-4169, 'Dispersão XY'),
    @(1, 'Área')
  )
  $slideIdx = 2
  for ($i = 0; $i -lt $chartTypes.Count; $i += 2) {
    $s = $p.Slides.Add($slideIdx, 12)
    Try-Step "chart $($chartTypes[$i][1])" {
      $c = $s.Shapes.AddChart2(-1, $chartTypes[$i][0], 20, 60, 440, 360)
      $c.Chart.HasTitle = -1
      $c.Chart.ChartTitle.Text = $chartTypes[$i][1]
      try { $c.Chart.ChartData.Workbook.Close() } catch {}
    }
    if ($i + 1 -lt $chartTypes.Count) {
      Try-Step "chart $($chartTypes[$i+1][1])" {
        $c = $s.Shapes.AddChart2(-1, $chartTypes[$i + 1][0], 490, 60, 440, 360)
        $c.Chart.HasTitle = -1
        $c.Chart.ChartTitle.Text = $chartTypes[$i + 1][1]
        try { $c.Chart.ChartData.Workbook.Close() } catch {}
      }
    }
    $slideIdx++
  }

  Export-Deck $p 'stress-table-chart'
  $p.Close()

  # ════════════════════ DECK D: stress-media ════════════════════
  $p = $ppt.Presentations.Add($true)
  $p.PageSetup.SlideSize = 15
  $w = $p.PageSetup.SlideWidth; $h = $p.PageSetup.SlideHeight

  # Slide 1: imagens com transformacoes
  $s = $p.Slides.Add(1, 12)
  Try-Step 'pic normal' { $s.Shapes.AddPicture($img1, 0, -1, 20, 20, 220, 165) | Out-Null }
  Try-Step 'pic crop' {
    $pic = $s.Shapes.AddPicture($img1, 0, -1, 270, 20, 220, 165)
    $pic.PictureFormat.CropLeft = 60; $pic.PictureFormat.CropTop = 40
  }
  Try-Step 'pic rot' {
    $pic = $s.Shapes.AddPicture($img2, 0, -1, 540, 20, 150, 150)
    $pic.Rotation = 20
  }
  Try-Step 'pic flip' {
    $pic = $s.Shapes.AddPicture($img1, 0, -1, 740, 20, 180, 135)
    $pic.Flip(0)
  }
  Try-Step 'pic borda+sombra' {
    $pic = $s.Shapes.AddPicture($img2, 0, -1, 60, 240, 160, 160)
    $pic.Line.Visible = -1; $pic.Line.Weight = 4; $pic.Line.ForeColor.RGB = RGB 68 114 196
    $pic.Shadow.Visible = -1; $pic.Shadow.OffsetX = 6; $pic.Shadow.OffsetY = 6; $pic.Shadow.Blur = 8
  }
  Try-Step 'shape blipfill' {
    $sh = $s.Shapes.AddShape(9, 300, 240, 200, 160)
    $sh.Fill.UserPicture($img1)
  }
  Try-Step 'pic transp' {
    $pic = $s.Shapes.AddPicture($img2, 0, -1, 560, 240, 160, 160)
    $pic.PictureFormat.Transparency = 0.55
  }

  # Slide 2: fundo gradiente
  $s = $p.Slides.Add(2, 12)
  Try-Step 'bg grad' {
    $s.FollowMasterBackground = 0
    $s.Background.Fill.ForeColor.RGB = RGB 20 40 90
    $s.Background.Fill.BackColor.RGB = RGB 120 40 140
    $s.Background.Fill.TwoColorGradient(3, 1)
    $tbx = $s.Shapes.AddTextbox(1, 200, 200, 560, 100)
    $tbx.TextFrame.TextRange.Text = 'Fundo com gradiente'
    $tbx.TextFrame.TextRange.Font.Size = 44
    $tbx.TextFrame.TextRange.Font.Color.RGB = RGB 255 255 255
  }

  # Slide 3: fundo imagem
  $s = $p.Slides.Add(3, 12)
  Try-Step 'bg pic' {
    $s.FollowMasterBackground = 0
    $s.Background.Fill.UserPicture($img1)
    $tbx = $s.Shapes.AddTextbox(1, 200, 220, 560, 80)
    $tbx.TextFrame.TextRange.Text = 'Fundo com imagem'
    $tbx.TextFrame.TextRange.Font.Size = 40
    $tbx.TextFrame.TextRange.Font.Color.RGB = RGB 255 255 255
    $tbx.TextFrame.TextRange.Font.Bold = -1
  }

  # Slide 4: grupos (aninhados + rotacao do grupo)
  $s = $p.Slides.Add(4, 12)
  Try-Step 'grupo' {
    $a = $s.Shapes.AddShape(1, 100, 100, 120, 80); $a.Fill.ForeColor.RGB = RGB 68 114 196
    $b = $s.Shapes.AddShape(9, 240, 100, 120, 80); $b.Fill.ForeColor.RGB = RGB 220 90 40
    $g1 = $s.Shapes.Range(@(1, 2)).Group()
    $g1.Name = 'grupoAB'
    $c = $s.Shapes.AddShape(4, 180, 220, 100, 100); $c.Fill.ForeColor.RGB = RGB 40 170 90
    $g2 = $s.Shapes.Range(@('grupoAB', $c.Name)).Group()
    $g2.Rotation = 15
    $d = $s.Shapes.AddShape(5, 600, 150, 200, 120); $d.Fill.ForeColor.RGB = RGB 150 60 200
    $e = $s.Shapes.AddShape(5, 650, 200, 200, 120); $e.Fill.ForeColor.RGB = RGB 240 170 40
  }

  # Slide 5: rodape + numero + hyperlink
  $s = $p.Slides.Add(5, 12)
  Try-Step 'hf' {
    $s.HeadersFooters.Footer.Visible = -1
    $s.HeadersFooters.Footer.Text = 'Rodapé de estresse'
    $s.HeadersFooters.SlideNumber.Visible = -1
    $s.HeadersFooters.DateAndTime.Visible = -1
    $s.HeadersFooters.DateAndTime.UseFormat = 0
    $s.HeadersFooters.DateAndTime.Text = '25/07/2026'
  }
  Try-Step 'hyperlink' {
    $tbx = $s.Shapes.AddTextbox(1, 100, 150, 600, 60)
    $tbx.TextFrame.TextRange.Text = 'Link para exemplo.com'
    $tbx.TextFrame.TextRange.Font.Size = 28
    $tbx.TextFrame.TextRange.ActionSettings.Item(1).Hyperlink.Address = 'https://example.com'
  }

  Export-Deck $p 'stress-media'
  $p.Close()
}
finally {
  if ($ppt) { try { $ppt.Quit() } catch {} }
  if ($ppt) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) }
}
Write-Host 'gen-stress: OK'

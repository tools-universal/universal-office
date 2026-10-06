# Gera o CORPUS de REPRODUÇÃO AUTOMÁTICA com o PowerPoint real (COM).
# Cada deck cobre uma família de recursos de apresentação e TODOS os slides
# têm intervalo de avanço (AdvanceOnTime) => o show toca sozinho, como num
# quiosque. Cada deck é salvo em .pptx (OOXML) E .ppt (binário 97-2003) em
# samples/playback/. O deck real `samples/showcase_animado.pptx` também ganha
# a sua versão .ppt.
#
# Decks:
#   pb-transicoes-classicas  transições 2D (cortar, esmaecer, empurrar, revelar, formas, persianas…)
#   pb-transicoes-dinamicas  transições 3D/"empolgantes" do 2010+ (vórtice, cubo, galeria, origami…) + Morph
#   pb-entrada               ~50 efeitos de ENTRADA (após anterior, duração default do app)
#   pb-enfase                ~30 efeitos de ÊNFASE
#   pb-saida                 ~30 efeitos de SAÍDA
#   pb-trajetorias           ~24 trajetórias de movimento (simultâneas por slide)
#   pb-texto                 texto por parágrafo / palavra / letra, esmaecer/ocultar depois, ordem reversa
#   pb-tempo                 semântica de tempo: gatilhos, atrasos, durações, repetição, auto-reverter,
#                            retroceder, suavização, cliques com/sem intervalo, slide oculto, gatilho interativo
#   pb-midia                 vídeo e áudio com reprodução automática, GIF animado, gráfico,
#                            SmartArt, tabela, grupo, imagem
#
# Uso: powershell -ExecutionPolicy Bypass -File tools/ppt-lab/playback/gen-playback.ps1 [-Only pb-entrada,pb-tempo]
param([string[]]$Only = @())
$ErrorActionPreference = 'Stop'
$labRoot = Split-Path $PSScriptRoot
$slidesRoot = Split-Path (Split-Path $labRoot)
$outDir = Join-Path $slidesRoot 'samples\playback'
$assetsDir = Join-Path $labRoot 'results\playback\_assets'
New-Item -ItemType Directory -Force -Path $outDir, $assetsDir | Out-Null
$script:skips = @()

function RGB([int]$r, [int]$g, [int]$b) { return $r + ($g -shl 8) + ($b -shl 16) }
function Want([string]$name) { return ($Only.Count -eq 0) -or ($Only -contains $name) }
function Try-Step([string]$label, [scriptblock]$block) {
  try { & $block } catch { Write-Host "  SKIP ($label): $($_.Exception.Message)"; $script:skips += $label }
}

# ── assets: foto/quadriculado (System.Drawing) + vídeo/áudio/GIF (ffmpeg) ──
Add-Type -AssemblyName System.Drawing
$photo = Join-Path $assetsDir 'photo.png'
if (-not (Test-Path $photo)) {
  $bmp = New-Object System.Drawing.Bitmap 640, 400
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $rect = New-Object System.Drawing.Rectangle 0, 0, 640, 400
  $br = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255, 30, 90, 200)), ([System.Drawing.Color]::FromArgb(255, 240, 120, 30)), 35.0
  $g.FillRectangle($br, $rect)
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 8
  $g.DrawEllipse($pen, 200, 80, 240, 240)
  $g.FillRectangle([System.Drawing.Brushes]::Black, 40, 40, 90, 90)
  $g.FillRectangle([System.Drawing.Brushes]::Yellow, 520, 280, 80, 80)
  $g.Dispose(); $bmp.Save($photo, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
}
$checker = Join-Path $assetsDir 'checker.png'
if (-not (Test-Path $checker)) {
  $bmp = New-Object System.Drawing.Bitmap 400, 400
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  for ($x = 0; $x -lt 8; $x++) { for ($y = 0; $y -lt 8; $y++) {
    $c = if ((($x + $y) % 2) -eq 0) { [System.Drawing.Brushes]::DarkSlateBlue } else { [System.Drawing.Brushes]::Gold }
    $g.FillRectangle($c, $x * 50, $y * 50, 50, 50)
  } }
  $g.Dispose(); $bmp.Save($checker, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
}
$clip = Join-Path $assetsDir 'clip.mp4'
if (-not (Test-Path $clip)) { & ffmpeg -v error -y -f lavfi -i 'testsrc2=size=640x360:rate=30:duration=4' -c:v libx264 -pix_fmt yuv420p -movflags +faststart $clip }
$beep = Join-Path $assetsDir 'beep.wav'
if (-not (Test-Path $beep)) { & ffmpeg -v error -y -f lavfi -i 'sine=frequency=880:duration=2' $beep }
$gif = Join-Path $assetsDir 'anim.gif'
if (-not (Test-Path $gif)) { & ffmpeg -v error -y -f lavfi -i 'testsrc=size=320x240:rate=10:duration=2' -vf 'split[a][b];[a]palettegen[p];[b][p]paletteuse' $gif }

$W = 960; $H = 540
$pal = @((RGB 192 57 43), (RGB 41 128 185), (RGB 39 174 96), (RGB 142 68 173), (RGB 243 156 18),
  (RGB 22 160 133), (RGB 44 62 80), (RGB 211 84 0), (RGB 127 140 141), (RGB 52 73 94),
  (RGB 231 76 60), (RGB 26 188 156))
$white = RGB 255 255 255
$ink = RGB 30 30 30
$light = RGB 244 244 240

function New-Deck() {
  $p = $ppt.Presentations.Add($true)
  $p.PageSetup.SlideWidth = $W
  $p.PageSetup.SlideHeight = $H
  return $p
}

function New-Slide($p, [int]$bg, [string]$title, [int]$titleColor) {
  $s = $p.Slides.Add($p.Slides.Count + 1, 12)
  $s.FollowMasterBackground = 0
  $s.Background.Fill.Solid()
  $s.Background.Fill.ForeColor.RGB = $bg
  $t = $s.Shapes.AddTextbox(1, 30, 16, 900, 50)
  $t.Name = 'Titulo'
  $t.TextFrame.TextRange.Text = $title
  $t.TextFrame.TextRange.Font.Size = 28
  $t.TextFrame.TextRange.Font.Bold = -1
  $t.TextFrame.TextRange.Font.Color.RGB = $titleColor
  return $s
}

function Set-Trans($s, [int]$effect, [double]$dur, [double]$adv) {
  $t = $s.SlideShowTransition
  $t.EntryEffect = $effect
  if ($dur -ge 0) { $t.Duration = $dur }
  $t.AdvanceOnClick = -1
  if ($adv -ge 0) { $t.AdvanceOnTime = -1; $t.AdvanceTime = $adv } else { $t.AdvanceOnTime = 0 }
}

# Conteúdo assimétrico p/ transições: número grande, círculo, triângulo, foto,
# quadriculado — direção/forma da transição fica visível em cada quadro.
function Add-TransitionArt($s, [int]$n) {
  $num = $s.Shapes.AddTextbox(1, 30, 90, 380, 300)
  $num.TextFrame.TextRange.Text = ('{0:D2}' -f $n)
  $num.TextFrame.TextRange.Font.Size = 190
  $num.TextFrame.TextRange.Font.Bold = -1
  $num.TextFrame.TextRange.Font.Color.RGB = $white
  $c = $s.Shapes.AddShape(9, 430, 100, 170, 170); $c.Fill.ForeColor.RGB = $white; $c.Line.Visible = 0
  $tr = $s.Shapes.AddShape(7, 640, 100, 190, 170); $tr.Fill.ForeColor.RGB = $ink; $tr.Line.Visible = 0
  $null = $s.Shapes.AddPicture($photo, 0, -1, 430, 300, 300, 188)
  $null = $s.Shapes.AddPicture($checker, 0, -1, 760, 300, 170, 170)
}

function Add-Box($s, [double]$x, [double]$y, [double]$w, [double]$h, [int]$color, [string]$label) {
  $b = $s.Shapes.AddShape(5, $x, $y, $w, $h)
  $b.Fill.ForeColor.RGB = $color
  $b.Line.Visible = 0
  $b.TextFrame.TextRange.Text = $label
  $b.TextFrame.TextRange.Font.Size = 18
  $b.TextFrame.TextRange.Font.Bold = -1
  $b.TextFrame.TextRange.Font.Color.RGB = $white
  return $b
}

# Grade 3×2 de caixas com um efeito cada (após anterior), N slides.
function Add-EffectGrid($p, [string]$prefix, [object[]]$effects, [bool]$exit, [int]$titleBg) {
  $per = 6
  for ($i = 0; $i -lt $effects.Count; $i += $per) {
    $chunk = $effects[$i..([Math]::Min($i + $per, $effects.Count) - 1)]
    $s = New-Slide $p $light ("$prefix " + ([int]($i / $per) + 1)) $ink
    Set-Trans $s 3849 0.5 1
    $seq = $s.TimeLine.MainSequence
    for ($k = 0; $k -lt $chunk.Count; $k++) {
      $id = $chunk[$k][0]; $name = $chunk[$k][1]
      $x = 30 + ($k % 3) * 310; $y = 100 + [Math]::Floor($k / 3) * 215
      $b = Add-Box $s $x $y 280 170 $pal[($i + $k) % $pal.Count] $name
      Try-Step "$prefix $name" {
        $e = $seq.AddEffect($b, $id, 0, 3)
        if ($exit) { $e.Exit = -1 }
      }
    }
  }
}

function Save-Deck($p, [string]$name) {
  $pptx = Join-Path $outDir "$name.pptx"
  $pptPath = Join-Path $outDir "$name.ppt"
  $p.SaveAs($pptx, 24)
  Try-Step "$name .ppt" { $p.SaveAs($pptPath, 1) }
  Write-Host "deck $name -> $($p.Slides.Count) slides (.pptx + .ppt)"
  $p.Close()
}

$ppt = $null
try {
  $ppt = New-Object -ComObject PowerPoint.Application
  try { $ppt.WindowState = 2 } catch {}
  $ppt.DisplayAlerts = 1

  # ════════════════ pb-transicoes-classicas ════════════════
  if (Want 'pb-transicoes-classicas') {
    $p = New-Deck
    $classic = @(
      @(3849, 'Esmaecer suave (1º slide: do preto)', 1.0),
      @(257, 'Cortar', -1),
      @(258, 'Cortar pelo preto', -1),
      @(1793, 'Esmaecer pelo preto', 1.0),
      @(3853, 'Empurrar (esquerda)', 1.0),
      @(3855, 'Empurrar (cima) rápido', 0.5),
      @(2819, 'Revelar (direita)', 1.0),
      @(2820, 'Revelar (baixo) lento', 2.0),
      @(3585, 'Dividir horizontal p/ fora', 1.0),
      @(3588, 'Dividir vertical p/ dentro', 1.0),
      @(3894, 'Revelar suave (esquerda)', 1.0),
      @(3897, 'Revelar pelo preto (direita)', 1.0),
      @(2305, 'Barras aleatórias horizontais', 1.0),
      @(3845, 'Forma: círculo', 1.0),
      @(3846, 'Forma: losango', 1.0),
      @(3851, 'Forma: mais', 1.0),
      @(3073, 'Caixa p/ fora', 1.0),
      @(3074, 'Caixa p/ dentro', 1.0),
      @(2049, 'Descobrir (esquerda)', 1.0),
      @(1283, 'Cobrir (direita)', 1.0),
      @(1287, 'Cobrir (esquerda-baixo)', 1.0),
      @(3909, 'Flash', -1),
      @(2564, 'Faixas (baixo-direita)', 1.0),
      @(769, 'Persianas horizontais', 1.0),
      @(770, 'Persianas verticais', 1.0),
      @(3857, 'Relógio (1 raio)', 1.0),
      @(3860, 'Roda (4 raios)', 1.0),
      @(3856, 'Cunha', 1.0),
      @(3862, 'Relógio anti-horário', 1.0),
      @(1025, 'Quadriculado', 1.0),
      @(1537, 'Dissolver', 1.0),
      @(3847, 'Pente horizontal', 1.0),
      @(3850, 'Manchete', -1)
    )
    for ($i = 0; $i -lt $classic.Count; $i++) {
      $s = New-Slide $p $pal[$i % $pal.Count] $classic[$i][1] $white
      Add-TransitionArt $s ($i + 1)
      Try-Step "trans $($classic[$i][1])" { Set-Trans $s $classic[$i][0] $classic[$i][2] 1 }
    }
    Save-Deck $p 'pb-transicoes-classicas'
  }

  # ════════════════ pb-transicoes-dinamicas ════════════════
  if (Want 'pb-transicoes-dinamicas') {
    $p = New-Deck
    $dynamic = @(
      @(3934, 'Cair'), @(3936, 'Cortina lateral'), @(3938, 'Cortinas'), @(3939, 'Vento'),
      @(3941, 'Prestígio'), @(3942, 'Fratura'), @(3943, 'Esmagar'), @(3944, 'Descascar'),
      @(3948, 'Virar página dupla'), @(3950, 'Avião'), @(3952, 'Origami'), @(3898, 'Favo de mel'),
      @(3872, 'Brilho (losangos)'), @(3863, 'Vórtice'), @(3910, 'Picotar'), @(3901, 'Alternar'),
      @(3905, 'Inverter'), @(3867, 'Ondulação'), @(3880, 'Galeria'), @(3914, 'Cubo'),
      @(3884, 'Portas'), @(3922, 'Caixa'), @(3918, 'Girar'), @(3886, 'Janela'),
      @(3926, 'Órbita'), @(3890, 'Sobrevoar'), @(3899, 'Roda-gigante'), @(3882, 'Esteira'),
      @(3930, 'Panorâmica'), @(3888, 'Distorcer')
    )
    for ($i = 0; $i -lt $dynamic.Count; $i++) {
      $s = New-Slide $p $pal[($i + 3) % $pal.Count] ($dynamic[$i][1] + ' (duração default)') $white
      Add-TransitionArt $s ($i + 1)
      Try-Step "trans $($dynamic[$i][1])" { Set-Trans $s $dynamic[$i][0] -1 1 }
    }
    # Morph: dois slides com os MESMOS objetos em posições/cores diferentes
    $s = New-Slide $p (RGB 30 30 60) 'Morph — origem' $white
    Set-Trans $s 3849 0.5 1
    $a = $s.Shapes.AddShape(9, 80, 120, 160, 160); $a.Name = '!!bola'; $a.Fill.ForeColor.RGB = (RGB 240 90 60); $a.Line.Visible = 0
    $b = $s.Shapes.AddShape(1, 600, 300, 260, 120); $b.Name = '!!barra'; $b.Fill.ForeColor.RGB = (RGB 60 160 240); $b.Line.Visible = 0
    $s2 = New-Slide $p (RGB 30 30 60) 'Morph — destino' $white
    $a2 = $s2.Shapes.AddShape(9, 700, 80, 220, 220); $a2.Name = '!!bola'; $a2.Fill.ForeColor.RGB = (RGB 250 200 60); $a2.Line.Visible = 0
    $b2 = $s2.Shapes.AddShape(1, 80, 360, 420, 90); $b2.Name = '!!barra'; $b2.Fill.ForeColor.RGB = (RGB 90 220 120); $b2.Line.Visible = 0; $b2.Rotation = 15
    Try-Step 'morph' { Set-Trans $s2 3954 2.0 1 }
    Save-Deck $p 'pb-transicoes-dinamicas'
  }

  # ════════════════ pb-entrada ════════════════
  if (Want 'pb-entrada') {
    $p = New-Deck
    $entr = @(
      @(1, 'Aparecer'), @(10, 'Esmaecer'), @(2, 'Surgir'), @(30, 'Flutuar'), @(16, 'Dividir'), @(22, 'Revelar'),
      @(6, 'Forma/círculo'), @(21, 'Roda'), @(14, 'Barras aleatórias'), @(31, 'Aumentar e girar'), @(23, 'Zoom'), @(19, 'Girar (swivel)'),
      @(26, 'Saltar'), @(3, 'Persianas'), @(4, 'Caixa'), @(5, 'Quadriculado'), @(7, 'Rastejar'), @(8, 'Losango'),
      @(9, 'Dissolver'), @(11, 'Piscar uma vez'), @(12, 'Espiar'), @(13, 'Mais'), @(15, 'Espiral'), @(17, 'Esticar'),
      @(18, 'Faixas'), @(20, 'Cunha'), @(25, 'Bumerangue'), @(27, 'Revelar cor'), @(28, 'Créditos'), @(29, 'Atenuar'),
      @(32, 'Velocidade da luz'), @(33, 'Cata-vento'), @(34, 'Ascender'), @(35, 'Assobio'), @(36, 'Linha fina'), @(37, 'Desdobrar'),
      @(38, 'Chicote'), @(39, 'Subir'), @(40, 'Revolução central'), @(41, 'Giro esmaecido'), @(42, 'Descer'), @(43, 'Estilingue'),
      @(44, 'Girador'), @(45, 'Comprimir'), @(46, 'Zíper'), @(47, 'Arco p/ cima'), @(48, 'Zoom esmaecido'), @(49, 'Deslizar'),
      @(50, 'Expandir'), @(51, 'Inverter'), @(53, 'Dobrar'), @(52, 'Cintilar')
    )
    Add-EffectGrid $p 'Entrada' $entr $false 0
    Save-Deck $p 'pb-entrada'
  }

  # ════════════════ pb-enfase ════════════════
  if (Want 'pb-enfase') {
    $p = New-Deck
    $emph = @(
      @(59, 'Aumentar/Diminuir'), @(61, 'Girar'), @(62, 'Transparência'), @(54, 'Cor de preenchimento'), @(60, 'Cor da linha'), @(56, 'Cor da fonte'),
      @(57, 'Tamanho da fonte'), @(58, 'Estilo da fonte'), @(55, 'Mudar fonte'), @(63, 'Negrito piscante'), @(64, 'Explosão'), @(65, 'Revelar negrito'),
      @(66, 'Pincel de cor'), @(67, 'Sublinhar'), @(68, 'Mesclar cor'), @(69, 'Onda de cor'), @(70, 'Cor complementar'), @(71, 'Complementar 2'),
      @(72, 'Cor contrastante'), @(73, 'Escurecer'), @(74, 'Dessaturar'), @(75, 'Pulso (flash)'), @(76, 'Tremular'), @(77, 'Crescer c/ cor'),
      @(78, 'Clarear'), @(79, 'Ênfase de estilo'), @(80, 'Gangorra'), @(81, 'Crescer vertical'), @(82, 'Onda'), @(11, 'Piscar')
    )
    Add-EffectGrid $p 'Ênfase' $emph $false 0
    Save-Deck $p 'pb-enfase'
  }

  # ════════════════ pb-saida ════════════════
  if (Want 'pb-saida') {
    $p = New-Deck
    $exitFx = @(
      @(1, 'Desaparecer'), @(10, 'Esmaecer'), @(2, 'Sair voando'), @(30, 'Flutuar p/ fora'), @(16, 'Dividir'), @(22, 'Revelar'),
      @(6, 'Forma/círculo'), @(21, 'Roda'), @(14, 'Barras aleatórias'), @(31, 'Encolher e girar'), @(23, 'Zoom'), @(19, 'Girar'),
      @(26, 'Saltar'), @(3, 'Persianas'), @(4, 'Caixa'), @(5, 'Quadriculado'), @(7, 'Rastejar p/ fora'), @(8, 'Losango'),
      @(9, 'Dissolver'), @(12, 'Espiar p/ fora'), @(13, 'Mais'), @(15, 'Espiral'), @(18, 'Faixas'), @(20, 'Cunha'),
      @(28, 'Créditos'), @(39, 'Afundar'), @(41, 'Giro esmaecido'), @(48, 'Zoom esmaecido'), @(50, 'Contrair'), @(53, 'Dobrar')
    )
    Add-EffectGrid $p 'Saída' $exitFx $true 0
    Save-Deck $p 'pb-saida'
  }

  # ════════════════ pb-trajetorias ════════════════
  if (Want 'pb-trajetorias') {
    $p = New-Deck
    $paths = @(
      @(120, 'Esquerda'), @(148, 'Para cima'), @(149, 'Direita'), @(127, 'Para baixo'), @(134, 'Diagonal ↘'), @(141, 'Diagonal ↗'),
      @(122, 'Arco p/ baixo'), @(129, 'Arco p/ cima'), @(136, 'Arco esquerda'), @(143, 'Arco direita'), @(121, 'Virar à direita'), @(128, 'Virar p/ cima'),
      @(86, 'Círculo'), @(88, 'Losango'), @(90, 'Estrela 5'), @(94, 'Coração'), @(109, 'Laço'), @(111, 'Oito horizontal'),
      @(123, 'Zigue-zague'), @(125, 'Senoide'), @(131, 'Espiral direita'), @(138, 'Mola'), @(126, 'Quicar esquerda'), @(147, 'Escada')
    )
    for ($i = 0; $i -lt $paths.Count; $i += 6) {
      $s = New-Slide $p $light ('Trajetórias ' + ([int]($i / 6) + 1)) $ink
      Set-Trans $s 3849 0.5 1
      $seq = $s.TimeLine.MainSequence
      for ($k = 0; $k -lt 6; $k++) {
        $id = $paths[$i + $k][0]; $name = $paths[$i + $k][1]
        $x = 120 + ($k % 3) * 300; $y = 150 + [Math]::Floor($k / 3) * 200
        $b = Add-Box $s $x $y 130 80 $pal[($i + $k) % $pal.Count] $name
        $b.TextFrame.TextRange.Font.Size = 13
        Try-Step "path $name" {
          $trig = 2; if ($k -eq 0) { $trig = 3 }
          $null = $seq.AddEffect($b, $id, 0, $trig)
        }
      }
    }
    Save-Deck $p 'pb-trajetorias'
  }

  # ════════════════ pb-texto ════════════════
  if (Want 'pb-texto') {
    $p = New-Deck
    $paras = "Primeiro tópico do parágrafo`rSegundo tópico, um pouco maior`rTerceiro tópico`rQuarto tópico com palavras extras`rQuinto e último"
    function Add-Bullets($s, [string]$txt) {
      $tb = $s.Shapes.AddTextbox(1, 60, 100, 840, 380)
      $tb.TextFrame.TextRange.Text = $txt
      $tb.TextFrame.TextRange.Font.Size = 28
      $tb.TextFrame.TextRange.Font.Color.RGB = $ink
      $tb.TextFrame.TextRange.ParagraphFormat.Bullet.Visible = -1
      return $tb
    }
    function All-After($seq, $shape) {
      for ($j = 1; $j -le $seq.Count; $j++) { $e = $seq.Item($j); if ($e.Shape.Name -eq $shape.Name) { $e.Timing.TriggerType = 3 } }
    }
    # 1) por parágrafo
    $s = New-Slide $p $light 'Texto por parágrafo (esmaecer)' $ink; Set-Trans $s 3849 0.5 1
    $tb = Add-Bullets $s $paras
    Try-Step 'por paragrafo' { $null = $s.TimeLine.MainSequence.AddEffect($tb, 10, 2, 3); All-After $s.TimeLine.MainSequence $tb }
    # 2) surgir por parágrafo de baixo
    $s = New-Slide $p $light 'Surgir por parágrafo' $ink; Set-Trans $s 3849 0.5 1
    $tb = Add-Bullets $s $paras
    Try-Step 'surgir paragrafo' { $null = $s.TimeLine.MainSequence.AddEffect($tb, 2, 2, 3); All-After $s.TimeLine.MainSequence $tb }
    # 3) por palavra
    $s = New-Slide $p $light 'Surgir por PALAVRA' $ink; Set-Trans $s 3849 0.5 1
    $tb = $s.Shapes.AddTextbox(1, 60, 140, 840, 300)
    $tb.TextFrame.TextRange.Text = 'Cada palavra desta frase entra separadamente na tela'
    $tb.TextFrame.TextRange.Font.Size = 40; $tb.TextFrame.TextRange.Font.Color.RGB = (RGB 41 128 185)
    Try-Step 'por palavra' { $e = $s.TimeLine.MainSequence.AddEffect($tb, 2, 0, 3); $null = $s.TimeLine.MainSequence.ConvertToTextUnitEffect($e, 2) }
    # 4) por letra (máquina de escrever) + esmaecer por letra
    $s = New-Slide $p $light 'Aparecer por LETRA + esmaecer por letra' $ink; Set-Trans $s 3849 0.5 1
    $tb = $s.Shapes.AddTextbox(1, 60, 110, 840, 120)
    $tb.TextFrame.TextRange.Text = 'Máquina de escrever: letra a letra.'
    $tb.TextFrame.TextRange.Font.Size = 36; $tb.TextFrame.TextRange.Font.Color.RGB = $ink
    Try-Step 'aparecer letra' { $e = $s.TimeLine.MainSequence.AddEffect($tb, 1, 0, 3); $null = $s.TimeLine.MainSequence.ConvertToTextUnitEffect($e, 1) }
    $tb2 = $s.Shapes.AddTextbox(1, 60, 280, 840, 120)
    $tb2.TextFrame.TextRange.Text = 'Esmaecer por letra, suave'
    $tb2.TextFrame.TextRange.Font.Size = 36; $tb2.TextFrame.TextRange.Font.Color.RGB = (RGB 192 57 43)
    Try-Step 'fade letra' { $e = $s.TimeLine.MainSequence.AddEffect($tb2, 10, 0, 3); $null = $s.TimeLine.MainSequence.ConvertToTextUnitEffect($e, 1) }
    # 5) esmaecer (dim) depois da animação
    $s = New-Slide $p $light 'Escurecer após animação (dim)' $ink; Set-Trans $s 3849 0.5 1
    $tb = Add-Bullets $s $paras
    Try-Step 'dim depois' {
      $seq = $s.TimeLine.MainSequence
      $null = $seq.AddEffect($tb, 10, 2, 3); All-After $seq $tb
      for ($j = 1; $j -le $seq.Count; $j++) { $null = $seq.ConvertToAfterEffect($seq.Item($j), 1, (RGB 190 190 190), 0) }
    }
    # 6) ocultar depois da animação
    $s = New-Slide $p $light 'Ocultar após animação' $ink; Set-Trans $s 3849 0.5 1
    $tb = Add-Bullets $s $paras
    Try-Step 'ocultar depois' {
      $seq = $s.TimeLine.MainSequence
      $null = $seq.AddEffect($tb, 22, 2, 3); All-After $seq $tb
      for ($j = 1; $j -le $seq.Count - 1; $j++) { $null = $seq.ConvertToAfterEffect($seq.Item($j), 2, 0, 0) }
    }
    # 7) ordem reversa
    $s = New-Slide $p $light 'Parágrafos em ordem reversa' $ink; Set-Trans $s 3849 0.5 1
    $tb = Add-Bullets $s $paras
    Try-Step 'reversa' { $e = $s.TimeLine.MainSequence.AddEffect($tb, 10, 2, 3); All-After $s.TimeLine.MainSequence $tb; $null = $s.TimeLine.MainSequence.ConvertToAnimateInReverse($e, -1) }
    # 8) ênfase em texto: onda por letra, cor da fonte por palavra
    $s = New-Slide $p $light 'Ênfase em texto (onda, cor por palavra)' $ink; Set-Trans $s 3849 0.5 1
    $tb = $s.Shapes.AddTextbox(1, 60, 120, 840, 120)
    $tb.TextFrame.TextRange.Text = 'Onda percorrendo as letras'
    $tb.TextFrame.TextRange.Font.Size = 44; $tb.TextFrame.TextRange.Font.Color.RGB = (RGB 39 174 96)
    Try-Step 'onda' { $null = $s.TimeLine.MainSequence.AddEffect($tb, 82, 0, 3) }
    $tb2 = $s.Shapes.AddTextbox(1, 60, 300, 840, 120)
    $tb2.TextFrame.TextRange.Text = 'Cor da fonte muda palavra por palavra'
    $tb2.TextFrame.TextRange.Font.Size = 36; $tb2.TextFrame.TextRange.Font.Color.RGB = $ink
    Try-Step 'cor por palavra' { $e = $s.TimeLine.MainSequence.AddEffect($tb2, 56, 0, 3); $null = $s.TimeLine.MainSequence.ConvertToTextUnitEffect($e, 2) }
    # 9) níveis: por 2º nível
    $s = New-Slide $p $light 'Lista com níveis (por 2º nível)' $ink; Set-Trans $s 3849 0.5 1
    $tb = Add-Bullets $s "Nível 1 — A`rNível 2 — A.1`rNível 2 — A.2`rNível 1 — B`rNível 2 — B.1"
    $tb.TextFrame.TextRange.Paragraphs(2).IndentLevel = 2
    $tb.TextFrame.TextRange.Paragraphs(3).IndentLevel = 2
    $tb.TextFrame.TextRange.Paragraphs(5).IndentLevel = 2
    Try-Step 'por nivel 2' { $null = $s.TimeLine.MainSequence.AddEffect($tb, 22, 3, 3); All-After $s.TimeLine.MainSequence $tb }
    Save-Deck $p 'pb-texto'
  }

  # ════════════════ pb-tempo ════════════════
  if (Want 'pb-tempo') {
    $p = New-Deck
    function Fx($s, $shape, [int]$id, [int]$trig, [double]$dur, [double]$delay) {
      $e = $s.TimeLine.MainSequence.AddEffect($shape, $id, 0, $trig)
      if ($dur -gt 0) { $e.Timing.Duration = $dur }
      if ($delay -gt 0) { $e.Timing.TriggerDelayTime = $delay }
      return $e
    }
    # T1 gatilhos
    $s = New-Slide $p $light 'T1 gatilhos: após / com anterior / com + atraso' $ink; Set-Trans $s 3849 0.5 1
    $a = Add-Box $s 40 110 260 150 $pal[0] 'A após (esmaecer 1s)'; $null = Fx $s $a 10 3 1.0 0
    $b = Add-Box $s 340 110 260 150 $pal[1] 'B com (surgir 1s)'; $null = Fx $s $b 2 2 1.0 0
    $c = Add-Box $s 640 110 260 150 $pal[2] 'C com +0,5s (zoom 1s)'; $null = Fx $s $c 23 2 1.0 0.5
    $d = Add-Box $s 340 320 260 150 $pal[3] 'D após (revelar 1s)'; $null = Fx $s $d 22 3 1.0 0
    # T2 atrasos
    $s = New-Slide $p $light 'T2 atrasos: 0,25 / 0,5 / 1,0 s' $ink; Set-Trans $s 3849 0.5 1
    $dl = @(0.25, 0.5, 1.0)
    for ($k = 0; $k -lt 3; $k++) { $b = Add-Box $s (40 + $k * 300) 160 260 200 $pal[$k + 4] ("atraso $($dl[$k])s"); $null = Fx $s $b 10 3 0.5 $dl[$k] }
    # T3 durações
    $s = New-Slide $p $light 'T3 durações: 0,5 / 1 / 2 / 3 s' $ink; Set-Trans $s 3849 0.5 1
    $du = @(0.5, 1.0, 2.0, 3.0)
    for ($k = 0; $k -lt 4; $k++) { $b = Add-Box $s (30 + $k * 230) 160 210 200 $pal[$k + 6] ("dur $($du[$k])s"); $null = Fx $s $b 10 3 $du[$k] 0 }
    # T4 repetição
    $s = New-Slide $p $light 'T4 repetir: girar x2, pulso x3' $ink; Set-Trans $s 3849 0.5 1
    $a = Add-Box $s 120 150 280 200 $pal[1] 'girar x2'; Try-Step 'repeat2' { $e = Fx $s $a 61 3 1.0 0; $e.Timing.RepeatCount = 2 }
    $b = Add-Box $s 540 150 280 200 $pal[4] 'pulso x3'; Try-Step 'repeat3' { $e = Fx $s $b 75 3 0.5 0; $e.Timing.RepeatCount = 3 }
    # T5 auto-reverter
    $s = New-Slide $p $light 'T5 auto-reverter: crescer e voltar, surgir e voltar' $ink; Set-Trans $s 3849 0.5 1
    $a = Add-Box $s 120 150 280 200 $pal[2] 'crescer + auto-rev'; Try-Step 'autorev1' { $e = Fx $s $a 59 3 1.0 0; $e.Timing.AutoReverse = -1 }
    $b = Add-Box $s 540 150 280 200 $pal[3] 'surgir + auto-rev'; Try-Step 'autorev2' { $e = Fx $s $b 2 3 1.0 0; $e.Timing.AutoReverse = -1 }
    # T6 retroceder ao terminar
    $s = New-Slide $p $light 'T6 retroceder ao terminar' $ink; Set-Trans $s 3849 0.5 1
    $a = Add-Box $s 120 150 280 200 $pal[5] 'esmaecer + retroceder'; Try-Step 'rewind1' { $e = Fx $s $a 10 3 1.0 0; $e.Timing.RewindAtEnd = -1 }
    $b = Add-Box $s 540 150 280 200 $pal[6] 'girar + retroceder'; Try-Step 'rewind2' { $e = Fx $s $b 61 3 1.0 0; $e.Timing.RewindAtEnd = -1 }
    # T7 suavização
    $s = New-Slide $p $light 'T7 suavizar início/fim, quicar no fim' $ink; Set-Trans $s 3849 0.5 1
    $a = Add-Box $s 60 110 200 110 $pal[7] 'linear'; Try-Step 'path linear' { $e = Fx $s $a 149 3 2.0 0; $e.Timing.SmoothStart = 0; $e.Timing.SmoothEnd = 0 }
    $b = Add-Box $s 60 250 200 110 $pal[8] 'suave'; Try-Step 'path suave' { $e = Fx $s $b 149 2 2.0 0; $e.Timing.SmoothStart = -1; $e.Timing.SmoothEnd = -1 }
    $c = Add-Box $s 60 390 200 110 $pal[9] 'quicar'; Try-Step 'path bounce' { $e = Fx $s $c 149 2 2.0 0; $e.Timing.BounceEnd = -1 }
    # T8 cliques COM intervalo
    $s = New-Slide $p $light 'T8 três cliques + intervalo 4s' $ink; Set-Trans $s 3849 0.5 4
    for ($k = 0; $k -lt 3; $k++) { $b = Add-Box $s (40 + $k * 300) 160 260 200 $pal[$k] ("clique $($k + 1)"); $null = Fx $s $b 10 1 0.5 0 }
    # T9 cliques SEM intervalo (=> duração default do export)
    $s = New-Slide $p $light 'T9 dois cliques SEM intervalo' $ink; Set-Trans $s 3849 0.5 -1
    for ($k = 0; $k -lt 2; $k++) { $b = Add-Box $s (140 + $k * 360) 160 300 200 $pal[$k + 3] ("clique $($k + 1)"); $null = Fx $s $b 22 1 1.0 0 }
    # T10 intervalo 0 + cadeia
    $s = New-Slide $p $light 'T10 intervalo 0s + cadeia após anterior' $ink; Set-Trans $s 3849 0.5 0
    $a = Add-Box $s 120 150 280 200 $pal[5] 'esmaecer 1s'; $null = Fx $s $a 10 3 1.0 0
    $b = Add-Box $s 540 150 280 200 $pal[6] 'zoom 1s'; $null = Fx $s $b 23 3 1.0 0
    # T11 slide OCULTO (não deve aparecer)
    $s = New-Slide $p (RGB 200 0 0) 'T11 OCULTO — não pode aparecer' $white; Set-Trans $s 3849 0.5 1
    $s.SlideShowTransition.Hidden = -1
    # T12 gatilho interativo (só dispara com clique na forma) + efeito normal
    $s = New-Slide $p $light 'T12 gatilho interativo (não dispara sozinho)' $ink; Set-Trans $s 3849 0.5 2
    $btn = Add-Box $s 60 140 240 120 $pal[0] 'botão gatilho'
    $tgt = Add-Box $s 360 140 240 120 $pal[1] 'alvo do gatilho'
    $z = Add-Box $s 660 140 240 120 $pal[2] 'normal após'
    Try-Step 'trigger' { $iseq = $s.TimeLine.InteractiveSequences.Add(); $null = $iseq.AddTriggerEffect($tgt, 10, 4, $btn) }
    $null = Fx $s $z 10 3 1.0 0
    # T13 entrada -> saída -> reentrada da mesma forma
    $s = New-Slide $p $light 'T13 entra, sai e entra de novo' $ink; Set-Trans $s 3849 0.5 1
    $a = Add-Box $s 340 150 280 200 $pal[8] 'vai e volta'
    $null = Fx $s $a 1 3 0 0
    Try-Step 'exit' { $e = Fx $s $a 10 3 1.0 0.5; $e.Exit = -1 }
    $null = Fx $s $a 23 3 1.0 0.3
    # T14 transição lenta (2s) sem animação
    $s = New-Slide $p $pal[9] 'T14 transição de 2s, intervalo 2s' $white; Set-Trans $s 3853 2.0 2
    Add-TransitionArt $s 14
    # T15 cortar pelo preto + intervalo 1
    $s = New-Slide $p $pal[10] 'T15 fim' $white; Set-Trans $s 258 -1 1
    Add-TransitionArt $s 15
    Save-Deck $p 'pb-tempo'
  }

  # ════════════════ pb-midia ════════════════
  if (Want 'pb-midia') {
    $p = New-Deck
    # M1 vídeo com reprodução automática
    $s = New-Slide $p (RGB 20 20 24) 'M1 vídeo (reprodução automática)' $white; Set-Trans $s 3849 0.5 5
    Try-Step 'video' {
      $v = $s.Shapes.AddMediaObject2($clip, 0, -1, 200, 90, 560, 315)
      try { $v.AnimationSettings.PlaySettings.PlayOnEntry = -1 } catch { $null = $s.TimeLine.MainSequence.AddEffect($v, 83, 0, 2) }
    }
    # M2 áudio com reprodução automática (ícone visível)
    $s = New-Slide $p (RGB 20 20 24) 'M2 áudio (reprodução automática)' $white; Set-Trans $s 3849 0.5 3
    Try-Step 'audio' {
      $au = $s.Shapes.AddMediaObject2($beep, 0, -1, 440, 230, 80, 80)
      try { $au.AnimationSettings.PlaySettings.PlayOnEntry = -1 } catch { $null = $s.TimeLine.MainSequence.AddEffect($au, 83, 0, 2) }
    }
    # M3 GIF animado
    $s = New-Slide $p $light 'M3 GIF animado' $ink; Set-Trans $s 3849 0.5 3
    Try-Step 'gif' { $null = $s.Shapes.AddPicture($gif, 0, -1, 240, 110, 480, 360) }
    # M4 gráfico
    $s = New-Slide $p $light 'M4 gráfico — revelar' $ink; Set-Trans $s 3849 0.5 1
    Try-Step 'chart' {
      $c = $s.Shapes.AddChart2(-1, 51, 80, 90, 800, 420)
      try { $c.Chart.ChartData.Workbook.Close() } catch {}
      # por série/categoria não é exposto pelo modelo COM p/ gráficos modernos
      # (AddEffect/ConvertToBuildLevel => "Invalid request"): objeto inteiro
      $null = $s.TimeLine.MainSequence.AddEffect($c, 22, 0, 3)
    }
    # M5 SmartArt
    $s = New-Slide $p $light 'M5 SmartArt — esmaecer' $ink; Set-Trans $s 3849 0.5 1
    Try-Step 'smartart' {
      $sa = $s.Shapes.AddSmartArt($ppt.SmartArtLayouts.Item(1), 80, 100, 800, 380)
      # idem SmartArt por nó: objeto inteiro
      $null = $s.TimeLine.MainSequence.AddEffect($sa, 10, 0, 3)
    }
    # M6 tabela
    $s = New-Slide $p $light 'M6 tabela (esmaecer) + imagem (zoom + girar)' $ink; Set-Trans $s 3849 0.5 1
    Try-Step 'tabela' {
      $tb = $s.Shapes.AddTable(4, 3, 40, 110, 460, 260)
      for ($r = 1; $r -le 4; $r++) { for ($cc = 1; $cc -le 3; $cc++) { $tb.Table.Cell($r, $cc).Shape.TextFrame.TextRange.Text = "L$r C$cc" } }
      $null = $s.TimeLine.MainSequence.AddEffect($tb, 10, 0, 3)
    }
    Try-Step 'imagem' {
      $pic = $s.Shapes.AddPicture($photo, 0, -1, 560, 140, 340, 212)
      $null = $s.TimeLine.MainSequence.AddEffect($pic, 23, 0, 3)
      $null = $s.TimeLine.MainSequence.AddEffect($pic, 61, 0, 3)
    }
    # M7 grupo
    $s = New-Slide $p $light 'M7 grupo (aumentar e girar)' $ink; Set-Trans $s 3849 0.5 1
    Try-Step 'grupo' {
      $a = $s.Shapes.AddShape(9, 300, 150, 160, 160); $a.Fill.ForeColor.RGB = $pal[0]; $a.Line.Visible = 0
      $b = $s.Shapes.AddShape(1, 420, 230, 220, 140); $b.Fill.ForeColor.RGB = $pal[1]; $b.Line.Visible = 0
      $c = $s.Shapes.AddShape(92, 520, 120, 140, 140); $c.Fill.ForeColor.RGB = $pal[4]; $c.Line.Visible = 0
      $g = $s.Shapes.Range(@($a.Name, $b.Name, $c.Name)).Group()
      $null = $s.TimeLine.MainSequence.AddEffect($g, 31, 0, 3)
    }
    Save-Deck $p 'pb-midia'
  }

  # ════════════════ showcase_animado (.ppt) ════════════════
  if (Want 'showcase_animado') {
    $src = Join-Path $slidesRoot 'samples\showcase_animado.pptx'
    $p = $ppt.Presentations.Open($src, $true, $false, $false)
    Try-Step 'showcase .ppt' { $p.SaveAs((Join-Path $outDir 'showcase_animado.ppt'), 1) }
    Write-Host 'deck showcase_animado -> .ppt'
    $p.Close()
  }
} finally {
  if ($ppt) { $ppt.Quit(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) }
}
Write-Host "SKIPS: $($script:skips.Count)"
foreach ($sk in $script:skips) { Write-Host "  - $sk" }

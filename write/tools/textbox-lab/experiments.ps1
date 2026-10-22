# Experimentos do oraculo da caixa de texto (dot-source em textbox-oracle.ps1).
# Cada Op recebe $c: @{ app; doc; box (Shape da caixa); img; info; ex; outDir; name }.
# Constantes: msoTrue -1; WdWrapType Square 0, Tight 1, Through 2, Front 3,
# TopBottom 4, Behind 5, Inline 7; MsoTextOrientation Horizontal 1, Upward 2,
# Downward 3, VerticalFarEast 4, Vertical 5, HorizontalRotatedFarEast 6;
# MsoVerticalAnchor Top 1, Middle 3, Bottom 4; MsoThemeColorIndex Accent1 5.
$E = [ordered]@{}

function Add-Box($c, [double]$l, [double]$t, [double]$w, [double]$h, [string]$text) {
  $a = $c.doc.Paragraphs.Item(2).Range
  $b = $c.doc.Shapes.AddTextbox(1, $l, $t, $w, $h, $a)
  if ($text -ne '') { $b.TextFrame.TextRange.Text = $text }
  return $b
}

# ---- o padrao ----
$E['default'] = @{ Op = { param($c) } }
$E['empty'] = @{ Op = { param($c) $c.box.TextFrame.TextRange.Text = '' } }
$E['two-paras'] = @{ Op = { param($c) $c.box.TextFrame.TextRange.Text = "Primeira linha`rSegunda linha" } }
$E['add-vertical'] = @{ NoBox = $true; Op = { param($c) $a = $c.doc.Paragraphs.Item(2).Range; $b = $c.doc.Shapes.AddTextbox(5, 100, 20, 90, 180, $a); $b.TextFrame.TextRange.Text = 'Vertical' } }
$E['add-upward'] = @{ NoBox = $true; Op = { param($c) $a = $c.doc.Paragraphs.Item(2).Range; $b = $c.doc.Shapes.AddTextbox(2, 100, 20, 90, 180, $a); $b.TextFrame.TextRange.Text = 'Para cima' } }

# ---- preenchimento ----
$E['fill-rgb'] = @{ Op = { param($c) $c.box.Fill.ForeColor.RGB = 0xFF9933 } }
$E['fill-theme'] = @{ Op = { param($c) $c.box.Fill.ForeColor.ObjectThemeColor = 6 } }
$E['fill-theme-light40'] = @{ Op = { param($c) $c.box.Fill.ForeColor.ObjectThemeColor = 5; $c.box.Fill.ForeColor.Brightness = 0.4 } }
$E['fill-theme-dark25'] = @{ Op = { param($c) $c.box.Fill.ForeColor.ObjectThemeColor = 5; $c.box.Fill.ForeColor.Brightness = -0.25 } }
$E['fill-tint'] = @{ Op = { param($c) $c.box.Fill.ForeColor.ObjectThemeColor = 5; $c.box.Fill.ForeColor.TintAndShade = 0.5 } }
$E['fill-none'] = @{ Op = { param($c) $c.box.Fill.Visible = 0 } }
$E['fill-transp'] = @{ Op = { param($c) $c.box.Fill.ForeColor.RGB = 0xFF9933; $c.box.Fill.Transparency = 0.5 } }
$E['fill-grad2'] = @{ Op = { param($c) $c.box.Fill.ForeColor.RGB = 0x0000FF; $c.box.Fill.BackColor.RGB = 0xFF0000; $c.box.Fill.TwoColorGradient(1, 1) } }
$E['fill-grad1'] = @{ Op = { param($c) $c.box.Fill.ForeColor.ObjectThemeColor = 5; $c.box.Fill.OneColorGradient(1, 1, 0.5) } }
$E['fill-grad-preset'] = @{ Op = { param($c) $c.box.Fill.PresetGradient(1, 1, 1) } }
$E['fill-grad-diag'] = @{ Op = { param($c) $c.box.Fill.ForeColor.ObjectThemeColor = 5; $c.box.Fill.TwoColorGradient(3, 2) } }
$E['fill-grad-radial'] = @{ Op = { param($c) $c.box.Fill.ForeColor.ObjectThemeColor = 5; $c.box.Fill.TwoColorGradient(7, 1) } }
$E['fill-pattern'] = @{ Op = { param($c) $c.box.Fill.ForeColor.RGB = 0x0000FF; $c.box.Fill.BackColor.RGB = 0xFFFFFF; $c.box.Fill.Patterned(5) } }
$E['fill-pattern-theme'] = @{ Op = { param($c) $c.box.Fill.Patterned(18) } }
$E['fill-picture'] = @{ Op = { param($c) $c.box.Fill.UserPicture($c.img) } }
$E['fill-texture'] = @{ Op = { param($c) $c.box.Fill.PresetTextured(1) } }
$E['fill-texture-user'] = @{ Op = { param($c) $c.box.Fill.UserTextured($c.img) } }

# ---- contorno ----
$E['line-none'] = @{ Op = { param($c) $c.box.Line.Visible = 0 } }
$E['line-rgb'] = @{ Op = { param($c) $l = $c.box.Line; $l.ForeColor.RGB = 255; $l.Weight = 3; $l.DashStyle = 4 } }
$E['line-theme'] = @{ Op = { param($c) $l = $c.box.Line; $l.ForeColor.ObjectThemeColor = 5; $l.Weight = 1.5 } }
$E['line-compound'] = @{ Op = { param($c) $l = $c.box.Line; $l.Weight = 6; $l.Style = 3 } }
$E['line-transp'] = @{ Op = { param($c) $l = $c.box.Line; $l.ForeColor.RGB = 255; $l.Transparency = 0.5 } }

# ---- efeitos ----
$E['shadow-21'] = @{ Op = { param($c) $c.box.Shadow.Type = 21 } }
$E['shadow-inner'] = @{ Op = { param($c) $c.box.Shadow.Type = 30 } }
$E['glow'] = @{ Op = { param($c) $g = $c.box.Glow; $g.Radius = 8; $g.Color.ObjectThemeColor = 5; $g.Transparency = 0.6 } }
$E['softedge-3'] = @{ Op = { param($c) $c.box.SoftEdge.Type = 3 } }
$E['reflection-1'] = @{ Op = { param($c) $c.box.Reflection.Type = 1 } }
$E['bevel-circle'] = @{ Op = { param($c) $c.box.ThreeD.BevelTopType = 3 } }
$E['rot3d'] = @{ Op = { param($c) $c.box.ThreeD.SetPresetCamera(37) } }

# ---- quadro de texto ----
$E['margins'] = @{ Op = { param($c) $t = $c.box.TextFrame; $t.MarginLeft = 10; $t.MarginTop = 3; $t.MarginRight = 12; $t.MarginBottom = 4 } }
$E['anchor-mid'] = @{ Op = { param($c) $c.box.TextFrame.VerticalAnchor = 3 } }
$E['anchor-bottom'] = @{ Op = { param($c) $c.box.TextFrame.VerticalAnchor = 4 } }
$E['autosize'] = @{ Op = { param($c) $c.box.TextFrame.AutoSize = -1 } }
$E['autosize-off'] = @{ Op = { param($c) $c.box.TextFrame.AutoSize = -1; $c.box.TextFrame.AutoSize = 0 } }
$E['nowrap'] = @{ Op = { param($c) $c.box.TextFrame.WordWrap = 0 } }
$E['nowrap-autosize'] = @{ Op = { param($c) $c.box.TextFrame.WordWrap = 0; $c.box.TextFrame.AutoSize = -1 } }
foreach ($o in @(2, 3, 4, 5, 6)) {
  $E["orient-$o"] = @{ Orient = $o; Op = { param($c) $c.box.TextFrame.Orientation = [int]$c.ex.Orient } }
}
$E['norotate'] = @{ Op = { param($c) $c.box.TextFrame2.NoTextRotation = -1 } }
$E['tf2-wrap-off'] = @{ Op = { param($c) $c.box.TextFrame2.WordWrap = 0 } }
$E['tf2-autosize-overflow'] = @{ Op = { param($c) $c.box.TextFrame2.AutoSize = 0 } }
$E['tf2-autosize-shrink'] = @{ Op = { param($c) $c.box.TextFrame2.AutoSize = 2 } }
$E['table-inside'] = @{ Op = { param($c) $r = $c.box.TextFrame.TextRange; $c.doc.Tables.Add($r, 2, 2) | Out-Null } }

# ---- forma ----
foreach ($k in @(5, 9, 7, 4, 10, 6, 2, 3, 61, 105, 108, 92)) {
  $E["shape-$k"] = @{ Ast = $k; Op = { param($c) $c.box.AutoShapeType = [int]$c.ex.Ast } }
}
$E['rot30'] = @{ Op = { param($c) $c.box.Rotation = 30 } }
$E['flipH'] = @{ Op = { param($c) $c.box.Flip(0) } }
$E['hidden'] = @{ Op = { param($c) $c.box.Visible = 0 } }
$E['name'] = @{ Op = { param($c) $c.box.Name = 'Minha caixa' } }
$E['alt'] = @{ Op = { param($c) $c.box.AlternativeText = 'Descricao da caixa'; $c.box.Title = 'Titulo da caixa' } }
$E['size'] = @{ Op = { param($c) $c.box.Width = 200; $c.box.Height = 120 } }
$E['lock-aspect'] = @{ Op = { param($c) $c.box.LockAspectRatio = -1 } }

# ---- quebra e posicao ----
foreach ($k in @(0, 1, 2, 4, 5, 7)) {
  $E["wrap-$k"] = @{ Wrap = $k; Op = { param($c) $c.box.WrapFormat.Type = [int]$c.ex.Wrap } }
}
$E['pos-center-margin'] = @{ Op = { param($c) $s = $c.box; $s.RelativeHorizontalPosition = 0; $s.RelativeVerticalPosition = 0; $s.Left = -999995; $s.Top = -999999 } }
$E['zorder-forward'] = @{ Op = { param($c) $b2 = Add-Box $c 150 40 120 60 'Segunda'; $c.box.ZOrder(2) } }
$E['zorder-behindtext'] = @{ Op = { param($c) $c.box.ZOrder(5) } }
$E['inline-in-header'] = @{ NoBox = $true; Op = { param($c) $h = $c.doc.Sections.Item(1).Headers.Item(1); $b = $h.Shapes.AddTextbox(1, 300, 10, 150, 40, $h.Range); $b.TextFrame.TextRange.Text = 'No cabecalho' } }

# ---- estilos de forma (galeria) ----
for ($k = 1; $k -le 77; $k++) {
  $E["style-$k"] = @{ Style = $k; Op = { param($c) $c.box.ShapeStyle = [int]$c.ex.Style } }
}

# ---- vinculo ----
$LONG = 'Um texto bem comprido que nao cabe numa caixa so e precisa continuar na caixa seguinte da cadeia. ' * 6
$E['link2'] = @{ Op = { param($c) $c.box.TextFrame.TextRange.Text = $LONG; $b2 = Add-Box $c 320 140 150 80 ''; $c.box.TextFrame.Next = $b2.TextFrame } }
$E['link3'] = @{ Op = { param($c) $c.box.TextFrame.TextRange.Text = $LONG; $b2 = Add-Box $c 320 140 150 60 ''; $b3 = Add-Box $c 100 240 150 60 ''; $c.box.TextFrame.Next = $b2.TextFrame; $b2.TextFrame.Next = $b3.TextFrame } }
$E['link-break'] = @{ Op = { param($c) $c.box.TextFrame.TextRange.Text = $LONG; $b2 = Add-Box $c 320 140 150 80 ''; $c.box.TextFrame.Next = $b2.TextFrame; $c.box.TextFrame.BreakForwardLink() } }
$E['link-nonempty'] = @{ Op = { param($c) $b2 = Add-Box $c 320 140 150 80 'Ja tem texto'; $c.box.TextFrame.Next = $b2.TextFrame } }
$E['link-middle-break'] = @{ Op = { param($c) $c.box.TextFrame.TextRange.Text = $LONG; $b2 = Add-Box $c 320 140 150 60 ''; $b3 = Add-Box $c 100 240 150 60 ''; $c.box.TextFrame.Next = $b2.TextFrame; $b2.TextFrame.Next = $b3.TextFrame; $b2.TextFrame.BreakForwardLink() } }

# ---- padrao do documento (Definir como Caixa de Texto Padrao) ----
$E['def-base'] = @{ Op = { param($c) $b2 = Add-Box $c 300 150 120 50 'Nova' } }
$E['def-set'] = @{ Op = { param($c) $c.box.Fill.ForeColor.RGB = 0x0000FF; $c.box.Line.Weight = 3; $c.box.TextFrame.MarginLeft = 20; $c.box.SetShapesDefaultProperties(); $b2 = Add-Box $c 300 150 120 50 'Nova' } }

# ---- modos de compatibilidade (VML) ----
foreach ($m in @(12, 14)) {
  $E["c$m-default"] = @{ Compat = $m; Op = { param($c) } }
  $E["c$m-fill"] = @{ Compat = $m; Op = { param($c) $c.box.Fill.ForeColor.RGB = 0xFF9933; $c.box.Fill.Transparency = 0.25 } }
  $E["c$m-grad"] = @{ Compat = $m; Op = { param($c) $c.box.Fill.ForeColor.RGB = 0x0000FF; $c.box.Fill.BackColor.RGB = 0xFF0000; $c.box.Fill.TwoColorGradient(1, 1) } }
  $E["c$m-line"] = @{ Compat = $m; Op = { param($c) $l = $c.box.Line; $l.ForeColor.RGB = 255; $l.Weight = 3; $l.DashStyle = 4 } }
  $E["c$m-noline"] = @{ Compat = $m; Op = { param($c) $c.box.Line.Visible = 0; $c.box.Fill.Visible = 0 } }
  $E["c$m-margins"] = @{ Compat = $m; Op = { param($c) $t = $c.box.TextFrame; $t.MarginLeft = 10; $t.MarginTop = 3; $t.MarginRight = 12; $t.MarginBottom = 4; $t.VerticalAnchor = 3 } }
  $E["c$m-autosize"] = @{ Compat = $m; Op = { param($c) $c.box.TextFrame.AutoSize = -1 } }
  $E["c$m-orient"] = @{ Compat = $m; Op = { param($c) $c.box.TextFrame.Orientation = 3 } }
  $E["c$m-shadow"] = @{ Compat = $m; Op = { param($c) $c.box.Shadow.Type = 21 } }
  $E["c$m-wrap"] = @{ Compat = $m; Op = { param($c) $c.box.WrapFormat.Type = 0 } }
  $E["c$m-hidden"] = @{ Compat = $m; Op = { param($c) $c.box.Visible = 0; $c.box.Name = 'Minha caixa' } }
  $E["c$m-link"] = @{ Compat = $m; Op = { param($c) $c.box.TextFrame.TextRange.Text = $LONG; $b2 = Add-Box $c 320 140 150 80 ''; $c.box.TextFrame.Next = $b2.TextFrame } }
  $E["c$m-shape"] = @{ Compat = $m; Op = { param($c) $c.box.AutoShapeType = 5 } }
  $E["c$m-rot"] = @{ Compat = $m; Op = { param($c) $c.box.Rotation = 30 } }
}

# ---- galeria interna (estrutura do XML; o conteudo nao entra no repositorio) ----
$E['bb-list'] = @{ NoBox = $true; Op = { param($c)
  $c.app.Templates.LoadBuildingBlocks()
  $found = $null
  $c.info.entries = @()
  foreach ($t in $c.app.Templates) {
    if ($t.Name -notlike '*Building Blocks*' -and $t.Name -notlike '*Blocos*') { continue }
    $c.info.template = $t.Name
    $n = $t.BuildingBlockEntries.Count
    for ($i = 1; $i -le $n; $i++) {
      $e = $t.BuildingBlockEntries.Item($i)
      if ($e.Type.Index -ne 10) { continue }
      $c.info.entries += ,@($e.Name, $e.Category.Name, $e.Type.Name, $e.InsertOptions)
      if ($found -eq $null) { $found = $e }
    }
  }
  if ($found -ne $null) {
    $c.info.inserted = $found.Name
    $found.Insert($c.doc.Paragraphs.Item(2).Range, $true) | Out-Null
  }
} }

# ---- desfazer (pilha unica?) ----
$E['undo'] = @{ NoSave = $true; Op = { param($c)
  $c.doc.UndoClear()
  $c.doc.Paragraphs.Item(1).Range.InsertBefore('AAA ')
  $c.box.TextFrame.TextRange.InsertAfter(' BBB')
  $c.doc.Paragraphs.Item(3).Range.InsertBefore('CCC ')
  $c.info.before = @($c.doc.Paragraphs.Item(1).Range.Text.Substring(0, 4), $c.box.TextFrame.TextRange.Text, $c.doc.Paragraphs.Item(3).Range.Text.Substring(0, 4))
  $c.doc.Undo(1) | Out-Null
  $c.info.undo1 = @($c.doc.Paragraphs.Item(1).Range.Text.Substring(0, 4), $c.box.TextFrame.TextRange.Text, $c.doc.Paragraphs.Item(3).Range.Text.Substring(0, 4))
  $c.doc.Undo(1) | Out-Null
  $c.info.undo2 = @($c.doc.Paragraphs.Item(1).Range.Text.Substring(0, 4), $c.box.TextFrame.TextRange.Text, $c.doc.Paragraphs.Item(3).Range.Text.Substring(0, 4))
  $c.doc.Undo(1) | Out-Null
  $c.info.undo3 = @($c.doc.Paragraphs.Item(1).Range.Text.Substring(0, 4), $c.box.TextFrame.TextRange.Text, $c.doc.Paragraphs.Item(3).Range.Text.Substring(0, 4))
} }

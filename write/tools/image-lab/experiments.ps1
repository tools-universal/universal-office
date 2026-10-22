# Experimentos do oraculo da imagem (dot-source em image-oracle.ps1).
# Cada Op recebe $c: @{ app; doc; ish (InlineShape da imagem); img; img2; info }.
# Constantes do Word: WdWrapType Square 0, Tight 1, Through 2, Front 3,
# TopBottom 4, Behind 5; posicao wdShapeLeft -999998, Center -999995,
# Right -999996, Top -999999, Bottom -999997; relativo Margem 0, Pagina 1,
# Coluna 2 (H) / Paragrafo 2 (V).
$E = [ordered]@{}

function To-Float($c, [int]$wrap = 0) {
  $s = $c.ish.ConvertToShape()
  if ($wrap -ge 0) { $s.WrapFormat.Type = $wrap }
  return $s
}

function Add-Second($c) {
  $p = $c.img
  if ($c.img2 -ne '') { $p = $c.img2 }
  $a = $c.doc.Paragraphs.Item(1).Range
  $s2 = $c.doc.Shapes.AddPicture($p, $false, $true, 300, 40, 90, 68, $a)
  return $s2
}

# ---- sondagem: o que o modelo de objetos alcanca ----
$E['inline'] = @{ Op = { param($c) } }
$E['inline-natural'] = @{ Width = 0; Op = { param($c) } }
$E['wrap-convert'] = @{ Op = { param($c) $c.ish.ConvertToShape() | Out-Null } }
$E['wrap-square'] = @{ Op = { param($c) To-Float $c 0 | Out-Null } }
$E['wrap-tight'] = @{ Op = { param($c) To-Float $c 1 | Out-Null } }
$E['wrap-through'] = @{ Op = { param($c) To-Float $c 2 | Out-Null } }
$E['wrap-front'] = @{ Op = { param($c) To-Float $c 3 | Out-Null } }
$E['wrap-topbottom'] = @{ Op = { param($c) To-Float $c 4 | Out-Null } }
$E['wrap-behind'] = @{ Op = { param($c) To-Float $c 5 | Out-Null } }
$E['wrap-back-inline'] = @{ Op = { param($c) $s = To-Float $c 0; $s.ConvertToInlineShape() | Out-Null } }

$E['pos-tl'] = @{ Op = { param($c) $s = To-Float $c 0; $s.RelativeHorizontalPosition = 0; $s.RelativeVerticalPosition = 0; $s.Left = -999998; $s.Top = -999999 } }
$E['pos-mc'] = @{ Op = { param($c) $s = To-Float $c 0; $s.RelativeHorizontalPosition = 0; $s.RelativeVerticalPosition = 0; $s.Left = -999995; $s.Top = -999995 } }
$E['pos-br'] = @{ Op = { param($c) $s = To-Float $c 0; $s.RelativeHorizontalPosition = 0; $s.RelativeVerticalPosition = 0; $s.Left = -999996; $s.Top = -999997 } }
$E['lock-anchor'] = @{ Op = { param($c) $s = To-Float $c 0; $s.LockAnchor = -1 } }
$E['fix-on-page'] = @{ Op = { param($c) $s = To-Float $c 0; $s.RelativeVerticalPosition = 1 } }
$E['layout-in-cell-off'] = @{ Op = { param($c) $s = To-Float $c 0; $s.LayoutInCell = 0 } }
$E['overlap-off'] = @{ Op = { param($c) $s = To-Float $c 0; $s.WrapFormat.AllowOverlap = 0 } }
$E['wrap-left-only'] = @{ Op = { param($c) $s = To-Float $c 0; $s.WrapFormat.Side = 1 } }
$E['wrap-dist'] = @{ Op = { param($c) $s = To-Float $c 0; $s.WrapFormat.DistanceLeft = 18; $s.WrapFormat.DistanceTop = 6 } }

$E['crop-left'] = @{ Op = { param($c) $c.ish.PictureFormat.CropLeft = 36 } }
$E['crop-obj'] = @{ Op = { param($c) $k = $c.ish.PictureFormat.Crop; $c.info.crop0 = @{ sw = $k.ShapeWidth; sh = $k.ShapeHeight; pw = $k.PictureWidth; ph = $k.PictureHeight; px = $k.PictureOffsetX; py = $k.PictureOffsetY }; $k.ShapeWidth = 100 } }
$E['crop-fit-neg'] = @{ Op = { param($c) $c.ish.PictureFormat.CropLeft = -20 } }
$E['oval-float'] = @{ Op = { param($c) $s = To-Float $c 0; $s.AutoShapeType = 9 } }
$E['oval-inline'] = @{ Op = { param($c) $s = To-Float $c 0; $s.AutoShapeType = 9; $s.ConvertToInlineShape() | Out-Null } }

$E['alt'] = @{ Op = { param($c) $c.ish.AlternativeText = 'Descricao de teste'; $c.ish.Title = 'Titulo de teste' } }
$E['decorative'] = @{ Op = { param($c) $c.ish.Decorative = -1 } }
$E['rot30-float'] = @{ Op = { param($c) $s = To-Float $c 0; $s.Rotation = 30 } }
$E['rot30-inline'] = @{ Op = { param($c) $s = To-Float $c 0; $s.Rotation = 30; $s.ConvertToInlineShape() | Out-Null } }
$E['flipH'] = @{ Op = { param($c) $s = To-Float $c 0; $s.Flip(0) } }
$E['flipV'] = @{ Op = { param($c) $s = To-Float $c 0; $s.Flip(1) } }

$E['line'] = @{ Op = { param($c) $l = $c.ish.Line; $l.Visible = -1; $l.ForeColor.RGB = 255; $l.Weight = 4.5; $l.DashStyle = 4 } }
$E['line-theme'] = @{ Op = { param($c) $l = $c.ish.Line; $l.Visible = -1; $l.ForeColor.ObjectThemeColor = 5; $l.Weight = 3 } }
$E['shadow-21'] = @{ Op = { param($c) $c.ish.Shadow.Type = 21 } }
$E['shadow-25'] = @{ Op = { param($c) $c.ish.Shadow.Type = 25 } }
$E['shadow-35'] = @{ Op = { param($c) $c.ish.Shadow.Type = 35 } }
$E['reflection-1'] = @{ Op = { param($c) $c.ish.Reflection.Type = 1 } }
$E['reflection-9'] = @{ Op = { param($c) $c.ish.Reflection.Type = 9 } }
$E['glow'] = @{ Op = { param($c) $g = $c.ish.Glow; $g.Radius = 8; $g.Color.ObjectThemeColor = 5; $g.Transparency = 0.6 } }
$E['softedge-3'] = @{ Op = { param($c) $c.ish.SoftEdge.Type = 3 } }
$E['bevel-circle'] = @{ Op = { param($c) $c.ish.ThreeD.BevelTopType = 3 } }
$E['camera-persp'] = @{ Op = { param($c) $c.ish.ThreeD.SetPresetCamera(37) } }

$E['bright'] = @{ Op = { param($c) $c.ish.PictureFormat.Brightness = 0.7 } }
$E['contrast'] = @{ Op = { param($c) $c.ish.PictureFormat.Contrast = 0.3 } }
$E['color-gray'] = @{ Op = { param($c) $c.ish.PictureFormat.ColorType = 2 } }
$E['color-bw'] = @{ Op = { param($c) $c.ish.PictureFormat.ColorType = 3 } }
$E['color-wash'] = @{ Op = { param($c) $c.ish.PictureFormat.ColorType = 4 } }
$E['pe-saturation'] = @{ Op = { param($c) $fx = $c.ish.Fill.PictureEffects.Insert(24); $c.info.params = @(); foreach ($p in $fx.EffectParameters) { $c.info.params += ,@($p.Name, $p.Value) }; $fx.EffectParameters.Item(1).Value = 2 } }
$E['pe-temperature'] = @{ Op = { param($c) $fx = $c.ish.Fill.PictureEffects.Insert(7); $c.info.params = @(); foreach ($p in $fx.EffectParameters) { $c.info.params += ,@($p.Name, $p.Value) }; $fx.EffectParameters.Item(1).Value = 8800 } }
$E['pe-sharpen'] = @{ Op = { param($c) $fx = $c.ish.Fill.PictureEffects.Insert(25); $c.info.params = @(); foreach ($p in $fx.EffectParameters) { $c.info.params += ,@($p.Name, $p.Value) }; $fx.EffectParameters.Item(1).Value = 0.5 } }
$E['pe-brightcontrast'] = @{ Op = { param($c) $fx = $c.ish.Fill.PictureEffects.Insert(3); $c.info.params = @(); foreach ($p in $fx.EffectParameters) { $c.info.params += ,@($p.Name, $p.Value) }; $fx.EffectParameters.Item(1).Value = 0.2 } }
$E['transp-fill'] = @{ Op = { param($c) $c.ish.Fill.Transparency = 0.5 } }
$E['transp-color'] = @{ Op = { param($c) $c.ish.PictureFormat.TransparentBackground = -1; $c.ish.PictureFormat.TransparencyColor = 0x2828DC } }

$E['zorder-front'] = @{ Op = { param($c) $s = To-Float $c 0; $s2 = Add-Second $c; $s.ZOrder(0) } }
$E['zorder-forward'] = @{ Op = { param($c) $s = To-Float $c 0; $s2 = Add-Second $c; $s.ZOrder(2) } }
$E['zorder-behindtext'] = @{ Op = { param($c) $s = To-Float $c 0; $s.ZOrder(5) } }
$E['zorder-fronttext'] = @{ Op = { param($c) $s = To-Float $c 5; $s.ZOrder(4) } }
$E['group'] = @{ Op = { param($c) $s = To-Float $c 0; $s2 = Add-Second $c; $g = $c.doc.Shapes.Range([object[]]@(1, 2)).Group(); $c.info.group = $g.Name } }
$E['align-lefts'] = @{ Op = { param($c) $s = To-Float $c 0; $s2 = Add-Second $c; $c.doc.Shapes.Range([object[]]@(1, 2)).Align(0, 0) } }
$E['reset'] = @{ Op = { param($c) $c.ish.PictureFormat.CropLeft = 36; $c.ish.PictureFormat.Brightness = 0.7; $c.ish.Line.Visible = -1; $c.ish.SoftEdge.Type = 3; $c.ish.Reset() } }
$E['scale'] = @{ Op = { param($c) $c.ish.ScaleWidth = 50; $c.ish.ScaleHeight = 50 } }

# ---- caminho do BOTAO (ExecuteMso com a imagem selecionada) ----
function Sel($c, $target) {
  $c.doc.Activate()
  if ($target -ne $null) { $target.Select() } else { $c.ish.Select() }
}
function Mso($c, [string]$id, $target) {
  Sel $c $target
  $c.app.CommandBars.ExecuteMso($id)
}
function Shp($c) { return $c.doc.Shapes.Item(1) }

$E['ui-square'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare' } }
$E['ui-square-repag'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $c.doc.Repaginate() } }
$E['ui-square-view'] = @{ Op = { param($c) $c.doc.ActiveWindow.View.Type = 3; Mso $c 'TextWrappingSquare'; $c.doc.Repaginate() } }
$E['ui-square-sr'] = @{ Op = { param($c) $c.app.ScreenUpdating = $true; Mso $c 'TextWrappingSquare'; $c.app.ScreenRefresh() } }

# ---- lote 2: trocas de quebra, posicoes, dialogo Layout, ordem, grupo ----
function Ui-Wrap($c, [string]$first, [string]$second) {
  Mso $c $first
  if ($second -ne '') { Mso $c $second (Shp $c) }
}
$E['ui-sq-tight'] = @{ Op = { param($c) Ui-Wrap $c 'TextWrappingSquare' 'TextWrappingTight' } }
$E['ui-tight-sq'] = @{ Op = { param($c) Ui-Wrap $c 'TextWrappingTight' 'TextWrappingSquare' } }
$E['ui-sq-topbottom'] = @{ Op = { param($c) Ui-Wrap $c 'TextWrappingSquare' 'TextWrappingTopAndBottom' } }
$E['ui-sq-front'] = @{ Op = { param($c) Ui-Wrap $c 'TextWrappingSquare' 'TextWrappingInFrontOfText' } }
$E['ui-sq-behind'] = @{ Op = { param($c) Ui-Wrap $c 'TextWrappingSquare' 'TextWrappingBehindText' } }
$E['ui-sq-inline'] = @{ Op = { param($c) Ui-Wrap $c 'TextWrappingSquare' 'TextWrappingInLineWithText' } }
$E['ui-behind-inline'] = @{ Op = { param($c) Ui-Wrap $c 'TextWrappingBehindText' 'TextWrappingInLineWithText' } }
$E['ui-tight-inline'] = @{ Op = { param($c) Ui-Wrap $c 'TextWrappingTight' 'TextWrappingInLineWithText' } }
$E['ui-shadow-sq-inline'] = @{ Op = { param($c) $c.ish.Shadow.Type = 21; Ui-Wrap $c 'TextWrappingSquare' 'TextWrappingInLineWithText' } }
$E['ui-shadow-sq'] = @{ Op = { param($c) $c.ish.Shadow.Type = 21; Ui-Wrap $c 'TextWrappingSquare' '' } }

foreach ($h in @(@('l', -999998), @('c', -999995), @('r', -999996))) {
  foreach ($v in @(@('t', -999999), @('m', -999995), @('b', -999997))) {
    $hn = $h[0]; $hv = $h[1]; $vn = $v[0]; $vv = $v[1]
    $E[('pos9-' + $vn + $hn)] = @{ H = $hv; V = $vv; Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.RelativeHorizontalPosition = 0; $s.RelativeVerticalPosition = 0; $s.Left = $c.ex.H; $s.Top = $c.ex.V } }
  }
}
$E['pct-pos'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.RelativeHorizontalPosition = 0; $s.LeftRelative = 10; $s.RelativeVerticalPosition = 1; $s.TopRelative = 20 } }
$E['book-inside'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.RelativeHorizontalPosition = 0; $s.Left = -999994 } }
$E['abs-page'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.RelativeHorizontalPosition = 1; $s.Left = 100; $s.RelativeVerticalPosition = 1; $s.Top = 200 } }
$E['abs-char-line'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.RelativeHorizontalPosition = 3; $s.Left = 10; $s.RelativeVerticalPosition = 3; $s.Top = 5 } }
$E['rel-size'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.RelativeHorizontalSize = 0; $s.WidthRelative = 50 } }
$E['wrap-largest'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.WrapFormat.Side = 3 } }
$E['wrap-right'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.WrapFormat.Side = 2 } }
$E['no-lockaspect'] = @{ Op = { param($c) $c.ish.LockAspectRatio = 0 } }
$E['distort'] = @{ Op = { param($c) $c.ish.LockAspectRatio = 0; $c.ish.Width = 200 } }
$E['fill-crop'] = @{ Op = { param($c) $c.ish.LockAspectRatio = 0; $c.ish.Width = 200; Mso $c 'PictureFillCrop' } }
$E['fit-crop'] = @{ Op = { param($c) $c.ish.LockAspectRatio = 0; $c.ish.Width = 200; Mso $c 'PictureFitCrop' } }
$E['fill-crop-tall'] = @{ Op = { param($c) $c.ish.LockAspectRatio = 0; $c.ish.Height = 200; Mso $c 'PictureFillCrop' } }
$E['fit-crop-tall'] = @{ Op = { param($c) $c.ish.LockAspectRatio = 0; $c.ish.Height = 200; Mso $c 'PictureFitCrop' } }
$E['ui-reset'] = @{ Op = { param($c) $c.ish.PictureFormat.CropLeft = 36; $c.ish.PictureFormat.Brightness = 0.7; $c.ish.Line.Visible = -1; $c.ish.SoftEdge.Type = 3; $c.ish.Width = 100; Mso $c 'PictureReset' } }
$E['ui-reset-size'] = @{ Op = { param($c) $c.ish.PictureFormat.CropLeft = 36; $c.ish.PictureFormat.Brightness = 0.7; $c.ish.Line.Visible = -1; $c.ish.SoftEdge.Type = 3; $c.ish.Width = 100; Mso $c 'PictureResetAndSize' } }
$E['ui-reset-rot'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.Rotation = 30; $s.Flip(0); $s.Shadow.Type = 21; Mso $c 'PictureReset' $s } }

function Three($c) {
  Mso $c 'TextWrappingInFrontOfText'
  $a = $c.doc.Paragraphs.Item(1).Range
  $s2 = $c.doc.Shapes.AddPicture($c.img, $false, $true, 200, 40, 90, 68, $a)
  $s3 = $c.doc.Shapes.AddPicture($c.img, $false, $true, 330, 60, 90, 68, $a)
  $c.info.before = @(); foreach ($s in $c.doc.Shapes) { $c.info.before += ,@($s.Name, $s.ZOrderPosition) }
  return @((Shp $c), $s2, $s3)
}
$E['z3-front'] = @{ Op = { param($c) $t = Three $c; $t[1].ZOrder(0) } }
$E['z3-back'] = @{ Op = { param($c) $t = Three $c; $t[1].ZOrder(1) } }
$E['z3-forward'] = @{ Op = { param($c) $t = Three $c; $t[1].ZOrder(2) } }
$E['z3-backward'] = @{ Op = { param($c) $t = Three $c; $t[1].ZOrder(3) } }
$E['z3-ui-front'] = @{ Op = { param($c) $t = Three $c; Mso $c 'ObjectBringToFront' $t[0] } }
$E['z3-ui-back'] = @{ Op = { param($c) $t = Three $c; Mso $c 'ObjectSendToBack' $t[2] } }
$E['group2'] = @{ Op = { param($c) $t = Three $c; $g = $c.doc.Shapes.Range([object[]]@(1, 2)).Group(); $c.info.group = $g.Name } }
$E['group-ui'] = @{ Op = { param($c) $t = Three $c; $c.doc.Activate(); $c.doc.Shapes.Range([object[]]@(1, 2)).Select(); $c.app.CommandBars.ExecuteMso('ObjectsGroup') } }
$E['align-page-center'] = @{ Op = { param($c) $t = Three $c; $t[1].Select(); $c.app.Selection.ShapeRange.Align(1, -1) } }
$E['align-sel-tops'] = @{ Op = { param($c) $t = Three $c; $c.doc.Shapes.Range([object[]]@(1, 2, 3)).Align(3, 0) } }
$E['distribute-h'] = @{ Op = { param($c) $t = Three $c; $c.doc.Shapes.Range([object[]]@(1, 2, 3)).Distribute(0, 0) } }
$E['align-ui-left'] = @{ Op = { param($c) $t = Three $c; Mso $c 'ObjectsAlignLeftSmart' $t[1] } }
$E['shd-21'] = @{ Op = { param($c) $c.ish.Shadow.Type = 21 } }
$E['shd-22'] = @{ Op = { param($c) $c.ish.Shadow.Type = 22 } }
$E['shd-23'] = @{ Op = { param($c) $c.ish.Shadow.Type = 23 } }
$E['shd-24'] = @{ Op = { param($c) $c.ish.Shadow.Type = 24 } }
$E['shd-25'] = @{ Op = { param($c) $c.ish.Shadow.Type = 25 } }
$E['shd-26'] = @{ Op = { param($c) $c.ish.Shadow.Type = 26 } }
$E['shd-27'] = @{ Op = { param($c) $c.ish.Shadow.Type = 27 } }
$E['shd-28'] = @{ Op = { param($c) $c.ish.Shadow.Type = 28 } }
$E['shd-29'] = @{ Op = { param($c) $c.ish.Shadow.Type = 29 } }
$E['shd-30'] = @{ Op = { param($c) $c.ish.Shadow.Type = 30 } }
$E['shd-31'] = @{ Op = { param($c) $c.ish.Shadow.Type = 31 } }
$E['shd-32'] = @{ Op = { param($c) $c.ish.Shadow.Type = 32 } }
$E['shd-33'] = @{ Op = { param($c) $c.ish.Shadow.Type = 33 } }
$E['shd-34'] = @{ Op = { param($c) $c.ish.Shadow.Type = 34 } }
$E['shd-35'] = @{ Op = { param($c) $c.ish.Shadow.Type = 35 } }
$E['shd-36'] = @{ Op = { param($c) $c.ish.Shadow.Type = 36 } }
$E['shd-37'] = @{ Op = { param($c) $c.ish.Shadow.Type = 37 } }
$E['shd-38'] = @{ Op = { param($c) $c.ish.Shadow.Type = 38 } }
$E['shd-39'] = @{ Op = { param($c) $c.ish.Shadow.Type = 39 } }
$E['shd-40'] = @{ Op = { param($c) $c.ish.Shadow.Type = 40 } }
$E['shd-41'] = @{ Op = { param($c) $c.ish.Shadow.Type = 41 } }
$E['shd-42'] = @{ Op = { param($c) $c.ish.Shadow.Type = 42 } }
$E['shd-43'] = @{ Op = { param($c) $c.ish.Shadow.Type = 43 } }
$E['refl-1'] = @{ Op = { param($c) $c.ish.Reflection.Type = 1 } }
$E['refl-2'] = @{ Op = { param($c) $c.ish.Reflection.Type = 2 } }
$E['refl-3'] = @{ Op = { param($c) $c.ish.Reflection.Type = 3 } }
$E['refl-4'] = @{ Op = { param($c) $c.ish.Reflection.Type = 4 } }
$E['refl-5'] = @{ Op = { param($c) $c.ish.Reflection.Type = 5 } }
$E['refl-6'] = @{ Op = { param($c) $c.ish.Reflection.Type = 6 } }
$E['refl-7'] = @{ Op = { param($c) $c.ish.Reflection.Type = 7 } }
$E['refl-8'] = @{ Op = { param($c) $c.ish.Reflection.Type = 8 } }
$E['refl-9'] = @{ Op = { param($c) $c.ish.Reflection.Type = 9 } }
$E['soft-1'] = @{ Op = { param($c) $c.ish.SoftEdge.Type = 1 } }
$E['soft-2'] = @{ Op = { param($c) $c.ish.SoftEdge.Type = 2 } }
$E['soft-3'] = @{ Op = { param($c) $c.ish.SoftEdge.Type = 3 } }
$E['soft-4'] = @{ Op = { param($c) $c.ish.SoftEdge.Type = 4 } }
$E['soft-5'] = @{ Op = { param($c) $c.ish.SoftEdge.Type = 5 } }
$E['soft-6'] = @{ Op = { param($c) $c.ish.SoftEdge.Type = 6 } }
$E['bevel-1'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.BevelTopType = 1 } }
$E['bevel-2'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.BevelTopType = 2 } }
$E['bevel-3'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.BevelTopType = 3 } }
$E['bevel-4'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.BevelTopType = 4 } }
$E['bevel-5'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.BevelTopType = 5 } }
$E['bevel-6'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.BevelTopType = 6 } }
$E['bevel-7'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.BevelTopType = 7 } }
$E['bevel-8'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.BevelTopType = 8 } }
$E['bevel-9'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.BevelTopType = 9 } }
$E['bevel-10'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.BevelTopType = 10 } }
$E['bevel-11'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.BevelTopType = 11 } }
$E['bevel-12'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.BevelTopType = 12 } }
$E['bevel-13'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.BevelTopType = 13 } }
$E['cam-1'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(1) } }
$E['cam-2'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(2) } }
$E['cam-3'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(3) } }
$E['cam-4'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(4) } }
$E['cam-5'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(5) } }
$E['cam-6'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(6) } }
$E['cam-7'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(7) } }
$E['cam-8'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(8) } }
$E['cam-9'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(9) } }
$E['cam-10'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(10) } }
$E['cam-11'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(11) } }
$E['cam-12'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(12) } }
$E['cam-13'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(13) } }
$E['cam-14'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(14) } }
$E['cam-15'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(15) } }
$E['cam-16'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(16) } }
$E['cam-17'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(17) } }
$E['cam-18'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(18) } }
$E['cam-19'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(19) } }
$E['cam-20'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(20) } }
$E['cam-21'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(21) } }
$E['cam-22'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(22) } }
$E['cam-23'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(23) } }
$E['cam-24'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(24) } }
$E['cam-25'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(25) } }
$E['cam-26'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(26) } }
$E['cam-27'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(27) } }
$E['cam-28'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(28) } }
$E['cam-29'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(29) } }
$E['cam-30'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(30) } }
$E['cam-31'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(31) } }
$E['cam-32'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(32) } }
$E['cam-33'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(33) } }
$E['cam-34'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(34) } }
$E['cam-35'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(35) } }
$E['cam-36'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(36) } }
$E['cam-37'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(37) } }
$E['cam-38'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(38) } }
$E['cam-39'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(39) } }
$E['cam-40'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(40) } }
$E['cam-41'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(41) } }
$E['cam-42'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(42) } }
$E['cam-43'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(43) } }
$E['cam-44'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(44) } }
$E['cam-45'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(45) } }
$E['cam-46'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(46) } }
$E['cam-47'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(47) } }
$E['cam-48'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(48) } }
$E['cam-49'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(49) } }
$E['cam-50'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(50) } }
$E['cam-51'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(51) } }
$E['cam-52'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(52) } }
$E['cam-53'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(53) } }
$E['cam-54'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(54) } }
$E['cam-55'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(55) } }
$E['cam-56'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(56) } }
$E['cam-57'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(57) } }
$E['cam-58'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(58) } }
$E['cam-59'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(59) } }
$E['cam-60'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(60) } }
$E['cam-61'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(61) } }
$E['cam-62'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetPresetCamera(62) } }
$E['p3d-1'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(1) } }
$E['p3d-2'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(2) } }
$E['p3d-3'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(3) } }
$E['p3d-4'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(4) } }
$E['p3d-5'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(5) } }
$E['p3d-6'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(6) } }
$E['p3d-7'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(7) } }
$E['p3d-8'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(8) } }
$E['p3d-9'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(9) } }
$E['p3d-10'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(10) } }
$E['p3d-11'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(11) } }
$E['p3d-12'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(12) } }
$E['p3d-13'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(13) } }
$E['p3d-14'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(14) } }
$E['p3d-15'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(15) } }
$E['p3d-16'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(16) } }
$E['p3d-17'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(17) } }
$E['p3d-18'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(18) } }
$E['p3d-19'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(19) } }
$E['p3d-20'] = @{ Op = { param($c) Mso $c 'TextWrappingSquare'; $s = Shp $c; $s.ThreeD.SetThreeDFormat(20) } }

# ---- lote 3: varreduras de efeito para medir o desenho (PDF) ----
foreach ($b in @(2, 4, 8, 16)) {
  $E[('fx-shblur-' + $b)] = @{ B = $b; Op = { param($c) $s = $c.ish.Shadow; $s.Visible = -1; $s.Style = 2; $s.Blur = $c.ex.B; $s.OffsetX = 0; $s.OffsetY = 0; $s.Size = 100; $s.Transparency = 0.4; $s.ForeColor.RGB = 0 } }
}
foreach ($r in @(4, 8, 16, 32)) {
  $E[('fx-glow-' + $r)] = @{ R = $r; Op = { param($c) $g = $c.ish.Glow; $g.Radius = $c.ex.R; $g.Color.RGB = 255; $g.Transparency = 0 } }
}
foreach ($r in @(1, 2.5, 5, 10, 20)) {
  $E[('fx-soft-' + $r)] = @{ R = $r; Op = { param($c) $c.ish.SoftEdge.Radius = $c.ex.R } }
}
foreach ($v in @(@(0, 50, 0), @(4, 50, 0), @(0, 100, 0), @(0, 50, 10))) {
  $E[('fx-refl-' + $v[0] + '-' + $v[1] + '-' + $v[2])] = @{ V = $v; Op = { param($c) $r = $c.ish.Reflection; $r.Type = 1; $r.Blur = $c.ex.V[0]; $r.Size = $c.ex.V[1]; $r.Offset = $c.ex.V[2]; $r.Transparency = 0.5 } }
}
foreach ($v in @(@(4, 0), @(8, 4))) {
  $E[('fx-inner-' + $v[0] + '-' + $v[1])] = @{ V = $v; Op = { param($c) $s = $c.ish.Shadow; $s.Visible = -1; $s.Style = 1; $s.Blur = $c.ex.V[0]; $s.OffsetX = $c.ex.V[1]; $s.OffsetY = 0; $s.Transparency = 0.5; $s.ForeColor.RGB = 0 } }
}

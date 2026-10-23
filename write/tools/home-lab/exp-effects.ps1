# Experimentos de EFEITOS DE TEXTO E TIPOGRAFIA: o XML (w14) que o Word grava para os
# modelos de WordArt (TextFrame2.WordArtFormat = msoTextEffect1..20, a mesma galeria do
# botao Efeitos de Texto), para cada propriedade de Font (Fill/Line/TextShadow/Reflection/
# Glow/ThreeD) e para a tipografia OpenType (Ligatures/NumberForm/NumberSpacing/
# StylisticSet/ContextualAlternates). Carregado por home-oracle.ps1. ASCII puro.

$TXT = 'Efeito de texto Abc 123'

function Body-Text($doc) {
  $doc.Content.Text = $TXT
  $r = $doc.Paragraphs.Item(1).Range
  $r.MoveEnd(1, -1) | Out-Null
  $r.Font.Size = 28
  return $r
}

function Run-Info($r) {
  $f = $r.Font
  $o = [ordered]@{}
  try { $o.glow = [ordered]@{ radius = $f.Glow.Radius; color = $f.Glow.Color.RGB; tr = $f.Glow.Transparency } } catch {}
  try { $o.refl = [ordered]@{ type = $f.Reflection.Type; size = $f.Reflection.Size; tr = $f.Reflection.Transparency; offset = $f.Reflection.Offset; blur = $f.Reflection.Blur } } catch {}
  try { $s = $f.TextShadow; $o.shadow = [ordered]@{ visible = $s.Visible; style = $s.Style; blur = $s.Blur; ox = $s.OffsetX; oy = $s.OffsetY; tr = $s.Transparency; size = $s.Size } } catch {}
  try { $o.line = [ordered]@{ visible = $f.Line.Visible; weight = $f.Line.Weight } } catch {}
  return $o
}

# WordArt (galeria): caixa de texto com o texto e o modelo N
function Exp-WordArt($app, $doc, [int]$n) {
  $doc.Content.Text = ''
  $err = ''
  $name = ''
  try { $sh = $doc.Shapes.AddTextEffect(($n - 1), $TXT, 'Calibri', 28, 0, 0, 72, 72); $name = $sh.Name } catch { $err = [string]$_.Exception.Message }
  return [ordered]@{ err = $err; n = $n; name = $name }
}

# propriedade de Font no texto do corpo
function Exp-Prop($app, $doc, [scriptblock]$set) {
  $r = Body-Text $doc
  $err = ''
  try { & $set $r } catch { $err = [string]$_.Exception.Message }
  $info = Run-Info $r
  $info.err = $err
  return $info
}

$EXPERIMENTS = @()
foreach ($i in 1..20) {
  $ii = $i
  $EXPERIMENTS += @{ Name = ('wa-{0:D2}' -f $i); Run = [scriptblock]::Create("param(`$app, `$doc) Exp-WordArt `$app `$doc $ii") }
}
$EXPERIMENTS += @(
  # brilho: os 4 tamanhos do menu (5, 8, 11, 18 pt) com a cor de destaque 1 a 60% de transparencia
  @{ Name = 'glow-5'; Pdf = $true; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $r.Font.Glow.Radius = 5; $r.Font.Glow.Color.ObjectThemeColor = 5; $r.Font.Glow.Transparency = 0.6 } } },
  @{ Name = 'glow-18'; Pdf = $true; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $r.Font.Glow.Radius = 18; $r.Font.Glow.Color.ObjectThemeColor = 5; $r.Font.Glow.Transparency = 0.6 } } },
  # reflexo: os tipos do menu (1..9)
  @{ Name = 'refl-1'; Pdf = $true; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $r.Font.Reflection.Type = 1 } } },
  @{ Name = 'refl-5'; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $r.Font.Reflection.Type = 5 } } },
  @{ Name = 'refl-9'; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $r.Font.Reflection.Type = 9 } } },
  # sombra externa (deslocamento inferior direito) e a de perspectiva
  @{ Name = 'shadow-outer'; Pdf = $true; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $s = $r.Font.TextShadow; $s.Visible = -1; $s.Style = 2; $s.OffsetX = 2.12; $s.OffsetY = 2.12; $s.Blur = 4; $s.Transparency = 0.6 } } },
  @{ Name = 'shadow-inner'; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $s = $r.Font.TextShadow; $s.Visible = -1; $s.Style = 1; $s.OffsetX = 2.12; $s.OffsetY = 2.12; $s.Blur = 4; $s.Transparency = 0.5 } } },
  # contorno: cor, espessura e tracejado
  @{ Name = 'outline'; Pdf = $true; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $l = $r.Font.Line; $l.Visible = -1; $l.ForeColor.RGB = 255; $l.Weight = 1.5; $l.DashStyle = 4 } } },
  # preenchimento: gradiente de duas cores e cor solida transparente
  @{ Name = 'fill-grad'; Pdf = $true; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $f = $r.Font.Fill; $f.Visible = -1; $f.TwoColorGradient(1, 1); $f.ForeColor.RGB = 255; $f.BackColor.RGB = 16711680 } } },
  @{ Name = 'fill-solid-tr'; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $f = $r.Font.Fill; $f.Visible = -1; $f.Solid(); $f.ForeColor.RGB = 32768; $f.Transparency = 0.4 } } },
  # 3D: bisel superior circular
  @{ Name = 'bevel'; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $r.Font.ThreeD.BevelTopType = 3; $r.Font.ThreeD.BevelTopInset = 6; $r.Font.ThreeD.BevelTopDepth = 6 } } },
  # tipografia OpenType
  @{ Name = 'lig-all'; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $r.Font.Ligatures = 15 } } },
  @{ Name = 'lig-std'; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $r.Font.Ligatures = 1 } } },
  @{ Name = 'lig-stdctx'; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $r.Font.Ligatures = 3 } } },
  @{ Name = 'numform-old'; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $r.Font.NumberForm = 2 } } },
  @{ Name = 'numform-lining'; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $r.Font.NumberForm = 1 } } },
  @{ Name = 'numspacing-tab'; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $r.Font.NumberSpacing = 2 } } },
  @{ Name = 'numspacing-prop'; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $r.Font.NumberSpacing = 1 } } },
  @{ Name = 'styset-1'; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $r.Font.StylisticSet = 1 } } },
  @{ Name = 'styset-20'; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $r.Font.StylisticSet = 20 } } },
  @{ Name = 'cntxt'; Run = { param($app, $doc) Exp-Prop $app $doc { param($r) $r.Font.ContextualAlternates = -1 } } }
)

# Experimentos de EFEITOS DE TEXTO (2): os modelos dos submenus Reflexo (Reflection.Type 1-9)
# e Sombra (TextShadow.Type, os tipos msoShadow21..43 dos menus) aplicados ao texto do corpo.
# Carregado por home-oracle.ps1. ASCII puro.
$TXT = 'Efeito de texto Abc 123'
function Body-Text($doc) {
  $doc.Content.Text = $TXT
  $r = $doc.Paragraphs.Item(1).Range
  $r.MoveEnd(1, -1) | Out-Null
  $r.Font.Size = 28
  return $r
}
function Exp-Set($app, $doc, [scriptblock]$set) {
  $r = Body-Text $doc
  $err = ''
  try { & $set $r } catch { $err = [string]$_.Exception.Message }
  return [ordered]@{ err = $err }
}
$EXPERIMENTS = @()
foreach ($i in 1..9) {
  $ii = $i
  $EXPERIMENTS += @{ Name = ('refl-t{0}' -f $i); Run = [scriptblock]::Create("param(`$app, `$doc) Exp-Set `$app `$doc { param(`$r) `$r.Font.Reflection.Type = $ii }") }
}
foreach ($i in 21..43) {
  $ii = $i
  $EXPERIMENTS += @{ Name = ('shadow-t{0}' -f $i); Run = [scriptblock]::Create("param(`$app, `$doc) Exp-Set `$app `$doc { param(`$r) `$r.Font.TextShadow.Type = $ii }") }
}
foreach ($i in 1..4) {
  $ii = $i
  $EXPERIMENTS += @{ Name = ('glow-p{0}' -f $i); Run = [scriptblock]::Create("param(`$app, `$doc) Exp-Set `$app `$doc { param(`$r) `$r.Font.Glow.Radius = @(5, 8, 11, 18)[$ii - 1]; `$r.Font.Glow.Color.ObjectThemeColor = 4; `$r.Font.Glow.Transparency = 0.6 }") }
}

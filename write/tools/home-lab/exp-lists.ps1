# Experimentos de LISTAS (Marcadores, Numeracao, Lista de Varios Niveis): as galerias
# do Word, o XML que ele grava ao aplicar/alternar/mudar nivel/reiniciar/continuar e os
# formatos personalizados. Carregado por home-oracle.ps1 (-Set exp-lists.ps1). ASCII puro.

function Lvl-Info($lv) {
  $o = [ordered]@{}
  foreach ($k in @('NumberFormat','NumberStyle','NumberPosition','TextPosition','TabPosition','Alignment','TrailingCharacter','StartAt','ResetOnHigher','LinkedStyle')) { try { $o[$k] = $lv.$k } catch {} }
  try { $o.font = [ordered]@{ name = $lv.Font.Name; size = $lv.Font.Size; bold = $lv.Font.Bold; color = $lv.Font.Color } } catch {}
  $chars = @()
  try { foreach ($c in $lv.NumberFormat.ToCharArray()) { $chars += ('{0:X4}' -f [int]$c) } } catch {}
  $o.codes = ($chars -join ' ')
  return $o
}

function Base3($doc, [string[]]$texts) {
  $doc.Content.Text = ($texts -join "`r")
}

# aplica o modelo i da galeria g aos paragrafos (todos no nivel 1; os do nivel 2 com ListIndent)
function Apply-Gallery($app, $doc, [int]$g, [int]$i, [int[]]$levels) {
  $lt = $app.ListGalleries.Item($g).ListTemplates.Item($i)
  $r = $doc.Content
  $r.ListFormat.ApplyListTemplateWithLevel($lt, $false, 0, 2) | Out-Null
  for ($k = 0; $k -lt $levels.Count; $k++) {
    if ($levels[$k] -gt 1) { $doc.Paragraphs.Item($k + 1).Range.ListFormat.ListLevelNumber = $levels[$k] }
  }
}

$TEXTS = @('Primeiro item', 'Segundo item', 'Terceiro item', 'Quarto item')

$EXPERIMENTS = @(
  # ---- galerias: o que o Word oferece (modelos e niveis) ----
  @{ Name = 'galleries'; Run = { param($app, $doc)
      $out = [ordered]@{}
      foreach ($g in 1, 2, 3) {
        $lts = $app.ListGalleries.Item($g).ListTemplates
        $arr = @()
        for ($i = 1; $i -le $lts.Count; $i++) {
          $lt = $lts.Item($i)
          $lv = @()
          $n = [Math]::Min($lt.ListLevels.Count, 9)
          for ($k = 1; $k -le $n; $k++) { $lv += (Lvl-Info $lt.ListLevels.Item($k)) }
          $arr += [ordered]@{ index = $i; outline = $lt.OutlineNumbered; name = $lt.Name; modified = $app.ListGalleries.Item($g).Modified($i); levels = $lv }
        }
        $out["g$g"] = $arr
      }
      $out } },
  # ---- botoes Marcadores / Numeracao / Lista de Varios Niveis (padroes) ----
  @{ Name = 'apply-bullet-default'; Run = { param($app, $doc) Base3 $doc $TEXTS; $doc.Range($doc.Paragraphs.Item(2).Range.Start, $doc.Paragraphs.Item(3).Range.End).ListFormat.ApplyBulletDefault(); [ordered]@{ style = $doc.Paragraphs.Item(2).Style.NameLocal; lead = $doc.Paragraphs.Item(2).LeftIndent; first = $doc.Paragraphs.Item(2).FirstLineIndent } } },
  @{ Name = 'apply-number-default'; Run = { param($app, $doc) Base3 $doc $TEXTS; $doc.Range($doc.Paragraphs.Item(2).Range.Start, $doc.Paragraphs.Item(3).Range.End).ListFormat.ApplyNumberDefault(); [ordered]@{ style = $doc.Paragraphs.Item(2).Style.NameLocal; str = $doc.Paragraphs.Item(3).Range.ListFormat.ListString } } },
  @{ Name = 'apply-outline-default'; Run = { param($app, $doc) Base3 $doc $TEXTS; $doc.Range($doc.Paragraphs.Item(2).Range.Start, $doc.Paragraphs.Item(3).Range.End).ListFormat.ApplyOutlineNumberDefault(); [ordered]@{ style = $doc.Paragraphs.Item(2).Style.NameLocal } } },
  # alternar: o botao de novo tira a lista (e o estilo Paragrafo da Lista?)
  @{ Name = 'toggle-bullet-off'; Run = { param($app, $doc) Base3 $doc $TEXTS; $r = $doc.Range($doc.Paragraphs.Item(2).Range.Start, $doc.Paragraphs.Item(3).Range.End); $r.ListFormat.ApplyBulletDefault(); $r.ListFormat.ApplyBulletDefault(); [ordered]@{ style = $doc.Paragraphs.Item(2).Style.NameLocal; type = $r.ListFormat.ListType } } },
  @{ Name = 'remove-numbers'; Run = { param($app, $doc) Base3 $doc $TEXTS; $r = $doc.Range($doc.Paragraphs.Item(2).Range.Start, $doc.Paragraphs.Item(3).Range.End); $r.ListFormat.ApplyNumberDefault(); $r.ListFormat.RemoveNumbers(1); [ordered]@{ style = $doc.Paragraphs.Item(2).Style.NameLocal } } },
  # trocar marcador por numeracao numa lista existente
  @{ Name = 'bullet-then-number'; Run = { param($app, $doc) Base3 $doc $TEXTS; $r = $doc.Range($doc.Paragraphs.Item(2).Range.Start, $doc.Paragraphs.Item(3).Range.End); $r.ListFormat.ApplyBulletDefault(); $r.ListFormat.ApplyNumberDefault(); [ordered]@{ str = $doc.Paragraphs.Item(2).Range.ListFormat.ListString } } },
  # ---- niveis ----
  @{ Name = 'level-indent'; Run = { param($app, $doc) Base3 $doc $TEXTS; $doc.Content.ListFormat.ApplyNumberDefault(); $doc.Paragraphs.Item(2).Range.ListFormat.ListIndent(); $doc.Paragraphs.Item(3).Range.ListFormat.ListIndent(); $doc.Paragraphs.Item(3).Range.ListFormat.ListIndent(); [ordered]@{ strs = @($doc.Paragraphs.Item(1).Range.ListFormat.ListString, $doc.Paragraphs.Item(2).Range.ListFormat.ListString, $doc.Paragraphs.Item(3).Range.ListFormat.ListString, $doc.Paragraphs.Item(4).Range.ListFormat.ListString) } } },
  @{ Name = 'bullet-levels'; Run = { param($app, $doc) Base3 $doc $TEXTS; $doc.Content.ListFormat.ApplyBulletDefault(); for ($k = 2; $k -le 4; $k++) { $doc.Paragraphs.Item($k).Range.ListFormat.ListLevelNumber = $k }; [ordered]@{ strs = @(1..4 | ForEach-Object { [int][char]$doc.Paragraphs.Item($_).Range.ListFormat.ListString }) } } },
  # ---- Enter e Backspace numa lista (TypeParagraph / TypeBackspace, como o teclado) ----
  @{ Name = 'enter-end-item'; Run = { param($app, $doc) Base3 $doc @('Item um', 'Item dois'); $doc.Content.ListFormat.ApplyNumberDefault(); $doc.Paragraphs.Item(2).Range.Characters.Last.Select(); $app.Selection.Collapse(1); $app.Selection.TypeParagraph(); $app.Selection.TypeText('Item tres'); [ordered]@{ n = $doc.Paragraphs.Count; str = $doc.Paragraphs.Item(3).Range.ListFormat.ListString } } },
  @{ Name = 'enter-empty-item'; Run = { param($app, $doc) Base3 $doc @('Item um', 'Item dois'); $doc.Content.ListFormat.ApplyNumberDefault(); $doc.Paragraphs.Item(2).Range.Characters.Last.Select(); $app.Selection.Collapse(1); $app.Selection.TypeParagraph(); $app.Selection.TypeParagraph(); [ordered]@{ n = $doc.Paragraphs.Count; types = @(1..$doc.Paragraphs.Count | ForEach-Object { $doc.Paragraphs.Item($_).Range.ListFormat.ListType }) } } },
  @{ Name = 'backspace-start'; Run = { param($app, $doc) Base3 $doc @('Item um', 'Item dois', 'Item tres'); $doc.Content.ListFormat.ApplyNumberDefault(); $doc.Paragraphs.Item(2).Range.Characters.First.Select(); $app.Selection.Collapse(1); $app.Selection.TypeBackspace(); $a = [ordered]@{ type = $doc.Paragraphs.Item(2).Range.ListFormat.ListType; left = $doc.Paragraphs.Item(2).LeftIndent; first = $doc.Paragraphs.Item(2).FirstLineIndent; str3 = $doc.Paragraphs.Item(3).Range.ListFormat.ListString }; $app.Selection.TypeBackspace(); $a.after2 = [ordered]@{ n = $doc.Paragraphs.Count; left = $doc.Paragraphs.Item(2).LeftIndent; text = $doc.Paragraphs.Item(2).Range.Text }; $a } },
  @{ Name = 'tab-start-item'; Run = { param($app, $doc) Base3 $doc @('Item um', 'Item dois'); $doc.Content.ListFormat.ApplyNumberDefault(); $doc.Paragraphs.Item(2).Range.Characters.First.Select(); $app.Selection.Collapse(1); $app.Selection.TypeText("`t"); [ordered]@{ lvl = $doc.Paragraphs.Item(2).Range.ListFormat.ListLevelNumber; text = $doc.Paragraphs.Item(2).Range.Text } } },
  # ---- reiniciar / continuar / definir valor ----
  @{ Name = 'restart-at-1'; Run = { param($app, $doc) Base3 $doc $TEXTS; $doc.Content.ListFormat.ApplyNumberDefault(); $r = $doc.Paragraphs.Item(3).Range; $lt = $r.ListFormat.ListTemplate; $r.ListFormat.ApplyListTemplateWithLevel($lt, $false, 2, 2); [ordered]@{ strs = @(1..4 | ForEach-Object { $doc.Paragraphs.Item($_).Range.ListFormat.ListString }) } } },
  @{ Name = 'continue-previous'; Run = { param($app, $doc) Base3 $doc @('Um', 'Dois', 'Texto comum', 'Tres', 'Quatro'); foreach ($k in 1, 2, 4, 5) { $doc.Paragraphs.Item($k).Range.ListFormat.ApplyNumberDefault() }; $before = @(1, 2, 4, 5 | ForEach-Object { $doc.Paragraphs.Item($_).Range.ListFormat.ListString }); $r = $doc.Paragraphs.Item(4).Range; $r.ListFormat.ApplyListTemplateWithLevel($r.ListFormat.ListTemplate, $true, 2, 2); [ordered]@{ before = $before; after = @(1, 2, 4, 5 | ForEach-Object { $doc.Paragraphs.Item($_).Range.ListFormat.ListString }) } } },
  @{ Name = 'set-value-5'; Run = { param($app, $doc) Base3 $doc $TEXTS; $doc.Content.ListFormat.ApplyNumberDefault(); $r = $doc.Paragraphs.Item(2).Range; $err = ''; try { $lt = $r.ListFormat.ListTemplate; $lt.ListLevels.Item(1).StartAt = 5; $r.ListFormat.ApplyListTemplateWithLevel($lt, $false, 2, 2) } catch { $err = [string]$_.Exception.Message }; [ordered]@{ err = $err; strs = @(1..4 | ForEach-Object { $doc.Paragraphs.Item($_).Range.ListFormat.ListString }) } } },
  # ---- formatos personalizados ----
  @{ Name = 'custom-bullet-symbol'; Run = { param($app, $doc) Base3 $doc $TEXTS; $lt = $app.ListGalleries.Item(1).ListTemplates.Item(1); $doc.Content.ListFormat.ApplyListTemplateWithLevel($lt, $false, 0, 2); $own = $doc.Paragraphs.Item(1).Range.ListFormat.ListTemplate; $lv = $own.ListLevels.Item(1); $lv.NumberFormat = [string][char]0xF076; $lv.Font.Name = 'Wingdings'; $doc.Content.ListFormat.ApplyListTemplateWithLevel($own, $true, 0, 2); [ordered]@{ lv = (Lvl-Info $lv) } } },
  @{ Name = 'custom-number-format'; Run = { param($app, $doc) Base3 $doc $TEXTS; $doc.Content.ListFormat.ApplyNumberDefault(); $own = $doc.Paragraphs.Item(1).Range.ListFormat.ListTemplate; $lv = $own.ListLevels.Item(1); $lv.NumberStyle = 4; $lv.NumberFormat = 'Item %1:'; $lv.Alignment = 2; $doc.Content.ListFormat.ApplyListTemplateWithLevel($own, $true, 0, 2); [ordered]@{ strs = @(1..4 | ForEach-Object { $doc.Paragraphs.Item($_).Range.ListFormat.ListString }) } } }
)
# cada modelo das galerias aplicado (4 paragrafos; o 2o e o 4o num nivel abaixo)
foreach ($g in 1, 2, 3) {
  foreach ($i in 1..9) {
    $gg = $g; $ii = $i
    $EXPERIMENTS += @{ Name = "gal-$g-$i"; Run = [scriptblock]::Create("param(`$app, `$doc) if (`$app.ListGalleries.Item($gg).ListTemplates.Count -lt $ii) { return [ordered]@{ skip = `$true } }; Base3 `$doc `$TEXTS; Apply-Gallery `$app `$doc $gg $ii @(1, 2, 1, 3); [ordered]@{ strs = @(1..4 | ForEach-Object { `$doc.Paragraphs.Item(`$_).Range.ListFormat.ListString }); style = `$doc.Paragraphs.Item(1).Style.NameLocal }") }
  }
}

# Experimentos do ESTILO DE LISTA (Definir Novo Estilo de Lista): o XML que o Word grava
# ao criar um estilo de lista (w:style w:type="numbering" + w:abstractNum com w:styleLink),
# ao aplica-lo aos paragrafos (w:numStyleLink?) e ao modifica-lo. Carregado por
# home-oracle.ps1 (-Set exp-liststyle.ps1). ASCII puro.

function Base3($doc, [string[]]$texts) {
  $doc.Content.Text = ($texts -join "`r")
}

function Lvl-Info($lv) {
  $o = [ordered]@{}
  foreach ($k in @('NumberFormat','NumberStyle','NumberPosition','TextPosition','TabPosition','Alignment','TrailingCharacter','StartAt','ResetOnHigher','LinkedStyle')) { try { $o[$k] = $lv.$k } catch {} }
  try { $o.font = [ordered]@{ name = $lv.Font.Name; size = $lv.Font.Size; bold = $lv.Font.Bold } } catch {}
  return $o
}

function New-ListStyle($doc, [bool]$custom) {
  $st = $doc.Styles.Add('Lista Teste', 4)
  if ($custom) {
    $lt = $st.ListTemplate
    $lv = $lt.ListLevels.Item(1); $lv.NumberStyle = 0; $lv.NumberFormat = '%1)'; $lv.StartAt = 1
    $lv2 = $lt.ListLevels.Item(2); $lv2.NumberStyle = 4; $lv2.NumberFormat = '%2.'
  }
  return $st
}

function Strs($doc) { return @(1..$doc.Paragraphs.Count | ForEach-Object { $doc.Paragraphs.Item($_).Range.ListFormat.ListString }) }

$TEXTS = @('Primeiro item', 'Segundo item', 'Terceiro item')

$EXPERIMENTS = @(
  # o estilo novo sem mexer nos niveis: o modelo padrao do Word
  @{ Name = 'ls-default'; Run = { param($app, $doc) Base3 $doc $TEXTS; $st = New-ListStyle $doc $false; $lv = @(); for ($k = 1; $k -le 3; $k++) { $lv += (Lvl-Info $st.ListTemplate.ListLevels.Item($k)) }; [ordered]@{ name = $st.NameLocal; type = $st.Type; levels = $lv } } },
  # niveis 1 e 2 mudados (o que o dialogo grava)
  @{ Name = 'ls-define'; Run = { param($app, $doc) Base3 $doc $TEXTS; $st = New-ListStyle $doc $true; [ordered]@{ name = $st.NameLocal } } },
  # aplicado como estilo aos paragrafos 1-2 (Range.Style = estilo de lista)
  @{ Name = 'ls-apply-style'; Run = { param($app, $doc) Base3 $doc $TEXTS; $st = New-ListStyle $doc $true; $r = $doc.Range($doc.Paragraphs.Item(1).Range.Start, $doc.Paragraphs.Item(2).Range.End); $err = ''; try { $r.Style = $st } catch { $err = [string]$_.Exception.Message }; [ordered]@{ err = $err; strs = (Strs $doc); style = $doc.Paragraphs.Item(1).Style.NameLocal } } },
  # aplicado pelo modelo de lista do estilo (galeria "Estilos de Lista")
  @{ Name = 'ls-apply-template'; Run = { param($app, $doc) Base3 $doc $TEXTS; $st = New-ListStyle $doc $true; $r = $doc.Range($doc.Paragraphs.Item(1).Range.Start, $doc.Paragraphs.Item(2).Range.End); $err = ''; try { $r.ListFormat.ApplyListTemplateWithLevel($st.ListTemplate, $false, 0, 2) } catch { $err = [string]$_.Exception.Message }; [ordered]@{ err = $err; strs = (Strs $doc); style = $doc.Paragraphs.Item(1).Style.NameLocal } } },
  # aplicado e depois modificado (nivel 1 vira "%1.")
  @{ Name = 'ls-modify'; Run = { param($app, $doc) Base3 $doc $TEXTS; $st = New-ListStyle $doc $true; $r = $doc.Range($doc.Paragraphs.Item(1).Range.Start, $doc.Paragraphs.Item(2).Range.End); $r.Style = $st; $st.ListTemplate.ListLevels.Item(1).NumberFormat = '%1.'; [ordered]@{ strs = (Strs $doc) } } }
)

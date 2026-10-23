# Comandos de lista do menu de contexto do Word (Reiniciar em 1, Continuar numeracao,
# niveis) por ExecuteMso/WordBasic, sobre a lista que o botao Numeracao cria. ASCII puro.

function Num-Btn($app, $doc, [string[]]$texts) {
  $doc.Content.Text = ($texts -join "`r")
  $doc.Content.Select()
  $app.CommandBars.ExecuteMso('Numbering')
}
function Info($doc) {
  $out = @()
  for ($k = 1; $k -le $doc.Paragraphs.Count; $k++) {
    $p = $doc.Paragraphs.Item($k)
    $out += [ordered]@{ text = $p.Range.Text.TrimEnd("`r"); type = $p.Range.ListFormat.ListType; lvl = $p.Range.ListFormat.ListLevelNumber; str = $p.Range.ListFormat.ListString }
  }
  return $out
}
function Try-Mso($app, [string]$id) {
  $e = ''; $en = $null
  try { $en = $app.CommandBars.GetEnabledMso($id) } catch { $e = 'noid' }
  if ($e -eq '') { try { $app.CommandBars.ExecuteMso($id) } catch { $e = [string]$_.Exception.Message } }
  return [ordered]@{ id = $id; enabled = $en; err = $e }
}

$IDS = @('NumberingRestart', 'RestartNumbering', 'NumberingContinue', 'ContinueNumbering', 'ListRestartNumbering', 'ListContinueNumbering', 'NumberingRestartNumbering')
$EXPERIMENTS = @()
foreach ($id in $IDS) {
  $EXPERIMENTS += @{ Name = "cmd-$id"; Run = [scriptblock]::Create("param(`$app, `$doc) Num-Btn `$app `$doc @('Um', 'Dois', 'Tres', 'Quatro'); `$doc.Paragraphs.Item(3).Range.Select(); `$r = Try-Mso `$app '$id'; [ordered]@{ cmd = `$r; paras = (Info `$doc) }") }
}
$EXPERIMENTS += @(
  # continuar: duas listas (a 2a com o botao de novo, separada por texto)
  @{ Name = 'two-lists-btn'; Run = { param($app, $doc) $doc.Content.Text = "Um`rDois`rTexto`rTres`rQuatro"; $doc.Range($doc.Paragraphs.Item(1).Range.Start, $doc.Paragraphs.Item(2).Range.End).Select(); $app.CommandBars.ExecuteMso('Numbering'); $doc.Range($doc.Paragraphs.Item(4).Range.Start, $doc.Paragraphs.Item(5).Range.End).Select(); $app.CommandBars.ExecuteMso('Numbering'); [ordered]@{ paras = (Info $doc) } } },
  @{ Name = 'wb-restart'; Run = { param($app, $doc) Num-Btn $app $doc @('Um', 'Dois', 'Tres', 'Quatro'); $doc.Paragraphs.Item(3).Range.Select(); $e = ''; try { $app.WordBasic.ToolsBulletsNumbers() } catch { $e = [string]$_.Exception.Message }; [ordered]@{ err = $e; paras = (Info $doc) } } },
  # SetListLevel / ListIndent na lista do botao (hibrida, 9 niveis)
  @{ Name = 'btn-listindent'; Run = { param($app, $doc) Num-Btn $app $doc @('Um', 'Dois', 'Tres'); $doc.Paragraphs.Item(2).Range.ListFormat.ListIndent(); [ordered]@{ paras = (Info $doc) } } },
  @{ Name = 'btn-listoutdent-first'; Run = { param($app, $doc) Num-Btn $app $doc @('Um', 'Dois', 'Tres'); $doc.Paragraphs.Item(2).Range.ListFormat.ListLevelNumber = 3; $doc.Paragraphs.Item(2).Range.ListFormat.ListOutdent(); [ordered]@{ paras = (Info $doc) } } },
  # a lista toda num outro formato da biblioteca, com o cursor num item (Word troca o nivel da lista toda?)
  @{ Name = 'btn-then-lib'; Run = { param($app, $doc) Num-Btn $app $doc @('Um', 'Dois', 'Tres', 'Quatro'); $doc.Paragraphs.Item(2).Range.Select(); $app.Selection.Collapse(1); $lt = $app.ListGalleries.Item(2).ListTemplates.Item(5); $app.Selection.Range.ListFormat.ApplyListTemplateWithLevel($lt, $true, 0, 2) | Out-Null; [ordered]@{ paras = (Info $doc) } } }
)
$EXPERIMENTS += @(
  @{ Name = 'two-lists-continue'; Run = { param($app, $doc) $doc.Content.Text = "Um`rDois`rTexto`rTres`rQuatro"; $doc.Range($doc.Paragraphs.Item(1).Range.Start, $doc.Paragraphs.Item(2).Range.End).Select(); $app.CommandBars.ExecuteMso('Numbering'); $doc.Range($doc.Paragraphs.Item(4).Range.Start, $doc.Paragraphs.Item(5).Range.End).Select(); $app.CommandBars.ExecuteMso('Numbering'); $doc.Paragraphs.Item(4).Range.Select(); $app.Selection.Collapse(1); $app.CommandBars.ExecuteMso('NumberingContinue'); [ordered]@{ paras = (Info $doc) } } },
  @{ Name = 'restart-middle-continue-back'; Run = { param($app, $doc) Num-Btn $app $doc @('Um', 'Dois', 'Tres', 'Quatro'); $doc.Paragraphs.Item(3).Range.Select(); $app.CommandBars.ExecuteMso('NumberingRestart'); $doc.Paragraphs.Item(3).Range.Select(); $app.CommandBars.ExecuteMso('NumberingContinue'); [ordered]@{ paras = (Info $doc) } } }
)

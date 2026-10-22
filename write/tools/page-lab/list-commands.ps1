# Lista os comandos internos do Word (Application.ListCommands) que tenham a ver
# com marca-d'agua, plano de fundo, folha de rosto e pagina em branco.
# Word invisivel; pela trava global. ASCII puro.
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $word.Documents.Add() | Out-Null
  $word.ListCommands($true)
  $doc = $word.ActiveDocument
  $t = $doc.Tables.Item(1)
  $rows = $t.Rows.Count
  "rows=$rows"
  $txt = $doc.Content.Text
  foreach ($line in ($txt -split "`r")) {
    if ($line -match '(?i)water|marca|background|fundo|cover|rosto|blank|branco|pagecolor') { $line -replace [char]7, ' | ' }
  }
  foreach ($d in @($word.Documents)) { $d.Close(0) }
} finally {
  $word.Quit()
}

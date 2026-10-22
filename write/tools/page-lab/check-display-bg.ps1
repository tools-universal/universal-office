# Confere (e com -Reset False, restaura) a opcao "mostrar cores e imagens de
# fundo no Layout de Impressao" (View.DisplayBackgrounds) num Word novo.
param([string]$Reset = '')
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Add()
  "before DisplayBackgrounds=" + $doc.ActiveWindow.View.DisplayBackgrounds
  if ($Reset -eq 'False') { $doc.ActiveWindow.View.DisplayBackgrounds = $false; "after=" + $doc.ActiveWindow.View.DisplayBackgrounds }
  $doc.Close(0)
} finally { $word.Quit() }

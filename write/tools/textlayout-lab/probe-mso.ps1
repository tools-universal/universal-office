# Sonda: os controles da faixa de opcoes (idMso) de Hifenizacao e Numeros de
# Linha existem e rodam com o Word invisivel (ExecuteMso)? Imprime o rotulo e
# o estado de cada id candidato. ASCII puro; rodar pela trava global.
param([string]$OutDir = '')
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\doc-lab\word-com.ps1')
$ids = @('HyphenationMenu', 'HyphenationGallery', 'HyphenationNone', 'HyphenationAutomatic', 'HyphenationManual', 'HyphenationOptions',
  'LineNumbersMenu', 'LineNumbersGallery', 'LineNumbersNone', 'LineNumbersContinuous', 'LineNumbersRestartEachPage',
  'LineNumbersRestartEachSection', 'LineNumbersSuppressForCurrentParagraph', 'LineNumbersOptions', 'LineNumbering',
  'ParagraphIndentLeft', 'ParagraphIndentRight', 'ParagraphSpacingBefore', 'ParagraphSpacingAfter', 'IndentLeft', 'IndentRight', 'SpaceBefore', 'SpaceAfter')
$w = New-WordApp
try {
  $doc = $w.Documents.Add()
  $doc.Content.Text = 'abc'
  foreach ($id in $ids) {
    $lbl = ''; $en = ''; $pr = ''
    try { $lbl = $w.CommandBars.GetLabelMso($id) } catch { $lbl = 'ERR' }
    try { $en = $w.CommandBars.GetEnabledMso($id) } catch { $en = 'ERR' }
    try { $pr = $w.CommandBars.GetPressedMso($id) } catch { $pr = '-' }
    Emit ($id + ' | ' + $lbl + ' | en=' + $en + ' | pressed=' + $pr)
  }
  try { $w.CommandBars.ExecuteMso('LineNumbersContinuous'); Emit ('exec LineNumbersContinuous OK active=' + $doc.Sections.Item(1).PageSetup.LineNumbering.Active) } catch { Emit ('exec ERR ' + $_.Exception.Message) }
  try { $w.CommandBars.ExecuteMso('HyphenationAutomatic'); Emit ('exec HyphenationAutomatic OK auto=' + $doc.AutoHyphenation) } catch { Emit ('exec ERR ' + $_.Exception.Message) }
  $doc.Close([ref]0) | Out-Null
} finally { Close-WordApp $w }

# Sonda: quais nomes internos de comando o Word aceita (KeyBindings.Add sem
# executar), para achar os do Sumario. Saida: results/cmd-names.txt. ASCII puro.
param([string]$Names = '')
$ErrorActionPreference = 'Stop'
$outDir = [string](Join-Path $PSScriptRoot 'results')
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$out = New-Object System.Collections.ArrayList
$cands = @(
  'TOCAddText', 'TocAddText', 'AddTextToTOC', 'AddText', 'TableOfContentsAddText', 'TableOfContentsAddTextGallery', 'ReferencesAddText',
  'AddToTOC', 'TOCLevel1', 'TocLevel1', 'TOCAddTextLevel1', 'TocAddTextLevel1', 'AddTextLevel1', 'TableOfContentsLevel1',
  'DoNotShowInTOC', 'TOCDoNotShow', 'TocDoNotShow', 'TOCNotShow', 'OutlineLevel', 'OutlineLevel1', 'OutlineLevelBodyText', 'BodyTextLevel',
  'UpdateTableOfContents', 'UpdateTableOfContentsFull', 'UpdateTOC', 'UpdateTOCFull', 'TOCUpdate', 'UpdateToc', 'TableOfContentsUpdate',
  'RemoveTableOfContents', 'MarkTableOfContentsEntry', 'InsertTableOfContents', 'TableOfContents', 'TableOfContentsMenu', 'TableOfContentsGallery',
  'GoToTableOfContents', 'GotoTableOfContents', 'CreateTableOfContentsFromSelection', 'SaveTableOfContentsBlock', 'TableOfContentsSaveSelection',
  'InsertIndexAndTables', 'InsertTOC', 'ShowLevel', 'OutlineShowLevel', 'OutlinePromoteHeading1', 'OutlineDemoteToBodyText', 'ApplyHeading1', 'ApplyHeading2', 'ApplyHeading3', 'ApplyHeading4'
)
if ($Names) { $cands = $Names -split ',' }
try {
  $doc = $word.Documents.Add()
  $word.CustomizationContext = $doc
  $k = 0
  foreach ($n in $cands) {
    $k++
    try { $kb = $word.KeyBindings.Add(1, $n, 1024 + 256 + 112 + ($k % 8)); [void]$out.Add("SIM $n -> [$($kb.Command)]"); $kb.Clear() }
    catch { [void]$out.Add("nao $n") }
  }
  $doc.Close(0)
} finally {
  [System.IO.File]::WriteAllLines([string](Join-Path $outDir 'cmd-names.txt'), $out)
  $word.Quit()
}

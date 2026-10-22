# Oraculo da frente Pagina (lote 6): Pagina em Branco (botao BlankPageInsert,
# cursor no inicio/meio/fim do paragrafo e com selecao), Folha de Rosto (bloco de
# construcao do tipo 2 no inicio: SO a estrutura -- o desenho e do Word -- e o
# botao Remover Folha de Rosto Atual) e o PDF de marcas de imagem VML.
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File page-oracle6.ps1 [-Only a,b]
param([string]$Only = '')
. (Join-Path $PSScriptRoot 'page-oracle-lib.ps1')

function Mso([string]$id, $doc) { $doc.Activate(); $word.CommandBars.ExecuteMso($id) }
function Paras($doc, $sel) {
  $sel.TypeText('Primeiro paragrafo'); $sel.TypeParagraph(); $sel.TypeText('Segundo paragrafo'); $sel.TypeParagraph(); $sel.TypeText('Terceiro')
}

Run-Exp 'bp-mid' { param($doc, $sel) Paras $doc $sel; $doc.Paragraphs(2).Range.Characters(7).Select(); $sel.Collapse(1) } {
  param($doc, $sel, $log) [void]$log.Add('before: ' + (Sel-Info $sel)); Mso 'BlankPageInsert' $doc
  [void]$log.Add('pages=' + $doc.ComputeStatistics(2))
} '' $true
Run-Exp 'bp-start' { param($doc, $sel) Paras $doc $sel; $doc.Paragraphs(2).Range.Characters(1).Select(); $sel.Collapse(1) } {
  param($doc, $sel, $log) Mso 'BlankPageInsert' $doc; [void]$log.Add('pages=' + $doc.ComputeStatistics(2))
} '' $true
Run-Exp 'bp-end' { param($doc, $sel) Paras $doc $sel; $sel.EndKey(6) | Out-Null } {
  param($doc, $sel, $log) Mso 'BlankPageInsert' $doc; [void]$log.Add('pages=' + $doc.ComputeStatistics(2))
} '' $true
Run-Exp 'bp-docstart' { param($doc, $sel) Paras $doc $sel; $sel.HomeKey(6) | Out-Null } {
  param($doc, $sel, $log) Mso 'BlankPageInsert' $doc; [void]$log.Add('pages=' + $doc.ComputeStatistics(2))
} '' $true
Run-Exp 'bp-selection' { param($doc, $sel) Paras $doc $sel; $doc.Range($doc.Paragraphs(2).Range.Start + 2, $doc.Paragraphs(2).Range.Start + 8).Select() } {
  param($doc, $sel, $log) Mso 'BlankPageInsert' $doc; [void]$log.Add('pages=' + $doc.ComputeStatistics(2))
} '' $true
Run-Exp 'bp-styled' { param($doc, $sel) Paras $doc $sel; $doc.Paragraphs(2).Style = -2; $doc.Paragraphs(2).Range.Characters(7).Select(); $sel.Collapse(1) } {
  param($doc, $sel, $log) Mso 'BlankPageInsert' $doc
} '' $true
Run-Exp 'pb-mid' { param($doc, $sel) Paras $doc $sel; $doc.Paragraphs(2).Range.Characters(7).Select(); $sel.Collapse(1) } {
  param($doc, $sel, $log) Mso 'PageBreakInsertWord' $doc
} '' $true

# Folha de Rosto: estrutura apenas
$script:structOnly = $true
$coverNames = BB-Names 2
$cv = Find-BB 2 $coverNames[0]
$cv2 = Find-BB 2 $coverNames[1]
Run-Exp 'cv-insert' { param($doc, $sel) Paras $doc $sel; $doc.Paragraphs(2).Range.Characters(3).Select(); $sel.Collapse(1) } {
  param($doc, $sel, $log)
  [void]$log.Add('bb insertOptions=' + $cv.InsertOptions + ' n=' + $coverNames.Count)
  [void]$cv.Insert($doc.Range(0, 0), $true)
  [void]$log.Add('pages=' + $doc.ComputeStatistics(2) + ' titlePg=' + $doc.Sections(1).PageSetup.DifferentFirstPageHeaderFooter)
} '' $true
Run-Exp 'cv-remove' { param($doc, $sel) Paras $doc $sel; [void]$cv.Insert($doc.Range(0, 0), $true); $doc.Paragraphs($doc.Paragraphs.Count).Range.Select(); $sel.Collapse(0) } {
  param($doc, $sel, $log) Mso 'CoverPageRemove' $doc
  [void]$log.Add('pages=' + $doc.ComputeStatistics(2))
} '' $true
Run-Exp 'cv-twice' { param($doc, $sel) Paras $doc $sel; [void]$cv.Insert($doc.Range(0, 0), $true) } {
  param($doc, $sel, $log) [void]$cv2.Insert($doc.Range(0, 0), $true)
  [void]$log.Add('pages=' + $doc.ComputeStatistics(2))
} '' $true
$script:structOnly = $false
Close-Word

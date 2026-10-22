# Sonda: quais idMso do ribbon de Cabecalho e Rodape existem no Word desta
# maquina (GetLabelMso devolve o rotulo ou falha). Word invisivel, sem janela.
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Add()
$cands = @(
  'HeaderRemove','RemoveHeader','FooterRemove','RemoveFooter','PageNumberRemove','RemovePageNumbers','PageNumbersRemove',
  'HeaderFooterRemoveHeader','HeaderFooterRemoveFooter','HeaderFooterLinkToPrevious','LinkToPrevious','HeaderFooterLinkToPreviousWord',
  'HeaderFooterGoToHeader','HeaderFooterGoToFooter','GoToHeader','GoToFooter','HeaderFooterNext','HeaderFooterPrevious',
  'HeaderFooterNextSection','HeaderFooterPreviousSection','HeaderFooterShowDocumentText','ShowDocumentText','HeaderFooterDifferentFirstPage',
  'HeaderFooterDifferentOddEvenPages','DifferentFirstPage','DifferentOddEvenPages','DateAndTimeInsert','InsertDateTime','DateTimeInsert',
  'HeaderFooterInsertAlignmentTab','AlignmentTabInsert','InsertAlignmentTab','PageNumberFormat','PageNumbersFormat','FormatPageNumbers',
  'HeaderEdit','FooterEdit','EditHeader','EditFooter','HeaderInsertGallery','FooterInsertGallery','PageNumberInsertGallery',
  'DocumentInfoGallery','HeaderFooterDocumentInfo','QuickPartsInsertGallery','HeaderFooterClose','HeaderFooterCloseHeaderFooter',
  'HeaderFooterTopOfPageGallery','HeaderFooterBottomOfPageGallery','PageNumberTopOfPageGallery','PageNumberBottomOfPageGallery',
  'PageNumberCurrentPositionGallery','PageNumberPageMarginsGallery','PageNumbersInsertTopOfPage','PageNumbersInsertBottomOfPage',
  'HeaderFooterHeaderPosition','HeaderFooterFooterPosition','HeaderFooterHeaderDistance','HeaderFooterFooterDistance'
)
foreach ($c in $cands) {
  try { $l = $word.CommandBars.GetLabelMso($c); Write-Host "OK  $c = [$l]" } catch { }
}
$doc.Close(0)
$word.Quit()

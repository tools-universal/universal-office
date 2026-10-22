# Oraculo da frente Cabecalho e rodape (lote 3): estilos que o Word cria com o
# cabecalho, desfazer entre corpo e cabecalho, alcance de Remover Numeros de
# Pagina e o resultado do PAGE com numero de capitulo.
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -File hf-oracle3.ps1 [-Only a,b]
param([string]$Only = '')
. (Join-Path $PSScriptRoot 'hf-oracle-lib.ps1')

function WB([string]$cmd) {
  $wb = $word.WordBasic
  [void][System.__ComObject].InvokeMember($cmd, [System.Reflection.BindingFlags]::InvokeMethod, $null, $wb, $null)
}
function Hdr($doc, $sel, [string]$text, [int]$seek = 9) { Seek $doc $seek; $sel.TypeText($text); Seek $doc 0 }
function Sec2($doc, $sel) { $sel.EndKey(6) | Out-Null; $sel.InsertBreak(2); $sel.TypeText('S2') }
function HfWhere($doc, $sel) {
  return "seek=" + $doc.ActiveWindow.ActivePane.View.SeekView + " story=" + $sel.StoryType + " sec=" + $sel.Information(2) + " text=[" + ($sel.Paragraphs(1).Range.Text -replace "`r", '\r') + "]"
}
function StylesOf([string]$docx) {
  $z = Open-Zip $docx
  try {
    $st = Part-Text $z 'word/styles.xml'
    $out = ''
    foreach ($m in [regex]::Matches($st, '<w:style [^>]*>(?:(?!</w:style>).)*?<w:name w:val="(?:header|footer|page number|Header Char|Footer Char)"/>.*?</w:style>')) { $out += "== style " + $m.Value + "`n" }
    foreach ($m in [regex]::Matches($st, '<w:lsdException w:name="(?:header|footer|page number)"[^>]*/>')) { $out += "== latent " + $m.Value + "`n" }
    return $out
  } finally { $z.Dispose() }
}

# estilos: documento novo, cabecalho e rodape digitados (e o Normal.dotm desta maquina)
foreach ($nm in @('h01-styles-header', 'h01b-styles-footer')) {
  if ($onlySet.Count -and -not $onlySet.ContainsKey($nm)) { continue }
  $doc = $word.Documents.Add(); $sel = $word.Selection
  try {
    $sel.TypeText('Corpo')
    if ($nm -eq 'h01-styles-header') { Hdr $doc $sel 'Cab' } else { Hdr $doc $sel 'Rod' 10 }
    $p = [string](Join-Path $tmp ($nm + '.docx')); $doc.SaveAs2($p, 16)
    [System.IO.File]::WriteAllText([string](Join-Path $outDir ($nm + '.txt')), "# $nm`n" + (StylesOf $p))
    Write-Host "ok $nm"
  } finally { $doc.Close(0) }
}

Run-Exp 'h02-undo-after-close' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log) Seek $doc 9; $sel.TypeText('Cab'); Seek $doc 0
  [void]$log.Add('before: ' + (HfWhere $doc $sel))
  [void]$doc.Undo(); [void]$log.Add('undo1: ' + (HfWhere $doc $sel) + ' hdr=[' + ($doc.Sections(1).Headers(1).Range.Text -replace "`r", '\r') + ']')
  [void]$doc.Redo(); [void]$log.Add('redo1: ' + (HfWhere $doc $sel) + ' hdr=[' + ($doc.Sections(1).Headers(1).Range.Text -replace "`r", '\r') + ']')
}
Run-Exp 'h03-undo-body-in-hf' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log) $doc.UndoClear(); $sel.TypeText(' mais'); Seek $doc 9
  [void]$log.Add('before: ' + (HfWhere $doc $sel))
  [void]$doc.Undo(); [void]$log.Add('undo1: ' + (HfWhere $doc $sel) + ' body=[' + ($doc.Paragraphs(1).Range.Text -replace "`r", '\r') + ']')
  Seek $doc 0
}

$script:structOnly = $true
$word.Templates.LoadBuildingBlocks()
$bbt = $null
foreach ($t in $word.Templates) { try { if ($t.BuildingBlockEntries.Count -gt 50) { $bbt = $t; break } } catch { } }
function BB([int]$type) { return $bbt.BuildingBlockTypes.Item($type).Categories.Item(1).BuildingBlocks.Item(1) }

Run-Exp 'h04-remove-pgnum-2sec' {
  param($doc, $sel) $sel.TypeText('Corpo'); Sec2 $doc $sel
  $doc.Sections(2).Footers(1).LinkToPrevious = $false
  [void](BB 12).Insert($doc.Sections(1).Footers(1).Range, $true)
  [void](BB 12).Insert($doc.Sections(2).Footers(1).Range, $true)
  [void](BB 11).Insert($doc.Sections(2).Headers(1).Range, $true)
} {
  param($doc, $sel, $log) WB 'RemovePageNumbers'
}
Run-Exp 'h05-remove-pgnum-titlepg' {
  param($doc, $sel) $sel.TypeText('Corpo'); $sel.InsertBreak(7); $sel.TypeText('p2')
  $doc.Sections(1).PageSetup.DifferentFirstPageHeaderFooter = -1
  [void](BB 12).Insert($doc.Sections(1).Footers(1).Range, $true)
  [void](BB 12).Insert($doc.Sections(1).Footers(2).Range, $true)
  $sel.HomeKey(6) | Out-Null
} {
  param($doc, $sel, $log) WB 'RemovePageNumbers'
}
$script:structOnly = $false

# PAGE com capitulo: sem titulo numerado e com titulo numerado (lista de varios niveis)
Run-Exp 'h07-chap-nonum' {
  param($doc, $sel) $sel.Style = $doc.Styles.Item(-2); $sel.TypeText('Titulo'); $sel.TypeParagraph(); $sel.TypeText('Corpo')
  Seek $doc 10; [void]$sel.Fields.Add($sel.Range, 33); Seek $doc 0
} {
  param($doc, $sel, $log) $pn = $doc.Sections(1).Headers(1).PageNumbers
  $pn.IncludeChapterNumber = $true; $pn.HeadingLevelForChapter = 0
  $doc.Sections(1).Footers(1).Range.Fields.Update() | Out-Null
  [void]$log.Add('footer=[' + ($doc.Sections(1).Footers(1).Range.Text -replace "`r", '\r') + ']')
}
Run-Exp 'h08-chap-num' {
  param($doc, $sel) $sel.Style = $doc.Styles.Item(-2); $sel.TypeText('Titulo')
  $lt = $word.ListGalleries.Item(3).ListTemplates.Item(5)
  $sel.Range.ListFormat.ApplyListTemplateWithLevel($lt, $false, 0, 2)
  $sel.TypeParagraph(); $sel.Style = $doc.Styles.Item(-1); $sel.TypeText('Corpo')
  Seek $doc 10; [void]$sel.Fields.Add($sel.Range, 33); Seek $doc 0
} {
  param($doc, $sel, $log) $pn = $doc.Sections(1).Headers(1).PageNumbers
  $pn.IncludeChapterNumber = $true; $pn.HeadingLevelForChapter = 0; $pn.ChapterPageSeparator = 3; $pn.NumberStyle = 4
  $doc.Sections(1).Footers(1).Range.Fields.Update() | Out-Null
  [void]$log.Add('footer=[' + ($doc.Sections(1).Footers(1).Range.Text -replace "`r", '\r') + '] head=[' + $doc.Paragraphs(1).Range.ListFormat.ListString + ']')
} '' $true
Close-Word

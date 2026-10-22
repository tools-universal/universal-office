# Oraculo da frente Cabecalho e rodape (lote 1): XML que o Word grava ao editar
# o cabecalho, ligar Primeira Pagina Diferente / Pares e Impares, mudar as
# distancias, desvincular/vincular ao anterior, formatar numeros de pagina,
# remover cabecalho e numeros, tabulacao de alinhamento e data/hora.
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -File hf-oracle.ps1 [-Only a,b]
param([string]$Only = '')
. (Join-Path $PSScriptRoot 'hf-oracle-lib.ps1')

Add-Type -AssemblyName System.Drawing
$png = [string](Join-Path $tmp 'blue.png')
$bmp = New-Object System.Drawing.Bitmap 20, 20
$g = [System.Drawing.Graphics]::FromImage($bmp); $g.Clear([System.Drawing.Color]::Blue); $g.Dispose()
$bmp.Save($png, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()

function WB([string]$cmd) {
  $wb = $word.WordBasic
  [void][System.__ComObject].InvokeMember($cmd, [System.Reflection.BindingFlags]::InvokeMethod, $null, $wb, $null)
}
function Hdr($doc, $sel, [string]$text, [int]$seek = 9) { Seek $doc $seek; $sel.TypeText($text); Seek $doc 0 }
function Sec2($doc, $sel) { $sel.EndKey(6) | Out-Null; $sel.InsertBreak(2); $sel.TypeText('S2') }
function HText($doc, [int]$s, [int]$t, [bool]$hdr = $true) {
  $h = if ($hdr) { $doc.Sections($s).Headers($t) } else { $doc.Sections($s).Footers($t) }
  return ("s$s t$t link=" + $h.LinkToPrevious + " exists=" + $h.Exists + " text=[" + ($h.Range.Text -replace "`r", '\r') + "]")
}

Run-Exp 'e01-new-header' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log) Hdr $doc $sel 'Cab'
}
Run-Exp 'e02-api-header' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log) $doc.Sections(1).Headers(1).Range.Text = 'Cab'
}
Run-Exp 'e03-titlepg' { param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab' } {
  param($doc, $sel, $log) $doc.Sections(1).PageSetup.DifferentFirstPageHeaderFooter = -1
  [void]$log.Add((HText $doc 1 2)); [void]$log.Add((HText $doc 1 1))
}
Run-Exp 'e03b-titlepg-nohdr' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log) $doc.Sections(1).PageSetup.DifferentFirstPageHeaderFooter = -1
}
Run-Exp 'e03c-titlepg-inhf' { param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab' } {
  param($doc, $sel, $log) Seek $doc 9; $doc.Sections(1).PageSetup.DifferentFirstPageHeaderFooter = -1
  [void]$log.Add('after: ' + (Sel-Info $sel) + ' seek=' + $doc.ActiveWindow.ActivePane.View.SeekView)
  Seek $doc 0
}
Run-Exp 'e04-evenodd' { param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab' } {
  param($doc, $sel, $log) $doc.Sections(1).PageSetup.OddAndEvenPagesHeaderFooter = -1
  [void]$log.Add((HText $doc 1 3)); [void]$log.Add((HText $doc 1 1))
}
Run-Exp 'e04b-evenodd-off' { param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab'; $doc.Sections(1).PageSetup.OddAndEvenPagesHeaderFooter = -1 } {
  param($doc, $sel, $log) $doc.Sections(1).PageSetup.OddAndEvenPagesHeaderFooter = 0
}
Run-Exp 'e05-dist' { param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab' } {
  param($doc, $sel, $log)
  $doc.Sections(1).PageSetup.HeaderDistance = $word.CentimetersToPoints(2)
  $doc.Sections(1).PageSetup.FooterDistance = $word.CentimetersToPoints(1.5)
  [void]$log.Add('hd=' + $doc.Sections(1).PageSetup.HeaderDistance + ' fd=' + $doc.Sections(1).PageSetup.FooterDistance)
}
Run-Exp 'e06-unlink' { param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab'; Hdr $doc $sel 'Rod' 10; Sec2 $doc $sel } {
  param($doc, $sel, $log) $doc.Sections(2).Headers(1).LinkToPrevious = $false
  [void]$log.Add((HText $doc 2 1)); [void]$log.Add((HText $doc 2 2)); [void]$log.Add((HText $doc 2 3)); [void]$log.Add((HText $doc 2 1 $false))
}
Run-Exp 'e06b-unlink-ui' { param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab'; Hdr $doc $sel 'Rod' 10; Sec2 $doc $sel } {
  param($doc, $sel, $log) Seek $doc 9; [void]$log.Add('in: ' + (Sel-Info $sel))
  $word.CommandBars.ExecuteMso('HeaderFooterLinkToPrevious')
  [void]$log.Add('after: ' + (Sel-Info $sel)); Seek $doc 0
  [void]$log.Add((HText $doc 2 1)); [void]$log.Add((HText $doc 2 2)); [void]$log.Add((HText $doc 2 3))
}
Run-Exp 'e07-relink' {
  param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab'; Sec2 $doc $sel
  $doc.Sections(2).Headers(1).LinkToPrevious = $false; $doc.Sections(2).Headers(1).Range.Text = 'Cab2'
} {
  param($doc, $sel, $log) $doc.Sections(2).Headers(1).LinkToPrevious = $true
  [void]$log.Add((HText $doc 2 1))
}
Run-Exp 'e08-unlink-img' {
  param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Logo '
  [void]$doc.Sections(1).Headers(1).Range.Paragraphs(1).Range.InlineShapes.AddPicture($png, $false, $true)
  Sec2 $doc $sel
} {
  param($doc, $sel, $log) $doc.Sections(2).Headers(1).LinkToPrevious = $false
}
Run-Exp 'e09-unlink-first' {
  param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab'
  $doc.Sections(1).PageSetup.DifferentFirstPageHeaderFooter = -1; $doc.Sections(1).Headers(2).Range.Text = 'Capa'
  Sec2 $doc $sel
} {
  param($doc, $sel, $log) [void]$log.Add('s2 titlePg=' + $doc.Sections(2).PageSetup.DifferentFirstPageHeaderFooter)
  $doc.Sections(2).Headers(2).LinkToPrevious = $false
  [void]$log.Add((HText $doc 2 2)); [void]$log.Add((HText $doc 2 1))
}
Run-Exp 'e10-pgfmt' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log) $pn = $doc.Sections(1).Headers(1).PageNumbers
  $pn.NumberStyle = 2; $pn.RestartNumberingAtSection = $true; $pn.StartingNumber = 3
}
foreach ($sp in 0..4) {
  Run-Exp "e10b-pgchap-$sp" { param($doc, $sel) $sel.TypeText('Corpo') } {
    param($doc, $sel, $log) $pn = $doc.Sections(1).Headers(1).PageNumbers
    $pn.IncludeChapterNumber = $true; $pn.HeadingLevelForChapter = 1; $pn.ChapterPageSeparator = $sp
  }
}
foreach ($st in 0, 1, 2, 3, 4, 57) {
  Run-Exp "e10c-pgstyle-$st" { param($doc, $sel) $sel.TypeText('Corpo') } {
    param($doc, $sel, $log) $doc.Sections(1).Headers(1).PageNumbers.NumberStyle = $st
  }
}
Run-Exp 'e11-pgcont' { param($doc, $sel) $sel.TypeText('Corpo'); $pn = $doc.Sections(1).Headers(1).PageNumbers; $pn.RestartNumberingAtSection = $true; $pn.StartingNumber = 3 } {
  param($doc, $sel, $log) $doc.Sections(1).Headers(1).PageNumbers.RestartNumberingAtSection = $false
}
Run-Exp 'e12-remove-header' { param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab'; Hdr $doc $sel 'Rod' 10 } {
  param($doc, $sel, $log) WB 'RemoveHeader'
}
Run-Exp 'e12b-remove-header-inhf' { param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab'; Hdr $doc $sel 'Rod' 10 } {
  param($doc, $sel, $log) Seek $doc 9; WB 'RemoveHeader'; [void]$log.Add('after: ' + (Sel-Info $sel) + ' seek=' + $doc.ActiveWindow.ActivePane.View.SeekView); Seek $doc 0
}
Run-Exp 'e12c-remove-header-2sec' {
  param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab'; Sec2 $doc $sel
  $doc.Sections(2).Headers(1).LinkToPrevious = $false; $doc.Sections(2).Headers(1).Range.Text = 'Cab2'
} {
  param($doc, $sel, $log) WB 'RemoveHeader'
  [void]$log.Add((HText $doc 1 1)); [void]$log.Add((HText $doc 2 1))
}
Run-Exp 'e12d-remove-header-titlepg' {
  param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab'
  $doc.Sections(1).PageSetup.DifferentFirstPageHeaderFooter = -1; $doc.Sections(1).Headers(2).Range.Text = 'Capa'
} {
  param($doc, $sel, $log) WB 'RemoveHeader'
  [void]$log.Add((HText $doc 1 1)); [void]$log.Add((HText $doc 1 2))
}
Run-Exp 'e12e-remove-footer' { param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab'; Hdr $doc $sel 'Rod' 10 } {
  param($doc, $sel, $log) WB 'RemoveFooter'
}
Run-Exp 'e13-remove-pgnum' {
  param($doc, $sel) $sel.TypeText('Corpo'); Seek $doc 10; $sel.TypeText('Pagina '); [void]$sel.Fields.Add($sel.Range, 33); Seek $doc 0
  Hdr $doc $sel 'Cab'
} {
  param($doc, $sel, $log) $word.CommandBars.ExecuteMso('PageNumbersRemove')
}
Run-Exp 'e13b-remove-pgnum-wb' {
  param($doc, $sel) $sel.TypeText('Corpo'); Seek $doc 10; $sel.TypeText('Pagina '); [void]$sel.Fields.Add($sel.Range, 33); Seek $doc 0
} {
  param($doc, $sel, $log) WB 'RemovePageNumbers'
}
Run-Exp 'e14-ptab' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log) Seek $doc 9; $sel.TypeText('A'); $sel.InsertAlignmentTab(1, 0); $sel.TypeText('B'); $sel.InsertAlignmentTab(2, 1); $sel.TypeText('C'); Seek $doc 0
}
Run-Exp 'e15-date' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log) Seek $doc 9
  $sel.InsertDateTime('dd/MM/yyyy', $true); $sel.TypeText(' | ')
  $sel.InsertDateTime("dddd, d' de 'MMMM' de 'yyyy", $false); $sel.TypeText(' | ')
  $sel.InsertDateTime('HH:mm', $true)
  Seek $doc 0
}
Close-Word

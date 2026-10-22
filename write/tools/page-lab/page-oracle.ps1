# Oraculo da frente Pagina (lote 1, marca-d'agua): XML que o Word grava com os
# blocos de construcao da galeria Marcas-d'Agua (tipo 8), onde eles entram
# (cabecalho de cada secao/tipo?), o tamanho em outro papel e o Remover.
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File page-oracle.ps1 [-Only a,b]
param([string]$Only = '')
. (Join-Path $PSScriptRoot 'page-oracle-lib.ps1')

function Sec2($doc, $sel) { $sel.EndKey(6) | Out-Null; $sel.InsertBreak(2); $sel.TypeText('S2') }
function Hdr($doc, $sel, [string]$text, [int]$seek = 9) { Seek $doc $seek; $sel.TypeText($text); Seek $doc 0 }

$wmNames = BB-Names 8
$i = 0
foreach ($n in $wmNames) {
  $i++
  $bb = Find-BB 8 $n
  Run-Exp ("wm-bb-$i") { param($doc, $sel) $sel.TypeText('Corpo') } {
    param($doc, $sel, $log)
    [void]$log.Add("bb=" + $n + " cat=" + $bb.Category.Name + " insertOptions=" + $bb.InsertOptions)
    [void]$bb.Insert($doc.Sections(1).Headers(1).Range, $true)
  }
}
$cf1 = Find-BB 8 'CONFIDENCIAL 1'
$cf2 = Find-BB 8 'CONFIDENCIAL 2'
# no corpo: o Word desvia para os cabecalhos?
Run-Exp 'wm-body' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log) [void]$cf1.Insert($sel.Range, $true)
} '' $true
# varias secoes (2a desvinculada com texto), 1a pagina diferente, pares/impares
Run-Exp 'wm-multi' { param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab'; $doc.Sections(1).PageSetup.DifferentFirstPageHeaderFooter = -1; Sec2 $doc $sel; $doc.Sections(2).Headers(1).LinkToPrevious = $false; Seek $doc 9; $sel.TypeText('Cab2'); Seek $doc 0; $doc.Range(0, 0).Select() } {
  param($doc, $sel, $log) [void]$cf1.Insert($doc.Sections(1).Headers(1).Range, $true)
}
# papel Carta paisagem, margens largas: o tamanho acompanha?
Run-Exp 'wm-letter-land' { param($doc, $sel) $sel.TypeText('Corpo'); $ps = $doc.Sections(1).PageSetup; $ps.PaperSize = 2; $ps.Orientation = 1; $ps.LeftMargin = 144; $ps.RightMargin = 144 } {
  param($doc, $sel, $log) [void]$cf1.Insert($doc.Sections(1).Headers(1).Range, $true)
}
Run-Exp 'wm-letter-land-2' { param($doc, $sel) $sel.TypeText('Corpo'); $ps = $doc.Sections(1).PageSetup; $ps.PaperSize = 2; $ps.Orientation = 1; $ps.LeftMargin = 144; $ps.RightMargin = 144 } {
  param($doc, $sel, $log) [void]$cf2.Insert($doc.Sections(1).Headers(1).Range, $true)
}
# cabecalho com texto: a marca entra antes/depois?
Run-Exp 'wm-hdr-text' { param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab' } {
  param($doc, $sel, $log) [void]$cf1.Insert($doc.Sections(1).Headers(1).Range, $true)
}
# trocar: segunda marca substitui a primeira?
Run-Exp 'wm-replace' { param($doc, $sel) $sel.TypeText('Corpo'); [void]$cf1.Insert($doc.Sections(1).Headers(1).Range, $true) } {
  param($doc, $sel, $log) [void]$cf2.Insert($doc.Sections(1).Headers(1).Range, $true)
}
# Remover Marca-d'Agua (botao)
Run-Exp 'wm-remove' { param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab'; [void]$cf1.Insert($doc.Sections(1).Headers(1).Range, $true) } {
  param($doc, $sel, $log) $doc.Activate(); $word.CommandBars.ExecuteMso('WatermarkRemove')
}
Run-Exp 'wm-remove-multi' { param($doc, $sel) $sel.TypeText('Corpo'); Sec2 $doc $sel; $doc.Sections(2).Headers(1).LinkToPrevious = $false; [void]$cf1.Insert($doc.Sections(1).Headers(1).Range, $true); [void]$cf2.Insert($doc.Sections(2).Headers(1).Range, $true); $doc.Range(0, 0).Select() } {
  param($doc, $sel, $log) $doc.Activate(); $word.CommandBars.ExecuteMso('WatermarkRemove')
}
Close-Word

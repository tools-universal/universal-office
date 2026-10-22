# Oraculo dos resultados de campo depois de atualizar: STYLEREF (\s, \n, texto)
# com titulos numerados em formatos diferentes, SEQ \s (reinicio por capitulo),
# REF \n \r \w em lista de varios niveis (de dentro e de fora da lista), NOTEREF
# para nota adiante, REF \p no mesmo paragrafo e REF de indicador que atravessa
# paragrafos.
# Uso: node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/refs-lab/fld-oracle.ps1 [-Only a,b]
param([string]$Only)
. ([string](Join-Path $PSScriptRoot 'refs-oracle-lib.ps1'))

$wdStory = 6
$keep = $word.Documents.Add()
function Fld($sel, [string]$code) { $sel.Fields.Add($sel.Range, -1, $code, $false) | Out-Null }
# titulos numerados por lista ligada aos estilos (formatos dados)
function Heads($doc, $sel, [string]$f1, [string]$f2) {
  $lt = $doc.ListTemplates.Add($true)
  $l1 = $lt.ListLevels.Item(1); $l1.NumberFormat = $f1; $l1.NumberStyle = 0; $l1.LinkedStyle = $doc.Styles.Item(-2).NameLocal
  $l2 = $lt.ListLevels.Item(2); $l2.NumberFormat = $f2; $l2.NumberStyle = 0; $l2.LinkedStyle = $doc.Styles.Item(-3).NameLocal
}
function Head($sel, [string]$t, [int]$st) { $sel.TypeText($t); $sel.Paragraphs(1).Style = $st; $sel.TypeParagraph(); $sel.Paragraphs(1).Style = -1 }
function Line($sel, [string]$t) { $sel.TypeText($t); $sel.TypeParagraph() }

foreach ($fmt in @(@('sr-plain', '%1', '%1.%2'), @('sr-dot', '%1.', '%1.%2.'), @('sr-cap', 'Cap %1', '%1.%2'))) {
  $script:fm = $fmt
  Run-Exp $fmt[0] { param($d, $s) Heads $d $s $script:fm[1] $script:fm[2] } { param($d, $s, $log)
    Head $s 'Um' -2
    $s.TypeText('a '); Fld $s 'STYLEREF 1 \s'; $s.TypeText(' b '); Fld $s 'STYLEREF 1 \n'; $s.TypeText(' c '); Fld $s 'STYLEREF 1'; $s.TypeText(' d '); Fld $s 'SEQ Figura \s 1'; $s.TypeParagraph()
    Head $s 'Um um' -3
    $s.TypeText('e '); Fld $s 'STYLEREF 2 \s'; $s.TypeText(' f '); Fld $s 'STYLEREF 1 \s'; $s.TypeText(' g '); Fld $s 'SEQ Figura \s 1'; $s.TypeText(' h '); Fld $s 'SEQ Figura \s 2'; $s.TypeParagraph()
    Head $s 'Dois' -2
    $s.TypeText('i '); Fld $s 'STYLEREF 1 \s'; $s.TypeText(' j '); Fld $s 'SEQ Figura \s 1'; $s.TypeText(' k '); Fld $s 'SEQ Figura \s 2'; $s.TypeText(' l '); Fld $s 'SEQ Figura'; $s.TypeParagraph()
    $d.Fields.Update() | Out-Null
  }
}
# STYLEREF antes de qualquer titulo (procura para baixo?) e titulo sem numero
Run-Exp 'sr-before' { param($d, $s) } { param($d, $s, $log)
  $s.TypeText('a '); Fld $s 'STYLEREF 1 \s'; $s.TypeText(' b '); Fld $s 'STYLEREF 1'; $s.TypeParagraph()
  Head $s 'Um' -2
  $s.TypeText('c '); Fld $s 'STYLEREF 1 \s'; $s.TypeParagraph()
  $d.Fields.Update() | Out-Null
}
# REF \n \r \w numa lista de varios niveis
foreach ($fmt in @(@('rn-letter', '%1.', '%2)'), @('rn-legal', '%1.', '%1.%2.'))) {
  $script:fm = $fmt
  Run-Exp $fmt[0] { param($d, $s) } { param($d, $s, $log)
    $lt = $d.ListTemplates.Add($true)
    $l1 = $lt.ListLevels.Item(1); $l1.NumberFormat = $script:fm[1]; $l1.NumberStyle = 0
    $l2 = $lt.ListLevels.Item(2); $l2.NumberFormat = $script:fm[2]; $l2.NumberStyle = $(if ($script:fm[0] -eq 'rn-letter') { 4 } else { 0 })
    $s.TypeText('Item um'); $s.TypeParagraph(); $s.TypeText('Item dois'); $s.TypeParagraph(); $s.TypeText('Sub um'); $s.TypeParagraph(); $s.TypeText('Sub dois')
    $r = $d.Range($d.Paragraphs(1).Range.Start, $d.Paragraphs(4).Range.End)
    $r.ListFormat.ApplyListTemplate($lt, $false, 0)
    $d.Paragraphs(3).Range.ListFormat.ListLevelNumber = 2; $d.Paragraphs(4).Range.ListFormat.ListLevelNumber = 2
    $p = $d.Paragraphs(4).Range; $d.Bookmarks.Add('sub', $d.Range($p.Start, $p.End - 1)) | Out-Null
    $p = $d.Paragraphs(2).Range; $d.Bookmarks.Add('dois', $d.Range($p.Start, $p.End - 1)) | Out-Null
    $s.EndKey($wdStory) | Out-Null
    $s.TypeText(' x '); Fld $s 'REF sub \n'; $s.TypeText(' y '); Fld $s 'REF sub \r'; $s.TypeText(' z '); Fld $s 'REF sub \w'
    $s.TypeParagraph(); $s.Range.ListFormat.RemoveNumbers()
    $s.TypeText('fora: '); Fld $s 'REF sub \n'; $s.TypeText(' | '); Fld $s 'REF sub \r'; $s.TypeText(' | '); Fld $s 'REF sub \w'; $s.TypeText(' | '); Fld $s 'REF dois \r'; $s.TypeText(' | '); Fld $s 'REF sub \w \d "-"'; $s.TypeText(' | '); Fld $s 'REF sub \r \t'
    $d.Fields.Update() | Out-Null
  }
}
# NOTEREF para nota que vem depois; REF \p no mesmo paragrafo; REF de indicador em 2 paragrafos
Run-Exp 'nr-forward' { param($d, $s) } { param($d, $s, $log)
  $s.TypeText('Antes: '); Fld $s 'NOTEREF alvo \h'; $s.TypeText(' / '); Fld $s 'NOTEREF alvo \f \h'; $s.TypeParagraph()
  $s.TypeText('Nota1'); $d.Footnotes.Add($s.Range, [Type]::Missing, 'n1') | Out-Null
  $s.EndKey($wdStory) | Out-Null; $s.TypeText(' Nota2')
  $f = $d.Footnotes.Add($s.Range, [Type]::Missing, 'n2'); $d.Bookmarks.Add('alvo', $f.Reference) | Out-Null
  $d.Fields.Update() | Out-Null
}
Run-Exp 'rp-same' { param($d, $s) } { param($d, $s, $log)
  $s.TypeText('abc '); Fld $s 'REF m \p'; $s.TypeText(' marca '); $p = $s.Range.Start; $s.TypeText('aqui'); $d.Bookmarks.Add('m', $d.Range($p, $p + 4)) | Out-Null; $s.TypeText(' '); Fld $s 'REF m \p'
  $d.Fields.Update() | Out-Null
}
Run-Exp 'ref-multi' { param($d, $s) } { param($d, $s, $log)
  $s.TypeText('Linha um'); $s.TypeParagraph(); $s.TypeText('Linha dois'); $s.TypeParagraph()
  $d.Bookmarks.Add('mp', $d.Range(6, 15)) | Out-Null
  $s.EndKey($wdStory) | Out-Null; $s.TypeText('R: '); Fld $s 'REF mp'
  $d.Fields.Update() | Out-Null
}
$keep.Close(0)
Close-Word

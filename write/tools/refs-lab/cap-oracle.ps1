# Oraculo das legendas: InsertCaption (rotulos, posicao, sem rotulo, formato,
# capitulo, rotulo novo, AutoLegenda) e onde o paragrafo de legenda entra.
# As opcoes de rotulo/AutoLegenda sao GLOBAIS do Word (Normal/registro): o
# script guarda as originais e devolve no fim de cada experimento.
# Uso: node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/refs-lab/cap-oracle.ps1 [-Only a,b]
param([string]$Only)
. ([string](Join-Path $PSScriptRoot 'refs-oracle-lib.ps1'))

$wdStory = 6
# os nomes dos rotulos internos saem no idioma do 1o documento: sem documento
# aberto o Word os batiza em ingles ("Figure") e mantem na sessao inteira
$keep = $word.Documents.Add()
$orig = @{}
foreach ($l in $word.CaptionLabels) { $orig[$l.Name] = @($l.NumberStyle, $l.IncludeChapterNumber, $l.ChapterStyleLevel, $l.Separator, $l.Position) }
$autoOrig = @{}
foreach ($a in $word.AutoCaptions) { $autoOrig[$a.Name] = @($a.AutoInsert, $a.CaptionLabel.Name) }
function Restore {
  foreach ($l in @($word.CaptionLabels)) {
    if ($orig.ContainsKey($l.Name)) {
      $v = $orig[$l.Name]
      $l.NumberStyle = $v[0]; $l.IncludeChapterNumber = $v[1]; $l.ChapterStyleLevel = $v[2]; $l.Separator = $v[3]; $l.Position = $v[4]
    } elseif (-not $l.BuiltIn) { $l.Delete() }
  }
  foreach ($a in $word.AutoCaptions) { if ($autoOrig.ContainsKey($a.Name)) { $a.AutoInsert = $autoOrig[$a.Name][0] } }
}
function Cap($sel, [string]$label, [string]$title = '', [int]$pos = 1, [bool]$excl = $false) {
  $sel.InsertCaption($label, $title, '', $pos, $excl)
}
function PicDoc($doc, $sel) { $sel.TypeText('Antes.'); $sel.TypeParagraph(); $sel.InlineShapes.AddPicture($png) | Out-Null; $sel.TypeParagraph(); $sel.TypeText('Depois.') }
function TblDoc($doc, $sel) { $sel.TypeText('Antes.'); $sel.TypeParagraph(); $t = $doc.Tables.Add($sel.Range, 2, 2); $t.Cell(1, 1).Range.Text = 'a'; $sel.EndKey($wdStory) | Out-Null; $sel.TypeText('Depois.') }

function Exp([string]$name, $setup, $op) { try { Run-Exp $name $setup $op } finally { Restore } }

$log0 = @(); foreach ($l in $word.CaptionLabels) { $log0 += "[$($l.Name)] builtin=$($l.BuiltIn) style=$($l.NumberStyle) chap=$($l.IncludeChapterNumber) lvl=$($l.ChapterStyleLevel) sep=$($l.Separator) pos=$($l.Position)" }
foreach ($a in $word.AutoCaptions) { $log0 += "auto [$($a.Name)] ins=$($a.AutoInsert) label=$($a.CaptionLabel.Name)" }
[System.IO.File]::WriteAllText([string](Join-Path $outDir 'cap-labels.txt'), ($log0 -join "`n"))

Exp 'cap-pic-below' { param($d, $s) PicDoc $d $s } { param($d, $s, $log) $d.InlineShapes(1).Select(); Cap $s 'Figura'; $log.Add('after: ' + (Sel-Info $s)) | Out-Null }
Exp 'cap-pic-above' { param($d, $s) PicDoc $d $s } { param($d, $s, $log) $d.InlineShapes(1).Select(); Cap $s 'Figura' '' 0; $log.Add('after: ' + (Sel-Info $s)) | Out-Null }
Exp 'cap-pic-title' { param($d, $s) PicDoc $d $s } { param($d, $s, $log) $d.InlineShapes(1).Select(); Cap $s 'Figura' ': Texto da legenda' }
Exp 'cap-tbl-above' { param($d, $s) TblDoc $d $s } { param($d, $s, $log) $d.Tables(1).Select(); Cap $s 'Tabela' '' 0; $log.Add('after: ' + (Sel-Info $s)) | Out-Null }
Exp 'cap-tbl-below' { param($d, $s) TblDoc $d $s } { param($d, $s, $log) $d.Tables(1).Select(); Cap $s 'Tabela' '' 1 }
Exp 'cap-text-mid' { param($d, $s) $s.TypeText('Um dois tres.'); $s.TypeParagraph(); $s.TypeText('Fim.') } { param($d, $s, $log) $s.SetRange(4, 4); Cap $s 'Figura'; $log.Add('after: ' + (Sel-Info $s)) | Out-Null }
Exp 'cap-text-above' { param($d, $s) $s.TypeText('Um dois tres.'); $s.TypeParagraph(); $s.TypeText('Fim.') } { param($d, $s, $log) $s.SetRange(4, 4); Cap $s 'Figura' '' 0; $log.Add('after: ' + (Sel-Info $s)) | Out-Null }
Exp 'cap-empty' { param($d, $s) $s.TypeText('Um.'); $s.TypeParagraph(); $s.TypeParagraph(); $s.TypeText('Fim.') } { param($d, $s, $log) $s.SetRange(4, 4); Cap $s 'Figura'; $log.Add('after: ' + (Sel-Info $s)) | Out-Null }
Exp 'cap-exclude' { param($d, $s) PicDoc $d $s } { param($d, $s, $log) $d.InlineShapes(1).Select(); Cap $s 'Figura' ' texto' 1 $true }
Exp 'cap-eq' { param($d, $s) $s.TypeText('Um.') } { param($d, $s, $log) Cap $s $EQ }
foreach ($ns in 1..4) {
  $script:ns = $ns
  Exp "cap-fmt$ns" { param($d, $s) PicDoc $d $s } { param($d, $s, $log) $word.CaptionLabels.Item('Figura').NumberStyle = $script:ns; $d.InlineShapes(1).Select(); Cap $s 'Figura' }
}
# capitulo: Titulo 1 numerado por lista ligada ao estilo
function ChapDoc($doc, $sel, [bool]$num = $true) {
  $sel.TypeText('Cap um'); $sel.Paragraphs(1).Style = -2; $sel.TypeParagraph()
  if ($num) {
    $lt = $doc.ListTemplates.Add($true)
    $lv = $lt.ListLevels.Item(1); $lv.NumberFormat = '%1'; $lv.NumberStyle = 0; $lv.LinkedStyle = $doc.Styles.Item(-2).NameLocal
    $lv2 = $lt.ListLevels.Item(2); $lv2.NumberFormat = '%1.%2'; $lv2.NumberStyle = 0; $lv2.LinkedStyle = $doc.Styles.Item(-3).NameLocal
  }
  $sel.Paragraphs(1).Style = -1
  $sel.InlineShapes.AddPicture($png) | Out-Null; $sel.TypeParagraph()
  $sel.TypeText('Cap dois'); $sel.Paragraphs(1).Style = -2; $sel.TypeParagraph(); $sel.Paragraphs(1).Style = -1
  $sel.InlineShapes.AddPicture($png) | Out-Null; $sel.TypeParagraph(); $sel.TypeText('Fim.')
}
foreach ($sp in 0..4) {
  $script:sp = $sp
  Exp "cap-chap-sep$sp" { param($d, $s) ChapDoc $d $s } { param($d, $s, $log)
    $l = $word.CaptionLabels.Item('Figura'); $l.IncludeChapterNumber = $true; $l.ChapterStyleLevel = 1; $l.Separator = $script:sp
    $d.InlineShapes(1).Select(); Cap $s 'Figura'
    $d.InlineShapes(2).Select(); Cap $s 'Figura'
    $d.Fields.Update() | Out-Null
  }
}
Exp 'cap-chap-h2' { param($d, $s) ChapDoc $d $s } { param($d, $s, $log)
  $l = $word.CaptionLabels.Item('Figura'); $l.IncludeChapterNumber = $true; $l.ChapterStyleLevel = 2; $l.Separator = 1
  $d.InlineShapes(1).Select(); Cap $s 'Figura'
}
Exp 'cap-chap-nonum' { param($d, $s) ChapDoc $d $s $false } { param($d, $s, $log)
  $l = $word.CaptionLabels.Item('Figura'); $l.IncludeChapterNumber = $true; $l.ChapterStyleLevel = 1
  $d.InlineShapes(1).Select(); Cap $s 'Figura'
}
Exp 'cap-newlabel' { param($d, $s) PicDoc $d $s } { param($d, $s, $log)
  $word.CaptionLabels.Add('Grafico') | Out-Null
  $d.InlineShapes(1).Select(); Cap $s 'Grafico'
  $l = @(); foreach ($x in $word.CaptionLabels) { $l += $x.Name }; $log.Add('labels: ' + ($l -join ' | ')) | Out-Null
}
# duas figuras: legenda da 2a e depois da 1a (renumera?)
Exp 'cap-renum' { param($d, $s) PicDoc $d $s; $s.TypeParagraph(); $s.InlineShapes.AddPicture($png) | Out-Null } { param($d, $s, $log)
  $d.InlineShapes(2).Select(); Cap $s 'Figura'
  $d.InlineShapes(1).Select(); Cap $s 'Figura'
  foreach ($l in (Fld-Info $d)) { $log.Add("noupd $l") | Out-Null }
}
# AutoLegenda: tabela nova e imagem nova
Exp 'cap-auto-table' { param($d, $s) $s.TypeText('Um.'); $s.TypeParagraph() } { param($d, $s, $log)
  $l = @(); foreach ($a in $word.AutoCaptions) { $l += $a.Name }; $log.Add('autos: ' + ($l -join ' | ')) | Out-Null
  foreach ($a in $word.AutoCaptions) { if ($a.Name -match 'Tab') { $a.AutoInsert = $true; $a.CaptionLabel = 'Tabela'; $log.Add("on: $($a.Name)") | Out-Null } }
  $d.Tables.Add($s.Range, 2, 2) | Out-Null
}
Restore
$keep.Close(0)
Close-Word

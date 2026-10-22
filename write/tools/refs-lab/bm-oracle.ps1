# Oraculo dos indicadores: XML gravado (bookmarkStart/End, ids), nomes aceitos,
# o que acontece com o indicador ao digitar/apagar/dividir/copiar, Ir para.
# Uso (sempre pela trava global do Word):
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/refs-lab/bm-oracle.ps1 [-Only a,b]
# Saida: write/tools/refs-lab/results/<exp>.txt
param([string]$Only)
. ([string](Join-Path $PSScriptRoot 'refs-oracle-lib.ps1'))

$wdStory = 6
function Base($doc, $sel) { $sel.TypeText('Alfa beta gama.') }
function Three($doc, $sel) { $sel.TypeText('Um dois.'); $sel.TypeParagraph(); $sel.TypeText('Tres quatro.'); $sel.TypeParagraph(); $sel.TypeText('Cinco seis.') }
function Bm($doc, [string]$name, [int]$a, [int]$b) { $doc.Bookmarks.Add($name, $doc.Range($a, $b)) | Out-Null }

Run-Exp 'bm-sel' { param($d, $s) Base $d $s } { param($d, $s, $log) Bm $d 'marca' 5 9 }
Run-Exp 'bm-point' { param($d, $s) Base $d $s } { param($d, $s, $log) Bm $d 'ponto' 5 5 }
Run-Exp 'bm-multi' { param($d, $s) Three $d $s } { param($d, $s, $log) Bm $d 'longo' 3 23 }
Run-Exp 'bm-two' { param($d, $s) Base $d $s } { param($d, $s, $log) Bm $d 'zeta' 10 14; Bm $d 'alfa' 0 9; Bm $d 'meio' 5 9 }
Run-Exp 'bm-move' { param($d, $s) Base $d $s } { param($d, $s, $log) Bm $d 'x' 0 4; Bm $d 'y' 5 9; Bm $d 'x' 10 14 }
Run-Exp 'bm-para' { param($d, $s) Three $d $s } { param($d, $s, $log) $d.Bookmarks.Add('par', $d.Paragraphs(2).Range) | Out-Null }
Run-Exp 'bm-lastpara' { param($d, $s) Three $d $s } { param($d, $s, $log) $d.Bookmarks.Add('fim', $d.Paragraphs(3).Range) | Out-Null }
Run-Exp 'bm-all' { param($d, $s) Three $d $s } { param($d, $s, $log) $d.Bookmarks.Add('tudo', $d.Content) | Out-Null }

# digitar no comeco, no meio e no fim do indicador; no indicador de ponto
Run-Exp 'bm-type-start' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $s.SetRange(5, 5); $s.TypeText('XY') }
Run-Exp 'bm-type-in' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $s.SetRange(7, 7); $s.TypeText('XY') }
Run-Exp 'bm-type-end' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $s.SetRange(9, 9); $s.TypeText('XY') }
Run-Exp 'bm-type-point' { param($d, $s) Base $d $s; Bm $d 'p' 5 5 } { param($d, $s, $log) $s.SetRange(5, 5); $s.TypeText('XY') }
Run-Exp 'bm-replace' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $s.SetRange(5, 9); $s.TypeText('XY') }
# apagar o trecho exato, um trecho maior, so o comeco
Run-Exp 'bm-del-exact' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $s.SetRange(5, 9); $s.Delete() | Out-Null; $log.Add("exists=$($d.Bookmarks.Exists('m'))") | Out-Null }
Run-Exp 'bm-del-wider' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $s.SetRange(3, 12); $s.Delete() | Out-Null; $log.Add("exists=$($d.Bookmarks.Exists('m'))") | Out-Null }
Run-Exp 'bm-del-head' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $s.SetRange(3, 7); $s.Delete() | Out-Null }
Run-Exp 'bm-del-point' { param($d, $s) Base $d $s; Bm $d 'p' 5 5 } { param($d, $s, $log) $s.SetRange(3, 7); $s.Delete() | Out-Null; $log.Add("exists=$($d.Bookmarks.Exists('p'))") | Out-Null }
Run-Exp 'bm-bksp-point' { param($d, $s) Base $d $s; Bm $d 'p' 5 5 } { param($d, $s, $log) $s.SetRange(5, 5); $s.TypeBackspace(); $log.Add("exists=$($d.Bookmarks.Exists('p'))") | Out-Null }
# Enter no meio do indicador; juntar paragrafos com indicador que atravessa
Run-Exp 'bm-split' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $s.SetRange(7, 7); $s.TypeParagraph() }
Run-Exp 'bm-join' { param($d, $s) Three $d $s; Bm $d 'm' 3 12 } { param($d, $s, $log) $s.SetRange(8, 8); $s.Delete() | Out-Null }
# copiar e colar / recortar e colar o trecho com indicador
Run-Exp 'bm-copy' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $s.SetRange(5, 9); $s.Copy(); $s.SetRange(15, 15); $s.Paste() }
Run-Exp 'bm-copy-all' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $s.SetRange(0, 15); $s.Copy(); $s.SetRange(15, 15); $s.TypeParagraph(); $s.Paste() }
Run-Exp 'bm-cut' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $s.SetRange(5, 10); $s.Cut(); $s.SetRange(10, 10); $s.Paste() }
# nomes aceitos
Run-Exp 'bm-names' { param($d, $s) Base $d $s } { param($d, $s, $log)
  $names = @('1abc', 'a b', '_x', 'a-b', "a$cc$at" + 'o', ('A' * 40), ('B' * 41), 'abc1_2', 'Ab.c', 'Maiusc', 'maiusc', "$EQ", 'x' + [char]0x00BA)
  $k = 0
  foreach ($n in $names) {
    try { Bm $d $n $k ($k + 1); $log.Add("ok [$n] -> exists=$($d.Bookmarks.Exists($n))") | Out-Null }
    catch { $log.Add("recusa [$n]: $($_.Exception.Message)") | Out-Null }
    $k++
  }
  $d.Bookmarks.ShowHidden = $false
  $d.Bookmarks.DefaultSorting = 0
  $l = @(); foreach ($b in $d.Bookmarks) { $l += $b.Name }
  $log.Add("sortName: " + ($l -join ' | ')) | Out-Null
}
# celula, linha inteira, tabela inteira
Run-Exp 'bm-cell' { param($d, $s) $t = $d.Tables.Add($s.Range, 2, 2); $t.Cell(1, 1).Range.Text = 'a1'; $t.Cell(1, 2).Range.Text = 'b1'; $t.Cell(2, 1).Range.Text = 'a2'; $t.Cell(2, 2).Range.Text = 'b2' } { param($d, $s, $log)
  $c = $d.Tables(1).Cell(1, 2).Range
  Bm $d 'cel' $c.Start ($c.End - 1)
  $d.Bookmarks.Add('linha', $d.Tables(1).Rows(2).Range) | Out-Null
  $d.Bookmarks.Add('tabela', $d.Tables(1).Range) | Out-Null
}
# Ir para: selecao depois do GoTo (trecho e ponto)
Run-Exp 'bm-goto' { param($d, $s) Base $d $s; Bm $d 'm' 5 9; Bm $d 'p' 12 12 } { param($d, $s, $log)
  $s.GoTo(-1, 0, 0, 'm') | Out-Null; $log.Add('goto m: ' + (Sel-Info $s)) | Out-Null
  $s.GoTo(-1, 0, 0, 'p') | Out-Null; $log.Add('goto p: ' + (Sel-Info $s)) | Out-Null
}
# excluir: o texto fica
Run-Exp 'bm-delete' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $d.Bookmarks.Item('m').Delete() }
# nota e cabecalho
Run-Exp 'bm-note' { param($d, $s) Base $d $s; $d.Footnotes.Add($d.Range(4, 4), [Type]::Missing, 'nota um') | Out-Null } { param($d, $s, $log)
  $r = $d.Footnotes(1).Range
  $d.Bookmarks.Add('nanota', $d.StoryRanges(2).Characters(2)) | Out-Null
  $h = $d.Sections(1).Headers(1).Range; $h.Text = 'cabec'
  try { $d.Bookmarks.Add('nocab', $d.Sections(1).Headers(1).Range) | Out-Null; $log.Add('cab ok') | Out-Null } catch { $log.Add("cab: $($_.Exception.Message)") | Out-Null }
}
Close-Word

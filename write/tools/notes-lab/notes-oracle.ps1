# Oraculo da frente Notas: o XML que o Word grava ao inserir/apagar/converter
# notas e ao mudar as opcoes (formato, inicio, reinicio, local, colunas).
# Uso (sempre pela trava global do Word):
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/notes-lab/notes-oracle.ps1 [-Only a,b]
# Saida: write/tools/notes-lab/results/<exp>.txt
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
param([string]$Only)
. ([string](Join-Path $PSScriptRoot 'notes-oracle-lib.ps1'))

$wdStory = 6
function Base($doc, $sel) { $sel.TypeText('Texto antes depois.'); $sel.HomeKey($wdStory) | Out-Null; $sel.MoveRight(1, 11) | Out-Null }
function Abcd($doc, $sel) {
  $sel.TypeText('A B C D.')
  foreach ($k in 1..3) {
    $r = $doc.Range(2 * $k - 1 + ($k - 1), 2 * $k - 1 + ($k - 1))
    $doc.Footnotes.Add($r, [Type]::Missing, "nota $k") | Out-Null
  }
}

# inserir: Footnotes.Add, WordBasic (comando da interface) e ExecuteMso
Run-Exp 'fn-add' { param($d, $s) Base $d $s } { param($d, $s, $log)
  $log.Add("view=$($d.ActiveWindow.View.Type)") | Out-Null
  $d.Footnotes.Add($s.Range) | Out-Null
  $log.Add((Sel-Info $s)) | Out-Null
  $s.TypeText('Nota um')
}
Run-Exp 'fn-wb' { param($d, $s) Base $d $s } { param($d, $s, $log)
  $word.WordBasic.InsertFootnote()
  $log.Add((Sel-Info $s)) | Out-Null
  $s.TypeText('Nota um')
}
Run-Exp 'en-wb' { param($d, $s) Base $d $s } { param($d, $s, $log)
  $word.WordBasic.InsertFootnote('', 1)
  $log.Add((Sel-Info $s)) | Out-Null
  $s.TypeText('Nota fim')
}
Run-Exp 'fn-mso' { param($d, $s) Base $d $s } { param($d, $s, $log)
  $word.CommandBars.ExecuteMso('FootnoteInsert')
  $log.Add((Sel-Info $s)) | Out-Null
  $s.TypeText('Nota um')
}
Run-Exp 'en-mso' { param($d, $s) Base $d $s } { param($d, $s, $log)
  $word.CommandBars.ExecuteMso('EndnoteInsert')
  $log.Add((Sel-Info $s)) | Out-Null
  $s.TypeText('Nota fim')
}
# desfazer: um passo por insercao? o que sobra depois de 1 e 2 desfazer
Run-Exp 'fn-undo' { param($d, $s) Base $d $s } { param($d, $s, $log)
  $word.WordBasic.InsertFootnote()
  $s.TypeText('abc')
  $d.Undo(1) | Out-Null
  $log.Add("undo1: n=$($d.Footnotes.Count) " + (Sel-Info $s)) | Out-Null
  $d.Undo(1) | Out-Null
  $log.Add("undo2: n=$($d.Footnotes.Count) " + (Sel-Info $s)) | Out-Null
  $d.Redo(2) | Out-Null
  $log.Add("redo2: n=$($d.Footnotes.Count) " + (Sel-Info $s)) | Out-Null
}
# apagar a 2a referencia: ids depois de salvar
Run-Exp 'fn-del2' { param($d, $s) Abcd $d $s } { param($d, $s, $log)
  $d.Footnotes(2).Reference.Select()
  $log.Add("refsel: " + (Sel-Info $s)) | Out-Null
  $s.Delete() | Out-Null
  $log.Add("n=$($d.Footnotes.Count)") | Out-Null
}
# Backspace logo depois da referencia
Run-Exp 'fn-bksp' { param($d, $s) Abcd $d $s } { param($d, $s, $log)
  $r = $d.Footnotes(2).Reference
  $s.SetRange($r.End, $r.End)
  $s.TypeBackspace()
  $log.Add("bksp1: n=$($d.Footnotes.Count) " + (Sel-Info $s)) | Out-Null
  $s.TypeBackspace()
  $log.Add("bksp2: n=$($d.Footnotes.Count) " + (Sel-Info $s)) | Out-Null
}
# Delete antes da referencia
Run-Exp 'fn-del' { param($d, $s) Abcd $d $s } { param($d, $s, $log)
  $r = $d.Footnotes(2).Reference
  $s.SetRange($r.Start, $r.Start)
  $s.Delete() | Out-Null
  $log.Add("del1: n=$($d.Footnotes.Count) " + (Sel-Info $s)) | Out-Null
}
# opcoes por secao e no documento
function TwoSec($d, $s) {
  $s.TypeText('S1 a.'); $d.Footnotes.Add($d.Range(2, 2), [Type]::Missing, 'n1') | Out-Null
  $s.EndKey($wdStory) | Out-Null
  $s.InsertBreak(2)
  $s.TypeText('S2 b.'); $s.EndKey($wdStory) | Out-Null
  $e = $s.Start
  $d.Footnotes.Add($d.Range($e - 1, $e - 1), [Type]::Missing, 'n2') | Out-Null
  $d.Endnotes.Add($d.Range(1, 1), [Type]::Missing, 'e1') | Out-Null
}
Run-Exp 'opt-sec2' { param($d, $s) TwoSec $d $s } { param($d, $s, $log)
  $o = $d.Sections(2).Range.FootnoteOptions
  $o.NumberStyle = 2; $o.StartingNumber = 3; $o.NumberingRule = 1
}
Run-Exp 'opt-doc' { param($d, $s) TwoSec $d $s } { param($d, $s, $log)
  $o = $d.Range().FootnoteOptions
  $o.NumberStyle = 4; $o.StartingNumber = 2; $o.NumberingRule = 2
}
Run-Exp 'opt-docprop' { param($d, $s) TwoSec $d $s } { param($d, $s, $log)
  $d.Footnotes.NumberStyle = 1
  $d.Footnotes.StartingNumber = 5
}
Run-Exp 'opt-loc' { param($d, $s) TwoSec $d $s } { param($d, $s, $log)
  $d.Range().FootnoteOptions.Location = 1
  $d.Range().EndnoteOptions.Location = 0
  $log.Add("enLoc=$($d.Endnotes.Location) fnLoc=$($d.Footnotes.Location)") | Out-Null
}
Run-Exp 'opt-en' { param($d, $s) TwoSec $d $s } { param($d, $s, $log)
  $o = $d.Sections(1).Range.EndnoteOptions
  $o.NumberStyle = 0; $o.StartingNumber = 4; $o.NumberingRule = 1
}
Run-Exp 'opt-sym' { param($d, $s) TwoSec $d $s } { param($d, $s, $log)
  $d.Range().FootnoteOptions.NumberStyle = 9
}
Run-Exp 'opt-cols' { param($d, $s) TwoSec $d $s } { param($d, $s, $log)
  $d.Sections(1).Range.FootnoteOptions.LayoutColumns = 2
  $log.Add("cols=$($d.Sections(1).Range.FootnoteOptions.LayoutColumns)") | Out-Null
}
# converter
Run-Exp 'cv-fn2en' { param($d, $s) TwoSec $d $s } { param($d, $s, $log) $d.Footnotes.Convert() }
Run-Exp 'cv-en2fn' { param($d, $s) TwoSec $d $s } { param($d, $s, $log) $d.Endnotes.Convert() }
Run-Exp 'cv-swap' { param($d, $s) TwoSec $d $s } { param($d, $s, $log) $d.Footnotes.SwapWithEndnotes() }
# marca personalizada
Run-Exp 'fn-custom' { param($d, $s) Base $d $s } { param($d, $s, $log)
  $d.Footnotes.Add($s.Range, '*', 'nota asterisco') | Out-Null
  $d.Footnotes.Add($d.Range(3, 3), [string][char]0x2020, 'nota adaga') | Out-Null
  $d.Footnotes.Add($d.Range(1, 1)) | Out-Null
}
# na celula de tabela; no cabecalho e dentro de nota (o Word recusa?)
Run-Exp 'fn-cell' { param($d, $s) $t = $d.Tables.Add($s.Range, 2, 2); $t.Cell(2, 2).Range.Text = 'celula' } { param($d, $s, $log)
  $c = $d.Tables(1).Cell(2, 2).Range
  $d.Footnotes.Add($d.Range($c.End - 1, $c.End - 1), [Type]::Missing, 'nota celula') | Out-Null
}
Run-Exp 'fn-header' { param($d, $s) Base $d $s } { param($d, $s, $log)
  $h = $d.Sections(1).Headers(1).Range
  $h.Text = 'cab'
  try { $d.Footnotes.Add($h.Characters(1)) | Out-Null; $log.Add('header: aceitou') | Out-Null } catch { $log.Add("header: $($_.Exception.Message)") | Out-Null }
  try { $d.Footnotes.Add($d.Footnotes.Add($d.Range(2, 2), [Type]::Missing, 'x').Range.Characters(1)) | Out-Null; $log.Add('nota em nota: aceitou') | Out-Null } catch { $log.Add("nota em nota: $($_.Exception.Message)") | Out-Null }
}
# copiar e colar a referencia
Run-Exp 'fn-copy' { param($d, $s) Abcd $d $s } { param($d, $s, $log)
  $d.Footnotes(1).Reference.Copy()
  $s.EndKey($wdStory) | Out-Null
  $s.Paste()
  $log.Add("n=$($d.Footnotes.Count) texts=" + (($d.Footnotes | ForEach-Object { $_.Range.Text }) -join '|')) | Out-Null
}
Close-Word

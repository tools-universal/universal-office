# Oraculo da frente Notas, 3a rodada: inserir com selecao, digitar logo depois
# da referencia (o estilo continua?), Proxima nota (onde fica o cursor).
# Uso: node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/notes-lab/notes-oracle3.ps1 [-Only a,b]
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
param([string]$Only)
. ([string](Join-Path $PSScriptRoot 'notes-oracle-lib.ps1'))

$wdStory = 6
function Abcd($doc, $sel) {
  $sel.TypeText('A B C D.')
  foreach ($k in 1..3) {
    $r = $doc.Range(2 * $k - 1 + ($k - 1), 2 * $k - 1 + ($k - 1))
    $doc.Footnotes.Add($r, [Type]::Missing, "nota $k") | Out-Null
  }
}
# inserir com "antes" selecionado
Run-Exp 'sel-insert' { param($d, $s) $s.TypeText('Texto antes depois.'); $s.SetRange(6, 11) } { param($d, $s, $log)
  $word.WordBasic.InsertFootnote()
  $log.Add((Sel-Info $s)) | Out-Null
}
# voltar ao texto logo depois da referencia e digitar
Run-Exp 'type-after' { param($d, $s) $s.TypeText('Texto antes depois.'); $s.SetRange(11, 11) } { param($d, $s, $log)
  $word.WordBasic.InsertFootnote()
  $s.TypeText('nota')
  $r = $d.Footnotes(1).Reference
  $r.Select(); $s.Collapse(0) | Out-Null
  $s.TypeText('xy')
  $log.Add((Sel-Info $s)) | Out-Null
}
# Proxima/anterior nota de rodape a partir do inicio e do meio
Run-Exp 'goto-next' { param($d, $s) Abcd $d $s } { param($d, $s, $log)
  $s.HomeKey($wdStory) | Out-Null
  foreach ($k in 1..4) { $s.GoToNext(4) | Out-Null; $log.Add("next$k " + (Sel-Info $s)) | Out-Null }
  foreach ($k in 1..2) { $s.GoToPrevious(4) | Out-Null; $log.Add("prev$k " + (Sel-Info $s)) | Out-Null }
}
# Proxima nota estando DENTRO da area de notas
Run-Exp 'goto-in-note' { param($d, $s) Abcd $d $s } { param($d, $s, $log)
  $d.Footnotes(1).Range.Select()
  $s.Collapse(1) | Out-Null
  $log.Add("in " + (Sel-Info $s)) | Out-Null
  $s.GoToNext(4) | Out-Null; $log.Add("next " + (Sel-Info $s)) | Out-Null
}
Close-Word

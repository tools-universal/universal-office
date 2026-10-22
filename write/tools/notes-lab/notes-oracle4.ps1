# Oraculo da frente Notas, 4a rodada: nota inserida com o controle de alteracoes
# ligado (a referencia e o conteudo da nota viram insercao?) e a nota apagada.
# Uso: node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/notes-lab/notes-oracle4.ps1 [-Only a,b]
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
param([string]$Only)
. ([string](Join-Path $PSScriptRoot 'notes-oracle-lib.ps1'))

Run-Exp 'trk-insert' { param($d, $s) $s.TypeText('Texto antes depois.'); $s.SetRange(11, 11) } { param($d, $s, $log)
  $d.TrackRevisions = $true
  $word.WordBasic.InsertFootnote()
  $s.TypeText('Nota')
  $log.Add("revs=$($d.Revisions.Count)") | Out-Null
}
Run-Exp 'trk-delete' { param($d, $s) $s.TypeText('Texto antes depois.'); $d.Footnotes.Add($d.Range(11, 11), [Type]::Missing, 'nota') | Out-Null } { param($d, $s, $log)
  $d.TrackRevisions = $true
  $d.Footnotes(1).Reference.Select()
  $s.Delete() | Out-Null
  $log.Add("revs=$($d.Revisions.Count) fn=$($d.Footnotes.Count)") | Out-Null
}
Close-Word

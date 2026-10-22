# Oraculo da frente Notas, 2a rodada: opcoes por secao ("Esta secao") e as
# combinacoes de inicio/reinicio, formato das notas de fim por secao.
# Uso: node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/notes-lab/notes-oracle2.ps1 [-Only a,b]
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
param([string]$Only)
. ([string](Join-Path $PSScriptRoot 'notes-oracle-lib.ps1'))

$wdStory = 6
function TwoSec($d, $s) {
  $s.TypeText('S1 a.'); $d.Footnotes.Add($d.Range(2, 2), [Type]::Missing, 'n1') | Out-Null
  $s.EndKey($wdStory) | Out-Null
  $s.InsertBreak(2)
  $s.TypeText('S2 b.'); $s.EndKey($wdStory) | Out-Null
  $e = $s.Start
  $d.Footnotes.Add($d.Range($e - 1, $e - 1), [Type]::Missing, 'n2') | Out-Null
  $d.Endnotes.Add($d.Range(1, 1), [Type]::Missing, 'e1') | Out-Null
}
function Try-Set($log, [string]$what, [scriptblock]$b) {
  try { & $b; $log.Add("$what ok") | Out-Null } catch { $log.Add("$what ERRO $($_.Exception.Message)") | Out-Null }
}
# so a secao 2: formato
Run-Exp 'sec2-fmt' { param($d, $s) TwoSec $d $s } { param($d, $s, $log)
  Try-Set $log 'fmt' { $d.Sections(2).Range.FootnoteOptions.NumberStyle = 2 }
}
# so a secao 2: reiniciar (inicio 1)
Run-Exp 'sec2-restart' { param($d, $s) TwoSec $d $s } { param($d, $s, $log)
  Try-Set $log 'rule' { $d.Sections(2).Range.FootnoteOptions.NumberingRule = 1 }
  Try-Set $log 'start3' { $d.Sections(2).Range.FootnoteOptions.StartingNumber = 3 }
}
# so a secao 2: iniciar em 3 (continua)
Run-Exp 'sec2-start' { param($d, $s) TwoSec $d $s } { param($d, $s, $log)
  Try-Set $log 'start3' { $d.Sections(2).Range.FootnoteOptions.StartingNumber = 3 }
  Try-Set $log 'rulePage' { $d.Sections(2).Range.FootnoteOptions.NumberingRule = 2 }
}
# documento inteiro: reiniciar a cada pagina
Run-Exp 'doc-page' { param($d, $s) TwoSec $d $s } { param($d, $s, $log)
  Try-Set $log 'rulePage' { $d.Range().FootnoteOptions.NumberingRule = 2 }
}
# notas de fim: formato e inicio so na secao 1; no documento
Run-Exp 'en-sec1' { param($d, $s) TwoSec $d $s } { param($d, $s, $log)
  Try-Set $log 'fmt' { $d.Sections(1).Range.EndnoteOptions.NumberStyle = 0 }
  Try-Set $log 'start' { $d.Sections(1).Range.EndnoteOptions.StartingNumber = 4 }
  Try-Set $log 'rule' { $d.Sections(1).Range.EndnoteOptions.NumberingRule = 1 }
}
Run-Exp 'en-doc' { param($d, $s) TwoSec $d $s } { param($d, $s, $log)
  Try-Set $log 'fmt' { $d.Range().EndnoteOptions.NumberStyle = 4 }
  Try-Set $log 'rule' { $d.Range().EndnoteOptions.NumberingRule = 1 }
  $log.Add("enStyle=$($d.Endnotes.NumberStyle) fnStyle=$($d.Footnotes.NumberStyle) enRule=$($d.Endnotes.NumberingRule)") | Out-Null
}
# padroes lidos pelo COM num documento novo
Run-Exp 'defaults' { param($d, $s) TwoSec $d $s } { param($d, $s, $log)
  $o = $d.Sections(1).Range.FootnoteOptions; $e = $d.Sections(1).Range.EndnoteOptions
  $log.Add("fn style=$($o.NumberStyle) start=$($o.StartingNumber) rule=$($o.NumberingRule) loc=$($o.Location) cols=$($o.LayoutColumns)") | Out-Null
  $log.Add("en style=$($e.NumberStyle) start=$($e.StartingNumber) rule=$($e.NumberingRule) loc=$($e.Location)") | Out-Null
}
# converter UMA nota (menu de contexto "Converter em nota de fim")
Run-Exp 'cv-one' { param($d, $s) TwoSec $d $s } { param($d, $s, $log)
  $d.Footnotes(1).Range.Select()
  $log.Add("sel " + (Sel-Info $s)) | Out-Null
  Try-Set $log 'convOne' { $d.Footnotes(1).Range.Footnotes.Convert() }
  $log.Add("fn=$($d.Footnotes.Count) en=$($d.Endnotes.Count)") | Out-Null
}
# nota com formatacao direta e estilo proprio: o que a conversao troca
Run-Exp 'cv-fmt' { param($d, $s) TwoSec $d $s } { param($d, $s, $log)
  $r = $d.Footnotes(1).Range
  $r.Font.Bold = $true
  $r.InsertParagraphAfter(); $r2 = $d.Footnotes(1).Range.Paragraphs(2).Range; $r2.Text = 'segundo'
  $d.Footnotes.Convert()
}
Close-Word

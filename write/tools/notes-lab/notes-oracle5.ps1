# Oraculo da frente Notas, 5a rodada: nota dentro de controle de conteudo.
# Texto sem formatacao (wdContentControlText = 1) x rich text (0), de bloco e inline.
# Uso: node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/notes-lab/notes-oracle5.ps1 [-Only a,b]
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
param([string]$Only)
. ([string](Join-Path $PSScriptRoot 'notes-oracle-lib.ps1'))

function Try-Note($d, $log) {
  try {
    $n = $d.Footnotes.Add($word.Selection.Range)
    $log.Add("footnote=ok fn=$($d.Footnotes.Count)") | Out-Null
  } catch {
    $log.Add("footnote=ERRO $($_.Exception.Message)") | Out-Null
  }
}

# controle inline de texto sem formatacao no meio do paragrafo; cursor dentro dele
Run-Exp 'cc-plain-inline' { param($d, $s)
  $s.TypeText('Antes ')
  $cc = $d.ContentControls.Add(1, $s.Range)
  $cc.Range.Text = 'Titulo'
  $s.EndKey(6) | Out-Null
  $s.TypeText(' depois.')
} { param($d, $s, $log)
  $cc = $d.ContentControls.Item(1)
  $s.SetRange($cc.Range.Start + 3, $cc.Range.Start + 3)
  Try-Note $d $log
}
# controle de texto sem formatacao em volta do paragrafo inteiro (de bloco)
Run-Exp 'cc-plain-block' { param($d, $s)
  $s.TypeText('Paragrafo de titulo')
  $s.TypeParagraph()
  $s.TypeText('Corpo.')
  $r = $d.Paragraphs.Item(1).Range
  $cc = $d.ContentControls.Add(1, $r)
} { param($d, $s, $log)
  $s.SetRange(5, 5)
  Try-Note $d $log
}
# controle rich text inline (deve aceitar)
Run-Exp 'cc-rich-inline' { param($d, $s)
  $s.TypeText('Antes ')
  $cc = $d.ContentControls.Add(0, $s.Range)
  $cc.Range.Text = 'Titulo'
  $s.EndKey(6) | Out-Null
  $s.TypeText(' depois.')
} { param($d, $s, $log)
  $cc = $d.ContentControls.Item(1)
  $s.SetRange($cc.Range.Start + 3, $cc.Range.Start + 3)
  Try-Note $d $log
}
# outros tipos de controle inline: data (6), caixa de combinacao (3), lista suspensa (4), galeria de blocos (5)
foreach ($t in @(@('cc-date', 6), @('cc-combo', 3), @('cc-dropdown', 4), @('cc-bbgallery', 5))) {
  $ty = $t[1]
  Run-Exp $t[0] { param($d, $s)
    $s.TypeText('Antes ')
    $cc = $d.ContentControls.Add($ty, $s.Range)
    try { $cc.SetPlaceholderText($null, $null, 'Escolha') } catch { }
    $s.EndKey(6) | Out-Null
    $s.TypeText(' depois.')
  }.GetNewClosure() { param($d, $s, $log)
    $cc = $d.ContentControls.Item(1)
    $log.Add("type=$($cc.Type) range=$($cc.Range.Start)..$($cc.Range.End)") | Out-Null
    $s.SetRange($cc.Range.Start + 2, $cc.Range.Start + 2)
    Try-Note $d $log
  }
}
Close-Word

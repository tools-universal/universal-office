# Quarta leva do oraculo da frente Secoes e colunas: apagar a quebra quando as
# refs de cabecalho/rodape ficaram so na secao de antes (ver sections-oracle.ps1).
param([string]$Only = '')
. ([string](Join-Path $PSScriptRoot 'sections-oracle-lib.ps1'))
$three = { param($d, $s) $s.TypeText('Alpha beta'); $s.TypeParagraph(); $s.TypeText('Gamma delta'); $s.TypeParagraph(); $s.TypeText('Epsilon zeta') }
$withHdrBreak = {
  param($d, $s)
  & $three $d $s
  $d.Sections.Item(1).Headers.Item(1).Range.Text = 'Cabecalho'
  $s.SetRange([int]17, [int]17); $s.InsertBreak([int]3)
}
Run-Exp 'hdr-del-break' $withHdrBreak { param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.Delete([int]1, [int]1) | Out-Null; [void]$log.Add("hdr=" + $d.Sections.Item(1).Headers.Item(1).Range.Text.Trim()) }
Run-Exp 'hdr-del-range' $withHdrBreak { param($d, $s, $log) $s.SetRange([int]0, [int]20); $s.Delete() | Out-Null; [void]$log.Add("hdr=" + $d.Sections.Item(1).Headers.Item(1).Range.Text.Trim()) }
# texto selecionado que termina depois da marca de paragrafo (paragrafo inteiro)
Run-Exp "dlg-cols-selpara" $three { param($d, $s, $log) $s.SetRange([int]11, [int]23); $g = $word.Dialogs.Item(177); $g.Columns = "2"; $g.ApplyColsTo = 3; $g.Execute() }
Run-Exp "dlg-cols-selpara-noend" $three { param($d, $s, $log) $s.SetRange([int]11, [int]22); $g = $word.Dialogs.Item(177); $g.Columns = "2"; $g.ApplyColsTo = 3; $g.Execute() }
Run-Exp "dlg-cols-forward-start" $three { param($d, $s, $log) $s.SetRange([int]11, [int]11); $g = $word.Dialogs.Item(177); $g.Columns = "2"; $g.ApplyColsTo = 1; $g.Execute() }
Run-Exp "dlg-ps-selpara" $three { param($d, $s, $log) $s.SetRange([int]11, [int]23); $g = $word.Dialogs.Item(178); $g.Orientation = 1; $g.ApplyPropsTo = 3; $g.Execute() }
Close-Word

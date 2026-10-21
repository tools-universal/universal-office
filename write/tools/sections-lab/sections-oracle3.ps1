# Terceira leva do oraculo da frente Secoes e colunas (ver sections-oracle.ps1).
param([string]$Only = '')
. ([string](Join-Path $PSScriptRoot 'sections-oracle-lib.ps1'))
$three = { param($d, $s) $s.TypeText('Alpha beta'); $s.TypeParagraph(); $s.TypeText('Gamma delta'); $s.TypeParagraph(); $s.TypeText('Epsilon zeta') }
$same = { param($d, $s) & $three $d $s; $s.SetRange([int]17, [int]17); $s.InsertBreak([int]3) }
Run-Exp 'bs-same' $same { param($d, $s, $log) $s.SetRange([int]18, [int]18); $s.TypeBackspace() }
Run-Exp 'bs-same-next' { param($d, $s) & $three $d $s; $s.SetRange([int]17, [int]17); $s.InsertBreak([int]2) } { param($d, $s, $log) $s.SetRange([int]18, [int]18); $s.TypeBackspace() }
Run-Exp 'del-same' $same { param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.Delete([int]1, [int]1) | Out-Null }
$table = { param($d, $s) $s.TypeText('Antes'); $s.TypeParagraph(); $t = $d.Tables.Add($s.Range, 3, 2); $t.Cell(1, 1).Range.Text = 'A1'; $t.Cell(2, 1).Range.Text = 'A2'; $t.Cell(3, 1).Range.Text = 'A3' }
Run-Exp 'sb-in-table-row2' $table { param($d, $s, $log) $d.Tables.Item(1).Cell(2, 1).Range.Select(); $s.Collapse(1); $s.InsertBreak([int]2) }
Run-Exp 'cb-in-table-row2' $table { param($d, $s, $log) $d.Tables.Item(1).Cell(2, 1).Range.Select(); $s.Collapse(1); $s.InsertBreak([int]8) }
Run-Exp 'sb-pgnum2' { param($d, $s) & $three $d $s; $pn = $d.Sections.Item(1).Headers.Item(1).PageNumbers; $pn.RestartNumberingAtSection = $true; $pn.StartingNumber = 5; [void]$pn } { param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.InsertBreak([int]2) }
Run-Exp 'sb-vjc' { param($d, $s) & $three $d $s; $d.Sections.Item(1).PageSetup.VerticalAlignment = 1; $d.Sections.Item(1).PageSetup.LineNumbering.Active = -1 } { param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.InsertBreak([int]2) }
Close-Word

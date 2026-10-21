# Quinta leva do oraculo da frente Secoes e colunas: quebra de pagina (Ctrl+Enter =
# InsertBreak 7) no inicio/fim do paragrafo, fim do documento, com selecao, em
# paragrafo vazio, duas seguidas e em celula de tabela (ver sections-oracle.ps1).
param([string]$Only = '')
. ([string](Join-Path $PSScriptRoot 'sections-oracle-lib.ps1'))
$three = { param($d, $s) $s.TypeText('Alpha beta'); $s.TypeParagraph(); $s.TypeText('Gamma delta'); $s.TypeParagraph(); $s.TypeText('Epsilon zeta') }
Run-Exp 'pb-start' $three { param($d, $s, $log) $s.SetRange([int]11, [int]11); $s.InsertBreak([int]7) }
Run-Exp 'pb-end' $three { param($d, $s, $log) $s.SetRange([int]10, [int]10); $s.InsertBreak([int]7) }
Run-Exp 'pb-docend' $three { param($d, $s, $log) $s.EndKey([int]6) | Out-Null; $s.InsertBreak([int]7) }
Run-Exp 'pb-docstart' $three { param($d, $s, $log) $s.HomeKey([int]6) | Out-Null; $s.InsertBreak([int]7) }
Run-Exp 'pb-sel' $three { param($d, $s, $log) $s.SetRange([int]13, [int]17); $s.InsertBreak([int]7) }
Run-Exp 'pb-twice' $three { param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.InsertBreak([int]7); $s.InsertBreak([int]7) }
Run-Exp 'pb-empty' { param($d, $s) & $three $d $s; $s.SetRange([int]10, [int]10); $s.TypeParagraph() } { param($d, $s, $log) $s.SetRange([int]11, [int]11); $s.InsertBreak([int]7) }
Run-Exp 'pb-bold' { param($d, $s) & $three $d $s; $d.Paragraphs.Item(2).Range.Font.Bold = -1; $d.Paragraphs.Item(2).Format.SpaceAfter = 18; $d.Paragraphs.Item(2).Style = -2 } { param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.InsertBreak([int]7) }
$table = { param($d, $s) $s.TypeText('Antes'); $s.TypeParagraph(); $t = $d.Tables.Add($s.Range, 3, 2); $t.Cell(1, 1).Range.Text = 'A1'; $t.Cell(2, 1).Range.Text = 'A2 texto'; $t.Cell(3, 1).Range.Text = 'A3' }
Run-Exp 'pb-in-table' $table { param($d, $s, $log) $d.Tables.Item(1).Cell(2, 1).Range.Select(); $s.Collapse(1); $s.MoveRight(1, 2) | Out-Null; $s.InsertBreak([int]7) }
Run-Exp 'pb-in-header' $three { param($d, $s, $log) $h = $d.Sections.Item(1).Headers.Item(1); $h.Range.Text = 'Cabecalho'; $r = $h.Range; $r.Collapse(0); try { $r.InsertBreak([int]7); [void]$log.Add('inseriu') } catch { [void]$log.Add('ERRO ' + $_.Exception.Message) } }
Close-Word

# Segunda leva do oraculo da frente Secoes e colunas (ver sections-oracle.ps1).
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/sections-lab/sections-oracle2.ps1 [-Only a,b]
param([string]$Only = '')
. ([string](Join-Path $PSScriptRoot 'sections-oracle-lib.ps1'))

$three = { param($d, $s) $s.TypeText('Alpha beta'); $s.TypeParagraph(); $s.TypeText('Gamma delta'); $s.TypeParagraph(); $s.TypeText('Epsilon zeta') }
$midBreak = { param($d, $s) & $three $d $s; $s.SetRange([int]17, [int]17); $s.InsertBreak([int]3); $d.Sections.Item(1).PageSetup.TextColumns.SetCount([int]2); $d.Sections.Item(2).PageSetup.LeftMargin = 40 }
Run-Exp 'del-mid-delete' $midBreak { param($d, $s, $log) [void]$log.Add("sec1 end " + $d.Sections.Item(1).Range.End); $s.SetRange([int]17, [int]17); $s.Delete([int]1, [int]1) | Out-Null }
Run-Exp 'del-mid-backspace' $midBreak { param($d, $s, $log) $s.SetRange([int]18, [int]18); $s.TypeBackspace() }
Run-Exp 'del-range' $midBreak { param($d, $s, $log) $s.SetRange([int]14, [int]20); $s.Delete() | Out-Null }
Run-Exp 'enter-before-break' $midBreak { param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.TypeParagraph() }
Run-Exp 'enter-mid-breakpara' $midBreak { param($d, $s, $log) $s.SetRange([int]13, [int]13); $s.TypeParagraph() }
Run-Exp 'orient-asym' $three {
  param($d, $s, $log)
  $ps = $s.PageSetup
  $ps.TopMargin = 50; $ps.RightMargin = 55; $ps.BottomMargin = 60; $ps.LeftMargin = 65
  $ps.Orientation = 1
  [void]$log.Add("land T=$($ps.TopMargin) R=$($ps.RightMargin) B=$($ps.BottomMargin) L=$($ps.LeftMargin)")
  $ps.Orientation = 0
  [void]$log.Add("back T=$($ps.TopMargin) R=$($ps.RightMargin) B=$($ps.BottomMargin) L=$($ps.LeftMargin)")
  $ps.Orientation = 1
}
Run-Exp 'size-letter-land' $three { param($d, $s, $log) $ps = $s.PageSetup; $ps.Orientation = 1; $ps.PaperSize = 2; [void]$log.Add("W=$($ps.PageWidth) H=$($ps.PageHeight) T=$($ps.TopMargin) L=$($ps.LeftMargin)") }
Run-Exp 'cols-limit' $three {
  param($d, $s, $log)
  $tc = $s.PageSetup.TextColumns
  foreach ($k in @(4, 5, 6, 7, 8, 9, 10, 11)) { try { $tc.SetCount([int]$k); [void]$log.Add("set $k -> count=$($tc.Count) width=$($tc.Width) spacing=$($tc.Spacing)") } catch { [void]$log.Add("set $k -> ERRO") } }
}
Run-Exp 'cols-limit-sp0' $three {
  param($d, $s, $log)
  $tc = $s.PageSetup.TextColumns
  $tc.SetCount([int]2); $tc.Spacing = 0
  foreach ($k in @(10, 11, 12, 13, 14, 16, 20)) { try { $tc.SetCount([int]$k); [void]$log.Add("set $k -> count=$($tc.Count) width=$($tc.Width) spacing=$($tc.Spacing)") } catch { [void]$log.Add("set $k -> ERRO") } }
}
$table = { param($d, $s) $s.TypeText('Antes'); $s.TypeParagraph(); $t = $d.Tables.Add($s.Range, 2, 2); $t.Cell(1, 1).Range.Text = 'A1'; $t.Cell(1, 2).Range.Text = 'B1' }
Run-Exp 'sb-in-table' $table { param($d, $s, $log) $d.Tables.Item(1).Cell(1, 2).Range.Select(); $s.Collapse(1); $s.MoveRight(1, 1) | Out-Null; [void]$log.Add("at " + $s.Start + " intable=" + $s.Information(12)); $s.InsertBreak([int]2) }
Run-Exp 'cb-in-table' $table { param($d, $s, $log) $d.Tables.Item(1).Cell(1, 2).Range.Select(); $s.Collapse(1); $s.MoveRight(1, 1) | Out-Null; $s.InsertBreak([int]8) }
Run-Exp 'cols-in-table' $table { param($d, $s, $log) $d.Tables.Item(1).Cell(1, 2).Range.Select(); $s.Collapse(1); $s.PageSetup.TextColumns.SetCount([int]2) }
$sec2Hdr = {
  param($d, $s)
  & $three $d $s
  $d.Sections.Item(1).Headers.Item(1).Range.Text = 'H1'
  $s.SetRange([int]11, [int]11); $s.InsertBreak([int]2)
  $h = $d.Sections.Item(2).Headers.Item(1); $h.LinkToPrevious = 0; $h.Range.Text = 'H2'
}
Run-Exp 'sb-hdr-sec2' $sec2Hdr { param($d, $s, $log) $s.EndKey([int]6) | Out-Null; $s.MoveLeft(1, 3) | Out-Null; $s.InsertBreak([int]3) }
Run-Exp 'sb-titlepg' { param($d, $s) & $three $d $s; $d.Sections.Item(1).PageSetup.DifferentFirstPageHeaderFooter = -1; $d.Sections.Item(1).Headers.Item(2).Range.Text = 'First' } { param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.InsertBreak([int]2) }
Run-Exp 'sb-pgnum' { param($d, $s) & $three $d $s; $d.Sections.Item(1).Footers.Item(1).PageNumbers.RestartNumberingAtSection = -1; $d.Sections.Item(1).Footers.Item(1).PageNumbers.StartingNumber = 5 } { param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.InsertBreak([int]2) }
Close-Word

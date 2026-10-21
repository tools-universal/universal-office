# Oraculo da frente Secoes e colunas: o que o Word grava ao inserir quebras de
# secao/coluna, aplicar colunas e configurar pagina por secao (1a leva; ver
# sections-oracle2/3.ps1). Rodar SEMPRE pela trava global:
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/sections-lab/sections-oracle.ps1 [-Only a,b]
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
param([string]$Only = "")
. ([string](Join-Path $PSScriptRoot "sections-oracle-lib.ps1"))

# texto padrao: 3 paragrafos
$three = { param($d, $s) $s.TypeText('Alpha beta'); $s.TypeParagraph(); $s.TypeText('Gamma delta'); $s.TypeParagraph(); $s.TypeText('Epsilon zeta') }

# --- quebras de secao no meio, no inicio e no fim do paragrafo (tipos 2..5) ---
foreach ($t in @(@(2, 'next'), @(3, 'cont'), @(4, 'even'), @(5, 'odd'))) {
  $code = $t[0]; $tag = $t[1]
  Run-Exp "sb-$tag-mid" $three ({ param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.InsertBreak([int]$code) }.GetNewClosure())
}
Run-Exp 'sb-next-start' $three { param($d, $s, $log) $s.SetRange([int]11, [int]11); $s.InsertBreak([int]2) }
Run-Exp 'sb-next-end' $three { param($d, $s, $log) $s.SetRange([int]10, [int]10); $s.InsertBreak([int]2) }
Run-Exp 'sb-next-docend' $three { param($d, $s, $log) $s.EndKey([int]6) | Out-Null; $s.InsertBreak([int]2) }
Run-Exp 'sb-next-sel' $three { param($d, $s, $log) $s.SetRange([int]13, [int]17); $s.InsertBreak([int]2) }
# duas quebras seguidas (secao vazia)
Run-Exp 'sb-twice' $three { param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.InsertBreak([int]3); $s.InsertBreak([int]3) }

# --- com cabecalho/rodape: onde ficam as referencias ---
$withHdr = {
  param($d, $s)
  & $three $d $s
  $d.Sections.Item(1).Headers.Item(1).Range.Text = 'Cabecalho'
  $d.Sections.Item(1).Footers.Item(1).Range.Text = 'Rodape'
}
Run-Exp 'sb-hdr-next' $withHdr { param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.InsertBreak([int]2) }
Run-Exp 'sb-hdr-cont' $withHdr { param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.InsertBreak([int]3) }

# --- quebra de coluna e de pagina ---
Run-Exp 'cb-mid' $three { param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.InsertBreak([int]8) }
Run-Exp 'cb-start' $three { param($d, $s, $log) $s.SetRange([int]11, [int]11); $s.InsertBreak([int]8) }
Run-Exp 'cb-end' $three { param($d, $s, $log) $s.SetRange([int]10, [int]10); $s.InsertBreak([int]8) }
Run-Exp 'pb-mid' $three { param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.InsertBreak([int]7) }

# --- colunas pelo modelo de objetos ---
Run-Exp 'cols-2' $three { param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.PageSetup.TextColumns.SetCount([int]2); [void]$log.Add("spacing=$($s.PageSetup.TextColumns.Spacing) width=$($s.PageSetup.TextColumns.Width)") }
Run-Exp 'cols-3' $three { param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.PageSetup.TextColumns.SetCount([int]3) }
Run-Exp 'cols-2-line' $three { param($d, $s, $log) $s.SetRange([int]17, [int]17); $s.PageSetup.TextColumns.SetCount([int]2); $s.PageSetup.TextColumns.LineBetween = -1 }
Run-Exp 'cols-uneq' $three {
  param($d, $s, $log)
  $tc = $s.PageSetup.TextColumns
  $tc.SetCount([int]2); $tc.EvenlySpaced = 0
  $tc.Item(1).Width = 120; $tc.Item(1).SpaceAfter = 30
  [void]$log.Add("w1=$($tc.Item(1).Width) w2=$($tc.Item(2).Width) sa1=$($tc.Item(1).SpaceAfter)")
}
Run-Exp 'cols-max' $three {
  param($d, $s, $log)
  $tc = $s.PageSetup.TextColumns
  foreach ($k in @(12, 13, 14, 15, 20, 45)) { try { $tc.SetCount([int]$k); [void]$log.Add("set $k -> count=$($tc.Count) width=$($tc.Width) spacing=$($tc.Spacing)") } catch { [void]$log.Add("set $k -> ERRO $($_.Exception.Message)") } }
}
Run-Exp 'cols-back1' $three { param($d, $s, $log) $tc = $s.PageSetup.TextColumns; $tc.SetCount([int]2); $tc.LineBetween = -1; $tc.SetCount([int]1) }
# selecao parcial: o Word poe quebras em volta?
Run-Exp 'cols-sel' $three { param($d, $s, $log) $s.SetRange([int]13, [int]17); $s.PageSetup.TextColumns.SetCount([int]2) }
Run-Exp 'cols-selpara' $three { param($d, $s, $log) $s.SetRange([int]11, [int]23); $s.PageSetup.TextColumns.SetCount([int]2) }

# --- dialogo Colunas (Execute sem mostrar) ---
# ApplyColsTo: 0 esta secao, 1 deste ponto em diante, 2 secoes selecionadas, 3 texto selecionado, 4 documento inteiro
Run-Exp 'dlg-cols-forward' $three { param($d, $s, $log) $s.SetRange([int]17, [int]17); $g = $word.Dialogs.Item(177); $g.Columns = '2'; $g.ApplyColsTo = 1; $g.Execute() }
Run-Exp 'dlg-cols-forward-newcol' $three { param($d, $s, $log) $s.SetRange([int]17, [int]17); $g = $word.Dialogs.Item(177); $g.Columns = '2'; $g.ApplyColsTo = 1; $g.StartNewCol = 1; $g.Execute() }
Run-Exp 'dlg-cols-seltext' $three { param($d, $s, $log) $s.SetRange([int]13, [int]17); $g = $word.Dialogs.Item(177); $g.Columns = '2'; $g.ApplyColsTo = 3; $g.Execute() }
Run-Exp 'dlg-cols-read' $three {
  param($d, $s, $log)
  $g = $word.Dialogs.Item(177)
  foreach ($k in @('Columns', 'ColumnNo', 'ColumnWidth', 'ColumnSpacing', 'EvenlySpaced', 'ApplyColsTo', 'ColLine', 'StartNewCol')) { try { [void]$log.Add("$k=" + $g.$k) } catch { [void]$log.Add("$k=?") } }
}

# --- configurar pagina por secao ---
$twoSecs = { param($d, $s) & $three $d $s; $s.SetRange([int]11, [int]11); $s.InsertBreak([int]2) }
Run-Exp 'ps-orient-sec2' $twoSecs { param($d, $s, $log) $s.EndKey([int]6) | Out-Null; $s.PageSetup.Orientation = 1 }
Run-Exp 'ps-orient-both' $twoSecs { param($d, $s, $log) $s.WholeStory(); $s.PageSetup.Orientation = 1 }
Run-Exp 'ps-margin-sec1' $twoSecs { param($d, $s, $log) $s.HomeKey([int]6) | Out-Null; $s.PageSetup.LeftMargin = 36 }
Run-Exp 'ps-cols-sec2' $twoSecs { param($d, $s, $log) $s.EndKey([int]6) | Out-Null; $s.PageSetup.TextColumns.SetCount([int]2) }
# dialogo Configurar Pagina: ApplyPropsTo 0 esta secao, 1 deste ponto em diante, 2 secoes selecionadas, 3 texto selecionado, 4 documento inteiro
Run-Exp 'dlg-ps-forward' $three { param($d, $s, $log) $s.SetRange([int]17, [int]17); $g = $word.Dialogs.Item(178); $g.Orientation = 1; $g.ApplyPropsTo = 1; $g.Execute() }
Run-Exp 'dlg-ps-seltext' $three { param($d, $s, $log) $s.SetRange([int]13, [int]17); $g = $word.Dialogs.Item(178); $g.Orientation = 1; $g.ApplyPropsTo = 3; $g.Execute() }
Run-Exp 'dlg-ps-read' $three {
  param($d, $s, $log)
  $g = $word.Dialogs.Item(178)
  foreach ($k in @('ApplyPropsTo', 'Orientation', 'SectionStart', 'TopMargin', 'LeftMargin', 'PageWidth', 'PageHeight')) { try { [void]$log.Add("$k=" + $g.$k) } catch { [void]$log.Add("$k=?") } }
}

# --- apagar a quebra de secao: qual sectPr fica ---
$twoSecsCols = { param($d, $s) & $three $d $s; $s.SetRange([int]11, [int]11); $s.InsertBreak([int]3); $d.Sections.Item(1).PageSetup.TextColumns.SetCount([int]2); $d.Sections.Item(2).PageSetup.LeftMargin = 40 }
Run-Exp 'del-break-delete' $twoSecsCols { param($d, $s, $log) [void]$log.Add("break at " + $d.Sections.Item(1).Range.End); $s.SetRange([int]10, [int]10); $s.Delete([int]1, [int]1) | Out-Null }
Run-Exp 'del-break-backspace' $twoSecsCols { param($d, $s, $log) $p = $d.Sections.Item(2).Range.Start; [void]$log.Add("sec2 start $p"); $s.SetRange([int]$p, [int]$p); $s.TypeBackspace() }

Close-Word

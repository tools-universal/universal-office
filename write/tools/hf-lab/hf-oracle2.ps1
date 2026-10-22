# Oraculo da frente Cabecalho e rodape (lote 2): desligar opcoes preserva as
# partes?, vincular/desvincular sem conteudo, tabulacao de alinhamento,
# navegacao Anterior/Proximo/Ir para, numeros de pagina da galeria (so a
# ESTRUTURA: o conteudo dos blocos de construcao e do Word) e o que
# Remover Numeros de Pagina tira.
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -File hf-oracle2.ps1 [-Only a,b]
param([string]$Only = '')
. (Join-Path $PSScriptRoot 'hf-oracle-lib.ps1')

function WB([string]$cmd) {
  $wb = $word.WordBasic
  [void][System.__ComObject].InvokeMember($cmd, [System.Reflection.BindingFlags]::InvokeMethod, $null, $wb, $null)
}
function Hdr($doc, $sel, [string]$text, [int]$seek = 9) { Seek $doc $seek; $sel.TypeText($text); Seek $doc 0 }
function Sec2($doc, $sel) { $sel.EndKey(6) | Out-Null; $sel.InsertBreak(2); $sel.TypeText('S2') }
function HText($doc, [int]$s, [int]$t, [bool]$hdr = $true) {
  $h = if ($hdr) { $doc.Sections($s).Headers($t) } else { $doc.Sections($s).Footers($t) }
  return ("s$s t$t link=" + $h.LinkToPrevious + " exists=" + $h.Exists + " text=[" + ($h.Range.Text -replace "`r", '\r') + "]")
}
function HfWhere($doc, $sel) {
  $hf = $null; try { $hf = $sel.HeaderFooter } catch { }
  $idx = if ($hf) { $hf.Index } else { '-' }
  $ih = if ($hf) { $hf.IsHeader } else { '-' }
  return "seek=" + $doc.ActiveWindow.ActivePane.View.SeekView + " story=" + $sel.StoryType + " sec=" + $sel.Information(2) + " page=" + $sel.Information(3) + " hfIndex=$idx isHeader=$ih text=[" + ($sel.Paragraphs(1).Range.Text -replace "`r", '\r') + "]"
}

Run-Exp 'f01-evenodd-off-keep' {
  param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab'
  $doc.Sections(1).PageSetup.OddAndEvenPagesHeaderFooter = -1; $doc.Sections(1).Headers(3).Range.Text = 'Par'
} {
  param($doc, $sel, $log) $doc.Sections(1).PageSetup.OddAndEvenPagesHeaderFooter = 0
}
Run-Exp 'f02-titlepg-off-keep' {
  param($doc, $sel) $sel.TypeText('Corpo'); Hdr $doc $sel 'Cab'
  $doc.Sections(1).PageSetup.DifferentFirstPageHeaderFooter = -1; $doc.Sections(1).Headers(2).Range.Text = 'Capa'
} {
  param($doc, $sel, $log) $doc.Sections(1).PageSetup.DifferentFirstPageHeaderFooter = 0
}
Run-Exp 'f03-unlink-empty' { param($doc, $sel) $sel.TypeText('Corpo'); Sec2 $doc $sel } {
  param($doc, $sel, $log) Seek $doc 9; $word.CommandBars.ExecuteMso('HeaderFooterLinkToPrevious'); [void]$log.Add('after: ' + (HfWhere $doc $sel)); Seek $doc 0
}
Run-Exp 'f04-relink-prev-empty' {
  param($doc, $sel) $sel.TypeText('Corpo'); Sec2 $doc $sel
  Seek $doc 9; $word.CommandBars.ExecuteMso('HeaderFooterLinkToPrevious'); $sel.TypeText('So S2'); Seek $doc 0
} {
  param($doc, $sel, $log) $doc.Sections(2).Headers(1).LinkToPrevious = $true
}
Run-Exp 'f05-ptab' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log) Seek $doc 9
  $sel.TypeText('A'); $sel.Range.InsertAlignmentTab(1, 0); $sel.EndKey(5) | Out-Null
  $sel.TypeText('B'); $sel.Range.InsertAlignmentTab(2, 1); $sel.EndKey(5) | Out-Null
  $sel.TypeText('C'); $sel.Range.InsertAlignmentTab(0, 0); $sel.EndKey(5) | Out-Null
  $sel.TypeText('D'); Seek $doc 0
}

# navegacao: 3 secoes (s1 com capa e pares/impares, s2 vinculada, s3 propria)
$navSetup = {
  param($doc, $sel)
  $sel.TypeText('s1 p1'); $sel.InsertBreak(7); $sel.TypeText('s1 p2'); $sel.InsertBreak(7); $sel.TypeText('s1 p3')
  $sel.InsertBreak(2); $sel.TypeText('s2 p1'); $sel.InsertBreak(7); $sel.TypeText('s2 p2')
  $sel.InsertBreak(2); $sel.TypeText('s3 p1'); $sel.InsertBreak(7); $sel.TypeText('s3 p2')
  $doc.Sections(1).PageSetup.DifferentFirstPageHeaderFooter = -1
  $doc.Sections(1).PageSetup.OddAndEvenPagesHeaderFooter = -1
  $doc.Sections(1).Headers(1).Range.Text = 'D1'; $doc.Sections(1).Headers(2).Range.Text = 'C1'; $doc.Sections(1).Headers(3).Range.Text = 'E1'
  $doc.Sections(3).Headers(1).LinkToPrevious = $false; $doc.Sections(3).Headers(1).Range.Text = 'D3'
  $sel.HomeKey(6) | Out-Null
}
Run-Exp 'f06-nav-next' $navSetup {
  param($doc, $sel, $log) Seek $doc 2; [void]$log.Add('start: ' + (HfWhere $doc $sel))
  for ($i = 0; $i -lt 14; $i++) { $word.CommandBars.ExecuteMso('HeaderFooterNextSection'); [void]$log.Add("next$($i): " + (HfWhere $doc $sel)) }
  Seek $doc 0
}
Run-Exp 'f06b-nav-prev' $navSetup {
  param($doc, $sel, $log) $sel.EndKey(6) | Out-Null; Seek $doc 10; [void]$log.Add('start: ' + (HfWhere $doc $sel))
  for ($i = 0; $i -lt 14; $i++) { $word.CommandBars.ExecuteMso('HeaderFooterPreviousSection'); [void]$log.Add("prev$($i): " + (HfWhere $doc $sel)) }
  Seek $doc 0
}
Run-Exp 'f07-goto' $navSetup {
  param($doc, $sel, $log)
  $sel.GoTo(1, 1, 2) | Out-Null; Seek $doc 9; [void]$log.Add('p2 header: ' + (HfWhere $doc $sel))
  $word.CommandBars.ExecuteMso('GoToFooter'); [void]$log.Add('gotoFooter: ' + (HfWhere $doc $sel))
  $word.CommandBars.ExecuteMso('GoToHeader'); [void]$log.Add('gotoHeader: ' + (HfWhere $doc $sel))
  $sel.GoTo(1, 1, 5) | Out-Null; Seek $doc 9; [void]$log.Add('p5 header: ' + (HfWhere $doc $sel))
  $word.CommandBars.ExecuteMso('GoToFooter'); [void]$log.Add('gotoFooter: ' + (HfWhere $doc $sel))
  Seek $doc 0
}

# numeros de pagina da galeria (estrutura) e Remover Numeros de Pagina
$script:structOnly = $true
$word.Templates.LoadBuildingBlocks()
$bbt = $null
foreach ($t in $word.Templates) { try { if ($t.BuildingBlockEntries.Count -gt 50) { $bbt = $t; break } } catch { } }
function BB([int]$type, [int]$k) {
  $ty = $bbt.BuildingBlockTypes.Item($type)
  $n = 0
  for ($c = 1; $c -le $ty.Categories.Count; $c++) {
    $cat = $ty.Categories.Item($c)
    for ($b = 1; $b -le $cat.BuildingBlocks.Count; $b++) { $n++; if ($n -eq $k) { return $cat.BuildingBlocks.Item($b) } }
  }
  return $null
}
foreach ($spec in @(@('g01-bb-pgbottom', 12, 'f'), @('g02-bb-pgtop', 11, 'h'), @('g03-bb-pgmargin', 13, 'h'), @('g04-bb-pgcurrent', 6, 'h'), @('g05-bb-header', 5, 'h'), @('g06-bb-footer', 4, 'f'))) {
  $nm = $spec[0]; $script:bbTy = [int]$spec[1]; $script:bbWhere = $spec[2]
  foreach ($rm in @($false, $true)) {
    $script:bbRm = $rm
    $name = if ($rm) { "$nm-removed" } else { $nm }
    Run-Exp $name { param($doc, $sel) $sel.TypeText('Corpo') } {
      param($doc, $sel, $log)
      $bb = BB $script:bbTy 1
      [void]$log.Add('bb type=' + $script:bbTy + ' behavior=' + $bb.InsertOptions)
      $hf = if ($script:bbWhere -eq 'f') { $doc.Sections(1).Footers(1) } else { $doc.Sections(1).Headers(1) }
      if ($script:bbTy -eq 6) { Seek $doc 9; $sel.TypeText('Antes '); [void]$bb.Insert($sel.Range, $true); Seek $doc 0 }
      else { [void]$bb.Insert($hf.Range, $true) }
      if ($script:bbRm) { WB 'RemovePageNumbers' }
    }
  }
}
Run-Exp 'g07-pgnum-add' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log) [void]$doc.Sections(1).Footers(1).PageNumbers.Add(1, $true)
}
Run-Exp 'g07-pgnum-add-removed' { param($doc, $sel) $sel.TypeText('Corpo') } {
  param($doc, $sel, $log) [void]$doc.Sections(1).Footers(1).PageNumbers.Add(1, $true); WB 'RemovePageNumbers'
}
Close-Word

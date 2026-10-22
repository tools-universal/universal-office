# Oraculo do Indice de Ilustracoes (TOC \c) e do Sumario (TOC \o): o campo
# multi-paragrafo gravado, as entradas (hiperlink + PAGEREF), os _Toc ocultos
# nas legendas/titulos, os estilos e o que muda ao atualizar.
# Uso: node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/refs-lab/toc-oracle.ps1 [-Only a,b]
param([string]$Only)
. ([string](Join-Path $PSScriptRoot 'refs-oracle-lib.ps1'))

$wdStory = 6
$keep = $word.Documents.Add()
function Figs($doc, $sel, [int]$n = 3) {
  $sel.TypeText('Lista:'); $sel.TypeParagraph(); $sel.TypeParagraph()
  $sel.TypeText('Corpo.'); $sel.TypeParagraph()
  for ($i = 1; $i -le $n; $i++) {
    $sel.InlineShapes.AddPicture($png) | Out-Null
    $doc.InlineShapes($i).Select()
    $sel.InsertCaption('Figura', " - Foto $i", '', 1)
    $sel.EndKey($wdStory) | Out-Null
    if ($i -eq 2) { $sel.InsertBreak(7) } else { $sel.TypeParagraph() }
    $sel.Paragraphs(1).Style = -1
  }
  $sel.TypeText('Fim.')
}
function At2($doc) { return $doc.Paragraphs(2).Range }
function Tof($doc, [bool]$label = $true, [bool]$right = $true, [bool]$pages = $true, [bool]$links = $true) {
  return $doc.TablesOfFigures.Add((At2 $doc), 'Figura', $label, $false, 1, 9, $false, '', $right, $pages, '', $links, $true)
}

# (o tof-dialog dos resultados veio de Dialogs(472).Execute(): tirado daqui — um
# Dialogs.Execute de outro dialogo abriu modal invisivel e travou o Word)
Run-Exp 'tof-add' { param($d, $s) Figs $d $s } { param($d, $s, $log) $t = Tof $d; $log.Add("leader=$($t.TabLeader)") | Out-Null }
Run-Exp 'tof-nolabel' { param($d, $s) Figs $d $s } { param($d, $s, $log) Tof $d $false | Out-Null }
Run-Exp 'tof-noright' { param($d, $s) Figs $d $s } { param($d, $s, $log) Tof $d $true $false | Out-Null }
Run-Exp 'tof-nopages' { param($d, $s) Figs $d $s } { param($d, $s, $log) Tof $d $true $true $false | Out-Null }
Run-Exp 'tof-nolinks' { param($d, $s) Figs $d $s } { param($d, $s, $log) Tof $d $true $true $true $false | Out-Null }
foreach ($ld in 0..5) {
  $script:ld = $ld
  Run-Exp "tof-leader$ld" { param($d, $s) Figs $d $s 1 } { param($d, $s, $log) $t = Tof $d; $t.TabLeader = $script:ld; $t.Update() | Out-Null }
}
Run-Exp 'tof-empty' { param($d, $s) $s.TypeText('Lista:'); $s.TypeParagraph(); $s.TypeParagraph(); $s.TypeText('Fim.') } { param($d, $s, $log) Tof $d | Out-Null }
Run-Exp 'tof-update' { param($d, $s) Figs $d $s 2 } { param($d, $s, $log)
  Tof $d | Out-Null
  $s.EndKey($wdStory) | Out-Null; $s.TypeParagraph(); $s.InlineShapes.AddPicture($png) | Out-Null
  $d.InlineShapes(3).Select(); $s.InsertCaption('Figura', ' - Nova', '', 1)
  $r = $d.Paragraphs(4).Range; $log.Add('p4=[' + (Esc $r.Text) + ']') | Out-Null
  Log-All $d $log 'pre'
  $d.TablesOfFigures(1).Update() | Out-Null
}
Run-Exp 'tof-update-pages' { param($d, $s) Figs $d $s 2 } { param($d, $s, $log)
  Tof $d | Out-Null
  $d.TablesOfFigures(1).UpdatePageNumbers() | Out-Null
}
# no meio de paragrafo com texto (o campo divide o paragrafo?)
Run-Exp 'tof-midtext' { param($d, $s) $s.TypeText('Antes depois.'); $s.TypeParagraph(); $s.InlineShapes.AddPicture($png) | Out-Null; $d.InlineShapes(1).Select(); $s.InsertCaption('Figura', '', '', 1) } { param($d, $s, $log)
  $d.TablesOfFigures.Add($d.Range(6, 6), 'Figura', $true) | Out-Null
}
# formatos do dialogo
foreach ($f in 0..5) {
  $script:fm = $f
  Run-Exp "tof-format$f" { param($d, $s) Figs $d $s 1 } { param($d, $s, $log) $d.TablesOfFigures.Format = $script:fm; Tof $d | Out-Null; $log.Add("format=$($d.TablesOfFigures.Format)") | Out-Null }
}
# sumario
function Heads($doc, $sel) {
  $sel.TypeText('Sumario:'); $sel.TypeParagraph(); $sel.TypeParagraph()
  foreach ($h in @(@('Um', -2), @('Um ponto um', -3), @('Dois', -2), @('Fundo', -4))) {
    $sel.TypeText($h[0]); $sel.Paragraphs(1).Style = [int]$h[1]; $sel.TypeParagraph(); $sel.Paragraphs(1).Style = -1
    $sel.TypeText('Texto.'); $sel.TypeParagraph()
  }
}
Run-Exp 'toc-add' { param($d, $s) Heads $d $s } { param($d, $s, $log) $d.TablesOfContents.Add((At2 $d)) | Out-Null }
Run-Exp 'toc-add-def' { param($d, $s) Heads $d $s } { param($d, $s, $log) $d.TablesOfContents.Add((At2 $d), $true, 1, 3, $false, '', $true, $true, '', $true, $true, $true) | Out-Null }
Run-Exp 'toc-update' { param($d, $s) Heads $d $s } { param($d, $s, $log)
  $d.TablesOfContents.Add((At2 $d), $true, 1, 3, $false, '', $true, $true, '', $true, $true, $true) | Out-Null
  $s.EndKey($wdStory) | Out-Null; $s.TypeText('Tres'); $s.Paragraphs(1).Style = -2
  $d.TablesOfContents(1).Update() | Out-Null
}
$keep.Close(0)
Close-Word

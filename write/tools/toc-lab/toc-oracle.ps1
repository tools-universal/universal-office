# Oraculo da frente Sumario: galeria (blocos de construcao do tipo Sumario, so
# para MEDIR a estrutura gravada), opcoes do dialogo Sumario Personalizado
# (niveis, numeros, alinhamento, preenchimento, hiperlinks, formatos, estilos,
# niveis de topico, campos TC), atualizar (so numeros x inteiro) e remover.
# Uso: node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/toc-lab/toc-oracle.ps1 [-Only a,b]
param([string]$Only)
. ([string](Join-Path $PSScriptRoot 'toc-oracle-lib.ps1'))

$wdStory = 6
$keep = $word.Documents.Add()

# documento com titulos 1-4 e uma quebra de pagina antes de "Dois"
function Heads($doc, $sel) {
  $sel.TypeText('Inicio:'); $sel.TypeParagraph(); $sel.TypeParagraph()
  foreach ($h in @(@('Um', -2), @('Um ponto um', -3), @('Um ponto um ponto um', -4), @('Nivel quatro', -5), @('Dois', -2))) {
    if ($h[0] -eq 'Dois') { $sel.InsertBreak(7) }
    $sel.TypeText($h[0]); $sel.Paragraphs(1).Style = [int]$h[1]; $sel.TypeParagraph(); $sel.Paragraphs(1).Style = -1
    $sel.TypeText('Texto.'); $sel.TypeParagraph()
  }
  $sel.TypeText('Fim.')
}
function At2($doc) { return $doc.Paragraphs(2).Range }
function Toc($doc, [int]$lower = 3, [bool]$right = $true, [bool]$pages = $true, [bool]$links = $true, [bool]$heads = $true, [bool]$fields = $false, [string]$id = '', [bool]$outline = $true) {
  return $doc.TablesOfContents.Add((At2 $doc), $heads, 1, $lower, $fields, $id, $right, $pages, '', $links, $true, $outline)
}

# ---- galeria (blocos do Word: so a estrutura; nada disso vai para o repositorio)
Run-Exp 'bb-list' { param($d, $s) } { param($d, $s, $log)
  $k = 0
  foreach ($b in (BB-List)) { $k++; $log.Add("bb$k name=[$($b.Name)] cat=[$($b.Category.Name)] desc=[$($b.Description)] insert=$($b.InsertOptions)") | Out-Null }
}
foreach ($k in 1..3) {
  $script:bbk = $k
  Run-Exp "bb-$k" { param($d, $s) Heads $d $s } { param($d, $s, $log) $b = (BB-List)[$script:bbk - 1]; $log.Add("bb=[$($b.Name)]") | Out-Null; $b.Insert((At2 $d), $true) | Out-Null }
  Run-Exp "bb-$k-empty" { param($d, $s) $s.TypeText('Sem titulos.') } { param($d, $s, $log) $b = (BB-List)[$script:bbk - 1]; $s.EndKey($wdStory) | Out-Null; $s.TypeParagraph(); $b.Insert($s.Range, $true) | Out-Null }
}
# no meio de um paragrafo com texto
Run-Exp 'bb-2-midtext' { param($d, $s) Heads $d $s } { param($d, $s, $log) $b = (BB-List)[1]; $r = $d.Paragraphs(1).Range; $r.SetRange($r.Start + 3, $r.Start + 3); $b.Insert($r, $true) | Out-Null }
# segundo bloco com um sumario ja inserido (substitui?)
Run-Exp 'bb-replace' { param($d, $s) Heads $d $s } { param($d, $s, $log)
  $l = BB-List
  $l[0].Insert((At2 $d), $true) | Out-Null
  Log-All $d $log 'pre'
  $s.EndKey($wdStory) | Out-Null; $s.TypeParagraph()
  $l[1].Insert($s.Range, $true) | Out-Null
}
# atualizar dentro do controle: so numeros (com entrada editada a mao) e inteiro
function EditEntry($doc) { foreach ($f in $doc.TablesOfContents(1).Range.Fields) { if ($f.Type -eq 88) { $f.Result.InsertBefore('X'); break } } }
function BreakBefore3($doc) { foreach ($p in $doc.Paragraphs) { if ($p.OutlineLevel -eq 3) { $r = $p.Range; $r.Collapse(1); $r.InsertBreak(7); break } } }
function NewHead($doc, $sel) { $sel.EndKey($wdStory) | Out-Null; $sel.TypeParagraph(); $sel.TypeText('Tres'); $sel.Paragraphs(1).Style = -2 }
Run-Exp 'bb-update-pages' { param($d, $s) Heads $d $s } { param($d, $s, $log)
  (BB-List)[1].Insert((At2 $d), $true) | Out-Null
  EditEntry $d; NewHead $d $s; BreakBefore3 $d
  Log-All $d $log 'pre'
  $d.TablesOfContents(1).UpdatePageNumbers() | Out-Null
}
Run-Exp 'bb-update-all' { param($d, $s) Heads $d $s } { param($d, $s, $log)
  (BB-List)[1].Insert((At2 $d), $true) | Out-Null
  EditEntry $d; NewHead $d $s; BreakBefore3 $d
  $d.TablesOfContents(1).Update() | Out-Null
}
Run-Exp 'bb-update-lead' { param($d, $s) Heads $d $s } { param($d, $s, $log)
  (BB-List)[1].Insert((At2 $d), $true) | Out-Null
  $t = $d.TablesOfContents(1)
  $r = $t.Range.Paragraphs(1).Range; $r.SetRange($r.Start, $r.Start); $r.InsertAfter('X')
  $d.TablesOfContents(1).Update() | Out-Null
}
Run-Exp 'bb-delete' { param($d, $s) Heads $d $s } { param($d, $s, $log)
  (BB-List)[1].Insert((At2 $d), $true) | Out-Null
  $d.TablesOfContents(1).Delete()
}
Run-Exp 'toc-update-pages' { param($d, $s) Heads $d $s } { param($d, $s, $log)
  Toc $d | Out-Null
  EditEntry $d; NewHead $d $s; BreakBefore3 $d
  Log-All $d $log 'pre'
  $d.TablesOfContents(1).UpdatePageNumbers() | Out-Null
}
Run-Exp 'toc-update-all' { param($d, $s) Heads $d $s } { param($d, $s, $log)
  Toc $d | Out-Null
  EditEntry $d; NewHead $d $s; BreakBefore3 $d
  $d.TablesOfContents(1).Update() | Out-Null
}

# ---- opcoes do dialogo
Run-Exp 'toc-levels5' { param($d, $s) Heads $d $s } { param($d, $s, $log) Toc $d 5 | Out-Null }
Run-Exp 'toc-levels1' { param($d, $s) Heads $d $s } { param($d, $s, $log) Toc $d 1 | Out-Null }
Run-Exp 'toc-noright' { param($d, $s) Heads $d $s } { param($d, $s, $log) Toc $d 3 $false | Out-Null }
Run-Exp 'toc-nopages' { param($d, $s) Heads $d $s } { param($d, $s, $log) Toc $d 3 $true $false | Out-Null }
Run-Exp 'toc-nolinks' { param($d, $s) Heads $d $s } { param($d, $s, $log) Toc $d 3 $true $true $false | Out-Null }
foreach ($ld in 0..5) {
  $script:ld = $ld
  Run-Exp "toc-leader$ld" { param($d, $s) Heads $d $s } { param($d, $s, $log) $t = Toc $d; $t.TabLeader = $script:ld; $t.Update() | Out-Null }
}
function HeadsAll($doc, $sel) {
  $sel.TypeText('Inicio:'); $sel.TypeParagraph(); $sel.TypeParagraph()
  foreach ($k in 1..9) { $sel.TypeText("Nivel $k"); $sel.Paragraphs(1).Style = [int](-1 - $k); $sel.TypeParagraph(); $sel.Paragraphs(1).Style = -1 }
  $sel.TypeText('Fim.')
}
foreach ($f in 0..6) {
  $script:fm = $f
  Run-Exp "toc-format$f" { param($d, $s) HeadsAll $d $s } { param($d, $s, $log) $d.TablesOfContents.Format = $script:fm; Toc $d 9 | Out-Null; $log.Add("format=$($d.TablesOfContents.Format)") | Out-Null }
}
# estilos (\t): Titulo no nivel 1 junto com os titulos; so estilos; so niveis de topico
function TitleDoc($doc, $sel) {
  $sel.TypeText('Capa'); $sel.Paragraphs(1).Style = -63; $sel.TypeParagraph(); $sel.Paragraphs(1).Style = -1
  $sel.TypeParagraph()
  $sel.TypeText('Sub'); $sel.Paragraphs(1).Style = -75; $sel.TypeParagraph(); $sel.Paragraphs(1).Style = -1
  $sel.TypeText('Um'); $sel.Paragraphs(1).Style = -2; $sel.TypeParagraph(); $sel.Paragraphs(1).Style = -1
  $sel.TypeText('Direto nivel 2'); $sel.Paragraphs(1).OutlineLevel = 2; $sel.TypeParagraph(); $sel.Paragraphs(1).OutlineLevel = 10
  $sel.TypeText('Fim.')
}
Run-Exp 'toc-styles' { param($d, $s) TitleDoc $d $s } { param($d, $s, $log)
  $t = Toc $d; $t.HeadingStyles.Add(-63, 1) | Out-Null; $t.HeadingStyles.Add(-75, 2) | Out-Null; $t.Update() | Out-Null
  foreach ($hs in $t.HeadingStyles) { $log.Add("hs [$($hs.Style)] $($hs.Level)") | Out-Null }
}
Run-Exp 'toc-styles-only' { param($d, $s) TitleDoc $d $s } { param($d, $s, $log)
  $t = Toc $d 3 $true $true $true $false $false '' $false; $t.HeadingStyles.Add(-63, 1) | Out-Null; $t.Update() | Out-Null
}
Run-Exp 'toc-outline-only' { param($d, $s) TitleDoc $d $s } { param($d, $s, $log) Toc $d 3 $true $true $true $false $false '' $true | Out-Null }
Run-Exp 'toc-heads-nooutline' { param($d, $s) TitleDoc $d $s } { param($d, $s, $log) Toc $d 3 $true $true $true $true $false '' $false | Out-Null }

# ---- campos TC
function TcDoc($doc, $sel) {
  $sel.TypeText('Inicio:'); $sel.TypeParagraph(); $sel.TypeParagraph()
  $sel.TypeText('Um'); $sel.Paragraphs(1).Style = -2; $sel.TypeParagraph(); $sel.Paragraphs(1).Style = -1
  $sel.TypeText('Paragrafo com entrada.'); $sel.TypeParagraph()
  $sel.TypeText('Outro paragrafo.'); $sel.TypeParagraph()
  $sel.TypeText('Fim.')
}
Run-Exp 'tc-mark' { param($d, $s) TcDoc $d $s } { param($d, $s, $log)
  $r = $d.Paragraphs(4).Range; $r.SetRange($r.End - 1, $r.End - 1)
  $f = $d.TablesOfContents.MarkEntry($r, 'Entrada TC', '', '', 2)
  $log.Add("tc code=[$(Esc $f.Code.Text)] showCodes=$($f.ShowCodes) hidden=$($f.Code.Font.Hidden)") | Out-Null
}
Run-Exp 'tc-mark-sel' { param($d, $s) TcDoc $d $s } { param($d, $s, $log)
  $r = $d.Paragraphs(4).Range; $r.SetRange($r.Start, $r.Start + 9)
  $f = $d.TablesOfContents.MarkEntry($r, 'Paragrafo', '', 'x', 1)
  $log.Add("tc code=[$(Esc $f.Code.Text)]") | Out-Null
}
Run-Exp 'toc-fields' { param($d, $s) TcDoc $d $s } { param($d, $s, $log)
  $r = $d.Paragraphs(4).Range; $r.SetRange($r.End - 1, $r.End - 1); $d.TablesOfContents.MarkEntry($r, 'Entrada TC', '', '', 2) | Out-Null
  $r = $d.Paragraphs(5).Range; $r.SetRange($r.End - 1, $r.End - 1); $d.TablesOfContents.MarkEntry($r, 'Entrada X', '', 'x', 1) | Out-Null
  Toc $d 3 $true $true $true $true $true | Out-Null
}
Run-Exp 'toc-fields-id' { param($d, $s) TcDoc $d $s } { param($d, $s, $log)
  $r = $d.Paragraphs(4).Range; $r.SetRange($r.End - 1, $r.End - 1); $d.TablesOfContents.MarkEntry($r, 'Entrada TC', '', '', 2) | Out-Null
  $r = $d.Paragraphs(5).Range; $r.SetRange($r.End - 1, $r.End - 1); $d.TablesOfContents.MarkEntry($r, 'Entrada X', '', 'x', 1) | Out-Null
  Toc $d 3 $true $true $true $false $true 'x' $false | Out-Null
}
# \l e \n com intervalo, direto no campo
function FieldToc($doc, [string]$code) {
  $f = $doc.Fields.Add((At2 $doc), -1, $code, $false)
  $f.Update() | Out-Null
}
Run-Exp 'toc-f-l' { param($d, $s) TcDoc $d $s } { param($d, $s, $log)
  foreach ($k in 1..3) { $r = $d.Paragraphs(4).Range; $r.SetRange($r.End - 1, $r.End - 1); $d.TablesOfContents.MarkEntry($r, "Nivel $k", '', '', $k) | Out-Null }
  FieldToc $d 'TOC \f \l "1-2" \h \z'
}
Run-Exp 'toc-n-range' { param($d, $s) Heads $d $s } { param($d, $s, $log) FieldToc $d 'TOC \o "1-3" \n "2-3" \h \z \u' }
Run-Exp 'toc-tc-n' { param($d, $s) TcDoc $d $s } { param($d, $s, $log)
  $r = $d.Paragraphs(4).Range; $r.SetRange($r.End - 1, $r.End - 1); $d.Fields.Add($r, -1, 'TC "Sem pagina" \n \l 1', $false) | Out-Null
  FieldToc $d 'TOC \o "1-3" \f \h \z \u'
}

# ---- comandos internos (KeyBinding.Execute): Remover Sumario no bloco
function Try-Cmd($doc, [string]$name, $log) {
  $word.CustomizationContext = $doc
  try {
    $kb = $word.KeyBindings.Add(1, $name, 1024 + 256 + 122)
    $log.Add("cmd $name existe") | Out-Null
    $kb.Execute()
    $log.Add("cmd $name executado") | Out-Null
    $kb.Clear()
    return $true
  } catch { $log.Add("cmd $name : $($_.Exception.Message)") | Out-Null; return $false }
}
Run-Exp 'cmd-remove' { param($d, $s) Heads $d $s } { param($d, $s, $log)
  (BB-List)[1].Insert((At2 $d), $true) | Out-Null
  $d.Paragraphs(4).Range.Select()
  foreach ($n in @('RemoveTableOfContents', 'TableOfContentsRemove', 'TOCRemove', 'RemoveTOC')) { if (Try-Cmd $d $n $log) { break } }
}
Run-Exp 'cmd-remove-plain' { param($d, $s) Heads $d $s } { param($d, $s, $log)
  Toc $d | Out-Null
  $d.Paragraphs(3).Range.Select()
  foreach ($n in @('RemoveTableOfContents', 'TableOfContentsRemove', 'TOCRemove', 'RemoveTOC')) { if (Try-Cmd $d $n $log) { break } }
}

$keep.Close(0)
Close-Word

# Oraculo complementar: hiperlinks (URL, dica de tela, indicador, inicio do
# documento, e-mail, remover), casos de borda dos indicadores ao apagar/Enter,
# indice/sumario inseridos com o cursor (intervalo vazio) e a referencia
# cruzada "texto + acima/abaixo" pelo dialogo.
# Uso: node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/refs-lab/misc-oracle.ps1 [-Only a,b]
param([string]$Only)
. ([string](Join-Path $PSScriptRoot 'refs-oracle-lib.ps1'))

$wdStory = 6
$keep = $word.Documents.Add()
$INTRO = "Introdu$cc$at" + 'o'
function Base($doc, $sel) { $sel.TypeText('Alfa beta gama.') }
function Bm($doc, [string]$name, [int]$a, [int]$b) { $doc.Bookmarks.Add($name, $doc.Range($a, $b)) | Out-Null }
function HDoc($doc, $sel) {
  $sel.TypeText($INTRO); $sel.Paragraphs(1).Style = -2; $sel.TypeParagraph(); $sel.Paragraphs(1).Style = -1
  $sel.TypeText('Alfa beta gama.'); $sel.TypeParagraph()
  $sel.TypeText('Destino aqui.'); $p = $sel.Paragraphs(1).Range; $doc.Bookmarks.Add('destino', $doc.Range($p.Start, $p.Start + 7)) | Out-Null
}
$B0 = 11

# hiperlinks
Run-Exp 'hl-url' { param($d, $s) HDoc $d $s } { param($d, $s, $log) $d.Hyperlinks.Add($d.Range($B0 + 5, $B0 + 9), 'https://exemplo.com/a?b=1&c=2', '', 'Dica de tela', 'beta') | Out-Null }
Run-Exp 'hl-url-new' { param($d, $s) HDoc $d $s } { param($d, $s, $log) $d.Hyperlinks.Add($d.Range($B0 + 15, $B0 + 15), 'https://exemplo.com/', '', '', ' texto novo') | Out-Null; $log.Add('after: ' + (Sel-Info $s)) | Out-Null }
Run-Exp 'hl-url-same' { param($d, $s) HDoc $d $s } { param($d, $s, $log) $d.Hyperlinks.Add($d.Range($B0, $B0 + 4), 'https://exemplo.com/') | Out-Null; $d.Hyperlinks.Add($d.Range($B0 + 10, $B0 + 14), 'https://exemplo.com/') | Out-Null }
Run-Exp 'hl-bm' { param($d, $s) HDoc $d $s } { param($d, $s, $log) $d.Hyperlinks.Add($d.Range($B0 + 5, $B0 + 9), '', 'destino', 'Vai ao destino') | Out-Null }
Run-Exp 'hl-top' { param($d, $s) HDoc $d $s } { param($d, $s, $log) $d.Hyperlinks.Add($d.Range($B0 + 5, $B0 + 9), '', '_top') | Out-Null }
Run-Exp 'hl-mail' { param($d, $s) HDoc $d $s } { param($d, $s, $log) $d.Hyperlinks.Add($d.Range($B0 + 5, $B0 + 9), 'mailto:alguem@exemplo.com?subject=Assunto%20aqui') | Out-Null }
Run-Exp 'hl-remove' { param($d, $s) HDoc $d $s; $d.Hyperlinks.Add($d.Range($B0 + 5, $B0 + 9), 'https://exemplo.com/') | Out-Null } { param($d, $s, $log) $d.Hyperlinks(1).Delete() }
Run-Exp 'hl-edit' { param($d, $s) HDoc $d $s; $d.Hyperlinks.Add($d.Range($B0 + 5, $B0 + 9), 'https://exemplo.com/') | Out-Null } { param($d, $s, $log) $h = $d.Hyperlinks(1); $h.Address = 'https://outro.com/'; $h.ScreenTip = 'nova dica' }
# (Dialogs(925).Execute() abre o dialogo de hiperlink MODAL e invisivel: trava o
# Word e a trava global. Nada de Dialogs.Execute/ExecuteMso neste lab.)
# indicadores: apagar/Enter nas bordas
Run-Exp 'bm-del-point-start' { param($d, $s) Base $d $s; Bm $d 'p' 5 5 } { param($d, $s, $log) $s.SetRange(5, 6); $s.Delete() | Out-Null; $log.Add("exists=$($d.Bookmarks.Exists('p'))") | Out-Null }
Run-Exp 'bm-del-point-end' { param($d, $s) Base $d $s; Bm $d 'p' 5 5 } { param($d, $s, $log) $s.SetRange(3, 5); $s.Delete() | Out-Null; $log.Add("exists=$($d.Bookmarks.Exists('p'))") | Out-Null }
Run-Exp 'bm-del-cover-start' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $s.SetRange(5, 10); $s.Delete() | Out-Null; $log.Add("exists=$($d.Bookmarks.Exists('m'))") | Out-Null }
Run-Exp 'bm-del-cover-end' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $s.SetRange(4, 9); $s.Delete() | Out-Null; $log.Add("exists=$($d.Bookmarks.Exists('m'))") | Out-Null }
Run-Exp 'bm-del-tail' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $s.SetRange(7, 11); $s.Delete() | Out-Null }
Run-Exp 'bm-bksp-all' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $s.SetRange(9, 9); foreach ($i in 1..4) { $s.TypeBackspace() }; $log.Add("exists=$($d.Bookmarks.Exists('m'))") | Out-Null }
Run-Exp 'bm-enter-start' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $s.SetRange(5, 5); $s.TypeParagraph() }
Run-Exp 'bm-enter-end' { param($d, $s) Base $d $s; Bm $d 'm' 5 9 } { param($d, $s, $log) $s.SetRange(9, 9); $s.TypeParagraph() }
Run-Exp 'bm-enter-point' { param($d, $s) Base $d $s; Bm $d 'p' 5 5 } { param($d, $s, $log) $s.SetRange(5, 5); $s.TypeParagraph() }
# indice/sumario com o cursor num paragrafo vazio e no fim de um paragrafo com texto
function Figs($doc, $sel) {
  $sel.TypeText('Lista:'); $sel.TypeParagraph(); $sel.TypeParagraph(); $sel.TypeText('Corpo.'); $sel.TypeParagraph()
  $sel.TypeText('Um'); $sel.Paragraphs(1).Style = -2; $sel.TypeParagraph(); $sel.Paragraphs(1).Style = -1
  $sel.InlineShapes.AddPicture($png) | Out-Null; $doc.InlineShapes(1).Select(); $sel.InsertCaption('Figura', ' - Foto', '', 1)
}
Run-Exp 'tof-cursor-empty' { param($d, $s) Figs $d $s } { param($d, $s, $log) $s.SetRange(7, 7); $d.TablesOfFigures.Add($s.Range, 'Figura', $true) | Out-Null; $log.Add('after: ' + (Sel-Info $s)) | Out-Null }
Run-Exp 'tof-cursor-end' { param($d, $s) Figs $d $s } { param($d, $s, $log) $s.SetRange(6, 6); $d.TablesOfFigures.Add($s.Range, 'Figura', $true) | Out-Null; $log.Add('after: ' + (Sel-Info $s)) | Out-Null }
Run-Exp 'toc-cursor-empty' { param($d, $s) Figs $d $s } { param($d, $s, $log) $s.SetRange(7, 7); $d.TablesOfContents.Add($s.Range) | Out-Null; $log.Add('after: ' + (Sel-Info $s)) | Out-Null }
$keep.Close(0)
Close-Word

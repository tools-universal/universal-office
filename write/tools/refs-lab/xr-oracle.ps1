# Oraculo da Referencia Cruzada: InsertCrossReference para cada tipo/forma,
# o indicador _Ref criado no destino, o campo gravado (REF/PAGEREF/NOTEREF e
# chaves) e o resultado. Tambem as listas do dialogo (GetCrossReferenceItems)
# e mais deletar/apagar indicadores.
# Uso: node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/refs-lab/xr-oracle.ps1 [-Only a,b]
param([string]$Only)
. ([string](Join-Path $PSScriptRoot 'refs-oracle-lib.ps1'))

$wdStory = 6
$INTRO = "Introdu$cc$at" + 'o'
function Para($sel, [string]$text, [int]$style = 0) {
  $sel.TypeText($text)
  if ($style -ne 0) { $sel.Paragraphs(1).Style = $style }
  $sel.TypeParagraph()
  $sel.Paragraphs(1).Style = -1
}
# documento com titulos, lista, notas, figura com legenda e indicador
function Doc1($doc, $sel) {
  Para $sel $INTRO -2
  Para $sel 'Texto do corpo.' 0
  Para $sel 'Detalhes' -3
  $sel.TypeText('Primeiro item'); $sel.Range.ListFormat.ApplyNumberDefault(); $sel.TypeParagraph()
  $sel.TypeText('Segundo item'); $sel.TypeParagraph()
  $sel.Range.ListFormat.ListIndent(); $sel.TypeText('Subitem'); $sel.TypeParagraph()
  $sel.Range.ListFormat.RemoveNumbers()
  $sel.TypeText('Nota aqui.')
  $doc.Footnotes.Add($sel.Range, [Type]::Missing, 'nota de rodape') | Out-Null
  $doc.Endnotes.Add($sel.Range, [Type]::Missing, 'nota de fim') | Out-Null
  $sel.EndKey($wdStory) | Out-Null
  $sel.TypeParagraph()
  $sel.InlineShapes.AddPicture($png) | Out-Null
  $doc.InlineShapes(1).Select()
  $sel.InsertCaption('Figura', ' - Grafico', '', 1)
  $sel.EndKey($wdStory) | Out-Null
  $sel.TypeParagraph()
  $sel.Paragraphs(1).Style = -1
  $sel.Font.Bold = $true; $sel.TypeText('Destino'); $sel.Font.Bold = $false; $sel.TypeText(' marcado')
  $p = $sel.Paragraphs(1).Range
  $doc.Bookmarks.Add('destino', $p.Document.Range($p.Start, $p.End - 1)) | Out-Null
  $sel.TypeParagraph()
  $sel.TypeText('Ref: ')
}

function Xr([string]$name, $type, [int]$kind, $item, [bool]$link = $true, [bool]$pos = $false, [bool]$sep = $false, [string]$sepStr = '') {
  $script:xa = @($type, $kind, $item, $link, $pos, $sep, $sepStr)
  Run-Exp $name { param($d, $s) Doc1 $d $s } { param($d, $s, $log)
    $a = $script:xa
    $s.EndKey($wdStory) | Out-Null
    $s.InsertCrossReference($a[0], $a[1], $a[2], $a[3], $a[4], $a[5], $a[6])
    Log-All $d $log 'ins'
    $d.Fields.Update() | Out-Null
  }
}

# listas do dialogo
Run-Exp 'xr-items' { param($d, $s) Doc1 $d $s } { param($d, $s, $log)
  foreach ($t in @(0, 1, 2, 3, 4, 'Figura', 'Tabela', $EQ)) {
    $items = $d.GetCrossReferenceItems($t)
    $log.Add("type $t : " + (($items | ForEach-Object { '[' + (Esc $_) + ']' }) -join ' ')) | Out-Null
  }
}
# titulo
Xr 'xr-h-text' 1 -1 1
Xr 'xr-h-text-nolink' 1 -1 1 $false
Xr 'xr-h-page' 1 7 1
Xr 'xr-h-num-rel' 1 -2 1
Xr 'xr-h-num-no' 1 -3 1
Xr 'xr-h-num-full' 1 -4 1
Xr 'xr-h-pos' 1 15 1
Xr 'xr-h-text-pos' 1 -1 1 $true $true
Xr 'xr-h2-text' 1 -1 2
# item numerado
Xr 'xr-n-text' 0 -1 1
Xr 'xr-n-rel' 0 -2 3
Xr 'xr-n-no' 0 -3 3
Xr 'xr-n-full' 0 -4 3
Xr 'xr-n-full-sep' 0 -4 3 $true $false $true '-'
Xr 'xr-n-page' 0 7 2
Xr 'xr-n-pos' 0 15 2
# indicador
Xr 'xr-b-text' 2 -1 'destino'
Xr 'xr-b-page' 2 7 'destino'
Xr 'xr-b-num' 2 -2 'destino'
Xr 'xr-b-pos' 2 15 'destino'
# notas
Xr 'xr-fn-num' 3 5 1
Xr 'xr-fn-fmt' 3 16 1
Xr 'xr-fn-page' 3 7 1
Xr 'xr-fn-pos' 3 15 1
Xr 'xr-en-num' 4 6 1
Xr 'xr-en-fmt' 4 17 1
# legenda
Xr 'xr-cap-entire' 'Figura' 2 1
Xr 'xr-cap-label' 'Figura' 3 1
Xr 'xr-cap-text' 'Figura' 4 1
Xr 'xr-cap-page' 'Figura' 7 1
Xr 'xr-cap-pos' 'Figura' 15 1
# duas referencias ao mesmo titulo: o mesmo _Ref?
Run-Exp 'xr-h-twice' { param($d, $s) Doc1 $d $s } { param($d, $s, $log)
  $s.EndKey($wdStory) | Out-Null
  $s.InsertCrossReference(1, -1, 1, $true, $false, $false, '')
  $s.TypeText(' e ')
  $s.InsertCrossReference(1, 7, 1, $true, $false, $false, '')
}
# referencia ANTES do destino (abaixo)
Run-Exp 'xr-before' { param($d, $s) Doc1 $d $s } { param($d, $s, $log)
  $s.HomeKey($wdStory) | Out-Null
  $s.MoveDown(5, 1) | Out-Null
  $s.InsertCrossReference(2, 15, 'destino', $true, $false, $false, '')
  $s.TypeText(' / ')
  $s.InsertCrossReference(2, -1, 'destino', $true, $true, $false, '')
  $d.Fields.Update() | Out-Null
}
# mudar o titulo e atualizar
Run-Exp 'xr-update' { param($d, $s) Doc1 $d $s; $s.EndKey($wdStory) | Out-Null; $s.InsertCrossReference(1, -1, 1, $true, $false, $false, ''); $s.TypeText(' | '); $s.InsertCrossReference(2, -1, 'destino', $true, $false, $false, '') } { param($d, $s, $log)
  $r = $d.Paragraphs(1).Range
  $d.Range($r.Start, $r.Start).InsertAfter('Nova ')
  $d.Bookmarks.Item('destino').Range.InsertAfter(' extra')
  Log-All $d $log 'before'
  $d.Fields.Update() | Out-Null
}
Close-Word

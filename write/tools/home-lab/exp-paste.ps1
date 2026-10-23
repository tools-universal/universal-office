# Experimentos de COLAR (Area de Transferencia): o XML que o Word grava com cada opcao de
# colagem (PasteAndFormat: Manter Formatacao Original 16, Mesclar 20, Manter Somente Texto
# 22, padrao 0, Usar Estilos de Destino 19; listas 7/8/24/25), Colar Especial (RTF, texto,
# HTML, imagem) e Colar Vinculo. Usa a area de transferencia do Windows (o texto que havia
# volta no fim de cada experimento). Carregado por home-oracle.ps1. ASCII puro.
Add-Type -AssemblyName System.Windows.Forms

function Clip-Save { try { $script:CLIP = [System.Windows.Forms.Clipboard]::GetText() } catch { $script:CLIP = '' } }
function Clip-Restore {
  try { if ($script:CLIP) { [System.Windows.Forms.Clipboard]::SetText($script:CLIP) } else { [System.Windows.Forms.Clipboard]::Clear() } } catch {}
}

# origem e destino no mesmo documento: Titulo 1 / Georgia 14 vermelho com uma palavra em
# negrito / "Destino:" e um paragrafo vazio, os dois em Verdana 10
function Base-Same($doc) {
  $doc.Content.Text = "Titulo origem`rTexto negrito fim`rDestino:`r"
  $doc.Paragraphs.Item(1).Style = -2
  $r2 = $doc.Paragraphs.Item(2).Range
  $r2.Font.Name = 'Georgia'; $r2.Font.Size = 14; $r2.Font.Color = 255
  $doc.Range($r2.Start + 6, $r2.Start + 13).Font.Bold = $true
  foreach ($k in 3, 4) { $r = $doc.Paragraphs.Item($k).Range; $r.Font.Name = 'Verdana'; $r.Font.Size = 10 }
}

function Paste-At($app, $range, [int]$how) {
  $range.Select()
  if ($how -ge 0) { $app.Selection.PasteAndFormat($how) } else { $app.Selection.Paste() }
}

function End-Of-Para($doc, [int]$k) { $r = $doc.Paragraphs.Item($k).Range; $r.MoveEnd(1, -1) | Out-Null; $r.Collapse(0); return $r }
function Start-Of-Para($doc, [int]$k) { $r = $doc.Paragraphs.Item($k).Range; $r.Collapse(1); return $r }

function Para-Info($doc) {
  $out = @()
  for ($k = 1; $k -le $doc.Paragraphs.Count; $k++) {
    $p = $doc.Paragraphs.Item($k)
    $out += [ordered]@{ text = $p.Range.Text; style = $p.Style.NameLocal; font = $p.Range.Font.Name; size = $p.Range.Font.Size; list = $p.Range.ListFormat.ListString }
  }
  return $out
}

# mesma origem copiada (Titulo + paragrafo, com as marcas) e colada no paragrafo vazio
function Exp-Same($app, $doc, [int]$how) {
  Clip-Save
  try {
    Base-Same $doc
    $doc.Range($doc.Paragraphs.Item(1).Range.Start, $doc.Paragraphs.Item(2).Range.End).Copy()
    Paste-At $app (Start-Of-Para $doc 4) $how
    return [ordered]@{ paras = (Para-Info $doc) }
  } finally { Clip-Restore }
}

# so a palavra em negrito (sem marca de paragrafo) colada no fim de "Destino:"
function Exp-Word($app, $doc, [int]$how) {
  Clip-Save
  try {
    Base-Same $doc
    $r2 = $doc.Paragraphs.Item(2).Range
    $doc.Range($r2.Start + 6, $r2.Start + 13).Copy()
    Paste-At $app (End-Of-Para $doc 3) $how
    return [ordered]@{ paras = (Para-Info $doc) }
  } finally { Clip-Restore }
}

# de OUTRO documento cujo Normal e Arial 14 e o Titulo 1 verde (estilos em conflito)
function Exp-Other($app, $doc, [int]$how) {
  Clip-Save
  $src = $null
  try {
    Base-Same $doc
    $src = $app.Documents.Add()
    $src.Styles.Item(-1).Font.Name = 'Arial'; $src.Styles.Item(-1).Font.Size = 14
    $src.Styles.Item(-2).Font.Color = 32768
    $src.Content.Text = "Titulo da outra`rTexto da outra`r"
    $src.Paragraphs.Item(1).Style = -2
    $src.Range($src.Paragraphs.Item(1).Range.Start, $src.Paragraphs.Item(2).Range.End).Copy()
    $doc.Activate()
    Paste-At $app (Start-Of-Para $doc 4) $how
    return [ordered]@{ paras = (Para-Info $doc) }
  } finally { if ($src -ne $null) { $src.Close(0) }; Clip-Restore }
}

# HTML de fora (CF_HTML, como um navegador poe na area de transferencia)
$HTML_FRAG = '<h1>Titulo HTML</h1><p>Um <b>negrito</b> <i>italico</i> <u>sublinhado</u> <span style="color:#c00000;font-family:Georgia;font-size:14pt">vermelho</span> <a href="https://example.com/">link</a></p><ul><li>item A</li><li>item B</li></ul><ol><li>um</li><li>dois</li></ol><p style="text-align:center">centro</p>'
function Set-Html([string]$frag, [string]$plain) {
  $pre = '<html><body><!--StartFragment-->'
  $post = '<!--EndFragment--></body></html>'
  $hdr = "Version:0.9`r`nStartHTML:{0:D10}`r`nEndHTML:{1:D10}`r`nStartFragment:{2:D10}`r`nEndFragment:{3:D10}`r`n"
  $h0 = ($hdr -f 0, 0, 0, 0).Length
  $sh = $h0; $sf = $h0 + $pre.Length; $ef = $sf + $frag.Length; $eh = $ef + $post.Length
  $cf = ($hdr -f $sh, $eh, $sf, $ef) + $pre + $frag + $post
  $do = New-Object System.Windows.Forms.DataObject
  $do.SetData([System.Windows.Forms.DataFormats]::Html, $cf)
  $do.SetData([System.Windows.Forms.DataFormats]::UnicodeText, $plain)
  [System.Windows.Forms.Clipboard]::SetDataObject($do, $true)
}
function Exp-Html($app, $doc, [int]$how) {
  Clip-Save
  try {
    Base-Same $doc
    Set-Html $HTML_FRAG "Titulo HTML`r`nUm negrito italico sublinhado vermelho link"
    Paste-At $app (Start-Of-Para $doc 4) $how
    return [ordered]@{ paras = (Para-Info $doc) }
  } finally { Clip-Restore }
}

# listas: "Um", "Dois" numerados (galeria de numeracao 1, como o botao), "Texto" e um vazio;
# os dois itens copiados e colados no vazio
function Base-List($app, $doc) {
  $doc.Content.Text = "Um`rDois`rTexto`r"
  $lt = $app.ListGalleries.Item(2).ListTemplates.Item(1)
  $doc.Range($doc.Paragraphs.Item(1).Range.Start, $doc.Paragraphs.Item(2).Range.End).ListFormat.ApplyListTemplateWithLevel($lt, $false, 0, 2) | Out-Null
}
function Exp-List($app, $doc, [int]$how, [string]$where) {
  Clip-Save
  try {
    Base-List $app $doc
    $doc.Range($doc.Paragraphs.Item(1).Range.Start, $doc.Paragraphs.Item(2).Range.End).Copy()
    $at = if ($where -eq 'after') { Start-Of-Para $doc 4 } else { Start-Of-Para $doc 2 }
    Paste-At $app $at $how
    return [ordered]@{ paras = (Para-Info $doc) }
  } finally { Clip-Restore }
}

# Colar Especial: o paragrafo 2 copiado e colado no vazio com um formato
function Exp-Special($app, $doc, [int]$dataType, [bool]$link) {
  Clip-Save
  try {
    Base-Same $doc
    if ($link) { $doc.SaveAs2([string](Join-Path $env:TEMP 'home-lab-pastelink-src.docx'), 16) }
    $doc.Range($doc.Paragraphs.Item(2).Range.Start, $doc.Paragraphs.Item(2).Range.End).Copy()
    $at = Start-Of-Para $doc 4
    $at.Select()
    $err = ''
    try { $app.Selection.PasteSpecial([Type]::Missing, $link, [Type]::Missing, $false, $dataType) } catch { $err = [string]$_.Exception.Message }
    $f = @(); foreach ($fl in $doc.Fields) { $f += [ordered]@{ code = $fl.Code.Text; type = $fl.Type } }
    return [ordered]@{ err = $err; paras = (Para-Info $doc); fields = $f; shapes = $doc.InlineShapes.Count }
  } finally { Clip-Restore }
}

$EXPERIMENTS = @(
  @{ Name = 'same-paste'; Run = { param($app, $doc) Exp-Same $app $doc -1 } },
  @{ Name = 'same-0'; Run = { param($app, $doc) Exp-Same $app $doc 0 } },
  @{ Name = 'same-K'; Run = { param($app, $doc) Exp-Same $app $doc 16 } },
  @{ Name = 'same-M'; Run = { param($app, $doc) Exp-Same $app $doc 20 } },
  @{ Name = 'same-T'; Run = { param($app, $doc) Exp-Same $app $doc 22 } },
  @{ Name = 'same-D'; Run = { param($app, $doc) Exp-Same $app $doc 19 } },
  @{ Name = 'word-K'; Run = { param($app, $doc) Exp-Word $app $doc 16 } },
  @{ Name = 'word-M'; Run = { param($app, $doc) Exp-Word $app $doc 20 } },
  @{ Name = 'word-T'; Run = { param($app, $doc) Exp-Word $app $doc 22 } },
  @{ Name = 'other-0'; Run = { param($app, $doc) Exp-Other $app $doc 0 } },
  @{ Name = 'other-K'; Run = { param($app, $doc) Exp-Other $app $doc 16 } },
  @{ Name = 'other-M'; Run = { param($app, $doc) Exp-Other $app $doc 20 } },
  @{ Name = 'other-T'; Run = { param($app, $doc) Exp-Other $app $doc 22 } },
  @{ Name = 'other-D'; Run = { param($app, $doc) Exp-Other $app $doc 19 } },
  @{ Name = 'html-0'; Run = { param($app, $doc) Exp-Html $app $doc 0 } },
  @{ Name = 'html-K'; Run = { param($app, $doc) Exp-Html $app $doc 16 } },
  @{ Name = 'html-M'; Run = { param($app, $doc) Exp-Html $app $doc 20 } },
  @{ Name = 'html-T'; Run = { param($app, $doc) Exp-Html $app $doc 22 } },
  @{ Name = 'list-after-0'; Run = { param($app, $doc) Exp-List $app $doc 0 'after' } },
  @{ Name = 'list-after-7'; Run = { param($app, $doc) Exp-List $app $doc 7 'after' } },
  @{ Name = 'list-after-8'; Run = { param($app, $doc) Exp-List $app $doc 8 'after' } },
  @{ Name = 'list-after-T'; Run = { param($app, $doc) Exp-List $app $doc 22 'after' } },
  @{ Name = 'list-inside-0'; Run = { param($app, $doc) Exp-List $app $doc 0 'inside' } },
  @{ Name = 'list-inside-24'; Run = { param($app, $doc) Exp-List $app $doc 24 'inside' } },
  @{ Name = 'list-inside-25'; Run = { param($app, $doc) Exp-List $app $doc 25 'inside' } },
  @{ Name = 'special-rtf'; Run = { param($app, $doc) Exp-Special $app $doc 1 $false } },
  @{ Name = 'special-text'; Run = { param($app, $doc) Exp-Special $app $doc 2 $false } },
  @{ Name = 'special-html'; Run = { param($app, $doc) Exp-Special $app $doc 10 $false } },
  @{ Name = 'special-emf'; Run = { param($app, $doc) Exp-Special $app $doc 9 $false } },
  @{ Name = 'special-bitmap'; Run = { param($app, $doc) Exp-Special $app $doc 4 $false } },
  @{ Name = 'special-link-rtf'; Run = { param($app, $doc) Exp-Special $app $doc 1 $true } },
  @{ Name = 'special-link-text'; Run = { param($app, $doc) Exp-Special $app $doc 2 $true } }
)

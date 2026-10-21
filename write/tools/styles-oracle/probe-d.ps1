# Oraculo de estilos (D): Enter e o "proximo estilo" (w:next).
# ASCII puro. Rodar pela trava (word-lock.mjs).
param([string]$Out)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$Out = [string](Resolve-Path $Out).Path
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$mine = @()
function AddP($doc, [string]$t) {
  $n = $doc.Paragraphs.Count
  $last = $doc.Paragraphs.Item($n)
  if ($last.Range.Text.Length -gt 1) { $doc.Content.InsertParagraphAfter(); $n++ }
  $p = $doc.Paragraphs.Item($n)
  $p.Style = -1; $p.Range.ParagraphFormat.Reset(); $p.Range.Font.Reset()
  $p.Range.InsertBefore($t)
  return $doc.Paragraphs.Item($n)
}
try {
  $doc = $word.Documents.Add(); $mine += $doc
  $sel = $word.Selection
  # 1) fim de Titulo 1 com direto (centralizado + negrito no run)
  $p = AddP $doc 'Titulo fim'; $p.Style = -2; $p.Range.ParagraphFormat.Alignment = 1; $p.Range.Font.Bold = $true
  $doc.Range($p.Range.End - 1, $p.Range.End - 1).Select(); $sel.TypeParagraph(); $sel.TypeText('depois1')
  # 2) meio de Titulo 1
  $p = AddP $doc 'Titulo meio'; $p.Style = -2
  $doc.Range($p.Range.Start + 6, $p.Range.Start + 6).Select(); $sel.TypeParagraph()
  # 3) Titulo 1 vazio
  $p = AddP $doc 'x'; $p.Style = -2
  $doc.Range($p.Range.Start, $p.Range.Start + 1).Delete() | Out-Null
  $p = $doc.Paragraphs.Last
  $doc.Range($p.Range.Start, $p.Range.Start).Select(); $sel.TypeParagraph(); $sel.TypeText('depois3')
  # 4) estilo personalizado sem w:next (proximo = ele mesmo)
  $st = $doc.Styles.Add('Proprio', 1); $st.Font.Italic = $true
  $p = AddP $doc 'Proprio fim'; $p.Style = 'Proprio'
  $doc.Range($p.Range.End - 1, $p.Range.End - 1).Select(); $sel.TypeParagraph(); $sel.TypeText('depois4')
  # 5) fim de Citacao com cor direta no run
  $p = AddP $doc 'Citacao fim'; $p.Style = -181; $p.Range.Font.Color = 255
  $doc.Range($p.Range.End - 1, $p.Range.End - 1).Select(); $sel.TypeParagraph(); $sel.TypeText('depois5')
  $doc.SaveAs2([string]($Out + '\d1.docx'), 16)
} catch {
  Write-Host "ERRO: $($_.Exception.Message) @ $($_.InvocationInfo.ScriptLineNumber)"
} finally {
  foreach ($d in $mine) { try { $d.Close($false) } catch {} }
  if ($word.Documents.Count -eq 0) { $word.Quit() }
}
Write-Host 'fim'

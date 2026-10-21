# Oraculo de estilos (C): vinculado em selecao parcial por varios caminhos;
# criar estilo de selecao com formatacao parcial; atualizar para corresponder.
param([string]$Out)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$Out = [string](Resolve-Path $Out).Path
$log = [ordered]@{}
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
function AddP($doc, [string]$t) {
  $n = $doc.Paragraphs.Count
  $last = $doc.Paragraphs.Item($n)
  if ($last.Range.Text.Length -gt 1) { $doc.Content.InsertParagraphAfter(); $n++ }
  $p = $doc.Paragraphs.Item($n)
  $p.Style = -1; $p.Range.ParagraphFormat.Reset(); $p.Range.Font.Reset()
  $p.Range.InsertBefore($t)
  return $doc.Paragraphs.Item($n)
}
function Sub($doc, $p, [int]$from, [int]$to) { return $doc.Range($p.Range.Start + $from, $p.Range.Start + $to) }
$mine = @()
try {
  $doc = $word.Documents.Add(); $mine += $doc
  $qn = [string]$doc.Styles.Item(-181).NameLocal
  $log['linkStylesOption'] = ''
  try { $log['linkStylesOption'] = [string]$doc.LinkStyles } catch {}
  $p = AddP $doc 'v0 um dois tres'; (Sub $doc $p 6 9).Select(); $word.Selection.Style = $qn
  $p = AddP $doc 'v2 um dois tres'; (Sub $doc $p 6 9).Select(); try { $word.WordBasic.Style($qn) } catch { $log['wb'] = $_.Exception.Message }
  $p = AddP $doc 'v3 um dois tres'; (Sub $doc $p 6 9).Style = $qn
  $p = AddP $doc 'v4 um dois tres'; (Sub $doc $p 6 9).Select(); $word.Selection.Range.Style = [string]$doc.Styles.Item($qn).LinkStyle.NameLocal
  $st = $doc.Styles.Add('Meu Link', 6); $st.Font.Bold = $true; $st.Font.Size = 16
  $p = AddP $doc 'v5 um dois tres'; (Sub $doc $p 6 9).Select(); $word.Selection.Style = 'Meu Link'
  $p = AddP $doc 'v6 um dois tres'; (Sub $doc $p 6 9).Select(); try { $word.CommandBars.ExecuteMso('QuickStylesGallery') } catch { $log['mso'] = $_.Exception.Message }

  # criar a partir de selecao com formatacao parcial (vermelho uniforme + negrito parcial)
  $p = AddP $doc 'Alfa beta gama'
  $p.Range.Font.Color = 255
  (Sub $doc $p 5 9).Font.Bold = $true
  $p.Range.Select()
  $st = $doc.Styles.Add('Do Misto', 1)
  $word.Selection.Style = 'Do Misto'
  # selecao comecando no negrito
  $p = AddP $doc 'Negrito primeiro resto'
  (Sub $doc $p 0 7).Font.Bold = $true
  $p.Range.Select()
  $st = $doc.Styles.Add('Do Negrito', 1)
  # caret (sem selecao) num paragrafo com direto uniforme
  $p = AddP $doc 'Caret uniforme'
  $p.Range.Font.Italic = $true; $p.Range.ParagraphFormat.Alignment = 2
  $doc.Range($p.Range.Start + 3, $p.Range.Start + 3).Select()
  $st = $doc.Styles.Add('Do Caret', 1)
  $word.Selection.Style = 'Do Caret'

  # atualizar Titulo 1 para corresponder a selecao (varios caminhos)
  $p = AddP $doc 'Titulo para atualizar'
  $p.Style = -2
  $p.Range.Font.Color = 32768; $p.Range.ParagraphFormat.Alignment = 1
  $p.Range.Select()
  $ok = 'none'
  foreach ($m in @('UpdateStyle', 'StyleUpdateToMatchSelection', 'UpdateStyleToMatchSelection')) {
    try { $word.CommandBars.ExecuteMso($m); $ok = $m; break } catch {}
  }
  if ($ok -eq 'none') { try { $word.WordBasic.RedefineStyle(); $ok = 'WordBasic.RedefineStyle' } catch { $log['redefine'] = $_.Exception.Message } }
  $log['update'] = $ok
  $doc.SaveAs2([string]($Out + '\c1.docx'), 16)
  $doc.Close($false)
} catch {
  Write-Host "ERRO: $($_.Exception.Message) @ $($_.InvocationInfo.ScriptLineNumber)"
} finally {
  $json = $log | ConvertTo-Json -Depth 5
  [IO.File]::WriteAllText([string]($Out + '\probe-c.json'), $json, [Text.Encoding]::UTF8)
  foreach ($d in $mine) { try { $d.Close($false) } catch {} }
  if ($word.Documents.Count -eq 0) { $word.Quit() }
}
Write-Host 'fim'

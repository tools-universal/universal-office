# Oraculo de estilos (A): documento em branco, catalogo de estilos (estado
# antes de usar) e TODOS os estilos de paragrafo/caractere aplicados (para
# ler as definicoes materializadas e o par nome en (w:name) x NameLocal pt).
# ASCII puro. Rodar pela trava: node tools/parallel/word-lock.mjs -- powershell -File probe-a.ps1 -Out <dir>
param([string]$Out)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$Out = [string](Resolve-Path $Out).Path

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  # 1) em branco
  $doc = $word.Documents.Add()
  $doc.SaveAs2([string]($Out + '\blank.docx'), 16)
  $doc.Close($false)

  # 2) catalogo + aplicar todos
  $doc = $word.Documents.Add()
  $cat = @()
  $i = 0
  $names = @()
  foreach ($s in $doc.Styles) { $names += [string]$s.NameLocal }
  foreach ($n in $names) {
    $s = $doc.Styles.Item($n)
    $e = [ordered]@{ i = $i; name = $n; type = [int]$s.Type; builtIn = [bool]$s.BuiltIn; quick = [bool]$s.QuickStyle;
      priority = [int]$s.Priority; visibility = [bool]$s.Visibility; unhide = [bool]$s.UnhideWhenUsed; inUse = [bool]$s.InUse;
      linked = $false; base = ''; next = ''; link = '' }
    try { $e.linked = [bool]$s.Linked } catch {}
    try { $e.base = [string]$s.BaseStyle.NameLocal } catch { try { $e.base = [string]$s.BaseStyle } catch {} }
    try { $e.next = [string]$s.NextParagraphStyle.NameLocal } catch { try { $e.next = [string]$s.NextParagraphStyle } catch {} }
    try { $e.link = [string]$s.LinkStyle.NameLocal } catch { try { $e.link = [string]$s.LinkStyle } catch {} }
    $cat += $e
    $i++
  }
  $json = $cat | ConvertTo-Json -Depth 4
  [IO.File]::WriteAllText([string]($Out + '\catalog.json'), $json, [Text.Encoding]::UTF8)

  foreach ($e in $cat) {
    if ($e.type -ne 1 -and $e.type -ne 2) { continue }
    $doc.Content.InsertParagraphAfter()
    $p = $doc.Paragraphs.Last
    if ($e.type -eq 1) {
      $p.Range.InsertBefore('P' + $e.i)
      $p = $doc.Paragraphs.Last
      try { $p.Style = $e.name } catch { Write-Host "falhou P $($e.name)" }
      if ($e.linked) {
        # parte de caractere do vinculado: aplicar a um trecho parcial
        $doc.Content.InsertParagraphAfter()
        $q = $doc.Paragraphs.Last
        $q.Range.InsertBefore('a L' + $e.i + ' b')
        $q = $doc.Paragraphs.Last
        try { $q.Style = -1 } catch {}
        $st = $q.Range.Start
        $r = $doc.Range($st + 2, $st + 3 + ([string]$e.i).Length)
        try { $r.Style = $e.name } catch { Write-Host "falhou L $($e.name)" }
      }
    } else {
      $p.Range.InsertBefore('a C' + $e.i + ' b')
      $p = $doc.Paragraphs.Last
      try { $p.Style = -1 } catch {}
      $st = $p.Range.Start
      $r = $doc.Range($st + 2, $st + 3 + ([string]$e.i).Length)
      try { $r.Style = $e.name } catch { Write-Host "falhou C $($e.name)" }
    }
  }
  $doc.SaveAs2([string]($Out + '\all.docx'), 16)
  $doc.Close($false)
  Write-Host "ok $($cat.Count) estilos"
} finally {
  if ($word.Documents.Count -eq 0) { $word.Quit() }
}

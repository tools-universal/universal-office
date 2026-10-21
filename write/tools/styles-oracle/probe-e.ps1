# Oraculo de estilos (E): o que o Word ENXERGA nos .docx salvos pelo editor
# (styles-check.mjs): estilo de cada paragrafo, estilo de caractere de cada
# palavra marcada e os estilos personalizados. ASCII puro; pela trava.
param([string]$Dir, [string]$Out)
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$mine = @()
$res = [ordered]@{}
try {
  foreach ($f in @('novo.docx', 'demo-titulo2.docx')) {
    [string]$p = Join-Path $Dir $f
    $d = $word.Documents.Open($p, $false, $true, $false); $mine += $d
    $paras = @()
    $n = [Math]::Min(4, $d.Paragraphs.Count)
    for ($i = 1; $i -le $n; $i++) {
      $pp = $d.Paragraphs.Item($i)
      $words = @()
      foreach ($w in $pp.Range.Words) {
        $cs = ''
        try { $cs = [string]$w.CharacterStyle.NameLocal } catch {}
        $words += "$([string]$w.Text.Trim())=$cs"
      }
      $paras += [ordered]@{ style = [string]$pp.Style.NameLocal; size = [double]$pp.Range.Font.Size; align = [int]$pp.Alignment; words = ($words -join ' | ') }
    }
    $custom = @()
    foreach ($s in $d.Styles) { if (-not $s.BuiltIn) { $custom += "$([string]$s.NameLocal):$([int]$s.Type):q=$([bool]$s.QuickStyle)" } }
    $res[$f] = [ordered]@{ paras = $paras; custom = $custom; normalSize = [double]$d.Styles.Item(-1).Font.Size }
    $d.Close($false)
  }
} catch {
  Write-Host "ERRO: $($_.Exception.Message) @ $($_.InvocationInfo.ScriptLineNumber)"
} finally {
  foreach ($d in $mine) { try { $d.Close($false) } catch {} }
  if ($word.Documents.Count -eq 0) { $word.Quit() }
}
[IO.File]::WriteAllText([string]$Out, ($res | ConvertTo-Json -Depth 6), [Text.Encoding]::UTF8)
Write-Host 'fim'

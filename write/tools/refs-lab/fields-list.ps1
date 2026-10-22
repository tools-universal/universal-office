# Lista os campos de cada historia (story) de um .docx como o Word os ve.
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/refs-lab/fields-list.ps1 -Path <docx>
param([string]$Path)
$ErrorActionPreference = 'Stop'
$w = New-Object -ComObject Word.Application
$w.Visible = $false
$w.DisplayAlerts = 0
[string]$p = $Path
$d = $w.Documents.Open($p, $false, $true, $false)
try {
  Write-Host "campos (corpo): $($d.Fields.Count); paragrafos: $($d.Paragraphs.Count)"
  foreach ($s in $d.StoryRanges) {
    $r = $s
    while ($r -ne $null) {
      foreach ($f in $r.Fields) { Write-Host ("  story {0}: tipo {1} [{2}] -> [{3}]" -f $r.StoryType, $f.Type, ([string]$f.Code.Text).Trim(), ([string]$f.Result.Text)) }
      $r = $r.NextStoryRange
    }
  }
  $i = ([string]$d.Content.Text).IndexOf('XYZ')
  Write-Host "XYZ no corpo em $i"
  if ($i -ge 0) {
    $rg = $d.Range($i, $i + 40)
    Write-Host ("  em volta: [" + [string]$rg.Text + "] campos no trecho: " + $rg.Fields.Count)
  }
} finally { $d.Close(0) }
if ($w.Documents.Count -eq 0) { $w.Quit() }

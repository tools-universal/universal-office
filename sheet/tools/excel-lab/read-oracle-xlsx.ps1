# Opens results/oracle-src.xlsx in real Excel and reads, cell by cell, Range.Text
# (localized display) + effective HorizontalAlignment. Joins with oracle-cases.json
# (v/fmt ground truth) -> results/oracle-format.json. This is the RELIABLE oracle:
# the formatCode enters canonical via OOXML, no locale-contaminated COM setter.
$ErrorActionPreference = 'Stop'
$resDir = Join-Path $PSScriptRoot 'results'
$src = Join-Path $resDir 'oracle-src.xlsx'
$casesJson = Join-Path $resDir 'oracle-cases.json'
$out = Join-Path $resDir 'oracle-format.json'
if (-not (Test-Path $src)) { throw "missing oracle-src.xlsx - run gen-oracle-xlsx.mjs first" }

$cases = Get-Content $casesJson -Raw | ConvertFrom-Json
$excel = $null; $wb = $null
$results = @()
try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $wb = $excel.Workbooks.Open($src)
  $ws = $wb.Worksheets.Item(1)
  for ($i = 0; $i -lt $cases.Count; $i++) {
    $r = $i + 1
    $cell = $ws.Range("A$r")
    $results += [ordered]@{
      v      = $cases[$i].v
      fmt    = $cases[$i].fmt
      text   = "$($cell.Text)"
      halign = "$($cell.HorizontalAlignment)"
      note   = if ($cases[$i].note) { "$($cases[$i].note)" } else { '' }
    }
  }
  $json = ($results | ConvertTo-Json -Depth 5)
  Set-Content -Path $out -Value $json -Encoding utf8
  Write-Host "OK -> $out ($($results.Count) cases)"
}
finally {
  if ($wb)    { try { $wb.Close($false) } catch {} }
  if ($excel) { try { $excel.Quit() } catch {} }
  if ($excel) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) }
}

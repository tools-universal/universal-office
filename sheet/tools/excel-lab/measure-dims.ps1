# Oráculo numérico (Camada B): mede dimensões exatas que o Excel usa.
# Uso: pwsh -File measure-dims.ps1 -SheetName TextoENumeros
param([string]$SheetName = 'TextoENumeros')
$ErrorActionPreference = 'Stop'
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false; $excel.DisplayAlerts = $false
try {
  $wb = $excel.Workbooks.Open('D:\Projects\OfficeNext\SheetNext\samples\showcase.xlsx')
  $ws = $wb.Worksheets.Item($SheetName)
  $ur = $ws.UsedRange
  Write-Host ("UsedRange: rows={0} cols={1}  H(pt)={2}  W(pt)={3}" -f $ur.Rows.Count, $ur.Columns.Count, $ur.Height, [math]::Round($ur.Width,2))
  Write-Host ("px@96dpi: H={0}  W={1}" -f [math]::Round($ur.Height*96/72,1), [math]::Round($ur.Width*96/72,1))
  Write-Host "--- colunas (chars -> pt -> px) ---"
  for ($c = 1; $c -le $ur.Columns.Count; $c++) {
    $cw = $ws.Columns.Item($c).ColumnWidth
    $wpt = $ws.Cells.Item(1, $c).Width
    Write-Host ("  col{0}: chars={1}  pt={2}  px={3}" -f $c, $cw, [math]::Round($wpt,2), [math]::Round($wpt*96/72,1))
  }
  Write-Host "--- linhas (pt -> px) ---"
  for ($r = 1; $r -le $ur.Rows.Count; $r++) {
    $hpt = $ws.Rows.Item($r).Height
    Write-Host ("  row{0}: pt={1}  px={2}" -f $r, $hpt, [math]::Round($hpt*96/72,1))
  }
  $wb.Close($false)
}
finally { $excel.Quit(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) }

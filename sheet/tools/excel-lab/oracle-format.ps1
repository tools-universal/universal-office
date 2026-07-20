# Oráculo de formatação: dirige o Excel real (COM) e captura, para cada par
# (valor, formatCode), exatamente o que o Excel EXIBE (Range.Text), além do
# alinhamento horizontal efetivo (General → esquerda/direita) e do formatCode
# localizado. A saída JSON é o ground-truth contra o qual auditamos
# formatNumeric/formatDate/displayText.
#
# Uso: powershell -ExecutionPolicy Bypass -File tools/excel-lab/oracle-format.ps1
$ErrorActionPreference = 'Stop'
$out = Join-Path $PSScriptRoot 'results\oracle-format.json'

# Casos: cada um = @{ v = <valor>; fmt = <formatCode canônico>; note = <opcional> }
# v pode ser número (serial p/ datas) ou string (texto).
$cases = @(
  # --- General / números crus ---
  @{ v = 0;            fmt = 'General' }
  @{ v = 42;           fmt = 'General' }
  @{ v = -42;          fmt = 'General' }
  @{ v = 3.14159;      fmt = 'General' }
  @{ v = 1234567.89;   fmt = 'General' }
  @{ v = 0.000123;     fmt = 'General' }
  @{ v = 123456789012; fmt = 'General' }
  @{ v = 1234567890123456; fmt = 'General' }
  @{ v = 0.1;          fmt = 'General' }
  @{ v = 1e-10;        fmt = 'General' }
  @{ v = 1e20;         fmt = 'General' }
  @{ v = 2/3;          fmt = 'General' }
  @{ v = -0.5;         fmt = 'General' }
  # --- inteiros / decimais fixos ---
  @{ v = 1234.5;       fmt = '0' }
  @{ v = 1234.5;       fmt = '0.00' }
  @{ v = 1234.567;     fmt = '0.00' }
  @{ v = 0.5;          fmt = '0' }
  @{ v = 2.5;          fmt = '0' }
  @{ v = 3.5;          fmt = '0' }
  @{ v = -1234.567;    fmt = '0.00' }
  @{ v = 1234567.891;  fmt = '#,##0' }
  @{ v = 1234567.891;  fmt = '#,##0.00' }
  @{ v = -1234567.891; fmt = '#,##0.00' }
  @{ v = 0;            fmt = '#,##0.00' }
  @{ v = 0.005;        fmt = '0.00' }
  @{ v = 0.004;        fmt = '0.00' }
  # --- percentuais ---
  @{ v = 0.1234;       fmt = '0%' }
  @{ v = 0.1234;       fmt = '0.00%' }
  @{ v = 1;            fmt = '0%' }
  @{ v = -0.05;        fmt = '0.0%' }
  # --- moeda / contábil ---
  @{ v = 1234.5;       fmt = '"R$"#,##0.00' }
  @{ v = 1234.5;       fmt = '$#,##0.00' }
  @{ v = -1234.5;      fmt = '$#,##0.00' }
  @{ v = 1234.5;       fmt = '_-"R$"* #,##0.00_-;-"R$"* #,##0.00_-;_-"R$"* "-"??_-;_-@_-' }
  # --- multi-seção positivo;negativo;zero;texto ---
  @{ v = 100;          fmt = '0.00;[Red]-0.00' }
  @{ v = -100;         fmt = '0.00;[Red]-0.00' }
  @{ v = 5;            fmt = '#,##0;(#,##0)' }
  @{ v = -5;           fmt = '#,##0;(#,##0)' }
  @{ v = 0;            fmt = 'pos;neg;zero' ; note='secao zero literal' }
  @{ v = -7;           fmt = 'pos;neg;zero' }
  # --- científico ---
  @{ v = 12345.678;    fmt = '0.00E+00' }
  @{ v = 0.00012345;   fmt = '0.00E+00' }
  @{ v = 12345.678;    fmt = '##0.0E+0' }
  # --- frações ---
  @{ v = 0.5;          fmt = '# ?/?' }
  @{ v = 2.25;         fmt = '# ?/?' }
  @{ v = 0.333;        fmt = '# ??/??' }
  # --- texto ---
  @{ v = 'hello';      fmt = '@' }
  @{ v = 'hello';      fmt = 'General' }
  @{ v = 42;           fmt = '@' ; note='numero com formato texto' }
  # --- placeholders de espaço / preenchimento ---
  @{ v = 12.3;         fmt = '0.00_);(0.00)' }
  @{ v = 5;            fmt = '0"x"' }
  # --- datas (serial) ---
  @{ v = 45838;        fmt = 'm/d/yyyy' ; note='2025-07-04' }
  @{ v = 45838;        fmt = 'd/m/yyyy' }
  @{ v = 45838;        fmt = 'dd/mm/yyyy' }
  @{ v = 45838;        fmt = 'mmm' }
  @{ v = 45838;        fmt = 'mmmm' }
  @{ v = 45838;        fmt = 'ddd' }
  @{ v = 45838;        fmt = 'dddd' }
  @{ v = 45838;        fmt = 'd-mmm-yy' }
  @{ v = 45838;        fmt = 'yyyy-mm-dd' }
  @{ v = 45838.5;      fmt = 'h:mm' }
  @{ v = 45838.5;      fmt = 'h:mm:ss' }
  @{ v = 45838.776389; fmt = 'h:mm AM/PM' }
  @{ v = 45838.776389; fmt = 'hh:mm:ss AM/PM' }
  @{ v = 45838.776389; fmt = 'm/d/yyyy h:mm' }
  @{ v = 1.5;          fmt = '[h]:mm' ; note='tempo decorrido' }
  @{ v = 45838.25;     fmt = 'mm/dd/yyyy hh:mm:ss' }
  # --- built-ins por id (testados via NumberFormat aplicado pelo id) ---
)

$excel = $null; $wb = $null
$results = @()
try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $excel.SheetsInNewWorkbook = 1
  $wb = $excel.Workbooks.Add()
  $ws = $wb.Worksheets.Item(1)
  $cell = $ws.Range('A1')

  foreach ($c in $cases) {
    $cell.Clear()
    # define formato ANTES do valor (texto @ precisa do formato antes p/ não converter)
    try { $cell.NumberFormat = $c.fmt } catch { }
    if ($c.v -is [string]) { $cell.Value2 = [string]$c.v } else { $cell.Value2 = [double]$c.v }
    $text = $cell.Text
    $halign = $cell.HorizontalAlignment   # 1=General, -4131=Left, -4152=Right, -4108=Center
    $nfLocal = $cell.NumberFormatLocal
    $results += [ordered]@{
      v       = $c.v
      fmt     = $c.fmt
      text    = "$text"
      halign  = "$halign"
      fmtLocal = "$nfLocal"
      note    = if ($c.ContainsKey('note')) { $c.note } else { '' }
    }
  }

  # --- métricas de geometria ---
  $cell.Clear()
  $defColW = $ws.StandardWidth       # largura padrão em chars
  $defRowH = $ws.StandardHeight      # altura padrão em pontos
  # largura em pontos de uma coluna com width=8.43 (default)
  $colA = $ws.Columns.Item(1)
  $colA.ColumnWidth = 8.43
  $wPts843 = $colA.Width             # pontos
  $colA.ColumnWidth = 10
  $wPts10 = $colA.Width
  $colA.ColumnWidth = 18.71
  $wPts1871 = $colA.Width
  $geom = [ordered]@{
    standardWidthChars = "$defColW"
    standardHeightPts  = "$defRowH"
    widthPts_8p43 = "$wPts843"
    widthPts_10   = "$wPts10"
    widthPts_18p71 = "$wPts1871"
  }

  # --- overflow: texto longo numa célula seguida de célula vazia vs ocupada ---
  $ws.Cells.Clear()
  $ws.Range('A5').Value2 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAA texto longo que transborda'
  $ovEmpty = $ws.Range('A5').Text       # Excel não trunca o valor; Text é o conteúdo
  $a5Width = $ws.Range('A5').Width
  $ws.Range('A6').Value2 = 'curto'
  $ws.Range('B6').Value2 = 'bloqueia'
  $geom['overflowNote'] = 'Excel deixa texto transbordar p/ celulas vazias a direita; bloqueia se ocupada'

  $payload = [ordered]@{ cases = $results; geom = $geom }
  $json = $payload | ConvertTo-Json -Depth 6
  Set-Content -Path $out -Value $json -Encoding utf8
  Write-Host "OK -> $out ($($results.Count) casos)"
}
finally {
  if ($wb)    { try { $wb.Close($false) } catch {} }
  if ($excel) { try { $excel.Quit() } catch {} }
  if ($excel) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) }
}

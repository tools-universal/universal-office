# Captura a renderização do Excel via PDF export + rasterização WinRT (AA grayscale,
# SEM fringes ClearType — comparável ao nosso canvas). Crop automático ao conteúdo.
# Requer Windows PowerShell 5.1 (WinRT). Ruim com CopyPicture xlScreen (ClearType).
# Uso: powershell -File excel-pdf-to-png.ps1 -Xlsx f.xlsx -OutDir d [-Sheets 3,7]
param(
  [Parameter(Mandatory)][string]$Xlsx,
  [Parameter(Mandatory)][string]$OutDir,
  [int[]]$Sheets = @()
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime]
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]
function Await($t, $ty) { $m = $asTaskGeneric.MakeGenericMethod($ty); $nt = $m.Invoke($null, @($t)); $nt.Wait(-1) | Out-Null; $nt.Result }
function AwaitAction($a) { $m = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' })[0]; $nt = $m.Invoke($null, @($a)); $nt.Wait(-1) | Out-Null }

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }
$tmp = [System.IO.Path]::GetTempFileName() + '.pdf'

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false; $excel.DisplayAlerts = $false
try {
  $wb = $excel.Workbooks.Open($Xlsx)
  $count = $wb.Worksheets.Count
  $indices = if ($Sheets.Count) { $Sheets } else { 1..$count }
  foreach ($i in $indices) {
    if ($i -lt 1 -or $i -gt $count) { continue }
    $ws = $wb.Worksheets.Item($i)
    $ws.Activate()
    try { $ws.PageSetup.PrintGridlines = $true } catch {}   # igual à tela
    try { $ws.PageSetup.Zoom = 100 } catch {}               # escala natural 1:1 (sem fit)
    try { $ws.PageSetup.CenterHorizontally = $false; $ws.PageSetup.LeftMargin = 0; $ws.PageSetup.TopMargin = 0; $ws.PageSetup.RightMargin = 0; $ws.PageSetup.BottomMargin = 0 } catch {}
    $ws.ExportAsFixedFormat(0, $tmp)   # 0 = xlTypePDF
    # rasteriza página 1 via WinRT @96dpi
    $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($tmp)) ([Windows.Storage.StorageFile])
    $doc = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
    $page = $doc.GetPage(0)
    $opts = New-Object Windows.Data.Pdf.PdfPageRenderOptions
    $opts.DestinationWidth = [uint32][Math]::Round($page.Size.Width * 96 / 96)
    $opts.DestinationHeight = [uint32][Math]::Round($page.Size.Height * 96 / 96)
    $stream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
    AwaitAction ($page.RenderToStreamAsync($stream, $opts))
    $size = $stream.Size
    $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
    Await ($reader.LoadAsync($size)) ([uint32]) | Out-Null
    $bytes = New-Object byte[] $size
    $reader.ReadBytes($bytes)
    $raw = Join-Path $OutDir ("_raw{0}.png" -f $i)
    [System.IO.File]::WriteAllBytes($raw, $bytes)
    $page.Dispose()
    # crop ao bbox de conteúdo (não-branco)
    $bmp = [System.Drawing.Bitmap]::FromFile($raw)
    $minX = $bmp.Width; $minY = $bmp.Height; $maxX = 0; $maxY = 0
    for ($y = 0; $y -lt $bmp.Height; $y++) {
      for ($x = 0; $x -lt $bmp.Width; $x++) {
        $px = $bmp.GetPixel($x, $y)
        if ($px.R -lt 250 -or $px.G -lt 250 -or $px.B -lt 250) {
          if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
          if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
        }
      }
    }
    $w = $maxX - $minX + 1; $h = $maxY - $minY + 1
    $crop = $bmp.Clone([System.Drawing.Rectangle]::FromLTRB($minX, $minY, $maxX + 1, $maxY + 1), $bmp.PixelFormat)
    $out = Join-Path $OutDir ("page{0}.png" -f $i)
    $crop.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose(); $crop.Dispose(); Remove-Item $raw
    Write-Host ("aba {0} ({1}): {2}x{3}px -> page{0}.png" -f $i, $ws.Name, $w, $h)
  }
  $wb.Close($false)
}
finally { $excel.Quit(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel); if (Test-Path $tmp) { Remove-Item $tmp } }

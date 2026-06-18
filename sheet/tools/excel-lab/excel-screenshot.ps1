# Captura a renderização REAL do Excel de cada aba (range usado) via
# CopyPicture(xlScreen, xlBitmap) → clipboard → PNG. Rodar em STA:
#   powershell -STA -ExecutionPolicy Bypass -File excel-screenshot.ps1 -Xlsx <f> -OutDir <d>
param(
  [Parameter(Mandatory)][string]$Xlsx,
  [Parameter(Mandatory)][string]$OutDir,
  [int[]]$Sheets = @()
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
# P/Invoke p/ trocar suavização de fonte: Standard (grayscale) durante a captura
# evita fringes ClearType no CopyPicture — fica comparável ao canvas (tb grayscale).
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class FontSmooth {
  [DllImport("user32.dll", EntryPoint="SystemParametersInfo", SetLastError=true)]
  public static extern bool SPI_Get(uint a, uint p, ref uint v, uint f);
  [DllImport("user32.dll", EntryPoint="SystemParametersInfo", SetLastError=true)]
  public static extern bool SPI_Set(uint a, uint p, IntPtr v, uint f);
}
"@
$SPI_GETFONTSMOOTHING=0x004A; $SPI_SETFONTSMOOTHING=0x004B
$SPI_GETFONTSMOOTHINGTYPE=0x200A; $SPI_SETFONTSMOOTHINGTYPE=0x200B
$SPIF_SENDCHANGE=3
$prevOn=[uint32]0; $prevType=[uint32]0
[void][FontSmooth]::SPI_Get($SPI_GETFONTSMOOTHING,0,[ref]$prevOn,0)
[void][FontSmooth]::SPI_Get($SPI_GETFONTSMOOTHINGTYPE,0,[ref]$prevType,0)
# liga Standard (grayscale): smoothing=ON, type=1
[void][FontSmooth]::SPI_Set($SPI_SETFONTSMOOTHING,1,[IntPtr]::Zero,$SPIF_SENDCHANGE)
[void][FontSmooth]::SPI_Set($SPI_SETFONTSMOOTHINGTYPE,1,[IntPtr]::Zero,$SPIF_SENDCHANGE)

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $null
try {
  $wb = $excel.Workbooks.Open($Xlsx)
  $count = $wb.Worksheets.Count
  $indices = if ($Sheets.Count -gt 0) { $Sheets } else { 1..$count }
  foreach ($i in $indices) {
    if ($i -lt 1 -or $i -gt $count) { continue }
    $ws = $wb.Worksheets.Item($i)
    $ws.Activate()
    # zoom 100% p/ captura consistente
    try { $excel.ActiveWindow.Zoom = 100 } catch {}
    $rng = $ws.UsedRange
    # ignora aba totalmente vazia
    if ($rng.Cells.Count -le 1 -and $null -eq ($rng.Value2)) { Write-Host "aba $i vazia"; continue }
    $rng.CopyPicture(1, 2) | Out-Null   # xlScreen=1 (escala de tela), xlBitmap=2; fringes tratadas no compare (canal G)
    Start-Sleep -Milliseconds 250
    $img = [System.Windows.Forms.Clipboard]::GetImage()
    if ($img) {
      $out = Join-Path $OutDir ("page{0}.png" -f $i)
      $img.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
      Write-Host ("aba {0} ({1}): {2}x{3}px -> page{0}.png" -f $i, $ws.Name, $img.Width, $img.Height)
    } else {
      Write-Warning "aba ${i}: clipboard sem imagem"
    }
    [System.Windows.Forms.Clipboard]::Clear()
  }
}
finally {
  if ($wb) { try { $wb.Close($false) } catch {} }
  $excel.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  # restaura suavização anterior (ClearType)
  [void][FontSmooth]::SPI_Set($SPI_SETFONTSMOOTHING,$prevOn,[IntPtr]::Zero,$SPIF_SENDCHANGE)
  [void][FontSmooth]::SPI_Set($SPI_SETFONTSMOOTHINGTYPE,$prevType,[IntPtr]::Zero,$SPIF_SENDCHANGE)
}

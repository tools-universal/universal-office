# Captura como o app de referencia exibe cabeçalhos com célula selecionada e
# células mescladas, para inferir cores reais e comportamento. Saída em
# results/probe/headers/ (PNGs por cenário).
param([int]$Zoom = 150)
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class WinApi {
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, int flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int n);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
}
public struct RECT { public int L,T,R,B; }
"@

$outDir = Join-Path $PSScriptRoot 'results\probe\headers'
if (Test-Path $outDir) { Remove-Item -Recurse -Force $outDir }
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $true
$excel.DisplayAlerts = $false
$wb = $null
try {
  $wb = $excel.Workbooks.Add()
  $ws = $wb.Worksheets.Item(1)
  # conteudo: header textos, merge A5:D5 e B7:C8
  $ws.Range('A1').Value2 = 'A'
  $ws.Range('B1').Value2 = 'B'
  $ws.Range('C1').Value2 = 'C'
  $ws.Range('D1').Value2 = 'D'
  $ws.Range('A2').Value2 = 1
  $ws.Range('B2').Value2 = 2
  $ws.Range('C2').Value2 = 3
  $ws.Range('D2').Value2 = 4
  $ws.Range('A5:D5').Merge()
  $ws.Range('A5').Value2 = 'MERGE HORIZ (A5:D5)'
  $ws.Range('B7:C8').Merge()
  $ws.Range('B7').Value2 = 'MERGE 2x2'

  $excel.ActiveWindow.Zoom = $Zoom
  $excel.WindowState = -4137  # xlMaximized
  Start-Sleep -Milliseconds 600

  function Capture([string]$name) {
    $hwnd = [IntPtr]$excel.Hwnd
    [WinApi]::ShowWindow($hwnd, 9) | Out-Null   # SW_RESTORE
    [WinApi]::SetForegroundWindow($hwnd) | Out-Null
    Start-Sleep -Milliseconds 300
    $rect = New-Object RECT
    [WinApi]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
    $w = $rect.R - $rect.L; $h = $rect.B - $rect.T
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $hdc = $g.GetHdc()
    [WinApi]::PrintWindow($hwnd, $hdc, 0) | Out-Null
    $g.ReleaseHdc($hdc); $g.Dispose()
    $bmp.Save((Join-Path $outDir "$name.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "saved $name.png"
  }

  # 1) seleção simples B2
  $ws.Range('B2').Select(); Start-Sleep -Milliseconds 200
  Capture 'sel-B2'

  # 2) clique no MEIO de uma mescla horizontal A5:D5 → seleciona o range todo
  $ws.Range('C5').Select(); Start-Sleep -Milliseconds 200   # C5 está coberta pela mescla A5:D5
  Capture 'sel-inside-merge-horiz'

  # 3) clique no meio de mescla 2x2 B7:C8
  $ws.Range('C8').Select(); Start-Sleep -Milliseconds 200
  Capture 'sel-inside-merge-2x2'

  # 4) coluna inteira
  $ws.Range('C:C').Select(); Start-Sleep -Milliseconds 200
  Capture 'sel-col-C'

  # 5) linha inteira
  $ws.Range('2:2').Select(); Start-Sleep -Milliseconds 200
  Capture 'sel-row-2'

  # 6) range B2:C4
  $ws.Range('B2:C4').Select(); Start-Sleep -Milliseconds 200
  Capture 'sel-range-B2-C4'
}
finally {
  if ($wb) { try { $wb.Close($false) } catch {} }
  $excel.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
}

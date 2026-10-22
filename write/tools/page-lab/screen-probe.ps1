# Oraculo da TELA do Word sem capturar a area de trabalho e sem roubar o foco:
# PrintWindow (PW_RENDERFULLCONTENT) na janela do proprio Word, mostrada FORA da
# tela, sem ativar (SW_SHOWNOACTIVATE) e como janela de ferramenta (sem botao na
# barra de tarefas). Opcional (-Web): salvar como pagina da Web filtrada, que
# grava o ladrilho do fundo como imagem (depois da captura: muda o modo).
# Restaura DisplayBackgrounds e esconde a janela no fim. ASCII puro.
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File screen-probe.ps1
#       [-Cases grad,solid,...] [-Zooms 100,200] [-Disp 1|0] [-Open x.docx] [-Web]
param([string]$Cases = 'grad', [string]$Zooms = '100', [int]$Disp = 1, [string]$Open = '', [switch]$Web, [int]$W = 1400, [int]$H = 1300)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class U32 {
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int cmd);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hwnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] public static extern IntPtr GetWindowLongPtr(IntPtr hwnd, int idx);
  [DllImport("user32.dll", EntryPoint="SetWindowLongPtrW")] public static extern IntPtr SetWindowLongPtr(IntPtr hwnd, int idx, IntPtr v);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT r);
  [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
}
'@
$labDir = [string]'E:\UniversalWriteTest\_lab\page\screen'
New-Item -ItemType Directory -Force -Path $labDir | Out-Null
$tmp = [string](Join-Path $env:TEMP 'officenext-page-oracle')
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
function Rgb([int]$r, [int]$g, [int]$b) { return $r + 256 * $g + 65536 * $b }
function Make-Png([string]$name, [int]$w, [int]$h) {
  $p = [string](Join-Path $tmp $name)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $bmp.SetResolution(96, 96)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(255, 30, 90, 200))
  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 240, 200, 40))), 0, 0, [int]($w / 2), [int]($h / 2))
  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 200, 30, 30))), [int]($w * 3 / 4), [int]($h * 3 / 4), [int]($w / 4), [int]($h / 4))
  $g.Dispose()
  $bmp.Save($p, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
  return $p
}
function Grad($f, [int]$st, [int]$va) { $f.ForeColor.RGB = (Rgb 255 0 0); $f.BackColor.RGB = (Rgb 0 0 255); $f.TwoColorGradient($st, $va) }

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$fg0 = [U32]::GetForegroundWindow()
$prevDisp = $null
try {
  $word.Templates.LoadBuildingBlocks()
  $caseList = if ($Open) { @('open') } else { $Cases -split ',' }
  foreach ($case in $caseList) {
    if ($Open) { $doc = $word.Documents.Open([string]$Open, $false, $true, $false) }
    else {
      $doc = $word.Documents.Add()
      $word.Selection.TypeText('Corpo')
      $f = $doc.Background.Fill
      $f.Visible = -1
      switch -regex ($case) {
        '^grad$' { Grad $f 1 1 }
        '^grad(\d)(\d)$' { Grad $f ([int]$Matches[1]) ([int]$Matches[2]) }
        '^solid$' { $f.ForeColor.RGB = (Rgb 255 255 0); $f.Solid() }
        '^pattern(\d+)$' { $f.ForeColor.RGB = (Rgb 200 0 0); $f.BackColor.RGB = (Rgb 255 255 200); $f.Patterned([int]$Matches[1]) }
        '^frame(\d+)$' { $f.UserPicture((Make-Png "f$($Matches[1]).png" ([int]$Matches[1]) ([int]([int]$Matches[1] * 3 / 4)))) }
        '^tile(\d+)$' { $f.UserTextured((Make-Png "t$($Matches[1]).png" ([int]$Matches[1]) ([int]([int]$Matches[1] * 3 / 4)))) }
        '^wm(\d)$' {
          $f.ForeColor.RGB = (Rgb 255 255 0); $f.Solid()
          foreach ($t in $word.Templates) { if ([string]$t.Name -eq 'Built-In Building Blocks.dotx') { $tpl = $t } }
          $bb = $tpl.BuildingBlockEntries.Item('CONFIDENCIAL ' + $Matches[1])
          [void]$bb.Insert($doc.Sections(1).Headers(1).Range, $true)
        }
      }
    }
    $win = $doc.ActiveWindow
    if ($prevDisp -eq $null) { $prevDisp = $win.View.DisplayBackgrounds }
    $win.View.DisplayBackgrounds = ($Disp -eq 1)
    $win.View.Type = 3
    $word.WindowState = 0
    $hwnd = [IntPtr]$win.Hwnd
    $ex = [U32]::GetWindowLongPtr($hwnd, -20).ToInt64()
    [void][U32]::SetWindowLongPtr($hwnd, -20, [IntPtr](($ex -bor 0x80) -band (-bnot 0x40000)))
    [void][U32]::SetWindowPos($hwnd, [IntPtr]1, -20000, -20000, $W, $H, 0x0010 -bor 0x0004)
    [void][U32]::ShowWindow($hwnd, 4)
    foreach ($z in ($Zooms -split ',')) {
      $win.View.Zoom.Percentage = [int]$z
      $win.ScrollIntoView($doc.Range(0, 0))
      $word.ScreenRefresh()
      Start-Sleep -Milliseconds 1500
      $r = New-Object U32+RECT
      [void][U32]::GetWindowRect($hwnd, [ref]$r)
      $bw = $r.R - $r.L; $bh = $r.B - $r.T
      $bmp = New-Object System.Drawing.Bitmap $bw, $bh
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $hdc = $g.GetHdc()
      $ok = [U32]::PrintWindow($hwnd, $hdc, 2)
      $g.ReleaseHdc($hdc); $g.Dispose()
      $tag = if ($Open) { [System.IO.Path]::GetFileNameWithoutExtension($Open) } else { $case }
      $out = [string](Join-Path $labDir ("screen-$tag-z$z-d$Disp.png"))
      $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
      "$tag zoom=$z printWindow=$ok size=${bw}x${bh} dpi=$([U32]::GetDpiForWindow($hwnd)) -> $out"
    }
    [void][U32]::ShowWindow($hwnd, 0)
    [void][U32]::SetWindowLongPtr($hwnd, -20, [IntPtr]$ex)
    if ($Web -and -not $Open) {
      $htm = [string](Join-Path $labDir ("web-$case.htm"))
      $doc.SaveAs2($htm, 10)
    }
    $doc.Close(0)
  }
  "foreground unchanged=" + ([U32]::GetForegroundWindow() -eq $fg0)
} finally {
  if ($prevDisp -ne $null) {
    $d = $word.Documents.Add(); $d.ActiveWindow.View.DisplayBackgrounds = $prevDisp; $d.Close(0)
  }
  foreach ($d in @($word.Documents)) { $d.Close(0) }
  $word.Quit()
}

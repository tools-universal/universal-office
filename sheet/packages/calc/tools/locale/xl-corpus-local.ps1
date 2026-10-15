# Le, de pastas REAIS (so as xlSafe do manifest do corpus), cada formula como o
# Excel desta maquina mostra: Formula2 (canonica) e Formula2Local (idioma), mais
# a tabela (ListObject) da celula e os nomes definidos (RefersTo/RefersToLocal).
# Entrada: JSON [{ id, path }]. Saida: JSON Lines UTF-8 (uma linha por pasta).
# SEGURANCA: so arquivos xlSafe; abre somente leitura, sem atualizar vinculos,
# macros desativadas, sem janela; fecha sem salvar; mata so a instancia que abriu.
param([string]$In, [string]$Out, [int]$PerSheet = 300, [int]$PerBook = 1500)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class XlWinC {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
}
"@
$items = [System.IO.File]::ReadAllText($In, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($Out, '', $enc)
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false; $excel.DisplayAlerts = $false; $excel.ScreenUpdating = $false
$excel.EnableEvents = $false; $excel.AutomationSecurity = 3; $excel.AskToUpdateLinks = $false
$xpid = [uint32]0; [void][XlWinC]::GetWindowThreadProcessId([IntPtr]$excel.Hwnd, [ref]$xpid)
[Console]::Error.WriteLine("PID $xpid")
try {
  $k = 0
  foreach ($it in $items) {
    $k++
    [Console]::Error.WriteLine("$k / $($items.Count) $($it.id)")
    $r = [ordered]@{ id = $it.id; cells = @(); names = @() }
    $wb = $null
    try {
      $wb = $excel.Workbooks.Open([string]$it.path, 0, $true)
      foreach ($n in $wb.Names) {
        try { $r.names += ,@([string]$n.Name, [string]$n.RefersTo, [string]$n.RefersToLocal) } catch { }
      }
      $total = 0
      foreach ($ws in $wb.Worksheets) {
        if ($total -ge $PerBook) { break }
        $fc = $null
        try { $fc = $ws.UsedRange.SpecialCells(-4123) } catch { continue }
        $cnt = 0
        foreach ($c in $fc.Cells) {
          if ($cnt -ge $PerSheet -or $total -ge $PerBook) { break }
          $lo = ''
          try { if ($null -ne $c.ListObject) { $lo = [string]$c.ListObject.Name } } catch { }
          try { $r.cells += ,@([string]$ws.Name, [string]$c.Address($false, $false), [string]$c.Formula2, [string]$c.Formula2Local, $lo) } catch { }
          $cnt++; $total++
        }
      }
    } catch { $r.err = [string]$_.Exception.Message }
    if ($wb) { try { $wb.Close($false) } catch { } }
    [System.IO.File]::AppendAllText($Out, (ConvertTo-Json -Compress -Depth 6 -InputObject $r) + "`n", $enc)
  }
} finally {
  try { $excel.Quit() } catch { }
  try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) } catch { }
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
  Start-Sleep -Seconds 2
  $p = Get-Process -Id $xpid -ErrorAction SilentlyContinue
  if ($p -and $p.ProcessName -eq 'EXCEL') { Stop-Process -Id $xpid -Force }
}

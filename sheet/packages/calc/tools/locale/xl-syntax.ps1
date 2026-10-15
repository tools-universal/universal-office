# Oraculo da SINTAXE das formulas no idioma do Excel desta maquina.
# Entrada (JSON UTF-8):
#   { setup: { sheets: ["S", ...], cells: { "A1": 1 | "x" }, names: [{ name, ref }],
#              table: { range, name, values: [[...]], totals } },
#     cases: [{ id, at?, set: "f2"|"f2Local"|"r1c1"|"r1c1Local"|"f"|"fLocal", text }] }
# Cada caso vai numa celula propria (padrao Z101, Z102...) da 1a aba e fica la;
# le Formula2, Formula2Local, Formula2R1C1, Formula2R1C1Local, Formula,
# FormulaLocal, Value2 e Text. No fim grava a pasta (.xlsx em -Save, pasta
# temporaria do agente) para ler a forma de ARQUIVO de cada formula.
# Mede tambem: Application.International(1..45) e o nome local de cada erro
# (valor de erro posto na celula pelo VARIANT VT_ERROR -> FormulaLocal).
# Saida: JSON Lines UTF-8 ({ version, build }, { intl }, { errors }, casos...).
# SEGURANCA: pasta nova, sem janela, macros desativadas, nada salvo fora de
# -Save, mata so a instancia que abriu (pelo PID).
param([string]$In, [string]$Out, [string]$Save)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class XlWinS {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
}
"@
$errMap = @{ 2000='#NULL!'; 2007='#DIV/0!'; 2015='#VALUE!'; 2023='#REF!'; 2029='#NAME?'; 2036='#NUM!'; 2042='#N/A'; 2043='#GETTING_DATA'; 2045='#SPILL!'; 2046='#CONNECT!'; 2047='#BLOCKED!'; 2048='#UNKNOWN!'; 2049='#FIELD!'; 2050='#CALC!'; 2051='#BUSY!'; 2052='#PYTHON!' }
function Conv($x) {
  if ($null -eq $x) { return $null }
  if ($x -is [int]) { $c = $x -band 0xFFFF; $n = $errMap[[int]$c]; if (-not $n) { $n = '#ERR' + $c }; return @{ e = $n } }
  if ($x -is [double] -or $x -is [string] -or $x -is [bool]) { return $x }
  return [string]$x
}
function SetVal($cell, $v) {
  if ($null -eq $v) { return }
  if ($v -is [string]) { $cell.Value2 = [string]$v } elseif ($v -is [bool]) { $cell.Value2 = [bool]$v } else { $cell.Value2 = [double]$v }
}
$inp = [System.IO.File]::ReadAllText($In, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$enc = New-Object System.Text.UTF8Encoding($false)
function Emit($o) { [System.IO.File]::AppendAllText($Out, (ConvertTo-Json -Compress -Depth 8 -InputObject $o) + "`n", $enc) }
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false; $excel.DisplayAlerts = $false; $excel.ScreenUpdating = $false
$excel.EnableEvents = $false; $excel.AutomationSecurity = 3
$xpid = [uint32]0; [void][XlWinS]::GetWindowThreadProcessId([IntPtr]$excel.Hwnd, [ref]$xpid)
[Console]::Error.WriteLine("PID $xpid")
[System.IO.File]::WriteAllText($Out, (ConvertTo-Json -Compress -InputObject ([ordered]@{ version = [string]$excel.Version; build = [string]$excel.Build })) + "`n", $enc)
try {
  $wb = $excel.Workbooks.Add()
  $su = $inp.setup
  $names = @($su.sheets)
  while ($wb.Worksheets.Count -lt $names.Count) { [void]$wb.Worksheets.Add([Type]::Missing, $wb.Worksheets.Item($wb.Worksheets.Count)) }
  for ($i = 0; $i -lt $names.Count; $i++) { $wb.Worksheets.Item($i + 1).Name = [string]$names[$i] }
  $ws = $wb.Worksheets.Item(1)
  if ($su.cells) { foreach ($p in $su.cells.PSObject.Properties) { SetVal $ws.Range([string]$p.Name) $p.Value } }
  if ($su.table) {
    $tb = $su.table
    $rg = $ws.Range([string]$tb.range)
    $r0 = $rg.Row; $c0 = $rg.Column
    for ($i = 0; $i -lt $tb.values.Count; $i++) { $row = @($tb.values[$i]); for ($j = 0; $j -lt $row.Count; $j++) { SetVal $ws.Cells.Item($r0 + $i, $c0 + $j) $row[$j] } }
    $lo = $ws.ListObjects.Add(1, $rg, [Type]::Missing, 1)
    $lo.Name = [string]$tb.name
    if ($tb.totals) { $lo.ShowTotals = $true }
  }
  if ($su.names) { foreach ($n in $su.names) { [void]$wb.Names.Add([string]$n.name, [string]$n.ref) } }
  # International e erros
  $intl = [ordered]@{}
  for ($i = 1; $i -le 45; $i++) { $intl["$i"] = $excel.International($i) }
  Emit ([ordered]@{ intl = $intl; useSystemSeparators = $excel.UseSystemSeparators; decimalSeparator = $excel.DecimalSeparator; thousandsSeparator = $excel.ThousandsSeparator })
  $errs = @()
  $ec = $ws.Range('AZ1')
  foreach ($code in 2000,2007,2015,2023,2029,2036,2042,2043,2045,2046,2047,2048,2049,2050,2051,2052) {
    $e = [ordered]@{ code = $code; name = $errMap[$code] }
    try { $ec.Value2 = New-Object System.Runtime.InteropServices.ErrorWrapper(-2146828288 + $code); $e.f = [string]$ec.Formula; $e.local = [string]$ec.FormulaLocal } catch { $e.err = [string]$_.Exception.Message }
    $errs += $e
  }
  [void]$ec.Clear()
  Emit ([ordered]@{ errors = $errs })
  $k = 0
  foreach ($c in $inp.cases) {
    $k++
    $r = [ordered]@{ id = $c.id }
    $at = if ($c.at) { [string]$c.at } else { 'Z' + (100 + $k) }
    $r.at = $at
    try {
      $t = $ws.Range($at)
      $txt = [string]$c.text
      switch ([string]$c.set) {
        'f2' { $t.Formula2 = $txt }
        'f2Local' { $t.Formula2Local = $txt }
        'r1c1' { $t.Formula2R1C1 = $txt }
        'r1c1Local' { $t.Formula2R1C1Local = $txt }
        'f' { $t.Formula = $txt }
        'fLocal' { $t.FormulaLocal = $txt }
        default { throw "set desconhecido: $($c.set)" }
      }
      [void]$excel.Calculate()
      $r.f2 = [string]$t.Formula2
      $r.f2Local = [string]$t.Formula2Local
      $r.r1c1 = [string]$t.Formula2R1C1
      $r.r1c1Local = [string]$t.Formula2R1C1Local
      $r.f = [string]$t.Formula
      $r.fLocal = [string]$t.FormulaLocal
      $r.v = Conv $t.Value2
      $r.text = [string]$t.Text
    } catch { $r.err = [string]$_.Exception.Message }
    Emit $r
  }
  if ($Save) {
    if (Test-Path $Save) { Remove-Item $Save }
    $wb.SaveAs($Save, 51)
  }
  $wb.Close($false)
} finally {
  try { $excel.Quit() } catch { }
  try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) } catch { }
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
  Start-Sleep -Seconds 2
  $p = Get-Process -Id $xpid -ErrorAction SilentlyContinue
  if ($p -and $p.ProcessName -eq 'EXCEL') { Stop-Process -Id $xpid -Force }
}

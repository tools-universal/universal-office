# Oraculo de CALCULO do Excel: le um JSON de casos e devolve o que o Excel
# calcula. Caso: { id, f: "=FORMULA canonica (en-US)", at?: "Z100",
#   cells?: { "A1": 1 | "texto" | true | {"f":"=..."} | {"e":"#N/A"} | {"s":"1"} },
#   legacy?: true (Range.Formula = interseccao implicita; padrao Formula2 = matriz dinamica),
#   date1904?: true, local?: "=FORMULA no idioma do Excel" (entra por FormulaLocal) }
# Saida (JSON UTF-8): [{ id, v, spill?, text, f, local, r1c1Local, err? }]
#   v = numero | texto | booleano | {"e":"#N/A"} | null ; spill = matriz 2D quando derrama.
# Valores de TEXTO convertidos seguem o idioma do Excel desta maquina (pt-BR:
# VERDADEIRO, decimal ","). SEGURANCA: pasta nova, sem janela, nada salvo,
# macros desativadas; mata so a instancia que abriu.
param([string]$In, [string]$Out)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class XlWin2 {
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
$cases = [System.IO.File]::ReadAllText($In, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false; $excel.DisplayAlerts = $false; $excel.ScreenUpdating = $false
$excel.EnableEvents = $false; $excel.AutomationSecurity = 3
$xpid = [uint32]0; [void][XlWin2]::GetWindowThreadProcessId([IntPtr]$excel.Hwnd, [ref]$xpid)
[Console]::Error.WriteLine("PID $xpid")
$res = New-Object System.Collections.ArrayList
try {
  $wb = $excel.Workbooks.Add()
  $ws = $wb.Worksheets.Item(1)
  foreach ($c in $cases) {
    $r = [ordered]@{ id = $c.id }
    try {
      [void]$ws.Cells.Clear()
      $wb.Date1904 = [bool]$c.date1904
      if ($c.cells) {
        foreach ($p in $c.cells.PSObject.Properties) {
          $cell = $ws.Range([string]$p.Name); $v = $p.Value
          if ($v -is [System.Management.Automation.PSCustomObject]) {
            if ($null -ne $v.f) { $cell.Formula2 = [string]$v.f }
            elseif ($null -ne $v.e) { $cell.Formula = [string]$v.e }
            elseif ($null -ne $v.s) { $cell.NumberFormat = '@'; $cell.Value2 = [string]$v.s }
          } elseif ($v -is [string]) { $cell.NumberFormat = '@'; $cell.Value2 = [string]$v }
          elseif ($v -is [bool]) { $cell.Value2 = [bool]$v } elseif ($null -ne $v) { $cell.Value2 = [double]$v }
        }
      }
      $at = if ($c.at) { [string]$c.at } else { 'Z100' }
      $t = $ws.Range($at)
      if ($c.local) { $t.FormulaLocal = [string]$c.local }
      elseif ($c.legacy) { $t.Formula = [string]$c.f }
      else { $t.Formula2 = [string]$c.f }
      [void]$excel.Calculate()
      $r.v = Conv $t.Value2
      $r.text = [string]$t.Text
      $r.f = [string]$t.Formula2
      $r.local = [string]$t.FormulaLocal
      $r.r1c1Local = [string]$t.FormulaR1C1Local
      if ($t.HasSpill) {
        $sp = $t.SpillingToRange; $vals = $sp.Value2
        $rows = @()
        for ($i = 1; $i -le $sp.Rows.Count; $i++) {
          $row = @(); for ($j = 1; $j -le $sp.Columns.Count; $j++) { $row += ,(Conv $vals[$i, $j]) }; $rows += ,$row
        }
        $r.spill = $rows
      }
    } catch { $r.err = [string]$_.Exception.Message + " @" + $_.InvocationInfo.ScriptLineNumber }
    [void]$res.Add($r)
  }
  $wb.Close($false)
} finally {
  $excel.Quit(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
}
[System.IO.File]::WriteAllText($Out, (ConvertTo-Json -InputObject $res.ToArray() -Depth 8), (New-Object System.Text.UTF8Encoding($false)))

# Oraculo de CALCULO do Excel: le um JSON de casos e devolve o que o Excel
# calcula. Caso: { id, f: "=FORMULA canonica (en-US)", at?: "Z100",
#   cells?: { "A1": 1 | "texto" | true | {"f":"=..."} | {"e":"#N/A"} | {"s":"1"} | {"b":"3fe..."} },
#   ({"b": hex} = double pelos bits exatos: o ConvertFrom-Json erra 1 ulp em alguns numeros)
#   legacy?: true (Range.Formula = interseccao implicita; padrao Formula2 = matriz dinamica),
#   date1904?: true, local?: "=FORMULA no idioma do Excel" (entra por FormulaLocal),
#   hiddenRows?: [2, 3] (linhas 1-based ocultas a mao),
#   filteredRows?: [4] (linhas 1-based ocultas por um AutoFiltro numa coluna auxiliar AZ),
#   sheets?: { "Nome": { "A1": ... } } (abas extras; a aba 1 vira "Sheet1"),
#   names?: { "Nome": "=Sheet1!$A$1" } (nomes da pasta), tables?: [{ name, ref, totals? }] (aba 1, com cabecalho) }
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
  # NaN/infinito (ex.: ROUND(1,79E308;0)) nao cabem em JSON: vira marcador
  if ($x -is [double] -and ([double]::IsNaN($x) -or [double]::IsInfinity($x))) { return @{ nan = [string]$x } }
  if ($x -is [double] -or $x -is [string] -or $x -is [bool]) { return $x }
  return [string]$x
}
$cases = [System.IO.File]::ReadAllText($In, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false; $excel.DisplayAlerts = $false; $excel.ScreenUpdating = $false
$excel.EnableEvents = $false; $excel.AutomationSecurity = 3
$xpid = [uint32]0; [void][XlWin2]::GetWindowThreadProcessId([IntPtr]$excel.Hwnd, [ref]$xpid)
[Console]::Error.WriteLine("PID $xpid")
# celulas de uma aba: pass 0 = valores, pass 1 = formulas (depois de todas as abas terem valores)
function SetCells($sh, $cells, [int]$pass) {
  if (-not $cells) { return }
  foreach ($p in $cells.PSObject.Properties) {
    $cell = $sh.Range([string]$p.Name); $v = $p.Value
    $isF = ($v -is [System.Management.Automation.PSCustomObject]) -and ($null -ne $v.f)
    if (($pass -eq 1) -ne $isF) { continue }
    if ($v -is [System.Management.Automation.PSCustomObject]) {
      if ($null -ne $v.f) { $cell.Formula2 = [string]$v.f }
      elseif ($null -ne $v.e) { $cell.Formula = [string]$v.e }
      elseif ($null -ne $v.s) { $cell.NumberFormat = '@'; $cell.Value2 = [string]$v.s }
      elseif ($null -ne $v.b) { $cell.Value2 = [BitConverter]::Int64BitsToDouble([Convert]::ToInt64([string]$v.b, 16)) }
    } elseif ($v -is [string]) { $cell.NumberFormat = '@'; $cell.Value2 = [string]$v }
    elseif ($v -is [bool]) { $cell.Value2 = [bool]$v } elseif ($null -ne $v) { $cell.Value2 = [double]$v }
  }
}
$res = New-Object System.Collections.ArrayList
try {
  $wb = $excel.Workbooks.Add()
  $ws = $wb.Worksheets.Item(1)
  $firstName = [string]$ws.Name
  foreach ($c in $cases) {
    $r = [ordered]@{ id = $c.id }
    $extra = @(); $tabs = @()
    try {
      if ($ws.AutoFilterMode) { $ws.AutoFilterMode = $false }
      [void]$ws.Cells.Clear()
      $ws.Cells.EntireRow.Hidden = $false
      $wb.Date1904 = [bool]$c.date1904
      if ($c.sheets) {
        $ws.Name = 'Sheet1'
        foreach ($p in $c.sheets.PSObject.Properties) {
          $sh = $wb.Worksheets.Add([Type]::Missing, $wb.Worksheets.Item($wb.Worksheets.Count)); $sh.Name = [string]$p.Name; $extra += $sh
        }
        foreach ($p in $c.sheets.PSObject.Properties) { SetCells $wb.Worksheets.Item([string]$p.Name) $p.Value 0 }
      }
      SetCells $ws $c.cells 0
      # Names.Add interpreta RefersTo no idioma local (pt-BR: ";"): traduz por uma celula de rascunho
      if ($c.names) {
        foreach ($p in $c.names.PSObject.Properties) {
          $tmp = $ws.Range('XFD1048576'); $tmp.Formula2 = [string]$p.Value; $loc = [string]$tmp.FormulaLocal; [void]$tmp.Clear()
          [void]$wb.Names.Add([string]$p.Name, $loc)
        }
      }
      if ($c.tables) {
        foreach ($tb in $c.tables) {
          $lo = $ws.ListObjects.Add(1, $ws.Range([string]$tb.ref), $null, 1); $lo.Name = [string]$tb.name
          if ($tb.totals) { $lo.ShowTotals = $true }
          $tabs += $lo
        }
      }
      if ($c.sheets) { foreach ($p in $c.sheets.PSObject.Properties) { SetCells $wb.Worksheets.Item([string]$p.Name) $p.Value 1 } }
      SetCells $ws $c.cells 1
      if ($c.filteredRows) {
        # AutoFiltro numa coluna auxiliar (AZ): 1 = visivel, 0 = filtrada
        $fr = @($c.filteredRows | ForEach-Object { [int]$_ })
        $last = ($fr | Measure-Object -Maximum).Maximum + 1
        $ws.Range('AZ1').Value2 = 'f'
        for ($i = 2; $i -le $last; $i++) { $ws.Cells.Item($i, 52).Value2 = [double]$(if ($fr -contains $i) { 0 } else { 1 }) }
        [void]$ws.Range("AZ1:AZ$last").AutoFilter(1, '1')
      }
      if ($c.hiddenRows) { foreach ($hr in $c.hiddenRows) { $ws.Rows.Item([int]$hr).Hidden = $true } }
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
    try {
      foreach ($lo in $tabs) { $lo.Unlist() }
      foreach ($sh in $extra) { $sh.Delete() }
      if ($c.names) { foreach ($p in $c.names.PSObject.Properties) { $wb.Names.Item([string]$p.Name).Delete() } }
      if ($c.sheets) { $ws.Name = $firstName }
    } catch { $r.err = [string]$r.err + ' cleanup: ' + [string]$_.Exception.Message }
    [void]$res.Add($r)
  }
  $wb.Close($false)
} finally {
  $excel.Quit(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
}
[System.IO.File]::WriteAllText($Out, (ConvertTo-Json -InputObject $res.ToArray() -Depth 8), (New-Object System.Text.UTF8Encoding($false)))

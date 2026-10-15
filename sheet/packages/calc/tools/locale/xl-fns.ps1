# Oraculo do CATALOGO de funcoes e dos nomes no idioma do Excel desta maquina.
# Entrada: JSON [{ id, name }] (nomes canonicos candidatos: a tabela de funcoes
# do EXCEL.EXE, ver exe-functions.mjs). Para cada nome mede, numa pasta nova sem
# janela:
#  - quantidades de argumentos aceitas pelo parser (Formula2 com a celula vazia
#    A1 em cada argumento; LET/LAMBDA com nomes): 0..12 e o maximo (busca
#    binaria ate 255, respeitando a paridade);
#  - Formula2 (canonica), Formula2Local (idioma), valor (#NAME? = desconhecida);
#  - ida e volta: Formula2Local -> Formula2;
#  - nome recusado em celula com qualquer quantidade = funcao so de macro (XLM) ou
#    interna ("reserved"). Folha de macro NAO serve de oraculo: la a formula e
#    avaliada ao entrar (=CALLER() derrubou o Excel).
# No fim grava as formulas num .xlsx em -Save (pasta temporaria do agente) para
# ler o prefixo (_xlfn. ...) do XML.
# Saida: JSON Lines UTF-8 (uma linha por funcao, gravada na hora: se o Excel
# cair numa funcao interna, o que ja foi medido fica; a 1a linha e a versao).
# SEGURANCA: argumentos sao a celula vazia A1 (nenhuma URL/arquivo); macros
# desativadas; sem janela; nada salvo fora de -Save; mata so a instancia que abriu.
param([string]$In, [string]$Out, [string]$Save)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class XlWinF {
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
function ArgList([string]$name, [int]$n, [string]$ref) {
  $a = @()
  for ($i = 0; $i -lt $n; $i++) {
    if ($name -eq 'LET') { if (($i % 2) -eq 0 -and $i -lt ($n - 1)) { $a += "x$i" } else { $a += '1' } }
    elseif ($name -eq 'LAMBDA') { if ($i -lt ($n - 1)) { $a += "x$i" } else { $a += '1' } }
    else { $a += $ref }
  }
  return ($a -join ',')
}
$items = [System.IO.File]::ReadAllText($In, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false; $excel.DisplayAlerts = $false; $excel.ScreenUpdating = $false
$excel.EnableEvents = $false; $excel.AutomationSecurity = 3
$xpid = [uint32]0; [void][XlWinF]::GetWindowThreadProcessId([IntPtr]$excel.Hwnd, [ref]$xpid)
[Console]::Error.WriteLine("PID $xpid")
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($Out, (ConvertTo-Json -Compress -InputObject ([ordered]@{ version = [string]$excel.Version; build = [string]$excel.Build })) + "`n", $enc)
try {
  $wb = $excel.Workbooks.Add()
  while ($wb.Worksheets.Count -lt 2) { [void]$wb.Worksheets.Add() }
  $ws = $wb.Worksheets.Item(1); $ws.Name = 'S'
  $sv = $wb.Worksheets.Item(2); $sv.Name = 'Save'
  $t = $ws.Range('Z100'); $t2 = $ws.Range('Z101')
  $k = 0
  foreach ($it in $items) {
    $k++
    $name = [string]$it.name
    [Console]::Error.WriteLine("$k / $($items.Count) $name")
    $r = [ordered]@{ id = $it.id; name = $name }
    try {
      $acc = @()
      for ($n = 0; $n -le 12; $n++) {
        try { $t.Formula2 = "=$name(" + (ArgList $name $n 'A1') + ")"; $acc += $n } catch { }
      }
      if ($acc.Count -gt 0) {
        $r.kind = 'cell'
        $r.counts = $acc
        $max = $acc[$acc.Count - 1]
        if ($max -ge 11) {
          # paridade: as ultimas aceitas pulam de 2 em 2 (GETPIVOTDATA aceita 2,3,4,6,8...)?
          $step = 1
          if ($acc.Count -ge 2 -and ($acc[$acc.Count - 1] - $acc[$acc.Count - 2]) -eq 2) { $step = 2 }
          $top = 255; if ($step -eq 2 -and (($top - $max) % 2) -ne 0) { $top = 254 }
          $okTop = $true
          try { $t.Formula2 = "=$name(" + (ArgList $name $top 'A1') + ")" } catch { $okTop = $false }
          if ($okTop) { $max = $top }
          else {
            $lo = $max; $hi = $top
            while ($hi - $lo -gt $step) {
              $mid = $lo + [math]::Floor(($hi - $lo) / (2 * $step)) * $step
              if ($mid -le $lo) { $mid = $lo + $step }
              $okMid = $true
              try { $t.Formula2 = "=$name(" + (ArgList $name $mid 'A1') + ")" } catch { $okMid = $false }
              if ($okMid) { $lo = $mid } else { $hi = $mid }
            }
            $max = $lo
          }
          $r.step = $step
        }
        $r.max = $max
        $n0 = $acc[0]
        $r.n = $n0
        $t.Formula2 = "=$name(" + (ArgList $name $n0 'A1') + ")"
        $r.f2 = [string]$t.Formula2
        $r.f = [string]$t.Formula
        $r.f2Local = [string]$t.Formula2Local
        $r.v = Conv $t.Value2
        $sv.Range("A$k").Formula2 = $r.f2
        try { $t2.Formula2Local = $r.f2Local; $r.inv = [string]$t2.Formula2; $r.invLocal = [string]$t2.Formula2Local } catch { $r.invErr = [string]$_.Exception.Message }
        [void]$t2.Clear()
      } else {
        # recusada em celula: funcao so de macro (XLM) ou interna. NAO medir numa
        # folha de macro: la a formula e avaliada ao entrar (CALLER derrubou o Excel).
        $r.kind = 'reserved'

      }
      [void]$t.Clear()
    } catch { $r.err = [string]$_.Exception.Message + ' @' + $_.InvocationInfo.ScriptLineNumber }
    [System.IO.File]::AppendAllText($Out, (ConvertTo-Json -Compress -Depth 8 -InputObject $r) + "`n", $enc)
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
  # a instancia que ESTE script abriu (pelo PID) nao pode ficar para tras
  Start-Sleep -Seconds 2
  $p = Get-Process -Id $xpid -ErrorAction SilentlyContinue
  if ($p -and $p.ProcessName -eq 'EXCEL') { Stop-Process -Id $xpid -Force }
}

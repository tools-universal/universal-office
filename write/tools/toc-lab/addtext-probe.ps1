# NAO FUNCIONA (2026-10-22): com o Word invisivel a faixa de opcoes nem e criada
# (a UIA so ve o painel do documento) -- fica como registro da tentativa.
# Oraculo de "Adicionar Texto" (Referencias > Sumario): o comando so existe na
# faixa de opcoes (nao ha metodo COM nem comando interno), entao a sonda aciona
# a galeria pela UI Automation na janela do Word mostrada FORA da tela, sem
# ativar (SW_SHOWNOACTIVATE, janela de ferramenta) -- o mesmo arranjo do
# page-lab/screen-probe.ps1. Confere a janela em primeiro plano antes e depois
# de cada passo e para se ela mudar. Grava results/addtext-<caso>.txt com o
# estilo e o nivel de topico de cada paragrafo e o w:body. ASCII puro.
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/toc-lab/addtext-probe.ps1 [-Only a,b] [-List]
param([string]$Only, [switch]$List)
. ([string](Join-Path $PSScriptRoot 'toc-oracle-lib.ps1'))
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class W32 {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int cmd);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hwnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] public static extern IntPtr GetWindowLongPtr(IntPtr hwnd, int idx);
  [DllImport("user32.dll", EntryPoint="SetWindowLongPtrW")] public static extern IntPtr SetWindowLongPtr(IntPtr hwnd, int idx, IntPtr v);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr hwnd, uint flags);
}
'@
$AE = [System.Windows.Automation.AutomationElement]
$TS = [System.Windows.Automation.TreeScope]
$fg0 = [W32]::GetForegroundWindow()
function Fg-Check([string]$step) {
  if ([W32]::GetForegroundWindow() -ne $fg0) { throw "primeiro plano mudou em: $step" }
}
function Find-Name($root, [string]$name) {
  $c = New-Object System.Windows.Automation.PropertyCondition($AE::NameProperty, $name)
  return $root.FindFirst($TS::Descendants, $c)
}
function Find-All-Names($root) {
  $out = @()
  foreach ($e in $root.FindAll($TS::Descendants, [System.Windows.Automation.Condition]::TrueCondition)) {
    $n = $e.Current.Name
    if ($n) { $out += ($e.Current.ControlType.ProgrammaticName + ' [' + $n + ']') }
  }
  return $out
}

# janela do documento fora da tela, sem ativar
function Show-Off($doc) {
  $win = $doc.ActiveWindow
  $win.View.Type = 3
  $word.WindowState = 0
  $hwnd = [IntPtr]$win.Hwnd
  $script:ex = [W32]::GetWindowLongPtr($hwnd, -20).ToInt64()
  [void][W32]::SetWindowLongPtr($hwnd, -20, [IntPtr](($script:ex -bor 0x80) -band (-bnot 0x40000)))
  [void][W32]::SetWindowPos($hwnd, [IntPtr]1, -20000, -20000, 1600, 1100, 0x0010 -bor 0x0004)
  [void][W32]::ShowWindow($hwnd, 4)
  Start-Sleep -Milliseconds 1500
  Fg-Check 'mostrar'
  return $hwnd
}
function Hide-Off($hwnd) {
  [void][W32]::ShowWindow($hwnd, 0)
  [void][W32]::SetWindowLongPtr($hwnd, -20, [IntPtr]$script:ex)
}

# aciona Referencias > Adicionar Texto > $item com o cursor no paragrafo $para
function Add-Text($doc, $hwnd, [int]$para, [string]$item, $log) {
  $r = $doc.Paragraphs($para).Range
  $r.SetRange($r.Start + 1, $r.Start + 1)
  $r.Select()
  $root = $AE::FromHandle([W32]::GetAncestor($hwnd, 2))
  $tab = Find-Name $root ('Refer' + [char]0x00EA + 'ncias')
  if (-not $tab) { throw 'guia Referencias nao achada' }
  $tab.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select()
  Start-Sleep -Milliseconds 600
  Fg-Check 'guia'
  $btn = Find-Name $root 'Adicionar Texto'
  if (-not $btn) { throw 'Adicionar Texto nao achado' }
  $btn.GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern).Expand()
  Start-Sleep -Milliseconds 800
  Fg-Check 'expandir'
  # o menu aberto: os itens com o estado marcado antes de escolher
  $desk = $AE::RootElement
  $menu = $null
  foreach ($w in $desk.FindAll($TS::Children, [System.Windows.Automation.Condition]::TrueCondition)) {
    if ($w.Current.ProcessId -eq $root.Current.ProcessId -and $w.Current.NativeWindowHandle -ne $hwnd.ToInt32()) {
      $it = Find-Name $w $item
      if ($it) { $menu = $w; break }
    }
  }
  if (-not $menu) { $it = Find-Name $root $item }
  if (-not $it) { throw "item $item nao achado" }
  $scope = if ($menu) { $menu } else { $root }
  foreach ($k in @('N' + [char]0x00E3 + 'o Mostrar no Sum' + [char]0x00E1 + 'rio', 'N' + [char]0x00ED + 'vel 1', 'N' + [char]0x00ED + 'vel 2', 'N' + [char]0x00ED + 'vel 3', 'N' + [char]0x00ED + 'vel 4')) {
    $e = Find-Name $scope $k
    if ($e) {
      $st = ''
      try { $st = $e.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern).Current.ToggleState } catch { }
      try { if (-not $st) { $st = 'sel=' + $e.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Current.IsSelected } } catch { }
      $log.Add("menu [$k] $st") | Out-Null
    }
  }
  try { $it.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke() }
  catch { $it.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select() }
  Start-Sleep -Milliseconds 800
  Fg-Check 'invocar'
}

$NL = 'N' + [char]0x00ED + 'vel '
$NOT = 'N' + [char]0x00E3 + 'o Mostrar no Sum' + [char]0x00E1 + 'rio'
# p1 Normal, p2 Titulo 1, p3 Titulo 2, p4 Normal com nivel direto 2, p5 Titulo (Title), p6 Normal
function AtDoc($doc, $sel) {
  $sel.TypeText('Normal'); $sel.TypeParagraph()
  $sel.TypeText('Titulo um'); $sel.Paragraphs(1).Style = -2; $sel.TypeParagraph(); $sel.Paragraphs(1).Style = -1
  $sel.TypeText('Titulo dois'); $sel.Paragraphs(1).Style = -3; $sel.TypeParagraph(); $sel.Paragraphs(1).Style = -1
  $sel.TypeText('Direto dois'); $sel.Paragraphs(1).OutlineLevel = 2; $sel.TypeParagraph(); $sel.Paragraphs(1).OutlineLevel = 10
  $sel.TypeText('Capa'); $sel.Paragraphs(1).Style = -63; $sel.TypeParagraph(); $sel.Paragraphs(1).Style = -1
  $sel.TypeText('Fim')
}

if ($List) {
  $doc = $word.Documents.Add()
  $h = Show-Off $doc
  try {
    $root = $AE::FromHandle([W32]::GetAncestor($h, 2))
    [System.IO.File]::WriteAllLines([string](Join-Path $outDir 'addtext-uia-list0.txt'), (Find-All-Names $root))
    $tab = Find-Name $root ('Refer' + [char]0x00EA + 'ncias')
    $tab.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select()
    Start-Sleep -Milliseconds 600
    Fg-Check 'guia'
    [System.IO.File]::WriteAllLines([string](Join-Path $outDir 'addtext-uia-list.txt'), (Find-All-Names $root))
  } finally { Hide-Off $h; $doc.Close(0) }
  Close-Word
  return
}

$cases = @(
  @('at-normal-l1', 1, ($NL + '1')), @('at-normal-l2', 1, ($NL + '2')), @('at-h1-l2', 2, ($NL + '2')),
  @('at-h1-not', 2, $NOT), @('at-h2-not', 3, $NOT), @('at-direct-l1', 4, ($NL + '1')), @('at-direct-not', 4, $NOT),
  @('at-title-l1', 5, ($NL + '1')), @('at-normal-not', 1, $NOT)
)
foreach ($c in $cases) {
  $script:cs = $c
  Run-Exp $c[0] { param($d, $s) AtDoc $d $s } { param($d, $s, $log)
    $h = Show-Off $d
    try { Add-Text $d $h $script:cs[1] $script:cs[2] $log } finally { Hide-Off $h }
  }
}
# com um sumario de estilos (\t Titulo;1): Nivel 1 aplica o estilo do nivel?
Run-Exp 'at-tstyles-l1' { param($d, $s) AtDoc $d $s; $s.EndKey(6) | Out-Null; $s.TypeParagraph(); $t = $d.TablesOfContents.Add($s.Range, $false, 1, 3, $false, '', $true, $true, '', $true, $true, $false); $t.HeadingStyles.Add(-63, 1) | Out-Null; $t.Update() | Out-Null } { param($d, $s, $log)
  $h = Show-Off $d
  try { Add-Text $d $h 1 ($NL + '1') $log } finally { Hide-Off $h }
}
"foreground unchanged=" + ([W32]::GetForegroundWindow() -eq $fg0)
Close-Word

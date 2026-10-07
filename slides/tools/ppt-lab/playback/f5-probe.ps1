# Sonda do F5 (apresentacao AO VIVO) no PowerPoint real via COM: mede o que o
# export de video (CreateVideo) nao mostra - cliques com intervalo gravado,
# clique adiantado, comando durante a transicao, voltar (desfaz passo / slide
# anterior), slide oculto, "avancar ao clicar" desligado, fim da apresentacao.
#
# ABRE UMA APRESENTACAO EM TELA CHEIA (usa o PowerPoint aberto, se houver;
# fecha so o que abriu). So rodar com o aval do usuario.
#
# Estado lido do SlideShowView (slide, clique, estado, SlideElapsedTime) a cada
# ~15 ms; grava so as mudancas em results/playback/_probe/f5/f5-probe.json.
# Cenarios H-L capturam SO a janela da apresentacao (PrintWindow no HWND dela,
# nunca a area de trabalho) em miniaturas cap*.png + amostra de cor do fundo e
# de cada caixa; J manda um clique de mouse por mensagem a essa janela.
#
# Uso: powershell -ExecutionPolicy Bypass -File tools/ppt-lab/playback/f5-probe.ps1 [-Only A,B,...]
param([string]$Out = '', [string[]]$Only = @())
$ErrorActionPreference = 'Stop'
$labRoot = Split-Path $PSScriptRoot
$outDir = if ($Out) { $Out } else { Join-Path $labRoot 'results\playback\_probe\f5' }
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$deck = Join-Path $outDir 'f5-probe.pptx'
$jsonPath = Join-Path $outDir 'f5-probe.json'
$Only = @($Only | ForEach-Object { $_ -split ',' } | Where-Object { $_ })  # -File passa 'A,B' como 1 texto
function Want([string]$k) { return ($Only.Count -eq 0) -or ($Only -contains $k) }

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Text; using System.Drawing; using System.Runtime.InteropServices;
public static class SlideWin {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr l);
  // janela da apresentacao (classe screenClass) do processo `pid` cujo titulo contem `part`
  public static IntPtr FindShow(uint pid, string part) {
    IntPtr found = IntPtr.Zero;
    EnumWindows((h, l) => {
      uint p; GetWindowThreadProcessId(h, out p);
      if (p != pid || !IsWindowVisible(h)) return true;
      var c = new StringBuilder(64); GetClassName(h, c, 64);
      var t = new StringBuilder(256); GetWindowText(h, t, 256);
      if (c.ToString() == "screenClass" && t.ToString().Contains(part)) { found = h; return false; }
      return true;
    }, IntPtr.Zero);
    return found;
  }
  [DllImport("user32.dll")] static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint f);
  [DllImport("user32.dll")] static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  public static Bitmap Capture(IntPtr h) {
    RECT r; GetClientRect(h, out r);
    var bmp = new Bitmap(Math.Max(1, r.R - r.L), Math.Max(1, r.B - r.T));
    using (var g = Graphics.FromImage(bmp)) { IntPtr dc = g.GetHdc(); PrintWindow(h, dc, 3); g.ReleaseHdc(dc); }
    return bmp;
  }
  public static void Click(IntPtr h, int x, int y) {
    IntPtr lp = (IntPtr)((y << 16) | (x & 0xFFFF));
    PostMessage(h, 0x0200, IntPtr.Zero, lp);
    PostMessage(h, 0x0201, (IntPtr)1, lp);
    PostMessage(h, 0x0202, IntPtr.Zero, lp);
  }
}
'@

$wasRunning = @(Get-Process POWERPNT -ErrorAction SilentlyContinue).Count -gt 0
$ppt = New-Object -ComObject PowerPoint.Application

function RGB([int]$r, [int]$g, [int]$b) { return $r + ($g -shl 8) + ($b -shl 16) }

# ---- deck de teste ----
#  1 P1: esmaecer 3 s + avancar apos 2 s, sem animacao   (relogio do intervalo: inicio ou fim da transicao?)
#  2 P2: sem transicao + avancar apos 3 s + 3 cliques     (cliques automaticos; clique adiantado; desfazer)
#  3 P3: esmaecer 0,5 s + avancar apos 2 s + 2 cliques
#  4 P4: sem transicao, sem intervalo + 2 cliques          (voltar: estado do slide anterior)
#  5 P5: esmaecer 3 s, sem intervalo + 1 clique            (comandos durante a transicao)
#  6 P6: OCULTO
#  7 P7: "avancar ao clicar" desligado, sem intervalo
#  8 P8: sem transicao, sem intervalo
#  9 Q1: sem transicao (vermelho)                       (direcao da transicao ao VOLTAR)
# 10 Q2: empurrar 3 s (azul), sem intervalo
function Add-Slide($p, [string]$title, [int]$bg) {
  $s = $p.Slides.Add($p.Slides.Count + 1, 12)
  $s.FollowMasterBackground = 0
  $s.Background.Fill.Solid()
  $s.Background.Fill.ForeColor.RGB = $bg
  $t = $s.Shapes.AddTextbox(1, 30, 20, 900, 60)
  $t.TextFrame.TextRange.Text = $title
  $t.TextFrame.TextRange.Font.Size = 30
  return $s
}
function Add-Clicks($s, [int]$n) {
  for ($i = 0; $i -lt $n; $i++) {
    $b = $s.Shapes.AddShape(1, 40 + $i * 300, 200, 260, 160)
    $b.Fill.ForeColor.RGB = RGB 20 40 160
    $b.TextFrame.TextRange.Text = 'clique ' + ($i + 1)
    $b.TextFrame.TextRange.Font.Size = 28
    $null = $s.TimeLine.MainSequence.AddEffect($b, 1, 0, 1) # aparecer, ao clicar
  }
}
function Set-Trans($s, [int]$effect, [double]$dur, [int]$onClick, [double]$adv) {
  $t = $s.SlideShowTransition
  $t.EntryEffect = $effect
  if ($dur -ge 0) { $t.Duration = $dur }
  $t.AdvanceOnClick = $onClick
  if ($adv -ge 0) { $t.AdvanceOnTime = -1; $t.AdvanceTime = $adv } else { $t.AdvanceOnTime = 0 }
}

$p = $null
$log = New-Object System.Collections.ArrayList
$sw = [Diagnostics.Stopwatch]::StartNew()
$v = $null
$win = $null

function Snap([string]$tag) {
  $st = -1; $idx = -1; $ci = -1; $cc = -1; $el = -1
  try { $st = $v.State } catch { $st = -9 }
  try { $idx = $v.Slide.SlideIndex } catch {}
  try { $ci = $v.GetClickIndex(); $cc = $v.GetClickCount() } catch {}
  try { $el = [Math]::Round([double]$v.SlideElapsedTime, 3) } catch {}
  return [pscustomobject]@{ t = [int]$sw.ElapsedMilliseconds; tag = $tag; state = $st; slide = $idx; click = $ci; clicks = $cc; elapsed = $el }
}
function Show($s) {
  Write-Host ("{0,6} ms  {1,-26} state={2} slide={3} click={4}/{5} elapsed={6}" -f $s.t, $s.tag, $s.state, $s.slide, $s.click, $s.clicks, $s.elapsed)
}
$script:lastKey = ''
function Mark([string]$tag) {
  $s = Snap $tag
  [void]$log.Add($s)
  $script:lastKey = "$($s.state)|$($s.slide)|$($s.click)"
  Show $s
}
function Watch([double]$secs) {
  $end = $sw.ElapsedMilliseconds + $secs * 1000
  while ($sw.ElapsedMilliseconds -lt $end) {
    $s = Snap ''
    $key = "$($s.state)|$($s.slide)|$($s.click)"
    if ($key -ne $script:lastKey) {
      $s.tag = 'mudou'
      [void]$log.Add($s)
      $script:lastKey = $key
      Show $s
    }
    Start-Sleep -Milliseconds 15
  }
}
function Cmd([string]$what) {
  switch ($what) {
    'next' { $v.Next() }
    'prev' { $v.Previous() }
  }
  Mark $what
}
function Goto([int]$n) {
  $v.GotoSlide($n, -1)
  Mark "goto $n"
}
function Scenario([string]$name) {
  [void]$log.Add([pscustomobject]@{ t = [int]$sw.ElapsedMilliseconds; tag = "== $name" })
  Write-Host "== $name"
}
function Hex($c) { return ('{0:X2}{1:X2}{2:X2}' -f $c.R, $c.G, $c.B) }
$script:capN = 0
# Captura SO a janela da apresentacao; amostra o fundo e o canto de baixo de cada caixa.
function Cap([string]$tag, [switch]$Full) {
  $script:capN++
  $bmp = [SlideWin]::Capture($script:showH)
  $W = $bmp.Width; $H = $bmp.Height
  $sc = [Math]::Min($W / 960.0, $H / 540.0); $ox = ($W - 960 * $sc) / 2; $oy = ($H - 540 * $sc) / 2
  $boxes = @()
  for ($i = 0; $i -lt 3; $i++) {
    $boxes += Hex ($bmp.GetPixel([int]($ox + (70 + $i * 300) * $sc), [int]($oy + 345 * $sc)))
  }
  $bg = Hex ($bmp.GetPixel([int]($ox + 930 * $sc), [int]($oy + 520 * $sc)))
  $lr = (Hex ($bmp.GetPixel([int]($ox + 120 * $sc), [int]($oy + 470 * $sc)))) + '|' + (Hex ($bmp.GetPixel([int]($ox + 480 * $sc), [int]($oy + 470 * $sc)))) + '|' + (Hex ($bmp.GetPixel([int]($ox + 840 * $sc), [int]($oy + 470 * $sc))))
  if ($Full) { $bmp.Save((Join-Path $outDir ('cap{0:D2}-full.png' -f $script:capN)), [System.Drawing.Imaging.ImageFormat]::Png) }
  $th = New-Object System.Drawing.Bitmap 480, ([int](480 * $H / $W))
  $g = [System.Drawing.Graphics]::FromImage($th); $g.DrawImage($bmp, 0, 0, $th.Width, $th.Height); $g.Dispose()
  $file = Join-Path $outDir ('cap{0:D2}-{1}.png' -f $script:capN, ($tag -replace '[^a-zA-Z0-9]+', '_'))
  $th.Save($file, [System.Drawing.Imaging.ImageFormat]::Png); $th.Dispose(); $bmp.Dispose()
  $s = Snap ("cap " + $tag)
  $s | Add-Member -NotePropertyName bg -NotePropertyValue $bg
  $s | Add-Member -NotePropertyName boxes -NotePropertyValue ($boxes -join ',')
  $s | Add-Member -NotePropertyName lmr -NotePropertyValue $lr
  [void]$log.Add($s)
  Write-Host ("{0,6} ms  {1,-26} slide={2} click={3}/{4} bg={5} caixas={6} esq|meio|dir={7}" -f $s.t, $s.tag, $s.slide, $s.click, $s.clicks, $s.bg, $s.boxes, $s.lmr)
}
# Clique de mouse enviado por mensagem a janela da apresentacao (nao move o cursor).
function MouseClick([string]$tag) {
  $bmp = [SlideWin]::Capture($script:showH)
  $x = [int]($bmp.Width * 0.5); $y = [int]($bmp.Height * 0.9); $bmp.Dispose()
  [SlideWin]::Click($script:showH, $x, $y)
  Start-Sleep -Milliseconds 60
  Mark ("mouse " + $tag)
}

try {
  $p = $ppt.Presentations.Add(0)
  $p.PageSetup.SlideWidth = 960
  $p.PageSetup.SlideHeight = 540
  $s = Add-Slide $p 'P1 - fade 3s + avanca apos 2s, sem animacao' (RGB 220 235 250)
  Set-Trans $s 3849 3 -1 2
  $s = Add-Slide $p 'P2 - sem transicao + avanca apos 3s + 3 cliques' (RGB 250 235 220)
  Set-Trans $s 0 -1 -1 3
  Add-Clicks $s 3
  $s = Add-Slide $p 'P3 - fade 0.5s + avanca apos 2s + 2 cliques' (RGB 225 245 225)
  Set-Trans $s 3849 0.5 -1 2
  Add-Clicks $s 2
  $s = Add-Slide $p 'P4 - sem transicao, sem intervalo, 2 cliques' (RGB 245 240 220)
  Set-Trans $s 0 -1 -1 -1
  Add-Clicks $s 2
  $s = Add-Slide $p 'P5 - fade 3s, sem intervalo, 1 clique' (RGB 235 225 245)
  Set-Trans $s 3849 3 -1 -1
  Add-Clicks $s 1
  $s = Add-Slide $p 'P6 - OCULTO' (RGB 250 210 210)
  Set-Trans $s 0 -1 -1 -1
  $s.SlideShowTransition.Hidden = -1
  $s = Add-Slide $p 'P7 - avancar ao clicar DESLIGADO' (RGB 230 230 245)
  Set-Trans $s 0 -1 0 -1
  $s = Add-Slide $p 'P8' (RGB 230 230 230)
  Set-Trans $s 0 -1 -1 -1
  $s = Add-Slide $p 'Q1 - vermelho' (RGB 230 60 60)
  Set-Trans $s 0 -1 -1 -1
  $s = Add-Slide $p 'Q2 - azul, empurrar 3s' (RGB 60 90 230)
  Set-Trans $s 3853 3 -1 -1
  $p.SaveAs($deck)
  # sem janela o Run() devolve nulo: reabre com janela (como o F5 de verdade)
  $p.Close()
  $p = $ppt.Presentations.Open($deck, -1, 0, -1)

  $ss = $p.SlideShowSettings
  $ss.ShowType = 1          # orador (tela cheia) = F5
  $ss.AdvanceMode = 2       # usar intervalos
  $ss.LoopUntilStopped = 0
  $ss.RangeType = 1
  try { $ss.ShowPresenterView = 0 } catch {}

  $sw.Restart()
  $win = $ss.Run()          # volta so depois da transicao do 1o slide
  if (-not $win) { $win = $p.SlideShowWindow }
  if (-not $win) { throw 'a apresentacao nao abriu (SlideShowWindow nulo)' }
  $v = $win.View
  Mark 'run'
  # janela da apresentacao (SlideShowWindow.HWND vem vazio): procura no processo do PowerPoint
  $appPid = [uint32]0
  $null = [SlideWin]::GetWindowThreadProcessId([IntPtr][long]$ppt.HWND, [ref]$appPid)
  $script:showH = [IntPtr]::Zero
  for ($k = 0; $k -lt 20 -and $script:showH -eq [IntPtr]::Zero; $k++) {
    $script:showH = [SlideWin]::FindShow($appPid, 'f5-probe')
    if ($script:showH -eq [IntPtr]::Zero) { Start-Sleep -Milliseconds 100 }
  }
  Write-Host ('janela da apresentacao: ' + $script:showH)

  if (Want 'A') {
    Scenario 'A: P1 (fade 3 s, intervalo 2 s) e P2 sozinho (3 cliques, 3 s)'
    Watch 10
  }
  if (Want 'B') {
    Scenario 'B: P2 com clique ADIANTADO em +0,3 s'
    Goto 2
    Watch 0.3
    Cmd 'next'
    Watch 4
  }
  if (Want 'C') {
    Scenario 'C: P3 sozinho via GotoSlide (fade 0,5 s, intervalo 2 s, 2 cliques)'
    Goto 3
    Watch 3
  }
  if (Want 'D') {
    Scenario 'D: voltar de P5 para P4 (P4 com 2 cliques dados)'
    Goto 4
    Watch 0.3
    Cmd 'next'
    Watch 0.3
    Cmd 'next'
    Watch 0.3
    Cmd 'next'
    Watch 3.4
    Cmd 'prev'
    Watch 0.6
    Cmd 'next'
    Watch 0.6
  }
  if (Want 'E') {
    Scenario 'E: P5 (fade 3 s): comandos em +0,5 s e +0,9 s'
    Goto 5
    Watch 0.5
    Cmd 'next'
    Watch 0.4
    Cmd 'next'
    Watch 3.2
  }
  if (Want 'F') {
    Scenario 'F: voltar para P3 (intervalo 2 s): o intervalo recomeca?'
    Goto 4
    Watch 0.3
    Cmd 'prev'
    Watch 4
    Cmd 'next'
    Watch 0.6
  }
  if (Want 'H') {
    Scenario 'H: (imagem) voltar de P5 para P4 sem intervalo; proximos comandos'
    Goto 4
    Watch 0.3
    Cmd 'next'
    Watch 0.3
    Cmd 'next'
    Watch 0.3
    Cap 'P4 com 2 cliques'
    Cmd 'next'
    Watch 3.4
    Cap 'P5 parado'
    Cmd 'prev'
    Cap 'P4 logo apos voltar'
    Watch 0.6
    Cap 'P4 0,6 s apos voltar'
    Cmd 'next'
    Cap 'apos 1o comando'
    Watch 0.6
    Cmd 'next'
    Cap 'apos 2o comando'
    Watch 0.6
  }
  if (Want 'I') {
    Scenario 'I: desfazer passo em slide COM intervalo (P2: cliques em 0,75/1,5/2,25 s, 3 s)'
    Goto 2
    Watch 1.7
    Cmd 'prev'
    Cap 'P2 apos desfazer'
    Watch 3.5
  }
  if (Want 'J') {
    Scenario 'J: clique de MOUSE (mensagem a janela): P4 (avanca ao clicar) e P7 (desligado)'
    Goto 4
    Watch 0.4
    MouseClick 'P4'
    Watch 0.4
    Goto 7
    Watch 0.4
    MouseClick 'P7'
    Watch 0.6
    Cmd 'next'
    Watch 0.4
  }
  if (Want 'L') {
    Scenario 'L: (imagem) comando no meio da transicao de P5'
    Goto 4
    Watch 0.3
    Goto 5
    Cap 'P5 no meio da transicao'
    Cmd 'next'
    Cap 'P5 apos comando na transicao'
  }
  if (Want 'M') {
    Scenario 'M: (imagem) direcao de EMPURRAR na ida (Q1->Q2) e na volta (Q2->Q1)'
    Goto 9
    Watch 0.3
    Cmd 'next'
    Watch 1.0
    Cap 'empurrar ida 1s'
    Watch 2.6
    Cmd 'prev'
    Watch 1.0
    Cap 'empurrar volta 1s'
    Watch 2.6
    Cap 'volta concluida'
  }
  if (Want 'N') {
    Scenario 'N: slide COM intervalo rebobinado pelo voltar; depois cliques manuais'
    Goto 2
    Watch 1.7
    Cmd 'prev'
    Watch 0.5
    Cmd 'next'
    Watch 0.3
    Cmd 'next'
    Watch 0.3
    Cmd 'next'
    Watch 4
    Cmd 'next'
    Watch 0.5
  }
  if (Want 'O') {
    Scenario 'O: slide COM intervalo: clique manual e voltar antes dos automaticos'
    Goto 2
    Watch 0.3
    Cmd 'next'
    Watch 0.2
    Cmd 'prev'
    Watch 3.5
  }
  if (Want 'M2') {
    Scenario 'M2: (imagem) direcao de EMPURRAR na ida, em +0,5 s'
    Goto 9
    Watch 0.3
    Cmd 'next'
    Watch 0.5
    Cap 'empurrar ida 0,5s'
    Watch 3
  }
  if (Want 'P') {
    Scenario 'P: rebobinado (intervalo 3 s, 3 cliques): cliques manuais RAPIDOS logo apos voltar'
    Goto 2
    Watch 1.7
    Cmd 'prev'
    Watch 0.2
    Cmd 'next'
    Watch 0.15
    Cmd 'next'
    Watch 0.15
    Cmd 'next'
    Watch 5
    Scenario 'P2: rebobinado: espera 2 s e entao cliques manuais'
    Goto 2
    Watch 1.7
    Cmd 'prev'
    Watch 2
    Cmd 'next'
    Watch 0.15
    Cmd 'next'
    Watch 0.15
    Cmd 'next'
    Watch 5
  }
  if (Want 'K') {
    Scenario 'K: (imagem) tela de fim'
    Goto $p.Slides.Count
    Watch 3.3
    Cmd 'next'
    Watch 0.5
    Cap 'tela de fim' -Full
    Cmd 'next'
    Watch 0.6
  }
} finally {
  try { if ($v) { $v.Exit() } } catch {}
  try { if ($p) { $p.Saved = -1; $p.Close() } } catch {}
  if (-not $wasRunning) { try { $ppt.Quit() } catch {} }
  $log | ConvertTo-Json -Depth 3 | Set-Content -Encoding UTF8 $jsonPath
  Write-Host "log: $jsonPath"
}

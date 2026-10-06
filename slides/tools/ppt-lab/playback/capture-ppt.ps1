# ORÁCULO da reprodução automática: o PowerPoint real (COM) toca cada
# apresentação com os intervalos gravados e RENDERIZA QUADRO A QUADRO via
# Presentation.CreateVideo (determinístico, mais rápido que tempo real).
# Para cada arquivo (.pptx ou .ppt) grava em <OutRoot>/<deck>/<ext>/:
#   ppt.mp4            vídeo H.264 (Height p, Fps — o app usa passo inteiro de
#                      ms: 30 fps => 33 ms/quadro)
#   ppt-manifest.json  dump COM: transição/intervalo de cada slide + efeitos
#                      da sequência principal (tipo, gatilho, duração, atraso…)
#   ppt-slides/slideN.png  estado FINAL de cada slide (Slide.Export)
#
# Uso: powershell -ExecutionPolicy Bypass -File capture-ppt.ps1 -OutRoot <dir> -Files "a.pptx|b.ppt"
#        [-Fps 30] [-Height 720] [-DefaultSlideSec 3] [-Quality 100] [-SkipVideo]
param(
  [Parameter(Mandatory = $true)][string]$OutRoot,
  # caminhos separados por '|' (o modo -File não divide arrays)
  [Parameter(Mandatory = $true)][string]$Files,
  [int]$Fps = 30,
  [int]$Height = 720,
  [int]$DefaultSlideSec = 3,
  [int]$Quality = 100,
  [switch]$SkipVideo
)
$ErrorActionPreference = 'Stop'
$pia = [Reflection.Assembly]::LoadWithPartialName('Microsoft.Office.Interop.PowerPoint')
function EnumName([string]$enum, $value) {
  if (-not $pia) { return "$value" }
  $t = $pia.GetType("Microsoft.Office.Interop.PowerPoint.$enum")
  if (-not $t) { return "$value" }
  $n = [Enum]::GetName($t, [int]$value)
  if ($n) { return $n } else { return "$value" }
}
function Get-Safe([scriptblock]$b) {
  try {
    $v = (& $b)
    # JSON não tem Infinity/NaN (o COM devolve Infinity p/ duração indefinida)
    if ($v -is [double] -and ([double]::IsInfinity($v) -or [double]::IsNaN($v))) { return $null }
    return $v
  } catch { return $null }
}
function Write-Json($obj, [string]$path) {
  $json = $obj | ConvertTo-Json -Depth 8
  [IO.File]::WriteAllText($path, $json, (New-Object System.Text.UTF8Encoding($false)))
}

function Effect-Info($e) {
  $t = $e.Timing
  return [ordered]@{
    type = [int]$e.EffectType
    typeName = (EnumName 'MsoAnimEffect' $e.EffectType)
    exit = [bool]($e.Exit -ne 0)
    trigger = (Get-Safe { [int]$t.TriggerType })
    triggerName = (EnumName 'MsoAnimTriggerType' $t.TriggerType)
    duration = (Get-Safe { [double]$t.Duration })
    delay = (Get-Safe { [double]$t.TriggerDelayTime })
    repeat = (Get-Safe { [int]$t.RepeatCount })
    autoReverse = (Get-Safe { [bool]($t.AutoReverse -ne 0) })
    rewind = (Get-Safe { [bool]($t.RewindAtEnd -ne 0) })
    smoothStart = (Get-Safe { [bool]($t.SmoothStart -ne 0) })
    smoothEnd = (Get-Safe { [bool]($t.SmoothEnd -ne 0) })
    shape = (Get-Safe { $e.Shape.Name })
    shapeId = (Get-Safe { [int]$e.Shape.Id })
    paragraph = (Get-Safe { [int]$e.Paragraph })
    textUnit = (Get-Safe { [int]$e.EffectInformation.TextUnitEffect })
    afterEffect = (Get-Safe { [int]$e.EffectInformation.AfterEffect })
    displayName = (Get-Safe { $e.DisplayName })
  }
}

$ppt = $null
try {
  $ppt = New-Object -ComObject PowerPoint.Application
  try { $ppt.WindowState = 2 } catch {}
  $ppt.DisplayAlerts = 1
  foreach ($file in ($Files -split '\|' | Where-Object { $_ })) {
    $full = (Resolve-Path $file).Path
    $deck = [IO.Path]::GetFileNameWithoutExtension($full)
    $ext = [IO.Path]::GetExtension($full).TrimStart('.').ToLower()
    $dir = Join-Path $OutRoot "$deck\$ext"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Write-Host "== $deck.$ext"
    $pres = $ppt.Presentations.Open($full, $true, $false, $false)
    try {
      $slides = @()
      for ($i = 1; $i -le $pres.Slides.Count; $i++) {
        $s = $pres.Slides.Item($i)
        $tr = $s.SlideShowTransition
        $title = $null
        foreach ($sh in $s.Shapes) {
          if ($sh.HasTextFrame -and $sh.TextFrame.HasText) {
            if ($sh.Name -eq 'Titulo') { $title = $sh.TextFrame.TextRange.Text; break }
            if (-not $title) { $title = $sh.TextFrame.TextRange.Text }
          }
        }
        if ($title -and $title.Length -gt 80) { $title = $title.Substring(0, 80) }
        $fx = @()
        $seq = $s.TimeLine.MainSequence
        for ($j = 1; $j -le $seq.Count; $j++) { $fx += , (Effect-Info $seq.Item($j)) }
        $inter = 0
        for ($j = 1; $j -le $s.TimeLine.InteractiveSequences.Count; $j++) { $inter += $s.TimeLine.InteractiveSequences.Item($j).Count }
        $slides += , ([ordered]@{
          index = $i
          hidden = [bool]($tr.Hidden -ne 0)
          title = $title
          transition = [ordered]@{
            effect = [int]$tr.EntryEffect
            effectName = (EnumName 'PpEntryEffect' $tr.EntryEffect)
            duration = (Get-Safe { [double]$tr.Duration })
            speed = (Get-Safe { [int]$tr.Speed })
            advanceOnClick = [bool]($tr.AdvanceOnClick -ne 0)
            advanceOnTime = [bool]($tr.AdvanceOnTime -ne 0)
            advanceTime = [double]$tr.AdvanceTime
          }
          effects = $fx
          interactiveEffects = $inter
          mediaShapes = @($s.Shapes | Where-Object { $_.Type -eq 16 }).Count
        })
      }
      # estado final de cada slide (referência estática)
      $png = Join-Path $dir 'ppt-slides'
      if (Test-Path $png) { Remove-Item -Recurse -Force $png }
      New-Item -ItemType Directory -Force -Path $png | Out-Null
      $w = [int][Math]::Round($Height * $pres.PageSetup.SlideWidth / $pres.PageSetup.SlideHeight)
      for ($i = 1; $i -le $pres.Slides.Count; $i++) { $pres.Slides.Item($i).Export((Join-Path $png "slide$i.png"), 'PNG', $w, $Height) }

      $renderSec = $null
      $mp4 = Join-Path $dir 'ppt.mp4'
      if (-not $SkipVideo) {
        if (Test-Path $mp4) { Remove-Item -Force $mp4 }
        $sw = [Diagnostics.Stopwatch]::StartNew()
        $pres.CreateVideo($mp4, $true, $DefaultSlideSec, $Height, $Fps, $Quality)
        while ($true) {
          $st = $pres.CreateVideoStatus
          if ($st -eq 3) { break }
          if ($st -eq 4) { throw "CreateVideo falhou ($deck.$ext)" }
          Start-Sleep -Milliseconds 200
        }
        $renderSec = [Math]::Round($sw.Elapsed.TotalSeconds, 2)
        Write-Host "   video ok em $renderSec s"
      }
      Write-Json ([ordered]@{
        file = $full
        format = $ext
        powerpoint = "$($ppt.Version) build $($ppt.Build)"
        slideWidthPt = [double]$pres.PageSetup.SlideWidth
        slideHeightPt = [double]$pres.PageSetup.SlideHeight
        fps = $Fps
        height = $Height
        width = $w
        defaultSlideSec = $DefaultSlideSec
        quality = $Quality
        renderSeconds = $renderSec
        slides = $slides
      }) (Join-Path $dir 'ppt-manifest.json')
    } finally {
      $pres.Close()
    }
  }
} finally {
  if ($ppt) { $ppt.Quit(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) }
}

# Exporta cada slide de samples/<deck>.pptx como PNG pelo PowerPoint (o
# oráculo estático) → results/stress/<deck>/ppt/slideN.png.
#
# Seguro com o PowerPoint do usuário ABERTO: o COM se acopla à instância em
# uso, então nada de janela (Open sem janela), nada de WindowState e nada de
# Quit — só fecha a apresentação que abriu. Se o PowerPoint não estava
# rodando, encerra o que abriu.
#
# Uso: powershell -ExecutionPolicy Bypass -File tools/ppt-lab/export-deck.ps1 -Deck animated-intro [-Width 1280]
param(
  [Parameter(Mandatory = $true)][string]$Deck,
  [int]$Width = 1280
)
$ErrorActionPreference = 'Stop'
$labRoot = $PSScriptRoot
$slidesRoot = Split-Path (Split-Path $labRoot)
$src = Join-Path $slidesRoot "samples\$Deck.pptx"
$out = Join-Path $labRoot "results\stress\$Deck\ppt"
if (-not (Test-Path $src)) { throw "deck não encontrado: $src" }
New-Item -ItemType Directory -Force -Path $out | Out-Null

$wasRunning = @(Get-Process POWERPNT -ErrorAction SilentlyContinue).Count -gt 0
$ppt = New-Object -ComObject PowerPoint.Application
$pres = $null
try {
  # ReadOnly, sem título, SEM JANELA
  $pres = $ppt.Presentations.Open($src, $true, $false, $false)
  # aquecimento: o app carrega as fontes EMBUTIDAS de forma assíncrona — os
  # primeiros slides exportados logo após abrir saíam com a fonte substituta
  $pres.Slides.Item(1).Export((Join-Path $env:TEMP 'export-deck-warm.png'), 'PNG', 160, 90)
  Start-Sleep -Seconds 3
  $h = [int][Math]::Round($Width * $pres.PageSetup.SlideHeight / $pres.PageSetup.SlideWidth)
  for ($i = 1; $i -le $pres.Slides.Count; $i++) {
    $pres.Slides.Item($i).Export((Join-Path $out "slide$i.png"), 'PNG', $Width, $h)
  }
  Write-Host "$Deck : exportados $($pres.Slides.Count) slides ($Width x $h)"
} finally {
  if ($pres) { try { $pres.Close() } catch {} }
  if (-not $wasRunning) { try { $ppt.Quit() } catch {} }
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt)
}

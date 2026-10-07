# Deck pb-graficos-partes: gráfico e SmartArt animados POR PARTES.
# O COM não cria esses builds; o fluxo é: (1) o PowerPoint gera gráficos e
# SmartArt reais (deck-base), (2) gen-graficos-partes.py escreve a animação
# por partes no XML (ECMA-376), (3) o PowerPoint ABRE e REGRAVA o deck — se o
# build sobrevive, o app aceitou, e o arquivo regravado (.pptx + .ppt) é a
# referência canônica do corpus.
#
# Só o passo 1 precisa de JANELA (AddChart2 e SmartArtLayouts não existem sem
# ela): roda só quando o deck-base falta, ou com -Rebuild. O resto é sem janela.
#
# Uso: powershell -ExecutionPolicy Bypass -File tools/ppt-lab/playback/gen-graficos-partes.ps1 [-Rebuild]
param([switch]$Rebuild)
$ErrorActionPreference = 'Stop'
$labRoot = Split-Path $PSScriptRoot
$slidesRoot = Split-Path (Split-Path $labRoot)
$outDir = Join-Path $slidesRoot 'samples\playback'
$work = Join-Path $labRoot 'results\playback\_probe\graficos'
New-Item -ItemType Directory -Force -Path $work | Out-Null
$base = Join-Path $work 'base.pptx'
$texto = Join-Path $work 'base-texto.pptx'
$crafted = Join-Path $work 'crafted.pptx'

function RGB([int]$r, [int]$g, [int]$b) { return $r + ($g -shl 8) + ($b -shl 16) }
# vigia: se o PowerPoint travar num diálogo (reparo), mata em 3 min SÓ o processo aberto aqui
$before = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$ppt = New-Object -ComObject PowerPoint.Application
$mine = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id } | ForEach-Object { $_.Id })
$watch = Start-Job -ArgumentList (,$mine) -ScriptBlock { param($ids) Start-Sleep -Seconds 180; foreach ($i in $ids) { Stop-Process -Id $i -Force -ErrorAction SilentlyContinue } }
try {
  $ppt.DisplayAlerts = 1
  if ($Rebuild -or -not (Test-Path $base)) {
    try { $ppt.WindowState = 2 } catch {}
    # 1) deck-base (gráficos precisam de apresentação COM janela)
    $p = $ppt.Presentations.Add(-1)
    $p.PageSetup.SlideWidth = 960; $p.PageSetup.SlideHeight = 540
    $charts = @(@(51, 'G1 colunas por SÉRIE'), @(51, 'G2 colunas por CATEGORIA'), @(51, 'G3 colunas por ELEMENTO da série'),
      @(51, 'G4 colunas por ELEMENTO da categoria'), @(5, 'G5 pizza por CATEGORIA'), @(4, 'G6 linhas por SÉRIE'))
    foreach ($c in $charts) {
      $s = $p.Slides.Add($p.Slides.Count + 1, 12)
      $s.FollowMasterBackground = 0; $s.Background.Fill.Solid(); $s.Background.Fill.ForeColor.RGB = (RGB 244 244 240)
      $t = $s.Shapes.AddTextbox(1, 30, 10, 900, 40); $t.TextFrame.TextRange.Text = $c[1]; $t.TextFrame.TextRange.Font.Size = 24
      $ch = $s.Shapes.AddChart2(-1, $c[0], 80, 70, 800, 440)
      try { $ch.Chart.ChartData.Workbook.Close() } catch {}
      $tr = $s.SlideShowTransition; $tr.EntryEffect = 3849; $tr.Duration = 0.5; $tr.AdvanceOnClick = -1; $tr.AdvanceOnTime = -1; $tr.AdvanceTime = 1
    }
    foreach ($d in @('S1 SmartArt um a um', 'S2 SmartArt por nível de uma vez', 'S3 SmartArt um a um invertido')) {
      $s = $p.Slides.Add($p.Slides.Count + 1, 12)
      $s.FollowMasterBackground = 0; $s.Background.Fill.Solid(); $s.Background.Fill.ForeColor.RGB = (RGB 244 244 240)
      $t = $s.Shapes.AddTextbox(1, 30, 10, 900, 40); $t.TextFrame.TextRange.Text = $d; $t.TextFrame.TextRange.Font.Size = 24
      $null = $s.Shapes.AddSmartArt($ppt.SmartArtLayouts.Item(1), 80, 80, 800, 400)
      $tr = $s.SlideShowTransition; $tr.EntryEffect = 3849; $tr.Duration = 0.5; $tr.AdvanceOnClick = -1; $tr.AdvanceOnTime = -1; $tr.AdvanceTime = 1
    }
    $p.SaveAs($base, 24)
    $p.Close()
  }
  # 1b) texto nos nós do SmartArt (sem janela; o app refaz o desenho) e títulos atuais
  $p = $ppt.Presentations.Open($base, $false, $true, $false)
  $titles = @{ 7 = 'S1 SmartArt um a um'; 8 = 'S2 SmartArt por nível de uma vez'; 9 = 'S3 SmartArt um a um invertido' }
  $txt = @('Planejar', 'Medir', 'Ajustar', 'Validar', 'Entregar')
  foreach ($s in $p.Slides) {
    foreach ($sh in $s.Shapes) {
      if ($sh.HasSmartArt) {
        for ($i = 1; $i -le $sh.SmartArt.AllNodes.Count; $i++) {
          $nd = $sh.SmartArt.AllNodes.Item($i)
          try { $nd.TextFrame2.TextRange.Text = $txt[$i - 1] } catch { $nd.Shapes.Item(1).TextFrame2.TextRange.Text = $txt[$i - 1] }
        }
      } elseif ($sh.HasTextFrame -and $titles.ContainsKey($s.SlideIndex)) { $sh.TextFrame.TextRange.Text = $titles[$s.SlideIndex] }
    }
  }
  $p.SaveAs($texto, 24)
  $p.Close()
  # 2) animação por partes no XML
  & python (Join-Path $PSScriptRoot 'gen-graficos-partes.py') $texto $crafted
  if ($LASTEXITCODE -ne 0) { throw 'gen-graficos-partes.py falhou' }
  # 3) o app valida e regrava (.pptx canônico + .ppt)
  $p = $ppt.Presentations.Open($crafted, $true, $false, $false)
  foreach ($s in $p.Slides) { Write-Host ("slide " + $s.SlideIndex + ": " + $s.TimeLine.MainSequence.Count + " efeitos") }
  $p.SaveAs((Join-Path $outDir 'pb-graficos-partes.pptx'), 24)
  $p.SaveAs((Join-Path $outDir 'pb-graficos-partes.ppt'), 1)
  $p.Close()
  Write-Host 'deck pb-graficos-partes -> .pptx + .ppt'
} finally {
  foreach ($pr in @($ppt.Presentations)) { try { $pr.Close() } catch {} }
  $ppt.Quit()
  Stop-Job $watch -ErrorAction SilentlyContinue; Remove-Job $watch -Force -ErrorAction SilentlyContinue
}

# Gera um .pptx de referencia com o PowerPoint real (COM) e extrai/indenta o XML.
# E o oraculo estrutural do PresentationML: o diff/conteudo do XML E a spec de
# como o PowerPoint materializa slides, formas, texto e geometria.
#
# Uso: powershell -ExecutionPolicy Bypass -File tools/ppt-lab/gen-reference.ps1
$ErrorActionPreference = 'Stop'
$labRoot = $PSScriptRoot
$outDir = Join-Path $labRoot 'results\reference'
$pptxPath = Join-Path $labRoot 'results\reference.pptx'
if (Test-Path $outDir) { Remove-Item -Recurse -Force $outDir }
New-Item -ItemType Directory -Force -Path (Split-Path $pptxPath) | Out-Null

$ppt = $null; $pres = $null
try {
  $ppt = New-Object -ComObject PowerPoint.Application
  # PowerPoint nao automatiza invisivel de forma confiavel; minimiza a janela.
  try { $ppt.WindowState = 2 } catch {}  # ppWindowMinimized
  $pres = $ppt.Presentations.Add($true)

  # Tamanho 16:9 widescreen (default moderno): 13.333in x 7.5in.
  $pres.PageSetup.SlideSize = 15            # ppSlideSizeOnScreen16x9
  $w = $pres.PageSetup.SlideWidth
  $h = $pres.PageSetup.SlideHeight

  # Slide 1: layout Titulo (ppLayoutTitle=1)
  $s1 = $pres.Slides.Add(1, 1)
  $s1.Shapes.Title.TextFrame.TextRange.Text = 'Universal Slides'
  if ($s1.Shapes.Count -ge 2) { $s1.Shapes.Item(2).TextFrame.TextRange.Text = 'Compativel 1:1 com PowerPoint' }

  # Slide 2: layout Titulo + Conteudo (ppLayoutText=2) com bullets
  $s2 = $pres.Slides.Add(2, 2)
  $s2.Shapes.Title.TextFrame.TextRange.Text = 'Recursos'
  $body = $s2.Shapes.Item(2).TextFrame.TextRange
  $body.Text = "Primeiro item`r`nSegundo item`r`nTerceiro item"

  # Slide 3: blank (ppLayoutBlank=12) com textbox + retangulo colorido
  $s3 = $pres.Slides.Add(3, 12)
  $tb = $s3.Shapes.AddTextbox(1, 50, 50, 400, 80)   # msoTextOrientationHorizontal=1
  $tb.TextFrame.TextRange.Text = 'Caixa de texto livre'
  $tb.TextFrame.TextRange.Font.Size = 28
  $tb.TextFrame.TextRange.Font.Bold = $true
  $rect = $s3.Shapes.AddShape(1, 50, 200, 300, 150) # msoShapeRectangle=1
  $rect.Fill.ForeColor.RGB = 0xC47244            # BGR no COM (=> 4472C4 no XML)
  $rect.TextFrame.TextRange.Text = 'Forma com preenchimento'

  $pres.SaveAs($pptxPath, 24)   # 24 = ppSaveAsOpenXMLPresentation (.pptx)
  Write-Host "saved $pptxPath ($($pres.Slides.Count) slides, ${w}x${h} pt)"
}
finally {
  if ($pres) { try { $pres.Close() } catch {} }
  if ($ppt)  { try { $ppt.Quit() } catch {} }
  if ($ppt)  { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) }
}

# Extrai + indenta o XML para leitura/diffs.
$zip = "$pptxPath.zip"
Copy-Item $pptxPath $zip -Force
Expand-Archive $zip -DestinationPath $outDir -Force
Remove-Item $zip
Get-ChildItem $outDir -Recurse -File | Where-Object { $_.Name -match '\.(xml|rels)$' } | ForEach-Object {
  try {
    $x = [System.Xml.Linq.XDocument]::Load($_.FullName)
    $settings = New-Object System.Xml.XmlWriterSettings
    $settings.Indent = $true
    $wr = [System.Xml.XmlWriter]::Create($_.FullName, $settings)
    $x.Save($wr); $wr.Close()
  } catch {}
}
Write-Host "extracted -> $outDir"
Get-ChildItem $outDir -Recurse -File | ForEach-Object { $_.FullName.Substring($outDir.Length+1) }

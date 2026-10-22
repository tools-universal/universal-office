# Abre no Word (COM, invisivel) .docx gravados pelo editor com o Formato da
# Imagem e relata o que o Word ve em cada imagem: em linha/flutuante, quebra,
# posicao (pontos, relativa a quem), tamanho, giro, texto alt, decorativa e
# efeitos. Com -Pdf, exporta tambem <arquivo>.word.pdf (render do Word).
# Saida: uma linha por documento (falha ao abrir = "open-failed").
#
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File write/tools/image-lab/open-check.ps1 -Files a.docx,b.docx [-Pdf]
param([Parameter(Mandatory = $true)][string[]]$Files, [switch]$Pdf)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
. (Join-Path $PSScriptRoot '..\doc-lab\word-com.ps1')

function Pic-Line($s, [string]$kind) {
  $o = @($kind)
  try { $o += ('w=' + [math]::Round($s.Width, 2) + ' h=' + [math]::Round($s.Height, 2)) } catch {}
  try { $o += ('rot=' + $s.Rotation) } catch {}
  try { $o += ('wrap=' + $s.WrapFormat.Type + '/' + $s.WrapFormat.Side) } catch {}
  try { $o += ('pos=' + [math]::Round($s.Left, 2) + ',' + [math]::Round($s.Top, 2) + ' rel=' + $s.RelativeHorizontalPosition + ',' + $s.RelativeVerticalPosition) } catch {}
  try { $o += ('alt=[' + [string]$s.AlternativeText + ']') } catch {}
  try { $o += ('deco=' + $s.Decorative) } catch {}
  try { $o += ('lock=' + $s.LockAnchor) } catch {}
  try { if ($s.Line.Visible) { $o += ('line=' + $s.Line.Weight) } } catch {}
  try { if ($s.Shadow.Visible) { $o += ('shadow=' + $s.Shadow.Type) } } catch {}
  try { if ($s.SoftEdge.Type -gt 1) { $o += ('soft=' + $s.SoftEdge.Type) } } catch {}
  try { if ($s.Glow.Radius -gt 0) { $o += ('glow=' + $s.Glow.Radius) } } catch {}
  try { if ($s.Reflection.Type -gt 1) { $o += ('refl=' + $s.Reflection.Type) } } catch {}
  return ($o -join ' ')
}

$app = New-WordApp
foreach ($f in ($Files | ForEach-Object { $_ -split ',' })) {
  [string]$path = (Resolve-Path $f).Path
  $line = ''
  try {
    $app = Invoke-WithWord $app {
      param($w)
      $d = $w.Documents.Open($path, $false, $true, $false)
      try {
        $parts = @()
        foreach ($s in $d.InlineShapes) { $parts += (Pic-Line $s 'inline') }
        foreach ($s in $d.Shapes) { $parts += (Pic-Line $s 'shape') }
        $script:line = "ok paras=$($d.Paragraphs.Count) | " + ($parts -join ' | ')
        if ($Pdf) { $d.ExportAsFixedFormat([string]($path -replace '\.docx$', '.word.pdf'), 17) }
      } finally { $d.Close([ref]0) }
    }
    $line = $script:line
  } catch {
    $line = 'open-failed ' + $_.Exception.Message.Split("`n")[0]
  }
  Emit ((Split-Path $path -Leaf) + "`t" + $line)
}
Close-WordApp $app

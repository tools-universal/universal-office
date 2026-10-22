# Abre cada variante (camada a14 trocada), muda a saturacao da imagem para 0 e
# salva como <nome>-out.docx. ASCII puro; Word invisivel; caminhos em [string].
param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\doc-lab\word-com.ps1')
$app = New-WordApp
try {
  foreach ($n in @('wdp', 'png-hdphoto', 'png-image')) {
    $p = [string](Join-Path $Dir ($n + '.docx'))
    $o = [string](Join-Path $Dir ($n + '-out.docx'))
    $doc = $null
    try {
      $doc = $app.Documents.Open($p, $false, $false, $false)
      $ish = $doc.InlineShapes.Item(1)
      $fx = $ish.Fill.PictureEffects
      Emit ($n + ' efeitos=' + $fx.Count)
      $fx.Item(1).EffectParameters.Item(1).Value = 0
      $doc.SaveAs2($o, 16)
      Emit ('ok ' + $n)
    } catch { Emit ('FALHA ' + $n + ': ' + $_.Exception.Message) }
    finally { if ($doc -ne $null) { try { $doc.Close(0) } catch {} } }
  }
} finally { Close-WordApp $app }

# Oraculo da IMAGEM do Write: cada experimento cria um documento novo no Word
# (COM invisivel), escreve tres paragrafos, insere a imagem de teste no inicio
# do 2o, aplica UMA operacao e salva o .docx (e o PDF com -Pdf). Grava tambem
# <nome>.json com as medidas do Word depois da operacao (posicao, tamanho,
# quebra, erro se o modelo de objetos recusou).
#
# Uso (sempre pela trava global, via run.mjs):
#   powershell -File image-oracle.ps1 -OutDir <pasta> -Image <png> [-Image2 <png>] [-Only a,b] [-Pdf]
#
# Regras (doc-lab/word-com.ps1): sem janelas, so fecha o que abriu, Quit so sem
# documentos, caminhos em [string] (PSObject trava o SaveAs2). ASCII puro.
param(
  [Parameter(Mandatory=$true)][string]$OutDir,
  [Parameter(Mandatory=$true)][string]$Image,
  [string]$Image2 = '',
  [string]$Only = '',
  [string]$Prefix = '',
  [switch]$Pdf
)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
. (Join-Path $PSScriptRoot '..\doc-lab\word-com.ps1')
. (Join-Path $PSScriptRoot 'experiments.ps1')
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$onlySet = @{}
foreach ($o in ($Only -split ',')) { if ($o.Trim() -ne '') { $onlySet[$o.Trim()] = $true } }
$Image = [string](Resolve-Path $Image).Path
if ($Image2 -ne '') { $Image2 = [string](Resolve-Path $Image2).Path }

function Write-Utf8([string]$path, [string]$text) {
  [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
}

$LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'

# Documento base: tres paragrafos; a imagem no inicio do 2o, com 144 pt de largura.
function New-BaseDoc($app, [string]$img, [double]$width = 144) {
  $doc = $app.Documents.Add()
  $doc.Content.Text = ('Primeiro paragrafo. ' + $LOREM + "`r" + $LOREM + ' ' + $LOREM + "`r" + 'Terceiro paragrafo. ' + $LOREM)
  $r = $doc.Paragraphs.Item(2).Range
  $r.Collapse(1)
  $ish = $doc.InlineShapes.AddPicture($img, $false, $true, $r)
  if ($width -gt 0) { $ish.LockAspectRatio = -1; $ish.Width = $width }
  return @($doc, $ish)
}

function Shape-Info($s) {
  $o = [ordered]@{}
  foreach ($k in @('Left','Top','Width','Height','Rotation','RelativeHorizontalPosition','RelativeVerticalPosition','LockAnchor','LayoutInCell','LockAspectRatio','Name','AlternativeText','Title','ZOrderPosition','LeftRelative','TopRelative','WidthRelative','HeightRelative','RelativeHorizontalSize','RelativeVerticalSize')) {
    try { $o[$k] = $s.$k } catch {}
  }
  try {
    $o.wrap = [ordered]@{ type = $s.WrapFormat.Type; side = $s.WrapFormat.Side; t = $s.WrapFormat.DistanceTop; b = $s.WrapFormat.DistanceBottom; l = $s.WrapFormat.DistanceLeft; r = $s.WrapFormat.DistanceRight; allowOverlap = $s.WrapFormat.AllowOverlap }
  } catch {}
  try { $o.anchorStart = $s.Anchor.Start; $o.anchorPara = $s.Anchor.Paragraphs.Item(1).Range.Start } catch {}
  try { $o.pageLeft = $s.Anchor.Information(5); $o.pageTop = $s.Anchor.Information(6) } catch {}
  return $o
}

function Inline-Info($ish) {
  $o = [ordered]@{}
  foreach ($k in @('Width','Height','ScaleWidth','ScaleHeight','LockAspectRatio','AlternativeText','Title')) { try { $o[$k] = $ish.$k } catch {} }
  try { $o.start = $ish.Range.Start; $o.pageLeft = $ish.Range.Information(5); $o.pageTop = $ish.Range.Information(6) } catch {}
  return $o
}

$app = New-WordApp
try {
  foreach ($name in $E.Keys) {
    if ($onlySet.Count -gt 0 -and -not $onlySet.ContainsKey($name)) { continue }
    $ex = $E[$name]
    $info = [ordered]@{ name = $name }
    $doc = $null
    try {
      $w = 144
      if ($ex.Contains('Width')) { $w = [double]$ex.Width }
      $pair = New-BaseDoc $app $Image $w
      $doc = $pair[0]; $ish = $pair[1]
      $ctx = @{ app = $app; doc = $doc; ish = $ish; img = $Image; img2 = $Image2; info = $info; ex = $ex }
      try {
        $res = & $ex.Op $ctx
        $info.ok = $true
      } catch {
        $info.ok = $false
        $info.error = [string]$_.Exception.Message
      }
      $info.inline = @()
      foreach ($i in $doc.InlineShapes) { $info.inline += ,(Inline-Info $i) }
      $info.shapes = @()
      foreach ($s in $doc.Shapes) { $info.shapes += ,(Shape-Info $s) }
      $out = [string](Join-Path $OutDir ($Prefix + $name + '.docx'))
      $doc.SaveAs2($out, 16)
      if ($Pdf) {
        $pdfOut = [string](Join-Path $OutDir ($Prefix + $name + '.pdf'))
        $doc.ExportAsFixedFormat($pdfOut, 17)
      }
      Emit ("ok " + $name + $(if ($info.ok) { '' } else { ' (erro: ' + $info.error + ')' }))
    } catch {
      $info.fatal = [string]$_.Exception.Message
      Emit ("FALHA " + $name + ': ' + $info.fatal)
    } finally {
      if ($doc -ne $null) { try { $doc.Close(0) } catch {} }
    }
    Write-Utf8 ([string](Join-Path $OutDir ($Prefix + $name + '.json'))) ($info | ConvertTo-Json -Depth 6)
  }
} finally {
  Close-WordApp $app
}

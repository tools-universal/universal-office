# Oraculo da CAIXA DE TEXTO do Write: cada experimento cria um documento novo
# no Word (COM invisivel), escreve tres paragrafos, insere uma caixa de texto
# ancorada no 2o (Shapes.AddTextbox), aplica UMA operacao e salva o .docx (e o
# PDF com -Pdf). Grava tambem <nome>.json com as medidas do Word depois da
# operacao (caixa, quadro de texto, preenchimento, erro do modelo de objetos).
#
# Uso (sempre pela trava global, via run.mjs):
#   powershell -File textbox-oracle.ps1 -OutDir <pasta> -Image <png> [-Only a,b] [-Pdf]
#
# Regras (doc-lab/word-com.ps1): sem janelas, so fecha o que abriu, Quit so sem
# documentos, caminhos em [string] (PSObject trava o SaveAs2). ASCII puro.
param(
  [Parameter(Mandatory=$true)][string]$OutDir,
  [Parameter(Mandatory=$true)][string]$Image,
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

function Write-Utf8([string]$path, [string]$text) {
  [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
}

$LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'
$BOXTEXT = 'Texto da caixa de teste'

# Documento base: tres paragrafos (compat opcional); a caixa ancorada no 2o.
function New-BaseDoc($app, $ex) {
  $doc = $app.Documents.Add()
  if ($ex.Contains('Compat')) { $doc.SetCompatibilityMode([int]$ex.Compat) }
  $doc.Content.Text = ('Primeiro paragrafo. ' + $LOREM + "`r" + $LOREM + ' ' + $LOREM + "`r" + 'Terceiro paragrafo. ' + $LOREM)
  $box = $null
  if (-not $ex.Contains('NoBox')) {
    $a = $doc.Paragraphs.Item(2).Range
    $box = $doc.Shapes.AddTextbox(1, 100, 20, 180, 90, $a)
    $box.TextFrame.TextRange.Text = $BOXTEXT
  }
  return @($doc, $box)
}

function Color-Info($c) {
  $o = [ordered]@{}
  foreach ($k in @('RGB','ObjectThemeColor','SchemeColor','TintAndShade','Brightness','Type')) { try { $o[$k] = $c.$k } catch {} }
  return $o
}

function Shape-Info($s) {
  $o = [ordered]@{}
  foreach ($k in @('Name','Type','AutoShapeType','Left','Top','Width','Height','Rotation','RelativeHorizontalPosition','RelativeVerticalPosition','LockAnchor','LayoutInCell','LockAspectRatio','AlternativeText','Title','ZOrderPosition','Visible','HorizontalFlip','VerticalFlip','ShapeStyle','LeftRelative','TopRelative','WidthRelative','HeightRelative','RelativeHorizontalSize','RelativeVerticalSize')) {
    try { $o[$k] = $s.$k } catch {}
  }
  try {
    $o.wrap = [ordered]@{ type = $s.WrapFormat.Type; side = $s.WrapFormat.Side; t = $s.WrapFormat.DistanceTop; b = $s.WrapFormat.DistanceBottom; l = $s.WrapFormat.DistanceLeft; r = $s.WrapFormat.DistanceRight; allowOverlap = $s.WrapFormat.AllowOverlap }
  } catch {}
  try {
    $tf = $s.TextFrame
    $t = [ordered]@{}
    foreach ($k in @('MarginLeft','MarginRight','MarginTop','MarginBottom','Orientation','AutoSize','WordWrap','VerticalAnchor','HasText','Overflowing','NoTextRotation')) { try { $t[$k] = $tf.$k } catch {} }
    try { $t.text = $tf.TextRange.Text } catch {}
    try { $t.hasNext = ($tf.Next -ne $null); $t.hasPrev = ($tf.Previous -ne $null) } catch {}
    try { $t.containingRangeStart = $tf.ContainingRange.Start; $t.containingRangeEnd = $tf.ContainingRange.End } catch {}
    $o.textFrame = $t
  } catch {}
  try {
    $f = $s.Fill
    $o.fill = [ordered]@{ visible = $f.Visible; type = $f.Type; transparency = $f.Transparency; fore = (Color-Info $f.ForeColor); back = (Color-Info $f.BackColor) }
  } catch {}
  try {
    $l = $s.Line
    $o.line = [ordered]@{ visible = $l.Visible; weight = $l.Weight; dash = $l.DashStyle; style = $l.Style; transparency = $l.Transparency; fore = (Color-Info $l.ForeColor) }
  } catch {}
  try { $o.anchorStart = $s.Anchor.Start; $o.anchorPara = $s.Anchor.Paragraphs.Item(1).Range.Start } catch {}
  try { $o.pageLeft = $s.Anchor.Information(5); $o.pageTop = $s.Anchor.Information(6) } catch {}
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
      $pair = New-BaseDoc $app $ex
      $doc = $pair[0]; $box = $pair[1]
      $ctx = @{ app = $app; doc = $doc; box = $box; img = $Image; info = $info; ex = $ex; outDir = $OutDir; name = ($Prefix + $name) }
      try {
        $res = & $ex.Op $ctx
        $info.ok = $true
      } catch {
        $info.ok = $false
        $info.error = [string]$_.Exception.Message
      }
      try { $info.compat = $doc.CompatibilityMode } catch {}
      $info.shapes = @()
      foreach ($s in $doc.Shapes) { $info.shapes += ,(Shape-Info $s) }
      $info.inline = @()
      foreach ($i in $doc.InlineShapes) { try { $info.inline += ,@{ type = $i.Type; width = $i.Width; height = $i.Height } } catch {} }
      if (-not $ex.Contains('NoSave')) {
        $out = [string](Join-Path $OutDir ($Prefix + $name + '.docx'))
        $doc.SaveAs2($out, 16)
        if ($Pdf -or $ex.Contains('Pdf')) {
          $pdfOut = [string](Join-Path $OutDir ($Prefix + $name + '.pdf'))
          $doc.ExportAsFixedFormat($pdfOut, 17)
        }
      }
      Emit ("ok " + $name + $(if ($info.ok) { '' } else { ' (erro: ' + $info.error + ')' }))
    } catch {
      $info.fatal = [string]$_.Exception.Message
      Emit ("FALHA " + $name + ': ' + $info.fatal)
    } finally {
      if ($doc -ne $null) { try { $doc.Close(0) } catch {} }
    }
    Write-Utf8 ([string](Join-Path $OutDir ($Prefix + $name + '.json'))) ($info | ConvertTo-Json -Depth 7)
  }
} finally {
  Close-WordApp $app
}

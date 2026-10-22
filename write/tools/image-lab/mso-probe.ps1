# Sonda dos idMso (comandos da faixa de opcoes) da imagem: rotulo pt-BR,
# habilitado com a imagem selecionada e, com -Exec, o .docx depois de
# ExecuteMso (o mesmo caminho do botao). ASCII puro; Word invisivel.
param(
  [Parameter(Mandatory=$true)][string]$OutDir,
  [Parameter(Mandatory=$true)][string]$Image,
  [string]$Image2 = '',
  [string]$Ids = '',
  [string]$Exec = '',
  [switch]$Float,
  [string]$Only = '',
  [string]$Prefix = 'mso-',
  [switch]$Pdf
)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
. (Join-Path $PSScriptRoot '..\doc-lab\word-com.ps1')
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$Image = [string](Resolve-Path $Image).Path

$LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'

function New-Doc($app) {
  $doc = $app.Documents.Add()
  $doc.Content.Text = ('Primeiro paragrafo. ' + $LOREM + "`r" + $LOREM + ' ' + $LOREM + "`r" + 'Terceiro paragrafo. ' + $LOREM)
  $r = $doc.Paragraphs.Item(2).Range
  $r.Collapse(1)
  $ish = $doc.InlineShapes.AddPicture($Image, $false, $true, $r)
  $ish.LockAspectRatio = -1; $ish.Width = 144
  return @($doc, $ish)
}

$app = New-WordApp
try {
  if ($Ids -ne '') {
    $pair = New-Doc $app
    $doc = $pair[0]; $ish = $pair[1]
    $doc.Activate()
    if ($Float) { $s = $ish.ConvertToShape(); $s.WrapFormat.Type = 0; $s.Select() } else { $ish.Select() }
    foreach ($id in ($Ids -split ',')) {
      $id = $id.Trim(); if ($id -eq '') { continue }
      $lbl = ''; $en = ''
      try { $lbl = $app.CommandBars.GetLabelMso($id) } catch { $lbl = '!' + $_.Exception.Message.Split("`n")[0] }
      try { $en = $app.CommandBars.GetEnabledMso($id) } catch { $en = '?' }
      Emit ($id + "`t" + $en + "`t" + $lbl)
    }
    $doc.Close(0)
  }
  foreach ($id in ($Exec -split ',')) {
    $id = $id.Trim(); if ($id -eq '') { continue }
    $pair = New-Doc $app
    $doc = $pair[0]; $ish = $pair[1]
    try {
      $doc.Activate()
      if ($Float) { $s = $ish.ConvertToShape(); $s.WrapFormat.Type = 0; $s.Select() } else { $ish.Select() }
      $app.CommandBars.ExecuteMso($id)
      Emit ('exec ok ' + $id)
    } catch { Emit ('exec FALHA ' + $id + ': ' + $_.Exception.Message.Split("`n")[0]) }
    $out = [string](Join-Path $OutDir ($Prefix + $id + '.docx'))
    $doc.SaveAs2($out, 16)
    if ($Pdf) { $doc.ExportAsFixedFormat([string](Join-Path $OutDir ($Prefix + $id + '.pdf')), 17) }
    $doc.Close(0)
  }
} finally { Close-WordApp $app }

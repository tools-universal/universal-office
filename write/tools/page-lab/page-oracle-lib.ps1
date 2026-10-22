# Biblioteca do oraculo da frente Pagina (dot-source; o chamador define
# param([string]$Only)). Word invisivel, um documento por experimento: Run-Exp
# grava em results/<nome>.txt o corpo (ou so os sectPr), o w:background, as
# partes header*/footer* com rels, o displayBackgroundShape das settings, a
# lista de midias, a posicao do cursor e os passos de desfazer. Opcional: PDF.
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$outDir = [string](Join-Path $PSScriptRoot 'results')
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$tmp = [string](Join-Path $env:TEMP 'officenext-page-oracle')
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
# PDFs do Word levam subconjuntos das fontes do Office: ficam FORA do git
$pdfDir = [string]'E:\UniversalWriteTest\_lab\page\pdf'
New-Item -ItemType Directory -Force -Path $pdfDir | Out-Null
$onlySet = @{}
foreach ($o in ($Only -split ',')) { if ($o) { $onlySet[$o] = $true } }

function Open-Zip([string]$docx) {
  $fs = New-Object System.IO.FileStream($docx, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  return New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Read, $false)
}

function Part-Text($z, [string]$name) {
  $e = $z.GetEntry($name)
  if (-not $e) { return $null }
  $sr = New-Object System.IO.StreamReader($e.Open())
  $x = $sr.ReadToEnd(); $sr.Close()
  return $x
}

# $script:structOnly: so a estrutura (sdtPr, pPr, campos) -- o conteudo dos blocos
# de construcao do Word (folhas de rosto) e dele e nao vai para o repositorio
$script:structOnly = $false
function Clean([string]$b) {
  $b = $b -replace '(<w:p[ >])', "`n`$1" -replace '(<w:sectPr)', "`n  `$1" -replace '(<w:tbl>)', "`n`$1" -replace '(<w:sdt>)', "`n`$1" -replace '(<v:shape )', "`n    `$1"
  $b = $b -replace ' w:rsid[A-Za-z]*="[0-9A-F]+"', '' -replace ' w14:(paraId|textId)="[0-9A-F]+"', ''
  if ($script:structOnly) {
    $b = $b -replace '<w:t( [^>]*)?>[^<]*</w:t>', '<w:t/>' -replace '(?s)<w:drawing>.*?</w:drawing>', '<w:drawing/>' -replace '(?s)<mc:AlternateContent>.*?</mc:AlternateContent>', '<mc:AlternateContent/>' -replace '(?s)<w:pict>.*?</w:pict>', '<w:pict/>'
  }
  return $b
}

function Dump-Docx([string]$docx, [bool]$full = $false) {
  $z = Open-Zip $docx
  try {
    $out = ''
    $x = Part-Text $z 'word/document.xml'
    $bg = [regex]::Match($x, '(?s)<w:background\b[^>]*/>|<w:background\b.*?</w:background>')
    if ($bg.Success) { $out += "== background " + $bg.Value + "`n" }
    $i = $x.IndexOf('<w:body>'); $j = $x.IndexOf('</w:body>')
    $body = $x.Substring($i, $j - $i + 9)
    if ($full) { $out += "== body`n" + (Clean $body) + "`n" }
    else { foreach ($m in [regex]::Matches($body, '<w:sectPr[ >].*?</w:sectPr>')) { $out += "== sectPr " + (Clean $m.Value).Trim() + "`n" } }
    $names = @()
    foreach ($e in $z.Entries) { if ($e.FullName -match '^word/(header|footer)\d*\.xml$') { $names += $e.FullName } }
    foreach ($n in ($names | Sort-Object)) {
      $t = Part-Text $z $n
      $k = $t.IndexOf('<w:p '); $k2 = $t.IndexOf('<w:p>'); if ($k -lt 0 -or ($k2 -ge 0 -and $k2 -lt $k)) { $k = $k2 }
      $k3 = $t.IndexOf('<w:sdt>'); if ($k3 -ge 0 -and $k3 -lt $k) { $k = $k3 }
      if ($k -lt 0) { $k = 0 }
      $out += "== $n`n" + (Clean $t.Substring($k)) + "`n"
      $rn = 'word/_rels/' + ($n -replace '^word/', '') + '.rels'
      $rt = Part-Text $z $rn
      if ($rt) { foreach ($m in [regex]::Matches($rt, '<Relationship [^>]*/>')) { $out += "   rel " + $m.Value + "`n" } }
    }
    $s = Part-Text $z 'word/settings.xml'
    foreach ($m in [regex]::Matches($s, '<w:(evenAndOddHeaders|displayBackgroundShape|mirrorMargins)[^>]*/>')) { $out += "== settings " + $m.Value + "`n" }
    $rl = Part-Text $z 'word/_rels/document.xml.rels'
    foreach ($m in [regex]::Matches($rl, '<Relationship [^>]*(?:header|footer|image|media)[^>]*/>')) { $out += "== rel " + $m.Value + "`n" }
    foreach ($e in $z.Entries) { if ($e.FullName -match '^word/media/') { $out += "== media " + $e.FullName + " " + $e.Length + "`n" } }
    $ct = Part-Text $z '[Content_Types].xml'
    foreach ($m in [regex]::Matches($ct, '<Default [^>]*/>')) { $out += "== ct " + $m.Value + "`n" }
    return $out
  } finally { $z.Dispose() }
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

function Sel-Info($sel) {
  $sec = $sel.Information(2)
  $pg = $sel.Information(3)
  return "story=$($sel.StoryType) sec=$sec page=$pg sel=$($sel.Start)..$($sel.End) paraText=[" + ($sel.Paragraphs(1).Range.Text -replace "`r", '\r' -replace [char]12, '\f' -replace [char]9, '\t') + "]"
}

function Seek($doc, [int]$v) {
  $doc.ActiveWindow.View.Type = 3
  $doc.ActiveWindow.ActivePane.View.SeekView = $v
}

# Blocos de construcao: carrega e acha por tipo/nome (Built-In Building Blocks.dotx)
$word.Templates.LoadBuildingBlocks()
function Find-BB([int]$type, [string]$name) {
  foreach ($t in $word.Templates) {
    if ([string]$t.Name -ne 'Built-In Building Blocks.dotx') { continue }
    $cats = $t.BuildingBlockTypes.Item($type).Categories
    for ($c = 1; $c -le $cats.Count; $c++) {
      $bbs = $cats.Item($c).BuildingBlocks
      for ($k = 1; $k -le $bbs.Count; $k++) { if ([string]$bbs.Item($k).Name -eq $name) { return $bbs.Item($k) } }
    }
  }
  throw "bloco nao achado: $type/$name"
}
function BB-Names([int]$type) {
  $out = @()
  foreach ($t in $word.Templates) {
    if ([string]$t.Name -ne 'Built-In Building Blocks.dotx') { continue }
    $cats = $t.BuildingBlockTypes.Item($type).Categories
    for ($c = 1; $c -le $cats.Count; $c++) {
      $bbs = $cats.Item($c).BuildingBlocks
      for ($k = 1; $k -le $bbs.Count; $k++) { $out += [string]$bbs.Item($k).Name }
    }
  }
  return $out
}

# $open: .docx a abrir (em vez de documento novo); $pdf: exporta PDF tambem
function Run-Exp([string]$name, [scriptblock]$setup, [scriptblock]$op, [string]$open = '', [bool]$full = $false, [bool]$pdf = $false) {
  if ($onlySet.Count -and -not $onlySet.ContainsKey($name)) { return }
  if ($open) { $doc = $word.Documents.Open([string]$open, $false, $false, $false) } else { $doc = $word.Documents.Add() }
  $sel = $word.Selection
  $log = New-Object System.Collections.ArrayList
  try {
    & $setup $doc $sel
    $doc.UndoClear()
    & $op $doc $sel $log
    $info = Sel-Info $sel
    $p = [string](Join-Path $tmp ($name + '.docx'))
    $doc.SaveAs2($p, 16)
    if ($pdf) {
      $pp = [string](Join-Path $pdfDir ($name + '.pdf'))
      $doc.ExportAsFixedFormat($pp, 17)
    }
    $xml = Dump-Docx $p $full
    $n = 0
    while ($doc.Undo() -and $n -lt 50) { $n++ }
    $txt = "# $name`n$info undoSteps=$n`n"
    foreach ($l in $log) { $txt += "log: $l`n" }
    $txt += "$xml`n"
    [System.IO.File]::WriteAllText([string](Join-Path $outDir ($name + '.txt')), $txt)
    Write-Host "ok $name $info undo=$n"
  } catch {
    Write-Host "ERRO $name : $($_.Exception.Message)"
    [System.IO.File]::WriteAllText([string](Join-Path $outDir ($name + '.txt')), "# $name`nERRO: $($_.Exception.Message)`n")
  } finally {
    $doc.Close(0)
  }
}

function Close-Word {
  if ($word.Documents.Count -eq 0) { $word.Quit() }
}

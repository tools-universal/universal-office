# Biblioteca do oraculo da frente Sumario (dot-source; o script chamador define
# param([string]$Only)). Word invisivel, um documento novo por experimento:
# Run-Exp grava o w:body do document.xml (com os w:sdt de bloco), os estilos de
# sumario/titulo/hiperlink, os indicadores (inclusive os ocultos), os campos
# (codigo + resultado), os controles de conteudo, a posicao do cursor e os
# passos de desfazer em results/<nome>.txt. Close-Word no fim.
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$outDir = [string](Join-Path $PSScriptRoot 'results')
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$tmp = [string](Join-Path $env:TEMP 'officenext-toc-oracle')
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
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

function Clean([string]$b) {
  $b = $b -replace '(<w:p[ >])', "`n`$1" -replace '(<w:sectPr)', "`n  `$1" -replace '(<w:tbl>)', "`n`$1" -replace '(<w:sdt>)', "`n`$1" -replace '(</w:sdtContent>)', "`n`$1"
  $b = $b -replace ' w:rsid[A-Za-z]*="[0-9A-F]+"', '' -replace ' w14:(paraId|textId)="[0-9A-F]+"', ''
  return $b
}

$styleNames = 'toc \d|TOC Heading|Hyperlink|heading \d|Normal|Title|Subtitle|table of figures'
function Dump-Docx([string]$docx) {
  $z = Open-Zip $docx
  try {
    $out = ''
    $x = Part-Text $z 'word/document.xml'
    $i = $x.IndexOf('<w:body>'); $j = $x.IndexOf('</w:body>')
    $out += "== body`n" + (Clean $x.Substring($i, $j - $i + 9)) + "`n"
    $st = Part-Text $z 'word/styles.xml'
    foreach ($m in [regex]::Matches($st, '<w:style [^>]*>(?:(?!</w:style>).)*?<w:name w:val="(?:' + $styleNames + ')"/>.*?</w:style>')) { $out += "== style " + (Clean $m.Value) + "`n" }
    foreach ($m in [regex]::Matches($st, '<w:lsdException w:name="(?:' + $styleNames + ')"[^>]*/>')) { $out += "== latent " + $m.Value + "`n" }
    $s = Part-Text $z 'word/settings.xml'
    foreach ($m in [regex]::Matches($s, '<w:(updateFields|docVars|attachedTemplate)\b.*?(/>|</w:\1>)')) { $out += "== settings " + $m.Value + "`n" }
    $g = Part-Text $z 'word/glossary/document.xml'
    if ($g) { $out += "== glossary (" + $g.Length + " chars)`n" }
    return $out
  } finally { $z.Dispose() }
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

function Esc([string]$t) { return ($t -replace "`r", '\r' -replace "`n", '\n' -replace "`t", '\t' -replace [char]2, '<ref>' -replace [char]19, '{' -replace [char]20, '|' -replace [char]21, '}' -replace [char]1, '<obj>' -replace [char]7, '<cell>' -replace [char]12, '<pg>') }

function Sel-Info($sel) {
  return "story=$($sel.StoryType) sel=$($sel.Start)..$($sel.End) paraText=[" + (Esc $sel.Paragraphs(1).Range.Text) + "]"
}

function Bm-Info($doc) {
  $doc.Bookmarks.ShowHidden = $true
  $out = @()
  foreach ($b in $doc.Bookmarks) { $out += "bm $($b.Name) $($b.Start)..$($b.End) [" + (Esc $b.Range.Text) + "]" }
  return $out
}

function Fld-Info($doc) {
  $out = @()
  foreach ($f in $doc.Fields) { $out += "fld type=$($f.Type) code=[" + (Esc $f.Code.Text) + "] result=[" + (Esc $f.Result.Text) + "]" }
  return $out
}

function Cc-Info($doc) {
  $out = @()
  foreach ($c in $doc.ContentControls) { $out += "cc type=$($c.Type) bbType=$($c.BuildingBlockType) bbCat=[$($c.BuildingBlockCategory)] tag=[$($c.Tag)] title=[$($c.Title)] $($c.Range.Start)..$($c.Range.End)" }
  return $out
}

# estilo e nivel de topico de cada paragrafo (para Adicionar Texto e o \u)
function Para-Info($doc) {
  $out = @()
  $n = 0
  foreach ($p in $doc.Paragraphs) {
    $n++
    $out += "p$n style=[" + $p.Style.NameLocal + "] outline=$($p.OutlineLevel) [" + (Esc $p.Range.Text) + "]"
  }
  return $out
}

function Toc-Info($doc) {
  $out = @()
  foreach ($t in $doc.TablesOfContents) {
    $out += "toc upper=$($t.UpperHeadingLevel) lower=$($t.LowerHeadingLevel) useHeading=$($t.UseHeadingStyles) useFields=$($t.UseFields) useOutline=$($t.UseOutlineLevels) id=[$($t.TableID)] right=$($t.RightAlignPageNumbers) pages=$($t.IncludePageNumbers) leader=$($t.TabLeader) links=$($t.UseHyperlinks) hideWeb=$($t.HidePageNumbersInWeb) $($t.Range.Start)..$($t.Range.End)"
  }
  return $out
}

function Log-All($doc, $log, [string]$tag) {
  foreach ($l in (Bm-Info $doc)) { $log.Add("$tag $l") | Out-Null }
  foreach ($l in (Fld-Info $doc)) { $log.Add("$tag $l") | Out-Null }
  foreach ($l in (Cc-Info $doc)) { $log.Add("$tag $l") | Out-Null }
  foreach ($l in (Toc-Info $doc)) { $log.Add("$tag $l") | Out-Null }
}

# $open: caminho de um .docx a abrir (em vez de documento novo)
function Run-Exp([string]$name, [scriptblock]$setup, [scriptblock]$op, [string]$open = '') {
  if ($onlySet.Count -and -not $onlySet.ContainsKey($name)) { return }
  if ($open) { $doc = $word.Documents.Open([string]$open, $false, $false, $false) } else { $doc = $word.Documents.Add() }
  $sel = $word.Selection
  $log = New-Object System.Collections.ArrayList
  try {
    & $setup $doc $sel
    $doc.UndoClear()
    & $op $doc $sel $log
    $info = Sel-Info $sel
    Log-All $doc $log 'end'
    foreach ($l in (Para-Info $doc)) { $log.Add("end $l") | Out-Null }
    $p = [string](Join-Path $tmp ($name + '.docx'))
    $doc.SaveAs2($p, 16)
    $xml = Dump-Docx $p
    $n = 0
    while ($doc.Undo() -and $n -lt 50) { $n++ }
    $txt = "# $name`n$info undoSteps=$n`n"
    foreach ($l in $log) { $txt += "log: $l`n" }
    $txt += "$xml`n"
    [System.IO.File]::WriteAllText([string](Join-Path $outDir ($name + '.txt')), $txt)
    Write-Host "ok $name $info undo=$n"
  } catch {
    Write-Host "ERRO $name : $($_.Exception.Message)"
    $txt = "# $name`nERRO: $($_.Exception.Message)`n"
    foreach ($l in $log) { $txt += "log: $l`n" }
    [System.IO.File]::WriteAllText([string](Join-Path $outDir ($name + '.txt')), $txt)
  } finally {
    $doc.Close(0)
  }
}

# blocos de construcao do tipo Sumario (14), na ordem da galeria
$script:bbt = $null
function Load-BB {
  if ($script:bbt) { return }
  $word.Templates.LoadBuildingBlocks()
  foreach ($t in $word.Templates) { try { if ($t.BuildingBlockEntries.Count -gt 50) { $script:bbt = $t; break } } catch { } }
}
function BB-List {
  Load-BB
  $out = @()
  $ty = $script:bbt.BuildingBlockTypes.Item(14)
  for ($c = 1; $c -le $ty.Categories.Count; $c++) {
    $cat = $ty.Categories.Item($c)
    for ($b = 1; $b -le $cat.BuildingBlocks.Count; $b++) { $out += $cat.BuildingBlocks.Item($b) }
  }
  return $out
}

function Close-Word {
  if ($word.Documents.Count -eq 0) { $word.Quit() }
}

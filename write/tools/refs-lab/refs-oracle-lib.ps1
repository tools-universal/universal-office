# Biblioteca do oraculo da frente Links e referencias (dot-source; o script
# chamador define param([string]$Only)). Word invisivel, um documento novo por
# experimento: Run-Exp grava o w:body do document.xml, os estilos de legenda/
# indice/sumario/hiperlink, os rels de hiperlink, os indicadores (inclusive os
# ocultos), os campos (codigo + resultado), a posicao do cursor e os passos de
# desfazer em results/<nome>.txt. Close-Word no fim.
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.Drawing
$outDir = [string](Join-Path $PSScriptRoot 'results')
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$tmp = [string](Join-Path $env:TEMP 'officenext-refs-oracle')
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$onlySet = @{}
foreach ($o in ($Only -split ',')) { if ($o) { $onlySet[$o] = $true } }

# texto pt-BR sem sair do ASCII no fonte
$cc = [char]0x00E7; $at = [char]0x00E3; $ea = [char]0x00E9; $oa = [char]0x00F3; $ia = [char]0x00ED; $aa = [char]0x00E1
$EQ = "Equa$cc$at" + 'o'

# imagem PNG pequena para legendas de figura
$png = [string](Join-Path $tmp 'pic.png')
if (-not (Test-Path $png)) {
  $bmp = New-Object System.Drawing.Bitmap 60, 40
  $g = [System.Drawing.Graphics]::FromImage($bmp); $g.Clear([System.Drawing.Color]::SteelBlue); $g.Dispose()
  $bmp.Save($png, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
}

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
  $b = $b -replace '(<w:p[ >])', "`n`$1" -replace '(<w:sectPr)', "`n  `$1" -replace '(<w:tbl>)', "`n`$1" -replace '(<w:(footnote|endnote)[ >])', "`n`$1"
  $b = $b -replace ' w:rsid[A-Za-z]*="[0-9A-F]+"', '' -replace ' w14:(paraId|textId)="[0-9A-F]+"', ''
  return $b
}

$styleNames = 'caption|table of figures|toc \d|Hyperlink|FollowedHyperlink|TOC Heading|footnote reference|endnote reference|heading \d'
function Dump-Docx([string]$docx) {
  $z = Open-Zip $docx
  try {
    $out = ''
    $x = Part-Text $z 'word/document.xml'
    $i = $x.IndexOf('<w:body>'); $j = $x.IndexOf('</w:body>')
    $out += "== body`n" + (Clean $x.Substring($i, $j - $i + 9)) + "`n"
    foreach ($n in @('word/footnotes.xml', 'word/endnotes.xml')) {
      $t = Part-Text $z $n
      if ($t) {
        $k = $t.IndexOf('<w:footnote w:id="1"'); if ($k -lt 0) { $k = $t.IndexOf('<w:endnote w:id="1"') }
        if ($k -ge 0) { $out += "== $n`n" + (Clean $t.Substring($k)) + "`n" }
      }
    }
    $st = Part-Text $z 'word/styles.xml'
    foreach ($m in [regex]::Matches($st, '<w:style [^>]*>(?:(?!</w:style>).)*?<w:name w:val="(?:' + $styleNames + ')"/>.*?</w:style>')) { $out += "== style " + (Clean $m.Value) + "`n" }
    $rl = Part-Text $z 'word/_rels/document.xml.rels'
    foreach ($m in [regex]::Matches($rl, '<Relationship [^>]*hyperlink[^>]*/>')) { $out += "== rel " + $m.Value + "`n" }
    $s = Part-Text $z 'word/settings.xml'
    foreach ($m in [regex]::Matches($s, '<w:(updateFields|captions|docVars)\b.*?(/>|</w:\1>)')) { $out += "== settings " + $m.Value + "`n" }
    return $out
  } finally { $z.Dispose() }
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

function Esc([string]$t) { return ($t -replace "`r", '\r' -replace "`n", '\n' -replace "`t", '\t' -replace [char]2, '<ref>' -replace [char]19, '{' -replace [char]20, '|' -replace [char]21, '}' -replace [char]1, '<obj>' -replace [char]7, '<cell>') }

function Sel-Info($sel) {
  return "story=$($sel.StoryType) sel=$($sel.Start)..$($sel.End) paraText=[" + (Esc $sel.Paragraphs(1).Range.Text) + "]"
}

# indicadores (com os ocultos), na ordem do documento
function Bm-Info($doc) {
  $doc.Bookmarks.ShowHidden = $true
  $out = @()
  foreach ($b in $doc.Bookmarks) { $out += "bm $($b.Name) $($b.Start)..$($b.End) story=$($b.StoryType) [" + (Esc $b.Range.Text) + "]" }
  return $out
}

# campos: codigo e resultado
function Fld-Info($doc) {
  $out = @()
  foreach ($f in $doc.Fields) { $out += "fld type=$($f.Type) code=[" + (Esc $f.Code.Text) + "] result=[" + (Esc $f.Result.Text) + "]" }
  return $out
}

function Log-All($doc, $log, [string]$tag) {
  foreach ($l in (Bm-Info $doc)) { $log.Add("$tag $l") | Out-Null }
  foreach ($l in (Fld-Info $doc)) { $log.Add("$tag $l") | Out-Null }
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

function Close-Word {
  if ($word.Documents.Count -eq 0) { $word.Quit() }
}

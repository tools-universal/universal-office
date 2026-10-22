# Biblioteca do oraculo da frente Notas (dot-source; o script chamador define
# param([string]$Only)). Word invisivel, um documento novo por experimento:
# Run-Exp grava o w:body do document.xml, footnotes.xml, endnotes.xml, o
# footnotePr/endnotePr do settings, os estilos de nota, a posicao do cursor e os
# passos de desfazer em results/<nome>.txt. Close-Word no fim.
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$outDir = [string](Join-Path $PSScriptRoot 'results')
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$tmp = [string](Join-Path $env:TEMP 'officenext-notes-oracle')
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$onlySet = @{}
foreach ($o in ($Only -split ',')) { if ($o) { $onlySet[$o] = $true } }

# o Word mantem o arquivo salvo aberto: leitura com FileShare.ReadWrite
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
        $k = $t.IndexOf('<w:footnote'); if ($k -lt 0) { $k = $t.IndexOf('<w:endnote') }
        $root = $t.Substring(0, [Math]::Max(0, $k))
        $root = $root -replace '^<\?xml[^>]*\?>', ''
        $out += "== $n root=" + ($root.Length) + "`n" + (Clean $t.Substring([Math]::Max(0, $k))) + "`n"
      } else { $out += "== $n (ausente)`n" }
    }
    $s = Part-Text $z 'word/settings.xml'
    foreach ($m in [regex]::Matches($s, '<w:(footnotePr|endnotePr)>.*?</w:\1>')) { $out += "== settings " + $m.Value + "`n" }
    $st = Part-Text $z 'word/styles.xml'
    foreach ($m in [regex]::Matches($st, '<w:style [^>]*>(?:(?!</w:style>).)*?<w:name w:val="(?:footnote|endnote)[^"]*"/>.*?</w:style>')) { $out += "== style " + (Clean $m.Value) + "`n" }
    foreach ($m in [regex]::Matches($st, '<w:lsdException w:name="(?:footnote|endnote)[^"]*"[^>]*/>')) { $out += "== latent " + $m.Value + "`n" }
    $ct = Part-Text $z '[Content_Types].xml'
    foreach ($m in [regex]::Matches($ct, '<Override PartName="/word/(?:footnotes|endnotes)\.xml"[^>]*/>')) { $out += "== ct " + $m.Value + "`n" }
    $rl = Part-Text $z 'word/_rels/document.xml.rels'
    foreach ($m in [regex]::Matches($rl, '<Relationship [^>]*(?:footnotes|endnotes)[^>]*/>')) { $out += "== rel " + $m.Value + "`n" }
    return $out
  } finally { $z.Dispose() }
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

function Sel-Info($sel) {
  return "story=$($sel.StoryType) sel=$($sel.Start)..$($sel.End) paraText=[" + ($sel.Paragraphs(1).Range.Text -replace "`r", '\r' -replace [char]2, '<ref>') + "]"
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
    $p = [string](Join-Path $tmp ($name + '.docx'))
    $doc.SaveAs2($p, 16)
    $xml = Dump-Docx $p
    $n = 0
    while ($doc.Undo() -and $n -lt 50) { $n++ }
    $txt = "# $name`n$info undoSteps=$n`n"
    foreach ($l in $log) { $txt += "log: $l`n" }
    $txt += "$xml`n"
    # o .docx salvo fica em $tmp (fora do git)
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

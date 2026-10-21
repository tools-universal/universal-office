# Biblioteca do oraculo da frente Secoes e colunas (dot-source; o script
# chamador define param([string]$Only)). Word invisivel, um documento novo por
# experimento: Run-Exp grava o w:body do document.xml, a posicao do cursor e os
# passos de desfazer em results/<nome>.txt. Close-Word no fim.
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$outDir = [string](Join-Path $PSScriptRoot 'results')
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$tmp = [string](Join-Path $env:TEMP 'officenext-sections-oracle')
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$onlySet = @{}
foreach ($o in ($Only -split ',')) { if ($o) { $onlySet[$o] = $true } }

# o Word mantem o arquivo salvo aberto: leitura com FileShare.ReadWrite
function Open-Zip([string]$docx) {
  $fs = New-Object System.IO.FileStream($docx, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  return New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Read, $false)
}

function Body-Xml([string]$docx) {
  $z = Open-Zip $docx
  try {
    $e = $z.GetEntry('word/document.xml')
    $sr = New-Object System.IO.StreamReader($e.Open())
    $x = $sr.ReadToEnd(); $sr.Close()
  } finally { $z.Dispose() }
  $i = $x.IndexOf('<w:body>')
  $j = $x.IndexOf('</w:body>')
  $b = $x.Substring($i, $j - $i + 9)
  # um elemento de bloco por linha (leitura humana)
  $b = $b -replace '(<w:p[ >])', "`n`$1" -replace '(<w:sectPr)', "`n  `$1" -replace '(<w:tbl>)', "`n`$1"
  # sem os rsids (ruido)
  $b = $b -replace ' w:rsid[A-Za-z]*="[0-9A-F]+"', '' -replace ' w14:(paraId|textId)="[0-9A-F]+"', ''
  return $b
}

function Parts([string]$docx) {
  $z = Open-Zip $docx
  try { return ($z.Entries | ForEach-Object { $_.FullName } | Where-Object { $_ -match '^word/(header|footer)' }) -join ' ' } finally { $z.Dispose() }
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

function Run-Exp([string]$name, [scriptblock]$setup, [scriptblock]$op) {
  if ($onlySet.Count -and -not $onlySet.ContainsKey($name)) { return }
  $doc = $word.Documents.Add()
  $sel = $word.Selection
  $log = New-Object System.Collections.ArrayList
  try {
    & $setup $doc $sel
    $doc.UndoClear()
    $beforeSecs = $doc.Sections.Count
    & $op $doc $sel $log
    $start = $sel.Start; $end = $sel.End
    $secs = $doc.Sections.Count
    $p = [string](Join-Path $tmp ($name + '.docx'))
    $doc.SaveAs2($p, 16)
    $xml = Body-Xml $p
    $parts = Parts $p
    $n = 0
    while ($doc.Undo() -and $n -lt 50) { $n++ }
    $txt = "# $name`nsel=$start..$end sections=$beforeSecs->$secs undoSteps=$n parts=[$parts]`n"
    foreach ($l in $log) { $txt += "log: $l`n" }
    $txt += "$xml`n"
    [System.IO.File]::WriteAllText([string](Join-Path $outDir ($name + '.txt')), $txt)
    Write-Host "ok $name sel=$start sections=$secs undo=$n"
  } catch {
    Write-Host "ERRO $name : $($_.Exception.Message)"
    [System.IO.File]::WriteAllText([string](Join-Path $outDir ($name + '.txt')), "# $name`nERRO: $($_.Exception.Message)`n")
  } finally {
    $doc.Close(0)
  }
}


function Close-Word {
  if ($word.Documents.Count -eq 0) { $word.Quit() }
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
}

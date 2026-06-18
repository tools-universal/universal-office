# Extrai as 4 variantes de "Aptos Narrow" (fonte Normal padrão do Excel) via
# Word: docx com EmbedTrueTypeFonts (sem subset), depois desofusca os .odttf
# pelo w:fontKey de fontTable.xml. Saída: tools/excel-lab/fonts/aptos-narrow-*.ttf
$ErrorActionPreference = 'Stop'
$lab = $PSScriptRoot
$outDir = Join-Path $lab 'fonts'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$tmp = Join-Path $outDir '_embed.docx'

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Add()
  $sel = $word.Selection
  $sel.Font.Name = 'Aptos Narrow'   # força o uso da família em todas as variantes
  $sel.TypeText('regular ')
  $sel.Font.Bold = $true;  $sel.TypeText('bold ');   $sel.Font.Bold = $false
  $sel.Font.Italic = $true; $sel.TypeText('italic '); $sel.Font.Italic = $false
  $sel.Font.Bold = $true; $sel.Font.Italic = $true; $sel.TypeText('bolditalic')
  $doc.EmbedTrueTypeFonts = $true
  $doc.SaveSubsetFonts = $false
  $doc.SaveAs2($tmp, 16)
  $doc.Close(0)
}
finally { $word.Quit(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) }

$zip = "$tmp.zip"
Copy-Item $tmp $zip -Force
$ex = Join-Path $outDir '_embed'
if (Test-Path $ex) { Remove-Item -Recurse -Force $ex }
Expand-Archive $zip $ex -Force
Remove-Item $zip

# Parse robusto via regex (DOM com namespaces no PS é truncante)
$ftRaw = Get-Content "$ex\word\fontTable.xml" -Raw
$relsRaw = Get-Content "$ex\word\_rels\fontTable.xml.rels" -Raw
$relMap = @{}
foreach ($m in [regex]::Matches($relsRaw, 'Id="([^"]+)"[^>]*Target="([^"]+)"')) { $relMap[$m.Groups[1].Value] = $m.Groups[2].Value }

# bloco da fonte Aptos Narrow
$blk = [regex]::Match($ftRaw, '<w:font w:name="Aptos Narrow">.*?</w:font>')
if (-not $blk.Success) { Write-Warning "Aptos Narrow nao embarcada"; return }
$block = $blk.Value

$variants = @( 'embedRegular', 'embedBold', 'embedItalic', 'embedBoldItalic' )
$labels = @{ embedRegular = 'regular'; embedBold = 'bold'; embedItalic = 'italic'; embedBoldItalic = 'bolditalic' }
$found = 0
foreach ($v in $variants) {
  $pat = $v + '\s+r:id="(rId\d+)"\s+w:fontKey="\{([0-9A-Fa-f-]+)\}"'
  $m = [regex]::Match($block, $pat)
  if (-not $m.Success) { continue }
  $rid = $m.Groups[1].Value
  $key = $m.Groups[2].Value
  $target = $relMap[$rid]
  if (-not $target) { continue }
  $odttf = Join-Path $ex "word\$target"
  $out = Join-Path $outDir ('aptos-narrow-' + $labels[$v] + '.ttf')
  & node (Join-Path $lab 'deobfuscate-odttf.mjs') $odttf $out $key | Out-Null
  if (Test-Path $out) { Write-Host ('{0,-12} {1} -> {2}' -f $labels[$v], $key, (Split-Path $target -Leaf)); $found++ }
}
Write-Host "Variantes Aptos Narrow extraidas: $found"

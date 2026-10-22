# Sumario de um documento ORIGINAL: o texto em cache e o que o Word gera ao
# atualizar (para separar diferenca do editor de peculiaridade do documento).
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/refs-lab/toc-orig.ps1 -Path <docx>
param([string]$Path)
$ErrorActionPreference = 'Stop'
$w = New-Object -ComObject Word.Application
$w.Visible = $false
$w.DisplayAlerts = 0
[string]$p = $Path
$d = $w.Documents.Open($p, $false, $true, $false)
try {
  $toc = $d.TablesOfContents.Item(1)
  $a = @(([string]$toc.Range.Text) -split "`r")
  Write-Host "cache: $($a.Count) linhas; campo: $($toc.Range.Fields.Item(1).Code.Text)"
  $null = $toc.Update()
  $b = @(([string]$d.TablesOfContents.Item(1).Range.Text) -split "`r")
  Write-Host "word: $($b.Count) linhas"
  $i = 0
  foreach ($l in $b) { $i++; if ($i -le 30) { Write-Host ("  " + ($l -replace "`t", '<TAB>')) } }
  # paragrafos com nivel de topico fora do corpo principal (tabelas)
  $k = 0
  foreach ($t in $d.Tables) { foreach ($pp in $t.Range.Paragraphs) { if ($pp.OutlineLevel -lt 10) { $k++; if ($k -le 5) { Write-Host ("  tabela: nivel " + $pp.OutlineLevel + " [" + ([string]$pp.Range.Text).Trim() + "]") } } } }
  Write-Host "titulos em tabelas: $k"
} finally { $d.Close(0) }
if ($w.Documents.Count -eq 0) { $w.Quit() }

# Abre no Word (COM, invisivel) os .docx editados pelo lossless-check e os
# originais correspondentes; falha = o Word nao abre (conteudo ilegivel) ou o
# texto digitado nao aparece. Saida: uma linha TSV por documento.
#
#   powershell -NoProfile -WindowStyle Hidden -File word-open-check.ps1 -Dir <pasta do --out> [-Limit N] [-Sections] [-Tables]
# -Sections: saida do lossless-check --sections (uma secao a mais, dois paragrafos a mais).
# -Tables: saida do lossless-check --tables (linha nova na 1a tabela: o numero de
# paragrafos muda; confere tabelas, o campo de formula, as bordas de pagina e o estilo de tabela).
param(
  [Parameter(Mandatory = $true)][string]$Dir,
  [int]$Limit = 100000,
  [switch]$Sections,
  [switch]$Tables
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\doc-lab\word-com.ps1')

$rows = Get-Content -Encoding UTF8 -LiteralPath (Join-Path $Dir 'manifest.tsv')
$app = New-WordApp
$n = 0
foreach ($row in $rows) {
  if ($n -ge $Limit) { break }
  $n++
  $parts = $row -split "`t"
  [string]$edited = Join-Path $Dir $parts[0]
  [string]$orig = $parts[1]
  $status = 'ok'
  $detail = ''
  try {
    $app = Invoke-WithWord $app {
      param($w)
      $d = $w.Documents.Open($edited, $false, $true, $false)
      try {
        $script:pe = $d.Paragraphs.Count
        $script:se = $d.Sections.Count
        $script:te = $d.Tables.Count
        $script:hasEdit = ([string]$d.Content.Text).Contains('XYZ')
        if ($Tables) {
          $script:formula = $false
          foreach ($f in $d.Fields) { if (([string]$f.Code.Text).Contains('=SUM(ABOVE)')) { $script:formula = $true } }
          $script:pgb = [bool]$d.Sections.Item($d.Sections.Count).Borders.Enable
          $script:tstyle = $false
          try { $null = $d.Styles.Item('Tabela Lossless'); $script:tstyle = $true } catch { }
        }
      } finally { $d.Close([ref]0) }
      $o = $w.Documents.Open($orig, $false, $true, $false)
      try { $script:po = $o.Paragraphs.Count; $script:so = $o.Sections.Count; $script:to = $o.Tables.Count } finally { $o.Close([ref]0) }
    }
    $detail = "paras $($script:po)->$($script:pe) secoes $($script:so)->$($script:se) tabelas $($script:to)->$($script:te)"
    $slack = 1
    if ($Sections) { $slack = 2 }
    if (-not $script:hasEdit) { $status = 'no-edit' }
    elseif ($Tables) {
      if ($script:te -ne $script:to) { $status = 'table-count' }
      elseif (-not $script:formula) { $status = 'no-formula' }
      elseif (-not $script:pgb) { $status = 'no-page-borders' }
      elseif (-not $script:tstyle) { $status = 'no-table-style' }
    }
    elseif ([math]::Abs($script:pe - $script:po) -gt $slack) { $status = 'para-count' }
    elseif ($Sections -and $script:se -ne $script:so + 1) { $status = 'section-count' }
  } catch {
    $status = 'open-failed'
    $detail = ([string]$_.Exception.Message) -replace "[`r`n`t]", ' '
  }
  Emit "$($parts[0])`t$status`t$detail"
}
Close-WordApp $app

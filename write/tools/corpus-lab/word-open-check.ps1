# Abre no Word (COM, invisivel) os .docx editados pelo lossless-check e os
# originais correspondentes; falha = o Word nao abre (conteudo ilegivel) ou o
# texto digitado nao aparece. Saida: uma linha TSV por documento.
#
#   powershell -NoProfile -WindowStyle Hidden -File word-open-check.ps1 -Dir <pasta do --out> [-Limit N] [-Skip N] [-Sections] [-Tables] [-Notes]
# -Sections: saida do lossless-check --sections (uma secao a mais, dois paragrafos a mais).
# -Tables: saida do lossless-check --tables (linha nova na 1a tabela: o numero de
# paragrafos muda; confere tabelas, o campo de formula, as bordas de pagina e o estilo de tabela).
# -Notes: saida do lossless-check --notes (uma nota de rodape e uma de fim a mais, com o texto novo).
# -Skip: pula as N primeiras linhas do manifesto (rodar em blocos e soltar a trava do Word entre eles).
param(
  [Parameter(Mandatory = $true)][string]$Dir,
  [int]$Limit = 100000,
  [int]$Skip = 0,
  [switch]$Sections,
  [switch]$Tables,
  [switch]$Notes
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\doc-lab\word-com.ps1')

$rows = @(Get-Content -Encoding UTF8 -LiteralPath (Join-Path $Dir 'manifest.tsv')) | Select-Object -Skip $Skip
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
        $script:fe = $d.Footnotes.Count; $script:ee = $d.Endnotes.Count
        $script:noteText = ''
        if ($Notes) {
          # (1..0 no PowerShell sao dois itens: so com notas)
          if ($d.Footnotes.Count -gt 0) { foreach ($k in 1..$d.Footnotes.Count) { $script:noteText += [string]$d.Footnotes.Item($k).Range.Text } }
          if ($d.Endnotes.Count -gt 0) { foreach ($k in 1..$d.Endnotes.Count) { $script:noteText += [string]$d.Endnotes.Item($k).Range.Text } }
        }
      } finally { $d.Close([ref]0) }
      $o = $w.Documents.Open($orig, $false, $true, $false)
      try { $script:po = $o.Paragraphs.Count; $script:so = $o.Sections.Count; $script:to = $o.Tables.Count; $script:fo = $o.Footnotes.Count; $script:eo = $o.Endnotes.Count } finally { $o.Close([ref]0) }
    }
    $detail = "paras $($script:po)->$($script:pe) secoes $($script:so)->$($script:se) tabelas $($script:to)->$($script:te) notas $($script:fo)/$($script:eo)->$($script:fe)/$($script:ee)"
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
    elseif ($Notes -and ($script:fe -ne $script:fo + 1 -or $script:ee -ne $script:eo + 1)) { $status = 'note-count' }
    elseif ($Notes -and -not ($script:noteText.Contains('NOTA NOVA RODAPE') -and $script:noteText.Contains('NOTA NOVA FIM'))) { $status = 'note-text' }
  } catch {
    $status = 'open-failed'
    $detail = ([string]$_.Exception.Message) -replace "[`r`n`t]", ' '
  }
  Emit "$($parts[0])`t$status`t$detail"
}
Close-WordApp $app

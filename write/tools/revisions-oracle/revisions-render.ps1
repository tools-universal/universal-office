# Controle de alteracoes: PDF "com marcacao" de cada .docx de -InDir em cada
# modo de exibicao (Todas embutidas / Todas com baloes / Mista / Simples / Sem
# marcacao / Original). Le e RESTAURA as opcoes de exibicao da janela (o Word
# as guarda como preferencia). Invisivel, uma sessao do Word.
# Uso (sempre pela trava global):
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass
#     -File write/tools/revisions-oracle/revisions-render.ps1 -InDir <pasta> -OutDir <pasta>
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
param([string]$InDir, [string]$OutDir, [string]$Only = '')
$ErrorActionPreference = 'Stop'
$InDir = (Resolve-Path $InDir).Path
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$OutDir = (Resolve-Path $OutDir).Path

# nome = Markup (0 nenhuma, 1 simples, 2 todas), MarkupMode (0 baloes, 1 embutida, 2 mista), View (0 final, 1 original)
$modes = [ordered]@{
  'all-inline'   = @(2, 1, 0)
  'all-balloons' = @(2, 0, 0)
  'all-mixed'    = @(2, 2, 0)
  'simple'       = @(1, 2, 0)
  'none'         = @(0, 2, 0)
  'original'     = @(0, 2, 1)
  'orig-markup'  = @(2, 1, 1)
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$log = @()
$saved = $null
try {
  $files = Get-ChildItem -Path $InDir -Filter *.docx | Sort-Object Name
  foreach ($f in $files) {
    $p = [string]$f.FullName
    $d = $word.Documents.Open($p, $false, $true, $false)
    try {
      $v = $d.ActiveWindow.View
      if (-not $saved) {
        $saved = @($v.RevisionsFilter.Markup, $v.MarkupMode, $v.RevisionsFilter.View, $v.ShowRevisionsAndComments, $v.RevisionsView)
        $log += "inicial: Markup=$($saved[0]) MarkupMode=$($saved[1]) View=$($saved[2]) ShowRevisionsAndComments=$($saved[3]) RevisionsView=$($saved[4]) ShowInsDel=$($v.ShowInsertionsAndDeletions) ShowFormat=$($v.ShowFormatChanges) ShowComments=$($v.ShowComments) PrintRevisions=$($word.Options.PrintRevisions)"
      }
      foreach ($k in $modes.Keys) {
        if ($Only -and -not ($Only.Split(',') -contains $k)) { continue }
        $m = $modes[$k]
        $v.RevisionsFilter.Markup = [int]$m[0]
        $v.MarkupMode = [int]$m[1]
        $v.RevisionsFilter.View = [int]$m[2]
        if ([int]$m[0] -eq 0 -and [int]$m[2] -eq 0) { $v.ShowRevisionsAndComments = $false; $v.RevisionsView = 0 } elseif ([int]$m[0] -eq 0) { $v.ShowRevisionsAndComments = $false; $v.RevisionsView = 1 } else { $v.ShowRevisionsAndComments = $true; $v.RevisionsView = [int]$m[2] }
        $log += "$k lido: Markup=$($v.RevisionsFilter.Markup) MarkupMode=$($v.MarkupMode) View=$($v.RevisionsFilter.View) SRC=$($v.ShowRevisionsAndComments) RV=$($v.RevisionsView) Type=$($v.Type)"
        $out = [string](Join-Path $OutDir ($f.BaseName + '.' + $k + '.pdf'))
        # Item 7 = wdExportDocumentWithMarkup
        $d.ExportAsFixedFormat($out, 17, $false, 0, 0, 1, 1, 7)
        $log += "$($f.Name) $k ok"
      }
    } catch {
      $log += "$($f.Name) ERRO $($_.Exception.Message)"
    } finally {
      if ($saved) {
        try {
          $v = $d.ActiveWindow.View
          $v.RevisionsFilter.Markup = [int]$saved[0]
          $v.MarkupMode = [int]$saved[1]
          $v.RevisionsFilter.View = [int]$saved[2]
          $v.ShowRevisionsAndComments = [bool]$saved[3]
          $v.RevisionsView = [int]$saved[4]
        } catch {}
      }
      $d.Close(0)
    }
  }
} finally {
  Set-Content -Path ([string](Join-Path $OutDir '_log.txt')) -Value $log -Encoding UTF8
  if ($word.Documents.Count -eq 0) { $word.Quit() }
}

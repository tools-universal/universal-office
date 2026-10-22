# Oraculo da guia PAGINA INICIAL do Write: cada experimento cria um documento novo
# no Word (COM invisivel), aplica UMA operacao e salva o .docx (e o PDF com -Pdf);
# grava <nome>.json com o que o experimento devolveu (medidas do modelo de objetos).
#
# Uso (sempre pela trava global, via run.mjs):
#   powershell -File home-oracle.ps1 -OutDir <pasta> -Set <arquivo exp-*.ps1> [-Only a,b] [-Pdf]
#
# Regras (doc-lab/word-com.ps1): sem janelas, so fecha o que abriu, Quit so sem
# documentos, caminhos em [string] (PSObject trava o SaveAs2). ASCII puro.
param(
  [Parameter(Mandatory=$true)][string]$OutDir,
  [Parameter(Mandatory=$true)][string]$Set,
  [string]$Only = '',
  [switch]$Pdf
)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
. (Join-Path $PSScriptRoot '..\doc-lab\word-com.ps1')
. (Join-Path $PSScriptRoot $Set)
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$onlySet = @{}
foreach ($o in ($Only -split ',')) { if ($o.Trim() -ne '') { $onlySet[$o.Trim()] = $true } }

function Write-Utf8([string]$path, [string]$text) {
  [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
}

$app = New-WordApp
try {
  foreach ($ex in $EXPERIMENTS) {
    if ($onlySet.Count -gt 0 -and -not $onlySet.ContainsKey($ex.Name)) { continue }
    $base = [string](Join-Path $OutDir $ex.Name)
    $doc = $null
    try {
      $doc = $app.Documents.Add()
      if ($ex.Contains('Compat')) { $doc.SetCompatibilityMode([int]$ex.Compat) }
      $res = & $ex.Run $app $doc
      if ($res -eq $null) { $res = [ordered]@{} }
      $doc.SaveAs2([string]($base + '.docx'), 16)
      if ($Pdf -or $ex.Contains('Pdf')) { $doc.ExportAsFixedFormat([string]($base + '.pdf'), 17) }
      Write-Utf8 ($base + '.json') ($res | ConvertTo-Json -Depth 8)
      Emit ("ok " + $ex.Name)
    } catch {
      Write-Utf8 ($base + '.json') ((@{ error = [string]$_.Exception.Message }) | ConvertTo-Json)
      Emit ("ERRO " + $ex.Name + ": " + $_.Exception.Message)
    } finally {
      if ($doc -ne $null) { try { $doc.Close(0) } catch {} }
    }
  }
} finally { Close-WordApp $app }

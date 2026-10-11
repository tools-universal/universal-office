# Verificacao do lab .doc: o Word real (COM invisivel) abre cada .docx da lista
# (somente leitura) e informa paginas (ComputeStatistics) e paragrafos. Serve
# para provar que o .docx convertido abre no Word e para comparar a paginacao
# com a do .docx que o proprio Word salvou do .doc.
#
# Uso: powershell -File word-check.ps1 -List <arquivo>
#   <arquivo>: uma linha por documento, "id|caminho\do\arquivo.docx"
#   Saida: "OK id pages=N paras=M" ou "ERR id mensagem".
param(
  [Parameter(Mandatory=$true)][string]$List
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'word-com.ps1')
$items = Read-DocList $List
$w = New-WordApp
$prevSec = $null
try { $prevSec = $w.AutomationSecurity; $w.AutomationSecurity = 3 } catch {}
try {
  foreach ($it in $items) {
    $id = $it[0]; $path = $it[1]
    try {
      $w = Invoke-WithWord $w {
        param($app)
        $doc = $null
        try {
          $doc = $app.Documents.Open($path, $false, $true, $false, 'x-sem-senha', 'x-sem-senha')
          $pages = $doc.ComputeStatistics(2)
          $paras = $doc.Paragraphs.Count
          Emit ("OK " + $id + " pages=" + $pages + " paras=" + $paras + " compat=" + $doc.CompatibilityMode)
        } finally {
          if ($doc -ne $null) { try { $doc.Close([ref]0) | Out-Null } catch {} }
        }
      }
    } catch {
      Emit ("ERR " + $id + " " + ($_.Exception.Message -replace "[\r\n]+", ' '))
    }
  }
} finally {
  if ($prevSec -ne $null) { try { $w.AutomationSecurity = $prevSec } catch {} }
  Close-WordApp $w
}

# Fixtures do conversor .doc: o Word real (COM invisivel) abre cada .docx
# sintetico, salva como .doc (SaveAs2 formato 0 = Word 97-2003, sem fontes
# embutidas) e, do .doc reaberto, salva o .docx de referencia
# (<nome>.word.docx, formato 16).
# Uso: powershell -File gen-fixtures.ps1 -List <arquivo> -OutDir <pasta>
#   <arquivo>: linhas "nome|caminho\do\sintetico.docx"
param(
  [Parameter(Mandatory=$true)][string]$List,
  [Parameter(Mandatory=$true)][string]$OutDir
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'word-com.ps1')
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$items = Read-DocList $List
$w = New-WordApp
$prevSec = $null
try { $prevSec = $w.AutomationSecurity; $w.AutomationSecurity = 3 } catch {}
try {
  foreach ($it in $items) {
    $id = $it[0]; $path = $it[1]
    $docPath = [string](Join-Path $OutDir ($id + '.doc'))
    $refPath = [string](Join-Path $OutDir ($id + '.word.docx'))
    try {
      $w = Invoke-WithWord $w {
        param($app)
        $doc = $null
        try {
          # o .docx sintetico (nao somente leitura: precisamos salvar como)
          $doc = $app.Documents.Open($path, $false, $false, $false)
          $doc.EmbedTrueTypeFonts = $false
          # sem metadados pessoais (autor/ultimo autor) nas fixtures: wdRDIDocumentProperties = 8
          $doc.RemoveDocumentInformation(8)
          $doc.SaveAs2($docPath, 0) | Out-Null
          $doc.Close([ref]0) | Out-Null
          $doc = $null
          $doc = $app.Documents.Open($docPath, $false, $true, $false)
          $doc.RemoveDocumentInformation(8)
          $doc.SaveAs2($refPath, 16) | Out-Null
          Emit ("OK " + $id)
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

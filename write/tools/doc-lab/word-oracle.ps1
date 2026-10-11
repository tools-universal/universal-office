# Oraculo do lab .doc: o Word real abre cada .doc (somente leitura, invisivel)
# e salva como .docx (SaveAs2 formato 16 = wdFormatXMLDocument), mantendo o
# modo de compatibilidade do documento (CompatibilityMode omitido = atual).
#
# Uso: powershell -File word-oracle.ps1 -List <arquivo> -OutDir <pasta>
#   <arquivo>: uma linha por documento, "id|caminho\do\arquivo.doc"
#   Saida: <OutDir>\<id>.docx ; progresso no stdout ("OK id", "ERR id msg").
#
# Regras (word-com.ps1): sem janelas, macros desligadas durante o uso (o valor
# anterior e restaurado), so fecha os documentos que abriu, Quit so sem
# documentos abertos (a instancia pode ser compartilhada com outra automacao).
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
    # [string]: o Join-Path devolve PSObject e o COM do Word TRAVA no SaveAs2 com ele
    $out = [string](Join-Path $OutDir ($id + '.docx'))
    try {
      $w = Invoke-WithWord $w {
        param($app)
        $doc = $null
        try {
          # Open(FileName, ConfirmConversions, ReadOnly, AddToRecentFiles, PasswordDocument,
          #      PasswordTemplate) -- senha falsa: documento protegido falha em vez de pedir
          $doc = $app.Documents.Open($path, $false, $true, $false, 'x-sem-senha', 'x-sem-senha')
          $doc.SaveAs2($out, 16) | Out-Null
          Emit ("OK " + $id + " compat=" + $doc.CompatibilityMode)
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

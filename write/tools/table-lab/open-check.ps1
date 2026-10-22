# Abre no Word (COM, invisivel) .docx gravados pelo editor com as funcoes de
# tabela e relata o que o Word ve: paragrafos, tabelas (e aninhadas), campos,
# objetos OLE (ProgID), bordas de pagina e estilos de tabela personalizados.
# Saida: uma linha TSV por documento (falha ao abrir = "open-failed").
#
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File write/tools/table-lab/open-check.ps1 -Files a.docx,b.docx
param([Parameter(Mandatory = $true)][string[]]$Files)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\doc-lab\word-com.ps1')

$app = New-WordApp
# (com -File a lista chega como um texto so: "a.docx,b.docx")
foreach ($f in ($Files | ForEach-Object { $_ -split ',' })) {
  [string]$path = $f
  $status = 'ok'
  $detail = ''
  try {
    $app = Invoke-WithWord $app {
      param($w)
      $d = $w.Documents.Open($path, $false, $true, $false)
      try {
        $nested = 0
        foreach ($t in $d.Tables) { $nested += $t.NestingLevel - 1 + $t.Tables.Count }
        $fields = @()
        foreach ($fl in $d.Fields) {
          # (o EMBED de um objeto fora de tabela nao tem Result)
          $res = ''
          try { $res = ([string]$fl.Result.Text).Trim() } catch { }
          $fields += ([string]$fl.Code.Text).Trim() + ' => ' + $res
        }
        $ole = @()
        foreach ($s in $d.InlineShapes) { if ($s.Type -eq 1) { $ole += [string]$s.OLEFormat.ProgID } }
        $styles = @()
        foreach ($st in $d.Styles) { if ($st.Type -eq 3 -and -not $st.BuiltIn) { $styles += [string]$st.NameLocal } }
        $sec = $d.Sections.Item($d.Sections.Count)
        $script:line = "paras=$($d.Paragraphs.Count) tabelas=$($d.Tables.Count) aninhadas=$nested campos=[$($fields -join '; ')] ole=[$($ole -join ',')] bordas=$([bool]$sec.Borders.Enable) estilos=[$($styles -join ',')]"
      } finally { $d.Close([ref]0) }
    }
    $detail = $script:line
  } catch {
    $status = 'open-failed'
    $detail = (([string]$_.Exception.Message) -replace "[`r`n`t]", ' ') + ' @linha ' + $_.InvocationInfo.ScriptLineNumber
  }
  Emit "$(Split-Path -Leaf $path)`t$status`t$detail"
}
Close-WordApp $app

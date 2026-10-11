# Depuracao de paginacao: para cada .docx da lista, informa a pagina em que
# comeca cada paragrafo (Range.Information(wdActiveEndPageNumber=3)), a posicao
# vertical na pagina (wdVerticalPositionRelativeToPage=6, em pontos) e o inicio
# do texto. Document.Paragraphs inclui as marcas de fim de celula/linha.
# Uso: powershell -File word-pages.ps1 -List <arquivo>   (linhas "id|caminho")
# Saida: "P id idx pagina y texto" por paragrafo e "OK id" no fim de cada documento.
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
          $doc.Repaginate()
          $i = 0
          foreach ($p in $doc.Paragraphs) {
            $r = $p.Range
            $pg = $r.Information(3)
            $y = $r.Information(6)
            $t = [string]$r.Text
            if ($t.Length -gt 30) { $t = $t.Substring(0, 30) }
            $t = $t -replace '[\x00-\x1F]', '~'
            Emit ("P " + $id + " " + $i + " " + $pg + " " + $y + " " + $t)
            $i++
          }
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

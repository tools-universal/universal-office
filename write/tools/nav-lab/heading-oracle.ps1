# Arvore de TITULOS como o Word a ve, para conferir o Painel de Navegacao.
# Para cada documento da lista (id|caminho), abre somente leitura (COM
# invisivel) e grava <OutDir>\<id>.json com:
#  - paras: os paragrafos do texto principal com nivel de topico < 10
#    (Paragraph.OutlineLevel), com o indice do paragrafo, o texto (sem o
#    marcador), o texto da numeracao (ListFormat.ListString), se esta em tabela;
#  - goto: as posicoes por onde Selection.GoTo(wdGoToHeading, wdGoToNext) passa
#    (a navegacao por titulos do Word), com o paragrafo de cada uma.
#
#   powershell -File heading-oracle.ps1 -List <lista> -OutDir <pasta> [-MaxParas 1500]
# Sempre pela trava global (run-headings.mjs). ASCII puro.
param(
  [Parameter(Mandatory=$true)][string]$List,
  [Parameter(Mandatory=$true)][string]$OutDir,
  [int]$MaxParas = 1500
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\doc-lab\word-com.ps1')
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function Write-Utf8([string]$path, [string]$text) {
  [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
}
function Clean([string]$s) {
  if ($s.Length -gt 120) { $s = $s.Substring(0, 120) }
  return ($s -replace "[\r\a\x0b\x0c]", ' ').TrimEnd()
}

$docs = Read-DocList $List
$app = New-WordApp
$prevSec = $null
try { $prevSec = $app.AutomationSecurity; $app.AutomationSecurity = 3 } catch {}
try {
  foreach ($d in $docs) {
    [string]$id = $d[0]
    [string]$path = $d[1]
    [string]$out = Join-Path $OutDir ($id + '.json')
    if (Test-Path -LiteralPath $out) { continue }
    try {
      $app = Invoke-WithWord $app {
        param($w)
        $doc = $w.Documents.Open($path, $false, $true, $false)
        try {
          $o = [ordered]@{ id = $id; paras = @(); goto = @() }
          $n = $doc.Paragraphs.Count
          $o.count = $n
          if ($n -le $MaxParas) {
            $i = 0
            foreach ($p in $doc.Paragraphs) {
              $i++
              $lvl = $p.OutlineLevel
              if ($lvl -ge 10) { continue }
              $r = $p.Range
              $inT = $false
              try { $inT = [bool]$r.Information(12) } catch {}
              $ls = ''
              try { $ls = [string]$r.ListFormat.ListString } catch {}
              $o.paras += [ordered]@{ i = $i; start = $r.Start; level = $lvl; text = (Clean ([string]$r.Text)); list = $ls; table = $inT }
            }
            # navegacao por titulos (Ctrl+PgDn com "Procurar por titulo")
            $sel = $w.Selection
            $sel.HomeKey(6) | Out-Null
            $last = -1
            for ($k = 0; $k -lt 2000; $k++) {
              $sel.GoTo(11, 2) | Out-Null
              $s = $sel.Start
              if ($s -le $last) { break }
              $last = $s
              $o.goto += [ordered]@{ start = $s; text = (Clean ([string]$sel.Paragraphs.Item(1).Range.Text)) }
            }
          } else { $o.skipped = 'too many paragraphs' }
          Write-Utf8 $out ($o | ConvertTo-Json -Depth 5 -Compress)
        } finally { $doc.Close([ref]0) | Out-Null }
      }
      Emit ('OK ' + $id)
    } catch {
      Emit ('ERR ' + $id + ' ' + ($_.Exception.Message -replace "[\r\n]+", ' '))
      Write-Utf8 $out (@{ id = $id; error = [string]$_.Exception.Message } | ConvertTo-Json -Compress)
    }
  }
} finally {
  if ($prevSec -ne $null) { try { $app.AutomationSecurity = $prevSec } catch {} }
  Close-WordApp $app
}

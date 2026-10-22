# Investiga o REF RefLossless que dobra ao atualizar (ref-result): posicoes do campo,
# estilo do paragrafo do indicador e o resultado depois de mexer em cada suspeito.
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File write/tools/refs-lab/ref-probe2.ps1 -Path <docx>
param([string]$Path)
$ErrorActionPreference = 'Stop'
$w = New-Object -ComObject Word.Application
$w.Visible = $false
$w.DisplayAlerts = 0
function Probe([string]$label, [scriptblock]$prep) {
  [string]$p = $Path
  $d = $script:w.Documents.Open($p, $false, $true, $false)
  try {
    & $prep $d
    $bm = $d.Bookmarks.Item('RefLossless')
    foreach ($fl in $d.Fields) {
      if (([string]$fl.Code.Text).Contains('REF RefLossless')) {
        $null = $fl.Update()
        Write-Host ("{0,-28} indicador [{1}] estilo [{2}] REF [{3}]" -f $label, [string]$bm.Range.Text, [string]$bm.Range.Paragraphs.Item(1).Style.NameLocal, [string]$fl.Result.Text)
      }
    }
  } finally { $d.Close(0) }
}
$script:w = $w
Probe 'como esta' { param($d) }
Probe 'paragrafo Normal' { param($d) $d.Bookmarks.Item('RefLossless').Range.Paragraphs.Item(1).Style = -1 }
Probe 'sem formatacao direta' { param($d) $d.Bookmarks.Item('RefLossless').Range.Font.Reset() }
Probe 'TrackRevisions off' { param($d) $d.TrackRevisions = $false }
Probe 'revisoes aceitas' { param($d) $d.Revisions.AcceptAll() }
$d = $w.Documents.Open([string]$Path, $false, $true, $false)
try {
  Write-Host "revisoes: $($d.Revisions.Count) controle: $($d.TrackRevisions) protecao: $($d.ProtectionType) campos: $($d.Fields.Count)"
  $bm = $d.Bookmarks.Item('RefLossless')
  Write-Host ("estilo do indicador: " + [string]$bm.Range.Paragraphs.Item(1).Style.NameLocal + " / tipo " + $bm.Range.Paragraphs.Item(1).Style.Type)
} finally { $d.Close(0) }
if ($w.Documents.Count -eq 0) { $w.Quit() }

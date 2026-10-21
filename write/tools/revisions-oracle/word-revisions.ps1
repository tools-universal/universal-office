# Controle de alteracoes: o que o Word le dos .docx de uma pasta (gravados por
# nos) — Doc.Revisions (tipo, autor, data, texto, descricao da formatacao),
# Doc.TrackRevisions e se o arquivo abriu sem reparo. Invisivel; uma linha TSV
# por revisao e uma de resumo por arquivo:
#   <arquivo>\tREV\t<tipo>\t<autor>\t<data>\t<texto>\t<descricao>
#   <arquivo>\tDOC\t<ok|open-failed>\t<n revisoes>\t<track>\t<detalhe>
# Uso (sempre pela trava global):
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass
#     -File write/tools/revisions-oracle/word-revisions.ps1 -Dir <pasta>
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
param([Parameter(Mandatory = $true)][string]$Dir)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\doc-lab\word-com.ps1')
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$clean = { param([string]$s) ($s -replace "[`r`n`t]", ' ') }
$app = New-WordApp
try {
  foreach ($f in (Get-ChildItem -LiteralPath $Dir -Filter *.docx | Sort-Object Name)) {
    [string]$p = $f.FullName
    try {
      $app = Invoke-WithWord $app {
        param($w)
        # OpenAndRepair = $false: arquivo invalido falha em vez de ser consertado
        $d = $w.Documents.Open($p, $false, $true, $false, '', '', $false, '', '', 0, 0, $false, $false)
        try {
          $n = $d.Revisions.Count
          for ($i = 1; $i -le $n; $i++) {
            $r = $d.Revisions.Item($i)
            $desc = ''
            try { $desc = [string]$r.FormatDescription } catch {}
            Emit ("{0}`tREV`t{1}`t{2}`t{3}`t{4}`t{5}" -f $f.Name, $r.Type, $r.Author, ([datetime]$r.Date).ToString('yyyy-MM-ddTHH:mm'), (& $clean ([string]$r.Range.Text)), (& $clean $desc))
          }
          Emit ("{0}`tDOC`tok`t{1}`t{2}`t" -f $f.Name, $n, $d.TrackRevisions)
        } finally { $d.Close([ref]0) }
      }
    } catch {
      Emit ("{0}`tDOC`topen-failed`t0`t`t{1}" -f $f.Name, (& $clean ([string]$_.Exception.Message)))
    }
  }
} finally {
  Close-WordApp $app
}

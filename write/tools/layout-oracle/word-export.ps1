# Exporta para PDF (Word real via COM, invisivel) todo .docx de uma pasta.
# Uma sessao do Word para o lote; abre somente-leitura, sem janela. O Word de
# automacao pode ser compartilhado com outro processo: so chama Quit() se nao
# sobrou documento aberto.
# Uso: powershell -ExecutionPolicy Bypass -File word-export.ps1 -InDir <pasta> -OutDir <pasta> [-Xps]
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
param([string]$InDir, [string]$OutDir, [switch]$Xps)
$InDir = (Resolve-Path $InDir).Path
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$OutDir = (Resolve-Path $OutDir).Path
$fmt = 17
$ext = '.pdf'
if ($Xps) { $fmt = 18; $ext = '.xps' }

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$files = Get-ChildItem -Path $InDir -Filter *.docx | Sort-Object Name
foreach ($f in $files) {
  $p = [string]$f.FullName
  # [string]: Join-Path devolve um PSObject, que o COM marshala errado (o Word trava)
  $out = [string](Join-Path $OutDir ($f.BaseName + $ext))
  try {
    $doc = $word.Documents.Open($p, $false, $true, $false)
    # casos mk-* (controle de alteracoes): PDF "com marcacao" (Item 7 = wdExportDocumentWithMarkup)
    if ($f.BaseName.StartsWith('mk-')) { $doc.ExportAsFixedFormat($out, [int]$fmt, $false, 0, 0, 1, 1, 7) }
    else { $doc.ExportAsFixedFormat($out, [int]$fmt) }
    $doc.Close($false)
    Write-Host "ok $($f.Name)"
  } catch {
    Write-Host "ERRO $($f.Name): $($_.Exception.Message)"
  }
}
if ($word.Documents.Count -eq 0) { $word.Quit() }

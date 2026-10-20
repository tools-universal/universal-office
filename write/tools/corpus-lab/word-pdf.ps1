# Exporta documentos do corpus para PDF com o Word real (COM, invisivel).
# Lista "id|documento|pdf" (UTF-8). Por padrao, uma sessao NOVA do Word por
# documento (-PerSession N agrupa N): a substituicao de fonte ausente fica
# memorizada na sessao e contaminaria os documentos seguintes.
# Cada sessao imprime "BEFORE <pids>" antes de criar o Word, "PID <n>" logo
# depois e "PID-END <n>" ao fecha-lo, para o vigia (word-pdfs.mjs) encerrar SO
# a instancia que este script criou (mesmo travada na criacao) e nunca um PID
# reciclado.
# Saida: "OK <id> <paginas>" / "ERR <id> <mensagem>".
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
param([string]$List, [int]$PerSession = 1)

function Emit([string]$s) { [Console]::Out.WriteLine($s); [Console]::Out.Flush() }

function New-OwnWord {
  # mutex entre os trabalhadores paralelos: o PID novo e o que surgiu entre
  # o antes e o depois da criacao
  $mtx = New-Object System.Threading.Mutex($false, 'Global\uo-corpus-word-pdf')
  # trabalhador encerrado pelo vigia com o mutex na mao: o mutex fica abandonado,
  # mas o WaitOne seguinte o recebe mesmo assim
  try { [void]$mtx.WaitOne() } catch [System.Threading.AbandonedMutexException] {}
  try {
    $before = @(Get-Process WINWORD -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
    Emit ("BEFORE " + ($before -join ','))
    $app = New-Object -ComObject Word.Application
    $app.Visible = $false
    $app.DisplayAlerts = 0
    $app.AutomationSecurity = 3   # msoAutomationSecurityForceDisable: sem macros
    $after = @(Get-Process WINWORD -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
    $new = @($after | Where-Object { $before -notcontains $_ })
    if ($new.Count -ne 1) { Emit "ABORT instancia do Word nao e nova"; try { $app.Quit([ref]0) } catch {}; exit 3 }
    $script:ownPid = [int]$new[0]
    Emit "PID $($new[0])"
    return $app
  } finally { $mtx.ReleaseMutex(); $mtx.Dispose() }
}

function Close-OwnWord($app) {
  if ($app -eq $null) { return }
  try { foreach ($d in @($app.Documents)) { try { $d.Close([ref]0) } catch {} } } catch {}
  try { $app.NormalTemplate.Saved = $true } catch {}
  try { $app.Quit([ref]0) } catch {}
  try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($app) | Out-Null } catch {}
  # espera o processo sair antes de liberar o PID para o vigia
  if ($script:ownPid) {
    try { Wait-Process -Id $script:ownPid -Timeout 30 -ErrorAction SilentlyContinue } catch {}
    # nao saiu: e nosso, encerra
    if (Get-Process -Id $script:ownPid -ErrorAction SilentlyContinue) { Stop-Process -Id $script:ownPid -Force -ErrorAction SilentlyContinue }
    Emit "PID-END $($script:ownPid)"
    $script:ownPid = 0
  }
}

$items = @()
foreach ($line in (Get-Content -LiteralPath $List -Encoding UTF8)) {
  if ($line.Trim() -eq '') { continue }
  $p = $line.Split('|', 3)
  $items += ,@([string]$p[0], [string]$p[1], [string]$p[2])
}

$script:ownPid = 0
$missing = [Type]::Missing
$app = $null
$n = 0
foreach ($it in $items) {
  if ($app -eq $null -or ($n % $PerSession) -eq 0) {
    Close-OwnWord $app
    $app = New-OwnWord
  }
  $n++
  $id = [string]$it[0]; $src = [string]$it[1]; $out = [string]$it[2]
  try {
    New-Item -ItemType Directory -Force -Path ([string](Split-Path -Parent $out)) | Out-Null
    # Open(FileName, ConfirmConversions, ReadOnly, AddToRecentFiles, PasswordDocument,
    #      PasswordTemplate, Revert, WritePasswordDocument, WritePasswordTemplate,
    #      Format, Encoding, Visible, OpenAndRepair, DocumentDirection, NoEncodingDialog)
    # senha ficticia: documento protegido falha em vez de abrir dialogo
    $doc = $app.Documents.Open($src, $false, $true, $false, 'x-no-pass', 'x-no-pass', $false,
      'x-no-pass', 'x-no-pass', 0, $missing, $false, $false, 0, $true)
    $pages = [int]$doc.ComputeStatistics(2)
    $doc.ExportAsFixedFormat($out, [int]17)
    $doc.Close([ref]0)
    Emit "OK $id $pages"
  } catch {
    $msg = ([string]$_.Exception.Message) -replace '[\r\n]+', ' '
    Emit "ERR $id $msg"
    # sessao possivelmente suja: a proxima comeca nova
    Close-OwnWord $app
    $app = $null
  }
}
Close-OwnWord $app

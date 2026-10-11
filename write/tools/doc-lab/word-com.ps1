# Funcoes comuns dos scripts COM do lab .doc (carregar com dot-source).
#
# O COM pode ligar varias automacoes ao MESMO processo WINWORD /Automation
# (outros labs rodam em paralelo). Regras:
#  - Visible=$false e DisplayAlerts=0 sempre; nada de janelas;
#  - so fechamos os documentos que abrimos; Quit apenas se nao sobrar documento;
#  - nunca matar processo do Word;
#  - se a chamada COM falhar com o servidor desconectado (RPC_E_DISCONNECTED,
#    servidor indisponivel), recriar o objeto e tentar de novo.

function New-WordApp {
  $app = New-Object -ComObject Word.Application
  $app.Visible = $false
  $app.DisplayAlerts = 0
  return $app
}

function Test-ComDisconnected($err) {
  $hr = 0
  try { $hr = $err.Exception.HResult } catch {}
  $msg = [string]$err.Exception.Message
  return ($hr -eq -2147417848 -or $hr -eq -2147023174 -or $hr -eq -2147023170 -or
    $msg -match 'RPC_E_DISCONNECTED|0x80010108|0x800706BA|0x800706BE|servidor RPC|RPC server|disconnected|desconectad')
}

# Executa $work com o objeto Word (param $app); recria o objeto e repete ate 2x
# se o servidor COM caiu. Devolve o objeto Word vigente.
function Invoke-WithWord($app, [scriptblock]$work) {
  $attempt = 0
  while ($true) {
    try {
      & $work $app
      return $app
    } catch {
      if ((Test-ComDisconnected $_) -and $attempt -lt 2) {
        $attempt++
        Start-Sleep -Milliseconds 500
        $app = New-WordApp
        continue
      }
      throw
    }
  }
}

function Close-WordApp($app) {
  if ($app -eq $null) { return }
  try {
    if ($app.Documents.Count -eq 0) {
      try { $app.NormalTemplate.Saved = $true } catch {}
      $app.Quit([ref]0)
    }
  } catch {}
  try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($app) | Out-Null } catch {}
}

# Linha de resultado direto no stdout (sem passar pelo pipeline das funcoes).
function Emit([string]$s) {
  [Console]::Out.WriteLine($s)
  [Console]::Out.Flush()
}

# Le a lista "id|caminho" (UTF-8).
function Read-DocList([string]$list) {
  $out = @()
  foreach ($line in (Get-Content -LiteralPath $list -Encoding UTF8)) {
    if ($line.Trim() -eq '') { continue }
    $parts = $line.Split('|', 2)
    $out += ,@([string]$parts[0], [string]$parts[1])
  }
  return ,$out
}

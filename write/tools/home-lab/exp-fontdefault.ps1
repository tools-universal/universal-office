# Experimentos de "Definir como Padrao" (dialogo Fonte): o que muda no documento.
# Para nao tocar o Normal.dotm, o documento nasce de um modelo TEMPORARIO (.dotx em
# %TEMP%) e o SetAsTemplateDefault grava nele. Carregado por home-oracle.ps1. ASCII puro.

function Temp-Template($app) {
  $t = [string](Join-Path $env:TEMP ('uw-home-tpl-' + [guid]::NewGuid().ToString('N') + '.dotx'))
  $d = $app.Documents.Add()
  $d.SaveAs2($t, 14)
  $d.Close(0)
  return $t
}

$EXPERIMENTS = @(
  @{ Name = 'fd-font'; Run = { param($app, $doc)
      $doc.Close(0)
      $t = Temp-Template $app
      $d = $app.Documents.Add($t)
      $d.Content.Text = "Texto de exemplo"
      $r = $d.Range(0, 5)
      $r.Font.Name = 'Georgia'; $r.Font.Size = 14; $r.Font.Color = 255
      $err = ''; try { $r.Font.SetAsTemplateDefault() } catch { $err = [string]$_.Exception.Message }
      $base = [string](Join-Path $OutDir 'fd-font')
      $d.SaveAs2([string]($base + '.docx'), 16)
      $d.Close(0)
      Remove-Item -LiteralPath $t -ErrorAction SilentlyContinue
      $script:SKIPSAVE = $true
      [ordered]@{ err = $err } } }
)

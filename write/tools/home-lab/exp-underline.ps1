# Experimentos de SUBLINHADO (estilo e cor): o XML w:u que o Word grava.
# Carregado por home-oracle.ps1 (-Set exp-underline.ps1). ASCII puro.

$UL = [ordered]@{ single = 1; words = 2; double = 3; dotted = 4; thick = 6; dash = 7; dotDash = 9; dotDotDash = 10; wavy = 11;
  dottedHeavy = 20; dashHeavy = 23; dotDashHeavy = 25; dotDotDashHeavy = 26; wavyHeavy = 27; dashLong = 39; wavyDouble = 43; dashLongHeavy = 55 }

function Base-Text($doc) {
  $doc.Content.Text = "Antes do trecho sublinhado depois"
  $r = $doc.Range(6, 26)
  return $r
}

$EXPERIMENTS = @()
foreach ($k in $UL.Keys) {
  $v = $UL[$k]
  $EXPERIMENTS += @{ Name = "u-$k"; Run = [scriptblock]::Create("param(`$app, `$doc) `$r = Base-Text `$doc; `$r.Font.Underline = $v; [ordered]@{ underline = `$r.Font.Underline; color = `$r.Font.UnderlineColor }") }
}
$EXPERIMENTS += @(
  @{ Name = 'u-color-red'; Run = { param($app, $doc) $r = Base-Text $doc; $r.Font.Underline = 3; $r.Font.UnderlineColor = 255; [ordered]@{ color = $r.Font.UnderlineColor } } },
  @{ Name = 'u-color-auto'; Run = { param($app, $doc) $r = Base-Text $doc; $r.Font.Underline = 1; $r.Font.UnderlineColor = 255; $r.Font.UnderlineColor = -16777216; [ordered]@{ color = $r.Font.UnderlineColor } } },
  # cor de tema: o WdColor que o Word devolve para a cor do texto com tema, depois aplicado ao sublinhado
  @{ Name = 'u-color-theme'; Run = { param($app, $doc) $r = Base-Text $doc
      $r.Font.TextColor.ObjectThemeColor = 5
      $c = $r.Font.Color
      $r.Font.TextColor.RGB = 0
      $r.Font.Underline = 1; $r.Font.UnderlineColor = $c
      [ordered]@{ themeWd = $c; color = $r.Font.UnderlineColor } } },
  @{ Name = 'u-color-theme-tint'; Run = { param($app, $doc) $r = Base-Text $doc
      $r.Font.TextColor.ObjectThemeColor = 6; $r.Font.TextColor.TintAndShade = 0.4
      $c = $r.Font.Color
      $r.Font.TextColor.RGB = 0
      $r.Font.Underline = 1; $r.Font.UnderlineColor = $c
      [ordered]@{ themeWd = $c; color = $r.Font.UnderlineColor } } },
  @{ Name = 'u-color-theme-shade'; Run = { param($app, $doc) $r = Base-Text $doc
      $r.Font.TextColor.ObjectThemeColor = 7; $r.Font.TextColor.TintAndShade = -0.25
      $c = $r.Font.Color
      $r.Font.TextColor.RGB = 0
      $r.Font.Underline = 1; $r.Font.UnderlineColor = $c
      [ordered]@{ themeWd = $c; color = $r.Font.UnderlineColor } } },
  # botao Sublinhado (ExecuteMso) sobre texto com sublinhado duplo e sobre texto sem sublinhado
  @{ Name = 'u-toggle-double'; Run = { param($app, $doc) $r = Base-Text $doc; $r.Font.Underline = 3; $r.Select()
      $err = ''; try { $app.CommandBars.ExecuteMso('Underline') } catch { $err = [string]$_.Exception.Message }
      [ordered]@{ after = $r.Font.Underline; err = $err } } },
  @{ Name = 'u-toggle-none'; Run = { param($app, $doc) $r = Base-Text $doc; $r.Select()
      $err = ''; try { $app.CommandBars.ExecuteMso('Underline') } catch { $err = [string]$_.Exception.Message }
      [ordered]@{ after = $r.Font.Underline; err = $err } } },
  # sublinhado parcial: a selecao mistura sublinhado e nao sublinhado
  @{ Name = 'u-toggle-mixed'; Run = { param($app, $doc) $r = Base-Text $doc; $doc.Range(6, 12).Font.Underline = 3; $r.Select()
      $err = ''; try { $app.CommandBars.ExecuteMso('Underline') } catch { $err = [string]$_.Exception.Message }
      [ordered]@{ after = $r.Font.Underline; first = $doc.Range(6, 7).Font.Underline; last = $doc.Range(20, 21).Font.Underline; err = $err } } },
  # Ctrl+Shift+D (sublinhado duplo) e Ctrl+Shift+W (so palavras) via comandos do WordBasic
  @{ Name = 'u-wb-double'; Run = { param($app, $doc) $r = Base-Text $doc; $r.Select(); $err = ''
      try { $app.WordBasic.DoubleUnderline() } catch { $err = [string]$_.Exception.Message }
      [ordered]@{ after = $r.Font.Underline; err = $err } } },
  @{ Name = 'u-wb-words'; Run = { param($app, $doc) $r = Base-Text $doc; $r.Select(); $err = ''
      try { $app.WordBasic.WordUnderline() } catch { $err = [string]$_.Exception.Message }
      [ordered]@{ after = $r.Font.Underline; err = $err } } },
  # estilo com sublinhado e o texto tira (w:u none)
  @{ Name = 'u-none-over-style'; Run = { param($app, $doc) $r = Base-Text $doc
      $st = $doc.Styles.Add('Sublinhado Estilo', 2); $st.Font.Underline = 1
      $r.Style = $st; $doc.Range(6, 12).Font.Underline = 0
      [ordered]@{ after = $doc.Range(6, 12).Font.Underline } } }
)

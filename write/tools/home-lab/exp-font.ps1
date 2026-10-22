# Experimentos do grupo FONTE/PARAGRAFO (Maiusculas e Minusculas, Bordas da Pagina
# Inicial, atalhos). Carregado por home-oracle.ps1 (-Set exp-font.ps1). ASCII puro.

$CASE_TEXT = "o rio de janeiro. a cidade MARAVILHOSA tem praias! E o Sol? ja nasceu; 3o lugar. fim"

function Case-Exp([string]$name, [int]$mode, [int]$times = 1) {
  return @{ Name = $name; Run = [scriptblock]::Create("param(`$app, `$doc) `$doc.Content.Text = '$CASE_TEXT'; `$r = `$doc.Range(0, `$doc.Content.End - 1); `$out = @(); for (`$i = 0; `$i -lt $times; `$i++) { `$r.Case = $mode; `$out += `$r.Text }; [ordered]@{ texts = `$out }") }
}

# idMso dos itens do botao Bordas (cada um num documento novo, num paragrafo do meio)
$BORDER_IDS = @('BorderBottom', 'BorderTop', 'BorderLeft', 'BorderRight', 'BorderNone', 'BorderAllWord',
  'BorderOutside', 'BorderInside', 'BorderInsideHorizontal', 'BorderInsideVertical', 'BorderDiagonalDown', 'BorderDiagonalUp', 'HorizontalLineInsert', 'BorderHorizontalLine', 'InsertHorizontalLineWord')

function Border-Exp([string]$id, [bool]$twoParas) {
  $sel = if ($twoParas) { '$doc.Range($doc.Paragraphs.Item(2).Range.Start, $doc.Paragraphs.Item(3).Range.End).Select()' } else { '$doc.Paragraphs.Item(2).Range.Select()' }
  $suffix = if ($twoParas) { '-2p' } else { '' }
  return @{ Name = "bd-$id$suffix"; Run = [scriptblock]::Create("param(`$app, `$doc) `$doc.Content.Text = ""Primeiro`rSegundo paragrafo`rTerceiro paragrafo`rQuarto""; $sel; `$err = ''; try { `$app.CommandBars.ExecuteMso('$id') } catch { `$err = [string]`$_.Exception.Message }; [ordered]@{ err = `$err; enabled = `$app.CommandBars.GetEnabledMso('$id') }") }
}

# atalhos: o comando ligado a cada combinacao
$KEYS = [ordered]@{
  'Ctrl+Shift+V' = @(512, 256, 86); 'Ctrl+Shift+C' = @(512, 256, 67); 'Ctrl+Alt+V' = @(512, 1024, 86); 'Ctrl+Shift+D' = @(512, 256, 68);
  'Ctrl+Shift+W' = @(512, 256, 87); 'Shift+F3' = @(256, 114); 'Ctrl+G' = @(512, 71); 'F5' = @(116); 'Ctrl+Shift+L' = @(512, 256, 76);
  'Ctrl+Alt+L' = @(512, 1024, 76); 'Alt+Shift+Left' = @(1024, 256, 37); 'Alt+Shift+Right' = @(1024, 256, 39); 'Ctrl+Shift+H' = @(512, 256, 72);
  'Ctrl+Shift+K' = @(512, 256, 75); 'Ctrl+Shift+A' = @(512, 256, 65); 'Ctrl+D' = @(512, 68); 'Ctrl+U' = @(512, 85); 'Ctrl+Space' = @(512, 32);
  'Ctrl+Alt+H' = @(512, 1024, 72); 'Alt+Ctrl+V' = @(1024, 512, 86); 'Ctrl+F3' = @(512, 114); 'Ctrl+Shift+F3' = @(512, 256, 114); 'Ctrl+Shift+N' = @(512, 256, 78)
}

$EXPERIMENTS = @(
  (Case-Exp 'case-lower' 0), (Case-Exp 'case-upper' 1), (Case-Exp 'case-title' 2), (Case-Exp 'case-sentence' 4), (Case-Exp 'case-toggle' 5),
  (Case-Exp 'case-next' -1 4),
  @{ Name = 'case-next-lower'; Run = { param($app, $doc) $doc.Content.Text = 'palavra minuscula'; $r = $doc.Range(0, $doc.Content.End - 1); $out = @(); for ($i = 0; $i -lt 4; $i++) { $r.Case = -1; $out += $r.Text }; [ordered]@{ texts = $out } } },
  @{ Name = 'case-next-upper'; Run = { param($app, $doc) $doc.Content.Text = 'PALAVRA MAIUSCULA'; $r = $doc.Range(0, $doc.Content.End - 1); $out = @(); for ($i = 0; $i -lt 4; $i++) { $r.Case = -1; $out += $r.Text }; [ordered]@{ texts = $out } } },
  @{ Name = 'case-next-title'; Run = { param($app, $doc) $doc.Content.Text = 'Palavra Titulo'; $r = $doc.Range(0, $doc.Content.End - 1); $out = @(); for ($i = 0; $i -lt 4; $i++) { $r.Case = -1; $out += $r.Text }; [ordered]@{ texts = $out } } },
  @{ Name = 'case-next-sentence'; Run = { param($app, $doc) $doc.Content.Text = 'Frase comum. outra frase'; $r = $doc.Range(0, $doc.Content.End - 1); $out = @(); for ($i = 0; $i -lt 4; $i++) { $r.Case = -1; $out += $r.Text }; [ordered]@{ texts = $out } } },
  # Maiusculas por formatacao (w:caps) x Case: o Case muda o TEXTO
  @{ Name = 'case-upper-caps'; Run = { param($app, $doc) $doc.Content.Text = 'texto com caps'; $r = $doc.Range(0, $doc.Content.End - 1); $r.Font.AllCaps = $true; $r.Case = 0; [ordered]@{ text = $r.Text; caps = $r.Font.AllCaps } } },
  @{ Name = 'keys'; Run = { param($app, $doc)
      $o = [ordered]@{}
      foreach ($k in $KEYS.Keys) {
        $a = $KEYS[$k]
        try {
          $code = 0; foreach ($x in $a) { $code += $x }
          $kb = $app.FindKey($code)
          $o[$k] = [ordered]@{ command = [string]$kb.Command; category = $kb.KeyCategory }
        } catch { $o[$k] = [string]$_.Exception.Message }
      }
      $o } }
)
foreach ($id in $BORDER_IDS) { $EXPERIMENTS += (Border-Exp $id $false); $EXPERIMENTS += (Border-Exp $id $true) }

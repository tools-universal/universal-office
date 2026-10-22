# Oraculo da frente LAYOUT DO TEXTO do Write (hifenizacao, numeros de linha,
# quebras de linha e de pagina do paragrafo, layout da secao): cada experimento
# cria um documento novo no Word (COM invisivel), monta o estado inicial, aplica
# UMA operacao (o comando da faixa de opcoes via ExecuteMso quando existe, senao
# a propriedade COM equivalente) e salva o .docx. Grava <nome>.json com o que o
# COM le depois (estado, desfazer, rotulos da faixa).
#
# Uso (sempre pela trava global, via run.mjs):
#   powershell -File textlayout-oracle.ps1 -OutDir <pasta> [-Only a,b,c]
#
# Regras (doc-lab/word-com.ps1): sem janelas, so fecha o que abriu, Quit so sem
# documentos, caminhos em [string] (PSObject trava o SaveAs2). ASCII puro.
# NUNCA ExecuteMso('HyphenationManual'/'HyphenationOptions'): abrem dialogo modal.
param(
  [Parameter(Mandatory=$true)][string]$OutDir,
  [string]$Only = ''
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\doc-lab\word-com.ps1')
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$onlySet = @{}
foreach ($o in ($Only -split ',')) { if ($o.Trim() -ne '') { $onlySet[$o.Trim()] = $true } }

function Write-Utf8([string]$path, [string]$text) {
  [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
}
function P1($doc) { return $doc.Paragraphs.Item(1) }
function Cm([double]$c) { return [single]($c * 72.0 / 2.54) }
function Mso($app, [string]$id) { $app.CommandBars.ExecuteMso($id) }
function Three($doc) { $doc.Content.Text = "um dois tres`rquatro cinco`rseis sete" }
# documento com N secoes (quebra "proxima pagina" antes dos paragrafos 2..N)
function Sections($doc, [int]$n, [int]$kind = 2) {
  $t = @(); for ($i = 1; $i -le $n; $i++) { $t += "secao $i" }
  $doc.Content.Text = ($t -join "`r")
  for ($i = $n; $i -ge 2; $i--) { $r = $doc.Paragraphs.Item($i).Range; $r.Collapse(1); $r.InsertBreak($kind) }
}
function SelSec($doc, [int]$i) { $r = $doc.Sections.Item($i).Range; $r.Collapse(1); $r.Select() }
function LnInfo($doc) {
  $o = @()
  foreach ($s in $doc.Sections) {
    $l = $s.PageSetup.LineNumbering
    $o += [ordered]@{ active = $l.Active; restart = $l.RestartMode; start = $l.StartingNumber; countBy = $l.CountBy; dist = $l.DistanceFromText }
  }
  return $o
}
function HyInfo($doc) {
  return [ordered]@{ auto = $doc.AutoHyphenation; caps = $doc.HyphenateCaps; zone = $doc.HyphenationZone; limit = $doc.ConsecutiveHyphensLimit }
}
function Pressed($app, [string[]]$ids) {
  $o = [ordered]@{}
  foreach ($id in $ids) { try { $o[$id] = $app.CommandBars.GetPressedMso($id) } catch { $o[$id] = 'ERR' } }
  return $o
}
$HYIDS = @('HyphenationNone', 'HyphenationAutomatic')
$LNIDS = @('LineNumbersContinuous', 'LineNumbersNone', 'LineNumbersOff', 'LineNumbersRestartPage', 'LineNumbersRestartSection',
  'LineNumbersRestartEachPage', 'LineNumbersRestartEachSection', 'LineNumbersSuppressForCurrentParagraph', 'LineNumbersSuppress')

$E = [ordered]@{}

# ---- linha de base ----
$E['blank'] = @{ Op = { param($app, $doc) $doc.Content.Text = 'abc' }
  Info = { param($app, $doc) [ordered]@{ hy = (HyInfo $doc); ln = (LnInfo $doc); widow = (P1 $doc).WidowControl; pressed = (Pressed $app ($HYIDS + $LNIDS)) } } }

# ---- ids da faixa de opcoes (Numeros de Linha) ----
$E['probe-ids'] = @{ Op = { param($app, $doc) $doc.Content.Text = 'abc' }
  Info = { param($app, $doc)
    $ids = @('LineNumbersMenu', 'LineNumbersContinuous', 'LineNumbersNone', 'LineNumbersOff', 'LineNumbersRestartPage', 'LineNumbersRestartSection',
      'LineNumbersRestartEachPage', 'LineNumbersRestartEachSection', 'LineNumbersEachPage', 'LineNumbersEachSection', 'LineNumbersPerPage', 'LineNumbersPerSection',
      'LineNumbersRestartEveryPage', 'LineNumbersRestartEverySection', 'LineNumbersRestartOnEachPage', 'LineNumbersRestartOnEachSection',
      'LineNumbersSuppress', 'LineNumbersSuppressForCurrentParagraph', 'LineNumbersSuppressCurrentParagraph', 'LineNumbersSuppressForParagraph', 'SuppressLineNumbers',
      'LineNumbersOptions', 'LineNumberingOptions', 'LineNumberOptions', 'LineNumbersMoreOptions', 'LineNumbersDialog', 'LineNumbering', 'LineNumbers',
      'HyphenationMenu', 'HyphenationNone', 'HyphenationAutomatic', 'HyphenationManual', 'HyphenationOptions',
      'ParagraphIndentLeft', 'ParagraphIndentRight', 'ParagraphSpacingBefore', 'ParagraphSpacingAfter', 'ParagraphSpacingMenu', 'ParagraphSpacingGallery')
    $o = [ordered]@{}
    foreach ($id in $ids) {
      $lbl = 'ERR'; try { $lbl = $app.CommandBars.GetLabelMso($id) } catch {}
      $sc = ''; try { $sc = $app.CommandBars.GetScreentipMso($id) } catch {}
      $st = ''; try { $st = $app.CommandBars.GetSupertipMso($id) } catch {}
      $o[$id] = [ordered]@{ label = $lbl; tip = $sc; super = $st }
    }
    return $o
  } }

# ---- hifenizacao (settings.xml) ----
$E['hy-auto'] = @{ Op = { param($app, $doc) $doc.Content.Text = 'abc'; Mso $app 'HyphenationAutomatic' }
  Info = { param($app, $doc) [ordered]@{ hy = (HyInfo $doc); pressed = (Pressed $app $HYIDS) } } }
$E['hy-auto-com'] = @{ Op = { param($app, $doc) $doc.Content.Text = 'abc'; $doc.AutoHyphenation = $true } }
$E['hy-auto-undo'] = @{ Op = { param($app, $doc) $doc.Content.Text = 'abc'; $u0 = $doc.Undo(0); Mso $app 'HyphenationAutomatic' }
  Info = { param($app, $doc) $a = $doc.AutoHyphenation; $ok = $doc.Undo(1); [ordered]@{ before = $a; undoReturned = $ok; after = $doc.AutoHyphenation; text = $doc.Content.Text } } }
$E['hy-none'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'abc'; $doc.AutoHyphenation = $true }
  Op = { param($app, $doc) Mso $app 'HyphenationNone' }
  Info = { param($app, $doc) [ordered]@{ hy = (HyInfo $doc); pressed = (Pressed $app $HYIDS) } } }
# Nenhuma tira os hifens opcionais (manuais)?
$E['hy-none-shy'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'hifenizacao manual'; $doc.Range(4, 4).InsertAfter([string][char]31); $doc.AutoHyphenation = $true }
  Op = { param($app, $doc) Mso $app 'HyphenationNone' }
  Info = { param($app, $doc) [ordered]@{ hy = (HyInfo $doc); text = $doc.Content.Text; len = $doc.Content.Characters.Count } } }
$E['hy-caps'] = @{ Op = { param($app, $doc) $doc.Content.Text = 'abc'; $doc.HyphenateCaps = $false } }
$E['hy-caps-back'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'abc'; $doc.HyphenateCaps = $false }
  Op = { param($app, $doc) $doc.HyphenateCaps = $true } }
$E['hy-zone'] = @{ Op = { param($app, $doc) $doc.Content.Text = 'abc'; $doc.HyphenationZone = (Cm 1) }
  Info = { param($app, $doc) [ordered]@{ hy = (HyInfo $doc) } } }
$E['hy-zone-odd'] = @{ Op = { param($app, $doc) $doc.Content.Text = 'abc'; $doc.HyphenationZone = (Cm 0.63) }
  Info = { param($app, $doc) [ordered]@{ hy = (HyInfo $doc) } } }
$E['hy-limit'] = @{ Op = { param($app, $doc) $doc.Content.Text = 'abc'; $doc.ConsecutiveHyphensLimit = 2 } }
$E['hy-limit-back'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'abc'; $doc.ConsecutiveHyphensLimit = 2 }
  Op = { param($app, $doc) $doc.ConsecutiveHyphensLimit = 0 } }
$E['hy-all'] = @{ Op = { param($app, $doc) $doc.Content.Text = 'abc'; $doc.AutoHyphenation = $true; $doc.HyphenateCaps = $false; $doc.HyphenationZone = (Cm 1); $doc.ConsecutiveHyphensLimit = 3 } }
# por paragrafo (Nao hifenizar)
$E['hy-para'] = @{ Op = { param($app, $doc) Three $doc; (P1 $doc).Format.Hyphenation = 0 } }
$E['hy-para-back'] = @{ Setup = { param($app, $doc) Three $doc; (P1 $doc).Format.Hyphenation = 0 }
  Op = { param($app, $doc) (P1 $doc).Format.Hyphenation = -1 } }
$E['hy-para-style'] = @{ Setup = { param($app, $doc) Three $doc; $doc.Styles.Item(-1).ParagraphFormat.Hyphenation = 0 }
  Op = { param($app, $doc) (P1 $doc).Format.Hyphenation = -1 } }
# hifen opcional (o que a Manual grava)
$E['hy-shy'] = @{ Op = { param($app, $doc) $doc.Content.Text = 'hifenizacao manual'; $doc.Range(4, 4).InsertAfter([string][char]31) }
  Info = { param($app, $doc) [ordered]@{ text = $doc.Content.Text } } }
$E['hy-shy-typed'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'hifenizacao manual'; $doc.Range(4, 4).Select() }
  Op = { param($app, $doc) $app.Selection.TypeText([string][char]31) } }
$E['hy-shy-fmt'] = @{ Op = { param($app, $doc) $doc.Content.Text = 'hifenizacao manual'; $doc.Range(0, 11).Font.Bold = $true; $doc.Range(4, 4).InsertAfter([string][char]31) } }

# ---- numeros de linha (w:lnNumType na secao) ----
$E['ln-cont'] = @{ Op = { param($app, $doc) Three $doc; Mso $app 'LineNumbersContinuous' }
  Info = { param($app, $doc) [ordered]@{ ln = (LnInfo $doc); pressed = (Pressed $app $LNIDS) } } }
$E['ln-cont-undo'] = @{ Op = { param($app, $doc) Three $doc; $u0 = $doc.Undo(0); Mso $app 'LineNumbersContinuous' }
  Info = { param($app, $doc) $a = (LnInfo $doc); $ok = $doc.Undo(1); [ordered]@{ before = $a; undoReturned = $ok; after = (LnInfo $doc); text = $doc.Content.Text } } }
$E['ln-com'] = @{ Op = { param($app, $doc) Three $doc; $doc.Sections.Item(1).PageSetup.LineNumbering.Active = -1 }
  Info = { param($app, $doc) [ordered]@{ ln = (LnInfo $doc); pressed = (Pressed $app $LNIDS) } } }
$E['ln-page'] = @{ Op = { param($app, $doc) Three $doc; $l = $doc.Sections.Item(1).PageSetup.LineNumbering; $l.Active = -1; $l.RestartMode = 0 }
  Info = { param($app, $doc) [ordered]@{ ln = (LnInfo $doc); pressed = (Pressed $app $LNIDS) } } }
$E['ln-section'] = @{ Op = { param($app, $doc) Three $doc; $l = $doc.Sections.Item(1).PageSetup.LineNumbering; $l.Active = -1; $l.RestartMode = 1 }
  Info = { param($app, $doc) [ordered]@{ ln = (LnInfo $doc); pressed = (Pressed $app $LNIDS) } } }
$E['ln-continuous'] = @{ Op = { param($app, $doc) Three $doc; $l = $doc.Sections.Item(1).PageSetup.LineNumbering; $l.Active = -1; $l.RestartMode = 2 } }
$E['ln-start1'] = @{ Op = { param($app, $doc) Three $doc; $l = $doc.Sections.Item(1).PageSetup.LineNumbering; $l.Active = -1; $l.StartingNumber = 1 } }
$E['ln-start3'] = @{ Op = { param($app, $doc) Three $doc; $l = $doc.Sections.Item(1).PageSetup.LineNumbering; $l.Active = -1; $l.StartingNumber = 3 } }
$E['ln-countby'] = @{ Op = { param($app, $doc) Three $doc; $l = $doc.Sections.Item(1).PageSetup.LineNumbering; $l.Active = -1; $l.CountBy = 5 } }
$E['ln-dist'] = @{ Op = { param($app, $doc) Three $doc; $l = $doc.Sections.Item(1).PageSetup.LineNumbering; $l.Active = -1; $l.DistanceFromText = (Cm 1) } }
$E['ln-dist-auto'] = @{ Setup = { param($app, $doc) Three $doc; $l = $doc.Sections.Item(1).PageSetup.LineNumbering; $l.Active = -1; $l.DistanceFromText = (Cm 1) }
  Op = { param($app, $doc) $doc.Sections.Item(1).PageSetup.LineNumbering.DistanceFromText = 0 } }
$E['ln-all'] = @{ Op = { param($app, $doc) Three $doc; $l = $doc.Sections.Item(1).PageSetup.LineNumbering; $l.Active = -1; $l.StartingNumber = 3; $l.CountBy = 5; $l.DistanceFromText = (Cm 1); $l.RestartMode = 1 }
  Info = { param($app, $doc) [ordered]@{ ln = (LnInfo $doc) } } }
# desligar: o elemento sai? as opcoes ficam guardadas?
$E['ln-off'] = @{ Setup = { param($app, $doc) Three $doc; $l = $doc.Sections.Item(1).PageSetup.LineNumbering; $l.Active = -1; $l.StartingNumber = 3; $l.CountBy = 5; $l.DistanceFromText = (Cm 1); $l.RestartMode = 1 }
  Op = { param($app, $doc) $doc.Sections.Item(1).PageSetup.LineNumbering.Active = 0 }
  Info = { param($app, $doc) [ordered]@{ ln = (LnInfo $doc) } } }
$E['ln-off-on'] = @{ Setup = { param($app, $doc) Three $doc; $l = $doc.Sections.Item(1).PageSetup.LineNumbering; $l.Active = -1; $l.StartingNumber = 3; $l.CountBy = 5; $l.DistanceFromText = (Cm 1); $l.RestartMode = 1; $l.Active = 0 }
  Op = { param($app, $doc) Mso $app 'LineNumbersContinuous' }
  Info = { param($app, $doc) [ordered]@{ ln = (LnInfo $doc) } } }
# Continuo por cima de opcoes: mantem inicio/contar por/distancia?
$E['ln-cont-over'] = @{ Setup = { param($app, $doc) Three $doc; $l = $doc.Sections.Item(1).PageSetup.LineNumbering; $l.Active = -1; $l.StartingNumber = 3; $l.CountBy = 5; $l.DistanceFromText = (Cm 1); $l.RestartMode = 0 }
  Op = { param($app, $doc) Mso $app 'LineNumbersContinuous' }
  Info = { param($app, $doc) [ordered]@{ ln = (LnInfo $doc) } } }
# alcance do menu: cursor na secao 2 de 3; selecao de 1 a 2; documento inteiro
$E['ln-scope-cursor'] = @{ Setup = { param($app, $doc) Sections $doc 3; SelSec $doc 2 }
  Op = { param($app, $doc) Mso $app 'LineNumbersContinuous' }
  Info = { param($app, $doc) [ordered]@{ ln = (LnInfo $doc) } } }
$E['ln-scope-sel'] = @{ Setup = { param($app, $doc) Sections $doc 3; $doc.Range($doc.Sections.Item(1).Range.Start, $doc.Sections.Item(2).Range.Start + 2).Select() }
  Op = { param($app, $doc) Mso $app 'LineNumbersContinuous' }
  Info = { param($app, $doc) [ordered]@{ ln = (LnInfo $doc) } } }
$E['ln-scope-cont'] = @{ Setup = { param($app, $doc) Sections $doc 3 3; SelSec $doc 2 }
  Op = { param($app, $doc) Mso $app 'LineNumbersContinuous' }
  Info = { param($app, $doc) [ordered]@{ ln = (LnInfo $doc) } } }
# suprimir no paragrafo
$E['ln-suppress'] = @{ Op = { param($app, $doc) Three $doc; (P1 $doc).NoLineNumber = -1 } }
$E['ln-suppress-back'] = @{ Setup = { param($app, $doc) Three $doc; (P1 $doc).NoLineNumber = -1 }
  Op = { param($app, $doc) (P1 $doc).NoLineNumber = 0 } }
$E['ln-suppress-style'] = @{ Setup = { param($app, $doc) Three $doc; $doc.Styles.Item(-1).ParagraphFormat.NoLineNumber = -1 }
  Op = { param($app, $doc) (P1 $doc).NoLineNumber = 0 } }
# pela faixa de opcoes: alterna? com selecao mista?
function LnSup($doc) { $o = @(); foreach ($p in $doc.Paragraphs) { $o += $p.NoLineNumber }; return $o }
$E['ln-suppress-mso'] = @{ Setup = { param($app, $doc) Three $doc; $doc.Sections.Item(1).PageSetup.LineNumbering.Active = -1; (P1 $doc).Range.Select() }
  Op = { param($app, $doc) Mso $app 'LineNumbersSuppress' }
  Info = { param($app, $doc) [ordered]@{ sup = (LnSup $doc); pressed = (Pressed $app @('LineNumbersSuppress')) } } }
$E['ln-suppress-mso-toggle'] = @{ Setup = { param($app, $doc) Three $doc; $doc.Sections.Item(1).PageSetup.LineNumbering.Active = -1; (P1 $doc).NoLineNumber = -1; $r = (P1 $doc).Range; $r.Collapse(1); $r.Select() }
  Op = { param($app, $doc) $script:pr0 = (Pressed $app @('LineNumbersSuppress')); Mso $app 'LineNumbersSuppress' }
  Info = { param($app, $doc) [ordered]@{ pressedBefore = $script:pr0; sup = (LnSup $doc); pressed = (Pressed $app @('LineNumbersSuppress')) } } }
$E['ln-suppress-mso-mixed'] = @{ Setup = { param($app, $doc) Three $doc; $doc.Sections.Item(1).PageSetup.LineNumbering.Active = -1; (P1 $doc).NoLineNumber = -1; $doc.Content.Select() }
  Op = { param($app, $doc) $script:pr0 = (Pressed $app @('LineNumbersSuppress')); Mso $app 'LineNumbersSuppress' }
  Info = { param($app, $doc) [ordered]@{ pressedBefore = $script:pr0; sup = (LnSup $doc); pressed = (Pressed $app @('LineNumbersSuppress')) } } }
$E['ln-suppress-mso-mixed2'] = @{ Setup = { param($app, $doc) Three $doc; $doc.Sections.Item(1).PageSetup.LineNumbering.Active = -1; $doc.Paragraphs.Item(2).NoLineNumber = -1; $doc.Content.Select() }
  Op = { param($app, $doc) $script:pr0 = (Pressed $app @('LineNumbersSuppress')); Mso $app 'LineNumbersSuppress' }
  Info = { param($app, $doc) [ordered]@{ pressedBefore = $script:pr0; sup = (LnSup $doc); pressed = (Pressed $app @('LineNumbersSuppress')) } } }
# suprimir com a numeracao desligada: o botao fica habilitado?
$E['ln-suppress-off'] = @{ Setup = { param($app, $doc) Three $doc; (P1 $doc).Range.Select(); $script:en0 = $app.CommandBars.GetEnabledMso('LineNumbersSuppress') }
  Op = { param($app, $doc) Mso $app 'LineNumbersSuppress' }
  Info = { param($app, $doc) [ordered]@{ enabledBefore = $script:en0; sup = (LnSup $doc) } } }
# Nenhum com selecao em 2 de 3 secoes numeradas
$E['ln-off-mso-sel'] = @{ Setup = { param($app, $doc) Sections $doc 3; foreach ($s in $doc.Sections) { $s.PageSetup.LineNumbering.Active = -1 }; $doc.Range($doc.Sections.Item(1).Range.Start, $doc.Sections.Item(2).Range.Start + 2).Select() }
  Op = { param($app, $doc) Mso $app 'LineNumbersOff' }
  Info = { param($app, $doc) [ordered]@{ ln = (LnInfo $doc) } } }
# estado dos botoes com secoes diferentes na selecao
$E['ln-pressed-mixed'] = @{ Setup = { param($app, $doc) Sections $doc 2; $doc.Sections.Item(1).PageSetup.LineNumbering.Active = -1; $doc.Content.Select() }
  Op = { param($app, $doc) }
  Info = { param($app, $doc) [ordered]@{ pressed = (Pressed $app $LNIDS) } } }
$E['probe-ids2'] = @{ Op = { param($app, $doc) $doc.Content.Text = 'abc' }
  Info = { param($app, $doc)
    $o = [ordered]@{}
    foreach ($a in @('LineNumbers', 'LineNumber', 'LineNumbering')) {
      foreach ($b in @('RestartPage', 'RestartSection', 'RestartEachPage', 'RestartEachSection', 'RestartAtEachPage', 'RestartAtEachSection', 'Page', 'Section', 'EachPage', 'EachSection', 'PerPage', 'PerSection', 'RestartPages', 'RestartSections', 'RestartByPage', 'RestartBySection', 'Options', 'OptionsDialog', 'More', 'MoreOptions', 'Dialog', 'Settings', 'Restart', 'RestartEveryPage', 'RestartEverySection')) {
        $id = $a + $b
        try { $o[$id] = $app.CommandBars.GetLabelMso($id) } catch {}
      }
    }
    return $o
  } }
# zona de hifenizacao: modo de compatibilidade 14 (no 15 o COM devolve indefinido)
$E['hy-zone14-info'] = @{ Op = { param($app, $doc) $doc.Content.Text = 'abc'; $doc.SetCompatibilityMode(14) }
  Info = { param($app, $doc) [ordered]@{ hy = (HyInfo $doc); compat = $doc.CompatibilityMode } } }
$E['hy-zone14'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'abc'; $doc.SetCompatibilityMode(14) }
  Op = { param($app, $doc) $doc.HyphenationZone = (Cm 1) }
  Info = { param($app, $doc) [ordered]@{ hy = (HyInfo $doc) } } }
$E['hy-zone14-odd'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'abc'; $doc.SetCompatibilityMode(14) }
  Op = { param($app, $doc) $doc.HyphenationZone = (Cm 0.63) }
  Info = { param($app, $doc) [ordered]@{ hy = (HyInfo $doc) } } }
$E['hy-zone-enabled'] = @{ Op = { param($app, $doc) $doc.Content.Text = 'abc' }
  Info = { param($app, $doc)
    $o = [ordered]@{ m15 = (HyInfo $doc) }
    $doc.SetCompatibilityMode(14); $o.m14 = (HyInfo $doc)
    $doc.SetCompatibilityMode(15); $o.back15 = (HyInfo $doc)
    return $o } }
# o estilo "Numero de linha" (line number) entra no styles.xml ao ligar? e ao usar?
$E['ln-style-use'] = @{ Setup = { param($app, $doc) Three $doc; $doc.Sections.Item(1).PageSetup.LineNumbering.Active = -1 }
  Op = { param($app, $doc) $s = $doc.Styles.Item(-41); $s.Font.Color = 255 }
  Info = { param($app, $doc) $s = $doc.Styles.Item(-41); [ordered]@{ name = $s.NameLocal; type = $s.Type; inUse = $s.InUse; base = $s.BaseStyle.NameLocal } } }

# ---- quebras de linha e de pagina (pPr) ----
$E['pf-widow-off'] = @{ Op = { param($app, $doc) Three $doc; (P1 $doc).WidowControl = 0 } }
$E['pf-widow-on'] = @{ Setup = { param($app, $doc) Three $doc; (P1 $doc).WidowControl = 0 }
  Op = { param($app, $doc) (P1 $doc).WidowControl = -1 } }
$E['pf-keepnext'] = @{ Op = { param($app, $doc) Three $doc; (P1 $doc).KeepWithNext = -1 } }
$E['pf-keeplines'] = @{ Op = { param($app, $doc) Three $doc; (P1 $doc).KeepTogether = -1 } }
$E['pf-pbb'] = @{ Op = { param($app, $doc) Three $doc; $doc.Paragraphs.Item(2).PageBreakBefore = -1 } }
$E['pf-heading-off'] = @{ Setup = { param($app, $doc) Three $doc; (P1 $doc).Style = $doc.Styles.Item(-2) }
  Op = { param($app, $doc) $p = P1 $doc; $p.KeepWithNext = 0; $p.KeepTogether = 0 } }
$E['pf-all'] = @{ Op = { param($app, $doc) Three $doc; $p = P1 $doc; $p.WidowControl = 0; $p.KeepWithNext = -1; $p.KeepTogether = -1; $p.PageBreakBefore = -1; $p.NoLineNumber = -1; $p.Format.Hyphenation = 0 } }
foreach ($v in @(@('pf-tight-all', 1), @('pf-tight-fl', 2), @('pf-tight-first', 3), @('pf-tight-last', 4))) {
  $E[$v[0]] = @{ TW = $v[1]
    Op = { param($app, $doc) Three $doc; (P1 $doc).Format.TextboxTightWrap = $x.TW } }
}
$E['pf-tight-none'] = @{ Setup = { param($app, $doc) Three $doc; (P1 $doc).Format.TextboxTightWrap = 1 }
  Op = { param($app, $doc) (P1 $doc).Format.TextboxTightWrap = 0 } }

# ---- layout da secao (Configurar Pagina > Layout) ----
foreach ($v in @(@('sec-start-cont', 0), @('sec-start-col', 1), @('sec-start-page', 2), @('sec-start-even', 3), @('sec-start-odd', 4))) {
  $E[$v[0]] = @{ SS = $v[1]
    Setup = { param($app, $doc) Sections $doc 2 }
    Op = { param($app, $doc) $doc.Sections.Item(2).PageSetup.SectionStart = $x.SS } }
}
foreach ($v in @(@('sec-valign-center', 1), @('sec-valign-justify', 2), @('sec-valign-bottom', 3))) {
  $E[$v[0]] = @{ VA = $v[1]
    Op = { param($app, $doc) Three $doc; $doc.Sections.Item(1).PageSetup.VerticalAlignment = $x.VA } }
}
$E['sec-valign-top'] = @{ Setup = { param($app, $doc) Three $doc; $doc.Sections.Item(1).PageSetup.VerticalAlignment = 1 }
  Op = { param($app, $doc) $doc.Sections.Item(1).PageSetup.VerticalAlignment = 0 } }

# ---- execucao ----
$w = New-WordApp
$prevSec = $null
try { $prevSec = $w.AutomationSecurity; $w.AutomationSecurity = 3 } catch {}
try {
  foreach ($name in $E.Keys) {
    if ($onlySet.Count -gt 0 -and -not $onlySet.ContainsKey($name)) { continue }
    $x = $E[$name]
    $out = [string](Join-Path $OutDir ($name + '.docx'))
    $jsonPath = [string](Join-Path $OutDir ($name + '.json'))
    $doc = $null
    try {
      $doc = $w.Documents.Add()
      if ($x.Setup) { & $x.Setup $w $doc }
      & $x.Op $w $doc
      $info = [ordered]@{ name = $name }
      if ($x.Info) { $info.extra = (& $x.Info $w $doc) }
      $doc.SaveAs2($out, 16) | Out-Null
      Write-Utf8 $jsonPath ($info | ConvertTo-Json -Depth 6)
      Emit ('OK ' + $name)
    } catch {
      Emit ('ERR ' + $name + ' ' + ($_.Exception.Message -replace "[\r\n]+", ' '))
    } finally {
      if ($doc -ne $null) { try { $doc.Close([ref]0) | Out-Null } catch {} }
    }
  }
} finally {
  if ($prevSec -ne $null) { try { $w.AutomationSecurity = $prevSec } catch {} }
  Close-WordApp $w
}

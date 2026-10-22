# Oraculo da frente NAVEGACAO do Write (regua, linhas de grade, painel): cada
# experimento cria um documento novo no Word (COM invisivel), monta o estado
# inicial, aplica UMA operacao (a propriedade COM equivalente ao arrasto na
# regua / ao comando da guia Exibir) e salva o .docx. Grava <nome>.json com
# informacoes extras (padroes da grade, opcoes da janela).
#
# Uso (sempre pela trava global, via run.mjs):
#   powershell -File nav-oracle.ps1 -OutDir <pasta> [-Only a,b,c]
#
# Regras (doc-lab/word-com.ps1): sem janelas, so fecha o que abriu, Quit so sem
# documentos, caminhos em [string] (PSObject trava o SaveAs2). ASCII puro.
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
function Invoke-Clear($t) { [void]$t.GetType().InvokeMember('Clear', [System.Reflection.BindingFlags]::InvokeMethod, $null, $t, $null) }
function Cm([double]$c) { return [single]($c * 72.0 / 2.54) }

# tres paragrafos de texto
function Three($doc) { $doc.Content.Text = "um dois tres`rquatro cinco`rseis sete" }

# estilo de paragrafo com tabulacoes e recuo (para limpar/mover herdadas)
function New-TabStyle($doc) {
  $s = $doc.Styles.Add('TabSty', 1)
  $s.ParagraphFormat.TabStops.Add(100, 0, 0) | Out-Null
  $s.ParagraphFormat.TabStops.Add(200, 2, 1) | Out-Null
  $s.ParagraphFormat.LeftIndent = 36
  $s.ParagraphFormat.FirstLineIndent = 18
  return $s
}

$E = [ordered]@{}

# ---- linha de base ----
$E['blank'] = @{ Op = { param($app, $doc) $doc.Content.Text = 'abc' } }

# ---- recuos (marcadores da regua) ----
$E['ind-left'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'abc' }; Op = { param($app, $doc) (P1 $doc).LeftIndent = 36 } }
$E['ind-left-cm'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'abc' }; Op = { param($app, $doc) (P1 $doc).LeftIndent = (Cm 1.25) } }
$E['ind-left-cm2'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'abc' }; Op = { param($app, $doc) (P1 $doc).LeftIndent = (Cm 0.75) } }
$E['ind-first'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'abc' }; Op = { param($app, $doc) (P1 $doc).FirstLineIndent = 18 } }
$E['ind-hanging'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'abc' }; Op = { param($app, $doc) $p = P1 $doc; $p.LeftIndent = 36; $p.FirstLineIndent = -18 } }
$E['ind-right'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'abc' }; Op = { param($app, $doc) (P1 $doc).RightIndent = 36 } }
$E['ind-negative'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'abc' }; Op = { param($app, $doc) (P1 $doc).LeftIndent = -18 } }
# quadradinho: recuo esquerdo anda, primeira linha acompanha (relativa)
$E['ind-left-keeps-first'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = 'abc'; $p = P1 $doc; $p.LeftIndent = 36; $p.FirstLineIndent = 18 }
  Op = { param($app, $doc) (P1 $doc).LeftIndent = 72 }
}
# voltar a zero: grava w:left="0" ou tira o w:ind?
$E['ind-to-zero'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = 'abc'; (P1 $doc).LeftIndent = 36 }
  Op = { param($app, $doc) (P1 $doc).LeftIndent = 0 }
}
$E['ind-first-to-zero'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = 'abc'; (P1 $doc).FirstLineIndent = 18 }
  Op = { param($app, $doc) (P1 $doc).FirstLineIndent = 0 }
}
# estilo com recuo (Paragrafo da Lista: w:left=720): igual ao estilo / zero
$E['ind-style-same'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = 'abc'; (P1 $doc).Style = $doc.Styles.Item(-180) }
  Op = { param($app, $doc) (P1 $doc).LeftIndent = 36 }
}
$E['ind-style-zero'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = 'abc'; (P1 $doc).Style = $doc.Styles.Item(-180) }
  Op = { param($app, $doc) (P1 $doc).LeftIndent = 0 }
}
$E['ind-style-first'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = 'abc'; New-TabStyle $doc | Out-Null; (P1 $doc).Style = 'TabSty' }
  Op = { param($app, $doc) (P1 $doc).LeftIndent = 54 }
}
# lista com marcador: recuo direto no paragrafo? muda o numbering.xml?
$E['ind-list'] = @{
  Setup = { param($app, $doc) Three $doc; $doc.Content.ListFormat.ApplyBulletDefault() }
  Op = { param($app, $doc) (P1 $doc).LeftIndent = 54 }
}
$E['ind-list-first'] = @{
  Setup = { param($app, $doc) Three $doc; $doc.Content.ListFormat.ApplyBulletDefault() }
  Op = { param($app, $doc) (P1 $doc).FirstLineIndent = 0 }
}
# varios paragrafos com recuos diferentes: valor absoluto em todos
$E['ind-multi'] = @{
  Setup = { param($app, $doc) Three $doc; $doc.Paragraphs.Item(2).LeftIndent = 18; $doc.Paragraphs.Item(3).LeftIndent = 72; $doc.Content.Select() }
  Op = { param($app, $doc) $app.Selection.ParagraphFormat.LeftIndent = 36 }
}
# celula de tabela
$E['ind-cell'] = @{
  Setup = { param($app, $doc) $t = $doc.Tables.Add($app.Selection.Range, 2, 2, 1, 0); $t.Cell(1, 1).Range.Text = 'x' }
  Op = { param($app, $doc) $doc.Tables.Item(1).Cell(1, 1).Range.Paragraphs.Item(1).LeftIndent = 18 }
}

# ---- tabulacoes ----
$E['tab-left'] = @{ Setup = { param($app, $doc) $doc.Content.Text = "a`tb" }; Op = { param($app, $doc) (P1 $doc).TabStops.Add(72) | Out-Null } }
$E['tab-cm'] = @{ Setup = { param($app, $doc) $doc.Content.Text = "a`tb" }; Op = { param($app, $doc) (P1 $doc).TabStops.Add((Cm 2.5)) | Out-Null } }
$E['tab-types'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb`tc`td`te" }
  Op = { param($app, $doc) $ts = (P1 $doc).TabStops; $ts.Add(50, 0) | Out-Null; $ts.Add(100, 1) | Out-Null; $ts.Add(150, 2) | Out-Null; $ts.Add(200, 3) | Out-Null; $ts.Add(250, 4) | Out-Null }
}
$E['tab-leaders'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb" }
  Op = { param($app, $doc) $ts = (P1 $doc).TabStops; $ts.Add(50, 0, 1) | Out-Null; $ts.Add(100, 0, 2) | Out-Null; $ts.Add(150, 0, 3) | Out-Null; $ts.Add(200, 0, 4) | Out-Null; $ts.Add(250, 0, 5) | Out-Null }
}
$E['tab-order'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb" }
  Op = { param($app, $doc) $ts = (P1 $doc).TabStops; $ts.Add(144) | Out-Null; $ts.Add(72) | Out-Null; $ts.Add(108, 2) | Out-Null }
}
$E['tab-clear-direct'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb"; (P1 $doc).TabStops.Add(72) | Out-Null }
  Op = { param($app, $doc) (P1 $doc).TabStops.Item(1) | ForEach-Object { Invoke-Clear $_ } }
}
$E['tab-move-direct'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb"; (P1 $doc).TabStops.Add(72) | Out-Null }
  Op = { param($app, $doc) $ts = (P1 $doc).TabStops; Invoke-Clear $ts.Item(1); $ts.Add(108) | Out-Null }
}
$E['tab-clear-style'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb"; New-TabStyle $doc | Out-Null; (P1 $doc).Style = 'TabSty' }
  Op = { param($app, $doc) (P1 $doc).TabStops.Item(1) | ForEach-Object { Invoke-Clear $_ } }
}
$E['tab-move-style'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb"; New-TabStyle $doc | Out-Null; (P1 $doc).Style = 'TabSty' }
  Op = { param($app, $doc) $ts = (P1 $doc).TabStops; Invoke-Clear $ts.Item(1); $ts.Add(150) | Out-Null }
}
# limpar a herdada: a outra herdada continua igual? (o 1o lote regravou a de 4000 como left)
function Tabs-Info($doc) {
  $o = @()
  foreach ($t in (P1 $doc).TabStops) { $o += [ordered]@{ pos = $t.Position; align = $t.Alignment; leader = $t.Leader; custom = $t.CustomTab } }
  return @{ tabs = $o }
}
$E['tab-clear-style-item2'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb"; New-TabStyle $doc | Out-Null; (P1 $doc).Style = 'TabSty' }
  Op = { param($app, $doc) Invoke-Clear (P1 $doc).TabStops.Item(2) }
  Info = { param($app, $doc) Tabs-Info $doc }
}
$E['tab-clear-style-info'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb"; New-TabStyle $doc | Out-Null; (P1 $doc).Style = 'TabSty' }
  Op = { param($app, $doc) Invoke-Clear (P1 $doc).TabStops.Item(1) }
  Info = { param($app, $doc) Tabs-Info $doc }
}
$E['tab-clear-style-left2'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb"; $s = $doc.Styles.Add('TabSty', 1); $s.ParagraphFormat.TabStops.Add(100) | Out-Null; $s.ParagraphFormat.TabStops.Add(200) | Out-Null; (P1 $doc).Style = 'TabSty' }
  Op = { param($app, $doc) Invoke-Clear (P1 $doc).TabStops.Item(1) }
  Info = { param($app, $doc) Tabs-Info $doc }
}
# pelo Selection (o que o dialogo Tabulacao usa)
$E['tab-clear-style-sel'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb"; New-TabStyle $doc | Out-Null; (P1 $doc).Style = 'TabSty'; (P1 $doc).Range.Select() }
  Op = { param($app, $doc) $app.Selection.ParagraphFormat.TabStops.Item(1) | ForEach-Object { Invoke-Clear $_ } }
  Info = { param($app, $doc) Tabs-Info $doc }
}
$E['tab-clear-style-pos'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb"; New-TabStyle $doc | Out-Null; (P1 $doc).Style = 'TabSty' }
  Op = { param($app, $doc) $t = (P1 $doc).TabStops.After(50); Invoke-Clear $t }
  Info = { param($app, $doc) Tabs-Info $doc }
}
$E['tab-clearall-style'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb"; New-TabStyle $doc | Out-Null; (P1 $doc).Style = 'TabSty' }
  Op = { param($app, $doc) (P1 $doc).TabStops.ClearAll() }
}
# tabulacao igual a uma do estilo: grava ou nao?
$E['tab-same-as-style'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb"; New-TabStyle $doc | Out-Null; (P1 $doc).Style = 'TabSty' }
  Op = { param($app, $doc) (P1 $doc).TabStops.Add(100) | Out-Null }
}
# trocar o tipo de uma herdada (mesma posicao)
$E['tab-retype-style'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb"; New-TabStyle $doc | Out-Null; (P1 $doc).Style = 'TabSty' }
  Op = { param($app, $doc) (P1 $doc).TabStops.Add(100, 1) | Out-Null }
}
$E['tab-beyond'] = @{ Setup = { param($app, $doc) $doc.Content.Text = "a`tb" }; Op = { param($app, $doc) (P1 $doc).TabStops.Add(600) | Out-Null } }
$E['tab-negative'] = @{ Setup = { param($app, $doc) $doc.Content.Text = "a`tb"; (P1 $doc).LeftIndent = 36 }; Op = { param($app, $doc) (P1 $doc).TabStops.Add(18) | Out-Null } }
$E['tab-multi'] = @{
  Setup = { param($app, $doc) Three $doc; $doc.Paragraphs.Item(2).TabStops.Add(50) | Out-Null; $doc.Content.Select() }
  Op = { param($app, $doc) $app.Selection.ParagraphFormat.TabStops.Add(100) | Out-Null }
}
$E['tab-default'] = @{ Setup = { param($app, $doc) $doc.Content.Text = "a`tb" }; Op = { param($app, $doc) $doc.DefaultTabStop = 36 } }
$E['tab-default-cm'] = @{ Setup = { param($app, $doc) $doc.Content.Text = "a`tb" }; Op = { param($app, $doc) $doc.DefaultTabStop = (Cm 1) } }
# tabulacao numa lista (a do nivel e a do recuo deslocado)
$E['tab-list'] = @{
  Setup = { param($app, $doc) Three $doc; $doc.Content.ListFormat.ApplyNumberDefault() }
  Op = { param($app, $doc) (P1 $doc).TabStops.Add(90) | Out-Null }
}

# ---- margens e colunas (regua horizontal e vertical) ----
$E['mar-left'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'abc' }; Op = { param($app, $doc) $doc.Sections.Item(1).PageSetup.LeftMargin = (Cm 2.5) } }
$E['mar-right'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'abc' }; Op = { param($app, $doc) $doc.Sections.Item(1).PageSetup.RightMargin = 54 } }
$E['mar-top'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'abc' }; Op = { param($app, $doc) $doc.Sections.Item(1).PageSetup.TopMargin = 90 } }
$E['mar-bottom'] = @{ Setup = { param($app, $doc) $doc.Content.Text = 'abc' }; Op = { param($app, $doc) $doc.Sections.Item(1).PageSetup.BottomMargin = (Cm 3.3) } }
$E['mar-sect2'] = @{
  Setup = { param($app, $doc) Three $doc; $doc.Paragraphs.Item(2).Range.InsertBreak(2) }
  Op = { param($app, $doc) $doc.Sections.Item(2).PageSetup.LeftMargin = 108 }
}
$E['cols-space'] = @{
  Setup = { param($app, $doc) Three $doc; $doc.Sections.Item(1).PageSetup.TextColumns.SetCount(2) }
  Op = { param($app, $doc) $doc.Sections.Item(1).PageSetup.TextColumns.Spacing = 54 }
}
$E['cols-width'] = @{
  Setup = { param($app, $doc) Three $doc; $doc.Sections.Item(1).PageSetup.TextColumns.SetCount(2) }
  Op = { param($app, $doc) $tc = $doc.Sections.Item(1).PageSetup.TextColumns; $tc.EvenlySpaced = 0; $tc.Item(1).Width = 150 }
}
$E['cols-uneven-space'] = @{
  Setup = { param($app, $doc) Three $doc; $tc = $doc.Sections.Item(1).PageSetup.TextColumns; $tc.SetCount(3); $tc.EvenlySpaced = 0 }
  Op = { param($app, $doc) $doc.Sections.Item(1).PageSetup.TextColumns.Item(1).SpaceAfter = 20 }
}

# ---- linhas de grade, regua, painel, modos de exibicao (o que vai para o arquivo) ----
$E['grid-defaults'] = @{
  Op = { param($app, $doc) $doc.Content.Text = 'abc' }
  Info = { param($app, $doc)
    $o = [ordered]@{}
    foreach ($k in @('GridDistanceHorizontal', 'GridDistanceVertical', 'GridSpaceBetweenHorizontalLines', 'GridSpaceBetweenVerticalLines', 'GridOriginFromMargin', 'GridOriginHorizontal', 'GridOriginVertical', 'SnapToGrid', 'SnapToShapes')) {
      try { $o[$k] = $doc.$k } catch { $o[$k] = 'ERR' }
    }
    try { $o.DisplayGridLines = $app.Options.DisplayGridLines } catch { $o.DisplayGridLines = 'ERR' }
    try { $o.DisplayRulers = $doc.ActiveWindow.DisplayRulers } catch { $o.DisplayRulers = 'ERR' }
    try { $o.DisplayVerticalRuler = $doc.ActiveWindow.DisplayVerticalRuler } catch { $o.DisplayVerticalRuler = 'ERR' }
    try { $o.DocumentMap = $doc.ActiveWindow.DocumentMap } catch { $o.DocumentMap = 'ERR' }
    try { $o.MeasurementUnit = $app.Options.MeasurementUnit } catch { $o.MeasurementUnit = 'ERR' }
    try { $o.ViewType = $doc.ActiveWindow.View.Type } catch { $o.ViewType = 'ERR' }
    try { $o.LayoutGridType = $doc.PageSetup.LayoutMode } catch { $o.LayoutGridType = 'ERR' }
    try { $o.LinesPage = $doc.PageSetup.LinesPage } catch { $o.LinesPage = 'ERR' }
    try { $o.CharsLine = $doc.PageSetup.CharsLine } catch { $o.CharsLine = 'ERR' }
    return $o
  }
}
$E['grid-show'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = 'abc'; $script:prevGrid = $app.Options.DisplayGridLines }
  Op = { param($app, $doc) $app.Options.DisplayGridLines = $true }
  Info = { param($app, $doc)
    $o = [ordered]@{ DisplayGridLines = $app.Options.DisplayGridLines }
    try {
      $bits = $doc.ActiveWindow.ActivePane.Pages.Item(1).EnhMetaFileBits
      [System.IO.File]::WriteAllBytes([string](Join-Path $OutDir 'grid-show.emf'), [byte[]]$bits)
      $o.emf = $bits.Length
    } catch { $o.emf = 'ERR ' + $_.Exception.Message }
    $app.Options.DisplayGridLines = $false
    try {
      $bits = $doc.ActiveWindow.ActivePane.Pages.Item(1).EnhMetaFileBits
      [System.IO.File]::WriteAllBytes([string](Join-Path $OutDir 'grid-hide.emf'), [byte[]]$bits)
      $o.emfOff = $bits.Length
    } catch { $o.emfOff = 'ERR ' + $_.Exception.Message }
    $app.Options.DisplayGridLines = $true
    return $o
  }
  Teardown = { param($app, $doc) $app.Options.DisplayGridLines = $script:prevGrid }
}
$E['grid-spacing'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = 'abc' }
  Op = { param($app, $doc) $doc.GridDistanceVertical = 18; $doc.GridDistanceHorizontal = 12; $doc.GridSpaceBetweenHorizontalLines = 2; $doc.GridSpaceBetweenVerticalLines = 3 }
}
$E['grid-origin'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = 'abc' }
  Op = { param($app, $doc) $doc.GridOriginFromMargin = $false; $doc.GridOriginHorizontal = 30; $doc.GridOriginVertical = 40 }
}
$E['ruler-off'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = 'abc'; $script:prevRuler = $doc.ActiveWindow.DisplayRulers }
  Op = { param($app, $doc) $doc.ActiveWindow.DisplayRulers = (-not $script:prevRuler) }
  Teardown = { param($app, $doc) try { $doc.ActiveWindow.DisplayRulers = $script:prevRuler } catch {} }
}
$E['navpane-on'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = 'abc' }
  Op = { param($app, $doc) $doc.ActiveWindow.DocumentMap = $true }
  Info = { param($app, $doc) return [ordered]@{ DocumentMap = $doc.ActiveWindow.DocumentMap } }
  Teardown = { param($app, $doc) try { $doc.ActiveWindow.DocumentMap = $false } catch {} }
}
foreach ($v in @(@('view-outline', 2), @('view-draft', 1), @('view-web', 6), @('view-print', 3), @('view-read', 7))) {
  $E[$v[0]] = @{ VT = $v[1]
    Setup = { param($app, $doc) $doc.Content.Text = 'abc' }
    Op = { param($app, $doc) $doc.ActiveWindow.View.Type = $x.VT }
    Info = { param($app, $doc) return [ordered]@{ ViewType = $doc.ActiveWindow.View.Type } }
    Teardown = { param($app, $doc) try { $doc.ActiveWindow.View.Type = 3 } catch {} }
  }
}

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
      if ($x.Teardown) { & $x.Teardown $w $doc }
      Write-Utf8 $jsonPath ($info | ConvertTo-Json -Depth 6)
      Emit ('OK ' + $name)
    } catch {
      Emit ('ERR ' + $name + ' ' + ($_.Exception.Message -replace "[\r\n]+", ' '))
      if ($x.Teardown) { try { & $x.Teardown $w $doc } catch {} }
    } finally {
      if ($doc -ne $null) { try { $doc.Close([ref]0) | Out-Null } catch {} }
    }
  }
} finally {
  if ($prevSec -ne $null) { try { $w.AutomationSecurity = $prevSec } catch {} }
  Close-WordApp $w
}

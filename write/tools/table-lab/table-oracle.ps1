# Oraculo das TABELAS do Write: cada experimento cria um documento novo no Word
# (COM invisivel), monta o estado inicial, aplica UMA operacao (a mesma que o
# botao da faixa de opcoes chama) e salva o .docx. Grava tambem <nome>.json com
# a selecao depois da operacao e quantos passos de Desfazer a operacao ocupa.
#
# Uso (sempre pela trava global, via run.mjs):
#   powershell -File table-oracle.ps1 -OutDir <pasta> [-Only a,b,c]
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

# Estado comparavel (texto + forma das tabelas) para medir os passos de desfazer.
function Get-State($doc) {
  $s = [string]$doc.Content.Text
  foreach ($t in $doc.Tables) { $s += '|T' + $t.Rows.Count + 'x' + $t.Range.Cells.Count }
  return $s
}

function Get-SelInfo($app) {
  $s = $app.Selection
  $o = [ordered]@{ start = $s.Start; end = $s.End; type = $s.Type }
  $inT = $false
  try { $inT = [bool]$s.Information(12) } catch {}
  $o.inTable = $inT
  if ($inT) {
    try { $o.row = $s.Cells.Item(1).RowIndex; $o.col = $s.Cells.Item(1).ColumnIndex; $o.cells = $s.Cells.Count } catch {}
  }
  $o.text = [string]$s.Text
  return $o
}

# Tabela 3x3 do jeito do botao (estilo padrao, largura fixa), texto rLcC.
function New-BaseTable($app, $doc, [int]$rows = 3, [int]$cols = 3) {
  $t = $doc.Tables.Add($app.Selection.Range, $rows, $cols, 1, 0)
  for ($r = 1; $r -le $rows; $r++) { for ($c = 1; $c -le $cols; $c++) { $t.Cell($r, $c).Range.Text = ('r' + $r + 'c' + $c) } }
  return $t
}

# Formatacao variada na linha 2 para ver o que a insercao copia.
function Format-Row2($t) {
  $t.Rows.Item(2).HeightRule = 2
  $t.Rows.Item(2).Height = 30
  $t.Cell(2, 2).Shading.BackgroundPatternColor = 65535
  $t.Cell(2, 1).VerticalAlignment = 1
  $t.Cell(2, 3).Range.Font.Bold = $true
  $t.Cell(2, 3).Range.ParagraphFormat.Alignment = 2
  $t.Cell(2, 2).LeftPadding = 15
}

function Put($app, $t, [int]$r, [int]$c) {
  $t.Cell($r, $c).Range.Select()
  $app.Selection.Collapse(1)
}

function Select-Cells($app, $doc, $t, [int]$r1, [int]$c1, [int]$r2, [int]$c2) {
  $doc.Range($t.Cell($r1, $c1).Range.Start, $t.Cell($r2, $c2).Range.End).Select()
}

# ---- experimentos: Setup monta, Op aplica a operacao medida ----
$E = [ordered]@{}

# Inserir
$E['insert-grid'] = @{ Op = { param($app, $doc) $doc.Tables.Add($app.Selection.Range, 3, 4, 1, 0) | Out-Null } }
$E['insert-wordbasic'] = @{ Op = { param($app, $doc) $app.WordBasic.TableInsertTable(4, 3) } }
$E['insert-autofit-content'] = @{ Op = { param($app, $doc) $doc.Tables.Add($app.Selection.Range, 2, 3, 1, 1) | Out-Null } }
$E['insert-autofit-window'] = @{ Op = { param($app, $doc) $doc.Tables.Add($app.Selection.Range, 2, 3, 1, 2) | Out-Null } }
$E['insert-fixed-width'] = @{ Op = { param($app, $doc) $t = $doc.Tables.Add($app.Selection.Range, 2, 3, 1, 0); $t.Columns.Width = 72 } }
$E['insert-midpara'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = 'Hello world'; $app.Selection.SetRange(5, 5) }
  Op = { param($app, $doc) $doc.Tables.Add($app.Selection.Range, 2, 2, 1, 0) | Out-Null }
}
$E['insert-parastart'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "First`rSecond"; $p = $doc.Paragraphs.Item(2).Range; $app.Selection.SetRange($p.Start, $p.Start) }
  Op = { param($app, $doc) $doc.Tables.Add($app.Selection.Range, 2, 2, 1, 0) | Out-Null }
}
$E['insert-paraend'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "First`rSecond"; $p = $doc.Paragraphs.Item(1).Range; $app.Selection.SetRange($p.End - 1, $p.End - 1) }
  Op = { param($app, $doc) $doc.Tables.Add($app.Selection.Range, 2, 2, 1, 0) | Out-Null }
}
$E['insert-selection'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "First`rSecond"; $p = $doc.Paragraphs.Item(1).Range; $app.Selection.SetRange($p.Start, $p.End - 1) }
  Op = { param($app, $doc) $doc.Tables.Add($app.Selection.Range, 2, 2, 1, 0) | Out-Null }
}

# Tab na ultima celula
$E['tab-last'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc 2 2; Format-Row2 $t; Put $app $t 2 2 }
  Op = { param($app, $doc) $app.Selection.MoveRight(12, 1) | Out-Null }
}

# Linhas e colunas
foreach ($k in @('rows-above', 'rows-below', 'cols-left', 'cols-right')) {
  $E[$k] = @{ Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Format-Row2 $t; $t.Columns.Item(1).Width = 50; Put $app $t 2 2 } }
}
$E['rows-above'].Op = { param($app, $doc) $app.Selection.InsertRowsAbove(1) }
$E['rows-below'].Op = { param($app, $doc) $app.Selection.InsertRowsBelow(1) }
$E['cols-left'].Op = { param($app, $doc) $app.Selection.InsertColumns() }
$E['cols-right'].Op = { param($app, $doc) $app.Selection.InsertColumnsRight() }
$E['rows-above-2sel'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Select-Cells $app $doc $t 1 1 2 3 }
  Op = { param($app, $doc) $app.Selection.InsertRowsAbove(1) }
}
$E['cols-right-2sel'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Select-Cells $app $doc $t 1 1 3 2 }
  Op = { param($app, $doc) $app.Selection.InsertColumnsRight() }
}
$E['cells-insert-right'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }
  Op = { param($app, $doc) $app.Selection.InsertCells(0) }
}
$E['cells-insert-down'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }
  Op = { param($app, $doc) $app.Selection.InsertCells(1) }
}
$E['del-row'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }
  Op = { param($app, $doc) $app.Selection.Rows.Delete() }
}
$E['del-lastrow'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 3 2 }
  Op = { param($app, $doc) $app.Selection.Rows.Delete() }
}
$E['del-col'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Columns.Item(1).Width = 50; Put $app $t 2 2 }
  Op = { param($app, $doc) $app.Selection.Columns.Delete() }
}
$E['del-table'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "Before`rAfter"; $p = $doc.Paragraphs.Item(2).Range; $app.Selection.SetRange($p.Start, $p.Start); $t = New-BaseTable $app $doc; Put $app $t 2 2 }
  Op = { param($app, $doc) $app.Selection.Tables.Item(1).Delete() }
}
$E['del-cells-left'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }
  Op = { param($app, $doc) $app.Selection.Cells.Delete(0) }
}
$E['del-cells-up'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }
  Op = { param($app, $doc) $app.Selection.Cells.Delete(1) }
}

# Mesclar / dividir
$E['merge-h'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Select-Cells $app $doc $t 1 1 1 2 }
  Op = { param($app, $doc) $app.Selection.Cells.Merge() }
}
$E['merge-v'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Select-Cells $app $doc $t 1 1 2 1 }
  Op = { param($app, $doc) $app.Selection.Cells.Merge() }
}
$E['merge-block'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Select-Cells $app $doc $t 1 1 2 2 }
  Op = { param($app, $doc) $app.Selection.Cells.Merge() }
}
$E['merge-empty'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Cell(1, 2).Range.Text = ''; Select-Cells $app $doc $t 1 1 1 3 }
  Op = { param($app, $doc) $app.Selection.Cells.Merge() }
}
$E['split-1x2'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Cells.Split(1, 2, $true) }
}
$E['split-2x2'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }
  Op = { param($app, $doc) $app.Selection.Cells.Split(2, 2, $true) }
}
$E['split-merged'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Select-Cells $app $doc $t 1 1 1 3; $app.Selection.Cells.Merge(); Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Cells.Split(1, 2, $true) }
}
$E['split-table'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }
  Op = { param($app, $doc) $app.Selection.SplitTable() | Out-Null }
}

# Tamanho
$E['dist-rows'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Rows.Item(1).Height = 20; $t.Rows.Item(2).Height = 40; $t.Rows.Item(3).Height = 60; $t.Select() }
  Op = { param($app, $doc) $app.Selection.Cells.DistributeHeight() }
}
$E['dist-cols'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Columns.Item(1).Width = 50; $t.Columns.Item(2).Width = 100; $t.Columns.Item(3).Width = 150; $t.Select() }
  Op = { param($app, $doc) $app.Selection.Cells.DistributeWidth() }
}
$E['autofit-content'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Cell(1, 2).Range.Text = 'a much longer piece of text here'; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Tables.Item(1).AutoFitBehavior(1) }
}
$E['autofit-window'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Columns.Item(1).Width = 50; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Tables.Item(1).AutoFitBehavior(2) }
}
$E['autofit-fixed'] = @{
  Setup = { param($app, $doc) $t = $doc.Tables.Add($app.Selection.Range, 2, 3, 1, 1); $t.Cell(1, 1).Range.Text = 'abc'; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Tables.Item(1).AutoFitBehavior(0) }
}
$E['row-height-exact'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 1 }
  Op = { param($app, $doc) $app.Selection.Rows.HeightRule = 2; $app.Selection.Rows.Height = 30 }
}
$E['row-height-atleast'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 1 }
  Op = { param($app, $doc) $app.Selection.Rows.Height = 30 }
}
$E['cell-width'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }
  Op = { param($app, $doc) $app.Selection.Cells.Width = 100 }
}
$E['col-width'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }
  Op = { param($app, $doc) $app.Selection.Columns.Width = 100 }
}

# Alinhamento / direcao / margens / cabecalho
$E['align-middle-center'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }
  Op = { param($app, $doc) $app.Selection.Cells.VerticalAlignment = 1; $app.Selection.ParagraphFormat.Alignment = 1 }
}
$E['align-mso'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }
  Op = { param($app, $doc) $app.CommandBars.ExecuteMso('TableCellAlignBottomRight') }
}
foreach ($o in @(1, 2, 3, 4, 5)) {
  $E[('textdir-' + $o)] = @{ Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 } }
}
$E['textdir-1'].Op = { param($app, $doc) $app.Selection.Orientation = 1 }
$E['textdir-2'].Op = { param($app, $doc) $app.Selection.Orientation = 2 }
$E['textdir-3'].Op = { param($app, $doc) $app.Selection.Orientation = 3 }
$E['textdir-4'].Op = { param($app, $doc) $app.Selection.Orientation = 4 }
$E['textdir-5'].Op = { param($app, $doc) $app.Selection.Orientation = 5 }
$E['cell-margins'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }
  Op = { param($app, $doc) $t = $app.Selection.Tables.Item(1); $t.TopPadding = 5; $t.BottomPadding = 4; $t.LeftPadding = 10; $t.RightPadding = 9; $t.Spacing = 2; $t.AllowAutoFit = $false }
}
$E['header-repeat'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Rows.HeadingFormat = -1 }
}
$E['header-repeat-2'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Select-Cells $app $doc $t 1 1 2 3 }
  Op = { param($app, $doc) $app.Selection.Rows.HeadingFormat = -1 }
}
$E['row-cantsplit'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 1 }
  Op = { param($app, $doc) $app.Selection.Rows.AllowBreakAcrossPages = 0 }
}
$E['table-align-center'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Columns.Width = 60; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Tables.Item(1).Rows.Alignment = 1 }
}
$E['table-indent'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Columns.Width = 60; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Tables.Item(1).Rows.LeftIndent = 36 }
}
$E['table-prefwidth-pct'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }
  Op = { param($app, $doc) $t = $app.Selection.Tables.Item(1); $t.PreferredWidthType = 2; $t.PreferredWidth = 80 }
}
$E['table-wrap-around'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Columns.Width = 60; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Tables.Item(1).Rows.WrapAroundText = -1 }
}
$E['table-alttext'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }
  Op = { param($app, $doc) $t = $app.Selection.Tables.Item(1); $t.Title = 'Alt title'; $t.Descr = 'Alt description' }
}

# Converter
$E['to-text-tabs'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Tables.Item(1).ConvertToText(1) | Out-Null }
}
$E['to-text-paras'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Tables.Item(1).ConvertToText(0) | Out-Null }
}
$E['to-text-semicolon'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Tables.Item(1).ConvertToText(3) | Out-Null }
}
$E['to-text-other'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Tables.Item(1).ConvertToText('-') | Out-Null }
}
$E['from-text-tabs'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb`tc`rd`te`tf`rg`th`ti"; $doc.Content.Select() }
  Op = { param($app, $doc) $app.Selection.ConvertToTable(1, 3, 3) | Out-Null }
}
$E['from-text-paras'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "x`ry`rz"; $doc.Content.Select() }
  Op = { param($app, $doc) $app.Selection.ConvertToTable(0) | Out-Null }
}
$E['from-text-default'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a;b;c`rd;e;f"; $doc.Content.Select() }
  Op = { param($app, $doc) $app.Selection.ConvertToTable() | Out-Null }
}

# Formula
$E['formula-sum-above'] = @{
  Setup = { param($app, $doc) $t = $doc.Tables.Add($app.Selection.Range, 4, 2, 1, 0); $t.Cell(1, 1).Range.Text = '10'; $t.Cell(2, 1).Range.Text = '20,5'; $t.Cell(3, 1).Range.Text = '1.000'; Put $app $t 4 1 }
  Op = { param($app, $doc) $app.Selection.InsertFormula('=SUM(ABOVE)', '') }
}
$E['formula-fmt'] = @{
  Setup = { param($app, $doc) $t = $doc.Tables.Add($app.Selection.Range, 3, 2, 1, 0); $t.Cell(1, 1).Range.Text = '10'; $t.Cell(2, 1).Range.Text = '20,5'; Put $app $t 3 1 }
  Op = { param($app, $doc) $app.Selection.InsertFormula('=SUM(ABOVE)', '#.##0,00') }
}
$E['formula-left'] = @{
  Setup = { param($app, $doc) $t = $doc.Tables.Add($app.Selection.Range, 1, 3, 1, 0); $t.Cell(1, 1).Range.Text = '3'; $t.Cell(1, 2).Range.Text = '4'; Put $app $t 1 3 }
  Op = { param($app, $doc) $app.Selection.InsertFormula('=SUM(LEFT)', '') }
}
$E['formula-refs'] = @{
  Setup = { param($app, $doc) $t = $doc.Tables.Add($app.Selection.Range, 2, 3, 1, 0); $t.Cell(1, 1).Range.Text = '3'; $t.Cell(1, 2).Range.Text = '4'; Put $app $t 2 3 }
  Op = { param($app, $doc) $app.Selection.InsertFormula('=ROUND(AVERAGE(A1:B1);1)+A1*2', '') }
}
$E['formula-default'] = @{
  Setup = { param($app, $doc) $t = $doc.Tables.Add($app.Selection.Range, 3, 2, 1, 0); $t.Cell(1, 1).Range.Text = '7'; $t.Cell(2, 1).Range.Text = '8'; Put $app $t 3 1 }
  Op = { param($app, $doc) $app.Selection.InsertFormula() }
}

# Opcoes de estilo (tblLook)
$E['look-noheader'] = @{ Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }; Op = { param($app, $doc) $app.Selection.Tables.Item(1).ApplyStyleHeadingRows = $false } }
$E['look-total'] = @{ Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }; Op = { param($app, $doc) $app.Selection.Tables.Item(1).ApplyStyleLastRow = $true } }
$E['look-nofirstcol'] = @{ Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }; Op = { param($app, $doc) $app.Selection.Tables.Item(1).ApplyStyleFirstColumn = $false } }
$E['look-lastcol'] = @{ Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }; Op = { param($app, $doc) $app.Selection.Tables.Item(1).ApplyStyleLastColumn = $true } }
$E['look-norowbands'] = @{ Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }; Op = { param($app, $doc) $app.Selection.Tables.Item(1).ApplyStyleRowBands = $false } }
$E['look-colbands'] = @{ Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }; Op = { param($app, $doc) $app.Selection.Tables.Item(1).ApplyStyleColumnBands = $true } }

# Sombreamento e bordas
$E['shade-cell'] = @{ Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }; Op = { param($app, $doc) $app.Selection.Cells.Shading.BackgroundPatternColor = 65535 } }
$E['shade-theme'] = @{ Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }; Op = { param($app, $doc) $app.Selection.Cells.Shading.BackgroundPatternColor = -738131969 } }
$E['shade-theme-tint'] = @{ Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }; Op = { param($app, $doc) $app.Selection.Cells.Shading.BackgroundPatternColor = -738132173 } }
$E['shade-table'] = @{ Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Select() }; Op = { param($app, $doc) $app.Selection.Shading.BackgroundPatternColor = 65535 } }
$E['shade-pattern'] = @{ Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }; Op = { param($app, $doc) $s = $app.Selection.Cells.Shading; $s.Texture = 6; $s.ForegroundPatternColor = 255; $s.BackgroundPatternColor = 65535 } }
$E['border-cell-bottom'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }
  Op = { param($app, $doc) $b = $app.Selection.Cells.Borders.Item(-3); $b.LineStyle = 7; $b.LineWidth = 6; $b.Color = 255 }
}
$E['border-table-none'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Select() }
  Op = { param($app, $doc) $app.Selection.Borders.Enable = 0 }
}
$E['border-table-all'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Borders.Enable = 0; $t.Select() }
  Op = { param($app, $doc) $app.Selection.Borders.Enable = 1 }
}
$E['border-table-outside'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Borders.Enable = 0; $t.Select() }
  Op = { param($app, $doc) $app.Selection.Borders.OutsideLineStyle = 1 }
}
$E['border-cells-inside'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Borders.Enable = 0; Select-Cells $app $doc $t 1 1 2 2 }
  Op = { param($app, $doc) $app.Selection.Borders.InsideLineStyle = 1 }
}
$E['border-diag'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }
  Op = { param($app, $doc) $app.Selection.Cells.Borders.Item(-7).LineStyle = 1; $app.Selection.Cells.Borders.Item(-8).LineStyle = 1 }
}

# Estilo aplicado (padrao do documento e Limpar)
$E['style-none'] = @{ Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }; Op = { param($app, $doc) $app.Selection.Tables.Item(1).Style = -155 } }

# ---- lote 2: casos de borda ----
$E['tab-last2'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc 2 2; $t.Rows.Item(2).HeightRule = 2; $t.Rows.Item(2).Height = 30; $t.Cell(2, 2).Shading.BackgroundPatternColor = 65535; $t.Cell(2, 2).Range.Font.Bold = $true; Put $app $t 2 2 }
  Op = { param($app, $doc) $app.Selection.MoveRight(12, 1) | Out-Null }
}
foreach ($n in @(1, 2, 5, 6, 7, 10)) {
  $nn = $n
  $E[('insert-cols-' + $n)] = @{ N = $nn; Op = { param($app, $doc) $doc.Tables.Add($app.Selection.Range, 2, $x.N, 1, 0) | Out-Null } }
}
$E['insert-margins'] = @{
  Setup = { param($app, $doc) $ps = $doc.PageSetup; $ps.LeftMargin = 72; $ps.RightMargin = 72 }
  Op = { param($app, $doc) $doc.Tables.Add($app.Selection.Range, 2, 3, 1, 0) | Out-Null }
}
$E['insert-indented'] = @{
  Setup = { param($app, $doc) $app.Selection.ParagraphFormat.LeftIndent = 36 }
  Op = { param($app, $doc) $doc.Tables.Add($app.Selection.Range, 2, 3, 1, 0) | Out-Null }
}
$E['insert-in-cell'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }
  Op = { param($app, $doc) $doc.Tables.Add($app.Selection.Range, 2, 2, 1, 0) | Out-Null }
}
$E['cols-right-last'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Cell(2, 3).Shading.BackgroundPatternColor = 65535; $t.Columns.Item(3).Width = 50; Put $app $t 2 3 }
  Op = { param($app, $doc) $app.Selection.InsertColumnsRight() }
}
$E['cols-left-first'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Cell(2, 1).Shading.BackgroundPatternColor = 65535; $t.Columns.Item(1).Width = 50; Put $app $t 2 1 }
  Op = { param($app, $doc) $app.Selection.InsertColumns() }
}
$E['cols-left-shaded'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Cell(2, 2).Shading.BackgroundPatternColor = 65535; $t.Cell(2, 2).VerticalAlignment = 1; $t.Cell(2, 2).Range.ParagraphFormat.Alignment = 1; Put $app $t 2 2 }
  Op = { param($app, $doc) $app.Selection.InsertColumns() }
}
$E['rows-above-vmerge'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc 4 3; Select-Cells $app $doc $t 1 1 3 1; $app.Selection.Cells.Merge(); Put $app $t 2 2 }
  Op = { param($app, $doc) $app.Selection.InsertRowsAbove(1) }
}
$E['rows-below-vmerge-end'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc 4 3; Select-Cells $app $doc $t 1 1 3 1; $app.Selection.Cells.Merge(); Put $app $t 3 2 }
  Op = { param($app, $doc) $app.Selection.InsertRowsBelow(1) }
}
$E['del-row-vmerge-start'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc 4 3; Select-Cells $app $doc $t 1 1 3 1; $app.Selection.Cells.Merge(); Put $app $t 1 2 }
  Op = { param($app, $doc) $app.Selection.Rows.Delete() }
}
$E['cols-right-span'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Select-Cells $app $doc $t 1 1 1 2; $app.Selection.Cells.Merge(); Put $app $t 2 1 }
  Op = { param($app, $doc) $app.Selection.InsertColumnsRight() }
}
$E['split-paras-3to2'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Cell(1, 1).Range.Text = "p1`rp2`rp3"; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Cells.Split(1, 2, $true) }
}
$E['split-paras-4to3'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Cell(1, 1).Range.Text = "p1`rp2`rp3`rp4"; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Cells.Split(1, 3, $true) }
}
$E['split-paras-2to3'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Cell(1, 1).Range.Text = "p1`rp2"; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Cells.Split(1, 3, $true) }
}
$E['split-paras-rows'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Cell(1, 1).Range.Text = "p1`rp2`rp3"; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Cells.Split(3, 1, $true) }
}
$E['split-sel-nomerge'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Select-Cells $app $doc $t 1 1 1 2 }
  Op = { param($app, $doc) $app.Selection.Cells.Split(1, 2, $false) }
}
$E['split-sel-merge'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Select-Cells $app $doc $t 1 1 1 2 }
  Op = { param($app, $doc) $app.Selection.Cells.Split(1, 3, $true) }
}
$E['merge-v-2paras'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Cell(1, 1).Range.Text = "a1`ra2"; $t.Cell(2, 1).Range.Text = "b1`rb2"; Select-Cells $app $doc $t 1 1 2 1 }
  Op = { param($app, $doc) $app.Selection.Cells.Merge() }
}
$E['merge-v-3'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Select-Cells $app $doc $t 1 2 3 2 }
  Op = { param($app, $doc) $app.Selection.Cells.Merge() }
}
$E['to-text-semi'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Tables.Item(1).ConvertToText(';') | Out-Null }
}
$E['to-text-tabs-mar'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.LeftPadding = 10; $t.Rows.LeftIndent = 20; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Tables.Item(1).ConvertToText(1) | Out-Null }
}
$E['to-text-merged'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Select-Cells $app $doc $t 1 1 1 2; $app.Selection.Cells.Merge(); $t.Cell(2, 2).Range.Text = "x1`rx2"; Put $app $t 1 1 }
  Op = { param($app, $doc) $app.Selection.Tables.Item(1).ConvertToText(1) | Out-Null }
}
$E['to-text-nested'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2; $doc.Tables.Add($app.Selection.Range, 2, 2, 1, 0) | Out-Null; $t.Cell(1, 1).Range.Select(); $app.Selection.Collapse(1) }
  Op = { param($app, $doc) $doc.Tables.Item(1).ConvertToText(1, $true) | Out-Null }
}
$E['from-text-w9'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb`tc`rd`te`tf"; $doc.Content.Select() }
  Op = { param($app, $doc) $m = [Type]::Missing; $app.Selection.ConvertToTable(1, 2, 3, $m, $m, $m, $m, $m, $m, $m, $m, $m, $m, $m, 0, 1) | Out-Null }
}
$E['from-text-w9-paras'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "x`ry`rz`rw"; $doc.Content.Select() }
  Op = { param($app, $doc) $m = [Type]::Missing; $app.Selection.ConvertToTable(0, 2, 2, $m, $m, $m, $m, $m, $m, $m, $m, $m, $m, $m, 0, 1) | Out-Null }
}
$E['from-text-w9-uneven'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tb`rc`rd`te`tf"; $doc.Content.Select() }
  Op = { param($app, $doc) $m = [Type]::Missing; $app.Selection.ConvertToTable(1, $m, $m, $m, $m, $m, $m, $m, $m, $m, $m, $m, $m, $m, 0, 1) | Out-Null }
}
$E['from-text-w9-content'] = @{
  Setup = { param($app, $doc) $doc.Content.Text = "a`tbbbbbbbbbb`rc`td"; $doc.Content.Select() }
  Op = { param($app, $doc) $m = [Type]::Missing; $app.Selection.ConvertToTable(1, $m, $m, $m, $m, $m, $m, $m, $m, $m, $m, $m, $m, $m, 1, 1) | Out-Null }
}
$E['style-clear'] = @{ Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 1 1 }; Op = { param($app, $doc) $app.Selection.Tables.Item(1).Style = $doc.Styles.Item(-106) } }
$E['style-apply-grid4'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Cell(2, 2).Shading.BackgroundPatternColor = 65535; $t.Cell(1, 1).Range.Font.Italic = $true; Put $app $t 1 1 }
  Op = { param($app, $doc) $st = $null; foreach ($s in $doc.Styles) { try { if ($s.Type -eq 3 -and $s.NameLocal -like 'Tabela de Grade 4 - *1') { $st = $s } } catch {} }; $app.Selection.Tables.Item(1).Style = $st }
}
$E['shade-theme-shade'] = @{ Setup = { param($app, $doc) $t = New-BaseTable $app $doc; Put $app $t 2 2 }; Op = { param($app, $doc) $app.Selection.Cells.Shading.BackgroundPatternColor = -738148353 } }
$E['shade-none'] = @{ Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Cell(2, 2).Shading.BackgroundPatternColor = 65535; Put $app $t 2 2 }; Op = { param($app, $doc) $app.Selection.Cells.Shading.BackgroundPatternColor = -16777216 } }
$E['row-height-multi'] = @{
  Setup = { param($app, $doc) $t = New-BaseTable $app $doc; $t.Cell(2, 2).Range.Text = "a`rb`rc"; $t.Select() }
  Op = { param($app, $doc) $app.Selection.Cells.DistributeHeight() }
}

# Padroes da aplicacao (sem operacao): caneta, linhas de grade, estilo padrao
$E['defaults'] = @{
  Op = { param($app, $doc) }
  Info = { param($app, $doc)
    $o = [ordered]@{}
    try { $o.penStyle = $app.Options.DefaultBorderLineStyle } catch {}
    try { $o.penWidth = $app.Options.DefaultBorderLineWidth } catch {}
    try { $o.penColor = $app.Options.DefaultBorderColor } catch {}
    try { $o.gridlines = $app.ActiveWindow.View.TableGridlines } catch {}
    try { $o.defaultTableStyle = [string]$doc.DefaultTableStyle.NameLocal } catch {}
    return $o
  }
}

# Todos os estilos de tabela internos: uma tabela 5x5 por estilo, num documento so
$E['styles-all'] = @{
  Op = { param($app, $doc)
    $list = @()
    foreach ($s in $doc.Styles) { try { if ($s.Type -eq 3) { $list += $s } } catch {} }
    foreach ($s in $list) {
      $r = $doc.Content
      $r.Collapse(0)
      $r.InsertParagraphAfter()
      $r = $doc.Content
      $r.Collapse(0)
      $t = $doc.Tables.Add($r, 5, 5, 1, 0)
      try { $t.Style = $s } catch {}
    }
  }
  Info = { param($app, $doc)
    $o = @()
    foreach ($s in $doc.Styles) {
      try { if ($s.Type -eq 3) { $o += [ordered]@{ local = [string]$s.NameLocal; builtIn = [bool]$s.BuiltIn } } } catch {}
    }
    return @{ styles = $o }
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
      $before = Get-State $doc
      $selBefore = Get-SelInfo $w
      & $x.Op $w $doc
      $info = [ordered]@{ name = $name; selBefore = $selBefore; selAfter = (Get-SelInfo $w) }
      if ($x.Info) { $info.extra = (& $x.Info $w $doc) }
      $doc.SaveAs2($out, 16) | Out-Null
      $after = Get-State $doc
      $info.changed = ($after -ne $before)
      # passos de desfazer ate voltar ao estado anterior (texto + forma das tabelas)
      $steps = 0
      if ($info.changed) {
        for ($i = 1; $i -le 6; $i++) {
          $ok = $doc.Undo(1)
          if (-not $ok) { break }
          $steps = $i
          if ((Get-State $doc) -eq $before) { break }
        }
        $info.undoSteps = $steps
        $info.undoRestores = ((Get-State $doc) -eq $before)
      }
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

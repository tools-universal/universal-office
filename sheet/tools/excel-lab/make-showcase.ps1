# Gera samples/showcase.xlsx — planilha-referência com TODOS os recursos do
# Excel (exceto macros). Serve de oráculo/especificação para a renderização 1:1.
#
# Uso: pwsh -ExecutionPolicy Bypass -File tools/excel-lab/make-showcase.ps1
$ErrorActionPreference = 'Stop'
$out = Join-Path $PSScriptRoot '..\..\samples\showcase.xlsx'
$out = (Resolve-Path (Split-Path $out)).Path + '\showcase.xlsx'

function RGB([int]$r,[int]$g,[int]$b){ return $r + $g*256 + $b*65536 }  # Excel Color = BGR Long

# (col,row) 1-based -> "A1"
function A1([int]$col,[int]$row){
  $c=$col; $s=''
  while($c -gt 0){ $r=($c-1)%26; $s=[char](65+$r)+$s; $c=[math]::Floor(([double]$c-1)/26) }
  return "$s$row"
}

# constantes Excel
$xlContinuous=1; $xlDash=-4115; $xlThick=4; $xlThin=2
$xlEdgeLeft=7; $xlEdgeTop=8; $xlEdgeBottom=9; $xlEdgeRight=10
$xlInsideVertical=11; $xlInsideHorizontal=12
$xlCenter=-4108; $xlTop=-4160; $xlRight=-4152
$xlColumnClustered=51; $xlLine=4; $xlPie=5
$xlCellValue=1; $xlGreater=5
$xlList=3; $xlSrcRange=1; $xlYes=1

# helper: define array DE arrays via ArrayList.Add (PowerShell achata @(@(),@()))

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $null
try {
  $excel.SheetsInNewWorkbook = 1
  $wb = $excel.Workbooks.Add()
  function NewSheet([string]$name, [string]$after) {
    $ws = $wb.Worksheets.Add([System.Reflection.Missing]::Value, $wb.Worksheets.Item($after))
    $ws.Name = $name
    return $ws
  }
  $intro = $wb.Worksheets.Item(1); $intro.Name = 'Inicio'
  $intro.Range('A1').Value2 = 'Universal Sheet — Showcase de Recursos'
  $intro.Range('A1').Font.Bold = $true; $intro.Range('A1').Font.Size = 16
  $intro.Columns.Item(1).ColumnWidth = 22
  $intro.Columns.Item(2).ColumnWidth = 50

  # ── TextoENumeros ──
  $t = NewSheet 'TextoENumeros' 'Inicio'
  $t.Range('A1').Value2 = 'Tipo'; $t.Range('B1').Value2 = 'Exemplo'; $t.Range('A1:B1').Font.Bold = $true
  $t.Range('A2').Value2='Texto';            $t.Range('B2').Value2='Universal Sheet'
  $t.Range('A3').Value2='Numero inteiro';   $t.Range('B3').Value2=1234
  $t.Range('A4').Value2='Decimal';          $t.Range('B4').Value2=3.14159
  $t.Range('A5').Value2='Moeda';            $t.Range('B5').Value2=1999.9;  $t.Range('B5').NumberFormat='"R$" #,##0.00'
  $t.Range('A6').Value2='Porcentagem';      $t.Range('B6').Value2=0.875;   $t.Range('B6').NumberFormat='0.0%'
  $t.Range('A7').Value2='Cientifico';       $t.Range('B7').Value2=1230000; $t.Range('B7').NumberFormat='0.00E+00'
  $t.Range('A8').Value2='Booleano TRUE';    $t.Range('B8').Value2=$true
  $t.Range('A9').Value2='Erro';             $t.Range('B9').Value2='#DIV/0!'
  $t.Range('A11').Value2 = 'Texto longo que excede a largura da coluna para testar overflow/clip'
  $t.Range('A13').Value2 = 'Quebra'; $t.Range('B13').Value2 = 'Texto com quebra de linha dentro da celula'
  $t.Range('B13').WrapText = $true; $t.Range('B13').ColumnWidth = 16
  $t.Columns.Item(1).ColumnWidth = 20

  # ── Datas ──
  $d = NewSheet 'Datas' 'TextoENumeros'
  $d.Range('A1').Value2 = 'Formato'; $d.Range('B1').Value2 = 'Valor'; $d.Range('A1:B1').Font.Bold = $true
  $base = Get-Date -Year 2026 -Month 6 -Day 17 -Hour 14 -Minute 30 -Second 0
  $drows = New-Object System.Collections.ArrayList
  [void]$drows.Add(@('Data curta','m/d/yyyy'))
  [void]$drows.Add(@('Data longa','dddd, mmmm d, yyyy'))
  [void]$drows.Add(@('Hora','h:mm AM/PM'))
  [void]$drows.Add(@('Data/hora','m/d/yyyy h:mm'))
  [void]$drows.Add(@('Mes/ano','mmmm yyyy'))
  [void]$drows.Add(@('ISO','yyyy-mm-dd'))
  for ($k=0; $k -lt $drows.Count; $k++) {
    $d.Range((A1 1 ($k+2))).Value2 = $drows[$k][0]
    $d.Range((A1 2 ($k+2))).Value = $base            # .Value aceita DateTime (Value2 exigiria serial)
    $d.Range((A1 2 ($k+2))).NumberFormat = $drows[$k][1]
  }
  $d.Columns.Item(1).ColumnWidth = 16; $d.Columns.Item(2).ColumnWidth = 26

  # ── Formatacao ──
  $f = NewSheet 'Formatacao' 'Datas'
  $f.Range('A1').Value2 = 'Negrito'; $f.Range('A1').Font.Bold = $true
  $f.Range('A2').Value2 = 'Italico'; $f.Range('A2').Font.Italic = $true
  $f.Range('A3').Value2 = 'Sublinhado'; $f.Range('A3').Font.Underline = $true
  $f.Range('A4').Value2 = 'Cor de fonte'; $f.Range('A4').Font.Color = (RGB 192 0 0)
  $f.Range('A5').Value2 = 'Fonte grande'; $f.Range('A5').Font.Size = 18
  $f.Range('A6').Value2 = 'Preenchimento'; $f.Range('A6').Interior.Color = (RGB 255 230 153)
  $f.Range('A7').Value2 = 'Alinhado centro'; $f.Range('A7').HorizontalAlignment = $xlCenter
  $f.Range('A8').Value2 = 'Alinhado direita'; $f.Range('A8').HorizontalAlignment = $xlRight
  $f.Range('A9').Value2 = 'Alinhado topo'; $f.Range('A9').VerticalAlignment = $xlTop; $f.Range('A9').RowHeight = 34
  $f.Range('A10').Value2 = 'Alinhado meio'; $f.Range('A10').VerticalAlignment = $xlCenter; $f.Range('A10').RowHeight = 34
  $f.Columns.Item(1).ColumnWidth = 24

  # ── Bordas ──
  $b = NewSheet 'Bordas' 'Formatacao'
  $b.Range('B2').Value2 = 'Borda fina'
  $b.Range('B2').Borders.LineStyle = $xlContinuous; $b.Range('B2').Borders.Weight = $xlThin
  $b.Range('B4').Value2 = 'Borda grossa'
  $b.Range('B4').Borders.LineStyle = $xlContinuous; $b.Range('B4').Borders.Weight = $xlThick
  $b.Range('B6').Value2 = 'Tracejada'
  $b.Range('B6').Borders.LineStyle = $xlDash
  $b.Range('B8').Value2 = 'Grade 3x3'
  $grid = $b.Range('B8:D10'); $grid.Value2 = 'X'
  foreach ($e in $xlEdgeLeft,$xlEdgeTop,$xlEdgeBottom,$xlEdgeRight,$xlInsideVertical,$xlInsideHorizontal) {
    $grid.Borders.Item($e).LineStyle = $xlContinuous
  }
  $grid.Borders.Color = (RGB 31 111 235)
  $b.Columns.Item(1).ColumnWidth = 4
  for ($c=2; $c -le 4; $c++) { $b.Columns.Item($c).ColumnWidth = 14 }

  # ── Mesclar ──
  $m = NewSheet 'Mesclar' 'Bordas'
  $m.Range('A1:D1').Merge(); $m.Range('A1').Value2 = 'Titulo mesclado A1:D1'
  $m.Range('A1').Font.Bold = $true; $m.Range('A1').HorizontalAlignment = $xlCenter
  $m.Range('A3:B4').Merge(); $m.Range('A3').Value2 = 'Mesclado vertical tambem'
  $m.Range('A3').VerticalAlignment = $xlCenter; $m.Range('A3').WrapText = $true
  $m.Columns.Item(1).ColumnWidth = 16

  # ── Formulas ──
  $fo = NewSheet 'Formulas' 'Mesclar'
  $fo.Range('A1').Value2='Item'; $fo.Range('B1').Value2='Qtd'; $fo.Range('C1').Value2='Valor'; $fo.Range('A1:C1').Font.Bold=$true
  $data = New-Object System.Collections.ArrayList
  [void]$data.Add(@('Caneta',10,2.5))
  [void]$data.Add(@('Caderno',4,15))
  [void]$data.Add(@('Lapis',24,1.2))
  [void]$data.Add(@('Borracha',8,0.8))
  for ($k=0;$k -lt $data.Count;$k++){
    $r=$k+2
    $fo.Range((A1 1 $r)).Value2=[string]$data[$k][0]; $fo.Range((A1 2 $r)).Value2=[int]$data[$k][1]; $fo.Range((A1 3 $r)).Value2=[double]$data[$k][2]
  }
  $fo.Range('C2:C5').NumberFormat = '"R$" #,##0.00'
  $n = $data.Count + 2
  $fo.Range((A1 1 $n)).Value2='SOMA';         $fo.Range((A1 2 $n)).Formula = '=SUM(B2:B5)'
  $fo.Range((A1 1 ($n+1))).Value2='MEDIA';    $fo.Range((A1 2 ($n+1))).Formula = '=AVERAGE(B2:B5)'
  $fo.Range((A1 1 ($n+2))).Value2='MAX';      $fo.Range((A1 2 ($n+2))).Formula = '=MAX(C2:C5)'
  $fo.Range((A1 1 ($n+3))).Value2='SE';       $fo.Range((A1 2 ($n+3))).Formula = '=IF(B2>5,"muito","pouco")'
  $fo.Range((A1 1 ($n+4))).Value2='PROCV';    $fo.Range((A1 2 ($n+4))).Formula = '=VLOOKUP("Caderno",A2:C5,2,FALSE)'
  $fo.Range((A1 1 ($n+5))).Value2='CONT.SE';  $fo.Range((A1 2 ($n+5))).Formula = '=COUNTIF(B2:B5,">5")'
  $fo.Range((A1 1 ($n+6))).Value2='TEXTO';    $fo.Range((A1 2 ($n+6))).Formula = '=TEXT(C2,"0.00")&" reais"'
  $fo.Range((A1 1 ($n+7))).Value2='SOMA abs.';$fo.Range((A1 2 ($n+7))).Formula = '=$B$2+SUM($C$2:$C$5)'
  $fo.Range((A1 1 ($n+8))).Value2='Ref. externa'; $fo.Range((A1 2 ($n+8))).Formula = "='TextoENumeros'!B3"
  $fo.Range("B$n`:B$($n+8)").Font.Color = (RGB 31 111 235)
  $fo.Columns.Item(1).ColumnWidth = 18

  # ── CondFormat ──
  $cf = NewSheet 'CondFormat' 'Formulas'
  $cf.Range('A1').Value2 = 'Escala de cor'; $cf.Range('A1').Font.Bold = $true
  for ($k=1;$k -le 10;$k++){ $cf.Range((A1 1 ($k+1))).Value2 = [int]$k }
  $cs = $cf.Range('A2:A11').FormatConditions.AddColorScale(3)
  $cs.ColorScaleCriteria.Item(1).Type = 3; $cs.ColorScaleCriteria.Item(1).FormatColor.Color = (RGB 248 105 107)
  $cs.ColorScaleCriteria.Item(2).Type = 4; $cs.ColorScaleCriteria.Item(2).FormatColor.Color = (RGB 255 235 132)
  $cs.ColorScaleCriteria.Item(3).Type = 3; $cs.ColorScaleCriteria.Item(3).FormatColor.Color = (RGB 99 190 123)
  $cf.Range('C1').Value2 = 'Data bar'; $cf.Range('C1').Font.Bold = $true
  for ($k=1;$k -le 8;$k++){ $cf.Range((A1 3 ($k+1))).Value2 = [int]($k*13) }
  $cf.Range('C2:C9').FormatConditions.AddDatabar() | Out-Null
  $cf.Range('E1').Value2 = 'Regra (>40)'; $cf.Range('E1').Font.Bold = $true
  for ($k=1;$k -le 6;$k++){ $cf.Range((A1 5 ($k+1))).Value2 = [int]($k*10) }
  $hl = $cf.Range('E2:E7').FormatConditions.Add($xlCellValue,$xlGreater,'40')
  $hl.Interior.Color = (RGB 255 199 206)
  $cf.Columns.Item(1).ColumnWidth = 14; $cf.Columns.Item(3).ColumnWidth = 14; $cf.Columns.Item(5).ColumnWidth = 14

  # ── Validacao (lista dropdown) ──
  $v = NewSheet 'Validacao' 'CondFormat'
  $v.Range('A1').Value2 = 'Escolha:'; $v.Range('A1').Font.Bold = $true
  $v.Range('B1').Value2 = 'Alto'
  $val = $v.Range('B1').Validation
  $val.Delete() | Out-Null
  $val.Add($xlList, 1, 1, 'Baixo,Medio,Alto') | Out-Null
  $val.InCellDropdown = $true
  $v.Columns.Item(1).ColumnWidth = 12; $v.Columns.Item(2).ColumnWidth = 12

  # ── Tabela (ListObject) ──
  $tb = NewSheet 'Tabela' 'Validacao'
  $tb.Range('A1').Value2='Mes'; $tb.Range('B1').Value2='Vendas'; $tb.Range('C1').Value2='Custo'
  $tdata = New-Object System.Collections.ArrayList
  [void]$tdata.Add(@(1,1200,800))
  [void]$tdata.Add(@(2,1500,900))
  [void]$tdata.Add(@(3,1800,1100))
  [void]$tdata.Add(@(4,2100,1300))
  [void]$tdata.Add(@(5,1900,1200))
  for ($k=0;$k -lt $tdata.Count;$k++){
    $r=$k+2; $tb.Range((A1 1 $r)).Value2=[int]$tdata[$k][0]; $tb.Range((A1 2 $r)).Value2=[int]$tdata[$k][1]; $tb.Range((A1 3 $r)).Value2=[int]$tdata[$k][2]
  }
  $wb.Worksheets.Item('Tabela').ListObjects.Add($xlSrcRange, $tb.Range('A1:C6'), $null, $xlYes) | Out-Null
  $tb.Columns.Item(1).ColumnWidth = 10

  # ── Graficos ──
  $ch = NewSheet 'Graficos' 'Tabela'
  $ch.Range('A1').Value2='Mes'; $ch.Range('B1').Value2='Vendas'
  $cdata = New-Object System.Collections.ArrayList
  [void]$cdata.Add(@(1,100))
  [void]$cdata.Add(@(2,250))
  [void]$cdata.Add(@(3,180))
  [void]$cdata.Add(@(4,320))
  [void]$cdata.Add(@(5,290))
  [void]$cdata.Add(@(6,410))
  for ($k=0;$k -lt $cdata.Count;$k++){ $ch.Range((A1 1 ($k+2))).Value2=[int]$cdata[$k][0]; $ch.Range((A1 2 ($k+2))).Value2=[int]$cdata[$k][1] }
  $src = $ch.Range('A1:B7')
  try {
    $co1 = $ch.ChartObjects().Add(220, 30, 320, 200); $co1.Chart.ChartType = $xlColumnClustered; $co1.Chart.SetSourceData($src); $co1.Name='Coluna'
    $co2 = $ch.ChartObjects().Add(220, 250, 320, 200); $co2.Chart.ChartType = $xlLine; $co2.Chart.SetSourceData($src); $co2.Name='Linha'
    $co3 = $ch.ChartObjects().Add(560, 30, 280, 200); $co3.Chart.ChartType = $xlPie; $co3.Chart.SetSourceData($src); $co3.Name='Pizza'
  } catch { Write-Warning "Graficos falharam: $_" }
  $ch.Columns.Item(1).ColumnWidth = 10

  # ── Comentarios ──
  $cm = NewSheet 'Comentarios' 'Graficos'
  $cm.Range('A1').Value2 = 'Celula com comentario'
  $cm.Range('A1').AddComment('Esta e uma anotacao digitada pelo autor.') | Out-Null
  $cm.Range('A3').Value2 = 'Outra anotacao'
  $cm.Range('A3').AddComment('Segundo comentario.') | Out-Null
  $cm.Columns.Item(1).ColumnWidth = 26

  # ── Congelar (freeze panes) ──
  $fr = NewSheet 'Congelar' 'Comentarios'
  $fr.Range('A1').Value2='Header'; $fr.Range('B1').Value2='Header'; $fr.Range('C1').Value2='Header'; $fr.Range('A1:C1').Font.Bold=$true
  for ($k=2;$k -le 15;$k++){ $fr.Range((A1 1 $k)).Value2=[string]"L$k"; $fr.Range((A1 2 $k)).Value2=[int]$k; $fr.Range((A1 3 $k)).Value2=[int]($k*2) }
  $fr.Range('B2').Select() | Out-Null
  $excel.ActiveWindow.FreezePanes = $true

  # ── Ocultos ──
  $oc = NewSheet 'Ocultos' 'Congelar'
  for ($k=1;$k -le 10;$k++){ $oc.Range((A1 1 $k)).Value2="L$k" }
  $oc.Rows.Item(4).Hidden = $true
  $oc.Columns.Item(2).Hidden = $true
  $oc.Rows.Item('6:7').Group() | Out-Null
  $oc.Columns.Item(1).ColumnWidth = 10

  # ── Inicio: índice com hyperlinks (abas já existem) ──
  $intro.Range('A3').Value2 = 'Aba'; $intro.Range('B3').Value2 = 'Recurso demonstrado'; $intro.Range('A3:B3').Font.Bold = $true
  $desc = @{
    TextoENumeros='Tipos, formatos numericos, quebra de texto'
    Datas='Formatos de data e hora'
    Formatacao='Negrito, italico, cor, preenchimento, alinhamento'
    Bordas='Estilos de borda e grade'
    Mesclar='Celulas mescladas (horizontal e vertical)'
    Formulas='SUM, AVERAGE, IF, VLOOKUP, COUNTIF, refs absolutas/externas'
    CondFormat='Escala de cor, data bar, regra de destaque'
    Validacao='Validacao de dados (lista dropdown)'
    Tabela='Tabela formatada (ListObject)'
    Graficos='Graficos coluna, linha, pizza'
    Comentarios='Comentarios/anotacoes'
    Congelar='Congelar paineis (freeze panes)'
    Ocultos='Linhas/colunas ocultas e grupos (outline)'
  }
  $i = 4
  foreach ($n in 'TextoENumeros','Datas','Formatacao','Bordas','Mesclar','Formulas','CondFormat','Validacao','Tabela','Graficos','Comentarios','Congelar','Ocultos') {
    $intro.Range((A1 1 $i)).Value2 = $n
    try { $intro.Hyperlinks.Add($intro.Range((A1 1 $i)), "", "$n!A1", "", $n) | Out-Null } catch {}
    $intro.Range((A1 2 $i)).Value2 = [string]$desc[$n]
    $i++
  }
  $intro.Range((A1 1 ($i+1))).Value2 = '(gerado via COM do Excel real)'

  $wb.Worksheets.Item('Inicio').Move($wb.Worksheets.Item(1)) | Out-Null
  $wb.Worksheets.Item('Inicio').Activate()
  $wb.SaveAs($out, 51)
  Write-Host "Gerado: $out"
  Write-Host "Abas: $([string]::Join(', ', @($wb.Worksheets | ForEach-Object { $_.Name })))"
}
finally {
  if ($wb) { try { $wb.Close($false) } catch {} }
  $excel.Quit()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
}

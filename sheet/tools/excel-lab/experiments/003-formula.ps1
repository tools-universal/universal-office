$Description = 'Workbook vazio → A1 = fórmula =1+2. Mostra c:f (fórmula) + c:v (valor em cache calculado).'
$Setup = $null
$Operation = { $Worksheet.Range('A1').Formula = '=1+2' }

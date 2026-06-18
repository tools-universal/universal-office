$Description = 'Workbook vazio → setar A1 = "Hello world". Mostra como o Excel representa uma string simples (shared string + referência de célula).'
$Setup = $null
$Operation = { $Worksheet.Range('A1').Value2 = 'Hello world' }

$Description = 'Workbook vazio → setar A1 = 42 (número). Mostra que número fica direto em c:v sem atributo t (default n) e NÃO cria sharedStrings.xml.'
$Setup = $null
$Operation = { $Worksheet.Range('A1').Value2 = 42 }

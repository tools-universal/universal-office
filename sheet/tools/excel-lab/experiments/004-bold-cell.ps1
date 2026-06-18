$Description = 'Workbook vazio → A1 = "Hello" e aplicar negrito. Mostra como a formatação muta xl/styles.xml (fonts/cellXfs) e a célula ganha atributo s (índice de estilo).'
$Setup = { $Worksheet.Range('A1').Value2 = 'Hello' }
$Operation = { $Worksheet.Range('A1').Font.Bold = $true }

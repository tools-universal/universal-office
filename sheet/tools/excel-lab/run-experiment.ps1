# Universal Sheet excel-lab — executa um experimento contra o Excel real via COM.
#
# Uso: .\run-experiment.ps1 -Name 001-set-cell-value
#
# Um experimento (experiments/<Name>.ps1) define:
#   $Description : string
#   $Setup       : scriptblock opcional — prepara o estado ANTES do snapshot inicial
#   $Operation   : scriptblock — a operação única sendo estudada
# Os scriptblocks têm acesso a $Excel, $Workbook e $Worksheet.
#
# Saída em results/<Name>/:
#   before.xlsx / after.xlsx     — snapshots
#   before/ after/               — XML extraído e indentado
#   sheet.diff                   — diff de xl/worksheets/sheet1.xml
#   report.md                    — descrição + diff completo de todas as partes

param([Parameter(Mandatory)][string]$Name)
$ErrorActionPreference = 'Stop'

$labRoot = $PSScriptRoot
$expFile = Join-Path $labRoot "experiments\$Name.ps1"
if (-not (Test-Path $expFile)) { throw "Experimento não encontrado: $expFile" }

$Setup = $null; $Operation = $null; $Description = $Name
. $expFile
if (-not $Operation) { throw "Experimento não define `$Operation" }

$outDir = Join-Path $labRoot "results\$Name"
if (Test-Path $outDir) { Remove-Item -Recurse -Force $outDir }
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Expand-Xlsx([string]$xlsx, [string]$dest) {
    $zip = "$xlsx.zip"
    Copy-Item $xlsx $zip -Force
    Expand-Archive $zip -DestinationPath $dest -Force
    Remove-Item $zip
    # Indenta todo XML para diffs legíveis (texto é preservado pelo XDocument)
    Get-ChildItem $dest -Recurse -File | Where-Object { $_.Name -match '\.(xml|rels)$' } | ForEach-Object {
        try {
            $x = [System.Xml.Linq.XDocument]::Load($_.FullName, [System.Xml.Linq.LoadOptions]::PreserveWhitespace)
            $settings = New-Object System.Xml.XmlWriterSettings
            $settings.Indent = $true
            $settings.OmitXmlDeclaration = $false
            $w = [System.Xml.XmlWriter]::Create($_.FullName, $settings)
            $x.Save($w); $w.Close()
        } catch { Write-Warning "Falha ao indentar $($_.FullName): $_" }
    }
}

$excel = $null; $wb = $null
try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    # Workbook novo com exatamente uma planilha (estado limpo/reproduzível)
    $excel.SheetsInNewWorkbook = 1
    $wb = $excel.Workbooks.Add()
    $ws = $wb.Worksheets.Item(1)
    # Exposição para os scriptblocks do experimento
    $Excel = $excel; $Workbook = $wb; $Worksheet = $ws

    if ($Setup) { & $Setup }

    $beforePath = Join-Path $outDir 'before.xlsx'
    $wb.SaveAs($beforePath, 51)   # 51 = xlOpenXMLWorkbook (.xlsx)

    & $Operation

    $afterPath = Join-Path $outDir 'after.xlsx'
    $wb.SaveAs($afterPath, 51)
}
finally {
    if ($wb)    { try { $wb.Close($false) } catch {} }
    if ($excel) { try { $excel.Quit() } catch {} }
    if ($excel) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) }
}

Expand-Xlsx (Join-Path $outDir 'before.xlsx') (Join-Path $outDir 'before')
Expand-Xlsx (Join-Path $outDir 'after.xlsx')  (Join-Path $outDir 'after')

# Diff de todas as partes via git (exit 1 = há diferenças, esperado)
$report = @("# $Name", '', $Description, '', '## Diffs', '')
$allDiff = git -c core.autocrlf=false diff --no-index --text "$outDir\before" "$outDir\after" 2>&1 | Out-String
$sheetPath = "$outDir\after\xl\worksheets\sheet1.xml"
$sheetDiff = ''
if (Test-Path $sheetPath) {
    $sheetDiff = git -c core.autocrlf=false diff --no-index --text "$outDir\before\xl\worksheets\sheet1.xml" $sheetPath 2>&1 | Out-String
}
$global:LASTEXITCODE = 0
Set-Content (Join-Path $outDir 'sheet.diff') $sheetDiff -Encoding utf8
$report += '```diff'; $report += $allDiff; $report += '```'
Set-Content (Join-Path $outDir 'report.md') ($report -join "`n") -Encoding utf8

Write-Host "== $Name concluído. Diff de xl/worksheets/sheet1.xml: =="
Write-Host $sheetDiff

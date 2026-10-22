# Regras do nivel de topico dos estilos de titulo internos (Painel de Navegacao):
#  1. estilo "Heading N" sem w:outlineLvl no styles.xml: o Word da nivel N?
#     (abre o .docx de -Sample e le OutlineLevel dos paragrafos com estilo)
#  2. nivel de topico direto num paragrafo com Titulo 1: o Word aceita?
#     (documento novo, Titulo 1, OutlineLevel = 5; grava <OutDir>\heading-direct.docx)
#  3. estilo proprio baseado em Titulo 2: herda o nivel 2?
# Sempre pela trava global. ASCII puro.
param(
  [Parameter(Mandatory=$true)][string]$Sample,
  [Parameter(Mandatory=$true)][string]$OutDir
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\doc-lab\word-com.ps1')
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$w = New-WordApp
try {
  $d = $w.Documents.Open([string]$Sample, $false, $true, $false)
  try {
    $seen = @{}
    foreach ($p in $d.Paragraphs) {
      $s = [string]$p.Style.NameLocal
      if ($seen.ContainsKey($s)) { continue }
      $seen[$s] = $true
      Emit ('sample style=' + $s + ' builtin=' + $p.Style.BuiltIn + ' outline=' + $p.OutlineLevel)
    }
  } finally { $d.Close([ref]0) | Out-Null }

  $n = $w.Documents.Add()
  try {
    $n.Content.Text = "titulo`rcorpo`rderivado"
    $p1 = $n.Paragraphs.Item(1)
    $p1.Style = $n.Styles.Item(-2)
    $err = ''
    try { $p1.OutlineLevel = 5 } catch { $err = $_.Exception.Message -replace "[\r\n]+", ' ' }
    Emit ('direct heading1 outline=' + $p1.OutlineLevel + ' err=' + $err)
    $p2 = $n.Paragraphs.Item(2)
    $p2.OutlineLevel = 3
    Emit ('direct normal outline=' + $p2.OutlineLevel)
    $st = $n.Styles.Add('Derivado', 1)
    $st.BaseStyle = $n.Styles.Item(-3)
    $n.Paragraphs.Item(3).Style = 'Derivado'
    Emit ('derived from heading2 outline=' + $n.Paragraphs.Item(3).OutlineLevel)
    $n.SaveAs2([string](Join-Path $OutDir 'heading-direct.docx'), 16) | Out-Null
  } finally { $n.Close([ref]0) | Out-Null }
} finally { Close-WordApp $w }

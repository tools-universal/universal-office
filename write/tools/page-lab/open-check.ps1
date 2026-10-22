# Abre no Word (invisivel, sem reparo) os .docx que o editor gerou (edit-check --only page
# --save-page <pasta>) e confere o que o Word ve: marca-d'agua nos cabecalhos (nome e
# tipo da forma), tipo do preenchimento da pagina, folha de rosto (controle do sdt
# "Cover Pages") e se os botoes Remover Marca-d'Agua / Remover Folha de Rosto Atual do
# Word funcionam sobre o XML gerado. Exporta o PDF ao lado (fora do git).
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass -File open-check.ps1 -Dir <pasta>
param([string]$Dir)
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$out = @()
try {
  foreach ($f in Get-ChildItem -Path $Dir -Filter *.docx) {
    $p = [string]$f.FullName
    $line = $f.Name
    try {
      $doc = $word.Documents.Open($p, $false, $false, $false)
      try {
        $wm = @()
        for ($s = 1; $s -le $doc.Sections.Count; $s++) {
          foreach ($t in @(1, 2, 3)) {
            $h = $doc.Sections($s).Headers($t)
            if (-not $h.Exists) { continue }
            foreach ($sh in $h.Shapes) { if ($sh.Name -match 'WaterMark|Watermark') { $wm += ("s" + $s + "t" + $t + ":" + $sh.Type) } }
          }
        }
        $fill = $doc.Background.Fill
        $bg = if ($fill.Visible) { $fill.Type } else { 'none' }
        $cc = @()
        foreach ($c in $doc.ContentControls) { $cc += ($c.Type.ToString() + '/' + $c.BuildingBlockType) }
        $line += " wm=[" + ($wm -join ',') + "] bg=" + $bg + " cc=[" + ($cc -join ',') + "] pages=" + $doc.ComputeStatistics(2) + " titlePg=" + $doc.Sections(1).PageSetup.DifferentFirstPageHeaderFooter
        $doc.ExportAsFixedFormat([string]($p -replace '\.docx$', '.pdf'), 17)
        # os botoes do Word sobre o nosso XML
        $doc.Activate()
        if ($wm.Count -gt 0) {
          $word.CommandBars.ExecuteMso('WatermarkRemove')
          $left = 0
          for ($s = 1; $s -le $doc.Sections.Count; $s++) { foreach ($t in @(1, 2, 3)) { $h = $doc.Sections($s).Headers($t); if ($h.Exists) { foreach ($sh in $h.Shapes) { if ($sh.Name -match 'WaterMark|Watermark') { $left++ } } } } }
          $line += " wmRemove->" + $left
        }
        # folha de rosto: o sdt docPartObj "Cover Pages" nao aparece em ContentControls
        $hasCover = $doc.Content.WordOpenXML -match 'Cover Pages'
        if ($hasCover) {
          $word.CommandBars.ExecuteMso('CoverPageRemove')
          $line += " cover=sim coverRemove->" + ($(if ($doc.Content.WordOpenXML -match 'Cover Pages') { 'ficou' } else { 'removida' }))
        }
      } finally { $doc.Close(0) }
      $out += ("ok " + $line)
    } catch { $out += ("ERRO " + $line + ": " + $_.Exception.Message) }
  }
} finally { $word.Quit() }
$out

# Sonda da frente Pagina: o que o COM expoe (tipos de bloco de construcao,
# categorias/nomes das marcas-d'agua e folhas de rosto, rotulos dos idMso).
# Word invisivel. Rodar por: node tools/parallel/word-lock.mjs -- powershell ...
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Add()
  $word.Templates.LoadBuildingBlocks()
  foreach ($t in $word.Templates) {
    $n = [string]$t.Name
    if ($n -notmatch 'Building Blocks') { continue }
    "== template $n"
    $bt = $t.BuildingBlockTypes
    for ($i = 1; $i -le $bt.Count; $i++) {
      $ty = $bt.Item($i)
      $cats = $ty.Categories
      if ($cats.Count -eq 0) { continue }
      "type $i name=[$($ty.Name)] cats=$($cats.Count)"
      if ($ty.Name -match 'Marca|Water|Folha|Cover|Rosto') {
        for ($c = 1; $c -le $cats.Count; $c++) {
          $cat = $cats.Item($c)
          $names = @()
          $bbs = $cat.BuildingBlocks
          for ($k = 1; $k -le $bbs.Count; $k++) { $names += [string]$bbs.Item($k).Name }
          "   cat [$($cat.Name)]: " + ($names -join ' | ')
        }
      }
    }
  }
  foreach ($id in @('WatermarkGallery', 'WatermarkRemove', 'WatermarkCustomDialog', 'PageColorPicker', 'PageBackgroundFillEffectsDialog', 'CoverPageInsertGallery', 'CoverPageRemove', 'BlankPageInsert', 'PageBreakInsertWord', 'PageColorNoColor', 'PageColorMoreColorsDialog')) {
    try { "mso $id label=[" + $word.CommandBars.GetLabelMso($id) + "] enabled=" + $word.CommandBars.GetEnabledMso($id) } catch { "mso $id ERR $($_.Exception.Message)" }
  }
  $doc.Close(0)
} finally {
  $word.Quit(0)
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}

# Experimentos de MARCADOR DE IMAGEM (Definir Novo Marcador > Imagem): o XML que o Word grava
# (w:numPicBullet, w:lvlPicBulletId, a imagem e a relacao) ao aplicar uma imagem como marcador,
# e o tamanho em que ele a desenha (PDF) conforme a fonte do nivel.
# A imagem e gerada pelo lab (.out/bullet.png, tools/image-lab/test-image.mjs). ASCII puro.

$PNG = [string](Join-Path $PSScriptRoot '.out\bullet.png')

$EXPERIMENTS = @(
  @{ Name = 'picbullet'; Run = { param($app, $doc)
      $doc.Content.Text = "Primeiro item`rSegundo item`rTerceiro"
      $r = $doc.Range($doc.Paragraphs.Item(1).Range.Start, $doc.Paragraphs.Item(2).Range.End)
      $r.ListFormat.ApplyBulletDefault()
      $lt = $r.ListFormat.ListTemplate
      $lv = $lt.ListLevels.Item(1)
      $pic = $lv.ApplyPictureBullet($PNG)
      $r.ListFormat.ApplyListTemplate($lt, $true)
      $p = $doc.Paragraphs.Item(1)
      [ordered]@{
        listString = $p.Range.ListFormat.ListString; numberFormat = $lv.NumberFormat; style = $lv.NumberStyle
        picW = $pic.Width; picH = $pic.Height; fontSize = $lv.Font.Size
        numberPos = $lv.NumberPosition; textPos = $lv.TextPosition; tab = $lv.TabPosition
        paraStyle = $p.Style.NameLocal
      } } ; Pdf = $true }
  @{ Name = 'picbullet-size'; Run = { param($app, $doc)
      # o tamanho do marcador segue a fonte do numero (Font.Size do nivel)
      $doc.Content.Text = "Item grande`rOutro"
      $doc.Content.ListFormat.ApplyBulletDefault()
      $lt = $doc.Content.ListFormat.ListTemplate
      $lv = $lt.ListLevels.Item(1)
      $pic = $lv.ApplyPictureBullet($PNG)
      $lv.Font.Size = 20
      $doc.Content.ListFormat.ApplyListTemplate($lt, $true)
      [ordered]@{ picW = $pic.Width; picH = $pic.Height; fontSize = $lv.Font.Size } } ; Pdf = $true }
  @{ Name = 'picbullet-sizes'; Run = { param($app, $doc)
      # um marcador de imagem por paragrafo, com a fonte do nivel em 8, 11, 14 e 30 pt
      $doc.Content.Text = "Oito`rOnze`rCatorze`rTrinta`rFim"
      $sizes = @(8, 11, 14, 30)
      for ($k = 0; $k -lt 4; $k++) {
        $r = $doc.Paragraphs.Item($k + 1).Range
        $r.ListFormat.ApplyBulletDefault()
        $lt = $r.ListFormat.ListTemplate
        $lv = $lt.ListLevels.Item(1)
        $null = $lv.ApplyPictureBullet($PNG)
        $lv.Font.Size = $sizes[$k]
        $r.ListFormat.ApplyListTemplate($lt, $false)
      }
      [ordered]@{ sizes = $sizes } } ; Pdf = $true }
)
foreach ($sz in @(6, 8, 10, 14, 30, 48)) {
  $EXPERIMENTS += @{ Name = ('picbullet-pt' + $sz); Sz = $sz; Pdf = $true; Run = [scriptblock]::Create(@"
param(`$app, `$doc)
`$doc.Content.Text = "Item"
`$doc.Content.ListFormat.ApplyBulletDefault()
`$lt = `$doc.Content.ListFormat.ListTemplate
`$lv = `$lt.ListLevels.Item(1)
`$null = `$lv.ApplyPictureBullet(`$PNG)
`$lv.Font.Size = $sz
`$doc.Content.ListFormat.ApplyListTemplate(`$lt, `$true)
[ordered]@{ size = `$lv.Font.Size }
"@) }
}

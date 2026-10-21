# Controle de alteracoes: XML que o Word grava em cada operacao feita com o
# controle LIGADO (e o resultado de aceitar/rejeitar). Uma sessao do Word,
# invisivel; cada experimento comeca num documento novo (ou num .docx de
# -FixDir), faz a operacao e salva <OutDir>\<nome>.docx. Nao muda o nome de
# usuario do Office: o autor e o da maquina (Application.UserName).
# Uso (sempre pela trava global):
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass
#     -File write/tools/revisions-oracle/revisions-xml.ps1 -OutDir <pasta> [-FixDir <pasta>] [-Only a,b]
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
param([string]$OutDir, [string]$FixDir = '', [string]$Only = '')
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$OutDir = (Resolve-Path $OutDir).Path
$onlySet = @{}
if ($Only) { foreach ($o in $Only.Split(',')) { $onlySet[$o] = $true } }

# s = Selection, d = Document. Texto-base sem controle; depois liga e opera.
$exps = [ordered]@{
  'type-mid'         = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.TypeText(' big') }
  'type-contiguous'  = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.TypeText(' big'); $s.TypeText('ger') }
  'type-two-places'  = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.TypeText(' big'); $s.EndKey(6) | Out-Null; $s.TypeText('!') }
  'type-replace-sel' = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(6, 11); $s.TypeText('earth') }
  'del-sel'          = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(6, 11); $s.Delete() | Out-Null }
  'backspace-one'    = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(11, 11); $s.TypeBackspace() }
  'backspace-two'    = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(11, 11); $s.TypeBackspace(); $s.TypeBackspace() }
  'delete-fwd-two'   = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(6, 6); $s.Delete() | Out-Null; $s.Delete() | Out-Null }
  'del-own-ins'      = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.TypeText(' big'); $s.SetRange(6, 8); $s.Delete() | Out-Null }
  'bksp-own-ins'     = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.TypeText(' big'); $s.TypeBackspace() }
  'type-after-del'   = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(6, 11); $s.Delete() | Out-Null; $s.TypeText('earth') }
  'caret-after-del'  = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(6, 11); $s.Delete() | Out-Null; $s.InsertAfter('[' + $s.Start + ',' + $s.End + ']') }
  'bold-word'        = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(6, 11); $s.Font.Bold = 1 }
  'bold-then-italic' = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(6, 11); $s.Font.Bold = 1; $s.Font.Italic = 1 }
  'bold-then-unbold' = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(6, 11); $s.Font.Bold = 1; $s.Font.Bold = 0 }
  'bold-overlap'     = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(6, 11); $s.Font.Bold = 1; $s.SetRange(3, 8); $s.Font.Italic = 1 }
  'size-font'        = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(0, 5); $s.Font.Size = 16; $s.Font.Name = 'Arial' }
  'color-word'       = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(0, 5); $s.Font.Color = 255 }
  'bold-own-ins'     = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.TypeText(' big'); $s.SetRange(6, 9); $s.Font.Bold = 1 }
  'del-formatted'    = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(6, 11); $s.Font.Bold = 1; $s.SetRange(6, 11); $s.Delete() | Out-Null }
  'align-center'     = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.ParagraphFormat.Alignment = 1 }
  'align-then-ind'   = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.ParagraphFormat.Alignment = 1; $s.ParagraphFormat.LeftIndent = 36 }
  'spacing'          = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.ParagraphFormat.SpaceAfter = 24; $s.ParagraphFormat.LineSpacingRule = 1 }
  'style-h1'         = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.Style = $d.Styles.Item(-2) }
  'list-bullet'      = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.Range.ListFormat.ApplyBulletDefault() }
  'enter-mid'        = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.TypeParagraph() }
  'enter-end-type'   = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.EndKey(6) | Out-Null; $s.TypeParagraph(); $s.TypeText('Second') }
  'enter-styled'     = { $s.TypeText('Hello world'); $s.ParagraphFormat.Alignment = 1; $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.TypeParagraph() }
  'join-backspace'   = { $s.TypeText('Hello'); $s.TypeParagraph(); $s.TypeText('World'); $d.TrackRevisions = $true; $s.SetRange(6, 6); $s.TypeBackspace() }
  'join-delete'      = { $s.TypeText('Hello'); $s.TypeParagraph(); $s.TypeText('World'); $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.Delete() | Out-Null }
  'join-props'       = { $s.TypeText('Hello'); $s.ParagraphFormat.Alignment = 2; $s.TypeParagraph(); $s.TypeText('World'); $s.ParagraphFormat.Alignment = 1; $d.TrackRevisions = $true; $s.SetRange(6, 6); $s.TypeBackspace() }
  'del-across'       = { $s.TypeText('Hello there'); $s.TypeParagraph(); $s.TypeText('big World'); $d.TrackRevisions = $true; $s.SetRange(6, 16); $s.Delete() | Out-Null }
  'del-whole-para'   = { $s.TypeText('One'); $s.TypeParagraph(); $s.TypeText('Two'); $s.TypeParagraph(); $s.TypeText('Three'); $d.TrackRevisions = $true; $s.SetRange(4, 8); $s.Delete() | Out-Null }
  'untracked-in-ins' = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.TypeText(' big'); $d.TrackRevisions = $false; $s.SetRange(7, 7); $s.TypeText('X') }
  'untracked-end-ins'= { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.TypeText(' big'); $d.TrackRevisions = $false; $s.TypeText('Y') }
  'untracked-in-del' = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(6, 11); $s.Delete() | Out-Null; $d.TrackRevisions = $false; $s.SetRange(8, 8); $s.TypeText('Z') }
  'untracked-del-ins'= { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.TypeText(' big'); $d.TrackRevisions = $false; $s.SetRange(6, 8); $s.Delete() | Out-Null }
  'image-ins'        = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(5, 5); $null = $s.InlineShapes.AddPicture($script:png) }
  'tab-and-break'    = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.TypeText("`t"); $s.InsertBreak(6) }
  'type-new-doc'     = { $d.TrackRevisions = $true; $s.TypeText('Fresh') }
  'empty-para-enter' = { $d.TrackRevisions = $true; $s.TypeParagraph() }
  'join-props-delete'= { $s.TypeText('Hello'); $s.ParagraphFormat.Alignment = 2; $s.TypeParagraph(); $s.TypeText('World'); $s.ParagraphFormat.Alignment = 1; $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.Delete() | Out-Null }
  'join-props-untracked' = { $s.TypeText('Hello'); $s.ParagraphFormat.Alignment = 2; $s.TypeParagraph(); $s.TypeText('World'); $s.ParagraphFormat.Alignment = 1; $s.SetRange(6, 6); $s.TypeBackspace() }
  'join-props-empty1' = { $s.TypeParagraph(); $s.TypeText('World'); $s.ParagraphFormat.Alignment = 1; $d.Paragraphs.Item(1).Alignment = 2; $d.TrackRevisions = $true; $s.SetRange(1, 1); $s.TypeBackspace() }
  'del-across-props' = { $s.TypeText('Hello there'); $s.ParagraphFormat.Alignment = 2; $s.TypeParagraph(); $s.TypeText('big World'); $s.ParagraphFormat.Alignment = 1; $d.TrackRevisions = $true; $s.SetRange(6, 16); $s.Delete() | Out-Null }
  'bksp-over-del'    = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(6, 11); $s.Delete() | Out-Null; $s.SetRange(11, 11); $s.TypeBackspace() }
  'delfwd-over-del'  = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(6, 11); $s.Delete() | Out-Null; $s.SetRange(0, 0); $s.SetRange(5, 5); $s.Delete() | Out-Null; $s.Delete() | Out-Null }
  'type-before-own-ins' = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.TypeText(' big'); $s.SetRange(5, 5); $s.TypeText('X') }
  'bksp-into-ins-start' = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.TypeText(' big'); $s.SetRange(5, 5); $s.TypeBackspace() }
  'enter-in-own-ins' = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.TypeText(' big'); $s.SetRange(7, 7); $s.TypeParagraph() }
  'bksp-own-mark'    = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(5, 5); $s.TypeParagraph(); $s.TypeBackspace() }
  'caret-bksp-del'   = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(11, 11); $s.TypeBackspace(); $s.InsertAfter('[' + $s.Start + ']') }
  'caret-delfwd'     = { $s.TypeText('Hello world'); $d.TrackRevisions = $true; $s.SetRange(6, 6); $s.Delete() | Out-Null; $s.InsertAfter('[' + $s.Start + ']') }
}

# experimentos sobre fixtures (.docx de -FixDir): nome = fixture-<op>
$fixOps = [ordered]@{
  'other-del-part'   = @('other-ins.docx', { $d.TrackRevisions = $true; $s.SetRange(7, 10); $s.Delete() | Out-Null })
  'other-del-all'    = @('other-ins.docx', { $d.TrackRevisions = $true; $s.SetRange(5, 10); $s.Delete() | Out-Null })
  'other-type-in'    = @('other-ins.docx', { $d.TrackRevisions = $true; $s.SetRange(7, 7); $s.TypeText('Q') })
  'other-bold'       = @('other-ins.docx', { $d.TrackRevisions = $true; $s.SetRange(6, 9); $s.Font.Bold = 1 })
  'accept-all'       = @('mixed.docx', { $d.Revisions.AcceptAll() })
  'reject-all'       = @('mixed.docx', { $d.Revisions.RejectAll() })
  'mixed-count'      = @('mixed.docx', { $n = $d.Revisions.Count; $t = ''; for ($i = 1; $i -le $n; $i++) { $r = $d.Revisions.Item($i); $t += "$($r.Type)|$($r.Author)|$($r.Range.Start)-$($r.Range.End)|$($r.Range.Text)|$($r.FormatDescription)`n" }; Set-Content -Path ([string](Join-Path $OutDir 'mixed-count.txt')) -Value $t -Encoding UTF8 })
  'accept-mark-ins'  = @('marks.docx', { $d.Revisions.Item(1).Accept() })
  'reject-mark-ins'  = @('marks.docx', { $d.Revisions.Item(1).Reject() })
  'accept-mark-del'  = @('marks.docx', { $d.Revisions.Item(2).Accept() })
  'reject-mark-del'  = @('marks.docx', { $d.Revisions.Item(2).Reject() })
  'marks-count'      = @('marks.docx', { $n = $d.Revisions.Count; $t = ''; for ($i = 1; $i -le $n; $i++) { $r = $d.Revisions.Item($i); $t += "$($r.Type)|$($r.Author)|$($r.Range.Start)-$($r.Range.End)|$($r.Range.Text)`n" }; Set-Content -Path ([string](Join-Path $OutDir 'marks-count.txt')) -Value $t -Encoding UTF8 })
}

$script:png = [string](Join-Path $OutDir 'px.png')
# PNG 2x2 vermelho
$pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg=='
[IO.File]::WriteAllBytes($script:png, [Convert]::FromBase64String($pngB64))

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$log = @()
$log += "UserName=$($word.UserName) Initials=$($word.UserInitials) Version=$($word.Version) Build=$($word.Build)"
$o = $word.Options
$log += "InsertedTextMark=$($o.InsertedTextMark) InsertedTextColor=$($o.InsertedTextColor) DeletedTextMark=$($o.DeletedTextMark) DeletedTextColor=$($o.DeletedTextColor) RevisedPropertiesMark=$($o.RevisedPropertiesMark) RevisedPropertiesColor=$($o.RevisedPropertiesColor) RevisedLinesMark=$($o.RevisedLinesMark) RevisedLinesColor=$($o.RevisedLinesColor) CommentsColor=$($o.CommentsColor) MoveFromTextMark=$($o.MoveFromTextMark) MoveToTextMark=$($o.MoveToTextMark) MoveFromTextColor=$($o.MoveFromTextColor) MoveToTextColor=$($o.MoveToTextColor) InsertedCellColor=$($o.InsertedCellColor) DeletedCellColor=$($o.DeletedCellColor) MergedCellColor=$($o.MergedCellColor) SplitCellColor=$($o.SplitCellColor) RevisionsBalloonPrintOrientation=$($o.RevisionsBalloonPrintOrientation)"

function Run-One([string]$name, $block, [string]$fixture) {
  if ($onlySet.Count -and -not $onlySet.ContainsKey($name)) { return }
  $d = $null
  try {
    if ($fixture) {
      $fp = [string](Join-Path $FixDir $fixture)
      $d = $word.Documents.Open($fp, $false, $false, $false)
    } else {
      $d = $word.Documents.Add()
    }
    $s = $word.Selection
    if ($fixture) { $s.HomeKey(6) | Out-Null }
    $t0 = Get-Date
    & $block
    $out = [string](Join-Path $OutDir ($name + '.docx'))
    $d.SaveAs2($out, 16)
    $script:log += "$name ok local=$($t0.ToString('yyyy-MM-ddTHH:mm:ss')) utc=$($t0.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss')) revs=$($d.Revisions.Count) track=$($d.TrackRevisions)"
  } catch {
    $script:log += "$name ERRO $($_.Exception.Message)"
  } finally {
    if ($d) { try { $d.Close(0) } catch {} }
  }
}

try {
  foreach ($k in $exps.Keys) { Run-One $k $exps[$k] '' }
  if ($FixDir) { foreach ($k in $fixOps.Keys) { Run-One $k $fixOps[$k][1] $fixOps[$k][0] } }
} finally {
  Set-Content -Path ([string](Join-Path $OutDir '_log.txt')) -Value $log -Encoding UTF8
  if ($word.Documents.Count -eq 0) { $word.Quit() }
}

# Controle de alteracoes: texto do balao de formatacao (Revision.FormatDescription)
# do Word para cada mudanca de formatacao controlada. Invisivel, uma sessao.
# Uso (sempre pela trava global):
#   node tools/parallel/word-lock.mjs -- powershell -NoProfile -ExecutionPolicy Bypass
#     -File write/tools/revisions-oracle/format-descriptions.ps1 -Out <arquivo.txt>
# (ASCII puro: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
param([string]$Out)
$ErrorActionPreference = 'Stop'

# s = Selection, d = Document; o texto "Hello world" ja esta la e o controle ligado
$cases = [ordered]@{
  'bold'        = { $s.SetRange(6, 11); $s.Font.Bold = 1 }
  'unbold'      = { $s.SetRange(0, 11); $s.Font.Bold = 1; $d.TrackRevisions = $false; $d.TrackRevisions = $true; $d.Revisions.AcceptAll(); $s.SetRange(6, 11); $s.Font.Bold = 0 }
  'italic'      = { $s.SetRange(6, 11); $s.Font.Italic = 1 }
  'bold-italic' = { $s.SetRange(6, 11); $s.Font.Bold = 1; $s.Font.Italic = 1 }
  'underline'   = { $s.SetRange(6, 11); $s.Font.Underline = 1 }
  'strike'      = { $s.SetRange(6, 11); $s.Font.StrikeThrough = 1 }
  'dstrike'     = { $s.SetRange(6, 11); $s.Font.DoubleStrikeThrough = 1 }
  'super'       = { $s.SetRange(6, 11); $s.Font.Superscript = 1 }
  'sub'         = { $s.SetRange(6, 11); $s.Font.Subscript = 1 }
  'caps'        = { $s.SetRange(6, 11); $s.Font.AllCaps = 1 }
  'smallcaps'   = { $s.SetRange(6, 11); $s.Font.SmallCaps = 1 }
  'size'        = { $s.SetRange(6, 11); $s.Font.Size = 16 }
  'size-half'   = { $s.SetRange(6, 11); $s.Font.Size = 10.5 }
  'font'        = { $s.SetRange(6, 11); $s.Font.Name = 'Arial' }
  'color-red'   = { $s.SetRange(6, 11); $s.Font.Color = 255 }
  'color-hex'   = { $s.SetRange(6, 11); $s.Font.Color = 0x336699 }
  'highlight'   = { $s.SetRange(6, 11); $s.Range.HighlightColorIndex = 7 }
  'spacing'     = { $s.SetRange(6, 11); $s.Font.Spacing = 2 }
  'center'      = { $s.ParagraphFormat.Alignment = 1 }
  'right'       = { $s.ParagraphFormat.Alignment = 2 }
  'justify'     = { $s.ParagraphFormat.Alignment = 3 }
  'left-from-c' = { $s.ParagraphFormat.Alignment = 1; $d.Revisions.AcceptAll(); $s.ParagraphFormat.Alignment = 0 }
  'indent-left' = { $s.ParagraphFormat.LeftIndent = 36 }
  'indent-right'= { $s.ParagraphFormat.RightIndent = 36 }
  'first-line'  = { $s.ParagraphFormat.FirstLineIndent = 35.4 }
  'hanging'     = { $s.ParagraphFormat.LeftIndent = 35.4; $s.ParagraphFormat.FirstLineIndent = -35.4 }
  'space-after' = { $s.ParagraphFormat.SpaceAfter = 24 }
  'space-before'= { $s.ParagraphFormat.SpaceBefore = 12 }
  'line-1.5'    = { $s.ParagraphFormat.LineSpacingRule = 1 }
  'line-double' = { $s.ParagraphFormat.LineSpacingRule = 2 }
  'style-h1'    = { $s.Style = $d.Styles.Item(-2) }
  'bullets'     = { $s.Range.ListFormat.ApplyBulletDefault() }
  'numbers'     = { $s.Range.ListFormat.ApplyNumberDefault() }
  'shading'     = { $s.ParagraphFormat.Shading.BackgroundPatternColor = 0x00FFFF }
  'center-ind'  = { $s.ParagraphFormat.Alignment = 1; $s.ParagraphFormat.LeftIndent = 36 }
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$lines = @()
try {
  foreach ($k in $cases.Keys) {
    $d = $null
    try {
      $d = $word.Documents.Add()
      $s = $word.Selection
      $s.TypeText('Hello world')
      $d.TrackRevisions = $true
      & $cases[$k]
      $n = $d.Revisions.Count
      $parts = @()
      for ($i = 1; $i -le $n; $i++) { $r = $d.Revisions.Item($i); $parts += "$($r.Type)=$($r.FormatDescription)" }
      $lines += "$k|$($parts -join ' || ')"
    } catch {
      $lines += "$k|ERRO $($_.Exception.Message)"
    } finally {
      if ($d) { try { $d.Close(0) } catch {} }
    }
  }
} finally {
  Set-Content -Path $Out -Value $lines -Encoding UTF8
  if ($word.Documents.Count -eq 0) { $word.Quit() }
}

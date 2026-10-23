# Teclado nas LISTAS (Enter, Backspace, Tab/Shift+Tab) com a janela do Word fora da tela
# e as teclas por PostMessage (word-keys.ps1) — o COM TypeParagraph/TypeBackspace nao
# dispara os comportamentos de lista. Mais: botoes de lista por ExecuteMso, mudar o
# formato de um item no meio da lista e lista sobre um titulo. ASCII puro.
. (Join-Path $PSScriptRoot 'word-keys.ps1')

function Num-List($app, $doc, [string[]]$texts) {
  $doc.Content.Text = ($texts -join "`r")
  $lt = $app.ListGalleries.Item(2).ListTemplates.Item(1)
  $doc.Content.ListFormat.ApplyListTemplateWithLevel($lt, $false, 0, 2) | Out-Null
}
function Bul-List($app, $doc, [string[]]$texts) {
  $doc.Content.Text = ($texts -join "`r")
  $lt = $app.ListGalleries.Item(1).ListTemplates.Item(1)
  $doc.Content.ListFormat.ApplyListTemplateWithLevel($lt, $false, 0, 2) | Out-Null
}
function Caret-At($doc, [int]$para, [int]$offset) {
  $p = $doc.Paragraphs.Item($para).Range
  $doc.Range($p.Start + $offset, $p.Start + $offset).Select()
}
function Info($doc) {
  $out = @()
  for ($k = 1; $k -le $doc.Paragraphs.Count; $k++) {
    $p = $doc.Paragraphs.Item($k)
    $out += [ordered]@{ text = $p.Range.Text.TrimEnd("`r"); type = $p.Range.ListFormat.ListType; lvl = $p.Range.ListFormat.ListLevelNumber; str = $p.Range.ListFormat.ListString; style = $p.Style.NameLocal; left = $p.LeftIndent; first = $p.FirstLineIndent }
  }
  return $out
}
function With-Keys($app, $doc, [scriptblock]$keys) {
  $fg0 = [UwWin]::GetForegroundWindow()
  $h = Word-Offscreen $app
  try { & $keys $h } finally { Word-Hide $app }
  $fg1 = [UwWin]::GetForegroundWindow()
  return ($fg0 -eq $fg1)
}

$EXPERIMENTS = @(
  @{ Name = 'k-enter-end'; Run = { param($app, $doc) Num-List $app $doc @('Item um', 'Item dois'); Caret-At $doc 2 9; $ok = With-Keys $app $doc { param($h) Word-Enter $h }; [ordered]@{ focusKept = $ok; paras = (Info $doc) } } },
  @{ Name = 'k-enter-empty'; Run = { param($app, $doc) Num-List $app $doc @('Item um', 'Item dois'); Caret-At $doc 2 9; $ok = With-Keys $app $doc { param($h) Word-Enter $h; Word-Enter $h }; [ordered]@{ focusKept = $ok; paras = (Info $doc) } } },
  @{ Name = 'k-enter-empty-l2'; Run = { param($app, $doc) Num-List $app $doc @('Item um', 'Item dois'); $doc.Paragraphs.Item(2).Range.ListFormat.ListLevelNumber = 2; Caret-At $doc 2 9; $ok = With-Keys $app $doc { param($h) Word-Enter $h; Word-Enter $h }; [ordered]@{ focusKept = $ok; paras = (Info $doc) } } },
  @{ Name = 'k-enter-empty-bullet'; Run = { param($app, $doc) Bul-List $app $doc @('Item um', 'Item dois'); Caret-At $doc 2 9; $ok = With-Keys $app $doc { param($h) Word-Enter $h; Word-Enter $h }; [ordered]@{ focusKept = $ok; paras = (Info $doc) } } },
  @{ Name = 'k-back-start'; Run = { param($app, $doc) Num-List $app $doc @('Item um', 'Item dois', 'Item tres'); Caret-At $doc 2 0; $ok = With-Keys $app $doc { param($h) Word-Backspace $h }; [ordered]@{ focusKept = $ok; paras = (Info $doc) } } },
  @{ Name = 'k-back-start-2x'; Run = { param($app, $doc) Num-List $app $doc @('Item um', 'Item dois', 'Item tres'); Caret-At $doc 2 0; $ok = With-Keys $app $doc { param($h) Word-Backspace $h; Word-Backspace $h }; [ordered]@{ focusKept = $ok; paras = (Info $doc) } } },
  @{ Name = 'k-back-start-3x'; Run = { param($app, $doc) Num-List $app $doc @('Item um', 'Item dois', 'Item tres'); Caret-At $doc 2 0; $ok = With-Keys $app $doc { param($h) Word-Backspace $h; Word-Backspace $h; Word-Backspace $h }; [ordered]@{ focusKept = $ok; paras = (Info $doc) } } },
  @{ Name = 'k-tab-start'; Run = { param($app, $doc) Num-List $app $doc @('Item um', 'Item dois', 'Item tres'); Caret-At $doc 2 0; $ok = With-Keys $app $doc { param($h) Word-Tab $h }; [ordered]@{ focusKept = $ok; paras = (Info $doc) } } },
  @{ Name = 'k-tab-first-item'; Run = { param($app, $doc) Num-List $app $doc @('Item um', 'Item dois'); Caret-At $doc 1 0; $ok = With-Keys $app $doc { param($h) Word-Tab $h }; [ordered]@{ focusKept = $ok; paras = (Info $doc) } } },
  @{ Name = 'k-tab-middle'; Run = { param($app, $doc) Num-List $app $doc @('Item um', 'Item dois'); Caret-At $doc 2 4; $ok = With-Keys $app $doc { param($h) Word-Tab $h }; [ordered]@{ focusKept = $ok; paras = (Info $doc) } } },
  @{ Name = 'k-shifttab'; Run = { param($app, $doc) Num-List $app $doc @('Item um', 'Item dois'); $doc.Paragraphs.Item(2).Range.ListFormat.ListLevelNumber = 3; Caret-At $doc 2 0
      $fg0 = [UwWin]::GetForegroundWindow(); $h = Word-Offscreen $app
      try {
        $sc = [UwWin]::MapVirtualKey(0x10, 0)
        [UwWin]::PostMessage($h, 0x0100, [IntPtr]0x10, [IntPtr](1 -bor ($sc -shl 16))) | Out-Null
        Word-Key $h 0x09 0
        [UwWin]::PostMessage($h, 0x0101, [IntPtr]0x10, [IntPtr]((1 -bor ($sc -shl 16)) -bor 0xC0000000)) | Out-Null
        Start-Sleep -Milliseconds 250
      } finally { Word-Hide $app }
      [ordered]@{ focusKept = ($fg0 -eq [UwWin]::GetForegroundWindow()); paras = (Info $doc) } } },
  # botoes por ExecuteMso (a galeria nao executa; os botoes de alternar talvez)
  @{ Name = 'mso-bullets'; Run = { param($app, $doc) $doc.Content.Text = "Um`rDois`rTres"; $doc.Range($doc.Paragraphs.Item(1).Range.Start, $doc.Paragraphs.Item(2).Range.End).Select(); $e = ''; try { $app.CommandBars.ExecuteMso('Bullets') } catch { $e = [string]$_.Exception.Message }; [ordered]@{ err = $e; paras = (Info $doc) } } },
  @{ Name = 'mso-bullets-off'; Run = { param($app, $doc) $doc.Content.Text = "Um`rDois`rTres"; $doc.Range($doc.Paragraphs.Item(1).Range.Start, $doc.Paragraphs.Item(2).Range.End).Select(); $e = ''; try { $app.CommandBars.ExecuteMso('Bullets'); $app.CommandBars.ExecuteMso('Bullets') } catch { $e = [string]$_.Exception.Message }; [ordered]@{ err = $e; paras = (Info $doc) } } },
  @{ Name = 'mso-numbering'; Run = { param($app, $doc) $doc.Content.Text = "Um`rDois`rTres"; $doc.Range($doc.Paragraphs.Item(1).Range.Start, $doc.Paragraphs.Item(2).Range.End).Select(); $e = ''; try { $app.CommandBars.ExecuteMso('Numbering') } catch { $e = [string]$_.Exception.Message }; [ordered]@{ err = $e; paras = (Info $doc) } } },
  @{ Name = 'mso-indent-list'; Run = { param($app, $doc) Num-List $app $doc @('Item um', 'Item dois', 'Item tres'); $doc.Paragraphs.Item(2).Range.Select(); $e = ''; try { $app.CommandBars.ExecuteMso('IndentIncreaseWord') } catch { $e = [string]$_.Exception.Message }; [ordered]@{ err = $e; paras = (Info $doc) } } },
  @{ Name = 'mso-indent-list-first'; Run = { param($app, $doc) Num-List $app $doc @('Item um', 'Item dois', 'Item tres'); $doc.Paragraphs.Item(1).Range.Select(); $e = ''; try { $app.CommandBars.ExecuteMso('IndentIncreaseWord') } catch { $e = [string]$_.Exception.Message }; [ordered]@{ err = $e; paras = (Info $doc) } } },
  # formato da biblioteca aplicado a UM item no meio da lista: so ele ou a lista toda?
  @{ Name = 'format-one-item'; Run = { param($app, $doc) Num-List $app $doc @('Um', 'Dois', 'Tres', 'Quatro'); $doc.Paragraphs.Item(2).Range.Select(); $lt = $app.ListGalleries.Item(2).ListTemplates.Item(5); $app.Selection.Range.ListFormat.ApplyListTemplateWithLevel($lt, $true, 0, 2) | Out-Null; [ordered]@{ paras = (Info $doc) } } },
  @{ Name = 'format-one-item-nocontinue'; Run = { param($app, $doc) Num-List $app $doc @('Um', 'Dois', 'Tres', 'Quatro'); $doc.Paragraphs.Item(2).Range.Select(); $lt = $app.ListGalleries.Item(2).ListTemplates.Item(5); $app.Selection.Range.ListFormat.ApplyListTemplateWithLevel($lt, $false, 0, 2) | Out-Null; [ordered]@{ paras = (Info $doc) } } },
  # lista sobre um titulo (o estilo fica?)
  @{ Name = 'list-on-heading'; Run = { param($app, $doc) $doc.Content.Text = "Titulo um`rTexto"; $doc.Paragraphs.Item(1).Style = -2; $lt = $app.ListGalleries.Item(2).ListTemplates.Item(1); $doc.Paragraphs.Item(1).Range.ListFormat.ApplyListTemplateWithLevel($lt, $false, 0, 2) | Out-Null; [ordered]@{ paras = (Info $doc) } } },
  # duas listas separadas por texto: a segunda continua ou recomeca?
  @{ Name = 'two-lists-gap'; Run = { param($app, $doc) $doc.Content.Text = "Um`rDois`rTexto`rTres`rQuatro"; $lt = $app.ListGalleries.Item(2).ListTemplates.Item(1); $doc.Range($doc.Paragraphs.Item(1).Range.Start, $doc.Paragraphs.Item(2).Range.End).ListFormat.ApplyListTemplateWithLevel($lt, $false, 0, 2) | Out-Null; $doc.Range($doc.Paragraphs.Item(4).Range.Start, $doc.Paragraphs.Item(5).Range.End).ListFormat.ApplyListTemplateWithLevel($lt, $true, 0, 2) | Out-Null; [ordered]@{ paras = (Info $doc) } } }
)

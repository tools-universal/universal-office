# Oraculo de estilos (B): criar a partir da selecao, styleId, modificar,
# renomear, galeria, excluir, limpezas do Inspetor, vinculado parcial.
# ASCII puro (acentos via [char]). Rodar pela trava (word-lock.mjs).
param([string]$Out)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$Out = [string](Resolve-Path $Out).Path
$a = [char]0x00E1; $c = [char]0x00E7; $at = [char]0x00E3; $i_ = [char]0x00ED; $e_ = [char]0x00EA
$log = [ordered]@{}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

function AddP($doc, [string]$t) {
  $n = $doc.Paragraphs.Count
  $last = $doc.Paragraphs.Item($n)
  if ($last.Range.Text.Length -gt 1) { $doc.Content.InsertParagraphAfter(); $n++ }
  $p = $doc.Paragraphs.Item($n)
  $p.Style = -1
  $p.Range.ParagraphFormat.Reset()
  $p.Range.Font.Reset()
  $p.Range.InsertBefore($t)
  return $doc.Paragraphs.Item($n)
}
function Sub($doc, $p, [int]$from, [int]$to) { return $doc.Range($p.Range.Start + $from, $p.Range.Start + $to) }
function SaveDoc($doc, [string]$name) { $doc.SaveAs2([string]($Out + '\' + $name), 16); $doc.Close($false) }
function StyleOf($p) { return [string]$p.Style.NameLocal }
function Direct($p) {
  # formatacao direta do 1o paragrafo (para conferir o que sobra)
  $r = $p.Range
  return [ordered]@{ style = StyleOf $p; font = [string]$r.Font.Name; size = [double]$r.Font.Size; bold = [int]$r.Font.Bold; color = [int]$r.Font.Color; align = [int]$r.ParagraphFormat.Alignment; after = [double]$r.ParagraphFormat.SpaceAfter }
}

try {
  # ---------- B1: criar a partir da selecao (vinculado / paragrafo / caractere) ----------
  foreach ($t in @(6, 1)) {
    $doc = $word.Documents.Add()
    $p = AddP $doc 'Texto base para o estilo novo'
    $r = $p.Range
    $r.Font.Name = 'Georgia'; $r.Font.Size = 14; $r.Font.Bold = $true; $r.Font.Color = 255
    $r.ParagraphFormat.Alignment = 1; $r.ParagraphFormat.SpaceAfter = 12; $r.ParagraphFormat.LeftIndent = 36
    $q = AddP $doc 'Segundo paragrafo sem formatacao'
    $p = $doc.Paragraphs.Item(1)
    $p.Range.Select()
    $st = $doc.Styles.Add('Meu Estilo', $t)
    $log["b1-$t-after-add"] = Direct $doc.Paragraphs.Item(1)
    $log["b1-$t-style"] = [ordered]@{ base = [string]$st.BaseStyle.NameLocal; next = [string]$st.NextParagraphStyle.NameLocal; quick = [bool]$st.QuickStyle; prio = [int]$st.Priority; linked = [bool]$st.Linked; font = [string]$st.Font.Name; size = [double]$st.Font.Size }
    $word.Selection.Style = 'Meu Estilo'
    $log["b1-$t-after-apply"] = Direct $doc.Paragraphs.Item(1)
    SaveDoc $doc "b1-$t.docx"
  }
  # caractere a partir de selecao parcial
  $doc = $word.Documents.Add()
  $p = AddP $doc 'um dois tres'
  $w = Sub $doc $p 3 7
  $w.Font.Italic = $true; $w.Font.Color = 16711680
  $w.Select()
  $st = $doc.Styles.Add('Meu Caractere', 2)
  $word.Selection.Style = 'Meu Caractere'
  SaveDoc $doc 'b1-2.docx'

  # ---------- B2: geracao de styleId ----------
  $doc = $word.Documents.Add()
  $names = @('Meu Estilo', 'Meu-Estilo', 'MeuEstilo', ('T' + $i_ + 'tulo Especial'), ('A' + $c + $at + 'o & Rea' + $c + $at + 'o'), '123 Inicio', 'Normal 2', 'Estilo  duplo', 'meu estilo x', ('Ref' + $e_ + 'rencia'))
  $k = 0
  foreach ($n in $names) {
    try {
      $st = $doc.Styles.Add($n, 1)
      $p = AddP $doc ('S' + $k)
      $p.Style = $n
    } catch { $log["b2-fail-$k"] = $_.Exception.Message }
    $k++
  }
  SaveDoc $doc 'b2.docx'

  # ---------- B3: modificar ----------
  $doc = $word.Documents.Add()
  $p = AddP $doc 'Cabecalho um'; $p.Style = -2
  $p = AddP $doc 'Texto normal'
  $p = AddP $doc 'Outro titulo'; $p.Style = -3
  $p = AddP $doc 'Citacao aqui'; $p.Style = -181
  $st = $doc.Styles.Add('Custom Mod', 1)
  $p = AddP $doc 'Paragrafo custom'; $p.Style = 'Custom Mod'
  $h1 = $doc.Styles.Item(-2)
  $h1.Font.Name = 'Georgia'; $h1.Font.Size = 18; $h1.Font.Bold = $true; $h1.Font.Color = 255
  $h1.ParagraphFormat.Alignment = 1; $h1.ParagraphFormat.SpaceBefore = 6; $h1.ParagraphFormat.SpaceAfter = 12
  $h1.ParagraphFormat.LeftIndent = 36; $h1.ParagraphFormat.LineSpacingRule = 1
  $h1.NextParagraphStyle = $doc.Styles.Item(-181)
  $nm = $doc.Styles.Item(-1)
  $nm.Font.Size = 12; $nm.ParagraphFormat.SpaceAfter = 6
  $cm = $doc.Styles.Item('Custom Mod')
  $cm.BaseStyle = $doc.Styles.Item(-3)
  $cm.AutomaticallyUpdate = $true
  $cm.Font.Italic = $true
  $doc.Styles.Item(-181).QuickStyle = $false
  $doc.Styles.Item(-35).QuickStyle = $true
  $cm.NameLocal = 'Custom Renomeado'
  try { $doc.Styles.Item(-3).NameLocal = 'Meu Titulo 2' } catch { $log['b3-rename-builtin'] = $_.Exception.Message }
  SaveDoc $doc 'b3.docx'

  # ---------- B4: excluir ----------
  $doc = $word.Documents.Add()
  $sp = $doc.Styles.Add('Apagar Para', 1); $sp.BaseStyle = $doc.Styles.Item(-3)
  $sl = $doc.Styles.Add('Apagar Link', 6); $sl.Font.Bold = $true
  $sc = $doc.Styles.Add('Apagar Char', 2); $sc.Font.Underline = 1
  $p = AddP $doc 'Para que sera apagado'; $p.Style = 'Apagar Para'
  $p = AddP $doc 'Link que sera apagado'; $p.Style = 'Apagar Link'
  $p = AddP $doc 'Um run char apagado'; (Sub $doc $p 3 6).Style = 'Apagar Char'
  $p = AddP $doc 'Titulo 2 apagado'; $p.Style = -3
  $sp.Delete(); $sl.Delete(); $sc.Delete()
  try { $doc.Styles.Item(-3).Delete() } catch { $log['b4-delete-builtin'] = $_.Exception.Message }
  $log['b4-after'] = @(1..4 | ForEach-Object { StyleOf $doc.Paragraphs.Item($_) })
  SaveDoc $doc 'b4.docx'

  # ---------- B5: limpezas do Inspetor ----------
  $doc = $word.Documents.Add()
  $ops = @('none', 'ClearParagraphStyle', 'ClearParagraphDirectFormatting', 'ClearParagraphAllFormatting', 'ClearCharacterStyle', 'ClearCharacterDirectFormatting', 'ClearCharacterAllFormatting', 'ClearFormatting', 'caret:ClearCharacterStyle', 'caret:ClearCharacterDirectFormatting', 'caret:ClearParagraphDirectFormatting', 'apply:Normal', 'apply:DefaultParagraphFont')
  $k = 0
  foreach ($op in $ops) {
    $p = AddP $doc ('Alfa beta gama delta ' + $k)
    $p.Style = -2
    $p.Range.ParagraphFormat.Alignment = 1
    $p.Range.ParagraphFormat.SpaceAfter = 24
    $p.Range.Font.Color = 255
    (Sub $doc $p 5 9).Font.Bold = $true
    (Sub $doc $p 10 14).Style = -89
    $k++
  }
  $k = 0
  foreach ($op in $ops) {
    $p = $doc.Paragraphs.Item($k + 1)
    if ($op -like 'caret:*') {
      $doc.Range($p.Range.Start + 11, $p.Range.Start + 11).Select()
      $m = $op.Substring(6)
      $word.Selection.$m()
    } elseif ($op -eq 'apply:Normal') {
      $p.Range.Select(); $word.Selection.Style = -1
    } elseif ($op -eq 'apply:DefaultParagraphFont') {
      $p.Range.Select(); $word.Selection.Style = -66
    } elseif ($op -ne 'none') {
      $p.Range.Select()
      $word.Selection.$op()
    }
    $k++
  }
  $log['b5-ops'] = $ops
  SaveDoc $doc 'b5.docx'

  # ---------- B6: aplicar pela Selecao (vinculado parcial, char sobre direto) ----------
  $doc = $word.Documents.Add()
  $p = AddP $doc 'um dois tres'
  (Sub $doc $p 3 7).Select(); $word.Selection.Style = -181
  $p = AddP $doc 'quatro cinco seis'
  (Sub $doc $p 7 12).Select(); $word.Selection.Style = -2
  $p = AddP $doc 'paragrafo inteiro sem marca'
  (Sub $doc $p 0 27).Select(); $word.Selection.Style = -2
  $p = AddP $doc 'paragrafo com marca'
  $p.Range.Select(); $word.Selection.Style = -2
  $p = AddP $doc 'caret no meio'
  (Sub $doc $p 3 3).Select(); $word.Selection.Style = -181
  $p = AddP $doc 'char sobre direto'
  $w = Sub $doc $p 5 10
  $w.Font.Bold = $true; $w.Font.Color = 255; $w.Font.Italic = $true
  $w.Select(); $word.Selection.Style = -89
  $p = AddP $doc 'caret char estilo'
  (Sub $doc $p 7 7).Select(); $word.Selection.Style = -88
  $p = AddP $doc 'para so parcial'
  (Sub $doc $p 5 7).Select(); $word.Selection.Style = -35
  SaveDoc $doc 'b6.docx'
} catch {
  Write-Host "ERRO: $($_.Exception.Message) @ $($_.InvocationInfo.ScriptLineNumber)"
} finally {
  $json = $log | ConvertTo-Json -Depth 5
  [IO.File]::WriteAllText([string]($Out + '\probe-b.json'), $json, [Text.Encoding]::UTF8)
  if ($word.Documents.Count -eq 0) { $word.Quit() }
}
Write-Host 'fim'

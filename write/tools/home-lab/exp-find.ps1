# Experimentos de LOCALIZAR E SUBSTITUIR (grupo Edicao): o que o Find do Word casa com cada
# opcao (maiusculas, palavras inteiras, prefixo/sufixo, ignorar pontuacao/espacos, curingas,
# caracteres especiais, formatacao, estilo, "soa como", todas as formas) e o que a
# substituicao grava (caixa adaptada, formatacao do texto novo, ^p/^t/^&/\1, realce).
# Carregado por home-oracle.ps1. ASCII puro (os acentos vao por [char]).

$A_TIL = [string][char]0x00E3   # a com til
$C_CED = [string][char]0x00E7   # c cedilha

# todas as ocorrencias (inicio, fim, texto) de uma busca no documento inteiro
function Find-All($doc, [hashtable]$o) {
  $r = $doc.Content
  $f = $r.Find
  $f.ClearFormatting()
  $f.Text = [string]$o.text
  $f.Forward = $true
  $f.Wrap = 0
  $f.Format = [bool]$o.format
  $f.MatchCase = [bool]$o.case
  $f.MatchWholeWord = [bool]$o.whole
  $f.MatchWildcards = [bool]$o.wild
  $f.MatchSoundsLike = [bool]$o.sounds
  $f.MatchAllWordForms = [bool]$o.forms
  $f.MatchPrefix = [bool]$o.prefix
  $f.MatchSuffix = [bool]$o.suffix
  $f.IgnorePunct = [bool]$o.punct
  $f.IgnoreSpace = [bool]$o.space
  if ($o.bold) { $f.Font.Bold = $true }
  if ($o.style) { $f.Style = $doc.Styles.Item($o.style) }
  if ($o.highlight) { $f.Highlight = $true }
  $hits = @()
  $n = 0
  while ($f.Execute() -and $n -lt 80) {
    $hits += ,@($r.Start, $r.End, $r.Text)
    $n++
    if ($r.End -le $r.Start) { $r.SetRange($r.End + 1, $doc.Content.End) } else { $r.Collapse(0) }
  }
  return ,$hits
}

# substituir tudo; devolve o texto do documento e cada paragrafo
function Replace-All($doc, [hashtable]$o) {
  $r = $doc.Content
  $f = $r.Find
  $f.ClearFormatting()
  $f.Replacement.ClearFormatting()
  $f.Text = [string]$o.text
  $f.Replacement.Text = [string]$o.repl
  $f.Forward = $true
  $f.Wrap = 0
  $f.Format = [bool]$o.format
  $f.MatchCase = [bool]$o.case
  $f.MatchWholeWord = [bool]$o.whole
  $f.MatchWildcards = [bool]$o.wild
  if ($o.bold) { $f.Font.Bold = $true }
  if ($o.rItalic) { $f.Replacement.Font.Italic = $true }
  if ($o.rHighlight) { $f.Replacement.Highlight = $true }
  if ($o.rStyle) { $f.Replacement.Style = $doc.Styles.Item($o.rStyle) }
  $ok = $f.Execute([string]$o.text, [bool]$o.case, [bool]$o.whole, [bool]$o.wild, $false, $false, $true, 0, [bool]$o.format, [string]$o.repl, 2)
  $paras = @()
  for ($k = 1; $k -le $doc.Paragraphs.Count; $k++) {
    $p = $doc.Paragraphs.Item($k)
    $paras += [ordered]@{ text = $p.Range.Text; align = $p.Alignment; style = $p.Style.NameLocal }
  }
  return [ordered]@{ ok = $ok; text = $doc.Content.Text; paras = $paras }
}

$WILD_TEXT = "The quick brown fox jumps over 12 lazy dogs; 2024-10-23 (test) aaa bb ccc. Tot tat tooth."
$WILD = @('?o?', 'q*k', '<b*n>', '[0-9]@', '[0-9]{2,}', '[!a-z ]', 'a{2}', '<(t*)>', '\(*\)', 'o*o', '[A-Z]', 'f[aeiou]x',
  '<t?t>', 't*t', '[a-c]{2,3}', 'o@', '<[0-9]{4}', '[0-9]{2}>', '?', '<*>', 'z?', '[!0-9]{3}')

$EXPERIMENTS = @(
  @{ Name = 'f-case'; Run = { param($app, $doc)
      $out = [ordered]@{}
      $k = 0
      foreach ($rep in @('bye', 'Bye', 'BYE', 'bYe')) {
        $k++
        $doc.Content.Text = "HELLO hello Hello hELLO HeLLo"
        $out[('r' + $k + '-' + $rep)] = (Replace-All $doc @{ text = 'hello'; repl = $rep }).text
        $doc.Content.Text = "HELLO hello Hello hELLO HeLLo"
        $out[('c' + $k + '-' + $rep)] = (Replace-All $doc @{ text = 'hello'; repl = $rep; case = $true }).text
        $doc.Content.Text = "HELLO hello Hello"
        $out[('f' + $k + '-' + $rep)] = (Replace-All $doc @{ text = 'HELLO'; repl = $rep }).text
      }
      $doc.Content.Text = "HELLO WORLD"
      $out['two-words'] = (Replace-All $doc @{ text = 'hello world'; repl = 'good bye' }).text
      $doc.Content.Text = "Hello world"
      $out['title-two'] = (Replace-All $doc @{ text = 'hello world'; repl = 'good bye' }).text
      $doc.Content.Text = "H"
      $out['single-upper'] = (Replace-All $doc @{ text = 'h'; repl = 'xy' }).text
      $doc.Content.Text = "HELLO"
      $out['upper-num'] = (Replace-All $doc @{ text = 'hello'; repl = '2x' }).text
      return $out } }
  @{ Name = 'f-whole'; Run = { param($app, $doc)
      $doc.Content.Text = "cat cat's cats bobcat cat-dog (cat) cat_x 3cat cat3 CAT p" + $A_TIL + "o p" + $A_TIL + "ozinho"
      return [ordered]@{
        whole = (Find-All $doc @{ text = 'cat'; whole = $true })
        plain = (Find-All $doc @{ text = 'cat' })
        case = (Find-All $doc @{ text = 'cat'; case = $true })
        pao = (Find-All $doc @{ text = ('p' + $A_TIL + 'o'); whole = $true })
        prefix = (Find-All $doc @{ text = 'cat'; prefix = $true })
        suffix = (Find-All $doc @{ text = 'cat'; suffix = $true })
        both = (Find-All $doc @{ text = 'cat'; prefix = $true; suffix = $true })
        twoWords = (Find-All $doc @{ text = 'cat cat'; whole = $true }) } } }
  @{ Name = 'f-ignore'; Run = { param($app, $doc)
      $doc.Content.Text = "a,b a.b ab a b a-b a  b a, b a`tb a;b"
      return [ordered]@{
        punct = (Find-All $doc @{ text = 'ab'; punct = $true })
        space = (Find-All $doc @{ text = 'ab'; space = $true })
        both = (Find-All $doc @{ text = 'ab'; punct = $true; space = $true })
        punctInNeedle = (Find-All $doc @{ text = 'a.b'; punct = $true })
        spaceInNeedle = (Find-All $doc @{ text = 'a b'; space = $true }) } } }
  @{ Name = 'f-accent'; Run = { param($app, $doc)
      $doc.Content.Text = "a" + $C_CED + $A_TIL + "o acao A" + $C_CED + [string][char]0x00C3 + "O"
      return [ordered]@{
        plain = (Find-All $doc @{ text = ('a' + $C_CED + $A_TIL + 'o') })
        noAccent = (Find-All $doc @{ text = 'acao' })
        case = (Find-All $doc @{ text = ('a' + $C_CED + $A_TIL + 'o'); case = $true }) } } }
  @{ Name = 'f-wild'; Run = { param($app, $doc)
      $doc.Content.Text = $WILD_TEXT
      $out = [ordered]@{}
      foreach ($w in $WILD) { try { $out[$w] = (Find-All $doc @{ text = $w; wild = $true }) } catch { $out[$w] = 'ERRO ' + $_.Exception.Message } }
      return $out } }
  @{ Name = 'f-wild2'; Run = { param($app, $doc)
      $doc.Content.Text = "2024 7 12345 aab abc ab`rum dois`rtres"
      $out = [ordered]@{}
      foreach ($w in @('[0-9]{2;}', '[0-9]{2;3}', '[a-c]{2;3}', 'a{1;}b', 'um*tres', 'dois?tres', 'dois^13tres', 'b^13', '[a-c]@', '(a)@b', '<*>', 'a*b')) {
        try { $out[$w] = (Find-All $doc @{ text = $w; wild = $true }) } catch { $out[$w] = 'ERRO ' + $_.Exception.Message }
      }
      return $out } }
  @{ Name = 'f-wildrepl'; Run = { param($app, $doc)
      $out = [ordered]@{}
      $doc.Content.Text = "John Smith; Mary Jones"
      $out['swap'] = (Replace-All $doc @{ text = '(<[A-Z][a-z]@>) (<[A-Z][a-z]@>)'; repl = '\2, \1'; wild = $true }).text
      $doc.Content.Text = "the fox and the dog"
      $out['amp'] = (Replace-All $doc @{ text = 'fox'; repl = '[^&]' }).text
      $doc.Content.Text = "the fox and the dog"
      $out['ampWild'] = (Replace-All $doc @{ text = 'f?x'; repl = '<^&>'; wild = $true }).text
      $doc.Content.Text = "2024-10-23"
      $out['date'] = (Replace-All $doc @{ text = '([0-9]{4})-([0-9]{2})-([0-9]{2})'; repl = '\3/\2/\1'; wild = $true }).text
      $doc.Content.Text = "aaa"
      $out['lazy'] = (Replace-All $doc @{ text = 'a*'; repl = 'X'; wild = $true }).text
      $doc.Content.Text = "x1 x2"
      $out['caret'] = (Replace-All $doc @{ text = 'x'; repl = '^^' }).text
      return $out } }
  @{ Name = 'f-para'; Run = { param($app, $doc)
      $doc.Content.Text = "um`rdois`rtres"
      $doc.Paragraphs.Item(1).Alignment = 1
      $doc.Paragraphs.Item(2).Alignment = 2
      $doc.Paragraphs.Item(2).Range.Font.Bold = $true
      return (Replace-All $doc @{ text = 'um^pdois'; repl = 'X' }) } }
  @{ Name = 'f-para2'; Run = { param($app, $doc)
      $doc.Content.Text = "um`rdois`rtres"
      $doc.Paragraphs.Item(1).Alignment = 1
      $doc.Paragraphs.Item(2).Alignment = 2
      return (Replace-All $doc @{ text = '^p'; repl = ' / ' }) } }
  @{ Name = 'f-newpara'; Run = { param($app, $doc)
      $doc.Content.Text = "a;b;c"
      $doc.Paragraphs.Item(1).Alignment = 1
      $res = Replace-All $doc @{ text = ';'; repl = '^p' }
      $doc.Content.InsertParagraphAfter()
      return $res } }
  @{ Name = 'f-specials'; Run = { param($app, $doc)
      $doc.Content.Text = "a`tb"
      $r = $doc.Content; $r.Collapse(0); $r.Move(1, -1) | Out-Null
      $r.InsertAfter(" c" + [char]11 + "d" + [char]160 + "e" + [char]31 + "f" + [char]30 + "g " + [char]0x2014 + " h " + [char]0x2013 + " 7 x")
      $r2 = $doc.Content; $r2.Collapse(0); $r2.Move(1, -1) | Out-Null
      $doc.Fields.Add($r2, -1, 'DATE', $false) | Out-Null
      $r3 = $doc.Content; $r3.Collapse(0); $r3.Move(1, -1) | Out-Null
      $doc.Footnotes.Add($r3) | Out-Null
      $out = [ordered]@{ text = $doc.Content.Text }
      foreach ($s in @('^t', '^l', '^s', '^-', '^~', '^+', '^=', '^d', '^f', '^w', '^?', '^#', '^$', '^p', '^m', '^n', '^b', '^19', '^0160')) {
        try { $out[$s] = (Find-All $doc @{ text = $s }) } catch { $out[$s] = 'ERRO ' + $_.Exception.Message }
      }
      return $out } }
  @{ Name = 'f-specials-repl'; Run = { param($app, $doc)
      $doc.Content.Text = "a1b2c3d4e"
      $out = [ordered]@{}
      $null = Replace-All $doc @{ text = '1'; repl = '^t' }
      $null = Replace-All $doc @{ text = '2'; repl = '^l' }
      $null = Replace-All $doc @{ text = '3'; repl = '^s' }
      $null = Replace-All $doc @{ text = '4'; repl = '^m' }
      $out['text'] = $doc.Content.Text
      return $out } }
  @{ Name = 'f-format'; Run = { param($app, $doc)
      $doc.Content.Text = "um dois tres quatro"
      $doc.Range(3, 7).Font.Bold = $true
      $doc.Range(13, 19).Font.Bold = $true
      return [ordered]@{
        boldAny = (Find-All $doc @{ text = ''; format = $true; bold = $true })
        boldText = (Find-All $doc @{ text = 'o'; format = $true; bold = $true }) } } }
  @{ Name = 'f-replfmt'; Run = { param($app, $doc)
      # o texto novo herda a formatacao do 1o caractere encontrado
      $doc.Content.Text = "abc def ghi"
      $doc.Range(2, 3).Font.Bold = $true
      $doc.Range(4, 5).Font.Italic = $true
      return (Replace-All $doc @{ text = 'c d'; repl = 'XYZ' }) } }
  @{ Name = 'f-replfmt2'; Run = { param($app, $doc)
      # substituir formatacao: negrito -> italico (texto vazio nos dois)
      $doc.Content.Text = "um dois tres"
      $doc.Range(3, 7).Font.Bold = $true
      return (Replace-All $doc @{ text = ''; repl = ''; format = $true; bold = $true; rItalic = $true }) } }
  @{ Name = 'f-highlight'; Run = { param($app, $doc)
      $doc.Content.Text = "um dois tres dois"
      $out = Replace-All $doc @{ text = 'dois'; repl = '^&'; format = $true; rHighlight = $true }
      $out['defaultHighlight'] = $app.Options.DefaultHighlightColorIndex
      return $out } }
  @{ Name = 'f-style'; Run = { param($app, $doc)
      $doc.Content.Text = "um`rdois`rtres"
      $doc.Paragraphs.Item(2).Style = -2
      $res = [ordered]@{ hits = (Find-All $doc @{ text = ''; format = $true; style = -2 }) }
      $doc.Content.Text = "um`rdois`rtres"
      $res['repl'] = (Replace-All $doc @{ text = 'tres'; repl = 'TRES'; format = $true; rStyle = -3 })
      return $res } }
  @{ Name = 'f-sounds'; Run = { param($app, $doc)
      $doc.Content.Text = "Smith Smyth Smithe Schmidt Smit Smote Sand night knight nite"
      $doc.Content.LanguageID = 1033
      return [ordered]@{
        smith = (Find-All $doc @{ text = 'Smith'; sounds = $true })
        night = (Find-All $doc @{ text = 'night'; sounds = $true }) } } }
  @{ Name = 'f-forms'; Run = { param($app, $doc)
      $doc.Content.Text = "go went gone going goes sit sat sitting sits mouse mice run ran running runs good better best"
      $doc.Content.LanguageID = 1033
      $out = [ordered]@{}
      foreach ($w in @('go', 'sat', 'mouse', 'run', 'good', 'sits')) { $out[$w] = (Find-All $doc @{ text = $w; forms = $true }) }
      return $out } }
  @{ Name = 'f-forms-pt'; Run = { param($app, $doc)
      $doc.Content.Text = "fazer fez feito fazendo faz casa casas"
      $doc.Content.LanguageID = 1046
      $out = [ordered]@{}
      foreach ($w in @('fazer', 'casa')) { try { $out[$w] = (Find-All $doc @{ text = $w; forms = $true }) } catch { $out[$w] = 'ERRO ' + $_.Exception.Message } }
      return $out } }
)

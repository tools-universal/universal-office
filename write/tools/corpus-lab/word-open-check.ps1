# Abre no Word (COM, invisivel) os .docx editados pelo lossless-check e os
# originais correspondentes; falha = o Word nao abre (conteudo ilegivel) ou o
# texto digitado nao aparece. Saida: uma linha TSV por documento.
#
#   powershell -NoProfile -WindowStyle Hidden -File word-open-check.ps1 -Dir <pasta do --out> [-Limit N] [-Skip N] [-Sections] [-Tables] [-Notes] [-Nav]
# -Sections: saida do lossless-check --sections (uma secao a mais, dois paragrafos a mais).
# -Tables: saida do lossless-check --tables (linha nova na 1a tabela: o numero de
# paragrafos muda; confere tabelas, o campo de formula, as bordas de pagina e o estilo de tabela).
# -Notes: saida do lossless-check --notes (uma nota de rodape e uma de fim a mais, com o texto novo).
# -Skip: pula as N primeiras linhas do manifesto (rodar em blocos e soltar a trava do Word entre eles).
# -Nav: saida do lossless-check --nav (recuo esquerdo 1134/deslocamento 567, tabulacoes
# centralizada 2835 e decimal 5669, tabulacao padrao 567 e a ordem do titulo arrastado:
# colunas 3 e 4 do manifest).
# -Hf: saida do lossless-check --hf (ultima secao com Primeira Pagina Diferente
# trocada, distancias 2 / 1,5 cm, numeracao i, ii... a partir de 3, pares e impares;
# secoes desvinculada e vinculada: colunas 3 a 5 do manifest).
# -Refs: saida do lossless-check --refs (indicador RefLossless, REF \h a ele que, atualizado,
# da o texto do indicador; legenda SEQ Figura num paragrafo novo; hiperlink com Dica de Tela).
# -Toc: saida do edit-check --only toccorpus (sumario atualizado pelo editor): o Word
# atualiza o MESMO sumario e as entradas (texto sem o numero da pagina) tem de bater.
# -Pictures: saida do lossless-check --pictures (a imagem com texto alt "Imagem editada
# (lossless)": o Word tem de ve-la flutuante, girada 15 graus, com o texto alt).
# -Page: saida do lossless-check --page (Cor da Pagina: o tipo do preenchimento que o Word
# ve - cor 1, padrao 2, gradiente 3; marca-d'agua PowerPlusWaterMarkObject num cabecalho;
# folha de rosto: Primeira Pagina Diferente na 1a secao e o titulo no inicio; colunas 3 a 5).
param(
  [Parameter(Mandatory = $true)][string]$Dir,
  [int]$Limit = 100000,
  [int]$Skip = 0,
  [switch]$Sections,
  [switch]$Tables,
  [switch]$Notes,
  [switch]$Nav,
  [switch]$Hf,
  [switch]$Refs,
  [switch]$Toc,
  [switch]$Pictures,
  [switch]$Page
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\doc-lab\word-com.ps1')

$rows = @(Get-Content -Encoding UTF8 -LiteralPath (Join-Path $Dir 'manifest.tsv')) | Select-Object -Skip $Skip
$app = New-WordApp
$n = 0
foreach ($row in $rows) {
  if ($n -ge $Limit) { break }
  $n++
  $parts = $row -split "`t"
  [string]$edited = Join-Path $Dir $parts[0]
  [string]$orig = $parts[1]
  $status = 'ok'
  $detail = ''
  try {
    $app = Invoke-WithWord $app {
      param($w)
      $d = $w.Documents.Open($edited, $false, $true, $false)
      try {
        $script:pe = $d.Paragraphs.Count
        $script:se = $d.Sections.Count
        $script:te = $d.Tables.Count
        $script:hasEdit = ([string]$d.Content.Text).Contains('XYZ')
        if ($Nav) {
          # documento protegido (formularios): o COM nao le a formatacao de paragrafo
          $script:prot = ($d.ProtectionType -ne -1)
          $script:ind = $false; $script:tabs = $false; $k = 0
          $na = ''; $nt = ''; $script:ia = -1; $script:it = -1
          if ($parts.Count -ge 4 -and $parts[2] -ne '' -and $parts[3] -ne '') {
            # so letras e digitos, 12 primeiros (espacos, NBSP e numeracao variam)
            $na = ($parts[2] -replace '[^\p{L}\p{N}]', '')
            $nt = ($parts[3] -replace '[^\p{L}\p{N}]', '')
            $na = $na.Substring(0, [math]::Min(12, $na.Length)); $nt = $nt.Substring(0, [math]::Min(12, $nt.Length))
          }
          foreach ($p in $d.Paragraphs) {
            $k++
            if ($k -gt 4000) { break }
            if (-not $script:ind -and [math]::Abs($p.LeftIndent - 56.7) -lt 0.2 -and [math]::Abs($p.FirstLineIndent + 28.35) -lt 0.2) { $script:ind = $true }
            if (-not $script:tabs -and $p.TabStops.Count -ge 2) {
              foreach ($t in $p.TabStops) { if ([math]::Abs($t.Position - 141.75) -lt 0.2 -and $t.Alignment -eq 1) { $script:tabs = $true } }
            }
            # ordem dos titulos pelos paragrafos com nivel de topico (o sumario repete os textos)
            if ($na -ne '' -and ($script:ia -lt 0 -or $script:it -lt 0)) {
              $lv = $p.OutlineLevel
              if ($lv -ne $null -and $lv -lt 10) {
                $x = ([string]$p.Range.Text) -replace '[^\p{L}\p{N}]', ''
                if ($script:ia -lt 0 -and $x.StartsWith($na, [System.StringComparison]::OrdinalIgnoreCase)) { $script:ia = $k }
                elseif ($script:it -lt 0 -and $x.StartsWith($nt, [System.StringComparison]::OrdinalIgnoreCase)) { $script:it = $k }
              }
            }
            if ($script:ind -and $script:tabs -and ($na -eq '' -or ($script:ia -ge 0 -and $script:it -ge 0))) { break }
          }
          $script:dts = [double]$d.DefaultTabStop
          $script:order = ($na -eq '') -or ($script:ia -ge 0 -and $script:it -ge 0 -and $script:ia -lt $script:it)
        }
        if ($Tables) {
          $script:formula = $false
          foreach ($f in $d.Fields) { if (([string]$f.Code.Text).Contains('=SUM(ABOVE)')) { $script:formula = $true } }
          $script:pgb = [bool]$d.Sections.Item($d.Sections.Count).Borders.Enable
          $script:tstyle = $false
          try { $null = $d.Styles.Item('Tabela Lossless'); $script:tstyle = $true } catch { }
        }
        if ($Hf) {
          # documento protegido (formularios): o COM nao le o PageSetup (como no -Nav)
          $script:prot = ($d.ProtectionType -ne -1)
          # opcoes da ultima secao, pares/impares e o vinculo das secoes desvinculada/vinculada
          $ls = $d.Sections.Item($d.Sections.Count)
          $script:hfTp = [int]$ls.PageSetup.DifferentFirstPageHeaderFooter
          $script:hfEo = [int]$ls.PageSetup.OddAndEvenPagesHeaderFooter
          $script:hfHd = [double]$ls.PageSetup.HeaderDistance; $script:hfFd = [double]$ls.PageSetup.FooterDistance
          $pn = $ls.Headers.Item(1).PageNumbers
          $script:hfPn = "$($pn.NumberStyle)/$($pn.RestartNumberingAtSection)/$($pn.StartingNumber)"
          $script:hfUn = $true; $script:hfRe = $true
          if ($parts.Count -ge 5) {
            $u = [int]$parts[3]; $r = [int]$parts[4]
            if ($u -ge 0 -and $u + 1 -le $d.Sections.Count) { $script:hfUn = -not $d.Sections.Item($u + 1).Headers.Item(1).LinkToPrevious }
            if ($r -ge 0 -and $r + 1 -le $d.Sections.Count) { $script:hfRe = [bool]$d.Sections.Item($r + 1).Headers.Item(1).LinkToPrevious }
          }
        }
        if ($Toc) {
          $script:tocSame = $false; $script:tocInfo = ''
          if ($d.TablesOfContents.Count -gt 0) {
            $norm = { param($t) (([string]$t -split "`r") | ForEach-Object { (($_ -replace '\t[^\t]*$', '') -replace '[^\p{L}\p{N}]', '') } | Where-Object { $_ -ne '' }) -join '|' }
            $ours = & $norm $d.TablesOfContents.Item(1).Range.Text
            $null = $d.TablesOfContents.Item(1).Update()
            $word = & $norm $d.TablesOfContents.Item(1).Range.Text
            $script:tocSame = ($ours -eq $word)
            if (-not $script:tocSame) { $script:tocInfo = (" ours=" + $ours.Substring(0, [math]::Min(160, $ours.Length)) + " word=" + $word.Substring(0, [math]::Min(160, $word.Length))) }
          } else { $script:tocSame = $true; $script:tocInfo = ' (sem TOC \o)' }
        }
        if ($Refs) {
          $script:bm = [bool]$d.Bookmarks.Exists('RefLossless')
          $script:refOk = $false; $script:seq = $false; $script:tip = $false
          $bt = if ($script:bm) { [string]$d.Bookmarks.Item('RefLossless').Range.Text } else { '' }
          # com o controle de alteracoes ligado (ou imposto pela protecao "so alteracoes
          # controladas"), atualizar guarda o resultado velho como exclusao e Result.Text
          # dobra: o texto excluido sai da comparacao. "Todas em maiusculas" muda o texto
          # devolvido do codigo e do resultado (refs-lab ref-probe2/ref-save/fields-list)
          if ($d.TrackRevisions) { try { $d.TrackRevisions = $false } catch { } }
          foreach ($f in $d.Fields) {
            $c = [string]$f.Code.Text
            if ($c -match 'REF RefLossless') {
              $null = $f.Update()
              $res = $f.Result
              $t = [string]$res.Text
              $dels = @()
              foreach ($rv in $res.Revisions) { if ($rv.Type -eq 2) { $dels += , @(($rv.Range.Start - $res.Start), ($rv.Range.End - $res.Start)) } }
              $sb = New-Object System.Text.StringBuilder
              for ($k = 0; $k -lt $t.Length; $k++) {
                $gone = $false
                foreach ($x in $dels) { if ($k -ge $x[0] -and $k -lt $x[1]) { $gone = $true } }
                if (-not $gone) { [void]$sb.Append($t[$k]) }
              }
              if ($sb.ToString() -ieq $bt) { $script:refOk = $true }
            }
            if ($c -match 'SEQ Figura') { $script:seq = $true }
          }
          foreach ($h in $d.Hyperlinks) { if ([string]$h.ScreenTip -eq 'Dica Lossless') { $script:tip = $true } }
        }
        if ($Page) {
          $f = $d.Background.Fill
          $script:pgFill = if ($f.Visible) { [int]$f.Type } else { 0 }
          $script:pgWm = 0
          foreach ($s in $d.Sections) {
            foreach ($t in @(1, 2, 3)) {
              $h = $s.Headers.Item($t)
              if (-not $h.Exists) { continue }
              foreach ($sh in $h.Shapes) { if ([string]$sh.Name -like 'PowerPlusWaterMarkObject*') { $script:pgWm++ } }
            }
          }
          # documento protegido (formularios): o COM nao le o PageSetup (como no -Hf)
          $script:pgTp = -2
          if ($d.ProtectionType -eq -1) { $script:pgTp = [int]$d.Sections.Item(1).PageSetup.DifferentFirstPageHeaderFooter }
          $r0 = $d.Content
          # "[Titulo do documento]" com i agudo (o .ps1 fica em ASCII)
          $script:pgTitle = ([string]$d.Range(0, [math]::Min(4000, $r0.End)).Text).Contains('[T' + [char]0xED + 'tulo do documento]')
        }
        if ($Pictures) {
          $script:pic = 'no-picture'
          foreach ($sh in $d.Shapes) {
            try {
              if ([string]$sh.AlternativeText -eq 'Imagem editada (lossless)') {
                if ([math]::Abs([double]$sh.Rotation - 15) -lt 0.5) { $script:pic = 'ok' } else { $script:pic = 'pic-rot ' + $sh.Rotation }
                break
              }
            } catch { }
          }
          if ($script:pic -eq 'no-picture') {
            foreach ($ish in $d.InlineShapes) { try { if ([string]$ish.AlternativeText -eq 'Imagem editada (lossless)') { $script:pic = 'pic-inline' } } catch { } }
          }
        }
        $script:fe = $d.Footnotes.Count; $script:ee = $d.Endnotes.Count
        $script:noteText = ''
        if ($Notes) {
          # (1..0 no PowerShell sao dois itens: so com notas)
          if ($d.Footnotes.Count -gt 0) { foreach ($k in 1..$d.Footnotes.Count) { $script:noteText += [string]$d.Footnotes.Item($k).Range.Text } }
          if ($d.Endnotes.Count -gt 0) { foreach ($k in 1..$d.Endnotes.Count) { $script:noteText += [string]$d.Endnotes.Item($k).Range.Text } }
        }
      } finally { $d.Close([ref]0) }
      $o = $w.Documents.Open($orig, $false, $true, $false)
      try { $script:po = $o.Paragraphs.Count; $script:so = $o.Sections.Count; $script:to = $o.Tables.Count; $script:fo = $o.Footnotes.Count; $script:eo = $o.Endnotes.Count } finally { $o.Close([ref]0) }
    }
    $detail = "paras $($script:po)->$($script:pe) secoes $($script:so)->$($script:se) tabelas $($script:to)->$($script:te) notas $($script:fo)/$($script:eo)->$($script:fe)/$($script:ee)"
    if ($Toc) { $script:hasEdit = $true }
    $slack = 1
    if ($Sections -or $Refs) { $slack = 2 }
    if ($Page -and $parts.Count -ge 5) {
      # cor 1 (solido), padrao 2, gradiente 3; a folha de rosto acrescenta paragrafos ao corpo
      $wantFill = @{ 'color' = 1; 'pattern' = 2; 'gradient' = 3 }[$parts[2]]
      $coverParas = [int]$parts[4]
      $slack = 1 + $coverParas
      $detail += " page fill=$($script:pgFill) wm=$($script:pgWm) titlePg=$($script:pgTp) title=$($script:pgTitle)"
      if (-not $script:hasEdit) { $status = 'no-edit' }
      elseif ($script:pgFill -ne $wantFill) { $status = 'page-fill' }
      elseif ($parts[3] -eq '1' -and $script:pgWm -lt 1) { $status = 'page-wm' }
      elseif ($coverParas -gt 0 -and $script:pgTp -ne -1 -and $script:pgTp -ne -2) { $status = 'page-titlepg' }
      elseif ($coverParas -gt 0 -and -not $script:pgTitle) { $status = 'page-cover' }
      elseif ([math]::Abs($script:pe - $script:po) -gt $slack) { $status = 'para-count' }
    }
    elseif ($Pictures -and $script:pic -ne 'ok') { $status = $script:pic }
    elseif (-not $script:hasEdit) { $status = 'no-edit' }
    elseif ($Toc -and -not $script:tocSame) { $status = 'toc-differs'; $detail += $script:tocInfo }
    elseif ($Toc) { $status = 'ok' }
    elseif ($Refs -and -not $script:bm) { $status = 'no-bookmark' }
    elseif ($Refs -and -not $script:refOk) { $status = 'ref-result' }
    elseif ($Refs -and -not $script:seq) { $status = 'no-seq' }
    elseif ($Refs -and -not $script:tip) { $status = 'no-tooltip' }
    elseif ($Nav -and $script:prot) { $status = 'ok-protected' }
    elseif ($Nav -and -not $script:ind) { $status = 'no-indent' }
    elseif ($Nav -and -not $script:tabs) { $status = 'no-tabs' }
    elseif ($Nav -and [math]::Abs($script:dts - 28.35) -gt 0.1) { $status = 'no-default-tab' }
    elseif ($Nav -and -not $script:order) { $status = 'heading-order' }
    elseif ($Tables) {
      if ($script:te -ne $script:to) { $status = 'table-count' }
      elseif (-not $script:formula) { $status = 'no-formula' }
      elseif (-not $script:pgb) { $status = 'no-page-borders' }
      elseif (-not $script:tstyle) { $status = 'no-table-style' }
    }
    elseif ($Hf -and $script:prot) { $status = 'ok-protected' }
    elseif ($Hf) {
      $wantTp = 0; if ($parts.Count -ge 3 -and $parts[2] -eq '1') { $wantTp = -1 }
      if ($script:hfTp -ne $wantTp) { $status = 'hf-titlepg' }
      elseif ($script:hfEo -ne -1) { $status = 'hf-evenodd' }
      elseif ([math]::Abs($script:hfHd - 56.7) -gt 0.1 -or [math]::Abs($script:hfFd - 42.5) -gt 0.1) { $status = 'hf-distance' }
      elseif ($script:hfPn -ne '2/True/3') { $status = 'hf-pgnum' }
      elseif (-not $script:hfUn) { $status = 'hf-unlink' }
      elseif (-not $script:hfRe) { $status = 'hf-relink' }
      elseif ([math]::Abs($script:pe - $script:po) -gt $slack) { $status = 'para-count' }
      $detail += " hf $($script:hfTp)/$($script:hfEo)/$($script:hfPn)"
    }
    elseif ([math]::Abs($script:pe - $script:po) -gt $slack) { $status = 'para-count' }
    elseif ($Sections -and $script:se -ne $script:so + 1) { $status = 'section-count' }
    elseif ($Notes -and ($script:fe -ne $script:fo + 1 -or $script:ee -ne $script:eo + 1)) { $status = 'note-count' }
    elseif ($Notes -and -not ($script:noteText.Contains('NOTA NOVA RODAPE') -and $script:noteText.Contains('NOTA NOVA FIM'))) { $status = 'note-text' }
  } catch {
    $status = 'open-failed'
    $detail = ([string]$_.Exception.Message) -replace "[`r`n`t]", ' '
  }
  Emit "$($parts[0])`t$status`t$detail"
}
Close-WordApp $app

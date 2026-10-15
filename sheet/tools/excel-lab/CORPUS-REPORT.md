# Corpus do mundo real × Universal Sheet (2026-10-15)

Validação do Sheet contra **2.175 pastas de trabalho únicas** baixadas da
internet, renderizadas pelo nosso `<universal-sheet>` e comparadas com o
Excel 365 pt-BR (oráculo COM). O corpus e o lab ficam **fora do repositório**:
`E:\UniversalSheetTest` (arquivos de terceiros; ver CLAUDE.md). Mesma
metodologia do Slides (`slides/tools/ppt-lab/CORPUS-REPORT.md`).

## Corpus

| prefixo | origem | pastas | natureza |
|---|---|---|---|
| `lo-`  | LibreOffice core `sc/qa`, `chart2/qa`, `oox/qa` (sparse clone) | 884 | reproduções de bugs, sintéticos |
| `poi-` | Apache POI `test-data/spreadsheet` | 782 | bugs + fuzz (clusterfuzz) |
| `gd-`  | GovDocs1 `xls.zip` (.gov, ~1997–2009), 320 sorteados por HTTP Range | 320 | **reais, binários .xls** |
| `gdx-` | GovDocs1 `xlsx.zip` (inteiro) | 36 | reais, Office 2007/2010 |
| `web-` | 153 URLs de órgãos públicos/universidades (2016–2026) | 153 | **reais modernos**: pt-BR 43 (IBGE, BCB, Tesouro, Receita, ANP, CVM…), EN 59, CJK/RTL/outros 40, Europa 11 |

Tipos: 1.099 `.xlsx`, 1.020 BIFF8 (`.xls`), 14 BIFF5, 23 BIFF2–4 sem
contêiner, 10 `.xlsb`, 2 XML 2003.

### Segurança

1. Windows Defender em tudo (`MpCmdRun -Scan -ScanType 3`): **nenhuma ameaça**.
2. Triagem estática (`_lab/triage.ts`, só leitura de bytes): tipo real pelo
   conteúdo, sha256/dedup; macro (vbaProject, `_VBA_PROJECT_CUR`, folha de
   macro XLM, `Auto_Open`, nomes de função XLM), ActiveX, OLE, links externos
   (`externalLinks`, SUPBOOK, rels External, UNC → vazamento NTLM), conexões de
   dados (consultas que atualizam ao abrir), DOCTYPE/entidades (bomba XML),
   zip-bomba, criptografia, executável no pacote.
3. Casos de exploit/fuzz das suítes (`sc/qa/.../{pass,fail,indeterminate}`,
   clusterfuzz/poc do POI) só vão ao parser JS — **nunca** ao Excel.
4. Oráculo só para `xlSafe` (1.775), com `AutomationSecurity=3`, sem alertas,
   sem atualizar links, ReadOnly, sem janela, nada salvo; watchdog que mata só
   o `EXCEL.EXE` com o PID que o próprio script abriu.

## Oráculo: a TELA do Excel, sem clipboard

Para cada aba visível (até 6 por pasta), a região A1..(1280×800 px a 100%)
vira uma **imagem vinculada** (câmera) dentro de um gráfico vazio numa aba
temporária → `Chart.Export(png)`: é a renderização de tela do Excel (grade
cinza, texto com AA, gráficos, imagens, setas de filtro, indicador de
comentário), sem usar a área de transferência nem mudar configuração do
sistema. `meta.json` guarda larguras/alturas (pt) do Excel e o `Range.Text`
de cada célula. Descartados: PDF (`ExportAsFixedFormat` — colunas saem ~8%
mais largas, métrica de impressora) e `CopyPicture` (clipboard).

Nosso lado: `renderRegionToCanvas` pinta a mesma região a 100%, sem
cabeçalhos/seleção/panes; o harness é `tools/excel-lab/harness.{ts,html}`.

Armadilhas do COM medidas: um gráfico numa pasta de rascunho criada antes de
abrir a pasta derruba o Excel (RPC 0x800706BE) depois de ler `Rows().Height`
— por isso a aba temporária fica na própria pasta; `view="pageLayout"` muda
`Range.Width` (força-se o modo Normal); falhas em cascata num lote são refeitas
uma pasta por instância.

Resultado do oráculo: 1.730 pastas ok, 45 recusadas pelo próprio Excel
(formato inválido, "o Office detectou um problema", timeouts).

## Fidelidade

Métricas por aba: `blk` = % de blocos 8×8 cuja média diverge > 24 (ignora
antialiasing); `texto` = % das células não vazias cujo texto exibido bate com
o `Range.Text`.

| rodada | abas .xlsx | mediana blk | média blk | texto | geometria diferente |
|---|---|---|---|---|---|
| r2 (antes) | 1.238 | 8,70 | 14,40 | 80,6% | 423 abas |
| r3 (geometria) | 1.238 | **6,32** | **12,70** | 80,6% | **88** |

Por origem em r3: lo 4,73 / poi 4,17 / gdx 9,21 / web 11,09 (mediana).
Os `.xls` (metade do corpus) ainda não abrem — leitor BIFF em andamento.

## Regras medidas (pastas sintéticas no oráculo)

Geometria do grid (`sheet-core/src/grid-metrics.ts`, tabelas em
`excel-metrics-data.ts` geradas por `gen-grid-metrics.mjs`):
- `<col width>` → px pela largura do dígito máximo (MDW) da fonte **Normal**
  (não é sempre 7: Calibri 12 = 8, Arial 12 = 9, Verdana 10 = 8); largura
  padrão ⌈(baseColWidth·MDW + 2⌈MDW/4⌉ + 1)/8⌉·8.
- Linha sem `customHeight`: o Excel **refaz o auto-ajuste ao abrir** e ignora o
  `ht` gravado — máx. das fontes das células (vazias com estilo também; vazias
  sem célula usam o estilo da coluna ou a fonte Normal), runs ricos,
  sobrescrito/subscrito, quebra (linhas × altura da fonte) e +1 px por
  `thickTop`/`thickBot` (bordas reais não contam).
- Altura por fonte não tem fórmula (VDMX/hinting; Verdana nem é monotônica):
  tabela por ppem 4–96 para 54 famílias; fonte ausente = Arial.
- Linha ausente: sem `<sheetFormatPr>` 15 pt; com `customHeight` o
  `defaultRowHeight`; senão a linha da fonte Normal (`defaultRowHeight` é
  ignorado). `customHeight` trunca ao pixel.
- Fonte com `<scheme val="minor|major">` = fonte do **tema** (um 宋体 com
  scheme minor mede e desenha como Calibri).

Robustez: `<row>`/`<c>` sem `r` (posição implícita) e o prefixo `x:` do
OpenXML SDK; mesclas com índice espacial (50 mil mesclas: 13 s → 2,6 s).

## Em andamento (agentes em paralelo)

- `.xls` BIFF8/BIFF5 → pacote OOXML em memória (mesmo caminho do .xlsx).
- Desenhos: imagens, formas, caixas de texto, conectores, grupos (reuso do
  motor DrawingML do Slides).
- Tabelas (estilos internos completos), tabela dinâmica, formatação
  condicional (barras, escalas, ícones), estilos de coluna/linha, bordas e
  padrões ao pixel.
- Texto exibido e desenhado: formatos numéricos (espaço/`?`/`*`/seções
  condicionais), erros em pt-BR, `showZeros`, General que encolhe e `####`,
  alinhamentos, rotação, RTL.
- Gráficos do Excel (tipos ausentes, linhas de tendência, folhas de gráfico).

## Reproduzir

Scripts em `E:\UniversalSheetTest\_lab` (fora do git):

```
node _lab/zip-sample.mjs <url-zip> <dir> <n> [semente]          # amostra GovDocs por Range
run-ts.mjs _lab/triage.ts E:/UniversalSheetTest                  # triagem + manifest.json
node _lab/xl-driver.mjs 3 [regex|@lista]                         # oráculo Excel (RETRY=1 refaz falhas)
node _lab/corpus-render.mjs <tag> 3 [regex|@lista]               # nosso render (SRC_ROOT=<worktree>/sheet)
node _lab/corpus-compare.mjs <tag>                               # métricas + worst.html + texts-diff.json
node _lab/geom.mjs <tag>                                         # larguras/alturas × Excel
node _lab/sbs.mjs <tag> <id> <aba> <out.png> [escala] [x y w h]  # nosso | Excel
node _lab/gen-metrics*.mjs + measure.ps1                         # medidas sintéticas
```

`run-ts.mjs` = `slides/tools/ppt-lab/ppt-binary/run-ts.mjs`.

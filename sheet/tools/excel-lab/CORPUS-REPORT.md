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
| r3 (geometria) | 1.238 | 6,32 | 12,70 | 80,6% | 88 |
| r4 (+3 passadas, zoom do oráculo) | 1.254 | 6,25 | 12,56 | 80,8% | 89 |
| r5 (+leitor .xls e o que veio junto) | 1.252 | **5,40** | **11,39** | — | — |

Rodadas completas com `.xls` (todas as abas com oráculo):

| rodada | abas | mediana | média | p90 | texto |
|---|---|---|---|---|---|
| r5 (.xls) | 2.691 | 6,74 | 11,54 | 29,7 | 89,5% |
| r6 (+desenhos) | 2.414* | 5,78 | 10,35 | 27,4 | 89,1% |
| r7 (+tabelas/CF, oráculo 1:1) | 2.692 | 5,26 | 9,03 | 23,9 | 90,0% |
| r8 (+texto/formatos, gráficos, formas .xls) | 2.692 | 0,31 | 4,30 | 14,8 | 98,9% |
| r9 (+motor de cálculo: recálculo ao abrir, TEXT/frações) | 2.692 | **0,29** | **4,15** | **14,6** | **99,4%** |

r9 por origem (mediana/média): gd 0,31/3,85 · gdx 0,63/6,76 · lo 0,17/2,27 ·
poi 0,02/2,67 · web 2,66/9,32. O texto exibido sobe porque agora a tela mostra
o que o Excel mostra ao abrir — ele recalcula a pasta em vários casos (regra
medida abaixo) e o cache gravado no arquivo fica velho.

\* rodada concorrente com a reexportação do oráculo (renderizações perdidas).
Em r8 por origem (mediana/média): gd 0,31/3,88 · gdx 0,63/6,76 · lo 0,22/2,66 ·
poi 0,02/2,77 · web 2,72/9,34. Entraram: motor de formatação numérica
tokenizado (1.709 casos do Excel, portado ao .NET), Range.Text pela largura da
coluna com larguras GDI, posição do texto remedida no oráculo 1:1 (base
compartilhada da linha), altura automática de linha com texto quebrado,
triângulo de "número como texto"; gráficos com dados das células, chartex
(Office 2016), linhas de tendência, pizza de pizza, rótulos com campos,
userShapes, densidade de eixo do Excel; formas OfficeArt completas do .xls,
CF12/CFEX, GELFRAME e eixo de datas nos gráficos do .xls.

Pendente (r8): altura de linha `ht` sem customHeight — o Excel às vezes mantém
a altura gravada (.xls: 91% das linhas; nosso re-ajuste acerta 96%, mas erra
~480 linhas onde a gravada vale; nenhuma regra simples separa os casos — nem
"fonte não medida", nem dyDescent/fileVersion no .xlsx); fontes CJK ausentes
(kostat, 12843-1); combinados do Banco Mundial; rosca com rótulos externos;
3D nos gráficos do .xls; barras de erro.
Em r7 por origem (mediana/média): gd 7,93/9,93 · gdx 6,60/12,52 ·
lo 2,73/5,89 · poi 3,15/7,90 · web 10,39/14,34. Oráculo 1:1: o
`Chart.Export` reservava 1 px de moldura e comprimia a imagem ~2 px; agora o
gráfico e a imagem saem 1,5 pt maiores e recorta-se W×H (borda de 1 px fora
da comparação).

r5 com os `.xls`: **2.691 abas** em 1.677 pastas — mediana 6,74, média 11,54,
texto exibido igual ao Excel em **89,5%** de 297 mil células. Por origem
(mediana/média): gd 8,15/10,78 · gdx 8,95/14,37 · lo 4,57/10,04 · poi
4,44/9,76 · web 12,52/17,05.

### Leitor `.xls` (BIFF8/BIFF5)

`openSpreadsheet` reconhece o Compound File e converte em memória para o
pacote OOXML equivalente (`sheet-core/src/xls/`), que segue pelo mesmo
caminho do `.xlsx`: células, SST com CONTINUE e runs, FONT/FORMAT/XF/PALETTE/
XFEXT (cores de tema), linhas/colunas/mesclas/janela, hiperlinks, comentários,
imagens (PNG/JPEG/DIB), formas e caixas de texto (`xdr:sp`), gráficos (subfluxo
BIFF8 → `c:chartSpace` do motor único), texto das fórmulas (96% descompilado),
formatação condicional, validação, autofiltro. 1.026 de 1.051 abrem; os 25
restantes (criptografados, fuzz, BIFF2–4) falham com mensagem amigável.
Antes do leitor nenhum `.xls` abria; agora gd mediana 8,2. O pacote
sintetizado, salvo como `.xlsx`, abre no Excel (40 de 40; texto da coluna A
igual em 97,7%).

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

## Motor de cálculo (`sheet/packages/calc`)

Motor próprio de fórmulas, canônico por dentro (nomes em inglês, "," e "."
como no arquivo) com a camada de idioma à parte (`src/i18n`: pt-BR medido no
Excel, en-US; outros idiomas ficam para depois). Todas as 535 funções de
planilha do catálogo do Excel 365 registradas; parser/serializador do texto
OOXML (`_xlfn.`, `_xlpm.`, `@`/SINGLE, `#`/ANCHORARRAY, `:.`…), matrizes
dinâmicas e derramamento, LET/LAMBDA, nomes, tabelas, links externos (cache),
grafo de dependências com recálculo incremental, voláteis, ciclos/iterativo e
o `@` legado medido em 508 funções.

| medida (oráculo: Excel 365 pt-BR via COM) | resultado |
|---|---|
| bancos de casos por função (`test/oracle/*.cases.json`) | 35.299 casos; divergências aceitas só com motivo medido (`*.known.json`) |
| corpus .xlsx: células com fórmula iguais ao recálculo completo do Excel | **99,90%** (65.464/65.531, 237 pastas) |
| corpus .xls: texto da fórmula = `Formula2` / valor = Excel | 98,8% / 99,7% (380 pastas, 40 mil fórmulas) |
| ida e volta .xlsx (ler → recalcular → gravar → Excel abre) | 237/237 sem reparo; `Formula2` 99,999% |
| incremental × recálculo completo | 0 diferenças em 62.526 células |
| idioma pt-BR (FormulaLocal ↔ canônico) | 100% das 609 funções; 99,995% de 19.576 fórmulas do corpus |

Regra medida de recálculo ao abrir (Excel 16, CalculationVersion 191029):
modo manual não recalcula; recálculo completo sem `fileVersion appName="xl"`,
sem `calcId` ou com `calcId` < 191028, com `fullCalcOnLoad`/`forceFullCalc`,
ou com função volátil no texto de uma fórmula sem `ca="1"`; senão só as
fórmulas com `ca="1"` ou sem `<v>`. Na tela: o que o Excel mostra ao abrir
bate com o cache gravado em 92,8% das células com fórmula e com o nosso
plano em 99,65%.

Pendente: FORECAST.ETS (otimizador do Excel não identificado; 66 células de
uma pasta), últimos dígitos de RATE/IRR/XIRR/YIELD, algumas inversas de
distribuição; fórmulas BIFF5; exportadores CSV/HTML/PDF e o port .NET ainda
usam o cache; copiar/colar/preencher/inserir linhas (ajuste de referências)
quando a UI tiver.

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

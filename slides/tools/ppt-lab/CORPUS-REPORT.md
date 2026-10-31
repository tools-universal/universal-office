# Corpus do mundo real × Universal Slides (2026-10-13)

Validação do Slides contra **1.445 apresentações únicas** baixadas da internet,
renderizadas pelo nosso viewer e comparadas com o PowerPoint 16 (oráculo COM).
O corpus e o lab ficam **fora do repositório**: `E:\UniversalSlidesTest`
(decks de terceiros, alguns com fontes comerciais embutidas; ver CLAUDE.md).

## Progresso (2026-10-14)

Divergência por slide (`blk`, 6.603 slides, até 12 por deck) — rodadas completas:

| origem | mediana antes → r3 | média antes → r3 |
|---|---|---|
| total | 14,6 → **4,0** | 24,3 → **9,0** |
| `.ppt` reais (gd) | 21,5 → 4,6 | 30,3 → 10,7 |
| Office 2007/10 (gdx) | 16,6 → 4,8 | 29,1 → 8,9 |
| modernos (web) | 5,6 → 2,9 | 11,6 → 6,0 |

Subconjunto de 210 decks (6 slides) depois de r3, com espessura de linha e
sombras corrigidas (s17): mediana 13,3 → **3,1**, média 22,6 → **7,3**.
Amostras do repo (`regress.mjs`) × PowerPoint: 3,34% → 3,03%.

Feito (P0/P1 do plano abaixo + achados no caminho): clrMap/clrMapOvr;
bgRef/fillRef pelos estilos do tema; modificadores de cor (satMod, hue, comp…);
efeitos de imagem (duotone, grayscl, clrChange, lum, biLevel, alphaModFix) e
ladrilho com escala; herança de FORMA MESTRE e defaults medidos de
fFilled/fLine no .ppt (99,3%/99,5% de concordância com a conversão do próprio
app em 57 mil formas); WMF/EMF (player Canvas, `metafile.ts`); imagem em
placeholder; spcPct + regra do 1º parágrafo + spcFirstLastPara; marcadores
(buFont/buClr/buSz, Wingdings/Symbol → Unicode, buBlip, PP9 do .ppt);
sobrescrito, cap, strike, spc; hiperlinks; data fixa do rodapé .ppt; gradiente
de caminho; pattFill (54 padrões extraídos do app); régua do ClientTextbox em
texto de outline; cascata de texto exclusiva e master por tipo; texto "outro"
do .ppt pelo estilo do documento; texto em degradê (cor média) e tx1 padrão;
**espessura de contorno (todo contorno saía com 1 px) e sombras de forma
(saíam nulas)**; sombra escalada/ancorada.

Ferramentas novas do lab (`_lab/`): `model-agree.ts` (modelo da NOSSA conversão
.ppt × a do PowerPoint, por forma/parágrafo/run), `conv-agree.ts`,
`fill-truth.ts`, `diff-tags.mjs`, subconjunto `subset.txt`, oráculo
`oracle/ppt2pptx/` (conversões do app de ~370 .ppt).

Depois (2026-10-14, 2ª etapa): TIFF (decodificador próprio: 33/33 do corpus),
linhas de tabela que CRESCEM até caber o texto, WordArt (`prstTxWarp` só com
`fromWordArt="1"`, como o app; envelopes e arcos; ajustes nas unidades
certas), altura de parágrafo sem caracteres pelo `endParaRPr`. Rodada completa
r4: mediana **3,4**, média **8,4** (de 14,6/24,3). Subconjunto (s22): mediana
13,3 → **3,1**, média 22,6 → **7,2**. Harness: página nova por deck e espera
das fontes (rodadas antes oscilavam por estado de fonte vazando entre decks).

Medido e DESCARTADO: "fonte com Bold no nome sai em negrito quando substituída"
— o app desenha a substituta REGULAR (decks CJK com "… Bold/Heavy"); o caso que
sugeria o contrário (Arial Rounded MT Bold) tinha a fonte instalada.

SmartArt sem `drawingN.xml` (Office 2007; 43 decks do corpus): `diagram-fallback.ts`
refaz o diagrama pelo modelo de dados para os layouts MEDIDOS — organograma
(hierBranch r/l/hang/init, custScaleX), processo e processo em curva (setas),
bloco básico, lista agrupada (list1), blocos verticais, lista com círculo,
chevron, ciclo, matriz — com cores da definição de cores (repeat/span por
presStyleIdx), estilo rápido (fillRef/lnRef do tema) e a formatação manual do
ponto (`dgm:spPr`). Layout fora da lista fica vazio: palpite errado (setas
radiais, hexágonos) mediu PIOR que o vazio. Nesses decks: média 12,0 → **8,7**
(LibreOffice: mediana 20,5 → 6,7); sem regressão no subconjunto nem no repo.

Gráficos: motor novo e COMPARTILHADO (`shared/charts`, a formatação numérica
do Sheet mudou para lá). Layout medido em gráficos sintéticos exportados pelo
PowerPoint (`_lab/syn`, `gen-charts.cjs`): margens, título, legenda (ordem
invertida em barras horizontais/empilhadas), escala automática (zero, 5% de
folga, densidade de marcas), rótulos de categoria (quebra/45°/salto), rótulos
de dados, formato de número (vinculado = cache do formato), estilos `c:style`
1–48 (paletas colorida/mono/cinza em RGB linear, degradês, áreas escuras),
linhas suaves por padrão, marcadores automáticos, eixos secundários,
`themeOverride` do gráfico. Nos 100 slides com gráfico do corpus: média
16,5 → **8,4**, mediana 12,3 → **5,6**.

Depois (3ª etapa, 2026-10-14): o Sheet passou para o motor compartilhado
(Excel Chart.Export como oráculo; gráficos 2010+ com linhas #898989);
prévias de objetos OLE (p:pic do oleObj / v:imagedata do VML; WMF sem
cabeçalho); efeitos brilho, bordas suaves, reflexo, sombra interna e
effectRef do tema; câmera 3D girada; barras/pizza 3D; e regras da conversão
.ppt casadas 1:1 com a do próprio PowerPoint (`_lab/grad-shapes.ts`,
`grad-agree.ts`, `pic-agree.ts`): degradês (ângulo, foco, espelho — 100% em
~13 mil), fundo recolorido (duotone), ajustes de imagem (brilho/contraste/
cinza/transparente — 97,7%), e <a:gamma/> nas cores. Rodada completa r6:
mediana **3,05**, média **6,0** (r4: 3,37/8,42; início: 14,6/24,3); .ppt reais
(gd) média 10,1 → 5,9.

Depois (4ª etapa, 2026-10-14) — regras novas MEDIDAS em decks sintéticos
(`_lab/syn/*.cjs`, `gen-shapes.cjs`; todos voltam a 0 depois da correção):

- **Interpolação do degradê** depende dos stops: 2 stops em 0/100% = luz
  linear com curva sigma (Φ normal, σ = 0,25); 3 stops de pontas iguais =
  sigma por metade (linear) ou luz linear (caminho); o resto = sRGB direto.
  O espelho de 2 cores do .ppt sai com 3 stops (é o único jeito de o .pptx
  reproduzir o "foco" do binário).
- **Degradê de caminho `circle`**: círculo circunscrito à forma encolhido rumo
  ao PONTO central do foco (anel t: centro F + t·(C − F), raio t·R), também
  com o foco fora da forma (temas Office 2007); lado invertido colapsa no l/t.
- **Cor**: shade/tint com a curva sRGB exata; satMod/satOff com S sem teto
  (só o RGB é cortado); modificadores encadeados em ponto flutuante;
  `<a:alpha>` repetido = o último; luminância (grayscl, biLevel, duotone,
  `<a:gray/>`) Rec. 709 sobre o sRGB. O mesmo no motor de gráficos (Sheet).
- `innerShdw` sai do alfa da forma (forma translúcida escurece por dentro);
  sombra de forma com imagem pelo alfa da imagem.
- `useBgFill` = janela para o fundo do slide; fundo padrão = bg1; o
  placeholder herda preenchimento/contorno/geometria (inclusive custGeom) e
  efeitos do layout/master; `<a:path fill="none">`; `rotWithShape="0"`
  (preenchimento no referencial da página, na caixa alinhada da forma
  girada); blipFill sem modo = ladrilho.
- EMF+ "só EMF+" (imagens) e WMF com SCALEVIEWPORTEXT (metarquivo dentro de
  metarquivo — fundos em "estrela" de .ppt antigos).
- Gráficos: estilos 17–32/41–48 com o 3º preenchimento do tema; 35–40 com a
  área de plotagem no accent; blocos de 6 séries (m = ⌊n/6⌋ + 1) e cinzas
  medidos (claros nos escuros); grade em tx1; densidade do eixo (+14 pt);
  valores iguais → eixo do zero.
- SmartArt sem desenho: texto personalizado (custT) com tamanho/negrito/
  itálico gravados e a fonte do tema.

Rodada completa **r7** (antes das correções de foco externo/useBgFill/
custGeom): mediana **2,80**, média **5,15** (r6: 3,05/6,0; início:
14,6/24,3). Subconjunto (s38): mediana 2,42, média 4,27 (s27: 2,82/5,66).

Depois (5ª etapa, 2026-10-14): tabulação (paradas l/r/ctr/dec, defTabSz
herdado, recuo deslocado leva o 1º TAB até marL), texto justificado/dist,
bodyPr do layout MESCLADO sobre o do master, `normAutofit` sem fontScale NÃO
encolhe (medido), estilos de tabela embutidos (63 do app, por id), contorno e
padrão nas letras (rPr ln/pattFill), `fillOverlay`, símbolos da área privada
pela fonte do `<a:sym>`, shadeToTitle, regras de preenchimento do .ppt
casadas com o app (molduras de imagem, master), pincéis de padrão mono no
WMF/EMF. Rodada **r11**: mediana **2,41**, média **3,98** (r10: 2,61/4,30;
r7: 2,80/5,15; início: 14,6/24,3).

Medido depois do r11 (`_lab/syn/lum.cjs`, 8 combinações, ±1 nível):
`<a:lum bright contrast>` = (v − ½)·k + ½ + b·(1 + k)/2, k = 1/(1 − c) se
c ≥ 0, senão 1 + c — o pivô do contraste anda b/2 com o brilho (gd-198810
20,1 → 3,3). PICT do Mac (16 decks, ~155 imagens): tocador próprio
(`pict.ts`); ptSize ≠ picFrame → escala horizontal nos dois eixos e corte
embaixo; texto girado do TextBegin vem com recorte vazio. **O PowerPoint 365
não exibe os PICT de instância 0x542** ("Não é possível exibir esta imagem",
~30 imagens em 5 decks): desenhamos o conteúdo mesmo assim, então esses
slides divergem do oráculo de propósito. Campos `a:fld` com o rPr próprio e
`slidenum` com o número atual (o cache do master é sempre "1").

Depois (6ª etapa, 2026-10-14, frentes em paralelo — agentes em worktrees,
integração no main com testes + regress + subconjunto a cada passo). Rodada
**r12**: mediana **2,12**, média **3,48** (r11: 2,41/3,98; .ppt reais gd
4,09 → 3,51; erros de leitura 61 → 40, todos de entrada inválida/senha).

- Gráficos (`shared/charts`): imagem/textura de fundo (ladrilho pela
  resolução do arquivo), tiques/folgas pela altura de linha da fonte, legenda
  em tabela, defaults do Office 2007 × 2010+ (AppVersion), barras 3D
  oblíquas, pizza 3D em perspectiva, tabela de dados, título rico.
- WordArt: envelopes entre os dois caminhos por comprimento de arco, presets
  de um caminho com glifos rígidos, sombra do texto (opaca sem alpha; blur
  σ ≈ blurRad/3,1), WordArt e arcos do .ppt como a conversão do app;
  preenchimento das letras (degradê/imagem/alfa); chanfro com luz medida
  (tabelas por rig/material), extrusão com câmera, 3D legado do .ppt.
- Metarquivos: Recolorir do .ppt, EXCLUDECLIPRECT, ROP2, PATINVERT, fontes de
  símbolo, tocador EMF+ completo (o "dual" toca o EMF+, como o app).
- .ppt: FOPT terciário não apaga mais os booleanos do primário (formas e
  células vazias saíam preenchidas; regra × app 99,0% → 99,4%); campos com rPr
  e número de slide ao vivo; PICT do Mac.
- Geometria: custGeom com guias em fórmula e arcTo; retângulo de TEXTO das
  geometrias (presets e custGeom — o texto quebrava na caixa inteira); faces
  sombreadas medidas (darken ×0,6, darkenLess ×0,8, lighten 40% e
  lightenLess 20% rumo ao branco).
- Herança: bodyPr do placeholder pelo idx no layout e pelo tipo no master;
  degradê sem lin com a direção do estilo (fillRef); fillOverlay como base.
- Imagens: brilho/contraste exatos (a:lum), blipFill em mc:AlternateContent
  (Mac), recorte por custGeom, prévia OLE só no Fallback e moldura VML,
  alfa no pattFill, bodyPr rot.
- Medido e mantido: entrelinha simples = 1,2 × sz em todas as fontes; o app
  NÃO desenha com a fonte EMBUTIDA (nós desenhamos — web-intl-who diverge de
  propósito); PICT 0x542 não exibido pelo app (desenhamos).

Fechamento do dia (7ª etapa, 2026-10-14). Rodada **r13**: mediana **1,44**,
média **2,48** (r10 de manhã: 2,61/4,30; início do corpus: 14,6/24,3). Por
origem, r10 → r13: gd 3,11 → 1,82, gdx 3,14 → 1,75, lo 0,56 → 0,22, poi
2,19 → 1,21, web 2,04 → 1,23. Amostras do repo × PowerPoint 2,48% → 1,63%.

- **Quebra de linha** como a do app: avanço de glifo arredondado a 1/8 pt,
  kerning só com `kern` e tamanho ≥ kern/100, largura útil truncada a 1/8 pt,
  quebra após espaço e -–—, TAB colado à palavra seguinte, palavra maior que
  a linha quebra entre caracteres, fontScale arredonda ao ponto; fonte ausente
  mede como Calibri. Censo de 11.592 parágrafos: mesmas quebras do app em
  99,8% (era 98,3%).
- **Tabelas**: o app ignora `tableStyles.xml` (usa a definição embutida pelo
  GUID; 74 estilos regenerados), partes por região, grade de bordas (dono da
  aresta, ordem, junções, tracejado/compostas), imagem na célula e na tabela,
  sombra, CJK/kinsoku.
- **SmartArt sem desenho**: motor de layout (`diagram-layout.ts`) que gera o
  `dsp:spTree` como o app (lin/snake/composite/tx/sp/conn/hier/cycle/pyra,
  regras, personalizações do usuário) — decks LibreOffice de SmartArt:
  mediana 19,0 → 1,5.
- Bevel/cubo/botões sombreados também sobre degradê/imagem; alfa do contorno;
  `<p:pic>` com custGeom; marcador sem recuo deslocado; harness do lab com a
  base das fontes substitutas (como o app).

### Ainda faltando (por impacto observado)

- Modelo 3D (`am3d:model3d`, glTF): o app desenha o modelo; o fallback do
  arquivo é um PNG vazio (web-gh-officecli-3d-model).
- Gráficos 3D em perspectiva (área/barras com rAngAx=0) e pizza 3D com
  perspective forte; máximo do eixo com linha suavizada (gdx-545393).
- Texto 3D (`sp3d` no bodyPr), faces de trás com lon > 90°, presets de chanfro
  raros (cross, artDeco…).
- Kerning de fontes antigas (Gill Sans MT, Palatino, Rockwell itálico) difere
  do Chromium; fonte CJK substituta mais larga (gdx-615065); marcador de imagem
  do .ppt (PP9) com degradê (gd-014920).
- EMF+: fundo branco do WMF aninhado em gd-134981 sem explicação.
- Port .NET (`dotnet/src/UniversalOffice.Pptx/TextLayout.cs`) ainda sem as regras
  novas de quebra de linha (paridade só cobre md/html).

### Ainda faltando — lista anterior

- WordArt do .ppt: espaçamento entre linhas e sombra do texto (a escala comum já bate).
- SmartArt sem desenho nos layouts ainda não medidos (arrow5, radial*,
  hierarchy1/2, gear, HexagonCluster…) e geometria personalizada
  (custScale/custLinFact) — idealmente o motor de layout do app
  (algoritmos lin/snake/hierRoot/cycle + constraints) em vez de famílias.
- Gráficos: 3D em perspectiva (rAngAx=0: área/linha, 1 deck), tabela de
  dados (`c:dTable`, 1 deck), imagem/textura de fundo (blipFill no gráfico).
- Efeitos: bevel/3D de forma (sp3d), 3D legado do .ppt (extrusão com luz).
- Métrica da substituta de fonte ausente (Aptos/Calibri) × a do app: quebras
  de linha diferentes (haunted-mansion slide 2: a linha da tabela cresce;
  gd-601441 slide 5: "tt events" quebra antes).
- PICT: QuickTime/JPEG dentro do PICT (poi-pictures), posição fina do texto
  girado; marcador de imagem no estilo-mestre PP9.

## Corpus

| prefixo | origem | decks | natureza |
|---|---|---|---|
| `lo-`  | LibreOffice core `sd/qa`, `oox/qa`… (sparse clone) | 625 | reproduções de bugs, sintéticos |
| `poi-` | Apache POI `test-data/slideshow` | 242 | bugs + fuzz (clusterfuzz) |
| `gd-`  | GovDocs1 (.gov, ~1997–2009), `.ppt` sorteados por HTTP Range | 250 | **reais, binários** |
| `gdx-` | GovDocs1 `pptx.zip` | 209 | **reais, Office 2007/2010** |
| `web-` | 120 URLs de .gov/.edu/OMS/UE/GitHub (2016–2026) | 119 | **reais modernos**: pt-BR (23), JA (10), AR/HE (10), ZH/KO (10), Morph/Zoom/3D/SVG/equações |

### Segurança (o GovDocs avisa que contém malware)

1. Windows Defender em tudo (`MpCmdRun -Scan -ScanType 3`): **nenhuma ameaça**.
2. Triagem estática (`_lab/triage.ts`, só leitura de bytes): tipo real pelo
   conteúdo, sha256/dedup, macro (VBA real — o `VBAInfoAtom` vazio que todo .ppt
   tem NÃO conta), ActiveX, OLE, links externos/UNC (vazamento NTLM, diálogos),
   executável dentro do pacote → quarentena.
3. **Casos de exploit** das suítes (`sd/qa/.../ppt/{pass,fail}`: CVE-2006-3655,
   CVE-2010-0033, EDB-39395…; clusterfuzz do POI) só vão ao parser JS —
   **nunca** ao PowerPoint.
4. Oráculo PowerPoint só para `pptSafe` (1.301), com `AutomationSecurity=3`
   (macros desativadas à força), `DisplayAlerts=none`, ReadOnly, sem janela e
   watchdog que mata só a instância que ele abriu.
5. O *Office File Validation* recusou 3 `.ppt` reais do GovDocs
   (`gd-080346/153652/638272`) — nós os abrimos normalmente (parser JS em
   sandbox; ok).

## Robustez — excelente

- Leitura (Node, mesmo caminho do viewer): **1.407/1.445** abrem (os 119
  decks web modernos: 119/119, nenhum slide com erro); as 38
  falhas são fuzz/criptografados/PowerPoint 4.0 e falham com `PptFormatError`
  amigável. **Zero travamentos, zero exceções genéricas.**
- Render (viewer headless): **zero exceções/timeouts de pintura** nos 1.445.
- Exceções reais a corrigir:
  - `gd-171059.ppt`: o PowerPoint abre (12 slides), nós recusamos com
    "UserEditAtom ausente" → falta fallback de varredura quando a cadeia de
    persistência está quebrada.
  - `gd-089485`, `gd-551098`: "Compound File sem entrada raiz" (não testados no
    PowerPoint por segurança).
- O viewer **engole** erro de `readSlide` e mostra slide em branco
  (`universal-slides-viewer.ts`, `catch { slides.push({ shapes: [] }) }`)
  — deveria ao menos sinalizar.
- Desempenho: conversão de `.ppt` grandes chega a 6 s / 25 slides
  (`gd-509598`, `gd-526699`, `gd-544523`).

## Fidelidade — onde estamos

Métrica `blk` = % de blocos 8×8 cuja média diverge > 24 (ignora antialiasing).
6.603 slides comparados (até 12 por deck, 960 px).

| origem | slides | mediana blk% |
|---|---|---|
| `lo-` sintéticos | 742 | **1,3** |
| `web-` modernos | 874 | **5,6** |
| `poi-` | 691 | 12,7 |
| `gdx-` Office 2007/10 | 1.714 | 16,6 |
| `gd-` binários .ppt | 2.582 | **21,5** |

Os testes sintéticos escondem o problema: o mundo real — sobretudo temas do
Office 2007–2013 e `.ppt` — diverge muito.

## O que refinar (por impacto)

Contagens = quantos dos 1.326 decks (sem os web) usam o recurso (censo do XML,
`_lab/corpus-parse.ts`, tag p2). Com os 119 web (tag p3): spcPct 812, bgRef 703,
buClr 539, buFont-symbol 386, cap 361, WMF 286, EMF 165 (20 deles modernos),
baseline 244, tab 158, clrMap não padrão 70 + override 48; nos modernos
aparecem também SVG 25, Morph 7, Zoom 2, modelo 3D 1.

### P0 — o slide inteiro sai errado

1. **`<p:clrMap>` do master e `<p:clrMapOvr>` ignorados.** `theme.ts` usa mapa
   fixo `bg1=lt1, tx1=dk1`. Todo tema escuro (`bg1="dk1"`) troca fundo/texto.
   66 + 46 decks; **mediana 95,7% de divergência** com o recurso × 6,3% sem.
   Ex.: `gdx-037027`, `gdx-037832`, `web-en-uva-phys2415-faraday-induction`.
2. **`<p:bgRef idx>` não suportado** — fundo vindo do `bgFillStyleLst` do tema
   (sólido/degradê/imagem; idx ≥ 1001). `read.ts` só lê `<p:bgPr>`. 630 decks.
   Ex.: `gdx-036275` (degradê azul → branco), `poi-themes` (textura).
3. **`.ppt`: placeholders ganham fundo branco + borda preta.** O conversor
   aplica o default do MS-ODRAW (`fFilled`/`fLine` = true) quando o FOPT do
   slide não traz a propriedade e grava `solidFill FFFFFF` + `<a:ln>` explícitos
   (`ppt/shapeconv.ts` `fillXml`/`lineXml`); o placeholder do master tem
   `noFill`. Deveria omitir (herança do pptx). Afeta quase todo `.ppt` real.
   Ex.: `gd-013559`, `gd-011197`, `poi-missing_core_records`.
4. **WMF/EMF não são desenhados** (o `<img>` falha e fica um buraco). 278 decks
   com WMF, 145 com EMF (clip-art, gráficos/equações OLE colados, logos
   institucionais em templates modernos). Também TIFF (9), PICT (22) e `.wdp`
   (JPEG XR). O Write já tem `write/packages/docx-layout/src/{emf,wmf}.ts`, mas
   gera `PageItem` do docx-layout — extrair para `shared/` com saída neutra
   (lista de desenho) e consumir nos dois. Ex.: `gd-000165`, `gd-010668`
   (gráfico OLE), `gd-014920` (equações), `web-ja-kanagawa-u-template`.
5. **Imagem em placeholder (`<p:pic>` com `<p:ph type="pic">`) sem `xfrm`
   próprio some.** `readPic` não lê o `<p:ph>`, então a herança de geometria do
   layout (`read.ts` ~155) não se aplica. Padrão dos templates modernos.
   Ex.: `web-intl-who-hiap-communication-workshop` #4, `web-eu-eea-europe-environment-2025` #1.
6. **SmartArt sem cache `drawingN.xml`** (arquivos do Office 2007) vira bloco
   preto. Mínimo: não pintar nada / usar o texto; ideal: motor de layout de
   diagrama. Ex.: `gdx-073128` #8.

### P1 — texto e marcadores

7. **`spcBef`/`spcAft` em `spcPct`** ignorados (só `spcPts`) — **781 decks**
   (é o padrão de todo `.ppt` convertido e dos masters antigos).
8. **Marcadores:** fonte de símbolo (`buFont` Wingdings/Symbol → glifo PUA
   0xF0xx sai como letra/☐; precisa de tabela Wingdings/Symbol→Unicode ou fonte
   aberta equivalente) 359; `buClr` 480; `buSzPct/Pts` 304; `buBlip` 38;
   numeração (`buAutoNum`) perdida no `.ppt` (`gd-013559`).
9. **Run:** sobrescrito/subscrito (`baseline`) 232; `cap="all|small"` 332;
   runs em fonte Symbol (μ → m) 153; espaçamento de caractere (`spc`) 54;
   tachado; realce (`highlight`). O modelo `Run` hoje só tem
   sz/bold/italic/underline/color/font/hyperlink/shadow.
10. **`fillRef idx` 2/3** usa só a cor `phClr` sólida — deveria aplicar o
    `fillStyleLst` do tema (degradês). 70 decks. Idem `effectRef`.
11. **Tabulações** (`<a:tab>`) 145 decks.

### P2 — específicos

12. `.ppt`: rodapé/data/número aparecem quando o deck desliga
    (`gd-013559`, `gd-011197`); recuos do TextRuler; WordArt (`gd-661517`);
    espessura de linhas do master; fallback do `UserEditAtom`.
13. Modernos: Zoom de seção/slide (`pslz`) deveria usar a imagem de fallback
    do `mc:AlternateContent` (`web-gh-hta-learning-zoom-feature`); efeitos de
    imagem (escala de cinza, duotone, recolorir — `clrChange` 26, `duotone` 6);
    gráfico 3D (`gdx-243784`); reflexo/brilho.
14. Diagnóstico: sinalizar slide que falhou no `readSlide` em vez de branco.

## Reproduzir

Scripts em `E:\UniversalSlidesTest\_lab` (fora do git):

```
node _lab/zip-sample.mjs <url-zip> <dir> <n> [semente]     # amostra GovDocs por Range
run-ts.mjs _lab/triage.ts E:/UniversalSlidesTest           # triagem + manifest.json
run-ts.mjs _lab/corpus-parse.ts E:/UniversalSlidesTest <tag>  # robustez + censo
node _lab/ppt-driver.mjs E:/UniversalSlidesTest 12 [regex] # oráculo PowerPoint
node _lab/corpus-render.mjs <tag> 12 4 [regex]             # nosso render
node _lab/corpus-compare.mjs <tag>                         # métricas + worst.html
node _lab/sbs.mjs <tag> <id> <n> <out.png>                 # par lado a lado
```

`run-ts.mjs` = `slides/tools/ppt-lab/ppt-binary/run-ts.mjs`. Depois de cada
correção: rodar render+compare com nova tag e comparar medianas por origem.

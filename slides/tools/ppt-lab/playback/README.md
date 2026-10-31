# Lab de REPRODUÇÃO AUTOMÁTICA — PowerPoint × nosso player

Teste ponta a ponta da apresentação tocando **sozinha** (intervalos gravados,
como quiosque/"usar intervalos"): o PowerPoint real é o oráculo, capturado
**quadro a quadro**, e o nosso `<universal-slides-viewer>` é capturado nos
**mesmos instantes**. A comparação separa erro de **tempo** de erro **visual**.

```bash
# tudo (corpus só é gerado se faltar; oráculo só para o que falta)
node tools/ppt-lab/playback/run-playback.mjs
# um subconjunto / outra taxa / regerar o corpus / refazer o oráculo
node tools/ppt-lab/playback/run-playback.mjs --decks pb-tempo,showcase_animado --fps 30 --default-slide 3 --gen --force-ppt
# ver os relatórios (o <video> precisa de Range)
node tools/ppt-lab/playback/serve.mjs   # → http://127.0.0.1:8126/tools/ppt-lab/results/playback/index.html
```

Requisitos: Windows + PowerPoint 16 (COM), ffmpeg/ffprobe no PATH, Playwright
(Chromium) do workspace `slides`.

## Pipeline

| etapa | arquivo | o que faz |
|---|---|---|
| corpus | `gen-playback.ps1` | gera os decks `samples/playback/pb-*.pptx` **e** `.ppt` via COM (+ `showcase_animado.ppt`) |
| oráculo | `capture-ppt.ps1` | `Presentation.CreateVideo` (intervalos gravados, N fps, 720p, qualidade 100) → `ppt.mp4`; `ppt-manifest.json` (transição/intervalo/efeitos via COM); `ppt-slides/slideN.png` (estado final) |
| nosso | `capture-ours.mjs` + `harness.ts/html` | viewer em `play()` no Chromium headless sob **relógio virtual** (`page.clock`); cada quadro no instante exato do quadro do PowerPoint → `ours.mkv` sem perdas + `ours-timeline.json`. Vídeo/GIF em modo `media: 'seek'` (busca exata antes de cada quadro); `.ppt` abre pelo conversor de `slides-core/src/ppt` |
| compara | `compare-playback.mjs` | métricas + `report.html` por deck/formato + `index.html` |
| apoio | `inspect-timing.mjs`, `fonts.mjs`, `frames.mjs`, `serve.mjs` | modelo de tempo de um deck; fontes do SO (tema + typefaces) p/ o harness; leitura de vídeo; servidor com Range |
| diagnóstico | `diag-effects.mjs`, `strip.mjs`, `trans-curves.py`, `fade-curve.py`, `slide-phase.py` | ranking de efeitos por divergência; tira de quadros PowerPoint × nosso; curva de revelação por transição; curva de mistura do esmaecer; início real de cada slide no app (fase do esmaecer) |
| corpus feito à mão | `gen-graficos-partes.ps1` + `.py` | gráfico/SmartArt **por partes** (o COM não cria): o app gera o deck-base, o `.py` escreve o build no XML e o app **regrava** (.pptx + .ppt) — o arquivo regravado é a referência. Só o deck-base precisa de janela (`-Rebuild`) |
| F5 ao vivo | `f5-probe.ps1 [-Only A,H,…]` | **apresentação de verdade** (tela cheia — só com aval do usuário): deck-sonda + cenários (intervalo, clique adiantado, voltar, oculto, `advClick`, fim); estado do `SlideShowView` a cada ~15 ms e, nos cenários H–M, imagem SÓ da janela da apresentação (`PrintWindow`) → `_probe/f5/` |

Nada abre janela: o PowerPoint (COM) só roda quando falta o vídeo do oráculo
(`run-playback.mjs`); para comparar de novo sem tocar no PowerPoint, chamar
`capture-ours.mjs` e `compare-playback.mjs` direto (o oráculo fica em cache).

Saída: `tools/ppt-lab/results/playback/<deck>/<pptx|ppt>/` — `ppt.mp4`,
`ours.mkv`, `sbs.mp4` (PowerPoint | nosso | diferença), `keyframes/`,
`compare.json`, `report.html`.

## Métricas

Análise em 640×360, tolerância de canal 40 (como o `compare-deck.mjs`):

- **estrita** — quadro k do PowerPoint × quadro k nosso (mesmo instante): tempo + visual juntos;
- **alinhada** — cada quadro nosso × o quadro do PowerPoint mais parecido segundo
  um alinhamento temporal monotônico (DTW em miniaturas 16×9): só o visual;
- **tempo** — duração total e deslocamento do início de cada slide. O início no
  PowerPoint é o último quadro igual ao estado final do slide anterior
  (`Slide.Export`) quando esse estado é estático; senão, a estimativa do DTW
  (coluna "como" no JSON) — com transições 3D, que começam paradas, o início
  detectado atrasa e o deslocamento por slide fica ruidoso (a duração total não).
- `.ppt`: compara **PowerPoint(.ppt) × nosso player(.ppt)** (o `PptxPackage.load`
  converte o binário 97-2003). Se o nosso não abrir o arquivo, o relatório cai no
  "modo formato": **PowerPoint(.ppt) × PowerPoint(.pptx)** — o que o próprio
  formato perde.

## Semântica de tempo medida no PowerPoint (oráculo)

Medida quadro a quadro nos vídeos (decks de calibração + `pb-tempo`) e
implementada em `slides-core/src/timing.ts` + `playback.ts`:

1. **Relógio HÍBRIDO do export**: a linha do tempo (intervalos, animações) anda
   **33 ms por quadro** (10 s = 303 quadros), mas **transições e mídia contam
   quadros a 30/s** (1 s = 30 quadros = 990 ms de vídeo; meio quadro arredonda p/
   BAIXO: 0,75 s = 22 quadros). A captura nossa usa exatamente esses instantes
   (`tickMs: 33, transitionFps: 30`).
2. **Transição**: `p14:dur` vence; senão `spd` fast=500 / med=750 / **slow=1000** ms
   (o modelo v1 do viewer usa 300/500/1000 — errado p/ fast/med). Transições 2010+
   e durações fora dos 3 valores vêm em `mc:AlternateContent` (o parser v1 não vê).
   O 1º slide entra **a partir do preto**; o 1º quadro do vídeo é **sempre preto**
   (1º slide com corte seco entra 1 quadro depois).
3. **Fases em ticks**: as animações começam **2 ticks** após o fim da transição
   (inclusive corte seco; não no 1º slide sem transição); o slide termina em
   início das animações + max(D, A), arredondado p/ cima ao tick, **+1 tick**
   quando as animações passam do intervalo (A ≥ D).
4. **Intervalo**: D = `advTm` (sem ele, a "duração padrão" do export). Se as
   animações passam de D, o slide espera elas acabarem.
5. **Passos "ao clicar" disparam sozinhos**: a sobra max(0, D − A) vira K+1
   esperas iguais (antes de cada clique e depois do último).
6. **"Após o anterior" encadeia dinamicamente**: o `delay` gravado no sub-`par` é
   só cache; a reprodução começa quando o anterior termina de fato — **1 ms
   depois** (medido pela fase do esmaecer: só aparece quando o fim cai logo antes
   de um tick, ex. 3001 ms/6500 ms com 5–12 elos = 1 quadro a mais).
7. **Filhos do `mainSeq`**: só o 1º com `evt="onBegin"` é automático; qualquer
   outro (inclusive com `delay` numérico, como no `showcase_animado`) é um passo
   por clique — o atraso é ignorado.
8. **Texto por letra/palavra** (`<p:iterate>`): letras = caracteres **sem espaços**;
   se a forma tem **fundo visível** (preenchimento ou contorno — inclusive caixa de
   texto preenchida), o fundo é uma unidade inicial de duração cheia e anima
   (cor de preenchimento, esmaecer…): total = base + base + (n−1)·intervalo.
   Experimento controlado: o `<p:bldP animBg>` **não muda nada** (nem tempo nem
   visual); caixa de texto sem fundo nunca tem a unidade. (O cache de atraso
   gravado pelo PowerPoint omite esse fundo.) Efeito indefinido por letra
   ("revelar negrito"): só o espalhamento (n−1)·intervalo segura a sequência.
9. **"Cortar pelo preto"** dura o tempo da transição: metade no slide anterior,
   metade em preto. Corte seco é instantâneo mesmo com `p14:dur`.
10. Slides **ocultos** são pulados; **gatilhos interativos** não disparam sozinhos.
11. Cor: o MP4 do PowerPoint é YUV **BT.709 sem tag** — decodificar como BT.601
    desloca as cores em até 17 níveis (`frames.mjs` força BT.709).
12. **Mídia** (medida com vídeo/GIF de código de barras por quadro,
    `_probe/media`): antes do comando `playFrom` a forma mostra a **capa**; o vídeo
    começa **2 ticks** após o comando e anda **1/30 s por quadro**; o nó de mídia
    acaba em comando + duração, então o vídeo **congela** ~2 quadros antes do fim
    do arquivo (e o app ainda repete/pula um quadro de vídeo de vez em quando).
    O **GIF** anda desde o início das animações do slide, também a 1/30 s por
    quadro (100 ms = 3 quadros), e mostra o 1º quadro durante a transição.
13. **Transições 2D**, curvas medidas (`trans-curves.py`): revelar/dividir/faixas
    são rampas suaves do tamanho do slide; círculo/losango/mais suaves (faixa 0,5);
    empurrar ≈ cosseno; cobrir reto = ease de potência 3, diagonal = ease-out
    cúbico; descobrir reto termina em 90% do tempo, **diagonal** sai entre 7% e 38%;
    barras aleatórias de 2 px com início triangular em [0,18; 0,58]; persianas 12
    lâminas em 3D escalonadas; xadrez 10×6 por coluna; relógio/cunha com borda de
    ataque **esfumada** (rodas de 3+ raios: nítidas); **revelar suave**: o fundo funde
    linearmente e o conteúdo passa pela cor de fundo misturada (meio = só fundo).
14. **Repetir até o próximo clique** (`repeatCount="indefinite"` +
    `<p:endCondLst><p:cond evt="onNext">`): para quando o passo seguinte dispara;
    "até o fim do slide" = só `indefinite`. No `.ppt`, "indefinido" é FLT_MAX.
15. **Marcador de mídia** (`<p:cond evt="onMediaBookmark"><p14:bmkTgt bmkName>`,
    `<p14:bmk time>`): a sequência interativa dispara **sozinha** quando o vídeo
    passa pelo marcador (comando + 2 ticks + posição no relógio da mídia).
16. **Opções de vídeo** (código de barras): **corte** (`p14:trim st/end`, o comando
    grava a duração cortada) começa no ponto de corte; **esmaecer** (`p14:fade`)
    funde o vídeo SOBRE a capa e, depois do fim, fica a capa; **retroceder**
    (`fill="remove"` no nó) volta à capa; **ocultar parado** (`showWhenStopped="0"`)
    aparece no comando e some no fim; **tela cheia** (`<p:video fullScrn="1">`)
    cobre o slide enquanto toca; **repetir até parar** — o export **não** repete
    (toca até o fim do arquivo e congela); vídeo **vinculado** toca no app.
    Nos slides com essas opções o fim do slide cai ~3–6 quadros antes (o resto
    depois do comando parece contar no relógio da mídia) — não modelado.
17. O export ignora "apresentar **sem animação**" (`showAnimation="0"`).
18. O MP4 do export tem **buracos de carimbo** (ex.: 957 ms sem quadro): a leitura
    rawvideo (taxa constante) repete o quadro anterior — índice = tempo/33 ms.
    Ferramentas com `select(n)` precisam de `fps=1000/33` antes (o `strip.mjs` faz).
19. **Esmaecer** (`<p:fade/>`): a mistura segue **(1 − cos πp)/2**, não é linear
    (`fade-curve.py`: resíduo ~0 nos slides em fase); **pelo preto**: cada metade
    (sai o antigo, entra o novo) com a mesma curva. Como a curva é conhecida, a
    FASE do esmaecer mede o início real de cada slide com 0,1 quadro de precisão
    (`slide-phase.py`).
20. **Gráfico por partes** (`<p:graphicEl><a:chart seriesIdx categoryIdx bldStep>`,
    `<a:bldChart bld>`): cada parte (série, categoria, ponto) anima na **caixa das
    próprias marcas** — o "revelar" de uma série vai da base à coluna mais alta
    DELA, não do quadro do gráfico; o fundo (`gridLegend`: grade, eixos, legenda)
    usa o quadro.
21. **SmartArt por partes**: `<a:dgm id>` é o `modelId` da **forma do desenho**
    (`dsp:sp modelId` = ponto "pres" do modelo de dados). Com o id do NÓ de dados
    o app aceita e regrava o arquivo, mas **nada anima** (forma estática). Cada
    forma anima na própria caixa ("nível de uma vez" = todas juntas, cada uma na
    sua). No `.ppt` o SmartArt é uma IMAGEM e o metroBlob guarda o diagrama
    inteiro (`drs/e2oDoc.xml` + `drs/diagrams/*`): o app o reconstrói — e anima
    por partes. Gráfico no `.ppt` é objeto OLE (dados BIFF8, `convChart="1"`): o
    app converte de volta; nós mostramos a imagem.
22. **Fundo do gráfico**: `<c:chartSpace><c:spPr><a:noFill>` (padrão dos gráficos
    inseridos no PowerPoint 2013+) é transparente — sem `spPr`, branco.

## Apresentação AO VIVO (F5) — medida com `f5-probe.ps1`

O export de vídeo não mostra o apresentador; a sonda roda o F5 de verdade via COM
(`SlideShowSettings.Run`, `View.Next/Previous/GotoSlide`) e lê `GetClickIndex`,
`State` e `SlideElapsedTime`. Implementado em `slides-core/src/slideshow.ts`
(`SlideShow`) e no `present()` do viewer.

1. **Slide com intervalo** ("usar intervalos" ligado): os passos "ao clicar"
   disparam **sozinhos**, nos mesmos horários do export (K+1 esperas iguais) — 3 s
   e 3 cliques → 0,75 / 1,5 / 2,25 s, avanço em 3 s. O relógio começa no **fim**
   da transição (`SlideElapsedTime` fica 0 durante ela).
2. **Clique adiantado** só antecipa aquele passo: os horários dos outros e o
   avanço não mudam.
3. **Slide sem intervalo**: os passos esperam o clique; não avança sozinho.
4. **Comando durante a transição** (ida ou volta) conclui a transição na hora
   (o relógio do slide começa ali); não dispara passo.
5. **Voltar** (`Previous`): slide sem intervalo → desfaz um passo por vez; slide
   **com** intervalo → **rebobina** todos os passos por clique e o relógio para;
   o clique seguinte o recomeça do zero (avanço = esse clique + D). Sem passo a
   desfazer → slide visível anterior no **estado final**, pela transição do
   slide que **sai** tocada no **sentido contrário** (empurrar da direita volta
   pela esquerda; o esmaecer de 3 s do que sai dura 3 s); ali não avança mais
   sozinho.
6. Slide **oculto** é pulado nos dois sentidos; `GotoSlide` (pular) toca a
   transição do destino.
7. **"Avançar ao clicar" desligado**: clique de mouse (mensagem à janela) não
   troca de slide; `Next`/teclado troca. Clique de mouse dispara passo.
8. **Fim**: depois do último slide, tela preta com "Fim da apresentação de
   slides. Clique para sair." (texto de interface ~11 px numa tela de 1080, no
   topo, centralizado); o próximo comando sai.
9. Armadilhas da sonda: `SlideShowWindow.HWND` vem vazio — a janela é a
   `screenClass` do processo do PowerPoint; `Run()` só volta depois da
   transição do 1º slide (`GotoSlide` volta na hora); `Presentations.Add(0)`
   (sem janela) faz o `Run()` devolver nulo — reabrir com janela; o 1º clique
   automático de um slide SEM transição sai ~160 ms atrasado no app (latência,
   os seguintes caem no horário); `powershell -File` passa `-Only A,B` como
   um texto só.

## Corpus

| deck | cobre |
|---|---|
| `pb-transicoes-classicas` | 33 transições 2D (cortar, pelo preto, esmaecer, empurrar, revelar, dividir, formas, cobrir/descobrir, faixas, persianas, relógio, roda, cunha, quadriculado, dissolver, pente, manchete…), durações 0,5/1/2 s e default |
| `pb-transicoes-dinamicas` | 30 transições 3D/"empolgantes" (cair, cortinas, vento, fratura, origami, vórtice, cubo, galeria, portas, órbita…) + **Morph** |
| `pb-entrada` / `pb-enfase` / `pb-saida` | ~50 entradas, ~30 ênfases, ~30 saídas (duração default de cada efeito, após o anterior) |
| `pb-trajetorias` | 24 trajetórias (linhas, arcos, curvas, formas, laços), simultâneas |
| `pb-texto` | por parágrafo, por palavra, por letra (máquina de escrever), esmaecer/ocultar depois, ordem reversa, ênfase em texto, níveis |
| `pb-tempo` | gatilhos com/após, atrasos, durações, repetição, auto-reverter, retroceder, suavizar/quicar, cliques com/sem intervalo, intervalo 0, slide oculto, gatilho interativo, entra-sai-entra, transição longa, cortar pelo preto |
| `pb-midia` | vídeo e áudio com reprodução automática, GIF animado, gráfico, SmartArt, tabela, imagem (zoom + girar), grupo |
| `showcase_animado` | deck real existente (12 slides, ~400 efeitos) |
| **complemento** | |
| `pb-transicoes-variantes` / `-3d` | TODAS as demais direções/opções do enum `PpEntryEffect` (cobrir/descobrir diagonais, faixas, pente/xadrez/barras verticais, rodas de 2/3/8 raios, empurrar ↓→, revelar →/pelo preto, vórtice/ondulação/brilho/galeria/cubo/girar/caixa/órbita/panorâmica… em todas as direções), **Aleatória**, **Morph por palavra/caractere** |
| `pb-saida-2` / `pb-trajetorias-2` | as ~22 saídas e ~40 trajetórias restantes + trajetória desenhada (custom) |
| `pb-texto-2` | por 3º/4º/5º nível, ocultar no próximo clique, 2 colunas, texto vertical por letra, efeito diferente por parágrafo + ênfase num só, autoajuste + letras em ordem reversa |
| `pb-tempo-2` | repetir até o fim do slide / até o próximo clique, velocidade 2×, atraso maior que o intervalo, aumentar ×2 + auto-reverter + acelerar |
| `pb-midia-2` | vídeo de **código de barras** (cada quadro traz o número): corte, fade, loop, retroceder, ocultar parado, marcador disparando efeito, vinculado, tela cheia; áudio em 2º plano entre slides |
| `pb-graficos` | gráficos e SmartArt (sem animação: o COM recusa "por série/categoria/nó") |
| `pb-graficos-partes` | gráfico **por série, por categoria, por elemento da série/categoria** (colunas, pizza, linhas) e SmartArt **um a um, nível de uma vez, um a um invertido** — build escrito no XML e validado pelo app (`gen-graficos-partes.ps1`) |
| `pb-365` | ícone SVG (só `svgBlip`, sem PNG) e modelo 3D (glTF) |
| `pb-config` | "apresentar sem animação" (o export ignora) |

Todos em `.pptx` e `.ppt`. O modelo COM não expõe "por série/categoria" de
gráficos modernos nem "por nó" de SmartArt (`Invalid request`, inclusive
`AddEffect`/`ConvertToBuildLevel` com os níveis de diagrama): o
`pb-graficos-partes` escreve esses builds no XML e o app valida regravando.
Sem janela o COM também não expõe `SmartArtLayouts` (nem `AddChart2`) — por isso
os SmartArt do corpus usam só o layout padrão (blocos; sem conectores nem nós de
várias formas). Transições legadas (voar/espiar/rastejar/zoom/esticar) não são
válidas como transição (o COM recusa).

## Resultados (2026-10-06, 30 fps, duração padrão 3 s)

Nosso player × PowerPoint tocando o MESMO arquivo. Divergência = % de pixels
fora da tolerância (média dos quadros); 1 quadro = 33 ms.

| deck | .pptx estrita | .pptx alinhada | .pptx duração | .ppt estrita | .ppt alinhada | .ppt duração |
|---|---|---|---|---|---|---|
| pb-entrada | 1,26% | 1,10% | 0 | 1,26% | 1,10% | 0 |
| pb-enfase | 1,82% | 1,79% | −33 ms | 1,82% | 1,79% | −33 ms |
| pb-saida | 2,22% | 2,09% | 0 | 2,22% | 2,09% | 0 |
| pb-trajetorias | 2,59% | 1,32% | 0 | 2,59% | 1,32% | 0 |
| pb-texto | 2,25% | 2,25% | 0 | 2,25% | 2,25% | 0 |
| pb-tempo | 1,95% | 1,74% | 0 | 1,79% | 1,64% | 0 |
| pb-midia | 4,96% | 1,99% | −33 ms | 2,19% | 2,18% | −33 ms |
| showcase_animado | 2,56% | 2,23% | −33 ms | 3,95% | 3,91% | 0 |
| pb-transicoes-classicas | 7,21% | 5,79% | 0 | 6,12% | 5,48% | 0 |
| pb-transicoes-dinamicas | 27,88% | 25,29% | 0 | 2,92% | 2,92% | 0 |
| **complemento** | | | | | | |
| pb-saida-2 | 1,74% | 1,62% | 0 | 1,74% | 1,62% | 0 |
| pb-trajetorias-2 | 3,28% | 1,48% | 0 | 3,28% | 1,48% | 0 |
| pb-texto-2 | 1,66% | 1,66% | 0 | 1,68% | 1,68% | 0 |
| pb-tempo-2 | 1,99% | 1,47% | 0 | 1,97% | 1,45% | 0 |
| pb-midia-2 | 11,85% ² | 1,35% | 0 | 0,85% | 0,85% | 0 |
| pb-graficos | 3,97% | 3,97% | 0 | 1,20% | 1,20% | 0 |
| pb-graficos-partes | 2,84% | 2,82% | 0 | 8,70% | 8,31% | 0 |
| pb-365 | 0,72% | 0,72% | 0 | 0,72% | 0,72% | 0 |
| pb-config | 1,78% | 1,62% | 0 | 1,78% | 1,62% | 0 |
| pb-transicoes-variantes | 8,23% | 6,40% | 0 | 6,88% | 5,91% | 0 |
| pb-transicoes-variantes-3d | 29,84% | 27,86% | 0 | 3,47% | 3,47% | 0 |

² slides com opções de vídeo terminam 3–6 quadros antes no app (item 16):
a deriva acumula; a métrica alinhada (1,35%) mostra que o conteúdo bate.
O slide "2 colunas" do `pb-texto-2.ppt` (antes −3036 ms) tem a árvore PPT10 vazia;
o conversor agora usa o `<p:timing>` original do round-trip
(`RoundTripAnimationAtom12` → `drs/timingInfo.xml`), como o app.

Histórico: antes deste lab o viewer não tinha reprodução automática; a 1ª rodada
(só esmaecer + modelo de tempo ingênuo) deu estrita 15,1% / alinhada 10,8% no
conjunto, ênfase 15,7%, trajetórias 12,4%, clássicas 16,3% e −1,24 s na ênfase.

`.ppt` no próprio PowerPoint (× .pptx): transições 2010+ (vórtice, cubo, revelar,
flash, Morph…) viram **esmaecer 1 s**; durações caem para fast/med/slow (2 s → 1 s);
as animações do showcase e o "tocar vídeo" do pb-midia **somem** — por isso as
dinâmicas em .ppt batem fácil (o nosso conversor reproduz a mesma perda).

## Lacunas do nosso player (por impacto medido)

1. **Transições 3D / "empolgantes"** (cubo, vórtice, galeria, portas, órbita…) e
   **Morph** (inclusive por palavra/caractere) — aproximações 2D ou esmaecer
   cruzado (dinâmicas ~25%, variantes 3D ~28%).
2. **Transições 2D residuais**: quadriculado (13–17%: o app gira as peças em
   PERSPECTIVA), pente vertical (~23%: o app empurra as tiras e acaba antes),
   rodas de 3/8 raios (13–19%), **aleatória** (sorteio do app), dissolver/barras
   aleatórias (aleatórios no app).
3. **Gráfico no `.ppt`**: é objeto OLE (BIFF8) e o app o converte de volta em
   gráfico (e anima por partes) — nós mostramos a imagem estática (~11–12% nesses
   slides). SmartArt com conectores/nós de várias formas não foi medido (ver
   Corpus). Borda esfumada do "revelar" só na forma inteira e nas partes de
   gráfico — por parágrafo/letra ainda é seca; os demais filtros (dividir,
   persianas, círculo…) não foram medidos quanto à borda.
3b. **Fim de slide ±1 quadro** residual: o slide 3 do `pb-enfase` (ênfases com
   repetição/auto-reverter: provavelmente os elos internos também somam 1 ms) e
   −33 ms no `showcase`/`pb-midia` (`slide-phase.py` mede o início de cada slide).
4. **"Crescer com cor" por letra**: o app re-diagrama a linha quando cada letra
   cresce (`style.fontSize` por unidade) — hoje só a cor anda.
5. **Mídia**: fim de slide com opções de vídeo (3–6 quadros); vídeo VINCULADO fora
   do pacote não toca no navegador (fica a capa); "repetir até parar" só repete no
   modo tempo real; fade de áudio; o vídeo termina ~1 quadro depois do app.
6. **`.ppt`**: imagens EMF/WMF/PICT não são desenhadas; vídeo/áudio de `.ppt` só
   como capa; animações SÓ no formato legado (AnimationInfo, sem PPT10 nem XML de
   round-trip — arquivos 97-2003 genuínos) não convertem.
7. Modo manual ainda usa o modelo v1 (`spd` 300/500, sem `mc:AlternateContent`,
   `<p:timing>` de 3 níveis do PowerPoint não é lido) — unificar com `timing.ts`.

## Limitações do teste

- O oráculo é o **export de vídeo**; a duração total medida ao vivo (estado da
  janela de apresentação via COM) bateu com o vídeo (10,57 s × 10,6 s no
  `pb-trajetorias`). Gravação de tela ao vivo foi descartada: depende de nada
  cobrir a janela e captura o resto da área de trabalho.
- `dissolver`/`barras aleatórias` são aleatórios no PowerPoint — não há como bater
  pixel a pixel.
- Texto estático já diverge ~2–3% (métricas de fonte); isso aparece como piso da
  métrica alinhada.

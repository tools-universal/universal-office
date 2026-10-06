# Lab de REPRODUÇÃO AUTOMÁTICA — PowerPoint × nosso player

Teste ponta a ponta da apresentação tocando **sozinha** (intervalos gravados,
como quiosque/"usar intervalos"): o PowerPoint real é o oráculo, capturado
**quadro a quadro**, e o nosso `<universal-presentation-viewer>` é capturado nos
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
| diagnóstico | `diag-effects.mjs`, `strip.mjs`, `trans-curves.py` | ranking de efeitos por divergência; tira de quadros PowerPoint × nosso; curva de revelação por transição |

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
   **33 ms por quadro** (10 s = 303 quadros), mas **transições, duração padrão e
   mídia contam quadros a 30/s** (1 s = 30 quadros = 990 ms de vídeo). A captura
   nossa usa exatamente esses instantes (`tickMs: 33, transitionFps: 30`).
2. **Transição**: `p14:dur` vence; senão `spd` fast=500 / med=750 / **slow=1000** ms
   (o modelo v1 do viewer usa 300/500/1000 — errado p/ fast/med). Transições 2010+
   e durações fora dos 3 valores vêm em `mc:AlternateContent` (o parser v1 não vê).
   O 1º slide entra **a partir do preto**; o 1º quadro do vídeo é **sempre preto**
   (1º slide com corte seco entra 1 quadro depois).
3. **Fases em ticks**: as animações começam **2 ticks** após o fim da transição
   (inclusive corte seco; não no 1º slide sem transição); o slide termina em
   início das animações + max(D, A), arredondado p/ cima ao tick, **+1 tick**
   quando as animações passam do intervalo (A ≥ D).
4. **Intervalo**: D = `advTm`; sem ele, a "duração padrão" do export **em quadros
   a 30/s** (3 s = 90 quadros, não 91). Se as animações passam de D, o slide
   espera elas acabarem.
5. **Passos "ao clicar" disparam sozinhos**: a sobra max(0, D − A) vira K+1
   esperas iguais (antes de cada clique e depois do último).
6. **"Após o anterior" encadeia dinamicamente**: o `delay` gravado no sub-`par` é
   só cache; a reprodução começa quando o anterior termina de fato.
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
    cúbico; descobrir termina em 90% do tempo; barras aleatórias de 2 px com
    início triangular em [0,18; 0,58]; persianas 12 lâminas em 3D escalonadas;
    xadrez 10×6 por coluna.

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

Todos em `.pptx` e `.ppt`. O modelo COM não expõe "por série/categoria" de
gráficos modernos nem "por nó" de SmartArt (`Invalid request`): animam inteiros.

## Resultados (2026-10-06, 30 fps, duração padrão 3 s)

Nosso player × PowerPoint tocando o MESMO arquivo. Divergência = % de pixels
fora da tolerância (média dos quadros); 1 quadro = 33 ms.

| deck | .pptx estrita | .pptx alinhada | .pptx duração | .ppt estrita | .ppt alinhada | .ppt duração |
|---|---|---|---|---|---|---|
| pb-entrada | 1,55% | 1,10% | −33 ms | 1,55% | 1,10% | −33 ms |
| pb-enfase | 1,83% | 1,78% | −33 ms | 1,83% | 1,78% | −33 ms |
| pb-saida | 2,67% | 2,08% | −66 ms | 2,67% | 2,08% | −66 ms |
| pb-trajetorias | 2,59% | 1,34% | 0 | 2,59% | 1,34% | 0 |
| pb-texto | 2,26% | 2,26% | 0 | 2,26% | 2,26% | 0 |
| pb-tempo | 2,42% | 1,79% | −33 ms | 2,34% | 1,69% | −33 ms |
| pb-midia | 5,40% | 2,24% | −33 ms | 2,26% | 2,19% | −33 ms |
| showcase_animado | 2,98% | 2,26% | +198 ms | 4,06% | 3,99% | 0 |
| pb-transicoes-classicas | 7,43% | 6,04% | 0 | 6,18% | 5,55% | 0 |
| pb-transicoes-dinamicas | 27,89% | 25,29% | 0 | 2,94% | 2,95% | 0 |

Histórico: antes deste lab o viewer não tinha reprodução automática; a 1ª rodada
(só esmaecer + modelo de tempo ingênuo) deu estrita 15,1% / alinhada 10,8% no
conjunto, ênfase 15,7%, trajetórias 12,4%, clássicas 16,3% e −1,24 s na ênfase.

`.ppt` no próprio PowerPoint (× .pptx): transições 2010+ (vórtice, cubo, revelar,
flash, Morph…) viram **esmaecer 1 s**; durações caem para fast/med/slow (2 s → 1 s);
as animações do showcase e o "tocar vídeo" do pb-midia **somem** — por isso as
dinâmicas em .ppt batem fácil (o nosso conversor reproduz a mesma perda).

## Lacunas do nosso player (por impacto medido)

1. **Transições 3D / "empolgantes"** (cubo, vórtice, galeria, portas, órbita…) e
   **Morph** — aproximações 2D ou esmaecer cruzado (dinâmicas ~25%).
2. **Transições 2D residuais** (clássicas ~6%): persianas/xadrez em 3D,
   dissolver/barras aleatórias são aleatórios no app.
3. **SmartArt/gráfico animados** (pb-midia M4/M5) e a sequência de animações do
   showcase (+198 ms).
4. **"Crescer com cor" por letra**: o app re-diagrama a linha quando cada letra
   cresce (`style.fontSize` por unidade) — hoje só a cor anda.
5. **Mídia**: corte (`p14:trim`), "tocar entre slides", fade de áudio, vídeo
   vinculado externo; o vídeo termina ~1 quadro depois do app.
6. **`.ppt`**: imagens EMF/WMF/PICT não são desenhadas; vídeo/áudio de `.ppt` só
   como capa; animações só do PowerPoint 97/2000 (sem dados PPT10) não convertem.
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

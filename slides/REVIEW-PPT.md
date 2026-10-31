# Revisão de fidelidade 1:1 — Universal Slides × app de referência

## Auditoria 2026-07-25 — decks de ESTRESSE gerados por COM + loop de diff

Novo ferramental (`tools/ppt-lab/`): `gen-stress.ps1` (PowerPoint COM gera 4
decks cobrindo o máximo de recursos + exporta PNG 1280×720 por slide + extrai
XML), `render-deck.mjs` (renderiza no `<universal-slides-viewer>` headless
em tamanho EXATO via `renderSlideToCanvas` — sem chrome), `compare-deck.mjs`
(diff pixel a pixel, tolerância 40/canal, relatório `report.html` lado a lado).

Decks: `samples/stress-{shapes,text,table-chart,media}.pptx` (18 slides).
**Divergência média: 14.00% → 3.96%** na rodada. Correções guiadas pelo oráculo:

1. **Gradiente 1:1**: `<a:lin scaled="1">` — a direção transforma de forma
   COVARIANTE `(cos·h, sin·w)` (45° em 16:9 fica mais íngreme, não mais raso);
   interpolação de stops em **RGB LINEAR** (γ≈2.2) via substops — o canvas
   interpola em sRGB e escurecia o meio. Fundo gradiente: 69% → 1.1%.
2. **`a:tint`/`a:shade` em espaço LINEAR** e semântica correta de tint
   (val = fração da COR; 40% accent1 ⇒ #CAD1D7, não #A1BFCD).
3. **Estilos de tabela** (`table-style.ts`): `ppt/tableStyles.xml` +
   `<a:tblPr firstRow bandRow>` → fills de header/banding, texto branco/bold do
   header, bordas lt1; células herdam `defaultTextStyle` (13.5pt Aptos — medido
   por COM) + `otherStyle` + tcTxStyle. Âncora default de célula = TOPO.
   Tabela: 42% → 2.2%.
4. **Charts**: paleta = accents do TEMA (não Office 2013 hardcoded); título
   15.5pt `#595959` centrado; legenda inferior/superior CENTRADA (categorias em
   pie/doughnut, séries nos demais); `holeSize` (default 75%); separador branco
   entre fatias; `gapWidth`/`overlap` do XML (defaults 219/-27); ticks "nice"
   com headroom 1.05 (máx 5 ⇒ eixo 6); radar de LINHAS com anéis/labels
   (radarStyle standard vs filled); scatter com X REAL de `<c:xVal>` + grid
   vertical; decimais pt-BR ("0,5"); área. Radar+scatter: 12.6% → 2.65%.
5. **Geometrias novas**: octagon, donut (evenodd), moon, heart (béziers),
   lightningBolt (path 21600), sun (raios+disco), can, cube — via novo kind
   `path` genérico em `geometry.ts`. Formas: 11.1% → 5.4%.
6. **Fix de bug**: precedência em scatter (`vals[i] ?? 0 - min`).

Pendências da rodada (por % restante): variantes de gradiente do slide 2 de
shapes (FromCorner/FromCenter → radial), conectores elbow/curve + setas de
linha, sombras/freeform do slide 4, autofit/texto vertical (text slide 3),
combo bar+line (slide 5), fontes de eixo do bar (slide 2 de charts).

## Rodada 2 (mesma data) — **3.96% → 2.83%** de divergência média

1. **Gradiente radial** (`<a:path path="rect|circle|shape">` + fillToRect):
   pos 0 = centro; substops em RGB linear compartilhados com o linear.
2. **`lumMod`/`lumOff` em luminância HSL** (não sRGB): o "claro" de tema
   (lumMod 60% + lumOff 40%) fica VÍVIDO como no app de referência.
3. **`<a:ln><a:noFill/>`** bloqueia o fallback do `lnRef` (elipses sem borda);
   largura do `lnRef idx` resolvida pelo `<a:lnStyleLst>` do tema (12700/19050/25400).
4. **custGeom (freeforms)**: parse de pathLst (moveTo/lnTo/cubicBez/quadBez/
   close) escalado ao xfrm — o freeform do slide 4 deixou de virar retângulo.
5. **arc/blockArc** (arc é stroke-only) + **pentagon/star5 normalizados ao
   bounding box** (o app de referência escala o polígono, não inscreve na elipse).
6. **Layout de chart calibrado por MEDIÇÃO** (título 16u, gap 20u, eixo 2.4·label,
   legenda label+20u; pizza: 97% do plot, centro −1.2%h; separador 2px):
   pizza 10.5%→1.2%, área 7.3%→4.1%. Engine re-sincronizada no sheet-core.

Piores restantes: bar/line 6.2% (métrica de fonte de eixo), shapes slide1 4.9%
(sombreado 3D de can/cube, moon/sun finos), autofit 4.8%.


Metodologia espelhada do `sheet/REVIEW-EXCEL.md`: o app de referência (PowerPoint
real, via COM) é o oráculo; a especificação é o XML que ele emite. Aqui
documentamos as auditorias do **showcase animado** do usuário e o que foi
fechado em cada rodada.

## Auditoria 2026-06-20 — `showcase_animado.pptx` (oráculo do usuário)

`samples/showcase_animado.pptx` foi copiado de
`{User}\OneDrive\Documentos\showcase_animado.pptx` (344 448 bytes, 12 slides,
4 gráficos embutidos, 26 imagens, animações declaradas em `<p:timing>`).

### Inventário do showcase (verificado nesta rodada)

```
12 slides + 1 slideMaster + 1 slideLayout + 12 notesSlides
Content_Types declara 12 slideMasterN como Override, mas o pacote contem
APENAS slideMaster1.xml — todos os slides resolvem ao MESMO master.
```

| Slide | Conteúdo | Status | Lacuna |
|---|---|---|---|
| 1 | bg image (`<p:bgPr><a:blipFill>`) + 1 `<p:pic>` (foguete) + 3 textos + 3 elipses (cores) | **✓ render 1:1 com a fonte** | — |
| 2 | título + 6 cards com 6 `<p:pic>` (ícones) + 12 textos | **✓ render 1:1** | — |
| 3 | título "Formatacao de texto rico" + textos com runs (`b`/`i`/`color`) | ✓ via `paintText` |  |
| 4 | "Formas, linhas e transparências" — 8 `<p:sp>` com `prstGeom` ellipse/rect | ✓ formas + cores via theme | gradientes/transparência ainda não |
| 5 | "Gráficos nativos e editáveis" + 1 `<p:graphicFrame>` (chart1) | ✗ chart não desenha (só o título aparece) | **engine de chart** |
| 6 | "Radar e dispersão com estatística" + 1 chart | ✗ chart não desenha | **engine de chart** |
| 7 | "Tabelas com células mescladas" + 1 `<p:graphicFrame>` (`<a:tbl>`) | ✗ tabela não desenha | parse `<a:tbl>` + render |
| 8 | 4 variantes da MESMA `<p:pic>` (recorte circular, rot 20°, alpha 45%, espelhada) | △ imagens aparecem mas **sem efeitos** | crop ellipse / `xfrm.rot` / alpha / `xfrm.flipH` |
| 9 | hyperlinks + várias `<p:pic>` (anotações) | ✓ texto + imagens | links clicáveis não |
| 10 | bullets diversos / numeração | ✓ paragrafos + bullets simples | nivelamento (`a:pPr lvl`) + tipos de bullet |
| 11 | imagens + textos | ✓ render 1:1 |  |
| 12 | encerramento com `<p:pic>` | ✓ render 1:1 |  |

### Entregue 2026-06-20 — Engine de chart (commit pendente)

11. **`<p:graphicFrame>` + charts**: leitura no `readShapes` → resolve `r:id`
    via `slideRels` → carrega XML do chart como `Shape.chartXml`.
12. **Engine de chart compartilhada** (`chart-engine.ts` em `slides-core`,
    duplicada em `sheet-core` pela separação de monorepos):
    - bar/line/pie/doughnut/scatter/radar — todos pintados.
    - Cores 1:1: `<c:ser><c:spPr><a:solidFill><a:srgbClr val>` vencem paleta default
      (verificado: série "Receita" do slide 5 sai com #028090 como no PowerPoint).
    - Combo (bar+line no mesmo plotArea) detectado e perSeriesType anotado.
13. **Slide 5 do showcase renderiza 1:1**: título "Gráficos nativos e editáveis"
    + chart bar "Receita vs Meta (combo)" + doughnut "Distribuição" lado a lado,
    cores corretas, valores corretos. Slide 6 (radar "Comparativo") + slide 7
    (scatter "Dispersão + linha de tendência") também rodam.
14. **+1 teste** (`slides 5/6/7 leem <p:graphicFrame> com chart`): valida título
    extraído, tipo detectado e cor explícita da série. **Total Slides: 10/10 verde**.

### Entregue 2026-06-20 — efeitos do `<p:pic>` + edição de texto (commit pendente)

7. **Transformações por shape**: `xfrm.rot` (em 1/60000 de grau), `xfrm.flipH`,
   `xfrm.flipV` aplicados via `ctx.save/translate/rotate/scale/restore` em torno
   do centro geométrico — alvo: slide 8 do showcase, que tem 4 variantes do
   mesmo pic com rot=20°, alpha=45%, flipH=true. **Verificado no modelo**
   (`pics[1].xfrm.rot === 1200000` etc.) e no paint via build verde.
8. **Alpha por imagem** (`<a:blip><a:alphaModFix amt="..."/></a:blip>`):
   parse de `amt` (milésimos de %) → `Shape.alpha` (0..1); aplicado como
   `globalAlpha` no renderer.
9. **Edit mode v1**: double-click numa shape com `txBody` cria
   `<div contenteditable>` over the `xfrm` rect, com fonte/cor/align herdados
   do primeiro run; Enter/Esc commitam/cancelam; commit escreve de volta no
   `txBody.paragraphs` (1 paragrafo por linha, runs preservam font/sz/color/bold
   do primeiro run original). Pendência v2: diff por offset preserva runs
   internos (formatação por trecho).
10. **+1 teste** ancorado em slide 8: as 4 variantes de pic com `rot=1200000`
    / `alpha≈0.55` / `flipH=true` (`9/9 verde`).

### Entregue nesta auditoria (commit pendente)

1. **Imagens `<p:pic>` 1:1**: parse de `<p:nvPicPr>/<p:blipFill r:embed>/<p:spPr xfrm>`,
   resolve bytes via rels do slide, decodifica em paralelo no cache do componente,
   pinta com `drawImage` no `xfrm` do slide. Z-order respeitado (varre `<p:spTree>`
   em ordem de documento, alternando `<p:sp>`/`<p:pic>`/`<p:grpSp>`).
2. **Background image dos slides** (`<p:bg><p:bgPr><a:blipFill>`): desenhada
   por baixo das shapes (slide 1 do showcase deixa de aparecer todo branco
   e passa a mostrar a imagem dark com SHOWCASE/Recursos do PowerPoint).
3. **`Shape.srcRect`** (crop em milésimos de %): parse pronto e propagado para
   `drawImage(sx, sy, sw, sh, …)`. Efeitos visuais que dependem de `srcRect`
   redondo / rotação / alpha ainda PENDENTES (task #6).
4. **Chrome do demo (PowerPoint-style)**: header com menus
   Arquivo/Inserir/Apresentar (dropdowns), título editável, dark mode toggle,
   primary "Abrir .pptx", toolbar com undo/redo + prev/next + "▶ Apresentar"
   (F5 fullscreen do stage), **sidebar de miniaturas** (220px, click → seleciona,
   active highlight), footer com slide counter "N / 12" + prev/next, drag-and-drop
   `.pptx`, atalhos Ctrl+O / Ctrl+S / Ctrl+P / F5 / Shift+F5.
5. **Public API**: `renderThumbnail(i, canvas)`, `getSlideIndex()`,
   eventos `us-loaded`, `us-slide`, `us-image`.
6. **4 testes pinados em `showcase_animado.pptx`**
   (`slides-core/test/roundtrip.test.ts`):
   - Round-trip do pacote preserva `ppt/media/Slide-1-image-1.png` +
     `ppt/charts/chart1.xml` byte a byte.
   - 12 slides + 1 master + 1 layout (rejeita interpretação errada do
     Content_Types).
   - Slide 1: `bgImage` resolvida com `mime = image/png` + 1 `<p:pic>` em
     `(5852160, 777240, 502920, 502920)` + textos "SHOWCASE" e "Recursos do
     PowerPoint" + **z-order** (`<p:pic>` antes do primeiro `<p:sp>`).
   - Inventário pic-por-slide: `[1, 2, 8, 9, 11, 12]` (exato), todos com bytes > 0.

### Próximas lacunas priorizadas (com IDs de tasks da sessão)

- **#5** — `<p:graphicFrame>` charts (slides 5/6/7). **Engine compartilhada com Sheet** (showcase.xlsx Graficos).
- **#6** — Efeitos do `<p:pic>` (slide 8): crop circular, rotação `xfrm.rot/60000`, alpha `a:alphaModFix`, `xfrm.flipH/V`.
- **#7** — Notes panel (notesSlide1..12), cascade `lstStyle/txStyles`, timeline de animação (`<p:timing>` declara 12 sequências `entr` por slide — o showcase é literalmente "animado").
- **#10** — Edit mode (compartilhado com Sheet).

## Como reproduzir

```bash
# build
npm install --prefix slides
npm run build --prefix slides/packages/slides-core
npm run build --prefix slides/packages/slides
# testes
npm test --prefix slides/packages/slides-core   # 8/8 passa, inclui showcase_animado
# demo
npm run build:demo --prefix slides/packages/slides
node slides/tools/dev-server.mjs     # http://127.0.0.1:8125/packages/slides/demo/
```

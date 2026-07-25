# Plano — `<universal-presentation-viewer>` (modo visualização abstraído)

## Análise (2026-07-25)

Estado atual: `<universal-slides>` (packages/slides) mistura três papéis num só
elemento — (a) **visualização** (fit EMU→px, paint via `paintSlideTo`, cache de
imagens, navegação, thumbnails, animações, transições, hyperlinks), (b)
**edição** (dblclick → contenteditable, commit em `txBody`) e (c) nada de
chrome (o chrome vive no demo). A pintura já é pura (`paintSlideTo` em
slides-core). O lab COM (`tools/ppt-lab`) tem oráculo PowerPoint 16.0
funcionando (verificado hoje) e render headless Playwright.

## Decisões

1. **Novo pacote `packages/viewer` → npm `@universal/presentation-viewer`**,
   elemento `<universal-presentation-viewer>` (classe
   `UniversalPresentationViewerElement`). Depende só de `@universal/slides-core`.
   É o artefato de visualização embarcável (site, electron, terceiros) sem
   arrastar código de edição.
2. **`<universal-slides>` passa a HERDAR do viewer** (subclasse registra outra
   tag). API pública atual preservada por herança (`loadPptx`, `selectSlide`,
   `next/prev`, `renderThumbnail`, eventos `us-*`). Campos privados do viewer
   viram `protected` para a subclasse (edição precisa de `fit`, `wrap`,
   `slides`, `paint`).
3. **API do viewer** (só visualização):
   - `loadPptx(bytes)`, `src` attr (fetch por URL), `getSlideCount/Index`,
     `selectSlide`, `next/prev`, `renderThumbnail(i, canvas)`,
     `replayAnimation()`, `present()` (fullscreen), eventos
     `us-loaded/us-slide/us-image`.
   - Hook protegido `suppressTextShapeIdx` + `onShapeDblClick` para a subclasse.
4. **Decks de estresse gerados por COM** (`tools/ppt-lab/gen-stress.ps1`), com
   PNGs de referência via `Slide.Export`:
   - `stress-shapes.pptx` — geometrias preset em grade, fills sólido/gradiente/
     transparência, dashes, setas, sombra, rotação/flip, conectores.
   - `stress-text.pptx` — tamanhos, b/i/u/strike, sub/sobrescrito, cores,
     bullets multiníveis, buAutoNum (variantes), alinhamentos, âncoras,
     entrelinha, indents, autofit, wrap off, caps.
   - `stress-table-chart.pptx` — tabela com merges/fills/bordas; bar/line/pie/
     doughnut/scatter/radar/área/combo.
   - `stress-media.pptx` — imagens (crop/rot/flip/alpha/borda), fundo gradiente
     e imagem, grupos aninhados, WordArt, hyperlink, número de slide/rodapé.
5. **Loop de fidelidade**: `render-slides.mjs` generalizado (path do .pptx por
   argumento) + `compare.mjs` (pngjs, % de pixels divergentes por slide, relatório
   HTML lado a lado em `results/report.html`). Corrigir slides-core gap a gap;
   registrar cada rodada no REVIEW-PPT.md.
6. **Integração Electron**: demo continua com `<universal-slides>` (que JÁ é o
   viewer por herança) e o palco de apresentação (F5) passa a usar uma instância
   dedicada `<universal-presentation-viewer>` — prova real da abstração. App
   Electron aberto e verificado com screenshot.

## Etapas com revisão

| # | Etapa | Revisão |
|---|---|---|
| 1 | Extrair viewer (pacote novo + herança) | build + testes verdes + demo intacto |
| 2 | Decks de estresse COM + PNGs de referência | abrir XML extraído, conferir inventário |
| 3 | Loop 1:1 (comparar, corrigir, repetir) | % divergência por slide caindo; REVIEW-PPT.md |
| 4 | Integração Electron | screenshot do app rodando |

Depois (fase 2, fora deste plano): gaps Sheets×Excel 1 a 1 + planilhas gigantes
(performance/RAM).

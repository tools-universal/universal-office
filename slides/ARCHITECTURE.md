# Universal Slides — Arquitetura

Apresentação **1:1 compatível com o app de referência**: mesmo formato
(`.pptx` / PresentationML + DrawingML), mesma renderização em tela. Irmão do
UniversalWrite (Write) e do UniversalSheet (Sheet) no monorepo Universal Office —
**mesma metodologia, mesmo rigor**.

Princípio organizador (do Write/Sheet): **abstrair cedo é o que quebra a
compatibilidade**. O modelo interno espelha o OOXML literalmente; quem inventa um
modelo "bonito" perde fidelidade.

## Regra de Ouro — round-trip sem perdas

Um `.pptx` é um ZIP de partes (OPC). `PptxPackage` preserva toda parte **byte a
byte** e só regenera o que uma edição modifica de fato; a ordem das partes é
preservada (diffs limpos). Partes/atributos desconhecidos fluem intactos.

## Metodologia — a apresentação de referência como oráculo

A especificação é o **comportamento observado da apresentação de referência**, capturado por
automação COM (`New-Object -ComObject PowerPoint.Application`).

- `tools/ppt-lab/gen-reference.ps1` dirige o app de referência: cria um deck
  (título, título+conteúdo com bullets, blank com textbox + retângulo colorido),
  salva `.pptx` (`SaveAs ..., 24`) e **extrai/indenta o XML** — o XML É a spec de
  como o app de referência materializa slides/formas/texto/geometria.
- `tools/ppt-lab/render-slides.mjs` renderiza nosso `<universal-slides>` headless;
  `Slides.Item(i).Export(... "PNG" ...)` exporta os PNGs da apresentação de referência para
  **comparação lado a lado** (fidelidade de pixel).

## Unidades

- Geometria em **EMU** (English Metric Units): 914400/polegada, 12700/ponto.
  EMU→px@96dpi = EMU/9525.
- Tamanho de fonte (`sz`) em **centésimos de ponto** (`sz="2800"` = 28pt).
- Tamanho do slide em `<p:sldSz cx cy>` (EMU). 16:9 onscreen = 9144000×5143500.

## Pacotes (npm workspaces)

| Pacote | npm | Propósito |
|---|---|---|
| **slides-core** | `@universal-office/slides-core` | Modelo + parse OOXML. `PptxPackage` (container lossless), `parseXml`, `readPresentation`/`readSlide`, resolução de tema/cor (DrawingML), herança de geometria de placeholder (layout/master). |
| **slides** | `@universal-office-pro/slides` | Webcomponent `<universal-slides>` — renderiza cada slide em canvas (fundo, formas, preenchimento, contorno, texto com âncora/alinhamento/fonte). |
| **export** | `@universal-office/slides-export` | Exportadores `.pptx bytes → saída` (browser+node, SEM vídeo): `pptxToMarkdown` (headings/bullets/tabelas GFM/notas), `pptxToHtml` (sections estáticos, shapes em %), `pptxToPdf` (vetorial, 1 página/slide, fontes TTF obrigatórias via `@universal-office/pdf`), `pptxToImages` (1 PNG/slide via `paintSlideTo`; em node exige factory de canvas injetada). |

A pintura de slide é a função PURA `paintSlideTo(ctx, slide, resources, scale)`
(`slides-core/src/render.ts`): recebe imagens JÁ decodificadas via
`Map<part, imagem>` — o webcomponent, as miniaturas e o `pptxToImages` usam a
MESMA função (uma só fonte de verdade do paint).

## Pipeline de renderização

```
.pptx bytes
   │  PptxPackage.load (fflate unzip)
   ▼
PptxPackage (parts map, ordem preservada)
   │  readPresentation (sldSz, lista de slides via rels)
   │  readSlide (spTree → shapes; placeholders herdam xfrm do layout→master)
   ▼
Presentation + Slide[] (shapes: xfrm EMU, fill, line, txBody)
   │  <universal-slides>.paint()  ◄── escala EMU→px, desenha por slide
   ▼
slide visível em <canvas>
```

## Cobertura atual (bootstrap, verificado vs app de referência)

Renderizado **1:1** em geometria/conteúdo (comparação lado a lado em
`tools/ppt-lab/results/{ours,ppt}`):

- Tamanho do slide e escala de encaixe; fundo branco/sobrescrito.
- Formas `<p:sp>`: `xfrm` próprio **e herdado de placeholder** (layout→master);
  `prstGeom` rect/ellipse/roundRect; preenchimento sólido (srgbClr/schemeClr +
  shade/tint/lumMod/lumOff); contorno (`a:ln`).
- Texto: parágrafos, runs com `sz`/`b`/`i`/`u`/cor/fonte, âncora vertical
  (`bodyPr anchor`), alinhamento explícito (`pPr algn`), quebras `<a:br>`.
- Cores de tema resolvidas de `theme1.xml` (clrScheme + clrMap padrão).
- Navegação de slides (setas/Page/Home/End/clique).

## Pendências priorizadas (próxima fase)

| Prioridade | Item | Nota |
|---|---|---|
| **Alta** | **Cascata de estilos de texto herdados**: `lstStyle`/`txStyles` (titleStyle/bodyStyle do master/layout) + `defaultTextStyle` da apresentação | governam **alinhamento, tamanho, cor e marcadores** padrão dos placeholders. É a maior lacuna visível (título do layout-título é centralizado; bullets do corpo têm `•`). |
| **Alta** | **`<p:style>` da forma** (`fontRef`/`lnRef`/`fillRef`/`effectRef`) | cor do texto e contorno vêm daqui quando o run/`spPr` não especifica (ex.: texto branco no retângulo accent). |
| **Alta** | **Imagens** (`<p:pic>` + mídia em `ppt/media/`) | extrair blob e desenhar. |
| Média | Grupos (`<p:grpSp>` com `chOff`/`chExt`), tabelas (`<a:tbl>`), gráficos | |
| Média | Quebra de linha automática do texto na largura da forma (`a:bodyPr wrap`) + `spAutoFit`/`normAutofit` | |
| Média | Geometrias preset além de rect/ellipse/roundRect; gradientes/imagem como fill | |
| Baixa | Rotação (`xfrm rot`/flip), sombras/efeitos, transições/animações | |

## Stack & convenções

TypeScript ES2022/ESM, `fflate` (zip), Vitest, builds `tsc`, demo `esbuild`,
render headless `playwright`. Imports com extensão `.js` em fonte `.ts`.
`index.ts` re-exporta a API pública. Comentários em **pt-BR**, identificadores em
inglês. Experimentos do lab em `tools/ppt-lab/`, resultados em `results/`.

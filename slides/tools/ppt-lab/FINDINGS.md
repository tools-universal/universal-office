# Regras observadas do PowerPoint (via PowerPoint real, COM)

Cada regra é a especificação que o renderer deve replicar. PowerPoint 16.0 pt-BR.
Capturado por `gen-reference.ps1` (deck de referência → XML extraído/indentado em
`results/reference/`).

## Estrutura do pacote

- `ppt/presentation.xml` lista slides em `<p:sldIdLst><p:sldId id r:id>` e o
  master em `<p:sldMasterIdLst>`. Os `r:id` resolvem via
  `ppt/_rels/presentation.xml.rels`.
- Tamanho do slide: `<p:sldSz cx="9144000" cy="5143500" type="screen16x9"/>` —
  EMU (914400/pol). 16:9 onscreen = 10in × 5.625in.
- Cadeia de herança: slide → `slideLayout` (rels do slide) → `slideMaster` (rels
  do layout) → `theme` (rels do master). O tema fica em `ppt/theme/theme1.xml`.

## Slide e formas

- `<p:sld><p:cSld><p:spTree>` contém `<p:nvGrpSpPr>` + `<p:grpSpPr>` e então as
  formas `<p:sp>` (e `<p:pic>`, `<p:grpSp>`, `<p:graphicFrame>`).
- Forma `<p:sp>`:
  - `<p:nvSpPr>`: `<p:cNvPr id name>`; `<p:cNvSpPr txBox="1">` marca caixa de
    texto; `<p:nvPr><p:ph type="ctrTitle|subTitle|title|body" idx="N"/>` marca
    placeholder.
  - `<p:spPr>`: `<a:xfrm><a:off x y/><a:ext cx cy/></a:xfrm>` (EMU),
    `<a:prstGeom prst="rect">`, `<a:solidFill>`/`<a:noFill>`, `<a:ln>`.
  - `<p:txBody>`: `<a:bodyPr anchor="ctr">`, parágrafos `<a:p>` com
    `<a:pPr algn="ctr" lvl="N">` e runs `<a:r><a:rPr sz b i u/><a:t>texto</a:t>`.

## Geometria de placeholder (CRÍTICO)

- Placeholders de título/corpo no slide têm `<p:spPr/>` **vazio**: a geometria
  (`xfrm`) vem do **layout** (casa por `ph type`/`idx`); o layout pode herdar do
  **master**. Title-family: `ctrTitle` ~ `title` no casamento.
- → o renderer precisa resolver xfrm subindo slide→layout→master. (Implementado.)

## Cor (DrawingML)

- `<a:srgbClr val="4472C4"/>` (direto); `<a:schemeClr val="accent1"/>` (tema);
  `<a:sysClr val="windowText" lastClr="000000"/>`.
- Modificadores: `<a:shade val="15000">` (×0.15 → escurece), `<a:tint>` (→ branco),
  `<a:lumMod>`/`<a:lumOff>`. `val` em milésimos de %.
- `theme1.xml` `<a:clrScheme>`: dk1/lt1/dk2/lt2/accent1-6/hlink/folHlink. O
  `clrMap` do master mapeia bg1=lt1, tx1=dk1, bg2=lt2, tx2=dk2.

## Texto

- `sz` em centésimos de ponto (`sz="2800"` = 28pt). `b="1"`, `i="1"`,
  `u="sng"` (sublinhado; `none` = sem). Fonte do run em `<a:latin typeface>`.
- Âncora vertical em `<a:bodyPr anchor="t|ctr|b">`; alinhamento horizontal em
  `<a:pPr algn="l|ctr|r|just">`.
- Insets padrão de `bodyPr`: lIns/rIns = 91440 EMU (0.1in), tIns/bIns = 45720
  (0.05in).

## Herança de formatação de texto (lacuna conhecida — próxima fase)

- O **alinhamento, tamanho, cor e marcador (bullet)** padrão dos placeholders NÃO
  ficam no slide: vêm de `lstStyle` do layout e de `<p:txStyles>`
  (titleStyle/bodyStyle/otherStyle) do **master**, com fallback no
  `<p:defaultTextStyle>` da `presentation.xml`. Ex.: no layout de título o
  `ctrTitle` é centralizado; os itens de corpo ganham `•` do `buChar` do master.
- A **cor do texto e o contorno** de uma forma com `<p:style>` vêm dos refs
  (`<a:fontRef idx="minor"><a:schemeClr val="lt1"/>` → texto branco;
  `<a:lnRef>` → contorno). Sem isso, o run cai no preto e a forma fica sem borda.

## Comparação lado a lado (reference.pptx)

`results/ours/slideN.png` (nosso canvas) × `results/ppt/slideN.png` (PowerPoint
`Slides.Item(i).Export PNG`). Geometria, preenchimento, conteúdo de texto,
âncora e alinhamento explícito batem; divergências = cascata de estilos herdados
(acima) e bullets/cor de placeholder.

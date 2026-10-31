# Observed PowerPoint rules (via real PowerPoint, COM)

Each rule is the specification the renderer must replicate. PowerPoint 16.0 pt-BR.
Captured by `gen-reference.ps1` (reference deck → XML extracted/indented in
`results/reference/`).

## Package structure

- `ppt/presentation.xml` lists the slides in `<p:sldIdLst><p:sldId id r:id>` and the
  master in `<p:sldMasterIdLst>`. The `r:id`s resolve via
  `ppt/_rels/presentation.xml.rels`.
- Slide size: `<p:sldSz cx="9144000" cy="5143500" type="screen16x9"/>` —
  EMU (914400/in). 16:9 onscreen = 10in × 5.625in.
- Inheritance chain: slide → `slideLayout` (the slide's rels) → `slideMaster` (the
  layout's rels) → `theme` (the master's rels). The theme lives in `ppt/theme/theme1.xml`.

## Slide and shapes

- `<p:sld><p:cSld><p:spTree>` contains `<p:nvGrpSpPr>` + `<p:grpSpPr>` and then the
  `<p:sp>` shapes (and `<p:pic>`, `<p:grpSp>`, `<p:graphicFrame>`).
- `<p:sp>` shape:
  - `<p:nvSpPr>`: `<p:cNvPr id name>`; `<p:cNvSpPr txBox="1">` marks a text
    box; `<p:nvPr><p:ph type="ctrTitle|subTitle|title|body" idx="N"/>` marks a
    placeholder.
  - `<p:spPr>`: `<a:xfrm><a:off x y/><a:ext cx cy/></a:xfrm>` (EMU),
    `<a:prstGeom prst="rect">`, `<a:solidFill>`/`<a:noFill>`, `<a:ln>`.
  - `<p:txBody>`: `<a:bodyPr anchor="ctr">`, `<a:p>` paragraphs with
    `<a:pPr algn="ctr" lvl="N">` and runs `<a:r><a:rPr sz b i u/><a:t>texto</a:t>`.

## Placeholder geometry (CRITICAL)

- Title/body placeholders on the slide have an **empty** `<p:spPr/>`: the geometry
  (`xfrm`) comes from the **layout** (matched by `ph type`/`idx`); the layout may inherit from the
  **master**. Title family: `ctrTitle` ~ `title` when matching.
- → the renderer has to resolve the xfrm by going up slide→layout→master. (Implemented.)

## Color (DrawingML)

- `<a:srgbClr val="4472C4"/>` (direct); `<a:schemeClr val="accent1"/>` (theme);
  `<a:sysClr val="windowText" lastClr="000000"/>`.
- Modifiers: `<a:shade val="15000">` (×0.15 → darkens), `<a:tint>` (→ white),
  `<a:lumMod>`/`<a:lumOff>`. `val` in thousandths of a %.
- `theme1.xml` `<a:clrScheme>`: dk1/lt1/dk2/lt2/accent1-6/hlink/folHlink. The
  master's `clrMap` maps bg1=lt1, tx1=dk1, bg2=lt2, tx2=dk2.

## Text

- `sz` in hundredths of a point (`sz="2800"` = 28pt). `b="1"`, `i="1"`,
  `u="sng"` (underline; `none` = none). The run's font is in `<a:latin typeface>`.
- Vertical anchor in `<a:bodyPr anchor="t|ctr|b">`; horizontal alignment in
  `<a:pPr algn="l|ctr|r|just">`.
- Default `bodyPr` insets: lIns/rIns = 91440 EMU (0.1in), tIns/bIns = 45720
  (0.05in).

## Text formatting inheritance (known gap — next phase)

- The placeholders' default **alignment, size, color and bullet** are NOT
  on the slide: they come from the layout's `lstStyle` and from the **master**'s
  `<p:txStyles>` (titleStyle/bodyStyle/otherStyle), with a fallback to the
  `<p:defaultTextStyle>` of `presentation.xml`. E.g.: in the title layout the
  `ctrTitle` is centered; body items get `•` from the master's `buChar`.
- The **text color and outline** of a shape with `<p:style>` come from the refs
  (`<a:fontRef idx="minor"><a:schemeClr val="lt1"/>` → white text;
  `<a:lnRef>` → outline). Without this, the run falls back to black and the shape has no border.

## Side-by-side comparison (reference.pptx)

`results/ours/slideN.png` (our canvas) × `results/ppt/slideN.png` (PowerPoint
`Slides.Item(i).Export PNG`). Geometry, fill, text content,
anchor and explicit alignment match; divergences = the cascade of inherited styles
(above) and placeholder bullets/color.

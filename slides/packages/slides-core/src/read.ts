import { parseXml, childElements, firstChild, lastChild, fillAlphaEl, textContent, descend, type XmlElement } from './xml.js';
import type { PathSeg } from './geometry.js';
import { customGuides, arcToSeg } from './preset-engine.js';
import { readTheme, colorFromDml, solidFillColor, applyClrMap, clrMapAttrs, textFillColor } from './theme.js';
import { patternDensity } from './patterns.js';
import { diagramFallbackShapes, type DgmStyle } from './diagram-fallback.js';
import { readTblPr, readTableStyle, applyTableStyle } from './table-style.js';
import {
  parseTxStyleLevels, applyShapeTextCascade, applyTextStyles, mergeStyleLevels, readRunExtras, type BlipResolver,
  type TextStyleContext, type TextStyleLevel, type TextStyleLevels,
} from './text-style.js';
import type { PptxPackage } from './package.js';
import { parseSlideTiming, type CountTextUnits } from './timing.js';
import type {
  Presentation, SlideRef, Slide, Shape, Xfrm, ImageRef, ImageFx, MediaRef, TextBody, Paragraph, Run, Theme,
  SlideAnimEntry, SlideTransition, Table, TableRow, TableCell, GradientStop, Fill, ShowSettings,
} from './model.js';

/**
 * Le um .rels -> Map<rId, target>. Para relacionamentos internos, o target eh
 * resolvido para caminho absoluto no pacote. Para relacionamentos `External`
 * (hyperlinks tipicamente), o target eh mantido como string crua (URL).
 */
export function readRels(pkg: PptxPackage, relsPart: string, ownerPart: string): Map<string, string> {
  const map = new Map<string, string>();
  const xml = pkg.getPartText(relsPart);
  if (xml === undefined) return map;
  const root = parseXml(xml);
  for (const rel of childElements(root, 'Relationship')) {
    const id = rel.attrs['Id']; const target = rel.attrs['Target'];
    const mode = rel.attrs['TargetMode'];
    if (id === undefined || target === undefined) continue;
    if (mode === 'External') map.set(id, target);
    else map.set(id, pkg.resolveRelTarget(ownerPart, target));
  }
  return map;
}

function relsPathFor(part: string): string {
  const slash = part.lastIndexOf('/');
  const dir = part.slice(0, slash); const file = part.slice(slash + 1);
  return `${dir}/_rels/${file}.rels`;
}

const slideNumCache = new WeakMap<PptxPackage, Map<string, number>>();
/** Número exibido do slide: posição na lista + `firstSlideNum` da apresentação. */
function slideNumberOf(pkg: PptxPackage, slidePath: string): number | undefined {
  let m = slideNumCache.get(pkg);
  if (!m) {
    const map = new Map<string, number>();
    try {
      const pres = readPresentation(pkg);
      const first = parseInt(parseXml(pkg.presentationXml()).attrs['firstSlideNum'] ?? '1', 10) || 1;
      pres.slides.forEach((s, i) => { if (s.target) map.set(s.target, first + i); });
    } catch { /* sem presentation.xml legível: fica o texto em cache */ }
    slideNumCache.set(pkg, map);
    m = map;
  }
  return m.get(slidePath);
}

/** Le ppt/presentation.xml -> Presentation (tamanho do slide + lista de slides). */
export function readPresentation(pkg: PptxPackage): Presentation {
  const root = parseXml(pkg.presentationXml());
  const rels = readRels(pkg, 'ppt/_rels/presentation.xml.rels', 'ppt/presentation.xml');

  const sz = firstChild(root, 'p:sldSz');
  const slideW = sz?.attrs['cx'] !== undefined ? parseInt(sz.attrs['cx'], 10) : 9144000;
  const slideH = sz?.attrs['cy'] !== undefined ? parseInt(sz.attrs['cy'], 10) : 5143500;

  const slides: SlideRef[] = [];
  const lst = firstChild(root, 'p:sldIdLst');
  if (lst) for (const s of childElements(lst, 'p:sldId')) {
    const rId = s.attrs['r:id'] ?? '';
    slides.push({ id: s.attrs['id'] ?? '', rId, target: rels.get(rId) });
  }
  const pres: Presentation = { slideW, slideH, slides };
  if (sz?.attrs['type']) pres.sizeType = sz.attrs['type'];
  const show = readShowSettings(pkg);
  if (show) pres.show = show;
  return pres;
}

/** `<p:showPr>` do presProps (configurar apresentação). Parte ausente/ilegível = undefined. */
function readShowSettings(pkg: PptxPackage): ShowSettings | undefined {
  const part = findRelTarget(pkg, 'ppt/presentation.xml', 'presProps') ?? 'ppt/presProps.xml';
  const xml = pkg.getPartText(part);
  if (xml === undefined) return undefined;
  let sp: XmlElement | undefined;
  try { sp = firstChild(parseXml(xml), 'p:showPr'); } catch { return undefined; }
  if (!sp) return undefined;
  const bool = (v: string | undefined): boolean | undefined => (v === undefined ? undefined : v === '1' || v === 'true');
  const out: ShowSettings = {};
  const loop = bool(sp.attrs['loop']); if (loop !== undefined) out.loop = loop;
  const ut = bool(sp.attrs['useTimings']); if (ut !== undefined) out.useTimings = ut;
  const sa = bool(sp.attrs['showAnimation']); if (sa !== undefined) out.showAnimation = sa;
  if (firstChild(sp, 'p:kiosk')) out.kiosk = true;
  const rg = firstChild(sp, 'p:sldRg');
  if (rg) {
    const st = parseInt(rg.attrs['st'] ?? '', 10), end = parseInt(rg.attrs['end'] ?? '', 10);
    if (Number.isFinite(st) && Number.isFinite(end) && st >= 1 && end >= st) out.range = [st - 1, end - 1];
  }
  return out;
}

/** Resolve o tema referenciado por uma parte (slide/layout/master via rels). */
function themeFor(pkg: PptxPackage, part: string): Theme {
  // master -> theme. Slides nao referenciam tema direto; sobem ate o master.
  const masterPath = findRelTarget(pkg, part, 'slideMaster') ?? findRelTarget(pkg, findRelTarget(pkg, part, 'slideLayout') ?? '', 'slideMaster');
  const themePath = masterPath ? findRelTarget(pkg, masterPath, 'theme') : findRelTarget(pkg, 'ppt/presentation.xml', 'theme');
  const theme = readTheme(pkg, themePath ?? 'ppt/theme/theme1.xml');
  // clrMap: o do master; `<p:clrMapOvr><a:overrideClrMapping>` da própria parte
  // (slide) e, sem ele, o do layout substituem (`masterClrMapping` = herda)
  const ovr = (p: string | undefined): Record<string, string> | undefined => {
    const xml = p ? pkg.getPartText(p) : undefined;
    if (xml === undefined) return undefined;
    const o = firstChild(parseXml(xml), 'p:clrMapOvr');
    return clrMapAttrs(o ? firstChild(o, 'a:overrideClrMapping') : undefined);
  };
  const mx = masterPath ? pkg.getPartText(masterPath) : undefined;
  const masterMap = mx !== undefined ? clrMapAttrs(firstChild(parseXml(mx), 'p:clrMap')) : undefined;
  const layoutPath = part === masterPath ? undefined : (/slideLayout/.test(part) ? part : findRelTarget(pkg, part, 'slideLayout'));
  const map = (part !== layoutPath ? ovr(part) : undefined) ?? ovr(layoutPath) ?? masterMap;
  return applyClrMap(theme, map);
}

function findRelTarget(pkg: PptxPackage, part: string, typeSuffix: string): string | undefined {
  if (!part) return undefined;
  const xml = pkg.getPartText(relsPathFor(part));
  if (xml === undefined) return undefined;
  const root = parseXml(xml);
  for (const rel of childElements(root, 'Relationship')) {
    if ((rel.attrs['Type'] ?? '').endsWith('/' + typeSuffix)) {
      return pkg.resolveRelTarget(part, rel.attrs['Target'] ?? '');
    }
  }
  return undefined;
}

/** Le um slide -> Slide, herdando geometria de placeholder do layout/master. */
export function readSlide(pkg: PptxPackage, slidePath: string): Slide {
  const xml = pkg.getPartText(slidePath);
  if (xml === undefined) throw new Error(`Pacote sem ${slidePath}`);
  const root = parseXml(xml);
  const theme = themeFor(pkg, slidePath);
  // .rels do slide e necessario para resolver `r:embed` de `<p:pic>` e bg image.
  const slideRels = readRels(pkg, relsPathFor(slidePath), slidePath);

  const cSld = firstChild(root, 'p:cSld');
  const spTree = cSld ? firstChild(cSld, 'p:spTree') : undefined;
  const shapes: Shape[] = spTree ? readShapes(spTree, theme, pkg, slideRels) : [];

  // DECORAÇÕES herdadas: shapes SEM placeholder do master e do layout são
  // desenhadas por baixo das do slide (fundo de template tipo Slidesgo vive
  // aqui). `showMasterSp="0"` no layout desliga as do master.
  const layoutPath = findRelTarget(pkg, slidePath, 'slideLayout');
  const masterPath = layoutPath ? findRelTarget(pkg, layoutPath, 'slideMaster') : undefined;
  const inherited: Shape[] = [];
  let layoutShowMasterSp = true;
  // no SLIDE, showMasterSp="0" = "ocultar gráficos de fundo": nem master nem layout
  if (layoutPath && root.attrs['showMasterSp'] !== '0') {
    const lx = pkg.getPartText(layoutPath);
    if (lx !== undefined) {
      const lroot = parseXml(lx);
      if (lroot.attrs['showMasterSp'] === '0') layoutShowMasterSp = false;
      const parts: [string | undefined, boolean][] = [
        [masterPath, layoutShowMasterSp],
        [layoutPath, true],
      ];
      for (const [part, enabled] of parts) {
        if (!part || !enabled) continue;
        const xml2 = pkg.getPartText(part);
        if (xml2 === undefined) continue;
        const tree = descend(parseXml(xml2), 'p:spTree');
        if (!tree) continue;
        const partRels = readRels(pkg, relsPathFor(part), part);
        for (const sh of readShapes(tree, theme, pkg, partRels)) {
          if (sh.phType !== undefined || sh.phIdx !== undefined) continue; // placeholder ≠ decoração
          sh.inherited = true;
          inherited.push(sh);
        }
      }
    }
  }
  if (inherited.length) shapes.unshift(...inherited);
  // número do slide: o app mostra o número ATUAL (o cache do campo é o da gravação —
  // num master/layout é sempre o mesmo, ex. "1")
  const num = slideNumberOf(pkg, slidePath);
  if (num !== undefined) {
    for (const sh of shapes) for (const p of sh.txBody?.paragraphs ?? []) for (const r of p.runs) if (r.field === 'slidenum') r.text = String(num);
  }

  // herda xfrm de placeholders sem geometria propria
  const phMap = placeholderXfrmMap(pkg, slidePath, theme);
  for (const sh of shapes) {
    if (!sh.xfrm && sh.phType !== undefined) {
      const x = phMap.get(phKey(sh.phType, sh.phIdx)) ?? phMap.get(phKey(sh.phType)) ?? phMap.get('idx:' + (sh.phIdx ?? ''));
      if (x) sh.xfrm = x;
    }
  }

  // spPr herdado do placeholder: SOMBRA do layout/master aplica ao slide
  // (títulos de template carregam outerShdw no placeholder do layout)
  // e também o resto do spPr: preenchimento, contorno, geometria e efeitos do
  // placeholder do layout/master valem no slide quando a forma não tem os seus
  const spMap = new Map<string, Shape>();
  for (const part of [masterPath, layoutPath]) {
    if (!part) continue;
    const xml2 = pkg.getPartText(part);
    if (xml2 === undefined) continue;
    const tree = descend(parseXml(xml2), 'p:spTree');
    if (!tree) continue;
    const prels = readRels(pkg, relsPathFor(part), part);
    for (const psh of readShapes(tree, theme, pkg, prels)) {
      if (psh.phType === undefined && psh.phIdx === undefined) continue;
      const merge = (k: string) => { const prev = spMap.get(k); spMap.set(k, prev ? { ...prev, ...stripUndefShape(psh) } : psh); };
      merge(phKey(psh.phType, psh.phIdx));
      merge(phKey(psh.phType));
      if (psh.phIdx !== undefined && part === layoutPath) merge('idx:' + psh.phIdx);
    }
  }
  for (const sh of shapes) {
    if (sh.inherited || (sh.phType === undefined && sh.phIdx === undefined)) continue;
    const inh = spMap.get(phKey(sh.phType, sh.phIdx)) ?? spMap.get(phKey(sh.phType)) ?? spMap.get('idx:' + (sh.phIdx ?? ''));
    if (!inh) continue;
    if (!sh.shadow && inh.shadow) sh.shadow = inh.shadow;
    if (!sh.fill && !sh.fillImage && !sh.grpFill && !sh.useBgFill) {
      if (inh.fill) sh.fill = inh.fill;
      if (inh.fillAlpha !== undefined && sh.fillAlpha === undefined) sh.fillAlpha = inh.fillAlpha;
      if (inh.fillImage) { sh.fillImage = inh.fillImage; if (inh.fillTile) sh.fillTile = true; }
      if (inh.useBgFill) sh.useBgFill = true;
    }
    if (sh.lineColor === undefined && !sh.lineNone) {
      if (inh.lineColor) sh.lineColor = inh.lineColor;
      if (inh.lineNone) sh.lineNone = true;
      if (sh.lineWidth === undefined && inh.lineWidth !== undefined) sh.lineWidth = inh.lineWidth;
      if (sh.lineDash === undefined && inh.lineDash !== undefined) sh.lineDash = inh.lineDash;
    }
    if (sh.geom === undefined && !sh.custGeom && inh.geom) { sh.geom = inh.geom; if (inh.adj) { sh.adj = inh.adj; if (inh.adjNames) sh.adjNames = inh.adjNames; } }
    else if (sh.geom === undefined && !sh.custGeom && inh.custGeom) sh.custGeom = inh.custGeom;
    for (const k of ['glow', 'softEdge', 'reflection', 'innerShadow'] as const) if (sh[k] === undefined && inh[k] !== undefined) (sh as unknown as Record<string, unknown>)[k] = inh[k];
  }

  // bodyPr herdado do placeholder (âncora vertical/insets/autofit/colunas)
  const bodyPrMap = placeholderBodyPrMap(pkg, slidePath);
  for (const sh of shapes) {
    if (!sh.txBody || (sh.phType === undefined && sh.phIdx === undefined)) continue;
    // casa pelo idx no layout antes do tipo (o tipo cai no master)
    const inh = bodyPrMap.get(phKey(sh.phType, sh.phIdx)) ?? (sh.phIdx !== undefined ? bodyPrMap.get('idx:' + sh.phIdx) : undefined)
      ?? bodyPrMap.get(phKey(sh.phType)) ?? bodyPrMap.get(phKey(masterTypeOf(sh.phType ?? 'body')));
    if (!inh) continue;
    const tb = sh.txBody;
    if (tb.anchor === undefined && inh.anchor !== undefined) tb.anchor = inh.anchor;
    if (tb.wrap === undefined && inh.wrap !== undefined) tb.wrap = inh.wrap;
    if (tb.spcFirstLastPara === undefined && inh.spcFirstLastPara !== undefined) tb.spcFirstLastPara = inh.spcFirstLastPara;
    if (tb.vert === undefined && inh.vert !== undefined) tb.vert = inh.vert;
    if (tb.insL === undefined && inh.insL !== undefined) tb.insL = inh.insL;
    if (tb.insT === undefined && inh.insT !== undefined) tb.insT = inh.insT;
    if (tb.insR === undefined && inh.insR !== undefined) tb.insR = inh.insR;
    if (tb.insB === undefined && inh.insB !== undefined) tb.insB = inh.insB;
    if (tb.numCol === undefined && inh.numCol !== undefined) tb.numCol = inh.numCol;
    if (tb.spcCol === undefined && inh.spcCol !== undefined) tb.spcCol = inh.spcCol;
    if (tb.autofit === undefined && inh.autofit !== undefined) tb.autofit = inh.autofit;
    if (tb.fontScale === undefined && inh.fontScale !== undefined && tb.autofit === 'norm') tb.fontScale = inh.fontScale;
    if (tb.lnSpcReduction === undefined && inh.lnSpcReduction !== undefined) tb.lnSpcReduction = inh.lnSpcReduction;
  }

  // cascata de estilos de texto (spec 03 A/B): defaultTextStyle -> txStyles do
  // master -> fontRef do <p:style> -> lstStyle de placeholder (master/layout)
  // -> lstStyle do proprio txBody. Preenche defaults em Run/Paragraph.
  const styleCtx = buildTextStyleContext(pkg, slidePath, theme);
  for (const sh of shapes) {
    if (!sh.txBody) continue;
    const keys = (sh.phType !== undefined || sh.phIdx !== undefined)
      ? [phKey(sh.phType, sh.phIdx), phKey(sh.phType), 'idx:' + (sh.phIdx ?? '')]
      : [];
    const mType = sh.phType === undefined || sh.phType === 'obj' || sh.phType === 'subTitle' ? 'body' : sh.phType;
    applyShapeTextCascade(sh, styleCtx, theme, keys, keys.length ? [phKey(mType)] : []);
    // nenhuma camada definiu a cor: o padrão do app é tx1 (já pelo clrMap — branco em tema escuro)
    const tx1 = theme.colors['tx1'];
    if (tx1) for (const p of sh.txBody.paragraphs) for (const r of p.runs) if (r.color === undefined) r.color = tx1;
  }
  // células de tabela: defaultTextStyle + otherStyle do master + tcTxStyle do
  // ESTILO da tabela (cor/negrito por parte, ex. header branco/bold) por cima.
  for (const sh of shapes) {
    if (!sh.table) continue;
    const base = mergeStyleLevels(styleCtx.defaultStyle, styleCtx.otherStyle);
    for (const row of sh.table.rows) {
      for (const cell of row.cells) {
        if (!cell.txBody) continue;
        const overlay: TextStyleLevel = {};
        if (cell.txColor !== undefined) overlay.color = cell.txColor;
        if (cell.txBold) overlay.bold = true;
        const levels = (overlay.color !== undefined || overlay.bold !== undefined)
          ? mergeStyleLevels(base, Array.from({ length: 9 }, () => ({ ...overlay })))
          : base;
        applyTextStyles(cell.txBody, levels, theme);
      }
    }
  }

  const slide: Slide = { shapes };
  // fundo: o do SLIDE vence; sem ele, herda do LAYOUT e por fim do MASTER
  // (cada um resolve blips com os PRÓPRIOS rels).
  let shadeToTitle = false;
  const applyBg = (part: string, partRoot: XmlElement, rels: Map<string, string>): boolean => {
    const bgEl = descend(partRoot, 'p:bg');
    if (!bgEl) return false;
    const bgPr = firstChild(bgEl, 'p:bgPr');
    if (!bgPr) {
      // <p:bgRef idx="1001…"><a:schemeClr val="bg2"/>: estilo do bgFillStyleLst do
      // tema (sólido/degradê/imagem) com phClr = a cor da referência
      const ref = firstChild(bgEl, 'p:bgRef');
      const st = ref ? themeStyleFill(ref, theme, pkg) : undefined;
      if (!st) return false;
      if (st.fill && st.fill.type !== 'none') slide.bg = st.fill;
      if (st.image) { slide.bgImage = st.image; if (st.tile) slide.bgTile = true; }
      return slide.bg !== undefined || slide.bgImage !== undefined;
    }
    const c = solidFillColor(bgPr, theme);
    if (c) slide.bg = { type: 'solid', color: c };
    if (bgPr.attrs['shadeToTitle'] === '1' || bgPr.attrs['shadeToTitle'] === 'true') shadeToTitle = true;
    if (!slide.bg) {
      const pf = firstChild(bgPr, 'a:pattFill');
      const pfill = pf ? parsePattFill(pf, theme) : undefined;
      if (pfill) slide.bg = pfill;
    }
    if (!slide.bg) {
      const grad = firstChild(bgPr, 'a:gradFill');
      if (grad) {
        const g = parseGradFill(grad, theme);
        if (g) slide.bg = g;
      }
    }
    const blip = descend(bgPr, 'a:blip');
    if (blip) {
      const img = resolveBlip(blip, pkg, rels, theme);
      if (img) {
        slide.bgImage = img;
        if (applyTile(img, firstChild(bgPr, 'a:blipFill'))) slide.bgTile = true;
      }
    }
    return slide.bg !== undefined || slide.bgImage !== undefined;
  };
  let bgDone = cSld ? applyBg(slidePath, cSld, slideRels) : false;
  if (!bgDone && layoutPath) {
    const lx = pkg.getPartText(layoutPath);
    if (lx !== undefined) {
      bgDone = applyBg(layoutPath, parseXml(lx), readRels(pkg, relsPathFor(layoutPath), layoutPath));
    }
  }
  if (!bgDone && masterPath) {
    const mx = pkg.getPartText(masterPath);
    if (mx !== undefined) {
      applyBg(masterPath, parseXml(mx), readRels(pkg, relsPathFor(masterPath), masterPath));
    }
  }
  // sem <p:bg> em nenhum nível: o fundo é bg1 do mapa de cores EFETIVO (clrMapOvr
  // do layout invertendo bg1→dk1 deixa o slide preto no app)
  if (!slide.bg && !slide.bgImage && theme.colors['bg1']) slide.bg = { type: 'solid', color: theme.colors['bg1'] };
  // shadeToTitle: o foco do degradê de caminho é o retângulo do TÍTULO (do slide; senão do master)
  if (shadeToTitle && slide.bg?.type === 'gradient' && (slide.bg as { path?: string }).path) {
    const t = shapes.find((s) => (s.phType === 'title' || s.phType === 'ctrTitle') && s.xfrm)?.xfrm ?? phMap.get(phKey('title')) ?? phMap.get(phKey('ctrTitle'));
    const sz = firstChild(parseXml(pkg.presentationXml()), 'p:sldSz');
    const W = parseInt(sz?.attrs['cx'] ?? '9144000', 10), H = parseInt(sz?.attrs['cy'] ?? '5143500', 10);
    if (t && W && H) (slide.bg as { fillTo?: { l: number; t: number; r: number; b: number } }).fillTo = { l: t.x / W, t: t.y / H, r: 1 - (t.x + t.cx) / W, b: 1 - (t.y + t.cy) / H };
  }
  // formas com useBgFill (inclusive as herdadas do master/layout) recebem o fundo resolvido
  for (const sh of shapes) {
    if (!sh.useBgFill) continue;
    if (slide.bg) sh.fill = slide.bg;
    else if (slide.bgImage) { sh.fillImage = slide.bgImage; if (slide.bgTile) sh.fillTile = true; }
    else sh.fill = { type: 'solid', color: '#FFFFFF' };
  }
  // animacoes (<p:timing> cascade fade do showcase)
  const timing = firstChild(root, 'p:timing');
  if (timing) {
    const anims = parseTiming(timing);
    if (anims.length) slide.animations = anims;
  }
  // transição entre slides (<p:transition>)
  const transEl = firstChild(root, 'p:transition');
  if (transEl) slide.transition = parseTransition(transEl);
  // modelo de tempo completo (reprodução automática): transição em
  // mc:AlternateContent + árvore <p:timing> inteira
  slide.timing = parseSlideTiming(root, countTextUnits(shapes), (el) => colorFromDml(el, theme), hasBackground(shapes));
  // marcadores de mídia: posição no arquivo vem da forma (p14:bmkLst)
  for (const bt of slide.timing.bookmarkTriggers ?? []) {
    const media = shapes.find((s) => !s.inherited && s.id === bt.spid)?.media;
    const b = media?.bookmarks?.find((x) => x.name === bt.bookmark);
    if (b) bt.timeMs = b.timeMs;
    if (media?.trim?.startMs) bt.trimStartMs = media.trim.startMs;
  }
  return slide;
}

/**
 * Fundo visível (preenchimento, imagem ou contorno) — nos efeitos por
 * letra/palavra, o app anima esse fundo como 1ª unidade (independe do
 * `<p:bldP animBg>`; medido com o oráculo).
 */
function hasBackground(shapes: Shape[]): (spid: string) => boolean {
  return (spid) => {
    const sh = shapes.find((s) => !s.inherited && s.id === spid);
    if (!sh) return false;
    return !!(sh.fillImage || (sh.fill && sh.fill.type !== 'none') || (sh.lineColor && !sh.lineNone));
  };
}

/** Conta palavras/letras do alvo de uma animação de texto (`<p:iterate>`). */
function countTextUnits(shapes: Shape[]): CountTextUnits {
  return (target, type) => {
    if (!target || type === 'el') return 1;
    const sh = shapes.find((s) => !s.inherited && s.id === target.spid);
    let paras = sh?.txBody?.paragraphs ?? [];
    if (target.pRange) paras = paras.slice(target.pRange[0], target.pRange[1] + 1);
    let text = paras.map((p) => p.runs.map((r) => r.text).join('')).join('\n');
    if (target.charRange) text = text.slice(target.charRange[0], target.charRange[1]);
    if (type === 'wd') return Math.max(1, text.split(/\s+/).filter(Boolean).length);
    // letras: o app NÃO conta espaços/quebras como unidade (medido via COM)
    return Math.max(1, text.replace(/\s/g, '').length);
  };
}

/**
 * Parse de `<p:transition spd=med><p:fade/></p:transition>` etc.
 * Mapeia `spd` (fast/med/slow) → duração canônica e identifica o tipo via o
 * primeiro filho conhecido.
 */
function parseTransition(el: XmlElement): SlideTransition {
  const spd = el.attrs['spd'] ?? 'med';
  const durMs = spd === 'fast' ? 300 : spd === 'slow' ? 1000 : 500;
  for (const c of childElements(el)) {
    switch (c.name) {
      case 'p:fade': return { type: 'fade', durMs };
      case 'p:push': return { type: 'push', durMs, dir: c.attrs['dir'] };
      case 'p:cover': return { type: 'cover', durMs, dir: c.attrs['dir'] };
      case 'p:wipe': return { type: 'wipe', durMs, dir: c.attrs['dir'] };
      case 'p:dissolve': return { type: 'dissolve', durMs };
      case 'p:blinds': return { type: 'blinds', durMs, dir: c.attrs['dir'] };
      case 'p:split': return { type: 'split', durMs, dir: c.attrs['dir'] };
      case 'p:circle': return { type: 'circle', durMs };
    }
  }
  return { type: 'fade', durMs };
}

/**
 * Parse de `<p:timing>` — extrai a sequência de efeitos de entrada do mainSeq.
 *
 * Padrão coberto (cobre o showcase animado):
 *   tnLst > par > cTn(tmRoot) > childTnLst > seq > cTn(mainSeq) > childTnLst >
 *     par* > cTn(fill="hold", stCondLst@delay=D_n) > childTnLst >
 *       par > cTn(presetClass="entr" presetID=N nodeType=clickEffect|afterEffect) >
 *         childTnLst >
 *           set ...                ← faz visible (delay=0, dur=1)
 *           anim*                  ← ppt_x / ppt_y opcional
 *           animEffect filter="fade" > cBhvr > cTn dur=DUR > tgtEl > spTgt spid
 *
 * Cada `par` interno do mainSeq vira um SlideAnimEntry. O delay acumulado é
 * SOMA dos `stCondLst@delay` dos `cTn` ancestrais (que rodam em sequencia
 * dentro de uma seq).
 */
function parseTiming(timing: XmlElement): SlideAnimEntry[] {
  const out: SlideAnimEntry[] = [];
  // localiza o seq cTn (mainSeq) descendo
  const mainSeq = deepFindAttr(timing, 'p:cTn', 'nodeType', 'mainSeq');
  if (!mainSeq) return out;
  const childList = firstChild(mainSeq, 'p:childTnLst');
  if (!childList) return out;
  // cada filho `par` aqui é uma "etapa" da sequência (delay acumula)
  let acc = 0;
  for (const par of childElements(childList, 'p:par')) {
    const cTn = firstChild(par, 'p:cTn');
    if (!cTn) continue;
    const stDelay = readCondDelay(cTn);
    acc += stDelay;
    // desce para o cTn presetClass=entr
    const inner = firstChild(cTn, 'p:childTnLst');
    if (!inner) continue;
    for (const ipar of childElements(inner, 'p:par')) {
      const icTn = firstChild(ipar, 'p:cTn');
      if (!icTn) continue;
      if (icTn.attrs['presetClass'] !== 'entr') continue;
      const localDelay = readCondDelay(icTn);
      const clickGated = icTn.attrs['nodeType'] === 'clickEffect';
      // procura `animEffect filter=fade` (ou só `set` quando é appear)
      const grandKids = firstChild(icTn, 'p:childTnLst');
      if (!grandKids) continue;
      let type: SlideAnimEntry['type'] = 'appear';
      let durMs = 500;
      let spid: string | undefined;
      for (const k of childElements(grandKids)) {
        if (k.name === 'p:animEffect') {
          if (k.attrs['filter']?.includes('fade')) type = 'fade';
          const cBhvr = firstChild(k, 'p:cBhvr');
          const innerCTn = cBhvr ? firstChild(cBhvr, 'p:cTn') : undefined;
          if (innerCTn?.attrs['dur']) durMs = parseInt(innerCTn.attrs['dur'], 10);
          const tgt = cBhvr ? firstChild(cBhvr, 'p:tgtEl') : undefined;
          const spTgt = tgt ? firstChild(tgt, 'p:spTgt') : undefined;
          if (spTgt?.attrs['spid']) spid = spTgt.attrs['spid'];
        } else if (k.name === 'p:set' && !spid) {
          // fallback p/ spid quando só tem `set` (efeito appear)
          const cBhvr = firstChild(k, 'p:cBhvr');
          const tgt = cBhvr ? firstChild(cBhvr, 'p:tgtEl') : undefined;
          const spTgt = tgt ? firstChild(tgt, 'p:spTgt') : undefined;
          if (spTgt?.attrs['spid']) spid = spTgt.attrs['spid'];
        }
      }
      if (!spid) continue;
      out.push({ spid, delayMs: acc + localDelay, durMs, type, clickGated });
    }
  }
  return out;
}

/** Lê o primeiro `<p:cond delay="...">` em `<p:stCondLst>` desse cTn (ms). */
function readCondDelay(cTn: XmlElement): number {
  const st = firstChild(cTn, 'p:stCondLst');
  if (!st) return 0;
  const cond = firstChild(st, 'p:cond');
  if (!cond) return 0;
  const d = cond.attrs['delay'];
  if (!d || d === 'indefinite') return 0;
  return parseInt(d, 10) || 0;
}

/** Acha o primeiro elemento `name` cujo atributo `attr === val`. */
function deepFindAttr(el: XmlElement, name: string, attr: string, val: string): XmlElement | undefined {
  for (const c of el.children) {
    if (typeof c === 'string') continue;
    if (c.name === name && c.attrs[attr] === val) return c;
    const f = deepFindAttr(c, name, attr, val);
    if (f) return f;
  }
  return undefined;
}

function phKey(type: string | undefined, idx?: string): string {
  // normaliza familia de titulo: ctrTitle ~ title
  const t = type === 'ctrTitle' ? 'title' : (type ?? 'body');
  return idx !== undefined ? `${t}#${idx}` : t;
}

/** Coleta xfrm dos placeholders do layout (e do master como fallback). */
function placeholderXfrmMap(pkg: PptxPackage, slidePath: string, theme: Theme): Map<string, Xfrm> {
  const map = new Map<string, Xfrm>();
  const layoutPath = findRelTarget(pkg, slidePath, 'slideLayout');
  const masterPath = layoutPath ? findRelTarget(pkg, layoutPath, 'slideMaster') : undefined;
  // master primeiro (menor prioridade), layout depois (sobrescreve)
  for (const part of [masterPath, layoutPath]) {
    if (!part) continue;
    const xml = pkg.getPartText(part);
    if (xml === undefined) continue;
    const tree = descend(parseXml(xml), 'p:spTree');
    if (!tree) continue;
    // master/layout nao precisa de rels: sem `<p:pic>` reais aqui (so geometria
    // de placeholders), passamos um Map vazio.
    for (const sh of readShapes(tree, theme, pkg, new Map())) {
      if (sh.phType === undefined && sh.phIdx === undefined) continue;
      if (!sh.xfrm) continue;
      map.set(phKey(sh.phType, sh.phIdx), sh.xfrm);
      map.set(phKey(sh.phType), sh.xfrm);
      // idx sem tipo só no LAYOUT (o idx do master é outra numeração)
      if (sh.phIdx !== undefined && part === layoutPath) map.set('idx:' + sh.phIdx, sh.xfrm);
    }
  }
  return map;
}

/** Camadas vazias (9 niveis sem props). */
function emptyLevels(): TextStyleLevels { return Array.from({ length: 9 }, () => ({})); }

/**
 * Monta o contexto da cascata de estilos de texto para um slide:
 * `<p:defaultTextStyle>` do presentation.xml, `<p:txStyles>` do master e os
 * `<a:lstStyle>` dos placeholders do master e do layout (indexados por phKey).
 */
/**
 * Mapa phKey → props de bodyPr dos placeholders do layout/master (âncora,
 * insets, autofit, wrap, colunas). O slide herda o que não define — é daqui
 * que vem o alinhamento vertical dos títulos de template.
 */
function placeholderBodyPrMap(pkg: PptxPackage, slidePath: string): Map<string, Partial<TextBody>> {
  const map = new Map<string, Partial<TextBody>>();
  const masterByType = new Map<string, Partial<TextBody>>();
  const layoutPath = findRelTarget(pkg, slidePath, 'slideLayout');
  const masterPath = layoutPath ? findRelTarget(pkg, layoutPath, 'slideMaster') : undefined;
  for (const part of [masterPath, layoutPath]) {
    if (!part) continue;
    const xml = pkg.getPartText(part);
    if (xml === undefined) continue;
    const tree = descend(parseXml(xml), 'p:spTree');
    if (!tree) continue;
    for (const sp of childElements(tree, 'p:sp')) {
      const nv = firstChild(sp, 'p:nvSpPr');
      const ph = nv ? firstChild(firstChild(nv, 'p:nvPr') ?? nv, 'p:ph') : undefined;
      if (!ph) continue;
      const txBody = firstChild(sp, 'p:txBody');
      const bodyPr = txBody ? firstChild(txBody, 'a:bodyPr') : undefined;
      if (!bodyPr) continue;
      const props: Partial<TextBody> = {};
      if (bodyPr.attrs['anchor']) props.anchor = bodyPr.attrs['anchor'];
      if (bodyPr.attrs['wrap']) props.wrap = bodyPr.attrs['wrap'];
      if (bodyPr.attrs['spcFirstLastPara'] !== undefined) props.spcFirstLastPara = bodyPr.attrs['spcFirstLastPara'] === '1';
      if (bodyPr.attrs['vert']) props.vert = bodyPr.attrs['vert']; // texto vertical do layout ("Título e texto verticais")
      if (bodyPr.attrs['lIns'] !== undefined) props.insL = parseInt(bodyPr.attrs['lIns'], 10);
      if (bodyPr.attrs['tIns'] !== undefined) props.insT = parseInt(bodyPr.attrs['tIns'], 10);
      if (bodyPr.attrs['rIns'] !== undefined) props.insR = parseInt(bodyPr.attrs['rIns'], 10);
      if (bodyPr.attrs['bIns'] !== undefined) props.insB = parseInt(bodyPr.attrs['bIns'], 10);
      if (bodyPr.attrs['numCol'] !== undefined) props.numCol = parseInt(bodyPr.attrs['numCol'], 10);
      if (bodyPr.attrs['spcCol'] !== undefined) props.spcCol = parseInt(bodyPr.attrs['spcCol'], 10);
      const na = firstChild(bodyPr, 'a:normAutofit');
      if (na) props.autofit = 'norm';
      else if (firstChild(bodyPr, 'a:noAutofit')) props.autofit = 'none';
      else if (firstChild(bodyPr, 'a:spAutoFit')) props.autofit = 'shape';
      if (na) {
        if (na.attrs['fontScale'] !== undefined) props.fontScale = parseInt(na.attrs['fontScale'], 10) / 100000;
        if (na.attrs['lnSpcReduction'] !== undefined) props.lnSpcReduction = parseInt(na.attrs['lnSpcReduction'], 10) / 100000;
      }
      const type = ph.attrs['type'] ?? 'body';
      const idx = ph.attrs['idx'];
      if (part === masterPath && part !== layoutPath) {
        // master: por TIPO (o placeholder do layout herda o do master do mesmo tipo)
        masterByType.set(type, props);
        map.set(phKey(type), props);
        continue;
      }
      // layout: o placeholder do slide casa com o do layout pelo idx; o do layout
      // MESCLA sobre o do master do tipo correspondente (mesmo com <a:bodyPr/> vazio —
      // antes caía no tipo e herdava a âncora de OUTRO placeholder do layout)
      const merged = { ...(masterByType.get(masterTypeOf(type)) ?? {}), ...props };
      map.set(phKey(type, idx), merged);
      if (idx !== undefined) map.set('idx:' + idx, merged);
      else map.set(phKey(type), merged);
    }
  }
  return map;
}

/** Tipo do placeholder do MASTER que um placeholder de layout/slide herda. */
function masterTypeOf(type: string): string {
  if (type === 'ctrTitle') return 'title';
  return type === 'title' || type === 'dt' || type === 'ftr' || type === 'sldNum' ? type : 'body';
}


function buildTextStyleContext(pkg: PptxPackage, slidePath: string, theme: Theme): TextStyleContext {
  const ctx: TextStyleContext = {
    defaultStyle: emptyLevels(), titleStyle: emptyLevels(), bodyStyle: emptyLevels(),
    otherStyle: emptyLevels(), masterPh: new Map(), layoutPh: new Map(),
  };
  const presXml = pkg.getPartText('ppt/presentation.xml');
  if (presXml !== undefined) {
    const dts = firstChild(parseXml(presXml), 'p:defaultTextStyle');
    if (dts) ctx.defaultStyle = parseTxStyleLevels(dts, theme);
  }
  const layoutPath = findRelTarget(pkg, slidePath, 'slideLayout');
  const masterPath = layoutPath ? findRelTarget(pkg, layoutPath, 'slideMaster') : undefined;
  if (masterPath) {
    const xml = pkg.getPartText(masterPath);
    if (xml !== undefined) {
      const root = parseXml(xml);
      const tx = firstChild(root, 'p:txStyles');
      const mRels = readRels(pkg, relsPathFor(masterPath), masterPath);
      const mBlip: BlipResolver = (b) => resolveBlip(b, pkg, mRels, theme);
      if (tx) {
        ctx.titleStyle = parseTxStyleLevels(firstChild(tx, 'p:titleStyle'), theme, mBlip);
        ctx.bodyStyle = parseTxStyleLevels(firstChild(tx, 'p:bodyStyle'), theme, mBlip);
        ctx.otherStyle = parseTxStyleLevels(firstChild(tx, 'p:otherStyle'), theme, mBlip);
      }
      collectPhStyles(root, theme, pkg, ctx.masterPh, mRels);
    }
  }
  if (layoutPath) {
    const xml = pkg.getPartText(layoutPath);
    if (xml !== undefined) collectPhStyles(parseXml(xml), theme, pkg, ctx.layoutPh, readRels(pkg, relsPathFor(layoutPath), layoutPath));
  }
  return ctx;
}

/** Coleta os lstStyle (ja parseados em readTxBody) dos placeholders de uma parte. */
function collectPhStyles(root: XmlElement, theme: Theme, pkg: PptxPackage, map: Map<string, TextStyleLevels>, rels: Map<string, string> = new Map()): void {
  const tree = descend(root, 'p:spTree');
  if (!tree) return;
  for (const sh of readShapes(tree, theme, pkg, rels)) {
    if (sh.phType === undefined && sh.phIdx === undefined) continue;
    const ls = sh.txBody?.lstStyle;
    if (!ls) continue;
    map.set(phKey(sh.phType, sh.phIdx), ls);
    if (!map.has(phKey(sh.phType))) map.set(phKey(sh.phType), ls);
    if (sh.phIdx !== undefined && !map.has('idx:' + sh.phIdx)) map.set('idx:' + sh.phIdx, ls);
  }
}

/**
 * Anda o `<p:spTree>` em ORDEM DE DOCUMENTO (z-order) e emite `<p:sp>`,
 * `<p:pic>`, `<p:cxnSp>` (conectores), `<p:graphicFrame>` e `<p:grpSp>`
 * (achatado com a transformacao chOff/chExt aplicada). Z-order importa:
 * PowerPoint pinta na ordem de aparicao, e nosso renderer faz o mesmo.
 */
function readShapes(spTree: XmlElement, theme: Theme, pkg: PptxPackage, rels: Map<string, string>): Shape[] {
  const out: Shape[] = [];
  for (const c of childElements(spTree)) {
    if (c.name === 'p:sp' || c.name === 'p:cxnSp') out.push(readShape(c, theme, pkg, rels));
    else if (c.name === 'p:pic') out.push(readPic(c, theme, pkg, rels));
    else if (c.name === 'p:graphicFrame') {
      const gf = readGraphicFrame(c, pkg, rels, theme);
      if (Array.isArray(gf)) out.push(...gf);
      else if (gf) out.push(gf);
    } else if (c.name === 'p:grpSp') {
      out.push(...readGroup(c, theme, pkg, rels));
    } else if (c.name === 'mc:AlternateContent') {
      // conteúdo alternativo (modelo 3D, tinta, zoom de slide…): o Choice exige
      // extensões que não desenhamos — o Fallback é a imagem que o app gerou
      const alt = firstChild(c, 'mc:Fallback') ?? firstChild(c, 'mc:Choice');
      if (alt) out.push(...readShapes(alt, theme, pkg, rels));
    }
  }
  return out;
}

/**
 * Le `<p:grpSp>` ACHATANDO as coordenadas dos filhos para o espaco do pai
 * (spec 03, item E). A transformacao vem de `<p:grpSpPr><a:xfrm>`:
 *
 *   x' = grpX + (x − chOffX) · (grpCx / chExtX)   (idem y / largura / altura)
 *
 * Grupos aninhados resolvem naturalmente pela recursao (o filho-grupo devolve
 * coords no espaco-filho do pai, que sao entao mapeadas). Rotacao do grupo
 * propaga: soma `rot` aos filhos e gira o centro deles em torno do centro do
 * grupo. flipH/flipV espelham a posicao dentro do rect e alternam o flip do
 * filho.
 */
/** Preenchimento próprio de um `<p:grpSpPr>` (undefined = sem / `<a:grpFill/>` = do grupo de cima). */
function groupFill(grpSpPr: XmlElement, theme: Theme): { fill: Fill; alpha?: number } | undefined {
  if (firstChild(grpSpPr, 'a:noFill')) return { fill: { type: 'none' } };
  const sf = firstChild(grpSpPr, 'a:solidFill');
  if (sf) {
    const c = colorFromDml(childElements(sf)[0], theme);
    if (!c) return undefined;
    const out: { fill: Fill; alpha?: number } = { fill: { type: 'solid', color: c } };
    const a = fillAlphaEl(sf)?.attrs['val'];
    if (a) out.alpha = parseInt(a, 10) / 100000;
    return out;
  }
  const grad = firstChild(grpSpPr, 'a:gradFill');
  const g = grad ? parseGradFill(grad, theme) : undefined;
  return g ? { fill: g } : undefined;
}

function readGroup(grp: XmlElement, theme: Theme, pkg: PptxPackage, rels: Map<string, string>): Shape[] {
  const children = readShapes(grp, theme, pkg, rels);
  // id do grupo: alvo de animações aplicadas ao grupo inteiro
  const nvGrp = firstChild(grp, 'p:nvGrpSpPr');
  const gid = nvGrp ? firstChild(nvGrp, 'p:cNvPr')?.attrs['id'] : undefined;
  if (gid !== undefined) for (const sh of children) sh.groupIds = [gid, ...(sh.groupIds ?? [])];
  const grpSpPr = firstChild(grp, 'p:grpSpPr');
  // preenchimento do GRUPO: filhos com <a:grpFill/> herdam (aninhados sem
  // preenchimento próprio sobem até o grupo que tiver)
  const gFill = grpSpPr ? groupFill(grpSpPr, theme) : undefined;
  if (gFill) {
    for (const sh of children) {
      if (!sh.grpFill) continue;
      sh.fill = gFill.fill;
      if (gFill.alpha !== undefined) sh.fillAlpha = gFill.alpha;
      delete sh.grpFill;
    }
  }
  const xfrmEl = grpSpPr ? firstChild(grpSpPr, 'a:xfrm') : undefined;
  if (!xfrmEl) return children;
  const num = (el: XmlElement | undefined, a: string, dflt: number): number =>
    el?.attrs[a] !== undefined ? parseInt(el.attrs[a]!, 10) : dflt;
  const off = firstChild(xfrmEl, 'a:off');
  const ext = firstChild(xfrmEl, 'a:ext');
  const chOff = firstChild(xfrmEl, 'a:chOff');
  const chExt = firstChild(xfrmEl, 'a:chExt');
  const gx = num(off, 'x', 0), gy = num(off, 'y', 0);
  const gcx = num(ext, 'cx', 0), gcy = num(ext, 'cy', 0);
  // chOff/chExt ausentes = espaco-filho identico ao rect do grupo (identidade)
  const cox = num(chOff, 'x', gx), coy = num(chOff, 'y', gy);
  const cex = num(chExt, 'cx', gcx), cey = num(chExt, 'cy', gcy);
  const sx = cex !== 0 ? gcx / cex : 1;
  const sy = cey !== 0 ? gcy / cey : 1;
  const rotRaw = xfrmEl.attrs['rot'] ? parseInt(xfrmEl.attrs['rot'], 10) : 0;
  const flipH = xfrmEl.attrs['flipH'] === '1';
  const flipV = xfrmEl.attrs['flipV'] === '1';
  const gCenterX = gx + gcx / 2, gCenterY = gy + gcy / 2;

  for (const sh of children) {
    const x = sh.xfrm;
    if (!x) continue;
    x.x = gx + (x.x - cox) * sx;
    x.y = gy + (x.y - coy) * sy;
    x.cx = x.cx * sx;
    x.cy = x.cy * sy;
    // F·R(θ) = R(−θ)·F: espelhar o grupo nega a rotação local do filho
    // (oráculo COM: rect a 30° em grupo com flipH → rot=330° + flipH)
    if (flipH) {
      x.x = 2 * gCenterX - (x.x + x.cx);
      x.flipH = !x.flipH || undefined;
      if (x.rot) x.rot = -x.rot;
    }
    if (flipV) {
      x.y = 2 * gCenterY - (x.y + x.cy);
      x.flipV = !x.flipV || undefined;
      if (x.rot) x.rot = -x.rot;
    }
    if (rotRaw) {
      // gira o CENTRO do filho em torno do centro do grupo; rot acumula
      const a = (rotRaw / 60000) * Math.PI / 180;
      const dx = (x.x + x.cx / 2) - gCenterX;
      const dy = (x.y + x.cy / 2) - gCenterY;
      const ncx = gCenterX + dx * Math.cos(a) - dy * Math.sin(a);
      const ncy = gCenterY + dx * Math.sin(a) + dy * Math.cos(a);
      x.x = ncx - x.cx / 2;
      x.y = ncy - x.cy / 2;
      x.rot = ((x.rot ?? 0) + rotRaw) || undefined;
    }
    // a espessura de linha NÃO escala com o grupo (o app desenha a largura
    // absoluta; grupos com chExt minúsculo davam contornos de centenas de pt)
  }
  return children;
}

/**
 * Le `<p:graphicFrame>` — invólucro para charts/tables/diagramas. v1: só charts.
 * Estrutura:
 *   <p:graphicFrame>
 *     <p:nvGraphicFramePr><p:cNvPr id name/></p:nvGraphicFramePr>
 *     <p:xfrm><a:off/><a:ext/></p:xfrm>     ← xfrm aqui usa namespace `p:`
 *     <a:graphic>
 *       <a:graphicData uri=".../chart">
 *         <c:chart r:id="rIdN"/>             ← rIdN resolve para ppt/charts/chartN.xml
 *       </a:graphicData>
 *     </a:graphic>
 *   </p:graphicFrame>
 */
function readGraphicFrame(gf: XmlElement, pkg: PptxPackage, rels: Map<string, string>, theme: Theme): Shape | Shape[] | null {
  const nvPr = firstChild(gf, 'p:nvGraphicFramePr');
  const cNvPr = nvPr ? firstChild(nvPr, 'p:cNvPr') : undefined;
  const shape: Shape = {
    id: cNvPr?.attrs['id'] ?? '',
    name: cNvPr?.attrs['name'] ?? '',
  };
  const xfrm = firstChild(gf, 'p:xfrm') ?? firstChild(gf, 'a:xfrm');
  if (xfrm) shape.xfrm = parseXfrm(xfrm);
  const graphic = firstChild(gf, 'a:graphic');
  const data = graphic ? firstChild(graphic, 'a:graphicData') : undefined;
  if (!data) return shape;
  // chart
  const chartEl = firstChild(data, 'c:chart');
  if (chartEl) {
    const rid = chartEl.attrs['r:id'] ?? chartEl.attrs['id'];
    if (rid) {
      const target = rels.get(rid);
      if (target) {
        const xml = pkg.getPartText(target);
        if (xml) {
          shape.chartXml = xml;
          shape.chartTheme = chartThemeFor(pkg, target, theme);
          const imgs = chartImagesFor(pkg, target, xml);
          if (imgs) shape.chartImages = imgs;
          shape.chartFormat = chartFileFormat(pkg);
        }
      }
    }
  }
  // SmartArt: o pptx moderno embute um DRAWING pré-renderizado do diagrama
  // (ppt/diagrams/drawingN.xml, prefixo dsp:) — shapes normais que reescalamos
  // ao xfrm do frame. r:dm resolve o data part; o drawing vem dos rels dele.
  const relIds = firstChild(data, 'dgm:relIds');
  if (relIds && shape.xfrm) {
    const dmId = relIds.attrs['r:dm'];
    const dataPath = dmId ? rels.get(dmId) : undefined;
    if (dataPath) {
      let drawingPath: string | undefined;
      const dataRels = readRels(pkg, relsPathFor(dataPath), dataPath);
      for (const t of dataRels.values()) if (t.includes('drawing')) { drawingPath = t; break; }
      if (!drawingPath) {
        const guess = dataPath.replace(/data(\d+)\.xml$/, 'drawing$1.xml');
        if (pkg.getPartText(guess) !== undefined) drawingPath = guess;
      }
      if (drawingPath) {
        const shapes = readDiagramShapes(pkg, drawingPath, theme, shape.xfrm);
        if (shapes.length) {
          // animações miram o FRAME (spid do SmartArt); por partes, `<a:dgm id>`
          // nomeia a forma do desenho (dgmId)
          for (const s of shapes) if (shape.id) s.groupIds = [...(s.groupIds ?? []), shape.id];
          return shapes;
        }
      } else {
        // sem desenho pré-calculado (Office 2007): layout aproximado pelo modelo de dados
        const dataXml = pkg.getPartText(dataPath);
        const loId = relIds.attrs['r:lo'];
        const loPath = loId ? rels.get(loId) : undefined;
        const loXml = loPath ? pkg.getPartText(loPath) : undefined;
        const uid = loXml ? /uniqueId="([^"]*)"/.exec(loXml)?.[1] ?? '' : '';
        if (dataXml !== undefined) {
          let shapes: Shape[] = [];
          const part = (id: string | undefined) => { const p = id ? rels.get(id) : undefined; const x = p ? pkg.getPartText(p) : undefined; return x ? parseXml(x) : undefined; };
          try {
            const styler = diagramStyler(part(relIds.attrs['r:cs']), part(relIds.attrs['r:qs']), theme);
            shapes = diagramFallbackShapes(parseXml(dataXml), uid, shape.xfrm, theme, styler);
          } catch { shapes = []; }
          if (shapes.length) {
            for (const s of shapes) if (shape.id) s.groupIds = [...(s.groupIds ?? []), shape.id];
            return shapes;
          }
        }
      }
    }
  }
  // objeto OLE (planilha, documento, equação, apresentação…): o app desenha a
  // PRÉVIA gravada — o `<p:pic>` dentro do oleObj (2010+) ou a `v:imagedata` da
  // forma de mesmo spid no desenho VML do slide (2007)
  const ole = firstChild(data, 'p:oleObj') ?? descend(data, 'p:oleObj');
  if (ole) {
    // mc:Choice sem prévia (só <p:embed/>): a <p:pic> do mc:Fallback vale (lo-tdf143222)
    const pic = descend(ole, 'p:pic') ?? descend(data, 'p:pic');
    const img = pic ? readPic(pic, theme, pkg, rels).image : olePreviewFromVml(ole.attrs['spid'], pkg, rels, theme, shape);
    if (img) shape.image = img;
  }
  // tabela
  const tblEl = firstChild(data, 'a:tbl');
  if (tblEl) {
    const table = readTable(tblEl, theme);
    // estilo referenciado no <a:tblPr> (fills/cores/negrito default das células)
    const pr = readTblPr(tblEl);
    if (pr.styleId) {
      const style = readTableStyle(pkg, pr.styleId, theme);
      if (style) applyTableStyle(table, style, pr.firstRow, pr.bandRow);
    }
    shape.table = table;
  }
  return shape;
}

/**
 * Prévia de um objeto OLE do PowerPoint 2007 (sem `<p:pic>`): a forma VML de id
 * = spid no `vmlDrawing` do slide traz `<v:imagedata o:relid>` (EMF/WMF/PNG).
 * O VML legado nem sempre é XML bem-formado — busca por texto.
 */
function olePreviewFromVml(spid: string | undefined, pkg: PptxPackage, rels: Map<string, string>, theme: Theme, shape?: Shape): ImageRef | undefined {
  if (!spid) return undefined;
  for (const target of rels.values()) {
    if (!/vmlDrawing\d*\.vml$/i.test(target)) continue;
    const vml = pkg.getPartText(target);
    if (!vml) continue;
    const at = vml.search(new RegExp(`<v:shape\\b[^>]*\\b(?:id|o:spid)="${spid.replace(/[^\w]/g, '')}"`));
    if (at < 0) continue;
    const end = vml.indexOf('</v:shape>', at);
    const block = vml.slice(at, end < 0 ? undefined : end);
    const m = /<v:imagedata\b[^>]*\b(?:o:relid|r:id)="([^"]+)"/.exec(block);
    if (!m) continue;
    // preenchimento/contorno da moldura VML (filled="t" fillcolor…, stroked="t" strokecolor…):
    // o app pinta atrás da prévia (gdx-320163: equação com fundo amarelo e borda)
    if (shape) {
      const tag = /<v:shape\b[^>]*>/.exec(block)?.[0] ?? '';
      const attr = (n: string): string | undefined => new RegExp(`\\b${n}="([^"]*)"`).exec(tag)?.[1];
      const fc = attr('filled') === 't' ? vmlColor(attr('fillcolor')) : undefined;
      if (fc && !shape.fill) shape.fill = { type: 'solid', color: fc };
      const sc = attr('stroked') === 't' ? vmlColor(attr('strokecolor') ?? 'black') : undefined;
      if (sc && shape.lineColor === undefined) {
        shape.lineColor = sc;
        const sw = /^([\d.]+)pt$/.exec(attr('strokeweight') ?? '');
        shape.lineWidth = Math.round((sw ? parseFloat(sw[1]!) : 0.75) * 12700);
      }
    }
    const vrels = readRels(pkg, relsPathFor(target), target);
    const img = resolveBlip({ name: 'a:blip', attrs: { 'r:embed': m[1]! }, children: [] }, pkg, vrels, theme);
    if (img) return img;
  }
  return undefined;
}

/** Cor VML ("#e4e838", "#3cf", "black [3]", "white"…) → #RRGGBB. */
function vmlColor(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const c = v.replace(/\s*\[\d+\]\s*$/, '').trim().toLowerCase();
  const m6 = /^#([0-9a-f]{6})$/.exec(c);
  if (m6) return '#' + m6[1]!.toUpperCase();
  const m3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(c);
  if (m3) return ('#' + m3[1] + m3[1] + m3[2] + m3[2] + m3[3] + m3[3]).toUpperCase();
  const named: Record<string, string> = {
    black: '#000000', white: '#FFFFFF', red: '#FF0000', green: '#008000', blue: '#0000FF', yellow: '#FFFF00',
    gray: '#808080', silver: '#C0C0C0', navy: '#000080', maroon: '#800000', olive: '#808000', purple: '#800080',
    teal: '#008080', aqua: '#00FFFF', fuchsia: '#FF00FF', lime: '#00FF00',
  };
  return named[c];
}

/**
 * Tema do gráfico: o da apresentação, ou o `themeOverride` do próprio gráfico
 * (cores/fontes de quando ele foi colado de outra apresentação/planilha), com o
 * mesmo clrMap do slide.
 */
function chartThemeFor(pkg: PptxPackage, chartPath: string, theme: Theme): Theme {
  const rels = readRels(pkg, relsPathFor(chartPath), chartPath);
  let ov: string | undefined;
  for (const t of rels.values()) if (/themeOverride\d*\.xml$/i.test(t)) { ov = t; break; }
  if (!ov) return theme;
  const o = readTheme(pkg, ov);
  if (!o.scheme || !Object.keys(o.scheme).length) return theme;
  const merged: Theme = { ...theme, colors: o.colors, scheme: o.scheme, ...(o.fonts ? { fonts: { ...theme.fonts, ...o.fonts } } : {}) };
  return theme.clrMap ? applyClrMap(merged, theme.clrMap) : merged;
}

/**
 * Imagens referenciadas por `r:embed` no XML do gráfico (preenchimento de
 * imagem/textura da área, plotagem, séries…), resolvidas pelos rels da parte.
 */
function chartImagesFor(pkg: PptxPackage, chartPath: string, xml: string): Record<string, ImageRef> | undefined {
  if (!xml.includes('embed=')) return undefined;
  const rels = readRels(pkg, relsPathFor(chartPath), chartPath);
  let out: Record<string, ImageRef> | undefined;
  for (const [rid, part] of rels) {
    const mime = mimeFromPart(part);
    if (!mime.startsWith('image/') || !xml.includes(`embed="${rid}"`)) continue;
    const bytes = pkg.getPart(part);
    if (bytes) (out ??= {})[rid] = { part, bytes, mime };
  }
  return out;
}

const chartFormatCache = new WeakMap<PptxPackage, 'mso2007' | 'modern'>();

/**
 * Deck gravado pelo Office 2007 (`docProps/app.xml`: Application "Microsoft…"
 * e AppVersion 12.x): o PowerPoint lê os gráficos dele com o sentido antigo
 * de elementos ausentes e booleanos sem val (medido, syn-a-mso07 × syn-a-mso16).
 */
function chartFileFormat(pkg: PptxPackage): 'mso2007' | 'modern' {
  let f = chartFormatCache.get(pkg);
  if (!f) {
    const app = pkg.getPartText('docProps/app.xml') ?? '';
    const name = /<Application>([^<]*)</.exec(app)?.[1]?.trim() ?? '';
    const ver = /<AppVersion>([^<]*)</.exec(app)?.[1]?.trim() ?? '';
    f = /^Microsoft/i.test(name) && /^12\./.test(ver) ? 'mso2007' : 'modern';
    chartFormatCache.set(pkg, f);
  }
  return f;
}

/** Campos definidos de uma forma (para mesclar master → layout). */
function stripUndefShape(sh: Shape): Partial<Shape> {
  const out: Partial<Shape> = {};
  for (const [k, v] of Object.entries(sh)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}

/** Clona a árvore renomeando prefixo de elementos (`dsp:sp` → `p:sp` etc.). */
function renamePrefix(el: XmlElement, from: string, to: string): XmlElement {
  return {
    name: el.name.startsWith(from) ? to + el.name.slice(from.length) : el.name,
    attrs: el.attrs,
    children: el.children.map((c) => typeof c === 'string' ? c : renamePrefix(c, from, to)),
  };
}

/**
 * Lê o drawing pré-renderizado de um SmartArt (`ppt/diagrams/drawingN.xml`,
 * `<dsp:spTree>` com shapes padrão) e REESCALA o conjunto para caber no xfrm
 * do graphicFrame (o drawing usa um canvas próprio em EMU).
 */
function readDiagramShapes(pkg: PptxPackage, drawingPath: string, theme: Theme, frame: Xfrm): Shape[] {
  const xml = pkg.getPartText(drawingPath);
  if (!xml) return [];
  let root: XmlElement;
  try { root = parseXml(xml); } catch { return []; }
  const spTree = descend(root, 'dsp:spTree');
  if (!spTree) return [];
  const out: Shape[] = [];
  // o desenho tem rels próprios (imagens das formas)
  const drels = readRels(pkg, relsPathFor(drawingPath), drawingPath);
  for (const c of childElements(spTree, 'dsp:sp')) {
    const sp = renamePrefix(c, 'dsp:', 'p:');
    const sh = readShape(sp, theme, pkg, drels);
    if (c.attrs['modelId']) sh.dgmId = c.attrs['modelId'];
    if (!sh.xfrm) continue;
    out.push(sh);
    // <dsp:txXfrm>: o TEXTO tem caixa própria; o rot dele é RELATIVO ao da forma
    // (forma a 90° + texto a −90° = texto na horizontal; 180° + 180° = em pé)
    const txEl = firstChild(c, 'dsp:txXfrm');
    if (txEl && sh.txBody) {
      const tf = parseXfrm(txEl);
      const net = (((sh.xfrm.rot ?? 0) + (tf.rot ?? 0)) % 21600000 + 21600000) % 21600000;
      if (net) tf.rot = net; else delete tf.rot;
      out.push({ id: sh.id + 't', dgmTextOf: sh.id, name: sh.name, xfrm: tf, geom: 'rect', fill: { type: 'none' }, lineNone: true, txBody: sh.txBody, ...(sh.dgmId ? { dgmId: sh.dgmId } : {}), ...(sh.styleFontColor ? { styleFontColor: sh.styleFontColor } : {}), ...(sh.styleFontIdx ? { styleFontIdx: sh.styleFontIdx } : {}) });
      delete sh.txBody;
    }
  }
  if (!out.length) return out;
  // as coordenadas do desenho são as do PRÓPRIO quadro (origem no canto dele): só
  // desloca. Reescala apenas se o conjunto (caixas GIRADAS) não couber — quadro
  // redimensionado por outro gerador sem refazer o desenho
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const sh of out) {
    const f = sh.xfrm!;
    const th = ((f.rot ?? 0) / 60000) * Math.PI / 180, co = Math.abs(Math.cos(th)), si = Math.abs(Math.sin(th));
    const w = f.cx * co + f.cy * si, h = f.cx * si + f.cy * co, cx = f.x + f.cx / 2, cy = f.y + f.cy / 2;
    minX = Math.min(minX, cx - w / 2); minY = Math.min(minY, cy - h / 2);
    maxX = Math.max(maxX, cx + w / 2); maxY = Math.max(maxY, cy + h / 2);
  }
  const bw = maxX - minX || 1, bh = maxY - minY || 1;
  const fits = minX >= -0.05 * frame.cx && minY >= -0.05 * frame.cy && maxX <= frame.cx * 1.05 && maxY <= frame.cy * 1.05;
  const s = fits ? 1 : Math.min(frame.cx / bw, frame.cy / bh);
  const ox = fits ? frame.x : frame.x + (frame.cx - bw * s) / 2 - minX * s;
  const oy = fits ? frame.y : frame.y + (frame.cy - bh * s) / 2 - minY * s;
  for (const sh of out) {
    const f = sh.xfrm!;
    f.x = ox + f.x * s;
    f.y = oy + f.y * s;
    f.cx = f.cx * s;
    f.cy = f.cy * s;
  }
  return out;
}

/** Parse de `<a:tbl>` → modelo Table. */
function readTable(tbl: XmlElement, theme: Theme): Table {
  const gridEl = firstChild(tbl, 'a:tblGrid');
  const colWidthsEmu: number[] = [];
  if (gridEl) {
    for (const gc of childElements(gridEl, 'a:gridCol')) {
      colWidthsEmu.push(gc.attrs['w'] ? parseInt(gc.attrs['w'], 10) : 0);
    }
  }
  const rows: TableRow[] = [];
  for (const tr of childElements(tbl, 'a:tr')) {
    const heightEmu = tr.attrs['h'] ? parseInt(tr.attrs['h'], 10) : 0;
    const cells: TableCell[] = [];
    for (const tc of childElements(tr, 'a:tc')) {
      const cell: TableCell = {};
      if (tc.attrs['gridSpan']) cell.gridSpan = parseInt(tc.attrs['gridSpan'], 10);
      if (tc.attrs['rowSpan']) cell.rowSpan = parseInt(tc.attrs['rowSpan'], 10);
      if (tc.attrs['hMerge'] === '1') cell.hMerge = true;
      if (tc.attrs['vMerge'] === '1') cell.vMerge = true;
      const txBody = firstChild(tc, 'a:txBody');
      if (txBody) cell.txBody = readTxBody(txBody, theme);
      const tcPr = firstChild(tc, 'a:tcPr');
      if (tcPr) {
        if (tcPr.attrs['anchor']) cell.anchor = tcPr.attrs['anchor'];
        if (tcPr.attrs['vert'] && tcPr.attrs['vert'] !== 'horz') cell.vert = tcPr.attrs['vert'];
        // <a:noFill/> DIRETO no tcPr: sem preenchimento (vence o estilo da tabela)
        if (firstChild(tcPr, 'a:noFill')) cell.noFill = true;
        for (const k of ['marL', 'marR', 'marT', 'marB'] as const) {
          const v = tcPr.attrs[k];
          if (v !== undefined && /^-?\d+$/.test(v)) cell[k] = parseInt(v, 10);
        }
        const fill = solidFillColor(tcPr, theme);
        if (fill) cell.fill = fill;
        // alfa do fill da célula (tabelas translúcidas de template)
        const sfEl = firstChild(tcPr, 'a:solidFill');
        const aEl = sfEl ? fillAlphaEl(sfEl) : undefined;
        if (aEl?.attrs['val']) cell.fillAlpha = parseInt(aEl.attrs['val'], 10) / 100000;
        // bordas POR LADO (o app de referência trata cada lado independente)
        const sides: [keyof NonNullable<TableCell['borders']>, string][] =
          [['l', 'a:lnL'], ['r', 'a:lnR'], ['t', 'a:lnT'], ['b', 'a:lnB']];
        for (const [key, name] of sides) {
          const ln = firstChild(tcPr, name);
          if (!ln) continue;
          // lado com <a:noFill/> explícito: sem borda (vence o estilo)
          if (firstChild(ln, 'a:noFill')) { (cell.borderNone ??= {})[key] = true; continue; }
          const fillEl = firstChild(ln, 'a:solidFill');
          const color = fillEl ? colorFromDml(childElements(fillEl)[0], theme) : undefined;
          if (!color) continue; // noFill/ausente = lado sem borda explícita
          const width = ln.attrs['w'] ? parseInt(ln.attrs['w'], 10) : 12700;
          cell.borders = cell.borders ?? {};
          const edge: { color: string; width: number; dash?: string } = { color, width };
          const dashEl = firstChild(ln, 'a:prstDash');
          if (dashEl?.attrs['val'] && dashEl.attrs['val'] !== 'solid') edge.dash = dashEl.attrs['val'];
          cell.borders[key] = edge;
        }
      }
      cells.push(cell);
    }
    rows.push({ heightEmu, cells });
  }
  return { colWidthsEmu, rows };
}

function readShape(sp: XmlElement, theme: Theme, pkg?: PptxPackage, rels?: Map<string, string>): Shape {
  // <p:sp> usa p:nvSpPr; <p:cxnSp> (conector) usa p:nvCxnSpPr — mesma estrutura
  const nvSpPr = firstChild(sp, 'p:nvSpPr') ?? firstChild(sp, 'p:nvCxnSpPr');
  const cNvPr = nvSpPr ? firstChild(nvSpPr, 'p:cNvPr') : undefined;
  const cNvSpPr = nvSpPr ? firstChild(nvSpPr, 'p:cNvSpPr') : undefined;
  const nvPr = nvSpPr ? firstChild(nvSpPr, 'p:nvPr') : undefined;
  const ph = nvPr ? firstChild(nvPr, 'p:ph') : undefined;
  const spPr = firstChild(sp, 'p:spPr');

  const shape: Shape = {
    id: cNvPr?.attrs['id'] ?? '',
    name: cNvPr?.attrs['name'] ?? '',
  };
  if (cNvSpPr?.attrs['txBox'] === '1') shape.isTextBox = true;
  if (ph) { if (ph.attrs['type']) shape.phType = ph.attrs['type']; if (ph.attrs['idx']) shape.phIdx = ph.attrs['idx']; }
  // placeholders sem type explicito sao "body" por padrao
  if (ph && shape.phType === undefined) shape.phType = 'body';

  if (spPr) {
    const xfrm = firstChild(spPr, 'a:xfrm');
    if (xfrm) shape.xfrm = parseXfrm(xfrm);
    const geom = firstChild(spPr, 'a:prstGeom');
    if (geom?.attrs['prst']) shape.geom = geom.attrs['prst'];
    // adjust values (moldura fina, cantos, ângulos de arco…)
    const avLst = geom ? firstChild(geom, 'a:avLst') : undefined;
    if (avLst) {
      const adj: number[] = [];
      const names: string[] = [];
      for (const gd of childElements(avLst, 'a:gd')) {
        const m = /val (-?\d+)/.exec(gd.attrs['fmla'] ?? '');
        if (m) { adj.push(parseInt(m[1]!, 10)); names.push(gd.attrs['name'] ?? ''); }
      }
      if (adj.length) { shape.adj = adj; shape.adjNames = names; }
    }
    // geometria custom (freeform): <a:custGeom><a:pathLst><a:path w h>…
    const cust = firstChild(spPr, 'a:custGeom');
    if (cust) {
      const cg = parseCustGeom(cust, shape.xfrm?.cx, shape.xfrm?.cy);
      if (cg) shape.custGeom = cg;
    }
    if (firstChild(spPr, 'a:noFill')) shape.fill = { type: 'none' };
    else if (firstChild(spPr, 'a:grpFill')) shape.grpFill = true; // herda do grupo (readGroup)
    else { const c = solidFillColor(spPr, theme); if (c) shape.fill = { type: 'solid', color: c }; }
    if (!shape.fill) {
      const pf = firstChild(spPr, 'a:pattFill');
      const pfill = pf ? parsePattFill(pf, theme) : undefined;
      if (pfill) shape.fill = pfill;
    }
    // gradiente linear (spec 03 G): <a:gradFill><a:gsLst>… + <a:lin ang>
    if (!shape.fill) {
      const grad = firstChild(spPr, 'a:gradFill');
      if (grad) {
        const g = parseGradFill(grad, theme);
        if (g) { shape.fill = g; if (grad.attrs['rotWithShape'] === '0') shape.fillNoRot = true; }
      }
    }
    // blipFill de shape (stretch): imagem como preenchimento da geometria
    if (pkg && rels) {
      const bf = firstChild(spPr, 'a:blipFill');
      const blip = bf ? firstChild(bf, 'a:blip') : undefined;
      if (blip) {
        const img = resolveBlip(blip, pkg, rels, theme);
        if (img) {
          shape.fillImage = img;
          if (applyTile(img, bf)) shape.fillTile = true;
          if (bf!.attrs['rotWithShape'] === '0') shape.fillNoRot = true;
        }
      }
    }
    // alpha do fill: <a:solidFill><a:srgbClr><a:alpha val=60000/></a:srgbClr></a:solidFill>
    const sf = firstChild(spPr, 'a:solidFill');
    if (sf) {
      const alphaEl = fillAlphaEl(sf);
      if (alphaEl?.attrs['val']) shape.fillAlpha = parseInt(alphaEl.attrs['val'], 10) / 100000;
    }
    const ln = firstChild(spPr, 'a:ln');
    if (ln) {
      if (firstChild(ln, 'a:noFill')) shape.lineNone = true; // SEM contorno explícito
      const lc = solidFillColor(ln, theme);
      if (lc) shape.lineColor = lc;
      if (ln.attrs['w']) shape.lineWidth = parseInt(ln.attrs['w'], 10);
      const dash = firstChild(ln, 'a:prstDash');
      if (dash?.attrs['val']) shape.lineDash = dash.attrs['val'];
      // setas de linha (headEnd/tailEnd; type=none omite)
      const head = firstChild(ln, 'a:headEnd');
      if (head?.attrs['type'] && head.attrs['type'] !== 'none') shape.headArrow = head.attrs['type'];
      const tail = firstChild(ln, 'a:tailEnd');
      if (tail?.attrs['type'] && tail.attrs['type'] !== 'none') shape.tailArrow = tail.attrs['type'];
    }
  }
  // <p:sp useBgFill="1">: o preenchimento é o fundo do slide (aplicado em readSlide)
  if (sp.attrs['useBgFill'] === '1' || sp.attrs['useBgFill'] === 'true') { shape.useBgFill = true; delete shape.fill; }
  // efeitos (sombra externa/interna, brilho, bordas suaves, reflexo): os do
  // spPr ou, sem `<a:effectLst>` próprio, o estilo do tema pelo effectRef
  readEffects(spPr, firstChild(sp, 'p:style'), theme, shape);
  readBevel(spPr, firstChild(sp, 'p:style'), theme, shape);
  // câmera 3D girada (cena 3D da forma): a projeção vira uma transformação afim
  const scene = spPr ? firstChild(spPr, 'a:scene3d') : undefined;
  const camera = scene ? firstChild(scene, 'a:camera') : undefined;
  const camRot = camera ? firstChild(camera, 'a:rot') : undefined;
  if (camRot && (camRot.attrs['lat'] || camRot.attrs['lon'] || camRot.attrs['rev'])) {
    const deg = (k: string) => parseInt(camRot.attrs[k] ?? '0', 10) / 60000;
    shape.camRot = { lat: deg('lat'), lon: deg('lon'), rev: deg('rev') };
  }

  // <p:style> (spec 03 B): defaults tematicos quando spPr/run nao especifica.
  //   fillRef -> cor de preenchimento; lnRef -> cor de linha;
  //   fontRef -> cor/fonte default de texto (entra na cascata de estilos).
  const styleEl = firstChild(sp, 'p:style');
  if (styleEl) {
    const refColor = (name: string): string | undefined => {
      const ref = firstChild(styleEl, name);
      if (!ref || ref.attrs['idx'] === '0') return undefined; // idx=0 = sem estilo
      return colorFromDml(childElements(ref)[0], theme);
    };
    if (!shape.fill && !shape.fillImage && !shape.grpFill && !shape.useBgFill) {
      // estilo do fillStyleLst do tema (idx 1 sólido, 2/3 degradês nos temas
      // 2007–2013) com phClr = cor da referência; sem tema, a cor pura
      const ref = firstChild(styleEl, 'a:fillRef');
      const st = ref ? themeStyleFill(ref, theme, pkg) : undefined;
      if (st?.fill) shape.fill = st.fill;
      else if (st?.image) { shape.fillImage = st.image; if (st.tile) shape.fillTile = true; }
      else {
        const fc = refColor('a:fillRef');
        if (fc) shape.fill = { type: 'solid', color: fc };
      }
    }
    // degradê do spPr SEM <a:lin>/<a:path>: a direção vem do degradê do estilo do
    // tema apontado pelo fillRef (medido, syn-gradnolin2: fillRef 2/3 com lin 90° →
    // vertical; fillRef 1 sólido → o padrão horizontal)
    const spPrEl = firstChild(sp, 'p:spPr');
    const gfEl = spPrEl ? firstChild(spPrEl, 'a:gradFill') : undefined;
    if (shape.fill?.type === 'gradient' && gfEl && !firstChild(gfEl, 'a:lin') && !firstChild(gfEl, 'a:path')) {
      const fr = firstChild(styleEl, 'a:fillRef');
      const idx = fr ? parseInt(fr.attrs['idx'] ?? '0', 10) : 0;
      const stEl = idx >= 1 && idx < 1000 ? theme.fillStyles?.[idx - 1] : undefined;
      const lin = stEl?.name === 'a:gradFill' ? firstChild(stEl, 'a:lin') : undefined;
      if (lin?.attrs['ang'] !== undefined) {
        shape.fill = { ...shape.fill, angleDeg: parseInt(lin.attrs['ang'], 10) / 60000, ...(lin.attrs['scaled'] === '1' ? { scaled: true } : {}) };
      }
    }
    if (shape.lineColor === undefined && !shape.lineNone) {
      const lc = refColor('a:lnRef');
      if (lc) {
        shape.lineColor = lc;
        // largura vem do lnStyleLst do tema pelo idx do lnRef
        if (shape.lineWidth === undefined) {
          const lnRef = firstChild(styleEl, 'a:lnRef');
          const idx = lnRef?.attrs['idx'] !== undefined ? parseInt(lnRef.attrs['idx'], 10) : 0;
          const w = idx >= 1 ? theme.lineWidths?.[idx - 1] : undefined;
          if (w !== undefined) shape.lineWidth = w;
        }
      }
    }
    const fontRef = firstChild(styleEl, 'a:fontRef');
    if (fontRef) {
      const fc = colorFromDml(childElements(fontRef)[0], theme);
      if (fc) shape.styleFontColor = fc;
      if (fontRef.attrs['idx']) shape.styleFontIdx = fontRef.attrs['idx'];
    }
  }

  const txBody = firstChild(sp, 'p:txBody');
  if (txBody) shape.txBody = readTxBody(txBody, theme, rels, pkg);
  return shape;
}

/**
 * Parse de `<a:custGeom>` → paths escaláveis. Coordenadas ficam nas unidades
 * do próprio path (`<a:path w h>`); o renderer escala para o xfrm da shape.
 * Cobre moveTo/lnTo/cubicBezTo/quadBezTo/close (freeforms do app de referência).
 */
function parseCustGeom(cust: XmlElement, shapeW?: number, shapeH?: number): { w: number; h: number; subs: PathSeg[][]; noFill?: boolean[]; noStroke?: boolean[]; lum?: number[]; textRect?: { l: number; t: number; r: number; b: number } } | undefined {
  const pathLst = firstChild(cust, 'a:pathLst');
  if (!pathLst) return undefined;
  const subs: PathSeg[][] = [];
  const noFill: boolean[] = [], noStroke: boolean[] = [];
  // fill="darken|darkenLess|lighten|lightenLess": face mais escura/clara (como nos presets)
  const lum: number[] = [];
  const SHADE: Record<string, number> = { darken: -0.4, darkenLess: -0.2, lighten: 0.4, lightenLess: 0.2 };
  const sizes: [number, number][] = [];
  let pw = 0, ph = 0;
  // guias em fórmula (avLst/gdLst — o LibreOffice grava os presets assim): os pontos
  // citam guias pelo nome, avaliadas no tamanho da forma (EMU); sem w/h no <a:path>,
  // o caminho está nesse mesmo sistema
  const sw = shapeW && shapeW > 0 ? shapeW : 0, sh = shapeH && shapeH > 0 ? shapeH : 0;
  const guides = (el: XmlElement | undefined): [string, string[]][] => (el ? childElements(el, 'a:gd') : [])
    .slice(0, 2000).map((g) => [g.attrs['name'] ?? '', (g.attrs['fmla'] ?? '').trim().split(/\s+/)] as [string, string[]]);
  const val = customGuides(guides(firstChild(cust, 'a:avLst')), guides(firstChild(cust, 'a:gdLst')), sw || 21600, sh || 21600);
  const num = (t: string | undefined): number => (t === undefined ? 0 : /^-?\d+$/.test(t) ? parseInt(t, 10) : val(t));
  const pt = (el: XmlElement | undefined): { x: number; y: number } => ({ x: num(el?.attrs['x']), y: num(el?.attrs['y']) });
  for (const path of childElements(pathLst, 'a:path')) {
    if (path.attrs['w']) pw = Math.max(pw, parseInt(path.attrs['w'], 10));
    if (path.attrs['h']) ph = Math.max(ph, parseInt(path.attrs['h'], 10));
    const segs: PathSeg[] = [];
    let cx = 0, cy = 0;
    for (const el of childElements(path)) {
      const pts = childElements(el, 'a:pt');
      if (el.name === 'a:moveTo') { const p = pt(pts[0]); segs.push({ c: 'M', x: p.x, y: p.y }); cx = p.x; cy = p.y; }
      else if (el.name === 'a:lnTo') { const p = pt(pts[0]); segs.push({ c: 'L', x: p.x, y: p.y }); cx = p.x; cy = p.y; }
      else if (el.name === 'a:cubicBezTo') {
        const p1 = pt(pts[0]), p2 = pt(pts[1]), p3 = pt(pts[2]);
        segs.push({ c: 'C', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, x: p3.x, y: p3.y }); cx = p3.x; cy = p3.y;
      } else if (el.name === 'a:quadBezTo') {
        const p1 = pt(pts[0]), p2 = pt(pts[1]);
        segs.push({ c: 'Q', x1: p1.x, y1: p1.y, x: p2.x, y: p2.y }); cx = p2.x; cy = p2.y;
      } else if (el.name === 'a:arcTo') {
        const a = arcToSeg(cx, cy, num(el.attrs['wR']), num(el.attrs['hR']), num(el.attrs['stAng']), num(el.attrs['swAng']));
        if (a) { segs.push(a.seg); cx = a.x; cy = a.y; }
      } else if (el.name === 'a:close') segs.push({ c: 'Z' });
    }
    if (segs.length) {
      subs.push(segs);
      const ownW = parseInt(path.attrs['w'] ?? '0', 10) || 0, ownH = parseInt(path.attrs['h'] ?? '0', 10) || 0;
      // caminho sem w/h: coordenadas no tamanho da forma
      if (!ownW && sw) pw = Math.max(pw, sw);
      if (!ownH && sh) ph = Math.max(ph, sh);
      sizes.push([ownW || sw, ownH || sh]);
      noFill.push(path.attrs['fill'] === 'none');
      lum.push(SHADE[path.attrs['fill'] ?? ''] ?? 0);
      noStroke.push(path.attrs['stroke'] === '0' || path.attrs['stroke'] === 'false');
    }
  }
  if (!subs.length) return undefined;
  // retângulo de texto (<a:rect l t r b>, guias no tamanho da forma) como fração da caixa
  const rc = firstChild(cust, 'a:rect');
  let textRect: { l: number; t: number; r: number; b: number } | undefined;
  if (rc && sw && sh) {
    const [l, t, r, b] = (['l', 't', 'r', 'b'] as const).map((k) => num(rc.attrs[k] ?? (k === 'l' || k === 't' ? '0' : k === 'r' ? 'r' : 'b')));
    if (r! > l! && b! > t! && (l! > 1 || t! > 1 || r! < sw - 1 || b! < sh - 1)) textRect = { l: l! / sw, t: t! / sh, r: r! / sw, b: b! / sh };
  }
  // cada <a:path> tem o próprio sistema w×h: leva todos ao maior (o que a forma estica)
  subs.forEach((segs, i) => {
    const [wi, hi] = sizes[i]!;
    const kx = wi > 0 && pw > 0 && wi !== pw ? pw / wi : 1, ky = hi > 0 && ph > 0 && hi !== ph ? ph / hi : 1;
    if (kx === 1 && ky === 1) return;
    for (const g of segs) {
      if ('x' in g) { g.x *= kx; g.y *= ky; }
      if ('x1' in g) { g.x1 *= kx; g.y1 *= ky; }
      if ('x2' in g) { g.x2 *= kx; g.y2 *= ky; }
    }
  });
  return { w: pw || 1, h: ph || 1, subs, ...(noFill.some(Boolean) ? { noFill } : {}), ...(noStroke.some(Boolean) ? { noStroke } : {}), ...(lum.some((v) => v !== 0) ? { lum } : {}), ...(textRect ? { textRect } : {}) };
}

/**
 * Estilo de preenchimento do TEMA referenciado por `<a:fillRef idx>` (1…) ou
 * `<p:bgRef idx>` (1001…), com `phClr` = cor filha da referência. idx 0 = nada.
 * Imagens do estilo resolvem pelos rels do próprio tema.
 */
/**
 * Estilo de um rótulo do SmartArt (`node1`, `sibTrans2D1`…): cor pela definição
 * de cores (`colorsN.xml`: lista repeat/cycle ou span interpolado pelo índice do
 * nó) e preenchimento/contorno pelo estilo rápido (`quickStyleN.xml`: fillRef/lnRef
 * do tema com essa cor no phClr). Sem a parte, o default do app (accent1_2).
 */
function diagramStyler(colors: XmlElement | undefined, quick: XmlElement | undefined, theme: Theme): (lbl: string, idx: number, cnt: number, spPr?: XmlElement) => DgmStyle | undefined {
  const lbls = (root: XmlElement | undefined) => new Map((root ? childElements(root, 'dgm:styleLbl') : []).map((e) => [e.attrs['name'] ?? '', e]));
  const cl = lbls(colors), qs = lbls(quick);
  const pick = (lst: XmlElement | undefined, idx: number, cnt: number): string | undefined => {
    const cs = lst ? childElements(lst).map((c) => colorFromDml(c, theme)).filter((c): c is string => !!c) : [];
    if (!cs.length) return undefined;
    const meth = lst!.attrs['meth'] ?? 'span';
    if (meth !== 'span' || cs.length === 1) return cs[idx % cs.length];
    const t = cnt > 1 ? Math.min(1, idx / (cnt - 1)) * (cs.length - 1) : 0;
    const i = Math.min(cs.length - 2, Math.floor(t)), u = t - i;
    const a = cs[i]!, b = cs[i + 1]!;
    const ch = (k: number) => Math.round(parseInt(a.slice(k, k + 2), 16) * (1 - u) + parseInt(b.slice(k, k + 2), 16) * u).toString(16).padStart(2, '0');
    return '#' + ch(1) + ch(3) + ch(5);
  };
  return (lbl, idx, cnt, spPr) => {
    const base = styleOf(lbl, idx, cnt);
    if (!spPr) return base;
    // formatação do usuário no ponto (`dgm:spPr`) por cima do estilo
    const out: DgmStyle = { ...(base ?? {}) };
    const f = groupFill(spPr, theme);
    if (f) { out.fill = f.fill; if (f.alpha !== undefined) out.fillAlpha = f.alpha; }
    const ln = firstChild(spPr, 'a:ln');
    if (ln) {
      if (firstChild(ln, 'a:noFill')) { out.line = undefined; out.lineWidth = undefined; } else {
        const lc = solidFillColor(ln, theme);
        if (lc) out.line = lc;
        if (ln.attrs['w']) out.lineWidth = parseInt(ln.attrs['w'], 10);
        else if (lc) out.lineWidth ??= 9525;
      }
    }
    return out;
  };
  function styleOf(lbl: string, idx: number, cnt: number): DgmStyle | undefined {
    const c = cl.get(lbl), q = qs.get(lbl);
    if (!c) return undefined;
    const fillC = pick(firstChild(c, 'dgm:fillClrLst'), idx, cnt);
    const lineC = pick(firstChild(c, 'dgm:linClrLst'), idx, cnt);
    const style = q ? firstChild(q, 'dgm:style') : undefined;
    const fontRef = style ? firstChild(style, 'a:fontRef') : undefined;
    const text = pick(firstChild(c, 'dgm:txFillClrLst'), idx, cnt) ?? (fontRef ? colorFromDml(childElements(fontRef)[0], theme) : undefined);
    const fillRef = style ? firstChild(style, 'a:fillRef') : undefined;
    const lnRef = style ? firstChild(style, 'a:lnRef') : undefined;
    let fill: Fill | undefined = fillC ? { type: 'solid', color: fillC } : { type: 'none' };
    if (fillRef && fillC) {
      const idxF = parseInt(fillRef.attrs['idx'] ?? '0', 10);
      fill = idxF > 0 ? themeStyleFill(parseXml(`<a:fillRef idx="${idxF}"><a:srgbClr val="${fillC.slice(1)}"/></a:fillRef>`), theme)?.fill ?? fill : { type: 'none' };
    }
    const lnIdx = lnRef ? parseInt(lnRef.attrs['idx'] ?? '0', 10) : 1;
    const lineWidth = lnIdx > 0 && lineC ? theme.lineWidths?.[lnIdx - 1] ?? 9525 : undefined;
    return { fill, line: lineWidth ? lineC : undefined, lineWidth, text };
  }
}

function themeStyleFill(ref: XmlElement, theme: Theme, pkg?: PptxPackage): { fill?: Fill; image?: ImageRef; tile?: boolean } | undefined {
  const idx = parseInt(ref.attrs['idx'] ?? '0', 10);
  if (!(idx > 0)) return undefined;
  const el = idx >= 1001 ? theme.bgFillStyles?.[idx - 1001] : theme.fillStyles?.[idx - 1];
  if (!el) return undefined;
  const ph = colorFromDml(childElements(ref)[0], theme);
  const t: Theme = ph ? { ...theme, colors: { ...theme.colors, phClr: ph } } : theme;
  switch (el.name) {
    case 'a:noFill': return { fill: { type: 'none' } };
    case 'a:solidFill': {
      const c = colorFromDml(childElements(el)[0], t);
      return c ? { fill: { type: 'solid', color: c } } : undefined;
    }
    case 'a:gradFill': {
      const g = parseGradFill(el, t);
      return g ? { fill: g } : undefined;
    }
    case 'a:pattFill': {
      const f = parsePattFill(el, t);
      return f ? { fill: f } : undefined;
    }
    case 'a:blipFill': {
      const blip = firstChild(el, 'a:blip');
      if (!blip || !pkg || !theme.part) return ph ? { fill: { type: 'solid', color: ph } } : undefined;
      const img = resolveBlip(blip, pkg, readRels(pkg, relsPathFor(theme.part), theme.part), t);
      if (!img) return ph ? { fill: { type: 'solid', color: ph } } : undefined;
      return { image: img, tile: applyTile(img, el) };
    }
  }
  return undefined;
}

/** `<a:pattFill prst>` → Fill sólido na cor MÉDIA + o padrão (frente/fundo resolvidos). */
function parsePattFill(el: XmlElement, theme: Theme): Fill | undefined {
  const fgEl = firstChild(el, 'a:fgClr'), bgEl = firstChild(el, 'a:bgClr');
  const fg = (fgEl ? colorFromDml(childElements(fgEl)[0], theme) : undefined) ?? '#000000';
  const bg = (bgEl ? colorFromDml(childElements(bgEl)[0], theme) : undefined) ?? '#FFFFFF';
  const prst = el.attrs['prst'] ?? 'pct5';
  const d = patternDensity(prst);
  const n = (h: string): number[] => { const v = parseInt(h.replace('#', ''), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const a = n(fg), b = n(bg);
  const avg = '#' + a.map((c, i) => Math.round(c * d + b[i]! * (1 - d)).toString(16).padStart(2, '0')).join('');
  // alfa de cada cor do padrão (medido, syn-pattalpha: o app compõe frente/fundo com o alfa)
  const alphaOf = (e: XmlElement | undefined): number | undefined => {
    const v = e ? fillAlphaEl(e)?.attrs['val'] : undefined;
    return v !== undefined ? Math.max(0, Math.min(1, parseInt(v, 10) / 100000)) : undefined;
  };
  const fgA = alphaOf(fgEl), bgA = alphaOf(bgEl);
  return { type: 'solid', color: avg, pattern: { prst, fg, bg, ...(fgA !== undefined && fgA < 1 ? { fgA } : {}), ...(bgA !== undefined && bgA < 1 ? { bgA } : {}) } };
}

/** Parse de `<a:gradFill>` -> Fill gradient (2+ stops; `<a:lin ang>` em graus). */
function parseGradFill(grad: XmlElement, theme: Theme): { type: 'gradient'; stops: GradientStop[]; angleDeg: number } | undefined {
  const gsLst = firstChild(grad, 'a:gsLst');
  if (!gsLst) return undefined;
  const stops: GradientStop[] = [];
  for (const gs of childElements(gsLst, 'a:gs')) {
    const pos = gs.attrs['pos'] !== undefined ? parseInt(gs.attrs['pos'], 10) / 100000 : 0;
    const colorEl = childElements(gs)[0];
    const color = colorFromDml(colorEl, theme);
    if (!color) continue;
    const stop: GradientStop = { pos: Math.max(0, Math.min(1, pos)), color };
    // alfa por stop (overlays de template usam transparente→escuro)
    const alphaEl = colorEl ? lastChild(colorEl, 'a:alpha') : undefined;
    if (alphaEl?.attrs['val']) stop.alpha = parseInt(alphaEl.attrs['val'], 10) / 100000;
    stops.push(stop);
  }
  if (stops.length < 2) return undefined;
  stops.sort((a, b) => a.pos - b.pos);
  const lin = firstChild(grad, 'a:lin');
  const angleDeg = lin?.attrs['ang'] !== undefined ? parseInt(lin.attrs['ang'], 10) / 60000 : 0;
  const out: { type: 'gradient'; stops: GradientStop[]; angleDeg: number; scaled?: boolean; path?: string } =
    { type: 'gradient', stops, angleDeg };
  if (lin?.attrs['scaled'] === '1') out.scaled = true;
  // gradiente radial: <a:path path="rect|circle|shape"> (pos 0 = centro)
  const pathEl = firstChild(grad, 'a:path');
  if (pathEl) {
    out.path = pathEl.attrs['path'] ?? 'shape';
    const ftr = firstChild(pathEl, 'a:fillToRect');
    if (ftr) {
      const n = (k: string): number => (ftr.attrs[k] !== undefined ? parseInt(ftr.attrs[k]!, 10) / 100000 : 0);
      (out as { fillTo?: { l: number; t: number; r: number; b: number } }).fillTo = { l: n('l'), t: n('t'), r: n('r'), b: n('b') };
    }
  }
  return out;
}

function parseXfrm(el: XmlElement): Xfrm {
  const off = firstChild(el, 'a:off');
  const ext = firstChild(el, 'a:ext');
  const x: Xfrm = {
    x: off?.attrs['x'] !== undefined ? parseInt(off.attrs['x'], 10) : 0,
    y: off?.attrs['y'] !== undefined ? parseInt(off.attrs['y'], 10) : 0,
    cx: ext?.attrs['cx'] !== undefined ? parseInt(ext.attrs['cx'], 10) : 0,
    cy: ext?.attrs['cy'] !== undefined ? parseInt(ext.attrs['cy'], 10) : 0,
  };
  if (el.attrs['rot']) x.rot = parseInt(el.attrs['rot'], 10);
  if (el.attrs['flipH'] === '1') x.flipH = true;
  if (el.attrs['flipV'] === '1') x.flipV = true;
  return x;
}

function readTxBody(el: XmlElement, theme: Theme, rels?: Map<string, string>, pkg?: PptxPackage): TextBody {
  const blip: BlipResolver | undefined = pkg && rels ? (b) => resolveBlip(b, pkg, rels, theme) : undefined;
  const bodyPr = firstChild(el, 'a:bodyPr');
  const tb: TextBody = { paragraphs: [] };
  if (bodyPr) {
    if (bodyPr.attrs['anchor']) tb.anchor = bodyPr.attrs['anchor'];
    if (bodyPr.attrs['wrap']) tb.wrap = bodyPr.attrs['wrap'];
    if (bodyPr.attrs['spcFirstLastPara'] !== undefined) tb.spcFirstLastPara = bodyPr.attrs['spcFirstLastPara'] === '1';
    if (bodyPr.attrs['vert']) tb.vert = bodyPr.attrs['vert']; // 'horz' explícito também (vence o vertical herdado)
    if (bodyPr.attrs['rot'] && /^-?\d+$/.test(bodyPr.attrs['rot'])) tb.rot = parseInt(bodyPr.attrs['rot'], 10);
    // insets em EMU (defaults do app ficam a cargo do layout/render)
    if (bodyPr.attrs['lIns'] !== undefined) tb.insL = parseInt(bodyPr.attrs['lIns'], 10);
    if (bodyPr.attrs['tIns'] !== undefined) tb.insT = parseInt(bodyPr.attrs['tIns'], 10);
    if (bodyPr.attrs['rIns'] !== undefined) tb.insR = parseInt(bodyPr.attrs['rIns'], 10);
    if (bodyPr.attrs['bIns'] !== undefined) tb.insB = parseInt(bodyPr.attrs['bIns'], 10);
    // colunas de texto: numCol + espaçamento entre colunas (EMU)
    if (bodyPr.attrs['numCol'] !== undefined) tb.numCol = parseInt(bodyPr.attrs['numCol'], 10);
    if (bodyPr.attrs['spcCol'] !== undefined) tb.spcCol = parseInt(bodyPr.attrs['spcCol'], 10);
    // WordArt: <a:prstTxWarp prst="textArchUp"><a:avLst><a:gd fmla="val N"/>…
    const warp = firstChild(bodyPr, 'a:prstTxWarp');
    // 2007+ e legado (fromWordArt="1") deformam; o legado escala o texto até cobrir o
    // caminho dos arcos (text-warp.ts tem as regras medidas)
    if (warp?.attrs['prst'] && warp.attrs['prst'] !== 'textNoShape') {
      const av = firstChild(warp, 'a:avLst');
      const adj = av ? childElements(av, 'a:gd').map((g) => parseInt(/val (-?\d+)/.exec(g.attrs['fmla'] ?? '')?.[1] ?? '0', 10)) : [];
      tb.warp = { prst: warp.attrs['prst'], ...(adj.length ? { adj } : {}), ...(bodyPr.attrs['fromWordArt'] === '1' ? { fromWordArt: true } : {}) };
    }
    // autofit: <a:normAutofit fontScale="62500" lnSpcReduction="20000"/>
    const na = firstChild(bodyPr, 'a:normAutofit');
    if (na) tb.autofit = 'norm';
    else if (firstChild(bodyPr, 'a:noAutofit')) tb.autofit = 'none';
    else if (firstChild(bodyPr, 'a:spAutoFit')) tb.autofit = 'shape';
    if (na) {
      if (na.attrs['fontScale'] !== undefined) tb.fontScale = parseInt(na.attrs['fontScale'], 10) / 100000;
      if (na.attrs['lnSpcReduction'] !== undefined) tb.lnSpcReduction = parseInt(na.attrs['lnSpcReduction'], 10) / 100000;
    }
  }
  // <a:lstStyle> do txBody — maior prioridade da cascata (spec 03 A)
  const lst = firstChild(el, 'a:lstStyle');
  if (lst && childElements(lst).length > 0) tb.lstStyle = parseTxStyleLevels(lst, theme, blip);
  for (const p of childElements(el, 'a:p')) tb.paragraphs.push(readParagraph(p, theme, rels, blip));
  return tb;
}

function readParagraph(p: XmlElement, theme: Theme, rels?: Map<string, string>, blip?: BlipResolver): Paragraph {
  const para: Paragraph = { runs: [] };
  const pPr = firstChild(p, 'a:pPr');
  if (pPr) {
    if (pPr.attrs['algn']) para.align = pPr.attrs['algn'];
    if (pPr.attrs['lvl']) para.level = parseInt(pPr.attrs['lvl'], 10);
    if (pPr.attrs['marL'] !== undefined) para.marL = parseInt(pPr.attrs['marL'], 10);
    if (pPr.attrs['defTabSz'] !== undefined) para.defTabSz = parseInt(pPr.attrs['defTabSz'], 10);
    const tl = firstChild(pPr, 'a:tabLst');
    if (tl) para.tabs = childElements(tl, 'a:tab').map((t) => ({ pos: parseInt(t.attrs['pos'] ?? '0', 10), algn: t.attrs['algn'] ?? 'l' })).sort((a, b) => a.pos - b.pos);
    if (pPr.attrs['indent'] !== undefined) para.indent = parseInt(pPr.attrs['indent'], 10);
    // entrelinha e espaçamento antes/depois do parágrafo
    const lnSpc = firstChild(pPr, 'a:lnSpc');
    if (lnSpc) {
      const pct = firstChild(lnSpc, 'a:spcPct');
      const pts = firstChild(lnSpc, 'a:spcPts');
      if (pct?.attrs['val']) para.lineSpacing = parseInt(pct.attrs['val'], 10) / 100000;
      else if (pts?.attrs['val']) para.lineSpacingPt = parseInt(pts.attrs['val'], 10) / 100;
    }
    const spcBef = firstChild(pPr, 'a:spcBef');
    const befPts = spcBef ? firstChild(spcBef, 'a:spcPts') : undefined;
    if (befPts?.attrs['val']) para.spaceBeforePt = parseInt(befPts.attrs['val'], 10) / 100;
    const befPct = spcBef ? firstChild(spcBef, 'a:spcPct') : undefined;
    if (befPct?.attrs['val']) para.spaceBeforePct = parseInt(befPct.attrs['val'], 10) / 100000;
    const spcAft = firstChild(pPr, 'a:spcAft');
    const aftPts = spcAft ? firstChild(spcAft, 'a:spcPts') : undefined;
    if (aftPts?.attrs['val']) para.spaceAfterPt = parseInt(aftPts.attrs['val'], 10) / 100;
    const aftPct = spcAft ? firstChild(spcAft, 'a:spcPct') : undefined;
    if (aftPct?.attrs['val']) para.spaceAfterPct = parseInt(aftPct.attrs['val'], 10) / 100000;
    // bullet explicito: buChar/buAutoNum ligam; buNone desliga (bloqueia heranca)
    const buChar = firstChild(pPr, 'a:buChar');
    const buAuto = firstChild(pPr, 'a:buAutoNum');
    if (buChar) {
      para.bullet = true;
      if (buChar.attrs['char']) para.bulletChar = buChar.attrs['char'];
    } else if (buAuto) {
      para.bullet = true;
      para.bulletAutoNum = buAuto.attrs['type'] ?? 'arabicPeriod';
    } else if (firstChild(pPr, 'a:buNone')) {
      para.bullet = false;
    }
    // marcador de IMAGEM (buBlip): substitui o caractere
    const buBlip = firstChild(pPr, 'a:buBlip');
    const bb = buBlip ? firstChild(buBlip, 'a:blip') : undefined;
    const bimg = bb && blip ? blip(bb) : undefined;
    if (bimg) { para.bullet = true; para.bulletImage = bimg; para.bulletChar ??= '•'; }
    readBulletStyle(pPr, theme, para);
  }
  // fim de parágrafo: tamanho da linha de um parágrafo VAZIO
  const endRPr = firstChild(p, 'a:endParaRPr');
  if (endRPr?.attrs['sz']) para.endSz = parseInt(endRPr.attrs['sz'], 10) / 100;
  for (const child of childElements(p)) {
    if (child.name === 'a:r') para.runs.push(readRun(child, theme, rels, blip));
    else if (child.name === 'a:br') para.runs.push({ text: '\n' });
    else if (child.name === 'a:fld') {
      // campo: formatação própria como um run (rPr); o tipo fica para o valor ao vivo
      const fr = readRun(child, theme, rels, blip);
      if (child.attrs['type']) fr.field = child.attrs['type'];
      para.runs.push(fr);
    }
  }
  return para;
}

/** Marcador do pPr: fonte, cor e tamanho (`buFont`/`buClr`/`buSzPct|Pts`; `*Tx` = segue o texto). */
function readBulletStyle(pPr: XmlElement, theme: Theme, para: Paragraph): void {
  const bf = firstChild(pPr, 'a:buFont');
  if (bf?.attrs['typeface']) para.bulletFont = bf.attrs['typeface'];
  const bc = firstChild(pPr, 'a:buClr');
  const c = bc ? colorFromDml(childElements(bc)[0], theme) : undefined;
  if (c) para.bulletColor = c;
  const pct = firstChild(pPr, 'a:buSzPct'), pts = firstChild(pPr, 'a:buSzPts');
  if (pct?.attrs['val']) para.bulletSizePct = parseInt(pct.attrs['val'], 10) / 100000;
  else if (pts?.attrs['val']) para.bulletSizePt = parseInt(pts.attrs['val'], 10) / 100;
  else if (firstChild(pPr, 'a:buSzTx')) para.bulletSizePct = 1;
}

function readRun(r: XmlElement, theme: Theme, rels?: Map<string, string>, blip?: BlipResolver): Run {
  const t = firstChild(r, 'a:t');
  const run: Run = { text: t ? textContent(t) : '' };
  const rPr = firstChild(r, 'a:rPr');
  if (rPr) {
    if (rPr.attrs['sz']) run.sz = parseInt(rPr.attrs['sz'], 10) / 100;
    // b/i explicitos (inclusive "0", que BLOQUEIA heranca da cascata)
    if (rPr.attrs['b'] !== undefined) run.bold = rPr.attrs['b'] === '1';
    if (rPr.attrs['i'] !== undefined) run.italic = rPr.attrs['i'] === '1';
    if (rPr.attrs['u'] && rPr.attrs['u'] !== 'none') run.underline = true;
    readRunExtras(rPr, run);
    const c = textFillColor(rPr, theme);
    if (c) run.color = c;
    const latin = firstChild(rPr, 'a:latin');
    if (latin?.attrs['typeface']) run.font = latin.attrs['typeface'];
    const sym = firstChild(rPr, 'a:sym');
    if (sym?.attrs['typeface']) run.symFont = sym.attrs['typeface'];
    // contorno das letras e preenchimento de padrão (WordArt)
    const rln = firstChild(rPr, 'a:ln');
    if (rln && !firstChild(rln, 'a:noFill')) {
      const oc = solidFillColor(rln, theme);
      const sfl = firstChild(rln, 'a:solidFill');
      const oa = sfl ? fillAlphaEl(sfl)?.attrs['val'] : undefined;
      const alpha = oa !== undefined ? parseInt(oa, 10) / 100000 : 1;
      // contorno transparente (alpha 0, comum em decks coreanos) não desenha
      if (oc && alpha > 0) {
        const n = parseInt(oc.slice(1), 16);
        const color = alpha < 1 ? `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})` : oc;
        run.outline = { color, width: rln.attrs['w'] ? parseInt(rln.attrs['w'], 10) : 12700 };
      }
    }
    const rpf = firstChild(rPr, 'a:pattFill');
    const pf = rpf ? parsePattFill(rpf, theme) : undefined;
    if (pf?.pattern) { run.pattFill = pf.pattern; run.color = pf.color!; }
    // degradê, imagem e opacidade das letras (o desenho usa a caixa da LINHA — medido, syn-b-e11)
    const rgf = firstChild(rPr, 'a:gradFill');
    const gfill = rgf ? parseGradFill(rgf, theme) : undefined;
    if (gfill) run.gradFill = gfill;
    const rbf = firstChild(rPr, 'a:blipFill'), rbb = rbf ? firstChild(rbf, 'a:blip') : undefined;
    const rimg = rbb && blip ? blip(rbb) : undefined;
    if (rimg && rbf) { run.fillImage = rimg; if (applyTile(rimg, rbf)) run.fillTile = true; }
    const rsf = firstChild(rPr, 'a:solidFill'), ra = rsf ? fillAlphaEl(rsf)?.attrs['val'] : undefined;
    if (ra !== undefined && parseInt(ra, 10) < 100000) run.alpha = Math.max(0, parseInt(ra, 10) / 100000);
    // letras sem preenchimento (só o contorno)
    if (firstChild(rPr, 'a:noFill')) run.alpha = 0;
    // hyperlink: <a:hlinkClick r:id="rIdN"/> -> resolve via rels do slide
    const hlink = firstChild(rPr, 'a:hlinkClick');
    // aparência de link: cor hlink do tema + sublinhado — salvo `<ahyp:hlinkClr val="tx">`
    // (Office 2019+: segue a cor do texto) ou ação que não é salto (macro, "nada")
    if (hlink) {
      const action = hlink.attrs['action'] ?? '';
      const tx = descend(hlink, 'ahyp:hlinkClr')?.attrs['val'] === 'tx';
      const isLink = !!(hlink.attrs['r:id'] || hlink.attrs['id']) || action.startsWith('ppaction://hlink');
      if (isLink && !tx && theme.colors['hlink']) run.linkColor = theme.colors['hlink'];
    }
    if (hlink && rels) {
      const rid = hlink.attrs['r:id'] ?? hlink.attrs['id'];
      // hlinkClick External targets vão num formato especial — `pkg.resolveRelTarget`
      // não foi aplicado ao mapa rels (somente para internal). Reler aqui na rels-fonte.
      if (rid) {
        const direct = rels.get(rid);
        if (direct && /^https?:/i.test(direct)) run.hyperlink = direct;
      }
    }
  }
  // sombra do texto (efeito comum em títulos de template sobre foto)
  if (rPr) {
    const eff = firstChild(rPr, 'a:effectLst');
    const shd = eff ? firstChild(eff, 'a:outerShdw') : undefined;
    if (shd) {
      const blurRad = shd.attrs['blurRad'] ? parseInt(shd.attrs['blurRad'], 10) : 0;
      const dist = shd.attrs['dist'] ? parseInt(shd.attrs['dist'], 10) : 0;
      const dirDeg = (shd.attrs['dir'] ? parseInt(shd.attrs['dir'], 10) : 5400000) / 60000;
      const colorEl = childElements(shd)[0];
      // sem <a:alpha> a sombra é OPACA (medido, syn-b-e7: FF8000 sai FF8000)
      let color = '#000000', alpha = 1;
      if (colorEl) {
        const c = colorFromDml(colorEl, theme);
        if (c) color = c;
        const aEl = lastChild(colorEl, 'a:alpha');
        if (aEl?.attrs['val']) alpha = parseInt(aEl.attrs['val'], 10) / 100000;
      }
      run.shadow = { color, blurRad, dist, dirDeg, alpha };
    }
  }

  return run;
}

// ─────────────────────────── <p:pic> + blipFill ───────────────────────────

/**
 * Le `<p:pic>` (imagem embutida) -> Shape com `image` resolvida via rels.
 *
 * Estrutura no OOXML:
 *   <p:pic>
 *     <p:nvPicPr><p:cNvPr id name descr/>…</p:nvPicPr>
 *     <p:blipFill>
 *       <a:blip r:embed="rId2"/>            ◄── resolve para "ppt/media/imgN.png"
 *       <a:srcRect l="…" t="…" r="…" b="…"/> ◄── opcional, crop em milesimos de %
 *       <a:stretch><a:fillRect/></a:stretch>
 *     </p:blipFill>
 *     <p:spPr>
 *       <a:xfrm><a:off x y/><a:ext cx cy/></a:xfrm>
 *       <a:prstGeom prst="rect"/>
 *     </p:spPr>
 *   </p:pic>
 */
function readPic(pic: XmlElement, theme: Theme, pkg: PptxPackage, rels: Map<string, string>): Shape {
  const nvPicPr = firstChild(pic, 'p:nvPicPr');
  const cNvPr = nvPicPr ? firstChild(nvPicPr, 'p:cNvPr') : undefined;
  // <p:blipFill> dentro de mc:AlternateContent (PowerPoint do Mac: Choice "ma" com PDF,
  // Fallback com PNG) — vale o Fallback, que é o que o app do Windows desenha
  const alt = firstChild(pic, 'mc:AlternateContent');
  const blipFill = firstChild(pic, 'p:blipFill')
    ?? (alt ? firstChild(firstChild(alt, 'mc:Fallback') ?? firstChild(alt, 'mc:Choice') ?? alt, 'p:blipFill') : undefined);
  const blip = blipFill ? firstChild(blipFill, 'a:blip') : undefined;
  const srcRect = blipFill ? firstChild(blipFill, 'a:srcRect') : undefined;
  const spPr = firstChild(pic, 'p:spPr');

  const shape: Shape = {
    id: cNvPr?.attrs['id'] ?? '',
    name: cNvPr?.attrs['name'] ?? '',
  };

  // imagem DENTRO de placeholder (`<p:ph type="pic" idx>`, templates modernos):
  // sem xfrm próprio, a geometria vem do placeholder do layout/master
  const nvPr = nvPicPr ? firstChild(nvPicPr, 'p:nvPr') : undefined;
  const ph = nvPr ? firstChild(nvPr, 'p:ph') : undefined;
  if (ph) {
    shape.phType = ph.attrs['type'] ?? 'body';
    if (ph.attrs['idx']) shape.phIdx = ph.attrs['idx'];
  }
  const media = nvPicPr ? readPicMedia(nvPicPr, pkg, rels) : undefined;
  if (media) shape.media = media;
  if (blip) {
    const img = resolveBlip(blip, pkg, rels, theme);
    if (img) shape.image = img;
    // <a:alphaModFix amt="55000"/> -> 55% opaco
    const am = firstChild(blip, 'a:alphaModFix');
    if (am?.attrs['amt']) shape.alpha = Math.max(0, Math.min(1, parseInt(am.attrs['amt'], 10) / 100000));
  }
  if (srcRect) {
    // valores em milesimos de %; ausencia = 0. Normalizamos para 0..1.
    const num = (a: string | undefined): number => (a ? parseInt(a, 10) : 0) / 100000;
    shape.srcRect = {
      l: num(srcRect.attrs['l']),
      t: num(srcRect.attrs['t']),
      r: num(srcRect.attrs['r']),
      b: num(srcRect.attrs['b']),
    };
  }
  if (spPr) {
    const xfrm = firstChild(spPr, 'a:xfrm');
    if (xfrm) shape.xfrm = parseXfrm(xfrm);
    const geom = firstChild(spPr, 'a:prstGeom');
    if (geom?.attrs['prst']) shape.geom = geom.attrs['prst'];
    // preenchimento ATRÁS da imagem (prévias OLE/WMF transparentes com fundo branco)
    const sf = firstChild(spPr, 'a:solidFill');
    const sc = sf ? solidFillColor(spPr, theme) : undefined;
    if (sc) {
      shape.fill = { type: 'solid', color: sc };
      const a = fillAlphaEl(sf!)?.attrs['val'];
      if (a) shape.fillAlpha = parseInt(a, 10) / 100000;
    } else {
      const gf = firstChild(spPr, 'a:gradFill');
      const g = gf ? parseGradFill(gf, theme) : undefined;
      if (g) shape.fill = g;
    }
    const ln = firstChild(spPr, 'a:ln');
    if (ln) {
      const lc = solidFillColor(ln, theme);
      if (lc) shape.lineColor = lc;
      if (ln.attrs['w']) shape.lineWidth = parseInt(ln.attrs['w'], 10);
    }
  }
  readEffects(spPr, firstChild(pic, 'p:style'), theme, shape);
  return shape;
}

/**
 * Chanfro 3D: `<a:sp3d><a:bevelT>` + `<a:scene3d><a:lightRig>` do spPr ou, sem
 * cena/sp3d próprios, do effectStyle do tema apontado pelo effectRef (temas 2007
 * põem um chanfro circular com luz threePt no 3º estilo).
 */
function readBevel(spPr: XmlElement | undefined, styleEl: XmlElement | undefined, theme: Theme, shape: Shape): void {
  let sp3d = spPr ? firstChild(spPr, 'a:sp3d') : undefined;
  let scene = spPr ? firstChild(spPr, 'a:scene3d') : undefined;
  if (!sp3d && !scene && styleEl) {
    const ref = firstChild(styleEl, 'a:effectRef');
    const idx = ref ? parseInt(ref.attrs['idx'] ?? '0', 10) : 0;
    const st = idx > 0 ? theme.effectStyles?.[idx - 1] : undefined;
    if (st) { sp3d = firstChild(st, 'a:sp3d'); scene = firstChild(st, 'a:scene3d'); }
  }
  const bt = sp3d ? firstChild(sp3d, 'a:bevelT') : undefined;
  if (!bt) return;
  const w = bt.attrs['w'] !== undefined ? parseInt(bt.attrs['w'], 10) : 76200, h = bt.attrs['h'] !== undefined ? parseInt(bt.attrs['h'], 10) : 76200;
  if (!(w > 0) || !(h > 0)) return;
  const rig = scene ? firstChild(scene, 'a:lightRig') : undefined;
  shape.bevel = {
    w, h,
    ...(bt.attrs['prst'] ? { prst: bt.attrs['prst'] } : {}),
    ...(rig?.attrs['rig'] ? { rig: rig.attrs['rig'] } : {}),
    ...(rig?.attrs['dir'] ? { dir: rig.attrs['dir'] } : {}),
    ...(sp3d?.attrs['prstMaterial'] ? { mat: sp3d.attrs['prstMaterial'] } : {}),
  };
}

/**
 * Efeitos DrawingML de uma forma/imagem: `<a:effectLst>` do spPr (vazio = sem
 * efeitos) ou o `<a:effectStyle>` do tema apontado pelo effectRef do
 * `<p:style>` (cor phClr = a da referência). Temas 2007 põem sombra (e 3D) aí.
 */
function readEffects(spPr: XmlElement | undefined, styleEl: XmlElement | undefined, theme: Theme, shape: Shape): void {
  let eff = spPr ? firstChild(spPr, 'a:effectLst') : undefined;
  let th = theme;
  if (!eff && !(spPr && firstChild(spPr, 'a:effectDag')) && styleEl) {
    const ref = firstChild(styleEl, 'a:effectRef');
    const idx = ref ? parseInt(ref.attrs['idx'] ?? '0', 10) : 0;
    const st = idx > 0 ? theme.effectStyles?.[idx - 1] : undefined;
    eff = st ? firstChild(st, 'a:effectLst') : undefined;
    const ph = ref ? colorFromDml(childElements(ref)[0], theme) : undefined;
    if (ph) th = { ...theme, colors: { ...theme.colors, phClr: ph } };
  }
  if (!eff) return;
  const num = (e: XmlElement, k: string, d = 0) => (e.attrs[k] !== undefined ? parseInt(e.attrs[k]!, 10) : d);
  const colorOf = (e: XmlElement, defAlpha = 1): { color: string; alpha: number } => {
    const c = childElements(e)[0];
    const a = c ? lastChild(c, 'a:alpha')?.attrs['val'] : undefined;
    return { color: (c ? colorFromDml(c, th) : undefined) ?? '#000000', alpha: a !== undefined ? parseInt(a, 10) / 100000 : defAlpha };
  };
  // sombra predefinida (prstShdw) ≈ externa sem desfoque
  const shd = firstChild(eff, 'a:outerShdw') ?? firstChild(eff, 'a:prstShdw');
  if (shd) {
    const { color, alpha } = colorOf(shd);
    shape.shadow = { color, alpha, blurRad: num(shd, 'blurRad'), dist: num(shd, 'dist'), dirDeg: num(shd, 'dir', 5400000) / 60000 };
    // sombra ESCALADA (sx/sy) ancorada (algn): ex. 93% no topo = só a base aparece
    const ssx = num(shd, 'sx', 100000) / 100000, ssy = num(shd, 'sy', 100000) / 100000;
    if (ssx !== 1 || ssy !== 1) { shape.shadow.sx = ssx; shape.shadow.sy = ssy; shape.shadow.algn = shd.attrs['algn'] ?? 'b'; }
  }
  const inner = firstChild(eff, 'a:innerShdw');
  if (inner) {
    const { color, alpha } = colorOf(inner);
    shape.innerShadow = { color, alpha, blurRad: num(inner, 'blurRad'), dist: num(inner, 'dist'), dirDeg: num(inner, 'dir') / 60000 };
  }
  const glow = firstChild(eff, 'a:glow');
  if (glow) {
    const { color, alpha } = colorOf(glow);
    if (num(glow, 'rad') > 0) shape.glow = { rad: num(glow, 'rad'), color, alpha };
  }
  const soft = firstChild(eff, 'a:softEdge');
  if (soft && num(soft, 'rad') > 0) shape.softEdge = num(soft, 'rad');
  // sobreposição de preenchimento (temas 2007: textura × degradê em multiplicação)
  const ov = firstChild(eff, 'a:fillOverlay');
  if (ov) {
    const gf = firstChild(ov, 'a:gradFill');
    const g = gf ? parseGradFill(gf, th) : undefined;
    const sc = g ? undefined : solidFillColor(ov, th);
    const fill: Fill | undefined = g ?? (sc ? { type: 'solid', color: sc } : undefined);
    if (fill) shape.fillOverlay = { blend: ov.attrs['blend'] ?? 'over', fill };
  }
  const refl = firstChild(eff, 'a:reflection');
  if (refl) {
    shape.reflection = {
      blurRad: num(refl, 'blurRad'), stA: num(refl, 'stA', 100000) / 100000, endA: num(refl, 'endA', 0) / 100000,
      stPos: num(refl, 'stPos', 0) / 100000, endPos: num(refl, 'endPos', 100000) / 100000, dist: num(refl, 'dist'),
      dirDeg: num(refl, 'dir', 5400000) / 60000, sy: num(refl, 'sy', 100000) / 100000, fadeDirDeg: num(refl, 'fadeDir', 5400000) / 60000,
    };
  }
}

/**
 * Mídia de um `<p:pic>`: `<p:nvPr>` traz `<a:videoFile r:link>` /
 * `<a:audioFile r:link>` (+ `<a:quickTimeFile>`) e, no 2010+, a parte
 * EMBUTIDA em `<p:extLst><p:ext><p14:media r:embed>` — que tem prioridade.
 */
function readPicMedia(nvPicPr: XmlElement, pkg: PptxPackage, rels: Map<string, string>): MediaRef | undefined {
  const nvPr = firstChild(nvPicPr, 'p:nvPr');
  if (!nvPr) return undefined;
  let kind: MediaRef['kind'] | undefined;
  let link: string | undefined;
  for (const c of childElements(nvPr)) {
    if (c.name === 'a:videoFile' || c.name === 'a:quickTimeFile') { kind = 'video'; link = c.attrs['r:link']; }
    else if (c.name === 'a:audioFile' || c.name === 'a:wavAudioFile') { kind = 'audio'; link = c.attrs['r:link'] ?? c.attrs['r:embed']; }
  }
  if (!kind) return undefined;
  const ext = firstChild(nvPr, 'p:extLst');
  let embed: string | undefined;
  let p14: XmlElement | undefined;
  if (ext) for (const e of childElements(ext, 'p:ext')) {
    const m = childElements(e).find((x) => x.name.endsWith(':media'));
    if (m) p14 = m;
    if (m?.attrs['r:embed']) embed = m.attrs['r:embed'];
  }
  const media: MediaRef = { kind, mime: 'application/octet-stream' };
  if (p14) {
    // corte, esmaecer e marcadores (PowerPoint 2010+)
    const ms = (v: string | undefined): number => (v ? parseFloat(v) || 0 : 0);
    for (const c of childElements(p14)) {
      const tag = c.name.slice(c.name.indexOf(':') + 1);
      if (tag === 'trim') media.trim = { startMs: ms(c.attrs['st']), endMs: ms(c.attrs['end']) };
      else if (tag === 'fade') media.fade = { inMs: ms(c.attrs['in']), outMs: ms(c.attrs['out']) };
      else if (tag === 'bmkLst') {
        media.bookmarks = childElements(c).filter((b) => b.name.endsWith(':bmk'))
          .map((b) => ({ name: b.attrs['name'] ?? '', timeMs: ms(b.attrs['time']) }));
      }
    }
  }
  for (const rid of [embed, link]) {
    const target = rid ? rels.get(rid) : undefined;
    if (!target) continue;
    if (pkg.getPart(target)) { media.part = target; break; }
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) && !media.url) media.url = target; // link externo (file:, http:)
  }
  if (!media.part && !media.url) return undefined;
  media.mime = mediaMime(media.part ?? media.url!, kind);
  return media;
}

function mediaMime(path: string, kind: MediaRef['kind']): string {
  const ext = (/\.([a-z0-9]+)(?:[?#].*)?$/i.exec(path)?.[1] ?? '').toLowerCase();
  switch (ext) {
    case 'mp4': case 'm4v': return 'video/mp4';
    case 'mov': return 'video/quicktime';
    case 'webm': return kind === 'audio' ? 'audio/webm' : 'video/webm';
    case 'ogv': return 'video/ogg';
    case 'wmv': return 'video/x-ms-wmv';
    case 'avi': return 'video/x-msvideo';
    case 'mp3': return 'audio/mpeg';
    case 'm4a': return 'audio/mp4';
    case 'wav': return 'audio/wav';
    case 'wma': return 'audio/x-ms-wma';
    case 'ogg': case 'oga': return 'audio/ogg';
    case 'mid': case 'midi': return 'audio/midi';
    default: return kind === 'audio' ? 'audio/*' : 'video/*';
  }
}

/** `<a:blip r:embed="rIdN">` -> ImageRef com bytes + MIME (ou undefined se nao resolver). */
/** Efeitos de cor do `<a:blip>` (duotone, alphaModFix, grayscl, clrChange, lum, biLevel). */
function readImageFx(blip: XmlElement, theme: Theme): ImageFx | undefined {
  const fx: ImageFx = {};
  for (const e of childElements(blip)) {
    switch (e.name) {
      case 'a:duotone': {
        const cs = childElements(e).map((c) => colorFromDml(c, theme)).filter((c): c is string => !!c);
        if (cs.length === 2) fx.duotone = [cs[0]!, cs[1]!];
        break;
      }
      case 'a:alphaModFix': fx.alpha = parseInt(e.attrs['amt'] ?? '100000', 10) / 100000; break;
      case 'a:grayscl': fx.gray = true; break;
      case 'a:biLevel': fx.biLevel = parseInt(e.attrs['thresh'] ?? '50000', 10) / 100000; break;
      case 'a:lum': {
        const b = parseInt(e.attrs['bright'] ?? '0', 10) / 100000, c = parseInt(e.attrs['contrast'] ?? '0', 10) / 100000;
        if (b) fx.bright = b;
        if (c) fx.contrast = c;
        break;
      }
      case 'a:clrChange': {
        const from = firstChild(e, 'a:clrFrom'), to = firstChild(e, 'a:clrTo');
        const fc = from ? colorFromDml(childElements(from)[0], theme) : undefined;
        const toEl = to ? childElements(to)[0] : undefined;
        const tc = colorFromDml(toEl, theme);
        if (fc && tc) {
          const a = toEl ? lastChild(toEl, 'a:alpha')?.attrs['val'] : undefined;
          fx.clrChange = { from: fc, to: tc, toAlpha: a !== undefined ? parseInt(a, 10) / 100000 : 1 };
        }
        break;
      }
    }
  }
  return Object.keys(fx).length ? fx : undefined;
}

function resolveBlip(blip: XmlElement, pkg: PptxPackage, rels: Map<string, string>, theme?: Theme): ImageRef | undefined {
  // ícone SVG (2016+): `<a:blip r:embed=PNG><a:extLst><a:ext><asvg:svgBlip r:embed=SVG/>` —
  // usa o PNG quando existe; o app às vezes grava SÓ o SVG (inserido por automação)
  let rid = blip.attrs['r:embed'] ?? blip.attrs['embed'];
  if (!rid) {
    const ext = firstChild(blip, 'a:extLst');
    if (ext) for (const e of childElements(ext, 'a:ext')) {
      const svg = childElements(e).find((x) => x.name.endsWith(':svgBlip'));
      if (svg?.attrs['r:embed']) rid = svg.attrs['r:embed'];
    }
  }
  if (!rid) return undefined;
  const part = rels.get(rid);
  if (!part) return undefined;
  const bytes = pkg.getPart(part);
  if (!bytes) return undefined;
  const ref: ImageRef = { part, bytes, mime: mimeFromPart(part) };
  const fx = theme ? readImageFx(blip, theme) : undefined;
  if (fx) ref.fx = fx;
  return ref;
}

/** `<a:tile sx sy tx ty>` de um `<a:blipFill>` → escala/deslocamento do ladrilho na ImageRef. */
function applyTile(ref: ImageRef, blipFill: XmlElement | undefined): boolean {
  const tile = blipFill ? firstChild(blipFill, 'a:tile') : undefined;
  const fr = blipFill ? firstChild(firstChild(blipFill, 'a:stretch') ?? { name: '', attrs: {}, children: [] }, 'a:fillRect') : undefined;
  if (fr && ['l', 't', 'r', 'b'].some((k) => fr.attrs[k] && fr.attrs[k] !== '0')) {
    const v = (k: string): number => (fr.attrs[k] ? parseInt(fr.attrs[k]!, 10) / 100000 : 0);
    ref.fillRect = { l: v('l'), t: v('t'), r: v('r'), b: v('b') };
  }
  // sem <a:stretch> nem <a:tile>: o PowerPoint LADRILHA no tamanho natural (tdf#128596, medido)
  if (!tile && blipFill && !firstChild(blipFill, 'a:stretch')) { ref.tile = { sx: 1, sy: 1, tx: 0, ty: 0 }; return true; }
  if (!tile) return false;
  const n = (k: string, d: number): number => (tile.attrs[k] !== undefined ? parseInt(tile.attrs[k]!, 10) : d);
  ref.tile = { sx: n('sx', 100000) / 100000, sy: n('sy', 100000) / 100000, tx: n('tx', 0), ty: n('ty', 0) };
  const algn = tile.attrs['algn'], flip = tile.attrs['flip'];
  if (algn && algn !== 'tl') ref.tile.algn = algn;
  if (flip === 'x' || flip === 'y' || flip === 'xy') ref.tile.flip = flip;
  return true;
}

function mimeFromPart(part: string): string {
  const dot = part.lastIndexOf('.');
  const ext = (dot >= 0 ? part.slice(dot + 1) : '').toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'webp': return 'image/webp';
    case 'bmp': return 'image/bmp';
    case 'emf': return 'image/x-emf';
    case 'wmf': return 'image/x-wmf';
    case 'tif': case 'tiff': return 'image/tiff';
    default: return 'application/octet-stream';
  }
}

export { readTheme, colorFromDml };

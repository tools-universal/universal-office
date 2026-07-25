import { parseXml, childElements, firstChild, textContent, descend, type XmlElement } from './xml.js';
import type { PathSeg } from './geometry.js';
import { readTheme, colorFromDml, solidFillColor } from './theme.js';
import { readTblPr, readTableStyle, applyTableStyle } from './table-style.js';
import {
  parseTxStyleLevels, applyShapeTextCascade, applyTextStyles, mergeStyleLevels,
  type TextStyleContext, type TextStyleLevel, type TextStyleLevels,
} from './text-style.js';
import type { PptxPackage } from './package.js';
import type {
  Presentation, SlideRef, Slide, Shape, Xfrm, ImageRef, TextBody, Paragraph, Run, Theme,
  SlideAnimEntry, SlideTransition, Table, TableRow, TableCell, GradientStop,
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
  return pres;
}

/** Resolve o tema referenciado por uma parte (slide/layout/master via rels). */
function themeFor(pkg: PptxPackage, part: string): Theme {
  // master -> theme. Slides nao referenciam tema direto; sobem ate o master.
  const masterPath = findRelTarget(pkg, part, 'slideMaster') ?? findRelTarget(pkg, findRelTarget(pkg, part, 'slideLayout') ?? '', 'slideMaster');
  const themePath = masterPath ? findRelTarget(pkg, masterPath, 'theme') : findRelTarget(pkg, 'ppt/presentation.xml', 'theme');
  return readTheme(pkg, themePath ?? 'ppt/theme/theme1.xml');
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

  // herda xfrm de placeholders sem geometria propria
  const phMap = placeholderXfrmMap(pkg, slidePath, theme);
  for (const sh of shapes) {
    if (!sh.xfrm && sh.phType !== undefined) {
      const x = phMap.get(phKey(sh.phType, sh.phIdx)) ?? phMap.get(phKey(sh.phType)) ?? phMap.get('idx:' + (sh.phIdx ?? ''));
      if (x) sh.xfrm = x;
    }
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
    applyShapeTextCascade(sh, styleCtx, theme, keys);
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
  // fundo do slide (se sobrescrito): cor solida OU imagem (blipFill).
  const bgEl = cSld ? firstChild(cSld, 'p:bg') : undefined;
  if (bgEl) {
    const bgPr = firstChild(bgEl, 'p:bgPr');
    if (bgPr) {
      const c = solidFillColor(bgPr, theme);
      if (c) slide.bg = { type: 'solid', color: c };
      // fundo com gradiente (<a:gradFill> direto no bgPr)
      if (!slide.bg) {
        const grad = firstChild(bgPr, 'a:gradFill');
        if (grad) {
          const g = parseGradFill(grad, theme);
          if (g) slide.bg = g;
        }
      }
      const blip = descend(bgPr, 'a:blip');
      if (blip) {
        const img = resolveBlip(blip, pkg, slideRels);
        if (img) slide.bgImage = img;
      }
    }
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
  return slide;
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
      if (sh.phIdx !== undefined) map.set('idx:' + sh.phIdx, sh.xfrm);
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
      if (tx) {
        ctx.titleStyle = parseTxStyleLevels(firstChild(tx, 'p:titleStyle'), theme);
        ctx.bodyStyle = parseTxStyleLevels(firstChild(tx, 'p:bodyStyle'), theme);
        ctx.otherStyle = parseTxStyleLevels(firstChild(tx, 'p:otherStyle'), theme);
      }
      collectPhStyles(root, theme, pkg, ctx.masterPh);
    }
  }
  if (layoutPath) {
    const xml = pkg.getPartText(layoutPath);
    if (xml !== undefined) collectPhStyles(parseXml(xml), theme, pkg, ctx.layoutPh);
  }
  return ctx;
}

/** Coleta os lstStyle (ja parseados em readTxBody) dos placeholders de uma parte. */
function collectPhStyles(root: XmlElement, theme: Theme, pkg: PptxPackage, map: Map<string, TextStyleLevels>): void {
  const tree = descend(root, 'p:spTree');
  if (!tree) return;
  for (const sh of readShapes(tree, theme, pkg, new Map())) {
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
      if (gf) out.push(gf);
    } else if (c.name === 'p:grpSp') {
      out.push(...readGroup(c, theme, pkg, rels));
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
function readGroup(grp: XmlElement, theme: Theme, pkg: PptxPackage, rels: Map<string, string>): Shape[] {
  const children = readShapes(grp, theme, pkg, rels);
  const grpSpPr = firstChild(grp, 'p:grpSpPr');
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
    // escala tambem a espessura de linha (media geometrica dos eixos)
    if (sh.lineWidth !== undefined && sx > 0 && sy > 0) {
      sh.lineWidth = Math.round(sh.lineWidth * Math.sqrt(sx * sy));
    }
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
function readGraphicFrame(gf: XmlElement, pkg: PptxPackage, rels: Map<string, string>, theme: Theme): Shape | null {
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
          // paleta default das séries = accents do tema, em ordem
          const pal: string[] = [];
          for (let i = 1; i <= 6; i++) {
            const c = theme.colors[`accent${i}`];
            if (c) pal.push(c);
          }
          if (pal.length) shape.chartPalette = pal;
        }
      }
    }
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
        const fill = solidFillColor(tcPr, theme);
        if (fill) cell.fill = fill;
        // bordas — pega a primeira definida; v1 usa cor/width uniforme
        let bw = 0; let bc: string | undefined;
        for (const side of ['a:lnL', 'a:lnR', 'a:lnT', 'a:lnB'] as const) {
          const ln = firstChild(tcPr, side);
          if (!ln) continue;
          const w = ln.attrs['w'] ? parseInt(ln.attrs['w'], 10) : 0;
          if (w > bw) bw = w;
          if (!bc) {
            const fillEl = firstChild(ln, 'a:solidFill');
            const srgb = fillEl ? firstChild(fillEl, 'a:srgbClr') : undefined;
            if (srgb?.attrs['val']) bc = '#' + srgb.attrs['val'];
          }
        }
        if (bw) cell.borderWidth = bw;
        if (bc) cell.borderColor = bc;
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
    // geometria custom (freeform): <a:custGeom><a:pathLst><a:path w h>…
    const cust = firstChild(spPr, 'a:custGeom');
    if (cust) {
      const cg = parseCustGeom(cust);
      if (cg) shape.custGeom = cg;
    }
    if (firstChild(spPr, 'a:noFill')) shape.fill = { type: 'none' };
    else { const c = solidFillColor(spPr, theme); if (c) shape.fill = { type: 'solid', color: c }; }
    // gradiente linear (spec 03 G): <a:gradFill><a:gsLst>… + <a:lin ang>
    if (!shape.fill) {
      const grad = firstChild(spPr, 'a:gradFill');
      if (grad) {
        const g = parseGradFill(grad, theme);
        if (g) shape.fill = g;
      }
    }
    // blipFill de shape (stretch): imagem como preenchimento da geometria
    if (pkg && rels) {
      const bf = firstChild(spPr, 'a:blipFill');
      const blip = bf ? firstChild(bf, 'a:blip') : undefined;
      if (blip) {
        const img = resolveBlip(blip, pkg, rels);
        if (img) shape.fillImage = img;
      }
    }
    // alpha do fill: <a:solidFill><a:srgbClr><a:alpha val=60000/></a:srgbClr></a:solidFill>
    const sf = firstChild(spPr, 'a:solidFill');
    if (sf) {
      const alphaEl = descend(sf, 'a:alpha');
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
    }
    // sombra externa (effectLst > outerShdw): cards do slide 2 dependem disso
    const eff = firstChild(spPr, 'a:effectLst');
    const shd = eff ? firstChild(eff, 'a:outerShdw') : undefined;
    if (shd) {
      const blurRad = shd.attrs['blurRad'] ? parseInt(shd.attrs['blurRad'], 10) : 0;
      const dist = shd.attrs['dist'] ? parseInt(shd.attrs['dist'], 10) : 0;
      const dirDeg = (shd.attrs['dir'] ? parseInt(shd.attrs['dir'], 10) : 5400000) / 60000;
      // cor + alpha vem do filho a:srgbClr ou a:schemeClr (com a:alpha)
      const srgb = firstChild(shd, 'a:srgbClr');
      const scheme = firstChild(shd, 'a:schemeClr');
      let color = '#000000', alpha = 1;
      const colorEl = srgb ?? scheme;
      if (colorEl) {
        if (srgb?.attrs['val']) color = '#' + srgb.attrs['val'];
        const aEl = firstChild(colorEl, 'a:alpha');
        if (aEl?.attrs['val']) alpha = parseInt(aEl.attrs['val'], 10) / 100000;
      }
      shape.shadow = { color, blurRad, dist, dirDeg, alpha };
    }
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
    if (!shape.fill && !shape.fillImage) {
      const fc = refColor('a:fillRef');
      if (fc) shape.fill = { type: 'solid', color: fc };
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
  if (txBody) shape.txBody = readTxBody(txBody, theme, rels);
  return shape;
}

/**
 * Parse de `<a:custGeom>` → paths escaláveis. Coordenadas ficam nas unidades
 * do próprio path (`<a:path w h>`); o renderer escala para o xfrm da shape.
 * Cobre moveTo/lnTo/cubicBezTo/quadBezTo/close (freeforms do app de referência).
 */
function parseCustGeom(cust: XmlElement): { w: number; h: number; subs: PathSeg[][] } | undefined {
  const pathLst = firstChild(cust, 'a:pathLst');
  if (!pathLst) return undefined;
  const subs: PathSeg[][] = [];
  let pw = 0, ph = 0;
  const pt = (el: XmlElement | undefined): { x: number; y: number } => ({
    x: el?.attrs['x'] !== undefined ? parseInt(el.attrs['x'], 10) : 0,
    y: el?.attrs['y'] !== undefined ? parseInt(el.attrs['y'], 10) : 0,
  });
  for (const path of childElements(pathLst, 'a:path')) {
    if (path.attrs['w']) pw = Math.max(pw, parseInt(path.attrs['w'], 10));
    if (path.attrs['h']) ph = Math.max(ph, parseInt(path.attrs['h'], 10));
    const segs: PathSeg[] = [];
    for (const el of childElements(path)) {
      const pts = childElements(el, 'a:pt');
      if (el.name === 'a:moveTo') { const p = pt(pts[0]); segs.push({ c: 'M', x: p.x, y: p.y }); }
      else if (el.name === 'a:lnTo') { const p = pt(pts[0]); segs.push({ c: 'L', x: p.x, y: p.y }); }
      else if (el.name === 'a:cubicBezTo') {
        const p1 = pt(pts[0]), p2 = pt(pts[1]), p3 = pt(pts[2]);
        segs.push({ c: 'C', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, x: p3.x, y: p3.y });
      } else if (el.name === 'a:quadBezTo') {
        const p1 = pt(pts[0]), p2 = pt(pts[1]);
        segs.push({ c: 'Q', x1: p1.x, y1: p1.y, x: p2.x, y: p2.y });
      } else if (el.name === 'a:close') segs.push({ c: 'Z' });
    }
    if (segs.length) subs.push(segs);
  }
  if (!subs.length) return undefined;
  return { w: pw || 1, h: ph || 1, subs };
}

/** Parse de `<a:gradFill>` -> Fill gradient (2+ stops; `<a:lin ang>` em graus). */
function parseGradFill(grad: XmlElement, theme: Theme): { type: 'gradient'; stops: GradientStop[]; angleDeg: number } | undefined {
  const gsLst = firstChild(grad, 'a:gsLst');
  if (!gsLst) return undefined;
  const stops: GradientStop[] = [];
  for (const gs of childElements(gsLst, 'a:gs')) {
    const pos = gs.attrs['pos'] !== undefined ? parseInt(gs.attrs['pos'], 10) / 100000 : 0;
    const color = colorFromDml(childElements(gs)[0], theme);
    if (color) stops.push({ pos: Math.max(0, Math.min(1, pos)), color });
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
  if (pathEl) out.path = pathEl.attrs['path'] ?? 'shape';
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

function readTxBody(el: XmlElement, theme: Theme, rels?: Map<string, string>): TextBody {
  const bodyPr = firstChild(el, 'a:bodyPr');
  const tb: TextBody = { paragraphs: [] };
  if (bodyPr) {
    if (bodyPr.attrs['anchor']) tb.anchor = bodyPr.attrs['anchor'];
    if (bodyPr.attrs['wrap']) tb.wrap = bodyPr.attrs['wrap'];
    // insets em EMU (defaults do app ficam a cargo do layout/render)
    if (bodyPr.attrs['lIns'] !== undefined) tb.insL = parseInt(bodyPr.attrs['lIns'], 10);
    if (bodyPr.attrs['tIns'] !== undefined) tb.insT = parseInt(bodyPr.attrs['tIns'], 10);
    if (bodyPr.attrs['rIns'] !== undefined) tb.insR = parseInt(bodyPr.attrs['rIns'], 10);
    if (bodyPr.attrs['bIns'] !== undefined) tb.insB = parseInt(bodyPr.attrs['bIns'], 10);
    // autofit: <a:normAutofit fontScale="62500" lnSpcReduction="20000"/>
    const na = firstChild(bodyPr, 'a:normAutofit');
    if (na) {
      if (na.attrs['fontScale'] !== undefined) tb.fontScale = parseInt(na.attrs['fontScale'], 10) / 100000;
      if (na.attrs['lnSpcReduction'] !== undefined) tb.lnSpcReduction = parseInt(na.attrs['lnSpcReduction'], 10) / 100000;
    }
  }
  // <a:lstStyle> do txBody — maior prioridade da cascata (spec 03 A)
  const lst = firstChild(el, 'a:lstStyle');
  if (lst && childElements(lst).length > 0) tb.lstStyle = parseTxStyleLevels(lst, theme);
  for (const p of childElements(el, 'a:p')) tb.paragraphs.push(readParagraph(p, theme, rels));
  return tb;
}

function readParagraph(p: XmlElement, theme: Theme, rels?: Map<string, string>): Paragraph {
  const para: Paragraph = { runs: [] };
  const pPr = firstChild(p, 'a:pPr');
  if (pPr) {
    if (pPr.attrs['algn']) para.align = pPr.attrs['algn'];
    if (pPr.attrs['lvl']) para.level = parseInt(pPr.attrs['lvl'], 10);
    if (pPr.attrs['marL'] !== undefined) para.marL = parseInt(pPr.attrs['marL'], 10);
    if (pPr.attrs['indent'] !== undefined) para.indent = parseInt(pPr.attrs['indent'], 10);
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
  }
  for (const child of childElements(p)) {
    if (child.name === 'a:r') para.runs.push(readRun(child, theme, rels));
    else if (child.name === 'a:br') para.runs.push({ text: '\n' });
    else if (child.name === 'a:fld') { const t = firstChild(child, 'a:t'); para.runs.push({ text: t ? textContent(t) : '' }); }
  }
  return para;
}

function readRun(r: XmlElement, theme: Theme, rels?: Map<string, string>): Run {
  const t = firstChild(r, 'a:t');
  const run: Run = { text: t ? textContent(t) : '' };
  const rPr = firstChild(r, 'a:rPr');
  if (rPr) {
    if (rPr.attrs['sz']) run.sz = parseInt(rPr.attrs['sz'], 10) / 100;
    // b/i explicitos (inclusive "0", que BLOQUEIA heranca da cascata)
    if (rPr.attrs['b'] !== undefined) run.bold = rPr.attrs['b'] === '1';
    if (rPr.attrs['i'] !== undefined) run.italic = rPr.attrs['i'] === '1';
    if (rPr.attrs['u'] && rPr.attrs['u'] !== 'none') run.underline = true;
    const c = solidFillColor(rPr, theme);
    if (c) run.color = c;
    const latin = firstChild(rPr, 'a:latin');
    if (latin?.attrs['typeface']) run.font = latin.attrs['typeface'];
    // hyperlink: <a:hlinkClick r:id="rIdN"/> -> resolve via rels do slide
    const hlink = firstChild(rPr, 'a:hlinkClick');
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
  const blipFill = firstChild(pic, 'p:blipFill');
  const blip = blipFill ? firstChild(blipFill, 'a:blip') : undefined;
  const srcRect = blipFill ? firstChild(blipFill, 'a:srcRect') : undefined;
  const spPr = firstChild(pic, 'p:spPr');

  const shape: Shape = {
    id: cNvPr?.attrs['id'] ?? '',
    name: cNvPr?.attrs['name'] ?? '',
  };

  if (blip) {
    const img = resolveBlip(blip, pkg, rels);
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
    const ln = firstChild(spPr, 'a:ln');
    if (ln) {
      const lc = solidFillColor(ln, theme);
      if (lc) shape.lineColor = lc;
      if (ln.attrs['w']) shape.lineWidth = parseInt(ln.attrs['w'], 10);
    }
  }
  return shape;
}

/** `<a:blip r:embed="rIdN">` -> ImageRef com bytes + MIME (ou undefined se nao resolver). */
function resolveBlip(blip: XmlElement, pkg: PptxPackage, rels: Map<string, string>): ImageRef | undefined {
  const rid = blip.attrs['r:embed'] ?? blip.attrs['embed'];
  if (!rid) return undefined;
  const part = rels.get(rid);
  if (!part) return undefined;
  const bytes = pkg.getPart(part);
  if (!bytes) return undefined;
  return { part, bytes, mime: mimeFromPart(part) };
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
    default: return 'application/octet-stream';
  }
}

export { readTheme, colorFromDml };

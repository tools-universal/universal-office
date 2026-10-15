/**
 * Desenho da planilha (`xl/drawings/drawingN.xml`, `<xdr:wsDr>`): cada âncora
 * (`twoCellAnchor`, `oneCellAnchor`, `absoluteAnchor`) posiciona UM objeto na
 * grade. Gráficos (`graphicFrame` com `c:chart`) viram `DrawingChart` (motor
 * compartilhado de gráficos); o resto (imagens, formas, caixas de texto,
 * conectores, grupos, SmartArt) fica com o elemento DrawingML cru em
 * `DrawingObject` — o componente o lê com o leitor de formas do Slides. A ordem
 * do documento é a ordem de pintura (z-order), gráficos intercalados.
 */
import { parseXml, childElements, firstChild, textContent, type XmlElement } from './xml.js';
import type { DrawingAnchor, DrawingChart, DrawingObject } from './model.js';
import type { XlsxPackage } from './package.js';

/** Conteúdo de um desenho: gráficos e demais objetos, cada um com `order`. */
export interface DrawingContent {
  charts: DrawingChart[];
  objects: DrawingObject[];
}

/**
 * `mc:Choice` cujo conteúdo o Excel atual desenha e nós NÃO (segmentações
 * `sle15`, linhas do tempo `tsle`): o Fallback
 * é só o aviso "não disponível nesta versão", que o Excel nunca mostra — o
 * objeto fica de fora.
 */
const UNRENDERED_CHOICE = /^(sle15|tsle)$/;
/**
 * `mc:Choice` com extensões que o leitor DrawingML entende (o resto vai ao
 * Fallback); `cx` = gráficos do Office 2016 (chartex), desenhados pelo motor de gráficos.
 */
const KNOWN_CHOICE = /^(a14|a15|a16|x14|x15|cx\d*)$/;

/** Ramo efetivo de um `mc:AlternateContent` (undefined = nada a desenhar). */
function alternate(alt: XmlElement): XmlElement | undefined {
  for (const ch of childElements(alt, 'mc:Choice')) {
    const req = (ch.attrs['Requires'] ?? '').split(/\s+/).filter(Boolean);
    if (req.some((r) => UNRENDERED_CHOICE.test(r))) return undefined;
    if (req.every((r) => KNOWN_CHOICE.test(r))) return ch;
  }
  return firstChild(alt, 'mc:Fallback');
}

/** Filhos com `mc:AlternateContent` já resolvido (achatado no lugar). */
function resolvedChildren(el: XmlElement): XmlElement[] {
  const out: XmlElement[] = [];
  for (const c of childElements(el)) {
    if (c.name !== 'mc:AlternateContent') { out.push(c); continue; }
    const branch = alternate(c);
    if (branch) out.push(...resolvedChildren(branch));
  }
  return out;
}

/** Renomeia o prefixo do SpreadsheetDrawing para `xdr:` (o arquivo pode declarar outro, ou nenhum). */
function normalizePrefix(el: XmlElement, from: string): XmlElement {
  const rename = (name: string): string => {
    if (from === '') return name.includes(':') ? name : 'xdr:' + name;
    return name.startsWith(from + ':') ? 'xdr:' + name.slice(from.length + 1) : name;
  };
  return {
    name: rename(el.name),
    attrs: el.attrs,
    // só o esqueleto do xdr (âncoras e o objeto) muda; DrawingML (`a:`) fica igual
    children: el.children.map((c) => (typeof c === 'string' ? c : normalizePrefix(c, from))),
  };
}

const num = (el: XmlElement | undefined, name: string): number => {
  const c = el ? firstChild(el, name) : undefined;
  const v = c ? parseInt(textContent(c).trim(), 10) : 0;
  return Number.isFinite(v) ? v : 0;
};

function cellPos(el: XmlElement | undefined): DrawingAnchor['from'] {
  return { col: num(el, 'xdr:col'), row: num(el, 'xdr:row'), colOff: num(el, 'xdr:colOff'), rowOff: num(el, 'xdr:rowOff') };
}

const attrNum = (el: XmlElement | undefined, name: string): number => {
  const v = el ? parseInt(el.attrs[name] ?? '0', 10) : 0;
  return Number.isFinite(v) ? v : 0;
};

/** Âncora de um `xdr:*Anchor` (undefined = elemento que não é âncora). */
export function readAnchor(el: XmlElement): DrawingAnchor | undefined {
  if (el.name === 'xdr:twoCellAnchor') {
    const a: DrawingAnchor = { from: cellPos(firstChild(el, 'xdr:from')), to: cellPos(firstChild(el, 'xdr:to')) };
    if (el.attrs['editAs']) a.editAs = el.attrs['editAs'];
    return a;
  }
  if (el.name === 'xdr:oneCellAnchor') {
    const from = cellPos(firstChild(el, 'xdr:from'));
    const ext = firstChild(el, 'xdr:ext');
    return { kind: 'oneCell', from, to: { ...from }, ext: { cx: attrNum(ext, 'cx'), cy: attrNum(ext, 'cy') } };
  }
  if (el.name === 'xdr:absoluteAnchor') {
    const pos = firstChild(el, 'xdr:pos');
    const ext = firstChild(el, 'xdr:ext');
    const zero = { col: 0, row: 0, colOff: 0, rowOff: 0 };
    return { kind: 'absolute', from: { ...zero }, to: { ...zero }, pos: { x: attrNum(pos, 'x'), y: attrNum(pos, 'y') }, ext: { cx: attrNum(ext, 'cx'), cy: attrNum(ext, 'cy') } };
  }
  return undefined;
}

/** O objeto (ou um filho) carrega `a14:compatExt spid` = `spid` (forma que representa um controle/OLE). */
function hasSpid(e: XmlElement, spid: string): boolean {
  if (e.name.endsWith(':compatExt') && e.attrs['spid'] === spid) return true;
  return e.children.some((c) => typeof c !== 'string' && hasSpid(c, spid));
}

/**
 * Moldura do objeto OLE: preenchimento/contorno da forma que o representa; sem
 * eles, o padrão do Excel para objetos (VML `fillcolor="window"
 * strokecolor="windowText"`): branco com contorno preto de 0,75 pt.
 */
function oleFrame(host: DrawingObject | undefined): XmlElement[] {
  const spPr = host ? firstChild(host.el, 'xdr:spPr') : undefined;
  const own = spPr ? childElements(spPr).filter((c) => c.name === 'a:solidFill' || c.name === 'a:noFill' || c.name === 'a:ln') : [];
  if (own.length) return own;
  const rgb = (v: string): XmlElement => el('a:solidFill', {}, [el('a:srgbClr', { val: v })]);
  return [rgb('FFFFFF'), el('a:ln', { w: '9525' }, [rgb('000000')])];
}

const el = (name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement => ({ name, attrs, children });

/**
 * Objetos OLE da aba (`<oleObjects>`, Excel 2010+: `objectPr` com âncora e a
 * IMAGEM de prévia, em geral EMF): viram uma imagem (`xdr:pic` montado) na
 * âncora — é o que o Excel desenha. O z-order é o da forma oculta do desenho
 * que os representa (`a14:compatExt spid="_x0000_s<shapeId>"`). `part` = a
 * própria aba (a imagem resolve pelos rels dela).
 */
export function readOleObjects(sheetRoot: XmlElement, sheetPath: string, drawingObjects: readonly DrawingObject[]): DrawingObject[] {
  const list = resolvedChildren(sheetRoot).find((c) => c.name === 'oleObjects');
  if (!list) return [];
  const out: DrawingObject[] = [];
  for (const ole of resolvedChildren(list)) {
    if (ole.name !== 'oleObject') continue;
    const pr = firstChild(ole, 'objectPr');
    const rid = pr?.attrs['r:id'];
    const anchorEl = pr ? firstChild(pr, 'anchor') : undefined;
    if (!rid || !anchorEl) continue;
    const anchor: DrawingAnchor = { from: cellPos(firstChild(anchorEl, 'from')), to: cellPos(firstChild(anchorEl, 'to')) };
    const shapeId = ole.attrs['shapeId'] ?? '';
    const host = shapeId ? drawingObjects.find((o) => hasSpid(o.el, `_x0000_s${shapeId}`)) : undefined;
    const pic = el('xdr:pic', {}, [
      el('xdr:nvPicPr', {}, [el('xdr:cNvPr', { id: shapeId, name: ole.attrs['progId'] ?? 'OLE' }), el('xdr:cNvPicPr')]),
      el('xdr:blipFill', {}, [el('a:blip', { 'r:embed': rid }), el('a:stretch', {}, [el('a:fillRect')])]),
      el('xdr:spPr', {}, [el('a:prstGeom', { prst: 'rect' }), ...oleFrame(host)]),
    ]);
    out.push({ anchor, order: host ? host.order + 0.5 : 1e6 + out.length, el: pic, part: sheetPath });
  }
  return out;
}

/** Cópia da árvore sem o `hidden="1"` dos `cNvPr`. */
function unhide(e: XmlElement): XmlElement {
  const { hidden: _h, ...attrs } = e.attrs;
  return { name: e.name, attrs: e.name.endsWith(':cNvPr') ? attrs : e.attrs, children: e.children.map((c) => (typeof c === 'string' ? c : unhide(c))) };
}

/**
 * Controles de formulário da aba (`<controls>`, Excel 2010+: `controlPr` com
 * âncora; tipo/estado em `xl/ctrlProps/ctrlPropN.xml`). O desenho traz a
 * forma OCULTA que os representa (texto/fonte do rótulo): ela volta visível
 * com `control` marcado — o componente desenha o controle (caixa, botão…) e o
 * rótulo por cima. Z-order = o dessa forma.
 */
export function readControls(pkg: XlsxPackage, sheetRoot: XmlElement, sheetPath: string, drawingObjects: readonly DrawingObject[]): DrawingObject[] {
  const list = resolvedChildren(sheetRoot).find((c) => c.name === 'controls');
  if (!list) return [];
  const slash = sheetPath.lastIndexOf('/');
  const rels = new Map<string, string>();
  const relsXml = pkg.getPartText(`${sheetPath.slice(0, slash)}/_rels/${sheetPath.slice(slash + 1)}.rels`);
  try {
    if (relsXml !== undefined) for (const r of childElements(parseXml(relsXml), 'Relationship')) if (r.attrs['Id'] && r.attrs['Target']) rels.set(r.attrs['Id'], pkg.resolveRelTarget(sheetPath, r.attrs['Target']));
  } catch { /* sem rels: controles sem tipo */ }
  const out: DrawingObject[] = [];
  for (const c of resolvedChildren(list)) {
    if (c.name !== 'control') continue;
    const anchorEl = firstChild(firstChild(c, 'controlPr') ?? c, 'anchor');
    if (!anchorEl) continue;
    const anchor: DrawingAnchor = { from: cellPos(firstChild(anchorEl, 'from')), to: cellPos(firstChild(anchorEl, 'to')) };
    let props: XmlElement | undefined;
    const propsPath = rels.get(c.attrs['r:id'] ?? '');
    const propsXml = propsPath ? pkg.getPartText(propsPath) : undefined;
    try { if (propsXml !== undefined) props = parseXml(propsXml); } catch { /* ilegível */ }
    const type = props?.attrs['objectType'] ?? '';
    const shapeId = c.attrs['shapeId'] ?? '';
    const host = shapeId ? drawingObjects.find((o) => hasSpid(o.el, `_x0000_s${shapeId}`)) : undefined;
    const sp = host ? unhide(host.el) : el('xdr:sp', {}, [el('xdr:nvSpPr', {}, [el('xdr:cNvPr', { id: shapeId, name: c.attrs['name'] ?? '' }), el('xdr:cNvSpPr')]), el('xdr:spPr')]);
    out.push({
      anchor, order: host ? host.order + 0.5 : 1e6 + out.length, el: sp, part: host?.part ?? sheetPath,
      control: { type, ...(props?.attrs['checked'] ? { checked: props.attrs['checked'] } : {}) },
    });
  }
  return out;
}

const OBJECT = new Set(['xdr:sp', 'xdr:pic', 'xdr:cxnSp', 'xdr:grpSp', 'xdr:graphicFrame']);

/** Lê o desenho de uma aba (parte ausente/ilegível = vazio). */
export function readDrawing(pkg: XlsxPackage, drawingPath: string): DrawingContent {
  const out: DrawingContent = { charts: [], objects: [] };
  const xml = pkg.getPartText(drawingPath);
  if (xml === undefined) return out;
  let root: XmlElement;
  try { root = parseXml(xml); } catch { return out; }
  const m = /^(?:(\w+):)?wsDr$/.exec(root.name);
  if (!m) return out;
  if (m[1] !== 'xdr') root = normalizePrefix(root, m[1] ?? '');

  // rels do próprio desenho: rId → parte (gráficos aqui; imagens o leitor DrawingML resolve)
  const rels = new Map<string, string>();
  const slash = drawingPath.lastIndexOf('/');
  const relsXml = pkg.getPartText(`${drawingPath.slice(0, slash)}/_rels/${drawingPath.slice(slash + 1)}.rels`);
  if (relsXml !== undefined) {
    try {
      for (const rel of childElements(parseXml(relsXml), 'Relationship')) {
        const id = rel.attrs['Id'], target = rel.attrs['Target'];
        if (id && target && rel.attrs['TargetMode'] !== 'External') rels.set(id, pkg.resolveRelTarget(drawingPath, target));
      }
    } catch { /* rels ilegível: sem gráficos */ }
  }

  let order = 0;
  for (const anchorEl of resolvedChildren(root)) {
    const anchor = readAnchor(anchorEl);
    if (!anchor) continue;
    const obj = resolvedChildren(anchorEl).find((c) => OBJECT.has(c.name));
    if (!obj) continue;
    const idx = order++;
    if (obj.name === 'xdr:graphicFrame') {
      const data = firstChild(firstChild(obj, 'a:graphic') ?? obj, 'a:graphicData');
      const chartEl = data ? firstChild(data, 'c:chart') ?? firstChild(data, 'cx:chart') : undefined;
      if (chartEl) {
        const path = rels.get(chartEl.attrs['r:id'] ?? chartEl.attrs['id'] ?? '');
        const chartXml = path ? pkg.getPartText(path) : undefined;
        if (path && chartXml) {
          // nome (= ChartObject.Name do Excel) e parte (rels: desenho do gráfico); cx: = chartex
          const name = firstChild(firstChild(obj, 'xdr:nvGraphicFramePr') ?? obj, 'xdr:cNvPr')?.attrs['name'];
          out.charts.push({ anchor, chartXml, order: idx, part: path, ...(name ? { name } : {}), ...(chartEl.name === 'cx:chart' ? { kind: 'chartex' as const } : {}) });
        }
        continue;
      }
    }
    out.objects.push({ anchor, order: idx, el: obj, part: drawingPath });
  }
  return out;
}

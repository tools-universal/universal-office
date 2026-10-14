/**
 * SmartArt SEM o desenho pré-calculado (`ppt/diagrams/drawingN.xml`, que o
 * Office 2007 nem sempre grava): reconstrói o diagrama a partir do MODELO de
 * dados (`dgm:ptLst` + `dgm:cxnLst`) com um layout aproximado para os layouts
 * mais comuns do app — organograma, processo (simples e em curva), listas
 * (bloco básico, lista agrupada, blocos verticais), ciclo, chevron e matriz.
 * Layout fora dessa lista continua vazio: medido no corpus, um palpite
 * errado (setas radiais desenhadas como colunas, hexágonos em grade) fica
 * mais longe do PowerPoint do que o espaço em branco. Caixas no accent1 do
 * tema, texto claro, tamanho de fonte UNIFORME que cabe em todas (como o app).
 * Não é o motor de layout do app — proporções medidas nas imagens do oráculo.
 */
import { childElements, firstChild, parseXml, textContent, type XmlElement } from './xml.js';
import { colorFromDml } from './theme.js';
import type { Fill, Shape, Theme, Xfrm, Paragraph } from './model.js';

/** Estilo resolvido de um rótulo (`presStyleLbl`) pelas partes de cores/estilo rápido. */
export interface DgmStyle { fill?: Fill; fillAlpha?: number; line?: string; lineWidth?: number; text?: string }
type Styler = (lbl: string, idx: number, cnt: number, spPr?: XmlElement) => DgmStyle | undefined;

interface Pres { name: string; lbl: string; idx: number; cnt: number; sx: number; sy: number; spPr?: XmlElement }
interface Node { id: string; text: string[]; children: Node[]; pres: Pres[]; spPr?: XmlElement; hierBranch?: string }

function descendFirst(e: XmlElement, name: string): XmlElement | undefined {
  for (const c of childElements(e)) { if (c.name === name) return c; const d = descendFirst(c, name); if (d) return d; }
  return undefined;
}

/** `dgm:spPr` com conteúdo (formatação manual do ponto). */
const ownSpPr = (pt: XmlElement) => { const e = firstChild(pt, 'dgm:spPr'); return e && childElements(e).length ? e : undefined; };

/** Rótulo de estilo principal do nó (a caixa) e o dos filhos (texto descendente). */
const mainPres = (n: Node) => n.pres.find((p) => p.cnt > 0 && /^(node|asst)/.test(p.lbl)) ?? n.pres.find((p) => p.cnt > 0 && p.lbl && !/Trans|Acc|Follow/.test(p.lbl));
const subPres = (n: Node) => n.pres.find((p) => p.cnt > 0 && /Acc|Follow/.test(p.lbl));

/** Árvore de nós do data model (raiz = pt type="doc"). */
function buildTree(data: XmlElement): Node | undefined {
  const ptLst = firstChild(data, 'dgm:ptLst');
  const cxnLst = firstChild(data, 'dgm:cxnLst');
  if (!ptLst) return undefined;
  const nodes = new Map<string, Node>();
  let root: Node | undefined;
  for (const pt of childElements(ptLst, 'dgm:pt')) {
    const type = pt.attrs['type'] ?? 'node';
    if (type !== 'node' && type !== 'doc' && type !== 'asst') continue;
    const t = firstChild(pt, 'dgm:t');
    const text = t ? childElements(t, 'a:p').map((p) => childElements(p).filter((r) => r.name === 'a:r' || r.name === 'a:fld')
      .map((r) => { const tt = firstChild(r, 'a:t'); return tt ? textContent(tt) : ''; }).join('')).filter((s) => s.trim()) : [];
    const n: Node = { id: pt.attrs['modelId'] ?? '', text, children: [], pres: [], spPr: ownSpPr(pt) };
    nodes.set(n.id, n);
    if (type === 'doc') root = n;
  }
  for (const pt of childElements(ptLst, 'dgm:pt')) {
    if (pt.attrs['type'] !== 'pres') continue;
    const pr = firstChild(pt, 'dgm:prSet');
    const n = pr ? nodes.get(pr.attrs['presAssocID'] ?? '') : undefined;
    if (!pr || !n) continue;
    const hb = descendFirst(pr, 'dgm:hierBranch')?.attrs['val'];
    if (hb && !n.hierBranch) n.hierBranch = hb;
    const num = (k: string, d: number) => { const v = parseInt(pr.attrs[k] ?? '', 10); return Number.isFinite(v) ? v : d; };
    n.pres.push({
      name: pr.attrs['presName'] ?? '', lbl: pr.attrs['presStyleLbl'] ?? '', idx: num('presStyleIdx', 0), cnt: num('presStyleCnt', 0),
      sx: num('custScaleX', 100000) / 100000, sy: num('custScaleY', 100000) / 100000, spPr: ownSpPr(pt),
    });
  }
  if (!root) return undefined;
  const cx = cxnLst ? childElements(cxnLst, 'dgm:cxn').filter((c) => (c.attrs['type'] ?? 'parOf') === 'parOf') : [];
  cx.sort((a, b) => parseInt(a.attrs['srcOrd'] ?? '0', 10) - parseInt(b.attrs['srcOrd'] ?? '0', 10));
  for (const c of cx) {
    const p = nodes.get(c.attrs['srcId'] ?? ''), ch = nodes.get(c.attrs['destId'] ?? '');
    if (p && ch && ch !== root) p.children.push(ch);
  }
  return root;
}

type Family = 'block' | 'org' | 'bend' | 'process' | 'list1' | 'chevron' | 'circleList' | 'row' | 'column' | 'cycle' | 'grid';

/** Layouts cobertos (nome final do `uniqueId`); o resto devolve vazio. */
function familyOf(uniqueId: string): Family | undefined {
  const k = (uniqueId.split('/').pop() ?? '').replace(/#\d+$/, '');
  switch (k) {
    case 'orgChart1': return 'org';
    case 'process5': return 'bend';
    case 'process1': return 'process';
    case 'list1': return 'list1';
    case 'chevron1': return 'chevron';
    case 'vList3': return 'circleList';
    case 'hList1': case 'hierarchy4': return 'row';
    case 'vList5': case 'vProcess5': return 'column';
    case 'cycle2': return 'cycle';
    case 'default': return 'block';
    case 'matrix1': return 'grid';
    default: return undefined;
  }
}

const EMU_PT = 12700;

/** Tamanho (pt) que faz `lines` caberem na caixa (estimativa ~0,55 em por caractere). */
function fitPt(lines: string[], w: number, h: number, max = 65): number {
  if (!lines.length) return max;
  const wPt = w / EMU_PT * 0.92, hPt = h / EMU_PT * 0.95;
  for (let sz = max; sz >= 6; sz -= 1) {
    const perLine = Math.max(1, Math.floor(wPt / (sz * 0.5)));
    let rows = 0;
    let ok = true;
    for (const l of lines) {
      const words = l.split(/\s+/);
      if (words.some((wd) => wd.length > perLine)) { ok = false; break; }
      let cur = 0; rows++;
      for (const wd of words) { if (cur && cur + 1 + wd.length > perLine) { rows++; cur = wd.length; } else cur += (cur ? 1 : 0) + wd.length; }
    }
    if (ok && rows * sz * 1.08 <= hPt) return sz; // entrelinha 90%
  }
  return 6;
}

interface Box { x: number; y: number; w: number; h: number; lines: string[]; nd?: Node; geom?: string; acc?: boolean; sub?: Rect & { lines: string[] } }
interface Rect { x: number; y: number; w: number; h: number }
interface Glyph { geom: string; r: Rect; rot?: number }

/** Bounding box em unidades → frame (escala uniforme, centralizado). */
function fitUnits(items: Rect[], frame: Xfrm): (r: Rect) => Rect {
  const x0 = Math.min(...items.map((r) => r.x)), y0 = Math.min(...items.map((r) => r.y));
  const W = Math.max(...items.map((r) => r.x + r.w)) - x0, H = Math.max(...items.map((r) => r.y + r.h)) - y0;
  const s = Math.min(frame.cx / W, frame.cy / H);
  const ox = frame.x + (frame.cx - W * s) / 2, oy = frame.y + (frame.cy - H * s) / 2;
  return (r) => ({ x: ox + (r.x - x0) * s, y: oy + (r.y - y0) * s, w: r.w * s, h: r.h * s });
}

export function diagramFallbackShapes(data: XmlElement, layoutUniqueId: string, frame: Xfrm, theme: Theme, styler?: Styler): Shape[] {
  const fam = familyOf(layoutUniqueId);
  if (!fam) return [];
  const root = buildTree(data);
  if (!root || !root.children.length) return [];
  const scheme = (val: string, mod = ''): string =>
    colorFromDml(parseXml(`<a:schemeClr xmlns:a="a" val="${val}">${mod}</a:schemeClr>`), theme) ?? '#4472C4';
  const fill = scheme('accent1');
  const txt = scheme('lt1');
  const dark = scheme('tx1');
  const boxes: Box[] = [];
  const lines: [number, number, number, number][] = [];
  const glyphs: Glyph[] = [];
  const { x: fx, y: fy, cx: fw, cy: fh } = frame;
  const tops = root.children;
  const subOf = (n: Node): string[] => n.children.flatMap((c) => c.text);
  let boxLine: string | undefined = txt;
  let subStyle: { fill: string; alpha?: number; line?: string; geom: string } = { fill: scheme('accent1', '<a:alpha val="90000"/><a:tint val="40000"/>'), alpha: 0.9, geom: 'roundRect' };

  if (fam === 'org') {
    // organograma: caixa 1 × 0,5; irmãos a 0,15; níveis a 0,3. Abaixo do 2º nível,
    // filhos todos folhas "penduram" à direita (hierBranch init) quando a árvore
    // padrão ficaria larga demais.
    const W = 1, H = 0.5, HG = 0.15, VG = 0.3, HANG = 0.25;
    const isLeaf = (n: Node) => !n.children.length;
    const nw = (n: Node) => W * (mainPres(n)?.sx ?? 1); // custScaleX do nó
    // hierBranch do nó: r/l/hang = filhos pendurados; init = pendura folhas abaixo do 1º nível; std/ausente = padrão
    const hangs = (n: Node, depth: number) => n.children.length > 0 && (/^(r|l|hang)$/.test(n.hierBranch ?? '')
      || (n.hierBranch === 'init' && depth >= 2 && n.children.every(isLeaf)));
    const width = (n: Node, depth: number): number => {
      if (!n.children.length) return nw(n);
      if (hangs(n, depth)) return Math.max(nw(n), HANG + Math.max(...n.children.map(nw)));
      return Math.max(nw(n), n.children.reduce((a, c) => a + width(c, depth + 1), 0) + HG * (n.children.length - 1));
    };
    const place = (n: Node, depth: number, x0: number, y: number): Rect => {
      const span = width(n, depth);
      if (hangs(n, depth)) {
        const me = { x: x0, y, w: nw(n), h: H };
        boxes.push({ ...me, lines: n.text, nd: n });
        const lx = x0 + W * 0.06;
        let cy = y + H + VG;
        for (const c of n.children) {
          boxes.push({ x: x0 + HANG, y: cy, w: nw(c), h: H, lines: c.text, nd: c });
          lines.push([lx, cy + H / 2, x0 + HANG, cy + H / 2]);
          cy += H + VG;
        }
        lines.push([lx, y + H, lx, cy - VG - H / 2]);
        return me;
      }
      let cx0 = x0 + (span - (n.children.reduce((a, c) => a + width(c, depth + 1), 0) + HG * Math.max(0, n.children.length - 1))) / 2;
      const kids: Rect[] = [];
      for (const c of n.children) { kids.push(place(c, depth + 1, cx0, y + H + VG)); cx0 += width(c, depth + 1) + HG; }
      const mid = kids.length ? (kids[0]!.x + kids[0]!.w / 2 + kids[kids.length - 1]!.x + kids[kids.length - 1]!.w / 2) / 2 : x0 + span / 2;
      const me = { x: mid - nw(n) / 2, y, w: nw(n), h: H };
      boxes.push({ ...me, lines: n.text, nd: n });
      if (kids.length) {
        const by = y + H + VG / 2;
        lines.push([mid, y + H, mid, by]);
        const xs = kids.map((k) => k.x + k.w / 2);
        if (kids.length > 1) lines.push([Math.min(...xs), by, Math.max(...xs), by]);
        for (const k of kids) lines.push([k.x + k.w / 2, by, k.x + k.w / 2, k.y]);
      }
      return me;
    };
    let x0 = 0;
    for (const t of tops) { place(t, 1, x0, 0); x0 += width(t, 1) + HG; }
    const map = fitUnits(boxes, frame);
    for (const b of boxes) Object.assign(b, map(b), { geom: 'rect' });
    for (const l of lines) {
      const a = map({ x: l[0], y: l[1], w: 0, h: 0 }), b = map({ x: l[2], y: l[3], w: 0, h: 0 });
      l.splice(0, 4, a.x, a.y, b.x, b.y);
    }
  } else if (fam === 'bend' || fam === 'process') {
    // processo: nós 1 × 0,6 com setas entre eles; em curva, linhas em zigue-zague
    // com tantas colunas quanto deixem o nó maior
    const n = tops.length, W = 1, H = 0.6, HG = 0.43, VG = 0.45;
    let best = { cols: n, s: 0 };
    for (let cols = fam === 'bend' ? 1 : n; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const s = Math.min(fw / (cols * W + (cols - 1) * HG), fh / (rows * H + (rows - 1) * VG));
      if (s > best.s * 1.0001) best = { cols, s };
    }
    const { cols } = best;
    const cell: Rect[] = tops.map((_, i) => {
      const r = Math.floor(i / cols), c0 = i % cols, c = r % 2 ? cols - 1 - c0 : c0;
      return { x: c * (W + HG), y: r * (H + VG), w: W, h: H };
    });
    const AW = HG * 0.5, AH = H * 0.35;
    const arrows: Glyph[] = [];
    for (let i = 0; i + 1 < n; i++) {
      const a = cell[i]!, b = cell[i + 1]!;
      if (a.y === b.y) {
        const left = b.x < a.x;
        const gx = left ? b.x + W + (HG - AW) / 2 : a.x + W + (HG - AW) / 2;
        arrows.push({ geom: left ? 'leftArrow' : 'rightArrow', r: { x: gx, y: a.y + (H - AH) / 2, w: AW, h: AH } });
      } else {
        arrows.push({ geom: 'downArrow', r: { x: a.x + (W - AH) / 2, y: a.y + H + (VG - AW) / 2, w: AH, h: AW } });
      }
    }
    const map = fitUnits(cell, frame);
    tops.forEach((t, i) => boxes.push({ ...map(cell[i]!), lines: t.text, nd: t, geom: 'roundRect' }));
    for (const g of arrows) glyphs.push({ geom: g.geom, r: map(g.r) });
  } else if (fam === 'list1') {
    // lista agrupada: retângulo contornado com os filhos e um rótulo sobre a borda superior
    const n = tops.length, gap = fh * 0.05;
    const ih = (fh - gap * (n - 1)) / n, hh = Math.min(ih * 0.2, fh * 0.08);
    tops.forEach((t, i) => {
      const y = fy + i * (ih + gap);
      boxes.push({
        x: fx + fw * 0.04, y, w: fw * 0.9, h: hh, lines: t.text, nd: t, geom: 'roundRect',
        sub: { x: fx, y: y + hh / 2, w: fw, h: ih - hh / 2, lines: subOf(t) },
      });
    });
    subStyle = { fill: scheme('lt1'), line: fill, geom: 'rect' };
    boxLine = undefined;
  } else if (fam === 'block') {
    // bloco básico: retângulos 1 × 0,6, vãos 0,12; colunas que deixam o bloco maior; última linha centralizada
    const n = tops.length, W = 1, H = 0.6, G = 0.12;
    let best = { cols: n, s: 0 };
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const sc = Math.min(fw / (cols * W + (cols - 1) * G), fh / (rows * H + (rows - 1) * G));
      if (sc > best.s * 1.0001) best = { cols, s: sc };
    }
    const { cols } = best;
    const cells = tops.map((_, i) => {
      const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, n - r * cols);
      return { x: (cols - inRow) * (W + G) / 2 + c * (W + G), y: r * (H + G), w: W, h: H };
    });
    const map = fitUnits(cells, frame);
    tops.forEach((t, i) => boxes.push({ ...map(cells[i]!), lines: t.text, nd: t, geom: 'rect' }));
  } else if (fam === 'chevron') {
    // processo em chevrons: 1 × 0,4, passo 0,91 (encaixados); filhos abaixo
    const n = tops.length, W = 1, H = 0.4, STEP = 0.91;
    const hasSub = tops.some((t) => subOf(t).length);
    const cells = tops.map((_, i) => ({ x: i * STEP, y: 0, w: W, h: H }));
    const all = hasSub ? [...cells, { x: 0, y: 0, w: (n - 1) * STEP + W, h: H * 2.6 }] : cells;
    const map = fitUnits(all, frame);
    tops.forEach((t, i) => {
      const r = map(cells[i]!);
      boxes.push({ ...r, lines: t.text, nd: t, geom: 'chevron', sub: { x: r.x + r.w * 0.1, y: r.y + r.h * 1.1, w: r.w * 0.75, h: r.h * 1.5, lines: subOf(t) } });
    });
    subStyle = { fill: scheme('accent1', '<a:tint val="40000"/>'), alpha: 0.9, geom: 'rect' };
  } else if (fam === 'circleList') {
    // lista vertical com círculo: retângulo do nó (≈5,3 × 1) e um círculo de 0,85 à esquerda
    const n = tops.length, H = 1, GAP = 0.34, RW = 5.26, D = 0.85;
    const rects = tops.map((_, i) => ({ x: D - 0.1, y: i * (H + GAP), w: RW, h: H }));
    const circles = tops.map((_, i) => ({ x: 0, y: i * (H + GAP) + (H - D) / 2, w: D, h: D }));
    const map = fitUnits([...rects, ...circles], frame);
    tops.forEach((t, i) => {
      boxes.push({ ...map(circles[i]!), lines: [], geom: 'ellipse', acc: true, nd: t });
      boxes.push({ ...map(rects[i]!), lines: t.text, nd: t, geom: 'rect' });
    });
  } else if (fam === 'row') {
    const n = tops.length, gap = fw * 0.04;
    const bw = (fw - gap * (n - 1)) / n;
    const hasSub = tops.some((t) => subOf(t).length);
    const bh = hasSub ? fh * 0.35 : fh * 0.6;
    tops.forEach((t, i) => {
      const x = fx + i * (bw + gap);
      const y = hasSub ? fy : fy + (fh - bh) / 2;
      const sy = y + bh + fh * 0.02;
      boxes.push({ x, y, w: bw, h: bh, lines: t.text, nd: t, sub: { x, y: sy, w: bw, h: fy + fh - sy, lines: subOf(t) } });
    });
  } else if (fam === 'column') {
    const n = tops.length, gap = fh * 0.04;
    const bh = (fh - gap * (n - 1)) / n;
    const hasSub = tops.some((t) => subOf(t).length);
    const bw = hasSub ? fw * 0.36 : fw;
    tops.forEach((t, i) => {
      const y = fy + i * (bh + gap), sx = fx + bw;
      boxes.push({ x: fx, y, w: bw, h: bh, lines: t.text, nd: t, sub: { x: sx, y: y + bh * 0.05, w: fx + fw - sx, h: bh * 0.9, lines: subOf(t) } });
    });
  } else if (fam === 'cycle') {
    const n = Math.max(1, tops.length);
    const cx = fx + fw / 2, cy = fy + fh / 2;
    const r = Math.min(fw, fh) * 0.36;
    const bs = Math.min(fw, fh) * Math.min(0.3, 1.6 / (n + 1));
    tops.forEach((nd, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      boxes.push({ x: x - bs / 2, y: y - bs / 2, w: bs, h: bs, lines: nd.text, nd, geom: 'ellipse' });
    });
  } else {
    // bloco básico: grade de retângulos 1 × 0,6, linhas centralizadas
    const n = tops.length;
    const cols = Math.ceil(Math.sqrt((n * fw) / Math.max(1, fh) * 0.6)) || 1;
    const rows = Math.ceil(n / cols);
    const gx = fw * 0.03, gy = fh * 0.04;
    const bw = (fw - gx * (cols - 1)) / cols, bh = Math.min((fh - gy * (rows - 1)) / rows, bw * 0.65);
    tops.forEach((t, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const inRow = Math.min(cols, n - r * cols);
      const off = (fw - (inRow * bw + (inRow - 1) * gx)) / 2;
      boxes.push({ x: fx + off + c * (bw + gx), y: fy + (fh - (rows * bh + (rows - 1) * gy)) / 2 + r * (bh + gy), w: bw, h: bh, lines: t.text, nd: t });
    });
  }

  // tamanho UNIFORME (o app iguala o texto dos nós do mesmo nível)
  const ins = 45720;
  const sz = Math.min(...boxes.filter((b) => b.lines.length).map((b) => fitPt(b.lines, b.w - 2 * ins, b.h - 2 * ins)));
  const subs = boxes.filter((b) => b.sub?.lines.length);
  const subSz = subs.length ? Math.min(Math.round(sz * 0.8), ...subs.map((b) => fitPt(b.sub!.lines, b.sub!.w - 0.25 * 914400, b.sub!.h - 2 * ins))) : 0;
  // estilo por rótulo (cores + estilo rápido do diagrama); sem as partes, o default accent1_2
  const look = (lbl: string, idx: number, cnt: number, spPr?: XmlElement): DgmStyle | undefined => styler?.(lbl, idx, cnt, spPr);
  const out: Shape[] = [];
  let k = 0;
  const allPres = (pred: (p: Pres) => boolean) => { for (const n of boxes) for (const p of n.nd?.pres ?? []) if (pred(p)) return p; return undefined; };
  const conn = allPres((p) => p.lbl.startsWith('parChTrans'));
  const connSt = look(conn?.lbl ?? 'parChTrans1D2', 0, 1);
  const lineColor = connSt?.line ?? scheme('accent1', '<a:shade val="60000"/>');
  for (const [x1, y1, x2, y2] of lines) {
    out.push({
      id: `dgmfb-l${k++}`, name: 'conector', geom: 'line',
      xfrm: { x: Math.min(x1, x2), y: Math.min(y1, y2), cx: Math.abs(x2 - x1), cy: Math.abs(y2 - y1), ...(x2 < x1 !== y2 < y1 ? { flipV: true } : {}) },
      lineColor, lineWidth: connSt?.lineWidth ?? 12700,
    });
  }
  glyphs.forEach((g, gi) => {
    const st = look('sibTrans2D1', gi, glyphs.length);
    out.push({
      id: `dgmfb-a${k++}`, name: 'seta', geom: g.geom, adj: [60000, 50000],
      xfrm: { x: Math.round(g.r.x), y: Math.round(g.r.y), cx: Math.round(g.r.w), cy: Math.round(g.r.h) },
      fill: st?.fill ?? { type: 'solid', color: scheme('accent1', '<a:tint val="60000"/>') },
    });
  });
  const para = (t: string, size: number, color: string): Paragraph => ({ align: 'ctr', bullet: false, marL: 0, indent: 0, lineSpacing: 0.9, spaceBeforePt: 0, spaceAfterPt: 0, runs: [{ text: t, sz: size, color }] });
  const bulletInd = Math.round(0.12 * 914400);
  boxes.forEach((b, bi) => {
    if (b.sub?.lines.length) {
      // filhos de 2º nível: caixa clara atrás/ao lado com marcadores
      const s = b.sub;
      const sp = b.nd ? subPres(b.nd) : undefined;
      const st = look(sp?.lbl ?? (fam === 'list1' ? 'bgAccFollowNode1' : 'alignAccFollowNode1'), sp?.idx ?? bi, sp?.cnt ?? boxes.length, sp?.spPr);
      const topIns = fam === 'list1' ? Math.round(b.h / 2 + ins) : ins;
      const sfill: Fill = st?.fill ?? { type: 'solid', color: subStyle.fill };
      out.push({
        id: `dgmfb-${k++}`, name: 'sub', geom: subStyle.geom,
        xfrm: { x: Math.round(s.x), y: Math.round(s.y), cx: Math.round(s.w), cy: Math.round(s.h) },
        fill: sfill, ...(st?.fillAlpha !== undefined ? { fillAlpha: st.fillAlpha } : !st && subStyle.alpha !== undefined ? { fillAlpha: subStyle.alpha } : {}),
        ...(st ? (st.line ? { lineColor: st.line, lineWidth: st.lineWidth ?? 12700 } : {}) : subStyle.line ? { lineColor: subStyle.line, lineWidth: 12700 } : {}),
        txBody: {
          anchor: fam === 'column' ? 'ctr' : 't', insL: ins * 2, insR: ins, insT: topIns, insB: ins,
          paragraphs: s.lines.map((t) => ({ align: 'l', bullet: true, bulletChar: '•', marL: bulletInd, indent: -bulletInd, lineSpacing: 0.9, spaceBeforePt: 0, runs: [{ text: t, sz: subSz, color: st?.text ?? dark }] })),
        },
      });
    }
    // caixa acessória (círculo do vList3): rótulo de acento do nó
    const mp = b.nd ? (b.acc ? b.nd.pres.find((p) => p.cnt > 0 && p !== mainPres(b.nd!)) : mainPres(b.nd)) : undefined;
    const st = b.acc ? look(mp?.lbl ?? 'fgImgPlace1', mp?.idx ?? bi, mp?.cnt ?? boxes.length, mp?.spPr)
      : look(mp?.lbl ?? 'node1', mp?.idx ?? bi, mp?.cnt ?? boxes.length, b.nd?.spPr ?? mp?.spPr);
    out.push({
      id: `dgmfb-${k++}`, name: 'nó', geom: b.geom ?? 'roundRect',
      xfrm: { x: Math.round(b.x), y: Math.round(b.y), cx: Math.round(b.w), cy: Math.round(b.h) },
      fill: st?.fill ?? { type: 'solid', color: fill }, ...(st?.fillAlpha !== undefined ? { fillAlpha: st.fillAlpha } : {}),
      ...(st ? (st.line ? { lineColor: st.line, lineWidth: st.lineWidth ?? 12700 } : {}) : boxLine ? { lineColor: boxLine, lineWidth: 12700 } : {}),
      txBody: { anchor: 'ctr', insL: ins, insR: ins, insT: ins, insB: ins, paragraphs: b.lines.map((t) => para(t, sz, st?.text ?? txt)) },
    });
  });
  return out;
}

/**
 * Motor de layout de SmartArt (ECMA-376 Parte 1, §21.4) para diagramas SEM o
 * desenho em cache (`ppt/diagrams/drawingN.xml` ausente ou vazio — arquivos do
 * LibreOffice, Office 2007, geradores): interpreta a DEFINIÇÃO de layout
 * (`layoutNode`, `forEach`, `choose/if`, `presOf`, `constrLst`, `ruleLst`,
 * `alg`, `shape`) sobre o MODELO de dados e devolve um `dsp:spTree` no mesmo
 * formato do desenho que o app grava — o leitor do desenho cuida do resto.
 *
 * Estilo (`quickStyleN.xml`) e cores (`colorsN.xml`) viram `dsp:style` +
 * cores pelo rótulo de estilo (`presStyleLbl`) e o índice do nó no rótulo.
 *
 * Entrada hostil: limites de nós de apresentação, profundidade e iterações;
 * nada é avaliado como código.
 */
import { childElements, firstChild, textContent, type XmlElement } from './xml.js';
import { measureApprox, lineFactor } from './diagram-metrics.js';
import { colorFromDml } from './theme.js';
import type { Theme } from './model.js';

/** Largura (EMU) de `text` no tamanho `sizePt`. */
export type DiagramMeasure = (text: string, sizePt: number, font: DiagramFont) => number;
export interface DiagramFont { family?: string; bold?: boolean; italic?: boolean }

export interface DiagramLayoutInput {
  data: XmlElement;
  layout: XmlElement;
  style?: XmlElement;
  colors?: XmlElement;
  /** tamanho do quadro (graphicFrame), EMU */
  cx: number;
  cy: number;
  /** cor DrawingML → #rrggbb (para interpolar listas `span`) */
  resolveColor?: (el: XmlElement) => string | undefined;
  measure?: DiagramMeasure;
  /** fonte do corpo do tema (texto do SmartArt usa +mn-lt) */
  minorFont?: string;
}

const MAX_PRES = 3000;
const MAX_DEPTH = 40;
const MAX_ITER = 20000;
const EMU_MM = 36000;
const EMU_PT = 12700;

type Attrs = Record<string, string>;
const mk = (name: string, attrs: Attrs = {}, children: (XmlElement | string)[] = []): XmlElement => ({ name, attrs, children });
const kids = (e: XmlElement): XmlElement[] => childElements(e);

// ---------------------------------------------------------------------------
// prefixos: o motor trabalha com dgm:/a:/r: (o arquivo pode declarar outros)
// ---------------------------------------------------------------------------
const NS: Record<string, string> = {
  'http://schemas.openxmlformats.org/drawingml/2006/diagram': 'dgm',
  'http://schemas.openxmlformats.org/drawingml/2006/main': 'a',
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships': 'r',
};
function normNs(e: XmlElement, map: Map<string, string> = new Map(), depth = 0): XmlElement {
  let m = map;
  for (const [k, v] of Object.entries(e.attrs)) {
    if (k === 'xmlns' || k.startsWith('xmlns:')) {
      const want = NS[v];
      if (!want) continue;
      const pre = k === 'xmlns' ? '' : k.slice(6);
      if (pre !== want) { if (m === map) m = new Map(map); m.set(pre, want); }
    }
  }
  if (!m.size || depth > 200) return e;
  const ren = (n: string): string => {
    const i = n.indexOf(':');
    const pre = i < 0 ? '' : n.slice(0, i);
    const to = m.get(pre);
    return to === undefined ? n : `${to}:${i < 0 ? n : n.slice(i + 1)}`;
  };
  const attrs: Attrs = {};
  for (const [k, v] of Object.entries(e.attrs)) attrs[k.includes(':') && !k.startsWith('xmlns') ? ren(k) : k] = v;
  return { name: ren(e.name), attrs, children: e.children.map((c) => (typeof c === 'string' ? c : normNs(c, m, depth + 1))) };
}

// ---------------------------------------------------------------------------
// modelo de dados
// ---------------------------------------------------------------------------
interface Pt {
  id: string;
  type: string; // doc | node | asst | parTrans | sibTrans | pres
  el: XmlElement;
  prSet?: XmlElement;
  spPr?: XmlElement;
  t?: XmlElement;
  /** nó pai (transições: o nó de origem da conexão) */
  par?: Pt;
  /** filhos na ordem do modelo: [parTrans, nó, sibTrans] por conexão parOf */
  seq: Pt[];
  depth: number;
  /** transições: pontas da conexão */
  src?: Pt;
  dst?: Pt;
  /** nós: transição de irmão que sai deste nó (para hideLastTrans) */
  last?: boolean;
}
interface Model { root: Pt; pts: Map<string, Pt>; pres: Map<string, Pt[]> }

function readModel(data: XmlElement): Model | undefined {
  const ptLst = firstChild(data, 'dgm:ptLst');
  if (!ptLst) return undefined;
  const pts = new Map<string, Pt>();
  const pres = new Map<string, Pt[]>();
  let root: Pt | undefined;
  for (const e of childElements(ptLst, 'dgm:pt')) {
    const id = e.attrs['modelId'];
    if (id === undefined || pts.has(id)) continue;
    const p: Pt = { id, type: e.attrs['type'] ?? 'node', el: e, seq: [], depth: 0 };
    p.prSet = firstChild(e, 'dgm:prSet');
    const sp = firstChild(e, 'dgm:spPr');
    if (sp && kids(sp).length) p.spPr = sp;
    p.t = firstChild(e, 'dgm:t');
    pts.set(id, p);
    if (p.type === 'doc' && !root) root = p;
    if (p.type === 'pres' && p.prSet) {
      const k = `${p.prSet.attrs['presAssocID'] ?? ''}\u0000${p.prSet.attrs['presName'] ?? ''}`;
      const l = pres.get(k);
      if (l) l.push(p); else pres.set(k, [p]);
    }
  }
  if (!root) return undefined;
  const cxnLst = firstChild(data, 'dgm:cxnLst');
  const bySrc = new Map<string, { ord: number; i: number; e: XmlElement }[]>();
  let i = 0;
  for (const c of cxnLst ? childElements(cxnLst, 'dgm:cxn') : []) {
    const ty = c.attrs['type'] ?? 'parOf';
    if (ty !== 'parOf') continue;
    const s = c.attrs['srcId'] ?? '';
    const l = bySrc.get(s) ?? [];
    l.push({ ord: parseInt(c.attrs['srcOrd'] ?? '0', 10) || 0, i: i++, e: c });
    bySrc.set(s, l);
  }
  // árvore a partir da raiz (visitados: conexões cíclicas/duplicadas são ignoradas)
  const seen = new Set<string>([root.id]);
  const stack: Pt[] = [root];
  let guard = 0;
  while (stack.length && guard++ < MAX_ITER) {
    const p = stack.pop()!;
    const cx = (bySrc.get(p.id) ?? []).sort((a, b) => a.ord - b.ord || a.i - b.i);
    const nodes: Pt[] = [];
    for (const { e } of cx) {
      const d = pts.get(e.attrs['destId'] ?? '');
      if (!d || seen.has(d.id) || d.type === 'pres' || d.type === 'doc') continue;
      seen.add(d.id);
      d.par = p;
      d.depth = p.depth + 1;
      const pt = pts.get(e.attrs['parTransId'] ?? '');
      const st = pts.get(e.attrs['sibTransId'] ?? '');
      if (pt && pt.type === 'parTrans') { pt.par = p; pt.depth = d.depth; pt.src = p; pt.dst = d; p.seq.push(pt); }
      p.seq.push(d);
      if (st && st.type === 'sibTrans') { st.par = p; st.depth = d.depth; st.src = d; p.seq.push(st); }
      nodes.push(d);
    }
    // destino da transição de irmão: o próximo irmão (o último liga ao primeiro)
    for (let k = 0; k < p.seq.length; k++) {
      const s = p.seq[k]!;
      if (s.type !== 'sibTrans' || !s.src) continue;
      const at = nodes.indexOf(s.src);
      s.dst = nodes[at + 1] ?? nodes[0];
      if (at === nodes.length - 1) s.last = true;
    }
    for (let k = nodes.length - 1; k >= 0; k--) stack.push(nodes[k]!);
  }
  return { root, pts, pres };
}

function ptMatch(p: Pt, t: string | undefined): boolean {
  switch (t ?? 'all') {
    case 'all': return true;
    case 'node': return p.type === 'node' || p.type === 'asst';
    case 'norm': return p.type === 'node';
    case 'nonNorm': return p.type !== 'node';
    case 'asst': return p.type === 'asst';
    case 'nonAsst': return p.type !== 'asst';
    case 'doc': return p.type === 'doc';
    case 'parTrans': return p.type === 'parTrans';
    case 'sibTrans': return p.type === 'sibTrans';
    case 'pres': return p.type === 'pres';
    default: return false;
  }
}

function descendants(p: Pt, out: Pt[], depth = 0): Pt[] {
  if (depth > MAX_DEPTH || out.length > MAX_ITER) return out;
  for (const c of p.seq) { out.push(c); if (c.type === 'node' || c.type === 'asst') descendants(c, out, depth + 1); }
  return out;
}

function axisPts(p: Pt, axis: string, root: Pt): Pt[] {
  switch (axis) {
    case 'self': return [p];
    case 'ch': return p.seq;
    case 'des': return descendants(p, []);
    case 'desOrSelf': return [p, ...descendants(p, [])];
    case 'par': return p.par ? [p.par] : [];
    case 'ancst': { const o: Pt[] = []; for (let q = p.par; q && o.length < MAX_DEPTH; q = q.par) o.push(q); return o; }
    case 'ancstOrSelf': { const o: Pt[] = [p]; for (let q = p.par; q && o.length < MAX_DEPTH; q = q.par) o.push(q); return o; }
    case 'followSib': { const s = p.par?.seq ?? []; const i = s.indexOf(p); return i < 0 ? [] : s.slice(i + 1); }
    case 'precedSib': { const s = p.par?.seq ?? []; const i = s.indexOf(p); return i < 0 ? [] : s.slice(0, i); }
    case 'follow': { const s = p.par?.seq ?? []; const i = s.indexOf(p); return i < 0 ? [] : s.slice(i + 1).flatMap((q) => [q, ...descendants(q, [])]); }
    case 'preced': { const s = p.par?.seq ?? []; const i = s.indexOf(p); return i < 0 ? [] : s.slice(0, i).flatMap((q) => [q, ...descendants(q, [])]); }
    case 'root': return [root];
    default: return [];
  }
}

const listAttr = (a: Attrs, k: string): string[] => (a[k] ?? '').trim().split(/\s+/).filter(Boolean);

/** Pontos de uma iteração (`forEach`/`presOf`/`if`): eixos encadeados com filtro, início, contagem e passo. */
function iterate(p: Pt, a: Attrs, root: Pt, defAxis = 'none'): Pt[] {
  const axes = listAttr(a, 'axis');
  if (!axes.length) axes.push(defAxis);
  const types = listAttr(a, 'ptType'), sts = listAttr(a, 'st'), cnts = listAttr(a, 'cnt'), steps = listAttr(a, 'step'), hlts = listAttr(a, 'hideLastTrans');
  let cur: Pt[] = [p];
  for (let k = 0; k < axes.length; k++) {
    const next: Pt[] = [];
    const ty = types[k] ?? types[types.length - 1] ?? 'all';
    const hide = (hlts[k] ?? hlts[hlts.length - 1] ?? 'true') !== '0' && (hlts[k] ?? hlts[hlts.length - 1]) !== 'false';
    const st = parseInt(sts[k] ?? '1', 10) || 1;
    const cnt = parseInt(cnts[k] ?? '0', 10) || 0;
    let step = parseInt(steps[k] ?? '1', 10) || 1;
    for (const q of cur) {
      let l = axisPts(q, axes[k]!, root).filter((x) => ptMatch(x, ty));
      if (hide) l = l.filter((x) => !(x.type === 'sibTrans' && x.last));
      const start = st < 0 ? l.length + st : st - 1;
      if (step === 0) step = 1;
      let taken = 0;
      for (let i = start; i >= 0 && i < l.length; i += step) {
        next.push(l[i]!);
        if (cnt && ++taken >= cnt) break;
        if (next.length > MAX_ITER) break;
      }
    }
    cur = next;
  }
  return cur;
}

// ---------------------------------------------------------------------------
// árvore de apresentação
// ---------------------------------------------------------------------------
interface Constr {
  type: string; for: string; forName?: string; ptType?: string;
  refType: string; refFor: string; refForName?: string; refPtType?: string;
  op: string; val: number; hasVal: boolean; fact: number;
}
interface Rule { type: string; for: string; forName?: string; ptType?: string; val: number; fact: number; max: number }

interface PNode {
  uid: number;
  name: string;
  def: XmlElement;
  pt: Pt;
  parent?: PNode;
  kids: PNode[];
  alg?: XmlElement;
  shape?: XmlElement;
  presOf?: XmlElement;
  constrs: Constr[];
  rules: Rule[];
  lvars: Attrs;
  styleLbl?: string;
  pres?: Pt;
  styleIdx: number;
  styleCnt: number;
  /** valores de restrição (comprimentos em EMU, fontes em pt) */
  v: Record<string, number>;
  /** valores impostos por restrições for="des" de ancestrais (sobrevivem à reavaliação do pai) */
  desV: Record<string, number>;
  /** margens proporcionais à fonte (fração de primFontSz/secFontSz) */
  margF: Record<string, [number, string]>;
  /** grupos de igualdade (op="equ") por tipo */
  equ: Record<string, string>;
  /** limites (op="lte"/"gte") por tipo: [refNode, refType, fact] */
  lte: Record<string, [PNode, string, number]>;
  /** caixa final (absoluta no quadro) */
  x: number; y: number; w: number; h: number;
  /** caixa relativa ao pai, definida pelo algoritmo do pai */
  rx?: number; ry?: number; rw?: number; rh?: number;
  rot: number;
  /** conector: geometria pronta */
  conn?: { prst: string; x: number; y: number; w: number; h: number; rot: number; flipH?: boolean; adj?: [string, number][]; path?: XmlElement; line?: boolean };
  /** texto: tamanho final (pt) */
  fontPt?: number;
  /** texto: tamanho secundário (níveis ≥ 1) */
  secPt?: number;
}

const parseNum = (s: string | undefined, d: number): number => {
  if (s === undefined) return d;
  if (s === 'INF') return Infinity;
  if (s === 'NaN') return NaN;
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : d;
};

function parseConstr(e: XmlElement): Constr {
  const a = e.attrs;
  return {
    type: a['type'] ?? 'none', for: a['for'] ?? 'self', forName: a['forName'], ptType: a['ptType'],
    refType: a['refType'] ?? 'none', refFor: a['refFor'] ?? 'self', refForName: a['refForName'], refPtType: a['refPtType'],
    op: a['op'] ?? 'none', val: parseNum(a['val'], 0), hasVal: a['val'] !== undefined, fact: parseNum(a['fact'], 1),
  };
}
function parseRule(e: XmlElement): Rule {
  const a = e.attrs;
  return { type: a['type'] ?? 'none', for: a['for'] ?? 'self', forName: a['forName'], ptType: a['ptType'], val: parseNum(a['val'], NaN), fact: parseNum(a['fact'], NaN), max: parseNum(a['max'], NaN) };
}

const VAR_DEFAULT: Attrs = { dir: 'norm', hierBranch: 'std', bulletEnabled: '0', animLvl: 'none', animOne: 'one', resizeHandles: 'rel', orgChart: '0', chMax: '-1', chPref: '-1' };
function readVars(e: XmlElement | undefined): Attrs {
  const o: Attrs = {};
  if (!e) return o;
  for (const v of kids(e)) {
    const k = v.name.replace(/^dgm:/, '');
    o[k] = v.attrs['val'] ?? VAR_DEFAULT[k] ?? '';
  }
  return o;
}

class Builder {
  nodes: PNode[] = [];
  forEachByName = new Map<string, XmlElement>();
  used = new Set<Pt>();
  iter = 0;
  constructor(public model: Model) {}

  index(e: XmlElement, depth = 0): void {
    if (depth > 200) return;
    for (const c of kids(e)) {
      if (c.name === 'dgm:forEach' && c.attrs['name'] && !c.attrs['ref']) this.forEachByName.set(c.attrs['name'], c);
      this.index(c, depth + 1);
    }
  }

  node(def: XmlElement, pt: Pt, parent: PNode | undefined, depth: number): PNode | undefined {
    if (this.nodes.length >= MAX_PRES || depth > MAX_DEPTH) return undefined;
    const name = def.attrs['name'] ?? '';
    const n: PNode = {
      uid: this.nodes.length, name, def, pt, parent, kids: [], constrs: [], rules: [], lvars: {}, styleLbl: def.attrs['styleLbl'],
      styleIdx: 0, styleCnt: 0, v: {}, desV: {}, margF: {}, equ: {}, lte: {}, x: 0, y: 0, w: 0, h: 0, rot: 0,
    };
    this.nodes.push(n);
    // ponto de apresentação gravado (ajustes do usuário: variáveis, escala, formatação)
    const l = this.model.pres.get(`${pt.id}\u0000${name}`);
    if (l) { const p = l.find((x) => !this.used.has(x)); if (p) { this.used.add(p); n.pres = p; } }
    this.content(def, n, pt, depth);
    return n;
  }

  content(container: XmlElement, n: PNode, pt: Pt, depth: number): void {
    if (depth > MAX_DEPTH) return;
    for (const c of kids(container)) {
      if (++this.iter > MAX_ITER * 4) return;
      switch (c.name) {
        case 'dgm:alg': n.alg = c; break;
        case 'dgm:shape': n.shape = c; break;
        case 'dgm:presOf': n.presOf = c; break;
        case 'dgm:constrLst': for (const k of childElements(c, 'dgm:constr')) n.constrs.push(parseConstr(k)); break;
        case 'dgm:ruleLst': for (const k of childElements(c, 'dgm:rule')) n.rules.push(parseRule(k)); break;
        case 'dgm:varLst': Object.assign(n.lvars, readVars(c)); break;
        case 'dgm:layoutNode': { const k = this.node(c, pt, n, depth + 1); if (k) n.kids.push(k); break; }
        case 'dgm:forEach': {
          const fe = c.attrs['ref'] ? this.forEachByName.get(c.attrs['ref']) ?? c : c;
          for (const q of iterate(pt, fe.attrs, this.model.root)) this.content(fe, n, q, depth + 1);
          break;
        }
        case 'dgm:choose': {
          for (const br of kids(c)) {
            if (br.name === 'dgm:if' ? this.test(br, n, pt) : br.name === 'dgm:else') { this.content(br, n, pt, depth + 1); break; }
          }
          break;
        }
        default: break;
      }
    }
  }

  test(br: XmlElement, n: PNode, pt: Pt): boolean {
    const a = br.attrs;
    const func = a['func'] ?? 'cnt';
    const op = a['op'] ?? 'equ';
    const want = a['val'] ?? '';
    let got: number | string;
    switch (func) {
      case 'cnt': got = iterate(pt, a, this.model.root).length; break;
      case 'pos': case 'revPos': case 'posEven': case 'posOdd': {
        const base = iterate(pt, a, this.model.root, 'self')[0] ?? pt;
        const sib = (base.par?.seq ?? [base]).filter((x) => x.type === base.type);
        const i = sib.indexOf(base) + 1;
        got = func === 'pos' ? i : func === 'revPos' ? sib.length - i + 1 : func === 'posEven' ? (i % 2 === 0 ? 1 : 0) : (i % 2 === 1 ? 1 : 0);
        break;
      }
      case 'depth': { const base = iterate(pt, a, this.model.root, 'self')[0] ?? pt; got = base.depth; break; }
      case 'maxDepth': {
        const l = iterate(pt, a, this.model.root, 'self');
        let m = 0;
        const from = pt.depth;
        for (const q of l) if (q.type === 'node' || q.type === 'asst') m = Math.max(m, q.depth - from);
        got = m;
        break;
      }
      case 'var': got = varOf(n, a['arg'] ?? ''); break;
      default: return false;
    }
    if (typeof got === 'string') {
      const g = got === 'true' ? '1' : got === 'false' ? '0' : got;
      const w = want === 'true' ? '1' : want === 'false' ? '0' : want;
      const gn = parseFloat(g), wn = parseFloat(w);
      if (Number.isFinite(gn) && Number.isFinite(wn)) got = gn;
      else return op === 'equ' ? g === w : op === 'neq' ? g !== w : false;
    }
    const w = parseFloat(want);
    switch (op) {
      case 'equ': return got === w;
      case 'neq': return got !== w;
      case 'gt': return got > w;
      case 'lt': return got < w;
      case 'gte': return got >= w;
      case 'lte': return got <= w;
      default: return false;
    }
  }
}

/** Variável do layout: ajuste do usuário (presLayoutVars) → varLst do nó → ancestrais → padrão. */
function varOf(n: PNode, k: string): string {
  for (let q: PNode | undefined = n; q; q = q.parent) {
    const pv = q.pres?.prSet ? firstChild(q.pres.prSet, 'dgm:presLayoutVars') : undefined;
    const fromPres = pv ? kids(pv).find((e) => e.name === `dgm:${k}`) : undefined;
    if (fromPres) return fromPres.attrs['val'] ?? VAR_DEFAULT[k] ?? '';
    if (q.lvars[k] !== undefined) return q.lvars[k]!;
  }
  return VAR_DEFAULT[k] ?? '';
}

// ---------------------------------------------------------------------------
// restrições
// ---------------------------------------------------------------------------
const LEN = new Set(['w', 'h', 'l', 't', 'r', 'b', 'ctrX', 'ctrY', 'lOff', 'tOff', 'rOff', 'bOff', 'ctrXOff', 'ctrYOff', 'wOff', 'hOff',
  'sp', 'sibSp', 'secSibSp', 'begPad', 'endPad', 'diam', 'connDist', 'bendDist', 'wArH', 'hArH', 'stemThick', 'begMarg', 'endMarg',
  'lMarg', 'rMarg', 'tMarg', 'bMarg']);
const MARG = new Set(['lMarg', 'rMarg', 'tMarg', 'bMarg']);
const FONT = new Set(['primFontSz', 'secFontSz']);

function des(n: PNode, out: PNode[] = [], depth = 0): PNode[] {
  if (depth > MAX_DEPTH) return out;
  for (const k of n.kids) { out.push(k); des(k, out, depth + 1); }
  return out;
}
function select(owner: PNode, f: string, name: string | undefined, ptType: string | undefined): PNode[] {
  const base = f === 'ch' ? owner.kids : f === 'des' ? des(owner) : [owner];
  if (!name && !ptType) return base;
  return base.filter((k) => (!name || k.name === name) && (!ptType || ptMatch(k.pt, ptType)));
}

/** Valor de um tipo no nó (derivados de posição a partir de l/t/w/h). */
function getVal(n: PNode, t: string): number | undefined {
  const v = n.v;
  if (v[t] !== undefined) return v[t];
  switch (t) {
    case 'r': return v['l'] !== undefined && v['w'] !== undefined ? v['l'] + v['w'] : undefined;
    case 'b': return v['t'] !== undefined && v['h'] !== undefined ? v['t'] + v['h'] : undefined;
    case 'ctrX': return v['l'] !== undefined && v['w'] !== undefined ? v['l'] + v['w'] / 2 : undefined;
    case 'ctrY': return v['t'] !== undefined && v['h'] !== undefined ? v['t'] + v['h'] / 2 : undefined;
    case 'l': return v['r'] !== undefined && v['w'] !== undefined ? v['r'] - v['w'] : v['ctrX'] !== undefined && v['w'] !== undefined ? v['ctrX'] - v['w'] / 2 : undefined;
    case 't': return v['b'] !== undefined && v['h'] !== undefined ? v['b'] - v['h'] : v['ctrY'] !== undefined && v['h'] !== undefined ? v['ctrY'] - v['h'] / 2 : undefined;
    default: return undefined;
  }
}

/**
 * Avalia as restrições de `owner` (na ordem). `scale(c, target, ref)` devolve o
 * fator aplicado a valores derivados do PRÓPRIO tamanho do dono (o algoritmo
 * encolhe o eixo principal assim; dependentes acompanham pela referência).
 */
function applyConstrs(owner: PNode, scale?: (c: Constr, ref: PNode) => number, onlySelf = false): void {
  for (const c of owner.constrs) {
    if (onlySelf && c.for !== 'self') continue;
    const targets = select(owner, c.for, c.forName, c.ptType);
    for (const t of targets) {
      // margem proporcional à fonte: resolvida depois do ajuste do texto
      if (MARG.has(c.type) && FONT.has(c.refType)) { t.margF[c.type] = [Number.isFinite(c.fact) ? c.fact : 1, c.refType]; continue; }
      let value: number | undefined;
      let ref: PNode | undefined;
      if (c.refType !== 'none') {
        ref = refNode(owner, c, t);
        const rv = ref ? getVal(ref, c.refType) : undefined;
        if (rv === undefined) continue;
        value = rv * (Number.isFinite(c.fact) ? c.fact : 1);
        if (c.op === 'lte' || c.op === 'gte') {
          if (c.op === 'lte' && ref) t.lte[c.type] = [ref, c.refType, Number.isFinite(c.fact) ? c.fact : 1];
          const cur = t.v[c.type];
          if (cur !== undefined && Number.isFinite(value)) t.v[c.type] = c.op === 'lte' ? Math.min(cur, value) : Math.max(cur, value);
          else if (cur === undefined && c.op === 'gte') t.v[c.type] = value;
          continue;
        }
      } else if (c.hasVal) {
        value = LEN.has(c.type) ? c.val * EMU_MM : c.val;
      } else if (c.op !== 'none') {
        if (c.op === 'equ') t.equ[c.type] = `${owner.uid}:${c.type}:${c.forName ?? ''}:${c.ptType ?? ''}`;
        continue;
      } else value = 0;
      if (value === undefined || Number.isNaN(value)) continue;
      if (scale && t !== owner) {
        if (ref === owner && (c.refType === 'w' || c.refType === 'h')) value *= scale(c, owner);
        else if (c.refType === 'none' && LEN.has(c.type)) value *= scale(c, owner);
      }
      if (c.op === 'equ') t.equ[c.type] = `${owner.uid}:${c.type}:${c.forName ?? ''}:${c.ptType ?? ''}`;
      t.v[c.type] = value;
      if (c.for === 'des') t.desV[c.type] = value;
    }
  }
}
function refNode(owner: PNode, c: Constr, target: PNode): PNode | undefined {
  if (c.refFor === 'self') return owner;
  const cands = select(owner, c.refFor, c.refForName, c.refPtType);
  if (cands.includes(target)) return target;
  return cands[0];
}

/** Restrições do dono + as "self" de cada filho (tamanho ideal dos filhos). */
function evalKids(n: PNode, scale?: (c: Constr, ref: PNode) => number): void {
  // valores impostos de cima (for="des" de ancestrais) continuam valendo
  for (const k of n.kids) { k.v = { ...k.desV }; k.lte = {}; }
  applyConstrs(n, scale);
  for (const k of n.kids) applyConstrs(k, undefined, true);
}

// ---------------------------------------------------------------------------
// algoritmos
// ---------------------------------------------------------------------------
const params = (alg: XmlElement | undefined): Attrs => {
  const o: Attrs = {};
  if (alg) for (const p of childElements(alg, 'dgm:param')) if (p.attrs['type']) o[p.attrs['type']] = p.attrs['val'] ?? '';
  return o;
};
const algType = (n: PNode): string => n.alg?.attrs['type'] ?? 'none';
const isTrans = (n: PNode): boolean => n.pt.type === 'sibTrans' || n.pt.type === 'parTrans';

/** Tamanho de um filho pelos valores de restrição (ausente = do pai). */
function kidSize(k: PNode, n: PNode): { w: number; h: number } {
  const v = k.v;
  let w = v['w'], h = v['h'];
  if (w === undefined && v['l'] !== undefined && v['r'] !== undefined) w = v['r'] - v['l'];
  if (h === undefined && v['t'] !== undefined && v['b'] !== undefined) h = v['b'] - v['t'];
  w = (w ?? n.w) + (v['wOff'] ?? 0);
  h = (h ?? n.h) + (v['hOff'] ?? 0);
  const sx = custScale(k, 'X'), sy = custScale(k, 'Y');
  return { w: Math.max(0, w * sx), h: Math.max(0, h * sy) };
}
function custScale(k: PNode, axis: 'X' | 'Y'): number {
  const s = k.pres?.prSet?.attrs[`custScale${axis}`];
  const v = s !== undefined ? parseInt(s, 10) / 100000 : 1;
  return Number.isFinite(v) && v > 0 && v < 100 ? v : 1;
}

function algComposite(n: PNode): void {
  const p = params(n.alg);
  const ar = parseFloat(p['ar'] ?? '');
  if (Number.isFinite(ar) && ar > 0 && n.w > 0 && n.h > 0) {
    // proporção fixa: encolhe o lado que sobra, centralizado
    if (n.w / n.h > ar) { const w = n.h * ar; n.x += (n.w - w) / 2; n.w = w; }
    else { const h = n.w / ar; n.y += (n.h - h) / 2; n.h = h; }
    n.v['w'] = n.w; n.v['h'] = n.h;
  }
  evalKids(n);
  for (const k of n.kids) {
    const { w, h } = kidSize(k, n);
    const v = k.v;
    let x = v['l'] ?? (v['ctrX'] !== undefined ? v['ctrX'] - w / 2 : v['r'] !== undefined ? v['r'] - w : 0);
    let y = v['t'] ?? (v['ctrY'] !== undefined ? v['ctrY'] - h / 2 : v['b'] !== undefined ? v['b'] - h : 0);
    x += (v['lOff'] ?? 0) + (v['ctrXOff'] ?? 0) - (v['rOff'] ?? 0) * 0;
    y += (v['tOff'] ?? 0) + (v['ctrYOff'] ?? 0);
    place(k, x, y, w, h);
  }
}

function place(k: PNode, x: number, y: number, w: number, h: number): void {
  k.rx = x; k.ry = y; k.rw = w; k.rh = h;
}

/** Busca binária do maior fator (0, 1] que faz `fits(s)` valer. */
function bestScale(fits: (s: number) => boolean): number {
  if (fits(1)) return 1;
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
  return lo || 1e-6;
}

function algLin(n: PNode): void {
  const p = params(n.alg);
  const dir = p['linDir'] ?? 'fromL';
  const horiz = dir === 'fromL' || dir === 'fromR';
  const rev = dir === 'fromR' || dir === 'fromB';
  const W = n.w, H = n.h;
  const main = horiz ? 'w' : 'h';
  // fromR/fromB: mesma ordem, posição espelhada
  const order = n.kids;
  let sizes: { w: number; h: number }[] = [];
  let mode: 'main' | 'all' = 'main';
  const run = (s: number): { len: number; sec: number } => {
    evalKids(n, (c) => (mode === 'all' || c.refType === main ? s : 1));
    sizes = order.map((k) => kidSize(k, n));
    const sp = n.v['sp'] ?? 0;
    let len = 0, sec = 0;
    sizes.forEach((z, i) => { len += horiz ? z.w : z.h; if (i) len += sp; sec = Math.max(sec, horiz ? z.h : z.w); });
    return { len, sec };
  };
  const fits = (s: number): boolean => { const r = run(s); return r.len <= (horiz ? W : H) * 1.0001 && r.sec <= (horiz ? H : W) * 1.0001; };
  let s = bestScale(fits);
  if (s <= 1e-5) { mode = 'all'; s = bestScale(fits); }
  const { len } = run(s);
  const sp = n.v['sp'] ?? 0;
  const hAl = p['nodeHorzAlign'] ?? 'ctr', vAl = p['nodeVertAlign'] ?? 'mid';
  let pos = ((horiz ? W : H) - len) / 2;
  order.forEach((k, i) => {
    const z = sizes[i]!;
    if (horiz) {
      const y = vAl === 't' ? 0 : vAl === 'b' ? H - z.h : (H - z.h) / 2;
      place(k, rev ? W - pos - z.w : pos, y, z.w, z.h);
      pos += z.w + sp;
    } else {
      const x = hAl === 'l' ? 0 : hAl === 'r' ? W - z.w : (W - z.w) / 2;
      place(k, x, rev ? H - pos - z.h : pos, z.w, z.h);
      pos += z.h + sp;
    }
  });
  // os filhos voltam a valer na ordem original (rev usa posição espelhada)
}

function algSnake(n: PNode): void {
  const p = params(n.alg);
  const grDir = p['grDir'] ?? 'tL';
  const flowCol = p['flowDir'] === 'col';
  const revDir = p['contDir'] === 'revDir';
  const W = n.w, H = n.h;
  const items = n.kids.filter((k) => !isTrans(k));
  const N = items.length;
  if (!N) { evalKids(n); return; }
  evalKids(n);
  const ideal = items.map((k) => kidSize(k, n));
  const iw = Math.max(...ideal.map((z) => z.w)), ih = Math.max(...ideal.map((z) => z.h));
  const isp = n.v['sp'] ?? 0;
  let best = { c: N, s: 0 };
  const fixed = p['bkpt'] === 'fixed' ? parseInt(p['bkPtFixedVal'] ?? '', 10) : NaN;
  for (let c = 1; c <= N; c++) {
    if (Number.isFinite(fixed) && fixed > 0 && c !== Math.min(N, fixed)) continue;
    const r = Math.ceil(N / c);
    const cols = flowCol ? r : c, rows = flowCol ? c : r;
    const tw = cols * iw + (cols - 1) * isp, th = rows * ih + (rows - 1) * isp;
    const s = Math.min(tw > 0 ? W / tw : Infinity, th > 0 ? H / th : Infinity);
    if (s > best.s * 1.000001) best = { c, s };
  }
  const s = Math.min(1, best.s);
  evalKids(n, () => s);
  const sizes = items.map((k) => kidSize(k, n));
  const w = Math.max(...sizes.map((z) => z.w)), h = Math.max(...sizes.map((z) => z.h));
  const sp = n.v['sp'] ?? 0;
  const per = best.c, lines = Math.ceil(N / per);
  const cols = flowCol ? lines : per, rows = flowCol ? per : lines;
  const tw = cols * w + (cols - 1) * sp, th = rows * h + (rows - 1) * sp;
  const ox = (W - tw) / 2, oy = (H - th) / 2;
  const fromR = grDir === 'tR' || grDir === 'bR', fromB = grDir === 'bL' || grDir === 'bR';
  items.forEach((k, i) => {
    const line = Math.floor(i / per);
    let at = i % per;
    const inLine = Math.min(per, N - line * per);
    if (revDir && line % 2 === 1) at = per - 1 - at;
    // linha incompleta centralizada (off="ctr")
    const shift = p['off'] === 'off' ? 0 : ((per - inLine) * ((flowCol ? h : w) + sp)) / 2;
    let cx: number, cy: number;
    if (!flowCol) {
      cx = at * (w + sp) + (revDir && line % 2 === 1 ? -shift : shift);
      cy = line * (h + sp);
    } else {
      cy = at * (h + sp) + (revDir && line % 2 === 1 ? -shift : shift);
      cx = line * (w + sp);
    }
    if (fromR) cx = tw - cx - w;
    if (fromB) cy = th - cy - h;
    const z = sizes[i]!;
    place(k, ox + cx + (w - z.w) / 2, oy + cy + (h - z.h) / 2, z.w, z.h);
  });
  // transições: entre os nós (posicionadas pelo conector, se houver)
  for (const k of n.kids) if (isTrans(k)) { const z = kidSize(k, n); place(k, 0, 0, z.w, z.h); }
}

// ---------------------------------------------------------------------------
// laço principal
// ---------------------------------------------------------------------------
function layoutNode(n: PNode, depth: number): void {
  if (depth > MAX_DEPTH) return;
  n.v['w'] = n.w; n.v['h'] = n.h;
  switch (algType(n)) {
    case 'lin': algLin(n); break;
    case 'snake': algSnake(n); break;
    default: algComposite(n); break;
  }
  for (const k of n.kids) {
    k.x = n.x + (k.rx ?? 0); k.y = n.y + (k.ry ?? 0); k.w = k.rw ?? n.w; k.h = k.rh ?? n.h;
    layoutNode(k, depth + 1);
  }
}

// ---------------------------------------------------------------------------
// saída: dsp:spTree
// ---------------------------------------------------------------------------
/**
 * Refaz o desenho de um SmartArt sem desenho em cache: partes já lidas, tamanho
 * do quadro e o tema (cores das listas `span`, fonte do corpo para medir).
 * Qualquer falha devolve undefined (o chamador cai no plano B).
 */
export function regenerateDiagram(data: XmlElement | undefined, layout: XmlElement | undefined, style: XmlElement | undefined,
  colors: XmlElement | undefined, cx: number, cy: number, theme: Theme): XmlElement | undefined {
  if (!data || !layout || !(cx > 0) || !(cy > 0)) return undefined;
  // só layouts cujos algoritmos o motor implementa (o resto fica com o plano B)
  if (!supported(layout)) return undefined;
  try {
    return layoutDiagram({ data, layout, style, colors, cx, cy, minorFont: theme.fonts?.minor, resolveColor: (e) => colorFromDml(e, theme) });
  } catch {
    return undefined;
  }
}

const ALGS = new Set(['composite', 'lin', 'snake', 'tx', 'sp', 'conn']);
function supported(layout: XmlElement, depth = 0): boolean {
  if (depth > 200) return false;
  for (const c of kids(layout)) {
    if (c.name.endsWith(':alg') && !ALGS.has(c.attrs['type'] ?? '')) return false;
    if (!supported(c, depth + 1)) return false;
  }
  return true;
}

export function layoutDiagram(inp: DiagramLayoutInput): XmlElement | undefined {
  const data = normNs(inp.data), layout = normNs(inp.layout);
  const model = readModel(data);
  if (!model) return undefined;
  const rootDef = firstChild(layout, 'dgm:layoutNode');
  if (!rootDef) return undefined;
  const b = new Builder(model);
  b.index(layout);
  const root = b.node(rootDef, model.root, undefined, 0);
  if (!root) return undefined;
  assignStyles(b.nodes);
  root.x = 0; root.y = 0; root.w = inp.cx; root.h = inp.cy;
  layoutNode(root, 0);
  const style = inp.style ? normNs(inp.style) : undefined, colors = inp.colors ? normNs(inp.colors) : undefined;
  return emit(b.nodes, root, model, style, colors, inp);
}

/** presStyleLbl/Idx/Cnt: rótulo do nó (ou o padrão pelo tipo/profundidade) e a ordem dentro do rótulo. */
function assignStyles(nodes: PNode[]): void {
  const cnt = new Map<string, number>();
  for (const n of nodes) {
    if (!n.styleLbl) n.styleLbl = defaultLbl(n);
    if (!n.styleLbl) continue;
    n.styleIdx = cnt.get(n.styleLbl) ?? 0;
    cnt.set(n.styleLbl, n.styleIdx + 1);
  }
  for (const n of nodes) if (n.styleLbl) n.styleCnt = cnt.get(n.styleLbl) ?? 1;
}
function defaultLbl(n: PNode): string | undefined {
  if (!n.shape?.attrs['type'] || n.shape.attrs['type'] === 'none') {
    // herda do pai com rótulo (nós de texto sem geometria própria)
    return undefined;
  }
  const d = Math.min(4, Math.max(1, n.pt.depth));
  const dim = params(n.alg)['dim'] === '1D' ? '1D' : '2D';
  if (n.pt.type === 'sibTrans') return `sibTrans${dim}1`;
  if (n.pt.type === 'parTrans') return `parChTrans${dim}${d}`;
  if (n.pt.type === 'asst') return `asst${d}`;
  if (n.pt.type === 'node') return `node${d}`;
  return undefined;
}

// --- cores e estilo ---------------------------------------------------------
function styleLbls(root: XmlElement | undefined): Map<string, XmlElement> {
  const m = new Map<string, XmlElement>();
  if (root) for (const e of childElements(root, 'dgm:styleLbl')) if (e.attrs['name'] && !m.has(e.attrs['name'])) m.set(e.attrs['name'], e);
  return m;
}

const clone = (e: XmlElement): XmlElement => ({ name: e.name, attrs: { ...e.attrs }, children: e.children.map((c) => (typeof c === 'string' ? c : clone(c))) });

/** Cor `idx` de uma lista de cores (repeat/cycle/span) — span interpola em HSL como o app (hueOff/satOff/lumOff/alphaOff). */
function pickColor(lst: XmlElement | undefined, idx: number, cnt: number, resolve?: (el: XmlElement) => string | undefined): XmlElement | undefined {
  if (!lst) return undefined;
  const cs = kids(lst).filter((c) => /Clr$/.test(c.name));
  if (!cs.length) return undefined;
  const meth = lst.attrs['meth'] ?? 'span';
  if (cs.length === 1) return withOffsets(clone(cs[0]!), 0, 0, 0, 0);
  if (meth === 'repeat') return withOffsets(clone(cs[idx % cs.length]!), 0, 0, 0, 0);
  if (meth === 'cycle') {
    const per = 2 * cs.length - 2;
    const k = idx % Math.max(1, per);
    return withOffsets(clone(cs[k < cs.length ? k : per - k]!), 0, 0, 0, 0);
  }
  // span: do primeiro ao último ao longo de cnt itens (hueDir cw/ccw)
  const t = cnt > 1 ? Math.min(1, idx / (cnt - 1)) * (cs.length - 1) : 0;
  const i = Math.min(cs.length - 2, Math.floor(t)), u = t - i;
  const a = cs[i]!, b = cs[i + 1]!;
  const ca = resolve?.(a), cb = resolve?.(b);
  if (!ca || !cb || u === 0) return withOffsets(clone(u > 0.999 ? b : a), 0, 0, 0, 0);
  const ha = hsl(ca), hb = hsl(cb);
  let dh = hb[0] - ha[0];
  const cw = (lst.attrs['hueDir'] ?? 'cw') === 'cw';
  if (cw && dh < 0) dh += 360; else if (!cw && dh > 0) dh -= 360;
  const alpha = (e: XmlElement) => { const al = kids(e).find((m) => m.name === 'a:alpha'); return al ? parseInt(al.attrs['val'] ?? '100000', 10) / 100000 : 1; };
  return withOffsets(clone(a), dh * u, (hb[1] - ha[1]) * u, (hb[2] - ha[2]) * u, (alpha(b) - alpha(a)) * u);
}
function withOffsets(e: XmlElement, dh: number, ds: number, dl: number, da: number): XmlElement {
  if (e.name === 'a:schemeClr' || e.name === 'a:srgbClr' || e.name === 'a:sysClr' || e.name === 'a:prstClr' || e.name === 'a:scrgbClr' || e.name === 'a:hslClr') {
    e.children.push(
      mk('a:hueOff', { val: String(Math.round(dh * 60000)) }), mk('a:satOff', { val: String(Math.round(ds * 100000)) }),
      mk('a:lumOff', { val: String(Math.round(dl * 100000)) }), mk('a:alphaOff', { val: String(Math.round(da * 100000)) }),
    );
  }
  return e;
}
function hsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

// --- texto ----------------------------------------------------------------
interface TextPara { p: XmlElement; level: number }

/**
 * Pontos do texto de um nó (`presOf`) e o NÍVEL de cada parágrafo: relativo à
 * âncora — o ponto de onde parte o último passo `des`/`desOrSelf` (os
 * descendentes de "des" começam no nível 1; "ch desOrSelf" põe o filho no 0).
 */
function presTexts(n: PNode, root: Pt): { pt: Pt; level: number }[] {
  if (!n.presOf) return [];
  const a = n.presOf.attrs;
  const axes = listAttr(a, 'axis');
  const last = axes[axes.length - 1];
  const out: { pt: Pt; level: number }[] = [];
  const keep = (p: Pt) => !!p.t || p.type === 'node' || p.type === 'asst';
  if (last === 'des' || last === 'desOrSelf') {
    const k = axes.length - 1;
    const pick = (key: string): Attrs => { const l = listAttr(a, key); return l.length ? { [key]: l.slice(0, k).join(' ') } : {}; };
    const head: Attrs = k ? { axis: axes.slice(0, k).join(' '), ...pick('ptType'), ...pick('st'), ...pick('cnt'), ...pick('step'), ...pick('hideLastTrans') } : {};
    const anchors = k ? iterate(n.pt, head, root) : [n.pt];
    const tail = (key: string): string | undefined => listAttr(a, key)[k];
    const lastAttrs: Attrs = { axis: last };
    for (const key of ['ptType', 'st', 'cnt', 'step', 'hideLastTrans']) { const v = tail(key); if (v !== undefined) lastAttrs[key] = v; }
    for (const an of anchors) for (const p of iterate(an, lastAttrs, root)) if (keep(p)) out.push({ pt: p, level: Math.max(0, p.depth - an.depth) });
    return out;
  }
  for (const p of iterate(n.pt, a, root)) if (keep(p)) out.push({ pt: p, level: 0 });
  return out;
}

function paraText(p: XmlElement): { runs: { text: string; rPr?: XmlElement }[] } {
  const runs: { text: string; rPr?: XmlElement }[] = [];
  for (const r of kids(p)) {
    if (r.name === 'a:r' || r.name === 'a:fld') { const t = firstChild(r, 'a:t'); runs.push({ text: t ? textContent(t) : '', rPr: firstChild(r, 'a:rPr') }); }
    else if (r.name === 'a:br') runs.push({ text: '\n' });
  }
  return { runs };
}

/** Altura (EMU) do texto no tamanho dado, quebrando linhas em `width`; Infinity se uma palavra não cabe. */
function textHeight(paras: TextPara[], prim: number, sec: number, width: number, measure: DiagramMeasure, family: string | undefined, lineK: number): number {
  let hgt = 0;
  for (let pi = 0; pi < paras.length; pi++) {
    const tp = paras[pi]!;
    const sz = tp.level === 0 ? prim : sec;
    const avail = width - (tp.level > 0 ? bulletIndent(sz) * tp.level : 0);
    const { runs } = paraText(tp.p);
    const text = runs.map((r) => r.text).join('');
    const font = { family, bold: runs.some((r) => r.rPr?.attrs['b'] === '1'), italic: runs.some((r) => r.rPr?.attrs['i'] === '1') };
    let lines = 0;
    for (const seg of text.split('\n')) {
      lines++;
      let cur = 0;
      for (const w of seg.split(/(\s+)/)) {
        if (!w) continue;
        const ww = measure(w, sz, font);
        if (/^\s+$/.test(w)) { cur += ww; continue; }
        if (ww > avail + 1) return Infinity;
        if (cur > 0 && cur + ww > avail + 1) { lines++; cur = ww; } else cur += ww;
      }
    }
    hgt += lines * sz * EMU_PT * lineK * 0.9;
    if (pi < paras.length - 1) hgt += sz * EMU_PT * 1.2 * (tp.level === 0 ? 0.35 : 0.15);
  }
  return hgt;
}
const bulletIndent = (szPt: number): number => szPt * EMU_PT * 0.5;

// --- geometria de texto dos presets (retângulo de texto da forma) -----------
function textRect(prst: string, w: number, h: number, adj: [string, number][]): [number, number, number, number] {
  const ss = Math.min(w, h);
  const a = (i: number, d: number) => adj[i]?.[1] ?? d;
  switch (prst) {
    case 'roundRect': { const il = ss * Math.min(50000, Math.max(0, a(0, 16667))) / 100000 * 0.29289; return [il, il, w - il, h - il]; }
    case 'ellipse': case 'flowChartConnector': { const dx = w / 2 * (1 - Math.SQRT1_2), dy = h / 2 * (1 - Math.SQRT1_2); return [dx, dy, w - dx, h - dy]; }
    case 'rightArrow': {
      const a1 = Math.min(100000, Math.max(0, a(0, 50000))), mx2 = 100000 * w / ss, a2 = Math.min(mx2, Math.max(0, a(1, 50000)));
      const dx1 = ss * a2 / 100000, x1 = w - dx1, dy1 = h * a1 / 200000, y1 = h / 2 - dy1, y2 = h / 2 + dy1, dx2 = y1 * dx1 / (h / 2);
      return [0, y1, x1 + dx2, y2];
    }
    default: return [0, 0, w, h];
  }
}

// --- conectores (alg conn) --------------------------------------------------
type P2 = [number, number];
function boxPt(n: PNode, k: string): P2 {
  const { x, y, w, h } = n;
  switch (k) {
    case 'tL': return [x, y]; case 'tR': return [x + w, y]; case 'bL': return [x, y + h]; case 'bR': return [x + w, y + h];
    case 'tCtr': return [x + w / 2, y]; case 'bCtr': return [x + w / 2, y + h];
    case 'midL': return [x, y + h / 2]; case 'midR': return [x + w, y + h / 2];
    default: return [x + w / 2, y + h / 2];
  }
}
/** Ponto em que a reta centro→alvo sai da caixa (ou elipse) do nó. */
function exitPt(n: PNode, to: P2): P2 {
  const cx = n.x + n.w / 2, cy = n.y + n.h / 2;
  const dx = to[0] - cx, dy = to[1] - cy;
  if (!dx && !dy) return [cx, cy];
  const ty = n.shape?.attrs['type'];
  if (ty === 'ellipse' || ty === 'circle') {
    const a = n.w / 2, b = n.h / 2;
    const t = 1 / Math.sqrt((dx * dx) / (a * a || 1) + (dy * dy) / (b * b || 1));
    return [cx + dx * t, cy + dy * t];
  }
  const t = Math.min(dx ? n.w / 2 / Math.abs(dx) : Infinity, dy ? n.h / 2 / Math.abs(dy) : Infinity);
  return [cx + dx * t, cy + dy * t];
}

function connEnds(n: PNode, nodes: PNode[]): [PNode, PNode] | undefined {
  const p = params(n.alg);
  const geo = (k: PNode) => k !== n && algType(k) !== 'conn' && !!k.shape?.attrs['type'] && k.shape.attrs['type'] !== 'none';
  const find = (pt: Pt | undefined, name: string | undefined): PNode | undefined => {
    if (!pt) return undefined;
    const sibs = n.parent?.kids ?? [];
    if (name) return nodes.find((k) => k.pt === pt && k.name === name) ?? sibs.find((k) => k.name === name && k.pt === pt);
    // sem nome: o irmão de mesma ponta (lin/ciclo); senão qualquer forma dessa ponta
    return sibs.find((k) => k.pt === pt && geo(k)) ?? des(sibs.find((k) => k.pt === pt) ?? n).find((k) => k.pt === pt && geo(k)) ?? nodes.find((k) => k.pt === pt && geo(k));
  };
  let src = find(n.pt.src, p['srcNode']), dst = find(n.pt.dst, p['dstNode']);
  if (!src || !dst) {
    const sibs = (n.parent?.kids ?? []).filter((k) => !isTrans(k) || k === n);
    const i = sibs.indexOf(n);
    src ??= sibs[i - 1];
    dst ??= sibs[i + 1];
  }
  return src && dst ? [src, dst] : undefined;
}

function layoutConn(n: PNode, nodes: PNode[]): void {
  const ends = connEnds(n, nodes);
  if (!ends) return;
  const [src, dst] = ends;
  const p = params(n.alg);
  const sc: P2 = [src.x + src.w / 2, src.y + src.h / 2], dc: P2 = [dst.x + dst.w / 2, dst.y + dst.h / 2];
  const bp = p['begPts'] ?? 'auto', ep = p['endPts'] ?? 'auto';
  const pick = (k: PNode, spec: string, other: P2): P2 => {
    const opts = spec.split(/\s+/).filter(Boolean);
    if (!opts.length || opts[0] === 'auto' || opts[0] === 'radial') return exitPt(k, other);
    // vários candidatos: o mais próximo do outro lado
    let best = boxPt(k, opts[0]!), bd = Infinity;
    for (const o of opts) { const q = boxPt(k, o); const d = Math.hypot(q[0] - other[0], q[1] - other[1]); if (d < bd) { bd = d; best = q; } }
    return best;
  };
  const a = pick(src, bp, dc), b = pick(dst, ep, sc);
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
  // begPad/endPad relativos à distância (connDist)
  n.v['connDist'] = dist;
  const keep = n.constrs;
  n.constrs = keep.filter((c) => !(c.type === 'connDist' && c.refType === 'none' && !c.hasVal));
  applyConstrs(n, undefined, true);
  n.constrs = keep;
  const beg = n.v['begPad'] ?? 0, end = n.v['endPad'] ?? 0;
  const len = Math.max(0, dist - beg - end);
  const ux = dist ? (b[0] - a[0]) / dist : 1, uy = dist ? (b[1] - a[1]) / dist : 0;
  const ang = Math.atan2(uy, ux) * 180 / Math.PI;
  const dim = p['dim'] ?? '2D';
  if (dim === '1D') {
    // linha (reta ou em cotovelo) como caminho livre na caixa envolvente
    const s: P2 = [a[0] + ux * beg, a[1] + uy * beg], e: P2 = [b[0] - ux * end, b[1] - uy * end];
    const pts: P2[] = [s];
    if (p['connRout'] === 'bend' && Math.abs(s[0] - e[0]) > 1 && Math.abs(s[1] - e[1]) > 1) {
      const vert = /[tb]Ctr/.test(bp);
      if (p['bendPt'] === 'end') pts.push(vert ? [s[0], e[1]] : [e[0], s[1]]);
      else if (vert) { const my = (s[1] + e[1]) / 2; pts.push([s[0], my], [e[0], my]); }
      else { const mx = (s[0] + e[0]) / 2; pts.push([mx, s[1]], [mx, e[1]]); }
    }
    pts.push(e);
    const x0 = Math.min(...pts.map((q) => q[0])), y0 = Math.min(...pts.map((q) => q[1]));
    const x1 = Math.max(...pts.map((q) => q[0])), y1 = Math.max(...pts.map((q) => q[1]));
    const W = x1 - x0, H = y1 - y0;
    const path = mk('a:path', { w: String(Math.max(1, Math.round(W))), h: String(Math.max(1, Math.round(H))) }, pts.map((q, i) => mk(i ? 'a:lnTo' : 'a:moveTo', {}, [mk('a:pt', { x: String(Math.round(q[0] - x0)), y: String(Math.round(q[1] - y0)) })])));
    n.conn = { prst: 'cust', x: x0, y: y0, w: W, h: H, rot: 0, path, line: true };
    return;
  }
  // seta 2D: comprimento = distância menos os recuos; altura = a do nó
  const hh = n.h;
  const cx = a[0] + ux * (beg + len / 2), cy = a[1] + uy * (beg + len / 2);
  const rot = ((Math.round(ang * 1e4) / 1e4) % 360 + 360) % 360;
  n.conn = { prst: 'rightArrow', x: cx - len / 2, y: cy - hh / 2, w: len, h: hh, rot, adj: [['adj1', 60000], ['adj2', 50000]] };
}

// --- saída -------------------------------------------------------------------
interface TextJob {
  tn: PNode;
  paras: TextPara[];
  /** caixa do texto (visual, no quadro) */
  box: [number, number, number, number];
  /** rotação final do texto (graus): 0 = em pé */
  rot: number;
}

const norm360 = (a: number): number => ((a % 360) + 360) % 360;
const quarter = (a: number): boolean => Math.abs((norm360(a) % 180) - 90) < 0.01;

/** Geometria visual de um nó: caixa, preset, ajustes e rotação (graus). */
function geomOf(n: PNode): { x: number; y: number; w: number; h: number; prst: string; adj: [string, number][]; rot: number } {
  const g = n.conn;
  const rot = norm360((g ? g.rot : 0) + (parseFloat(n.shape?.attrs['rot'] ?? '0') || 0) + n.rot);
  if (g) return { x: g.x, y: g.y, w: g.w, h: g.h, prst: g.prst === 'cust' ? 'rect' : g.prst, adj: g.adj ?? [], rot };
  const ty = n.shape?.attrs['type'] ?? 'rect';
  return { x: n.x, y: n.y, w: n.w, h: n.h, prst: ty === 'conn' ? 'rightArrow' : ty, adj: adjOf(n), rot };
}

/** Rotação do texto pelo autoTxRot do nó de texto: upr (em pé), grav (acompanha sem ficar de cabeça para baixo), none. */
function textRot(tn: PNode, shapeRot: number): number {
  const m = params(tn.alg)['autoTxRot'] ?? 'upr';
  if (m === 'none') return shapeRot;
  if (m === 'grav') { const r = norm360(shapeRot); return r > 90 && r <= 270 ? norm360(r - 180) : r; }
  return 0;
}

/** Retângulo de texto da geometria, girado com a forma, como caixa visual. */
function geomTextBox(n: PNode): [number, number, number, number] {
  const g = geomOf(n);
  const sw = quarter(g.rot);
  // a forma girada 90°/270° tem os lados trocados (ocupa a caixa do layout)
  const lw = sw ? g.h : g.w, lh = sw ? g.w : g.h;
  const [l, t, r, b] = textRect(g.prst, lw, lh, g.adj);
  const ox = (l + r) / 2 - lw / 2, oy = (t + b) / 2 - lh / 2;
  const th = (g.rot * Math.PI) / 180;
  const dx = ox * Math.cos(th) - oy * Math.sin(th), dy = ox * Math.sin(th) + oy * Math.cos(th);
  const tw = sw ? b - t : r - l, tht = sw ? r - l : b - t;
  const cx = g.x + g.w / 2 + dx, cy = g.y + g.h / 2 + dy;
  return [cx - tw / 2, cy - tht / 2, tw, tht];
}

function emit(nodes: PNode[], root: PNode, model: Model, style: XmlElement | undefined, colors: XmlElement | undefined, inp: DiagramLayoutInput): XmlElement {
  const qs = styleLbls(style), cs = styleLbls(colors);
  const measure = inp.measure ?? measureApprox;
  const family = inp.minorFont;
  const lineK = lineFactor(family);
  for (const n of nodes) if (algType(n) === 'conn') layoutConn(n, nodes);
  // z-order: cada forma entra na posição (tamanho atual + zOrderOff)
  const order: PNode[] = [];
  for (const n of nodes) {
    const ty = n.shape?.attrs['type'];
    if (!ty || ty === 'none') continue;
    const off = parseInt(n.shape!.attrs['zOrderOff'] ?? '0', 10) || 0;
    const at = Math.max(0, Math.min(order.length, order.length + off));
    order.splice(at, 0, n);
  }
  const hidden = (n: PNode) => n.shape!.attrs['hideGeom'] === '1' || n.shape!.attrs['hideGeom'] === 'true';
  // texto apresentado por cada nó
  const texts = new Map<PNode, { pts: Pt[]; paras: TextPara[] }>();
  for (const n of order) {
    const pts = presTexts(n, model.root);
    if (!pts.length) continue;
    const paras: TextPara[] = [];
    for (const { pt, level } of pts) {
      const ps = pt.t ? childElements(pt.t, 'a:p') : [];
      for (const p of ps.length ? ps : [mk('a:p')]) paras.push({ p, level });
    }
    texts.set(n, { pts: pts.map((x) => x.pt), paras });
  }
  // nó de texto sem geometria (hideGeom) que apresenta o mesmo ponto de uma forma:
  // o texto vai na forma (txXfrm = caixa do nó de texto) — o app grava uma forma só
  const jobs = new Map<PNode, TextJob>();
  const merged = new Set<PNode>();
  for (const n of order) {
    const t = texts.get(n);
    if (!t || !hidden(n)) continue;
    const same = (k: PNode) => k !== n && !hidden(k) && (texts.get(k)?.pts[0] === t.pts[0] || (!texts.has(k) && k.pt === t.pts[0] && algType(k) === 'conn'));
    const partner = (n.parent && order.includes(n.parent) && same(n.parent) ? n.parent : undefined)
      ?? order.find((k) => k.parent === n.parent && same(k)) ?? order.find(same);
    if (!partner) continue;
    merged.add(n);
    const pr = geomOf(partner).rot;
    if (partner.conn) jobs.set(partner, { tn: n, paras: t.paras, box: geomTextBox(partner), rot: textRot(n, pr) });
    else jobs.set(partner, { tn: n, paras: t.paras, box: [n.x, n.y, n.w, n.h], rot: textRot(n, pr) });
  }
  for (const n of order) {
    if (jobs.has(n) || merged.has(n)) continue;
    const t = texts.get(n);
    if (!t) continue;
    jobs.set(n, { tn: n, paras: t.paras, box: hidden(n) ? [n.x, n.y, n.w, n.h] : geomTextBox(n), rot: textRot(n, geomOf(n).rot) });
  }
  // tamanho de fonte: o maior que cabe (regras primFontSz/secFontSz), depois igualdade por grupo
  for (const job of jobs.values()) fitText(job, measure, family, lineK);
  const equalize = (key: 'primFontSz' | 'secFontSz', get: (n: PNode) => number | undefined, set: (n: PNode, v: number) => void) => {
    const groups = new Map<string, PNode[]>();
    for (const job of jobs.values()) { const g = job.tn.equ[key]; if (g && get(job.tn) !== undefined) (groups.get(g) ?? groups.set(g, []).get(g)!).push(job.tn); }
    for (const g of groups.values()) { const m = Math.min(...g.map((n) => get(n)!)); for (const n of g) set(n, m); }
  };
  equalize('primFontSz', (n) => n.fontPt, (n, v) => { n.fontPt = v; });
  equalize('secFontSz', (n) => n.secPt, (n, v) => { n.secPt = v; });
  for (const job of jobs.values()) {
    const n = job.tn, l = n.lte['primFontSz'];
    if (l && l[0].fontPt !== undefined && n.fontPt !== undefined) n.fontPt = Math.min(n.fontPt, Math.floor(l[0].fontPt * l[2]));
  }

  const out: XmlElement[] = [];
  for (const n of order) {
    if (merged.has(n)) continue;
    const ty = n.shape!.attrs['type']!;
    const hide = hidden(n);
    const job = jobs.get(n);
    if (hide && !job) continue;
    if (!n.conn && n.w <= 0 && n.h <= 0) continue;
    if (algType(n) === 'conn' && !n.conn) continue;
    out.push(shapeXml(n, ty, hide, job, qs, cs, inp));
  }
  return mk('dsp:spTree', {}, [mk('dsp:nvGrpSpPr', {}, [mk('dsp:cNvPr', { id: '0', name: '' }), mk('dsp:cNvGrpSpPr')]), mk('dsp:grpSpPr'), ...out]);
}

/** Margens do texto em EMU no tamanho dado (proporcionais à fonte ou absolutas). */
function margin(n: PNode, k: string, prim: number, sec: number): number {
  const f = n.margF[k];
  if (f) return f[0] * (f[1] === 'secFontSz' ? sec : prim) * EMU_PT;
  return n.v[k] ?? 0;
}

/**
 * Maior tamanho (pt inteiro) em que o texto cabe na caixa, descendo até o
 * mínimo das regras. Só texto de nível ≥ 1 (filhos): reduz o secundário; com o
 * primário, o secundário acompanha (78% ou o secFontSz fixado).
 */
function fitText(job: TextJob, measure: DiagramMeasure, family: string | undefined, lineK: number): void {
  const n = job.tn;
  const hasPrim = job.paras.some((p) => p.level === 0);
  const ruleMin = (t: string, d: number) => { const l = n.rules.filter((r) => r.type === t && Number.isFinite(r.val)).map((r) => r.val); return l.length ? Math.min(...l) : d; };
  const primMax = n.v['primFontSz'] ?? n.v['secFontSz'] ?? 65;
  const secFixed = n.v['secFontSz'];
  // caixa girada 90°: o texto (em pé) corre no lado longo da caixa visual
  const [, , bw, bh] = job.box;
  const textW = quarter(job.rot) ? bh : bw, textH = quarter(job.rot) ? bw : bh;
  const fits = (prim: number, sec: number): boolean => {
    const wA = textW - margin(n, 'lMarg', prim, sec) - margin(n, 'rMarg', prim, sec);
    const hA = textH - margin(n, 'tMarg', prim, sec) - margin(n, 'bMarg', prim, sec);
    return textHeight(job.paras, prim, sec, wA, measure, family, lineK) <= hA + 1;
  };
  if (!hasPrim) {
    const max = Math.round(secFixed ?? primMax), min = Math.round(ruleMin('secFontSz', ruleMin('primFontSz', max)));
    let s = max;
    for (; s > Math.max(1, min); s--) if (fits(s, s)) break;
    n.secPt = s; n.fontPt = n.fontPt ?? s;
    return;
  }
  const max = Math.round(primMax), min = Math.round(ruleMin('primFontSz', max));
  const secOf = (p: number) => (secFixed !== undefined ? Math.min(Math.round(secFixed), p) : Math.round(p * 0.78));
  let p = max;
  for (; p > Math.max(1, min); p--) if (fits(p, secOf(p))) break;
  n.fontPt = p;
  n.secPt = secOf(p);
  if ((globalThis as { __dgmDebug?: boolean }).__dgmDebug) console.log('fit', n.name, family, `max=${max} min=${min} -> ${p}/${n.secPt}`, job.box.map(Math.round).join(','), JSON.stringify(n.margF), n.equ['primFontSz'] ?? '', job.paras.map((q) => paraText(q.p).runs.map((r) => r.text).join('')).join('|'));
}

function adjOf(n: PNode): [string, number][] {
  const al = n.shape ? firstChild(n.shape, 'dgm:adjLst') : undefined;
  const o: [string, number][] = [];
  if (!al) return o;
  const ty = n.shape!.attrs['type'] ?? '';
  for (const a of childElements(al, 'dgm:adj')) {
    const i = parseInt(a.attrs['idx'] ?? '1', 10);
    const v = parseFloat(a.attrs['val'] ?? '0');
    if (!(i >= 1 && i <= 8) || !Number.isFinite(v)) continue;
    o[i - 1] = [adjName(ty, i), Math.round(v * 100000)];
  }
  return o.filter(Boolean);
}
const ONE_ADJ = new Set(['roundRect', 'chevron', 'homePlate', 'hexagon', 'octagon', 'plaque', 'can', 'cube', 'bevel', 'donut', 'noSmoking', 'trapezoid', 'triangle', 'parallelogram', 'snip1Rect', 'round1Rect', 'foldedCorner', 'frame', 'halfFrame', 'smileyFace', 'sun', 'moon', 'flowChartOffpageConnector', 'leftBrace', 'rightBrace', 'leftBracket', 'rightBracket', 'plus', 'pieWedge']);
function adjName(ty: string, i: number): string {
  if (ONE_ADJ.has(ty) && i === 1) return 'adj';
  return `adj${i}`;
}

function shapeXml(n: PNode, ty: string, hide: boolean, job: TextJob | undefined, qs: Map<string, XmlElement>, cs: Map<string, XmlElement>, inp: DiagramLayoutInput): XmlElement {
  const lbl = n.styleLbl ?? 'node1';
  const q = qs.get(lbl), c = cs.get(lbl);
  const idx = n.styleIdx, cnt = n.styleCnt || 1;
  const fillC = pickColor(c ? firstChild(c, 'dgm:fillClrLst') : undefined, idx, cnt, inp.resolveColor);
  const lineC = pickColor(c ? firstChild(c, 'dgm:linClrLst') : undefined, idx, cnt, inp.resolveColor);
  const effC = pickColor(c ? firstChild(c, 'dgm:effectClrLst') : undefined, idx, cnt, inp.resolveColor);
  const txC = pickColor(c ? firstChild(c, 'dgm:txFillClrLst') : undefined, idx, cnt, inp.resolveColor);
  const st = q ? firstChild(q, 'dgm:style') : undefined;
  const ref = (name: string, color: XmlElement | undefined, dIdx: string): XmlElement => {
    const r = st ? firstChild(st, name) : undefined;
    const base = r ? clone(r) : mk(name, { idx: dIdx });
    const own = base.children.find((x) => typeof x !== 'string') as XmlElement | undefined;
    base.children = [color ?? own ?? mk('a:scrgbClr', { r: '0', g: '0', b: '0' })];
    return base;
  };
  const g = geomOf(n);
  const sw = quarter(g.rot);
  // girada 90°/270°: a forma tem os lados trocados e o mesmo centro da caixa
  const w = sw ? g.h : g.w, h = sw ? g.w : g.h;
  const x = g.x + g.w / 2 - w / 2, y = g.y + g.h / 2 - h / 2;
  const xfrmAttrs: Attrs = {};
  if (g.rot) xfrmAttrs['rot'] = String(Math.round(g.rot * 60000));
  if (n.conn?.flipH) xfrmAttrs['flipH'] = '1';
  const xfrm = mk('a:xfrm', xfrmAttrs, [mk('a:off', { x: String(Math.round(x)), y: String(Math.round(y)) }), mk('a:ext', { cx: String(Math.round(w)), cy: String(Math.round(h)) })]);
  const geom = n.conn?.path
    ? mk('a:custGeom', {}, [mk('a:avLst'), mk('a:gdLst'), mk('a:ahLst'), mk('a:cxnLst'), mk('a:rect', { l: '0', t: '0', r: '0', b: '0' }), mk('a:pathLst', {}, [n.conn.path])])
    : mk('a:prstGeom', { prst: g.prst }, [mk('a:avLst', {}, g.adj.map(([nm, v]) => mk('a:gd', { name: nm, fmla: `val ${v}` })))]);
  const spPrKids: XmlElement[] = [xfrm, geom];
  if (hide) spPrKids.push(mk('a:noFill'), mk('a:ln', {}, [mk('a:noFill')]));
  else {
    if (n.conn?.line) spPrKids.push(mk('a:noFill'));
    // formatação do usuário (ponto de dados e ponto de apresentação) por cima do estilo
    for (const own of [n.pt.spPr, n.pres?.spPr]) {
      if (!own) continue;
      for (const k of kids(own)) {
        if (k.name === 'a:xfrm' || k.name === 'a:prstGeom' || k.name === 'a:custGeom') continue;
        const i = spPrKids.findIndex((e) => e.name === k.name || (/Fill$/.test(e.name) && /Fill$/.test(k.name)));
        if (i >= 2) spPrKids.splice(i, 1);
        spPrKids.push(clone(k));
      }
    }
  }
  const styleEl = mk('dsp:style', {}, [
    ref('a:lnRef', lineC, '2'), ref('a:fillRef', n.conn?.line ? undefined : fillC, '1'), ref('a:effectRef', effC, '0'),
    ref('a:fontRef', txC, 'minor'),
  ]);
  const sp: (XmlElement | string)[] = [
    mk('dsp:nvSpPr', {}, [mk('dsp:cNvPr', { id: '0', name: '' }), mk('dsp:cNvSpPr')]),
    mk('dsp:spPr', {}, spPrKids),
    styleEl,
  ];
  if (job) sp.push(...textXml(job, g.rot));
  return mk('dsp:sp', { modelId: n.pres?.id ?? `{dgm-${n.uid}}` }, sp);
}

/** Recuo dos marcadores: múltiplos de 4,5 pt conforme o tamanho (medido), até 22,5 pt. */
const bulletMarL = (szPt: number): number => Math.min(5, Math.max(1, Math.floor((szPt * 0.85) / 4.5))) * 57150;

function textXml(job: TextJob, shapeRot: number): XmlElement[] {
  const n = job.tn, paras = job.paras;
  const sz = n.fontPt ?? 65;
  const sec = n.secPt ?? Math.round(sz * 0.78);
  const m = (k: string) => String(Math.round(margin(n, k, sz, sec)));
  const p = params(n.alg);
  const hasCh = paras.some((tp) => tp.level > 0);
  const anchor = (hasCh ? p['txAnchorVertCh'] : undefined) ?? p['txAnchorVert'] ?? 'mid';
  const bodyPr = mk('a:bodyPr', {
    spcFirstLastPara: '0', vert: 'horz', wrap: 'square', lIns: m('lMarg'), tIns: m('tMarg'), rIns: m('rMarg'), bIns: m('bMarg'),
    numCol: '1', spcCol: '1270', anchor: anchor === 't' ? 't' : anchor === 'b' ? 'b' : 'ctr', anchorCtr: '0',
  }, [mk('a:noAutofit')]);
  const parAlgn = p['parTxLTRAlign'] ?? (hasCh ? 'l' : 'ctr');
  const chAlgn = p['shpTxLTRAlignCh'] ?? 'l';
  const bullets = varOf(n, 'bulletEnabled') === '1' || varOf(n, 'bulletEnabled') === 'true';
  const stBullet = parseInt(p['stBulletLvl'] ?? '1', 10) || 1;
  const ps = paras.map(({ p: src, level }) => {
    const size = level === 0 ? sz : sec;
    const lvl = Math.min(8, level);
    const bu = bullets && level >= stBullet;
    const ind = bu ? bulletMarL(size) : 0;
    const pPr = mk('a:pPr', {
      marL: String(ind * Math.max(1, level - stBullet + 1) * (bu ? 1 : 0)), lvl: String(lvl), indent: String(-ind),
      algn: level ? (chAlgn === 'r' ? 'r' : chAlgn === 'ctr' ? 'ctr' : 'l') : (parAlgn === 'l' ? 'l' : parAlgn === 'r' ? 'r' : 'ctr'),
      defTabSz: String(Math.round(size * 3.5 * EMU_PT)),
    }, [
      mk('a:lnSpc', {}, [mk('a:spcPct', { val: '90000' })]),
      mk('a:spcBef', {}, [mk('a:spcPct', { val: '0' })]),
      mk('a:spcAft', {}, [mk('a:spcPct', { val: level ? '15000' : '35000' })]),
      bu ? mk('a:buChar', { char: '•' }) : mk('a:buNone'),
    ]);
    const runs: XmlElement[] = [];
    let endRPr: XmlElement | undefined;
    for (const r of kids(src)) {
      if (r.name === 'a:r' || r.name === 'a:fld') {
        const rr = clone(r);
        const rPr = firstChild(rr, 'a:rPr');
        const attrs: Attrs = { lang: 'en-US', ...(rPr?.attrs ?? {}), sz: String(Math.round(size * 100)), kern: rPr?.attrs['kern'] ?? '1200' };
        const nr = mk('a:rPr', attrs, rPr ? rPr.children : []);
        rr.children = rr.children.filter((k) => typeof k === 'string' || k.name !== 'a:rPr');
        rr.children.unshift(nr);
        runs.push(rr);
      } else if (r.name === 'a:br') runs.push(clone(r));
      else if (r.name === 'a:endParaRPr') endRPr = r;
    }
    const end = mk('a:endParaRPr', { lang: 'en-US', ...(endRPr?.attrs ?? {}), sz: String(Math.round(size * 100)), kern: '1200' });
    return mk('a:p', {}, [pPr, ...runs, end]);
  });
  const [bx, by, bw, bh] = job.box;
  // o leitor soma a rotação da forma à do txXfrm: grava a diferença
  const rel = norm360(job.rot - shapeRot);
  const qr = quarter(job.rot);
  // texto girado 90°: a caixa gravada tem os lados trocados (gira em volta do centro)
  const tw = qr ? bh : bw, th = qr ? bw : bh;
  const tx = bx + bw / 2 - tw / 2, ty = by + bh / 2 - th / 2;
  return [
    mk('dsp:txBody', {}, [bodyPr, mk('a:lstStyle'), ...ps]),
    mk('dsp:txXfrm', rel ? { rot: String(Math.round((rel > 180 ? rel - 360 : rel) * 60000)) } : {}, [mk('a:off', { x: String(Math.round(tx)), y: String(Math.round(ty)) }), mk('a:ext', { cx: String(Math.round(tw)), cy: String(Math.round(th)) })]),
  ];
}

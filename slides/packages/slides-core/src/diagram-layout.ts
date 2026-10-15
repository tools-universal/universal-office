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
import { presetGuides } from './preset-engine.js';
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
    // "não normal"/"não assistente" são NÓS (sem transições): orgChart itera ch nonAsst
    // e cria um ramo por item — com transições sairiam conectores duplicados
    case 'nonNorm': return p.type === 'asst';
    case 'asst': return p.type === 'asst';
    case 'nonAsst': return p.type === 'node';
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
  /** restrição que impôs cada valor de desV (o lin do pai encolhe os referidos a tamanho) */
  desC?: Record<string, Constr>;
  /** dono da restrição de cada valor de desV */
  desO?: Record<string, PNode>;
  /** nó de referência de cada valor de desV */
  desR?: Record<string, PNode>;
  /** lin: escala vigente no eixo principal (os valores impostos de cima, abaixo dele, acompanham) */
  ls?: { axis: 'w' | 'h'; s: number; all: boolean };
  /** valores decididos pelas REGRAS (fonte reduzida, altura crescida): vencem as restrições */
  ov: Record<string, number>;
  /** tipos com valor imposto por ancestral nesta avaliação */
  fromParent?: Set<string>;
  /** tetos (op="lte") numéricos por tipo */
  hi?: Record<string, number>;
  /** tamanho crescido pelo conteúdo (o lin do pai mede e as restrições dos irmãos o veem) */
  gw?: Record<string, number>;
  /** tamanho reduzido pela regra do lin pai (rule w for="ch" forName val=0 do hProcess3) */
  shr?: Record<string, number>;
  /** tamanho dado pelo pai antes de encolher ao conteúdo (o layout interno usa este) */
  cw?: { w: number; h: number };
  /** tipo ligado a outro do próprio nó por igualdade: [tipo de referência, fator] */
  link?: Record<string, [string, number]>;
  /** filhos já posicionados pelo algoritmo do pai (pirâmide): não refaz o composto */
  preplaced?: boolean;
  /** ajustes da geometria decididos pelo algoritmo (inclinação do trapézio da pirâmide) */
  adjOv?: [string, number][];
  /** fonte máxima da restrição, antes das regras (as passadas de regra partem dela) */
  fmax0?: number;
  /** tetos de fonte vindos de ancestrais (for="des") */
  desLte?: Record<string, [PNode, string, number]>;
  /** ciclo: centro/raio do círculo (absolutos) e sentido */
  cyc?: { cx: number; cy: number; r: number; cw: boolean };
  /** parágrafos do texto (cache) */
  paras?: TextPara[];
  /** margens proporcionais à fonte (fração de primFontSz/secFontSz) */
  margF: Record<string, [number, string, PNode?]>;
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
      styleIdx: 0, styleCnt: 0, v: {}, desV: {}, ov: {}, margF: {}, equ: {}, lte: {}, x: 0, y: 0, w: 0, h: 0, rot: 0,
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
  return base.filter((k) => (!name || k.name === name) && (!ptType || ptMatch(k.pt, ptType) || presPtMatch(k, ptType)));
}
/**
 * Nó criado fora de forEach (contexto = documento) que apresenta um ponto pelo
 * presOf vale como esse ponto no filtro ptType (child1Text/quadrant1 do cycle4:
 * primFontSz for="des" ptType="node" op="equ" os iguala; medido no oráculo).
 */
function presPtMatch(k: PNode, ptType: string): boolean {
  if (!k.presOf || !FIT || k.pt.type !== 'doc') return false;
  const p = presTexts(k, FIT.root)[0]?.pt;
  return !!p && ptMatch(p, ptType);
}

/** Valor de um tipo no nó (derivados de posição a partir de l/t/w/h). */
/**
 * Um eixo (x: l/r/ctrX/w, y: t/b/ctrY/h, com os deslocamentos *Off): dois
 * valores quaisquer determinam o resto. `dflt` = tamanho quando nada o define.
 */
function axis(v: Record<string, number>, x: boolean, dflt?: number): { s?: number; z?: number } {
  const [lo, hi, ctr, sz] = x ? ['l', 'r', 'ctrX', 'w'] : ['t', 'b', 'ctrY', 'h'];
  const off = (k: string) => v[k + 'Off'] ?? 0;
  const L = v[lo] !== undefined ? v[lo]! + off(lo) : undefined;
  const R = v[hi] !== undefined ? v[hi]! + off(hi) : undefined;
  const C = v[ctr] !== undefined ? v[ctr]! + off(ctr) : undefined;
  let Z = v[sz] !== undefined ? v[sz]! + off(sz) : undefined;
  if (Z === undefined) {
    if (L !== undefined && R !== undefined) Z = R - L;
    else if (L !== undefined && C !== undefined) Z = 2 * (C - L);
    else if (R !== undefined && C !== undefined) Z = 2 * (R - C);
    else if (dflt !== undefined) Z = dflt + off(sz);
  }
  const S = L ?? (C !== undefined && Z !== undefined ? C - Z / 2 : R !== undefined && Z !== undefined ? R - Z : undefined);
  return { s: S, z: Z };
}

function getVal(n: PNode, t: string): number | undefined {
  const v = n.v;
  if (v[t] !== undefined && !t.endsWith('Off')) {
    if (t !== 'l' && t !== 'r' && t !== 't' && t !== 'b' && t !== 'ctrX' && t !== 'ctrY') return v[t];
  }
  switch (t) {
    case 'l': case 'r': case 'ctrX': case 'w': {
      const a = axis(v, true);
      if (a.s === undefined) return t === 'w' ? a.z : v[t];
      return t === 'l' ? a.s : t === 'r' ? (a.z !== undefined ? a.s + a.z : v[t]) : t === 'ctrX' ? (a.z !== undefined ? a.s + a.z / 2 : v[t]) : a.z;
    }
    case 't': case 'b': case 'ctrY': case 'h': {
      const a = axis(v, false);
      if (a.s === undefined) return t === 'h' ? a.z : v[t];
      return t === 't' ? a.s : t === 'b' ? (a.z !== undefined ? a.s + a.z : v[t]) : t === 'ctrY' ? (a.z !== undefined ? a.s + a.z / 2 : v[t]) : a.z;
    }
    default: return v[t];
  }
}

/**
 * Avalia as restrições de `owner` (na ordem). `scale(c, target, ref)` devolve o
 * fator aplicado a valores derivados do PRÓPRIO tamanho do dono (o algoritmo
 * encolhe o eixo principal assim; dependentes acompanham pela referência).
 */
/**
 * Par lte+gte para o MESMO alvo/tipo vindo do pai = faixa usada pelas regras,
 * não um valor (list1: o h do negativeSpace segue o −0,41 × fonte). Lado único
 * (hList1: h ≤ 0,4 w; hierarchy4: w ≥ linha dos filhos) vale como limite.
 */
function rangePair(owner: PNode, c: Constr): boolean {
  if (c.for === 'self' || (c.op !== 'lte' && c.op !== 'gte') || FONT.has(c.type)) return false;
  const other = c.op === 'lte' ? 'gte' : 'lte';
  return owner.constrs.some((d) => d !== c && d.op === other && d.type === c.type && d.for === c.for && d.forName === c.forName && d.ptType === c.ptType);
}

/**
 * Grupo de igualdade do valor: op="equ" e também a FONTE dada por um ancestral a
 * todos os nós de um nome (primFontSz for="des" forName="txThree" val="65"): o app
 * iguala a fonte deles (medido no hierarchy4 e no AlternatingHexagons).
 */
function markEqu(t: PNode, c: Constr, owner: PNode): void {
  const key = `${owner.uid}:${c.type}:${c.forName ?? ''}:${c.ptType ?? ''}`;
  if (c.op === 'equ') t.equ[c.type] = key;
  else if (FONT.has(c.type) && c.for !== 'self' && c.forName && c.refType === 'none' && c.hasVal) t.equ[c.type] ??= key;
}

function applyConstrs(owner: PNode, scale?: (c: Constr, ref: PNode) => number, onlySelf = false): void {
  for (const c of owner.constrs) {
    if (onlySelf && c.for !== 'self') continue;
    if (rangePair(owner, c)) continue;
    const targets = select(owner, c.for, c.forName, c.ptType);
    for (const t of targets) {
      // margem proporcional à fonte: resolvida depois do ajuste do texto
      if (MARG.has(c.type) && FONT.has(c.refType)) {
        // referida à fonte de OUTRO nó (tMarg do childText = 1,64 × fonte do parentText
        // no list1): vale a variável dele, não o tamanho personalizado do texto (custT)
        const r = c.refFor && c.refFor !== 'self' ? refNode(owner, c, t) : undefined;
        t.margF[c.type] = [Number.isFinite(c.fact) ? c.fact : 1, c.refType, r && r !== t ? r : undefined];
        continue;
      }
      // valor decidido pelas regras (fonte reduzida, altura crescida) vence a restrição
      if (t.ov[c.type] !== undefined || t.gw?.[c.type] !== undefined || t.shr?.[c.type] !== undefined) { markEqu(t, c, owner); continue; }
      let value: number | undefined;
      let ref: PNode | undefined;
      if (c.refType !== 'none') {
        ref = refNode(owner, c, t);
        let rv = ref ? getVal(ref, c.refType) : undefined;
        // referência a um nó que não existe (sibSpaceOne com um só topo no hierarchy4):
        // vale o que a restrição do dono daria a ele (medido: o vão dos filhos aparece)
        if (rv === undefined && !ref && c.refForName) { rv = virtualVal(owner, c); if (rv !== undefined) ref = owner; }
        if (rv === undefined) continue;
        value = rv * (Number.isFinite(c.fact) ? c.fact : 1);
        // comprimento referido a um tamanho de fonte: o número vale em mm (hList1: h = 1,22 × fonte)
        // MARGENS valem em pontos: referidas a um comprimento, o número em mm vira pt (list1:
        // lMarg = 0,075 × w → 21,17 "mm" = 21,17 pt)
        if (MARG.has(c.type) && LEN.has(c.refType) && !MARG.has(c.refType)) value *= EMU_PT / EMU_MM;
        else if (LEN.has(c.type) && FONT.has(c.refType)) value *= EMU_MM;
        else if (FONT.has(c.type) && LEN.has(c.refType)) value /= EMU_MM;
        if (c.op === 'lte' || c.op === 'gte') {
          if (c.op === 'lte' && ref) {
            t.lte[c.type] = [ref, c.refType, Number.isFinite(c.fact) ? c.fact : 1];
            // teto vindo de ancestral (for="des") sobrevive à reavaliação do pai do alvo
            if (c.for === 'des') (t.desLte ??= {})[c.type] = t.lte[c.type]!;
          }
          // teto numérico (limita também o crescimento pelas regras)
          if (c.op === 'lte' && Number.isFinite(value)) (t.hi ??= {})[c.type] = Math.min(t.hi[c.type] ?? Infinity, value);
          const cur = t.v[c.type];
          if (cur !== undefined && Number.isFinite(value)) {
            const nv = c.op === 'lte' ? Math.min(cur, value) : Math.max(cur, value);
            t.v[c.type] = nv;
            // h "equ" w do próprio nó (círculo do vList3): o teto vale para os dois
            const lk = t.link?.[c.type];
            if (lk && nv !== cur && lk[1]) t.v[lk[0]] = nv / lk[1];
          } else if (cur === undefined && c.op === 'gte') t.v[c.type] = value;
          continue;
        }
      } else if (c.hasVal) {
        value = MARG.has(c.type) ? c.val * EMU_PT : LEN.has(c.type) ? c.val * EMU_MM : c.val;
      } else if (c.op !== 'none') {
        if (c.op === 'equ') t.equ[c.type] = `${owner.uid}:${c.type}:${c.forName ?? ''}:${c.ptType ?? ''}`;
        continue;
      } else value = 0;
      if (value === undefined || Number.isNaN(value)) continue;
      // restrição do próprio nó não sobrepõe valor imposto por um ancestral (hList1: o
      // "h" vazio do parTx/desTx não zera a altura dada pela raiz)
      if (t === owner && c.op === 'none' && t.fromParent?.has(c.type)) continue;
      if (t !== owner) (t.fromParent ??= new Set()).add(c.type);
      if (scale && t !== owner) {
        if (ref === owner && (c.refType === 'w' || c.refType === 'h')) value *= scale(c, owner);
        else if (c.refType === 'none' && LEN.has(c.type)) value *= scale(c, owner);
      }
      markEqu(t, c, owner);
      t.v[c.type] = value;
      if (c.for === 'des') {
        t.desV[c.type] = value; (t.desC ??= {})[c.type] = c; (t.desO ??= {})[c.type] = owner;
        if (ref) (t.desR ??= {})[c.type] = ref; else if (t.desR) delete t.desR[c.type];
      }
      // valor ligado a outro do MESMO nó com igualdade (h = w): tetos mantêm a proporção
      if (c.op === 'equ' && ref === t && LEN.has(c.refType)) (t.link ??= {})[c.type] = [c.refType, Number.isFinite(c.fact) ? c.fact : 1];
    }
  }
}
/** Valor que a restrição do dono daria ao nó `refForName` ausente (só restrições diretas do dono). */
function virtualVal(owner: PNode, c: Constr): number | undefined {
  const d = owner.constrs.find((x) => x.forName === c.refForName && x.type === c.refType && x.op !== 'lte' && x.op !== 'gte' && x !== c);
  if (!d) return undefined;
  if (d.refType === 'none') return d.hasVal ? (LEN.has(d.type) ? d.val * EMU_MM : d.val) : undefined;
  if (d.refFor && d.refFor !== 'self') return undefined;
  const v = getVal(owner, d.refType);
  return v === undefined ? undefined : v * (Number.isFinite(d.fact) ? d.fact : 1);
}
function refNode(owner: PNode, c: Constr, target: PNode): PNode | undefined {
  if (c.refFor === 'self') return owner;
  const cands = select(owner, c.refFor, c.refForName, c.refPtType);
  if (cands.includes(target)) return target;
  return cands[0];
}

const X_KEYS = new Set(['w', 'l', 'r', 'ctrX', 'lOff', 'rOff', 'ctrXOff', 'wOff']);
const Y_KEYS = new Set(['h', 't', 'b', 'ctrY', 'tOff', 'bOff', 'ctrYOff', 'hOff']);
/** Eixo de um valor: o do tipo (w, l, ctrY…) ou, sem eixo próprio (sp, userH…), o da referência. */
const axisOf = (key: string, ref: string): 'w' | 'h' => (X_KEYS.has(key) ? 'w' : Y_KEYS.has(key) ? 'h' : ref === 'w' ? 'w' : 'h');

/** Restrições do dono + as "self" de cada filho (tamanho ideal dos filhos). */
function evalKids(n: PNode, scale?: (c: Constr, ref: PNode) => number): void {
  // valores impostos de cima (for="des" de ancestrais) continuam valendo
  for (const k of n.kids) {
    k.v = { ...k.desV, ...k.ov, ...k.shr, ...k.gw }; k.lte = { ...k.desLte }; k.hi = undefined; k.link = undefined; k.fromParent = new Set(Object.keys(k.desV));
    // tamanho imposto por ancestral (h do childNode = h do compChildNode no lProcess2)
    // encolhe com os lin entre o dono da restrição e o nó, no eixo do valor (medido:
    // 3 filhos de 0,65 h → × 0,3022; hierarchy4: h dos txTwo e o parTrans seguem a
    // escala vertical do vertOne, as larguras a horizontal da raiz)
    if (k.desC) {
      for (const [key, c] of Object.entries(k.desC)) {
        if (!(LEN.has(key) || key.startsWith('user')) || MARG.has(key)) continue;
        if (k.ov[key] !== undefined || k.gw?.[key] !== undefined || k.shr?.[key] !== undefined || k.desV[key] === undefined) continue;
        if (c.refType !== 'w' && c.refType !== 'h') continue;
        const ax = axisOf(key, c.refType);
        const O = k.desO?.[key], R = k.desR?.[key];
        // só se o valor vem do tamanho do dono ou de um nó que um lin do mesmo eixo
        // encolhe (userH do hierarchy4 → o txOne, num vertOne; o userT do hProcess3,
        // referido ao "dummy" fora de qualquer lin, não encolhe)
        let scaledRef = R === O;
        for (let p: PNode | undefined = R?.parent, d = 0; !scaledRef && p && p !== O && d < MAX_DEPTH; p = p.parent, d++) if (p.ls && (p.ls.all || p.ls.axis === ax)) scaledRef = true;
        let f = 1;
        if (scaledRef) for (let q: PNode | undefined = n, d = 0; q && q !== O && d < MAX_DEPTH; q = q.parent, d++) if (q.ls && (q.ls.all || q.ls.axis === ax)) f *= q.ls.s;
        if (f !== 1) k.v[key] = k.desV[key]! * f;
      }
    }
  }
  applyConstrs(n, scale);
  for (const k of n.kids) applyConstrs(k, undefined, true);
  // segunda passada: referências do pai a valores que o filho ajustou (teto h ≤ 0,4 w do
  // parTx → t do desTx no hList1) — o app resolve as restrições como um grafo
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
  const w = axis(k.v, true, n.w).z ?? n.w, h = axis(k.v, false, n.h).z ?? n.h;
  const sx = custScale(k, 'X'), sy = custScale(k, 'Y');
  // espaçador pode ter tamanho NEGATIVO (setas encaixadas: w = −0,1 × nó)
  return { w: w * sx, h: h * sy };
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
    const ax = axis(k.v, true, n.w), ay = axis(k.v, false, n.h);
    const w0 = ax.z ?? n.w, h0 = ay.z ?? n.h;
    const sx = custScale(k, 'X'), sy = custScale(k, 'Y');
    const w = w0 * sx, h = h0 * sy;
    // escala do usuário em volta do centro da caixa calculada
    const x = (ax.s ?? 0) + (w0 - w) / 2, y = (ay.s ?? 0) + (h0 - h) / 2;
    place(k, x, y, w, h);
  }
}

/** Tamanho natural (caixa envolvente dos filhos) de um contêiner posto numa caixa w×h. */
function naturalSize(k: PNode, w: number, h: number, along?: 'w' | 'h'): { w: number; h: number } {
  const keep = { x: k.x, y: k.y, w: k.w, h: k.h, v: k.v };
  const t = algType(k);
  k.x = 0; k.y = 0; k.w = w; k.h = h; k.v = { ...k.v, w, h };
  // lin perpendicular ao eixo que o pai mede: a escala própria dele só mexe no eixo
  // dele, que ele mesmo encaixa na caixa — mede-se sem a busca (lin aninhado em 7
  // níveis do hierarchy4 custava segundos) e esse eixo vale no máximo o dado
  const km = t === 'lin' ? linMain(k) : undefined;
  const flat = !!along && !!km && km !== along;
  // medindo: o eixo secundário que transborda NÃO é cortado — o pai precisa ver a
  // largura real (vertOne do hierarchy4 com a fileira de filhos mais larga)
  if (t === 'lin') algLin(k, true, flat); else if (t === 'snake') algSnake(k); else algComposite(k);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of k.kids) {
    if (c.rw === undefined || c.rh === undefined || !Number.isFinite(c.rw) || !Number.isFinite(c.rh)) continue;
    x0 = Math.min(x0, c.rx ?? 0); y0 = Math.min(y0, c.ry ?? 0);
    x1 = Math.max(x1, (c.rx ?? 0) + c.rw); y1 = Math.max(y1, (c.ry ?? 0) + c.rh);
  }
  Object.assign(k, keep);
  if (x0 === Infinity) return { w: 0, h: 0 };
  const out = { w: x1 - x0, h: y1 - y0 };
  // (o que cresce no próprio eixo — horzOne com w INF — não se encaixa: vale o conteúdo)
  const grows = k.rules.some((r) => r.for === 'self' && !r.forName && r.type === km && r.val === Infinity);
  if (flat && !grows && km === 'w' && Number.isFinite(w)) out.w = Math.min(out.w, w);
  if (flat && !grows && km === 'h' && Number.isFinite(h)) out.h = Math.min(out.h, h);
  return out;
}
const linMain = (n: PNode): 'w' | 'h' => { const d = params(n.alg)['linDir'] ?? 'fromL'; return d === 'fromL' || d === 'fromR' ? 'w' : 'h'; };

/** Extensão do conteúdo de um composto posto numa caixa w×h (só conteúdo ancorado na origem). */
function contentExtent(k: PNode, w: number, h: number): { w: number; h: number } {
  // proporção fixa (ar): o composto já se ajusta e centraliza sozinho
  if (params(k.alg)['ar'] !== undefined) return { w, h };
  const keep = { x: k.x, y: k.y, w: k.w, h: k.h, v: k.v };
  k.x = 0; k.y = 0; k.w = w; k.h = h; k.v = { ...k.v, w, h };
  algComposite(k);
  let x1 = 0, y1 = 0, x0 = Infinity, y0 = Infinity;
  for (const c of k.kids) {
    if (c.rw === undefined || c.rh === undefined) continue;
    x0 = Math.min(x0, c.rx ?? 0); y0 = Math.min(y0, c.ry ?? 0);
    x1 = Math.max(x1, (c.rx ?? 0) + c.rw); y1 = Math.max(y1, (c.ry ?? 0) + c.rh);
  }
  Object.assign(k, keep);
  if (x0 === Infinity) return { w, h };
  // conteúdo que não começa na origem (centralizado etc.) não encolhe
  return { w: x0 > 1 ? w : x1, h: y0 > 1 ? h : y1 };
}

function place(k: PNode, x: number, y: number, w: number, h: number): void {
  k.rx = x; k.ry = y; k.rw = w; k.rh = h;
}

/** Busca binária do maior fator (0, 1] que faz `fits(s)` valer. */
/**
 * Maior escala (0, 1] que cabe — bissecção de 12 passos como o app (o resultado
 * é múltiplo de 1/4096, medido em process1/chevron1/default). Orçamento global
 * de passos: lin aninhado não explode (entrada hostil).
 */
let SCALE_BUDGET = 0;
/** contadores para diagnóstico (refazimentos de lin / do layout todo) */
const STATS = { runs: 0, full: 0 };
export const __dgmStats = STATS;
function bestScale(fits: (s: number) => boolean, len?: (s: number) => number, L?: number): number {
  if (fits(1)) return 1;
  if (--SCALE_BUDGET < 0) return 1e-6;
  // atalho: extensão linear na escala (o caso comum) — estima pelo par s = 1 e 1/2 e
  // confere que é o mesmo múltiplo de 1/4096 da bissecção; lin aninhado (hierarchy4,
  // 4 níveis) cairia de 13⁴ para ~5⁴ refazimentos
  if (len && L !== undefined && Number.isFinite(L)) {
    const l1 = len(1), lh = len(0.5);
    const a = (l1 - lh) * 2, b = l1 - a;
    if (a > 0 && Number.isFinite(a) && Number.isFinite(b)) {
      const q = Math.floor(Math.min(1, Math.max(0, (L - b) / a)) * 4096) / 4096;
      if (q > 0 && q < 1 && fits(q) && !fits(q + 1 / 4096)) return q;
    }
  }
  let lo = 0, hi = 1;
  for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
  return lo || 1e-6;
}

function algLin(n: PNode, measuring = false, noScale = false): void {
  const p = params(n.alg);
  const dir = p['linDir'] ?? 'fromL';
  const horiz = dir === 'fromL' || dir === 'fromR';
  const rev = dir === 'fromR' || dir === 'fromB';
  const W = n.w, H = n.h;
  const main = horiz ? 'w' : 'h';
  // fromR/fromB: mesma ordem, posição espelhada
  const order = n.kids;
  let sizes: { w: number; h: number; full?: { w: number; h: number }; grow?: { w: number; h: number } }[] = [];
  let mode: 'main' | 'all' = 'main';
  // escala só valores derivados do tamanho do DONO (comprimentos absolutos e os
  // referidos à fonte não encolhem — aí quem resolve é a regra de fonte)
  let starts: number[] = [];
  const secDim = horiz ? 'h' : 'w';
  const sizeOf = (k: PNode): { w: number; h: number; full?: { w: number; h: number }; grow?: { w: number; h: number } } => {
    const z = kidSize(k, n);
    // espaçador sem tamanho (referência a um nó que não existe): não ocupa nada
    if (algType(k) === 'sp' && !k.shape?.attrs['type']) {
      return { w: getVal(k, 'w') === undefined ? 0 : z.w, h: getVal(k, 'h') === undefined ? 0 : z.h };
    }
    // tamanho infinito (h="INF" do list1): o natural do conteúdo
    if (!Number.isFinite(z.w) || !Number.isFinite(z.h)) {
      const nat = naturalSize(k, Number.isFinite(z.w) ? z.w : W, Number.isFinite(z.h) ? z.h : H, main);
      return { w: Number.isFinite(z.w) ? z.w : nat.w, h: Number.isFinite(z.h) ? z.h : nat.h };
    }
    const t = algType(k);
    if (t === 'lin' || t === 'snake') {
      // lin/snake filho: o conteúdo manda — sem tamanho no eixo secundário vale o
      // natural (vertFlow do hList9); transbordando a caixa, cresce (hierarchy4)
      const nat = naturalSize(k, z.w, z.h, main);
      // sem restrição num eixo: o natural (vazio = 0, não o tamanho do pai);
      // com restrição: cresce se o conteúdo transborda
      const fw = getVal(k, 'w') === undefined, fh = getVal(k, 'h') === undefined;
      const w = fw ? nat.w : Math.max(z.w, nat.w), h = fh ? nat.h : Math.max(z.h, nat.h);
      // no PRÓPRIO eixo o lin filho fica do tamanho do conteúdo, com o layout interno
      // na caixa dada (linNode do vList5 só com o parentText: entre linhas cheias
      // encosta à esquerda pelo nodeHorzAlign do pai; medido)
      if (t === 'lin') {
        const km = linMain(k);
        if (km === 'w' && !fw && nat.w > 0 && nat.w < z.w - 1 && nat.h <= z.h + 1) return { w: nat.w, h, full: { w: z.w, h: z.h } };
        if (km === 'h' && !fh && nat.h > 0 && nat.h < z.h - 1 && nat.w <= z.w + 1) return { w, h: nat.h, full: { w: z.w, h: z.h } };
      }
      // (lin refeito na caixa do conteúdo cabe nela: sem "tamanho original")
      const grow = (!fw && nat.w > z.w + 1) || (!fh && nat.h > z.h + 1) ? { w, h } : undefined;
      return { w, h, ...(grow ? { grow } : {}) };
    }
    // composto: no eixo secundário vale o conteúdo (process3 tem h = 1000 × w)
    if (t === 'composite') {
      const c = contentExtent(k, z.w, z.h);
      if (horiz && c.h > 0 && c.h < z.h - 1) return { w: z.w, h: c.h, full: z };
      if (!horiz && c.w > 0 && c.w < z.w - 1) return { w: c.w, h: z.h, full: z };
    }
    return z;
  };
  // refazer com os MESMOS parâmetros da última vez não muda nada: devolve o resultado
  // (fits(1) repetido pela regra de encolher, pela busca e pela passada final — em lin
  // aninhado em 7 níveis cada repetição multiplica o custo)
  let lastKey = '', lastRes: { len: number; sec: number; lo: number } | undefined;
  const run = (s: number): { len: number; sec: number; lo: number } => {
    const key = `${s}|${mode}|${order.map((k) => k.shr?.[main] ?? '').join(',')}`;
    if (lastRes && key === lastKey) return lastRes;
    lastRes = runNow(s);
    lastKey = key;
    return lastRes;
  };
  const runNow = (s: number): { len: number; sec: number; lo: number } => {
    STATS.runs++;
    for (const k of order) k.gw = undefined;
    n.ls = { axis: main, s, all: mode === 'all' };
    // o valor encolhe se for do eixo principal (o h do parTransOne do hierarchy4,
    // referido à largura da raiz, segue só a escala vertical)
    // — inclusive comprimento absoluto no eixo (sp do chevron2: h = −14,88 mm × escala),
    // mas não o de igualdade (space do chevron1: w = −6 mm equ fica −6 mm; medidos)
    const scale = (c: Constr) => ((c.refType === 'w' || c.refType === 'h') && (mode === 'all' || axisOf(c.type, c.refType) === main)) ||
      (mode === 'main' && c.refType === 'none' && c.op !== 'equ' && LEN.has(c.type) && !MARG.has(c.type) && axisOf(c.type, 'none') === main && (X_KEYS.has(c.type) || Y_KEYS.has(c.type))) ? s : 1;
    evalKids(n, scale);
    sizes = order.map(sizeOf);
    // filho que cresceu: as restrições dos irmãos que o referem (w ≥ linha dos
    // filhos no hierarchy4) veem o tamanho crescido
    // (medindo, a caixa envolvente já inclui o filho crescido: a 2ª passada só serve
    // para pôr os irmãos que o referem — dobrava o custo a cada nível aninhado)
    if (!measuring && sizes.some((z) => z.grow)) {
      order.forEach((k, i) => { const g = sizes[i]!.grow; if (g) k.gw = { w: g.w, h: g.h }; });
      evalKids(n, scale);
      sizes = order.map(sizeOf);
    }
    // posições em sequência (espaçador negativo volta o cursor); a extensão é a
    // caixa envolvente dos filhos — é ela que precisa caber (hList9)
    const sp = n.v['sp'] ?? 0;
    let cur = 0, lo = Infinity, hi = -Infinity, sec = 0;
    starts = sizes.map((z, i) => {
      if (i) cur += sp;
      const a = cur, d = horiz ? z.w : z.h;
      cur += d;
      lo = Math.min(lo, a, a + d); hi = Math.max(hi, a, a + d);
      sec = Math.max(sec, horiz ? z.h : z.w);
      return a;
    });
    if (lo === Infinity) { lo = 0; hi = 0; }
    return { len: hi - lo, sec, lo };
  };
  // só o eixo PRINCIPAL decide a escala; o secundário que transborda é cortado no
  // espaço disponível (process1 num quadro baixo: largura igual, altura = a do quadro)
  const availS = horiz ? H : W;
  const lim = (horiz ? W : H) * 1.0001;
  const fits = (s: number): boolean => run(s).len <= lim;
  const lenAt = (s: number): number => run(s).len;
  // regra de crescer no eixo principal (horzOne do hierarchy4: w INF): não encolhe, cresce
  const growPrim = n.rules.some((r) => r.for === 'self' && !r.forName && r.type === main && r.val === Infinity);
  // regra de ENCOLHER filhos no eixo principal (rule w for="ch" forName="linV" val="0"
  // do hProcess3): o app reduz só esses filhos até caber, sem escalar o resto (a seta
  // de fundo fica com a largura toda; medido)
  for (const k of order) k.shr = undefined;
  if (!growPrim && !noScale && !fits(1)) {
    for (const r of n.rules) {
      if (r.for !== 'ch' || !r.forName || r.type !== main || !Number.isFinite(r.val)) continue;
      const tg = order.filter((k) => k.name === r.forName);
      if (!tg.length) continue;
      const cur = Math.max(...tg.map((k) => (horiz ? sizes[order.indexOf(k)]?.w : sizes[order.indexOf(k)]?.h) ?? 0));
      const lo = Math.max(0, r.val * EMU_MM);
      if (!(cur > lo)) continue;
      const set = (x: number) => { for (const k of tg) k.shr = { [main]: x }; };
      set(lo);
      if (!fits(1)) continue; // nem no mínimo: fica no mínimo e a escala resolve o resto
      let a = lo, b = cur;
      // 12 passos como a escala (o resultado é múltiplo de 1/4096 da faixa)
      for (let i = 0; i < 12; i++) { const m = (a + b) / 2; set(m); if (fits(1)) a = m; else b = m; }
      set(a);
      break;
    }
  }
  let s = growPrim || noScale ? 1 : bestScale(fits, lenAt, lim);
  if (s <= 1e-5) { mode = 'all'; s = bestScale(fits, lenAt, lim); }
  if ((globalThis as { __dgmLin?: boolean }).__dgmLin && !measuring) console.log('lin', n.name, main, 'lim', Math.round(lim), 's', s, mode, 'len1', Math.round(lenAt(1)), 'budget', SCALE_BUDGET);
  // nem encolhendo cabe (tamanhos absolutos): fica como está e transborda
  if (s <= 1e-5) { mode = 'main'; s = 1; }
  let { len, sec, lo } = run(s);
  if (!measuring && Number.isFinite(availS) && sec > availS * 1.0001) {
    // a escala do usuário (custScale) fica fora do corte: o tamanho dado é que é cortado
    sizes = sizes.map((z, i) => {
      const cs = custScale(order[i]!, horiz ? 'Y' : 'X');
      return horiz ? (z.h / cs > availS ? { ...z, h: availS * cs } : z) : (z.w / cs > availS ? { ...z, w: availS * cs } : z);
    });
    sec = Math.max(availS, ...sizes.map((z) => (horiz ? z.h : z.w)));
  }
  // a caixa encolhida ao conteúdo mantém o layout interno relativo ao tamanho dado
  order.forEach((k, i) => { k.cw = sizes[i]!.full; });
  const hAl = p['nodeHorzAlign'] ?? 'ctr', vAl = p['nodeVertAlign'] ?? 'mid';
  // alinhamento do conjunto (horzAlign/vertAlign do lin) nos dois eixos; o do
  // nó (nodeVertAlign/nodeHorzAlign) dentro da faixa do conjunto
  const grp = horiz ? p['horzAlign'] : p['vertAlign'];
  const room = Number.isFinite(horiz ? W : H) ? (horiz ? W : H) - len : 0;
  const base = (grp === 'l' || grp === 't' ? 0 : grp === 'r' || grp === 'b' ? room : room / 2) - lo;
  const sg = horiz ? p['vertAlign'] : p['horzAlign'];
  const secRoom = Number.isFinite(horiz ? H : W) ? (horiz ? H : W) - sec : 0;
  const band = sg === 't' || sg === 'l' ? 0 : sg === 'b' || sg === 'r' ? secRoom : secRoom / 2;
  order.forEach((k, i) => {
    const z = sizes[i]!;
    const pos = base + starts[i]!;
    if (horiz) {
      const y = band + (vAl === 't' ? 0 : vAl === 'b' ? sec - z.h : (sec - z.h) / 2);
      place(k, rev ? W - pos - z.w : pos, y, z.w, z.h);
    } else {
      const x = band + (hAl === 'l' ? 0 : hAl === 'r' ? sec - z.w : (sec - z.w) / 2);
      place(k, x, rev ? H - pos - z.h : pos, z.w, z.h);
    }
  });
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
  // no fluxo, o vão entre itens é o espaçador da transição (sibTrans w = 0,08 × nó do
  // bList2); entre linhas, o sp (0,16 × nó) — medidos
  const trans = n.kids.find((k) => isTrans(k) && algType(k) === 'sp');
  const gapOf = (sp: number): number => { if (!trans) return sp; const z = kidSize(trans, n); const g = flowCol ? z.h : z.w; return Number.isFinite(g) && g > 0 && getVal(trans, flowCol ? 'h' : 'w') !== undefined ? g : sp; };
  const igap = gapOf(isp);
  let best = { c: N, s: 0 };
  const fixed = p['bkpt'] === 'fixed' ? parseInt(p['bkPtFixedVal'] ?? '', 10) : NaN;
  for (let c = 1; c <= N; c++) {
    if (Number.isFinite(fixed) && fixed > 0 && c !== Math.min(N, fixed)) continue;
    const r = Math.ceil(N / c);
    const cols = flowCol ? r : c, rows = flowCol ? c : r;
    const tw = cols * iw + (cols - 1) * (flowCol ? isp : igap), th = rows * ih + (rows - 1) * (flowCol ? igap : isp);
    const s = Math.min(tw > 0 ? W / tw : Infinity, th > 0 ? H / th : Infinity);
    // empate na escala: mais itens por linha (bList2 com 5: 4 + 1, medido)
    if (s >= best.s * 0.999999) best = { c, s };
  }
  const s = Math.min(1, best.s);
  evalKids(n, () => s);
  const sizes = items.map((k) => kidSize(k, n));
  const w = Math.max(...sizes.map((z) => z.w)), h = Math.max(...sizes.map((z) => z.h));
  const sp = n.v['sp'] ?? 0, gap = gapOf(sp);
  const per = best.c, lines = Math.ceil(N / per);
  const cols = flowCol ? lines : per, rows = flowCol ? per : lines;
  const tw = cols * w + (cols - 1) * (flowCol ? sp : gap), th = rows * h + (rows - 1) * (flowCol ? gap : sp);
  const ox = (W - tw) / 2, oy = (H - th) / 2;
  const fromR = grDir === 'tR' || grDir === 'bR', fromB = grDir === 'bL' || grDir === 'bR';
  items.forEach((k, i) => {
    const line = Math.floor(i / per);
    let at = i % per;
    const inLine = Math.min(per, N - line * per);
    if (revDir && line % 2 === 1) at = per - 1 - at;
    // linha incompleta centralizada (off="ctr")
    const shift = p['off'] === 'off' ? 0 : ((per - inLine) * ((flowCol ? h : w) + gap)) / 2;
    let cx: number, cy: number;
    if (!flowCol) {
      cx = at * (w + gap) + (revDir && line % 2 === 1 ? -shift : shift);
      cy = line * (h + sp);
    } else {
      cy = at * (h + gap) + (revDir && line % 2 === 1 ? -shift : shift);
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

/**
 * Ciclo: nós num círculo a partir de stAng (0 = 12 h, sentido horário), passo
 * spanAng/n; raio tal que nós vizinhos fiquem a sibSp (na corda) e o central
 * (ctrShpMap="fNode") a sp do anel. O conjunto ideal escala para caber.
 */
function algCycle(n: PNode): void {
  const p = params(n.alg);
  const st = parseFloat(p['stAng'] ?? '0') || 0, span = parseFloat(p['spanAng'] ?? '360') || 360;
  const ctrMap = p['ctrShpMap'] === 'fNode';
  const along = p['rotPath'] === 'alongPath';
  evalKids(n);
  const items = n.kids.filter((k) => !isTransOrConn(k));
  if (!items.length) return;
  const center = ctrMap ? items[0] : undefined;
  const ring = ctrMap ? items.slice(1) : items;
  const sz = new Map(items.map((k) => [k, kidSize(k, n)]));
  const N = ring.length;
  const sib = n.v['sibSp'] ?? 0, sp = n.v['sp'] ?? 0;
  const full = Math.abs(span) >= 359.999;
  const step = N > 0 ? (full ? span / N : N > 1 ? span / (N - 1) : 0) : 0;
  // raio: vizinhos no anel a sibSp na corda (largura média do par + sibSp; medido em
  // cycle2/cycle7); com nó central, o anel fica a sp dele
  let r = 0;
  if (N > 1) {
    const half = Math.min(Math.PI / 2, (Math.abs(step) * Math.PI) / 360);
    let need = 0;
    for (let i = 0; i < N; i++) {
      if (!full && i === N - 1) break;
      const a = sz.get(ring[i]!)!, b = sz.get(ring[(i + 1) % N]!)!;
      need = Math.max(need, (a.w + b.w) / 2 + sib);
    }
    r = need / (2 * Math.sin(half || Math.PI / 2));
  }
  const d = Math.max(0, ...ring.map((k) => sz.get(k)!.w));
  if (center && N) { const c = sz.get(center)!; r = Math.max(r, Math.max(c.w, c.h) / 2 + sp + d / 2); }
  const boxes: { k: PNode; x: number; y: number; w: number; h: number; rot: number }[] = [];
  if (center) { const c = sz.get(center)!; boxes.push({ k: center, x: -c.w / 2, y: -c.h / 2, w: c.w, h: c.h, rot: 0 }); }
  ring.forEach((k, i) => {
    const z = sz.get(k)!;
    const a = ((st + i * step) * Math.PI) / 180;
    const cx = r * Math.sin(a), cy = -r * Math.cos(a);
    boxes.push({ k, x: cx - z.w / 2, y: cy - z.h / 2, w: z.w, h: z.h, rot: along ? st + i * step : 0 });
  });
  const x0 = Math.min(...boxes.map((b) => b.x)), y0 = Math.min(...boxes.map((b) => b.y));
  const bw = Math.max(...boxes.map((b) => b.x + b.w)) - x0, bh = Math.max(...boxes.map((b) => b.y + b.h)) - y0;
  const s = quantScale(Math.min(bw > 0 ? n.w / bw : Infinity, bh > 0 ? n.h / bh : Infinity));
  const ox = (n.w - bw * s) / 2, oy = (n.h - bh * s) / 2;
  // círculo do ciclo (conectores em arco o seguem)
  n.cyc = { cx: n.x + ox - x0 * s, cy: n.y + oy - y0 * s, r: r * s, cw: span >= 0 };
  for (const b of boxes) {
    place(b.k, ox + (b.x - x0) * s, oy + (b.y - y0) * s, b.w * s, b.h * s);
    b.k.rot = b.rot;
  }
  // conectores e valores ideais de comprimento acompanham a escala do conjunto
  for (const k of n.kids) {
    if (!isTransOrConn(k)) continue;
    const z = kidSize(k, n);
    place(k, 0, 0, z.w * s, z.h * s);
    k.desV = Object.fromEntries(Object.entries(k.desV).map(([key, v]) => [key, LEN.has(key) ? v * s : v]));
  }
  n.v['sibSp'] = sib * s; n.v['sp'] = sp * s;
}

/**
 * Pirâmide (pyra): N níveis de altura H/N; o nível i tem largura (i+1)/N da base
 * (fromB: o 1º em cima), trapézio com a inclinação que encaixa os vizinhos; o
 * texto do nível ocupa a largura do nível (o de cima inteiro, os demais pelas
 * restrições do composto). Com "contas" (filhos), a pirâmide fica com
 * (1 − pyraAcctRatio) da largura e o fundo da conta vai do eixo da pirâmide à
 * borda (trapézio girado 180°), o texto da conta da quina do nível à borda.
 */
function algPyra(n: PNode): void {
  const p = params(n.alg);
  evalKids(n);
  const comps = n.kids.filter((k) => !isTransOrConn(k));
  const N = comps.length;
  if (!N) return;
  const lvlName = p['pyraLvlNode'] ?? 'level', bgName = p['pyraAcctBkgdNode'], txName = p['pyraAcctTxNode'];
  const hasAcct = comps.some((c) => c.kids.some((k) => k.name === bgName && nodeParas(k).length));
  const ratio = hasAcct ? Math.min(0.9, Math.max(0, n.v['pyraAcctRatio'] ?? 0)) : 0;
  const W = n.w, H = n.h, pyrW = W * (1 - ratio), lh = H / N, half = pyrW / (2 * N);
  const aft = (p['pyraAcctPos'] ?? 'aft') !== 'bef';
  const inv = p['linDir'] === 'fromT';
  const x0 = hasAcct && !aft ? W - pyrW : 0;
  comps.forEach((c, i) => {
    const step = inv ? N - i : i + 1;
    const wi = (pyrW * step) / N, xi = x0 + (pyrW - wi) / 2;
    place(c, 0, i * lh, W, lh);
    c.preplaced = true;
    c.v = { ...c.v, w: W, h: lh };
    // filhos do nível: posições ditadas pelo algoritmo (as restrições do composto são simbólicas)
    const lvl = c.kids.find((k) => k.name === lvlName);
    if (lvl) {
      place(lvl, xi, 0, wi, lh);
      lvl.adjOv = [['adj', Math.round((half / Math.max(1, Math.min(wi, lh))) * 100000)]];
      if (inv) lvl.rot = 180;
      lvl.v = { ...lvl.v, l: xi, t: 0, w: wi, h: lh };
    }
    for (const k of c.kids) {
      if (k === lvl) continue;
      if (k.name === bgName) {
        // da quina de cima do nível (lado da conta) até a borda
        const l = aft ? xi + wi - half : 0, w = aft ? W - l : xi + half;
        place(k, l, 0, w, lh);
        k.adjOv = [['adj1', 0], ['adj2', Math.round((half / Math.max(1, Math.min(w, lh))) * 100000)]];
        k.rot = aft !== inv ? 180 : 0;
      } else if (k.name === txName) {
        const l = aft ? xi + wi : 0, w = aft ? W - l : xi;
        place(k, l, 0, w, lh);
      } else if (lvl) {
        // texto do nível: pelas restrições do composto relativas ao nível (w = 0,65 × nível…)
        evalKids(c);
        lvl.v = { ...lvl.v, l: xi, t: 0, w: wi, h: lh };
        evalKidsOnly(c, k);
        const ax = axis(k.v, true, wi), ay = axis(k.v, false, lh);
        const w = ax.z ?? wi, h = ay.z ?? lh;
        place(k, ax.s ?? xi + (wi - w) / 2, ay.s ?? 0, w, h);
      }
    }
  });
}
/** Reavalia só as restrições do composto que miram `target` (o resto já está posto). */
function evalKidsOnly(c: PNode, target: PNode): void {
  target.v = { ...target.desV, ...target.ov };
  for (const k of c.constrs) {
    if (k.for !== 'ch' || (k.forName && k.forName !== target.name)) continue;
    const one: PNode = { ...c, constrs: [k] };
    applyConstrs(one);
  }
}

/** O app acha a escala por bissecção de 12 passos: múltiplo de 1/4096 que cabe. */
function quantScale(s: number): number {
  if (!Number.isFinite(s) || s <= 0) return 1;
  if (s >= 1) return s;
  return Math.max(1 / 4096, Math.floor(s * 4096) / 4096);
}

// ---------------------------------------------------------------------------
// laço principal
// ---------------------------------------------------------------------------
function layoutNode(n: PNode, depth: number): void {
  if (depth > MAX_DEPTH) return;
  // composto encolhido ao conteúdo: o layout interno usa o tamanho original
  const box = n.cw ? { w: n.w, h: n.h } : undefined;
  if (n.cw) { n.w = n.cw.w; n.h = n.cw.h; }
  n.v['w'] = n.w; n.v['h'] = n.h;
  try { layoutNodeAlg(n, depth); } finally { if (box) { n.w = box.w; n.h = box.h; } }
}

function layoutNodeAlg(n: PNode, depth: number): void {
  switch (n.preplaced ? 'pre' : algType(n)) {
    case 'pre': break;
    case 'lin': {
      algLin(n);
      // lin encolhido ao conteúdo (caixa interna = a dada): o conteúdo começa na caixa
      if (n.cw) {
        const km = linMain(n);
        const ks = n.kids.filter((k) => k.rw !== undefined && k.rh !== undefined && (k.rw > 0 || k.rh > 0));
        if (ks.length) {
          const m = Math.min(...ks.map((k) => (km === 'w' ? k.rx ?? 0 : k.ry ?? 0)));
          if (Number.isFinite(m) && m > 0) for (const k of n.kids) { if (km === 'w') k.rx = (k.rx ?? 0) - m; else k.ry = (k.ry ?? 0) - m; }
        }
      }
      break;
    }
    case 'snake': algSnake(n); break;
    case 'hierChild': case 'hierRoot': layoutHier(n, depth); return;
    case 'cycle': algCycle(n); break;
    case 'pyra': algPyra(n); break;
    default: algComposite(n); break;
  }
  for (const k of n.kids) {
    k.x = n.x + (k.rx ?? 0); k.y = n.y + (k.ry ?? 0); k.w = k.rw ?? n.w; k.h = k.rh ?? n.h;
    custShift(k, n);
    layoutNode(k, depth + 1);
  }
}

/** Quadro do diagrama (o deslocamento do usuário não tira a forma dele). */
let FRAME: { w: number; h: number } | undefined;
function custFact(k: PNode, name: string): number {
  const s = k.pres?.prSet?.attrs[name];
  const v = s !== undefined ? parseInt(s, 10) / 100000 : 0;
  return Number.isFinite(v) && Math.abs(v) < 1000 ? v : 0;
}
/**
 * Deslocamento do usuário (custLinFactNeighborX/Y): no lin, fração do tamanho do
 * VIZINHO (o irmão anterior; o primeiro usa o seguinte) no eixo — medido: childText
 * do list1 × |h do negativeSpace|, childNode do lProcess2 × h do aSpace2; no
 * composto, do próprio nó (aNode do lProcess2, img do vList4). A forma não sai do
 * quadro por isso (o aNode de altura total não desce).
 */
function custShift(k: PNode, n: PNode): void {
  const fx = custFact(k, 'custLinFactNeighborX'), fy = custFact(k, 'custLinFactNeighborY');
  if (!fx && !fy) return;
  const i = n.kids.indexOf(k);
  // no composto vale o tamanho do PRÓPRIO nó (img do vList4 quase não anda)
  const t = algType(n);
  const nb = t === 'lin' || t === 'snake' ? n.kids[i - 1] ?? n.kids[i + 1] : k;
  if (!nb) return;
  const clampD = (p: number, s: number, d: number, L: number | undefined): number => {
    if (!d || L === undefined) return d;
    const t = Math.min(Math.max(p + d, Math.min(p, 0)), Math.max(p, L - s));
    return t - p;
  };
  // vizinho sem tamanho no eixo (espaçador do hProcess9 sem h): vale o do pai
  const dim = (key: 'w' | 'h'): number => {
    const r = Math.abs((key === 'w' ? nb.rw : nb.rh) ?? 0);
    return r > 0 || getVal(nb, key) !== undefined ? r : key === 'w' ? n.w : n.h;
  };
  if (fx) k.x += clampD(k.x, k.w, fx * dim('w'), FRAME?.w);
  if (fy) k.y += clampD(k.y, k.h, fy * dim('h'), FRAME?.h);
}

// ---------------------------------------------------------------------------
// hierarquia (hierRoot / hierChild): arranjo em unidades ideais, de baixo para
// cima, depois escala uniforme para caber no nó e centraliza
// ---------------------------------------------------------------------------
interface Box {
  n: PNode; x: number; y: number; w: number; h: number;
  /** caixa do composto (sem a escala do usuário) dentro da caixa arranjada */
  inner?: { dx: number; dy: number; w: number; h: number };
}
/**
 * Caixa de um nó da hierarquia com a escala do usuário (custScaleX/Y) dos filhos
 * do composto: o app arranja a caixa ESCALADA (gdx-073128: espaçamento igual entre
 * caixas de larguras diferentes, topos alinhados) — a envolvente dos filhos.
 */
function hierBox(n: PNode, z: { w: number; h: number }): Box {
  const box: Box = { n, x: 0, y: 0, w: z.w, h: z.h };
  if (algType(n) !== 'composite' || n.preplaced || !n.kids.some((c) => custScale(c, 'X') !== 1 || custScale(c, 'Y') !== 1)) return box;
  const keep = { x: n.x, y: n.y, w: n.w, h: n.h, v: n.v };
  n.x = 0; n.y = 0; n.w = z.w; n.h = z.h; n.v = { ...n.v, w: z.w, h: z.h };
  let x0 = 0, y0 = 0, x1 = z.w, y1 = z.h;
  try {
    algComposite(n);
    for (const c of n.kids) {
      if (c.rw === undefined || c.rh === undefined || !Number.isFinite(c.rw) || !Number.isFinite(c.rh) || c.rw <= 0 || c.rh <= 0) continue;
      x0 = Math.min(x0, c.rx ?? 0); y0 = Math.min(y0, c.ry ?? 0);
      x1 = Math.max(x1, (c.rx ?? 0) + c.rw); y1 = Math.max(y1, (c.ry ?? 0) + c.rh);
    }
  } finally { Object.assign(n, keep); }
  if (x0 > -1 && y0 > -1 && x1 < z.w + 1 && y1 < z.h + 1) return box;
  return { n, x: 0, y: 0, w: x1 - x0, h: y1 - y0, inner: { dx: -x0, dy: -y0, w: z.w, h: z.h } };
}
interface Arr {
  boxes: Box[];
  /** caixa da raiz do ramo (âncora para centralizar o pai e ligar conectores) */
  anchor?: Box;
  /** âncoras dos filhos (primeira e última) no eixo principal do hierChild */
  span?: [number, number];
}
const isHier = (n: PNode) => { const t = algType(n); return t === 'hierChild' || t === 'hierRoot'; };
function bbox(bs: Box[]): { x: number; y: number; w: number; h: number } {
  if (!bs.length) return { x: 0, y: 0, w: 0, h: 0 };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const b of bs) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
const shift = (a: Arr, dx: number, dy: number): void => {
  for (const b of a.boxes) { b.x += dx; b.y += dy; }
  if (a.span) { /* o span é relativo ao eixo principal de quem o criou; o chamador ajusta */ }
};

function arrange(n: PNode, depth: number, parent?: PNode): Arr {
  if (depth > MAX_DEPTH) return { boxes: [] };
  const t = algType(n);
  if (t === 'hierRoot') return arrangeRoot(n, depth);
  if (t === 'hierChild') return arrangeChild(n, depth);
  const z = parent ? kidSize(n, parent) : { w: n.w, h: n.h };
  const box = hierBox(n, z);
  return { boxes: [box], anchor: box };
}

/** Raiz + filhos: hierAlign diz de que lado fica a raiz e como alinha (tCtrCH = em cima, centrada nos filhos). */
function arrangeRoot(hr: PNode, depth: number): Arr {
  evalKids(hr);
  const p = params(hr.alg);
  const align = (p['hierAlign'] ?? 'tCtrCH').toLowerCase();
  const sp = hr.v['sp'] ?? 0;
  const off = hr.v['alignOff'] ?? 0;
  const rootK = hr.kids.find((k) => !isHier(k) && algType(k) !== 'conn');
  const chKs = hr.kids.filter((k) => algType(k) === 'hierChild');
  const boxes: Box[] = [];
  let anchor: Box | undefined;
  if (rootK) {
    const z = kidSize(rootK, hr);
    rootK.w = z.w; rootK.h = z.h;
    anchor = hierBox(rootK, z);
    boxes.push(anchor);
  }
  // demais nós que não são hierárquicos (conectores ficam para depois)
  const blocks = chKs.map((k) => arrange(k, depth + 1, hr)).filter((a) => a.boxes.length);
  // assistentes (hierChild cujos filhos são assistentes) vêm antes, colados à raiz
  blocks.sort((a, b) => Number(!isAsstBlock(a)) - Number(!isAsstBlock(b)));
  const side = align[0] ?? 't';
  const vert = side === 't' || side === 'b';
  const rw = anchor?.w ?? 0, rh = anchor?.h ?? 0;
  let cursor = (vert ? rh : rw) + sp;
  for (const a of blocks) {
    const bb = bbox(a.boxes);
    // eixo principal (afastamento da raiz)
    if (vert) shift(a, 0, cursor - bb.y); else shift(a, cursor - bb.x, 0);
    cursor += (vert ? bb.h : bb.w) + sp;
    // eixo secundário: alinhamento da raiz em relação ao bloco
    const span = a.span ?? (a.anchor ? (vert ? [a.anchor.x + a.anchor.w / 2, a.anchor.x + a.anchor.w / 2] : [a.anchor.y + a.anchor.h / 2, a.anchor.y + a.anchor.h / 2]) as [number, number] : undefined);
    const nb = bbox(a.boxes);
    const mode = align.slice(1);
    if (vert) {
      if (mode === 'l') shift(a, off * rw - nb.x, 0);
      else if (mode === 'r') shift(a, rw - off * rw - (nb.x + nb.w), 0);
      else if (span) shift(a, rw / 2 - (span[0] + span[1]) / 2, 0);
      else shift(a, rw / 2 - (nb.x + nb.w / 2), 0);
    } else {
      if (mode === 't') shift(a, 0, off * rh - nb.y);
      else if (mode === 'b') shift(a, 0, rh - off * rh - (nb.y + nb.h));
      else if (span) shift(a, 0, rh / 2 - (span[0] + span[1]) / 2);
      else shift(a, 0, rh / 2 - (nb.y + nb.h / 2));
    }
    boxes.push(...a.boxes);
  }
  // raiz embaixo / à direita: espelha o eixo principal
  if (side === 'b' || side === 'r') {
    const bb = bbox(boxes);
    for (const b of boxes) {
      if (side === 'b') b.y = bb.y + bb.h - (b.y - bb.y) - b.h;
      else b.x = bb.x + bb.w - (b.x - bb.x) - b.w;
    }
  }
  return { boxes, anchor };
}
const isAsstBlock = (a: Arr): boolean => a.boxes.length > 0 && a.boxes.every((b) => b.n.pt.type === 'asst' || isTransOrConn(b.n)) && a.boxes.some((b) => b.n.pt.type === 'asst');
const isTransOrConn = (n: PNode) => isTrans(n) || algType(n) === 'conn';

/** Filhos em linha (linDir) com sibSp entre ramos — empacotados pelo contorno (sem sobrepor caixas). */
function arrangeChild(hc: PNode, depth: number): Arr {
  evalKids(hc);
  const p = params(hc.alg);
  const dir = p['linDir'] ?? 'fromL';
  const horiz = dir === 'fromL' || dir === 'fromR';
  const rev = dir === 'fromR' || dir === 'fromB';
  const chAlign = p['chAlign'] ?? (horiz ? 't' : 'l');
  const sib = hc.v['sibSp'] ?? 0, sec = hc.v['secSibSp'] ?? sib;
  const two = !!p['secLinDir'];
  const subs = hc.kids.filter((k) => !isTransOrConn(k)).map((k) => arrange(k, depth + 1, hc)).filter((a) => a.boxes.length);
  const placed: Box[] = [];
  const anchors: Box[] = [];
  // em 2D (assistentes, "hang"): duas colunas, linhas de cima para baixo
  const perRow = two ? 2 : subs.length || 1;
  let rowStart = 0;
  for (let r = 0; r * perRow < subs.length; r++) {
    const row = subs.slice(r * perRow, (r + 1) * perRow);
    const rowBoxes: Box[] = [];
    row.forEach((a, i) => {
      const bb = bbox(a.boxes);
      // alinhamento perpendicular
      if (horiz) shift(a, 0, (chAlign === 'b' ? -(bb.y + bb.h) : chAlign === 'ctr' || chAlign === 'mid' ? -(bb.y + bb.h / 2) : -bb.y) + rowStart);
      else shift(a, (chAlign === 'r' ? -(bb.x + bb.w) : chAlign === 'ctr' ? -(bb.x + bb.w / 2) : -bb.x) + rowStart, 0);
      const nb = bbox(a.boxes);
      if (!i) { if (horiz) shift(a, -nb.x, 0); else shift(a, 0, -nb.y); }
      else {
        // menor deslocamento que mantém sibSp de toda caixa já posta que se sobrepõe no outro eixo
        let d = -Infinity;
        for (const q of rowBoxes) for (const b of a.boxes) {
          const ov = horiz ? Math.min(q.y + q.h, b.y + b.h) - Math.max(q.y, b.y) : Math.min(q.x + q.w, b.x + b.w) - Math.max(q.x, b.x);
          if (ov <= 0) continue;
          d = Math.max(d, horiz ? q.x + q.w + sib - b.x : q.y + q.h + sib - b.y);
        }
        if (d === -Infinity) { const pb = bbox(rowBoxes); d = horiz ? pb.x + pb.w + sib - nb.x : pb.y + pb.h + sib - nb.y; }
        if (horiz) shift(a, d, 0); else shift(a, 0, d);
      }
      rowBoxes.push(...a.boxes);
      if (a.anchor) anchors.push(a.anchor);
    });
    placed.push(...rowBoxes);
    const rb = bbox(rowBoxes);
    rowStart = (horiz ? rb.y + rb.h : rb.x + rb.w) + sec;
  }
  if (rev) {
    const bb = bbox(placed);
    for (const b of placed) { if (horiz) b.x = bb.x + bb.w - (b.x - bb.x) - b.w; else b.y = bb.y + bb.h - (b.y - bb.y) - b.h; }
  }
  const out: Arr = { boxes: placed };
  if (anchors.length) {
    const c = anchors.map((b) => (horiz ? b.x + b.w / 2 : b.y + b.h / 2));
    out.span = [Math.min(...c), Math.max(...c)];
  }
  return out;
}

/** Topo de uma hierarquia: arranja tudo em unidades ideais, escala para caber, centraliza e posiciona. */
function layoutHier(top: PNode, depth: number): void {
  const a = arrange(top, depth);
  if (!a.boxes.length) return;
  const bb = bbox(a.boxes);
  const s = Math.min(bb.w > 0 ? top.w / bb.w : Infinity, bb.h > 0 ? top.h / bb.h : Infinity);
  const k = Number.isFinite(s) && s > 0 ? s : 1;
  const ox = top.x + (top.w - bb.w * k) / 2, oy = top.y + (top.h - bb.h * k) / 2;
  // valores ideais de comprimento (sp, bendDist…) acompanham a escala
  for (const n of des(top)) for (const key of Object.keys(n.v)) if (LEN.has(key) && key !== 'w' && key !== 'h' && !MARG.has(key)) n.v[key] = n.v[key]! * k;
  for (const b of a.boxes) {
    const n = b.n;
    n.x = ox + (b.x - bb.x) * k; n.y = oy + (b.y - bb.y) * k; n.w = b.w * k; n.h = b.h * k;
    // composto com filho escalado pelo usuário: o layout interno usa a caixa original
    // (o filho escalado em volta do centro dela cobre a caixa arranjada)
    if (b.inner) { n.x += b.inner.dx * k; n.y += b.inner.dy * k; n.w = b.inner.w * k; n.h = b.inner.h * k; }
    layoutNode(n, depth + 1);
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

const ALGS = new Set(['composite', 'lin', 'snake', 'tx', 'sp', 'conn', 'hierRoot', 'hierChild', 'cycle', 'pyra']);
function supported(layout: XmlElement, depth = 0): boolean {
  if (depth > 200) return false;
  for (const c of kids(layout)) {
    if (c.name.endsWith(':alg') && !ALGS.has(c.attrs['type'] ?? '')) return false;
    if (!supported(c, depth + 1)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// regras (ruleLst): com o texto que não cabe, o app aplica as regras NA ORDEM —
// reduz a fonte até o limite, cresce a altura/largura até o fator/limite… — e
// refaz o layout com os valores decididos (que vencem as restrições)
// ---------------------------------------------------------------------------
interface FitCtx { measure: DiagramMeasure; family?: string; lineK: number; root: Pt }
let FIT: FitCtx | undefined;

function nodeParas(n: PNode): TextPara[] {
  if (n.paras) return n.paras;
  const out: TextPara[] = [];
  if (FIT) for (const { pt, level } of presTexts(n, FIT.root)) {
    const ps = pt.t ? childElements(pt.t, 'a:p') : [];
    // texto personalizado (custT): o tamanho gravado nos trechos vale e não encolhe
    const cust = pt.prSet?.attrs['custT'] === '1' || pt.prSet?.attrs['custT'] === 'true';
    for (const p of ps.length ? ps : [mk('a:p')]) {
      let csz: number | undefined;
      if (cust) for (const r of kids(p)) {
        const rp = r.name === 'a:r' || r.name === 'a:fld' ? firstChild(r, 'a:rPr') : r.name === 'a:endParaRPr' ? r : undefined;
        const v = parseInt(rp?.attrs['sz'] ?? '', 10);
        if (v > 0) csz = Math.max(csz ?? 0, v / 100);
      }
      out.push(csz ? { p, level, csz } : { p, level });
    }
  }
  n.paras = out;
  return out;
}
/** Todo o texto do nó tem tamanho personalizado (não há o que encolher). */
const allCustom = (paras: TextPara[]) => paras.length > 0 && paras.every((p) => p.csz !== undefined);
const hasTextAlg = (n: PNode) => algType(n) === 'tx' && !!n.presOf;

/** O texto do nó cabe na caixa w×h (geometria, margens, quebra por palavras) com as fontes dadas? */
function boxFits(n: PNode, w: number, h: number, prim: number, sec: number): boolean {
  const paras = nodeParas(n);
  if (!paras.length || !FIT) return true;
  const ty = n.shape?.attrs['type'] ?? 'rect';
  const hide = n.shape?.attrs['hideGeom'] === '1' || n.shape?.attrs['hideGeom'] === 'true' || ty === 'none';
  const sw = quarter(parseFloat(n.shape?.attrs['rot'] ?? '0') || 0);
  const lw = sw ? h : w, lh = sw ? w : h;
  const [l, t, r, b] = hide ? [0, 0, lw, lh] : textRect(ty === 'conn' ? 'rightArrow' : ty, lw, lh, adjOf(n));
  const tw = sw ? b - t : r - l, th = sw ? r - l : b - t;
  const [mp, ms] = margFonts(paras, prim, sec);
  const wA = tw - margin(n, 'lMarg', mp, ms) - margin(n, 'rMarg', mp, ms);
  const hA = th - margin(n, 'tMarg', mp, ms) - margin(n, 'bMarg', mp, ms);
  return textHeight(paras, prim, sec, wA, FIT.measure, FIT.family, FIT.lineK) <= hA + 1;
}
/** Fontes das margens: o tamanho personalizado (custT) do 1º parágrafo de cada nível, senão o calculado. */
function margFonts(paras: TextPara[], prim: number, sec: number): [number, number] {
  const p0 = paras.find((p) => p.level === 0), p1 = paras.find((p) => p.level > 0);
  return [p0?.csz ?? (p0 ? prim : p1?.csz ?? prim), p1?.csz ?? sec];
}

/**
 * Regras que valem para o nó: as próprias (self) e as de ancestrais que o
 * alcançam (ch/des), de dentro para fora. `group`: a regra de um ancestral vale
 * para todos os alvos JUNTOS (a fonte desce igual em todos os parTx do hList1).
 */
function rulesFor(n: PNode): { rules: Rule[]; group?: string } {
  const rules = n.rules.filter((r) => r.for === 'self' && !r.forName);
  let group: string | undefined;
  for (let q = n.parent, d = 1; q; q = q.parent, d++) {
    for (const r of q.rules) {
      if (r.for === 'self' || (r.for === 'ch' && d > 1)) continue;
      if (r.forName && r.forName !== n.name) continue;
      if (r.ptType && !ptMatch(n.pt, r.ptType)) continue;
      rules.push(r);
      if (!group && FONT.has(r.type)) group = `r${q.uid}:${r.type}:${r.forName ?? ''}:${r.ptType ?? ''}`;
    }
  }
  return { rules, group };
}

const hasFontRule = (rs: Rule[]): boolean => rs.some((r) => FONT.has(r.type));
/** Até onde uma regra de crescer (h/w) deixa ir a partir de `cur`. */
function growLimit(r: Rule | undefined, cur: number, hi: number | undefined): number {
  if (!r) return cur;
  let L = Number.isFinite(r.fact) ? cur * r.fact : r.val === Infinity ? Infinity : Number.isFinite(r.val) ? Math.max(cur, r.val * EMU_MM) : Infinity;
  if (Number.isFinite(r.max)) L = Math.min(L, r.max * EMU_MM);
  if (hi !== undefined) L = Math.min(L, hi); // crescer não passa do teto lte (h ≤ 0,4 w)
  return Math.max(cur, L);
}
/** Menor caixa (até os limites das regras de crescer) em que o texto de m cabe; undefined = não cabe. */
function needBox(m: PNode, f: number, sec: number, gH?: Rule, gW?: Rule): { w: number; h: number } | undefined {
  const b = { w: m.w, h: m.h };
  if (boxFits(m, b.w, b.h, f, sec)) return b;
  const W = growLimit(gW, b.w, m.hi?.['w']), H = growLimit(gH, b.h, m.hi?.['h']);
  if (W <= b.w + 1 && H <= b.h + 1) return undefined;
  const capW = Number.isFinite(W) ? W : b.w * 20, capH = Number.isFinite(H) ? H : b.h * 50 + EMU_PT * 400;
  if (!boxFits(m, capW, capH, f, sec)) return undefined;
  let w = b.w, h = b.h;
  if (capW > b.w + 1) { let lo = b.w, hi = capW; for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (boxFits(m, mid, capH, f, sec)) hi = mid; else lo = mid; } w = hi; }
  if (capH > b.h + 1) { let lo = b.h, hi = capH; for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (boxFits(m, w, mid, f, sec)) hi = mid; else lo = mid; } h = hi; }
  return { w, h };
}

/**
 * Aplica as regras aos nós de texto (por grupo de fonte igual). Devolve true se
 * algum valor mudou (o layout precisa ser refeito com os `ov` novos).
 */
function runTextRules(nodes: PNode[], run: () => void, frameW: number, frameH: number): void {
  const groups = new Map<string, PNode[]>();
  for (const n of nodes) {
    if (!hasTextAlg(n) || !nodeParas(n).length || !(n.w > 0) || !(n.h > 0)) continue;
    if (!nodeParas(n).some((p) => paraText(p.p).runs.some((r) => r.text.trim()))) continue;
    const g = n.equ['primFontSz'] ?? n.equ['secFontSz'] ?? rulesFor(n).group ?? `u${n.uid}`;
    (groups.get(g) ?? groups.set(g, []).get(g)!).push(n);
  }
  // layout que depende da fonte (comprimento referido a primFontSz): só cabe refazendo
  const fontDependent = nodes.some((n) => n.constrs.some((c) => LEN.has(c.type) && FONT.has(c.refType)));
  // grupos com regra de fonte de ancestral primeiro (definem a fonte que os outros referem)
  const ordered = [...groups.values()].sort((a, b) => Number(!rulesFor(a[0]!).group) - Number(!rulesFor(b[0]!).group));
  // duas passadas: a segunda vê o crescimento decidido para os outros grupos
  // (o texto do filho que cresce no list1 obriga a fonte do pai a descer mais)
  const passes = fontDependent && ordered.length > 1 ? [...ordered, ...ordered] : ordered;
  for (const G of passes) {
    const n0 = G[0]!;
    const rules = rulesFor(n0).rules;
    const growth = rules.some((r) => r.type === 'h' || r.type === 'w');
    if (!growth && !fontDependent) continue; // só fonte: o ajuste final resolve
    const hasPrim = nodeParas(n0).some((p) => p.level === 0);
    const key = hasPrim ? 'primFontSz' : 'secFontSz';
    // fonte da restrição (antes de qualquer regra) e a atual (2ª passada parte dela)
    const fNow = Math.round(hasPrim ? n0.v['primFontSz'] ?? 65 : n0.v['secFontSz'] ?? n0.v['primFontSz'] ?? 65);
    n0.fmax0 ??= fNow;
    // sem regra de fonte própria a fonte vem de outro nó (já decidida): vale a atual
    const ownFont = hasFontRule(rules);
    const fmax = ownFont ? n0.fmax0 : fNow;
    const fcur = ownFont ? Math.round(n0.ov[key] ?? fmax) : fmax;
    const secOf = (f: number) => (hasPrim ? (n0.v['secFontSz'] !== undefined ? Math.min(f, Math.round(n0.v['secFontSz'])) : Math.round(f * 0.78)) : f);
    interface State { F: number; gH?: Rule; gW?: Rule }
    const need = (m: PNode, s: State) => needBox(m, s.F, secOf(s.F), s.gH, s.gW);
    let useFrame = fontDependent;
    const custom = G.every((m) => allCustom(nodeParas(m)));
    let textOk = false, frameOk = false;
    // grupos que só CRESCEM (sem regra de fonte própria: o childText do list1 com
    // h INF): na checagem da moldura crescem junto — a fonte do grupo que manda
    // desce até o filho crescido caber (medido: list1 custT → primFontSz 14)
    const followers = fontDependent && hasFontRule(rules)
      ? ordered.filter((H) => H !== G && !hasFontRule(rulesFor(H[0]!).rules) && rulesFor(H[0]!).rules.some((r) => r.type === 'h' || r.type === 'w')) : [];
    // devolve false se o texto de algum seguidor não cabe nem crescendo (palavra
    // mais larga que a caixa no hList1: a fonte do parTx tem de descer)
    const growFollowers = (): boolean => {
      let grew = false, ok = true;
      for (const H of followers) {
        const fr = rulesFor(H[0]!).rules;
        const gH = [...fr].reverse().find((r) => r.type === 'h'), gW = [...fr].reverse().find((r) => r.type === 'w');
        for (const m of H) {
          if (!nodeParas(m).length || !(m.w > 0) || !(m.h > 0)) continue;
          const prim = Math.round(m.v['primFontSz'] ?? 65), sec = Math.round(m.v['secFontSz'] ?? prim * 0.78);
          const z = needBox(m, prim, sec, gH, gW);
          if (!z) { ok = false; continue; }
          if (z.h > m.h + 1) { m.ov['h'] = z.h; grew = true; }
          if (z.w > m.w + 1) { m.ov['w'] = z.w; grew = true; }
        }
      }
      if (grew) run();
      return ok;
    };
    // aplica o estado (fonte + crescimento), refaz o layout e diz se tudo cabe
    const apply = (s: State): boolean => {
      for (const m of G) {
        delete m.ov['h']; delete m.ov['w'];
        if (s.F < fmax) { m.ov[key] = s.F; if (!hasPrim) m.ov['primFontSz'] = s.F; }
        else { delete m.ov[key]; if (!hasPrim) delete m.ov['primFontSz']; }
      }
      for (const H of followers) for (const m of H) { delete m.ov['h']; delete m.ov['w']; }
      run();
      const sizes = G.map((m) => need(m, s));
      textOk = !sizes.some((z) => !z);
      if (textOk) {
        const eqH = n0.equ['h'] ? Math.max(...sizes.map((z) => z!.h)) : undefined;
        let grew = false;
        G.forEach((m, i) => {
          const z = sizes[i]!;
          const h = eqH ?? z.h;
          if (h > m.h + 1) { m.ov['h'] = h; grew = true; }
          if (z.w > m.w + 1) { m.ov['w'] = z.w; grew = true; }
        });
        if (grew) run();
      }
      const followOk = useFrame && followers.length ? growFollowers() : true;
      frameOk = followOk && (!useFrame || withinFrame(nodes, frameW, frameH));
      if ((globalThis as { __dgmDebug?: boolean }).__dgmDebug) console.log('rules', n0.name, 'F', s.F, s.gH ? 'gH' : '', s.gW ? 'gW' : '', 'text', textOk, 'frame', frameOk);
      // texto personalizado não depende da fonte do layout: só a moldura decide —
      // mas as regras de crescer valem (o childText custT do list1 cresce até caber)
      return (textOk || (custom && !growth)) && frameOk;
    };
    let st: State = { F: fcur };
    if (apply(st)) continue;
    // só a moldura estoura mesmo na menor fonte das regras: não é caso de fonte
    if (useFrame) {
      const minF = Math.min(...rules.filter((r) => FONT.has(r.type) && Number.isFinite(r.val)).map((r) => r.val), fmax);
      const last: State = { F: Math.max(1, Math.round(minF)), ...(rules.find((r) => r.type === 'h') ? { gH: [...rules].reverse().find((r) => r.type === 'h') } : {}) };
      apply(last);
      if (!frameOk) { useFrame = false; if (apply(st)) continue; }
    }
    let ok = false;
    for (const r of rules) {
      if (FONT.has(r.type)) {
        // texto personalizado não encolhe: a regra de fonte só ajuda se o layout
        // depende da fonte (alturas do list1 cabendo no quadro)
        if (!useFrame && custom) continue;
        const lo = Math.max(1, Math.round(Number.isFinite(r.val) ? r.val : 1));
        if (lo >= st.F) continue;
        if (!apply({ ...st, F: lo })) { st = { ...st, F: lo }; continue; }
        // maior fonte que cabe (busca binária)
        let a = lo + 1, b = st.F - 1, best = lo;
        while (a <= b) { const mid = (a + b) >> 1; if (apply({ ...st, F: mid })) { best = mid; a = mid + 1; } else b = mid - 1; }
        st = { ...st, F: best };
        ok = true;
        break;
      } else if (r.type === 'h' || r.type === 'w') {
        st = r.type === 'h' ? { ...st, gH: r } : { ...st, gW: r };
        if (apply(st)) { ok = true; break; }
      }
    }
    apply(st);
    void ok;
  }
}

/** As formas visíveis cabem no quadro (folga de arredondamento)? */
function withinFrame(nodes: PNode[], W: number, H: number): boolean {
  const tw = W * 0.0001 + 1, th = H * 0.0001 + 1;
  for (const n of nodes) {
    const ty = n.shape?.attrs['type'];
    if (!ty || ty === 'none' || ty === 'conn' || n.shape!.attrs['hideGeom'] === '1') continue;
    if (!(n.w > 0) || !(n.h > 0)) continue;
    if (n.x < -tw || n.y < -th || n.x + n.w > W + tw || n.y + n.h > H + th) return false;
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
  const family = inp.minorFont;
  FIT = { measure: inp.measure ?? measureApprox, family, lineK: lineFactor(family), root: model.root };
  SCALE_BUDGET = 20000;
  try {
    const run = () => {
      for (const n of b.nodes) { n.v = { ...n.ov }; n.desV = {}; n.desC = undefined; n.desO = undefined; n.desR = undefined; n.ls = undefined; n.shr = undefined; n.desLte = undefined; n.margF = {}; n.equ = {}; n.lte = {}; n.fromParent = undefined; n.conn = undefined; n.cyc = undefined; n.preplaced = undefined; n.adjOv = undefined; n.rot = 0; n.rx = n.ry = n.rw = n.rh = undefined; }
      root.x = 0; root.y = 0; root.w = inp.cx; root.h = inp.cy;
      STATS.full++;
      FRAME = { w: inp.cx, h: inp.cy };
      // orçamento de buscas de escala POR refazimento (as regras refazem o layout
      // várias vezes; lin aninhado em 4 níveis gasta milhares por vez)
      SCALE_BUDGET = 20000;
      layoutNode(root, 0);
    };
    run();
    // regras: reduz fonte / cresce formas até o texto caber, e refaz o layout (até 3 passadas)
    runTextRules(b.nodes, run, inp.cx, inp.cy);
    if ((globalThis as { __dgmTree?: boolean }).__dgmTree) {
      const pr = (n: PNode, d: number): void => { console.log(`${'  '.repeat(d)}${n.name} [${algType(n)}] ${Math.round(n.x)},${Math.round(n.y)} ${Math.round(n.w)}x${Math.round(n.h)}`); if (d < 8) for (const k of n.kids) pr(k, d + 1); };
      pr(root, 0);
    }
    const style = inp.style ? normNs(inp.style) : undefined, colors = inp.colors ? normNs(inp.colors) : undefined;
    return emit(b.nodes, root, model, style, colors, inp);
  } finally {
    FIT = undefined;
    FRAME = undefined;
  }
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
interface TextPara { p: XmlElement; level: number; /** tamanho personalizado (custT), pt */ csz?: number }

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
    const sz = tp.csz ?? (tp.level === 0 ? prim : sec);
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
    // espaçamentos do usuário (pPr dos dados) valem como no desenho gravado
    const ln = userSpacing(tp.p, 'a:lnSpc');
    hgt += lines * (ln?.pts !== undefined ? ln.pts * EMU_PT : sz * EMU_PT * lineK * (ln?.pct ?? 0.9));
    if (pi < paras.length - 1) {
      const aft = userSpacing(tp.p, 'a:spcAft'), bef = userSpacing(paras[pi + 1]!.p, 'a:spcBef');
      const nsz = paras[pi + 1]!.csz ?? (paras[pi + 1]!.level === 0 ? prim : sec);
      hgt += aft ? (aft.pts !== undefined ? aft.pts * EMU_PT : sz * EMU_PT * 1.2 * (aft.pct ?? 0)) : sz * EMU_PT * 1.2 * (tp.level === 0 ? 0.35 : 0.15);
      if (bef) hgt += bef.pts !== undefined ? bef.pts * EMU_PT : nsz * EMU_PT * 1.2 * (bef.pct ?? 0);
    }
  }
  return hgt;
}
/** Espaçamento gravado no pPr do parágrafo dos dados: fração (spcPct) ou pontos (spcPts). */
function userSpacing(p: XmlElement, name: string): { pct?: number; pts?: number } | undefined {
  const ppr = firstChild(p, 'a:pPr');
  const e = ppr ? firstChild(ppr, name) : undefined;
  if (!e) return undefined;
  const pc = firstChild(e, 'a:spcPct'), pt = firstChild(e, 'a:spcPts');
  const v = parseInt((pc ?? pt)?.attrs['val'] ?? '', 10);
  if (!Number.isFinite(v) || v < 0 || v > 1e7) return undefined;
  return pc ? { pct: v / 100000 } : pt ? { pts: v / 100 } : undefined;
}
const bulletIndent = (szPt: number): number => szPt * EMU_PT * 0.5;

// --- geometria de texto dos presets (retângulo de texto da forma) -----------
/**
 * Retângulo de texto dos presets (ECMA-376, presetShapeDefinitions `<a:rect>`):
 * nomes das guias l/t/r/b, avaliadas pelo motor de presets.
 */
const TEXT_RECT: Record<string, [string, string, string, string]> = {
  roundRect: ['il', 'il', 'ir', 'ib'], round1Rect: ['l', 't', 'ir', 'b'], round2SameRect: ['il', 'tdx', 'ir', 'ib'],
  snip1Rect: ['l', 'it', 'ir', 'b'], snip2SameRect: ['il', 'it', 'ir', 'ib'], plaque: ['il', 'il', 'ir', 'ib'],
  ellipse: ['il', 'it', 'ir', 'ib'], flowChartConnector: ['il', 'it', 'ir', 'ib'], pie: ['il', 'it', 'ir', 'ib'], donut: ['il', 'it', 'ir', 'ib'],
  blockArc: ['il', 'it', 'ir', 'ib'], circularArrow: ['il', 'it', 'ir', 'ib'], leftCircularArrow: ['il', 'it', 'ir', 'ib'], teardrop: ['il', 'it', 'ir', 'ib'],
  chevron: ['il', 't', 'ir', 'b'], homePlate: ['l', 't', 'ir', 'b'], pentagon: ['x2', 'it', 'x3', 'y2'],
  hexagon: ['il', 'it', 'ir', 'ib'], octagon: ['il', 'il', 'ir', 'ib'], triangle: ['x1', 'vc', 'x3', 'b'],
  trapezoid: ['il', 'it', 'ir', 'b'], nonIsoscelesTrapezoid: ['il', 'it', 'ir', 'b'], parallelogram: ['il', 'it', 'ir', 'ib'], diamond: ['wd4', 'hd4', 'ir', 'ib'],
  rightArrow: ['l', 'y1', 'x2', 'y2'], leftArrow: ['x1', 'y1', 'r', 'y2'], upArrow: ['x1', 'y1', 'x2', 'b'], downArrow: ['x1', 't', 'x2', 'y2'],
  leftRightArrow: ['x1', 'y1', 'x4', 'y2'], flowChartManualOperation: ['x3', 't', 'x4', 'b'], flowChartExtract: ['wd4', 'vc', 'x2', 'b'],
  can: ['l', 'y2', 'r', 'y3'], cube: ['l', 'y1', 'x4', 'b'], upArrowCallout: ['l', 'y2', 'r', 'b'], downArrowCallout: ['l', 't', 'r', 'y2'],
  rightArrowCallout: ['l', 't', 'x2', 'b'], leftArrowCallout: ['x2', 't', 'r', 'b'], mathPlus: ['x1', 'y2', 'x4', 'y3'], mathMinus: ['x1', 'y1', 'x2', 'y2'],
  mathEqual: ['x1', 'y1', 'x2', 'y4'], leftBrace: ['il', 'it', 'r', 'ib'], rightBrace: ['l', 'it', 'ir', 'ib'],
};
function textRect(prst: string, w: number, h: number, adj: [string, number][]): [number, number, number, number] {
  const names = TEXT_RECT[prst];
  if (!names) return [0, 0, w, h];
  const g = presetGuides(prst, w, h, adj.map((a) => a[1]), adj.map((a) => a[0]));
  if (!g) return [0, 0, w, h];
  const v = (k: string, d: number) => { const x = g.get(k); return x !== undefined && Number.isFinite(x) ? x : d; };
  return [v(names[0], 0), v(names[1], 0), v(names[2], w), v(names[3], h)];
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

/** Nome do ponto de conexão escolhido numa lista (o mais próximo do outro lado). */
function pickedName(k: PNode, spec: string, other: P2): string {
  const opts = spec.split(/\s+/).filter(Boolean);
  if (opts.length <= 1) return opts[0] ?? 'auto';
  let best = opts[0]!, bd = Infinity;
  for (const o of opts) { const q = boxPt(k, o); const d = Math.hypot(q[0] - other[0], q[1] - other[1]); if (d < bd) { bd = d; best = o; } }
  return best;
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
  if (p['connRout'] === 'curve' && (p['dim'] ?? '2D') === '1D' && n.parent?.cyc && arcConn(n, src, dst, n.parent.cyc)) return;
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
  // seta 2D sem begPad/endPad: recuos de 22% e 25% da distância (medido no cycle2)
  const twoD = (p['dim'] ?? '2D') !== '1D';
  const beg = n.v['begPad'] ?? (twoD ? 0.22 * dist : 0), end = n.v['endPad'] ?? (twoD ? 0.25 * dist : 0);
  const len = Math.max(0, dist - beg - end);
  const ux = dist ? (b[0] - a[0]) / dist : 1, uy = dist ? (b[1] - a[1]) / dist : 0;
  const ang = Math.atan2(uy, ux) * 180 / Math.PI;
  const dim = p['dim'] ?? '2D';
  if (dim === '1D') {
    // linha (reta ou em cotovelo) como caminho livre na caixa envolvente
    const s: P2 = [a[0] + ux * beg, a[1] + uy * beg], e: P2 = [b[0] - ux * end, b[1] - uy * end];
    const pts: P2[] = [s];
    if (p['connRout'] === 'bend' && Math.abs(s[0] - e[0]) > 1 && Math.abs(s[1] - e[1]) > 1) {
      // direção de saída/chegada pelos pontos de conexão (meio do lado: perpendicular a ele)
      const vOut = /^[tb]Ctr$/.test(pickedName(src, bp, dc)) || (!/^mid[LR]$/.test(pickedName(src, bp, dc)) && Math.abs(e[1] - s[1]) >= Math.abs(e[0] - s[0]));
      const vIn = /^[tb]Ctr$/.test(pickedName(dst, ep, sc)) || (!/^mid[LR]$/.test(pickedName(dst, ep, sc)) && Math.abs(e[1] - s[1]) >= Math.abs(e[0] - s[0]));
      const bd = n.v['bendDist'];
      if (vOut && vIn) { const my = s[1] + (bd !== undefined ? Math.sign(e[1] - s[1]) * bd : (e[1] - s[1]) / 2); pts.push([s[0], my], [e[0], my]); }
      else if (!vOut && !vIn) { const mx = s[0] + (bd !== undefined ? Math.sign(e[0] - s[0]) * bd : (e[0] - s[0]) / 2); pts.push([mx, s[1]], [mx, e[1]]); }
      else pts.push(vOut ? [s[0], e[1]] : [e[0], s[1]]);
    }
    pts.push(e);
    let x0 = Math.min(...pts.map((q) => q[0])), y0 = Math.min(...pts.map((q) => q[1]));
    const x1 = Math.max(...pts.map((q) => q[0])), y1 = Math.max(...pts.map((q) => q[1]));
    let W = x1 - x0, H = y1 - y0;
    // linha reta vertical/horizontal: o app grava caixa de 0,1" centrada na linha
    if (W < 1) { W = 91440; x0 -= 45720; }
    if (H < 1) { H = 91440; y0 -= 45720; }
    const path = mk('a:path', { w: String(Math.max(1, Math.round(W))), h: String(Math.max(1, Math.round(H))) }, pts.map((q, i) => mk(i ? 'a:lnTo' : 'a:moveTo', {}, [mk('a:pt', { x: String(Math.round(q[0] - x0)), y: String(Math.round(q[1] - y0)) })])));
    n.conn = { prst: 'cust', x: x0, y: y0, w: W, h: H, rot: 0, path, line: true };
    return;
  }
  // seta 2D: comprimento = distância menos os recuos; altura = a do nó
  const hh = n.h;
  const cx = a[0] + ux * (beg + len / 2), cy = a[1] + uy * (beg + len / 2);
  const rot = ((Math.round(ang * 1e4) / 1e4) % 360 + 360) % 360;
  const begArr = p['begSty'] === 'arr', endArr = (p['endSty'] ?? 'arr') === 'arr';
  const prst = begArr && endArr ? 'leftRightArrow' : begArr ? 'leftArrow' : endArr ? 'rightArrow' : 'rect';
  n.conn = { prst, x: cx - len / 2, y: cy - hh / 2, w: len, h: hh, rot, ...(prst === 'rightArrow' ? { adj: [['adj1', 60000], ['adj2', 50000]] as [string, number][] } : {}) };
}

/** Pontas de seta da linha 1D (endSty padrão = seta; begSty padrão = nenhuma). */
function lineEnds(p: Attrs): XmlElement[] {
  const o: XmlElement[] = [];
  if (p['begSty'] === 'arr') o.push(mk('a:headEnd', { type: 'arrow' }));
  if ((p['endSty'] ?? 'arr') === 'arr') o.push(mk('a:tailEnd', { type: 'arrow' }));
  return o;
}

/**
 * Conector curvo (connRout="curve") num ciclo: arco do próprio círculo, da saída
 * da caixa do nó de origem à entrada da do destino, menos begPad/endPad
 * (frações do comprimento do arco) — o app grava o arco numa caixa do tamanho do
 * círculo. Aqui o arco vira Béziers cúbicas.
 */
function arcConn(n: PNode, src: PNode, dst: PNode, cyc: { cx: number; cy: number; r: number; cw: boolean }): boolean {
  const { cx, cy, r } = cyc;
  if (!(r > 0)) return false;
  const at = (k: PNode) => Math.atan2(k.x + k.w / 2 - cx, -(k.y + k.h / 2 - cy)); // 0 = 12 h, horário
  const pt = (phi: number): P2 => [cx + r * Math.sin(phi), cy - r * Math.cos(phi)];
  const inside = (k: PNode, q: P2) => q[0] > k.x && q[0] < k.x + k.w && q[1] > k.y && q[1] < k.y + k.h;
  const dir = cyc.cw ? 1 : -1;
  const a0 = at(src);
  let a1 = at(dst);
  while (dir * (a1 - a0) <= 0) a1 += dir * 2 * Math.PI;
  const span = Math.abs(a1 - a0);
  // saída da origem / entrada no destino ao longo do círculo (passo fino + bissecção)
  const edge = (k: PNode, from: number, sgn: number): number => {
    let lo = 0, hi = 0;
    for (let d = 0; d <= span; d += span / 200) { if (!inside(k, pt(from + sgn * d))) { hi = d; break; } lo = d; hi = d; }
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (inside(k, pt(from + sgn * m))) lo = m; else hi = m; }
    return hi;
  };
  const e0 = a0 + dir * edge(src, a0, dir), e1 = a1 - dir * edge(dst, a1, -dir);
  const arc = Math.abs(e1 - e0);
  n.v['connDist'] = arc * r;
  const keep = n.constrs;
  n.constrs = keep.filter((c) => !(c.type === 'connDist' && c.refType === 'none' && !c.hasVal));
  applyConstrs(n, undefined, true);
  n.constrs = keep;
  const bp = (n.v['begPad'] ?? 0) / r, ep = (n.v['endPad'] ?? 0) / r;
  const s0 = e0 + dir * bp, s1 = e1 - dir * ep;
  if (dir * (s1 - s0) <= 0) return false;
  // Béziers cúbicas por trechos de até 45°
  const x0 = cx - r, y0 = cy - r;
  const segs: XmlElement[] = [];
  const P = (q: P2) => mk('a:pt', { x: String(Math.round(q[0] - x0)), y: String(Math.round(q[1] - y0)) });
  segs.push(mk('a:moveTo', {}, [P(pt(s0))]));
  const parts = Math.max(1, Math.ceil(Math.abs(s1 - s0) / (Math.PI / 4)));
  for (let i = 0; i < parts; i++) {
    const t0 = s0 + ((s1 - s0) * i) / parts, t1 = s0 + ((s1 - s0) * (i + 1)) / parts;
    const k = (4 / 3) * Math.tan((t1 - t0) / 4) * r;
    const p0 = pt(t0), p3 = pt(t1);
    const d0: P2 = [Math.cos(t0), Math.sin(t0)], d1: P2 = [Math.cos(t1), Math.sin(t1)];
    segs.push(mk('a:cubicBezTo', {}, [P([p0[0] + k * d0[0], p0[1] + k * d0[1]]), P([p3[0] - k * d1[0], p3[1] - k * d1[1]]), P(p3)]));
  }
  const path = mk('a:path', { w: String(Math.round(2 * r)), h: String(Math.round(2 * r)), fill: 'none' }, segs);
  n.conn = { prst: 'cust', x: x0, y: y0, w: 2 * r, h: 2 * r, rot: 0, path, line: true };
  return true;
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
  return { x: n.x, y: n.y, w: n.w, h: n.h, prst: ty === 'conn' ? 'rightArrow' : ty, adj: n.adjOv ?? adjOf(n), rot };
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
    texts.set(n, { pts: pts.map((x) => x.pt), paras: nodeParas(n) });
  }
  // nó de texto sem geometria (hideGeom) que apresenta o mesmo ponto de uma forma:
  // o texto vai na forma (txXfrm = caixa do nó de texto) — o app grava uma forma só
  const jobs = new Map<PNode, TextJob>();
  const merged = new Set<PNode>();
  // nó oculto SEM algoritmo de texto (rootConnector…) não carrega texto nenhum
  for (const n of order) if (hidden(n) && algType(n) !== 'tx' && texts.has(n)) { texts.delete(n); }
  for (const n of order) {
    const t = texts.get(n);
    if (!t || !hidden(n)) continue;
    // a forma parceira não pode ser outro nó de texto (tx) com o seu próprio texto
    const same = (k: PNode) => k !== n && !hidden(k) && ((texts.get(k)?.pts[0] === t.pts[0] && algType(k) !== 'tx') || (!texts.has(k) && k.pt === t.pts[0] && algType(k) === 'conn'));
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
    for (const job of jobs.values()) {
      // igualdade explícita (op="equ") ou regra de fonte de um ancestral que vale para todos os alvos
      // (o secundário segue a igualdade do primário: caixas só com texto de nível 1 do
      // cycle4 com primFontSz equ ficam todas no menor tamanho)
      const g = job.tn.equ[key] ?? (key === 'primFontSz' ? rulesFor(job.tn).group : job.tn.equ['primFontSz']);
      if (g && get(job.tn) !== undefined) (groups.get(g) ?? groups.set(g, []).get(g)!).push(job.tn);
    }
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
  if (f) {
    const rv = f[2] ? f[2].v[f[1]] ?? f[2].v['primFontSz'] : undefined;
    if (rv !== undefined && Number.isFinite(rv)) return f[0] * rv * EMU_PT;
    return f[0] * (f[1] === 'secFontSz' ? sec : prim) * EMU_PT;
  }
  // sem restrição: 0,56 × fonte (medido em pList2/hList1)
  return n.v[k] ?? 0.56 * prim * EMU_PT;
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
    const [mp, ms] = margFonts(job.paras, prim, sec);
    const wA = textW - margin(n, 'lMarg', mp, ms) - margin(n, 'rMarg', mp, ms);
    const hA = textH - margin(n, 'tMarg', mp, ms) - margin(n, 'bMarg', mp, ms);
    return textHeight(job.paras, prim, sec, wA, measure, family, lineK) <= hA + 1;
  };
  // texto todo personalizado: nada encolhe (a variável de fonte do layout fica no máximo)
  if (allCustom(job.paras)) {
    n.fontPt = Math.round(primMax);
    n.secPt = Math.round(secFixed ?? (hasPrim ? primMax * 0.78 : primMax));
    return;
  }
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
  if ((globalThis as { __dgmDebug?: boolean }).__dgmDebug) console.log('fit', n.name, family, `max=${max} min=${min} -> ${p}/${n.secPt}`, job.box.map(Math.round).join(','), JSON.stringify(Object.fromEntries(Object.entries(n.margF).map(([k, f]) => [k, [f[0], f[1], f[2]?.name]]))), n.equ['primFontSz'] ?? '', job.paras.map((q) => paraText(q.p).runs.map((r) => r.text).join('')).join('|'));
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
    if (n.conn?.line) {
      spPrKids.push(mk('a:noFill'));
      const ends = lineEnds(params(n.alg));
      if (ends.length) spPrKids.push(mk('a:ln', {}, ends));
    } else if (fillC && kids(fillC).some((m) => m.name === 'a:alpha' || m.name === 'a:alphaMod' || (m.name === 'a:alphaOff' && m.attrs['val'] !== '0'))) {
      // cor com transparência (vennNode1 do radial3/venn: alpha 50%): o PowerPoint grava
      // o preenchimento explícito no spPr — pelo fillRef o leitor perderia o alpha
      const fr = st ? firstChild(st, 'a:fillRef') : undefined;
      if ((fr?.attrs['idx'] ?? '1') === '1') spPrKids.push(mk('a:solidFill', {}, [clone(fillC)]));
    }
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
  const [mp, ms] = margFonts(paras, sz, sec);
  const m = (k: string) => String(Math.round(margin(n, k, mp, ms)));
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
  const ps = paras.map(({ p: src, level, csz }) => {
    const size = csz ?? (level === 0 ? sz : sec);
    const lvl = Math.min(8, level);
    const bu = bullets && level >= stBullet;
    const ind = bu ? bulletMarL(size) : 0;
    // propriedades do parágrafo gravadas nos dados (o usuário centralizou, tirou o
    // espaçamento…) vencem as do layout — gdx-265011: algn="ctr" no parentText do list1
    const user = firstChild(src, 'a:pPr');
    const uk = (names: string[]) => user ? kids(user).filter((c) => names.includes(c.name)).map(clone) : [];
    const one = (name: string, dflt: XmlElement): XmlElement => { const u = user ? firstChild(user, name) : undefined; return u ? clone(u) : dflt; };
    const ubu = uk(['a:buNone', 'a:buAutoNum', 'a:buChar', 'a:buBlip']);
    const { lvl: _ul, ...uattrs } = user?.attrs ?? {};
    void _ul;
    const pPr = mk('a:pPr', {
      marL: String(ind * Math.max(1, level - stBullet + 1) * (bu ? 1 : 0)), lvl: String(lvl), indent: String(-ind),
      algn: level ? (chAlgn === 'r' ? 'r' : chAlgn === 'ctr' ? 'ctr' : 'l') : (parAlgn === 'l' ? 'l' : parAlgn === 'r' ? 'r' : 'ctr'),
      defTabSz: String(Math.round(size * 3.5 * EMU_PT)),
      ...uattrs,
    }, [
      one('a:lnSpc', mk('a:lnSpc', {}, [mk('a:spcPct', { val: '90000' })])),
      one('a:spcBef', mk('a:spcBef', {}, [mk('a:spcPct', { val: '0' })])),
      one('a:spcAft', mk('a:spcAft', {}, [mk('a:spcPct', { val: level ? '15000' : '35000' })])),
      ...uk(['a:buClrTx', 'a:buClr', 'a:buSzTx', 'a:buSzPct', 'a:buSzPts', 'a:buFontTx', 'a:buFont']),
      ...(ubu.length ? ubu.slice(0, 1) : [bu ? mk('a:buChar', { char: '•' }) : mk('a:buNone')]),
      ...uk(['a:tabLst', 'a:defRPr']),
    ]);
    const runs: XmlElement[] = [];
    let endRPr: XmlElement | undefined;
    for (const r of kids(src)) {
      if (r.name === 'a:r' || r.name === 'a:fld') {
        const rr = clone(r);
        const rPr = firstChild(rr, 'a:rPr');
        // custT: cada trecho fica com o tamanho gravado
        const own = csz !== undefined ? rPr?.attrs['sz'] : undefined;
        const attrs: Attrs = { lang: 'en-US', ...(rPr?.attrs ?? {}), sz: own ?? String(Math.round(size * 100)), kern: rPr?.attrs['kern'] ?? '1200' };
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

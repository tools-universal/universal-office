/**
 * Animações do PowerPoint 2002+ gravadas no .ppt → `<p:timing>`.
 *
 * Onde vivem: SlideContainer → ProgTags → ProgBinaryTag "___PPT10" →
 * BinaryTagDataBlob (PP10SlideBinaryTagExtension) → ExtTimeNodeContainer
 * (raiz) + BuildListContainer ([MS-PPT] 2.8). A árvore é o mesmo SMIL do
 * PresentationML, nó a nó:
 *
 *   ExtTimeNodeContainer        → <p:par>/<p:seq>/<p:excl> ou comportamento
 *     TimeNodeAtom              → cTn: restart, tipo, fill, dur
 *     TimePropertyList          → presetID/Class/Subtype, nodeType, grpId…
 *     TimeConditionContainer    → stCondLst (inst 1), endCondLst (2),
 *                                 nextCondLst (3), prevCondLst (4), endSync (5)
 *     TimeSequenceDataAtom      → <p:seq concurrent nextAc prevAc>
 *     TimeIterateDataAtom       → <p:iterate>
 *     TimeModifierAtom          → repeatCount/repeatDur/spd/accel/decel/autoRev
 *     Time*BehaviorContainer    → set/anim/animEffect/animMotion/animRot/
 *                                 animScale/animClr/cmd (+ cBhvr: alvo e atributos)
 *     SubEffectContainer        → <p:subTnLst>
 *
 * Alvos de texto vêm como faixa de CARACTERES (VisualShapeAtom) e viram
 * faixa de PARÁGRAFOS (`<p:pRg>`) quando casam com fronteiras de parágrafo.
 * Os ids dos cTn são renumerados em pré-ordem (como o PowerPoint grava).
 */
import type { PptSlide } from './ppt-reader.js';
import { type Rec, children, RT, utf16, recsIn } from './records.js';
import { el, escAttr } from './xmlw.js';
import { zipPartText } from './roundtrip.js';

/** Valor de TimeVariant (bool/int/float/string). */
type Variant = boolean | number | string;

/** Floats lidos (o tipo importa na saída: `<p:fltVal>` mesmo com valor inteiro). */
const FLOATS = new WeakSet<object>();
class FloatVal { constructor(readonly v: number) { FLOATS.add(this); } }

function readVariant(rec: Rec): Variant | undefined {
  const r = rec.r, o = rec.start;
  switch (r.u8(o)) {
    case 0: return r.u8(o + 1) !== 0;
    case 1: return r.i32(o + 1);
    case 2: return r.f32(o + 1);
    case 3: {
      let s = utf16(r, o + 1, rec.end);
      const z = s.indexOf('\0');
      if (z >= 0) s = s.slice(0, z);
      return s;
    }
    default: return undefined;
  }
}

/** Como readVariant, mas preserva "é float" para valores de animação. */
function readTypedVariant(rec: Rec): Variant | FloatVal | undefined {
  return rec.r.u8(rec.start) === 2 ? new FloatVal(rec.r.f32(rec.start + 1)) : readVariant(rec);
}

/** Contexto: texto das formas (faixas de caractere → parágrafos) e esquema de cores. */
export interface AnimCtx {
  /** Texto (com '\r' entre parágrafos) da forma `spid`, se houver. */
  textOf: (spid: number) => string | undefined;
  /** Esquema de cores efetivo do slide (8 cores). */
  scheme: string[];
  /** spids presentes no slide (alvos inexistentes descartam o comportamento). */
  hasShape: (spid: number) => boolean;
  /** Id OOXML original (round-trip) → spid emitido. */
  spidOf?: (ooxmlId: number) => number | undefined;
}

const FILL = ['', 'remove', 'freeze', 'hold', 'transition'];
const RESTART = ['', 'always', 'whenNotActive', 'never'];
const NODE_TYPE = ['', 'clickEffect', 'withEffect', 'afterEffect', 'mainSeq', 'interactiveSeq', 'clickPar', 'withGroup', 'afterGroup', 'tmRoot'];
const PRESET_CLASS = ['', 'entr', 'exit', 'emph', 'path', 'verb', 'mediacall'];
const TRIGGER_EVT = ['', 'onBegin', 'onEnd', 'begin', 'end', 'onClick', 'onDblClick', 'onMouseOver', 'onMouseOut', 'onNext', 'onPrev', 'onStopAudio'];

class Writer {
  private nextId = 1;
  constructor(readonly ctx: AnimCtx) {}
  id(): number { return this.nextId++; }
}

const fmtNum = (v: number): string => (Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000));

/** Alvo (`<p:tgtEl>`) a partir de um TimeClientVisualElementContainer. */
function targetXml(cve: Rec | undefined, w: Writer): string | null {
  if (!cve) return '';
  for (const k of children(cve)) {
    if (k.type === RT_VisualPageAtom) return '<p:tgtEl><p:sldTgt/></p:tgtEl>';
    if (k.type !== RT_VisualShapeAtom) continue;
    const r = k.r, o = k.start;
    const type = r.u32(o), refType = r.u32(o + 4), spid = r.u32(o + 8), d1 = r.i32(o + 12), d2 = r.i32(o + 16);
    if (refType === 2) return ''; // som (sndTgt) — sem mídia equivalente no pacote gerado
    if (!w.ctx.hasShape(spid)) return null;
    let inner = '';
    if (type === 2) inner = textRangeXml(w.ctx.textOf(spid), d1, d2);
    else if (type === 6) inner = '<p:bg/>';
    else if (type === 5) inner = el('p:oleChartEl', { type: ['gridLegend', 'series', 'category', 'ptInSeries', 'ptInCategory'][d1] ?? 'gridLegend', lvl: d2 > 0 ? d2 : undefined });
    return `<p:tgtEl>${el('p:spTgt', { spid }, inner)}</p:tgtEl>`;
  }
  return '';
}

/** Faixa de caracteres [st, end) → `<p:txEl>` com pRg (parágrafos) ou charRg. */
function textRangeXml(text: string | undefined, st: number, end: number): string {
  if (text === undefined) return el('p:txEl', {}, el('p:charRg', { st, end }));
  // início de cada parágrafo (o '\r' pertence ao parágrafo anterior)
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\r') starts.push(i + 1);
  const paraAt = (pos: number): number => {
    let p = 0;
    while (p + 1 < starts.length && starts[p + 1]! <= pos) p++;
    return p;
  };
  const first = paraAt(st);
  const last = paraAt(Math.max(st, end - 1));
  const lastEnd = last + 1 < starts.length ? starts[last + 1]! : text.length + 1;
  if (starts[first] === st && (end >= lastEnd || end === text.length)) {
    return el('p:txEl', {}, el('p:pRg', { st: first, end: last }));
  }
  return el('p:txEl', {}, el('p:charRg', { st, end }));
}

/** Uma condição (TimeConditionContainer → `<p:cond>`). */
function condXml(c: Rec, w: Writer, tag = 'p:cond'): string | null {
  const atom = children(c).find((k) => k.type === RT.TimeCondition);
  if (!atom) return null;
  const r = atom.r, o = atom.start;
  const trigObj = r.u32(o), evt = r.u32(o + 4), id = r.u32(o + 8), delay = r.i32(o + 12);
  let inner = '';
  if (trigObj === 1) {
    const t = targetXml(children(c).find((k) => k.type === RT.TimeClientVisualElement), w);
    if (t === null) return null;
    inner = t;
  } else if (trigObj === 2) inner = el('p:tn', { val: id });
  else if (trigObj === 3) inner = el('p:rtn', { val: ['first', 'last', 'all'][id] ?? 'all' });
  return el(tag, { evt: TRIGGER_EVT[evt] || undefined, delay: delay === -1 ? 'indefinite' : delay }, inner);
}

function condListXml(conds: Rec[], tag: string, w: Writer): string {
  const items = conds.map((c) => condXml(c, w)).filter((x): x is string => !!x);
  return items.length ? el(tag, {}, items.join('')) : '';
}

/** Nó decodificado de um ExtTimeNodeContainer (ou SubEffectContainer). */
interface TNode {
  restart: number; type: number; fill: number; dur: number; flags: number;
  props: Map<number, Variant>;
  behavior?: Rec;
  iterate?: Rec;
  seqData?: Rec;
  conds: Map<number, Rec[]>;
  modifiers: { type: number; value: number }[];
  sub: TNode[];
  kids: TNode[];
  cve?: Rec;
}

/** Aninhamento máximo da árvore de tempo (proteção contra arquivos corrompidos). */
const MAX_NODE_DEPTH = 64;

function readNode(rec: Rec, depth = 0): TNode {
  const n: TNode = { restart: 0, type: 0, fill: 0, dur: 0, flags: 0, props: new Map(), conds: new Map(), modifiers: [], sub: [], kids: [] };
  if (depth > MAX_NODE_DEPTH) return n;
  for (const c of children(rec)) {
    switch (c.type) {
      case RT.TimeNode: {
        const r = c.r, o = c.start;
        n.restart = r.u32(o + 4); n.type = r.u32(o + 8); n.fill = r.u32(o + 12);
        n.dur = r.i32(o + 24); n.flags = r.u32(o + 28);
        break;
      }
      case RT.TimePropertyList:
        for (const v of children(c)) if (v.type === RT.TimeVariant) {
          const val = readVariant(v);
          if (val !== undefined) n.props.set(v.inst, val);
        }
        break;
      case RT.TimeSetBehaviorContainer: case RT.TimeAnimateBehaviorContainer: case RT.TimeEffectBehaviorContainer:
      case RT.TimeMotionBehaviorContainer: case RT.TimeRotationBehaviorContainer: case RT.TimeScaleBehaviorContainer:
      case RT.TimeColorBehaviorContainer: case RT.TimeCommandBehaviorContainer:
        n.behavior = c; break;
      case RT.TimeIterateData: n.iterate = c; break;
      case RT.TimeSequenceData: n.seqData = c; break;
      case RT.TimeConditionContainer: {
        const l = n.conds.get(c.inst) ?? [];
        l.push(c);
        n.conds.set(c.inst, l);
        break;
      }
      case RT.TimeModifier: n.modifiers.push({ type: c.r.u32(c.start), value: c.r.f32(c.start + 4) }); break;
      case RT.SubEffectContainer: n.sub.push(readNode(c, depth + 1)); break;
      case RT.ExtTimeNodeContainer: n.kids.push(readNode(c, depth + 1)); break;
      case RT.TimeClientVisualElement: n.cve = c; break;
    }
  }
  return n;
}

/** Atributos do `<p:cTn>`. */
function cTnAttrs(n: TNode, id: number): Record<string, string | number | undefined> {
  const p = n.props;
  const num = (k: number): number | undefined => typeof p.get(k) === 'number' ? p.get(k) as number : undefined;
  const a: Record<string, string | number | undefined> = { id };
  const pc = num(0x0b), pid = num(0x09), pst = num(0x0a);
  if (pid !== undefined) a['presetID'] = pid;
  if (pc !== undefined) a['presetClass'] = PRESET_CLASS[pc];
  if (pst !== undefined) a['presetSubtype'] = pst;
  if (n.flags & 0x2) a['restart'] = RESTART[n.restart] || undefined;
  if (n.flags & 0x10) a['dur'] = n.dur === -1 ? 'indefinite' : n.dur;
  // TimeModifierAtom: valores-padrão (1 repetição, velocidade 1) não são gravados no XML.
  // "Indefinido" vem como FLT_MAX (3,4e38) no binário — medido: repetir até o
  // fim do slide / próximo clique salvos pelo PowerPoint
  const indefinite = (v: number): boolean => v < 0 || !Number.isFinite(v) || v >= 1e30;
  for (const m of n.modifiers) {
    switch (m.type) {
      case 0: if (m.value !== 1) a['repeatCount'] = indefinite(m.value) ? 'indefinite' : Math.round(m.value * 1000); break;
      case 1: a['repeatDur'] = indefinite(m.value) ? 'indefinite' : Math.round(m.value); break;
      case 2: if (m.value !== 1) a['spd'] = Math.round(m.value * 100000); break;
      case 3: if (m.value) a['accel'] = Math.round(m.value * 100000); break;
      case 4: if (m.value) a['decel'] = Math.round(m.value * 100000); break;
      case 5: if (m.value) a['autoRev'] = 1; break;
    }
  }
  if (n.flags & 0x1) a['fill'] = FILL[n.fill] || undefined;
  const tf = p.get(0x10), ef = p.get(0x11);
  if (typeof tf === 'string') a['tmFilter'] = tf;
  if (typeof ef === 'string') a['evtFilter'] = ef;
  // TL_TPID_Display: 1 (ou false) = não exibir (efeitos "depois da animação")
  const disp = p.get(0x02);
  if (disp === 1 || disp === false) a['display'] = 0;
  const mr = num(0x05);
  if (mr !== undefined) a['masterRel'] = ['sameClick', 'lastClick', 'nextClick'][mr];
  const g = num(0x13);
  if (g !== undefined) a['grpId'] = g;
  if (p.get(0x0d) === true) a['afterEffect'] = 1;
  const nt = num(0x14);
  if (nt !== undefined) a['nodeType'] = NODE_TYPE[nt];
  if (p.get(0x15) === true) a['nodePh'] = 1;
  return a;
}

/**
 * `<p:iterate>`: TimeIterateDataAtom = intervalo (f32: segundos ou %), tipo
 * (0 elemento, 1 palavra, 2 letra), direção (1 = reversa, só com o flag),
 * tipo do intervalo (0 = absoluto, 1 = %), flags de uso.
 */
function iterateXml(rec: Rec | undefined): string {
  if (!rec) return '';
  const r = rec.r, o = rec.start;
  const interval = r.f32(o), type = r.u32(o + 4), dir = r.u32(o + 8), itype = r.u32(o + 12), f = r.u32(o + 16);
  const kid = itype === 1 ? el('p:tmPct', { val: Math.round(interval * 1000) }) : el('p:tmAbs', { val: Math.round(interval * 1000) });
  return el('p:iterate', { type: ['el', 'wd', 'lt'][type] ?? 'el', backwards: f & 1 && dir === 1 ? 1 : undefined }, kid);
}

/** Corpo do `<p:cTn>` (condições, iterate, filhos, subTnLst). */
function cTnXml(n: TNode, w: Writer, extraId?: number): string {
  const id = extraId ?? w.id();
  const attrsCTn = cTnAttrs(n, id);
  let body = condListXml(n.conds.get(1) ?? [], 'p:stCondLst', w);
  body += condListXml(n.conds.get(2) ?? [], 'p:endCondLst', w);
  const es = (n.conds.get(5) ?? [])[0];
  if (es) { const x = condXml(es, w, 'p:endSync'); if (x) body += x; }
  body += iterateXml(n.iterate);
  const kids = n.kids.map((k) => nodeXml(k, w)).filter(Boolean).join('');
  if (kids) body += el('p:childTnLst', {}, kids);
  const sub = n.sub.map((k) => nodeXml(k, w)).filter(Boolean).join('');
  if (sub) body += el('p:subTnLst', {}, sub);
  return el('p:cTn', attrsCTn, body);
}

/** Um nó → XML (contêiner ou comportamento); vazio se o alvo não existe. */
function nodeXml(n: TNode, w: Writer): string {
  switch (n.type) {
    case 0: return el('p:par', {}, cTnXml(n, w));
    case 1: {
      const sd = n.seqData;
      const a: Record<string, string | number | undefined> = {};
      if (sd) {
        const r = sd.r, o = sd.start;
        const conc = r.u32(o), next = r.u32(o + 4), prev = r.u32(o + 8), f = r.u32(o + 16);
        if (f & 1) a['concurrent'] = conc ? 1 : 0;
        if (f & 4) a['prevAc'] = prev === 1 ? 'skipTimed' : 'none';
        if (f & 2) a['nextAc'] = next === 1 ? 'seek' : 'none';
      }
      const inner = cTnXml(n, w) + condListXml(n.conds.get(4) ?? [], 'p:prevCondLst', w) + condListXml(n.conds.get(3) ?? [], 'p:nextCondLst', w);
      return el('p:seq', a, inner);
    }
    case 2: return el('p:excl', {}, cTnXml(n, w));
    case 3: return n.behavior ? behaviorXml(n, n.behavior, w) : '';
    case 4: return mediaXml(n, w);
    default: return '';
  }
}

/**
 * Propriedades do comportamento (TimePropertyList do TimeBehaviorContainer),
 * casadas com o XML do gêmeo: 1 = prLst (animEffect), 2 = contexto de
 * execução (rctx), 3 = trajetória relativa, 4 = espaço de cor (0 rgb, 1 hsl),
 * 5 = sentido da cor (0 cw, 1 ccw), 6 = override (1 = childStyle),
 * 10 = tipos de ponto da trajetória (ptsTypes).
 */
type BhvrProps = Map<number, Variant>;

/** `<p:cBhvr>` (cTn + alvo + atributos) a partir do TimeBehaviorContainer. */
function cBhvrXml(n: TNode, bc: Rec | undefined, w: Writer, props: BhvrProps): string | null {
  const id = w.id();
  let tgt = '';
  let names: string[] = [];
  const a: Record<string, string | undefined> = {};
  if (bc) {
    for (const k of children(bc)) {
      if (k.type === RT.TimeBehavior) {
        const r = k.r, o = k.start;
        const f = r.u32(o), add = r.u32(o + 4), acc = r.u32(o + 8), xf = r.u32(o + 12);
        if (f & 1) a['additive'] = ['base', 'sum', 'repl', 'mult', 'none'][add];
        if (f & 2) a['accumulate'] = acc === 1 ? 'none' : 'always';
        if (f & 8) a['xfrmType'] = xf === 1 ? 'img' : 'pt';
      } else if (k.type === RT.TimeVariantList) {
        names = children(k).filter((v) => v.type === RT.TimeVariant).map((v) => readVariant(v)).filter((v): v is string => typeof v === 'string');
      } else if (k.type === RT.TimeClientVisualElement) {
        const t = targetXml(k, w);
        if (t === null) return null;
        tgt = t;
      }
    }
  }
  const rctx = props.get(2);
  if (typeof rctx === 'string' && rctx) a['rctx'] = rctx;
  if (props.get(6) === 1) a['override'] = 'childStyle';
  const body = el('p:cTn', cTnAttrs(n, id), condListXml(n.conds.get(1) ?? [], 'p:stCondLst', w)
    + condListXml(n.conds.get(2) ?? [], 'p:endCondLst', w)) + tgt
    + (names.length ? el('p:attrNameLst', {}, names.map((s) => `<p:attrName>${escAttr(s)}</p:attrName>`).join('')) : '');
  return el('p:cBhvr', a, body);
}

/** Lê a TimePropertyList do TimeBehaviorContainer. */
function behaviorProps(bc: Rec | undefined): BhvrProps {
  const m: BhvrProps = new Map();
  if (!bc) return m;
  for (const k of children(bc)) {
    if (k.type !== RT.TimePropertyList) continue;
    for (const v of children(k)) {
      const val = v.type === RT.TimeVariant ? readVariant(v) : undefined;
      if (val !== undefined) m.set(v.inst, val);
    }
  }
  return m;
}

/**
 * Valor de animação (`<p:val>`/`<p:to>`) a partir de um TimeVariant. Cores
 * vêm como texto "#rrggbb [i]" (i = índice no esquema) → `<p:clrVal>`.
 */
function variantVal(tag: string, v: Variant | FloatVal | undefined): string {
  if (v === undefined) return '';
  if (v instanceof FloatVal) return el(tag, {}, el('p:fltVal', { val: fmtNum(v.v) }));
  if (typeof v === 'boolean') return el(tag, {}, el('p:boolVal', { val: v ? 1 : 0 }));
  if (typeof v === 'number') return el(tag, {}, Number.isInteger(v) ? el('p:intVal', { val: v }) : el('p:fltVal', { val: fmtNum(v) }));
  const m = /^#([0-9a-fA-F]{6})(?:\s*\[(\d+)\])?$/.exec(v.trim());
  if (m) {
    const idx = m[2] !== undefined ? parseInt(m[2], 10) : undefined;
    const clr = idx !== undefined && SCHEME_NAMES[idx] ? el('a:schemeClr', { val: SCHEME_NAMES[idx] }) : el('a:srgbClr', { val: m[1]!.toUpperCase() });
    return el(tag, {}, el('p:clrVal', {}, clr));
  }
  return el(tag, {}, el('p:strVal', { val: v }));
}

const pct = (v: number): number => Math.round(v * 1000);   // 100% → 100000
const frac = (v: number): number => Math.round(v * 100000); // 0,25 → 25000

/** Índices do esquema de cores do .ppt → nomes de cor do tema gerado. */
const SCHEME_NAMES = ['bg1', 'tx1', 'bg2', 'tx2', 'accent1', 'accent2', 'hlink', 'folHlink'];

/** TimeColorStruct (16 bytes: modelo + 3 componentes) → cor DrawingML. */
function colorStructXml(r: Rec['r'], o: number, forBy: boolean): string {
  const model = r.u32(o), c0 = r.i32(o + 4), c1 = r.i32(o + 8), c2 = r.i32(o + 12);
  if (model === 1 && forBy) {
    // HSL: deslocamentos com componentes 0..255 (matiz 255 = 360°)
    return el('p:hsl', { h: Math.round((c0 * 360 / 255) * 60000), s: Math.round((c1 / 255) * 100000), l: Math.round((c2 / 255) * 100000) });
  }
  if (model === 2) return el('a:schemeClr', { val: SCHEME_NAMES[c0] ?? 'tx1' });
  if (forBy) return el('p:rgb', { r: Math.round((c0 / 255) * 100000), g: Math.round((c1 / 255) * 100000), b: Math.round((c2 / 255) * 100000) });
  const h = (v: number): string => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0').toUpperCase();
  return el('a:srgbClr', { val: h(c0) + h(c1) + h(c2) });
}

/** Comportamento → `<p:set>`/`<p:anim>`/… */
function behaviorXml(n: TNode, rec: Rec, w: Writer): string {
  const kids = children(rec);
  const bc = kids.find((k) => k.type === RT.TimeBehaviorContainer);
  const atom = kids.find((k) => k.type >= RT.TimeBehavior && k.type <= RT.TimeCommandBehavior && k.type !== RT.TimeBehavior);
  const vars = new Map<number, Variant>();
  const typed = new Map<number, Variant | FloatVal>();
  for (const k of kids) {
    if (k.type !== RT.TimeVariant) continue;
    const v = readVariant(k), t = readTypedVariant(k);
    if (v !== undefined) vars.set(k.inst, v);
    if (t !== undefined) typed.set(k.inst, t);
  }
  const props = behaviorProps(bc);
  const r = atom?.r, o = atom?.start ?? 0;
  switch (rec.type) {
    case RT.TimeSetBehaviorContainer: {
      const cb = cBhvrXml(n, bc, w, props);
      return cb === null ? '' : el('p:set', {}, cb + variantVal('p:to', typed.get(1)));
    }
    case RT.TimeEffectBehaviorContainer: {
      const f = r?.u32(o) ?? 0, tr = r?.u32(o + 4) ?? 0;
      // contexto de execução também pode vir no próprio contêiner (var 3)
      const rc = vars.get(3);
      if (typeof rc === 'string' && rc && !props.has(2)) props.set(2, rc);
      const cb = cBhvrXml(n, bc, w, props);
      if (cb === null) return '';
      const filter = vars.get(1), progress = vars.get(2), prLst = props.get(1);
      const a = {
        transition: f & 1 ? ['in', 'out', 'none'][tr] : undefined,
        filter: typeof filter === 'string' ? filter : undefined,
        prLst: typeof prLst === 'string' && prLst ? prLst : undefined,
      };
      return el('p:animEffect', a, cb + (typeof progress === 'number' ? el('p:progress', {}, el('p:fltVal', { val: fmtNum(progress) })) : ''));
    }
    case RT.TimeAnimateBehaviorContainer: {
      const calc = r?.u32(o) ?? 1, f = r?.u32(o + 4) ?? 0, vt = r?.u32(o + 8) ?? 1;
      const a: Record<string, string | undefined> = {
        calcmode: f & 8 ? ['discrete', 'lin', 'fmla'][calc] : undefined,
        valueType: f & 32 ? ['str', 'num', 'clr'][vt] : undefined,
      };
      const by = vars.get(1), from = vars.get(2), to = vars.get(3);
      if (typeof by === 'string') a['by'] = by;
      if (typeof from === 'string') a['from'] = from;
      if (typeof to === 'string') a['to'] = to;
      const cb = cBhvrXml(n, bc, w, props);
      if (cb === null) return '';
      let tav = '';
      const list = kids.find((k) => k.type === RT.TimeAnimationValueList);
      if (list) {
        let cur: { tm: number; val?: Variant | FloatVal; fmla?: string } | undefined;
        const items: { tm: number; val?: Variant | FloatVal; fmla?: string }[] = [];
        for (const k of children(list)) {
          if (k.type === RT.TimeAnimationValue) { cur = { tm: k.r.i32(k.start) }; items.push(cur); }
          else if (k.type === RT.TimeVariant && cur) {
            if (k.inst === 0) cur.val = readTypedVariant(k);
            else if (k.inst === 1) {
              const v = readVariant(k);
              if (typeof v === 'string' && v) cur.fmla = v;
            }
          }
        }
        tav = el('p:tavLst', {}, items.map((it) => el('p:tav', { tm: it.tm * 100, fmla: it.fmla }, variantVal('p:val', it.val))).join(''));
      }
      return el('p:anim', a, cb + tav);
    }
    case RT.TimeScaleBehaviorContainer: {
      const f = r?.u32(o) ?? 0;
      const v = (i: number): number => r?.f32(o + 4 + i * 4) ?? 0;
      const zoom = r?.u8(o + 28) ?? 0;
      const cb = cBhvrXml(n, bc, w, props);
      if (cb === null) return '';
      let inner = cb;
      if (f & 1) inner += el('p:by', { x: pct(v(0)), y: pct(v(1)) });
      if (f & 2) inner += el('p:from', { x: pct(v(2)), y: pct(v(3)) });
      if (f & 4) inner += el('p:to', { x: pct(v(4)), y: pct(v(5)) });
      return el('p:animScale', { zoomContents: f & 8 ? (zoom ? 1 : 0) : undefined }, inner);
    }
    case RT.TimeRotationBehaviorContainer: {
      const f = r?.u32(o) ?? 0;
      const v = (i: number): number => r?.f32(o + 4 + i * 4) ?? 0;
      const cb = cBhvrXml(n, bc, w, props);
      if (cb === null) return '';
      return el('p:animRot', {
        by: f & 1 ? Math.round(v(0) * 60000) : undefined,
        from: f & 2 ? Math.round(v(1) * 60000) : undefined,
        to: f & 4 ? Math.round(v(2) * 60000) : undefined,
      }, cb);
    }
    case RT.TimeMotionBehaviorContainer: {
      const f = r?.u32(o) ?? 0;
      const v = (i: number): number => r?.f32(o + 4 + i * 4) ?? 0;
      const origin = r?.u32(o + 28) ?? 0;
      const path = vars.get(1), pts = props.get(10), rel = props.get(3);
      const cb = cBhvrXml(n, bc, w, props);
      if (cb === null) return '';
      let inner = cb;
      if (f & 1) inner += el('p:by', { x: frac(v(0)), y: frac(v(1)) });
      if (f & 2) inner += el('p:from', { x: frac(v(2)), y: frac(v(3)) });
      if (f & 4) inner += el('p:to', { x: frac(v(4)), y: frac(v(5)) });
      return el('p:animMotion', {
        origin: f & 8 ? (origin === 2 ? 'layout' : 'parent') : undefined,
        path: typeof path === 'string' ? path : undefined,
        pathEditMode: rel === undefined ? undefined : rel ? 'relative' : 'fixed',
        ptsTypes: typeof pts === 'string' ? pts : undefined,
      }, inner);
    }
    case RT.TimeColorBehaviorContainer: {
      const f = r?.u32(o) ?? 0;
      const cb = cBhvrXml(n, bc, w, props);
      if (cb === null || !r) return '';
      let inner = cb;
      if (f & 1) inner += el('p:by', {}, colorStructXml(r, o + 4, true));
      if (f & 2) inner += el('p:from', {}, colorStructXml(r, o + 20, false));
      if (f & 4) inner += el('p:to', {}, colorStructXml(r, o + 36, false));
      const spc = props.get(4), dir = props.get(5);
      return el('p:animClr', {
        clrSpc: spc === undefined ? undefined : spc === 1 ? 'hsl' : 'rgb',
        dir: dir === undefined ? undefined : dir === 1 ? 'ccw' : 'cw',
      }, inner);
    }
    case RT.TimeCommandBehaviorContainer: {
      const f = r?.u32(o) ?? 0, t = r?.u32(o + 4) ?? 0;
      const cmd = vars.get(2) ?? vars.get(1);
      const cb = cBhvrXml(n, bc, w, props);
      if (cb === null) return '';
      return el('p:cmd', { type: f & 1 ? ['evt', 'call', 'verb'][t] : undefined, cmd: typeof cmd === 'string' ? cmd : undefined }, cb);
    }
  }
  return '';
}

/** Nó de mídia (TimeNodeAtom tipo 4) → `<p:video>`/`<p:audio>`. */
function mediaXml(n: TNode, w: Writer): string {
  let kind = 'p:video';
  let tgt = '';
  if (n.cve) {
    for (const k of children(n.cve)) {
      if (k.type === RT_VisualShapeAtom && k.r.u32(k.start) === 3) kind = 'p:audio';
    }
    const t = targetXml(n.cve, w);
    if (t === null) return '';
    tgt = t;
  }
  const vol = n.props.get(0x16), mute = n.props.get(0x17), hide = n.props.get(0x12), sld = n.props.get(0x0f);
  const cm = el('p:cMediaNode', {
    vol: typeof vol === 'number' ? Math.round(vol * 100000) : undefined,
    mute: mute === true ? 1 : undefined,
    numSld: typeof sld === 'number' && sld !== 1 ? sld : undefined,
    showWhenStopped: hide === true ? 0 : undefined,
  }, cTnXml(n, w) + tgt);
  return el(kind, {}, cm);
}

const RT_VisualShapeAtom = 0x2afb;
const RT_VisualPageAtom = 0x2b01;

/** BuildListContainer → `<p:bldLst>`. */
function buildListXml(rec: Rec, ctx: AnimCtx): string {
  const out: string[] = [];
  for (const b of children(rec)) {
    const kids = children(b);
    const ba = kids.find((k) => k.type === RT.BuildAtom);
    if (!ba) continue;
    // BuildAtom: tipo, grpId, spid, fExpanded (byte), fUIExpanded (byte)
    const grpId = ba.r.u32(ba.start + 4), spid = ba.r.u32(ba.start + 8), uiExp = ba.r.u8(ba.start + 13);
    if (!ctx.hasShape(spid)) continue;
    if (b.type === RT.ParaBuild) {
      const pa = kids.find((k) => k.type === RT.ParaBuildAtom);
      const a: Record<string, string | number | undefined> = { spid, grpId };
      if (uiExp) a['uiExpand'] = 1;
      if (pa) {
        // ParaBuildAtom: modo (0 tudo de uma vez, 1 parágrafos, 2 custom, 3 objeto
        // inteiro = padrão), nível, flags em bytes (fundo, reverso, …, automático), atraso
        const r = pa.r, o = pa.start;
        const build = r.u32(o), lvl = r.u32(o + 4), delay = r.u32(o + 12);
        a['build'] = build === 3 ? undefined : ['allAtOnce', 'p', 'cust'][build];
        if (lvl > 1) a['bldLvl'] = lvl;
        if (r.u8(o + 8)) a['animBg'] = 1;
        if (r.u8(o + 9)) a['rev'] = 1;
        if (r.u8(o + 11)) a['advAuto'] = delay;
      }
      out.push(el('p:bldP', a));
    } else if (b.type === RT.ChartBuild) {
      // ChartBuildAtom: modo (0 = objeto inteiro → bldAsOne) + animar fundo (byte)
      const ca = kids.find((k) => k.type === RT.ChartBuildAtom);
      const t = ca ? ca.r.u32(ca.start) : 0;
      const bg = ca ? ca.r.u8(ca.start + 4) : 0;
      const bld = ['', 'series', 'category', 'seriesEl', 'categoryEl'][t];
      out.push(el('p:bldGraphic', { spid, grpId }, bld
        ? el('p:bldSub', {}, el('a:bldChart', { bld, animBg: bg ? undefined : 0 }))
        : '<p:bldAsOne/>'));
    } else if (b.type === RT.DiagramBuild) {
      const da = kids.find((k) => k.type === RT.DiagramBuildAtom);
      const t = da ? da.r.u32(da.start) : 0;
      const bld = ['', 'depthByNode', 'depthByBranch', 'breadthByNode', 'breadthByLvl', 'cw', 'cwIn', 'cwOut', 'ccw', 'ccwIn', 'ccwOut', 'inByRing', 'outByRing', 'up', 'down', 'allAtOnce', 'cust'][t];
      out.push(el('p:bldGraphic', { spid, grpId }, bld ? el('p:bldSub', {}, el('a:bldDgm', { bld })) : '<p:bldAsOne/>'));
    } else {
      out.push(el('p:bldOleChart', { spid, grpId }));
    }
  }
  return out.length ? el('p:bldLst', {}, out.join('')) : '';
}

/** Registros dentro do blob "___PPT10" do slide. */
function pp10Records(slide: PptSlide): Rec[] {
  const blob = slide.binaryTags.get('___PPT10');
  return blob ? recsIn(blob.r, blob.start, blob.end) : [];
}

/** Nº de efeitos (cTn com presetClass) num XML de timing. */
const effectCount = (xml: string): number => (xml.match(/presetClass="/g) ?? []).length;

/**
 * `<p:timing>` ORIGINAL do round-trip (RoundTripAnimationAtom12 →
 * `drs/timingInfo.xml`), com os spids OOXML trocados pelos emitidos.
 * undefined sem round-trip ou se algum alvo não existe mais no slide.
 */
function roundTripTimingXml(slide: PptSlide, ctx: AnimCtx): string | undefined {
  const xml = zipPartText(slide.roundTripTiming, 'timingInfo.xml');
  const i = xml?.indexOf('<p:timing') ?? -1;
  if (!xml || i < 0) return undefined;
  let ok = true;
  const body = xml.slice(i).replace(/\bspid="(\d+)"/g, (_m, v: string) => {
    const id = parseInt(v, 10);
    const mapped = ctx.spidOf?.(id) ?? (ctx.hasShape(id) ? id : undefined);
    if (mapped === undefined) { ok = false; return `spid="${v}"`; }
    return `spid="${mapped}"`;
  });
  return ok ? body : undefined;
}

/** `<p:timing>` do slide (string vazia quando não há animações). */
export function buildTimingXml(slide: PptSlide, ctx?: AnimCtx): string {
  if (!ctx) return '';
  const recs = pp10Records(slide);
  const root = recs.find((r) => r.type === RT.ExtTimeNodeContainer);
  let out = '';
  if (root) {
    const w = new Writer(ctx);
    const tree = nodeXml(readNode(root), w);
    if (tree && /<p:(set|anim|animEffect|animMotion|animRot|animScale|animClr|cmd|video|audio)\b/.test(tree)) {
      const bl = recs.find((r) => r.type === RT.BuildList);
      out = el('p:timing', {}, el('p:tnLst', {}, tree) + (bl ? buildListXml(bl, ctx) : ''));
    }
  }
  // round-trip: o app guarda o XML original quando o binário não representa a
  // animação (gráfico/SmartArt por partes, texto em colunas…) — vale quando
  // traz MAIS efeitos que a conversão do PPT10
  const rt = roundTripTimingXml(slide, ctx);
  if (rt && effectCount(rt) > effectCount(out)) return rt;
  return out;
}
